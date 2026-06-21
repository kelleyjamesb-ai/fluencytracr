/**
 * AI Value Engine - Scrubbed Glean Client Export Converter.
 *
 * Converts customer-approved aggregate Glean export summaries into governed
 * AI Value evidence inputs. The converter accepts metadata summaries only. It
 * does not ingest raw rows, persist artifacts, create routes/UI, compute ROI,
 * prove causality, or upgrade Layer 1 source availability into full Playbook
 * coverage.
 */

import {
  AI_VALUE_CLIENT_EVIDENCE_ENTRY_SCHEMA_VERSION,
  type ClientEvidenceEntry,
  validateClientEvidenceEntry
} from "./clientEvidenceEntry";
import {
  AI_VALUE_SOURCE_PACKAGE_SCHEMA_VERSION,
  type SourcePackage,
  validateSourcePackage
} from "./sourcePackages";

export const SCRUBBED_GLEAN_CLIENT_EXPORT_SCHEMA_VERSION =
  "FT_AI_VALUE_SCRUBBED_GLEAN_CLIENT_EXPORT_2026_06";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_SCRUBBED_GLEAN_EXPORT_CONVERSION_2026_06";

const DERIVATION_VERSION =
  "ai_value_scrubbed_glean_export_converter_2026_06";

const LAYER_1_SOURCE_PACKAGE_DERIVATION_VERSION =
  "ai_value_scrubbed_glean_export_to_layer_1_source_package_2026_06";

const REQUIRED_BLOCKED_USES = [
  "realized_roi",
  "ebita_claim",
  "causality_claim",
  "productivity_claim",
  "headcount_reduction_claim",
  "individual_attribution",
  "manager_or_team_ranking",
  "people_decisioning",
  "customer_facing_financial_output"
];

const DEFAULT_ALLOWED_USES = [
  "evidence_collection_input",
  "source_availability_summary"
];

const SAFE_ALLOWED_USES = new Set([
  "evidence_collection_input",
  "source_availability_summary",
  "evidence_snapshot_preparation",
  "missing_evidence_planning",
  "aggregate_context_only",
  "governance_review",
  "assumption_review"
]);

const ALLOWED_EVIDENCE_LAYERS = new Set([
  "layer_1_platform_telemetry",
  "layer_2_user_voice_empirical",
  "layer_3_business_system_outcomes",
  "governance_evidence",
  "assumption_evidence",
  "aggregate_workforce_context"
]);

const ALLOWED_EVIDENCE_STATES = new Set([
  "present",
  "partial",
  "missing",
  "held",
  "suppressed",
  "not_computed"
]);

const ALLOWED_AGGREGATE_GRAINS = new Set([
  "org",
  "function",
  "workflow_family",
  "workflow",
  "role_family",
  "cohort",
  "custom_aggregate"
]);

const UNSAFE_PRIVACY_FLAGS = [
  "contains_direct_identifiers",
  "contains_raw_content",
  "contains_raw_rows",
  "contains_raw_files",
  "contains_raw_prompts",
  "contains_raw_responses",
  "contains_transcripts",
  "contains_query_text",
  "contains_file_contents",
  "contains_person_level_productivity",
  "contains_person_level_hris_records",
  "contains_hashed_or_joinable_person_identifiers",
  "contains_manager_or_team_ranking",
  "contains_people_decisioning",
  "contains_compensation_or_performance_inference",
  "contains_promotion_or_discipline_inference",
  "contains_attrition_prediction",
  "contains_hris_inference_from_ai_usage"
];

const SOURCE_PACKAGE_PRIVACY_FLAGS = [
  "contains_direct_identifiers",
  "contains_raw_content",
  "contains_person_level_productivity",
  "contains_person_level_hris_records",
  "contains_hashed_or_joinable_person_identifiers",
  "contains_manager_or_team_ranking",
  "contains_people_decisioning",
  "contains_compensation_or_performance_inference",
  "contains_promotion_or_discipline_inference",
  "contains_attrition_prediction",
  "contains_hris_inference_from_ai_usage"
];

const FORBIDDEN_KEY_PATTERNS = [
  /raw_(?:rows?|files?|prompt|response|transcript|content)/i,
  /prompt/i,
  /^responses?$/i,
  /(?:^|_)response(?:_|$)/i,
  /(?:^|_)llm_response(?:_|$)/i,
  /response_text/i,
  /transcript/i,
  /^query$/i,
  /(?:^|_)query(?:_|$)/i,
  /query_text/i,
  /sql_text/i,
  /bigquery_sql/i,
  /^file_contents?$/i,
  /file_content/i,
  /email/i,
  /user_id/i,
  /employee_id/i,
  /employee_email/i,
  /employee_name/i,
  /person_id/i,
  /person_identifier/i,
  /direct_identifier/i,
  /direct_ids?/i,
  /hashed_(?:user|person|employee)_id/i,
  /hashed_(?:id|identifier)/i,
  /joinable_(?:user|person|employee)_id/i,
  /joinable_(?:user|person|employee)_identifier/i,
  /joinable_(?:id|identifier)/i,
  /person_level_hris/i,
  /person_level_productivity/i,
  /manager_ranking/i,
  /team_ranking/i,
  /manager_or_team_ranking/i,
  /people_decisioning/i,
  /compensation/i,
  /performance_rating/i,
  /promotion/i,
  /discipline/i,
  /attrition_prediction/i,
  /hris_inference/i,
  /^roi$/i,
  /(?:^|_)roi(?:_|$)/i,
  /return_on_investment/i,
  /investment_return/i,
  /^ebita$/i,
  /ebita_(?:value|amount|impact|calculation|result)/i,
  /dollar(?:ized)?_(?:value|amount|impact|output)/i,
  /(?:^|_)dollar(?:_|$)/i,
  /financial_(?:impact|output|claim|value)/i,
  /(?:^|_)financial(?:_|$)/i,
  /(?:^|_)economic(?:_|$)/i,
  /(?:^|_)profit(?:_|$)/i,
  /(?:^|_)revenue(?:_|$)/i,
  /cost_savings/i,
  /customer_facing_(?:financial|economic)_output/i,
  /^causality$/i,
  /(?:^|_)causal(?:ity)?(?:_|$)/i,
  /(?:^|_)causation(?:_|$)/i,
  /productivity_(?:lift|score|claim|impact|measurement)/i,
  /headcount_reduction/i
];

