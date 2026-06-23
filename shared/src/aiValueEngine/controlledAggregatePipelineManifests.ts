import { createHash } from "node:crypto";

/**
 * AI Value Engine - Controlled Aggregate Pipeline Manifest Validators.
 *
 * Pure, non-persisted validators for Source Inventory, Aggregate Extraction,
 * and Pipeline Run Review manifests. This layer validates reviewed aggregate
 * metadata only; it does not run connectors, execute queries, write storage,
 * add schemas/routes/UI, render exports, or authorize finance/research output.
 */

export const AI_VALUE_SOURCE_INVENTORY_MANIFEST_SCHEMA_VERSION =
  "FT_AI_VALUE_SOURCE_INVENTORY_MANIFEST_2026_06";
export const AI_VALUE_AGGREGATE_EXTRACTION_MANIFEST_SCHEMA_VERSION =
  "FT_AI_VALUE_AGGREGATE_EXTRACTION_MANIFEST_2026_06";
export const AI_VALUE_PIPELINE_RUN_REVIEW_MANIFEST_SCHEMA_VERSION =
  "FT_AI_VALUE_PIPELINE_RUN_REVIEW_MANIFEST_2026_06";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTROLLED_AGGREGATE_MANIFEST_VALIDATION_2026_06";

const ALLOWED_SOURCE_LANES = new Set([
  "blueprint",
  "ai_fluency",
  "vbd_token",
  "customer_metric",
  "assumption",
  "governance"
]);

const ALLOWED_SOURCE_SYSTEMS = new Set(["bigquery_export", "sigma_export"]);

const ALLOWED_SOURCE_OWNER_ROLES: Record<string, string> = {
  bigquery_export: "customer_data_platform_owner",
  sigma_export: "customer_analytics_owner"
};

const SAFE_ID_PATTERN = /^[a-z][a-z0-9_]{2,159}$/;
const HEX_64_PATTERN = /^[a-f0-9]{64}$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const APPROVED_AGGREGATE_FIELD_NAMES = new Set([
  "workflow_family",
  "workflow_id",
  "function_area",
  "cohort_key",
  "window_start",
  "window_end",
  "aggregate_grain",
  "aggregate_count",
  "cohort_count",
  "event_count",
  "k_min_state",
  "suppression_state",
  "support_median_resolution_hours",
  "resolution_time",
  "first_contact_resolution",
  "escalation_rate",
  "abandonment_rate",
  "verification_rate",
  "reuse_rate",
  "delegation_rate",
  "recovery_rate",
  "token_count",
  "token_cost_index",
  "token_efficiency_index",
  "vbd_quality_index",
  "vbd_reuse_index",
  "ai_fluency_confidence_mean",
  "ai_fluency_usage_quality_mean",
  "ai_fluency_behavior_change_mean",
  "ai_fluency_leadership_reinforcement_mean",
  "ai_fluency_capability_growth_mean",
  "customer_metric_value",
  "governed_value_driver",
  "approved_expectation_path_id"
]);

const SOURCE_INVENTORY_ALLOWED_USES = [
  "source_inventory_review",
  "aggregate_extraction_candidate"
];

const AGGREGATE_EXTRACTION_ALLOWED_USES = [
  "aggregate_extraction_review",
  "pipeline_run_review_candidate"
];

const PIPELINE_REVIEW_ALLOWED_USES = ["manual_operator_promotion_review"];

const REQUIRED_BLOCKED_USES = [
  "live_bigquery_execution",
  "live_sigma_execution",
  "live_glean_query",
  "customer_connector_execution",
  "credential_access",
  "query_execution",
  "raw_row_ingestion",
  "source_package_clearance",
  "measurement_cell_creation",
  "measurement_cell_snapshot_persistence",
  "measurement_cell_series_persistence",
  "persistence_write",
  "route_creation",
  "ui_creation",
  "schema_creation",
  "export_creation",
  "customer_facing_output",
  "customer_facing_financial_output",
  "customer_facing_economic_output",
  "financial_attribution",
  "realized_roi",
  "ebitda_claim",
  "causality_claim",
  "productivity_claim",
  "probability_output",
  "contribution_model_not_authorized",
  "research_model_not_promoted",
  "financial_claim_blocked"
];

const REQUIRED_BLOCKED_CLAIMS = [
  "source_package_cleared",
  "measurement_cell_ready",
  "measurement_cell_snapshot_ready",
  "measurement_cell_series_ready",
  "finance_context_ready",
  "customer_output_ready",
  "roi_claim",
  "ebitda_claim",
  "causality_claim",
  "productivity_claim",
  "probability_output",
  "contribution_model_not_authorized",
  "research_model_not_promoted",
  "financial_claim_blocked"
];

const SOURCE_INVENTORY_REQUIRED_CAVEATS = [
  "Source inventory manifest only; it does not authorize live connector execution.",
  "Source inventory readiness is not Source Package clearance.",
  "Source inventory readiness is not Measurement Cell readiness."
];

const AGGREGATE_EXTRACTION_REQUIRED_CAVEATS = [
  "Aggregate extraction manifest only; it does not authorize FluencyTracr query execution.",
  "Aggregate extraction review is not Source Package clearance.",
  "Aggregate extraction review is not Measurement Cell readiness."
];

const PIPELINE_REVIEW_REQUIRED_CAVEATS = [
  "Pipeline run review manifest only; it is manual promotion-review context.",
  "Pipeline run review does not feed intake, persist records, or clear Source Package review.",
  "Pipeline run review is not Measurement Cell, Series, research-model, finance, or customer output."
];

const SAFE_CAVEAT_VALUES = new Set([
  ...SOURCE_INVENTORY_REQUIRED_CAVEATS,
  ...AGGREGATE_EXTRACTION_REQUIRED_CAVEATS,
  ...PIPELINE_REVIEW_REQUIRED_CAVEATS
]);

const SOURCE_INVENTORY_FALSE_BOUNDARY_FIELDS = [
  "runs_live_connector",
  "executes_query",
  "uses_credentials",
  "stores_query_text",
  "stores_raw_rows",
  "stores_dashboard_rows",
  "stores_prompts",
  "stores_transcripts",
  "stores_user_identifiers",
  "creates_source_package",
  "clears_source_package_review",
  "creates_measurement_cell",
  "creates_measurement_cell_snapshot",
  "creates_measurement_cell_series",
  "feeds_research_model",
  "emits_probability",
  "computes_roi",
  "emits_financial_output",
  "emits_customer_facing_output"
];

const AGGREGATE_EXTRACTION_FALSE_BOUNDARY_FIELDS = [
  "fluencytracr_runs_bigquery",
  "fluencytracr_runs_sigma",
  "fluencytracr_runs_glean_query",
  "fluencytracr_uses_credentials",
  "query_text_stored",
  "raw_rows_present",
  "dashboard_rows_present",
  "prompts_present",
  "transcripts_present",
  "user_identifiers_present",
  "source_package_cleared",
  "measurement_cell_created",
  "measurement_cell_snapshot_created",
  "measurement_cell_series_created",
  "research_model_input_created",
  "probability_output_created",
  "roi_output_created",
  "financial_output_created",
  "customer_facing_output_created"
];

