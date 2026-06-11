import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { aiValueWorkspace } from "../constants/aiValueWorkspace";
import { useAiValueWorkspace } from "../hooks/useAiValueWorkspace";
import { useAiValueJourney } from "../hooks/useAiValueJourney";
import { AiValueJourneyRail } from "../components/AiValueJourneyRail";
import { ClientQuestionMetricBridgePanel } from "../components/ClientQuestionMetricBridgePanel";
import { CustomerEvidenceRequestPanel } from "../components/CustomerEvidenceRequestPanel";
import { CustomerEvidenceReviewWorkbench } from "../components/CustomerEvidenceReviewWorkbench";
import { ExecutiveReadoutPreviewPanel } from "../components/ExecutiveReadoutPreviewPanel";
import { SponsorDecisionLoopPanel } from "../components/SponsorDecisionLoopPanel";
import { ValueSpineTracePanel } from "../components/ValueSpineTracePanel";

const workspacePages = [
  {
    slug: "home",
    label: "Workspace Home",
    navLabel: "Home",
    path: "/ai-value-workspace",
    detail: "Command center for the client value workflow.",
    feedsNext: "Pick the next phase to inspect or complete."
  },
  {
    slug: "readiness",
    label: "Readiness",
    navLabel: "Readiness",
    path: "/ai-value-workspace/readiness",
    detail: "Use kickoff context and aggregate fluency signals to frame the client conversation.",
    feedsNext: "Readiness context feeds Blueprint priorities."
  },
  {
    slug: "blueprint",
    label: "Blueprint Workshop",
    navLabel: "Blueprint Workshop",
    path: "/ai-value-workspace/blueprint",
    detail: "Co-design the current and target workflow with the client.",
    feedsNext: "Blueprint decisions feed metrics and evidence planning."
  },
  {
    slug: "metrics",
    label: "Metrics & ROI Opportunities",
    navLabel: "Metrics & ROI Opportunities",
    path: "/ai-value-workspace/metrics",
    detail: "Map client value questions to governed outcome metrics and ROI opportunities.",
    feedsNext: "Metrics feed evidence requests and scenario readiness."
  },
  {
    slug: "evidence",
    label: "Evidence Readiness",
    navLabel: "Evidence Readiness",
    path: "/ai-value-workspace/evidence",
    detail: "Separate what Glean can show from what customer-owned data must validate.",
    feedsNext: "Accepted or rejected evidence determines safe value language."
  },
  {
    slug: "scenario",
    label: "Scenario Builder",
    navLabel: "Scenario Builder",
    path: "/ai-value-workspace/scenario",
    detail: "Model value as an assumption-backed scenario, not ROI proof.",
    feedsNext: "Scenario status feeds the executive readout."
  },
  {
    slug: "readout",
    label: "Executive Readout",
    navLabel: "Executive Readout",
    path: "/ai-value-workspace/readout",
    detail: "Preview the sponsor packet and the caveats that must travel with it.",
    feedsNext: "Readout feeds sponsor decision and follow-up."
  },
  {
    slug: "decisions",
    label: "Sponsor Decisions",
    navLabel: "Sponsor Decisions",
    path: "/ai-value-workspace/decisions",
    detail: "Choose the next governed move and prepare a bounded handoff.",
    feedsNext: "Decision moves route back to Blueprint, evidence, scenario, or readout."
  }
] as const;

type WorkspacePageSlug = (typeof workspacePages)[number]["slug"];

const workspacePageBySlug = new Map(workspacePages.map((page) => [page.slug, page]));

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

