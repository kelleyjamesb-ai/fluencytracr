/**
 * AI Value Engine - Operator Workflow.
 *
 * Internal operator-facing workflow summary for the governed evidence spine.
 * It composes existing operator intake, time-series, Measurement Cell, source
 * review, and Value Hypothesis packet status into one next-action object. It
 * does not create UI, routes, persistence, schemas, connectors, confidence
 * models, probabilities, ROI proof, causality claims, productivity claims,
 * financial attribution, or customer-facing financial output.
 */

import {
  validateOperatorIntakeAdapterRun,
  type OperatorIntakeAdapterRunValidationResult
} from "./operatorIntakeAdapter";
import {
  validateOperatorTimeSeriesRun,
  type OperatorTimeSeriesRunValidationResult
} from "./operatorTimeSeriesRun";
import {
  validateMeasurementCellAssemblyRun,
  type MeasurementCellAssemblyRunValidationResult
} from "./measurementCellAssemblyRunner";
import {
  validateValueHypothesisReadinessPacket,
  type ValueHypothesisReadinessPacketValidationResult
} from "./valueHypothesisReadinessPacketRunner";

export const AI_VALUE_OPERATOR_WORKFLOW_SCHEMA_VERSION =
  "FT_AI_VALUE_OPERATOR_WORKFLOW_2026_06";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_OPERATOR_WORKFLOW_VALIDATION_2026_06";

const DERIVATION_VERSION = "ai_value_operator_workflow_2026_06";

const READY_STATE = "READY_FOR_INTERNAL_PACKET_REVIEW";

const ALLOWED_WORKFLOW_STATES = new Set([
  READY_STATE,
  "HELD_FOR_SOURCE_REVIEW",
  "HELD_FOR_MEASUREMENT_CELL",
  "HELD_FOR_TIME_SERIES",
  "HELD_FOR_PACKET_PREPARATION",
  "BLOCKED"
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
  "runs_bigquery",
  "parses_uploaded_documents",
  "stores_raw_source_data",
  "computes_confidence",
  "emits_probability",
  "computes_roi",
  "emits_financial_attribution",
  "customer_facing_financial_output"
];

const ALLOWED_TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "workflow_id",
  "org_id",
  "client_id",
  "workflow_family",
  "function_area",
  "cohort_key",
  "workflow_state",
  "source_review_status",
  "operator_intake_status",
  "measurement_cell_status",
  "time_series_status",
  "packet_preparation_status",
  "missing_evidence",
  "blocked_reasons",
  "recommended_next_actions",
  "review_queue",
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
  /^confidence_score$/i,
  /^confidence$/i,
  /^probability$/i,
  /^probability_score$/i,
  /probability_output/i,
  /contribution_probability/i,
  /contribution_likelihood/i,
  /^p_value$/i,
  /^roi_bot_assumptions?$/i,
  /^roi_sheet_assumptions?$/i,
  /^roi$/i,
  /realized_roi/i,
  /roi_(?:value|amount|calculation|result|impact)/i,
  /^ebita$/i,
  /^ebitda$/i,
  /ebitda_(?:value|amount|impact|calculation|result)/i,
  /financial_impact/i,
  /financial_attribution/i,
  /^financial_output$/i,
  /^customer_facing_financial_output$/i,
  /customer_facing_(?:financial|economic)_output_allowed/i,
  /financial_output_allowed/i,
  /causality_claim/i,
  /causal_proof/i,
  /productivity_claim/i,
  /productivity_lift/i,
  /^persisted$/i,
  /^creates_(?:migrations|prisma_schema|backend_routes?|frontend_ui|ingestion_jobs)$/i,
  /^backend_routes?$/i,
  /^backend_route$/i,
  /^frontend_ui$/i,
  /^persistence_table$/i,
  /^schema_ref$/i,
  /operator_override/i,
  /force_ready/i,
  /threshold/i,
  /new_suppression_reason/i,
  /new_canonical_event/i
];

const GOVERNED_KEY_ALLOWLIST = new Set([
  "blocked_uses",
  "boundary_policy",
  "feeds"
]);

const FALSE_BOUNDARY_CONTAINERS = new Set([
  "boundary_policy",
  "feeds",
  "persistence_policy",
  "privacy_boundary",
  "value_proof_policy"
]);

