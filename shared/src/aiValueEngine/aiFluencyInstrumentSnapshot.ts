/**
 * AI Value Engine - AI Fluency Instrument Snapshot.
 *
 * Source-independent aggregate snapshot boundary for separately deployed AI
 * Fluency Instrument evidence. Google Sheets / Apps Script, controlled JSON,
 * and future Instrument APIs are adapters into this shape; the model and UI
 * must consume validated snapshots, not the source adapter.
 *
 * This module validates contract objects only. It does not persist data,
 * create routes/UI, read Google Sheets, collect respondent rows, compute
 * confidence, calculate ROI, prove causality, or produce customer-facing
 * output.
 */

export const AI_VALUE_AI_FLUENCY_INSTRUMENT_SNAPSHOT_SCHEMA_VERSION =
  "FT_AI_VALUE_AI_FLUENCY_INSTRUMENT_SNAPSHOT_2026_07";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_AI_FLUENCY_INSTRUMENT_SNAPSHOT_VALIDATION_2026_07";

const DERIVATION_VERSION =
  "ai_value_ai_fluency_instrument_snapshot_2026_07";

const REQUIRED_DIMENSIONS = [
  "overall_ai_fluency",
  "confidence",
  "usage_quality",
  "behavior_change",
  "leadership_reinforcement",
  "capability_growth"
] as const;

const REQUIRED_FALSE_BOUNDARY_FIELDS = [
  "persists_output",
  "creates_migrations",
  "creates_prisma_schema",
  "creates_backend_routes",
  "creates_frontend_ui",
  "creates_ingestion_jobs",
  "reads_google_sheets",
  "calls_apps_script",
  "queries_instrument_database",
  "collects_individual_instruments",
  "contains_person_level_results",
  "contains_direct_identifiers",
  "contains_respondent_level_data",
  "feeds_measurement_cell_directly",
  "feeds_confidence_model",
  "emits_confidence_percentage",
  "emits_probability",
  "customer_facing_financial_output"
] as const;

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
  "department_ranking",
  "people_decisioning",
  "customer_facing_financial_output",
  "confidence_percentage",
  "probability_output",
  "model_output",
  "full_fluency_measurement_model_authorization"
] as const;

const SUPPRESSION_STATES = new Set([
  "none",
  "suppressed_low_n",
  "held_suppressed_low_n",
  "held_incomplete_score_coverage",
  "held_missing_uncertainty",
  "held_review_required"
]);
// Adapter/source-review postures for aggregate snapshot import only. These do
// not extend FluencyTracr's five canonical verdict suppression reasons.

const OWNER_APPROVAL_STATES = new Set([
  "approved",
  "submitted",
  "needs_review",
  "hold",
  "rejected"
]);

const REVIEW_STATES = new Set([
  "approved_for_model_context",
  "approved_for_import",
  "needs_review",
  "held_suppressed_low_n",
  "held_incomplete_score_coverage",
  "held_missing_uncertainty",
  "hold",
  "rejected"
]);

const SOURCE_ADAPTERS = new Set([
  "google_apps_script_aggregate_export",
  "controlled_json_import",
  "controlled_csv_import",
  "future_instrument_api_fixture",
  "future_postgres_instrument_service_fixture"
]);

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const EMAIL_VALUE_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const DIRECT_IDENTIFIER_VALUE_PATTERN =
  /\b(?:respondent|employee|user|person|session)(?:[_:/-](?:id[_:/-]?)?)?[0-9a-f]{3,}\b/i;

const FORBIDDEN_FIELD_PATTERNS = [
  /^raw_rows?$/i,
  /^rows$/i,
  /^records$/i,
  /^responses?$/i,
  /^answers?$/i,
  /raw_(?:survey|answer|answers|response|responses|row|rows|text|prompt|prompts|output|outputs|transcript|content|file)/i,
  /free_text/i,
  /prompt/i,
  /transcript/i,
  /query_text/i,
  /sql_text/i,
  /email/i,
  /user_id/i,
  /employee_id/i,
  /employee_email/i,
  /employee_name/i,
  /respondent_email/i,
  /respondent_id/i,
  /session_id/i,
  /person_id/i,
  /person_identifier/i,
  /hashed_(?:user|person|employee|respondent)_id/i,
  /joinable_(?:user|person|employee|respondent)_identifier/i,
  /hris/i,
  /manager/i,
  /level/i,
  /tenure/i,
  /compensation/i,
  /performance/i,
  /productivity/i,
  /^confidence_percentage$/i,
  /^probability$/i,
  /^roi$/i,
  /^ebita$/i,
  /^ebitda$/i,
  /financial_attribution/i,
  /^customer_facing_financial_output$/i,
  /^person_level_data_present$/i,
  /^contains_(?:person|direct|respondent|employee|user|individual|raw|hris|manager|productivity)/i,
  /^collects_(?:person|direct|respondent|employee|user|individual|raw|hris|manager|productivity)/i,
  /^feeds_(?:measurement_cell|confidence_model)$/i,
  /^emits_(?:confidence_percentage|probability)$/i,
  /^persists_output$/i,
  /^creates_(?:migrations|prisma_schema|backend_routes|frontend_ui|ingestion_jobs)$/i,
  /^reads_google_sheets$/i,
  /^calls_apps_script$/i,
  /^queries_instrument_database$/i,
  /^backend_routes?$/i,
  /^frontend_ui$/i,
  /^persistence_table$/i
];

