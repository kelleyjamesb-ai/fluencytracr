"""Runner-owned mechanical controls for the fixed VBD trajectory study.

The only runner-facing operation accepts one canonical compiled slot. Control
inputs, mutations, expected stages, and generator ownership are all fixed in
this module; callers cannot provide a panel, mutation, value, or failure stage.
"""

from __future__ import annotations

from dataclasses import dataclass, replace
from functools import lru_cache
import math
from types import MappingProxyType
from typing import Callable

from .hashing import sha256_json
from .vbd_trajectory_bootstrap_conformance import (
    VBD_BOOTSTRAP_EXPECTED_NEAREST_P50,
    VBD_BOOTSTRAP_EXPECTED_TYPE7_P50,
    run_bootstrap_conformance,
)
from .vbd_trajectory_preparation import (
    TrajectoryPreparationError,
    prepare_vbd_trajectory_lane,
    validate_prepared_vbd_trajectory,
)
from .vbd_trajectory_state_space import fit_vbd_trajectory_state_space
from .vbd_trajectory_synthetic import (
    VBD_TRAJECTORY_COMMON_AVAILABILITY_SHOCK_TERMINAL,
    VbdSyntheticRunnerError,
    VbdTrajectorySyntheticCase,
    _generate_vbd_trajectory_control_base,
    _generate_vbd_trajectory_depth_validation_pair,
    _rebind_bundle_hashes,
    generate_vbd_trajectory_validation_case,
)
from .vbd_trajectory_types import (
    PrimitiveDistribution,
    TrajectoryCovarianceError,
    TrajectoryObservationBundle,
    TrajectoryObservationPanel,
    TrajectoryStructureError,
    VBD_TRAJECTORY_LANES,
    VBD_TRAJECTORY_TOTAL_WINDOW_COUNT,
    _assert_no_forbidden_keys,
    expected_ordered_panel_manifest_root,
    validate_trajectory_lane_window_manifest,
    validate_trajectory_panel,
)
from .vbd_trajectory_validation_plan import (
    VBD_TRAJECTORY_VALIDATION_DRIFT_ORDER,
    VBD_TRAJECTORY_VALIDATION_FLOOR_K_ORDER,
    VBD_TRAJECTORY_VALIDATION_NEGATIVE_CONTROL_ORDER,
    VbdTrajectoryValidationSlot,
    _compiled_gate_and_mutation_contract,
    required_vbd_trajectory_validation_slots,
)
from .vbd_trajectory_validation_study import (
    VbdTrajectoryLaneResult,
    VbdTrajectorySlotResult,
    _expected_failure_code,
    _expected_result_stage,
    _expected_row_state,
    build_vbd_trajectory_lane_result,
    build_vbd_trajectory_slot_result,
    evaluate_vbd_trajectory_result_manifest,
)


_VBD_TRAJECTORY_CONTROL_RUNNER_TOKEN = object()
_STRUCTURAL_DRIFT_IDS = VBD_TRAJECTORY_VALIDATION_DRIFT_ORDER[:5]
_BAD_NEAREST_QUANTILE_ID = "nearest_index_rounding_v1"
_BAD_NON_PSD_CORRELATION = (
    (1.0, 0.9, 0.9),
    (0.9, 1.0, -0.9),
    (0.9, -0.9, 1.0),
)
_COMPILED_MUTATIONS = _compiled_gate_and_mutation_contract()
if (
    _COMPILED_MUTATIONS["ceiling_mutations"]["engagement_ceiling"]
    != [59, 60, 60, 60]
    or _COMPILED_MUTATIONS["ceiling_mutations"]["breadth_ceiling"]
    != [11, 12, 12, 12]
    or _COMPILED_MUTATIONS["covariance_mutations"]["non_psd_correlation"]
    != [list(row) for row in _BAD_NON_PSD_CORRELATION]
):
    raise RuntimeError("VBD control mechanics drifted from the plan root")


class VbdTrajectoryControlExecutionError(RuntimeError):
    """A fixed control did not reach its exact compiled outcome."""


class _ExpectedControlFailure(RuntimeError):
    def __init__(self, stage: str, code: str):
        super().__init__(code)
        self.stage = stage
        self.code = code


@dataclass(frozen=True, slots=True)
class _ControlSpecification:
    family: str
    case_id: str
    mutation: str
    expected_stage: str
    control_code: str


def _spec(
    family: str,
    case_id: str,
    expected_stage: str,
    control_code: str | None = None,
) -> _ControlSpecification:
    return _ControlSpecification(
        family=family,
        case_id=case_id,
        mutation=case_id.replace("=", "_"),
        expected_stage=expected_stage,
        control_code=control_code or case_id.replace("=", "_"),
    )


