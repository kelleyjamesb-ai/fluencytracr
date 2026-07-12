import { z } from "zod";
import { sha256Json } from "./internal/hashing";

export const LONGITUDINAL_SYNTHETIC_OUTCOME_PROOF_SCHEMA_VERSION_V1 =
  "FT_AI_VALUE_LONGITUDINAL_SYNTHETIC_OUTCOME_PROOF_2026_07";
export const LONGITUDINAL_SYNTHETIC_OUTCOME_PROOF_SCHEMA_VERSION_V2 =
  "FT_AI_VALUE_LONGITUDINAL_SYNTHETIC_OUTCOME_PROOF_2026_07_V2";
export const LONGITUDINAL_SYNTHETIC_OUTCOME_PROOF_SCHEMA_VERSION =
  LONGITUDINAL_SYNTHETIC_OUTCOME_PROOF_SCHEMA_VERSION_V2;

export const LONGITUDINAL_MODEL_FAMILY =
  "bayesian_ai_value_realization_and_human_transformation_model_family";

export const LONGITUDINAL_MODEL_SLICE = "first_longitudinal_synthetic_model_slice";
export const LONGITUDINAL_SYNTHETIC_GENERATOR_ID =
  "fluencytracr_inference.synthetic.longitudinal_outcome";
export const LONGITUDINAL_SYNTHETIC_GENERATOR_VERSION = "0.1.0";

const Sha256HexSchema = z.string().regex(/^[0-9a-f]{64}$/);
const COMPILED_VBD_MOVEMENT_SMOKE_FLOOR = 0.05;
const COMPILED_DIRECTIONAL_DRAW_SHARE_SMOKE_FLOOR = 0.6;
const COMPILED_MEANINGFUL_DRAW_SHARE_SMOKE_FLOOR = 0.8;
const COMPILED_SYNTHETIC_SMOKE_MINIMUM_MOVEMENT = 0.15;
const COMPILED_COMMON_SHOCK_SHIFT_GATE = 4;
const COMPILED_MAX_APPROVED_BUSINESS_CONTROLS = 4;
const COMPILED_EARLY_POST_SPIKE_PRE_SD_MULTIPLIER = 4;
const COMPILED_EARLY_POST_SPIKE_ABSOLUTE_FLOOR = 0.25;
const COMPILED_EVALUATION_MOVEMENT_PRE_SD_MULTIPLIER = 2;
const COMPILED_TEMPORARY_SPIKE_PRE_SD_MULTIPLIER = 3;
const COMPILED_TEMPORARY_SPIKE_ABSOLUTE_FLOOR = 0.25;
const COMPILED_TEMPORARY_PERSISTENCE_SLOPE_PRE_SD_MULTIPLIER = -0.5;
const COMPILED_BACKTEST_RMSE_PRE_SD_MULTIPLIER = 3;
const COMPILED_MAX_DESIGN_MATRIX_CONDITION_NUMBER = 1_000_000;
const COMPILED_MAX_VELOCITY_BREADTH_ABS_CORRELATION = 0.995;
const RFC3339_TIMESTAMP =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-](\d{2}):(\d{2}))$/;
const APPROVED_SYNTHETIC_CONTROL_SOURCE_REFS: Readonly<Record<string, string>> = {
  seasonality_index: "synthetic-control://seasonality",
  customer_demand_index: "synthetic-control://demand-index",
  campaign_index: "synthetic-control://campaign_index",
  policy_index: "synthetic-control://policy_index",
  volume_index: "synthetic-control://volume_index"
};
const V2_VBD_ROLE_COMMITMENTS = {
  velocity: "CONTEXT",
  breadth: "POSITIVE",
  depth: "PRIMARY_POSITIVE"
} as const;

const AIFluencyDimensions = [
  "overall_ai_fluency",
  "confidence",
  "usage_quality",
  "behavior_change",
  "leadership_reinforcement",
  "capability_growth"
] as const;

const EvidenceDesignSchema = z.enum([
  "CONTROLLED_TEST",
  "TWO_GROUP_PRE_POST_COMPARISON",
  "STAGGERED_ROLLOUT",
  "MATCHED_COMPARISON",
  "HISTORICAL_STATE_SPACE",
  "REPEATED_PRE_POST",
  "BASELINE_ONLY"
]);

export const LongitudinalFailingDiagnosticSchema = z.enum([
  "unsupported_likelihood_family",
  "real_data_not_authorized",
  "person_level_data_present",
  "unsafe_output_authorization",
  "insufficient_history",
  "missing_or_suppressed_windows",
  "missing_measurement_uncertainty",
  "design_matrix_identifiability",
  "residual_autocorrelation",
  "pre_period_fit",
  "pre_period_rolling_backtest",
  "placebo_intervention_date",
  "counterfactual_stability",
  "lag_sensitivity",
  "common_shock_sensitivity",
  "temporary_effect_persistence",
  "prior_sensitivity",
  "target_contamination",
  "unsupported_evidence_design",
  "unsupported_staggered_event_study",
  "baseline_only_no_contribution_confidence"
]);

const ForbiddenOutputFieldNames = [
  "customer_confidence",
  "impact_probability",
  "causal_effect",
  "productivity_delta",
  "roi",
  "ebita",
  "ebitda",
  "creates_route",
  "writes_persistence",
  "creates_export",
  "renders_readout"
] as const;

const forbiddenKeyPatterns = [
  /^raw_rows?$/i,
  /^rows$/i,
  /^records$/i,
  /^responses?$/i,
  /^answers?$/i,
  /raw_(?:survey|answer|answers|response|responses|row|rows|text|prompt|prompts|output|outputs|transcript|content|file)/i,
  /free_text/i,
  /prompt/i,
  /transcript/i,
  /query_text/i,
  /sql_text/i,
  /email/i,
  /user_id/i,
  /employee_id/i,
  /employee_email/i,
  /employee_name/i,
  /respondent_email/i,
  /respondent_id/i,
  /session_id/i,
  /person_id/i,
  /person_identifier/i,
  /(?:user|person|employee|respondent|session)_hash/i,
  /hashed_email/i,
  /hashed_(?:user|person|employee|respondent)_id/i,
  /joinable_(?:user|person|employee|respondent)_identifier/i,
  /hris/i,
  /manager/i,
  /compensation/i,
  /performance/i,
  /productivity/i,
  /^confidence_percentage$/i,
  /^probability$/i,
  /^roi$/i,
  /^ebita$/i,
  /^ebitda$/i,
  /financial_attribution/i,
  /^customer_facing_financial_output$/i
];

const unsafeValuePatterns = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b\d{3}[-_. ]\d{2}[-_. ]\d{4}\b/,
  /\b(?:\+?1[-. ]?)?\(?\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b/,
  /\b(?:respondent|employee|user|person|session)(?:[_:/-](?:id[_:/-]?)?)?[0-9a-f]{3,}\b/i,
  /\bssn\b/i,
  /social[_ -]?security/i,
  /\bemail\b/i,
  /\b(?:phone|telephone|mobile)\b/i,
  /date[_ -]?of[_ -]?birth/i,
  /birth[_ -]?date/i,
  /(?:first|last|full)[_ -]?name/i,
  /\baddress\b/i,
  /\b(?:confidence\s*(?:percentage|percent)|probability|impact\s*probability)\b/i,
  /\b(?:roi|ebita|ebitda|financial attribution|customer-facing financial output)\b/i,
  /\b(?:hris|manager ranking|team ranking|department ranking|employee productivity|performance review|compensation)\b/i,
  /hris/i,
  /manager/i,
  /employee/i,
  /respondent/i,
  /personnel/i,
  /level/i,
  /tenure/i,
  /compensation/i,
  /performance/i,
  /productivity/i
];

const unsafeControlPatterns = [
  /hris/i,
  /manager/i,
  /employee/i,
  /person/i,
  /user/i,
  /respondent/i,
  /level/i,
  /tenure/i,
  /compensation/i,
  /performance/i,
  /productivity/i,
  /ssn/i,
  /social[_ -]?security/i,
  /email/i,
  /phone/i,
  /telephone/i,
  /mobile/i,
  /(?:first|last|full)[_ -]?name/i,
  /address/i
];

function normalizeKey(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function isValidRfc3339Timestamp(value: string): boolean {
  const match = RFC3339_TIMESTAMP.exec(value);
  if (!match) return false;
  const [
    ,
    yearValue,
    monthValue,
    dayValue,
    hourValue,
    minuteValue,
    secondValue,
    offsetHourValue,
    offsetMinuteValue
  ] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const hour = Number(hourValue);
  const minute = Number(minuteValue);
  const second = Number(secondValue);
  const offsetHour = offsetHourValue === undefined ? 0 : Number(offsetHourValue);
  const offsetMinute = offsetMinuteValue === undefined ? 0 : Number(offsetMinuteValue);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysByMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return (
    year >= 1 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysByMonth[month - 1] &&
    hour <= 23 &&
    minute <= 59 &&
    second <= 59 &&
    offsetHour <= 23 &&
    offsetMinute <= 59
  );
}

function collectForbiddenFields(
  value: unknown,
  fields: string[] = [],
  path: string[] = []
): string[] {
  if (!value || typeof value !== "object") return fields;
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectForbiddenFields(item, fields, [...path, String(index)]));
    return fields;
  }
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const normalized = normalizeKey(key);
    const currentPath = [...path, key];
    const isAllowedFalsePin =
      nested === false &&
      (currentPath.includes("blocked_outputs") ||
        currentPath.includes("governance_state") ||
        currentPath.some((part) => normalizeKey(part) === "synthetic_generator") ||
        [
          "customer_output_authorized",
          "probability_output_authorized",
          "confidence_output_authorized",
          "roi_output_authorized",
          "finance_output_authorized",
          "causality_output_authorized",
          "productivity_output_authorized",
          "full_pathway_coherence_authorized",
          "promotion_decision_ref",
          "hris_or_personnel_fields_present",
          "customer_facing_claim_authorized",
          "causal_claim_authorized",
          "financial_claim_authorized",
          "synthetic_smoke_only",
          "replicated_calibration_complete"
        ].includes(normalized));
    if (
      !isAllowedFalsePin &&
      forbiddenKeyPatterns.some((pattern) => pattern.test(key) || pattern.test(normalized))
    ) {
      fields.push(currentPath.join("."));
    }
    collectForbiddenFields(nested, fields, currentPath);
  }
  return fields;
}

function collectUnsafeValues(
  value: unknown,
  values: string[] = [],
  path: string[] = []
): string[] {
  if (typeof value === "string") {
    if (
      value === "person_level_data_present" &&
      path.some((part) => normalizeKey(part) === "failing_diagnostics")
    ) {
      return values;
    }
    if (unsafeValuePatterns.some((pattern) => pattern.test(value))) values.push(value);
    return values;
  }
  if (!value || typeof value !== "object") return values;
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectUnsafeValues(item, values, [...path, String(index)]));
    return values;
  }
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    collectUnsafeValues(nested, values, [...path, key]);
  }
  return values;
}

export function longitudinalSyntheticOutcomeProofSelfHashBody(artifact: unknown): unknown {
  const clone = JSON.parse(JSON.stringify(artifact)) as {
    hash_bindings?: Record<string, unknown>;
  };
  if (clone.hash_bindings && typeof clone.hash_bindings === "object") {
    delete clone.hash_bindings.artifact_self_hash;
  }
  return clone;
}

