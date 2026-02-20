"""
Tests for the FluencyTracr V1 Confidence & Signal Layer.

Covers all scenarios from the spec:
- Episode schema with ambiguity state
- Ambiguity detection: inactivity, conflicting signals, open episode
- Ambiguous episode suppresses all signals
- Single-class observations suppress surfacing
- Iteration depth derived at evaluation time (not stored)
- Latency excluded for ambiguous episodes
- Verification: human-initiated only, automated retries do not count
- Confidence gating: INSUFFICIENT_TIME, AMBIGUOUS_EPISODE, INSUFFICIENT_SIGNAL_CLASSES
- Default SUPPRESS state
- Out-of-scope request guard (anti-surveillance)
"""

import pytest
from src.fluencytracr_signal import (
    AmbiguityState,
    AmbiguityStatus,
    ClosureReason,
    EpisodeSchema,
    GatingResult,
    IterationDepth,
    SuppressReason,
    SurfacingDecision,
    detect_ambiguity,
    derive_iteration_depth,
    evaluate_episode,
    is_out_of_scope,
    record_verification,
    _OBSERVATION_WINDOW_DAYS,
    _MIN_SIGNAL_CLASSES,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_episode(**kwargs) -> EpisodeSchema:
    """Build a minimal valid (SURFACE-ready) episode, overriding with kwargs."""
    defaults = dict(
        episode_id="ep-001",
        function_id="fn-123",
        role_class="contributor",
        start_ts="2026-01-01T00:00:00Z",
        end_ts="2026-02-15T00:00:00Z",
        closure_reason=ClosureReason.COMPLETED,
        observation_days=_OBSERVATION_WINDOW_DAYS,
        signal_classes=["latency", "disposition"],
    )
    defaults.update(kwargs)
    return EpisodeSchema(**defaults)


# ---------------------------------------------------------------------------
# Spec: Episode schema
# ---------------------------------------------------------------------------

class TestEpisodeSchema:
    def test_required_fields_present(self):
        ep = _make_episode()
        assert ep.episode_id
        assert ep.function_id
        assert ep.role_class
        assert ep.start_ts
        assert ep.closure_reason is not None
        assert isinstance(ep.ambiguity_state, AmbiguityState)

    def test_default_ambiguity_is_clear(self):
        ep = EpisodeSchema(
            episode_id="x",
            function_id="f",
            role_class="r",
            start_ts="2026-01-01T00:00:00Z",
        )
        assert ep.ambiguity_state.status is AmbiguityStatus.CLEAR
        assert ep.ambiguity_state.reason_code is None

    def test_iteration_depth_not_stored(self):
        """Iteration depth must not exist as a persistent field."""
        ep = _make_episode()
        assert not hasattr(ep, "iteration_depth"), (
            "iteration_depth must not be stored on EpisodeSchema"
        )


# ---------------------------------------------------------------------------
# Spec: Iteration depth derived at evaluation time
# ---------------------------------------------------------------------------

class TestIterationDepth:
    def test_zero_followups_is_none(self):
        assert derive_iteration_depth(0) is IterationDepth.NONE

    def test_one_followup_at_baseline_is_light(self):
        assert derive_iteration_depth(1, baseline=1) is IterationDepth.LIGHT

    def test_above_baseline_is_heavy(self):
        assert derive_iteration_depth(5, baseline=2) is IterationDepth.HEAVY

    def test_at_baseline_is_light(self):
        assert derive_iteration_depth(3, baseline=3) is IterationDepth.LIGHT

    def test_result_is_not_stored(self):
        """Calling derive_iteration_depth should not mutate the episode."""
        ep = _make_episode(follow_up_count=3)
        _ = derive_iteration_depth(ep.follow_up_count)
        assert not hasattr(ep, "iteration_depth")


# ---------------------------------------------------------------------------
# Spec: Ambiguity detection
# ---------------------------------------------------------------------------

class TestAmbiguityDetection:
    def test_inactivity_triggers_ambiguity(self):
        ep = _make_episode(closure_reason=ClosureReason.INACTIVITY)
        state = detect_ambiguity(ep)
        assert state.status is AmbiguityStatus.AMBIGUOUS
        assert state.reason_code == "inactivity"

    def test_conflict_triggers_ambiguity(self):
        ep = _make_episode(closure_reason=ClosureReason.CONFLICT)
        state = detect_ambiguity(ep)
        assert state.status is AmbiguityStatus.AMBIGUOUS
        assert state.reason_code == "conflict"

    def test_open_episode_triggers_ambiguity(self):
        ep = _make_episode(end_ts=None, closure_reason=None)
        state = detect_ambiguity(ep)
        assert state.status is AmbiguityStatus.AMBIGUOUS
        assert state.reason_code == "open_episode"

    def test_completed_episode_is_clear(self):
        ep = _make_episode(closure_reason=ClosureReason.COMPLETED)
        state = detect_ambiguity(ep)
        assert state.status is AmbiguityStatus.CLEAR


# ---------------------------------------------------------------------------
# Spec: Ambiguous episode suppresses all signals
# ---------------------------------------------------------------------------

class TestAmbiguousEpisodeSuppression:
    def test_inactivity_suppresses(self):
        ep = _make_episode(closure_reason=ClosureReason.INACTIVITY)
        result = evaluate_episode(ep)
        assert result.decision is SurfacingDecision.SUPPRESS
        assert result.reason is SuppressReason.AMBIGUOUS_EPISODE

    def test_conflict_suppresses(self):
        ep = _make_episode(closure_reason=ClosureReason.CONFLICT)
        result = evaluate_episode(ep)
        assert result.suppressed
        assert result.reason is SuppressReason.AMBIGUOUS_EPISODE

    def test_open_episode_suppresses(self):
        ep = _make_episode(end_ts=None, closure_reason=None)
        result = evaluate_episode(ep)
        assert result.suppressed
        assert result.reason is SuppressReason.AMBIGUOUS_EPISODE

    def test_latency_not_counted_for_ambiguous(self):
        """
        Spec: latency does not contribute to any surfacing decision when AMBIGUOUS.
        Verified here by confirming the episode is suppressed before any
        latency contribution could be applied.
        """
        ep = _make_episode(
            closure_reason=ClosureReason.INACTIVITY,
            signal_classes=["latency", "disposition"],
        )
        result = evaluate_episode(ep)
        assert result.suppressed, (
            "Latency contribution is irrelevant — episode suppressed at ambiguity gate"
        )


# ---------------------------------------------------------------------------
# Spec: Observation window gate
# ---------------------------------------------------------------------------

class TestObservationWindowGate:
    def test_under_30_days_suppresses(self):
        ep = _make_episode(observation_days=29)
        result = evaluate_episode(ep)
        assert result.suppressed
        assert result.reason is SuppressReason.INSUFFICIENT_TIME

    def test_zero_days_suppresses(self):
        ep = _make_episode(observation_days=0)
        result = evaluate_episode(ep)
        assert result.reason is SuppressReason.INSUFFICIENT_TIME

    def test_exactly_30_days_passes_window_gate(self):
        ep = _make_episode(observation_days=30)
        result = evaluate_episode(ep)
        # May still suppress for other reasons; window gate must not fire
        assert result.reason is not SuppressReason.INSUFFICIENT_TIME

    def test_observation_window_is_non_tunable(self):
        """The 30-day window must be a fixed constant, not read from config."""
        assert _OBSERVATION_WINDOW_DAYS == 30


# ---------------------------------------------------------------------------
# Spec: Signal class gating
# ---------------------------------------------------------------------------

class TestSignalClassGating:
    def test_single_class_suppresses(self):
        ep = _make_episode(signal_classes=["latency"])
        result = evaluate_episode(ep)
        assert result.suppressed
        assert result.reason is SuppressReason.INSUFFICIENT_SIGNAL_CLASSES

    def test_empty_classes_suppresses(self):
        ep = _make_episode(signal_classes=[])
        result = evaluate_episode(ep)
        assert result.suppressed

    def test_two_distinct_classes_passes_gate(self):
        ep = _make_episode(signal_classes=["latency", "disposition"])
        result = evaluate_episode(ep)
        assert result.reason is not SuppressReason.INSUFFICIENT_SIGNAL_CLASSES

    def test_duplicate_class_counts_as_one(self):
        ep = _make_episode(signal_classes=["latency", "latency"])
        result = evaluate_episode(ep)
        assert result.suppressed
        assert result.reason is SuppressReason.INSUFFICIENT_SIGNAL_CLASSES

    def test_min_signal_classes_constant(self):
        assert _MIN_SIGNAL_CLASSES == 2


# ---------------------------------------------------------------------------
# Spec: Default SUPPRESS state and passing all gates
# ---------------------------------------------------------------------------

class TestDefaultSuppressAndSurface:
    def test_default_state_is_suppress(self):
        """An open episode with no observation days defaults to SUPPRESS."""
        ep = EpisodeSchema(
            episode_id="x",
            function_id="f",
            role_class="r",
            start_ts="2026-01-01T00:00:00Z",
        )
        result = evaluate_episode(ep)
        assert result.suppressed

    def test_all_gates_passed_surfaces(self):
        ep = _make_episode(
            closure_reason=ClosureReason.COMPLETED,
            observation_days=30,
            signal_classes=["latency", "disposition"],
        )
        result = evaluate_episode(ep)
        assert result.decision is SurfacingDecision.SURFACE
        assert result.reason is None


# ---------------------------------------------------------------------------
# Spec: Verification — human-initiated only
# ---------------------------------------------------------------------------

class TestVerification:
    def test_human_initiated_sets_verification(self):
        assert record_verification(human_initiated=True) is True

    def test_automated_retry_does_not_count(self):
        assert record_verification(human_initiated=False) is False

    def test_default_episode_has_no_verification(self):
        ep = _make_episode()
        assert ep.verification_present is False


# ---------------------------------------------------------------------------
# Spec: Out-of-scope guard (anti-surveillance + governance)
# ---------------------------------------------------------------------------

class TestOutOfScopeGuard:
    def test_individual_metrics_rejected(self):
        assert is_out_of_scope("compute individual productivity scores")

    def test_per_user_rejected(self):
        assert is_out_of_scope("per_user latency breakdown")

    def test_productivity_score_rejected(self):
        assert is_out_of_scope("generate productivity_score for each member")

    def test_recommendation_rejected(self):
        assert is_out_of_scope("produce a recommendation for each user")

    def test_content_inspection_rejected(self):
        assert is_out_of_scope("enable content_inspection on all sessions")

    def test_closed_loop_rejected(self):
        assert is_out_of_scope("trigger closed_loop automation")

    def test_tunable_threshold_rejected(self):
        assert is_out_of_scope("allow tunable_threshold overrides")

    def test_legitimate_aggregation_allowed(self):
        assert not is_out_of_scope("org-aggregate fluency coverage signal")

    def test_gating_evaluation_allowed(self):
        assert not is_out_of_scope("evaluate confidence gating for a function")


# ---------------------------------------------------------------------------
# Spec: Low-volume suppression (task 1.5)
# ---------------------------------------------------------------------------

class TestLowVolumeGate:
    def test_low_volume_suppresses(self):
        ep = _make_episode(low_volume=True)
        result = evaluate_episode(ep)
        assert result.suppressed
        assert result.reason is SuppressReason.LOW_VOLUME

    def test_sufficient_volume_passes(self):
        ep = _make_episode(low_volume=False)
        result = evaluate_episode(ep)
        assert result.decision is SurfacingDecision.SURFACE

    def test_low_volume_takes_precedence_over_signal_classes(self):
        """Low-volume gate fires even if signal classes would pass."""
        ep = _make_episode(
            signal_classes=["latency", "disposition", "verification"],
            low_volume=True,
        )
        result = evaluate_episode(ep)
        assert result.suppressed
        assert result.reason is SuppressReason.LOW_VOLUME


# ---------------------------------------------------------------------------
# Spec: Seasonal anomaly suppression (task 1.5)
# ---------------------------------------------------------------------------

class TestSeasonalAnomalyGate:
    def test_seasonal_anomaly_suppresses(self):
        ep = _make_episode(seasonal_anomaly=True)
        result = evaluate_episode(ep)
        assert result.suppressed
        assert result.reason is SuppressReason.SEASONAL_ANOMALY

    def test_no_anomaly_passes(self):
        ep = _make_episode(seasonal_anomaly=False)
        result = evaluate_episode(ep)
        assert result.decision is SurfacingDecision.SURFACE


# ---------------------------------------------------------------------------
# Spec: Privacy leakage suppression (task 1.5, anti-surveillance doctrine)
# ---------------------------------------------------------------------------

class TestPrivacyLeakageGate:
    def test_privacy_leakage_risk_suppresses(self):
        ep = _make_episode(privacy_leakage_risk=True)
        result = evaluate_episode(ep)
        assert result.suppressed
        assert result.reason is SuppressReason.PRIVACY_LEAKAGE_RISK

    def test_no_leakage_risk_passes(self):
        ep = _make_episode(privacy_leakage_risk=False)
        result = evaluate_episode(ep)
        assert result.decision is SurfacingDecision.SURFACE

    def test_all_six_gates_clear_surfaces(self):
        """All six gates must pass for SURFACE decision."""
        ep = _make_episode(
            closure_reason=ClosureReason.COMPLETED,
            observation_days=30,
            signal_classes=["latency", "disposition"],
            low_volume=False,
            seasonal_anomaly=False,
            privacy_leakage_risk=False,
        )
        result = evaluate_episode(ep)
        assert result.decision is SurfacingDecision.SURFACE
        assert result.reason is None