_CONTROL_SPECIFICATIONS = MappingProxyType(
    {
        ("drift", "quantile_algorithm_drift"): _spec(
            "drift", "quantile_algorithm_drift", "quantile_algorithm_gate_before_fit"
        ),
        ("drift", "run_definition_drift"): _spec(
            "drift", "run_definition_drift", "definition_binding_gate_before_fit"
        ),
        ("drift", "active_membership_commitment_drift"): _spec(
            "drift",
            "active_membership_commitment_drift",
            "active_membership_commitment_gate_before_fit",
        ),
        ("drift", "eligible_day_denominator_drift"): _spec(
            "drift",
            "eligible_day_denominator_drift",
            "denominator_gate_before_fit",
        ),
        ("drift", "surface_taxonomy_drift"): _spec(
            "drift", "surface_taxonomy_drift", "taxonomy_gate_before_fit"
        ),
        ("floor", "k=4"): _spec(
            "floor", "k=4", "aggregate_minimum_gate_before_fit", "aggregate_minimum"
        ),
        ("floor", "k=5"): _spec(
            "floor", "k=5", "series_read_path_evidence_floor_after_fit"
        ),
        ("floor", "k=8"): _spec(
            "floor", "k=8", "series_read_path_evidence_floor_after_fit"
        ),
        ("floor", "k=10"): _spec("floor", "k=10", "none"),
        ("floor", "k=12"): _spec("floor", "k=12", "none"),
        ("floor", "k=16"): _spec("floor", "k=16", "none"),
        ("negative_control", "common_availability_shock"): _spec(
            "negative_control", "common_availability_shock", "none"
        ),
        ("negative_control", "depth_context_perturbation"): _spec(
            "negative_control", "depth_context_perturbation", "none"
        ),
        ("negative_control", "weak_history"): _spec(
            "negative_control", "weak_history", "history_length_gate_before_fit"
        ),
        ("negative_control", "zero_pre_period_variance"): _spec(
            "negative_control",
            "zero_pre_period_variance",
            "pre_period_scale_gate_before_fit",
        ),
        ("negative_control", "engagement_ceiling"): _spec(
            "negative_control", "engagement_ceiling", "p50_domain_gate_before_fit"
        ),
        ("negative_control", "breadth_ceiling"): _spec(
            "negative_control", "breadth_ceiling", "p50_domain_gate_before_fit"
        ),
        ("negative_control", "missing_window"): _spec(
            "negative_control",
            "missing_window",
            "window_completeness_gate_before_fit",
        ),
        ("negative_control", "suppressed_window"): _spec(
            "negative_control", "suppressed_window", "suppression_gate_before_fit"
        ),
        ("negative_control", "stale_window"): _spec(
            "negative_control", "stale_window", "staleness_gate_before_fit"
        ),
        ("negative_control", "imputed_window"): _spec(
            "negative_control", "imputed_window", "imputation_gate_before_fit"
        ),
        ("negative_control", "duplicate_window"): _spec(
            "negative_control",
            "duplicate_window",
            "window_uniqueness_gate_before_fit",
        ),
        ("negative_control", "off_plan_window"): _spec(
            "negative_control", "off_plan_window", "plan_membership_gate_before_fit"
        ),
        ("negative_control", "legacy_composite_input"): _spec(
            "negative_control",
            "legacy_composite_input",
            "prohibited_composite_gate_before_fit",
        ),
        ("negative_control", "breadth_duplicated_in_velocity"): _spec(
            "negative_control",
            "breadth_duplicated_in_velocity",
            "statistic_identity_gate_before_fit",
        ),
        ("negative_control", "numeric_depth_dependency"): _spec(
            "negative_control",
            "numeric_depth_dependency",
            "depth_dependency_gate_before_fit",
        ),
        ("negative_control", "post_period_standardization"): _spec(
            "negative_control",
            "post_period_standardization",
            "pre_period_standardization_gate_before_fit",
        ),
        ("negative_control", "lookahead_window"): _spec(
            "negative_control", "lookahead_window", "lookahead_gate_before_fit"
        ),
        ("negative_control", "lane_window_misalignment"): _spec(
            "negative_control",
            "lane_window_misalignment",
            "lane_alignment_gate_before_fit",
        ),
        ("negative_control", "blueprint_target_contamination"): _spec(
            "negative_control",
            "blueprint_target_contamination",
            "blueprint_contamination_gate_before_fit",
        ),
        ("negative_control", "outcome_contamination"): _spec(
            "negative_control",
            "outcome_contamination",
            "outcome_contamination_gate_before_fit",
        ),
        ("negative_control", "fluency_contamination"): _spec(
            "negative_control",
            "fluency_contamination",
            "fluency_contamination_gate_before_fit",
        ),
        ("negative_control", "semantic_hash_drift"): _spec(
            "negative_control",
            "semantic_hash_drift",
            "semantic_hash_gate_before_fit",
        ),
        ("negative_control", "copied_recompute"): _spec(
            "negative_control",
            "copied_recompute",
            "recomputation_isolation_gate_before_fit",
        ),
        ("negative_control", "direct_identifier"): _spec(
            "negative_control",
            "direct_identifier",
            "direct_identifier_gate_before_fit",
        ),
        ("negative_control", "raw_content"): _spec(
            "negative_control", "raw_content", "raw_content_gate_before_fit"
        ),
        ("negative_control", "real_data_flags"): _spec(
            "negative_control", "real_data_flags", "data_boundary_gate_before_fit"
        ),
        ("negative_control", "runner_error"): _spec(
            "negative_control", "runner_error", "runner_execution"
        ),
        ("negative_control", "partial_study"): _spec(
            "negative_control", "partial_study", "combine_exact_key_set"
        ),
        ("negative_control", "self_completion"): _spec(
            "negative_control", "self_completion", "artifact_governance_validation"
        ),
        ("negative_control", "unsafe_output_flags"): _spec(
            "negative_control",
            "unsafe_output_flags",
            "artifact_governance_validation",
        ),
        ("negative_control", "missing_joint_covariance"): _spec(
            "negative_control",
            "missing_joint_covariance",
            "required_covariance_presence_gate_before_fit",
        ),
        ("negative_control", "permuted_covariance_lane_order"): _spec(
            "negative_control",
            "permuted_covariance_lane_order",
            "covariance_lane_order_gate_before_fit",
        ),
        ("negative_control", "covariance_diagonal_mismatch"): _spec(
            "negative_control",
            "covariance_diagonal_mismatch",
            "covariance_diagonal_consistency_gate_before_fit",
        ),
        ("negative_control", "non_psd_covariance"): _spec(
            "negative_control", "non_psd_covariance", "covariance_psd_gate_before_fit"
        ),
    }
)


