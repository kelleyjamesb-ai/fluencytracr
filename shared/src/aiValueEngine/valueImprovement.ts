/**
 * AI Value Engine — Value Improvement Loop.
 *
 * Turns governed value-scenario state into advisory next actions when an
 * aggregate value target is not yet improving. It does not calculate ROI,
 * prove causality, score people, rank teams, or modify suppression thresholds.
 */

const RESULT_SCHEMA_VERSION = "FT_AI_VALUE_IMPROVEMENT_LOOP_VALIDATION_2026_06";
export const VALUE_IMPROVEMENT_LOOP_SCHEMA_VERSION =
  "FT_AI_VALUE_IMPROVEMENT_LOOP_2026_06";

const ALLOWED_VALUE_ROUTES = new Set([
  "COST_REDUCTION",
  "CAPACITY_CREATION",
  "QUALITY_IMPROVEMENT",
  "RISK_REDUCTION",
  "EXPERIENCE_IMPROVEMENT",
  "REVENUE_EXPANSION",
  "UNCLASSIFIED"
]);

const ALLOWED_TARGET_STATUSES = new Set([
  "IMPROVING",
  "NOT_IMPROVING",
  "NEEDS_EVIDENCE",
  "UNDER_REVIEW"
]);

const ALLOWED_DIRECTIONS = new Set(["IMPROVE", "REDUCE", "MAINTAIN"]);
const ALLOWED_FLUENCY = new Set(["READY", "MIXED", "LOW", "UNKNOWN"]);
const ALLOWED_VELOCITY = new Set(["INCREASING", "STALLING", "DECLINING", "UNKNOWN"]);
const ALLOWED_BREADTH = new Set(["EXPANDING", "LIMITED", "NARROWING", "UNKNOWN"]);
const ALLOWED_DEPTH = new Set(["DEEPENING", "SHALLOW", "FRAGMENTED", "UNKNOWN"]);
const ALLOWED_CONFIDENCE = new Set(["HIGH", "MEDIUM", "LOW", "UNKNOWN"]);

const REQUIRED_BLOCKED_CLAIMS = [
  "roi_proof",
  "causality_claim",
  "individual_scoring",
  "team_or_manager_ranking",
  "hr_analytics",
  "productivity_measurement",
  "realized_roi_calculation",
  "customer_facing_economic_output"
];

const GOVERNANCE_BOUNDARIES = [
  "production_connector",
  "dashboard",
  "realized_roi_calculation",
  "causality_claim",
  "individual_scoring",
  "hris_or_people_analytics",
  "productivity_ranking",
  "raw_prompt_or_response_storage",
  "direct_identifiers",
  "runtime_service",
  "autonomous_customer_actions",
  "customer_facing_economic_output"
];

const FORBIDDEN_KEY_PATTERNS = [
  /(^|_)user(_|$)/i,
  /email/i,
  /employee/i,
  /manager/i,
  /person/i,
  /prompt/i,
  /response/i,
  /transcript/i,
  /file_content/i,
  /ticket_text/i,
  /raw_/i,
  /hris/i,
  /actual_roi/i,
  /realized_roi/i,
  /roi_calculation/i,
  /dollar/i,
  /currency/i,
  /savings_amount/i,
  /productivity/i,
  /causal/i
];

const FORBIDDEN_KEY_SCAN_EXEMPTIONS = new Set([
  "safe_language",
  "blocked_claims",
  "economic_output_policy",
  "governance_boundaries"
]);

const FORBIDDEN_CLAIM_PATTERNS = [
  /prov(?:ed|es) ROI/i,
  /AI caused/i,
  /caused .*improvement/i,
  /caused productivity/i,
  /saved money/i,
  /saved \$?\d/i,
  /employee/i,
  /manager/i,
  /team .*better/i
];

