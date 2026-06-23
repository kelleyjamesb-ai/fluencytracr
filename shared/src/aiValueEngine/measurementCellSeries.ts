/**
 * AI Value Engine - Measurement Cell Series.
 *
 * Contract-only continuity layer over repeated Measurement Cell Assembly
 * outputs. It emits compact Measurement Cell references, alignment metadata,
 * and evidence-continuity status only. It does not calculate trends, execute
 * confidence models, feed finance-context investigation, create routes/UI,
 * persist data, or emit ROI, causality, productivity, probability, or
 * customer-facing financial output.
 */

import {
  validateMeasurementCellAssemblyRun,
  type MeasurementCellAssemblyRunValidationResult
} from "./measurementCellAssemblyRunner";

export const AI_VALUE_MEASUREMENT_CELL_SERIES_SCHEMA_VERSION =
  "FT_AI_VALUE_MEASUREMENT_CELL_SERIES_2026_06";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_MEASUREMENT_CELL_SERIES_VALIDATION_2026_06";

const DERIVATION_VERSION =
  "ai_value_measurement_cell_series_2026_06";

const COMPLETE_DECISION = "CONTINUITY_COVERAGE_COMPLETE";
const HELD_DECISION = "HELD_FOR_EVIDENCE_CONTINUITY";
const BLOCKED_DECISION = "BLOCKED";

const REQUIRED_MILESTONE_DAYS = [0, 30, 60, 90, 180, 365];

const REQUIRED_ALLOWED_USES = [
  "internal_measurement_cell_series_review",
  "operator_time_series_preparation_compatibility_review"
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
  "measurement_cell_direct_feed",
  "finance_context_investigation",
  "confidence_model_execution",
  "confidence_percentage",
  "probability_output",
  "customer_facing_financial_output"
];

const REQUIRED_FALSE_BOUNDARY_FIELDS = [
  "persisted",
  "creates_migrations",
  "creates_prisma_schema",
  "creates_schemas",
  "creates_backend_routes",
  "creates_frontend_ui",
  "creates_ingestion_jobs",
  "runs_bigquery",
  "runs_glean_query",
  "parses_uploaded_documents",
  "stores_raw_source_data",
  "computes_trend",
  "computes_confidence",
  "emits_probability",
  "computes_roi",
  "emits_financial_attribution",
  "feeds_measurement_cell_directly",
  "feeds_confidence_model",
  "feeds_finance_context_investigation",
  "customer_facing_financial_output"
];

const REQUIRED_FEED_FIELDS = [
  "internal_series_review",
  "operator_time_series_preparation_compatibility",
  "measurement_cell_direct_feed",
  "confidence_model",
  "finance_context_investigation",
  "customer_facing_financial_output"
];

const ALLOWED_DECISIONS = new Set([
  COMPLETE_DECISION,
  HELD_DECISION,
  BLOCKED_DECISION
]);

const ALLOWED_TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "measurement_cell_series_id",
  "org_id",
  "client_id",
  "workflow_family",
  "function_area",
  "cohort_key",
  "decision",
  "measurement_cell_windows",
  "repeated_measurement_cell_refs",
  "evidence_continuity_manifest",
  "alignment_manifest",
  "operator_time_series_compatibility",
  "gaps",
  "missing_evidence",
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
  /raw_(?:prompt|response|transcript|content|file|export|event|row|rows)/i,
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
  /confidence_model/i,
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
  /roi_(?:value|amount|calculation|result|impact|proof)/i,
  /^ebita$/i,
  /^ebitda$/i,
  /ebitda_(?:value|amount|impact|calculation|result)/i,
  /financial_impact/i,
  /financial_attribution/i,
  /^financial_output$/i,
  /finance_context(?:_investigation)?(?:_ready|_feed|_output)?/i,
  /^customer_facing_financial_output$/i,
  /customer_facing_(?:financial|economic)_output_allowed/i,
  /financial_output_allowed/i,
  /causality_claim/i,
  /causal_proof/i,
  /productivity_claim/i,
  /productivity_lift/i,
  /^measurement_cell_direct_feed$/i,
  /^measurement_cell$/i,
  /^measurement_cell_input$/i,
  /^data_spine_readiness$/i,
  /^source_package_review_queue$/i,
  /^real_data_intake_packet_run$/i,
  /^measurement_cell_assembly_run$/i,
  /^persisted$/i,
  /^creates_(?:migrations|prisma_schema|schemas|backend_routes?|frontend_ui|ingestion_jobs)$/i,
  /^backend_routes?$/i,
  /^backend_route$/i,
  /^frontend_ui$/i,
  /^persistence_table$/i,
  /^schema_ref$/i,
  /operator_override/i,
  /admin_override/i,
  /force_ready/i,
  /threshold/i,
  /new_suppression_reason/i,
  /new_canonical_event/i
];

const GOVERNED_KEY_ALLOWLIST = new Set([
  "blocked_uses",
  "boundary_policy",
  "feeds",
  "required_caveats"
]);

const FALSE_BOUNDARY_CONTAINERS = new Set([
  "alignment_manifest",
  "boundary_policy",
  "feeds",
  "operator_time_series_compatibility",
  "persistence_policy",
  "privacy_boundary",
  "value_proof_policy"
]);

const UNSAFE_ALLOWED_USE_PATTERNS = [
  /^confidence_model/i,
  /^finance_context/i,
  /^customer_facing_(?:financial|economic)_output$/i,
  /^realized_roi$/i,
  /^roi$/i,
  /^financial_attribution$/i,
  /^probability_output$/i,
  /^productivity_claim$/i,
  /^causality_claim$/i,
  /^measurement_cell_direct_feed$/i
];

