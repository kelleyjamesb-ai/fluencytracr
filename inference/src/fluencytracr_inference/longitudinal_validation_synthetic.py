"""Deterministic synthetic cases for longitudinal state-space validation."""

from __future__ import annotations

from dataclasses import dataclass
import math

import numpy as np

from .hashing import sha256_json
from .longitudinal_synthetic import (
    synthetic_ai_fluency_snapshot,
    synthetic_hypothesis_plan,
)
from .longitudinal_types import (
    LongitudinalStructureError,
    LongitudinalSyntheticDataset,
    validate_longitudinal_dataset_structure,
    validate_longitudinal_seed,
)


LONGITUDINAL_VALIDATION_EFFECT_SIZES_SD = (0.0, 0.2, 0.5)
LONGITUDINAL_VALIDATION_PANEL_GROUP_COUNTS = (6, 12)
LONGITUDINAL_VALIDATION_PRE_WINDOW_COUNT = 12
LONGITUDINAL_VALIDATION_POST_WINDOW_COUNT = 6
LONGITUDINAL_VALIDATION_AR1_RHO = 0.45

_TOTAL_WINDOW_COUNT = (
    LONGITUDINAL_VALIDATION_PRE_WINDOW_COUNT
    + LONGITUDINAL_VALIDATION_POST_WINDOW_COUNT
)
_PANEL_GROUP_SCALE = 0.18
_AR1_INNOVATION_SCALE = 0.10
_KNOWN_AGGREGATE_SE = 0.08
_INTERCEPT = 1.50
_TIME_COEFFICIENT = 0.08
_FLUENCY_COEFFICIENT = 0.05
_CONTROL_COEFFICIENTS = (0.07, -0.05)
_VELOCITY_MOVEMENT_WEIGHT = 0.55
_BREADTH_MOVEMENT_WEIGHT = 0.45
_EFFECT_CALIBRATION_ITERATIONS = 80


@dataclass(frozen=True)
class LongitudinalValidationTruth:
    """Synthetic DGP truth kept separate from the governed model input."""

    requested_effect_size_sd: float
    realized_effect_size_sd: float
    pre_period_outcome_sd: float
    evaluation_movement_outcome_units: float
    fixed_effects: tuple[tuple[str, float], ...]
    panel_group_effects: tuple[float, ...]
    panel_group_scale: float
    ar1_innovation_scale: float
    ar1_rho: float
    ar1_initial_stationary_sd: float
    known_aggregate_se: float
    evaluation_window_refs: tuple[str, ...]
    random_effect_generation: str = "zero_sum_centered_panel_groups"
    ar1_initialization: str = "stationary"
    depth_context_only: bool = True

    @property
    def effect_size_sd(self) -> float:
        return self.requested_effect_size_sd

    def fixed_effect_by_name(self) -> dict[str, float]:
        return dict(self.fixed_effects)


@dataclass(frozen=True, eq=False)
class LongitudinalValidationCase:
    """Governed model input paired with its external synthetic truth sidecar."""

    dataset: LongitudinalSyntheticDataset
    truth: LongitudinalValidationTruth

    @property
    def truth_sidecar(self) -> LongitudinalValidationTruth:
        return self.truth

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, LongitudinalValidationCase):
            return NotImplemented
        return (
            self.truth == other.truth
            and self.dataset.synthetic_input_hash()
            == other.dataset.synthetic_input_hash()
        )


def _synthetic_source_hash(label: str) -> str:
    return sha256_json({"synthetic_source_ref": label})


def _validate_effect_size(effect_size_sd: object) -> float:
    if isinstance(effect_size_sd, (bool, np.bool_)) or not isinstance(
        effect_size_sd,
        (int, float, np.integer, np.floating),
    ):
        raise LongitudinalStructureError(
            "effect_size_sd must be one of 0.0, 0.2, or 0.5"
        )
    value = float(effect_size_sd)
    if not math.isfinite(value) or value not in LONGITUDINAL_VALIDATION_EFFECT_SIZES_SD:
        raise LongitudinalStructureError(
            "effect_size_sd must be one of 0.0, 0.2, or 0.5"
        )
    return value


def _validate_panel_group_count(panel_group_count: object) -> int:
    if (
        isinstance(panel_group_count, (bool, np.bool_))
        or not isinstance(panel_group_count, int)
        or panel_group_count not in LONGITUDINAL_VALIDATION_PANEL_GROUP_COUNTS
    ):
        raise LongitudinalStructureError(
            "panel_group_count must be one of 6 or 12"
        )
    return panel_group_count


def _standardize_from_pre(values: np.ndarray, pre_mask: np.ndarray) -> np.ndarray:
    pre_values = np.asarray(values, dtype=float)[pre_mask]
    sd = float(pre_values.std(ddof=1))
    if not math.isfinite(sd) or sd <= 1e-12:
        raise RuntimeError("validation DGP predictor has no pre-period variation")
    return (np.asarray(values, dtype=float) - float(pre_values.mean())) / sd


