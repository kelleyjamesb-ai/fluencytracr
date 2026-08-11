import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties
} from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { aiValueWorkspace } from "../constants/aiValueWorkspace";
import {
  getAuthSessionSnapshot,
  getFrontendSessionContext,
  subscribeToAuthSession
} from "../auth";
import { useAiValueWorkspace } from "../hooks/useAiValueWorkspace";
import { useAiValueJourney } from "../hooks/useAiValueJourney";
import {
  buildFunctionMetricPlans,
  ClientQuestionMetricBridgePanel,
  type FunctionMetricPlan
} from "../components/ClientQuestionMetricBridgePanel";
import { AiContributionReportingSpinePanel } from "../components/AiContributionReportingSpinePanel";
import { SponsorDecisionLoopPanel } from "../components/SponsorDecisionLoopPanel";
import { ValueEvidenceCasePanel } from "../components/ValueEvidenceCasePanel";
import { applyReviewerMetricSelectionDraftIntake } from "../lib/aiValueContributionReportingSpine";
import {
  fetchCustomerDataModelProjections,
  type CustomerDataModelProjection,
  type CustomerDataModelProjectionResponse
} from "../lib/aiValueApi";
import type { SelectedOutcomeMetricSelection } from "../lib/aiValueMetricSelection";
import type { RequestBoundLiveReport } from "../lib/aiValueLiveReport";
import type { AiFluencyImportFixture } from "../lib/aiFluencyImportFixture";
import { checksumAiFluencyPayload } from "../lib/aiFluencyImportIntegrity";
import { parseDocumentText } from "../lib/policyDocumentParser";
import { deriveAggregateHypothesisFromBlueprint } from "../lib/blueprintHypothesisParser";
import {
  CORE_BEHAVIORAL_MIN_COHORT,
  CUSTOMER_VISIBLE_SERIES_MIN_COHORT,
  gleanMetricsLibrarySeedCoverage,
  matchHypothesisToGleanWorkflows
} from "../lib/gleanMetricsLibraryAdapter";

const workspacePages = [
  {
    slug: "home",
    label: "Home",
    navLabel: "Home",
    path: "/ai-value-workspace",
    detail: "Start or resume one customer value thread.",
    feedsNext: "Define the customer hypothesis."
  },
  {
    slug: "value-case",
    label: "Value Case",
    navLabel: "Value Case",
    path: "/ai-value-workspace/value-case",
    detail: "State what the customer expects to change.",
    feedsNext: "Attach the hypothesis to one workflow."
  },
  {
    slug: "workflow",
    label: "Workflow",
    navLabel: "Workflow",
    path: "/ai-value-workspace/workflow",
    detail: "Confirm the recurring work pattern that the hypothesis applies to.",
    feedsNext: "Choose the customer-owned metric for that workflow."
  },
  {
    slug: "metrics",
    label: "Metric",
    navLabel: "Metric",
    path: "/ai-value-workspace/metrics",
    detail: "Choose the customer-owned outcome that will test the hypothesis.",
    feedsNext: "Add readiness context from AI Fluency."
  },
  {
    slug: "readiness",
    label: "AI Fluency Measurement",
    navLabel: "AI Fluency",
    path: "/ai-value-workspace/readiness",
    detail: "Import completed aggregate results from the external AI Fluency experience.",
    feedsNext: "Connect approved evidence sources after the measurement is imported."
  },
  {
    slug: "sources",
    label: "Evidence Sources",
    navLabel: "Evidence",
    path: "/ai-value-workspace/sources",
    detail: "Connect approved aggregate sources for the workflow and metric.",
    feedsNext: "Review change over time."
  },
  {
    slug: "progress",
    label: "Progress Over Time",
    navLabel: "Progress",
    path: "/ai-value-workspace/progress",
    detail: "Review VBD, metric, and evidence movement across approved windows.",
    feedsNext: "Carry the reviewed movement into the decision."
  },
  {
    slug: "decisions",
    label: "Decision",
    navLabel: "Decision",
    path: "/ai-value-workspace/decisions",
    detail: "Choose the next intervention, review, or hold.",
    feedsNext: "Intervene, remeasure, and update the evidence timeline."
  },
  {
    slug: "case",
    label: "Evidence Checkpoint",
    navLabel: "Checkpoint",
    path: "/ai-value-workspace/case",
    detail: "A governed milestone review of hypothesis, evidence, metric, and blocked claims.",
    feedsNext: "Carry checkpoint status into the decision."
  }
] as const;

type WorkspacePageSlug = (typeof workspacePages)[number]["slug"];
type WorkspacePage = (typeof workspacePages)[number];

const workspacePageBySlug = new Map(workspacePages.map((page) => [page.slug, page]));
const guidedWorkspacePages = workspacePages.filter((page) => page.slug !== "case");

type ValueSetupDraft = {
  hypothesis: string;
  workflowId: string;
  metricIds: string[];
  source: "manual" | "blueprint";
};

const emptyValueSetupDraft: ValueSetupDraft = {
  hypothesis: "",
  workflowId: "",
  metricIds: [],
  source: "manual"
};

const VALUE_SETUP_DRAFT_KEY = "aiValue.guidedSetupDraft.v1";
const currentOrganizationId = () => getFrontendSessionContext().orgId.trim();
const organizationScopedSessionKey = (
  prefix: string,
  organizationId = currentOrganizationId()
) => organizationId ? `${prefix}:${organizationId}` : null;
const valueSetupStorageKey = (organizationId = currentOrganizationId()) =>
  organizationScopedSessionKey(VALUE_SETUP_DRAFT_KEY, organizationId);

const canonicalizeSetupHypothesis = (hypothesis: string) => {
  const result = matchHypothesisToGleanWorkflows(hypothesis);
  if (result.candidates.length === 0) return "";
  return `${result.elements.function}: ${result.elements.expectedChange} ${result.elements.businessObject}; metric intent: ${result.elements.metricIntent}.`;
};

const readValueSetupDraft = (
  organizationId = currentOrganizationId()
): ValueSetupDraft => {
  try {
    const storageKey = valueSetupStorageKey(organizationId);
    if (!storageKey) return emptyValueSetupDraft;
    const parsed = JSON.parse(sessionStorage.getItem(storageKey) ?? "null") as Partial<ValueSetupDraft> | null;
    if (!parsed || typeof parsed.hypothesis !== "string" || parsed.hypothesis.length > 1000) {
      return emptyValueSetupDraft;
    }
    const canonicalHypothesis = canonicalizeSetupHypothesis(parsed.hypothesis);
    if (!canonicalHypothesis) return emptyValueSetupDraft;
    return {
      hypothesis: canonicalHypothesis,
      workflowId: typeof parsed.workflowId === "string" ? parsed.workflowId : "",
      metricIds: Array.isArray(parsed.metricIds)
        ? parsed.metricIds.filter((id): id is string => typeof id === "string").slice(0, 10)
        : [],
      source: parsed.source === "blueprint" ? "blueprint" : "manual"
    };
  } catch {
    return emptyValueSetupDraft;
  }
};

const vbdQuadrants = [
  {
    id: "deep-slow",
    label: "Deep but slow",
    tone: "amber",
    position: "low-velocity high-integration",
    mapCue: "Good use case, slow spread",
    definition: "AI is used seriously where it appears, but spread is slow.",
    watchFor: [
      "Rework loops",
      "Heavy iteration",
      "Long latency",
      "Workflow drag"
    ]
  },
  {
    id: "flow",
    label: "High-fluency flow",
    tone: "green",
    position: "high-velocity high-integration",
    mapCue: "AI is embedded enough to scale",
    definition: "AI is embedded into work and helps the work resolve.",
    watchFor: [
      "Repeat use",
      "Verification",
      "Workflow-connected use",
      "Review-ready patterns"
    ]
  },
  {
    id: "low-integration",
    label: "Low integration",
    tone: "red",
    position: "low-velocity low-integration",
    mapCue: "Find the work fit before scaling",
    definition: "AI is not yet part of durable work patterns.",
    watchFor: [
      "Abandonment",
      "Human-only fallback",
      "Low recurrence",
      "Poor task fit"
    ]
  },
  {
    id: "fast-shallow",
    label: "Fast but shallow",
    tone: "blue",
    position: "high-velocity low-integration",
    mapCue: "Adoption is ahead of workflow change",
    definition: "AI is moving quickly, but workflow change is still light.",
    watchFor: [
      "Immediate accept",
      "Low verification",
      "Thin workflow presence",
      "Possible blind trust"
    ]
  }
] as const;

const aiFluencyFrameworkQuadrants = [
  {
    id: "deep-slow",
    label: "Deep but slow",
    tone: "amber",
    badge: "DS",
    definition: "AI is used seriously, but creates drag.",
    watchFor: ["Rework loops", "Heavy iteration", "Long latency", "Workflow mismatch"]
  },
  {
    id: "flow",
    label: "High-fluency flow",
    tone: "green",
    badge: "HF",
    definition: "AI is embedded into work and helps work resolve.",
    watchFor: ["Repeat use", "Verification", "Workflow-connected use", "Review-ready patterns"]
  },
  {
    id: "low-integration",
    label: "Low integration",
    tone: "red",
    badge: "LI",
    definition: "AI is not yet part of real work patterns.",
    watchFor: ["Abandonment", "Human-only fallback", "Low recurrence", "Poor task fit"]
  },
  {
    id: "fast-shallow",
    label: "Fast but shallow",
    tone: "blue",
    badge: "FS",
    definition: "AI is helping with quick tasks, but may be shallow.",
    watchFor: ["Immediate accept", "Low verification", "Thin workflow presence", "Possible blind trust"]
  }
] as const;

const formatVbdQuadrantPosition = (position: string) =>
  position
    .split(" ")
    .map((part) => part.replace("-", " "))
    .join(" / ");

type VbdQuadrantId = (typeof vbdQuadrants)[number]["id"];

type AiFluencyOrgFunctionCluster = {
  functionArea: string;
  shortLabel: string;
  velocity: number;
  breadth: number;
  depth: number;
};

const vbdMeasuredSurfaces = [
  "Search",
  "Assistant",
  "Skills",
  "Agents",
  "Artifacts",
  "workflow automations"
] as const;

const aiFluencyOrgFunctionClusters = [
  {
    functionArea: "Engineering / Software Development",
    shortLabel: "Eng",
    velocity: 88,
    breadth: 86,
    depth: 88
  },
  {
    functionArea: "Product Management",
    shortLabel: "PM",
    velocity: 78,
    breadth: 78,
    depth: 84
  },
  {
    functionArea: "Data & Analytics",
    shortLabel: "Data",
    velocity: 86,
    breadth: 80,
    depth: 76
  },
  {
    functionArea: "IT Systems or Security",
    shortLabel: "IT",
    velocity: 82,
    breadth: 82,
    depth: 68
  },
  {
    functionArea: "Sales or Business Development",
    shortLabel: "Sales",
    velocity: 72,
    breadth: 76,
    depth: 74
  },
  {
    functionArea: "Marketing & Communications",
    shortLabel: "Mktg",
    velocity: 84,
    breadth: 72,
    depth: 46
  },
  {
    functionArea: "Design / UX / Research",
    shortLabel: "UX",
    velocity: 74,
    breadth: 64,
    depth: 42
  },
  {
    functionArea: "Corporate Strategy or Business Operations",
    shortLabel: "Biz",
    velocity: 64,
    breadth: 58,
    depth: 44
  },
  {
    functionArea: "Customer or Account Success",
    shortLabel: "CS",
    velocity: 42,
    breadth: 55,
    depth: 66
  },
  {
    functionArea: "Support or Help Desk",
    shortLabel: "Sup",
    velocity: 42,
    breadth: 48,
    depth: 48
  },
  {
    functionArea: "People Talent or Human Resources",
    shortLabel: "HR",
    velocity: 34,
    breadth: 42,
    depth: 46
  },
  {
    functionArea: "Finance or Accounting",
    shortLabel: "Fin",
    velocity: 26,
    breadth: 38,
    depth: 44
  },
  {
    functionArea: "Legal & Compliance",
    shortLabel: "Leg",
    velocity: 18,
    breadth: 30,
    depth: 34
  },
  {
    functionArea: "Field Operations or Logistics",
    shortLabel: "Ops",
    velocity: 28,
    breadth: 34,
    depth: 24
  },
  {
    functionArea: "Administrative or Executive Support",
    shortLabel: "Adm",
    velocity: 14,
    breadth: 26,
    depth: 22
  },
  {
    functionArea: "Education or Training",
    shortLabel: "L&D",
    velocity: 42,
    breadth: 46,
    depth: 36
  },
  {
    functionArea: "Other",
    shortLabel: "Oth",
    velocity: 24,
    breadth: 32,
    depth: 31
  }
] satisfies AiFluencyOrgFunctionCluster[];

type VbdTokenWindowKey = "1m" | "3m" | "6m" | "12m";
type VbdTokenWindowValueKey = "oneMonth" | "threeMonths" | "sixMonths" | "twelveMonths";
type VbdTokenOverlayMode = "vbd" | "vbd-token";

type VbdTokenFunctionProfile = {
  functionArea: string;
  oneMonth: number;
  threeMonths: number;
  sixMonths: number;
  twelveMonths: number;
  posture: string;
};

const vbdTokenWindowOptions = [
  {
    key: "1m",
    label: "1 month",
    valueKey: "oneMonth",
    interpretationLabel: "1 month (held for context)"
  },
  {
    key: "3m",
    label: "3 months",
    valueKey: "threeMonths",
    interpretationLabel: "3 months"
  },
  {
    key: "6m",
    label: "6 months",
    valueKey: "sixMonths",
    interpretationLabel: "6 months"
  },
  {
    key: "12m",
    label: "12 months",
    valueKey: "twelveMonths",
    interpretationLabel: "12 months"
  }
] satisfies {
  key: VbdTokenWindowKey;
  label: string;
  valueKey: VbdTokenWindowValueKey;
  interpretationLabel: string;
}[];

const vbdTokenFunctionProfiles = [
  {
    functionArea: "Engineering / Software Development",
    oneMonth: 78,
    threeMonths: 75,
    sixMonths: 71,
    twelveMonths: 68,
    posture: "High work integration, steady token intensity"
  },
  {
    functionArea: "Product Management",
    oneMonth: 72,
    threeMonths: 74,
    sixMonths: 76,
    twelveMonths: 79,
    posture: "Broad planning work, watch synthesis depth"
  },
  {
    functionArea: "Data & Analytics",
    oneMonth: 69,
    threeMonths: 73,
    sixMonths: 74,
    twelveMonths: 77,
    posture: "Analytical workflows expanding across surfaces"
  },
  {
    functionArea: "IT Systems or Security",
    oneMonth: 64,
    threeMonths: 66,
    sixMonths: 68,
    twelveMonths: 70,
    posture: "Governed operational use, moderate intensity"
  },
  {
    functionArea: "Sales or Business Development",
    oneMonth: 74,
    threeMonths: 76,
    sixMonths: 78,
    twelveMonths: 81,
    posture: "Fast adoption, confirm workflow integration"
  },
  {
    functionArea: "Marketing & Communications",
    oneMonth: 92,
    threeMonths: 88,
    sixMonths: 82,
    twelveMonths: 74,
    posture: "High activity, check verification and reuse"
  },
  {
    functionArea: "Design / UX / Research",
    oneMonth: 86,
    threeMonths: 84,
    sixMonths: 80,
    twelveMonths: 76,
    posture: "Fast experimentation, deepen workflow presence"
  },
  {
    functionArea: "Corporate Strategy or Business Operations",
    oneMonth: 83,
    threeMonths: 81,
    sixMonths: 78,
    twelveMonths: 75,
    posture: "Broad exploration, route to durable workflows"
  },
  {
    functionArea: "Customer or Account Success",
    oneMonth: 80,
    threeMonths: 86,
    sixMonths: 92,
    twelveMonths: 96,
    posture: "Deep workflow integration, scale carefully"
  },
  {
    functionArea: "Support or Help Desk",
    oneMonth: 58,
    threeMonths: 61,
    sixMonths: 65,
    twelveMonths: 69,
    posture: "Emerging use, improve recovery loops"
  },
  {
    functionArea: "People Talent or Human Resources",
    oneMonth: 44,
    threeMonths: 48,
    sixMonths: 52,
    twelveMonths: 56,
    posture: "Held for aggregate workflow fit"
  },
  {
    functionArea: "Finance or Accounting",
    oneMonth: 42,
    threeMonths: 46,
    sixMonths: 51,
    twelveMonths: 55,
    posture: "Governed review before broader use"
  },
  {
    functionArea: "Legal & Compliance",
    oneMonth: 34,
    threeMonths: 38,
    sixMonths: 42,
    twelveMonths: 45,
    posture: "High control context, keep evidence narrow"
  },
  {
    functionArea: "Field Operations or Logistics",
    oneMonth: 37,
    threeMonths: 40,
    sixMonths: 43,
    twelveMonths: 47,
    posture: "Find repeated workflow fit first"
  },
  {
    functionArea: "Administrative or Executive Support",
    oneMonth: 32,
    threeMonths: 35,
    sixMonths: 39,
    twelveMonths: 44,
    posture: "Low integration, hold for clearer patterns"
  },
  {
    functionArea: "Education or Training",
    oneMonth: 49,
    threeMonths: 54,
    sixMonths: 60,
    twelveMonths: 66,
    posture: "Capability workflows are building"
  },
  {
    functionArea: "Other",
    oneMonth: 28,
    threeMonths: 32,
    sixMonths: 36,
    twelveMonths: 40,
    posture: "Keep grouped until patterns clarify"
  }
] satisfies VbdTokenFunctionProfile[];

const vbdTokenProfileByFunction = new Map(
  vbdTokenFunctionProfiles.map((profile) => [profile.functionArea, profile])
);

const tokenIntensityBand = (tokenIntensity: number) => {
  if (tokenIntensity >= 85) return "Very high";
  if (tokenIntensity >= 70) return "High";
  if (tokenIntensity >= 50) return "Moderate";
  return "Lower";
};

const tokenIntensityTone = (tokenIntensity: number) => {
  if (tokenIntensity >= 85) return "very-high";
  if (tokenIntensity >= 70) return "high";
  if (tokenIntensity >= 50) return "moderate";
  return "lower";
};

const selectedTokenWindowOption = (windowKey: VbdTokenWindowKey) =>
  vbdTokenWindowOptions.find((option) => option.key === windowKey) ?? vbdTokenWindowOptions[0];

const tokenIntensityForFunction = (
  functionArea: string,
  windowKey: VbdTokenWindowKey
) => {
  const profile = vbdTokenProfileByFunction.get(functionArea);
  const option = selectedTokenWindowOption(windowKey);
  return profile?.[option.valueKey] ?? 0;
};