const UNSAFE_SOURCE_REF_VALUE_PATTERNS = [
  /raw[_-\s]?(?:row|rows|prompt|response|transcript|content|file|export|event)/i,
  /query[_-\s]?text/i,
  /sql[_-\s]?text/i,
  /user[_-\s]?id/i,
  /person[_-\s]?id/i,
  /employee[_-\s]?(?:id|email|name)/i,
  /respondent[_-\s]?(?:id|email|name)/i,
  /roi/i,
  /ebita/i,
  /ebitda/i,
  /confidence/i,
  /probability/i,
  /finance[_-\s]?context/i,
  /customer[_-\s]?facing[_-\s]?(?:financial|economic)/i
];

const UNSAFE_CLAIM_LANGUAGE_PATTERNS = [
  /\bproved?\s+(?:roi|savings|financial impact|ebita|ebitda|productivity|causality)\b/i,
  /\b(?:roi|savings|ebita|ebitda|financial impact|productivity lift)\b.{0,48}\b(?:due to|caused by|attributed to|from ai|by ai)\b/i,
  /\b\d{1,3}%\s+(?:confidence|probability)\b/i,
  /\b(?:confidence|probability)\s*(?:score|level)?\s*(?:of|=|:)?\s*0?\.\d+\b/i,
  /\bAI\s+contribution\s+confidence\b/i,
  /\bfinance[-_\s]?context\b.{0,40}\b(?:ready|approved|feed|output|customer-facing)\b/i,
  /\b(?:roi|ebita|ebitda|payback|business case|financial output|financial attribution)[-_ ]?(?:ready|approved|validated|proof|claim|output)?\b/i,
  /\$\s*\d[\d,.]*(?:[kmb])?\s*(?:savings|roi|ebita|ebitda|financial impact|payback)\b/i,
  /\bproductivity\s+lift\b/i,
  /\battribution\s+probability\b/i
];

export interface BuildMeasurementCellSeriesWindowInput {
  milestoneDay?: number | null;
  measurementCellAssemblyRun?: any;
  measurementCellAssemblyValidationResult?:
    | MeasurementCellAssemblyRunValidationResult
    | null;
}

export interface BuildMeasurementCellSeriesInput {
  measurementCellSeriesId?: string;
  orgId: string;
  clientId: string;
  workflowFamily: string;
  functionArea: string;
  cohortKey: string;
  windows: BuildMeasurementCellSeriesWindowInput[];
  generatedAt?: string;
}

export interface MeasurementCellSeriesValidationResult {
  schema_version: string;
  measurement_cell_series_id: string | null;
  org_id: string | null;
  client_id: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    internal_series_review: boolean;
    operator_time_series_preparation_compatibility: boolean;
    measurement_cell_direct_feed: false;
    confidence_model: false;
    finance_context_investigation: false;
    customer_facing_financial_output: false;
  };
}

type SeriesFeeds = MeasurementCellSeriesValidationResult["feeds"];

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

function validationMatchesEmbedded(left: any, right: any): boolean {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function deepClone<T>(value: T): T {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value));
}

function numberOrNull(value: any): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }
  return null;
}

function falseFeeds(): SeriesFeeds {
  return {
    internal_series_review: false,
    operator_time_series_preparation_compatibility: false,
    measurement_cell_direct_feed: false,
    confidence_model: false,
    finance_context_investigation: false,
    customer_facing_financial_output: false
  };
}

function feedsForDecision(decision: string): SeriesFeeds {
  if (decision !== COMPLETE_DECISION) return falseFeeds();
  return {
    internal_series_review: true,
    operator_time_series_preparation_compatibility: true,
    measurement_cell_direct_feed: false,
    confidence_model: false,
    finance_context_investigation: false,
    customer_facing_financial_output: false
  };
}

function feedState(series: any, valid: boolean): SeriesFeeds {
  if (!valid) return falseFeeds();
  return {
    internal_series_review: series?.feeds?.internal_series_review === true,
    operator_time_series_preparation_compatibility:
      series?.feeds?.operator_time_series_preparation_compatibility === true,
    measurement_cell_direct_feed: false,
    confidence_model: false,
    finance_context_investigation: false,
    customer_facing_financial_output: false
  };
}

function expectedCompatibility(decision: string): any {
  const complete = decision === COMPLETE_DECISION;
  return {
    compatible_with_operator_time_series_preparation: complete,
    compatibility_scope:
      "metadata_only_measurement_cell_reference_preparation",
    existing_operator_time_series_contract:
      "docs/contracts/ai-value-operator-time-series-run/README.md",
    existing_operator_evidence_package_contract:
      "docs/contracts/ai-value-operator-evidence-package-runner/README.md",
    creates_parallel_orchestration_object: false,
    creates_operator_time_series_run: false,
    confidence_model_feed: false,
    finance_context_investigation_feed: false,
    customer_facing_financial_output_feed: false,
    roi_or_financial_output_ready: false
  };
}