_EXPECTED_SPEC_KEYS = {
    *(('drift', value) for value in _STRUCTURAL_DRIFT_IDS),
    *(('floor', f'k={value}') for value in VBD_TRAJECTORY_VALIDATION_FLOOR_K_ORDER),
    *(('negative_control', value) for value in VBD_TRAJECTORY_VALIDATION_NEGATIVE_CONTROL_ORDER),
}
if set(_CONTROL_SPECIFICATIONS) != _EXPECTED_SPEC_KEYS:
    raise RuntimeError("VBD trajectory control specification is incomplete")


@lru_cache(maxsize=1)
def _canonical_slots_by_id() -> dict[str, VbdTrajectoryValidationSlot]:
    return {slot.slot_id: slot for slot in required_vbd_trajectory_validation_slots()}


def _canonical_control_slot(
    slot: VbdTrajectoryValidationSlot,
) -> tuple[VbdTrajectoryValidationSlot, _ControlSpecification]:
    if type(slot) is not VbdTrajectoryValidationSlot:
        raise ValueError("control execution requires the exact compiled slot type")
    canonical = _canonical_slots_by_id().get(slot.slot_id)
    if canonical is None or canonical != slot:
        raise ValueError("control execution requires one canonical compiled slot")
    specification = _CONTROL_SPECIFICATIONS.get(
        (slot.family, slot.scenario_or_control_id)
    )
    if specification is None:
        raise ValueError(
            "control execution accepts only floor, negative, or structural-drift slots"
        )
    if specification.expected_stage != slot.expected_failure_stage:
        raise VbdTrajectoryControlExecutionError(
            "control specification stage drifted from the compiled plan"
        )
    return canonical, specification


def _generate_validation_case(
    slot: VbdTrajectoryValidationSlot,
) -> VbdTrajectorySyntheticCase:
    return generate_vbd_trajectory_validation_case(slot)


def _generate_control_base(
    slot: VbdTrajectoryValidationSlot,
) -> VbdTrajectorySyntheticCase:
    return _generate_vbd_trajectory_control_base(slot)


def _generate_depth_pair(
    slot: VbdTrajectoryValidationSlot,
) -> tuple[VbdTrajectorySyntheticCase, VbdTrajectorySyntheticCase]:
    return _generate_vbd_trajectory_depth_validation_pair(slot)


def _rebind_panel(
    panel: TrajectoryObservationPanel,
    bundles: tuple[TrajectoryObservationBundle, ...],
    **changes: object,
) -> TrajectoryObservationPanel:
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
    placeholder = replace(
        panel,
        bundles=bundles,
        lane_observation_roots=lane_roots,
        ordered_panel_manifest_root="0" * 64,
        **changes,
    )
    return replace(
        placeholder,
        ordered_panel_manifest_root=expected_ordered_panel_manifest_root(
            placeholder
        ),
    )


def _replace_observation(
    bundle: TrajectoryObservationBundle,
    lane: str,
    **changes: object,
) -> TrajectoryObservationBundle:
    lane_index = VBD_TRAJECTORY_LANES.index(lane)
    observations = list(bundle.observations)
    observations[lane_index] = replace(observations[lane_index], **changes)
    return _rebind_bundle_hashes(
        replace(bundle, observations=tuple(observations))
    )


def _rebind_changed_bundles(
    panel: TrajectoryObservationPanel,
    mutate: Callable[[TrajectoryObservationBundle], TrajectoryObservationBundle],
) -> TrajectoryObservationPanel:
    return _rebind_panel(panel, tuple(mutate(bundle) for bundle in panel.bundles))


