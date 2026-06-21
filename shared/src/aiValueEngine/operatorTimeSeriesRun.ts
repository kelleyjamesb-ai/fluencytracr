/**
 * AI Value Engine - Operator Time-Series Run.
 *
 * Contract-only wrapper for repeated Operator Intake Adapter runs across
 * governed measurement windows. It prepares metadata-only time-series run
 * references for future confidence-model design review. It does not execute a
 * confidence model, feed finance-context investigation, calculate ROI, prove
 * causality, emit probabilities, create routes/UI, persist data, or parse raw
 * source files.
 */

import {
  buildOperatorIntakeAdapterRun,
  validateOperatorIntakeAdapterRun,
  type BuildOperatorIntakeAdapterRunInput,
  type OperatorIntakeAdapterRunValidationResult
} from "./operatorIntakeAdapter";

export const AI_VALUE_OPERATOR_TIME_SERIES_RUN_SCHEMA_VERSION =
  "FT_AI_VALUE_OPERATOR_TIME_SERIES_RUN_2026_06";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_OPERATOR_TIME_SERIES_RUN_VALIDATION_2026_06";

const DERIVATION_VERSION =
  "ai_value_operator_time_series_run_2026_06";

const REQUIRED_MILESTONE_DAYS = [0, 30, 60, 90, 180, 365];

const ALLOWED_WINDOW_MODES = new Set([
  "milestone",
  "rolling_30_day"
]);

const ALLOWED_DECISIONS = new Set([
  "READY_FOR_CONFIDENCE_MODEL_DESIGN_REVIEW",
  "HELD_FOR_INSUFFICIENT_GOVERNED_RUNS",
  "HELD_FOR_SOURCE_REVIEW",
  "HELD_FOR_OPERATING_CONTEXT_ONLY",
  "BLOCKED"
]);

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

const REQUIRED_FALSE_BOUNDARY_FIELDS = [
  "persisted",
  "creates_migrations",
  "creates_prisma_schema",
  "creates_backend_routes",
  "creates_frontend_ui",
  "creates_ingestion_jobs",
  "runs_bigquery",
  "parses_uploaded_documents",
  "stores_raw_source_data",
  "computes_confidence",
  "emits_probability",
  "computes_roi",
  "emits_financial_attribution",
  "customer_facing_financial_output"
];

const ALLOWED_TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "series_id",
  "org_id",
  "client_id",
  "workflow_family",
  "function_area",
  "cohort_key",
  "decision",
  "time_windows",
  "operator_intake_runs",
  "governed_run_references",
  "validation_summary",
  "gaps",
  "missing_evidence",
  "time_series_readiness",
  "feeds",
  "allowed_uses",
  "blocked_uses",
  "boundary_policy",
  "required_caveats",
  "generated_at",
  "derivation_version"
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
  /department_ranking/i,
  /people_decisioning/i,
  /^confidence_percentage$/i,
  /^confidence_percent$/i,
  /^confidence_score$/i,
  /^confidence$/i,
  /^probability$/i,
  /^probability_score$/i,
  /probability_output/i,
  /contribution_probability/i,
  /contribution_likelihood/i,
  /^p_value$/i,
  /^roi_bot_assumptions?$/i,
  /^roi_sheet_assumptions?$/i,
  /^roi$/i,
  /realized_roi/i,
  /roi_(?:value|amount|calculation|result|impact)/i,
  /^ebita$/i,
  /^ebitda$/i,
  /ebitda_(?:value|amount|impact|calculation|result)/i,
  /financial_impact/i,
  /financial_attribution/i,
  /^financial_output$/i,
  /^customer_facing_financial_output$/i,
  /customer_facing_(?:financial|economic)_output_allowed/i,
  /financial_output_allowed/i,
  /causality_claim/i,
  /causal_proof/i,
  /productivity_claim/i,
  /productivity_lift/i,
  /^persisted$/i,
  /^creates_(?:migrations|prisma_schema|backend_routes?|frontend_ui|ingestion_jobs)$/i,
  /^backend_routes?$/i,
  /^backend_route$/i,
  /^frontend_ui$/i,
  /^persistence_table$/i,
  /^schema_ref$/i,
  /operator_override/i,
  /force_ready/i,
  /threshold/i,
  /new_suppression_reason/i,
  /new_canonical_event/i
];

