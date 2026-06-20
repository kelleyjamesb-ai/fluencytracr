/**
 * AI Value Engine - Data Spine Intake Readiness.
 *
 * Contract-only source alignment object for the productization spine. It
 * verifies whether Blueprint, AI Fluency, VBD/token, customer metric,
 * assumption, and governance inputs align on the same aggregate org, client,
 * workflow, cohort, and windows before Measurement Cell assembly. It does not
 * parse files, run BigQuery, persist data, create routes/UI, or emit ROI,
 * causality, productivity, financial attribution, confidence, or probability.
 */

export const AI_VALUE_DATA_SPINE_READINESS_SCHEMA_VERSION =
  "FT_AI_VALUE_DATA_SPINE_READINESS_2026_06";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_DATA_SPINE_READINESS_VALIDATION_2026_06";

const DERIVATION_VERSION =
  "ai_value_data_spine_readiness_2026_06";

const SOURCE_KEYS = [
  "blueprint",
  "ai_fluency",
  "vbd_token",
  "customer_metric",
  "assumption",
  "governance"
] as const;

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

const REQUIRED_FALSE_BOUNDARY_FLAGS = [
  "creates_migrations",
  "creates_prisma_schema",
  "creates_backend_routes",
  "creates_frontend_ui",
  "creates_ingestion_jobs",
  "persists_source_data",
  "runs_bigquery",
  "parses_uploaded_documents",
  "emits_confidence_percentage",
  "emits_probability",
  "computes_roi",
  "computes_causality",
  "computes_productivity",
  "emits_financial_attribution",
  "customer_facing_financial_output"
];

const ALLOWED_READINESS_STATES = new Set([
  "NOT_READY",
  "INTAKE_REVIEW_READY",
  "MEASUREMENT_CELL_READY"
]);

const ALLOWED_SOURCE_STATES = new Set([
  "missing",
  "present",
  "partial",
  "submitted",
  "pending_approval",
  "held",
  "suppressed",
  "blocked"
]);

const ALLOWED_INTAKE_MODES = new Set([
  "blueprint_document_upload",
  "blueprint_structured_import",
  "ai_fluency_dashboard_export",
  "ai_fluency_aggregate_upload",
  "scrubbed_glean_bigquery_export",
  "scrubbed_glean_export_summary",
  "manual_customer_metric_entry",
  "customer_metric_aggregate_export",
  "assumption_approval",
  "governance_attestation",
  "structured_object",
  "missing"
]);

const ALLOWED_OWNER_APPROVAL_STATES = new Set([
  "missing",
  "submitted",
  "approved",
  "rejected",
  "held",
  "not_required"
]);

const ALLOWED_REVIEW_STATES = new Set([
  "clear",
  "needs_review",
  "held",
  "suppressed",
  "blocked"
]);

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
  /employee_email/i,
  /employee_name/i,
  /respondent_email/i,
  /person_id/i,
  /person_identifier/i,
  /hashed_(?:user|person|employee)_id/i,
  /joinable_(?:user|person|employee)_identifier/i,
  /person_level_productivity/i,
  /person_level_hris/i,
  /manager_ranking/i,
  /team_ranking/i,
  /people_decisioning/i,
  /^confidence_percentage$/i,
  /^confidence_percent$/i,
  /^probability$/i,
  /contribution_probability/i,
  /contribution_likelihood/i,
  /^roi$/i,
  /realized_roi/i,
  /^ebita$/i,
  /^ebitda$/i,
  /financial_attribution/i,
  /^financial_output$/i,
  /^customer_facing_financial_output$/i,
  /^backend_routes?$/i,
  /^frontend_ui$/i,
  /^persistence_table$/i,
  /^schema_ref$/i
];

const GOVERNED_KEY_ALLOWLIST = new Set([
  "blocked_uses",
  "boundary_policy",
  ...REQUIRED_FALSE_BOUNDARY_FLAGS
]);

export interface DataSpineIntakeReadinessValidationResult {
  schema_version: string;
  data_spine_readiness_id: string | null;
  org_id: string | null;
  client_id: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    measurement_cell_input: boolean;
    value_hypothesis_packet_runner: boolean;
    customer_facing_financial_output: false;
  };
}

