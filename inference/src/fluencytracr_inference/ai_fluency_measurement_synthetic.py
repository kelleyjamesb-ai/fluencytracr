"""Seeded synthetic ordinal evidence for the frozen AI Fluency long form."""

from __future__ import annotations

from dataclasses import dataclass
import math

import numpy as np

from .ai_fluency_measurement_evidence import (
    APPROVED_SYNTHETIC_GENERATOR_ID,
    APPROVED_SYNTHETIC_GENERATOR_VERSION,
    APPROVED_SYNTHETIC_SCENARIOS,
    APPROVED_OWNER_REVIEW_STATE,
    APPROVED_PRIVACY_REVIEW_STATE,
    AggregateMeasurementPackage,
    AggregateMeasurementWave,
    ItemCategoryCounts,
    PairCategoryCounts,
    SYNTHETIC_COHORT_KEY,
    blocked_output_authorizations,
    validate_measurement_package,
)
from .ai_fluency_measurement_manifest import (
    CONSTRUCT_IDS,
    CORE_CONSTRUCT_IDS,
    manifest_construct_items,
    manifest_item_ids,
    manifest_pair_ids,
    measurement_manifest_hash,
)
from .hashing import sha256_json


MEASUREMENT_SYNTHETIC_GENERATOR_ID = APPROVED_SYNTHETIC_GENERATOR_ID
MEASUREMENT_SYNTHETIC_GENERATOR_VERSION = APPROVED_SYNTHETIC_GENERATOR_VERSION
MEASUREMENT_SYNTHETIC_SAMPLE_SIZE = 800
MEASUREMENT_SYNTHETIC_SCENARIOS = APPROVED_SYNTHETIC_SCENARIOS
MAX_JAVASCRIPT_SAFE_INTEGER = 9_007_199_254_740_991

_BASE_LOADINGS = np.asarray(
    [
        0.78,
        0.74,
        0.82,
        0.76,
        0.80,
        0.72,
        0.79,
        0.75,
        0.81,
        0.73,
        0.77,
        0.70,
        0.80,
        0.76,
        0.83,
        0.77,
        0.73,
        0.79,
        0.75,
        0.81,
        0.74,
        0.78,
        0.72,
        0.80,
    ],
    dtype=float,
)
_SECOND_ORDER_LOADINGS = np.asarray([0.78, 0.74, 0.76, 0.70, 0.80], dtype=float)
_BASE_THRESHOLDS = np.asarray([-1.25, -0.40, 0.35, 1.15], dtype=float)
_LATENT_SHIFT_CONSTRUCT_MEANS = np.asarray(
    [0.35, 0.30, 0.32, 0.25, 0.38, 0.20, 0.28, 0.25], dtype=float
)


class MeasurementSyntheticError(ValueError):
    """Synthetic measurement scenario or seed is invalid."""


@dataclass(frozen=True)
class MeasurementSyntheticTruth:
    scenario: str
    baseline_loadings: tuple[float, ...]
    followup_loadings: tuple[float, ...]
    baseline_thresholds: tuple[tuple[float, ...], ...]
    followup_thresholds: tuple[tuple[float, ...], ...]
    second_order_loadings: tuple[float, ...]
    followup_construct_means: tuple[float, ...]
    loading_drift_item_id: str | None
    threshold_drift_item_id: str | None


@dataclass(frozen=True)
class MeasurementSyntheticCase:
    package: AggregateMeasurementPackage
    truth: MeasurementSyntheticTruth


def _validate_seed(seed: object) -> int:
    if isinstance(seed, bool) or not isinstance(seed, int):
        raise MeasurementSyntheticError("seed must be an integer")
    if seed < 0 or seed > MAX_JAVASCRIPT_SAFE_INTEGER:
        raise MeasurementSyntheticError("seed must be a nonnegative JavaScript-safe integer")
    return seed


def _validate_sample_size(sample_size: object) -> int:
    if isinstance(sample_size, bool) or not isinstance(sample_size, int):
        raise MeasurementSyntheticError("sample_size must be an integer")
    if sample_size < 20:
        raise MeasurementSyntheticError("sample_size must pass the aggregate floor")
    return sample_size


def _item_construct_indexes() -> np.ndarray:
    construct_items = manifest_construct_items()
    construct_by_item = {
        item_id: construct_index
        for construct_index, construct_id in enumerate(CONSTRUCT_IDS)
        for item_id in construct_items[construct_id]
    }
    return np.asarray(
        [construct_by_item[item_id] for item_id in manifest_item_ids()], dtype=int
    )