const PIPELINE_REVIEW_FALSE_BOUNDARY_FIELDS = [
  "runs_live_connector",
  "executes_query",
  "uses_credentials",
  "stores_query_text",
  "stores_raw_rows",
  "stores_dashboard_rows",
  "stores_prompts",
  "stores_transcripts",
  "stores_user_identifiers",
  "creates_source_package",
  "clears_source_package_review",
  "creates_measurement_cell",
  "creates_measurement_cell_snapshot",
  "creates_measurement_cell_series",
  "writes_persistence",
  "creates_route",
  "creates_ui",
  "creates_schema",
  "creates_export",
  "renders_readout",
  "feeds_research_model",
  "emits_probability",
  "computes_roi",
  "emits_financial_output",
  "emits_customer_facing_output"
];

const SOURCE_INVENTORY_FIELDS = new Set([
  "source_inventory_manifest_id",
  "schema_version",
  "source_lane",
  "source_system",
  "source_category",
  "source_owner_role",
  "source_owner_attestation",
  "org_id",
  "client_id",
  "workflow_family",
  "function_area",
  "cohort_key",
  "approved_source_ref",
  "approved_extraction_window",
  "approved_aggregate_grain",
  "approved_output_fields",
  "k_min_posture",
  "suppression_posture",
  "legal_trust_review_state",
  "allowed_uses",
  "blocked_uses",
  "boundary_policy",
  "required_caveats",
  "generated_at"
]);

const AGGREGATE_EXTRACTION_FIELDS = new Set([
  "aggregate_extraction_manifest_id",
  "schema_version",
  "source_inventory_manifest_ref",
  "source_system",
  "execution_boundary",
  "approved_aggregate_definition_ref",
  "upstream_aggregate_attestation_ref",
  "org_id",
  "client_id",
  "workflow_family",
  "function_area",
  "cohort_key",
  "extraction_window",
  "aggregate_grain",
  "metric_definitions",
  "source_package_lane",
  "aggregate_output_ref",
  "aggregate_output_hash",
  "k_min_posture",
  "suppression_results",
  "freshness_state",
  "owner_review_state",
  "allowed_uses",
  "blocked_uses",
  "boundary_policy",
  "required_caveats",
  "generated_at"
]);

const PIPELINE_RUN_REVIEW_FIELDS = new Set([
  "pipeline_run_review_manifest_id",
  "schema_version",
  "pipeline_review_state",
  "source_inventory_manifest_ref",
  "aggregate_extraction_manifest_ref",
  "operator_role",
  "source_owner_role",
  "org_id",
  "client_id",
  "measurement_plan_id",
  "workflow_family",
  "workflow_id",
  "function_area",
  "cohort_key",
  "baseline_window",
  "comparison_window",
  "metric_id",
  "expectation_path_id",
  "reviewed_aggregate_source_refs",
  "data_spine_alignment_envelope",
  "source_package_review_queue_posture_ref",
  "validation_result_refs",
  "allowed_uses",
  "blocked_claims",
  "blocked_uses",
  "boundary_policy",
  "required_caveats",
  "stop_conditions",
  "generated_at"
]);

const MANIFEST_REF_FIELDS = new Set([
  "manifest_id",
  "manifest_hash",
  "source_lane",
  "source_system",
  "source_ref",
  "org_id",
  "client_id",
  "workflow_family",
  "function_area",
  "cohort_key",
  "window",
  "aggregate_grain"
]);

const WINDOW_FIELDS = new Set(["window_start", "window_end"]);
const SUPPRESSION_RESULT_FIELDS = new Set([
  "suppression_state",
  "k_min_state",
  "held_telemetry_present",
  "suppressed_telemetry_present"
]);
const SOURCE_PACKAGE_QUEUE_REF_FIELDS = new Set([
  "queue_ref",
  "queue_state",
  "reviewed_at",
  "reviewed_by_role"
]);
const VALIDATION_RESULT_REF_FIELDS = new Set([
  "source_inventory_validation_ref",
  "source_inventory_validation_hash",
  "aggregate_extraction_validation_ref",
  "aggregate_extraction_validation_hash",
  "connector_adapter_ref"
]);
const DATA_SPINE_ALIGNMENT_FIELDS = new Set([
  "source_lane",
  "source_system",
  "source_ref",
  "source_owner_role",
  "org_id",
  "client_id",
  "measurement_plan_id",
  "workflow_family",
  "workflow_id",
  "function_area",
  "cohort_key",
  "baseline_window",
  "comparison_window",
  "metric_id",
  "expectation_path_id",
  "expectation_path_version",
  "expectation_path_hash",
  "approved_blueprint_payload_hash",
  "approval_state",
  "approved_at",
  "approved_by_role"
]);

const APPROVED_EXPECTATION_PATH_BINDING_FIELDS = new Set([
  "expectation_path_id",
  "expectation_path_version",
  "expectation_path_hash",
  "approved_blueprint_payload_hash",
  "approval_state",
  "approved_at",
  "approved_by_role"
]);

const SOURCE_PACKAGE_QUEUE_STATES = new Set([
  "DATA_SPINE_REVIEW_READY",
  "HELD_FOR_SOURCE_REVIEW",
  "BLOCKED_FOR_DATA_SPINE_VALIDATION"
]);

const PIPELINE_REVIEW_STATES = new Set([
  "ELIGIBLE_FOR_OPERATOR_PROMOTION_REVIEW",
  "HELD_FOR_SOURCE_INVENTORY",
  "HELD_FOR_AGGREGATE_EXTRACTION",
  "HELD_FOR_SUPPRESSION_REVIEW",
  "HELD_FOR_SOURCE_PACKAGE_QUEUE_REF",
  "HELD_FOR_DATA_SPINE_ALIGNMENT",
  "BLOCKED"
]);

const FORBIDDEN_FIELD_PATTERNS = [
  /^raw_rows?$/i,
  /^rows$/i,
  /^records$/i,
  /^events$/i,
  /^samples$/i,
  /raw_(?:prompt|response|transcript|content|file|export|event|row|rows|data)/i,
  /prompt/i,
  /transcript/i,
  /^query$/i,
  /query_text/i,
  /query_ref/i,
  /query_id/i,
  /sql_text/i,
  /bigquery_sql/i,
  /bigquery_job/i,
  /job_id/i,
  /sigma_query/i,
  /sigma_api/i,
  /api_run/i,
  /api_request/i,
  /query_job/i,
  /connector_job/i,
  /connector_status/i,
  /ingestion_job/i,
  /live_connector/i,
  /raw_table/i,
  /row_id/i,
  /span_id/i,
  /credentials?/i,
  /credential_ref/i,
  /dashboard_url/i,
  /export_url/i,
  /email/i,
  /user_id/i,
  /employee_id/i,
  /employee_email/i,
  /employee_name/i,
  /respondent_id/i,
  /respondent_email/i,
  /respondent_identifier/i,
  /person_id/i,
  /person_identifier/i,
  /hashed_(?:user|person|employee)_id/i,
  /joinable_(?:user|person|employee)_identifier/i,
  /hris/i,
  /ranking/i,
  /^score$/i,
  /model_score/i,
  /^probability$/i,
  /probability/i,
  /likelihood/i,
  /^p_value$/i,
  /^confidence$/i,
  /confidence/i,
  /^roi$/i,
  /realized_roi/i,
  /roi_(?:value|amount|calculation|result|impact|output|proof)/i,
  /return_on_investment/i,
  /^ebitda$/i,
  /ebitda_(?:claim|value|amount|impact|calculation|result)/i,
  /financial_impact/i,
  /financial_attribution/i,
  /^financial_output$/i,
  /finance_(?:output|result|value|claim)/i,
  /^customer_facing_output$/i,
  /^customer_facing_financial_output$/i,
  /^customer_facing_economic_output$/i,
  /causality/i,
  /causal/i,
  /productivity/i,
  /^source_package_payload$/i,
  /^source_packages$/i,
  /^measurement_cell$/i,
  /^measurement_cell_snapshot$/i,
  /^measurement_cell_series$/i,
  /^full_expectation_path_registry$/i,
  /^payload_json$/i,
  /^validation_json$/i,
  /^source_refs_json$/i,
  /^blueprint_path_binding_json$/i
];

