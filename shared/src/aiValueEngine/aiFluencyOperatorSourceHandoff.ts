/**
 * AI Value Engine - AI Fluency Operator Source Handoff.
 *
 * Contract-only bridge from a validated aggregate AI Fluency parser run plus
 * Dashboard Import Runner output into the Operator Intake Adapter source
 * shape. It does not parse files, read Google Sheets, persist output, create
 * routes/UI/schemas, feed Measurement Cell directly, compute confidence,
 * calculate ROI, prove causality, emit productivity claims, or create
 * customer-facing financial output.
 */

import {
  validateAIFluencyAggregateExportParseRun,
  type AIFluencyAggregateExportParseRunValidationResult
} from "./aiFluencyAggregateExportParser";
import {
  validateAIFluencyDashboardImportRun,
  type AIFluencyDashboardImportRunValidationResult
} from "./aiFluencyDashboardImportRunner";

export const AI_VALUE_AI_FLUENCY_OPERATOR_SOURCE_HANDOFF_SCHEMA_VERSION =
  "FT_AI_VALUE_AI_FLUENCY_OPERATOR_SOURCE_HANDOFF_2026_06";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_AI_FLUENCY_OPERATOR_SOURCE_HANDOFF_VALIDATION_2026_06";

const DERIVATION_VERSION =
  "ai_value_ai_fluency_operator_source_handoff_2026_06";

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

const REQUIRED_FALSE_BOUNDARY_FIELDS = [
  "persists_output",
  "creates_migrations",
  "creates_prisma_schema",
  "creates_backend_routes",
  "creates_frontend_ui",
  "creates_ingestion_jobs",
  "reads_google_sheets",
  "runs_bigquery",
  "parses_uploaded_files",
  "stores_raw_source_data",
  "contains_person_level_results",
  "contains_direct_identifiers",
  "feeds_measurement_cell_directly",
  "feeds_finance_context_investigation",
  "feeds_confidence_model",
  "emits_confidence_percentage",
  "emits_probability",
  "customer_facing_financial_output"
];

