/**
 * AI Value Engine - VBD + Token Operator Source Handoff.
 *
 * Contract-only bridge from a validated scrubbed aggregate VBD/token intake
 * into the Operator Intake Adapter source shape. It does not parse files, run
 * BigQuery or Glean queries, ingest raw rows, persist output, create
 * routes/UI/schemas, feed Measurement Cell directly, compute confidence,
 * calculate ROI, prove causality, emit productivity claims, or create
 * customer-facing financial output.
 */

import {
  validateVbdTokenAggregateIntake,
  type VbdTokenAggregateIntakeValidationResult
} from "./vbdTokenAggregateIntake";

export const AI_VALUE_VBD_TOKEN_OPERATOR_SOURCE_HANDOFF_SCHEMA_VERSION =
  "FT_AI_VALUE_VBD_TOKEN_OPERATOR_SOURCE_HANDOFF_2026_06";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_VBD_TOKEN_OPERATOR_SOURCE_HANDOFF_VALIDATION_2026_06";

const DERIVATION_VERSION =
  "ai_value_vbd_token_operator_source_handoff_2026_06";

const REQUIRED_BLOCKED_USES = [
  "realized_roi",
  "ebita_claim",
  "ebitda_claim",
  "financial_attribution",
  "causality_claim",
  "productivity_claim",
  "headcount_reduction_claim",
  "individual_attribution",
  "individual_scoring",
  "manager_or_team_ranking",
  "people_decisioning",
  "customer_facing_financial_output",
  "confidence_percentage",
  "probability_output"
];

const SAFE_ALLOWED_USES = [
  "operator_intake_vbd_token_source_preparation",
  "measurement_cell_vbd_context_preparation",
  "measurement_cell_token_context_preparation"
];

const REQUIRED_FALSE_BOUNDARY_FIELDS = [
  "persists_output",
  "creates_migrations",
  "creates_prisma_schema",
  "creates_backend_routes",
  "creates_frontend_ui",
  "creates_ingestion_jobs",
  "runs_bigquery",
  "runs_glean_query",
  "parses_uploaded_files",
  "ingests_raw_rows",
  "stores_raw_source_data",
  "contains_person_level_results",
  "contains_direct_identifiers",
  "token_usage_changes_vbd_formula",
  "token_usage_upgrades_claim_readiness",
  "feeds_measurement_cell_directly",
  "feeds_finance_context_investigation",
  "feeds_confidence_model",
  "emits_confidence_percentage",
  "emits_probability",
  "customer_facing_financial_output"
];

