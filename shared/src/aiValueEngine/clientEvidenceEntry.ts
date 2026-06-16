/**
 * AI Value Engine - Client Evidence Entry.
 *
 * Contract-only safe entry model for aggregate evidence a client provides or
 * manually attests. Entries can become Source Packages only after validation.
 * This module does not ingest raw files, persist snapshots, create routes/UI,
 * compute ROI, prove causality, measure productivity, or enable people
 * decisioning.
 */

import {
  AI_VALUE_SOURCE_PACKAGE_SCHEMA_VERSION,
  type SourcePackage,
  validateSourcePackage
} from "./sourcePackages";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_CLIENT_EVIDENCE_ENTRY_VALIDATION_2026_06";

export const AI_VALUE_CLIENT_EVIDENCE_ENTRY_SCHEMA_VERSION =
  "FT_AI_VALUE_CLIENT_EVIDENCE_ENTRY_2026_06";

const DERIVATION_VERSION =
  "ai_value_client_evidence_entry_builder_2026_06";

const SOURCE_PACKAGE_DERIVATION_VERSION =
  "ai_value_client_evidence_entry_to_source_package_2026_06";

const REQUIRED_ENTRY_FIELDS = [
  "schema_version",
  "entry_id",
  "request_id",
  "org_id",
  "measurement_plan_id",
  "evidence_layer",
  "entry_mode",
  "entered_by_role",
  "source_owner_role",
  "attestation",
  "aggregate_grain",
  "minimum_cohort_threshold",
  "covered_window",
  "metric_or_signal_summary",
  "evidence_state",
  "privacy_boundary",
  "allowed_uses",
  "blocked_uses",
  "required_caveats",
  "validation_status",
  "created_at",
  "derivation_version"
] as const;

const OPTIONAL_ENTRY_FIELDS = [
  "approver_role",
  "rejection_reasons"
] as const;

const ALLOWED_TOP_LEVEL_ENTRY_FIELDS = new Set([
  ...REQUIRED_ENTRY_FIELDS,
  ...OPTIONAL_ENTRY_FIELDS
]);

const ALLOWED_ENTRY_MODES = new Set([
  "aggregate_export_upload_metadata",
  "manual_aggregate_metric_entry",
  "manual_user_voice_aggregate_entry",
  "manual_governance_attestation",
  "manual_assumption_approval",
  "manual_workforce_context_entry"
]);