def _expect_rejection(
    *,
    stage: str,
    code: str,
    operation: Callable[[], object],
    exception_type: type[BaseException] | tuple[type[BaseException], ...],
    message_fragment: str | None = None,
    exception_stage: str | None = None,
) -> None:
    try:
        operation()
    except Exception as exc:
        if not isinstance(exc, exception_type):
            raise VbdTrajectoryControlExecutionError(
                "control failed through the wrong exception type"
            ) from exc
        if message_fragment is not None and message_fragment not in str(exc):
            raise VbdTrajectoryControlExecutionError(
                "control failed through the wrong validator gate"
            ) from exc
        if exception_stage is not None and getattr(exc, "stage", None) != exception_stage:
            raise VbdTrajectoryControlExecutionError(
                "control failed through the wrong staged validator gate"
            ) from exc
        raise _ExpectedControlFailure(stage, code) from exc
    raise VbdTrajectoryControlExecutionError(
        "control unexpectedly passed its compiled fail-closed gate"
    )


def _fit_validation_case(
    case: VbdTrajectorySyntheticCase,
    slot: VbdTrajectoryValidationSlot,
) -> tuple[VbdTrajectoryLaneResult, ...]:
    if type(case) is not VbdTrajectorySyntheticCase:
        raise VbdTrajectoryControlExecutionError(
            "control generator returned an unsupported case type"
        )
    if (
        case.truth.seed != slot.seed
        or case.truth.requested_terminal_truth != slot.truth_vector
        or case.truth.direction_vector != slot.direction_vector
        or case.panel.panel_group_count != slot.panel_group_count
        or case.panel.aggregate_k != slot.k
    ):
        raise VbdTrajectoryControlExecutionError(
            "generated control case drifted from its compiled slot"
        )
    validate_trajectory_panel(case.panel)
    results: list[VbdTrajectoryLaneResult] = []
    expected_series_eligibility = slot.k >= 10
    for lane_index, lane in enumerate(VBD_TRAJECTORY_LANES):
        prepared = prepare_vbd_trajectory_lane(case.panel, lane)
        if prepared.series_evidence_eligible is not expected_series_eligibility:
            raise VbdTrajectoryControlExecutionError(
                "floor control series eligibility drifted"
            )
        fit = fit_vbd_trajectory_state_space(prepared, case.panel)
        summary = fit.movement_summary
        results.append(
            build_vbd_trajectory_lane_result(
                lane=lane,
                raw_truth=float(slot.truth_vector[lane_index]),
                direction_sign=slot.direction_vector[lane_index],
                posterior_mean=float(summary.posterior_mean),
                posterior_sd=float(summary.posterior_sd),
                interval_80_lower=float(summary.interval_80_lower),
                interval_80_upper=float(summary.interval_80_upper),
                interval_99_lower=float(summary.interval_99_lower),
                interval_99_upper=float(summary.interval_99_upper),
                prepared_input_hash=prepared.prepared_input_hash,
                model_input_hash=prepared.model_input_hash,
                context_binding_hash=prepared.context_binding_hash,
                fit_summary_hash=fit.fit_summary_hash(),
                diagnostics_hash=sha256_json(
                    fit.integration_diagnostics.to_dict()
                ),
            )
        )
    return tuple(results)


def _fit_result(
    slot: VbdTrajectoryValidationSlot,
    lane_results: tuple[VbdTrajectoryLaneResult, ...],
) -> VbdTrajectorySlotResult:
    failure_stage = _expected_result_stage(slot)
    return build_vbd_trajectory_slot_result(
        slot=slot,
        row_state=_expected_row_state(slot),
        failure_stage=failure_stage,
        failure_code=_expected_failure_code(slot),
        fit_attempted=True,
        lane_results=lane_results,
    )


def _expected_failure_result(
    slot: VbdTrajectoryValidationSlot,
    failure: _ExpectedControlFailure,
) -> VbdTrajectorySlotResult:
    if failure.stage != _expected_result_stage(slot):
        raise VbdTrajectoryControlExecutionError(
            "observed control stage does not match the compiled slot"
        )
    return build_vbd_trajectory_slot_result(
        slot=slot,
        row_state=_expected_row_state(slot),
        failure_stage=failure.stage,
        failure_code=_expected_failure_code(slot),
        fit_attempted=False,
        lane_results=(),
        controlled_subject_study_hold=slot.matched_outcome_holds_full_study,
    )


def _unexpected_failure_result(
    slot: VbdTrajectoryValidationSlot,
) -> VbdTrajectorySlotResult:
    return build_vbd_trajectory_slot_result(
        slot=slot,
        row_state="RUNNER_ERROR",
        failure_stage="runner_execution",
        failure_code="child_process_failure",
        fit_attempted=False,
        lane_results=(),
        unplanned_runner_error=True,
    )


def _execute_floor(
    slot: VbdTrajectoryValidationSlot,
    specification: _ControlSpecification,
) -> VbdTrajectorySlotResult:
    if slot.k == 4:
        case = _generate_control_base(slot)
        _expect_rejection(
            stage=specification.expected_stage,
            code=specification.control_code,
            operation=lambda: prepare_vbd_trajectory_lane(
                case.panel, VBD_TRAJECTORY_LANES[0]
            ),
            exception_type=TrajectoryPreparationError,
            exception_stage="aggregate_floor",
        )
        raise AssertionError("unreachable")
    case = _generate_validation_case(slot)
    return _fit_result(slot, _fit_validation_case(case, slot))


