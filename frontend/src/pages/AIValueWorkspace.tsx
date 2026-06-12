import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { aiValueWorkspace } from "../constants/aiValueWorkspace";
import { useAiValueWorkspace } from "../hooks/useAiValueWorkspace";
import {
  useAiValueJourney,
  type JourneyStageKey,
  type JourneyStageState
} from "../hooks/useAiValueJourney";
import { ClientQuestionMetricBridgePanel } from "../components/ClientQuestionMetricBridgePanel";
import { CustomerEvidenceRequestPanel } from "../components/CustomerEvidenceRequestPanel";
import { CustomerEvidenceReviewWorkbench } from "../components/CustomerEvidenceReviewWorkbench";
import { ExecutiveReadoutPreviewPanel } from "../components/ExecutiveReadoutPreviewPanel";
import { SponsorDecisionLoopPanel } from "../components/SponsorDecisionLoopPanel";
import { ValueEvidenceCasePanel } from "../components/ValueEvidenceCasePanel";
import { ValueSpineTracePanel } from "../components/ValueSpineTracePanel";

const workspacePages = [
  {
    slug: "home",
    label: "Workspace Home",
    navLabel: "Home",
    path: "/ai-value-workspace",
    detail: "AI Fluency baseline, VBD map, value actions.",
    doNow: "Start with AI Fluency. Use VBD to choose where to intervene.",
    needs: [
      "Client workflow",
      "Sponsor value question",
      "Evidence connection status"
    ],
    doneWhen: "The next action is clear.",
    primaryActionLabel: "Start with AI Fluency",
    primaryActionPath: "/ai-value-workspace/readiness",
    feedsNext: "Move from baseline to VBD to value actions."
  },
  {
    slug: "readiness",
    label: "AI Fluency",
    navLabel: "AI Fluency",
    path: "/ai-value-workspace/readiness",
    detail:
      "Baseline: what people are ready to do with AI.",
    doNow: "Send AI Fluency. Review aggregate results by function.",
    needs: [
      "Client assessment link",
      "Aggregate results",
      "Readiness gaps to discuss"
    ],
    doneWhen: "Readiness gaps are visible.",
    primaryActionLabel: "Open Blueprint Workshop",
    primaryActionPath: "/ai-value-workspace/blueprint",
    feedsNext: "Plot VBD and choose the workflow to inspect."
  },
  {
    slug: "blueprint",
    label: "Blueprint Workshop",
    navLabel: "Blueprint",
    path: "/ai-value-workspace/blueprint",
    detail: "Choose the work pattern to change.",
    doNow: "Agree on the current workflow, target workflow, and owner.",
    needs: [
      "Current workflow steps",
      "Target workflow steps",
      "Decision owner"
    ],
    doneWhen: "The workflow and success measure are clear.",
    primaryActionLabel: "Choose Metrics",
    primaryActionPath: "/ai-value-workspace/metrics",
    feedsNext: "Use the agreed workflow to choose outcome metrics."
  },
  {
    slug: "metrics",
    label: "Metrics & ROI Opportunities",
    navLabel: "Metrics & ROI",
    path: "/ai-value-workspace/metrics",
    detail: "Choose the metric that should move.",
    doNow: "Select the outcome metric, source system, and data owner.",
    needs: [
      "Blueprint workflow",
      "Sponsor success measure",
      "Customer source system and owner"
    ],
    doneWhen: "The data ask is specific.",
    primaryActionLabel: "Prepare Evidence Ask",
    primaryActionPath: "/ai-value-workspace/evidence",
    feedsNext: "Use the selected outcome metric to prepare the evidence request."
  },
  {
    slug: "evidence",
    label: "Evidence Readiness",
    navLabel: "Evidence",
    path: "/ai-value-workspace/evidence",
    detail: "Check whether the evidence is usable.",
    doNow: "Review aggregate evidence and customer-owned outcome data.",
    needs: [
      "Aggregate AI activity",
      "Customer outcome export",
      "Baseline and comparison windows"
    ],
    doneWhen: "Usable and missing evidence are clear.",
    primaryActionLabel: "Build Scenario",
    primaryActionPath: "/ai-value-workspace/scenario",
    feedsNext: "Use reviewed evidence to decide what the value scenario can say."
  },
  {
    slug: "scenario",
    label: "Scenario Builder",
    navLabel: "Scenario",
    path: "/ai-value-workspace/scenario",
    detail: "Model the opportunity with caveats.",
    doNow: "Check evidence, assumptions, and blocked claims.",
    needs: [
      "Accepted or caveated evidence",
      "Customer-owned assumptions",
      "Blocked claim list"
    ],
    doneWhen: "The model is bounded.",
    primaryActionLabel: "Open Evidence Case",
    primaryActionPath: "/ai-value-workspace/case",
    feedsNext: "Use scenario status to assemble the value evidence case."
  },
  {
    slug: "case",
    label: "Value Evidence Case",
    navLabel: "Evidence Case",
    path: "/ai-value-workspace/case",
    detail: "One governed view of proof per workflow.",
    doNow: "Review what can be said, what stays blocked, and what to do next.",
    needs: [
      "Chosen outcome metric",
      "Reviewed customer evidence",
      "Open assumptions and owners"
    ],
    doneWhen: "The safe value story and the next action are clear.",
    primaryActionLabel: "Preview Readout",
    primaryActionPath: "/ai-value-workspace/readout",
    feedsNext: "Carry the evidence case into the executive readout."
  },
  {
    slug: "readout",
    label: "Executive Readout",
    navLabel: "Readout",
    path: "/ai-value-workspace/readout",
    detail: "Show the decision and caveats.",
    doNow: "Review the sponsor decision, value posture, and next action.",
    needs: [
      "Sponsor question",
      "Recommended decision",
      "Caveats and next owner"
    ],
    doneWhen: "The sponsor can act without overclaiming.",
    primaryActionLabel: "Choose Sponsor Decision",
    primaryActionPath: "/ai-value-workspace/decisions",
    feedsNext: "Use the readout to choose the sponsor decision and follow-up."
  },
  {
    slug: "decisions",
    label: "Sponsor Decisions",
    navLabel: "Decisions",
    path: "/ai-value-workspace/decisions",
    detail: "Choose what changes next.",
    doNow: "Expand, collect evidence, hold language, or return to Blueprint.",
    needs: [
      "Sponsor decision",
      "Owner",
      "Safe handoff"
    ],
    doneWhen: "The next owner and action are clear.",
    primaryActionLabel: "Return to Blueprint",
    primaryActionPath: "/ai-value-workspace/blueprint",
    feedsNext: "Use the sponsor decision to return to the right workspace step."
  }
] as const;

type WorkspacePageSlug = (typeof workspacePages)[number]["slug"];

const workspacePageBySlug = new Map(workspacePages.map((page) => [page.slug, page]));
const workspaceStageBySlug: Partial<Record<WorkspacePageSlug, JourneyStageKey>> = {
  readiness: "readiness",
  blueprint: "blueprint",
  metrics: "opportunity",
  evidence: "measurement",
  scenario: "scenario",
  case: "scenario",
  readout: "readout",
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
    position: "low-velocity high-depth",
    summary: "AI is used seriously, but creates drag.",
    watch: ["Rework loops", "Heavy iteration", "Long latency", "Workflow mismatch"]
  },
  {
    id: "flow",
    label: "High-fluency flow",
    tone: "green",
    position: "high-velocity high-depth",
    summary: "AI is embedded into work and helps work resolve.",
    watch: ["Repeat use", "Verification", "Productive refinement", "Faster resolution"]
  },
  {
    id: "low-integration",
    label: "Low integration",
    tone: "red",
    position: "low-velocity low-depth",
    summary: "AI is not yet part of real work patterns.",
    watch: ["Abandonment", "Human-only fallback", "Low recurrence", "Poor task fit"]
  },
  {
    id: "fast-shallow",
    label: "Fast but shallow",
    tone: "blue",
    position: "high-velocity low-depth",
    summary: "AI helps with quick tasks, but may be shallow.",
    watch: ["Immediate accept", "Low verification", "Thin workflow presence", "Possible blind trust"]
  }
] as const;