const ALLOWED_EVIDENCE_LAYERS = new Set([
  "layer_2_user_voice_empirical",
  "layer_3_business_system_outcomes",
  "governance_evidence",
  "assumption_evidence",
  "aggregate_workforce_context"
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

const ALLOWED_EVIDENCE_STATES = new Set([
  "present",
  "partial",
  "missing",
  "held",
  "suppressed",
  "not_computed"
]);

const ALLOWED_VALIDATION_STATUSES = new Set([
  "draft",
  "submitted",
  "validated",
  "rejected",
  "held",
  "suppressed"
]);

const SAFE_ALLOWED_USES = new Set([
  "evidence_collection_input",
  "source_availability_summary",
  "evidence_snapshot_preparation",
  "missing_evidence_planning",
  "aggregate_context_only",
  "governance_review",
  "assumption_review"
]);

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

const WORKFORCE_BLOCKED_USES = [
  "people_decisioning",
  "manager_or_team_ranking",
  "individual_attribution",
  "productivity_claim"
];

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
  /hashed_or_joinable_person_identifiers/i,
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

const LAYER_3_AGGREGATE_OUTCOME_KPI_VALUE_PATTERNS = [
  /(?:^|_)profit(?:_|$)/i,
  /(?:^|_)revenue(?:_|$)/i,
  /cost_savings/i
] as const;

const FORBIDDEN_VALUE_PATTERNS = [
  /(?:^|_)roi(?:_|$)/i,
  /realized_roi/i,
  /return_on_investment/i,
  /investment_return/i,
  /ebita/i,
  /(?:^|_)causal(?:ity)?(?:_|$)/i,
  /(?:^|_)causation(?:_|$)/i,
  /productivity_(?:lift|score|claim|impact|measurement)/i,
  /headcount_reduction/i,
  /(?:^|_)financial(?:_|$)/i,
  /(?:^|_)economic(?:_|$)/i,
  ...LAYER_3_AGGREGATE_OUTCOME_KPI_VALUE_PATTERNS,
  /(?:^|_)dollar(?:_|$)/i,
  /customer_facing_(?:financial|economic)/i,
  /individual_(?:attribution|scoring|score|productivity)/i,
  /employee_(?:score|scoring|productivity)/i,
  /manager_(?:or_team_)?ranking/i,
  /team_ranking/i,
  /people_decisioning/i
];

const LAYER_3_AGGREGATE_OUTCOME_KPI_VALUE_PATTERN_SET =
  new Set<RegExp>(LAYER_3_AGGREGATE_OUTCOME_KPI_VALUE_PATTERNS);

const EMAIL_VALUE_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

const UNSAFE_METADATA_VALUE_PATTERNS = [
  /(?:^|_)(?:user|employee|person|direct)_(?:id|identifier)(?:_|$)/i,
  /(?:^|_)(?:user|employee|person|direct)_[a-z]*\d[a-z0-9]*(?:_|$)/i,
  /(?:^|_)(?:hashed|joinable)_(?:id|identifier|user|person|employee)(?:_|$)/i,
  /(?:^|_)raw_(?:rows?|files?|prompt|response|transcript|content)(?:_|$)/i,
  /(?:^|_)(?:prompt|transcript|query)(?:_|$)/i,
  /(?:^|_)select(?:_|$)/i,
  /(?:^|_)from_raw(?:_|$)/i,
  /(?:^|_)sql_text(?:_|$)/i,
  /(?:^|_)file_contents?(?:_|$)/i,
  /(?:^|_)response_(?:text|body|content|message|raw|value)(?:_|$)/i,
  /(?:^|_)llm_response(?:_|$)/i,
  ...FORBIDDEN_VALUE_PATTERNS
];

const FORBIDDEN_IDENTIFIER_VALUE_PATTERNS = [
  /(?:^|_)(?:user|employee|person|direct)_(?:id|identifier|email)(?:_|$)/i,
  /(?:^|_)(?:user|employee|person|direct)_[a-z]*\d[a-z0-9]*(?:_|$)/i,
  /(?:^|_)(?:hashed|joinable)_(?:id|identifier|user|person|employee)(?:_|$)/i
];

const GOVERNED_KEY_ALLOWLIST = new Set([
  "privacy_boundary",
  "blocked_uses",
  "allowed_uses",
  "attestation",
  "metric_or_signal_summary",
  "required_caveats",
  "rejection_reasons",
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
]);

export const ClientEvidenceEntrySchema = {
  schema_version: AI_VALUE_CLIENT_EVIDENCE_ENTRY_SCHEMA_VERSION,
  required_fields: REQUIRED_ENTRY_FIELDS,
  entry_modes: [...ALLOWED_ENTRY_MODES],
  evidence_layers: [...ALLOWED_EVIDENCE_LAYERS],
  validation_statuses: [...ALLOWED_VALIDATION_STATUSES],
  required_blocked_uses: REQUIRED_BLOCKED_USES,
  source_package_policy: {
    requires_validation_status: "validated",
    invalid_entries_create_source_packages: false
  },
  persistence_policy: {
    persisted: false,
    creates_migrations: false,
    creates_prisma_schema: false,
    creates_backend_routes: false,
    creates_frontend_ui: false,
    creates_ingestion_jobs: false,
    stores_raw_files: false
  }
} as const;

export interface ClientEvidenceEntry {
  schema_version: string;
  entry_id: string;
  request_id: string;
  org_id: string;
  measurement_plan_id: string;
  evidence_layer: string;
  entry_mode: string;
  entered_by_role: string;
  source_owner_role: string;
  approver_role?: string | null;
  attestation: {
    attestation_state: string;
    attested_by_role: string;
    attested_at?: string | null;
    caveats: string[];
  };
  aggregate_grain: string;
  minimum_cohort_threshold: number;
  covered_window: {
    window_start: string;
    window_end: string;
  };
  metric_or_signal_summary: {
    summary_type: string;
    aggregate_metric_name?: string;
    aggregate_signal_name?: string;
    aggregate_value_present: boolean;
    source_refs: Record<string, any>;
    notes: string[];
  };
  evidence_state: string;
  privacy_boundary: Record<string, boolean>;
  allowed_uses: string[];
  blocked_uses: string[];
  required_caveats: string[];
  validation_status: string;
  rejection_reasons?: string[];
  created_at: string;
  derivation_version: string;
}

export interface ClientEvidenceEntryValidationResult {
  schema_version: string;
  entry_id: string | null;
  request_id: string | null;
  org_id: string | null;
  measurement_plan_id: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    client_evidence_entry: boolean;
    source_package: boolean;
    evidence_collection_input: boolean;
    evidence_snapshot: boolean;
    claim_readiness_snapshot: boolean;
    executive_readout_snapshot: boolean;
    customer_facing_financial_output: boolean;
  };
}

export interface BuildSourcePackageFromClientEvidenceEntryOptions {
  generatedAt?: string;
  sourcePackageId?: string;
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

function requireEnum(value: any, allowed: Set<string>, path: string, gaps: string[]): void {
  requireField(value, path, gaps);
  if (value !== undefined && value !== null && value !== "" && !allowed.has(String(value))) {
    gaps.push(`${path} is invalid: ${String(value)}`);
  }
}

function requireBoolean(value: any, expected: boolean, path: string, gaps: string[]): void {
  if (value !== expected) {
    gaps.push(`${path} must be ${expected}`);
  }
}

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

function hasToken(values: any, token: string): boolean {
  return stringsOf(values).map(normalizeToken).includes(token);
}

function safeIdPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function isForbiddenKey(key: string): boolean {
  const normalizedKey = normalizeKey(key);
  if (GOVERNED_KEY_ALLOWLIST.has(normalizedKey)) return false;
  if (REQUIRED_BLOCKED_USES.includes(normalizedKey)) return true;
  return FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(normalizedKey));
}

function collectForbiddenFields(value: any, fields: Set<string> = new Set()): Set<string> {
  if (!value || typeof value !== "object") return fields;
  if (Array.isArray(value)) {
    value.forEach((item) => collectForbiddenFields(item, fields));
    return fields;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (isForbiddenKey(key)) fields.add(key);
    collectForbiddenFields(nested, fields);
  }
  return fields;
}

function isLayer3AggregateOutcomeMetricName(entry: any, value: string): boolean {
  const normalizedValue = normalizeKey(value);
  return entry?.evidence_layer === "layer_3_business_system_outcomes" &&
    ["aggregate_export_upload_metadata", "manual_aggregate_metric_entry"].includes(
      String(entry?.entry_mode)
    ) &&
    normalizedValue.startsWith("aggregate_");
}

function isAllowedLayer3AggregateOutcomeKpiValuePattern(
  entry: any,
  path: string,
  pattern: RegExp,
  value: string
): boolean {
  return path === "metric_or_signal_summary.aggregate_metric_name" &&
    isLayer3AggregateOutcomeMetricName(entry, value) &&
    LAYER_3_AGGREGATE_OUTCOME_KPI_VALUE_PATTERN_SET.has(pattern);
}

function collectForbiddenValues(entry: any): string[] {
  const values = [
    {
      path: "metric_or_signal_summary.aggregate_metric_name",
      value: String(entry?.metric_or_signal_summary?.aggregate_metric_name ?? "")
    },
    {
      path: "metric_or_signal_summary.aggregate_signal_name",
      value: String(entry?.metric_or_signal_summary?.aggregate_signal_name ?? "")
    },
    {
      path: "metric_or_signal_summary.summary_type",
      value: String(entry?.metric_or_signal_summary?.summary_type ?? "")
    },
    ...stringsOf(entry?.allowed_uses).map((value) => ({
      path: "allowed_uses",
      value
    }))
  ].filter(({ value }) => value);
  return values
    .filter(({ path, value }) =>
      FORBIDDEN_VALUE_PATTERNS.some((pattern) =>
        pattern.test(normalizeKey(value)) &&
          !isAllowedLayer3AggregateOutcomeKpiValuePattern(entry, path, pattern, value)
      )
    )
    .map(({ path }) => path);
}

function isUnsafeMetadataValue(value: string): boolean {
  const normalizedValue = normalizeKey(value);
  return EMAIL_VALUE_PATTERN.test(value) ||
    UNSAFE_METADATA_VALUE_PATTERNS.some((pattern) => pattern.test(normalizedValue));
}

function isForbiddenIdentifierValue(value: string): boolean {
  const normalizedValue = normalizeKey(value);
  return EMAIL_VALUE_PATTERN.test(value) ||
    FORBIDDEN_IDENTIFIER_VALUE_PATTERNS.some((pattern) => pattern.test(normalizedValue));
}

function collectUnsafeMetadataValues(
  value: any,
  values: string[] = [],
  path: string[] = []
): string[] {
  if (typeof value === "string") {
    if (isUnsafeMetadataValue(value)) {
      values.push(path.join(".") || "<root>");
    }
    return values;
  }
  if (!value || typeof value !== "object") return values;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectUnsafeMetadataValues(item, values, [...path, String(index)])
    );
    return values;
  }
  for (const [key, nested] of Object.entries(value)) {
    collectUnsafeMetadataValues(nested, values, [...path, key]);
  }
  return values;
}

