/**
 * AI Value Engine - Client Evidence Request.
 *
 * Contract-only customer action object describing which aggregate evidence is
 * needed to move from initial posture toward stronger Playbook coverage. A
 * request is not evidence, does not improve claim readiness by itself, and
 * cannot create financial, productivity, causality, or people-decisioning
 * outputs.
 */

import { validateEvidenceSnapshot } from "./evidenceSnapshot";
import { validateMeasurementPlan } from "./measurementPlan";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_CLIENT_EVIDENCE_REQUEST_VALIDATION_2026_06";

export const AI_VALUE_CLIENT_EVIDENCE_REQUEST_SCHEMA_VERSION =
  "FT_AI_VALUE_CLIENT_EVIDENCE_REQUEST_2026_06";

const DERIVATION_VERSION =
  "ai_value_client_evidence_request_builder_2026_06";

const REQUIRED_FIELDS = [
  "schema_version",
  "request_id",
  "org_id",
  "measurement_plan_id",
  "requested_playbook_layer",
  "request_type",
  "evidence_purpose",
  "accepted_formats",
  "required_fields",
  "forbidden_fields",
  "privacy_requirements",
  "minimum_cohort_threshold",
  "owner_role",
  "due_status",
  "allowed_claim_improvement",
  "blocked_claims",
  "required_caveats",
  "customer_instructions",
  "created_at",
  "derivation_version"
] as const;

const ALLOWED_REQUESTED_LAYERS = new Set([
  "layer_2_user_voice_empirical",
  "layer_3_business_system_outcomes",
  "governance_evidence",
  "assumption_evidence",
  "aggregate_workforce_context"
]);

const ALLOWED_REQUEST_TYPES = new Set([
  "aggregate_export",
  "manual_aggregate_entry",
  "owner_attestation",
  "finance_or_business_approval",
  "governance_control_confirmation"
]);

const ALLOWED_DUE_STATUSES = new Set([
  "not_requested",
  "requested",
  "awaiting_customer",
  "received",
  "validated",
  "rejected",
  "held",
  "suppressed"
]);

const REQUIRED_FORBIDDEN_FIELDS = [
  "raw_prompts",
  "raw_responses",
  "transcripts",
  "query_text",
  "file_contents",
  "raw_rows",
  "direct_identifiers",
  "hashed_or_joinable_person_identifiers",
  "person_level_hris_records",
  "person_level_productivity",
  "manager_or_team_ranking",
  "people_decisioning"
];

const REQUIRED_BLOCKED_CLAIMS = [
  "roi_proof",
  "realized_roi",
  "ebita_claim",
  "causality_claim",
  "productivity_claim",
  "headcount_reduction_claim",
  "individual_attribution",
  "individual_scoring",
  "manager_or_team_ranking",
  "team_or_manager_ranking",
  "people_decisioning",
  "financial_value_claim",
  "customer_facing_financial_output",
  "customer_facing_economic_output"
];

const UNSAFE_PRIVACY_FLAGS = [
  "contains_raw_prompts",
  "contains_raw_responses",
  "contains_transcripts",
  "contains_query_text",
  "contains_file_contents",
  "contains_raw_rows",
  "contains_direct_identifiers",
  "contains_hashed_or_joinable_person_identifiers",
  "contains_person_level_hris_records",
  "contains_person_level_productivity",
  "contains_manager_or_team_ranking",
  "contains_people_decisioning"
];

const ALLOWED_ACCEPTED_FORMATS = new Set([
  "aggregate_ai_fluency_export",
  "aggregate_ai_fluency_retest_export",
  "aggregate_survey_export",
  "aggregate_user_voice_summary",
  "aggregate_workflow_observation_summary",
  "aggregate_system_of_record_export",
  "customer_attested_kpi_summary",
  "manual_aggregate_entry",
  "source_owner_attestation",
  "control_confirmation",
  "policy_attestation",
  "customer_assumption_approval",
  "finance_or_business_approval",
  "aggregate_workforce_context_summary"
]);

const LAYER_2_AGGREGATE_FORMATS = new Set([
  "aggregate_ai_fluency_export",
  "aggregate_ai_fluency_retest_export",
  "aggregate_survey_export",
  "aggregate_user_voice_summary",
  "aggregate_workflow_observation_summary",
  "manual_aggregate_entry"
]);

