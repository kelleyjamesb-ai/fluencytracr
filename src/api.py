"""API helpers enforcing aggregation and RBAC rules."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from src.access_control import RequestContext, enforce_aggregation_defaults, enforce_role_access
from src.events import EnablementEvent
from src.exceptions import NotFoundError, ValidationError
from src.fluency_service import FluencyScore, SuppressedMetric, calculate_fluency_with_suppression
from src.passive_signals import SignalEvent


def handle_dashboard_request(request: RequestContext) -> dict[str, str]:
    """Apply access controls and aggregation rules for dashboard requests."""
    enforce_role_access(request)
    query = enforce_aggregation_defaults(request.query)
    return {
        "endpoint": request.endpoint,
        "aggregation": query["aggregation"],
        "status": "ok",
    }


def handle_fluency_request(
    team_id: str,
    roster_size: int,
    min_group_size: int,
    all_signals: list[SignalEvent],
    all_enablement_events: list[EnablementEvent],
    policy_acknowledgment_rate: float,
    reference_date: datetime | None = None,
    environmental_penalty: float = 1.0,
) -> dict[str, float | str | bool | None]:
    """Handle GET /api/v1/analytics/fluency/{team_id} request.

    Returns team-level fluency metrics or suppressed metric if team is too small.

    Args:
        team_id: Team identifier
        roster_size: Total team roster size
        min_group_size: Minimum team size for non-suppressed metrics
        all_signals: All signal events (filtered internally)
        all_enablement_events: All enablement events (filtered internally)
        policy_acknowledgment_rate: % of team that completed AI Policy (0.0-1.0)
        reference_date: Optional reference date (defaults to now)
        environmental_penalty: Vision-based confidence modifier (0.7-1.0, default 1.0)

    Returns:
        Dictionary with fluency metrics or suppression indicator

    Raises:
        ValidationError: If inputs are invalid
        NotFoundError: If team_id doesn't exist in any signals/events
    """
    if not team_id:
        raise ValidationError("team_id is required")

    if roster_size <= 0:
        raise ValidationError("roster_size must be positive")

    if not 0.0 <= policy_acknowledgment_rate <= 1.0:
        raise ValidationError("policy_acknowledgment_rate must be between 0.0 and 1.0")

    # Verify team exists in the dataset
    team_signals = [s for s in all_signals if s.team_id == team_id]
    team_events = [e for e in all_enablement_events if e.team_id == team_id]

    if not team_signals and not team_events:
        raise NotFoundError(f"Team '{team_id}' not found in signals or enablement events")

    result = calculate_fluency_with_suppression(
        team_id=team_id,
        roster_size=roster_size,
        min_group_size=min_group_size,
        all_signals=all_signals,
        all_enablement_events=all_enablement_events,
        policy_acknowledgment_rate=policy_acknowledgment_rate,
        reference_date=reference_date,
        environmental_penalty=environmental_penalty,
    )

    if isinstance(result, SuppressedMetric):
        return {
            "team_id": result.team_id,
            "fluency_index": None,
            "coverage": None,
            "depth": None,
            "judgment": None,
            "velocity": None,
            "environmental_penalty": None,
            "suppressed": True,
            "reason": result.reason,
        }

    if isinstance(result, FluencyScore):
        return {
            "team_id": result.team_id,
            "fluency_index": round(result.fluency_index, 4),
            "coverage": round(result.coverage, 4),
            "depth": round(result.depth, 4),
            "judgment": round(result.judgment, 4),
            "velocity": round(result.velocity, 4),
            "environmental_penalty": round(result.environmental_penalty, 4),
            "suppressed": False,
        }

    raise ValidationError("Unexpected result type from fluency calculation")


def handle_vision_spots_request() -> dict[str, Any]:
    """Handle GET /api/v1/vision/spots request.

    Returns current detected spot coordinates for frontend display.
    This endpoint allows the LearnAIR frontend to visualize environmental
    distractions detected by the vision module.

    Returns:
        Dictionary containing:
            - spots: List of detected spot coordinates [{x, y, area, timestamp}]
            - total_spots: Total number of spots detected
            - total_area: Cumulative area of all spots
            - timestamp: ISO timestamp of detection
            - monitoring_active: Whether camera monitoring is active

    Note:
        This requires the vision module to be initialized with an active SpotTracker.
        If no tracker is available, returns empty spots list.
    """
    try:
        # Import here to avoid circular dependency and allow optional vision module
        from vision.visual_engine import SpotTracker

        # This would typically come from a global tracker instance
        # For now, we document the expected integration pattern
        # In production: tracker = get_global_spot_tracker()
        return {
            "spots": [],
            "total_spots": 0,
            "total_area": 0.0,
            "timestamp": datetime.now(datetime.timezone.utc).isoformat(),
            "monitoring_active": False,
            "message": "Vision tracker not initialized. Call initialize_vision_tracker() first.",
        }
    except ImportError:
        raise ValidationError("Vision module not available. Install opencv-python to enable visual tracking.")


def handle_vision_status_request() -> dict[str, Any]:
    """Handle GET /api/v1/vision/status request.

    Returns current status of vision monitoring and latest environmental penalty.

    Returns:
        Dictionary containing:
            - monitoring_active: Whether camera monitoring is running
            - latest_detection: Most recent spot detection result
            - penalty_factor: Current confidence penalty (0.7-1.0)
            - penalty_percentage: Penalty as percentage (0-30%)
            - reason: Human-readable explanation of penalty
    """
    try:
        from vision.fluency_bridge import LearnAIR_Bridge

        # This would typically come from a global bridge instance
        # For now, we document the expected integration pattern
        return {
            "monitoring_active": False,
            "latest_detection": None,
            "penalty_factor": 1.0,
            "penalty_percentage": 0.0,
            "reason": "Vision tracker not initialized",
        }
    except ImportError:
        raise ValidationError("Vision module not available. Install opencv-python to enable visual tracking.")