export interface ValueImprovementLoopValidationResult {
  schema_version: string;
  improvement_loop_id: string | null;
  workflow_family: string | null;
  value_target_status: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    improvement_planning: boolean;
    executive_readout: boolean;
    customer_facing_economic_output: boolean;
  };
}

export interface BuildValueImprovementLoopOptions {
  improvementLoopId?: string;
  valueTargetStatus?: string;
  fluencyReadiness?: string;
  velocityStatus?: string;
  breadthStatus?: string;
  depthStatus?: string;
  evidenceConfidence?: string;
}

function requireField(value: any, path: string, gaps: string[]): void {
  if (value === undefined || value === null || value === "") {
    gaps.push(`${path} is missing`);
  }
}

function requireArray(value: any, path: string, gaps: string[]): void {
  if (!Array.isArray(value) || value.length === 0) {
    gaps.push(`${path} must include at least one item`);
  }
}

function isForbiddenKey(key: string): boolean {
  return FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function collectForbiddenFields(value: any, fields: Set<string> = new Set()): Set<string> {
  if (!value || typeof value !== "object") return fields;
  if (Array.isArray(value)) {
    value.forEach((item) => collectForbiddenFields(item, fields));
    return fields;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_KEY_SCAN_EXEMPTIONS.has(key)) continue;
    if (isForbiddenKey(key)) fields.add(key);
    collectForbiddenFields(nested, fields);
  }
  return fields;
}

function containsUnsafeClaimLanguage(value: any): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => containsUnsafeClaimLanguage(item));
  }
  if (value && typeof value === "object") {
    return Object.values(value).some((item) => containsUnsafeClaimLanguage(item));
  }
  return FORBIDDEN_CLAIM_PATTERNS.some((pattern) => pattern.test(String(value ?? "")));
}

function collectTopLevelGaps(loop: any): string[] {
  const gaps: string[] = [];
  for (const field of [
    "schema_version",
    "improvement_loop_id",
    "source_refs",
    "workflow",
    "value_target",
    "vbd_context",
    "likely_blockers",
    "recommended_interventions",
    "retest_plan",
    "next_data_needed",
    "safe_language",
    "economic_output_policy",
    "governance_boundaries"
  ]) {
    requireField(loop?.[field], field, gaps);
  }
  if (
    loop?.schema_version &&
    loop.schema_version !== VALUE_IMPROVEMENT_LOOP_SCHEMA_VERSION
  ) {
    gaps.push(`schema_version is invalid: ${loop.schema_version}`);
  }
  return gaps;
}

function collectSourceRefGaps(loop: any): string[] {
  const gaps: string[] = [];
  const refs = loop?.source_refs ?? {};
  requireField(refs.roi_scenario_id, "source_refs.roi_scenario_id", gaps);
  requireField(refs.readiness_id, "source_refs.readiness_id", gaps);
  return gaps;
}

function collectWorkflowGaps(loop: any): string[] {
  const gaps: string[] = [];
  const workflow = loop?.workflow ?? {};
  requireField(workflow.workflow_family, "workflow.workflow_family", gaps);
  requireField(workflow.workflow_name, "workflow.workflow_name", gaps);
  requireField(workflow.function_area, "workflow.function_area", gaps);
  requireField(workflow.value_route, "workflow.value_route", gaps);
  if (workflow.value_route && !ALLOWED_VALUE_ROUTES.has(workflow.value_route)) {
    gaps.push(`workflow.value_route is invalid: ${workflow.value_route}`);
  }
  return gaps;
}

function collectValueTargetGaps(loop: any): string[] {
  const gaps: string[] = [];
  const target = loop?.value_target ?? {};
  for (const field of [
    "metric_id",
    "metric_name",
    "measurement_unit",
    "source_system",
    "expected_direction",
    "current_status",
    "status_rationale"
  ]) {
    requireField(target[field], `value_target.${field}`, gaps);
  }
  if (target.current_status && !ALLOWED_TARGET_STATUSES.has(target.current_status)) {
    gaps.push(`value_target.current_status is invalid: ${target.current_status}`);
  }
  if (target.expected_direction && !ALLOWED_DIRECTIONS.has(target.expected_direction)) {
    gaps.push(`value_target.expected_direction is invalid: ${target.expected_direction}`);
  }
  return gaps;
}

