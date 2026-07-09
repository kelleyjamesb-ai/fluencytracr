"""Acceptance-study sidecar tests for sampler-level task 3.3 gap."""

import io
import json
import math
import dataclasses

import pytest

from fluencytracr_inference.acceptance_study import (
    ACCEPTANCE_METHOD_AGGREGATE_APPROXIMATION,
    ACCEPTANCE_METHOD_SAMPLER_ARTIFACT,
    ACCEPTANCE_MODE_FULL,
    ACCEPTANCE_MODE_SMOKE,
    AcceptanceCell,
    AcceptanceReplication,
    AcceptanceStudyResult,
    SamplerFullSettings,
    SamplerSmokeSettings,
    _runner_generation_proof_hash,
    acceptance_study_result_from_report,
    build_aggregate_approximation_acceptance_study,
    combine_sampler_artifact_acceptance_reports,
    combine_sampler_artifact_acceptance_batches,
    plan_sampler_artifact_full_acceptance_run,
    required_acceptance_cells,
    run_sampler_artifact_acceptance_batch,
    run_sampler_artifact_full_acceptance_study,
    run_sampler_artifact_smoke_acceptance_study,
    sampler_artifact_acceptance_plan_coverage,
    validate_sampler_artifact_acceptance_plan,
)
from fluencytracr_inference.constants import INFERENCE_PROOF_ARTIFACT_SCHEMA_VERSION
from fluencytracr_inference.constants import CONFIDENCE_MODEL_BLOCKED_USES
from fluencytracr_inference.constants import INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN
from fluencytracr_inference.constants import INFERENCE_PROOF_COMPARISON_COHORT_CRITERIA
from fluencytracr_inference.constants import INFERENCE_PROOF_PPC_STATISTIC_NAMES
from fluencytracr_inference.hashing import inference_proof_artifact_self_hash, sha256_json
from fluencytracr_inference.synthetic_study import (
    SyntheticStudyInputs,
    run_synthetic_study,
)


def _internal_report(ci_lower=-0.1, ci_upper=0.1, posterior_mean=0.0, posterior_sd=0.1):
    return {
        "estimand_summary": {
            "parameter_name": "contribution_alignment_effect",
            "posterior_mean": posterior_mean,
            "posterior_sd": posterior_sd,
            "credible_interval_80": {
                "lower": ci_lower,
                "upper": ci_upper,
            },
        }
    }


def _calibration_section():
    scenarios = []
    for effect in (0.0, 0.2, 0.5):
        for cohort_size in (12, 16):
            coverage_rate = 0.8
            replication_count = INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN
            scenarios.append(
                {
                    "scenario_id": (
                        f"test-effect-{effect:g}-k{cohort_size}-n{replication_count}"
                    ),
                    "injected_effect_size_sd": effect,
                    "cohort_size": cohort_size,
                    "replication_count": replication_count,
                    "credible_interval_level": 0.8,
                    "coverage_rate": coverage_rate,
                    "coverage_standard_error": math.sqrt(
                        coverage_rate * (1 - coverage_rate) / replication_count
                    ),
                    "pass": True,
                }
            )
    return {"scenarios": scenarios, "per_scenario_required": True}


def _floor_checks_section():
    return {
        "k4_rejected": {
            "cohort_size": 4,
            "outcome": "rejected_below_schema_floor",
            "pass": True,
        },
        "k8_internal_only": {
            "cohort_size": 8,
            "outcome": "internal_only_display_ineligible",
            "valid_internal": True,
            "display_eligible": False,
            "pass": True,
        },
        "eligible_floor_cases": [
            {
                "cohort_size": 12,
                "valid_internal": True,
                "display_eligible": True,
                "pass": True,
            },
            {
                "cohort_size": 16,
                "valid_internal": True,
                "display_eligible": True,
                "pass": True,
            },
        ],
    }


def _peeking_control_section():
    return {
        "procedure": "fixed_horizon_one_look_only",
        "repeated_evaluation": False,
        "look_index": 1,
        "total_planned_looks": 1,
        "milestone_days_included": [30],
        "metrics_included": ["synthetic_selected_metric"],
        "cohorts_included": ["synthetic_cohort_family"],
        "metric_family_bound": True,
        "cohort_family_bound": True,
        "sequential_method_name": None,
        "synthetic_null_proof_hash": None,
        "false_eligibility_bound": 0.05,
        "pass": True,
    }


def _comparison_adequacy_section():
    body = {
        "comparison_cohort_present": True,
        "reviewer_owned_comparison_design_adequacy_ref": None,
        "required_checks": [
            {"criterion": criterion, "pass": True}
            for criterion in INFERENCE_PROOF_COMPARISON_COHORT_CRITERIA
        ],
        "all_required_checks_pass": True,
    }
    body["adequacy_proof_hash"] = sha256_json(body)
    return body


def _measurement_cell_window_evidence_section(
    *,
    required=(30,),
    observed=(30,),
    suppressed=(),
    stale=(),
    imputed=(),
):
    missing = tuple(day for day in required if day not in observed)

    def refs(days):
        return [f"mcw-d{day:03d}" for day in days]

    body = {
        "required_milestone_days": list(required),
        "observed_milestone_days": list(observed),
        "missing_milestone_days": list(missing),
        "suppressed_milestone_days": list(suppressed),
        "stale_milestone_days": list(stale),
        "imputed_milestone_days": list(imputed),
        "required_window_refs": refs(required),
        "observed_window_refs": refs(observed),
        "missing_window_refs": refs(missing),
        "suppressed_window_refs": refs(suppressed),
        "stale_window_refs": refs(stale),
        "imputed_window_refs": refs(imputed),
        "all_required_windows_observed": len(missing) == 0,
        "all_windows_unsuppressed_and_fresh": len(suppressed) == 0 and len(stale) == 0,
        "imputation_used": len(imputed) > 0,
    }
    body["measurement_cell_window_evidence_hash"] = sha256_json(body)
    return body


def _diagnostics_section():
    return {
        "sampler": {
            "parameters": [
                {
                    "parameter_name": "contribution_alignment_effect",
                    "r_hat": 1.0,
                    "bulk_ess": 800.0,
                    "tail_ess": 800.0,
                    "posterior_mean_mcse": 0.001,
                    "interval_endpoint_mcse": 0.002,
                    "posterior_sd": 0.1,
                    "max_mcse_to_posterior_sd_ratio": 0.02,
                }
            ],
            "post_warmup_divergences": 0,
            "max_treedepth_saturation_rate": 0.0,
            "max_treedepth_warning": False,
            "energy_bfmi_min": 0.9,
            "energy_bfmi_warning": False,
            "rank_plots_recorded": True,
            "energy_plots_recorded": True,
        },
        "pre_trend": {
            "pseudo_effect_credible_interval_80": {
                "lower": -0.1,
                "upper": 0.1,
            },
            "includes_zero": True,
            "pass": True,
        },
        "posterior_predictive_checks": [
            {
                "statistic_name": name,
                "observed_value": 0.0,
                "posterior_predictive_summary": {
                    "mean": 0.0,
                    "credible_interval_80": {
                        "lower": -1.0,
                        "upper": 1.0,
                    },
                },
                "p_value": 0.5,
                "pass": True,
            }
            for name in INFERENCE_PROOF_PPC_STATISTIC_NAMES
        ],
        "prior_sensitivity": {
            "empirical_prior_justification_documented": True,
            "empirical_prior_justification_ref": (
                "docs/contracts/confidence-inference-methodology/README.md#prior-policy"
            ),
            "empirical_prior_justification_hash": "a" * 64,
            "posterior_mean_shift_in_posterior_sd": 0.1,
            "pass": True,
        },
    }


