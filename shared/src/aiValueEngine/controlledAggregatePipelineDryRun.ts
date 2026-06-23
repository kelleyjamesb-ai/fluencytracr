/**
 * AI Value Engine - Controlled Aggregate Pipeline Dry Run.
 *
 * Contract-only bridge from a reviewed BigQuery/Sigma-shaped aggregate export
 * manifest into the existing controlled source-review and Measurement Cell
 * candidate path. It does not run connectors, execute queries, persist pipeline
 * runs, emit customer-facing output, or compute confidence, ROI, causality,
 * productivity, probability, or financial attribution.
 */

export const AI_VALUE_CONTROLLED_AGGREGATE_PIPELINE_DRY_RUN_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTROLLED_AGGREGATE_PIPELINE_DRY_RUN_2026_06";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTROLLED_AGGREGATE_PIPELINE_DRY_RUN_VALIDATION_2026_06";

const DERIVATION_VERSION =
  "ai_value_controlled_aggregate_pipeline_dry_run_2026_06";

const REQUIRED_CAVEATS = [
  "This is a controlled dry-run proof for scrubbed aggregate BigQuery/Sigma-shaped exports only.",
  "The dry run does not execute BigQuery, Sigma, Glean, or customer connectors.",
  "The dry run may prove internal source-package review path and Measurement Cell candidate proof only.",
  "It does not persist pipeline runs, create Measurement Cell snapshots, create Series snapshots, or emit customer-facing output.",
  "No ROI, EBITDA, financial attribution, causality, productivity, probability, or confidence output is produced."
];

const ALLOWED_SOURCE_SYSTEMS = new Set(["bigquery_export", "sigma_export"]);

const ALLOWED_STATES = new Set([
  "PASSED_INTERNAL_PIPELINE_DRY_RUN_REVIEW",
  "HELD_FOR_PIPELINE_MANIFEST",
  "HELD_FOR_MEASUREMENT_CELL_CANDIDATE",
  "BLOCKED"
]);

const ALLOWED_TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "dry_run_id",
  "dry_run_state",
  "source_system",
  "engine_executed",
  "manifest_ref",
  "candidate_ref",
  "validation_summary",
  "feeds",
  "blocked_uses",
  "boundary_policy",
  "required_caveats",
  "generated_at",
  "derivation_version"
]);

const ALLOWED_MANIFEST_FIELDS = new Set([
  "manifest_id",
  "source_system",
  "run_mode",
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
  "source_refs",
  "execution_policy",
  "allowed_uses",
  "blocked_uses",
  "required_caveats",
  "generated_at"
]);

const ALLOWED_MANIFEST_SOURCE_REF_FIELDS = new Set([
  "aggregate_export_ref",
  "reviewed_source_refs_hash",
  "reviewed_aggregate_context_hash",
  "reviewed_blueprint_expectation_hash"
]);

const ALLOWED_SOURCE_OWNER_ROLES: Record<string, string> = {
  bigquery_export: "customer_data_platform_owner",
  sigma_export: "customer_analytics_owner"
};

const ALLOWED_SOURCE_OWNER_ATTESTATION_FIELDS = new Set([
  "attestation_state",
  "attested_by_role",
  "attested_at",
  "caveats"
]);

const ALLOWED_MANIFEST_REF_FIELDS = new Set([
  "manifest_id",
  "source_system",
  "run_mode",
  "execution_mode",
  "source_export_ref",
  "org_id",
  "client_id",
  "measurement_plan_id",
  "workflow_family",
  "function_area",
  "cohort_key",
  "baseline_window",
  "comparison_window",
  "manifest_hash",
  "aggregate_fixture_hash",
  "reviewed_source_refs_hash",
  "reviewed_aggregate_context_hash",
  "reviewed_blueprint_expectation_hash"
]);

const ALLOWED_CANDIDATE_REF_FIELDS = new Set([
  "assembly_run_id",
  "assembly_state",
  "measurement_cell_ref",
  "selected_metric_id",
  "expectation_path_id",
  "source_package_count",
  "candidate_integrity_hash",
  "reviewed_source_refs_hash",
  "reviewed_aggregate_context_hash",
  "reviewed_blueprint_expectation_hash"
]);

const ALLOWED_VALIDATION_SUMMARY_FIELDS = new Set([
  "manifest_valid",
  "measurement_cell_candidate_valid",
  "source_package_count",
  "gaps"
]);

const ALLOWED_WINDOW_FIELDS = new Set(["window_start", "window_end"]);

const ALLOWED_FEED_FIELDS = new Set([
  "pipeline_dry_run_review",
  "source_package_review_path",
  "measurement_cell_candidate_proof",
  "live_bigquery_execution",
  "live_sigma_execution",
  "live_glean_query",
  "durable_pipeline_run_storage",
  "source_package_clearance",
  "measurement_cell_snapshot_candidate",
  "measurement_cell_snapshot",
  "measurement_cell_series_snapshot",
  "evidence_continuity_snapshot",
  "claim_readiness_snapshot",
  "executive_readout_snapshot",
  "executive_packet",
  "html_readout",
  "api_export",
  "customer_share_package",
  "reportability_readiness",
  "value_hypothesis_packet_runner",
  "finance_context_investigation",
  "finance_context_investigation_planning",
  "confidence_model",
  "confidence_model_feed",
  "confidence_percentage",
  "confidence_score",
  "probability_output",
  "contribution_probability",
  "p_value",
  "roi_output",
  "ebita_claim",
  "ebitda_claim",
  "financial_attribution",
  "causality_claim",
  "productivity_claim",
  "customer_facing_output",
  "customer_facing_financial_output",
  "customer_facing_economic_output"
]);