const FORBIDDEN_VALUE_PATTERNS = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /(?:^|_)(?:user|employee|person|direct)_(?:id|identifier|email)(?:_|$)/i,
  /(?:^|_)(?:user|employee|person|direct)_[a-z]*\d[a-z0-9]*(?:_|$)/i,
  /(?:^|_)(?:hashed|joinable)_(?:id|identifier|user|person|employee)(?:_|$)/i
];

const FORBIDDEN_CLAIM_VALUE_PATTERNS = [
  /^full_playbook_coverage$/i,
  /^roi$/i,
  /realized_roi/i,
  /return_on_investment/i,
  /^ebita$/i,
  /^causality$/i,
  /causal(?:ity)?_(?:claim|proof|result)/i,
  /customer_facing_(?:financial|economic)_output/i,
  /productivity_(?:lift|score|claim|measurement)/i,
  /headcount_reduction/i
];

const FORBIDDEN_CONTAINER_KEYS = new Set([
  "rows",
  "events",
  "samples",
  "records",
  "raw_export",
  "metric_values"
]);

const SAFE_VBD_SUMMARY_KEYS = new Set([
  "baseline_index",
  "comparison_index",
  "movement_direction",
  "aggregate_only",
  "caveats"
]);

const SAFE_VBD_MOVEMENT_DIRECTIONS = new Set([
  "improved",
  "declined",
  "no_change",
  "unknown"
]);

export interface ScrubbedGleanClientExportConversionResult {
  schema_version: string;
  export_id: string | null;
  org_id: string | null;
  measurement_plan_id: string | null;
  evidence_layer: string | null;
  generated_at: string | null;
  derivation_version: string;
  valid: boolean;
  gaps: string[];
  client_evidence_entry: ClientEvidenceEntry | null;
  source_package: SourcePackage | null;
  feeds: {
    client_evidence_entry: boolean;
    source_package: boolean;
    evidence_collection_input: boolean;
    evidence_snapshot: boolean;
    claim_readiness_snapshot: false;
    executive_readout_snapshot: false;
    customer_facing_financial_output: false;
  };
}

export interface ConvertScrubbedGleanClientExportOptions {
  generatedAt?: string;
  clientEvidenceEntryId?: string;
  sourcePackageId?: string;
}

function stringsOf(value: any): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function normalizeKey(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function safeIdPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function requireField(value: any, path: string, gaps: string[]): void {
  if (value === undefined || value === null || value === "") {
    gaps.push(`${path} is missing`);
  }
}

function requireArray(value: any, path: string, gaps: string[]): void {
  if (!Array.isArray(value)) {
    gaps.push(`${path} must be an array`);
  }
}

function requireStringArray(value: any, path: string, gaps: string[]): void {
  requireArray(value, path, gaps);
  if (Array.isArray(value) && value.some((item) => typeof item !== "string")) {
    gaps.push(`${path} must contain only strings`);
  }
}

function requireBoolean(value: any, expected: boolean, path: string, gaps: string[]): void {
  if (value !== expected) {
    gaps.push(`${path} must be ${expected}`);
  }
}

function requireEnum(value: any, allowed: Set<string>, path: string, gaps: string[]): void {
  requireField(value, path, gaps);
  if (value !== undefined && value !== null && value !== "" && !allowed.has(String(value))) {
    gaps.push(`${path} is invalid`);
  }
}

function isPrivacyBoundaryKey(path: string[], key: string): boolean {
  return path.length === 1 &&
    path[0] === "privacy_boundary" &&
    ["aggregate_only", ...UNSAFE_PRIVACY_FLAGS].includes(key);
}

function isForbiddenKey(key: string, path: string[]): boolean {
  if (isPrivacyBoundaryKey(path, key)) return false;
  const normalizedKey = normalizeKey(key);
  if (FORBIDDEN_CONTAINER_KEYS.has(normalizedKey)) return true;
  if (REQUIRED_BLOCKED_USES.includes(normalizedKey)) return true;
  return FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(normalizedKey));
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
    if (isForbiddenKey(key, path)) fields.add(fieldPath.join("."));
    collectForbiddenFields(nested, fields, fieldPath);
  }
  return fields;
}

function isSafePolicyPath(path: string[]): boolean {
  const normalizedPath = path.map(normalizeKey);
  return normalizedPath.includes("blocked_uses") ||
    normalizedPath.some((part) => part.includes("caveat"));
}