const GOVERNED_KEY_ALLOWLIST = new Set([
  "blocked_uses",
  "boundary_policy",
  "feeds"
]);

const VALIDATED_CHILD_OBJECT_FIELDS = new Set([
  "operator_intake_run",
  "operator_intake_validation_result"
]);

const FALSE_BOUNDARY_CONTAINERS = new Set([
  "boundary_policy",
  "feeds",
  "persistence_policy",
  "privacy_boundary",
  "value_proof_policy"
]);

const UNSAFE_USE_VALUE_PATTERNS = [
  /^confidence_model_execution$/i,
  /^finance_context_investigation$/i,
  /^customer_facing_financial_output$/i,
  /^customer_facing_economic_output$/i,
  /^realized_roi$/i,
  /^roi$/i,
  /^financial_attribution$/i,
  /^probability_output$/i,
  /^productivity_claim$/i,
  /^causality_claim$/i
];

const UNSAFE_CLAIM_LANGUAGE_PATTERNS = [
  /\bproved?\s+(?:roi|savings|financial impact|ebita|ebitda|productivity|causality)\b/i,
  /\b(?:roi|savings|ebita|ebitda|financial impact|productivity lift)\b.{0,48}\b(?:due to|caused by|attributed to|from ai|by ai)\b/i,
  /\b(?:90|95|99)%\s+(?:confidence|probability)\b/i,
  /\bproductivity\s+lift\b/i,
  /\battribution\s+probability\b/i
];

export interface BuildOperatorTimeSeriesWindowInput {
  milestoneDay?: number | null;
  windowMode?: "milestone" | "rolling_30_day" | string;
  rollingWindowIndex?: number | null;
  operatorIntakeInput?: BuildOperatorIntakeAdapterRunInput;
  operatorIntakeRun?: any;
}

export interface BuildOperatorTimeSeriesRunInput {
  seriesId?: string;
  orgId: string;
  clientId: string;
  workflowFamily: string;
  functionArea: string;
  cohortKey: string;
  windows: BuildOperatorTimeSeriesWindowInput[];
  generatedAt?: string;
}

export interface OperatorTimeSeriesRunValidationResult {
  schema_version: string;
  series_id: string | null;
  org_id: string | null;
  client_id: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    operator_time_series_run: boolean;
    confidence_model: false;
    finance_context_investigation: false;
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

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function validationMatchesEmbedded(embedded: any, recomputed: any): boolean {
  return JSON.stringify(embedded ?? null) === JSON.stringify(recomputed ?? null);
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
    if (
      path.length === 2 &&
      path[0] === "time_windows" &&
      VALIDATED_CHILD_OBJECT_FIELDS.has(normalized)
    ) {
      continue;
    }
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

function collectUnsafeStringValues(
  value: any,
  values: Set<string> = new Set(),
  path: string[] = []
): Set<string> {
  if (typeof value === "string") {
    const normalized = normalizeKey(value);
    const inBlockedUses = path.map(normalizeKey).includes("blocked_uses");
    if (
      !inBlockedUses &&
      (UNSAFE_USE_VALUE_PATTERNS.some((pattern) => pattern.test(normalized)) ||
        UNSAFE_CLAIM_LANGUAGE_PATTERNS.some((pattern) => pattern.test(value)))
    ) {
      values.add(`${path.join(".")}: ${value}`);
    }
    return values;
  }
  if (!value || typeof value !== "object") return values;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectUnsafeStringValues(item, values, [...path, String(index)])
    );
    return values;
  }
  for (const [key, nested] of Object.entries(value)) {
    const normalized = normalizeKey(key);
    if (
      path.length === 2 &&
      path[0] === "time_windows" &&
      VALIDATED_CHILD_OBJECT_FIELDS.has(normalized)
    ) {
      continue;
    }
    collectUnsafeStringValues(nested, values, [...path, key]);
  }
  return values;
}

