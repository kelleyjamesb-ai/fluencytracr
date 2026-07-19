"""Strict sanitized records for the permanently held VBD geometry diagnostic."""

from __future__ import annotations

import math

from .hashing import sha256_json
from .vbd_trajectory_concordance import (
    VBD_TRAJECTORY_CONCORDANCE_INTERVAL_80_ENDPOINT_MAX_REFERENCE_SD,
    VBD_TRAJECTORY_CONCORDANCE_INTERVAL_99_ENDPOINT_MAX_REFERENCE_SD,
    VBD_TRAJECTORY_CONCORDANCE_MEAN_MAX_REFERENCE_SD,
    VBD_TRAJECTORY_CONCORDANCE_SD_RATIO_MAX,
    VBD_TRAJECTORY_CONCORDANCE_SD_RATIO_MIN,
)
from .vbd_trajectory_group_effect_geometry_constants import (
    VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_ARM_ORDER,
    VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_CASES,
    VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_CENTERED_CHAIN_SEEDS,
    VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_DIAGNOSTIC_ID,
    VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_GENERATOR_SEEDS,
    VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_HOLD_REASON,
    VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_LANE_ORDER,
    VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_NONCENTERED_CHAIN_SEEDS,
    VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_PLAN_SCHEMA_VERSION,
    VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_RESERVED_SEEDS,
    VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_SCHEMA_VERSION,
    VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_SEED_SCHEMA_VERSION,
    VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_STATE,
)
from .vbd_trajectory_nuts import (
    VBD_TRAJECTORY_NUTS_BFMI_MIN,
    VBD_TRAJECTORY_NUTS_ESS_MIN,
    VBD_TRAJECTORY_NUTS_MCSE_RATIO_MAX,
    VBD_TRAJECTORY_NUTS_RHAT_MAX,
    TrajectoryNutsError,
    TrajectoryNutsGroupEffectGeometryBinding,
    build_vbd_trajectory_nuts_group_effect_geometry_binding,
    vbd_nuts_execution_settings,
)
from .vbd_trajectory_state_space import (
    TrajectoryIntegrationError,
    vbd_trajectory_common_quantity_names,
)
from .vbd_trajectory_synthetic import (
    vbd_trajectory_group_effect_geometry_diagnostic_case_body,
)
from .vbd_trajectory_types import VBD_TRAJECTORY_LANES


VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_ARM_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_GROUP_EFFECT_GEOMETRY_DIAGNOSTIC_ARM_2026_07_V1"
)
VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_CLASSIFICATIONS = (
    "SUPPORTED_FOR_LATER_CONTRACT_AMENDMENT",
    "INCONCLUSIVE_CENTERED_GEOMETRY_NOT_REPRODUCED",
    "REJECT_NONCENTERED_CANDIDATE",
    "INVALID_HOLD",
)

_SAMPLER_INPUT_KEYS = {
    "parameter_name",
    "r_hat",
    "bulk_ess",
    "tail_ess",
    "posterior_mean_mcse_to_posterior_sd_ratio",
    "interval_80_lower_endpoint_mcse_to_posterior_sd_ratio",
    "interval_80_upper_endpoint_mcse_to_posterior_sd_ratio",
    "interval_99_lower_endpoint_mcse_to_posterior_sd_ratio",
    "interval_99_upper_endpoint_mcse_to_posterior_sd_ratio",
}
_SAMPLER_RECORD_KEYS = _SAMPLER_INPUT_KEYS | {
    "gate_results",
    "diagnostic_row_hash",
}
_REFERENCE_INPUT_KEYS = {
    "quantity_name",
    "absolute_mean_difference_reference_sd",
    "interval_80_lower_endpoint_difference_reference_sd",
    "interval_80_upper_endpoint_difference_reference_sd",
    "interval_99_lower_endpoint_difference_reference_sd",
    "interval_99_upper_endpoint_difference_reference_sd",
    "primary_to_reference_sd_ratio",
}
_REFERENCE_RECORD_KEYS = _REFERENCE_INPUT_KEYS | {
    "passed",
    "comparison_hash",
}
_BINDING_KEYS = {
    "binding_kind",
    "case_ordinal",
    "effect_size_sd",
    "panel_group_count",
    "aggregate_k",
    "generator_seed",
    "scenario_id",
    "arm",
    "lane",
    "lane_ordinal",
    "plan_hash",
    "chain_seeds",
    "ppc_state",
    "acceptance_concordance_state",
    "acceptance_slot_key",
    "acceptance_evidence_eligible",
    "binding_hash",
}
_ARM_KEYS = {
    "schema_version",
    "diagnostic_id",
    "binding",
    "panel_hash",
    "prepared_input_hash",
    "model_input_hash",
    "deterministic_reference_hash",
    "deterministic_recomputation_hash",
    "parameter_order",
    "common_quantity_order",
    "sampler_diagnostic_rows",
    "reference_comparisons",
    "post_warmup_divergences",
    "max_treedepth_saturation_count",
    "energy_bfmi_min",
    "gate_results",
    "raw_posterior_draws_emitted",
    "posterior_values_emitted",
    "latent_paths_emitted",
    "u_std_reference_comparison_present",
    "arm_record_hash",
}
_RECORD_KEYS = {
    "schema_version",
    "diagnostic_id",
    "plan_hash",
    "seed_manifest_hash",
    "execution_state",
    "runner_completion_binding",
    "classification",
    "state",
    "hold_reasons",
    "matrix_complete",
    "arm_records",
    "ppc_state",
    "acceptance_concordance_state",
    "evidence_eligible",
    "acceptance_count_effect",
    "internal_only",
    "synthetic_only",
    "aggregate_only",
    "customer_output_authorized",
    "raw_posterior_draws_emitted",
    "posterior_values_emitted",
    "record_hash",
}