const ALLOWED_DECISIONS = new Set([
  "READY_FOR_OPERATOR_INTAKE",
  "HELD_NO_FEEDABLE_VBD_TOKEN_SOURCE",
  "BLOCKED"
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
  /respondent_id/i,
  /person_id/i,
  /person_identifier/i,
  /hashed_(?:user|person|employee)_id/i,
  /joinable_(?:user|person|employee)_identifier/i,
  /person_level_productivity/i,
  /person_level_hris/i,
  /manager_ranking/i,
  /team_ranking/i,
  /^confidence_percentage$/i,
  /^confidence_percent$/i,
  /^confidence_score$/i,
  /^confidence$/i,
  /^probability$/i,
  /probability_score/i,
  /probability_output/i,
  /contribution_probability/i,
  /contribution_likelihood/i,
  /ai_contribution_confidence/i,
  /contribution_confidence/i,
  /^roi$/i,
  /realized_roi/i,
  /roi_(?:value|amount|calculation|result|impact)/i,
  /^ebita$/i,
  /^ebitda$/i,
  /cost_savings/i,
  /savings_claim/i,
  /financial_impact/i,
  /financial_attribution/i,
  /finance_context_investigation/i,
  /^financial_output$/i,
  /^customer_facing_financial_output$/i,
  /causality_claim/i,
  /causal_proof/i,
  /productivity_claim/i,
  /productivity_lift/i,
  /^backend_routes?$/i,
  /^backend_route$/i,
  /^frontend_ui$/i,
  /^persistence_table$/i,
  /^schema_ref$/i
];

const EMAIL_VALUE_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

const DIRECT_IDENTIFIER_VALUE_PATTERN =
  /\b(?:respondent|employee|user|person)(?:[_:/-](?:id[_:/-]?)?)?[0-9a-f]{3,}\b/i;

const UNSAFE_VALUE_PATTERNS = [
  /raw_(?:prompt|response|transcript|content|file|export|event|row)/i,
  /(?:^|_)transcript(?:_|$)/i,
  /(?:^|_)select(?:_|$)/i,
  /(?:^|_)from_raw(?:_|$)/i,
  /(?:^|_)query_text(?:_|$)/i,
  /(?:^|_)sql_text(?:_|$)/i,
  /(?:^|_)bigquery_sql(?:_|$)/i,
  /(?:^|_)confidence_model(?:_|$)/i,
  /(?:^|_)confidence_percentage(?:_|$)/i,
  /(?:^|_)probability(?:_|$)/i,
  /(?:^|_)roi(?:_|$)/i,
  /(?:^|_)ebita(?:_|$)/i,
  /(?:^|_)ebitda(?:_|$)/i,
  /(?:^|_)financial_attribution(?:_|$)/i,
  /(?:^|_)customer_facing_financial(?:_|$)/i
];

const AFFIRMATIVE_CLAIM_VALUE_PATTERNS = [
  /\b\d+(?:\.\d+)?%\s+confidence\b/i,
  /\bconfidence\b.*\b(?:caused|drove|created|proved|proves)\b/i,
  /\b(?:caused|drove|created|proved|proves)\b.*\b(?:roi|savings|financial|ebitda|ebita)\b/i,
  /\bready for finance output\b/i,
  /\bcustomer-facing financial output\b/i
];

const NEGATIVE_CAVEAT_PATTERNS = [
  /\bno\b/i,
  /\bnot\b/i,
  /\bnever\b/i,
  /\bwithout\b/i,
  /\bblocked?\b/i,
  /\bexcluded?\b/i,
  /\bmust not\b/i,
  /\bcannot\b/i,
  /\bdoes not\b/i
];

export interface BuildVbdTokenOperatorSourceHandoffInput {
  aggregateIntake: any;
  handoffId?: string;
  generatedAt?: string;
}

export interface VbdTokenOperatorSourceHandoffValidationResult {
  schema_version: string;
  handoff_id: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    operator_intake_source: boolean;
    data_spine_vbd_token_source: boolean;
    measurement_cell_vbd_context_fragment: boolean;
    measurement_cell_token_context_fragment: boolean;
    measurement_cell_direct_feed: false;
    finance_context_investigation: false;
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

function stringsOf(value: any): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function requireField(value: any, path: string, gaps: string[]): void {
  if (value === undefined || value === null || value === "") {
    gaps.push(`${path} is missing`);
  }
}

function numberOrNull(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function boundaryPolicy(): Record<string, false> {
  return Object.fromEntries(
    REQUIRED_FALSE_BOUNDARY_FIELDS.map((field) => [field, false])
  ) as Record<string, false>;
}

function falseFeeds(): VbdTokenOperatorSourceHandoffValidationResult["feeds"] {
  return {
    operator_intake_source: false,
    data_spine_vbd_token_source: false,
    measurement_cell_vbd_context_fragment: false,
    measurement_cell_token_context_fragment: false,
    measurement_cell_direct_feed: false,
    finance_context_investigation: false,
    confidence_model: false,
    customer_facing_financial_output: false
  };
}

function readyFeeds(): VbdTokenOperatorSourceHandoffValidationResult["feeds"] {
  return {
    operator_intake_source: true,
    data_spine_vbd_token_source: true,
    measurement_cell_vbd_context_fragment: true,
    measurement_cell_token_context_fragment: true,
    measurement_cell_direct_feed: false,
    finance_context_investigation: false,
    confidence_model: false,
    customer_facing_financial_output: false
  };
}

function validationGaps(
  validation: VbdTokenAggregateIntakeValidationResult
): string[] {
  return validation.valid
    ? []
    : validation.gaps.map((gap) => `vbd_token_aggregate_intake: ${gap}`);
}

function aggregateIntakeCanFeed(
  intake: any,
  validation: VbdTokenAggregateIntakeValidationResult
): boolean {
  return validation.valid === true &&
    validation.feeds.data_spine_vbd_token_source === true &&
    validation.feeds.measurement_cell_vbd_context === true &&
    intake?.data_spine_source?.state === "present" &&
    intake?.feeds?.data_spine_vbd_token_source === true &&
    intake?.feeds?.measurement_cell_vbd_context === true;
}

function operatorSourceFrom(intake: any): any {
  return {
    ...intake.data_spine_source,
    workflow_id: intake.workflow_id ?? null,
    owner_role: intake.source_owner_role ?? null
  };
}

function sourceIdentityFrom(intake: any, operatorSource: any): any {
  return {
    org_id: operatorSource?.org_id ?? intake?.org_id ?? null,
    client_id: operatorSource?.client_id ?? intake?.client_id ?? null,
    workflow_family: operatorSource?.workflow_family ?? intake?.workflow_family ?? null,
    workflow_id: intake?.workflow_id ?? null,
    function_area: operatorSource?.function_area ?? intake?.function_area ?? null,
    cohort_key: operatorSource?.cohort_key ?? intake?.cohort_key ?? null,
    baseline_window: operatorSource?.baseline_window ?? intake?.baseline_window ?? null,
    comparison_window: operatorSource?.comparison_window ?? intake?.comparison_window ?? null,
    owner_approval_state: operatorSource?.owner_approval_state ?? intake?.owner_approval_state ?? null,
    source_review_state: operatorSource?.review_state ?? intake?.review_state ?? null,
    source_ref: operatorSource?.source_ref ?? intake?.source_ref ?? null
  };
}

function vbdContextFrom(intake: any, operatorSource: any): any {
  return {
    ...sourceIdentityFrom(intake, operatorSource),
    evidence_state: "present",
    velocity: numberOrNull(intake?.vbd_context?.velocity),
    breadth: numberOrNull(intake?.vbd_context?.breadth),
    depth: numberOrNull(intake?.vbd_context?.depth),
    integration_score: numberOrNull(intake?.vbd_context?.integration_score),
    overall_vbd_score: numberOrNull(intake?.vbd_context?.overall_vbd_score),
    threshold: numberOrNull(intake?.vbd_context?.threshold),
    vbd_quadrant: intake?.vbd_context?.vbd_quadrant ?? null,
    suppression_state: intake?.vbd_context?.suppression_state ?? "CLEAR",
    role: "aggregate_behavioral_exposure_context_only"
  };
}

function tokenContextFrom(intake: any, operatorSource: any): any {
  return {
    ...sourceIdentityFrom(intake, operatorSource),
    evidence_state: "present",
    token_total: numberOrNull(
      intake?.token_context?.token_total ?? intake?.token_context?.total_tokens
    ),
    total_tokens: numberOrNull(intake?.token_context?.total_tokens),
    aggregate_interaction_count: numberOrNull(
      intake?.token_context?.aggregate_interaction_count
    ),
    aggregate_workflow_count: numberOrNull(
      intake?.token_context?.aggregate_workflow_count
    ),
    high_intensity_workflow_share: numberOrNull(
      intake?.token_context?.high_intensity_workflow_share
    ),
    average_tokens_per_interaction: numberOrNull(
      intake?.token_context?.average_tokens_per_interaction
    ),
    average_tokens_per_workflow: numberOrNull(
      intake?.token_context?.average_tokens_per_workflow
    ),
    token_per_active_seat: numberOrNull(intake?.token_context?.token_per_active_seat),
    token_intensity_band: intake?.token_context?.token_intensity_band ?? null,
    token_usage_role: "spend_or_intensity_context_only",
    role: "spend_or_intensity_context_only"
  };
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
      currentPath.some((part) =>
        ["boundary_policy", "feeds"].includes(normalizeKey(part))
      );
    if (
      !isFalseBoundaryFlag &&
      !["blocked_uses"].includes(normalized) &&
      FORBIDDEN_FIELD_PATTERNS.some((pattern) => pattern.test(key) || pattern.test(normalized))
    ) {
      fields.add(currentPath.join("."));
    }
    collectForbiddenFields(nested, fields, currentPath);
  }
  return fields;
}

function isValueExemptPath(path: string[]): boolean {
  const first = normalizeKey(path[0] ?? "");
  return ["blocked_uses", "boundary_policy"].includes(first);
}

function isRequiredCaveatPath(path: string[]): boolean {
  return normalizeKey(path[0] ?? "") === "required_caveats";
}

function isNegativeCaveat(value: string): boolean {
  return NEGATIVE_CAVEAT_PATTERNS.some((pattern) => pattern.test(value));
}

function collectForbiddenValues(
  value: any,
  fields: Set<string> = new Set(),
  path: string[] = []
): Set<string> {
  if (typeof value === "string") {
    const normalizedValue = normalizeKey(value);
    if (!isValueExemptPath(path)) {
      const unsafeRawOrIdentifier =
        EMAIL_VALUE_PATTERN.test(value) ||
        DIRECT_IDENTIFIER_VALUE_PATTERN.test(value) ||
        [
          /raw_(?:prompt|response|transcript|content|file|export|event|row)/i,
          /(?:^|_)transcript(?:_|$)/i,
          /(?:^|_)select(?:_|$)/i,
          /(?:^|_)from_raw(?:_|$)/i,
          /(?:^|_)query_text(?:_|$)/i,
          /(?:^|_)sql_text(?:_|$)/i,
          /(?:^|_)bigquery_sql(?:_|$)/i
        ].some((pattern) =>
          pattern.test(value) || pattern.test(normalizedValue)
        );
      const negativeRequiredCaveat =
        isRequiredCaveatPath(path) && isNegativeCaveat(value);
      const unsafeClaimOrOutput =
        !negativeRequiredCaveat &&
        UNSAFE_VALUE_PATTERNS.some((pattern) =>
          pattern.test(value) || pattern.test(normalizedValue)
        );
      const unsafeAffirmativeCaveat =
        isRequiredCaveatPath(path) &&
        !negativeRequiredCaveat &&
        AFFIRMATIVE_CLAIM_VALUE_PATTERNS.some((pattern) =>
          pattern.test(value) || pattern.test(normalizedValue)
        );
      if (unsafeRawOrIdentifier || unsafeClaimOrOutput || unsafeAffirmativeCaveat) {
        fields.add(path.join(".") || "value");
      }
    }
    return fields;
  }
  if (!value || typeof value !== "object") return fields;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectForbiddenValues(item, fields, [...path, String(index)])
    );
    return fields;
  }
  for (const [key, nested] of Object.entries(value)) {
    collectForbiddenValues(nested, fields, [...path, key]);
  }
  return fields;
}