function sourceRefsFromAssemblyRun(run: any): any {
  const cell = run?.measurement_cell ?? {};
  const input = run?.measurement_cell_input ?? {};
  const spine = run?.data_spine_readiness?.source_readiness ?? {};
  return {
    blueprint_source_ref:
      cell?.source_refs?.blueprint_source_ref ??
      input?.blueprintAlignment?.source_ref ??
      spine?.blueprint?.source_ref ??
      null,
    ai_fluency_source_ref:
      cell?.source_refs?.ai_fluency_source_ref ??
      input?.aiFluencyContext?.source_ref ??
      spine?.ai_fluency?.source_ref ??
      null,
    vbd_source_ref:
      cell?.source_refs?.vbd_source_ref ??
      input?.vbdContext?.source_ref ??
      spine?.vbd_token?.source_ref ??
      null,
    metric_source_ref:
      cell?.source_refs?.metric_source_ref ??
      input?.selectedMetric?.source_ref ??
      spine?.customer_metric?.source_ref ??
      null,
    token_source_ref:
      cell?.source_refs?.token_source_ref ??
      input?.tokenContext?.source_ref ??
      spine?.vbd_token?.source_ref ??
      null
  };
}

function expectedSourceRefsFromRun(run: any): any {
  const input = run?.measurement_cell_input ?? {};
  const spine = run?.data_spine_readiness?.source_readiness ?? {};
  return {
    blueprint_source_ref:
      input?.blueprintAlignment?.source_ref ??
      spine?.blueprint?.source_ref ??
      null,
    ai_fluency_source_ref:
      input?.aiFluencyContext?.source_ref ??
      spine?.ai_fluency?.source_ref ??
      null,
    vbd_source_ref:
      input?.vbdContext?.source_ref ??
      spine?.vbd_token?.source_ref ??
      null,
    metric_source_ref:
      input?.selectedMetric?.source_ref ??
      spine?.customer_metric?.source_ref ??
      null,
    token_source_ref:
      input?.tokenContext?.source_ref ??
      spine?.vbd_token?.source_ref ??
      null
  };
}

function metricIdOf(run: any): string | null {
  return run?.measurement_cell?.selected_metric?.metric_id ??
    run?.measurement_cell_input?.selectedMetric?.metric_id ??
    run?.data_spine_readiness?.source_readiness?.customer_metric?.metric_id ??
    null;
}

function expectationPathIdOf(run: any): string | null {
  return run?.measurement_cell?.blueprint_alignment?.expectation_path_id ??
    run?.measurement_cell_input?.blueprintAlignment?.expectation_path_id ??
    null;
}

function windowOf(run: any): any {
  return run?.measurement_cell?.time_window ??
    run?.measurement_cell_input?.timeWindow ??
    {};
}

function milestoneDayOf(
  window: BuildMeasurementCellSeriesWindowInput,
  run: any
): number | null {
  if (typeof window.milestoneDay === "number") return window.milestoneDay;
  const rawDays = windowOf(run)?.days_since_launch;
  return numberOrNull(rawDays);
}

function missingEvidenceOf(run: any): string[] {
  return uniqueStrings([
    ...stringsOf(run?.missing_evidence),
    ...stringsOf(run?.data_spine_readiness?.missing_evidence),
    ...stringsOf(run?.source_package_review_queue?.missing_evidence)
  ]);
}

function runHasSuppression(run: any): boolean {
  const values: string[] = [
    run?.decision,
    ...missingEvidenceOf(run),
    run?.measurement_cell?.governance?.suppression_state,
    run?.measurement_cell?.vbd_context?.suppression_state,
    run?.measurement_cell?.ai_fluency_context?.suppression_state,
    run?.measurement_cell?.selected_metric?.suppression_state
  ].filter(Boolean).map(String);

  const sourceReadiness = run?.data_spine_readiness?.source_readiness ?? {};
  for (const source of Object.values(sourceReadiness)) {
    values.push(String((source as any)?.state ?? ""));
    values.push(String((source as any)?.review_state ?? ""));
  }
  for (const lane of Array.isArray(run?.source_package_review_queue?.lanes)
    ? run.source_package_review_queue.lanes
    : []) {
    values.push(String(lane?.source_state ?? ""));
    values.push(String(lane?.review_state ?? ""));
  }
  return values.some((value) => /suppressed|suppress/i.test(value));
}

function sourceBindingGaps(run: any, ref: any, windowId: string): string[] {
  if (!run) return [];
  const expected = expectedSourceRefsFromRun(run);
  const gaps: string[] = [];
  for (const [key, actual] of Object.entries(ref?.source_refs ?? {})) {
    const expectedValue = (expected as any)[key] ?? null;
    if (
      actual !== undefined &&
      actual !== null &&
      expectedValue !== undefined &&
      expectedValue !== null &&
      actual !== expectedValue
    ) {
      gaps.push(`${windowId}.${key} source_ref must match Measurement Cell Assembly input`);
    }
  }
  return gaps;
}

