"""LearnAIR Fluency Index - Privacy-first AI maturity scoring.

Mathematical Framework:
    F = (0.20C + 0.40D + 0.25J + 0.15V) × E

Where:
    C (Coverage): Ratio of weekly active users to roster size
    D (Depth): Weighted interaction score normalized against power user baseline
    J (Judgment): Compliance score with Shadow AI penalties
    V (Velocity): Delta of Depth in 14 days post-enablement vs 14 days pre-enablement
    E (Environmental): Vision-based confidence modifier (0.7-1.0) based on detected distractions

Environmental Penalty Integration:
    The vision module monitors for bright spots (glare, laser pointers, reflections)
    that may indicate environmental distractions affecting user focus. High distraction
    applies a confidence penalty (E) to the fluency score, capped at 30% reduction.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Literal

from src.events import EnablementEvent
from src.exceptions import NotFoundError, PrivacyViolationError, ValidationError
from src.passive_signals import SignalEvent

# Signal type weights for Depth calculation
SIGNAL_WEIGHTS: dict[str, float] = {
    "autocomplete": 1.0,
    "documentation": 2.0,
    "test_gen": 3.0,
    "refactor": 5.0,
}

# Power user baseline: 100 weighted points per week = 1.0 normalized score
POWER_USER_BASELINE = 100.0

# Component weights (must sum to 1.0)
WEIGHT_COVERAGE = 0.20
WEIGHT_DEPTH = 0.40
WEIGHT_JUDGMENT = 0.25
WEIGHT_VELOCITY = 0.15

# Judgment penalties
SHADOW_AI_PENALTY = 0.20


@dataclass(frozen=True)
class SuppressedMetric:
    """Represents a suppressed metric for privacy protection."""

    team_id: str
    value: None = None
    suppressed: bool = True
    reason: str = "Team size below minGroupSize threshold"


@dataclass(frozen=True)
class FluencyScore:
    """Team-level fluency score with component breakdown."""

    team_id: str
    fluency_index: float
    coverage: float
    depth: float
    judgment: float
    velocity: float
    suppressed: bool = False
    environmental_penalty: float = 1.0  # Vision-based confidence modifier (0.7-1.0)


def _validate_weights() -> None:
    """Ensure component weights sum to 1.0."""
    total = WEIGHT_COVERAGE + WEIGHT_DEPTH + WEIGHT_JUDGMENT + WEIGHT_VELOCITY
    if abs(total - 1.0) > 1e-9:
        raise ValidationError(f"Component weights must sum to 1.0, got {total}")


def _check_for_privacy_violations(signals: list[SignalEvent]) -> None:
    """Raise PrivacyViolationError if any raw prompt_content is detected."""
    for signal in signals:
        if "prompt_content" in signal.metadata:
            raise PrivacyViolationError(
                "Detected forbidden field 'prompt_content' in signal metadata. "
                "Raw prompts must never be collected."
            )
        if "output_content" in signal.metadata:
            raise PrivacyViolationError(
                "Detected forbidden field 'output_content' in signal metadata. "
                "Raw AI outputs must never be collected."
            )


def calculate_coverage(
    weekly_active_users: int,
    roster_size: int,
) -> float:
    """Calculate Coverage (C): Ratio of WAU to roster size.

    Args:
        weekly_active_users: Count of unique users with >=1 signal in past 7 days
        roster_size: Total number of employees on the team roster

    Returns:
        Coverage score between 0.0 and 1.0
    """
    if roster_size <= 0:
        raise ValidationError("Roster size must be positive")
    return min(1.0, weekly_active_users / roster_size)


def calculate_depth(
    signals: list[SignalEvent],
    time_window_days: int = 7,
) -> float:
    """Calculate Depth (D): Weighted interaction score.

    Weights:
        - autocomplete: 1 point
        - documentation: 2 points
        - test_gen: 3 points
        - refactor: 5 points

    Normalized against power user baseline (100 points/week = 1.0).

    Args:
        signals: List of signal events for the team
        time_window_days: Number of days to consider (default 7 for weekly)

    Returns:
        Normalized depth score
    """
    _check_for_privacy_violations(signals)

    total_weighted_points = 0.0
    for signal in signals:
        weight = SIGNAL_WEIGHTS.get(signal.signal_type, 0.0)
        total_weighted_points += weight

    # Normalize by time window to get weekly equivalent
    weekly_points = total_weighted_points * (7.0 / time_window_days)

    # Normalize against power user baseline
    return weekly_points / POWER_USER_BASELINE


def calculate_judgment(
    shadow_ai_count: int,
    policy_acknowledgment_rate: float,
) -> float:
    """Calculate Judgment (J): Compliance score.

    Formula:
        J = (1.0 - (shadow_ai_count * SHADOW_AI_PENALTY)) * policy_acknowledgment_rate

    Args:
        shadow_ai_count: Number of Shadow AI events detected
        policy_acknowledgment_rate: Percentage of team that completed AI Policy (0.0-1.0)

    Returns:
        Judgment score between 0.0 and 1.0
    """
    if not 0.0 <= policy_acknowledgment_rate <= 1.0:
        raise ValidationError("Policy acknowledgment rate must be between 0.0 and 1.0")

    base_score = 1.0 - (shadow_ai_count * SHADOW_AI_PENALTY)
    base_score = max(0.0, base_score)  # Floor at 0

    return base_score * policy_acknowledgment_rate


def calculate_velocity(
    signals_pre: list[SignalEvent],
    signals_post: list[SignalEvent],
    enablement_events: list[EnablementEvent],
) -> float:
    """Calculate Velocity (V): Delta of Depth after vs before enablement.

    Compares Depth in 14 days following enablement events to 14 days prior baseline.

    Args:
        signals_pre: Signals from 14 days before enablement event
        signals_post: Signals from 14 days after enablement event
        enablement_events: List of enablement events to anchor the measurement

    Returns:
        Velocity as delta of normalized depth scores
    """
    if not enablement_events:
        return 0.0

    _check_for_privacy_violations(signals_pre + signals_post)

    depth_pre = calculate_depth(signals_pre, time_window_days=14)
    depth_post = calculate_depth(signals_post, time_window_days=14)

    return depth_post - depth_pre


def get_signals_in_window(
    all_signals: list[SignalEvent],
    team_id: str,
    start_date: datetime,
    end_date: datetime,
) -> list[SignalEvent]:
    """Filter signals for a specific team within a time window."""
    return [
        signal
        for signal in all_signals
        if signal.team_id == team_id
        and start_date <= signal.occurred_at < end_date
    ]


def get_enablement_anchor_date(
    enablement_events: list[EnablementEvent],
    team_id: str,
) -> datetime | None:
    """Find the most recent session_attended or assessment_post event for velocity calculation."""
    relevant = [
        event
        for event in enablement_events
        if event.team_id == team_id
        and event.event_type in ("session_attended", "assessment_post")
    ]
    if not relevant:
        return None
    return max(event.occurred_at for event in relevant)


def calculate_fluency_index(
    team_id: str,
    roster_size: int,
    all_signals: list[SignalEvent],
    all_enablement_events: list[EnablementEvent],
    policy_acknowledgment_rate: float,
    reference_date: datetime | None = None,
    environmental_penalty: float = 1.0,
) -> FluencyScore:
    """Calculate comprehensive fluency index for a team.

    Args:
        team_id: Team identifier
        roster_size: Total team roster size
        all_signals: All signal events (will be filtered by team_id)
        all_enablement_events: All enablement events (will be filtered by team_id)
        policy_acknowledgment_rate: % of team that completed AI Policy (0.0-1.0)
        reference_date: Date to calculate from (defaults to now)
        environmental_penalty: Vision-based confidence modifier (0.7-1.0, default 1.0)
            Applied from LearnAIR_Bridge based on detected visual distractions

    Returns:
        FluencyScore with composite index and component scores

    Note:
        The environmental_penalty is applied as a final multiplier to the fluency index:
            Adjusted_Fluency = Base_Fluency × Environmental_Penalty
        This allows the vision module to reduce confidence in metrics when environmental
        distractions (glare, bright spots) are detected.
    """
    _validate_weights()

    if reference_date is None:
        reference_date = datetime.now(datetime.timezone.utc)

    # Filter signals for this team
    team_signals = [s for s in all_signals if s.team_id == team_id]
    team_enablement = [e for e in all_enablement_events if e.team_id == team_id]

    # Coverage: WAU in past 7 days
    week_ago = reference_date - timedelta(days=7)
    recent_signals = get_signals_in_window(team_signals, team_id, week_ago, reference_date)
    unique_users = len(set(signal.role_id for signal in recent_signals))  # Using role_id as user proxy
    coverage = calculate_coverage(unique_users, roster_size)

    # Depth: Weighted interaction score in past 7 days
    depth = calculate_depth(recent_signals, time_window_days=7)

    # Judgment: Shadow AI penalties and policy compliance
    shadow_ai_count = sum(1 for signal in team_signals if signal.is_shadow_ai)
    judgment = calculate_judgment(shadow_ai_count, policy_acknowledgment_rate)

    # Velocity: Depth delta around most recent enablement event
    anchor_date = get_enablement_anchor_date(team_enablement, team_id)
    if anchor_date:
        pre_start = anchor_date - timedelta(days=14)
        pre_signals = get_signals_in_window(team_signals, team_id, pre_start, anchor_date)
        post_end = anchor_date + timedelta(days=14)
        post_signals = get_signals_in_window(team_signals, team_id, anchor_date, post_end)
        velocity = calculate_velocity(pre_signals, post_signals, team_enablement)
    else:
        velocity = 0.0

    # Composite Fluency Index (before environmental adjustment)
    base_fluency = (
        WEIGHT_COVERAGE * coverage
        + WEIGHT_DEPTH * depth
        + WEIGHT_JUDGMENT * judgment
        + WEIGHT_VELOCITY * velocity
    )

    # Apply environmental penalty from vision module
    # Formula: Adjusted_Fluency = Base_Fluency × Environmental_Penalty
    # Penalty ranges from 0.7 (30% reduction) to 1.0 (no reduction)
    if not 0.7 <= environmental_penalty <= 1.0:
        raise ValidationError(
            f"Environmental penalty must be between 0.7 and 1.0, got {environmental_penalty}"
        )

    adjusted_fluency = base_fluency * environmental_penalty

    return FluencyScore(
        team_id=team_id,
        fluency_index=adjusted_fluency,
        coverage=coverage,
        depth=depth,
        judgment=judgment,
        velocity=velocity,
        suppressed=False,
        environmental_penalty=environmental_penalty,
    )


def calculate_fluency_with_suppression(
    team_id: str,
    roster_size: int,
    min_group_size: int,
    all_signals: list[SignalEvent],
    all_enablement_events: list[EnablementEvent],
    policy_acknowledgment_rate: float,
    reference_date: datetime | None = None,
    environmental_penalty: float = 1.0,
) -> FluencyScore | SuppressedMetric:
    """Calculate fluency index with privacy suppression.

    Returns SuppressedMetric if team size is below minGroupSize threshold.

    Args:
        team_id: Team identifier
        roster_size: Total team roster size
        min_group_size: Minimum team size for non-suppressed metrics
        all_signals: All signal events
        all_enablement_events: All enablement events
        policy_acknowledgment_rate: % of team that completed AI Policy
        reference_date: Date to calculate from (defaults to now)
        environmental_penalty: Vision-based confidence modifier (0.7-1.0, default 1.0)

    Returns:
        FluencyScore if team is large enough, otherwise SuppressedMetric
    """
    if roster_size < min_group_size:
        return SuppressedMetric(
            team_id=team_id,
            reason=f"Team size ({roster_size}) below minGroupSize ({min_group_size})",
        )

    return calculate_fluency_index(
        team_id=team_id,
        roster_size=roster_size,
        all_signals=all_signals,
        all_enablement_events=all_enablement_events,
        policy_acknowledgment_rate=policy_acknowledgment_rate,
        reference_date=reference_date,
        environmental_penalty=environmental_penalty,
    )
