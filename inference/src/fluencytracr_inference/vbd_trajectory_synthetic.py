"""Deterministic three-lane aggregate generator for VBD trajectory proof work."""

from __future__ import annotations

from dataclasses import dataclass, replace
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
    VBD_TRAJECTORY_STATISTICS,
    VBD_TRAJECTORY_SMOKE_SEED_MAX,
    VBD_TRAJECTORY_SMOKE_SEED_MIN,
    VBD_TRAJECTORY_SYNTHETIC_DERIVATION,
    VBD_TRAJECTORY_TOTAL_WINDOW_COUNT,
    VBD_TRAJECTORY_TRANSFORMS,
    VBD_TRAJECTORY_UNITS,
    aggregate_output_hash_body,
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


@dataclass(frozen=True, eq=False)
class VbdTrajectorySyntheticCase:
    panel: TrajectoryObservationPanel
    truth: VbdTrajectoryTruth


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
            ref="plan:vbd-trajectory-development-smoke-v1",
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
    bound_hashes["plan:vbd-trajectory-development-smoke-v1"] = plan_hash
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
) -> TrajectoryReferenceManifest:
    entries = _reference_entries(
        panel_group_count, aggregate_k=aggregate_k, plan_hash=plan_hash
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
        return result
    denominator = (
        VBD_TRAJECTORY_ELIGIBLE_DAY_COUNT
        if lane_index == 1
        else VBD_TRAJECTORY_ELIGIBLE_SURFACE_COUNT
    )
    if not math.isfinite(transformed) or not 0.0 < transformed < math.pi / 2.0:
        raise VbdSyntheticRunnerError("proportion inverse transform left its regular domain")
    return float(denominator * math.sin(transformed) ** 2)


def _distribution(lane_index: int, prepared_value: float) -> PrimitiveDistribution:
    values = {
        name: _inverse_lane(
            lane_index,
            float(
                _LANE_OFFSETS[lane_index]
                + _LANE_SCALES[lane_index] * (prepared_value + delta)
            ),
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
    transformed_p50 = float(
        _LANE_OFFSETS[lane_index] + _LANE_SCALES[lane_index] * prepared_value
    )
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
        transformed_standard_error=float(raw_transformed_se),
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
    raw_standard_errors = np.sqrt(np.diag(raw_transformed_covariance))
    observations = tuple(
        _primitive_observation(
            lane_index=lane_index,
            prepared_value=float(prepared_values[lane_index]),
            raw_transformed_se=float(raw_standard_errors[lane_index]),
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
        plan_ref="plan:vbd-trajectory-development-smoke-v1",
        plan_hash=plan_hash,
        direction_vector=direction_vector,
        direction_vector_root=direction_vector_root,
        covariance_lane_order=VBD_TRAJECTORY_COVARIANCE_LANE_ORDER,
        transformed_covariance=tuple(
            tuple(float(value) for value in row)
            for row in raw_transformed_covariance
        ),
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


def validate_vbd_trajectory_synthetic_generation(
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
    actual_prepared = np.empty_like(base_prepared)
    for bundle in panel.bundles:
        for lane_index, observation in enumerate(bundle.observations):
            actual_prepared[
                bundle.panel_group_index, bundle.window_index, lane_index
            ] = (
                observation.transformed_p50 - _LANE_OFFSETS[lane_index]
            ) / _LANE_SCALES[lane_index]
    delta = actual_prepared - base_prepared
    if not np.allclose(
        delta[:, :VBD_TRAJECTORY_PRE_WINDOW_COUNT, :],
        0.0,
        rtol=0.0,
        atol=1e-12,
    ):
        raise TrajectoryStructureError(
            "panel observations do not regenerate from the declared seed"
        )
    truth: list[float] = []
    shifts: list[float] = []
    for lane_index in range(3):
        post_delta = delta[:, VBD_TRAJECTORY_PRE_WINDOW_COUNT:, lane_index]
        shift = float(post_delta.flat[0])
        if not np.allclose(post_delta, shift, rtol=0.0, atol=1e-12):
            raise TrajectoryStructureError(
                "panel post movement is not a constant synthetic shift"
            )
        realized_truth = float(base_terminal[lane_index] + shift)
        matched = next(
            (
                candidate
                for candidate in (0.0, 0.2, 0.5)
                if np.allclose(
                    realized_truth, candidate, rtol=0.0, atol=1e-12
                )
            ),
            None,
        )
        if matched is None:
            raise TrajectoryStructureError(
                "panel post movement is not a compiled constant synthetic effect"
            )
        truth.append(matched)
        shifts.append(shift)
    expected_observed = base_prepared.copy()
    expected_observed[:, VBD_TRAJECTORY_PRE_WINDOW_COUNT:, :] += np.asarray(
        shifts, dtype=float
    )
    if not np.allclose(
        actual_prepared, expected_observed, rtol=0.0, atol=1e-12
    ):
        raise TrajectoryStructureError("panel seeded observation regeneration drifted")
    expected_raw_covariance = (
        np.diag(_LANE_SCALES)
        @ (
            np.diag(1.0 / pre_sd)
            @ working_covariance
            @ np.diag(1.0 / pre_sd)
        )
        @ np.diag(_LANE_SCALES)
    )
    for bundle in panel.bundles:
        if not np.allclose(
            np.asarray(bundle.transformed_covariance, dtype=float),
            expected_raw_covariance,
            rtol=0.0,
            atol=1e-15,
        ):
            raise TrajectoryStructureError(
                "panel covariance does not regenerate from the declared seed"
            )
    expected_plan_root = sha256_json(
        _development_smoke_plan_body(
            scenario_id=panel.scenario_id,
            panel_group_count=panel.panel_group_count,
            aggregate_k=panel.aggregate_k,
            terminal_truth=tuple(truth),
            direction_vector=panel.direction_vector,
            group_correlation=panel.dgp_group_correlation,
            innovation_correlation=panel.dgp_innovation_correlation,
            observation_correlation=panel.dgp_observation_correlation,
        )
    )
    if panel.study_plan_root != expected_plan_root:
        raise TrajectoryStructureError(
            "study plan root does not match regenerated synthetic inputs"
        )


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
