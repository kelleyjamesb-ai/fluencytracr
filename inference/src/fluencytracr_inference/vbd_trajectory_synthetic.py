"""Deterministic three-lane aggregate generator for VBD trajectory proof work."""

from __future__ import annotations

from contextlib import contextmanager
from contextvars import ContextVar
from dataclasses import dataclass, replace
from itertools import product
import math

import numpy as np

from .hashing import sha256_json
from .longitudinal_types import validate_longitudinal_seed
from .vbd_trajectory_types import (
    PrimitiveDistribution,
    PrimitiveTrajectoryObservation,
    TrajectoryDepthContext,
    TrajectoryObservationBundle,
    TrajectoryObservationPanel,
    TrajectoryReferenceEntry,
    TrajectoryReferenceManifest,
    TrajectoryStructureError,
    VBD_TRAJECTORY_BLOCKED_USES,
    VBD_TRAJECTORY_CONCORDANCE_PLAN_REF,
    VBD_TRAJECTORY_CONCORDANCE_SEED_NAMESPACE,
    VBD_TRAJECTORY_COVARIANCE_LANE_ORDER,
    VBD_TRAJECTORY_EVENT_SCHEMA_VERSION,
    VBD_TRAJECTORY_EVENTS,
    VBD_TRAJECTORY_GENERATOR_ID,
    VBD_TRAJECTORY_LANES,
    VBD_TRAJECTORY_POST_WINDOW_COUNT,
    VBD_TRAJECTORY_PRE_WINDOW_COUNT,
    VBD_TRAJECTORY_QUANTILE_ALGORITHM,
    VBD_TRAJECTORY_QUANTILE_DELTAS,
    VBD_TRAJECTORY_RAW_SCALES,
    VBD_TRAJECTORY_RNG_ID,
    VBD_TRAJECTORY_RUNTIME_REF,
    VBD_TRAJECTORY_SCHEMA_VERSION,
    VBD_TRAJECTORY_SMOKE_PLAN_REF,
    VBD_TRAJECTORY_STATISTICS,
    VBD_TRAJECTORY_SMOKE_SEED_MAX,
    VBD_TRAJECTORY_SMOKE_SEED_MIN,
    VBD_TRAJECTORY_SMOKE_SEED_NAMESPACE,
    VBD_TRAJECTORY_SYNTHETIC_DERIVATION,
    VBD_TRAJECTORY_TOTAL_WINDOW_COUNT,
    VBD_TRAJECTORY_TRANSFORMS,
    VBD_TRAJECTORY_UNITS,
    VBD_TRAJECTORY_VALIDATION_PLAN_REF,
    VBD_TRAJECTORY_VALIDATION_SEED_NAMESPACE,
    aggregate_output_hash_body,
    canonicalize_vbd_trajectory_numeric,
    canonicalize_vbd_trajectory_uncertainty,
    expected_bundle_source_content_root,
    expected_gate_receipt_hash,
    expected_joint_uncertainty_root,
    expected_ordered_panel_manifest_root,
    expected_synthetic_cohort_hash,
    expected_synthetic_source_derivation_receipt,
    expected_static_reference_content_hash,
    primitive_lane_source_content_hash,
    primitive_marginal_uncertainty_root,
    reference_manifest_hash,
    synthetic_lane_source_hash_body,
    trajectory_window_bounds,
    validate_trajectory_panel,
    validate_vbd_trajectory_runtime,
    vbd_eligible_surface_set_hash,
    vbd_trajectory_model_manifest_body,
)
from .vbd_trajectory_validation_plan import (
    VbdTrajectoryValidationSlot,
    immutable_vbd_trajectory_validation_plan,
    required_vbd_trajectory_validation_slots,
)


VBD_TRAJECTORY_DGP_ALPHA = 0.0
VBD_TRAJECTORY_DGP_BETA = 0.05
VBD_TRAJECTORY_DGP_GROUP_SCALE = 0.18
VBD_TRAJECTORY_DGP_RHO = 0.45
VBD_TRAJECTORY_DGP_INNOVATION_SCALE = 0.10
VBD_TRAJECTORY_DGP_GROUP_CORRELATION = 0.35
VBD_TRAJECTORY_DGP_OBSERVATION_CORRELATION = 0.25
VBD_TRAJECTORY_ELIGIBLE_DAY_COUNT = 60
VBD_TRAJECTORY_ELIGIBLE_SURFACE_COUNT = 12
VBD_TRAJECTORY_SYNTHETIC_TAXONOMY = "definition:synthetic-surface-taxonomy-v1"
VBD_TRAJECTORY_SUSTAINED_POST_PATTERN = "sustained_all_six_post_windows"
VBD_TRAJECTORY_TEMPORARY_PULSE_POST_PATTERN = (
    "plus_0.5_all_lanes_w12_w14_then_zero_w15_w17"
)
VBD_TRAJECTORY_COMMON_AVAILABILITY_SHOCK_TERMINAL = (0.5, 0.5, 0.5)

_VALIDATION_CAPABILITY_HASH: ContextVar[str | None] = ContextVar(
    "vbd_trajectory_validation_capability_hash", default=None
)
_VALIDATION_GENERATION_RUNNER_TOKEN = object()
_CONCORDANCE_CAPABILITY_HASH: ContextVar[str | None] = ContextVar(
    "vbd_trajectory_concordance_capability_hash", default=None
)
_CONCORDANCE_GENERATION_RUNNER_TOKEN = object()
_PRECISION_CANARY_GENERATION_RUNNER_TOKEN = object()
_STANDARD_ERROR_RATIO = 1.0
_COVARIANCE_RATIO = 1.0
_UNDERSTATED_STANDARD_ERROR_RATIO = 0.5
_UNDERSTATED_COVARIANCE_RATIO = 0.25
_DEVELOPMENT_SCENARIO_PREFIX = "development_smoke_scenario_"

_LANE_OFFSETS = np.asarray([2.5, 0.8, 0.6], dtype=float)
_LANE_SCALES = np.asarray(
    [VBD_TRAJECTORY_RAW_SCALES[lane] for lane in VBD_TRAJECTORY_LANES],
    dtype=float,
)
_QUANTILE_DELTAS = VBD_TRAJECTORY_QUANTILE_DELTAS


class VbdSyntheticRunnerError(RuntimeError):
    """The compiled generator could not produce its exact aggregate package."""


@dataclass(frozen=True, eq=False)
class VbdTrajectoryTruth:
    scenario_id: str
    seed: int
    requested_terminal_truth: tuple[float, float, float]
    direction_vector: tuple[int, int, int]
    direction_adjusted_truth: tuple[float, float, float]
    transformed_latent_paths: np.ndarray
    working_group_effects: np.ndarray
    working_ar1_states: np.ndarray
    pre_observation_mean: tuple[float, float, float]
    pre_observation_sd: tuple[float, float, float]
    post_pattern: str = VBD_TRAJECTORY_SUSTAINED_POST_PATTERN
    shock_kind: str | None = None
    structural_terminal_truth: tuple[float, float, float] = ()
    common_shock_terminal_shift: tuple[float, float, float] = ()
    true_raw_transformed_covariance: tuple[
        tuple[float, float, float], ...
    ] = ()
    reported_standard_error_ratio: float = _STANDARD_ERROR_RATIO
    reported_covariance_ratio: float = _COVARIANCE_RATIO


@dataclass(frozen=True, eq=False)
class VbdTrajectorySyntheticCase:
    panel: TrajectoryObservationPanel
    truth: VbdTrajectoryTruth


@dataclass(frozen=True, slots=True)
class _VbdTrajectoryGenerationSpec:
    scenario_id: str
    seed: int
    panel_group_count: int
    aggregate_k: int
    terminal_truth: tuple[float, float, float]
    direction_vector: tuple[int, int, int]
    post_pattern: str
    correlations: tuple[float, float, float]
    plan_ref: str
    plan_hash: str
    seed_namespace: str
    acceptance_slot_key: str | None
    depth_context_ref: str
    shock_kind: str | None
    reported_standard_error_ratio: float
    reported_covariance_ratio: float
    zero_pre_period_variance: bool = False


def _equicorrelation(value: float) -> np.ndarray:
    result = np.full((3, 3), float(value), dtype=float)
    np.fill_diagonal(result, 1.0)
    return result


def _time_encoding() -> np.ndarray:
    pre = np.arange(VBD_TRAJECTORY_PRE_WINDOW_COUNT, dtype=float)
    mean = float(pre.mean())
    sd = float(pre.std(ddof=1))
    return (np.arange(VBD_TRAJECTORY_TOTAL_WINDOW_COUNT, dtype=float) - mean) / sd


def _strict_direction(value: object) -> tuple[int, int, int]:
    if (
        type(value) is not tuple
        or len(value) != 3
        or any(type(item) is not int or item not in (-1, 1) for item in value)
    ):
        raise ValueError("direction vector must be a three-item -1/+1 tuple")
    return value


def _strict_truth(value: object) -> tuple[float, float, float]:
    if (
        type(value) is not tuple
        or len(value) != 3
        or any(type(item) not in (int, float) for item in value)
    ):
        raise ValueError("terminal truth must be a three-item tuple")
    result = tuple(float(item) for item in value)
    if not all(math.isfinite(item) for item in result):
        raise ValueError("terminal truth must be finite")
    if any(item not in (0.0, 0.2, 0.5) for item in result):
        raise ValueError("terminal truth must use the compiled calibration effects")
    return result


def _strict_internal_truth(value: object) -> tuple[float, float, float]:
    if (
        type(value) is not tuple
        or len(value) != 3
        or any(type(item) is not float for item in value)
        or any(not math.isfinite(item) for item in value)
        or any(item not in (-0.5, 0.0, 0.2, 0.5) for item in value)
    ):
        raise ValueError("internal truth must use the compiled three-lane effects")
    return value


def _strict_correlations(
    value: object,
) -> tuple[float, float, float]:
    if (
        type(value) is not tuple
        or len(value) != 3
        or any(type(item) is not float for item in value)
        or any(not math.isfinite(item) or not -0.49 < item < 1.0 for item in value)
    ):
        raise ValueError("correlations must be a compiled three-item float tuple")
    return value


def _post_adjustments(
    *,
    base_terminal: np.ndarray,
    terminal_truth: tuple[float, float, float],
    post_pattern: str,
) -> np.ndarray:
    truth = np.asarray(terminal_truth, dtype=float)
    if post_pattern == VBD_TRAJECTORY_SUSTAINED_POST_PATTERN:
        return np.tile(
            truth - base_terminal,
            (VBD_TRAJECTORY_POST_WINDOW_COUNT, 1),
        )
    if post_pattern == VBD_TRAJECTORY_TEMPORARY_PULSE_POST_PATTERN:
        if terminal_truth != (0.0, 0.0, 0.0):
            raise VbdSyntheticRunnerError(
                "temporary pulse requires exact zero terminal truth"
            )
        adjustments = np.tile(
            -base_terminal,
            (VBD_TRAJECTORY_POST_WINDOW_COUNT, 1),
        )
        adjustments[:3, :] += 0.5
        return adjustments
    raise VbdSyntheticRunnerError("post pattern is not compiled")