function collectForbiddenValues(
  value: any,
  values: Set<string> = new Set(),
  path: string[] = []
): Set<string> {
  if (typeof value === "string") {
    const normalizedValue = normalizeKey(value);
    const unsafeIdentifier = FORBIDDEN_VALUE_PATTERNS.some((pattern) =>
      pattern.test(value) || pattern.test(normalizedValue)
    );
    const unsafeClaim =
      !isSafePolicyPath(path) &&
      FORBIDDEN_CLAIM_VALUE_PATTERNS.some((pattern) => pattern.test(normalizedValue));
    if (unsafeIdentifier || unsafeClaim) {
      const violation = unsafeIdentifier ? "identifier" : "unsupported_claim";
      values.add(`${path.join(".") || "<root>"} (${violation})`);
    }
    return values;
  }
  if (!value || typeof value !== "object") return values;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectForbiddenValues(item, values, [...path, String(index)])
    );
    return values;
  }
  for (const [key, nested] of Object.entries(value)) {
    collectForbiddenValues(nested, values, [...path, key]);
  }
  return values;
}

function collectTopLevelGaps(input: any): string[] {
  const gaps: string[] = [];
  for (const field of [
    "schema_version",
    "export_id",
    "org_id",
    "measurement_plan_id",
    "evidence_layer",
    "source_owner_role",
    "attestation",
    "generated_at",
    "covered_window",
    "aggregate_grain",
    "minimum_cohort_threshold",
    "k_min_posture",
    "privacy_boundary"
  ]) {
    requireField(input?.[field], field, gaps);
  }
  if (
    input?.schema_version &&
    input.schema_version !== SCRUBBED_GLEAN_CLIENT_EXPORT_SCHEMA_VERSION
  ) {
    gaps.push("schema_version is invalid");
  }
  requireEnum(input?.evidence_layer, ALLOWED_EVIDENCE_LAYERS, "evidence_layer", gaps);
  requireEnum(input?.aggregate_grain, ALLOWED_AGGREGATE_GRAINS, "aggregate_grain", gaps);
  if (input?.evidence_state !== undefined) {
    requireEnum(input.evidence_state, ALLOWED_EVIDENCE_STATES, "evidence_state", gaps);
  }
  if (input?.evidence_layer !== "layer_1_platform_telemetry") {
    requireField(input?.request_id, "request_id", gaps);
  }
  return gaps;
}

function collectAttestationAndWindowGaps(input: any): string[] {
  const gaps: string[] = [];
  requireField(input?.attestation?.attestation_state, "attestation.attestation_state", gaps);
  requireField(input?.attestation?.attested_by_role, "attestation.attested_by_role", gaps);
  requireStringArray(input?.attestation?.caveats, "attestation.caveats", gaps);
  requireField(input?.covered_window?.window_start, "covered_window.window_start", gaps);
  requireField(input?.covered_window?.window_end, "covered_window.window_end", gaps);
  if (
    input?.covered_window?.window_start &&
    input?.covered_window?.window_end &&
    String(input.covered_window.window_start) > String(input.covered_window.window_end)
  ) {
    gaps.push("covered_window.window_start must be before covered_window.window_end");
  }
  return gaps;
}

function collectKMinGaps(input: any): string[] {
  const gaps: string[] = [];
  const minimum = Number(input?.minimum_cohort_threshold);
  const postureMinimum = Number(input?.k_min_posture?.minimum_cohort_threshold);
  const cohortThresholdMet = input?.k_min_posture?.cohort_threshold_met;
  const totalSlices = Number(input?.k_min_posture?.total_slices ?? 1);
  const clearSlices = Number(input?.k_min_posture?.k_min_clear_slices ?? (
    cohortThresholdMet === true ? totalSlices : 0
  ));
  const suppressedOrUnknownSlices = Number(
    input?.k_min_posture?.suppressed_or_unknown_slices ?? (
      cohortThresholdMet === true ? 0 : Math.max(totalSlices - clearSlices, 1)
    )
  );
  if (!Number.isFinite(minimum) || minimum < 5) {
    gaps.push("minimum_cohort_threshold must be a finite number at least 5");
  }
  if (!Number.isFinite(postureMinimum) || postureMinimum < 5) {
    gaps.push("k_min_posture.minimum_cohort_threshold must be a finite number at least 5");
  }
  if (Number.isFinite(minimum) && Number.isFinite(postureMinimum) && minimum !== postureMinimum) {
    gaps.push("k_min_posture.minimum_cohort_threshold must match minimum_cohort_threshold");
  }
  if (typeof cohortThresholdMet !== "boolean") {
    gaps.push("k_min_posture.cohort_threshold_met must be boolean");
  }
  if (!Number.isInteger(totalSlices) || totalSlices < 1) {
    gaps.push("k_min_posture.total_slices must be an integer at least 1");
  }
  if (!Number.isInteger(clearSlices) || clearSlices < 0) {
    gaps.push("k_min_posture.k_min_clear_slices must be a non-negative integer");
  }
  if (!Number.isInteger(suppressedOrUnknownSlices) || suppressedOrUnknownSlices < 0) {
    gaps.push("k_min_posture.suppressed_or_unknown_slices must be a non-negative integer");
  }
  if (
    Number.isInteger(totalSlices) &&
    Number.isInteger(clearSlices) &&
    clearSlices > totalSlices
  ) {
    gaps.push("k_min_posture.k_min_clear_slices cannot exceed total_slices");
  }
  if (
    Number.isInteger(totalSlices) &&
    Number.isInteger(clearSlices) &&
    Number.isInteger(suppressedOrUnknownSlices) &&
    clearSlices + suppressedOrUnknownSlices !== totalSlices
  ) {
    gaps.push("k_min_posture.k_min_clear_slices plus suppressed_or_unknown_slices must equal total_slices");
  }
  if (
    cohortThresholdMet === true &&
    Number.isInteger(totalSlices) &&
    Number.isInteger(clearSlices) &&
    Number.isInteger(suppressedOrUnknownSlices) &&
    (clearSlices !== totalSlices || suppressedOrUnknownSlices !== 0)
  ) {
    gaps.push("k_min_posture.cohort_threshold_met true requires k_min_clear_slices to equal total_slices and suppressed_or_unknown_slices to be 0");
  }
  if (
    cohortThresholdMet === false &&
    Number.isInteger(totalSlices) &&
    Number.isInteger(clearSlices) &&
    Number.isInteger(suppressedOrUnknownSlices) &&
    clearSlices === totalSlices &&
    suppressedOrUnknownSlices === 0
  ) {
    gaps.push("k_min_posture.cohort_threshold_met false requires at least one suppressed or uncleared slice");
  }
  return gaps;
}