function falseFeeds(): OperatorTimeSeriesRunValidationResult["feeds"] {
  return {
    operator_time_series_run: false,
    confidence_model: false,
    finance_context_investigation: false,
    customer_facing_financial_output: false
  };
}

function feedState(
  run: any,
  valid: boolean
): OperatorTimeSeriesRunValidationResult["feeds"] {
  if (!valid) return falseFeeds();
  return {
    operator_time_series_run: run?.feeds?.operator_time_series_run === true,
    confidence_model: false,
    finance_context_investigation: false,
    customer_facing_financial_output: false
  };
}

function operatorRunForWindow(window: BuildOperatorTimeSeriesWindowInput): any {
  if (window.operatorIntakeRun) return window.operatorIntakeRun;
  if (!window.operatorIntakeInput) return null;
  return buildOperatorIntakeAdapterRun(window.operatorIntakeInput);
}

function timeWindowOf(operatorRun: any): any {
  return operatorRun?.measurement_cell_assembly_run?.measurement_cell?.time_window ??
    operatorRun?.measurement_cell_assembly_run?.measurement_cell_input?.timeWindow ??
    operatorRun?.time_series_readiness ??
    {};
}

function inferWindowMode(
  window: BuildOperatorTimeSeriesWindowInput,
  operatorRun: any
): string {
  return String(
    window.windowMode ??
    timeWindowOf(operatorRun)?.window_mode ??
    operatorRun?.time_series_readiness?.window_mode ??
    "milestone"
  );
}

function inferMilestoneDay(
  window: BuildOperatorTimeSeriesWindowInput,
  operatorRun: any
): number | null {
  if (typeof window.milestoneDay === "number") return window.milestoneDay;
  const days = Number(timeWindowOf(operatorRun)?.days_since_launch);
  return Number.isFinite(days) ? days : null;
}

function governedRunReference(
  operatorRun: any,
  windowMode: string,
  milestoneDay: number | null
): any {
  const readiness = operatorRun?.time_series_readiness ?? {};
  return {
    run_ref: `governed_operator_run_ref_${safeIdPart(operatorRun?.run_id ?? "missing")}`,
    operator_run_id: operatorRun?.run_id ?? null,
    measurement_cell_id: readiness.measurement_cell_id ?? null,
    measurement_cell_assembly_run_id:
      readiness.measurement_cell_assembly_run_id ??
      operatorRun?.measurement_cell_assembly_run?.run_id ??
      null,
    window_mode: windowMode,
    milestone_day: milestoneDay,
    baseline_window: readiness.baseline_window ?? operatorRun?.data_spine_readiness?.baseline_window ?? null,
    comparison_window: readiness.comparison_window ?? operatorRun?.data_spine_readiness?.comparison_window ?? null,
    source_refs: {
      data_spine_readiness_id:
        operatorRun?.data_spine_readiness?.data_spine_readiness_id ?? null,
      source_package_review_queue_id:
        operatorRun?.source_package_review_queue?.source_package_review_queue_id ?? null,
      real_data_intake_run_id:
        operatorRun?.real_data_intake_packet_run?.run_id ?? null
    },
    confidence_model_feed: false,
    finance_context_investigation_feed: false
  };
}

