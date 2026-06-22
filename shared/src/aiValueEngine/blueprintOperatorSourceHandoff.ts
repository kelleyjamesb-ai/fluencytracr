/**
 * AI Value Engine - Blueprint Operator Source Handoff.
 *
 * Contract-only bridge from a validated, approved Blueprint Extraction Draft
 * into the Operator Intake Adapter source shape. It does not parse documents,
 * store uploads, persist output, create routes/UI/schemas, feed Measurement
 * Cell directly, compute confidence, calculate ROI, prove causality, emit
 * productivity claims, or create customer-facing financial output.
 */

import {
  validateBlueprintExtractionDraft,
  type BlueprintExtractionDraftValidationResult
} from "./blueprintExtractionDraft";

export const AI_VALUE_BLUEPRINT_OPERATOR_SOURCE_HANDOFF_SCHEMA_VERSION =
  "FT_AI_VALUE_BLUEPRINT_OPERATOR_SOURCE_HANDOFF_2026_06";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_BLUEPRINT_OPERATOR_SOURCE_HANDOFF_VALIDATION_2026_06";

const DERIVATION_VERSION =
  "ai_value_blueprint_operator_source_handoff_2026_06";

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

const REQUIRED_FALSE_BOUNDARY_FIELDS = [
  "persists_output",
  "creates_migrations",
  "creates_prisma_schema",
  "creates_backend_routes",
  "creates_frontend_ui",
  "creates_ingestion_jobs",
  "parses_uploaded_documents",
  "stores_raw_document_text",
  "stores_uploaded_file",
  "runs_bigquery",
  "runs_glean_query",
  "contains_person_level_results",
  "contains_direct_identifiers",
  "feeds_measurement_cell_directly",
  "feeds_finance_context_investigation",
  "feeds_confidence_model",
  "emits_confidence_percentage",
  "emits_probability",
  "customer_facing_financial_output"
];

const ALLOWED_DECISIONS = new Set([
  "READY_FOR_OPERATOR_INTAKE",
  "HELD_FOR_BLUEPRINT_APPROVAL",
  "BLOCKED"
]);

const ALLOWED_EXPECTED_BEHAVIORS = new Set([
  "knowledge_retrieval",
  "reuse",
  "delegation",
  "verification"
]);

const ALLOWED_EXPECTED_VBD_SIGNALS = new Set([
  "velocity",
  "breadth",
  "depth",
  "integration",
  "not_selected"
]);

const ALLOWED_VALUE_DRIVERS = new Set([
  "revenue",
  "cost",
  "capacity",
  "quality",
  "risk",
  "not_selected"
]);

const FORBIDDEN_FIELD_PATTERNS = [
  /^raw_rows?$/i,
  /^rows$/i,
  /^events$/i,
  /^records$/i,
  /raw_(?:document|prompt|response|transcript|content|file|export|event|row)/i,
  /^document_text$/i,
  /^file_contents?$/i,
  /prompt/i,
  /^responses?$/i,
  /response_text/i,
  /transcript/i,
  /^query$/i,
  /query_text/i,
  /sql_text/i,
  /bigquery_sql/i,
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
  /probability_output/i,
  /contribution_probability/i,
  /contribution_likelihood/i,
  /^roi$/i,
  /realized_roi/i,
  /roi_(?:value|amount|calculation|result|impact)/i,
  /^ebita$/i,
  /^ebitda$/i,
  /financial_impact/i,
  /financial_attribution/i,
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
  /raw_(?:document|prompt|response|transcript|content|file|export|event|row)/i,
  /(?:^|_)confidence_percentage(?:_|$)/i,
  /(?:^|_)probability(?:_|$)/i,
  /(?:^|_)roi(?:_|$)/i,
  /(?:^|_)ebita(?:_|$)/i,
  /(?:^|_)ebitda(?:_|$)/i,
  /(?:^|_)financial_attribution(?:_|$)/i,
  /(?:^|_)customer_facing_financial(?:_|$)/i
];