export const AIValueWorkspace = () => {
  const location = useLocation();
  const activePageSlug = currentPageFromPath(location.pathname);
  const activePage = workspacePageBySlug.get(activePageSlug) ?? workspacePages[0];
  const { mode, live, errorMessage, connectLiveEvidence } = useAiValueWorkspace();
  const journey = useAiValueJourney();

  const workflowName = live?.workflowName ?? aiValueWorkspace.workflowName;
  const valueRouteLabel = live?.valueRouteLabel ?? aiValueWorkspace.valueRouteLabel;
  const decisionLabel = live?.decisionLabel ?? aiValueWorkspace.decisionLabel;
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
          <p>{workflowName}</p>
        </div>
        <div className="ai-value-status-strip" aria-label="Workspace status">
          <StatusPill label={valueRouteLabel} tone="good" />
          <StatusPill label={decisionLabel} tone="warn" />
          <StatusPill label={claimModeLabel} />
          <StatusPill
            label={mode === "live" ? "Live evidence" : "Example content"}
            tone={mode === "live" ? "good" : "neutral"}
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

      <AiValueJourneyRail stages={journey.stages} current="workshop" />

      <nav className="ai-value-workspace-nav" aria-label="AI value workspace pages">
        {workspacePages.map((page, index) => (
          <Link
            key={page.slug}
            to={page.path}
            className={activePageSlug === page.slug ? "ai-value-step active" : "ai-value-step"}
            aria-current={activePageSlug === page.slug ? "page" : undefined}
          >
            <span>{index + 1}</span>
            {page.navLabel}
          </Link>
        ))}
      </nav>

      {journey.errorMessage && (
        <p role="alert" className="ai-value-panel">
          {journey.errorMessage}
        </p>
      )}
      {errorMessage && (
        <p role="alert" className="ai-value-panel">
          {errorMessage}
        </p>
      )}

      <section className="ai-value-page-head" aria-label={`${activePage.label} overview`}>
        <div>
          <p className="eyebrow">Workspace Page</p>
          <h2>{activePage.label}</h2>
          <p>{activePage.detail}</p>
        </div>
        <StatusPill label={activePage.feedsNext} tone={activePageSlug === "home" ? "neutral" : "good"} />
      </section>

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
        <MetricsPage journey={journey} valueSignals={valueSignals} />
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

      {activePageSlug === "readout" && (
        <ReadoutPage journey={journey} executiveBrief={executiveBrief} />
      )}

      {activePageSlug === "decisions" && (
        <DecisionsPage journey={journey} />
      )}
    </main>
  );
};

type Journey = ReturnType<typeof useAiValueJourney>;
type WorkspaceLive = ReturnType<typeof useAiValueWorkspace>["live"];

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
        <p>
          Move one phase at a time: readiness frames the workshop, Blueprint
          selects the workflow, metrics define the value opportunity, evidence
          validates what can be trusted, scenario keeps value language governed,
          and readout turns the work into a sponsor decision.
        </p>
      </article>
    </section>

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
            <strong>Feeds next:</strong> {page.feedsNext}
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