function windowRecord(
  window: BuildOperatorTimeSeriesWindowInput,
  index: number
): any {
  const operatorRun = operatorRunForWindow(window);
  const operatorValidation = operatorRun
    ? validateOperatorIntakeAdapterRun(operatorRun)
    : {
        schema_version: "missing",
        run_id: null,
        org_id: null,
        client_id: null,
        valid: false,
        gaps: ["operator intake run is missing"],
        feeds: {
          data_spine_readiness: false,
          source_package_review_queue: false,
          real_data_intake_packet_run: false,
          measurement_cell_assembly_run: false,
          value_hypothesis_packet_runner: false,
          finance_context_investigation: false,
          confidence_model: false,
          customer_facing_financial_output: false
        }
      };
  const windowMode = inferWindowMode(window, operatorRun);
  const milestoneDay = inferMilestoneDay(window, operatorRun);
  const readiness = operatorRun?.time_series_readiness ?? {};
  const governedRunReferenceReady =
    operatorValidation.valid === true &&
    operatorRun?.decision === "READY_FOR_VALUE_HYPOTHESIS_PACKET_PREPARATION" &&
    readiness.governed_run_reference_ready === true;
  const reference = governedRunReferenceReady
    ? governedRunReference(operatorRun, windowMode, milestoneDay)
    : null;
  const windowId = windowMode === "rolling_30_day"
    ? `rolling_30_day_${window.rollingWindowIndex ?? index + 1}`
    : `day_${milestoneDay ?? index}`;

  return {
    window_id: windowId,
    window_mode: windowMode,
    milestone_day: milestoneDay,
    rolling_window_index: window.rollingWindowIndex ?? null,
    baseline_window: readiness.baseline_window ?? operatorRun?.data_spine_readiness?.baseline_window ?? null,
    comparison_window: readiness.comparison_window ?? operatorRun?.data_spine_readiness?.comparison_window ?? null,
    operator_run_id: operatorRun?.run_id ?? null,
    operator_decision: operatorRun?.decision ?? "BLOCKED",
    governed_run_reference_ready: governedRunReferenceReady,
    governed_run_reference: reference,
    operator_intake_run: operatorRun,
    operator_intake_validation_result: operatorValidation,
    gaps: operatorValidation.valid ? [] : stringsOf(operatorValidation.gaps),
    missing_evidence: governedRunReferenceReady
      ? []
      : [`WINDOW_DAY_${milestoneDay ?? index}_NOT_GOVERNED_RUN_REFERENCE_READY`]
  };
}

function structuralWindowGaps(series: any): string[] {
  const gaps: string[] = [];
  const windows = Array.isArray(series?.time_windows) ? series.time_windows : [];
  if (windows.length === 0) {
    gaps.push("time_windows must include at least one window");
    return gaps;
  }
  const modes = new Set<string>(windows.map((window: any) => String(window.window_mode)));
  for (const mode of modes) {
    if (!ALLOWED_WINDOW_MODES.has(mode)) {
      gaps.push(`unsupported window_mode ${mode}`);
    }
  }
  if (modes.size > 1) {
    gaps.push("time_windows cannot mix milestone and rolling_30_day modes in one series");
  }
  const milestoneWindows = windows.filter((window: any) => window.window_mode === "milestone");
  const seenMilestones = new Set<number>();
  let previousMilestone: number | null = null;
  for (const window of milestoneWindows) {
    if (
      typeof window.milestone_day !== "number" ||
      !Number.isFinite(window.milestone_day)
    ) {
      gaps.push(`milestone window ${window.window_id} requires numeric milestone_day`);
      continue;
    }
    const milestoneDay = window.milestone_day;
    if (!REQUIRED_MILESTONE_DAYS.includes(milestoneDay)) {
      gaps.push(`unsupported milestone day ${milestoneDay}`);
    }
    if (seenMilestones.has(milestoneDay)) {
      gaps.push(`repeated milestone day ${milestoneDay}`);
    }
    if (previousMilestone !== null && milestoneDay <= previousMilestone) {
      gaps.push("milestone windows must be ordered by increasing milestone_day");
    }
    seenMilestones.add(milestoneDay);
    previousMilestone = milestoneDay;
  }
  const rollingWindows = windows.filter((window: any) => window.window_mode === "rolling_30_day");
  let previousRollingIndex: number | null = null;
  for (const [index, window] of rollingWindows.entries()) {
    const rollingIndex = Number(window.rolling_window_index ?? index + 1);
    if (!Number.isFinite(rollingIndex) || rollingIndex < 1) {
      gaps.push(`rolling window ${window.window_id} requires a positive rolling_window_index`);
    }
    if (previousRollingIndex !== null && rollingIndex <= previousRollingIndex) {
      gaps.push("rolling_30_day windows must be ordered by increasing rolling_window_index");
    }
    previousRollingIndex = rollingIndex;
  }
  return gaps;
}

