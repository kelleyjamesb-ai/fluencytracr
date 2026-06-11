import { useCallback, useEffect, useState } from "react";

import {
  listAiValueObjects,
  reviewOutcomeEvidence,
  fetchAiValueObject,
  fetchReadoutHtml,
  AiValueApiError,
  type AiValueObjectSummary
} from "../lib/aiValueApi";

export type JourneyStageKey =
  | "readiness"
  | "blueprint"
  | "instrumentation"
  | "measurement"
  | "opportunity"
  | "scenario"
  | "readout";

export type JourneyStageState = "done" | "attention" | "todo";

export interface JourneyStage {
  key: JourneyStageKey;
  label: string;
  state: JourneyStageState;
  detail: string;
  objectLabel: string;
  captured: string[];
  missing: string[];
  feedsNext: string;
  nextAction: string;
  link?: string;
}

export interface EvidenceReviewItem {
  exportId: string;
  reviewState: string;
  workflowFamily: string | null;
}

export interface ValueOpportunity {
  id: string;
  workflowName: string;
  metricName: string;
  measurementUnit: string;
  valueRouteLabel: string;
  roiPoint: string;
  gleanEvidence: string;
  sourceSystem: string;
  approvedGrain: string;
  baselineRule: string;
  customerDataNeeded: string;
  status: string;
  nextValidationStep: string;
  scenarioHandoff: string;
  claimBoundary: string;
}

export interface ScenarioBandPlan {
  label: string;
  interpretation: string;
}

export interface ScenarioInputStatus {
  label: string;
  status: "Ready to model" | "Awaiting review" | "Needs owner review" | "Missing input";
  detail: string;
}

export interface EvidenceScenarioPlan {
  decisionLabel: string;
  canTrust: string[];
  needsClientEvidence: string[];
  scenarioInputs: ScenarioInputStatus[];
  scenarioBands: ScenarioBandPlan[];
  scenarioSummary: string;
  safeValueLanguage: string;
  nextClientAction: string;
  unlockConditions: string[];
}

export interface ExecutiveHandoff {
  role: string;
  task: string;
  guardrail: string;
}

export interface ExecutiveOperatingPlan {
  packetStatus: string;
  sponsorDecision: string;
  recommendedNextAction: string;
  handoffs: ExecutiveHandoff[];
  guardrails: string[];
}

export interface ExecutiveReadoutPreview {
  statusLabel: string;
  statusTone: "good" | "warn" | "neutral";
  whatWillOpen: string;
  heldLanguage: string;
  nextOwner: string;
  nextAction: string;
  caveat: string;
  canOpen: boolean;
}

export type SponsorDecisionOptionLabel =
  | "Expand workflow"
  | "Collect stronger evidence"
  | "Request corrected export"
  | "Hold value language"
  | "Return to Blueprint";

export interface SponsorDecisionOption {
  label: SponsorDecisionOptionLabel;
  detail: string;
  action: string;
  feedsNext: string[];
  recommended: boolean;
}

export interface SponsorDecisionLoop {
  statusLabel: string;
  statusTone: "good" | "warn" | "neutral";
  recommendedOptionLabel: SponsorDecisionOptionLabel;
  recommendedReason: string;
  nextAction: string;
  options: SponsorDecisionOption[];
  agentFollowUp: string;
  caveat: string;
}

export interface ClientValueQuestion {
  question: string;
  answer: string;
  detail: string;
}

export interface ClientQuestionMetricBridgeItem {
  id: string;
  sponsorQuestion: string;
  successMeasure: string;
  metricName: string;
  valueRouteLabel: string;
  sourceSystem: string;
  measurementUnit: string;
  baselineRule: string;
  owner: string;
  evidenceStatus: string;
  allowedClaimLevel: string;
  feedsNext: string;
}

export interface ClientQuestionMetricBridge {
  available: boolean;
  statusLabel: string;
  summary: string;
  items: ClientQuestionMetricBridgeItem[];
}

export interface WorkflowHandoff {
  selected: boolean;
  workflowName: string;
  valueRouteLabel: string;
  evidenceStatus: string;
  summary: string;
  nextAction: string;
}

export interface RoiScenarioReadiness {
  available: boolean;
  statusLabel: string;
  workflowName: string;
  valueRouteLabel: string;
  evidenceStatus: string;
  metricName: string;
  sourceSystem: string;
  sourceGrain: string;
  inputs: ScenarioInputStatus[];
  scenarioBands: ScenarioBandPlan[];
  safeValueLanguage: string[];
  blockedOutputs: string[];
  nextAction: string;
  executiveHandoff: string;
}

export interface CustomerEvidenceRequestOwner {
  label: string;
  owner: string;
  detail: string;
}

export interface CustomerEvidenceRequest {
  available: boolean;
  statusLabel: string;
  requestedExport: string;
  sourceSystem: string;
  metricName: string;
  approvedGrain: string;
  baselineWindow: string;
  comparisonWindow: string;
  owners: CustomerEvidenceRequestOwner[];
  reviewStep: string;
  remainingBlockedLanguage: string[];
  nextAction: string;
  caveat: string;
}

export interface CustomerEvidenceReviewFact {
  label: string;
  value: string;
  detail: string;
}

export interface CustomerEvidenceReviewWorkbench {
  available: boolean;
  statusLabel: string;
  statusTone: "good" | "warn" | "neutral";
  reviewState: "MISSING" | "SUBMITTED" | "ACCEPTED" | "REJECTED";
  summary: string;
  reviewer: string;
  reviewerDetail: string;
  matchSummary: string;
  nextAction: string;
  facts: CustomerEvidenceReviewFact[];
  remainingBlockedLanguage: string[];
  reviewableExportId: string | null;
  canReview: boolean;
}

export interface AiValueJourney {
  loading: boolean;
  clientName: string | null;
  stages: JourneyStage[];
  workflowHandoff: WorkflowHandoff;
  valueQuestions: ClientValueQuestion[];
  questionMetricBridge: ClientQuestionMetricBridge;
  evidenceItems: EvidenceReviewItem[];
  opportunities: ValueOpportunity[];
  evidenceScenarioPlan: EvidenceScenarioPlan;
  roiScenarioReadiness: RoiScenarioReadiness;
  customerEvidenceRequest: CustomerEvidenceRequest;
  customerEvidenceReview: CustomerEvidenceReviewWorkbench;
  executivePlan: ExecutiveOperatingPlan;
  executiveReadoutPreview: ExecutiveReadoutPreview;
  sponsorDecisionLoop: SponsorDecisionLoop;
  packetIds: string[];
  errorMessage: string | null;
  refresh: () => Promise<void>;
  review: (exportId: string, decision: "ACCEPTED" | "REJECTED") => Promise<void>;
  openReadout: (packetId: string) => Promise<void>;
}

const DECISION_LABELS: Record<string, string> = {
  READY_FOR_EXECUTIVE_VALIDATION: "Ready for sponsor validation",
  HOLD_FOR_ASSUMPTIONS: "Needs client assumptions",
  HOLD_FOR_SOURCE_COVERAGE: "Needs evidence sources",
  HOLD_FOR_BASELINE: "Needs a baseline window",
  HOLD_FOR_METRIC_MAPPING: "Needs outcome signal mapping",
  HOLD_FOR_BLUEPRINT: "Needs workflow canvas work",
  HOLD_FOR_SCENARIO: "Needs value story review",
  STOP_FOR_GOVERNANCE_REVIEW: "Paused for governance review"
};

const VALUE_ROUTE_LABELS: Record<string, string> = {
  COST_REDUCTION: "Cost savings / cost avoidance",
  CAPACITY_CREATION: "Capacity creation",
  QUALITY_IMPROVEMENT: "Quality improvement",
  RISK_REDUCTION: "Risk reduction",
  EXPERIENCE_IMPROVEMENT: "Experience improvement",
  REVENUE_EXPANSION: "Revenue growth",
  UNCLASSIFIED: "Value route to confirm"
};

const ROI_POINT_BY_ROUTE: Record<string, string> = {
  COST_REDUCTION: "Reduce manual effort, escalation load, rework, or duplicated operating cost.",
  CAPACITY_CREATION: "Handle more work with the same team by shortening cycle time or backlog.",
  QUALITY_IMPROVEMENT: "Improve accuracy, resolution quality, or reduce reopens and defects.",
  RISK_REDUCTION: "Reduce unverified, ambiguous, or policy-risky AI-assisted work.",
  EXPERIENCE_IMPROVEMENT: "Improve customer or employee experience through faster, clearer support.",
  REVENUE_EXPANSION: "Improve revenue workflows such as pipeline movement, renewal, or expansion.",
  UNCLASSIFIED: "Clarify which business value route this workflow should test."
};

const CLAIM_LABELS: Record<string, string> = {
  CAVEATED_VALUE_INVESTIGATION: "Modeled opportunity only; report with caveats after evidence review.",
  SOURCE_READINESS_ONLY: "Source-readiness signal only; not an outcome claim.",
  INTERNAL_ONLY: "Internal planning only.",
  BLOCKED: "Blocked from value claims."
};

const SCENARIO_BAND_LABELS: Record<string, string> = {
  CONSERVATIVE: "Conservative",
  BASE_CASE: "Base case",
  EXPANDED: "Expanded"
};

const CLAIM_STATE_LABELS: Record<string, string> = {
  CAVEATED_VALUE_INVESTIGATION:
    "Caveated value investigation: model the opportunity; do not present realized ROI or causality.",
  SOURCE_READINESS_ONLY:
    "Source readiness only: use this for planning, not customer-facing value claims.",
  INTERNAL_ONLY:
    "Internal planning only: keep the scenario inside the working team until evidence improves.",
  BLOCKED:
    "Blocked from value language until evidence, assumptions, and governance gaps are resolved."
};