function collectPrivacyGaps(input: any): string[] {
  const gaps: string[] = [];
  requireBoolean(input?.privacy_boundary?.aggregate_only, true, "privacy_boundary.aggregate_only", gaps);
  for (const flag of UNSAFE_PRIVACY_FLAGS) {
    requireBoolean(input?.privacy_boundary?.[flag], false, `privacy_boundary.${flag}`, gaps);
  }
  return gaps;
}

function collectUsePolicyGaps(input: any): string[] {
  const gaps: string[] = [];
  for (const use of stringsOf(input?.allowed_uses ?? DEFAULT_ALLOWED_USES).map(normalizeToken)) {
    if (!SAFE_ALLOWED_USES.has(use)) {
      gaps.push(`allowed_uses contains blocked or unsupported use: ${use}`);
    }
  }
  for (const use of REQUIRED_BLOCKED_USES) {
    if (!stringsOf(input?.blocked_uses ?? REQUIRED_BLOCKED_USES).map(normalizeToken).includes(use)) {
      gaps.push(`blocked_uses must include ${use}`);
    }
  }
  if (input?.coverage_status === "full_playbook_coverage") {
    gaps.push("scrubbed Glean export cannot declare full_playbook_coverage");
  }
  if (input?.creates_full_playbook_coverage === true) {
    gaps.push("scrubbed Glean export cannot create full Playbook coverage");
  }
  return gaps;
}

function collectLayerSpecificGaps(input: any): string[] {
  const gaps: string[] = [];
  if (input?.evidence_layer === "layer_1_platform_telemetry") {
    requireStringArray(input?.source_tables, "source_tables", gaps);
    requireStringArray(input?.signal_families, "signal_families", gaps);
    if (Array.isArray(input?.signal_families) && input.signal_families.length === 0) {
      gaps.push("signal_families must contain at least one family");
    }
  }
  if (
    input?.evidence_layer !== "layer_1_platform_telemetry" &&
    input?.metric_or_signal_summary !== undefined
  ) {
    requireField(
      input.metric_or_signal_summary.summary_type,
      "metric_or_signal_summary.summary_type",
      gaps
    );
    if (
      input.metric_or_signal_summary.aggregate_value_present !== undefined &&
      typeof input.metric_or_signal_summary.aggregate_value_present !== "boolean"
    ) {
      gaps.push("metric_or_signal_summary.aggregate_value_present must be boolean");
    }
  }
  return gaps;
}

function collectVbdGaps(input: any): string[] {
  if (input?.vbd_summary === undefined) return [];
  const gaps: string[] = [];
  if (
    input.vbd_summary === null ||
    Array.isArray(input.vbd_summary) ||
    typeof input.vbd_summary !== "object"
  ) {
    return ["vbd_summary must be an aggregate metadata object"];
  }
  for (const key of Object.keys(input.vbd_summary)) {
    if (!SAFE_VBD_SUMMARY_KEYS.has(normalizeKey(key))) {
      gaps.push(`vbd_summary.${key} is not allowed`);
    }
  }
  if (input.vbd_summary.aggregate_only !== true) {
    gaps.push("vbd_summary.aggregate_only must be true");
  }
  for (const numericKey of ["baseline_index", "comparison_index"]) {
    if (
      input.vbd_summary[numericKey] !== undefined &&
      (!Number.isFinite(Number(input.vbd_summary[numericKey])) ||
        Number(input.vbd_summary[numericKey]) < 0 ||
        Number(input.vbd_summary[numericKey]) > 1)
    ) {
      gaps.push(`vbd_summary.${numericKey} must be a number between 0 and 1`);
    }
  }
  if (
    input.vbd_summary.movement_direction !== undefined &&
    !SAFE_VBD_MOVEMENT_DIRECTIONS.has(String(input.vbd_summary.movement_direction))
  ) {
    gaps.push("vbd_summary.movement_direction is invalid");
  }
  if (
    input.vbd_summary.caveats !== undefined &&
    (!Array.isArray(input.vbd_summary.caveats) ||
      input.vbd_summary.caveats.some((caveat: any) => typeof caveat !== "string"))
  ) {
    gaps.push("vbd_summary.caveats must contain only strings");
  }
  return gaps;
}

function collectForbiddenInputGaps(input: any): string[] {
  const gaps: string[] = [];
  for (const field of Array.from(collectForbiddenFields(input)).sort()) {
    gaps.push(`Forbidden field detected: ${field}`);
  }
  for (const value of Array.from(collectForbiddenValues(input)).sort()) {
    gaps.push(`Forbidden value detected: ${value}`);
  }
  return gaps;
}