const VBD_THRESHOLD = 60;

type VbdScoredFunction = AiFluencyOrgFunctionCluster & {
  overallVbdScore: number;
  integrationScore: number;
  quadrantId: VbdQuadrantId;
  tokenIntensity: number;
  tokenBand: string;
  tokenTone: string;
  tokenPosture: string;
};

const clampVbdCoordinate = (value: number) => Math.max(8, Math.min(92, Math.round(value)));

const vbdWindowFactorByKey: Record<VbdTokenWindowKey, number> = {
  "1m": 0,
  "3m": 0.35,
  "6m": 0.7,
  "12m": 1
};

const vbdWindowLiftByFunction = new Map<string, number>(
  [
    ["Engineering / Software Development", 8],
    ["Product Management", 10],
    ["Data & Analytics", 10],
    ["IT Systems or Security", 9],
    ["Sales or Business Development", 12],
    ["Marketing & Communications", 8],
    ["Design / UX / Research", 9],
    ["Corporate Strategy or Business Operations", 10],
    ["Customer or Account Success", 22],
    ["Support or Help Desk", 13],
    ["People Talent or Human Resources", 11],
    ["Finance or Accounting", 10],
    ["Legal & Compliance", 7],
    ["Field Operations or Logistics", 10],
    ["Administrative or Executive Support", 8],
    ["Education or Training", 14],
    ["Other", 6]
  ]
);

const vbdWindowAdjustedInputs = (
  plot: AiFluencyOrgFunctionCluster,
  windowKey: VbdTokenWindowKey
) => {
  const factor = vbdWindowFactorByKey[windowKey];
  const lift = vbdWindowLiftByFunction.get(plot.functionArea) ?? 8;

  return {
    velocity: clampVbdCoordinate(plot.velocity + lift * factor),
    breadth: clampVbdCoordinate(plot.breadth + Math.round(lift * 0.55 * factor)),
    depth: clampVbdCoordinate(plot.depth + Math.round(lift * 0.45 * factor))
  };
};

const vbdQuadrantForScores = (velocity: number, integrationScore: number): VbdQuadrantId => {
  if (velocity >= VBD_THRESHOLD && integrationScore >= VBD_THRESHOLD) return "flow";
  if (velocity >= VBD_THRESHOLD && integrationScore < VBD_THRESHOLD) return "fast-shallow";
  if (velocity < VBD_THRESHOLD && integrationScore >= VBD_THRESHOLD) return "deep-slow";
  return "low-integration";
};

const vbdScoresForInputs = ({ velocity, breadth, depth }: Pick<AiFluencyOrgFunctionCluster, "velocity" | "breadth" | "depth">) => {
  const integrationScore = Math.round(0.4 * breadth + 0.6 * depth);
  const overallVbdScore = Math.round(0.3 * velocity + 0.3 * breadth + 0.4 * depth);
  return {
    integrationScore,
    overallVbdScore,
    quadrantId: vbdQuadrantForScores(velocity, integrationScore)
  };
};

const buildVbdFunctionRows = (windowKey: VbdTokenWindowKey): VbdScoredFunction[] =>
  aiFluencyOrgFunctionClusters.map((plot) => {
    const windowInputs = vbdWindowAdjustedInputs(plot, windowKey);
    const scores = vbdScoresForInputs(windowInputs);
    const tokenIntensity = tokenIntensityForFunction(plot.functionArea, windowKey);
    return {
      ...plot,
      ...windowInputs,
      ...scores,
      tokenIntensity,
      tokenBand: tokenIntensityBand(tokenIntensity),
      tokenTone: tokenIntensityTone(tokenIntensity),
      tokenPosture: vbdTokenProfileByFunction.get(plot.functionArea)?.posture ?? "Held for aggregate review"
    };
  });

const vbdBubbleSize = ({ overallVbdScore }: Pick<VbdScoredFunction, "overallVbdScore">) =>
  Math.round(30 + (overallVbdScore / 100) * 30);

const buildQuadrantRows = (functionRows: VbdScoredFunction[]) =>
  vbdQuadrants
    .map((quadrant) => {
      const functions = functionRows.filter((plot) => plot.quadrantId === quadrant.id);
      const quadrantStrength = functions.length
        ? Math.round(functions.reduce((sum, plot) => sum + plot.overallVbdScore, 0) / functions.length)
        : 0;
      const quadrantShare = functionRows.length
        ? Math.round((functions.length / functionRows.length) * 100)
        : 0;
      const aggregateTokenIntensity = functions.length
        ? Math.round(functions.reduce((sum, plot) => sum + plot.tokenIntensity, 0) / functions.length)
        : 0;
      return {
        ...quadrant,
        functions,
        quadrantStrength,
        quadrantShare,
        aggregateTokenIntensity,
        tokenBand: tokenIntensityBand(aggregateTokenIntensity),
        tokenTone: tokenIntensityTone(aggregateTokenIntensity),
        reviewFunction: functions[0]?.functionArea ?? "No function surfaced"
      };
    });

const vbdBubbleStyle = (
  plot: VbdScoredFunction
): CSSProperties => {
  return ({
    left: `${plot.velocity}%`,
    top: `${100 - plot.integrationScore}%`,
    "--vbd-bubble-size": `${vbdBubbleSize(plot)}px`,
    "--vbd-token-ring": `${Math.round(4 + plot.tokenIntensity / 8)}px`,
    "--vbd-token-opacity": `${Math.min(0.46, 0.14 + plot.tokenIntensity / 240)}`
  }) as CSSProperties;
};

const postureBandForCoordinate = (value: number) => {
  if (value >= 75) return "high";
  if (value >= VBD_THRESHOLD) return "moderate";
  return "held";
};

const vbdTokenPilotRun = {
  workflow_name: "Customer Success account health review",
  pilot_scope: {
    population_label: "Synthetic Customer Success 50"
  },
  pilot_decision: "ready_for_strategy_review",
  allowed_uses: [
    "aggregate_strategy_planning",
    "workflow_design_review",
    "model_routing_review",
    "cost_exposure_review"
  ],
  blocked_uses: [
    "realized_roi",
    "causality_claim",
    "productivity_claim",
    "individual_attribution"
  ],
  recommended_next_motion: {
    motion: "replicate_governed_pattern",
    rationale:
      "The approved aggregate workflow pattern shows stronger work integration without high token intensity; replicate only inside the approved pilot scope."
  },
  movement_summary: {
    total_tokens_change_pct: -0.38,
    average_tokens_per_workflow_change_pct: -0.78,
    high_intensity_workflow_share_change: -0.52
  },
  window_sequence: [
    {
      window_label: "Baseline",
      covered_window: {
        window_start: "2026-02-01",
        window_end: "2026-03-31"
      },
      vbd_posture: "shallow_work_integration",
      token_posture: "high_intensity",
      strategy_zone: "mitigate_friction"
    },
    {
      window_label: "Comparison",
      covered_window: {
        window_start: "2026-04-01",
        window_end: "2026-05-31"
      },
      vbd_posture: "high_work_integration",
      token_posture: "efficient",
      strategy_zone: "replicate_pattern"
    }
  ]
} as const;
const vbdTokenPilotWindows = Array.isArray(vbdTokenPilotRun.window_sequence)
  ? vbdTokenPilotRun.window_sequence
  : [];
const vbdTokenPilotBaseline = vbdTokenPilotWindows[0] ?? {};
const vbdTokenPilotComparison = vbdTokenPilotWindows[vbdTokenPilotWindows.length - 1] ?? {};

const strategyZoneLabels: Record<string, string> = {
  replicate_pattern: "Replicate pattern",
  optimize_cost: "Optimize cost",
  activate_workflow: "Activate workflow",
  mitigate_friction: "Mitigate friction",
  hold_for_evidence: "Hold for evidence"
};

const pilotMotionLabels: Record<string, string> = {
  replicate_governed_pattern: "Replicate governed pattern",
  optimize_cost: "Optimize cost",
  activate_workflow: "Activate workflow",
  mitigate_friction: "Mitigate friction",
  hold_for_evidence: "Hold for evidence"
};

const pilotDecisionLabels: Record<string, string> = {
  ready_for_strategy_review: "Ready for strategy review",
  hold_for_more_windows: "Hold for more windows",
  hold_for_evidence: "Hold for evidence"
};

const vbdPostureLabels: Record<string, string> = {
  high_work_integration: "High work integration",
  emerging_work_integration: "Emerging work integration",
  shallow_work_integration: "Shallow work integration",
  held_or_suppressed: "Held or suppressed"
};

const tokenPostureLabels: Record<string, string> = {
  efficient: "Efficient token posture",
  moderate: "Moderate token intensity",
  high_intensity: "High token intensity",
  held_or_suppressed: "Held or suppressed"
};

const roiBotModelingContext = {
  title: "ROI Bot companion lane",
  statusLabel: "Modeling context only",
  source: "ROI Bot",
  pullDiscipline: "Source tags and pull dates required",
  role:
    "Adds approved aggregate usage extracts, token/FlexCredit context, and customer-owned scenario inputs for governed scenario review.",
  doesNotChange: [
    "FluencyTracr governance",
    "AI Fluency dashboard interpretation",
    "VBD posture or quadrant placement",
    "evidence grade or claim level"
  ],
  requiredChecks: [
    {
      label: "Aggregate usage extract",
      detail: "Approved Glean analytics source with source tag and pull date.",
      status: "Source required"
    },
    {
      label: "Assumption owner",
      detail: "Customer-owned assumption owner reviews scenario inputs; FluencyTracr does not calculate or authorize financial output.",
      status: "Owner review"
    },
    {
      label: "Scenario packaging",
      detail:
        "Output and export remain blocked until a promoted report-output contract authorizes them.",
      status: "Caveats required"
    }
  ],
  safeLanguage:
    "ROI Bot can package a sourced value hypothesis for business-owner review after evidence checks.",
  blockedLanguage:
    "ROI Bot output does not prove ROI, productivity, causality, financial movement, savings, or AI value attribution."
} as const;

const allowedPilotUseLabels: Record<string, string> = {
  aggregate_strategy_planning: "Aggregate strategy planning",
  pilot_rehearsal: "Pilot rehearsal",
  workflow_design_review: "Workflow design review",
  model_routing_review: "Model routing review",
  enablement_planning: "Enablement planning",
  cost_exposure_review: "Cost exposure review",
  token_efficiency_review: "Token efficiency review"
};

const blockedPilotUseLabels: Record<string, string> = {
  realized_roi: "Blocked: economic proof",
  ebita_claim: "Blocked: financial claim",
  causality_claim: "Blocked: causal proof",
  productivity_claim: "Blocked: productivity proof",
  headcount_reduction_claim: "Blocked: headcount reduction",
  individual_attribution: "Blocked: people-level attribution",
  manager_or_team_ranking: "Blocked: group ranking",
  people_decisioning: "Blocked: people decisioning",
  customer_facing_financial_output: "Blocked: customer-facing financial output"
};

const StatusPill = ({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "warn" | "good" }) => (
  <span className={`ai-value-pill ai-value-pill-${tone}`}>{label}</span>
);

type SourcePackageReviewStatus =
  | "missing"
  | "uploaded"
  | "parsed"
  | "held"
  | "approved"
  | "suppressed"
  | "aligned";

type SourcePackageReviewLane = {
  id: string;
  label: string;
  evidenceLayer: string;
  sourceMode: string;
  status: SourcePackageReviewStatus;
  ownerRole: string;
  reviewPacket: string;
  nextAction: string;
  caveat: string;
  dataSpineReviewClear: boolean;
};

const sourcePackageStatusTone: Record<SourcePackageReviewStatus, "neutral" | "warn" | "good"> = {
  missing: "warn",
  uploaded: "neutral",
  parsed: "neutral",
  held: "warn",
  approved: "good",
  suppressed: "warn",
  aligned: "good"
};

const sourcePackageReviewLanes = [
  {
    id: "blueprint",
    label: "Blueprint",
    evidenceLayer: "Workflow and value route",
    sourceMode: "blueprint_document_upload",
    status: "parsed",
    ownerRole: "Value team",
    reviewPacket: "Blueprint extraction packet",
    nextAction: "Map parsed value routes to workflow_family and confirm owner review.",
    caveat: "Parsed Blueprint text still needs source-bound approval before Evidence Checkpoint handoff.",
    dataSpineReviewClear: false
  },
  {
    id: "ai-fluency",
    label: "AI Fluency",
    evidenceLayer: "Aggregate instrument movement",
    sourceMode: "ai_fluency_dashboard_export",
    status: "approved",
    ownerRole: "AI Fluency owner",
    reviewPacket: "Aggregate instrument packet",
    nextAction: "Refresh approved aggregate export for the same baseline and comparison windows.",
    caveat: "Aggregate movement can inform readiness only when the dashboard export stays source-bound.",
    dataSpineReviewClear: true
  },
  {
    id: "vbd-token",
    label: "VBD / Token",
    evidenceLayer: "VBD and token intensity context",
    sourceMode: "scrubbed_glean_bigquery_export",
    status: "aligned",
    ownerRole: "Glean review",
    reviewPacket: "Scrubbed aggregate telemetry packet",
    nextAction: "Keep VBD and token windows aligned to the selected workflow family.",
    caveat: "Token intensity is operating context only and does not change the VBD formula.",
    dataSpineReviewClear: true
  },
  {
    id: "customer-metric",
    label: "Customer metric",
    evidenceLayer: "Selected business metric",
    sourceMode: "customer_metric_aggregate_export",
    status: "held",
    ownerRole: "Metric owner",
    reviewPacket: "Customer metric review packet",
    nextAction: "Resolve metric owner approval, metric definition, and same-window alignment.",
    caveat: "Metric movement stays held until the owner and source system approve the aggregate lane.",
    dataSpineReviewClear: false
  },
  {
    id: "assumption-context",
    label: "Value assumption context",
    evidenceLayer: "Scenario assumptions",
    sourceMode: "assumption_approval",
    status: "uploaded",
    ownerRole: "Business owner",
    reviewPacket: "Assumption review packet",
    nextAction: "Tag review date, assumption owner, and approval state before executive review.",
    caveat: "Assumptions are scenario context only and cannot substitute for an Evidence Checkpoint.",
    dataSpineReviewClear: false
  },
  {
    id: "governance",
    label: "Governance",
    evidenceLayer: "Aggregate boundary controls",
    sourceMode: "governance_attestation",
    status: "approved",
    ownerRole: "Governance reviewer",
    reviewPacket: "Governance attestation packet",
    nextAction: "Regenerate at aggregate threshold if any lane becomes held or suppressed.",
    caveat: "Governance clears source boundaries only; it cannot override a held or suppressed lane.",
    dataSpineReviewClear: true
  }
] satisfies SourcePackageReviewLane[];

type AiFluencyEvidenceViewKey = "capture" | "profile" | "translation" | "report";

const aiFluencyEvidenceViews = [
  {
    key: "capture",
    label: "Capture",
    description: "Instrument collection status and AIOM context."
  },
  {
    key: "profile",
    label: "Profile",
    description: "Five-factor fluency profile from the same instrument."
  },
  {
    key: "translation",
    label: "Translation",
    description: "Attitude, intent, and perceived impact signals."
  },
  {
    key: "report",
    label: "Report Read",
    description: "Value Realization interpretation for the executive report."
  }
] satisfies {
  key: AiFluencyEvidenceViewKey;
  label: string;
  description: string;
}[];

type AiFluencyCollectionStatus = "collecting" | "complete" | "held";

export const canImportAiFluencyMeasurement = (status: AiFluencyCollectionStatus) =>
  status === "complete";

const externalAiFluencyMeasurement = {
  experience: "Illustrative external AI Fluency fixture",
  collectionStatus: "complete" as AiFluencyCollectionStatus,
  collectionLabel: "Fixture state: collection complete",
  importSource: "Illustrative published aggregate report",
  sourceId: "illustrative-organizational-report",
  reportVersion: "wireframe-v1"
} as const;

const aiFluencyImportReceiptKey = (organizationId = currentOrganizationId()) =>
  organizationScopedSessionKey("aiValue.aiFluencyImportReceipt.v1", organizationId);
const aiFluencyValueCaseBinding = (draft: ValueSetupDraft) =>
  checksumAiFluencyPayload({
    hypothesis: draft.hypothesis,
    workflowId: draft.workflowId,
    metricIds: [...draft.metricIds].sort()
  });

const serializeAiFluencyImportReceipt = (fixture: AiFluencyImportFixture) =>
  JSON.stringify(fixture.receipt);

const labelFromToken = (
  value: unknown,
  labels: Record<string, string>,
  fallback = "Held for review"
) => {
  const key = String(value ?? "");
  return labels[key] ?? fallback;
};

const dateRangeLabel = (window: Record<string, any>) => {
  const start = window.covered_window?.window_start;
  const end = window.covered_window?.window_end;
  return start && end ? `${start} to ${end}` : "Window not available";
};

const percentMovementLabel = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Not available";
  if (value === 0) return "No change";
  const direction = value < 0 ? "lower" : "higher";
  return `${Math.round(Math.abs(value) * 100)}% ${direction}`;
};

const pointMovementLabel = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Not available";
  if (value === 0) return "No change";
  const direction = value < 0 ? "lower" : "higher";
  return `${Math.round(Math.abs(value) * 100)} pts ${direction}`;
};

const displayPilotUses = (uses: unknown, labels: Record<string, string>) =>
  Array.isArray(uses)
    ? uses.map((use) => labelFromToken(use, labels)).filter(Boolean)
    : [];

