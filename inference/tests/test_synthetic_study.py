"""Phase B2 computed synthetic calibration/null/floor study tests."""

import dataclasses
import math
from types import SimpleNamespace

import numpy as np
import pytest

from fluencytracr_inference.artifact import emit_proof_artifact
from fluencytracr_inference.acceptance_study import (
    _blocked_outputs,
    acceptance_study_result_from_report,
    run_sampler_artifact_full_acceptance_study,
)
from fluencytracr_inference.constants import (
    CONFIDENCE_MODEL_MINIMUM_COHORT_FLOOR,
    CONFIDENCE_SERIES_READ_PATH_COHORT_FLOOR,
    INFERENCE_PROOF_ESTIMAND_PARAMETER_NAME,
    INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN,
    INFERENCE_PROOF_NULL_FALSE_ELIGIBILITY_MAX,
)
from fluencytracr_inference.diagnostics import PreTrendResult
from fluencytracr_inference.hashing import inference_proof_artifact_self_hash
from fluencytracr_inference.negative_control_study import (
    build_floor_control_report,
    build_negative_control_report,
    floor_control_cases,
    generate_floor_control_dataset,
    generate_negative_control_dataset,
    negative_control_cases,
)
from fluencytracr_inference.synthetic import generate_did_dataset
from fluencytracr_inference.synthetic_study import (
    CALIBRATION_COHORT_SIZES,
    CALIBRATION_EFFECT_SIZES,
    ReplicationResult,
    build_null_checks,
    compute_floor_checks,
    evaluate_replication,
    run_proof_with_synthetic_study,
    run_synthetic_study,
    run_synthetic_study_inputs,
)
from fluencytracr_inference.task_3_3_evidence import (
    TASK_3_3_REQUIRED_EVIDENCE_HOLD_STATE,
    TASK_3_3_REQUIRED_EVIDENCE_OBSERVED_STATE,
    build_task_3_3_required_evidence_report,
)


def test_replication_evaluator_is_seeded_and_covers_known_effect():
    dataset = generate_did_dataset(seed=202607080, k=16, injected_effect_sd=0.5)
    result = evaluate_replication(dataset)
    assert result.seed == dataset.seed
    assert result.effect_size == 0.5
    assert result.cohort_size == 16
    assert result.posterior_sd > 0
    assert result.ci80_lower < result.ci80_upper
    assert result.covered_injected_effect is True


def test_smoke_study_grid_shape_and_standard_error_formula():
    study = run_synthetic_study(replication_count_per_cell=3)
    scenarios = study.calibration_scenarios
    assert len(scenarios) == len(CALIBRATION_EFFECT_SIZES) * len(CALIBRATION_COHORT_SIZES)
    assert [
        (scenario["injected_effect_size_sd"], scenario["cohort_size"])
        for scenario in scenarios
    ] == [
        (effect, k)
        for effect in CALIBRATION_EFFECT_SIZES
        for k in CALIBRATION_COHORT_SIZES
    ]
    for scenario in scenarios:
        p = scenario["coverage_rate"]
        n = scenario["replication_count"]
        assert scenario["coverage_standard_error"] == math.sqrt(p * (1 - p) / n)
        assert scenario["pass"] is False
    assert study.full_replication_requirement_met is False
    with pytest.raises(ValueError, match="smoke synthetic-study outputs"):
        study.to_artifact_inputs()


def test_null_checks_gate_at_five_percent_in_full_study():
    inputs = run_synthetic_study_inputs()
    null_checks = inputs.null_checks
    assert null_checks["null_effect_scenario_count"] >= INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN
    assert null_checks["false_eligibility_rate"] <= INFERENCE_PROOF_NULL_FALSE_ELIGIBILITY_MAX
    assert null_checks["pass"] is True


