import { useMemo, useState, type CSSProperties } from "react";
import { Link, useLocation } from "react-router-dom";

import { aiValueWorkspace } from "../constants/aiValueWorkspace";
import { useAiValueWorkspace } from "../hooks/useAiValueWorkspace";
import {
  useAiValueJourney,
  type JourneyStageKey,
  type JourneyStageState
} from "../hooks/useAiValueJourney";
import {
  buildFunctionMetricPlans,
  ClientQuestionMetricBridgePanel,
  type FunctionMetricPlan
} from "../components/ClientQuestionMetricBridgePanel";
import { ExecutiveReadoutPreviewPanel } from "../components/ExecutiveReadoutPreviewPanel";
import { SponsorDecisionLoopPanel } from "../components/SponsorDecisionLoopPanel";
import { ValueEvidenceCasePanel } from "../components/ValueEvidenceCasePanel";

const workspacePages = [
  {
    slug: "home",
    label: "Blueprint Hypothesis",
    navLabel: "Blueprint",
    path: "/ai-value-workspace",
    detail: "Customer-approved goals, workflows, expected behaviors, metrics, lags, and value-driver pathways.",
    feedsNext: "Move the approved hypothesis into the Fluency Baseline."
  },
  {
    slug: "readiness",
    label: "Fluency Baseline",
    navLabel: "Fluency",
    path: "/ai-value-workspace/readiness",
    detail: "Aggregate readiness and behavior-change context captured before the evidence windows move.",
    feedsNext: "Review source readiness before behavior evidence is assembled."
  },
  {
    slug: "sources",
    label: "Evidence Sources",
    navLabel: "Sources",
    path: "/ai-value-workspace/sources",
    detail: "Approved aggregate source lanes, held reasons, owner roles, and source package references.",
    feedsNext: "Use cleared source packages to inspect behavior evidence."
  },
  {
    slug: "vbd",
    label: "Behavior Evidence",
    navLabel: "Behavior / VBD",
    path: "/ai-value-workspace/vbd",
    detail: "Velocity, breadth, depth, and token context across approved aggregate windows.",
    feedsNext: "Connect the customer-owned metric for the priority workflow."
  },
  {
    slug: "metrics",
    label: "Metric Review",
    navLabel: "Metrics",
    path: "/ai-value-workspace/metrics",
    detail: "The customer-owned operating metric that will test the accepted hypothesis.",
    feedsNext: "Build the next Evidence Checkpoint."
  },
  {
    slug: "case",
    label: "Evidence Checkpoint",
    navLabel: "Checkpoint",
    path: "/ai-value-workspace/case",
    detail: "A governed milestone review of hypothesis, behavior evidence, metric evidence, and blocked claims.",
    feedsNext: "Carry checkpoint status into the Executive Report."
  },
  {
    slug: "decisions",
    label: "Executive Report",
    navLabel: "Report",
    path: "/ai-value-workspace/decisions",
    detail: "Executive-ready narrative, downloads, share posture, caveats, and next operating decision.",
    feedsNext: "Intervene, remeasure, and update the Evidence Timeline."
  }
] as const;

type WorkspacePageSlug = (typeof workspacePages)[number]["slug"];

const workspacePageBySlug = new Map(workspacePages.map((page) => [page.slug, page]));
const workspaceStageBySlug: Partial<Record<WorkspacePageSlug, JourneyStageKey>> = {
  home: "blueprint",
  readiness: "readiness",
  sources: "instrumentation",
  vbd: "measurement",
  metrics: "opportunity",
  case: "scenario",
  decisions: "readout"
};

const workspaceStatusLabels: Record<JourneyStageState, string> = {
  done: "Completed",
  attention: "Still working",
  todo: "Not started"
};