const sampleExecutiveReport = {
  currentPosture: [
    ["Hypothesis status", "Customer-approved"],
    ["Evidence posture", "Emerging"],
    ["Business metric status", "Held for owner review"],
    ["Spend posture", "Needs efficiency review"],
    ["Recommended executive move", "Scale selectively, close the metric-source gap, and recheck at Day 90"]
  ],
  layers: [
    {
      title: "Approved Hypothesis",
      summary: "Customer goal: improve customer support case resolution.",
      bullets: [
        "Expected behaviors: faster knowledge retrieval, higher reuse, consistent verification, lower escalation friction.",
        "Selected metrics: resolution time, first contact resolution, escalation rate.",
        "Expected timing: Day 30 behavior signal, Day 90 metric review, Day 180 quality review.",
        "Governed value driver: Capacity."
      ]
    },
    {
      title: "Human Readiness",
      summary: "Fluency Baseline shows support is capable but uneven.",
      bullets: [
        "Aggregate readiness signal: respondents report confidence using Glean for case triage and answer validation.",
        "Gap: the workflow needs stronger reinforcement and visible examples of good verified use.",
        "Recommended action: Run a targeted enablement sprint focused on verified answer reuse inside high-volume support workflows."
      ]
    },
    {
      title: "Behavior Evidence / VBD",
      summary: "Behavior is moving from shallow adoption toward deeper workflow integration.",
      bullets: [
        "Velocity: moderate; Breadth: expanding; Depth: improving.",
        "Verification and reuse are present; delegation is emerging; recovery behavior needs review.",
        "Interpretation: the workflow is showing signs of becoming repeatable work, not just experimentation.",
        "Watch item: token intensity is elevated in some support workflows."
      ]
    },
    {
      title: "Business Metric Linkage",
      summary: "Selected metric: resolution time. Status: held for owner review.",
      bullets: [
        "Metric owner: Customer Support Operations.",
        "Source: customer-owned support reporting.",
        "Current limitation: the export has not cleared the same workflow, cohort, and time-window review.",
        "Needed next: confirm baseline window, comparison window, metric definition, and aggregate export approval."
      ]
    },
    {
      title: "Spend & Scale Judgment",
      summary: "Current spend read: needs efficiency review.",
      bullets: [
        "Usage is increasing in the target workflow and behavior depth is improving.",
        "Some token intensity appears high relative to workflow maturity.",
        "Executive interpretation: inspect where spend is creating durable workflow change versus shallow or inefficient use.",
        "Recommended action: Review high-token, low-depth workflows before expanding."
      ]
    }
  ],
  recommendations: [
    "Scale the support case-resolution workflow selectively to adjacent teams where source evidence is approved.",
    "Assign Customer Support Operations to approve the Day 90 resolution-time export.",
    "Coach teams on verified answer reuse, escalation decision support, and recovery patterns.",
    "Inspect token-heavy workflows with low depth before broader rollout.",
    "Run the next Evidence Checkpoint once behavior evidence and customer metric evidence align."
  ],
  governanceNotes: [
    "This report uses approved aggregate evidence only.",
    "This report does not claim ROI, causality, productivity lift, financial impact, individual performance, probability, or a confidence score.",
    "Held, missing, suppressed, or misaligned evidence remains visible and blocks stronger value language."
  ]
} as const;

const customerProjectionRole = () =>
  getFrontendSessionContext().role;

const customerProjectionMeasurementPlanId = () => {
  const query = new URLSearchParams(window.location.search);
  return query.get("measurement_plan_id");
};

const hasCustomerProjectionRows = (
  response: CustomerDataModelProjectionResponse | null
) =>
  response?.projection_state === "SOURCE_BOUND_CUSTOMER_EVIDENCE_STATUS_READY" &&
  Array.isArray(response.projections) &&
  response.projections.length > 0;

const visibleBlockedCustomerProjectionOutputs = (
  projection: CustomerDataModelProjection | null
) => {
  const blocked = projection?.blocked_outputs ?? [];
  return blocked.filter((item) => item === "Live connector output").slice(0, 1);
};

const customerProjectionWindowLabel = (window: { start: string; end: string }) =>
  `${window.start} to ${window.end}`;

const prioritizedPilotUses = (
  uses: string[],
  priority: string[],
  maxItems: number
) => {
  const selected = priority.filter((item) => uses.includes(item));
  const fallback = uses.filter((item) => !selected.includes(item));
  return [...selected, ...fallback].slice(0, maxItems);
};

const scenarioInputTone = (status: string): "good" | "warn" | "neutral" => {
  if (status === "Ready to model") return "good";
  if (status === "Awaiting review" || status === "Needs owner review" || status === "Missing input") {
    return "warn";
  }
  return "neutral";
};

const scenarioBandInterpretation = (interpretation: string) =>
  interpretation.replace(/baseline and comparison windows/gi, "pre/post periods");

const scenarioInputDetail = (label: string, detail: string) =>
  label === "Customer-owned assumptions"
    ? detail.replace(/customer-owned assumptions/gi, "client-owned operating context")
    : detail;

// Practitioner working pages were demoted from the executive spine; their old
// links land on the nearest spine step.
const legacySlugRedirects: Record<string, WorkspacePageSlug> = {
  blueprint: "home",
  evidence: "case",
  scenario: "case",
  roi: "case",
  readout: "decisions",
  vbd: "progress"
};

const workspaceSlugFromPath = (pathname: string) =>
  pathname.replace(/\/+$/, "").split("/ai-value-workspace/")[1]?.split("/")[0];

const canonicalWorkspaceRedirect = (pathname: string) => {
  const slug = workspaceSlugFromPath(pathname);
  if (!slug) return null;
  const legacyTarget = legacySlugRedirects[slug];
  if (legacyTarget) return workspacePageBySlug.get(legacyTarget)?.path ?? "/ai-value-workspace";
  return workspacePageBySlug.has(slug as WorkspacePageSlug)
    ? null
    : "/ai-value-workspace";
};

const currentPageFromPath = (pathname: string): WorkspacePageSlug => {
  const slug = workspaceSlugFromPath(pathname);
  return slug && workspacePageBySlug.has(slug as WorkspacePageSlug)
    ? (slug as WorkspacePageSlug)
    : "home";
};

type Journey = ReturnType<typeof useAiValueJourney>;

const workspacePageIndex = (slug: WorkspacePageSlug) =>
  Math.max(0, guidedWorkspacePages.findIndex((page) => page.slug === slug) - 1);

const visibleEvidenceCoverage = (journey: Journey) =>
  journey.realEvidenceStatus.coverage.slice(0, 4);

const WorkspaceReportToolbar = ({
  activePage,
  activePageSlug,
  activeStepNumber,
  connectLiveEvidence,
  mode,
  statusTone,
  stepCount
}: {
  activePage: WorkspacePage;
  activePageSlug: WorkspacePageSlug;
  activeStepNumber: number;
  connectLiveEvidence: () => Promise<void>;
  mode: ReturnType<typeof useAiValueWorkspace>["mode"];
  statusTone: "good" | "warn" | "neutral";
  stepCount: number;
}) => (
  <header
    className="ai-value-workspace-report-toolbar"
    aria-label="AI value report header"
  >
    <div className="ai-value-workspace-report-toolbar-main">
      <p className="ai-value-workspace-report-kicker">AI Value Platform</p>
      <div>
        <h1>Value Case: AI Assistant Value Assessment</h1>
        <p>{activePage.label}</p>
      </div>
      <div
        className="ai-value-workspace-step-indicator"
        aria-label={`Step ${activeStepNumber} of ${stepCount}: ${activePage.navLabel}`}
      >
        <span>Step {activeStepNumber} of {stepCount}</span>
        <strong>{activePage.navLabel}</strong>
      </div>
      <nav className="ai-value-workspace-report-tabs" aria-label="Value case modes">
        <Link
          className={activePageSlug === "decisions" ? undefined : "active"}
          to="/ai-value-workspace"
        >
          Cockpit
        </Link>
        <Link
          className={activePageSlug === "decisions" ? "active" : undefined}
          to="/ai-value-workspace/decisions"
        >
          Report
        </Link>
      </nav>
      <p className="ai-value-workspace-report-caveat-strip">
        Caveated review only: aggregate source readiness supports planning and
        reviewer action, not proof of ROI. Causality, productivity, financial
        calculations, certainty language, and customer-facing economic claims
        remain blocked.
      </p>
    </div>
    <div
      className="ai-value-workspace-report-toolbar-actions"
      role="group"
      aria-label="Report frame actions"
    >
      <span aria-live="polite">
        <StatusPill
          label="Read-only status"
          tone={mode === "live" ? "good" : "neutral"}
        />
        <StatusPill label="Source review queue" tone={statusTone} />
      </span>
      <button
        type="button"
        onClick={() => void connectLiveEvidence()}
        disabled={mode === "loading"}
      >
        {mode === "loading"
          ? "Refreshing..."
          : mode === "live"
            ? "Refresh aggregate evidence status"
            : "Review aggregate evidence status"}
      </button>
      <button type="button" disabled>
        View caveats
      </button>
      <button type="button" disabled>
        Export not authorized
      </button>
      <button type="button" disabled>
        Share not authorized
      </button>
    </div>
  </header>
);

const HomeWorkspaceHeader = () => (
  <header
    className="ai-value-workspace-report-toolbar ai-value-home-toolbar"
    aria-label="AI value workspace header"
  >
    <div className="ai-value-workspace-report-toolbar-main">
      <p className="ai-value-workspace-report-kicker">AI Value Platform</p>
      <div>
        <h1>AI Value Workspace</h1>
        <p>One clear path from customer hypothesis to evidence-backed decision.</p>
      </div>
    </div>
    <StatusPill label="Aggregate evidence only" tone="neutral" />
  </header>
);

const setupHeaderBySlug: Partial<Record<WorkspacePageSlug, { kicker: string; title: string; detail: string; step: string }>> = {
  "value-case": {
    kicker: "Set up",
    title: "Define the customer hypothesis",
    detail: "Say what the customer expects to change.",
    step: "Step 1 of 7"
  },
  workflow: {
    kicker: "Set up",
    title: "Confirm the workflow",
    detail: "Attach the hypothesis to one recurring work pattern.",
    step: "Step 2 of 7"
  },
  metrics: {
    kicker: "Set up",
    title: "Choose the metric",
    detail: "Select the customer-owned outcome that will test the hypothesis.",
    step: "Step 3 of 7"
  }
};

const SetupWorkspaceHeader = ({ slug }: { slug: WorkspacePageSlug }) => {
  const header = setupHeaderBySlug[slug] ?? setupHeaderBySlug["value-case"]!;
  return (
    <header
      className="ai-value-workspace-report-toolbar ai-value-home-toolbar"
      aria-label="Value setup header"
    >
      <div className="ai-value-workspace-report-toolbar-main">
        <p className="ai-value-workspace-report-kicker">{header.kicker}</p>
        <div><h1>{header.title}</h1><p>{header.detail}</p></div>
      </div>
      <StatusPill label={header.step} tone="neutral" />
    </header>
  );
};

const CheckpointWorkspaceHeader = () => (
  <header className="ai-value-workspace-report-toolbar ai-value-home-toolbar" aria-label="Evidence checkpoint header">
    <div className="ai-value-workspace-report-toolbar-main">
      <p className="ai-value-workspace-report-kicker">Governed review</p>
      <div><h1>Evidence Checkpoint</h1><p>Review assembled evidence without changing the seven-step guided flow.</p></div>
    </div>
    <StatusPill label="Outside guided setup" tone="neutral" />
  </header>
);

const reportSidebarGroups: Array<{
  label: string;
  items: Array<{ label: string; path: string; slug: WorkspacePageSlug }>;
}> = [
  {
    label: "Start",
    items: [{ label: "Home", path: "/ai-value-workspace", slug: "home" }]
  },
  {
    label: "Set up",
    items: [
      { label: "1. Value case", path: "/ai-value-workspace/value-case", slug: "value-case" },
      { label: "2. Workflow", path: "/ai-value-workspace/workflow", slug: "workflow" },
      { label: "3. Metric", path: "/ai-value-workspace/metrics", slug: "metrics" }
    ]
  },
  {
    label: "Measure",
    items: [
      { label: "4. AI Fluency", path: "/ai-value-workspace/readiness", slug: "readiness" },
      { label: "5. Evidence", path: "/ai-value-workspace/sources", slug: "sources" },
      { label: "6. Progress", path: "/ai-value-workspace/progress", slug: "progress" }
    ]
  },
  {
    label: "Act",
    items: [{ label: "7. Decision", path: "/ai-value-workspace/decisions", slug: "decisions" }]
  }
];

const reportBoundaryLinks = [
  {
    label: "Claim boundaries",
    path: "/ai-value-workspace/case",
    title: "Open the Evidence Checkpoint and claim-language boundaries"
  },
  {
    label: "Reviewer approvals",
    path: "/ai-value-workspace/decisions",
    title: "Open the held decision and reviewer approval requirements"
  },
  {
    label: "Audit-ready notes",
    path: "/ai-value-workspace/sources",
    title: "Open source status, caveats, and audit-ready evidence notes"
  }
] as const;

const WorkspaceReportSidebar = ({ activePageSlug }: { activePageSlug: WorkspacePageSlug }) => (
  <aside className="ai-value-workspace-report-sidebar" aria-label="AI value report navigation">
    <Link className="ai-value-workspace-report-brand" to="/ai-value-workspace">
      <strong>FluencyTracr</strong>
      <span>Value Platform</span>
    </Link>
    <nav aria-label="Workspace">
      {reportSidebarGroups.map((group) => (
        <section className="ai-value-workspace-nav-group" key={group.label} aria-label={group.label}>
          <p>{group.label}</p>
          {group.items.map((item) => (
            <Link
              key={item.label}
              className={item.slug === activePageSlug ? "active" : undefined}
              aria-current={item.slug === activePageSlug ? "page" : undefined}
              to={item.path}
            >
              {item.label}
            </Link>
          ))}
        </section>
      ))}
    </nav>
    <section className="ai-value-workspace-report-boundaries" aria-label="Governance boundaries">
      <p>Governance</p>
      <ul>
        {reportBoundaryLinks.map((item) => (
          <li key={item.label}>
            <Link to={item.path} title={item.title}>{item.label}</Link>
          </li>
        ))}
      </ul>
    </section>
  </aside>
);

export const AIValueWorkspace = () => {
  useSyncExternalStore(
    subscribeToAuthSession,
    getAuthSessionSnapshot,
    getAuthSessionSnapshot
  );
  const location = useLocation();
  const redirectPath = canonicalWorkspaceRedirect(location.pathname);
  const activePageSlug = currentPageFromPath(location.pathname);
  const { mode, live, liveReport, errorMessage, connectLiveEvidence } =
    useAiValueWorkspace();
  const journey = useAiValueJourney();
  const organizationId = currentOrganizationId();
  const [setupDraftState, setSetupDraftState] = useState(() => ({
    organizationId,
    draft: readValueSetupDraft(organizationId)
  }));
  const setupDraft = setupDraftState.organizationId === organizationId
    ? setupDraftState.draft
    : readValueSetupDraft(organizationId);
  const setSetupDraft = (draft: ValueSetupDraft) => {
    setSetupDraftState({ organizationId, draft });
  };
  const setupWorkflow = valueSetupMatch(setupDraft).candidates.find(
    (candidate) => candidate.id === setupDraft.workflowId
  );
  const setupMetricIds = new Set(setupWorkflow?.metrics.map((metric) => metric.id) ?? []);
  const setupComplete = Boolean(
    setupDraft.hypothesis &&
    setupWorkflow &&
    setupDraft.metricIds.some((id) => setupMetricIds.has(id))
  );

  useEffect(() => {
    if (setupDraftState.organizationId !== organizationId) {
      setSetupDraftState({
        organizationId,
        draft: readValueSetupDraft(organizationId)
      });
    }
  }, [organizationId, setupDraftState.organizationId]);

  useEffect(() => {
    if (setupDraftState.organizationId !== organizationId) return;
    try {
      const storageKey = valueSetupStorageKey(organizationId);
      if (!storageKey) return;
      sessionStorage.setItem(storageKey, JSON.stringify(setupDraftState.draft));
    } catch {
      return;
    }
  }, [organizationId, setupDraftState]);

  const workflowName =
    setupWorkflow?.name ??
    live?.workflowName ??
    (journey.workflowHandoff.selected
      ? journey.workflowHandoff.workflowName
      : aiValueWorkspace.workflowName);
  const valueRouteLabel =
    setupWorkflow
      ? "Pending customer confirmation"
      : live?.valueRouteLabel ??
    (journey.workflowHandoff.selected
      ? journey.workflowHandoff.valueRouteLabel
      : aiValueWorkspace.valueRouteLabel);
  const decisionLabel =
    setupWorkflow
      ? "Setup draft — not reviewed"
      : live?.decisionLabel ??
    (journey.workflowHandoff.selected && journey.evidenceScenarioPlan.decisionLabel
      ? journey.evidenceScenarioPlan.decisionLabel
      : aiValueWorkspace.decisionLabel);
  const claimModeLabel = setupWorkflow
    ? "No claims yet"
    : live?.claimModeLabel ?? aiValueWorkspace.claimModeLabel;
  const activePage = workspacePageBySlug.get(activePageSlug) ?? workspacePages[0];
  const activeStepNumber = workspacePageIndex(activePageSlug) + 1;
  const requiresSession = [journey.errorMessage, errorMessage].some((message) =>
    message?.toLowerCase().includes("sign in")
  );
  const hasBlueprintSummary = journey.stages.some(
    (stage) => stage.key === "blueprint" && stage.state === "done"
  );
  const caseUnavailable = Boolean(
    !journey.loading &&
    !journey.workflowHandoff.selected &&
    !requiresSession &&
    (journey.errorMessage || hasBlueprintSummary)
  );

  if (redirectPath) return <Navigate to={redirectPath} replace />;

  return (
    <main className="ai-value-workspace-report-app">
      <section
        className="ai-value-workspace-report-frame"
        aria-label="AI value workspace report frame"
      >
        <WorkspaceReportSidebar activePageSlug={activePageSlug} />
        <section className="ai-value-workspace-report-main" aria-label="AI value report workspace">
          {activePageSlug === "home" ? (
            <HomeWorkspaceHeader />
          ) : ["value-case", "workflow", "metrics"].includes(activePageSlug) ? (
            <SetupWorkspaceHeader slug={activePageSlug} />
          ) : activePageSlug === "case" ? (
            <CheckpointWorkspaceHeader />
          ) : (
            <WorkspaceReportToolbar
              activePage={activePage}
              activePageSlug={activePageSlug}
              activeStepNumber={activeStepNumber}
              connectLiveEvidence={connectLiveEvidence}
              mode={mode}
              statusTone={journey.realEvidenceStatus.statusTone}
              stepCount={guidedWorkspacePages.length - 1}
            />
          )}

          <section className="ai-value-workspace-report-surface">
            {activePageSlug === "home" ? (
              <HomePage
                workflowName={journey.workflowHandoff.workflowName}
                valueRouteLabel={journey.workflowHandoff.valueRouteLabel}
                decisionLabel={journey.evidenceScenarioPlan.decisionLabel}
                hasActiveCase={journey.workflowHandoff.selected}
                isLoading={journey.loading}
                requiresSession={requiresSession}
                caseUnavailable={caseUnavailable}
                errorMessage={journey.errorMessage}
              />
            ) : activePageSlug !== "home" && journey.loading ? (
              <WorkspaceCaseAccessLoading />
            ) : requiresSession ? (
              <WorkspaceSessionRequired />
            ) : activePageSlug !== "home" && journey.errorMessage ? (
              <WorkspaceAccessUnavailable onRefresh={() => void journey.refresh()} />
            ) : activePageSlug === "value-case" ? (
              <ValueCaseDefinitionPage draft={setupDraft} onChange={setSetupDraft} />
            ) : activePageSlug === "workflow" ? (
              <WorkflowSetupPage draft={setupDraft} onChange={setSetupDraft} />
            ) : activePageSlug === "metrics" ? (
              <MetricSetupPage draft={setupDraft} onChange={setSetupDraft} journey={journey} />
            ) : activePageSlug === "case" ? (
              <section className="ai-value-active-workspace" aria-label="Active value journey step">
                <EvidenceCheckpointPage journey={journey} />
                <WorkspacePageHandoff currentSlug="case" />
              </section>
            ) : !setupComplete && ["readiness", "sources", "progress", "decisions"].includes(activePageSlug) ? (
              <GuidedPrerequisiteGate targetSlug={activePageSlug} />
            ) : (
              <>
                <section className="ai-value-next-action" aria-label="Current guided action">
                  <div>
                    <span>Next best action</span>
                    <strong>{activePage.label}</strong>
                    <p>{activePage.detail}</p>
                  </div>
                  <StatusPill label={`Step ${activeStepNumber} of ${guidedWorkspacePages.length - 1}`} tone="neutral" />
                </section>

                <section className="ai-value-context-bar" aria-label="Current client value thread">
                  <div>
                    <span className="ai-value-map-label">Workflow</span>
                    <strong>{workflowName}</strong>
                  </div>
                  <div>
                    <span className="ai-value-map-label">Value route</span>
                    <strong>{valueRouteLabel}</strong>
                  </div>
                  <div>
                    <span className="ai-value-map-label">Current decision</span>
                    <strong>{decisionLabel}</strong>
                  </div>
                  <div>
                    <span className="ai-value-map-label">Value language</span>
                    <strong>{claimModeLabel}</strong>
                  </div>
                </section>

                {journey.errorMessage && (
                  <p role="alert" aria-live="polite" className="ai-value-inline-alert">
                    {journey.errorMessage}
                  </p>
                )}
                {errorMessage && (
                  <p role="alert" aria-live="polite" className="ai-value-inline-alert">
                    {errorMessage}
                  </p>
                )}

                <section
                  className="ai-value-console-layout ai-value-workspace-report-layout"
                  aria-label="Value journey console"
                >
                  <section className="ai-value-active-workspace" aria-label="Active value journey step">
                    {activePageSlug === "readiness" && (
                      <ReadinessPage
                        key={organizationId || "unavailable"}
                        draft={setupDraft}
                        organizationId={organizationId}
                      />
                    )}

                    {activePageSlug === "sources" && (
                      <GuidedEvidencePage draft={setupDraft} journey={journey} />
                    )}

                    {activePageSlug === "progress" && <ProgressPage draft={setupDraft} />}

                    {activePageSlug === "case" && <EvidenceCheckpointPage journey={journey} />}

                    {activePageSlug === "decisions" && (
                      <GuidedDecisionPage mode={mode} liveReport={liveReport} />
                    )}

                    <WorkspacePageHandoff currentSlug={activePageSlug} />
                  </section>

                  <WorkspaceAssistantPanel
                    activePageSlug={activePageSlug}
                    claimModeLabel={claimModeLabel}
                    journey={journey}
                  />
                </section>
              </>
            )}
          </section>
        </section>
      </section>
    </main>
  );
};

