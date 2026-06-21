/**
 * AI Value Engine - Customer Metric Intake.
 *
 * Contract-only normalizer for customer-owned aggregate metric evidence. It
 * prepares a Data Spine customer metric source and Measurement Cell selected
 * metric input from approved manual aggregate entries or aggregate export
 * metadata. It does not parse raw files, run connectors, persist objects,
 * create routes/UI, or emit ROI, causality, productivity, financial
 * attribution, confidence, or probability.
 */

import {
  validateMeasurementPlan,
  type MeasurementPlanValidationResult
} from "./measurementPlan";

export const AI_VALUE_CUSTOMER_METRIC_INTAKE_SCHEMA_VERSION =
  "FT_AI_VALUE_CUSTOMER_METRIC_INTAKE_2026_06";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_CUSTOMER_METRIC_INTAKE_VALIDATION_2026_06";

const DERIVATION_VERSION = "ai_value_customer_metric_intake_2026_06";

const ALLOWED_DECISIONS = new Set([
  "READY_FOR_DATA_SPINE_AND_MEASUREMENT_CELL",
  "HELD_FOR_METRIC_EVIDENCE",
  "BLOCKED"
]);

const ALLOWED_INTAKE_MODES = new Set([
  "manual_customer_metric_entry",
  "customer_metric_aggregate_export"
]);

const ALLOWED_METRIC_DIRECTIONS = new Set([
  "increase",
  "decrease",
  "maintain",
  "monitor"
]);

const ALLOWED_OWNER_APPROVAL_STATES = new Set([
  "missing",
  "submitted",
  "approved",
  "rejected",
  "held"
]);

const ALLOWED_REVIEW_STATES = new Set([
  "clear",
  "needs_review",
  "held",
  "blocked"
]);

const ALLOWED_FRESHNESS_STATES = new Set([
  "current",
  "stale",
  "unknown"
]);

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
  "confidence_percentage",
  "probability_output"
];

const REQUIRED_FALSE_BOUNDARY_FIELDS = [
  "persisted",
  "creates_migrations",
  "creates_prisma_schema",
  "creates_backend_routes",
  "creates_frontend_ui",
  "creates_ingestion_jobs",
  "stores_raw_source_data",
  "parses_uploaded_documents",
  "runs_customer_connectors",
  "runs_bigquery",
  "emits_roi",
  "emits_financial_attribution",
  "emits_confidence_percentage",
  "emits_probability",
  "customer_facing_financial_output",
  "finance_context_investigation_planning"
];

const ALLOWED_TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "customer_metric_intake_id",
  "org_id",
  "client_id",
  "measurement_plan_id",
  "workflow_family",
  "function_area",
  "cohort_key",
  "metric_id",
  "intake_mode",
  "decision",
  "measurement_plan",
  "measurement_plan_validation_result",
  "baseline_window",
  "comparison_window",
  "source_ref",
  "metric_evidence",
  "metric_movement",
  "data_spine_source",
  "measurement_cell_selected_metric",
  "layer_3_metric_context",
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
  /^probability$/i,
  /contribution_probability/i,
  /contribution_likelihood/i,
  /ai_contribution_confidence/i,
  /^roi$/i,
  /roi_value/i,
  /realized_roi/i,
  /^ebita$/i,
  /^ebitda$/i,
  /ebitda_impact/i,
  /financial_attribution/i,
  /causal_effect/i,
  /causality/i,
  /productivity_lift/i,
  /formula_template/i,
  /^weights$/i,
  /^threshold$/i,
  /^backend_routes?$/i,
  /^creates_(?:migrations|prisma_schema|backend_routes?|frontend_ui|ingestion_jobs)$/i,
  /^frontend_ui$/i,
  /^persistence_table$/i,
  /^schema_ref$/i
];

const GOVERNED_KEY_ALLOWLIST = new Set([
  "blocked_uses",
  "boundary_policy"
]);