const workspaceStatusTone: Record<JourneyStageState, "good" | "warn" | "neutral"> = {
  done: "good",
  attention: "warn",
  todo: "neutral"
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

const AI_ORG_FLUENCY_EXAMPLE_URL = "/ai-fluency/organizational-results.html";
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
    "Adds live usage actuals, token/FlexCredit context, pricing, volume, revenue, EBITDA, and loaded-cost assumptions for governed scenario review.",
  doesNotChange: [
    "FluencyTracr governance",
    "AI Fluency dashboard interpretation",
    "VBD score or quadrant placement",
    "evidence grade or claim level"
  ],
  requiredChecks: [
    {
      label: "Usage actuals",
      detail: "Approved Glean analytics source with source tag and pull date.",
      status: "Source required"
    },
    {
      label: "Assumption owner",
      detail: "Business or finance owner confirms pricing, volume, revenue, EBITDA, or cost assumptions.",
      status: "Owner review"
    },
    {
      label: "Scenario packaging",
      detail: "HTML or PPTX output may carry caveats after FluencyTracr claim boundaries are applied.",
      status: "Caveats required"
    }
  ],
  safeLanguage:
    "ROI Bot can package a sourced value hypothesis for business-owner review after evidence checks.",
  blockedLanguage:
    "ROI Bot output does not prove ROI, productivity, causality, EBITDA movement, revenue movement, savings, or AI value attribution."
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
  sourceRef: string;
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

const sourcePackageSourceStates = [
  "missing",
  "uploaded",
  "parsed",
  "held",
  "approved",
  "suppressed",
  "aligned"
] satisfies SourcePackageReviewStatus[];

const sourcePackageAlignmentKeys = [
  "org_id",
  "client_id",
  "workflow_family",
  "function_area",
  "cohort_key",
  "baseline_window",
  "comparison_window"
] as const;

const sourcePackageReadinessChecks = [
  "metric_id",
  "source_ref",
  "owner_role",
  "review_state"
] as const;

const sourcePackageReviewLanes = [
  {
    id: "blueprint",
    label: "Blueprint",
    evidenceLayer: "Workflow and value route",
    sourceMode: "blueprint_document_upload",
    status: "parsed",
    ownerRole: "Value team",
    sourceRef: "Blueprint extraction reference",
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
    sourceRef: "Aggregate dashboard export",
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
    sourceRef: "Scrubbed aggregate telemetry summary",
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
    sourceRef: "Customer metric source reference",
    nextAction: "Resolve metric owner approval, metric definition, and same-window alignment.",
    caveat: "Metric movement stays held until the owner and source system approve the aggregate lane.",
    dataSpineReviewClear: false
  },
  {
    id: "assumption-context",
    label: "ROI assumption context",
    evidenceLayer: "Scenario assumptions",
    sourceMode: "assumption_approval",
    status: "uploaded",
    ownerRole: "Business owner",
    sourceRef: "Assumption approval reference",
    nextAction: "Tag source date, assumption owner, and approval state before finance-context review.",
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
    sourceRef: "Governance attestation reference",
    nextAction: "Regenerate at aggregate threshold if any lane becomes held or suppressed.",
    caveat: "Governance clears source boundaries only; it cannot override a held or suppressed lane.",
    dataSpineReviewClear: true
  }
] satisfies SourcePackageReviewLane[];

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

const reportDisplayCopy = (value: string) =>
  value
    .replace(/Executive Readout/g, "Executive Report")
    .replace(/executive readout/g, "executive report")
    .replace(/Readout/g, "Report")
    .replace(/readout/g, "report");

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
        "Strongest signal: support managers report higher confidence using Glean for case triage and answer validation.",
        "Gap: frontline reps need stronger workflow reinforcement and examples of good verified use.",
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
  readout: "decisions"
};

const currentPageFromPath = (pathname: string): WorkspacePageSlug => {
  const raw = pathname.replace(/\/+$/, "").split("/ai-value-workspace/")[1];
  const slug = raw?.split("/")[0];
  if (slug && legacySlugRedirects[slug]) return legacySlugRedirects[slug];
  return slug && workspacePageBySlug.has(slug as WorkspacePageSlug)
    ? (slug as WorkspacePageSlug)
    : "home";
};

type Journey = ReturnType<typeof useAiValueJourney>;

const workspacePageStatus = (
  slug: WorkspacePageSlug,
  journey: Journey
): { label: string; tone: "good" | "warn" | "neutral" } => {
  const stageKey = workspaceStageBySlug[slug];
  const stage = journey.stages.find((item) => item.key === stageKey);
  if (!stage) {
    return { label: "Not started", tone: "neutral" };
  }

  return {
    label: workspaceStatusLabels[stage.state],
    tone: workspaceStatusTone[stage.state]
  };
};

