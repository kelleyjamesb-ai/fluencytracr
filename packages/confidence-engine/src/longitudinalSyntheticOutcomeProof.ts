import { z } from "zod";
import { sha256Json } from "./internal/hashing";

export const LONGITUDINAL_SYNTHETIC_OUTCOME_PROOF_SCHEMA_VERSION =
  "FT_AI_VALUE_LONGITUDINAL_SYNTHETIC_OUTCOME_PROOF_2026_07";

export const LONGITUDINAL_MODEL_FAMILY =
  "bayesian_ai_value_realization_and_human_transformation_model_family";

export const LONGITUDINAL_MODEL_SLICE = "first_longitudinal_synthetic_model_slice";

const Sha256HexSchema = z.string().regex(/^[0-9a-f]{64}$/);

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
  /\b(?:respondent|employee|user|person|session)(?:[_:/-](?:id[_:/-]?)?)?[0-9a-f]{3,}\b/i,
  /\b(?:confidence\s*(?:percentage|percent)|probability|impact\s*probability)\b/i,
  /\b(?:roi|ebita|ebitda|financial attribution|customer-facing financial output)\b/i,
  /\b(?:hris|manager ranking|team ranking|department ranking|employee productivity|performance review|compensation)\b/i
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
  /productivity/i
];

