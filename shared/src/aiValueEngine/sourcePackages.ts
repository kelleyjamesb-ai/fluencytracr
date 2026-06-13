/**
 * AI Value Engine - Source Packages.
 *
 * Aggregate-only input contract for external evidence before ingestion,
 * persistence, evidence assembly, or claim readiness. Source packages are
 * evidence inputs only; they cannot create full Playbook coverage by
 * themselves.
 */

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_SOURCE_PACKAGE_VALIDATION_2026_06";

export const AI_VALUE_SOURCE_PACKAGE_SCHEMA_VERSION =
  "FT_AI_VALUE_SOURCE_PACKAGE_2026_06";

const REQUIRED_SOURCE_PACKAGE_FIELDS = [
  "schema_version",
  "source_package_id",
  "org_id",
  "source_package_type",
  "source_owner_role",
  "source_owner_attestation",
  "generated_at",
  "covered_window",
  "approved_aggregate_grain",
  "minimum_cohort_threshold",
  "k_min_posture",
  "source_system_type",
  "source_refs",
  "evidence_state",
  "privacy_boundary",
  "allowed_uses",
  "blocked_uses",
  "caveats",
  "derivation_version"
];

const ALLOWED_SOURCE_PACKAGE_TYPES = new Set([
  "layer_1_bigquery_telemetry_summary",
  "layer_2_user_voice_empirical_export",
  "layer_3_business_system_of_record_outcome_export",
  "aggregate_workforce_context_export",
  "governance_control_export",
  "assumption_approval_export"
]);

