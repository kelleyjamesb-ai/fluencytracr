/**
 * AI Value Engine - AI Fluency Aggregate Export Parser.
 *
 * Parser/adapter for already-exported Google Sheets Aggregate Readiness Export
 * CSV or already-structured JSON. It emits the existing Dashboard Import Runner
 * input shape only. It does not collect workbook source rows, persist output,
 * create routes/UI/schemas, or infer financial, causal, productivity,
 * probability, confidence-percentage, or person-level evidence.
 */

export const AI_VALUE_AI_FLUENCY_AGGREGATE_EXPORT_PARSER_SCHEMA_VERSION =
  "FT_AI_VALUE_AI_FLUENCY_AGGREGATE_EXPORT_PARSER_2026_06";

export const AI_VALUE_AI_FLUENCY_AGGREGATE_EXPORT_PARSE_RUN_SCHEMA_VERSION =
  "FT_AI_VALUE_AI_FLUENCY_AGGREGATE_EXPORT_PARSE_RUN_2026_06";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_AI_FLUENCY_AGGREGATE_EXPORT_PARSE_RUN_VALIDATION_2026_06";

const DERIVATION_VERSION =
  "ai_value_ai_fluency_aggregate_export_parser_2026_06";

const EXPORT_TYPE = "aggregate_ai_fluency_dashboard_export";

const DEFAULT_GOVERNANCE_POSTURE = {
  aggregate_only: true,
  excludes_individual_responses: true,
  excludes_employee_names: true,
  excludes_emails: true,
  excludes_user_ids: true,
  excludes_manager_or_team_rankings: true,
  excludes_raw_text_responses: true,
  excludes_roi_claims: true,
  excludes_productivity_claims: true,
  excludes_causality_claims: true,
  excludes_financial_attribution: true,
  token_usage_included: false
};

const ALLOWED_TOP_LEVEL_FIELDS = new Set([
  "export_type",
  "governance_posture",
  "records"
]);

const ALLOWED_GOVERNANCE_POSTURE_FIELDS = new Set(
  Object.keys(DEFAULT_GOVERNANCE_POSTURE)
);

const AGGREGATE_EXPORT_HEADERS = [
  "client_id",
  "org_id",
  "instrument_id",
  "instrument_version",
  "collection_mode",
  "dashboard_export_id",
  "baseline_window_start",
  "baseline_window_end",
  "comparison_window_start",
  "comparison_window_end",
  "function_area",
  "workflow_family",
  "cohort_key",
  "eligible_population_count",
  "response_count",
  "response_rate",
  "suppression_state",
  "k_min_posture",
  "overall_ai_fluency_score",
  "confidence_score",
  "usage_quality_score",
  "behavior_change_score",
  "leadership_reinforcement_score",
  "capability_growth_score",
  "baseline_overall_ai_fluency_score",
  "comparison_overall_ai_fluency_score",
  "movement_delta",
  "movement_direction",
  "source_ref",
  "source_owner_role",
  "owner_approval_state",
  "review_state",
  "caveats"
];

const ALLOWED_RECORD_FIELDS = new Set(AGGREGATE_EXPORT_HEADERS);

const NUMERIC_FIELDS = new Set([
  "eligible_population_count",
  "response_count",
  "response_rate",
  "overall_ai_fluency_score",
  "confidence_score",
  "usage_quality_score",
  "behavior_change_score",
  "leadership_reinforcement_score",
  "capability_growth_score",
  "baseline_overall_ai_fluency_score",
  "comparison_overall_ai_fluency_score",
  "movement_delta"
]);

const SOURCE_DERIVED_VALUE_FIELDS = new Set([
  "client_id",
  "org_id",
  "function_area",
  "workflow_family",
  "cohort_key",
  "source_ref"
]);

