"""Unit tests for the Vision Intelligence Module.

Tests cover:
1. SpotTracker - Image processing and spot detection
2. VisionQualityBridge - Environmental penalty calculation
3. Thread safety and daemon behavior
4. API integration
"""

from datetime import datetime, timezone
import ctypes.util
import unittest
from unittest.mock import MagicMock, patch

try:
    import pytest
except ModuleNotFoundError as exc:
    raise unittest.SkipTest("pytest is required for vision tests") from exc

try:
    import cv2  # noqa: F401
except ModuleNotFoundError as exc:
    raise unittest.SkipTest("OpenCV (cv2) is required for vision tests") from exc

if ctypes.util.find_library("GL") is None:
    raise unittest.SkipTest("libGL is required for OpenCV tests")

from vision.fluency_bridge import ConfidencePenalty, VisionQualityBridge
from vision.visual_engine import BrightSpot, SpotDetectionResult, SpotTracker


class TestSpotDetectionResult:
    """Tests for SpotDetectionResult data structure and serialization."""

    def test_empty_result(self):
        """Empty result should have zero spots and area."""
        result = SpotDetectionResult()
        assert result.total_spots == 0
        assert result.total_area == 0.0
        assert len(result.spots) == 0

    def test_to_dict_conversion(self):
        """Result should convert to dictionary for API consumption."""
        spots = [
            BrightSpot(x=100, y=200, area=500.0, timestamp="2024-01-01T00:00:00"),
            BrightSpot(x=300, y=400, area=750.0, timestamp="2024-01-01T00:00:01"),
        ]
        result = SpotDetectionResult(
            spots=spots,
            total_spots=2,
            total_area=1250.0,
            timestamp="2024-01-01T00:00:00",
        )

        data = result.to_dict()
        assert data["total_spots"] == 2
        assert data["total_area"] == 1250.0
        assert len(data["spots"]) == 2
        assert data["spots"][0]["x"] == 100
        assert data["spots"][0]["y"] == 200

    def test_to_json_format(self):
        """Result should serialize to valid JSON."""
        result = SpotDetectionResult(
            spots=[BrightSpot(x=50, y=50, area=100.0, timestamp="2024-01-01T00:00:00")],
            total_spots=1,
            total_area=100.0,
        )

        json_str = result.to_json()
        assert isinstance(json_str, str)
        assert "\"x\": 50" in json_str
        assert "\"y\": 50" in json_str
        assert "\"total_spots\": 1" in json_str


class TestSpotTrackerConfiguration:
    """Tests for SpotTracker initialization and configuration."""

    def test_default_initialization(self):
        """SpotTracker should initialize with default parameters."""
        tracker = SpotTracker()
        assert tracker.threshold_value == 200
        assert tracker.min_area == 10
        assert tracker.blur_kernel == (11, 11)

    def test_custom_parameters(self):
        """SpotTracker should accept custom detection parameters."""
        tracker = SpotTracker(
            threshold_value=180,
            min_area=20,
            blur_kernel=(15, 15),
        )
        assert tracker.threshold_value == 180
        assert tracker.min_area == 20
        assert tracker.blur_kernel == (15, 15)

    def test_initial_state(self):
        """Newly created tracker should not be monitoring."""
        tracker = SpotTracker()
        assert not tracker.is_monitoring()
        assert tracker.get_latest_result() is None


class TestSpotTrackerImageProcessing:
    """Tests for image processing and spot detection logic."""

    @patch("cv2.VideoCapture")
    @patch("cv2.imread")
    @patch("pathlib.Path.exists")
    def test_detect_from_image_path(self, mock_exists, mock_imread, mock_capture):
        """Should detect spots from image file path."""
        # Mock image data
        import numpy as np

        mock_exists.return_value = True  # Pretend file exists
        mock_image = np.zeros((480, 640, 3), dtype=np.uint8)
        mock_imread.return_value = mock_image

        tracker = SpotTracker()
        result = tracker.detect_spots_from_image("/fake/path.jpg")

        assert isinstance(result, SpotDetectionResult)
        assert result.image_path == "/fake/path.jpg"

    @patch("cv2.VideoCapture")
    def test_detect_from_frame(self, mock_capture):
        """Should detect spots from numpy frame array."""
        import numpy as np

        # Create mock frame with bright spot
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        # Add a bright spot in the center
        frame[200:280, 280:360] = 255

        tracker = SpotTracker(threshold_value=200, min_area=10)
        result = tracker.detect_spots_from_frame(frame)

        assert isinstance(result, SpotDetectionResult)
        # Note: Actual spot detection depends on OpenCV processing


