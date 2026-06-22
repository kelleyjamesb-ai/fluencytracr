/**
 * AI Value Engine - AI Fluency Client Import.
 *
 * Contract-only adapter for aggregate AI Fluency dashboard exports by client
 * and org. It normalizes already-aggregated dashboard data into the existing
 * Fluency Baseline contract and Data Spine source shape. It does not collect
 * individual instruments, persist data, create routes/UI, score people or
 * teams, or create financial/probability output.
 */

import {
  FLUENCY_BASELINE_SCHEMA_VERSION,
  validateFluencyBaseline,
  type FluencyBaselineValidationResult
} from "./fluencyBaseline";

export const AI_VALUE_AI_FLUENCY_CLIENT_IMPORT_SCHEMA_VERSION =
  "FT_AI_VALUE_AI_FLUENCY_CLIENT_IMPORT_2026_06";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_AI_FLUENCY_CLIENT_IMPORT_VALIDATION_2026_06";

const DERIVATION_VERSION =
  "ai_value_ai_fluency_client_import_2026_06";

const MIN_DATA_SPINE_IMPORT_RESPONDENT_COUNT = 20;

const REQUIRED_FALSE_BOUNDARY_FIELDS = [
  "persists_output",
  "creates_migrations",
  "creates_prisma_schema",
  "creates_backend_routes",
  "creates_frontend_ui",
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
  /respondent_id/i,
  /(^|_)user(_|$)/i,
  /email/i,
  /employee/i,
  /person_id/i,
  /person_identifier/i,
  /raw_(?:rows?|answers?|responses?|content|file)/i,
  /^answers?$/i,
  /response_text/i,
  /manager_ranking/i,
  /team_ranking/i,
  /^confidence_percentage$/i,
  /^probability$/i,
  /^roi$/i,
  /^ebita$/i,
  /^ebitda$/i,
  /financial_attribution/i,
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
  "feeds",
  "governance"
]);

export interface BuildAIFluencyClientImportInput {
  importId?: string;
  orgId: string;
  clientId: string;
  dashboardExportId: string;
  sourceRef?: string;
  instrumentId: string;
  collectionMode: string;
  workflowFamily: string;
  functionArea: string;
  cohortKey: string;
  baselineWindow: any;
  comparisonWindow: any;
  exportWindow: any;
  ownerApprovalState: string;
  reviewState: string;
  cohorts: any[];
  generatedAt?: string;
}