def _quantile_algorithm_drift(panel: TrajectoryObservationPanel) -> None:
    conformance = run_bootstrap_conformance()
    if (
        conformance.type7_p50 != VBD_BOOTSTRAP_EXPECTED_TYPE7_P50
        or conformance.nearest_index_p50 != VBD_BOOTSTRAP_EXPECTED_NEAREST_P50
        or conformance.type7_p50 == conformance.nearest_index_p50
    ):
        raise VbdTrajectoryControlExecutionError(
            "quantile drift no longer binds the fixed conformance oracle"
        )
    mutated = _rebind_changed_bundles(
        panel,
        lambda bundle: _rebind_bundle_hashes(
            replace(bundle, quantile_algorithm_id=_BAD_NEAREST_QUANTILE_ID)
        ),
    )
    validate_trajectory_panel(mutated)


def _run_definition_drift(panel: TrajectoryObservationPanel) -> None:
    changed_hash = sha256_json(
        {"definition_ref": "definition:post-period-run-definition-drift-v1"}
    )
    mutated = _rebind_changed_bundles(
        panel,
        lambda bundle: (
            _replace_observation(
                bundle, "frequency", definition_hash=changed_hash
            )
            if bundle.post
            else bundle
        ),
    )
    validate_trajectory_panel(mutated)


def _active_membership_drift(panel: TrajectoryObservationPanel) -> None:
    mutated = _rebind_changed_bundles(
        panel,
        lambda bundle: (
            _rebind_bundle_hashes(
                replace(
                    bundle,
                    active_set_commitment=sha256_json(
                        {
                            "cohort_ref": bundle.cohort_ref,
                            "active_set": "active-set-b",
                            "aggregate_k": bundle.k,
                        }
                    ),
                )
            )
            if bundle.post
            else bundle
        ),
    )
    validate_trajectory_panel(mutated)


def _eligible_day_drift(panel: TrajectoryObservationPanel) -> None:
    changed_hash = sha256_json(
        {"definition_ref": "definition:eligible-day-61-v1", "denominator": 61}
    )
    mutated = _rebind_changed_bundles(
        panel,
        lambda bundle: (
            _replace_observation(
                bundle,
                "engagement",
                denominator=61,
                denominator_definition_hash=changed_hash,
            )
            if bundle.post
            else bundle
        ),
    )
    validate_trajectory_panel(mutated)


def _surface_taxonomy_drift(panel: TrajectoryObservationPanel) -> None:
    changed_hash = sha256_json(
        {
            "definition_ref": "definition:synthetic-surface-taxonomy-13-v1",
            "denominator": 13,
        }
    )
    surface_hash = sha256_json(
        {
            "taxonomy_ref": "definition:synthetic-surface-taxonomy-13-v1",
            "eligible_surfaces": [f"surface-{index:02d}" for index in range(1, 14)],
        }
    )
    mutated = _rebind_changed_bundles(
        panel,
        lambda bundle: (
            _replace_observation(
                bundle,
                "breadth",
                denominator=13,
                denominator_definition_hash=changed_hash,
                eligible_surface_set_hash=surface_hash,
            )
            if bundle.post
            else bundle
        ),
    )
    validate_trajectory_panel(mutated)


def _execute_structural_drift(
    slot: VbdTrajectoryValidationSlot,
    specification: _ControlSpecification,
) -> None:
    panel = _generate_control_base(slot).panel
    operations: dict[str, tuple[Callable[[], object], str]] = {
        "quantile_algorithm_drift": (
            lambda: _quantile_algorithm_drift(panel),
            "quantile algorithm identity drifted",
        ),
        "run_definition_drift": (
            lambda: _run_definition_drift(panel),
            "observation definition hash drifted",
        ),
        "active_membership_commitment_drift": (
            lambda: _active_membership_drift(panel),
            "active-set commitment drifted",
        ),
        "eligible_day_denominator_drift": (
            lambda: _eligible_day_drift(panel),
            "engagement denominator drifted",
        ),
        "surface_taxonomy_drift": (
            lambda: _surface_taxonomy_drift(panel),
            "breadth denominator drifted",
        ),
    }
    operation, message = operations[slot.scenario_or_control_id]
    _expect_rejection(
        stage=specification.expected_stage,
        code=specification.control_code,
        operation=operation,
        exception_type=TrajectoryStructureError,
        message_fragment=message,
    )


def _ceiling_panel(
    panel: TrajectoryObservationPanel,
    lane: str,
) -> TrajectoryObservationPanel:
    distribution = (
        PrimitiveDistribution(59.0, 60.0, 60.0, 60.0)
        if lane == "engagement"
        else PrimitiveDistribution(11.0, 12.0, 12.0, 12.0)
    )
    return _rebind_changed_bundles(
        panel,
        lambda bundle: (
            _replace_observation(bundle, lane, distribution=distribution)
            if not bundle.post
            else bundle
        ),
    )


def _status_panel(
    panel: TrajectoryObservationPanel,
    lane: str,
    field: str,
) -> TrajectoryObservationPanel:
    return _rebind_changed_bundles(
        panel,
        lambda bundle: (
            _replace_observation(bundle, lane, **{field: True})
            if bundle.window_index == 10
            else bundle
        ),
    )