def _artifact(
    state="HOLD",
    failing=(),
    *,
    valid_hash=True,
    synthetic_input_hash=None,
    internal_report=None,
    comparison_authorized=None,
):
    active_report = internal_report if internal_report is not None else _internal_report()
    input_hash = synthetic_input_hash or ("1" * 64)
    authorized = state == "eligible_internal_only" if comparison_authorized is None else comparison_authorized
    artifact = {
        "schema_version": INFERENCE_PROOF_ARTIFACT_SCHEMA_VERSION,
        "artifact_class": "internal_synthetic_inference_proof",
        "generated_at": "2026-07-09T00:00:00+00:00",
        "harness_version": "test",
        "lockfile_hash": "0" * 64,
        "synthetic_generator": {
            "synthetic_input_hash": input_hash,
            "real_data_present": False,
            "customer_data_present": False,
            "production_data_present": False,
            "live_data_source_present": False,
        },
        "model_spec_binding": {
            "model_family": "bayesian_hierarchical_difference_in_differences_candidate",
            "estimand_name": "aggregate_selected_metric_movement",
            "estimand_units": "standardized_effect_sd",
            "likelihood_family": "normal_continuous_aggregate",
            "link_function": "identity",
            "aggregate_cell_variance_mode": "cohort_size_weighted_known_variance",
            "cohort_size_enters_likelihood": True,
            "missing_or_suppressed_windows_hold": True,
            "treatment_effect_pooling": "global",
            "pooling_structure": {
                "expectation_path": True,
                "workflow": True,
                "function": True,
                "cohort": True,
                "organization": True,
            },
        },
        "measurement_cell_window_evidence": _measurement_cell_window_evidence_section(),
        "diagnostics": _diagnostics_section(),
        "calibration": {
            **_calibration_section()
        },
        "null_checks": {
            "null_effect_scenario_count": INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN,
            "false_eligibility_rate": 0.0,
            "pass": True,
        },
        "floor_checks": _floor_checks_section(),
        "peeking_control": _peeking_control_section(),
        "comparison_adequacy": _comparison_adequacy_section(),
        "governance_state": {
            "state": state,
            "failing_diagnostics": list(failing),
            "comparison_supported_contribution_estimate_authorized": authorized,
            "evidence_tier_only": False,
        },
        "hash_bindings": {
            "source_posterior_hash": sha256_json(active_report["estimand_summary"]),
            "synthetic_input_hash": input_hash,
        },
        "blocked_uses": list(CONFIDENCE_MODEL_BLOCKED_USES),
        "numeric_values_role": "internal_validation_inputs_not_output",
        "numeric_posterior_values_customer_authorized": False,
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
    artifact["hash_bindings"]["artifact_self_hash"] = (
        inference_proof_artifact_self_hash(artifact) if valid_hash else "forged"
    )
    return artifact


def _rehash(artifact):
    artifact["hash_bindings"]["artifact_self_hash"] = (
        inference_proof_artifact_self_hash(artifact)
    )
    return artifact


def _assert_no_posterior_values(value):
    blocked = {
        "posterior_mean",
        "posterior_sd",
        "credible_interval_80",
        "ci80_lower",
        "ci80_upper",
        "threshold_probability",
        "expected_loss",
    }
    if isinstance(value, dict):
        assert not (set(value) & blocked)
        for child in value.values():
            _assert_no_posterior_values(child)
    elif isinstance(value, list):
        for child in value:
            _assert_no_posterior_values(child)


def test_aggregate_approximation_acceptance_study_does_not_authorize_inputs():
    study = run_synthetic_study(replication_count_per_cell=2)

    result = build_aggregate_approximation_acceptance_study(study)
    report = result.to_report()

    assert report["method"] == ACCEPTANCE_METHOD_AGGREGATE_APPROXIMATION
    assert report["mode"] == ACCEPTANCE_MODE_SMOKE
    assert report["aggregate_approximation_only"] is True
    assert report["artifact_level_evidence"] is False
    assert report["aggregate_source_summary"]["sampler_artifact_replications"] == 0
    assert report["artifact_inputs_authorized"] is False
    assert report["open_spec_3_3_completion_authorized"] is False
    assert report["task_3_3_acceptance_state"] == (
        "aggregate_approximation_not_authorized"
    )
    assert report["blocked_outputs"]["customer_output"] is False
    with pytest.raises(ValueError, match="not approved to produce artifact inputs"):
        result.to_artifact_inputs()


def test_sampler_artifact_smoke_acceptance_uses_run_proof_with_reduced_settings():
    calls = []

    def fake_run_proof(dataset, **kwargs):
        calls.append((dataset, kwargs))
        report = _internal_report()
        if len(calls) == 1:
            return (
                _artifact(
                    state="eligible_internal_only",
                    synthetic_input_hash=dataset.synthetic_input_hash(),
                    internal_report=report,
                ),
                report,
            )
        return (
            _artifact(
                state="HOLD",
                failing=("r_hat",),
                synthetic_input_hash=dataset.synthetic_input_hash(),
                internal_report=report,
            ),
            report,
        )

    settings = SamplerSmokeSettings(
        draws=7,
        tune=8,
        chains=2,
        target_accept=0.91,
        max_treedepth=6,
        prior_sensitivity_draws=9,
        prior_sensitivity_tune=10,
        pre_trend_draws=11,
        pre_trend_tune=12,
    )
    result = run_sampler_artifact_smoke_acceptance_study(
        base_seed=900,
        replication_count=2,
        cohort_size=12,
        settings=settings,
        study_inputs=SyntheticStudyInputs([], {}, {}),
        proof_runner=fake_run_proof,
        generated_at="2026-07-09T00:00:00+00:00",
    )

    assert result.method == ACCEPTANCE_METHOD_SAMPLER_ARTIFACT
    assert result.mode == ACCEPTANCE_MODE_SMOKE
    assert len(calls) == 2
    first_dataset, first_kwargs = calls[0]
    assert first_dataset.injected_effect_sd == 0.0
    assert first_dataset.k == 12
    assert first_dataset.seed == 12900
    assert first_kwargs["draws"] == 7
    assert first_kwargs["tune"] == 8
    assert first_kwargs["prior_sensitivity_draws"] == 9
    assert first_kwargs["pre_trend_tune"] == 12
    assert "calibration_scenarios" in first_kwargs
    report = result.to_report()
    assert report["artifact_level_evidence"] is True
    assert report["artifact_inputs_authorized"] is False
    assert report["open_spec_3_3_completion_authorized"] is False
    assert report["task_3_3_acceptance_state"] == "sampler_smoke_not_authorized"
    assert report["artifact_level_null_eligibility"] == {
        "replication_count": 2,
        "valid_artifact_count": 2,
        "invalid_artifact_count": 0,
        "acceptance_usable_artifact_count": 1,
        "acceptance_unusable_artifact_count": 1,
        "posterior_null_guard_evaluable_count": 2,
        "posterior_null_guard_unevaluable_count": 0,
        "posterior_null_guard_excluding_zero_count": 0,
        "posterior_null_guard_excluding_zero_rate": 0.0,
        "false_eligible_count": 0,
        "false_eligibility_rate": 0.0,
        "per_cell": [
            {
                "injected_effect_size_sd": 0.0,
                "cohort_size": 12,
                "replication_count": 2,
                "valid_artifact_count": 2,
                "invalid_artifact_count": 0,
                "acceptance_usable_artifact_count": 1,
                "acceptance_unusable_artifact_count": 1,
                "posterior_null_guard_evaluable_count": 2,
                "posterior_null_guard_unevaluable_count": 0,
                "posterior_null_guard_excluding_zero_count": 0,
                "posterior_null_guard_excluding_zero_rate": 0.0,
                "false_eligible_count": 0,
                "false_eligibility_rate": 0.0,
            }
        ],
        "null_gate_observed": True,
        "smoke_null_gate_observed": True,
        "full_null_gate_observed": False,
        "full_replication_requirement_met": False,
    }
    with pytest.raises(ValueError, match="not approved to produce artifact inputs"):
        result.to_artifact_inputs()


def test_sampler_artifact_batch_counts_runner_errors_fail_closed():
    calls = []

    def fake_run_proof(dataset, **kwargs):
        calls.append(dataset)
        if len(calls) == 2:
            raise RuntimeError("synthetic sampler failure with details hidden")
        report = _internal_report()
        return (
            _artifact(
                state="eligible_internal_only",
                synthetic_input_hash=dataset.synthetic_input_hash(),
                internal_report=report,
            ),
            report,
        )

    result = run_sampler_artifact_smoke_acceptance_study(
        base_seed=900,
        replication_count=2,
        cohort_size=12,
        settings=SamplerSmokeSettings(draws=7, tune=8),
        study_inputs=SyntheticStudyInputs([], {}, {}),
        proof_runner=fake_run_proof,
    )

    assert len(calls) == 2
    assert result.replication_count == 2
    failed = result.replications[1]
    assert failed.artifact_valid is False
    assert failed.governance_state == "RUNNER_ERROR"
    assert failed.runner_error_type == "RuntimeError"
    assert failed.acceptance_usable_artifact is False
    assert failed.covered_injected_effect is None

    report = result.to_report()
    assert report["replications"][1]["runner_error_type"] == "RuntimeError"
    assert "synthetic sampler failure" not in json.dumps(report)
    null = report["artifact_level_null_eligibility"]
    assert null["invalid_artifact_count"] == 1
    assert null["acceptance_unusable_artifact_count"] == 1
    assert null["false_eligible_count"] == 0
    assert null["smoke_null_gate_observed"] is False
    coverage = report["coverage_summary"]
    assert coverage["invalid_artifact_count"] == 1
    assert coverage["acceptance_unusable_artifact_count"] == 1
    assert coverage["missing_credible_interval_count"] == 1
    assert report["artifact_inputs_authorized"] is False
    assert report["open_spec_3_3_completion_authorized"] is False


def test_sampler_artifact_batch_records_posterior_coverage_by_cell():
    calls = []

    def fake_run_proof(dataset, **kwargs):
        calls.append((dataset, kwargs))
        if len(calls) == 1:
            report = _internal_report(0.1, 0.3)
        else:
            report = _internal_report(0.25, 0.4)
        return (
            _artifact(
                state="eligible_internal_only",
                synthetic_input_hash=dataset.synthetic_input_hash(),
                internal_report=report,
            ),
            report,
        )

    result = run_sampler_artifact_acceptance_batch(
        base_seed=100,
        effect_size=0.2,
        cohort_size=16,
        replication_start=5,
        replication_count=2,
        settings=SamplerSmokeSettings(draws=7, tune=8),
        study_inputs=SyntheticStudyInputs([], {}, {}),
        proof_runner=fake_run_proof,
    )

    assert result.study_id == (
        "sampler-artifact-batch-smoke-seed-100-effect-0.2-k16-start-5-n2"
    )
    assert [call[0].seed for call in calls] == [20016105, 20016106]
    assert [call[0].injected_effect_sd for call in calls] == [0.2, 0.2]
    report = result.to_report()
    assert report["artifact_level_null_eligibility"] is None
    coverage = report["coverage_summary"]
    assert coverage["replication_count"] == 2
    assert coverage["covered_count"] == 1
    assert coverage["coverage_rate"] == 0.5
    assert coverage["coverage_standard_error"] == math.sqrt(0.5 * 0.5 / 2)
    assert coverage["invalid_artifact_count"] == 0
    assert coverage["missing_credible_interval_count"] == 0
    assert coverage["full_replication_requirement_met"] is False
    assert coverage["calibration_band_observed"] is False
    assert all(
        "credible_interval_80" not in replication
        for replication in report["replications"]
    )
    _assert_no_posterior_values(report)
    assert report["replications"][0]["covered_injected_effect"] is True
    assert report["replications"][1]["covered_injected_effect"] is False
    with pytest.raises(ValueError, match="not approved to produce artifact inputs"):
        result.to_artifact_inputs()


def test_sampler_artifact_smoke_acceptance_supports_arbitrary_required_cells():
    calls = []

    def fake_run_proof(dataset, **kwargs):
        calls.append((dataset, kwargs))
        effect = dataset.injected_effect_sd
        if effect == 0.2:
            report = _internal_report(0.25, 0.4)
        else:
            report = _internal_report(effect - 0.1, effect + 0.1)
        return (
            _artifact(
                state="eligible_internal_only",
                synthetic_input_hash=dataset.synthetic_input_hash(),
                internal_report=report,
            ),
            report,
        )

    required_cells = ((0.0, 12), (0.2, 16), (0.5, 12))
    result = run_sampler_artifact_smoke_acceptance_study(
        base_seed=700,
        replication_count=1,
        required_cells=required_cells,
        settings=SamplerSmokeSettings(draws=7, tune=8),
        study_inputs=SyntheticStudyInputs([], {}, {}),
        proof_runner=fake_run_proof,
    )

    assert [(call[0].injected_effect_sd, call[0].k) for call in calls] == list(
        required_cells
    )
    assert [call[0].seed for call in calls] == [12700, 20016700, 50012700]
    report = result.to_report()
    assert report["replication_count"] == 3
    assert report["replication_count_per_cell"] == 1
    assert report["required_cells"] == [
        {"injected_effect_size_sd": 0.0, "cohort_size": 12},
        {"injected_effect_size_sd": 0.2, "cohort_size": 16},
        {"injected_effect_size_sd": 0.5, "cohort_size": 12},
    ]
    assert report["artifact_inputs_authorized"] is False
    assert report["open_spec_3_3_completion_authorized"] is False
    assert all(
        "credible_interval_80" not in replication
        for replication in report["replications"]
    )

    coverage = report["artifact_level_posterior_ci80_coverage"]
    assert coverage["scenario_count"] == 3
    assert coverage["covered_count"] == 2
    assert coverage["coverage_rate"] == 2 / 3
    scenarios = {
        (scenario["injected_effect_size_sd"], scenario["cohort_size"]): scenario
        for scenario in coverage["scenarios"]
    }
    assert scenarios[(0.0, 12)]["coverage_rate"] == 1.0
    assert scenarios[(0.2, 16)]["coverage_rate"] == 0.0
    assert scenarios[(0.5, 12)]["coverage_rate"] == 1.0
    assert coverage["full_replication_requirement_met"] is False
    assert coverage["calibration_band_observed"] is False

    null = report["artifact_level_null_eligibility"]
    assert null["replication_count"] == 1
    assert null["false_eligibility_rate"] == 0.0
    assert null["posterior_null_guard_excluding_zero_rate"] == 0.0
    assert null["per_cell"] == [
        {
            "injected_effect_size_sd": 0.0,
            "cohort_size": 12,
            "replication_count": 1,
            "valid_artifact_count": 1,
            "invalid_artifact_count": 0,
            "acceptance_usable_artifact_count": 1,
            "acceptance_unusable_artifact_count": 0,
            "posterior_null_guard_evaluable_count": 1,
            "posterior_null_guard_unevaluable_count": 0,
            "posterior_null_guard_excluding_zero_count": 0,
            "posterior_null_guard_excluding_zero_rate": 0.0,
            "false_eligible_count": 0,
            "false_eligibility_rate": 0.0,
        }
    ]
    with pytest.raises(ValueError, match="not approved to produce artifact inputs"):
        result.to_artifact_inputs()


def test_sampler_artifact_full_acceptance_uses_full_settings_without_authorizing():
    calls = []

    def fake_run_proof(dataset, **kwargs):
        calls.append((dataset, kwargs))
        report = _internal_report(
            dataset.injected_effect_sd - 0.1,
            dataset.injected_effect_sd + 0.1,
        )
        return (
            _artifact(
                state="eligible_internal_only",
                synthetic_input_hash=dataset.synthetic_input_hash(),
                internal_report=report,
            ),
            report,
        )

    result = run_sampler_artifact_full_acceptance_study(
        base_seed=700,
        replication_count=1,
        study_inputs=SyntheticStudyInputs([], {}, {}),
        proof_runner=fake_run_proof,
    )

    assert result.method == ACCEPTANCE_METHOD_SAMPLER_ARTIFACT
    assert result.mode == ACCEPTANCE_MODE_FULL
    assert result.required_cells == required_acceptance_cells()
    assert [(call[0].injected_effect_sd, call[0].k) for call in calls] == [
        (cell.effect_size, cell.cohort_size) for cell in required_acceptance_cells()
    ]
    for _dataset, kwargs in calls:
        assert kwargs["draws"] == 2000
        assert kwargs["tune"] == 1000
        assert kwargs["target_accept"] == 0.99
        assert kwargs["max_treedepth"] == 12
        assert kwargs["prior_sensitivity_draws"] == 300
        assert kwargs["prior_sensitivity_tune"] == 400
        assert kwargs["pre_trend_draws"] == 400
        assert kwargs["pre_trend_tune"] == 400

    report = result.to_report()
    assert report["artifact_level_evidence"] is True
    assert report["aggregate_approximation_only"] is False
    assert report["replication_count"] == 6
    assert report["replication_count_per_cell"] == 1
    assert report["full_replication_requirement_met"] is False
    assert report["artifact_inputs_authorized"] is False
    assert report["open_spec_3_3_completion_authorized"] is False
    assert report["task_3_3_acceptance_state"] == (
        "sampler_full_incomplete_replications_not_authorized"
    )
    manifest = report["acceptance_run_manifest"]
    assert manifest["base_seed"] == 700
    assert manifest["required_replications_per_cell"] == 200
    assert manifest["required_total_replications"] == 1200
    assert manifest["observed_total_replications"] == 6
    assert manifest["required_cell_grid_complete"] is True
    assert manifest["full_sampler_settings_exact"] is True
    assert all(
        cell["observed_replication_count"] == 1
        and cell["missing_replication_count"] == 199
        and cell["full_requirement_met"] is False
        for cell in manifest["per_cell"]
    )
    null = report["artifact_level_null_eligibility"]
    assert null["smoke_null_gate_observed"] is True
    assert null["null_gate_observed"] is False
    assert null["full_null_gate_observed"] is False
    with pytest.raises(ValueError, match="not approved to produce artifact inputs"):
        result.to_artifact_inputs()


def test_sampler_artifact_full_acceptance_hold_artifacts_do_not_pass_null_or_coverage():
    def fake_run_proof(dataset, **kwargs):
        report = _internal_report(
            dataset.injected_effect_sd - 0.1,
            dataset.injected_effect_sd + 0.1,
        )
        return (
            _artifact(
                state="HOLD",
                failing=("r_hat",),
                synthetic_input_hash=dataset.synthetic_input_hash(),
                internal_report=report,
            ),
            report,
        )

    result = run_sampler_artifact_full_acceptance_study(
        base_seed=700,
        replication_count=INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN,
        study_inputs=SyntheticStudyInputs([], {}, {}),
        proof_runner=fake_run_proof,
    )
    report = result.to_report()

    assert report["mode"] == ACCEPTANCE_MODE_FULL
    assert report["required_acceptance_cell_set_complete"] is True
    assert report["full_replication_requirement_met"] is True
    assert report["sampler_artifact_acceptance_passed"] is False
    assert report["task_3_3_acceptance_state"] == "sampler_full_failed_not_authorized"
    assert report["artifact_inputs_authorized"] is False
    assert report["open_spec_3_3_completion_authorized"] is False
    assert report["coverage_summary"]["acceptance_unusable_artifact_count"] == 1200
    assert report["coverage_summary"]["calibration_band_observed"] is False
    null = report["artifact_level_null_eligibility"]
    assert null["acceptance_unusable_artifact_count"] == 400
    assert null["false_eligible_count"] == 0
    assert null["false_eligibility_rate"] == 0.0
    assert null["full_null_gate_observed"] is True
    with pytest.raises(ValueError, match="not approved to produce artifact inputs"):
        result.to_artifact_inputs()


def test_sampler_artifact_full_acceptance_report_omits_raw_posterior_values():
    def fake_run_proof(dataset, **kwargs):
        report = _internal_report(
            dataset.injected_effect_sd - 0.1,
            dataset.injected_effect_sd + 0.1,
        )
        return (
            _artifact(
                state="eligible_internal_only",
                synthetic_input_hash=dataset.synthetic_input_hash(),
                internal_report=report,
            ),
            report,
        )

    result = run_sampler_artifact_full_acceptance_study(
        base_seed=700,
        replication_count=1,
        study_inputs=SyntheticStudyInputs([], {}, {}),
        proof_runner=fake_run_proof,
    )

    _assert_no_posterior_values(result.to_report())


def test_sampler_artifact_acceptance_rejects_self_hashed_diagnostic_shells():
    def fake_run_proof(dataset, **kwargs):
        report = _internal_report()
        artifact = _artifact(
            state="eligible_internal_only",
            synthetic_input_hash=dataset.synthetic_input_hash(),
            internal_report=report,
        )
        artifact["diagnostics"]["sampler"]["parameters"][0].pop("bulk_ess")
        return _rehash(artifact), report

    result = run_sampler_artifact_smoke_acceptance_study(
        replication_count=1,
        study_inputs=SyntheticStudyInputs([], {}, {}),
        proof_runner=fake_run_proof,
    )

    replication = result.replications[0]
    assert replication.artifact_valid is False
    assert replication.contribution_estimate_eligible is False
    null = result.to_report()["artifact_level_null_eligibility"]
    assert null["invalid_artifact_count"] == 1
    assert null["smoke_null_gate_observed"] is False


def test_combine_sampler_artifact_acceptance_batches_is_pure_and_non_authorizing():
    def fake_run_proof(dataset, **kwargs):
        report = _internal_report(
            dataset.injected_effect_sd - 0.1,
            dataset.injected_effect_sd + 0.1,
        )
        return (
            _artifact(
                state="eligible_internal_only",
                synthetic_input_hash=dataset.synthetic_input_hash(),
                internal_report=report,
            ),
            report,
        )

    first = run_sampler_artifact_full_acceptance_study(
        base_seed=700,
        replication_start=0,
        replication_count=1,
        study_inputs=SyntheticStudyInputs([], {}, {}),
        proof_runner=fake_run_proof,
    )
    second = run_sampler_artifact_full_acceptance_study(
        base_seed=700,
        replication_start=1,
        replication_count=1,
        study_inputs=SyntheticStudyInputs([], {}, {}),
        proof_runner=fake_run_proof,
    )

    combined = combine_sampler_artifact_acceptance_batches([first, second])
    report = combined.to_report()

    assert combined.mode == ACCEPTANCE_MODE_FULL
    assert combined.required_cells == required_acceptance_cells()
    assert combined.replication_count == 12
    assert combined.replication_count_per_cell == 2
    assert report["required_acceptance_cell_set_complete"] is True
    assert report["full_replication_requirement_met"] is False
    manifest = report["acceptance_run_manifest"]
    assert manifest["base_seed"] == 700
    assert manifest["required_total_replications"] == 1200
    assert manifest["observed_total_replications"] == 12
    assert all(
        cell["observed_replication_count"] == 2
        and cell["missing_replication_count"] == 198
        and cell["full_requirement_met"] is False
        for cell in manifest["per_cell"]
    )
    assert report["task_3_3_acceptance_state"] == (
        "sampler_full_incomplete_replications_not_authorized"
    )
    assert report["artifact_inputs_authorized"] is False
    assert report["open_spec_3_3_completion_authorized"] is False
    _assert_no_posterior_values(report)
    with pytest.raises(ValueError, match="not approved to produce artifact inputs"):
        combined.to_artifact_inputs()


def test_sampler_artifact_acceptance_reports_round_trip_and_combine():
    def fake_run_proof(dataset, **kwargs):
        report = _internal_report(
            dataset.injected_effect_sd - 0.1,
            dataset.injected_effect_sd + 0.1,
        )
        return (
            _artifact(
                state="eligible_internal_only",
                synthetic_input_hash=dataset.synthetic_input_hash(),
                internal_report=report,
            ),
            report,
        )

    first = run_sampler_artifact_full_acceptance_study(
        base_seed=700,
        replication_start=0,
        replication_count=1,
        study_inputs=SyntheticStudyInputs([], {}, {}),
        proof_runner=fake_run_proof,
    )
    second = run_sampler_artifact_full_acceptance_study(
        base_seed=700,
        replication_start=1,
        replication_count=1,
        study_inputs=SyntheticStudyInputs([], {}, {}),
        proof_runner=fake_run_proof,
    )

    first_report = first.to_report()
    rehydrated = acceptance_study_result_from_report(first_report)
    assert first_report["source_report_rehydrated"] is False
    assert rehydrated.source_report_rehydrated is True
    assert rehydrated.to_report()["source_report_rehydrated"] is True
    assert rehydrated.to_report()["sampler_artifact_acceptance_passed"] is False
    assert "base_seed" in first_report
    assert first_report["acceptance_run_manifest"]["base_seed"] == 700
    _assert_no_posterior_values(first_report)

    combined_from_batches = combine_sampler_artifact_acceptance_batches(
        [first, second],
        study_id="combined-from-batches",
    )
    combined_from_reports = combine_sampler_artifact_acceptance_reports(
        [first_report, second.to_report()],
        study_id="combined-from-batches",
    )

    assert combined_from_reports.replication_count == 12
    assert combined_from_reports.replication_count_per_cell == 2
    assert combined_from_batches.source_report_rehydrated is False
    assert combined_from_reports.source_report_rehydrated is True
    assert combined_from_reports.sampler_artifact_acceptance_passed is False
    assert combined_from_reports.sampler_artifact_resumable_evidence_observed is False
    assert (
        combined_from_reports.to_report()["source_report_rehydrated"]
        is True
    )
    assert combined_from_reports.artifact_inputs_authorized is False
    assert combined_from_reports.open_spec_3_3_completion_authorized is False
    _assert_no_posterior_values(combined_from_reports.to_report())


def test_rehydrated_chunk_reports_can_observe_resumable_full_evidence(monkeypatch):
    from fluencytracr_inference import artifact as artifact_module

    base_seed = 700

    def fake_run_proof(dataset, **kwargs):
        replication_index = (
            dataset.seed
            - base_seed
            - int(round(dataset.injected_effect_sd * 1000)) * 100_000
            - dataset.k * 1_000
        )
        effect = dataset.injected_effect_sd
        covered = replication_index % INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN < 160
        if covered:
            ci_lower, ci_upper = effect - 0.05, effect + 0.05
        elif effect == 0.0:
            ci_lower, ci_upper = 0.4, 0.5
        else:
            ci_lower, ci_upper = effect + 0.4, effect + 0.5
        report = _internal_report(
            ci_lower,
            ci_upper,
            posterior_mean=effect if effect != 0.0 else 0.0,
            posterior_sd=0.01 if effect != 0.0 else 0.05,
        )
        return (
            _artifact(
                state="eligible_internal_only",
                comparison_authorized=effect != 0.0,
                synthetic_input_hash=dataset.synthetic_input_hash(),
                internal_report=report,
            ),
            report,
        )

    monkeypatch.setattr(artifact_module, "run_proof", fake_run_proof)
    first = run_sampler_artifact_full_acceptance_study(
        base_seed=base_seed,
        replication_start=0,
        replication_count=100,
        study_inputs=SyntheticStudyInputs([], {}, {}),
    )
    second = run_sampler_artifact_full_acceptance_study(
        base_seed=base_seed,
        replication_start=100,
        replication_count=100,
        study_inputs=SyntheticStudyInputs([], {}, {}),
    )

    combined = combine_sampler_artifact_acceptance_reports(
        [first.to_report(), second.to_report()],
        study_id="rehydrated-two-chunk-full-evidence",
    )
    report = combined.to_report()

    assert combined.source_report_rehydrated is True
    assert combined.sampler_artifact_acceptance_passed is False
    assert combined.sampler_artifact_resumable_evidence_observed is True
    assert report["sampler_artifact_resumable_evidence_observed"] is True
    assert report["task_3_3_acceptance_state"] == (
        "sampler_full_rehydrated_evidence_observed_not_authorized"
    )
    assert report["artifact_inputs_authorized"] is False
    assert report["open_spec_3_3_completion_authorized"] is False
    manifest = report["acceptance_run_manifest"]
    assert manifest["source_report_hash_count"] == 2
    assert manifest["source_report_runner_generation_proof_hash_count"] == 2
    assert manifest["source_report_runner_generation_proof_observed"] is True
    assert manifest["full_replication_slot_grid_exact"] is True
    assert report["coverage_summary"]["calibration_band_observed"] is True
    assert report["artifact_level_null_eligibility"]["full_null_gate_observed"] is True

    mixed = combine_sampler_artifact_acceptance_batches(
        [first, acceptance_study_result_from_report(second.to_report())],
        study_id="mixed-live-and-rehydrated-full-evidence",
    )
    mixed_report = mixed.to_report()

    assert mixed.source_report_rehydrated is True
    assert mixed.sampler_artifact_acceptance_passed is False
    assert mixed.sampler_artifact_resumable_evidence_observed is False
    assert mixed_report["acceptance_run_manifest"]["source_report_hash_count"] == 0
    assert (
        mixed_report["acceptance_run_manifest"][
            "source_report_runner_generation_proof_observed"
        ]
        is False
    )
    assert mixed_report["artifact_inputs_authorized"] is False
    assert mixed_report["open_spec_3_3_completion_authorized"] is False


def test_sampler_artifact_acceptance_report_rehydration_rejects_tampering():
    def fake_run_proof(dataset, **kwargs):
        report = _internal_report(
            dataset.injected_effect_sd - 0.1,
            dataset.injected_effect_sd + 0.1,
        )
        return (
            _artifact(
                state="eligible_internal_only",
                synthetic_input_hash=dataset.synthetic_input_hash(),
                internal_report=report,
            ),
            report,
        )

    result = run_sampler_artifact_full_acceptance_study(
        base_seed=700,
        replication_start=0,
        replication_count=1,
        study_inputs=SyntheticStudyInputs([], {}, {}),
        proof_runner=fake_run_proof,
    )
    report = result.to_report()

    forged_hash = {
        **report,
        "replication_count": report["replication_count"] + 1,
    }
    with pytest.raises(ValueError, match="study_hash does not match"):
        acceptance_study_result_from_report(forged_hash)

    leaked = dict(report)
    leaked["replications"] = [dict(replication) for replication in report["replications"]]
    leaked["replications"][0]["posterior_mean"] = 0.1
    leaked_body = {key: value for key, value in leaked.items() if key != "study_hash"}
    leaked["study_hash"] = sha256_json(leaked_body)
    with pytest.raises(ValueError, match="omit raw posterior values"):
        acceptance_study_result_from_report(leaked)

    inconsistent = dict(report)
    inconsistent["replication_count"] = report["replication_count"] + 1
    inconsistent_body = {
        key: value for key, value in inconsistent.items() if key != "study_hash"
    }
    inconsistent["study_hash"] = sha256_json(inconsistent_body)
    with pytest.raises(ValueError, match="invalid shape"):
        acceptance_study_result_from_report(inconsistent)

    duplicate = run_sampler_artifact_smoke_acceptance_study(
        base_seed=700,
        replication_count=2,
        study_inputs=SyntheticStudyInputs([], {}, {}),
        proof_runner=fake_run_proof,
    ).to_report()
    duplicate["replications"][1] = dict(duplicate["replications"][0])
    duplicate_body = {key: value for key, value in duplicate.items() if key != "study_hash"}
    duplicate["study_hash"] = sha256_json(duplicate_body)
    with pytest.raises(ValueError, match="invalid shape"):
        acceptance_study_result_from_report(duplicate)


def test_acceptance_report_rehydration_rejects_raw_source_hash_smuggling():
    def fake_run_proof(dataset, **kwargs):
        report = _internal_report(
            dataset.injected_effect_sd - 0.1,
            dataset.injected_effect_sd + 0.1,
        )
        return (
            _artifact(
                state="eligible_internal_only",
                synthetic_input_hash=dataset.synthetic_input_hash(),
                internal_report=report,
            ),
            report,
        )

    result = run_sampler_artifact_full_acceptance_study(
        base_seed=700,
        replication_start=0,
        replication_count=1,
        study_inputs=SyntheticStudyInputs([], {}, {}),
        proof_runner=fake_run_proof,
    )
    smuggled = dataclasses.replace(
        result,
        source_report_hashes=("b" * 64,),
        source_report_runner_generation_proof_hashes=("c" * 64,),
    )

    assert smuggled.source_report_rehydrated is False
    with pytest.raises(ValueError, match="invalid shape"):
        acceptance_study_result_from_report(smuggled.to_report())


def test_rehydrated_report_json_cannot_mint_source_provenance_token():
    def fake_run_proof(dataset, **kwargs):
        report = _internal_report(
            dataset.injected_effect_sd - 0.1,
            dataset.injected_effect_sd + 0.1,
        )
        return (
            _artifact(
                state="eligible_internal_only",
                synthetic_input_hash=dataset.synthetic_input_hash(),
                internal_report=report,
            ),
            report,
        )

    result = run_sampler_artifact_full_acceptance_study(
        base_seed=700,
        replication_start=0,
        replication_count=1,
        study_inputs=SyntheticStudyInputs([], {}, {}),
        proof_runner=fake_run_proof,
    )
    rehydrated_claim = dataclasses.replace(
        result,
        source_report_rehydrated=True,
        source_report_hashes=("b" * 64,),
        source_report_runner_generation_proof_hashes=("c" * 64,),
    )

    rehydrated = acceptance_study_result_from_report(rehydrated_claim.to_report())
    report = rehydrated.to_report()

    assert rehydrated.source_report_rehydrated is True
    assert rehydrated.source_report_hashes == ()
    assert rehydrated.source_report_runner_generation_proof_hashes == ()
    assert rehydrated.sampler_artifact_acceptance_passed is False
    assert rehydrated.sampler_artifact_resumable_evidence_observed is False
    assert report["acceptance_run_manifest"]["source_report_hash_count"] == 0
    assert (
        report["acceptance_run_manifest"][
            "source_report_runner_generation_proof_observed"
        ]
        is False
    )


def test_rehydrated_report_with_forged_hashes_cannot_observe_resumable_evidence():
    replications = []
    for cell in required_acceptance_cells():
        for index in range(INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN):
            seed = int(cell.effect_size * 1_000_000) + cell.cohort_size * 1000 + index
            replications.append(
                AcceptanceReplication(
                    replication_id=(
                        f"forged-hashes-effect-{cell.effect_size:g}-"
                        f"k{cell.cohort_size}-rep-{index}"
                    ),
                    seed=seed,
                    effect_size=cell.effect_size,
                    cohort_size=cell.cohort_size,
                    artifact_valid=True,
                    governance_state="eligible_internal_only",
                    failing_diagnostics=(),
                    contribution_estimate_eligible=cell.effect_size != 0.0,
                    posterior_null_guard_evaluable=True,
                    posterior_null_guard_excludes_zero=cell.effect_size != 0.0,
                    artifact_self_hash="a" * 64,
                    artifact_bound_to_expected_input=True,
                    covered_injected_effect=index < 160,
                )
            )
    result = AcceptanceStudyResult(
        method=ACCEPTANCE_METHOD_SAMPLER_ARTIFACT,
        mode=ACCEPTANCE_MODE_FULL,
        study_id="rehydrated-forged-source-hash-complete",
        base_seed=700,
        replication_count=len(replications),
        replication_count_per_cell=INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN,
        required_cells=required_acceptance_cells(),
        replications=tuple(replications),
        sampler_settings=SamplerFullSettings(),
        source_report_rehydrated=True,
        source_report_hashes=("b" * 64,),
        source_report_runner_generation_proof_hashes=("c" * 64,),
    )

    report = result.to_report()

    assert report["full_replication_requirement_met"] is True
    assert report["coverage_summary"]["calibration_band_observed"] is True
    assert report["artifact_level_null_eligibility"]["full_null_gate_observed"] is True
    assert report["acceptance_run_manifest"]["source_report_hash_count"] == 1
    assert (
        report["acceptance_run_manifest"][
            "source_report_runner_generation_proof_observed"
        ]
        is False
    )
    assert report["sampler_artifact_acceptance_passed"] is False
    assert report["sampler_artifact_resumable_evidence_observed"] is False
    assert report["task_3_3_acceptance_state"] == (
        "sampler_full_rehydrated_report_not_authorized"
    )
    assert report["artifact_inputs_authorized"] is False
    assert report["open_spec_3_3_completion_authorized"] is False


def test_rehydrated_full_report_cannot_self_certify_acceptance():
    replications = []
    for cell in required_acceptance_cells():
        for index in range(INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN):
            seed = int(cell.effect_size * 1_000_000) + cell.cohort_size * 1000 + index
            replications.append(
                AcceptanceReplication(
                    replication_id=(
                        f"forged-effect-{cell.effect_size:g}-"
                        f"k{cell.cohort_size}-rep-{index}"
                    ),
                    seed=seed,
                    effect_size=cell.effect_size,
                    cohort_size=cell.cohort_size,
                    artifact_valid=True,
                    governance_state="eligible_internal_only",
                    failing_diagnostics=(),
                    contribution_estimate_eligible=cell.effect_size != 0.0,
                    posterior_null_guard_evaluable=True,
                    posterior_null_guard_excludes_zero=cell.effect_size != 0.0,
                    artifact_self_hash="a" * 64,
                    artifact_bound_to_expected_input=True,
                    covered_injected_effect=index < 160,
                )
            )
    result = AcceptanceStudyResult(
        method=ACCEPTANCE_METHOD_SAMPLER_ARTIFACT,
        mode=ACCEPTANCE_MODE_FULL,
        study_id="rehydrated-forged-complete",
        base_seed=700,
        replication_count=len(replications),
        replication_count_per_cell=INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN,
        required_cells=required_acceptance_cells(),
        replications=tuple(replications),
        sampler_settings=SamplerFullSettings(),
        source_report_rehydrated=True,
    )

    report = result.to_report()

    assert report["full_replication_requirement_met"] is True
    assert report["coverage_summary"]["calibration_band_observed"] is True
    assert report["artifact_level_null_eligibility"]["full_null_gate_observed"] is True
    assert report["source_report_rehydrated"] is True
    assert report["sampler_artifact_acceptance_passed"] is False
    assert report["sampler_artifact_resumable_evidence_observed"] is False
    assert report["task_3_3_acceptance_state"] == (
        "sampler_full_rehydrated_report_not_authorized"
    )
    assert report["artifact_inputs_authorized"] is False
    assert report["open_spec_3_3_completion_authorized"] is False


def test_sampler_artifact_full_plan_partitions_1200_slots_once():
    plan = plan_sampler_artifact_full_acceptance_run(
        base_seed=701,
        chunk_size=37,
    )

    assert plan["report_class"] == "internal_synthetic_acceptance_execution_plan"
    assert plan["method"] == ACCEPTANCE_METHOD_SAMPLER_ARTIFACT
    assert plan["mode"] == ACCEPTANCE_MODE_FULL
    assert plan["plan_only"] is True
    assert plan["artifact_level_evidence"] is False
    assert plan["internal_only"] is True
    assert plan["customer_output_authorized"] is False
    assert plan["artifact_inputs_authorized"] is False
    assert plan["open_spec_3_3_completion_authorized"] is False
    assert plan["writes_persistence"] is False
    assert plan["creates_export"] is False
    assert plan["required_replications_per_cell"] == 200
    assert plan["required_total_replications"] == 1200
    assert plan["expected_total_artifacts"] == 1200
    assert plan["chunk_count"] == 6
    assert sum(chunk["expected_artifact_count"] for chunk in plan["chunks"]) == 1200
    assert [chunk["replication_index_start_inclusive"] for chunk in plan["chunks"]] == [
        0,
        37,
        74,
        111,
        148,
        185,
    ]
    assert [chunk["replication_index_end_exclusive"] for chunk in plan["chunks"]] == [
        37,
        74,
        111,
        148,
        185,
        200,
    ]
    assert all(chunk["chunk_hash"] for chunk in plan["chunks"])


def test_sampler_artifact_full_plan_handles_remainder_chunk():
    plan = plan_sampler_artifact_full_acceptance_run(
        base_seed=701,
        chunk_size=64,
    )

    assert plan["chunk_count"] == 4
    assert [chunk["replication_count_per_cell"] for chunk in plan["chunks"]] == [
        64,
        64,
        64,
        8,
    ]
    assert plan["chunks"][-1]["replication_index_start_inclusive"] == 192
    assert plan["chunks"][-1]["replication_index_end_exclusive"] == 200
    assert plan["chunks"][-1]["expected_artifact_count"] == 48


def test_acceptance_run_manifest_rejects_off_by_one_full_slot_grid():
    def fake_run_proof(dataset, **kwargs):
        report = _internal_report(
            dataset.injected_effect_sd - 0.1,
            dataset.injected_effect_sd + 0.1,
        )
        return (
            _artifact(
                state="eligible_internal_only",
                synthetic_input_hash=dataset.synthetic_input_hash(),
                internal_report=report,
            ),
            report,
        )

    first = run_sampler_artifact_full_acceptance_study(
        base_seed=700,
        replication_start=0,
        replication_count=199,
        study_inputs=SyntheticStudyInputs([], {}, {}),
        proof_runner=fake_run_proof,
    )
    substituted = run_sampler_artifact_full_acceptance_study(
        base_seed=700,
        replication_start=200,
        replication_count=1,
        study_inputs=SyntheticStudyInputs([], {}, {}),
        proof_runner=fake_run_proof,
    )

    combined = combine_sampler_artifact_acceptance_batches([first, substituted])
    report = combined.to_report()
    manifest = report["acceptance_run_manifest"]

    assert report["replication_count"] == 1200
    assert report["replication_count_per_cell"] == 200
    assert report["full_replication_requirement_met"] is True
    assert manifest["full_replication_slot_grid_exact"] is False
    assert manifest["missing_expected_replication_slot_count"] == 6
    assert manifest["unexpected_replication_slot_count"] == 6
    assert manifest["acceptance_plan_coverage"]["complete"] is False
    assert report["sampler_artifact_acceptance_passed"] is False
    with pytest.raises(ValueError, match="does not match the plan"):
        validate_sampler_artifact_acceptance_plan(combined)


def test_combine_sampler_artifact_acceptance_batches_is_hash_stable_by_slot_order():
    def fake_run_proof(dataset, **kwargs):
        report = _internal_report(
            dataset.injected_effect_sd - 0.1,
            dataset.injected_effect_sd + 0.1,
        )
        return (
            _artifact(
                state="eligible_internal_only",
                synthetic_input_hash=dataset.synthetic_input_hash(),
                internal_report=report,
            ),
            report,
        )

    first = run_sampler_artifact_full_acceptance_study(
        base_seed=700,
        replication_start=0,
        replication_count=1,
        study_inputs=SyntheticStudyInputs([], {}, {}),
        proof_runner=fake_run_proof,
    )
    second = run_sampler_artifact_full_acceptance_study(
        base_seed=700,
        replication_start=1,
        replication_count=1,
        study_inputs=SyntheticStudyInputs([], {}, {}),
        proof_runner=fake_run_proof,
    )

    forward = combine_sampler_artifact_acceptance_batches([first, second]).to_report()
    reverse = combine_sampler_artifact_acceptance_batches([second, first]).to_report()

    assert forward == reverse
    assert forward["study_hash"] == reverse["study_hash"]


def test_manual_full_grid_result_cannot_impersonate_runner_generated_evidence():
    base_seed = 700
    replications = []
    for cell in required_acceptance_cells():
        for index in range(INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN):
            seed = (
                base_seed
                + int(round(cell.effect_size * 1000)) * 100_000
                + cell.cohort_size * 1_000
                + index
            )
            replications.append(
                AcceptanceReplication(
                    replication_id=(
                        f"manual-effect-{cell.effect_size:g}-"
                        f"k{cell.cohort_size}-rep-{index + 1}"
                    ),
                    seed=seed,
                    effect_size=cell.effect_size,
                    cohort_size=cell.cohort_size,
                    artifact_valid=True,
                    governance_state="eligible_internal_only",
                    failing_diagnostics=(),
                    contribution_estimate_eligible=cell.effect_size != 0.0,
                    posterior_null_guard_evaluable=True,
                    posterior_null_guard_excludes_zero=cell.effect_size != 0.0,
                    artifact_self_hash="a" * 64,
                    artifact_bound_to_expected_input=True,
                    covered_injected_effect=index < 160,
                )
            )
    result = AcceptanceStudyResult(
        method=ACCEPTANCE_METHOD_SAMPLER_ARTIFACT,
        mode=ACCEPTANCE_MODE_FULL,
        study_id="manual-full-grid",
        base_seed=base_seed,
        replication_count=len(replications),
        replication_count_per_cell=INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN,
        required_cells=required_acceptance_cells(),
        replications=tuple(replications),
        sampler_settings=SamplerFullSettings(),
    )

    report = result.to_report()
    plan_coverage = sampler_artifact_acceptance_plan_coverage(result)

    assert plan_coverage["complete"] is True
    assert report["coverage_summary"]["calibration_band_observed"] is True
    assert report["artifact_level_null_eligibility"]["full_null_gate_observed"] is True
    assert report["runner_generated"] is False
    assert report["sampler_artifact_acceptance_passed"] is False
    assert report["sampler_artifact_resumable_evidence_observed"] is False
    assert report["artifact_inputs_authorized"] is False
    assert report["open_spec_3_3_completion_authorized"] is False


def test_manual_full_grid_without_non_null_authorization_fails_calibration_observation():
    base_seed = 700
    replications = []
    for cell in required_acceptance_cells():
        for index in range(INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN):
            seed = (
                base_seed
                + int(round(cell.effect_size * 1000)) * 100_000
                + cell.cohort_size * 1_000
                + index
            )
            replications.append(
                AcceptanceReplication(
                    replication_id=(
                        f"manual-no-auth-effect-{cell.effect_size:g}-"
                        f"k{cell.cohort_size}-rep-{index + 1}"
                    ),
                    seed=seed,
                    effect_size=cell.effect_size,
                    cohort_size=cell.cohort_size,
                    artifact_valid=True,
                    governance_state="eligible_internal_only",
                    failing_diagnostics=(),
                    contribution_estimate_eligible=False,
                    posterior_null_guard_evaluable=True,
                    posterior_null_guard_excludes_zero=False,
                    artifact_self_hash="a" * 64,
                    artifact_bound_to_expected_input=True,
                    covered_injected_effect=index < 160,
                )
            )
    result = AcceptanceStudyResult(
        method=ACCEPTANCE_METHOD_SAMPLER_ARTIFACT,
        mode=ACCEPTANCE_MODE_FULL,
        study_id="manual-full-grid-no-authorization",
        base_seed=base_seed,
        replication_count=len(replications),
        replication_count_per_cell=INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN,
        required_cells=required_acceptance_cells(),
        replications=tuple(replications),
        sampler_settings=SamplerFullSettings(),
    )

    coverage = result.to_report()["coverage_summary"]

    assert coverage["coverage_rate"] == 0.8
    assert coverage["non_null_contribution_estimate_authorization_observed"] is False
    assert coverage["calibration_band_observed"] is False
    scenarios = {
        (scenario["injected_effect_size_sd"], scenario["cohort_size"]): scenario
        for scenario in coverage["scenarios"]
    }
    assert scenarios[(0.2, 12)]["contribution_estimate_authorization_observed"] is False
    assert scenarios[(0.5, 16)]["contribution_estimate_authorization_observed"] is False
    assert result.sampler_artifact_acceptance_passed is False


def test_manual_full_grid_result_cannot_impersonate_runner_even_with_flag():
    base_seed = 700
    replications = []
    for cell in required_acceptance_cells():
        for index in range(INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN):
            seed = (
                base_seed
                + int(round(cell.effect_size * 1000)) * 100_000
                + cell.cohort_size * 1_000
                + index
            )
            replications.append(
                AcceptanceReplication(
                    replication_id=(
                        f"manual-effect-{cell.effect_size:g}-"
                        f"k{cell.cohort_size}-rep-{index + 1}"
                    ),
                    seed=seed,
                    effect_size=cell.effect_size,
                    cohort_size=cell.cohort_size,
                    artifact_valid=True,
                    governance_state="eligible_internal_only",
                    failing_diagnostics=(),
                    contribution_estimate_eligible=cell.effect_size != 0.0,
                    posterior_null_guard_evaluable=cell.effect_size != 0.0,
                    posterior_null_guard_excludes_zero=cell.effect_size != 0.0,
                    artifact_self_hash="a" * 64,
                    artifact_bound_to_expected_input=True,
                    covered_injected_effect=index < 160,
                )
            )
    result = AcceptanceStudyResult(
        method=ACCEPTANCE_METHOD_SAMPLER_ARTIFACT,
        mode=ACCEPTANCE_MODE_FULL,
        study_id="manual-full-grid-runner-flag",
        base_seed=base_seed,
        replication_count=len(replications),
        replication_count_per_cell=INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN,
        required_cells=required_acceptance_cells(),
        replications=tuple(replications),
        sampler_settings=SamplerFullSettings(),
        runner_generated=True,
    )
    result = dataclasses.replace(
        result,
        runner_generation_proof_hash=_runner_generation_proof_hash(
            method=result.method,
            mode=result.mode,
            base_seed=result.base_seed,
            required_cells=result.required_cells,
            replications=result.replications,
            sampler_settings=result.sampler_settings,
        ),
    )

    report = result.to_report()

    assert report["runner_generated"] is True
    assert report["runner_generation_proof_hash"]
    assert report["acceptance_run_manifest"]["runner_generation_proof_valid"] is False
    assert report["coverage_summary"]["calibration_band_observed"] is True
    assert report["artifact_level_null_eligibility"]["full_null_gate_observed"] is False
    assert report["sampler_artifact_acceptance_passed"] is False
    assert report["artifact_inputs_authorized"] is False
    assert report["open_spec_3_3_completion_authorized"] is False


def test_injected_full_proof_runner_cannot_self_certify_complete_grid():
    base_seed = 700

    def fake_run_proof(dataset, **kwargs):
        replication_index = (
            dataset.seed
            - base_seed
            - int(round(dataset.injected_effect_sd * 1000)) * 100_000
            - dataset.k * 1_000
        )
        covered = replication_index < 160
        effect = dataset.injected_effect_sd
        if covered:
            lower, upper = effect - 0.05, effect + 0.05
        else:
            lower, upper = effect + 0.4, effect + 0.5
        report = _internal_report(
            lower,
            upper,
            posterior_mean=effect if effect != 0.0 else 0.0,
            posterior_sd=0.01 if effect != 0.0 else 0.05,
        )
        return (
            _artifact(
                state="eligible_internal_only",
                comparison_authorized=effect != 0.0,
                synthetic_input_hash=dataset.synthetic_input_hash(),
                internal_report=report,
            ),
            report,
        )

    result = run_sampler_artifact_full_acceptance_study(
        base_seed=base_seed,
        replication_count=INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN,
        study_inputs=SyntheticStudyInputs([], {}, {}),
        proof_runner=fake_run_proof,
    )
    report = result.to_report()

    assert report["replication_count"] == 1200
    assert report["full_replication_requirement_met"] is True
    assert report["coverage_summary"]["calibration_band_observed"] is True
    assert report["artifact_level_null_eligibility"]["full_null_gate_observed"] is True
    assert report["runner_generated"] is False
    assert report["acceptance_run_manifest"]["runner_generation_proof_valid"] is False
    assert report["sampler_artifact_acceptance_passed"] is False
    assert report["artifact_inputs_authorized"] is False
    assert report["open_spec_3_3_completion_authorized"] is False


def test_acceptance_report_rehydration_rejects_malformed_artifact_self_hash():
    def fake_run_proof(dataset, **kwargs):
        report = _internal_report(
            dataset.injected_effect_sd - 0.1,
            dataset.injected_effect_sd + 0.1,
        )
        return (
            _artifact(
                state="eligible_internal_only",
                synthetic_input_hash=dataset.synthetic_input_hash(),
                internal_report=report,
            ),
            report,
        )

    report = run_sampler_artifact_full_acceptance_study(
        base_seed=700,
        replication_count=1,
        study_inputs=SyntheticStudyInputs([], {}, {}),
        proof_runner=fake_run_proof,
    ).to_report()
    forged = dict(report)
    forged["replications"] = [dict(replication) for replication in report["replications"]]
    forged["replications"][0]["artifact_self_hash"] = "not-a-hash"
    forged_body = {key: value for key, value in forged.items() if key != "study_hash"}
    forged["study_hash"] = sha256_json(forged_body)

    with pytest.raises(ValueError, match="invalid shape"):
        acceptance_study_result_from_report(forged)


def test_acceptance_full_cli_prints_stdout_only_sanitized_report(monkeypatch, capsys):
    from fluencytracr_inference import __main__ as cli

    captured_kwargs = {}

    def fake_run_proof(dataset, **kwargs):
        report = _internal_report(
            dataset.injected_effect_sd - 0.1,
            dataset.injected_effect_sd + 0.1,
        )
        return (
            _artifact(
                state="eligible_internal_only",
                synthetic_input_hash=dataset.synthetic_input_hash(),
                internal_report=report,
            ),
            report,
        )

    result = run_sampler_artifact_full_acceptance_study(
        base_seed=701,
        replication_start=5,
        replication_count=1,
        study_inputs=SyntheticStudyInputs([], {}, {}),
        proof_runner=fake_run_proof,
        generated_at="fixed",
    )

    def fake_acceptance_runner(**kwargs):
        captured_kwargs.update(kwargs)
        return result

    monkeypatch.setattr(
        cli,
        "run_sampler_artifact_full_acceptance_study",
        fake_acceptance_runner,
    )

    assert cli.main(
        [
            "--acceptance-full",
            "--base-seed",
            "701",
            "--replication-start",
            "5",
            "--replication-count",
            "1",
            "--generated-at",
            "fixed",
        ]
    ) == 0

    emitted = json.loads(capsys.readouterr().out)
    assert captured_kwargs == {
        "base_seed": 701,
        "replication_start": 5,
        "replication_count": 1,
        "generated_at": "fixed",
    }
    assert emitted["method"] == ACCEPTANCE_METHOD_SAMPLER_ARTIFACT
    assert emitted["mode"] == ACCEPTANCE_MODE_FULL
    assert emitted["artifact_inputs_authorized"] is False
    assert emitted["open_spec_3_3_completion_authorized"] is False
    assert emitted["acceptance_run_manifest"]["base_seed"] == 701
    assert emitted["acceptance_run_manifest"]["observed_total_replications"] == 6
    _assert_no_posterior_values(emitted)


def test_acceptance_plan_cli_prints_stdout_only_non_authorizing_manifest(
    monkeypatch, capsys
):
    from fluencytracr_inference import __main__ as cli

    def fail_if_full_runner_called(**kwargs):
        raise AssertionError("acceptance-plan must not call the full runner")

    monkeypatch.setattr(
        cli,
        "run_sampler_artifact_full_acceptance_study",
        fail_if_full_runner_called,
    )

    assert cli.main(
        [
            "--acceptance-plan",
            "--base-seed",
            "701",
            "--chunk-replication-count",
            "64",
        ]
    ) == 0

    emitted = json.loads(capsys.readouterr().out)
    assert emitted["report_class"] == "internal_synthetic_acceptance_execution_plan"
    assert emitted["plan_only"] is True
    assert emitted["artifact_level_evidence"] is False
    assert emitted["base_seed"] == 701
    assert emitted["chunk_count"] == 4
    assert emitted["expected_total_artifacts"] == 1200
    assert emitted["artifact_inputs_authorized"] is False
    assert emitted["open_spec_3_3_completion_authorized"] is False
    assert emitted["writes_persistence"] is False
    assert emitted["creates_export"] is False
    assert emitted["chunks"][0]["cli_args"] == [
        "--acceptance-full",
        "--base-seed",
        "701",
        "--replication-start",
        "0",
        "--replication-count",
        "64",
    ]
    _assert_no_posterior_values(emitted)


def test_acceptance_plan_cli_requires_positive_chunk_replication_count(capsys):
    from fluencytracr_inference import __main__ as cli

    with pytest.raises(SystemExit):
        cli.main(["--acceptance-plan", "--chunk-replication-count", "0"])

    err = capsys.readouterr().err
    assert "--chunk-replication-count must be positive" in err


def test_acceptance_combine_cli_reads_reports_from_stdin(monkeypatch, capsys):
    from fluencytracr_inference import __main__ as cli

    def fake_run_proof(dataset, **kwargs):
        report = _internal_report(
            dataset.injected_effect_sd - 0.1,
            dataset.injected_effect_sd + 0.1,
        )
        return (
            _artifact(
                state="eligible_internal_only",
                synthetic_input_hash=dataset.synthetic_input_hash(),
                internal_report=report,
            ),
            report,
        )

    first = run_sampler_artifact_full_acceptance_study(
        base_seed=700,
        replication_start=0,
        replication_count=1,
        study_inputs=SyntheticStudyInputs([], {}, {}),
        proof_runner=fake_run_proof,
    )
    second = run_sampler_artifact_full_acceptance_study(
        base_seed=700,
        replication_start=1,
        replication_count=1,
        study_inputs=SyntheticStudyInputs([], {}, {}),
        proof_runner=fake_run_proof,
    )
    monkeypatch.setattr(
        "sys.stdin",
        io.StringIO(json.dumps([first.to_report(), second.to_report()])),
    )

    assert cli.main(
        ["--acceptance-combine-stdin", "--study-id", "cli-combined"]
    ) == 0

    emitted = json.loads(capsys.readouterr().out)
    assert emitted["study_id"] == "cli-combined"
    assert emitted["replication_count"] == 12
    assert emitted["replication_count_per_cell"] == 2
    assert emitted["acceptance_run_manifest"]["observed_total_replications"] == 12
    assert emitted["sampler_artifact_acceptance_passed"] is False
    assert emitted["sampler_artifact_resumable_evidence_observed"] is False
    assert emitted["acceptance_run_manifest"]["source_report_hash_count"] == 0
    assert (
        emitted["acceptance_run_manifest"][
            "source_report_runner_generation_proof_observed"
        ]
        is False
    )
    assert emitted["artifact_inputs_authorized"] is False
    assert emitted["open_spec_3_3_completion_authorized"] is False
    _assert_no_posterior_values(emitted)


def test_acceptance_cli_requires_explicit_replication_count(capsys):
    from fluencytracr_inference import __main__ as cli

    with pytest.raises(SystemExit):
        cli.main(["--acceptance-full"])

    err = capsys.readouterr().err
    assert "--acceptance-full requires --replication-count" in err


def test_combine_sampler_artifact_acceptance_batches_rejects_duplicate_replications():
    def fake_run_proof(dataset, **kwargs):
        report = _internal_report(
            dataset.injected_effect_sd - 0.1,
            dataset.injected_effect_sd + 0.1,
        )
        return (
            _artifact(
                state="eligible_internal_only",
                synthetic_input_hash=dataset.synthetic_input_hash(),
                internal_report=report,
            ),
            report,
        )

    batch = run_sampler_artifact_full_acceptance_study(
        base_seed=700,
        replication_count=1,
        study_inputs=SyntheticStudyInputs([], {}, {}),
        proof_runner=fake_run_proof,
    )

    with pytest.raises(ValueError, match="duplicate acceptance replication_id"):
        combine_sampler_artifact_acceptance_batches([batch, batch])


def test_combine_sampler_artifact_acceptance_batches_rejects_mismatched_batches():
    def fake_run_proof(dataset, **kwargs):
        report = _internal_report(
            dataset.injected_effect_sd - 0.1,
            dataset.injected_effect_sd + 0.1,
        )
        return (
            _artifact(
                state="eligible_internal_only",
                synthetic_input_hash=dataset.synthetic_input_hash(),
                internal_report=report,
            ),
            report,
        )

    full = run_sampler_artifact_full_acceptance_study(
        base_seed=700,
        replication_count=1,
        study_inputs=SyntheticStudyInputs([], {}, {}),
        proof_runner=fake_run_proof,
    )
    smoke = run_sampler_artifact_smoke_acceptance_study(
        base_seed=700,
        replication_count=1,
        required_cells=required_acceptance_cells(),
        study_inputs=SyntheticStudyInputs([], {}, {}),
        proof_runner=fake_run_proof,
    )

    with pytest.raises(ValueError, match="same mode"):
        combine_sampler_artifact_acceptance_batches([full, smoke])


def test_sampler_artifact_batch_rejects_unsupported_required_cells():
    with pytest.raises(ValueError, match="unsupported calibration effect_size"):
        run_sampler_artifact_acceptance_batch(
            required_cells=((0.3, 12),),
            study_inputs=SyntheticStudyInputs([], {}, {}),
            proof_runner=lambda dataset, **kwargs: ({}, {}),
        )

    with pytest.raises(ValueError, match="unsupported calibration cohort_size"):
        run_sampler_artifact_acceptance_batch(
            required_cells=((0.2, 10),),
            study_inputs=SyntheticStudyInputs([], {}, {}),
            proof_runner=lambda dataset, **kwargs: ({}, {}),
        )

    with pytest.raises(ValueError, match="duplicate required calibration cell"):
        run_sampler_artifact_acceptance_batch(
            required_cells=((0.2, 12), (0.2, 12)),
            study_inputs=SyntheticStudyInputs([], {}, {}),
            proof_runner=lambda dataset, **kwargs: ({}, {}),
        )


def test_sampler_artifact_smoke_null_gate_rejects_invalid_artifacts():
    def fake_run_proof(dataset, **kwargs):
        report = _internal_report()
        return (
            _artifact(
                state="eligible_internal_only",
                valid_hash=False,
                synthetic_input_hash=dataset.synthetic_input_hash(),
                internal_report=report,
            ),
            report,
        )

    result = run_sampler_artifact_smoke_acceptance_study(
        replication_count=1,
        study_inputs=SyntheticStudyInputs([], {}, {}),
        proof_runner=fake_run_proof,
    )

    null = result.to_report()["artifact_level_null_eligibility"]
    assert null["valid_artifact_count"] == 0
    assert null["invalid_artifact_count"] == 1
    assert null["false_eligible_count"] == 0
    assert null["smoke_null_gate_observed"] is False


def test_sampler_artifact_null_report_separates_governance_and_posterior_audit():
    def fake_run_proof(dataset, **kwargs):
        report = _internal_report(
            0.4,
            0.6,
            posterior_mean=0.5,
            posterior_sd=0.05,
        )
        return (
            _artifact(
                state="eligible_internal_only",
                synthetic_input_hash=dataset.synthetic_input_hash(),
                internal_report=report,
            ),
            report,
        )

    result = run_sampler_artifact_smoke_acceptance_study(
        replication_count=1,
        study_inputs=SyntheticStudyInputs([], {}, {}),
        proof_runner=fake_run_proof,
    )

    replication = result.replications[0]
    assert replication.contribution_estimate_eligible is True
    assert replication.posterior_null_guard_evaluable is True
    assert replication.posterior_null_guard_excludes_zero is True
    null = result.to_report()["artifact_level_null_eligibility"]
    assert null["false_eligible_count"] == 1
    assert null["false_eligibility_rate"] == 1.0
    assert null["posterior_null_guard_excluding_zero_count"] == 1
    assert null["posterior_null_guard_excluding_zero_rate"] == 1.0
    assert null["smoke_null_gate_observed"] is False


def test_sampler_artifact_null_gate_uses_contribution_authorization_not_validity():
    def fake_run_proof(dataset, **kwargs):
        report = _internal_report(
            -0.1,
            0.1,
            posterior_mean=0.0,
            posterior_sd=0.05,
        )
        return (
            _artifact(
                state="eligible_internal_only",
                comparison_authorized=False,
                synthetic_input_hash=dataset.synthetic_input_hash(),
                internal_report=report,
            ),
            report,
        )

    result = run_sampler_artifact_smoke_acceptance_study(
        replication_count=1,
        study_inputs=SyntheticStudyInputs([], {}, {}),
        proof_runner=fake_run_proof,
    )

    replication = result.replications[0]
    assert replication.artifact_valid is True
    assert replication.acceptance_usable_artifact is True
    assert replication.contribution_estimate_eligible is False
    assert replication.posterior_null_guard_evaluable is True
    assert replication.posterior_null_guard_excludes_zero is False

    null = result.to_report()["artifact_level_null_eligibility"]
    assert null["valid_artifact_count"] == 1
    assert null["acceptance_usable_artifact_count"] == 1
    assert null["posterior_null_guard_evaluable_count"] == 1
    assert null["posterior_null_guard_unevaluable_count"] == 0
    assert null["posterior_null_guard_excluding_zero_count"] == 0
    assert null["false_eligible_count"] == 0
    assert null["false_eligibility_rate"] == 0.0
    assert null["smoke_null_gate_observed"] is True


def test_sampler_artifact_null_guard_requires_valid_internal_posterior_summary():
    def fake_run_proof(dataset, **kwargs):
        report = {
            "estimand_summary": {
                "parameter_name": "contribution_alignment_effect",
                "posterior_mean": 0.5,
                "credible_interval_80": {
                    "lower": 0.4,
                    "upper": 0.6,
                },
            }
        }
        return (
            _artifact(
                state="eligible_internal_only",
                synthetic_input_hash=dataset.synthetic_input_hash(),
                internal_report=report,
            ),
            report,
        )

    result = run_sampler_artifact_smoke_acceptance_study(
        replication_count=1,
        study_inputs=SyntheticStudyInputs([], {}, {}),
        proof_runner=fake_run_proof,
    )

    replication = result.replications[0]
    assert replication.artifact_valid is True
    assert replication.contribution_estimate_eligible is False
    assert replication.posterior_null_guard_evaluable is False
    assert replication.posterior_null_guard_excludes_zero is False
    null = result.to_report()["artifact_level_null_eligibility"]
    assert null["false_eligible_count"] == 0
    assert null["posterior_null_guard_evaluable_count"] == 0
    assert null["posterior_null_guard_unevaluable_count"] == 1
    assert null["smoke_null_gate_observed"] is False


@pytest.mark.parametrize(
    "mutate",
    [
        lambda artifact: artifact["calibration"]["scenarios"][0].update(
            {"pass": False}
        ),
        lambda artifact: artifact["null_checks"].update({"pass": False}),
        lambda artifact: artifact["floor_checks"]["k4_rejected"].update(
            {"pass": False}
        ),
        lambda artifact: artifact["peeking_control"].update(
            {"pass": False, "repeated_evaluation": True}
        ),
        lambda artifact: (
            artifact["comparison_adequacy"]["required_checks"][0].update(
                {"pass": False}
            ),
            artifact["comparison_adequacy"].update(
                {"all_required_checks_pass": False}
            ),
        ),
    ],
    ids=[
        "calibration",
        "null",
        "floor",
        "peeking",
        "comparison",
    ],
)
def test_sampler_artifact_rejects_self_hashed_failed_study_sections(mutate):
    def fake_run_proof(dataset, **kwargs):
        report = _internal_report()
        artifact = _artifact(
            state="eligible_internal_only",
            synthetic_input_hash=dataset.synthetic_input_hash(),
            internal_report=report,
        )
        mutate(artifact)
        return _rehash(artifact), report

    result = run_sampler_artifact_smoke_acceptance_study(
        replication_count=1,
        study_inputs=SyntheticStudyInputs([], {}, {}),
        proof_runner=fake_run_proof,
    )

    replication = result.replications[0]
    assert replication.artifact_valid is False
    assert replication.contribution_estimate_eligible is False
    null = result.to_report()["artifact_level_null_eligibility"]
    assert null["valid_artifact_count"] == 0
    assert null["invalid_artifact_count"] == 1
    assert null["false_eligible_count"] == 0
    assert null["smoke_null_gate_observed"] is False


def test_sampler_artifact_coverage_requires_internal_report_hash_binding():
    def fake_run_proof(dataset, **kwargs):
        artifact_report = _internal_report(0.1, 0.3)
        returned_report = _internal_report(0.25, 0.4)
        return (
            _artifact(
                state="eligible_internal_only",
                synthetic_input_hash=dataset.synthetic_input_hash(),
                internal_report=artifact_report,
            ),
            returned_report,
        )

    result = run_sampler_artifact_acceptance_batch(
        base_seed=100,
        effect_size=0.2,
        cohort_size=16,
        replication_count=1,
        study_inputs=SyntheticStudyInputs([], {}, {}),
        proof_runner=fake_run_proof,
    )

    coverage = result.to_report()["coverage_summary"]
    assert coverage["covered_count"] == 0
    assert coverage["coverage_rate"] == 0.0
    assert coverage["missing_credible_interval_count"] == 1
    assert result.replications[0].artifact_valid is True
    assert result.replications[0].covered_injected_effect is None


def test_sampler_artifact_coverage_ignores_invalid_artifacts():
    def fake_run_proof(dataset, **kwargs):
        report = _internal_report(0.1, 0.3)
        return (
            _artifact(
                state="eligible_internal_only",
                valid_hash=False,
                synthetic_input_hash=dataset.synthetic_input_hash(),
                internal_report=report,
            ),
            report,
        )

    result = run_sampler_artifact_acceptance_batch(
        base_seed=100,
        effect_size=0.2,
        cohort_size=16,
        replication_count=1,
        study_inputs=SyntheticStudyInputs([], {}, {}),
        proof_runner=fake_run_proof,
    )

    coverage = result.to_report()["coverage_summary"]
    assert coverage["covered_count"] == 0
    assert coverage["coverage_rate"] == 0.0
    assert coverage["invalid_artifact_count"] == 1
    assert coverage["missing_credible_interval_count"] == 1
    assert result.replications[0].artifact_valid is False
    assert result.replications[0].covered_injected_effect is None


def test_sampler_artifact_hold_authorization_inconsistency_is_invalid():
    def fake_run_proof(dataset, **kwargs):
        report = _internal_report()
        return (
            _artifact(
                state="HOLD",
                failing=("r_hat",),
                comparison_authorized=True,
                synthetic_input_hash=dataset.synthetic_input_hash(),
                internal_report=report,
            ),
            report,
        )

    result = run_sampler_artifact_smoke_acceptance_study(
        replication_count=1,
        study_inputs=SyntheticStudyInputs([], {}, {}),
        proof_runner=fake_run_proof,
    )

    replication = result.replications[0]
    assert replication.artifact_valid is False
    assert replication.contribution_estimate_eligible is False
    null = result.to_report()["artifact_level_null_eligibility"]
    assert null["invalid_artifact_count"] == 1
    assert null["false_eligible_count"] == 0


@pytest.mark.parametrize(
    "mutate",
    [
        lambda artifact: artifact.update(
            {
                "measurement_cell_window_evidence": (
                    _measurement_cell_window_evidence_section(observed=())
                )
            }
        ),
        lambda artifact: artifact["model_spec_binding"].update(
            {"likelihood_family": "binomial_rate_aggregate", "link_function": "logit"}
        ),
    ],
    ids=["missing-windows", "unsupported-likelihood"],
)
def test_sampler_artifact_python_validator_matches_ts_fail_closed_boundaries(mutate):
    def fake_run_proof(dataset, **kwargs):
        report = _internal_report()
        artifact = _artifact(
            state="eligible_internal_only",
            synthetic_input_hash=dataset.synthetic_input_hash(),
            internal_report=report,
        )
        mutate(artifact)
        return _rehash(artifact), report

    result = run_sampler_artifact_smoke_acceptance_study(
        replication_count=1,
        study_inputs=SyntheticStudyInputs([], {}, {}),
        proof_runner=fake_run_proof,
    )

    replication = result.replications[0]
    assert replication.artifact_valid is False
    assert replication.contribution_estimate_eligible is False
    null = result.to_report()["artifact_level_null_eligibility"]
    assert null["invalid_artifact_count"] == 1
    assert null["smoke_null_gate_observed"] is False


def test_sampler_artifact_wrong_replication_hash_is_not_eligible():
    def fake_run_proof(dataset, **kwargs):
        report = _internal_report()
        return (
            _artifact(
                state="eligible_internal_only",
                synthetic_input_hash="2" * 64,
                internal_report=report,
            ),
            report,
        )

    result = run_sampler_artifact_smoke_acceptance_study(
        replication_count=1,
        study_inputs=SyntheticStudyInputs([], {}, {}),
        proof_runner=fake_run_proof,
    )

    replication = result.replications[0]
    assert replication.artifact_valid is True
    assert replication.artifact_bound_to_expected_input is False
    assert replication.contribution_estimate_eligible is False
    null = result.to_report()["artifact_level_null_eligibility"]
    assert null["valid_artifact_count"] == 0
    assert null["invalid_artifact_count"] == 1
    assert null["false_eligible_count"] == 0
    assert null["smoke_null_gate_observed"] is False


def test_sampler_artifact_smoke_requires_positive_replications():
    with pytest.raises(ValueError, match="replication_count must be positive"):
        run_sampler_artifact_smoke_acceptance_study(
            replication_count=0,
            study_inputs=SyntheticStudyInputs([], {}, {}),
            proof_runner=lambda dataset, **kwargs: ({}, {}),
        )


def test_sampler_artifact_full_mode_rejects_weakened_sampler_settings():
    with pytest.raises(ValueError, match="requires the exact full sampler settings"):
        run_sampler_artifact_acceptance_batch(
            base_seed=100,
            effect_size=0.0,
            cohort_size=12,
            replication_count=200,
            mode="full",
            settings=SamplerSmokeSettings(),
            study_inputs=SyntheticStudyInputs([], {}, {}),
            proof_runner=lambda dataset, **kwargs: ({}, {}),
        )


def test_sampler_artifact_full_mode_requires_complete_required_cell_grid():
    with pytest.raises(ValueError, match="requires every task-3.3"):
        run_sampler_artifact_acceptance_batch(
            base_seed=100,
            effect_size=0.0,
            cohort_size=12,
            replication_count=200,
            mode="full",
            settings=SamplerFullSettings(),
            study_inputs=SyntheticStudyInputs([], {}, {}),
            proof_runner=lambda dataset, **kwargs: ({}, {}),
        )

    with pytest.raises(ValueError, match="requires the exact full sampler settings"):
        run_sampler_artifact_acceptance_batch(
            base_seed=100,
            effect_size=0.0,
            cohort_size=12,
            replication_count=200,
            mode="full",
            settings=SamplerFullSettings(draws=1999),
            study_inputs=SyntheticStudyInputs([], {}, {}),
            proof_runner=lambda dataset, **kwargs: ({}, {}),
        )