function validateInput(input: any): string[] {
  return [
    ...collectTopLevelGaps(input),
    ...collectAttestationAndWindowGaps(input),
    ...collectKMinGaps(input),
    ...collectPrivacyGaps(input),
    ...collectUsePolicyGaps(input),
    ...collectLayerSpecificGaps(input),
    ...collectVbdGaps(input),
    ...collectForbiddenInputGaps(input)
  ];
}

function sourcePackageTypeForLayer(layer: string): string {
  if (layer === "layer_1_platform_telemetry") return "layer_1_bigquery_telemetry_summary";
  if (layer === "layer_2_user_voice_empirical") return "layer_2_user_voice_empirical_export";
  if (layer === "layer_3_business_system_outcomes") {
    return "layer_3_business_system_of_record_outcome_export";
  }
  if (layer === "governance_evidence") return "governance_control_export";
  if (layer === "assumption_evidence") return "assumption_approval_export";
  return "aggregate_workforce_context_export";
}

function sourceSystemTypeForLayer(layer: string): string {
  if (layer === "layer_1_platform_telemetry") return "bigquery_telemetry";
  if (layer === "layer_2_user_voice_empirical") return "aggregate_survey_export";
  if (layer === "layer_3_business_system_outcomes") return "customer_system_of_record";
  if (layer === "governance_evidence") return "governance_control";
  if (layer === "assumption_evidence") return "finance_approved_assumption";
  return "aggregate_workforce_export";
}

function defaultAggregateSignalName(layer: string): string {
  if (layer === "layer_2_user_voice_empirical") return "aggregate_ai_fluency_export_summary";
  if (layer === "layer_3_business_system_outcomes") return "aggregate_business_outcome_export_summary";
  if (layer === "governance_evidence") return "aggregate_governance_control_export_summary";
  if (layer === "assumption_evidence") return "aggregate_assumption_approval_export_summary";
  return "aggregate_workforce_context_export_summary";
}

function defaultEntryMode(layer: string): string {
  if (layer === "layer_2_user_voice_empirical") return "aggregate_export_upload_metadata";
  if (layer === "layer_3_business_system_outcomes") return "aggregate_export_upload_metadata";
  if (layer === "governance_evidence") return "aggregate_export_upload_metadata";
  if (layer === "assumption_evidence") return "aggregate_export_upload_metadata";
  return "manual_workforce_context_entry";
}

function evidenceStateForInput(input: any): string {
  const requestedState = String(input?.evidence_state ?? "present");
  if (input?.k_min_posture?.cohort_threshold_met === false ||
      Number(input?.k_min_posture?.suppressed_or_unknown_slices ?? 0) > 0) {
    return "suppressed";
  }
  return ALLOWED_EVIDENCE_STATES.has(requestedState) ? requestedState : "held";
}

function kMinPostureForInput(input: any): Record<string, number | boolean> {
  const cohortThresholdMet = input.k_min_posture.cohort_threshold_met === true;
  const totalSlices = Number(input.k_min_posture.total_slices ?? 1);
  const clearSlices = Number(input.k_min_posture.k_min_clear_slices ?? (
    cohortThresholdMet ? totalSlices : 0
  ));
  const suppressedOrUnknownSlices = Number(
    input.k_min_posture.suppressed_or_unknown_slices ?? (
      cohortThresholdMet ? 0 : Math.max(totalSlices - clearSlices, 1)
    )
  );
  return {
    minimum_cohort_threshold: input.k_min_posture.minimum_cohort_threshold,
    cohort_threshold_met: cohortThresholdMet,
    total_slices: totalSlices,
    k_min_clear_slices: clearSlices,
    suppressed_or_unknown_slices: suppressedOrUnknownSlices
  };
}