export function longitudinalSyntheticOutcomeProofSelfHash(artifact: unknown): string {
  return sha256Json(longitudinalSyntheticOutcomeProofSelfHashBody(artifact));
}

export function longitudinalSyntheticOutcomeProofPayloadHashBody(artifact: unknown): unknown {
  const clone = JSON.parse(JSON.stringify(artifact)) as {
    hash_bindings?: Record<string, unknown>;
  };
  delete clone.hash_bindings;
  return clone;
}

export function longitudinalSyntheticOutcomeProofPayloadHash(artifact: unknown): string {
  return sha256Json(longitudinalSyntheticOutcomeProofPayloadHashBody(artifact));
}

export function longitudinalSyntheticOutcomeProofInputEvidenceHashBody(
  artifact: unknown
): unknown {
  const value = artifact as {
    design_route: unknown;
    hypothesis_binding: unknown;
    primary_metric_binding: unknown;
    baseline_and_post_window_evidence: unknown;
    ai_fluency_snapshot_evidence: unknown;
    vbd_exposure_evidence: unknown;
    business_control_evidence: unknown;
    model_input_governance: unknown;
    synthetic_generator: {
      generator_id: unknown;
      generator_version: unknown;
      seed: unknown;
      real_data_present: unknown;
      customer_data_present: unknown;
      production_data_present: unknown;
      live_data_source_present: unknown;
    };
    source_hashes: unknown;
    diagnostics: {
      fit_summary_hash: unknown;
      failing_diagnostics: unknown;
      pre_fit_design_matrix_check?: unknown;
    };
  };
  const diagnostics = value.diagnostics;
  const generator = value.synthetic_generator;
  const noFit = diagnostics.fit_summary_hash === null;
  return {
    design_route: value.design_route,
    hypothesis_binding: value.hypothesis_binding,
    primary_metric_binding: value.primary_metric_binding,
    baseline_and_post_window_evidence: value.baseline_and_post_window_evidence,
    ai_fluency_snapshot_evidence: value.ai_fluency_snapshot_evidence,
    vbd_exposure_evidence: value.vbd_exposure_evidence,
    business_control_evidence: value.business_control_evidence,
    model_input_governance: value.model_input_governance,
    synthetic_generator: {
      generator_id: generator.generator_id,
      generator_version: generator.generator_version,
      seed: generator.seed,
      real_data_present: generator.real_data_present,
      customer_data_present: generator.customer_data_present,
      production_data_present: generator.production_data_present,
      live_data_source_present: generator.live_data_source_present
    },
    source_hashes: value.source_hashes,
    no_fit_evidence: noFit
      ? {
          failing_diagnostics: diagnostics.failing_diagnostics,
          pre_fit_design_matrix_check: diagnostics.pre_fit_design_matrix_check
        }
      : null
  };
}

export function longitudinalSyntheticOutcomeProofInputEvidenceHash(
  artifact: unknown
): string {
  return sha256Json(longitudinalSyntheticOutcomeProofInputEvidenceHashBody(artifact));
}

export function longitudinalSyntheticOutcomeProofDiagnosticsEvidenceHash(
  diagnostics: unknown
): string {
  const clone = JSON.parse(JSON.stringify(diagnostics)) as Record<string, unknown>;
  delete clone.fit_summary_hash;
  return sha256Json(clone);
}

export function longitudinalSyntheticOutcomeProofFitOutputEvidenceHash(
  artifact: unknown
): string {
  const value = artifact as {
    posterior_estimand_summary: unknown;
    model_specification: { analytic_posterior_draw_count: unknown };
    behavior_outcome_pathway_evidence: unknown;
  };
  return sha256Json({
    posterior_estimand_summary: value.posterior_estimand_summary,
    model_fit_outputs: {
      analytic_posterior_draw_count:
        value.model_specification.analytic_posterior_draw_count
    },
    behavior_outcome_pathway_evidence:
      value.behavior_outcome_pathway_evidence
  });
}

const RouteSchema = z
  .object({
    evidence_design: EvidenceDesignSchema,
    decision: z.string().min(1),
    module: z.string().min(1).nullable(),
    claim_cap: z.string().min(1),
    routing_diagnostic: z.string().min(1).nullable()
  })
  .strict();

const HypothesisBindingSchema = z
  .object({
    hypothesis_id: z.string().min(1),
    hypothesis_statement: z.string().min(1),
    function_area: z.string().min(1),
    workflow_family: z.string().min(1),
    cohort_scope: z.string().min(1),
    value_route: z.string().min(1),
    expected_metric_direction: z.enum(["increase", "decrease", "stable_or_guardrail"]),
    minimum_worthwhile_change: z.number().finite(),
    primary_metric_id: z.string().min(1),
    primary_metric_family: z.string().min(1),
    supporting_metric_ids: z.array(z.string()),
    guardrail_metric_ids: z.array(z.string()),
    relevant_fluency_dimensions: z.array(z.string()),
    expected_vbd_signature: z
      .object({
        velocity: z.string().min(1),
        breadth: z.string().min(1),
        depth: z.string().min(1)
      })
      .strict(),
    expected_outcome_signal_lag_windows: z.number().int().gte(1),
    evidence_design: EvidenceDesignSchema,
    approval_state: z.literal("approved_for_internal_review"),
    approved_at: z.string().min(1),
    approved_by_role: z.string().min(1),
    owner_refs_are_non_personal: z.literal(true),
    source_hashes: z.array(Sha256HexSchema).nonempty()
  })
  .strict();

const WindowEvidenceSchema = z
  .object({
    baseline_window_count: z.number().int().gte(0),
    post_window_count: z.number().int().gte(0),
    evaluation_window_refs: z.array(z.string()).nonempty(),
    all_required_windows_observed: z.boolean(),
    all_required_windows_unsuppressed: z.boolean(),
    all_required_windows_fresh: z.boolean(),
    imputation_used: z.boolean(),
    missing_window_refs: z.array(z.string()),
    suppressed_window_refs: z.array(z.string()),
    stale_window_refs: z.array(z.string()),
    imputed_window_refs: z.array(z.string())
  })
  .strict();

const AIFluencySnapshotEvidenceShape = {
  snapshot_id: z.string().min(1),
  source_ref: z.string().min(1),
  source_hash: Sha256HexSchema,
  overall_ai_fluency_score: z.number().finite(),
  dimension_scores: z
    .object({
      confidence: z.number().finite(),
      usage_quality: z.number().finite(),
      behavior_change: z.number().finite(),
      leadership_reinforcement: z.number().finite(),
      capability_growth: z.number().finite()
    })
    .strict(),
  overall_standard_error: z.number().finite().nullable(),
  measurement_uncertainty_state: z.enum([
    "aggregate_uncertainty_available",
    "missing_uncertainty_visible"
  ]),
  aggregate_only: z.literal(true),
  person_level_data_present: z.literal(false)
} as const;

const V1AIFluencySnapshotEvidenceSchema = z
  .object({
    ...AIFluencySnapshotEvidenceShape,
    dimension_standard_errors: z.record(z.union([z.number().finite(), z.null()]))
  })
  .strict();

const V2AIFluencySnapshotEvidenceSchema = z
  .object({
    ...AIFluencySnapshotEvidenceShape,
    dimension_standard_errors: z
      .object({
        overall_ai_fluency: z.number().finite().nullable(),
        confidence: z.number().finite().nullable(),
        usage_quality: z.number().finite().nullable(),
        behavior_change: z.number().finite().nullable(),
        leadership_reinforcement: z.number().finite().nullable(),
        capability_growth: z.number().finite().nullable()
      })
      .strict()
  })
  .strict();

const PrimaryMetricBindingSchema = z
  .object({
    metric_id: z.string().min(1),
    metric_family: z.string().min(1),
    expected_direction: z.enum(["increase", "decrease", "stable_or_guardrail"]),
    minimum_worthwhile_change: z.number().finite(),
    supporting_metric_ids: z.array(z.string()),
    guardrail_metric_ids: z.array(z.string()),
    supporting_metrics_replace_primary_metric: z.literal(false)
  })
  .strict();

const VBDMovementCheckSchema = z
  .object({
    role: z.string().min(1),
    pre_period_mean: z.number().finite(),
    evaluation_window_mean: z.number().finite(),
    evaluation_minus_pre_delta: z.number().finite(),
    positive_movement_required: z.boolean(),
    moved_as_expected: z.boolean()
  })
  .strict();

const VBDExposureEvidenceSchema = z
  .object({
    velocity_exposure_role: z.string().min(1),
    breadth_exposure_role: z.string().min(1),
    depth_context_role: z.string().min(1),
    lag_windows: z.number().int().gte(1),
    future_values_used: z.literal(false),
    separate_velocity_breadth_terms: z.literal(true),
    depth_context_only: z.literal(true),
    movement_checks: z
      .object({
        velocity: VBDMovementCheckSchema,
        breadth: VBDMovementCheckSchema,
        depth: VBDMovementCheckSchema
      })
      .strict(),
    source_window_refs: z.array(z.string()).nonempty()
  })
  .strict();

const V1PathwayStateSchema = z.enum([
  "HOLD",
  "BEHAVIOR_AND_OUTCOME_ALIGNED",
  "BEHAVIOR_MOVED_OUTCOME_UNCERTAIN",
  "NO_MEANINGFUL_MOVEMENT"
]);

const V2PathwayStateSchema = z.enum([
  "HOLD",
  "INTERNAL_SMOKE_CONTRAST_OBSERVED",
  "INTERNAL_SMOKE_DIRECTIONAL_ONLY",
  "NO_INTERNAL_SMOKE_MOVEMENT"
]);

const V1NoFitPathwayEvidenceSchema = z
  .object({
    pathway_state: z.literal("HOLD"),
    velocity_moved_as_expected: z.literal(false),
    breadth_moved_as_expected: z.literal(false),
    depth_moved_as_expected: z.literal(false),
    meaningful_primary_outcome_movement_supported: z.literal(false),
    approved_lag_respected: z.literal(false),
    quality_guardrail_acceptable: z.literal(false)
  })
  .strict();

const V1FittedPathwayEvidenceSchema = z
  .object({
    pathway_state: V1PathwayStateSchema,
    velocity_moved_as_expected: z.boolean(),
    breadth_moved_as_expected: z.boolean(),
    depth_moved_as_expected: z.boolean(),
    posterior_direction_beta_velocity: z.enum(["positive", "not_positive"]),
    posterior_direction_beta_breadth: z.enum(["positive", "not_positive"]),
    depth_context_only: z.literal(true),
    meaningful_primary_outcome_movement_supported: z.boolean(),
    approved_lag_respected: z.boolean(),
    quality_guardrail_acceptable: z.literal(true)
  })
  .strict();

const V1BehaviorOutcomePathwayEvidenceSchema = z.union([
  V1NoFitPathwayEvidenceSchema,
  V1FittedPathwayEvidenceSchema
]);