def _threshold_matrix() -> np.ndarray:
    offsets = np.asarray(
        [((item_index % 3) - 1) * 0.08 for item_index in range(24)], dtype=float
    )
    return _BASE_THRESHOLDS[None, :] + offsets[:, None]


def _scenario_parameters(scenario: str) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    if scenario not in MEASUREMENT_SYNTHETIC_SCENARIOS:
        raise MeasurementSyntheticError(
            "scenario is not in the compiled synthetic measurement plan"
        )
    baseline_loadings = _BASE_LOADINGS.copy()
    followup_loadings = _BASE_LOADINGS.copy()
    baseline_thresholds = _threshold_matrix()
    followup_thresholds = baseline_thresholds.copy()
    if scenario == "loading_drift":
        followup_loadings[1] = 0.48
    elif scenario == "threshold_drift":
        followup_thresholds[9, :] += 0.65
    return (
        baseline_loadings,
        followup_loadings,
        baseline_thresholds,
        followup_thresholds,
    )


def _followup_construct_means(scenario: str) -> np.ndarray:
    if scenario == "invariant_latent_shift":
        return _LATENT_SHIFT_CONSTRUCT_MEANS.copy()
    return np.zeros(len(CONSTRUCT_IDS), dtype=float)


def _draw_factor_scores(
    rng: np.random.Generator,
    sample_size: int,
    construct_means: np.ndarray,
) -> np.ndarray:
    second_order = rng.normal(size=sample_size)
    factors = np.empty((sample_size, len(CONSTRUCT_IDS)), dtype=float)
    for index, loading in enumerate(_SECOND_ORDER_LOADINGS):
        factors[:, index] = (
            loading * second_order
            + math.sqrt(1.0 - loading**2) * rng.normal(size=sample_size)
        )
    for offset in range(len(CORE_CONSTRUCT_IDS), len(CONSTRUCT_IDS)):
        factors[:, offset] = rng.normal(size=sample_size)
    return factors + construct_means[None, :]


def _draw_wave_responses(
    rng: np.random.Generator,
    *,
    sample_size: int,
    loadings: np.ndarray,
    thresholds: np.ndarray,
    construct_means: np.ndarray,
) -> np.ndarray:
    factors = _draw_factor_scores(rng, sample_size, construct_means)
    construct_indexes = _item_construct_indexes()
    responses = np.empty((sample_size, len(loadings)), dtype=np.int8)
    for item_index, loading in enumerate(loadings):
        latent = (
            loading * factors[:, construct_indexes[item_index]]
            + math.sqrt(1.0 - loading**2) * rng.normal(size=sample_size)
        )
        responses[:, item_index] = np.digitize(
            latent, thresholds[item_index], right=False
        ) + 1
    return responses


def _aggregate_wave(
    responses: np.ndarray,
    *,
    seed: int,
    scenario: str,
    wave_role: str,
) -> AggregateMeasurementWave:
    item_ids = manifest_item_ids()
    response_count = int(responses.shape[0])
    items = tuple(
        ItemCategoryCounts(
            item_id=item_id,
            category_counts=tuple(
                int(np.count_nonzero(responses[:, item_index] == category))
                for category in range(1, 6)
            ),
            observed_count=response_count,
            missing_count=0,
        )
        for item_index, item_id in enumerate(item_ids)
    )
    item_index_by_id = {item_id: index for index, item_id in enumerate(item_ids)}
    pairs = []
    for left_item_id, right_item_id in manifest_pair_ids():
        left = responses[:, item_index_by_id[left_item_id]]
        right = responses[:, item_index_by_id[right_item_id]]
        table = tuple(
            tuple(
                int(np.count_nonzero((left == left_category) & (right == right_category)))
                for right_category in range(1, 6)
            )
            for left_category in range(1, 6)
        )
        pairs.append(
            PairCategoryCounts(
                left_item_id=left_item_id,
                right_item_id=right_item_id,
                cell_counts=table,
                observed_pair_count=response_count,
                missing_pair_count=0,
            )
        )
    is_baseline = wave_role == "baseline"
    wave_id = "wave-baseline" if is_baseline else "wave-formal-followup"
    window_start = "2026-01-01" if is_baseline else "2026-04-01"
    window_end = "2026-01-31" if is_baseline else "2026-04-30"
    source_ref = f"synthetic://ai-fluency/{scenario}/{wave_role}/{seed}"
    generator_binding_hash = sha256_json(
        {
            "generator_id": MEASUREMENT_SYNTHETIC_GENERATOR_ID,
            "generator_version": MEASUREMENT_SYNTHETIC_GENERATOR_VERSION,
            "scenario": scenario,
            "seed": seed,
            "form_id": "ai_fluency_long_v1",
            "manifest_hash": measurement_manifest_hash(),
            "response_count": response_count,
        }
    )
    aggregate_counts_hash = sha256_json(
        {
            "items": [item.to_dict() for item in items],
            "pairs": [pair.to_dict() for pair in pairs],
        }
    )
    source_hash = sha256_json(
        {
            "generator_binding_hash": generator_binding_hash,
            "wave_role": wave_role,
            "aggregate_counts_hash": aggregate_counts_hash,
        }
    )
    return AggregateMeasurementWave(
        manifest_hash=measurement_manifest_hash(),
        wave_id=wave_id,
        wave_role=wave_role,
        window_start=window_start,
        window_end=window_end,
        source_ref=source_ref,
        source_hash=source_hash,
        cohort_key=SYNTHETIC_COHORT_KEY,
        eligible_population_count=response_count,
        response_count=response_count,
        owner_review_state=APPROVED_OWNER_REVIEW_STATE,
        privacy_review_state=APPROVED_PRIVACY_REVIEW_STATE,
        synthetic_scenario=scenario,
        synthetic_generator_id=MEASUREMENT_SYNTHETIC_GENERATOR_ID,
        synthetic_generator_version=MEASUREMENT_SYNTHETIC_GENERATOR_VERSION,
        synthetic_generator_seed=seed,
        generator_binding_hash=generator_binding_hash,
        items=items,
        pairs=tuple(pairs),
    )


