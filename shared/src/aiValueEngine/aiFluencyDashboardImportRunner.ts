/**
 * AI Value Engine - AI Fluency Dashboard Import Runner.
 *
 * Batch runner for already-parsed aggregate AI Fluency dashboard exports. It
 * turns approved function/workflow rows into AI Fluency client import objects
 * and Data Spine source candidates. It does not parse files, collect
 * individual instruments, persist data, create routes/UI, rank people or
 * teams, compute ROI, prove causality, or create financial/probability output.
 */

import {
  buildAIFluencyClientImport,
  validateAIFluencyClientImport
} from "./aiFluencyClientImport";

export const AI_VALUE_AI_FLUENCY_DASHBOARD_IMPORT_RUN_SCHEMA_VERSION =
  "FT_AI_VALUE_AI_FLUENCY_DASHBOARD_IMPORT_RUN_2026_06";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_AI_FLUENCY_DASHBOARD_IMPORT_RUN_VALIDATION_2026_06";

const DERIVATION_VERSION =
  "ai_value_ai_fluency_dashboard_import_runner_2026_06";

const MIN_IMPORTABLE_RESPONSE_COUNT = 20;
const EXPECTED_K_MIN_POSTURE = "k_min_20_function_level";

const REQUIRED_FALSE_BOUNDARY_FIELDS = [
  "persists_output",
  "creates_migrations",
  "creates_prisma_schema",
  "creates_backend_routes",
  "creates_frontend_ui",
  "parses_uploaded_files",
  "collects_individual_instruments",
  "contains_person_level_results",
  "contains_direct_identifiers",
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
  "individual_attribution",
  "individual_scoring",
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
  /raw_(?:prompt|response|transcript|content|file|export|event|row)/i,
  /prompt/i,
  /^answers?$/i,
  /answer_text/i,
  /response_text/i,
  /transcript/i,
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
  /respondent_id/i,
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
  /^persistence_table$/i
];

const SOURCE_ALIGNMENT_KEYS = [
  "org_id",
  "client_id",
  "dashboard_export_id",
  "instrument_id",
  "instrument_version",
  "baseline_window_start",
  "baseline_window_end",
  "comparison_window_start",
  "comparison_window_end"
];

const ORGANIZATION_OVERALL_ALIASES = new Set([
  "organization_overall",
  "organization",
  "org_overall",
  "overall",
  "all_functions",
  "all_function",
  "all_approved_responses"
]);

const SUPPRESSED_SMALL_COHORT_ALIASES = new Set([
  "suppressed_small_cohort_group",
  "suppressed_small_cohort",
  "suppressed_cohort_group"
]);

const EMAIL_VALUE_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

const DIRECT_IDENTIFIER_VALUE_PATTERN =
  /\b(?:respondent|employee|user|person)(?:[_:/-](?:id[_:/-]?)?)?[0-9a-f]{3,}\b/i;

const GOVERNED_KEY_ALLOWLIST = new Set([
  "blocked_uses",
  "boundary_policy",
  "governance_posture",
  ...REQUIRED_FALSE_BOUNDARY_FIELDS
]);

const SAFE_FALSE_POLICY_CONTAINERS = new Set([
  "boundary_policy",
  "feeds",
  "governance"
]);

function isSafeGovernancePostureField(path: string[], key: string): boolean {
  return path.map(normalizeKey).includes("governance_posture") &&
    [
      "aggregate_only",
      "token_usage_included",
      "excludes_individual_responses",
      "excludes_employee_names",
      "excludes_emails",
      "excludes_user_ids",
      "excludes_manager_or_team_rankings",
      "excludes_raw_text_responses",
      "excludes_roi_claims",
      "excludes_productivity_claims",
      "excludes_causality_claims",
      "excludes_financial_attribution"
    ].includes(normalizeKey(key));
}

export interface BuildAIFluencyDashboardImportRunInput {
  dashboardExport: any;
  runId?: string;
  generatedAt?: string;
}