const ALLOWED_SOURCE_SYSTEM_TYPES = new Set([
  "bigquery_telemetry",
  "aggregate_survey_export",
  "customer_system_of_record",
  "aggregate_workforce_export",
  "governance_control",
  "finance_approved_assumption",
  "manual_customer_attestation",
  "not_selected"
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

const ALLOWED_ATTESTATION_STATES = new Set([
  "attested",
  "submitted",
  "missing",
  "rejected",
  "held"
]);

const ALLOWED_ASSUMPTION_APPROVAL_STATES = new Set([
  "not_required",
  "missing",
  "submitted",
  "approved",
  "rejected",
  "held"
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

const FORBIDDEN_FIELD_KEY_PATTERNS = [
  /raw_(?:rows?|prompt|response|transcript|content)/i,
  /raw_rows/i,
  /prompt/i,
  /^responses?$/i,
  /transcript/i,
  /^query$/i,
  /query_text/i,
  /sql_text/i,
  /^file_contents?$/i,
  /file_content/i,
  /email/i,
  /user_id/i,
  /employee_id/i,
  /employee_email/i,
  /employee_name/i,
  /direct_identifier/i,
  /hashed_(?:user|person|employee)_id/i,
  /joinable_(?:user|person|employee)_identifier/i,
  /joinable_person_identifier/i,
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
  /hris_inference/i
];

const FORBIDDEN_COMPUTED_FIELD_PATTERNS = [
  /^claim_readiness_context$/i,
  /^claim_readiness_snapshots?$/i,
  /^executive_readout_context$/i,
  /^executive_readout_snapshots?$/i,
  /^persisted$/i,
  /^persistence$/i,
  /^creates_ingestion_jobs?$/i,
  /^creates_backend_routes?$/i,
  /^creates_frontend_ui$/i,
  /^ingestion_jobs?$/i,
  /^backend_routes?$/i,
  /^frontend_ui$/i,
  /^roi$/i,
  /roi_(?:value|amount|calculation|result)/i,
  /^ebita$/i,
  /ebita_(?:value|amount|impact|calculation|result)/i,
  /dollar(?:ized)?_(?:value|amount|impact|output)/i,
  /financial_impact/i,
  /financial_output/i,
  /customer_facing_economic_output/i,
  /customer_facing_financial_output/i,
  /^causality$/i,
  /causal(?:ity)?_(?:claim|impact|proof|result)/i,
  /productivity_lift/i
];

const GOVERNED_KEY_ALLOWLIST = new Set([
  "source_owner_role",
  "source_owner_attestation",
  "source_package_id",
  "source_package_type",
  "source_system_type",
  "source_refs",
  "source_readiness_id",
  "blocked_uses",
  "aggregate_workforce_context",
  "metric_owner_review",
  "assumption_approval"
]);

const PRIVACY_BOUNDARY_ALLOWED_KEYS = new Set([
  "aggregate_only",
  ...UNSAFE_PRIVACY_FLAGS
]);

const FORBIDDEN_VALUE_CARRIER_KEYS = new Set([
  "metric_name",
  "metric_label",
  "metric_key",
  "metric_id",
  "claim_name",
  "claim_type",
  "output_name",
  "output_type",
  "calculation_name",
  "field_name",
  "measure_name",
  "measure_type"
]);

const FORBIDDEN_VALUE_PATTERNS = [
  /^roi$/i,
  /realized_roi/i,
  /^ebita$/i,
  /ebita/i,
  /^causality$/i,
  /causal/i,
  /economic_output/i,
  /financial_(?:impact|output|claim)/i,
  /customer_facing_economic_output/i,
  /customer_facing_financial_output/i,
  /dollar(?:ized)?_(?:value|amount|impact|output)/i,
  /productivity_lift/i
];

export const SourcePackageSchema = {
  schema_version: AI_VALUE_SOURCE_PACKAGE_SCHEMA_VERSION,
  required_fields: REQUIRED_SOURCE_PACKAGE_FIELDS,
  source_package_types: [...ALLOWED_SOURCE_PACKAGE_TYPES],
  source_system_types: [...ALLOWED_SOURCE_SYSTEM_TYPES],
  evidence_states: [...ALLOWED_EVIDENCE_STATES],
  persistence_policy: {
    persisted: false,
    creates_ingestion_jobs: false,
    creates_backend_routes: false,
    creates_frontend_ui: false
  }
} as const;

export interface SourcePackageValidationResult {
  schema_version: string;
  source_package_id: string | null;
  org_id: string | null;
  source_package_type: string | null;
  evidence_state: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    evidence_collection_input: boolean;
    evidence_snapshot_source_ref: boolean;
    claim_readiness_context: false;
    executive_readout_context: false;
    customer_facing_economic_output: false;
    full_playbook_coverage: false;
  };
}

export interface SourcePackage {
  schema_version: string;
  source_package_id: string;
  org_id: string;
  source_package_type: string;
  source_owner_role: string;
  source_owner_attestation: any;
  generated_at: string;
  covered_window: any;
  approved_aggregate_grain: string;
  minimum_cohort_threshold: number;
  k_min_posture: any;
  source_system_type: string;
  source_refs: any;
  evidence_state: string;
  privacy_boundary: any;
  allowed_uses: string[];
  blocked_uses: string[];
  caveats: string[];
  derivation_version: string;
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
  if (!Array.isArray(value)) {
    gaps.push(`${path} must be an array`);
  }
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
  if (value !== expected) {
    gaps.push(`${path} must be ${expected}`);
  }
}

function isAllowedGovernedKey(key: string, path: string[]): boolean {
  const normalizedKey = normalizeKey(key);
  const normalizedPath = path.map(normalizeKey);
  if (
    normalizedPath.length === 2 &&
    normalizedPath[0] === "privacy_boundary" &&
    PRIVACY_BOUNDARY_ALLOWED_KEYS.has(normalizedKey)
  ) {
    return true;
  }
  return GOVERNED_KEY_ALLOWLIST.has(normalizedKey);
}

function isForbiddenKey(key: string, path: string[]): boolean {
  const normalizedKey = normalizeKey(key);
  if (isAllowedGovernedKey(key, path)) return false;
  return FORBIDDEN_FIELD_KEY_PATTERNS.some((pattern) => pattern.test(normalizedKey)) ||
    FORBIDDEN_COMPUTED_FIELD_PATTERNS.some((pattern) => pattern.test(normalizedKey));
}

function isForbiddenValuePath(path: string[]): boolean {
  const normalizedPath = path.map(normalizeKey);
  if (
    normalizedPath.includes("blocked_uses") ||
    normalizedPath.includes("caveats") ||
    normalizedPath.includes("allowed_uses")
  ) {
    return false;
  }
  const key = normalizedPath[normalizedPath.length - 1] ?? "";
  return FORBIDDEN_VALUE_CARRIER_KEYS.has(key) ||
    normalizedPath.includes("metric_values");
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
    if (isForbiddenKey(key, fieldPath)) fields.add(fieldPath.join("."));
    collectForbiddenFields(nested, fields, fieldPath);
  }
  return fields;
}

function collectForbiddenValues(
  value: any,
  values: Set<string> = new Set(),
  path: string[] = []
): Set<string> {
  if (typeof value === "string") {
    const normalizedValue = normalizeKey(value);
    if (
      isForbiddenValuePath(path) &&
      FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(normalizedValue))
    ) {
      values.add(`${path.join(".")}: ${value}`);
    }
    return values;
  }
  if (!value || typeof value !== "object") return values;
  if (Array.isArray(value)) {
    value.forEach((item) => collectForbiddenValues(item, values, path));
    return values;
  }
  for (const [key, nested] of Object.entries(value)) {
    collectForbiddenValues(nested, values, [...path, key]);
  }
  return values;
}

function blockedUses(pkg: any): string[] {
  return stringsOf(pkg?.blocked_uses).map(normalizeToken);
}

function allowedUses(pkg: any): string[] {
  return stringsOf(pkg?.allowed_uses).map(normalizeToken);
}

function caveatsMention(pkg: any, pattern: RegExp): boolean {
  return stringsOf(pkg?.caveats).some((caveat) => pattern.test(caveat));
}

function collectTopLevelGaps(pkg: any): string[] {
  const gaps: string[] = [];
  for (const field of REQUIRED_SOURCE_PACKAGE_FIELDS) {
    requireField(pkg?.[field], field, gaps);
  }
  if (
    pkg?.schema_version &&
    pkg.schema_version !== AI_VALUE_SOURCE_PACKAGE_SCHEMA_VERSION
  ) {
    gaps.push(`schema_version is invalid: ${pkg.schema_version}`);
  }
  requireEnum(
    pkg?.source_package_type,
    ALLOWED_SOURCE_PACKAGE_TYPES,
    "source_package_type",
    gaps
  );
  requireEnum(
    pkg?.source_system_type,
    ALLOWED_SOURCE_SYSTEM_TYPES,
    "source_system_type",
    gaps
  );
  requireEnum(pkg?.evidence_state, ALLOWED_EVIDENCE_STATES, "evidence_state", gaps);
  requireEnum(
    pkg?.approved_aggregate_grain,
    ALLOWED_AGGREGATE_GRAINS,
    "approved_aggregate_grain",
    gaps
  );
  requireArray(pkg?.allowed_uses, "allowed_uses", gaps);
  requireArray(pkg?.blocked_uses, "blocked_uses", gaps);
  requireArray(pkg?.caveats, "caveats", gaps);
  return gaps;
}

function collectOwnerAndWindowGaps(pkg: any): string[] {
  const gaps: string[] = [];
  requireEnum(
    pkg?.source_owner_attestation?.attestation_state,
    ALLOWED_ATTESTATION_STATES,
    "source_owner_attestation.attestation_state",
    gaps
  );
  requireField(
    pkg?.source_owner_attestation?.attested_by_role,
    "source_owner_attestation.attested_by_role",
    gaps
  );
  requireField(pkg?.covered_window?.window_start, "covered_window.window_start", gaps);
  requireField(pkg?.covered_window?.window_end, "covered_window.window_end", gaps);
  if (
    pkg?.covered_window?.window_start &&
    pkg?.covered_window?.window_end &&
    String(pkg.covered_window.window_start) > String(pkg.covered_window.window_end)
  ) {
    gaps.push("covered_window.window_start must be before covered_window.window_end");
  }
  return gaps;
}

function collectKMinGaps(pkg: any): string[] {
  const gaps: string[] = [];
  const minimum = Number(pkg?.minimum_cohort_threshold);
  const postureMinimum = Number(pkg?.k_min_posture?.minimum_cohort_threshold);
  if (!Number.isFinite(minimum) || minimum < 5) {
    gaps.push("minimum_cohort_threshold must be at least 5");
  }
  if (!Number.isFinite(postureMinimum) || postureMinimum < 5) {
    gaps.push("k_min_posture.minimum_cohort_threshold must be at least 5");
  }
  if (postureMinimum !== minimum) {
    gaps.push("k_min_posture.minimum_cohort_threshold must match minimum_cohort_threshold");
  }
  if (typeof pkg?.k_min_posture?.cohort_threshold_met !== "boolean") {
    gaps.push("k_min_posture.cohort_threshold_met must be boolean");
  }
  return gaps;
}

function collectPrivacyGaps(pkg: any): string[] {
  const gaps: string[] = [];
  requireBoolean(pkg?.privacy_boundary?.aggregate_only, true, "privacy_boundary.aggregate_only", gaps);
  for (const flag of UNSAFE_PRIVACY_FLAGS) {
    requireBoolean(pkg?.privacy_boundary?.[flag], false, `privacy_boundary.${flag}`, gaps);
  }
  return gaps;
}

function collectUsePolicyGaps(pkg: any): string[] {
  const gaps: string[] = [];
  const safeBlocked = blockedUses(pkg);
  for (const use of REQUIRED_BLOCKED_USES) {
    if (!safeBlocked.includes(use)) {
      gaps.push(`blocked_uses missing ${use}`);
    }
  }
  for (const use of allowedUses(pkg)) {
    if (!SAFE_ALLOWED_USES.has(use)) {
      gaps.push(`allowed_uses contains blocked use: ${use}`);
    }
  }
  if (pkg?.coverage_status === "full_playbook_coverage") {
    gaps.push("Source package cannot declare full_playbook_coverage");
  }
  if (pkg?.creates_full_playbook_coverage === true) {
    gaps.push("Source package cannot create full Playbook coverage by itself");
  }
  return gaps;
}

function collectTypeSpecificGaps(pkg: any): string[] {
  const gaps: string[] = [];
  const type = pkg?.source_package_type;
  if (type === "layer_1_bigquery_telemetry_summary" &&
    pkg?.source_system_type !== "bigquery_telemetry") {
    gaps.push("Layer 1 package must use source_system_type bigquery_telemetry");
  }
  if (type === "layer_2_user_voice_empirical_export") {
    if (pkg?.privacy_boundary?.aggregate_only !== true) {
      gaps.push("Layer 2 package must be aggregate-only");
    }
    if (!["aggregate_survey_export", "manual_customer_attestation"].includes(pkg?.source_system_type)) {
      gaps.push("Layer 2 package must use aggregate_survey_export or manual_customer_attestation");
    }
  }
  if (type === "layer_3_business_system_of_record_outcome_export") {
    if (!["customer_system_of_record", "manual_customer_attestation"].includes(pkg?.source_system_type)) {
      gaps.push("Layer 3 package must use customer_system_of_record or manual_customer_attestation");
    }
    const reviewState = String(pkg?.metric_owner_review?.review_state ?? "");
    if (
      reviewState !== "reviewed" &&
      reviewState !== "approved" &&
      !caveatsMention(pkg, /metric owner review/i)
    ) {
      gaps.push("Layer 3 package requires metric_owner_review or caveat");
    }
    for (const use of allowedUses(pkg)) {
      if (/causality|causal|financial|roi|ebita/.test(use)) {
        gaps.push(`Layer 3 package cannot claim causality or financial impact through allowed_uses: ${use}`);
      }
    }
  }
  if (type === "assumption_approval_export") {
    requireField(pkg?.assumption_approval?.approval_state, "assumption_approval.approval_state", gaps);
    if (pkg?.assumption_approval?.approval_state) {
      requireEnum(
        pkg.assumption_approval.approval_state,
        ALLOWED_ASSUMPTION_APPROVAL_STATES,
        "assumption_approval.approval_state",
        gaps
      );
    }
    requireField(
      pkg?.assumption_approval?.approval_owner_role,
      "assumption_approval.approval_owner_role",
      gaps
    );
  }
  if (type === "aggregate_workforce_context_export") {
    requireField(pkg?.aggregate_workforce_context, "aggregate_workforce_context", gaps);
    if (pkg?.aggregate_workforce_context?.source_owner_approval_state !== "approved") {
      gaps.push("aggregate_workforce_context.source_owner_approval_state must be approved");
    }
    if (pkg?.aggregate_workforce_context?.cohort_threshold_met !== true) {
      gaps.push("aggregate_workforce_context.cohort_threshold_met must be true");
    }
    for (const use of WORKFORCE_BLOCKED_USES) {
      if (!blockedUses(pkg).includes(use)) {
        gaps.push(`aggregate workforce package blocked_uses missing ${use}`);
      }
    }
  }
  if (type === "governance_control_export" &&
    pkg?.source_system_type !== "governance_control") {
    gaps.push("governance control package must use source_system_type governance_control");
  }
  return gaps;
}

function collectForbiddenFieldGaps(pkg: any): string[] {
  const forbidden = Array.from(collectForbiddenFields(pkg)).sort();
  return forbidden.length > 0
    ? [`Forbidden field(s) present: ${forbidden.join(", ")}`]
    : [];
}

function collectForbiddenValueGaps(pkg: any): string[] {
  const forbidden = Array.from(collectForbiddenValues(pkg)).sort();
  return forbidden.length > 0
    ? [`Forbidden value(s) present: ${forbidden.join(", ")}`]
    : [];
}

export function validateSourcePackage(pkg: any): SourcePackageValidationResult {
  const gaps = [
    ...collectTopLevelGaps(pkg),
    ...collectOwnerAndWindowGaps(pkg),
    ...collectKMinGaps(pkg),
    ...collectPrivacyGaps(pkg),
    ...collectUsePolicyGaps(pkg),
    ...collectTypeSpecificGaps(pkg),
    ...collectForbiddenFieldGaps(pkg),
    ...collectForbiddenValueGaps(pkg)
  ];
  const valid = gaps.length === 0;

  return {
    schema_version: RESULT_SCHEMA_VERSION,
    source_package_id: pkg?.source_package_id ?? null,
    org_id: pkg?.org_id ?? null,
    source_package_type: pkg?.source_package_type ?? null,
    evidence_state: pkg?.evidence_state ?? null,
    valid,
    gaps,
    feeds: {
      evidence_collection_input: valid,
      evidence_snapshot_source_ref: valid,
      claim_readiness_context: false,
      executive_readout_context: false,
      customer_facing_economic_output: false,
      full_playbook_coverage: false
    }
  };
}