function identityGaps(series: any): string[] {
  const gaps: string[] = [];
  const checks = [
    ["org_id", series?.org_id],
    ["client_id", series?.client_id],
    ["workflow_family", series?.workflow_family],
    ["function_area", series?.function_area],
    ["cohort_key", series?.cohort_key]
  ];
  for (const window of series?.time_windows ?? []) {
    const run = window?.operator_intake_run;
    for (const [field, expected] of checks) {
      if (run?.[field] !== expected) {
        gaps.push(`time_windows.${window.window_id}.operator_intake_run.${field} must match series ${field}`);
      }
    }
  }
  return gaps;
}

function recomputedValidationGaps(series: any): string[] {
  const gaps: string[] = [];
  for (const window of series?.time_windows ?? []) {
    if (!window?.operator_intake_run) continue;
    const recomputed = validateOperatorIntakeAdapterRun(window.operator_intake_run);
    if (!validationMatchesEmbedded(window.operator_intake_validation_result, recomputed)) {
      gaps.push(`time_windows.${window.window_id}.operator_intake_validation_result must match recomputed Operator Intake validation`);
    }
  }
  return gaps;
}

function referenceFromWindow(window: any): any {
  if (window?.governed_run_reference_ready !== true) return null;
  return governedRunReference(
    window?.operator_intake_run,
    window?.window_mode,
    window?.milestone_day
  );
}

function compactReference(reference: any): any {
  if (!reference) return null;
  return {
    run_ref: reference.run_ref ?? null,
    operator_run_id: reference.operator_run_id ?? null,
    measurement_cell_id: reference.measurement_cell_id ?? null,
    measurement_cell_assembly_run_id: reference.measurement_cell_assembly_run_id ?? null,
    window_mode: reference.window_mode ?? null,
    milestone_day: reference.milestone_day ?? null,
    baseline_window: reference.baseline_window ?? null,
    comparison_window: reference.comparison_window ?? null,
    source_refs: reference.source_refs ?? null,
    confidence_model_feed: reference.confidence_model_feed ?? null,
    finance_context_investigation_feed: reference.finance_context_investigation_feed ?? null
  };
}

function derivedSurfaceGaps(series: any): string[] {
  const gaps: string[] = [];
  const windows = Array.isArray(series?.time_windows) ? series.time_windows : [];
  const expectedReferences = windows
    .map(referenceFromWindow)
    .filter(Boolean)
    .map(compactReference);
  const actualReferences = Array.isArray(series?.governed_run_references)
    ? series.governed_run_references.map(compactReference)
    : [];
  if (!validationMatchesEmbedded(actualReferences, expectedReferences)) {
    gaps.push("governed_run_references must match time_windows governed references");
  }
  const expectedOperatorSummaries = windows.map((window: any) => ({
    window_id: window.window_id,
    operator_run_id: window.operator_run_id,
    operator_decision: window.operator_decision,
    validation_valid: window.operator_intake_validation_result?.valid,
    governed_run_reference_ready: window.governed_run_reference_ready
  }));
  if (!validationMatchesEmbedded(series?.operator_intake_runs, expectedOperatorSummaries)) {
    gaps.push("operator_intake_runs must match time_windows operator summaries");
  }
  const structuralGaps = structuralWindowGaps(series);
  const identityDrift = identityGaps(series);
  const expectedSummary = {
    total_windows: windows.length,
    governed_run_reference_ready_windows: expectedReferences.length,
    held_windows: windows.filter((window: any) => !window.governed_run_reference_ready).length,
    invalid_windows: windows.filter((window: any) => !window.operator_intake_validation_result?.valid).length,
    structural_gaps: uniqueStrings([...structuralGaps, ...identityDrift])
  };
  if (!validationMatchesEmbedded(series?.validation_summary, expectedSummary)) {
    gaps.push("validation_summary must match recomputed time_windows summary");
  }
  return gaps;
}

