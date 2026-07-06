"""Fail-closed behavior: each gate individually forced to fail => HOLD.

Two layers:

1. Pure gate-evaluator unit tests — a passing diagnostics baseline with one
   value pushed over its gate must name exactly that failing diagnostic.
2. Integration tests — real datasets / real (small) fits that violate a gate
   must emit HOLD artifacts naming the right diagnostic from the schema
   vocabulary.
"""

import dataclasses

import pytest

from fluencytracr_inference.artifact import emit_proof_artifact
from fluencytracr_inference.constants import (
    INFERENCE_PROOF_ESTIMAND_PARAMETER_NAME,
)
from fluencytracr_inference.diagnostics import (
    DiagnosticsResult,
    ParameterDiagnostic,
    PpcStatistic,
    PreTrendResult,
    PriorSensitivityResult,
    SamplerDiagnostics,
    evaluate_gates,
    run_pre_trend_check,
    run_prior_sensitivity,
)
from fluencytracr_inference.hashing import inference_proof_artifact_self_hash
from fluencytracr_inference.model import HoldViolation, fit_did_model
from fluencytracr_inference.synthetic import (
    generate_did_dataset,
    generate_mismatched_comparison,
    generate_missing_windows,
    generate_no_comparison_cohort,
    generate_prior_dominated_weak,
    generate_suppressed_windows,
    generate_violated_pre_trend,
)

# --- Layer 1: gate-evaluator unit tests --------------------------------------


def _passing_parameter(name: str = INFERENCE_PROOF_ESTIMAND_PARAMETER_NAME, **overrides):
    values = {
        "parameter_name": name,
        "r_hat": 1.002,
        "bulk_ess": 1200.0,
        "tail_ess": 1100.0,
        "posterior_mean_mcse": 0.001,
        "interval_endpoint_mcse": 0.002,
        "posterior_sd": 0.1,
    }
    values.update(overrides)
    return ParameterDiagnostic(**values)


def _passing_ppc():
    return tuple(
        PpcStatistic(
            statistic_name=name,
            observed_value=0.0,
            predictive_mean=0.0,
            predictive_ci80_lower=-1.0,
            predictive_ci80_upper=1.0,
            p_value=0.5,
            passed=True,
        )
        for name in (
            "pre_post_mean_movement",
            "between_cohort_variance",
            "within_cohort_variance",
            "tail_or_extreme_cell_statistic",
            "difference_in_differences_contrast",
        )
    )


def _passing_diagnostics(**overrides) -> DiagnosticsResult:
    values = {
        "sampler": SamplerDiagnostics(
            parameters=(_passing_parameter(),),
            post_warmup_divergences=0,
            max_treedepth_saturation_rate=0.0,
            max_treedepth_warning=False,
            energy_bfmi_min=0.9,
            energy_bfmi_warning=False,
        ),
        "posterior_predictive_checks": _passing_ppc(),
        "prior_sensitivity": PriorSensitivityResult(
            documented=True,
            justification_ref="docs/contracts/confidence-inference-methodology/README.md#prior-policy",
            justification_hash="a" * 64,
            posterior_mean_shift_in_posterior_sd=0.1,
            passed=True,
            prior_family="weakly_informative_normal_halfnormal_2026_07",
        ),
        "pre_trend": PreTrendResult(
            ci80_lower=-0.1, ci80_upper=0.1, includes_zero=True, passed=True,
            wall_time_seconds=0.0,
        ),
        "internal_report": {},
    }
    values.update(overrides)
    return DiagnosticsResult(**values)


def _with_parameter(**overrides) -> DiagnosticsResult:
    diagnostics = _passing_diagnostics()
    return dataclasses.replace(
        diagnostics,
        sampler=dataclasses.replace(
            diagnostics.sampler, parameters=(_passing_parameter(**overrides),)
        ),
    )


def _with_sampler(**overrides) -> DiagnosticsResult:
    diagnostics = _passing_diagnostics()
    return dataclasses.replace(
        diagnostics, sampler=dataclasses.replace(diagnostics.sampler, **overrides)
    )


def test_passing_baseline_names_nothing():
    assert evaluate_gates(_passing_diagnostics()) == []