const V2NoFitPathwayEvidenceSchema = z
  .object({
    pathway_state: z.literal("HOLD"),
    velocity_moved_as_expected: z.literal(false),
    breadth_moved_as_expected: z.literal(false),
    depth_moved_as_expected: z.literal(false),
    meaningful_primary_outcome_movement_supported: z.literal(false),
    approved_lag_respected: z.literal(false),
    quality_guardrail_state: z.literal("NOT_EVALUATED"),
    pathway_evidence_authorized: z.literal(false)
  })
  .strict();

const V2FittedPathwayEvidenceSchema = z
  .object({
    pathway_state: V2PathwayStateSchema,
    velocity_moved_as_expected: z.boolean(),
    breadth_moved_as_expected: z.boolean(),
    depth_moved_as_expected: z.boolean(),
    posterior_direction_beta_velocity: z.enum(["positive", "not_positive"]),
    posterior_direction_beta_breadth: z.enum(["positive", "not_positive"]),
    depth_context_only: z.literal(true),
    meaningful_primary_outcome_movement_supported: z.boolean(),
    approved_lag_respected: z.boolean(),
    quality_guardrail_state: z.literal("NOT_EVALUATED"),
    pathway_evidence_authorized: z.literal(false)
  })
  .strict();

const V2BehaviorOutcomePathwayEvidenceSchema = z.union([
  V2NoFitPathwayEvidenceSchema,
  V2FittedPathwayEvidenceSchema
]);

const PosteriorEstimandSummarySchema = z
  .object({
    estimand_name: z.literal("internal_in_sample_vbd_contrast"),
    posterior_mean_movement: z.number().finite(),
    posterior_sd: z.number().finite().nonnegative(),
    credible_interval_80: z
      .object({
        lower: z.number().finite(),
        upper: z.number().finite()
      })
      .strict(),
    internal_draw_share_diagnostics: z
      .object({
        not_probability_output: z.literal(true),
        not_customer_facing: z.literal(true),
        movement_greater_than_zero_draw_share: z.number().finite().min(0).max(1),
        movement_exceeds_compiled_synthetic_smoke_minimum_draw_share: z
          .number()
          .finite()
          .min(0)
          .max(1)
      })
      .strict(),
    compiled_synthetic_smoke_minimum_movement: z.number().finite()
  })
  .strict();

const CounterfactualDerivationSchema = z
  .object({
    estimand_name: z.literal("internal_in_sample_vbd_contrast"),
    counterfactual_reference: z.literal(
      "pre_period_velocity_breadth_reference_values_depth_context_retained"
    ),
    retains_historical_trend: z.literal(true),
    retains_approved_business_controls: z.literal(true),
    retains_depth_as_context: z.literal(true),
    uses_future_values: z.literal(false),
    sets_predictors_to_zero: z.literal(false),
    direction_adjusted: z.literal(true),
    historical_forecast_counterfactual: z.literal(false),
    smoke_scope: z.literal("in_sample_vbd_contrast_not_historical_forecast")
  })
  .strict();

const EvidenceDesignClaimCapSchema = z
  .object({
    claim_cap: z.string().min(1),
    customer_facing_claim_authorized: z.literal(false),
    causal_claim_authorized: z.literal(false),
    financial_claim_authorized: z.literal(false)
  })
  .strict();

const DesignMatrixIdentifiabilityCheckSchema = z
  .object({
    pass: z.boolean(),
    rank: z.number().int().gte(0),
    parameter_count: z.number().int().gte(0),
    condition_number: z.number().nonnegative(),
    velocity_breadth_terms_kept_separate: z.literal(true),
    depth_context_retained_outside_design_matrix: z.literal(true)
  })
  .strict();

const V1ResidualAutocorrelationCheckSchema = z
  .object({
    pass: z.boolean(),
    residual_structure: z.literal("ar1_residual_structure"),
    rho_estimate: z.number(),
    residual_sd_estimate: z.number().nonnegative()
  })
  .strict();

const V2ResidualAutocorrelationCheckSchema = z
  .object({
    pass: z.boolean(),
    diagnostic_kind: z.literal("post_hoc_ar1_residual_autocorrelation_only"),
    modeled_in_likelihood: z.literal(false),
    rho_estimate: z.number(),
    residual_sd_estimate: z.number().positive()
  })
  .strict();

const PrePeriodFitCheckSchema = z
  .object({
    pass: z.boolean(),
    pre_period_observed_sd: z.number().nonnegative()
  })
  .strict();

const V1PrePeriodRollingBacktestSchema = z
  .object({
    pass: z.boolean(),
    compiled_backtest_policy: z.literal("last_two_pre_windows_held_out_smoke"),
    holdout_rmse: z.number().nonnegative().nullable(),
    rmse_threshold: z.number().nonnegative().optional()
  })
  .strict();

const V2PrePeriodRollingBacktestSchema = z
  .object({
    pass: z.boolean(),
    compiled_backtest_policy: z.literal("last_two_pre_windows_held_out_smoke"),
    holdout_rmse: z.number().finite().nonnegative(),
    train_residual_sd: z.number().finite().nonnegative(),
    compiled_rmse_pre_sd_multiplier: z.literal(
      COMPILED_BACKTEST_RMSE_PRE_SD_MULTIPLIER
    ),
    rmse_threshold: z.number().finite().nonnegative()
  })
  .strict();

const V2PreFitDesignMatrixCheckSchema = z
  .object({
    pass: z.literal(false),
    rank: z.number().int().gte(0),
    parameter_count: z.number().int().positive(),
    condition_number: z.number().finite().positive().nullable(),
    max_abs_velocity_breadth_correlation: z
      .number()
      .finite()
      .min(0)
      .max(1)
      .nullable(),
    compiled_condition_number_gate: z.literal(
      COMPILED_MAX_DESIGN_MATRIX_CONDITION_NUMBER
    ),
    compiled_velocity_breadth_correlation_gate: z.literal(
      COMPILED_MAX_VELOCITY_BREADTH_ABS_CORRELATION
    )
  })
  .strict();

const PlaceboInterventionDateCheckSchema = z
  .object({
    pass: z.boolean(),
    placebo_date_policy: z.literal("false_pre_period_intervention_date_smoke"),
    early_post_direction_adjusted_residual_max: z.number(),
    early_post_threshold: z.number().nonnegative()
  })
  .strict();

const CounterfactualStabilityCheckSchema = z
  .object({
    pass: z.boolean(),
    counterfactual_reference: z.literal(
      "pre_period_velocity_breadth_reference_values_depth_context_retained"
    ),
    smoke_scope: z.literal("in_sample_vbd_contrast_not_historical_forecast")
  })
  .strict();

const LagSensitivityCheckSchema = z
  .object({
    pass: z.boolean(),
    approved_lag_windows: z.number().int().gte(1),
    future_values_used: z.literal(false),
    early_post_direction_adjusted_residual_max: z.number(),
    evaluation_direction_adjusted_residual_mean: z.number(),
    early_post_threshold: z.number().nonnegative(),
    evaluation_movement_threshold: z.number().nonnegative()
  })
  .strict();

const CommonShockSensitivityCheckSchema = z
  .object({
    pass: z.boolean(),
    approved_controls_retained: z.array(z.string()),
    max_abs_evaluation_control_shift: z.number().nonnegative(),
    compiled_shift_gate: z.number().nonnegative(),
    control_shift_summaries: z.array(
      z
        .object({
          control_name: z.string().min(1),
          evaluation_minus_pre_standardized_shift: z.number()
        })
        .strict()
    )
  })
  .strict();

const TemporaryEffectPersistenceCheckSchema = z
  .object({
    pass: z.boolean(),
    evaluation_window_refs: z.array(z.string()),
    evaluation_residual_slope: z.number(),
    evaluation_residual_max: z.number(),
    spike_threshold: z.number().nonnegative().optional(),
    slope_threshold: z.number().optional()
  })
  .strict();

const PriorSensitivityCheckSchema = z
  .object({
    pass: z.boolean(),
    posterior_mean_movement: z.number(),
    smoke_only: z.literal(true)
  })
  .strict();

const V2CounterfactualNotRunSchema = z
  .object({
    status: z.literal("NOT_RUN"),
    reason: z.literal("full_counterfactual_stability_not_run_in_closed_form_smoke")
  })
  .strict();

const V2PlaceboNotRunSchema = z
  .object({
    status: z.literal("NOT_RUN"),
    reason: z.literal("pre_period_placebo_not_run_in_closed_form_smoke")
  })
  .strict();

const V2PriorSensitivityNotRunSchema = z
  .object({
    status: z.literal("NOT_RUN"),
    reason: z.literal("prior_sensitivity_refits_not_run_in_closed_form_smoke")
  })
  .strict();

const V2PosteriorPredictiveNotRunSchema = z
  .object({
    status: z.literal("NOT_RUN"),
    reason: z.literal("posterior_predictive_check_not_run_in_closed_form_smoke")
  })
  .strict();

const ClosedFormSmokeSamplerNotRunSchema = z
  .object({
    status: z.literal("NOT_RUN"),
    reason: z.literal("closed_form_smoke_has_no_mcmc_sampler")
  })
  .strict();

const V1DiagnosticsSchema = z.union([
  z
    .object({
      passed: z.literal(false),
      failing_diagnostics: z.array(LongitudinalFailingDiagnosticSchema).nonempty()
    })
    .strict(),
  z
    .object({
      passed: z.boolean(),
      failing_diagnostics: z.array(LongitudinalFailingDiagnosticSchema),
      design_matrix_identifiability: DesignMatrixIdentifiabilityCheckSchema,
      residual_autocorrelation_check: V1ResidualAutocorrelationCheckSchema,
      pre_period_fit_check: PrePeriodFitCheckSchema,
      pre_period_rolling_backtest: V1PrePeriodRollingBacktestSchema,
      placebo_intervention_date_check: PlaceboInterventionDateCheckSchema,
      counterfactual_stability_check: CounterfactualStabilityCheckSchema,
      lag_sensitivity_check: LagSensitivityCheckSchema,
      common_shock_sensitivity_check: CommonShockSensitivityCheckSchema,
      temporary_effect_persistence_check: TemporaryEffectPersistenceCheckSchema,
      prior_sensitivity_check: PriorSensitivityCheckSchema
    })
    .strict()
]);

const V2NoFitDiagnosticsSchema = z
  .object({
    executed_checks_passed: z.literal(false),
    fit_summary_hash: z.null(),
    failing_diagnostics: z.array(LongitudinalFailingDiagnosticSchema).nonempty(),
    pre_fit_design_matrix_check: V2PreFitDesignMatrixCheckSchema.nullable(),
    placebo_intervention_date_check: V2PlaceboNotRunSchema,
    counterfactual_stability_check: V2CounterfactualNotRunSchema,
    prior_sensitivity_check: V2PriorSensitivityNotRunSchema,
    posterior_predictive_check: V2PosteriorPredictiveNotRunSchema,
    sampler_diagnostics: ClosedFormSmokeSamplerNotRunSchema
  })
  .strict();

