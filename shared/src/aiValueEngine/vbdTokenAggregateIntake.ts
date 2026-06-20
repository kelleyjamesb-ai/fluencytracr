/**
 * AI Value Engine - VBD Token Aggregate Intake.
 *
 * Contract-only adapter for scrubbed aggregate Glean/BigQuery VBD and token
 * summaries. It computes governed VBD placement from aggregate Velocity,
 * Breadth, and Depth inputs and carries token usage as spend/intensity context
 * only. It does not run BigQuery, ingest raw rows, change VBD formulas from
 * token usage, persist outputs, or upgrade claim readiness.
 */

export const AI_VALUE_VBD_TOKEN_AGGREGATE_INTAKE_SCHEMA_VERSION =
  "FT_AI_VALUE_VBD_TOKEN_AGGREGATE_INTAKE_2026_06";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_VBD_TOKEN_AGGREGATE_INTAKE_VALIDATION_2026_06";

const DERIVATION_VERSION =
  "ai_value_vbd_token_aggregate_intake_2026_06";

const VBD_THRESHOLD = 60;

const REQUIRED_FALSE_BOUNDARY_FIELDS = [
  "runs_bigquery",
  "live_pull_performed",
  "ingests_raw_rows",
  "persists_output",
  "creates_migrations",
  "creates_prisma_schema",
  "creates_backend_routes",
  "creates_frontend_ui",
  "token_usage_changes_vbd_formula",
  "token_usage_upgrades_claim_readiness",
  "emits_roi",
  "emits_financial_attribution",
  "emits_confidence_percentage",
  "emits_probability",
  "customer_facing_financial_output"
];

const REQUIRED_BLOCKED_USES = [
  "realized_roi",
  "ebita_claim",
  "ebitda_claim",
  "financial_attribution",
  "causality_claim",
  "productivity_claim",
  "headcount_reduction_claim",
  "individual_attribution",
  "manager_or_team_ranking",
  "people_decisioning",
  "customer_facing_financial_output",
  "confidence_percentage",
  "probability_output"
];

const FORBIDDEN_FIELD_PATTERNS = [
  /^raw_rows?$/i,
  /^rows$/i,
  /^events$/i,
  /^records$/i,
  /raw_(?:prompt|response|transcript|content|file|export|event|row)/i,
  /prompt/i,
  /^responses?$/i,
  /response_text/i,
  /transcript/i,
  /^query$/i,
  /query_text/i,
  /sql_text/i,
  /bigquery_sql/i,
  /^file_contents?$/i,
  /email/i,
  /user_id/i,
  /employee_id/i,
  /person_id/i,
  /person_identifier/i,
  /manager_ranking/i,
  /team_ranking/i,
  /^confidence_percentage$/i,
  /^probability$/i,
  /^roi$/i,
  /roi_value/i,
  /^ebita$/i,
  /^ebitda$/i,
  /financial_attribution/i,
  /^financial_output$/i,
  /^customer_facing_financial_output$/i,
  /^backend_routes?$/i,
  /^frontend_ui$/i,
  /^persistence_table$/i
];

const GOVERNED_KEY_ALLOWLIST = new Set([
  "blocked_uses",
  "boundary_policy"
]);

const FALSE_BOUNDARY_CONTAINERS = new Set([
  "boundary_policy",
  "feeds"
]);

export interface BuildVbdTokenAggregateIntakeInput {
  intakeId?: string;
  orgId: string;
  clientId: string;
  sourceRef: string;
  sourceOwnerRole: string;
  ownerApprovalState: string;
  reviewState: string;
  workflowFamily: string;
  workflowId?: string;
  functionArea: string;
  cohortKey: string;
  baselineWindow: any;
  comparisonWindow: any;
  vbd: {
    velocity: number;
    breadth: number;
    depth: number;
    threshold?: number;
  };
  tokenSummary: any;
  kMinPosture: any;
  sourceOwnerAttestation: any;
  generatedAt?: string;
}