class VbdTrajectoryGroupEffectGeometryDiagnosticError(ValueError):
    """A geometry diagnostic plan, arm, or result record is malformed."""


def _require_exact_keys(value: object, expected: set[str], name: str) -> dict:
    if type(value) is not dict or set(value) != expected:
        raise VbdTrajectoryGroupEffectGeometryDiagnosticError(
            f"{name} shape is invalid"
        )
    return value


def _strict_sha256(value: object, name: str) -> str:
    if (
        type(value) is not str
        or len(value) != 64
        or any(character not in "0123456789abcdef" for character in value)
    ):
        raise VbdTrajectoryGroupEffectGeometryDiagnosticError(
            f"{name} is not a sha256"
        )
    return value


def _strict_float(
    value: object,
    name: str,
    *,
    positive: bool = False,
    nonnegative: bool = False,
) -> float:
    if type(value) is not float or not math.isfinite(value):
        raise VbdTrajectoryGroupEffectGeometryDiagnosticError(
            f"{name} must be a finite float"
        )
    if positive and value <= 0.0:
        raise VbdTrajectoryGroupEffectGeometryDiagnosticError(
            f"{name} must be positive"
        )
    if nonnegative and value < 0.0:
        raise VbdTrajectoryGroupEffectGeometryDiagnosticError(
            f"{name} must be nonnegative"
        )
    return 0.0 if value == 0.0 else value


def _strict_nonnegative_int(value: object, name: str) -> int:
    if type(value) is not int or value < 0:
        raise VbdTrajectoryGroupEffectGeometryDiagnosticError(
            f"{name} must be a nonnegative integer"
        )
    return value


def _case_body(case_ordinal: int) -> dict:
    try:
        return vbd_trajectory_group_effect_geometry_diagnostic_case_body(
            case_ordinal
        )
    except (TypeError, ValueError) as exc:
        raise VbdTrajectoryGroupEffectGeometryDiagnosticError(
            "geometry case identity is invalid"
        ) from exc


def _case_plan_hash(case_ordinal: int) -> str:
    return sha256_json(_case_body(case_ordinal))


def _binding_to_dict(
    binding: TrajectoryNutsGroupEffectGeometryBinding,
) -> dict:
    return {
        **binding.body_without_hash(),
        "binding_hash": binding.binding_hash,
    }


def _binding_from_dict(value: object) -> TrajectoryNutsGroupEffectGeometryBinding:
    record = _require_exact_keys(value, _BINDING_KEYS, "geometry binding")
    if type(record["chain_seeds"]) is not list:
        raise VbdTrajectoryGroupEffectGeometryDiagnosticError(
            "geometry binding chain seeds must be a list"
        )
    try:
        binding = build_vbd_trajectory_nuts_group_effect_geometry_binding(
            case_ordinal=record["case_ordinal"],
            arm=record["arm"],
            lane=record["lane"],
            lane_ordinal=record["lane_ordinal"],
            plan_hash=record["plan_hash"],
        )
    except (TrajectoryNutsError, TypeError, ValueError) as exc:
        raise VbdTrajectoryGroupEffectGeometryDiagnosticError(
            "geometry binding is off plan"
        ) from exc
    if _binding_to_dict(binding) != record:
        raise VbdTrajectoryGroupEffectGeometryDiagnosticError(
            "geometry binding differs from its reconstruction"
        )
    return binding