export interface BuildDataSpineIntakeReadinessInput {
  dataSpineReadinessId?: string;
  orgId: string;
  clientId: string;
  workflowFamily: string;
  functionArea: string;
  cohortKey: string;
  baselineWindow: any;
  comparisonWindow: any;
  sources: {
    blueprint?: any;
    aiFluency?: any;
    vbdToken?: any;
    customerMetric?: any;
    assumption?: any;
    governance?: any;
  };
  generatedAt?: string;
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

function requireField(value: any, path: string, gaps: string[]): void {
  if (value === undefined || value === null || value === "") {
    gaps.push(`${path} is missing`);
  }
}

function stringsOf(value: any): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function normalizeState(value: any, fallback: string): string {
  return normalizeKey(String(value ?? fallback));
}

function sameWindow(left: any, right: any): boolean {
  return left?.window_start === right?.window_start && left?.window_end === right?.window_end;
}

function canonicalSource(input: BuildDataSpineIntakeReadinessInput, source: any = {}): any {
  const state = normalizeState(source.state, source.source_ref ? "present" : "missing");
  return {
    state,
    intake_mode: normalizeState(source.intake_mode, state === "missing" ? "missing" : "structured_object"),
    source_ref: source.source_ref ?? null,
    org_id: source.org_id ?? input.orgId,
    client_id: source.client_id ?? input.clientId,
    workflow_family: source.workflow_family ?? input.workflowFamily,
    function_area: source.function_area ?? input.functionArea,
    cohort_key: source.cohort_key ?? input.cohortKey,
    baseline_window: source.baseline_window ?? input.baselineWindow,
    comparison_window: source.comparison_window ?? input.comparisonWindow,
    owner_approval_state: normalizeState(source.owner_approval_state, "missing"),
    review_state: normalizeState(source.review_state, "needs_review"),
    aggregate_only: source.aggregate_only ?? true,
    metric_id: source.metric_id ?? null,
    connector_status: source.connector_status ?? null,
    aligned: false
  };
}

function alignedSource(input: BuildDataSpineIntakeReadinessInput, source: any): boolean {
  return source.org_id === input.orgId &&
    source.client_id === input.clientId &&
    source.workflow_family === input.workflowFamily &&
    source.function_area === input.functionArea &&
    source.cohort_key === input.cohortKey &&
    sameWindow(source.baseline_window, input.baselineWindow) &&
    sameWindow(source.comparison_window, input.comparisonWindow);
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
    if (
      !GOVERNED_KEY_ALLOWLIST.has(normalized) &&
      FORBIDDEN_FIELD_PATTERNS.some((pattern) => pattern.test(key) || pattern.test(normalized))
    ) {
      fields.add(currentPath.join("."));
    }
    collectForbiddenFields(nested, fields, currentPath);
  }
  return fields;
}

function sourceGapKey(sourceKey: string): string {
  switch (sourceKey) {
    case "blueprint": return "BLUEPRINT_APPROVAL_REQUIRED";
    case "ai_fluency": return "AI_FLUENCY_AGGREGATE_REQUIRED";
    case "vbd_token": return "VBD_TOKEN_AGGREGATE_REQUIRED";
    case "customer_metric": return "CUSTOMER_METRIC_REQUIRED";
    case "assumption": return "ASSUMPTION_APPROVAL_REQUIRED";
    case "governance": return "GOVERNANCE_ATTESTATION_REQUIRED";
    default: return `${sourceKey.toUpperCase()}_REQUIRED`;
  }
}

function sourceReady(source: any): boolean {
  return source.state === "present" &&
    source.source_ref &&
    source.owner_approval_state === "approved" &&
    source.review_state === "clear" &&
    source.aggregate_only === true &&
    source.aligned === true;
}

function deriveMissingEvidence(sourceReadiness: Record<string, any>): string[] {
  const missing: string[] = [];
  for (const key of SOURCE_KEYS) {
    if (!sourceReady(sourceReadiness[key])) missing.push(sourceGapKey(key));
  }
  return missing;
}

