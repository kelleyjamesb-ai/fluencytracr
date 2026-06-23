/**
 * AI Value Engine - Controlled Aggregate Connector Adapter.
 *
 * Credential-safe adapter boundary for BigQuery/Sigma-shaped scrubbed aggregate
 * exports. This does not execute BigQuery, call Sigma, run customer connectors,
 * persist pipeline runs, emit customer-facing output, or compute ROI, causality,
 * productivity, probability, or model scores.
 */

export const AI_VALUE_CONTROLLED_AGGREGATE_CONNECTOR_ADAPTER_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTROLLED_AGGREGATE_CONNECTOR_ADAPTER_2026_06";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTROLLED_AGGREGATE_CONNECTOR_ADAPTER_VALIDATION_2026_06";

const DERIVATION_VERSION =
  "ai_value_controlled_aggregate_connector_adapter_2026_06";

const ALLOWED_SOURCE_SYSTEMS = new Set(["bigquery_export", "sigma_export"]);

const ALLOWED_SOURCE_OWNER_ROLES: Record<string, string> = {
  bigquery_export: "customer_data_platform_owner",
  sigma_export: "customer_analytics_owner"
};

const ALLOWED_ADAPTER_STATES = new Set([
  "PASSED_INTERNAL_CONNECTOR_ADAPTER_REVIEW",
  "HELD_FOR_PIPELINE_DRY_RUN",
  "BLOCKED"
]);

const REQUIRED_CAVEATS = [
  "This is a credential-safe aggregate connector adapter proof only.",
  "The adapter accepts reviewed scrubbed aggregate export manifests only.",
  "The adapter does not execute BigQuery, Sigma, Glean, or customer connectors.",
  "The adapter may produce an internal connector review packet only.",
  "The adapter does not persist connector runs, create Measurement Cell snapshots, or emit customer-facing output."
];

const MANIFEST_REQUIRED_CAVEATS = [
  "Connector adapter manifest only; it does not authorize live BigQuery or Sigma execution.",
  "Connector review packet is not Source Package clearance.",
  "Connector review packet is not Measurement Cell snapshot persistence."
];

const SAFE_CAVEAT_VALUES = new Set([
  ...REQUIRED_CAVEATS,
  ...MANIFEST_REQUIRED_CAVEATS
]);

const REQUIRED_REVIEW_PACKET_ALLOWED_USES = [
  "aggregate_connector_adapter_review",
  "connector_review_packet",
  "controlled_pipeline_dry_run_reference",
  "measurement_cell_candidate_proof_reference"
];

const TRUE_FEEDS = [
  "aggregate_connector_adapter_review",
  "connector_review_packet",
  "pipeline_dry_run_review",
  "measurement_cell_candidate_proof"
];

const REQUIRED_FALSE_FEEDS = [
  "live_bigquery_execution",
  "live_sigma_execution",
  "live_glean_query",
  "customer_connector_execution",
  "credential_access",
  "query_execution",
  "raw_row_ingestion",
  "durable_connector_run_storage",
  "source_package_clearance",
  "measurement_cell_snapshot_candidate",
  "measurement_cell_snapshot",
  "measurement_cell_series_snapshot",
  "evidence_continuity_snapshot",
  "claim_readiness_snapshot",
  "executive_readout_snapshot",
  "api_export",
  "customer_share_package",
  "finance_context_investigation",
  "research_model_feed",
  "customer_facing_output",
  "customer_facing_financial_output",
  "customer_facing_economic_output"
];

const REQUIRED_FALSE_BOUNDARY_FIELDS = [
  "runs_bigquery",
  "runs_sigma",
  "runs_glean_query",
  "runs_customer_connectors",
  "runs_live_connectors",
  "uses_credentials",
  "executes_queries",
  "stores_query_strings",
  "ingests_source_records",
  "stores_raw_source_data",
  "persists_connector_run",
  "creates_ingestion_jobs",
  "creates_backend_routes",
  "creates_frontend_ui",
  "creates_repositories",
  "creates_migrations",
  "creates_schemas",
  "writes_output_files",
  "authorizes_research_model",
  "emits_probability",
  "computes_roi",
  "emits_financial_attribution",
  "emits_customer_facing_output"
];

const REQUIRED_BLOCKED_USES = [
  "live_bigquery_execution",
  "live_sigma_execution",
  "live_glean_query",
  "customer_connector_execution",
  "credential_access",
  "query_execution",
  "raw_row_ingestion",
  "connector_run_persistence",
  "source_package_clearance",
  "measurement_cell_snapshot_persistence",
  "measurement_cell_series_persistence",
  "customer_facing_output",
  "customer_facing_financial_output",
  "customer_facing_economic_output",
  "financial_attribution",
  "realized_roi",
  "ebita_claim",
  "ebitda_claim",
  "causality_claim",
  "productivity_claim",
  "probability_output",
  "research_model_promotion"
];

const ALLOWED_TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "adapter_run_id",
  "adapter_state",
  "source_system",
  "internal_review_executed",
  "connector_manifest_ref",
  "pipeline_dry_run_ref",
  "connector_review_packet",
  "validation_summary",
  "feeds",
  "blocked_uses",
  "boundary_policy",
  "required_caveats",
  "generated_at",
  "derivation_version"
]);

const ALLOWED_MANIFEST_FIELDS = new Set([
  "connector_manifest_id",
  "source_system",
  "adapter_mode",
  "execution_mode",
  "org_id",
  "client_id",
  "measurement_plan_id",
  "workflow_family",
  "function_area",
  "cohort_key",
  "baseline_window",
  "comparison_window",
  "source_owner_role",
  "owner_approval_state",
  "review_state",
  "source_owner_attestation",
  "aggregate_export_ref",
  "pipeline_dry_run_ref",
  "export_contract",
  "allowed_uses",
  "blocked_uses",
  "boundary_policy",
  "required_caveats",
  "generated_at"
]);

const ALLOWED_ATTESTATION_FIELDS = new Set([
  "attestation_state",
  "attested_by_role",
  "attested_at",
  "caveats"
]);

const ALLOWED_EXPORT_CONTRACT_FIELDS = new Set([
  "approved_export_only",
  "scrubbed_aggregate_only",
  "aggregate_grain",
  "row_level_data_present",
  "query_text_present",
  "credentials_present",
  "prompt_or_transcript_present",
  "user_identifier_present"
]);