def vbd_trajectory_group_effect_geometry_seed_manifest() -> dict:
    """Return the exact two-case, twelve-fit, fifty-seed manifest."""

    cases = []
    for case in VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_CASES:
        case_plan_hash = _case_plan_hash(case.case_ordinal)
        lane_records = []
        for lane_ordinal, lane in enumerate(
            VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_LANE_ORDER
        ):
            arms = []
            for arm in VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_ARM_ORDER:
                binding = build_vbd_trajectory_nuts_group_effect_geometry_binding(
                    case_ordinal=case.case_ordinal,
                    arm=arm,
                    lane=lane,
                    lane_ordinal=lane_ordinal,
                    plan_hash=case_plan_hash,
                )
                arms.append(
                    {
                        "arm": arm,
                        "chain_seeds": list(binding.chain_seeds),
                        "binding_hash": binding.binding_hash,
                    }
                )
            lane_records.append(
                {
                    "lane": lane,
                    "lane_ordinal": lane_ordinal,
                    "arms": arms,
                }
            )
        cases.append(
            {
                "case_ordinal": case.case_ordinal,
                "effect_size_sd": float(case.effect_size_sd),
                "panel_group_count": case.panel_group_count,
                "aggregate_k": case.aggregate_k,
                "generator_seed": case.generator_seed,
                "scenario_id": case.scenario_id,
                "case_plan_hash": case_plan_hash,
                "lanes": lane_records,
            }
        )
    reserved_seeds = [
        *VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_GENERATOR_SEEDS,
        *VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_CENTERED_CHAIN_SEEDS,
        *VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_NONCENTERED_CHAIN_SEEDS,
    ]
    if (
        VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_LANE_ORDER
        != VBD_TRAJECTORY_LANES
        or len(cases) != 2
        or len(reserved_seeds) != 50
        or len(set(reserved_seeds)) != 50
        or frozenset(reserved_seeds)
        != VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_RESERVED_SEEDS
    ):
        raise VbdTrajectoryGroupEffectGeometryDiagnosticError(
            "geometry seed manifest constants drifted"
        )
    body = {
        "schema_version": (
            VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_SEED_SCHEMA_VERSION
        ),
        "diagnostic_id": VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_DIAGNOSTIC_ID,
        "case_order": [case.case_ordinal for case in VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_CASES],
        "lane_order": list(VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_LANE_ORDER),
        "arm_order": list(VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_ARM_ORDER),
        "cases": cases,
        "reserved_seeds": reserved_seeds,
        "reserved_seed_count": 50,
        "exclusive_to_diagnostic": True,
        "acceptance_seed_count": 0,
        "state": VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_STATE,
        "hold_reason": VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_HOLD_REASON,
        "evidence_eligible": False,
    }
    return {**body, "seed_manifest_hash": sha256_json(body)}


def vbd_trajectory_group_effect_geometry_plan() -> dict:
    """Return the immutable paired-geometry diagnostic plan."""

    seed_manifest = vbd_trajectory_group_effect_geometry_seed_manifest()
    cases = []
    execution_order = []
    sequence_ordinal = 0
    for case in VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_CASES:
        case_body = _case_body(case.case_ordinal)
        case_plan_hash = sha256_json(case_body)
        common_quantity_order = list(
            vbd_trajectory_common_quantity_names(case.panel_group_count)
        )
        cases.append(
            {
                "case_body": case_body,
                "case_plan_hash": case_plan_hash,
                "common_quantity_order": common_quantity_order,
                "noncentered_only_sampler_diagnostic_order": [
                    f"u_std[{index}]"
                    for index in range(case.panel_group_count)
                ],
            }
        )
        for lane_ordinal, lane in enumerate(
            VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_LANE_ORDER
        ):
            for arm in VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_ARM_ORDER:
                binding = build_vbd_trajectory_nuts_group_effect_geometry_binding(
                    case_ordinal=case.case_ordinal,
                    arm=arm,
                    lane=lane,
                    lane_ordinal=lane_ordinal,
                    plan_hash=case_plan_hash,
                )
                execution_order.append(
                    {
                        "sequence_ordinal": sequence_ordinal,
                        "binding": _binding_to_dict(binding),
                    }
                )
                sequence_ordinal += 1
    body = {
        "schema_version": (
            VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_PLAN_SCHEMA_VERSION
        ),
        "diagnostic_id": VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_DIAGNOSTIC_ID,
        "case_order": [0, 1],
        "lane_order": list(VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_LANE_ORDER),
        "arm_order": list(VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_ARM_ORDER),
        "cases": cases,
        "execution_order": execution_order,
        "required_arm_record_count": 12,
        "sampler_settings": vbd_nuts_execution_settings("full").to_dict(),
        "compiled_gates": {
            "r_hat_max": VBD_TRAJECTORY_NUTS_RHAT_MAX,
            "bulk_ess_min": VBD_TRAJECTORY_NUTS_ESS_MIN,
            "tail_ess_min": VBD_TRAJECTORY_NUTS_ESS_MIN,
            "post_warmup_divergences_max": 0,
            "max_treedepth_saturation_count_max": 0,
            "energy_bfmi_min": VBD_TRAJECTORY_NUTS_BFMI_MIN,
            "max_mcse_to_posterior_sd_ratio": (
                VBD_TRAJECTORY_NUTS_MCSE_RATIO_MAX
            ),
            "mean_max_reference_sd": (
                VBD_TRAJECTORY_CONCORDANCE_MEAN_MAX_REFERENCE_SD
            ),
            "interval_80_endpoint_max_reference_sd": (
                VBD_TRAJECTORY_CONCORDANCE_INTERVAL_80_ENDPOINT_MAX_REFERENCE_SD
            ),
            "interval_99_endpoint_max_reference_sd": (
                VBD_TRAJECTORY_CONCORDANCE_INTERVAL_99_ENDPOINT_MAX_REFERENCE_SD
            ),
            "sd_ratio_min": VBD_TRAJECTORY_CONCORDANCE_SD_RATIO_MIN,
            "sd_ratio_max": VBD_TRAJECTORY_CONCORDANCE_SD_RATIO_MAX,
        },
        "ppc_state": "NOT_RUN",
        "acceptance_concordance_state": "NOT_RUN",
        "state": VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_STATE,
        "hold_reasons": [
            VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_HOLD_REASON
        ],
        "evidence_eligible": False,
        "acceptance_count_effect": 0,
        "internal_only": True,
        "synthetic_only": True,
        "aggregate_only": True,
        "customer_output_authorized": False,
        "raw_posterior_draws_emitted": False,
        "posterior_values_emitted": False,
        "seed_manifest_hash": seed_manifest["seed_manifest_hash"],
    }
    return {**body, "plan_hash": sha256_json(body)}