def test_r_hat_gate():
    assert evaluate_gates(_with_parameter(r_hat=1.02)) == ["r_hat"]


def test_bulk_ess_gate():
    assert evaluate_gates(_with_parameter(bulk_ess=399.0)) == ["bulk_ess"]


def test_tail_ess_gate():
    assert evaluate_gates(_with_parameter(tail_ess=250.0)) == ["tail_ess"]


def test_mcse_gate():
    # max(mcse) / sd = 0.02 / 0.1 = 0.2 > 0.1
    assert evaluate_gates(_with_parameter(interval_endpoint_mcse=0.02)) == ["mcse"]


def test_divergences_gate():
    assert evaluate_gates(_with_sampler(post_warmup_divergences=1)) == ["divergences"]


def test_max_treedepth_gate():
    result = evaluate_gates(
        _with_sampler(max_treedepth_saturation_rate=0.01, max_treedepth_warning=True)
    )
    assert result == ["max_treedepth_saturation"]


def test_energy_bfmi_gate():
    result = evaluate_gates(_with_sampler(energy_bfmi_min=0.2, energy_bfmi_warning=True))
    assert result == ["energy_bfmi"]


def test_missing_estimand_names_sampler_diagnostic():
    diagnostics = _passing_diagnostics()
    diagnostics = dataclasses.replace(
        diagnostics,
        sampler=dataclasses.replace(
            diagnostics.sampler, parameters=(_passing_parameter(name="alpha"),)
        ),
    )
    assert evaluate_gates(diagnostics) == ["sampler_diagnostic"]


def test_ppc_gate_out_of_band_p_value():
    checks = list(_passing_ppc())
    checks[0] = dataclasses.replace(checks[0], p_value=0.97, passed=False)
    result = evaluate_gates(_passing_diagnostics(posterior_predictive_checks=tuple(checks)))
    assert result == ["posterior_predictive_check"]


def test_ppc_gate_missing_checks():
    assert evaluate_gates(_passing_diagnostics(posterior_predictive_checks=None)) == [
        "posterior_predictive_check"
    ]


def test_prior_sensitivity_gate_shift():
    diagnostics = _passing_diagnostics()
    sensitivity = dataclasses.replace(
        diagnostics.prior_sensitivity,
        posterior_mean_shift_in_posterior_sd=0.5,
        passed=False,
    )
    assert evaluate_gates(_passing_diagnostics(prior_sensitivity=sensitivity)) == [
        "prior_sensitivity"
    ]


def test_prior_sensitivity_gate_undocumented():
    diagnostics = _passing_diagnostics()
    sensitivity = dataclasses.replace(
        diagnostics.prior_sensitivity, justification_ref=None, justification_hash=None
    )
    assert evaluate_gates(_passing_diagnostics(prior_sensitivity=sensitivity)) == [
        "prior_sensitivity"
    ]


def test_prior_sensitivity_gate_absent():
    assert evaluate_gates(_passing_diagnostics(prior_sensitivity=None)) == [
        "prior_sensitivity"
    ]


def test_pre_trend_gate():
    pre_trend = PreTrendResult(
        ci80_lower=0.4, ci80_upper=0.9, includes_zero=False, passed=False,
        wall_time_seconds=0.0,
    )
    assert evaluate_gates(_passing_diagnostics(pre_trend=pre_trend)) == ["pre_trend"]


# --- Layer 2: integration — real fits / datasets ------------------------------


def test_hold_violation_for_non_normal_family(clean_dataset):
    with pytest.raises(HoldViolation) as exc_info:
        fit_did_model(clean_dataset, likelihood_family="binomial_rate_aggregate")
    assert exc_info.value.failing_diagnostic == "unsupported_likelihood_family"
    assert "binomial_rate_aggregate" in str(exc_info.value)


def test_tiny_fit_fails_ess_gates():
    """1 look at 2 chains x 60 draws cannot clear the 400 chain-total ESS gates."""
    dataset = generate_did_dataset(seed=11, k=6, injected_effect_sd=0.2)
    fit = fit_did_model(dataset, draws=60, tune=80, seed=11)
    from fluencytracr_inference.diagnostics import compute_sampler_diagnostics

    sampler = compute_sampler_diagnostics(fit)
    failing = evaluate_gates(_passing_diagnostics(sampler=sampler))
    assert "bulk_ess" in failing
    assert "tail_ess" in failing