export interface AIFluencyDashboardImportRunValidationResult {
  schema_version: string;
  run_id: string | null;
  org_id: string | null;
  client_id: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    ai_fluency_client_imports: boolean;
    data_spine_ai_fluency_sources: boolean;
    measurement_cell_input: false;
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
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function score100ToMean5(value: any): number | null {
  const score = numberOrNull(value);
  if (score === null) return null;
  return round2(score / 20);
}

function boundaryPolicy(): Record<string, false> {
  return Object.fromEntries(
    REQUIRED_FALSE_BOUNDARY_FIELDS.map((field) => [field, false])
  ) as Record<string, false>;
}

function collectForbiddenFields(
  value: any,
  fields: Set<string> = new Set(),
  path: string[] = []
): Set<string> {
  if (!value || typeof value !== "object") return fields;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectForbiddenFields(item, fields, [...path, String(index)])
    );
    return fields;
  }
  for (const [key, nested] of Object.entries(value)) {
    const normalized = normalizeKey(key);
    const currentPath = [...path, key];
    const isSafeFalsePolicyFlag = nested === false &&
      currentPath.some((part) => SAFE_FALSE_POLICY_CONTAINERS.has(normalizeKey(part)));
    if (
      !isSafeFalsePolicyFlag &&
      !isSafeGovernancePostureField(currentPath, key) &&
      !GOVERNED_KEY_ALLOWLIST.has(normalized) &&
      FORBIDDEN_FIELD_PATTERNS.some((pattern) => pattern.test(key) || pattern.test(normalized))
    ) {
      fields.add(currentPath.join("."));
    }
    collectForbiddenFields(nested, fields, currentPath);
  }
  return fields;
}

function collectForbiddenValues(
  value: any,
  fields: Set<string> = new Set(),
  path: string[] = []
): Set<string> {
  if (typeof value === "string") {
    if (EMAIL_VALUE_PATTERN.test(value) || DIRECT_IDENTIFIER_VALUE_PATTERN.test(value)) {
      fields.add(path.join(".") || "value");
    }
    return fields;
  }
  if (!value || typeof value !== "object") return fields;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectForbiddenValues(item, fields, [...path, String(index)])
    );
    return fields;
  }
  for (const [key, nested] of Object.entries(value)) {
    collectForbiddenValues(nested, fields, [...path, key]);
  }
  return fields;
}

function sourceAlignmentGaps(records: any[]): string[] {
  const gaps: string[] = [];
  for (const key of SOURCE_ALIGNMENT_KEYS) {
    records.forEach((record, index) => {
      if (
        record?.[key] === undefined ||
        record?.[key] === null ||
        record?.[key] === ""
      ) {
        gaps.push(`records[${index}].${key} is missing`);
      }
    });
    const values = new Set(
      records
        .map((record) => record?.[key])
        .filter((value) => value !== undefined && value !== null && value !== "")
        .map((value) => String(value))
    );
    if (values.size > 1) {
      gaps.push(`records.${key} must not mix values`);
    }
  }
  return gaps;
}

function kMinPostureGaps(records: any[]): string[] {
  const gaps: string[] = [];
  records.forEach((record, index) => {
    if (String(record?.k_min_posture ?? "") !== EXPECTED_K_MIN_POSTURE) {
      gaps.push(`records[${index}].k_min_posture must be ${EXPECTED_K_MIN_POSTURE}`);
    }
  });
  return gaps;
}

function governancePostureGaps(exportObject: any): string[] {
  const gaps: string[] = [];
  const posture = exportObject?.governance_posture ?? {};
  for (const flag of [
    "aggregate_only",
    "excludes_individual_responses",
    "excludes_employee_names",
    "excludes_emails",
    "excludes_user_ids",
    "excludes_manager_or_team_rankings",
    "excludes_raw_text_responses",
    "excludes_roi_claims",
    "excludes_productivity_claims",
    "excludes_causality_claims",
    "excludes_financial_attribution"
  ]) {
    if (posture[flag] !== true) {
      gaps.push(`governance_posture.${flag} must be true`);
    }
  }
  if (posture.token_usage_included !== false) {
    gaps.push("governance_posture.token_usage_included must be false");
  }
  return gaps;
}