const FORBIDDEN_VALUE_PATTERNS = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /(?:^|_)(?:user|employee|person|respondent)_(?:id|identifier|email|name)(?:_|$)/i,
  /(?:^|_)(?:hashed|joinable)_(?:user|person|employee|respondent)_(?:id|identifier|email)(?:_|$)/i,
  /(?:^|_)(?:hashed|joinable)_(?:id|identifier)(?:_|$)/i,
  /https?:\/\//i,
  /select\s+.+\s+from/i,
  /\bbquxjob_/i,
  /\bjob_[a-z0-9_-]{8,}/i,
  /raw_rows?/i,
  /query_text/i,
  /query_ref/i,
  /query_id/i,
  /raw_table/i,
  /\bsql\b/i,
  /prompt/i,
  /transcript/i,
  /credential/i,
  /bigquery_job/i,
  /job_id/i,
  /sigma_(?:run|dashboard|api)/i,
  /sigma_export_(?:dashboard|run|job|api|request|status|url|raw|row)/i,
  /api_run/i,
  /api_request/i,
  /connector_job/i,
  /connector_status/i,
  /ingestion_job/i,
  /replay_handle/i,
  /inspection_handle/i,
  /row_id/i,
  /span_id/i,
  /dashboard_url/i,
  /export_url/i,
  /live_bigquery_execution/i,
  /live_sigma_execution/i,
  /live_glean_query/i,
  /customer_connector_execution/i,
  /source_package_(?:clearance|cleared|approved|passed)/i,
  /measurement_cell_(?:created|ready|snapshot|series)/i,
  /ready_for_measurement/i,
  /snapshot_candidate/i,
  /series_ready/i,
  /persisted_snapshot/i,
  /customer_facing_output/i,
  /customer_facing_financial_output/i,
  /customer_facing_economic_output/i,
  /finance_context/i,
  /finance_(?:output|result|value|claim)/i,
  /financial_attribution/i,
  /financial_impact/i,
  /financial_(?:output|result|value|claim)/i,
  /realized_roi/i,
  /return_on_investment/i,
  /confidence/i,
  /score/i,
  /probability/i,
  /ebitda/i,
  /caus(?:al|ality)/i,
  /productivity/i,
  /all checks passed/i
];

export interface AiValueControlledAggregateManifestValidationResult {
  schema_version: string;
  valid: boolean;
  gaps: string[];
}

export interface AiValueApprovedExpectationPathBinding {
  expectation_path_id: string;
  expectation_path_version: number;
  expectation_path_hash: string;
  approved_blueprint_payload_hash: string;
  approval_state: string;
  approved_at: string;
  approved_by_role: string;
}

export interface ValidateAiValueAggregateExtractionManifestOptions {
  sourceInventoryManifest: any;
}

export interface ValidateAiValuePipelineRunReviewManifestOptions {
  sourceInventoryManifest: any;
  aggregateExtractionManifest: any;
  approvedExpectationPathBinding: AiValueApprovedExpectationPathBinding;
}

export interface ValidateAiValueControlledAggregateManifestChainInput {
  sourceInventoryManifest: any;
  aggregateExtractionManifest: any;
  pipelineRunReviewManifest: any;
  approvedExpectationPathBinding: AiValueApprovedExpectationPathBinding;
}

function normalizeKey(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function safeIdPart(value: any): string {
  return normalizeKey(String(value ?? "missing")) || "missing";
}

function isPlainObject(value: any): boolean {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireField(value: any, path: string, gaps: string[]): void {
  if (value === undefined || value === null || value === "") {
    gaps.push(`${path} is missing`);
  }
}

function canonicalize(value: any): any {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])])
  );
}

function sha256Json(value: any): string {
  const serialized = JSON.stringify(canonicalize(value));
  return createHash("sha256")
    .update(serialized ?? "null")
    .digest("hex");
}

function safeHash(value: any): string | null {
  return HEX_64_PATTERN.test(String(value ?? "")) ? String(value) : null;
}

function safeString(value: any, maxLength = 240): string | null {
  if (typeof value !== "string") return null;
  if (value.length === 0 || value.length > maxLength) return null;
  if (FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value) || pattern.test(normalizeKey(value)))) {
    return null;
  }
  return value;
}

function safeRefString(value: any, maxLength = 180): string | null {
  if (typeof value !== "string") return null;
  if (value.length === 0 || value.length > maxLength) return null;
  if (!SAFE_ID_PATTERN.test(value)) return null;
  const normalized = normalizeKey(value);
  if (/^eyj[a-z0-9_]{8,}$/i.test(normalized)) return null;
  if (/[a-f0-9]{24,}/i.test(normalized)) return null;
  if (/(?:^|_)raw_table(?:_|$)/i.test(normalized)) return null;
  if (/(?:^|_)query_(?:id|ref|job)(?:_|$)/i.test(normalized)) return null;
  if (/(?:^|_)(?:job|run|request)_id(?:_|$)/i.test(normalized)) return null;
  if (/(?:^|_)(?:api|connector|ingestion)_(?:run|job|request|status)(?:_|$)/i.test(normalized)) return null;
  if (/(?:^|_)(?:row|span)_id(?:_|$)/i.test(normalized)) return null;
  if (/(?:^|_)(?:replay|inspection)_handle(?:_|$)/i.test(normalized)) return null;
  if (FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value) || pattern.test(normalized))) {
    return null;
  }
  return value;
}

function safeSourceRef(value: any, sourceSystem: string): string | null {
  const ref = safeRefString(value);
  if (!ref) return null;
  if (!ref.startsWith(`${sourceSystem}_`)) return null;
  return ref;
}

