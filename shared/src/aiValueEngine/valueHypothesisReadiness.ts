/**
 * AI Value Engine - Value Hypothesis Readiness.
 *
 * Contract-only readiness packet derived from a validated Measurement Plan and
 * Claim Readiness Snapshot. It is an internal operating object, not an ROI
 * calculator, confidence model, customer-facing economic readout, or causal
 * attribution engine.
 */

import {
  AI_VALUE_CLAIM_READINESS_SNAPSHOT_SCHEMA_VERSION,
  type ClaimReadinessSnapshot,
  validateClaimReadinessSnapshot
} from "./claimReadinessSnapshot";
import {
  MEASUREMENT_PLAN_SCHEMA_VERSION,
  validateMeasurementPlan
} from "./measurementPlan";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_HYPOTHESIS_READINESS_VALIDATION_2026_06";

export const AI_VALUE_HYPOTHESIS_READINESS_SCHEMA_VERSION =
  "FT_AI_VALUE_HYPOTHESIS_READINESS_2026_06";

const DERIVATION_VERSION =
  "ai_value_hypothesis_readiness_builder_2026_06";

const REQUIRED_FIELDS = [
  "schema_version",
  "value_hypothesis_readiness_id",
  "org_id",
  "measurement_plan_id",
  "claim_readiness_snapshot_id",
  "evidence_snapshot_id",
  "workflow",
  "window",
  "alignment_keys",
  "value_hypothesis",
  "readiness_state",
  "contribution_evidence_tier",
  "allowed_review_modes",
  "factors",
  "quality_gates",
  "review_boundaries",
  "suppression",
  "holds",
  "required_caveats",
  "blocked_claims",
  "blocked_uses",
  "source_refs",
  "source_provenance",
  "derived_from",
  "validation",
  "persistence_policy",
  "created_at",
  "derivation_version"
] as const;

const ALLOWED_READINESS_STATES = new Set([
  "SUPPRESSED",
  "NOT_READY",
  "PLANNING_READY",
  "EVIDENCE_REVIEW_READY",
  "BUSINESS_OWNER_REVIEW_READY",
  "FINANCE_CONTEXT_INVESTIGATION_READY"
]);

const ALLOWED_CONTRIBUTION_TIERS = new Set([
  "NONE",
  "DIRECTIONAL_ALIGNMENT",
  "PRE_POST_SUPPORTED",
  "MATCHED_COMPARISON_READY",
  "CONTROLLED_TEST_READY",
  "CALIBRATED_ATTRIBUTION_READY"
]);

const ALLOWED_REVIEW_MODES = new Set([
  "hold",
  "collect_missing_aggregate_evidence",
  "internal_evidence_review",
  "business_owner_value_hypothesis_review",
  "finance_context_investigation_packet"
]);

const ALLOWED_FACTOR_STATES = new Set([
  "missing",
  "held",
  "present",
  "not_required",
  "blocked"
]);

const ALLOWED_COMPARISON_DESIGNS = new Set([
  "none",
  "baseline_only",
  "pre_post",
  "matched_comparison_candidate",
  "customer_owned_research_design_candidate",
  "experimental_holdout_documented"
]);

const REQUIRED_BLOCKED_CLAIMS = [
  "roi_proof",
  "causality_claim",
  "productivity_claim",
  "ebita_claim",
  "headcount_reduction_claim",
  "individual_scoring",
  "team_or_manager_ranking",
  "people_decisioning",
  "customer_facing_economic_output"
];

const REQUIRED_BLOCKED_USES = [
  "realized_roi",
  "causality_claim",
  "productivity_claim",
  "ebita_claim",
  "headcount_reduction_claim",
  "individual_attribution",
  "manager_or_team_ranking",
  "people_decisioning",
  "customer_facing_financial_output"
];

const UNSAFE_PRIVACY_FLAGS = [
  "contains_direct_identifiers",
  "contains_raw_content",
  "contains_person_level_productivity",
  "contains_person_level_hris_records",
  "contains_hashed_or_joinable_person_identifiers",
  "contains_manager_or_team_ranking",
  "contains_people_decisioning",
  "contains_compensation_or_performance_inference",
  "contains_promotion_or_discipline_inference",
  "contains_attrition_prediction",
  "contains_hris_inference_from_ai_usage"
];

const FORBIDDEN_FIELD_KEY_PATTERNS = [
  /confidence_percent/i,
  /ai_contribution_confidence/i,
  /attribution_probability/i,
  /probability/i,
  /confidence_score/i,
  /confidence_adjusted_roi/i,
  /roi_(?:value|amount|calculation|result|proof_allowed)/i,
  /ebita_(?:value|amount|impact|calculation|result)/i,
  /ebitda_(?:value|amount|impact|calculation|result)/i,
  /dollar(?:ized)?_(?:value|amount|impact|output)/i,
  /hours?_saved/i,
  /time_saved_(?:value|amount|impact)/i,
  /productivity_lift/i,
  /financial_impact/i,
  /causal(?:ity)?_(?:delta|effect|proof|probability)/i,
  /raw_(?:prompt|response|transcript|content|rows?)/i,
  /prompt/i,
  /response/i,
  /transcript/i,
  /query_text/i,
  /sql_text/i,
  /file_content/i,
  /email/i,
  /user_id/i,
  /employee_id/i,
  /direct_person_identifier/i,
  /person_(?:id|identifier)/i,
  /hashed_(?:user|person|employee)_id/i,
  /joinable_(?:user|person|employee)_identifier/i,
  /person_level_hris/i,
  /person_level_productivity/i,
  /manager_ranking/i,
  /team_ranking/i,
  /compensation/i,
  /performance_rating/i,
  /promotion/i,
  /discipline/i,
  /attrition_prediction/i,
  /hris_inference/i
];

