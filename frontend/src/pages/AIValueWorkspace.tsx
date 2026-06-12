import type { CSSProperties } from "react";
import { Link, useLocation } from "react-router-dom";

import { aiValueWorkspace } from "../constants/aiValueWorkspace";
import { useAiValueWorkspace } from "../hooks/useAiValueWorkspace";
import {
  useAiValueJourney,
  type JourneyStageKey,
  type JourneyStageState
} from "../hooks/useAiValueJourney";
import { ClientQuestionMetricBridgePanel } from "../components/ClientQuestionMetricBridgePanel";
import { ExecutiveReadoutPreviewPanel } from "../components/ExecutiveReadoutPreviewPanel";
import { SponsorDecisionLoopPanel } from "../components/SponsorDecisionLoopPanel";
import { ValueEvidenceCasePanel } from "../components/ValueEvidenceCasePanel";

const workspacePages = [
  {
    slug: "home",
    label: "Value Realization Overview",
    navLabel: "Overview",
    path: "/ai-value-workspace",
    detail: "The value realization spine for this organization.",
    feedsNext: "Start at the AI Fluency baseline."
  },
  {
    slug: "readiness",
    label: "AI Fluency Baseline",
    navLabel: "AI Fluency",
    path: "/ai-value-workspace/readiness",
    detail: "Aggregate fluency results across the organization.",
    feedsNext: "Plot every function on the VBD map."
  },
  {
    slug: "vbd",
    label: "VBD Operating Map",
    navLabel: "VBD Map",
    path: "/ai-value-workspace/vbd",
    detail: "Where each function sits: scale, coach, or redesign.",
    feedsNext: "Connect the outcome metric for the priority function."
  },
  {
    slug: "metrics",
    label: "Outcome Metrics",
    navLabel: "Outcome Metrics",
    path: "/ai-value-workspace/metrics",
    detail: "The function metric each value claim is tested against.",
    feedsNext: "Assemble the value evidence case."
  },
  {
    slug: "case",
    label: "Value Evidence Case",
    navLabel: "Evidence Case",
    path: "/ai-value-workspace/case",
    detail: "What the evidence allows us to say, by function.",
    feedsNext: "Choose the intervention and the retest window."
  },
  {
    slug: "decisions",
    label: "Decision & Retest",
    navLabel: "Decision & Retest",
    path: "/ai-value-workspace/decisions",
    detail: "The sponsor decision and the next measurement cycle.",
    feedsNext: "Intervene, remeasure, and update the evidence case."
  }
] as const;

type WorkspacePageSlug = (typeof workspacePages)[number]["slug"];

const workspacePageBySlug = new Map(workspacePages.map((page) => [page.slug, page]));
const workspaceStageBySlug: Partial<Record<WorkspacePageSlug, JourneyStageKey>> = {
  readiness: "readiness",
  vbd: "blueprint",
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
    id: "fast-shallow",
    label: "Fast but shallow",
    tone: "blue",
    position: "high-velocity low-depth",
    mapCue: "Adoption is ahead of workflow change",
    definition: "AI is spreading quickly, but usage is still shallow or uneven."
  },
  {
    id: "flow",
    label: "High-fluency flow",
    tone: "green",
    position: "high-velocity high-depth",
    mapCue: "AI is embedded enough to scale",
    definition: "AI is spreading and becoming embedded in real workflows."
  },
  {
    id: "low-integration",
    label: "Low integration",
    tone: "red",
    position: "low-velocity low-depth",
    mapCue: "Find the work fit before scaling",
    definition: "AI is not yet a durable part of day-to-day work."
  },
  {
    id: "deep-slow",
    label: "Deep but slow",
    tone: "amber",
    position: "low-velocity high-depth",
    mapCue: "Good use case, slow spread",
    definition: "AI is meaningful where it appears, but adoption is not spreading quickly enough."
  }
] as const;

type VbdQuadrantId = (typeof vbdQuadrants)[number]["id"];