const BLOCKED_OUTPUT_LABELS: Record<string, string> = {
  roi_proof: "No realized ROI claim",
  realized_roi_calculation: "No realized ROI claim",
  customer_facing_economic_output: "No customer-facing economic figures",
  causality_claim: "No causality claim",
  individual_scoring: "No individual scoring",
  team_or_manager_ranking: "No team or manager ranking",
  hr_analytics: "No HR analytics",
  productivity_measurement: "No productivity measurement"
};

const sessionRole = () => (localStorage.getItem("role") ?? "ADMIN").trim() || "ADMIN";

const reviewStateOf = (summary: AiValueObjectSummary): string =>
  String((summary.validation as Record<string, unknown>)?.review_state ?? "SUBMITTED");

const latest = (items: AiValueObjectSummary[] = []) => items[items.length - 1] ?? null;

const humanize = (value: string | null | undefined): string => {
  const text = String(value ?? "")
    .replace(/^client_/, "")
    .replace(/_/g, " ")
    .trim();
  return text
    ? text.replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "Client";
};

const compact = (items: Array<string | false | null | undefined>): string[] =>
  items.filter(Boolean) as string[];

const unique = (items: string[]): string[] => Array.from(new Set(items));

const presentableGrain = (value: string | null | undefined): string =>
  humanize(value).replace(/\bId\b/g, "ID");

const sourceName = (metric: Record<string, any>): string =>
  String(metric?.source_system?.source_name ?? "Customer-owned outcome system");

const approvedGrain = (metric: Record<string, any>): string =>
  String(metric?.source_system?.approved_grain ?? "approved aggregate window");

const coverageState = (payload: Record<string, any> | null, lane: string): string =>
  String(payload?.source_coverage?.[lane] ?? "MISSING").toUpperCase();

const scenarioStatusFromCoverage = (state: string): ScenarioInputStatus["status"] => {
  if (state === "PRESENT") return "Ready to model";
  if (state === "CAVEATED") return "Needs owner review";
  return "Missing input";
};

const stateStatus = (state: unknown): ScenarioInputStatus["status"] =>
  scenarioStatusFromCoverage(String(state ?? "MISSING").toUpperCase());

const reviewStateLabel = (state: unknown): string => {
  const normalized = String(state ?? "MISSING").toUpperCase();
  if (normalized === "ACCEPTED") return "Outcome evidence accepted";
  if (normalized === "SUBMITTED") return "Customer export awaiting review";
  if (normalized === "REJECTED") return "Customer export rejected";
  return "Customer outcome export missing";
};

const requiredCaveatLabel = (caveat: unknown): string => {
  const text = String(caveat ?? "").trim();
  if (/scenario bands are planning ranges/i.test(text)) {
    return "Scenario bands are planning ranges, not proof.";
  }
  if (/customer-facing economic output/i.test(text)) {
    return "This artifact does not create customer-facing economic output.";
  }
  return text;
};

const blockedOutputLabel = (claim: unknown): string =>
  BLOCKED_OUTPUT_LABELS[String(claim ?? "")] ?? humanize(String(claim ?? "Blocked output"));

const workflowLabel = (
  blueprint: Record<string, any> | null,
  metricsLibrary: Record<string, any> | null
): string =>
  String(
    blueprint?.workflow_name ??
      metricsLibrary?.workflow_name ??
      humanize(blueprint?.workflow_family ?? metricsLibrary?.workflow_family)
  );

const gleanEvidenceFor = (metric: Record<string, any>): string => {
  const sourceType = String(metric?.source_system?.source_type ?? "");
  if (sourceType === "ai_work_evidence") {
    return "FluencyTracr aggregate AI work evidence: usage quality, verification, recovery, and workflow patterns.";
  }
  return "Glean Search, Assistant, Skills, Agents, MCP, and workflow telemetry can show aggregate AI-enabled work around this process.";
};

async function maybeFetchPayload(
  role: string,
  summary: AiValueObjectSummary | null
): Promise<Record<string, any> | null> {
  if (!summary) return null;
  try {
    const detail = await fetchAiValueObject(role, summary.object_type, summary.object_id);
    return detail.payload as Record<string, any>;
  } catch {
    return null;
  }
}

function buildEvidenceItems(byType: Record<string, AiValueObjectSummary[]>): EvidenceReviewItem[] {
  return (byType.outcome_evidence_export ?? []).map((summary) => ({
    exportId: summary.object_id,
    reviewState: reviewStateOf(summary),
    workflowFamily: summary.workflow_family
  }));
}

function buildValueOpportunities(
  metricsLibrary: Record<string, any> | null,
  blueprint: Record<string, any> | null,
  evidenceItems: EvidenceReviewItem[]
): ValueOpportunity[] {
  const metrics = Array.isArray(metricsLibrary?.metrics) ? metricsLibrary.metrics : [];
  const workflowFamily = blueprint?.workflow_family ?? metricsLibrary?.workflow_family ?? null;
  const valueRoutes = [
    blueprint?.value_routes?.primary,
    ...(Array.isArray(blueprint?.value_routes?.secondary)
      ? blueprint.value_routes.secondary
      : [])
  ].filter(Boolean);

  const acceptedEvidence = evidenceItems.some(
    (item) =>
      item.reviewState === "ACCEPTED" &&
      (!workflowFamily || item.workflowFamily === workflowFamily)
  );
  const submittedEvidence = evidenceItems.some(
    (item) =>
      item.reviewState === "SUBMITTED" &&
      (!workflowFamily || item.workflowFamily === workflowFamily)
  );

  return metrics
    .filter((metric: Record<string, any>) => {
      const metricWorkflow = metric.workflow_family ?? metricsLibrary?.workflow_family;
      const routeMatch = valueRoutes.length === 0 || valueRoutes.includes(metric.value_route);
      return (!workflowFamily || metricWorkflow === workflowFamily) && routeMatch;
    })
    .map((metric: Record<string, any>) => {
      const route = String(metric.value_route ?? "UNCLASSIFIED");
      const status = acceptedEvidence
        ? "Outcome evidence attached"
        : submittedEvidence
          ? "Customer export awaiting review"
          : "Modeled opportunity, needs customer data";
      return {
        id: String(metric.metric_id ?? metric.name),
        workflowName: workflowLabel(blueprint, metricsLibrary),
        metricName: String(metric.name ?? "Outcome signal"),
        measurementUnit: String(metric.measurement_unit ?? "customer-approved unit"),
        valueRouteLabel: VALUE_ROUTE_LABELS[route] ?? VALUE_ROUTE_LABELS.UNCLASSIFIED,
        roiPoint: ROI_POINT_BY_ROUTE[route] ?? ROI_POINT_BY_ROUTE.UNCLASSIFIED,
        gleanEvidence: gleanEvidenceFor(metric),
        sourceSystem: sourceName(metric),
        approvedGrain: approvedGrain(metric),
        baselineRule: String(metric.baseline_rule ?? "Baseline window required."),
        customerDataNeeded: `${sourceName(metric)} at ${approvedGrain(metric)}; ${String(
          metric.baseline_rule ?? "Baseline window required."
        )}`,
        status,
        nextValidationStep: acceptedEvidence
          ? "Review whether the attached customer outcome evidence supports a caveated readout."
          : "Ask the customer data owner for baseline and comparison exports for this metric.",
        scenarioHandoff:
          "Model as a governed value scenario after the customer owner confirms baseline, comparison, assumptions, and source coverage.",
        claimBoundary:
          CLAIM_LABELS[String(metric.allowed_claim_level ?? "")] ??
          "Governance review required before this becomes customer-facing."
      };
    });
}