def test_null_checks_use_worst_null_cell_not_pooled_rate():
    replications = []
    for cohort_size, false_eligible_count in ((12, 11), (16, 0)):
        for index in range(200):
            replications.append(
                ReplicationResult(
                    effect_size=0.0,
                    cohort_size=cohort_size,
                    seed=cohort_size * 1000 + index,
                    posterior_mean=0.0,
                    posterior_sd=1.0,
                    ci80_lower=-1.0,
                    ci80_upper=1.0,
                    null_guard_lower=1.0 if index < false_eligible_count else -1.0,
                    null_guard_upper=1.0,
                    covered_injected_effect=True,
                    contribution_estimate_eligible_under_null_guard=(
                        index < false_eligible_count
                    ),
                )
            )

    null_checks = build_null_checks(tuple(replications))

    assert null_checks == {
        "null_effect_scenario_count": 200,
        "false_eligibility_rate": 0.055,
        "pass": False,
    }


def test_replication_evaluator_counts_two_sided_null_false_eligibility():
    dataset = generate_did_dataset(seed=202607081, k=12, injected_effect_sd=0.0)
    y = dataset.y.copy()
    for index in range(len(y)):
        if dataset.treated[index] == 1 and dataset.post[index] == 1:
            y[index] = -5.0 + 0.1 * (int(dataset.cohort_idx[index]) % 3)
        elif dataset.treated[index] == 1:
            y[index] = 0.1 * (int(dataset.cohort_idx[index]) % 2)
        elif dataset.post[index] == 1:
            y[index] = 0.1 * (int(dataset.cohort_idx[index]) % 4)
        else:
            y[index] = 0.0
    result = evaluate_replication(dataclasses.replace(dataset, y=y))

    assert result.effect_size == 0.0
    assert result.null_guard_upper < 0.0
    assert result.contribution_estimate_eligible_under_null_guard is True


def test_full_study_computed_calibration_passes_required_cells():
    inputs = run_synthetic_study_inputs()
    assert len(inputs.calibration_scenarios) == 6
    for scenario in inputs.calibration_scenarios:
        assert scenario["replication_count"] >= INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN
        assert scenario["scenario_id"].startswith("computed-b2-")
        assert scenario["pass"] is True
        assert 0.74 <= scenario["coverage_rate"] <= 0.86


def test_floor_checks_shape_and_constants():
    checks = compute_floor_checks()
    assert CONFIDENCE_MODEL_MINIMUM_COHORT_FLOOR == 5
    assert CONFIDENCE_SERIES_READ_PATH_COHORT_FLOOR == 10
    assert checks["k4_rejected"] == {
        "cohort_size": 4,
        "outcome": "rejected_below_schema_floor",
        "pass": True,
    }
    assert checks["k8_internal_only"] == {
        "cohort_size": 8,
        "outcome": "internal_only_display_ineligible",
        "valid_internal": True,
        "display_eligible": False,
        "pass": True,
    }
    assert checks["eligible_floor_cases"] == [
        {"cohort_size": 12, "valid_internal": True, "display_eligible": True, "pass": True},
        {"cohort_size": 16, "valid_internal": True, "display_eligible": True, "pass": True},
    ]


def test_negative_control_specs_cover_contract():
    assert [case.control_id for case in negative_control_cases()] == [
        "no_credible_comparison_cohort",
        "violated_pre_trend",
        "badly_mismatched_comparison_cohort",
        "prior_dominated_weak_data",
        "missing_windows",
        "suppressed_windows",
        "naive_repeated_milestone_peeking",
    ]


def _fit_for_dataset(clean_fit, dataset):
    return dataclasses.replace(
        clean_fit,
        dataset=dataset,
        synthetic_input_hash=dataset.synthetic_input_hash(),
    )