const TRUE_FEEDS = [
  "pipeline_dry_run_review",
  "source_package_review_path",
  "measurement_cell_candidate_proof"
];

const REQUIRED_FALSE_FEEDS = [
  "live_bigquery_execution",
  "live_sigma_execution",
  "live_glean_query",
  "durable_pipeline_run_storage",
  "source_package_clearance",
  "measurement_cell_snapshot_candidate",
  "measurement_cell_snapshot",
  "measurement_cell_series_snapshot",
  "evidence_continuity_snapshot",
  "claim_readiness_snapshot",
  "executive_readout_snapshot",
  "executive_packet",
  "html_readout",
  "api_export",
  "customer_share_package",
  "reportability_readiness",
  "value_hypothesis_packet_runner",
  "finance_context_investigation",
  "finance_context_investigation_planning",
  "confidence_model",
  "confidence_model_feed",
  "confidence_percentage",
  "confidence_score",
  "probability_output",
  "contribution_probability",
  "p_value",
  "roi_output",
  "ebita_claim",
  "ebitda_claim",
  "financial_attribution",
  "causality_claim",
  "productivity_claim",
  "customer_facing_output",
  "customer_facing_financial_output",
  "customer_facing_economic_output"
];

const REQUIRED_FALSE_BOUNDARY_FIELDS = [
  "runs_bigquery",
  "runs_sigma",
  "runs_glean_query",
  "runs_live_connectors",
  "runs_customer_connectors",
  "persists_pipeline_run",
  "creates_ingestion_jobs",
  "creates_backend_routes",
  "creates_frontend_ui",
  "stores_raw_source_data",
  "writes_output_files",
  "creates_migrations",
  "creates_prisma_schema",
  "creates_schemas",
  "creates_repositories",
  "creates_routes",
  "creates_ui",
  "computes_confidence",
  "emits_probability",
  "computes_roi",
  "emits_financial_attribution",
  "customer_facing_output",
  "customer_facing_financial_output"
];

const REQUIRED_FALSE_MANIFEST_EXECUTION_FIELDS = [
  "runs_bigquery",
  "runs_sigma",
  "runs_glean_query",
  "runs_live_connectors",
  "runs_customer_connectors",
  "stores_raw_source_data",
  "credentials_present",
  "query_text_present",
  "raw_rows_present",
  "writes_output_files",
  "persists_pipeline_run",
  "creates_ingestion_jobs"
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
  "department_ranking",
  "people_decisioning",
  "customer_facing_output",
  "customer_facing_financial_output",
  "customer_facing_economic_output",
  "confidence_model",
  "confidence_percentage",
  "confidence_score",
  "probability_output",
  "contribution_probability",
  "p_value",
  "live_bigquery_execution",
  "live_sigma_execution",
  "live_glean_query",
  "pipeline_run_storage"
];

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
  /^pipeline_run_manifest$/i,
  /^pipeline_run$/i,
  /^pipeline_run_id$/i,
  /^measurement_cell$/i,
  /^measurement_cell_series$/i,
  /^source_package_payload$/i,
  /^source_packages$/i,
  /^client_evidence_entries$/i,
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
  /realized_roi/i,
  /return_on_investment/i,
  /confidence_(?:score|percentage|percent)/i,
  /probability/i,
  /ebitda/i,
  /caus(?:al|ality)/i,
  /productivity/i
];

const DIAGNOSTIC_FORBIDDEN_VALUE_PATTERNS = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /select\s+.+\s+from/i,
  /prompt\s*:/i,
  /transcript\s*:/i,
  /confidence/i,
  /probability/i,
  /p_value/i,
  /roi/i,
  /return_on_investment/i,
  /ebita/i,
  /ebitda/i,
  /financial/i,
  /finance/i,
  /causal/i,
  /causality/i,
  /casuality/i,
  /productivity/i
];

const SAFE_SOURCE_REF_PATTERN = /^[a-z][a-z0-9_]{2,159}$/;
const HEX_64_PATTERN = /^[a-f0-9]{64}$/;

export interface BuildControlledAggregatePipelineDryRunInput {
  pipelineRunManifest: any;
  controlledMeasurementCellAssembly: any | null;
  sourceFixture?: any;
  manifestHash?: string | null;
  aggregateFixtureHash?: string | null;
  expectedReviewedSourceRefsHash?: string | null;
  expectedCandidateRef?: any;
  generatedAt?: string;
}

export interface ControlledAggregatePipelineDryRunValidationOptions {
  sourceFixture?: any;
  expectedManifestHash?: string | null;
  expectedAggregateFixtureHash?: string | null;
  expectedReviewedSourceRefsHash?: string | null;
  expectedCandidateRef?: any;
}