function collectVbdGaps(loop: any): string[] {
  const gaps: string[] = [];
  const context = loop?.vbd_context ?? {};
  const checks: Array<[string, Set<string>]> = [
    ["fluency_readiness", ALLOWED_FLUENCY],
    ["velocity_status", ALLOWED_VELOCITY],
    ["breadth_status", ALLOWED_BREADTH],
    ["depth_status", ALLOWED_DEPTH],
    ["evidence_confidence", ALLOWED_CONFIDENCE]
  ];
  for (const [field, allowed] of checks) {
    requireField(context[field], `vbd_context.${field}`, gaps);
    if (context[field] && !allowed.has(context[field])) {
      gaps.push(`vbd_context.${field} is invalid: ${context[field]}`);
    }
  }
  return gaps;
}

function collectBlockerGaps(loop: any): string[] {
  const gaps: string[] = [];
  requireArray(loop?.likely_blockers, "likely_blockers", gaps);
  if (Array.isArray(loop?.likely_blockers)) {
    loop.likely_blockers.forEach((blocker: any, index: number) => {
      for (const field of ["blocker_id", "label", "rationale", "evidence_basis"]) {
        requireField(blocker?.[field], `likely_blockers[${index}].${field}`, gaps);
      }
    });
  }
  return gaps;
}

function collectInterventionGaps(loop: any): string[] {
  const gaps: string[] = [];
  requireArray(loop?.recommended_interventions, "recommended_interventions", gaps);
  if (Array.isArray(loop?.recommended_interventions)) {
    loop.recommended_interventions.forEach((intervention: any, index: number) => {
      for (const field of ["intervention_id", "label", "owner", "action", "rationale"]) {
        requireField(
          intervention?.[field],
          `recommended_interventions[${index}].${field}`,
          gaps
        );
      }
    });
  }
  return gaps;
}

function collectRetestGaps(loop: any): string[] {
  const gaps: string[] = [];
  const retest = loop?.retest_plan ?? {};
  for (const field of [
    "window_label",
    "measurement_plan",
    "success_signal",
    "decision_after_retest"
  ]) {
    requireField(retest[field], `retest_plan.${field}`, gaps);
  }
  return gaps;
}

function collectSafeLanguageGaps(loop: any): string[] {
  const gaps: string[] = [];
  const safe = loop?.safe_language ?? {};
  requireArray(safe.allowed_phrases, "safe_language.allowed_phrases", gaps);
  requireArray(safe.required_caveats, "safe_language.required_caveats", gaps);
  requireArray(safe.blocked_claims, "safe_language.blocked_claims", gaps);
  const blockedClaims = new Set(safe.blocked_claims ?? []);
  for (const claim of REQUIRED_BLOCKED_CLAIMS) {
    if (!blockedClaims.has(claim)) {
      gaps.push(`safe_language.blocked_claims missing ${claim}`);
    }
  }
  if (containsUnsafeClaimLanguage(safe.allowed_phrases)) {
    gaps.push("safe_language.allowed_phrases contains unsafe claim language");
  }
  return gaps;
}

function collectEconomicPolicyGaps(loop: any): string[] {
  const gaps: string[] = [];
  const policy = loop?.economic_output_policy ?? {};
  for (const field of [
    "customer_facing_economic_output",
    "dollarized_output",
    "realized_roi_calculation"
  ]) {
    if (policy[field] !== false) {
      gaps.push(`economic_output_policy.${field} must be false`);
    }
  }
  for (const boundary of GOVERNANCE_BOUNDARIES) {
    if (loop?.governance_boundaries?.[boundary] !== false) {
      gaps.push(`governance_boundaries.${boundary} must be false`);
    }
  }
  return gaps;
}

