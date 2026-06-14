/**
 * AI Value Engine - AI Fluency Intake Bridge.
 *
 * Contract-only bridge from post-sales AI Fluency intake into a draft
 * Measurement Plan, evidence gap review, and Client Evidence Requests. The
 * bridge preserves AI Fluency as aggregate user voice / behavioral posture
 * context only. It does not persist snapshots, create routes, create UI,
 * ingest raw data, calculate ROI, or authorize customer-facing economic claims.
 */

import {
  buildClientEvidenceRequestsFromMeasurementPlan,
  validateClientEvidenceRequest,
  type ClientEvidenceRequest
} from "./clientEvidenceRequest";
import { validateEvidenceSnapshot } from "./evidenceSnapshot";
import {
  buildPlaybookMeasurementPlanDraft,
  validateMeasurementPlan,
  type BuildPlaybookMeasurementPlanInputs
} from "./measurementPlan";
import {
  summarizeFluencyBaseline,
  validateFluencyBaseline,
  type FluencyBaselineValidationResult
} from "./fluencyBaseline";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_AI_FLUENCY_INTAKE_BRIDGE_VALIDATION_2026_06";

export const AI_VALUE_AI_FLUENCY_INTAKE_BRIDGE_SCHEMA_VERSION =
  "FT_AI_VALUE_AI_FLUENCY_INTAKE_BRIDGE_2026_06";

const DERIVATION_VERSION =
  "ai_value_ai_fluency_intake_bridge_builder_2026_06";

const REQUIRED_BRIDGE_FIELDS = [
  "schema_version",
  "bridge_id",
  "org_id",
  "workflow",
  "ai_fluency_intake",
  "measurement_plan_draft",
  "evidence_gap_review",
  "client_evidence_requests",
  "privacy_boundary",
  "persistence_policy",
  "allowed_uses",
  "blocked_uses",
  "required_caveats",
  "created_at",
  "derivation_version"
] as const;

const REQUIRED_GAP_REVIEW_FIELDS = [
  "schema_version",
  "gap_review_id",
  "org_id",
  "measurement_plan_id",
  "evidence_gaps",
  "coverage_boundary",
  "allowed_uses",
  "blocked_uses",
  "required_caveats",
  "feeds",
  "generated_at",
  "derivation_version"
] as const;

const ALLOWED_INTAKE_STATES = new Set([
  "provided_validated",
  "missing_placeholder"
]);

const ALLOWED_GAP_STATES = new Set([
  "required",
  "missing",
  "held",
  "requested",
  "awaiting_customer",
  "provided",
  "validated",
  "rejected",
  "suppressed",
  "partial",
  "not_computed"
]);

const REQUIRED_BLOCKED_USES = [
  "realized_roi",
  "ebita_claim",
  "causality_claim",
  "productivity_claim",
  "headcount_reduction_claim",
  "individual_attribution",
  "manager_or_team_ranking",
  "people_decisioning",
  "customer_facing_financial_output"
];

const ADDITIONAL_BLOCKED_USES = [
  "individual_scoring",
  "team_or_manager_ranking",
  "customer_facing_economic_output",
  "financial_value_claim",
  "usage_derived_financial_claim",
  "dollarized_output",
  "roi_proof",
  "person_level_hris_records",
  "hashed_or_joinable_person_identifiers",
  "person_level_productivity",
  "manager_chain_analysis",
  "compensation_or_performance_inference",
  "promotion_or_discipline_inference",
  "attrition_prediction",
  "hris_inference_from_ai_usage"
];

const REQUIRED_PRIVACY_FALSE_FLAGS = [
  "contains_direct_identifiers",
  "contains_raw_content",
  "contains_raw_prompts",
  "contains_raw_responses",
  "contains_transcripts",
  "contains_query_text",
  "contains_file_contents",
  "contains_raw_rows",
  "contains_hashed_or_joinable_person_identifiers",
  "contains_person_level_hris_records",
  "contains_person_level_productivity",
  "contains_manager_or_team_ranking",
  "contains_people_decisioning",
  "contains_compensation_or_performance_inference",
  "contains_promotion_or_discipline_inference",
  "contains_attrition_prediction",
  "contains_hris_inference_from_ai_usage"
];

const FORBIDDEN_KEY_PATTERNS = [
  /raw_(?:rows?|prompt|response|transcript|content)/i,
  /prompt/i,
  /^responses?$/i,
  /response_text/i,
  /transcript/i,
  /^query$/i,
  /query_text/i,
  /sql_text/i,
  /^file_contents?$/i,
  /file_content/i,
  /email/i,
  /user_id/i,
  /employee_id/i,
  /employee_email/i,
  /employee_name/i,
  /person_id/i,
  /person_identifier/i,
  /direct_identifier/i,
  /hashed_(?:user|person|employee)_id/i,
  /joinable_(?:user|person|employee)_id/i,
  /joinable_(?:user|person|employee)_identifier/i,
  /manager_ranking/i,
  /team_ranking/i,
  /manager_chain/i,
  /people_decisioning/i,
  /compensation/i,
  /performance_rating/i,
  /promotion/i,
  /discipline/i,
  /attrition_prediction/i,
  /hris_inference/i
];