function buildEvidenceScenarioPlan(params: {
  readiness: Record<string, any> | null;
  scenario: Record<string, any> | null;
  evidenceItems: EvidenceReviewItem[];
  opportunities: ValueOpportunity[];
}): EvidenceScenarioPlan {
  const { readiness, scenario, evidenceItems, opportunities } = params;
  const acceptedEvidence = evidenceItems.some((item) => item.reviewState === "ACCEPTED");
  const submittedEvidence = evidenceItems.some((item) => item.reviewState === "SUBMITTED");

  const canTrust = compact([
    ["ai_activity", "workflow", "trust", "suppression"].some(
      (lane) => coverageState(readiness, lane) === "PRESENT"
    ) && "FluencyTracr aggregate evidence",
    opportunities.length > 0 && "Blueprint value route mapped to outcome and ROI opportunities",
    acceptedEvidence && "Accepted customer outcome export"
  ]);

  const needsClientEvidence = compact([
    coverageState(readiness, "baseline") !== "PRESENT" &&
      "Baseline window and comparison period from the customer system.",
    !acceptedEvidence &&
      (submittedEvidence
        ? "Customer export awaiting review"
        : "Customer outcome export for the selected metric."),
    coverageState(readiness, "assumptions") !== "PRESENT" &&
      "Customer-owned assumptions for staffing, rollout, process, and metric definition."
  ]);

  const scenarioBands = (Array.isArray(scenario?.input?.scenario_bands)
    ? scenario.input.scenario_bands
    : []
  ).map((band: Record<string, any>) => ({
    label: SCENARIO_BAND_LABELS[String(band.band)] ?? humanize(String(band.band ?? "Scenario")),
    interpretation: String(band.interpretation ?? "Scenario interpretation needs client review.")
  }));

  const hasAggregateEvidence = ["ai_activity", "workflow", "trust", "suppression"].some(
    (lane) => coverageState(readiness, lane) === "PRESENT"
  );
  const scenarioInputs: ScenarioInputStatus[] = [
    {
      label: "AI work evidence",
      status: hasAggregateEvidence ? "Ready to model" : "Missing input",
      detail:
        "Aggregate Glean and FluencyTracr work patterns can shape the scenario; they are not outcome proof."
    },
    {
      label: "Customer outcome export",
      status: acceptedEvidence
        ? "Ready to model"
        : submittedEvidence
          ? "Awaiting review"
          : "Missing input",
      detail: acceptedEvidence
        ? "Customer-owned outcome evidence is attached for caveated value review."
        : submittedEvidence
          ? "Accept or reject the submitted customer outcome export before strengthening value language."
          : "Attach an aggregate customer outcome export for the selected metric."
    },
    {
      label: "Baseline and comparison window",
      status: scenarioStatusFromCoverage(coverageState(readiness, "baseline")),
      detail:
        "The customer-owned baseline and comparison windows define the range being modeled."
    },
    {
      label: "Customer-owned assumptions",
      status: scenarioStatusFromCoverage(coverageState(readiness, "assumptions")),
      detail:
        "Staffing, rollout, process, and metric assumptions must be approved by the customer owner."
    },
    {
      label: "Scenario bands",
      status: scenarioBands.length > 0 ? "Ready to model" : "Missing input",
      detail: "Scenario bands are ranges for planning, not proof."
    }
  ];

  const claimState = String(scenario?.output?.claim_state ?? "BLOCKED");
  const nextAction = Array.isArray(readiness?.next_actions) && readiness.next_actions.length > 0
    ? String(readiness.next_actions[0])
    : submittedEvidence
      ? "Review submitted customer evidence with the data owner."
      : "Collect baseline, comparison, assumptions, and source coverage before strengthening value language.";
  const unlockConditions = compact([
    submittedEvidence && !acceptedEvidence && "Accept or reject the submitted customer outcome export.",
    !acceptedEvidence && !submittedEvidence && "Attach a customer outcome export for the selected metric.",
    coverageState(readiness, "baseline") !== "PRESENT" &&
      "Attach baseline and comparison windows from the customer-owned system.",
    coverageState(readiness, "assumptions") !== "PRESENT" &&
      "Approve staffing, rollout, process, and metric assumptions with the customer owner.",
    "Run claim review before presenting stronger value language."
  ]);

  return {
    decisionLabel:
      DECISION_LABELS[String(readiness?.decision ?? "")] ??
      (acceptedEvidence
        ? "Ready for caveated review"
        : submittedEvidence
          ? "Customer evidence awaiting review"
          : "Needs client evidence"),
    canTrust:
      canTrust.length > 0
        ? canTrust
        : ["Blueprint and Metrics define the planned evidence path."],
    needsClientEvidence:
      needsClientEvidence.length > 0
        ? needsClientEvidence
        : ["No major evidence gap for the current scenario."],
    scenarioInputs,
    scenarioBands,
    scenarioSummary: String(
      scenario?.output?.scenario_summary ??
        "Scenario draft will appear after the value opportunity is modeled."
    ),
    safeValueLanguage:
      CLAIM_STATE_LABELS[claimState] ?? CLAIM_STATE_LABELS.BLOCKED,
    nextClientAction: nextAction,
    unlockConditions
  };
}

function buildExecutiveOperatingPlan(params: {
  packetCount: number;
  evidenceScenarioPlan: EvidenceScenarioPlan;
  opportunities: ValueOpportunity[];
  customerEvidenceRequest?: CustomerEvidenceRequest;
  customerEvidenceReview?: CustomerEvidenceReviewWorkbench;
}): ExecutiveOperatingPlan {
  const {
    packetCount,
    evidenceScenarioPlan,
    opportunities,
    customerEvidenceRequest,
    customerEvidenceReview
  } = params;
  const reviewer = customerEvidenceReview?.reviewer ?? "Customer data owner";
  const metricName = customerEvidenceRequest?.metricName ?? "selected outcome signal";
  const sourceSystem = customerEvidenceRequest?.sourceSystem ?? "customer-owned outcome system";
  const approvedGrain = customerEvidenceRequest?.approvedGrain ?? "approved aggregate export";
  const requestReady = customerEvidenceRequest?.available === true;

  const defaultRecommendedAction =
    opportunities.length > 0
      ? customerEvidenceRequest?.nextAction ?? evidenceScenarioPlan.nextClientAction
      : "Finish Blueprint and outcome mapping before assigning follow-up work.";
  const defaultSponsorDecision =
    packetCount > 0
      ? "Decide whether to expand the workflow pilot, collect stronger customer evidence, or hold external value language."
      : "Decide what evidence is still needed before the sponsor packet is generated.";

  const reviewState = requestReady ? customerEvidenceReview?.reviewState ?? "MISSING" : null;
  const evidenceCadence =
    reviewState === "ACCEPTED"
      ? {
          sponsorDecision:
            "Decide whether the accepted evidence is ready for a caveated sponsor readout, expansion planning, or a hold for stronger assumptions.",
          recommendedNextAction:
            "Prepare the caveated sponsor readout with accepted evidence, customer assumptions, and blocked value language attached.",
          valueReadoutTask:
            "Use Blueprint, outcome mapping, accepted evidence, assumptions, and safe language to prepare the caveated readout.",
          evidenceReadinessTask:
            "Confirm the accepted aggregate export stays attached to the packet with source, window, and blocked-claim caveats visible."
        }
      : reviewState === "SUBMITTED"
        ? {
            sponsorDecision:
              "Hold stronger value language until the submitted customer export is accepted or rejected.",
            recommendedNextAction:
              `Have ${reviewer} review the submitted aggregate export against ${metricName}, ${sourceSystem}, ${approvedGrain}, and approved windows.`,
            valueReadoutTask:
              "Keep the sponsor readout in draft status; prepare only caveats and blocked language until review completes.",
            evidenceReadinessTask:
              `Route reviewer action: have ${reviewer} accept or reject the submitted aggregate export against the request.`
          }
        : reviewState === "REJECTED"
          ? {
              sponsorDecision:
                "Hold stronger value language and request a corrected aggregate export.",
              recommendedNextAction:
                `Ask ${reviewer} to resubmit the aggregate ${metricName} export from ${sourceSystem} at ${approvedGrain} for the approved windows.`,
              valueReadoutTask:
                "Keep the readout blocked from stronger value language until corrected evidence is accepted.",
              evidenceReadinessTask:
                `Use the Customer Evidence Request to request the corrected aggregate export from ${reviewer}.`
            }
          : reviewState === "MISSING"
            ? {
                sponsorDecision:
                  "Hold stronger value language until the data owner submits the requested aggregate export.",
                recommendedNextAction: defaultRecommendedAction,
                valueReadoutTask:
                  "Keep the readout in planning status and carry only modeled opportunity language with caveats.",
                evidenceReadinessTask:
                  `Use the Customer Evidence Request to send the data-owner request to ${reviewer}.`
              }
            : null;

  return {
    packetStatus: packetCount > 0 ? "Sponsor packet ready" : "Needs sponsor packet",
    sponsorDecision: evidenceCadence?.sponsorDecision ?? defaultSponsorDecision,
    recommendedNextAction: evidenceCadence?.recommendedNextAction ?? defaultRecommendedAction,
    handoffs: [
      {
        role: "Value-readout agent",
        task:
          evidenceCadence?.valueReadoutTask ??
          "Prepare the sponsor narrative from Blueprint, outcome mapping, evidence readiness, scenario bands, and safe value language.",
        guardrail: "No realized ROI claim."
      },
      {
        role: "Evidence readiness agent",
        task:
          evidenceCadence?.evidenceReadinessTask ??
          "Turn the Customer Evidence Request into a data-owner ask, then track baseline exports, customer owner review, source coverage, and unresolved assumptions.",
        guardrail: "No causality claim."
      },
      {
        role: "Blueprint and metrics agent",
        task:
          "Carry sponsor decisions back into the workflow canvas and ROI opportunity mapping.",
        guardrail: "No individual or manager scoring."
      }
    ],
    guardrails: [
      "No realized ROI claim",
      "No causality claim",
      "No individual or manager scoring",
      "No productivity ranking"
    ]
  };
}

function buildExecutiveReadoutPreview(params: {
  packetCount: number;
  customerEvidenceRequest: CustomerEvidenceRequest;
  customerEvidenceReview: CustomerEvidenceReviewWorkbench;
  executivePlan: ExecutiveOperatingPlan;
}): ExecutiveReadoutPreview {
  const {
    packetCount,
    customerEvidenceRequest,
    customerEvidenceReview,
    executivePlan
  } = params;
  const reviewer = customerEvidenceReview.reviewer || "Customer data owner";
  const metricName = customerEvidenceRequest.metricName || "selected outcome signal";

  if (packetCount === 0) {
    return {
      statusLabel: "Needs generated readout",
      statusTone: "warn",
      whatWillOpen:
        "Generate the executive packet before opening the sponsor readout.",
      heldLanguage:
        "Value language stays held until the packet, evidence state, and caveats are ready.",
      nextOwner: reviewer,
      nextAction: executivePlan.recommendedNextAction,
      caveat:
        "The preview is planning guidance until a governed executive packet exists.",
      canOpen: false
    };
  }

  if (customerEvidenceReview.reviewState === "ACCEPTED") {
    return {
      statusLabel: "Caveated sponsor review",
      statusTone: "good",
      whatWillOpen:
        `The opened readout will include Blueprint, outcome mapping, scenario language, ` +
        `accepted aggregate ${metricName} evidence, and blocked value language.`,
      heldLanguage:
        "Realized ROI, causality, productivity, and individual scoring stay out.",
      nextOwner: `${reviewer} and the sponsor`,
      nextAction:
        "Review the caveated readout with accepted evidence; decide expansion, hold, or collect stronger assumptions.",
      caveat:
        "Accepted evidence is caveated support only; it is not ROI proof and does not establish causality.",
      canOpen: true
    };
  }

  if (customerEvidenceReview.reviewState === "SUBMITTED") {
    return {
      statusLabel: "Review pending",
      statusTone: "warn",
      whatWillOpen:
        "The opened readout will include Blueprint, outcome mapping, scenario language, and a pending evidence section.",
      heldLanguage:
        `Stronger value language stays held until ${reviewer} accepts or rejects the export.`,
      nextOwner: reviewer,
      nextAction: customerEvidenceReview.nextAction,
      caveat:
        "Submitted evidence does not validate value yet.",
      canOpen: true
    };
  }

  if (customerEvidenceReview.reviewState === "REJECTED") {
    return {
      statusLabel: "Corrected export needed",
      statusTone: "warn",
      whatWillOpen:
        "The opened readout will include the corrected-export request and blocked value language.",
      heldLanguage:
        "Validated value language stays held until a corrected aggregate export is accepted.",
      nextOwner: reviewer,
      nextAction: customerEvidenceReview.nextAction,
      caveat:
        "Rejected evidence cannot support value claims.",
      canOpen: true
    };
  }

  return {
    statusLabel: "Data owner request needed",
    statusTone: "neutral",
    whatWillOpen:
      "The opened readout will include modeled opportunity language, the customer evidence request, and required caveats.",
    heldLanguage:
      "Outcome validation and stronger ROI language stay held until the aggregate export arrives and passes review.",
    nextOwner: reviewer,
    nextAction: customerEvidenceReview.nextAction,
    caveat:
      "Missing evidence keeps the readout in planning status.",
    canOpen: true
  };
}