export interface BuildBlueprintOperatorSourceHandoffInput {
  draft: any;
  handoffId?: string;
  generatedAt?: string;
}

export interface BlueprintOperatorSourceHandoffValidationResult {
  schema_version: string;
  handoff_id: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    operator_intake_source: boolean;
    data_spine_blueprint_source: boolean;
    measurement_cell_context_fragment: boolean;
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

function boundaryPolicy(): Record<string, false> {
  return Object.fromEntries(
    REQUIRED_FALSE_BOUNDARY_FIELDS.map((field) => [field, false])
  ) as Record<string, false>;
}

function falseFeeds(): BlueprintOperatorSourceHandoffValidationResult["feeds"] {
  return {
    operator_intake_source: false,
    data_spine_blueprint_source: false,
    measurement_cell_context_fragment: false,
    measurement_cell_direct_feed: false,
    finance_context_investigation: false,
    confidence_model: false,
    customer_facing_financial_output: false
  };
}

function readyFeeds(): BlueprintOperatorSourceHandoffValidationResult["feeds"] {
  return {
    operator_intake_source: true,
    data_spine_blueprint_source: true,
    measurement_cell_context_fragment: true,
    measurement_cell_direct_feed: false,
    finance_context_investigation: false,
    confidence_model: false,
    customer_facing_financial_output: false
  };
}

function validationGaps(
  validation: BlueprintExtractionDraftValidationResult
): string[] {
  return validation.valid
    ? []
    : validation.gaps.map((gap) => `blueprint_extraction_draft: ${gap}`);
}

function firstMetric(draft: any): any | null {
  const metrics = draft?.extracted_fields?.metric_candidates;
  return Array.isArray(metrics) && metrics.length > 0 ? metrics[0] : null;
}

function finiteNumberOrNull(value: any): number | null {
  if (value === undefined || value === null || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function operatorSourceFrom(draft: any): any {
  return {
    ...draft.data_spine_source,
    owner_role: draft.owner_role ?? null
  };
}

function blueprintAlignmentContextFrom(draft: any, operatorSource: any): any {
  const metric = firstMetric(draft);
  const fields = draft?.extracted_fields ?? {};
  return {
    org_id: operatorSource?.org_id ?? null,
    client_id: operatorSource?.client_id ?? null,
    workflow_family: operatorSource?.workflow_family ?? null,
    function_area: operatorSource?.function_area ?? null,
    cohort_key: operatorSource?.cohort_key ?? null,
    baseline_window: operatorSource?.baseline_window ?? null,
    comparison_window: operatorSource?.comparison_window ?? null,
    source_review_state: operatorSource?.review_state ?? null,
    owner_approval_state: operatorSource?.owner_approval_state ?? null,
    blueprint_expectation_ref:
      fields.blueprint_expectation_ref ??
      operatorSource?.blueprint_expectation_ref ??
      null,
    blueprint_customer_approval_state:
      fields.blueprint_customer_approval_state ?? null,
    blueprint_customer_approver_role:
      fields.blueprint_customer_approver_role ?? draft?.approver_role ?? null,
    value_route: draft?.extracted_fields?.value_route ?? "unclassified",
    value_promise: draft?.extracted_fields?.value_hypothesis ?? null,
    expected_behavior_pathways: Array.isArray(fields.expected_behavior_pathways)
      ? fields.expected_behavior_pathways
      : [],
    expected_metric_id: metric?.metric_id ?? null,
    expected_metric_name: metric?.metric_name ?? metric?.metric_id ?? null,
    expected_metric_direction: metric?.expected_direction ?? "unknown",
	    expected_metric_lag_days: finiteNumberOrNull(
	      fields.expected_metric_lag_days ?? metric?.expected_lag_days
	    ),
	    expected_metric_system_recommended:
	      fields.expected_metric_system_recommended ?? metric?.system_recommended ?? null,
	    expected_metric_customer_selected:
	      fields.expected_metric_customer_selected ?? metric?.customer_selected ?? null,
    value_driver: fields.value_driver ?? metric?.value_driver ?? "not_selected",
    owner_role: draft?.owner_role ?? null,
    assumption_refs: stringsOf(draft?.extracted_fields?.assumption_refs),
    source_ref: operatorSource?.source_ref ?? null
  };
}

function collectExpectationGaps(handoff: any): string[] {
  const gaps: string[] = [];
  const context = handoff?.blueprint_alignment_context;
  if (!context) return gaps;
  if (context.blueprint_expectation_ref !== undefined &&
      context.blueprint_expectation_ref !== null &&
      handoff?.operator_source?.blueprint_expectation_ref !== undefined &&
      context.blueprint_expectation_ref !== handoff.operator_source.blueprint_expectation_ref) {
    gaps.push("blueprint_alignment_context.blueprint_expectation_ref must match operator_source.blueprint_expectation_ref");
  }
  if (context.blueprint_customer_approval_state !== "approved") {
    gaps.push("blueprint_alignment_context.blueprint_customer_approval_state must be approved");
  }
  if (
    handoff?.operator_source?.blueprint_customer_approval_state !== undefined &&
    context.blueprint_customer_approval_state !== handoff.operator_source.blueprint_customer_approval_state
  ) {
    gaps.push("blueprint_alignment_context.blueprint_customer_approval_state must match operator_source.blueprint_customer_approval_state");
  }
  requireField(
    context.blueprint_customer_approver_role,
    "blueprint_alignment_context.blueprint_customer_approver_role",
    gaps
  );
  if (!Array.isArray(context.expected_behavior_pathways)) {
    gaps.push("blueprint_alignment_context.expected_behavior_pathways must be an array");
  } else {
    context.expected_behavior_pathways.forEach((pathway: any, index: number) => {
      const prefix = `blueprint_alignment_context.expected_behavior_pathways.${index}`;
      if (!ALLOWED_EXPECTED_BEHAVIORS.has(String(pathway?.behavior))) {
        gaps.push(`${prefix}.behavior is invalid`);
      }
      if (!ALLOWED_EXPECTED_VBD_SIGNALS.has(String(pathway?.expected_vbd_signal))) {
        gaps.push(`${prefix}.expected_vbd_signal is invalid`);
      }
      if (typeof pathway?.system_recommended !== "boolean") {
        gaps.push(`${prefix}.system_recommended must be boolean`);
      }
      if (pathway?.customer_selected !== true) {
        gaps.push(`${prefix}.customer_selected must be true for approved Blueprint expectations`);
      }
    });
  }
  const lag = context.expected_metric_lag_days;
  if (lag !== undefined && lag !== null && (!Number.isFinite(Number(lag)) || Number(lag) < 0)) {
    gaps.push("blueprint_alignment_context.expected_metric_lag_days must be a non-negative number or null");
  }
  if (context.expected_metric_system_recommended !== undefined &&
      typeof context.expected_metric_system_recommended !== "boolean") {
    gaps.push("blueprint_alignment_context.expected_metric_system_recommended must be boolean");
  }
  if (context.expected_metric_customer_selected !== true) {
    gaps.push("blueprint_alignment_context.expected_metric_customer_selected must be true for approved Blueprint expectations");
  }
  if (!ALLOWED_VALUE_DRIVERS.has(String(context.value_driver))) {
    gaps.push("blueprint_alignment_context.value_driver is invalid");
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
  return ["blocked_uses", "boundary_policy", "required_caveats"].includes(first);
}

function collectForbiddenValues(
  value: any,
  fields: Set<string> = new Set(),
  path: string[] = []
): Set<string> {
  if (typeof value === "string") {
    const normalizedValue = normalizeKey(value);
    if (
      !isValueExemptPath(path) &&
      (
        EMAIL_VALUE_PATTERN.test(value) ||
        DIRECT_IDENTIFIER_VALUE_PATTERN.test(value) ||
        UNSAFE_VALUE_PATTERNS.some((pattern) =>
          pattern.test(value) || pattern.test(normalizedValue)
        )
      )
    ) {
      fields.add(path.join(".") || "value");
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

function decisionFrom(draft: any, draftValidation: BlueprintExtractionDraftValidationResult): string {
  if (!draftValidation.valid) return "BLOCKED";
  if (draft?.extraction_state === "blocked" || draft?.approval_state === "rejected") {
    return "BLOCKED";
  }
  return draftValidation.feeds.data_spine_blueprint_source
    ? "READY_FOR_OPERATOR_INTAKE"
    : "HELD_FOR_BLUEPRINT_APPROVAL";
}

export function buildBlueprintOperatorSourceHandoff(
  input: BuildBlueprintOperatorSourceHandoffInput
): any {
  const draftValidation = validateBlueprintExtractionDraft(input.draft);
  const inputGaps = validationGaps(draftValidation);
  const decision = decisionFrom(input.draft, draftValidation);
  const ready = decision === "READY_FOR_OPERATOR_INTAKE" && inputGaps.length === 0;
  const operatorSource = ready ? operatorSourceFrom(input.draft) : null;
  const blueprintAlignmentContext = ready
    ? blueprintAlignmentContextFrom(input.draft, operatorSource)
    : null;

  return {
    schema_version: AI_VALUE_BLUEPRINT_OPERATOR_SOURCE_HANDOFF_SCHEMA_VERSION,
    handoff_id: input.handoffId ??
      `blueprint_operator_source_handoff_${safeIdPart(String(input.draft?.draft_id ?? "draft"))}`,
    source_posture: "validated_blueprint_extraction_draft",
    draft_id: input.draft?.draft_id ?? null,
    document_source_ref: input.draft?.document_source_ref ?? null,
    org_id: input.draft?.org_id ?? null,
    client_id: input.draft?.client_id ?? null,
    workflow_family: input.draft?.workflow_family ?? null,
    function_area: input.draft?.function_area ?? null,
    cohort_key: input.draft?.cohort_key ?? null,
    source_ref: input.draft?.data_spine_source?.source_ref ?? null,
    decision,
    input_gaps: inputGaps,
    operator_source: operatorSource,
    blueprint_alignment_context: blueprintAlignmentContext,
    source_package_reference: null,
    feeds: ready ? readyFeeds() : falseFeeds(),
    allowed_uses: [
      "operator_intake_blueprint_source_preparation",
      "measurement_cell_blueprint_alignment_context_preparation"
    ],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    boundary_policy: boundaryPolicy(),
    required_caveats: [
      "Blueprint Operator Source Handoff accepts validated Blueprint Extraction Drafts only.",
      "The handoff prepares an Operator Intake Blueprint source and context fragment; it cannot feed Measurement Cell directly.",
      "Blueprint value promises are hypothesis context only, not ROI, causality, productivity, financial attribution, confidence percentage, probability, or customer-facing financial output."
    ],
    generated_at: input.generatedAt ?? new Date(0).toISOString(),
    derivation_version: DERIVATION_VERSION
  };
}

function recomputeFeeds(
  handoff: any,
  valid: boolean
): BlueprintOperatorSourceHandoffValidationResult["feeds"] {
  if (!valid || handoff?.decision !== "READY_FOR_OPERATOR_INTAKE") return falseFeeds();
  return readyFeeds();
}

function collectReadySourceGaps(handoff: any): string[] {
  const gaps: string[] = [];
  for (const field of [
    "org_id",
    "client_id",
    "workflow_family",
    "function_area",
    "cohort_key",
    "source_ref",
    "operator_source",
    "blueprint_alignment_context"
  ]) {
    requireField(handoff?.[field], field, gaps);
  }
  if (handoff?.operator_source?.state !== "present") {
    gaps.push("operator_source.state must be present");
  }
  if (handoff?.operator_source?.intake_mode !== "blueprint_structured_import") {
    gaps.push("operator_source.intake_mode must be blueprint_structured_import");
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
  if (handoff?.blueprint_alignment_context?.source_ref !== handoff?.source_ref) {
    gaps.push("blueprint_alignment_context.source_ref must match handoff source_ref");
  }
  for (const key of [
    "org_id",
    "client_id",
    "workflow_family",
    "function_area",
    "cohort_key",
    "baseline_window",
    "comparison_window",
    "owner_approval_state"
  ]) {
    if (
      JSON.stringify(handoff?.blueprint_alignment_context?.[key] ?? null) !==
      JSON.stringify(handoff?.operator_source?.[key] ?? null)
    ) {
      gaps.push(`blueprint_alignment_context.${key} must match operator_source.${key}`);
    }
  }
  if (
    handoff?.blueprint_alignment_context?.source_review_state !==
    handoff?.operator_source?.review_state
  ) {
    gaps.push("blueprint_alignment_context.source_review_state must match operator_source.review_state");
  }
  for (const key of [
    "expected_metric_id",
    "expected_metric_direction"
  ]) {
    if (
      handoff?.operator_source?.[key] !== undefined &&
      handoff?.operator_source?.[key] !== null &&
      handoff?.blueprint_alignment_context?.[key] !== handoff.operator_source[key]
    ) {
      gaps.push(`blueprint_alignment_context.${key} must match operator_source.${key}`);
    }
  }
  for (const field of [
    "blueprint_expectation_ref",
    "blueprint_customer_approval_state",
    "blueprint_customer_approver_role",
    "value_route",
    "value_promise",
    "expected_behavior_pathways",
    "expected_metric_id",
    "expected_metric_name",
    "expected_metric_direction",
    "expected_metric_system_recommended",
    "expected_metric_customer_selected",
    "value_driver",
    "owner_role",
    "source_review_state",
    "assumption_refs",
    "source_ref"
  ]) {
    requireField(handoff?.blueprint_alignment_context?.[field], `blueprint_alignment_context.${field}`, gaps);
  }
  if (!Array.isArray(handoff?.blueprint_alignment_context?.assumption_refs)) {
    gaps.push("blueprint_alignment_context.assumption_refs must be an array");
  }
  if (handoff?.source_package_reference !== null) {
    gaps.push("source_package_reference must be null for Blueprint handoff");
  }
  gaps.push(...collectExpectationGaps(handoff));
  return gaps;
}

export function validateBlueprintOperatorSourceHandoff(
  handoff: any
): BlueprintOperatorSourceHandoffValidationResult {
  const gaps: string[] = [];
  for (const field of [
    "schema_version",
    "handoff_id",
    "source_posture",
    "draft_id",
    "document_source_ref",
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
    handoff.schema_version !== AI_VALUE_BLUEPRINT_OPERATOR_SOURCE_HANDOFF_SCHEMA_VERSION
  ) {
    gaps.push(`schema_version is invalid: ${handoff.schema_version}`);
  }
  if (handoff?.source_posture !== "validated_blueprint_extraction_draft") {
    gaps.push("source_posture must be validated_blueprint_extraction_draft");
  }
  if (handoff?.decision && !ALLOWED_DECISIONS.has(String(handoff.decision))) {
    gaps.push(`decision is invalid: ${handoff.decision}`);
  }
  if (Array.isArray(handoff?.input_gaps) && handoff.input_gaps.length > 0) {
    gaps.push(...handoff.input_gaps);
  }
  if (handoff?.decision === "READY_FOR_OPERATOR_INTAKE") {
    gaps.push(...collectReadySourceGaps(handoff));
  } else {
    if (handoff?.feeds?.operator_intake_source !== false) {
      gaps.push("held or blocked handoff cannot feed operator_intake_source");
    }
    if (handoff?.feeds?.data_spine_blueprint_source !== false) {
      gaps.push("held or blocked handoff cannot feed data_spine_blueprint_source");
    }
    if (handoff?.feeds?.measurement_cell_context_fragment !== false) {
      gaps.push("held or blocked handoff cannot feed measurement_cell_context_fragment");
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