def _diagnostics_for_control(clean_diagnostics, control_id):
    if control_id == "violated_pre_trend":
        return dataclasses.replace(
            clean_diagnostics,
            pre_trend=PreTrendResult(
                ci80_lower=0.2,
                ci80_upper=0.8,
                includes_zero=False,
                passed=False,
                wall_time_seconds=0.0,
            ),
        )
    if control_id == "prior_dominated_weak_data":
        sensitivity = dataclasses.replace(
            clean_diagnostics.prior_sensitivity,
            posterior_mean_shift_in_posterior_sd=0.5,
            passed=False,
        )
        return dataclasses.replace(clean_diagnostics, prior_sensitivity=sensitivity)
    return clean_diagnostics


def test_negative_control_report_passes_for_required_hold_artifacts(
    clean_fit, clean_diagnostics, computed_study_inputs
):
    artifacts = {}
    for case in negative_control_cases():
        dataset = generate_negative_control_dataset(case)
        artifacts[case.control_id] = emit_proof_artifact(
            dataset=dataset,
            fit=_fit_for_dataset(clean_fit, dataset),
            diagnostics=_diagnostics_for_control(clean_diagnostics, case.control_id),
            repeated_evaluation_detected=case.repeated_evaluation_detected,
            **computed_study_inputs.as_run_proof_kwargs(),
        )

    report = build_negative_control_report(artifacts)

    assert report["report_class"] == "internal_synthetic_negative_control_report"
    assert report["internal_only"] is True
    assert report["artifact_inputs_authorized"] is False
    assert report["open_spec_3_3_completion_authorized"] is False
    assert report["blocked_outputs"] == _blocked_outputs()
    assert report["control_count"] == 7
    assert report["all_required_controls_present"] is True
    assert report["all_controls_pass"] is True
    for control in report["controls"]:
        assert control["governance_state"] == "HOLD"
        assert control["comparison_supported_contribution_estimate_authorized"] is False
        assert control["artifact_bound_to_expected_input"] is True
        assert control["section_evidence_matches"] is True


def test_negative_control_report_holds_when_control_missing(
    clean_fit, clean_diagnostics, computed_study_inputs
):
    case = negative_control_cases()[0]
    dataset = generate_negative_control_dataset(case)
    artifact = emit_proof_artifact(
        dataset=dataset,
        fit=_fit_for_dataset(clean_fit, dataset),
        diagnostics=clean_diagnostics,
        **computed_study_inputs.as_run_proof_kwargs(),
    )

    report = build_negative_control_report({case.control_id: artifact})

    assert report["all_required_controls_present"] is False
    assert report["all_controls_pass"] is False
    missing = [control for control in report["controls"] if control["governance_state"] == "MISSING"]
    assert missing


def test_negative_control_report_rejects_artifact_bound_to_wrong_control(
    clean_fit, clean_diagnostics, computed_study_inputs
):
    artifacts = {}
    for case in negative_control_cases():
        dataset = generate_negative_control_dataset(case)
        artifacts[case.control_id] = emit_proof_artifact(
            dataset=dataset,
            fit=_fit_for_dataset(clean_fit, dataset),
            diagnostics=_diagnostics_for_control(clean_diagnostics, case.control_id),
            repeated_evaluation_detected=case.repeated_evaluation_detected,
            **computed_study_inputs.as_run_proof_kwargs(),
        )
    artifacts["badly_mismatched_comparison_cohort"] = artifacts[
        "no_credible_comparison_cohort"
    ]

    report = build_negative_control_report(artifacts)

    by_id = {control["control_id"]: control for control in report["controls"]}
    mismatched = by_id["badly_mismatched_comparison_cohort"]
    assert mismatched["artifact_valid"] is True
    assert mismatched["artifact_bound_to_expected_input"] is False
    assert mismatched["pass"] is False
    assert report["all_controls_pass"] is False


def test_negative_control_report_rejects_minimal_forged_artifact():
    report = build_negative_control_report(
        {
            "no_credible_comparison_cohort": {
                "governance_state": {
                    "state": "HOLD",
                    "failing_diagnostics": ["comparison_cohort_adequacy"],
                    "comparison_supported_contribution_estimate_authorized": False,
                    "evidence_tier_only": True,
                }
            }
        }
    )

    first = report["controls"][0]
    assert first["artifact_valid"] is False
    assert first["pass"] is False
    assert report["all_controls_pass"] is False