function buildSponsorDecisionLoop(params: {
  customerEvidenceRequest: CustomerEvidenceRequest;
  customerEvidenceReview: CustomerEvidenceReviewWorkbench;
  executivePlan: ExecutiveOperatingPlan;
}): SponsorDecisionLoop {
  const { customerEvidenceRequest, customerEvidenceReview, executivePlan } = params;
  const reviewer = customerEvidenceReview.reviewer || "Customer data owner";
  const metricName = customerEvidenceRequest.metricName || "selected outcome signal";
  const sourceSystem =
    customerEvidenceRequest.sourceSystem || "customer-owned outcome system";
  const approvedGrain =
    customerEvidenceRequest.approvedGrain || "approved aggregate export";

  let statusLabel = "Data-owner request needed";
  let statusTone: SponsorDecisionLoop["statusTone"] = "neutral";
  let recommendedOptionLabel: SponsorDecisionOptionLabel = "Collect stronger evidence";
  let recommendedReason =
    "The aggregate customer evidence has not arrived yet; keep the request moving before stronger value language.";
  let nextAction = customerEvidenceReview.nextAction || executivePlan.recommendedNextAction;

  if (!customerEvidenceRequest.available) {
    statusLabel = "Return to Blueprint";
    statusTone = "warn";
    recommendedOptionLabel = "Return to Blueprint";
    recommendedReason =
      "The workflow, outcome signal, or evidence request is not ready enough for a sponsor value decision.";
    nextAction = executivePlan.recommendedNextAction;
  } else if (customerEvidenceReview.reviewState === "ACCEPTED") {
    statusLabel = "Caveated expansion review";
    statusTone = "good";
    recommendedOptionLabel = "Expand workflow";
    recommendedReason =
      "The accepted customer evidence can support caveated expansion review; it still does not prove ROI or causality.";
    nextAction =
      "Review expansion with caveats, assumptions, and blocked value language attached.";
  } else if (customerEvidenceReview.reviewState === "SUBMITTED") {
    statusLabel = "Reviewer action needed";
    statusTone = "warn";
    recommendedOptionLabel = "Collect stronger evidence";
    recommendedReason =
      `The submitted customer evidence needs ${reviewer} review before stronger value language can move forward.`;
    nextAction = customerEvidenceReview.nextAction;
  } else if (customerEvidenceReview.reviewState === "REJECTED") {
    statusLabel = "Corrected export needed";
    statusTone = "warn";
    recommendedOptionLabel = "Request corrected export";
    recommendedReason =
      "The rejected evidence cannot support value claims; corrected aggregate evidence must come back before review continues.";
    nextAction = customerEvidenceReview.nextAction;
  }

  const options: Array<Omit<SponsorDecisionOption, "recommended">> = [
    {
      label: "Expand workflow",
      detail:
        "Use the caveated readout to decide where the workflow should scale next.",
      action:
        "Confirm sponsor appetite, expansion boundary, and which workflow changes move back into the workshop.",
      feedsNext: ["Blueprint", "Executive Operating Packet"]
    },
    {
      label: "Collect stronger evidence",
      detail:
        "Move the aggregate customer proof forward without treating it as validated value yet.",
      action:
        customerEvidenceReview.reviewState === "SUBMITTED"
          ? customerEvidenceReview.nextAction
          : customerEvidenceRequest.nextAction,
      feedsNext: ["Customer Evidence Request", "Evidence Review"]
    },
    {
      label: "Request corrected export",
      detail:
        "Ask for a corrected aggregate export when source, metric, grain, or window checks do not match.",
      action:
        `Ask ${reviewer} to resubmit ${metricName} from ${sourceSystem} at ${approvedGrain}.`,
      feedsNext: ["Customer Evidence Request", "Evidence Review"]
    },
    {
      label: "Hold value language",
      detail:
        "Keep stronger ROI and outcome language out of the readout until evidence and assumptions support it.",
      action:
        "Carry blocked language and caveats into the scenario review before sponsor sharing.",
      feedsNext: ["ROI Scenario Readiness", "Executive Operating Packet"]
    },
    {
      label: "Return to Blueprint",
      detail:
        "Bring sponsor feedback back into the workshop canvas for the next workflow or a revised operating path.",
      action:
        "Update the workflow canvas, handoffs, success measure, and instrumentation plan.",
      feedsNext: ["Blueprint"]
    }
  ];

  return {
    statusLabel,
    statusTone,
    recommendedOptionLabel,
    recommendedReason,
    nextAction,
    options: options.map((option) => ({
      ...option,
      recommended: option.label === recommendedOptionLabel
    })),
    agentFollowUp:
      "Follow-up prepares handoffs only; no customer action is automated.",
    caveat:
      "Sponsor decisions can route the next workflow, evidence request, scenario review, or readout; they do not create ROI proof or causality claims."
  };
}

function buildClientValueQuestions(params: {
  opportunities: ValueOpportunity[];
  evidenceScenarioPlan: EvidenceScenarioPlan;
  executivePlan: ExecutiveOperatingPlan;
  customerEvidenceRequest?: CustomerEvidenceRequest;
  customerEvidenceReview?: CustomerEvidenceReviewWorkbench;
}): ClientValueQuestion[] {
  const {
    opportunities,
    evidenceScenarioPlan,
    executivePlan,
    customerEvidenceRequest,
    customerEvidenceReview
  } = params;
  const primaryOpportunity = opportunities[0] ?? null;
  const workflow = primaryOpportunity?.workflowName ?? "Select the first workflow in Blueprint.";
  const roiOpportunity = primaryOpportunity
    ? `${primaryOpportunity.valueRouteLabel}: ${primaryOpportunity.roiPoint}`
    : "Map the Blueprint to an outcome metric before modeling an ROI opportunity.";
  const gleanEvidence = primaryOpportunity
    ? `${primaryOpportunity.gleanEvidence} Use this as aggregate AI-enabled work evidence, not outcome proof.`
    : "Once instrumentation is mapped, FluencyTracr can show aggregate AI-enabled work patterns around the selected workflow.";
  const reviewer = customerEvidenceReview?.reviewer ?? "customer data owner";
  const reviewState =
    customerEvidenceRequest?.available === true
      ? customerEvidenceReview?.reviewState ?? "MISSING"
      : null;
  const missingProof =
    reviewState === "ACCEPTED"
      ? "Accepted customer evidence is attached for caveated sponsor review; assumptions, caveats, and blocked value language still travel with the packet."
      : reviewState === "SUBMITTED"
        ? "A customer export is awaiting reviewer acceptance before stronger value language can be used."
        : reviewState === "REJECTED"
          ? "A corrected aggregate customer export is still needed before the packet can move into caveated readout."
          : reviewState === "MISSING"
            ? `The aggregate customer export has not arrived yet; ${reviewer} should provide the requested metric, source, export level, and windows.`
            : evidenceScenarioPlan.needsClientEvidence[0] ??
              "No major evidence gap for the current scenario.";

  return [
    {
      question: "What workflow should change first?",
      answer: workflow,
      detail: "Use the Blueprint workshop to agree on the operating workflow, handoffs, and where AI should intervene."
    },
    {
      question: "Where is the ROI opportunity?",
      answer: roiOpportunity,
      detail: "Treat this as a value hypothesis until the customer-owned baseline, comparison window, and assumptions are reviewed."
    },
    {
      question: "What can Glean show now?",
      answer: gleanEvidence,
      detail: "Glean and FluencyTracr can support the work-pattern story; customer outcome systems carry outcome proof."
    },
    {
      question: "What proof is still missing?",
      answer: missingProof,
      detail: "Missing evidence becomes the client data request, not a reason to overstate the claim."
    },
    {
      question: "What can we safely say?",
      answer: evidenceScenarioPlan.safeValueLanguage,
      detail: "Safe language travels with the packet so modeled opportunity does not become unsupported ROI proof."
    },
    {
      question: "What should the client do next?",
      answer: executivePlan.recommendedNextAction,
      detail: "This is the next operating action for the sponsor, data owner, or workflow owner."
    }
  ];
}

const successMeasuresFromEngagement = (engagement: Record<string, any> | null): string[] => {
  const objectives = Array.isArray(engagement?.business_objectives)
    ? engagement.business_objectives
    : engagement?.business_objective
      ? [engagement.business_objective]
      : [];

  return unique(
    objectives.flatMap((objective: Record<string, any>) => {
      const measures = Array.isArray(objective.success_measures)
        ? objective.success_measures
        : Array.isArray(objective.successMeasures)
          ? objective.successMeasures
          : [];
      return measures
        .map((measure: Record<string, any> | string) =>
          typeof measure === "string"
            ? measure
            : String(measure.measure ?? measure.name ?? measure.label ?? "").trim()
        )
        .filter(Boolean);
    })
  );
};