def _stationary_ar1_states(
    rng: np.random.Generator,
    *,
    panel_group_count: int,
) -> np.ndarray:
    states = np.zeros((panel_group_count, _TOTAL_WINDOW_COUNT), dtype=float)
    stationary_sd = _AR1_INNOVATION_SCALE / math.sqrt(
        1.0 - LONGITUDINAL_VALIDATION_AR1_RHO**2
    )
    states[:, 0] = rng.normal(0.0, stationary_sd, size=panel_group_count)
    for time in range(1, _TOTAL_WINDOW_COUNT):
        innovations = rng.normal(
            0.0,
            _AR1_INNOVATION_SCALE,
            size=panel_group_count,
        )
        states[:, time] = (
            LONGITUDINAL_VALIDATION_AR1_RHO * states[:, time - 1]
            + innovations
        )
    return states


def _calibrate_movement_scale(
    *,
    requested_effect_size_sd: float,
    base_outcome: np.ndarray,
    movement_score: np.ndarray,
    pre_mask: np.ndarray,
    evaluation_mask: np.ndarray,
) -> float:
    if requested_effect_size_sd == 0.0:
        return 0.0

    evaluation_mean = float(movement_score[evaluation_mask].mean())
    if not math.isfinite(evaluation_mean) or evaluation_mean <= 0.0:
        raise RuntimeError("validation DGP movement contrast must be positive")

    def realized(scale: float) -> float:
        pre_sd = float(
            (base_outcome[pre_mask] + scale * movement_score[pre_mask]).std(
                ddof=1
            )
        )
        return scale * evaluation_mean / pre_sd

    lower = 0.0
    upper = 1.0
    while realized(upper) < requested_effect_size_sd:
        upper *= 2.0
        if upper > 1_000_000.0:
            raise RuntimeError("validation DGP could not realize requested movement")
    for _ in range(_EFFECT_CALIBRATION_ITERATIONS):
        midpoint = (lower + upper) / 2.0
        if realized(midpoint) < requested_effect_size_sd:
            lower = midpoint
        else:
            upper = midpoint
    return (lower + upper) / 2.0


