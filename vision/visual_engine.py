"""Visual feedback engine for environmental distraction detection.

Uses bright spot detection to identify visual distractions that may impact
user focus during AI tool usage. Runs in a separate daemon thread to prevent
blocking the main application.
"""

from __future__ import annotations

import json
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from queue import Queue
from typing import Any

import cv2
import numpy as np


@dataclass(frozen=True)
class BrightSpot:
    """Represents a detected bright spot in the visual field."""

    x: int
    y: int
    area: float
    timestamp: str


@dataclass
class SpotDetectionResult:
    """Result of a spot detection analysis."""

    spots: list[BrightSpot] = field(default_factory=list)
    total_spots: int = 0
    total_area: float = 0.0
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    image_path: str = ""

    def to_json(self) -> str:
        """Serialize result to JSON for API consumption."""
        return json.dumps({
            "spots": [
                {"x": spot.x, "y": spot.y, "area": spot.area, "timestamp": spot.timestamp}
                for spot in self.spots
            ],
            "total_spots": self.total_spots,
            "total_area": self.total_area,
            "timestamp": self.timestamp,
            "image_path": self.image_path,
        })

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for API responses."""
        return json.loads(self.to_json())


class SpotTracker:
    """Thread-safe bright spot detection engine.

    Detects environmental distractions (bright spots) that may reduce user focus
    during AI tool usage. Runs in a daemon thread to prevent blocking.

    Example:
        tracker = SpotTracker(threshold=200, min_area=10)
        tracker.start_monitoring(camera_index=0)
        result = tracker.get_latest_result()
        tracker.stop_monitoring()
    """

    def __init__(
        self,
        threshold_value: int = 200,
        min_area: int = 10,
        blur_kernel: tuple[int, int] = (11, 11),
        erosion_iterations: int = 2,
        dilation_iterations: int = 4,
    ) -> None:
        """Initialize spot tracker with detection parameters.

        Args:
            threshold_value: Brightness threshold (0-255) for spot detection
            min_area: Minimum area (pixels) to count as a significant spot
            blur_kernel: Gaussian blur kernel size for smoothing
            erosion_iterations: Erosion passes to remove noise
            dilation_iterations: Dilation passes to merge nearby spots
        """
        self.threshold_value = threshold_value
        self.min_area = min_area
        self.blur_kernel = blur_kernel
        self.erosion_iterations = erosion_iterations
        self.dilation_iterations = dilation_iterations

        # Thread safety
        self._lock = threading.Lock()
        self._monitoring = False
        self._monitor_thread: threading.Thread | None = None
        self._result_queue: Queue[SpotDetectionResult] = Queue(maxsize=10)
        self._latest_result: SpotDetectionResult | None = None
        self._camera: cv2.VideoCapture | None = None

    def detect_spots_from_image(self, image_path: str | Path) -> SpotDetectionResult:
        """Detect bright spots in a static image file.

        Args:
            image_path: Path to image file

        Returns:
            SpotDetectionResult with detected spots and metadata

        Raises:
            FileNotFoundError: If image file doesn't exist
            ValueError: If image cannot be loaded
        """
        path = Path(image_path)
        if not path.exists():
            raise FileNotFoundError(f"Image not found: {image_path}")

        image = cv2.imread(str(path))
        if image is None:
            raise ValueError(f"Could not load image: {image_path}")

        spots = self._process_frame(image)

        return SpotDetectionResult(
            spots=spots,
            total_spots=len(spots),
            total_area=sum(spot.area for spot in spots),
            timestamp=datetime.now(timezone.utc).isoformat(),
            image_path=str(path),
        )

    def detect_spots_from_frame(self, frame: np.ndarray) -> SpotDetectionResult:
        """Detect bright spots in a raw video frame.

        Args:
            frame: OpenCV image array (BGR format)

        Returns:
            SpotDetectionResult with detected spots
        """
        spots = self._process_frame(frame)

        return SpotDetectionResult(
            spots=spots,
            total_spots=len(spots),
            total_area=sum(spot.area for spot in spots),
            timestamp=datetime.now(timezone.utc).isoformat(),
        )

    def _process_frame(self, image: np.ndarray) -> list[BrightSpot]:
        """Core spot detection algorithm.

        Args:
            image: OpenCV image array (BGR format)

        Returns:
            List of detected BrightSpot objects
        """
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Smooth to merge nearby bright pixels
        blurred = cv2.GaussianBlur(gray, self.blur_kernel, 0)

        # Threshold: bright pixels become white (255)
        _, thresh = cv2.threshold(blurred, self.threshold_value, 255, cv2.THRESH_BINARY)

        # Clean up noise
        thresh = cv2.erode(thresh, None, iterations=self.erosion_iterations)
        thresh = cv2.dilate(thresh, None, iterations=self.dilation_iterations)

        # Find contours (outlines of bright islands)
        contours, _ = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        bright_spots: list[BrightSpot] = []
        timestamp = datetime.now(timezone.utc).isoformat()

        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area > self.min_area:
                # Calculate centroid
                M = cv2.moments(cnt)
                if M["m00"] != 0:
                    cX = int(M["m10"] / M["m00"])
                    cY = int(M["m01"] / M["m00"])
                    bright_spots.append(
                        BrightSpot(x=cX, y=cY, area=float(area), timestamp=timestamp)
                    )

        return bright_spots

    def start_monitoring(self, camera_index: int = 0, poll_interval: float = 0.5) -> None:
        """Start continuous monitoring in a daemon thread.

        Args:
            camera_index: Camera device index (0 for default webcam)
            poll_interval: Seconds between frame captures

        Raises:
            RuntimeError: If monitoring is already active
            ValueError: If camera cannot be opened
        """
        with self._lock:
            if self._monitoring:
                raise RuntimeError("Monitoring already active")

            self._camera = cv2.VideoCapture(camera_index)
            if not self._camera.isOpened():
                raise ValueError(f"Cannot open camera {camera_index}")

            self._monitoring = True
            self._monitor_thread = threading.Thread(
                target=self._monitoring_loop,
                args=(poll_interval,),
                daemon=True,  # Thread dies when main program exits
                name="SpotTrackerDaemon",
            )
            self._monitor_thread.start()

    def stop_monitoring(self) -> None:
        """Stop the monitoring daemon thread."""
        with self._lock:
            self._monitoring = False

        # Wait for thread to finish (with timeout)
        if self._monitor_thread and self._monitor_thread.is_alive():
            self._monitor_thread.join(timeout=2.0)

        # Release camera
        if self._camera:
            self._camera.release()
            self._camera = None

    def _monitoring_loop(self, poll_interval: float) -> None:
        """Daemon thread loop for continuous monitoring.

        Args:
            poll_interval: Seconds between frame captures
        """
        while True:
            # Check if we should stop
            with self._lock:
                if not self._monitoring:
                    break

            try:
                # Capture frame
                if self._camera:
                    ret, frame = self._camera.read()
                    if ret:
                        result = self.detect_spots_from_frame(frame)

                        # Update latest result (thread-safe)
                        with self._lock:
                            self._latest_result = result

                        # Add to queue (non-blocking)
                        if not self._result_queue.full():
                            self._result_queue.put(result)

            except Exception as e:
                # Log error but don't crash the daemon
                print(f"SpotTracker error: {e}")

            # Sleep before next capture
            time.sleep(poll_interval)

    def get_latest_result(self) -> SpotDetectionResult | None:
        """Get most recent detection result (thread-safe).

        Returns:
            Latest SpotDetectionResult or None if no results yet
        """
        with self._lock:
            return self._latest_result

    def is_monitoring(self) -> bool:
        """Check if monitoring is currently active."""
        with self._lock:
            return self._monitoring

    def calculate_distraction_score(self, result: SpotDetectionResult | None = None) -> float:
        """Calculate environmental distraction score from spot detection.

        Score is based on number and size of detected bright spots.
        Higher scores indicate more visual distractions.

        Args:
            result: SpotDetectionResult to analyze (uses latest if None)

        Returns:
            Distraction score between 0.0 (no distraction) and 1.0 (high distraction)
        """
        if result is None:
            result = self.get_latest_result()

        if result is None or result.total_spots == 0:
            return 0.0

        # Score based on:
        # 1. Number of spots (more spots = more distraction)
        # 2. Total area (larger spots = more distraction)

        # Normalize spot count (cap at 10 spots = 0.5)
        spot_score = min(result.total_spots / 20.0, 0.5)

        # Normalize total area (cap at 10000 pixels = 0.5)
        area_score = min(result.total_area / 20000.0, 0.5)

        return min(spot_score + area_score, 1.0)