class TestSpotTrackerThreading:
    """Tests for daemon thread monitoring and thread safety."""

    @patch("cv2.VideoCapture")
    def test_start_monitoring_initializes_camera(self, mock_capture_class):
        """Starting monitoring should open camera and start daemon thread."""
        mock_camera = MagicMock()
        mock_camera.isOpened.return_value = True
        mock_capture_class.return_value = mock_camera

        tracker = SpotTracker()
        tracker.start_monitoring(camera_index=0, poll_interval=0.1)

        assert tracker.is_monitoring()
        mock_capture_class.assert_called_once_with(0)

        # Cleanup
        tracker.stop_monitoring()

    @patch("cv2.VideoCapture")
    def test_stop_monitoring_cleanup(self, mock_capture_class):
        """Stopping monitoring should release camera and join thread."""
        mock_camera = MagicMock()
        mock_camera.isOpened.return_value = True
        mock_capture_class.return_value = mock_camera

        tracker = SpotTracker()
        tracker.start_monitoring(camera_index=0, poll_interval=0.1)
        tracker.stop_monitoring()

        assert not tracker.is_monitoring()
        mock_camera.release.assert_called_once()

    @patch("cv2.VideoCapture")
    def test_cannot_start_monitoring_twice(self, mock_capture_class):
        """Should raise error if trying to start monitoring while already active."""
        mock_camera = MagicMock()
        mock_camera.isOpened.return_value = True
        mock_capture_class.return_value = mock_camera

        tracker = SpotTracker()
        tracker.start_monitoring(camera_index=0)

        with pytest.raises(RuntimeError, match="Monitoring already active"):
            tracker.start_monitoring(camera_index=0)

        tracker.stop_monitoring()

    @patch("cv2.VideoCapture")
    def test_camera_open_failure(self, mock_capture_class):
        """Should raise error if camera cannot be opened."""
        mock_camera = MagicMock()
        mock_camera.isOpened.return_value = False
        mock_capture_class.return_value = mock_camera

        tracker = SpotTracker()
        with pytest.raises(ValueError, match="Cannot open camera"):
            tracker.start_monitoring(camera_index=0)


class TestDistractionScoreCalculation:
    """Tests for environmental distraction score calculation."""

    def test_no_spots_zero_distraction(self):
        """No detected spots should result in zero distraction score."""
        tracker = SpotTracker()
        result = SpotDetectionResult(spots=[], total_spots=0, total_area=0.0)

        score = tracker.calculate_distraction_score(result)
        assert score == 0.0

    def test_few_small_spots_low_distraction(self):
        """Few small spots should result in low distraction score."""
        tracker = SpotTracker()
        spots = [
            BrightSpot(x=100, y=100, area=50.0, timestamp="2024-01-01T00:00:00"),
            BrightSpot(x=200, y=200, area=75.0, timestamp="2024-01-01T00:00:00"),
        ]
        result = SpotDetectionResult(spots=spots, total_spots=2, total_area=125.0)

        score = tracker.calculate_distraction_score(result)
        assert 0.0 <= score <= 0.3  # Low distraction

    def test_many_large_spots_high_distraction(self):
        """Many large spots should result in high distraction score."""
        tracker = SpotTracker()
        spots = [
            BrightSpot(x=i * 50, y=i * 50, area=1000.0, timestamp="2024-01-01T00:00:00")
            for i in range(20)
        ]
        result = SpotDetectionResult(spots=spots, total_spots=20, total_area=20000.0)

        score = tracker.calculate_distraction_score(result)
        assert 0.7 <= score <= 1.0  # High distraction

    def test_distraction_score_caps_at_one(self):
        """Distraction score should never exceed 1.0."""
        tracker = SpotTracker()
        spots = [
            BrightSpot(x=i * 10, y=i * 10, area=5000.0, timestamp="2024-01-01T00:00:00")
            for i in range(100)
        ]
        result = SpotDetectionResult(spots=spots, total_spots=100, total_area=500000.0)

        score = tracker.calculate_distraction_score(result)
        assert score <= 1.0