def test_violated_pre_trend_holds(clean_fit, clean_diagnostics):
    dataset = generate_violated_pre_trend(seed=43, k=12)
    pre_trend = run_pre_trend_check(dataset, draws=300, tune=300, seed=43)
    assert pre_trend.includes_zero is False
    diagnostics = dataclasses.replace(clean_diagnostics, pre_trend=pre_trend)
    artifact = emit_proof_artifact(dataset=dataset, fit=clean_fit, diagnostics=diagnostics)
    assert artifact["governance_state"]["state"] == "HOLD"
    assert artifact["governance_state"]["failing_diagnostics"] == ["pre_trend"]


def test_prior_dominated_weak_data_holds(clean_diagnostics):
    dataset = generate_prior_dominated_weak(seed=42)
    fit = fit_did_model(dataset, draws=400, tune=400, seed=42)
    sensitivity = run_prior_sensitivity(fit, draws=300, tune=300)
    assert sensitivity.passed is False
    diagnostics = dataclasses.replace(clean_diagnostics, prior_sensitivity=sensitivity)
    artifact = emit_proof_artifact(dataset=dataset, fit=fit, diagnostics=diagnostics)
    assert artifact["governance_state"]["state"] == "HOLD"
    assert artifact["governance_state"]["failing_diagnostics"] == ["prior_sensitivity"]


# --- Layer 2 continued: dataset/emitter-driven HOLDs (reusing the clean fit) --


def test_missing_windows_hold(clean_fit, clean_diagnostics):
    dataset = generate_missing_windows(seed=21)
    artifact = emit_proof_artifact(
        dataset=dataset, fit=clean_fit, diagnostics=clean_diagnostics
    )
    assert artifact["governance_state"]["state"] == "HOLD"
    assert artifact["governance_state"]["failing_diagnostics"] == [
        "missing_or_suppressed_windows"
    ]
    evidence = artifact["measurement_cell_window_evidence"]
    assert evidence["all_required_windows_observed"] is False
    assert evidence["missing_window_refs"] == ["mcw-d030"]


def test_suppressed_windows_hold_no_imputation_rescue(clean_fit, clean_diagnostics):
    dataset = generate_suppressed_windows(seed=22)
    artifact = emit_proof_artifact(
        dataset=dataset, fit=clean_fit, diagnostics=clean_diagnostics
    )
    assert artifact["governance_state"]["state"] == "HOLD"
    failing = artifact["governance_state"]["failing_diagnostics"]
    assert "missing_or_suppressed_windows" in failing
    # Suppression also breaks the comparison rubric's window criterion.
    assert "comparison_cohort_adequacy" in failing
    assert artifact["governance_state"]["evidence_tier_only"] is True
    assert (
        artifact["measurement_cell_window_evidence"]["all_windows_unsuppressed_and_fresh"]
        is False
    )


def test_mismatched_comparison_holds_evidence_tier_only(clean_fit, clean_diagnostics):
    dataset = generate_mismatched_comparison(seed=23)
    artifact = emit_proof_artifact(
        dataset=dataset, fit=clean_fit, diagnostics=clean_diagnostics
    )
    assert artifact["governance_state"]["state"] == "HOLD"
    assert artifact["governance_state"]["failing_diagnostics"] == [
        "comparison_cohort_adequacy"
    ]
    assert artifact["governance_state"]["evidence_tier_only"] is True
    assert (
        artifact["governance_state"]["comparison_supported_contribution_estimate_authorized"]
        is False
    )


def test_no_comparison_cohort_holds(clean_fit, clean_diagnostics):
    dataset = generate_no_comparison_cohort(seed=24)
    artifact = emit_proof_artifact(
        dataset=dataset, fit=clean_fit, diagnostics=clean_diagnostics
    )
    assert artifact["governance_state"]["state"] == "HOLD"
    assert "comparison_cohort_adequacy" in artifact["governance_state"]["failing_diagnostics"]
    assert artifact["comparison_adequacy"]["comparison_cohort_present"] is False
    assert artifact["governance_state"]["evidence_tier_only"] is True


