"""Sampler-free strict-record checks for the VBD geometry diagnostic."""

from __future__ import annotations

from copy import deepcopy
import json
import math

import pytest

import fluencytracr_inference.vbd_trajectory_nuts as nuts
import fluencytracr_inference.vbd_trajectory_synthetic as synthetic
from fluencytracr_inference import (
    vbd_trajectory_group_effect_geometry_diagnostic as geometry,
    vbd_trajectory_validation_resumable as validation_runner,
)
from fluencytracr_inference.hashing import sha256_json
from fluencytracr_inference.vbd_trajectory_concordance import (
    VbdTrajectoryConcordanceError,
    vbd_trajectory_concordance_bundle_from_dict,
)
from fluencytracr_inference.vbd_trajectory_group_effect_geometry_constants import (
    VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_ARM_ORDER,
    VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_CASES,
    VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_RESERVED_SEEDS,
)
from fluencytracr_inference.vbd_trajectory_group_effect_geometry_diagnostic import (
    VbdTrajectoryGroupEffectGeometryDiagnosticError,
    build_vbd_trajectory_group_effect_geometry_arm_record,
    build_vbd_trajectory_group_effect_geometry_record,
    classify_vbd_trajectory_group_effect_geometry_result,
    validate_vbd_trajectory_group_effect_geometry_arm_record,
    validate_vbd_trajectory_group_effect_geometry_record,
    vbd_trajectory_group_effect_geometry_plan,
    vbd_trajectory_group_effect_geometry_seed_manifest,
)
from fluencytracr_inference.vbd_trajectory_precision_canary import (
    VbdTrajectoryPrecisionCanaryError,
    validate_vbd_trajectory_precision_canary_result,
)
from fluencytracr_inference.vbd_trajectory_state_space import (
    vbd_trajectory_common_quantity_names,
)
from fluencytracr_inference.vbd_trajectory_synthetic import (
    vbd_trajectory_group_effect_geometry_diagnostic_case_body,
)
from fluencytracr_inference.vbd_trajectory_validation_resumable import (
    VbdTrajectoryValidationWorkspaceError,
    _validate_combined_value,
    _validate_freeze_manifest,
)
from fluencytracr_inference.vbd_trajectory_validation_study import (
    VbdTrajectoryValidationStudyError,
    vbd_trajectory_slot_result_from_dict,
)


@pytest.fixture(autouse=True)
def _numerical_execution_is_forbidden(monkeypatch):
    calls = []

    def sentinel(*args, **kwargs):
        calls.append((args, kwargs))
        raise AssertionError("geometry record tests cannot generate or sample")

    monkeypatch.setattr(nuts.pm, "sample", sentinel)
    monkeypatch.setattr(
        synthetic,
        "_generate_vbd_trajectory_case",
        sentinel,
    )
    yield
    assert calls == []


def _sampler_rows(panel_group_count: int, arm: str) -> list[dict]:
    names = list(vbd_trajectory_common_quantity_names(panel_group_count))
    if arm == "noncentered":
        names.extend(
            f"u_std[{index}]" for index in range(panel_group_count)
        )
    return [
        {
            "parameter_name": name,
            "r_hat": 1.0,
            "bulk_ess": 800.0,
            "tail_ess": 700.0,
            "posterior_mean_mcse_to_posterior_sd_ratio": 0.02,
            "interval_80_lower_endpoint_mcse_to_posterior_sd_ratio": 0.03,
            "interval_80_upper_endpoint_mcse_to_posterior_sd_ratio": 0.03,
            "interval_99_lower_endpoint_mcse_to_posterior_sd_ratio": 0.04,
            "interval_99_upper_endpoint_mcse_to_posterior_sd_ratio": 0.04,
        }
        for name in names
    ]


def _reference_rows(panel_group_count: int) -> list[dict]:
    return [
        {
            "quantity_name": name,
            "absolute_mean_difference_reference_sd": 0.05,
            "interval_80_lower_endpoint_difference_reference_sd": 0.08,
            "interval_80_upper_endpoint_difference_reference_sd": 0.08,
            "interval_99_lower_endpoint_difference_reference_sd": 0.10,
            "interval_99_upper_endpoint_difference_reference_sd": 0.10,
            "primary_to_reference_sd_ratio": 1.0,
        }
        for name in vbd_trajectory_common_quantity_names(panel_group_count)
    ]