const GOVERNED_KEY_ALLOWLIST = new Set([
  "blocked_claims",
  "blocked_uses",
  "review_boundaries",
  "roi_proof_allowed",
  "causality_claim_allowed",
  "productivity_claim_allowed",
  "ebita_claim_allowed",
  "headcount_reduction_claim_allowed",
  "team_or_manager_ranking_allowed",
  "customer_facing_output_allowed",
  "financial_output_allowed",
  "roi_bot_context",
  "source_refs",
  "source_provenance",
  "emits_probability",
  "no_confidence_percent",
  "pull_date",
  "aggregate_workforce_context",
  "contains_direct_identifiers",
  "contains_raw_content",
  "contains_person_level_productivity",
  "contains_person_level_hris_records",
  "contains_hashed_or_joinable_person_identifiers",
  "contains_manager_or_team_ranking",
  "contains_people_decisioning",
  "contains_compensation_or_performance_inference",
  "contains_promotion_or_discipline_inference",
  "contains_attrition_prediction",
  "contains_hris_inference_from_ai_usage"
]);

const UNSAFE_LANGUAGE_PATTERNS = [
  /\bproved\b/i,
  /\bcaused\b/i,
  /\battributed\b/i,
  /\battribution\b/i,
  /\bROI\b/i,
  /\bsavings\b/i,
  /\bpayback\b/i,
  /\bEBITA(?:DA)? impact\b/i,
  /\bproductivity lift\b/i,
  /\bAI contribution\s*%/i,
  /\bconfidence\s*%/i,
  /\bvalue proof\b/i
];

const SEMANTIC_ALLOWLIST_PATH_PATTERNS = [
  /blocked_claims/,
  /blocked_uses/,
  /required_caveats/,
  /source_refs/,
  /source_provenance/,
  /review_boundaries/,
  /roi_bot_context/,
  /persistence_policy/,
  /derived_from/
];

export const ValueHypothesisReadinessSchema = {
  schema_version: AI_VALUE_HYPOTHESIS_READINESS_SCHEMA_VERSION,
  required_fields: [...REQUIRED_FIELDS],
  allowed_readiness_states: [...ALLOWED_READINESS_STATES],
  allowed_contribution_evidence_tiers: [...ALLOWED_CONTRIBUTION_TIERS],
  required_blocked_claims: REQUIRED_BLOCKED_CLAIMS,
  persistence_policy: {
    persisted: false,
    creates_migrations: false,
    creates_prisma_schema: false,
    creates_backend_routes: false,
    creates_frontend_ui: false,
    creates_ingestion_jobs: false
  }
} as const;

export interface ValueHypothesisReadinessValidationResult {
  schema_version: string;
  value_hypothesis_readiness_id: string | null;
  org_id: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    internal_evidence_review: boolean;
    business_owner_review: boolean;
    finance_context_investigation: boolean;
    customer_facing_output: boolean;
    financial_output: boolean;
  };
}

export interface BuildValueHypothesisReadinessOptions {
  valueHypothesisReadinessId?: string;
  createdAt?: string;
  metricMovementState?: "missing" | "held" | "present";
  assumptionOwnerApproved?: boolean;
  comparisonDesignState?:
    | "none"
    | "baseline_only"
    | "pre_post"
    | "matched_comparison_candidate"
    | "customer_owned_research_design_candidate"
    | "experimental_holdout_documented";
  roiBotContext?: any;
}

