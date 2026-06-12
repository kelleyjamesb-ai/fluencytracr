import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { fetchAiValueObject, listAiValueObjects } from "../lib/aiValueApi";

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
import { FluencyBaselineResultsPanel } from "../components/FluencyBaselineResultsPanel";
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

const AI_FLUENCY_ASSESSMENT_PREVIEW_URL = "/ai-fluency/assessment-24-item.html";
const AI_FLUENCY_RESULTS_PREVIEW_URL = "/ai-fluency/organizational-results.html";
const AI_FLUENCY_CLIENT_ASSESSMENT_URL =
  "https://explore-your-ai-fluency-instruments.glean.chatgpt-team.site/24-item";

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

interface VbdFunctionPlot {
  functionArea: string;
  quadrantId: string;
  velocityStatus: string;
  depthStatus: string;
}

const vbdQuadrantOf = (velocityStatus: string, depthStatus: string): string => {
  const highVelocity = velocityStatus === "INCREASING";
  const highDepth = depthStatus === "DEEPENING";
  if (highVelocity && highDepth) return "flow";
  if (highVelocity) return "fast-shallow";
  if (highDepth) return "deep-slow";
  return "low-integration";
};

const vbdSessionRole = () => {
  try {
    return (localStorage.getItem("role") ?? "ADMIN").trim() || "ADMIN";
  } catch {
    return "ADMIN";
  }
};

const useVbdFunctionPlots = (): VbdFunctionPlot[] => {
  const [plots, setPlots] = useState<VbdFunctionPlot[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const role = vbdSessionRole();
        const { objects } = await listAiValueObjects(role, "value_evidence_case");
        const details = await Promise.all(
          objects
            .filter((summary) => summary.valid)
            .map((summary) => fetchAiValueObject(role, "value_evidence_case", summary.object_id))
        );
        if (cancelled) return;
        const next: VbdFunctionPlot[] = [];
        const seen = new Set<string>();
        for (const detail of details) {
          const payload = detail.payload as Record<string, any>;
          const functionArea = String(
            payload?.client_context?.function_area ?? payload?.workflow?.function_area ?? ""
          ).trim();
          if (!functionArea || seen.has(functionArea)) continue;
          seen.add(functionArea);
          const velocityStatus = String(payload?.vbd_summary?.velocity?.status ?? "UNKNOWN");
          const depthStatus = String(payload?.vbd_summary?.depth?.status ?? "UNKNOWN");
          next.push({
            functionArea,
            quadrantId: vbdQuadrantOf(velocityStatus, depthStatus),
            velocityStatus,
            depthStatus
          });
        }
        setPlots(next);
      } catch {
        if (!cancelled) setPlots([]);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return plots;
};

const VbdMapPanel = () => {
  const plots = useVbdFunctionPlots();
  const plotted = plots.length > 0;

  return (
    <section className="ai-value-panel ai-value-vbd-panel" aria-label="Velocity Breadth Depth map">
      <div className="ai-value-section-head">
        <div>
          <p className="eyebrow">VBD Map</p>
          <h3>Velocity + Depth show the work pattern</h3>
          <p>
            {plotted
              ? "Functions plot from their aggregate work-pattern signals. Use the quadrant each cluster sits in to choose where to scale, coach, or redesign next."
              : "Once aggregate work-pattern data is collected, your functions appear as clusters on this map."}
          </p>
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
          {vbdQuadrants.map((quadrant) => {
            const clusterFunctions = plots.filter((plot) => plot.quadrantId === quadrant.id);
            return (
              <article
                className={`ai-value-vbd-quadrant ai-value-vbd-quadrant-${quadrant.tone}`}
                key={quadrant.id}
              >
                <span className="ai-value-map-label">{quadrant.position}</span>
                <h4>{quadrant.label}</h4>
                <p>{quadrant.summary}</p>
                {plotted && (
                  <div
                    className="ai-value-chip-row ai-value-vbd-cluster"
                    aria-label={`Functions in ${quadrant.label}`}
                  >
                    {clusterFunctions.length > 0 ? (
                      clusterFunctions.map((plot) => (
                        <span
                          className="ai-value-pill ai-value-pill-neutral ai-value-vbd-function-pill"
                          key={plot.functionArea}
                        >
                          {plot.functionArea}
                        </span>
                      ))
                    ) : (
                      <span className="ai-value-vbd-cluster-empty">No functions here yet</span>
                    )}
                  </div>
                )}
                <ul>
                  {quadrant.watch.map((signal) => (
                    <li key={signal}>{signal}</li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </div>

      <div className="ai-value-vbd-footer">
        <strong>Depth</strong>
        <span>Low</span>
        <span>High</span>
        <p>
          Breadth shows coverage by function, role, or workflow.
          {plotted &&
            " Cluster positions guide intervention planning; customer-owned outcome evidence still owns the value test."}
        </p>
      </div>
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
    <section className="ai-value-panel" aria-label="AI Fluency">
      <div className="ai-value-section-head">
        <div>
          <p className="eyebrow">Step 1 · Baseline</p>
          <h3>AI Fluency Baseline</h3>
          <p>Aggregate fluency results across the organization.</p>
        </div>
        <div className="ai-value-chip-row">
          <StatusPill label="Aggregate results only" tone="good" />
          <StatusPill label="Signals, not scores" />
        </div>
      </div>
      <FluencyBaselineResultsPanel />
    </section>

    <AiFluencyExperiencePanel />
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
