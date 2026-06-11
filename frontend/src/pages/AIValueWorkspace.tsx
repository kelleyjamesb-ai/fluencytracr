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

const BlueprintPage = ({ live, journey }: { live: WorkspaceLive; journey: Journey }) => (
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

    <article className="ai-value-panel">
      <h3>Build the workshop canvas with the client</h3>
      <p>{aiValueWorkspace.canvas.clientQuestion}</p>
      <div className="ai-value-columns">
        <div>
          <h4>Today</h4>
          <ul>
            {aiValueWorkspace.canvas.today.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4>Target workflow</h4>
          <ul>
            {aiValueWorkspace.canvas.target.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </div>
      </div>
      <h4>Open client decisions</h4>
      <ul>
        {aiValueWorkspace.canvas.openDecisions.map((decision) => (
          <li key={decision}>{decision}</li>
        ))}
      </ul>
    </article>
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
    <ClientQuestionMetricBridgePanel bridge={journey.questionMetricBridge} />

    <article className="ai-value-panel">
      <div className="ai-value-section-head">
        <div>
          <p className="eyebrow">Outcome Mapping</p>
          <h3>Value signals to map</h3>
          <p>
            Start with the client question, then choose the outcome measure,
            source owner, and claim level before any scenario language moves forward.
          </p>
        </div>
        <StatusPill label="Outcome first" tone="good" />
      </div>
      <div className="ai-value-table" role="table" aria-label="Recommended value signals">
        {valueSignals.map((signal) => (
          <div className="ai-value-row" role="row" key={signal.question}>
            <span>{signal.question}</span>
            <span>{signal.measure}</span>
            <span>{signal.source}</span>
            <StatusPill label={signal.status} tone={signal.status === "Needs owner" ? "warn" : "good"} />
          </div>
        ))}
      </div>
    </article>

    <article className="ai-value-panel ai-value-opportunity-panel">
      <div className="ai-value-section-head">
        <div>
          <p className="eyebrow">Metrics Library Engine</p>
          <h3>Outcome &amp; ROI Opportunity Mapping</h3>
          <p>
            Convert the Blueprint route into measurable business outcomes.
            Each card separates what Glean can show from the customer-owned data needed
            before value language gets stronger.
          </p>
        </div>
        <StatusPill
          label={journey.opportunities.length > 0 ? `${journey.opportunities.length} mapped` : "Needs metrics"}
          tone={journey.opportunities.length > 0 ? "good" : "warn"}
        />
      </div>
      <div className="ai-value-opportunity-board">
        {journey.opportunities.length > 0 ? (
          journey.opportunities.map((opportunity) => (
            <article className="ai-value-opportunity-card" key={opportunity.id}>
              <div className="ai-value-opportunity-card-head">
                <div>
                  <span className="ai-value-map-label">Blueprint value route</span>
                  <h4>{opportunity.valueRouteLabel}</h4>
                  <p>{opportunity.workflowName}</p>
                </div>
                <StatusPill
                  label={opportunity.status}
                  tone={opportunity.status === "Outcome evidence attached" ? "good" : "warn"}
                />
              </div>

              <div className="ai-value-map-grid">
                <div className="ai-value-map-cell">
                  <span className="ai-value-map-label">Outcome metric</span>
                  <strong>{opportunity.metricName}</strong>
                  <p>{opportunity.measurementUnit}</p>
                  <small>{opportunity.roiPoint}</small>
                </div>
                <div className="ai-value-map-cell">
                  <span className="ai-value-map-label">Customer system to connect</span>
                  <strong>{opportunity.sourceSystem}</strong>
                  <p>{opportunity.approvedGrain}</p>
                  <small>{opportunity.baselineRule}</small>
                </div>
                <div className="ai-value-map-cell">
                  <span className="ai-value-map-label">What Glean can show</span>
                  <p>{opportunity.gleanEvidence}</p>
                </div>
                <div className="ai-value-map-cell">
                  <span className="ai-value-map-label">Scenario handoff</span>
                  <p>{opportunity.scenarioHandoff}</p>
                </div>
                <div className="ai-value-map-cell ai-value-map-cell-wide">
                  <span className="ai-value-map-label">Safe value language</span>
                  <p>{opportunity.claimBoundary}</p>
                  <small>{opportunity.nextValidationStep}</small>
                </div>
              </div>
            </article>
          ))
        ) : (
          <p>
            Add a Metrics Library for the selected Blueprint to map cost,
            capacity, quality, risk, experience, or growth opportunities.
          </p>
        )}
      </div>
    </article>
  </section>
);

const EvidencePage = ({
  journey,
  evidenceChecks
}: {
  journey: Journey;
  evidenceChecks: typeof aiValueWorkspace.evidenceChecks;
}) => (
  <section className="ai-value-focused-stack" aria-label="Evidence workspace">
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