export function validateValueImprovementLoop(
  loop: any
): ValueImprovementLoopValidationResult {
  const gaps = [
    ...collectTopLevelGaps(loop),
    ...collectSourceRefGaps(loop),
    ...collectWorkflowGaps(loop),
    ...collectValueTargetGaps(loop),
    ...collectVbdGaps(loop),
    ...collectBlockerGaps(loop),
    ...collectInterventionGaps(loop),
    ...collectRetestGaps(loop),
    ...collectSafeLanguageGaps(loop),
    ...collectEconomicPolicyGaps(loop)
  ];
  const forbiddenFields = Array.from(collectForbiddenFields(loop));
  if (forbiddenFields.length > 0) {
    gaps.push(`Forbidden field(s): ${forbiddenFields.sort().join(", ")}`);
  }

  return {
    schema_version: RESULT_SCHEMA_VERSION,
    improvement_loop_id: loop?.improvement_loop_id ?? null,
    workflow_family: loop?.workflow?.workflow_family ?? null,
    value_target_status: loop?.value_target?.current_status ?? null,
    valid: gaps.length === 0,
    gaps,
    feeds: {
      improvement_planning: gaps.length === 0,
      executive_readout: gaps.length === 0,
      customer_facing_economic_output: false
    }
  };
}

const humanize = (value: string | null | undefined): string => {
  const text = String(value ?? "")
    .replace(/^client_/, "")
    .replace(/_/g, " ")
    .trim();
  return text
    ? text.replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "Client";
};

const firstMetric = (roiScenario: any): any =>
  Array.isArray(roiScenario?.metric_models)
    ? roiScenario.metric_models[0] ?? {}
    : {};

const sourceName = (metric: any): string =>
  String(metric?.source_system?.source_name ?? "Customer-owned outcome system");

function blockerList(context: {
  fluencyReadiness: string;
  velocityStatus: string;
  breadthStatus: string;
  depthStatus: string;
  evidenceConfidence: string;
  assumptionsReady: boolean;
}): any[] {
  const blockers: any[] = [];
  if (context.fluencyReadiness === "LOW" || context.fluencyReadiness === "MIXED") {
    blockers.push({
      blocker_id: "fluency_readiness_gap",
      label: "AI Fluency is mixed",
      rationale:
        "The function may need more confidence, usage quality, or leadership reinforcement before workflow change scales.",
      evidence_basis: "Aggregate AI Fluency follow-up by function."
    });
  }
  if (context.velocityStatus === "STALLING" || context.velocityStatus === "DECLINING") {
    blockers.push({
      blocker_id: "velocity_not_moving",
      label: "Velocity is not increasing",
      rationale:
        "The workflow may not be showing enough aggregate AI-enabled activity to expect business metric movement yet.",
      evidence_basis: "Aggregate Velocity movement for the selected workflow."
    });
  }
  if (context.breadthStatus === "LIMITED" || context.breadthStatus === "NARROWING") {
    blockers.push({
      blocker_id: "breadth_limited",
      label: "Breadth is still limited",
      rationale:
        "AI-enabled work may be concentrated in too few roles or workflow steps to affect the function-level metric.",
      evidence_basis: "Aggregate Breadth by function and workflow family."
    });
  }
  if (context.depthStatus === "SHALLOW" || context.depthStatus === "FRAGMENTED") {
    blockers.push({
      blocker_id: "depth_shallow",
      label: "Depth is still shallow",
      rationale:
        "People may be trying AI, but the work pattern has not moved deeply enough into repeatable workflow behavior.",
      evidence_basis: "Aggregate Depth evidence for repeated, verified workflow use."
    });
  }
  if (context.evidenceConfidence === "LOW" || context.evidenceConfidence === "UNKNOWN") {
    blockers.push({
      blocker_id: "evidence_confidence_low",
      label: "Evidence confidence is too low",
      rationale:
        "The value target may be moving, but the evidence is not strong enough to support a readout yet.",
      evidence_basis: "Evidence confidence and customer-owned outcome review."
    });
  }
  if (!context.assumptionsReady) {
    blockers.push({
      blocker_id: "customer_assumptions_unresolved",
      label: "Customer assumptions need review",
      rationale:
        "Staffing, rollout, process, or case-mix changes may explain metric movement and need owner review.",
      evidence_basis: "Customer-owned assumptions attached to the governed ROI scenario."
    });
  }
  return blockers.length > 0
    ? blockers
    : [
        {
          blocker_id: "retest_required",
          label: "Retest before changing the value story",
          rationale:
            "The target needs another measurement window before the team changes intervention strategy.",
          evidence_basis: "Aggregate value target status and scenario readiness."
        }
      ];
}