function sourceRefsForInput(input: any, clientEvidenceEntryId?: string): Record<string, any> {
  const inputSourceRefs =
    input?.source_refs &&
    typeof input.source_refs === "object" &&
    !Array.isArray(input.source_refs)
      ? input.source_refs
      : {};
  const refs: Record<string, any> = {
    source_readiness_id: input.source_readiness_id ??
      inputSourceRefs.source_readiness_id ??
      `source_readiness_${safeIdPart(String(input.export_id ?? "unknown"))}`,
    source_export_id: input.source_export_id ??
      inputSourceRefs.source_export_id ??
      input.export_id,
    aggregate_probe_id: input.aggregate_probe_id ??
      inputSourceRefs.aggregate_probe_id ??
      input.export_id,
    aggregate_entry_ref: input.aggregate_entry_ref ??
      inputSourceRefs.aggregate_entry_ref ??
      input.export_id
  };
  if (input.evidence_layer === "layer_2_user_voice_empirical") {
    refs.aggregate_export_id = input.aggregate_export_id ??
      inputSourceRefs.aggregate_export_id ??
      input.aggregate_probe_id ??
      inputSourceRefs.aggregate_probe_id ??
      input.export_id;
  }
  if (input.evidence_layer === "layer_3_business_system_outcomes") {
    refs.aggregate_outcome_export_id = input.aggregate_outcome_export_id ??
      inputSourceRefs.aggregate_outcome_export_id ??
      input.aggregate_probe_id ??
      inputSourceRefs.aggregate_probe_id ??
      input.export_id;
  }
  if (input.evidence_layer === "governance_evidence") {
    refs.governance_control_export_id = input.governance_control_export_id ??
      inputSourceRefs.governance_control_export_id ??
      input.aggregate_probe_id ??
      inputSourceRefs.aggregate_probe_id ??
      input.export_id;
  }
  if (input.evidence_layer === "assumption_evidence") {
    refs.assumption_approval_export_id = input.assumption_approval_export_id ??
      inputSourceRefs.assumption_approval_export_id ??
      input.aggregate_probe_id ??
      inputSourceRefs.aggregate_probe_id ??
      input.export_id;
  }
  if (input.evidence_layer === "aggregate_workforce_context") {
    refs.aggregate_workforce_context_export_id =
      input.aggregate_workforce_context_export_id ??
      inputSourceRefs.aggregate_workforce_context_export_id ??
      input.aggregate_probe_id ??
      inputSourceRefs.aggregate_probe_id ??
      input.export_id;
  }
  if (clientEvidenceEntryId) {
    refs.client_evidence_entry_id = clientEvidenceEntryId;
    refs.client_evidence_request_id = input.request_id;
  }
  if (Array.isArray(input.source_tables)) refs.source_tables = stringsOf(input.source_tables);
  if (Array.isArray(input.table_families_checked)) {
    refs.table_families_checked = stringsOf(input.table_families_checked);
  }
  const signalFamilies = stringsOf(input.signal_families);
  if (signalFamilies.length > 0) refs.reportability_signal_families = signalFamilies;
  const coveredSignalFamilies = stringsOf(input.covered_signal_families);
  if (coveredSignalFamilies.length > 0) refs.covered_signal_families = coveredSignalFamilies;
  if (input.vbd_summary !== undefined) {
    refs.vbd_summary = {
      ...(input.vbd_summary.baseline_index !== undefined
        ? { baseline_index: Number(input.vbd_summary.baseline_index) }
        : {}),
      ...(input.vbd_summary.comparison_index !== undefined
        ? { comparison_index: Number(input.vbd_summary.comparison_index) }
        : {}),
      ...(input.vbd_summary.movement_direction !== undefined
        ? { movement_direction: input.vbd_summary.movement_direction }
        : {}),
      aggregate_only: true,
      ...(input.vbd_summary.caveats !== undefined
        ? { caveats: stringsOf(input.vbd_summary.caveats) }
        : {})
    };
  }
  return refs;
}

function sourcePackagePrivacyBoundary(input: any): Record<string, boolean> {
  const boundary: Record<string, boolean> = {
    aggregate_only: true
  };
  for (const flag of SOURCE_PACKAGE_PRIVACY_FLAGS) {
    boundary[flag] = Boolean(input?.privacy_boundary?.[flag]);
  }
  return boundary;
}

function caveatsForInput(input: any, evidenceState: string): string[] {
  const caveats = [
    ...stringsOf(input?.attestation?.caveats),
    ...stringsOf(input?.caveats)
  ];
  if (evidenceState === "suppressed") {
    caveats.push("Scrubbed Glean export evidence is suppressed because k-min or source suppression posture is not clear.");
  }
  if (input?.evidence_layer === "layer_1_platform_telemetry" &&
      !caveats.some((caveat) => /full Playbook coverage/i.test(caveat))) {
    caveats.push("Layer 1 telemetry is source availability evidence only and cannot create full Playbook coverage by itself.");
  }
  return Array.from(new Set(caveats));
}

function notesForInput(input: any, evidenceState: string): string[] {
  const notes = [
    ...stringsOf(input?.notes)
  ];
  if (evidenceState === "suppressed") {
    notes.push("Suppressed source posture is preserved as caveat-bearing evidence, not upgraded to present evidence.");
  }
  return Array.from(new Set(notes));
}

function buildLayer1SourcePackage(input: any, options: ConvertScrubbedGleanClientExportOptions): SourcePackage {
  const evidenceState = evidenceStateForInput(input);
  const generatedAt = options.generatedAt ?? input.generated_at;
  const sourcePackage: SourcePackage = {
    schema_version: AI_VALUE_SOURCE_PACKAGE_SCHEMA_VERSION,
    source_package_id: options.sourcePackageId ??
      `source_package_${safeIdPart(String(input.export_id))}`,
    org_id: input.org_id,
    source_package_type: sourcePackageTypeForLayer(input.evidence_layer),
    source_owner_role: input.source_owner_role,
    source_owner_attestation: {
      attestation_state: input.attestation.attestation_state,
      attested_by_role: input.attestation.attested_by_role,
      attested_at: input.attestation.attested_at ?? generatedAt,
      caveats: stringsOf(input.attestation.caveats)
    },
    generated_at: generatedAt,
    covered_window: {
      window_start: input.covered_window.window_start,
      window_end: input.covered_window.window_end
    },
    approved_aggregate_grain: input.aggregate_grain,
    minimum_cohort_threshold: input.minimum_cohort_threshold,
    k_min_posture: kMinPostureForInput(input),
    source_system_type: sourceSystemTypeForLayer(input.evidence_layer),
    source_refs: sourceRefsForInput(input),
    evidence_state: evidenceState,
    privacy_boundary: sourcePackagePrivacyBoundary(input),
    allowed_uses: stringsOf(input.allowed_uses ?? DEFAULT_ALLOWED_USES),
    blocked_uses: stringsOf(input.blocked_uses ?? REQUIRED_BLOCKED_USES),
    caveats: caveatsForInput(input, evidenceState),
    derivation_version: LAYER_1_SOURCE_PACKAGE_DERIVATION_VERSION
  };
  const validation = validateSourcePackage(sourcePackage);
  if (!validation.valid) {
    throw new Error(`Derived Layer 1 Source Package is invalid: ${validation.gaps.join("; ")}`);
  }
  return sourcePackage;
}

