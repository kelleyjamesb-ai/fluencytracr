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

export interface EvidenceScenarioPlan {
  decisionLabel: string;
  canTrust: string[];
  needsClientEvidence: string[];
  scenarioBands: ScenarioBandPlan[];
  scenarioSummary: string;
  safeValueLanguage: string;
  nextClientAction: string;
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

export interface ClientValueQuestion {
  question: string;
  answer: string;
  detail: string;
}

export interface AiValueJourney {
  loading: boolean;
  clientName: string | null;
  stages: JourneyStage[];
  valueQuestions: ClientValueQuestion[];
  evidenceItems: EvidenceReviewItem[];
  opportunities: ValueOpportunity[];
  evidenceScenarioPlan: EvidenceScenarioPlan;
  executivePlan: ExecutiveOperatingPlan;
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

const sourceName = (metric: Record<string, any>): string =>
  String(metric?.source_system?.source_name ?? "Customer-owned outcome system");

const approvedGrain = (metric: Record<string, any>): string =>
  String(metric?.source_system?.approved_grain ?? "approved aggregate window");

const coverageState = (payload: Record<string, any> | null, lane: string): string =>
  String(payload?.source_coverage?.[lane] ?? "MISSING").toUpperCase();

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

  const claimState = String(scenario?.output?.claim_state ?? "BLOCKED");
  const nextAction = Array.isArray(readiness?.next_actions) && readiness.next_actions.length > 0
    ? String(readiness.next_actions[0])
    : submittedEvidence
      ? "Review submitted customer evidence with the data owner."
      : "Collect baseline, comparison, assumptions, and source coverage before strengthening value language.";

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
    scenarioBands,
    scenarioSummary: String(
      scenario?.output?.scenario_summary ??
        "Scenario draft will appear after the value opportunity is modeled."
    ),
    safeValueLanguage:
      CLAIM_STATE_LABELS[claimState] ?? CLAIM_STATE_LABELS.BLOCKED,
    nextClientAction: nextAction
  };
}

function buildExecutiveOperatingPlan(params: {
  packetCount: number;
  evidenceScenarioPlan: EvidenceScenarioPlan;
  opportunities: ValueOpportunity[];
}): ExecutiveOperatingPlan {
  const { packetCount, evidenceScenarioPlan, opportunities } = params;
  return {
    packetStatus: packetCount > 0 ? "Sponsor packet ready" : "Needs sponsor packet",
    sponsorDecision:
      packetCount > 0
        ? "Decide whether to expand the workflow pilot, collect stronger customer evidence, or hold external value language."
        : "Decide what evidence is still needed before the sponsor packet is generated.",
    recommendedNextAction:
      opportunities.length > 0
        ? evidenceScenarioPlan.nextClientAction
        : "Finish Blueprint and outcome mapping before assigning follow-up work.",
    handoffs: [
      {
        role: "Value-readout agent",
        task:
          "Prepare the sponsor narrative from Blueprint, outcome mapping, evidence readiness, scenario bands, and safe value language.",
        guardrail: "No realized ROI claim."
      },
      {
        role: "Evidence readiness agent",
        task:
          "Track baseline exports, customer owner review, source coverage, and unresolved assumptions.",
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

function buildClientValueQuestions(params: {
  opportunities: ValueOpportunity[];
  evidenceScenarioPlan: EvidenceScenarioPlan;
  executivePlan: ExecutiveOperatingPlan;
}): ClientValueQuestion[] {
  const { opportunities, evidenceScenarioPlan, executivePlan } = params;
  const primaryOpportunity = opportunities[0] ?? null;
  const workflow = primaryOpportunity?.workflowName ?? "Select the first workflow in Blueprint.";
  const roiOpportunity = primaryOpportunity
    ? `${primaryOpportunity.valueRouteLabel}: ${primaryOpportunity.roiPoint}`
    : "Map the Blueprint to an outcome metric before modeling an ROI opportunity.";
  const gleanEvidence = primaryOpportunity
    ? `${primaryOpportunity.gleanEvidence} Use this as aggregate AI-enabled work evidence, not outcome proof.`
    : "Once instrumentation is mapped, FluencyTracr can show aggregate AI-enabled work patterns around the selected workflow.";
  const missingProof =
    evidenceScenarioPlan.needsClientEvidence[0] ??
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
      state: scenarios.length > 0 ? "done" : opportunities.length > 0 ? "attention" : "todo",
      detail:
        scenarios.length > 0
          ? "Scenario bands and assumptions are available."
          : opportunities.length > 0
            ? "ROI opportunities are mapped. Build a governed scenario."
            : "Scenario depends on ROI opportunity mapping.",
      objectLabel: "Modeled value, not ROI proof",
      captured: compact([scenarios.length > 0 && "Scenario bands and customer-owned assumptions"]),
      missing: compact([
        scenarios.length === 0 && "Customer-owned assumptions and scenario bands",
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
  const [valueQuestions, setValueQuestions] = useState<ClientValueQuestion[]>([]);
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
      const [engagement, blueprint, metricsLibrary, readiness, scenario] = await Promise.all([
        maybeFetchPayload(role, latest(byType.engagement)),
        maybeFetchPayload(role, latest(byType.blueprint)),
        maybeFetchPayload(role, latest(byType.metrics_library)),
        maybeFetchPayload(role, latest(byType.evidence_readiness)),
        maybeFetchPayload(role, latest(byType.value_scenario))
      ]);
      const mappedOpportunities = buildValueOpportunities(metricsLibrary, blueprint, items);
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
        opportunities: mappedOpportunities
      });
      const questions = buildClientValueQuestions({
        opportunities: mappedOpportunities,
        evidenceScenarioPlan: plan,
        executivePlan
      });

      setStages(deriveStages({ byType, opportunities: mappedOpportunities }));
      setValueQuestions(questions);
      setEvidenceItems(items);
      setOpportunities(mappedOpportunities);
      setEvidenceScenarioPlan(plan);
      setExecutivePlan(executivePlan);
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
    valueQuestions,
    evidenceItems,
    opportunities,
    evidenceScenarioPlan,
    executivePlan,
    packetIds,
    errorMessage,
    refresh,
    review,
    openReadout
  };
};