function childWindowModeGaps(series: any): string[] {
  const gaps: string[] = [];
  for (const window of series?.time_windows ?? []) {
    const childMode = String(
      timeWindowOf(window?.operator_intake_run)?.window_mode ??
      window?.operator_intake_run?.time_series_readiness?.window_mode ??
      ""
    );
    if (childMode && window?.window_mode !== childMode) {
      gaps.push(`time_windows.${window.window_id}.window_mode must match child operator intake window mode`);
    }
    if (window?.governed_run_reference?.window_mode && window.governed_run_reference.window_mode !== window?.window_mode) {
      gaps.push(`time_windows.${window.window_id}.governed_run_reference.window_mode must match window_mode`);
    }
  }
  return gaps;
}

function topLevelGaps(series: any): string[] {
  const gaps: string[] = [];
  if (!series || typeof series !== "object" || Array.isArray(series)) {
    return ["operator time-series run must be an object"];
  }
  for (const field of [
    "schema_version",
    "series_id",
    "org_id",
    "client_id",
    "workflow_family",
    "function_area",
    "cohort_key",
    "decision",
    "time_windows",
    "operator_intake_runs",
    "governed_run_references",
    "validation_summary",
    "gaps",
    "missing_evidence",
    "time_series_readiness",
    "feeds",
    "allowed_uses",
    "blocked_uses",
    "boundary_policy",
    "required_caveats",
    "generated_at",
    "derivation_version"
  ]) {
    if (series?.[field] === undefined || series?.[field] === null || series?.[field] === "") {
      gaps.push(`${field} is missing`);
    }
  }
  if (
    series?.schema_version &&
    series.schema_version !== AI_VALUE_OPERATOR_TIME_SERIES_RUN_SCHEMA_VERSION
  ) {
    gaps.push(`schema_version is invalid: ${series.schema_version}`);
  }
  if (series?.decision && !ALLOWED_DECISIONS.has(String(series.decision))) {
    gaps.push(`decision is invalid: ${series.decision}`);
  }
  for (const field of Object.keys(series ?? {})) {
    if (!ALLOWED_TOP_LEVEL_FIELDS.has(field)) {
      gaps.push(`Unsupported operator time-series run field: ${field}`);
    }
  }
  return gaps;
}

function policyGaps(series: any): string[] {
  const gaps: string[] = [];
  for (const use of REQUIRED_BLOCKED_USES) {
    if (!stringsOf(series?.blocked_uses).includes(use)) {
      gaps.push(`blocked_uses missing ${use}`);
    }
  }
  for (const field of REQUIRED_FALSE_BOUNDARY_FIELDS) {
    if (series?.boundary_policy?.[field] !== false) {
      gaps.push(`boundary_policy.${field} must be false`);
    }
  }
  for (const field of [
    "confidence_model",
    "finance_context_investigation",
    "customer_facing_financial_output"
  ]) {
    if (series?.feeds?.[field] !== false) {
      gaps.push(`feeds.${field} must be false`);
    }
  }
  for (const field of [...collectForbiddenFields(series)].sort()) {
    gaps.push(`Forbidden field detected: ${field}`);
  }
  for (const value of [...collectUnsafeStringValues(series)].sort()) {
    gaps.push(`Unsafe claim language detected: ${value}`);
  }
  return gaps;
}

