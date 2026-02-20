"""
FluencyTracr V1 Confidence & Signal Layer.

Governs when behavioural signals may surface and when they must be suppressed.
All rules are non-tunable and fixed at V1 spec values.

Governance principles (non-negotiable):
  AMBIGUITY DOCTRINE — prefer suppression over additional data collection.
  ANTI-SURVEILLANCE  — individual-level attribution is forbidden.

Public surface
--------------
  EpisodeSchema       Typed episode with ambiguity state.
  AmbiguityStatus     CLEAR | AMBIGUOUS
  ClosureReason       Known episode closure codes.
  SurfacingDecision   SUPPRESS | SURFACE + reason code.
  evaluate_episode    Main entry point — returns SurfacingDecision.
  is_out_of_scope     Guard for forbidden request types.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Collection, Optional


# ---------------------------------------------------------------------------
# Fixed V1 parameters (non-tunable — any attempt to override is ignored)
# ---------------------------------------------------------------------------

_OBSERVATION_WINDOW_DAYS: int = 30  # spec: "observation window is under 30 days → SUPPRESS"
_SURFACING_WINDOW_DAYS: int = 30    # identical to observation window in V1
_MIN_SIGNAL_CLASSES: int = 2        # spec: "at least two distinct behavioral signal classes"


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------

class AmbiguityStatus(Enum):
    CLEAR = auto()
    AMBIGUOUS = auto()


class ClosureReason(Enum):
    COMPLETED = "completed"
    INACTIVITY = "inactivity"
    CONFLICT = "conflict"      # conflicting signals detected
    INCOMPLETE = "incomplete"
    TIMEOUT = "timeout"


class SurfacingDecision(Enum):
    SUPPRESS = "SUPPRESS"
    SURFACE = "SURFACE"


class SuppressReason(Enum):
    INSUFFICIENT_TIME = "INSUFFICIENT_TIME"
    AMBIGUOUS_EPISODE = "AMBIGUOUS_EPISODE"
    INSUFFICIENT_SIGNAL_CLASSES = "INSUFFICIENT_SIGNAL_CLASSES"
    LOW_VOLUME = "LOW_VOLUME"
    SEASONAL_ANOMALY = "SEASONAL_ANOMALY"
    PRIVACY_LEAKAGE_RISK = "PRIVACY_LEAKAGE_RISK"
    DEFAULT_SUPPRESS = "DEFAULT_SUPPRESS"


# ---------------------------------------------------------------------------
# Schema models
# ---------------------------------------------------------------------------

@dataclass
class AmbiguityState:
    """
    Ambiguity assessment for a single episode.

    status      CLEAR or AMBIGUOUS.
    reason_code Human-readable code explaining why AMBIGUOUS was set, or
                None when status is CLEAR.
    """
    status: AmbiguityStatus
    reason_code: Optional[str] = None


@dataclass
class EpisodeSchema:
    """
    Typed representation of a task episode.

    Iteration depth is NOT stored here — it is derived at evaluation time
    from follow_up_count relative to the function baseline (spec requirement).
    """
    episode_id: str
    function_id: str
    role_class: str
    start_ts: str                         # ISO-8601
    end_ts: Optional[str] = None          # None if still open
    closure_reason: Optional[ClosureReason] = None
    ambiguity_state: AmbiguityState = field(
        default_factory=lambda: AmbiguityState(status=AmbiguityStatus.CLEAR)
    )
    follow_up_count: int = 0
    observation_days: int = 0
    signal_classes: Collection[str] = field(default_factory=list)
    verification_present: bool = False    # human-initiated only
    latency_zero_role_classes: Collection[str] = field(default_factory=list)
    low_volume: bool = False              # true when observation count is below minimum
    seasonal_anomaly: bool = False        # true when period falls in known anomaly window
    privacy_leakage_risk: bool = False    # true when de-anonymisation risk detected


@dataclass
class GatingResult:
    """Result of the full V1 confidence gating sequence."""
    decision: SurfacingDecision
    reason: Optional[SuppressReason] = None

    @property
    def suppressed(self) -> bool:
        return self.decision is SurfacingDecision.SUPPRESS


# ---------------------------------------------------------------------------
# Iteration depth (derived, never stored)
# ---------------------------------------------------------------------------

class IterationDepth(Enum):
    NONE = "none"
    LIGHT = "light"
    HEAVY = "heavy"


def derive_iteration_depth(follow_up_count: int, baseline: int = 1) -> IterationDepth:
    """
    Classify iteration depth from follow-up turn counts relative to baseline.

    Per spec: this label MUST NOT be stored as a persistent field.
    Ranges:
        0          → NONE
        1–baseline → LIGHT
        >baseline  → HEAVY
    """
    if follow_up_count == 0:
        return IterationDepth.NONE
    if follow_up_count <= baseline:
        return IterationDepth.LIGHT
    return IterationDepth.HEAVY


# ---------------------------------------------------------------------------
# Ambiguity detection
# ---------------------------------------------------------------------------

def detect_ambiguity(episode: EpisodeSchema) -> AmbiguityState:
    """
    Detect ambiguity triggers for an episode.

    Triggers:
      - closure_reason is INACTIVITY
      - closure_reason is CONFLICT
      - episode is still open (no end_ts, no closure_reason)

    When AMBIGUOUS, ALL derived signals from this episode are suppressed
    (latency, disposition, ghost-use detection, convergence inputs).
    """
    if episode.closure_reason in (ClosureReason.INACTIVITY, ClosureReason.CONFLICT):
        return AmbiguityState(
            status=AmbiguityStatus.AMBIGUOUS,
            reason_code=episode.closure_reason.value,
        )
    if episode.end_ts is None and episode.closure_reason is None:
        return AmbiguityState(
            status=AmbiguityStatus.AMBIGUOUS,
            reason_code="open_episode",
        )
    return AmbiguityState(status=AmbiguityStatus.CLEAR)


# ---------------------------------------------------------------------------
# Confidence gating sequence (V1)
# ---------------------------------------------------------------------------

def _gate_observation_window(observation_days: int) -> Optional[GatingResult]:
    """Gate 1: observation window must meet the 30-day minimum."""
    if observation_days < _OBSERVATION_WINDOW_DAYS:
        return GatingResult(
            decision=SurfacingDecision.SUPPRESS,
            reason=SuppressReason.INSUFFICIENT_TIME,
        )
    return None


def _gate_ambiguity(ambiguity_state: AmbiguityState) -> Optional[GatingResult]:
    """Gate 2: ambiguous episodes are fully suppressed."""
    if ambiguity_state.status is AmbiguityStatus.AMBIGUOUS:
        return GatingResult(
            decision=SurfacingDecision.SUPPRESS,
            reason=SuppressReason.AMBIGUOUS_EPISODE,
        )
    return None


def _gate_signal_classes(signal_classes: Collection[str]) -> Optional[GatingResult]:
    """Gate 3: at least two distinct signal classes must be present."""
    distinct = set(signal_classes)
    if len(distinct) < _MIN_SIGNAL_CLASSES:
        return GatingResult(
            decision=SurfacingDecision.SUPPRESS,
            reason=SuppressReason.INSUFFICIENT_SIGNAL_CLASSES,
        )
    return None


def _gate_low_volume(low_volume: bool) -> Optional[GatingResult]:
    """Gate 4: suppress when observation volume is below minimum."""
    if low_volume:
        return GatingResult(
            decision=SurfacingDecision.SUPPRESS,
            reason=SuppressReason.LOW_VOLUME,
        )
    return None


def _gate_seasonal_anomaly(seasonal_anomaly: bool) -> Optional[GatingResult]:
    """Gate 5: suppress when the observation period falls in a seasonal anomaly window."""
    if seasonal_anomaly:
        return GatingResult(
            decision=SurfacingDecision.SUPPRESS,
            reason=SuppressReason.SEASONAL_ANOMALY,
        )
    return None


def _gate_privacy_leakage(privacy_leakage_risk: bool) -> Optional[GatingResult]:
    """Gate 6: suppress when de-anonymisation risk is detected (anti-surveillance doctrine)."""
    if privacy_leakage_risk:
        return GatingResult(
            decision=SurfacingDecision.SUPPRESS,
            reason=SuppressReason.PRIVACY_LEAKAGE_RISK,
        )
    return None


def evaluate_episode(episode: EpisodeSchema) -> GatingResult:
    """
    Run the V1 confidence gating sequence on a single episode.

    The gating sequence is applied in order; the first failure wins.
    Default state is SUPPRESS — episodes must pass all gates to SURFACE.

    Latency contribution is zero for episodes with AMBIGUOUS state
    and for configured zero-latency role classes (enforced by callers
    consuming the GatingResult).

    Returns GatingResult with decision SUPPRESS or SURFACE.
    """
    # Re-run ambiguity detection to ensure consistency; caller-supplied
    # ambiguity_state is overridden with the authoritative computed value.
    authoritative_ambiguity = detect_ambiguity(episode)

    for gate_fn, args in [
        (_gate_observation_window, (episode.observation_days,)),
        (_gate_ambiguity, (authoritative_ambiguity,)),
        (_gate_signal_classes, (episode.signal_classes,)),
        (_gate_low_volume, (episode.low_volume,)),
        (_gate_seasonal_anomaly, (episode.seasonal_anomaly,)),
        (_gate_privacy_leakage, (episode.privacy_leakage_risk,)),
    ]:
        result = gate_fn(*args)  # type: ignore[arg-type]
        if result is not None:
            return result

    return GatingResult(decision=SurfacingDecision.SURFACE)


# ---------------------------------------------------------------------------
# Verification helper
# ---------------------------------------------------------------------------

def record_verification(human_initiated: bool) -> bool:
    """
    Return verification presence.

    Automated retries do NOT count — only human-initiated interactions
    set verification to True.  This is intentionally a thin wrapper to
    make the governance invariant explicit and testable.
    """
    return bool(human_initiated)


# ---------------------------------------------------------------------------
# Out-of-scope guard (anti-surveillance)
# ---------------------------------------------------------------------------

_OUT_OF_SCOPE_KEYWORDS = frozenset({
    "individual",
    "per_user",
    "per-user",
    "productivity_score",
    "productivity-score",
    "recommendation",
    "content_inspection",
    "content-inspection",
    "closed_loop",
    "closed-loop",
    "tunable_threshold",
    "tunable-threshold",
})


def is_out_of_scope(request_description: str) -> bool:
    """
    Return True when a request description matches out-of-scope patterns.

    Out-of-scope: individual-level metrics, productivity scoring,
    content inspection, tunable thresholds, closed-loop automation,
    or individual recommendations.
    """
    lower = request_description.lower()
    return any(kw in lower for kw in _OUT_OF_SCOPE_KEYWORDS)