const UNSAFE_USE_VALUE_PATTERNS = [
  /^confidence_model_execution$/i,
  /^finance_context_investigation$/i,
  /^prepare_finance_context_investigation_packet$/i,
  /^customer_facing_financial_output$/i,
  /^customer_facing_economic_output$/i,
  /^realized_roi$/i,
  /^roi$/i,
  /^financial_attribution$/i,
  /^probability_output$/i,
  /^productivity_claim$/i,
  /^causality_claim$/i
];

const UNSAFE_CLAIM_LANGUAGE_PATTERNS = [
  /\bproved?\s+(?:roi|savings|financial impact|ebita|ebitda|productivity|causality)\b/i,
  /\b(?:roi|savings|ebita|ebitda|financial impact|productivity lift)\b.{0,48}\b(?:due to|caused by|attributed to|from ai|by ai)\b/i,
  /\b(?:90|95|99)%\s+(?:confidence|probability)\b/i,
  /\bproductivity\s+lift\b/i,
  /\battribution\s+probability\b/i
];

export interface BuildOperatorWorkflowInput {
  workflowId?: string;
  orgId: string;
  clientId: string;
  workflowFamily: string;
  functionArea: string;
  cohortKey: string;
  operatorIntakeRun?: any | null;
  operatorTimeSeriesRun?: any | null;
  valueHypothesisPacket?: any | null;
  generatedAt?: string;
}