def _build_arm_matrix(
    *,
    centered_divergences: int = 1,
    target: tuple[int, int, str] | None = None,
    sampler_update: tuple[str, object] | None = None,
    reference_update: tuple[str, object] | None = None,
    global_update: tuple[str, object] | None = None,
) -> list[dict]:
    records = []
    for case in VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_CASES:
        case_plan_hash = sha256_json(
            vbd_trajectory_group_effect_geometry_diagnostic_case_body(
                case.case_ordinal
            )
        )
        panel_hash = sha256_json(["panel", case.case_ordinal])
        panel_root = sha256_json(["panel-root", case.case_ordinal])
        for lane_ordinal, lane in enumerate(
            ("frequency", "engagement", "breadth")
        ):
            prepared_hash = sha256_json(
                ["prepared", case.case_ordinal, lane]
            )
            model_hash = sha256_json(["model", case.case_ordinal, lane])
            reference_hash = sha256_json(
                ["reference", case.case_ordinal, lane]
            )
            for arm in VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_ARM_ORDER:
                binding = (
                    nuts.build_vbd_trajectory_nuts_group_effect_geometry_binding(
                        case_ordinal=case.case_ordinal,
                        arm=arm,
                        lane=lane,
                        lane_ordinal=lane_ordinal,
                        plan_hash=case_plan_hash,
                    )
                )
                sampler_rows = _sampler_rows(
                    case.panel_group_count, arm
                )
                reference_rows = _reference_rows(case.panel_group_count)
                kwargs = {
                    "post_warmup_divergences": (
                        centered_divergences if arm == "centered" else 0
                    ),
                    "max_treedepth_saturation_count": 0,
                    "energy_bfmi_min": 0.8,
                }
                coordinate = (case.case_ordinal, lane_ordinal, arm)
                if target == coordinate and sampler_update is not None:
                    sampler_rows[0][sampler_update[0]] = sampler_update[1]
                if target == coordinate and reference_update is not None:
                    reference_rows[0][reference_update[0]] = (
                        reference_update[1]
                    )
                if target == coordinate and global_update is not None:
                    kwargs[global_update[0]] = global_update[1]
                records.append(
                    build_vbd_trajectory_group_effect_geometry_arm_record(
                        binding=binding,
                        panel_hash=panel_hash,
                        ordered_panel_manifest_root=panel_root,
                        prepared_input_hash=prepared_hash,
                        model_input_hash=model_hash,
                        deterministic_reference_hash=reference_hash,
                        deterministic_recomputation_hash=reference_hash,
                        sampler_diagnostic_rows=sampler_rows,
                        reference_comparisons=reference_rows,
                        **kwargs,
                    )
                )
    return records


def _rehash_record(record: dict) -> None:
    record["record_hash"] = sha256_json(
        {key: value for key, value in record.items() if key != "record_hash"}
    )


def test_seed_manifest_and_plan_freeze_exact_order_hashes_and_gates():
    manifest = vbd_trajectory_group_effect_geometry_seed_manifest()
    plan = vbd_trajectory_group_effect_geometry_plan()

    assert manifest["case_order"] == [0, 1]
    assert manifest["lane_order"] == ["frequency", "engagement", "breadth"]
    assert manifest["arm_order"] == ["centered", "noncentered"]
    assert manifest["reserved_seed_count"] == 50
    assert manifest["reserved_seeds"] == sorted(
        VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_RESERVED_SEEDS
    )
    assert manifest["seed_manifest_hash"] == sha256_json(
        {
            key: value
            for key, value in manifest.items()
            if key != "seed_manifest_hash"
        }
    )
    assert len(plan["execution_order"]) == 12
    assert [
        item["binding"]["arm"] for item in plan["execution_order"]
    ] == ["centered", "noncentered"] * 6
    assert [
        item["sequence_ordinal"] for item in plan["execution_order"]
    ] == list(range(12))
    assert plan["sampler_settings"]["full_settings"] is True
    assert plan["compiled_gates"] == {
        "r_hat_max": 1.01,
        "bulk_ess_min": 400.0,
        "tail_ess_min": 400.0,
        "post_warmup_divergences_max": 0,
        "max_treedepth_saturation_count_max": 0,
        "energy_bfmi_min": 0.3,
        "max_mcse_to_posterior_sd_ratio": 0.1,
        "mean_max_reference_sd": 0.15,
        "interval_80_endpoint_max_reference_sd": 0.2,
        "interval_99_endpoint_max_reference_sd": 0.2,
        "sd_ratio_min": 0.85,
        "sd_ratio_max": 1.15,
    }
    assert plan["plan_hash"] == sha256_json(
        {
            key: value
            for key, value in plan.items()
            if key != "plan_hash"
        }
    )
    for case_index, case in enumerate(plan["cases"]):
        group_count = (6, 12)[case_index]
        assert case["common_quantity_order"] == list(
            vbd_trajectory_common_quantity_names(group_count)
        )
        assert case["noncentered_only_sampler_diagnostic_order"] == [
            f"u_std[{index}]" for index in range(group_count)
        ]
    assert plan["state"] == "HOLD"
    assert plan["evidence_eligible"] is False
    assert plan["acceptance_count_effect"] == 0
    assert plan["ppc_state"] == "NOT_RUN"
    assert plan["acceptance_concordance_state"] == "NOT_RUN"


