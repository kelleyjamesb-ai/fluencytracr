/**
 * AI Value Engine - Operator Evidence Package Runner.
 *
 * Contract-only package composer for the governed evidence spine. It takes
 * already-parsed aggregate-safe window inputs, builds the existing operator
 * intake/time-series/workflow objects, and emits one internal package run. It
 * does not parse uploads, run BigQuery, persist source data, create routes/UI,
 * create schemas, execute confidence models, feed finance-context
 * investigation, calculate ROI, prove causality, emit productivity claims, or
 * create customer-facing financial output.
 */

import {
  buildOperatorIntakeAdapterRun,
  validateOperatorIntakeAdapterRun,
  type BuildOperatorIntakeAdapterRunInput,
  type OperatorIntakeAdapterRunValidationResult
} from "./operatorIntakeAdapter";
import {
  buildOperatorTimeSeriesRun,
  validateOperatorTimeSeriesRun,
  type OperatorTimeSeriesRunValidationResult
} from "./operatorTimeSeriesRun";
import {
  buildOperatorWorkflow,
  validateOperatorWorkflow,
  type OperatorWorkflowValidationResult
} from "./operatorWorkflow";
import {
  validateValueHypothesisReadinessPacket,
  type ValueHypothesisReadinessPacketValidationResult
} from "./valueHypothesisReadinessPacketRunner";

export const AI_VALUE_OPERATOR_EVIDENCE_PACKAGE_RUN_SCHEMA_VERSION =
  "FT_AI_VALUE_OPERATOR_EVIDENCE_PACKAGE_RUN_2026_06";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_OPERATOR_EVIDENCE_PACKAGE_RUN_VALIDATION_2026_06";

const DERIVATION_VERSION =
  "ai_value_operator_evidence_package_runner_2026_06";

const READY_STATE = "READY_FOR_INTERNAL_OPERATOR_WORKFLOW_REVIEW";