export interface AIFluencyClientImportValidationResult {
  schema_version: string;
  import_id: string | null;
  org_id: string | null;
  client_id: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    fluency_baseline: boolean;
    data_spine_ai_fluency_source: boolean;
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

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function aggregateSummary(cohorts: any[]): any {
  const usable = cohorts.filter((cohort) => cohort?.suppressed !== true);
  const totals: Record<string, { sum: number; weight: number }> = {};
  for (const cohort of usable) {
    const weight = Number(cohort.respondent_count ?? 0);
    for (const [construct, entry] of Object.entries(cohort.construct_scores ?? {})) {
      const mean = (entry as any)?.mean;
      if (typeof mean !== "number" || !Number.isFinite(mean) || weight <= 0) continue;
      totals[construct] = totals[construct] ?? { sum: 0, weight: 0 };
      totals[construct].sum += mean * weight;
      totals[construct].weight += weight;
    }
  }
  return {
    total_respondents: cohorts.reduce(
      (sum, cohort) => sum + Number(cohort?.respondent_count ?? 0),
      0
    ),
    usable_respondents: usable.reduce(
      (sum, cohort) => sum + Number(cohort?.respondent_count ?? 0),
      0
    ),
    usable_cohort_count: usable.length,
    suppressed_cohort_count: cohorts.length - usable.length,
    weighted_construct_means: Object.fromEntries(
      Object.entries(totals).map(([construct, total]) => [
        construct,
        total.weight > 0 ? round2(total.sum / total.weight) : null
      ])
    )
  };
}

function fluencyBaseline(input: BuildAIFluencyClientImportInput): any {
  return {
    schema_version: FLUENCY_BASELINE_SCHEMA_VERSION,
    baseline_id:
      `ai_fluency_baseline_${safeIdPart(input.orgId)}_${safeIdPart(input.dashboardExportId)}`,
    org_id: input.orgId,
    client_id: input.clientId,
    instrument: {
      instrument_id: input.instrumentId
    },
    window: input.exportWindow,
    collection_mode: input.collectionMode,
    cohorts: input.cohorts.map((cohort) => ({
      cohort_id: cohort.cohort_id,
      cohort_label: cohort.cohort_label,
      respondent_count: cohort.respondent_count,
      suppressed: cohort.suppressed,
      construct_scores: cohort.construct_scores
    })),
    governance: {
      respondent_identifiers_included: false,
      person_level_results_shared: false,
      used_for_individual_scoring: false,
      used_for_team_ranking: false
    }
  };
}

function sourceState(
  baselineValidation: FluencyBaselineValidationResult,
  summary: any,
  input: BuildAIFluencyClientImportInput
): string {
  if (!baselineValidation.valid) return "held";
  if (summary.usable_cohort_count === 0) return "suppressed";
  if (summary.usable_respondents < MIN_DATA_SPINE_IMPORT_RESPONDENT_COUNT) {
    return "suppressed";
  }
  if (input.ownerApprovalState !== "approved" || input.reviewState !== "clear") return "held";
  return "present";
}

export function buildAIFluencyClientImport(
  input: BuildAIFluencyClientImportInput
): any {
  const baseline = fluencyBaseline(input);
  const baselineValidation = validateFluencyBaseline(baseline);
  const summary = aggregateSummary(input.cohorts);
  const state = sourceState(baselineValidation, summary, input);
  return {
    schema_version: AI_VALUE_AI_FLUENCY_CLIENT_IMPORT_SCHEMA_VERSION,
    import_id: input.importId ??
      `ai_fluency_client_import_${safeIdPart(input.orgId)}_${safeIdPart(input.dashboardExportId)}`,
    org_id: input.orgId,
    client_id: input.clientId,
    dashboard_export_id: input.dashboardExportId,
    source_posture: "aggregate_dashboard_export_only",
    instrument_id: input.instrumentId,
    collection_mode: input.collectionMode,
    workflow_family: input.workflowFamily,
    function_area: input.functionArea,
    cohort_key: input.cohortKey,
    baseline_window: input.baselineWindow,
    comparison_window: input.comparisonWindow,
    export_window: input.exportWindow,
    owner_approval_state: input.ownerApprovalState,
    review_state: input.reviewState,
    aggregate_summary: summary,
    fluency_baseline: baseline,
    data_spine_source: {
      state,
      intake_mode: "ai_fluency_dashboard_export",
      source_ref: input.sourceRef ?? input.dashboardExportId,
      org_id: input.orgId,
      client_id: input.clientId,
      workflow_family: input.workflowFamily,
      function_area: input.functionArea,
      cohort_key: input.cohortKey,
      baseline_window: input.baselineWindow,
      comparison_window: input.comparisonWindow,
      owner_approval_state: input.ownerApprovalState,
      review_state: input.reviewState,
      aggregate_only: true
    },
    feeds: {
      fluency_baseline: state === "present",
      data_spine_ai_fluency_source: state === "present",
      measurement_cell_input: false,
      customer_facing_financial_output: false
    },
    allowed_uses: [
      "aggregate_ai_fluency_context",
      "data_spine_source_preparation",
      "cohort_level_movement_review"
    ],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    boundary_policy: boundaryPolicy(),
    required_caveats: [
      "AI Fluency client import accepts aggregate dashboard exports only.",
      "Suppressed or small cohorts carry no construct scores and cannot feed Data Spine by themselves.",
      "AI Fluency context does not produce ROI, financial attribution, causality, productivity, confidence percentage, or probability output."
    ],
    generated_at: input.generatedAt ?? new Date(0).toISOString(),
    derivation_version: DERIVATION_VERSION
  };
}

function recomputeFeeds(intake: any, valid: boolean): AIFluencyClientImportValidationResult["feeds"] {
  const baselineValidation = validateFluencyBaseline(intake?.fluency_baseline);
  const ready = valid &&
    baselineValidation.valid &&
    baselineValidation.feeds.value_chain_context === true &&
    intake?.data_spine_source?.state === "present" &&
    intake?.owner_approval_state === "approved" &&
    intake?.review_state === "clear";
  return {
    fluency_baseline: ready,
    data_spine_ai_fluency_source: ready,
    measurement_cell_input: false,
    customer_facing_financial_output: false
  };
}

export function validateAIFluencyClientImport(
  intake: any
): AIFluencyClientImportValidationResult {
  const gaps: string[] = [];
  for (const field of [
    "schema_version",
    "import_id",
    "org_id",
    "client_id",
    "dashboard_export_id",
    "source_posture",
    "instrument_id",
    "collection_mode",
    "workflow_family",
    "function_area",
    "cohort_key",
    "baseline_window",
    "comparison_window",
    "export_window",
    "owner_approval_state",
    "review_state",
    "aggregate_summary",
    "fluency_baseline",
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
    intake.schema_version !== AI_VALUE_AI_FLUENCY_CLIENT_IMPORT_SCHEMA_VERSION
  ) {
    gaps.push(`schema_version is invalid: ${intake.schema_version}`);
  }
  const baselineValidation = validateFluencyBaseline(intake?.fluency_baseline);
  if (!baselineValidation.valid) {
    gaps.push(`fluency_baseline is invalid: ${baselineValidation.gaps.join("; ")}`);
  }
  if (intake?.fluency_baseline?.org_id !== intake?.org_id) {
    gaps.push("fluency_baseline.org_id must match import org_id");
  }
  if (intake?.fluency_baseline?.client_id !== intake?.client_id) {
    gaps.push("fluency_baseline.client_id must match import client_id");
  }
  if (intake?.data_spine_source?.org_id !== intake?.org_id) {
    gaps.push("data_spine_source.org_id must match import org_id");
  }
  if (intake?.data_spine_source?.client_id !== intake?.client_id) {
    gaps.push("data_spine_source.client_id must match import client_id");
  }
  if (intake?.data_spine_source?.aggregate_only !== true) {
    gaps.push("data_spine_source.aggregate_only must be true");
  }
  if (intake?.feeds?.measurement_cell_input !== false) {
    gaps.push("feeds.measurement_cell_input must be false");
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
    import_id: intake?.import_id ?? null,
    org_id: intake?.org_id ?? null,
    client_id: intake?.client_id ?? null,
    valid,
    gaps,
    feeds: recomputeFeeds(intake, valid)
  };
}