const workspacePageIndex = (slug: WorkspacePageSlug) =>
  Math.max(0, workspacePages.findIndex((page) => page.slug === slug));

const visibleEvidenceCoverage = (journey: Journey) =>
  journey.realEvidenceStatus.coverage.slice(0, 4);

export const AIValueWorkspace = () => {
  const location = useLocation();
  const activePageSlug = currentPageFromPath(location.pathname);
  const { mode, live, errorMessage, connectLiveEvidence } = useAiValueWorkspace();
  const journey = useAiValueJourney();

  const workflowName =
    live?.workflowName ??
    (journey.workflowHandoff.selected
      ? journey.workflowHandoff.workflowName
      : aiValueWorkspace.workflowName);
  const valueRouteLabel =
    live?.valueRouteLabel ??
    (journey.workflowHandoff.selected
      ? journey.workflowHandoff.valueRouteLabel
      : aiValueWorkspace.valueRouteLabel);
  const decisionLabel =
    live?.decisionLabel ??
    (journey.workflowHandoff.selected && journey.evidenceScenarioPlan.decisionLabel
      ? journey.evidenceScenarioPlan.decisionLabel
      : aiValueWorkspace.decisionLabel);
  const claimModeLabel = live?.claimModeLabel ?? aiValueWorkspace.claimModeLabel;
  const activePage = workspacePageBySlug.get(activePageSlug) ?? workspacePages[0];
  const activeStepNumber = workspacePageIndex(activePageSlug) + 1;

  return (
    <main className="ai-value-shell">
      <header className="ai-value-topbar">
        <div>
          <p className="eyebrow">Client value console</p>
          <h1>Value Evidence Console</h1>
          <p>Guided path from approved hypothesis to executive-ready evidence.</p>
        </div>
        <div className="ai-value-status-strip" aria-label="Workspace status">
          <StatusPill
            label={mode === "live" ? "Live evidence connected" : "Example mode"}
            tone={mode === "live" ? "good" : "neutral"}
          />
          <StatusPill
            label={journey.realEvidenceStatus.available ? "Evidence connected" : "Evidence not connected"}
            tone={journey.realEvidenceStatus.statusTone}
          />
          <button
            type="button"
            className="ai-value-step"
            onClick={() => void connectLiveEvidence()}
            disabled={mode === "loading"}
          >
            {mode === "loading"
              ? "Connecting..."
              : mode === "live"
                ? "Refresh live evidence"
                : "Connect live evidence"}
          </button>
        </div>
      </header>

      <section className="ai-value-next-action" aria-label="Current guided action">
        <div>
          <span>Next best action</span>
          <strong>{activePage.label}</strong>
          <p>{activePage.detail}</p>
        </div>
        <StatusPill label={`Step ${activeStepNumber} of ${workspacePages.length}`} tone="neutral" />
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
        <p role="alert" className="ai-value-inline-alert">
          {journey.errorMessage}
        </p>
      )}
      {errorMessage && (
        <p role="alert" className="ai-value-inline-alert">
          {errorMessage}
        </p>
      )}

      <section className="ai-value-console-layout" aria-label="Value journey console">
        <nav className="ai-value-workspace-nav" aria-label="Value journey steps">
          {workspacePages.map((page, index) => {
            const status = workspacePageStatus(page.slug, journey);
            return (
              <Link
                key={page.slug}
                to={page.path}
                className={
                  activePageSlug === page.slug
                    ? "ai-value-step ai-value-workspace-card active"
                    : "ai-value-step ai-value-workspace-card"
                }
                aria-current={activePageSlug === page.slug ? "page" : undefined}
                aria-label={`${index + 1}. ${page.label}, ${status.label}`}
              >
                <span className="ai-value-workspace-index">{index + 1}</span>
                <span className="ai-value-workspace-card-copy">
                  <strong>{page.navLabel}</strong>
                  <span className={`ai-value-workspace-card-status ai-value-workspace-card-status-${status.tone}`}>
                    {status.label}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        <section className="ai-value-active-workspace" aria-label="Active value journey step">
          {activePageSlug === "home" && (
            <BlueprintHypothesisPage
              workflowName={workflowName}
              valueRouteLabel={valueRouteLabel}
              decisionLabel={decisionLabel}
            />
          )}

          {activePageSlug === "readiness" && <ReadinessPage />}

          {activePageSlug === "sources" && <EvidenceSourcesPage journey={journey} />}

          {activePageSlug === "vbd" && <VbdPage />}

          {activePageSlug === "metrics" && (
            <MetricsPage journey={journey} />
          )}

          {activePageSlug === "case" && <EvidenceCheckpointPage journey={journey} />}

          {activePageSlug === "decisions" && (
            <DecisionsPage journey={journey} />
          )}

          <WorkspacePageHandoff currentSlug={activePageSlug} />
        </section>

        <WorkspaceAssistantPanel
          activePageSlug={activePageSlug}
          claimModeLabel={claimModeLabel}
          journey={journey}
        />
      </section>
    </main>
  );
};

const WorkspacePageHandoff = ({ currentSlug }: { currentSlug: WorkspacePageSlug }) => {
  const currentIndex = workspacePages.findIndex((page) => page.slug === currentSlug);
  const current = workspacePages[currentIndex];
  const previous = currentIndex > 0 ? workspacePages[currentIndex - 1] : null;
  const next =
    currentSlug === "decisions"
      ? workspacePageBySlug.get("readiness")
      : workspacePages[currentIndex + 1];
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

const BlueprintHypothesisPage = ({
  workflowName,
  valueRouteLabel,
  decisionLabel
}: {
  workflowName: string;
  valueRouteLabel: string;
  decisionLabel: string;
}) => (
  <>
    <section className="ai-value-blueprint-hero" aria-label="Blueprint hypothesis summary">
      <article className="ai-value-panel ai-value-blueprint-primary">
        <div className="ai-value-section-head">
          <div>
            <p className="eyebrow">Approved theory of change</p>
            <h2>Blueprint Hypothesis</h2>
            <p>
              Start with what the customer agreed to test: the workflow, the expected
              behavior change, the selected metric, the timing window, and the governed
              value driver.
            </p>
          </div>
          <StatusPill label="Customer review required" tone="warn" />
        </div>

        <div className="ai-value-map-grid">
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Workflow</span>
            <strong>{workflowName}</strong>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Value route</span>
            <strong>{valueRouteLabel}</strong>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Status</span>
            <strong>{decisionLabel}</strong>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Driver</span>
            <strong>Capacity</strong>
          </div>
        </div>

        <div className="ai-value-blueprint-pathways" aria-label="Expected pathways">
          <article>
            <span className="ai-value-map-label">Expected behaviors</span>
            <strong>Knowledge retrieval, reuse, delegation, verification</strong>
          </article>
          <article>
            <span className="ai-value-map-label">Recommended metrics</span>
            <strong>Resolution time, first contact resolution, escalation rate</strong>
          </article>
          <article>
            <span className="ai-value-map-label">Expected lag</span>
            <strong>Day 30 behavior signal, Day 90 metric review</strong>
          </article>
        </div>
      </article>

      <article className="ai-value-panel ai-value-blueprint-side">
        <p className="eyebrow">What needs attention</p>
        <h3>Lock the hypothesis before evidence review</h3>
        <ol className="ai-value-short-list">
          <li>Confirm the customer selected the expected behaviors and metrics.</li>
          <li>Record the approved timing windows and governed driver set.</li>
          <li>Block unapproved financial, causal, productivity, or score-like language.</li>
        </ol>
        <div className="ai-value-evidence-timeline" aria-label="Evidence Timeline">
          {["Day 0", "Day 30", "Day 60", "Day 90", "Day 180", "Day 365"].map((window, index) => (
            <span className={index <= 1 ? "ready" : ""} key={window}>{window}</span>
          ))}
        </div>
      </article>
    </section>

    <section className="ai-value-phase-grid" aria-label="Value journey preview">
      {workspacePages.filter((page) => page.slug !== "home").map((page, index) => (
        <article className="ai-value-panel ai-value-phase-card" key={page.slug}>
          <div className="ai-value-phase-head">
            <span className="ai-value-phase-number">{index + 2}</span>
            <div>
              <h3>{page.label}</h3>
              <p>{page.detail}</p>
            </div>
          </div>
          <p className="ai-value-feeds-next">
            <strong>Next step:</strong> {page.feedsNext}
          </p>
          <Link className="ai-value-step ai-value-phase-action" to={page.path}>
            Open {page.navLabel}
          </Link>
        </article>
      ))}
    </section>
  </>
);

const SourcePackageReviewQueuePanel = () => {
  const dataSpineClearLaneCount = sourcePackageReviewLanes.filter(
    (lane) => lane.dataSpineReviewClear
  ).length;

  return (
    <section
      className="ai-value-source-package-queue"
      aria-label="Source Review Queue"
    >
      <div className="ai-value-section-head">
        <div>
          <p className="eyebrow">Evidence intake queue</p>
          <h3>Source Review Queue</h3>
          <p>
            Review aggregate source lanes before the Data Spine gate tests them.
          </p>
        </div>
        <div className="ai-value-source-package-head-actions">
          <StatusPill label="Data Spine gate before Evidence Checkpoint assembly" tone="warn" />
          <StatusPill
            label={`${dataSpineClearLaneCount} of ${sourcePackageReviewLanes.length} lanes clear for Data Spine review`}
            tone="good"
          />
        </div>
      </div>

      <div
        className="ai-value-source-package-summary"
        role="group"
        aria-label="Source package review boundaries"
      >
        <div>
          <span className="ai-value-map-label">Data Spine alignment keys</span>
          <div className="ai-value-source-package-key-list">
            {sourcePackageAlignmentKeys.map((key) => (
              <span key={key}>{key}</span>
            ))}
          </div>
        </div>
        <div>
          <span className="ai-value-map-label">Review queue labels</span>
          <div className="ai-value-source-package-status-list">
            {sourcePackageSourceStates.map((status) => (
              <StatusPill key={status} label={status} tone={sourcePackageStatusTone[status]} />
            ))}
          </div>
          <div className="ai-value-source-package-key-list ai-value-source-package-readiness-list">
            {sourcePackageReadinessChecks.map((check) => (
              <span key={check}>{check}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="ai-value-source-package-lane-grid">
        {sourcePackageReviewLanes.map((lane) => (
          <article
            className={`ai-value-source-package-lane ai-value-source-package-lane-${lane.status}`}
            key={lane.id}
            aria-label={`${lane.label} source package lane`}
          >
            <div className="ai-value-source-package-lane-head">
              <div>
                <span className="ai-value-map-label">{lane.sourceMode}</span>
                <h4>{lane.label}</h4>
              </div>
              <StatusPill label={lane.status} tone={sourcePackageStatusTone[lane.status]} />
            </div>
            <dl className="ai-value-source-package-facts">
              <div>
                <dt>Evidence layer</dt>
                <dd>{lane.evidenceLayer}</dd>
              </div>
              <div>
                <dt>Owner role</dt>
                <dd>{lane.ownerRole}</dd>
              </div>
              <div>
                <dt>Source reference</dt>
                <dd>{lane.sourceRef}</dd>
              </div>
              <div>
                <dt>Data Spine state</dt>
                <dd>{lane.dataSpineReviewClear ? "Clear for review" : "Hold before review"}</dd>
              </div>
            </dl>
            <div className="ai-value-source-package-action">
              <span className="ai-value-map-label">Action needed</span>
              <p>{lane.nextAction}</p>
            </div>
            <p className="ai-value-source-package-caveat">{lane.caveat}</p>
          </article>
        ))}
      </div>

      <div className="ai-value-source-package-footer">
        <div>
          <span className="ai-value-map-label">Next action</span>
          <strong>Close held lanes before finance-context investigation readiness.</strong>
        </div>
        <p>
          Held or suppressed lanes stay out of finance-context investigation readiness.
          Source Packages show aggregate evidence status only; they do not create
          Data Spine or Evidence Checkpoint readiness by themselves.
        </p>
      </div>
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
          <p>
            Inspect the approved aggregate lanes before anything becomes an Evidence
            Checkpoint. Held, missing, suppressed, or drifted lanes stay visible and
            block stronger report language.
          </p>
        </div>
        <StatusPill label={journey.realEvidenceStatus.statusLabel} tone={journey.realEvidenceStatus.statusTone} />
      </div>

      <div className="ai-value-source-coverage-grid" aria-label="Current source coverage">
        {visibleEvidenceCoverage(journey).map((item) => (
          <article key={item.label}>
            <span className="ai-value-map-label">{item.label}</span>
            <strong>{item.stateLabel}</strong>
            <p>{item.detail}</p>
          </article>
        ))}
      </div>

      {journey.realEvidenceStatus.heldReasons.length > 0 && (
        <div className="ai-value-source-held" role="alert">
          <strong>Held reasons</strong>
          <ul>
            {journey.realEvidenceStatus.heldReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
    </section>

    <SourcePackageReviewQueuePanel />
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

const assistantPromptsBySlug: Record<WorkspacePageSlug, string[]> = {
  home: [
    "What is the customer-approved hypothesis?",
    "Which expected pathways are still unapproved?",
    "What language is safe at this stage?"
  ],
  readiness: [
    "What changed from the baseline?",
    "Which function needs enablement first?",
    "What should leaders reinforce next?"
  ],
  sources: [
    "Which source lane is blocking progress?",
    "Why is this source held?",
    "What can be used in the next checkpoint?"
  ],
  vbd: [
    "What does the behavior evidence suggest?",
    "Which VBD signal is driving this view?",
    "How should token context be interpreted?"
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
    "What evidence should be downloaded or shared?"
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
          financial, causal, productivity, probability, or score-like claims.
        </p>
      </section>
    </aside>
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
  const overallPopulationVbdScore = vbdFunctionRows.length
    ? Math.round(vbdFunctionRows.reduce((sum, plot) => sum + plot.overallVbdScore, 0) / vbdFunctionRows.length)
    : 0;
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
        <section className="ai-value-vbd-score-summary" aria-label="Overall VBD scoring model">
          <article>
            <span>Overall VBD Score</span>
            <strong>{overallPopulationVbdScore}</strong>
            <p>Velocity 0.30 + Breadth 0.30 + Depth 0.40</p>
          </article>
          <article>
            <span>Integration Score</span>
            <strong>Breadth + Depth</strong>
            <p>Breadth 0.40 + Depth 0.60</p>
          </article>
          <article>
            <span>Fixed quadrant line 60</span>
            <strong>0-100 scale</strong>
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
                  aria-label={`${plot.functionArea}: Velocity ${plot.velocity}, Breadth ${plot.breadth}, Depth ${plot.depth}, Integration Score ${plot.integrationScore}, ${quadrant?.label ?? "VBD quadrant"}${
                    isVbdWithToken
                      ? `, aggregate token intensity ${plot.tokenBand}`
                      : `, Overall VBD Score ${plot.overallVbdScore}`
                  }`}
                  className={`ai-value-vbd-function-bubble ai-value-vbd-function-bubble-${plot.quadrantId}${
                    isVbdWithToken ? " ai-value-vbd-function-bubble-token-overlay" : ""
                  }`}
                  key={plot.functionArea}
                  style={vbdBubbleStyle(plot)}
                  title={`${plot.functionArea}: Velocity ${plot.velocity}, Breadth ${plot.breadth}, Depth ${plot.depth}, Integration ${plot.integrationScore}${
                    isVbdWithToken
                      ? `, aggregate token intensity ${plot.tokenBand}`
                      : `, Overall VBD Score ${plot.overallVbdScore}`
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
            : "X-axis is Velocity. Y-axis is Integration. Bubble size shows Overall VBD Score."}
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
                    Quadrant Strength {quadrantRow.quadrantStrength} · Quadrant Share{" "}
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

const VbdPage = () => (
  <section className="ai-value-focused-stack" aria-label="VBD operating map workspace">
    <VbdMapPanel />
  </section>
);

const ReadinessPage = () => (
  <section className="ai-value-focused-stack" aria-label="AI Fluency workspace">
    <AiOrgFluencyExamplePanel />
  </section>
);

const AiOrgFluencyExamplePanel = () => (
  <section
    className="ai-value-panel ai-fluency-example-panel"
    aria-label="Organizational AI Fluency example"
  >
    <div className="ai-value-section-head">
      <div>
        <p className="eyebrow">Organization example</p>
        <h3>AI Org Fluency example</h3>
        <p>
          Use this as the post-assessment view: aggregate organizational AI
          Fluency results by function, signal, and next action.
        </p>
      </div>
      <StatusPill label="Org results example" tone="good" />
    </div>

    <iframe
      className="ai-fluency-preview-frame ai-fluency-org-example-frame"
      src={AI_ORG_FLUENCY_EXAMPLE_URL}
      title="Organizational AI Fluency example"
    />
  </section>
);

const MetricsPage = ({ journey }: { journey: Journey }) => {
  const [selectedFunction, setSelectedFunction] = useState("Customer or Account Success");
  const functionMetricPlans = useMemo(
    () => buildFunctionMetricPlans(journey.questionMetricBridge),
    [journey.questionMetricBridge]
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
        onSelectedFunctionChange={setSelectedFunction}
        selectedFunction={selectedFunction}
      />

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

const DecisionsPage = ({ journey }: { journey: Journey }) => (
  <section className="ai-value-focused-stack" aria-label="Executive Report workspace">
    <ExecutiveReportPackagePanel journey={journey} />

    <ValueRoiAccessPanel journey={journey} />

    <SponsorDecisionLoopPanel loop={journey.sponsorDecisionLoop} />

    <ValueImprovementLoopPanel journey={journey} />

    <ExecutiveReadoutPreviewPanel
      preview={journey.executiveReadoutPreview}
      packetIds={journey.packetIds}
      onOpenReadout={(packetId) => void journey.openReadout(packetId)}
    />
  </section>
);

const ExecutiveReportPackagePanel = ({ journey }: { journey: Journey }) => {
  const preview = journey.executiveReadoutPreview;
  const canShare = preview.canOpen && journey.packetIds.length > 0;

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
        </div>
        <StatusPill label={reportDisplayCopy(preview.statusLabel)} tone={preview.statusTone} />
      </div>

      <div className="ai-value-report-actions" aria-label="Report actions">
        <button type="button" className="ai-value-step active" disabled={!canShare}>
          Preview report
        </button>
        <button type="button" className="ai-value-step">
          Download report
        </button>
        <button type="button" className="ai-value-step" disabled={!canShare}>
          Share package
        </button>
      </div>

      <section className="ai-value-report-executive-read" aria-label="Executive read">
        <h3>Executive Read</h3>
        <p>
          For Customer Support case resolution, evidence suggests AI-enabled work is
          beginning to become more durable, but the value case is not fully closed yet.
          Behavior evidence is strongest: support teams are showing higher reuse, more
          verification, and deeper workflow integration across the approved Day 0 to
          Day 60 windows. Business metric evidence is still emerging because the
          customer-owned resolution-time export has not yet cleared review.
        </p>
        <p>
          This does not mean the organization is simply using Glean more. The early
          signal is that support work is starting to change: teams are retrieving
          knowledge, reusing prior answers, verifying outputs, and reducing repeated
          manual search loops.
        </p>
      </section>

      <div className="ai-value-report-posture-grid" aria-label="Current posture">
        {sampleExecutiveReport.currentPosture.map(([label, value]) => (
          <article key={label}>
            <span className="ai-value-map-label">{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>

      <section className="ai-value-report-layer-grid" aria-label="Report evidence layers">
        {sampleExecutiveReport.layers.map((layer) => (
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
          {sampleExecutiveReport.recommendations.map((recommendation) => (
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
          {sampleExecutiveReport.governanceNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section>

      <p className="ai-value-report-final-sentence">
        The strongest current conclusion is that AI-enabled work is beginning to
        form in Customer Support, but business metric evidence must clear review
        before Glean can support stronger value language.
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
        <p className="eyebrow">Step 6 · Evidence Checkpoint</p>
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