function buildClientEvidenceEntry(input: any, options: ConvertScrubbedGleanClientExportOptions): ClientEvidenceEntry {
  const evidenceState = evidenceStateForInput(input);
  const generatedAt = options.generatedAt ?? input.generated_at;
  const entryId = options.clientEvidenceEntryId ??
    `client_evidence_entry_${safeIdPart(String(input.export_id))}`;
  const summary = input.metric_or_signal_summary ?? {};
  const sourceRefs = sourceRefsForInput(input, entryId);
  const aggregateValuePresent =
    evidenceState === "present" || evidenceState === "partial";
  const entry: ClientEvidenceEntry = {
    schema_version: AI_VALUE_CLIENT_EVIDENCE_ENTRY_SCHEMA_VERSION,
    entry_id: entryId,
    request_id: input.request_id,
    org_id: input.org_id,
    measurement_plan_id: input.measurement_plan_id,
    evidence_layer: input.evidence_layer,
    entry_mode: defaultEntryMode(input.evidence_layer),
    entered_by_role: input.entered_by_role ?? "post_sales_value_consultant",
    source_owner_role: input.source_owner_role,
    approver_role: input.approver_role ?? input.source_owner_role,
    attestation: {
      attestation_state: input.attestation.attestation_state,
      attested_by_role: input.attestation.attested_by_role,
      attested_at: input.attestation.attested_at ?? generatedAt,
      caveats: stringsOf(input.attestation.caveats)
    },
    aggregate_grain: input.aggregate_grain,
    minimum_cohort_threshold: input.minimum_cohort_threshold,
    covered_window: {
      window_start: input.covered_window.window_start,
      window_end: input.covered_window.window_end
    },
    metric_or_signal_summary: {
      summary_type: summary.summary_type ?? "aggregate_export_metadata_summary",
      aggregate_signal_name: summary.aggregate_signal_name ??
        summary.aggregate_metric_name ??
        defaultAggregateSignalName(input.evidence_layer),
      aggregate_value_present: aggregateValuePresent
        ? summary.aggregate_value_present ?? true
        : false,
      source_refs: sourceRefs,
      notes: notesForInput(input, evidenceState)
    },
    evidence_state: evidenceState,
    privacy_boundary: input.privacy_boundary,
    allowed_uses: stringsOf(input.allowed_uses ?? [
      "evidence_collection_input",
      "evidence_snapshot_preparation"
    ]),
    blocked_uses: stringsOf(input.blocked_uses ?? REQUIRED_BLOCKED_USES),
    required_caveats: caveatsForInput(input, evidenceState),
    validation_status: input.validation_status ?? "validated",
    created_at: generatedAt,
    derivation_version: DERIVATION_VERSION
  };
  const validation = validateClientEvidenceEntry(entry);
  if (!validation.valid) {
    throw new Error(`Derived Client Evidence Entry is invalid: ${validation.gaps.join("; ")}`);
  }
  return entry;
}

function sourcePackageFromClientEvidenceEntry(
  entry: ClientEvidenceEntry,
  input: any,
  options: ConvertScrubbedGleanClientExportOptions
): SourcePackage | null {
  const entryValidation = validateClientEvidenceEntry(entry);
  if (!entryValidation.valid) return null;
  const generatedAt = options.generatedAt ?? input.generated_at;
  const sourcePackage: SourcePackage = {
    schema_version: AI_VALUE_SOURCE_PACKAGE_SCHEMA_VERSION,
    source_package_id: options.sourcePackageId ??
      `source_package_${safeIdPart(String(input.export_id))}`,
    org_id: input.org_id,
    source_package_type: sourcePackageTypeForLayer(input.evidence_layer),
    source_owner_role: input.source_owner_role,
    source_owner_attestation: {
      attestation_state: input.attestation.attestation_state,
      attested_by_role: input.attestation.attested_by_role,
      attested_at: input.attestation.attested_at ?? generatedAt,
      caveats: stringsOf(input.attestation.caveats)
    },
    generated_at: generatedAt,
    covered_window: {
      window_start: input.covered_window.window_start,
      window_end: input.covered_window.window_end
    },
    approved_aggregate_grain: input.aggregate_grain,
    minimum_cohort_threshold: input.minimum_cohort_threshold,
    k_min_posture: kMinPostureForInput(input),
    source_system_type: sourceSystemTypeForLayer(input.evidence_layer),
    source_refs: sourceRefsForInput(input, entry.entry_id),
    evidence_state: entry.evidence_state,
    privacy_boundary: sourcePackagePrivacyBoundary(input),
    allowed_uses: stringsOf(input.allowed_uses ?? DEFAULT_ALLOWED_USES),
    blocked_uses: stringsOf(input.blocked_uses ?? REQUIRED_BLOCKED_USES),
    caveats: caveatsForInput(input, entry.evidence_state),
    derivation_version: DERIVATION_VERSION
  };
  if (input.evidence_layer === "layer_3_business_system_outcomes") {
    (sourcePackage as any).metric_owner_review = {
      review_state: input.metric_owner_review?.review_state ?? "reviewed",
      reviewed_by_role:
        input.metric_owner_review?.reviewed_by_role ??
        input.source_owner_role,
      reviewed_at: input.metric_owner_review?.reviewed_at ?? generatedAt,
      caveats: stringsOf(input.metric_owner_review?.caveats)
    };
  }
  if (input.evidence_layer === "assumption_evidence") {
    (sourcePackage as any).assumption_approval = {
      approval_state: input.assumption_approval?.approval_state ?? "approved",
      approval_owner_role:
        input.assumption_approval?.approval_owner_role ??
        input.source_owner_role,
      approved_at: input.assumption_approval?.approved_at ?? generatedAt,
      approval_caveats: stringsOf(input.assumption_approval?.approval_caveats)
    };
  }
  if (input.evidence_layer === "aggregate_workforce_context") {
    (sourcePackage as any).aggregate_workforce_context = {
      context_types: [entry.metric_or_signal_summary.summary_type],
      source_owner_approval_state:
        input.aggregate_workforce_context?.source_owner_approval_state ??
        "approved",
      cohort_threshold_met: input.k_min_posture.cohort_threshold_met === true,
      non_decisioning_context: true
    };
  }
  const validation = validateSourcePackage(sourcePackage);
  if (!validation.valid) {
    throw new Error(`Derived Source Package is invalid: ${validation.gaps.join("; ")}`);
  }
  return sourcePackage;
}