class TestVisionQualityBridge:
    """Tests for VisionQualityBridge environmental penalty calculation."""

    def test_ideal_environment_no_penalty(self):
        """Test Case 1: Ideal environment with no bright spots.

        If no bright spots are detected, the modifier should be 1.0 (no change to fluency).
        """
        tracker = SpotTracker()
        bridge = VisionQualityBridge(tracker)

        # Mock empty detection result
        result = SpotDetectionResult(spots=[], total_spots=0, total_area=0.0)

        penalty = bridge.calculate_environmental_penalty(result)

        assert penalty.penalty_factor == 1.0, "No spots should result in no penalty"
        assert penalty.spot_count == 0
        assert penalty.total_area == 0.0
        assert "Ideal environment" in penalty.reason or "no visual distractions" in penalty.reason

    def test_extreme_glare_penalty_floor(self):
        """Test Case 2: Extreme glare scenario.

        Even with severe environmental distraction, the penalty should never
        drop below 0.7 (maximum 30% penalty).
        """
        tracker = SpotTracker()
        bridge = VisionQualityBridge(tracker)

        # Create extreme distraction scenario
        spots = [
            BrightSpot(x=i * 20, y=i * 20, area=5000.0, timestamp="2024-01-01T00:00:00")
            for i in range(50)
        ]
        result = SpotDetectionResult(spots=spots, total_spots=50, total_area=250000.0)

        penalty = bridge.calculate_environmental_penalty(result)

        assert penalty.penalty_factor >= 0.7, "Penalty should never drop below 0.7"
        assert penalty.penalty_factor <= 1.0
        assert penalty.penalty_percentage <= 30.0 + 1e-9, "Maximum penalty is 30%"

    def test_coordinate_mapping(self):
        """Test Case 3: Coordinate extraction and mapping.

        Verify that spot coordinates are correctly extracted and preserved
        through the detection pipeline.
        """
        tracker = SpotTracker()

        # Create spots with known coordinates
        spots = [
            BrightSpot(x=100, y=200, area=500.0, timestamp="2024-01-01T00:00:00"),
            BrightSpot(x=300, y=400, area=750.0, timestamp="2024-01-01T00:00:01"),
            BrightSpot(x=500, y=600, area=1000.0, timestamp="2024-01-01T00:00:02"),
        ]
        result = SpotDetectionResult(spots=spots, total_spots=3, total_area=2250.0)

        # Verify coordinates are preserved
        assert len(result.spots) == 3
        assert result.spots[0].x == 100
        assert result.spots[0].y == 200
        assert result.spots[1].x == 300
        assert result.spots[1].y == 400
        assert result.spots[2].x == 500
        assert result.spots[2].y == 600

    def test_moderate_distraction_penalty(self):
        """Test Case 4: Moderate distraction scenario.

        A moderate number of spots should result in a penalty between
        0.7 and 1.0 (between 0% and 30% penalty).
        """
        tracker = SpotTracker()
        bridge = VisionQualityBridge(tracker)

        # Moderate distraction
        spots = [
            BrightSpot(x=i * 100, y=i * 100, area=200.0, timestamp="2024-01-01T00:00:00")
            for i in range(10)
        ]
        result = SpotDetectionResult(spots=spots, total_spots=10, total_area=2000.0)

        penalty = bridge.calculate_environmental_penalty(result)

        assert 0.7 <= penalty.penalty_factor <= 1.0
        assert 0.0 <= penalty.penalty_percentage <= 30.0
        assert penalty.spot_count == 10
        assert penalty.total_area == 2000.0

    def test_apply_penalty_to_fluency(self):
        """Test Case 5: Integration with legacy quality score.

        Verify that the penalty is correctly applied to a base legacy quality score.
        Formula: Adjusted_Fluency = Base_Score × Environmental_Penalty
        """
        tracker = SpotTracker()
        bridge = VisionQualityBridge(tracker)

        base_quality = 0.85

        # No distraction scenario
        result_clean = SpotDetectionResult(spots=[], total_spots=0, total_area=0.0)
        adjusted_clean, penalty_clean = bridge.apply_penalty_to_fluency(base_quality, result_clean)

        assert adjusted_clean == base_quality, "Clean environment should not change fluency"
        assert penalty_clean.penalty_factor == 1.0

        # High distraction scenario
        spots = [
            BrightSpot(x=i * 50, y=i * 50, area=1000.0, timestamp="2024-01-01T00:00:00")
            for i in range(20)
        ]
        result_distracted = SpotDetectionResult(spots=spots, total_spots=20, total_area=20000.0)
        adjusted_distracted, penalty_distracted = bridge.apply_penalty_to_fluency(
            base_quality, result_distracted
        )

        assert adjusted_distracted < base_quality, "Distraction should reduce fluency"
        assert adjusted_distracted >= base_quality * 0.7, "Should not reduce below 70% of base"
        assert adjusted_distracted == base_quality * penalty_distracted.penalty_factor

    def test_penalty_reason_generation(self):
        """Test Case 6: Human-readable reason generation.

        Verify that penalty reasons are descriptive and match distraction levels.
        """
        tracker = SpotTracker()
        bridge = VisionQualityBridge(tracker)

        # Minimal distraction
        result_minimal = SpotDetectionResult(
            spots=[BrightSpot(x=100, y=100, area=50.0, timestamp="2024-01-01T00:00:00")],
            total_spots=1,
            total_area=50.0,
        )
        penalty_minimal = bridge.calculate_environmental_penalty(result_minimal)
        assert "Minimal" in penalty_minimal.reason or "spot" in penalty_minimal.reason

        # Severe distraction
        spots_severe = [
            BrightSpot(x=i * 30, y=i * 30, area=2000.0, timestamp="2024-01-01T00:00:00")
            for i in range(25)
        ]
        result_severe = SpotDetectionResult(spots=spots_severe, total_spots=25, total_area=50000.0)
        penalty_severe = bridge.calculate_environmental_penalty(result_severe)
        assert (
            "Severe" in penalty_severe.reason
            or "High" in penalty_severe.reason
            or "unreliable" in penalty_severe.reason
        )

    def test_no_data_available(self):
        """Test Case 7: No vision data available.

        When no detection result is available, should return neutral penalty.
        """
        tracker = SpotTracker()
        bridge = VisionQualityBridge(tracker)

        penalty = bridge.calculate_environmental_penalty(None)

        assert penalty.penalty_factor == 1.0
        assert penalty.spot_count == 0
        assert "No visual data" in penalty.reason

    def test_get_status(self):
        """Test Case 8: Status reporting.

        Verify that get_status() returns comprehensive monitoring information.
        """
        tracker = SpotTracker()
        bridge = VisionQualityBridge(tracker)

        status = bridge.get_status()

        assert "monitoring_active" in status
        assert "latest_detection" in status
        assert "penalty_factor" in status
        assert "penalty_percentage" in status
        assert "reason" in status

        assert isinstance(status["monitoring_active"], bool)
        assert isinstance(status["penalty_factor"], float)


class TestConfidencePenalty:
    """Tests for ConfidencePenalty data structure."""

    def test_penalty_percentage_calculation(self):
        """Penalty percentage should correctly convert factor to percentage."""
        penalty = ConfidencePenalty(
            penalty_factor=0.85, reason="Test", spot_count=5, total_area=1000.0
        )

        assert abs(penalty.penalty_percentage - 15.0) < 1e-9  # (1.0 - 0.85) * 100

    def test_penalty_immutability(self):
        """ConfidencePenalty should be immutable (frozen dataclass)."""
        penalty = ConfidencePenalty(penalty_factor=0.9, reason="Test", spot_count=2, total_area=500.0)

        with pytest.raises(AttributeError):
            penalty.penalty_factor = 0.8  # type: ignore[misc]