const ReadinessPage = ({ live, journey }: { live: WorkspaceLive; journey: Journey }) => (
  <section className="ai-value-focused-stack" aria-label="Readiness workspace">
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
        <h3>Human readiness context</h3>
        <p>
          Connect the kickoff instrument to show aggregate readiness, capability
          gaps, and the sponsor measure before the Blueprint workshop starts.
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
              Open Evidence plan
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
  valueSignals
}: {
  journey: Journey;
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
      "Model as a governed value scenario after the customer owner confirms baseline, comparison, assumptions, and source coverage.",
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

  return (
    <section className="ai-value-focused-stack" aria-label="Metrics workspace">
      <ClientQuestionMetricBridgePanel bridge={journey.questionMetricBridge} />

      <section
        className="ai-value-panel ai-value-metrics-map-panel"
        aria-label="Outcome and ROI opportunity map"
      >
        <div className="ai-value-section-head">
          <div>
            <p className="eyebrow">Outcome Mapping</p>
            <h3>Outcome and ROI opportunity map</h3>
            <p>
              Use this board to turn the Blueprint decision into the metric,
              customer data ask, open evidence need, and next governed value step.
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
              <span className="ai-value-map-label">Client value question</span>
              <h4>{primaryBridgeItem?.sponsorQuestion ?? "Where is the ROI opportunity?"}</h4>
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
                This feeds the evidence request and the governed scenario builder; it does
                not create a realized value claim.
              </p>
              <div className="ai-value-chip-row">
                <Link className="ai-value-step" to="/ai-value-workspace/evidence">
                  Open Evidence plan
                </Link>
                <Link className="ai-value-step" to="/ai-value-workspace/scenario">
                  Open Scenario builder
                </Link>
              </div>
            </div>
          </div>
        </>
      </section>

      <article className="ai-value-panel ai-value-signal-shortlist-panel">
        <div className="ai-value-section-head">
          <div>
            <p className="eyebrow">Metric Candidates</p>
            <h3>Outcome signals to consider</h3>
            <p>
              These are candidate signals for the client workshop. They become
              scenario inputs only after ownership, source, and review rules are clear.
            </p>
          </div>
          <StatusPill label="Outcome first" tone="good" />
        </div>
        <div className="ai-value-signal-shortlist" aria-label="Recommended value signals">
          {valueSignals.map((signal) => (
            <article className="ai-value-signal-card" key={signal.question}>
              <div>
                <span className="ai-value-map-label">Client question</span>
                <h4>{signal.question}</h4>
              </div>
              <p>{signal.measure}</p>
              <small>{signal.source}</small>
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
      aria-label="Evidence to value language path"
    >
      <div className="ai-value-section-head">
        <div>
          <p className="eyebrow">Governed Path</p>
          <h3>Evidence to Value Language Path</h3>
          <p>
            Follow what the product can show, what the customer still owns, and
            what language is safe before the sponsor sees the readout.
          </p>
        </div>
        <StatusPill label={outcomeEvidence} tone={journey.customerEvidenceReview.statusTone} />
      </div>

      <div className="ai-value-evidence-value-path">
        <div className="ai-value-evidence-value-step">
          <span className="ai-value-map-label">Aggregate work evidence</span>
          <strong>{aggregateEvidence}</strong>
          <p>Use this as the work-pattern signal, not as outcome proof.</p>
        </div>
        <div className="ai-value-evidence-value-step">
          <span className="ai-value-map-label">Customer outcome evidence</span>
          <strong>{outcomeEvidence}</strong>
          <p>{journey.customerEvidenceReview.summary}</p>
        </div>
        <div className="ai-value-evidence-value-step">
          <span className="ai-value-map-label">Scenario readiness</span>
          <strong>{scenarioReadiness}</strong>
          <p>{journey.roiScenarioReadiness.evidenceStatus}</p>
        </div>
        <div className="ai-value-evidence-value-step">
          <span className="ai-value-map-label">Safe value language</span>
          <p>{safeValueLanguage}</p>
        </div>
        <div className="ai-value-evidence-value-step">
          <span className="ai-value-map-label">Blocked stronger claims</span>
          <div className="ai-value-chip-row">
            {blockedOutputs.map((output) => (
              <StatusPill key={output} label={output} />
            ))}
          </div>
        </div>
        <div className="ai-value-evidence-value-step ai-value-evidence-value-step-wide">
          <span className="ai-value-map-label">Next action</span>
          <strong>{nextAction}</strong>
          <p>
            This keeps Evidence and Scenario connected while stronger value
            language waits for customer-owned review.
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
      feedsNext: "Feeds sponsor decision"
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
      feedsNext: "Feeds the next owner without creating a task."
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
          <p className="eyebrow">Evidence Check</p>
          <h3>What can be trusted</h3>
          <p>
            Keep the evidence conversation operational: which aggregate signal is
            present, which customer export is missing, and who reviews it.
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
          <p className="eyebrow">Evidence Readiness</p>
          <h3>Evidence Readiness &amp; Scenario Plan</h3>
          <p>
            Shows what can be trusted now, what the client still needs to
            provide, and how the value opportunity can move into a governed
            scenario without turning into proof.
          </p>
        </div>
        <StatusPill label={journey.evidenceScenarioPlan.decisionLabel} tone="warn" />
      </div>

      <div className="ai-value-evidence-plan-grid">
        <div className="ai-value-map-cell">
          <span className="ai-value-map-label">Can trust now</span>
          <ul>
            {journey.evidenceScenarioPlan.canTrust.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="ai-value-map-cell">
          <span className="ai-value-map-label">Needs client evidence</span>
          <ul>
            {journey.evidenceScenarioPlan.needsClientEvidence.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="ai-value-map-cell">
          <span className="ai-value-map-label">Safe value language</span>
          <p>{journey.evidenceScenarioPlan.safeValueLanguage}</p>
        </div>
        <div className="ai-value-map-cell">
          <span className="ai-value-map-label">Next client action</span>
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
          <h3>Executive Operating Packet</h3>
          <p>
            Turns the workshop into a sponsor decision and governed follow-up.
            Agent tasks stay bounded to evidence review, caveated readout prep,
            and Blueprint or value-signal updates.
          </p>
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
          <span className="ai-value-map-label">Agentic follow-up</span>
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
          <span className="ai-value-map-label">Guardrails that travel with the packet</span>
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