def test_k4_below_schema_floor_holds(clean_fit, clean_diagnostics):
    dataset = generate_did_dataset(seed=25, k=4)
    artifact = emit_proof_artifact(
        dataset=dataset, fit=clean_fit, diagnostics=clean_diagnostics
    )
    assert artifact["governance_state"]["state"] == "HOLD"
    assert artifact["governance_state"]["failing_diagnostics"] == ["floor_check"]


def test_stated_floor_cross_validation_holds(clean_fit, clean_diagnostics):
    # k=8 passes the k>=5 schema floor but violates its own declared floor 10.
    dataset = generate_did_dataset(seed=26, k=8, declared_minimum_cohort_floor=10)
    artifact = emit_proof_artifact(
        dataset=dataset, fit=clean_fit, diagnostics=clean_diagnostics
    )
    assert artifact["governance_state"]["state"] == "HOLD"
    assert artifact["governance_state"]["failing_diagnostics"] == ["floor_check"]


def test_naive_repeated_peeking_holds(clean_dataset, clean_fit, clean_diagnostics):
    artifact = emit_proof_artifact(
        dataset=clean_dataset,
        fit=clean_fit,
        diagnostics=clean_diagnostics,
        repeated_evaluation_detected=True,
    )
    assert artifact["governance_state"]["state"] == "HOLD"
    assert artifact["governance_state"]["failing_diagnostics"] == ["peeking_control"]
    assert artifact["peeking_control"]["pass"] is False


def test_unsupported_likelihood_family_holds(clean_dataset, clean_fit, clean_diagnostics):
    artifact = emit_proof_artifact(
        dataset=clean_dataset,
        fit=clean_fit,
        diagnostics=clean_diagnostics,
        requested_likelihood_family="poisson_count_aggregate",
    )
    assert artifact["governance_state"]["state"] == "HOLD"
    assert artifact["governance_state"]["failing_diagnostics"] == [
        "unsupported_likelihood_family"
    ]
    # The artifact names the family (with its structural link) in the binding.
    assert artifact["model_spec_binding"]["likelihood_family"] == "poisson_count_aggregate"
    assert artifact["model_spec_binding"]["link_function"] == "log"


def test_failing_calibration_inputs_hold(clean_dataset, clean_fit, clean_diagnostics):
    from fluencytracr_inference.artifact import phase_b1_fixture_calibration_scenarios

    scenarios = phase_b1_fixture_calibration_scenarios()
    scenarios[0]["coverage_rate"] = 0.6  # outside [0.74, 0.86]
    scenarios[0]["coverage_standard_error"] = (0.6 * 0.4 / 200) ** 0.5
    scenarios[0]["pass"] = False
    artifact = emit_proof_artifact(
        dataset=clean_dataset,
        fit=clean_fit,
        diagnostics=clean_diagnostics,
        calibration_scenarios=scenarios,
    )
    assert artifact["governance_state"]["state"] == "HOLD"
    assert artifact["governance_state"]["failing_diagnostics"] == ["calibration_coverage"]


def test_failing_null_checks_hold(clean_dataset, clean_fit, clean_diagnostics):
    artifact = emit_proof_artifact(
        dataset=clean_dataset,
        fit=clean_fit,
        diagnostics=clean_diagnostics,
        null_checks={
            "null_effect_scenario_count": 200,
            "false_eligibility_rate": 0.12,  # > 0.05 bound
            "pass": False,
        },
    )
    assert artifact["governance_state"]["state"] == "HOLD"
    assert artifact["governance_state"]["failing_diagnostics"] == ["null_false_eligibility"]


def test_hold_artifacts_still_carry_valid_self_hash(clean_fit, clean_diagnostics):
    dataset = generate_missing_windows(seed=27)
    artifact = emit_proof_artifact(
        dataset=dataset, fit=clean_fit, diagnostics=clean_diagnostics
    )
    assert artifact["hash_bindings"]["artifact_self_hash"] == (
        inference_proof_artifact_self_hash(artifact)
    )