def generate_longitudinal_validation_case(
    *,
    effect_size_sd: float,
    panel_group_count: int,
    seed: int,
) -> LongitudinalValidationCase:
    """Generate one exact-cell aggregate state-space validation case."""

    requested_effect = _validate_effect_size(effect_size_sd)
    group_count = _validate_panel_group_count(panel_group_count)
    validated_seed = validate_longitudinal_seed(seed, name="seed")
    rng = np.random.default_rng(validated_seed)

    time = np.tile(np.arange(_TOTAL_WINDOW_COUNT, dtype=int), group_count)
    panel_group = np.repeat(np.arange(group_count, dtype=int), _TOTAL_WINDOW_COUNT)
    post = (time >= LONGITUDINAL_VALIDATION_PRE_WINDOW_COUNT).astype(int)
    pre_mask = post == 0
    evaluation_start = (
        LONGITUDINAL_VALIDATION_PRE_WINDOW_COUNT
        + synthetic_hypothesis_plan().expected_outcome_signal_lag_windows
    )
    evaluation_mask = time >= evaluation_start

    centered_group = panel_group.astype(float) - (group_count - 1) / 2.0
    centered_group /= float(np.std(np.arange(group_count, dtype=float), ddof=1))
    time_float = time.astype(float)
    evaluation_step = evaluation_mask.astype(float)

    velocity = (
        0.34
        + 0.045 * np.sin(2.0 * np.pi * time_float / 7.0 + 0.19 * panel_group)
        + 0.018 * centered_group
        + evaluation_step * (0.16 + 0.012 * (time_float - evaluation_start))
    )
    breadth = (
        0.41
        + 0.052 * np.cos(2.0 * np.pi * time_float / 5.0 + 0.31 * panel_group)
        - 0.014 * centered_group
        + evaluation_step
        * (0.21 + 0.014 * ((time_float - evaluation_start) % 2.0))
    )
    depth = (
        0.29
        + 0.038 * np.sin(2.0 * np.pi * time_float / 8.0 + 0.23 * panel_group)
        + 0.010 * centered_group
        + 0.19 * evaluation_step
    )

    baseline_snapshot = synthetic_ai_fluency_snapshot()
    baseline_fluency = (
        baseline_snapshot.overall_ai_fluency_score / 100.0
        + 0.035 * centered_group
    )
    seasonality = np.sin(2.0 * np.pi * time_float / 6.0)
    demand_index = np.cos(
        2.0 * np.pi * time_float / 9.0 + 0.11 * panel_group
    )
    controls = np.column_stack([seasonality, demand_index])

    time_standardized = _standardize_from_pre(time_float, pre_mask)
    velocity_standardized = _standardize_from_pre(velocity, pre_mask)
    breadth_standardized = _standardize_from_pre(breadth, pre_mask)
    fluency_standardized = _standardize_from_pre(baseline_fluency, pre_mask)
    seasonality_standardized = _standardize_from_pre(seasonality, pre_mask)
    demand_standardized = _standardize_from_pre(demand_index, pre_mask)

    raw_group_effects = rng.normal(0.0, _PANEL_GROUP_SCALE, size=group_count)
    raw_group_effects -= float(raw_group_effects.mean())
    ar1_states = _stationary_ar1_states(rng, panel_group_count=group_count)
    observation_noise = rng.normal(
        0.0,
        _KNOWN_AGGREGATE_SE,
        size=(group_count, _TOTAL_WINDOW_COUNT),
    )

    base_outcome = (
        _INTERCEPT
        + _TIME_COEFFICIENT * time_standardized
        + _FLUENCY_COEFFICIENT * fluency_standardized
        + _CONTROL_COEFFICIENTS[0] * seasonality_standardized
        + _CONTROL_COEFFICIENTS[1] * demand_standardized
        + raw_group_effects[panel_group]
        + ar1_states.reshape(-1)
        + observation_noise.reshape(-1)
    )
    movement_score = (
        _VELOCITY_MOVEMENT_WEIGHT * velocity_standardized
        + _BREADTH_MOVEMENT_WEIGHT * breadth_standardized
    )
    movement_scale = _calibrate_movement_scale(
        requested_effect_size_sd=requested_effect,
        base_outcome=base_outcome,
        movement_score=movement_score,
        pre_mask=pre_mask,
        evaluation_mask=evaluation_mask,
    )
    observed_outcome = base_outcome + movement_scale * movement_score
    pre_outcome_mean = float(observed_outcome[pre_mask].mean())
    pre_outcome_sd = float(observed_outcome[pre_mask].std(ddof=1))
    evaluation_movement = float(
        movement_scale * movement_score[evaluation_mask].mean()
    )
    realized_effect = evaluation_movement / pre_outcome_sd

    window_refs = tuple(f"m{value:02d}" for value in time)
    evaluation_window_refs = tuple(
        f"m{value:02d}" for value in range(evaluation_start, _TOTAL_WINDOW_COUNT)
    )
    dataset = LongitudinalSyntheticDataset(
        hypothesis_plan=synthetic_hypothesis_plan(),
        ai_fluency_snapshots=(baseline_snapshot,),
        organization_idx=np.zeros_like(time),
        function_idx=np.zeros_like(time),
        workflow_idx=np.zeros_like(time),
        cohort_idx=panel_group,
        time_index=time,
        post=post,
        observed_outcome=observed_outcome,
        known_aggregate_se=np.full_like(
            observed_outcome,
            _KNOWN_AGGREGATE_SE,
            dtype=float,
        ),
        velocity_exposure=velocity,
        breadth_exposure=breadth,
        depth_exposure=depth,
        baseline_fluency_context=baseline_fluency,
        control_matrix=controls,
        control_names=("seasonality_index", "customer_demand_index"),
        control_source_refs=(
            "synthetic-control://seasonality",
            "synthetic-control://demand-index",
        ),
        control_source_hashes=(
            _synthetic_source_hash("seasonality"),
            _synthetic_source_hash("demand-index"),
        ),
        window_refs=window_refs,
        evaluation_window_refs=evaluation_window_refs,
        seed=validated_seed,
        real_data_present=False,
        customer_data_present=False,
        production_data_present=False,
        live_data_source_present=False,
    )
    validate_longitudinal_dataset_structure(dataset)

    standardized_scale = 1.0 / pre_outcome_sd
    truth = LongitudinalValidationTruth(
        requested_effect_size_sd=requested_effect,
        realized_effect_size_sd=float(realized_effect),
        pre_period_outcome_sd=pre_outcome_sd,
        evaluation_movement_outcome_units=evaluation_movement,
        fixed_effects=(
            ("intercept", (_INTERCEPT - pre_outcome_mean) * standardized_scale),
            (
                "historical_time_trend",
                _TIME_COEFFICIENT * standardized_scale,
            ),
            (
                "beta_velocity",
                movement_scale
                * _VELOCITY_MOVEMENT_WEIGHT
                * standardized_scale,
            ),
            (
                "beta_breadth",
                movement_scale
                * _BREADTH_MOVEMENT_WEIGHT
                * standardized_scale,
            ),
            (
                "beta_fluency_context",
                _FLUENCY_COEFFICIENT * standardized_scale,
            ),
            (
                "control_seasonality_index",
                _CONTROL_COEFFICIENTS[0] * standardized_scale,
            ),
            (
                "control_customer_demand_index",
                _CONTROL_COEFFICIENTS[1] * standardized_scale,
            ),
        ),
        panel_group_effects=tuple(
            float(value * standardized_scale) for value in raw_group_effects
        ),
        panel_group_scale=float(_PANEL_GROUP_SCALE * standardized_scale),
        ar1_innovation_scale=float(_AR1_INNOVATION_SCALE * standardized_scale),
        ar1_rho=LONGITUDINAL_VALIDATION_AR1_RHO,
        ar1_initial_stationary_sd=float(
            _AR1_INNOVATION_SCALE
            * standardized_scale
            / math.sqrt(1.0 - LONGITUDINAL_VALIDATION_AR1_RHO**2)
        ),
        known_aggregate_se=float(_KNOWN_AGGREGATE_SE * standardized_scale),
        evaluation_window_refs=evaluation_window_refs,
    )
    return LongitudinalValidationCase(dataset=dataset, truth=truth)
