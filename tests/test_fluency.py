"""Tests for LearnAIR Fluency Index calculation."""

from datetime import datetime, timedelta, timezone

import pytest

from src.events import EnablementEvent
from src.exceptions import PrivacyViolationError, ValidationError
from src.fluency_service import (
    SIGNAL_WEIGHTS,
    WEIGHT_COVERAGE,
    WEIGHT_DEPTH,
    WEIGHT_JUDGMENT,
    WEIGHT_VELOCITY,
    SuppressedMetric,
    calculate_depth,
    calculate_fluency_with_suppression,
    calculate_judgment,
)
from src.passive_signals import SignalEvent


def test_high_usage_with_high_shadow_ai_low_judgment_score():
    """Test Case 1: Team with high usage but high Shadow AI results in low J score.

    Scenario:
        - Team has strong Depth (D) with many refactor signals
        - But multiple Shadow AI violations tank the Judgment (J) score
        - Overall fluency should be moderate due to low J weight (0.25)
    """
    now = datetime.now(timezone.utc)
    team_id = "team-shadow"

    # High depth: 10 refactor signals (5 points each = 50 points weekly)
    signals = [
        SignalEvent(
            source="code_review",
            occurred_at=now - timedelta(days=i),
            org_id="org-1",
            team_id=team_id,
            role_id=f"user-{i}",
            signal_type="refactor",
            metadata={},
            is_shadow_ai=False,
        )
        for i in range(10)
    ]

    # Add 5 Shadow AI violations
    shadow_signals = [
        SignalEvent(
            source="code_review",
            occurred_at=now - timedelta(days=i),
            org_id="org-1",
            team_id=team_id,
            role_id=f"shadow-user-{i}",
            signal_type="autocomplete",
            metadata={},
            is_shadow_ai=True,
        )
        for i in range(5)
    ]
    all_signals = signals + shadow_signals

    result = calculate_fluency_with_suppression(
        team_id=team_id,
        roster_size=15,
        min_group_size=3,
        all_signals=all_signals,
        all_enablement_events=[],
        policy_acknowledgment_rate=1.0,  # 100% acknowledged policy
        reference_date=now,
    )

    assert not isinstance(result, SuppressedMetric), "Should not be suppressed"

    # Verify high depth
    assert result.depth > 0.3, f"Expected high depth score, got {result.depth}"

    # Verify low judgment due to Shadow AI
    # J = (1.0 - (5 * 0.20)) * 1.0 = 0.0 (5 violations = 100% penalty)
    assert result.judgment == 0.0, f"Expected judgment=0.0 with 5 Shadow AI events, got {result.judgment}"

    # Fluency should be reduced due to low J
    assert result.fluency_index < 0.5, f"High Shadow AI should reduce overall fluency, got {result.fluency_index}"


def test_full_training_attendance_but_no_usage():
    """Test Case 2: Team with 100% training attendance but no usage (low D, high V potential).

    Scenario:
        - All team members attended training (session_attended events)
        - But no actual AI tool usage signals
        - Depth (D) should be 0.0
        - Coverage (C) should be 0.0
        - Velocity (V) could show improvement if signals appear post-training
    """
    now = datetime.now(timezone.utc)
    team_id = "team-trained-no-use"
    training_date = now - timedelta(days=20)

    # All 10 team members attended training
    enablement_events = [
        EnablementEvent(
            event_type="session_attended",
            occurred_at=training_date,
            org_id="org-1",
            team_id=team_id,
            role_id=f"user-{i}",
        )
        for i in range(10)
    ]

    # No usage signals at all
    signals: list[SignalEvent] = []

    result = calculate_fluency_with_suppression(
        team_id=team_id,
        roster_size=10,
        min_group_size=3,
        all_signals=signals,
        all_enablement_events=enablement_events,
        policy_acknowledgment_rate=1.0,
        reference_date=now,
    )

    assert not isinstance(result, SuppressedMetric)

    # No usage = zero depth and coverage
    assert result.depth == 0.0, f"No signals should yield depth=0.0, got {result.depth}"
    assert result.coverage == 0.0, f"No active users should yield coverage=0.0, got {result.coverage}"

    # Velocity should be 0 (no pre/post difference)
    assert result.velocity == 0.0, f"No signals means no velocity, got {result.velocity}"

    # Overall fluency should be very low
    assert result.fluency_index < 0.3, f"No usage should yield low fluency, got {result.fluency_index}"


def test_suppression_triggers_for_small_team():
    """Test Case 3: Verification that suppression triggers for a team of 2.

    Scenario:
        - Team has only 2 members
        - minGroupSize is 3
        - Should return SuppressedMetric with value=None
    """
    now = datetime.now(timezone.utc)
    team_id = "team-tiny"

    # Some signals for the tiny team
    signals = [
        SignalEvent(
            source="code_review",
            occurred_at=now - timedelta(days=1),
            org_id="org-1",
            team_id=team_id,
            role_id="user-1",
            signal_type="autocomplete",
            metadata={},
        ),
        SignalEvent(
            source="code_review",
            occurred_at=now - timedelta(days=2),
            org_id="org-1",
            team_id=team_id,
            role_id="user-2",
            signal_type="refactor",
            metadata={},
        ),
    ]

    result = calculate_fluency_with_suppression(
        team_id=team_id,
        roster_size=2,  # Only 2 members
        min_group_size=3,  # Threshold is 3
        all_signals=signals,
        all_enablement_events=[],
        policy_acknowledgment_rate=1.0,
        reference_date=now,
    )

    # Should be suppressed
    assert isinstance(result, SuppressedMetric), "Team of 2 should be suppressed with minGroupSize=3"
    assert result.suppressed is True
    assert result.value is None
    assert "2" in result.reason and "3" in result.reason, "Reason should mention team size and threshold"