const WorkspacePageHandoff = ({ currentSlug }: { currentSlug: WorkspacePageSlug }) => {
  if (currentSlug === "case") {
    return (
      <nav className="ai-value-page-handoff" aria-label="Workspace page handoff">
        <div>
          <p className="eyebrow">Where this goes next</p>
          <p>Carry checkpoint status into the decision.</p>
        </div>
        <div className="ai-value-page-handoff-actions">
          <Link className="ai-value-step" to="/ai-value-workspace/progress">Back to Progress</Link>
          <Link className="ai-value-step active" to="/ai-value-workspace/decisions">Continue to Decision</Link>
        </div>
      </nav>
    );
  }

  const currentIndex = guidedWorkspacePages.findIndex((page) => page.slug === currentSlug);
  const current = guidedWorkspacePages[currentIndex];
  const previous = currentIndex > 0 ? guidedWorkspacePages[currentIndex - 1] : null;
  const next =
    currentSlug === "decisions"
      ? workspacePageBySlug.get("readiness")
      : guidedWorkspacePages[currentIndex + 1];
  const nextLabel = currentSlug === "decisions" ? "Remeasure from" : "Continue to";

  if (!current || !next) return null;

  return (
    <nav className="ai-value-page-handoff" aria-label="Workspace page handoff">
      <div>
        <p className="eyebrow">Where this goes next</p>
        <p>{current.feedsNext}</p>
      </div>
      <div className="ai-value-page-handoff-actions">
        {previous && (
          <Link className="ai-value-step" to={previous.path}>
            Back to {previous.navLabel}
          </Link>
        )}
        <Link className="ai-value-step active" to={next.path}>
          {nextLabel} {next.navLabel}
        </Link>
      </div>
    </nav>
  );
};

const WorkspaceCaseAccessLoading = () => (
  <section className="ai-value-home-empty" role="status" aria-label="Checking workspace access">
    <div>
      <p className="eyebrow">Organization session</p>
      <h2>Checking workspace access</h2>
      <p>Workspace content remains hidden until the organization session is verified.</p>
    </div>
  </section>
);

const WorkspaceAccessUnavailable = ({ onRefresh }: { onRefresh: () => void }) => (
  <section className="ai-value-home-empty" role="alert" aria-label="Workspace access unavailable">
    <div>
      <p className="eyebrow">Workspace unavailable</p>
      <h2>Evidence remains hidden</h2>
      <p>The organization workspace could not be verified. Retry before reviewing case-study or evidence content.</p>
    </div>
    <button className="ai-value-home-secondary-action" type="button" onClick={onRefresh}>
      Retry workspace check
    </button>
  </section>
);

const WorkspaceSessionRequired = () => (
  <section className="ai-value-home-empty" role="region" aria-label="Organization session required">
    <div>
      <p className="eyebrow">Organization session required</p>
      <h2>Sign in to view this value case</h2>
      <p>Case evidence and readouts are hidden until the organization session is restored.</p>
    </div>
    <Link className="ai-value-home-primary-action" to="/login">Sign in</Link>
  </section>
);

const HomePage = ({
  workflowName,
  valueRouteLabel,
  decisionLabel,
  hasActiveCase,
  isLoading,
  requiresSession,
  caseUnavailable,
  errorMessage
}: {
  workflowName: string;
  valueRouteLabel: string;
  decisionLabel: string;
  hasActiveCase: boolean;
  isLoading: boolean;
  requiresSession: boolean;
  caseUnavailable: boolean;
  errorMessage: string | null;
}) => (
  <section className="ai-value-home" aria-label="Value case home">
    <header className="ai-value-home-intro">
      <p className="eyebrow">Your next move</p>
      <h2>
        {isLoading
          ? "Checking value cases"
          : hasActiveCase
            ? "Review the value case"
            : requiresSession
              ? "Sign in to continue"
              : caseUnavailable
                ? "Value case unavailable"
                : "Create a value case"}
      </h2>
      <p>
        {isLoading
          ? "Loading the organization workspace and its aggregate value-case status."
          : hasActiveCase
            ? "Focus on the customer question, current status, and the decision that needs attention."
            : requiresSession
              ? "Connect an organization session before creating or reviewing customer value cases."
              : caseUnavailable
                ? "A value case exists, but its reviewed details could not be loaded."
                : "Start with one customer-approved workflow, value question, and outcome to review."}
      </p>
    </header>

    {errorMessage && !requiresSession && !isLoading && (
      <p role="alert" aria-live="polite" className="ai-value-inline-alert ai-value-home-alert">
        {errorMessage}
      </p>
    )}

    {isLoading ? (
      <article className="ai-value-home-empty" role="status" aria-label="Checking value cases">
        <div>
          <p className="eyebrow">Organization workspace</p>
          <h3>Checking for an active value case</h3>
          <p>Case actions will appear after the organization status is known.</p>
        </div>
      </article>
    ) : hasActiveCase ? (
      <article className="ai-value-home-case" role="region" aria-label="Active value case">
        <div className="ai-value-home-case-summary">
          <div className="ai-value-home-case-heading">
            <div>
              <p className="eyebrow">Active value case</p>
              <h3>{workflowName}</h3>
            </div>
            <StatusPill label={decisionLabel} tone="warn" />
          </div>
          <p className="ai-value-home-question">
            Does the approved AI workflow create the expected value while maintaining quality?
          </p>
          <dl className="ai-value-home-facts">
            <div>
              <dt>Workflow</dt>
              <dd>{workflowName}</dd>
            </div>
            <div>
              <dt>Value route</dt>
              <dd>{valueRouteLabel}</dd>
            </div>
          </dl>
        </div>

        <div className="ai-value-home-next">
          <p className="eyebrow">Next action</p>
          <h3>Review the current value case</h3>
          <p>Resolve open assumptions and check what evidence is ready for the next decision.</p>
          <Link className="ai-value-home-primary-action" to="/ai-value-workspace/value-case">
            Review value case
          </Link>
        </div>
      </article>
    ) : (
      <article
        className="ai-value-home-empty"
        role="region"
        aria-label={
          requiresSession
            ? "Organization session required"
            : caseUnavailable
              ? "Value case unavailable"
              : "No active value case"
        }
      >
        <div>
          <p className="eyebrow">
            {requiresSession
              ? "Organization session required"
              : caseUnavailable
                ? "Case details unavailable"
                : "No active value case"}
          </p>
          <h3>
            {requiresSession
              ? "Sign in to view value cases"
              : caseUnavailable
                ? "The value case could not be loaded"
                : "Define what the customer wants to test"}
          </h3>
          <p>
            {requiresSession
              ? "Your organization session determines which aggregate value cases and evidence you can review."
              : caseUnavailable
                ? "Refresh the workspace before making a case or evidence decision."
                : "Capture the workflow, expected change, customer-owned metric, and review window before bringing evidence into the workspace."}
          </p>
        </div>
        {caseUnavailable ? (
          <button
            className="ai-value-home-primary-action"
            type="button"
            onClick={() => window.location.reload()}
          >
            Refresh workspace
          </button>
        ) : (
          <Link
            className="ai-value-home-primary-action"
            to={requiresSession ? "/login" : "/ai-value-workspace/value-case"}
          >
            {requiresSession ? "Sign in" : "Start a value case"}
          </Link>
        )}
      </article>
    )}

    <p className="ai-value-home-boundary">
      This workspace uses aggregate evidence for internal planning. It does not prove ROI,
      causality, productivity, or individual performance.
    </p>
  </section>
);

const SourcePackageReviewQueuePanel = () => {
  const clearLanes = sourcePackageReviewLanes.filter((lane) => lane.dataSpineReviewClear);
  const blockedLanes = sourcePackageReviewLanes.filter((lane) => !lane.dataSpineReviewClear);

  return (
    <section className="ai-value-source-package-queue" aria-label="Source Review Queue">
      <div className="ai-value-section-head">
        <div>
          <p className="eyebrow">Next gate</p>
          <h3>Resolve {blockedLanes.length} source lanes</h3>
          <p>These aggregate lanes block the Evidence Checkpoint. Resolve them before stronger report language.</p>
        </div>
        <div className="ai-value-source-package-head-actions">
          <StatusPill label={`${clearLanes.length} of ${sourcePackageReviewLanes.length} lanes ready`} tone="good" />
        </div>
      </div>

      <p className="ai-value-source-package-meta">
        Review requires approved boundaries, workflow and function mapping, an aggregate cohort, and matched baseline and comparison windows.
      </p>

      <div className="ai-value-source-package-blocker-grid" aria-label="Source lanes requiring action">
        {blockedLanes.map((lane) => (
          <article
            className={`ai-value-source-package-lane ai-value-source-package-lane-${lane.status}`}
            key={lane.id}
            aria-label={`${lane.label} source package lane`}
          >
            <div className="ai-value-source-package-lane-head">
              <h4>{lane.label}</h4>
              <StatusPill label={lane.status} tone={sourcePackageStatusTone[lane.status]} />
            </div>
            <p className="ai-value-source-package-owner">Owner: {lane.ownerRole}</p>
            <p>{lane.nextAction}</p>
          </article>
        ))}
      </div>

      <section className="ai-value-source-package-ready" aria-label="Source lanes ready for review">
        <div>
          <span className="ai-value-map-label">Ready for review</span>
          <p>These lanes are available for the next Data Spine review.</p>
        </div>
        <div>
          {clearLanes.map((lane) => (
            <span className="ai-value-source-package-ready-lane" key={lane.id}>
              {lane.label}
              <StatusPill label={lane.status} tone={sourcePackageStatusTone[lane.status]} />
            </span>
          ))}
        </div>
      </section>

      <p className="ai-value-source-package-boundary">
        Source status informs internal planning only; it does not establish an Evidence Checkpoint or executive-report readiness on its own.
      </p>
    </section>
  );
};

