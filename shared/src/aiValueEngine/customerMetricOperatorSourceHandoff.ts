/**
 * AI Value Engine - Customer Metric Operator Source Handoff.
 *
 * Contract-only bridge from a validated Customer Metric Intake into the
 * Operator Intake Adapter source shape. It does not parse files, run customer
 * connectors, persist output, create routes/UI/schemas, feed Measurement Cell
 * directly, compute confidence, calculate ROI, prove causality, emit
 * productivity claims, or create customer-facing financial output.
 */

import {
  validateCustomerMetricIntake,
  type CustomerMetricIntakeValidationResult
} from "./customerMetricIntake";

export const AI_VALUE_CUSTOMER_METRIC_OPERATOR_SOURCE_HANDOFF_SCHEMA_VERSION =
  "FT_AI_VALUE_CUSTOMER_METRIC_OPERATOR_SOURCE_HANDOFF_2026_06";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_CUSTOMER_METRIC_OPERATOR_SOURCE_HANDOFF_VALIDATION_2026_06";

const DERIVATION_VERSION =
  "ai_value_customer_metric_operator_source_handoff_2026_06";

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
  "department_ranking",
  "people_decisioning",
  "customer_facing_financial_output",
  "confidence_percentage",
  "probability_output"
];

const SAFE_ALLOWED_USES = [
  "operator_intake_customer_metric_source_preparation",
  "measurement_cell_selected_metric_context_preparation",
  "metric_movement_context_preparation",
  "layer_3_metric_context_preparation"
];

const REQUIRED_FALSE_BOUNDARY_FIELDS = [
  "persists_output",
  "creates_migrations",
  "creates_prisma_schema",
  "creates_backend_routes",
  "creates_frontend_ui",
  "creates_ingestion_jobs",
  "runs_customer_connectors",
  "runs_bigquery",
  "parses_uploaded_files",
  "ingests_raw_rows",
  "stores_raw_source_data",
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
  "HELD_NO_FEEDABLE_CUSTOMER_METRIC_SOURCE",
  "BLOCKED"
]);

const ALLOWED_TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "handoff_id",
  "source_posture",
  "customer_metric_intake_id",
  "org_id",
  "client_id",
  "measurement_plan_id",
  "workflow_family",
  "function_area",
  "cohort_key",
  "metric_id",
  "source_ref",
  "decision",
  "input_gaps",
  "operator_source",
  "selected_metric_context",
  "metric_movement_context",
  "layer_3_metric_context",
  "source_package_reference",
  "feeds",
  "allowed_uses",
  "blocked_uses",
  "boundary_policy",
  "required_caveats",
  "generated_at",
  "derivation_version"
]);

