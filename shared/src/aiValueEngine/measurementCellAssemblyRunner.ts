/**
 * AI Value Engine - Measurement Cell Assembly Runner.
 *
 * Contract-only runner that assembles a Measurement Cell from aligned Data
 * Spine Readiness plus validated aggregate source objects. It reuses the
 * existing Measurement Cell builder and validator; it does not parse uploads,
 * run BigQuery, create routes/UI, persist objects, create packets directly, or
 * emit ROI, causality, productivity, financial attribution, confidence, or
 * probability.
 */

import {
  buildMeasurementCell,
  validateMeasurementCell,
  type BuildMeasurementCellInput,
  type MeasurementCellValidationResult
} from "./measurementCell";
import {
  validateDataSpineIntakeReadiness,
  type DataSpineIntakeReadinessValidationResult
} from "./dataSpineReadiness";
import {
  validateMeasurementPlan,
  type MeasurementPlanValidationResult
} from "./measurementPlan";
import {
  validateRealDataIntakePacketRun,
  type RealDataIntakePacketRunValidationResult
} from "./realDataIntakePacketRunner";
import {
  validateSourcePackageReviewQueue,
  type SourcePackageReviewQueueValidationResult
} from "./sourcePackageReviewQueue";

export const AI_VALUE_MEASUREMENT_CELL_ASSEMBLY_RUN_SCHEMA_VERSION =
  "FT_AI_VALUE_MEASUREMENT_CELL_ASSEMBLY_RUN_2026_06";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_MEASUREMENT_CELL_ASSEMBLY_RUN_VALIDATION_2026_06";

const DERIVATION_VERSION =
  "ai_value_measurement_cell_assembly_runner_2026_06";

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
  "runs_bigquery",
  "parses_uploaded_documents",
  "creates_value_hypothesis_packet",
  "customer_facing_financial_output"
];