function windowRecord(
  window: BuildMeasurementCellSeriesWindowInput,
  index: number
): any {
  const run = window.measurementCellAssemblyRun ?? null;
  const milestoneDay = milestoneDayOf(window, run);
  const windowId = `day_${milestoneDay ?? index}`;
  if (!run) {
    return {
      window_id: windowId,
      milestone_day: milestoneDay,
      status: "missing",
      measurement_cell_assembly_run_id: null,
      measurement_cell_id: null,
      assembly_decision: null,
      assembly_validation_valid: false,
      validation_summary: {
        schema_version: "missing",
        run_id: null,
        valid: false,
        gaps: ["Measurement Cell Assembly run is missing"]
      },
      validation_source: "missing_measurement_cell_assembly_run",
      org_id: null,
      client_id: null,
      workflow_family: null,
      function_area: null,
      cohort_key: null,
      measurement_plan_id: null,
      metric_id: null,
      expectation_path_id: null,
      window: null,
      source_refs: {
        blueprint_source_ref: null,
        ai_fluency_source_ref: null,
        vbd_source_ref: null,
        metric_source_ref: null,
        token_source_ref: null
      },
      missing_evidence: [`MISSING_MEASUREMENT_CELL_ASSEMBLY_DAY_${milestoneDay ?? index}`],
      gaps: ["Measurement Cell Assembly run is missing"],
      feeds: falseFeeds()
    };
  }

  const recomputedValidation = validateMeasurementCellAssemblyRun(run);
  const embeddedValidation = window.measurementCellAssemblyValidationResult ?? null;
  const staleValidation = Boolean(embeddedValidation) &&
    !validationMatchesEmbedded(embeddedValidation, recomputedValidation);
  const cell = run?.measurement_cell ?? null;
  const sourceRefs = sourceRefsFromAssemblyRun(run);
  const validationGaps = staleValidation
    ? ["measurement_cell_assembly_validation_result must match recomputed Measurement Cell Assembly validation"]
    : stringsOf(recomputedValidation.gaps);
  let status = "held";
  if (staleValidation || recomputedValidation.valid === false || run?.decision === "BLOCKED") {
    status = "blocked";
  } else if (runHasSuppression(run)) {
    status = "suppressed";
  } else if (
    recomputedValidation.valid === true &&
    run?.decision === "READY_FOR_VALUE_HYPOTHESIS_PACKET_RUNNER" &&
    cell
  ) {
    status = "ready";
  }
  const ref = {
    window_id: windowId,
    milestone_day: milestoneDay,
    status,
    measurement_cell_assembly_run_id: run?.run_id ?? null,
    measurement_cell_id: cell?.measurement_cell_id ?? null,
    org_id: run?.org_id ?? cell?.org_id ?? null,
    client_id: run?.client_id ?? null,
    workflow_family: run?.workflow_family ?? cell?.workflow_family ?? null,
    function_area: run?.function_area ?? cell?.function_area ?? null,
    cohort_key: run?.cohort_key ?? cell?.cohort_key ?? null,
    measurement_plan_id: run?.measurement_plan_id ?? null,
    metric_id: metricIdOf(run),
    expectation_path_id: expectationPathIdOf(run),
    window: {
      time_window_id: windowOf(run)?.time_window_id ?? null,
      window_mode: windowOf(run)?.window_mode ?? "milestone",
      days_since_launch: numberOrNull(windowOf(run)?.days_since_launch),
      window_start: windowOf(run)?.window_start ?? null,
      window_end: windowOf(run)?.window_end ?? null,
      baseline_window: deepClone(windowOf(run)?.baseline_window ?? null),
      comparison_window: deepClone(windowOf(run)?.comparison_window ?? null)
    },
    source_refs: sourceRefs,
    assembly_decision: run?.decision ?? null,
    assembly_validation_valid: recomputedValidation.valid === true,
    feeds: {
      internal_series_review_reference: status === "ready",
      operator_time_series_preparation_compatibility: status === "ready",
      measurement_cell_direct_feed: false,
      confidence_model: false,
      finance_context_investigation: false,
      customer_facing_financial_output: false
    }
  };
  const bindingGaps = sourceBindingGaps(run, ref, windowId);

  return {
    ...ref,
    validation_summary: {
      schema_version: recomputedValidation.schema_version,
      run_id: recomputedValidation.run_id,
      valid: recomputedValidation.valid === true,
      gaps: validationGaps
    },
    validation_source: "recomputed_measurement_cell_assembly_run",
    missing_evidence: uniqueStrings([
      ...missingEvidenceOf(run),
      ...(status === "held" ? [`HELD_MEASUREMENT_CELL_ASSEMBLY_DAY_${milestoneDay ?? index}`] : []),
      ...(status === "suppressed" ? [`SUPPRESSED_MEASUREMENT_CELL_ASSEMBLY_DAY_${milestoneDay ?? index}`] : []),
      ...(status === "blocked" ? [`BLOCKED_MEASUREMENT_CELL_ASSEMBLY_DAY_${milestoneDay ?? index}`] : [])
    ]),
    source_binding_gaps: bindingGaps,
    gaps: uniqueStrings([...validationGaps, ...bindingGaps]),
    stale_validation_detected: staleValidation
  };
}

function measurementCellWindowsOf(series: any): any[] {
  return Array.isArray(series?.measurement_cell_windows)
    ? series.measurement_cell_windows
    : [];
}

function repeatedRefsFromWindows(windows: any[]): any[] {
  return windows
    .filter((window) => window.status !== "missing")
    .map((window) => ({
      window_id: window.window_id,
      milestone_day: window.milestone_day,
      status: window.status,
      measurement_cell_assembly_run_id:
        window.measurement_cell_assembly_run_id ?? null,
      measurement_cell_id: window.measurement_cell_id ?? null,
      org_id: window.org_id ?? null,
      client_id: window.client_id ?? null,
      workflow_family: window.workflow_family ?? null,
      function_area: window.function_area ?? null,
      cohort_key: window.cohort_key ?? null,
      measurement_plan_id: window.measurement_plan_id ?? null,
      metric_id: window.metric_id ?? null,
      expectation_path_id: window.expectation_path_id ?? null,
      window: deepClone(window.window ?? null),
      source_refs: deepClone(window.source_refs ?? null),
      assembly_decision: window.assembly_decision ?? null,
      assembly_validation_valid: window.assembly_validation_valid === true,
      feeds: {
        internal_series_review_reference:
          window?.feeds?.internal_series_review_reference === true,
        operator_time_series_preparation_compatibility:
          window?.feeds?.operator_time_series_preparation_compatibility === true,
        measurement_cell_direct_feed: false,
        confidence_model: false,
        finance_context_investigation: false,
        customer_facing_financial_output: false
      }
    }));
}