def _expected_parameter_order(
    binding: TrajectoryNutsGroupEffectGeometryBinding,
) -> tuple[str, ...]:
    common = vbd_trajectory_common_quantity_names(binding.panel_group_count)
    if binding.arm == "centered":
        return common
    return (
        *common,
        *(
            f"u_std[{index}]"
            for index in range(binding.panel_group_count)
        ),
    )


def _build_sampler_diagnostic_row(
    value: object,
    expected_parameter_name: str,
) -> dict:
    row = _require_exact_keys(
        value, _SAMPLER_INPUT_KEYS, "sampler diagnostic row"
    )
    if row["parameter_name"] != expected_parameter_name or type(
        row["parameter_name"]
    ) is not str:
        raise VbdTrajectoryGroupEffectGeometryDiagnosticError(
            "sampler diagnostic parameter order is invalid"
        )
    r_hat = _strict_float(row["r_hat"], "R-hat", positive=True)
    bulk_ess = _strict_float(
        row["bulk_ess"], "bulk ESS", nonnegative=True
    )
    tail_ess = _strict_float(
        row["tail_ess"], "tail ESS", nonnegative=True
    )
    mcse_names = (
        "posterior_mean_mcse_to_posterior_sd_ratio",
        "interval_80_lower_endpoint_mcse_to_posterior_sd_ratio",
        "interval_80_upper_endpoint_mcse_to_posterior_sd_ratio",
        "interval_99_lower_endpoint_mcse_to_posterior_sd_ratio",
        "interval_99_upper_endpoint_mcse_to_posterior_sd_ratio",
    )
    mcse_values = tuple(
        _strict_float(
            row[name],
            name,
            nonnegative=True,
        )
        for name in mcse_names
    )
    gate_results = {
        "r_hat_passed": r_hat <= VBD_TRAJECTORY_NUTS_RHAT_MAX,
        "bulk_ess_passed": bulk_ess >= VBD_TRAJECTORY_NUTS_ESS_MIN,
        "tail_ess_passed": tail_ess >= VBD_TRAJECTORY_NUTS_ESS_MIN,
        "mcse_passed": all(
            value <= VBD_TRAJECTORY_NUTS_MCSE_RATIO_MAX
            for value in mcse_values
        ),
    }
    gate_results["passed"] = all(gate_results.values())
    body = {
        "parameter_name": expected_parameter_name,
        "r_hat": r_hat,
        "bulk_ess": bulk_ess,
        "tail_ess": tail_ess,
        **dict(zip(mcse_names, mcse_values, strict=True)),
        "gate_results": gate_results,
    }
    return {**body, "diagnostic_row_hash": sha256_json(body)}