const V2FittedDiagnosticsSchema = z
  .object({
    executed_checks_passed: z.boolean(),
    fit_summary_hash: Sha256HexSchema,
    failing_diagnostics: z.array(LongitudinalFailingDiagnosticSchema),
    design_matrix_identifiability: DesignMatrixIdentifiabilityCheckSchema,
    residual_autocorrelation_check: V2ResidualAutocorrelationCheckSchema,
    pre_period_fit_check: PrePeriodFitCheckSchema,
    pre_period_rolling_backtest: V2PrePeriodRollingBacktestSchema,
    placebo_intervention_date_check: V2PlaceboNotRunSchema,
    counterfactual_stability_check: V2CounterfactualNotRunSchema,
    lag_sensitivity_check: LagSensitivityCheckSchema,
    common_shock_sensitivity_check: CommonShockSensitivityCheckSchema,
    temporary_effect_persistence_check: TemporaryEffectPersistenceCheckSchema,
    prior_sensitivity_check: V2PriorSensitivityNotRunSchema,
    posterior_predictive_check: V2PosteriorPredictiveNotRunSchema,
    sampler_diagnostics: ClosedFormSmokeSamplerNotRunSchema
  })
  .strict();

const V2DiagnosticsSchema = z.union([
  V2NoFitDiagnosticsSchema,
  V2FittedDiagnosticsSchema
]);

const V1FittedModelSpecificationSchema = z
  .object({
    likelihood_family: z.literal("continuous_normal_identity"),
    link_function: z.literal("identity"),
    residual_structure: z.literal("ar1_residual_structure"),
    sampler_kind: z.literal("closed_form_gaussian_posterior_smoke_not_nuts"),
    chains: z.literal(2),
    synthetic_smoke_only: z.literal(true),
    replicated_calibration_complete: z.literal(false)
  })
  .strict();

const V1NoFitModelSpecificationSchema = z
  .object({
    likelihood_family: z.literal("continuous_normal_identity"),
    link_function: z.literal("identity"),
    residual_structure: z.literal("ar1_residual_structure"),
    sampler_kind: z.literal("not_fit_due_to_fail_closed_hold"),
    chains: z.literal(0),
    synthetic_smoke_only: z.literal(true),
    replicated_calibration_complete: z.literal(false)
  })
  .strict();

const V1ModelSpecificationSchema = z.union([
  V1FittedModelSpecificationSchema,
  V1NoFitModelSpecificationSchema
]);

const V2ModelSpecificationSchema = z
  .object({
    model_kind: z.literal("closed_form_gaussian_longitudinal_smoke_regression"),
    likelihood_family: z.literal("continuous_normal_identity"),
    link_function: z.literal("identity"),
    residual_structure: z.literal(
      "independent_gaussian_with_posthoc_ar1_diagnostic_only"
    ),
    posterior_engine: z.literal("closed_form_gaussian_analytic_draws"),
    nuts_sampler_used: z.literal(false),
    ar1_likelihood_modeled: z.literal(false),
    partial_pooling_implemented: z.literal(false),
    historical_forecast: z.literal(false),
    mcmc_chains: z.literal(0),
    analytic_posterior_draw_count: z.number().int().gte(0),
    synthetic_smoke_only: z.literal(true),
    replicated_calibration_complete: z.literal(false)
  })
  .strict();

const V2ModelInputGovernanceSchema = z
  .object({
    target_value_used_as_prior: z.boolean(),
    minimum_worthwhile_change_used_in_inference: z.literal(false)
  })
  .strict();

const BlockedOutputsSchema = z
  .object({
    customer_output_authorized: z.literal(false),
    probability_output_authorized: z.literal(false),
    confidence_output_authorized: z.literal(false),
    roi_output_authorized: z.literal(false),
    finance_output_authorized: z.literal(false),
    causality_output_authorized: z.literal(false),
    productivity_output_authorized: z.literal(false),
    full_pathway_coherence_authorized: z.literal(false),
    creates_route: z.literal(false),
    creates_ui: z.literal(false),
    writes_persistence: z.literal(false),
    creates_export: z.literal(false),
    renders_readout: z.literal(false),
    executes_connector: z.literal(false)
  })
  .strict();

const BusinessControlEvidenceSchema = z
  .object({
    control_names: z.array(z.string()),
    control_source_refs: z.array(z.string()),
    synthetic_aggregate_placeholders_only: z.literal(true),
    unsafe_control_refs_redacted: z.boolean(),
    hris_or_personnel_fields_present: z.literal(false),
    source_hashes: z.array(Sha256HexSchema)
  })
  .strict();

const V1BusinessControlEvidenceSchema = BusinessControlEvidenceSchema.extend({
  control_names: z.array(z.string()).max(COMPILED_MAX_APPROVED_BUSINESS_CONTROLS)
});

const SyntheticGeneratorSchema = z
  .object({
    generator_id: z.string().min(1),
    generator_version: z.string().min(1),
    seed: z.number().int(),
    synthetic_input_hash: Sha256HexSchema,
    real_data_present: z.literal(false),
    customer_data_present: z.literal(false),
    production_data_present: z.literal(false),
    live_data_source_present: z.literal(false)
  })
  .strict();

const SourceHashesSchema = z
  .object({
    hypothesis_plan_hash: Sha256HexSchema,
    ai_fluency_snapshot_hashes: z.array(Sha256HexSchema).nonempty(),
    control_source_hashes: z.array(Sha256HexSchema),
    vbd_source_hash: Sha256HexSchema,
    outcome_source_hash: Sha256HexSchema
  })
  .strict();

const V1GovernanceStateSchema = z
  .object({
    state: z.enum(["eligible_internal_smoke_only", "valid_internal_non_authorizing", "HOLD"]),
    failing_diagnostics: z.array(LongitudinalFailingDiagnosticSchema),
    full_pathway_coherence_authorized: z.literal(false),
    customer_output_authorized: z.literal(false),
    probability_output_authorized: z.literal(false),
    confidence_output_authorized: z.literal(false),
    promotion_decision_ref: z.null()
  })
  .strict();

const V2GovernanceStateSchema = z
  .object({
    state: z.enum(["valid_internal_smoke_non_authorizing", "HOLD"]),
    failing_diagnostics: z.array(LongitudinalFailingDiagnosticSchema),
    full_pathway_coherence_authorized: z.literal(false),
    customer_output_authorized: z.literal(false),
    probability_output_authorized: z.literal(false),
    confidence_output_authorized: z.literal(false),
    promotion_decision_ref: z.null()
  })
  .strict();

const V1HashBindingsSchema = z
  .object({
    synthetic_input_hash: Sha256HexSchema,
    source_hashes_hash: Sha256HexSchema,
    artifact_self_hash: Sha256HexSchema
  })
  .strict();

const V2HashBindingsSchema = z
  .object({
    synthetic_input_hash: Sha256HexSchema,
    synthetic_input_private_remainder_hash: Sha256HexSchema,
    input_evidence_hash: Sha256HexSchema,
    fit_summary_hash: Sha256HexSchema.nullable(),
    diagnostics_fit_summary_hash: Sha256HexSchema.nullable(),
    fit_private_remainder_hash: Sha256HexSchema.nullable(),
    diagnostics_evidence_hash: Sha256HexSchema.nullable(),
    fit_output_evidence_hash: Sha256HexSchema.nullable(),
    source_hashes_hash: Sha256HexSchema,
    artifact_payload_hash: Sha256HexSchema,
    artifact_self_hash: Sha256HexSchema
  })
  .strict();

const CommonArtifactShape = {
  artifact_class: z.literal("internal_synthetic_longitudinal_outcome_proof"),
  generated_at: z.string().min(1),
  harness_version: z.string().min(1),
  model_family: z.literal(LONGITUDINAL_MODEL_FAMILY),
  model_slice: z.literal(LONGITUDINAL_MODEL_SLICE),
  design_route: RouteSchema,
  hypothesis_binding: HypothesisBindingSchema,
  primary_metric_binding: PrimaryMetricBindingSchema,
  baseline_and_post_window_evidence: WindowEvidenceSchema,
  vbd_exposure_evidence: VBDExposureEvidenceSchema,
  business_control_evidence: BusinessControlEvidenceSchema,
  posterior_estimand_summary: PosteriorEstimandSummarySchema.nullable(),
  counterfactual_derivation: CounterfactualDerivationSchema,
  evidence_design_claim_cap: EvidenceDesignClaimCapSchema,
  synthetic_generator: SyntheticGeneratorSchema,
  source_hashes: SourceHashesSchema,
  blocked_outputs: BlockedOutputsSchema,
  internal_only: z.literal(true),
  synthetic_only: z.literal(true),
  numeric_values_role: z.literal("internal_validation_inputs_not_output"),
  customer_output_authorized: z.literal(false),
  probability_output_authorized: z.literal(false),
  confidence_output_authorized: z.literal(false),
  roi_output_authorized: z.literal(false),
  finance_output_authorized: z.literal(false),
  causality_output_authorized: z.literal(false),
  productivity_output_authorized: z.literal(false),
  full_pathway_coherence_authorized: z.literal(false),
  promotion_decision_ref: z.null()
} as const;

const LongitudinalSyntheticOutcomeProofV1ArtifactObjectSchema = z
  .object({
    ...CommonArtifactShape,
    schema_version: z.literal(LONGITUDINAL_SYNTHETIC_OUTCOME_PROOF_SCHEMA_VERSION_V1),
    ai_fluency_snapshot_evidence: z.array(V1AIFluencySnapshotEvidenceSchema).nonempty(),
    business_control_evidence: V1BusinessControlEvidenceSchema,
    model_specification: V1ModelSpecificationSchema,
    behavior_outcome_pathway_evidence: V1BehaviorOutcomePathwayEvidenceSchema,
    diagnostics: V1DiagnosticsSchema,
    governance_state: V1GovernanceStateSchema,
    hash_bindings: V1HashBindingsSchema
  })
  .strict();

const LongitudinalSyntheticOutcomeProofV2ArtifactObjectSchema = z
  .object({
    ...CommonArtifactShape,
    schema_version: z.literal(LONGITUDINAL_SYNTHETIC_OUTCOME_PROOF_SCHEMA_VERSION_V2),
    ai_fluency_snapshot_evidence: z.array(V2AIFluencySnapshotEvidenceSchema).nonempty(),
    model_specification: V2ModelSpecificationSchema,
    model_input_governance: V2ModelInputGovernanceSchema,
    behavior_outcome_pathway_evidence: V2BehaviorOutcomePathwayEvidenceSchema,
    diagnostics: V2DiagnosticsSchema,
    governance_state: V2GovernanceStateSchema,
    hash_bindings: V2HashBindingsSchema
  })
  .strict();

const LongitudinalSyntheticOutcomeProofArtifactDiscriminatedUnionSchema =
  z.discriminatedUnion("schema_version", [
    LongitudinalSyntheticOutcomeProofV1ArtifactObjectSchema,
    LongitudinalSyntheticOutcomeProofV2ArtifactObjectSchema
  ]);

type LongitudinalSyntheticOutcomeProofArtifactObject = z.infer<
  typeof LongitudinalSyntheticOutcomeProofArtifactDiscriminatedUnionSchema
>;

function orderedValuesEqual<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function uniqueSetsEqual<T>(left: readonly T[], right: readonly T[]): boolean {
  if (new Set(left).size !== left.length || new Set(right).size !== right.length) return false;
  const rightSet = new Set(right);
  return left.length === right.length && left.every((value) => rightSet.has(value));
}

function numbersNearlyEqual(left: number, right: number): boolean {
  return Math.abs(left - right) <= Number.EPSILON * Math.max(1, Math.abs(left), Math.abs(right)) * 8;
}