const ALLOWED_PIPELINE_DRY_RUN_REF_FIELDS = new Set([
  "dry_run_id",
  "dry_run_state",
  "source_system",
  "source_export_ref",
  "manifest_hash",
  "aggregate_fixture_hash",
  "reviewed_source_refs_hash",
  "reviewed_aggregate_context_hash",
  "reviewed_blueprint_expectation_hash",
  "candidate_integrity_hash",
  "measurement_cell_ref",
  "expectation_path_id"
]);

const ALLOWED_CONNECTOR_MANIFEST_REF_FIELDS = new Set([
  "connector_manifest_id",
  "source_system",
  "adapter_mode",
  "execution_mode",
  "aggregate_export_ref",
  "connector_manifest_hash",
  "org_id",
  "client_id",
  "measurement_plan_id",
  "workflow_family",
  "function_area",
  "cohort_key",
  "baseline_window",
  "comparison_window",
  "source_owner_role",
  "owner_approval_state",
  "review_state",
  "attestation_state",
  "attested_by_role",
  "attested_at",
  "aggregate_grain"
]);

const ALLOWED_REVIEW_PACKET_FIELDS = new Set([
  "review_packet_id",
  "review_state",
  "source_system",
  "connector_manifest_ref",
  "pipeline_dry_run_ref",
  "identity_binding",
  "owner_review",
  "allowed_uses",
  "blocked_uses",
  "boundary_policy"
]);

const ALLOWED_IDENTITY_BINDING_FIELDS = new Set([
  "org_id",
  "client_id",
  "measurement_plan_id",
  "workflow_family",
  "function_area",
  "cohort_key",
  "baseline_window",
  "comparison_window"
]);

const ALLOWED_OWNER_REVIEW_FIELDS = new Set([
  "source_owner_role",
  "owner_approval_state",
  "review_state",
  "attestation_state",
  "attested_by_role",
  "attested_at"
]);

const ALLOWED_WINDOW_FIELDS = new Set(["window_start", "window_end"]);

const ALLOWED_VALIDATION_SUMMARY_FIELDS = new Set([
  "connector_manifest_valid",
  "pipeline_dry_run_valid",
  "connector_review_packet_valid",
  "gaps"
]);

const SAFE_SOURCE_REF_PATTERN = /^[a-z][a-z0-9_]{2,159}$/;
const HEX_64_PATTERN = /^[a-f0-9]{64}$/;

const FORBIDDEN_FIELD_PATTERNS = [
  /^raw_rows?$/i,
  /^rows$/i,
  /^events$/i,
  /^records$/i,
  /^samples$/i,
  /raw_(?:prompt|response|transcript|content|file|export|event|row|rows|data)/i,
  /^raw_data$/i,
  /prompt/i,
  /^responses?$/i,
  /response_text/i,
  /transcript/i,
  /^query$/i,
  /query_text/i,
  /sql_text/i,
  /bigquery_sql/i,
  /bigquery_job_id/i,
  /sigma_query/i,
  /sigma_api_run/i,
  /query_job_ref/i,
  /connector_status/i,
  /ingestion_job/i,
  /live_connector/i,
  /^file_contents?$/i,
  /preview_rows/i,
  /metric_values/i,
  /raw_export/i,
  /credentials?/i,
  /credential_ref/i,
  /email/i,
  /user_id/i,
  /user_uuid/i,
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
  /department_ranking/i,
  /people_decisioning/i,
  /^confidence$/i,
  /confidence/i,
  /^probability$/i,
  /probability/i,
  /likelihood/i,
  /contribution_probability/i,
  /contribution_likelihood/i,
  /^p_value$/i,
  /^roi$/i,
  /realized_roi/i,
  /roi_(?:value|amount|calculation|result|impact|output|proof)/i,
  /return_on_investment/i,
  /^ebita$/i,
  /^ebitda$/i,
  /ebitda_(?:claim|value|amount|impact|calculation|result)/i,
  /financial_impact/i,
  /financial_attribution/i,
  /finance_review_context/i,
  /finance_context_investigation_ready/i,
  /estimated_savings/i,
  /^financial_output$/i,
  /^customer_facing_output$/i,
  /^customer_facing_financial_output$/i,
  /^customer_facing_economic_output$/i,
  /causality_claim/i,
  /casuality/i,
  /causal_proof/i,
  /causal_lift/i,
  /productivity_claim/i,
  /productivity/i,
  /productivity_gain/i,
  /^source_package_payload$/i,
  /^source_packages$/i,
  /^client_evidence_entries$/i,
  /^measurement_cell$/i,
  /^measurement_cell_series$/i,
  /^payload_json$/i,
  /^validation_json$/i,
  /^source_refs_json$/i,
  /^blueprint_path_binding_json$/i
];

const FORBIDDEN_VALUE_PATTERNS = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /(?:^|_)(?:user|employee|person|direct)_(?:id|identifier|email)(?:_|$)/i,
  /(?:^|_)(?:hashed|joinable)_(?:id|identifier|user|person|employee)(?:_|$)/i,
  /select\s+.+\s+from/i,
  /raw_rows?/i,
  /query_text/i,
  /prompt/i,
  /transcript/i,
  /credential/i,
  /live_bigquery_execution/i,
  /live_sigma_execution/i,
  /live_glean_query/i,
  /customer_connector_execution/i,
  /connector_execution_authorized/i,
  /source_package_(?:clearance|cleared)/i,
  /measurement_cell_(?:snapshot|series)/i,
  /snapshot_ready/i,
  /customer_facing_output/i,
  /customer_facing_financial_output/i,
  /customer_facing_economic_output/i,
  /finance_context/i,
  /realized_roi/i,
  /return_on_investment/i,
  /confidence/i,
  /probability/i,
  /ebitda/i,
  /caus(?:al|ality)/i,
  /productivity/i
];

export interface BuildControlledAggregateConnectorAdapterInput {
  connectorManifest: any;
  pipelineDryRun: any;
  connectorManifestHash?: string | null;
  expectedConnectorManifestHash?: string | null;
  expectedPipelineDryRunRef?: any;
  generatedAt?: string;
}

export interface ControlledAggregateConnectorAdapterValidationOptions {
  sourceFixture?: any;
  expectedConnectorManifestHash?: string | null;
  expectedConnectorManifestRef?: any;
  expectedPipelineDryRunRef?: any;
}