const FALSE_BOUNDARY_CONTAINERS = new Set([
  "boundary_policy",
  "privacy_boundary",
  "feeds"
]);

export interface BuildCustomerMetricIntakeInput {
  measurementPlan: any;
  orgId: string;
  clientId: string;
  workflowFamily: string;
  functionArea: string;
  cohortKey: string;
  intakeMode: string;
  metric: Record<string, any>;
  baselineWindow: any;
  comparisonWindow: any;
  baselineValue: number;
  comparisonValue: number;
  sourceRef: string;
  sourceOwnerRole: string;
  metricOwnerRole: string;
  ownerApprovalState: string;
  reviewState: string;
  freshnessState: string;
  aggregateOnly: boolean;
  generatedAt?: string;
  [key: string]: any;
}

export interface CustomerMetricIntakeValidationResult {
  schema_version: string;
  customer_metric_intake_id: string | null;
  org_id: string | null;
  client_id: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    data_spine_customer_metric_source: boolean;
    measurement_cell_selected_metric: boolean;
    layer_3_business_system_outcomes: boolean;
    finance_context_investigation_planning: false;
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

function sameWindow(left: any, right: any): boolean {
  return left?.window_start === right?.window_start &&
    left?.window_end === right?.window_end;
}

function baselineWindowOf(plan: any): any {
  return {
    window_start: plan?.windows?.baseline_window_start,
    window_end: plan?.windows?.baseline_window_end
  };
}

function comparisonWindowOf(plan: any): any {
  return {
    window_start: plan?.windows?.comparison_window_start,
    window_end: plan?.windows?.comparison_window_end
  };
}

function feeds(ready: boolean): CustomerMetricIntakeValidationResult["feeds"] {
  return {
    data_spine_customer_metric_source: ready,
    measurement_cell_selected_metric: ready,
    layer_3_business_system_outcomes: ready,
    finance_context_investigation_planning: false,
    customer_facing_financial_output: false
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
    const inFalseBoundaryContainer = currentPath.some((part) =>
      FALSE_BOUNDARY_CONTAINERS.has(normalizeKey(part))
    );
    const isFalseBoundaryFlag = nested === false && inFalseBoundaryContainer;
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

function collectUnsafeInputGaps(input: any): string[] {
  return [...collectForbiddenFields(input)].sort().map((field) =>
    `Forbidden customer metric input field detected: ${field}`
  );
}

function collectBindingGaps(run: any): string[] {
  const gaps: string[] = [];
  const plan = run?.measurement_plan;
  if (!plan) {
    gaps.push("measurement_plan is required");
    return gaps;
  }
  const metric = run?.metric_evidence ?? {};
  const planMetricId = plan?.metric_selection?.primary_metric?.metric_id;
  if (run?.org_id !== plan?.org_id) {
    gaps.push("org_id must match Measurement Plan org_id");
  }
  if (run?.workflow_family !== plan?.workflow_scope?.workflow_family) {
    gaps.push("workflowFamily must match Measurement Plan workflow_family");
  }
  if (run?.function_area !== plan?.workflow_scope?.function_area) {
    gaps.push("functionArea must match Measurement Plan function_area");
  }
  if (metric.metric_id !== planMetricId) {
    gaps.push("metric.metric_id must match Measurement Plan primary metric_id");
  }
  if (!sameWindow(run?.baseline_window, baselineWindowOf(plan))) {
    gaps.push("baselineWindow must match Measurement Plan baseline window");
  }
  if (!sameWindow(run?.comparison_window, comparisonWindowOf(plan))) {
    gaps.push("comparisonWindow must match Measurement Plan comparison window");
  }
  return gaps;
}

function collectEvidenceHoldGaps(run: any): string[] {
  const gaps: string[] = [];
  const metric = run?.metric_evidence ?? {};
  if (!run?.source_ref) gaps.push("source_ref is required");
  if (!run?.client_id) gaps.push("client_id is required");
  if (!run?.cohort_key) gaps.push("cohort_key is required");
  if (!ALLOWED_INTAKE_MODES.has(String(run?.intake_mode))) {
    gaps.push(`intake_mode is invalid: ${run?.intake_mode}`);
  }
  if (!metric.metric_id) gaps.push("metric.metric_id is required");
  if (!metric.metric_name) gaps.push("metric.metric_name is required");
  if (!metric.metric_unit) gaps.push("metric.metric_unit is required");
  if (!ALLOWED_METRIC_DIRECTIONS.has(String(metric.metric_direction))) {
    gaps.push(`metric.metric_direction is invalid: ${metric.metric_direction}`);
  }
  if (!metric.normalization_denominator && !metric.metric_definition_ref) {
    gaps.push("metric normalization_denominator or metric_definition_ref is required");
  }
  if (!finiteNumber(metric.baseline_value)) {
    gaps.push("baseline_value must be a finite number");
  }
  if (!finiteNumber(metric.comparison_value)) {
    gaps.push("comparison_value must be a finite number");
  }
  if (!run?.metric_evidence?.source_owner_role) {
    gaps.push("source_owner_role is required");
  }
  if (!run?.metric_evidence?.metric_owner_role) {
    gaps.push("metric_owner_role is required");
  }
  if (!ALLOWED_OWNER_APPROVAL_STATES.has(String(run?.metric_evidence?.owner_approval_state))) {
    gaps.push(`owner_approval_state is invalid: ${run?.metric_evidence?.owner_approval_state}`);
  }
  if (!ALLOWED_REVIEW_STATES.has(String(run?.metric_evidence?.review_state))) {
    gaps.push(`review_state is invalid: ${run?.metric_evidence?.review_state}`);
  }
  if (!ALLOWED_FRESHNESS_STATES.has(String(run?.metric_evidence?.freshness_state))) {
    gaps.push(`freshness_state is invalid: ${run?.metric_evidence?.freshness_state}`);
  }
  if (run?.metric_evidence?.owner_approval_state !== "approved") {
    gaps.push("owner_approval_state must be approved before downstream use");
  }
  if (run?.metric_evidence?.review_state !== "clear") {
    gaps.push("review_state must be clear before downstream use");
  }
  if (run?.metric_evidence?.freshness_state !== "current") {
    gaps.push("freshness_state must be current before downstream use");
  }
  return gaps;
}

function collectPolicyGaps(run: any): string[] {
  const gaps: string[] = [];
  for (const use of REQUIRED_BLOCKED_USES) {
    if (!stringsOf(run?.blocked_uses).includes(use)) {
      gaps.push(`blocked_uses missing ${use}`);
    }
  }
  for (const field of REQUIRED_FALSE_BOUNDARY_FIELDS) {
    if (run?.boundary_policy?.[field] !== false) {
      gaps.push(`boundary_policy.${field} must be false`);
    }
  }
  if (run?.feeds?.finance_context_investigation_planning !== false) {
    gaps.push("feeds.finance_context_investigation_planning must be false");
  }
  if (run?.feeds?.customer_facing_financial_output !== false) {
    gaps.push("feeds.customer_facing_financial_output must be false");
  }
  for (const field of [...collectForbiddenFields(run)].sort()) {
    gaps.push(`Forbidden field detected: ${field}`);
  }
  return gaps;
}

function movementDirection(direction: string, baseline: number, comparison: number): string {
  if (!finiteNumber(baseline) || !finiteNumber(comparison)) return "unknown";
  if (comparison === baseline) return "maintained";
  if (direction === "decrease") return comparison < baseline ? "improved" : "worsened";
  if (direction === "increase") return comparison > baseline ? "improved" : "worsened";
  if (direction === "maintain") return comparison === baseline ? "improved" : "needs_review";
  return "observed";
}

function buildMetricEvidence(input: BuildCustomerMetricIntakeInput): any {
  return {
    metric_id: input.metric?.metric_id ?? null,
    metric_name: input.metric?.metric_name ?? null,
    metric_category: input.metric?.metric_category ?? null,
    metric_unit: input.metric?.metric_unit ?? null,
    metric_direction: input.metric?.metric_direction ?? null,
    metric_sensitivity: input.metric?.metric_sensitivity ?? null,
    source_system_type: input.metric?.source_system_type ?? null,
    source_system_name: input.metric?.source_system_name ?? null,
    normalization_denominator: input.metric?.normalization_denominator ?? null,
    metric_definition_ref: input.metric?.metric_definition_ref ?? null,
    baseline_value: input.baselineValue,
    comparison_value: input.comparisonValue,
    source_ref: input.sourceRef ?? null,
    source_owner_role: input.sourceOwnerRole ?? null,
    metric_owner_role: input.metricOwnerRole ?? null,
    owner_approval_state: normalizeKey(String(input.ownerApprovalState ?? "missing")),
    review_state: normalizeKey(String(input.reviewState ?? "needs_review")),
    freshness_state: normalizeKey(String(input.freshnessState ?? "unknown")),
    aggregate_only: input.aggregateOnly === true
  };
}

function topLevelGaps(run: any): string[] {
  const gaps: string[] = [];
  if (!run || typeof run !== "object" || Array.isArray(run)) {
    return ["customer metric intake must be an object"];
  }
  for (const field of [
    "schema_version",
    "customer_metric_intake_id",
    "org_id",
    "client_id",
    "measurement_plan_id",
    "workflow_family",
    "function_area",
    "cohort_key",
    "metric_id",
    "intake_mode",
    "decision",
    "measurement_plan",
    "measurement_plan_validation_result",
    "baseline_window",
    "comparison_window",
    "source_ref",
    "metric_evidence",
    "metric_movement",
    "data_spine_source",
    "layer_3_metric_context",
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
    if (run?.[field] === undefined || run?.[field] === "") {
      gaps.push(`${field} is missing`);
    }
  }
  if (
    run?.schema_version &&
    run.schema_version !== AI_VALUE_CUSTOMER_METRIC_INTAKE_SCHEMA_VERSION
  ) {
    gaps.push(`schema_version is invalid: ${run.schema_version}`);
  }
  if (run?.decision && !ALLOWED_DECISIONS.has(String(run.decision))) {
    gaps.push(`decision is invalid: ${run.decision}`);
  }
  for (const field of Object.keys(run ?? {})) {
    if (!ALLOWED_TOP_LEVEL_FIELDS.has(field)) {
      gaps.push(`Unsupported customer metric intake field: ${field}`);
    }
  }
  return gaps;
}

function feedState(run: any, valid: boolean): CustomerMetricIntakeValidationResult["feeds"] {
  if (!valid) return feeds(false);
  return run?.feeds ?? feeds(false);
}

export function buildCustomerMetricIntake(input: BuildCustomerMetricIntakeInput): any {
  const measurementPlan = input.measurementPlan;
  const planValidation = validateMeasurementPlan(measurementPlan);
  const metricEvidence = buildMetricEvidence(input);
  const sourceRef = input.sourceRef ?? null;
  const unsafeInputGaps = collectUnsafeInputGaps(input);
  const preRun = {
    measurement_plan: measurementPlan,
    org_id: input.orgId,
    workflow_family: input.workflowFamily,
    function_area: input.functionArea,
    baseline_window: input.baselineWindow,
    comparison_window: input.comparisonWindow,
    metric_evidence: metricEvidence,
    source_ref: sourceRef,
    client_id: input.clientId,
    cohort_key: input.cohortKey,
    intake_mode: input.intakeMode
  };
  const bindingGaps = collectBindingGaps(preRun);
  const holdGaps = collectEvidenceHoldGaps(preRun);
  const blockedGaps = [
    ...planValidation.gaps.map((gap) => `measurement_plan: ${gap}`),
    ...bindingGaps,
    ...unsafeInputGaps,
    ...(metricEvidence.aggregate_only === true ? [] : ["aggregate_only must be true"])
  ];
  const ready = blockedGaps.length === 0 && holdGaps.length === 0;
  const decision = blockedGaps.length > 0
    ? "BLOCKED"
    : ready
      ? "READY_FOR_DATA_SPINE_AND_MEASUREMENT_CELL"
      : "HELD_FOR_METRIC_EVIDENCE";
  const metricMovement = {
    baseline_value: metricEvidence.baseline_value,
    comparison_value: metricEvidence.comparison_value,
    metric_direction: metricEvidence.metric_direction,
    absolute_delta: finiteNumber(metricEvidence.baseline_value) &&
      finiteNumber(metricEvidence.comparison_value)
      ? metricEvidence.comparison_value - metricEvidence.baseline_value
      : null,
    movement_direction: movementDirection(
      String(metricEvidence.metric_direction),
      metricEvidence.baseline_value,
      metricEvidence.comparison_value
    )
  };
  const dataSpineSource = {
    state: ready ? "present" : "held",
    intake_mode: input.intakeMode,
    source_ref: sourceRef,
    org_id: input.orgId,
    client_id: input.clientId,
    workflow_family: input.workflowFamily,
    function_area: input.functionArea,
    cohort_key: input.cohortKey,
    baseline_window: input.baselineWindow,
    comparison_window: input.comparisonWindow,
    owner_approval_state: metricEvidence.owner_approval_state,
    review_state: ready ? "clear" : "held",
    aggregate_only: metricEvidence.aggregate_only,
    metric_id: metricEvidence.metric_id,
    connector_status: null,
    aligned: bindingGaps.length === 0
  };
  const selectedMetric = ready
    ? {
        metric_id: metricEvidence.metric_id,
        metric_name: metricEvidence.metric_name,
        metric_source_system: metricEvidence.source_system_name,
        metric_unit: metricEvidence.metric_unit,
        metric_direction: metricEvidence.metric_direction,
        metric_sensitivity: metricEvidence.metric_sensitivity,
        expected_lag_days: null,
        normalization_denominator: metricEvidence.normalization_denominator ??
          metricEvidence.metric_definition_ref,
        baseline_value: metricEvidence.baseline_value,
        comparison_value: metricEvidence.comparison_value,
        owner_approval_state: metricEvidence.owner_approval_state,
        source_ref: sourceRef,
        suppression_state: "CLEAR"
      }
    : null;

  return {
    schema_version: AI_VALUE_CUSTOMER_METRIC_INTAKE_SCHEMA_VERSION,
    customer_metric_intake_id:
      `customer_metric_intake_${safeIdPart(String(input.orgId ?? "unknown_org"))}_${safeIdPart(String(metricEvidence.metric_id ?? "unknown_metric"))}_${safeIdPart(String(input.comparisonWindow?.window_end ?? "unknown_window"))}`,
    org_id: input.orgId ?? null,
    client_id: input.clientId ?? null,
    measurement_plan_id: measurementPlan?.measurement_plan_id ?? null,
    workflow_family: input.workflowFamily ?? null,
    function_area: input.functionArea ?? null,
    cohort_key: input.cohortKey ?? null,
    metric_id: metricEvidence.metric_id,
    intake_mode: input.intakeMode ?? null,
    decision,
    measurement_plan: measurementPlan,
    measurement_plan_validation_result: planValidation,
    baseline_window: input.baselineWindow,
    comparison_window: input.comparisonWindow,
    source_ref: sourceRef,
    metric_evidence: metricEvidence,
    metric_movement: metricMovement,
    data_spine_source: dataSpineSource,
    measurement_cell_selected_metric: selectedMetric,
    layer_3_metric_context: {
      summary_type: "customer_owned_aggregate_metric_summary",
      aggregate_metric_name: metricEvidence.metric_id,
      aggregate_value_present: ready,
      source_ref: sourceRef,
      owner_approval_state: metricEvidence.owner_approval_state,
      review_state: dataSpineSource.review_state,
      freshness_state: metricEvidence.freshness_state
    },
    gaps: decision === "BLOCKED" ? blockedGaps : [],
    missing_evidence: decision === "HELD_FOR_METRIC_EVIDENCE" ? holdGaps : [],
    feeds: feeds(ready),
    allowed_uses: [
      "customer_metric_evidence_review",
      "data_spine_customer_metric_source_preparation",
      "measurement_cell_selected_metric_preparation",
      "layer_3_business_system_outcome_context"
    ],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    boundary_policy: Object.fromEntries(
      REQUIRED_FALSE_BOUNDARY_FIELDS.map((field) => [field, false])
    ),
    required_caveats: [
      "Customer Metric Intake accepts aggregate customer-owned metric evidence only.",
      "Ready output can prepare Data Spine customer metric source context and Measurement Cell selected metric input, but it is not ROI proof, causality, productivity measurement, financial attribution, a confidence percentage, or customer-facing financial output.",
      "Stale, unapproved, incomplete, raw, person-level, misaligned, or unsafe metric evidence cannot feed downstream readiness."
    ],
    generated_at: input.generatedAt ?? new Date(0).toISOString(),
    derivation_version: DERIVATION_VERSION
  };
}

export function validateCustomerMetricIntake(
  run: any
): CustomerMetricIntakeValidationResult {
  const planValidation: MeasurementPlanValidationResult | null = run?.measurement_plan
    ? validateMeasurementPlan(run.measurement_plan)
    : null;
  const bindingGaps = collectBindingGaps(run);
  const holdGaps = collectEvidenceHoldGaps(run);
  const policyGaps = collectPolicyGaps(run);
  const blockedDecision = run?.decision === "BLOCKED";
  const readyDecision = run?.decision === "READY_FOR_DATA_SPINE_AND_MEASUREMENT_CELL";
  const heldDecision = run?.decision === "HELD_FOR_METRIC_EVIDENCE";
  const readyEligible = planValidation?.valid === true &&
    bindingGaps.length === 0 &&
    holdGaps.length === 0 &&
    policyGaps.length === 0;
  const gaps = [
    ...topLevelGaps(run),
    ...policyGaps,
    ...bindingGaps,
    ...(planValidation && JSON.stringify(run?.measurement_plan_validation_result) !== JSON.stringify(planValidation)
      ? ["measurement_plan_validation_result must match recomputed Measurement Plan validation"]
      : []),
    ...(blockedDecision ? stringsOf(run?.gaps) : []),
    ...(blockedDecision ? ["blocked customer metric intakes cannot validate"] : []),
    ...(readyDecision && !readyEligible
      ? ["READY_FOR_DATA_SPINE_AND_MEASUREMENT_CELL requires valid approved metric evidence"]
      : []),
    ...(readyDecision && run?.feeds?.data_spine_customer_metric_source !== true
      ? ["feeds.data_spine_customer_metric_source must be true when ready"]
      : []),
    ...(readyDecision && run?.feeds?.measurement_cell_selected_metric !== true
      ? ["feeds.measurement_cell_selected_metric must be true when ready"]
      : []),
    ...(readyDecision && run?.feeds?.layer_3_business_system_outcomes !== true
      ? ["feeds.layer_3_business_system_outcomes must be true when ready"]
      : []),
    ...(heldDecision && (
      run?.feeds?.data_spine_customer_metric_source !== false ||
      run?.feeds?.measurement_cell_selected_metric !== false ||
      run?.feeds?.layer_3_business_system_outcomes !== false
    )
      ? ["held metric intakes must not expose downstream feeds"]
      : [])
  ];
  const valid = gaps.length === 0;
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    customer_metric_intake_id: run?.customer_metric_intake_id ?? null,
    org_id: run?.org_id ?? null,
    client_id: run?.client_id ?? null,
    valid,
    gaps,
    feeds: feedState(run, valid)
  };
}