const LAYER_3_AGGREGATE_FORMATS = new Set([
  "aggregate_system_of_record_export",
  "customer_attested_kpi_summary",
  "manual_aggregate_entry"
]);

const FORBIDDEN_KEY_PATTERNS = [
  /raw_(?:rows?|prompt|response|transcript|content)/i,
  /prompt/i,
  /^responses?$/i,
  /response_text/i,
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
  /person_id/i,
  /person_identifier/i,
  /direct_identifier/i,
  /hashed_(?:user|person|employee)_id/i,
  /joinable_(?:user|person|employee)_identifier/i,
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
  /hris_inference/i
];

const UNSAFE_VALUE_PATTERNS = [
  /raw[_\s-]?(?:rows?|prompts?|responses?|transcripts?|content)/i,
  /prompts?/i,
  /^responses?$/i,
  /response[_\s-]?(?:text|content|body|message|raw|value)/i,
  /transcripts?/i,
  /query[_\s-]?text/i,
  /sql[_\s-]?text/i,
  /file[_\s-]?contents?/i,
  /direct[_\s-]?identifiers?/i,
  /direct[_\s-]?ids?/i,
  /(^|[_\s-])user[_\s-]?ids?($|[_\s-])/i,
  /(^|[_\s-])employee[_\s-]?ids?($|[_\s-])/i,
  /(^|[_\s-])person[_\s-]?ids?($|[_\s-])/i,
  /hashed[_\s-]?(?:or[_\s-]?joinable[_\s-]?)?(?:user|person|employee)?[_\s-]?identifiers?/i,
  /hashed[_\s-]?(?:user|person|employee)[_\s-]?ids?/i,
  /joinable[_\s-]?(?:user|person|employee)?[_\s-]?identifiers?/i,
  /joinable[_\s-]?(?:user|person|employee)[_\s-]?ids?/i,
  /person[_\s-]?level[_\s-]?(?:hris|productivity|records?)/i,
  /(^|[_\s-])roi($|[_\s-])/i,
  /return[_\s-]?on[_\s-]?investment/i,
  /ebita/i,
  /causal(?:ity)?[_\s-]?(?:claim|proof|impact|effect)?/i,
  /productivity[_\s-]?(?:claim|score|proof|lift|impact)?/i,
  /headcount[_\s-]?reduction/i,
  /financial[_\s-]?(?:output|claim|value|impact)/i,
  /customer[_\s-]?facing[_\s-]?(?:financial|economic)/i,
  /individual[_\s-]?(?:attribution|scoring|score|productivity)/i,
  /employee[_\s-]?(?:score|scoring|productivity)/i,
  /person[_\s-]?(?:score|scoring|productivity)/i,
  /manager[_\s-]?(?:or[_\s-]?team[_\s-]?)?ranking/i,
  /team[_\s-]?ranking/i,
  /people[_\s-]?decisioning/i
];

const EMAIL_VALUE_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

const FORBIDDEN_IDENTIFIER_VALUE_PATTERNS = [
  /(?:^|_)(?:user|employee|person|direct)_(?:id|identifier|email)(?:_|$)/i,
  /(?:^|_)(?:user|employee|person|direct)_[a-z]*\d[a-z0-9]*(?:_|$)/i,
  /(?:^|_)(?:hashed|joinable)_(?:id|identifier|user|person|employee)(?:_|$)/i
];

const GOVERNED_KEY_ALLOWLIST = new Set([
  "forbidden_fields",
  "blocked_claims",
  "privacy_requirements",
  "allowed_claim_improvement",
  "contains_raw_prompts",
  "contains_raw_responses",
  "contains_transcripts",
  "contains_query_text",
  "contains_file_contents",
  "contains_raw_rows",
  "contains_direct_identifiers",
  "contains_hashed_or_joinable_person_identifiers",
  "contains_person_level_hris_records",
  "contains_person_level_productivity",
  "contains_manager_or_team_ranking",
  "contains_people_decisioning",
  "non_decisioning_context"
]);

const SAFE_REQUEST_VALUE_ALLOWLIST = new Set([
  "raw_content_exclusion"
]);