def test_negative_control_report_rejects_self_hashed_governance_forgery():
    forged = {
        "artifact_class": "internal_synthetic_inference_proof",
        "synthetic_generator": {
            "real_data_present": False,
            "customer_data_present": False,
            "production_data_present": False,
            "live_data_source_present": False,
        },
        "governance_state": {
            "state": "HOLD",
            "failing_diagnostics": ["comparison_cohort_adequacy"],
            "comparison_supported_contribution_estimate_authorized": False,
            "evidence_tier_only": True,
        },
        "hash_bindings": {
            "source_posterior_hash": "forged-source",
            "synthetic_input_hash": "forged-input",
        },
        "internal_only": True,
        "customer_output_authorized": False,
        "probability_output_authorized": False,
        "confidence_output_authorized": False,
        "finance_output_authorized": False,
        "creates_route": False,
        "creates_ui": False,
        "writes_persistence": False,
        "creates_export": False,
        "renders_readout": False,
        "executes_connector": False,
        "promotion_decision_ref": None,
    }
    forged["hash_bindings"]["artifact_self_hash"] = inference_proof_artifact_self_hash(
        forged
    )

    report = build_negative_control_report(
        {"no_credible_comparison_cohort": forged}
    )

    first = report["controls"][0]
    assert first["artifact_valid"] is False
    assert first["pass"] is False
    assert report["all_controls_pass"] is False


def test_negative_control_report_rejects_governance_label_without_section_evidence(
    clean_fit, clean_diagnostics, computed_study_inputs
):
    case = [
        control
        for control in negative_control_cases()
        if control.control_id == "naive_repeated_milestone_peeking"
    ][0]
    dataset = generate_negative_control_dataset(case)
    artifact = emit_proof_artifact(
        dataset=dataset,
        fit=_fit_for_dataset(clean_fit, dataset),
        diagnostics=clean_diagnostics,
        repeated_evaluation_detected=True,
        **computed_study_inputs.as_run_proof_kwargs(),
    )
    artifact["peeking_control"]["repeated_evaluation"] = False
    artifact["peeking_control"]["pass"] = True
    artifact["hash_bindings"]["artifact_self_hash"] = inference_proof_artifact_self_hash(
        artifact
    )

    report = build_negative_control_report({case.control_id: artifact})

    by_id = {control["control_id"]: control for control in report["controls"]}
    peeking = by_id["naive_repeated_milestone_peeking"]
    assert peeking["artifact_valid"] is True
    assert peeking["artifact_bound_to_expected_input"] is True
    assert peeking["section_evidence_matches"] is False
    assert peeking["pass"] is False
    assert report["all_controls_pass"] is False


def test_negative_control_report_rejects_unexpected_extra_failure(
    clean_fit, clean_diagnostics, computed_study_inputs
):
    case = negative_control_cases()[0]
    dataset = generate_negative_control_dataset(case)
    artifact = emit_proof_artifact(
        dataset=dataset,
        fit=_fit_for_dataset(clean_fit, dataset),
        diagnostics=clean_diagnostics,
        **computed_study_inputs.as_run_proof_kwargs(),
    )
    artifact["governance_state"]["failing_diagnostics"].append("r_hat")
    artifact["hash_bindings"]["artifact_self_hash"] = inference_proof_artifact_self_hash(
        artifact
    )

    report = build_negative_control_report({case.control_id: artifact})

    first = report["controls"][0]
    assert first["artifact_valid"] is True
    assert first["unexpected_failing_diagnostics"] == ["r_hat"]
    assert first["pass"] is False