function collectEntryMetadataValueGaps(entry: any): string[] {
  const metadata = {
    entry_id: entry?.entry_id,
    request_id: entry?.request_id,
    org_id: entry?.org_id,
    measurement_plan_id: entry?.measurement_plan_id,
    entered_by_role: entry?.entered_by_role,
    source_owner_role: entry?.source_owner_role,
    approver_role: entry?.approver_role,
    attestation: {
      attested_by_role: entry?.attestation?.attested_by_role
    },
    metric_or_signal_summary: {
      source_refs: entry?.metric_or_signal_summary?.source_refs
    }
  };
  return collectUnsafeMetadataValues(metadata).map(
    (path) => `Forbidden metadata value detected at ${path}`
  );
}

function collectForbiddenIdentifierValues(
  value: any,
  values: string[] = [],
  path: string[] = []
): string[] {
  if (typeof value === "string") {
    if (isForbiddenIdentifierValue(value)) {
      values.push(path.join(".") || "<root>");
    }
    return values;
  }
  if (!value || typeof value !== "object") return values;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectForbiddenIdentifierValues(item, values, [...path, String(index)])
    );
    return values;
  }
  for (const [key, nested] of Object.entries(value)) {
    collectForbiddenIdentifierValues(nested, values, [...path, key]);
  }
  return values;
}