type AiFluencyOrgFunctionCluster = {
  functionArea: string;
  shortLabel: string;
  quadrantId: VbdQuadrantId;
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
    quadrantId: "flow",
    velocity: 88,
    breadth: 86,
    depth: 88
  },
  {
    functionArea: "Product Management",
    shortLabel: "PM",
    quadrantId: "flow",
    velocity: 78,
    breadth: 78,
    depth: 84
  },
  {
    functionArea: "Data & Analytics",
    shortLabel: "Data",
    quadrantId: "flow",
    velocity: 86,
    breadth: 80,
    depth: 76
  },
  {
    functionArea: "IT Systems or Security",
    shortLabel: "IT",
    quadrantId: "flow",
    velocity: 82,
    breadth: 82,
    depth: 68
  },
  {
    functionArea: "Sales or Business Development",
    shortLabel: "Sales",
    quadrantId: "flow",
    velocity: 72,
    breadth: 76,
    depth: 74
  },
  {
    functionArea: "Marketing & Communications",
    shortLabel: "Mktg",
    quadrantId: "fast-shallow",
    velocity: 84,
    breadth: 72,
    depth: 46
  },
  {
    functionArea: "Design / UX / Research",
    shortLabel: "UX",
    quadrantId: "fast-shallow",
    velocity: 74,
    breadth: 64,
    depth: 42
  },
  {
    functionArea: "Corporate Strategy or Business Operations",
    shortLabel: "Biz",
    quadrantId: "fast-shallow",
    velocity: 64,
    breadth: 58,
    depth: 44
  },
  {
    functionArea: "Customer or Account Success",
    shortLabel: "CS",
    quadrantId: "deep-slow",
    velocity: 42,
    breadth: 55,
    depth: 66
  },
  {
    functionArea: "Support or Help Desk",
    shortLabel: "Sup",
    quadrantId: "low-integration",
    velocity: 42,
    breadth: 48,
    depth: 48
  },
  {
    functionArea: "People Talent or Human Resources",
    shortLabel: "HR",
    quadrantId: "low-integration",
    velocity: 34,
    breadth: 42,
    depth: 46
  },
  {
    functionArea: "Finance or Accounting",
    shortLabel: "Fin",
    quadrantId: "low-integration",
    velocity: 26,
    breadth: 38,
    depth: 44
  },
  {
    functionArea: "Legal & Compliance",
    shortLabel: "Leg",
    quadrantId: "low-integration",
    velocity: 18,
    breadth: 30,
    depth: 34
  },
  {
    functionArea: "Field Operations or Logistics",
    shortLabel: "Ops",
    quadrantId: "low-integration",
    velocity: 28,
    breadth: 34,
    depth: 24
  },
  {
    functionArea: "Administrative or Executive Support",
    shortLabel: "Adm",
    quadrantId: "low-integration",
    velocity: 14,
    breadth: 26,
    depth: 22
  },
  {
    functionArea: "Education or Training",
    shortLabel: "L&D",
    quadrantId: "low-integration",
    velocity: 42,
    breadth: 46,
    depth: 36
  },
  {
    functionArea: "Other",
    shortLabel: "Oth",
    quadrantId: "low-integration",
    velocity: 24,
    breadth: 32,
    depth: 31
  }
] satisfies AiFluencyOrgFunctionCluster[];

const vbdBubbleSize = ({ velocity, breadth, depth }: AiFluencyOrgFunctionCluster) => {
  const combinedSignal = (velocity + breadth + depth) / 3;
  return Math.round(30 + (combinedSignal / 100) * 30);
};

const vbdBubbleStyle = (plot: AiFluencyOrgFunctionCluster): CSSProperties =>
  ({
    left: `${plot.depth}%`,
    top: `${100 - plot.velocity}%`,
    "--vbd-bubble-size": `${vbdBubbleSize(plot)}px`
  }) as CSSProperties;

const AI_ORG_FLUENCY_EXAMPLE_URL = "/ai-fluency/organizational-results.html";

const StatusPill = ({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "warn" | "good" }) => (
  <span className={`ai-value-pill ai-value-pill-${tone}`}>{label}</span>
);