export interface VbdTokenAggregateIntakeValidationResult {
  schema_version: string;
  intake_id: string | null;
  org_id: string | null;
  client_id: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    data_spine_vbd_token_source: boolean;
    measurement_cell_vbd_context: boolean;
    claim_readiness_upgrade: false;
    finance_context_investigation_planning: false;
    customer_facing_financial_output: false;
  };
}

function normalizeKey(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function safeIdPart(value: string): string {
  return normalizeKey(value).replace(/^_+|_+$/g, "");
}

function stringsOf(value: any): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function requireField(value: any, path: string, gaps: string[]): void {
  if (value === undefined || value === null || value === "") {
    gaps.push(`${path} is missing`);
  }
}

function numberOrNull(value: any): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function vbdScore(velocity: number, breadth: number, depth: number): number {
  return round1((0.3 * velocity) + (0.3 * breadth) + (0.4 * depth));
}

function integrationScore(breadth: number, depth: number): number {
  return round1((0.4 * breadth) + (0.6 * depth));
}

function quadrant(velocity: number, integration: number): string {
  const highVelocity = velocity >= VBD_THRESHOLD;
  const highIntegration = integration >= VBD_THRESHOLD;
  if (highVelocity && highIntegration) return "high_fluency_flow";
  if (highVelocity && !highIntegration) return "fast_but_shallow";
  if (!highVelocity && highIntegration) return "deep_but_slow";
  return "low_integration";
}

function collectForbiddenFields(
  value: any,
  fields: Set<string> = new Set(),
  path: string[] = []
): Set<string> {
  if (!value || typeof value !== "object") return fields;
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectForbiddenFields(item, fields, [...path, String(index)]));
    return fields;
  }
  for (const [key, nested] of Object.entries(value)) {
    const normalized = normalizeKey(key);
    const currentPath = [...path, key];
    const isFalseBoundaryFlag = nested === false &&
      currentPath.some((part) => FALSE_BOUNDARY_CONTAINERS.has(normalizeKey(part)));
    if (
      !isFalseBoundaryFlag &&
      !GOVERNED_KEY_ALLOWLIST.has(normalized) &&
      FORBIDDEN_FIELD_PATTERNS.some((pattern) => pattern.test(key) || pattern.test(normalized))
    ) {
      fields.add(currentPath.join("."));
    }
    collectForbiddenFields(nested, fields, currentPath);
  }
  return fields;
}

function boundaryPolicy(): Record<string, false> {
  return Object.fromEntries(
    REQUIRED_FALSE_BOUNDARY_FIELDS.map((field) => [field, false])
  ) as Record<string, false>;
}

function validScore(value: any): boolean {
  const numeric = numberOrNull(value);
  return numeric !== null && numeric >= 0 && numeric <= 100;
}

function readyFrom(intake: any): boolean {
  return intake?.owner_approval_state === "approved" &&
    intake?.review_state === "clear" &&
    intake?.source_owner_attestation?.attestation_state === "attested" &&
    intake?.k_min_posture?.cohort_threshold_met === true &&
    Number(intake?.k_min_posture?.minimum_cohort_threshold) >= 5;
}

function feedsFrom(intake: any, valid: boolean): VbdTokenAggregateIntakeValidationResult["feeds"] {
  const ready = valid && intake?.data_spine_source?.state === "present" && readyFrom(intake);
  return {
    data_spine_vbd_token_source: ready,
    measurement_cell_vbd_context: ready,
    claim_readiness_upgrade: false,
    finance_context_investigation_planning: false,
    customer_facing_financial_output: false
  };
}