function isValidIsoDate(value: any): boolean {
  const dateString = String(value ?? "");
  if (!ISO_DATE_PATTERN.test(dateString)) return false;
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

function safeWindow(value: any): any {
  if (!isPlainObject(value)) return null;
  const fields = Object.keys(value);
  if (fields.some((field) => !WINDOW_FIELDS.has(field))) return null;
  if (!isValidIsoDate(value.window_start)) return null;
  if (!isValidIsoDate(value.window_end)) return null;
  if (String(value.window_start) > String(value.window_end)) return null;
  return {
    window_start: safeString(value.window_start, 40),
    window_end: safeString(value.window_end, 40)
  };
}

function sameWindow(left: any, right: any): boolean {
  return left?.window_start === right?.window_start &&
    left?.window_end === right?.window_end;
}

function collectUnsupportedFieldGaps(value: any, allowed: Set<string>, label: string): string[] {
  if (!isPlainObject(value)) return [`${label} must be an object`];
  return Object.keys(value)
    .filter((field) => !allowed.has(field))
    .map(() => `Unsupported ${label} field detected`);
}

function collectNestedFieldGaps(value: any, allowed: Set<string>, label: string): string[] {
  if (!isPlainObject(value)) return [`${label} must be an object`];
  return Object.keys(value)
    .filter((field) => !allowed.has(field))
    .map(() => `Unsupported ${label} field detected`);
}

function collectRequiredNestedFieldGaps(value: any, required: Set<string>, label: string): string[] {
  if (!isPlainObject(value)) return [`${label} must be an object`];
  return Array.from(required)
    .filter((field) => value[field] === undefined || value[field] === null || value[field] === "")
    .map((field) => `${label}.${field} is missing`);
}

function collectFalseBoundaryGaps(policy: any, fields: string[], label: string): string[] {
  const gaps: string[] = [];
  if (!isPlainObject(policy)) return [`${label} must be an object`];
  for (const field of Object.keys(policy)) {
    if (!fields.includes(field)) gaps.push(`Unsupported ${label} field detected`);
  }
  for (const field of fields) {
    if (policy[field] !== false) gaps.push(`${label}.${field} must be false`);
  }
  return gaps;
}

function collectExactArrayGaps(value: any, expected: string[], path: string): string[] {
  const gaps: string[] = [];
  if (!Array.isArray(value)) return [`${path} must be an array`];
  if (value.length !== expected.length) gaps.push(`${path} must match the governed manifest list exactly`);
  value.forEach((item, index) => {
    if (item !== expected[index]) gaps.push(`${path}[${index}] must match the governed manifest list`);
  });
  return gaps;
}

function isFalseBoundaryFlag(path: string[], key: string, nested: any): boolean {
  if (nested !== false) return false;
  const parent = normalizeKey(path[path.length - 1] ?? "");
  const normalizedKey = normalizeKey(key);
  return parent === "boundary_policy" ||
    SOURCE_INVENTORY_FALSE_BOUNDARY_FIELDS.includes(normalizedKey) ||
    AGGREGATE_EXTRACTION_FALSE_BOUNDARY_FIELDS.includes(normalizedKey) ||
    PIPELINE_REVIEW_FALSE_BOUNDARY_FIELDS.includes(normalizedKey);
}

function isAllowedGovernanceListValue(path: string[], value: string): boolean {
  const parent = normalizeKey(path[path.length - 2] ?? "");
  const leafIsArrayIndex = /^\d+$/.test(path[path.length - 1] ?? "");
  if (!leafIsArrayIndex) return false;
  return (parent === "blocked_uses" && REQUIRED_BLOCKED_USES.includes(value)) ||
    (parent === "blocked_claims" && REQUIRED_BLOCKED_CLAIMS.includes(value)) ||
    (parent === "stop_conditions" && REQUIRED_BLOCKED_USES.includes(value)) ||
    (parent === "allowed_uses" && [
      ...SOURCE_INVENTORY_ALLOWED_USES,
      ...AGGREGATE_EXTRACTION_ALLOWED_USES,
      ...PIPELINE_REVIEW_ALLOWED_USES
    ].includes(value)) ||
    (parent === "required_caveats" && SAFE_CAVEAT_VALUES.has(value));
}

function collectForbiddenFields(value: any, fields: Set<string> = new Set(), path: string[] = []): Set<string> {
  if (!value || typeof value !== "object") return fields;
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectForbiddenFields(item, fields, [...path, String(index)]));
    return fields;
  }
  for (const [key, nested] of Object.entries(value)) {
    const normalized = normalizeKey(key);
    if (
      !isFalseBoundaryFlag(path, key, nested) &&
      FORBIDDEN_FIELD_PATTERNS.some((pattern) => pattern.test(key) || pattern.test(normalized))
    ) {
      fields.add([...path, key].join("."));
    }
    collectForbiddenFields(nested, fields, [...path, key]);
  }
  return fields;
}

function collectForbiddenValues(value: any, values: Set<string> = new Set(), path: string[] = []): Set<string> {
  if (typeof value === "string") {
    const normalized = normalizeKey(value);
    if (
      !isAllowedGovernanceListValue(path, value) &&
      FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value) || pattern.test(normalized))
    ) {
      values.add(path.join(".") || "<root>");
    }
    return values;
  }
  if (!value || typeof value !== "object") return values;
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectForbiddenValues(item, values, [...path, String(index)]));
    return values;
  }
  for (const [key, nested] of Object.entries(value)) {
    collectForbiddenValues(nested, values, [...path, key]);
  }
  return values;
}

function sanitizeGaps(gaps: string[]): string[] {
  return gaps.map((gap) =>
    gap
      .replace(/select\s+.+?\s+from/gi, "<blocked_query_text>")
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "<blocked_identifier_value>")
      .replace(/employee_email|employee_name|employee_id|user_id|person_id|respondent_id/gi, "<blocked_identifier_field>")
  );
}

function addForbiddenGaps(value: any, gaps: string[]): void {
  for (const field of Array.from(collectForbiddenFields(value)).sort()) {
    gaps.push(`Forbidden field detected at ${field.split(".").length} level(s)`);
  }
  for (const forbiddenValue of Array.from(collectForbiddenValues(value)).sort()) {
    gaps.push(`Forbidden value detected at ${forbiddenValue.split(".").length} level(s)`);
  }
}

function validationResult(gaps: string[]): AiValueControlledAggregateManifestValidationResult {
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    valid: gaps.length === 0,
    gaps: sanitizeGaps(gaps)
  };
}

function manifestRefFromInventory(manifest: any): any {
  if (!isPlainObject(manifest)) {
    return Object.fromEntries(Array.from(MANIFEST_REF_FIELDS).map((field) => [field, null]));
  }
  return {
    manifest_id: safeString(manifest?.source_inventory_manifest_id, 160),
    manifest_hash: sha256Json(manifest),
    source_lane: ALLOWED_SOURCE_LANES.has(String(manifest?.source_lane))
      ? manifest.source_lane
      : null,
    source_system: ALLOWED_SOURCE_SYSTEMS.has(String(manifest?.source_system))
      ? manifest.source_system
      : null,
    source_ref: safeSourceRef(manifest?.approved_source_ref, String(manifest?.source_system ?? "")),
    org_id: safeString(manifest?.org_id, 120),
    client_id: safeString(manifest?.client_id, 120),
    workflow_family: safeString(manifest?.workflow_family, 120),
    function_area: safeString(manifest?.function_area, 120),
    cohort_key: safeString(manifest?.cohort_key, 120),
    window: safeWindow(manifest?.approved_extraction_window),
    aggregate_grain: manifest?.approved_aggregate_grain === "workflow_function_cohort_window"
      ? "workflow_function_cohort_window"
      : null
  };
}