function structuralWindowGaps(windows: any[]): string[] {
  const gaps: string[] = [];
  if (windows.length === 0) {
    gaps.push("measurement_cell_windows must include at least one window");
    return gaps;
  }
  const seen = new Set<number>();
  let previous: number | null = null;
  for (const window of windows) {
    if (
      typeof window?.milestone_day !== "number" ||
      !Number.isFinite(window.milestone_day)
    ) {
      gaps.push(`milestone window ${window?.window_id ?? "unknown"} requires numeric milestone_day`);
      continue;
    }
    if (!REQUIRED_MILESTONE_DAYS.includes(window.milestone_day)) {
      gaps.push(`unsupported milestone day ${window.milestone_day}`);
    }
    if (seen.has(window.milestone_day)) {
      gaps.push(`repeated milestone day ${window.milestone_day}`);
    }
    if (previous !== null && window.milestone_day <= previous) {
      gaps.push("milestone windows must be ordered by increasing milestone_day");
    }
    if (window?.window?.days_since_launch !== null &&
      window?.window?.days_since_launch !== undefined &&
      window.window.days_since_launch !== window.milestone_day
    ) {
      gaps.push(`${window.window_id}.window.days_since_launch must match milestone_day`);
    }
    if (
      window.status !== "missing" &&
      window?.window?.window_mode !== "milestone"
    ) {
      gaps.push(`${window.window_id}.window.window_mode must be milestone for evidence continuity`);
    }
    seen.add(window.milestone_day);
    previous = window.milestone_day;
  }
  return gaps;
}

function identityAndMetricGaps(series: any, windows: any[]): string[] {
  const gaps: string[] = [];
  const checks = [
    ["org_id", series?.org_id],
    ["client_id", series?.client_id],
    ["workflow_family", series?.workflow_family],
    ["function_area", series?.function_area],
    ["cohort_key", series?.cohort_key]
  ];
  for (const window of windows.filter((item) => item.status !== "missing")) {
    for (const [field, expected] of checks) {
      if (window?.[field] !== expected) {
        gaps.push(`${window.window_id}.${field} must match series ${field}`);
      }
    }
  }
  const metricIds = uniqueStrings(
    windows
      .filter((window) => window.status !== "missing")
      .map((window) => String(window.metric_id ?? ""))
  );
  if (metricIds.length > 1) {
    gaps.push("metric_id must remain aligned across Measurement Cell windows");
  }
  const expectationPathIds = uniqueStrings(
    windows
      .filter((window) => window.status !== "missing")
      .map((window) => String(window.expectation_path_id ?? ""))
  );
  if (expectationPathIds.some((pathId) => pathId.length === 0)) {
    gaps.push("expectation_path_id is required for each non-missing Measurement Cell window");
  }
  if (expectationPathIds.length > 1) {
    gaps.push("expectation_path_id must remain aligned across Measurement Cell windows");
  }
  return gaps;
}

function sourceRefGaps(windows: any[]): string[] {
  const gaps: string[] = [];
  for (const window of windows.filter((item) => item.status !== "missing")) {
    for (const [key, value] of Object.entries(window?.source_refs ?? {})) {
      if (value === undefined || value === null || value === "") {
        gaps.push(`${window.window_id}.${key} source_ref is missing`);
      }
    }
  }
  return gaps;
}

function compactWindowInvariantGaps(windows: any[]): string[] {
  const gaps: string[] = [];
  const allowedStatuses = new Set([
    "ready",
    "held",
    "suppressed",
    "missing",
    "blocked"
  ]);
  for (const window of windows) {
    const windowId = String(window?.window_id ?? "unknown_window");
    const status = String(window?.status ?? "");
    if (!allowedStatuses.has(status)) {
      gaps.push(`${windowId}.status is invalid: ${status}`);
    }
    if (status === "missing") {
      if (window?.measurement_cell_assembly_run_id) {
        gaps.push(`${windowId}.missing window cannot carry measurement_cell_assembly_run_id`);
      }
      if (window?.measurement_cell_id) {
        gaps.push(`${windowId}.missing window cannot carry measurement_cell_id`);
      }
      continue;
    }
    if (!window?.measurement_cell_assembly_run_id) {
      gaps.push(`${windowId}.measurement_cell_assembly_run_id is required for non-missing windows`);
    }
    if (
      window?.validation_source !== "recomputed_measurement_cell_assembly_run"
    ) {
      gaps.push(`${windowId}.validation_source must be recomputed_measurement_cell_assembly_run`);
    }
    if (
      window?.validation_summary?.run_id !== window?.measurement_cell_assembly_run_id
    ) {
      gaps.push(`${windowId}.validation_summary.run_id must match measurement_cell_assembly_run_id`);
    }
    if (status === "ready") {
      if (window?.assembly_decision !== "READY_FOR_VALUE_HYPOTHESIS_PACKET_RUNNER") {
        gaps.push(`${windowId}.ready status requires READY_FOR_VALUE_HYPOTHESIS_PACKET_RUNNER assembly_decision`);
      }
      if (window?.assembly_validation_valid !== true) {
        gaps.push(`${windowId}.ready status requires valid Measurement Cell Assembly validation`);
      }
      if (window?.validation_summary?.valid !== true) {
        gaps.push(`${windowId}.ready status requires validation_summary.valid true`);
      }
      if (!window?.measurement_cell_id) {
        gaps.push(`${windowId}.ready status requires measurement_cell_id from a validated assembly`);
      }
    }
    if (status === "blocked" && window?.assembly_validation_valid === true) {
      gaps.push(`${windowId}.blocked status requires invalid or stale Measurement Cell Assembly validation`);
    }
  }
  return gaps;
}