const ALLOWED_DECISIONS = new Set([
  "READY_FOR_VALUE_HYPOTHESIS_PACKET_RUNNER",
  "HELD_FOR_DATA_SPINE",
  "HELD_FOR_SOURCE_PACKAGE_REVIEW",
  "HELD_FOR_REAL_DATA_INTAKE",
  "HELD_FOR_MEASUREMENT_CELL",
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
  "measurement_plan",
  "measurement_plan_validation_result",
  "data_spine_readiness",
  "data_spine_validation_result",
  "source_package_review_queue",
  "source_package_review_validation_result",
  "real_data_intake_packet_run",
  "real_data_intake_validation_result",
  "measurement_cell_input",
  "measurement_cell",
  "measurement_cell_validation_result",
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
  /^roi_bot_assumptions?$/i,
  /^roi_sheet_assumptions?$/i,
  /^roi$/i,
  /realized_roi/i,
  /^ebita$/i,
  /^ebitda$/i,
  /financial_attribution/i,
  /^financial_output$/i,
  /^customer_facing_financial_output$/i,
  /customer_facing_(?:financial|economic)_output_allowed/i,
  /financial_output_allowed/i,
  /^persisted$/i,
  /^creates_(?:migrations|prisma_schema|backend_routes?|frontend_ui|ingestion_jobs)$/i,
  /^backend_routes?$/i,
  /^backend_route$/i,
  /^frontend_ui$/i,
  /^persistence_table$/i,
  /^schema_ref$/i
];

const GOVERNED_KEY_ALLOWLIST = new Set([
  "blocked_uses",
  "boundary_policy",
  "value_proof_policy",
  "persistence_policy",
  "source_refs"
]);

const FALSE_BOUNDARY_CONTAINERS = new Set([
  "boundary_policy",
  "claim_boundary",
  "financial_boundary",
  "persistence_policy",
  "privacy_boundary",
  "value_proof_policy",
  "feeds"
]);

export interface BuildMeasurementCellAssemblyRunInput {
  dataSpineReadiness: any;
  measurementPlan?: any | null;
  measurementCellInput: BuildMeasurementCellInput & Record<string, any>;
  sourcePackageReviewQueue?: any | null;
  realDataIntakePacketRun?: any | null;
  runId?: string;
  generatedAt?: string;
}

export interface MeasurementCellAssemblyRunValidationResult {
  schema_version: string;
  run_id: string | null;
  org_id: string | null;
  client_id: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    measurement_cell: boolean;
    value_hypothesis_packet_runner: boolean;
    business_owner_metric_review: boolean;
    finance_context_investigation_planning: boolean;
    bayesian_research_design_planning: boolean;
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

function sameWindow(left: any, right: any): boolean {
  return left?.window_start === right?.window_start &&
    left?.window_end === right?.window_end;
}

function falseFeeds(): MeasurementCellAssemblyRunValidationResult["feeds"] {
  return {
    measurement_cell: false,
    value_hypothesis_packet_runner: false,
    business_owner_metric_review: false,
    finance_context_investigation_planning: false,
    bayesian_research_design_planning: false,
    customer_facing_financial_output: false
  };
}

function feedsFromCell(
  cellValidation: MeasurementCellValidationResult | null
): MeasurementCellAssemblyRunValidationResult["feeds"] {
  if (!cellValidation?.valid) return falseFeeds();
  return {
    measurement_cell: true,
    value_hypothesis_packet_runner:
      cellValidation.feeds.value_hypothesis_readiness_input,
    business_owner_metric_review:
      cellValidation.feeds.business_owner_metric_review,
    finance_context_investigation_planning:
      cellValidation.feeds.finance_context_investigation_planning,
    bayesian_research_design_planning:
      cellValidation.feeds.bayesian_research_design_planning,
    customer_facing_financial_output: false
  };
}

function getPath(value: any, path: string): any {
  return path.split(".").reduce((acc: any, part: string) => acc?.[part], value);
}

function measurementPlanOf(input: BuildMeasurementCellAssemblyRunInput): any | null {
  return input.measurementPlan ?? input.realDataIntakePacketRun?.measurement_plan ?? null;
}

function orgIdOf(plan: any): string | null {
  return typeof plan?.org_id === "string" ? plan.org_id : null;
}

function workflowFamilyOf(plan: any): string | null {
  return typeof plan?.workflow_scope?.workflow_family === "string"
    ? plan.workflow_scope.workflow_family
    : null;
}

function workflowIdOf(plan: any): string | null {
  return typeof plan?.workflow_scope?.workflow_id === "string"
    ? plan.workflow_scope.workflow_id
    : null;
}

function functionAreaOf(plan: any): string | null {
  return typeof plan?.workflow_scope?.function_area === "string"
    ? plan.workflow_scope.function_area
    : null;
}

function primaryMetricIdOf(plan: any): string | null {
  return typeof plan?.metric_selection?.primary_metric?.metric_id === "string"
    ? plan.metric_selection.primary_metric.metric_id
    : null;
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

function validationMatchesEmbedded(embedded: any, recomputed: any): boolean {
  return JSON.stringify(embedded ?? null) === JSON.stringify(recomputed ?? null);
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
    `Forbidden measurement cell input field detected: ${field}`
  );
}

function collectTopLevelGaps(run: any): string[] {
  const gaps: string[] = [];
  if (!run || typeof run !== "object" || Array.isArray(run)) {
    return ["measurement cell assembly run must be an object"];
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
    "measurement_plan",
    "measurement_plan_validation_result",
    "data_spine_readiness",
    "data_spine_validation_result",
    "source_package_review_queue",
    "source_package_review_validation_result",
    "measurement_cell_input",
    "measurement_cell_validation_result",
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
    run.schema_version !== AI_VALUE_MEASUREMENT_CELL_ASSEMBLY_RUN_SCHEMA_VERSION
  ) {
    gaps.push(`schema_version is invalid: ${run.schema_version}`);
  }
  if (run?.decision && !ALLOWED_DECISIONS.has(String(run.decision))) {
    gaps.push(`decision is invalid: ${run.decision}`);
  }
  for (const field of Object.keys(run ?? {})) {
    if (!ALLOWED_TOP_LEVEL_FIELDS.has(field)) {
      gaps.push(`Unsupported measurement cell assembly run field: ${field}`);
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
  if (run?.feeds?.customer_facing_financial_output !== false) {
    gaps.push("feeds.customer_facing_financial_output must be false");
  }
  if (run?.boundary_policy?.creates_value_hypothesis_packet !== false) {
    gaps.push("boundary_policy.creates_value_hypothesis_packet must be false");
  }
  for (const field of [...collectForbiddenFields(run)].sort()) {
    gaps.push(`Forbidden field detected: ${field}`);
  }
  return gaps;
}

function sourceRefOf(spine: any, sourceKey: string): string | null {
  return spine?.source_readiness?.[sourceKey]?.source_ref ?? null;
}

function collectBindingGaps(run: any): string[] {
  const gaps: string[] = [];
  const spine = run?.data_spine_readiness;
  const plan = run?.measurement_plan;
  const input = run?.measurement_cell_input;
  if (!spine || !input) return gaps;
  if (!plan) {
    gaps.push("measurement_plan is required for Measurement Cell assembly");
  }
  const checks = [
    ["measurementCellInput.orgId", input.orgId, spine.org_id],
    ["measurementCellInput.functionArea", input.functionArea, spine.function_area],
    ["measurementCellInput.workflowFamily", input.workflowFamily, spine.workflow_family],
    ["measurementCellInput.cohortKey", input.cohortKey, spine.cohort_key],
    [
      "measurementCellInput.blueprintAlignment.source_ref",
      input.blueprintAlignment?.source_ref,
      sourceRefOf(spine, "blueprint")
    ],
    [
      "measurementCellInput.aiFluencyContext.source_ref",
      input.aiFluencyContext?.source_ref,
      sourceRefOf(spine, "ai_fluency")
    ],
    [
      "measurementCellInput.vbdContext.source_ref",
      input.vbdContext?.source_ref,
      sourceRefOf(spine, "vbd_token")
    ],
    [
      "measurementCellInput.selectedMetric.source_ref",
      input.selectedMetric?.source_ref,
      sourceRefOf(spine, "customer_metric")
    ],
    [
      "measurementCellInput.tokenContext.source_ref",
      input.tokenContext?.source_ref,
      sourceRefOf(spine, "vbd_token")
    ]
  ];
  for (const [path, actual, expected] of checks) {
    if (expected !== undefined && expected !== null && actual !== expected) {
      gaps.push(`${path} must match Data Spine source readiness`);
    }
  }
  const spineMetricId = spine?.source_readiness?.customer_metric?.metric_id;
  if (
    spineMetricId &&
    input?.selectedMetric?.metric_id &&
    input.selectedMetric.metric_id !== spineMetricId
  ) {
    gaps.push("measurementCellInput.selectedMetric.metric_id must match Data Spine customer metric_id");
  }
  if (!sameWindow(input?.timeWindow?.baseline_window, spine?.baseline_window)) {
    gaps.push("measurementCellInput.timeWindow.baseline_window must match Data Spine baseline_window");
  }
  if (!sameWindow(input?.timeWindow?.comparison_window, spine?.comparison_window)) {
    gaps.push("measurementCellInput.timeWindow.comparison_window must match Data Spine comparison_window");
  }
  if (plan) {
    const planChecks = [
      ["data_spine_readiness.org_id", spine.org_id, orgIdOf(plan)],
      ["data_spine_readiness.workflow_family", spine.workflow_family, workflowFamilyOf(plan)],
      ["data_spine_readiness.function_area", spine.function_area, functionAreaOf(plan)],
      ["measurementCellInput.orgId", input.orgId, orgIdOf(plan)],
      ["measurementCellInput.workflowFamily", input.workflowFamily, workflowFamilyOf(plan)],
      ["measurementCellInput.functionArea", input.functionArea, functionAreaOf(plan)],
      ["measurementCellInput.selectedMetric.metric_id", input.selectedMetric?.metric_id, primaryMetricIdOf(plan)]
    ];
    for (const [path, actual, expected] of planChecks) {
      if (expected !== undefined && expected !== null && actual !== expected) {
        gaps.push(`${path} must match Measurement Plan`);
      }
    }
    const planWorkflowId = workflowIdOf(plan);
    if (planWorkflowId && input.workflowId && input.workflowId !== planWorkflowId) {
      gaps.push("measurementCellInput.workflowId must match Measurement Plan workflow_id");
    }
    if (!sameWindow(spine?.baseline_window, baselineWindowOf(plan))) {
      gaps.push("data_spine_readiness.baseline_window must match Measurement Plan baseline window");
    }
    if (!sameWindow(spine?.comparison_window, comparisonWindowOf(plan))) {
      gaps.push("data_spine_readiness.comparison_window must match Measurement Plan comparison window");
    }
    if (!sameWindow(input?.timeWindow?.baseline_window, baselineWindowOf(plan))) {
      gaps.push("measurementCellInput.timeWindow.baseline_window must match Measurement Plan baseline window");
    }
    if (!sameWindow(input?.timeWindow?.comparison_window, comparisonWindowOf(plan))) {
      gaps.push("measurementCellInput.timeWindow.comparison_window must match Measurement Plan comparison window");
    }
  }
  return gaps;
}

function collectRealDataBindingGaps(run: any): string[] {
  const gaps: string[] = [];
  const realRun = run?.real_data_intake_packet_run;
  const spine = run?.data_spine_readiness;
  const plan = run?.measurement_plan;
  if (!realRun || !spine) return gaps;
  if (realRun.org_id !== spine.org_id) {
    gaps.push("real_data_intake_packet_run.org_id must match Data Spine org_id");
  }
  if (realRun.client_id !== spine.client_id) {
    gaps.push("real_data_intake_packet_run.client_id must match Data Spine client_id");
  }
  if (realRun.workflow_family !== spine.workflow_family) {
    gaps.push("real_data_intake_packet_run.workflow_family must match Data Spine workflow_family");
  }
  if (realRun.measurement_plan_id !== plan?.measurement_plan_id) {
    gaps.push("real_data_intake_packet_run.measurement_plan_id must match Measurement Plan");
  }
  const realSpine = realRun.data_spine_readiness;
  if (realSpine?.data_spine_readiness_id !== spine.data_spine_readiness_id) {
    gaps.push("real_data_intake_packet_run.data_spine_readiness_id must match Data Spine");
  }
  if (realSpine?.function_area !== spine.function_area) {
    gaps.push("real_data_intake_packet_run.function_area must match Data Spine function_area");
  }
  if (realSpine?.cohort_key !== spine.cohort_key) {
    gaps.push("real_data_intake_packet_run.cohort_key must match Data Spine cohort_key");
  }
  if (!sameWindow(realSpine?.baseline_window, spine.baseline_window)) {
    gaps.push("real_data_intake_packet_run.baseline_window must match Data Spine baseline_window");
  }
  if (!sameWindow(realSpine?.comparison_window, spine.comparison_window)) {
    gaps.push("real_data_intake_packet_run.comparison_window must match Data Spine comparison_window");
  }
  const realMetricId = realSpine?.source_readiness?.customer_metric?.metric_id;
  const spineMetricId = spine?.source_readiness?.customer_metric?.metric_id;
  if (realMetricId !== spineMetricId) {
    gaps.push("real_data_intake_packet_run.customer_metric.metric_id must match Data Spine customer metric_id");
  }
  for (const sourceKey of [
    "blueprint",
    "ai_fluency",
    "vbd_token",
    "customer_metric",
    "assumption",
    "governance"
  ]) {
    if (
      realSpine?.source_readiness?.[sourceKey]?.source_ref !==
      spine?.source_readiness?.[sourceKey]?.source_ref
    ) {
      gaps.push(`real_data_intake_packet_run.${sourceKey}.source_ref must match Data Spine source_ref`);
    }
  }
  return gaps;
}

function collectSourcePackageReviewBindingGaps(run: any): string[] {
  const gaps: string[] = [];
  const queue = run?.source_package_review_queue;
  const spine = run?.data_spine_readiness;
  if (!queue || !spine) return gaps;
  if (queue.data_spine_readiness_id !== spine.data_spine_readiness_id) {
    gaps.push("source_package_review_queue.data_spine_readiness_id must match Data Spine");
  }
  if (queue.org_id !== spine.org_id) {
    gaps.push("source_package_review_queue.org_id must match Data Spine org_id");
  }
  if (queue.client_id !== spine.client_id) {
    gaps.push("source_package_review_queue.client_id must match Data Spine client_id");
  }
  if (queue.workflow_family !== spine.workflow_family) {
    gaps.push("source_package_review_queue.workflow_family must match Data Spine workflow_family");
  }
  if (queue.function_area !== spine.function_area) {
    gaps.push("source_package_review_queue.function_area must match Data Spine function_area");
  }
  if (queue.cohort_key !== spine.cohort_key) {
    gaps.push("source_package_review_queue.cohort_key must match Data Spine cohort_key");
  }
  if (!sameWindow(queue.baseline_window, spine.baseline_window)) {
    gaps.push("source_package_review_queue.baseline_window must match Data Spine baseline_window");
  }
  if (!sameWindow(queue.comparison_window, spine.comparison_window)) {
    gaps.push("source_package_review_queue.comparison_window must match Data Spine comparison_window");
  }
  return gaps;
}

function sourcePackageReviewMissingEvidence(
  queue: any,
  queueValidation: SourcePackageReviewQueueValidationResult | null,
  dataSpineValidation: DataSpineIntakeReadinessValidationResult
): string[] {
  if (!dataSpineValidation.valid || !dataSpineValidation.feeds.measurement_cell_input) {
    return [];
  }
  if (!queue) return ["SOURCE_PACKAGE_REVIEW_QUEUE_REQUIRED"];
  if (!queueValidation?.valid) return ["SOURCE_PACKAGE_REVIEW_QUEUE_INVALID"];
  if (queue.queue_state !== "DATA_SPINE_REVIEW_READY") {
    return [
      ...stringsOf(queue.missing_evidence),
      ...(stringsOf(queue.missing_evidence).length === 0
        ? ["SOURCE_PACKAGE_REVIEW_QUEUE_NOT_CLEAR"]
        : [])
    ];
  }
  return [];
}

function sourcePackageReviewCleared(
  queue: any,
  queueValidation: SourcePackageReviewQueueValidationResult | null,
  bindingGaps: string[],
  dataSpineValidation: DataSpineIntakeReadinessValidationResult
): boolean {
  if (!dataSpineValidation.valid || !dataSpineValidation.feeds.measurement_cell_input) {
    return true;
  }
  return Boolean(queue) &&
    queueValidation?.valid === true &&
    queue.queue_state === "DATA_SPINE_REVIEW_READY" &&
    bindingGaps.length === 0;
}

function collectDecisionFeedGaps(
  run: any,
  cellValidation: MeasurementCellValidationResult | null,
  sourcePackageReviewValidation: SourcePackageReviewQueueValidationResult | null
): string[] {
  const gaps: string[] = [];
  const decision = String(run?.decision ?? "");
  const feeds = run?.feeds ?? {};
  const dataSpineValidation = run?.data_spine_readiness
    ? validateDataSpineIntakeReadiness(run.data_spine_readiness)
    : null;
  const sourcePackageReviewBindingGaps =
    collectSourcePackageReviewBindingGaps(run);
  const sourceReviewNeeded =
    dataSpineValidation?.valid === true &&
    dataSpineValidation.feeds.measurement_cell_input === true;
  const sourceReviewClear =
    sourcePackageReviewCleared(
      run?.source_package_review_queue,
      sourcePackageReviewValidation,
      sourcePackageReviewBindingGaps,
      dataSpineValidation ?? {
        schema_version: "",
        data_spine_readiness_id: null,
        org_id: null,
        client_id: null,
        valid: false,
        gaps: [],
        feeds: {
          measurement_cell_input: false,
          value_hypothesis_packet_runner: false,
          customer_facing_financial_output: false
        }
      }
    );
  const downstreamFeeds = [
    "measurement_cell",
    "value_hypothesis_packet_runner",
    "business_owner_metric_review",
    "finance_context_investigation_planning",
    "bayesian_research_design_planning"
  ];
  if (decision === "READY_FOR_VALUE_HYPOTHESIS_PACKET_RUNNER") {
    if (sourceReviewNeeded && !sourceReviewClear) {
      gaps.push("READY_FOR_VALUE_HYPOTHESIS_PACKET_RUNNER requires a valid DATA_SPINE_REVIEW_READY Source Package Review Queue");
    }
    if (!cellValidation?.valid) {
      gaps.push("READY_FOR_VALUE_HYPOTHESIS_PACKET_RUNNER requires a valid Measurement Cell");
    }
    if (feeds.measurement_cell !== true) {
      gaps.push("feeds.measurement_cell must be true when ready for packet runner");
    }
    if (feeds.value_hypothesis_packet_runner !== true) {
      gaps.push("feeds.value_hypothesis_packet_runner must be true when ready for packet runner");
    }
    if (feeds.customer_facing_financial_output !== false) {
      gaps.push("feeds.customer_facing_financial_output must be false");
    }
    return gaps;
  }
  if ([
    "HELD_FOR_DATA_SPINE",
    "HELD_FOR_SOURCE_PACKAGE_REVIEW",
    "HELD_FOR_REAL_DATA_INTAKE",
    "HELD_FOR_MEASUREMENT_CELL",
    "BLOCKED"
  ].includes(decision)) {
    for (const field of downstreamFeeds) {
      if (feeds[field] !== false) {
        gaps.push(`feeds.${field} must be false when decision is ${decision}`);
      }
    }
  }
  if (
    decision === "HELD_FOR_SOURCE_PACKAGE_REVIEW" &&
    (!sourceReviewNeeded || sourceReviewClear)
  ) {
    gaps.push("HELD_FOR_SOURCE_PACKAGE_REVIEW requires a missing or uncleared Source Package Review Queue for a Measurement Cell ready Data Spine");
  }
  if (
    sourceReviewNeeded &&
    !sourceReviewClear &&
    !["HELD_FOR_SOURCE_PACKAGE_REVIEW", "BLOCKED"].includes(decision)
  ) {
    gaps.push("missing, held, invalid, or misaligned Source Package Review Queue must block Measurement Cell assembly");
  }
  return gaps;
}

function feedState(
  run: any,
  valid: boolean
): MeasurementCellAssemblyRunValidationResult["feeds"] {
  if (!valid) return falseFeeds();
  return run?.feeds ?? falseFeeds();
}

export function buildMeasurementCellAssemblyRun(
  input: BuildMeasurementCellAssemblyRunInput
): any {
  const measurementPlan = measurementPlanOf(input);
  const planValidation = measurementPlan
    ? validateMeasurementPlan(measurementPlan)
    : null;
  const dataSpineValidation = validateDataSpineIntakeReadiness(input.dataSpineReadiness);
  const sourcePackageReviewValidation = input.sourcePackageReviewQueue
    ? validateSourcePackageReviewQueue(input.sourcePackageReviewQueue)
    : null;
  const realDataValidation = input.realDataIntakePacketRun
    ? validateRealDataIntakePacketRun(input.realDataIntakePacketRun)
    : null;
  const runId = input.runId ??
    `measurement_cell_assembly_run_${safeIdPart(String(input.dataSpineReadiness?.org_id ?? "unknown_org"))}_${safeIdPart(String(input.dataSpineReadiness?.workflow_family ?? "unknown_workflow"))}_${safeIdPart(String(input.measurementCellInput?.timeWindow?.time_window_id ?? "unknown_window"))}`;
  const preAssemblyRun = {
    measurement_plan: measurementPlan,
    data_spine_readiness: input.dataSpineReadiness,
    source_package_review_queue: input.sourcePackageReviewQueue ?? null,
    real_data_intake_packet_run: input.realDataIntakePacketRun ?? null,
    measurement_cell_input: input.measurementCellInput
  };
  const sourcePackageReviewBindingGaps =
    collectSourcePackageReviewBindingGaps(preAssemblyRun);
  const sourcePackageReviewMissing = sourcePackageReviewMissingEvidence(
    input.sourcePackageReviewQueue,
    sourcePackageReviewValidation,
    dataSpineValidation
  );
  const sourcePackageReviewBlockingGaps = [
    ...(sourcePackageReviewValidation && !sourcePackageReviewValidation.valid
      ? sourcePackageReviewValidation.gaps.map((gap) => `source_package_review_queue: ${gap}`)
      : []),
    ...sourcePackageReviewBindingGaps
  ];
  const inputGaps = [
    ...collectBindingGaps(preAssemblyRun),
    ...collectRealDataBindingGaps(preAssemblyRun),
    ...sourcePackageReviewBlockingGaps,
    ...collectUnsafeInputGaps(input.measurementCellInput)
  ];
  const sourceReviewCleared = sourcePackageReviewCleared(
    input.sourcePackageReviewQueue,
    sourcePackageReviewValidation,
    sourcePackageReviewBindingGaps,
    dataSpineValidation
  );
  const canAssemble =
    planValidation?.valid === true &&
    dataSpineValidation.valid &&
    dataSpineValidation.feeds.measurement_cell_input &&
    sourceReviewCleared &&
    (!realDataValidation || realDataValidation.valid) &&
    (!realDataValidation || realDataValidation.feeds.measurement_cell_input) &&
    inputGaps.length === 0;

  let measurementCell: any | null = null;
  let measurementCellValidation: MeasurementCellValidationResult | null = null;
  let decision = "HELD_FOR_DATA_SPINE";
  let gaps = [
    ...(planValidation
      ? planValidation.gaps.map((gap) => `measurement_plan: ${gap}`)
      : ["measurement_plan is required for Measurement Cell assembly"]),
    ...dataSpineValidation.gaps.map((gap) => `data_spine_readiness: ${gap}`),
    ...(sourcePackageReviewValidation
      ? sourcePackageReviewValidation.gaps.map((gap) => `source_package_review_queue: ${gap}`)
      : []),
    ...(realDataValidation
      ? realDataValidation.gaps.map((gap) => `real_data_intake_packet_run: ${gap}`)
      : []),
    ...inputGaps
  ];

  if (!planValidation?.valid || !dataSpineValidation.valid || inputGaps.length > 0) {
    decision = "BLOCKED";
  } else if (!dataSpineValidation.feeds.measurement_cell_input) {
    decision = "HELD_FOR_DATA_SPINE";
  } else if (!sourceReviewCleared) {
    decision = sourcePackageReviewBlockingGaps.length > 0
      ? "BLOCKED"
      : "HELD_FOR_SOURCE_PACKAGE_REVIEW";
  } else if (realDataValidation && !realDataValidation.valid) {
    decision = "BLOCKED";
  } else if (realDataValidation && !realDataValidation.feeds.measurement_cell_input) {
    decision = "HELD_FOR_REAL_DATA_INTAKE";
  } else if (canAssemble) {
    measurementCell = buildMeasurementCell(input.measurementCellInput);
    measurementCellValidation = validateMeasurementCell(measurementCell);
    if (measurementCellValidation.valid) {
      decision = "READY_FOR_VALUE_HYPOTHESIS_PACKET_RUNNER";
    } else {
      decision = "HELD_FOR_MEASUREMENT_CELL";
      gaps = [
        ...gaps,
        ...measurementCellValidation.gaps.map((gap) => `measurement_cell: ${gap}`)
      ];
    }
  }

  return {
    schema_version: AI_VALUE_MEASUREMENT_CELL_ASSEMBLY_RUN_SCHEMA_VERSION,
    run_id: runId,
    org_id: input.dataSpineReadiness?.org_id ?? null,
    client_id: input.dataSpineReadiness?.client_id ?? null,
    measurement_plan_id: measurementPlan?.measurement_plan_id ?? null,
    workflow_family: input.dataSpineReadiness?.workflow_family ?? null,
    function_area: input.dataSpineReadiness?.function_area ?? null,
    cohort_key: input.dataSpineReadiness?.cohort_key ?? null,
    decision,
    measurement_plan: measurementPlan,
    measurement_plan_validation_result: planValidation,
    data_spine_readiness: input.dataSpineReadiness,
    data_spine_validation_result: dataSpineValidation,
    source_package_review_queue: input.sourcePackageReviewQueue ?? null,
    source_package_review_validation_result: sourcePackageReviewValidation,
    real_data_intake_packet_run: input.realDataIntakePacketRun ?? null,
    real_data_intake_validation_result: realDataValidation,
    measurement_cell_input: input.measurementCellInput,
    measurement_cell: measurementCell,
    measurement_cell_validation_result: measurementCellValidation,
    gaps,
    missing_evidence: [
      ...new Set([
        ...stringsOf(input.dataSpineReadiness?.missing_evidence),
        ...sourcePackageReviewMissing
      ])
    ],
    feeds: decision === "READY_FOR_VALUE_HYPOTHESIS_PACKET_RUNNER"
      ? feedsFromCell(measurementCellValidation)
      : falseFeeds(),
    allowed_uses: [
      "measurement_cell_assembly",
      "internal_evidence_review",
      "value_hypothesis_packet_preparation"
    ],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    boundary_policy: Object.fromEntries(
      REQUIRED_FALSE_BOUNDARY_FIELDS.map((field) => [field, false])
    ),
    required_caveats: [
      "Measurement Cell Assembly Runner assembles aggregate Measurement Cells only after Data Spine Readiness and source binding clear.",
      "A Data Spine that is otherwise Measurement Cell ready must have a valid Source Package Review Queue in DATA_SPINE_REVIEW_READY before assembly can proceed.",
      "The runner does not parse uploads, run BigQuery, create backend routes, create frontend UI, persist objects, or create Value Hypothesis packets directly.",
      "Rolling 30-day Measurement Cells are operating context only and cannot feed finance-context or Bayesian research planning.",
      "No ROI, EBITA, EBITDA, causality, productivity, financial attribution, confidence percentage, probability, person-level output, ranking, or customer-facing financial output is produced."
    ],
    generated_at: input.generatedAt ?? new Date(0).toISOString(),
    derivation_version: DERIVATION_VERSION
  };
}

export function validateMeasurementCellAssemblyRun(
  run: any
): MeasurementCellAssemblyRunValidationResult {
  const planValidation = run?.measurement_plan
    ? validateMeasurementPlan(run.measurement_plan)
    : null;
  const dataSpineValidation = run?.data_spine_readiness
    ? validateDataSpineIntakeReadiness(run.data_spine_readiness)
    : null;
  const realDataValidation = run?.real_data_intake_packet_run
    ? validateRealDataIntakePacketRun(run.real_data_intake_packet_run)
    : null;
  const sourcePackageReviewValidation = run?.source_package_review_queue
    ? validateSourcePackageReviewQueue(run.source_package_review_queue)
    : null;
  const cellValidation = run?.measurement_cell
    ? validateMeasurementCell(run.measurement_cell)
    : null;
  const blockedDecision = run?.decision === "BLOCKED";
  const bindingGaps = [
    ...collectBindingGaps(run),
    ...collectRealDataBindingGaps(run),
    ...collectSourcePackageReviewBindingGaps(run),
    ...collectUnsafeInputGaps(run?.measurement_cell_input)
  ];
  const blockedOrMisaligned = blockedDecision ||
    planValidation?.valid === false ||
    dataSpineValidation?.valid === false ||
    sourcePackageReviewValidation?.valid === false ||
    realDataValidation?.valid === false ||
    bindingGaps.length > 0;
  const gaps = [
    ...collectTopLevelGaps(run),
    ...collectPolicyGaps(run),
    ...bindingGaps,
    ...collectDecisionFeedGaps(run, cellValidation, sourcePackageReviewValidation),
    ...(blockedOrMisaligned
      ? ["blocked or misaligned Measurement Cell assembly runs cannot validate"]
      : []),
    ...(planValidation && !validationMatchesEmbedded(run?.measurement_plan_validation_result, planValidation)
      ? ["measurement_plan_validation_result must match recomputed Measurement Plan validation"]
      : []),
    ...(dataSpineValidation && !validationMatchesEmbedded(run?.data_spine_validation_result, dataSpineValidation)
      ? ["data_spine_validation_result must match recomputed Data Spine validation"]
      : []),
    ...(sourcePackageReviewValidation && !validationMatchesEmbedded(run?.source_package_review_validation_result, sourcePackageReviewValidation)
      ? ["source_package_review_validation_result must match recomputed Source Package Review Queue validation"]
      : []),
    ...(realDataValidation && !validationMatchesEmbedded(run?.real_data_intake_validation_result, realDataValidation)
      ? ["real_data_intake_validation_result must match recomputed Real Data Intake validation"]
      : []),
    ...(cellValidation && !validationMatchesEmbedded(run?.measurement_cell_validation_result, cellValidation)
      ? ["measurement_cell_validation_result must match recomputed Measurement Cell validation"]
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
    feeds: feedState(run, valid)
  };
}
