/**
 * AI Value Engine - Operator Intake Adapter.
 *
 * Contract-only composer for operator-selected, already-parsed aggregate-safe
 * source objects. It builds the governed pipe across Data Spine Readiness,
 * Source Package Review Queue, Real Data Intake Packet Run, and Measurement
 * Cell Assembly Run. It does not parse files, run BigQuery, persist source
 * data, create routes/UI, compute confidence, calculate ROI, prove causality,
 * emit productivity claims, or create customer-facing financial output.
 */

import {
  buildDataSpineIntakeReadiness,
  validateDataSpineIntakeReadiness,
  type BuildDataSpineIntakeReadinessInput,
  type DataSpineIntakeReadinessValidationResult
} from "./dataSpineReadiness";
import {
  buildMeasurementCellAssemblyRun,
  validateMeasurementCellAssemblyRun,
  type MeasurementCellAssemblyRunValidationResult
} from "./measurementCellAssemblyRunner";
import {
  buildRealDataIntakePacketRun,
  validateRealDataIntakePacketRun,
  type RealDataIntakePacketRunValidationResult
} from "./realDataIntakePacketRunner";
import {
  buildSourcePackageReviewQueue,
  validateSourcePackageReviewQueue,
  type SourcePackageReviewQueueValidationResult
} from "./sourcePackageReviewQueue";
import { validateMeasurementPlan } from "./measurementPlan";

export const AI_VALUE_OPERATOR_INTAKE_ADAPTER_RUN_SCHEMA_VERSION =
  "FT_AI_VALUE_OPERATOR_INTAKE_ADAPTER_RUN_2026_06";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_OPERATOR_INTAKE_ADAPTER_RUN_VALIDATION_2026_06";

const DERIVATION_VERSION =
  "ai_value_operator_intake_adapter_2026_06";

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

const ALLOWED_DECISIONS = new Set([
  "READY_FOR_VALUE_HYPOTHESIS_PACKET_PREPARATION",
  "HELD_FOR_DATA_SPINE",
  "HELD_FOR_SOURCE_PACKAGE_REVIEW",
  "HELD_FOR_REAL_DATA_INTAKE",
  "HELD_FOR_MEASUREMENT_CELL_ASSEMBLY",
  "BLOCKED"
]);

const ALLOWED_TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "run_id",
  "org_id",
  "client_id",
  "measurement_plan_id",
  "workflow_family",
  "function_area",
  "cohort_key",
  "decision",
  "data_spine_readiness",
  "data_spine_validation_result",
  "source_package_review_queue",
  "source_package_review_validation_result",
  "real_data_intake_packet_run",
  "real_data_intake_validation_result",
  "measurement_cell_assembly_run",
  "measurement_cell_assembly_validation_result",
  "gaps",
  "missing_evidence",
  "time_series_readiness",
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

const VALIDATED_CHILD_OBJECT_FIELDS = new Set([
  "data_spine_readiness",
  "data_spine_validation_result",
  "source_package_review_queue",
  "source_package_review_validation_result",
  "real_data_intake_packet_run",
  "real_data_intake_validation_result",
  "measurement_cell_assembly_run",
  "measurement_cell_assembly_validation_result"
]);

const FALSE_BOUNDARY_CONTAINERS = new Set([
  "boundary_policy",
  "feeds",
  "persistence_policy",
  "privacy_boundary",
  "value_proof_policy"
]);

const PRIVACY_AND_RAW_VALUE_PATTERNS = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /(?:^|_)(?:user|employee|person|direct|manager)_(?:id|identifier|email)(?:_|$)/i,
  /(?:^|_)(?:user|employee|person|direct|manager)_[a-z]*\d[a-z0-9]*(?:_|$)/i,
  /(?:^|_)(?:hashed|joinable)_(?:id|identifier|user|person|employee)(?:_|$)/i,
  /(?:^|_)raw_(?:rows?|files?|prompt|response|transcript|content|events?)(?:_|$)/i,
  /(?:^|_)(?:prompt|transcript)(?:_|$)/i,
  /(?:^|_)select(?:_|$)/i,
  /(?:^|_)from_raw(?:_|$)/i,
  /(?:^|_)sql_text(?:_|$)/i,
  /(?:^|_)bigquery_sql(?:_|$)/i,
  /(?:^|_)file_contents?(?:_|$)/i,
  /(?:^|_)response_(?:text|body|content|message|raw|value)(?:_|$)/i,
  /(?:^|_)llm_response(?:_|$)/i
];