export interface OperatorWorkflowValidationResult {
  schema_version: string;
  workflow_id: string | null;
  org_id: string | null;
  client_id: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    operator_workflow: boolean;
    value_hypothesis_packet_review: boolean;
    confidence_model: false;
    finance_context_investigation: false;
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

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function validationMatchesEmbedded(left: any, right: any): boolean {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
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
      currentPath.some((part) => FALSE_BOUNDARY_CONTAINERS.has(normalizeKey(part)));
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

function collectUnsafeStringValues(
  value: any,
  values: Set<string> = new Set(),
  path: string[] = []
): Set<string> {
  if (typeof value === "string") {
    const normalized = normalizeKey(value);
    const pathKeys = path.map(normalizeKey);
    const inBlockedOrCaveat =
      pathKeys.includes("blocked_uses") ||
      pathKeys.includes("required_caveats");
    if (
      !inBlockedOrCaveat &&
      (UNSAFE_USE_VALUE_PATTERNS.some((pattern) => pattern.test(normalized)) ||
        UNSAFE_CLAIM_LANGUAGE_PATTERNS.some((pattern) => pattern.test(value)))
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

function falseFeeds(): OperatorWorkflowValidationResult["feeds"] {
  return {
    operator_workflow: false,
    value_hypothesis_packet_review: false,
    confidence_model: false,
    finance_context_investigation: false,
    customer_facing_financial_output: false
  };
}

function feedState(workflow: any, valid: boolean): OperatorWorkflowValidationResult["feeds"] {
  if (!valid) return falseFeeds();
  return {
    operator_workflow: workflow?.feeds?.operator_workflow === true,
    value_hypothesis_packet_review:
      workflow?.feeds?.value_hypothesis_packet_review === true,
    confidence_model: false,
    finance_context_investigation: false,
    customer_facing_financial_output: false
  };
}

function baseWorkflowId(input: BuildOperatorWorkflowInput): string {
  return input.workflowId ??
    `operator_workflow_${safeIdPart(input.orgId ?? "unknown_org")}_${safeIdPart(input.workflowFamily ?? "unknown_workflow")}`;
}

function missingOperatorValidation(): OperatorIntakeAdapterRunValidationResult {
  return {
    schema_version: "missing",
    run_id: null,
    org_id: null,
    client_id: null,
    valid: false,
    gaps: ["operator intake run is missing"],
    feeds: {
      data_spine_readiness: false,
      source_package_review_queue: false,
      real_data_intake_packet_run: false,
      measurement_cell_assembly_run: false,
      value_hypothesis_packet_runner: false,
      finance_context_investigation: false,
      confidence_model: false,
      customer_facing_financial_output: false
    }
  };
}

function missingTimeSeriesValidation(): OperatorTimeSeriesRunValidationResult {
  return {
    schema_version: "missing",
    series_id: null,
    org_id: null,
    client_id: null,
    valid: false,
    gaps: ["operator time-series run is missing"],
    feeds: {
      operator_time_series_run: false,
      confidence_model: false,
      finance_context_investigation: false,
      customer_facing_financial_output: false
    }
  };
}

function packetValidation(packet: any): ValueHypothesisReadinessPacketValidationResult | null {
  return packet ? validateValueHypothesisReadinessPacket(packet) : null;
}

function assemblyValidation(operatorRun: any): MeasurementCellAssemblyRunValidationResult | null {
  return operatorRun?.measurement_cell_assembly_run
    ? validateMeasurementCellAssemblyRun(operatorRun.measurement_cell_assembly_run)
    : null;
}

function sourceReviewStatus(operatorRun: any, operatorValidation: OperatorIntakeAdapterRunValidationResult): any {
  const queue = operatorRun?.source_package_review_queue ?? null;
  const validation = operatorRun?.source_package_review_queue
    ? operatorRun.source_package_review_validation_result ?? null
    : null;
  const queueState = queue?.queue_state ?? null;
  const state = !queue
    ? "missing"
    : !operatorValidation.valid || validation?.valid === false
      ? "blocked"
      : queueState === "DATA_SPINE_REVIEW_READY"
        ? "ready"
        : "held";
  return {
    state,
    queue_state: queueState,
    source_package_review_queue_id: queue?.source_package_review_queue_id ?? null,
    validation_valid: validation?.valid ?? false
  };
}

function operatorIntakeStatus(
  operatorRun: any,
  operatorValidation: OperatorIntakeAdapterRunValidationResult
): any {
  return {
    state: !operatorRun
      ? "missing"
      : operatorValidation.valid
        ? "ready"
        : "blocked",
    run_id: operatorRun?.run_id ?? null,
    decision: operatorRun?.decision ?? "BLOCKED",
    validation_valid: operatorValidation.valid
  };
}

function measurementCellStatus(
  operatorRun: any,
  validation: MeasurementCellAssemblyRunValidationResult | null
): any {
  const assemblyRun = operatorRun?.measurement_cell_assembly_run ?? null;
  const decision = assemblyRun?.decision ?? null;
  const state = !assemblyRun
    ? "missing"
    : validation?.valid !== true
      ? "blocked"
      : decision === "READY_FOR_VALUE_HYPOTHESIS_PACKET_RUNNER"
        ? "ready"
        : "held";
  return {
    state,
    assembly_run_id: assemblyRun?.run_id ?? null,
    measurement_cell_id: assemblyRun?.measurement_cell?.measurement_cell_id ?? null,
    decision,
    validation_valid: validation?.valid ?? false,
    ready_for_packet_runner:
      validation?.valid === true &&
      decision === "READY_FOR_VALUE_HYPOTHESIS_PACKET_RUNNER"
  };
}

function timeSeriesStatus(
  series: any,
  validation: OperatorTimeSeriesRunValidationResult
): any {
  return {
    state: !series
      ? "missing"
      : validation.valid
        ? "ready"
        : "blocked",
    series_id: series?.series_id ?? null,
    decision: series?.decision ?? "BLOCKED",
    validation_valid: validation.valid,
    complete_milestone_series:
      series?.time_series_readiness?.complete_milestone_series === true,
    rolling_30_day_context_only:
      series?.time_series_readiness?.rolling_30_day_context_only === true,
    governed_run_reference_count:
      series?.time_series_readiness?.governed_run_reference_count ?? 0,
    missing_evidence: stringsOf(series?.missing_evidence)
  };
}

function packetStatus(
  packet: any,
  validation: ValueHypothesisReadinessPacketValidationResult | null
): any {
  return {
    state: !packet
      ? "missing"
      : validation?.valid
        ? "prepared"
        : "blocked",
    packet_id: packet?.packet_id ?? null,
    readiness_state: packet?.readiness_state ?? null,
    contribution_evidence_tier: packet?.contribution_evidence_tier ?? null,
    validation_valid: validation?.valid ?? false,
    current_review_label: packet?.review_flow?.current_review_label ?? null
  };
}

function bindingGaps(input: BuildOperatorWorkflowInput): string[] {
  const gaps: string[] = [];
  const expected = {
    org_id: input.orgId,
    client_id: input.clientId,
    workflow_family: input.workflowFamily,
    function_area: input.functionArea,
    cohort_key: input.cohortKey
  };
  const operatorRun = input.operatorIntakeRun;
  const series = input.operatorTimeSeriesRun;
  for (const [field, value] of Object.entries(expected)) {
    if (operatorRun && operatorRun[field] !== value) {
      gaps.push(`operator_intake_run.${field} must match workflow ${field}`);
    }
    if (series && series[field] !== value) {
      gaps.push(`operator_time_series_run.${field} must match workflow ${field}`);
    }
  }
  const packet = input.valueHypothesisPacket;
  if (packet) {
    if (packet.org_id !== input.orgId) {
      gaps.push("value_hypothesis_packet.org_id must match workflow org_id");
    }
    if (packet.workflow?.workflow_family !== input.workflowFamily) {
      gaps.push("value_hypothesis_packet.workflow.workflow_family must match workflow workflow_family");
    }
    if (packet.workflow?.function_area !== input.functionArea) {
      gaps.push("value_hypothesis_packet.workflow.function_area must match workflow function_area");
    }
  }
  return gaps;
}

function statusBlocked(
  operatorValidation: OperatorIntakeAdapterRunValidationResult,
  assembly: MeasurementCellAssemblyRunValidationResult | null,
  seriesValidation: OperatorTimeSeriesRunValidationResult,
  packetValidationResult: ValueHypothesisReadinessPacketValidationResult | null,
  packetPresent: boolean,
  drift: string[]
): boolean {
  return drift.length > 0 ||
    !operatorValidation.valid ||
    seriesValidation.valid === false ||
    assembly?.valid === false ||
    (packetPresent && packetValidationResult?.valid === false);
}

function workflowStateFromStatuses(workflow: any): string {
  if (
    workflow?.operator_intake_status?.state === "blocked" ||
    workflow?.measurement_cell_status?.state === "blocked" ||
    workflow?.time_series_status?.state === "blocked" ||
    workflow?.packet_preparation_status?.state === "blocked"
  ) {
    return "BLOCKED";
  }
  if (workflow?.source_review_status?.state !== "ready") {
    return "HELD_FOR_SOURCE_REVIEW";
  }
  if (workflow?.measurement_cell_status?.state !== "ready") {
    return "HELD_FOR_MEASUREMENT_CELL";
  }
  if (
    workflow?.time_series_status?.state !== "ready" ||
    workflow?.time_series_status?.decision !== "READY_FOR_CONFIDENCE_MODEL_DESIGN_REVIEW"
  ) {
    return "HELD_FOR_TIME_SERIES";
  }
  if (workflow?.packet_preparation_status?.state !== "prepared") {
    return "HELD_FOR_PACKET_PREPARATION";
  }
  return READY_STATE;
}

function missingEvidenceForWorkflow(workflow: any): string[] {
  const missing: string[] = [];
  if (workflow?.source_review_status?.state !== "ready") {
    missing.push("SOURCE_PACKAGE_REVIEW_REQUIRED");
  }
  if (
    workflow?.source_review_status?.state === "ready" &&
    workflow?.measurement_cell_status?.state !== "ready"
  ) {
    missing.push("MEASUREMENT_CELL_ASSEMBLY_REQUIRED");
  }
  if (workflow?.time_series_status?.state === "missing") {
    missing.push("OPERATOR_TIME_SERIES_REQUIRED");
  }
  if (
    workflow?.time_series_status?.state === "ready" &&
    workflow?.time_series_status?.decision !== "READY_FOR_CONFIDENCE_MODEL_DESIGN_REVIEW"
  ) {
    missing.push("GOVERNED_MILESTONE_TIME_SERIES_REQUIRED");
  }
  missing.push(...stringsOf(workflow?.time_series_status?.missing_evidence));
  if (workflow?.packet_preparation_status?.state === "missing") {
    missing.push("VALUE_HYPOTHESIS_PACKET_REQUIRED");
  }
  if (workflow?.packet_preparation_status?.state === "blocked") {
    missing.push("VALUE_HYPOTHESIS_PACKET_INVALID");
  }
  return uniqueStrings(missing);
}

function reviewQueueForWorkflow(workflow: any): any[] {
  return [
    {
      step: "source_package_review",
      state: workflow?.source_review_status?.state ?? "missing",
      action: workflow?.source_review_status?.state === "ready"
        ? "continue"
        : "review aggregate source packages"
    },
    {
      step: "measurement_cell",
      state: workflow?.measurement_cell_status?.state ?? "missing",
      action: workflow?.measurement_cell_status?.state === "ready"
        ? "continue"
        : "complete Measurement Cell assembly"
    },
    {
      step: "operator_time_series",
      state: workflow?.time_series_status?.decision === "READY_FOR_CONFIDENCE_MODEL_DESIGN_REVIEW"
        ? "ready"
        : "held",
      action: workflow?.time_series_status?.decision === "READY_FOR_CONFIDENCE_MODEL_DESIGN_REVIEW"
        ? "continue"
        : "complete governed milestone series"
    },
    {
      step: "value_hypothesis_packet",
      state: workflow?.packet_preparation_status?.state ?? "missing",
      action: workflow?.packet_preparation_status?.state === "prepared"
        ? "review internal packet"
        : "prepare internal Value Hypothesis packet"
    }
  ];
}

function nextActionsForState(state: string): string[] {
  switch (state) {
    case READY_STATE:
      return ["review_internal_value_hypothesis_packet", "prepare_decision_or_retest_plan"];
    case "HELD_FOR_SOURCE_REVIEW":
      return ["complete_source_package_review", "collect_missing_aggregate_evidence"];
    case "HELD_FOR_MEASUREMENT_CELL":
      return ["complete_measurement_cell_assembly", "resolve_measurement_cell_gaps"];
    case "HELD_FOR_TIME_SERIES":
      return ["complete_governed_milestone_time_series", "use_rolling_30_day_as_operating_context_only"];
    case "HELD_FOR_PACKET_PREPARATION":
      return ["prepare_internal_value_hypothesis_packet"];
    default:
      return ["hold", "resolve_blocked_operator_workflow"];
  }
}

function invalidChildReasons(
  operatorValidation: OperatorIntakeAdapterRunValidationResult,
  assembly: MeasurementCellAssemblyRunValidationResult | null,
  seriesValidation: OperatorTimeSeriesRunValidationResult,
  packetValidationResult: ValueHypothesisReadinessPacketValidationResult | null,
  packetPresent: boolean,
  drift: string[]
): string[] {
  return uniqueStrings([
    ...drift,
    ...(!operatorValidation.valid
      ? operatorValidation.gaps.map((gap) => `operator_intake_run: ${gap}`)
      : []),
    ...(assembly?.valid === false
      ? assembly.gaps.map((gap) => `measurement_cell_assembly_run: ${gap}`)
      : []),
    ...(!seriesValidation.valid
      ? seriesValidation.gaps.map((gap) => `operator_time_series_run: ${gap}`)
      : []),
    ...(packetPresent && packetValidationResult?.valid === false
      ? packetValidationResult.gaps.map((gap) => `value_hypothesis_packet: ${gap}`)
      : [])
  ]);
}

export function buildOperatorWorkflow(input: BuildOperatorWorkflowInput): any {
  const operatorValidation = input.operatorIntakeRun
    ? validateOperatorIntakeAdapterRun(input.operatorIntakeRun)
    : missingOperatorValidation();
  const assembly = assemblyValidation(input.operatorIntakeRun);
  const seriesValidation = input.operatorTimeSeriesRun
    ? validateOperatorTimeSeriesRun(input.operatorTimeSeriesRun)
    : missingTimeSeriesValidation();
  const packetValidationResult = packetValidation(input.valueHypothesisPacket);
  const drift = bindingGaps(input);

  const partial = {
    schema_version: AI_VALUE_OPERATOR_WORKFLOW_SCHEMA_VERSION,
    workflow_id: baseWorkflowId(input),
    org_id: input.orgId,
    client_id: input.clientId,
    workflow_family: input.workflowFamily,
    function_area: input.functionArea,
    cohort_key: input.cohortKey,
    source_review_status: sourceReviewStatus(input.operatorIntakeRun, operatorValidation),
    operator_intake_status: operatorIntakeStatus(input.operatorIntakeRun, operatorValidation),
    measurement_cell_status: measurementCellStatus(input.operatorIntakeRun, assembly),
    time_series_status: timeSeriesStatus(input.operatorTimeSeriesRun, seriesValidation),
    packet_preparation_status: packetStatus(input.valueHypothesisPacket, packetValidationResult)
  };
  const blocked = statusBlocked(
    operatorValidation,
    assembly,
    seriesValidation,
    packetValidationResult,
    Boolean(input.valueHypothesisPacket),
    drift
  );
  const workflowState = blocked
    ? "BLOCKED"
    : workflowStateFromStatuses(partial);
  const workflow = {
    ...partial,
    workflow_state: workflowState,
    missing_evidence: [] as string[],
    blocked_reasons: blocked
      ? invalidChildReasons(
          operatorValidation,
          assembly,
          seriesValidation,
          packetValidationResult,
          Boolean(input.valueHypothesisPacket),
          drift
        )
      : [],
    recommended_next_actions: nextActionsForState(workflowState),
    review_queue: [] as any[],
    feeds: {
      operator_workflow: workflowState !== "BLOCKED",
      value_hypothesis_packet_review: workflowState === READY_STATE,
      confidence_model: false,
      finance_context_investigation: false,
      customer_facing_financial_output: false
    },
    allowed_uses: [
      "internal_operator_review",
      "source_gap_triage",
      "measurement_cell_readiness_triage",
      "operator_time_series_review",
      "internal_value_hypothesis_packet_review"
    ],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    boundary_policy: Object.fromEntries(
      REQUIRED_FALSE_BOUNDARY_FIELDS.map((field) => [field, false])
    ),
    required_caveats: [
      "Operator Workflow is an internal governed evidence-spine summary only.",
      "It composes already-parsed aggregate-safe child objects and emits statuses, missing evidence, and next actions.",
      "It does not create UI, routes, persistence, schemas, ingestion jobs, live connectors, confidence models, probabilities, financial attribution, or customer-facing financial output.",
      "Finance-context investigation planning remains owned by the Value Hypothesis packet runner and Measurement Cell gates; this workflow does not emit that feed."
    ],
    generated_at: input.generatedAt ?? new Date(0).toISOString(),
    derivation_version: DERIVATION_VERSION
  };
  workflow.missing_evidence = workflowState === "BLOCKED"
    ? uniqueStrings([
        ...missingEvidenceForWorkflow(workflow),
        "OPERATOR_WORKFLOW_BLOCKED"
      ])
    : missingEvidenceForWorkflow(workflow);
  workflow.review_queue = reviewQueueForWorkflow(workflow);
  return workflow;
}

function topLevelGaps(workflow: any): string[] {
  const gaps: string[] = [];
  if (!workflow || typeof workflow !== "object" || Array.isArray(workflow)) {
    return ["operator workflow must be an object"];
  }
  for (const field of [
    "schema_version",
    "workflow_id",
    "org_id",
    "client_id",
    "workflow_family",
    "function_area",
    "cohort_key",
    "workflow_state",
    "source_review_status",
    "operator_intake_status",
    "measurement_cell_status",
    "time_series_status",
    "packet_preparation_status",
    "missing_evidence",
    "blocked_reasons",
    "recommended_next_actions",
    "review_queue",
    "feeds",
    "allowed_uses",
    "blocked_uses",
    "boundary_policy",
    "required_caveats",
    "generated_at",
    "derivation_version"
  ]) {
    if (workflow?.[field] === undefined || workflow?.[field] === null || workflow?.[field] === "") {
      gaps.push(`${field} is missing`);
    }
  }
  if (
    workflow?.schema_version &&
    workflow.schema_version !== AI_VALUE_OPERATOR_WORKFLOW_SCHEMA_VERSION
  ) {
    gaps.push(`schema_version is invalid: ${workflow.schema_version}`);
  }
  if (workflow?.workflow_state && !ALLOWED_WORKFLOW_STATES.has(String(workflow.workflow_state))) {
    gaps.push(`workflow_state is invalid: ${workflow.workflow_state}`);
  }
  for (const field of Object.keys(workflow ?? {})) {
    if (!ALLOWED_TOP_LEVEL_FIELDS.has(field)) {
      gaps.push(`Unsupported operator workflow field: ${field}`);
    }
  }
  return gaps;
}

function policyGaps(workflow: any): string[] {
  const gaps: string[] = [];
  for (const use of REQUIRED_BLOCKED_USES) {
    if (!stringsOf(workflow?.blocked_uses).includes(use)) {
      gaps.push(`blocked_uses missing ${use}`);
    }
  }
  for (const field of REQUIRED_FALSE_BOUNDARY_FIELDS) {
    if (workflow?.boundary_policy?.[field] !== false) {
      gaps.push(`boundary_policy.${field} must be false`);
    }
  }
  for (const field of [
    "confidence_model",
    "finance_context_investigation",
    "customer_facing_financial_output"
  ]) {
    if (workflow?.feeds?.[field] !== false) {
      gaps.push(`feeds.${field} must be false`);
    }
  }
  for (const value of stringsOf(workflow?.recommended_next_actions)) {
    if (/finance_context|customer_facing|financial_output|confidence|probability|roi|causality|productivity/i.test(value)) {
      gaps.push(`recommended_next_actions contains blocked action ${value}`);
    }
  }
  for (const field of [...collectForbiddenFields(workflow)].sort()) {
    gaps.push(`Forbidden field detected: ${field}`);
  }
  for (const value of [...collectUnsafeStringValues(workflow)].sort()) {
    gaps.push(`Unsafe claim language detected: ${value}`);
  }
  return gaps;
}

function derivedGaps(workflow: any): string[] {
  const gaps: string[] = [];
  const expectedState = workflowStateFromStatuses(workflow);
  if (workflow?.workflow_state !== expectedState) {
    gaps.push(`workflow_state must match derived state ${expectedState}`);
  }
  const expectedMissing = workflow?.workflow_state === "BLOCKED"
    ? uniqueStrings([
        ...missingEvidenceForWorkflow(workflow),
        "OPERATOR_WORKFLOW_BLOCKED"
      ])
    : missingEvidenceForWorkflow(workflow);
  if (!validationMatchesEmbedded(workflow?.missing_evidence, expectedMissing)) {
    gaps.push("missing_evidence must match derived workflow gaps");
  }
  const expectedQueue = reviewQueueForWorkflow(workflow);
  if (!validationMatchesEmbedded(workflow?.review_queue, expectedQueue)) {
    gaps.push("review_queue must match derived workflow statuses");
  }
  if (workflow?.workflow_state === READY_STATE) {
    if (workflow?.feeds?.value_hypothesis_packet_review !== true) {
      gaps.push("ready operator workflow must feed internal packet review");
    }
    if (workflow?.packet_preparation_status?.state !== "prepared") {
      gaps.push("ready operator workflow requires a prepared Value Hypothesis packet");
    }
  }
  if (workflow?.workflow_state === "BLOCKED") {
    if (stringsOf(workflow?.blocked_reasons).length === 0) {
      gaps.push("blocked operator workflow requires blocked_reasons");
    }
    for (const reason of stringsOf(workflow?.blocked_reasons)) {
      gaps.push(`blocked_reasons: ${reason}`);
    }
    if (workflow?.feeds?.operator_workflow !== false) {
      gaps.push("blocked operator workflow cannot feed operator_workflow");
    }
  }
  if (workflow?.workflow_state !== READY_STATE && workflow?.feeds?.value_hypothesis_packet_review !== false) {
    gaps.push("only READY_FOR_INTERNAL_PACKET_REVIEW can feed internal packet review");
  }
  return gaps;
}

export function validateOperatorWorkflow(
  workflow: any
): OperatorWorkflowValidationResult {
  const gaps = [
    ...topLevelGaps(workflow),
    ...policyGaps(workflow),
    ...derivedGaps(workflow)
  ];
  const valid = gaps.length === 0 && workflow?.workflow_state !== "BLOCKED";
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    workflow_id: workflow?.workflow_id ?? null,
    org_id: workflow?.org_id ?? null,
    client_id: workflow?.client_id ?? null,
    valid,
    gaps,
    feeds: feedState(workflow, valid)
  };
}