function collectCaveatIdentifierValueGaps(entry: any): string[] {
  const caveatValues = {
    attestation: {
      caveats: entry?.attestation?.caveats
    },
    required_caveats: entry?.required_caveats,
    rejection_reasons: entry?.rejection_reasons
  };
  return collectForbiddenIdentifierValues(caveatValues).map(
    (path) => `Forbidden identifier value detected at ${path}`
  );
}

function collectTopLevelGaps(entry: any): string[] {
  const gaps: string[] = [];
  for (const field of REQUIRED_ENTRY_FIELDS) {
    requireField(entry?.[field], field, gaps);
  }
  if (entry && typeof entry === "object" && !Array.isArray(entry)) {
    for (const field of Object.keys(entry)) {
      if (!ALLOWED_TOP_LEVEL_ENTRY_FIELDS.has(field as any)) {
        gaps.push(`Forbidden field detected: ${field}`);
      }
    }
  }
  if (entry?.schema_version &&
      entry.schema_version !== AI_VALUE_CLIENT_EVIDENCE_ENTRY_SCHEMA_VERSION) {
    gaps.push(`schema_version is invalid: ${entry.schema_version}`);
  }
  requireEnum(entry?.evidence_layer, ALLOWED_EVIDENCE_LAYERS, "evidence_layer", gaps);
  requireEnum(entry?.entry_mode, ALLOWED_ENTRY_MODES, "entry_mode", gaps);
  requireEnum(entry?.aggregate_grain, ALLOWED_AGGREGATE_GRAINS, "aggregate_grain", gaps);
  requireEnum(entry?.evidence_state, ALLOWED_EVIDENCE_STATES, "evidence_state", gaps);
  requireEnum(
    entry?.validation_status,
    ALLOWED_VALIDATION_STATUSES,
    "validation_status",
    gaps
  );
  requireStringArray(entry?.allowed_uses, "allowed_uses", gaps);
  requireStringArray(entry?.blocked_uses, "blocked_uses", gaps);
  requireStringArray(entry?.required_caveats, "required_caveats", gaps);
  if (entry?.rejection_reasons !== undefined) {
    requireStringArray(entry.rejection_reasons, "rejection_reasons", gaps);
  }
  return gaps;
}