const CAVEAT_IDENTIFIER_VALUE_PATTERNS = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /(?:^|_)(?:user|employee|person|direct|manager)_(?:id|identifier|email)(?:_|$)/i,
  /(?:^|_)(?:user|employee|person|direct|manager)_[a-z]*\d[a-z0-9]*(?:_|$)/i,
  /(?:^|_)(?:hashed|joinable)_(?:id|identifier|user|person|employee)(?:_|$)/i
];

const UNSAFE_CLAIM_VALUE_PATTERNS = [
  /\bproved?\s+(?:roi|savings|financial impact|ebita|ebitda|productivity|causality)\b/i,
  /\b(?:roi|savings|ebita|ebitda|financial impact|productivity lift)\b.{0,48}\b(?:due to|caused by|attributed to|from ai|by ai)\b/i,
  /\b\d{1,3}%\s+(?:confidence|probability)\b/i,
  /\b(?:confidence|probability)\s*(?:score|level)?\s*(?:of|=|:)?\s*0?\.\d+\b/i,
  /\battribution\s+probability\b/i,
  /\bcustomer[-_\s]?facing\s+(?:financial|economic)\s+output\s+(?:allowed|ready|approved)\b/i
];

export interface BuildOperatorIntakeAdapterRunInput {
  orgId: string;
  clientId: string;
  workflowFamily: string;
  functionArea: string;
  cohortKey: string;
  baselineWindow: any;
  comparisonWindow: any;
  sources: BuildDataSpineIntakeReadinessInput["sources"];
  measurementPlan: any;
  sourcePackages?: any[];
  scrubbedGleanExports?: any[];
  measurementCellInput: any;
  runId?: string;
  generatedAt?: string;
}

