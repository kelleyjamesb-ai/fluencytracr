import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
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

const tabs = [
  "Workflow Canvas",
  "Value Signals",
  "Value Story",
  "Evidence Check",
  "Safe Language",
  "Executive Brief"
] as const;

type Tab = (typeof tabs)[number];

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

export const AIValueWorkspace = () => {
  const [activeTab, setActiveTab] = useState<Tab>("Workflow Canvas");
  const activeIndex = useMemo(() => tabs.indexOf(activeTab), [activeTab]);
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
          <p className="eyebrow">Client Value Workshop</p>
          <h1>{aiValueWorkspace.title}</h1>
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
              ? "Connecting…"
              : mode === "live"
                ? "Refresh live evidence"
                : "Connect live evidence"}
          </button>
        </div>
      </header>

      <AiValueJourneyRail stages={journey.stages} current="workshop" />

      {!journey.loading && (
        <section className="ai-value-handoff-panel" aria-label="Selected workflow from Journey">
          <div>
            <p className="eyebrow">Journey Handoff</p>
            <h2>Selected workflow from Journey</h2>
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
      )}

      {!journey.loading && (
        <ClientQuestionMetricBridgePanel bridge={journey.questionMetricBridge} />
      )}

      {!journey.loading && (
        <ValueSpineTracePanel trace={journey.valueSpineTrace} />
      )}

      {!journey.loading && (
        <section className="ai-value-panel ai-value-roi-readiness-panel" aria-label="ROI scenario readiness">
          <div className="ai-value-section-head">
            <div>
              <p className="eyebrow">Value Modeling Handoff</p>
              <h2>ROI Scenario Readiness</h2>
              <p>
                This panel turns Blueprint, outcome mapping, evidence readiness,
                assumptions, and scenario bands into the value language that can
                safely move toward the sponsor packet.
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
              <span className="ai-value-map-label">Safe value language</span>
              <ul>
                {journey.roiScenarioReadiness.safeValueLanguage.map((language) => (
                  <li key={language}>{language}</li>
                ))}
              </ul>
              <div className="ai-value-chip-row">
                {journey.roiScenarioReadiness.blockedOutputs.map((output) => (
                  <StatusPill key={output} label={output} />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {!journey.loading && (
        <CustomerEvidenceRequestPanel request={journey.customerEvidenceRequest} />
      )}

      {!journey.loading && (
        <CustomerEvidenceReviewWorkbench
          review={journey.customerEvidenceReview}
          onReview={(exportId, decision) => void journey.review(exportId, decision)}
        />
      )}

      {!journey.loading && journey.valueQuestions.length > 0 && (
        <section className="ai-value-client-questions" aria-label="Client value questions">
          <div className="ai-value-section-head">
            <div>
              <p className="eyebrow">Sponsor View</p>
              <h2>Client Value Questions</h2>
              <p>
                Keep the workshop focused on what the client can decide next:
                the workflow, value route, available Glean evidence, customer
                proof, and safe language.
              </p>
            </div>
            <StatusPill label="Evidence-aware cadence" tone="warn" />
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

      {!journey.loading && (
        <ExecutiveReadoutPreviewPanel
          preview={journey.executiveReadoutPreview}
          packetIds={journey.packetIds}
          onOpenReadout={(packetId) => void journey.openReadout(packetId)}
        />
      )}

      {!journey.loading && (
        <SponsorDecisionLoopPanel loop={journey.sponsorDecisionLoop} />
      )}

      {!journey.loading && (
        <article className="ai-value-panel ai-value-executive-plan-panel">
          <div className="ai-value-section-head">
            <div>
              <p className="eyebrow">Executive Readout</p>
              <h2>Executive Operating Packet</h2>
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
      )}

      {errorMessage && (
        <p role="alert" className="ai-value-panel">
          {errorMessage}
        </p>
      )}

      <section className="ai-value-spine" aria-label="AI value workshop flow">
        {tabs.map((tab, index) => (
          <button
            key={tab}
            type="button"
            className={activeTab === tab ? "ai-value-step active" : "ai-value-step"}
            onClick={() => setActiveTab(tab)}
            aria-current={activeTab === tab ? "step" : undefined}
          >
            <span>{index + 1}</span>
            {tab}
          </button>
        ))}
      </section>

      <section className="ai-value-grid">
        <article className="ai-value-panel ai-value-summary">
          <h2>{activeTab}</h2>
          <p>{aiValueWorkspace.workshopSummary}</p>
          <div className="ai-value-progress" aria-label="Workshop progress">
            <div style={{ width: `${((activeIndex + 1) / tabs.length) * 100}%` }} />
          </div>
        </article>

        {activeTab === "Workflow Canvas" && live?.kickoff && (
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
                  <StatusPill
                    label={`${live.kickoff.fluency.respondents} participants`}
                    tone="good"
                  />
                  <StatusPill
                    label={`Strongest: ${live.kickoff.fluency.strongest}`}
                    tone="good"
                  />
                  <StatusPill
                    label={`Biggest gap: ${live.kickoff.fluency.biggestGap}`}
                    tone="warn"
                  />
                  {live.kickoff.fluency.withheldGroups > 0 && (
                    <StatusPill
                      label={`${live.kickoff.fluency.withheldGroups} small group withheld`}
                    />
                  )}
                </div>
                <p>{live.kickoff.fluency.note}</p>
              </>
            )}
          </article>
        )}

        {activeTab === "Workflow Canvas" && (
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
        )}

        {activeTab === "Value Signals" && (
          <article className="ai-value-panel">
            <h3>Value signals to map</h3>
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
        )}

        {activeTab === "Value Story" && (
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
        )}

        {activeTab === "Evidence Check" && (
          <article className="ai-value-panel">
            <h3>Evidence check</h3>
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
        )}

        {activeTab === "Safe Language" && (
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
        )}

        {activeTab === "Executive Brief" && (
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
        )}
      </section>
    </main>
  );
};