function collectAttestationAndWindowGaps(entry: any): string[] {
  const gaps: string[] = [];
  requireField(entry?.attestation, "attestation", gaps);
  requireField(entry?.attestation?.attestation_state, "attestation.attestation_state", gaps);
  requireField(entry?.attestation?.attested_by_role, "attestation.attested_by_role", gaps);
  requireStringArray(entry?.attestation?.caveats, "attestation.caveats", gaps);
  if (
    ["present", "partial"].includes(String(entry?.evidence_state)) &&
    entry?.attestation?.attestation_state !== "attested"
  ) {
    gaps.push("present or partial entries require attestation.attestation_state attested");
  }
  requireField(entry?.covered_window?.window_start, "covered_window.window_start", gaps);
  requireField(entry?.covered_window?.window_end, "covered_window.window_end", gaps);
  if (
    entry?.covered_window?.window_start &&
    entry?.covered_window?.window_end &&
    String(entry.covered_window.window_start) > String(entry.covered_window.window_end)
  ) {
    gaps.push("covered_window.window_start must be before covered_window.window_end");
  }
  return gaps;
}

function collectPrivacyGaps(entry: any): string[] {
  const gaps: string[] = [];
  requireBoolean(entry?.privacy_boundary?.aggregate_only, true, "privacy_boundary.aggregate_only", gaps);
  for (const flag of UNSAFE_PRIVACY_FLAGS) {
    requireBoolean(entry?.privacy_boundary?.[flag], false, `privacy_boundary.${flag}`, gaps);
  }
  return gaps;
}

function collectUsePolicyGaps(entry: any): string[] {
  const gaps: string[] = [];
  for (const use of REQUIRED_BLOCKED_USES) {
    if (!hasToken(entry?.blocked_uses, use)) {
      gaps.push(`blocked_uses must include ${use}`);
    }
  }
  for (const use of stringsOf(entry?.allowed_uses).map(normalizeToken)) {
    if (!SAFE_ALLOWED_USES.has(use)) {
      gaps.push(`allowed_uses contains blocked or unsupported use: ${use}`);
    }
  }
  return gaps;
}

function collectMetricSummaryGaps(entry: any): string[] {
  const gaps: string[] = [];
  requireField(entry?.metric_or_signal_summary, "metric_or_signal_summary", gaps);
  requireField(
    entry?.metric_or_signal_summary?.summary_type,
    "metric_or_signal_summary.summary_type",
    gaps
  );
  requireBoolean(
    entry?.metric_or_signal_summary?.aggregate_value_present,
    ["present", "partial"].includes(String(entry?.evidence_state)),
    "metric_or_signal_summary.aggregate_value_present",
    gaps
  );
  if (
    entry?.metric_or_signal_summary?.source_refs === undefined ||
    entry?.metric_or_signal_summary?.source_refs === null ||
    Array.isArray(entry.metric_or_signal_summary.source_refs) ||
    typeof entry.metric_or_signal_summary.source_refs !== "object"
  ) {
    gaps.push("metric_or_signal_summary.source_refs must be an object");
  }
  requireStringArray(entry?.metric_or_signal_summary?.notes, "metric_or_signal_summary.notes", gaps);
  return gaps;
}