function manifestRefFromExtraction(manifest: any): any {
  if (!isPlainObject(manifest)) {
    return Object.fromEntries(Array.from(MANIFEST_REF_FIELDS).map((field) => [field, null]));
  }
  return {
    manifest_id: safeString(manifest?.aggregate_extraction_manifest_id, 160),
    manifest_hash: sha256Json(manifest),
    source_lane: ALLOWED_SOURCE_LANES.has(String(manifest?.source_package_lane))
      ? manifest.source_package_lane
      : null,
    source_system: ALLOWED_SOURCE_SYSTEMS.has(String(manifest?.source_system))
      ? manifest.source_system
      : null,
    source_ref: safeSourceRef(manifest?.aggregate_output_ref, String(manifest?.source_system ?? "")),
    org_id: safeString(manifest?.org_id, 120),
    client_id: safeString(manifest?.client_id, 120),
    workflow_family: safeString(manifest?.workflow_family, 120),
    function_area: safeString(manifest?.function_area, 120),
    cohort_key: safeString(manifest?.cohort_key, 120),
    window: safeWindow(manifest?.extraction_window),
    aggregate_grain: manifest?.aggregate_grain === "workflow_function_cohort_window"
      ? "workflow_function_cohort_window"
      : null
  };
}

function collectManifestRefGaps(actual: any, expected: any, label: string): string[] {
  const gaps: string[] = [];
  gaps.push(...collectNestedFieldGaps(actual, MANIFEST_REF_FIELDS, label));
  gaps.push(...collectRequiredNestedFieldGaps(actual, MANIFEST_REF_FIELDS, label));
  for (const field of MANIFEST_REF_FIELDS) {
    if (JSON.stringify(actual?.[field] ?? null) !== JSON.stringify(expected?.[field] ?? null)) {
      gaps.push(`${label}.${field} must match validated manifest`);
    }
  }
  return gaps;
}

function validationProofHash(manifest: any, validation: AiValueControlledAggregateManifestValidationResult): string {
  return sha256Json({
    manifest_hash: sha256Json(manifest),
    validation_result: validation
  });
}

function expectedQueueRef(
  manifest: any,
  sourceInventoryManifest: any,
  aggregateExtractionManifest: any,
  approvedExpectationPathBinding: any
): string {
  const identityHash = sha256Json({
    source_manifest_ref: manifestRefFromInventory(sourceInventoryManifest),
    aggregate_extraction_manifest_ref: manifestRefFromExtraction(aggregateExtractionManifest),
    org_id: manifest?.org_id,
    client_id: manifest?.client_id,
    measurement_plan_id: manifest?.measurement_plan_id,
    workflow_family: manifest?.workflow_family,
    workflow_id: manifest?.workflow_id,
    function_area: manifest?.function_area,
    cohort_key: manifest?.cohort_key,
    baseline_window: manifest?.baseline_window,
    comparison_window: manifest?.comparison_window,
    metric_id: manifest?.metric_id,
    approved_expectation_path_binding: approvedExpectationPathBinding
  }).slice(0, 24);
  return [
    "source_package_review_queue",
    sourceInventoryManifest?.source_system,
    manifest?.org_id,
    manifest?.client_id,
    manifest?.workflow_family,
    manifest?.function_area,
    manifest?.cohort_key,
    manifest?.metric_id,
    identityHash
  ].map(safeIdPart).join("_");
}

function collectCommonIdentityGaps(left: any, right: any, leftName: string, rightName: string): string[] {
  const gaps: string[] = [];
  for (const field of ["source_system", "org_id", "client_id", "workflow_family", "function_area", "cohort_key"]) {
    if (left?.[field] !== right?.[field]) gaps.push(`${leftName}.${field} must match ${rightName}.${field}`);
  }
  return gaps;
}

function collectSafeMetadataGaps(value: any, fields: string[], label: string): string[] {
  return fields
    .filter((field) => !safeString(value?.[field], 160))
    .map((field) => `${label}.${field} must be safe metadata`);
}

function safeAggregateFieldName(value: any): string | null {
  if (!safeString(value, 120)) return null;
  return APPROVED_AGGREGATE_FIELD_NAMES.has(value) ? value : null;
}

export function validateAiValueSourceInventoryManifest(
  manifest: any
): AiValueControlledAggregateManifestValidationResult {
  const gaps: string[] = [];
  if (!isPlainObject(manifest)) {
    return validationResult(["source inventory manifest must be an object"]);
  }

  for (const field of SOURCE_INVENTORY_FIELDS) requireField(manifest[field], field, gaps);
  gaps.push(...collectUnsupportedFieldGaps(manifest, SOURCE_INVENTORY_FIELDS, "source_inventory_manifest"));

  if (manifest.schema_version !== AI_VALUE_SOURCE_INVENTORY_MANIFEST_SCHEMA_VERSION) {
    gaps.push("schema_version is invalid");
  }
  if (!ALLOWED_SOURCE_LANES.has(String(manifest.source_lane ?? ""))) {
    gaps.push("source_lane is invalid");
  }
  if (!ALLOWED_SOURCE_SYSTEMS.has(String(manifest.source_system ?? ""))) {
    gaps.push("source_system is invalid");
  }
  if (manifest.source_category !== "scrubbed_aggregate_export") {
    gaps.push("source_category must be scrubbed_aggregate_export");
  }

  const expectedOwnerRole = ALLOWED_SOURCE_OWNER_ROLES[String(manifest.source_system ?? "")];
  if (expectedOwnerRole && manifest.source_owner_role !== expectedOwnerRole) {
    gaps.push("source_owner_role must match source_system owner role");
  }
  if (manifest.source_owner_attestation !== "AGGREGATE_ONLY_ATTESTED") {
    gaps.push("source_owner_attestation must be AGGREGATE_ONLY_ATTESTED");
  }
  if (
    manifest.legal_trust_review_state !== "LEGAL_TRUST_REVIEW_APPROVED" &&
    manifest.legal_trust_review_state !== "LEGAL_TRUST_REVIEW_NOT_REQUIRED"
  ) {
    gaps.push("legal_trust_review_state must be approved or not required");
  }
  if (
    manifest.k_min_posture !== "K_MIN_POLICY_BOUND" &&
    manifest.k_min_posture !== "K_MIN_ALREADY_ENFORCED_UPSTREAM"
  ) {
    gaps.push("k_min_posture must be terminal and non-held");
  }
  if (
    manifest.suppression_posture !== "SUPPRESSION_POLICY_BOUND" &&
    manifest.suppression_posture !== "SUPPRESSION_ALREADY_ENFORCED_UPSTREAM"
  ) {
    gaps.push("suppression_posture must be terminal and non-held");
  }
  if (!safeSourceRef(manifest.approved_source_ref, String(manifest.source_system ?? ""))) {
    gaps.push("approved_source_ref must be a safe reviewed aggregate source ref");
  }
  if (!safeWindow(manifest.approved_extraction_window)) {
    gaps.push("approved_extraction_window must be a compact safe window");
  }
  if (manifest.approved_aggregate_grain !== "workflow_function_cohort_window") {
    gaps.push("approved_aggregate_grain must be workflow_function_cohort_window");
  }
  if (
    !Array.isArray(manifest.approved_output_fields) ||
    manifest.approved_output_fields.length === 0 ||
    !manifest.approved_output_fields.every((field: any) => safeAggregateFieldName(field))
  ) {
    gaps.push("approved_output_fields must be governed aggregate field names");
  }

  gaps.push(...collectExactArrayGaps(manifest.allowed_uses, SOURCE_INVENTORY_ALLOWED_USES, "allowed_uses"));
  gaps.push(...collectExactArrayGaps(manifest.blocked_uses, REQUIRED_BLOCKED_USES, "blocked_uses"));
  gaps.push(...collectExactArrayGaps(manifest.required_caveats, SOURCE_INVENTORY_REQUIRED_CAVEATS, "required_caveats"));
  gaps.push(...collectFalseBoundaryGaps(manifest.boundary_policy, SOURCE_INVENTORY_FALSE_BOUNDARY_FIELDS, "boundary_policy"));
  gaps.push(...collectSafeMetadataGaps(manifest, [
    "source_inventory_manifest_id",
    "org_id",
    "client_id",
    "workflow_family",
    "function_area",
    "cohort_key",
    "generated_at"
  ], "source_inventory_manifest"));

  addForbiddenGaps(manifest, gaps);
  return validationResult(gaps);
}