function missingMilestoneDays(windows: any[]): number[] {
  const present = new Set(
    windows
      .map((window) => window.milestone_day)
      .filter((day) => typeof day === "number" && Number.isFinite(day))
  );
  return REQUIRED_MILESTONE_DAYS.filter((day) => !present.has(day));
}

function continuityManifest(windows: any[]): any {
  const statusCount = (status: string) =>
    windows.filter((window) => window.status === status).length;
  const missingMilestones = missingMilestoneDays(windows);
  return {
    required_milestone_days: [...REQUIRED_MILESTONE_DAYS],
    observed_milestone_days: windows
      .map((window) => window.milestone_day)
      .filter((day) => typeof day === "number" && Number.isFinite(day)),
    missing_milestone_days: missingMilestones,
    complete_milestone_series: missingMilestones.length === 0,
    windows: windows.map((window) => ({
      window_id: window.window_id,
      milestone_day: window.milestone_day,
      status: window.status,
      measurement_cell_assembly_run_id:
        window.measurement_cell_assembly_run_id ?? null,
      measurement_cell_id: window.measurement_cell_id ?? null,
      expectation_path_id: window.expectation_path_id ?? null,
      assembly_decision: window.assembly_decision ?? null,
      assembly_validation_valid: window.assembly_validation_valid === true,
      missing_evidence: stringsOf(window.missing_evidence),
      blocked_reasons: stringsOf(window.gaps)
    })),
    ready_windows: statusCount("ready"),
    held_windows: statusCount("held"),
    suppressed_windows: statusCount("suppressed"),
    missing_windows: statusCount("missing"),
    blocked_windows: statusCount("blocked"),
    trend_math_emitted: false,
    confidence_math_emitted: false,
    finance_output_emitted: false
  };
}

function alignmentManifest(series: any, windows: any[]): any {
  const structural = structuralWindowGaps(windows);
  const identity = identityAndMetricGaps(series, windows);
  const sourceRefs = sourceRefGaps(windows);
  const sourceBinding = windows.flatMap((window) =>
    stringsOf(window.source_binding_gaps)
  );
  const stale = windows
    .filter((window) => window.stale_validation_detected === true)
    .map((window) =>
      `${window.window_id}.measurement_cell_assembly_validation_result must match recomputed Measurement Cell Assembly validation`
    );
  const drift = uniqueStrings([
    ...structural,
    ...identity,
    ...sourceRefs,
    ...sourceBinding,
    ...stale
  ]);
  const metricIds = uniqueStrings(
    windows
      .filter((window) => window.status !== "missing")
      .map((window) => String(window.metric_id ?? ""))
  );
  const expectationPathIds = uniqueStrings(
    windows
      .filter((window) => window.status !== "missing")
      .map((window) => String(window.expectation_path_id ?? ""))
  );
  return {
    aligned: drift.length === 0,
    identity: {
      org_id: series?.org_id ?? null,
      client_id: series?.client_id ?? null,
      workflow_family: series?.workflow_family ?? null,
      function_area: series?.function_area ?? null,
      cohort_key: series?.cohort_key ?? null
    },
    metric_id: metricIds.length === 1 ? metricIds[0] : null,
    expectation_path_id:
      expectationPathIds.length === 1 && expectationPathIds[0] !== ""
        ? expectationPathIds[0]
        : null,
    source_ref_lanes: [
      "blueprint_source_ref",
      "ai_fluency_source_ref",
      "vbd_source_ref",
      "metric_source_ref",
      "token_source_ref"
    ],
    required_milestone_days: [...REQUIRED_MILESTONE_DAYS],
    observed_milestone_days: windows
      .map((window) => window.milestone_day)
      .filter((day) => typeof day === "number" && Number.isFinite(day)),
    drift,
    trend_math_emitted: false,
    confidence_math_emitted: false,
    finance_context_feed: false,
    measurement_cell_direct_feed: false
  };
}

function decisionFor(windows: any[], alignment: any): string {
  if (!alignment.aligned) return BLOCKED_DECISION;
  if (windows.some((window) => window.stale_validation_detected === true)) {
    return BLOCKED_DECISION;
  }
  if (structuralWindowGaps(windows).length > 0) return BLOCKED_DECISION;
  const continuity = continuityManifest(windows);
  const allReady = windows.length > 0 &&
    windows.every((window) => window.status === "ready");
  if (continuity.complete_milestone_series && allReady) {
    return COMPLETE_DECISION;
  }
  return HELD_DECISION;
}