def test_floor_control_report_covers_k4_and_k8_artifact_paths(
    clean_fit, clean_diagnostics, computed_study_inputs
):
    artifacts = {}
    for case in floor_control_cases():
        dataset = generate_floor_control_dataset(case)
        artifacts[case.control_id] = emit_proof_artifact(
            dataset=dataset,
            fit=_fit_for_dataset(clean_fit, dataset),
            diagnostics=clean_diagnostics,
            **computed_study_inputs.as_run_proof_kwargs(),
        )

    report = build_floor_control_report(artifacts)

    assert report["report_class"] == "internal_synthetic_floor_control_report"
    assert report["internal_only"] is True
    assert report["artifact_inputs_authorized"] is False
    assert report["open_spec_3_3_completion_authorized"] is False
    assert report["blocked_outputs"] == _blocked_outputs()
    assert report["all_required_controls_present"] is True
    assert report["all_controls_pass"] is True
    by_id = {control["control_id"]: control for control in report["controls"]}
    assert by_id["k4_below_schema_floor"]["governance_state"] == "HOLD"
    assert by_id["k4_below_schema_floor"]["failing_diagnostics"] == ["floor_check"]
    assert by_id["k4_below_schema_floor"]["section_evidence_matches"] is True
    assert by_id["k8_internal_only_display_ineligible"]["governance_state"] == (
        "eligible_internal_only"
    )
    assert by_id["k8_internal_only_display_ineligible"][
        "expected_display_eligible"
    ] is False
    assert by_id["k8_internal_only_display_ineligible"][
        "observed_display_eligible"
    ] is False
    assert by_id["k8_internal_only_display_ineligible"][
        "section_evidence_matches"
    ] is True


def test_floor_control_report_rejects_mutated_k8_floor_section(
    clean_fit, clean_diagnostics, computed_study_inputs
):
    artifacts = {}
    for case in floor_control_cases():
        dataset = generate_floor_control_dataset(case)
        artifacts[case.control_id] = emit_proof_artifact(
            dataset=dataset,
            fit=_fit_for_dataset(clean_fit, dataset),
            diagnostics=clean_diagnostics,
            **computed_study_inputs.as_run_proof_kwargs(),
        )
    k8_id = "k8_internal_only_display_ineligible"
    artifacts[k8_id]["floor_checks"]["k8_internal_only"]["display_eligible"] = True
    artifacts[k8_id]["hash_bindings"]["artifact_self_hash"] = (
        inference_proof_artifact_self_hash(artifacts[k8_id])
    )

    report = build_floor_control_report(artifacts)

    by_id = {control["control_id"]: control for control in report["controls"]}
    k8 = by_id[k8_id]
    assert k8["artifact_valid"] is False
    assert k8["section_evidence_matches"] is False
    assert k8["observed_display_eligible"] is True
    assert k8["pass"] is False
    assert report["all_controls_pass"] is False


def _acceptance_draws(*, effect: float, covered: bool, false_authorized: bool):
    if false_authorized:
        values = np.linspace(effect + 0.4, effect + 0.5, 2000)
    elif covered:
        values = np.linspace(effect - 0.05, effect + 0.05, 2000)
    elif effect != 0.0:
        values = np.linspace(effect + 0.4, effect + 0.5, 2000)
    else:
        values = np.array([0.1] * 1800 + [2.0] * 200, dtype=float)
    return values.reshape(2, 1000)


