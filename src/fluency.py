"""Fluency dimension scoring for executive-safe aggregation."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


Dimension = Literal["coverage", "depth", "judgment", "velocity"]


@dataclass(frozen=True)
class FluencyInputs:
    coverage_percent: float
    concentration_index: float
    usage_habitual_percent: float
    assessment_delta_percent: float
    everboarding_touch_rate: float


@dataclass(frozen=True)
class DimensionScores:
    coverage: float
    depth: float
    judgment: float
    velocity: float


@dataclass(frozen=True)
class FluencyWeights:
    coverage: float = 0.25
    depth: float = 0.25
    judgment: float = 0.25
    velocity: float = 0.25


def _clamp_score(value: float) -> float:
    return max(0.0, min(100.0, value))


def normalize_dimension_scores(inputs: FluencyInputs) -> DimensionScores:
    coverage = _clamp_score(inputs.coverage_percent * 100)
    depth = _clamp_score(inputs.usage_habitual_percent * (1.0 - inputs.concentration_index) * 100)
    judgment = _clamp_score(inputs.assessment_delta_percent * 100)
    velocity = _clamp_score(inputs.everboarding_touch_rate * 100)
    return DimensionScores(
        coverage=coverage,
        depth=depth,
        judgment=judgment,
        velocity=velocity,
    )


def weighted_fluency_score(scores: DimensionScores, weights: FluencyWeights) -> float:
    total_weight = weights.coverage + weights.depth + weights.judgment + weights.velocity
    if total_weight <= 0:
        raise ValueError("Weights must be positive")
    raw = (
        scores.coverage * weights.coverage
        + scores.depth * weights.depth
        + scores.judgment * weights.judgment
        + scores.velocity * weights.velocity
    )
    return _clamp_score(raw / total_weight)