const REQUIRED_RECORD_VALUE_FIELDS = [
  "client_id",
  "org_id",
  "instrument_id",
  "instrument_version",
  "collection_mode",
  "dashboard_export_id",
  "baseline_window_start",
  "baseline_window_end",
  "comparison_window_start",
  "comparison_window_end",
  "function_area",
  "workflow_family",
  "cohort_key",
  "response_count",
  "suppression_state",
  "k_min_posture",
  "source_ref",
  "source_owner_role",
  "owner_approval_state",
  "review_state"
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

const EMAIL_VALUE_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

const DIRECT_IDENTIFIER_VALUE_PATTERN =
  /\b(?:respondent|employee|user|person)(?:[_:/-](?:id[_:/-]?)?)?[0-9a-f]{3,}\b/i;

const UNSAFE_VALUE_PATTERNS = [
  EMAIL_VALUE_PATTERN,
  DIRECT_IDENTIFIER_VALUE_PATTERN,
  /\braw\s+(?:answer|answers|response|responses|rows?|text|transcript|prompt|prompts|output|outputs)\b/i,
  /\b(?:confidence\s*(?:percentage|percent)|probability|contribution\s*(?:probability|likelihood))\b/i,
  /\b(?:proves?|proven|realized|attributed|attribution)\s+(?:roi|ebita|ebitda|financial|causal|causality|productivity)\b/i,
  /\b(?:roi|ebita|ebitda|financial attribution|customer-facing financial output)\s+(?:is|was|=|:|\$|\d)/i,
  /\b(?:productivity|causality|causal impact)\s+(?:is|was|improved|increased|proved|proven|attributed|measured)\b/i,
  /\b(?:backend\s*routes?|frontend\s*ui|persistence\s*table|prisma\s*schema|database\s*migration|api\s*route)\b/i,
  /\/api\//i
];

const UNSAFE_SOURCE_DERIVED_VALUE_PATTERN =
  /\b(?:roi|ebita|ebitda|financial attribution|financial output)\b/i;

const REQUIRED_FALSE_BOUNDARY_FIELDS = [
  "persists_output",
  "creates_migrations",
  "creates_prisma_schema",
  "creates_backend_routes",
  "creates_frontend_ui",
  "parses_source_workbook_tabs",
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

export interface AIFluencyAggregateExportParserInputObject {
  export_type?: string;
  governance_posture?: Record<string, any>;
  records?: any[];
}

export type AIFluencyAggregateExportParserInput =
  | string
  | any[]
  | AIFluencyAggregateExportParserInputObject;

export interface BuildAIFluencyAggregateExportParseRunInput {
  sourceType: "csv" | "json";
  sourceText?: string;
  sourceObject?: AIFluencyAggregateExportParserInputObject | any[];
  parseId?: string;
  generatedAt?: string;
}

export interface AIFluencyAggregateExportParseRunValidationResult {
  schema_version: string;
  parse_id: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    dashboard_import_runner: boolean;
    measurement_cell_input: false;
    customer_facing_financial_output: false;
  };
}

export class AIFluencyAggregateExportParserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIFluencyAggregateExportParserError";
  }
}

function parserError(message: string): never {
  throw new AIFluencyAggregateExportParserError(message);
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

function normalizeKey(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function hasUnsafeValue(value: string): boolean {
  return UNSAFE_VALUE_PATTERNS.some((pattern) => pattern.test(value));
}

function assertSafeValue(value: any, path: string): void {
  if (typeof value === "string" && hasUnsafeValue(value)) {
    parserError(`Unsafe aggregate export value at ${path}`);
  }
}

function collectUnsafeValues(
  value: any,
  fields: Set<string> = new Set(),
  path: string[] = []
): Set<string> {
  if (typeof value === "string") {
    if (hasUnsafeValue(value)) {
      fields.add(path.join(".") || "value");
    }
    return fields;
  }
  if (!value || typeof value !== "object") return fields;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectUnsafeValues(item, fields, [...path, String(index)])
    );
    return fields;
  }
  for (const [key, nested] of Object.entries(value)) {
    collectUnsafeValues(nested, fields, [...path, key]);
  }
  return fields;
}

function normalizeNumericValue(value: any, path: string): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    parserError(`Invalid numeric aggregate export value at ${path}`);
  }
  return numeric;
}

function normalizeStringValue(value: any, path: string): string {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  assertSafeValue(text, path);
  const pathParts = path.split(".");
  const fieldName = pathParts[pathParts.length - 1] ?? "";
  if (
    SOURCE_DERIVED_VALUE_FIELDS.has(fieldName) &&
    UNSAFE_SOURCE_DERIVED_VALUE_PATTERN.test(text)
  ) {
    parserError(`Unsafe aggregate export value at ${path}`);
  }
  return text;
}