export interface ControlledAggregatePipelineDryRunValidationResult {
  schema_version: string;
  dry_run_id: string | null;
  source_system: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    pipeline_dry_run_review: boolean;
    source_package_review_path: boolean;
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

function stringsOf(value: any): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function requireField(value: any, path: string, gaps: string[]): void {
  if (value === undefined || value === null || value === "") {
    gaps.push(`${path} is missing`);
  }
}

function sameWindow(left: any, right: any): boolean {
  return left?.window_start === right?.window_start &&
    left?.window_end === right?.window_end;
}

function safeWindow(value: any): any {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return {
    window_start: safeManifestMetadataString(value.window_start, 40),
    window_end: safeManifestMetadataString(value.window_end, 40)
  };
}

function canonicalIdentity(sourceFixture: any): any {
  const spine = sourceFixture?.data_spine_input ?? {};
  const firstExport = Array.isArray(sourceFixture?.scrubbed_glean_exports)
    ? sourceFixture.scrubbed_glean_exports[0]
    : {};
  return {
    org_id: spine.org_id ?? firstExport?.org_id ?? null,
    client_id: spine.client_id ?? null,
    measurement_plan_id: firstExport?.measurement_plan_id ?? null,
    workflow_family: spine.workflow_family ?? null,
    function_area: spine.function_area ?? null,
    cohort_key: spine.cohort_key ?? null,
    baseline_window: spine.baseline_window ?? null,
    comparison_window: spine.comparison_window ?? firstExport?.covered_window ?? null
  };
}

function collectFixtureIdentityCompletenessGaps(sourceFixture: any): string[] {
  const identity = canonicalIdentity(sourceFixture);
  const gaps: string[] = [];
  for (const field of [
    "org_id",
    "client_id",
    "measurement_plan_id",
    "workflow_family",
    "function_area",
    "cohort_key"
  ]) {
    if (identity[field] === null || identity[field] === undefined || identity[field] === "") {
      gaps.push(`controlled aggregate fixture identity ${field} is missing`);
    }
  }
  for (const windowName of ["baseline_window", "comparison_window"]) {
    if (
      !identity[windowName] ||
      !identity[windowName].window_start ||
      !identity[windowName].window_end
    ) {
      gaps.push(`controlled aggregate fixture identity ${windowName} is incomplete`);
    }
  }
  return gaps;
}

function isSafePolicyPath(path: string[]): boolean {
  const normalized = path.map(normalizeKey);
  return normalized.includes("blocked_uses");
}

function isDiagnosticPath(path: string[]): boolean {
  const normalized = path.map(normalizeKey);
  return normalized.length >= 2 &&
    normalized[0] === "validation_summary" &&
    normalized[1] === "gaps";
}

function isFalseBoundaryFlag(path: string[], key: string, nested: any): boolean {
  if (nested !== false) return false;
  const normalizedPath = path.map(normalizeKey);
  const parent = normalizedPath[normalizedPath.length - 1] ?? "";
  const normalizedKey = normalizeKey(key);
  return parent === "feeds" ||
    parent === "boundary_policy" ||
    parent === "execution_policy" ||
    REQUIRED_FALSE_FEEDS.includes(normalizedKey) ||
    REQUIRED_FALSE_BOUNDARY_FIELDS.includes(normalizedKey) ||
    REQUIRED_FALSE_MANIFEST_EXECUTION_FIELDS.includes(normalizedKey);
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
      !isSafePolicyPath(currentPath) &&
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
    if (
      path.map(normalizeKey).includes("required_caveats") &&
      REQUIRED_CAVEATS.includes(value)
    ) {
      return values;
    }
    if (isDiagnosticPath(path)) {
      if (DIAGNOSTIC_FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))) {
        values.add(path.join(".") || "<root>");
      }
      return values;
    }
    if (
      !isSafePolicyPath(path) &&
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

function sanitizeGapsForOutput(gaps: string[]): string[] {
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

function safeManifestMetadataString(value: any, maxLength = 240): string | null {
  if (typeof value !== "string") return null;
  if (value.length === 0 || value.length > maxLength) return null;
  if (FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value) || pattern.test(normalizeKey(value)))) {
    return null;
  }
  return value;
}

