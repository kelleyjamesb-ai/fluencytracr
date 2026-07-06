"""Numeric gates and vocabularies mirrored from the TypeScript contract.

Every value here mirrors a constant or enum in
``packages/confidence-engine/src/confidenceModel.ts``
(``FT_AI_VALUE_CONFIDENCE_MODEL_CONTRACT_2026_07``). The TypeScript module is
the normative source; this module is a hardcoded mirror so the Python harness
computes against the same gates the TypeScript boundary re-validates. Each
constant names its TS counterpart in a comment. A Node cross-check test lands
in Phase B3 (task 3.5); until then ``tests/test_constants_mirror.py`` guards
the values against a checked-in copy.

Nothing here is runtime-tunable: revising a gate requires a contract change
(see ``docs/contracts/confidence-inference-methodology/README.md``).
"""

# --- Schema version -------------------------------------------------------
# TS: INFERENCE_PROOF_ARTIFACT_SCHEMA_VERSION
INFERENCE_PROOF_ARTIFACT_SCHEMA_VERSION = (
    "FT_AI_VALUE_CONFIDENCE_INFERENCE_PROOF_ARTIFACT_2026_07"
)

# --- Diagnostic gates ------------------------------------------------------
# TS: INFERENCE_PROOF_RHAT_MAX
INFERENCE_PROOF_RHAT_MAX = 1.01
# TS: INFERENCE_PROOF_ESS_MIN (chain-total bulk AND tail ESS per parameter)
INFERENCE_PROOF_ESS_MIN = 400
# TS: INFERENCE_PROOF_PPC_P_VALUE_MIN / INFERENCE_PROOF_PPC_P_VALUE_MAX
INFERENCE_PROOF_PPC_P_VALUE_MIN = 0.05
INFERENCE_PROOF_PPC_P_VALUE_MAX = 0.95
# TS: INFERENCE_PROOF_PRIOR_SENSITIVITY_MAX_POSTERIOR_SD (shift must be < this)
INFERENCE_PROOF_PRIOR_SENSITIVITY_MAX_POSTERIOR_SD = 0.5
# TS: INFERENCE_PROOF_CALIBRATION_COVERAGE_MIN / _MAX (80% CI coverage band)
INFERENCE_PROOF_CALIBRATION_COVERAGE_MIN = 0.74
INFERENCE_PROOF_CALIBRATION_COVERAGE_MAX = 0.86
# TS: INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN
INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN = 200
# TS: INFERENCE_PROOF_NULL_FALSE_ELIGIBILITY_MAX
INFERENCE_PROOF_NULL_FALSE_ELIGIBILITY_MAX = 0.05
# TS: INFERENCE_PROOF_MCSE_TO_POSTERIOR_SD_RATIO_MAX
INFERENCE_PROOF_MCSE_TO_POSTERIOR_SD_RATIO_MAX = 0.1
# TS: INFERENCE_PROOF_FLOAT_TOLERANCE
INFERENCE_PROOF_FLOAT_TOLERANCE = 1e-12

# --- Aggregate floors ------------------------------------------------------
# TS: CONFIDENCE_MODEL_MINIMUM_COHORT_FLOOR (k >= 5 schema floor)
CONFIDENCE_MODEL_MINIMUM_COHORT_FLOOR = 5
# TS: CONFIDENCE_SERIES_READ_PATH_COHORT_FLOOR (k >= 10 series display floor)
CONFIDENCE_SERIES_READ_PATH_COHORT_FLOOR = 10

# --- Milestone cadence -----------------------------------------------------
# TS: CONFIDENCE_OBSERVATION_MILESTONE_DAYS
CONFIDENCE_OBSERVATION_MILESTONE_DAYS = (0, 30, 60, 90, 180, 365)

# --- Estimand --------------------------------------------------------------
# TS: INFERENCE_PROOF_ESTIMAND_PARAMETER_NAME (module-private in TS; the
# sampler-diagnostics superRefine requires this parameter_name to be present)
INFERENCE_PROOF_ESTIMAND_PARAMETER_NAME = "contribution_alignment_effect"

# --- Blocked uses (order-pinned) -------------------------------------------
# TS: CONFIDENCE_MODEL_BLOCKED_USES — the artifact must carry this full list
# in exactly this order (OrderedConfidenceModelBlockedUsesSchema).
CONFIDENCE_MODEL_BLOCKED_USES = (
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

# --- Failing-diagnostic vocabulary -----------------------------------------
# TS: InferenceProofFailingDiagnosticSchema (declaration order preserved so
# emitted failing_diagnostics arrays are deterministic).
INFERENCE_PROOF_FAILING_DIAGNOSTICS = (
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

# --- Likelihood family vocabulary ------------------------------------------
# TS: InferenceProofLikelihoodFamilySchema
INFERENCE_PROOF_LIKELIHOOD_FAMILIES = (
    "normal_continuous_aggregate",
    "binomial_rate_aggregate",
    "beta_binomial_rate_aggregate",
    "poisson_count_aggregate",
    "negative_binomial_count_aggregate",
)
# Slice 2 implements only the normal continuous aggregate path (identity
# link); every other family HOLDS naming unsupported_likelihood_family.
SUPPORTED_LIKELIHOOD_FAMILY = "normal_continuous_aggregate"
# TS: InferenceProofModelSpecBindingSchema link enforcement.
LIKELIHOOD_FAMILY_LINKS = {
    "normal_continuous_aggregate": "identity",
    "binomial_rate_aggregate": "logit",
    "beta_binomial_rate_aggregate": "logit",
    "poisson_count_aggregate": "log",
    "negative_binomial_count_aggregate": "log",
}

# --- Comparison-cohort adequacy rubric (order-pinned) -----------------------
# TS: INFERENCE_PROOF_COMPARISON_COHORT_CRITERIA
INFERENCE_PROOF_COMPARISON_COHORT_CRITERIA = (
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

# --- Fixed PPC statistics (order-pinned) ------------------------------------
# TS: InferenceProofPpcStatisticSchema statistic_name enum.
INFERENCE_PROOF_PPC_STATISTIC_NAMES = (
    "pre_post_mean_movement",
    "between_cohort_variance",
    "within_cohort_variance",
    "tail_or_extreme_cell_statistic",
    "difference_in_differences_contrast",
)

# --- Backend warning threshold ----------------------------------------------
# PyMC/ArviZ warn on E-BFMI below 0.3; the contract requires backend warnings
# to surface as explicit failing diagnostics (energy_bfmi). This threshold is
# the backend's, not a TS constant.
ENERGY_BFMI_WARNING_THRESHOLD = 0.3