def test_geometry_modules_extend_only_the_clean_implementation_source_manifest():
    geometry_paths = {
        "inference/src/fluencytracr_inference/"
        "vbd_trajectory_group_effect_geometry_constants.py",
        "inference/src/fluencytracr_inference/"
        "vbd_trajectory_group_effect_geometry_diagnostic.py",
        "inference/src/fluencytracr_inference/"
        "vbd_trajectory_group_effect_geometry_projection.py",
    }
    assert geometry_paths <= set(
        validation_runner._IMPLEMENTATION_ONLY_SOURCE_PATHS
    )
    assert geometry_paths.isdisjoint(validation_runner._RUNNER_SOURCE_PATHS_V1)
    assert geometry_paths <= set(validation_runner._RUNNER_SOURCE_PATHS)
    assert len(validation_runner._RUNNER_SOURCE_PATHS_V1) == 30


def test_arm_records_are_sanitized_ordered_and_fully_reconstructible():
    records = _build_arm_matrix()
    centered = records[0]
    noncentered = records[1]
    common = list(vbd_trajectory_common_quantity_names(6))

    assert centered["parameter_order"] == common
    assert noncentered["parameter_order"] == [
        *common,
        *(f"u_std[{index}]" for index in range(6)),
    ]
    assert centered["common_quantity_order"] == common
    assert noncentered["common_quantity_order"] == common
    assert [
        row["quantity_name"]
        for row in noncentered["reference_comparisons"]
    ] == common
    assert not any(
        row["quantity_name"].startswith("u_std")
        for row in noncentered["reference_comparisons"]
    )
    assert noncentered["u_std_reference_comparison_present"] is False
    assert noncentered["raw_posterior_draws_emitted"] is False
    assert noncentered["posterior_values_emitted"] is False
    assert noncentered["gate_results"]["all_gates_passed"] is True
    assert centered["gate_results"]["divergences_passed"] is False
    for record in records:
        assert (
            validate_vbd_trajectory_group_effect_geometry_arm_record(record)
            == record
        )
        assert record["arm_record_hash"] == sha256_json(
            {
                key: value
                for key, value in record.items()
                if key != "arm_record_hash"
            }
        )


def test_supported_and_inconclusive_classifications_are_exact():
    supported_arms = _build_arm_matrix(centered_divergences=1)
    assert geometry._derive_classification(supported_arms) == (
        "SUPPORTED_FOR_LATER_CONTRACT_AMENDMENT"
    )
    inconclusive_arms = _build_arm_matrix(centered_divergences=0)
    assert geometry._derive_classification(inconclusive_arms) == (
        "INCONCLUSIVE_CENTERED_GEOMETRY_NOT_REPRODUCED"
    )
    for arms in (supported_arms, inconclusive_arms):
        record = build_vbd_trajectory_group_effect_geometry_record(
            arm_records=arms
        )
        assert record["execution_state"] == "NOT_RUN"
        assert record["runner_completion_binding"] is None
        assert record["classification"] == "INVALID_HOLD"
        assert classify_vbd_trajectory_group_effect_geometry_result(record) == (
            "INVALID_HOLD"
        )