function isMissingRecordValue(value: any): boolean {
  return value === null || value === undefined || value === "";
}

function canonicalizeFunctionArea(functionArea: any, cohortKey: any): string {
  const normalizedFunction = normalizeKey(String(functionArea ?? ""));
  const normalizedCohort = normalizeKey(String(cohortKey ?? ""));
  if (
    ORGANIZATION_OVERALL_ALIASES.has(normalizedFunction) ||
    normalizedCohort === "all_approved_responses"
  ) {
    return "Organization Overall";
  }
  return String(functionArea ?? "");
}

function normalizeRecord(record: any, index: number): any {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    parserError(`records[${index}] must be an aggregate export object`);
  }
  const output: Record<string, any> = {};
  for (const key of Object.keys(record)) {
    if (!ALLOWED_RECORD_FIELDS.has(key)) {
      parserError(`Unsupported aggregate export field: records[${index}].${key}`);
    }
  }
  for (const header of AGGREGATE_EXPORT_HEADERS) {
    const path = `records[${index}].${header}`;
    output[header] = NUMERIC_FIELDS.has(header)
      ? normalizeNumericValue(record[header], path)
      : normalizeStringValue(record[header], path);
  }
  output.function_area = canonicalizeFunctionArea(
    output.function_area,
    output.cohort_key
  );
  const missing = REQUIRED_RECORD_VALUE_FIELDS
    .filter((field) => isMissingRecordValue(output[field]))
    .map((field) => `records[${index}].${field} is missing`);
  if (missing.length > 0) {
    parserError(missing.join("; "));
  }
  return output;
}

function normalizeGovernancePosture(posture: any): any {
  if (posture === undefined || posture === null) {
    return { ...DEFAULT_GOVERNANCE_POSTURE };
  }
  if (typeof posture !== "object" || Array.isArray(posture)) {
    parserError("governance_posture must be an object");
  }
  for (const key of Object.keys(posture)) {
    if (!ALLOWED_GOVERNANCE_POSTURE_FIELDS.has(key)) {
      parserError(`Unsupported aggregate export governance posture field: ${key}`);
    }
    assertSafeValue(String(posture[key]), `governance_posture.${key}`);
  }
  return {
    ...DEFAULT_GOVERNANCE_POSTURE,
    ...posture
  };
}

function boundaryPolicy(): Record<string, false> {
  return Object.fromEntries(
    REQUIRED_FALSE_BOUNDARY_FIELDS.map((field) => [field, false])
  ) as Record<string, false>;
}

function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  let index = 0;
  const text = csvText.replace(/^\uFEFF/, "");

  while (index < text.length) {
    const char = text[index];
    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 2;
          continue;
        }
        inQuotes = false;
        index += 1;
        continue;
      }
      cell += char;
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      index += 1;
      continue;
    }
    if (char === ",") {
      row.push(cell);
      cell = "";
      index += 1;
      continue;
    }
    if (char === "\n" || char === "\r") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      if (char === "\r" && text[index + 1] === "\n") index += 2;
      else index += 1;
      continue;
    }
    cell += char;
    index += 1;
  }

  if (inQuotes) parserError("CSV input has an unterminated quoted value");
  row.push(cell);
  rows.push(row);
  return rows.filter((cells) => cells.some((value) => value.trim() !== ""));
}

function parseCsvAggregateExport(csvText: string): any[] {
  const rows = parseCsvRows(csvText);
  if (rows.length === 0) parserError("CSV input must include a header row");
  const headers = rows[0].map((header) => header.trim());
  const seen = new Set<string>();
  headers.forEach((header) => {
    if (!ALLOWED_RECORD_FIELDS.has(header)) {
      parserError(`Forbidden aggregate export header: ${header || "(blank)"}`);
    }
    if (seen.has(header)) {
      parserError(`Duplicate aggregate export header: ${header}`);
    }
    seen.add(header);
  });
  return rows.slice(1).map((cells, rowIndex) => {
    if (cells.length > headers.length) {
      parserError(`CSV row ${rowIndex + 2} has more cells than aggregate export headers`);
    }
    const record: Record<string, string> = {};
    headers.forEach((header, cellIndex) => {
      record[header] = cells[cellIndex] ?? "";
    });
    return record;
  });
}

