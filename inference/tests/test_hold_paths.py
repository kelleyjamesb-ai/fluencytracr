"""Fail-closed behavior: each gate individually forced to fail => HOLD.

Two layers:

1. Pure gate-evaluator unit tests — a passing diagnostics baseline with one
   value pushed over its gate must name exactly that failing diagnostic.
2. Integration tests — real datasets / real (small) fits that violate a gate
   must emit HOLD artifacts naming the right diagnostic from the schema
   vocabulary.
"""

import dataclasses
from types import SimpleNamespace

import pytest

from fluencytracr_inference.artifact import (
    canonical_floor_checks,
    emit_proof_artifact,
    phase_b1_fixture_calibration_scenarios,
    phase_b1_fixture_floor_checks,
    phase_b1_fixture_null_checks,
)
from fluencytracr_inference.calibration import control_study_inputs
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
from fluencytracr_inference import diagnostics as diagnostics_module
from fluencytracr_inference.hashing import inference_proof_artifact_self_hash
from fluencytracr_inference.model import HoldViolation, fit_did_model
from fluencytracr_inference.synthetic import (
    WindowEvidenceDeclaration,
    generate_did_dataset,
    generate_mismatched_comparison,
    generate_missing_windows,
    generate_no_comparison_cohort,
    generate_prior_dominated_weak,
    generate_suppressed_windows,
    generate_violated_pre_trend,
    with_scenario,
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


def _study_inputs() -> dict:
    calibration_scenarios, null_checks = control_study_inputs()
    return {
        "calibration_scenarios": calibration_scenarios,
        "null_checks": null_checks,
        "floor_checks": canonical_floor_checks(),
    }


def _fit_for_dataset(clean_fit, dataset):
    return dataclasses.replace(
        clean_fit,
        dataset=dataset,
        synthetic_input_hash=dataset.synthetic_input_hash(),
    )


def _emit_with_study_inputs(*, dataset, fit, diagnostics, **overrides):
    values = _study_inputs()
    values.update(overrides)
    return emit_proof_artifact(
        dataset=dataset,
        fit=fit,
        diagnostics=diagnostics,
        **values,
    )


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


@pytest.mark.parametrize(
    "overrides, expected",
    [
        ({"r_hat": float("nan")}, "r_hat"),
        ({"bulk_ess": float("nan")}, "bulk_ess"),
        ({"tail_ess": float("inf")}, "tail_ess"),
        ({"posterior_mean_mcse": float("nan")}, "mcse"),
        ({"interval_endpoint_mcse": float("inf")}, "mcse"),
        ({"posterior_sd": float("nan")}, "mcse"),
    ],
)
def test_non_finite_parameter_diagnostics_hold(overrides, expected):
    assert evaluate_gates(_with_parameter(**overrides)) == [expected]


@pytest.mark.parametrize(
    "sampler_overrides, expected",
    [
        ({"max_treedepth_saturation_rate": float("nan")}, "max_treedepth_saturation"),
        ({"energy_bfmi_min": float("nan")}, "energy_bfmi"),
    ],
)
def test_non_finite_sampler_summary_diagnostics_hold(sampler_overrides, expected):
    assert evaluate_gates(_with_sampler(**sampler_overrides)) == [expected]


def test_non_finite_ppc_prior_and_pretrend_diagnostics_hold():
    ppc = list(_passing_ppc())
    ppc[0] = dataclasses.replace(ppc[0], p_value=float("nan"))
    assert evaluate_gates(_passing_diagnostics(posterior_predictive_checks=tuple(ppc))) == [
        "posterior_predictive_check"
    ]

    sensitivity = dataclasses.replace(
        _passing_diagnostics().prior_sensitivity,
        posterior_mean_shift_in_posterior_sd=float("nan"),
    )
    assert evaluate_gates(_passing_diagnostics(prior_sensitivity=sensitivity)) == [
        "prior_sensitivity"
    ]

    pre_trend = PreTrendResult(
        ci80_lower=float("nan"),
        ci80_upper=0.1,
        includes_zero=True,
        passed=True,
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


def test_sampler_diagnostics_derive_tree_depth_and_accept_bfmi_array(monkeypatch, clean_fit):
    class FakeGroup:
        def __init__(self, values):
            self._values = values
            self.data_vars = set(values)

        def __getitem__(self, key):
            return self._values[key]

    class FakeBfmiDataTree:
        data_vars = {"energy"}

        def __array__(self, *_args, **_kwargs):
            raise TypeError("DataTree cannot be coerced directly")

        def __getitem__(self, key):
            assert key == "energy"
            return SimpleNamespace(values=[[0.92, 0.88]])

        def to_array(self):
            raise AssertionError("energy variable must be selected before to_array")

    parameter = INFERENCE_PROOF_ESTIMAND_PARAMETER_NAME
    posterior = FakeGroup({parameter: clean_fit.estimand_draws[:, :4]})
    sample_stats = FakeGroup(
        {
            "diverging": [[0, 0, 0, 0], [0, 0, 0, 0]],
            "tree_depth": [[12, 11, 12, 10], [9, 12, 11, 12]],
            "energy": [[0.1, 0.2, 0.3, 0.4], [0.2, 0.3, 0.4, 0.5]],
        }
    )
    fit = dataclasses.replace(
        clean_fit,
        idata=SimpleNamespace(posterior=posterior, sample_stats=sample_stats),
        max_treedepth=12,
    )

    def scalar_tree(*_args, **_kwargs):
        return FakeGroup({parameter: [1.001]})

    def ess_tree(*_args, **_kwargs):
        return FakeGroup({parameter: [1200.0]})

    def mcse_tree(*_args, **_kwargs):
        return FakeGroup({parameter: [0.001]})

    monkeypatch.setattr(diagnostics_module.az, "rhat", scalar_tree)
    monkeypatch.setattr(diagnostics_module.az, "ess", ess_tree)
    monkeypatch.setattr(diagnostics_module.az, "mcse", mcse_tree)
    monkeypatch.setattr(diagnostics_module.az, "bfmi", lambda _idata: FakeBfmiDataTree())

    sampler = diagnostics_module.compute_sampler_diagnostics(fit)
    assert sampler.max_treedepth_saturation_rate == 0.5
    assert sampler.max_treedepth_warning is True
    assert sampler.energy_bfmi_min == 0.88

    summary = diagnostics_module.rank_and_energy_summaries(fit)
    assert summary["energy_plot"]["per_chain_bfmi"] == [0.92, 0.88]


def test_violated_pre_trend_holds(clean_fit, clean_diagnostics):
    dataset = generate_violated_pre_trend(seed=43, k=12)
    pre_trend = run_pre_trend_check(dataset, draws=300, tune=300, seed=43)
    assert pre_trend.includes_zero is False
    diagnostics = dataclasses.replace(clean_diagnostics, pre_trend=pre_trend)
    artifact = _emit_with_study_inputs(
        dataset=dataset,
        fit=_fit_for_dataset(clean_fit, dataset),
        diagnostics=diagnostics,
    )
    assert artifact["governance_state"]["state"] == "HOLD"
    assert artifact["governance_state"]["failing_diagnostics"] == ["pre_trend"]


def test_insufficient_pre_periods_become_pretrend_hold():
    dataset = generate_did_dataset(seed=44, k=6, pre_windows_per_cohort=1)
    pre_trend = run_pre_trend_check(dataset, draws=20, tune=20, seed=44)
    assert pre_trend.passed is False
    assert pre_trend.includes_zero is False
    assert pre_trend.ci80_lower == 1.0
    assert pre_trend.ci80_upper == 1.0


def test_prior_dominated_weak_data_holds(clean_diagnostics):
    dataset = generate_prior_dominated_weak(seed=42)
    fit = fit_did_model(dataset, draws=400, tune=400, seed=42)
    sensitivity = run_prior_sensitivity(fit, draws=300, tune=300)
    assert sensitivity.passed is False
    diagnostics = dataclasses.replace(clean_diagnostics, prior_sensitivity=sensitivity)
    artifact = _emit_with_study_inputs(dataset=dataset, fit=fit, diagnostics=diagnostics)
    assert artifact["governance_state"]["state"] == "HOLD"
    assert artifact["governance_state"]["failing_diagnostics"] == ["prior_sensitivity"]


# --- Layer 2 continued: dataset/emitter-driven HOLDs (reusing the clean fit) --


def test_missing_windows_hold(clean_fit, clean_diagnostics):
    dataset = generate_missing_windows(seed=21)
    artifact = _emit_with_study_inputs(
        dataset=dataset,
        fit=_fit_for_dataset(clean_fit, dataset),
        diagnostics=clean_diagnostics,
    )
    assert artifact["governance_state"]["state"] == "HOLD"
    assert artifact["governance_state"]["failing_diagnostics"] == [
        "missing_or_suppressed_windows"
    ]
    evidence = artifact["measurement_cell_window_evidence"]
    assert evidence["all_required_windows_observed"] is False
    assert evidence["missing_window_refs"] == ["mcw-d030"]


def test_extra_observed_window_outside_fixed_horizon_holds(clean_fit, clean_diagnostics):
    dataset = generate_did_dataset(
        seed=28,
        k=16,
        window_evidence=WindowEvidenceDeclaration(
            required_milestone_days=(30,),
            observed_milestone_days=(30, 60),
        ),
    )
    artifact = _emit_with_study_inputs(
        dataset=dataset,
        fit=_fit_for_dataset(clean_fit, dataset),
        diagnostics=clean_diagnostics,
    )
    assert artifact["governance_state"]["state"] == "HOLD"
    assert artifact["governance_state"]["failing_diagnostics"] == ["peeking_control"]


def test_suppressed_windows_hold_no_imputation_rescue(clean_fit, clean_diagnostics):
    dataset = generate_suppressed_windows(seed=22)
    artifact = _emit_with_study_inputs(
        dataset=dataset,
        fit=_fit_for_dataset(clean_fit, dataset),
        diagnostics=clean_diagnostics,
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
    artifact = _emit_with_study_inputs(
        dataset=dataset,
        fit=_fit_for_dataset(clean_fit, dataset),
        diagnostics=clean_diagnostics,
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
    artifact = _emit_with_study_inputs(
        dataset=dataset,
        fit=_fit_for_dataset(clean_fit, dataset),
        diagnostics=clean_diagnostics,
    )
    assert artifact["governance_state"]["state"] == "HOLD"
    assert "comparison_cohort_adequacy" in artifact["governance_state"]["failing_diagnostics"]
    assert artifact["comparison_adequacy"]["comparison_cohort_present"] is False
    assert artifact["governance_state"]["evidence_tier_only"] is True


def test_k4_below_schema_floor_holds(clean_fit, clean_diagnostics):
    dataset = generate_did_dataset(seed=25, k=4)
    artifact = _emit_with_study_inputs(
        dataset=dataset,
        fit=_fit_for_dataset(clean_fit, dataset),
        diagnostics=clean_diagnostics,
    )
    assert artifact["governance_state"]["state"] == "HOLD"
    assert artifact["governance_state"]["failing_diagnostics"] == ["floor_check"]


def test_stated_floor_cross_validation_holds(clean_fit, clean_diagnostics):
    # k=8 passes the k>=5 schema floor but violates its own declared floor 10.
    dataset = generate_did_dataset(seed=26, k=8, declared_minimum_cohort_floor=10)
    artifact = _emit_with_study_inputs(
        dataset=dataset,
        fit=_fit_for_dataset(clean_fit, dataset),
        diagnostics=clean_diagnostics,
    )
    assert artifact["governance_state"]["state"] == "HOLD"
    assert artifact["governance_state"]["failing_diagnostics"] == ["floor_check"]


def test_naive_repeated_peeking_holds(clean_dataset, clean_fit, clean_diagnostics):
    artifact = _emit_with_study_inputs(
        dataset=clean_dataset,
        fit=clean_fit,
        diagnostics=clean_diagnostics,
        repeated_evaluation_detected=True,
    )
    assert artifact["governance_state"]["state"] == "HOLD"
    assert artifact["governance_state"]["failing_diagnostics"] == ["peeking_control"]
    assert artifact["peeking_control"]["repeated_evaluation"] is True
    assert artifact["peeking_control"]["pass"] is False


def test_unsupported_likelihood_family_holds(clean_dataset, clean_fit, clean_diagnostics):
    artifact = _emit_with_study_inputs(
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


def test_missing_study_level_inputs_hold(clean_dataset, clean_fit, clean_diagnostics):
    artifact = emit_proof_artifact(
        dataset=clean_dataset,
        fit=clean_fit,
        diagnostics=clean_diagnostics,
    )
    assert artifact["governance_state"]["state"] == "HOLD"
    assert artifact["governance_state"]["failing_diagnostics"] == [
        "calibration_coverage",
        "null_false_eligibility",
    ]


def test_full_cli_path_does_not_inject_fixture_study_inputs(monkeypatch):
    from fluencytracr_inference import __main__ as cli

    captured_kwargs = {}

    def fake_run_proof(dataset, **kwargs):
        captured_kwargs.update(kwargs)
        return (
            {
                "governance_state": {
                    "state": "HOLD",
                    "failing_diagnostics": [
                        "calibration_coverage",
                        "null_false_eligibility",
                    ],
                }
            },
            {},
        )

    monkeypatch.setattr(cli, "run_proof", fake_run_proof)

    artifact = cli._emit_full_mode("eligible", seed=20260706, generated_at="fixed")

    assert artifact["governance_state"]["state"] == "HOLD"
    assert "calibration_scenarios" not in captured_kwargs
    assert "null_checks" not in captured_kwargs
    assert "floor_checks" not in captured_kwargs
    assert captured_kwargs["repeated_evaluation_detected"] is False


def test_real_data_present_input_rejected_before_emission(
    clean_dataset, clean_fit, clean_diagnostics
):
    dataset = with_scenario(clean_dataset, real_data_present=True)
    with pytest.raises(ValueError, match="synthetic generators only"):
        _emit_with_study_inputs(
            dataset=dataset,
            fit=clean_fit,
            diagnostics=clean_diagnostics,
        )


def test_emit_rejects_fit_dataset_hash_mismatch(clean_fit, clean_diagnostics):
    dataset = generate_did_dataset(seed=20260707, k=16, injected_effect_sd=0.5)
    with pytest.raises(ValueError, match="same synthetic input hash"):
        _emit_with_study_inputs(
            dataset=dataset,
            fit=clean_fit,
            diagnostics=clean_diagnostics,
        )


def test_failing_calibration_inputs_hold(clean_dataset, clean_fit, clean_diagnostics):
    from fluencytracr_inference.artifact import phase_b1_fixture_calibration_scenarios

    scenarios = phase_b1_fixture_calibration_scenarios()
    scenarios[0]["coverage_rate"] = 0.6  # outside [0.74, 0.86]
    scenarios[0]["coverage_standard_error"] = (0.6 * 0.4 / 200) ** 0.5
    scenarios[0]["pass"] = False
    artifact = _emit_with_study_inputs(
        dataset=clean_dataset,
        fit=clean_fit,
        diagnostics=clean_diagnostics,
        calibration_scenarios=scenarios,
    )
    assert artifact["governance_state"]["state"] == "HOLD"
    assert artifact["governance_state"]["failing_diagnostics"] == ["calibration_coverage"]


def test_incomplete_study_inputs_hold(clean_dataset, clean_fit, clean_diagnostics):
    scenarios = phase_b1_fixture_calibration_scenarios()[:1]
    artifact = _emit_with_study_inputs(
        dataset=clean_dataset,
        fit=clean_fit,
        diagnostics=clean_diagnostics,
        calibration_scenarios=scenarios,
    )

    assert artifact["governance_state"]["state"] == "HOLD"
    assert artifact["governance_state"]["failing_diagnostics"] == ["calibration_coverage"]
    assert (
        artifact["governance_state"]["comparison_supported_contribution_estimate_authorized"]
        is False
    )


def test_phase_b1_fixture_study_inputs_do_not_authorize_eligibility(
    clean_dataset, clean_fit, clean_diagnostics
):
    artifact = emit_proof_artifact(
        dataset=clean_dataset,
        fit=clean_fit,
        diagnostics=clean_diagnostics,
        calibration_scenarios=phase_b1_fixture_calibration_scenarios(),
        null_checks=phase_b1_fixture_null_checks(),
        floor_checks=phase_b1_fixture_floor_checks(),
    )

    assert artifact["governance_state"]["state"] == "HOLD"
    assert artifact["governance_state"]["failing_diagnostics"] == [
        "calibration_coverage",
        "null_false_eligibility",
    ]


def test_failing_null_checks_hold(clean_dataset, clean_fit, clean_diagnostics):
    artifact = _emit_with_study_inputs(
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
    artifact = _emit_with_study_inputs(
        dataset=dataset,
        fit=_fit_for_dataset(clean_fit, dataset),
        diagnostics=clean_diagnostics,
    )
    assert artifact["hash_bindings"]["artifact_self_hash"] == (
        inference_proof_artifact_self_hash(artifact)
    )
