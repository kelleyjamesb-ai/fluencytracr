/**
 * Translates AI Value Engine spine results into client-facing workshop
 * language. The workspace must never surface internal object names,
 * snake_case states, or governance jargon to clients.
 */
import type { AiValueSpineRun } from "./aiValueApi";

export interface AiValueKickoffContext {
  clientName: string;
  objectiveStatement: string;
  sponsorQuestion: string;
  objectiveCount: number;
  successMeasures: string[];
  fluency: {
    respondents: number;
    strongest: string;
    biggestGap: string;
    withheldGroups: number;
    note: string;
  } | null;
}

export interface AiValueWorkspaceViewModel {
  kickoff?: AiValueKickoffContext | null;
  workflowName: string;
  valueRouteLabel: string;
  decisionLabel: string;
  claimModeLabel: string;
  valueSignals: Array<{
    question: string;
    measure: string;
    source: string;
    status: string;
  }>;
  valueStory: Array<{ label: string; interpretation: string }>;
  evidenceChecks: Array<{ label: string; state: string; detail: string }>;
  safeLanguage: {
    canSay: string[];
    needsValidation: string[];
    cannotSay: string[];
  };
  executiveBrief: {
    sponsorDecision: string;
    summary: string;
    nextAction: string;
  };
}

const DECISION_LABELS: Record<string, string> = {
  READY_FOR_EXECUTIVE_VALIDATION: "Ready for sponsor validation",
  HOLD_FOR_ASSUMPTIONS: "Needs client assumptions",
  HOLD_FOR_SOURCE_COVERAGE: "Needs evidence sources",
  HOLD_FOR_BASELINE: "Needs a baseline window",
  HOLD_FOR_METRIC_MAPPING: "Needs value signal mapping",
  HOLD_FOR_BLUEPRINT: "Needs workflow canvas work",
  HOLD_FOR_SCENARIO: "Needs value story review",
  STOP_FOR_GOVERNANCE_REVIEW: "Paused for governance review"
};

const CLAIM_MODE_LABELS: Record<string, string> = {
  INTERNAL_ONLY: "Internal planning only",
  CAVEATED: "Shareable with caveats",
  MISSING: "Not shareable yet",
  BLOCKED: "Not shareable yet"
};

const VALUE_ROUTE_LABELS: Record<string, string> = {
  COST_REDUCTION: "Cost reduction",
  CAPACITY_CREATION: "Capacity creation",
  QUALITY_IMPROVEMENT: "Quality improvement",
  RISK_REDUCTION: "Risk reduction",
  EXPERIENCE_IMPROVEMENT: "Experience improvement",
  REVENUE_EXPANSION: "Revenue expansion",
  UNCLASSIFIED: "Value route to confirm"
};

const SIGNAL_STATUS_LABELS: Record<string, string> = {
  CAVEATED_VALUE_INVESTIGATION: "Ready to map",
  SOURCE_READINESS_ONLY: "Needs source check",
  INTERNAL_ONLY: "Internal only",
  BLOCKED: "Needs owner"
};

const BAND_LABELS: Record<string, string> = {
  CONSERVATIVE: "Most cautious",
  BASE_CASE: "Working case",
  EXPANDED: "Expansion case"
};

const CHECK_LABELS: Array<{ key: string; label: string }> = [
  { key: "workflow_state", label: "Workflow canvas" },
  { key: "metric_state", label: "Value signals" },
  { key: "baseline_state", label: "Baseline window" },
  { key: "assumption_state", label: "Client assumptions" },
  { key: "scenario_state", label: "Value story" },
  { key: "governance_state", label: "Governance review" }
];

const CHECK_STATE_LABELS: Record<string, string> = {
  PRESENT: "Ready",
  CAVEATED: "Needs input",
  MISSING: "Needs input",
  SUPPRESSED: "Paused",
  BLOCKED: "Paused"
};

const CHECK_DETAILS: Record<string, string> = {
  PRESENT: "This step has what it needs for the workshop.",
  CAVEATED: "The client still owns open inputs for this step.",
  MISSING: "This step is missing inputs the client needs to provide.",
  SUPPRESSED: "This step is held back until evidence volume is safe to share.",
  BLOCKED: "This step is paused pending governance review."
};

const BLOCKED_CLAIM_LABELS: Record<string, string> = {
  roi_proof: "Proven ROI",
  causality_claim: "AI caused the improvement",
  individual_scoring: "Individual performance scoring",
  team_or_manager_ranking: "Team or org comparisons",
  hr_analytics: "Individual-level people analytics",
  productivity_measurement: "Productivity measurement",
  realized_roi_calculation: "Realized ROI math",
  customer_facing_economic_output: "Customer-facing economic figures",
  dashboard_or_runtime_implementation: "Always-on dashboarding"
};