def _development_scenario_semantics(
    scenario_id: str,
    *,
    depth_context_ref: str,
) -> dict:
    aliases = {
        "sustained_primary": "primary",
        "sustained_floor": "floor",
    }
    scenario = aliases.get(scenario_id, scenario_id)
    truths = {
        "primary": (0.5, 0.5, 0.5),
        "floor": (0.5, 0.5, 0.5),
        "frequency_only": (0.5, 0.0, 0.0),
        "engagement_only": (0.0, 0.5, 0.0),
        "breadth_only": (0.0, 0.0, 0.5),
        "correlated_null": (0.0, 0.0, 0.0),
        "composition_rotation": (0.5, -0.5, 0.0),
        "temporary_pulse": (0.0, 0.0, 0.0),
        "common_availability_shock": (0.5, 0.5, 0.5),
        "depth_context_perturbation": (0.0, 0.0, 0.0),
        "understated_uncertainty": (0.5, 0.5, 0.5),
    }
    if type(scenario_id) is not str or scenario not in truths:
        raise ValueError("development scenario is not compiled")
    if scenario != "depth_context_perturbation" and depth_context_ref != "depth-context:a":
        raise ValueError(
            "only the Depth perturbation scenario may vary Depth context"
        )
    return {
        "terminal_truth": truths[scenario],
        "direction_vector": (
            (1, -1, 1) if scenario == "composition_rotation" else (1, 1, 1)
        ),
        "post_pattern": (
            VBD_TRAJECTORY_TEMPORARY_PULSE_POST_PATTERN
            if scenario == "temporary_pulse"
            else VBD_TRAJECTORY_SUSTAINED_POST_PATTERN
        ),
        "correlations": (
            (0.8, 0.8, 0.8)
            if scenario == "correlated_null"
            else (
                VBD_TRAJECTORY_DGP_GROUP_CORRELATION,
                VBD_TRAJECTORY_DGP_GROUP_CORRELATION,
                VBD_TRAJECTORY_DGP_OBSERVATION_CORRELATION,
            )
        ),
        "shock_kind": (
            "common_availability"
            if scenario == "common_availability_shock"
            else None
        ),
        "reported_standard_error_ratio": (
            _UNDERSTATED_STANDARD_ERROR_RATIO
            if scenario == "understated_uncertainty"
            else _STANDARD_ERROR_RATIO
        ),
        "reported_covariance_ratio": (
            _UNDERSTATED_COVARIANCE_RATIO
            if scenario == "understated_uncertainty"
            else _COVARIANCE_RATIO
        ),
        "depth_context_ref": depth_context_ref,
    }


def _lane_definition_ref(lane_index: int) -> str:
    return (
        "definition:frequency-runs-per-active-day-v1",
        "definition:engagement-active-days-v1",
        "definition:breadth-distinct-governed-surfaces-v1",
    )[lane_index]


def _denominator_definition_ref(lane_index: int) -> str:
    return (
        "definition:frequency-active-day-v1",
        "definition:eligible-day-60-v1",
        VBD_TRAJECTORY_SYNTHETIC_TAXONOMY,
    )[lane_index]


def _lane_definition_hash(lane_index: int) -> str:
    ref_value = _lane_definition_ref(lane_index)
    lane = VBD_TRAJECTORY_LANES[lane_index]
    return expected_static_reference_content_hash(
        ref_value,
        f"{lane}_definition",
        ref_value,
    )


def _denominator_definition_hash(lane_index: int) -> str:
    ref_value = _denominator_definition_ref(lane_index)
    lane = VBD_TRAJECTORY_LANES[lane_index]
    return expected_static_reference_content_hash(
        ref_value,
        f"{lane}_denominator_definition",
        ref_value,
    )


def _cohort_hash(panel_group_index: int, aggregate_k: int) -> str:
    return expected_synthetic_cohort_hash(panel_group_index, aggregate_k)


def _reference_entries(
    panel_group_count: int,
    *,
    aggregate_k: int,
    plan_hash: str,
    plan_ref: str = VBD_TRAJECTORY_SMOKE_PLAN_REF,
) -> tuple[TrajectoryReferenceEntry, ...]:
    entries = [
        TrajectoryReferenceEntry(
            ref="definition:frequency-runs-per-active-day-v1",
            field_role="frequency_definition",
            owner_role="synthetic_generator",
            source_definition_ref="definition:frequency-runs-per-active-day-v1",
        ),
        TrajectoryReferenceEntry(
            ref="definition:frequency-active-day-v1",
            field_role="frequency_denominator_definition",
            owner_role="synthetic_generator",
            source_definition_ref="definition:frequency-active-day-v1",
        ),
        TrajectoryReferenceEntry(
            ref="definition:engagement-active-days-v1",
            field_role="engagement_definition",
            owner_role="synthetic_generator",
            source_definition_ref="definition:engagement-active-days-v1",
        ),
        TrajectoryReferenceEntry(
            ref="definition:eligible-day-60-v1",
            field_role="engagement_denominator_definition",
            owner_role="synthetic_generator",
            source_definition_ref="definition:eligible-day-60-v1",
        ),
        TrajectoryReferenceEntry(
            ref="definition:breadth-distinct-governed-surfaces-v1",
            field_role="breadth_definition",
            owner_role="synthetic_generator",
            source_definition_ref="definition:breadth-distinct-governed-surfaces-v1",
        ),
        TrajectoryReferenceEntry(
            ref=VBD_TRAJECTORY_SYNTHETIC_TAXONOMY,
            field_role="breadth_denominator_definition",
            owner_role="synthetic_generator",
            source_definition_ref=VBD_TRAJECTORY_SYNTHETIC_TAXONOMY,
        ),
        TrajectoryReferenceEntry(
            ref="source:vbd-synthetic-frequency",
            field_role="frequency_source",
            owner_role="synthetic_generator",
            source_definition_ref="definition:frequency-runs-per-active-day-v1",
        ),
        TrajectoryReferenceEntry(
            ref="source:vbd-synthetic-engagement",
            field_role="engagement_source",
            owner_role="synthetic_generator",
            source_definition_ref="definition:engagement-active-days-v1",
        ),
        TrajectoryReferenceEntry(
            ref="source:vbd-synthetic-breadth",
            field_role="breadth_source",
            owner_role="synthetic_generator",
            source_definition_ref="definition:breadth-distinct-governed-surfaces-v1",
        ),
        TrajectoryReferenceEntry(
            ref="source:vbd-synthetic-uncertainty",
            field_role="uncertainty_derivation",
            owner_role="synthetic_generator",
            source_definition_ref="definition:synthetic-known-aggregate-uncertainty-v1",
        ),
        TrajectoryReferenceEntry(
            ref="definition:synthetic-known-aggregate-uncertainty-v1",
            field_role="uncertainty_definition",
            owner_role="synthetic_generator",
            source_definition_ref="definition:synthetic-known-aggregate-uncertainty-v1",
        ),
        TrajectoryReferenceEntry(
            ref=VBD_TRAJECTORY_RUNTIME_REF,
            field_role="runtime",
            owner_role="synthetic_generator",
            source_definition_ref="definition:synthetic-known-aggregate-uncertainty-v1",
        ),
        TrajectoryReferenceEntry(
            ref="gate:vbd-synthetic-window-clear",
            field_role="gate_receipt",
            owner_role="synthetic_generator",
            source_definition_ref="definition:synthetic-known-aggregate-uncertainty-v1",
        ),
        TrajectoryReferenceEntry(
            ref=plan_ref,
            field_role="study_plan",
            owner_role="synthetic_generator",
            source_definition_ref="definition:synthetic-known-aggregate-uncertainty-v1",
        ),
        TrajectoryReferenceEntry(
            ref="definition:depth-context-v1",
            field_role="depth_definition",
            owner_role="synthetic_generator",
            source_definition_ref="definition:depth-context-v1",
        ),
        TrajectoryReferenceEntry(
            ref="source:vbd-synthetic-depth-context",
            field_role="depth_source",
            owner_role="synthetic_generator",
            source_definition_ref="definition:depth-context-v1",
        ),
        TrajectoryReferenceEntry(
            ref="caveat:depth-context-only",
            field_role="depth_caveat",
            owner_role="synthetic_generator",
            source_definition_ref="definition:depth-context-v1",
        ),
    ]
    for ref in ("depth-context:a", "depth-context:b", "depth-context:unavailable"):
        entries.append(
            TrajectoryReferenceEntry(
                ref=ref,
                field_role="depth_context",
                owner_role="synthetic_generator",
                source_definition_ref="definition:depth-context-v1",
            )
        )
    for group in range(panel_group_count):
        entries.append(
            TrajectoryReferenceEntry(
                ref=f"cohort:vbd-synthetic-g{group:02d}",
                field_role="cohort",
                owner_role="synthetic_generator",
                source_definition_ref="definition:synthetic-known-aggregate-uncertainty-v1",
            )
        )
    bound_hashes = {
        _lane_definition_ref(index): _lane_definition_hash(index)
        for index in range(3)
    }
    bound_hashes.update(
        {
            _denominator_definition_ref(index): _denominator_definition_hash(index)
            for index in range(3)
        }
    )
    bound_hashes[plan_ref] = plan_hash
    for group in range(panel_group_count):
        bound_hashes[f"cohort:vbd-synthetic-g{group:02d}"] = _cohort_hash(
            group, aggregate_k
        )
    return tuple(
        replace(
            entry,
            bound_content_hash=bound_hashes.get(
                entry.ref,
                sha256_json(
                    {
                        "ref": entry.ref,
                        "field_role": entry.field_role,
                        "source_definition_ref": entry.source_definition_ref,
                    }
                ),
            ),
        )
        for entry in entries
    )


def build_synthetic_reference_manifest(
    panel_group_count: int,
    *,
    aggregate_k: int,
    plan_hash: str,
    plan_ref: str = VBD_TRAJECTORY_SMOKE_PLAN_REF,
) -> TrajectoryReferenceManifest:
    entries = _reference_entries(
        panel_group_count,
        aggregate_k=aggregate_k,
        plan_hash=plan_hash,
        plan_ref=plan_ref,
    )
    return TrajectoryReferenceManifest(
        entries=entries,
        manifest_hash=reference_manifest_hash(entries),
    )


def _depth_context(
    context_ref: str,
) -> TrajectoryDepthContext:
    if type(context_ref) is not str or context_ref not in ("depth-context:a", "depth-context:b", "depth-context:unavailable"):
        raise TrajectoryStructureError("Depth context ref is not allowlisted")
    unavailable = context_ref == "depth-context:unavailable"
    body = {
        "context_ref": context_ref,
        "definition_ref": "definition:depth-context-v1",
        "source_ref": "source:vbd-synthetic-depth-context",
        "source_hash": sha256_json({"context_ref": context_ref, "synthetic": True}),
        "aggregate_review_state": "unavailable" if unavailable else "reviewed",
        "suppression_posture": "unavailable" if unavailable else "available",
        "caveat_refs": ["caveat:depth-context-only"],
        "used_in_likelihood": False,
        "used_in_eligibility": False,
    }
    return TrajectoryDepthContext(
        context_ref=context_ref,
        definition_ref=body["definition_ref"],
        source_ref=body["source_ref"],
        source_hash=body["source_hash"],
        aggregate_review_state=body["aggregate_review_state"],
        suppression_posture=body["suppression_posture"],
        caveat_refs=tuple(body["caveat_refs"]),
        context_root=sha256_json(body),
    )