def _build_reference_comparison(
    value: object,
    expected_quantity_name: str,
) -> dict:
    row = _require_exact_keys(
        value, _REFERENCE_INPUT_KEYS, "reference comparison"
    )
    if row["quantity_name"] != expected_quantity_name or type(
        row["quantity_name"]
    ) is not str:
        raise VbdTrajectoryGroupEffectGeometryDiagnosticError(
            "reference comparison quantity order is invalid"
        )
    mean_difference = _strict_float(
        row["absolute_mean_difference_reference_sd"],
        "reference mean difference",
        nonnegative=True,
    )
    interval_80_lower = _strict_float(
        row["interval_80_lower_endpoint_difference_reference_sd"],
        "reference 80% lower endpoint difference",
        nonnegative=True,
    )
    interval_80_upper = _strict_float(
        row["interval_80_upper_endpoint_difference_reference_sd"],
        "reference 80% upper endpoint difference",
        nonnegative=True,
    )
    interval_99_lower = _strict_float(
        row["interval_99_lower_endpoint_difference_reference_sd"],
        "reference 99% lower endpoint difference",
        nonnegative=True,
    )
    interval_99_upper = _strict_float(
        row["interval_99_upper_endpoint_difference_reference_sd"],
        "reference 99% upper endpoint difference",
        nonnegative=True,
    )
    sd_ratio = _strict_float(
        row["primary_to_reference_sd_ratio"],
        "reference SD ratio",
        positive=True,
    )
    passed = (
        mean_difference
        <= VBD_TRAJECTORY_CONCORDANCE_MEAN_MAX_REFERENCE_SD
        and interval_80_lower
        <= VBD_TRAJECTORY_CONCORDANCE_INTERVAL_80_ENDPOINT_MAX_REFERENCE_SD
        and interval_80_upper
        <= VBD_TRAJECTORY_CONCORDANCE_INTERVAL_80_ENDPOINT_MAX_REFERENCE_SD
        and interval_99_lower
        <= VBD_TRAJECTORY_CONCORDANCE_INTERVAL_99_ENDPOINT_MAX_REFERENCE_SD
        and interval_99_upper
        <= VBD_TRAJECTORY_CONCORDANCE_INTERVAL_99_ENDPOINT_MAX_REFERENCE_SD
        and VBD_TRAJECTORY_CONCORDANCE_SD_RATIO_MIN
        <= sd_ratio
        <= VBD_TRAJECTORY_CONCORDANCE_SD_RATIO_MAX
    )
    body = {
        "quantity_name": expected_quantity_name,
        "absolute_mean_difference_reference_sd": mean_difference,
        "interval_80_lower_endpoint_difference_reference_sd": (
            interval_80_lower
        ),
        "interval_80_upper_endpoint_difference_reference_sd": (
            interval_80_upper
        ),
        "interval_99_lower_endpoint_difference_reference_sd": (
            interval_99_lower
        ),
        "interval_99_upper_endpoint_difference_reference_sd": (
            interval_99_upper
        ),
        "primary_to_reference_sd_ratio": sd_ratio,
        "passed": passed,
    }
    return {**body, "comparison_hash": sha256_json(body)}