@pytest.mark.parametrize(
    ("kind", "field", "value"),
    [
        ("sampler", "r_hat", 1.010001),
        ("sampler", "bulk_ess", 399.999),
        ("sampler", "tail_ess", 399.999),
        (
            "sampler",
            "posterior_mean_mcse_to_posterior_sd_ratio",
            0.100001,
        ),
        (
            "sampler",
            "interval_80_lower_endpoint_mcse_to_posterior_sd_ratio",
            0.100001,
        ),
        (
            "sampler",
            "interval_80_upper_endpoint_mcse_to_posterior_sd_ratio",
            0.100001,
        ),
        (
            "sampler",
            "interval_99_lower_endpoint_mcse_to_posterior_sd_ratio",
            0.100001,
        ),
        (
            "sampler",
            "interval_99_upper_endpoint_mcse_to_posterior_sd_ratio",
            0.100001,
        ),
        ("global", "post_warmup_divergences", 1),
        ("global", "max_treedepth_saturation_count", 1),
        ("global", "energy_bfmi_min", 0.299999),
        (
            "reference",
            "absolute_mean_difference_reference_sd",
            0.150001,
        ),
        (
            "reference",
            "interval_80_lower_endpoint_difference_reference_sd",
            0.200001,
        ),
        (
            "reference",
            "interval_80_upper_endpoint_difference_reference_sd",
            0.200001,
        ),
        (
            "reference",
            "interval_99_lower_endpoint_difference_reference_sd",
            0.200001,
        ),
        (
            "reference",
            "interval_99_upper_endpoint_difference_reference_sd",
            0.200001,
        ),
        ("reference", "primary_to_reference_sd_ratio", 0.849999),
        ("reference", "primary_to_reference_sd_ratio", 1.150001),
    ],
)
def test_any_complete_noncentered_gate_failure_rejects_candidate(
    kind, field, value
):
    updates = {
        "sampler_update": (field, value) if kind == "sampler" else None,
        "reference_update": (
            (field, value) if kind == "reference" else None
        ),
        "global_update": (field, value) if kind == "global" else None,
    }
    arms = _build_arm_matrix(
        target=(0, 0, "noncentered"),
        **updates,
    )
    assert geometry._derive_classification(arms) == (
        "REJECT_NONCENTERED_CANDIDATE"
    )
    record = build_vbd_trajectory_group_effect_geometry_record(
        arm_records=arms
    )
    assert record["classification"] == "INVALID_HOLD"
    assert (
        classify_vbd_trajectory_group_effect_geometry_result(record)
        == "INVALID_HOLD"
    )


@pytest.mark.parametrize(
    ("kind", "field", "value"),
    [
        ("sampler", "r_hat", 1.02),
        ("global", "max_treedepth_saturation_count", 1),
        (
            "reference",
            "absolute_mean_difference_reference_sd",
            0.16,
        ),
    ],
)
def test_remaining_complete_centered_failure_is_invalid_hold(
    kind, field, value
):
    record = build_vbd_trajectory_group_effect_geometry_record(
        arm_records=_build_arm_matrix(
            target=(0, 0, "centered"),
            sampler_update=(field, value) if kind == "sampler" else None,
            reference_update=(
                (field, value) if kind == "reference" else None
            ),
            global_update=(field, value) if kind == "global" else None,
        )
    )
    assert record["classification"] == "INVALID_HOLD"
    assert (
        classify_vbd_trajectory_group_effect_geometry_result(record)
        == "INVALID_HOLD"
    )
    assert validate_vbd_trajectory_group_effect_geometry_record(record) == record


def test_record_is_permanent_hold_hash_bound_and_round_trip_safe():
    record = build_vbd_trajectory_group_effect_geometry_record(
        arm_records=_build_arm_matrix()
    )
    assert record["state"] == "HOLD"
    assert record["execution_state"] == "NOT_RUN"
    assert record["runner_completion_binding"] is None
    assert record["evidence_eligible"] is False
    assert record["acceptance_count_effect"] == 0
    assert record["ppc_state"] == "NOT_RUN"
    assert record["acceptance_concordance_state"] == "NOT_RUN"
    assert record["customer_output_authorized"] is False
    assert not any(
        key in record
        for key in (
            "authorization_commit",
            "execution_authorization",
            "claim",
            "permit",
            "workspace_root",
            "checkpoint_root",
            "output_path",
        )
    )
    persisted = json.loads(
        json.dumps(
            record,
            sort_keys=True,
            separators=(",", ":"),
            allow_nan=False,
        )
    )
    assert (
        validate_vbd_trajectory_group_effect_geometry_record(persisted)
        == persisted
    )
    assert record["record_hash"] == sha256_json(
        {
            key: value
            for key, value in record.items()
            if key != "record_hash"
        }
    )