def _inverse_lane(lane_index: int, transformed: float) -> float:
    if lane_index == 0:
        result = math.expm1(transformed)
        if not math.isfinite(result) or result < 0.0:
            raise VbdSyntheticRunnerError("frequency inverse transform left its domain")
        return canonicalize_vbd_trajectory_numeric(result)
    denominator = (
        VBD_TRAJECTORY_ELIGIBLE_DAY_COUNT
        if lane_index == 1
        else VBD_TRAJECTORY_ELIGIBLE_SURFACE_COUNT
    )
    if not math.isfinite(transformed) or not 0.0 < transformed < math.pi / 2.0:
        raise VbdSyntheticRunnerError("proportion inverse transform left its regular domain")
    return canonicalize_vbd_trajectory_numeric(
        float(denominator * math.sin(transformed) ** 2)
    )


def _canonical_transformed_p50(lane_index: int, prepared_value: float) -> float:
    return canonicalize_vbd_trajectory_numeric(
        float(_LANE_OFFSETS[lane_index] + _LANE_SCALES[lane_index] * prepared_value)
    )


def _distribution(lane_index: int, prepared_value: float) -> PrimitiveDistribution:
    transformed_p50 = _canonical_transformed_p50(lane_index, prepared_value)
    values = {
        name: _inverse_lane(
            lane_index,
            float(transformed_p50 + _LANE_SCALES[lane_index] * delta),
        )
        for name, delta in _QUANTILE_DELTAS.items()
    }
    return PrimitiveDistribution(**values)


def _primitive_observation(
    *,
    lane_index: int,
    prepared_value: float,
    raw_transformed_se: float,
    source_hash: str,
    direction_vector: tuple[int, int, int],
    direction_vector_root: str,
    aggregate_k: int,
) -> PrimitiveTrajectoryObservation:
    lane = VBD_TRAJECTORY_LANES[lane_index]
    denominator = (
        None
        if lane == "frequency"
        else (
            VBD_TRAJECTORY_ELIGIBLE_DAY_COUNT
            if lane == "engagement"
            else VBD_TRAJECTORY_ELIGIBLE_SURFACE_COUNT
        )
    )
    source_refs = (
        "source:vbd-synthetic-frequency",
        "source:vbd-synthetic-engagement",
        "source:vbd-synthetic-breadth",
    )
    transformed_p50 = _canonical_transformed_p50(lane_index, prepared_value)
    placeholder = PrimitiveTrajectoryObservation(
        lane=lane,
        event_schema_version=VBD_TRAJECTORY_EVENT_SCHEMA_VERSION,
        event_name=VBD_TRAJECTORY_EVENTS[lane],
        statistic_name=VBD_TRAJECTORY_STATISTICS[lane],
        unit=VBD_TRAJECTORY_UNITS[lane],
        transform_id=VBD_TRAJECTORY_TRANSFORMS[lane],
        distribution=_distribution(lane_index, prepared_value),
        denominator=denominator,
        transformed_p50=transformed_p50,
        transformed_standard_error=canonicalize_vbd_trajectory_numeric(
            raw_transformed_se
        ),
        definition_ref=_lane_definition_ref(lane_index),
        definition_hash=_lane_definition_hash(lane_index),
        denominator_definition_ref=_denominator_definition_ref(lane_index),
        denominator_definition_hash=_denominator_definition_hash(lane_index),
        source_ref=source_refs[lane_index],
        source_hash=source_hash,
        uncertainty_derivation_ref="source:vbd-synthetic-uncertainty",
        gate_receipt_ref="gate:vbd-synthetic-window-clear",
        gate_receipt_hash="0" * 64,
        direction_sign=direction_vector[lane_index],
        direction_vector_root=direction_vector_root,
        cohort_size=aggregate_k,
        observed_count=aggregate_k,
        missing_count=0,
        eligible_surface_set_hash=(
            vbd_eligible_surface_set_hash() if lane == "breadth" else None
        ),
        suppressed=False,
        stale=False,
        imputed=False,
        lane_source_content_hash="0" * 64,
        marginal_uncertainty_root="0" * 64,
    )
    return replace(
        placeholder,
        lane_source_content_hash=primitive_lane_source_content_hash(placeholder),
    )


def _rebind_bundle_hashes(
    bundle: TrajectoryObservationBundle,
) -> TrajectoryObservationBundle:
    """Recompute the complete acyclic synthetic bundle hash graph."""

    gate_rebound_observations = tuple(
        replace(
            observation,
            gate_receipt_hash=expected_gate_receipt_hash(bundle, observation),
        )
        for observation in bundle.observations
    )
    source_rebound_observations = tuple(
        replace(
            observation,
            source_hash=sha256_json(
                synthetic_lane_source_hash_body(bundle, observation)
            ),
        )
        for observation in gate_rebound_observations
    )
    source_bound_observations = tuple(
        replace(
            observation,
            lane_source_content_hash=primitive_lane_source_content_hash(observation),
            marginal_uncertainty_root="0" * 64,
        )
        for observation in source_rebound_observations
    )
    reset = replace(
        bundle,
        observations=source_bound_observations,
        source_derivation_receipt="0" * 64,
        aggregate_output_hash="0" * 64,
        joint_uncertainty_derivation_root="0" * 64,
        bundle_source_content_root="0" * 64,
    )
    with_aggregate_hash = replace(
        reset,
        aggregate_output_hash=sha256_json(aggregate_output_hash_body(reset)),
    )
    with_receipt = replace(
        with_aggregate_hash,
        source_derivation_receipt=expected_synthetic_source_derivation_receipt(
            with_aggregate_hash
        ),
    )
    with_joint_root = replace(
        with_receipt,
        joint_uncertainty_derivation_root=expected_joint_uncertainty_root(with_receipt),
    )
    bound_observations = tuple(
        replace(
            observation,
            marginal_uncertainty_root=primitive_marginal_uncertainty_root(
                observation, with_joint_root.joint_uncertainty_derivation_root
            ),
        )
        for observation in source_bound_observations
    )
    with_children = replace(with_joint_root, observations=bound_observations)
    return replace(
        with_children,
        bundle_source_content_root=expected_bundle_source_content_root(with_children),
    )


def _build_bundle(
    *,
    panel_group_index: int,
    window_index: int,
    prepared_values: np.ndarray,
    raw_transformed_covariance: np.ndarray,
    aggregate_k: int,
    direction_vector: tuple[int, int, int],
    direction_vector_root: str,
    plan_ref: str,
    plan_hash: str,
    partition_root: str,
    depth_context: TrajectoryDepthContext,
) -> TrajectoryObservationBundle:
    window_start, window_end = trajectory_window_bounds(window_index)
    tuple_key = (
        f"workflow-vbd-{panel_group_index:02d}",
        "jbtd-vbd-trajectory",
        "persona-vbd-synthetic",
    )
    cohort_ref = f"cohort:vbd-synthetic-g{panel_group_index:02d}"
    cohort_hash = _cohort_hash(panel_group_index, aggregate_k)
    active_set_commitment = sha256_json(
        {"cohort_ref": cohort_ref, "active_set": "fixed-across-windows", "aggregate_k": aggregate_k}
    )
    canonical_covariance, raw_standard_errors = (
        canonicalize_vbd_trajectory_uncertainty(raw_transformed_covariance)
    )
    observations = tuple(
        _primitive_observation(
            lane_index=lane_index,
            prepared_value=float(prepared_values[lane_index]),
            raw_transformed_se=raw_standard_errors[lane_index],
            source_hash="0" * 64,
            direction_vector=direction_vector,
            direction_vector_root=direction_vector_root,
            aggregate_k=aggregate_k,
        )
        for lane_index in range(3)
    )
    placeholder = TrajectoryObservationBundle(
        schema_version=VBD_TRAJECTORY_SCHEMA_VERSION,
        workflow_id=tuple_key[0],
        jbtd_id=tuple_key[1],
        persona_id=tuple_key[2],
        panel_group_index=panel_group_index,
        window_index=window_index,
        window_id=f"w{window_index:02d}",
        window_start=window_start,
        window_end=window_end,
        source_cutoff=window_end,
        post=window_index >= VBD_TRAJECTORY_PRE_WINDOW_COUNT,
        k=aggregate_k,
        cohort_size=aggregate_k,
        cohort_ref=cohort_ref,
        cohort_hash=cohort_hash,
        active_set_commitment=active_set_commitment,
        partition_attestation_root=partition_root,
        plan_ref=plan_ref,
        plan_hash=plan_hash,
        direction_vector=direction_vector,
        direction_vector_root=direction_vector_root,
        covariance_lane_order=VBD_TRAJECTORY_COVARIANCE_LANE_ORDER,
        transformed_covariance=canonical_covariance,
        uncertainty_derivation_id=VBD_TRAJECTORY_SYNTHETIC_DERIVATION,
        quantile_algorithm_id=VBD_TRAJECTORY_QUANTILE_ALGORITHM,
        runtime_ref=VBD_TRAJECTORY_RUNTIME_REF,
        source_derivation_receipt="0" * 64,
        aggregate_output_hash="0" * 64,
        joint_uncertainty_derivation_root="0" * 64,
        bundle_source_content_root="0" * 64,
        observations=observations,
        depth_context=depth_context,
        synthetic_only=True,
        aggregate_only=True,
        real_data_present=False,
        customer_data_present=False,
        production_data_present=False,
        live_data_source_present=False,
    )
    return _rebind_bundle_hashes(placeholder)


def _validate_canonical_generated_evidence(
    panel: TrajectoryObservationPanel,
    expected_prepared: np.ndarray,
    raw_transformed_covariance: np.ndarray,
    *,
    identity: str,
) -> None:
    expected_covariance, expected_standard_errors = (
        canonicalize_vbd_trajectory_uncertainty(
            raw_transformed_covariance
        )
    )
    for bundle in panel.bundles:
        if bundle.transformed_covariance != expected_covariance:
            raise TrajectoryStructureError(
                f"panel covariance does not regenerate from the declared {identity}"
            )
        for lane_index, observation in enumerate(bundle.observations):
            prepared_value = float(
                expected_prepared[
                    bundle.panel_group_index,
                    bundle.window_index,
                    lane_index,
                ]
            )
            if (
                observation.transformed_p50
                != _canonical_transformed_p50(lane_index, prepared_value)
                or observation.distribution
                != _distribution(lane_index, prepared_value)
            ):
                raise TrajectoryStructureError(
                    f"panel observations do not regenerate from the declared {identity}"
                )
            if (
                observation.transformed_standard_error
                != expected_standard_errors[lane_index]
            ):
                raise TrajectoryStructureError(
                    f"panel uncertainty does not regenerate from the declared {identity}"
                )