const realEvidencePageSlugs: WorkspacePageSlug[] = [
  "evidence",
  "scenario",
  "readout",
  "decisions"
];

const AI_FLUENCY_ASSESSMENT_PREVIEW_URL = "/ai-fluency/assessment-24-item.html";
const AI_FLUENCY_RESULTS_PREVIEW_URL = "/ai-fluency/organizational-results.html";
const AI_FLUENCY_CLIENT_ASSESSMENT_URL =
  "https://explore-your-ai-fluency-instruments.glean.chatgpt-team.site/24-item";

const StatusPill = ({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "warn" | "good" }) => (
  <span className={`ai-value-pill ai-value-pill-${tone}`}>{label}</span>
);

const scenarioInputTone = (status: string): "good" | "warn" | "neutral" => {
  if (status === "Ready to model") return "good";
  if (status === "Missing input" || status === "Awaiting review" || status === "Needs owner review") {
    return "warn";
  }
  return "neutral";
};

const currentPageFromPath = (pathname: string): WorkspacePageSlug => {
  const raw = pathname.replace(/\/+$/, "").split("/ai-value-workspace/")[1];
  const slug = raw?.split("/")[0] as WorkspacePageSlug | undefined;
  return slug && workspacePageBySlug.has(slug) ? slug : "home";
};

