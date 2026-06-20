/**
 * AI Value Engine - Measurement Cell.
 *
 * Canonical alignment object for the finance-review readiness spine. A
 * Measurement Cell aligns Blueprint, AI Fluency, VBD, selected customer metric,
 * token context, confounders, evidence design, and finance-review context at
 * one aggregate function/workflow/cohort/window/metric grain.
 *
 * It is not a confidence model, ROI calculator, finance output, causality
 * engine, productivity system, or customer-facing readout.
 */

export const AI_VALUE_MEASUREMENT_CELL_SCHEMA_VERSION =
  "FT_AI_VALUE_MEASUREMENT_CELL_2026_06";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_MEASUREMENT_CELL_VALIDATION_2026_06";

const DERIVATION_VERSION =
  "ai_value_measurement_cell_builder_2026_06";

const REQUIRED_FIELDS = [
  "schema_version",
  "measurement_cell_id",
  "org_id",
  "function_area",
  "workflow_family",
  "cohort_key",
  "time_window",
  "blueprint_alignment",
  "ai_fluency_context",
  "vbd_context",
  "selected_metric",
  "metric_movement",
  "token_context",
  "yield_context",
  "confounders",
  "evidence_design",
  "finance_review_context",
  "governance",
  "allowed_uses",
  "blocked_uses",
  "value_proof_policy",
  "persistence_policy",
  "source_refs",
  "required_caveats",
  "derivation_version"
] as const;

const ALLOWED_EVIDENCE_STATES = new Set([
  "missing",
  "present",
  "partial",
  "held",
  "suppressed",
  "not_required"
]);

const ALLOWED_METRIC_DIRECTIONS = new Set([
  "increase",
  "decrease",
  "maintain",
  "unknown"
]);

const ALLOWED_METRIC_SENSITIVITY = new Set([
  "high",
  "medium",
  "low",
  "unknown"
]);

const ALLOWED_OWNER_APPROVAL_STATES = new Set([
  "approved",
  "submitted",
  "missing",
  "rejected",
  "held",
  "not_required"
]);

const ALLOWED_DESIGN_TYPES = new Set([
  "assumption_only",
  "baseline_only",
  "pre_post",
  "repeated_pre_post",
  "matched_comparison",
  "staggered_rollout",
  "controlled_test",
  "calibrated_historical_model"
]);

const ALLOWED_DESIGN_TIERS = new Set([
  "planning_context_only",
  "no_contribution_confidence",
  "directional_movement_only",
  "stronger_directional_evidence",
  "comparison_supported",
  "quasi_experimental_candidate",
  "controlled_test_candidate",
  "calibrated_research_candidate"
]);

const ALLOWED_FINANCE_OWNER_STATES = new Set([
  "missing",
  "submitted",
  "business_owner_review",
  "finance_context_review",
  "finance_approved_pathway",
  "held",
  "not_required"
]);

const ALLOWED_REVIEW_STATES = new Set([
  "SUPPRESSED",
  "NOT_READY",
  "PLANNING_READY",
  "EVIDENCE_REVIEW_READY",
  "BUSINESS_OWNER_REVIEW_READY",
  "FINANCE_CONTEXT_INVESTIGATION_READY"
]);

const ALLOWED_WINDOW_MODES = new Set([
  "milestone",
  "rolling_30_day"
]);

const ALLOWED_WINDOW_CADENCES = new Set([
  "milestone",
  "rolling_30_day"
]);

const ALLOWED_MILESTONE_DAYS = new Set([0, 30, 60, 90, 180, 365]);

const ROLLING_30_DAY_CAVEAT =
  "Rolling 30-day Measurement Cells are operating momentum context; overlapping windows are not independent attribution samples.";

const SAFE_ALLOWED_USES = new Set([
  "measurement_cell_alignment",
  "internal_evidence_review",
  "value_hypothesis_readiness_input",
  "business_owner_metric_review",
  "finance_context_investigation_planning",
  "bayesian_research_design_planning"
]);

const ROLLING_30_DAY_BLOCKED_ALLOWED_USES = [
  "finance_context_investigation_planning",
  "bayesian_research_design_planning"
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
  "customer_facing_financial_output",
  "customer_facing_prediction"
];

const REQUIRED_FALSE_VALUE_PROOF_FLAGS = [
  "measurement_cell_is_roi_proof",
  "measurement_cell_is_financial_output",
  "measurement_cell_computes_causality",
  "measurement_cell_emits_confidence_percentage",
  "measurement_cell_emits_probability",
  "metric_movement_upgrades_suppressed_vbd",
  "token_usage_changes_vbd_formula",
  "allows_person_or_group_ranking",
  "downstream_claim_strength_upgrade_allowed"
];

const REQUIRED_FALSE_PERSISTENCE_FIELDS = [
  "persisted",
  "creates_migrations",
  "creates_prisma_schema",
  "creates_backend_routes",
  "creates_frontend_ui",
  "creates_ingestion_jobs",
  "creates_customer_facing_exports"
];

const UNSAFE_PRIVACY_FLAGS = [
  "contains_direct_identifiers",
  "contains_raw_content",
  "contains_person_level_productivity",
  "contains_person_level_hris_records",
  "contains_hashed_or_joinable_person_identifiers",
  "contains_manager_or_team_ranking",
  "contains_department_ranking",
  "contains_people_decisioning",
  "contains_compensation_or_performance_inference",
  "contains_promotion_or_discipline_inference",
  "contains_attrition_prediction",
  "contains_hris_inference_from_ai_usage"
];