def _passing_sampler_acceptance_result(
    clean_fit, clean_diagnostics, computed_study_inputs
):
    from fluencytracr_inference import artifact as artifact_module

    base_seed = 700

    def fake_run_proof(dataset, **kwargs):
        replication_index = (
            dataset.seed
            - base_seed
            - int(round(dataset.injected_effect_sd * 1000)) * 100_000
            - dataset.k * 1_000
        )
        covered = replication_index < 160
        false_authorized = (
            dataset.injected_effect_sd == 0.0 and replication_index >= 190
        )
        fit = dataclasses.replace(
            clean_fit,
            dataset=dataset,
            synthetic_input_hash=dataset.synthetic_input_hash(),
            idata=SimpleNamespace(
                posterior={
                    INFERENCE_PROOF_ESTIMAND_PARAMETER_NAME: _acceptance_draws(
                        effect=dataset.injected_effect_sd,
                        covered=covered,
                        false_authorized=false_authorized,
                    )
                }
            ),
        )
        artifact = emit_proof_artifact(
            dataset=dataset,
            fit=fit,
            diagnostics=clean_diagnostics,
            **computed_study_inputs.as_run_proof_kwargs(),
            generated_at="2026-07-09T00:00:00+00:00",
        )
        return artifact, {"estimand_summary": fit.estimand_summary()}

    original_run_proof = artifact_module.run_proof
    artifact_module.run_proof = fake_run_proof
    try:
        return run_sampler_artifact_full_acceptance_study(
            base_seed=base_seed,
            replication_count=INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN,
            study_inputs=computed_study_inputs,
            generated_at="2026-07-09T00:00:00+00:00",
        )
    finally:
        artifact_module.run_proof = original_run_proof


def _negative_control_artifacts(clean_fit, clean_diagnostics, computed_study_inputs):
    artifacts = {}
    for case in negative_control_cases():
        dataset = generate_negative_control_dataset(case)
        artifacts[case.control_id] = emit_proof_artifact(
            dataset=dataset,
            fit=_fit_for_dataset(clean_fit, dataset),
            diagnostics=_diagnostics_for_control(clean_diagnostics, case.control_id),
            repeated_evaluation_detected=case.repeated_evaluation_detected,
            **computed_study_inputs.as_run_proof_kwargs(),
        )
    return artifacts


def _floor_control_artifacts(clean_fit, clean_diagnostics, computed_study_inputs):
    artifacts = {}
    for case in floor_control_cases():
        dataset = generate_floor_control_dataset(case)
        artifacts[case.control_id] = emit_proof_artifact(
            dataset=dataset,
            fit=_fit_for_dataset(clean_fit, dataset),
            diagnostics=clean_diagnostics,
            **computed_study_inputs.as_run_proof_kwargs(),
        )
    return artifacts


def test_task_3_3_required_evidence_report_observes_components_without_authorizing(
    clean_fit, clean_diagnostics, computed_study_inputs
):
    report = build_task_3_3_required_evidence_report(
        _passing_sampler_acceptance_result(
            clean_fit, clean_diagnostics, computed_study_inputs
        ),
        negative_control_artifacts_by_control_id=_negative_control_artifacts(
            clean_fit, clean_diagnostics, computed_study_inputs
        ),
        floor_control_artifacts_by_control_id=_floor_control_artifacts(
            clean_fit, clean_diagnostics, computed_study_inputs
        ),
    )

    assert report["report_class"] == (
        "internal_synthetic_task_3_3_required_evidence_report"
    )
    assert report["sampler_artifact_acceptance_observed"] is True
    assert report["negative_controls_observed"] is True
    assert report["floor_controls_observed"] is True
    assert report["task_3_3_required_evidence_observed"] is True
    assert report["task_3_3_required_evidence_state"] == (
        TASK_3_3_REQUIRED_EVIDENCE_OBSERVED_STATE
    )
    assert report["artifact_inputs_authorized"] is False
    assert report["open_spec_3_3_completion_authorized"] is False
    assert report["blocked_outputs"] == _blocked_outputs()
    assert report["component_hashes"]["sampler_acceptance_report_hash"]
    assert report["component_hashes"]["negative_control_report_hash"]
    assert report["component_hashes"]["floor_control_report_hash"]


def test_task_3_3_required_evidence_report_holds_without_controls(
    clean_fit, clean_diagnostics, computed_study_inputs
):
    report = build_task_3_3_required_evidence_report(
        _passing_sampler_acceptance_result(
            clean_fit, clean_diagnostics, computed_study_inputs
        )
    )

    assert report["sampler_artifact_acceptance_observed"] is True
    assert report["negative_controls_observed"] is False
    assert report["floor_controls_observed"] is False
    assert report["task_3_3_required_evidence_observed"] is False
    assert report["task_3_3_required_evidence_state"] == (
        TASK_3_3_REQUIRED_EVIDENCE_HOLD_STATE
    )
    assert report["artifact_inputs_authorized"] is False
    assert report["open_spec_3_3_completion_authorized"] is False