const humanizeWorkflowFamily = (family: string): string => {
  const text = family.replace(/_/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const CONSTRUCT_LABELS: Record<string, string> = {
  confidence: "Confidence",
  usage_quality: "Usage quality",
  behavior_change: "Behavior change",
  leadership_reinforcement: "Leadership reinforcement",
  capability_growth: "Capability growth",
  ai_attitude: "AI attitude",
  behavioral_intent: "Intent to use AI more",
  perceived_ai_impact: "Perceived AI impact"
};

export function buildKickoffContext(
  engagement: Record<string, any> | null,
  fluencySummary: Record<string, any> | null
): AiValueKickoffContext | null {
  if (!engagement) return null;
  let fluency: AiValueKickoffContext["fluency"] = null;
  const means = (fluencySummary?.construct_means ?? {}) as Record<string, number | null>;
  const scored = Object.entries(means).filter(([, value]) => typeof value === "number") as Array<[
    string,
    number
  ]>;
  if (fluencySummary && scored.length > 0) {
    const sorted = [...scored].sort((a, b) => b[1] - a[1]);
    fluency = {
      respondents: Number(fluencySummary.total_respondents ?? 0),
      strongest: CONSTRUCT_LABELS[sorted[0][0]] ?? sorted[0][0],
      biggestGap: CONSTRUCT_LABELS[sorted[sorted.length - 1][0]] ?? sorted[sorted.length - 1][0],
      withheldGroups: Number(fluencySummary.suppressed_cohorts ?? 0),
      note: "Directional kickoff signal from the fluency check. Never used to score or compare people."
    };
  }
  const objectives: Array<Record<string, any>> = Array.isArray(
    engagement?.business_objectives
  )
    ? engagement.business_objectives
    : engagement?.business_objective
      ? [engagement.business_objective]
      : [];
  const pilotObjectiveId = (engagement?.use_cases ?? []).find(
    (useCase: any) => useCase?.priority_state === "PILOT_SELECTED"
  )?.objective_id;
  const primaryObjective =
    objectives.find((objective) => objective.objective_id === pilotObjectiveId) ??
    objectives[0];

  const DIRECTION_LABELS: Record<string, string> = {
    IMPROVE: "improve",
    REDUCE: "reduce",
    MAINTAIN: "hold steady"
  };
  const successMeasures = objectives.flatMap((objective) =>
    (objective.success_measures ?? []).map(
      (entry: any) =>
        `${entry.measure} (${DIRECTION_LABELS[entry.expected_direction] ?? "review"})`
    )
  );

  return {
    clientName: String(engagement?.client?.client_name ?? "Client"),
    objectiveStatement: String(
      primaryObjective?.objective_statement ??
        "Connect this workflow to a client objective."
    ),
    sponsorQuestion: String(primaryObjective?.positive_business_outcome ?? ""),
    objectiveCount: objectives.length,
    successMeasures,
    fluency
  };
}

export function spineRunToViewModel(run: AiValueSpineRun): AiValueWorkspaceViewModel {
  const blueprint = (run.stages.blueprint.object ?? {}) as Record<string, any>;
  const scenario = (run.stages.scenario.object ?? {}) as Record<string, any>;
  const readiness = (run.stages.readiness.object ?? {}) as Record<string, any>;
  const boundary = (run.stages.claim_boundary.object ?? {}) as Record<string, any>;

  const workflowName =
    (typeof blueprint.workflow_name === "string" && blueprint.workflow_name) ||
    (typeof blueprint.workflow_family === "string"
      ? humanizeWorkflowFamily(blueprint.workflow_family)
      : "Client workflow");

  const valueRoute = blueprint?.value_routes?.primary ?? scenario?.input?.value_route;
  const decisionLabel =
    DECISION_LABELS[run.decision] ?? "Needs workshop follow-up";
  const claimModeLabel =
    CLAIM_MODE_LABELS[boundary.claim_state as string] ?? "Internal planning only";

  const metricReferences: Array<Record<string, any>> =
    scenario?.input?.metric_references ?? [];
  const valueSignals = metricReferences.map((metric) => ({
    question: String(metric.name ?? metric.metric_id ?? "Value signal"),
    measure: String(metric.measurement_unit ?? ""),
    source: String(metric.source_system?.source_name ?? "Client system"),
    status:
      SIGNAL_STATUS_LABELS[metric.allowed_claim_level as string] ?? "Needs owner"
  }));

  const bands: Array<Record<string, any>> = scenario?.input?.scenario_bands ?? [];
  const valueStory = bands.map((band) => ({
    label: BAND_LABELS[band.band as string] ?? String(band.band ?? "Scenario"),
    interpretation: String(band.interpretation ?? "")
  }));

  const checks: Record<string, string> = readiness?.readiness_checks ?? {};
  const evidenceChecks = CHECK_LABELS.filter(({ key }) => checks[key]).map(
    ({ key, label }) => ({
      label,
      state: CHECK_STATE_LABELS[checks[key]] ?? "Needs input",
      detail: CHECK_DETAILS[checks[key]] ?? "The workshop team should review this step."
    })
  );

  const blockedClaims: string[] = boundary?.blocked_claims ?? [];
  const safeLanguage = {
    canSay: (boundary?.safe_claims ?? []).map(String),
    needsValidation: [
      ...(boundary?.caveated_claims ?? []).map(String),
      ...(boundary?.required_caveats ?? []).map(String)
    ],
    cannotSay: blockedClaims.map(
      (claim) => BLOCKED_CLAIM_LABELS[claim] ?? humanizeWorkflowFamily(claim)
    )
  };

  const nextActions: string[] = readiness?.next_actions ?? [];
  const rationale: string[] = readiness?.decision_rationale ?? [];
  const executiveBrief = {
    sponsorDecision: decisionLabel,
    summary:
      rationale.join(" ") ||
      "The workshop evidence has been reviewed with governance gates applied.",
    nextAction: nextActions[0] ?? "Review the workshop outputs with the sponsor."
  };

  return {
    workflowName,
    valueRouteLabel:
      VALUE_ROUTE_LABELS[valueRoute as string] ?? "Value route to confirm",
    decisionLabel,
    claimModeLabel,
    valueSignals,
    valueStory,
    evidenceChecks,
    safeLanguage,
    executiveBrief
  };
}
