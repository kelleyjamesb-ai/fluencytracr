/**
 * AI Value Engine - Real Data Intake Packet Runner.
 *
 * Contract-only composer for already-parsed, aggregate-safe source inputs. It
 * validates Data Spine Intake Readiness, then routes scrubbed aggregate
 * Glean/client exports through the existing pilot intake runner. It does not
 * parse uploads, run BigQuery, persist objects, create routes/UI, build
 * customer-facing output, or compute ROI, causality, productivity, financial
 * attribution, confidence, or probability.
 */

import {
  buildAiValuePilotIntakeRunFromScrubbedGleanExports,
  validateAiValuePilotIntakeRun,
  type AiValuePilotIntakeRun
} from "./aiValuePilotIntakeRunner";
import {
  validateDataSpineIntakeReadiness,
  type DataSpineIntakeReadinessValidationResult
} from "./dataSpineReadiness";
import { validateMeasurementPlan } from "./measurementPlan";

export const AI_VALUE_REAL_DATA_INTAKE_PACKET_RUN_SCHEMA_VERSION =
  "FT_AI_VALUE_REAL_DATA_INTAKE_PACKET_RUN_2026_06";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_REAL_DATA_INTAKE_PACKET_RUN_VALIDATION_2026_06";

const DERIVATION_VERSION =
  "ai_value_real_data_intake_packet_runner_2026_06";

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

const REQUIRED_FALSE_PERSISTENCE_FIELDS = [
  "persisted",
  "creates_migrations",
  "creates_prisma_schema",
  "creates_backend_routes",
  "creates_frontend_ui",
  "creates_ingestion_jobs",
  "runs_bigquery",
  "parses_uploaded_documents",
  "stores_raw_source_data"
];

const ALLOWED_TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "run_id",
  "org_id",
  "client_id",
  "measurement_plan_id",
  "workflow_family",
  "decision",
  "data_spine_readiness",
  "data_spine_validation_result",
  "measurement_plan",
  "measurement_plan_validation_result",
  "scrubbed_export_count",
  "gaps",
  "missing_evidence",
  "pilot_intake_run",
  "feeds",
  "persistence_policy",
  "allowed_uses",
  "blocked_uses",
  "required_caveats",
  "generated_at",
  "derivation_version"
]);