export function buildVbdTokenAggregateIntake(
  input: BuildVbdTokenAggregateIntakeInput
): any {
  const velocity = Number(input.vbd.velocity);
  const breadth = Number(input.vbd.breadth);
  const depth = Number(input.vbd.depth);
  const integration = integrationScore(breadth, depth);
  const overall = vbdScore(velocity, breadth, depth);
  const ready = input.ownerApprovalState === "approved" &&
    input.reviewState === "clear" &&
    input.sourceOwnerAttestation?.attestation_state === "attested" &&
    input.kMinPosture?.cohort_threshold_met === true &&
    Number(input.kMinPosture?.minimum_cohort_threshold) >= 5;
  return {
    schema_version: AI_VALUE_VBD_TOKEN_AGGREGATE_INTAKE_SCHEMA_VERSION,
    intake_id: input.intakeId ??
      `vbd_token_aggregate_intake_${safeIdPart(input.orgId)}_${safeIdPart(input.workflowFamily)}`,
    org_id: input.orgId,
    client_id: input.clientId,
    source_ref: input.sourceRef,
    source_owner_role: input.sourceOwnerRole,
    source_posture: "scrubbed_aggregate_export_summary_only",
    owner_approval_state: input.ownerApprovalState,
    review_state: input.reviewState,
    workflow_family: input.workflowFamily,
    workflow_id: input.workflowId ?? null,
    function_area: input.functionArea,
    cohort_key: input.cohortKey,
    baseline_window: input.baselineWindow,
    comparison_window: input.comparisonWindow,
    vbd_context: {
      velocity,
      breadth,
      depth,
      integration_score: integration,
      overall_vbd_score: overall,
      threshold: VBD_THRESHOLD,
      vbd_quadrant: quadrant(velocity, integration),
      source_ref: input.sourceRef,
      suppression_state: ready ? "CLEAR" : "SUPPRESSED"
    },
    token_usage_role: "spend_or_intensity_context_only",
    token_context: {
      ...input.tokenSummary,
      source_ref: input.sourceRef,
      token_usage_role: "spend_or_intensity_context_only"
    },
    k_min_posture: input.kMinPosture,
    source_owner_attestation: input.sourceOwnerAttestation,
    data_spine_source: {
      state: ready ? "present" : "suppressed",
      intake_mode: "scrubbed_glean_export_summary",
      source_ref: input.sourceRef,
      org_id: input.orgId,
      client_id: input.clientId,
      workflow_family: input.workflowFamily,
      function_area: input.functionArea,
      cohort_key: input.cohortKey,
      baseline_window: input.baselineWindow,
      comparison_window: input.comparisonWindow,
      owner_approval_state: input.ownerApprovalState,
      review_state: input.reviewState,
      aggregate_only: true,
      connector_status: "scrubbed_export_only"
    },
    feeds: {
      data_spine_vbd_token_source: ready,
      measurement_cell_vbd_context: ready,
      claim_readiness_upgrade: false,
      finance_context_investigation_planning: false,
      customer_facing_financial_output: false
    },
    allowed_uses: [
      "aggregate_vbd_context",
      "token_intensity_overlay",
      "data_spine_source_preparation",
      "measurement_cell_vbd_context_preparation"
    ],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    boundary_policy: boundaryPolicy(),
    required_caveats: [
      "VBD score and integration score are aggregate workflow posture only.",
      "Token usage is spend/intensity context only and does not change the VBD formula.",
      "This contract accepts scrubbed aggregate export summaries only; it does not run BigQuery or ingest raw rows."
    ],
    generated_at: input.generatedAt ?? new Date(0).toISOString(),
    derivation_version: DERIVATION_VERSION
  };
}