function parseJsonAggregateExport(jsonText: string): any {
  try {
    return JSON.parse(jsonText);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    parserError(`Invalid JSON aggregate export input: ${message}`);
  }
}

function sourceObjectFromInput(input: AIFluencyAggregateExportParserInput): any {
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) parserError("Aggregate export input is empty");
    return trimmed.startsWith("{") || trimmed.startsWith("[")
      ? parseJsonAggregateExport(trimmed)
      : { records: parseCsvAggregateExport(trimmed) };
  }
  return input;
}

function recordsFromSource(source: any): any[] {
  if (Array.isArray(source)) return source;
  if (!source || typeof source !== "object") {
    parserError("Aggregate export input must be CSV text, a JSON object, or a JSON array");
  }
  for (const key of Object.keys(source)) {
    if (!ALLOWED_TOP_LEVEL_FIELDS.has(key)) {
      parserError(`Unsupported aggregate export top-level field: ${key}`);
    }
  }
  if (source.export_type !== undefined && source.export_type !== EXPORT_TYPE) {
    parserError(`Unsupported aggregate export_type: ${source.export_type}`);
  }
  if (!Array.isArray(source.records)) {
    parserError("Aggregate export object must include records array");
  }
  return source.records;
}

export function parseAIFluencyAggregateExport(
  input: AIFluencyAggregateExportParserInput
): any {
  const source = sourceObjectFromInput(input);
  const records = recordsFromSource(source).map((record, index) =>
    normalizeRecord(record, index)
  );
  return {
    export_type: EXPORT_TYPE,
    governance_posture: normalizeGovernancePosture(
      Array.isArray(source) ? undefined : source.governance_posture
    ),
    records
  };
}

function parseInputForRun(input: BuildAIFluencyAggregateExportParseRunInput): any {
  if (input.sourceType === "csv") {
    if (input.sourceText === undefined) {
      parserError("sourceText is required for CSV aggregate export parsing");
    }
    return parseAIFluencyAggregateExport({
      records: parseCsvAggregateExport(input.sourceText)
    });
  }
  if (input.sourceType === "json") {
    if (input.sourceObject !== undefined) {
      return parseAIFluencyAggregateExport(input.sourceObject);
    }
    if (input.sourceText !== undefined) {
      return parseAIFluencyAggregateExport(parseJsonAggregateExport(input.sourceText));
    }
    parserError("sourceObject or sourceText is required for JSON aggregate export parsing");
  }
  parserError(`Unsupported aggregate export sourceType: ${(input as any).sourceType}`);
}

function emptyDashboardExport(): any {
  return {
    export_type: EXPORT_TYPE,
    governance_posture: { ...DEFAULT_GOVERNANCE_POSTURE },
    records: []
  };
}

function recomputeFeeds(
  run: any,
  valid: boolean
): AIFluencyAggregateExportParseRunValidationResult["feeds"] {
  return {
    dashboard_import_runner:
      valid &&
      Array.isArray(run?.dashboard_export?.records) &&
      run.dashboard_export.records.length > 0,
    measurement_cell_input: false,
    customer_facing_financial_output: false
  };
}

export function buildAIFluencyAggregateExportParseRun(
  input: BuildAIFluencyAggregateExportParseRunInput
): any {
  const inputGaps: string[] = [];
  let dashboardExport = emptyDashboardExport();
  try {
    dashboardExport = parseInputForRun(input);
  } catch (error) {
    inputGaps.push(error instanceof Error ? error.message : String(error));
  }
  const parseId = input.parseId ??
    `ai_fluency_aggregate_export_parse_${safeIdPart(input.sourceType ?? "source")}`;
  const valid = inputGaps.length === 0 && dashboardExport.records.length > 0;
  return {
    schema_version: AI_VALUE_AI_FLUENCY_AGGREGATE_EXPORT_PARSE_RUN_SCHEMA_VERSION,
    parse_id: parseId,
    source_posture: "already_exported_aggregate_readiness_export",
    source_type: input.sourceType,
    export_type: dashboardExport.export_type,
    input_gaps: inputGaps,
    summary: {
      record_count: dashboardExport.records.length,
      blocked: inputGaps.length > 0
    },
    dashboard_export: dashboardExport,
    feeds: {
      dashboard_import_runner: valid,
      measurement_cell_input: false,
      customer_facing_financial_output: false
    },
    allowed_uses: [
      "aggregate_ai_fluency_export_parsing",
      "dashboard_import_runner_input_preparation"
    ],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    boundary_policy: boundaryPolicy(),
    required_caveats: [
      "Parser input must already be the aggregate Google Sheets readiness export, not source workbook tabs or respondent-level data.",
      "The parser preserves k_min_posture exactly; stale posture labels are blocked by the downstream Dashboard Import Runner.",
      "AI Fluency movement is descriptive readiness context only, not ROI, causality, productivity, financial attribution, confidence percentage, or probability output."
    ],
    generated_at: input.generatedAt ?? new Date(0).toISOString(),
    derivation_version: DERIVATION_VERSION
  };
}