function collectKMinGaps(entry: any): string[] {
  const gaps: string[] = [];
  if (
    typeof entry?.minimum_cohort_threshold !== "number" ||
    !Number.isFinite(entry.minimum_cohort_threshold) ||
    entry.minimum_cohort_threshold < 5
  ) {
    gaps.push("minimum_cohort_threshold must be a finite number at least 5");
  }
  return gaps;
}

function collectModeLayerGaps(entry: any): string[] {
  const gaps: string[] = [];
  const mode = entry?.entry_mode;
  const layer = entry?.evidence_layer;
  if (
    mode === "manual_aggregate_metric_entry" &&
    layer !== "layer_3_business_system_outcomes"
  ) {
    gaps.push("manual_aggregate_metric_entry requires layer_3_business_system_outcomes");
  }
  if (
    mode === "manual_user_voice_aggregate_entry" &&
    layer !== "layer_2_user_voice_empirical"
  ) {
    gaps.push("manual_user_voice_aggregate_entry requires layer_2_user_voice_empirical");
  }
  if (mode === "manual_governance_attestation" && layer !== "governance_evidence") {
    gaps.push("manual_governance_attestation requires governance_evidence");
  }
  if (mode === "manual_assumption_approval" && layer !== "assumption_evidence") {
    gaps.push("manual_assumption_approval requires assumption_evidence");
  }
  if (mode === "manual_workforce_context_entry") {
    if (layer !== "aggregate_workforce_context") {
      gaps.push("manual_workforce_context_entry requires aggregate_workforce_context");
    }
    for (const use of WORKFORCE_BLOCKED_USES) {
      if (!hasToken(entry?.blocked_uses, use)) {
        gaps.push(`workforce context blocked_uses must include ${use}`);
      }
    }
    if (!stringsOf(entry?.required_caveats).some((caveat) => /non[-_\s]?decisioning/i.test(caveat))) {
      gaps.push("manual_workforce_context_entry requires non-decisioning caveat");
    }
  }
  if (mode === "aggregate_export_upload_metadata") {
    if (entry?.privacy_boundary?.contains_raw_files !== false) {
      gaps.push("aggregate_export_upload_metadata must not store raw files");
    }
  }
  return gaps;
}

export function validateClientEvidenceEntry(entry: any): ClientEvidenceEntryValidationResult {
  const gaps = [
    ...collectTopLevelGaps(entry),
    ...collectAttestationAndWindowGaps(entry),
    ...collectMetricSummaryGaps(entry),
    ...collectKMinGaps(entry),
    ...collectPrivacyGaps(entry),
    ...collectUsePolicyGaps(entry),
    ...collectModeLayerGaps(entry),
    ...collectEntryMetadataValueGaps(entry),
    ...collectCaveatIdentifierValueGaps(entry)
  ];
  for (const field of [...collectForbiddenFields(entry)].sort()) {
    gaps.push(`Forbidden field detected: ${field}`);
  }
  for (const value of collectForbiddenValues(entry)) {
    gaps.push(`Forbidden value detected: ${value}`);
  }

  const valid = gaps.length === 0;
  const canFeedSourcePackage =
    valid &&
    entry?.validation_status === "validated" &&
    ["present", "partial"].includes(String(entry?.evidence_state));

  return {
    schema_version: RESULT_SCHEMA_VERSION,
    entry_id: entry?.entry_id ?? null,
    request_id: entry?.request_id ?? null,
    org_id: entry?.org_id ?? null,
    measurement_plan_id: entry?.measurement_plan_id ?? null,
    valid,
    gaps,
    feeds: {
      client_evidence_entry: valid,
      source_package: canFeedSourcePackage,
      evidence_collection_input: canFeedSourcePackage,
      evidence_snapshot: false,
      claim_readiness_snapshot: false,
      executive_readout_snapshot: false,
      customer_facing_financial_output: false
    }
  };
}