const EvidenceSourcesPage = ({ journey }: { journey: Journey }) => (
  <section className="ai-value-focused-stack" aria-label="Evidence source workspace">
    <section className="ai-value-panel ai-value-source-command" aria-label="Evidence source readiness">
      <div className="ai-value-section-head">
        <div>
          <p className="eyebrow">Source readiness</p>
          <h2>Evidence Sources</h2>
          <p>Connect the approved aggregate evidence needed for the next checkpoint.</p>
        </div>
        <StatusPill label={journey.realEvidenceStatus.statusLabel} tone={journey.realEvidenceStatus.statusTone} />
      </div>

      <div className="ai-value-source-readiness-summary" aria-label="Current source coverage">
        <strong>What is missing</strong>
        <ul>
          {visibleEvidenceCoverage(journey).map((item) => (
            <li key={item.label}>
              <span>{item.label}</span>
              <strong>{item.stateLabel}</strong>
            </li>
          ))}
        </ul>
      </div>

      {journey.realEvidenceStatus.heldReasons.length > 0 && (
        <div className="ai-value-source-held" role="alert" aria-live="polite">
          <strong>Held reasons</strong>
          <ul>
            {journey.realEvidenceStatus.heldReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
    </section>

    <CustomerDataModelProjectionPanel />
  </section>
);

const GuidedEvidencePage = ({ draft, journey }: { draft: ValueSetupDraft; journey: Journey }) => (
  <section className="ai-value-focused-stack" aria-label="Guided evidence workspace">
    <ConnectedSetupSummary draft={draft} />
    <section className="ai-value-panel" aria-label="Evidence binding status">
      <p className="eyebrow">Step 5 · Evidence</p>
      <h3>Bind approved sources to this workflow and metric</h3>
      <p>The organization has source status on file, but it is not yet bound to this guided draft. Evidence remains held to prevent cross-workflow stitching.</p>
      <StatusPill label="Binding required" tone="warn" />
    </section>
    <details className="ai-value-advanced-workbench">
      <summary>View existing organization source review — not bound to this draft</summary>
      <EvidenceSourcesPage journey={journey} />
    </details>
  </section>
);

const EvidenceCheckpointPage = ({ journey }: { journey: Journey }) => (
  <section className="ai-value-focused-stack" aria-label="Evidence Checkpoint workspace">
    <section className="ai-value-panel ai-value-checkpoint-panel" aria-label="Evidence Checkpoint status">
      <div className="ai-value-section-head">
        <div>
          <p className="eyebrow">Milestone review</p>
          <h2>Evidence Checkpoint</h2>
          <p>
            A checkpoint is the reviewed milestone where the accepted hypothesis,
            approved source packages, behavior evidence, and customer metric evidence
            are assembled with caveats.
          </p>
        </div>
        <StatusPill label={journey.customerEvidenceReview.statusLabel} tone={journey.customerEvidenceReview.statusTone} />
      </div>

      <div className="ai-value-checkpoint-grid" aria-label="Checkpoint readiness">
        <article>
          <span className="ai-value-map-label">Hypothesis binding</span>
          <strong>{journey.evidenceScenarioPlan.decisionLabel}</strong>
          <p>Expected pathways remain customer approved before milestone evidence is compared.</p>
        </article>
        <article>
          <span className="ai-value-map-label">Source package state</span>
          <strong>{journey.realEvidenceStatus.statusLabel}</strong>
          <p>{journey.realEvidenceStatus.nextAction}</p>
        </article>
        <article>
          <span className="ai-value-map-label">Metric evidence</span>
          <strong>{journey.customerEvidenceReview.statusLabel}</strong>
          <p>{journey.customerEvidenceReview.summary}</p>
        </article>
        <article>
          <span className="ai-value-map-label">Timeline</span>
          <strong>Day 0 / 30 / 60 / 90 / 180 / 365</strong>
          <p>Milestone evidence can feed continuity review; rolling windows stay operating context only.</p>
        </article>
      </div>

      <div className="ai-value-evidence-timeline ai-value-evidence-timeline-wide" aria-label="Evidence Timeline">
        {["Day 0", "Day 30", "Day 60", "Day 90", "Day 180", "Day 365"].map((window, index) => (
          <span className={index <= 2 ? "ready" : ""} key={window}>{window}</span>
        ))}
      </div>
    </section>

    <ValueEvidenceCasePanel />
  </section>
);

const valueSetupMatch = (draft: ValueSetupDraft) =>
  matchHypothesisToGleanWorkflows(draft.hypothesis);

const GuidedPrerequisiteGate = ({ targetSlug }: { targetSlug: WorkspacePageSlug }) => (
  <section className="ai-value-case-definition" aria-label="Guided setup required">
    <section className="ai-value-case-no-match" role="status">
      <p className="eyebrow">Setup required</p>
      <h2>Connect the value case before opening {workspacePageBySlug.get(targetSlug)?.navLabel ?? "this step"}</h2>
      <p>Complete the hypothesis, workflow, and draft customer metric in order. Later evidence and decisions stay held until those inputs are connected.</p>
      <ol className="ai-value-prerequisite-list">
        <li>Define the customer hypothesis</li>
        <li>Confirm one recurring workflow</li>
        <li>Choose at least one draft customer-owned metric</li>
      </ol>
      <Link className="ai-value-home-primary-action" to="/ai-value-workspace/value-case">Start with Value Case</Link>
    </section>
  </section>
);

const ValueSetupGate = ({
  title,
  detail,
  path,
  action
}: {
  title: string;
  detail: string;
  path: string;
  action: string;
}) => (
  <section className="ai-value-case-no-match" role="status">
    <p className="eyebrow">Complete the previous step</p>
    <h3>{title}</h3>
    <p>{detail}</p>
    <Link className="ai-value-home-primary-action" to={path}>{action}</Link>
  </section>
);

const MAX_BLUEPRINT_FILE_SIZE_MB = 15;
const MAX_BLUEPRINT_FILE_SIZE_BYTES = MAX_BLUEPRINT_FILE_SIZE_MB * 1024 * 1024;

type BlueprintParseState = "idle" | "parsing" | "ready" | "error";

const ValueCaseDefinitionPage = ({
  draft,
  onChange
}: {
  draft: ValueSetupDraft;
  onChange: (draft: ValueSetupDraft) => void;
}) => {
  const navigate = useNavigate();
  const [hypothesis, setHypothesis] = useState(draft.hypothesis);
  const [blueprintParseState, setBlueprintParseState] = useState<BlueprintParseState>(
    draft.source === "blueprint" ? "ready" : "idle"
  );
  const [blueprintParseMessage, setBlueprintParseMessage] = useState(
    draft.source === "blueprint"
      ? "Imported hypothesis restored. Confirm it before continuing."
      : ""
  );
  const [blueprintNeedsConfirmation, setBlueprintNeedsConfirmation] = useState(
    draft.source === "blueprint"
  );
  const [isBlueprintDraft, setIsBlueprintDraft] = useState(draft.source === "blueprint");
  const [blueprintHasMaterialEdits, setBlueprintHasMaterialEdits] = useState(false);
  const parseAttemptRef = useRef(0);
  const importedHypothesisRef = useRef(
    draft.source === "blueprint" ? draft.hypothesis.trim() : ""
  );
  const result = useMemo(() => matchHypothesisToGleanWorkflows(hypothesis), [hypothesis]);
  const containsDirectIdentifier = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b|\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/.test(hypothesis);
  const hasValidHypothesis = result.candidates.length > 0 && !containsDirectIdentifier;
  const canContinue = hasValidHypothesis && !blueprintNeedsConfirmation;

  useEffect(() => () => {
    parseAttemptRef.current += 1;
  }, []);

  const parseBlueprint = async (file: File) => {
    const parseAttempt = parseAttemptRef.current + 1;
    parseAttemptRef.current = parseAttempt;
    setHypothesis("");
    onChange(emptyValueSetupDraft);
    setIsBlueprintDraft(true);
    setBlueprintHasMaterialEdits(false);
    setBlueprintNeedsConfirmation(false);
    setBlueprintParseState("parsing");
    setBlueprintParseMessage("Reading the Blueprint document locally…");

    if (file.size > MAX_BLUEPRINT_FILE_SIZE_BYTES) {
      setBlueprintParseState("error");
      setBlueprintParseMessage(`The Blueprint is larger than ${MAX_BLUEPRINT_FILE_SIZE_MB}MB. Choose a smaller PDF or DOCX.`);
      return;
    }

    try {
      const { text } = await parseDocumentText(file);
      if (parseAttemptRef.current !== parseAttempt) return;
      const canonicalHypothesis = deriveAggregateHypothesisFromBlueprint(text);
      if (!canonicalHypothesis) {
        setBlueprintParseState("error");
        setBlueprintParseMessage(
          "We could not find one supported function, business object, and expected change or metric. Enter the hypothesis manually."
        );
        return;
      }
      importedHypothesisRef.current = canonicalHypothesis.trim();
      setHypothesis(canonicalHypothesis);
      setIsBlueprintDraft(true);
      setBlueprintHasMaterialEdits(false);
      setBlueprintNeedsConfirmation(true);
      setBlueprintParseState("ready");
      setBlueprintParseMessage(
        "Blueprint parsed into an aggregate hypothesis. Review the summary before continuing."
      );
    } catch {
      if (parseAttemptRef.current !== parseAttempt) return;
      setBlueprintParseState("error");
      setBlueprintParseMessage(
        "The Blueprint could not be parsed as a supported PDF or DOCX. Enter the hypothesis manually."
      );
    }
  };

  return (
    <section className="ai-value-case-definition" aria-label="Value case definition">
      <header className="ai-value-case-definition-intro">
        <p className="eyebrow">Step 1 · Value case</p>
        <h2>What does the customer expect to change?</h2>
        <p>
          Write one plain-language hypothesis. We use it only to identify the
          function, business object, expected change, and metric intent for the next step.
          Do not include names, email addresses, phone numbers, or person-level details.
          After you continue, only an aggregate function/object/change summary is kept
          for this browser tab; the original free text is not retained.
        </p>
      </header>

      <form
        className="ai-value-case-match"
        aria-label="Customer hypothesis setup"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canContinue) return;
          onChange({
            hypothesis: canonicalizeSetupHypothesis(hypothesis),
            workflowId: "",
            metricIds: [],
            source: isBlueprintDraft ? "blueprint" : "manual"
          });
          navigate("/ai-value-workspace/workflow");
        }}
      >
        <div className="ai-value-case-hypothesis-pathways">
          <label className="ai-value-case-hypothesis-field">
            <span>Customer hypothesis</span>
            <textarea
              value={hypothesis}
              placeholder="Example: Faster verified knowledge retrieval for IT incidents will reduce mean time to resolution."
              rows={4}
              onChange={(event) => {
                parseAttemptRef.current += 1;
                const nextHypothesis = event.target.value;
                const remainsImported =
                  Boolean(importedHypothesisRef.current) &&
                  nextHypothesis.trim().normalize("NFKC") ===
                    importedHypothesisRef.current.normalize("NFKC");
                setHypothesis(nextHypothesis);
                if (remainsImported) {
                  setIsBlueprintDraft(true);
                  setBlueprintHasMaterialEdits(false);
                  setBlueprintNeedsConfirmation(true);
                  setBlueprintParseState("ready");
                  setBlueprintParseMessage(
                    "Imported draft edited. Confirm the revised hypothesis before continuing."
                  );
                } else if (importedHypothesisRef.current) {
                  setIsBlueprintDraft(true);
                  setBlueprintHasMaterialEdits(true);
                  setBlueprintNeedsConfirmation(true);
                  setBlueprintParseState("ready");
                  setBlueprintParseMessage(
                    "Imported draft materially changed. Switch to manual entry before continuing."
                  );
                } else {
                  setIsBlueprintDraft(false);
                  setBlueprintHasMaterialEdits(false);
                  setBlueprintNeedsConfirmation(false);
                  setBlueprintParseState("idle");
                  setBlueprintParseMessage("");
                }
              }}
            />
          </label>

          <div className="ai-value-case-pathway-divider" aria-hidden="true"><span>or</span></div>

          <section className="ai-value-blueprint-import" aria-label="Blueprint document import">
            <div>
              <strong>Import a Blueprint document</strong>
              <p>
                Choose a PDF or DOCX from existing Sales Blueprinting work. This wireframe
                requires Blueprint status: Approved or Current, then reads exact Customer hypothesis,
                Value hypothesis, Future state, Target outcome, or Function sections with supported
                IT or Customer Success workflow language.
              </p>
            </div>
            <label className="ai-value-blueprint-file-action">
              <span>{blueprintParseState === "parsing" ? "Parsing Blueprint…" : "Choose Blueprint file"}</span>
              <input
                type="file"
                accept=".pdf,.docx"
                aria-describedby="blueprint-import-privacy"
                disabled={blueprintParseState === "parsing"}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.currentTarget.value = "";
                  if (file) void parseBlueprint(file);
                }}
              />
            </label>
            <p id="blueprint-import-privacy" className="ai-value-blueprint-import-privacy">
              Parsed in this browser. Raw document text and the filename are not saved; only the aggregate summary is retained after you continue.
            </p>
            {blueprintParseMessage && (
              <p
                className={`ai-value-blueprint-import-status ${blueprintParseState}`}
                role={blueprintParseState === "error" ? "alert" : "status"}
                aria-live="polite"
              >
                {blueprintParseMessage}
              </p>
            )}
            {blueprintParseState === "ready" && blueprintNeedsConfirmation && !blueprintHasMaterialEdits && (
              <button
                className="ai-value-blueprint-confirm-action"
                type="button"
                onClick={() => {
                  importedHypothesisRef.current = hypothesis.trim();
                  setBlueprintHasMaterialEdits(false);
                  setBlueprintNeedsConfirmation(false);
                  setBlueprintParseMessage("Parsed hypothesis confirmed for workflow matching.");
                }}
              >
                Confirm parsed hypothesis
              </button>
            )}
            {blueprintParseState === "ready" && blueprintHasMaterialEdits && (
              <button
                className="ai-value-blueprint-manual-action"
                type="button"
                onClick={() => {
                  importedHypothesisRef.current = "";
                  setIsBlueprintDraft(false);
                  setBlueprintHasMaterialEdits(false);
                  setBlueprintNeedsConfirmation(false);
                  setBlueprintParseState("idle");
                  setBlueprintParseMessage("");
                }}
              >
                Use as manual hypothesis
              </button>
            )}
          </section>
        </div>

        {containsDirectIdentifier ? (
          <section className="ai-value-case-no-match" role="alert">
            <p className="eyebrow">Remove person-level details</p>
            <h3>Keep the hypothesis aggregate</h3>
            <p>Use a function, workflow, and customer-owned outcome without names or contact information.</p>
          </section>
        ) : hasValidHypothesis ? (
          <section className="ai-value-case-elements" aria-label="Hypothesis elements">
            <div><span>Function</span><strong>{result.elements.function}</strong></div>
            <div><span>Business object</span><strong>{result.elements.businessObject}</strong></div>
            <div><span>Expected change</span><strong>{result.elements.expectedChange}</strong></div>
            <div><span>Metric intent</span><strong>{result.elements.metricIntent}</strong></div>
          </section>
        ) : (
          <section className="ai-value-case-no-match" role="status">
            <p className="eyebrow">More detail needed</p>
            <h3>Name the function, business object, and expected change or metric</h3>
            <p>Nothing is inferred from a generic AI goal.</p>
          </section>
        )}

        <button
          className="ai-value-home-primary-action ai-value-case-confirm-action"
          type="submit"
          disabled={!canContinue}
        >
          Continue to workflow
        </button>
      </form>
    </section>
  );
};