const FORBIDDEN_FIELD_PATTERNS = [
  /^confidence_percent$/i,
  /^confidence_band$/i,
  /^confidence_score$/i,
  /^ai_contribution_confidence$/i,
  /^ai_contribution_probability$/i,
  /^signal_emergence_confidence$/i,
  /^window_confidence$/i,
  /^contribution_likelihood$/i,
  /^attribution_probability$/i,
  /^probability$/i,
  /^posterior_probability$/i,
  /^roi$/i,
  /^roi_output$/i,
  /^realized_roi$/i,
  /^roi_value$/i,
  /^roi_amount$/i,
  /^roi_calculation$/i,
  /^roi_proof$/i,
  /^ebita$/i,
  /^ebita_value$/i,
  /^ebita_amount$/i,
  /^ebita_impact$/i,
  /^ebita_attribution$/i,
  /^ebitda$/i,
  /^ebitda_value$/i,
  /^ebitda_amount$/i,
  /^ebitda_impact$/i,
  /^ebitda_attribution$/i,
  /^dollarized_value$/i,
  /^dollarized_impact$/i,
  /^savings$/i,
  /^savings_value$/i,
  /^savings_amount$/i,
  /^value_at_risk$/i,
  /^value_at_risk_amount$/i,
  /^financial_impact$/i,
  /^financial_output$/i,
  /^finance_prediction$/i,
  /^formula_execution$/i,
  /^formula_coefficients?$/i,
  /^model_coefficients?$/i,
  /^weights?$/i,
  /^attribution_logic$/i,
  /^customer_facing_financial_output$/i,
  /^customer_facing_economic_output$/i,
  /^customer_facing_prediction$/i,
  /^productivity_lift$/i,
  /^productivity_score$/i,
  /^productivity_output$/i,
  /^productivity_claim$/i,
  /^causal_effect$/i,
  /^causality_probability$/i,
  /^causality_claim$/i,
  /^headcount_reduction_value$/i,
  /^headcount_reduction_claim$/i,
  /^raw_rows?$/i,
  /^raw_prompts?$/i,
  /^raw_responses?$/i,
  /^raw_transcripts?$/i,
  /^prompt_text$/i,
  /^response_text$/i,
  /^query_text$/i,
  /^sql_text$/i,
  /^file_contents?$/i,
  /^email$/i,
  /^user_id$/i,
  /^user_ids$/i,
  /^employee_id$/i,
  /^employee_ids$/i,
  /^employee_email$/i,
  /^employee_name$/i,
  /^person_id$/i,
  /^person_identifier$/i,
  /^hashed_(?:user|person|employee)_id$/i,
  /^joinable_(?:user|person|employee)_identifier$/i,
  /^person_level_productivity$/i,
  /^person_level_hris_records?$/i,
  /^manager_ranking$/i,
  /^team_ranking$/i,
  /^department_ranking$/i,
  /^manager_or_team_ranking$/i,
  /^people_decisioning$/i,
  /^compensation$/i,
  /^performance_rating$/i,
  /^promotion$/i,
  /^discipline$/i,
  /^attrition_prediction$/i,
  /^hris_inference$/i,
  /^suppression_reason$/i,
  /^minimum_window_days$/i,
  /^threshold_days$/i,
  /^backend_routes?$/i,
  /^schema_ref$/i,
  /^persistence_table$/i,
  /^ui_surface$/i
];

const GOVERNED_KEY_ALLOWLIST = new Set([
  "blocked_uses",
  "blocked_claims",
  "value_proof_policy",
  "persistence_policy",
  "source_refs",
  "required_caveats",
  "finance_review_context",
  "contains_direct_identifiers",
  "contains_raw_content",
  "contains_person_level_productivity",
  "contains_person_level_hris_records",
  "contains_hashed_or_joinable_person_identifiers",
  "contains_manager_or_team_ranking",
  "contains_department_ranking",
  "contains_people_decisioning",
  "contains_compensation_or_performance_inference",
  "contains_promotion_or_discipline_inference",
  "contains_attrition_prediction",
  "contains_hris_inference_from_ai_usage"
]);

const EMAIL_VALUE_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

const UNSAFE_METADATA_VALUE_PATTERNS = [
  /(?:^|[|;,\s])team_rank\s*[:=]\s*\d+/i,
  /\b(?:top|bottom)[-\s]performing\s+(?:team|manager|department|function|cohort)\b/i,
  /\bmanager\s+[A-Z][A-Za-z'-]+\b/
];

const UNSAFE_CLAIM_LANGUAGE_PATTERNS = [
  /\bproved?\s+(?:roi|savings|financial impact|ebita|ebitda|productivity|causality)\b/i,
  /\b(?:roi|savings|ebita|ebitda|financial impact|productivity lift)\b.{0,48}\b(?:due to|caused by|attributed to|from ai|by ai)\b/i,
  /\bAI(?:-enabled)?\b.{0,64}\b(?:contributed to|influenced|generated|drove|lifted|improved)\b.{0,64}\b(?:metric|metrics|pipeline|revenue|financial|productivity|ebita|ebitda|outcome|growth|movement)\b/i,
  /\b(?:ebita|ebitda|financial)\s+impact\b/i,
  /\bconfidence\s*(?:percent|percentage|score)\b/i,
  /\battribution\s+probability\b/i
];

export interface MeasurementCellValidationResult {
  schema_version: string;
  measurement_cell_id: string | null;
  org_id: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    value_hypothesis_readiness_input: boolean;
    business_owner_metric_review: boolean;
    finance_context_investigation_planning: boolean;
    bayesian_research_design_planning: boolean;
    customer_facing_financial_output: false;
  };
}

export interface BuildMeasurementCellInput {
  measurementCellId?: string;
  orgId: string;
  functionArea: string;
  workflowFamily: string;
  workflowId?: string | null;
  cohortKey: string;
  timeWindow: {
    time_window_id: string;
    window_label?: string;
    window_mode?: string;
    anchor_date?: string;
    days_since_launch?: number | null;
    cadence?: string;
    window_start: string;
    window_end: string;
    baseline_window?: any;
    comparison_window?: any;
    prior_window_ref?: string | null;
    window_day_count?: number | null;
  };
  blueprintAlignment: any;
  aiFluencyContext?: any;
  vbdContext: any;
  selectedMetric: any;
  tokenContext?: any;
  confounders?: any[];
  evidenceDesign?: any;
  financeReviewContext?: any;
  governance?: any;
  sourceRefs?: any;
  requiredCaveats?: string[];
}

export const MeasurementCellSchema = {
  schema_version: AI_VALUE_MEASUREMENT_CELL_SCHEMA_VERSION,
  required_fields: [...REQUIRED_FIELDS],
  allowed_uses: [...SAFE_ALLOWED_USES],
  required_blocked_uses: REQUIRED_BLOCKED_USES,
  persistence_policy: {
    persisted: false,
    creates_migrations: false,
    creates_prisma_schema: false,
    creates_backend_routes: false,
    creates_frontend_ui: false,
    creates_ingestion_jobs: false,
    creates_customer_facing_exports: false
  }
} as const;

function stringsOf(value: any): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
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

function requireArray(value: any, path: string, gaps: string[]): void {
  if (!Array.isArray(value)) gaps.push(`${path} must be an array`);
}

function requireBoolean(value: any, expected: boolean, path: string, gaps: string[]): void {
  if (value !== expected) gaps.push(`${path} must be ${expected}`);
}

function requireEnum(
  value: any,
  allowed: Set<string>,
  path: string,
  gaps: string[]
): void {
  if (!allowed.has(String(value))) gaps.push(`${path} has invalid value ${String(value)}`);
}