const ALLOWED_DECISIONS = new Set([
  "READY_FOR_MEASUREMENT_CELL_ASSEMBLY",
  "HELD_FOR_DATA_SPINE",
  "HELD_FOR_EVIDENCE_INPUTS",
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
  /person_id/i,
  /person_identifier/i,
  /hashed_(?:user|person|employee)_id/i,
  /joinable_(?:user|person|employee)_identifier/i,
  /person_level_productivity/i,
  /person_level_hris/i,
  /manager_ranking/i,
  /team_ranking/i,
  /people_decisioning/i,
  /^persisted$/i,
  /^creates_(?:migrations|prisma_schema|backend_routes?|frontend_ui|ingestion_jobs)$/i,
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
  /^backend_routes?$/i,
  /^backend_route$/i,
  /^frontend_ui$/i,
  /^persistence_table$/i,
  /^schema_ref$/i
];

const GOVERNED_KEY_ALLOWLIST = new Set([
  "blocked_uses",
  "persistence_policy"
]);

const FALSE_BOUNDARY_CONTAINERS = new Set([
  "boundary_policy",
  "financial_boundary",
  "persistence_policy",
  "privacy_boundary",
  "value_proof_policy"
]);

export interface BuildRealDataIntakePacketRunInput {
  dataSpineReadiness: any;
  measurementPlan: any;
  scrubbedGleanExports: any[];
  runId?: string;
  generatedAt?: string;
}

export interface RealDataIntakePacketRunValidationResult {
  schema_version: string;
  run_id: string | null;
  org_id: string | null;
  client_id: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    normalized_evidence_inputs: boolean;
    evidence_collection_assembly: boolean;
    evidence_snapshot_input: boolean;
    claim_readiness_handoff: boolean;
    measurement_cell_input: boolean;
    value_hypothesis_packet_runner: false;
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

function validationMatchesEmbedded(embedded: any, recomputed: any): boolean {
  return JSON.stringify(embedded ?? null) === JSON.stringify(recomputed ?? null);
}

function requireField(value: any, path: string, gaps: string[]): void {
  if (value === undefined || value === null || value === "") {
    gaps.push(`${path} is missing`);
  }
}

function collectForbiddenFields(
  value: any,
  fields: Set<string> = new Set(),
  path: string[] = []
): Set<string> {
  if (!value || typeof value !== "object") return fields;
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectForbiddenFields(item, fields, [...path, String(index)]));
    return fields;
  }
  for (const [key, nested] of Object.entries(value)) {
    const normalized = normalizeKey(key);
    const currentPath = [...path, key];
    const inFinancialBoundary = currentPath.some((part) =>
      normalizeKey(part) === "financial_boundary"
    );
    const isFalseBoundaryFlag = nested === false &&
      (
        currentPath.some((part) => FALSE_BOUNDARY_CONTAINERS.has(normalizeKey(part))) ||
        (
          normalizeKey(currentPath[currentPath.length - 2] ?? "") === "feeds" &&
          normalized === "customer_facing_financial_output"
        )
      );
    if (!inFinancialBoundary && /roi.*allowed/i.test(normalized)) {
      fields.add(currentPath.join("."));
    }
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

function orgIdOf(plan: any): string | null {
  return typeof plan?.org_id === "string" ? plan.org_id : null;
}

function measurementPlanIdOf(plan: any): string | null {
  return typeof plan?.measurement_plan_id === "string" ? plan.measurement_plan_id : null;
}

function workflowFamilyOf(plan: any): string | null {
  return typeof plan?.workflow_scope?.workflow_family === "string"
    ? plan.workflow_scope.workflow_family
    : null;
}

function functionAreaOf(plan: any): string | null {
  return typeof plan?.workflow_scope?.function_area === "string"
    ? plan.workflow_scope.function_area
    : null;
}

function baselineWindowOf(plan: any): any {
  return {
    window_start: plan?.windows?.baseline_window_start ?? null,
    window_end: plan?.windows?.baseline_window_end ?? null
  };
}

function comparisonWindowOf(plan: any): any {
  return {
    window_start: plan?.windows?.comparison_window_start ?? null,
    window_end: plan?.windows?.comparison_window_end ?? null
  };
}

function sameWindow(left: any, right: any): boolean {
  return left?.window_start === right?.window_start &&
    left?.window_end === right?.window_end;
}

function falseFeeds(): RealDataIntakePacketRunValidationResult["feeds"] {
  return {
    normalized_evidence_inputs: false,
    evidence_collection_assembly: false,
    evidence_snapshot_input: false,
    claim_readiness_handoff: false,
    measurement_cell_input: false,
    value_hypothesis_packet_runner: false,
    customer_facing_financial_output: false
  };
}

function feedsFromPilotRun(
  pilotRun: AiValuePilotIntakeRun | null,
  measurementCellInput: boolean
): RealDataIntakePacketRunValidationResult["feeds"] {
  if (!pilotRun || !pilotRun.valid) return falseFeeds();
  return {
    normalized_evidence_inputs: pilotRun.feeds.normalized_evidence_inputs,
    evidence_collection_assembly: pilotRun.feeds.evidence_collection_assembly,
    evidence_snapshot_input: pilotRun.feeds.evidence_snapshot_input,
    claim_readiness_handoff: pilotRun.feeds.claim_readiness_handoff,
    measurement_cell_input: measurementCellInput,
    value_hypothesis_packet_runner: false,
    customer_facing_financial_output: false
  };
}

function collectPlanBindingGaps(run: any): string[] {
  const gaps: string[] = [];
  const plan = run?.measurement_plan;
  const spine = run?.data_spine_readiness;
  if (!plan || !spine) return gaps;
  if (spine.org_id !== orgIdOf(plan)) {
    gaps.push("data_spine_readiness.org_id must match measurement_plan.org_id");
  }
  if (spine.workflow_family !== workflowFamilyOf(plan)) {
    gaps.push("data_spine_readiness.workflow_family must match measurement_plan workflow_family");
  }
  if (spine.function_area !== functionAreaOf(plan)) {
    gaps.push("data_spine_readiness.function_area must match measurement_plan function_area");
  }
  if (!sameWindow(spine.baseline_window, baselineWindowOf(plan))) {
    gaps.push("data_spine_readiness.baseline_window must match measurement_plan baseline window");
  }
  if (!sameWindow(spine.comparison_window, comparisonWindowOf(plan))) {
    gaps.push("data_spine_readiness.comparison_window must match measurement_plan comparison window");
  }
  return gaps;
}

function collectTopLevelGaps(run: any): string[] {
  const gaps: string[] = [];
  if (!run || typeof run !== "object" || Array.isArray(run)) {
    return ["real data intake packet run must be an object"];
  }
  for (const field of [
    "schema_version",
    "run_id",
    "org_id",
    "client_id",
    "measurement_plan_id",
    "workflow_family",
    "decision",
    "data_spine_readiness",
    "data_spine_validation_result",
    "measurement_plan",
    "measurement_plan_validation_result",
    "scrubbed_export_count",
    "gaps",
    "missing_evidence",
    "feeds",
    "persistence_policy",
    "allowed_uses",
    "blocked_uses",
    "required_caveats",
    "generated_at",
    "derivation_version"
  ]) {
    requireField(run?.[field], field, gaps);
  }
  if (
    run?.schema_version &&
    run.schema_version !== AI_VALUE_REAL_DATA_INTAKE_PACKET_RUN_SCHEMA_VERSION
  ) {
    gaps.push(`schema_version is invalid: ${run.schema_version}`);
  }
  if (run?.decision && !ALLOWED_DECISIONS.has(String(run.decision))) {
    gaps.push(`decision is invalid: ${run.decision}`);
  }
  for (const field of Object.keys(run ?? {})) {
    if (!ALLOWED_TOP_LEVEL_FIELDS.has(field)) {
      gaps.push(`Unsupported real data intake packet run field: ${field}`);
    }
  }
  if (
    run?.decision === "READY_FOR_MEASUREMENT_CELL_ASSEMBLY" &&
    !run?.pilot_intake_run
  ) {
    gaps.push("pilot_intake_run is required when decision is READY_FOR_MEASUREMENT_CELL_ASSEMBLY");
  }
  if (
    run?.decision === "HELD_FOR_EVIDENCE_INPUTS" &&
    !run?.pilot_intake_run
  ) {
    gaps.push("pilot_intake_run is required when decision is HELD_FOR_EVIDENCE_INPUTS");
  }
  if (
    run?.decision === "HELD_FOR_DATA_SPINE" &&
    run?.pilot_intake_run !== null
  ) {
    gaps.push("pilot_intake_run must be null when held for data spine readiness");
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
  for (const field of REQUIRED_FALSE_PERSISTENCE_FIELDS) {
    if (run?.persistence_policy?.[field] !== false) {
      gaps.push(`persistence_policy.${field} must be false`);
    }
  }
  if (run?.feeds?.customer_facing_financial_output !== false) {
    gaps.push("feeds.customer_facing_financial_output must be false");
  }
  if (run?.feeds?.value_hypothesis_packet_runner !== false) {
    gaps.push("feeds.value_hypothesis_packet_runner must be false until Measurement Cell assembly is complete");
  }
  for (const field of [...collectForbiddenFields(run)].sort()) {
    gaps.push(`Forbidden field detected: ${field}`);
  }
  return gaps;
}

function collectDecisionFeedGaps(
  run: any,
  pilotValidation: ReturnType<typeof validateAiValuePilotIntakeRun> | null
): string[] {
  const gaps: string[] = [];
  const decision = String(run?.decision ?? "");
  const feeds = run?.feeds ?? {};
  const downstreamFeedFields = [
    "normalized_evidence_inputs",
    "evidence_collection_assembly",
    "evidence_snapshot_input",
    "claim_readiness_handoff",
    "measurement_cell_input"
  ];
  if (decision === "READY_FOR_MEASUREMENT_CELL_ASSEMBLY") {
    if (!pilotValidation?.valid) {
      gaps.push("READY_FOR_MEASUREMENT_CELL_ASSEMBLY requires a valid pilot_intake_run");
    }
    for (const field of downstreamFeedFields) {
      if (feeds[field] !== true) {
        gaps.push(`feeds.${field} must be true when decision is READY_FOR_MEASUREMENT_CELL_ASSEMBLY`);
      }
    }
    return gaps;
  }
  if (["HELD_FOR_DATA_SPINE", "HELD_FOR_EVIDENCE_INPUTS", "BLOCKED"].includes(decision)) {
    for (const field of downstreamFeedFields) {
      if (feeds[field] !== false) {
        gaps.push(`feeds.${field} must be false when decision is ${decision}`);
      }
    }
  }
  return gaps;
}

function feedState(
  run: any,
  valid: boolean
): RealDataIntakePacketRunValidationResult["feeds"] {
  if (!valid) return falseFeeds();
  return run?.feeds ?? falseFeeds();
}

export function buildRealDataIntakePacketRun(
  input: BuildRealDataIntakePacketRunInput
): any {
  const dataSpineValidation = validateDataSpineIntakeReadiness(input.dataSpineReadiness);
  const planValidation = validateMeasurementPlan(input.measurementPlan);
  const baseRunId = input.runId ??
    `real_data_intake_packet_run_${safeIdPart(String(orgIdOf(input.measurementPlan) ?? "unknown_org"))}_${safeIdPart(String(workflowFamilyOf(input.measurementPlan) ?? "unknown_workflow"))}`;
  const planBindingGaps = [];
  if (input.dataSpineReadiness?.org_id !== orgIdOf(input.measurementPlan)) {
    planBindingGaps.push("data_spine_readiness.org_id must match measurement_plan.org_id");
  }
  if (input.dataSpineReadiness?.workflow_family !== workflowFamilyOf(input.measurementPlan)) {
    planBindingGaps.push("data_spine_readiness.workflow_family must match measurement_plan workflow_family");
  }
  if (input.dataSpineReadiness?.function_area !== functionAreaOf(input.measurementPlan)) {
    planBindingGaps.push("data_spine_readiness.function_area must match measurement_plan function_area");
  }
  if (!sameWindow(input.dataSpineReadiness?.baseline_window, baselineWindowOf(input.measurementPlan))) {
    planBindingGaps.push("data_spine_readiness.baseline_window must match measurement_plan baseline window");
  }
  if (!sameWindow(input.dataSpineReadiness?.comparison_window, comparisonWindowOf(input.measurementPlan))) {
    planBindingGaps.push("data_spine_readiness.comparison_window must match measurement_plan comparison window");
  }

  const canRunPilot =
    dataSpineValidation.valid &&
    dataSpineValidation.feeds.measurement_cell_input &&
    planValidation.valid &&
    planBindingGaps.length === 0;

  let pilotRun: AiValuePilotIntakeRun | null = null;
  let decision = "HELD_FOR_DATA_SPINE";
  let gaps = [
    ...dataSpineValidation.gaps.map((gap) => `data_spine_readiness: ${gap}`),
    ...planValidation.gaps.map((gap) => `measurement_plan: ${gap}`),
    ...planBindingGaps
  ];

  if (canRunPilot) {
    pilotRun = buildAiValuePilotIntakeRunFromScrubbedGleanExports({
      measurementPlan: input.measurementPlan,
      scrubbedGleanExports: input.scrubbedGleanExports,
      intakeRunId: `${baseRunId}_pilot_intake`,
      generatedAt: input.generatedAt
    });
    if (pilotRun.valid) {
      decision = "READY_FOR_MEASUREMENT_CELL_ASSEMBLY";
    } else {
      decision = "HELD_FOR_EVIDENCE_INPUTS";
      gaps = [
        ...gaps,
        ...pilotRun.gaps.map((gap) => `pilot_intake_run: ${gap}`)
      ];
    }
  }

  if (!dataSpineValidation.valid || !planValidation.valid || planBindingGaps.length > 0) {
    decision = "BLOCKED";
  } else if (!dataSpineValidation.feeds.measurement_cell_input) {
    decision = "HELD_FOR_DATA_SPINE";
  }

  return {
    schema_version: AI_VALUE_REAL_DATA_INTAKE_PACKET_RUN_SCHEMA_VERSION,
    run_id: baseRunId,
    org_id: orgIdOf(input.measurementPlan),
    client_id: input.dataSpineReadiness?.client_id ?? null,
    measurement_plan_id: measurementPlanIdOf(input.measurementPlan),
    workflow_family: workflowFamilyOf(input.measurementPlan),
    decision,
    data_spine_readiness: input.dataSpineReadiness,
    data_spine_validation_result: dataSpineValidation,
    measurement_plan: input.measurementPlan,
    measurement_plan_validation_result: planValidation,
    scrubbed_export_count: Array.isArray(input.scrubbedGleanExports)
      ? input.scrubbedGleanExports.length
      : 0,
    gaps,
    missing_evidence: input.dataSpineReadiness?.missing_evidence ?? [],
    pilot_intake_run: pilotRun,
    feeds: feedsFromPilotRun(
      pilotRun,
      decision === "READY_FOR_MEASUREMENT_CELL_ASSEMBLY"
    ),
    persistence_policy: Object.fromEntries(
      REQUIRED_FALSE_PERSISTENCE_FIELDS.map((field) => [field, false])
    ),
    allowed_uses: [
      "real_data_intake_review",
      "evidence_collection_preparation",
      "measurement_cell_preparation"
    ],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    required_caveats: [
      "Real Data Intake Packet Runner accepts already-parsed aggregate-safe source objects only.",
      "The runner does not parse Blueprint files, run BigQuery, store raw rows, create routes/UI, or persist source data.",
      "Valid output can prepare Measurement Cell assembly, but it does not itself create a Value Hypothesis Readiness packet.",
      "No ROI, EBITA, EBITDA, causality, productivity, financial attribution, confidence percentage, probability, or customer-facing financial output is produced."
    ],
    generated_at: input.generatedAt ?? new Date(0).toISOString(),
    derivation_version: DERIVATION_VERSION
  };
}

export function validateRealDataIntakePacketRun(
  run: any
): RealDataIntakePacketRunValidationResult {
  const dataSpineValidation = run?.data_spine_readiness
    ? validateDataSpineIntakeReadiness(run.data_spine_readiness)
    : null;
  const planValidation = run?.measurement_plan
    ? validateMeasurementPlan(run.measurement_plan)
    : null;
  const pilotValidation = run?.pilot_intake_run
    ? validateAiValuePilotIntakeRun(run.pilot_intake_run)
    : null;
  const readyDecision = run?.decision === "READY_FOR_MEASUREMENT_CELL_ASSEMBLY";
  const heldForEvidenceDecision = run?.decision === "HELD_FOR_EVIDENCE_INPUTS";
  const blockedDecision = run?.decision === "BLOCKED";
  const blockedOrMisaligned = blockedDecision ||
    dataSpineValidation?.valid === false ||
    planValidation?.valid === false ||
    collectPlanBindingGaps(run).length > 0;
  const evidenceInputGaps = readyDecision && pilotValidation && !pilotValidation.valid
    ? pilotValidation.gaps.map((gap) => `pilot_intake_run: ${gap}`)
    : [];
  const heldEvidenceFeedGaps = heldForEvidenceDecision &&
    (
      run?.feeds?.evidence_snapshot_input !== false ||
      run?.feeds?.claim_readiness_handoff !== false ||
      run?.feeds?.measurement_cell_input !== false
    )
    ? ["held evidence input runs must not feed evidence snapshots, handoffs, or Measurement Cell input"]
    : [];
  const gaps = [
    ...collectTopLevelGaps(run),
    ...collectPlanBindingGaps(run),
    ...collectPolicyGaps(run),
    ...collectDecisionFeedGaps(run, pilotValidation),
    ...(blockedOrMisaligned
      ? ["blocked or misaligned intake runs cannot validate as a real-data packet"]
      : []),
    ...(dataSpineValidation &&
      !validationMatchesEmbedded(run?.data_spine_validation_result, dataSpineValidation)
      ? ["data_spine_validation_result must match recomputed Data Spine validation"]
      : []),
    ...(planValidation &&
      !validationMatchesEmbedded(run?.measurement_plan_validation_result, planValidation)
      ? ["measurement_plan_validation_result must match recomputed Measurement Plan validation"]
      : []),
    ...evidenceInputGaps,
    ...heldEvidenceFeedGaps
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