const workspacePageStatus = (
  slug: WorkspacePageSlug,
  journey: ReturnType<typeof useAiValueJourney>
): { label: string; tone: "good" | "warn" | "neutral" } => {
  if (slug === "home") {
    return { label: "Overview", tone: "neutral" };
  }

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

const blueprintDecisionGuidance = [
  {
    owner: "Support Operations",
    nextStep: "Define the pilot boundary before metrics mapping."
  },
  {
    owner: "Support Operations and value-readout owner",
    nextStep: "Confirm baseline and comparison ownership before evidence collection."
  },
  {
    owner: "Workflow owner",
    nextStep: "Capture operating changes so scenario language stays caveated."
  }
];

const aiFluencyDimensions = [
  {
    label: "Confidence",
    detail: "How ready people feel to use AI in real work."
  },
  {
    label: "Usage Quality",
    detail: "Whether AI use is thoughtful, verified, and task-fit."
  },
  {
    label: "Behavior Change",
    detail: "Where AI is starting to change how work gets done."
  },
  {
    label: "Leadership Reinforcement",
    detail: "Whether managers and leaders are making AI adoption practical."
  },
  {
    label: "Capability Growth",
    detail: "Which skills need reinforcement before workflow change can scale."
  }
];

export const AIValueWorkspace = () => {
  const location = useLocation();
  const activePageSlug = currentPageFromPath(location.pathname);
  const activePage = workspacePageBySlug.get(activePageSlug) ?? workspacePages[0];
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
  const valueSignals = live?.valueSignals ?? aiValueWorkspace.valueSignals;
  const valueStory = live?.valueStory ?? aiValueWorkspace.valueStory;
  const evidenceChecks = live?.evidenceChecks ?? aiValueWorkspace.evidenceChecks;
  const safeLanguage = live?.safeLanguage ?? aiValueWorkspace.safeLanguage;
  const executiveBrief = live
    ? {
        sponsorDecision: live.executiveBrief.sponsorDecision,
        summary: live.executiveBrief.summary,
        sponsorQuestion: aiValueWorkspace.executiveBrief.sponsorQuestion,
        nextAction: live.executiveBrief.nextAction
      }
    : aiValueWorkspace.executiveBrief;

  return (
    <main className="ai-value-shell">
      <header className="ai-value-topbar">
        <div>
          <p className="eyebrow">Client Value Workspace</p>
          <h1>AI Value Workspace</h1>
          <p>AI Fluency baseline, VBD map, value actions.</p>
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

      <nav className="ai-value-workspace-nav" aria-label="AI value workspace pages">
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

      {activePageSlug !== "metrics" && (
        <WorkspacePageGuide
          page={activePage}
          pageSlug={activePageSlug}
          status={workspacePageStatus(activePageSlug, journey)}
        />
      )}

      {realEvidencePageSlugs.includes(activePageSlug) && (
        <RealEvidenceStatusPanel
          status={journey.realEvidenceStatus}
          onUseRealEvidence={() => void journey.materializeRealEvidence()}
        />
      )}

      {activePageSlug === "home" && (
        <AggregateEvidenceIntakePanel
          status={journey.realEvidenceStatus}
          onUseRealEvidence={() => void journey.materializeRealEvidence()}
        />
      )}

      {activePageSlug === "home" && (
        <WorkspaceHome
          journey={journey}
          workflowName={workflowName}
          valueRouteLabel={valueRouteLabel}
          decisionLabel={decisionLabel}
        />
      )}

      {activePageSlug === "readiness" && (
        <ReadinessPage live={live} journey={journey} />
      )}

      {activePageSlug === "blueprint" && (
        <BlueprintPage live={live} journey={journey} />
      )}

      {activePageSlug === "metrics" && (
        <MetricsPage
          journey={journey}
          status={workspacePageStatus(activePageSlug, journey)}
          valueSignals={valueSignals}
        />
      )}

      {activePageSlug === "evidence" && (
        <EvidencePage journey={journey} evidenceChecks={evidenceChecks} />
      )}

      {activePageSlug === "scenario" && (
        <ScenarioPage
          journey={journey}
          valueStory={valueStory}
          safeLanguage={safeLanguage}
        />
      )}

      {activePageSlug === "case" && <ValueEvidenceCasePanel />}

      {activePageSlug === "readout" && (
        <ReadoutPage journey={journey} executiveBrief={executiveBrief} />
      )}

      {activePageSlug === "decisions" && (
        <DecisionsPage journey={journey} />
      )}

      {activePageSlug !== "home" && (
        <WorkspacePageHandoff currentSlug={activePageSlug} />
      )}
    </main>
  );
};

type Journey = ReturnType<typeof useAiValueJourney>;
type WorkspaceLive = ReturnType<typeof useAiValueWorkspace>["live"];

const AggregateEvidenceIntakePanel = ({
  status,
  onUseRealEvidence
}: {
  status: Journey["realEvidenceStatus"];
  onUseRealEvidence: () => void;
}) => {
  const intakeSteps = [
    {
      label: "Customer-side aggregate package",
      state: status.canRunMaterializer ? "Ready for review" : "Needs Blueprint and Metrics",
      tone: status.canRunMaterializer ? "good" as const : "warn" as const,
      detail: "Sanitized aggregate evidence only; no raw rows, direct identifiers, prompts, or transcripts."
    },
    {
      label: "Approved evidence package",
      state: status.available ? "Accepted for workspace use" : "Ready after review",
      tone: status.available ? "good" as const : "neutral" as const,
      detail: "Connects aggregate AI activity plus baseline and comparison outcome records when they are safe to use."
    },
    {
      label: "Workspace evidence view",
      state: status.available ? "Workspace evidence connected" : "Not connected yet",
      tone: status.available ? "good" as const : "neutral" as const,
      detail: "Makes the approved evidence available to the focused workspace pages."
    },
    {
      label: "Safe value language",
      state: status.outcomeReviewLabel,
      tone: status.statusTone,
      detail: "The evidence can inform scenario review; stronger claims wait for customer review and caveats."
    }
  ];

  return (
    <section
      className="ai-value-panel ai-value-intake-panel"
      aria-label="Evidence connection"
    >
      <div className="ai-value-section-head">
        <div>
          <p className="eyebrow">Newest View</p>
          <h3>Evidence Connection</h3>
          <p>
            Use this to connect approved aggregate evidence to the workspace
            without turning it into a score or value claim.
          </p>
        </div>
        <StatusPill label={status.statusLabel} tone={status.statusTone} />
      </div>

      <div className="ai-value-intake-flow">
        {intakeSteps.map((step, index) => (
          <div className="ai-value-intake-step" key={step.label}>
            <span className="ai-value-phase-number">{index + 1}</span>
            <div>
              <span className="ai-value-map-label">{step.label}</span>
              <strong>{step.state}</strong>
              <p>{step.detail}</p>
            </div>
            <StatusPill label={step.state} tone={step.tone} />
          </div>
        ))}
      </div>

      <div className="ai-value-intake-footer">
        <div>
          <strong>This view does not calculate ROI, prove causality, or rank people.</strong>
          <p>
            It only shows whether aggregate evidence can safely support evidence
            readiness, customer outcome review, scenario planning, and the
            executive readout.
          </p>
        </div>
        <button
          className="ai-value-step active"
          type="button"
          disabled={!status.canRunMaterializer || status.materializerRunning}
          onClick={onUseRealEvidence}
        >
          {status.materializerRunning ? "Checking evidence..." : "Connect approved evidence"}
        </button>
      </div>
      {status.materializerError && <p role="alert">{status.materializerError}</p>}
    </section>
  );
};

const RealEvidenceStatusPanel = ({
  status,
  onUseRealEvidence
}: {
  status: Journey["realEvidenceStatus"];
  onUseRealEvidence: () => void;
}) => {
  const statusToneClass = `ai-value-evidence-status-${status.statusTone}`;

  return (
    <section
      className="ai-value-panel ai-value-real-evidence-panel"
      aria-label="Evidence readiness decision"
    >
      <div className="ai-value-section-head">
        <div>
          <p className="eyebrow">Evidence Readiness</p>
          <h3>Can we use this evidence?</h3>
          <p>{status.summary}</p>
        </div>
      </div>

      <div className={`ai-value-real-evidence-status ${statusToneClass}`}>
        <div>
          <span className="ai-value-map-label">Current status</span>
          <strong>{status.statusLabel}</strong>
          <p>{status.nextAction}</p>
        </div>
        <button
          className="ai-value-step active"
          type="button"
          disabled={!status.canRunMaterializer || status.materializerRunning}
          onClick={onUseRealEvidence}
        >
          {status.materializerRunning ? "Checking evidence..." : "Connect approved evidence"}
        </button>
      </div>

      <div className="ai-value-real-evidence-checklist" aria-label="Evidence readiness checklist">
        {status.coverage.map((item) => (
          <div className="ai-value-evidence-row" key={item.label}>
            <span className={`ai-value-evidence-dot ai-value-evidence-dot-${item.stateTone}`} aria-hidden="true" />
            <div>
              <strong>{item.label}</strong>
              <p>{item.detail}</p>
            </div>
            <span className="ai-value-evidence-row-state">{item.stateLabel}</span>
          </div>
        ))}
      </div>

      <div className="ai-value-real-evidence-context">
        <div>
          <span className="ai-value-map-label">Activity context</span>
          <strong>{status.velocityObservationLabel}</strong>
          <p>Aggregate activity context only, not economic proof.</p>
        </div>
        <div>
          <span className="ai-value-map-label">Outcome review</span>
          <strong>{status.outcomeReviewLabel}</strong>
          <p>Customer outcome evidence still needs review before stronger value language.</p>
        </div>
      </div>

      {status.heldReasons.length > 0 && (
        <div className="ai-value-real-evidence-held">
          <h4>Held before stronger value language</h4>
          <ul>
            {status.heldReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="ai-value-real-evidence-actions">
        {status.materializerError && <p role="alert">{status.materializerError}</p>}
        <p>
          This only updates the workspace evidence view; it does not contact the
          customer or create a value claim.
        </p>
      </div>
    </section>
  );
};

const WorkspacePageHandoff = ({ currentSlug }: { currentSlug: WorkspacePageSlug }) => {
  const currentIndex = workspacePages.findIndex((page) => page.slug === currentSlug);
  const current = workspacePages[currentIndex];
  const previous = currentIndex > 0 ? workspacePages[currentIndex - 1] : null;
  const next =
    currentSlug === "decisions"
      ? workspacePageBySlug.get("blueprint")
      : workspacePages[currentIndex + 1];
  const nextLabel = currentSlug === "decisions" ? "Return to" : "Continue to";

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

const WorkspacePageGuide = ({
  page,
  pageSlug,
  status
}: {
  page: (typeof workspacePages)[number];
  pageSlug: WorkspacePageSlug;
  status: { label: string; tone: "good" | "warn" | "neutral" };
}) => {
  const pageIndex = workspacePages.findIndex((item) => item.slug === pageSlug);
  const stepLabel = pageSlug === "home" ? "Start here" : `Step ${pageIndex + 1} of ${workspacePages.length}`;

  return (
    <section className="ai-value-page-guide" aria-label={`${page.label} guide`}>
      <div className="ai-value-page-guide-main">
        <div className="ai-value-guide-kicker">
          <span>{stepLabel}</span>
          <StatusPill label={status.label} tone={status.tone} />
        </div>
        <h2>{page.label}</h2>
        <p>{page.detail}</p>
      </div>
      <div className="ai-value-page-guide-action">
        <span className="ai-value-map-label">Next action</span>
        <strong>{page.doNow}</strong>
        <Link className="ai-value-step active" to={page.primaryActionPath}>
          {page.primaryActionLabel}
        </Link>
      </div>
      <div className="ai-value-page-guide-needs">
        <span className="ai-value-map-label">You need</span>
        <ul>
          {page.needs.map((need) => (
            <li key={need}>{need}</li>
          ))}
        </ul>
      </div>
    </section>
  );
};

const WorkspaceHome = ({
  journey,
  workflowName,
  valueRouteLabel,
  decisionLabel
}: {
  journey: Journey;
  workflowName: string;
  valueRouteLabel: string;
  decisionLabel: string;
}) => (
  <>
    <section className="ai-value-home-grid" aria-label="Workspace command center">
      <article className="ai-value-panel ai-value-summary">
        <h3>Current client value thread</h3>
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
            <span className="ai-value-map-label">Claim mode</span>
            <strong>{aiValueWorkspace.claimModeLabel}</strong>
          </div>
        </div>
      </article>

      <article className="ai-value-panel">
        <h3>How to use this workspace</h3>
        <ol className="ai-value-short-list">
          <li>Establish the AI Fluency baseline.</li>
          <li>Plot Velocity, Breadth, and Depth.</li>
          <li>Connect function metrics.</li>
          <li>Choose the next value action.</li>
        </ol>
      </article>
    </section>

    <VbdMapPanel />

    <section className="ai-value-phase-grid" aria-label="Workspace phase cards">
      {workspacePages.filter((page) => page.slug !== "home").map((page) => (
        <article className="ai-value-panel ai-value-phase-card" key={page.slug}>
          <div className="ai-value-phase-head">
            <span className="ai-value-phase-number">
              {workspacePages.findIndex((item) => item.slug === page.slug) + 1}
            </span>
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

    <ValueSpineTracePanel trace={journey.valueSpineTrace} />
  </>
);

const VbdMapPanel = () => (
  <section className="ai-value-panel ai-value-vbd-panel" aria-label="Velocity Breadth Depth map">
    <div className="ai-value-section-head">
      <div>
        <p className="eyebrow">VBD Map</p>
        <h3>Velocity + Depth show the work pattern</h3>
      </div>
      <StatusPill label="Signals, not scores" tone="good" />
    </div>

    <div className="ai-value-vbd-layout">
      <div className="ai-value-vbd-y-axis">
        <strong>Velocity</strong>
        <span>High</span>
        <span>Low</span>
      </div>
      <div className="ai-value-vbd-grid">
        {vbdQuadrants.map((quadrant) => (
          <article
            className={`ai-value-vbd-quadrant ai-value-vbd-quadrant-${quadrant.tone}`}
            key={quadrant.id}
          >
            <span className="ai-value-map-label">{quadrant.position}</span>
            <h4>{quadrant.label}</h4>
            <p>{quadrant.summary}</p>
            <ul>
              {quadrant.watch.map((signal) => (
                <li key={signal}>{signal}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>

    <div className="ai-value-vbd-footer">
      <strong>Depth</strong>
      <span>Low</span>
      <span>High</span>
      <p>Breadth shows coverage by function, role, or workflow.</p>
    </div>
  </section>
);

const ValueProofChainPanel = ({ journey }: { journey: Journey }) => {
  const proofRows = [
    {
      label: "Metric & outcome",
      value: journey.roiScenarioReadiness.metricName || "Outcome metric not selected",
      detail: journey.roiScenarioReadiness.sourceSystem || "Choose the customer source."
    },
    {
      label: "Evidence & proof",
      value: journey.realEvidenceStatus.statusLabel,
      detail: journey.realEvidenceStatus.outcomeReviewLabel
    },
    {
      label: "Scenario",
      value: journey.roiScenarioReadiness.statusLabel,
      detail:
        journey.roiScenarioReadiness.safeValueLanguage[0] ||
        journey.evidenceScenarioPlan.safeValueLanguage
    },
    {
      label: "Decision",
      value: journey.sponsorDecisionLoop.recommendedOptionLabel,
      detail: journey.sponsorDecisionLoop.nextAction
    }
  ];

  return (
    <section className="ai-value-panel ai-value-proof-chain-panel" aria-label="Value proof chain">
      <div className="ai-value-section-head">
        <div>
          <p className="eyebrow">Value Chain</p>
          <h3>Metrics, evidence, scenario, decision</h3>
        </div>
        <StatusPill label="Proof requires customer data" tone="warn" />
      </div>
      <div className="ai-value-proof-chain-grid">
        {proofRows.map((row) => (
          <article className="ai-value-proof-chain-card" key={row.label}>
            <span className="ai-value-map-label">{row.label}</span>
            <strong>{row.value}</strong>
            <p>{row.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
};

const ReadinessPage = ({ live, journey }: { live: WorkspaceLive; journey: Journey }) => (
  <section className="ai-value-focused-stack" aria-label="AI Fluency workspace">
    <section className="ai-value-panel" aria-label="AI Fluency">
      <div className="ai-value-section-head">
        <div>
          <p className="eyebrow">Post-assessment review</p>
          <h3>AI Fluency is the baseline</h3>
          <p>Review aggregate results by function. Then plot VBD.</p>
        </div>
        <div className="ai-value-chip-row">
          <StatusPill label="Aggregate results only" tone="good" />
          <StatusPill label="Signals, not scores" />
        </div>
      </div>
      <div className="ai-value-client-question-grid">
        {aiFluencyDimensions.map((dimension) => (
          <article className="ai-value-client-question-card" key={dimension.label}>
            <span className="ai-value-map-label">What results tell us</span>
            <strong>{dimension.label}</strong>
            <p>{dimension.detail}</p>
          </article>
        ))}
      </div>
    </section>

    <VbdMapPanel />

    <AiFluencyExperiencePanel />

    {live?.kickoff ? (
      <article className="ai-value-panel">
        <h3>Client kickoff</h3>
        <div className="ai-value-band">
          <h4>{live.kickoff.clientName}</h4>
          <p>{live.kickoff.objectiveStatement}</p>
        </div>
        {live.kickoff.sponsorQuestion && (
          <p>Outcome the sponsor cares about: {live.kickoff.sponsorQuestion}</p>
        )}
        {live.kickoff.objectiveCount > 1 && (
          <p>
            This pilot serves 1 of {live.kickoff.objectiveCount} client objectives in the
            engagement.
          </p>
        )}
        {live.kickoff.successMeasures.length > 0 && (
          <>
            <h4>What the sponsor will measure</h4>
            <ul>
              {live.kickoff.successMeasures.map((measure) => (
                <li key={measure}>{measure}</li>
              ))}
            </ul>
          </>
        )}
        {live.kickoff.fluency && (
          <>
            <h4>Fluency check at kickoff</h4>
            <div className="ai-value-chip-row">
              <StatusPill label={`${live.kickoff.fluency.respondents} participants`} tone="good" />
              <StatusPill label={`Strongest: ${live.kickoff.fluency.strongest}`} tone="good" />
              <StatusPill label={`Biggest gap: ${live.kickoff.fluency.biggestGap}`} tone="warn" />
              {live.kickoff.fluency.withheldGroups > 0 && (
                <StatusPill label={`${live.kickoff.fluency.withheldGroups} small group withheld`} />
              )}
            </div>
            <p>{live.kickoff.fluency.note}</p>
          </>
        )}
      </article>
    ) : (
      <article className="ai-value-panel">
        <h3>AI Fluency connection</h3>
        <p>
          Connect AI Fluency to show aggregate readiness, capability gaps, and
          the sponsor measure before the Blueprint workshop starts.
        </p>
      </article>
    )}

    {journey.valueQuestions.length > 0 && (
      <section className="ai-value-client-questions" aria-label="Client value questions">
        <div className="ai-value-section-head">
          <div>
            <p className="eyebrow">Sponsor View</p>
            <h3>Client Value Questions</h3>
            <p>
              These questions keep readiness tied to business value instead of
              generic training or awareness.
            </p>
          </div>
          <StatusPill label="Governed opportunity view" tone="warn" />
        </div>
        <div className="ai-value-client-question-grid">
          {journey.valueQuestions.map((item) => (
            <article className="ai-value-client-question-card" key={item.question}>
              <span className="ai-value-map-label">{item.question}</span>
              <strong>{item.answer}</strong>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>
    )}
  </section>
);

const AiFluencyExperiencePanel = () => {
  const [previewMode, setPreviewMode] = useState<"assessment" | "results">("assessment");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "unavailable">("idle");
  const showingResults = previewMode === "results";

  const copyClientLink = async () => {
    if (!navigator.clipboard?.writeText) {
      setCopyStatus("unavailable");
      return;
    }

    try {
      await navigator.clipboard.writeText(AI_FLUENCY_CLIENT_ASSESSMENT_URL);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("unavailable");
    }
  };

  return (
    <section
      className="ai-value-panel ai-fluency-experience-panel"
      aria-label="AI Fluency experience"
    >
      <div className="ai-value-section-head">
        <div>
          <p className="eyebrow">Client assessment</p>
          <h3>Send AI Fluency and view results</h3>
          <p>
            Use this first when the organization has not completed AI Fluency:
            preview the assessment, share the hosted completion link, then
            switch into aggregate results once responses are collected.
          </p>
        </div>
        <StatusPill label={showingResults ? "Aggregate results preview" : "Client assessment preview"} tone="good" />
      </div>

      <div className="ai-fluency-action-row">
        <div className="ai-fluency-share-box">
          <span className="ai-value-map-label">Send this link to clients</span>
          <a
            className="ai-fluency-client-link"
            href={AI_FLUENCY_CLIENT_ASSESSMENT_URL}
            target="_blank"
            rel="noreferrer"
          >
            {AI_FLUENCY_CLIENT_ASSESSMENT_URL}
          </a>
        </div>
        <div className="ai-fluency-controls">
          <a
            className="ai-value-step"
            href={AI_FLUENCY_CLIENT_ASSESSMENT_URL}
            target="_blank"
            rel="noreferrer"
          >
            Open client assessment
          </a>
          <button className="ai-value-step" type="button" onClick={() => void copyClientLink()}>
            Copy client link
          </button>
          <button
            className={showingResults ? "ai-value-step active" : "ai-value-step"}
            type="button"
            onClick={() => setPreviewMode(showingResults ? "assessment" : "results")}
          >
            {showingResults ? "Show assessment" : "Show aggregate results"}
          </button>
        </div>
      </div>

      <p className="ai-fluency-copy-status" aria-live="polite">
        {copyStatus === "copied"
          ? "Client link copied"
          : copyStatus === "unavailable"
            ? "Copy unavailable in this browser"
            : "Hosted links are the client-share path; local previews are for this workspace."}
      </p>

      <iframe
        className="ai-fluency-preview-frame"
        src={showingResults ? AI_FLUENCY_RESULTS_PREVIEW_URL : AI_FLUENCY_ASSESSMENT_PREVIEW_URL}
        title={showingResults ? "AI Fluency aggregate results preview" : "AI Fluency assessment preview"}
      />
    </section>
  );
};

const BlueprintPage = ({ live, journey }: { live: WorkspaceLive; journey: Journey }) => {
  const [focusedDecision, setFocusedDecision] = useState(
    aiValueWorkspace.canvas.openDecisions[0] ?? "Choose the first client decision to resolve."
  );
  const focusedDecisionIndex = Math.max(
    aiValueWorkspace.canvas.openDecisions.indexOf(focusedDecision),
    0
  );
  const focusedGuidance =
    blueprintDecisionGuidance[focusedDecisionIndex] ?? blueprintDecisionGuidance[0];

  return (
    <section className="ai-value-focused-stack" aria-label="Blueprint workspace">
      <section className="ai-value-handoff-panel" aria-label="Selected workflow from Journey">
        <div>
          <p className="eyebrow">Journey Handoff</p>
          <h3>Selected workflow from Journey</h3>
          <p>
            {journey.workflowHandoff.selected
              ? "This is the same workflow selected in Blueprint and summarized in the Journey."
              : journey.workflowHandoff.summary}
          </p>
        </div>
        <div className="ai-value-handoff-facts">
          <div>
            <span className="ai-value-map-label">Workflow</span>
            <strong>{journey.workflowHandoff.workflowName}</strong>
          </div>
          <div>
            <span className="ai-value-map-label">Value route</span>
            <strong>{journey.workflowHandoff.valueRouteLabel}</strong>
          </div>
          <div>
            <span className="ai-value-map-label">Evidence status</span>
            <strong>{journey.workflowHandoff.evidenceStatus}</strong>
          </div>
        </div>
        <div className="ai-value-chip-row">
          {journey.workflowHandoff.selected ? (
            <Link className="ai-value-step" to="/ai-value-journey">
              Back to Journey
            </Link>
          ) : (
            <Link className="ai-value-step" to="/ai-value-discovery">
              Open Blueprint workshop
            </Link>
          )}
        </div>
      </section>

      {live?.kickoff && (
        <article className="ai-value-panel">
          <h3>Client kickoff context</h3>
          <p>{live.kickoff.objectiveStatement}</p>
        </article>
      )}

      <section className="ai-value-blueprint-canvas" aria-label="Blueprint workshop board">
        <div className="ai-value-section-head">
          <div>
            <p className="eyebrow">Client Working Board</p>
            <h3>Blueprint workshop board</h3>
            <p>
              Build the workshop canvas with the client: align the current workflow,
              target workflow, open decisions, and the next evidence handoff.
            </p>
          </div>
          <StatusPill label={journey.workflowHandoff.valueRouteLabel} tone="good" />
        </div>

        <div className="ai-value-blueprint-flow">
          <div className="ai-value-blueprint-lane">
            <h4>Current workflow</h4>
            <ol>
              {aiValueWorkspace.canvas.today.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
          <div className="ai-value-blueprint-lane">
            <h4>Target workflow</h4>
            <ol>
              {aiValueWorkspace.canvas.target.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        </div>

        <div className="ai-value-blueprint-insight-grid">
          <section className="ai-value-blueprint-note" aria-label="Workshop focus">
            <h4>Workshop focus</h4>
            <p>{focusedDecision}</p>
            <div className="ai-value-chip-row">
              <StatusPill label={focusedGuidance.owner} tone="warn" />
              <StatusPill label="Needs client agreement" />
            </div>
            <p>{focusedGuidance.nextStep}</p>
          </section>
          <section className="ai-value-blueprint-note" aria-label="Client decisions to resolve">
            <h4>Client decisions to resolve</h4>
            <div className="ai-value-blueprint-decision-list">
              {aiValueWorkspace.canvas.openDecisions.map((decision) => (
                <button
                  className={`toggle-button ${
                    focusedDecision === decision ? "active" : ""
                  }`}
                  type="button"
                  key={decision}
                  aria-pressed={focusedDecision === decision}
                  onClick={() => setFocusedDecision(decision)}
                >
                  Focus decision: {decision}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="ai-value-blueprint-handoff-grid">
          <div className="ai-value-blueprint-handoff">
            <h4>Feeds Metrics and ROI opportunity mapping</h4>
            <p>Turn the focused decision into the outcome measure, source owner, and comparison rule.</p>
            <Link className="ai-value-step" to="/ai-value-workspace/metrics">
              Open Metrics mapping
            </Link>
          </div>
          <div className="ai-value-blueprint-handoff">
            <h4>Feeds Evidence readiness</h4>
            <p>Clarify the aggregate customer export and what FluencyTracr evidence can safely support.</p>
            <Link className="ai-value-step" to="/ai-value-workspace/evidence">
              Prepare evidence ask
            </Link>
          </div>
          <div className="ai-value-blueprint-handoff">
            <h4>Feeds governed value scenario</h4>
            <p>Carry assumptions forward as scenario inputs, never as ROI proof or causality.</p>
            <Link className="ai-value-step" to="/ai-value-workspace/scenario">
              Open Scenario builder
            </Link>
          </div>
        </div>
      </section>
    </section>
  );
};

const MetricsPage = ({
  journey,
  status,
  valueSignals
}: {
  journey: Journey;
  status: { label: string; tone: "good" | "warn" | "neutral" };
  valueSignals: typeof aiValueWorkspace.valueSignals;
}) => {
  const primarySignal = valueSignals[0] ?? {
    measure: "Outcome metric",
    source: "Customer-owned source system"
  };
  const primaryOpportunity = journey.opportunities[0] ?? {
    id: "example-support-resolution-opportunity",
    workflowName: aiValueWorkspace.workflowName,
    metricName: primarySignal.measure,
    measurementUnit: "hours",
    valueRouteLabel: aiValueWorkspace.valueRouteLabel,
    roiPoint: "Potential capacity opportunity; not a realized value claim.",
    gleanEvidence:
      "Glean and FluencyTracr can show aggregate AI-enabled work patterns around this process.",
    sourceSystem: primarySignal.source,
    approvedGrain: "aggregate workflow window",
    baselineRule: "Baseline and comparison windows must be approved by the customer owner.",
    customerDataNeeded: `${primarySignal.source} at aggregate workflow window; baseline and comparison windows approved by Support Operations.`,
    status: "Needs customer evidence",
    nextValidationStep:
      "Ask Support Operations for baseline and comparison exports before scenario language moves forward.",
    scenarioHandoff:
      "Model as a value scenario after the customer owner confirms baseline, comparison, assumptions, and data source.",
    claimBoundary: "Modeled opportunity only; report with caveats after evidence review."
  };
  const primaryBridgeItem = journey.questionMetricBridge.items[0] ?? null;
  const evidenceStatus =
    journey.customerEvidenceReview.statusLabel || primaryOpportunity.status || "Needs customer evidence";
  const mapStatusLabel =
    primaryOpportunity.status === "Customer export awaiting review"
      ? "Needs evidence review"
      : primaryOpportunity.status;
  const nextGatedAction =
    primaryOpportunity.nextValidationStep ??
    journey.customerEvidenceRequest.nextAction ??
    "Map a governed metric before evidence or scenario work moves forward.";
  const metricOwner = primaryBridgeItem?.owner ?? "Not assigned yet";
  const missingBeforeEvidence = primaryBridgeItem
    ? "Baseline and comparison windows"
    : "Sponsor measure and data owner";

  return (
    <section className="ai-value-focused-stack" aria-label="Metrics workspace">
      <section
        className="ai-value-panel ai-value-metrics-command-panel"
        aria-label="Metrics & ROI Opportunities guide"
      >
        <div className="ai-value-metrics-command-head">
          <div className="ai-value-metrics-command-main">
            <div className="ai-value-guide-kicker">
              <span>Step 4 of 8</span>
              <StatusPill label={status.label} tone={status.tone} />
            </div>
            <h2>Metrics &amp; ROI Opportunities</h2>
            <p>
              Blueprint selected the workflow. This page turns that workflow into a client-owned
              measurement choice: accept the starting metric, choose a different candidate, or
              capture a KPI the client names.
            </p>
          </div>
          <div className="ai-value-metrics-decision-card">
            <span className="ai-value-map-label">Choice to make</span>
            <strong>What should we ask the data owner for?</strong>
            <p>
              Leave this page with one metric, its source system, an owner, and the comparison
              window needed for evidence review.
            </p>
            <Link className="ai-value-step active" to="/ai-value-workspace/evidence">
              Prepare Evidence Ask
            </Link>
          </div>
        </div>
        <div className="ai-value-metrics-flow" aria-label="How metrics choices work">
          <div>
            <span className="ai-value-map-label">Blueprint workflow</span>
            <strong>{primaryOpportunity.workflowName}</strong>
            <p>{primaryOpportunity.valueRouteLabel} is the value route to test.</p>
          </div>
          <div>
            <span className="ai-value-map-label">Starting metric option</span>
            <strong>{primaryOpportunity.metricName}</strong>
            <p>{primaryOpportunity.sourceSystem}</p>
          </div>
          <div>
            <span className="ai-value-map-label">Missing before evidence</span>
            <strong>{missingBeforeEvidence}</strong>
            <p>{metricOwner === "Not assigned yet" ? "Assign the client-side owner before requesting data." : metricOwner}</p>
          </div>
          <div>
            <span className="ai-value-map-label">Next step</span>
            <strong>Prepare the evidence request</strong>
            <p>Evidence Readiness checks whether this can support scenario planning.</p>
          </div>
        </div>
      </section>

      <ClientQuestionMetricBridgePanel bridge={journey.questionMetricBridge} />

      <section
        className="ai-value-panel ai-value-metrics-map-panel"
        aria-label="Outcome and ROI opportunity map"
      >
        <div className="ai-value-section-head">
          <div>
            <p className="eyebrow">Outcome Mapping</p>
            <h3>Metric, evidence ask, and safe value language</h3>
            <p>
              Once the client chooses a metric, this shows what data to request,
              what is still missing, and what value language remains safe.
            </p>
          </div>
          <StatusPill
            label={mapStatusLabel}
            tone={primaryOpportunity.status === "Outcome evidence attached" ? "good" : "warn"}
          />
        </div>

        <>
          <div className="ai-value-metrics-map-hero">
            <div>
              <span className="ai-value-map-label">Blueprint route</span>
              <h4>{primaryOpportunity.workflowName}</h4>
              <p>{primaryOpportunity.valueRouteLabel}</p>
              <small>{primaryOpportunity.roiPoint}</small>
            </div>
            <div>
              <span className="ai-value-map-label">Sponsor question</span>
              <h4>{primaryBridgeItem?.sponsorQuestion ?? "What outcome should this workflow improve?"}</h4>
              <p>
                {primaryBridgeItem?.successMeasure ??
                  "Confirm the client success measure in Blueprint."}
              </p>
            </div>
          </div>

          <div className="ai-value-metrics-path">
            <div className="ai-value-metrics-step">
              <span className="ai-value-map-label">Outcome to measure</span>
              <strong>{primaryOpportunity.metricName}</strong>
              <p>{primaryOpportunity.measurementUnit}</p>
            </div>
            <div className="ai-value-metrics-step">
              <span className="ai-value-map-label">Customer data needed</span>
              <strong>{primaryOpportunity.sourceSystem}</strong>
              <p>{primaryOpportunity.customerDataNeeded}</p>
              <small>Baseline and comparison window: {primaryOpportunity.baselineRule}</small>
            </div>
            <div className="ai-value-metrics-step">
              <span className="ai-value-map-label">Evidence gap</span>
              <strong>{evidenceStatus}</strong>
              <p>{primaryOpportunity.gleanEvidence}</p>
            </div>
            <div className="ai-value-metrics-step">
              <span className="ai-value-map-label">Safe value language</span>
              <p>{primaryOpportunity.claimBoundary}</p>
              <small>{primaryOpportunity.scenarioHandoff}</small>
            </div>
            <div className="ai-value-metrics-step ai-value-metrics-step-wide">
              <span className="ai-value-map-label">Next gated action</span>
              <strong>{nextGatedAction}</strong>
              <p>
                This prepares the evidence request and scenario builder; it does not
                create a realized value claim.
              </p>
              <div className="ai-value-chip-row">
                <Link className="ai-value-step" to="/ai-value-workspace/evidence">
                  Prepare evidence ask
                </Link>
                <Link className="ai-value-step" to="/ai-value-workspace/scenario">
                  Open Scenario builder
                </Link>
              </div>
            </div>
          </div>
        </>
      </section>

      <article className="ai-value-panel ai-value-signal-shortlist-panel" aria-label="Candidate outcome metrics">
        <div className="ai-value-section-head">
          <div>
            <p className="eyebrow">Metric Options</p>
            <h3>Metric options the client can choose from</h3>
            <p>
              These options are suggested from the Blueprint workflow and value route.
              Use them as starting points; add another metric when the client names a
              different KPI or source system.
            </p>
          </div>
          <StatusPill label="Client confirms" tone="good" />
        </div>
        <div className="ai-value-signal-guidance" aria-label="Metric candidate guidance">
          <div>
            <span className="ai-value-map-label">Why these appear</span>
            <p>Blueprint workflow, value route, and available metric definitions.</p>
          </div>
          <div>
            <span className="ai-value-map-label">Who decides</span>
            <p>The client sponsor and data owner choose the metric to carry forward.</p>
          </div>
          <div>
            <span className="ai-value-map-label">When to add another</span>
            <p>Yes. Add more when the client names another KPI or source system.</p>
          </div>
        </div>
        <div className="ai-value-signal-shortlist" aria-label="Candidate outcome metric cards">
          {valueSignals.map((signal) => (
            <article className="ai-value-signal-card" key={signal.question}>
              <div>
                <span className="ai-value-map-label">Question to ask</span>
                <h4>{signal.question}</h4>
              </div>
              <div>
                <span className="ai-value-map-label">Possible metric</span>
                <p>{signal.measure}</p>
              </div>
              <small>Likely source: {signal.source}</small>
              <StatusPill label={signal.status} tone={signal.status === "Needs owner" ? "warn" : "good"} />
            </article>
          ))}
        </div>
      </article>
    </section>
  );
};

const EvidenceToValuePathPanel = ({ journey }: { journey: Journey }) => {
  const metricBridge = journey.questionMetricBridge.items[0] ?? null;
  const aggregateEvidence =
    journey.evidenceScenarioPlan.canTrust[0] ??
    "Aggregate Glean and FluencyTracr work patterns can shape the value conversation.";
  const outcomeEvidence =
    journey.customerEvidenceReview.statusLabel ||
    journey.customerEvidenceRequest.statusLabel ||
    journey.evidenceScenarioPlan.needsClientEvidence[0] ||
    "Customer outcome evidence still needs owner review.";
  const scenarioReadiness = journey.roiScenarioReadiness.statusLabel;
  const safeValueLanguage =
    metricBridge?.allowedClaimLevel ??
    journey.evidenceScenarioPlan.safeValueLanguage ??
    journey.roiScenarioReadiness.safeValueLanguage[0] ??
    "Keep value language in planning mode until evidence improves.";
  const nextAction =
    journey.roiScenarioReadiness.nextAction ||
    journey.evidenceScenarioPlan.nextClientAction ||
    journey.customerEvidenceReview.nextAction;
  const blockedOutputs = Array.from(
    new Set([
      "No realized ROI claim",
      "No customer-facing economic figures",
      "No causality claim",
      ...(journey.roiScenarioReadiness.blockedOutputs.length > 0
        ? journey.roiScenarioReadiness.blockedOutputs
        : [])
    ])
  );

  return (
    <section
      className="ai-value-panel ai-value-evidence-value-panel"
      aria-label="Evidence summary"
    >
      <div className="ai-value-section-head">
        <div>
          <p className="eyebrow">Evidence Summary</p>
          <h3>What can we say now?</h3>
          <p>
            Decide whether the sponsor readout can include value language, or
            whether it should stay in planning mode.
          </p>
        </div>
        <StatusPill label={outcomeEvidence} tone={journey.customerEvidenceReview.statusTone} />
      </div>

      <div className="ai-value-evidence-value-path">
        <div className="ai-value-evidence-value-step">
          <span className="ai-value-map-label">Glean evidence</span>
          <strong>{aggregateEvidence}</strong>
          <p>Use this as adoption context, not as business-outcome proof.</p>
        </div>
        <div className="ai-value-evidence-value-step">
          <span className="ai-value-map-label">Customer data</span>
          <strong>{outcomeEvidence}</strong>
          <p>{journey.customerEvidenceReview.summary}</p>
        </div>
        <div className="ai-value-evidence-value-step">
          <span className="ai-value-map-label">Can we model value?</span>
          <strong>{scenarioReadiness}</strong>
          <p>{journey.roiScenarioReadiness.evidenceStatus}</p>
        </div>
        <div className="ai-value-evidence-value-step">
          <span className="ai-value-map-label">What we can say</span>
          <p>{safeValueLanguage}</p>
        </div>
        <div className="ai-value-evidence-value-step">
          <span className="ai-value-map-label">What not to claim</span>
          <div className="ai-value-chip-row">
            {blockedOutputs.map((output) => (
              <StatusPill key={output} label={output} />
            ))}
          </div>
        </div>
        <div className="ai-value-evidence-value-step ai-value-evidence-value-step-wide">
          <span className="ai-value-map-label">Next step</span>
          <strong>{nextAction}</strong>
          <p>
            Keep the readout in planning language until the client-owned data
            and assumptions are ready.
          </p>
          <div className="ai-value-chip-row">
            <Link className="ai-value-step" to="/ai-value-workspace/scenario">
              Open Scenario builder
            </Link>
            <Link className="ai-value-step" to="/ai-value-workspace/readout">
              Open Executive readout
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

const SponsorOperatingWorkflowPanel = ({ journey }: { journey: Journey }) => {
  const recommendedOption = journey.sponsorDecisionLoop.options.find(
    (option) => option.recommended
  );
  const handoffTarget =
    recommendedOption?.feedsNext.length === 2
      ? `${recommendedOption.feedsNext[0]} and ${recommendedOption.feedsNext[1]}`
      : recommendedOption?.feedsNext.join(", ") ?? "Executive Readout and Sponsor Decisions";
  const handoffAction =
    recommendedOption?.action ?? journey.sponsorDecisionLoop.nextAction;

  const steps = [
    {
      label: "Readout preview",
      status: journey.executiveReadoutPreview.statusLabel,
      detail: journey.executiveReadoutPreview.whatWillOpen,
      feedsNext: "Prepares the sponsor decision"
    },
    {
      label: "Sponsor decision",
      status: journey.sponsorDecisionLoop.statusLabel,
      detail: `Recommended: ${journey.sponsorDecisionLoop.recommendedOptionLabel}`,
      feedsNext: journey.sponsorDecisionLoop.recommendedReason
    },
    {
      label: "Handoff draft",
      status: handoffTarget,
      detail: handoffAction,
      feedsNext: "Prepares the next owner without creating a task."
    },
    {
      label: "Next operating loop",
      status: "Governed follow-up",
      detail: journey.sponsorDecisionLoop.nextAction,
      feedsNext: journey.sponsorDecisionLoop.caveat
    }
  ];

  return (
    <section
      className="ai-value-panel ai-value-sponsor-workflow-panel"
      aria-label="Sponsor operating workflow"
    >
      <div className="ai-value-section-head">
        <div>
          <p className="eyebrow">Sponsor Workflow</p>
          <h3>Sponsor Operating Workflow</h3>
          <p>
            Turn the readout into a sponsor decision, bounded handoff, and next
            operating loop without making unsupported value claims.
          </p>
        </div>
        <StatusPill label={journey.sponsorDecisionLoop.statusLabel} tone={journey.sponsorDecisionLoop.statusTone} />
      </div>

      <div className="ai-value-sponsor-workflow-path">
        {steps.map((step, index) => (
          <article className="ai-value-sponsor-workflow-step" key={step.label}>
            <span className="ai-value-step-number">{index + 1}</span>
            <div>
              <span className="ai-value-map-label">{step.label}</span>
              <strong>{step.status}</strong>
              <p>{step.detail}</p>
              <small>{step.feedsNext}</small>
            </div>
          </article>
        ))}
      </div>

      <div className="ai-value-sponsor-workflow-footer">
        <p>No task is created; no customer action is automated.</p>
        <div className="ai-value-chip-row">
          <Link className="ai-value-step" to="/ai-value-workspace/readout">
            Open Executive readout
          </Link>
          <Link className="ai-value-step" to="/ai-value-workspace/decisions">
            Open Sponsor decisions
          </Link>
        </div>
      </div>
    </section>
  );
};

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

const EvidencePage = ({
  journey,
  evidenceChecks
}: {
  journey: Journey;
  evidenceChecks: typeof aiValueWorkspace.evidenceChecks;
}) => (
  <section className="ai-value-focused-stack" aria-label="Evidence workspace">
    <EvidenceToValuePathPanel journey={journey} />

    <article className="ai-value-panel">
      <div className="ai-value-section-head">
        <div>
          <p className="eyebrow">Evidence Checklist</p>
          <h3>What do we have?</h3>
          <p>
            Check the basics before the readout uses stronger value language.
          </p>
        </div>
        <StatusPill label="Aggregate only" tone="good" />
      </div>
      <div className="ai-value-table" role="table" aria-label="Evidence checks">
        {evidenceChecks.map((check) => (
          <div className="ai-value-row ai-value-evidence-row" role="row" key={check.label}>
            <span>{check.label}</span>
            <StatusPill label={check.state} tone={check.state === "Needs input" ? "warn" : "good"} />
            <span>{check.detail}</span>
          </div>
        ))}
      </div>
    </article>

    <article className="ai-value-panel ai-value-evidence-scenario-panel">
      <div className="ai-value-section-head">
        <div>
          <p className="eyebrow">Client Data Needed</p>
          <h3>What are we still looking for?</h3>
          <p>
            Collect these items before the value story moves beyond planning
            language.
          </p>
        </div>
        <StatusPill label={journey.evidenceScenarioPlan.decisionLabel} tone="warn" />
      </div>

      <div className="ai-value-evidence-plan-grid">
        <div className="ai-value-map-cell">
          <span className="ai-value-map-label">Already usable</span>
          <ul>
            {journey.evidenceScenarioPlan.canTrust.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="ai-value-map-cell">
          <span className="ai-value-map-label">Still need from client</span>
          <ul>
            {journey.evidenceScenarioPlan.needsClientEvidence.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="ai-value-map-cell">
          <span className="ai-value-map-label">Current language</span>
          <p>{journey.evidenceScenarioPlan.safeValueLanguage}</p>
        </div>
        <div className="ai-value-map-cell">
          <span className="ai-value-map-label">Next step</span>
          <p>{journey.evidenceScenarioPlan.nextClientAction}</p>
        </div>
      </div>
    </article>

    <CustomerEvidenceRequestPanel request={journey.customerEvidenceRequest} />

    <CustomerEvidenceReviewWorkbench
      review={journey.customerEvidenceReview}
      onReview={(exportId, decision) => void journey.review(exportId, decision)}
    />
  </section>
);

const ScenarioPage = ({
  journey,
  valueStory,
  safeLanguage
}: {
  journey: Journey;
  valueStory: typeof aiValueWorkspace.valueStory;
  safeLanguage: typeof aiValueWorkspace.safeLanguage;
}) => (
  <section className="ai-value-focused-stack" aria-label="Scenario workspace">
    <EvidenceToValuePathPanel journey={journey} />

    <article className="ai-value-panel">
      <h3>Value story options</h3>
      <div className="ai-value-band-grid">
        {valueStory.map((band) => (
          <div className="ai-value-band" key={band.label}>
            <h4>{band.label}</h4>
            <p>{band.interpretation}</p>
          </div>
        ))}
      </div>
    </article>

    <section className="ai-value-panel ai-value-roi-readiness-panel" aria-label="ROI scenario readiness">
      <div className="ai-value-section-head">
        <div>
          <p className="eyebrow">Governed Value Modeling</p>
          <h3>ROI Scenario Readiness</h3>
          <p>
            Shows whether the selected workflow can move from opportunity
            mapping into modeled value language, and which client-owned inputs
            still travel with the Executive Operating Packet.
          </p>
        </div>
        <StatusPill
          label={journey.roiScenarioReadiness.statusLabel}
          tone={journey.roiScenarioReadiness.available ? "good" : "warn"}
        />
      </div>

      <div className="ai-value-map-grid">
        <div className="ai-value-map-cell">
          <span className="ai-value-map-label">Workflow</span>
          <strong>{journey.roiScenarioReadiness.workflowName}</strong>
          <p>{journey.roiScenarioReadiness.valueRouteLabel}</p>
        </div>
        <div className="ai-value-map-cell">
          <span className="ai-value-map-label">Outcome signal</span>
          <strong>{journey.roiScenarioReadiness.metricName}</strong>
          <p>{journey.roiScenarioReadiness.sourceSystem}</p>
          <small>{journey.roiScenarioReadiness.sourceGrain}</small>
        </div>
        <div className="ai-value-map-cell">
          <span className="ai-value-map-label">Evidence status</span>
          <p>{journey.roiScenarioReadiness.evidenceStatus}</p>
        </div>
        <div className="ai-value-map-cell">
          <span className="ai-value-map-label">Next client action</span>
          <p>{journey.roiScenarioReadiness.nextAction}</p>
        </div>
        <div className="ai-value-map-cell ai-value-map-cell-wide">
          <span className="ai-value-map-label">Value modeling inputs</span>
          <div className="ai-value-scenario-input-grid">
            {journey.roiScenarioReadiness.inputs.map((input) => (
              <div className="ai-value-scenario-input" key={input.label}>
                <div>
                  <strong>{input.label}</strong>
                  <p>{input.detail}</p>
                </div>
                <StatusPill label={input.status} tone={scenarioInputTone(input.status)} />
              </div>
            ))}
          </div>
        </div>
        <div className="ai-value-map-cell ai-value-map-cell-wide">
          <span className="ai-value-map-label">Scenario bands</span>
          <div className="ai-value-scenario-band-list">
            {journey.roiScenarioReadiness.scenarioBands.length > 0 ? (
              journey.roiScenarioReadiness.scenarioBands.map((band) => (
                <div className="ai-value-scenario-band" key={band.label}>
                  <strong>{band.label}</strong>
                  <p>{band.interpretation}</p>
                </div>
              ))
            ) : (
              <p>Scenario bands appear after baseline, comparison, and assumptions are ready.</p>
            )}
          </div>
        </div>
        <div className="ai-value-map-cell ai-value-map-cell-wide">
          <span className="ai-value-map-label">Safe value language</span>
          <ul>
            {journey.roiScenarioReadiness.safeValueLanguage.map((language) => (
              <li key={language}>{language}</li>
            ))}
          </ul>
        </div>
        <div className="ai-value-map-cell ai-value-map-cell-wide">
          <span className="ai-value-map-label">Blocked outputs</span>
          <div className="ai-value-chip-row">
            {journey.roiScenarioReadiness.blockedOutputs.map((output) => (
              <StatusPill key={output} label={output} />
            ))}
          </div>
          <p>{journey.roiScenarioReadiness.executiveHandoff}</p>
        </div>
      </div>
    </section>

    <ValueImprovementLoopPanel journey={journey} />

    <article className="ai-value-panel">
      <h3>Safe language</h3>
      <h4>What we can say now</h4>
      <ul>
        {safeLanguage.canSay.map((claim) => (
          <li key={claim}>{claim}</li>
        ))}
      </ul>
      <h4>What needs client validation</h4>
      <ul>
        {safeLanguage.needsValidation.map((caveat) => (
          <li key={caveat}>{caveat}</li>
        ))}
      </ul>
      <h4>What we cannot say</h4>
      <div className="ai-value-chip-row">
        {safeLanguage.cannotSay.map((claim) => (
          <StatusPill key={claim} label={claim} />
        ))}
      </div>
    </article>
  </section>
);

const ReadoutPage = ({
  journey,
  executiveBrief
}: {
  journey: Journey;
  executiveBrief: typeof aiValueWorkspace.executiveBrief;
}) => (
  <section className="ai-value-focused-stack" aria-label="Executive readout workspace">
    <VbdMapPanel />

    <ValueProofChainPanel journey={journey} />

    <SponsorOperatingWorkflowPanel journey={journey} />

    <ExecutiveReadoutPreviewPanel
      preview={journey.executiveReadoutPreview}
      packetIds={journey.packetIds}
      onOpenReadout={(packetId) => void journey.openReadout(packetId)}
    />

    <article className="ai-value-panel ai-value-executive-plan-panel">
      <div className="ai-value-section-head">
        <div>
          <p className="eyebrow">Executive Readout</p>
          <h3>Sponsor decision</h3>
          <p>Show the value posture, caveats, and next owner.</p>
        </div>
        <StatusPill label={journey.executivePlan.packetStatus} tone="good" />
      </div>

      <div className="ai-value-executive-plan-grid">
        <div className="ai-value-map-cell">
          <span className="ai-value-map-label">Sponsor decision</span>
          <p>{journey.executivePlan.sponsorDecision}</p>
        </div>
        <div className="ai-value-map-cell">
          <span className="ai-value-map-label">Recommended next action</span>
          <p>{journey.executivePlan.recommendedNextAction}</p>
        </div>
        <div className="ai-value-map-cell ai-value-map-cell-wide">
          <span className="ai-value-map-label">Owner handoff</span>
          <div className="ai-value-agent-handoff-grid">
            {journey.executivePlan.handoffs.map((handoff) => (
              <div className="ai-value-agent-handoff" key={handoff.role}>
                <strong>{handoff.role}</strong>
                <p>{handoff.task}</p>
                <small>{handoff.guardrail}</small>
              </div>
            ))}
          </div>
        </div>
        <div className="ai-value-map-cell ai-value-map-cell-wide">
          <span className="ai-value-map-label">Do not claim</span>
          <div className="ai-value-chip-row">
            {journey.executivePlan.guardrails.map((guardrail) => (
              <StatusPill key={guardrail} label={guardrail} />
            ))}
          </div>
        </div>
      </div>
    </article>

    <article className="ai-value-panel">
      <h3>Decision for the sponsor</h3>
      <div className="ai-value-band">
        <h4>{executiveBrief.sponsorDecision}</h4>
        <p>{executiveBrief.summary}</p>
      </div>
      <h4>Sponsor question</h4>
      <p>{executiveBrief.sponsorQuestion}</p>
      <h4>Next action</h4>
      <p>{executiveBrief.nextAction}</p>
    </article>
  </section>
);

const DecisionsPage = ({ journey }: { journey: Journey }) => (
  <section className="ai-value-focused-stack" aria-label="Sponsor decisions workspace">
    <SponsorOperatingWorkflowPanel journey={journey} />

    <SponsorDecisionLoopPanel loop={journey.sponsorDecisionLoop} />

    <ValueImprovementLoopPanel journey={journey} />

    <article className="ai-value-panel ai-value-boundary-panel">
      <h3>Safe Value Language</h3>
      <div className="ai-value-boundary-grid">
        <div>
          <h4>Allowed Now</h4>
          <ul>
            <li>Potential ROI opportunity</li>
            <li>Modeled value scenario</li>
            <li>Customer data required</li>
            <li>Reportable with caveats after review</li>
          </ul>
        </div>
        <div>
          <h4>Still Blocked</h4>
          <ul>
            <li>Unsupported ROI proof</li>
            <li>Causality claims</li>
            <li>Individual or manager scoring</li>
            <li>Productivity ranking or HR analytics</li>
          </ul>
        </div>
      </div>
    </article>
  </section>
);