function sourcePackageTypeForEntry(entry: ClientEvidenceEntry): string {
  if (entry.evidence_layer === "layer_2_user_voice_empirical") {
    return "layer_2_user_voice_empirical_export";
  }
  if (entry.evidence_layer === "layer_3_business_system_outcomes") {
    return "layer_3_business_system_of_record_outcome_export";
  }
  if (entry.evidence_layer === "governance_evidence") {
    return "governance_control_export";
  }
  if (entry.evidence_layer === "assumption_evidence") {
    return "assumption_approval_export";
  }
  return "aggregate_workforce_context_export";
}

function sourceSystemTypeForEntry(entry: ClientEvidenceEntry): string {
  if (entry.evidence_layer === "layer_2_user_voice_empirical") {
    return entry.entry_mode === "aggregate_export_upload_metadata"
      ? "aggregate_survey_export"
      : "manual_customer_attestation";
  }
  if (entry.evidence_layer === "layer_3_business_system_outcomes") {
    return entry.entry_mode === "aggregate_export_upload_metadata"
      ? "customer_system_of_record"
      : "manual_customer_attestation";
  }
  if (entry.evidence_layer === "governance_evidence") return "governance_control";
  if (entry.evidence_layer === "assumption_evidence") return "finance_approved_assumption";
  return "aggregate_workforce_export";
}

function sourceRefsForEntry(entry: ClientEvidenceEntry): Record<string, any> {
  const inputRefs = entry.metric_or_signal_summary.source_refs;
  const refs: Record<string, any> = {
    source_readiness_id: entry.metric_or_signal_summary.source_refs.source_readiness_id ??
      `source_readiness_${safeIdPart(entry.entry_id)}`,
    client_evidence_entry_id: entry.entry_id,
    client_evidence_request_id: entry.request_id,
    aggregate_entry_ref: entry.metric_or_signal_summary.source_refs.aggregate_entry_ref ??
      entry.entry_id
  };
  if (entry.evidence_layer === "layer_2_user_voice_empirical") {
    refs.aggregate_export_id =
      inputRefs.aggregate_export_id ??
      inputRefs.aggregate_probe_id ??
      inputRefs.aggregate_entry_ref ??
      entry.entry_id;
  }
  if (entry.evidence_layer === "layer_3_business_system_outcomes") {
    refs.aggregate_outcome_export_id =
      inputRefs.aggregate_outcome_export_id ??
      inputRefs.aggregate_probe_id ??
      inputRefs.aggregate_entry_ref ??
      entry.entry_id;
  }
  if (entry.evidence_layer === "governance_evidence") {
    refs.governance_control_export_id =
      inputRefs.governance_control_export_id ??
      inputRefs.aggregate_probe_id ??
      inputRefs.aggregate_entry_ref ??
      entry.entry_id;
  }
  if (entry.evidence_layer === "assumption_evidence") {
    refs.assumption_approval_export_id =
      inputRefs.assumption_approval_export_id ??
      inputRefs.aggregate_probe_id ??
      inputRefs.aggregate_entry_ref ??
      entry.entry_id;
  }
  if (entry.evidence_layer === "aggregate_workforce_context") {
    refs.aggregate_workforce_context_export_id =
      inputRefs.aggregate_workforce_context_export_id ??
      inputRefs.aggregate_probe_id ??
      inputRefs.aggregate_entry_ref ??
      entry.entry_id;
  }
  return refs;
}

function metricOwnerReviewForEntry(entry: ClientEvidenceEntry): any {
  if (entry.evidence_layer !== "layer_3_business_system_outcomes") return undefined;
  return {
    review_state: "reviewed",
    reviewed_by_role: entry.approver_role ?? entry.source_owner_role,
    reviewed_at: entry.attestation.attested_at ?? entry.created_at
  };
}