def build_vbd_trajectory_group_effect_geometry_arm_record(
    *,
    binding: TrajectoryNutsGroupEffectGeometryBinding,
    panel_hash: str,
    prepared_input_hash: str,
    model_input_hash: str,
    deterministic_reference_hash: str,
    deterministic_recomputation_hash: str,
    sampler_diagnostic_rows: list[dict],
    reference_comparisons: list[dict],
    post_warmup_divergences: int,
    max_treedepth_saturation_count: int,
    energy_bfmi_min: float,
) -> dict:
    """Build one sanitized arm record and derive every gate."""

    if type(binding) is not TrajectoryNutsGroupEffectGeometryBinding:
        raise VbdTrajectoryGroupEffectGeometryDiagnosticError(
            "geometry arm requires its exact NUTS binding"
        )
    expected_binding = build_vbd_trajectory_nuts_group_effect_geometry_binding(
        case_ordinal=binding.case_ordinal,
        arm=binding.arm,
        lane=binding.lane,
        lane_ordinal=binding.lane_ordinal,
        plan_hash=_case_plan_hash(binding.case_ordinal),
    )
    if binding != expected_binding:
        raise VbdTrajectoryGroupEffectGeometryDiagnosticError(
            "geometry arm binding is off plan"
        )
    hashes = {
        "panel_hash": _strict_sha256(panel_hash, "panel hash"),
        "prepared_input_hash": _strict_sha256(
            prepared_input_hash, "prepared input hash"
        ),
        "model_input_hash": _strict_sha256(
            model_input_hash, "model input hash"
        ),
        "deterministic_reference_hash": _strict_sha256(
            deterministic_reference_hash, "deterministic reference hash"
        ),
        "deterministic_recomputation_hash": _strict_sha256(
            deterministic_recomputation_hash,
            "deterministic recomputation hash",
        ),
    }
    parameter_order = _expected_parameter_order(binding)
    common_quantity_order = vbd_trajectory_common_quantity_names(
        binding.panel_group_count
    )
    if (
        type(sampler_diagnostic_rows) is not list
        or len(sampler_diagnostic_rows) != len(parameter_order)
    ):
        raise VbdTrajectoryGroupEffectGeometryDiagnosticError(
            "sampler diagnostic rows are incomplete"
        )
    if (
        type(reference_comparisons) is not list
        or len(reference_comparisons) != len(common_quantity_order)
    ):
        raise VbdTrajectoryGroupEffectGeometryDiagnosticError(
            "reference comparisons are incomplete"
        )
    sampler_rows = [
        _build_sampler_diagnostic_row(value, parameter_order[index])
        for index, value in enumerate(sampler_diagnostic_rows)
    ]
    comparisons = [
        _build_reference_comparison(value, common_quantity_order[index])
        for index, value in enumerate(reference_comparisons)
    ]
    divergences = _strict_nonnegative_int(
        post_warmup_divergences, "post-warmup divergences"
    )
    treedepth = _strict_nonnegative_int(
        max_treedepth_saturation_count,
        "maximum-treedepth saturation count",
    )
    bfmi = _strict_float(energy_bfmi_min, "minimum BFMI", positive=True)
    r_hat_passed = all(
        row["gate_results"]["r_hat_passed"] for row in sampler_rows
    )
    bulk_ess_passed = all(
        row["gate_results"]["bulk_ess_passed"] for row in sampler_rows
    )
    tail_ess_passed = all(
        row["gate_results"]["tail_ess_passed"] for row in sampler_rows
    )
    mcse_passed = all(
        row["gate_results"]["mcse_passed"] for row in sampler_rows
    )
    divergences_passed = divergences == 0
    treedepth_passed = treedepth == 0
    bfmi_passed = bfmi >= VBD_TRAJECTORY_NUTS_BFMI_MIN
    all_non_divergence_sampler_gates_passed = all(
        (
            r_hat_passed,
            bulk_ess_passed,
            tail_ess_passed,
            mcse_passed,
            treedepth_passed,
            bfmi_passed,
        )
    )
    all_sampler_gates_passed = (
        all_non_divergence_sampler_gates_passed and divergences_passed
    )
    comparisons_passed = all(row["passed"] for row in comparisons)
    recomputation_matches = (
        hashes["deterministic_reference_hash"]
        == hashes["deterministic_recomputation_hash"]
    )
    all_reference_gates_passed = (
        comparisons_passed and recomputation_matches
    )
    gate_results = {
        "r_hat_passed": r_hat_passed,
        "bulk_ess_passed": bulk_ess_passed,
        "tail_ess_passed": tail_ess_passed,
        "mcse_passed": mcse_passed,
        "divergences_passed": divergences_passed,
        "max_treedepth_saturation_passed": treedepth_passed,
        "energy_bfmi_passed": bfmi_passed,
        "all_non_divergence_sampler_gates_passed": (
            all_non_divergence_sampler_gates_passed
        ),
        "all_sampler_gates_passed": all_sampler_gates_passed,
        "reference_comparisons_passed": comparisons_passed,
        "reference_recomputation_matches": recomputation_matches,
        "all_reference_gates_passed": all_reference_gates_passed,
        "all_gates_passed": (
            all_sampler_gates_passed and all_reference_gates_passed
        ),
    }
    body = {
        "schema_version": (
            VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_ARM_SCHEMA_VERSION
        ),
        "diagnostic_id": VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_DIAGNOSTIC_ID,
        "binding": _binding_to_dict(binding),
        **hashes,
        "parameter_order": list(parameter_order),
        "common_quantity_order": list(common_quantity_order),
        "sampler_diagnostic_rows": sampler_rows,
        "reference_comparisons": comparisons,
        "post_warmup_divergences": divergences,
        "max_treedepth_saturation_count": treedepth,
        "energy_bfmi_min": bfmi,
        "gate_results": gate_results,
        "raw_posterior_draws_emitted": False,
        "posterior_values_emitted": False,
        "latent_paths_emitted": False,
        "u_std_reference_comparison_present": False,
    }
    return {**body, "arm_record_hash": sha256_json(body)}


def validate_vbd_trajectory_group_effect_geometry_arm_record(
    value: object,
) -> dict:
    """Strictly reconstruct one arm record from sanitized inputs."""

    record = _require_exact_keys(value, _ARM_KEYS, "geometry arm record")
    binding = _binding_from_dict(record["binding"])
    sampler_rows = record["sampler_diagnostic_rows"]
    comparisons = record["reference_comparisons"]
    if type(sampler_rows) is not list or any(
        type(row) is not dict for row in sampler_rows
    ):
        raise VbdTrajectoryGroupEffectGeometryDiagnosticError(
            "sampler diagnostic rows are invalid"
        )
    if type(comparisons) is not list or any(
        type(row) is not dict for row in comparisons
    ):
        raise VbdTrajectoryGroupEffectGeometryDiagnosticError(
            "reference comparisons are invalid"
        )
    sampler_inputs = []
    for row in sampler_rows:
        _require_exact_keys(
            row, _SAMPLER_RECORD_KEYS, "sampler diagnostic row"
        )
        sampler_inputs.append(
            {key: row[key] for key in _SAMPLER_INPUT_KEYS}
        )
    reference_inputs = []
    for row in comparisons:
        _require_exact_keys(
            row, _REFERENCE_RECORD_KEYS, "reference comparison"
        )
        reference_inputs.append(
            {key: row[key] for key in _REFERENCE_INPUT_KEYS}
        )
    rebuilt = build_vbd_trajectory_group_effect_geometry_arm_record(
        binding=binding,
        panel_hash=record["panel_hash"],
        prepared_input_hash=record["prepared_input_hash"],
        model_input_hash=record["model_input_hash"],
        deterministic_reference_hash=record[
            "deterministic_reference_hash"
        ],
        deterministic_recomputation_hash=record[
            "deterministic_recomputation_hash"
        ],
        sampler_diagnostic_rows=sampler_inputs,
        reference_comparisons=reference_inputs,
        post_warmup_divergences=record["post_warmup_divergences"],
        max_treedepth_saturation_count=record[
            "max_treedepth_saturation_count"
        ],
        energy_bfmi_min=record["energy_bfmi_min"],
    )
    if rebuilt != record:
        raise VbdTrajectoryGroupEffectGeometryDiagnosticError(
            "geometry arm record differs from its reconstruction"
        )
    return record