function deriveNextActions(missing: string[]): string[] {
  const actions: string[] = [];
  if (missing.includes("BLUEPRINT_APPROVAL_REQUIRED")) {
    actions.push("Approve parsed Blueprint extraction before Measurement Cell assembly.");
  }
  if (missing.includes("AI_FLUENCY_AGGREGATE_REQUIRED")) {
    actions.push("Import validated aggregate AI Fluency dashboard export for the client and window.");
  }
  if (missing.includes("VBD_TOKEN_AGGREGATE_REQUIRED")) {
    actions.push("Provide scrubbed aggregate Glean/BigQuery VBD and token export summary.");
  }
  if (missing.includes("CUSTOMER_METRIC_REQUIRED")) {
    actions.push("Submit or approve customer-owned aggregate metric evidence for the selected metric.");
  }
  if (missing.includes("ASSUMPTION_APPROVAL_REQUIRED")) {
    actions.push("Attach customer-owned assumption approval before packet assembly.");
  }
  if (missing.includes("GOVERNANCE_ATTESTATION_REQUIRED")) {
    actions.push("Attach governance attestation confirming aggregate-only source posture.");
  }
  return actions;
}

function baseFeeds(ready: boolean): DataSpineIntakeReadinessValidationResult["feeds"] {
  return {
    measurement_cell_input: ready,
    value_hypothesis_packet_runner: ready,
    customer_facing_financial_output: false
  };
}

export function buildDataSpineIntakeReadiness(
  input: BuildDataSpineIntakeReadinessInput
): any {
  const source_readiness: Record<string, any> = {
    blueprint: canonicalSource(input, input.sources.blueprint),
    ai_fluency: canonicalSource(input, input.sources.aiFluency),
    vbd_token: canonicalSource(input, input.sources.vbdToken),
    customer_metric: canonicalSource(input, input.sources.customerMetric),
    assumption: canonicalSource(input, input.sources.assumption),
    governance: canonicalSource(input, input.sources.governance)
  };

  for (const source of Object.values(source_readiness)) {
    source.aligned = alignedSource(input, source);
  }

  const missing_evidence = deriveMissingEvidence(source_readiness);
  const ready = missing_evidence.length === 0;
  const readiness_state = ready ? "MEASUREMENT_CELL_READY" : "INTAKE_REVIEW_READY";

  return {
    schema_version: AI_VALUE_DATA_SPINE_READINESS_SCHEMA_VERSION,
    data_spine_readiness_id: input.dataSpineReadinessId ??
      `data_spine_readiness_${safeIdPart(input.orgId)}_${safeIdPart(input.workflowFamily)}_${safeIdPart(input.cohortKey)}`,
    org_id: input.orgId,
    client_id: input.clientId,
    workflow_family: input.workflowFamily,
    function_area: input.functionArea,
    cohort_key: input.cohortKey,
    baseline_window: input.baselineWindow,
    comparison_window: input.comparisonWindow,
    readiness_state,
    source_readiness,
    missing_evidence,
    next_actions: ready
      ? ["Build Measurement Cell from aligned approved source spine."]
      : deriveNextActions(missing_evidence),
    feeds: baseFeeds(ready),
    allowed_uses: [
      "source_alignment_review",
      "measurement_cell_preparation",
      "value_hypothesis_packet_preparation"
    ],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    boundary_policy: Object.fromEntries(
      REQUIRED_FALSE_BOUNDARY_FLAGS.map((flag) => [flag, false])
    ),
    required_caveats: [
      "Data Spine Intake Readiness verifies aggregate source alignment only; it is not ROI proof, causality, productivity measurement, financial attribution, a confidence percentage, or customer-facing financial output.",
      "Glean/BigQuery VBD and token evidence must enter as scrubbed aggregate summaries; this contract does not run BigQuery or ingest raw rows.",
      "Blueprint document uploads must become approved structured extraction objects before they can feed Measurement Cell assembly.",
      "Manual customer metric entries require owner approval and aligned windows before they can feed Measurement Cell assembly."
    ],
    generated_at: input.generatedAt ?? new Date(0).toISOString(),
    derivation_version: DERIVATION_VERSION
  };
}

function collectTopLevelGaps(spine: any): string[] {
  const gaps: string[] = [];
  for (const field of [
    "schema_version",
    "data_spine_readiness_id",
    "org_id",
    "client_id",
    "workflow_family",
    "function_area",
    "cohort_key",
    "baseline_window",
    "comparison_window",
    "readiness_state",
    "source_readiness",
    "missing_evidence",
    "next_actions",
    "feeds",
    "allowed_uses",
    "blocked_uses",
    "boundary_policy",
    "required_caveats",
    "generated_at",
    "derivation_version"
  ]) {
    requireField(spine?.[field], field, gaps);
  }
  if (
    spine?.schema_version &&
    spine.schema_version !== AI_VALUE_DATA_SPINE_READINESS_SCHEMA_VERSION
  ) {
    gaps.push(`schema_version is invalid: ${spine.schema_version}`);
  }
  if (
    spine?.readiness_state &&
    !ALLOWED_READINESS_STATES.has(String(spine.readiness_state))
  ) {
    gaps.push(`readiness_state is invalid: ${spine.readiness_state}`);
  }
  return gaps;
}