def test_structural_mutations_take_invalid_precedence_and_cannot_validate():
    valid = build_vbd_trajectory_group_effect_geometry_record(
        arm_records=_build_arm_matrix()
    )
    mutations = []

    missing = deepcopy(valid)
    missing["arm_records"].pop()
    _rehash_record(missing)
    mutations.append(missing)

    duplicate = deepcopy(valid)
    duplicate["arm_records"][1] = deepcopy(duplicate["arm_records"][0])
    _rehash_record(duplicate)
    mutations.append(duplicate)

    reordered = deepcopy(valid)
    reordered["arm_records"][0], reordered["arm_records"][1] = (
        reordered["arm_records"][1],
        reordered["arm_records"][0],
    )
    _rehash_record(reordered)
    mutations.append(reordered)

    extra = deepcopy(valid)
    extra["unexpected"] = False
    _rehash_record(extra)
    mutations.append(extra)

    bad_hash = deepcopy(valid)
    bad_hash["record_hash"] = "0" * 64
    mutations.append(bad_hash)

    forged_gate = deepcopy(valid)
    forged_gate["arm_records"][1]["gate_results"]["all_gates_passed"] = False
    forged_gate["arm_records"][1]["arm_record_hash"] = sha256_json(
        {
            key: value
            for key, value in forged_gate["arm_records"][1].items()
            if key != "arm_record_hash"
        }
    )
    _rehash_record(forged_gate)
    mutations.append(forged_gate)

    nonfinite = deepcopy(valid)
    nonfinite["arm_records"][1]["sampler_diagnostic_rows"][0]["r_hat"] = (
        math.nan
    )
    nonfinite["arm_records"][1]["arm_record_hash"] = "0" * 64
    nonfinite["record_hash"] = "0" * 64
    mutations.append(nonfinite)

    for mutation in mutations:
        assert (
            classify_vbd_trajectory_group_effect_geometry_result(mutation)
            == "INVALID_HOLD"
        )
        with pytest.raises(VbdTrajectoryGroupEffectGeometryDiagnosticError):
            validate_vbd_trajectory_group_effect_geometry_record(mutation)


@pytest.mark.parametrize(
    "mismatched_field",
    [
        "panel_hash",
        "ordered_panel_manifest_root",
        "prepared_input_hash",
        "model_input_hash",
        "deterministic_reference_hash",
        "deterministic_recomputation_hash",
    ],
)
def test_valid_arm_pair_with_mismatched_source_binding_is_structural_invalid(
    mismatched_field,
):
    arms = _build_arm_matrix()
    original = arms[1]
    sampler_inputs = [
        {
            key: row[key]
            for key in (
                "parameter_name",
                "r_hat",
                "bulk_ess",
                "tail_ess",
                "posterior_mean_mcse_to_posterior_sd_ratio",
                "interval_80_lower_endpoint_mcse_to_posterior_sd_ratio",
                "interval_80_upper_endpoint_mcse_to_posterior_sd_ratio",
                "interval_99_lower_endpoint_mcse_to_posterior_sd_ratio",
                "interval_99_upper_endpoint_mcse_to_posterior_sd_ratio",
            )
        }
        for row in original["sampler_diagnostic_rows"]
    ]
    reference_inputs = [
        {
            key: row[key]
            for key in (
                "quantity_name",
                "absolute_mean_difference_reference_sd",
                "interval_80_lower_endpoint_difference_reference_sd",
                "interval_80_upper_endpoint_difference_reference_sd",
                "interval_99_lower_endpoint_difference_reference_sd",
                "interval_99_upper_endpoint_difference_reference_sd",
                "primary_to_reference_sd_ratio",
            )
        }
        for row in original["reference_comparisons"]
    ]
    binding = nuts.build_vbd_trajectory_nuts_group_effect_geometry_binding(
        case_ordinal=0,
        arm="noncentered",
        lane="frequency",
        lane_ordinal=0,
        plan_hash=original["binding"]["plan_hash"],
    )
    build_values = {
        "panel_hash": original["panel_hash"],
        "ordered_panel_manifest_root": original[
            "ordered_panel_manifest_root"
        ],
        "prepared_input_hash": original["prepared_input_hash"],
        "model_input_hash": original["model_input_hash"],
        "deterministic_reference_hash": original[
            "deterministic_reference_hash"
        ],
        "deterministic_recomputation_hash": original[
            "deterministic_recomputation_hash"
        ],
    }
    build_values[mismatched_field] = "f" * 64
    arms[1] = build_vbd_trajectory_group_effect_geometry_arm_record(
        binding=binding,
        sampler_diagnostic_rows=sampler_inputs,
        reference_comparisons=reference_inputs,
        post_warmup_divergences=0,
        max_treedepth_saturation_count=0,
        energy_bfmi_min=0.8,
        **build_values,
    )
    with pytest.raises(VbdTrajectoryGroupEffectGeometryDiagnosticError):
        build_vbd_trajectory_group_effect_geometry_record(arm_records=arms)