def _lane_window_keys(
    panel: TrajectoryObservationPanel,
) -> tuple[tuple[int, str, int], ...]:
    return tuple(
        (bundle.panel_group_index, lane, bundle.window_index)
        for bundle in panel.bundles
        for lane in VBD_TRAJECTORY_LANES
    )


def _covariance_panel(
    panel: TrajectoryObservationPanel,
    control_id: str,
) -> TrajectoryObservationPanel:
    def mutate(bundle: TrajectoryObservationBundle) -> TrajectoryObservationBundle:
        if control_id == "missing_joint_covariance":
            return _rebind_bundle_hashes(replace(bundle, transformed_covariance=()))
        if control_id == "permuted_covariance_lane_order":
            return _rebind_bundle_hashes(
                replace(
                    bundle,
                    covariance_lane_order=("breadth", "engagement", "frequency"),
                )
            )
        if control_id == "covariance_diagonal_mismatch":
            standard_error = 1.1 * math.sqrt(bundle.transformed_covariance[0][0])
            return _replace_observation(
                bundle, "frequency", transformed_standard_error=standard_error
            )
        if control_id == "non_psd_covariance":
            standard_errors = tuple(
                observation.transformed_standard_error
                for observation in bundle.observations
            )
            covariance = tuple(
                tuple(
                    standard_errors[row]
                    * _BAD_NON_PSD_CORRELATION[row][column]
                    * standard_errors[column]
                    for column in range(3)
                )
                for row in range(3)
            )
            return _rebind_bundle_hashes(
                replace(bundle, transformed_covariance=covariance)
            )
        raise AssertionError("covariance control is not compiled")

    return _rebind_changed_bundles(panel, mutate)