def _expected_bindings() -> tuple[TrajectoryNutsGroupEffectGeometryBinding, ...]:
    values = []
    for case in VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_CASES:
        case_plan_hash = _case_plan_hash(case.case_ordinal)
        for lane_ordinal, lane in enumerate(
            VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_LANE_ORDER
        ):
            for arm in VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_ARM_ORDER:
                values.append(
                    build_vbd_trajectory_nuts_group_effect_geometry_binding(
                        case_ordinal=case.case_ordinal,
                        arm=arm,
                        lane=lane,
                        lane_ordinal=lane_ordinal,
                        plan_hash=case_plan_hash,
                    )
                )
    return tuple(values)


def _validate_arm_matrix(value: object) -> list[dict]:
    if type(value) is not list or len(value) != 12:
        raise VbdTrajectoryGroupEffectGeometryDiagnosticError(
            "geometry arm matrix must contain exactly twelve records"
        )
    arms = [
        validate_vbd_trajectory_group_effect_geometry_arm_record(record)
        for record in value
    ]
    expected_bindings = _expected_bindings()
    actual_bindings = [
        _binding_from_dict(record["binding"]) for record in arms
    ]
    if tuple(actual_bindings) != expected_bindings:
        raise VbdTrajectoryGroupEffectGeometryDiagnosticError(
            "geometry arm matrix order or identity is invalid"
        )
    pair_hash_fields = (
        "panel_hash",
        "prepared_input_hash",
        "model_input_hash",
        "deterministic_reference_hash",
        "deterministic_recomputation_hash",
    )
    case_panel_hashes: dict[int, str] = {}
    for pair_start in range(0, len(arms), 2):
        centered = arms[pair_start]
        noncentered = arms[pair_start + 1]
        centered_binding = actual_bindings[pair_start]
        noncentered_binding = actual_bindings[pair_start + 1]
        if (
            centered_binding.arm != "centered"
            or noncentered_binding.arm != "noncentered"
            or centered_binding.case_ordinal
            != noncentered_binding.case_ordinal
            or centered_binding.lane != noncentered_binding.lane
            or centered_binding.lane_ordinal
            != noncentered_binding.lane_ordinal
            or any(
                centered[field] != noncentered[field]
                for field in pair_hash_fields
            )
            or centered["deterministic_reference_hash"]
            != centered["deterministic_recomputation_hash"]
            or noncentered["deterministic_reference_hash"]
            != noncentered["deterministic_recomputation_hash"]
        ):
            raise VbdTrajectoryGroupEffectGeometryDiagnosticError(
                "paired geometry arms do not share exact source bindings"
            )
        previous_panel_hash = case_panel_hashes.setdefault(
            centered_binding.case_ordinal,
            centered["panel_hash"],
        )
        if previous_panel_hash != centered["panel_hash"]:
            raise VbdTrajectoryGroupEffectGeometryDiagnosticError(
                "geometry case lanes do not share one synthetic panel"
            )
    return arms


def _derive_classification(arms: list[dict]) -> str:
    centered_arms = arms[0::2]
    noncentered_arms = arms[1::2]
    if any(
        not arm["gate_results"]["all_gates_passed"]
        for arm in noncentered_arms
    ):
        return "REJECT_NONCENTERED_CANDIDATE"
    if (
        all(
            arm["gate_results"]["all_reference_gates_passed"]
            and arm["gate_results"][
                "all_non_divergence_sampler_gates_passed"
            ]
            for arm in centered_arms
        )
        and all(
            noncentered["post_warmup_divergences"]
            <= centered["post_warmup_divergences"]
            for centered, noncentered in zip(
                centered_arms, noncentered_arms, strict=True
            )
        )
        and any(
            centered["post_warmup_divergences"] > 0
            and noncentered["post_warmup_divergences"] == 0
            for centered, noncentered in zip(
                centered_arms, noncentered_arms, strict=True
            )
        )
    ):
        return "SUPPORTED_FOR_LATER_CONTRACT_AMENDMENT"
    if (
        all(
            arm["gate_results"]["all_gates_passed"]
            for arm in (*centered_arms, *noncentered_arms)
        )
        and all(
            arm["post_warmup_divergences"] == 0
            for arm in centered_arms
        )
    ):
        return "INCONCLUSIVE_CENTERED_GEOMETRY_NOT_REPRODUCED"
    return "INVALID_HOLD"


