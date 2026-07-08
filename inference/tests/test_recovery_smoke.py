"""Recovery smoke: inject 0.5 SD, k=16 — every gate passes, artifact eligible.

Uses the session-scoped clean run from ``conftest.py`` (one full pipeline:
seeded NUTS main fit, posterior predictive checks, prior-sensitivity refits
under the declared family, pre-trend pseudo fit, artifact emission).
"""

import numpy as np

from fluencytracr_inference.constants import (
    INFERENCE_PROOF_ESS_MIN,
    INFERENCE_PROOF_ESTIMAND_PARAMETER_NAME,
    INFERENCE_PROOF_MCSE_TO_POSTERIOR_SD_RATIO_MAX,
    INFERENCE_PROOF_PPC_P_VALUE_MAX,
    INFERENCE_PROOF_PPC_P_VALUE_MIN,
    INFERENCE_PROOF_PRIOR_SENSITIVITY_MAX_POSTERIOR_SD,
    INFERENCE_PROOF_RHAT_MAX,
)
from fluencytracr_inference.diagnostics import evaluate_gates
from fluencytracr_inference.synthetic import GROUPINGS

from conftest import RECOVERY_INJECTED_EFFECT_SD

RECOVERY_TOLERANCE_SD = 0.15


def test_estimand_recovers_injected_effect(clean_fit):
    summary = clean_fit.estimand_summary()
    assert summary["parameter_name"] == INFERENCE_PROOF_ESTIMAND_PARAMETER_NAME
    assert abs(summary["posterior_mean"] - RECOVERY_INJECTED_EFFECT_SD) < RECOVERY_TOLERANCE_SD
    assert (
        summary["credible_interval_80"]["lower"]
        <= RECOVERY_INJECTED_EFFECT_SD
        <= summary["credible_interval_80"]["upper"]
    )


def test_every_sampler_gate_passes(clean_diagnostics):
    sampler = clean_diagnostics.sampler
    names = [p.parameter_name for p in sampler.parameters]
    assert INFERENCE_PROOF_ESTIMAND_PARAMETER_NAME in names
    for grouping in GROUPINGS:
        assert any(name.startswith(f"u_{grouping}[") for name in names)
    assert len(names) == len(set(names))
    for parameter in sampler.parameters:
        assert parameter.r_hat <= INFERENCE_PROOF_RHAT_MAX, parameter.parameter_name
        assert parameter.bulk_ess >= INFERENCE_PROOF_ESS_MIN, parameter.parameter_name
        assert parameter.tail_ess >= INFERENCE_PROOF_ESS_MIN, parameter.parameter_name
        assert (
            parameter.max_mcse_to_posterior_sd_ratio
            <= INFERENCE_PROOF_MCSE_TO_POSTERIOR_SD_RATIO_MAX
        ), parameter.parameter_name
    assert sampler.post_warmup_divergences == 0
    assert sampler.max_treedepth_saturation_rate == 0.0
    assert sampler.max_treedepth_warning is False
    assert sampler.energy_bfmi_warning is False


def test_ppc_p_values_in_band(clean_diagnostics):
    checks = clean_diagnostics.posterior_predictive_checks
    assert checks is not None and len(checks) == 5
    for statistic in checks:
        assert (
            INFERENCE_PROOF_PPC_P_VALUE_MIN
            <= statistic.p_value
            <= INFERENCE_PROOF_PPC_P_VALUE_MAX
        ), statistic.statistic_name
        assert statistic.passed


def test_prior_sensitivity_and_pre_trend_pass(clean_diagnostics):
    sensitivity = clean_diagnostics.prior_sensitivity
    assert sensitivity is not None
    assert sensitivity.documented
    assert sensitivity.justification_ref is not None
    assert sensitivity.justification_hash is not None
    # >= 3 prior scalings including base 1.0.
    assert len(sensitivity.scaling_means) >= 3
    assert (
        sensitivity.posterior_mean_shift_in_posterior_sd
        < INFERENCE_PROOF_PRIOR_SENSITIVITY_MAX_POSTERIOR_SD
    )

    pre_trend = clean_diagnostics.pre_trend
    assert pre_trend.includes_zero
    assert pre_trend.ci80_lower <= 0.0 <= pre_trend.ci80_upper


def test_no_gate_fails(clean_diagnostics):
    assert evaluate_gates(clean_diagnostics) == []


def test_eligible_artifact_emitted(eligible_artifact):
    governance = eligible_artifact["governance_state"]
    assert governance["state"] == "eligible_internal_only"
    assert governance["failing_diagnostics"] == []
    assert governance["comparison_supported_contribution_estimate_authorized"] is True
    assert governance["evidence_tier_only"] is False


def test_rank_and_energy_summaries_recorded(clean_diagnostics):
    report = clean_diagnostics.internal_report
    rank = report["rank_plot"]
    assert rank["parameter_name"] == INFERENCE_PROOF_ESTIMAND_PARAMETER_NAME
    # Uniform-ish rank histogram per chain, recorded as compact numbers.
    counts = np.asarray(rank["per_chain_counts"], dtype=float)
    assert counts.ndim == 2 and counts.shape[1] == rank["bins"]
    assert counts.sum() > 0
    energy = report["energy_plot"]
    assert len(energy["per_chain_bfmi"]) >= 2
    assert all(np.isfinite(energy["per_chain_energy_mean"]))
    # Pooling factors reported for all five groupings.
    assert set(report["pooling_factors"]) == {
        "expectation_path",
        "workflow",
        "function",
        "cohort",
        "organization",
    }


def test_seeded_fit_reproducible_in_process(clean_dataset):
    """Fixed seeds produce identical draws within the locked environment."""
    from fluencytracr_inference.model import fit_did_model

    fit_a = fit_did_model(clean_dataset, draws=120, tune=120, seed=99)
    fit_b = fit_did_model(clean_dataset, draws=120, tune=120, seed=99)
    assert np.array_equal(fit_a.estimand_draws, fit_b.estimand_draws)