export interface ControlledAggregateConnectorAdapterValidationResult {
  schema_version: string;
  adapter_run_id: string | null;
  source_system: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    aggregate_connector_adapter_review: boolean;
    connector_review_packet: boolean;
    measurement_cell_candidate_proof: boolean;
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

function requireField(value: any, path: string, gaps: string[]): void {
  if (value === undefined || value === null || value === "") {
    gaps.push(`${path} is missing`);
  }
}

function stringsOf(value: any): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function sameWindow(left: any, right: any): boolean {
  return left?.window_start === right?.window_start &&
    left?.window_end === right?.window_end;
}

function safeString(value: any, maxLength = 240): string | null {
  if (typeof value !== "string") return null;
  if (value.length === 0 || value.length > maxLength) return null;
  if (FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value) || pattern.test(normalizeKey(value)))) {
    return null;
  }
  return value;
}

function safeWindow(value: any): any {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return {
    window_start: safeString(value.window_start, 40),
    window_end: safeString(value.window_end, 40)
  };
}

function sourceRefPatternFor(sourceSystem: string): RegExp {
  return sourceSystem === "sigma_export"
    ? /^sigma_export_[a-z0-9_]{2,150}$/
    : /^bigquery_export_[a-z0-9_]{2,150}$/;
}

function safeSourceRef(value: any, sourceSystem: string): string | null {
  if (typeof value !== "string") return null;
  if (!SAFE_SOURCE_REF_PATTERN.test(value)) return null;
  if (!sourceRefPatternFor(sourceSystem).test(value)) return null;
  const prefix = `${sourceSystem}_`;
  const suffix = value.startsWith(prefix) ? value.slice(prefix.length) : value;
  if (/^eyj[a-z0-9_]{8,}$/i.test(suffix)) return null;
  if (/^[a-f0-9]{24,}$/i.test(suffix)) return null;
  if (FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value) || pattern.test(normalizeKey(value)))) {
    return null;
  }
  return value;
}

function isRequiredCaveatPath(path: string[]): boolean {
  return path.map(normalizeKey).includes("required_caveats");
}

function isAllowedBlockedUseValue(path: string[], value: string): boolean {
  const normalizedPath = path.map(normalizeKey);
  const blockedUsesIndex = normalizedPath.lastIndexOf("blocked_uses");
  const valueIndex = normalizedPath.length - 1;
  return blockedUsesIndex === valueIndex - 1 &&
    /^\d+$/.test(path[valueIndex] ?? "") &&
    REQUIRED_BLOCKED_USES.includes(value);
}

function isFalseBoundaryFlag(path: string[], key: string, nested: any): boolean {
  if (nested !== false) return false;
  const normalizedPath = path.map(normalizeKey);
  const parent = normalizedPath[normalizedPath.length - 1] ?? "";
  const normalizedKey = normalizeKey(key);
  return parent === "feeds" ||
    parent === "boundary_policy" ||
    parent === "export_contract" ||
    REQUIRED_FALSE_FEEDS.includes(normalizedKey) ||
    REQUIRED_FALSE_BOUNDARY_FIELDS.includes(normalizedKey);
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
    const currentPath = [...path, key];
    const normalized = normalizeKey(key);
    const allowedFalse = isFalseBoundaryFlag(path, key, nested);
    if (
      !allowedFalse &&
      (FORBIDDEN_FIELD_PATTERNS.some((pattern) => pattern.test(key) || pattern.test(normalized)) ||
        REQUIRED_BLOCKED_USES.includes(normalized))
    ) {
      fields.add(currentPath.join("."));
    }
    collectForbiddenFields(nested, fields, currentPath);
  }
  return fields;
}