export interface ValueHypothesisReadiness {
  schema_version: string;
  value_hypothesis_readiness_id: string;
  org_id: string;
  measurement_plan_id: string;
  claim_readiness_snapshot_id: string;
  evidence_snapshot_id: string;
  workflow: any;
  window: any;
  alignment_keys: {
    org_id: string;
    workflow_id: string | null;
    workflow_family: string | null;
    function_area: string | null;
    cohort_key: string | null;
    baseline_window: { start: string | null; end: string | null };
    comparison_window: { start: string | null; end: string | null };
    metric_id: string | null;
    source_ref: string | null;
    owner_role: string | null;
    review_state: string;
  };
  value_hypothesis: any;
  readiness_state: string;
  contribution_evidence_tier: string;
  allowed_review_modes: string[];
  factors: any;
  quality_gates: any;
  review_boundaries: any;
  suppression: any;
  holds: string[];
  required_caveats: string[];
  blocked_claims: string[];
  blocked_uses: string[];
  source_refs: any;
  source_provenance: any;
  roi_bot_context?: any;
  derived_from: any;
  validation: any;
  persistence_policy: {
    persisted: boolean;
    creates_migrations: boolean;
    creates_prisma_schema: boolean;
    creates_backend_routes: boolean;
    creates_frontend_ui: boolean;
    creates_ingestion_jobs: boolean;
  };
  created_at: string;
  derivation_version: string;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function stringsOf(value: any): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function normalizeKey(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function safeIdPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function requireField(value: any, path: string, gaps: string[]): void {
  if (value === undefined || value === null || value === "") {
    gaps.push(`${path} is missing`);
  }
}

function requireArray(value: any, path: string, gaps: string[]): void {
  if (!Array.isArray(value)) {
    gaps.push(`${path} must be an array`);
  }
}

function requireBoolean(value: any, expected: boolean, path: string, gaps: string[]): void {
  if (value !== expected) {
    gaps.push(`${path} must be ${expected}`);
  }
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function sourceRefAnchor(sourceRefs: any): string | null {
  return String(
    sourceRefs?.bigquery_probe_result_id ??
      sourceRefs?.outcome_evidence_ids?.[0] ??
      sourceRefs?.source_readiness_ids?.[0] ??
      ""
  ) || null;
}

function privacyIsUnsafe(boundary: any): boolean {
  if (boundary?.aggregate_only !== true) return true;
  return UNSAFE_PRIVACY_FLAGS.some((flag) => boundary?.[flag] === true);
}

function suppressionIsActiveOrUnsafe(suppression: any): boolean {
  return suppression?.default_verdict !== "SUPPRESS" ||
    suppression?.hidden_values_exposed !== false ||
    stringsOf(suppression?.suppressed_lanes).length > 0 ||
    stringsOf(suppression?.reason_codes).length > 0;
}

function layerStatus(snapshot: ClaimReadinessSnapshot, layer: string): string {
  return String(snapshot?.playbook_coverage?.[layer]?.status ?? "");
}

function windowsAlign(plan: any, snapshot: ClaimReadinessSnapshot): boolean {
  const baselineStart = plan?.windows?.baseline_window_start ?? null;
  const comparisonEnd =
    plan?.windows?.comparison_window_end ??
    plan?.windows?.baseline_window_end ??
    null;
  return baselineStart === snapshot?.window?.window_start &&
    comparisonEnd === snapshot?.window?.window_end;
}

function deriveComparisonDesign(plan: any, options: BuildValueHypothesisReadinessOptions): string {
  if (options.comparisonDesignState) return options.comparisonDesignState;
  if (
    plan?.windows?.window_alignment_state === "baseline_and_comparison_selected" &&
    plan?.windows?.comparison_window_start &&
    plan?.windows?.comparison_window_end
  ) {
    return "pre_post";
  }
  if (plan?.windows?.baseline_window_start && plan?.windows?.baseline_window_end) {
    return "baseline_only";
  }
  return "none";
}

function contributionTierForComparisonDesign(comparisonDesign: string): string {
  if (comparisonDesign === "experimental_holdout_documented") {
    return "CONTROLLED_TEST_READY";
  }
  if (comparisonDesign === "customer_owned_research_design_candidate") {
    return "CONTROLLED_TEST_READY";
  }
  if (comparisonDesign === "matched_comparison_candidate") {
    return "MATCHED_COMPARISON_READY";
  }
  if (comparisonDesign === "pre_post") {
    return "PRE_POST_SUPPORTED";
  }
  return "NONE";
}

function deriveHolds(factors: any, gates: any): string[] {
  const holds: string[] = [];
  if (!gates.suppression_gates_cleared) holds.push("SUPPRESSION_ACTIVE_OR_UNSAFE");
  if (!gates.aggregate_only) holds.push("AGGREGATE_PRIVACY_BOUNDARY_FAILED");
  if (factors.ai_fluency_movement.state !== "present") holds.push("AI_FLUENCY_MOVEMENT_MISSING");
  if (factors.vbd_movement.state !== "present") holds.push("VBD_MOVEMENT_MISSING");
  if (factors.metric_movement.state !== "present") holds.push("METRIC_MOVEMENT_MISSING");
  if (factors.metric_movement.window_aligned !== true) holds.push("WINDOW_ALIGNMENT_MISMATCH");
  if (factors.assumption_quality.owner_approved !== true) holds.push("ASSUMPTION_OWNER_APPROVAL_MISSING");
  if (gates.source_binding_validated !== true) holds.push("SOURCE_BINDING_MISMATCH");
  if (gates.playbook_coverage_sufficient !== true) holds.push("PLAYBOOK_COVERAGE_INCOMPLETE");
  return uniqueStrings(holds);
}

function deriveReadinessState(factors: any, gates: any): string {
  if (!gates.suppression_gates_cleared || !gates.aggregate_only) return "SUPPRESSED";
  if (!gates.measurement_plan_validated || !gates.claim_readiness_snapshot_validated) {
    return "NOT_READY";
  }
  if (factors.ai_fluency_movement.state !== "present") return "PLANNING_READY";
  if (
    factors.vbd_movement.state !== "present" ||
    factors.metric_movement.state !== "present" ||
    factors.metric_movement.window_aligned !== true ||
    gates.playbook_coverage_sufficient !== true
  ) {
    return "EVIDENCE_REVIEW_READY";
  }
  if (factors.assumption_quality.owner_approved !== true) {
    return "BUSINESS_OWNER_REVIEW_READY";
  }
  return "FINANCE_CONTEXT_INVESTIGATION_READY";
}

function reviewModesForState(state: string): string[] {
  if (state === "SUPPRESSED" || state === "NOT_READY") {
    return ["hold", "collect_missing_aggregate_evidence"];
  }
  if (state === "PLANNING_READY" || state === "EVIDENCE_REVIEW_READY") {
    return ["internal_evidence_review"];
  }
  if (state === "BUSINESS_OWNER_REVIEW_READY") {
    return ["internal_evidence_review", "business_owner_value_hypothesis_review"];
  }
  return [
    "internal_evidence_review",
    "business_owner_value_hypothesis_review",
    "finance_context_investigation_packet"
  ];
}

function suppressedHypothesis(plan: any): any {
  return {
    value_hypothesis_id: plan?.value_hypothesis?.value_hypothesis_id ?? null,
    hypothesis_statement: null,
    value_route: "UNCLASSIFIED",
    business_objective: null,
    sponsor_role: null,
    owner_role: plan?.value_hypothesis?.owner_role ?? null
  };
}

function buildSuppression(snapshot: ClaimReadinessSnapshot): any {
  const reasonCodes = stringsOf(snapshot?.suppression?.reason_codes);
  return {
    verdict: suppressionIsActiveOrUnsafe(snapshot?.suppression) ? "SUPPRESS" : "HELD_INTERNAL_ONLY",
    suppression_reason: reasonCodes[0] ?? null,
    suppression_bucket_key: [
      `workflow:${snapshot?.workflow?.workflow_family ?? "unknown"}`,
      snapshot?.workflow?.function_area ? `function:${snapshot.workflow.function_area}` : null,
      `window:${snapshot?.window?.window_start ?? "unknown"}:${snapshot?.window?.window_end ?? "unknown"}`
    ].filter(Boolean).join("|"),
    suppression_applies_per_slice: snapshot?.suppression?.suppression_applies_per_slice === true,
    hidden_values_exposed: snapshot?.suppression?.hidden_values_exposed === true,
    suppressed_lanes: stringsOf(snapshot?.suppression?.suppressed_lanes),
    held_lanes: stringsOf(snapshot?.suppression?.held_lanes),
    missing_lanes: stringsOf(snapshot?.suppression?.missing_lanes),
    reason_codes: reasonCodes
  };
}

export function buildValueHypothesisReadinessFromMeasurementPlanAndClaimSnapshot(
  measurementPlan: any,
  claimReadinessSnapshot: any,
  options: BuildValueHypothesisReadinessOptions = {}
): ValueHypothesisReadiness {
  const planResult = validateMeasurementPlan(measurementPlan);
  if (!planResult.valid) {
    throw new Error(
      `Measurement Plan is invalid and cannot build Value Hypothesis Readiness: ${planResult.gaps.join("; ")}`
    );
  }
  const snapshotResult = validateClaimReadinessSnapshot(claimReadinessSnapshot);
  if (!snapshotResult.valid) {
    throw new Error(
      `Claim Readiness Snapshot is invalid and cannot build Value Hypothesis Readiness: ${snapshotResult.gaps.join("; ")}`
    );
  }

  const sourceBindingValidated =
    measurementPlan.org_id === claimReadinessSnapshot.org_id &&
    measurementPlan.measurement_plan_id === claimReadinessSnapshot.measurement_plan_id &&
    measurementPlan.workflow_scope?.workflow_family ===
      claimReadinessSnapshot.workflow?.workflow_family &&
    (measurementPlan.workflow_scope?.function_area ?? null) ===
      (claimReadinessSnapshot.workflow?.function_area ?? null);

  const metricWindowAligned = windowsAlign(measurementPlan, claimReadinessSnapshot);
  const aiFluencyPresent = layerStatus(
    claimReadinessSnapshot,
    "layer_2_user_voice_empirical"
  ) === "present";
  const vbdPresent = claimReadinessSnapshot.vbd_operating_map !== undefined &&
    claimReadinessSnapshot.vbd_operating_map !== null;
  const metricMovementState = options.metricMovementState ?? "missing";
  const comparisonDesign = deriveComparisonDesign(measurementPlan, options);
  const ownerApproved =
    options.assumptionOwnerApproved ??
    measurementPlan?.assumptions?.assumption_approval_state === "approved";
  const privacySafe = !privacyIsUnsafe(claimReadinessSnapshot.privacy_boundary);
  const suppressionClear = !suppressionIsActiveOrUnsafe(claimReadinessSnapshot.suppression);
  const playbookCoverageSufficient =
    claimReadinessSnapshot.playbook_coverage?.coverage_status === "full_playbook_coverage";
  const factors = {
    blueprint_quality: {
      state: "present",
      source_bound: true
    },
    ai_fluency_movement: {
      state: aiFluencyPresent ? "present" : "missing",
      role: "human_readiness_context_only",
      cannot_upgrade_financial_readiness: true
    },
    vbd_movement: {
      state: vbdPresent ? "present" : "missing",
      role: "workflow_integration_context_only",
      token_usage_role: "spend_or_intensity_context_only",
      cannot_upgrade_financial_readiness: true
    },
    metric_movement: {
      state: metricMovementState,
      metric_id: measurementPlan.metric_selection?.primary_metric?.metric_id ?? null,
      window_aligned: metricWindowAligned,
      customer_owned_or_approved: true
    },
    evidence_quality: {
      state: playbookCoverageSufficient ? "present" : "held",
      coverage_status: claimReadinessSnapshot.coverage_status
    },
    assumption_quality: {
      state: ownerApproved ? "present" : "held",
      owner_approved: ownerApproved,
      roi_bot_context_only: true
    },
    comparison_design_strength: {
      state: comparisonDesign,
      emits_probability: false,
      emits_causality: false
    },
    governance_clearance: {
      state: privacySafe && suppressionClear ? "present" : "blocked",
      hard_gate: true
    }
  };
  const qualityGates = {
    measurement_plan_validated: true,
    claim_readiness_snapshot_validated: true,
    source_binding_validated: sourceBindingValidated,
    suppression_gates_cleared: suppressionClear,
    aggregate_only: privacySafe,
    playbook_coverage_sufficient: playbookCoverageSufficient,
    selected_metric_defined: Boolean(
      measurementPlan.metric_selection?.primary_metric?.metric_id
    ),
    business_owner_context_present: Boolean(
      measurementPlan.value_hypothesis?.sponsor_role ||
        measurementPlan.value_hypothesis?.owner_role ||
        measurementPlan.metric_selection?.primary_metric?.metric_owner_role
    ),
    finance_context_ready: false,
    caveats_propagated: true,
    blocked_claims_enforced: true
  };
  const readinessState = deriveReadinessState(factors, qualityGates);
  qualityGates.finance_context_ready =
    readinessState === "FINANCE_CONTEXT_INVESTIGATION_READY";
  const holds = deriveHolds(factors, qualityGates);
  const blockedClaims = uniqueStrings([
    ...stringsOf(claimReadinessSnapshot.blocked_claims),
    ...REQUIRED_BLOCKED_CLAIMS
  ]);
  const blockedUses = uniqueStrings([
    ...stringsOf(claimReadinessSnapshot.blocked_uses),
    ...REQUIRED_BLOCKED_USES
  ]);
  const sourceRefs = deepClone(claimReadinessSnapshot.source_refs);
  const readiness: ValueHypothesisReadiness = {
    schema_version: AI_VALUE_HYPOTHESIS_READINESS_SCHEMA_VERSION,
    value_hypothesis_readiness_id: options.valueHypothesisReadinessId ??
      `value_hypothesis_readiness_${safeIdPart(String(claimReadinessSnapshot.claim_readiness_snapshot_id))}`,
    org_id: String(measurementPlan.org_id),
    measurement_plan_id: String(measurementPlan.measurement_plan_id),
    claim_readiness_snapshot_id: String(claimReadinessSnapshot.claim_readiness_snapshot_id),
    evidence_snapshot_id: String(claimReadinessSnapshot.evidence_snapshot_id),
    workflow: deepClone(claimReadinessSnapshot.workflow),
    window: deepClone(claimReadinessSnapshot.window),
    alignment_keys: {
      org_id: String(measurementPlan.org_id),
      workflow_id: null,
      workflow_family: measurementPlan.workflow_scope?.workflow_family ?? null,
      function_area: measurementPlan.workflow_scope?.function_area ?? null,
      cohort_key: measurementPlan.workflow_scope?.approved_aggregate_grain ?? null,
      baseline_window: {
        start: measurementPlan.windows?.baseline_window_start ?? null,
        end: measurementPlan.windows?.baseline_window_end ?? null
      },
      comparison_window: {
        start: measurementPlan.windows?.comparison_window_start ?? null,
        end: measurementPlan.windows?.comparison_window_end ?? null
      },
      metric_id: measurementPlan.metric_selection?.primary_metric?.metric_id ?? null,
      source_ref: sourceRefAnchor(sourceRefs),
      owner_role:
        measurementPlan.value_hypothesis?.owner_role ??
        measurementPlan.metric_selection?.primary_metric?.metric_owner_role ??
        null,
      review_state: readinessState
    },
    value_hypothesis: readinessState === "SUPPRESSED"
      ? suppressedHypothesis(measurementPlan)
      : deepClone(measurementPlan.value_hypothesis),
    readiness_state: readinessState,
    contribution_evidence_tier: contributionTierForComparisonDesign(comparisonDesign),
    allowed_review_modes: reviewModesForState(readinessState),
    factors,
    quality_gates: qualityGates,
    review_boundaries: {
      customer_facing_output_allowed: false,
      financial_output_allowed: false,
      roi_proof_allowed: false,
      causality_claim_allowed: false,
      productivity_claim_allowed: false,
      ebita_claim_allowed: false,
      headcount_reduction_claim_allowed: false,
      team_or_manager_ranking_allowed: false
    },
    suppression: buildSuppression(claimReadinessSnapshot),
    holds,
    required_caveats: uniqueStrings([
      ...stringsOf(measurementPlan.readiness?.required_caveats),
      ...stringsOf(claimReadinessSnapshot.required_caveats),
      "Value Hypothesis Readiness is an internal operating state, not ROI proof, causality, productivity measurement, or customer-facing financial output."
    ]),
    blocked_claims: blockedClaims,
    blocked_uses: blockedUses,
    source_refs: sourceRefs,
    source_provenance: {
      measurement_plan_schema_version: MEASUREMENT_PLAN_SCHEMA_VERSION,
      claim_readiness_snapshot_schema_version:
        AI_VALUE_CLAIM_READINESS_SNAPSHOT_SCHEMA_VERSION,
      source_refs: sourceRefs,
      window: deepClone(claimReadinessSnapshot.window),
      provenance_caveats: stringsOf(claimReadinessSnapshot.source_provenance?.provenance_caveats)
    },
    roi_bot_context: options.roiBotContext ?? {
      present: false,
      scenario_context_only: true
    },
    derived_from: {
      measurement_plan_id: String(measurementPlan.measurement_plan_id),
      measurement_plan_schema_version: MEASUREMENT_PLAN_SCHEMA_VERSION,
      claim_readiness_snapshot_id: String(claimReadinessSnapshot.claim_readiness_snapshot_id),
      claim_readiness_snapshot_schema_version:
        AI_VALUE_CLAIM_READINESS_SNAPSHOT_SCHEMA_VERSION,
      builder: DERIVATION_VERSION
    },
    validation: {
      measurement_plan_validated: true,
      claim_readiness_snapshot_validated: true,
      source_binding_validated: sourceBindingValidated,
      no_confidence_percent: true,
      no_customer_facing_financial_output: true
    },
    persistence_policy: {
      persisted: false,
      creates_migrations: false,
      creates_prisma_schema: false,
      creates_backend_routes: false,
      creates_frontend_ui: false,
      creates_ingestion_jobs: false
    },
    created_at: options.createdAt ?? new Date().toISOString(),
    derivation_version: DERIVATION_VERSION
  };
  return readiness;
}

function fieldKeyIsForbidden(key: string): boolean {
  const normalizedKey = normalizeKey(key);
  if (GOVERNED_KEY_ALLOWLIST.has(normalizedKey)) return false;
  return FORBIDDEN_FIELD_KEY_PATTERNS.some((pattern) => pattern.test(normalizedKey));
}

function collectForbiddenFields(
  value: any,
  fields: Set<string> = new Set()
): Set<string> {
  if (!value || typeof value !== "object") return fields;
  if (Array.isArray(value)) {
    value.forEach((item) => collectForbiddenFields(item, fields));
    return fields;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (fieldKeyIsForbidden(key)) fields.add(key);
    collectForbiddenFields(nested, fields);
  }
  return fields;
}

function semanticPathAllowed(path: string): boolean {
  return SEMANTIC_ALLOWLIST_PATH_PATTERNS.some((pattern) => pattern.test(path));
}

function collectUnsafeLanguage(value: any, path = "root", hits: string[] = []): string[] {
  if (typeof value === "string") {
    if (
      !semanticPathAllowed(path) &&
      UNSAFE_LANGUAGE_PATTERNS.some((pattern) => pattern.test(value))
    ) {
      hits.push(path);
    }
    return hits;
  }
  if (!value || typeof value !== "object") return hits;
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectUnsafeLanguage(item, `${path}[${index}]`, hits));
    return hits;
  }
  for (const [key, nested] of Object.entries(value)) {
    collectUnsafeLanguage(nested, `${path}.${key}`, hits);
  }
  return hits;
}

function collectTopLevelGaps(readiness: any): string[] {
  const gaps: string[] = [];
  for (const field of REQUIRED_FIELDS) requireField(readiness?.[field], field, gaps);
  if (
    readiness?.schema_version &&
    readiness.schema_version !== AI_VALUE_HYPOTHESIS_READINESS_SCHEMA_VERSION
  ) {
    gaps.push(`schema_version is invalid: ${readiness.schema_version}`);
  }
  if (
    readiness?.readiness_state &&
    !ALLOWED_READINESS_STATES.has(readiness.readiness_state)
  ) {
    gaps.push(`readiness_state is invalid: ${readiness.readiness_state}`);
  }
  if (
    readiness?.contribution_evidence_tier &&
    !ALLOWED_CONTRIBUTION_TIERS.has(readiness.contribution_evidence_tier)
  ) {
    gaps.push(
      `contribution_evidence_tier is invalid: ${readiness.contribution_evidence_tier}`
    );
  }
  for (const field of ["allowed_review_modes", "holds", "required_caveats", "blocked_claims", "blocked_uses"]) {
    requireArray(readiness?.[field], field, gaps);
  }
  return gaps;
}

function collectBoundaryGaps(readiness: any): string[] {
  const gaps: string[] = [];
  const boundary = readiness?.review_boundaries ?? {};
  for (const flag of [
    "customer_facing_output_allowed",
    "financial_output_allowed",
    "roi_proof_allowed",
    "causality_claim_allowed",
    "productivity_claim_allowed",
    "ebita_claim_allowed",
    "headcount_reduction_claim_allowed",
    "team_or_manager_ranking_allowed"
  ]) {
    requireBoolean(boundary[flag], false, `review_boundaries.${flag}`, gaps);
  }
  return gaps;
}

function collectBlockedClaimGaps(readiness: any): string[] {
  const gaps: string[] = [];
  const blockedClaims = stringsOf(readiness?.blocked_claims).map(normalizeToken);
  const blockedUses = stringsOf(readiness?.blocked_uses).map(normalizeToken);
  for (const claim of REQUIRED_BLOCKED_CLAIMS) {
    if (!blockedClaims.includes(claim)) gaps.push(`blocked_claims missing ${claim}`);
  }
  for (const use of REQUIRED_BLOCKED_USES) {
    if (!blockedUses.includes(use)) gaps.push(`blocked_uses missing ${use}`);
  }
  return gaps;
}

function collectReviewModeGaps(readiness: any): string[] {
  const gaps: string[] = [];
  for (const mode of stringsOf(readiness?.allowed_review_modes)) {
    if (!ALLOWED_REVIEW_MODES.has(mode)) {
      gaps.push(`allowed_review_modes contains unsupported mode ${mode}`);
    }
    if (/roi|customer_facing|financial_output|causality|productivity/i.test(mode)) {
      gaps.push(`allowed_review_modes contains blocked economic or causal mode ${mode}`);
    }
  }
  if (
    readiness?.readiness_state === "SUPPRESSED" &&
    stringsOf(readiness?.allowed_review_modes).some((mode) =>
      !["hold", "collect_missing_aggregate_evidence"].includes(mode)
    )
  ) {
    gaps.push("SUPPRESSED readiness must allow only hold or missing aggregate evidence collection");
  }
  if (
    readiness?.readiness_state === "FINANCE_CONTEXT_INVESTIGATION_READY" &&
    !stringsOf(readiness?.allowed_review_modes).includes("finance_context_investigation_packet")
  ) {
    gaps.push("FINANCE_CONTEXT_INVESTIGATION_READY requires finance_context_investigation_packet review mode");
  }
  return gaps;
}

function collectFactorGaps(readiness: any): string[] {
  const gaps: string[] = [];
  const factors = readiness?.factors ?? {};
  for (const [name, factor] of Object.entries(factors)) {
    const state = String((factor as any)?.state ?? "");
    if (name === "comparison_design_strength") {
      if (!ALLOWED_COMPARISON_DESIGNS.has(state)) {
        gaps.push(`factors.${name}.state is invalid: ${state}`);
      }
      if ((factor as any).emits_probability !== false) {
        gaps.push("comparison_design_strength must not emit probability");
      }
      if ((factor as any).emits_causality !== false) {
        gaps.push("comparison_design_strength must not emit causality");
      }
    } else if (!ALLOWED_FACTOR_STATES.has(state)) {
      gaps.push(`factors.${name}.state is invalid: ${state}`);
    }
  }
  if (factors?.ai_fluency_movement?.cannot_upgrade_financial_readiness !== true) {
    gaps.push("AI Fluency movement must be context only and cannot upgrade financial readiness");
  }
  if (factors?.vbd_movement?.cannot_upgrade_financial_readiness !== true) {
    gaps.push("VBD movement must be context only and cannot upgrade financial readiness");
  }
  if (factors?.assumption_quality?.roi_bot_context_only !== true) {
    gaps.push("ROI Bot assumptions must remain scenario context only");
  }
  return gaps;
}

function collectReadinessStateGaps(readiness: any): string[] {
  const gaps: string[] = [];
  const gates = readiness?.quality_gates ?? {};
  const factors = readiness?.factors ?? {};
  if (
    readiness?.readiness_state === "SUPPRESSED" &&
    gates.suppression_gates_cleared === true &&
    gates.aggregate_only === true
  ) {
    gaps.push("SUPPRESSED readiness requires active suppression or unsafe aggregate boundary");
  }
  if (
    readiness?.readiness_state === "FINANCE_CONTEXT_INVESTIGATION_READY" &&
    factors?.assumption_quality?.owner_approved !== true
  ) {
    gaps.push("FINANCE_CONTEXT_INVESTIGATION_READY requires owner-approved assumptions");
  }
  if (
    readiness?.readiness_state === "FINANCE_CONTEXT_INVESTIGATION_READY" &&
    factors?.metric_movement?.state !== "present"
  ) {
    gaps.push("FINANCE_CONTEXT_INVESTIGATION_READY requires selected metric movement");
  }
  if (
    readiness?.readiness_state === "FINANCE_CONTEXT_INVESTIGATION_READY" &&
    factors?.metric_movement?.window_aligned !== true
  ) {
    gaps.push("FINANCE_CONTEXT_INVESTIGATION_READY requires aligned baseline and comparison windows");
  }
  if (
    readiness?.readiness_state === "FINANCE_CONTEXT_INVESTIGATION_READY" &&
    !["MATCHED_COMPARISON_READY", "CONTROLLED_TEST_READY"].includes(
      readiness?.contribution_evidence_tier
    )
  ) {
    gaps.push("FINANCE_CONTEXT_INVESTIGATION_READY requires matched comparison or controlled-test contribution tier");
  }
  if (
    ["CONTROLLED_TEST_READY", "CALIBRATED_ATTRIBUTION_READY"].includes(
      readiness?.contribution_evidence_tier
    ) &&
    readiness?.readiness_state !== "FINANCE_CONTEXT_INVESTIGATION_READY"
  ) {
    gaps.push("controlled or calibrated tiers are internal finance-context investigation only");
  }
  if (readiness?.contribution_evidence_tier === "CALIBRATED_ATTRIBUTION_READY") {
    gaps.push("CALIBRATED_ATTRIBUTION_READY is not productized in this phase");
  }
  return gaps;
}

function collectSuppressionGaps(readiness: any): string[] {
  const gaps: string[] = [];
  const suppression = readiness?.suppression ?? {};
  requireField(suppression.suppression_bucket_key, "suppression.suppression_bucket_key", gaps);
  if (suppression.suppression_applies_per_slice !== true) {
    gaps.push("suppression.suppression_applies_per_slice must be true");
  }
  if (suppression.hidden_values_exposed !== false) {
    gaps.push("suppression.hidden_values_exposed must be false");
  }
  if (
    readiness?.readiness_state === "SUPPRESSED" &&
    readiness?.value_hypothesis?.value_route !== "UNCLASSIFIED"
  ) {
    gaps.push("SUPPRESSED readiness must keep value_hypothesis.value_route UNCLASSIFIED");
  }
  return gaps;
}

function collectSourceBindingGaps(readiness: any): string[] {
  const gaps: string[] = [];
  const provenance = readiness?.source_provenance ?? {};
  if (provenance.measurement_plan_schema_version !== MEASUREMENT_PLAN_SCHEMA_VERSION) {
    gaps.push("source_provenance.measurement_plan_schema_version must match Measurement Plan schema version");
  }
  if (
    provenance.claim_readiness_snapshot_schema_version !==
    AI_VALUE_CLAIM_READINESS_SNAPSHOT_SCHEMA_VERSION
  ) {
    gaps.push("source_provenance.claim_readiness_snapshot_schema_version must match Claim Readiness Snapshot schema version");
  }
  if (
    JSON.stringify(provenance.source_refs ?? {}) !==
    JSON.stringify(readiness?.source_refs ?? {})
  ) {
    gaps.push("source_provenance.source_refs must match source_refs");
  }
  if (
    JSON.stringify(provenance.window ?? {}) !==
    JSON.stringify(readiness?.window ?? {})
  ) {
    gaps.push("source_provenance.window must match window");
  }
  if (readiness?.alignment_keys?.org_id !== readiness?.org_id) {
    gaps.push("alignment_keys.org_id must match org_id");
  }
  if (readiness?.alignment_keys?.review_state !== readiness?.readiness_state) {
    gaps.push("alignment_keys.review_state must match readiness_state");
  }
  if (readiness?.validation?.source_binding_validated !== readiness?.quality_gates?.source_binding_validated) {
    gaps.push("validation.source_binding_validated must match quality_gates.source_binding_validated");
  }
  return gaps;
}

function collectCaveatGaps(readiness: any): string[] {
  const gaps: string[] = [];
  const caveats = stringsOf(readiness?.required_caveats);
  if (
    !caveats.some((caveat) =>
      /internal operating state.*not ROI proof|not ROI proof/i.test(caveat)
    )
  ) {
    gaps.push("required_caveats must state readiness is internal and not ROI proof");
  }
  if (
    readiness?.holds?.length > 0 &&
    !caveats.some((caveat) => /missing|held|suppressed|not ROI proof|non-causal|internal/i.test(caveat))
  ) {
    gaps.push("required_caveats must carry held, missing, suppressed, internal, or non-causal caveats");
  }
  return gaps;
}

function collectPersistenceGaps(readiness: any): string[] {
  const gaps: string[] = [];
  const policy = readiness?.persistence_policy ?? {};
  for (const flag of [
    "persisted",
    "creates_migrations",
    "creates_prisma_schema",
    "creates_backend_routes",
    "creates_frontend_ui",
    "creates_ingestion_jobs"
  ]) {
    requireBoolean(policy[flag], false, `persistence_policy.${flag}`, gaps);
  }
  return gaps;
}

function collectForbiddenFieldGaps(readiness: any): string[] {
  const forbidden = Array.from(collectForbiddenFields(readiness)).sort();
  return forbidden.length > 0
    ? [`Forbidden field(s) present: ${forbidden.join(", ")}`]
    : [];
}

function collectUnsafeLanguageGaps(readiness: any): string[] {
  const hits = collectUnsafeLanguage(readiness);
  return hits.length > 0
    ? [`Unsafe value-claim language present at: ${hits.join(", ")}`]
    : [];
}

export function validateValueHypothesisReadiness(
  readiness: any
): ValueHypothesisReadinessValidationResult {
  const gaps = [
    ...collectTopLevelGaps(readiness),
    ...collectBoundaryGaps(readiness),
    ...collectBlockedClaimGaps(readiness),
    ...collectReviewModeGaps(readiness),
    ...collectFactorGaps(readiness),
    ...collectReadinessStateGaps(readiness),
    ...collectSuppressionGaps(readiness),
    ...collectSourceBindingGaps(readiness),
    ...collectCaveatGaps(readiness),
    ...collectPersistenceGaps(readiness),
    ...collectForbiddenFieldGaps(readiness),
    ...collectUnsafeLanguageGaps(readiness)
  ];
  const valid = gaps.length === 0;
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    value_hypothesis_readiness_id:
      readiness?.value_hypothesis_readiness_id ?? null,
    org_id: readiness?.org_id ?? null,
    valid,
    gaps,
    feeds: {
      internal_evidence_review:
        valid && stringsOf(readiness?.allowed_review_modes).includes("internal_evidence_review"),
      business_owner_review:
        valid &&
        stringsOf(readiness?.allowed_review_modes).includes(
          "business_owner_value_hypothesis_review"
        ),
      finance_context_investigation:
        valid &&
        stringsOf(readiness?.allowed_review_modes).includes(
          "finance_context_investigation_packet"
        ),
      customer_facing_output: false,
      financial_output: false
    }
  };
}