function collectManifestGaps(
  manifest: any,
  sourceFixture?: any,
  expectedReviewedSourceRefsHash?: string | null
): string[] {
  const gaps: string[] = [];
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    return ["pipeline run manifest must be an object"];
  }
  for (const field of [
    "manifest_id",
    "source_system",
    "run_mode",
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
    "source_refs",
    "execution_policy",
    "allowed_uses",
    "blocked_uses",
    "required_caveats",
    "generated_at"
  ]) {
    requireField(manifest?.[field], field, gaps);
  }
  for (const field of Object.keys(manifest ?? {})) {
    if (!ALLOWED_MANIFEST_FIELDS.has(field)) {
      gaps.push(`Unsupported pipeline run manifest field: ${field}`);
    }
  }
  if (manifest?.source_system && !ALLOWED_SOURCE_SYSTEMS.has(String(manifest.source_system))) {
    gaps.push("source_system is invalid");
  }
  if (manifest?.run_mode !== "controlled_dry_run") {
    gaps.push("run_mode must be controlled_dry_run");
  }
  if (manifest?.execution_mode !== "no_live_execution") {
    gaps.push("execution_mode must be no_live_execution");
  }
  if (manifest?.owner_approval_state !== "approved") {
    gaps.push("owner_approval_state must be approved");
  }
  if (manifest?.review_state !== "clear") {
    gaps.push("review_state must be clear");
  }
  const expectedSourceOwnerRole =
    ALLOWED_SOURCE_OWNER_ROLES[String(manifest?.source_system ?? "")];
  if (
    expectedSourceOwnerRole &&
    manifest?.source_owner_role !== expectedSourceOwnerRole
  ) {
    gaps.push("source_owner_role must match the selected source_system owner role");
  }
  if (
    !manifest?.source_owner_attestation ||
    typeof manifest.source_owner_attestation !== "object" ||
    Array.isArray(manifest.source_owner_attestation)
  ) {
    gaps.push("source_owner_attestation must be an object");
  } else {
    for (const field of Object.keys(manifest.source_owner_attestation)) {
      if (!ALLOWED_SOURCE_OWNER_ATTESTATION_FIELDS.has(field)) {
        gaps.push(`Unsupported source_owner_attestation field: ${field}`);
      }
    }
  }
  if (manifest?.source_owner_attestation?.attestation_state !== "attested") {
    gaps.push("source_owner_attestation.attestation_state must be attested");
  }
  if (
    manifest?.source_owner_attestation?.attested_by_role !==
    manifest?.source_owner_role
  ) {
    gaps.push("source_owner_attestation.attested_by_role must match source_owner_role");
  }
  if (
    !safeManifestMetadataString(
      manifest?.source_owner_attestation?.attested_at,
      80
    )
  ) {
    gaps.push("source_owner_attestation.attested_at must be safe metadata");
  }
  const aggregateExportRef = manifest?.source_refs?.aggregate_export_ref;
  if (!manifest?.source_refs || typeof manifest.source_refs !== "object" || Array.isArray(manifest.source_refs)) {
    gaps.push("source_refs must be an object");
  } else {
    for (const field of Object.keys(manifest.source_refs)) {
      if (!ALLOWED_MANIFEST_SOURCE_REF_FIELDS.has(field)) {
        gaps.push(`Unsupported source_refs field: ${field}`);
      }
    }
  }
  if (!safeSourceRef(aggregateExportRef, String(manifest?.source_system ?? "bigquery_export"))) {
    gaps.push("source_refs.aggregate_export_ref must be a safe reviewed aggregate export ref for the selected source_system");
  }
  for (const field of [
    "reviewed_source_refs_hash",
    "reviewed_aggregate_context_hash",
    "reviewed_blueprint_expectation_hash"
  ]) {
    if (!HEX_64_PATTERN.test(String(manifest?.source_refs?.[field] ?? ""))) {
      gaps.push(`source_refs.${field} must be a sha256 hex string`);
    }
  }
  for (const field of REQUIRED_FALSE_MANIFEST_EXECUTION_FIELDS) {
    if (manifest?.execution_policy?.[field] !== false) {
      gaps.push(`execution_policy.${field} must be false`);
    }
  }
  for (const use of REQUIRED_BLOCKED_USES) {
    if (!stringsOf(manifest?.blocked_uses).includes(use)) {
      gaps.push(`blocked_uses missing ${use}`);
    }
  }
  if (!stringsOf(manifest?.allowed_uses).includes("controlled_pipeline_dry_run")) {
    gaps.push("allowed_uses must include controlled_pipeline_dry_run");
  }
  const identity = sourceFixture ? canonicalIdentity(sourceFixture) : null;
  if (identity) {
    gaps.push(...collectFixtureIdentityCompletenessGaps(sourceFixture));
    for (const field of [
      "org_id",
      "client_id",
      "measurement_plan_id",
      "workflow_family",
      "function_area",
      "cohort_key"
    ]) {
      if (identity[field] !== null && manifest?.[field] !== identity[field]) {
        gaps.push(`${field} must match the controlled aggregate fixture`);
      }
    }
    if (!sameWindow(manifest?.baseline_window, identity.baseline_window)) {
      gaps.push("baseline_window must match the controlled aggregate fixture");
    }
    if (!sameWindow(manifest?.comparison_window, identity.comparison_window)) {
      gaps.push("comparison_window must match the controlled aggregate fixture");
    }
    if (
      sourceFixture?.expected?.reviewed_aggregate_context_hash &&
      manifest?.source_refs?.reviewed_aggregate_context_hash !==
        sourceFixture.expected.reviewed_aggregate_context_hash
    ) {
      gaps.push("source_refs.reviewed_aggregate_context_hash must match the controlled aggregate fixture");
    }
    if (
      sourceFixture?.expected?.reviewed_blueprint_expectation_hash &&
      manifest?.source_refs?.reviewed_blueprint_expectation_hash !==
        sourceFixture.expected.reviewed_blueprint_expectation_hash
    ) {
      gaps.push("source_refs.reviewed_blueprint_expectation_hash must match the controlled aggregate fixture");
    }
  }
  if (
    expectedReviewedSourceRefsHash &&
    manifest?.source_refs?.reviewed_source_refs_hash !== expectedReviewedSourceRefsHash
  ) {
    gaps.push("source_refs.reviewed_source_refs_hash must match expected reviewed source refs hash");
  }
  for (const field of Array.from(collectForbiddenFields(manifest)).sort()) {
    gaps.push(`Forbidden field detected: ${field}`);
  }
  for (const value of Array.from(collectForbiddenValues(manifest)).sort()) {
    gaps.push(`Forbidden value detected: ${value}`);
  }
  return gaps;
}

function compactCandidateRef(candidate: any): any {
  return buildCandidateRef(candidate);
}