const UNSAFE_VALUE_PATTERNS = [
  EMAIL_VALUE_PATTERN,
  DIRECT_IDENTIFIER_VALUE_PATTERN,
  /\braw\s+(?:answer|answers|response|responses|rows?|text|transcript|prompt|prompts|output|outputs)\b/i,
  /\b(?:confidence\s*(?:percentage|percent)|probability|impact\s*probability)\b/i,
  /\b(?:roi|ebita|ebitda|financial attribution|customer-facing financial output)\b/i,
  /\b(?:hris|manager ranking|team ranking|department ranking|employee productivity|performance review|compensation)\b/i,
  /\/api\//i
];

export interface AIFluencyInstrumentSnapshotValidationResult {
  schema_version: string;
  snapshot_id: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    longitudinal_model_context: boolean;
    full_fluency_measurement_model: false;
    measurement_cell_direct_feed: false;
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

function numberOrNull(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function requiredFalseBoundaryPolicy(): Record<string, false> {
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
    value.forEach((item, index) => collectForbiddenFields(item, fields, [...path, String(index)]));
    return fields;
  }
  for (const [key, nested] of Object.entries(value)) {
    const normalized = normalizeKey(key);
    const currentPath = [...path, key];
    const isFalseBoundaryFlag =
      nested === false &&
      (currentPath.some((part) => normalizeKey(part) === "boundary_policy") ||
        [
          "person_level_data_present",
          "full_fluency_measurement_model_authorized",
          "customer_output_authorized",
          "probability_output_authorized",
          "confidence_output_authorized",
          "roi_output_authorized",
          "finance_output_authorized",
          "causality_output_authorized",
          "productivity_output_authorized"
        ].includes(normalized));
    const isAllowedGovernanceContainer = ["blocked_uses", "boundary_policy"].includes(normalized);
    if (
      !isFalseBoundaryFlag &&
      !isAllowedGovernanceContainer &&
      FORBIDDEN_FIELD_PATTERNS.some((pattern) => pattern.test(key) || pattern.test(normalized))
    ) {
      fields.add(currentPath.join("."));
    }
    collectForbiddenFields(nested, fields, currentPath);
  }
  return fields;
}

function collectUnsafeValues(value: any, values: string[] = []): string[] {
  if (typeof value === "string") {
    if (UNSAFE_VALUE_PATTERNS.some((pattern) => pattern.test(value))) {
      values.push(value);
    }
    return values;
  }
  if (!value || typeof value !== "object") return values;
  if (Array.isArray(value)) {
    value.forEach((item) => collectUnsafeValues(item, values));
    return values;
  }
  for (const nested of Object.values(value)) collectUnsafeValues(nested, values);
  return values;
}

function collectRawBoundaryViolations(value: any, gaps: string[]): void {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  if (value.aggregate_only === false) gaps.push("aggregate_only raw input must not be false");
  if (value.aggregateOnly === false) gaps.push("aggregateOnly raw input must not be false");
  if (value.person_level_data_present !== undefined && value.person_level_data_present !== false) {
    gaps.push("person_level_data_present raw input must be false");
  }
  if (value.personLevelDataPresent !== undefined && value.personLevelDataPresent !== false) {
    gaps.push("personLevelDataPresent raw input must be false");
  }
  const rawBoundaryPolicy = value.boundary_policy ?? value.boundaryPolicy ?? {};
  if (rawBoundaryPolicy && typeof rawBoundaryPolicy === "object" && !Array.isArray(rawBoundaryPolicy)) {
    for (const field of REQUIRED_FALSE_BOUNDARY_FIELDS) {
      if (rawBoundaryPolicy[field] !== undefined && rawBoundaryPolicy[field] !== false) {
        gaps.push(`boundary_policy.${field} raw input must be false`);
      }
    }
  }
  for (const field of [
    ...REQUIRED_FALSE_BOUNDARY_FIELDS,
    "full_fluency_measurement_model_authorized",
    "customer_output_authorized",
    "probability_output_authorized",
    "confidence_output_authorized",
    "roi_output_authorized",
    "finance_output_authorized",
    "causality_output_authorized",
    "productivity_output_authorized"
  ]) {
    if (value[field] !== undefined && value[field] !== false) {
      gaps.push(`${field} raw input must be false`);
    }
  }
}

function requireField(value: any, path: string, gaps: string[]): void {
  if (value === undefined || value === null || value === "") gaps.push(`${path} is missing`);
}

function dimensionScoresFromFlat(value: any): Record<string, number | null> {
  return {
    overall_ai_fluency: numberOrNull(value?.overall_ai_fluency_score),
    confidence: numberOrNull(value?.confidence_score),
    usage_quality: numberOrNull(value?.usage_quality_score),
    behavior_change: numberOrNull(value?.behavior_change_score),
    leadership_reinforcement: numberOrNull(value?.leadership_reinforcement_score),
    capability_growth: numberOrNull(value?.capability_growth_score)
  };
}

function standardErrorsFromFlat(value: any): Record<string, number | null> {
  const nested = value?.dimension_standard_errors ?? value?.dimensionStandardErrors ?? {};
  return Object.fromEntries(
    REQUIRED_DIMENSIONS.map((dimension) => [
      dimension,
      numberOrNull(nested?.[dimension] ?? value?.[`${dimension}_standard_error`])
    ])
  );
}

function sourceHash(value: any): string | null {
  const hash = value?.source_hash ?? value?.sourceHash ?? value?.source?.source_hash;
  return typeof hash === "string" ? hash : null;
}

export function buildAIFluencyInstrumentSnapshotFromObject(input: any): any {
  const sourceAdapter =
    input?.source_adapter ??
    input?.sourceAdapter ??
    input?.adapter_type ??
    input?.source?.adapter ??
    "controlled_json_import";
  const collectionWaveId =
    input?.collection_wave_id ??
    input?.collectionWaveId ??
    input?.dashboard_export_id ??
    input?.dashboardExportId ??
    input?.source?.collection_wave_id ??
    "wave-unspecified";
  const windowStart =
    input?.window_start ??
    input?.windowStart ??
    input?.baseline_window_start ??
    input?.collection_window?.start ??
    input?.collectionWindow?.start;
  const windowEnd =
    input?.window_end ??
    input?.windowEnd ??
    input?.baseline_window_end ??
    input?.collection_window?.end ??
    input?.collectionWindow?.end;
  const orgId = input?.org_id ?? input?.orgId;
  const clientId = input?.client_id ?? input?.clientId ?? orgId;
  const instrumentId = input?.instrument_id ?? input?.instrumentId;
  const instrumentVersion = input?.instrument_version ?? input?.instrumentVersion;
  const functionArea = input?.function_area ?? input?.functionArea;
  const workflowFamily = input?.workflow_family ?? input?.workflowFamily;
  const cohortKey = input?.cohort_key ?? input?.cohortKey;
  const snapshotId =
    input?.snapshot_id ??
    input?.snapshotId ??
    [
      "ai_fluency_snapshot",
      orgId,
      instrumentId,
      instrumentVersion,
      functionArea,
      workflowFamily,
      cohortKey,
      collectionWaveId,
      windowStart,
      windowEnd
    ]
      .filter((part) => part !== undefined && part !== null && part !== "")
      .map((part) => safeIdPart(String(part)))
      .join("_");

  const dimensionScores = {
    ...dimensionScoresFromFlat(input),
    ...(input?.dimension_scores ?? input?.dimensionScores ?? {})
  };
  const dimensionStandardErrors = standardErrorsFromFlat(input);
  const uncertaintyValues = [
    numberOrNull(input?.overall_standard_error) ?? numberOrNull(input?.overallStandardError),
    ...Object.values(dimensionStandardErrors).map((value) => numberOrNull(value))
  ];
  const uncertaintyComplete = uncertaintyValues.every(
    (value) => typeof value === "number" && Number.isFinite(value)
  );

  return {
    schema_version:
      input?.schema_version ?? AI_VALUE_AI_FLUENCY_INSTRUMENT_SNAPSHOT_SCHEMA_VERSION,
    snapshot_id: snapshotId,
    client_id: clientId,
    org_id: orgId,
    instrument_id: instrumentId,
    instrument_version: instrumentVersion,
    collection_wave_id: collectionWaveId,
    collection_mode: input?.collection_mode ?? input?.collectionMode,
    function_area: functionArea,
    workflow_family: workflowFamily,
    cohort_key: cohortKey,
    window_start: windowStart,
    window_end: windowEnd,
    eligible_population_count: numberOrNull(input?.eligible_population_count),
    response_count: numberOrNull(input?.response_count ?? input?.responseCount),
    response_rate: numberOrNull(input?.response_rate ?? input?.responseRate),
    dimension_scores: dimensionScores,
    overall_ai_fluency_score:
      numberOrNull(input?.overall_ai_fluency_score) ??
      numberOrNull(dimensionScores.overall_ai_fluency),
    confidence_score: numberOrNull(input?.confidence_score) ?? numberOrNull(dimensionScores.confidence),
    usage_quality_score:
      numberOrNull(input?.usage_quality_score) ?? numberOrNull(dimensionScores.usage_quality),
    behavior_change_score:
      numberOrNull(input?.behavior_change_score) ?? numberOrNull(dimensionScores.behavior_change),
    leadership_reinforcement_score:
      numberOrNull(input?.leadership_reinforcement_score) ??
      numberOrNull(dimensionScores.leadership_reinforcement),
    capability_growth_score:
      numberOrNull(input?.capability_growth_score) ??
      numberOrNull(dimensionScores.capability_growth),
    overall_standard_error:
      numberOrNull(input?.overall_standard_error) ?? numberOrNull(input?.overallStandardError),
    dimension_standard_errors: dimensionStandardErrors,
    dimension_standard_deviations:
      input?.dimension_standard_deviations ?? input?.dimensionStandardDeviations ?? {},
    dimension_response_counts:
      input?.dimension_response_counts ?? input?.dimensionResponseCounts ?? {},
    reliability_estimates: input?.reliability_estimates ?? input?.reliabilityEstimates ?? {},
    missingness_posture:
      input?.missingness_posture ?? input?.missingnessPosture ?? "not_provided",
    respondent_composition_posture:
      input?.respondent_composition_posture ??
      input?.respondentCompositionPosture ??
      "not_provided",
    measurement_uncertainty_state: uncertaintyComplete
      ? "aggregate_uncertainty_available"
      : "missing_uncertainty_visible",
    suppression_state: input?.suppression_state ?? input?.suppressionState,
    k_min_posture: input?.k_min_posture ?? input?.kMinPosture,
    source_owner_role: input?.source_owner_role ?? input?.sourceOwnerRole,
    owner_approval_state: input?.owner_approval_state ?? input?.ownerApprovalState,
    review_state: input?.review_state ?? input?.reviewState,
    source_adapter: sourceAdapter,
    source_ref: input?.source_ref ?? input?.sourceRef ?? input?.source?.source_ref,
    source_hash: sourceHash(input),
    caveats: Array.isArray(input?.caveats) ? input.caveats : input?.caveats ? [input.caveats] : [],
    aggregate_only: true,
    person_level_data_present: false,
    boundary_policy: requiredFalseBoundaryPolicy(),
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    full_fluency_measurement_model_authorized: false,
    customer_output_authorized: false,
    probability_output_authorized: false,
    confidence_output_authorized: false,
    roi_output_authorized: false,
    finance_output_authorized: false,
    causality_output_authorized: false,
    productivity_output_authorized: false,
    derivation_version: DERIVATION_VERSION
  };
}

export function validateAIFluencyInstrumentSnapshot(
  value: any
): AIFluencyInstrumentSnapshotValidationResult {
  const snapshot = buildAIFluencyInstrumentSnapshotFromObject(value);
  const gaps: string[] = [];
  collectRawBoundaryViolations(value, gaps);

  if (snapshot.schema_version !== AI_VALUE_AI_FLUENCY_INSTRUMENT_SNAPSHOT_SCHEMA_VERSION) {
    gaps.push("schema_version is not supported");
  }
  for (const field of [
    "snapshot_id",
    "client_id",
    "org_id",
    "instrument_id",
    "instrument_version",
    "collection_wave_id",
    "collection_mode",
    "function_area",
    "workflow_family",
    "cohort_key",
    "window_start",
    "window_end",
    "eligible_population_count",
    "response_count",
    "response_rate",
    "overall_ai_fluency_score",
    "confidence_score",
    "usage_quality_score",
    "behavior_change_score",
    "leadership_reinforcement_score",
    "capability_growth_score",
    "suppression_state",
    "k_min_posture",
    "source_owner_role",
    "owner_approval_state",
    "review_state",
    "source_adapter",
    "source_ref",
    "source_hash"
  ]) {
    requireField(snapshot[field], field, gaps);
  }
  if (!SOURCE_ADAPTERS.has(snapshot.source_adapter)) {
    gaps.push(`source_adapter ${snapshot.source_adapter} is not supported`);
  }
  if (!SUPPRESSION_STATES.has(snapshot.suppression_state)) {
    gaps.push(`suppression_state ${snapshot.suppression_state} is not supported`);
  }
  if (!OWNER_APPROVAL_STATES.has(snapshot.owner_approval_state)) {
    gaps.push(`owner_approval_state ${snapshot.owner_approval_state} is not supported`);
  }
  if (!REVIEW_STATES.has(snapshot.review_state)) {
    gaps.push(`review_state ${snapshot.review_state} is not supported`);
  }
  if (typeof snapshot.source_hash !== "string" || !SHA256_PATTERN.test(snapshot.source_hash)) {
    gaps.push("source_hash must be a SHA-256 hex digest");
  }
  if (snapshot.aggregate_only !== true) gaps.push("aggregate_only must be true");
  if (snapshot.person_level_data_present !== false) {
    gaps.push("person_level_data_present must be false");
  }
  for (const field of REQUIRED_FALSE_BOUNDARY_FIELDS) {
    if (snapshot.boundary_policy?.[field] !== false) {
      gaps.push(`boundary_policy.${field} must be false`);
    }
  }
  for (const field of [
    "full_fluency_measurement_model_authorized",
    "customer_output_authorized",
    "probability_output_authorized",
    "confidence_output_authorized",
    "roi_output_authorized",
    "finance_output_authorized",
    "causality_output_authorized",
    "productivity_output_authorized"
  ]) {
    if (snapshot[field] !== false) gaps.push(`${field} must be false`);
  }
  for (const blockedUse of REQUIRED_BLOCKED_USES) {
    if (!Array.isArray(snapshot.blocked_uses) || !snapshot.blocked_uses.includes(blockedUse)) {
      gaps.push(`blocked_uses must include ${blockedUse}`);
    }
  }
  for (const dimension of REQUIRED_DIMENSIONS) {
    const score = numberOrNull(snapshot.dimension_scores?.[dimension]);
    if (score === null) gaps.push(`dimension_scores.${dimension} is missing`);
    if (score !== null && (score < 0 || score > 100)) {
      gaps.push(`dimension_scores.${dimension} must be between 0 and 100`);
    }
  }
  const responseCount = numberOrNull(snapshot.response_count);
  const eligiblePopulationCount = numberOrNull(snapshot.eligible_population_count);
  const responseRate = numberOrNull(snapshot.response_rate);
  if (eligiblePopulationCount === null || eligiblePopulationCount < 5) {
    gaps.push("eligible_population_count must meet the aggregate safety floor");
  }
  if (responseCount === null || responseCount < 5) {
    gaps.push("response_count must meet the aggregate safety floor");
  }
  if (
    responseCount !== null &&
    eligiblePopulationCount !== null &&
    responseCount > eligiblePopulationCount
  ) {
    gaps.push("response_count must not exceed eligible_population_count");
  }
  if (responseRate === null || responseRate < 0 || responseRate > 1) {
    gaps.push("response_rate must be between 0 and 1");
  }
  const forbiddenFields = [...collectForbiddenFields(value), ...collectForbiddenFields(snapshot)];
  if (forbiddenFields.length > 0) {
    gaps.push(`forbidden person-level or unsafe fields present: ${forbiddenFields.sort().join(", ")}`);
  }
  const unsafeValues = collectUnsafeValues(value);
  if (unsafeValues.length > 0) {
    gaps.push("unsafe source values present");
  }

  const approved =
    snapshot.suppression_state === "none" &&
    snapshot.owner_approval_state === "approved" &&
    (snapshot.review_state === "approved_for_model_context" ||
      snapshot.review_state === "approved_for_import");
  const valid = gaps.length === 0;

  return {
    schema_version: RESULT_SCHEMA_VERSION,
    snapshot_id: snapshot.snapshot_id ?? null,
    valid,
    gaps,
    feeds: {
      longitudinal_model_context: valid && approved,
      full_fluency_measurement_model: false,
      measurement_cell_direct_feed: false,
      confidence_model: false,
      customer_facing_financial_output: false
    }
  };
}