function decisionGaps(series: any): string[] {
  const gaps: string[] = [];
  const structuralGaps = structuralWindowGaps(series);
  const identityDrift = identityGaps(series);
  const nestedInvalid = (series?.time_windows ?? []).some((window: any) =>
    window?.operator_intake_validation_result?.valid === false
  );
  const rollingOnly = series?.time_series_readiness?.rolling_30_day_context_only === true;
  const completeMilestone = series?.time_series_readiness?.complete_milestone_series === true;
  const allGoverned = (series?.time_windows ?? []).every((window: any) =>
    window?.governed_run_reference_ready === true
  );
  const missingMilestoneEvidence = stringsOf(series?.missing_evidence).some((item) =>
    /^MISSING_MILESTONE_DAY_/i.test(item)
  );

  if (series?.decision === "READY_FOR_CONFIDENCE_MODEL_DESIGN_REVIEW") {
    if (structuralGaps.length || identityDrift.length || nestedInvalid) {
      gaps.push("ready time-series requires valid aligned operator windows");
    }
    if (!completeMilestone || rollingOnly || !allGoverned) {
      gaps.push("ready time-series requires a complete governed milestone series");
    }
  }
  if (nestedInvalid) {
    gaps.push("invalid child operator intake runs cannot validate");
  }
  if (series?.decision === "HELD_FOR_INSUFFICIENT_GOVERNED_RUNS" && !missingMilestoneEvidence) {
    gaps.push("HELD_FOR_INSUFFICIENT_GOVERNED_RUNS requires missing milestone evidence");
  }
  if (series?.decision === "HELD_FOR_OPERATING_CONTEXT_ONLY" && !rollingOnly) {
    gaps.push("HELD_FOR_OPERATING_CONTEXT_ONLY requires rolling_30_day context");
  }
  if (series?.decision === "HELD_FOR_SOURCE_REVIEW" && allGoverned) {
    gaps.push("HELD_FOR_SOURCE_REVIEW requires at least one uncleared operator window");
  }
  if (series?.decision === "BLOCKED" && series?.feeds?.operator_time_series_run === true) {
    gaps.push("blocked operator time-series runs cannot feed operator_time_series_run");
  }
  return gaps;
}

function missingMilestones(windows: any[]): string[] {
  const present = new Set(
    windows
      .filter((window) => window.window_mode === "milestone")
      .map((window) => window.milestone_day)
      .filter((day) => typeof day === "number" && Number.isFinite(day))
  );
  return REQUIRED_MILESTONE_DAYS
    .filter((day) => !present.has(day))
    .map((day) => `MISSING_MILESTONE_DAY_${day}`);
}

function seriesDecision(windows: any[], structuralGaps: string[], identityDrift: string[]): string {
  if (structuralGaps.length || identityDrift.length) return "BLOCKED";
  const modes = new Set<string>(windows.map((window) => String(window.window_mode)));
  const nestedInvalid = windows.some((window) =>
    window.operator_intake_validation_result?.valid === false
  );
  if (nestedInvalid) return "BLOCKED";
  if (modes.size === 1 && modes.has("rolling_30_day")) {
    return "HELD_FOR_OPERATING_CONTEXT_ONLY";
  }
  if (windows.some((window) => window.governed_run_reference_ready !== true)) {
    return "HELD_FOR_SOURCE_REVIEW";
  }
  if (missingMilestones(windows).length > 0) {
    return "HELD_FOR_INSUFFICIENT_GOVERNED_RUNS";
  }
  return "READY_FOR_CONFIDENCE_MODEL_DESIGN_REVIEW";
}

function feedsForDecision(decision: string): OperatorTimeSeriesRunValidationResult["feeds"] {
  return {
    operator_time_series_run: decision !== "BLOCKED",
    confidence_model: false,
    finance_context_investigation: false,
    customer_facing_financial_output: false
  };
}