def _generate_base_paths(
    *,
    panel_group_count: int,
    aggregate_k: int,
    seed: int,
    group_correlation: float,
    innovation_correlation: float,
    observation_correlation: float,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    rng = np.random.Generator(np.random.PCG64DXSM(seed))
    group_cholesky = np.linalg.cholesky(_equicorrelation(group_correlation))
    innovation_cholesky = np.linalg.cholesky(
        _equicorrelation(innovation_correlation)
    )
    observation_cholesky = np.linalg.cholesky(
        _equicorrelation(observation_correlation)
    )

    z_group = rng.standard_normal((panel_group_count, 3))
    z_initial = rng.standard_normal((panel_group_count, 3))
    z_innovation = rng.standard_normal(
        (panel_group_count, VBD_TRAJECTORY_TOTAL_WINDOW_COUNT - 1, 3)
    )
    z_observation = rng.standard_normal(
        (panel_group_count, VBD_TRAJECTORY_TOTAL_WINDOW_COUNT, 3)
    )

    group_effects = (
        z_group @ group_cholesky.T * VBD_TRAJECTORY_DGP_GROUP_SCALE
    )
    group_effects -= group_effects.mean(axis=0, keepdims=True)
    states = np.empty(
        (panel_group_count, VBD_TRAJECTORY_TOTAL_WINDOW_COUNT, 3), dtype=float
    )
    stationary_sd = VBD_TRAJECTORY_DGP_INNOVATION_SCALE / math.sqrt(
        1.0 - VBD_TRAJECTORY_DGP_RHO**2
    )
    states[:, 0, :] = z_initial @ innovation_cholesky.T * stationary_sd
    innovations = (
        z_innovation @ innovation_cholesky.T * VBD_TRAJECTORY_DGP_INNOVATION_SCALE
    )
    for time_index in range(1, VBD_TRAJECTORY_TOTAL_WINDOW_COUNT):
        states[:, time_index, :] = (
            VBD_TRAJECTORY_DGP_RHO * states[:, time_index - 1, :]
            + innovations[:, time_index - 1, :]
        )
    known_se = 0.08 * math.sqrt(16.0 / aggregate_k)
    observation_errors = z_observation @ observation_cholesky.T * known_se
    working_observation_covariance = (
        np.diag(np.full(3, known_se))
        @ _equicorrelation(observation_correlation)
        @ np.diag(np.full(3, known_se))
    )
    return group_effects, states, observation_errors, working_observation_covariance


def _development_smoke_plan_body(
    *,
    scenario_id: str,
    panel_group_count: int,
    aggregate_k: int,
    terminal_truth: tuple[float, float, float],
    direction_vector: tuple[int, int, int],
    group_correlation: float,
    innovation_correlation: float,
    observation_correlation: float,
) -> dict:
    return {
        "scenario_id": scenario_id,
        "panel_group_count": panel_group_count,
        "aggregate_k": aggregate_k,
        "terminal_truth": list(terminal_truth),
        "direction_vector": list(direction_vector),
        "pre_window_count": VBD_TRAJECTORY_PRE_WINDOW_COUNT,
        "post_window_count": VBD_TRAJECTORY_POST_WINDOW_COUNT,
        "acceptance_plan": False,
        "generator_id": VBD_TRAJECTORY_GENERATOR_ID,
        "rng_id": VBD_TRAJECTORY_RNG_ID,
        "dgp": {
            "alpha": VBD_TRAJECTORY_DGP_ALPHA,
            "beta": VBD_TRAJECTORY_DGP_BETA,
            "group_scale": VBD_TRAJECTORY_DGP_GROUP_SCALE,
            "rho": VBD_TRAJECTORY_DGP_RHO,
            "innovation_scale": VBD_TRAJECTORY_DGP_INNOVATION_SCALE,
            "known_se_at_k16": 0.08,
            "group_correlation": group_correlation,
            "innovation_correlation": innovation_correlation,
            "observation_correlation": observation_correlation,
            "draw_order": [
                "group_effects",
                "stationary_initial_states",
                "innovations",
                "observation_errors",
            ],
            "cholesky_convention": "lower_row_vector_times_transpose",
        },
    }


def _development_scenario_plan_body(
    *,
    scenario_key: str,
    scenario_id: str,
    panel_group_count: int,
    aggregate_k: int,
    terminal_truth: tuple[float, float, float],
    direction_vector: tuple[int, int, int],
    post_pattern: str,
    correlations: tuple[float, float, float],
    shock_kind: str | None,
    reported_standard_error_ratio: float,
    reported_covariance_ratio: float,
) -> dict:
    body = _development_smoke_plan_body(
        scenario_id=scenario_id,
        panel_group_count=panel_group_count,
        aggregate_k=aggregate_k,
        terminal_truth=terminal_truth,
        direction_vector=direction_vector,
        group_correlation=correlations[0],
        innovation_correlation=correlations[1],
        observation_correlation=correlations[2],
    )
    return {
        **body,
        "development_scenario_key": scenario_key,
        "post_pattern": post_pattern,
        "shock_kind": shock_kind,
        "reported_standard_error_ratio": reported_standard_error_ratio,
        "reported_covariance_ratio": reported_covariance_ratio,
    }


def _validate_vbd_trajectory_synthetic_generation_legacy(
    panel: TrajectoryObservationPanel,
) -> None:
    """Recompute the seeded DGP and reject panels copied across seed identities."""

    group_effects, states, observation_errors, working_covariance = (
        _generate_base_paths(
            panel_group_count=panel.panel_group_count,
            aggregate_k=panel.aggregate_k,
            seed=panel.seed,
            group_correlation=panel.dgp_group_correlation,
            innovation_correlation=panel.dgp_innovation_correlation,
            observation_correlation=panel.dgp_observation_correlation,
        )
    )
    tau = _time_encoding()
    base_latent = (
        VBD_TRAJECTORY_DGP_ALPHA
        + VBD_TRAJECTORY_DGP_BETA * tau[None, :, None]
        + group_effects[:, None, :]
        + states
    )
    base_observed = base_latent + observation_errors
    pre_observed = base_observed[:, :VBD_TRAJECTORY_PRE_WINDOW_COUNT, :]
    pre_sd = pre_observed.reshape(-1, 3).std(axis=0, ddof=1)
    pre_mean = pre_observed.reshape(-1, 3).mean(axis=0)
    if not np.all(np.isfinite(pre_sd)) or np.any(pre_sd <= 0.0):
        raise TrajectoryStructureError("seeded DGP pre-period scale is invalid")
    base_prepared = (
        base_observed - pre_mean[None, None, :]
    ) / pre_sd[None, None, :]
    base_prepared_latent = (
        base_latent - pre_mean[None, None, :]
    ) / pre_sd[None, None, :]
    base_terminal = (
        base_prepared_latent[:, 15:18, :].mean(axis=(0, 1))
        - base_prepared_latent[:, :VBD_TRAJECTORY_PRE_WINDOW_COUNT, :].mean(
            axis=(0, 1)
        )
    )
    truth = next(
        (
            candidate
            for candidate in product((0.0, 0.2, 0.5), repeat=3)
            if panel.study_plan_root
            == sha256_json(
                _development_smoke_plan_body(
                    scenario_id=panel.scenario_id,
                    panel_group_count=panel.panel_group_count,
                    aggregate_k=panel.aggregate_k,
                    terminal_truth=candidate,
                    direction_vector=panel.direction_vector,
                    group_correlation=panel.dgp_group_correlation,
                    innovation_correlation=panel.dgp_innovation_correlation,
                    observation_correlation=panel.dgp_observation_correlation,
                )
            )
        ),
        None,
    )
    if truth is None:
        raise TrajectoryStructureError(
            "study plan root does not match regenerated synthetic inputs"
        )
    shifts = np.asarray(truth, dtype=float) - base_terminal
    expected_observed = base_prepared.copy()
    expected_observed[:, VBD_TRAJECTORY_PRE_WINDOW_COUNT:, :] += shifts
    expected_raw_covariance = (
        np.diag(_LANE_SCALES)
        @ (
            np.diag(1.0 / pre_sd)
            @ working_covariance
            @ np.diag(1.0 / pre_sd)
        )
        @ np.diag(_LANE_SCALES)
    )
    _validate_canonical_generated_evidence(
        panel,
        expected_observed,
        expected_raw_covariance,
        identity="seed",
    )


def _generate_vbd_trajectory_smoke_case_legacy(
    *,
    seed: int = VBD_TRAJECTORY_SMOKE_SEED_MIN,
    panel_group_count: int = 6,
    aggregate_k: int = 16,
    terminal_truth: tuple[float, float, float] = (0.5, 0.5, 0.5),
    direction_vector: tuple[int, int, int] = (1, 1, 1),
    scenario_id: str = "development_smoke_primary",
    depth_context_ref: str = "depth-context:a",
    group_correlation: float = VBD_TRAJECTORY_DGP_GROUP_CORRELATION,
    innovation_correlation: float = VBD_TRAJECTORY_DGP_GROUP_CORRELATION,
    observation_correlation: float = VBD_TRAJECTORY_DGP_OBSERVATION_CORRELATION,
) -> VbdTrajectorySyntheticCase:
    """Generate one permanently nonaccepting development-smoke case."""

    validate_vbd_trajectory_runtime()
    validated_seed = validate_longitudinal_seed(seed, name="VBD smoke seed")
    if not VBD_TRAJECTORY_SMOKE_SEED_MIN <= validated_seed <= VBD_TRAJECTORY_SMOKE_SEED_MAX:
        raise ValueError("development smoke must use its disjoint seed namespace")
    if type(panel_group_count) is not int or panel_group_count not in (6, 12):
        raise ValueError("panel group count must be 6 or 12")
    if type(aggregate_k) is not int or aggregate_k < 1:
        raise ValueError("aggregate k must be a positive integer")
    truth_vector = _strict_truth(terminal_truth)
    directions = _strict_direction(direction_vector)
    if type(scenario_id) is not str or not scenario_id.startswith("development_smoke_"):
        raise ValueError("smoke scenario id must use the development namespace")
    for name, value in (
        ("group correlation", group_correlation),
        ("innovation correlation", innovation_correlation),
        ("observation correlation", observation_correlation),
    ):
        if type(value) not in (int, float) or not math.isfinite(value) or not -0.49 < value < 1.0:
            raise ValueError(f"{name} is outside the positive-definite equicorrelation range")

    group_effects, states, observation_errors, working_covariance = _generate_base_paths(
        panel_group_count=panel_group_count,
        aggregate_k=aggregate_k,
        seed=validated_seed,
        group_correlation=group_correlation,
        innovation_correlation=innovation_correlation,
        observation_correlation=observation_correlation,
    )
    tau = _time_encoding()
    base_latent = (
        VBD_TRAJECTORY_DGP_ALPHA
        + VBD_TRAJECTORY_DGP_BETA * tau[None, :, None]
        + group_effects[:, None, :]
        + states
    )
    base_observed = base_latent + observation_errors
    pre_observed = base_observed[:, :VBD_TRAJECTORY_PRE_WINDOW_COUNT, :]
    pre_mean = pre_observed.reshape(-1, 3).mean(axis=0)
    pre_sd = pre_observed.reshape(-1, 3).std(axis=0, ddof=1)
    if not np.all(np.isfinite(pre_sd)) or np.any(pre_sd <= 0.0):
        raise VbdSyntheticRunnerError("generated pre-period scale is invalid")
    prepared_observed = (base_observed - pre_mean[None, None, :]) / pre_sd[None, None, :]
    prepared_latent = (base_latent - pre_mean[None, None, :]) / pre_sd[None, None, :]
    prepared_covariance = (
        np.diag(1.0 / pre_sd)
        @ working_covariance
        @ np.diag(1.0 / pre_sd)
    )
    base_terminal = (
        prepared_latent[:, 15:18, :].mean(axis=(0, 1))
        - prepared_latent[:, :VBD_TRAJECTORY_PRE_WINDOW_COUNT, :].mean(axis=(0, 1))
    )
    shift = np.asarray(truth_vector, dtype=float) - base_terminal
    prepared_observed[:, VBD_TRAJECTORY_PRE_WINDOW_COUNT:, :] += shift
    prepared_latent[:, VBD_TRAJECTORY_PRE_WINDOW_COUNT:, :] += shift
    realized = (
        prepared_latent[:, 15:18, :].mean(axis=(0, 1))
        - prepared_latent[:, :VBD_TRAJECTORY_PRE_WINDOW_COUNT, :].mean(axis=(0, 1))
    )
    if not np.allclose(realized, np.asarray(truth_vector), rtol=0.0, atol=1e-12):
        raise VbdSyntheticRunnerError("generator failed to realize terminal truth")

    raw_covariance = (
        np.diag(_LANE_SCALES)
        @ prepared_covariance
        @ np.diag(_LANE_SCALES)
    )
    plan_ref = "plan:vbd-trajectory-development-smoke-v1"
    plan_hash = sha256_json(
        _development_smoke_plan_body(
            scenario_id=scenario_id,
            panel_group_count=panel_group_count,
            aggregate_k=aggregate_k,
            terminal_truth=truth_vector,
            direction_vector=directions,
            group_correlation=group_correlation,
            innovation_correlation=innovation_correlation,
            observation_correlation=observation_correlation,
        )
    )
    manifest = build_synthetic_reference_manifest(
        panel_group_count,
        aggregate_k=aggregate_k,
        plan_hash=plan_hash,
    )
    direction_root = sha256_json(
        {
            "lane_order": list(VBD_TRAJECTORY_LANES),
            "direction_vector": list(directions),
            "plan_ref": plan_ref,
        }
    )
    tuple_keys = [
        [f"workflow-vbd-{group:02d}", "jbtd-vbd-trajectory", "persona-vbd-synthetic"]
        for group in range(panel_group_count)
    ]
    partition_root = sha256_json(
        {
            "tuple_keys": tuple_keys,
            "disjoint": True,
            "nested": False,
            "complementary": False,
            "differenceable": False,
        }
    )
    depth_context = _depth_context(depth_context_ref)
    bundles = tuple(
        _build_bundle(
            panel_group_index=group,
            window_index=window,
            prepared_values=prepared_observed[group, window, :],
            raw_transformed_covariance=raw_covariance,
            aggregate_k=aggregate_k,
            direction_vector=directions,
            direction_vector_root=direction_root,
            plan_ref=plan_ref,
            plan_hash=plan_hash,
            partition_root=partition_root,
            depth_context=depth_context,
        )
        for group in range(panel_group_count)
        for window in range(VBD_TRAJECTORY_TOTAL_WINDOW_COUNT)
    )
    lane_roots = tuple(
        (
            lane,
            sha256_json(
                [
                    bundle.observations[lane_index].marginal_uncertainty_root
                    for bundle in bundles
                ]
            ),
        )
        for lane_index, lane in enumerate(VBD_TRAJECTORY_LANES)
    )
    model_manifest_root = sha256_json(vbd_trajectory_model_manifest_body())
    placeholder_panel = TrajectoryObservationPanel(
        schema_version=VBD_TRAJECTORY_SCHEMA_VERSION,
        panel_group_count=panel_group_count,
        pre_window_count=VBD_TRAJECTORY_PRE_WINDOW_COUNT,
        post_window_count=VBD_TRAJECTORY_POST_WINDOW_COUNT,
        aggregate_k=aggregate_k,
        direction_vector=directions,
        direction_vector_root=direction_root,
        reference_manifest=manifest,
        bundles=bundles,
        lane_observation_roots=lane_roots,
        ordered_panel_manifest_root="0" * 64,
        depth_context_root=depth_context.context_root,
        cohort_partition_root=partition_root,
        model_manifest_root=model_manifest_root,
        study_plan_root=plan_hash,
        scenario_id=scenario_id,
        dgp_group_correlation=group_correlation,
        dgp_innovation_correlation=innovation_correlation,
        dgp_observation_correlation=observation_correlation,
        seed_namespace="development_smoke_nonacceptance",
        seed=validated_seed,
        generator_id=VBD_TRAJECTORY_GENERATOR_ID,
        rng_id=VBD_TRAJECTORY_RNG_ID,
        seed_manifest_root=sha256_json(
            {
                "seed_namespace": "development_smoke_nonacceptance",
                "seed": validated_seed,
                "generator_id": VBD_TRAJECTORY_GENERATOR_ID,
                "rng_id": VBD_TRAJECTORY_RNG_ID,
                "acceptance_slot_key": None,
            }
        ),
        synthetic_only=True,
        aggregate_only=True,
        real_data_present=False,
        customer_data_present=False,
        production_data_present=False,
        live_data_source_present=False,
    )
    panel = replace(
        placeholder_panel,
        ordered_panel_manifest_root=expected_ordered_panel_manifest_root(
            placeholder_panel
        ),
    )
    validate_trajectory_panel(panel)
    truth = VbdTrajectoryTruth(
        scenario_id=scenario_id,
        seed=validated_seed,
        requested_terminal_truth=truth_vector,
        direction_vector=directions,
        direction_adjusted_truth=tuple(
            float(directions[index] * truth_vector[index]) for index in range(3)
        ),
        transformed_latent_paths=prepared_latent.copy(),
        working_group_effects=group_effects.copy(),
        working_ar1_states=states.copy(),
        pre_observation_mean=tuple(float(value) for value in pre_mean),
        pre_observation_sd=tuple(float(value) for value in pre_sd),
    )
    return VbdTrajectorySyntheticCase(panel=panel, truth=truth)


def _validation_panel_scenario_id(slot: VbdTrajectoryValidationSlot) -> str:
    return f"{slot.family}_{slot.scenario_or_control_id}".replace("=", "_")


def _validation_generation_spec(
    slot: VbdTrajectoryValidationSlot,
    *,
    depth_context_ref: str | None = None,
    require_fit_expected: bool = True,
) -> _VbdTrajectoryGenerationSpec:
    if type(slot) is not VbdTrajectoryValidationSlot:
        raise ValueError("validation generation requires the exact slot type")
    canonical = next(
        (
            candidate
            for candidate in required_vbd_trajectory_validation_slots()
            if candidate.slot_id == slot.slot_id
        ),
        None,
    )
    if canonical is None or slot != canonical:
        raise ValueError("validation generation requires one canonical slot")
    if require_fit_expected and slot.fit_expected is not True:
        raise ValueError("validation generation requires one canonical fit slot")
    context_ref = depth_context_ref
    if context_ref is None:
        context_ref = (
            "depth-context:b"
            if slot.scenario_or_control_id == "depth_context_perturbation"
            else "depth-context:a"
        )
    understate = slot.scenario_or_control_id == "understated_uncertainty"
    return _VbdTrajectoryGenerationSpec(
        scenario_id=_validation_panel_scenario_id(slot),
        seed=slot.seed,
        panel_group_count=slot.panel_group_count,
        aggregate_k=slot.k,
        terminal_truth=slot.truth_vector,
        direction_vector=slot.direction_vector,
        post_pattern=slot.post_pattern,
        correlations=slot.correlations,
        plan_ref=VBD_TRAJECTORY_VALIDATION_PLAN_REF,
        plan_hash=immutable_vbd_trajectory_validation_plan().plan_hash,
        seed_namespace=VBD_TRAJECTORY_VALIDATION_SEED_NAMESPACE,
        acceptance_slot_key=slot.slot_id,
        depth_context_ref=context_ref,
        shock_kind=(
            "common_availability"
            if slot.scenario_or_control_id == "common_availability_shock"
            else None
        ),
        reported_standard_error_ratio=(
            _UNDERSTATED_STANDARD_ERROR_RATIO
            if understate
            else _STANDARD_ERROR_RATIO
        ),
        reported_covariance_ratio=(
            _UNDERSTATED_COVARIANCE_RATIO
            if understate
            else _COVARIANCE_RATIO
        ),
        zero_pre_period_variance=(
            slot.scenario_or_control_id == "zero_pre_period_variance"
        ),
    )


def _generate_vbd_trajectory_case(
    spec: _VbdTrajectoryGenerationSpec,
) -> VbdTrajectorySyntheticCase:
    if type(spec) is not _VbdTrajectoryGenerationSpec:
        raise ValueError("generation spec must use the exact immutable type")
    validate_vbd_trajectory_runtime()
    seed = validate_longitudinal_seed(spec.seed, name="VBD trajectory seed")
    if type(spec.panel_group_count) is not int or spec.panel_group_count not in (6, 12):
        raise ValueError("panel group count must be 6 or 12")
    if type(spec.aggregate_k) is not int or spec.aggregate_k < 1:
        raise ValueError("aggregate k must be a positive integer")
    truth_vector = _strict_internal_truth(spec.terminal_truth)
    directions = _strict_direction(spec.direction_vector)
    correlations = _strict_correlations(spec.correlations)
    if spec.post_pattern not in (
        VBD_TRAJECTORY_SUSTAINED_POST_PATTERN,
        VBD_TRAJECTORY_TEMPORARY_PULSE_POST_PATTERN,
    ):
        raise ValueError("post pattern is not compiled")
    if spec.shock_kind not in (None, "common_availability"):
        raise ValueError("shock kind is not compiled")
    if type(spec.zero_pre_period_variance) is not bool:
        raise ValueError("pre-period variance control is not compiled")
    if spec.zero_pre_period_variance and (
        spec.plan_ref != VBD_TRAJECTORY_VALIDATION_PLAN_REF
        or spec.scenario_id
        != "negative_control_zero_pre_period_variance"
    ):
        raise ValueError("zero-variance generation is outside its compiled control")
    if spec.shock_kind == "common_availability" and (
        spec.post_pattern != VBD_TRAJECTORY_SUSTAINED_POST_PATTERN
        or truth_vector
        != VBD_TRAJECTORY_COMMON_AVAILABILITY_SHOCK_TERMINAL
    ):
        raise ValueError("common availability shock semantics drifted")
    if (
        type(spec.reported_standard_error_ratio) is not float
        or type(spec.reported_covariance_ratio) is not float
        or (
            spec.reported_standard_error_ratio,
            spec.reported_covariance_ratio,
        )
        not in (
            (_STANDARD_ERROR_RATIO, _COVARIANCE_RATIO),
            (
                _UNDERSTATED_STANDARD_ERROR_RATIO,
                _UNDERSTATED_COVARIANCE_RATIO,
            ),
        )
        or not math.isclose(
            spec.reported_standard_error_ratio**2,
            spec.reported_covariance_ratio,
            rel_tol=0.0,
            abs_tol=0.0,
        )
    ):
        raise ValueError("reported uncertainty ratios are not compiled")
    if spec.plan_ref == VBD_TRAJECTORY_SMOKE_PLAN_REF:
        if (
            spec.seed_namespace != VBD_TRAJECTORY_SMOKE_SEED_NAMESPACE
            or spec.acceptance_slot_key is not None
            or not VBD_TRAJECTORY_SMOKE_SEED_MIN
            <= seed
            <= VBD_TRAJECTORY_SMOKE_SEED_MAX
            or not spec.scenario_id.startswith(_DEVELOPMENT_SCENARIO_PREFIX)
        ):
            raise ValueError("development scenario generation is outside smoke")
    elif spec.plan_ref == VBD_TRAJECTORY_VALIDATION_PLAN_REF:
        if (
            spec.seed_namespace != VBD_TRAJECTORY_VALIDATION_SEED_NAMESPACE
            or type(spec.acceptance_slot_key) is not str
            or not spec.acceptance_slot_key
            or spec.plan_hash != immutable_vbd_trajectory_validation_plan().plan_hash
        ):
            raise ValueError("validation generation identity is not compiled")
    elif spec.plan_ref == VBD_TRAJECTORY_CONCORDANCE_PLAN_REF:
        from .vbd_trajectory_concordance import (
            required_vbd_trajectory_concordance_bundles,
            vbd_trajectory_concordance_plan,
        )

        matches = tuple(
            bundle
            for bundle in required_vbd_trajectory_concordance_bundles()
            if bundle.bundle_seed == seed
        )
        if (
            spec.seed_namespace != VBD_TRAJECTORY_CONCORDANCE_SEED_NAMESPACE
            or type(spec.acceptance_slot_key) is not str
            or len(matches) != 1
            or spec.acceptance_slot_key != matches[0].bundle_id
            or spec.plan_hash != vbd_trajectory_concordance_plan()["plan_hash"]
        ):
            raise ValueError("concordance generation identity is not compiled")
    else:
        raise ValueError("synthetic generation plan identity is not compiled")

    group_effects, states, observation_errors, working_covariance = (
        _generate_base_paths(
            panel_group_count=spec.panel_group_count,
            aggregate_k=spec.aggregate_k,
            seed=seed,
            group_correlation=correlations[0],
            innovation_correlation=correlations[1],
            observation_correlation=correlations[2],
        )
    )
    tau = _time_encoding()
    base_latent = (
        VBD_TRAJECTORY_DGP_ALPHA
        + VBD_TRAJECTORY_DGP_BETA * tau[None, :, None]
        + group_effects[:, None, :]
        + states
    )
    base_observed = base_latent + observation_errors
    pre_observed = base_observed[:, :VBD_TRAJECTORY_PRE_WINDOW_COUNT, :]
    pre_mean = pre_observed.reshape(-1, 3).mean(axis=0)
    pre_sd = pre_observed.reshape(-1, 3).std(axis=0, ddof=1)
    if not np.all(np.isfinite(pre_sd)) or np.any(pre_sd <= 0.0):
        raise VbdSyntheticRunnerError("generated pre-period scale is invalid")
    prepared_observed = (
        base_observed - pre_mean[None, None, :]
    ) / pre_sd[None, None, :]
    prepared_latent = (
        base_latent - pre_mean[None, None, :]
    ) / pre_sd[None, None, :]
    prepared_covariance = (
        np.diag(1.0 / pre_sd)
        @ working_covariance
        @ np.diag(1.0 / pre_sd)
    )
    if spec.zero_pre_period_variance:
        prepared_observed[:, :VBD_TRAJECTORY_PRE_WINDOW_COUNT, :] = 0.0
    base_terminal = (
        prepared_latent[:, 15:18, :].mean(axis=(0, 1))
        - prepared_latent[:, :VBD_TRAJECTORY_PRE_WINDOW_COUNT, :].mean(
            axis=(0, 1)
        )
    )
    common_shock_terminal = np.asarray(
        VBD_TRAJECTORY_COMMON_AVAILABILITY_SHOCK_TERMINAL
        if spec.shock_kind == "common_availability"
        else (0.0, 0.0, 0.0),
        dtype=float,
    )
    structural_terminal = np.asarray(truth_vector) - common_shock_terminal
    structural_adjustments = _post_adjustments(
        base_terminal=base_terminal,
        terminal_truth=tuple(float(value) for value in structural_terminal),
        post_pattern=spec.post_pattern,
    )
    common_shock_adjustments = np.zeros_like(structural_adjustments)
    if spec.shock_kind == "common_availability":
        common_shock_adjustments[:, :] = common_shock_terminal[None, :]
    adjustments = structural_adjustments + common_shock_adjustments
    prepared_observed[:, VBD_TRAJECTORY_PRE_WINDOW_COUNT:, :] += adjustments[
        None, :, :
    ]
    prepared_latent[:, VBD_TRAJECTORY_PRE_WINDOW_COUNT:, :] += adjustments[
        None, :, :
    ]
    realized = (
        prepared_latent[:, 15:18, :].mean(axis=(0, 1))
        - prepared_latent[:, :VBD_TRAJECTORY_PRE_WINDOW_COUNT, :].mean(
            axis=(0, 1)
        )
    )
    if not np.allclose(realized, np.asarray(truth_vector), rtol=0.0, atol=1e-12):
        raise VbdSyntheticRunnerError("generator failed to realize terminal truth")

    true_raw_covariance = (
        np.diag(_LANE_SCALES)
        @ prepared_covariance
        @ np.diag(_LANE_SCALES)
    )
    reported_raw_covariance = (
        true_raw_covariance * spec.reported_covariance_ratio
    )
    manifest = build_synthetic_reference_manifest(
        spec.panel_group_count,
        aggregate_k=spec.aggregate_k,
        plan_hash=spec.plan_hash,
        plan_ref=spec.plan_ref,
    )
    direction_root = sha256_json(
        {
            "lane_order": list(VBD_TRAJECTORY_LANES),
            "direction_vector": list(directions),
            "plan_ref": spec.plan_ref,
        }
    )
    tuple_keys = [
        [
            f"workflow-vbd-{group:02d}",
            "jbtd-vbd-trajectory",
            "persona-vbd-synthetic",
        ]
        for group in range(spec.panel_group_count)
    ]
    partition_root = sha256_json(
        {
            "tuple_keys": tuple_keys,
            "disjoint": True,
            "nested": False,
            "complementary": False,
            "differenceable": False,
        }
    )
    depth_context = _depth_context(spec.depth_context_ref)
    bundles = tuple(
        _build_bundle(
            panel_group_index=group,
            window_index=window,
            prepared_values=prepared_observed[group, window, :],
            raw_transformed_covariance=reported_raw_covariance,
            aggregate_k=spec.aggregate_k,
            direction_vector=directions,
            direction_vector_root=direction_root,
            plan_ref=spec.plan_ref,
            plan_hash=spec.plan_hash,
            partition_root=partition_root,
            depth_context=depth_context,
        )
        for group in range(spec.panel_group_count)
        for window in range(VBD_TRAJECTORY_TOTAL_WINDOW_COUNT)
    )
    lane_roots = tuple(
        (
            lane,
            sha256_json(
                [
                    bundle.observations[lane_index].marginal_uncertainty_root
                    for bundle in bundles
                ]
            ),
        )
        for lane_index, lane in enumerate(VBD_TRAJECTORY_LANES)
    )
    placeholder_panel = TrajectoryObservationPanel(
        schema_version=VBD_TRAJECTORY_SCHEMA_VERSION,
        panel_group_count=spec.panel_group_count,
        pre_window_count=VBD_TRAJECTORY_PRE_WINDOW_COUNT,
        post_window_count=VBD_TRAJECTORY_POST_WINDOW_COUNT,
        aggregate_k=spec.aggregate_k,
        direction_vector=directions,
        direction_vector_root=direction_root,
        reference_manifest=manifest,
        bundles=bundles,
        lane_observation_roots=lane_roots,
        ordered_panel_manifest_root="0" * 64,
        depth_context_root=depth_context.context_root,
        cohort_partition_root=partition_root,
        model_manifest_root=sha256_json(vbd_trajectory_model_manifest_body()),
        study_plan_root=spec.plan_hash,
        scenario_id=spec.scenario_id,
        dgp_group_correlation=correlations[0],
        dgp_innovation_correlation=correlations[1],
        dgp_observation_correlation=correlations[2],
        seed_namespace=spec.seed_namespace,
        seed=seed,
        generator_id=VBD_TRAJECTORY_GENERATOR_ID,
        rng_id=VBD_TRAJECTORY_RNG_ID,
        seed_manifest_root=sha256_json(
            {
                "seed_namespace": spec.seed_namespace,
                "seed": seed,
                "generator_id": VBD_TRAJECTORY_GENERATOR_ID,
                "rng_id": VBD_TRAJECTORY_RNG_ID,
                "acceptance_slot_key": spec.acceptance_slot_key,
            }
        ),
        synthetic_only=True,
        aggregate_only=True,
        real_data_present=False,
        customer_data_present=False,
        production_data_present=False,
        live_data_source_present=False,
    )
    panel = replace(
        placeholder_panel,
        ordered_panel_manifest_root=expected_ordered_panel_manifest_root(
            placeholder_panel
        ),
    )
    validate_trajectory_panel(panel)
    true_covariance_tuple = tuple(
        tuple(float(value) for value in row) for row in true_raw_covariance
    )
    truth = VbdTrajectoryTruth(
        scenario_id=spec.scenario_id,
        seed=seed,
        requested_terminal_truth=truth_vector,
        direction_vector=directions,
        direction_adjusted_truth=tuple(
            float(directions[index] * truth_vector[index]) for index in range(3)
        ),
        transformed_latent_paths=prepared_latent.copy(),
        working_group_effects=group_effects.copy(),
        working_ar1_states=states.copy(),
        pre_observation_mean=tuple(float(value) for value in pre_mean),
        pre_observation_sd=tuple(float(value) for value in pre_sd),
        post_pattern=spec.post_pattern,
        shock_kind=spec.shock_kind,
        structural_terminal_truth=tuple(
            float(value) for value in structural_terminal
        ),
        common_shock_terminal_shift=tuple(
            float(value) for value in common_shock_terminal
        ),
        true_raw_transformed_covariance=true_covariance_tuple,
        reported_standard_error_ratio=spec.reported_standard_error_ratio,
        reported_covariance_ratio=spec.reported_covariance_ratio,
    )
    return VbdTrajectorySyntheticCase(panel=panel, truth=truth)


def generate_vbd_trajectory_scenario_smoke_case(
    scenario_key: str,
    *,
    seed: int = VBD_TRAJECTORY_SMOKE_SEED_MIN,
    panel_group_count: int = 6,
    aggregate_k: int = 16,
    depth_context_ref: str = "depth-context:a",
) -> VbdTrajectorySyntheticCase:
    """Exercise compiled scenario mechanics only in the disjoint smoke namespace."""

    validated_seed = validate_longitudinal_seed(
        seed, name="VBD scenario smoke seed"
    )
    if not VBD_TRAJECTORY_SMOKE_SEED_MIN <= validated_seed <= VBD_TRAJECTORY_SMOKE_SEED_MAX:
        raise ValueError("scenario smoke must use its disjoint seed namespace")
    semantics = _development_scenario_semantics(
        scenario_key, depth_context_ref=depth_context_ref
    )
    scenario_id = f"{_DEVELOPMENT_SCENARIO_PREFIX}{scenario_key}"
    plan_body = _development_scenario_plan_body(
        scenario_key=scenario_key,
        scenario_id=scenario_id,
        panel_group_count=panel_group_count,
        aggregate_k=aggregate_k,
        terminal_truth=semantics["terminal_truth"],
        direction_vector=semantics["direction_vector"],
        post_pattern=semantics["post_pattern"],
        correlations=semantics["correlations"],
        shock_kind=semantics["shock_kind"],
        reported_standard_error_ratio=semantics[
            "reported_standard_error_ratio"
        ],
        reported_covariance_ratio=semantics["reported_covariance_ratio"],
    )
    return _generate_vbd_trajectory_case(
        _VbdTrajectoryGenerationSpec(
            scenario_id=scenario_id,
            seed=validated_seed,
            panel_group_count=panel_group_count,
            aggregate_k=aggregate_k,
            terminal_truth=semantics["terminal_truth"],
            direction_vector=semantics["direction_vector"],
            post_pattern=semantics["post_pattern"],
            correlations=semantics["correlations"],
            plan_ref=VBD_TRAJECTORY_SMOKE_PLAN_REF,
            plan_hash=sha256_json(plan_body),
            seed_namespace=VBD_TRAJECTORY_SMOKE_SEED_NAMESPACE,
            acceptance_slot_key=None,
            depth_context_ref=semantics["depth_context_ref"],
            shock_kind=semantics["shock_kind"],
            reported_standard_error_ratio=semantics[
                "reported_standard_error_ratio"
            ],
            reported_covariance_ratio=semantics[
                "reported_covariance_ratio"
            ],
        )
    )


@contextmanager
def _validation_generation_context(
    *,
    capability_hash: str,
    capability_token_hash: str,
    launch_receipt_hash: str,
    _runner_token: object,
):
    hashes = (capability_hash, capability_token_hash, launch_receipt_hash)
    if (
        _runner_token is not _VALIDATION_GENERATION_RUNNER_TOKEN
        or any(
            type(value) is not str
            or len(value) != 64
            or any(character not in "0123456789abcdef" for character in value)
            for value in hashes
        )
    ):
        raise VbdSyntheticRunnerError(
            "validation generation capability is invalid"
        )
    context_token = _VALIDATION_CAPABILITY_HASH.set(
        sha256_json(
            {
                "capability_hash": capability_hash,
                "capability_token_hash": capability_token_hash,
                "launch_receipt_hash": launch_receipt_hash,
            }
        )
    )
    try:
        yield
    finally:
        _VALIDATION_CAPABILITY_HASH.reset(context_token)


def _require_validation_generation_context() -> None:
    if _VALIDATION_CAPABILITY_HASH.get() is None:
        raise VbdSyntheticRunnerError(
            "validation generation requires an admitted child capability"
        )


def generate_vbd_trajectory_validation_case(
    slot: VbdTrajectoryValidationSlot,
) -> VbdTrajectorySyntheticCase:
    """Regenerate one compiled full slot only for the future frozen runner."""

    _require_validation_generation_context()
    return _generate_vbd_trajectory_case(_validation_generation_spec(slot))


@contextmanager
def _concordance_generation_context(
    *,
    capability_hash: str,
    capability_token_hash: str,
    launch_receipt_hash: str,
    _runner_token: object,
):
    hashes = (capability_hash, capability_token_hash, launch_receipt_hash)
    if (
        _runner_token is not _CONCORDANCE_GENERATION_RUNNER_TOKEN
        or any(
            type(value) is not str
            or len(value) != 64
            or any(character not in "0123456789abcdef" for character in value)
            for value in hashes
        )
    ):
        raise VbdSyntheticRunnerError(
            "concordance generation capability is invalid"
        )
    context_token = _CONCORDANCE_CAPABILITY_HASH.set(
        sha256_json(
            {
                "capability_hash": capability_hash,
                "capability_token_hash": capability_token_hash,
                "launch_receipt_hash": launch_receipt_hash,
            }
        )
    )
    try:
        yield
    finally:
        _CONCORDANCE_CAPABILITY_HASH.reset(context_token)


def generate_vbd_trajectory_concordance_case(bundle) -> VbdTrajectorySyntheticCase:
    """Generate one exact concordance bundle only inside an admitted child."""

    from .vbd_trajectory_concordance import (
        VBD_TRAJECTORY_CONCORDANCE_AGGREGATE_K,
        VbdTrajectoryConcordanceBundle,
        required_vbd_trajectory_concordance_bundles,
        vbd_trajectory_concordance_plan,
    )

    if _CONCORDANCE_CAPABILITY_HASH.get() is None:
        raise VbdSyntheticRunnerError(
            "concordance generation requires an admitted child capability"
        )
    if (
        type(bundle) is not VbdTrajectoryConcordanceBundle
        or bundle not in required_vbd_trajectory_concordance_bundles()
    ):
        raise VbdSyntheticRunnerError("concordance bundle is off plan")
    from .vbd_trajectory_validation_resumable import (
        VBD_TRAJECTORY_FREEZE_MANIFEST_RELATIVE_PATH,
        _repo_root,
        _verify_current_freeze,
        read_strict_json,
    )

    _verify_current_freeze(
        read_strict_json(
            _repo_root() / VBD_TRAJECTORY_FREEZE_MANIFEST_RELATIVE_PATH
        )
    )
    effect_token = str(bundle.effect_size_sd).replace(".", "p")
    return _generate_vbd_trajectory_case(
        _VbdTrajectoryGenerationSpec(
            scenario_id=(
                f"concordance_effect_{effect_token}_"
                f"groups_{bundle.panel_group_count}_seed_{bundle.seed_index}"
            ),
            seed=bundle.bundle_seed,
            panel_group_count=bundle.panel_group_count,
            aggregate_k=VBD_TRAJECTORY_CONCORDANCE_AGGREGATE_K,
            terminal_truth=(
                bundle.effect_size_sd,
                bundle.effect_size_sd,
                bundle.effect_size_sd,
            ),
            direction_vector=(1, 1, 1),
            post_pattern=VBD_TRAJECTORY_SUSTAINED_POST_PATTERN,
            correlations=(
                VBD_TRAJECTORY_DGP_GROUP_CORRELATION,
                VBD_TRAJECTORY_DGP_GROUP_CORRELATION,
                VBD_TRAJECTORY_DGP_OBSERVATION_CORRELATION,
            ),
            plan_ref=VBD_TRAJECTORY_CONCORDANCE_PLAN_REF,
            plan_hash=vbd_trajectory_concordance_plan()["plan_hash"],
            seed_namespace=VBD_TRAJECTORY_CONCORDANCE_SEED_NAMESPACE,
            acceptance_slot_key=bundle.bundle_id,
            depth_context_ref="depth-context:a",
            shock_kind=None,
            reported_standard_error_ratio=_STANDARD_ERROR_RATIO,
            reported_covariance_ratio=_COVARIANCE_RATIO,
        )
    )


def vbd_trajectory_precision_canary_case_body(canary_ordinal: int) -> dict:
    if type(canary_ordinal) is not int or canary_ordinal not in (0, 1):
        raise ValueError("precision canary ordinal must be 0 or 1")
    effect_size_sd, panel_group_count = (
        (0.0, 6) if canary_ordinal == 0 else (0.5, 12)
    )
    return {
        "canary_ordinal": canary_ordinal,
        "effect_size_sd": effect_size_sd,
        "panel_group_count": panel_group_count,
        "aggregate_k": 16,
        "bundle_seed": 2_055_900_100 + canary_ordinal,
        "direction_vector": [1, 1, 1],
        "seed_namespace": VBD_TRAJECTORY_SMOKE_SEED_NAMESPACE,
        "acceptance_slot_key": None,
        "hold_reason": "precision_canary_nonacceptance",
        "acceptance_evidence_eligible": False,
        "internal_only": True,
        "synthetic_only": True,
        "customer_output_authorized": False,
    }


def generate_vbd_trajectory_precision_canary_case(
    canary_ordinal: int,
    *,
    _runner_token: object,
) -> VbdTrajectorySyntheticCase:
    """Generate one exact, permanently non-admissible precision canary."""

    if _runner_token is not _PRECISION_CANARY_GENERATION_RUNNER_TOKEN:
        raise VbdSyntheticRunnerError(
            "precision canary generation requires its runner token"
        )
    body = vbd_trajectory_precision_canary_case_body(canary_ordinal)
    effect = float(body["effect_size_sd"])
    plan_hash = sha256_json(body)
    return _generate_vbd_trajectory_case(
        _VbdTrajectoryGenerationSpec(
            scenario_id=(
                f"{_DEVELOPMENT_SCENARIO_PREFIX}precision_canary_{canary_ordinal}"
            ),
            seed=body["bundle_seed"],
            panel_group_count=body["panel_group_count"],
            aggregate_k=body["aggregate_k"],
            terminal_truth=(effect, effect, effect),
            direction_vector=(1, 1, 1),
            post_pattern=VBD_TRAJECTORY_SUSTAINED_POST_PATTERN,
            correlations=(
                VBD_TRAJECTORY_DGP_GROUP_CORRELATION,
                VBD_TRAJECTORY_DGP_GROUP_CORRELATION,
                VBD_TRAJECTORY_DGP_OBSERVATION_CORRELATION,
            ),
            plan_ref=VBD_TRAJECTORY_SMOKE_PLAN_REF,
            plan_hash=plan_hash,
            seed_namespace=VBD_TRAJECTORY_SMOKE_SEED_NAMESPACE,
            acceptance_slot_key=None,
            depth_context_ref="depth-context:a",
            shock_kind=None,
            reported_standard_error_ratio=_STANDARD_ERROR_RATIO,
            reported_covariance_ratio=_COVARIANCE_RATIO,
        )
    )


def _generate_vbd_trajectory_depth_validation_pair(
    slot: VbdTrajectoryValidationSlot,
) -> tuple[VbdTrajectorySyntheticCase, VbdTrajectorySyntheticCase]:
    _require_validation_generation_context()
    if slot.scenario_or_control_id != "depth_context_perturbation":
        raise ValueError("Depth pair requires the compiled perturbation slot")
    return (
        _generate_vbd_trajectory_case(
            _validation_generation_spec(slot, depth_context_ref="depth-context:a")
        ),
        _generate_vbd_trajectory_case(
            _validation_generation_spec(slot, depth_context_ref="depth-context:b")
        ),
    )


def _generate_vbd_trajectory_control_base(
    slot: VbdTrajectoryValidationSlot,
) -> VbdTrajectorySyntheticCase:
    _require_validation_generation_context()
    if slot.fit_expected is True:
        raise ValueError("control base requires a structural-control slot")
    return _generate_vbd_trajectory_case(
        _validation_generation_spec(slot, require_fit_expected=False)
    )


def _spec_for_panel(panel: TrajectoryObservationPanel) -> _VbdTrajectoryGenerationSpec:
    if panel.seed_namespace == VBD_TRAJECTORY_VALIDATION_SEED_NAMESPACE:
        matches = tuple(
            slot
            for slot in required_vbd_trajectory_validation_slots()
            if slot.seed == panel.seed
        )
        if len(matches) != 1:
            raise TrajectoryStructureError(
                "validation seed does not resolve one compiled slot"
            )
        return _validation_generation_spec(
            matches[0], require_fit_expected=False
        )
    if panel.seed_namespace == VBD_TRAJECTORY_CONCORDANCE_SEED_NAMESPACE:
        from .vbd_trajectory_concordance import (
            VBD_TRAJECTORY_CONCORDANCE_AGGREGATE_K,
            required_vbd_trajectory_concordance_bundles,
            vbd_trajectory_concordance_plan,
        )

        matches = tuple(
            bundle
            for bundle in required_vbd_trajectory_concordance_bundles()
            if bundle.bundle_seed == panel.seed
        )
        if len(matches) != 1:
            raise TrajectoryStructureError(
                "concordance seed does not resolve one compiled bundle"
            )
        bundle = matches[0]
        effect_token = str(bundle.effect_size_sd).replace(".", "p")
        return _VbdTrajectoryGenerationSpec(
            scenario_id=(
                f"concordance_effect_{effect_token}_"
                f"groups_{bundle.panel_group_count}_seed_{bundle.seed_index}"
            ),
            seed=bundle.bundle_seed,
            panel_group_count=bundle.panel_group_count,
            aggregate_k=VBD_TRAJECTORY_CONCORDANCE_AGGREGATE_K,
            terminal_truth=(
                bundle.effect_size_sd,
                bundle.effect_size_sd,
                bundle.effect_size_sd,
            ),
            direction_vector=(1, 1, 1),
            post_pattern=VBD_TRAJECTORY_SUSTAINED_POST_PATTERN,
            correlations=(
                VBD_TRAJECTORY_DGP_GROUP_CORRELATION,
                VBD_TRAJECTORY_DGP_GROUP_CORRELATION,
                VBD_TRAJECTORY_DGP_OBSERVATION_CORRELATION,
            ),
            plan_ref=VBD_TRAJECTORY_CONCORDANCE_PLAN_REF,
            plan_hash=vbd_trajectory_concordance_plan()["plan_hash"],
            seed_namespace=VBD_TRAJECTORY_CONCORDANCE_SEED_NAMESPACE,
            acceptance_slot_key=bundle.bundle_id,
            depth_context_ref="depth-context:a",
            shock_kind=None,
            reported_standard_error_ratio=_STANDARD_ERROR_RATIO,
            reported_covariance_ratio=_COVARIANCE_RATIO,
        )
    precision_identity = next(
        (
            ordinal
            for ordinal in (0, 1)
            if panel.seed == 2_055_900_100 + ordinal
            and panel.scenario_id
            == f"{_DEVELOPMENT_SCENARIO_PREFIX}precision_canary_{ordinal}"
        ),
        None,
    )
    if (
        panel.seed_namespace == VBD_TRAJECTORY_SMOKE_SEED_NAMESPACE
        and precision_identity is not None
    ):
        ordinal = precision_identity
        body = vbd_trajectory_precision_canary_case_body(ordinal)
        expected_scenario = (
            f"{_DEVELOPMENT_SCENARIO_PREFIX}precision_canary_{ordinal}"
        )
        effect = float(body["effect_size_sd"])
        return _VbdTrajectoryGenerationSpec(
            scenario_id=expected_scenario,
            seed=body["bundle_seed"],
            panel_group_count=body["panel_group_count"],
            aggregate_k=body["aggregate_k"],
            terminal_truth=(effect, effect, effect),
            direction_vector=(1, 1, 1),
            post_pattern=VBD_TRAJECTORY_SUSTAINED_POST_PATTERN,
            correlations=(
                VBD_TRAJECTORY_DGP_GROUP_CORRELATION,
                VBD_TRAJECTORY_DGP_GROUP_CORRELATION,
                VBD_TRAJECTORY_DGP_OBSERVATION_CORRELATION,
            ),
            plan_ref=VBD_TRAJECTORY_SMOKE_PLAN_REF,
            plan_hash=sha256_json(body),
            seed_namespace=VBD_TRAJECTORY_SMOKE_SEED_NAMESPACE,
            acceptance_slot_key=None,
            depth_context_ref="depth-context:a",
            shock_kind=None,
            reported_standard_error_ratio=_STANDARD_ERROR_RATIO,
            reported_covariance_ratio=_COVARIANCE_RATIO,
        )
    if not panel.scenario_id.startswith(_DEVELOPMENT_SCENARIO_PREFIX):
        raise TrajectoryStructureError("synthetic scenario is outside compiled smoke")
    scenario_key = panel.scenario_id.removeprefix(_DEVELOPMENT_SCENARIO_PREFIX)
    depth = panel.bundles[0].depth_context
    depth_ref = (
        depth.context_ref if depth is not None else "depth-context:unavailable"
    )
    semantics = _development_scenario_semantics(
        scenario_key, depth_context_ref=depth_ref
    )
    plan_body = _development_scenario_plan_body(
        scenario_key=scenario_key,
        scenario_id=panel.scenario_id,
        panel_group_count=panel.panel_group_count,
        aggregate_k=panel.aggregate_k,
        terminal_truth=semantics["terminal_truth"],
        direction_vector=semantics["direction_vector"],
        post_pattern=semantics["post_pattern"],
        correlations=semantics["correlations"],
        shock_kind=semantics["shock_kind"],
        reported_standard_error_ratio=semantics[
            "reported_standard_error_ratio"
        ],
        reported_covariance_ratio=semantics["reported_covariance_ratio"],
    )
    return _VbdTrajectoryGenerationSpec(
        scenario_id=panel.scenario_id,
        seed=panel.seed,
        panel_group_count=panel.panel_group_count,
        aggregate_k=panel.aggregate_k,
        terminal_truth=semantics["terminal_truth"],
        direction_vector=semantics["direction_vector"],
        post_pattern=semantics["post_pattern"],
        correlations=semantics["correlations"],
        plan_ref=VBD_TRAJECTORY_SMOKE_PLAN_REF,
        plan_hash=sha256_json(plan_body),
        seed_namespace=VBD_TRAJECTORY_SMOKE_SEED_NAMESPACE,
        acceptance_slot_key=None,
        depth_context_ref=depth_ref,
        shock_kind=semantics["shock_kind"],
        reported_standard_error_ratio=semantics[
            "reported_standard_error_ratio"
        ],
        reported_covariance_ratio=semantics["reported_covariance_ratio"],
    )


def _validate_general_generated_panel(
    panel: TrajectoryObservationPanel,
) -> None:
    spec = _spec_for_panel(panel)
    group_effects, states, observation_errors, working_covariance = (
        _generate_base_paths(
            panel_group_count=panel.panel_group_count,
            aggregate_k=panel.aggregate_k,
            seed=panel.seed,
            group_correlation=panel.dgp_group_correlation,
            innovation_correlation=panel.dgp_innovation_correlation,
            observation_correlation=panel.dgp_observation_correlation,
        )
    )
    tau = _time_encoding()
    base_latent = (
        VBD_TRAJECTORY_DGP_ALPHA
        + VBD_TRAJECTORY_DGP_BETA * tau[None, :, None]
        + group_effects[:, None, :]
        + states
    )
    base_observed = base_latent + observation_errors
    pre = base_observed[:, :VBD_TRAJECTORY_PRE_WINDOW_COUNT, :]
    pre_mean = pre.reshape(-1, 3).mean(axis=0)
    pre_sd = pre.reshape(-1, 3).std(axis=0, ddof=1)
    if not np.all(np.isfinite(pre_sd)) or np.any(pre_sd <= 0.0):
        raise TrajectoryStructureError("seeded DGP pre-period scale is invalid")
    expected = (base_observed - pre_mean[None, None, :]) / pre_sd[
        None, None, :
    ]
    base_latent_prepared = (
        base_latent - pre_mean[None, None, :]
    ) / pre_sd[None, None, :]
    base_terminal = (
        base_latent_prepared[:, 15:18, :].mean(axis=(0, 1))
        - base_latent_prepared[:, :VBD_TRAJECTORY_PRE_WINDOW_COUNT, :].mean(
            axis=(0, 1)
        )
    )
    expected[:, VBD_TRAJECTORY_PRE_WINDOW_COUNT:, :] += _post_adjustments(
        base_terminal=base_terminal,
        terminal_truth=spec.terminal_truth,
        post_pattern=spec.post_pattern,
    )[None, :, :]
    if spec.zero_pre_period_variance:
        expected[:, :VBD_TRAJECTORY_PRE_WINDOW_COUNT, :] = 0.0
    true_prepared_covariance = (
        np.diag(1.0 / pre_sd)
        @ working_covariance
        @ np.diag(1.0 / pre_sd)
    )
    expected_raw_covariance = (
        np.diag(_LANE_SCALES)
        @ true_prepared_covariance
        @ np.diag(_LANE_SCALES)
        * spec.reported_covariance_ratio
    )
    _validate_canonical_generated_evidence(
        panel,
        expected,
        expected_raw_covariance,
        identity="scenario",
    )
    if panel.study_plan_root != spec.plan_hash:
        raise TrajectoryStructureError(
            "study plan root does not match regenerated scenario inputs"
        )


def validate_vbd_trajectory_synthetic_generation(
    panel: TrajectoryObservationPanel,
) -> None:
    """Regenerate smoke or runner-owned compiled inputs before every fit."""

    if (
        panel.seed_namespace == VBD_TRAJECTORY_SMOKE_SEED_NAMESPACE
        and not panel.scenario_id.startswith(_DEVELOPMENT_SCENARIO_PREFIX)
    ):
        _validate_vbd_trajectory_synthetic_generation_legacy(panel)
        return
    _validate_general_generated_panel(panel)


def generate_vbd_trajectory_smoke_case(
    *,
    seed: int = VBD_TRAJECTORY_SMOKE_SEED_MIN,
    panel_group_count: int = 6,
    aggregate_k: int = 16,
    terminal_truth: tuple[float, float, float] = (0.5, 0.5, 0.5),
    direction_vector: tuple[int, int, int] = (1, 1, 1),
    scenario_id: str = "development_smoke_primary",
    depth_context_ref: str = "depth-context:a",
    group_correlation: float = VBD_TRAJECTORY_DGP_GROUP_CORRELATION,
    innovation_correlation: float = VBD_TRAJECTORY_DGP_GROUP_CORRELATION,
    observation_correlation: float = VBD_TRAJECTORY_DGP_OBSERVATION_CORRELATION,
) -> VbdTrajectorySyntheticCase:
    """Preserve the original permanent-HOLD smoke interface and bytes."""

    return _generate_vbd_trajectory_smoke_case_legacy(
        seed=seed,
        panel_group_count=panel_group_count,
        aggregate_k=aggregate_k,
        terminal_truth=terminal_truth,
        direction_vector=direction_vector,
        scenario_id=scenario_id,
        depth_context_ref=depth_context_ref,
        group_correlation=group_correlation,
        innovation_correlation=innovation_correlation,
        observation_correlation=observation_correlation,
    )