const GOVERNED_KEY_ALLOWLIST = new Set([
  "blocked_uses",
  "blocked_claims",
  "blocked_until_validated_evidence",
  "team_or_manager_ranking",
  "privacy_boundary",
  "privacy_requirements",
  "contains_direct_identifiers",
  "contains_raw_content",
  "contains_raw_prompts",
  "contains_raw_responses",
  "contains_transcripts",
  "contains_query_text",
  "contains_file_contents",
  "contains_raw_rows",
  "contains_hashed_or_joinable_person_identifiers",
  "contains_person_level_hris_records",
  "contains_person_level_productivity",
  "contains_manager_or_team_ranking",
  "contains_people_decisioning",
  "contains_compensation_or_performance_inference",
  "contains_promotion_or_discipline_inference",
  "contains_attrition_prediction",
  "contains_hris_inference_from_ai_usage"
]);

const UNSAFE_ALLOWED_USE_PATTERNS = [
  /(^|[_\s-])roi($|[_\s-])/i,
  /return[_\s-]?on[_\s-]?investment/i,
  /ebita/i,
  /causality|causal/i,
  /productivity/i,
  /headcount/i,
  /individual[_\s-]?attribution|individual[_\s-]?scoring/i,
  /manager[_\s-]?(?:or[_\s-]?team[_\s-]?)?ranking/i,
  /team[_\s-]?ranking/i,
  /people[_\s-]?decisioning/i,
  /customer[_\s-]?facing[_\s-]?(?:financial|economic)/i,
  /financial[_\s-]?(?:output|claim|value)/i
];

const REQUIRED_CAVEATS = [
  "AI Fluency baseline is aggregate user voice and behavioral posture context only; it is not value proof.",
  "VBD remains Layer 1 operating posture and cannot support financial, productivity, causality, headcount, attribution, ranking, or people-decisioning claims.",
  "Layer 2 and Layer 3 evidence gaps remain explicit until validated aggregate customer evidence is provided.",
  "Client Evidence Requests do not improve claim readiness by themselves.",
  "No customer-facing financial output is supported by this bridge."
];

export interface AIFluencyIntakeBridgeValidationResult {
  schema_version: string;
  bridge_id: string | null;
  org_id: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    measurement_plan_draft: boolean;
    evidence_gap_review: boolean;
    client_evidence_requests: boolean;
    evidence_snapshot: boolean;
    claim_readiness_snapshot: boolean;
    executive_readout_snapshot: boolean;
    customer_facing_financial_output: false;
  };
}

export interface AIFluencyIntakeBridgeBuildInputs
  extends BuildPlaybookMeasurementPlanInputs {
  bridgeId?: string;
  workflowName?: string;
  evidenceSnapshotId?: string | null;
  aiFluencyBaseline?: any | null;
}

export interface BuildEvidenceGapReviewOptions {
  generatedAt?: string;
  gapReviewId?: string;
  evidenceSnapshotId?: string | null;
  aiFluencyIntakeState?: "provided_validated" | "missing_placeholder";
}

export interface EvidenceGapReview {
  schema_version: string;
  gap_review_id: string;
  org_id: string;
  measurement_plan_id: string;
  evidence_snapshot_id: string | null;
  evidence_gaps: Array<{
    playbook_layer: string;
    required: boolean;
    evidence_state: string;
    missing_or_held_items: string[];
    client_action_required: boolean;
    caveats: string[];
  }>;
  coverage_boundary: {
    full_playbook_coverage: false;
    layer_1_vbd_posture_only: true;
    ai_fluency_baseline_is_value_proof: false;
    bigquery_source_availability_is_value_proof: false;
    missing_evidence_treated_as_support: false;
  };
  allowed_uses: string[];
  blocked_uses: string[];
  required_caveats: string[];
  feeds: {
    evidence_gap_review: boolean;
    measurement_plan_update_context: boolean;
    client_evidence_request_context: boolean;
    evidence_snapshot: false;
    claim_readiness_snapshot: false;
    executive_readout_snapshot: false;
    customer_facing_financial_output: false;
  };
  generated_at: string;
  derivation_version: string;
}

