from dataclasses import replace

import pytest

from fluencytracr_inference.hashing import sha256_json
from fluencytracr_inference.vbd_trajectory_validation_plan import (
    required_vbd_trajectory_validation_slots,
)
from fluencytracr_inference.vbd_trajectory_validation_study import (
    VbdTrajectoryValidationStudyError,
    _lane_result_from_dict,
    build_vbd_trajectory_lane_result,
    evaluate_vbd_trajectory_result_manifest,
    primary_coverage_gate,
    summarize_vbd_trajectory_validation_results,
    targeted_clopper_pearson_interval,
    targeted_coverage_gate,
)


def _hash(role: str) -> str:
    return sha256_json({"fixture": "standalone_lane_summary", "role": role})


def _integration_diagnostics() -> dict:
    body = {
        "algorithm": "binary64_representable_normalized_weight_retention_v1",
        "excluded_sobol_ordinal_commitment": _hash("excluded_ordinals"),
        "finite_log_weight_count": 8192,
        "generated_point_count": 8192,
        "retained_sobol_ordinal_commitment": _hash("retained_ordinals"),
        "retained_weight_count": 8192,
    }
    return {
        "status": "PASS",
        **body,
        "outer_weight_retention_hash": sha256_json(body),
    }


def _lane_result(
    *,
    raw_truth: float = 0.2,
    direction_sign: int = -1,
    interval_80_lower: float = -0.3,
    interval_80_upper: float = -0.1,
    interval_99_lower: float = -0.5,
    interval_99_upper: float = 0.1,
):
    return build_vbd_trajectory_lane_result(
        lane="frequency",
        raw_truth=raw_truth,
        direction_sign=direction_sign,
        posterior_mean=float(direction_sign * raw_truth),
        posterior_sd=0.2,
        interval_80_lower=interval_80_lower,
        interval_80_upper=interval_80_upper,
        interval_99_lower=interval_99_lower,
        interval_99_upper=interval_99_upper,
        prepared_input_hash=_hash("prepared"),
        model_input_hash=_hash("model"),
        context_binding_hash=_hash("context"),
        fit_summary_hash=_hash("fit"),
        integration_diagnostics=_integration_diagnostics(),
    )


def test_primary_coverage_count_boundaries_are_inclusive():
    assert primary_coverage_gate(148) is True
    assert primary_coverage_gate(172) is True
    assert primary_coverage_gate(147) is False
    assert primary_coverage_gate(173) is False
    for invalid in (-1, 201, True):
        with pytest.raises(VbdTrajectoryValidationStudyError):
            primary_coverage_gate(invalid)


def test_targeted_clopper_pearson_is_exact_and_nonvacuous():
    assert targeted_clopper_pearson_interval(0)[0] == 0.0
    assert targeted_clopper_pearson_interval(30)[1] == 1.0
    lower, upper = targeted_clopper_pearson_interval(24)
    assert 0.0 < lower < upper < 1.0
    assert targeted_coverage_gate(24) is True
    assert targeted_coverage_gate(0) is False
    for invalid in (-1, 31, True):
        with pytest.raises(VbdTrajectoryValidationStudyError):
            targeted_clopper_pearson_interval(invalid)


def test_lane_summary_derives_direction_coverage_and_hash_without_a_slot():
    lane = _lane_result()
    assert lane.direction_adjusted_truth == pytest.approx(-0.2)
    assert lane.interval_80_covers_truth is True
    assert lane.internal_false_movement is False
    assert lane.lane_result_hash == sha256_json(lane.body_without_hash())


def test_lane_summary_coverage_includes_endpoints_and_null_flag_is_strict():
    lane = _lane_result(
        raw_truth=0.0,
        direction_sign=1,
        interval_80_lower=0.0,
        interval_80_upper=0.1,
        interval_99_lower=0.0,
        interval_99_upper=0.2,
    )
    assert lane.interval_80_covers_truth is True
    assert lane.internal_false_movement is False

    false_movement = _lane_result(
        raw_truth=0.0,
        direction_sign=1,
        interval_80_lower=0.02,
        interval_80_upper=0.1,
        interval_99_lower=0.01,
        interval_99_upper=0.2,
    )
    assert false_movement.interval_80_covers_truth is False
    assert false_movement.internal_false_movement is True