export const ClientEvidenceRequestSchema = {
  schema_version: AI_VALUE_CLIENT_EVIDENCE_REQUEST_SCHEMA_VERSION,
  required_fields: REQUIRED_FIELDS,
  requested_playbook_layers: [...ALLOWED_REQUESTED_LAYERS],
  request_types: [...ALLOWED_REQUEST_TYPES],
  due_statuses: [...ALLOWED_DUE_STATUSES],
  required_forbidden_fields: REQUIRED_FORBIDDEN_FIELDS,
  required_blocked_claims: REQUIRED_BLOCKED_CLAIMS,
  persistence_policy: {
    persisted: false,
    creates_migrations: false,
    creates_prisma_schema: false,
    creates_backend_routes: false,
    creates_frontend_ui: false,
    creates_ingestion_jobs: false,
    creates_claim_readiness_snapshots: false,
    creates_executive_readout_snapshots: false
  }
} as const;

export interface ClientEvidenceRequest {
  schema_version: string;
  request_id: string;
  org_id: string;
  measurement_plan_id: string;
  evidence_snapshot_id?: string | null;
  requested_playbook_layer: string;
  request_type: string;
  evidence_purpose: string;
  accepted_formats: string[];
  required_fields: string[];
  forbidden_fields: string[];
  privacy_requirements: {
    aggregate_only: boolean;
    source_owner_approval_required: boolean;
    non_decisioning_context: boolean;
    [key: string]: boolean;
  };
  minimum_cohort_threshold: number;
  owner_role: string;
  approver_role?: string | null;
  due_status: string;
  allowed_claim_improvement: {
    caveated: boolean;
    request_itself_upgrades_claim_readiness: boolean;
    evidence_gap_closure_only: boolean;
    blocked_until_validated_evidence: boolean;
    financial_claims_allowed: boolean;
    customer_facing_output_allowed: boolean;
    improvement_scope: string[];
  };
  blocked_claims: string[];
  required_caveats: string[];
  customer_instructions: string[];
  internal_notes?: string[];
  created_at: string;
  derivation_version: string;
}

export interface ClientEvidenceRequestValidationResult {
  schema_version: string;
  request_id: string | null;
  org_id: string | null;
  measurement_plan_id: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    client_evidence_request: boolean;
    source_package: boolean;
    evidence_snapshot: boolean;
    claim_readiness_snapshot: boolean;
    executive_readout_snapshot: boolean;
    customer_facing_financial_output: boolean;
  };
}