function interventionsFor(blockers: any[]): any[] {
  const byId = new Set(blockers.map((blocker) => blocker.blocker_id));
  const interventions: any[] = [];
  if (byId.has("fluency_readiness_gap") || byId.has("depth_shallow")) {
    interventions.push({
      intervention_id: "targeted_workflow_enablement",
      label: "Run targeted workflow enablement",
      owner: "AI program owner and workflow owner",
      action:
        "Run a focused enablement cycle on the selected workflow, including examples, verification habits, and manager reinforcement.",
      rationale:
        "The fastest improvement path is to help the function use AI in the actual workflow, not just increase generic usage."
    });
  }
  if (byId.has("velocity_not_moving")) {
    interventions.push({
      intervention_id: "workflow_redesign_review",
      label: "Redesign the AI handoff in the workflow",
      owner: "Workflow owner",
      action:
        "Review where AI should enter the workflow and remove steps that keep users returning to the old process.",
      rationale:
        "If velocity is not increasing, the workflow may need a clearer AI-enabled path before the value metric can move."
    });
  }
  if (byId.has("breadth_limited")) {
    interventions.push({
      intervention_id: "expand_role_coverage",
      label: "Expand the workflow playbook to more roles",
      owner: "Function leader",
      action:
        "Identify adjacent roles in the same function and extend the approved workflow playbook after the pilot group stabilizes.",
      rationale:
        "Breadth must expand at the function level before organization-level value modeling becomes credible."
    });
  }
  if (byId.has("evidence_confidence_low") || byId.has("customer_assumptions_unresolved")) {
    interventions.push({
      intervention_id: "strengthen_evidence_review",
      label: "Strengthen the evidence review",
      owner: "Customer data owner",
      action:
        "Review baseline, comparison, source, and operating assumptions before stronger value language changes.",
      rationale:
        "The right move may be better evidence, not a stronger claim."
    });
  }
  return interventions.length > 0
    ? interventions
    : [
        {
          intervention_id: "continue_measurement",
          label: "Continue the current measurement cycle",
          owner: "Value-readout owner",
          action:
            "Keep the current intervention running and re-measure after the next aggregate window.",
          rationale:
            "No clear blocker emerged, so changing the program now would be premature."
        }
      ];
}