def test_forged_classification_is_rederived_and_rejected():
    record = build_vbd_trajectory_group_effect_geometry_record(
        arm_records=_build_arm_matrix()
    )
    record["classification"] = "SUPPORTED_FOR_LATER_CONTRACT_AMENDMENT"
    _rehash_record(record)

    assert classify_vbd_trajectory_group_effect_geometry_result(record) == (
        "INVALID_HOLD"
    )
    with pytest.raises(VbdTrajectoryGroupEffectGeometryDiagnosticError):
        validate_vbd_trajectory_group_effect_geometry_record(record)


@pytest.mark.parametrize(
    ("field", "value"),
    (
        ("execution_state", "COMPLETE"),
        ("runner_completion_binding", {"runner_hash": "0" * 64}),
    ),
)
def test_unbound_runner_completion_cannot_be_rehashed_into_support(field, value):
    record = build_vbd_trajectory_group_effect_geometry_record(
        arm_records=_build_arm_matrix()
    )
    record[field] = value
    record["classification"] = "SUPPORTED_FOR_LATER_CONTRACT_AMENDMENT"
    _rehash_record(record)

    assert classify_vbd_trajectory_group_effect_geometry_result(record) == (
        "INVALID_HOLD"
    )
    with pytest.raises(VbdTrajectoryGroupEffectGeometryDiagnosticError):
        validate_vbd_trajectory_group_effect_geometry_record(record)


def test_arm_record_rejects_extra_rows_wrong_types_and_forged_hashes():
    arm = _build_arm_matrix()[1]
    mutations = []

    extra = deepcopy(arm)
    extra["unexpected"] = False
    mutations.append(extra)

    reordered = deepcopy(arm)
    reordered["sampler_diagnostic_rows"][0:2] = reversed(
        reordered["sampler_diagnostic_rows"][0:2]
    )
    mutations.append(reordered)

    boolean_numeric = deepcopy(arm)
    boolean_numeric["energy_bfmi_min"] = True
    mutations.append(boolean_numeric)

    forged_row = deepcopy(arm)
    forged_row["sampler_diagnostic_rows"][0]["gate_results"][
        "r_hat_passed"
    ] = False
    forged_row["sampler_diagnostic_rows"][0]["diagnostic_row_hash"] = (
        sha256_json(
            {
                key: value
                for key, value in forged_row[
                    "sampler_diagnostic_rows"
                ][0].items()
                if key != "diagnostic_row_hash"
            }
        )
    )
    forged_row["arm_record_hash"] = sha256_json(
        {
            key: value
            for key, value in forged_row.items()
            if key != "arm_record_hash"
        }
    )
    mutations.append(forged_row)

    for mutation in mutations:
        with pytest.raises(VbdTrajectoryGroupEffectGeometryDiagnosticError):
            validate_vbd_trajectory_group_effect_geometry_arm_record(mutation)


def test_geometry_record_is_rejected_by_existing_python_proof_paths():
    record = build_vbd_trajectory_group_effect_geometry_record(
        arm_records=_build_arm_matrix()
    )
    with pytest.raises(VbdTrajectoryPrecisionCanaryError):
        validate_vbd_trajectory_precision_canary_result(record)
    with pytest.raises(VbdTrajectoryConcordanceError):
        vbd_trajectory_concordance_bundle_from_dict(record)
    with pytest.raises(VbdTrajectoryValidationStudyError):
        vbd_trajectory_slot_result_from_dict(record)
    with pytest.raises(VbdTrajectoryValidationWorkspaceError):
        _validate_freeze_manifest(record)
    with pytest.raises(VbdTrajectoryValidationWorkspaceError):
        _validate_combined_value(record, {})