def _execute_negative_control(
    slot: VbdTrajectoryValidationSlot,
    specification: _ControlSpecification,
) -> VbdTrajectorySlotResult | None:
    control_id = slot.scenario_or_control_id
    if control_id == "common_availability_shock":
        case = _generate_validation_case(slot)
        if (
            case.truth.shock_kind != "common_availability"
            or case.truth.structural_terminal_truth != (0.0, 0.0, 0.0)
            or case.truth.common_shock_terminal_shift
            != VBD_TRAJECTORY_COMMON_AVAILABILITY_SHOCK_TERMINAL
        ):
            raise VbdTrajectoryControlExecutionError(
                "common-shock control lost its truth-sidecar binding"
            )
        return _fit_result(slot, _fit_validation_case(case, slot))
    if control_id == "depth_context_perturbation":
        first, second = _generate_depth_pair(slot)
        refs = (
            first.panel.bundles[0].depth_context.context_ref,
            second.panel.bundles[0].depth_context.context_ref,
        )
        if refs != ("depth-context:a", "depth-context:b"):
            raise VbdTrajectoryControlExecutionError(
                "Depth perturbation did not bind the exact context pair"
            )
        first_results = _fit_validation_case(first, slot)
        second_results = _fit_validation_case(second, slot)
        if tuple(result.to_dict() for result in first_results) != tuple(
            result.to_dict() for result in second_results
        ):
            raise VbdTrajectoryControlExecutionError(
                "Depth context changed a prepared input or fit"
            )
        if any(result.internal_false_movement for result in first_results):
            raise VbdTrajectoryControlExecutionError(
                "Depth perturbation produced false terminal movement"
            )
        return _fit_result(slot, first_results)
    if control_id == "copied_recompute":
        from .vbd_trajectory_validation_resumable import (
            validate_vbd_trajectory_recomputation_source,
        )

        _expect_rejection(
            stage=specification.expected_stage,
            code=specification.control_code,
            operation=lambda: validate_vbd_trajectory_recomputation_source(
                "primary_checkpoint"
            ),
            exception_type=ValueError,
            message_fragment="cannot deserialize",
        )
        return None
    if control_id == "runner_error":
        _expect_rejection(
            stage=specification.expected_stage,
            code=specification.control_code,
            operation=lambda: (_ for _ in ()).throw(
                VbdSyntheticRunnerError("controlled failure after slot registration")
            ),
            exception_type=VbdSyntheticRunnerError,
            message_fragment="after slot registration",
        )
        return None
    if control_id == "partial_study":
        partial_ids = tuple(
            slot.slot_id
            for slot in required_vbd_trajectory_validation_slots()[:-1]
        )
        summary = evaluate_vbd_trajectory_result_manifest(partial_ids)
        if (
            summary["exact_manifest_complete"] is not False
            or summary["canonical_order_complete"] is not False
            or summary["missing_ids"]
            != (required_vbd_trajectory_validation_slots()[-1].slot_id,)
            or summary["duplicate_ids"]
            or summary["off_plan_ids"]
        ):
            raise VbdTrajectoryControlExecutionError(
                "production study combiner did not HOLD partial evidence"
            )
        raise _ExpectedControlFailure(
            specification.expected_stage, specification.control_code
        )
    if control_id == "zero_pre_period_variance":
        panel = _generate_control_base(slot).panel
        validate_trajectory_panel(panel)
        _expect_rejection(
            stage=specification.expected_stage,
            code=specification.control_code,
            operation=lambda: tuple(
                prepare_vbd_trajectory_lane(panel, lane)
                for lane in VBD_TRAJECTORY_LANES
            ),
            exception_type=TrajectoryPreparationError,
            message_fragment="pre-period scale",
            exception_stage="pre_period_standardization",
        )
        return None

    panel = _generate_control_base(slot).panel
    operation: Callable[[], object]
    exception_type: type[BaseException] | tuple[type[BaseException], ...] = (
        TrajectoryStructureError
    )
    message: str
    exception_stage: str | None = None

    if control_id == "weak_history":
        bundles = tuple(bundle for bundle in panel.bundles if bundle.window_index != 11)
        mutated = _rebind_panel(panel, bundles, pre_window_count=11)
        operation = lambda: validate_trajectory_panel(mutated)
        message = "exactly 12 pre and 6 post"
    elif control_id in {"engagement_ceiling", "breadth_ceiling"}:
        lane = "engagement" if control_id == "engagement_ceiling" else "breadth"
        mutated = _ceiling_panel(panel, lane)
        operation = lambda: validate_trajectory_panel(mutated)
        message = f"{lane} p50 is at a nonregular boundary"
    elif control_id == "missing_window":
        bundles = tuple(bundle for bundle in panel.bundles if bundle.window_index != 10)
        mutated = _rebind_panel(panel, bundles)
        operation = lambda: validate_trajectory_panel(mutated)
        message = "panel is incomplete"
    elif control_id in {"suppressed_window", "stale_window", "imputed_window"}:
        lane, field = {
            "suppressed_window": ("frequency", "suppressed"),
            "stale_window": ("engagement", "stale"),
            "imputed_window": ("breadth", "imputed"),
        }[control_id]
        mutated = _status_panel(panel, lane, field)
        operation = lambda: validate_trajectory_panel(mutated)
        message = "suppressed, stale, or imputed"
    elif control_id == "duplicate_window":
        keys = _lane_window_keys(panel) + ((0, "breadth", 10),)
        operation = lambda: validate_trajectory_lane_window_manifest(
            keys, panel_group_count=panel.panel_group_count
        )
        message = "duplicated"
    elif control_id == "off_plan_window":
        keys = _lane_window_keys(panel) + tuple(
            (0, lane, 99) for lane in VBD_TRAJECTORY_LANES
        )
        operation = lambda: validate_trajectory_lane_window_manifest(
            keys, panel_group_count=panel.panel_group_count
        )
        message = "off plan"
    elif control_id == "legacy_composite_input":
        candidate = panel.to_dict()
        candidate.update(
            {
                "overall_vbd_score": 50,
                "integration_score": 50,
                "vbd_quadrant": "low_integration",
            }
        )
        operation = lambda: _assert_no_forbidden_keys(candidate)
        message = "forbidden"
    elif control_id == "breadth_duplicated_in_velocity":
        mutated = _rebind_changed_bundles(
            panel,
            lambda bundle: _replace_observation(
                bundle, "frequency", statistic_name="velocity_index"
            ),
        )
        operation = lambda: validate_trajectory_panel(mutated)
        message = "statistic identity drifted"
    elif control_id == "numeric_depth_dependency":
        candidate = panel.to_dict()
        candidate["depth_value"] = 0.5
        operation = lambda: _assert_no_forbidden_keys(candidate)
        message = "forbidden"
    elif control_id == "post_period_standardization":
        prepared = prepare_vbd_trajectory_lane(panel, "frequency")
        mutated_prepared = replace(
            prepared,
            standardization_window_indexes=tuple(
                range(VBD_TRAJECTORY_TOTAL_WINDOW_COUNT)
            ),
        )
        operation = lambda: validate_prepared_vbd_trajectory(
            mutated_prepared, panel
        )
        exception_type = TrajectoryPreparationError
        exception_stage = "pre_period_standardization"
        message = "only the twelve pre-period"
    elif control_id == "lookahead_window":
        keys = _lane_window_keys(panel) + tuple(
            (0, lane, 18) for lane in VBD_TRAJECTORY_LANES
        )
        operation = lambda: validate_trajectory_lane_window_manifest(
            keys, panel_group_count=panel.panel_group_count
        )
        message = "lookahead"
    elif control_id == "lane_window_misalignment":
        keys = tuple(
            (group, lane, window + 1 if lane == "breadth" else window)
            for group, lane, window in _lane_window_keys(panel)
        )
        operation = lambda: validate_trajectory_lane_window_manifest(
            keys, panel_group_count=panel.panel_group_count
        )
        message = "misaligned"
    elif control_id in {
        "blueprint_target_contamination",
        "outcome_contamination",
        "fluency_contamination",
    }:
        field = {
            "blueprint_target_contamination": "blueprint_target_value",
            "outcome_contamination": "primary_outcome_value",
            "fluency_contamination": "ai_fluency_value",
        }[control_id]
        candidate = panel.to_dict()
        candidate[field] = 0.5
        operation = lambda: _assert_no_forbidden_keys(candidate)
        message = field
    elif control_id == "semantic_hash_drift":
        first = panel.bundles[0]
        observations = list(first.observations)
        observations[0] = replace(
            observations[0],
            definition_hash=sha256_json(
                {"definition": "mutated-after-root-creation"}
            ),
        )
        bundles = (replace(first, observations=tuple(observations)),) + panel.bundles[1:]
        mutated = replace(panel, bundles=bundles)
        operation = lambda: validate_trajectory_panel(mutated)
        message = "source hash drifted"
    elif control_id in {"direct_identifier", "raw_content"}:
        candidate = panel.to_dict()
        if control_id == "direct_identifier":
            candidate["user_id"] = "synthetic-user"
        else:
            candidate["raw_rows"] = [{"value": 1}]
        operation = lambda: _assert_no_forbidden_keys(candidate)
        message = "forbidden"
    elif control_id == "real_data_flags":
        bundles = tuple(
            replace(
                bundle,
                real_data_present=True,
                customer_data_present=True,
                live_data_source_present=True,
                production_data_present=True,
            )
            for bundle in panel.bundles
        )
        mutated = _rebind_panel(
            panel,
            bundles,
            real_data_present=True,
            customer_data_present=True,
            live_data_source_present=True,
            production_data_present=True,
        )
        operation = lambda: validate_trajectory_panel(mutated)
        message = "real, customer, production, or live data is prohibited"
    elif control_id in {"self_completion", "unsafe_output_flags"}:
        from .vbd_trajectory_validation_resumable import (
            validate_vbd_trajectory_combined_governance,
        )

        flags = {
            "independent_acceptance_complete": False,
            "task_5_6_complete": False,
            "promotion_complete": False,
            "customer_output_authorized": False,
            "confidence_output_authorized": False,
            "probability_output_authorized": False,
            "roi_output_authorized": False,
            "causality_output_authorized": False,
            "productivity_output_authorized": False,
        }
        if control_id == "self_completion":
            flags.update(
                {
                    "independent_acceptance_complete": True,
                    "task_5_6_complete": True,
                    "promotion_complete": True,
                }
            )
        else:
            flags.update(
                {
                    "customer_output_authorized": True,
                    "confidence_output_authorized": True,
                    "probability_output_authorized": True,
                    "roi_output_authorized": True,
                    "causality_output_authorized": True,
                    "productivity_output_authorized": True,
                }
            )
        operation = lambda: validate_vbd_trajectory_combined_governance(flags)
        exception_type = ValueError
        message = "cannot authorize"
    elif control_id in {
        "missing_joint_covariance",
        "permuted_covariance_lane_order",
        "covariance_diagonal_mismatch",
        "non_psd_covariance",
    }:
        mutated = _covariance_panel(panel, control_id)
        operation = lambda: validate_trajectory_panel(mutated)
        message = {
            "missing_joint_covariance": "covariance must be a 3x3 tuple",
            "permuted_covariance_lane_order": "covariance lane order drifted",
            "covariance_diagonal_mismatch": (
                "covariance diagonal does not match marginal standard errors"
            ),
            "non_psd_covariance": "covariance is not positive semidefinite",
        }[control_id]
        exception_type = TrajectoryCovarianceError
        exception_stage = {
            "missing_joint_covariance": "required_covariance_presence",
            "permuted_covariance_lane_order": "covariance_lane_order",
            "covariance_diagonal_mismatch": "covariance_diagonal_consistency",
            "non_psd_covariance": "covariance_positive_semidefinite",
        }[control_id]
    else:
        raise AssertionError("negative-control implementation is incomplete")

    _expect_rejection(
        stage=specification.expected_stage,
        code=specification.control_code,
        operation=operation,
        exception_type=exception_type,
        message_fragment=message,
        exception_stage=exception_stage,
    )
    return None


def execute_vbd_trajectory_control_slot(
    slot: VbdTrajectoryValidationSlot,
    *,
    _token: object,
) -> VbdTrajectorySlotResult:
    """Execute one canonical floor, negative, or structural-drift slot.

    The guarded API intentionally has no input or mutation parameters beyond the
    immutable compiled slot. Regular numerical fit slots, understated-
    uncertainty drift, canaries, concordance, and study execution live outside
    this control executor.
    """

    if _token is not _VBD_TRAJECTORY_CONTROL_RUNNER_TOKEN:
        raise VbdTrajectoryControlExecutionError(
            "VBD trajectory control execution is frozen-runner-owned"
        )
    canonical, specification = _canonical_control_slot(slot)
    try:
        if canonical.family == "floor":
            return _execute_floor(canonical, specification)
        if canonical.family == "drift":
            _execute_structural_drift(canonical, specification)
        else:
            result = _execute_negative_control(canonical, specification)
            if result is not None:
                return result
    except _ExpectedControlFailure as failure:
        return _expected_failure_result(canonical, failure)
    except Exception:
        return _unexpected_failure_result(canonical)
    raise VbdTrajectoryControlExecutionError(
        "control execution ended without a result"
    )