function topLevelGaps(series: any): string[] {
  const gaps: string[] = [];
  if (!series || typeof series !== "object" || Array.isArray(series)) {
    return ["measurement cell series must be an object"];
  }
  for (const field of [
    "schema_version",
    "measurement_cell_series_id",
    "org_id",
    "client_id",
    "workflow_family",
    "function_area",
    "cohort_key",
    "decision",
    "measurement_cell_windows",
    "repeated_measurement_cell_refs",
    "evidence_continuity_manifest",
    "alignment_manifest",
    "operator_time_series_compatibility",
    "gaps",
    "missing_evidence",
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
    series.schema_version !== AI_VALUE_MEASUREMENT_CELL_SERIES_SCHEMA_VERSION
  ) {
    gaps.push(`schema_version is invalid: ${series.schema_version}`);
  }
  if (series?.decision && !ALLOWED_DECISIONS.has(String(series.decision))) {
    gaps.push(`decision is invalid: ${series.decision}`);
  }
  for (const field of Object.keys(series ?? {})) {
    if (!ALLOWED_TOP_LEVEL_FIELDS.has(field)) {
      gaps.push(`Unsupported measurement cell series field: ${field}`);
    }
  }
  return gaps;
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

function isSafePolicyPath(path: string[]): boolean {
  return path.map(normalizeKey).some((part) =>
    [
      "blocked_uses",
      "required_caveats",
      "boundary_policy",
      "operator_time_series_compatibility"
    ].includes(part)
  );
}

function collectUnsafeStringValues(
  value: any,
  values: Set<string> = new Set(),
  path: string[] = []
): Set<string> {
  if (typeof value === "string") {
    const normalized = normalizeKey(value);
    const pathKeys = path.map(normalizeKey);
    const inAllowedUses = pathKeys.includes("allowed_uses");
    const inSourceRef = pathKeys.some((part) => part.includes("source_ref"));
    if (
      inAllowedUses &&
      !REQUIRED_ALLOWED_USES.includes(value)
    ) {
      values.add(`${path.join(".")}: ${value}`);
    } else if (
      inSourceRef &&
      UNSAFE_SOURCE_REF_VALUE_PATTERNS.some((pattern) => pattern.test(value))
    ) {
      values.add(`${path.join(".")}: ${value}`);
    } else if (
      !isSafePolicyPath(path) &&
      (UNSAFE_ALLOWED_USE_PATTERNS.some((pattern) => pattern.test(normalized)) ||
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
    collectUnsafeStringValues(nested, values, [...path, key]);
  }
  return values;
}

function policyGaps(series: any): string[] {
  const gaps: string[] = [];
  const allowedUses = stringsOf(series?.allowed_uses);
  for (const use of REQUIRED_ALLOWED_USES) {
    if (!allowedUses.includes(use)) {
      gaps.push(`allowed_uses missing ${use}`);
    }
  }
  for (const use of allowedUses) {
    if (!REQUIRED_ALLOWED_USES.includes(use)) {
      gaps.push(`allowed_uses contains unsupported or unsafe use: ${use}`);
    }
  }
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
  for (const field of REQUIRED_FEED_FIELDS) {
    if (series?.feeds?.[field] === undefined) {
      gaps.push(`feeds.${field} is missing`);
    }
  }
  for (const field of Object.keys(series?.feeds ?? {})) {
    if (!REQUIRED_FEED_FIELDS.includes(field)) {
      gaps.push(`feeds contains unsupported field: ${field}`);
    }
  }
  for (const field of [
    "measurement_cell_direct_feed",
    "confidence_model",
    "finance_context_investigation",
    "customer_facing_financial_output"
  ]) {
    if (series?.feeds?.[field] !== false) {
      gaps.push(`feeds.${field} must be false`);
    }
  }
  const compatibility = series?.operator_time_series_compatibility ?? {};
  for (const field of [
    "creates_parallel_orchestration_object",
    "creates_operator_time_series_run",
    "confidence_model_feed",
    "finance_context_investigation_feed",
    "customer_facing_financial_output_feed",
    "roi_or_financial_output_ready"
  ]) {
    if (compatibility[field] !== false) {
      gaps.push(`operator_time_series_compatibility.${field} must be false`);
    }
  }
  for (const field of [...collectForbiddenFields(series)].sort()) {
    gaps.push(`Forbidden field detected: ${field}`);
  }
  for (const value of [...collectUnsafeStringValues(series)].sort()) {
    gaps.push(`Unsafe field value detected: ${value}`);
  }
  return gaps;
}

function derivedSurfaceGaps(series: any): string[] {
  const windows = measurementCellWindowsOf(series);
  const expectedRefs = repeatedRefsFromWindows(windows);
  const expectedContinuity = continuityManifest(windows);
  const expectedAlignment = alignmentManifest(series, windows);
  const expectedCompatibility = expectedCompatibilityForSeries(series);
  const expectedFeeds = feedsForDecision(String(series?.decision ?? ""));
  const gaps: string[] = [];
  if (!validationMatchesEmbedded(series?.repeated_measurement_cell_refs, expectedRefs)) {
    gaps.push("repeated_measurement_cell_refs must match compact Measurement Cell window references");
  }
  if (!validationMatchesEmbedded(series?.evidence_continuity_manifest, expectedContinuity)) {
    gaps.push("evidence_continuity_manifest must match Measurement Cell window status");
  }
  if (!validationMatchesEmbedded(series?.alignment_manifest, expectedAlignment)) {
    gaps.push("alignment_manifest must match Measurement Cell window alignment");
  }
  if (!validationMatchesEmbedded(series?.operator_time_series_compatibility, expectedCompatibility)) {
    gaps.push("operator_time_series_compatibility must match series decision and boundary policy");
  }
  if (!validationMatchesEmbedded(series?.feeds, expectedFeeds)) {
    gaps.push("feeds must match series decision and downstream boundary policy");
  }
  return gaps;
}

function expectedCompatibilityForSeries(series: any): any {
  return expectedCompatibility(String(series?.decision ?? ""));
}

function decisionGaps(series: any): string[] {
  const windows = measurementCellWindowsOf(series);
  const structural = structuralWindowGaps(windows);
  const identity = identityAndMetricGaps(series, windows);
  const sourceRefs = sourceRefGaps(windows);
  const stale = windows.some((window) => window.stale_validation_detected === true);
  const continuity = continuityManifest(windows);
  const allReady = windows.length > 0 &&
    windows.every((window) => window.status === "ready");
  const gaps: string[] = [];
  if (stale) {
    gaps.push("measurement_cell_assembly_validation_result must match recomputed Measurement Cell Assembly validation");
  }
  if (series?.decision === COMPLETE_DECISION) {
    if (
      structural.length ||
      identity.length ||
      sourceRefs.length ||
      stale ||
      !continuity.complete_milestone_series ||
      !allReady
    ) {
      gaps.push("continuity coverage complete requires complete aligned ready Measurement Cell windows");
    }
    if (series?.feeds?.internal_series_review !== true) {
      gaps.push("feeds.internal_series_review must be true when continuity coverage is complete");
    }
    if (series?.feeds?.operator_time_series_preparation_compatibility !== true) {
      gaps.push("feeds.operator_time_series_preparation_compatibility must be true when continuity coverage is complete");
    }
  }
  if (series?.decision === HELD_DECISION) {
    if (structural.length || identity.length || sourceRefs.length || stale) {
      gaps.push("held Measurement Cell Series cannot carry alignment or stale-validation drift");
    }
    if (allReady && continuity.complete_milestone_series) {
      gaps.push("HELD_FOR_EVIDENCE_CONTINUITY requires at least one non-ready or missing window");
    }
    if (
      series?.feeds?.internal_series_review !== false ||
      series?.feeds?.operator_time_series_preparation_compatibility !== false
    ) {
      gaps.push("held Measurement Cell Series must keep downstream review feeds false");
    }
  }
  if (series?.decision === BLOCKED_DECISION) {
    gaps.push("blocked Measurement Cell Series cannot validate");
  }
  return gaps;
}

export function buildMeasurementCellSeries(
  input: BuildMeasurementCellSeriesInput
): any {
  const windows = (input.windows ?? []).map(windowRecord);
  const provisional = {
    org_id: input.orgId,
    client_id: input.clientId,
    workflow_family: input.workflowFamily,
    function_area: input.functionArea,
    cohort_key: input.cohortKey
  };
  const alignment = alignmentManifest(provisional, windows);
  const decision = decisionFor(windows, alignment);
  const repeatedRefs = repeatedRefsFromWindows(windows);
  const continuity = continuityManifest(windows);
  const feeds = feedsForDecision(decision);

  return {
    schema_version: AI_VALUE_MEASUREMENT_CELL_SERIES_SCHEMA_VERSION,
    measurement_cell_series_id: input.measurementCellSeriesId ??
      `measurement_cell_series_${safeIdPart(input.orgId ?? "unknown_org")}_${safeIdPart(input.workflowFamily ?? "unknown_workflow")}`,
    org_id: input.orgId,
    client_id: input.clientId,
    workflow_family: input.workflowFamily,
    function_area: input.functionArea,
    cohort_key: input.cohortKey,
    decision,
    measurement_cell_windows: windows,
    repeated_measurement_cell_refs: repeatedRefs,
    evidence_continuity_manifest: continuity,
    alignment_manifest: alignment,
    operator_time_series_compatibility: expectedCompatibility(decision),
    gaps: uniqueStrings([
      ...alignment.drift,
      ...windows.flatMap((window) =>
        stringsOf(window.gaps).map((gap) => `${window.window_id}: ${gap}`)
      )
    ]),
    missing_evidence: uniqueStrings([
      ...continuity.missing_milestone_days.map((day: number) => `MISSING_MILESTONE_DAY_${day}`),
      ...windows.flatMap((window) => stringsOf(window.missing_evidence))
    ]),
    feeds,
    allowed_uses: [...REQUIRED_ALLOWED_USES],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    boundary_policy: Object.fromEntries(
      REQUIRED_FALSE_BOUNDARY_FIELDS.map((field) => [field, false])
    ),
    required_caveats: [
      "Measurement Cell Series composes already-assembled aggregate Measurement Cell Assembly outputs only.",
      "The Evidence Continuity Manifest reports ready, held, suppressed, missing, and blocked windows without trend or confidence math.",
      "Operator Time-Series compatibility is metadata-only and does not create a parallel orchestration object.",
      "No direct Measurement Cell feed, confidence model, finance-context investigation, ROI, EBITA, EBITDA, causality, productivity, probability, person-level output, ranking, or customer-facing financial output is produced."
    ],
    generated_at: input.generatedAt ?? new Date(0).toISOString(),
    derivation_version: DERIVATION_VERSION
  };
}

export function validateMeasurementCellSeries(
  series: any
): MeasurementCellSeriesValidationResult {
  const windows = measurementCellWindowsOf(series);
  const gaps = [
    ...topLevelGaps(series),
    ...policyGaps(series),
    ...structuralWindowGaps(windows),
    ...compactWindowInvariantGaps(windows),
    ...identityAndMetricGaps(series, windows),
    ...sourceRefGaps(windows),
    ...stringsOf(series?.alignment_manifest?.drift),
    ...derivedSurfaceGaps(series),
    ...decisionGaps(series)
  ];
  const valid = gaps.length === 0;
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    measurement_cell_series_id: series?.measurement_cell_series_id ?? null,
    org_id: series?.org_id ?? null,
    client_id: series?.client_id ?? null,
    valid,
    gaps,
    feeds: feedState(series, valid)
  };
}