function assumptionApprovalForEntry(entry: ClientEvidenceEntry): any {
  if (entry.evidence_layer !== "assumption_evidence") return undefined;
  return {
    approval_state: entry.attestation.attestation_state === "attested" ? "approved" : "submitted",
    approval_owner_role: entry.approver_role ?? entry.source_owner_role,
    approval_caveats: entry.attestation.caveats
  };
}

function aggregateWorkforceContextForEntry(entry: ClientEvidenceEntry): any {
  if (entry.evidence_layer !== "aggregate_workforce_context") return undefined;
  return {
    context_types: [entry.metric_or_signal_summary.summary_type],
    source_owner_approval_state: "approved",
    cohort_threshold_met: true,
    non_decisioning_context: true
  };
}

export function buildSourcePackageFromClientEvidenceEntry(
  entry: ClientEvidenceEntry,
  options: BuildSourcePackageFromClientEvidenceEntryOptions = {}
): SourcePackage {
  const validation = validateClientEvidenceEntry(entry);
  if (!validation.valid) {
    throw new Error(`Client Evidence Entry is invalid: ${validation.gaps.join("; ")}`);
  }
  if (!validation.feeds.source_package) {
    throw new Error("Client Evidence Entry must be validated before Source Package creation");
  }
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const sourcePackage: any = {
    schema_version: AI_VALUE_SOURCE_PACKAGE_SCHEMA_VERSION,
    source_package_id: options.sourcePackageId ??
      `source_package_${safeIdPart(entry.entry_id)}`,
    org_id: entry.org_id,
    source_package_type: sourcePackageTypeForEntry(entry),
    source_owner_role: entry.source_owner_role,
    source_owner_attestation: {
      attestation_state: "attested",
      attested_by_role: entry.attestation.attested_by_role,
      attested_at: entry.attestation.attested_at ?? generatedAt,
      caveats: entry.attestation.caveats
    },
    generated_at: generatedAt,
    covered_window: {
      window_start: entry.covered_window.window_start,
      window_end: entry.covered_window.window_end
    },
    approved_aggregate_grain: entry.aggregate_grain,
    minimum_cohort_threshold: entry.minimum_cohort_threshold,
    k_min_posture: {
      minimum_cohort_threshold: entry.minimum_cohort_threshold,
      cohort_threshold_met: true,
      total_slices: 1,
      k_min_clear_slices: 1,
      suppressed_or_unknown_slices: 0
    },
    source_system_type: sourceSystemTypeForEntry(entry),
    source_refs: sourceRefsForEntry(entry),
    evidence_state: entry.evidence_state,
    privacy_boundary: {
      aggregate_only: true,
      contains_direct_identifiers: false,
      contains_raw_content: false,
      contains_person_level_productivity: false,
      contains_person_level_hris_records: false,
      contains_hashed_or_joinable_person_identifiers: false,
      contains_manager_or_team_ranking: false,
      contains_people_decisioning: false,
      contains_compensation_or_performance_inference: false,
      contains_promotion_or_discipline_inference: false,
      contains_attrition_prediction: false,
      contains_hris_inference_from_ai_usage: false
    },
    allowed_uses: entry.allowed_uses,
    blocked_uses: entry.blocked_uses,
    caveats: entry.required_caveats,
    derivation_version: SOURCE_PACKAGE_DERIVATION_VERSION
  };
  const metricReview = metricOwnerReviewForEntry(entry);
  if (metricReview) sourcePackage.metric_owner_review = metricReview;
  const assumptionApproval = assumptionApprovalForEntry(entry);
  if (assumptionApproval) sourcePackage.assumption_approval = assumptionApproval;
  const workforceContext = aggregateWorkforceContextForEntry(entry);
  if (workforceContext) sourcePackage.aggregate_workforce_context = workforceContext;

  const packageValidation = validateSourcePackage(sourcePackage);
  if (!packageValidation.valid) {
    throw new Error(`Derived Source Package is invalid: ${packageValidation.gaps.join("; ")}`);
  }
  return sourcePackage;
}
