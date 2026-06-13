/**
 * AI Value Engine - Token Efficiency Signal.
 *
 * Aggregate-only Layer 1 cost/intensity overlay for token usage. Token
 * Efficiency can inform cost exposure, model routing, workflow intensity, and
 * evidence planning, but it cannot prove ROI, EBITA, productivity, causality,
 * headcount reduction, individual attribution, people decisions, or customer-
 * facing financial output.
 */

export const AI_VALUE_TOKEN_EFFICIENCY_SIGNAL_SCHEMA_VERSION =
  "FT_AI_VALUE_TOKEN_EFFICIENCY_SIGNAL_2026_06";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_TOKEN_EFFICIENCY_SIGNAL_VALIDATION_2026_06";

const REQUIRED_FIELDS = [
  "schema_version",
  "token_efficiency_signal_id",
  "org_id",
  "workflow_family",
  "generated_at",
  "covered_window",
  "approved_aggregate_grain",
  "minimum_cohort_threshold",
  "k_min_posture",
  "playbook_layer",
  "evidence_lane",
  "coverage_contribution",
  "full_playbook_coverage_contribution",
  "evidence_state",
  "source_refs",
  "source_owner_attestation",
  "privacy_boundary",
  "allowed_uses",
  "blocked_uses",
  "value_proof_policy",
  "caveats",
  "derivation_version"
] as const;