export interface OperatorIntakeAdapterRunValidationResult {
  schema_version: string;
  run_id: string | null;
  org_id: string | null;
  client_id: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    data_spine_readiness: boolean;
    source_package_review_queue: boolean;
    real_data_intake_packet_run: boolean;
    measurement_cell_assembly_run: boolean;
    value_hypothesis_packet_runner: false;
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

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function validationMatchesEmbedded(embedded: any, recomputed: any): boolean {
  return JSON.stringify(embedded) === JSON.stringify(recomputed);
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
    if (path.length === 0 && VALIDATED_CHILD_OBJECT_FIELDS.has(normalized)) {
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

function isValidatedChildObjectPath(path: string[]): boolean {
  return path.length > 0 && VALIDATED_CHILD_OBJECT_FIELDS.has(normalizeKey(path[0]));
}

function isValueCheckExemptPath(path: string[]): boolean {
  const normalizedPath = path.map(normalizeKey);
  return normalizedPath[0] === "blocked_uses" ||
    normalizedPath[0] === "boundary_policy" ||
    isValidatedChildObjectPath(normalizedPath);
}

function valuePatternsForPath(path: string[]): RegExp[] {
  const normalizedPath = path.map(normalizeKey);
  if (normalizedPath[0] === "required_caveats") {
    return CAVEAT_IDENTIFIER_VALUE_PATTERNS;
  }
  return [
    ...PRIVACY_AND_RAW_VALUE_PATTERNS,
    ...UNSAFE_CLAIM_VALUE_PATTERNS
  ];
}

function collectForbiddenValues(
  value: any,
  values: Set<string> = new Set(),
  path: string[] = []
): Set<string> {
  if (typeof value === "string") {
    if (!isValueCheckExemptPath(path)) {
      const normalizedValue = normalizeKey(value);
      if (
        valuePatternsForPath(path).some((pattern) =>
          pattern.test(value) || pattern.test(normalizedValue)
        )
      ) {
        values.add(path.join(".") || "<root>");
      }
    }
    return values;
  }
  if (!value || typeof value !== "object") return values;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectForbiddenValues(item, values, [...path, String(index)])
    );
    return values;
  }
  for (const [key, nested] of Object.entries(value)) {
    collectForbiddenValues(nested, values, [...path, key]);
  }
  return values;
}

function falseFeeds(): OperatorIntakeAdapterRunValidationResult["feeds"] {
  return {
    data_spine_readiness: false,
    source_package_review_queue: false,
    real_data_intake_packet_run: false,
    measurement_cell_assembly_run: false,
    value_hypothesis_packet_runner: false,
    finance_context_investigation: false,
    confidence_model: false,
    customer_facing_financial_output: false
  };
}

function feedsForDecision(
  decision: string,
  validations: {
    dataSpine: DataSpineIntakeReadinessValidationResult | null;
    queue: SourcePackageReviewQueueValidationResult | null;
    realData: RealDataIntakePacketRunValidationResult | null;
    assembly: MeasurementCellAssemblyRunValidationResult | null;
  }
): OperatorIntakeAdapterRunValidationResult["feeds"] {
  return {
    data_spine_readiness: validations.dataSpine?.valid === true,
    source_package_review_queue: validations.queue?.valid === true,
    real_data_intake_packet_run: validations.realData?.valid === true,
    measurement_cell_assembly_run:
      decision === "READY_FOR_VALUE_HYPOTHESIS_PACKET_PREPARATION" &&
      validations.assembly?.valid === true &&
      validations.assembly.feeds.value_hypothesis_packet_runner === true,
    value_hypothesis_packet_runner: false,
    finance_context_investigation: false,
    confidence_model: false,
    customer_facing_financial_output: false
  };
}

function feedState(
  run: any,
  valid: boolean,
  recomputedFeeds: OperatorIntakeAdapterRunValidationResult["feeds"]
): OperatorIntakeAdapterRunValidationResult["feeds"] {
  if (!valid) return falseFeeds();
  return recomputedFeeds;
}

function baseRunId(input: BuildOperatorIntakeAdapterRunInput): string {
  return input.runId ??
    `operator_intake_adapter_run_${safeIdPart(input.orgId ?? "unknown_org")}_${safeIdPart(input.workflowFamily ?? "unknown_workflow")}`;
}

function collectTopLevelGaps(run: any): string[] {
  const gaps: string[] = [];
  if (!run || typeof run !== "object" || Array.isArray(run)) {
    return ["operator intake adapter run must be an object"];
  }
  for (const field of [
    "schema_version",
    "run_id",
    "org_id",
    "client_id",
    "measurement_plan_id",
    "workflow_family",
    "function_area",
    "cohort_key",
    "decision",
    "data_spine_readiness",
    "data_spine_validation_result",
    "source_package_review_queue",
    "source_package_review_validation_result",
    "real_data_intake_packet_run",
    "real_data_intake_validation_result",
    "measurement_cell_assembly_run",
    "measurement_cell_assembly_validation_result",
    "gaps",
    "missing_evidence",
    "time_series_readiness",
    "feeds",
    "allowed_uses",
    "blocked_uses",
    "boundary_policy",
    "required_caveats",
    "generated_at",
    "derivation_version"
  ]) {
    requireField(run?.[field], field, gaps);
  }
  if (
    run?.schema_version &&
    run.schema_version !== AI_VALUE_OPERATOR_INTAKE_ADAPTER_RUN_SCHEMA_VERSION
  ) {
    gaps.push(`schema_version is invalid: ${run.schema_version}`);
  }
  if (run?.decision && !ALLOWED_DECISIONS.has(String(run.decision))) {
    gaps.push(`decision is invalid: ${run.decision}`);
  }
  for (const field of Object.keys(run ?? {})) {
    if (!ALLOWED_TOP_LEVEL_FIELDS.has(field)) {
      gaps.push(`Unsupported operator intake adapter run field: ${field}`);
    }
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
  for (const field of [
    "value_hypothesis_packet_runner",
    "finance_context_investigation",
    "confidence_model",
    "customer_facing_financial_output"
  ]) {
    if (run?.feeds?.[field] !== false) {
      gaps.push(`feeds.${field} must be false`);
    }
  }
  for (const field of [...collectForbiddenFields(run)].sort()) {
    gaps.push(`Forbidden field detected: ${field}`);
  }
  for (const value of [...collectForbiddenValues(run)].sort()) {
    gaps.push(`Forbidden value detected: ${value}`);
  }
  return gaps;
}

function collectFeedConsistencyGaps(
  run: any,
  recomputedFeeds: OperatorIntakeAdapterRunValidationResult["feeds"]
): string[] {
  const gaps: string[] = [];
  for (const [field, expected] of Object.entries(recomputedFeeds)) {
    if (run?.feeds?.[field] !== expected) {
      gaps.push(`feeds.${field} must match recomputed operator intake decision`);
    }
  }
  return gaps;
}

function collectBindingGaps(run: any): string[] {
  const gaps: string[] = [];
  const spine = run?.data_spine_readiness;
  const queue = run?.source_package_review_queue;
  const realData = run?.real_data_intake_packet_run;
  const assembly = run?.measurement_cell_assembly_run;
  const planId = run?.measurement_plan_id;
  for (const [label, object] of [
    ["source_package_review_queue", queue],
    ["real_data_intake_packet_run", realData],
    ["measurement_cell_assembly_run", assembly]
  ] as const) {
    if (!object) continue;
    if (object.org_id !== run?.org_id) {
      gaps.push(`${label}.org_id must match operator intake adapter run org_id`);
    }
    if (object.client_id !== run?.client_id) {
      gaps.push(`${label}.client_id must match operator intake adapter run client_id`);
    }
    if (object.workflow_family !== run?.workflow_family) {
      gaps.push(`${label}.workflow_family must match operator intake adapter run workflow_family`);
    }
  }
  if (queue?.data_spine_readiness_id !== spine?.data_spine_readiness_id) {
    gaps.push("source_package_review_queue.data_spine_readiness_id must match Data Spine");
  }
  if (realData?.measurement_plan_id !== planId) {
    gaps.push("real_data_intake_packet_run.measurement_plan_id must match operator measurement_plan_id");
  }
  if (assembly?.measurement_plan_id !== planId) {
    gaps.push("measurement_cell_assembly_run.measurement_plan_id must match operator measurement_plan_id");
  }
  if (
    assembly?.data_spine_readiness?.data_spine_readiness_id !==
    spine?.data_spine_readiness_id
  ) {
    gaps.push("measurement_cell_assembly_run must bind to the same Data Spine");
  }
  if (
    assembly?.source_package_review_queue?.source_package_review_queue_id !==
    queue?.source_package_review_queue_id
  ) {
    gaps.push("measurement_cell_assembly_run must bind to the same Source Package Review Queue");
  }
  if (assembly?.real_data_intake_packet_run?.run_id !== realData?.run_id) {
    gaps.push("measurement_cell_assembly_run must bind to the same Real Data Intake Packet Run");
  }
  return gaps;
}

function collectDecisionGaps(
  run: any,
  dataSpineValidation: DataSpineIntakeReadinessValidationResult | null,
  queueValidation: SourcePackageReviewQueueValidationResult | null,
  realDataValidation: RealDataIntakePacketRunValidationResult | null,
  assemblyValidation: MeasurementCellAssemblyRunValidationResult | null
): string[] {
  const gaps: string[] = [];
  const decision = String(run?.decision ?? "");
  const queueState = run?.source_package_review_queue?.queue_state;
  const realDataDecision = run?.real_data_intake_packet_run?.decision;
  const assemblyDecision = run?.measurement_cell_assembly_run?.decision;

  if (decision === "READY_FOR_VALUE_HYPOTHESIS_PACKET_PREPARATION") {
    if (!dataSpineValidation?.valid || !dataSpineValidation.feeds.measurement_cell_input) {
      gaps.push("ready operator intake requires a valid Data Spine that can feed Measurement Cell input");
    }
    if (!queueValidation?.valid || queueState !== "DATA_SPINE_REVIEW_READY") {
      gaps.push("ready operator intake requires a valid DATA_SPINE_REVIEW_READY Source Package Review Queue");
    }
    if (!realDataValidation?.valid || realDataDecision !== "READY_FOR_MEASUREMENT_CELL_ASSEMBLY") {
      gaps.push("ready operator intake requires a valid Real Data Intake Packet Run ready for Measurement Cell assembly");
    }
    if (
      !assemblyValidation?.valid ||
      assemblyDecision !== "READY_FOR_VALUE_HYPOTHESIS_PACKET_RUNNER" ||
      assemblyValidation.feeds.value_hypothesis_packet_runner !== true
    ) {
      gaps.push("ready operator intake requires a validated Measurement Cell Assembly Run");
    }
  }

  if (
    decision === "HELD_FOR_SOURCE_PACKAGE_REVIEW" &&
    queueState === "DATA_SPINE_REVIEW_READY"
  ) {
    gaps.push("HELD_FOR_SOURCE_PACKAGE_REVIEW requires an uncleared Source Package Review Queue");
  }
  if (
    decision === "HELD_FOR_REAL_DATA_INTAKE" &&
    realDataDecision === "READY_FOR_MEASUREMENT_CELL_ASSEMBLY"
  ) {
    gaps.push("HELD_FOR_REAL_DATA_INTAKE requires an uncleared Real Data Intake Packet Run");
  }
  if (
    decision === "HELD_FOR_MEASUREMENT_CELL_ASSEMBLY" &&
    assemblyDecision === "READY_FOR_VALUE_HYPOTHESIS_PACKET_RUNNER"
  ) {
    gaps.push("HELD_FOR_MEASUREMENT_CELL_ASSEMBLY requires an uncleared Measurement Cell Assembly Run");
  }
  if (
    decision !== "READY_FOR_VALUE_HYPOTHESIS_PACKET_PREPARATION" &&
    run?.feeds?.measurement_cell_assembly_run === true
  ) {
    gaps.push("held or blocked operator intake runs cannot feed Measurement Cell Assembly");
  }
  return gaps;
}

function invalidNestedValidationGaps(
  dataSpineValidation: DataSpineIntakeReadinessValidationResult,
  queueValidation: SourcePackageReviewQueueValidationResult,
  realDataValidation: RealDataIntakePacketRunValidationResult,
  assemblyValidation: MeasurementCellAssemblyRunValidationResult
): string[] {
  return [
    ...(!dataSpineValidation.valid
      ? dataSpineValidation.gaps.map((gap) => `data_spine_readiness: ${gap}`)
      : []),
    ...(!queueValidation.valid
      ? queueValidation.gaps.map((gap) => `source_package_review_queue: ${gap}`)
      : []),
    ...(!realDataValidation.valid
      ? realDataValidation.gaps.map((gap) => `real_data_intake_packet_run: ${gap}`)
      : []),
    ...(!assemblyValidation.valid
      ? assemblyValidation.gaps.map((gap) => `measurement_cell_assembly_run: ${gap}`)
      : [])
  ];
}

function operatorDecision(
  dataSpineValidation: DataSpineIntakeReadinessValidationResult,
  queueValidation: SourcePackageReviewQueueValidationResult,
  realDataValidation: RealDataIntakePacketRunValidationResult,
  assemblyValidation: MeasurementCellAssemblyRunValidationResult,
  queue: any,
  realDataRun: any,
  assemblyRun: any
): string {
  if (!dataSpineValidation.valid) return "BLOCKED";
  if (!dataSpineValidation.feeds.measurement_cell_input) return "HELD_FOR_DATA_SPINE";
  if (!queueValidation.valid) return "BLOCKED";
  if (queue.queue_state !== "DATA_SPINE_REVIEW_READY") {
    return "HELD_FOR_SOURCE_PACKAGE_REVIEW";
  }
  if (!realDataValidation.valid) return "BLOCKED";
  if (realDataRun.decision !== "READY_FOR_MEASUREMENT_CELL_ASSEMBLY") {
    return "HELD_FOR_REAL_DATA_INTAKE";
  }
  if (!assemblyValidation.valid) return "BLOCKED";
  if (assemblyRun.decision !== "READY_FOR_VALUE_HYPOTHESIS_PACKET_RUNNER") {
    return "HELD_FOR_MEASUREMENT_CELL_ASSEMBLY";
  }
  return "READY_FOR_VALUE_HYPOTHESIS_PACKET_PREPARATION";
}

export function buildOperatorIntakeAdapterRun(
  input: BuildOperatorIntakeAdapterRunInput
): any {
  const measurementPlanValidation = validateMeasurementPlan(input.measurementPlan);
  const dataSpineReadiness = buildDataSpineIntakeReadiness({
    orgId: input.orgId,
    clientId: input.clientId,
    workflowFamily: input.workflowFamily,
    functionArea: input.functionArea,
    cohortKey: input.cohortKey,
    baselineWindow: input.baselineWindow,
    comparisonWindow: input.comparisonWindow,
    sources: input.sources,
    generatedAt: input.generatedAt
  });
  const dataSpineValidation = validateDataSpineIntakeReadiness(dataSpineReadiness);
  const sourcePackageReviewQueue = buildSourcePackageReviewQueue({
    dataSpineReadiness,
    sourcePackages: input.sourcePackages ?? [],
    generatedAt: input.generatedAt
  });
  const queueValidation = validateSourcePackageReviewQueue(sourcePackageReviewQueue);
  const realDataRun = buildRealDataIntakePacketRun({
    dataSpineReadiness,
    measurementPlan: input.measurementPlan,
    scrubbedGleanExports: input.scrubbedGleanExports ?? [],
    runId: `${baseRunId(input)}_real_data_intake`,
    generatedAt: input.generatedAt
  });
  const realDataValidation = validateRealDataIntakePacketRun(realDataRun);
  const assemblyRun = buildMeasurementCellAssemblyRun({
    dataSpineReadiness,
    measurementPlan: input.measurementPlan,
    sourcePackageReviewQueue,
    realDataIntakePacketRun: realDataRun,
    measurementCellInput: input.measurementCellInput,
    runId: `${baseRunId(input)}_measurement_cell_assembly`,
    generatedAt: input.generatedAt
  });
  const assemblyValidation = validateMeasurementCellAssemblyRun(assemblyRun);
  const decision = measurementPlanValidation.valid
    ? operatorDecision(
        dataSpineValidation,
        queueValidation,
        realDataValidation,
        assemblyValidation,
        sourcePackageReviewQueue,
        realDataRun,
        assemblyRun
      )
    : "BLOCKED";
  const gaps = uniqueStrings([
    ...measurementPlanValidation.gaps.map((gap) => `measurement_plan: ${gap}`),
    ...invalidNestedValidationGaps(
      dataSpineValidation,
      queueValidation,
      realDataValidation,
      assemblyValidation
    )
  ]);
  const feeds = feedsForDecision(decision, {
    dataSpine: dataSpineValidation,
    queue: queueValidation,
    realData: realDataValidation,
    assembly: assemblyValidation
  });

  return {
    schema_version: AI_VALUE_OPERATOR_INTAKE_ADAPTER_RUN_SCHEMA_VERSION,
    run_id: baseRunId(input),
    org_id: input.orgId,
    client_id: input.clientId,
    measurement_plan_id: input.measurementPlan?.measurement_plan_id ?? null,
    workflow_family: input.workflowFamily,
    function_area: input.functionArea,
    cohort_key: input.cohortKey,
    decision,
    data_spine_readiness: dataSpineReadiness,
    data_spine_validation_result: dataSpineValidation,
    source_package_review_queue: sourcePackageReviewQueue,
    source_package_review_validation_result: queueValidation,
    real_data_intake_packet_run: realDataRun,
    real_data_intake_validation_result: realDataValidation,
    measurement_cell_assembly_run: assemblyRun,
    measurement_cell_assembly_validation_result: assemblyValidation,
    gaps,
    missing_evidence: uniqueStrings([
      ...stringsOf(dataSpineReadiness.missing_evidence),
      ...stringsOf(sourcePackageReviewQueue.missing_evidence),
      ...stringsOf(realDataRun.missing_evidence),
      ...stringsOf(assemblyRun.missing_evidence)
    ]),
    time_series_readiness: {
      governed_run_reference_ready:
        decision === "READY_FOR_VALUE_HYPOTHESIS_PACKET_PREPARATION",
      window_mode:
        assemblyRun.measurement_cell?.time_window?.window_mode ??
        input.measurementCellInput?.timeWindow?.window_mode ??
        "milestone",
      baseline_window: input.baselineWindow,
      comparison_window: input.comparisonWindow,
      measurement_cell_id:
        assemblyRun.measurement_cell?.measurement_cell_id ?? null,
      measurement_cell_assembly_run_id: assemblyRun.run_id,
      confidence_model_feed: false,
      finance_context_investigation_feed: false,
      note:
        "Governed time-series run references are prepared for later review only; no confidence model or finance-context feed is emitted by this adapter."
    },
    feeds,
    allowed_uses: [
      "operator_intake_review",
      "governed_time_series_run_reference_preparation",
      "measurement_cell_assembly_preparation"
    ],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    boundary_policy: Object.fromEntries(
      REQUIRED_FALSE_BOUNDARY_FIELDS.map((field) => [field, false])
    ),
    required_caveats: [
      "Operator Intake Adapter composes already-parsed aggregate-safe source objects only.",
      "The adapter does not parse files, run BigQuery, store raw rows, create routes/UI, persist source data, or create Value Hypothesis packets directly.",
      "Valid output may produce governed time-series run references for later review, but it is not finance-context investigation readiness.",
      "Later confidence modeling is not authorized by this adapter and would require a separately promoted contract.",
      "No ROI, EBITA, EBITDA, causality, productivity, financial attribution, confidence percentage, probability, person-level output, ranking, or customer-facing financial output is produced."
    ],
    generated_at: input.generatedAt ?? new Date(0).toISOString(),
    derivation_version: DERIVATION_VERSION
  };
}

export function validateOperatorIntakeAdapterRun(
  run: any
): OperatorIntakeAdapterRunValidationResult {
  const dataSpineValidation = run?.data_spine_readiness
    ? validateDataSpineIntakeReadiness(run.data_spine_readiness)
    : null;
  const queueValidation = run?.source_package_review_queue
    ? validateSourcePackageReviewQueue(run.source_package_review_queue)
    : null;
  const realDataValidation = run?.real_data_intake_packet_run
    ? validateRealDataIntakePacketRun(run.real_data_intake_packet_run)
    : null;
  const assemblyValidation = run?.measurement_cell_assembly_run
    ? validateMeasurementCellAssemblyRun(run.measurement_cell_assembly_run)
    : null;
  const blockedDecision = run?.decision === "BLOCKED";
  const nestedInvalid =
    dataSpineValidation?.valid === false ||
    queueValidation?.valid === false ||
    realDataValidation?.valid === false ||
    assemblyValidation?.valid === false;
  const recomputedFeeds = feedsForDecision(String(run?.decision ?? ""), {
    dataSpine: dataSpineValidation,
    queue: queueValidation,
    realData: realDataValidation,
    assembly: assemblyValidation
  });
  const gaps = [
    ...collectTopLevelGaps(run),
    ...collectPolicyGaps(run),
    ...collectFeedConsistencyGaps(run, recomputedFeeds),
    ...collectBindingGaps(run),
    ...collectDecisionGaps(
      run,
      dataSpineValidation,
      queueValidation,
      realDataValidation,
      assemblyValidation
    ),
    ...(dataSpineValidation && queueValidation && realDataValidation && assemblyValidation
      ? invalidNestedValidationGaps(
          dataSpineValidation,
          queueValidation,
          realDataValidation,
          assemblyValidation
        )
      : []),
    ...(dataSpineValidation && !validationMatchesEmbedded(run?.data_spine_validation_result, dataSpineValidation)
      ? ["data_spine_validation_result must match recomputed Data Spine validation"]
      : []),
    ...(queueValidation && !validationMatchesEmbedded(run?.source_package_review_validation_result, queueValidation)
      ? ["source_package_review_validation_result must match recomputed Source Package Review Queue validation"]
      : []),
    ...(realDataValidation && !validationMatchesEmbedded(run?.real_data_intake_validation_result, realDataValidation)
      ? ["real_data_intake_validation_result must match recomputed Real Data Intake validation"]
      : []),
    ...(assemblyValidation && !validationMatchesEmbedded(run?.measurement_cell_assembly_validation_result, assemblyValidation)
      ? ["measurement_cell_assembly_validation_result must match recomputed Measurement Cell Assembly validation"]
      : []),
    ...(blockedDecision || nestedInvalid
      ? ["blocked or invalid operator intake adapter runs cannot validate"]
      : [])
  ];
  const valid = gaps.length === 0;
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    run_id: run?.run_id ?? null,
    org_id: run?.org_id ?? null,
    client_id: run?.client_id ?? null,
    valid,
    gaps,
    feeds: feedState(run, valid, recomputedFeeds)
  };
}
