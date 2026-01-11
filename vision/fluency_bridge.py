"""Bridge between visual distraction detection and fluency index calculation.

Translates environmental visual distractions (bright spots) into confidence
penalties that adjust the fluency score. High distraction environments reduce
the reliability of fluency metrics.
"""

from __future__ import annotations

from dataclasses import dataclass

from vision.visual_engine import SpotDetectionResult, SpotTracker


@dataclass(frozen=True)
class ConfidencePenalty:
    """Represents the impact of environmental distractions on fluency metrics."""

    penalty_factor: float  # Multiplier between 0.0 (maximum penalty) and 1.0 (no penalty)
    reason: str
    spot_count: int
    total_area: float

    @property
    def penalty_percentage(self) -> float:
        """Get penalty as percentage (0-100%)."""
        return (1.0 - self.penalty_factor) * 100.0


class LearnAIR_Bridge:
    """Translates visual spot detection into fluency index confidence modifiers.

    Rationale:
        Environmental distractions (screen glare, laser pointers, bright reflections)
        can impact the accuracy of AI engagement metrics. High-intensity bright spots
        suggest visual distractions that may reduce user focus, warranting a confidence
        penalty on the fluency score.

    Formula:
        penalty_factor = max(0.7, 1.0 - (distraction_score * 0.3))

    Where:
        - distraction_score ranges from 0.0 (no distraction) to 1.0 (high distraction)
        - penalty_factor ranges from 0.7 (30% penalty) to 1.0 (no penalty)
        - Maximum penalty caps at 30% to avoid over-correcting

    Example:
        bridge = LearnAIR_Bridge(tracker)
        penalty = bridge.calculate_environmental_penalty()
        adjusted_fluency = base_fluency * penalty.penalty_factor
    """

    # Penalty thresholds
    MAX_PENALTY = 0.30  # Maximum 30% penalty for extreme distraction
    SPOT_COUNT_THRESHOLD = 5  # More than 5 spots triggers penalty
    AREA_THRESHOLD = 5000.0  # Total area above 5000 pixels triggers penalty

    def __init__(self, tracker: SpotTracker) -> None:
        """Initialize bridge with a SpotTracker instance.

        Args:
            tracker: Active SpotTracker for visual monitoring
        """
        self.tracker = tracker

    def calculate_environmental_penalty(
        self,
        result: SpotDetectionResult | None = None,
    ) -> ConfidencePenalty:
        """Calculate confidence penalty based on environmental distractions.

        Args:
            result: SpotDetectionResult to analyze (uses tracker's latest if None)

        Returns:
            ConfidencePenalty with factor and explanation
        """
        if result is None:
            result = self.tracker.get_latest_result()

        # No detection data available
        if result is None:
            return ConfidencePenalty(
                penalty_factor=1.0,
                reason="No visual data available",
                spot_count=0,
                total_area=0.0,
            )

        # No distractions detected
        if result.total_spots == 0:
            return ConfidencePenalty(
                penalty_factor=1.0,
                reason="Ideal environment: no visual distractions detected",
                spot_count=0,
                total_area=0.0,
            )

        # Calculate distraction score
        distraction_score = self.tracker.calculate_distraction_score(result)

        # Apply penalty formula: max 30% penalty
        penalty_factor = max(1.0 - self.MAX_PENALTY, 1.0 - (distraction_score * self.MAX_PENALTY))

        # Determine reason
        reason = self._generate_reason(result, distraction_score)

        return ConfidencePenalty(
            penalty_factor=penalty_factor,
            reason=reason,
            spot_count=result.total_spots,
            total_area=result.total_area,
        )

    def _generate_reason(self, result: SpotDetectionResult, distraction_score: float) -> str:
        """Generate human-readable explanation for penalty.

        Args:
            result: SpotDetectionResult being analyzed
            distraction_score: Calculated distraction score (0.0-1.0)

        Returns:
            Explanation string
        """
        if distraction_score < 0.2:
            return f"Minimal distraction: {result.total_spots} spot(s) detected"
        elif distraction_score < 0.5:
            return f"Moderate distraction: {result.total_spots} bright spot(s) may affect focus"
        elif distraction_score < 0.8:
            return f"High distraction: {result.total_spots} bright spot(s) covering {result.total_area:.0f} pixels"
        else:
            return (
                f"Severe distraction: {result.total_spots} bright spot(s) with total area "
                f"{result.total_area:.0f} pixels - metrics may be unreliable"
            )

    def apply_penalty_to_fluency(
        self,
        base_fluency: float,
        result: SpotDetectionResult | None = None,
    ) -> tuple[float, ConfidencePenalty]:
        """Apply environmental penalty to a fluency score.

        Args:
            base_fluency: Original fluency index score (0.0-1.0)
            result: SpotDetectionResult to analyze (uses latest if None)

        Returns:
            Tuple of (adjusted_fluency, penalty_details)
        """
        penalty = self.calculate_environmental_penalty(result)
        adjusted_fluency = base_fluency * penalty.penalty_factor

        return adjusted_fluency, penalty

    def get_status(self) -> dict[str, any]:
        """Get current monitoring status and latest penalty.

        Returns:
            Dictionary with monitoring status and penalty information
        """
        is_active = self.tracker.is_monitoring()
        result = self.tracker.get_latest_result()
        penalty = self.calculate_environmental_penalty(result)

        return {
            "monitoring_active": is_active,
            "latest_detection": result.to_dict() if result else None,
            "penalty_factor": penalty.penalty_factor,
            "penalty_percentage": penalty.penalty_percentage,
            "reason": penalty.reason,
        }