function buildClientQuestionMetricBridge(params: {
  engagement: Record<string, any> | null;
  valueQuestions: ClientValueQuestion[];
  opportunities: ValueOpportunity[];
  customerEvidenceRequest: CustomerEvidenceRequest;
  customerEvidenceReview: CustomerEvidenceReviewWorkbench;
}): ClientQuestionMetricBridge {
  const {
    engagement,
    valueQuestions,
    opportunities,
    customerEvidenceRequest,
    customerEvidenceReview
  } = params;
  const roiQuestion =
    valueQuestions.find((item) => /ROI opportunity/i.test(item.question))?.question ??
    "Where is the ROI opportunity?";
  const successMeasures = successMeasuresFromEngagement(engagement);
  const owner =
    customerEvidenceRequest.owners.find((item) => /baseline|comparison|data/i.test(item.label))
      ?.owner ??
    customerEvidenceReview.reviewer ??
    "Customer data owner";

  if (opportunities.length === 0) {
    return {
      available: false,
      statusLabel: "Needs outcome metric",
      summary:
        "Finish the Blueprint and outcome signal mapping before connecting sponsor questions to governed metrics.",
      items: []
    };
  }

  const bridgeOpportunities =
    successMeasures.length > 0
      ? opportunities.slice(0, Math.max(1, successMeasures.length))
      : opportunities.slice(0, 1);

  return {
    available: true,
    statusLabel: "Question-to-metric path ready",
    summary:
      "This bridge turns sponsor value questions and client success measures into governed metrics, source asks, and the next evidence gate.",
    items: bridgeOpportunities.map((opportunity, index) => ({
      id: opportunity.id,
      sponsorQuestion: roiQuestion,
      successMeasure:
        successMeasures[index] ??
        successMeasures[0] ??
        "Confirm the client success measure in Blueprint.",
      metricName: opportunity.metricName,
      valueRouteLabel: opportunity.valueRouteLabel,
      sourceSystem: opportunity.sourceSystem,
      measurementUnit: opportunity.measurementUnit,
      baselineRule: opportunity.baselineRule,
      owner,
      evidenceStatus: customerEvidenceReview.statusLabel || opportunity.status,
      allowedClaimLevel: opportunity.claimBoundary,
      feedsNext: "Feeds ROI Scenario Readiness and Customer Evidence Request"
    }))
  };
}

function buildWorkflowHandoff(params: {
  blueprint: Record<string, any> | null;
  metricsLibrary: Record<string, any> | null;
  opportunities: ValueOpportunity[];
}): WorkflowHandoff {
  const { blueprint, metricsLibrary, opportunities } = params;
  if (!blueprint) {
    return {
      selected: false,
      workflowName: "No workflow selected yet",
      valueRouteLabel: "Choose the first workflow",
      evidenceStatus: "Value modeling paused",
      summary: "Finish the Blueprint workshop to choose the first client workflow before modeling value.",
      nextAction: "Open Blueprint workshop"
    };
  }

  const primaryRoute = String(
    blueprint?.value_routes?.primary ?? opportunities[0]?.valueRouteLabel ?? "UNCLASSIFIED"
  );
  const valueRouteLabel =
    opportunities[0]?.valueRouteLabel ??
    VALUE_ROUTE_LABELS[primaryRoute] ??
    VALUE_ROUTE_LABELS.UNCLASSIFIED;

  return {
    selected: true,
    workflowName: workflowLabel(blueprint, metricsLibrary),
    valueRouteLabel,
    evidenceStatus: opportunities[0]?.status ?? "Outcome mapping not started",
    summary:
      "Blueprint workflow feeds outcome mapping, evidence readiness, scenario builder, and executive packet.",
    nextAction: "Continue in value workshop"
  };
}

function buildRoiScenarioReadiness(params: {
  roiScenario: Record<string, any> | null;
  workflowHandoff: WorkflowHandoff;
}): RoiScenarioReadiness {
  const { roiScenario, workflowHandoff } = params;
  if (!roiScenario) {
    return {
      available: false,
      statusLabel: "Value modeling not ready yet",
      workflowName: workflowHandoff.workflowName,
      valueRouteLabel: workflowHandoff.valueRouteLabel,
      evidenceStatus: workflowHandoff.evidenceStatus,
      metricName: "No outcome metric selected",
      sourceSystem: "Customer data source not selected",
      sourceGrain: "Approved aggregate export not attached",
      inputs: [
        {
          label: "Baseline window",
          status: "Missing input",
          detail: "Choose the customer-owned baseline period for this workflow."
        },
        {
          label: "Comparison window",
          status: "Missing input",
          detail: "Choose the customer-owned comparison period for this workflow."
        },
        {
          label: "Customer-owned assumptions",
          status: "Missing input",
          detail: "Confirm staffing, rollout, process, and metric assumptions with the client owner."
        }
      ],
      scenarioBands: [],
      safeValueLanguage: [
        "Modeled value language is paused until the workflow, outcome metric, baseline, comparison, and assumptions are ready."
      ],
      blockedOutputs: [
        "No realized ROI claim",
        "No customer-facing economic figures",
        "No causality claim"
      ],
      nextAction:
        "Finish Blueprint, outcome mapping, baseline, comparison, and assumptions before presenting stronger value language.",
      executiveHandoff:
        "Executive packet should hold value language until the governed scenario is ready."
    };
  }

  const workflow = roiScenario.workflow ?? {};
  const valueRoute = String(workflow.value_route ?? "UNCLASSIFIED");
  const metric = Array.isArray(roiScenario.metric_models)
    ? roiScenario.metric_models[0] ?? {}
    : {};
  const evidenceStatus = roiScenario.evidence_status ?? {};
  const baseline = roiScenario.baseline_comparison?.baseline_window ?? {};
  const comparison = roiScenario.baseline_comparison?.comparison_window ?? {};
  const assumptions = Array.isArray(roiScenario.customer_owned_assumptions)
    ? roiScenario.customer_owned_assumptions
    : [];
  const assumptionStates = assumptions.map((assumption: Record<string, any>) =>
    String(assumption.state ?? "MISSING").toUpperCase()
  );
  const assumptionStatus: ScenarioInputStatus["status"] = assumptionStates.includes("MISSING") ||
    assumptionStates.includes("BLOCKED") ||
    assumptionStates.includes("SUPPRESSED")
    ? "Missing input"
    : assumptionStates.includes("CAVEATED")
      ? "Needs owner review"
      : "Ready to model";
  const needsAssumptionReview = assumptionStatus !== "Ready to model";
  const reviewLabel = reviewStateLabel(evidenceStatus.outcome_evidence_review_state);
  const scenarioBands = (Array.isArray(roiScenario.scenario_bands)
    ? roiScenario.scenario_bands
    : []
  ).map((band: Record<string, any>) => ({
    label: SCENARIO_BAND_LABELS[String(band.band)] ?? humanize(String(band.band ?? "Scenario")),
    interpretation: String(band.interpretation ?? "Scenario interpretation needs client review.")
  }));
  const caveats = unique(
    (Array.isArray(roiScenario.safe_value_language?.required_caveats)
      ? roiScenario.safe_value_language.required_caveats
      : []
    )
      .map(requiredCaveatLabel)
      .filter(Boolean)
  );
  const allowedPhrases = unique(
    (Array.isArray(roiScenario.safe_value_language?.allowed_phrases)
      ? roiScenario.safe_value_language.allowed_phrases
      : []
    ).map((phrase: unknown) => String(phrase ?? "").trim()).filter(Boolean)
  );
  const blockedOutputs = unique([
    ...(Array.isArray(roiScenario.safe_value_language?.blocked_claims)
      ? roiScenario.safe_value_language.blocked_claims.map(blockedOutputLabel)
      : []),
    roiScenario.economic_output_policy?.realized_roi_calculation === false && "No realized ROI claim",
    roiScenario.economic_output_policy?.customer_facing_economic_output === false &&
      "No customer-facing economic figures"
  ].filter(Boolean) as string[]);

  const inputs: ScenarioInputStatus[] = [
    {
      label: "Baseline window",
      status: stateStatus(baseline.state),
      detail: String(baseline.rule ?? "Baseline rule needs customer owner review.")
    },
    {
      label: "Comparison window",
      status: stateStatus(comparison.state),
      detail: String(comparison.rule ?? "Comparison rule needs customer owner review.")
    },
    {
      label: "Customer-owned assumptions",
      status: assumptionStatus,
      detail:
        needsAssumptionReview
          ? "Review customer-owned assumptions before stronger value language."
          : "Customer-owned assumptions are ready for governed modeling."
    },
    {
      label: "Outcome evidence",
      status:
        String(evidenceStatus.outcome_evidence_review_state ?? "").toUpperCase() === "ACCEPTED"
          ? "Ready to model"
          : String(evidenceStatus.outcome_evidence_review_state ?? "").toUpperCase() === "SUBMITTED"
            ? "Awaiting review"
            : "Missing input",
      detail: reviewLabel
    }
  ];

  const waitingOnReview =
    String(evidenceStatus.outcome_evidence_review_state ?? "").toUpperCase() === "SUBMITTED";
  const nextAction =
    waitingOnReview || needsAssumptionReview
      ? "Review customer assumptions and submitted outcome evidence before stronger value language."
      : "Move the modeled value language into the Executive Operating Packet with caveats.";

  return {
    available: true,
    statusLabel: "Ready for governed value modeling",
    workflowName: String(workflow.workflow_name ?? workflowHandoff.workflowName),
    valueRouteLabel: VALUE_ROUTE_LABELS[valueRoute] ?? VALUE_ROUTE_LABELS.UNCLASSIFIED,
    evidenceStatus: reviewLabel,
    metricName: String(metric.name ?? "Outcome metric selected"),
    sourceSystem: String(metric.source_system?.source_name ?? "Customer-owned outcome system"),
    sourceGrain: presentableGrain(metric.source_system?.approved_grain ?? "approved aggregate export"),
    inputs,
    scenarioBands,
    safeValueLanguage: unique([...allowedPhrases, ...caveats]),
    blockedOutputs,
    nextAction,
    executiveHandoff:
      "Executive packet can reference governed value modeling only with caveats and blocked-output language attached."
  };
}