function safeResultMetadataValue(value: any): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const normalizedValue = normalizeKey(trimmed);
  const unsafe =
    FORBIDDEN_VALUE_PATTERNS.some((pattern) =>
      pattern.test(trimmed) || pattern.test(normalizedValue)
    ) ||
    FORBIDDEN_CLAIM_VALUE_PATTERNS.some((pattern) => pattern.test(normalizedValue)) ||
    /(?:^|_)(?:raw|prompt|response|transcript|query|sql|table|dataset|file_content)(?:_|$)/i
      .test(normalizedValue);
  if (unsafe) return null;
  return /^[A-Za-z0-9_.:-]+$/.test(trimmed) ? trimmed : null;
}

function invalidResult(input: any, gaps: string[]): ScrubbedGleanClientExportConversionResult {
  const exportId = safeResultMetadataValue(input?.export_id);
  const orgId = safeResultMetadataValue(input?.org_id);
  const measurementPlanId = safeResultMetadataValue(input?.measurement_plan_id);
  const evidenceLayer = ALLOWED_EVIDENCE_LAYERS.has(String(input?.evidence_layer ?? ""))
    ? String(input.evidence_layer)
    : null;
  const generatedAt = safeResultMetadataValue(input?.generated_at);
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    export_id: exportId,
    org_id: orgId,
    measurement_plan_id: measurementPlanId,
    evidence_layer: evidenceLayer,
    generated_at: generatedAt,
    derivation_version: DERIVATION_VERSION,
    valid: false,
    gaps,
    client_evidence_entry: null,
    source_package: null,
    feeds: {
      client_evidence_entry: false,
      source_package: false,
      evidence_collection_input: false,
      evidence_snapshot: false,
      claim_readiness_snapshot: false,
      executive_readout_snapshot: false,
      customer_facing_financial_output: false
    }
  };
}

export function convertScrubbedGleanClientExportToEvidenceInputs(
  input: any,
  options: ConvertScrubbedGleanClientExportOptions = {}
): ScrubbedGleanClientExportConversionResult {
  const inputGaps = validateInput(input);
  if (inputGaps.length > 0) {
    return invalidResult(input, inputGaps);
  }

  try {
    if (input.evidence_layer === "layer_1_platform_telemetry") {
      const sourcePackage = buildLayer1SourcePackage(input, options);
      return {
        schema_version: RESULT_SCHEMA_VERSION,
        export_id: input.export_id,
        org_id: input.org_id,
        measurement_plan_id: input.measurement_plan_id,
        evidence_layer: input.evidence_layer,
        generated_at: options.generatedAt ?? input.generated_at,
        derivation_version: DERIVATION_VERSION,
        valid: true,
        gaps: [],
        client_evidence_entry: null,
        source_package: sourcePackage,
        feeds: {
          client_evidence_entry: false,
          source_package: true,
          evidence_collection_input: true,
          evidence_snapshot: false,
          claim_readiness_snapshot: false,
          executive_readout_snapshot: false,
          customer_facing_financial_output: false
        }
      };
    }

    const clientEvidenceEntry = buildClientEvidenceEntry(input, options);
    const sourcePackage = sourcePackageFromClientEvidenceEntry(
      clientEvidenceEntry,
      input,
      options
    );
    return {
      schema_version: RESULT_SCHEMA_VERSION,
      export_id: input.export_id,
      org_id: input.org_id,
      measurement_plan_id: input.measurement_plan_id,
      evidence_layer: input.evidence_layer,
      generated_at: options.generatedAt ?? input.generated_at,
      derivation_version: DERIVATION_VERSION,
      valid: true,
      gaps: [],
      client_evidence_entry: clientEvidenceEntry,
      source_package: sourcePackage,
      feeds: {
        client_evidence_entry: true,
        source_package: sourcePackage !== null,
        evidence_collection_input: sourcePackage !== null,
        evidence_snapshot: false,
        claim_readiness_snapshot: false,
        executive_readout_snapshot: false,
        customer_facing_financial_output: false
      }
    };
  } catch (error) {
    return invalidResult(input, [error instanceof Error ? error.message : String(error)]);
  }
}

export function validateScrubbedGleanClientExport(
  input: any
): ScrubbedGleanClientExportConversionResult {
  return convertScrubbedGleanClientExportToEvidenceInputs(input);
}