function normalizedOwnerApprovalState(value: any): string {
  const normalized = normalizeKey(String(value ?? "missing"));
  if (normalized === "pending") return "submitted";
  if (["approved", "submitted", "missing", "rejected", "held"].includes(normalized)) {
    return normalized;
  }
  return "missing";
}

function normalizedReviewState(value: any): string {
  const normalized = normalizeKey(String(value ?? "needs_review"));
  if (normalized === "approved_for_import" || normalized === "approved") return "clear";
  if (normalized.startsWith("held_suppressed") || normalized === "suppressed") {
    return "suppressed";
  }
  if (normalized.startsWith("held") || normalized === "pending") return "held";
  if (["clear", "needs_review", "held", "suppressed", "blocked"].includes(normalized)) {
    return normalized;
  }
  return "needs_review";
}

function rowIsSuppressed(record: any): boolean {
  const suppression = normalizeKey(String(record?.suppression_state ?? "none"));
  const review = normalizedReviewState(record?.review_state);
  const responseCount = numberOrNull(record?.response_count) ?? 0;
  const functionArea = normalizeKey(String(record?.function_area ?? ""));
  const cohortKey = normalizeKey(String(record?.cohort_key ?? ""));
  return suppression.startsWith("suppressed") ||
    review === "suppressed" ||
    SUPPRESSED_SMALL_COHORT_ALIASES.has(functionArea) ||
    SUPPRESSED_SMALL_COHORT_ALIASES.has(cohortKey) ||
    responseCount < MIN_IMPORTABLE_RESPONSE_COUNT;
}

function rowHasClearSuppressionState(record: any): boolean {
  return normalizeKey(String(record?.suppression_state ?? "none")) === "none";
}

function rowIsOrganizationOverall(record: any): boolean {
  const functionArea = normalizeKey(String(record?.function_area ?? ""));
  const cohortKey = normalizeKey(String(record?.cohort_key ?? ""));
  return ORGANIZATION_OVERALL_ALIASES.has(functionArea) ||
    cohortKey === "all_approved_responses";
}

function constructScores(record: any, suppressed: boolean): any {
  if (suppressed) return {};
  return {
    confidence: { mean: score100ToMean5(record?.confidence_score) },
    usage_quality: { mean: score100ToMean5(record?.usage_quality_score) },
    behavior_change: { mean: score100ToMean5(record?.behavior_change_score) },
    leadership_reinforcement: {
      mean: score100ToMean5(record?.leadership_reinforcement_score)
    },
    capability_growth: { mean: score100ToMean5(record?.capability_growth_score) }
  };
}

function instrumentIdForBaseline(record: any): string {
  const instrumentId = String(record?.instrument_id ?? "");
  if (instrumentId === "ai-fluency-instrument-24") return "ai_fluency_long_v1";
  if (instrumentId === "ai_fluency_instrument_24") return "ai_fluency_long_v1";
  return instrumentId || "ai_fluency_long_v1";
}

function collectionModeForBaseline(record: any): string {
  const mode = normalizeKey(String(record?.collection_mode ?? ""));
  if (mode === "kickoff" || mode === "followup") return mode;
  return record?.comparison_window_start && record?.comparison_window_end
    ? "followup"
    : "kickoff";
}