export function buildVbdTokenOperatorSourceHandoff(
  input: BuildVbdTokenOperatorSourceHandoffInput
): any {
  const intakeValidation = validateVbdTokenAggregateIntake(input.aggregateIntake);
  const inputGaps = validationGaps(intakeValidation);
  const canFeed = aggregateIntakeCanFeed(input.aggregateIntake, intakeValidation);
  const blocked = inputGaps.length > 0;
  const ready = !blocked && canFeed;
  const decision = blocked
    ? "BLOCKED"
    : ready
      ? "READY_FOR_OPERATOR_INTAKE"
      : "HELD_NO_FEEDABLE_VBD_TOKEN_SOURCE";
  const sourceRef = input.aggregateIntake?.source_ref ?? null;
  const operatorSource = ready ? operatorSourceFrom(input.aggregateIntake) : null;

  return {
    schema_version: AI_VALUE_VBD_TOKEN_OPERATOR_SOURCE_HANDOFF_SCHEMA_VERSION,
    handoff_id: input.handoffId ??
      `vbd_token_operator_source_handoff_${safeIdPart(String(input.aggregateIntake?.intake_id ?? "intake"))}_${safeIdPart(String(sourceRef ?? "none"))}`,
    source_posture: "validated_scrubbed_aggregate_vbd_token_intake",
    intake_id: input.aggregateIntake?.intake_id ?? null,
    org_id: input.aggregateIntake?.org_id ?? null,
    client_id: input.aggregateIntake?.client_id ?? null,
    workflow_family: input.aggregateIntake?.workflow_family ?? null,
    workflow_id: input.aggregateIntake?.workflow_id ?? null,
    function_area: input.aggregateIntake?.function_area ?? null,
    cohort_key: input.aggregateIntake?.cohort_key ?? null,
    source_ref: sourceRef,
    decision,
    input_gaps: inputGaps,
    operator_source: operatorSource,
    vbd_context: ready ? vbdContextFrom(input.aggregateIntake, operatorSource) : null,
    token_context: ready ? tokenContextFrom(input.aggregateIntake, operatorSource) : null,
    source_package_reference: ready
      ? {
          source_package_type: "layer_1_bigquery_telemetry_summary",
          source_refs: {
            aggregate_probe_id: sourceRef
          }
        }
      : null,
    feeds: ready ? readyFeeds() : falseFeeds(),
    allowed_uses: [...SAFE_ALLOWED_USES],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    boundary_policy: boundaryPolicy(),
    required_caveats: [
      "VBD + Token Operator Source Handoff accepts validated scrubbed aggregate VBD/token intake only.",
      "The handoff prepares an Operator Intake VBD/token source and context fragments; it cannot feed Measurement Cell directly.",
      "VBD is aggregate behavioral exposure context and token usage is spend/intensity context only, not ROI, causality, productivity, financial attribution, confidence percentage, probability, or customer-facing financial output."
    ],
    generated_at: input.generatedAt ?? new Date(0).toISOString(),
    derivation_version: DERIVATION_VERSION
  };
}