function validateLongitudinalSyntheticOutcomeProofArtifact(
  artifact: LongitudinalSyntheticOutcomeProofArtifactObject,
  ctx: z.RefinementCtx
): void {
  const isV2 =
    artifact.schema_version === LONGITUDINAL_SYNTHETIC_OUTCOME_PROOF_SCHEMA_VERSION_V2;
  if (isV2) {
    if (!isValidRfc3339Timestamp(artifact.generated_at)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["generated_at"],
        message: "V2 generated_at must be a timezone-aware RFC3339 timestamp"
      });
    }
    if (
      !Number.isSafeInteger(artifact.synthetic_generator.seed) ||
      artifact.synthetic_generator.seed < 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["synthetic_generator", "seed"],
        message: "V2 seed must be a nonnegative JavaScript-safe integer"
      });
    }
    if (
      artifact.synthetic_generator.generator_id !==
        LONGITUDINAL_SYNTHETIC_GENERATOR_ID ||
      artifact.synthetic_generator.generator_version !==
        LONGITUDINAL_SYNTHETIC_GENERATOR_VERSION
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["synthetic_generator"],
        message: "V2 artifacts require the approved synthetic generator identity"
      });
    }
    if (
      artifact.ai_fluency_snapshot_evidence.some(
        (snapshot) => !snapshot.source_ref.startsWith("synthetic-ai-fluency://")
      ) ||
      artifact.business_control_evidence.control_source_refs.some(
        (sourceRef) => !sourceRef.startsWith("synthetic-control://")
      )
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["source_hashes"],
        message: "V2 source commitments must remain synthetic-only"
      });
    }
    if (
      artifact.business_control_evidence.control_names.some(
        (name, index) =>
          APPROVED_SYNTHETIC_CONTROL_SOURCE_REFS[name] !==
          artifact.business_control_evidence.control_source_refs[index]
      )
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["business_control_evidence"],
        message: "V2 business controls must use compiled approved synthetic identities"
      });
    }
    const expectedInputEvidenceHash =
      longitudinalSyntheticOutcomeProofInputEvidenceHash(artifact);
    const expectedSyntheticInputHash = sha256Json({
      input_evidence_hash: expectedInputEvidenceHash,
      synthetic_input_private_remainder_hash:
        artifact.hash_bindings.synthetic_input_private_remainder_hash
    });
    if (
      artifact.hash_bindings.input_evidence_hash !== expectedInputEvidenceHash ||
      artifact.hash_bindings.synthetic_input_hash !== expectedSyntheticInputHash ||
      artifact.synthetic_generator.synthetic_input_hash !== expectedSyntheticInputHash
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hash_bindings", "input_evidence_hash"],
        message: "V2 input evidence must remain bound to the synthetic-input commitment"
      });
    }
    if (
      artifact.diagnostics.fit_summary_hash !==
      artifact.hash_bindings.diagnostics_fit_summary_hash
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["diagnostics", "fit_summary_hash"],
        message: "diagnostics must bind to the diagnostics fit commitment"
      });
    }
    const fitAvailable = artifact.hash_bindings.fit_summary_hash !== null;
    const fitCommitmentComponents = [
      artifact.hash_bindings.diagnostics_fit_summary_hash,
      artifact.hash_bindings.fit_private_remainder_hash,
      artifact.hash_bindings.diagnostics_evidence_hash,
      artifact.hash_bindings.fit_output_evidence_hash
    ];
    const fitCommitmentsAvailable = fitCommitmentComponents.every(
      (component) => component !== null
    );
    const fitCommitmentsAbsent = fitCommitmentComponents.every(
      (component) => component === null
    );
    if (fitAvailable && fitCommitmentsAvailable) {
      const expectedDiagnosticsEvidenceHash =
        longitudinalSyntheticOutcomeProofDiagnosticsEvidenceHash(artifact.diagnostics);
      const expectedDiagnosticsFitSummaryHash = sha256Json({
        diagnostics_evidence_hash: expectedDiagnosticsEvidenceHash,
        fit_private_remainder_hash:
          artifact.hash_bindings.fit_private_remainder_hash
      });
      const expectedFitOutputEvidenceHash =
        longitudinalSyntheticOutcomeProofFitOutputEvidenceHash(artifact);
      const expectedFitSummaryHash = sha256Json({
        synthetic_input_hash: expectedSyntheticInputHash,
        diagnostics_fit_summary_hash: expectedDiagnosticsFitSummaryHash,
        fit_output_evidence_hash: expectedFitOutputEvidenceHash
      });
      if (
        artifact.hash_bindings.diagnostics_evidence_hash !==
          expectedDiagnosticsEvidenceHash ||
        artifact.hash_bindings.diagnostics_fit_summary_hash !==
          expectedDiagnosticsFitSummaryHash ||
        artifact.hash_bindings.fit_output_evidence_hash !==
          expectedFitOutputEvidenceHash ||
        artifact.hash_bindings.fit_summary_hash !== expectedFitSummaryHash
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["hash_bindings", "fit_summary_hash"],
          message:
            "V2 diagnostics evidence must remain bound to the fit commitment; fit outputs must remain bound to the fit commitment"
        });
      }
    } else if ((fitAvailable && !fitCommitmentsAvailable) || (!fitAvailable && !fitCommitmentsAbsent)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hash_bindings", "fit_summary_hash"],
        message: "V2 fit and diagnostics commitment components must agree with fit availability"
      });
    }
    const fittedPathway =
      "posterior_direction_beta_velocity" in artifact.behavior_outcome_pathway_evidence;
    if (
      fitAvailable !== (artifact.diagnostics.fit_summary_hash !== null) ||
      fitAvailable !== (artifact.posterior_estimand_summary !== null) ||
      fitAvailable !== fittedPathway ||
      fitAvailable !== (artifact.model_specification.analytic_posterior_draw_count > 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hash_bindings", "fit_summary_hash"],
        message: "fit hash, diagnostics, posterior, pathway, and analytic draws must agree"
      });
    }
    if (!fitAvailable && artifact.governance_state.state !== "HOLD") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["governance_state", "state"],
        message: "V2 artifacts without a bound fit must HOLD"
      });
    }
    const expectedState =
      artifact.governance_state.failing_diagnostics.length > 0
        ? "HOLD"
        : "valid_internal_smoke_non_authorizing";
    if (artifact.governance_state.state !== expectedState) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["governance_state", "state"],
        message: "V2 governance state must be derived from failing diagnostics"
      });
    }
    if (artifact.business_control_evidence.unsafe_control_refs_redacted) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["business_control_evidence", "unsafe_control_refs_redacted"],
        message: "unsafe personnel or control metadata must reject before V2 artifact emission"
      });
    }
    if (fitAvailable && artifact.model_input_governance.target_value_used_as_prior) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["model_input_governance", "target_value_used_as_prior"],
        message: "a completed V2 fit cannot use a target value as a prior"
      });
    }
    if (!fitAvailable) {
      const controls = artifact.business_control_evidence;
      const windows = artifact.baseline_and_post_window_evidence;
      const preFitDesign =
        "pre_fit_design_matrix_check" in artifact.diagnostics
          ? artifact.diagnostics.pre_fit_design_matrix_check
          : null;
      let expectedNoFitFailure: z.infer<typeof LongitudinalFailingDiagnosticSchema> | null = null;

      if (
        artifact.hypothesis_binding.primary_metric_family !==
          "continuous_normal_identity" ||
        artifact.primary_metric_binding.metric_family !== "continuous_normal_identity"
      ) {
        expectedNoFitFailure = "unsupported_likelihood_family";
      } else if (artifact.model_input_governance.target_value_used_as_prior) {
        expectedNoFitFailure = "target_contamination";
      } else if (windows.baseline_window_count < 8 || windows.post_window_count < 3) {
        expectedNoFitFailure = "insufficient_history";
      } else if (
        windows.missing_window_refs.length > 0 ||
        windows.suppressed_window_refs.length > 0 ||
        windows.stale_window_refs.length > 0 ||
        windows.imputed_window_refs.length > 0
      ) {
        expectedNoFitFailure = "missing_or_suppressed_windows";
      } else if (
        artifact.ai_fluency_snapshot_evidence.some(
          (snapshot) => snapshot.measurement_uncertainty_state !== "aggregate_uncertainty_available"
        )
      ) {
        expectedNoFitFailure = "missing_measurement_uncertainty";
      } else if (controls.control_names.length > COMPILED_MAX_APPROVED_BUSINESS_CONTROLS) {
        expectedNoFitFailure = "design_matrix_identifiability";
      } else if (artifact.design_route.evidence_design === "STAGGERED_ROLLOUT") {
        expectedNoFitFailure = "unsupported_staggered_event_study";
      } else if (artifact.design_route.evidence_design === "BASELINE_ONLY") {
        expectedNoFitFailure = "baseline_only_no_contribution_confidence";
      } else if (
        !["HISTORICAL_STATE_SPACE", "REPEATED_PRE_POST"].includes(
          artifact.design_route.evidence_design
        )
      ) {
        expectedNoFitFailure = "unsupported_evidence_design";
      } else if (preFitDesign !== null) {
        expectedNoFitFailure = "design_matrix_identifiability";
      }

      if (
        expectedNoFitFailure === null ||
        artifact.diagnostics.failing_diagnostics.length !== 1 ||
        artifact.diagnostics.failing_diagnostics[0] !== expectedNoFitFailure
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["diagnostics", "failing_diagnostics"],
          message: "V2 no-fit HOLD reason must be derived from emitted input evidence"
        });
      }

      if (preFitDesign !== null) {
        const rankOrConditionFailure =
          preFitDesign.rank < preFitDesign.parameter_count ||
          preFitDesign.condition_number === null ||
          preFitDesign.condition_number > COMPILED_MAX_DESIGN_MATRIX_CONDITION_NUMBER;
        const correlationFailure =
          preFitDesign.max_abs_velocity_breadth_correlation !== null &&
          preFitDesign.max_abs_velocity_breadth_correlation >
            COMPILED_MAX_VELOCITY_BREADTH_ABS_CORRELATION;
        if (
          expectedNoFitFailure !== "design_matrix_identifiability" ||
          controls.control_names.length > COMPILED_MAX_APPROVED_BUSINESS_CONTROLS ||
          preFitDesign.parameter_count !== 5 + controls.control_names.length ||
          (rankOrConditionFailure &&
            preFitDesign.max_abs_velocity_breadth_correlation !== null) ||
          (!rankOrConditionFailure && !correlationFailure)
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["diagnostics", "pre_fit_design_matrix_check"],
            message: "pre-fit design HOLD evidence must independently demonstrate failure"
          });
        }
      } else if (
        expectedNoFitFailure === "design_matrix_identifiability" &&
        controls.control_names.length <= COMPILED_MAX_APPROVED_BUSINESS_CONTROLS
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["diagnostics", "pre_fit_design_matrix_check"],
          message: "design-matrix HOLD requires excessive controls or bound pre-fit failure evidence"
        });
      }
    }
  }
  if (!isV2) {
    const noFit =
      artifact.model_specification.sampler_kind ===
      "not_fit_due_to_fail_closed_hold";
    const fittedPathway =
      "posterior_direction_beta_velocity" in
      artifact.behavior_outcome_pathway_evidence;
    const fittedDiagnostics =
      "design_matrix_identifiability" in artifact.diagnostics;
    if (
      noFit !== (artifact.posterior_estimand_summary === null) ||
      noFit === fittedPathway ||
      noFit === fittedDiagnostics ||
      (noFit && artifact.governance_state.state !== "HOLD")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["model_specification"],
        message: "V1 fitted and no-fit HOLD shapes must remain internally consistent"
      });
    }
  }
  if (artifact.hash_bindings.synthetic_input_hash !== artifact.synthetic_generator.synthetic_input_hash) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hash_bindings", "synthetic_input_hash"],
        message: "synthetic input hash binding must match synthetic generator hash"
      });
    }
    if (
      isV2 &&
      artifact.hash_bindings.artifact_payload_hash !==
        longitudinalSyntheticOutcomeProofPayloadHash(artifact)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hash_bindings", "artifact_payload_hash"],
        message: "artifact_payload_hash must bind the emitted V2 payload"
      });
    }
    if (artifact.hash_bindings.source_hashes_hash !== sha256Json(artifact.source_hashes)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hash_bindings", "source_hashes_hash"],
        message: "source_hashes_hash must match source_hashes"
      });
    }
    const expectedSelfHash = longitudinalSyntheticOutcomeProofSelfHash(artifact);
    if (artifact.hash_bindings.artifact_self_hash !== expectedSelfHash) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hash_bindings", "artifact_self_hash"],
        message: "artifact_self_hash must match the artifact body"
      });
    }
    const snapshotHashes = artifact.ai_fluency_snapshot_evidence.map(
      (snapshot) => snapshot.source_hash
    );
    if (!orderedValuesEqual(snapshotHashes, artifact.source_hashes.ai_fluency_snapshot_hashes)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["source_hashes", "ai_fluency_snapshot_hashes"],
        message: "AI Fluency snapshot source hashes must match snapshot evidence"
      });
    }
    const snapshotIds = artifact.ai_fluency_snapshot_evidence.map(
      (snapshot) => snapshot.snapshot_id
    );
    if (isV2 && new Set(snapshotIds).size !== snapshotIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ai_fluency_snapshot_evidence"],
        message: "AI Fluency snapshot IDs must be unique"
      });
    }
    const controls = artifact.business_control_evidence;
    if (isV2) {
      if (controls.unsafe_control_refs_redacted) {
        if (
          controls.control_names.length !== 0 ||
          controls.control_source_refs.length !== 0 ||
          controls.source_hashes.length !== 0 ||
          artifact.source_hashes.control_source_hashes.length !== 0
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["business_control_evidence"],
            message: "redacted control evidence must not retain control names, refs, or hashes"
          });
        }
      } else if (
        controls.control_names.length !== controls.control_source_refs.length ||
        controls.control_names.length !== controls.source_hashes.length ||
        !orderedValuesEqual(controls.source_hashes, artifact.source_hashes.control_source_hashes)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["business_control_evidence"],
          message: "control names, refs, and hashes must align with source commitments"
        });
      }
      if (new Set(controls.control_names).size !== controls.control_names.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["business_control_evidence", "control_names"],
          message: "approved control names must be unique"
        });
      }
      if (artifact.design_route.evidence_design !== artifact.hypothesis_binding.evidence_design) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["design_route", "evidence_design"],
          message: "design route must match the approved hypothesis evidence design"
        });
      }
      if (artifact.design_route.claim_cap !== artifact.evidence_design_claim_cap.claim_cap) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["evidence_design_claim_cap", "claim_cap"],
          message: "claim cap must match the routed evidence-design commitment"
        });
      }
    }
    const metricCommitments = [
      ["metric_id", artifact.primary_metric_binding.metric_id, artifact.hypothesis_binding.primary_metric_id],
      ["expected_direction", artifact.primary_metric_binding.expected_direction, artifact.hypothesis_binding.expected_metric_direction]
    ] as const;
    for (const [field, actual, expected] of metricCommitments) {
      if (actual !== expected) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["primary_metric_binding", field],
          message: `primary metric ${field} must match the approved hypothesis`
        });
      }
    }
    if (
      isV2 &&
      !["increase", "decrease"].includes(
        artifact.hypothesis_binding.expected_metric_direction
      )
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hypothesis_binding", "expected_metric_direction"],
        message: "V2 longitudinal smoke supports only increase or decrease directions"
      });
    }
    if (isV2) {
      if (artifact.primary_metric_binding.metric_family !== artifact.hypothesis_binding.primary_metric_family) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["primary_metric_binding", "metric_family"],
          message: "primary metric family must match the approved hypothesis"
        });
      }
      if (
        !numbersNearlyEqual(
          artifact.primary_metric_binding.minimum_worthwhile_change,
          artifact.hypothesis_binding.minimum_worthwhile_change
        )
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["primary_metric_binding", "minimum_worthwhile_change"],
          message: "primary metric minimum change must match the approved hypothesis"
        });
      }
      for (const field of ["supporting_metric_ids", "guardrail_metric_ids"] as const) {
        if (!orderedValuesEqual(artifact.primary_metric_binding[field], artifact.hypothesis_binding[field])) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["primary_metric_binding", field],
            message: `primary metric ${field} must match the approved hypothesis`
          });
        }
      }
    }
    const vbdRoles = [
      ["velocity", artifact.vbd_exposure_evidence.velocity_exposure_role],
      ["breadth", artifact.vbd_exposure_evidence.breadth_exposure_role],
      ["depth", artifact.vbd_exposure_evidence.depth_context_role]
    ] as const;
    for (const [dimension, role] of vbdRoles) {
      if (isV2) {
        const movement = artifact.vbd_exposure_evidence.movement_checks[dimension];
        if (
          role !== artifact.hypothesis_binding.expected_vbd_signature[dimension] ||
          movement.role !== role
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["vbd_exposure_evidence", "movement_checks", dimension, "role"],
            message: `${dimension} role must match the approved hypothesis commitment`
          });
        }
        if (role !== V2_VBD_ROLE_COMMITMENTS[dimension]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["hypothesis_binding", "expected_vbd_signature", dimension],
            message: `${dimension} role must retain the approved V2 smoke commitment`
          });
        }
        const derivedDelta = movement.evaluation_window_mean - movement.pre_period_mean;
        const positiveMovementRequired = movement.role.includes("POSITIVE");
        const movedAsExpected = positiveMovementRequired
          ? derivedDelta >= COMPILED_VBD_MOVEMENT_SMOKE_FLOOR
          : true;
        if (
          !numbersNearlyEqual(movement.evaluation_minus_pre_delta, derivedDelta) ||
          movement.positive_movement_required !== positiveMovementRequired ||
          movement.moved_as_expected !== movedAsExpected
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["vbd_exposure_evidence", "movement_checks", dimension],
            message: `${dimension} movement state must be derived from the emitted aggregate means`
          });
        }
      }
    }
    const windowEvidence = artifact.baseline_and_post_window_evidence;
    if (isV2) {
      const sourceWindowCounts = new Map<string, number>();
      for (const ref of artifact.vbd_exposure_evidence.source_window_refs) {
        sourceWindowCounts.set(ref, (sourceWindowCounts.get(ref) ?? 0) + 1);
      }
      const sourceWindowOrder = [...sourceWindowCounts.keys()];
      const sourceWindowSet = new Set(sourceWindowCounts.keys());
      if (
        sourceWindowSet.size !==
        windowEvidence.baseline_window_count + windowEvidence.post_window_count
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["vbd_exposure_evidence", "source_window_refs"],
          message: "source windows must match declared baseline and post window counts"
        });
      }
      if (new Set(sourceWindowCounts.values()).size !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["vbd_exposure_evidence", "source_window_refs"],
          message: "source windows must represent a balanced aggregate panel"
        });
      }
      const expectedEvaluationRefs = sourceWindowOrder.slice(
        windowEvidence.baseline_window_count + artifact.vbd_exposure_evidence.lag_windows
      );
      if (!orderedValuesEqual(windowEvidence.evaluation_window_refs, expectedEvaluationRefs)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["baseline_and_post_window_evidence", "evaluation_window_refs"],
          message: "evaluation windows must begin after the approved outcome lag"
        });
      }
      if (new Set(windowEvidence.missing_window_refs).size !== windowEvidence.missing_window_refs.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["baseline_and_post_window_evidence", "missing_window_refs"],
          message: "missing window refs must be unique"
        });
      }
      for (const [field, refs] of [
        ["evaluation_window_refs", windowEvidence.evaluation_window_refs],
        ["suppressed_window_refs", windowEvidence.suppressed_window_refs],
        ["stale_window_refs", windowEvidence.stale_window_refs],
        ["imputed_window_refs", windowEvidence.imputed_window_refs]
      ] as const) {
        if (
          new Set(refs).size !== refs.length ||
          refs.some((ref) => !sourceWindowSet.has(ref))
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["baseline_and_post_window_evidence", field],
            message: "window refs must be unique commitments to observed source windows"
          });
        }
      }
    }
    const failing = new Set(artifact.governance_state.failing_diagnostics);
    const diagnosticFailing =
      "failing_diagnostics" in artifact.diagnostics
        ? artifact.diagnostics.failing_diagnostics
        : [];
    if (
      !orderedValuesEqual(diagnosticFailing, artifact.governance_state.failing_diagnostics) ||
      failing.size !== artifact.governance_state.failing_diagnostics.length
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["diagnostics", "failing_diagnostics"],
        message: "unique diagnostic failures must match governance failures in emitted order"
      });
    }
    const normalMetricRequested =
      artifact.hypothesis_binding.primary_metric_family ===
        "continuous_normal_identity" &&
      artifact.primary_metric_binding.metric_family ===
        "continuous_normal_identity";
    if (
      !normalMetricRequested &&
      (artifact.governance_state.state !== "HOLD" ||
        !failing.has("unsupported_likelihood_family"))
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["primary_metric_binding", "metric_family"],
        message: "unsupported metric families must HOLD with unsupported_likelihood_family"
      });
    }
    if (isV2 && normalMetricRequested && failing.has("unsupported_likelihood_family")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["diagnostics", "failing_diagnostics"],
        message: "normal metric families cannot claim unsupported_likelihood_family"
      });
    }
    if (
      isV2 &&
      controls.control_names.length > COMPILED_MAX_APPROVED_BUSINESS_CONTROLS &&
      (artifact.governance_state.state !== "HOLD" ||
        !failing.has("design_matrix_identifiability"))
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["business_control_evidence", "control_names"],
        message: "too many controls must HOLD with design_matrix_identifiability"
      });
    }
    if (!isV2) {
      if (artifact.diagnostics.passed !== (diagnosticFailing.length === 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["diagnostics", "passed"],
          message: "diagnostics.passed must match failing diagnostic count"
        });
      }
    } else {
      if (
        artifact.diagnostics.executed_checks_passed !==
        (diagnosticFailing.length === 0)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["diagnostics", "executed_checks_passed"],
          message: "executed_checks_passed must match failing diagnostic count"
        });
      }
      if (artifact.diagnostics.fit_summary_hash !== null) {
        const diagnostics = artifact.diagnostics;
        const derivedFailures: LongitudinalFailingDiagnostic[] = [];
        if (!diagnostics.lag_sensitivity_check.pass) derivedFailures.push("lag_sensitivity");
        if (!diagnostics.common_shock_sensitivity_check.pass) {
          derivedFailures.push("common_shock_sensitivity");
        }
        if (!diagnostics.temporary_effect_persistence_check.pass) {
          derivedFailures.push("temporary_effect_persistence");
        }
        if (!diagnostics.pre_period_rolling_backtest.pass) {
          derivedFailures.push("pre_period_rolling_backtest");
        }
        if (!diagnostics.residual_autocorrelation_check.pass) {
          derivedFailures.push("residual_autocorrelation");
        }
        if (!diagnostics.pre_period_fit_check.pass) derivedFailures.push("pre_period_fit");
        if (!diagnostics.design_matrix_identifiability.pass) {
          derivedFailures.push("design_matrix_identifiability");
        }
        if (!uniqueSetsEqual(derivedFailures, diagnosticFailing)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["diagnostics", "failing_diagnostics"],
            message: "V2 diagnostic failures must be derived from executed check results"
          });
        }

        const design = diagnostics.design_matrix_identifiability;
        const designPass =
          design.rank === design.parameter_count &&
          design.parameter_count === 5 + controls.control_names.length &&
          design.condition_number > 0 &&
          design.condition_number <= 1_000_000;
        if (!design.pass || design.pass !== designPass) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["diagnostics", "design_matrix_identifiability", "pass"],
            message: "design-matrix pass must be derived from rank and condition number"
          });
        }
        const residual = diagnostics.residual_autocorrelation_check;
        if (residual.pass !== (Math.abs(residual.rho_estimate) <= 0.9)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["diagnostics", "residual_autocorrelation_check", "pass"],
            message: "AR1 diagnostic pass must be derived from the post-hoc rho estimate"
          });
        }
        const preFit = diagnostics.pre_period_fit_check;
        if (preFit.pass !== (preFit.pre_period_observed_sd > 0)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["diagnostics", "pre_period_fit_check", "pass"],
            message: "pre-period fit pass must be derived from observed residual spread"
          });
        }
        const backtest = diagnostics.pre_period_rolling_backtest;
        const expectedBacktestThreshold =
          COMPILED_BACKTEST_RMSE_PRE_SD_MULTIPLIER *
          Math.max(backtest.train_residual_sd, 1e-9);
        const backtestPass =
          backtest.holdout_rmse <= backtest.rmse_threshold;
        if (
          !numbersNearlyEqual(backtest.rmse_threshold, expectedBacktestThreshold) ||
          backtest.pass !== backtestPass
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["diagnostics", "pre_period_rolling_backtest"],
            message: "backtest threshold and pass must be derived from the compiled RMSE gate"
          });
        }
        const lag = diagnostics.lag_sensitivity_check;
        const diagnosticPreSd = Math.max(preFit.pre_period_observed_sd, 1e-9);
        const expectedEarlyPostThreshold = Math.max(
          COMPILED_EARLY_POST_SPIKE_ABSOLUTE_FLOOR,
          COMPILED_EARLY_POST_SPIKE_PRE_SD_MULTIPLIER * diagnosticPreSd
        );
        const expectedEvaluationThreshold =
          COMPILED_EVALUATION_MOVEMENT_PRE_SD_MULTIPLIER * diagnosticPreSd;
        const lagPass = !(
          lag.early_post_direction_adjusted_residual_max > lag.early_post_threshold &&
          lag.evaluation_direction_adjusted_residual_mean < lag.evaluation_movement_threshold
        );
        if (
          !numbersNearlyEqual(lag.early_post_threshold, expectedEarlyPostThreshold) ||
          !numbersNearlyEqual(
            lag.evaluation_movement_threshold,
            expectedEvaluationThreshold
          ) ||
          lag.pass !== lagPass ||
          lag.approved_lag_windows !== artifact.vbd_exposure_evidence.lag_windows
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["diagnostics", "lag_sensitivity_check", "pass"],
            message: "lag pass state must be derived from the emitted smoke gate"
          });
        }
        const commonShock = diagnostics.common_shock_sensitivity_check;
        const maxControlShift = Math.max(
          0,
          ...commonShock.control_shift_summaries.map((summary) =>
            Math.abs(summary.evaluation_minus_pre_standardized_shift)
          )
        );
        if (
          !numbersNearlyEqual(commonShock.max_abs_evaluation_control_shift, maxControlShift) ||
          commonShock.compiled_shift_gate !== COMPILED_COMMON_SHOCK_SHIFT_GATE ||
          commonShock.pass !== (maxControlShift <= commonShock.compiled_shift_gate) ||
          !orderedValuesEqual(commonShock.approved_controls_retained, controls.control_names) ||
          !orderedValuesEqual(
            commonShock.control_shift_summaries.map((summary) => summary.control_name),
            controls.control_names
          )
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["diagnostics", "common_shock_sensitivity_check"],
            message: "common-shock diagnostics must match approved controls and their derived gate"
          });
        }
        const persistence = diagnostics.temporary_effect_persistence_check;
        const expectedPersistenceSpikeThreshold = Math.max(
          COMPILED_TEMPORARY_SPIKE_ABSOLUTE_FLOOR,
          COMPILED_TEMPORARY_SPIKE_PRE_SD_MULTIPLIER * diagnosticPreSd
        );
        const expectedPersistenceSlopeThreshold =
          COMPILED_TEMPORARY_PERSISTENCE_SLOPE_PRE_SD_MULTIPLIER * diagnosticPreSd;
        const persistenceThresholdsPresent =
          persistence.spike_threshold !== undefined &&
          persistence.slope_threshold !== undefined;
        const persistencePass = persistenceThresholdsPresent
          ? !(
              persistence.evaluation_residual_max > persistence.spike_threshold! &&
              persistence.evaluation_residual_slope < persistence.slope_threshold!
            )
          : false;
        if (
          persistenceThresholdsPresent !==
            (persistence.evaluation_window_refs.length >= 3) ||
          (persistenceThresholdsPresent &&
            (!numbersNearlyEqual(
              persistence.spike_threshold!,
              expectedPersistenceSpikeThreshold
            ) ||
              !numbersNearlyEqual(
                persistence.slope_threshold!,
                expectedPersistenceSlopeThreshold
              ))) ||
          persistence.pass !== persistencePass ||
          !orderedValuesEqual(
            persistence.evaluation_window_refs,
            artifact.baseline_and_post_window_evidence.evaluation_window_refs
          )
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["diagnostics", "temporary_effect_persistence_check"],
            message: "persistence diagnostics must match evaluation windows and the emitted gate"
          });
        }
      }
    }
    if (artifact.governance_state.state === "HOLD" && failing.size === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["governance_state", "failing_diagnostics"],
        message: "HOLD artifacts must name at least one failing diagnostic"
      });
    }
    if (artifact.governance_state.state !== "HOLD" && failing.size > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["governance_state", "failing_diagnostics"],
        message: "non-HOLD artifacts must not name failing diagnostics"
      });
    }
    if (artifact.governance_state.state !== "HOLD" && artifact.posterior_estimand_summary === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["posterior_estimand_summary"],
        message: "non-HOLD artifacts require posterior estimand summary"
      });
    }
    if (
      artifact.posterior_estimand_summary !== null &&
      artifact.posterior_estimand_summary.credible_interval_80.lower >
        artifact.posterior_estimand_summary.credible_interval_80.upper
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["posterior_estimand_summary", "credible_interval_80"],
        message: "posterior credible interval bounds must be ordered"
      });
    }
    if (
      artifact.posterior_estimand_summary !== null &&
      artifact.posterior_estimand_summary.estimand_name !==
        artifact.counterfactual_derivation.estimand_name
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["counterfactual_derivation", "estimand_name"],
        message: "counterfactual derivation estimand must match posterior estimand"
      });
    }
    if (
      artifact.vbd_exposure_evidence.lag_windows !==
      artifact.hypothesis_binding.expected_outcome_signal_lag_windows
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["vbd_exposure_evidence", "lag_windows"],
        message: "VBD exposure lag must match the approved hypothesis lag"
      });
    }
    const fittedPathway =
      "posterior_direction_beta_velocity" in artifact.behavior_outcome_pathway_evidence;
    if (fittedPathway) {
      const movementChecks = artifact.vbd_exposure_evidence.movement_checks;
      const pathway = artifact.behavior_outcome_pathway_evidence;
      const movementPairs = [
        ["velocity", pathway.velocity_moved_as_expected, movementChecks.velocity.moved_as_expected],
        ["breadth", pathway.breadth_moved_as_expected, movementChecks.breadth.moved_as_expected],
        ["depth", pathway.depth_moved_as_expected, movementChecks.depth.moved_as_expected]
      ] as const;
      for (const [dimension, pathwayValue, movementValue] of movementPairs) {
        if (pathwayValue !== movementValue) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["behavior_outcome_pathway_evidence", `${dimension}_moved_as_expected`],
            message: "pathway movement booleans must match VBD movement checks"
          });
        }
      }
    }
    if (
      isV2 &&
      fittedPathway &&
      artifact.diagnostics.fit_summary_hash !== null &&
      artifact.posterior_estimand_summary !== null
    ) {
      const pathway = artifact.behavior_outcome_pathway_evidence;
      const posterior = artifact.posterior_estimand_summary;
      const meaningfulMovement =
        posterior.internal_draw_share_diagnostics
          .movement_exceeds_compiled_synthetic_smoke_minimum_draw_share >=
          COMPILED_MEANINGFUL_DRAW_SHARE_SMOKE_FLOOR &&
        posterior.credible_interval_80.lower > 0;
      const expectedPathwayState =
        diagnosticFailing.length > 0
          ? "HOLD"
          : meaningfulMovement
            ? "INTERNAL_SMOKE_CONTRAST_OBSERVED"
            : posterior.internal_draw_share_diagnostics.movement_greater_than_zero_draw_share >
                COMPILED_DIRECTIONAL_DRAW_SHARE_SMOKE_FLOOR
              ? "INTERNAL_SMOKE_DIRECTIONAL_ONLY"
              : "NO_INTERNAL_SMOKE_MOVEMENT";
      if (
        pathway.pathway_state !== expectedPathwayState ||
        pathway.meaningful_primary_outcome_movement_supported !== meaningfulMovement ||
        pathway.approved_lag_respected !== artifact.diagnostics.lag_sensitivity_check.pass ||
        posterior.compiled_synthetic_smoke_minimum_movement !==
          COMPILED_SYNTHETIC_SMOKE_MINIMUM_MOVEMENT
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["behavior_outcome_pathway_evidence"],
          message: "V2 pathway state must be derived from bound smoke diagnostics and contrast"
        });
      }
    }
    if (isV2) {
      for (const [index, snapshot] of artifact.ai_fluency_snapshot_evidence.entries()) {
        const standardErrors = [
          snapshot.overall_standard_error,
          ...AIFluencyDimensions.map(
            (dimension) => snapshot.dimension_standard_errors[dimension]
          )
        ];
        if (
          standardErrors.some(
            (value) =>
              value !== null && (!Number.isFinite(value) || value <= 0)
          )
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["ai_fluency_snapshot_evidence", index],
            message: "V2 aggregate uncertainty must be strictly positive when present"
          });
        }
        const hasMissingUncertainty = standardErrors.some((value) => value === null);
        if (
          (snapshot.measurement_uncertainty_state ===
            "aggregate_uncertainty_available" &&
            hasMissingUncertainty) ||
          (snapshot.measurement_uncertainty_state === "missing_uncertainty_visible" &&
            !hasMissingUncertainty)
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["ai_fluency_snapshot_evidence", index, "measurement_uncertainty_state"],
            message: "V2 uncertainty state must match complete or visibly missing aggregate SEs"
          });
        }
      }
    }
    if (artifact.governance_state.state !== "HOLD") {
      const diagnostics = artifact.diagnostics as Record<string, unknown>;
      const diagnosticChecks = [
        "design_matrix_identifiability",
        "residual_autocorrelation_check",
        "pre_period_fit_check",
        "pre_period_rolling_backtest",
        "lag_sensitivity_check",
        "common_shock_sensitivity_check",
        "temporary_effect_persistence_check"
      ] as const;
      for (const check of diagnosticChecks) {
        const section = diagnostics[check];
        if (!section || typeof section !== "object" || (section as Record<string, unknown>).pass !== true) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["diagnostics", check],
            message: "non-HOLD artifacts require every diagnostic check to pass"
          });
        }
      }
      if (!isV2) {
        for (const check of [
          "placebo_intervention_date_check",
          "counterfactual_stability_check",
          "prior_sensitivity_check"
        ] as const) {
          const section = diagnostics[check];
          if (!section || typeof section !== "object" || (section as Record<string, unknown>).pass !== true) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["diagnostics", check],
              message: "legacy non-HOLD artifacts require every legacy diagnostic check to pass"
            });
          }
        }
      }
    }
    if (
      artifact.design_route.evidence_design === "STAGGERED_ROLLOUT" &&
      artifact.design_route.decision !== "HOLD_UNSUPPORTED_STAGGERED_EVENT_STUDY"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["design_route", "decision"],
        message: "staggered rollout must HOLD until event-study logic exists"
      });
    }
    if (
      artifact.design_route.evidence_design === "BASELINE_ONLY" &&
      artifact.design_route.decision !== "HOLD_INSUFFICIENT_LONGITUDINAL_EVIDENCE"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["design_route", "decision"],
        message: "baseline-only designs must HOLD"
      });
    }
    if (
      artifact.design_route.decision === "ROUTE_LONGITUDINAL_SYNTHETIC_PROTOTYPE" &&
      !["HISTORICAL_STATE_SPACE", "REPEATED_PRE_POST"].includes(
        artifact.design_route.evidence_design
      )
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["design_route"],
        message: "only historical/repeated designs may route to the longitudinal synthetic slice"
      });
    }
    if (
      artifact.design_route.decision === "ROUTE_COMPARISON_SUPPORTED_DID" ||
      artifact.design_route.module === "comparison_supported_bayesian_did_module"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["design_route"],
        message: "DiD routes must use the DiD artifact schema, not the longitudinal proof schema"
      });
    }
    if (
      artifact.governance_state.state !== "HOLD" &&
      (artifact.design_route.decision !== "ROUTE_LONGITUDINAL_SYNTHETIC_PROTOTYPE" ||
        artifact.design_route.module !== LONGITUDINAL_MODEL_SLICE)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["design_route"],
        message: "non-HOLD longitudinal artifacts must use the longitudinal smoke route"
      });
    }
    if (artifact.governance_state.state !== "HOLD") {
      for (const [index, snapshot] of artifact.ai_fluency_snapshot_evidence.entries()) {
        if (snapshot.measurement_uncertainty_state !== "aggregate_uncertainty_available") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["ai_fluency_snapshot_evidence", index, "measurement_uncertainty_state"],
            message: "non-HOLD longitudinal artifacts require aggregate AI Fluency uncertainty"
          });
        }
        if (typeof snapshot.overall_standard_error !== "number" || !Number.isFinite(snapshot.overall_standard_error) || snapshot.overall_standard_error < 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["ai_fluency_snapshot_evidence", index, "overall_standard_error"],
            message: "non-HOLD longitudinal artifacts require nonnegative aggregate standard error"
          });
        }
        for (const dimension of AIFluencyDimensions) {
          const se = snapshot.dimension_standard_errors[dimension];
          if (typeof se !== "number" || !Number.isFinite(se) || se < 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["ai_fluency_snapshot_evidence", index, "dimension_standard_errors", dimension],
              message: "non-HOLD longitudinal artifacts require complete dimension standard errors"
            });
          }
        }
      }
    }
    if (isV2) {
      if (
        windowEvidence.all_required_windows_observed !==
          (windowEvidence.missing_window_refs.length === 0) ||
        windowEvidence.all_required_windows_unsuppressed !==
          (windowEvidence.suppressed_window_refs.length === 0) ||
        windowEvidence.all_required_windows_fresh !==
          (windowEvidence.stale_window_refs.length === 0) ||
        windowEvidence.imputation_used !== (windowEvidence.imputed_window_refs.length > 0) ||
        new Set(windowEvidence.evaluation_window_refs).size !==
          windowEvidence.evaluation_window_refs.length
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["baseline_and_post_window_evidence"],
          message: "V2 window-state booleans must be derived from unique emitted window refs"
        });
      }
      const completeLongitudinalWindows =
        windowEvidence.baseline_window_count >= 8 &&
        windowEvidence.post_window_count >= 3 &&
        windowEvidence.all_required_windows_observed &&
        windowEvidence.all_required_windows_unsuppressed &&
        windowEvidence.all_required_windows_fresh &&
        !windowEvidence.imputation_used;
      const routeByDesign: Partial<
        Record<
          z.infer<typeof EvidenceDesignSchema>,
          {
            decision: string;
            module: string | null;
            claimCap: string;
            diagnostic: string | null;
          }
        >
      > = {
        HISTORICAL_STATE_SPACE: completeLongitudinalWindows
          ? {
              decision: "ROUTE_LONGITUDINAL_SYNTHETIC_PROTOTYPE",
              module: LONGITUDINAL_MODEL_SLICE,
              claimCap: "internal_synthetic_noncausal_contribution_alignment_review",
              diagnostic: null
            }
          : {
              decision: "HOLD_INSUFFICIENT_LONGITUDINAL_EVIDENCE",
              module: null,
              claimCap: "HOLD",
              diagnostic: "insufficient_longitudinal_evidence"
            },
        REPEATED_PRE_POST: completeLongitudinalWindows
          ? {
              decision: "ROUTE_LONGITUDINAL_SYNTHETIC_PROTOTYPE",
              module: LONGITUDINAL_MODEL_SLICE,
              claimCap: "internal_synthetic_noncausal_contribution_alignment_review",
              diagnostic: null
            }
          : {
              decision: "HOLD_INSUFFICIENT_LONGITUDINAL_EVIDENCE",
              module: null,
              claimCap: "HOLD",
              diagnostic: "insufficient_longitudinal_evidence"
            },
        STAGGERED_ROLLOUT: {
          decision: "HOLD_UNSUPPORTED_STAGGERED_EVENT_STUDY",
          module: null,
          claimCap: "HOLD",
          diagnostic: "unsupported_staggered_event_study"
        },
        BASELINE_ONLY: {
          decision: "HOLD_INSUFFICIENT_LONGITUDINAL_EVIDENCE",
          module: null,
          claimCap: "HOLD",
          diagnostic: "baseline_only_no_contribution_confidence"
        },
        CONTROLLED_TEST: {
          decision: "HOLD_UNSUPPORTED_CONTROLLED_TEST_MODEL",
          module: null,
          claimCap: "HOLD",
          diagnostic: "unsupported_controlled_test_model"
        },
        MATCHED_COMPARISON: {
          decision: "HOLD_UNSUPPORTED_CONTROLLED_TEST_MODEL",
          module: null,
          claimCap: "HOLD",
          diagnostic: "unsupported_controlled_test_model"
        }
      };
      const expectedRoute = routeByDesign[artifact.design_route.evidence_design];
      if (
        !expectedRoute ||
        artifact.design_route.decision !== expectedRoute.decision ||
        artifact.design_route.module !== expectedRoute.module ||
        artifact.design_route.claim_cap !== expectedRoute.claimCap ||
        artifact.design_route.routing_diagnostic !== expectedRoute.diagnostic
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["design_route"],
          message: "V2 design route must be derived from the approved design and window evidence"
        });
      }
    }
    if (
      artifact.governance_state.state !== "HOLD" &&
      (windowEvidence.baseline_window_count < 8 ||
        windowEvidence.post_window_count < 3 ||
        !windowEvidence.all_required_windows_observed ||
        !windowEvidence.all_required_windows_unsuppressed ||
        !windowEvidence.all_required_windows_fresh ||
        windowEvidence.imputation_used)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["baseline_and_post_window_evidence"],
        message: "eligible/non-authorizing longitudinal artifacts require complete windows"
      });
    }
    const forbiddenFields = collectForbiddenFields(artifact);
    if (forbiddenFields.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [],
        message: `forbidden unsafe fields present: ${forbiddenFields.sort().join(", ")}`
      });
    }
    const unsafeValues = collectUnsafeValues(artifact);
    if (unsafeValues.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [],
        message: "unsafe person-level, confidence, probability, ROI, finance, HR, or productivity values present"
      });
    }
    for (const fieldName of ForbiddenOutputFieldNames) {
      if ((artifact as Record<string, unknown>)[fieldName] !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [fieldName],
          message: `${fieldName} is not allowed on longitudinal proof artifacts`
        });
      }
    }
    const unsafeControlEvidence = [
      ...artifact.business_control_evidence.control_names,
      ...artifact.business_control_evidence.control_source_refs
    ].filter((value) => unsafeControlPatterns.some((pattern) => pattern.test(value)));
    if (unsafeControlEvidence.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["business_control_evidence"],
        message: "unsafe HR/personnel/productivity control evidence must not cross the bridge"
      });
    }
}