function collectCandidateGaps(candidate: any, expectedCandidateRef?: any): string[] {
  const gaps: string[] = [];
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return ["controlled Measurement Cell candidate is missing"];
  }
  if (!expectedCandidateRef || typeof expectedCandidateRef !== "object") {
    gaps.push("expectedCandidateRef is required for passed pipeline dry-run proof");
  }
  if (candidate?.assembly_state !== "PASSED_INTERNAL_MEASUREMENT_CELL_CANDIDATE_REVIEW") {
    gaps.push("controlled Measurement Cell candidate must have passed review");
  }
  if (candidate?.review_state !== "PASSED_INTERNAL_FIXTURE_REVIEW") {
    gaps.push("controlled Measurement Cell candidate review_state must be PASSED_INTERNAL_FIXTURE_REVIEW");
  }
  if (candidate?.engine_executed !== true) {
    gaps.push("controlled Measurement Cell candidate engine_executed must be true");
  }
  if (!HEX_64_PATTERN.test(String(candidate?.candidate_integrity_hash ?? ""))) {
    gaps.push("controlled Measurement Cell candidate integrity hash is missing or invalid");
  }
  if (!candidate?.internal_candidate_metadata?.measurement_cell_ref) {
    gaps.push("controlled Measurement Cell candidate measurement_cell_ref is missing");
  }
  if (!candidate?.internal_candidate_metadata?.expectation_path_id) {
    gaps.push("controlled Measurement Cell candidate expectation_path_id is missing");
  }
  if (Number(candidate?.internal_candidate_metadata?.source_package_count) < 1) {
    gaps.push("controlled Measurement Cell candidate source package count is missing");
  }
  if (expectedCandidateRef && typeof expectedCandidateRef === "object") {
    const actualRef = compactCandidateRef(candidate);
    for (const field of [
      "assembly_run_id",
      "assembly_state",
      "measurement_cell_ref",
      "selected_metric_id",
      "expectation_path_id",
      "source_package_count",
      "candidate_integrity_hash",
      "reviewed_source_refs_hash",
      "reviewed_aggregate_context_hash",
      "reviewed_blueprint_expectation_hash"
    ]) {
      if (actualRef?.[field] !== expectedCandidateRef?.[field]) {
        gaps.push(`controlled Measurement Cell candidate ${field} must match expected fixture-bound candidate ref`);
      }
    }
  }
  return gaps;
}

function buildManifestRef(
  manifest: any,
  manifestHash?: string | null,
  aggregateFixtureHash?: string | null
): any {
  const sourceSystem = String(manifest?.source_system ?? "bigquery_export");
  return {
    manifest_id: safeManifestMetadataString(manifest?.manifest_id),
    source_system: ALLOWED_SOURCE_SYSTEMS.has(sourceSystem) ? sourceSystem : null,
    run_mode: manifest?.run_mode === "controlled_dry_run" ? "controlled_dry_run" : null,
    execution_mode: manifest?.execution_mode === "no_live_execution" ? "no_live_execution" : null,
    source_export_ref: safeSourceRef(manifest?.source_refs?.aggregate_export_ref, sourceSystem),
    org_id: safeManifestMetadataString(manifest?.org_id),
    client_id: safeManifestMetadataString(manifest?.client_id),
    measurement_plan_id: safeManifestMetadataString(manifest?.measurement_plan_id),
    workflow_family: safeManifestMetadataString(manifest?.workflow_family),
    function_area: safeManifestMetadataString(manifest?.function_area),
    cohort_key: safeManifestMetadataString(manifest?.cohort_key),
    baseline_window: safeWindow(manifest?.baseline_window),
    comparison_window: safeWindow(manifest?.comparison_window),
    manifest_hash: HEX_64_PATTERN.test(String(manifestHash ?? "")) ? manifestHash : null,
    aggregate_fixture_hash: HEX_64_PATTERN.test(String(aggregateFixtureHash ?? ""))
      ? aggregateFixtureHash
      : null,
    reviewed_source_refs_hash: HEX_64_PATTERN.test(String(manifest?.source_refs?.reviewed_source_refs_hash ?? ""))
      ? manifest.source_refs.reviewed_source_refs_hash
      : null,
    reviewed_aggregate_context_hash: HEX_64_PATTERN.test(String(manifest?.source_refs?.reviewed_aggregate_context_hash ?? ""))
      ? manifest.source_refs.reviewed_aggregate_context_hash
      : null,
    reviewed_blueprint_expectation_hash: HEX_64_PATTERN.test(String(manifest?.source_refs?.reviewed_blueprint_expectation_hash ?? ""))
      ? manifest.source_refs.reviewed_blueprint_expectation_hash
      : null
  };
}

function buildCandidateRef(candidate: any): any {
  if (!candidate) return null;
  return {
    assembly_run_id: candidate?.assembly_ref?.assembly_run_id ?? null,
    assembly_state: candidate?.assembly_state ?? null,
    measurement_cell_ref: candidate?.assembly_ref?.measurement_cell_ref ??
      candidate?.internal_candidate_metadata?.measurement_cell_ref ??
      null,
    selected_metric_id: candidate?.internal_candidate_metadata?.selected_metric_id ?? null,
    expectation_path_id: candidate?.internal_candidate_metadata?.expectation_path_id ?? null,
    source_package_count: candidate?.internal_candidate_metadata?.source_package_count ?? null,
    candidate_integrity_hash: candidate?.candidate_integrity_hash ?? null,
    reviewed_source_refs_hash: candidate?.review_ref?.reviewed_source_refs_hash ??
      candidate?.internal_candidate_metadata?.reviewed_source_refs_hash ??
      null,
    reviewed_aggregate_context_hash: candidate?.review_ref?.reviewed_aggregate_context_hash ??
      candidate?.internal_candidate_metadata?.reviewed_aggregate_context_hash ??
      null,
    reviewed_blueprint_expectation_hash:
      candidate?.review_ref?.reviewed_blueprint_expectation_hash ??
      candidate?.internal_candidate_metadata?.reviewed_blueprint_expectation_hash ??
      null
  };
}

