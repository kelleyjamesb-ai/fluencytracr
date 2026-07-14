from dataclasses import replace

import pytest

from fluencytracr_inference.ai_fluency_measurement_calibration import (
    MEASUREMENT_FULL_REPLICATIONS_PER_SCENARIO,
    MEASUREMENT_SMOKE_REPLICATIONS_PER_SCENARIO,
    MEASUREMENT_SYNTHETIC_SCENARIOS,
    MeasurementCalibrationStudyError,
    ScenarioStudySummary,
    _study_failures,
    run_measurement_calibration_study,
    validate_measurement_calibration_study,
)
from fluencytracr_inference.ai_fluency_measurement_calibration_artifact import (
    emit_measurement_calibration_artifact,
    measurement_calibration_artifact_payload_hash,
    measurement_calibration_artifact_self_hash,
)
from fluencytracr_inference.ai_fluency_measurement_calibration_cli import main
from fluencytracr_inference.hashing import sha256_json


@pytest.fixture(scope="module")
def smoke_study():
    return run_measurement_calibration_study(execution_mode="smoke")


@pytest.fixture(scope="module")
def smoke_artifact(smoke_study):
    return emit_measurement_calibration_artifact(
        smoke_study, generated_at="2026-07-14T00:00:00+00:00"
    )


def test_fixed_full_and_smoke_plans_are_not_runtime_tunable(smoke_study):
    assert MEASUREMENT_FULL_REPLICATIONS_PER_SCENARIO == 200
    assert MEASUREMENT_SMOKE_REPLICATIONS_PER_SCENARIO == 1
    assert smoke_study.replications_per_scenario == 1
    assert len(smoke_study.slot_results) == len(MEASUREMENT_SYNTHETIC_SCENARIOS)
    assert tuple(summary.scenario for summary in smoke_study.scenario_summaries) == (
        "invariant",
        "invariant_latent_shift",
        "loading_drift",
        "threshold_drift",
    )
    assert all(summary.expected_result_rate == 1.0 for summary in smoke_study.scenario_summaries)
    assert all(summary.recovery_pass_rate == 1.0 for summary in smoke_study.scenario_summaries)


def test_smoke_study_and_artifact_fail_closed(smoke_study, smoke_artifact):
    assert smoke_study.complete_full_plan is False
    assert smoke_study.failing_checks == ("full_replication_plan_incomplete",)
    assert smoke_artifact["state"] == "HOLD"
    assert smoke_artifact["failing_checks"] == ["full_replication_plan_incomplete"]
    assert smoke_artifact["completion_posture"]["full_study_executed"] is False
    assert smoke_artifact["completion_posture"]["parent_openspec_task_5_5_complete"] is False
    assert smoke_artifact["completion_posture"]["independent_code_review"] == "NOT_RUN"


def test_artifact_is_summary_only_and_hash_bound(smoke_artifact):
    assert smoke_artifact["hash_bindings"]["artifact_payload_hash"] == (
        measurement_calibration_artifact_payload_hash(smoke_artifact)
    )
    assert smoke_artifact["hash_bindings"]["artifact_self_hash"] == (
        measurement_calibration_artifact_self_hash(smoke_artifact)
    )
    assert smoke_artifact["study"]["total_slot_count"] == 4
    assert smoke_artifact["execution_recomputation"][
        "all_compiled_slots_freshly_recomputed"
    ] is True
    text = repr(smoke_artifact).lower()
    for forbidden in (
        "cell_counts",
        "category_counts",
        "posterior_draws': [",
        "'respondent_id':",
        "'raw_answers':",
        "latent_states\": [",
    ):
        assert forbidden not in text
    assert all(value is False for value in smoke_artifact["blocked_outputs"].values())
    model = smoke_artifact["model_specification"]
    assert model["threshold_uncertainty_representation"] == (
        "joint_cumulative_dirichlet_delta_laplace"
    )
    assert model["loading_curvature"] == "exact_nonlinear_product_hessian"
    assert model["second_order_ratio_pooling"] == (
        "gls_with_shared_loading_covariance"
    )


def test_forged_or_changed_study_rejects(smoke_study):
    changed = replace(smoke_study, study_hash="0" * 64)
    with pytest.raises(MeasurementCalibrationStudyError, match="hash"):
        validate_measurement_calibration_study(changed)

    reordered = replace(smoke_study, slot_results=tuple(reversed(smoke_study.slot_results)))
    with pytest.raises(MeasurementCalibrationStudyError, match="slots"):
        validate_measurement_calibration_study(reordered)

    relabeled_size = replace(
        smoke_study,
        sample_size_per_wave=smoke_study.sample_size_per_wave + 1,
        study_hash="0" * 64,
    )
    relabeled_size = replace(
        relabeled_size,
        study_hash=sha256_json(relabeled_size.to_hash_body()),
    )
    with pytest.raises(MeasurementCalibrationStudyError, match="sample size"):
        validate_measurement_calibration_study(relabeled_size)


def test_opaque_hash_forgery_cannot_pass_artifact_execution_recomputation(smoke_study):
    original = smoke_study.slot_results[0]
    body = original.to_dict()
    body.pop("result_hash")
    body["package_hash"] = "f" * 64
    forged_result = replace(
        original,
        package_hash="f" * 64,
        result_hash=sha256_json(body),
    )
    forged_results = (forged_result,) + smoke_study.slot_results[1:]
    forged = replace(smoke_study, slot_results=forged_results, study_hash="0" * 64)
    forged = replace(forged, study_hash=sha256_json(forged.to_hash_body()))

    validate_measurement_calibration_study(forged)
    with pytest.raises(MeasurementCalibrationStudyError, match="fresh compiled-seed"):
        emit_measurement_calibration_artifact(forged)


def test_exact_rate_boundaries_pass_without_float_error():
    summaries = (
        ScenarioStudySummary("invariant", 200, 190, 0.95, 180, 0.90, 0),
        ScenarioStudySummary("invariant_latent_shift", 200, 190, 0.95, 180, 0.90, 0),
        ScenarioStudySummary("loading_drift", 200, 160, 0.80, 180, 0.90, 0),
        ScenarioStudySummary("threshold_drift", 200, 160, 0.80, 180, 0.90, 0),
    )

    assert _study_failures(
        execution_mode="full", summaries=summaries, complete_full_plan=True
    ) == ()


def test_cli_exposes_only_fixed_mode_choice(capsys, monkeypatch, smoke_artifact):
    with pytest.raises(SystemExit):
        main(["--replications", "2"])
    monkeypatch.setattr(
        "fluencytracr_inference.ai_fluency_measurement_calibration_cli.run_measurement_calibration_proof",
        lambda **_kwargs: smoke_artifact,
    )
    assert main(["--mode", "smoke"]) == 0
    output = capsys.readouterr().out
    assert '"state":"HOLD"' in output
    assert '"parent_openspec_task_5_5_complete":false' in output