function normalizeKey(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
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

function collectUnsafeValues(value: unknown, values: string[] = []): string[] {
  if (typeof value === "string") {
    if (unsafeValuePatterns.some((pattern) => pattern.test(value))) values.push(value);
    return values;
  }
  if (!value || typeof value !== "object") return values;
  if (Array.isArray(value)) {
    value.forEach((item) => collectUnsafeValues(item, values));
    return values;
  }
  for (const nested of Object.values(value as Record<string, unknown>)) {
    collectUnsafeValues(nested, values);
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
    minimum_worthwhile_change: z.number(),
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

const AIFluencySnapshotEvidenceSchema = z
  .object({
    snapshot_id: z.string().min(1),
    source_ref: z.string().min(1),
    source_hash: Sha256HexSchema,
    overall_ai_fluency_score: z.number(),
    dimension_scores: z
      .object({
        confidence: z.number(),
        usage_quality: z.number(),
        behavior_change: z.number(),
        leadership_reinforcement: z.number(),
        capability_growth: z.number()
      })
      .strict(),
    overall_standard_error: z.number().nullable(),
    dimension_standard_errors: z.record(z.union([z.number(), z.null()])),
    measurement_uncertainty_state: z.enum([
      "aggregate_uncertainty_available",
      "missing_uncertainty_visible"
    ]),
    aggregate_only: z.literal(true),
    person_level_data_present: z.literal(false)
  })
  .strict();

const PosteriorEstimandSummarySchema = z
  .object({
    estimand_name: z.literal("historical_counterfactual_outcome_movement"),
    posterior_mean_movement: z.number(),
    posterior_sd: z.number().nonnegative(),
    credible_interval_80: z
      .object({
        lower: z.number(),
        upper: z.number()
      })
      .strict(),
    internal_draw_share_diagnostics: z
      .object({
        not_probability_output: z.literal(true),
        not_customer_facing: z.literal(true),
        movement_greater_than_zero_draw_share: z.number().min(0).max(1),
        movement_exceeds_synthetic_fixture_minimum_draw_share: z.number().min(0).max(1)
      })
      .strict(),
    synthetic_fixture_minimum_worthwhile_change: z.number()
  })
  .strict();

const DiagnosticsSchema = z.union([
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
      design_matrix_identifiability: z.record(z.unknown()),
      residual_autocorrelation_check: z.record(z.unknown()),
      pre_period_fit_check: z.record(z.unknown()),
      pre_period_rolling_backtest: z.record(z.unknown()),
      placebo_intervention_date_check: z.record(z.unknown()),
      counterfactual_stability_check: z.record(z.unknown()),
      lag_sensitivity_check: z.record(z.unknown()),
      common_shock_sensitivity_check: z.record(z.unknown()),
      temporary_effect_persistence_check: z.record(z.unknown()),
      prior_sensitivity_check: z.record(z.unknown())
    })
    .strict()
]);

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

export const LongitudinalSyntheticOutcomeProofArtifactSchema = z
  .object({
    schema_version: z.literal(LONGITUDINAL_SYNTHETIC_OUTCOME_PROOF_SCHEMA_VERSION),
    artifact_class: z.literal("internal_synthetic_longitudinal_outcome_proof"),
    generated_at: z.string().min(1),
    harness_version: z.string().min(1),
    model_family: z.literal(LONGITUDINAL_MODEL_FAMILY),
    model_slice: z.literal(LONGITUDINAL_MODEL_SLICE),
    design_route: RouteSchema,
    hypothesis_binding: HypothesisBindingSchema,
    primary_metric_binding: z.record(z.unknown()),
    baseline_and_post_window_evidence: WindowEvidenceSchema,
    ai_fluency_snapshot_evidence: z.array(AIFluencySnapshotEvidenceSchema).nonempty(),
    vbd_exposure_evidence: z.record(z.unknown()),
    business_control_evidence: z
      .object({
        control_names: z.array(z.string()).max(4),
        control_source_refs: z.array(z.string()),
        synthetic_aggregate_placeholders_only: z.literal(true),
        unsafe_control_refs_redacted: z.boolean(),
        hris_or_personnel_fields_present: z.literal(false),
        source_hashes: z.array(Sha256HexSchema)
      })
      .strict(),
    model_specification: z
      .object({
        likelihood_family: z.literal("continuous_normal_identity"),
        link_function: z.literal("identity"),
        residual_structure: z.literal("ar1_residual_structure"),
        sampler_kind: z.string().min(1),
        chains: z.number().int().gte(0),
        synthetic_smoke_only: z.literal(true),
        replicated_calibration_complete: z.literal(false)
      })
      .strict(),
    posterior_estimand_summary: PosteriorEstimandSummarySchema.nullable(),
    behavior_outcome_pathway_evidence: z.record(z.unknown()),
    diagnostics: DiagnosticsSchema,
    counterfactual_derivation: z.record(z.unknown()),
    evidence_design_claim_cap: z.record(z.unknown()),
    governance_state: z
      .object({
        state: z.enum(["eligible_internal_smoke_only", "valid_internal_non_authorizing", "HOLD"]),
        failing_diagnostics: z.array(LongitudinalFailingDiagnosticSchema),
        full_pathway_coherence_authorized: z.literal(false),
        customer_output_authorized: z.literal(false),
        probability_output_authorized: z.literal(false),
        confidence_output_authorized: z.literal(false),
        promotion_decision_ref: z.null()
      })
      .strict(),
    synthetic_generator: z
      .object({
        generator_id: z.string().min(1),
        generator_version: z.string().min(1),
        scenario: z.string().min(1),
        seed: z.number().int(),
        synthetic_input_hash: Sha256HexSchema,
        real_data_present: z.literal(false),
        customer_data_present: z.literal(false),
        production_data_present: z.literal(false),
        live_data_source_present: z.literal(false),
        ground_truth: z.record(z.unknown())
      })
      .strict(),
    source_hashes: z
      .object({
        hypothesis_plan_hash: Sha256HexSchema,
        ai_fluency_snapshot_hashes: z.array(Sha256HexSchema).nonempty(),
        control_source_hashes: z.array(Sha256HexSchema),
        vbd_source_hash: Sha256HexSchema,
        outcome_source_hash: Sha256HexSchema
      })
      .strict(),
    hash_bindings: z
      .object({
        synthetic_input_hash: Sha256HexSchema,
        source_hashes_hash: Sha256HexSchema,
        artifact_self_hash: Sha256HexSchema
      })
      .strict(),
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
  })
  .strict()
  .superRefine((artifact, ctx) => {
    if (artifact.hash_bindings.synthetic_input_hash !== artifact.synthetic_generator.synthetic_input_hash) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hash_bindings", "synthetic_input_hash"],
        message: "synthetic input hash binding must match synthetic generator hash"
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
    if (JSON.stringify(snapshotHashes) !== JSON.stringify(artifact.source_hashes.ai_fluency_snapshot_hashes)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["source_hashes", "ai_fluency_snapshot_hashes"],
        message: "AI Fluency snapshot source hashes must match snapshot evidence"
      });
    }
    const failing = new Set(artifact.governance_state.failing_diagnostics);
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
    const windowEvidence = artifact.baseline_and_post_window_evidence;
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
  });

export type LongitudinalSyntheticOutcomeProofArtifact = z.infer<
  typeof LongitudinalSyntheticOutcomeProofArtifactSchema
>;
export type LongitudinalFailingDiagnostic = z.infer<typeof LongitudinalFailingDiagnosticSchema>;