function collectSourceGaps(spine: any): string[] {
  const gaps: string[] = [];
  for (const key of SOURCE_KEYS) {
    const source = spine?.source_readiness?.[key];
    requireField(source, `source_readiness.${key}`, gaps);
    if (!source) continue;
    for (const field of [
      "state",
      "intake_mode",
      "org_id",
      "client_id",
      "workflow_family",
      "function_area",
      "cohort_key",
      "baseline_window",
      "comparison_window",
      "owner_approval_state",
      "review_state",
      "aggregate_only",
      "aligned"
    ]) {
      requireField(source[field], `source_readiness.${key}.${field}`, gaps);
    }
    if (!ALLOWED_SOURCE_STATES.has(String(source.state))) {
      gaps.push(`source_readiness.${key}.state is invalid: ${source.state}`);
    }
    if (!ALLOWED_INTAKE_MODES.has(String(source.intake_mode))) {
      gaps.push(`source_readiness.${key}.intake_mode is invalid: ${source.intake_mode}`);
    }
    if (!ALLOWED_OWNER_APPROVAL_STATES.has(String(source.owner_approval_state))) {
      gaps.push(
        `source_readiness.${key}.owner_approval_state is invalid: ${source.owner_approval_state}`
      );
    }
    if (!ALLOWED_REVIEW_STATES.has(String(source.review_state))) {
      gaps.push(`source_readiness.${key}.review_state is invalid: ${source.review_state}`);
    }
    if (source.org_id !== spine?.org_id) {
      gaps.push(`${key}.org_id must match data spine org_id`);
    }
    if (source.client_id !== spine?.client_id) {
      gaps.push(`${key}.client_id must match data spine client_id`);
    }
    if (source.workflow_family !== spine?.workflow_family) {
      gaps.push(`${key}.workflow_family must match data spine workflow_family`);
    }
    if (source.function_area !== spine?.function_area) {
      gaps.push(`${key}.function_area must match data spine function_area`);
    }
    if (source.cohort_key !== spine?.cohort_key) {
      gaps.push(`${key}.cohort_key must match data spine cohort_key`);
    }
    if (!sameWindow(source.baseline_window, spine?.baseline_window)) {
      gaps.push(`${key}.baseline_window must match data spine baseline_window`);
    }
    if (!sameWindow(source.comparison_window, spine?.comparison_window)) {
      gaps.push(`${key}.comparison_window must match data spine comparison_window`);
    }
  }
  return gaps;
}

function collectBoundaryGaps(spine: any): string[] {
  const gaps: string[] = [];
  for (const use of REQUIRED_BLOCKED_USES) {
    if (!stringsOf(spine?.blocked_uses).includes(use)) {
      gaps.push(`blocked_uses missing ${use}`);
    }
  }
  for (const flag of REQUIRED_FALSE_BOUNDARY_FLAGS) {
    if (spine?.boundary_policy?.[flag] !== false) {
      gaps.push(`boundary_policy.${flag} must be false`);
    }
  }
  if (spine?.feeds?.customer_facing_financial_output !== false) {
    gaps.push("feeds.customer_facing_financial_output must be false");
  }
  for (const field of [...collectForbiddenFields(spine)].sort()) {
    gaps.push(`Forbidden field detected: ${field}`);
  }
  return gaps;
}

function feedState(spine: any, valid: boolean): DataSpineIntakeReadinessValidationResult["feeds"] {
  const ready = valid && spine?.readiness_state === "MEASUREMENT_CELL_READY";
  return baseFeeds(ready);
}

export function validateDataSpineIntakeReadiness(
  spine: any
): DataSpineIntakeReadinessValidationResult {
  const gaps = [
    ...collectTopLevelGaps(spine),
    ...collectSourceGaps(spine),
    ...collectBoundaryGaps(spine)
  ];
  const valid = gaps.length === 0;
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    data_spine_readiness_id: spine?.data_spine_readiness_id ?? null,
    org_id: spine?.org_id ?? null,
    client_id: spine?.client_id ?? null,
    valid,
    gaps,
    feeds: feedState(spine, valid)
  };
}
