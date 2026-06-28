"""OpenCV-based spot tracking and environment quality telemetry."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
import platform
import threading
import time
import uuid
from typing import Any

import cv2
import numpy as np


@dataclass(frozen=True)
class SpotEvent:
    """Immutable snapshot of a detected spot event for downstream scoring."""

    occurred_at: datetime
    intensity_max: float
    sat_frac: float
    roi_area_ratio: float
    worker_status: str


class SpotTracker:
    """Tracks visual stability signals without storing frames or raw content."""

    def __init__(
        self,
        *,
        camera_index: int = 0,
        intensity_threshold: int = 220,
        sat_threshold: int = 250,
        sat_frac_threshold: float = 0.002,
        target_fps: float = 10.0,
        roi: dict[str, int] | None = None,
    ) -> None:
        self._camera_index = camera_index
        self._intensity_threshold = intensity_threshold
        self._sat_threshold = sat_threshold
        self._sat_frac_threshold = sat_frac_threshold
        self._target_fps = target_fps
        self._roi = roi

        self._lock = threading.Lock()
        self._events: list[SpotEvent] = []
        self._latest_status = "camera_unavailable"
        self._latest_intensity_max = 0.0
        self._latest_sat_frac = 0.0
        self._latest_roi_area_ratio = 1.0

        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None
        self._cap: cv2.VideoCapture | None = None

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop_event.clear()
        self._thread = threading.Thread(
            target=self._run,
            name="OpenCV_Worker",
            daemon=True,
        )
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=1.0)
        if self._cap is not None:
            self._cap.release()
            self._cap = None

    def get_latest_data(self) -> list[dict[str, Any]]:
        with self._lock:
            return [
                {
                    "occurred_at": event.occurred_at.isoformat(),
                    "intensity_max": event.intensity_max,
                    "sat_frac": event.sat_frac,
                    "roi_area_ratio": event.roi_area_ratio,
                    "worker_status": event.worker_status,
                }
                for event in self._events[-10:]
            ]

    def get_latest_metrics(self) -> dict[str, float]:
        with self._lock:
            return {
                "intensity_max": self._latest_intensity_max,
                "sat_frac": self._latest_sat_frac,
                "roi_area_ratio": self._latest_roi_area_ratio,
            }

    def get_worker_status(self) -> str:
        with self._lock:
            return self._latest_status

    def _run(self) -> None:
        self._cap = cv2.VideoCapture(self._camera_index)
        interval = 1.0 / self._target_fps if self._target_fps > 0 else 0.0
        while not self._stop_event.is_set():
            start_time = time.monotonic()
            if self._cap is None or not self._cap.isOpened():
                self._record_status("camera_unavailable")
                time.sleep(interval or 0.1)
                continue
            success, frame = self._cap.read()
            if not success:
                self._record_status("frame_read_fail")
                time.sleep(interval or 0.05)
                continue
            roi_frame, roi_area_ratio = self._apply_roi(frame)
            gray = cv2.cvtColor(roi_frame, cv2.COLOR_BGR2GRAY)
            intensity_max = float(np.max(gray))
            sat_frac = float(np.mean(gray >= self._sat_threshold))
            worker_status = "ok"

            with self._lock:
                self._latest_status = worker_status
                self._latest_intensity_max = intensity_max
                self._latest_sat_frac = sat_frac
                self._latest_roi_area_ratio = roi_area_ratio

            if intensity_max >= self._intensity_threshold or sat_frac >= self._sat_frac_threshold:
                self._append_event(intensity_max, sat_frac, roi_area_ratio, worker_status)

            elapsed = time.monotonic() - start_time
            sleep_for = max(0.0, interval - elapsed)
            if sleep_for:
                time.sleep(sleep_for)

    def _apply_roi(self, frame: np.ndarray) -> tuple[np.ndarray, float]:
        frame_height, frame_width = frame.shape[:2]
        frame_pixels = max(1, frame_width * frame_height)
        if not self._roi:
            return frame, 1.0
        x = max(0, int(self._roi.get("x", 0)))
        y = max(0, int(self._roi.get("y", 0)))
        w = max(1, int(self._roi.get("w", frame_width)))
        h = max(1, int(self._roi.get("h", frame_height)))
        x_end = min(frame_width, x + w)
        y_end = min(frame_height, y + h)
        cropped = frame[y:y_end, x:x_end]
        roi_pixels = max(1, cropped.shape[0] * cropped.shape[1])
        roi_area_ratio = roi_pixels / frame_pixels
        return cropped, roi_area_ratio

    def _record_status(self, status: str) -> None:
        with self._lock:
            self._latest_status = status

    def _append_event(self, intensity_max: float, sat_frac: float, roi_area_ratio: float, status: str) -> None:
        event = SpotEvent(
            occurred_at=datetime.now(tz=timezone.utc),
            intensity_max=intensity_max,
            sat_frac=sat_frac,
            roi_area_ratio=roi_area_ratio,
            worker_status=status,
        )
        with self._lock:
            self._events.append(event)


class VisionQualityBridge:
    """Translates vision context into measurement quality without penalizing users."""

    def __init__(
        self,
        tracker: SpotTracker,
        *,
        quality_floor: float = 0.7,
        intensity_weight: float = 0.6,
        saturation_weight: float = 0.4,
        intensity_threshold: int = 220,
        sat_threshold: int = 250,
        env_model_version: str = "env_v1.1",
        device_class: str = "unknown",
        app_version: str = "dev",
    ) -> None:
        self._tracker = tracker
        self._quality_floor = quality_floor
        self._intensity_weight = intensity_weight
        self._saturation_weight = saturation_weight
        self._intensity_threshold = intensity_threshold
        self._sat_threshold = sat_threshold
        self._env_model_version = env_model_version
        self._device_class = device_class
        self._app_version = app_version

    def calculate_env_quality(self) -> float:
        metrics = self._tracker.get_latest_metrics()
        intensity_max = metrics["intensity_max"]
        sat_frac = metrics["sat_frac"]

        intensity_term = 1.0 - min(1.0, intensity_max / 255.0)
        saturation_term = 1.0 - min(1.0, sat_frac / 1.0)
        blended = (
            self._intensity_weight * intensity_term
            + self._saturation_weight * saturation_term
        )
        return float(min(1.0, max(self._quality_floor, blended)))

    def build_env_telemetry_event(
        self,
        *,
        session_id: str,
        org_id: str,
        user_id_hash: str,
    ) -> dict[str, object]:
        metrics = self._tracker.get_latest_metrics()
        env_quality = self.calculate_env_quality()
        worker_status = self._tracker.get_worker_status()
        return {
            "event_name": "telemetry_env_v1",
            "event_id": str(uuid.uuid4()),
            "occurred_at": datetime.now(tz=timezone.utc).isoformat(),
            "org_id": org_id,
            "user_id_hash": user_id_hash,
            "session_id": session_id,
            "device_class": self._device_class,
            "platform": _detect_platform(),
            "app_version": self._app_version,
            "camera_fps_target": float(self._tracker._target_fps),
            "roi_enabled": self._tracker._roi is not None,
            "roi_area_ratio": metrics["roi_area_ratio"],
            "intensity_max": metrics["intensity_max"],
            "sat_threshold": self._sat_threshold,
            "sat_frac": metrics["sat_frac"],
            "env_quality": env_quality,
            "env_model_version": self._env_model_version,
            "worker_status": worker_status,
        }


def _detect_platform() -> str:
    system = platform.system().lower()
    if "darwin" in system or "mac" in system:
        return "mac"
    if "windows" in system:
        return "windows"
    if "linux" in system:
        return "linux"
    return "unknown"


if __name__ == "__main__":
    tracker = SpotTracker()
    tracker.start()
    try:
        time.sleep(1.0)
        bridge = VisionQualityBridge(tracker)
        base_score = 0.82
        env_quality = bridge.calculate_env_quality()
        print(f"Base Fluency: {base_score:.2f}")
        print(f"Env Quality: {env_quality:.2f}")
        telemetry = bridge.build_env_telemetry_event(
            session_id="session-123",
            org_id="org-1",
            user_id_hash="hashed-user",
        )
        print(telemetry)
    finally:
        tracker.stop()