function recomputeFeeds(
  handoff: any,
  valid: boolean
): VbdTokenOperatorSourceHandoffValidationResult["feeds"] {
  if (!valid || handoff?.decision !== "READY_FOR_OPERATOR_INTAKE") return falseFeeds();
  return readyFeeds();
}

function collectReadySourceGaps(handoff: any): string[] {
  const gaps: string[] = [];
  for (const field of [
    "org_id",
    "client_id",
    "workflow_family",
    "workflow_id",
    "function_area",
    "cohort_key",
    "source_ref",
    "operator_source",
    "vbd_context",
    "token_context",
    "source_package_reference"
  ]) {
    requireField(handoff?.[field], field, gaps);
  }
  if (handoff?.operator_source?.state !== "present") {
    gaps.push("operator_source.state must be present");
  }
  if (handoff?.operator_source?.intake_mode !== "scrubbed_glean_export_summary") {
    gaps.push("operator_source.intake_mode must be scrubbed_glean_export_summary");
  }
  if (handoff?.operator_source?.source_ref !== handoff?.source_ref) {
    gaps.push("operator_source.source_ref must match handoff source_ref");
  }
  if (!handoff?.operator_source?.owner_role) {
    gaps.push("operator_source.owner_role is required");
  }
  if (handoff?.operator_source?.owner_approval_state !== "approved") {
    gaps.push("operator_source.owner_approval_state must be approved");
  }
  if (handoff?.operator_source?.review_state !== "clear") {
    gaps.push("operator_source.review_state must be clear");
  }
  if (handoff?.operator_source?.aggregate_only !== true) {
    gaps.push("operator_source.aggregate_only must be true");
  }
  if (handoff?.operator_source?.connector_status !== "scrubbed_export_only") {
    gaps.push("operator_source.connector_status must be scrubbed_export_only");
  }
  for (const contextKey of ["vbd_context", "token_context"]) {
    if (handoff?.[contextKey]?.source_ref !== handoff?.source_ref) {
      gaps.push(`${contextKey}.source_ref must match handoff source_ref`);
    }
    for (const key of [
      "org_id",
      "client_id",
      "workflow_family",
      "workflow_id",
      "function_area",
      "cohort_key",
      "baseline_window",
      "comparison_window",
      "owner_approval_state",
      "source_review_state"
    ]) {
      const operatorSourceKey =
        key === "source_review_state" ? "review_state" : key;
      if (
        JSON.stringify(handoff?.[contextKey]?.[key] ?? null) !==
        JSON.stringify(handoff?.operator_source?.[operatorSourceKey] ?? null)
      ) {
        gaps.push(`${contextKey}.${key} must match operator_source.${operatorSourceKey}`);
      }
    }
  }
  for (const field of [
    "velocity",
    "breadth",
    "depth",
    "integration_score",
    "overall_vbd_score",
    "vbd_quadrant",
    "suppression_state",
    "source_ref"
  ]) {
    requireField(handoff?.vbd_context?.[field], `vbd_context.${field}`, gaps);
  }
  for (const field of [
    "token_total",
    "token_intensity_band",
    "token_usage_role",
    "source_ref"
  ]) {
    requireField(handoff?.token_context?.[field], `token_context.${field}`, gaps);
  }
  if (handoff?.vbd_context?.suppression_state !== "CLEAR") {
    gaps.push("vbd_context.suppression_state must be CLEAR");
  }
  if (handoff?.vbd_context?.evidence_state !== "present") {
    gaps.push("vbd_context.evidence_state must be present");
  }
  if (handoff?.token_context?.evidence_state !== "present") {
    gaps.push("token_context.evidence_state must be present");
  }
  if (handoff?.token_context?.token_usage_role !== "spend_or_intensity_context_only") {
    gaps.push("token_context.token_usage_role must be spend_or_intensity_context_only");
  }
  if (
    handoff?.source_package_reference?.source_package_type !==
    "layer_1_bigquery_telemetry_summary"
  ) {
    gaps.push("source_package_reference.source_package_type must be layer_1_bigquery_telemetry_summary");
  }
  if (handoff?.source_package_reference?.source_refs?.aggregate_probe_id !== handoff?.source_ref) {
    gaps.push("source_package_reference.source_refs.aggregate_probe_id must match handoff source_ref");
  }
  if (handoff?.source_package_ref !== undefined) {
    gaps.push("source_package_ref is not supported; use source_package_reference");
  }
  return gaps;
}