const ALLOWED_DECISIONS = new Set([
  "READY_FOR_OPERATOR_INTAKE",
  "HELD_NO_FEEDABLE_AI_FLUENCY_SOURCE",
  "BLOCKED"
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
  /respondent_id/i,
  /person_id/i,
  /person_identifier/i,
  /hashed_(?:user|person|employee)_id/i,
  /joinable_(?:user|person|employee)_identifier/i,
  /person_level_productivity/i,
  /person_level_hris/i,
  /manager_ranking/i,
  /team_ranking/i,
  /^confidence_percentage$/i,
  /^confidence_percent$/i,
  /^probability$/i,
  /probability_output/i,
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

const EMAIL_VALUE_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

const DIRECT_IDENTIFIER_VALUE_PATTERN =
  /\b(?:respondent|employee|user|person)(?:[_:/-](?:id[_:/-]?)?)?[0-9a-f]{3,}\b/i;

export interface BuildAIFluencyOperatorSourceHandoffInput {
  parseRun: any;
  dashboardImportRun: any;
  sourceRef?: string;
  handoffId?: string;
  generatedAt?: string;
}

export interface AIFluencyOperatorSourceHandoffValidationResult {
  schema_version: string;
  handoff_id: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    operator_intake_source: boolean;
    data_spine_ai_fluency_source: boolean;
    measurement_cell_context_fragment: boolean;
    measurement_cell_direct_feed: false;
    finance_context_investigation: false;
    confidence_model: false;
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

function boundaryPolicy(): Record<string, false> {
  return Object.fromEntries(
    REQUIRED_FALSE_BOUNDARY_FIELDS.map((field) => [field, false])
  ) as Record<string, false>;
}

function falseFeeds(): AIFluencyOperatorSourceHandoffValidationResult["feeds"] {
  return {
    operator_intake_source: false,
    data_spine_ai_fluency_source: false,
    measurement_cell_context_fragment: false,
    measurement_cell_direct_feed: false,
    finance_context_investigation: false,
    confidence_model: false,
    customer_facing_financial_output: false
  };
}

function readyFeeds(): AIFluencyOperatorSourceHandoffValidationResult["feeds"] {
  return {
    operator_intake_source: true,
    data_spine_ai_fluency_source: true,
    measurement_cell_context_fragment: true,
    measurement_cell_direct_feed: false,
    finance_context_investigation: false,
    confidence_model: false,
    customer_facing_financial_output: false
  };
}

function validationGaps(
  label: string,
  validation:
    | AIFluencyAggregateExportParseRunValidationResult
    | AIFluencyDashboardImportRunValidationResult
): string[] {
  return validation.valid
    ? []
    : validation.gaps.map((gap) => `${label}: ${gap}`);
}

function feedableSources(dashboardRun: any): any[] {
  return Array.isArray(dashboardRun?.feedable_data_spine_sources)
    ? dashboardRun.feedable_data_spine_sources
    : [];
}

function selectFeedableSource(
  dashboardRun: any,
  sourceRef: string | undefined,
  inputGaps: string[]
): any | null {
  const sources = feedableSources(dashboardRun);
  if (sourceRef) {
    const match = sources.find((source) => source?.source_ref === sourceRef);
    if (!match) {
      inputGaps.push(`sourceRef ${sourceRef} did not match a feedable AI Fluency source`);
      return null;
    }
    return match;
  }
  if (sources.length === 1) return sources[0];
  if (sources.length > 1) {
    inputGaps.push("sourceRef is required when multiple feedable AI Fluency sources exist");
  }
  return null;
}

function recordForSource(parseRun: any, sourceRef: string | null): any | null {
  const records = Array.isArray(parseRun?.dashboard_export?.records)
    ? parseRun.dashboard_export.records
    : [];
  return records.find((record: any) => record?.source_ref === sourceRef) ?? null;
}

function operatorSourceFrom(selectedSource: any, record: any): any {
  return {
    ...selectedSource,
    owner_role: record?.source_owner_role ?? null
  };
}

function aiFluencyContextFrom(record: any, selectedSource: any, sourceRef: string): any {
  return {
    org_id: selectedSource?.org_id ?? null,
    client_id: selectedSource?.client_id ?? null,
    workflow_family: selectedSource?.workflow_family ?? null,
    function_area: selectedSource?.function_area ?? null,
    cohort_key: selectedSource?.cohort_key ?? null,
    baseline_window: selectedSource?.baseline_window ?? null,
    comparison_window: selectedSource?.comparison_window ?? null,
    owner_approval_state: selectedSource?.owner_approval_state ?? null,
    source_review_state: selectedSource?.review_state ?? null,
    evidence_state: "present",
    fluency_score: numberOrNull(record?.overall_ai_fluency_score),
    dimension_scores: {
      confidence: numberOrNull(record?.confidence_score),
      usage_quality: numberOrNull(record?.usage_quality_score),
      behavior_change: numberOrNull(record?.behavior_change_score),
      leadership_reinforcement: numberOrNull(record?.leadership_reinforcement_score),
      capability_growth: numberOrNull(record?.capability_growth_score)
    },
    response_count: numberOrNull(record?.response_count),
    source_ref: sourceRef,
    suppression_state: "CLEAR"
  };
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
    const isFalseBoundaryFlag = nested === false &&
      currentPath.some((part) =>
        ["boundary_policy", "feeds"].includes(normalizeKey(part))
      );
    if (
      !isFalseBoundaryFlag &&
      !["blocked_uses", "dimension_scores"].includes(normalized) &&
      FORBIDDEN_FIELD_PATTERNS.some((pattern) => pattern.test(key) || pattern.test(normalized))
    ) {
      fields.add(currentPath.join("."));
    }
    collectForbiddenFields(nested, fields, currentPath);
  }
  return fields;
}

function isValueExemptPath(path: string[]): boolean {
  const first = normalizeKey(path[0] ?? "");
  return ["blocked_uses", "boundary_policy", "required_caveats"].includes(first);
}

function collectForbiddenValues(
  value: any,
  fields: Set<string> = new Set(),
  path: string[] = []
): Set<string> {
  if (typeof value === "string") {
    if (
      !isValueExemptPath(path) &&
      (EMAIL_VALUE_PATTERN.test(value) || DIRECT_IDENTIFIER_VALUE_PATTERN.test(value))
    ) {
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

export function buildAIFluencyOperatorSourceHandoff(
  input: BuildAIFluencyOperatorSourceHandoffInput
): any {
  const parseValidation = validateAIFluencyAggregateExportParseRun(input.parseRun);
  const dashboardValidation = validateAIFluencyDashboardImportRun(input.dashboardImportRun);
  const inputGaps = [
    ...validationGaps("parse_run", parseValidation),
    ...validationGaps("dashboard_import_run", dashboardValidation)
  ];
  const selectedSource = inputGaps.length === 0
    ? selectFeedableSource(input.dashboardImportRun, input.sourceRef, inputGaps)
    : null;
  const selectedRecord = selectedSource
    ? recordForSource(input.parseRun, selectedSource.source_ref)
    : null;

  if (selectedSource && !selectedRecord) {
    inputGaps.push("selected feedable AI Fluency source must exist in parser dashboard_export records");
  }
  if (selectedRecord && !selectedRecord.source_owner_role) {
    inputGaps.push("selected AI Fluency parser record must include source_owner_role");
  }

  const blocked = inputGaps.length > 0;
  const ready = !blocked && Boolean(selectedSource && selectedRecord);
  const decision = blocked
    ? "BLOCKED"
    : ready
      ? "READY_FOR_OPERATOR_INTAKE"
      : "HELD_NO_FEEDABLE_AI_FLUENCY_SOURCE";
  const sourceRef = selectedSource?.source_ref ?? input.sourceRef ?? null;
  const operatorSource = ready ? operatorSourceFrom(selectedSource, selectedRecord) : null;
  const aiFluencyContext = ready
    ? aiFluencyContextFrom(selectedRecord, selectedSource, selectedSource.source_ref)
    : null;

  return {
    schema_version: AI_VALUE_AI_FLUENCY_OPERATOR_SOURCE_HANDOFF_SCHEMA_VERSION,
    handoff_id: input.handoffId ??
      `ai_fluency_operator_source_handoff_${safeIdPart(String(input.parseRun?.parse_id ?? "parse"))}_${safeIdPart(String(sourceRef ?? "none"))}`,
    source_posture: "validated_aggregate_ai_fluency_parser_and_dashboard_import",
    parse_id: input.parseRun?.parse_id ?? null,
    dashboard_import_run_id: input.dashboardImportRun?.run_id ?? null,
    dashboard_export_id: input.dashboardImportRun?.dashboard_export_id ?? null,
    org_id: operatorSource?.org_id ?? input.dashboardImportRun?.org_id ?? null,
    client_id: operatorSource?.client_id ?? input.dashboardImportRun?.client_id ?? null,
    workflow_family: operatorSource?.workflow_family ?? null,
    function_area: operatorSource?.function_area ?? null,
    cohort_key: operatorSource?.cohort_key ?? null,
    source_ref: sourceRef,
    decision,
    input_gaps: inputGaps,
    operator_source: operatorSource,
    ai_fluency_context: aiFluencyContext,
    source_package_reference: ready
      ? {
          source_package_type: "layer_2_user_voice_empirical_export",
          source_refs: {
            aggregate_export_id: sourceRef
          }
        }
      : null,
    feeds: ready ? readyFeeds() : falseFeeds(),
    allowed_uses: [
      "operator_intake_ai_fluency_source_preparation",
      "measurement_cell_ai_fluency_context_preparation"
    ],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    boundary_policy: boundaryPolicy(),
    required_caveats: [
      "AI Fluency Operator Source Handoff accepts validated aggregate parser and dashboard import runs only.",
      "The handoff prepares an Operator Intake AI Fluency source and context fragment; it cannot feed Measurement Cell directly.",
      "AI Fluency movement is descriptive readiness context only, not ROI, causality, productivity, financial attribution, confidence percentage, probability, or customer-facing financial output."
    ],
    generated_at: input.generatedAt ?? new Date(0).toISOString(),
    derivation_version: DERIVATION_VERSION
  };
}

function recomputeFeeds(
  handoff: any,
  valid: boolean
): AIFluencyOperatorSourceHandoffValidationResult["feeds"] {
  if (!valid || handoff?.decision !== "READY_FOR_OPERATOR_INTAKE") return falseFeeds();
  return readyFeeds();
}

export function validateAIFluencyOperatorSourceHandoff(
  handoff: any
): AIFluencyOperatorSourceHandoffValidationResult {
  const gaps: string[] = [];
  for (const field of [
    "schema_version",
    "handoff_id",
    "source_posture",
    "parse_id",
    "dashboard_import_run_id",
    "dashboard_export_id",
    "decision",
    "input_gaps",
    "feeds",
    "allowed_uses",
    "blocked_uses",
    "boundary_policy",
    "required_caveats",
    "generated_at",
    "derivation_version"
  ]) {
    requireField(handoff?.[field], field, gaps);
  }
  if (
    handoff?.schema_version &&
    handoff.schema_version !== AI_VALUE_AI_FLUENCY_OPERATOR_SOURCE_HANDOFF_SCHEMA_VERSION
  ) {
    gaps.push(`schema_version is invalid: ${handoff.schema_version}`);
  }
  if (handoff?.source_posture !== "validated_aggregate_ai_fluency_parser_and_dashboard_import") {
    gaps.push("source_posture must be validated_aggregate_ai_fluency_parser_and_dashboard_import");
  }
  if (handoff?.decision && !ALLOWED_DECISIONS.has(String(handoff.decision))) {
    gaps.push(`decision is invalid: ${handoff.decision}`);
  }
  if (Array.isArray(handoff?.input_gaps) && handoff.input_gaps.length > 0) {
    gaps.push(...handoff.input_gaps);
  }
  if (handoff?.decision === "READY_FOR_OPERATOR_INTAKE") {
    for (const field of [
      "org_id",
      "client_id",
      "workflow_family",
      "function_area",
      "cohort_key",
      "source_ref",
      "operator_source",
      "ai_fluency_context",
      "source_package_reference"
    ]) {
      requireField(handoff?.[field], field, gaps);
    }
    if (handoff?.operator_source?.state !== "present") {
      gaps.push("operator_source.state must be present");
    }
    if (handoff?.operator_source?.intake_mode !== "ai_fluency_dashboard_export") {
      gaps.push("operator_source.intake_mode must be ai_fluency_dashboard_export");
    }
    if (handoff?.operator_source?.source_ref !== handoff?.source_ref) {
      gaps.push("operator_source.source_ref must match handoff source_ref");
    }
    if (!handoff?.operator_source?.owner_role) {
      gaps.push("operator_source.owner_role is required");
    }
    if (handoff?.operator_source?.owner_approval_state !== "approved") {
      gaps.push("operator_source.owner_approval_state must be approved");
    }
    if (handoff?.operator_source?.review_state !== "clear") {
      gaps.push("operator_source.review_state must be clear");
    }
    if (handoff?.operator_source?.aggregate_only !== true) {
      gaps.push("operator_source.aggregate_only must be true");
    }
    if (handoff?.ai_fluency_context?.source_ref !== handoff?.source_ref) {
      gaps.push("ai_fluency_context.source_ref must match handoff source_ref");
    }
    for (const key of [
      "org_id",
      "client_id",
      "workflow_family",
      "function_area",
      "cohort_key",
      "baseline_window",
      "comparison_window",
      "owner_approval_state",
      "source_review_state"
    ]) {
      const operatorSourceKey =
        key === "source_review_state" ? "review_state" : key;
      if (
        JSON.stringify(handoff?.ai_fluency_context?.[key] ?? null) !==
        JSON.stringify(handoff?.operator_source?.[operatorSourceKey] ?? null)
      ) {
        gaps.push(`ai_fluency_context.${key} must match operator_source.${operatorSourceKey}`);
      }
    }
    if (handoff?.source_package_reference?.source_refs?.aggregate_export_id !== handoff?.source_ref) {
      gaps.push("source_package_reference.source_refs.aggregate_export_id must match handoff source_ref");
    }
  } else {
    if (handoff?.feeds?.operator_intake_source !== false) {
      gaps.push("held or blocked handoff cannot feed operator_intake_source");
    }
    if (handoff?.feeds?.measurement_cell_context_fragment !== false) {
      gaps.push("held or blocked handoff cannot feed measurement_cell_context_fragment");
    }
  }
  for (const field of [
    "measurement_cell_direct_feed",
    "finance_context_investigation",
    "confidence_model",
    "customer_facing_financial_output"
  ]) {
    if (handoff?.feeds?.[field] !== false) {
      gaps.push(`feeds.${field} must be false`);
    }
  }
  for (const use of REQUIRED_BLOCKED_USES) {
    if (!stringsOf(handoff?.blocked_uses).includes(use)) {
      gaps.push(`blocked_uses missing ${use}`);
    }
  }
  for (const field of REQUIRED_FALSE_BOUNDARY_FIELDS) {
    if (handoff?.boundary_policy?.[field] !== false) {
      gaps.push(`boundary_policy.${field} must be false`);
    }
  }
  for (const field of [...collectForbiddenFields(handoff)].sort()) {
    gaps.push(`Forbidden field detected: ${field}`);
  }
  for (const field of [...collectForbiddenValues(handoff)].sort()) {
    gaps.push(`Unsafe identifier value detected: ${field}`);
  }
  const valid = gaps.length === 0;
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    handoff_id: handoff?.handoff_id ?? null,
    valid,
    gaps,
    feeds: recomputeFeeds(handoff, valid)
  };
}