export function validateControlledAggregatePipelineRunManifest(
  manifest: any,
  options: { sourceFixture?: any; expectedReviewedSourceRefsHash?: string | null } = {}
): { valid: boolean; gaps: string[] } {
  const gaps = collectManifestGaps(
    manifest,
    options.sourceFixture,
    options.expectedReviewedSourceRefsHash
  );
  return {
    valid: gaps.length === 0,
    gaps
  };
}

export function buildControlledAggregatePipelineDryRun(
  input: BuildControlledAggregatePipelineDryRunInput
): any {
  const manifestValidation = validateControlledAggregatePipelineRunManifest(
    input.pipelineRunManifest,
    {
      sourceFixture: input.sourceFixture,
      expectedReviewedSourceRefsHash: input.expectedReviewedSourceRefsHash
    }
  );
  const fixtureProofGaps = input.sourceFixture
    ? []
    : ["sourceFixture is required for passed pipeline dry-run proof"];
  const candidateGaps = manifestValidation.valid
    ? [
      ...fixtureProofGaps,
      ...collectCandidateGaps(
        input.controlledMeasurementCellAssembly,
        input.expectedCandidateRef
      )
    ]
    : [];
  const passed = manifestValidation.valid && candidateGaps.length === 0;
  const sourceSystem = ALLOWED_SOURCE_SYSTEMS.has(String(input.pipelineRunManifest?.source_system))
    ? String(input.pipelineRunManifest.source_system)
    : null;
  const state = passed
    ? "PASSED_INTERNAL_PIPELINE_DRY_RUN_REVIEW"
    : manifestValidation.valid
      ? "HELD_FOR_MEASUREMENT_CELL_CANDIDATE"
      : "BLOCKED";
  const dryRunId = `controlled_aggregate_pipeline_dry_run_${safeIdPart(String(sourceSystem ?? "unknown_source"))}_${safeIdPart(String(input.pipelineRunManifest?.workflow_family ?? "unknown_workflow"))}`;

  return {
    schema_version: AI_VALUE_CONTROLLED_AGGREGATE_PIPELINE_DRY_RUN_SCHEMA_VERSION,
    dry_run_id: dryRunId,
    dry_run_state: state,
    source_system: sourceSystem,
    engine_executed: passed,
    manifest_ref: buildManifestRef(
      input.pipelineRunManifest,
      input.manifestHash,
      input.aggregateFixtureHash
    ),
    candidate_ref: passed ? buildCandidateRef(input.controlledMeasurementCellAssembly) : null,
    validation_summary: {
      manifest_valid: manifestValidation.valid,
      measurement_cell_candidate_valid: candidateGaps.length === 0 && manifestValidation.valid,
      source_package_count: passed
        ? input.controlledMeasurementCellAssembly?.internal_candidate_metadata?.source_package_count ?? 0
        : 0,
      gaps: sanitizeGapsForOutput([...manifestValidation.gaps, ...candidateGaps])
    },
    feeds: feedsForPassed(passed),
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    boundary_policy: boundaryPolicy(),
    required_caveats: [...REQUIRED_CAVEATS],
    generated_at: input.generatedAt ?? new Date(0).toISOString(),
    derivation_version: DERIVATION_VERSION
  };
}