function buildCustomerEvidenceRequest(params: {
  roiScenario: Record<string, any> | null;
  workflowHandoff: WorkflowHandoff;
}): CustomerEvidenceRequest {
  const { roiScenario, workflowHandoff } = params;
  if (!roiScenario) {
    const nextAction =
      "Finish Blueprint and outcome mapping before asking the client for an aggregate export.";
    return {
      available: false,
      statusLabel: "Evidence request not ready yet",
      requestedExport: nextAction,
      sourceSystem: "Customer source system not selected",
      metricName: "Outcome signal not selected",
      approvedGrain: "Approved aggregate export not attached",
      baselineWindow: "Baseline window not selected",
      comparisonWindow: "Comparison window not selected",
      owners: [
        {
          label: "Workflow owner",
          owner: workflowHandoff.workflowName,
          detail: "Finish the Blueprint workshop before assigning the data request."
        }
      ],
      reviewStep:
        "Create the request after the workflow, outcome metric, baseline, comparison, and owner are known.",
      remainingBlockedLanguage: [
        "No realized ROI claim",
        "No customer-facing economic figures",
        "No causality claim"
      ],
      nextAction,
      caveat:
        "This request packet is a client data ask, not customer-facing economic output."
    };
  }

  const metric = Array.isArray(roiScenario.metric_models)
    ? roiScenario.metric_models[0] ?? {}
    : {};
  const sourceSystem = String(metric.source_system?.source_name ?? "Customer-owned outcome system");
  const metricName = String(metric.name ?? "selected outcome signal");
  const approvedGrainLabel = presentableGrain(
    metric.source_system?.approved_grain ?? "approved aggregate export"
  );
  const baseline = roiScenario.baseline_comparison?.baseline_window ?? {};
  const comparison = roiScenario.baseline_comparison?.comparison_window ?? {};
  const baselineOwner = humanize(String(baseline.owner ?? "customer data owner"));
  const comparisonOwner = humanize(
    String(comparison.owner ?? baseline.owner ?? "customer data owner")
  );
  const assumptions = Array.isArray(roiScenario.customer_owned_assumptions)
    ? roiScenario.customer_owned_assumptions
    : [];
  const assumptionForReview =
    assumptions.find((assumption: Record<string, any>) =>
      ["MISSING", "CAVEATED", "BLOCKED", "SUPPRESSED"].includes(
        String(assumption.state ?? "").toUpperCase()
      )
    ) ?? assumptions[0] ?? {};
  const assumptionOwner = humanize(
    String(assumptionForReview.owner ?? baseline.owner ?? "customer owner")
  );
  const reviewState = String(
    roiScenario.evidence_status?.outcome_evidence_review_state ?? "MISSING"
  ).toUpperCase();
  const blockedLanguage = unique([
    ...(Array.isArray(roiScenario.safe_value_language?.blocked_claims)
      ? roiScenario.safe_value_language.blocked_claims.map(blockedOutputLabel)
      : []),
    roiScenario.economic_output_policy?.realized_roi_calculation === false && "No realized ROI claim",
    roiScenario.economic_output_policy?.customer_facing_economic_output === false &&
      "No customer-facing economic figures"
  ].filter(Boolean) as string[]);

  const requestedExport =
    `Ask ${baselineOwner} for an aggregate ${metricName} export from ${sourceSystem} ` +
    `at ${approvedGrainLabel} for the approved baseline and comparison windows.`;
  const reviewStep =
    reviewState === "ACCEPTED"
      ? `Use the accepted customer export with ${baselineOwner}; keep caveats and blocked claims attached.`
      : reviewState === "SUBMITTED"
        ? `Review submitted customer export with ${baselineOwner} before stronger value language.`
        : `Ask ${baselineOwner} to submit the aggregate customer export before strengthening value language.`;

  return {
    available: true,
    statusLabel: "Customer export request ready",
    requestedExport,
    sourceSystem,
    metricName,
    approvedGrain: approvedGrainLabel,
    baselineWindow: String(baseline.rule ?? "Baseline window rule needs customer owner review."),
    comparisonWindow: String(
      comparison.rule ?? "Comparison window rule needs customer owner review."
    ),
    owners: [
      {
        label: "Baseline window owner",
        owner: baselineOwner,
        detail: "Provides the approved pre-period aggregate export."
      },
      {
        label: "Comparison window owner",
        owner: comparisonOwner,
        detail: "Provides the approved post-period aggregate export."
      },
      {
        label: "Assumption owner",
        owner: assumptionOwner,
        detail: "Confirms staffing, rollout, process, and metric assumptions."
      }
    ],
    reviewStep,
    remainingBlockedLanguage: blockedLanguage,
    nextAction: requestedExport,
    caveat:
      "This request packet is a client data ask, not customer-facing economic output."
  };
}

const normalizeReviewState = (state: unknown): CustomerEvidenceReviewWorkbench["reviewState"] => {
  const normalized = String(state ?? "MISSING").toUpperCase();
  if (normalized === "ACCEPTED") return "ACCEPTED";
  if (normalized === "SUBMITTED") return "SUBMITTED";
  if (normalized === "REJECTED") return "REJECTED";
  return "MISSING";
};

function buildCustomerEvidenceReviewWorkbench(params: {
  customerEvidenceRequest: CustomerEvidenceRequest;
  evidenceItems: EvidenceReviewItem[];
  roiScenario: Record<string, any> | null;
}): CustomerEvidenceReviewWorkbench {
  const { customerEvidenceRequest, evidenceItems, roiScenario } = params;
  const workflowFamily = String(roiScenario?.workflow?.workflow_family ?? "");
  const matchingEvidence =
    evidenceItems.filter((item) => !workflowFamily || item.workflowFamily === workflowFamily);
  const submittedExport =
    matchingEvidence[matchingEvidence.length - 1] ?? evidenceItems[evidenceItems.length - 1] ?? null;
  const reviewState = normalizeReviewState(
    submittedExport?.reviewState ?? roiScenario?.evidence_status?.outcome_evidence_review_state
  );
  const reviewer =
    customerEvidenceRequest.owners.find((owner) => /baseline/i.test(owner.label))?.owner ??
    customerEvidenceRequest.owners[0]?.owner ??
    "Customer data owner";
  const metricName = customerEvidenceRequest.metricName;
  const sourceSystem = customerEvidenceRequest.sourceSystem;
  const approvedGrain = customerEvidenceRequest.approvedGrain;
  const hasRequest = customerEvidenceRequest.available;

  if (!hasRequest) {
    return {
      available: false,
      statusLabel: "Evidence review not ready yet",
      statusTone: "warn",
      reviewState: "MISSING",
      summary: "Finish the Customer Evidence Request before reviewing exports.",
      reviewer,
      reviewerDetail: "Assign the reviewer after the aggregate export request is ready.",
      matchSummary: "No requested metric, source, export level, or window has been approved yet.",
      nextAction: customerEvidenceRequest.nextAction,
      facts: [
        {
          label: "Review prerequisite",
          value: "Customer Evidence Request",
          detail: "Finish the request before evidence can be accepted or rejected."
        }
      ],
      remainingBlockedLanguage: customerEvidenceRequest.remainingBlockedLanguage,
      reviewableExportId: null,
      canReview: false
    };
  }

  const matchSummary =
    `Review the submitted aggregate export against ${metricName}, ${sourceSystem}, ` +
    `${approvedGrain}, and approved baseline/comparison windows.`;
  const facts: CustomerEvidenceReviewFact[] = [
    {
      label: "Requested metric",
      value: metricName,
      detail: "The export should use the same outcome signal named in the request."
    },
    {
      label: "Requested customer system",
      value: sourceSystem,
      detail: "The export should come from the approved customer-owned source."
    },
    {
      label: "Requested export level",
      value: approvedGrain,
      detail: "The export should stay aggregate and match the approved grain."
    },
    {
      label: "Requested window rule",
      value: "Approved baseline and comparison windows",
      detail: "The export should match the same pre-period and post-period rules."
    }
  ];

  if (reviewState === "ACCEPTED") {
    return {
      available: true,
      statusLabel: "Customer export accepted",
      statusTone: "good",
      reviewState,
      summary:
        "Accepted evidence can support caveated value review; blocked language still travels with the packet.",
      reviewer,
      reviewerDetail: `${reviewer} reviewed the submitted aggregate export.`,
      matchSummary,
      nextAction:
        "Carry accepted evidence into the sponsor readout with caveats and blocked value language attached.",
      facts,
      remainingBlockedLanguage: customerEvidenceRequest.remainingBlockedLanguage,
      reviewableExportId: null,
      canReview: false
    };
  }

  if (reviewState === "REJECTED") {
    return {
      available: true,
      statusLabel: "Customer export rejected",
      statusTone: "warn",
      reviewState,
      summary:
        `Ask ${reviewer} to resubmit the aggregate export matching ${metricName}, ` +
        `${sourceSystem}, ${approvedGrain}, and approved windows.`,
      reviewer,
      reviewerDetail: `${reviewer} needs to correct and resubmit the aggregate export.`,
      matchSummary,
      nextAction:
        "Keep stronger value language blocked until a corrected export is accepted.",
      facts,
      remainingBlockedLanguage: customerEvidenceRequest.remainingBlockedLanguage,
      reviewableExportId: null,
      canReview: false
    };
  }

  if (reviewState === "SUBMITTED" && submittedExport) {
    return {
      available: true,
      statusLabel: "Customer export awaiting review",
      statusTone: "warn",
      reviewState,
      summary:
        "A customer export has arrived and needs human review before it changes value language.",
      reviewer,
      reviewerDetail: `${reviewer} reviews the submitted export before value language changes.`,
      matchSummary,
      nextAction:
        "Accept the export only if the metric, source, export level, baseline window, and comparison window match the request.",
      facts,
      remainingBlockedLanguage: customerEvidenceRequest.remainingBlockedLanguage,
      reviewableExportId: submittedExport.exportId,
      canReview: true
    };
  }

  return {
    available: true,
    statusLabel: "Waiting for customer export",
    statusTone: "neutral",
    reviewState: "MISSING",
    summary:
      `Ask ${reviewer} for the aggregate ${metricName} export from ${sourceSystem} before review can start.`,
    reviewer,
    reviewerDetail: `${reviewer} owns the aggregate export request.`,
    matchSummary,
    nextAction: customerEvidenceRequest.nextAction,
    facts,
    remainingBlockedLanguage: customerEvidenceRequest.remainingBlockedLanguage,
    reviewableExportId: null,
    canReview: false
  };
}