export function validateVbdTokenOperatorSourceHandoff(
  handoff: any
): VbdTokenOperatorSourceHandoffValidationResult {
  const gaps: string[] = [];
  for (const field of [
    "schema_version",
    "handoff_id",
    "source_posture",
    "intake_id",
    "decision",
    "input_gaps",
    "feeds",
    "allowed_uses",
    "blocked_uses",
    "boundary_policy",
    "required_caveats",
    "generated_at",
    "derivation_version"
  ]) {
    requireField(handoff?.[field], field, gaps);
  }
  if (
    handoff?.schema_version &&
    handoff.schema_version !== AI_VALUE_VBD_TOKEN_OPERATOR_SOURCE_HANDOFF_SCHEMA_VERSION
  ) {
    gaps.push(`schema_version is invalid: ${handoff.schema_version}`);
  }
  if (handoff?.source_posture !== "validated_scrubbed_aggregate_vbd_token_intake") {
    gaps.push("source_posture must be validated_scrubbed_aggregate_vbd_token_intake");
  }
  if (handoff?.decision && !ALLOWED_DECISIONS.has(String(handoff.decision))) {
    gaps.push(`decision is invalid: ${handoff.decision}`);
  }
  if (handoff?.source_package_ref !== undefined) {
    gaps.push("source_package_ref is not supported; use source_package_reference");
  }
  if (Array.isArray(handoff?.input_gaps) && handoff.input_gaps.length > 0) {
    gaps.push(...handoff.input_gaps);
  }
  if (handoff?.decision === "READY_FOR_OPERATOR_INTAKE") {
    gaps.push(...collectReadySourceGaps(handoff));
  } else {
    for (const field of [
      "operator_source",
      "vbd_context",
      "token_context",
      "source_package_reference"
    ]) {
      if (handoff?.[field] !== null && handoff?.[field] !== undefined) {
        gaps.push(`held or blocked handoff must not carry ${field}`);
      }
    }
    if (handoff?.feeds?.operator_intake_source !== false) {
      gaps.push("held or blocked handoff cannot feed operator_intake_source");
    }
    if (handoff?.feeds?.data_spine_vbd_token_source !== false) {
      gaps.push("held or blocked handoff cannot feed data_spine_vbd_token_source");
    }
    if (handoff?.feeds?.measurement_cell_vbd_context_fragment !== false) {
      gaps.push("held or blocked handoff cannot feed measurement_cell_vbd_context_fragment");
    }
    if (handoff?.feeds?.measurement_cell_token_context_fragment !== false) {
      gaps.push("held or blocked handoff cannot feed measurement_cell_token_context_fragment");
    }
  }
  for (const field of [
    "measurement_cell_direct_feed",
    "finance_context_investigation",
    "confidence_model",
    "customer_facing_financial_output"
  ]) {
    if (handoff?.feeds?.[field] !== false) {
      gaps.push(`feeds.${field} must be false`);
    }
  }
  for (const use of REQUIRED_BLOCKED_USES) {
    if (!stringsOf(handoff?.blocked_uses).includes(use)) {
      gaps.push(`blocked_uses missing ${use}`);
    }
  }
  for (const use of SAFE_ALLOWED_USES) {
    if (!stringsOf(handoff?.allowed_uses).includes(use)) {
      gaps.push(`allowed_uses missing ${use}`);
    }
  }
  for (const use of stringsOf(handoff?.allowed_uses)) {
    if (!SAFE_ALLOWED_USES.includes(use)) {
      gaps.push(`allowed_uses contains unsupported use: ${use}`);
    }
  }
  for (const field of REQUIRED_FALSE_BOUNDARY_FIELDS) {
    if (handoff?.boundary_policy?.[field] !== false) {
      gaps.push(`boundary_policy.${field} must be false`);
    }
  }
  for (const field of [...collectForbiddenFields(handoff)].sort()) {
    gaps.push(`Forbidden field detected: ${field}`);
  }
  for (const field of [...collectForbiddenValues(handoff)].sort()) {
    gaps.push(`Unsafe identifier value detected: ${field}`);
  }
  const valid = gaps.length === 0;
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    handoff_id: handoff?.handoff_id ?? null,
    valid,
    gaps,
    feeds: recomputeFeeds(handoff, valid)
  };
}