export interface BuildClientEvidenceRequestOptions {
  createdAt?: string;
  dueStatus?: string;
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

function requireBoolean(value: any, expected: boolean, path: string, gaps: string[]): void {
  if (value !== expected) {
    gaps.push(`${path} must be ${expected}`);
  }
}

function requireEnum(value: any, allowed: Set<string>, path: string, gaps: string[]): void {
  requireField(value, path, gaps);
  if (value !== undefined && value !== null && value !== "" && !allowed.has(value)) {
    gaps.push(`${path} is invalid: ${value}`);
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

function hasAny(values: any, allowed: Set<string>): boolean {
  return stringsOf(values).map(normalizeToken).some((value) => allowed.has(value));
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
  if (REQUIRED_FORBIDDEN_FIELDS.includes(normalizedKey)) return true;
  if (REQUIRED_BLOCKED_CLAIMS.includes(normalizedKey)) return true;
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

function collectUnsafeRequestedValues(request: any): string[] {
  const values = [
    ...stringsOf(request?.accepted_formats),
    ...stringsOf(request?.required_fields),
    ...stringsOf(request?.allowed_claim_improvement?.improvement_scope)
  ];
  return values.filter((value) =>
    !SAFE_REQUEST_VALUE_ALLOWLIST.has(normalizeToken(value)) &&
    UNSAFE_VALUE_PATTERNS.some((pattern) => pattern.test(value))
  );
}

function collectUnsafeNarrativeValues(request: any): string[] {
  const values = [
    String(request?.evidence_purpose ?? ""),
    ...stringsOf(request?.customer_instructions),
    ...stringsOf(request?.internal_notes)
  ];
  const unsafe: string[] = [];
  for (const value of values) {
    const clauses = value.split(/[.;]+/).map((clause) => clause.trim()).filter(Boolean);
    for (const clause of clauses) {
      const isProhibition =
        /(?:do not|never|must not|cannot)\s+(?:include|provide|submit|ask|collect|store)/i
          .test(clause);
      const isSafeBoundaryPhrase = /raw[-_\s]?content[_\s-]?exclusion/i.test(clause);
      if (
        !isProhibition &&
        !isSafeBoundaryPhrase &&
        UNSAFE_VALUE_PATTERNS.some((pattern) => pattern.test(clause))
      ) {
        unsafe.push(clause);
      }
    }
  }
  return unsafe;
}

function isForbiddenIdentifierValue(value: string): boolean {
  const normalizedValue = normalizeKey(value);
  return EMAIL_VALUE_PATTERN.test(value) ||
    FORBIDDEN_IDENTIFIER_VALUE_PATTERNS.some((pattern) => pattern.test(normalizedValue));
}

function collectForbiddenIdentifierValues(
  value: any,
  values: string[] = [],
  path: string[] = []
): string[] {
  if (typeof value === "string") {
    if (isForbiddenIdentifierValue(value)) {
      values.push(`${path.join(".")}: ${value}`);
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

function collectRequestMetadataValueGaps(request: any): string[] {
  const metadata = {
    request_id: request?.request_id,
    org_id: request?.org_id,
    measurement_plan_id: request?.measurement_plan_id,
    evidence_snapshot_id: request?.evidence_snapshot_id,
    evidence_purpose: request?.evidence_purpose,
    owner_role: request?.owner_role,
    approver_role: request?.approver_role,
    customer_instructions: request?.customer_instructions,
    internal_notes: request?.internal_notes
  };
  return collectForbiddenIdentifierValues(metadata).map(
    (value) => `Forbidden metadata value detected: ${value}`
  );
}

function requireCommonPolicy(request: any, gaps: string[]): void {
  for (const forbiddenField of REQUIRED_FORBIDDEN_FIELDS) {
    if (!hasToken(request?.forbidden_fields, forbiddenField)) {
      gaps.push(`forbidden_fields must include ${forbiddenField}`);
    }
  }
  for (const blockedClaim of REQUIRED_BLOCKED_CLAIMS) {
    if (!hasToken(request?.blocked_claims, blockedClaim)) {
      gaps.push(`blocked_claims must include ${blockedClaim}`);
    }
  }

  const privacy = request?.privacy_requirements ?? {};
  requireBoolean(privacy.aggregate_only, true, "privacy_requirements.aggregate_only", gaps);
  for (const flag of UNSAFE_PRIVACY_FLAGS) {
    requireBoolean(privacy[flag], false, `privacy_requirements.${flag}`, gaps);
  }

  const improvement = request?.allowed_claim_improvement ?? {};
  requireBoolean(improvement.caveated, true, "allowed_claim_improvement.caveated", gaps);
  requireBoolean(
    improvement.request_itself_upgrades_claim_readiness,
    false,
    "allowed_claim_improvement.request_itself_upgrades_claim_readiness",
    gaps
  );
  requireBoolean(
    improvement.evidence_gap_closure_only,
    true,
    "allowed_claim_improvement.evidence_gap_closure_only",
    gaps
  );
  requireBoolean(
    improvement.blocked_until_validated_evidence,
    true,
    "allowed_claim_improvement.blocked_until_validated_evidence",
    gaps
  );
  requireBoolean(
    improvement.financial_claims_allowed,
    false,
    "allowed_claim_improvement.financial_claims_allowed",
    gaps
  );
  requireBoolean(
    improvement.customer_facing_output_allowed,
    false,
    "allowed_claim_improvement.customer_facing_output_allowed",
    gaps
  );
  requireArray(improvement.improvement_scope, "allowed_claim_improvement.improvement_scope", gaps);
}

function collectLayerSpecificGaps(request: any): string[] {
  const gaps: string[] = [];
  const layer = request?.requested_playbook_layer;
  const type = request?.request_type;
  if (layer === "layer_2_user_voice_empirical") {
    if (!hasAny(request?.accepted_formats, LAYER_2_AGGREGATE_FORMATS)) {
      gaps.push("Layer 2 request requires an aggregate user voice or AI Fluency format");
    }
    if (!hasToken(request?.required_fields, "aggregate_response_summary")) {
      gaps.push("Layer 2 request requires aggregate_response_summary");
    }
  }
  if (layer === "layer_3_business_system_outcomes") {
    if (!hasAny(request?.accepted_formats, LAYER_3_AGGREGATE_FORMATS)) {
      gaps.push("Layer 3 request requires a customer-owned aggregate metric format");
    }
    if (!hasToken(request?.required_fields, "customer_owned_aggregate_metric")) {
      gaps.push("Layer 3 request requires customer_owned_aggregate_metric");
    }
    if (!hasToken(request?.required_fields, "metric_owner_attestation")) {
      gaps.push("Layer 3 request requires metric_owner_attestation");
    }
  }
  if (layer === "governance_evidence") {
    if (type !== "governance_control_confirmation" && type !== "owner_attestation") {
      gaps.push("governance_evidence request requires governance_control_confirmation or owner_attestation");
    }
  }
  if (layer === "assumption_evidence") {
    if (!request?.approver_role) {
      gaps.push("assumption_evidence request requires approver_role");
    }
    if (type !== "finance_or_business_approval" && type !== "owner_attestation") {
      gaps.push("assumption_evidence request requires finance_or_business_approval or owner_attestation");
    }
  }
  if (layer === "aggregate_workforce_context") {
    if (request?.privacy_requirements?.non_decisioning_context !== true) {
      gaps.push("aggregate_workforce_context request requires non_decisioning_context true");
    }
    if (!hasToken(request?.required_fields, "source_owner_attestation")) {
      gaps.push("aggregate_workforce_context request requires source_owner_attestation");
    }
    if (!hasToken(request?.required_fields, "approved_aggregate_grain")) {
      gaps.push("aggregate_workforce_context request requires approved_aggregate_grain");
    }
    if (!hasToken(request?.required_fields, "minimum_cohort_threshold")) {
      gaps.push("aggregate_workforce_context request requires minimum_cohort_threshold");
    }
    if (!hasToken(request?.required_fields, "non_decisioning_context_label")) {
      gaps.push("aggregate_workforce_context request requires non_decisioning_context_label");
    }
    if (request?.privacy_requirements?.source_owner_approval_required !== true) {
      gaps.push("aggregate_workforce_context request requires source_owner_approval_required true");
    }
    if (!stringsOf(request?.required_caveats).some((caveat) => /non[-_\s]?decisioning/i.test(caveat))) {
      gaps.push("aggregate_workforce_context request requires non-decisioning caveat");
    }
  }
  return gaps;
}

export function validateClientEvidenceRequest(request: any): ClientEvidenceRequestValidationResult {
  const gaps: string[] = [];

  for (const field of REQUIRED_FIELDS) {
    requireField(request?.[field], field, gaps);
  }
  if (request?.schema_version &&
      request.schema_version !== AI_VALUE_CLIENT_EVIDENCE_REQUEST_SCHEMA_VERSION) {
    gaps.push(`schema_version is invalid: ${request.schema_version}`);
  }
  requireEnum(
    request?.requested_playbook_layer,
    ALLOWED_REQUESTED_LAYERS,
    "requested_playbook_layer",
    gaps
  );
  requireEnum(request?.request_type, ALLOWED_REQUEST_TYPES, "request_type", gaps);
  requireEnum(request?.due_status, ALLOWED_DUE_STATUSES, "due_status", gaps);

  for (const field of [
    "accepted_formats",
    "required_fields",
    "forbidden_fields",
    "blocked_claims",
    "required_caveats",
    "customer_instructions"
  ]) {
    requireArray(request?.[field], field, gaps);
  }
  if (request?.internal_notes !== undefined) {
    requireArray(request.internal_notes, "internal_notes", gaps);
  }
  for (const format of stringsOf(request?.accepted_formats)) {
    if (!ALLOWED_ACCEPTED_FORMATS.has(format)) {
      gaps.push(`accepted_formats contains unsupported format: ${format}`);
    }
  }
  if (
    typeof request?.minimum_cohort_threshold !== "number" ||
    !Number.isFinite(request.minimum_cohort_threshold) ||
    request.minimum_cohort_threshold < 5
  ) {
    gaps.push("minimum_cohort_threshold must be a finite number at least 5");
  }

  requireCommonPolicy(request, gaps);
  gaps.push(...collectLayerSpecificGaps(request));

  for (const value of collectUnsafeRequestedValues(request)) {
    gaps.push(`request asks for unsafe or unsupported field/output: ${value}`);
  }
  for (const value of collectUnsafeNarrativeValues(request)) {
    gaps.push(`request narrative contains unsafe or unsupported claim language: ${value}`);
  }
  gaps.push(...collectRequestMetadataValueGaps(request));
  for (const field of [...collectForbiddenFields(request)].sort()) {
    gaps.push(`Forbidden field detected: ${field}`);
  }

  const valid = gaps.length === 0;
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    request_id: request?.request_id ?? null,
    org_id: request?.org_id ?? null,
    measurement_plan_id: request?.measurement_plan_id ?? null,
    valid,
    gaps,
    feeds: {
      client_evidence_request: valid,
      source_package: false,
      evidence_snapshot: false,
      claim_readiness_snapshot: false,
      executive_readout_snapshot: false,
      customer_facing_financial_output: false
    }
  };
}

function baseRequest(
  inputs: {
    requestId: string;
    orgId: string;
    measurementPlanId: string;
    evidenceSnapshotId?: string | null;
    layer: string;
    type: string;
    purpose: string;
    acceptedFormats: string[];
    requiredFields: string[];
    ownerRole: string;
    approverRole?: string | null;
    instructions: string[];
    caveats: string[];
  },
  options: BuildClientEvidenceRequestOptions = {}
): ClientEvidenceRequest {
  return {
    schema_version: AI_VALUE_CLIENT_EVIDENCE_REQUEST_SCHEMA_VERSION,
    request_id: inputs.requestId,
    org_id: inputs.orgId,
    measurement_plan_id: inputs.measurementPlanId,
    evidence_snapshot_id: inputs.evidenceSnapshotId ?? null,
    requested_playbook_layer: inputs.layer,
    request_type: inputs.type,
    evidence_purpose: inputs.purpose,
    accepted_formats: inputs.acceptedFormats,
    required_fields: inputs.requiredFields,
    forbidden_fields: REQUIRED_FORBIDDEN_FIELDS,
    privacy_requirements: {
      aggregate_only: true,
      source_owner_approval_required: true,
      non_decisioning_context: inputs.layer === "aggregate_workforce_context",
      contains_raw_prompts: false,
      contains_raw_responses: false,
      contains_transcripts: false,
      contains_query_text: false,
      contains_file_contents: false,
      contains_raw_rows: false,
      contains_direct_identifiers: false,
      contains_hashed_or_joinable_person_identifiers: false,
      contains_person_level_hris_records: false,
      contains_person_level_productivity: false,
      contains_manager_or_team_ranking: false,
      contains_people_decisioning: false
    },
    minimum_cohort_threshold: 5,
    owner_role: inputs.ownerRole,
    approver_role: inputs.approverRole ?? null,
    due_status: options.dueStatus ?? "requested",
    allowed_claim_improvement: {
      caveated: true,
      request_itself_upgrades_claim_readiness: false,
      evidence_gap_closure_only: true,
      blocked_until_validated_evidence: true,
      financial_claims_allowed: false,
      customer_facing_output_allowed: false,
      improvement_scope: ["evidence_gap_closure_planning"]
    },
    blocked_claims: REQUIRED_BLOCKED_CLAIMS,
    required_caveats: inputs.caveats,
    customer_instructions: inputs.instructions,
    internal_notes: [
      "Request is not evidence and cannot improve claim readiness until validated aggregate evidence is provided."
    ],
    created_at: options.createdAt ?? new Date().toISOString(),
    derivation_version: DERIVATION_VERSION
  };
}

function requestForLayer(
  orgId: string,
  measurementPlanId: string,
  layer: string,
  options: BuildClientEvidenceRequestOptions & { evidenceSnapshotId?: string | null } = {}
): ClientEvidenceRequest {
  const requestId =
    `client_evidence_request_${safeIdPart(measurementPlanId)}_${safeIdPart(layer)}`;
  if (layer === "layer_2_user_voice_empirical") {
    return baseRequest({
      requestId,
      orgId,
      measurementPlanId,
      evidenceSnapshotId: options.evidenceSnapshotId,
      layer,
      type: "aggregate_export",
      purpose: "Collect aggregate user voice or AI Fluency empirical evidence for Playbook Layer 2.",
      acceptedFormats: [
        "aggregate_ai_fluency_export",
        "aggregate_survey_export",
        "aggregate_user_voice_summary",
        "manual_aggregate_entry"
      ],
      requiredFields: [
        "aggregate_response_summary",
        "covered_window",
        "approved_aggregate_grain",
        "minimum_cohort_threshold",
        "source_owner_attestation"
      ],
      ownerRole: "customer_research_or_enablement_owner",
      instructions: [
        "Provide aggregate AI Fluency, survey, or empirical user voice evidence only.",
        "Do not include raw responses or person-level records."
      ],
      caveats: [
        "Layer 2 request can close an evidence gap only after aggregate evidence is validated."
      ]
    }, options);
  }
  if (layer === "layer_3_business_system_outcomes") {
    return baseRequest({
      requestId,
      orgId,
      measurementPlanId,
      evidenceSnapshotId: options.evidenceSnapshotId,
      layer,
      type: "aggregate_export",
      purpose: "Collect customer-owned aggregate system-of-record outcome metrics for Playbook Layer 3.",
      acceptedFormats: [
        "aggregate_system_of_record_export",
        "customer_attested_kpi_summary",
        "manual_aggregate_entry"
      ],
      requiredFields: [
        "customer_owned_aggregate_metric",
        "covered_window",
        "metric_owner_attestation",
        "approved_aggregate_grain",
        "minimum_cohort_threshold"
      ],
      ownerRole: "customer_metric_owner",
      approverRole: "customer_business_owner",
      instructions: [
        "Provide aggregate customer-owned KPI baseline and comparison metrics.",
        "Do not include raw rows, account-level records, or person-level records."
      ],
      caveats: [
        "Layer 3 request does not prove causality or financial impact by itself."
      ]
    }, options);
  }
  if (layer === "governance_evidence") {
    return baseRequest({
      requestId,
      orgId,
      measurementPlanId,
      evidenceSnapshotId: options.evidenceSnapshotId,
      layer,
      type: "governance_control_confirmation",
      purpose: "Confirm aggregate privacy, k-min, source readiness, and control posture.",
      acceptedFormats: ["control_confirmation", "policy_attestation"],
      requiredFields: [
        "source_readiness_state",
        "data_boundary_state",
        "k_min_posture",
        "raw_content_exclusion",
        "source_owner_attestation"
      ],
      ownerRole: "customer_data_or_governance_owner",
      approverRole: "customer_governance_owner",
      instructions: [
        "Confirm aggregate-only evidence handling, k-min posture, and raw-content exclusion."
      ],
      caveats: [
        "Governance confirmation can only support evidence validation boundaries, not claims."
      ]
    }, options);
  }
  if (layer === "assumption_evidence") {
    return baseRequest({
      requestId,
      orgId,
      measurementPlanId,
      evidenceSnapshotId: options.evidenceSnapshotId,
      layer,
      type: "finance_or_business_approval",
      purpose: "Collect customer-owned assumption approvals required before stronger claim review.",
      acceptedFormats: [
        "customer_assumption_approval",
        "finance_or_business_approval"
      ],
      requiredFields: [
        "customer_owned_assumption",
        "approval_state",
        "assumption_owner_role",
        "approval_caveats"
      ],
      ownerRole: "customer_business_owner",
      approverRole: "finance_or_business_owner",
      instructions: [
        "Provide customer-owned assumptions and approval state with caveats."
      ],
      caveats: [
        "Assumption approval request cannot authorize ROI, EBITA, or customer-facing output by itself."
      ]
    }, options);
  }
  return baseRequest({
    requestId,
    orgId,
    measurementPlanId,
    evidenceSnapshotId: options.evidenceSnapshotId,
    layer: "aggregate_workforce_context",
    type: "owner_attestation",
    purpose: "Collect approved aggregate workforce context for interpretation only.",
    acceptedFormats: [
      "aggregate_workforce_context_summary",
      "source_owner_attestation"
    ],
    requiredFields: [
      "aggregate_context_type",
      "approved_aggregate_grain",
      "minimum_cohort_threshold",
      "source_owner_attestation",
      "non_decisioning_context_label"
    ],
    ownerRole: "customer_workforce_context_owner",
    approverRole: "customer_data_or_governance_owner",
    instructions: [
      "Provide aggregate cohort-safe context only and label it as non-decisioning."
    ],
    caveats: [
      "Aggregate workforce context is non-decisioning context only and cannot upgrade coverage by itself."
    ]
  }, options);
}

function requiredLayersFromMeasurementPlan(plan: any): string[] {
  const layers: string[] = [];
  const requirements = plan?.playbook_evidence_requirements ?? {};
  if (requirements.layer_2_user_voice_empirical?.required === true) {
    layers.push("layer_2_user_voice_empirical");
  }
  if (requirements.layer_3_business_system_outcomes?.required === true) {
    layers.push("layer_3_business_system_outcomes");
  }
  if (requirements.governance_evidence?.required === true) {
    layers.push("governance_evidence");
  }
  if (requirements.assumption_evidence?.required === true) {
    layers.push("assumption_evidence");
  }
  if (
    plan?.aggregate_workforce_context_requirements?.required === true ||
    plan?.source_package_requirements?.aggregate_workforce_context_required === true
  ) {
    layers.push("aggregate_workforce_context");
  }
  return [...new Set(layers)];
}

function missingOrHeldLayersFromSnapshot(snapshot: any): string[] {
  const layers: string[] = [];
  const coverage = snapshot?.playbook_coverage ?? {};
  for (const layer of [
    "layer_2_user_voice_empirical",
    "layer_3_business_system_outcomes",
    "governance_evidence",
    "assumption_evidence"
  ]) {
    const status = coverage[layer]?.status;
    if (["missing", "held", "suppressed", "not_computed", "partial"].includes(String(status))) {
      layers.push(layer);
    }
  }
  const workforceContext = snapshot?.aggregate_workforce_context ?? {};
  const workforceState = workforceContext?.context_state;
  const workforceSourceType = workforceContext?.source_type;
  const workforceApprovalState = workforceContext?.source_owner_approval_state;
  const workforceMinimumCohortThreshold = workforceContext?.minimum_cohort_threshold;
  const workforceContextWasConfigured =
    snapshot?.privacy_boundary?.aggregate_workforce_context_allowed === true ||
    (workforceSourceType !== undefined && workforceSourceType !== "not_applicable") ||
    (workforceApprovalState !== undefined && workforceApprovalState !== "not_required") ||
    (workforceMinimumCohortThreshold !== undefined && workforceMinimumCohortThreshold !== null) ||
    stringsOf(workforceContext?.allowed_context_types).length > 0 ||
    stringsOf(snapshot?.source_refs?.aggregate_workforce_context_export_ids).length > 0;
  if (
    workforceContextWasConfigured &&
    ["not_provided", "held_for_approval", "suppressed", "blocked"].includes(String(workforceState))
  ) {
    layers.push("aggregate_workforce_context");
  }
  return [...new Set(layers)];
}

export function buildClientEvidenceRequestsFromMeasurementPlan(
  measurementPlan: any,
  options: BuildClientEvidenceRequestOptions = {}
): ClientEvidenceRequest[] {
  const validation = validateMeasurementPlan(measurementPlan);
  if (!validation.valid) {
    throw new Error(`Measurement Plan is invalid: ${validation.gaps.join("; ")}`);
  }
  const orgId = measurementPlan?.org_id ?? "unknown_org";
  const measurementPlanId = measurementPlan?.measurement_plan_id ?? "unknown_measurement_plan";
  return requiredLayersFromMeasurementPlan(measurementPlan).map((layer) =>
    requestForLayer(orgId, measurementPlanId, layer, options)
  );
}

export function buildClientEvidenceRequestsFromEvidenceSnapshot(
  evidenceSnapshot: any,
  options: BuildClientEvidenceRequestOptions = {}
): ClientEvidenceRequest[] {
  const validation = validateEvidenceSnapshot(evidenceSnapshot);
  if (!validation.valid) {
    throw new Error(`Evidence Snapshot is invalid: ${validation.gaps.join("; ")}`);
  }
  const orgId = evidenceSnapshot?.org_id ?? "unknown_org";
  const measurementPlanId = evidenceSnapshot?.measurement_plan_id ?? "unknown_measurement_plan";
  return missingOrHeldLayersFromSnapshot(evidenceSnapshot).map((layer) =>
    requestForLayer(orgId, measurementPlanId, layer, {
      ...options,
      evidenceSnapshotId: evidenceSnapshot?.evidence_snapshot_id ?? null
    })
  );
}