export function validateAiValueAggregateExtractionManifest(
  manifest: any,
  options: ValidateAiValueAggregateExtractionManifestOptions
): AiValueControlledAggregateManifestValidationResult {
  const gaps: string[] = [];
  const sourceInventoryManifest = options?.sourceInventoryManifest;
  const sourceValidation = validateAiValueSourceInventoryManifest(sourceInventoryManifest);

  if (!isPlainObject(manifest)) {
    return validationResult(["aggregate extraction manifest must be an object"]);
  }
  if (!sourceValidation.valid) {
    gaps.push("Source Inventory Manifest validation must pass before aggregate extraction review");
  }

  for (const field of AGGREGATE_EXTRACTION_FIELDS) requireField(manifest[field], field, gaps);
  gaps.push(...collectUnsupportedFieldGaps(manifest, AGGREGATE_EXTRACTION_FIELDS, "aggregate_extraction_manifest"));

  if (manifest.schema_version !== AI_VALUE_AGGREGATE_EXTRACTION_MANIFEST_SCHEMA_VERSION) {
    gaps.push("schema_version is invalid");
  }
  gaps.push(...collectManifestRefGaps(
    manifest.source_inventory_manifest_ref,
    manifestRefFromInventory(sourceInventoryManifest),
    "source_inventory_manifest_ref"
  ));
  gaps.push(...collectCommonIdentityGaps(manifest, sourceInventoryManifest, "aggregate_extraction", "source_inventory"));
  if (!sameWindow(manifest.extraction_window, sourceInventoryManifest?.approved_extraction_window)) {
    gaps.push("extraction_window must match approved Source Inventory window");
  }
  if (manifest.aggregate_grain !== sourceInventoryManifest?.approved_aggregate_grain) {
    gaps.push("aggregate_grain must match Source Inventory aggregate grain");
  }
  if (manifest.source_package_lane !== sourceInventoryManifest?.source_lane) {
    gaps.push("source_package_lane must match Source Inventory source_lane");
  }
  if (manifest.execution_boundary !== "approved_glean_or_customer_environment") {
    gaps.push("execution_boundary must be approved_glean_or_customer_environment");
  }
  if (!safeRefString(manifest.approved_aggregate_definition_ref)) {
    gaps.push("approved_aggregate_definition_ref must be safe metadata, not a live query handle");
  }
  if (!safeRefString(manifest.upstream_aggregate_attestation_ref)) {
    gaps.push("upstream_aggregate_attestation_ref must be safe metadata, not a live run handle");
  }
  if (!safeSourceRef(manifest.aggregate_output_ref, String(manifest.source_system ?? ""))) {
    gaps.push("aggregate_output_ref must be a safe scrubbed aggregate output ref");
  }
  if (!safeHash(manifest.aggregate_output_hash)) {
    gaps.push("aggregate_output_hash must be a sha256 hex string");
  }
  if (
    !Array.isArray(manifest.metric_definitions) ||
    manifest.metric_definitions.length === 0 ||
    !manifest.metric_definitions.every((metric: any) => safeAggregateFieldName(metric))
  ) {
    gaps.push("metric_definitions must be governed aggregate metric identifiers");
  }
  if (
    Array.isArray(manifest.metric_definitions) &&
    Array.isArray(sourceInventoryManifest?.approved_output_fields) &&
    !manifest.metric_definitions.every((metric: any) =>
      sourceInventoryManifest.approved_output_fields.includes(metric)
    )
  ) {
    gaps.push("metric_definitions must be approved Source Inventory output fields");
  }
  if (manifest.owner_review_state !== "AGGREGATE_EXTRACTION_ATTESTED") {
    gaps.push("owner_review_state must be AGGREGATE_EXTRACTION_ATTESTED");
  }
  if (manifest.k_min_posture !== "K_MIN_ENFORCED") {
    gaps.push("k_min_posture must be K_MIN_ENFORCED");
  }
  if (manifest.freshness_state !== "CURRENT_FOR_APPROVED_WINDOW") {
    gaps.push("freshness_state must be CURRENT_FOR_APPROVED_WINDOW");
  }

  gaps.push(...collectNestedFieldGaps(manifest.suppression_results, SUPPRESSION_RESULT_FIELDS, "suppression_results"));
  if (manifest.suppression_results?.suppression_state !== "SUPPRESSION_ENFORCED") {
    gaps.push("suppression_results.suppression_state must be SUPPRESSION_ENFORCED");
  }
  if (manifest.suppression_results?.k_min_state !== "K_MIN_ENFORCED") {
    gaps.push("suppression_results.k_min_state must be K_MIN_ENFORCED");
  }
  if (
    manifest.suppression_results?.held_telemetry_present !== false ||
    manifest.suppression_results?.suppressed_telemetry_present !== false
  ) {
    gaps.push("suppression_results must not hide held or suppressed telemetry");
  }

  gaps.push(...collectExactArrayGaps(manifest.allowed_uses, AGGREGATE_EXTRACTION_ALLOWED_USES, "allowed_uses"));
  gaps.push(...collectExactArrayGaps(manifest.blocked_uses, REQUIRED_BLOCKED_USES, "blocked_uses"));
  gaps.push(...collectExactArrayGaps(manifest.required_caveats, AGGREGATE_EXTRACTION_REQUIRED_CAVEATS, "required_caveats"));
  gaps.push(...collectFalseBoundaryGaps(manifest.boundary_policy, AGGREGATE_EXTRACTION_FALSE_BOUNDARY_FIELDS, "boundary_policy"));
  gaps.push(...collectSafeMetadataGaps(manifest, [
    "aggregate_extraction_manifest_id",
    "org_id",
    "client_id",
    "workflow_family",
    "function_area",
    "cohort_key",
    "generated_at"
  ], "aggregate_extraction_manifest"));

  addForbiddenGaps(manifest, gaps);
  return validationResult(gaps);
}