def generate_measurement_synthetic_case(
    *,
    seed: int,
    scenario: str = "invariant",
    sample_size: int = MEASUREMENT_SYNTHETIC_SAMPLE_SIZE,
) -> MeasurementSyntheticCase:
    """Generate independent baseline/follow-up rows, then discard them after aggregation."""

    validated_seed = _validate_seed(seed)
    validated_size = _validate_sample_size(sample_size)
    (
        baseline_loadings,
        followup_loadings,
        baseline_thresholds,
        followup_thresholds,
    ) = _scenario_parameters(scenario)
    followup_construct_means = _followup_construct_means(scenario)
    seed_sequence = np.random.SeedSequence(validated_seed)
    baseline_seed, followup_seed = seed_sequence.spawn(2)
    baseline_responses = _draw_wave_responses(
        np.random.default_rng(baseline_seed),
        sample_size=validated_size,
        loadings=baseline_loadings,
        thresholds=baseline_thresholds,
        construct_means=np.zeros(len(CONSTRUCT_IDS), dtype=float),
    )
    followup_responses = _draw_wave_responses(
        np.random.default_rng(followup_seed),
        sample_size=validated_size,
        loadings=followup_loadings,
        thresholds=followup_thresholds,
        construct_means=followup_construct_means,
    )
    baseline_wave = _aggregate_wave(
        baseline_responses,
        seed=validated_seed,
        scenario=scenario,
        wave_role="baseline",
    )
    followup_wave = _aggregate_wave(
        followup_responses,
        seed=validated_seed,
        scenario=scenario,
        wave_role="formal_followup",
    )
    package = AggregateMeasurementPackage(
        package_id=f"synthetic-measurement-{scenario}-{validated_seed}",
        manifest_hash=measurement_manifest_hash(),
        cohort_key=SYNTHETIC_COHORT_KEY,
        waves=(baseline_wave, followup_wave),
        output_authorizations=blocked_output_authorizations(),
    )
    validate_measurement_package(package)
    truth = MeasurementSyntheticTruth(
        scenario=scenario,
        baseline_loadings=tuple(float(value) for value in baseline_loadings),
        followup_loadings=tuple(float(value) for value in followup_loadings),
        baseline_thresholds=tuple(
            tuple(float(value) for value in row) for row in baseline_thresholds
        ),
        followup_thresholds=tuple(
            tuple(float(value) for value in row) for row in followup_thresholds
        ),
        second_order_loadings=tuple(float(value) for value in _SECOND_ORDER_LOADINGS),
        followup_construct_means=tuple(float(value) for value in followup_construct_means),
        loading_drift_item_id="ai-fluency-q02" if scenario == "loading_drift" else None,
        threshold_drift_item_id="ai-fluency-q10" if scenario == "threshold_drift" else None,
    )
    return MeasurementSyntheticCase(package=package, truth=truth)