export const LongitudinalSyntheticOutcomeProofV1ArtifactSchema =
  LongitudinalSyntheticOutcomeProofV1ArtifactObjectSchema.superRefine(
    validateLongitudinalSyntheticOutcomeProofArtifact
  );

export const LongitudinalSyntheticOutcomeProofV2ArtifactSchema =
  LongitudinalSyntheticOutcomeProofV2ArtifactObjectSchema.superRefine(
    validateLongitudinalSyntheticOutcomeProofArtifact
  );

export const LongitudinalSyntheticOutcomeProofArtifactSchema =
  LongitudinalSyntheticOutcomeProofArtifactDiscriminatedUnionSchema.superRefine(
    validateLongitudinalSyntheticOutcomeProofArtifact
  );

export type LongitudinalSyntheticOutcomeProofV1Artifact = z.infer<
  typeof LongitudinalSyntheticOutcomeProofV1ArtifactSchema
>;
export type LongitudinalSyntheticOutcomeProofV2Artifact = z.infer<
  typeof LongitudinalSyntheticOutcomeProofV2ArtifactSchema
>;
export type LongitudinalSyntheticOutcomeProofArtifact =
  | LongitudinalSyntheticOutcomeProofV1Artifact
  | LongitudinalSyntheticOutcomeProofV2Artifact;
export type LongitudinalFailingDiagnostic = z.infer<typeof LongitudinalFailingDiagnosticSchema>;