export function validateVbdTokenAggregateIntake(
  intake: any
): VbdTokenAggregateIntakeValidationResult {
  const gaps: string[] = [];
  for (const field of [
    "schema_version",
    "intake_id",
    "org_id",
    "client_id",
    "source_ref",
    "source_owner_role",
    "source_posture",
    "owner_approval_state",
    "review_state",
    "workflow_family",
    "function_area",
    "cohort_key",
    "baseline_window",
    "comparison_window",
    "vbd_context",
    "token_usage_role",
    "token_context",
    "k_min_posture",
    "source_owner_attestation",
    "data_spine_source",
    "feeds",
    "allowed_uses",
    "blocked_uses",
    "boundary_policy",
    "required_caveats",
    "generated_at",
    "derivation_version"
  ]) {
    requireField(intake?.[field], field, gaps);
  }
  if (
    intake?.schema_version &&
    intake.schema_version !== AI_VALUE_VBD_TOKEN_AGGREGATE_INTAKE_SCHEMA_VERSION
  ) {
    gaps.push(`schema_version is invalid: ${intake.schema_version}`);
  }
  for (const field of ["velocity", "breadth", "depth", "overall_vbd_score", "integration_score"]) {
    if (!validScore(intake?.vbd_context?.[field])) {
      gaps.push(`vbd_context.${field} must be a number from 0 to 100`);
    }
  }
  const velocity = numberOrNull(intake?.vbd_context?.velocity);
  const breadth = numberOrNull(intake?.vbd_context?.breadth);
  const depth = numberOrNull(intake?.vbd_context?.depth);
  if (velocity !== null && breadth !== null && depth !== null) {
    const expectedOverall = vbdScore(velocity, breadth, depth);
    const expectedIntegration = integrationScore(breadth, depth);
    if (intake?.vbd_context?.overall_vbd_score !== expectedOverall) {
      gaps.push("vbd_context.overall_vbd_score must equal 0.30 velocity + 0.30 breadth + 0.40 depth");
    }
    if (intake?.vbd_context?.integration_score !== expectedIntegration) {
      gaps.push("vbd_context.integration_score must equal 0.40 breadth + 0.60 depth");
    }
    if (intake?.vbd_context?.vbd_quadrant !== quadrant(velocity, expectedIntegration)) {
      gaps.push("vbd_context.vbd_quadrant must match velocity/integration threshold placement");
    }
  }
  if (intake?.vbd_context?.threshold !== VBD_THRESHOLD) {
    gaps.push("vbd_context.threshold must be the fixed default threshold of 60");
  }
  if (intake?.token_usage_role !== "spend_or_intensity_context_only") {
    gaps.push("token_usage_role must be spend_or_intensity_context_only");
  }
  if (intake?.data_spine_source?.org_id !== intake?.org_id) {
    gaps.push("data_spine_source.org_id must match intake org_id");
  }
  if (intake?.data_spine_source?.client_id !== intake?.client_id) {
    gaps.push("data_spine_source.client_id must match intake client_id");
  }
  if (intake?.data_spine_source?.aggregate_only !== true) {
    gaps.push("data_spine_source.aggregate_only must be true");
  }
  if (intake?.feeds?.claim_readiness_upgrade !== false) {
    gaps.push("feeds.claim_readiness_upgrade must be false");
  }
  if (intake?.feeds?.finance_context_investigation_planning !== false) {
    gaps.push("feeds.finance_context_investigation_planning must be false");
  }
  if (intake?.feeds?.customer_facing_financial_output !== false) {
    gaps.push("feeds.customer_facing_financial_output must be false");
  }
  for (const use of REQUIRED_BLOCKED_USES) {
    if (!stringsOf(intake?.blocked_uses).includes(use)) {
      gaps.push(`blocked_uses missing ${use}`);
    }
  }
  for (const flag of REQUIRED_FALSE_BOUNDARY_FIELDS) {
    if (intake?.boundary_policy?.[flag] !== false) {
      gaps.push(`boundary_policy.${flag} must be false`);
    }
  }
  for (const field of [...collectForbiddenFields(intake)].sort()) {
    gaps.push(`Forbidden field detected: ${field}`);
  }
  const valid = gaps.length === 0;
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    intake_id: intake?.intake_id ?? null,
    org_id: intake?.org_id ?? null,
    client_id: intake?.client_id ?? null,
    valid,
    gaps,
    feeds: feedsFrom(intake, valid)
  };
}