const ALLOWED_PACKAGE_STATES = new Set([
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

const REQUIRED_ALLOWED_USES = [
  "internal_operator_package_review",
  "governed_evidence_spine_triage",
  "source_gap_triage",
  "operator_time_series_review",
  "internal_value_hypothesis_packet_review"
];

const REQUIRED_FALSE_BOUNDARY_FIELDS = [
  "persisted",
  "creates_migrations",
  "creates_prisma_schema",
  "creates_schemas",
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

const REQUIRED_FEED_FIELDS = [
  "operator_evidence_package",
  "operator_workflow_review",
  "confidence_model",
  "finance_context_investigation",
  "customer_facing_financial_output"
];

const ALLOWED_TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "run_id",
  "package_id",
  "org_id",
  "client_id",
  "measurement_plan_id",
  "workflow_family",
  "function_area",
  "cohort_key",
  "package_state",
  "window_runs",
  "operator_time_series_run",
  "operator_time_series_validation_result",
  "operator_workflow",
  "operator_workflow_validation_result",
  "validation_summary",
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
  /^creates_(?:migrations|prisma_schema|schemas|backend_routes?|frontend_ui|ingestion_jobs)$/i,
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

const VALIDATED_CHILD_OBJECT_FIELDS = new Set([
  "operator_workflow",
  "operator_workflow_validation_result"
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
  /\b\d{1,3}%\s+(?:confidence|probability)\b/i,
  /\b(?:confidence|probability)\s*(?:score|level)?\s*(?:of|=|:)?\s*0?\.\d+\b/i,
  /\bAI\s+contribution\s+confidence\b/i,
  /\bfinance[-_\s]?context\b/i,
  /\b(?:roi|ebita|ebitda|payback|business case|financial output|financial attribution)[-_ ]?(?:ready|approved|validated|proof|claim|output)?\b/i,
  /\$\s*\d[\d,.]*(?:[kmb])?\s*(?:savings|roi|ebita|ebitda|financial impact|payback)\b/i,
  /\bproductivity\s+lift\b/i,
  /\battribution\s+probability\b/i
];

const UNSAFE_IDENTITY_VALUE_PATTERNS = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /\b(?:user|person|employee|manager|respondent)[\s_-]*(?:id|email|name)?\s*[:=]\s*[^\s,;]+/i,
  /\b(?:user|person|employee|manager|respondent)[_-](?:id|email|name)[_-][A-Za-z0-9]/i,
  /\b(?:team|manager|department)[_\s-]?rank(?:ing)?\b/i,
  /\bperson[_\s-]?level\b/i
];

export interface BuildOperatorEvidencePackageWindowInput {
  milestoneDay?: number | null;
  windowMode?: "milestone" | "rolling_30_day" | string;
  rollingWindowIndex?: number | null;
  baselineWindow: any;
  comparisonWindow: any;
  sources?: BuildOperatorIntakeAdapterRunInput["sources"];
  sourcePackages?: any[];
  scrubbedGleanExports?: any[];
  measurementCellInput?: any;
  operatorIntakeRun?: any;
  valueHypothesisPacket?: any | null;
  runId?: string;
  roiBotContext?: any;
}

export interface BuildOperatorEvidencePackageRunInput {
  packageId?: string;
  runId?: string;
  orgId: string;
  clientId: string;
  workflowFamily: string;
  functionArea: string;
  cohortKey: string;
  measurementPlan: any;
  windows: BuildOperatorEvidencePackageWindowInput[];
  generatedAt?: string;
}

export interface OperatorEvidencePackageRunValidationResult {
  schema_version: string;
  run_id: string | null;
  package_id: string | null;
  org_id: string | null;
  client_id: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    operator_evidence_package: boolean;
    operator_workflow_review: boolean;
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

function sortedKeys(value: any): string[] {
  return value && typeof value === "object" && !Array.isArray(value)
    ? Object.keys(value).sort()
    : [];
}

function sameStringSet(left: string[], right: string[]): boolean {
  return validationMatchesEmbedded([...left].sort(), [...right].sort());
}

function deepClone<T>(value: T): T {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value));
}

function cloneWithWindow(plan: any, baselineWindow: any, comparisonWindow: any): any {
  return {
    ...deepClone(plan),
    windows: {
      ...(plan?.windows ?? {}),
      baseline_window_start: baselineWindow?.window_start ?? null,
      baseline_window_end: baselineWindow?.window_end ?? null,
      comparison_window_start: comparisonWindow?.window_start ?? null,
      comparison_window_end: comparisonWindow?.window_end ?? null
    }
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
    if (VALIDATED_CHILD_OBJECT_FIELDS.has(normalized)) {
      continue;
    }
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
    const isBoundaryNote =
      pathKeys.at(-1) === "note" &&
      /\b(?:no|not|does not|cannot|never)\b/i.test(value) &&
      /\b(?:confidence|probability|roi|ebita|ebitda|causality|productivity|financial attribution|financial output|customer-facing financial output)\b/i.test(value);
    if (
      !inBlockedOrCaveat &&
      !isBoundaryNote &&
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
    const normalized = normalizeKey(key);
    if (VALIDATED_CHILD_OBJECT_FIELDS.has(normalized)) {
      continue;
    }
    collectUnsafeStringValues(nested, values, [...path, key]);
  }
  return values;
}

function collectUnsafeIdentityStringValues(
  value: any,
  values: Set<string> = new Set(),
  path: string[] = []
): Set<string> {
  if (typeof value === "string") {
    const pathKeys = path.map(normalizeKey);
    const inBlockedOrCaveat =
      pathKeys.includes("blocked_uses") ||
      pathKeys.includes("required_caveats");
    if (
      !inBlockedOrCaveat &&
      UNSAFE_IDENTITY_VALUE_PATTERNS.some((pattern) => pattern.test(value))
    ) {
      values.add(`${path.join(".")}: ${value}`);
    }
    return values;
  }
  if (!value || typeof value !== "object") return values;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectUnsafeIdentityStringValues(item, values, [...path, String(index)])
    );
    return values;
  }
  for (const [key, nested] of Object.entries(value)) {
    collectUnsafeIdentityStringValues(nested, values, [...path, key]);
  }
  return values;
}

function falseFeeds(): OperatorEvidencePackageRunValidationResult["feeds"] {
  return {
    operator_evidence_package: false,
    operator_workflow_review: false,
    confidence_model: false,
    finance_context_investigation: false,
    customer_facing_financial_output: false
  };
}

function feedState(
  run: any,
  valid: boolean
): OperatorEvidencePackageRunValidationResult["feeds"] {
  if (!valid) return falseFeeds();
  return {
    operator_evidence_package: run?.feeds?.operator_evidence_package === true,
    operator_workflow_review: run?.feeds?.operator_workflow_review === true,
    confidence_model: false,
    finance_context_investigation: false,
    customer_facing_financial_output: false
  };
}

function baseRunId(input: BuildOperatorEvidencePackageRunInput): string {
  return input.runId ??
    input.packageId ??
    `operator_evidence_package_run_${safeIdPart(input.orgId ?? "unknown_org")}_${safeIdPart(input.workflowFamily ?? "unknown_workflow")}`;
}

function windowId(window: BuildOperatorEvidencePackageWindowInput, index: number): string {
  const mode = String(window.windowMode ?? "milestone");
  if (mode === "rolling_30_day") {
    return `rolling_30_day_${window.rollingWindowIndex ?? index + 1}`;
  }
  return `day_${window.milestoneDay ?? index}`;
}

function hasFreshWindowInputs(window: BuildOperatorEvidencePackageWindowInput): boolean {
  return Boolean(
    window.sources ||
    window.measurementCellInput ||
    window.sourcePackages !== undefined ||
    window.scrubbedGleanExports !== undefined
  );
}

function safePacketValidation(
  validation: ValueHypothesisReadinessPacketValidationResult | null
): any {
  if (!validation) return null;
  return {
    schema_version: validation.schema_version,
    packet_id: validation.packet_id,
    org_id: validation.org_id,
    valid: validation.valid,
    gaps: [...validation.gaps],
    feeds: {
      glean_review: validation.feeds.glean_review === true,
      business_owner_review: validation.feeds.business_owner_review === true,
      finance_context_investigation: false,
      customer_facing_output: false,
      financial_output: false
    }
  };
}

function operatorIntakeReference(
  operatorRun: any,
  validation: OperatorIntakeAdapterRunValidationResult
): any {
  const readiness = operatorRun?.time_series_readiness ?? {};
  return {
    run_id: operatorRun?.run_id ?? null,
    org_id: operatorRun?.org_id ?? null,
    client_id: operatorRun?.client_id ?? null,
    measurement_plan_id: operatorRun?.measurement_plan_id ?? null,
    workflow_family: operatorRun?.workflow_family ?? null,
    function_area: operatorRun?.function_area ?? null,
    cohort_key: operatorRun?.cohort_key ?? null,
    decision: operatorRun?.decision ?? "BLOCKED",
    validation_valid: validation.valid === true,
    data_spine_readiness_id:
      operatorRun?.data_spine_readiness?.data_spine_readiness_id ?? null,
    source_package_review_queue_id:
      operatorRun?.source_package_review_queue?.source_package_review_queue_id ?? null,
    real_data_intake_run_id: operatorRun?.real_data_intake_packet_run?.run_id ?? null,
    measurement_cell_assembly_run_id:
      readiness.measurement_cell_assembly_run_id ??
      operatorRun?.measurement_cell_assembly_run?.run_id ??
      null,
    measurement_cell_id: readiness.measurement_cell_id ?? null,
    window_mode: readiness.window_mode ?? null,
    baseline_window: deepClone(readiness.baseline_window ?? null),
    comparison_window: deepClone(readiness.comparison_window ?? null),
    governed_run_reference_ready:
      readiness.governed_run_reference_ready === true,
    governed_run_reference: readiness.governed_run_reference_ready === true
      ? {
          run_ref: `governed_operator_run_ref_${safeIdPart(operatorRun?.run_id ?? "missing")}`,
          operator_run_id: operatorRun?.run_id ?? null,
          measurement_cell_id: readiness.measurement_cell_id ?? null,
          measurement_cell_assembly_run_id:
            readiness.measurement_cell_assembly_run_id ??
            operatorRun?.measurement_cell_assembly_run?.run_id ??
            null,
          window_mode: readiness.window_mode ?? null,
          milestone_day:
            typeof operatorRun?.measurement_cell_assembly_run?.measurement_cell
              ?.time_window?.days_since_launch === "number"
              ? operatorRun.measurement_cell_assembly_run.measurement_cell
                  .time_window.days_since_launch
              : null,
          baseline_window: deepClone(readiness.baseline_window ?? null),
          comparison_window: deepClone(readiness.comparison_window ?? null),
          source_refs: {
            data_spine_readiness_id:
              operatorRun?.data_spine_readiness?.data_spine_readiness_id ?? null,
            source_package_review_queue_id:
              operatorRun?.source_package_review_queue?.source_package_review_queue_id ?? null,
            real_data_intake_run_id:
              operatorRun?.real_data_intake_packet_run?.run_id ?? null
          },
          confidence_model_feed: false,
          finance_context_investigation_feed: false
        }
      : null,
    missing_evidence: stringsOf(operatorRun?.missing_evidence),
    gaps: validation.valid ? [] : stringsOf(validation.gaps),
    feeds: {
      finance_context_investigation: false,
      confidence_model: false,
      customer_facing_financial_output: false
    }
  };
}

function packetReference(packet: any, validation: ValueHypothesisReadinessPacketValidationResult | null): any {
  if (!packet) return null;
  return {
    packet_id: packet.packet_id ?? null,
    org_id: packet.org_id ?? null,
    measurement_plan_id: packet.measurement_plan_id ?? null,
    workflow: {
      workflow_family: packet.workflow?.workflow_family ?? null,
      function_area: packet.workflow?.function_area ?? null
    },
    window: deepClone(packet.window ?? null),
    validation_valid: validation?.valid === true,
    missing_evidence: stringsOf(packet.missing_evidence),
    feeds: {
      finance_context_investigation: false,
      customer_facing_output: false,
      financial_output: false
    }
  };
}

function buildWindowRun(
  input: BuildOperatorEvidencePackageRunInput,
  window: BuildOperatorEvidencePackageWindowInput,
  index: number
): any {
  const id = windowId(window, index);
  const baselineWindow = deepClone(window.baselineWindow);
  const comparisonWindow = deepClone(window.comparisonWindow);
  const windowPlan = cloneWithWindow(
    input.measurementPlan,
    baselineWindow,
    comparisonWindow
  );
  const useFreshInputs = hasFreshWindowInputs(window);
  const operatorIntakeRun = !useFreshInputs && window.operatorIntakeRun
    ? window.operatorIntakeRun
    :
    buildOperatorIntakeAdapterRun({
      orgId: input.orgId,
      clientId: input.clientId,
      workflowFamily: input.workflowFamily,
      functionArea: input.functionArea,
      cohortKey: input.cohortKey,
      baselineWindow: deepClone(baselineWindow),
      comparisonWindow: deepClone(comparisonWindow),
      sources: window.sources ?? {},
      measurementPlan: windowPlan,
      sourcePackages: window.sourcePackages ?? [],
      scrubbedGleanExports: window.scrubbedGleanExports ?? [],
      measurementCellInput: window.measurementCellInput,
      runId: window.runId ??
        `${baseRunId(input)}_${safeIdPart(id)}_operator_intake`,
      generatedAt: input.generatedAt
    } as BuildOperatorIntakeAdapterRunInput);
  const operatorValidation = validateOperatorIntakeAdapterRun(operatorIntakeRun);
  const packetValidation = window.valueHypothesisPacket
    ? validateValueHypothesisReadinessPacket(window.valueHypothesisPacket)
    : null;
  const missing = uniqueStrings([
    ...stringsOf(operatorIntakeRun?.missing_evidence),
    ...(packetValidation?.valid === false ? ["VALUE_HYPOTHESIS_PACKET_INVALID"] : [])
  ]);

  return {
    window_id: id,
    window_mode: String(window.windowMode ?? "milestone"),
    milestone_day: window.milestoneDay ?? null,
    rolling_window_index: window.rollingWindowIndex ?? null,
    baseline_window: baselineWindow,
    comparison_window: comparisonWindow,
    operator_intake_run: operatorIntakeReference(operatorIntakeRun, operatorValidation),
    operator_intake_validation_result: operatorValidation,
    value_hypothesis_packet: packetReference(window.valueHypothesisPacket, packetValidation),
    value_hypothesis_packet_validation_result: safePacketValidation(packetValidation),
    missing_evidence: missing,
    gaps: uniqueStrings([
      ...(!operatorValidation.valid
        ? operatorValidation.gaps.map((gap) => `operator_intake_run: ${gap}`)
        : []),
      ...(packetValidation?.valid === false
        ? packetValidation.gaps.map((gap) => `value_hypothesis_packet: ${gap}`)
        : [])
    ]),
    _operator_intake_payload: operatorIntakeRun,
    _value_hypothesis_packet_payload: window.valueHypothesisPacket ?? null
  };
}

function packageStateFromWorkflowState(workflowState: string): string {
  if (workflowState === "READY_FOR_INTERNAL_PACKET_REVIEW") {
    return READY_STATE;
  }
  if (ALLOWED_PACKAGE_STATES.has(workflowState)) {
    return workflowState;
  }
  return "BLOCKED";
}

function latestWindowRun(windowRuns: any[]): any | null {
  if (windowRuns.length === 0) return null;
  return [...windowRuns].sort((left, right) => {
    const leftDay = typeof left.milestone_day === "number" ? left.milestone_day : -1;
    const rightDay = typeof right.milestone_day === "number" ? right.milestone_day : -1;
    return leftDay - rightDay;
  }).at(-1) ?? null;
}

function packetFromLatestWindow(windowRuns: any[]): any | null {
  return latestWindowRun(windowRuns)?._value_hypothesis_packet_payload ?? null;
}

function buildTimeSeriesRun(input: BuildOperatorEvidencePackageRunInput, windowRuns: any[]): any {
  return buildOperatorTimeSeriesRun({
    seriesId: `${baseRunId(input)}_operator_time_series`,
    orgId: input.orgId,
    clientId: input.clientId,
    workflowFamily: input.workflowFamily,
    functionArea: input.functionArea,
    cohortKey: input.cohortKey,
    windows: windowRuns.map((window) => ({
      milestoneDay: window.milestone_day,
      windowMode: window.window_mode,
      rollingWindowIndex: window.rolling_window_index,
      operatorIntakeRun: window._operator_intake_payload
    })),
    generatedAt: input.generatedAt
  });
}

function buildWorkflowRun(
  input: BuildOperatorEvidencePackageRunInput,
  latest: any | null,
  timeSeries: any,
  packet: any | null
): any {
  return buildOperatorWorkflow({
    workflowId: `${baseRunId(input)}_operator_workflow`,
    orgId: input.orgId,
    clientId: input.clientId,
    workflowFamily: input.workflowFamily,
    functionArea: input.functionArea,
    cohortKey: input.cohortKey,
    operatorIntakeRun: latest?._operator_intake_payload ?? null,
    operatorTimeSeriesRun: timeSeries,
    valueHypothesisPacket: packet,
    generatedAt: input.generatedAt
  });
}

function compactTimeSeriesRun(series: any, windowRuns: any[]): any {
  return {
    schema_version: series?.schema_version ?? null,
    series_id: series?.series_id ?? null,
    org_id: series?.org_id ?? null,
    client_id: series?.client_id ?? null,
    workflow_family: series?.workflow_family ?? null,
    function_area: series?.function_area ?? null,
    cohort_key: series?.cohort_key ?? null,
    decision: series?.decision ?? null,
    time_windows: windowRuns.map((window) => ({
      window_id: window.window_id,
      window_mode: window.window_mode,
      milestone_day: window.milestone_day,
      rolling_window_index: window.rolling_window_index,
      baseline_window: deepClone(window.baseline_window),
      comparison_window: deepClone(window.comparison_window),
      operator_run_id: window.operator_intake_run?.run_id ?? null,
      operator_decision: window.operator_intake_run?.decision ?? "BLOCKED",
      governed_run_reference_ready:
        window.operator_intake_run?.governed_run_reference_ready === true,
      governed_run_reference:
        window.operator_intake_run?.governed_run_reference ?? null,
      operator_intake_run: window.operator_intake_run,
      operator_intake_validation_result: window.operator_intake_validation_result,
      gaps: stringsOf(window.gaps),
      missing_evidence: stringsOf(window.missing_evidence)
    })),
    operator_intake_runs: deepClone(series?.operator_intake_runs ?? []),
    governed_run_references: deepClone(series?.governed_run_references ?? []),
    validation_summary: deepClone(series?.validation_summary ?? {}),
    gaps: stringsOf(series?.gaps),
    missing_evidence: stringsOf(series?.missing_evidence),
    time_series_readiness: deepClone(series?.time_series_readiness ?? {}),
    feeds: {
      operator_time_series_run: series?.feeds?.operator_time_series_run === true,
      confidence_model: false,
      finance_context_investigation: false,
      customer_facing_financial_output: false
    },
    generated_at: series?.generated_at ?? null,
    derivation_version: series?.derivation_version ?? null
  };
}

function publicWindowRun(window: any): any {
  const {
    _operator_intake_payload: _operatorIntakePayload,
    _value_hypothesis_packet_payload: _valueHypothesisPacketPayload,
    ...publicWindow
  } = window;
  return publicWindow;
}

function summaryForRun(windowRuns: any[], timeSeries: any, workflow: any): any {
  return {
    window_count: windowRuns.length,
    governed_operator_window_count: windowRuns.filter((window) =>
      window.operator_intake_run?.decision === "READY_FOR_VALUE_HYPOTHESIS_PACKET_PREPARATION"
    ).length,
    value_hypothesis_packet_count: windowRuns.filter((window) =>
      Boolean(window.value_hypothesis_packet)
    ).length,
    operator_time_series_decision: timeSeries?.decision ?? null,
    operator_workflow_state: workflow?.workflow_state ?? null
  };
}

function nextActionsForState(state: string): string[] {
  switch (state) {
    case READY_STATE:
      return ["review_internal_operator_workflow", "prepare_decision_or_retest_plan"];
    case "HELD_FOR_SOURCE_REVIEW":
      return ["complete_source_package_review", "collect_missing_aggregate_evidence"];
    case "HELD_FOR_MEASUREMENT_CELL":
      return ["complete_measurement_cell_assembly", "resolve_measurement_cell_gaps"];
    case "HELD_FOR_TIME_SERIES":
      return ["complete_governed_milestone_time_series", "use_rolling_30_day_as_operating_context_only"];
    case "HELD_FOR_PACKET_PREPARATION":
      return ["prepare_internal_value_hypothesis_packet"];
    default:
      return ["hold", "resolve_blocked_operator_evidence_package"];
  }
}

export function buildOperatorEvidencePackageRun(
  input: BuildOperatorEvidencePackageRunInput
): any {
  const windowRuns = (input.windows ?? []).map((window, index) =>
    buildWindowRun(input, window, index)
  );
  const timeSeries = buildTimeSeriesRun(input, windowRuns);
  const timeSeriesValidation = validateOperatorTimeSeriesRun(timeSeries);
  const publicWindowRuns = windowRuns.map(publicWindowRun);
  const compactTimeSeries = compactTimeSeriesRun(timeSeries, publicWindowRuns);
  const latest = latestWindowRun(windowRuns);
  const packet = packetFromLatestWindow(windowRuns);
  const workflow = buildWorkflowRun(input, latest, timeSeries, packet);
  const workflowValidation = validateOperatorWorkflow(workflow);
  const packageState = workflowValidation.valid
    ? packageStateFromWorkflowState(workflow.workflow_state)
    : "BLOCKED";
  const missing = packageState === "BLOCKED"
    ? uniqueStrings([
        ...stringsOf(workflow?.missing_evidence),
        "OPERATOR_WORKFLOW_BLOCKED"
      ])
    : uniqueStrings(stringsOf(workflow?.missing_evidence));

  return {
    schema_version: AI_VALUE_OPERATOR_EVIDENCE_PACKAGE_RUN_SCHEMA_VERSION,
    run_id: baseRunId(input),
    package_id: input.packageId ?? baseRunId(input),
    org_id: input.orgId,
    client_id: input.clientId,
    measurement_plan_id: input.measurementPlan?.measurement_plan_id ?? null,
    workflow_family: input.workflowFamily,
    function_area: input.functionArea,
    cohort_key: input.cohortKey,
    package_state: packageState,
    window_runs: publicWindowRuns,
    operator_time_series_run: compactTimeSeries,
    operator_time_series_validation_result: timeSeriesValidation,
    operator_workflow: workflow,
    operator_workflow_validation_result: workflowValidation,
    validation_summary: summaryForRun(windowRuns, timeSeries, workflow),
    missing_evidence: missing,
    blocked_reasons: packageState === "BLOCKED"
      ? uniqueStrings([
          ...stringsOf(workflow?.blocked_reasons),
          ...(!timeSeriesValidation.valid
            ? timeSeriesValidation.gaps.map((gap) => `operator_time_series_run: ${gap}`)
            : []),
          ...(!workflowValidation.valid
            ? workflowValidation.gaps.map((gap) => `operator_workflow: ${gap}`)
            : [])
        ])
      : [],
    recommended_next_actions: nextActionsForState(packageState),
    review_queue: workflow?.review_queue ?? [],
    feeds: {
      operator_evidence_package: packageState !== "BLOCKED",
      operator_workflow_review: packageState === READY_STATE,
      confidence_model: false,
      finance_context_investigation: false,
      customer_facing_financial_output: false
    },
    allowed_uses: [...REQUIRED_ALLOWED_USES],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    boundary_policy: Object.fromEntries(
      REQUIRED_FALSE_BOUNDARY_FIELDS.map((field) => [field, false])
    ),
    required_caveats: [
      "Operator Evidence Package Runner composes already-parsed aggregate-safe source objects only.",
      "It is an internal governed evidence-spine package and not a customer-facing readout.",
      "It does not parse uploads, run BigQuery, persist source data, create routes/UI, create schemas, execute confidence models, or feed finance-context investigation.",
      "ROI Bot or assumption context is scenario context only and cannot substitute for reviewed Source Packages, Measurement Cells, or Value Hypothesis packets.",
      "No ROI, EBITA, EBITDA, causality, productivity, financial attribution, confidence percentage, probability, person-level output, ranking, or customer-facing financial output is produced."
    ],
    generated_at: input.generatedAt ?? new Date(0).toISOString(),
    derivation_version: DERIVATION_VERSION
  };
}

function topLevelGaps(run: any): string[] {
  const gaps: string[] = [];
  if (!run || typeof run !== "object" || Array.isArray(run)) {
    return ["operator evidence package run must be an object"];
  }
  for (const field of [
    "schema_version",
    "run_id",
    "package_id",
    "org_id",
    "client_id",
    "measurement_plan_id",
    "workflow_family",
    "function_area",
    "cohort_key",
    "package_state",
    "window_runs",
    "operator_time_series_run",
    "operator_time_series_validation_result",
    "operator_workflow",
    "operator_workflow_validation_result",
    "validation_summary",
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
    if (run?.[field] === undefined || run?.[field] === null || run?.[field] === "") {
      gaps.push(`${field} is missing`);
    }
  }
  if (
    run?.schema_version &&
    run.schema_version !== AI_VALUE_OPERATOR_EVIDENCE_PACKAGE_RUN_SCHEMA_VERSION
  ) {
    gaps.push(`schema_version is invalid: ${run.schema_version}`);
  }
  if (run?.package_state && !ALLOWED_PACKAGE_STATES.has(String(run.package_state))) {
    gaps.push(`package_state is invalid: ${run.package_state}`);
  }
  if (!Array.isArray(run?.window_runs)) {
    gaps.push("window_runs must be an array");
  }
  for (const field of Object.keys(run ?? {})) {
    if (!ALLOWED_TOP_LEVEL_FIELDS.has(field)) {
      gaps.push(`Unsupported operator evidence package field: ${field}`);
    }
  }
  return gaps;
}

function policyGaps(run: any): string[] {
  const gaps: string[] = [];
  if (!sameStringSet(stringsOf(run?.allowed_uses), REQUIRED_ALLOWED_USES)) {
    gaps.push("allowed_uses must match the Operator Evidence Package internal-use contract");
  }
  if (!sameStringSet(stringsOf(run?.blocked_uses), REQUIRED_BLOCKED_USES)) {
    gaps.push("blocked_uses must match the Operator Evidence Package blocked-use contract");
  }
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
  if (!sameStringSet(sortedKeys(run?.boundary_policy), REQUIRED_FALSE_BOUNDARY_FIELDS)) {
    gaps.push("boundary_policy keys must match the Operator Evidence Package false-boundary contract");
  }
  for (const field of [
    "confidence_model",
    "finance_context_investigation",
    "customer_facing_financial_output"
  ]) {
    if (run?.feeds?.[field] !== false) {
      gaps.push(`feeds.${field} must be false`);
    }
  }
  if (!sameStringSet(sortedKeys(run?.feeds), REQUIRED_FEED_FIELDS)) {
    gaps.push("feeds keys must match the Operator Evidence Package feed contract");
  }
  for (const value of stringsOf(run?.recommended_next_actions)) {
    if (/finance_context|customer_facing|financial_output|confidence|probability|roi|causality|productivity/i.test(value)) {
      gaps.push(`recommended_next_actions contains blocked action ${value}`);
    }
  }
  for (const field of [...collectForbiddenFields(run)].sort()) {
    gaps.push(`Forbidden field detected: ${field}`);
  }
  for (const value of [...collectUnsafeStringValues(run)].sort()) {
    gaps.push(`Unsafe claim language detected: ${value}`);
  }
  for (const value of [...collectUnsafeIdentityStringValues(run)].sort()) {
    gaps.push(`Unsafe identity value detected: ${value}`);
  }
  return gaps;
}

function identityGaps(run: any): string[] {
  const gaps: string[] = [];
  const expected = {
    org_id: run?.org_id,
    client_id: run?.client_id,
    workflow_family: run?.workflow_family,
    function_area: run?.function_area,
    cohort_key: run?.cohort_key
  };
  for (const [field, value] of Object.entries(expected)) {
    for (const window of run?.window_runs ?? []) {
      if (window?.operator_intake_run?.[field] !== value) {
        gaps.push(`window_runs.${window.window_id}.operator_intake_run.${field} must match package ${field}`);
      }
    }
    if (run?.operator_time_series_run?.[field] !== value) {
      gaps.push(`operator_time_series_run.${field} must match package ${field}`);
    }
    if (run?.operator_workflow?.[field] !== value) {
      gaps.push(`operator_workflow.${field} must match package ${field}`);
    }
  }
  return gaps;
}

function measurementPlanBindingGaps(run: any): string[] {
  const gaps: string[] = [];
  const expected = run?.measurement_plan_id;
  if (!expected) return gaps;
  for (const window of run?.window_runs ?? []) {
    if (window?.operator_intake_run?.measurement_plan_id !== expected) {
      gaps.push(`window_runs.${window.window_id}.operator_intake_run.measurement_plan_id must match package measurement_plan_id`);
    }
    if (
      window?.value_hypothesis_packet &&
      window.value_hypothesis_packet.measurement_plan_id !== expected
    ) {
      gaps.push(`window_runs.${window.window_id}.value_hypothesis_packet.measurement_plan_id must match package measurement_plan_id`);
    }
  }
  for (const timeWindow of run?.operator_time_series_run?.time_windows ?? []) {
    if (timeWindow?.operator_intake_run?.measurement_plan_id !== expected) {
      gaps.push(`operator_time_series_run.time_windows.${timeWindow.window_id}.operator_intake_run.measurement_plan_id must match package measurement_plan_id`);
    }
  }
  return gaps;
}

function sameWindow(left: any, right: any): boolean {
  return left?.window_start === right?.window_start &&
    left?.window_end === right?.window_end;
}

function windowBindingGaps(run: any): string[] {
  const gaps: string[] = [];
  for (const window of run?.window_runs ?? []) {
    const intake = window?.operator_intake_run;
    if (!sameWindow(window?.baseline_window, intake?.baseline_window)) {
      gaps.push(`window_runs.${window.window_id}.baseline_window must match operator intake Data Spine baseline_window`);
    }
    if (!sameWindow(window?.comparison_window, intake?.comparison_window)) {
      gaps.push(`window_runs.${window.window_id}.comparison_window must match operator intake Data Spine comparison_window`);
    }
  }
  return gaps;
}

function recomputedWindowValidationGaps(run: any): string[] {
  const gaps: string[] = [];
  for (const window of run?.window_runs ?? []) {
    const intake = window?.operator_intake_run;
    const intakeValidation = window?.operator_intake_validation_result;
    if (intake) {
      const compactValidationFields = {
        run_id: intake.run_id ?? null,
        org_id: intake.org_id ?? null,
        client_id: intake.client_id ?? null,
        valid: intake.validation_valid === true,
        gaps: stringsOf(intake.gaps)
      };
      const embeddedValidationFields = {
        run_id: intakeValidation?.run_id ?? null,
        org_id: intakeValidation?.org_id ?? null,
        client_id: intakeValidation?.client_id ?? null,
        valid: intakeValidation?.valid === true,
        gaps: stringsOf(intakeValidation?.gaps)
      };
      if (!validationMatchesEmbedded(compactValidationFields, embeddedValidationFields)) {
        gaps.push(`window_runs.${window.window_id}.operator_intake_validation_result must match recomputed Operator Intake validation`);
      }
    }
    const packet = window?.value_hypothesis_packet;
    const packetValidation = window?.value_hypothesis_packet_validation_result;
    if (packet) {
      const compactValidationFields = {
        packet_id: packet.packet_id ?? null,
        org_id: packet.org_id ?? null,
        valid: packet.validation_valid === true,
        gaps: stringsOf(packet.gaps)
      };
      const embeddedValidationFields = {
        packet_id: packetValidation?.packet_id ?? null,
        org_id: packetValidation?.org_id ?? null,
        valid: packetValidation?.valid === true,
        gaps: stringsOf(packetValidation?.gaps)
      };
      if (!validationMatchesEmbedded(compactValidationFields, embeddedValidationFields)) {
        gaps.push(`window_runs.${window.window_id}.value_hypothesis_packet_validation_result must match recomputed Value Hypothesis packet validation`);
      }
    }
  }
  return gaps;
}

function recomputedChildGaps(run: any): string[] {
  const gaps: string[] = [];
  const workflowValidation = run?.operator_workflow
    ? validateOperatorWorkflow(run.operator_workflow)
    : null;
  if (
    workflowValidation &&
    !validationMatchesEmbedded(run?.operator_workflow_validation_result, workflowValidation)
  ) {
    gaps.push("operator_workflow_validation_result must match recomputed Operator Workflow validation");
  }
  return gaps;
}

function compactSeriesStructuralGaps(run: any): string[] {
  const gaps: string[] = [];
  const windows = Array.isArray(run?.window_runs) ? run.window_runs : [];
  if (windows.length === 0) {
    gaps.push("time_windows must include at least one window");
    return gaps;
  }
  const modes = new Set<string>(windows.map((window: any) => String(window.window_mode)));
  for (const mode of modes) {
    if (!["milestone", "rolling_30_day"].includes(mode)) {
      gaps.push(`unsupported window_mode ${mode}`);
    }
  }
  if (modes.size > 1) {
    gaps.push("time_windows cannot mix milestone and rolling_30_day modes in one series");
  }
  const milestoneWindows = windows.filter((window: any) => window.window_mode === "milestone");
  const seenMilestones = new Set<number>();
  let previousMilestone: number | null = null;
  for (const window of milestoneWindows) {
    if (
      typeof window.milestone_day !== "number" ||
      !Number.isFinite(window.milestone_day)
    ) {
      gaps.push(`milestone window ${window.window_id} requires numeric milestone_day`);
      continue;
    }
    const milestoneDay = window.milestone_day;
    if (![0, 30, 60, 90, 180, 365].includes(milestoneDay)) {
      gaps.push(`unsupported milestone day ${milestoneDay}`);
    }
    if (seenMilestones.has(milestoneDay)) {
      gaps.push(`repeated milestone day ${milestoneDay}`);
    }
    if (previousMilestone !== null && milestoneDay <= previousMilestone) {
      gaps.push("milestone windows must be ordered by increasing milestone_day");
    }
    seenMilestones.add(milestoneDay);
    previousMilestone = milestoneDay;
  }
  const rollingWindows = windows.filter((window: any) => window.window_mode === "rolling_30_day");
  let previousRollingIndex: number | null = null;
  for (const [index, window] of rollingWindows.entries()) {
    const rollingIndex = Number(window.rolling_window_index ?? index + 1);
    if (!Number.isFinite(rollingIndex) || rollingIndex < 1) {
      gaps.push(`rolling window ${window.window_id} requires a positive rolling_window_index`);
    }
    if (previousRollingIndex !== null && rollingIndex <= previousRollingIndex) {
      gaps.push("rolling_30_day windows must be ordered by increasing rolling_window_index");
    }
    previousRollingIndex = rollingIndex;
  }
  return gaps;
}

function compactSeriesIdentityGaps(run: any): string[] {
  const gaps: string[] = [];
  const expected = {
    org_id: run?.org_id,
    client_id: run?.client_id,
    workflow_family: run?.workflow_family,
    function_area: run?.function_area,
    cohort_key: run?.cohort_key
  };
  for (const window of run?.window_runs ?? []) {
    for (const [field, value] of Object.entries(expected)) {
      if (window?.operator_intake_run?.[field] !== value) {
        gaps.push(`time_windows.${window.window_id}.operator_intake_run.${field} must match series ${field}`);
      }
    }
  }
  return gaps;
}

function compactMissingMilestones(windows: any[]): string[] {
  const present = new Set(
    windows
      .filter((window) => window.window_mode === "milestone")
      .map((window) => window.milestone_day)
      .filter((day) => typeof day === "number" && Number.isFinite(day))
  );
  return [0, 30, 60, 90, 180, 365]
    .filter((day) => !present.has(day))
    .map((day) => `MISSING_MILESTONE_DAY_${day}`);
}

function compactWindowMissingEvidence(window: any, index: number): string[] {
  return window?.operator_intake_run?.governed_run_reference_ready === true
    ? []
    : [`WINDOW_DAY_${window?.milestone_day ?? index}_NOT_GOVERNED_RUN_REFERENCE_READY`];
}

function compactSeriesDecision(
  windows: any[],
  structuralGaps: string[],
  identityDrift: string[]
): string {
  if (structuralGaps.length || identityDrift.length) return "BLOCKED";
  const modes = new Set<string>(windows.map((window) => String(window.window_mode)));
  const nestedInvalid = windows.some((window) =>
    window?.operator_intake_validation_result?.valid === false
  );
  if (nestedInvalid) return "BLOCKED";
  if (modes.size === 1 && modes.has("rolling_30_day")) {
    return "HELD_FOR_OPERATING_CONTEXT_ONLY";
  }
  if (windows.some((window) => window?.operator_intake_run?.governed_run_reference_ready !== true)) {
    return "HELD_FOR_SOURCE_REVIEW";
  }
  if (compactMissingMilestones(windows).length > 0) {
    return "HELD_FOR_INSUFFICIENT_GOVERNED_RUNS";
  }
  return "READY_FOR_CONFIDENCE_MODEL_DESIGN_REVIEW";
}

function expectedTimeSeries(run: any): any {
  const windows = Array.isArray(run?.window_runs) ? run.window_runs : [];
  const structuralGaps = compactSeriesStructuralGaps(run);
  const identityDrift = compactSeriesIdentityGaps(run);
  const governedReferences = windows
    .map((window: any) => window?.operator_intake_run?.governed_run_reference)
    .filter(Boolean);
  const rollingOnly =
    windows.length > 0 &&
    windows.every((window: any) => window.window_mode === "rolling_30_day");
  const decision = compactSeriesDecision(windows, structuralGaps, identityDrift);
  const expectedWindows = windows.map((window: any) => ({
    window_id: window.window_id,
    window_mode: window.window_mode,
    milestone_day: window.milestone_day,
    rolling_window_index: window.rolling_window_index,
    baseline_window: deepClone(window.baseline_window),
    comparison_window: deepClone(window.comparison_window),
    operator_run_id: window.operator_intake_run?.run_id ?? null,
    operator_decision: window.operator_intake_run?.decision ?? "BLOCKED",
    governed_run_reference_ready:
      window.operator_intake_run?.governed_run_reference_ready === true,
    governed_run_reference:
      window.operator_intake_run?.governed_run_reference ?? null,
    operator_intake_run: window.operator_intake_run,
    operator_intake_validation_result: window.operator_intake_validation_result,
    gaps: stringsOf(window.gaps),
    missing_evidence: stringsOf(window.missing_evidence)
  }));
  return {
    schema_version: run?.operator_time_series_run?.schema_version ?? null,
    series_id: run?.operator_time_series_run?.series_id ?? null,
    org_id: run?.org_id,
    client_id: run?.client_id,
    workflow_family: run?.workflow_family,
    function_area: run?.function_area,
    cohort_key: run?.cohort_key,
    decision,
    time_windows: expectedWindows,
    operator_intake_runs: windows.map((window: any) => ({
      window_id: window.window_id,
      operator_run_id: window.operator_intake_run?.run_id ?? null,
      operator_decision: window.operator_intake_run?.decision ?? "BLOCKED",
      validation_valid: window.operator_intake_validation_result?.valid,
      governed_run_reference_ready:
        window.operator_intake_run?.governed_run_reference_ready === true
    })),
    governed_run_references: deepClone(governedReferences),
    validation_summary: {
      total_windows: windows.length,
      governed_run_reference_ready_windows: governedReferences.length,
      held_windows: windows.filter((window: any) =>
        window.operator_intake_run?.governed_run_reference_ready !== true
      ).length,
      invalid_windows: windows.filter((window: any) =>
        window.operator_intake_validation_result?.valid === false
      ).length,
      structural_gaps: uniqueStrings([...structuralGaps, ...identityDrift])
    },
    gaps: uniqueStrings([
      ...structuralGaps,
      ...identityDrift,
      ...windows.flatMap((window: any) =>
        stringsOf(window.gaps).map((gap) => `${window.window_id}: ${gap}`)
      )
    ]),
    missing_evidence: uniqueStrings([
      ...windows.flatMap(compactWindowMissingEvidence),
      ...compactMissingMilestones(windows)
    ]),
    time_series_readiness: {
      required_milestone_days: [0, 30, 60, 90, 180, 365],
      complete_milestone_series:
        !rollingOnly && compactMissingMilestones(windows).length === 0,
      rolling_30_day_context_only: rollingOnly,
      governed_run_reference_count: governedReferences.length,
      confidence_model_design_review_candidate:
        decision === "READY_FOR_CONFIDENCE_MODEL_DESIGN_REVIEW",
      confidence_model_feed: false,
      finance_context_investigation_feed: false,
      note:
        run?.operator_time_series_run?.time_series_readiness?.note ?? null
    },
    feeds: {
      operator_time_series_run: decision !== "BLOCKED",
      confidence_model: false,
      finance_context_investigation: false,
      customer_facing_financial_output: false
    },
    generated_at: run?.generated_at,
    derivation_version: run?.operator_time_series_run?.derivation_version ?? null
  };
}

function expectedWorkflow(run: any): any {
  return run?.operator_workflow ?? null;
}

function derivedSurfaceGaps(run: any): string[] {
  const gaps: string[] = [];
  const expectedSeries = expectedTimeSeries(run);
  if (!validationMatchesEmbedded(run?.operator_time_series_run, expectedSeries)) {
    gaps.push("operator_time_series_run must match window_runs Operator Intake runs");
  }
  const expectedWorkflowRun = expectedWorkflow(run);
  if (!validationMatchesEmbedded(run?.operator_workflow, expectedWorkflowRun)) {
    gaps.push("operator_workflow must match derived operator package children");
  }
  const expectedSummary = summaryForRun(
    run?.window_runs ?? [],
    run?.operator_time_series_run,
    run?.operator_workflow
  );
  if (!validationMatchesEmbedded(run?.validation_summary, expectedSummary)) {
    gaps.push("validation_summary must match derived package summary");
  }
  const expectedState = packageStateFromWorkflowState(run?.operator_workflow?.workflow_state);
  if (run?.package_state !== expectedState) {
    gaps.push(`package_state must match derived state ${expectedState}`);
  }
  const expectedMissing = run?.package_state === "BLOCKED"
    ? uniqueStrings([
        ...stringsOf(run?.operator_workflow?.missing_evidence),
        "OPERATOR_WORKFLOW_BLOCKED"
      ])
    : uniqueStrings(stringsOf(run?.operator_workflow?.missing_evidence));
  if (!validationMatchesEmbedded(run?.missing_evidence, expectedMissing)) {
    gaps.push("missing_evidence must match derived operator workflow gaps");
  }
  if (!validationMatchesEmbedded(run?.review_queue, run?.operator_workflow?.review_queue ?? [])) {
    gaps.push("review_queue must match operator workflow review queue");
  }
  const expectedActions = nextActionsForState(run?.package_state);
  if (!validationMatchesEmbedded(run?.recommended_next_actions, expectedActions)) {
    gaps.push("recommended_next_actions must match derived package state");
  }
  const expectedBlockedReasons = run?.package_state === "BLOCKED"
    ? uniqueStrings([
        ...stringsOf(run?.operator_workflow?.blocked_reasons),
        ...(run?.operator_time_series_validation_result?.valid === false
          ? stringsOf(run.operator_time_series_validation_result.gaps).map((gap) =>
              `operator_time_series_run: ${gap}`
            )
          : []),
        ...(run?.operator_workflow_validation_result?.valid === false
          ? stringsOf(run.operator_workflow_validation_result.gaps).map((gap) =>
              `operator_workflow: ${gap}`
            )
          : [])
      ])
    : [];
  if (!validationMatchesEmbedded(run?.blocked_reasons, expectedBlockedReasons)) {
    gaps.push("blocked_reasons must match derived package state");
  }
  if (run?.package_state === READY_STATE && run?.feeds?.operator_workflow_review !== true) {
    gaps.push("ready operator evidence package must feed operator workflow review");
  }
  if (run?.package_state !== READY_STATE && run?.feeds?.operator_workflow_review !== false) {
    gaps.push("only READY_FOR_INTERNAL_OPERATOR_WORKFLOW_REVIEW can feed operator workflow review");
  }
  if (run?.package_state === "BLOCKED") {
    if (stringsOf(run?.blocked_reasons).length === 0) {
      gaps.push("blocked operator evidence package requires blocked_reasons");
    }
    if (run?.feeds?.operator_evidence_package !== false) {
      gaps.push("blocked operator evidence package cannot feed operator_evidence_package");
    }
  }
  return gaps;
}

function workflowBindingGaps(run: any): string[] {
  const gaps: string[] = [];
  const workflow = run?.operator_workflow;
  if (!workflow) return gaps;
  const latest = latestWindowRun(run?.window_runs ?? []);
  const latestIntake = latest?.operator_intake_run ?? null;
  const latestPacket = latest?.value_hypothesis_packet ?? null;
  if (workflow?.operator_intake_status?.run_id !== (latestIntake?.run_id ?? null)) {
    gaps.push("operator_workflow.operator_intake_status.run_id must match latest window operator_intake_run.run_id");
  }
  if (workflow?.operator_intake_status?.decision !== (latestIntake?.decision ?? "BLOCKED")) {
    gaps.push("operator_workflow.operator_intake_status.decision must match latest window operator_intake_run.decision");
  }
  if (workflow?.operator_intake_status?.validation_valid !== (latestIntake?.validation_valid === true)) {
    gaps.push("operator_workflow.operator_intake_status.validation_valid must match latest window operator_intake_run.validation_valid");
  }
  if (
    workflow?.source_review_status?.source_package_review_queue_id !==
    (latestIntake?.source_package_review_queue_id ?? null)
  ) {
    gaps.push("operator_workflow.source_review_status.source_package_review_queue_id must match latest window operator_intake_run");
  }
  if (
    workflow?.measurement_cell_status?.assembly_run_id !==
    (latestIntake?.measurement_cell_assembly_run_id ?? null)
  ) {
    gaps.push("operator_workflow.measurement_cell_status.assembly_run_id must match latest window operator_intake_run");
  }
  if (
    workflow?.measurement_cell_status?.measurement_cell_id !==
    (latestIntake?.measurement_cell_id ?? null)
  ) {
    gaps.push("operator_workflow.measurement_cell_status.measurement_cell_id must match latest window operator_intake_run");
  }
  if (workflow?.time_series_status?.series_id !== (run?.operator_time_series_run?.series_id ?? null)) {
    gaps.push("operator_workflow.time_series_status.series_id must match operator_time_series_run.series_id");
  }
  if (workflow?.time_series_status?.decision !== (run?.operator_time_series_run?.decision ?? "BLOCKED")) {
    gaps.push("operator_workflow.time_series_status.decision must match operator_time_series_run.decision");
  }
  if (
    workflow?.packet_preparation_status?.packet_id !==
    (latestPacket?.packet_id ?? null)
  ) {
    gaps.push("operator_workflow.packet_preparation_status.packet_id must match latest window Value Hypothesis packet");
  }
  if (
    workflow?.packet_preparation_status?.validation_valid !==
    (latestPacket ? latestPacket.validation_valid === true : false)
  ) {
    gaps.push("operator_workflow.packet_preparation_status.validation_valid must match latest window Value Hypothesis packet");
  }
  return gaps;
}

function nestedInvalidGaps(run: any): string[] {
  const gaps: string[] = [];
  for (const window of run?.window_runs ?? []) {
    if (window?.operator_intake_validation_result?.valid === false) {
      gaps.push(...stringsOf(window.operator_intake_validation_result.gaps).map((gap) =>
        `window_runs.${window.window_id}.operator_intake_run: ${gap}`
      ));
    }
    if (window?.value_hypothesis_packet_validation_result?.valid === false) {
      gaps.push(...stringsOf(window.value_hypothesis_packet_validation_result.gaps).map((gap) =>
        `window_runs.${window.window_id}.value_hypothesis_packet: ${gap}`
      ));
    }
  }
  if (run?.operator_time_series_validation_result?.valid === false) {
    gaps.push(...stringsOf(run.operator_time_series_validation_result.gaps).map((gap) =>
      `operator_time_series_run: ${gap}`
    ));
  }
  if (run?.operator_workflow_validation_result?.valid === false) {
    gaps.push(...stringsOf(run.operator_workflow_validation_result.gaps).map((gap) =>
      `operator_workflow: ${gap}`
    ));
  }
  return gaps;
}

export function validateOperatorEvidencePackageRun(
  run: any
): OperatorEvidencePackageRunValidationResult {
  const gaps = [
    ...topLevelGaps(run),
    ...policyGaps(run),
    ...identityGaps(run),
    ...measurementPlanBindingGaps(run),
    ...windowBindingGaps(run),
    ...recomputedWindowValidationGaps(run),
    ...recomputedChildGaps(run),
    ...derivedSurfaceGaps(run),
    ...workflowBindingGaps(run),
    ...nestedInvalidGaps(run)
  ];
  const valid = gaps.length === 0 && run?.package_state !== "BLOCKED";
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    run_id: run?.run_id ?? null,
    package_id: run?.package_id ?? null,
    org_id: run?.org_id ?? null,
    client_id: run?.client_id ?? null,
    valid,
    gaps,
    feeds: feedState(run, valid)
  };
}