def test_lane_summary_rejects_hash_tampering():
    with pytest.raises(VbdTrajectoryValidationStudyError):
        replace(_lane_result(), lane_result_hash="0" * 64)


def test_lane_summary_rejects_retention_tampering_and_missing_fields():
    lane = _lane_result()
    with pytest.raises(VbdTrajectoryValidationStudyError, match="retention hash"):
        replace(lane, outer_weight_retention_hash="0" * 64)
    with pytest.raises(VbdTrajectoryValidationStudyError, match="counts"):
        replace(lane, retained_weight_count=4095)
    with pytest.raises(VbdTrajectoryValidationStudyError, match="must be distinct"):
        replace(
            lane,
            excluded_sobol_ordinal_commitment=(
                lane.retained_sobol_ordinal_commitment
            ),
        )

    retention_fields = (
        "generated_point_count",
        "finite_log_weight_count",
        "retained_weight_count",
        "retained_sobol_ordinal_commitment",
        "excluded_sobol_ordinal_commitment",
        "outer_weight_retention_hash",
    )
    for field in retention_fields:
        payload = lane.to_dict()
        payload.pop(field)
        with pytest.raises(VbdTrajectoryValidationStudyError, match="shape"):
            _lane_result_from_dict(payload)

    with pytest.raises(VbdTrajectoryValidationStudyError, match="omit"):
        build_vbd_trajectory_lane_result(
            lane="frequency",
            raw_truth=0.2,
            direction_sign=-1,
            posterior_mean=-0.2,
            posterior_sd=0.2,
            interval_80_lower=-0.3,
            interval_80_upper=-0.1,
            interval_99_lower=-0.5,
            interval_99_upper=0.1,
            prepared_input_hash=_hash("prepared"),
            model_input_hash=_hash("model"),
            context_binding_hash=_hash("context"),
            fit_summary_hash=_hash("fit"),
            integration_diagnostics={"status": "PASS"},
        )


def test_lane_summary_is_summary_only():
    encoded = repr(_lane_result().to_dict()).lower()
    for forbidden in (
        "posterior_draws",
        "latent_paths",
        "support_values",
        "raw_rows",
        "user_id",
        "traceback",
        "exception_message",
    ):
        assert forbidden not in encoded


def test_empty_study_is_fail_closed_without_computing_acceptance_evidence():
    summary = summarize_vbd_trajectory_validation_results(())
    assert summary["state"] == "HOLD"
    assert summary["observed_slot_count"] == 0
    assert summary["exact_manifest_complete"] is False
    assert summary["canonical_order_complete"] is False
    assert summary["failing_checks"] == ["exact_manifest_incomplete"]
    assert summary["coverage_cells"] == []
    assert summary["null_cells"] == []
    assert summary["bias_cells"] == []
    assert summary["understated_uncertainty_cells"] == []
    assert summary["worst_null_false_movement_rate"] is None
    assert summary["customer_output_authorized"] is False
    assert summary["independent_acceptance_complete"] is False
    assert summary["promotion_complete"] is False


def test_exact_1999_key_manifest_is_incomplete_without_building_results():
    slots = required_vbd_trajectory_validation_slots()
    manifest = evaluate_vbd_trajectory_result_manifest(
        tuple(slot.slot_id for slot in slots[:-1])
    )
    assert manifest["exact_manifest_complete"] is False
    assert manifest["canonical_order_complete"] is False
    assert manifest["missing_ids"] == (slots[-1].slot_id,)
    assert manifest["duplicate_ids"] == ()
    assert manifest["off_plan_ids"] == ()


@pytest.mark.parametrize("malformed", [None, [], (object(),)])
def test_malformed_study_input_is_rejected(malformed):
    with pytest.raises(VbdTrajectoryValidationStudyError):
        summarize_vbd_trajectory_validation_results(malformed)