const ALLOWED_EVIDENCE_STATES = new Set([
  "present",
  "partial",
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

const ALLOWED_ATTESTATION_STATES = new Set([
  "attested",
  "submitted",
  "missing",
  "rejected",
  "held"
]);

const SAFE_ALLOWED_USES = new Set([
  "cost_exposure_review",
  "model_usage_review",
  "workflow_intensity_review",
  "token_efficiency_review",
  "model_routing_review",
  "workflow_design_review",
  "evidence_collection_planning"
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

const UNSAFE_PRIVACY_FLAGS = [
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

const REQUIRED_FALSE_VALUE_PROOF_FLAGS = [
  "token_usage_is_roi_proof",
  "token_usage_is_productivity_proof",
  "token_usage_is_financial_output",
  "token_usage_computes_causality",
  "downstream_claim_strength_upgrade_allowed"
];

const FORBIDDEN_FIELD_PATTERNS = [
  /^roi_output$/i,
  /^roi$/i,
  /^realized_roi$/i,
  /^ebita_value$/i,
  /^ebita_claim$/i,
  /^ebita$/i,
  /^productivity_output$/i,
  /^productivity_claim$/i,
  /^causality_claim$/i,
  /^headcount_reduction_value$/i,
  /^headcount_reduction_claim$/i,
  /^financial_impact$/i,
  /^financial_output$/i,
  /^customer_facing_financial_output$/i,
  /^customer_facing_economic_output$/i,
  /^claim_readiness$/i,
  /^claim_readiness_snapshots?$/i,
  /^executive_readout$/i,
  /^executive_readout_snapshots?$/i,
  /^readout$/i,
  /^readout_output$/i,
  /^persistence_policy$/i,
  /^persisted$/i,
  /^persistence$/i,
  /^creates_backend_routes?$/i,
  /^creates_frontend_ui$/i,
  /^creates_migrations?$/i,
  /^creates_ingestion_jobs?$/i,
  /^backend_routes?$/i,
  /^frontend_ui$/i,
  /^migrations?$/i,
  /^ingestion_jobs?$/i,
  /^raw_rows?$/i,
  /^raw_query$/i,
  /^raw_prompts?$/i,
  /^raw_responses?$/i,
  /^raw_transcripts?$/i,
  /^prompt_text$/i,
  /^response_(?:text|body|content|message|raw|value)$/i,
  /^llm_response$/i,
  /^raw_content$/i,
  /^prompt$/i,
  /^response$/i,
  /^transcript$/i,
  /^query$/i,
  /^query_text$/i,
  /^sql_text$/i,
  /^file_contents?$/i,
  /^user_id$/i,
  /^user_ids$/i,
  /^employee_id$/i,
  /^employee_ids$/i,
  /^employee_email$/i,
  /^employee_name$/i,
  /^user_name$/i,
  /^person_name$/i,
  /^direct_identifiers?$/i,
  /^direct_person_identifier$/i,
  /^direct_names?$/i,
  /^person_id$/i,
  /^person_identifier$/i,
  /^hashed_person_id$/i,
  /^hashed_user_id$/i,
  /^hashed_employee_id$/i,
  /^hashed_identifiers?$/i,
  /^joinable_person_identifier$/i,
  /^joinable_user_identifier$/i,
  /^joinable_employee_identifier$/i,
  /^joinable_identifiers?$/i,
  /^person_level_productivity$/i,
  /^person_level_hris_records?$/i,
  /^manager_or_team_ranking$/i,
  /^manager_team_ranking$/i,
  /^manager_ranking$/i,
  /^team_ranking$/i,
  /^people_decisioning$/i,
  /^person_level_hris$/i,
  /^compensation_or_performance_inference$/i,
  /^promotion_or_discipline_inference$/i,
  /^attrition_prediction$/i,
  /^hris_inference_from_ai_usage$/i,
  /^hris_inference$/i
];

const EMAIL_VALUE_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

const UNSAFE_METADATA_VALUE_PATTERNS = [
  /(?:^|_)(?:user|employee|person|direct)_(?:ids?|identifiers?|emails?|names?)(?:_|$)/i,
  /(?:^|_)(?:hashed|joinable|pseudonymous|tokenized)_(?:ids?|identifiers?|users?|persons?|employees?)(?:_|$)/i,
  /(?:^|_)raw_(?:rows?|query|prompts?|responses?|transcripts?|content)(?:_|$)/i,
  /(?:^|_)(?:prompt|prompt_text|transcript|query|raw_query)(?:_|$)/i,
  /(?:^|_)query_text(?:_|$)/i,
  /(?:^|_)sql_text(?:_|$)/i,
  /(?:^|_)file_contents?(?:_|$)/i,
  /(?:^|_)response_(?:text|body|content|message|raw|value)(?:_|$)/i,
  /(?:^|_)llm_response(?:_|$)/i,
  /(?:^|_)direct_identifier(?:_|$)/i,
  /(?:^|_)person_level(?:_|$)/i,
  /(?:^|_)manager_ranking(?:_|$)/i,
  /(?:^|_)team_ranking(?:_|$)/i,
  /(?:^|_)manager_team_ranking(?:_|$)/i,
  /(?:^|_)manager_or_team_ranking(?:_|$)/i,
  /(?:^|_)people_decisioning(?:_|$)/i,
  /(?:^|_)compensation(?:_|$)/i,
  /(?:^|_)performance_rating(?:_|$)/i,
  /(?:^|_)promotion(?:_|$)/i,
  /(?:^|_)discipline(?:_|$)/i,
  /(?:^|_)attrition_prediction(?:_|$)/i,
  /(?:^|_)hris_inference(?:_|$)/i
];

const TOKEN_SUMMARY_NUMERIC_FIELDS = [
  "total_prompt_tokens",
  "total_completion_tokens",
  "total_tokens",
  "aggregate_interaction_count",
  "aggregate_workflow_count",
  "high_intensity_workflow_share",
  "average_tokens_per_interaction",
  "average_tokens_per_workflow",
  "prompt_to_completion_ratio"
];

const PRIVACY_BOUNDARY = {
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
};

export const TokenEfficiencySignalSchema = {
  schema_version: AI_VALUE_TOKEN_EFFICIENCY_SIGNAL_SCHEMA_VERSION,
  required_fields: REQUIRED_FIELDS,
  playbook_layer: "layer_1_platform_telemetry",
  evidence_lane: "surface_usage",
  coverage_contribution: "layer_1_cost_intensity_overlay",
  full_playbook_coverage_contribution: false,
  allowed_uses: [...SAFE_ALLOWED_USES],
  required_blocked_uses: REQUIRED_BLOCKED_USES,
  persistence_policy: {
    persisted: false,
    creates_ingestion_jobs: false,
    creates_backend_routes: false,
    creates_frontend_ui: false
  }
} as const;

export interface TokenEfficiencySignalValidationResult {
  schema_version: string;
  token_efficiency_signal_id: string | null;
  org_id: string | null;
  evidence_state: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    layer_1_platform_telemetry: boolean;
    evidence_snapshot_context: boolean;
    full_playbook_coverage: false;
    claim_readiness: false;
    customer_facing_financial_output: false;
  };
}

export interface BuildTokenEfficiencySignalOptions {
  signalId?: string;
  generatedAt?: string;
  evidenceState?: string;
  caveats?: string[];
  derivationVersion?: string;
}

export interface AggregateTokenEfficiencySummary {
  org_id: string;
  workflow_family: string;
  workflow_name?: string;
  function_area?: string;
  generated_at: string;
  covered_window: any;
  approved_aggregate_grain: string;
  minimum_cohort_threshold: number;
  k_min_posture: any;
  aggregate_token_summary?: any;
  source_refs: any;
  source_owner_attestation: any;
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

function requireField(value: any, path: string, gaps: string[]): void {
  if (value === undefined || value === null || value === "") {
    gaps.push(`${path} is missing`);
  }
}

function requireArray(value: any, path: string, gaps: string[]): void {
  if (!Array.isArray(value)) gaps.push(`${path} must be an array`);
}

function requireEnum(
  value: any,
  allowed: Set<string>,
  path: string,
  gaps: string[]
): void {
  if (!allowed.has(String(value))) {
    gaps.push(`${path} has invalid value ${String(value)}`);
  }
}

function requireBoolean(value: any, expected: boolean, path: string, gaps: string[]): void {
  if (value !== expected) gaps.push(`${path} must be ${expected}`);
}

function isForbiddenField(key: string): boolean {
  const normalizedKey = normalizeKey(key);
  return FORBIDDEN_FIELD_PATTERNS.some((pattern) => pattern.test(normalizedKey));
}

function collectForbiddenFields(
  value: any,
  fields: Set<string> = new Set(),
  path: string[] = []
): Set<string> {
  if (!value || typeof value !== "object") return fields;
  if (Array.isArray(value)) {
    value.forEach((item) => collectForbiddenFields(item, fields, path));
    return fields;
  }
  for (const [key, nested] of Object.entries(value)) {
    const fieldPath = [...path, key];
    if (isForbiddenField(key)) fields.add(fieldPath.join("."));
    collectForbiddenFields(nested, fields, fieldPath);
  }
  return fields;
}

function isSafePolicyListPath(path: string[]): boolean {
  const normalizedPath = path.map(normalizeKey);
  return normalizedPath.includes("allowed_uses") || normalizedPath.includes("blocked_uses");
}

function isUnsafeMetadataValue(value: string): boolean {
  const normalizedValue = normalizeKey(value);
  return EMAIL_VALUE_PATTERN.test(value) ||
    UNSAFE_METADATA_VALUE_PATTERNS.some((pattern) => pattern.test(normalizedValue));
}

function collectUnsafeMetadataValues(
  value: any,
  values: Set<string> = new Set(),
  path: string[] = []
): Set<string> {
  if (typeof value === "string") {
    if (!isSafePolicyListPath(path) && isUnsafeMetadataValue(value)) {
      values.add(`${path.join(".")}: ${value}`);
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

function collectTopLevelGaps(signal: any): string[] {
  const gaps: string[] = [];
  for (const field of REQUIRED_FIELDS) requireField(signal?.[field], field, gaps);
  if (
    signal?.schema_version &&
    signal.schema_version !== AI_VALUE_TOKEN_EFFICIENCY_SIGNAL_SCHEMA_VERSION
  ) {
    gaps.push(`schema_version is invalid: ${signal.schema_version}`);
  }
  if (signal?.playbook_layer !== "layer_1_platform_telemetry") {
    gaps.push("playbook_layer must be layer_1_platform_telemetry");
  }
  if (signal?.evidence_lane !== "surface_usage") {
    gaps.push("evidence_lane must be surface_usage");
  }
  if (signal?.coverage_contribution !== "layer_1_cost_intensity_overlay") {
    gaps.push("coverage_contribution must be layer_1_cost_intensity_overlay");
  }
  if (signal?.full_playbook_coverage_contribution !== false) {
    gaps.push("full_playbook_coverage_contribution must be false");
  }
  requireEnum(signal?.evidence_state, ALLOWED_EVIDENCE_STATES, "evidence_state", gaps);
  requireEnum(
    signal?.approved_aggregate_grain,
    ALLOWED_AGGREGATE_GRAINS,
    "approved_aggregate_grain",
    gaps
  );
  requireArray(signal?.allowed_uses, "allowed_uses", gaps);
  requireArray(signal?.blocked_uses, "blocked_uses", gaps);
  requireArray(signal?.caveats, "caveats", gaps);
  return gaps;
}

function collectOwnerWindowAndKMinGaps(signal: any): string[] {
  const gaps: string[] = [];
  requireField(signal?.covered_window?.window_start, "covered_window.window_start", gaps);
  requireField(signal?.covered_window?.window_end, "covered_window.window_end", gaps);
  if (
    signal?.covered_window?.window_start &&
    signal?.covered_window?.window_end &&
    String(signal.covered_window.window_start) > String(signal.covered_window.window_end)
  ) {
    gaps.push("covered_window.window_start must be before covered_window.window_end");
  }

  requireEnum(
    signal?.source_owner_attestation?.attestation_state,
    ALLOWED_ATTESTATION_STATES,
    "source_owner_attestation.attestation_state",
    gaps
  );
  if (
    ["present", "partial"].includes(String(signal?.evidence_state)) &&
    signal?.source_owner_attestation?.attestation_state !== "attested"
  ) {
    gaps.push("present or partial token evidence requires source_owner_attestation.attestation_state attested");
  }
  requireField(
    signal?.source_owner_attestation?.attested_by_role,
    "source_owner_attestation.attested_by_role",
    gaps
  );

  const minimum = Number(signal?.minimum_cohort_threshold);
  const postureMinimum = Number(signal?.k_min_posture?.minimum_cohort_threshold);
  if (!Number.isFinite(minimum) || minimum < 5) {
    gaps.push("minimum_cohort_threshold must be at least 5");
  }
  if (!Number.isFinite(postureMinimum) || postureMinimum < 5) {
    gaps.push("k_min_posture.minimum_cohort_threshold must be at least 5");
  }
  if (postureMinimum !== minimum) {
    gaps.push("k_min_posture.minimum_cohort_threshold must match minimum_cohort_threshold");
  }
  if (typeof signal?.k_min_posture?.cohort_threshold_met !== "boolean") {
    gaps.push("k_min_posture.cohort_threshold_met must be boolean");
  }
  if (
    ["present", "partial"].includes(String(signal?.evidence_state)) &&
    signal?.k_min_posture?.cohort_threshold_met !== true
  ) {
    gaps.push("k_min_posture.cohort_threshold_met must be true");
  }
  return gaps;
}

function collectPrivacyGaps(signal: any): string[] {
  const gaps: string[] = [];
  requireBoolean(
    signal?.privacy_boundary?.aggregate_only,
    true,
    "privacy_boundary.aggregate_only",
    gaps
  );
  for (const flag of UNSAFE_PRIVACY_FLAGS) {
    requireBoolean(signal?.privacy_boundary?.[flag], false, `privacy_boundary.${flag}`, gaps);
  }
  return gaps;
}

function collectUsePolicyGaps(signal: any): string[] {
  const gaps: string[] = [];
  const allowed = stringsOf(signal?.allowed_uses).map(normalizeToken);
  const blocked = stringsOf(signal?.blocked_uses).map(normalizeToken);

  for (const use of REQUIRED_BLOCKED_USES) {
    if (!blocked.includes(use)) gaps.push(`blocked_uses missing ${use}`);
  }
  for (const use of allowed) {
    if (!SAFE_ALLOWED_USES.has(use)) {
      gaps.push(`allowed_uses contains unsupported use: ${use}`);
    }
  }
  return gaps;
}

function collectValueProofPolicyGaps(signal: any): string[] {
  const gaps: string[] = [];
  for (const flag of REQUIRED_FALSE_VALUE_PROOF_FLAGS) {
    requireBoolean(signal?.value_proof_policy?.[flag], false, `value_proof_policy.${flag}`, gaps);
  }
  return gaps;
}

function collectTokenSummaryGaps(signal: any): string[] {
  const gaps: string[] = [];
  if (!["present", "partial"].includes(String(signal?.evidence_state))) return gaps;

  requireField(
    signal?.aggregate_token_summary,
    "aggregate_token_summary",
    gaps
  );
  for (const field of TOKEN_SUMMARY_NUMERIC_FIELDS) {
    const rawValue = signal?.aggregate_token_summary?.[field];
    const value = typeof rawValue === "number" ? rawValue : Number.NaN;
    if (!Number.isFinite(value) || value < 0) {
      gaps.push(`aggregate_token_summary.${field} must be a non-negative number`);
    }
  }
  const highIntensityShare = signal?.aggregate_token_summary?.high_intensity_workflow_share;
  if (
    typeof highIntensityShare === "number" &&
    (highIntensityShare < 0 || highIntensityShare > 1)
  ) {
    gaps.push("aggregate_token_summary.high_intensity_workflow_share must be between 0 and 1");
  }
  if (!Array.isArray(signal?.aggregate_token_summary?.model_families_observed)) {
    gaps.push("aggregate_token_summary.model_families_observed must be an array");
  }
  return gaps;
}

function collectForbiddenFieldGaps(signal: any): string[] {
  return Array.from(collectForbiddenFields(signal))
    .sort()
    .map((field) => `Forbidden field detected: ${field}`);
}

function collectUnsafeMetadataValueGaps(signal: any): string[] {
  const unsafe = Array.from(collectUnsafeMetadataValues(signal)).sort();
  return unsafe.length > 0
    ? [`Forbidden metadata value(s) present: ${unsafe.join(", ")}`]
    : [];
}

export function validateTokenEfficiencySignal(
  signal: any
): TokenEfficiencySignalValidationResult {
  const gaps = [
    ...collectTopLevelGaps(signal),
    ...collectOwnerWindowAndKMinGaps(signal),
    ...collectPrivacyGaps(signal),
    ...collectUsePolicyGaps(signal),
    ...collectValueProofPolicyGaps(signal),
    ...collectTokenSummaryGaps(signal),
    ...collectForbiddenFieldGaps(signal),
    ...collectUnsafeMetadataValueGaps(signal)
  ];
  const valid = gaps.length === 0;
  const canFeedLayer1 =
    valid && ["present", "partial"].includes(String(signal?.evidence_state));

  return {
    schema_version: RESULT_SCHEMA_VERSION,
    token_efficiency_signal_id: signal?.token_efficiency_signal_id ?? null,
    org_id: signal?.org_id ?? null,
    evidence_state: signal?.evidence_state ?? null,
    valid,
    gaps,
    feeds: {
      layer_1_platform_telemetry: canFeedLayer1,
      evidence_snapshot_context: canFeedLayer1,
      full_playbook_coverage: false,
      claim_readiness: false,
      customer_facing_financial_output: false
    }
  };
}

export function buildTokenEfficiencySignalFromAggregateSummary(
  summary: AggregateTokenEfficiencySummary,
  options: BuildTokenEfficiencySignalOptions = {}
): any {
  const evidenceState = options.evidenceState ?? "present";
  const generatedAt = options.generatedAt ?? summary.generated_at;
  const defaultCaveats = [
    "Token Efficiency is Layer 1 platform telemetry and cost/intensity context only.",
    "Token usage is not ROI proof, productivity proof, causality proof, EBITA proof, headcount proof, or customer-facing financial output.",
    "Full Playbook coverage requires Layer 2 user voice, Layer 3 system-of-record outcomes, governance evidence, and approved assumptions."
  ];

  return {
    schema_version: AI_VALUE_TOKEN_EFFICIENCY_SIGNAL_SCHEMA_VERSION,
    token_efficiency_signal_id:
      options.signalId ?? `token_efficiency_${summary.org_id}_${summary.workflow_family}`,
    org_id: summary.org_id,
    workflow_family: summary.workflow_family,
    workflow_name: summary.workflow_name ?? null,
    function_area: summary.function_area ?? null,
    generated_at: generatedAt,
    covered_window: summary.covered_window,
    approved_aggregate_grain: summary.approved_aggregate_grain,
    minimum_cohort_threshold: summary.minimum_cohort_threshold,
    k_min_posture: summary.k_min_posture,
    playbook_layer: "layer_1_platform_telemetry",
    evidence_lane: "surface_usage",
    coverage_contribution: "layer_1_cost_intensity_overlay",
    full_playbook_coverage_contribution: false,
    evidence_state: evidenceState,
    aggregate_token_summary: summary.aggregate_token_summary ?? null,
    source_refs: summary.source_refs,
    source_owner_attestation: summary.source_owner_attestation,
    privacy_boundary: { ...PRIVACY_BOUNDARY },
    allowed_uses: [...SAFE_ALLOWED_USES],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    value_proof_policy: {
      token_usage_is_roi_proof: false,
      token_usage_is_productivity_proof: false,
      token_usage_is_financial_output: false,
      token_usage_computes_causality: false,
      downstream_claim_strength_upgrade_allowed: false
    },
    caveats: options.caveats ?? defaultCaveats,
    derivation_version:
      options.derivationVersion ?? "token_efficiency_signal_contract_2026_06"
  };
}