function deriveStages(params: {
  byType: Record<string, AiValueObjectSummary[]>;
  opportunities: ValueOpportunity[];
}): JourneyStage[] {
  const { byType, opportunities } = params;
  const baselines = byType.fluency_baseline ?? [];
  const engagements = byType.engagement ?? [];
  const blueprints = byType.blueprint ?? [];
  const libraries = byType.metrics_library ?? [];
  const readiness = byType.evidence_readiness ?? [];
  const exportsList = byType.outcome_evidence_export ?? [];
  const scenarios = byType.value_scenario ?? [];
  const roiScenarios = byType.roi_scenario ?? [];
  const packets = byType.executive_packet ?? [];

  const latestReadiness = latest(readiness);
  const readinessDecision = latestReadiness
    ? String((latestReadiness.validation as Record<string, unknown>)?.decision ?? "")
    : "";
  const accepted = exportsList.filter((item) => reviewStateOf(item) === "ACCEPTED");
  const submitted = exportsList.filter((item) => reviewStateOf(item) === "SUBMITTED");

  return [
    {
      key: "readiness",
      label: "Human Readiness",
      state: baselines.length > 0 ? "done" : "todo",
      detail:
        baselines.length > 0
          ? "Aggregate kickoff fluency signal is available."
          : "Run the readiness pulse with the client team.",
      objectLabel: "Explore Your AI Fluency baseline",
      captured: compact([
        baselines.length > 0 && "Aggregate capability and confidence signal on file",
        engagements.length > 0 && "Client objective context started"
      ]),
      missing: compact([baselines.length === 0 && "Role-safe readiness and behavior baseline"]),
      feedsNext: "Readiness gaps guide which workflows and role groups the Blueprint workshop should prioritize.",
      nextAction: baselines.length > 0 ? "Use readiness context in Blueprint." : "Capture aggregate readiness baseline."
    },
    {
      key: "blueprint",
      label: "Blueprint",
      state: blueprints.length > 0 ? "done" : engagements.length > 0 ? "attention" : "todo",
      detail:
        blueprints.length > 0
          ? "Client workflow canvas is captured."
          : engagements.length > 0
            ? "Engagement exists. Finish the workflow canvas."
            : "Start with the client discovery conversation.",
      objectLabel: "Collaborative workflow design",
      captured: compact([
        engagements.length > 0 && "Business objective and pilot use case",
        blueprints.length > 0 && "Current and future workflow map"
      ]),
      missing: compact([
        engagements.length === 0 && "Client objective and sponsor question",
        blueprints.length === 0 && "Day-in-the-life workflow canvas"
      ]),
      feedsNext: "The workflow canvas defines what Glean, MCP, agent, and outcome systems must instrument.",
      nextAction:
        blueprints.length > 0 ? "Map instrumentation and outcome signals." : "Open discovery and blueprinting.",
      link: "/ai-value-discovery"
    },
    {
      key: "instrumentation",
      label: "Execution Instrumentation",
      state: blueprints.length > 0 ? "attention" : "todo",
      detail:
        blueprints.length > 0
          ? "Workflow is ready for Glean/MCP/agent instrumentation planning."
          : "Instrumentation depends on a finished Blueprint.",
      objectLabel: "Glean + MCP + agents + workflow telemetry",
      captured: compact([
        blueprints.length > 0 && "Workflow family and pilot process selected",
        libraries.length > 0 && "Outcome systems identified through Metrics Library"
      ]),
      missing: compact([
        blueprints.length === 0 && "Workflow family to instrument",
        "Connector/source coverage confirmation for Glean, MCP, agents, and customer systems"
      ]),
      feedsNext: "Instrumentation determines which aggregate AI work patterns can be trusted as evidence.",
      nextAction: "Confirm available Glean, MCP, agent, and customer-system signals."
    },
    {
      key: "measurement",
      label: "Evidence & Measurement",
      state: readiness.length > 0 || accepted.length > 0 ? "done" : libraries.length > 0 ? "attention" : "todo",
      detail:
        accepted.length > 0
          ? "Customer outcome evidence is attached."
          : submitted.length > 0
            ? `${submitted.length} customer export${submitted.length === 1 ? "" : "s"} awaiting review.`
            : readiness.length > 0
              ? DECISION_LABELS[readinessDecision] ?? "Evidence readiness has been assessed."
              : "Connect FluencyTracr evidence and customer outcome sources.",
      objectLabel: "FluencyTracr aggregate evidence layer",
      captured: compact([
        libraries.length > 0 && "Outcome signal library on file",
        readiness.length > 0 &&
          `Evidence readiness: ${DECISION_LABELS[readinessDecision] ?? "Assessed"}`,
        accepted.length > 0 && "Accepted customer outcome export"
      ]),
      missing: compact([
        libraries.length === 0 && "Metrics Library / outcome signal definitions",
        accepted.length === 0 && "Customer-owned outcome data for validation"
      ]),
      feedsNext: "Evidence readiness tells the platform which value opportunities can be modeled, caveated, or blocked.",
      nextAction: submitted.length > 0 ? "Review submitted customer evidence." : "Map outcome data sources."
    },
    {
      key: "opportunity",
      label: "ROI / Value Opportunity Map",
      state: opportunities.length > 0 ? "done" : libraries.length > 0 ? "attention" : "todo",
      detail:
        opportunities.length > 0
          ? `${opportunities.length} potential ROI/value point${opportunities.length === 1 ? "" : "s"} mapped.`
          : "Outcome signals are needed before ROI opportunities can be mapped.",
      objectLabel: "Outcome signals + value routes",
      captured: compact([
        opportunities.length > 0 && "Potential cost, capacity, quality, risk, experience, or growth routes"
      ]),
      missing: compact([
        opportunities.length === 0 && "Metrics tied to the selected workflow",
        accepted.length === 0 && "Customer data exports to validate modeled value"
      ]),
      feedsNext: "Opportunity rows become governed value scenarios with assumptions, baselines, and claim limits.",
      nextAction: "Prioritize which ROI point to model first."
    },
    {
      key: "scenario",
      label: "Governed Value Scenario",
      state: roiScenarios.length > 0 || scenarios.length > 0
        ? "done"
        : opportunities.length > 0
          ? "attention"
          : "todo",
      detail:
        roiScenarios.length > 0
          ? "Governed value-modeling readiness is available."
          : scenarios.length > 0
            ? "Scenario bands and assumptions are available."
          : opportunities.length > 0
            ? "ROI opportunities are mapped. Build a governed scenario."
            : "Scenario depends on ROI opportunity mapping.",
      objectLabel: "Modeled value, not ROI proof",
      captured: compact([
        scenarios.length > 0 && "Scenario bands and customer-owned assumptions",
        roiScenarios.length > 0 && "Governed ROI scenario readiness"
      ]),
      missing: compact([
        scenarios.length === 0 && roiScenarios.length === 0 &&
          "Customer-owned assumptions and scenario bands",
        accepted.length === 0 && "Outcome evidence before stronger claims"
      ]),
      feedsNext: "Scenario status and safe value language compose the executive readout.",
      nextAction: scenarios.length > 0 ? "Prepare executive validation." : "Draft scenario with caveats."
    },
    {
      key: "readout",
      label: "Executive Readout",
      state: packets.length > 0 ? "done" : "todo",
      detail:
        packets.length > 0
          ? "Sponsor-ready readout is available."
          : "Complete the scenario and evidence review to compose the readout.",
      objectLabel: "Decision packet and operating cadence",
      captured: compact([packets.length > 0 && "Executive packet generated"]),
      missing: compact([packets.length === 0 && "Decision-ready readout and next-action cadence"]),
      feedsNext: "The readout drives renewal, expansion, or the next workflow pilot.",
      nextAction: packets.length > 0 ? "Open executive readout." : "Generate readout after scenario review."
    }
  ];
}