// Practitioner working pages were demoted from the executive spine; their old
// links land on the nearest spine step.
const legacySlugRedirects: Record<string, WorkspacePageSlug> = {
  blueprint: "vbd",
  evidence: "case",
  scenario: "case",
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
  const valueSignals = live?.valueSignals ?? aiValueWorkspace.valueSignals;

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

      {activePageSlug === "home" && (
        <WorkspaceHome
          workflowName={workflowName}
          valueRouteLabel={valueRouteLabel}
          decisionLabel={decisionLabel}
        />
      )}

      {activePageSlug === "readiness" && <ReadinessPage />}

      {activePageSlug === "vbd" && <VbdPage />}

      {activePageSlug === "metrics" && (
        <MetricsPage journey={journey} valueSignals={valueSignals} />
      )}

      {activePageSlug === "case" && <ValueEvidenceCasePanel />}

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

const WorkspaceHome = ({
  workflowName,
  valueRouteLabel,
  decisionLabel
}: {
  workflowName: string;
  valueRouteLabel: string;
  decisionLabel: string;
}) => (
  <>
    <section className="ai-value-home-grid" aria-label="Workspace command center">
      <article className="ai-value-panel ai-value-summary">
        <h3>Current value thread</h3>
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
        <h3>The value realization spine</h3>
        <ol className="ai-value-short-list">
          <li>Baseline AI fluency across the organization.</li>
          <li>Plot every function on the VBD map.</li>
          <li>Connect the function outcome metric.</li>
          <li>Assemble the value evidence case.</li>
          <li>Decide, intervene, and remeasure.</li>
        </ol>
      </article>
    </section>

    <section className="ai-value-phase-grid" aria-label="Workspace phase cards">
      {workspacePages.filter((page) => page.slug !== "home").map((page, index) => (
        <article className="ai-value-panel ai-value-phase-card" key={page.slug}>
          <div className="ai-value-phase-head">
            <span className="ai-value-phase-number">{index + 1}</span>
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

    <VbdMapPanel />
  </>
);

const VbdMapPanel = () => {
  return (
    <section className="ai-value-panel ai-value-vbd-panel" aria-label="Velocity Breadth Depth map">
      <div className="ai-value-section-head">
        <div>
          <p className="eyebrow">VBD Map</p>
          <h3>Function cluster map</h3>
          <p>
            Each function lands on the map from the AI Fluency org results.
            Use the cluster position to choose where to scale, coach, or
            redesign next.
          </p>
        </div>
        <StatusPill label="Aggregate signals" tone="good" />
      </div>

      <div className="ai-value-vbd-layout">
        <div className="ai-value-vbd-y-axis">
          <span className="ai-value-vbd-axis-high">High</span>
          <strong className="ai-value-vbd-axis-title">Velocity</strong>
          <span className="ai-value-vbd-axis-low">Low</span>
        </div>
        <div className="ai-value-vbd-map-shell">
          <div className="ai-value-vbd-grid" aria-label="VBD quadrant map">
            {vbdQuadrants.map((quadrant) => {
              return (
                <article
                  aria-label={`${quadrant.label}: ${quadrant.definition}`}
                  className={`ai-value-vbd-quadrant ai-value-vbd-quadrant-${quadrant.tone} ai-value-vbd-quadrant-${quadrant.id}`}
                  key={quadrant.id}
                >
                  <span className="ai-value-vbd-quadrant-label">
                    <strong>{quadrant.label}</strong>
                    <span>{quadrant.mapCue}</span>
                  </span>
                </article>
              );
            })}
          </div>
          <div className="ai-value-vbd-marker-layer" aria-label="Function positions">
            {aiFluencyOrgFunctionClusters.map((plot) => (
              <span
                aria-label={`${plot.functionArea}: Velocity ${plot.velocity}, Breadth ${plot.breadth}, Depth ${plot.depth}`}
                className={`ai-value-vbd-function-bubble ai-value-vbd-function-bubble-${plot.quadrantId}`}
                key={plot.functionArea}
                style={vbdBubbleStyle(plot)}
                title={`${plot.functionArea}: Velocity ${plot.velocity}, Breadth ${plot.breadth}, Depth ${plot.depth}`}
              >
                <span>{plot.shortLabel}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="ai-value-vbd-footer">
        <strong>Depth</strong>
        <span>Low</span>
        <span>High</span>
        <p>
          Depth shows embedded workflow integration. Bubble size shows
          combined Velocity, Breadth, and Depth.
        </p>
      </div>

      <div className="ai-value-vbd-function-legend" aria-label="Function cluster list">
        {vbdQuadrants.map((quadrant) => {
          const functions = aiFluencyOrgFunctionClusters.filter((plot) => plot.quadrantId === quadrant.id);
          return (
            <div key={quadrant.id}>
              <strong>{quadrant.label}</strong>
              <p>{functions.map((plot) => plot.functionArea).join(", ")}</p>
            </div>
          );
        })}
      </div>

      <div className="ai-value-vbd-definition-legend" aria-label="Quadrant definitions">
        <h4>Quadrant definitions</h4>
        <div>
          {vbdQuadrants.map((quadrant) => (
            <article key={quadrant.id}>
              <strong>{quadrant.label}</strong>
              <p>{quadrant.definition}</p>
            </article>
          ))}
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

const MetricsPage = ({
  journey,
  valueSignals
}: {
  journey: Journey;
  valueSignals: typeof aiValueWorkspace.valueSignals;
}) => (
  <section className="ai-value-focused-stack" aria-label="Metrics workspace">
    <section className="ai-value-panel" aria-label="Outcome metrics guide">
      <div className="ai-value-section-head">
        <div>
          <p className="eyebrow">Step 3 · Outcome Metric</p>
          <h3>Outcome Metrics</h3>
          <p>
            Every value claim is tested against a function outcome metric the
            client owns. Confirm the metric, source system, owner, and
            comparison window.
          </p>
        </div>
        <StatusPill label="Client owns the metric" tone="good" />
      </div>
    </section>

    <ClientQuestionMetricBridgePanel bridge={journey.questionMetricBridge} />

    <article className="ai-value-panel ai-value-signal-shortlist-panel" aria-label="Candidate outcome metrics">
      <div className="ai-value-section-head">
        <div>
          <p className="eyebrow">Metric Options</p>
          <h3>Metric options the client can choose from</h3>
        </div>
        <StatusPill label="Client confirms" tone="good" />
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
  <section className="ai-value-focused-stack" aria-label="Decision and retest workspace">
    <SponsorDecisionLoopPanel loop={journey.sponsorDecisionLoop} />

    <ValueImprovementLoopPanel journey={journey} />

    <ExecutiveReadoutPreviewPanel
      preview={journey.executiveReadoutPreview}
      packetIds={journey.packetIds}
      onOpenReadout={(packetId) => void journey.openReadout(packetId)}
    />
  </section>
);