def _record_body(arm_records: list[dict]) -> dict:
    plan = vbd_trajectory_group_effect_geometry_plan()
    seed_manifest = vbd_trajectory_group_effect_geometry_seed_manifest()
    return {
        "schema_version": VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_SCHEMA_VERSION,
        "diagnostic_id": VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_DIAGNOSTIC_ID,
        "plan_hash": plan["plan_hash"],
        "seed_manifest_hash": seed_manifest["seed_manifest_hash"],
        "execution_state": "NOT_RUN",
        "runner_completion_binding": None,
        "classification": "INVALID_HOLD",
        "state": VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_STATE,
        "hold_reasons": [
            VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_HOLD_REASON
        ],
        "matrix_complete": True,
        "arm_records": arm_records,
        "ppc_state": "NOT_RUN",
        "acceptance_concordance_state": "NOT_RUN",
        "evidence_eligible": False,
        "acceptance_count_effect": 0,
        "internal_only": True,
        "synthetic_only": True,
        "aggregate_only": True,
        "customer_output_authorized": False,
        "raw_posterior_draws_emitted": False,
        "posterior_values_emitted": False,
    }


def _validate_record_structure(
    value: object,
    *,
    verify_record_hash: bool,
) -> list[dict]:
    record = _require_exact_keys(value, _RECORD_KEYS, "geometry record")
    if (
        record["schema_version"]
        != VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_SCHEMA_VERSION
        or record["diagnostic_id"]
        != VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_DIAGNOSTIC_ID
        or record["plan_hash"]
        != vbd_trajectory_group_effect_geometry_plan()["plan_hash"]
        or record["seed_manifest_hash"]
        != vbd_trajectory_group_effect_geometry_seed_manifest()[
            "seed_manifest_hash"
        ]
        or record["execution_state"] != "NOT_RUN"
        or record["runner_completion_binding"] is not None
        or record["classification"] != "INVALID_HOLD"
        or record["state"]
        != VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_STATE
        or record["hold_reasons"]
        != [VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_HOLD_REASON]
        or record["matrix_complete"] is not True
        or record["ppc_state"] != "NOT_RUN"
        or record["acceptance_concordance_state"] != "NOT_RUN"
        or record["evidence_eligible"] is not False
        or type(record["acceptance_count_effect"]) is not int
        or record["acceptance_count_effect"] != 0
        or record["internal_only"] is not True
        or record["synthetic_only"] is not True
        or record["aggregate_only"] is not True
        or record["customer_output_authorized"] is not False
        or record["raw_posterior_draws_emitted"] is not False
        or record["posterior_values_emitted"] is not False
    ):
        raise VbdTrajectoryGroupEffectGeometryDiagnosticError(
            "geometry record identity or permanent HOLD posture is invalid"
        )
    arms = _validate_arm_matrix(record["arm_records"])
    _strict_sha256(record["record_hash"], "geometry record hash")
    if verify_record_hash:
        body = {
            key: item
            for key, item in record.items()
            if key != "record_hash"
        }
        if record["record_hash"] != sha256_json(body):
            raise VbdTrajectoryGroupEffectGeometryDiagnosticError(
                "geometry record hash differs from its reconstruction"
            )
    return arms


def classify_vbd_trajectory_group_effect_geometry_result(
    value: object,
) -> str:
    """Derive the decision, with every malformed result taking INVALID precedence."""

    try:
        arms = _validate_record_structure(
            value,
            verify_record_hash=True,
        )
    except (
        TrajectoryIntegrationError,
        TrajectoryNutsError,
        TypeError,
        ValueError,
    ):
        return "INVALID_HOLD"
    return "INVALID_HOLD"


def build_vbd_trajectory_group_effect_geometry_record(
    *,
    arm_records: list[dict],
) -> dict:
    """Build the complete permanent-HOLD result from twelve strict arm records."""

    arms = _validate_arm_matrix(arm_records)
    body = _record_body(arms)
    return validate_vbd_trajectory_group_effect_geometry_record(
        {**body, "record_hash": sha256_json(body)}
    )


def validate_vbd_trajectory_group_effect_geometry_record(
    value: object,
) -> dict:
    """Validate exact structure, hashes, derived gates, and classification."""

    arms = _validate_record_structure(value, verify_record_hash=True)
    expected_body = _record_body(arms)
    expected = {
        **expected_body,
        "record_hash": sha256_json(expected_body),
    }
    if value != expected:
        raise VbdTrajectoryGroupEffectGeometryDiagnosticError(
            "geometry record differs from its reconstruction"
        )
    return value
