"""Guard: the Python constants module mirrors the TS contract exactly.

The normative source is ``packages/confidence-engine/src/confidenceModel.ts``.
This test pins the Python mirror against a checked-in copy of the TS values
so an accidental edit on either side fails loudly. A Node cross-check test
(reading the TS constants directly) lands in Phase B3 with the round-trip
bridge (task 3.5).
"""

from fluencytracr_inference import constants

# Checked-in copy of the TS constants (confidenceModel.ts).
EXPECTED_TS_CONSTANTS = {
    "INFERENCE_PROOF_ARTIFACT_SCHEMA_VERSION": (
        "FT_AI_VALUE_CONFIDENCE_INFERENCE_PROOF_ARTIFACT_2026_07"
    ),
    "INFERENCE_PROOF_RHAT_MAX": 1.01,
    "INFERENCE_PROOF_ESS_MIN": 400,
    "INFERENCE_PROOF_PPC_P_VALUE_MIN": 0.05,
    "INFERENCE_PROOF_PPC_P_VALUE_MAX": 0.95,
    "INFERENCE_PROOF_PRIOR_SENSITIVITY_MAX_POSTERIOR_SD": 0.5,
    "INFERENCE_PROOF_CALIBRATION_COVERAGE_MIN": 0.74,
    "INFERENCE_PROOF_CALIBRATION_COVERAGE_MAX": 0.86,
    "INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN": 200,
    "INFERENCE_PROOF_NULL_FALSE_ELIGIBILITY_MAX": 0.05,
    "INFERENCE_PROOF_MCSE_TO_POSTERIOR_SD_RATIO_MAX": 0.1,
    "INFERENCE_PROOF_FLOAT_TOLERANCE": 1e-12,
    "CONFIDENCE_MODEL_MINIMUM_COHORT_FLOOR": 5,
    "CONFIDENCE_SERIES_READ_PATH_COHORT_FLOOR": 10,
    "CONFIDENCE_OBSERVATION_MILESTONE_DAYS": (0, 30, 60, 90, 180, 365),
    "INFERENCE_PROOF_ESTIMAND_PARAMETER_NAME": "contribution_alignment_effect",
}

EXPECTED_BLOCKED_USES = (
    "model_output",
    "confidence_output",
    "probability_output",
    "score_like_output",
    "finance_output",
    "roi_output",
    "causality_claim",
    "productivity_claim",
    "customer_facing_output",
    "backend_route",
    "frontend_ui",
    "export_creation",
    "rendered_readout",
    "persistence_write",
    "live_connector_execution",
)

EXPECTED_FAILING_DIAGNOSTICS = (
    "r_hat",
    "bulk_ess",
    "tail_ess",
    "divergences",
    "max_treedepth_saturation",
    "energy_bfmi",
    "sampler_diagnostic",
    "mcse",
    "unsupported_likelihood_family",
    "posterior_predictive_check",
    "prior_sensitivity",
    "pre_trend",
    "calibration_coverage",
    "null_false_eligibility",
    "floor_check",
    "peeking_control",
    "comparison_cohort_adequacy",
    "missing_or_suppressed_windows",
)

EXPECTED_COMPARISON_CRITERIA = (
    "same_selected_metric_definition",
    "aligned_milestone_windows",
    "same_metric_direction",
    "approved_lag_handling",
    "same_expectation_path_and_context",
    "similar_pre_period_level_trend",
    "no_contamination",
    "adequate_aggregate_floors",
    "no_suppressed_or_stale_windows",
)

EXPECTED_PPC_STATISTICS = (
    "pre_post_mean_movement",
    "between_cohort_variance",
    "within_cohort_variance",
    "tail_or_extreme_cell_statistic",
    "difference_in_differences_contrast",
)


def test_scalar_constants_mirror_ts_contract():
    for name, expected in EXPECTED_TS_CONSTANTS.items():
        assert getattr(constants, name) == expected, name


def test_blocked_uses_order_pinned():
    assert constants.CONFIDENCE_MODEL_BLOCKED_USES == EXPECTED_BLOCKED_USES


def test_failing_diagnostic_vocabulary_order_pinned():
    assert constants.INFERENCE_PROOF_FAILING_DIAGNOSTICS == EXPECTED_FAILING_DIAGNOSTICS


def test_comparison_criteria_order_pinned():
    assert (
        constants.INFERENCE_PROOF_COMPARISON_COHORT_CRITERIA == EXPECTED_COMPARISON_CRITERIA
    )


def test_ppc_statistic_names_order_pinned():
    assert constants.INFERENCE_PROOF_PPC_STATISTIC_NAMES == EXPECTED_PPC_STATISTICS


def test_likelihood_family_links():
    assert constants.SUPPORTED_LIKELIHOOD_FAMILY == "normal_continuous_aggregate"
    assert constants.LIKELIHOOD_FAMILY_LINKS == {
        "normal_continuous_aggregate": "identity",
        "binomial_rate_aggregate": "logit",
        "beta_binomial_rate_aggregate": "logit",
        "poisson_count_aggregate": "log",
        "negative_binomial_count_aggregate": "log",
    }