def test_task_3_3_ledger_separates_rehydrated_report_evidence_from_acceptance(
    clean_fit, clean_diagnostics, computed_study_inputs
):
    acceptance = _passing_sampler_acceptance_result(
        clean_fit, clean_diagnostics, computed_study_inputs
    )
    rehydrated = acceptance_study_result_from_report(acceptance.to_report())

    report = build_task_3_3_required_evidence_report(
        rehydrated,
        negative_control_artifacts_by_control_id=_negative_control_artifacts(
            clean_fit, clean_diagnostics, computed_study_inputs
        ),
        floor_control_artifacts_by_control_id=_floor_control_artifacts(
            clean_fit, clean_diagnostics, computed_study_inputs
        ),
    )

    assert report["sampler_artifact_acceptance_observed"] is False
    assert report["sampler_artifact_resumable_evidence_observed"] is True
    assert report["negative_controls_observed"] is True
    assert report["floor_controls_observed"] is True
    assert report["task_3_3_required_evidence_observed"] is False
    assert report["task_3_3_resumable_evidence_observed"] is True
    assert report["task_3_3_required_evidence_state"] == (
        TASK_3_3_REQUIRED_EVIDENCE_HOLD_STATE
    )
    sampler = report["components"]["sampler"]
    assert sampler["source_report_rehydrated"] is True
    assert sampler["sampler_artifact_acceptance_observed"] is False
    assert sampler["sampler_artifact_resumable_evidence_observed"] is True
    assert sampler["source_report_runner_generation_proof_observed"] is True
    assert report["artifact_inputs_authorized"] is False
    assert report["open_spec_3_3_completion_authorized"] is False


def test_task_3_3_required_evidence_report_rejects_report_json_inputs(
    clean_fit, clean_diagnostics, computed_study_inputs
):
    acceptance = _passing_sampler_acceptance_result(
        clean_fit, clean_diagnostics, computed_study_inputs
    )
    report_from_json = build_task_3_3_required_evidence_report(
        acceptance.to_report()
    )
    report_from_plan = build_task_3_3_required_evidence_report(
        {"report_class": "internal_synthetic_acceptance_execution_plan"}
    )

    assert report_from_json["sampler_artifact_acceptance_observed"] is False
    assert report_from_json["components"]["sampler"]["input_type_valid"] is False
    assert report_from_json["components"]["sampler"]["reason"] == (
        "acceptance_report_json_is_not_in_memory_runner_evidence"
    )
    assert report_from_plan["sampler_artifact_acceptance_observed"] is False
    assert report_from_plan["components"]["sampler"]["reason"] == (
        "acceptance_plan_is_not_run_evidence"
    )


def test_study_runner_is_deterministic():
    first = run_synthetic_study_inputs().as_run_proof_kwargs()
    second = run_synthetic_study_inputs().as_run_proof_kwargs()
    assert first == second


def test_run_proof_wrapper_feeds_computed_study_inputs(monkeypatch):
    from fluencytracr_inference import artifact as artifact_module

    captured = {}

    def fake_run_proof(dataset, **kwargs):
        captured.update(kwargs)
        return {"governance_state": {"state": "HOLD"}}, {}

    monkeypatch.setattr(artifact_module, "run_proof", fake_run_proof)
    dataset = generate_did_dataset(seed=20260706, k=16, injected_effect_sd=0.5)

    artifact, _ = run_proof_with_synthetic_study(dataset)

    assert artifact["governance_state"]["state"] == "HOLD"
    assert "calibration_scenarios" in captured
    assert "null_checks" in captured
    assert "floor_checks" in captured
    assert captured["null_checks"]["pass"] is True