function clientImportInputForRecord(record: any, index: number, generatedAt?: string): any {
  const suppressed = rowIsSuppressed(record);
  const reviewState = normalizedReviewState(record?.review_state);
  const organizationOverall = rowIsOrganizationOverall(record);
  const functionId = safeIdPart(String(record?.function_area ?? `function_${index}`));
  const dashboardExportId = String(record?.dashboard_export_id ?? "missing_dashboard_export");
  return {
    importId:
      `ai_fluency_client_import_${safeIdPart(String(record?.org_id ?? "org"))}_${safeIdPart(dashboardExportId)}_${functionId}`,
    orgId: String(record?.org_id ?? ""),
    clientId: String(record?.client_id ?? ""),
    dashboardExportId,
    sourceRef: record?.source_ref ?? dashboardExportId,
    instrumentId: instrumentIdForBaseline(record),
    collectionMode: collectionModeForBaseline(record),
    workflowFamily: String(record?.workflow_family ?? ""),
    functionArea: String(record?.function_area ?? ""),
    cohortKey: String(record?.cohort_key ?? ""),
    baselineWindow: {
      window_start: record?.baseline_window_start ?? null,
      window_end: record?.baseline_window_end ?? null
    },
    comparisonWindow: {
      window_start: record?.comparison_window_start ?? null,
      window_end: record?.comparison_window_end ?? null
    },
    exportWindow: {
      window_start: record?.comparison_window_start ?? record?.baseline_window_start ?? null,
      window_end: record?.comparison_window_end ?? record?.baseline_window_end ?? null
    },
    ownerApprovalState: normalizedOwnerApprovalState(record?.owner_approval_state),
    reviewState: organizationOverall
      ? "held"
      : !suppressed && !rowHasClearSuppressionState(record)
      ? "held"
      : reviewState,
    cohorts: [
      {
        cohort_id:
          `ai_fluency_${safeIdPart(String(record?.cohort_key ?? "cohort"))}_${functionId}`,
        cohort_label: String(record?.function_area ?? `Function ${index + 1}`),
        cohort_key: record?.cohort_key,
        function_area: record?.function_area,
        workflow_family: record?.workflow_family,
        respondent_count: numberOrNull(record?.response_count) ?? 0,
        suppressed,
        construct_scores: constructScores(record, suppressed)
      }
    ],
    generatedAt
  };
}

function decisionFor(
  clientImport: any,
  valid: boolean,
  runLevelBlocked = false
): "IMPORTED" | "HELD" | "SUPPRESSED" | "BLOCKED" {
  if (runLevelBlocked) return "BLOCKED";
  if (!valid) return "BLOCKED";
  if (clientImport?.data_spine_source?.state === "present") return "IMPORTED";
  if (clientImport?.data_spine_source?.state === "suppressed") return "SUPPRESSED";
  return "HELD";
}

function applyRunLevelBlock(clientImport: any): void {
  if (clientImport?.data_spine_source) {
    clientImport.data_spine_source.state = "held";
  }
  if (clientImport?.feeds) {
    clientImport.feeds.fluency_baseline = false;
    clientImport.feeds.data_spine_ai_fluency_source = false;
    clientImport.feeds.measurement_cell_input = false;
    clientImport.feeds.customer_facing_financial_output = false;
  }
}

function rowResult(
  record: any,
  index: number,
  generatedAt?: string,
  runLevelBlocked = false
): any {
  const clientImport = buildAIFluencyClientImport(
    clientImportInputForRecord(record, index, generatedAt)
  );
  if (runLevelBlocked) {
    applyRunLevelBlock(clientImport);
  }
  const validation = validateAIFluencyClientImport(clientImport);
  const decision = decisionFor(clientImport, validation.valid, runLevelBlocked);
  return {
    row_index: index,
    source_ref: record?.source_ref ?? null,
    function_area: record?.function_area ?? null,
    workflow_family: record?.workflow_family ?? null,
    cohort_key: record?.cohort_key ?? null,
    decision,
    input_review_state: record?.review_state ?? null,
    normalized_review_state: clientImport.review_state,
    input_owner_approval_state: record?.owner_approval_state ?? null,
    normalized_owner_approval_state: clientImport.owner_approval_state,
    run_level_blocked: runLevelBlocked,
    movement_summary: {
      baseline_overall_ai_fluency_score:
        numberOrNull(record?.baseline_overall_ai_fluency_score),
      comparison_overall_ai_fluency_score:
        numberOrNull(record?.comparison_overall_ai_fluency_score),
      movement_delta: numberOrNull(record?.movement_delta),
      movement_direction: record?.movement_direction ?? null,
      interpretation_boundary:
        "AI Fluency movement is descriptive readiness context only, not ROI, causality, productivity, financial attribution, confidence percentage, or probability output."
    },
    client_import_validation: validation,
    client_import: clientImport
  };
}