function collectForbiddenValues(
  value: any,
  values: Set<string> = new Set(),
  path: string[] = []
): Set<string> {
  if (typeof value === "string") {
    const normalized = normalizeKey(value);
    if (isRequiredCaveatPath(path) && SAFE_CAVEAT_VALUES.has(value)) {
      return values;
    }
    if (
      !isAllowedBlockedUseValue(path, value) &&
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

function sanitizeGapForOutput(gap: string): string {
  return gap
    .replace(/select\s+.+?\s+from/gi, "<blocked_query_text>")
    .replace(/prompt\s*:/gi, "<blocked_prompt>")
    .replace(/transcript\s*:/gi, "<blocked_transcript>")
    .replace(/employee_email/gi, "<blocked_identifier_field>")
    .replace(/employee_name/gi, "<blocked_identifier_field>")
    .replace(/employee_id/gi, "<blocked_identifier_field>")
    .replace(/user_uuid/gi, "<blocked_identifier_field>")
    .replace(/user_id/gi, "<blocked_identifier_field>")
    .replace(/person_id/gi, "<blocked_identifier_field>")
    .replace(/person_identifier/gi, "<blocked_identifier_field>")
    .replace(/respondent_email/gi, "<blocked_identifier_field>")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "<blocked_identifier_value>");
}

function sanitizeGaps(gaps: string[]): string[] {
  return gaps.map(sanitizeGapForOutput);
}

function boundaryPolicy(): Record<string, false> {
  return Object.fromEntries(
    REQUIRED_FALSE_BOUNDARY_FIELDS.map((field) => [field, false])
  ) as Record<string, false>;
}

function feedsForPassed(passed: boolean): Record<string, boolean> {
  const feeds: Record<string, boolean> = {};
  for (const field of TRUE_FEEDS) feeds[field] = passed;
  for (const field of REQUIRED_FALSE_FEEDS) feeds[field] = false;
  return feeds;
}

function sameStringArray(left: any, right: string[]): boolean {
  return Array.isArray(left) &&
    left.length === right.length &&
    left.every((value, index) => value === right[index]);
}

function collectExactStringArrayGaps(value: any, expected: string[], path: string): string[] {
  const gaps: string[] = [];
  if (!Array.isArray(value)) {
    return [`${path} must be an array`];
  }
  if (value.length !== expected.length) {
    gaps.push(`${path} must match the controlled connector adapter list exactly`);
  }
  value.forEach((item, index) => {
    if (typeof item !== "string") {
      gaps.push(`${path}[${index}] must be a string`);
      return;
    }
    if (item !== expected[index]) {
      gaps.push(`${path}[${index}] must match the controlled connector adapter list`);
    }
  });
  return gaps;
}

function expectedReviewPacketId(manifestRef: any): string {
  return `connector_review_packet_${safeIdPart(String(manifestRef?.source_system ?? "unknown"))}_${safeIdPart(String(manifestRef?.workflow_family ?? "unknown"))}`;
}

function compactPipelineDryRunRef(dryRun: any): any {
  if (!dryRun) return null;
  return {
    dry_run_id: dryRun?.dry_run_id ?? null,
    dry_run_state: dryRun?.dry_run_state ?? null,
    source_system: dryRun?.source_system ?? null,
    source_export_ref: dryRun?.manifest_ref?.source_export_ref ?? null,
    manifest_hash: dryRun?.manifest_ref?.manifest_hash ?? null,
    aggregate_fixture_hash: dryRun?.manifest_ref?.aggregate_fixture_hash ?? null,
    reviewed_source_refs_hash: dryRun?.manifest_ref?.reviewed_source_refs_hash ?? null,
    reviewed_aggregate_context_hash: dryRun?.manifest_ref?.reviewed_aggregate_context_hash ?? null,
    reviewed_blueprint_expectation_hash:
      dryRun?.manifest_ref?.reviewed_blueprint_expectation_hash ?? null,
    candidate_integrity_hash: dryRun?.candidate_ref?.candidate_integrity_hash ?? null,
    measurement_cell_ref: dryRun?.candidate_ref?.measurement_cell_ref ?? null,
    expectation_path_id: dryRun?.candidate_ref?.expectation_path_id ?? null
  };
}

function collectManifestGaps(manifest: any, pipelineDryRun: any): string[] {
  const gaps: string[] = [];
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    return ["connector manifest must be an object"];
  }
  for (const field of [
    "connector_manifest_id",
    "source_system",
    "adapter_mode",
    "execution_mode",
    "org_id",
    "client_id",
    "measurement_plan_id",
    "workflow_family",
    "function_area",
    "cohort_key",
    "baseline_window",
    "comparison_window",
    "source_owner_role",
    "owner_approval_state",
    "review_state",
    "source_owner_attestation",
    "aggregate_export_ref",
    "pipeline_dry_run_ref",
    "export_contract",
    "allowed_uses",
    "blocked_uses",
    "boundary_policy",
    "required_caveats",
    "generated_at"
  ]) {
    requireField(manifest?.[field], field, gaps);
  }
  for (const field of Object.keys(manifest ?? {})) {
    if (!ALLOWED_MANIFEST_FIELDS.has(field)) {
      gaps.push(`Unsupported connector manifest field: ${field}`);
    }
  }
  const sourceSystem = String(manifest?.source_system ?? "");
  if (!ALLOWED_SOURCE_SYSTEMS.has(sourceSystem)) {
    gaps.push("source_system is invalid");
  }
  if (manifest?.source_system !== pipelineDryRun?.source_system) {
    gaps.push("source_system must match the pipeline dry-run proof");
  }
  if (manifest?.adapter_mode !== "reviewed_aggregate_export") {
    gaps.push("adapter_mode must be reviewed_aggregate_export");
  }
  if (manifest?.execution_mode !== "no_live_execution") {
    gaps.push("execution_mode must be no_live_execution");
  }
  const expectedOwnerRole = ALLOWED_SOURCE_OWNER_ROLES[sourceSystem];
  if (expectedOwnerRole && manifest?.source_owner_role !== expectedOwnerRole) {
    gaps.push("source_owner_role must match the selected source_system owner role");
  }
  if (manifest?.owner_approval_state !== "approved") {
    gaps.push("owner_approval_state must be approved");
  }
  if (manifest?.review_state !== "clear") {
    gaps.push("review_state must be clear");
  }
  if (
    !manifest?.source_owner_attestation ||
    typeof manifest.source_owner_attestation !== "object" ||
    Array.isArray(manifest.source_owner_attestation)
  ) {
    gaps.push("source_owner_attestation must be an object");
  } else {
    for (const field of Object.keys(manifest.source_owner_attestation)) {
      if (!ALLOWED_ATTESTATION_FIELDS.has(field)) {
        gaps.push(`Unsupported source_owner_attestation field: ${field}`);
      }
    }
  }
  if (manifest?.source_owner_attestation?.attestation_state !== "attested") {
    gaps.push("source_owner_attestation.attestation_state must be attested");
  }
  if (manifest?.source_owner_attestation?.attested_by_role !== manifest?.source_owner_role) {
    gaps.push("source_owner_attestation.attested_by_role must match source_owner_role");
  }
  if (!safeString(manifest?.source_owner_attestation?.attested_at, 80)) {
    gaps.push("source_owner_attestation.attested_at must be safe metadata");
  }
  if (!safeSourceRef(manifest?.aggregate_export_ref, sourceSystem || "bigquery_export")) {
    gaps.push("aggregate_export_ref must be a safe reviewed aggregate export ref for the selected source_system");
  }
  if (
    pipelineDryRun?.manifest_ref?.source_export_ref &&
    manifest?.aggregate_export_ref !== pipelineDryRun.manifest_ref.source_export_ref
  ) {
    gaps.push("aggregate_export_ref must match the pipeline dry-run source export ref");
  }
  for (const field of Object.keys(manifest?.export_contract ?? {})) {
    if (!ALLOWED_EXPORT_CONTRACT_FIELDS.has(field)) {
      gaps.push(`Unsupported export_contract field: ${field}`);
    }
  }
  if (manifest?.export_contract?.approved_export_only !== true) {
    gaps.push("export_contract.approved_export_only must be true");
  }
  if (manifest?.export_contract?.scrubbed_aggregate_only !== true) {
    gaps.push("export_contract.scrubbed_aggregate_only must be true");
  }
  if (manifest?.export_contract?.aggregate_grain !== "workflow_function_cohort_window") {
    gaps.push("export_contract.aggregate_grain must be workflow_function_cohort_window");
  }
  for (const field of [
    "row_level_data_present",
    "query_text_present",
    "credentials_present",
    "prompt_or_transcript_present",
    "user_identifier_present"
  ]) {
    if (manifest?.export_contract?.[field] !== false) {
      gaps.push(`export_contract.${field} must be false`);
    }
  }
  for (const field of REQUIRED_FALSE_BOUNDARY_FIELDS) {
    if (manifest?.boundary_policy?.[field] !== false) {
      gaps.push(`boundary_policy.${field} must be false`);
    }
  }
  gaps.push(...collectExactStringArrayGaps(
    manifest?.blocked_uses,
    REQUIRED_BLOCKED_USES,
    "blocked_uses"
  ));
  if (!sameStringArray(manifest?.allowed_uses, REQUIRED_REVIEW_PACKET_ALLOWED_USES)) {
    gaps.push("allowed_uses must match the controlled connector adapter allowed uses exactly");
  }
  if (!sameWindow(manifest?.baseline_window, pipelineDryRun?.manifest_ref?.baseline_window)) {
    gaps.push("baseline_window must match the pipeline dry-run manifest");
  }
  if (!sameWindow(manifest?.comparison_window, pipelineDryRun?.manifest_ref?.comparison_window)) {
    gaps.push("comparison_window must match the pipeline dry-run manifest");
  }
  for (const field of [
    "org_id",
    "client_id",
    "measurement_plan_id",
    "workflow_family",
    "function_area",
    "cohort_key"
  ]) {
    if (manifest?.[field] !== pipelineDryRun?.manifest_ref?.[field]) {
      gaps.push(`${field} must match the pipeline dry-run manifest`);
    }
  }
  const expectedDryRunRef = compactPipelineDryRunRef(pipelineDryRun);
  for (const field of Object.keys(manifest?.pipeline_dry_run_ref ?? {})) {
    if (!ALLOWED_PIPELINE_DRY_RUN_REF_FIELDS.has(field)) {
      gaps.push(`Unsupported pipeline_dry_run_ref field: ${field}`);
    }
  }
  for (const field of ALLOWED_PIPELINE_DRY_RUN_REF_FIELDS) {
    if (manifest?.pipeline_dry_run_ref?.[field] !== expectedDryRunRef?.[field]) {
      gaps.push(`pipeline_dry_run_ref.${field} must match the supplied pipeline dry-run proof`);
    }
  }
  for (const field of Array.from(collectForbiddenFields(manifest)).sort()) {
    gaps.push(`Forbidden field detected: ${field}`);
  }
  for (const value of Array.from(collectForbiddenValues(manifest)).sort()) {
    gaps.push(`Forbidden value detected: ${value}`);
  }
  return gaps;
}

function collectPipelineDryRunGaps(pipelineDryRun: any, expectedPipelineDryRunRef?: any): string[] {
  const gaps: string[] = [];
  if (!pipelineDryRun || typeof pipelineDryRun !== "object" || Array.isArray(pipelineDryRun)) {
    return ["pipeline dry-run proof is missing"];
  }
  const actualRef = compactPipelineDryRunRef(pipelineDryRun);
  if (pipelineDryRun?.dry_run_state !== "PASSED_INTERNAL_PIPELINE_DRY_RUN_REVIEW") {
    gaps.push("pipeline dry-run proof must have passed internal dry-run review");
  }
  if (pipelineDryRun?.feeds?.measurement_cell_candidate_proof !== true) {
    gaps.push("pipeline dry-run proof must include measurement_cell_candidate_proof");
  }
  if (!ALLOWED_SOURCE_SYSTEMS.has(String(actualRef?.source_system ?? ""))) {
    gaps.push("pipeline dry-run ref source_system is invalid");
  }
  if (!safeSourceRef(actualRef?.source_export_ref, String(actualRef?.source_system ?? ""))) {
    gaps.push("pipeline dry-run ref source_export_ref must be a safe reviewed aggregate export ref");
  }
  for (const field of [
    "manifest_hash",
    "aggregate_fixture_hash",
    "reviewed_source_refs_hash",
    "reviewed_aggregate_context_hash",
    "reviewed_blueprint_expectation_hash",
    "candidate_integrity_hash"
  ]) {
    if (!HEX_64_PATTERN.test(String(actualRef?.[field] ?? ""))) {
      gaps.push(`pipeline dry-run ref ${field} must be a sha256 hex string`);
    }
  }
  if (!expectedPipelineDryRunRef || typeof expectedPipelineDryRunRef !== "object") {
    gaps.push("expectedPipelineDryRunRef is required for passed connector adapter proof");
  } else {
    for (const field of ALLOWED_PIPELINE_DRY_RUN_REF_FIELDS) {
      if (actualRef?.[field] !== expectedPipelineDryRunRef?.[field]) {
        gaps.push(`pipeline dry-run ref ${field} must match expected fixture-bound dry-run ref`);
      }
    }
  }
  return gaps;
}

function collectConnectorManifestHashGaps(
  connectorManifestHash?: string | null,
  expectedConnectorManifestHash?: string | null
): string[] {
  const gaps: string[] = [];
  if (!expectedConnectorManifestHash) {
    gaps.push("expectedConnectorManifestHash is required for passed connector adapter proof");
  }
  if (!HEX_64_PATTERN.test(String(connectorManifestHash ?? ""))) {
    gaps.push("connectorManifestHash must be a sha256 hex string");
  }
  if (
    expectedConnectorManifestHash &&
    connectorManifestHash !== expectedConnectorManifestHash
  ) {
    gaps.push("connectorManifestHash must match expected connector manifest hash");
  }
  return gaps;
}

function buildConnectorManifestRef(manifest: any, connectorManifestHash?: string | null): any {
  const sourceSystem = String(manifest?.source_system ?? "");
  return {
    connector_manifest_id: safeString(manifest?.connector_manifest_id),
    source_system: ALLOWED_SOURCE_SYSTEMS.has(sourceSystem) ? sourceSystem : null,
    adapter_mode: manifest?.adapter_mode === "reviewed_aggregate_export"
      ? "reviewed_aggregate_export"
      : null,
    execution_mode: manifest?.execution_mode === "no_live_execution"
      ? "no_live_execution"
      : null,
    aggregate_export_ref: safeSourceRef(manifest?.aggregate_export_ref, sourceSystem || "bigquery_export"),
    connector_manifest_hash: HEX_64_PATTERN.test(String(connectorManifestHash ?? ""))
      ? connectorManifestHash
      : null,
    org_id: safeString(manifest?.org_id),
    client_id: safeString(manifest?.client_id),
    measurement_plan_id: safeString(manifest?.measurement_plan_id),
    workflow_family: safeString(manifest?.workflow_family),
    function_area: safeString(manifest?.function_area),
    cohort_key: safeString(manifest?.cohort_key),
    baseline_window: safeWindow(manifest?.baseline_window),
    comparison_window: safeWindow(manifest?.comparison_window),
    source_owner_role: safeString(manifest?.source_owner_role),
    owner_approval_state: manifest?.owner_approval_state === "approved" ? "approved" : null,
    review_state: manifest?.review_state === "clear" ? "clear" : null,
    attestation_state: manifest?.source_owner_attestation?.attestation_state === "attested"
      ? "attested"
      : null,
    attested_by_role: safeString(manifest?.source_owner_attestation?.attested_by_role),
    attested_at: safeString(manifest?.source_owner_attestation?.attested_at, 80),
    aggregate_grain: manifest?.export_contract?.aggregate_grain === "workflow_function_cohort_window"
      ? "workflow_function_cohort_window"
      : null
  };
}

function buildConnectorReviewPacket(manifestRef: any, pipelineDryRunRef: any, manifest: any): any {
  return {
    review_packet_id: expectedReviewPacketId(manifestRef),
    review_state: "READY_FOR_INTERNAL_CONNECTOR_REVIEW",
    source_system: manifestRef?.source_system ?? null,
    connector_manifest_ref: manifestRef,
    pipeline_dry_run_ref: pipelineDryRunRef,
    identity_binding: {
      org_id: manifestRef?.org_id ?? null,
      client_id: manifestRef?.client_id ?? null,
      measurement_plan_id: manifestRef?.measurement_plan_id ?? null,
      workflow_family: manifestRef?.workflow_family ?? null,
      function_area: manifestRef?.function_area ?? null,
      cohort_key: manifestRef?.cohort_key ?? null,
      baseline_window: manifestRef?.baseline_window ?? null,
      comparison_window: manifestRef?.comparison_window ?? null
    },
    owner_review: {
      source_owner_role: manifestRef?.source_owner_role ?? null,
      owner_approval_state: manifestRef?.owner_approval_state ?? null,
      review_state: manifestRef?.review_state ?? null,
      attestation_state: manifestRef?.attestation_state ?? null,
      attested_by_role: manifestRef?.attested_by_role ?? null,
      attested_at: manifestRef?.attested_at ?? null
    },
    allowed_uses: [...REQUIRED_REVIEW_PACKET_ALLOWED_USES],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    boundary_policy: boundaryPolicy()
  };
}

export function buildControlledAggregateConnectorAdapter(
  input: BuildControlledAggregateConnectorAdapterInput
): any {
  const manifestGaps = collectManifestGaps(
    input.connectorManifest,
    input.pipelineDryRun
  );
  const pipelineDryRunGaps = manifestGaps.length === 0
    ? collectPipelineDryRunGaps(
      input.pipelineDryRun,
      input.expectedPipelineDryRunRef
    )
    : [];
  const hashGaps = manifestGaps.length === 0 && pipelineDryRunGaps.length === 0
    ? collectConnectorManifestHashGaps(
      input.connectorManifestHash,
      input.expectedConnectorManifestHash
    )
    : [];
  const passed = manifestGaps.length === 0 &&
    pipelineDryRunGaps.length === 0 &&
    hashGaps.length === 0;
  const sourceSystem = ALLOWED_SOURCE_SYSTEMS.has(String(input.connectorManifest?.source_system))
    ? String(input.connectorManifest.source_system)
    : null;
  const state = passed
    ? "PASSED_INTERNAL_CONNECTOR_ADAPTER_REVIEW"
    : manifestGaps.length > 0 || hashGaps.length > 0
      ? "BLOCKED"
      : "HELD_FOR_PIPELINE_DRY_RUN";
  const manifestRef = buildConnectorManifestRef(
    input.connectorManifest,
    input.connectorManifestHash
  );
  const pipelineDryRunRef = compactPipelineDryRunRef(input.pipelineDryRun);

  return {
    schema_version: AI_VALUE_CONTROLLED_AGGREGATE_CONNECTOR_ADAPTER_SCHEMA_VERSION,
    adapter_run_id: `controlled_aggregate_connector_adapter_${safeIdPart(String(sourceSystem ?? "unknown_source"))}_${safeIdPart(String(input.connectorManifest?.workflow_family ?? "unknown_workflow"))}`,
    adapter_state: state,
    source_system: sourceSystem,
    internal_review_executed: passed,
    connector_manifest_ref: manifestRef,
    pipeline_dry_run_ref: pipelineDryRunRef,
    connector_review_packet: passed
      ? buildConnectorReviewPacket(manifestRef, pipelineDryRunRef, input.connectorManifest)
      : null,
    validation_summary: {
      connector_manifest_valid: manifestGaps.length === 0,
      pipeline_dry_run_valid: pipelineDryRunGaps.length === 0 && manifestGaps.length === 0,
      connector_review_packet_valid: passed,
      gaps: sanitizeGaps([...manifestGaps, ...pipelineDryRunGaps, ...hashGaps])
    },
    feeds: feedsForPassed(passed),
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    boundary_policy: boundaryPolicy(),
    required_caveats: [...REQUIRED_CAVEATS],
    generated_at: input.generatedAt ?? new Date(0).toISOString(),
    derivation_version: DERIVATION_VERSION
  };
}

function collectOutputShapeGaps(adapter: any): string[] {
  const gaps: string[] = [];
  if (!adapter || typeof adapter !== "object" || Array.isArray(adapter)) {
    return ["connector adapter output must be an object"];
  }
  for (const field of [
    "schema_version",
    "adapter_run_id",
    "adapter_state",
    "source_system",
    "internal_review_executed",
    "connector_manifest_ref",
    "pipeline_dry_run_ref",
    "validation_summary",
    "feeds",
    "blocked_uses",
    "boundary_policy",
    "required_caveats",
    "generated_at",
    "derivation_version"
  ]) {
    requireField(adapter?.[field], field, gaps);
  }
  for (const field of Object.keys(adapter ?? {})) {
    if (!ALLOWED_TOP_LEVEL_FIELDS.has(field)) {
      gaps.push(`Unsupported connector adapter field: ${field}`);
    }
  }
  if (
    adapter?.schema_version &&
    adapter.schema_version !== AI_VALUE_CONTROLLED_AGGREGATE_CONNECTOR_ADAPTER_SCHEMA_VERSION
  ) {
    gaps.push("schema_version is invalid");
  }
  if (adapter?.adapter_state && !ALLOWED_ADAPTER_STATES.has(String(adapter.adapter_state))) {
    gaps.push("adapter_state is invalid");
  }
  if (adapter?.source_system && !ALLOWED_SOURCE_SYSTEMS.has(String(adapter.source_system))) {
    gaps.push("source_system is invalid");
  }
  const allowedFeedFields = new Set([...TRUE_FEEDS, ...REQUIRED_FALSE_FEEDS]);
  for (const field of Object.keys(adapter?.feeds ?? {})) {
    if (!allowedFeedFields.has(field)) {
      gaps.push(`Unsupported feeds field: feeds.${field}`);
    }
  }
  for (const field of Object.keys(adapter?.boundary_policy ?? {})) {
    if (!REQUIRED_FALSE_BOUNDARY_FIELDS.includes(field)) {
      gaps.push(`Unsupported boundary_policy field: boundary_policy.${field}`);
    }
  }
  for (const field of Object.keys(adapter?.connector_manifest_ref ?? {})) {
    if (!ALLOWED_CONNECTOR_MANIFEST_REF_FIELDS.has(field)) {
      gaps.push(`Unsupported connector_manifest_ref field: connector_manifest_ref.${field}`);
    }
  }
  for (const field of Object.keys(adapter?.pipeline_dry_run_ref ?? {})) {
    if (!ALLOWED_PIPELINE_DRY_RUN_REF_FIELDS.has(field)) {
      gaps.push(`Unsupported pipeline_dry_run_ref field: pipeline_dry_run_ref.${field}`);
    }
  }
  if (adapter?.connector_review_packet && typeof adapter.connector_review_packet === "object") {
    for (const field of Object.keys(adapter.connector_review_packet)) {
      if (!ALLOWED_REVIEW_PACKET_FIELDS.has(field)) {
        gaps.push(`Unsupported connector_review_packet field: connector_review_packet.${field}`);
      }
    }
    for (const field of Object.keys(adapter.connector_review_packet.identity_binding ?? {})) {
      if (!ALLOWED_IDENTITY_BINDING_FIELDS.has(field)) {
        gaps.push(`Unsupported identity_binding field: ${field}`);
      }
    }
    for (const field of Object.keys(adapter.connector_review_packet.owner_review ?? {})) {
      if (!ALLOWED_OWNER_REVIEW_FIELDS.has(field)) {
        gaps.push(`Unsupported owner_review field: ${field}`);
      }
    }
    for (const field of Object.keys(adapter.connector_review_packet.boundary_policy ?? {})) {
      if (!REQUIRED_FALSE_BOUNDARY_FIELDS.includes(field)) {
        gaps.push(`Unsupported connector_review_packet.boundary_policy field: ${field}`);
      }
    }
  }
  for (const field of Object.keys(adapter?.validation_summary ?? {})) {
    if (!ALLOWED_VALIDATION_SUMMARY_FIELDS.has(field)) {
      gaps.push(`Unsupported validation_summary field: validation_summary.${field}`);
    }
  }
  for (const windowPath of [
    "connector_manifest_ref.baseline_window",
    "connector_manifest_ref.comparison_window",
    "connector_review_packet.identity_binding.baseline_window",
    "connector_review_packet.identity_binding.comparison_window"
  ]) {
    const value = windowPath.split(".").reduce((current, key) => current?.[key], adapter);
    if (value !== null && value !== undefined && typeof value === "object") {
      for (const field of Object.keys(value)) {
        if (!ALLOWED_WINDOW_FIELDS.has(field)) {
          gaps.push(`Unsupported ${windowPath} field: ${field}`);
        }
      }
    }
  }
  return gaps;
}

function collectOutputPolicyGaps(
  adapter: any,
  options: ControlledAggregateConnectorAdapterValidationOptions
): string[] {
  const gaps: string[] = [];
  const passed = adapter?.adapter_state === "PASSED_INTERNAL_CONNECTOR_ADAPTER_REVIEW";
  for (const field of REQUIRED_FALSE_FEEDS) {
    if (adapter?.feeds?.[field] !== false) {
      gaps.push(`feeds.${field} must be false`);
    }
  }
  for (const field of TRUE_FEEDS) {
    if (adapter?.feeds?.[field] !== passed) {
      gaps.push(`feeds.${field} must be ${passed}`);
    }
  }
  for (const field of REQUIRED_FALSE_BOUNDARY_FIELDS) {
    if (adapter?.boundary_policy?.[field] !== false) {
      gaps.push(`boundary_policy.${field} must be false`);
    }
  }
  for (const use of REQUIRED_BLOCKED_USES) {
    if (!stringsOf(adapter?.blocked_uses).includes(use)) {
      gaps.push(`blocked_uses missing ${use}`);
    }
  }
  gaps.push(...collectExactStringArrayGaps(
    adapter?.blocked_uses,
    REQUIRED_BLOCKED_USES,
    "blocked_uses"
  ));
  if (
    !Array.isArray(adapter?.required_caveats) ||
    adapter.required_caveats.length !== REQUIRED_CAVEATS.length ||
    !adapter.required_caveats.every((value: string, index: number) => value === REQUIRED_CAVEATS[index])
  ) {
    gaps.push("required_caveats must match the controlled connector adapter caveat set exactly");
  }
  if (passed) {
    if (!options.sourceFixture) {
      gaps.push("sourceFixture is required for passed connector adapter validation");
    }
    if (!options.expectedConnectorManifestHash) {
      gaps.push("expectedConnectorManifestHash is required for passed connector adapter validation");
    }
    if (!options.expectedConnectorManifestRef) {
      gaps.push("expectedConnectorManifestRef is required for passed connector adapter validation");
    }
    if (!options.expectedPipelineDryRunRef) {
      gaps.push("expectedPipelineDryRunRef is required for passed connector adapter validation");
    }
    if (adapter?.internal_review_executed !== true) {
      gaps.push("internal_review_executed must be true when adapter_state is passed");
    }
    if (!adapter?.connector_review_packet) {
      gaps.push("connector_review_packet is required when adapter_state is passed");
    }
    if (adapter?.pipeline_dry_run_ref?.source_system !== adapter?.source_system) {
      gaps.push("pipeline_dry_run_ref.source_system must match adapter source_system");
    }
    if (
      !safeSourceRef(
        adapter?.pipeline_dry_run_ref?.source_export_ref,
        String(adapter?.pipeline_dry_run_ref?.source_system ?? "")
      )
    ) {
      gaps.push("pipeline_dry_run_ref.source_export_ref must be a safe reviewed aggregate export ref");
    }
    if (
      options.expectedConnectorManifestHash &&
      adapter?.connector_manifest_ref?.connector_manifest_hash !==
        options.expectedConnectorManifestHash
    ) {
      gaps.push("connector_manifest_ref.connector_manifest_hash must match expected connector manifest hash");
    }
    if (options.expectedPipelineDryRunRef) {
      for (const field of ALLOWED_PIPELINE_DRY_RUN_REF_FIELDS) {
        if (adapter?.pipeline_dry_run_ref?.[field] !== options.expectedPipelineDryRunRef?.[field]) {
          gaps.push(`pipeline_dry_run_ref.${field} must match expected fixture-bound dry-run ref`);
        }
      }
    }
    if (options.expectedConnectorManifestRef) {
      for (const field of ALLOWED_CONNECTOR_MANIFEST_REF_FIELDS) {
        const actual = JSON.stringify(adapter?.connector_manifest_ref?.[field] ?? null);
        const expected = JSON.stringify(options.expectedConnectorManifestRef?.[field] ?? null);
        if (actual !== expected) {
          gaps.push(`connector_manifest_ref.${field} must match expected fixture-bound connector manifest ref`);
        }
      }
    }
    if (
      !Array.isArray(adapter?.validation_summary?.gaps) ||
      adapter.validation_summary.gaps.length > 0
    ) {
      gaps.push("validation_summary.gaps must be an empty array when adapter_state is passed");
    }
    if (adapter?.validation_summary?.connector_manifest_valid !== true) {
      gaps.push("validation_summary.connector_manifest_valid must be true when adapter_state is passed");
    }
    if (adapter?.validation_summary?.pipeline_dry_run_valid !== true) {
      gaps.push("validation_summary.pipeline_dry_run_valid must be true when adapter_state is passed");
    }
    if (adapter?.validation_summary?.connector_review_packet_valid !== true) {
      gaps.push("validation_summary.connector_review_packet_valid must be true when adapter_state is passed");
    }
    if (adapter?.connector_review_packet?.review_state !== "READY_FOR_INTERNAL_CONNECTOR_REVIEW") {
      gaps.push("connector_review_packet.review_state must be READY_FOR_INTERNAL_CONNECTOR_REVIEW");
    }
    if (
      adapter?.connector_review_packet?.review_packet_id !==
      expectedReviewPacketId(adapter?.connector_manifest_ref)
    ) {
      gaps.push("connector_review_packet.review_packet_id must match connector manifest identity");
    }
    if (adapter?.connector_review_packet?.source_system !== adapter?.source_system) {
      gaps.push("connector_review_packet.source_system must match adapter source_system");
    }
    if (!sameStringArray(adapter?.connector_review_packet?.allowed_uses, REQUIRED_REVIEW_PACKET_ALLOWED_USES)) {
      gaps.push("connector_review_packet.allowed_uses must match the controlled connector adapter allowed uses exactly");
    }
    for (const field of [
      "connector_manifest_ref",
      "pipeline_dry_run_ref",
      "blocked_uses",
      "boundary_policy"
    ]) {
      const left = JSON.stringify(adapter?.connector_review_packet?.[field]);
      const right = JSON.stringify(adapter?.[field]);
      if (left !== right) {
        gaps.push(`connector_review_packet.${field} must match adapter ${field}`);
      }
    }
    for (const field of ALLOWED_IDENTITY_BINDING_FIELDS) {
      const left = JSON.stringify(adapter?.connector_review_packet?.identity_binding?.[field] ?? null);
      const right = JSON.stringify(adapter?.connector_manifest_ref?.[field] ?? null);
      if (left !== right) {
        gaps.push(`connector_review_packet.identity_binding.${field} must match connector_manifest_ref.${field}`);
      }
    }
    for (const field of ALLOWED_OWNER_REVIEW_FIELDS) {
      const left = JSON.stringify(adapter?.connector_review_packet?.owner_review?.[field] ?? null);
      const right = JSON.stringify(adapter?.connector_manifest_ref?.[field] ?? null);
      if (left !== right) {
        gaps.push(`connector_review_packet.owner_review.${field} must match connector_manifest_ref.${field}`);
      }
    }
  }
  if (!passed && adapter?.internal_review_executed !== false) {
    gaps.push("internal_review_executed must be false unless adapter_state is passed");
  }
  if (adapter?.adapter_state !== "PASSED_INTERNAL_CONNECTOR_ADAPTER_REVIEW") {
    gaps.push("connector adapter outputs do not validate as connector review proof");
  }
  for (const field of Array.from(collectForbiddenFields(adapter)).sort()) {
    gaps.push(`Forbidden field detected: ${field}`);
  }
  for (const value of Array.from(collectForbiddenValues(adapter)).sort()) {
    gaps.push(`Forbidden value detected: ${value}`);
  }
  return gaps;
}

export function validateControlledAggregateConnectorAdapter(
  adapter: any,
  options: ControlledAggregateConnectorAdapterValidationOptions = {}
): ControlledAggregateConnectorAdapterValidationResult {
  const gaps = [
    ...collectOutputShapeGaps(adapter),
    ...collectOutputPolicyGaps(adapter, options)
  ];
  const valid = gaps.length === 0;
  const safeGaps = sanitizeGaps(gaps);
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    adapter_run_id: safeString(adapter?.adapter_run_id) ?? null,
    source_system: ALLOWED_SOURCE_SYSTEMS.has(String(adapter?.source_system))
      ? String(adapter.source_system)
      : null,
    valid,
    gaps: safeGaps,
    feeds: {
      aggregate_connector_adapter_review:
        valid && adapter?.feeds?.aggregate_connector_adapter_review === true,
      connector_review_packet:
        valid && adapter?.feeds?.connector_review_packet === true,
      measurement_cell_candidate_proof:
        valid && adapter?.feeds?.measurement_cell_candidate_proof === true,
      customer_facing_financial_output: false
    }
  };
}