export interface AIFluencyIntakeBridge {
  schema_version: string;
  bridge_id: string;
  org_id: string;
  workflow: {
    workflow_family: string;
    workflow_name: string | null;
    function_area: string | null;
  };
  ai_fluency_intake: {
    intake_state: string;
    evidence_layer: "layer_2_user_voice_empirical";
    baseline_id: string | null;
    baseline_validation: FluencyBaselineValidationResult | null;
    baseline_summary: any | null;
    contributes_to_value_proof: false;
    feeds: {
      layer_2_user_voice_context: boolean;
      layer_1_vbd_posture: false;
      measurement_plan_draft: boolean;
      evidence_snapshot: false;
      claim_readiness_snapshot: false;
      executive_readout_snapshot: false;
      customer_facing_financial_output: false;
    };
  };
  measurement_plan_draft: any;
  evidence_gap_review: EvidenceGapReview;
  client_evidence_requests: ClientEvidenceRequest[];
  privacy_boundary: {
    aggregate_only: true;
    [key: string]: boolean;
  };
  persistence_policy: {
    persisted: false;
    creates_migrations: false;
    creates_prisma_schema: false;
    creates_backend_routes: false;
    creates_frontend_ui: false;
    creates_ingestion_jobs: false;
    creates_claim_readiness_snapshots: false;
    creates_executive_readout_snapshots: false;
  };
  allowed_uses: string[];
  blocked_uses: string[];
  required_caveats: string[];
  created_at: string;
  derivation_version: string;
}

export const AIFluencyIntakeBridgeSchema = {
  schema_version: AI_VALUE_AI_FLUENCY_INTAKE_BRIDGE_SCHEMA_VERSION,
  required_fields: REQUIRED_BRIDGE_FIELDS,
  required_gap_review_fields: REQUIRED_GAP_REVIEW_FIELDS,
  intake_states: [...ALLOWED_INTAKE_STATES],
  evidence_states: [...ALLOWED_GAP_STATES],
  required_blocked_uses: REQUIRED_BLOCKED_USES,
  persistence_policy: {
    persisted: false,
    creates_migrations: false,
    creates_prisma_schema: false,
    creates_backend_routes: false,
    creates_frontend_ui: false,
    creates_ingestion_jobs: false,
    creates_claim_readiness_snapshots: false,
    creates_executive_readout_snapshots: false
  }
} as const;

function safeIdPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function stringsOf(value: any): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function hasToken(values: any, token: string): boolean {
  return stringsOf(values).map((value) => value.trim().toLowerCase()).includes(token);
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

function requireOwnField(value: any, key: string, path: string, gaps: string[]): void {
  if (!value || !Object.prototype.hasOwnProperty.call(value, key)) {
    gaps.push(`${path} is missing`);
  }
}

function isForbiddenKey(key: string): boolean {
  if (GOVERNED_KEY_ALLOWLIST.has(key)) return false;
  return FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function collectForbiddenFields(value: any, fields: Set<string> = new Set()): Set<string> {
  if (!value || typeof value !== "object") return fields;
  if (Array.isArray(value)) {
    value.forEach((item) => collectForbiddenFields(item, fields));
    return fields;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (isForbiddenKey(key)) fields.add(key);
    collectForbiddenFields(nested, fields);
  }
  return fields;
}

function unsafeAllowedUses(values: any): string[] {
  return stringsOf(values).filter((value) =>
    UNSAFE_ALLOWED_USE_PATTERNS.some((pattern) => pattern.test(value))
  );
}

function blockedUses(): string[] {
  return [...new Set([...REQUIRED_BLOCKED_USES, ...ADDITIONAL_BLOCKED_USES])];
}

function privacyBoundary(): AIFluencyIntakeBridge["privacy_boundary"] {
  return {
    aggregate_only: true,
    contains_direct_identifiers: false,
    contains_raw_content: false,
    contains_raw_prompts: false,
    contains_raw_responses: false,
    contains_transcripts: false,
    contains_query_text: false,
    contains_file_contents: false,
    contains_raw_rows: false,
    contains_hashed_or_joinable_person_identifiers: false,
    contains_person_level_hris_records: false,
    contains_person_level_productivity: false,
    contains_manager_or_team_ranking: false,
    contains_people_decisioning: false,
    contains_compensation_or_performance_inference: false,
    contains_promotion_or_discipline_inference: false,
    contains_attrition_prediction: false,
    contains_hris_inference_from_ai_usage: false
  };
}

function persistencePolicy(): AIFluencyIntakeBridge["persistence_policy"] {
  return {
    persisted: false,
    creates_migrations: false,
    creates_prisma_schema: false,
    creates_backend_routes: false,
    creates_frontend_ui: false,
    creates_ingestion_jobs: false,
    creates_claim_readiness_snapshots: false,
    creates_executive_readout_snapshots: false
  };
}

function arrayFromRequirement(value: any): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function coverageStatus(snapshot: any, layer: string): string | null {
  return snapshot?.playbook_coverage?.[layer]?.status ?? null;
}

function trustedSnapshotForPlan(snapshot: any, plan: any): any | null {
  if (!snapshot) return null;
  const result = validateEvidenceSnapshot(snapshot);
  if (!result.valid) return null;
  if (snapshot.org_id !== plan?.org_id) return null;
  if (snapshot.measurement_plan_id !== plan?.measurement_plan_id) return null;
  return snapshot;
}

function missingItemsForLayer(plan: any, layer: string, aiFluencyState: string): string[] {
  const requirements = plan?.playbook_evidence_requirements ?? {};
  if (layer === "layer_2_user_voice_empirical") {
    const requiredExports = arrayFromRequirement(
      requirements.layer_2_user_voice_empirical?.required_exports
    );
    if (aiFluencyState === "provided_validated") {
      return requiredExports.filter((item) => item !== "aggregate_ai_fluency_baseline");
    }
    return requiredExports;
  }
  if (layer === "layer_3_business_system_outcomes") {
    return arrayFromRequirement(
      requirements.layer_3_business_system_outcomes?.required_exports
    );
  }
  if (layer === "governance_evidence") {
    return arrayFromRequirement(requirements.governance_evidence?.required_controls);
  }
  if (layer === "assumption_evidence") {
    return [...new Set([
      ...arrayFromRequirement(requirements.assumption_evidence?.required_assumptions),
      ...arrayFromRequirement(requirements.assumption_evidence?.required_approvals)
    ])];
  }
  return [];
}

function stateForLayer(
  plan: any,
  snapshot: any,
  layer: string,
  aiFluencyState: string
): string {
  const snapshotStatus = coverageStatus(snapshot, layer);
  if (snapshotStatus === "present" || snapshotStatus === "validated") return "validated";
  if (["partial", "held", "suppressed", "not_computed", "missing"].includes(String(snapshotStatus))) {
    return String(snapshotStatus);
  }
  if (layer === "layer_2_user_voice_empirical" && aiFluencyState === "provided_validated") {
    return "partial";
  }
  if (layer === "governance_evidence" || layer === "assumption_evidence") {
    return "held";
  }
  const missingItems = missingItemsForLayer(plan, layer, aiFluencyState);
  return missingItems.length > 0 ? "missing" : "not_computed";
}

function gapCaveats(layer: string, state: string): string[] {
  if (layer === "layer_2_user_voice_empirical" && state === "partial") {
    return [
      "AI Fluency baseline may provide aggregate Layer 2 context, but remaining Layer 2 evidence is still required before stronger Playbook coverage."
    ];
  }
  if (layer === "layer_2_user_voice_empirical") {
    return [
      "Missing Layer 2 user voice or empirical evidence cannot be treated as support."
    ];
  }
  if (layer === "layer_3_business_system_outcomes") {
    return [
      "Missing Layer 3 business system-of-record outcome evidence blocks claim readiness and customer-facing financial output."
    ];
  }
  if (layer === "governance_evidence") {
    return [
      "Held governance evidence keeps the workflow in evidence collection until aggregate privacy, k-min, and source readiness controls are confirmed."
    ];
  }
  return [
    "Held customer-owned assumptions cannot authorize ROI, EBITA, productivity, causality, or financial output."
  ];
}

export function buildEvidenceGapReviewFromMeasurementPlanAndSnapshot(
  measurementPlan: any,
  evidenceSnapshot: any | null = null,
  options: BuildEvidenceGapReviewOptions = {}
): EvidenceGapReview {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const measurementPlanId = measurementPlan?.measurement_plan_id ?? "unknown_measurement_plan";
  const orgId = measurementPlan?.org_id ?? "unknown_org";
  const intakeState = options.aiFluencyIntakeState ?? "missing_placeholder";
  const gapReviewId = options.gapReviewId ??
    `evidence_gap_review_${safeIdPart(measurementPlanId)}`;
  const layers = [
    "layer_2_user_voice_empirical",
    "layer_3_business_system_outcomes",
    "governance_evidence",
    "assumption_evidence"
  ];
  const trustedSnapshot = trustedSnapshotForPlan(evidenceSnapshot, measurementPlan);
  return {
    schema_version: "FT_AI_VALUE_EVIDENCE_GAP_REVIEW_2026_06",
    gap_review_id: gapReviewId,
    org_id: orgId,
    measurement_plan_id: measurementPlanId,
    evidence_snapshot_id:
      options.evidenceSnapshotId ?? evidenceSnapshot?.evidence_snapshot_id ?? null,
    evidence_gaps: layers.map((layer) => {
      const state = stateForLayer(measurementPlan, trustedSnapshot, layer, intakeState);
      const missingOrHeldItems =
        state === "validated" || state === "provided"
          ? []
          : missingItemsForLayer(measurementPlan, layer, intakeState);
      return {
        playbook_layer: layer,
        required: true,
        evidence_state: state,
        missing_or_held_items: missingOrHeldItems,
        client_action_required: state !== "validated" && state !== "provided",
        caveats: gapCaveats(layer, state)
      };
    }),
    coverage_boundary: {
      full_playbook_coverage: false,
      layer_1_vbd_posture_only: true,
      ai_fluency_baseline_is_value_proof: false,
      bigquery_source_availability_is_value_proof: false,
      missing_evidence_treated_as_support: false
    },
    allowed_uses: [
      "evidence_gap_review",
      "client_evidence_request_planning",
      "measurement_plan_draft_context"
    ],
    blocked_uses: blockedUses(),
    required_caveats: REQUIRED_CAVEATS,
    feeds: {
      evidence_gap_review: true,
      measurement_plan_update_context: true,
      client_evidence_request_context: true,
      evidence_snapshot: false,
      claim_readiness_snapshot: false,
      executive_readout_snapshot: false,
      customer_facing_financial_output: false
    },
    generated_at: generatedAt,
    derivation_version: DERIVATION_VERSION
  };
}

export function buildMeasurementPlanDraftFromAIFluencyIntake(
  inputs: AIFluencyIntakeBridgeBuildInputs
): AIFluencyIntakeBridge {
  const createdAt = inputs.generatedAt ?? new Date().toISOString();
  const bridgeId = inputs.bridgeId ??
    `ai_fluency_intake_bridge_${safeIdPart(inputs.orgId)}_${safeIdPart(inputs.workflowFamily)}`;
  const plan = buildPlaybookMeasurementPlanDraft({
    orgId: inputs.orgId,
    workflowFamily: inputs.workflowFamily,
    hypothesisStatement: inputs.hypothesisStatement,
    businessObjective: inputs.businessObjective,
    valueRoute: inputs.valueRoute,
    functionArea: inputs.functionArea,
    primaryMetricId: inputs.primaryMetricId,
    primaryMetricName: inputs.primaryMetricName,
    baselineWindowStart: inputs.baselineWindowStart,
    baselineWindowEnd: inputs.baselineWindowEnd,
    comparisonWindowStart: inputs.comparisonWindowStart,
    comparisonWindowEnd: inputs.comparisonWindowEnd,
    generatedAt: createdAt,
    measurementPlanId: inputs.measurementPlanId
  });
  const planValidation = validateMeasurementPlan(plan);
  if (!planValidation.valid) {
    throw new Error(`Generated Measurement Plan is invalid: ${planValidation.gaps.join("; ")}`);
  }

  const baselineValidation = inputs.aiFluencyBaseline
    ? validateFluencyBaseline(inputs.aiFluencyBaseline)
    : null;
  if (baselineValidation && !baselineValidation.valid) {
    throw new Error(`AI Fluency baseline is invalid: ${baselineValidation.gaps.join("; ")}`);
  }
  const intakeState = baselineValidation?.valid === true
    ? "provided_validated"
    : "missing_placeholder";
  const gapReview = buildEvidenceGapReviewFromMeasurementPlanAndSnapshot(plan, null, {
    generatedAt: createdAt,
    evidenceSnapshotId: inputs.evidenceSnapshotId ?? null,
    aiFluencyIntakeState: intakeState
  });
  const clientEvidenceRequests = buildClientEvidenceRequestsFromMeasurementPlan(plan, {
    createdAt
  }).map((request) => ({
    ...request,
    evidence_snapshot_id: inputs.evidenceSnapshotId ?? request.evidence_snapshot_id ?? null
  }));
  const invalidRequests = clientEvidenceRequests
    .map((request) => validateClientEvidenceRequest(request))
    .filter((result) => !result.valid);
  if (invalidRequests.length > 0) {
    throw new Error(
      `Generated Client Evidence Requests are invalid: ${
        invalidRequests.map((result) => result.gaps.join("; ")).join(" | ")
      }`
    );
  }

  return {
    schema_version: AI_VALUE_AI_FLUENCY_INTAKE_BRIDGE_SCHEMA_VERSION,
    bridge_id: bridgeId,
    org_id: inputs.orgId,
    workflow: {
      workflow_family: inputs.workflowFamily,
      workflow_name: inputs.workflowName ?? null,
      function_area: inputs.functionArea ?? null
    },
    ai_fluency_intake: {
      intake_state: intakeState,
      evidence_layer: "layer_2_user_voice_empirical",
      baseline_id: baselineValidation?.baseline_id ?? null,
      baseline_validation: baselineValidation,
      baseline_summary: baselineValidation?.valid === true
        ? summarizeFluencyBaseline(inputs.aiFluencyBaseline)
        : null,
      contributes_to_value_proof: false,
      feeds: {
        layer_2_user_voice_context: baselineValidation?.feeds.value_chain_context === true,
        layer_1_vbd_posture: false,
        measurement_plan_draft: true,
        evidence_snapshot: false,
        claim_readiness_snapshot: false,
        executive_readout_snapshot: false,
        customer_facing_financial_output: false
      }
    },
    measurement_plan_draft: plan,
    evidence_gap_review: gapReview,
    client_evidence_requests: clientEvidenceRequests,
    privacy_boundary: privacyBoundary(),
    persistence_policy: persistencePolicy(),
    allowed_uses: [
      "ai_fluency_posture_review",
      "measurement_plan_draft",
      "evidence_gap_review",
      "client_evidence_request_planning"
    ],
    blocked_uses: blockedUses(),
    required_caveats: REQUIRED_CAVEATS,
    created_at: createdAt,
    derivation_version: DERIVATION_VERSION
  };
}

function collectGapReviewGaps(gapReview: any): string[] {
  const gaps: string[] = [];
  for (const field of REQUIRED_GAP_REVIEW_FIELDS) {
    requireField(gapReview?.[field], `evidence_gap_review.${field}`, gaps);
  }
  requireOwnField(
    gapReview,
    "evidence_snapshot_id",
    "evidence_gap_review.evidence_snapshot_id",
    gaps
  );
  requireArray(gapReview?.evidence_gaps, "evidence_gap_review.evidence_gaps", gaps);
  for (const [index, gap] of (gapReview?.evidence_gaps ?? []).entries()) {
    const path = `evidence_gap_review.evidence_gaps[${index}]`;
    for (const field of [
      "playbook_layer",
      "required",
      "evidence_state",
      "missing_or_held_items",
      "client_action_required",
      "caveats"
    ]) {
      requireField(gap?.[field], `${path}.${field}`, gaps);
    }
    if (!ALLOWED_GAP_STATES.has(gap?.evidence_state)) {
      gaps.push(`${path}.evidence_state is invalid: ${gap?.evidence_state}`);
    }
    if (gap?.required !== true) {
      gaps.push(`${path}.required must be true`);
    }
    requireArray(gap?.missing_or_held_items, `${path}.missing_or_held_items`, gaps);
    requireArray(gap?.caveats, `${path}.caveats`, gaps);
  }
  const boundary = gapReview?.coverage_boundary ?? {};
  requireBoolean(
    boundary.full_playbook_coverage,
    false,
    "evidence_gap_review.coverage_boundary.full_playbook_coverage",
    gaps
  );
  requireBoolean(
    boundary.ai_fluency_baseline_is_value_proof,
    false,
    "evidence_gap_review.coverage_boundary.ai_fluency_baseline_is_value_proof",
    gaps
  );
  requireBoolean(
    boundary.bigquery_source_availability_is_value_proof,
    false,
    "evidence_gap_review.coverage_boundary.bigquery_source_availability_is_value_proof",
    gaps
  );
  requireBoolean(
    boundary.missing_evidence_treated_as_support,
    false,
    "evidence_gap_review.coverage_boundary.missing_evidence_treated_as_support",
    gaps
  );
  for (const layer of ["layer_2_user_voice_empirical", "layer_3_business_system_outcomes"]) {
    if (!(gapReview?.evidence_gaps ?? []).some((gap: any) => gap?.playbook_layer === layer)) {
      gaps.push(`evidence_gap_review missing ${layer}`);
    }
  }
  for (const use of REQUIRED_BLOCKED_USES) {
    if (!hasToken(gapReview?.blocked_uses, use)) {
      gaps.push(`evidence_gap_review.blocked_uses must include ${use}`);
    }
  }
  for (const caveat of REQUIRED_CAVEATS) {
    if (!stringsOf(gapReview?.required_caveats).includes(caveat)) {
      gaps.push(`evidence_gap_review.required_caveats must include: ${caveat}`);
    }
  }
  for (const value of unsafeAllowedUses(gapReview?.allowed_uses)) {
    gaps.push(`evidence_gap_review.allowed_uses contains unsafe use: ${value}`);
  }
  const feeds = gapReview?.feeds ?? {};
  requireBoolean(feeds.evidence_gap_review, true, "evidence_gap_review.feeds.evidence_gap_review", gaps);
  requireBoolean(
    feeds.measurement_plan_update_context,
    true,
    "evidence_gap_review.feeds.measurement_plan_update_context",
    gaps
  );
  requireBoolean(
    feeds.client_evidence_request_context,
    true,
    "evidence_gap_review.feeds.client_evidence_request_context",
    gaps
  );
  for (const feed of [
    "evidence_snapshot",
    "claim_readiness_snapshot",
    "executive_readout_snapshot",
    "customer_facing_financial_output"
  ]) {
    requireBoolean(feeds[feed], false, `evidence_gap_review.feeds.${feed}`, gaps);
  }
  return gaps;
}

function collectIdentityGaps(bridge: any): string[] {
  const gaps: string[] = [];
  const bridgeOrgId = bridge?.org_id;
  const plan = bridge?.measurement_plan_draft ?? {};
  const gapReview = bridge?.evidence_gap_review ?? {};
  const planId = plan?.measurement_plan_id;
  if (plan?.org_id !== bridgeOrgId) {
    gaps.push("measurement_plan_draft.org_id must match bridge org_id");
  }
  if (gapReview?.org_id !== bridgeOrgId) {
    gaps.push("evidence_gap_review.org_id must match bridge org_id");
  }
  if (gapReview?.measurement_plan_id !== planId) {
    gaps.push("evidence_gap_review.measurement_plan_id must match measurement_plan_draft");
  }
  if (bridge?.workflow?.workflow_family !== plan?.workflow_scope?.workflow_family) {
    gaps.push("workflow.workflow_family must match measurement_plan_draft.workflow_scope.workflow_family");
  }
  if ((bridge?.workflow?.function_area ?? null) !== (plan?.workflow_scope?.function_area ?? null)) {
    gaps.push("workflow.function_area must match measurement_plan_draft.workflow_scope.function_area");
  }
  const baselineValidation = bridge?.ai_fluency_intake?.baseline_validation;
  if (
    bridge?.ai_fluency_intake?.intake_state === "provided_validated" &&
    baselineValidation?.org_id !== bridgeOrgId
  ) {
    gaps.push("ai_fluency_intake.baseline_validation.org_id must match bridge org_id");
  }
  for (const [index, request] of (bridge?.client_evidence_requests ?? []).entries()) {
    if (request?.org_id !== bridgeOrgId) {
      gaps.push(`client_evidence_requests[${index}].org_id must match bridge org_id`);
    }
    if (request?.measurement_plan_id !== planId) {
      gaps.push(`client_evidence_requests[${index}].measurement_plan_id must match measurement_plan_draft`);
    }
    const gapSnapshotId = gapReview?.evidence_snapshot_id ?? null;
    if (
      gapSnapshotId !== null &&
      request?.evidence_snapshot_id !== gapSnapshotId
    ) {
      gaps.push(`client_evidence_requests[${index}].evidence_snapshot_id must match evidence_gap_review`);
    }
  }
  return gaps;
}

function collectClientEvidenceRequestCoverageGaps(bridge: any): string[] {
  const gaps: string[] = [];
  const requests = bridge?.client_evidence_requests;
  if (!Array.isArray(requests)) return gaps;
  if (requests.length === 0) {
    gaps.push("client_evidence_requests must include at least one request");
    return gaps;
  }
  const requestedLayers = new Set(
    requests.map((request: any) => String(request?.requested_playbook_layer ?? ""))
  );
  for (const gap of bridge?.evidence_gap_review?.evidence_gaps ?? []) {
    if (gap?.required === true && gap?.client_action_required === true) {
      const layer = String(gap?.playbook_layer ?? "");
      if (!requestedLayers.has(layer)) {
        gaps.push(`client_evidence_requests missing required request for ${layer}`);
      }
    }
  }
  return gaps;
}

export function validateAIFluencyIntakeBridge(
  bridge: any
): AIFluencyIntakeBridgeValidationResult {
  const gaps: string[] = [];
  for (const field of REQUIRED_BRIDGE_FIELDS) {
    requireField(bridge?.[field], field, gaps);
  }
  if (
    bridge?.schema_version &&
    bridge.schema_version !== AI_VALUE_AI_FLUENCY_INTAKE_BRIDGE_SCHEMA_VERSION
  ) {
    gaps.push(`schema_version is invalid: ${bridge.schema_version}`);
  }
  if (!ALLOWED_INTAKE_STATES.has(bridge?.ai_fluency_intake?.intake_state)) {
    gaps.push(`ai_fluency_intake.intake_state is invalid: ${bridge?.ai_fluency_intake?.intake_state}`);
  }
  if (bridge?.ai_fluency_intake?.evidence_layer !== "layer_2_user_voice_empirical") {
    gaps.push("ai_fluency_intake.evidence_layer must be layer_2_user_voice_empirical");
  }
  requireBoolean(
    bridge?.ai_fluency_intake?.contributes_to_value_proof,
    false,
    "ai_fluency_intake.contributes_to_value_proof",
    gaps
  );
  for (const feed of [
    "evidence_snapshot",
    "claim_readiness_snapshot",
    "executive_readout_snapshot",
    "customer_facing_financial_output"
  ]) {
    requireBoolean(
      bridge?.ai_fluency_intake?.feeds?.[feed],
      false,
      `ai_fluency_intake.feeds.${feed}`,
      gaps
    );
  }
  if (bridge?.ai_fluency_intake?.intake_state === "provided_validated") {
    if (bridge?.ai_fluency_intake?.baseline_validation?.valid !== true) {
      gaps.push("provided_validated intake requires valid baseline_validation");
    }
    if (!bridge?.ai_fluency_intake?.baseline_summary) {
      gaps.push("provided_validated intake requires aggregate baseline_summary");
    }
  }
  if (bridge?.ai_fluency_intake?.intake_state === "missing_placeholder") {
    if (bridge?.ai_fluency_intake?.baseline_validation !== null) {
      gaps.push("missing_placeholder intake must not include baseline_validation");
    }
    if (bridge?.ai_fluency_intake?.baseline_summary !== null) {
      gaps.push("missing_placeholder intake must not include baseline_summary");
    }
    if (bridge?.ai_fluency_intake?.feeds?.layer_2_user_voice_context !== false) {
      gaps.push("missing_placeholder intake must not feed layer_2_user_voice_context");
    }
  }
  if (bridge?.ai_fluency_intake?.baseline_summary) {
    const interpretation = String(bridge.ai_fluency_intake.baseline_summary.interpretation ?? "");
    if (!/Directional only/i.test(interpretation)) {
      gaps.push("baseline_summary must preserve directional-only interpretation");
    }
  }

  const planValidation = validateMeasurementPlan(bridge?.measurement_plan_draft);
  if (!planValidation.valid) {
    gaps.push(...planValidation.gaps.map((gap) => `measurement_plan_draft: ${gap}`));
  }
  gaps.push(...collectGapReviewGaps(bridge?.evidence_gap_review));
  requireArray(bridge?.client_evidence_requests, "client_evidence_requests", gaps);
  for (const [index, request] of (bridge?.client_evidence_requests ?? []).entries()) {
    const requestValidation = validateClientEvidenceRequest(request);
    if (!requestValidation.valid) {
      gaps.push(...requestValidation.gaps.map((gap) => `client_evidence_requests[${index}]: ${gap}`));
    }
    if (request?.allowed_claim_improvement?.request_itself_upgrades_claim_readiness !== false) {
      gaps.push(`client_evidence_requests[${index}] must not upgrade claim readiness`);
    }
  }
  gaps.push(...collectClientEvidenceRequestCoverageGaps(bridge));
  gaps.push(...collectIdentityGaps(bridge));

  const privacy = bridge?.privacy_boundary ?? {};
  requireBoolean(privacy.aggregate_only, true, "privacy_boundary.aggregate_only", gaps);
  for (const flag of REQUIRED_PRIVACY_FALSE_FLAGS) {
    requireBoolean(privacy[flag], false, `privacy_boundary.${flag}`, gaps);
  }
  const persistence = bridge?.persistence_policy ?? {};
  for (const [key, value] of Object.entries(AIFluencyIntakeBridgeSchema.persistence_policy)) {
    requireBoolean(persistence[key], value, `persistence_policy.${key}`, gaps);
  }
  requireArray(bridge?.allowed_uses, "allowed_uses", gaps);
  requireArray(bridge?.blocked_uses, "blocked_uses", gaps);
  requireArray(bridge?.required_caveats, "required_caveats", gaps);
  for (const blockedUse of REQUIRED_BLOCKED_USES) {
    if (!hasToken(bridge?.blocked_uses, blockedUse)) {
      gaps.push(`blocked_uses must include ${blockedUse}`);
    }
    if (!hasToken(bridge?.measurement_plan_draft?.blocked_uses, blockedUse)) {
      gaps.push(`measurement_plan_draft.blocked_uses must include ${blockedUse}`);
    }
  }
  for (const caveat of REQUIRED_CAVEATS) {
    if (!stringsOf(bridge?.required_caveats).includes(caveat)) {
      gaps.push(`required_caveats must include: ${caveat}`);
    }
  }
  for (const value of unsafeAllowedUses(bridge?.allowed_uses)) {
    gaps.push(`allowed_uses contains unsafe use: ${value}`);
  }
  for (const field of [...collectForbiddenFields(bridge)].sort()) {
    gaps.push(`Forbidden field detected: ${field}`);
  }

  const valid = gaps.length === 0;
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    bridge_id: bridge?.bridge_id ?? null,
    org_id: bridge?.org_id ?? null,
    valid,
    gaps,
    feeds: {
      measurement_plan_draft: valid,
      evidence_gap_review: valid,
      client_evidence_requests: valid,
      evidence_snapshot: false,
      claim_readiness_snapshot: false,
      executive_readout_snapshot: false,
      customer_facing_financial_output: false
    }
  };
}