export function buildValueImprovementLoopFromRoiScenario(
  roiScenario: any,
  options: BuildValueImprovementLoopOptions = {}
): any {
  const metric = firstMetric(roiScenario);
  const workflowFamily = String(
    roiScenario?.workflow?.workflow_family ?? "client_workflow"
  );
  const assumptions = Array.isArray(roiScenario?.customer_owned_assumptions)
    ? roiScenario.customer_owned_assumptions
    : [];
  const assumptionsReady = assumptions.every(
    (assumption: any) => String(assumption.state ?? "MISSING").toUpperCase() === "PRESENT"
  );
  const context = {
    fluencyReadiness: options.fluencyReadiness ?? "MIXED",
    velocityStatus: options.velocityStatus ?? "STALLING",
    breadthStatus: options.breadthStatus ?? "LIMITED",
    depthStatus: options.depthStatus ?? "SHALLOW",
    evidenceConfidence: options.evidenceConfidence ?? "MEDIUM",
    assumptionsReady
  };
  const blockers = blockerList(context);
  const interventions = interventionsFor(blockers);

  return {
    schema_version: VALUE_IMPROVEMENT_LOOP_SCHEMA_VERSION,
    improvement_loop_id:
      options.improvementLoopId ??
      `improvement_loop_${workflowFamily.replace(/[^a-z0-9_]/gi, "_")}_v1`,
    source_refs: {
      roi_scenario_id: roiScenario?.roi_scenario_id ?? null,
      readiness_id: roiScenario?.source_refs?.readiness_id ?? null
    },
    workflow: {
      workflow_family: workflowFamily,
      workflow_name: String(roiScenario?.workflow?.workflow_name ?? humanize(workflowFamily)),
      function_area: humanize(workflowFamily.split("_").slice(0, 2).join("_")),
      value_route: String(roiScenario?.workflow?.value_route ?? "UNCLASSIFIED")
    },
    value_target: {
      metric_id: String(metric.metric_id ?? "selected_metric"),
      metric_name: String(metric.name ?? "Selected outcome metric"),
      measurement_unit: String(metric.measurement_unit ?? "customer-approved unit"),
      source_system: sourceName(metric),
      expected_direction:
        String(metric.value_route ?? "") === "CAPACITY_CREATION" ? "REDUCE" : "IMPROVE",
      current_status: options.valueTargetStatus ?? "NOT_IMPROVING",
      status_rationale:
        "Treat the target as not yet improving until the customer-owned comparison window and aggregate work-pattern movement support a stronger readout."
    },
    vbd_context: {
      fluency_readiness: context.fluencyReadiness,
      velocity_status: context.velocityStatus,
      breadth_status: context.breadthStatus,
      depth_status: context.depthStatus,
      evidence_confidence: context.evidenceConfidence,
      summary:
        "Velocity, Breadth, and Depth are aggregate work-pattern context; they guide intervention planning and do not prove business impact."
    },
    likely_blockers: blockers,
    recommended_interventions: interventions,
    retest_plan: {
      window_label: "30-45 days after intervention",
      measurement_plan:
        "Recheck aggregate AI Fluency, Velocity, Breadth, Depth, and the selected functional metric after the intervention window.",
      success_signal:
        "The function shows improving VBD movement and the customer-owned metric moves in the expected direction.",
      decision_after_retest:
        "Expand, adjust the intervention, strengthen evidence, or hold value language based on aggregate results."
    },
    next_data_needed: [
      "Aggregate AI Fluency follow-up by function",
      "Velocity, Breadth, and Depth movement by workflow family",
      `${String(metric.name ?? "Selected outcome metric")} from ${sourceName(metric)}`,
      "Customer-owned baseline and comparison window review",
      "Customer-owned assumptions for operating changes during the same period"
    ],
    safe_language: {
      allowed_phrases: [
        "The value target is not improving yet, so the team should adjust the intervention and re-measure.",
        "VBD movement can guide the next workflow intervention, but customer outcome data owns the value test.",
        "This is an advisory improvement loop, not proof of ROI or causality."
      ],
      required_caveats: [
        "All guidance is aggregate-only and should be reviewed with the customer owner.",
        "VBD and AI Fluency guide intervention planning; they do not prove business impact.",
        "Customer-owned outcome evidence is required before stronger value language."
      ],
      blocked_claims: REQUIRED_BLOCKED_CLAIMS
    },
    economic_output_policy: {
      customer_facing_economic_output: false,
      dollarized_output: false,
      realized_roi_calculation: false
    },
    governance_boundaries: Object.fromEntries(
      GOVERNANCE_BOUNDARIES.map((boundary) => [boundary, false])
    )
  };
}