export function buildOperatorTimeSeriesRun(input: BuildOperatorTimeSeriesRunInput): any {
  const windows = (input.windows ?? []).map(windowRecord);
  const structuralGaps = structuralWindowGaps({ time_windows: windows });
  const identityDrift = identityGaps({
    ...input,
    org_id: input.orgId,
    client_id: input.clientId,
    workflow_family: input.workflowFamily,
    function_area: input.functionArea,
    cohort_key: input.cohortKey,
    time_windows: windows
  });
  const decision = seriesDecision(windows, structuralGaps, identityDrift);
  const missing = uniqueStrings([
    ...windows.flatMap((window) => stringsOf(window.missing_evidence)),
    ...missingMilestones(windows)
  ]);
  const governedReferences = windows
    .map((window) => window.governed_run_reference)
    .filter(Boolean);
  const rollingOnly =
    windows.length > 0 &&
    windows.every((window) => window.window_mode === "rolling_30_day");

  return {
    schema_version: AI_VALUE_OPERATOR_TIME_SERIES_RUN_SCHEMA_VERSION,
    series_id: input.seriesId ??
      `operator_time_series_run_${safeIdPart(input.orgId ?? "unknown_org")}_${safeIdPart(input.workflowFamily ?? "unknown_workflow")}`,
    org_id: input.orgId,
    client_id: input.clientId,
    workflow_family: input.workflowFamily,
    function_area: input.functionArea,
    cohort_key: input.cohortKey,
    decision,
    time_windows: windows,
    operator_intake_runs: windows.map((window) => ({
      window_id: window.window_id,
      operator_run_id: window.operator_run_id,
      operator_decision: window.operator_decision,
      validation_valid: window.operator_intake_validation_result.valid,
      governed_run_reference_ready: window.governed_run_reference_ready
    })),
    governed_run_references: governedReferences,
    validation_summary: {
      total_windows: windows.length,
      governed_run_reference_ready_windows: governedReferences.length,
      held_windows: windows.filter((window) => !window.governed_run_reference_ready).length,
      invalid_windows: windows.filter((window) => !window.operator_intake_validation_result.valid).length,
      structural_gaps: uniqueStrings([...structuralGaps, ...identityDrift])
    },
    gaps: uniqueStrings([
      ...structuralGaps,
      ...identityDrift,
      ...windows.flatMap((window) => stringsOf(window.gaps).map((gap) => `${window.window_id}: ${gap}`))
    ]),
    missing_evidence: missing,
    time_series_readiness: {
      required_milestone_days: [...REQUIRED_MILESTONE_DAYS],
      complete_milestone_series: !rollingOnly && missingMilestones(windows).length === 0,
      rolling_30_day_context_only: rollingOnly,
      governed_run_reference_count: governedReferences.length,
      confidence_model_design_review_candidate:
        decision === "READY_FOR_CONFIDENCE_MODEL_DESIGN_REVIEW",
      confidence_model_feed: false,
      finance_context_investigation_feed: false,
      note:
        "Operator time-series run references are confidence-model candidate input for later design review only; no confidence, probability, ROI, causality, productivity, financial attribution, or customer-facing financial output is emitted."
    },
    feeds: feedsForDecision(decision),
    allowed_uses: [
      "operator_time_series_review",
      "governed_run_reference_preparation",
      "confidence_model_design_review_input"
    ],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    boundary_policy: Object.fromEntries(
      REQUIRED_FALSE_BOUNDARY_FIELDS.map((field) => [field, false])
    ),
    required_caveats: [
      "Operator time-series runs compose already-parsed aggregate-safe Operator Intake Adapter runs only.",
      "Milestone windows are governed run references for later confidence-model design review, not confidence output.",
      "Rolling 30-day windows are operating context only and cannot feed finance-context investigation or confidence-model execution.",
      "No ROI, EBITA, EBITDA, causality, productivity, financial attribution, confidence percentage, probability, person-level output, ranking, or customer-facing financial output is produced."
    ],
    generated_at: input.generatedAt ?? new Date(0).toISOString(),
    derivation_version: DERIVATION_VERSION
  };
}

export function validateOperatorTimeSeriesRun(
  run: any
): OperatorTimeSeriesRunValidationResult {
  const gaps = [
    ...topLevelGaps(run),
    ...policyGaps(run),
    ...structuralWindowGaps(run),
    ...identityGaps(run),
    ...recomputedValidationGaps(run),
    ...derivedSurfaceGaps(run),
    ...childWindowModeGaps(run),
    ...decisionGaps(run)
  ];
  const valid = gaps.length === 0 && run?.decision !== "BLOCKED";
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    series_id: run?.series_id ?? null,
    org_id: run?.org_id ?? null,
    client_id: run?.client_id ?? null,
    valid,
    gaps,
    feeds: feedState(run, valid)
  };
}