function collectOutputShapeGaps(dryRun: any): string[] {
  const gaps: string[] = [];
  if (!dryRun || typeof dryRun !== "object" || Array.isArray(dryRun)) {
    return ["pipeline dry run must be an object"];
  }
  for (const field of [
    "schema_version",
    "dry_run_id",
    "dry_run_state",
    "source_system",
    "engine_executed",
    "manifest_ref",
    "validation_summary",
    "feeds",
    "blocked_uses",
    "boundary_policy",
    "required_caveats",
    "generated_at",
    "derivation_version"
  ]) {
    requireField(dryRun?.[field], field, gaps);
  }
  for (const field of Object.keys(dryRun ?? {})) {
    if (!ALLOWED_TOP_LEVEL_FIELDS.has(field)) {
      gaps.push(`Unsupported pipeline dry-run field: ${field}`);
    }
  }
  if (
    dryRun?.schema_version &&
    dryRun.schema_version !== AI_VALUE_CONTROLLED_AGGREGATE_PIPELINE_DRY_RUN_SCHEMA_VERSION
  ) {
    gaps.push(`schema_version is invalid: ${dryRun.schema_version}`);
  }
  if (dryRun?.dry_run_state && !ALLOWED_STATES.has(String(dryRun.dry_run_state))) {
    gaps.push(`dry_run_state is invalid: ${dryRun.dry_run_state}`);
  }
  if (dryRun?.source_system && !ALLOWED_SOURCE_SYSTEMS.has(String(dryRun.source_system))) {
    gaps.push(`source_system is invalid: ${dryRun.source_system}`);
  }
  for (const field of Object.keys(dryRun?.feeds ?? {})) {
    if (!ALLOWED_FEED_FIELDS.has(field)) {
      gaps.push(`Unsupported feeds field: ${field}`);
    }
  }
  if (dryRun?.manifest_ref && typeof dryRun.manifest_ref === "object") {
    for (const field of Object.keys(dryRun.manifest_ref)) {
      if (!ALLOWED_MANIFEST_REF_FIELDS.has(field)) {
        gaps.push(`Unsupported manifest_ref field: manifest_ref.${field}`);
      }
    }
    for (const windowName of ["baseline_window", "comparison_window"]) {
      const windowValue = dryRun.manifest_ref[windowName];
      if (windowValue !== null && windowValue !== undefined) {
        if (
          typeof windowValue !== "object" ||
          Array.isArray(windowValue)
        ) {
          gaps.push(`manifest_ref.${windowName} must be a compact window object`);
        } else {
          for (const field of Object.keys(windowValue)) {
            if (!ALLOWED_WINDOW_FIELDS.has(field)) {
              gaps.push(`Unsupported manifest_ref.${windowName} field: ${field}`);
            }
          }
        }
      }
    }
  }
  if (dryRun?.candidate_ref && typeof dryRun.candidate_ref === "object") {
    for (const field of Object.keys(dryRun.candidate_ref)) {
      if (!ALLOWED_CANDIDATE_REF_FIELDS.has(field)) {
        gaps.push(`Unsupported candidate_ref field: candidate_ref.${field}`);
      }
    }
  }
  if (dryRun?.validation_summary && typeof dryRun.validation_summary === "object") {
    for (const field of Object.keys(dryRun.validation_summary)) {
      if (!ALLOWED_VALIDATION_SUMMARY_FIELDS.has(field)) {
        gaps.push(`Unsupported validation_summary field: validation_summary.${field}`);
      }
    }
  }
  for (const field of Object.keys(dryRun?.boundary_policy ?? {})) {
    if (!REQUIRED_FALSE_BOUNDARY_FIELDS.includes(field)) {
      gaps.push(`Unsupported boundary_policy field: boundary_policy.${field}`);
    }
  }
  return gaps;
}

function sameStringArray(left: any, right: string[]): boolean {
  return Array.isArray(left) &&
    left.length === right.length &&
    left.every((value, index) => value === right[index]);
}

function collectOutputPolicyGaps(
  dryRun: any,
  options: ControlledAggregatePipelineDryRunValidationOptions
): string[] {
  const gaps: string[] = [];
  const passed = dryRun?.dry_run_state === "PASSED_INTERNAL_PIPELINE_DRY_RUN_REVIEW";
  for (const use of REQUIRED_BLOCKED_USES) {
    if (!stringsOf(dryRun?.blocked_uses).includes(use)) {
      gaps.push(`blocked_uses missing ${use}`);
    }
  }
  for (const field of REQUIRED_FALSE_BOUNDARY_FIELDS) {
    if (dryRun?.boundary_policy?.[field] !== false) {
      gaps.push(`boundary_policy.${field} must be false`);
    }
  }
  for (const field of REQUIRED_FALSE_FEEDS) {
    if (dryRun?.feeds?.[field] !== false) {
      gaps.push(`feeds.${field} must be false`);
    }
  }
  for (const field of TRUE_FEEDS) {
    if (dryRun?.feeds?.[field] !== passed) {
      gaps.push(`feeds.${field} must be ${passed}`);
    }
  }
  if (!sameStringArray(dryRun?.required_caveats, REQUIRED_CAVEATS)) {
    gaps.push("required_caveats must match the controlled dry-run caveat set exactly");
  }
  if (passed && Array.isArray(dryRun?.validation_summary?.gaps) && dryRun.validation_summary.gaps.length > 0) {
    gaps.push("validation_summary.gaps must be empty when dry_run_state is passed");
  }
  if (passed) {
    if (!options.sourceFixture) {
      gaps.push("sourceFixture is required for passed pipeline dry-run validation");
    }
    if (!options.expectedManifestHash) {
      gaps.push("expectedManifestHash is required for passed pipeline dry-run validation");
    }
    if (!options.expectedAggregateFixtureHash) {
      gaps.push("expectedAggregateFixtureHash is required for passed pipeline dry-run validation");
    }
    if (!options.expectedReviewedSourceRefsHash) {
      gaps.push("expectedReviewedSourceRefsHash is required for passed pipeline dry-run validation");
    }
    if (!options.expectedCandidateRef) {
      gaps.push("expectedCandidateRef is required for passed pipeline dry-run validation");
    }
    if (dryRun?.engine_executed !== true) {
      gaps.push("engine_executed must be true when dry_run_state is passed");
    }
    if (!dryRun?.candidate_ref) {
      gaps.push("candidate_ref is required when dry_run_state is passed");
    }
    if (!HEX_64_PATTERN.test(String(dryRun?.candidate_ref?.candidate_integrity_hash ?? ""))) {
      gaps.push("candidate_ref.candidate_integrity_hash must be a sha256 hex string");
    }
    if (!HEX_64_PATTERN.test(String(dryRun?.manifest_ref?.manifest_hash ?? ""))) {
      gaps.push("manifest_ref.manifest_hash must be a sha256 hex string");
    }
    if (!HEX_64_PATTERN.test(String(dryRun?.manifest_ref?.aggregate_fixture_hash ?? ""))) {
      gaps.push("manifest_ref.aggregate_fixture_hash must be a sha256 hex string");
    }
    if (
      options.expectedManifestHash &&
      dryRun?.manifest_ref?.manifest_hash !== options.expectedManifestHash
    ) {
      gaps.push("manifest_ref.manifest_hash must match expected pipeline run manifest hash");
    }
    if (
      options.expectedAggregateFixtureHash &&
      dryRun?.manifest_ref?.aggregate_fixture_hash !== options.expectedAggregateFixtureHash
    ) {
      gaps.push("manifest_ref.aggregate_fixture_hash must match expected controlled aggregate fixture hash");
    }
    if (
      options.expectedReviewedSourceRefsHash &&
      dryRun?.manifest_ref?.reviewed_source_refs_hash !== options.expectedReviewedSourceRefsHash
    ) {
      gaps.push("manifest_ref.reviewed_source_refs_hash must match expected reviewed source refs hash");
    }
    if (options.expectedCandidateRef) {
      for (const field of [
        "assembly_run_id",
        "assembly_state",
        "measurement_cell_ref",
        "selected_metric_id",
        "expectation_path_id",
        "source_package_count",
        "candidate_integrity_hash",
        "reviewed_source_refs_hash",
        "reviewed_aggregate_context_hash",
        "reviewed_blueprint_expectation_hash"
      ]) {
        if (dryRun?.candidate_ref?.[field] !== options.expectedCandidateRef?.[field]) {
          gaps.push(`candidate_ref.${field} must match expected fixture-bound candidate ref`);
        }
      }
    }
  }
  if (!passed && dryRun?.engine_executed !== false) {
    gaps.push("engine_executed must be false unless dry_run_state is passed");
  }
  if (dryRun?.dry_run_state !== "PASSED_INTERNAL_PIPELINE_DRY_RUN_REVIEW") {
    gaps.push(`${dryRun?.dry_run_state ?? "unknown"} dry runs do not validate as pipeline dry-run proof`);
  }
  for (const field of Array.from(collectForbiddenFields(dryRun)).sort()) {
    gaps.push(`Forbidden field detected: ${field}`);
  }
  for (const value of Array.from(collectForbiddenValues(dryRun)).sort()) {
    gaps.push(`Forbidden value detected: ${value}`);
  }
  return gaps;
}