export const useAiValueJourney = (): AiValueJourney => {
  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState<string | null>(null);
  const [stages, setStages] = useState<JourneyStage[]>(deriveStages({ byType: {}, opportunities: [] }));
  const [workflowHandoff, setWorkflowHandoff] = useState<WorkflowHandoff>(() =>
    buildWorkflowHandoff({
      blueprint: null,
      metricsLibrary: null,
      opportunities: []
    })
  );
  const [valueQuestions, setValueQuestions] = useState<ClientValueQuestion[]>([]);
  const [questionMetricBridge, setQuestionMetricBridge] =
    useState<ClientQuestionMetricBridge>(() =>
      buildClientQuestionMetricBridge({
        engagement: null,
        valueQuestions: [],
        opportunities: [],
        customerEvidenceRequest: buildCustomerEvidenceRequest({
          roiScenario: null,
          workflowHandoff: buildWorkflowHandoff({
            blueprint: null,
            metricsLibrary: null,
            opportunities: []
          })
        }),
        customerEvidenceReview: buildCustomerEvidenceReviewWorkbench({
          customerEvidenceRequest: buildCustomerEvidenceRequest({
            roiScenario: null,
            workflowHandoff: buildWorkflowHandoff({
              blueprint: null,
              metricsLibrary: null,
              opportunities: []
            })
          }),
          evidenceItems: [],
          roiScenario: null
        })
      })
    );
  const [evidenceItems, setEvidenceItems] = useState<EvidenceReviewItem[]>([]);
  const [opportunities, setOpportunities] = useState<ValueOpportunity[]>([]);
  const [evidenceScenarioPlan, setEvidenceScenarioPlan] =
    useState<EvidenceScenarioPlan>(() =>
      buildEvidenceScenarioPlan({
        readiness: null,
        scenario: null,
        evidenceItems: [],
        opportunities: []
      })
    );
  const [roiScenarioReadiness, setRoiScenarioReadiness] = useState<RoiScenarioReadiness>(() =>
    buildRoiScenarioReadiness({
      roiScenario: null,
      workflowHandoff: buildWorkflowHandoff({
        blueprint: null,
        metricsLibrary: null,
        opportunities: []
      })
    })
  );
  const [customerEvidenceRequest, setCustomerEvidenceRequest] =
    useState<CustomerEvidenceRequest>(() =>
      buildCustomerEvidenceRequest({
        roiScenario: null,
        workflowHandoff: buildWorkflowHandoff({
          blueprint: null,
          metricsLibrary: null,
          opportunities: []
        })
      })
    );
  const [customerEvidenceReview, setCustomerEvidenceReview] =
    useState<CustomerEvidenceReviewWorkbench>(() =>
      buildCustomerEvidenceReviewWorkbench({
        customerEvidenceRequest: buildCustomerEvidenceRequest({
          roiScenario: null,
          workflowHandoff: buildWorkflowHandoff({
            blueprint: null,
            metricsLibrary: null,
            opportunities: []
          })
        }),
        evidenceItems: [],
        roiScenario: null
      })
    );
  const [executivePlan, setExecutivePlan] = useState<ExecutiveOperatingPlan>(() =>
    buildExecutiveOperatingPlan({
      packetCount: 0,
      evidenceScenarioPlan: buildEvidenceScenarioPlan({
        readiness: null,
        scenario: null,
        evidenceItems: [],
        opportunities: []
      }),
      opportunities: []
    })
  );
  const [executiveReadoutPreview, setExecutiveReadoutPreview] =
    useState<ExecutiveReadoutPreview>(() =>
      buildExecutiveReadoutPreview({
        packetCount: 0,
        customerEvidenceRequest: buildCustomerEvidenceRequest({
          roiScenario: null,
          workflowHandoff: buildWorkflowHandoff({
            blueprint: null,
            metricsLibrary: null,
            opportunities: []
          })
        }),
        customerEvidenceReview: buildCustomerEvidenceReviewWorkbench({
          customerEvidenceRequest: buildCustomerEvidenceRequest({
            roiScenario: null,
            workflowHandoff: buildWorkflowHandoff({
              blueprint: null,
              metricsLibrary: null,
              opportunities: []
            })
          }),
          evidenceItems: [],
          roiScenario: null
        }),
        executivePlan: buildExecutiveOperatingPlan({
          packetCount: 0,
          evidenceScenarioPlan: buildEvidenceScenarioPlan({
            readiness: null,
            scenario: null,
            evidenceItems: [],
            opportunities: []
          }),
          opportunities: []
        })
      })
    );
  const [sponsorDecisionLoop, setSponsorDecisionLoop] = useState<SponsorDecisionLoop>(() => {
    const workflowHandoff = buildWorkflowHandoff({
      blueprint: null,
      metricsLibrary: null,
      opportunities: []
    });
    const customerEvidenceRequest = buildCustomerEvidenceRequest({
      roiScenario: null,
      workflowHandoff
    });
    const customerEvidenceReview = buildCustomerEvidenceReviewWorkbench({
      customerEvidenceRequest,
      evidenceItems: [],
      roiScenario: null
    });
    const executivePlan = buildExecutiveOperatingPlan({
      packetCount: 0,
      evidenceScenarioPlan: buildEvidenceScenarioPlan({
        readiness: null,
        scenario: null,
        evidenceItems: [],
        opportunities: []
      }),
      opportunities: [],
      customerEvidenceRequest,
      customerEvidenceReview
    });
    return buildSponsorDecisionLoop({
      customerEvidenceRequest,
      customerEvidenceReview,
      executivePlan
    });
  });
  const [packetIds, setPacketIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const role = sessionRole();
      const { objects } = await listAiValueObjects(role);
      const byType: Record<string, AiValueObjectSummary[]> = {};
      for (const summary of objects) {
        byType[summary.object_type] = byType[summary.object_type] ?? [];
        byType[summary.object_type].push(summary);
      }

      const items = buildEvidenceItems(byType);
      const [engagement, blueprint, metricsLibrary, readiness, scenario, roiScenario] = await Promise.all([
        maybeFetchPayload(role, latest(byType.engagement)),
        maybeFetchPayload(role, latest(byType.blueprint)),
        maybeFetchPayload(role, latest(byType.metrics_library)),
        maybeFetchPayload(role, latest(byType.evidence_readiness)),
        maybeFetchPayload(role, latest(byType.value_scenario)),
        maybeFetchPayload(role, latest(byType.roi_scenario))
      ]);
      const mappedOpportunities = buildValueOpportunities(metricsLibrary, blueprint, items);
      const handoff = buildWorkflowHandoff({
        blueprint,
        metricsLibrary,
        opportunities: mappedOpportunities
      });
      const roiReadiness = buildRoiScenarioReadiness({
        roiScenario,
        workflowHandoff: handoff
      });
      const evidenceRequest = buildCustomerEvidenceRequest({
        roiScenario,
        workflowHandoff: handoff
      });
      const evidenceReview = buildCustomerEvidenceReviewWorkbench({
        customerEvidenceRequest: evidenceRequest,
        evidenceItems: items,
        roiScenario
      });
      const plan = buildEvidenceScenarioPlan({
        readiness,
        scenario,
        evidenceItems: items,
        opportunities: mappedOpportunities
      });
      const packetIds = (byType.executive_packet ?? []).map((summary) => summary.object_id);
      const executivePlan = buildExecutiveOperatingPlan({
        packetCount: packetIds.length,
        evidenceScenarioPlan: plan,
        opportunities: mappedOpportunities,
        customerEvidenceRequest: evidenceRequest,
        customerEvidenceReview: evidenceReview
      });
      const readoutPreview = buildExecutiveReadoutPreview({
        packetCount: packetIds.length,
        customerEvidenceRequest: evidenceRequest,
        customerEvidenceReview: evidenceReview,
        executivePlan
      });
      const sponsorDecision = buildSponsorDecisionLoop({
        customerEvidenceRequest: evidenceRequest,
        customerEvidenceReview: evidenceReview,
        executivePlan
      });
      const questions = buildClientValueQuestions({
        opportunities: mappedOpportunities,
        evidenceScenarioPlan: plan,
        executivePlan,
        customerEvidenceRequest: evidenceRequest,
        customerEvidenceReview: evidenceReview
      });
      const metricBridge = buildClientQuestionMetricBridge({
        engagement,
        valueQuestions: questions,
        opportunities: mappedOpportunities,
        customerEvidenceRequest: evidenceRequest,
        customerEvidenceReview: evidenceReview
      });

      setStages(deriveStages({ byType, opportunities: mappedOpportunities }));
      setWorkflowHandoff(handoff);
      setValueQuestions(questions);
      setQuestionMetricBridge(metricBridge);
      setEvidenceItems(items);
      setOpportunities(mappedOpportunities);
      setEvidenceScenarioPlan(plan);
      setRoiScenarioReadiness(roiReadiness);
      setCustomerEvidenceRequest(evidenceRequest);
      setCustomerEvidenceReview(evidenceReview);
      setExecutivePlan(executivePlan);
      setExecutiveReadoutPreview(readoutPreview);
      setSponsorDecisionLoop(sponsorDecision);
      setPacketIds(packetIds);

      setClientName(
        typeof engagement?.client?.client_name === "string"
          ? engagement.client.client_name
          : humanize((byType.engagement ?? [])[0]?.validation?.client_id as string | undefined)
      );
    } catch (error) {
      setErrorMessage(
        error instanceof AiValueApiError && error.status === 401
          ? "Sign in with an organization session to see the journey."
          : "Could not reach the evidence engine."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const review = useCallback(
    async (exportId: string, decision: "ACCEPTED" | "REJECTED") => {
      setErrorMessage(null);
      try {
        await reviewOutcomeEvidence(sessionRole(), exportId, decision);
        await refresh();
      } catch (error) {
        setErrorMessage(
          error instanceof AiValueApiError && error.status === 403
            ? "Your current role can view evidence but cannot review it."
            : "The review could not be applied."
        );
      }
    },
    [refresh]
  );

  const openReadout = useCallback(async (packetId: string) => {
    setErrorMessage(null);
    try {
      const html = await fetchReadoutHtml(sessionRole(), packetId);
      const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
      window.open(url, "_blank", "noopener");
    } catch {
      setErrorMessage("The readout could not be opened.");
    }
  }, []);

  return {
    loading,
    clientName,
    stages,
    workflowHandoff,
    valueQuestions,
    questionMetricBridge,
    evidenceItems,
    opportunities,
    evidenceScenarioPlan,
    roiScenarioReadiness,
    customerEvidenceRequest,
    customerEvidenceReview,
    executivePlan,
    executiveReadoutPreview,
    sponsorDecisionLoop,
    packetIds,
    errorMessage,
    refresh,
    review,
    openReadout
  };
};