const ALLOWED_FEED_FIELDS = new Set([
  "operator_intake_source",
  "data_spine_customer_metric_source",
  "measurement_cell_selected_metric_context_fragment",
  "metric_movement_context_fragment",
  "layer_3_metric_context_fragment",
  "measurement_cell_direct_feed",
  "finance_context_investigation",
  "confidence_model",
  "customer_facing_financial_output"
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
  /department_ranking/i,
  /people_decisioning/i,
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
  /causal_effect/i,
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
  /(?:^|_)confidence(?:_|$)/i,
  /(?:^|_)probability(?:_|$)/i,
  /(?:^|_)roi(?:_|$)/i,
  /(?:^|_)ebita(?:_|$)/i,
  /(?:^|_)ebitda(?:_|$)/i,
  /causal/i,
  /causality/i,
  /productivity/i,
  /financial/i,
  /customer_facing/i,
  /proves?/i,
  /proof/i,
  /attribut/i
];

const NEGATIVE_CAVEAT_PATTERNS = [
  /\bnot\b/i,
  /\bno\b/i,
  /\bnever\b/i,
  /\bcannot\b/i,
  /\bcan't\b/i,
  /\bwithout\b/i,
  /\bblocked\b/i,
  /\bdoes not\b/i
];

export interface BuildCustomerMetricOperatorSourceHandoffInput {
  customerMetricIntake: any;
  handoffId?: string;
  generatedAt?: string;
}

export interface CustomerMetricOperatorSourceHandoffValidationResult {
  schema_version: string;
  handoff_id: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    operator_intake_source: boolean;
    data_spine_customer_metric_source: boolean;
    measurement_cell_selected_metric_context_fragment: boolean;
    metric_movement_context_fragment: boolean;
    layer_3_metric_context_fragment: boolean;
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

function finiteNumber(value: any): boolean {
  return typeof value === "number" && Number.isFinite(value);
}

function expectedMovementDirection(
  direction: string,
  baseline: any,
  comparison: any
): string {
  if (!finiteNumber(baseline) || !finiteNumber(comparison)) return "unknown";
  if (comparison === baseline) return "maintained";
  if (direction === "decrease") return comparison < baseline ? "improved" : "worsened";
  if (direction === "increase") return comparison > baseline ? "improved" : "worsened";
  if (direction === "maintain") return comparison === baseline ? "improved" : "needs_review";
  return "observed";
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

function falseFeeds(): CustomerMetricOperatorSourceHandoffValidationResult["feeds"] {
  return {
    operator_intake_source: false,
    data_spine_customer_metric_source: false,
    measurement_cell_selected_metric_context_fragment: false,
    metric_movement_context_fragment: false,
    layer_3_metric_context_fragment: false,
    measurement_cell_direct_feed: false,
    finance_context_investigation: false,
    confidence_model: false,
    customer_facing_financial_output: false
  };
}

function readyFeeds(): CustomerMetricOperatorSourceHandoffValidationResult["feeds"] {
  return {
    operator_intake_source: true,
    data_spine_customer_metric_source: true,
    measurement_cell_selected_metric_context_fragment: true,
    metric_movement_context_fragment: true,
    layer_3_metric_context_fragment: true,
    measurement_cell_direct_feed: false,
    finance_context_investigation: false,
    confidence_model: false,
    customer_facing_financial_output: false
  };
}

function validationGaps(
  validation: CustomerMetricIntakeValidationResult
): string[] {
  return validation.valid
    ? []
    : validation.gaps.map((gap) => `customer_metric_intake: ${gap}`);
}

function intakeCanFeed(
  intake: any,
  validation: CustomerMetricIntakeValidationResult
): boolean {
  return validation.valid === true &&
    validation.feeds.data_spine_customer_metric_source === true &&
    validation.feeds.measurement_cell_selected_metric === true &&
    validation.feeds.layer_3_business_system_outcomes === true &&
    intake?.data_spine_source?.state === "present" &&
    intake?.feeds?.data_spine_customer_metric_source === true &&
    intake?.feeds?.measurement_cell_selected_metric === true &&
    intake?.feeds?.layer_3_business_system_outcomes === true &&
    intake?.metric_evidence?.owner_approval_state === "approved" &&
    intake?.metric_evidence?.review_state === "clear" &&
    intake?.metric_evidence?.freshness_state === "current";
}

function operatorSourceFrom(intake: any): any {
  return {
    ...intake.data_spine_source,
    owner_role: intake?.metric_evidence?.source_owner_role ?? null,
    source_owner_role: intake?.metric_evidence?.source_owner_role ?? null,
    metric_owner_role: intake?.metric_evidence?.metric_owner_role ?? null,
    freshness_state: intake?.metric_evidence?.freshness_state ?? null
  };
}

function sourceIdentityFrom(intake: any, operatorSource: any): any {
  return {
    org_id: operatorSource?.org_id ?? intake?.org_id ?? null,
    client_id: operatorSource?.client_id ?? intake?.client_id ?? null,
    measurement_plan_id: intake?.measurement_plan_id ?? null,
    workflow_family: operatorSource?.workflow_family ?? intake?.workflow_family ?? null,
    function_area: operatorSource?.function_area ?? intake?.function_area ?? null,
    cohort_key: operatorSource?.cohort_key ?? intake?.cohort_key ?? null,
    baseline_window: operatorSource?.baseline_window ?? intake?.baseline_window ?? null,
    comparison_window: operatorSource?.comparison_window ?? intake?.comparison_window ?? null,
    metric_id: operatorSource?.metric_id ?? intake?.metric_id ?? null,
    owner_approval_state: operatorSource?.owner_approval_state ?? intake?.metric_evidence?.owner_approval_state ?? null,
    source_review_state: operatorSource?.review_state ?? intake?.metric_evidence?.review_state ?? null,
    freshness_state: intake?.metric_evidence?.freshness_state ?? null,
    source_ref: operatorSource?.source_ref ?? intake?.source_ref ?? null
  };
}

function selectedMetricContextFrom(intake: any, operatorSource: any): any {
  return {
    ...sourceIdentityFrom(intake, operatorSource),
    evidence_state: "present",
    ...intake.measurement_cell_selected_metric,
    role: "customer_owned_selected_metric_context_only"
  };
}

function metricMovementContextFrom(intake: any, operatorSource: any): any {
  return {
    ...sourceIdentityFrom(intake, operatorSource),
    evidence_state: "present",
    ...intake.metric_movement,
    role: "aggregate_metric_movement_context_only",
    interpretation: "descriptive_movement_only"
  };
}

function layer3MetricContextFrom(intake: any, operatorSource: any): any {
  return {
    ...sourceIdentityFrom(intake, operatorSource),
    evidence_state: "present",
    ...intake.layer_3_metric_context,
    role: "layer_3_business_system_outcome_context_only"
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
    const negativeRequiredCaveat =
      isRequiredCaveatPath(path) && isNegativeCaveat(value);
    const unsafeRawOrIdentifier =
      EMAIL_VALUE_PATTERN.test(value) ||
      DIRECT_IDENTIFIER_VALUE_PATTERN.test(value) ||
      (!negativeRequiredCaveat && UNSAFE_VALUE_PATTERNS.some((pattern) =>
        pattern.test(value) || pattern.test(normalizedValue)
      ));
    const unsafeAffirmativeCaveat =
      isRequiredCaveatPath(path) &&
      !negativeRequiredCaveat &&
      AFFIRMATIVE_CLAIM_VALUE_PATTERNS.some((pattern) =>
        pattern.test(value) || pattern.test(normalizedValue)
      );
    if (
      !isValueExemptPath(path) &&
      (unsafeRawOrIdentifier || unsafeAffirmativeCaveat)
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

export function buildCustomerMetricOperatorSourceHandoff(
  input: BuildCustomerMetricOperatorSourceHandoffInput
): any {
  const intakeValidation = validateCustomerMetricIntake(input.customerMetricIntake);
  const inputGaps = validationGaps(intakeValidation);
  const canFeed = intakeCanFeed(input.customerMetricIntake, intakeValidation);
  const blocked = inputGaps.length > 0;
  const ready = !blocked && canFeed;
  const decision = blocked
    ? "BLOCKED"
    : ready
      ? "READY_FOR_OPERATOR_INTAKE"
      : "HELD_NO_FEEDABLE_CUSTOMER_METRIC_SOURCE";
  const sourceRef = input.customerMetricIntake?.source_ref ?? null;
  const operatorSource = ready ? operatorSourceFrom(input.customerMetricIntake) : null;

  const handoff = {
    schema_version: AI_VALUE_CUSTOMER_METRIC_OPERATOR_SOURCE_HANDOFF_SCHEMA_VERSION,
    handoff_id: input.handoffId ??
      `customer_metric_operator_source_handoff_${safeIdPart(String(input.customerMetricIntake?.customer_metric_intake_id ?? "intake"))}_${safeIdPart(String(sourceRef ?? "none"))}`,
    source_posture: "validated_customer_metric_intake",
    customer_metric_intake_id:
      input.customerMetricIntake?.customer_metric_intake_id ?? null,
    org_id: input.customerMetricIntake?.org_id ?? null,
    client_id: input.customerMetricIntake?.client_id ?? null,
    measurement_plan_id: input.customerMetricIntake?.measurement_plan_id ?? null,
    workflow_family: input.customerMetricIntake?.workflow_family ?? null,
    function_area: input.customerMetricIntake?.function_area ?? null,
    cohort_key: input.customerMetricIntake?.cohort_key ?? null,
    metric_id: input.customerMetricIntake?.metric_id ?? null,
    source_ref: sourceRef,
    decision,
    input_gaps: inputGaps,
    operator_source: operatorSource,
    selected_metric_context: ready
      ? selectedMetricContextFrom(input.customerMetricIntake, operatorSource)
      : null,
    metric_movement_context: ready
      ? metricMovementContextFrom(input.customerMetricIntake, operatorSource)
      : null,
    layer_3_metric_context: ready
      ? layer3MetricContextFrom(input.customerMetricIntake, operatorSource)
      : null,
    source_package_reference: ready
      ? {
          source_package_type: "layer_3_business_system_of_record_outcome_export",
          source_refs: {
            aggregate_outcome_export_id: sourceRef
          }
        }
      : null,
    feeds: ready ? readyFeeds() : falseFeeds(),
    allowed_uses: [...SAFE_ALLOWED_USES],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    boundary_policy: boundaryPolicy(),
    required_caveats: [
      "Customer Metric Operator Source Handoff accepts validated Customer Metric Intake only.",
      "The handoff prepares an Operator Intake customer metric source and context fragments; it cannot feed Measurement Cell directly.",
      "Customer metric movement is customer-owned aggregate outcome context only, not ROI, causality, productivity, financial attribution, confidence percentage, probability, or customer-facing financial output."
    ],
    generated_at: input.generatedAt ?? new Date(0).toISOString(),
    derivation_version: DERIVATION_VERSION
  };

  if (ready) {
    const unsafeGaps = [
      ...[...collectForbiddenFields(handoff)].sort().map((field) =>
        `Forbidden field detected: ${field}`
      ),
      ...[...collectForbiddenValues(handoff)].sort().map((field) =>
        `Unsafe identifier value detected: ${field}`
      )
    ];
    if (unsafeGaps.length > 0) {
      return {
        ...handoff,
        decision: "BLOCKED",
        input_gaps: [...inputGaps, ...unsafeGaps],
        operator_source: null,
        selected_metric_context: null,
        metric_movement_context: null,
        layer_3_metric_context: null,
        source_package_reference: null,
        feeds: falseFeeds()
      };
    }
  }

  return handoff;
}

function recomputeFeeds(
  handoff: any,
  valid: boolean
): CustomerMetricOperatorSourceHandoffValidationResult["feeds"] {
  if (!valid || handoff?.decision !== "READY_FOR_OPERATOR_INTAKE") return falseFeeds();
  return readyFeeds();
}

function sameJson(left: any, right: any): boolean {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function collectReadySourceGaps(handoff: any): string[] {
  const gaps: string[] = [];
  for (const field of [
    "org_id",
    "client_id",
    "measurement_plan_id",
    "workflow_family",
    "function_area",
    "cohort_key",
    "metric_id",
    "source_ref",
    "operator_source",
    "selected_metric_context",
    "metric_movement_context",
    "layer_3_metric_context",
    "source_package_reference"
  ]) {
    requireField(handoff?.[field], field, gaps);
  }
  if (handoff?.operator_source?.state !== "present") {
    gaps.push("operator_source.state must be present");
  }
  if (![
    "manual_customer_metric_entry",
    "customer_metric_aggregate_export"
  ].includes(String(handoff?.operator_source?.intake_mode))) {
    gaps.push("operator_source.intake_mode must be a supported customer metric intake mode");
  }
  if (handoff?.operator_source?.source_ref !== handoff?.source_ref) {
    gaps.push("operator_source.source_ref must match handoff source_ref");
  }
  if (!handoff?.operator_source?.owner_role) {
    gaps.push("operator_source.owner_role is required");
  }
  if (!handoff?.operator_source?.metric_owner_role) {
    gaps.push("operator_source.metric_owner_role is required");
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
  if (handoff?.operator_source?.metric_id !== handoff?.metric_id) {
    gaps.push("operator_source.metric_id must match handoff metric_id");
  }
  for (const key of [
    "org_id",
    "client_id",
    "workflow_family",
    "function_area",
    "cohort_key",
    "metric_id",
    "source_ref"
  ]) {
    if (!sameJson(handoff?.[key], handoff?.operator_source?.[key])) {
      gaps.push(`${key} must match operator_source.${key}`);
    }
  }
  if (
    !sameJson(
      handoff?.measurement_plan_id,
      handoff?.selected_metric_context?.measurement_plan_id
    )
  ) {
    gaps.push("measurement_plan_id must match selected_metric_context.measurement_plan_id");
  }
  for (const contextKey of [
    "selected_metric_context",
    "metric_movement_context",
    "layer_3_metric_context"
  ]) {
    if (handoff?.[contextKey]?.source_ref !== handoff?.source_ref) {
      gaps.push(`${contextKey}.source_ref must match handoff source_ref`);
    }
    for (const key of [
      "org_id",
      "client_id",
      "workflow_family",
      "function_area",
      "cohort_key",
      "baseline_window",
      "comparison_window",
      "metric_id",
      "owner_approval_state",
      "freshness_state"
    ]) {
      if (!sameJson(handoff?.[contextKey]?.[key], handoff?.operator_source?.[key])) {
        gaps.push(`${contextKey}.${key} must match operator_source.${key}`);
      }
    }
    if (
      handoff?.[contextKey]?.source_review_state !==
      handoff?.operator_source?.review_state
    ) {
      gaps.push(`${contextKey}.source_review_state must match operator_source.review_state`);
    }
    if (handoff?.[contextKey]?.evidence_state !== "present") {
      gaps.push(`${contextKey}.evidence_state must be present`);
    }
  }
  for (const field of [
    "metric_name",
    "metric_unit",
    "metric_direction",
    "normalization_denominator",
    "baseline_value",
    "comparison_value",
    "source_ref",
    "suppression_state"
  ]) {
    requireField(
      handoff?.selected_metric_context?.[field],
      `selected_metric_context.${field}`,
      gaps
    );
  }
  if (handoff?.selected_metric_context?.suppression_state !== "CLEAR") {
    gaps.push("selected_metric_context.suppression_state must be CLEAR");
  }
  for (const field of [
    "baseline_value",
    "comparison_value",
    "metric_direction",
    "absolute_delta",
    "movement_direction",
    "interpretation",
    "source_ref"
  ]) {
    requireField(
      handoff?.metric_movement_context?.[field],
      `metric_movement_context.${field}`,
      gaps
    );
  }
  if (
    handoff?.metric_movement_context?.interpretation !==
    "descriptive_movement_only"
  ) {
    gaps.push("metric_movement_context.interpretation must be descriptive_movement_only");
  }
  if (
    finiteNumber(handoff?.metric_movement_context?.baseline_value) &&
    finiteNumber(handoff?.metric_movement_context?.comparison_value)
  ) {
    const expectedDelta =
      handoff.metric_movement_context.comparison_value -
      handoff.metric_movement_context.baseline_value;
    if (handoff?.metric_movement_context?.absolute_delta !== expectedDelta) {
      gaps.push("metric_movement_context.absolute_delta must match comparison minus baseline");
    }
    const expectedDirection = expectedMovementDirection(
      String(handoff?.metric_movement_context?.metric_direction),
      handoff.metric_movement_context.baseline_value,
      handoff.metric_movement_context.comparison_value
    );
    if (handoff?.metric_movement_context?.movement_direction !== expectedDirection) {
      gaps.push("metric_movement_context.movement_direction must match metric direction and values");
    }
  }
  for (const field of [
    "summary_type",
    "aggregate_metric_name",
    "source_ref",
    "owner_approval_state",
    "review_state",
    "freshness_state"
  ]) {
    requireField(
      handoff?.layer_3_metric_context?.[field],
      `layer_3_metric_context.${field}`,
      gaps
    );
  }
  if (handoff?.layer_3_metric_context?.aggregate_value_present !== true) {
    gaps.push("layer_3_metric_context.aggregate_value_present must be true");
  }
  if (
    handoff?.source_package_reference?.source_package_type !==
    "layer_3_business_system_of_record_outcome_export"
  ) {
    gaps.push("source_package_reference.source_package_type must be layer_3_business_system_of_record_outcome_export");
  }
  if (
    handoff?.source_package_reference?.source_refs?.aggregate_outcome_export_id !==
    handoff?.source_ref
  ) {
    gaps.push("source_package_reference.source_refs.aggregate_outcome_export_id must match handoff source_ref");
  }
  if (handoff?.source_package_ref !== undefined) {
    gaps.push("source_package_ref is not supported; use source_package_reference");
  }
  return gaps;
}

export function validateCustomerMetricOperatorSourceHandoff(
  handoff: any
): CustomerMetricOperatorSourceHandoffValidationResult {
  const gaps: string[] = [];
  for (const field of [
    "schema_version",
    "handoff_id",
    "source_posture",
    "customer_metric_intake_id",
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
    handoff.schema_version !== AI_VALUE_CUSTOMER_METRIC_OPERATOR_SOURCE_HANDOFF_SCHEMA_VERSION
  ) {
    gaps.push(`schema_version is invalid: ${handoff.schema_version}`);
  }
  if (handoff?.source_posture !== "validated_customer_metric_intake") {
    gaps.push("source_posture must be validated_customer_metric_intake");
  }
  if (handoff?.decision && !ALLOWED_DECISIONS.has(String(handoff.decision))) {
    gaps.push(`decision is invalid: ${handoff.decision}`);
  }
  for (const field of Object.keys(handoff ?? {})) {
    if (!ALLOWED_TOP_LEVEL_FIELDS.has(field)) {
      gaps.push(`Unsupported customer metric operator source handoff field: ${field}`);
    }
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
      "selected_metric_context",
      "metric_movement_context",
      "layer_3_metric_context",
      "source_package_reference"
    ]) {
      if (handoff?.[field] !== null && handoff?.[field] !== undefined) {
        gaps.push(`held or blocked handoff must not carry ${field}`);
      }
    }
    if (handoff?.feeds?.operator_intake_source !== false) {
      gaps.push("held or blocked handoff cannot feed operator_intake_source");
    }
    if (handoff?.feeds?.data_spine_customer_metric_source !== false) {
      gaps.push("held or blocked handoff cannot feed data_spine_customer_metric_source");
    }
    if (handoff?.feeds?.measurement_cell_selected_metric_context_fragment !== false) {
      gaps.push("held or blocked handoff cannot feed measurement_cell_selected_metric_context_fragment");
    }
    if (handoff?.feeds?.metric_movement_context_fragment !== false) {
      gaps.push("held or blocked handoff cannot feed metric_movement_context_fragment");
    }
    if (handoff?.feeds?.layer_3_metric_context_fragment !== false) {
      gaps.push("held or blocked handoff cannot feed layer_3_metric_context_fragment");
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
  for (const field of Object.keys(handoff?.feeds ?? {})) {
    if (!ALLOWED_FEED_FIELDS.has(field)) {
      gaps.push(`feeds.${field} is not supported`);
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
  for (const field of Object.keys(handoff?.boundary_policy ?? {})) {
    if (!REQUIRED_FALSE_BOUNDARY_FIELDS.includes(field)) {
      gaps.push(`boundary_policy.${field} is not supported`);
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