const WorkflowSetupPage = ({
  draft,
  onChange
}: {
  draft: ValueSetupDraft;
  onChange: (draft: ValueSetupDraft) => void;
}) => {
  const navigate = useNavigate();
  const result = valueSetupMatch(draft);
  const availableIds = result.candidates.map((candidate) => candidate.id);
  const initialWorkflowId = availableIds.includes(draft.workflowId)
    ? draft.workflowId
    : result.candidates[0]?.id ?? "";
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(initialWorkflowId);
  const selectedCandidate = result.candidates.find((candidate) => candidate.id === selectedWorkflowId);

  if (!draft.hypothesis || result.candidates.length === 0) {
    return (
      <ValueSetupGate
        title="Define the value case first"
        detail="A workflow suggestion needs a specific customer hypothesis."
        path="/ai-value-workspace/value-case"
        action="Go to Value Case"
      />
    );
  }

  return (
    <section className="ai-value-case-definition" aria-label="Workflow setup">
      <header className="ai-value-case-definition-intro">
        <p className="eyebrow">Step 2 · Workflow</p>
        <h2>Which recurring work should change?</h2>
        <p className="ai-value-setup-thread"><strong>Hypothesis:</strong> {draft.hypothesis}</p>
      </header>
      <form
        className="ai-value-case-match"
        aria-label="Workflow confirmation"
        onSubmit={(event) => {
          event.preventDefault();
          if (!selectedCandidate) return;
          onChange({ ...draft, workflowId: selectedCandidate.id, metricIds: [] });
          navigate("/ai-value-workspace/metrics");
        }}
      >
        <fieldset className="ai-value-case-workflows">
          <legend>Choose one workflow</legend>
          <p>Suggestions are deterministic and explain which hypothesis phrases matched.</p>
          {result.candidates.map((candidate, index) => (
            <label className={candidate.id === selectedWorkflowId ? "selected" : undefined} key={candidate.id}>
              <input
                type="radio"
                name="value-case-workflow"
                value={candidate.id}
                checked={candidate.id === selectedWorkflowId}
                onChange={() => setSelectedWorkflowId(candidate.id)}
              />
              <span>
                <small>{index === 0 ? "Primary suggestion" : "Supporting suggestion"}</small>
                <strong>{candidate.name}</strong>
                <span>{candidate.archetypes.join(" · ")}</span>
                <span>Matched: {candidate.matchedSignals.join(", ")}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {selectedCandidate && (
          <section className="ai-value-case-workflow-detail ai-value-workflow-setup-detail" aria-label="Selected workflow">
            <div>
              <p className="eyebrow">Workflow shape</p>
              <h3>{selectedCandidate.name}</h3>
              <ol>{selectedCandidate.steps.map((step) => <li key={step}>{step}</li>)}</ol>
            </div>
          </section>
        )}

        <button className="ai-value-home-primary-action ai-value-case-confirm-action" type="submit">
          Continue to metric
        </button>
      </form>
    </section>
  );
};

const MetricSetupPage = ({
  draft,
  onChange,
  journey
}: {
  draft: ValueSetupDraft;
  onChange: (draft: ValueSetupDraft) => void;
  journey: Journey;
}) => {
  const navigate = useNavigate();
  const result = valueSetupMatch(draft);
  const selectedCandidate = result.candidates.find((candidate) => candidate.id === draft.workflowId);
  const availableMetricIds = selectedCandidate?.metrics.map((metric) => metric.id) ?? [];
  const initialMetricIds = draft.metricIds.filter((id) => availableMetricIds.includes(id));
  const [metricIds, setMetricIds] = useState<string[]>(
    initialMetricIds.length > 0 ? initialMetricIds : availableMetricIds.slice(0, 1)
  );

  if (!selectedCandidate) {
    return (
      <section className="ai-value-case-definition" aria-label="Guided metric setup">
        <ValueSetupGate
          title="Confirm the workflow first"
          detail="Metrics are suggested only after the hypothesis is attached to one workflow."
          path="/ai-value-workspace/workflow"
          action="Go to Workflow"
        />
      </section>
    );
  }

  return (
    <section className="ai-value-case-definition" aria-label="Guided metric setup">
      <header className="ai-value-case-definition-intro">
        <p className="eyebrow">Step 3 · Metric</p>
        <h2>How will the customer know it changed?</h2>
        <p className="ai-value-setup-thread">
          <strong>Workflow:</strong> {selectedCandidate.name}
        </p>
      </header>
      <form
        className="ai-value-case-match"
        aria-label="Metric confirmation"
        onSubmit={(event) => {
          event.preventDefault();
          if (metricIds.length === 0) return;
          onChange({ ...draft, metricIds });
          navigate("/ai-value-workspace/readiness");
        }}
      >
        <fieldset className="ai-value-case-metrics ai-value-metric-setup-list">
          <legend>Choose customer-owned metrics</legend>
          {selectedCandidate.metrics.map((metric) => (
            <label key={metric.id}>
              <input
                type="checkbox"
                checked={metricIds.includes(metric.id)}
                onChange={() => setMetricIds((current) =>
                  current.includes(metric.id)
                    ? current.filter((id) => id !== metric.id)
                    : [...current, metric.id]
                )}
              />
              <span>
                <strong>{metric.name}</strong>
                <small>Suggested source: {metric.suggestedSourceCategories.join(" + ")}</small>
                <small>Owner to confirm: {metric.suggestedOwnerRole}</small>
              </span>
            </label>
          ))}
        </fieldset>

        <aside className="ai-value-case-evidence-boundary" aria-label="Metric ownership boundary">
          <strong>The customer owns the metric</strong>
          <p>Definition, unit, source identity, owner, baseline, and comparison window remain unconfirmed.</p>
        </aside>

        <button
          className="ai-value-home-primary-action ai-value-case-confirm-action"
          type="submit"
          disabled={metricIds.length === 0}
        >
          Continue to AI Fluency
        </button>
      </form>

      <details className="ai-value-advanced-workbench">
        <summary>Advanced metric review</summary>
        <MetricsPage journey={journey} />
      </details>
    </section>
  );
};

const assistantPromptsBySlug: Record<WorkspacePageSlug, string[]> = {
  home: [
    "What is the customer-approved hypothesis?",
    "Which expected pathways are still unapproved?",
    "What language is safe at this stage?"
  ],
  "value-case": [
    "Is the hypothesis specific enough?",
    "What does the customer expect to change?",
    "Which part still needs clarification?"
  ],
  workflow: [
    "Which workflow best matches the hypothesis?",
    "What are the recurring workflow steps?",
    "Why is this the primary suggestion?"
  ],
  readiness: [
    "Is instrument capture complete enough?",
    "What does the five-factor profile suggest?",
    "How should Value Realization read the translation signals?"
  ],
  sources: [
    "Which source lane is blocking progress?",
    "Why is this source held?",
    "What can be used in the next checkpoint?"
  ],
  progress: [
    "What changed across the approved windows?",
    "Which VBD signal is driving the movement?",
    "Is the customer-owned metric moving too?"
  ],
  metrics: [
    "Which metric best tests the hypothesis?",
    "Who owns this metric?",
    "What window should be reviewed next?"
  ],
  case: [
    "Is this checkpoint ready?",
    "What is blocked from the executive report?",
    "What changed across the timeline?"
  ],
  decisions: [
    "Draft the executive summary.",
    "What should the sponsor decide?",
    "What evidence stays internal?"
  ]
};

const WorkspaceAssistantPanel = ({
  activePageSlug,
  claimModeLabel,
  journey
}: {
  activePageSlug: WorkspacePageSlug;
  claimModeLabel: string;
  journey: Journey;
}) => {
  const activePage = workspacePageBySlug.get(activePageSlug) ?? workspacePages[0];
  const prompts = assistantPromptsBySlug[activePageSlug];
  const needsAttention = [
    journey.realEvidenceStatus.nextAction,
    journey.customerEvidenceReview.nextAction,
    claimModeLabel
  ].filter(Boolean);

  return (
    <aside className="ai-value-assistant-panel" aria-label="Evidence Assistant">
      <div className="ai-value-assistant-head">
        <p className="eyebrow">Evidence Assistant</p>
        <h2>{activePage.label}</h2>
        <p>
          Guided help for the current step, limited to reviewed aggregate context,
          source status, caveats, and approved customer inputs.
        </p>
      </div>

      <section className="ai-value-assistant-block" aria-label="What needs attention">
        <h3>What needs attention</h3>
        <ul>
          {needsAttention.slice(0, 3).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="ai-value-assistant-block" aria-label="Ask about this step">
        <h3>Ask about this step</h3>
        <div className="ai-value-assistant-prompts">
          {prompts.map((prompt) => (
            <button type="button" key={prompt}>{prompt}</button>
          ))}
        </div>
      </section>

      <section className="ai-value-assistant-block ai-value-assistant-boundary" aria-label="Assistant boundary">
        <h3>Safe posture</h3>
        <p>
          The assistant can explain readiness, blockers, evidence maturity, and report
          language. It cannot turn held evidence into proof or create unsupported
          economic, causal, workforce-measurement, certainty, or scoring claims.
        </p>
      </section>
    </aside>
  );
};

const CustomerDataModelProjectionPanel = () => {
  const [projectionResponse, setProjectionResponse] =
    useState<CustomerDataModelProjectionResponse | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "held">("loading");
  const measurementPlanId = customerProjectionMeasurementPlanId();

  useEffect(() => {
    let active = true;
    setLoadState("loading");
    fetchCustomerDataModelProjections(customerProjectionRole(), measurementPlanId)
      .then((response) => {
        if (!active) return;
        setProjectionResponse(response);
        setLoadState(hasCustomerProjectionRows(response) ? "ready" : "held");
      })
      .catch(() => {
        if (!active) return;
        setProjectionResponse(null);
        setLoadState("held");
      });
    return () => {
      active = false;
    };
  }, [measurementPlanId]);

  const projections = projectionResponse?.projections ?? [];
  const primaryProjection = projections[0] ?? null;
  const ready = loadState === "ready" && projections.length > 0;
  const blockedOutputs =
    visibleBlockedCustomerProjectionOutputs(primaryProjection);

  return (
    <section
      className="ai-value-customer-projection-panel"
      aria-label="Customer evidence projection"
      aria-live="polite"
    >
      <div className="ai-value-section-head">
        <div>
          <p className="eyebrow">Source-bound projection</p>
          <h3>Customer evidence projection</h3>
          <p>
            Compact evidence status over governed customer data model
            snapshots. Live connector work stays out of this surface.
          </p>
        </div>
        <StatusPill
          label={ready ? "Source-bound status" : "Held until snapshot exists"}
          tone={ready ? "good" : "warn"}
        />
      </div>

      {ready ? (
        <>
          <div className="ai-value-customer-projection-list">
            {projections.map((projection, index) => (
              <div
                className="ai-value-customer-projection-grid"
                key={`${projection.metric.label}-${projection.workflow_context.function_area}-${projection.milestone.day}-${index}`}
              >
                <article>
                  <span className="ai-value-map-label">Metric</span>
                  <strong>{projection.metric.label}</strong>
                  <p>
                    {projection.metric.direction} / {projection.metric.unit}
                  </p>
                </article>
                <article>
                  <span className="ai-value-map-label">Function</span>
                  <strong>{projection.workflow_context.function_area}</strong>
                  <p>{projection.workflow_context.workflow_label}</p>
                </article>
                <article>
                  <span className="ai-value-map-label">Milestone</span>
                  <strong>Day {projection.milestone.day}</strong>
                  <p>{customerProjectionWindowLabel(projection.milestone.comparison_window)}</p>
                </article>
                <article>
                  <span className="ai-value-map-label">Source review</span>
                  <strong>{projection.evidence_status.aggregate_review_state}</strong>
                  <p>{projection.evidence_status.validation_state}</p>
                </article>
              </div>
            ))}
          </div>

          <div className="ai-value-customer-projection-boundary">
            <article>
              <h4>Required caveat</h4>
              <p>{primaryProjection?.caveats[0] ?? "Aggregate evidence status only."}</p>
            </article>
            <article>
              <h4>Blocked output</h4>
              <div className="ai-value-token-pilot-chip-list ai-value-token-pilot-chip-list-blocked">
                {(blockedOutputs.length > 0 ? blockedOutputs : ["Live connector output"]).map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </article>
          </div>
        </>
      ) : (
        <div className="ai-value-customer-projection-held">
          <strong>No governed customer projection available</strong>
          <p>
            Missing: a compact, source-bound customer data model snapshot for
            this measurement route. Why: this panel can support planning only
            when governed aggregate snapshots are available and source-bound.
            Next action: create the governed customer projection in the
            previous stage, then return here to review aggregate evidence
            status.
          </p>
        </div>
      )}
    </section>
  );
};

const VbdFrameworkPanel = () => (
  <section
    className="ai-value-panel ai-fluency-framework-panel"
    aria-label="Organizational AI Fluency framework"
  >
    <p className="eyebrow">AI Fluency 2x2</p>
    <h3>Organizational AI Fluency</h3>
    <div className="ai-fluency-framework-wrap">
      <div className="ai-fluency-framework-y-axis">
        <span className="ai-fluency-framework-axis-high">High</span>
        <div>
          <strong>Velocity</strong>
          <p>How fast the organization picks up AI-enabled work.</p>
        </div>
        <span className="ai-fluency-framework-axis-low">Low</span>
      </div>

      <div className="ai-fluency-framework-main">
        <div className="ai-fluency-framework-grid" aria-label="AI Fluency quadrant framework">
          {aiFluencyFrameworkQuadrants.map((quadrant) => (
            <article
              className={`ai-fluency-framework-quadrant ai-fluency-framework-quadrant-${quadrant.tone}`}
              key={quadrant.id}
            >
              <span className="ai-fluency-framework-icon" aria-hidden="true">
                {quadrant.badge}
              </span>
              <div>
                <strong>{quadrant.label}</strong>
                <p>{quadrant.definition}</p>
                <span>Watch for</span>
                <ul>
                  {quadrant.watchFor.map((cue) => (
                    <li key={cue}>{cue}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>

        <div className="ai-fluency-framework-x-axis">
          <span>Low</span>
          <div>
            <strong>Depth</strong>
            <p>How deeply AI is embedded in real work.</p>
          </div>
          <span>High</span>
        </div>
      </div>
    </div>

    <div className="ai-fluency-framework-note">
      <span className="ai-fluency-framework-shield" aria-hidden="true">OK</span>
      <div>
        <strong>Signals, not scores. Organizational, not individual.</strong>
        <p>
          These are behavioral operating modes, not maturity labels. Use them to inspect
          workflow design, trust calibration, and governance exposure.
        </p>
      </div>
    </div>
  </section>
);

const VbdMapPanel = () => {
  const [tokenOverlayMode, setTokenOverlayMode] = useState<VbdTokenOverlayMode>("vbd");
  const [tokenWindow, setTokenWindow] = useState<VbdTokenWindowKey>("1m");
  const isVbdWithToken = tokenOverlayMode === "vbd-token";
  const tokenWindowOption = selectedTokenWindowOption(tokenWindow);
  const vbdFunctionRows = useMemo(() => buildVbdFunctionRows(tokenWindow), [tokenWindow]);
  const quadrantRows = useMemo(() => buildQuadrantRows(vbdFunctionRows), [vbdFunctionRows]);
  const primaryReviewQuadrant =
    quadrantRows.find((quadrant) => quadrant.id === "fast-shallow") ?? quadrantRows[0];
  const tokenResult = isVbdWithToken ? (
    <section className="ai-value-vbd-token-result" aria-label="Aggregate token result box">
      <h4>Token usage by quadrant</h4>
      <div className="ai-value-vbd-token-quadrants">
        {quadrantRows.map((quadrant) => (
          <article
            className={`ai-value-vbd-token-card ai-value-vbd-token-card-${quadrant.tokenTone}`}
            key={quadrant.id}
          >
            <strong>{quadrant.label}</strong>
            <span>{quadrant.tokenBand} aggregate token intensity</span>
            <p>{quadrant.functions.length} functions in quadrant</p>
          </article>
        ))}
      </div>
      <div className="ai-value-vbd-token-functions">
        <h4>Token usage by function</h4>
        <div>
          {vbdFunctionRows.map((plot) => (
            <article
              className={`ai-value-vbd-token-function-row ai-value-vbd-token-function-row-${plot.tokenTone}`}
              key={plot.functionArea}
            >
              <strong>{plot.functionArea}</strong>
              <p>{plot.tokenBand} token intensity</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  ) : null;

  return (
    <section className="ai-value-panel ai-value-vbd-panel" aria-label="Velocity Breadth Depth map">
      <div className="ai-value-section-head">
        <div>
          <p className="eyebrow">Behavior evidence / VBD</p>
          <h3>Function behavior map</h3>
          <p>
            Each function lands on the map from Velocity and Integration. Use
            the cluster position to choose where to scale, coach, or redesign
            next.
          </p>
        </div>
        <StatusPill label="Aggregate signals" tone="good" />
      </div>

      <section className="ai-value-vbd-bridge" aria-label="VBD model bridge">
        <div>
          <span className="ai-value-map-label">Product label</span>
          <strong>Behavior Evidence</strong>
          <p>What the customer sees: how work behavior is changing across approved aggregate windows.</p>
        </div>
        <div>
          <span className="ai-value-map-label">Operator model</span>
          <strong>Velocity, Breadth, Depth</strong>
          <p>What powers the view: uptake speed, surface spread, and depth of workflow integration.</p>
        </div>
        <div>
          <span className="ai-value-map-label">Boundary</span>
          <strong>Context, not proof</strong>
          <p>VBD supports workflow interpretation; customer-owned metrics test the hypothesis.</p>
        </div>
      </section>

      {!isVbdWithToken && (
        <section className="ai-value-vbd-score-summary" aria-label="Aggregate VBD posture model">
          <article>
            <span>Overall VBD posture</span>
            <strong>Aggregate review lens</strong>
            <p>Velocity, Breadth, and Depth are combined for posture review only.</p>
          </article>
          <article>
            <span>Integration posture</span>
            <strong>Breadth and Depth</strong>
            <p>Integration remains aggregate context, not a people or team measure.</p>
          </article>
          <article>
            <span>Fixed quadrant line 60</span>
            <strong>Compiled posture boundary</strong>
            <p>Quadrants use Velocity and Integration; this is not a configurable control.</p>
          </article>
        </section>
      )}

      <section className="ai-value-vbd-token-overlay" aria-label="VBD scenario controls">
        <div className="ai-value-vbd-token-overlay-head">
          <div>
            <p className="eyebrow">Strategy context only</p>
            <h4>VBD scenario controls</h4>
            <p>
              Simulated aggregate context for workflow review. Month controls
              switch between example aggregate snapshots using Velocity,
              Breadth, Depth, and Integration. VBD + Token adds a token
              intensity overlay for scenario planning only; it is not ROI,
              productivity, causality, people attribution, financial output,
              savings, or efficiency proof.
            </p>
          </div>
          <div className="ai-value-vbd-token-controls" aria-label="Token overlay controls">
            <div className="ai-value-vbd-token-control-group" aria-label="Token overlay mode">
              <button
                aria-pressed={tokenOverlayMode === "vbd"}
                onClick={() => setTokenOverlayMode("vbd")}
                type="button"
              >
                VBD
              </button>
              <button
                aria-pressed={tokenOverlayMode === "vbd-token"}
                onClick={() => setTokenOverlayMode("vbd-token")}
                type="button"
              >
                VBD + Token
              </button>
            </div>
            <div className="ai-value-vbd-token-control-group" aria-label="Token overlay window">
              {vbdTokenWindowOptions.map((option) => (
                <button
                  aria-pressed={tokenWindow === option.key}
                  key={option.key}
                  onClick={() => setTokenWindow(option.key)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="ai-value-vbd-token-overlay-summary">
          <span>Window: {tokenWindowOption.interpretationLabel}</span>
          <span>
            VBD review lens: {primaryReviewQuadrant.label}
          </span>
          <span>
            {isVbdWithToken ? `${primaryReviewQuadrant.tokenBand} token context` : "Token context off"}
          </span>
        </div>
      </section>

      <div className="ai-value-vbd-layout">
        <div className="ai-value-vbd-y-axis">
          <span className="ai-value-vbd-axis-high">High</span>
          <strong className="ai-value-vbd-axis-title">Integration</strong>
          <span className="ai-value-vbd-axis-low">Low</span>
        </div>
        <div className="ai-value-vbd-map-shell">
          <div className="ai-value-vbd-quadrant-guide ai-value-vbd-quadrant-guide-top" aria-label="High integration quadrant guide">
            {quadrantRows
              .filter((quadrant) => quadrant.id === "deep-slow" || quadrant.id === "flow")
              .map((quadrant) => (
                <article
                  className={`ai-value-vbd-quadrant-guide-card ai-value-vbd-quadrant-guide-card-${quadrant.tone}`}
                  key={quadrant.id}
                >
                  <strong>{quadrant.label}</strong>
                  <span>{formatVbdQuadrantPosition(quadrant.position)}</span>
                </article>
              ))}
          </div>
          <div className="ai-value-vbd-plot-shell">
            <div className="ai-value-vbd-grid" aria-label="VBD quadrant map">
              {quadrantRows.map((quadrant) => {
                return (
                  <article
                    aria-hidden="true"
                    className={`ai-value-vbd-quadrant ai-value-vbd-quadrant-${quadrant.tone} ai-value-vbd-quadrant-${quadrant.id}`}
                    key={quadrant.id}
                  />
                );
              })}
            </div>
            <div className="ai-value-vbd-marker-layer" aria-label="Function positions">
              {vbdFunctionRows.map((plot) => {
                const quadrant = vbdQuadrants.find((entry) => entry.id === plot.quadrantId);
                return (
                <span
                  aria-label={`${plot.functionArea}: Velocity ${postureBandForCoordinate(plot.velocity)}, Breadth ${postureBandForCoordinate(plot.breadth)}, Depth ${postureBandForCoordinate(plot.depth)}, Integration ${postureBandForCoordinate(plot.integrationScore)}, ${quadrant?.label ?? "VBD quadrant"}${
                    isVbdWithToken
                      ? `, aggregate token intensity ${plot.tokenBand}`
                      : ", aggregate posture review"
                  }`}
                  className={`ai-value-vbd-function-bubble ai-value-vbd-function-bubble-${plot.quadrantId}${
                    isVbdWithToken ? " ai-value-vbd-function-bubble-token-overlay" : ""
                  }`}
                  key={plot.functionArea}
                  style={vbdBubbleStyle(plot)}
                  title={`${plot.functionArea}: Velocity ${postureBandForCoordinate(plot.velocity)}, Breadth ${postureBandForCoordinate(plot.breadth)}, Depth ${postureBandForCoordinate(plot.depth)}, Integration ${postureBandForCoordinate(plot.integrationScore)}${
                    isVbdWithToken
                      ? `, aggregate token intensity ${plot.tokenBand}`
                      : ", aggregate posture review"
                  }`}
                >
                  <span>{plot.shortLabel}</span>
                </span>
                );
              })}
            </div>
          </div>
          <div className="ai-value-vbd-quadrant-guide ai-value-vbd-quadrant-guide-bottom" aria-label="Low integration quadrant guide">
            {quadrantRows
              .filter((quadrant) => quadrant.id === "low-integration" || quadrant.id === "fast-shallow")
              .map((quadrant) => (
                <article
                  className={`ai-value-vbd-quadrant-guide-card ai-value-vbd-quadrant-guide-card-${quadrant.tone}`}
                  key={quadrant.id}
                >
                  <strong>{quadrant.label}</strong>
                  <span>{formatVbdQuadrantPosition(quadrant.position)}</span>
                </article>
              ))}
          </div>
        </div>
      </div>

      <div className="ai-value-vbd-footer">
        <strong>Velocity</strong>
        <span>Low</span>
        <span>High</span>
        <p>
          {isVbdWithToken
            ? "X-axis is Velocity. Y-axis is Integration. Bubble size remains anchored to the VBD model."
            : "X-axis is Velocity. Y-axis is Integration. Bubble size shows aggregate posture context."}
        </p>
      </div>

      {tokenResult}

      <div className="ai-value-vbd-definition-legend" aria-label="Quadrant definitions">
        <h4>Quadrant definitions</h4>
        <div>
          {vbdQuadrants.map((quadrant) => {
            const quadrantRow = quadrantRows.find((row) => row.id === quadrant.id);
            const functions = quadrantRow?.functions ?? [];
            return (
              <article
                className={`ai-value-vbd-definition-card ai-value-vbd-definition-card-${quadrant.tone}`}
                key={quadrant.id}
              >
                <strong>{quadrant.label}</strong>
                <p>{quadrant.definition}</p>
                <span>{quadrant.mapCue}</span>
                {!isVbdWithToken && quadrantRow && (
                  <span className="ai-value-vbd-definition-score">
                    Quadrant posture {postureBandForCoordinate(quadrantRow.quadrantStrength)} · Function share{" "}
                    {quadrantRow.quadrantShare}%
                  </span>
                )}
                <small>Watch for: {quadrant.watchFor.join(", ")}.</small>
                <em>{functions.map((plot) => plot.functionArea).join(", ")}</em>
              </article>
            );
          })}
        </div>
      </div>

      <p className="ai-value-vbd-surface-note">
        <strong>Measured AI surfaces:</strong> {vbdMeasuredSurfaces.join(", ")}.
        These inform breadth; customer-owned outcome data still owns the value
        test.
      </p>
    </section>
  );
};

const VbdTokenPilotReviewPanel = () => {
  const movement = (vbdTokenPilotRun.movement_summary ?? {}) as Record<string, any>;
  const motion = (vbdTokenPilotRun.recommended_next_motion ?? {}) as Record<string, any>;
  const allowedUses = displayPilotUses(vbdTokenPilotRun.allowed_uses, allowedPilotUseLabels);
  const blockedUses = displayPilotUses(vbdTokenPilotRun.blocked_uses, blockedPilotUseLabels);
  const visibleAllowedUses = prioritizedPilotUses(
    allowedUses,
    [
      "Aggregate strategy planning",
      "Workflow design review",
      "Model routing review",
      "Cost exposure review"
    ],
    4
  );
  const visibleBlockedUses = prioritizedPilotUses(
    blockedUses,
    [
      "Blocked: economic proof",
      "Blocked: causal proof",
      "Blocked: productivity proof",
      "Blocked: people-level attribution"
    ],
    4
  );
  const decisionLabel = labelFromToken(vbdTokenPilotRun.pilot_decision, pilotDecisionLabels);
  const motionLabel = labelFromToken(motion.motion, pilotMotionLabels);

  return (
    <section
      className="ai-value-panel ai-value-token-pilot-panel"
      aria-label="VBD token pilot movement review"
    >
      <div className="ai-value-section-head">
        <div>
          <p className="eyebrow">Pilot Movement Review</p>
          <h3>VBD and token movement</h3>
          <p>
            Use the validated rehearsal to inspect aggregate work-integration
            movement and token intensity together. Keep the report inside the
            pilot rehearsal boundary; it is not value proof.
          </p>
        </div>
        <StatusPill label="Strategy context" tone="good" />
      </div>

      <div className="ai-value-token-pilot-summary" aria-label="Pilot movement summary">
        <article>
          <span className="ai-value-map-label">Workflow</span>
          <strong>{String(vbdTokenPilotRun.workflow_name ?? "Workflow not selected")}</strong>
          <p>{String(vbdTokenPilotRun.pilot_scope?.population_label ?? "Aggregate pilot rehearsal")}</p>
        </article>
        <article>
          <span className="ai-value-map-label">Review decision</span>
          <strong>{decisionLabel}</strong>
          <p>Function-level aggregate grain with minimum cohort protection.</p>
        </article>
        <article>
          <span className="ai-value-map-label">Recommended motion</span>
          <strong>{motionLabel}</strong>
          <p>{String(motion.rationale ?? "Review the aggregate workflow pattern before expanding.")}</p>
        </article>
      </div>

      <div className="ai-value-token-pilot-motion" aria-label="Baseline to comparison movement">
        <PilotWindowCard label="Baseline window" window={vbdTokenPilotBaseline} />
        <div className="ai-value-token-pilot-arrow" aria-hidden="true">
          <span />
          <strong>moves to</strong>
          <span />
        </div>
        <PilotWindowCard label="Comparison window" window={vbdTokenPilotComparison} />
      </div>

      <div className="ai-value-token-pilot-metrics" aria-label="Token movement metrics">
        <article>
          <span className="ai-value-map-label">Total tokens</span>
          <strong>{percentMovementLabel(movement.total_tokens_change_pct)}</strong>
        </article>
        <article>
          <span className="ai-value-map-label">Tokens per workflow</span>
          <strong>{percentMovementLabel(movement.average_tokens_per_workflow_change_pct)}</strong>
        </article>
        <article>
          <span className="ai-value-map-label">High-intensity workflow share</span>
          <strong>{pointMovementLabel(movement.high_intensity_workflow_share_change)}</strong>
        </article>
      </div>

      <div className="ai-value-token-pilot-boundary">
        <article aria-label="Allowed planning uses">
          <h4>Allowed planning uses</h4>
          <div className="ai-value-token-pilot-chip-list">
            {visibleAllowedUses.map((use) => (
              <span key={use}>{use}</span>
            ))}
          </div>
        </article>
        <article aria-label="Blocked outputs">
          <h4>Blocked outputs</h4>
          <div className="ai-value-token-pilot-chip-list ai-value-token-pilot-chip-list-blocked">
            {visibleBlockedUses.map((use) => (
              <span key={use}>{use}</span>
            ))}
          </div>
        </article>
      </div>

      <p className="ai-value-token-pilot-caveat">
        <strong>Boundary:</strong> This panel reads the validated synthetic
        rehearsal as aggregate strategy context only. Customer-owned outcome
        evidence, governance review, and approved assumptions are still required
        before stronger value language.
      </p>
    </section>
  );
};

const PilotWindowCard = ({
  label,
  window
}: {
  label: string;
  window: Record<string, any>;
}) => (
  <article className="ai-value-token-pilot-window">
    <span className="ai-value-map-label">{label}</span>
    <strong>{String(window.window_label ?? label)}</strong>
    <p>{dateRangeLabel(window)}</p>
    <div>
      <span>{labelFromToken(window.vbd_posture, vbdPostureLabels)}</span>
      <span>{labelFromToken(window.token_posture, tokenPostureLabels)}</span>
      <span>{labelFromToken(window.strategy_zone, strategyZoneLabels)}</span>
    </div>
  </article>
);

const ConnectedSetupSummary = ({ draft }: { draft: ValueSetupDraft }) => {
  const result = valueSetupMatch(draft);
  const workflow = result.candidates.find((candidate) => candidate.id === draft.workflowId);
  const metrics = workflow?.metrics.filter((metric) => draft.metricIds.includes(metric.id)) ?? [];
  const complete = Boolean(draft.hypothesis && workflow && metrics.length > 0);

  return (
    <section className="ai-value-connected-setup" aria-label="Connected value setup">
      <div>
        <p className="eyebrow">{complete ? "Draft thread connected" : "Setup not connected"}</p>
        <h3>{complete ? "Hypothesis, workflow, and draft metric" : "Finish setup to bind this evidence"}</h3>
      </div>
      <dl>
        <div><dt>Hypothesis</dt><dd>{draft.hypothesis || "Not defined"}</dd></div>
        <div><dt>Workflow</dt><dd>{workflow?.name ?? "Not selected"}</dd></div>
        <div><dt>Draft metric</dt><dd>{metrics.map((metric) => metric.name).join(", ") || "Not selected"}</dd></div>
      </dl>
      {!complete && (
        <Link className="ai-value-home-secondary-action" to="/ai-value-workspace/value-case">
          Complete setup
        </Link>
      )}
    </section>
  );
};

const ProgressPage = ({ draft }: { draft: ValueSetupDraft }) => (
  <section className="ai-value-focused-stack" aria-label="Progress over time workspace">
    <ConnectedSetupSummary draft={draft} />
    <section className="ai-value-panel ai-value-progress-intro" aria-label="Progress interpretation">
      <p className="eyebrow">Step 6 · Progress</p>
      <h3>What is changing over time?</h3>
      <p>Review approved VBD movement and the selected customer metric in the same window. Neither is available yet.</p>
      <section className="ai-value-checkpoint-grid" aria-label="Progress evidence status">
        <article><span className="ai-value-map-label">VBD movement</span><strong>Held for approved windows</strong><p>No source-bound movement has been admitted.</p></article>
        <article><span className="ai-value-map-label">Customer metric movement</span><strong>Held for baseline and comparison</strong><p>The selected metric remains a draft until its owner and values are confirmed.</p></article>
      </section>
    </section>
    <details className="ai-value-advanced-workbench">
      <summary>Explore illustrative VBD sandbox</summary>
      <div className="ai-value-progress-sandbox-boundary">Illustrative simulation only — not current evidence or approved movement.</div>
      <VbdMapPanel />
    </details>
  </section>
);

const GuidedDecisionPage = ({
  mode,
  liveReport
}: {
  mode: ReturnType<typeof useAiValueWorkspace>["mode"];
  liveReport: RequestBoundLiveReport | null;
}) => (
  <section className="ai-value-focused-stack" aria-label="Guided decision workspace">
    <section className="ai-value-panel" aria-label="Decision status">
      <p className="eyebrow">Step 7 · Decision</p>
      <h3>Decision held until evidence is reviewed</h3>
      <p>The value case is connected, but source approval, VBD movement, and customer metric movement are still missing.</p>
      <StatusPill label="Hold" tone="warn" />
      <p className="ai-value-decision-prototype-link">
        Need a visual example? Open the separate illustrative readout. It is not bound to this value case.
      </p>
      <Link className="ai-value-home-secondary-action" to="/ai-value-readout">
        Open illustrative readout
      </Link>
    </section>
    {mode !== "example" && (
      <ExecutiveReportPackagePanel mode={mode} liveReport={liveReport} />
    )}
  </section>
);

const ReadinessPage = ({
  draft,
  organizationId
}: {
  draft: ValueSetupDraft;
  organizationId: string;
}) => {
  const [activeView, setActiveView] = useState<AiFluencyEvidenceViewKey>("capture");
  const [importState, setImportState] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [importedData, setImportedData] = useState<AiFluencyImportFixture | null>(null);
  const resultsRef = useRef<HTMLElement | null>(null);
  const mountedRef = useRef(true);
  const importReady = canImportAiFluencyMeasurement(externalAiFluencyMeasurement.collectionStatus);
  const activeViewDefinition =
    aiFluencyEvidenceViews.find((view) => view.key === activeView) ??
    aiFluencyEvidenceViews[0];

  const loadIllustrativeImport = async (restore = false) => {
    if (!importReady || importState === "loading") return;
    const receiptKey = aiFluencyImportReceiptKey(organizationId);
    if (!organizationId || !receiptKey) {
      setImportedData(null);
      setImportState("idle");
      return;
    }
    const valueCaseBinding = aiFluencyValueCaseBinding(draft);
    const storedReceipt = sessionStorage.getItem(receiptKey);
    setImportState("loading");
    try {
      const { createAiFluencyImportFixture } = await import("../lib/aiFluencyImportFixture");
      const fixture = createAiFluencyImportFixture(organizationId, valueCaseBinding);
      const { receipt, ...payload } = fixture;
      const expectedReceipt = serializeAiFluencyImportReceipt(fixture);
      if (
        receipt.organizationId !== organizationId ||
        receipt.valueCaseBinding !== valueCaseBinding ||
        receipt.sourceId !== externalAiFluencyMeasurement.sourceId ||
        receipt.reportVersion !== externalAiFluencyMeasurement.reportVersion ||
        receipt.payloadChecksum !== checksumAiFluencyPayload(payload) ||
        receipt.collectionStatus !== "complete" ||
        !receipt.collectionClosed ||
        !receipt.aggregateOnly ||
        (restore && storedReceipt !== expectedReceipt)
      ) {
        throw new Error("Import fixture identity mismatch");
      }
      if (!mountedRef.current || currentOrganizationId() !== organizationId) {
        if (mountedRef.current) setImportState("idle");
        return;
      }
      setImportedData(fixture);
      setImportState("loaded");
      if (!restore) sessionStorage.setItem(receiptKey, expectedReceipt);
    } catch {
      if (mountedRef.current) {
        setImportedData(null);
        setImportState("error");
      }
      sessionStorage.removeItem(receiptKey);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setImportedData(null);
    setImportState("idle");
    const receiptKey = aiFluencyImportReceiptKey(organizationId);
    if (receiptKey && sessionStorage.getItem(receiptKey)) {
      void loadIllustrativeImport(true);
    }
  }, [organizationId]);

  useEffect(() => {
    if (importState === "loaded") resultsRef.current?.focus();
  }, [importState]);

  useEffect(() => {
    const importedOrganizationId = importedData?.receipt.organizationId;
    const invalidateForOrganizationChange = () => {
      if (importedOrganizationId && currentOrganizationId() !== importedOrganizationId) {
        setImportedData(null);
        setImportState("idle");
      }
    };
    window.addEventListener("storage", invalidateForOrganizationChange);
    window.addEventListener("focus", invalidateForOrganizationChange);
    return () => {
      window.removeEventListener("storage", invalidateForOrganizationChange);
      window.removeEventListener("focus", invalidateForOrganizationChange);
    };
  }, [importedData]);

  return (
    <section className="ai-value-focused-stack" aria-label="AI Fluency workspace">
      <ConnectedSetupSummary draft={draft} />
      <section className="ai-value-panel ai-fluency-import-panel" aria-label="AI Fluency import">
        <div>
          <p className="eyebrow">Step 4 · External measurement</p>
          <h3>Simulate import only after collection is complete</h3>
          <p>
            The assessment runs outside FluencyTracr. This wireframe demonstrates
            the import gate with a separate illustrative fixture; it does not query an external system.
          </p>
        </div>
        <dl>
          <div><dt>Experience</dt><dd>{externalAiFluencyMeasurement.experience}</dd></div>
          <div><dt>Collection</dt><dd>{externalAiFluencyMeasurement.collectionLabel}</dd></div>
          <div><dt>Import source</dt><dd>{externalAiFluencyMeasurement.importSource}</dd></div>
        </dl>
        <StatusPill label="Simulation only" tone="neutral" />
        <button
          className="ai-value-home-primary-action"
          type="button"
          disabled={!importReady || importState === "loading" || importState === "loaded"}
          onClick={() => void loadIllustrativeImport()}
        >
          {importState === "loading"
            ? "Loading completed results…"
            : importState === "loaded"
              ? "Illustrative results loaded"
              : "Import AI Fluency results"}
        </button>
        <p role="status" aria-live="polite">
          {importState === "loaded"
            ? "Illustrative completed results loaded. No backend import occurred."
            : importState === "loading"
              ? "Loading the separate illustrative result fixture."
              : importState === "error"
              ? "The illustrative results could not be loaded. Nothing was imported."
              : !importReady
                ? "Import remains disabled while collection is open or held."
                : "The illustrative completed fixture is ready to load after an explicit import action."}
        </p>
        <p className="ai-value-import-boundary">
          Wireframe action only. A future backend import will verify collection status,
          source identity, aggregate suppression, and report version before pulling data.
        </p>
      </section>

      {!importedData ? (
        <section className="ai-value-panel ai-fluency-import-empty" role="status" aria-label="AI Fluency results not imported">
          <p className="eyebrow">Waiting for import</p>
          <h3>Results stay hidden until you import the completed measurement</h3>
          <p>No AI Fluency values have been attached to this value case.</p>
        </section>
      ) : (
      <section
        ref={resultsRef}
        tabIndex={-1}
        className="ai-value-panel ai-fluency-evidence-panel"
        aria-label="AI Fluency Evidence"
        aria-live="polite"
      >
        <div className="ai-value-section-head">
          <div>
            <p className="eyebrow">Instrument-derived evidence</p>
            <h3>Illustrative AI Fluency Evidence</h3>
            <p>
              Keep capture, profile, translation, and report interpretation in one
              place because each read comes from the same AI Fluency instrument.
            </p>
          </div>
          <div className="ai-fluency-evidence-status-stack">
            <StatusPill label="AIOM-facilitated capture" tone="good" />
            <StatusPill label="Value Realization uses the readout" tone="neutral" />
          </div>
        </div>

        <section
          className="ai-fluency-case-study-summary"
          aria-label={`${importedData.caseStudy.organizationName} case study`}
        >
          <div>
            <p className="eyebrow">Internal renamed example</p>
            <h4>{importedData.caseStudy.organizationName} illustrative AI Fluency profile</h4>
            <p>{importedData.caseStudy.summary}</p>
          </div>
          <dl>
            <div>
              <dt>Overall aggregate result</dt>
              <dd>{importedData.caseStudy.overallResult}</dd>
            </div>
            <div>
              <dt>Prior aggregate result</dt>
              <dd>{importedData.caseStudy.priorAggregateResult}</dd>
            </div>
            <div>
              <dt>Example cohort size</dt>
              <dd>{importedData.caseStudy.cohortSize}</dd>
            </div>
            <div>
              <dt>Reported completion rate</dt>
              <dd>{importedData.caseStudy.completionRate}</dd>
            </div>
          </dl>
          <p className="ai-fluency-case-study-caveat">{importedData.caseStudy.caveat}</p>
        </section>

        <div className="ai-fluency-evidence-note">
          <strong>Illustrative case-study data</strong>
          <p>{importedData.illustrativeBoundary}</p>
        </div>

        <div
          className="ai-fluency-evidence-switcher"
          role="group"
          aria-label="AI Fluency evidence views"
        >
          {aiFluencyEvidenceViews.map((view) => (
            <button
              key={view.key}
              type="button"
              aria-label={view.label}
              aria-describedby={`ai-fluency-evidence-${view.key}-description`}
              aria-pressed={activeView === view.key}
              onClick={() => setActiveView(view.key)}
            >
              <span>{view.label}</span>
              <small id={`ai-fluency-evidence-${view.key}-description`}>
                {view.description}
              </small>
            </button>
          ))}
        </div>

        <section
          className="ai-fluency-evidence-active-view"
          aria-label={`${activeViewDefinition.label} evidence lens`}
        >
          {activeView === "capture" && (
            <section
              className="ai-fluency-evidence-view"
              aria-label="Fluency capture view"
            >
              <div className="ai-fluency-evidence-view-head">
                <span className="ai-value-map-label">Capture lens</span>
                <h4>Instrument capture readiness</h4>
                <p>
                  The AIOM's main support lane is coordinating the instrument,
                  driving response coverage, and handing context to Value Realization.
                </p>
              </div>
              <div className="ai-fluency-evidence-grid">
                {importedData.captureFacts.map((item) => (
                  <article key={item.label}>
                    <span className="ai-value-map-label">{item.label}</span>
                    <strong>{item.value}</strong>
                    <p>{item.detail}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {activeView === "profile" && (
            <section
              className="ai-fluency-evidence-view"
              aria-label="Five-factor profile view"
            >
              <div className="ai-fluency-evidence-view-head">
                <span className="ai-value-map-label">Profile lens</span>
                <h4>Five-factor fluency profile</h4>
                <p>
                  The profile explains what capability the organization reports it
                  is building before observed behavior is interpreted.
                </p>
              </div>
              <div className="ai-fluency-factor-list">
                {importedData.profileFactors.map((factor) => (
                  <article key={factor.label}>
                    <div>
                      <strong>{factor.label}</strong>
                      <p>{factor.detail}</p>
                      <p className="ai-fluency-factor-action">
                        <strong>Practice next:</strong> {factor.action}
                      </p>
                    </div>
                    <span>{factor.value}</span>
                  </article>
                ))}
              </div>
            </section>
          )}

          {activeView === "translation" && (
            <section
              className="ai-fluency-evidence-view"
              aria-label="Fluency translation view"
            >
              <div className="ai-fluency-evidence-view-head">
                <span className="ai-value-map-label">Translation lens</span>
                <h4>Attitude, intent, and perceived impact</h4>
                <p>
                  This read places reported attitude, intent, and perceived work
                  value alongside capability. It does not establish a transition or
                  causal linkage among those constructs.
                </p>
              </div>
              <div className="ai-fluency-evidence-grid ai-fluency-evidence-grid-three">
                {importedData.translationSignals.map((signal) => (
                  <article key={signal.label}>
                    <span className="ai-value-map-label">{signal.label}</span>
                    <strong>{signal.value}</strong>
                    <p>{signal.detail}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {activeView === "report" && (
            <section
              className="ai-fluency-evidence-view"
              aria-label="AI Fluency report read view"
            >
              <div className="ai-fluency-evidence-view-head">
                <span className="ai-value-map-label">Report lens</span>
                <h4>How this travels into the value report</h4>
                <p>
                  The report should show the fluency signal clearly while keeping
                  ownership, interpretation, and behavior evidence boundaries intact.
                </p>
              </div>
              <div className="ai-fluency-report-read-list">
                {importedData.reportReadItems.map((item) => (
                  <article key={item.label}>
                    <span className="ai-value-map-label">{item.label}</span>
                    <strong>{item.value}</strong>
                    <p>{item.detail}</p>
                  </article>
                ))}
              </div>
              <div className="ai-fluency-evidence-note">
                <strong>Claim posture</strong>
                <p>
                  Reported AI fluency supports readiness and interpretation. It
                  does not prove ROI, causality, productivity, claimant fairness,
                  people attribution, or workforce evaluation.
                </p>
              </div>
            </section>
          )}
        </section>
      </section>
      )}
    </section>
  );
};

const MetricsPage = ({ journey }: { journey: Journey }) => {
  const [selectedFunction, setSelectedFunction] = useState("Customer or Account Success");
  const [draftMetricSelection, setDraftMetricSelection] =
    useState<SelectedOutcomeMetricSelection | null>(null);
  const functionMetricPlans = useMemo(
    () => buildFunctionMetricPlans(journey.questionMetricBridge),
    [journey.questionMetricBridge]
  );
  const contributionReportingSpine = applyReviewerMetricSelectionDraftIntake(
    journey.contributionReportingSpine,
    draftMetricSelection
  );

  return (
    <section className="ai-value-focused-stack" aria-label="Metrics workspace">
      <section className="ai-value-panel" aria-label="Metric review guide">
        <div className="ai-value-section-head">
          <div>
            <p className="eyebrow">Step 5 · Metric Review</p>
            <h3>Metric Review</h3>
            <p>
              Every value claim is tested against a function outcome metric the
              client owns. Confirm the metric, source system, owner, and
              comparison window.
            </p>
          </div>
          <StatusPill label="Client owns the metric" tone="good" />
        </div>
      </section>

      <ClientQuestionMetricBridgePanel
        bridge={journey.questionMetricBridge}
        functionPlans={functionMetricPlans}
        onActiveSelectionChange={setDraftMetricSelection}
        onSelectedFunctionChange={setSelectedFunction}
        selectedFunction={selectedFunction}
      />

      <AiContributionReportingSpinePanel spine={contributionReportingSpine} />

      <CandidateOutcomeMetricsPanel
        functionPlans={functionMetricPlans}
        selectedFunction={selectedFunction}
      />
    </section>
  );
};

const CandidateOutcomeMetricsPanel = ({
  functionPlans,
  selectedFunction
}: {
  functionPlans: FunctionMetricPlan[];
  selectedFunction: string;
}) => {
  const selectedPlan = functionPlans.find((plan) => plan.functionArea === selectedFunction) ?? functionPlans[0];
  const functionSignals = selectedPlan.metrics.slice(0, 5);

  return (
    <article className="ai-value-panel ai-value-signal-shortlist-panel" aria-label="Candidate outcome metrics">
      <div className="ai-value-section-head">
        <div>
          <p className="eyebrow">Metric Options</p>
          <h3>Top outcome metrics for this function</h3>
          <p>{selectedPlan.functionArea}</p>
        </div>
        <StatusPill label="Client confirms" tone="good" />
      </div>
      <div className="ai-value-signal-shortlist" aria-label="Candidate outcome metric cards">
        {functionSignals.map((metric) => (
          <article className="ai-value-signal-card" key={metric.id}>
            <div>
              <span className="ai-value-map-label">Question to ask</span>
              <h4>{metric.question ?? `Should the client watch ${metric.name.toLowerCase()}?`}</h4>
            </div>
            <div>
              <span className="ai-value-map-label">Possible metric</span>
              <p>{metric.name}</p>
            </div>
            <small>Likely source: {metric.sourceSystem}</small>
            <StatusPill label={metric.status ?? "Ready to map"} tone={metric.status === "Needs owner" ? "warn" : "good"} />
          </article>
        ))}
      </div>
    </article>
  );
};

const RoiReadinessPage = ({ journey }: { journey: Journey }) => {
  const readiness = journey.roiScenarioReadiness;
  const nextClientAction = journey.customerEvidenceRequest.available
    ? journey.customerEvidenceRequest.reviewStep
    : readiness.nextAction;
  const allInputsReady =
    readiness.available && readiness.inputs.every((input) => input.status === "Ready to model");
  const readinessTone: "good" | "warn" | "neutral" =
    allInputsReady
      ? "good"
      : readiness.available
        ? "warn"
        : "neutral";
  const readinessLabel = allInputsReady
    ? readiness.statusLabel
    : readiness.available
      ? "Owner review still needed"
      : readiness.statusLabel;

  return (
    <section className="ai-value-focused-stack" aria-label="Value and ROI workspace">
      <section
        className="ai-value-panel ai-value-roi-readiness"
        aria-label="Value and ROI readiness"
      >
        <div className="ai-value-section-head">
          <div>
            <p className="eyebrow">Governed Value Modeling</p>
            <h3>Value Readiness</h3>
            <p>
              Use this as the readiness check before sponsor sharing: what the
              client can model, what still needs owner review, and which claims
              stay blocked.
            </p>
          </div>
          <StatusPill label={readinessLabel} tone={readinessTone} />
        </div>

        <div className="ai-value-map-grid">
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Workflow</span>
            <strong>{readiness.workflowName}</strong>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Value route</span>
            <strong>{readiness.valueRouteLabel}</strong>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Outcome metric</span>
            <strong>{readiness.metricName}</strong>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Source and aggregation level</span>
            <strong>{readiness.sourceSystem}</strong>
            <p>{readiness.sourceGrain}</p>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Evidence status</span>
            <strong>{readiness.evidenceStatus}</strong>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Next client action</span>
            <strong>{nextClientAction}</strong>
          </div>
        </div>

        <div className="ai-value-scenario-builder">
          <div className="ai-value-scenario-builder-head">
            <div>
              <p className="eyebrow">Value Modeling Inputs</p>
              <h3>Inputs to confirm before stronger value language</h3>
            </div>
          </div>
          <div className="ai-value-scenario-input-grid">
            {readiness.inputs.map((input) => (
              <article className="ai-value-scenario-input" key={input.label}>
                <div>
                  <strong>{input.label}</strong>
                  <p>{scenarioInputDetail(input.label, input.detail)}</p>
                </div>
                <StatusPill label={input.status} tone={scenarioInputTone(input.status)} />
              </article>
            ))}
          </div>
        </div>

        <section aria-label="Scenario bands">
          <div className="ai-value-scenario-builder-head">
            <div>
              <p className="eyebrow">Scenario Bands</p>
              <h3>Planning ranges for client-owned review</h3>
            </div>
          </div>
          {readiness.scenarioBands.length > 0 ? (
            <div className="ai-value-scenario-band-list">
              {readiness.scenarioBands.map((band) => (
                <article className="ai-value-scenario-band" key={band.label}>
                  <strong>{band.label}</strong>
                  <p>{scenarioBandInterpretation(band.interpretation)}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="ai-value-case-output-note">
              Scenario bands stay held until the client confirms the metric,
              baseline, comparison window, and operating assumptions.
            </p>
          )}
        </section>

        <RoiBotModelingContextPanel />

        <div className="ai-value-case-language">
          <section className="ai-value-case-language-col" aria-label="Safe value language">
            <h3>Safe value language</h3>
            <ul>
              {readiness.safeValueLanguage.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <section className="ai-value-case-language-col" aria-label="Blocked outputs and claim limits">
            <h3>Blocked outputs / claim limits</h3>
            <ul>
              {readiness.blockedOutputs.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>

        <section className="ai-value-case-assumptions" aria-label="Executive handoff">
          <h3>Executive handoff / what happens next</h3>
          <p>{readiness.executiveHandoff}</p>
        </section>
      </section>
    </section>
  );
};

const RoiBotModelingContextPanel = () => (
  <section
    className="ai-value-roi-bot-context"
    aria-label="ROI Bot modeling context"
  >
    <div className="ai-value-scenario-builder-head">
      <div>
        <p className="eyebrow">Sourced Scenario Companion</p>
        <h3>{roiBotModelingContext.title}</h3>
        <p>{roiBotModelingContext.role}</p>
      </div>
      <StatusPill label={roiBotModelingContext.statusLabel} tone="neutral" />
    </div>

    <div className="ai-value-map-grid">
      <div className="ai-value-map-cell">
        <span className="ai-value-map-label">Source system</span>
        <strong>{roiBotModelingContext.source}</strong>
      </div>
      <div className="ai-value-map-cell">
        <span className="ai-value-map-label">Pull discipline</span>
        <strong>{roiBotModelingContext.pullDiscipline}</strong>
      </div>
      <div className="ai-value-map-cell">
        <span className="ai-value-map-label">Safe use</span>
        <strong>Value hypothesis packaging</strong>
      </div>
      <div className="ai-value-map-cell">
        <span className="ai-value-map-label">Boundary</span>
        <strong>Does not change claim readiness</strong>
      </div>
    </div>

    <div className="ai-value-scenario-input-grid">
      {roiBotModelingContext.requiredChecks.map((check) => (
        <article className="ai-value-scenario-input" key={check.label}>
          <div>
            <strong>{check.label}</strong>
            <p>{check.detail}</p>
          </div>
          <StatusPill label={check.status} tone="warn" />
        </article>
      ))}
    </div>

    <div className="ai-value-case-language">
      <section className="ai-value-case-language-col" aria-label="ROI Bot safe use">
        <h3>What it can add</h3>
        <p>{roiBotModelingContext.safeLanguage}</p>
      </section>
      <section className="ai-value-case-language-col" aria-label="ROI Bot blocked use">
        <h3>What stays blocked</h3>
        <p>{roiBotModelingContext.blockedLanguage}</p>
      </section>
    </div>

    <div className="ai-value-token-pilot-chip-list" aria-label="Signals ROI Bot does not change">
      {roiBotModelingContext.doesNotChange.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </div>
  </section>
);

const ValueImprovementLoopPanel = ({ journey }: { journey: Journey }) => {
  const loop = journey.valueImprovementLoop;

  return (
    <section
      className="ai-value-panel ai-value-improvement-loop-panel"
      aria-label="Value improvement loop"
    >
      <div className="ai-value-section-head">
        <div>
          <p className="eyebrow">Value Improvement</p>
          <h3>If value is not improving</h3>
          <p>
            Use this loop when the selected value target is not moving yet:
            identify the likely blocker, choose the next intervention, and
            re-measure after the retest window.
          </p>
        </div>
        <StatusPill label={loop.statusLabel} tone={loop.statusTone} />
      </div>

      <div className="ai-value-improvement-target">
        <div>
          <span className="ai-value-map-label">Value target</span>
          <strong>{loop.metricName}</strong>
          <p>
            {loop.available
              ? `${loop.valueRouteLabel} through ${loop.sourceSystem}`
              : "Select the workflow, metric, data source, and comparison window first."}
          </p>
        </div>
        <div>
          <span className="ai-value-map-label">Velocity, Breadth, Depth</span>
          <strong>Velocity, Breadth, and Depth</strong>
          <p>{loop.vbdSummary}</p>
        </div>
        <div>
          <span className="ai-value-map-label">Retest window</span>
          <strong>{loop.retestWindow}</strong>
          <p>{loop.retestPlan}</p>
        </div>
      </div>

      <div className="ai-value-improvement-grid">
        <section aria-label="Likely blockers">
          <h4>Likely blockers</h4>
          {loop.likelyBlockers.map((blocker) => (
            <article className="ai-value-improvement-item" key={blocker.label}>
              <strong>{blocker.label}</strong>
              <p>{blocker.rationale}</p>
              <small>{blocker.evidenceBasis}</small>
            </article>
          ))}
        </section>
        <section aria-label="Recommended interventions">
          <h4>Recommended interventions</h4>
          {loop.recommendedInterventions.map((intervention) => (
            <article className="ai-value-improvement-item" key={intervention.label}>
              <strong>{intervention.label}</strong>
              <p>{intervention.action}</p>
              <small>{intervention.owner}</small>
            </article>
          ))}
        </section>
      </div>

      <div className="ai-value-improvement-footer">
        <div>
          <span className="ai-value-map-label">Next data needed</span>
          <ul>
            {loop.nextDataNeeded.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <span className="ai-value-map-label">Success signal</span>
          <p>{loop.successSignal}</p>
          <StatusPill label="Advisory only" tone="neutral" />
          <p>{loop.caveat}</p>
        </div>
      </div>
    </section>
  );
};

const DecisionsPage = ({
  journey,
  mode,
  liveReport
}: {
  journey: Journey;
  mode: ReturnType<typeof useAiValueWorkspace>["mode"];
  liveReport: RequestBoundLiveReport | null;
}) => (
  <section className="ai-value-focused-stack" aria-label="Executive Report workspace">
    <ExecutiveReportPackagePanel mode={mode} liveReport={liveReport} />

    <ValueRoiAccessPanel journey={journey} />

    <SponsorDecisionLoopPanel loop={journey.sponsorDecisionLoop} />

    <ValueImprovementLoopPanel journey={journey} />
  </section>
);

const ExecutiveReportPackagePanel = ({
  mode,
  liveReport
}: {
  mode: ReturnType<typeof useAiValueWorkspace>["mode"];
  liveReport: RequestBoundLiveReport | null;
}) => {
  if (mode === "loading" || mode === "held" || mode === "error") {
    const title =
      mode === "loading"
        ? "Live report request is loading"
        : mode === "held"
          ? "Live report is held"
          : "Live report could not be loaded";
    const detail =
      mode === "loading"
        ? "Prior live state has been cleared while this request is evaluated."
        : mode === "held"
          ? "The exact engine response did not clear every request-binding and governance gate."
          : "No illustrative or previously loaded report is being substituted.";
    return (
      <section
        className="ai-value-panel ai-value-report-package-panel"
        aria-label="Value Evidence Report"
      >
        <p className="eyebrow">Value Evidence Report</p>
        <h2>{title}</h2>
        <p>{detail}</p>
        <StatusPill label={mode === "loading" ? "Loading" : "Held"} tone="neutral" />
      </section>
    );
  }

  if (mode === "live" && !liveReport) {
    return (
      <section
        className="ai-value-panel ai-value-report-package-panel"
        aria-label="Value Evidence Report"
      >
        <p className="eyebrow">Value Evidence Report</p>
        <h2>Live report is held</h2>
        <p>The request did not produce an eligible request-bound projection.</p>
      </section>
    );
  }

  const isLive = mode === "live" && liveReport !== null;
  const currentPosture = isLive
    ? liveReport.currentPosture
    : [...sampleExecutiveReport.currentPosture];
  const layers = isLive ? liveReport.layers : [...sampleExecutiveReport.layers];
  const recommendations = isLive
    ? liveReport.recommendations
    : [...sampleExecutiveReport.recommendations];
  const governanceNotes = isLive
    ? liveReport.governanceNotes
    : [...sampleExecutiveReport.governanceNotes];
  const reportSummary = isLive
    ? liveReport.summary
    : "For Customer Support case resolution, evidence suggests AI-enabled work is beginning to become more durable, but the value case is not fully closed yet. Behavior evidence is strongest: support teams are showing higher reuse, more verification, and deeper workflow integration across the approved Day 0 to Day 60 windows. Business metric evidence is still emerging because the customer-owned resolution-time export has not yet cleared review.";

  return (
    <section className="ai-value-panel ai-value-report-package-panel" aria-label="Value Evidence Report">
      <div className="ai-value-section-head">
        <div>
          <p className="eyebrow">Value Evidence Report</p>
          <h2>Is enterprise AI becoming valuable work?</h2>
          <p>
            A governed executive view of whether AI access is becoming changed
            behavior, stronger workflow capability, meaningful metric movement,
            and better spend judgment.
          </p>
          <p>
            {isLive
              ? liveReport.boundaryLabel
              : "Illustrative example, not live evidence"}
          </p>
        </div>
        <StatusPill
          label={isLive ? "Request-bound" : "Illustrative only"}
          tone={isLive ? "good" : "neutral"}
        />
      </div>

      <p className="ai-value-report-action-caveat">
        {isLive
          ? liveReport.boundaryStatement
          : "Caveated report actions only: this illustrative package does not claim ROI, causality, productivity lift, financial impact, or individual performance. Blocked and internal-only evidence stays out of shared report materials."}
      </p>

      <div className="ai-value-report-actions" role="group" aria-label="Report actions">
        <button
          type="button"
          className="ai-value-step active"
          disabled
        >
          {isLive ? "Internal request-bound preview" : "Open internal preview"}
        </button>
        <button type="button" className="ai-value-step" disabled>
          Export not authorized
        </button>
        <button type="button" className="ai-value-step" disabled>
          Share not authorized
        </button>
      </div>
      <p className="ai-value-report-export-note">
        Preview only. Export not authorized until a promoted report-output contract exists.
      </p>

      <section className="ai-value-report-executive-read" aria-label="Executive read">
        <h3>Executive Read</h3>
        <p>{reportSummary}</p>
        {!isLive && (
          <p>
            This does not mean the organization is simply using Glean more. The early
            signal is that support work is starting to change: teams are retrieving
            knowledge, reusing prior answers, verifying outputs, and reducing repeated
            manual search loops.
          </p>
        )}
      </section>

      <div className="ai-value-report-posture-grid" aria-label="Current posture">
        {currentPosture.map(([label, value]) => (
          <article key={label}>
            <span className="ai-value-map-label">{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>

      <section className="ai-value-report-layer-grid" aria-label="Report evidence layers">
        {layers.map((layer) => (
          <article key={layer.title}>
            <h3>{layer.title}</h3>
            <p>{layer.summary}</p>
            <ul>
              {layer.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="ai-value-report-recommendations" aria-label="Executive recommendations">
        <div>
          <h3>Executive Recommendations</h3>
          <p>What leadership should do next</p>
        </div>
        <ol>
          {recommendations.map((recommendation) => (
            <li key={recommendation}>{recommendation}</li>
          ))}
        </ol>
      </section>

      <section className="ai-value-report-governance" aria-label="Governance notes">
        <div>
          <h3>Governance Notes</h3>
          <p>What the report can and cannot say</p>
        </div>
        <ul>
          {governanceNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section>

      <p className="ai-value-report-final-sentence">
        {isLive
          ? "This conclusion is limited to the exact successful engine response that produced this preview."
          : "The strongest current conclusion is that AI-enabled work is beginning to form in Customer Support, but business metric evidence must clear review before Glean can support stronger value language."}
      </p>
    </section>
  );
};

const ValueRoiAccessPanel = ({ journey }: { journey: Journey }) => {
  const readiness = journey.roiScenarioReadiness;
  const metricName =
    readiness.metricName && readiness.metricName !== "No outcome metric selected"
      ? readiness.metricName
      : "selected outcome metric";
  const workflowName =
    readiness.workflowName && readiness.workflowName !== "No workflow selected yet"
      ? readiness.workflowName
      : "selected workflow";

  return (
    <section
      aria-label="Evidence Checkpoint access"
      className="ai-value-panel ai-value-roi-access-panel"
    >
      <div>
        <p className="eyebrow">Evidence Checkpoint</p>
        <h3>Review the checkpoint before the executive report</h3>
        <p>
          Use this screen to see whether the {metricName} for the {workflowName} is
          ready for executive caveats, owner validation, or a held-language decision.
        </p>
      </div>
      <Link className="ai-value-step active" to="/ai-value-workspace/case">
        Open Evidence Checkpoint
      </Link>
    </section>
  );
};