function numberOrNull(value: any): number | null {
  if (value === undefined || value === null || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function round4(value: number): number {
  return Number(value.toFixed(4));
}

function directionAdjustedDelta(
  baseline: number | null,
  comparison: number | null,
  direction: string
): number | null {
  if (baseline === null || comparison === null) return null;
  if (direction === "decrease") return round4(baseline - comparison);
  if (direction === "increase") return round4(comparison - baseline);
  if (direction === "maintain") return baseline === comparison
    ? 0
    : round4(-Math.abs(comparison - baseline));
  return round4(comparison - baseline);
}

function daysBetween(start: string, end: string): number | null {
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
  const days = Math.round((endMs - startMs) / 86400000) + 1;
  return days > 0 ? days : null;
}

function dateIsValid(value: any): boolean {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function inferWindowMode(window: any): string {
  const explicitMode = window?.window_mode;
  if (explicitMode) return String(explicitMode);
  return /^rolling[_-]?30d|rolling_30_day/i.test(String(window?.time_window_id ?? ""))
    ? "rolling_30_day"
    : "milestone";
}

function inferDaysSinceLaunch(window: any): number | null {
  const explicitDays = numberOrNull(window?.days_since_launch);
  if (explicitDays !== null) return explicitDays;
  const match = String(window?.time_window_id ?? "").match(/(?:^|_)day[_-]?(\d+)(?:_|$)/i);
  return match ? Number(match[1]) : null;
}

function rollingWindowCaveats(windowMode: string): string[] {
  return windowMode === "rolling_30_day" ? [ROLLING_30_DAY_CAVEAT] : [];
}

function midpointDate(window: any): string | null {
  const startMs = Date.parse(String(window?.window_start ?? ""));
  const endMs = Date.parse(String(window?.window_end ?? ""));
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
  return new Date((startMs + endMs) / 2).toISOString().slice(0, 10);
}

function designTier(designType: string): string {
  switch (designType) {
    case "assumption_only":
      return "planning_context_only";
    case "baseline_only":
      return "no_contribution_confidence";
    case "pre_post":
      return "directional_movement_only";
    case "repeated_pre_post":
      return "stronger_directional_evidence";
    case "matched_comparison":
      return "comparison_supported";
    case "staggered_rollout":
      return "quasi_experimental_candidate";
    case "controlled_test":
      return "controlled_test_candidate";
    case "calibrated_historical_model":
      return "calibrated_research_candidate";
    default:
      return "planning_context_only";
  }
}

function sourceIdentity(
  source: any,
  input: BuildMeasurementCellInput,
  governance: any
): any {
  return {
    org_id: source?.org_id ?? input.orgId,
    function_area: source?.function_area ?? input.functionArea,
    workflow_family: source?.workflow_family ?? input.workflowFamily,
    workflow_id: source?.workflow_id ?? input.workflowId ?? null,
    cohort_key: source?.cohort_key ?? input.cohortKey,
    time_window_id: source?.time_window_id ?? input.timeWindow.time_window_id,
    review_state: source?.review_state ?? governance.review_state
  };
}

function evidenceState(value: any, fallback = "missing"): string {
  return String(value?.evidence_state ?? value?.state ?? fallback);
}

function hasSuppression(cell: any): boolean {
  return cell?.governance?.suppression_state === "SUPPRESSED" ||
    cell?.vbd_context?.suppression_state === "SUPPRESSED" ||
    cell?.ai_fluency_context?.suppression_state === "SUPPRESSED" ||
    cell?.selected_metric?.suppression_state === "SUPPRESSED";
}

function privacyBoundary(input: any = {}): any {
  const boundary = input.privacy_boundary ?? input;
  return {
    aggregate_only: boundary.aggregate_only ?? true,
    contains_direct_identifiers: boundary.contains_direct_identifiers ?? false,
    contains_raw_content: boundary.contains_raw_content ?? false,
    contains_person_level_productivity:
      boundary.contains_person_level_productivity ?? false,
    contains_person_level_hris_records:
      boundary.contains_person_level_hris_records ?? false,
    contains_hashed_or_joinable_person_identifiers:
      boundary.contains_hashed_or_joinable_person_identifiers ?? false,
    contains_manager_or_team_ranking:
      boundary.contains_manager_or_team_ranking ?? false,
    contains_department_ranking: boundary.contains_department_ranking ?? false,
    contains_people_decisioning: boundary.contains_people_decisioning ?? false,
    contains_compensation_or_performance_inference:
      boundary.contains_compensation_or_performance_inference ?? false,
    contains_promotion_or_discipline_inference:
      boundary.contains_promotion_or_discipline_inference ?? false,
    contains_attrition_prediction: boundary.contains_attrition_prediction ?? false,
    contains_hris_inference_from_ai_usage:
      boundary.contains_hris_inference_from_ai_usage ?? false
  };
}

function buildGovernance(input: any = {}): any {
  const reviewState = input.review_state ?? "EVIDENCE_REVIEW_READY";
  return {
    aggregate_only: input.aggregate_only ?? true,
    suppression_state: input.suppression_state ?? "CLEAR",
    source_binding_validated: input.source_binding_validated ?? true,
    review_state: reviewState,
    source_refs_validated: input.source_refs_validated ?? true,
    privacy_boundary: privacyBoundary(input.privacy_boundary),
    claim_boundary: {
      customer_facing_output_allowed: false,
      financial_output_allowed: false,
      roi_proof_allowed: false,
      causality_claim_allowed: false,
      productivity_claim_allowed: false,
      ebita_claim_allowed: false,
      ebitda_claim_allowed: false,
      confidence_percentage_allowed: false,
      person_or_group_ranking_allowed: false,
      ...(input.claim_boundary ?? {})
    }
  };
}

function isForbiddenField(key: string): boolean {
  const normalizedKey = normalizeKey(key);
  if (GOVERNED_KEY_ALLOWLIST.has(normalizedKey)) return false;
  return FORBIDDEN_FIELD_PATTERNS.some((pattern) => pattern.test(normalizedKey));
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
    const fieldPath = [...path, key];
    if (isForbiddenField(key)) fields.add(fieldPath.join("."));
    collectForbiddenFields(nested, fields, fieldPath);
  }
  return fields;
}

function isSafePolicyPath(path: string[]): boolean {
  return path.map(normalizeKey).some((part) =>
    ["blocked_uses", "blocked_claims", "required_caveats", "claim_boundary"].includes(part)
  );
}

function collectUnsafeStringValues(
  value: any,
  values: Set<string> = new Set(),
  path: string[] = []
): Set<string> {
  if (typeof value === "string") {
    const normalized = normalizeKey(value);
    if (
      !isSafePolicyPath(path) &&
      (EMAIL_VALUE_PATTERN.test(value) ||
        UNSAFE_METADATA_VALUE_PATTERNS.some((pattern) => pattern.test(value)) ||
        /(?:^|_)(?:user|employee|person)_(?:id|email|name|identifier)(?:_|$)/i.test(normalized) ||
        /(?:^|_)raw_(?:row|prompt|response|transcript|content)(?:_|$)/i.test(normalized))
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

function collectUnsafeClaimLanguageValues(
  value: any,
  values: Set<string> = new Set(),
  path: string[] = []
): Set<string> {
  if (typeof value === "string") {
    if (
      !isSafePolicyPath(path) &&
      UNSAFE_CLAIM_LANGUAGE_PATTERNS.some((pattern) => pattern.test(value))
    ) {
      values.add(`${path.join(".")}: ${value}`);
    }
    return values;
  }
  if (!value || typeof value !== "object") return values;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectUnsafeClaimLanguageValues(item, values, [...path, String(index)])
    );
    return values;
  }
  for (const [key, nested] of Object.entries(value)) {
    collectUnsafeClaimLanguageValues(nested, values, [...path, key]);
  }
  return values;
}

function collectTopLevelGaps(cell: any): string[] {
  const gaps: string[] = [];
  for (const field of REQUIRED_FIELDS) requireField(cell?.[field], field, gaps);
  if (
    cell?.schema_version &&
    cell.schema_version !== AI_VALUE_MEASUREMENT_CELL_SCHEMA_VERSION
  ) {
    gaps.push(`schema_version is invalid: ${cell.schema_version}`);
  }
  requireField(cell?.time_window?.time_window_id, "time_window.time_window_id", gaps);
  requireField(cell?.time_window?.window_mode, "time_window.window_mode", gaps);
  requireField(cell?.time_window?.anchor_date, "time_window.anchor_date", gaps);
  requireField(cell?.time_window?.days_since_launch, "time_window.days_since_launch", gaps);
  requireField(cell?.time_window?.cadence, "time_window.cadence", gaps);
  requireField(cell?.time_window?.window_start, "time_window.window_start", gaps);
  requireField(cell?.time_window?.window_end, "time_window.window_end", gaps);
  requireEnum(
    cell?.time_window?.window_mode,
    ALLOWED_WINDOW_MODES,
    "time_window.window_mode",
    gaps
  );
  requireEnum(
    cell?.time_window?.cadence,
    ALLOWED_WINDOW_CADENCES,
    "time_window.cadence",
    gaps
  );
  if (cell?.time_window?.anchor_date && !dateIsValid(cell.time_window.anchor_date)) {
    gaps.push("time_window.anchor_date must be a valid date");
  }
  const daysSinceLaunch = numberOrNull(cell?.time_window?.days_since_launch);
  if (daysSinceLaunch === null || daysSinceLaunch < 0) {
    gaps.push("time_window.days_since_launch must be a non-negative number");
  }
  if (
    cell?.time_window?.window_start &&
    cell?.time_window?.window_end &&
    String(cell.time_window.window_start) > String(cell.time_window.window_end)
  ) {
    gaps.push("time_window.window_start must be before time_window.window_end");
  }
  requireArray(cell?.confounders, "confounders", gaps);
  requireArray(cell?.allowed_uses, "allowed_uses", gaps);
  requireArray(cell?.blocked_uses, "blocked_uses", gaps);
  requireArray(cell?.required_caveats, "required_caveats", gaps);
  if (cell?.time_window?.window_mode === "milestone") {
    if (cell?.time_window?.cadence !== "milestone") {
      gaps.push("milestone windows require cadence milestone");
    }
    if (daysSinceLaunch !== null && !ALLOWED_MILESTONE_DAYS.has(daysSinceLaunch)) {
      gaps.push("milestone days_since_launch must be one of 0, 30, 60, 90, 180, or 365");
    }
  }
  if (cell?.time_window?.window_mode === "rolling_30_day") {
    if (cell?.time_window?.cadence !== "rolling_30_day") {
      gaps.push("rolling_30_day windows require cadence rolling_30_day");
    }
    if (cell?.time_window?.window_day_count !== 30) {
      gaps.push("rolling_30_day windows must be exactly 30 days");
    }
    const baselineDays = daysBetween(
      String(cell?.time_window?.baseline_window?.window_start ?? ""),
      String(cell?.time_window?.baseline_window?.window_end ?? "")
    );
    const comparisonDays = daysBetween(
      String(cell?.time_window?.comparison_window?.window_start ?? ""),
      String(cell?.time_window?.comparison_window?.window_end ?? "")
    );
    if (baselineDays !== 30 || comparisonDays !== 30) {
      gaps.push("rolling_30_day baseline_window and comparison_window must each be exactly 30 days");
    }
    if (!cell?.time_window?.prior_window_ref) {
      gaps.push("rolling_30_day windows require time_window.prior_window_ref");
    }
  }
  return gaps;
}

function collectAlignmentGaps(cell: any): string[] {
  const gaps: string[] = [];
  const blueprintMetric = cell?.blueprint_alignment?.expected_metric_id;
  const selectedMetric = cell?.selected_metric?.metric_id;
  if (blueprintMetric && selectedMetric && blueprintMetric !== selectedMetric) {
    gaps.push("selected_metric.metric_id must match blueprint_alignment.expected_metric_id");
  }
  const blueprintDirection = cell?.blueprint_alignment?.expected_metric_direction;
  const selectedDirection = cell?.selected_metric?.metric_direction;
  if (
    blueprintDirection &&
    selectedDirection &&
    blueprintDirection !== selectedDirection
  ) {
    gaps.push("selected_metric.metric_direction must match blueprint_alignment.expected_metric_direction");
  }
  if (cell?.governance?.source_binding_validated !== true) {
    gaps.push("governance.source_binding_validated must be true");
  }
  if (cell?.governance?.source_refs_validated !== true) {
    gaps.push("governance.source_refs_validated must be true");
  }
  for (const [path, value] of [
    ["blueprint_alignment.org_id", cell?.blueprint_alignment?.org_id],
    ["ai_fluency_context.org_id", cell?.ai_fluency_context?.org_id],
    ["vbd_context.org_id", cell?.vbd_context?.org_id],
    ["selected_metric.org_id", cell?.selected_metric?.org_id],
    ["token_context.org_id", cell?.token_context?.org_id]
  ]) {
    if (value !== undefined && value !== null && value !== cell?.org_id) {
      gaps.push(`${path} must match org_id`);
    }
  }
  for (const [path, value] of [
    ["blueprint_alignment.function_area", cell?.blueprint_alignment?.function_area],
    ["ai_fluency_context.function_area", cell?.ai_fluency_context?.function_area],
    ["vbd_context.function_area", cell?.vbd_context?.function_area],
    ["selected_metric.function_area", cell?.selected_metric?.function_area],
    ["token_context.function_area", cell?.token_context?.function_area]
  ]) {
    if (value !== undefined && value !== null && value !== cell?.function_area) {
      gaps.push(`${path} must match function_area`);
    }
  }
  for (const [path, value] of [
    ["blueprint_alignment.workflow_family", cell?.blueprint_alignment?.workflow_family],
    ["ai_fluency_context.workflow_family", cell?.ai_fluency_context?.workflow_family],
    ["vbd_context.workflow_family", cell?.vbd_context?.workflow_family],
    ["selected_metric.workflow_family", cell?.selected_metric?.workflow_family],
    ["token_context.workflow_family", cell?.token_context?.workflow_family]
  ]) {
    if (value !== undefined && value !== null && value !== cell?.workflow_family) {
      gaps.push(`${path} must match workflow_family`);
    }
  }
  for (const [path, value] of [
    ["blueprint_alignment.cohort_key", cell?.blueprint_alignment?.cohort_key],
    ["ai_fluency_context.cohort_key", cell?.ai_fluency_context?.cohort_key],
    ["vbd_context.cohort_key", cell?.vbd_context?.cohort_key],
    ["selected_metric.cohort_key", cell?.selected_metric?.cohort_key],
    ["token_context.cohort_key", cell?.token_context?.cohort_key]
  ]) {
    if (value !== undefined && value !== null && value !== cell?.cohort_key) {
      gaps.push(`${path} must match cohort_key`);
    }
  }
  for (const [path, value] of [
    ["blueprint_alignment.time_window_id", cell?.blueprint_alignment?.time_window_id],
    ["ai_fluency_context.time_window_id", cell?.ai_fluency_context?.time_window_id],
    ["vbd_context.time_window_id", cell?.vbd_context?.time_window_id],
    ["selected_metric.time_window_id", cell?.selected_metric?.time_window_id],
    ["token_context.time_window_id", cell?.token_context?.time_window_id]
  ]) {
    if (value !== undefined && value !== null && value !== cell?.time_window?.time_window_id) {
      gaps.push(`${path} must match time_window.time_window_id`);
    }
  }
  for (const [path, value] of [
    ["blueprint_alignment.review_state", cell?.blueprint_alignment?.review_state],
    ["ai_fluency_context.review_state", cell?.ai_fluency_context?.review_state],
    ["vbd_context.review_state", cell?.vbd_context?.review_state],
    ["selected_metric.review_state", cell?.selected_metric?.review_state],
    ["token_context.review_state", cell?.token_context?.review_state]
  ]) {
    if (value !== undefined && value !== null && value !== cell?.governance?.review_state) {
      gaps.push(`${path} must match governance.review_state`);
    }
  }
  if (
    cell?.selected_metric?.baseline_window?.window_start &&
    cell?.time_window?.baseline_window?.window_start &&
    cell.selected_metric.baseline_window.window_start !==
      cell.time_window.baseline_window.window_start
  ) {
    gaps.push("selected_metric.baseline_window must match time_window.baseline_window");
  }
  if (
    cell?.selected_metric?.baseline_window?.window_end &&
    cell?.time_window?.baseline_window?.window_end &&
    cell.selected_metric.baseline_window.window_end !==
      cell.time_window.baseline_window.window_end
  ) {
    gaps.push("selected_metric.baseline_window must match time_window.baseline_window");
  }
  if (
    cell?.selected_metric?.comparison_window?.window_start &&
    cell?.time_window?.comparison_window?.window_start &&
    cell.selected_metric.comparison_window.window_start !==
      cell.time_window.comparison_window.window_start
  ) {
    gaps.push("selected_metric.comparison_window must match time_window.comparison_window");
  }
  if (
    cell?.selected_metric?.comparison_window?.window_end &&
    cell?.time_window?.comparison_window?.window_end &&
    cell.selected_metric.comparison_window.window_end !==
      cell.time_window.comparison_window.window_end
  ) {
    gaps.push("selected_metric.comparison_window must match time_window.comparison_window");
  }
  for (const path of [
    "blueprint_alignment.source_ref",
    "ai_fluency_context.source_ref",
    "vbd_context.source_ref",
    "selected_metric.source_ref"
  ]) {
    const value = path.split(".").reduce((acc: any, part: string) => acc?.[part], cell);
    requireField(value, path, gaps);
  }
  for (const [topLevelPath, topLevelValue, nestedPath, nestedValue] of [
    [
      "source_refs.blueprint_source_ref",
      cell?.source_refs?.blueprint_source_ref,
      "blueprint_alignment.source_ref",
      cell?.blueprint_alignment?.source_ref
    ],
    [
      "source_refs.ai_fluency_source_ref",
      cell?.source_refs?.ai_fluency_source_ref,
      "ai_fluency_context.source_ref",
      cell?.ai_fluency_context?.source_ref
    ],
    [
      "source_refs.vbd_source_ref",
      cell?.source_refs?.vbd_source_ref,
      "vbd_context.source_ref",
      cell?.vbd_context?.source_ref
    ],
    [
      "source_refs.metric_source_ref",
      cell?.source_refs?.metric_source_ref,
      "selected_metric.source_ref",
      cell?.selected_metric?.source_ref
    ],
    [
      "source_refs.token_source_ref",
      cell?.source_refs?.token_source_ref,
      "token_context.source_ref",
      cell?.token_context?.source_ref
    ]
  ]) {
    if (
      topLevelValue !== undefined &&
      topLevelValue !== null &&
      nestedValue !== undefined &&
      nestedValue !== null &&
      topLevelValue !== nestedValue
    ) {
      gaps.push(`${topLevelPath} must match ${nestedPath}`);
    }
  }
  return gaps;
}

function collectContextGaps(cell: any): string[] {
  const gaps: string[] = [];
  requireEnum(
    evidenceState(cell?.ai_fluency_context),
    ALLOWED_EVIDENCE_STATES,
    "ai_fluency_context.evidence_state",
    gaps
  );
  requireEnum(
    evidenceState(cell?.vbd_context),
    ALLOWED_EVIDENCE_STATES,
    "vbd_context.evidence_state",
    gaps
  );
  requireEnum(
    evidenceState(cell?.token_context, "not_required"),
    ALLOWED_EVIDENCE_STATES,
    "token_context.evidence_state",
    gaps
  );
  requireEnum(
    cell?.selected_metric?.metric_direction,
    ALLOWED_METRIC_DIRECTIONS,
    "selected_metric.metric_direction",
    gaps
  );
  requireEnum(
    cell?.selected_metric?.metric_sensitivity,
    ALLOWED_METRIC_SENSITIVITY,
    "selected_metric.metric_sensitivity",
    gaps
  );
  requireEnum(
    cell?.selected_metric?.owner_approval_state,
    ALLOWED_OWNER_APPROVAL_STATES,
    "selected_metric.owner_approval_state",
    gaps
  );
  requireEnum(
    cell?.evidence_design?.design_type,
    ALLOWED_DESIGN_TYPES,
    "evidence_design.design_type",
    gaps
  );
  requireEnum(
    cell?.evidence_design?.design_strength_tier,
    ALLOWED_DESIGN_TIERS,
    "evidence_design.design_strength_tier",
    gaps
  );
  if (
    cell?.evidence_design?.design_type &&
    cell?.evidence_design?.design_strength_tier &&
    cell.evidence_design.design_strength_tier !==
      designTier(String(cell.evidence_design.design_type))
  ) {
    gaps.push("evidence_design.design_strength_tier must match evidence_design.design_type");
  }
  requireEnum(
    cell?.finance_review_context?.finance_owner_state,
    ALLOWED_FINANCE_OWNER_STATES,
    "finance_review_context.finance_owner_state",
    gaps
  );
  requireEnum(
    cell?.governance?.review_state,
    ALLOWED_REVIEW_STATES,
    "governance.review_state",
    gaps
  );
  for (const field of ["velocity", "breadth", "depth", "overall_vbd_score"]) {
    const value = numberOrNull(cell?.vbd_context?.[field]);
    if (value === null || value < 0 || value > 100) {
      gaps.push(`vbd_context.${field} must be a number from 0 to 100`);
    }
  }
  if (
    cell?.vbd_context?.integration_score !== undefined &&
    cell?.vbd_context?.integration_score !== null
  ) {
    const integration = numberOrNull(cell.vbd_context.integration_score);
    if (integration === null || integration < 0 || integration > 100) {
      gaps.push("vbd_context.integration_score must be a number from 0 to 100");
    }
  }
  return gaps;
}

function collectGovernanceGaps(cell: any): string[] {
  const gaps: string[] = [];
  requireBoolean(cell?.governance?.aggregate_only, true, "governance.aggregate_only", gaps);
  requireBoolean(
    cell?.governance?.privacy_boundary?.aggregate_only,
    true,
    "governance.privacy_boundary.aggregate_only",
    gaps
  );
  for (const flag of UNSAFE_PRIVACY_FLAGS) {
    requireBoolean(
      cell?.governance?.privacy_boundary?.[flag],
      false,
      `governance.privacy_boundary.${flag}`,
      gaps
    );
  }
  for (const flag of REQUIRED_FALSE_VALUE_PROOF_FLAGS) {
    requireBoolean(cell?.value_proof_policy?.[flag], false, `value_proof_policy.${flag}`, gaps);
  }
  for (const flag of REQUIRED_FALSE_PERSISTENCE_FIELDS) {
    requireBoolean(cell?.persistence_policy?.[flag], false, `persistence_policy.${flag}`, gaps);
  }
  for (const [flag, value] of Object.entries(cell?.governance?.claim_boundary ?? {})) {
    if (String(flag).endsWith("_allowed") && value !== false) {
      gaps.push(`governance.claim_boundary.${flag} must be false`);
    }
  }
  if (
    ["finance_context_review", "finance_approved_pathway"].includes(
      String(cell?.finance_review_context?.finance_owner_state)
    )
  ) {
    if (!Array.isArray(cell?.confounders) || cell.confounders.length === 0) {
      gaps.push("finance-review-ready Measurement Cells require documented confounders");
    }
    if (cell?.evidence_design?.controls_documented !== true) {
      gaps.push("finance-review-ready Measurement Cells require evidence_design.controls_documented true");
    }
  }
  return gaps;
}

function collectUsePolicyGaps(cell: any): string[] {
  const gaps: string[] = [];
  const allowed = stringsOf(cell?.allowed_uses).map(normalizeToken);
  const blocked = stringsOf(cell?.blocked_uses).map(normalizeToken);
  for (const use of allowed) {
    if (!SAFE_ALLOWED_USES.has(use)) {
      gaps.push(`allowed_uses contains unsupported use: ${use}`);
    }
  }
  if (cell?.time_window?.window_mode === "rolling_30_day") {
    for (const use of ROLLING_30_DAY_BLOCKED_ALLOWED_USES) {
      if (allowed.includes(use)) {
        gaps.push(`rolling_30_day Measurement Cells cannot allow ${use}`);
      }
    }
  }
  for (const use of REQUIRED_BLOCKED_USES) {
    if (!blocked.includes(use)) gaps.push(`blocked_uses missing ${use}`);
  }
  return gaps;
}

function collectSuppressionGaps(cell: any): string[] {
  const gaps: string[] = [];
  if (hasSuppression(cell)) {
    if (cell?.governance?.review_state !== "SUPPRESSED") {
      gaps.push("suppressed Measurement Cells must use governance.review_state SUPPRESSED");
    }
    if (cell?.feeds?.value_hypothesis_readiness_input === true) {
      gaps.push("suppressed Measurement Cells must not feed value_hypothesis_readiness_input");
    }
    if (cell?.feeds?.finance_context_investigation_planning === true) {
      gaps.push("suppressed Measurement Cells must not feed finance_context_investigation_planning");
    }
  }
  if (
    cell?.metric_movement?.movement_state === "present" &&
    cell?.vbd_context?.suppression_state === "SUPPRESSED"
  ) {
    gaps.push("metric movement cannot rescue suppressed VBD evidence");
  }
  return gaps;
}

function collectForbiddenGaps(cell: any): string[] {
  const forbidden = Array.from(collectForbiddenFields(cell)).sort();
  const unsafeValues = Array.from(collectUnsafeStringValues(cell)).sort();
  const unsafeClaimLanguage = Array.from(collectUnsafeClaimLanguageValues(cell)).sort();
  return [
    ...forbidden.map((field) => `Forbidden field detected: ${field}`),
    ...(unsafeValues.length
      ? [`Forbidden metadata value(s) present: ${unsafeValues.join(", ")}`]
      : []),
    ...(unsafeClaimLanguage.length
      ? [`Unsafe claim language present: ${unsafeClaimLanguage.join(", ")}`]
      : [])
  ];
}

function feedState(cell: any, valid: boolean): MeasurementCellValidationResult["feeds"] {
  const clear = valid && !hasSuppression(cell);
  const metricPresent = cell?.metric_movement?.movement_state === "present";
  const ownerApproved = cell?.selected_metric?.owner_approval_state === "approved";
  const financePath =
    cell?.finance_review_context?.finance_owner_state === "finance_approved_pathway" ||
    cell?.finance_review_context?.finance_owner_state === "finance_context_review";
  const design = String(cell?.evidence_design?.design_type ?? "");
  const designSupportsResearch = [
    "matched_comparison",
    "staggered_rollout",
    "controlled_test",
    "calibrated_historical_model"
  ].includes(design);
  const financeContextEligibleWindow =
    cell?.time_window?.window_mode !== "rolling_30_day";
  return {
    value_hypothesis_readiness_input: clear,
    business_owner_metric_review: clear && metricPresent && ownerApproved,
    finance_context_investigation_planning:
      clear && metricPresent && ownerApproved && financePath && financeContextEligibleWindow,
    bayesian_research_design_planning:
      clear &&
      metricPresent &&
      ownerApproved &&
      financePath &&
      designSupportsResearch &&
      financeContextEligibleWindow,
    customer_facing_financial_output: false
  };
}

export function validateMeasurementCell(cell: any): MeasurementCellValidationResult {
  const gaps = [
    ...collectTopLevelGaps(cell),
    ...collectAlignmentGaps(cell),
    ...collectContextGaps(cell),
    ...collectGovernanceGaps(cell),
    ...collectUsePolicyGaps(cell),
    ...collectSuppressionGaps(cell),
    ...collectForbiddenGaps(cell)
  ];
  const valid = gaps.length === 0;
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    measurement_cell_id: cell?.measurement_cell_id ?? null,
    org_id: cell?.org_id ?? null,
    valid,
    gaps,
    feeds: feedState(cell, valid)
  };
}

export function buildMeasurementCell(input: BuildMeasurementCellInput): any {
  const windowMode = inferWindowMode(input.timeWindow);
  const daysSinceLaunch = inferDaysSinceLaunch(input.timeWindow);
  const currentVbd = numberOrNull(input.vbdContext?.overall_vbd_score);
  const priorVbd = numberOrNull(input.vbdContext?.prior_overall_vbd_score);
  const momentum = currentVbd !== null && priorVbd !== null
    ? round4(currentVbd - priorVbd)
    : null;
  const baselineValue = numberOrNull(input.selectedMetric?.baseline_value);
  const comparisonValue = numberOrNull(input.selectedMetric?.comparison_value);
  const direction = String(input.selectedMetric?.metric_direction ?? "unknown");
  const adjustedDelta = directionAdjustedDelta(baselineValue, comparisonValue, direction);
  const movementState = adjustedDelta === null ? "missing" : "present";
  const sustainedVbdExposure = numberOrNull(
    input.vbdContext?.sustained_vbd_exposure ??
      (currentVbd !== null && priorVbd !== null ? (currentVbd + priorVbd) / 2 : currentVbd)
  );
  const tokenTotal = numberOrNull(input.tokenContext?.token_total);
  const metricYield = adjustedDelta !== null &&
    sustainedVbdExposure !== null &&
    sustainedVbdExposure > 0
    ? round4(adjustedDelta / sustainedVbdExposure)
    : null;
  const tokenEfficiencyYield = adjustedDelta !== null && tokenTotal !== null && tokenTotal > 0
    ? round4(adjustedDelta / tokenTotal)
    : null;
  const normalizedMomentum = momentum !== null
    ? (() => {
        const priorWindow = input.timeWindow.baseline_window;
        const priorMid = midpointDate(priorWindow);
        const currentMid = midpointDate(input.timeWindow);
        if (!priorMid || !currentMid) return null;
        const gapDays = daysBetween(priorMid, currentMid);
        return gapDays ? round4((momentum / gapDays) * 30) : null;
      })()
    : null;
  const evidenceDesign = input.evidenceDesign ?? { design_type: "pre_post" };
  const designType = String(evidenceDesign.design_type ?? "pre_post");
  const governance = buildGovernance(input.governance);
  const sourceRefs = input.sourceRefs ?? {
    blueprint_source_ref: input.blueprintAlignment?.source_ref ?? null,
    ai_fluency_source_ref: input.aiFluencyContext?.source_ref ?? null,
    vbd_source_ref: input.vbdContext?.source_ref ?? null,
    metric_source_ref: input.selectedMetric?.source_ref ?? null,
    token_source_ref: input.tokenContext?.source_ref ?? null
  };
  const movedInExpectedDirection = adjustedDelta === null
    ? null
    : direction === "maintain"
      ? adjustedDelta === 0
      : adjustedDelta > 0;

  return {
    schema_version: AI_VALUE_MEASUREMENT_CELL_SCHEMA_VERSION,
    measurement_cell_id: input.measurementCellId ??
      [
        "measurement_cell",
        input.orgId,
        input.functionArea,
        input.workflowFamily,
        input.cohortKey,
        input.timeWindow.time_window_id,
        input.selectedMetric?.metric_id ?? "metric"
      ].map((part) => safeIdPart(String(part))).filter(Boolean).join("_"),
    org_id: input.orgId,
    function_area: input.functionArea,
    workflow_family: input.workflowFamily,
    workflow_id: input.workflowId ?? null,
    cohort_key: input.cohortKey,
    time_window: {
      ...input.timeWindow,
      window_mode: windowMode,
      anchor_date: input.timeWindow.anchor_date ?? input.timeWindow.window_end,
      days_since_launch: daysSinceLaunch,
      cadence: input.timeWindow.cadence ?? (
        windowMode === "rolling_30_day" ? "rolling_30_day" : "milestone"
      ),
      window_day_count:
        input.timeWindow.window_day_count ??
        daysBetween(input.timeWindow.window_start, input.timeWindow.window_end)
    },
    blueprint_alignment: {
      ...sourceIdentity(input.blueprintAlignment, input, governance),
      value_route: input.blueprintAlignment?.value_route ?? "unclassified",
      value_promise: input.blueprintAlignment?.value_promise ?? null,
      workflow_family: input.blueprintAlignment?.workflow_family ?? input.workflowFamily,
      expected_metric_id: input.blueprintAlignment?.expected_metric_id ??
        input.selectedMetric?.metric_id,
      expected_metric_direction: input.blueprintAlignment?.expected_metric_direction ??
        input.selectedMetric?.metric_direction,
      expected_metric_lag_days: input.blueprintAlignment?.expected_metric_lag_days ?? null,
      owner_role: input.blueprintAlignment?.owner_role ?? null,
      assumption_refs: stringsOf(input.blueprintAlignment?.assumption_refs),
      source_ref: input.blueprintAlignment?.source_ref ?? null
    },
    ai_fluency_context: {
      ...sourceIdentity(input.aiFluencyContext, input, governance),
      evidence_state: evidenceState(input.aiFluencyContext, "missing"),
      fluency_score: numberOrNull(input.aiFluencyContext?.fluency_score),
      dimension_scores: input.aiFluencyContext?.dimension_scores ?? {},
      response_count: numberOrNull(input.aiFluencyContext?.response_count),
      suppression_state: input.aiFluencyContext?.suppression_state ?? "CLEAR",
      source_ref: input.aiFluencyContext?.source_ref ?? null,
      role: "aggregate_human_readiness_context_only"
    },
    vbd_context: {
      ...sourceIdentity(input.vbdContext, input, governance),
      evidence_state: evidenceState(input.vbdContext, "present"),
      velocity: numberOrNull(input.vbdContext?.velocity),
      breadth: numberOrNull(input.vbdContext?.breadth),
      depth: numberOrNull(input.vbdContext?.depth),
      integration_score: numberOrNull(input.vbdContext?.integration_score),
      overall_vbd_score: currentVbd,
      prior_overall_vbd_score: priorVbd,
      vbd_momentum: momentum,
      normalized_vbd_momentum_30d: normalizedMomentum,
      vbd_quadrant: input.vbdContext?.vbd_quadrant ?? null,
      sustained_vbd_exposure: sustainedVbdExposure,
      suppression_state: input.vbdContext?.suppression_state ?? "CLEAR",
      source_ref: input.vbdContext?.source_ref ?? null,
      role: "aggregate_behavioral_exposure_context_only"
    },
    selected_metric: {
      ...sourceIdentity(input.selectedMetric, input, governance),
      metric_id: input.selectedMetric?.metric_id ?? null,
      metric_name: input.selectedMetric?.metric_name ?? null,
      metric_source_system: input.selectedMetric?.metric_source_system ?? null,
      metric_unit: input.selectedMetric?.metric_unit ?? null,
      metric_direction: direction,
      metric_sensitivity: input.selectedMetric?.metric_sensitivity ?? "unknown",
      expected_lag_days: input.selectedMetric?.expected_lag_days ?? null,
      normalization_denominator: input.selectedMetric?.normalization_denominator ?? null,
      baseline_value: baselineValue,
      comparison_value: comparisonValue,
      baseline_window: input.selectedMetric?.baseline_window ??
        input.timeWindow.baseline_window ??
        null,
      comparison_window: input.selectedMetric?.comparison_window ??
        input.timeWindow.comparison_window ??
        null,
      owner_approval_state: input.selectedMetric?.owner_approval_state ?? "missing",
      suppression_state: input.selectedMetric?.suppression_state ?? "CLEAR",
      source_ref: input.selectedMetric?.source_ref ?? null,
      role: "customer_owned_selected_metric"
    },
    metric_movement: {
      movement_state: movementState,
      direction_adjusted_delta: adjustedDelta,
      expected_direction: direction,
      moved_in_expected_direction: movedInExpectedDirection,
      interpretation_boundary:
        "Metric movement supports review readiness only; it does not prove finance impact or causality."
    },
    token_context: {
      ...sourceIdentity(input.tokenContext, input, governance),
      evidence_state: evidenceState(input.tokenContext, "not_required"),
      token_total: tokenTotal,
      token_per_active_seat: numberOrNull(input.tokenContext?.token_per_active_seat),
      token_intensity_band: input.tokenContext?.token_intensity_band ?? null,
      source_ref: input.tokenContext?.source_ref ?? null,
      role: "spend_or_intensity_context_only"
    },
    yield_context: {
      metric_yield: metricYield,
      token_efficiency_yield: tokenEfficiencyYield,
      sustained_vbd_exposure: sustainedVbdExposure,
      interpretation_boundary:
        "Yield is review context only and must not become ROI proof, productivity scoring, or financial attribution."
    },
    confounders: input.confounders ?? [],
    evidence_design: {
      design_type: designType,
      design_strength_tier: evidenceDesign.design_strength_tier ?? designTier(designType),
      comparison_cell_ref: evidenceDesign.comparison_cell_ref ?? null,
      controls_documented: evidenceDesign.controls_documented ?? false,
      baseline_stability: evidenceDesign.baseline_stability ?? "unknown",
      source_ref: evidenceDesign.source_ref ?? null,
      confidence_ceiling_policy:
        "Future contribution confidence cannot exceed the evidence design strength."
    },
    finance_review_context: {
      finance_owner_state:
        input.financeReviewContext?.finance_owner_state ?? "missing",
      financial_driver:
        input.financeReviewContext?.financial_driver ?? null,
      metric_to_financial_driver_pathway:
        input.financeReviewContext?.metric_to_financial_driver_pathway ?? "missing",
      scenario_context_only: true,
      source_ref: input.financeReviewContext?.source_ref ?? null
    },
    governance,
    allowed_uses: [
      "measurement_cell_alignment",
      "internal_evidence_review",
      "value_hypothesis_readiness_input",
      "business_owner_metric_review",
      ...(windowMode === "rolling_30_day" ? [] : [
        "finance_context_investigation_planning",
        "bayesian_research_design_planning"
      ])
    ],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    value_proof_policy: Object.fromEntries(
      REQUIRED_FALSE_VALUE_PROOF_FLAGS.map((flag) => [flag, false])
    ),
    persistence_policy: Object.fromEntries(
      REQUIRED_FALSE_PERSISTENCE_FIELDS.map((flag) => [flag, false])
    ),
    source_refs: sourceRefs,
    required_caveats: [
      "Measurement Cells are aggregate alignment objects, not ROI proof, financial attribution, causality, productivity measurement, or customer-facing financial output.",
      "Metric movement cannot rescue suppressed VBD, AI Fluency, or governance evidence.",
      "Bayesian modeling remains future research until a later governed decision promotes it.",
      ...rollingWindowCaveats(windowMode),
      ...(input.requiredCaveats ?? [])
    ],
    derivation_version: DERIVATION_VERSION
  };
}