function collectSourceFixtureBindingGaps(
  dryRun: any,
  sourceFixture?: any,
  expectedReviewedSourceRefsHash?: string | null
): string[] {
  if (!sourceFixture) return [];
  const gaps: string[] = [];
  gaps.push(...collectFixtureIdentityCompletenessGaps(sourceFixture));
  const identity = canonicalIdentity(sourceFixture);
  const ref = dryRun?.manifest_ref ?? {};
  for (const field of [
    "org_id",
    "client_id",
    "measurement_plan_id",
    "workflow_family",
    "function_area",
    "cohort_key"
  ]) {
    if (identity[field] !== null && ref[field] !== identity[field]) {
      gaps.push(`manifest_ref.${field} must match the controlled aggregate fixture`);
    }
  }
  if (!sameWindow(ref.baseline_window, identity.baseline_window)) {
    gaps.push("manifest_ref.baseline_window must match the controlled aggregate fixture");
  }
  if (!sameWindow(ref.comparison_window, identity.comparison_window)) {
    gaps.push("manifest_ref.comparison_window must match the controlled aggregate fixture");
  }
  if (
    sourceFixture?.expected?.reviewed_aggregate_context_hash &&
    ref.reviewed_aggregate_context_hash !== sourceFixture.expected.reviewed_aggregate_context_hash
  ) {
    gaps.push("manifest_ref.reviewed_aggregate_context_hash must match the controlled aggregate fixture");
  }
  if (
    sourceFixture?.expected?.reviewed_blueprint_expectation_hash &&
    ref.reviewed_blueprint_expectation_hash !== sourceFixture.expected.reviewed_blueprint_expectation_hash
  ) {
    gaps.push("manifest_ref.reviewed_blueprint_expectation_hash must match the controlled aggregate fixture");
  }
  if (
    expectedReviewedSourceRefsHash &&
    ref.reviewed_source_refs_hash !== expectedReviewedSourceRefsHash
  ) {
    gaps.push("manifest_ref.reviewed_source_refs_hash must match expected reviewed source refs hash");
  }
  return gaps;
}

export function validateControlledAggregatePipelineDryRun(
  dryRun: any,
  options: ControlledAggregatePipelineDryRunValidationOptions = {}
): ControlledAggregatePipelineDryRunValidationResult {
  const gaps = [
    ...collectOutputShapeGaps(dryRun),
    ...collectOutputPolicyGaps(dryRun, options),
    ...collectSourceFixtureBindingGaps(
      dryRun,
      options.sourceFixture,
      options.expectedReviewedSourceRefsHash
    )
  ];
  const valid = gaps.length === 0;
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    dry_run_id: dryRun?.dry_run_id ?? null,
    source_system: dryRun?.source_system ?? null,
    valid,
    gaps,
    feeds: {
      pipeline_dry_run_review: valid && dryRun?.feeds?.pipeline_dry_run_review === true,
      source_package_review_path: valid && dryRun?.feeds?.source_package_review_path === true,
      measurement_cell_candidate_proof:
        valid && dryRun?.feeds?.measurement_cell_candidate_proof === true,
      customer_facing_financial_output: false
    }
  };
}