export function validateAIFluencyAggregateExportParseRun(
  run: any
): AIFluencyAggregateExportParseRunValidationResult {
  const gaps: string[] = [];
  for (const field of [
    "schema_version",
    "parse_id",
    "source_posture",
    "source_type",
    "export_type",
    "input_gaps",
    "summary",
    "dashboard_export",
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
    run.schema_version !== AI_VALUE_AI_FLUENCY_AGGREGATE_EXPORT_PARSE_RUN_SCHEMA_VERSION
  ) {
    gaps.push(`schema_version is invalid: ${run.schema_version}`);
  }
  if (run?.source_posture !== "already_exported_aggregate_readiness_export") {
    gaps.push("source_posture must be already_exported_aggregate_readiness_export");
  }
  if (!["csv", "json"].includes(run?.source_type)) {
    gaps.push("source_type must be csv or json");
  }
  if (run?.export_type !== EXPORT_TYPE) {
    gaps.push(`export_type must be ${EXPORT_TYPE}`);
  }
  if (Array.isArray(run?.input_gaps) && run.input_gaps.length > 0) {
    gaps.push(...run.input_gaps);
  }
  const records = Array.isArray(run?.dashboard_export?.records)
    ? run.dashboard_export.records
    : [];
  if (records.length === 0) {
    gaps.push("dashboard_export.records must include at least one aggregate record");
  }
  if (run?.summary?.record_count !== records.length) {
    gaps.push("summary.record_count must match dashboard_export.records");
  }
  if (run?.dashboard_export?.export_type !== EXPORT_TYPE) {
    gaps.push(`dashboard_export.export_type must be ${EXPORT_TYPE}`);
  }
  const posture = run?.dashboard_export?.governance_posture ?? {};
  for (const [key, defaultValue] of Object.entries(DEFAULT_GOVERNANCE_POSTURE)) {
    if (!(key in posture)) {
      gaps.push(`dashboard_export.governance_posture.${key} is missing`);
    }
    if (typeof defaultValue === "boolean" && typeof posture[key] !== "boolean") {
      gaps.push(`dashboard_export.governance_posture.${key} must be boolean`);
    }
  }
  records.forEach((record: any, index: number) => {
    for (const key of Object.keys(record ?? {})) {
      if (!ALLOWED_RECORD_FIELDS.has(key)) {
        gaps.push(`Unsupported aggregate export field: records[${index}].${key}`);
      }
    }
  });
  for (const field of [...collectUnsafeValues(run?.dashboard_export)].sort()) {
    gaps.push(`Unsafe aggregate export value detected: dashboard_export.${field}`);
  }
  if (run?.feeds?.measurement_cell_input !== false) {
    gaps.push("feeds.measurement_cell_input must be false");
  }
  if (run?.feeds?.customer_facing_financial_output !== false) {
    gaps.push("feeds.customer_facing_financial_output must be false");
  }
  for (const flag of REQUIRED_FALSE_BOUNDARY_FIELDS) {
    if (run?.boundary_policy?.[flag] !== false) {
      gaps.push(`boundary_policy.${flag} must be false`);
    }
  }
  for (const use of REQUIRED_BLOCKED_USES) {
    if (!stringsOf(run?.blocked_uses).includes(use)) {
      gaps.push(`blocked_uses missing ${use}`);
    }
  }
  const valid = gaps.length === 0;
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    parse_id: run?.parse_id ?? null,
    valid,
    gaps,
    feeds: recomputeFeeds(run, valid)
  };
}