def test_refactor_weights_5x_more_than_autocomplete():
    """Test Case 4: Validation that refactor signals weight 5x more than autocomplete.

    Scenario:
        - Compare depth score with 5 autocomplete signals vs 1 refactor signal
        - Should yield identical depth scores
    """
    now = datetime.now(timezone.utc)
    team_id = "team-weights"

    # Scenario A: 5 autocomplete signals (5 * 1 = 5 points)
    autocomplete_signals = [
        SignalEvent(
            source="code_review",
            occurred_at=now - timedelta(days=i),
            org_id="org-1",
            team_id=team_id,
            role_id=f"user-{i}",
            signal_type="autocomplete",
            metadata={},
        )
        for i in range(5)
    ]

    # Scenario B: 1 refactor signal (1 * 5 = 5 points)
    refactor_signals = [
        SignalEvent(
            source="code_review",
            occurred_at=now - timedelta(days=1),
            org_id="org-1",
            team_id=team_id,
            role_id="user-refactor",
            signal_type="refactor",
            metadata={},
        )
    ]

    depth_autocomplete = calculate_depth(autocomplete_signals, time_window_days=7)
    depth_refactor = calculate_depth(refactor_signals, time_window_days=7)

    # Should be equal (5 * 1 = 1 * 5)
    assert abs(depth_autocomplete - depth_refactor) < 1e-9, (
        f"5 autocomplete ({depth_autocomplete}) should equal 1 refactor ({depth_refactor})"
    )

    # Verify the weight ratio
    autocomplete_weight = SIGNAL_WEIGHTS["autocomplete"]
    refactor_weight = SIGNAL_WEIGHTS["refactor"]
    assert refactor_weight / autocomplete_weight == 5.0, (
        f"Refactor weight ({refactor_weight}) should be 5x autocomplete weight ({autocomplete_weight})"
    )


def test_component_weights_sum_to_one():
    """Test Case 5: Weight total validation (must equal 1.0).

    Validates the mathematical framework constraint:
        WEIGHT_COVERAGE + WEIGHT_DEPTH + WEIGHT_JUDGMENT + WEIGHT_VELOCITY == 1.0
    """
    total_weight = WEIGHT_COVERAGE + WEIGHT_DEPTH + WEIGHT_JUDGMENT + WEIGHT_VELOCITY

    assert abs(total_weight - 1.0) < 1e-9, (
        f"Component weights must sum to 1.0, got {total_weight}. "
        f"Breakdown: C={WEIGHT_COVERAGE}, D={WEIGHT_DEPTH}, J={WEIGHT_JUDGMENT}, V={WEIGHT_VELOCITY}"
    )

    # Verify individual weights match specification
    assert WEIGHT_COVERAGE == 0.20, "Coverage weight should be 0.20"
    assert WEIGHT_DEPTH == 0.40, "Depth weight should be 0.40"
    assert WEIGHT_JUDGMENT == 0.25, "Judgment weight should be 0.25"
    assert WEIGHT_VELOCITY == 0.15, "Velocity weight should be 0.15"


def test_privacy_violation_detection():
    """Bonus test: Ensure PrivacyViolationError is raised if prompt_content detected."""
    now = datetime.now(timezone.utc)

    # Signal with forbidden field
    bad_signal = SignalEvent(
        source="code_review",
        occurred_at=now,
        org_id="org-1",
        team_id="team-1",
        role_id="user-1",
        signal_type="autocomplete",
        metadata={"prompt_content": "secret code"},  # FORBIDDEN
    )

    with pytest.raises(PrivacyViolationError, match="prompt_content"):
        calculate_depth([bad_signal], time_window_days=7)


def test_judgment_penalty_calculation():
    """Bonus test: Verify Judgment calculation with various Shadow AI counts."""
    # No Shadow AI: J = 1.0 * 1.0 = 1.0
    j1 = calculate_judgment(shadow_ai_count=0, policy_acknowledgment_rate=1.0)
    assert j1 == 1.0

    # 1 Shadow AI: J = (1.0 - 0.2) * 1.0 = 0.8
    j2 = calculate_judgment(shadow_ai_count=1, policy_acknowledgment_rate=1.0)
    assert j2 == 0.8

    # 5 Shadow AI: J = (1.0 - 1.0) * 1.0 = 0.0 (maxed out penalty)
    j3 = calculate_judgment(shadow_ai_count=5, policy_acknowledgment_rate=1.0)
    assert j3 == 0.0

    # 3 Shadow AI + 50% policy: J = (1.0 - 0.6) * 0.5 = 0.2
    j4 = calculate_judgment(shadow_ai_count=3, policy_acknowledgment_rate=0.5)
    assert abs(j4 - 0.2) < 1e-9