export function validateAiValuePipelineRunReviewManifest(
  manifest: any,
  options: ValidateAiValuePipelineRunReviewManifestOptions
): AiValueControlledAggregateManifestValidationResult {
  const gaps: string[] = [];
  const {
    sourceInventoryManifest,
    aggregateExtractionManifest,
    approvedExpectationPathBinding
  } = options ?? {};
  const sourceValidation = validateAiValueSourceInventoryManifest(sourceInventoryManifest);
  const extractionValidation = validateAiValueAggregateExtractionManifest(
    aggregateExtractionManifest,
    { sourceInventoryManifest }
  );

  if (!isPlainObject(manifest)) {
    return validationResult(["pipeline run review manifest must be an object"]);
  }
  if (!isPlainObject(approvedExpectationPathBinding)) {
    gaps.push("approvedExpectationPathBinding must be provided for Pipeline Run Review validation");
  } else {
    gaps.push(...collectUnsupportedFieldGaps(
      approvedExpectationPathBinding,
      APPROVED_EXPECTATION_PATH_BINDING_FIELDS,
      "approvedExpectationPathBinding"
    ));
    gaps.push(...collectRequiredNestedFieldGaps(
      approvedExpectationPathBinding,
      APPROVED_EXPECTATION_PATH_BINDING_FIELDS,
      "approvedExpectationPathBinding"
    ));
  }
  if (!sourceValidation.valid) gaps.push("Source Inventory Manifest validation must pass before pipeline review");
  if (!extractionValidation.valid) gaps.push("Aggregate Extraction Manifest validation must pass before pipeline review");

  for (const field of PIPELINE_RUN_REVIEW_FIELDS) requireField(manifest[field], field, gaps);
  gaps.push(...collectUnsupportedFieldGaps(manifest, PIPELINE_RUN_REVIEW_FIELDS, "pipeline_run_review_manifest"));

  if (manifest.schema_version !== AI_VALUE_PIPELINE_RUN_REVIEW_MANIFEST_SCHEMA_VERSION) {
    gaps.push("schema_version is invalid");
  }
  const eligibleReview = manifest.pipeline_review_state === "ELIGIBLE_FOR_OPERATOR_PROMOTION_REVIEW";
  if (!PIPELINE_REVIEW_STATES.has(String(manifest.pipeline_review_state ?? ""))) {
    gaps.push("pipeline_review_state must be a governed Pipeline Run Review state");
  }

  gaps.push(...collectManifestRefGaps(
    manifest.source_inventory_manifest_ref,
    manifestRefFromInventory(sourceInventoryManifest),
    "source_inventory_manifest_ref"
  ));
  gaps.push(...collectManifestRefGaps(
    manifest.aggregate_extraction_manifest_ref,
    manifestRefFromExtraction(aggregateExtractionManifest),
    "aggregate_extraction_manifest_ref"
  ));

  for (const field of ["org_id", "client_id", "workflow_family", "function_area", "cohort_key"]) {
    if (manifest[field] !== sourceInventoryManifest?.[field]) gaps.push(`${field} must match Source Inventory Manifest`);
    if (manifest[field] !== aggregateExtractionManifest?.[field]) gaps.push(`${field} must match Aggregate Extraction Manifest`);
  }
  if (manifest.source_owner_role !== sourceInventoryManifest?.source_owner_role) {
    gaps.push("source_owner_role must match Source Inventory owner role");
  }
  if (!sameWindow(manifest.comparison_window, aggregateExtractionManifest?.extraction_window)) {
    gaps.push("comparison_window must match Aggregate Extraction extraction_window");
  }
  if (!safeWindow(manifest.baseline_window)) gaps.push("baseline_window must be a compact safe window");
  if (!safeString(manifest.measurement_plan_id, 160)) gaps.push("measurement_plan_id must be safe metadata");
  if (!safeString(manifest.workflow_id, 160)) gaps.push("workflow_id must be safe metadata");
  if (!safeAggregateFieldName(manifest.metric_id)) gaps.push("metric_id must be a governed aggregate metric identifier");
  if (!safeString(manifest.expectation_path_id, 160)) gaps.push("expectation_path_id must be safe metadata");
  if (approvedExpectationPathBinding?.expectation_path_id !== manifest.expectation_path_id) {
    gaps.push("approvedExpectationPathBinding.expectation_path_id must match pipeline review expectation_path_id");
  }
  if (!Number.isInteger(approvedExpectationPathBinding?.expectation_path_version) ||
    approvedExpectationPathBinding?.expectation_path_version < 1) {
    gaps.push("approvedExpectationPathBinding.expectation_path_version must be a positive integer");
  }
  for (const field of ["expectation_path_hash", "approved_blueprint_payload_hash"] as const) {
    if (!safeHash(approvedExpectationPathBinding?.[field])) {
      gaps.push(`approvedExpectationPathBinding.${field} must be a sha256 hex string`);
    }
  }
  if (approvedExpectationPathBinding?.approval_state !== "customer_approved") {
    gaps.push("approvedExpectationPathBinding.approval_state must be customer_approved");
  }
  if (!safeString(approvedExpectationPathBinding?.approved_at, 120)) {
    gaps.push("approvedExpectationPathBinding.approved_at must be safe metadata");
  }
  if (!safeString(approvedExpectationPathBinding?.approved_by_role, 120)) {
    gaps.push("approvedExpectationPathBinding.approved_by_role must be safe metadata");
  }
  if (!Array.isArray(aggregateExtractionManifest?.metric_definitions) ||
    !aggregateExtractionManifest.metric_definitions.includes(manifest.metric_id)) {
    gaps.push("metric_id must match a validated Aggregate Extraction metric definition");
  }
  if (
    !Array.isArray(manifest.reviewed_aggregate_source_refs) ||
    manifest.reviewed_aggregate_source_refs.length !== 2 ||
    !manifest.reviewed_aggregate_source_refs.every((ref: any) => safeSourceRef(ref, String(sourceInventoryManifest?.source_system ?? ""))) ||
    manifest.reviewed_aggregate_source_refs[0] !== sourceInventoryManifest?.approved_source_ref ||
    manifest.reviewed_aggregate_source_refs[1] !== aggregateExtractionManifest?.aggregate_output_ref
  ) {
    gaps.push("reviewed_aggregate_source_refs must match reviewed source and aggregate output refs");
  }

  const envelope = manifest.data_spine_alignment_envelope;
  gaps.push(...collectNestedFieldGaps(envelope, DATA_SPINE_ALIGNMENT_FIELDS, "data_spine_alignment_envelope"));
  for (const field of DATA_SPINE_ALIGNMENT_FIELDS) {
    const value = envelope?.[field];
    if (field.endsWith("_window")) {
      if (!safeWindow(value)) gaps.push(`data_spine_alignment_envelope.${field} must be a compact safe window`);
      continue;
    }
    if (field === "expectation_path_version") {
      if (!Number.isInteger(value) || value < 1) gaps.push("data_spine_alignment_envelope.expectation_path_version must be a positive integer");
      continue;
    }
    if (field.endsWith("_hash")) {
      if (!safeHash(value)) gaps.push(`data_spine_alignment_envelope.${field} must be a sha256 hex string`);
      continue;
    }
    if (!safeString(value, 160)) gaps.push(`data_spine_alignment_envelope.${field} must be safe metadata`);
  }
  const envelopeMatches: Record<string, any> = {
    source_lane: sourceInventoryManifest?.source_lane,
    source_system: sourceInventoryManifest?.source_system,
    source_ref: sourceInventoryManifest?.approved_source_ref,
    source_owner_role: sourceInventoryManifest?.source_owner_role,
    org_id: manifest.org_id,
    client_id: manifest.client_id,
    measurement_plan_id: manifest.measurement_plan_id,
    workflow_family: manifest.workflow_family,
    workflow_id: manifest.workflow_id,
    function_area: manifest.function_area,
    cohort_key: manifest.cohort_key,
    metric_id: manifest.metric_id,
    expectation_path_id: approvedExpectationPathBinding?.expectation_path_id,
    expectation_path_version: approvedExpectationPathBinding?.expectation_path_version,
    expectation_path_hash: approvedExpectationPathBinding?.expectation_path_hash,
    approved_blueprint_payload_hash: approvedExpectationPathBinding?.approved_blueprint_payload_hash,
    approval_state: approvedExpectationPathBinding?.approval_state,
    approved_at: approvedExpectationPathBinding?.approved_at,
    approved_by_role: approvedExpectationPathBinding?.approved_by_role
  };
  for (const [field, expected] of Object.entries(envelopeMatches)) {
    if (envelope?.[field] !== expected) gaps.push(`data_spine_alignment_envelope.${field} must match pipeline review identity`);
  }
  if (!sameWindow(envelope?.baseline_window, manifest.baseline_window)) {
    gaps.push("data_spine_alignment_envelope.baseline_window must match pipeline review baseline_window");
  }
  if (!sameWindow(envelope?.comparison_window, manifest.comparison_window)) {
    gaps.push("data_spine_alignment_envelope.comparison_window must match pipeline review comparison_window");
  }

  gaps.push(...collectNestedFieldGaps(
    manifest.source_package_review_queue_posture_ref,
    SOURCE_PACKAGE_QUEUE_REF_FIELDS,
    "source_package_review_queue_posture_ref"
  ));
  gaps.push(...collectRequiredNestedFieldGaps(
    manifest.source_package_review_queue_posture_ref,
    SOURCE_PACKAGE_QUEUE_REF_FIELDS,
    "source_package_review_queue_posture_ref"
  ));
  if (!SOURCE_PACKAGE_QUEUE_STATES.has(String(manifest.source_package_review_queue_posture_ref?.queue_state ?? ""))) {
    gaps.push("source_package_review_queue_posture_ref.queue_state must be canonical");
  }
  if (eligibleReview && manifest.source_package_review_queue_posture_ref?.queue_state !== "DATA_SPINE_REVIEW_READY") {
    gaps.push("source_package_review_queue_posture_ref.queue_state must be DATA_SPINE_REVIEW_READY for review eligibility");
  }
  if (manifest.source_package_review_queue_posture_ref?.queue_ref !== expectedQueueRef(
    manifest,
    sourceInventoryManifest,
    aggregateExtractionManifest,
    approvedExpectationPathBinding
  )) {
    gaps.push("source_package_review_queue_posture_ref.queue_ref must match deterministic Source Package Review Queue posture identity");
  }
  if (!safeString(manifest.source_package_review_queue_posture_ref?.reviewed_at, 120)) {
    gaps.push("source_package_review_queue_posture_ref.reviewed_at must be safe metadata");
  }
  if (manifest.source_package_review_queue_posture_ref?.reviewed_by_role !== manifest.operator_role) {
    gaps.push("source_package_review_queue_posture_ref.reviewed_by_role must match operator_role");
  }
  for (const value of Object.values(manifest.source_package_review_queue_posture_ref ?? {})) {
    const normalized = normalizeKey(String(value ?? ""));
    if (["cleared", "approved", "passed", "source_package_cleared", "ready_for_measurement"].includes(normalized)) {
      gaps.push("source_package_review_queue_posture_ref must not use clearance aliases");
    }
  }

  const validationRefs = manifest.validation_result_refs;
  gaps.push(...collectNestedFieldGaps(validationRefs, VALIDATION_RESULT_REF_FIELDS, "validation_result_refs"));
  if (!safeRefString(validationRefs?.source_inventory_validation_ref)) {
    gaps.push("validation_result_refs.source_inventory_validation_ref must be safe metadata");
  }
  if (!safeRefString(validationRefs?.aggregate_extraction_validation_ref)) {
    gaps.push("validation_result_refs.aggregate_extraction_validation_ref must be safe metadata");
  }
  if (validationRefs?.connector_adapter_ref !== null &&
    validationRefs?.connector_adapter_ref !== undefined &&
    !safeRefString(validationRefs?.connector_adapter_ref)) {
    gaps.push("validation_result_refs.connector_adapter_ref must be safe metadata when present");
  }
  if (validationRefs?.source_inventory_validation_hash !== validationProofHash(sourceInventoryManifest, sourceValidation)) {
    gaps.push("validation_result_refs.source_inventory_validation_hash must match recomputed Source Inventory validation");
  }
  if (validationRefs?.aggregate_extraction_validation_hash !== validationProofHash(aggregateExtractionManifest, extractionValidation)) {
    gaps.push("validation_result_refs.aggregate_extraction_validation_hash must match recomputed Aggregate Extraction validation");
  }

  gaps.push(...collectExactArrayGaps(manifest.allowed_uses, PIPELINE_REVIEW_ALLOWED_USES, "allowed_uses"));
  gaps.push(...collectExactArrayGaps(manifest.blocked_claims, REQUIRED_BLOCKED_CLAIMS, "blocked_claims"));
  gaps.push(...collectExactArrayGaps(manifest.blocked_uses, REQUIRED_BLOCKED_USES, "blocked_uses"));
  gaps.push(...collectExactArrayGaps(manifest.stop_conditions, REQUIRED_BLOCKED_USES, "stop_conditions"));
  gaps.push(...collectExactArrayGaps(manifest.required_caveats, PIPELINE_REVIEW_REQUIRED_CAVEATS, "required_caveats"));
  gaps.push(...collectFalseBoundaryGaps(manifest.boundary_policy, PIPELINE_REVIEW_FALSE_BOUNDARY_FIELDS, "boundary_policy"));
  gaps.push(...collectSafeMetadataGaps(manifest, [
    "pipeline_run_review_manifest_id",
    "operator_role",
    "source_owner_role",
    "org_id",
    "client_id",
    "measurement_plan_id",
    "workflow_family",
    "workflow_id",
    "function_area",
    "cohort_key",
    "metric_id",
    "expectation_path_id",
    "generated_at"
  ], "pipeline_run_review_manifest"));

  addForbiddenGaps(manifest, gaps);
  return validationResult(gaps);
}

export function validateAiValueControlledAggregateManifestChain(
  input: ValidateAiValueControlledAggregateManifestChainInput
): AiValueControlledAggregateManifestValidationResult {
  const sourceValidation = validateAiValueSourceInventoryManifest(input?.sourceInventoryManifest);
  const extractionValidation = validateAiValueAggregateExtractionManifest(
    input?.aggregateExtractionManifest,
    { sourceInventoryManifest: input?.sourceInventoryManifest }
  );
  const reviewValidation = validateAiValuePipelineRunReviewManifest(
    input?.pipelineRunReviewManifest,
    {
      sourceInventoryManifest: input?.sourceInventoryManifest,
      aggregateExtractionManifest: input?.aggregateExtractionManifest,
      approvedExpectationPathBinding: input?.approvedExpectationPathBinding
    }
  );
  return validationResult([
    ...sourceValidation.gaps.map((gap) => `source_inventory: ${gap}`),
    ...extractionValidation.gaps.map((gap) => `aggregate_extraction: ${gap}`),
    ...reviewValidation.gaps.map((gap) => `pipeline_run_review: ${gap}`)
  ]);
}