function summarizeRows(rowResults: any[]): any {
  return {
    total_records: rowResults.length,
    imported_count: rowResults.filter((row) => row.decision === "IMPORTED").length,
    held_count: rowResults.filter((row) => row.decision === "HELD").length,
    suppressed_count: rowResults.filter((row) => row.decision === "SUPPRESSED").length,
    blocked_count: rowResults.filter((row) => row.decision === "BLOCKED").length
  };
}

function firstString(values: any[], key: string): string | null {
  const value = values.find((item) => typeof item?.[key] === "string")?.[key];
  return typeof value === "string" ? value : null;
}

export function buildAIFluencyDashboardImportRun(
  input: BuildAIFluencyDashboardImportRunInput
): any {
  const records = Array.isArray(input.dashboardExport?.records)
    ? input.dashboardExport.records
    : [];
  const inputGaps = [
    ...governancePostureGaps(input.dashboardExport),
    ...sourceAlignmentGaps(records),
    ...kMinPostureGaps(records),
    ...[...collectForbiddenFields(input.dashboardExport)].sort().map((field) =>
      `Forbidden field detected: dashboardExport.${field}`
    ),
    ...[...collectForbiddenValues(input.dashboardExport)].sort().map((field) =>
      `Unsafe identifier value detected: dashboardExport.${field}`
    )
  ];
  const runLevelBlocked = inputGaps.length > 0;
  const rowResults = records.map((record: any, index: number) =>
    rowResult(record, index, input.generatedAt, runLevelBlocked)
  );
  const summary = summarizeRows(rowResults);
  const feedableSources = rowResults
    .filter((row: any) => row.decision === "IMPORTED")
    .map((row: any) => row.client_import.data_spine_source);
  return {
    schema_version: AI_VALUE_AI_FLUENCY_DASHBOARD_IMPORT_RUN_SCHEMA_VERSION,
    run_id: input.runId ??
      `ai_fluency_dashboard_import_run_${safeIdPart(firstString(records, "org_id") ?? "org")}_${safeIdPart(firstString(records, "dashboard_export_id") ?? "dashboard")}`,
    source_posture: "already_parsed_aggregate_dashboard_export",
    export_type: input.dashboardExport?.export_type ?? null,
    dashboard_export_id: firstString(records, "dashboard_export_id"),
    org_id: firstString(records, "org_id"),
    client_id: firstString(records, "client_id"),
    input_gaps: inputGaps,
    summary,
    row_results: rowResults,
    feedable_data_spine_sources: feedableSources,
    feeds: {
      ai_fluency_client_imports: summary.imported_count > 0,
      data_spine_ai_fluency_sources: summary.imported_count > 0,
      measurement_cell_input: false,
      customer_facing_financial_output: false
    },
    allowed_uses: [
      "aggregate_ai_fluency_dashboard_import_review",
      "ai_fluency_client_import_preparation",
      "data_spine_ai_fluency_source_preparation"
    ],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    boundary_policy: boundaryPolicy(),
    required_caveats: [
      "AI Fluency Dashboard Import Runner accepts already-parsed aggregate rows only; CSV, spreadsheet, or dashboard file parsing is upstream.",
      "Only approved, clear, non-suppressed rows at or above the minimum response count can feed Data Spine AI Fluency sources.",
      "Held or suppressed rows remain review context only and cannot feed Measurement Cell or finance-context readiness.",
      "AI Fluency movement is descriptive readiness context only, not ROI, causality, productivity, financial attribution, confidence percentage, probability, or customer-facing financial output."
    ],
    generated_at: input.generatedAt ?? new Date(0).toISOString(),
    derivation_version: DERIVATION_VERSION
  };
}

function recomputeFeeds(run: any, valid: boolean): AIFluencyDashboardImportRunValidationResult["feeds"] {
  const importedCount = Array.isArray(run?.row_results)
    ? run.row_results.filter((row: any) => row?.decision === "IMPORTED").length
    : 0;
  return {
    ai_fluency_client_imports: valid && importedCount > 0,
    data_spine_ai_fluency_sources: valid && importedCount > 0,
    measurement_cell_input: false,
    customer_facing_financial_output: false
  };
}

export function validateAIFluencyDashboardImportRun(
  run: any
): AIFluencyDashboardImportRunValidationResult {
  const gaps: string[] = [];
  for (const field of [
    "schema_version",
    "run_id",
    "source_posture",
    "export_type",
    "dashboard_export_id",
    "org_id",
    "client_id",
    "input_gaps",
    "summary",
    "row_results",
    "feedable_data_spine_sources",
    "feeds",
    "allowed_uses",
    "blocked_uses",
    "boundary_policy",
    "required_caveats",
    "generated_at",
    "derivation_version"
  ]) {
    requireField(run?.[field], field, gaps);
  }
  if (
    run?.schema_version &&
    run.schema_version !== AI_VALUE_AI_FLUENCY_DASHBOARD_IMPORT_RUN_SCHEMA_VERSION
  ) {
    gaps.push(`schema_version is invalid: ${run.schema_version}`);
  }
  if (run?.source_posture !== "already_parsed_aggregate_dashboard_export") {
    gaps.push("source_posture must be already_parsed_aggregate_dashboard_export");
  }
  if (run?.export_type !== "aggregate_ai_fluency_dashboard_export") {
    gaps.push("export_type must be aggregate_ai_fluency_dashboard_export");
  }
  if (Array.isArray(run?.input_gaps) && run.input_gaps.length > 0) {
    gaps.push(...run.input_gaps);
  }
  const rowResults = Array.isArray(run?.row_results) ? run.row_results : [];
  const summary = summarizeRows(rowResults);
  for (const [key, value] of Object.entries(summary)) {
    if (run?.summary?.[key] !== value) {
      gaps.push(`summary.${key} must match row_results`);
    }
  }
  const feedableSources = rowResults
    .filter((row: any) => row?.decision === "IMPORTED")
    .map((row: any) => row?.client_import?.data_spine_source);
  if (JSON.stringify(run?.feedable_data_spine_sources ?? []) !== JSON.stringify(feedableSources)) {
    gaps.push("feedable_data_spine_sources must match imported row Data Spine sources");
  }
  for (const [index, row] of rowResults.entries()) {
    const validation = validateAIFluencyClientImport(row?.client_import);
    if (!validation.valid) {
      gaps.push(`row_results[${index}].client_import is invalid: ${validation.gaps.join("; ")}`);
    }
    if (row?.decision !== decisionFor(row?.client_import, validation.valid, row?.run_level_blocked)) {
      gaps.push(`row_results[${index}].decision must match client import validation and feed state`);
    }
  }
  if (run?.feeds?.measurement_cell_input !== false) {
    gaps.push("feeds.measurement_cell_input must be false");
  }
  if (run?.feeds?.customer_facing_financial_output !== false) {
    gaps.push("feeds.customer_facing_financial_output must be false");
  }
  for (const use of REQUIRED_BLOCKED_USES) {
    if (!stringsOf(run?.blocked_uses).includes(use)) {
      gaps.push(`blocked_uses missing ${use}`);
    }
  }
  for (const flag of REQUIRED_FALSE_BOUNDARY_FIELDS) {
    if (run?.boundary_policy?.[flag] !== false) {
      gaps.push(`boundary_policy.${flag} must be false`);
    }
  }
  for (const field of [...collectForbiddenFields(run)].sort()) {
    gaps.push(`Forbidden field detected: ${field}`);
  }
  const valid = gaps.length === 0;
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    run_id: run?.run_id ?? null,
    org_id: run?.org_id ?? null,
    client_id: run?.client_id ?? null,
    valid,
    gaps,
    feeds: recomputeFeeds(run, valid)
  };
}
