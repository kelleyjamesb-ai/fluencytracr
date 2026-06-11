import { Link } from "react-router-dom";

import { useAiValueJourney, type JourneyStageState } from "../hooks/useAiValueJourney";
import { AiValueJourneyRail } from "../components/AiValueJourneyRail";
import { CustomerEvidenceRequestPanel } from "../components/CustomerEvidenceRequestPanel";
import { CustomerEvidenceReviewWorkbench } from "../components/CustomerEvidenceReviewWorkbench";
import { ExecutiveReadoutPreviewPanel } from "../components/ExecutiveReadoutPreviewPanel";
import { SponsorDecisionLoopPanel } from "../components/SponsorDecisionLoopPanel";

const StatusPill = ({
  label,
  tone = "neutral"
}: {
  label: string;
  tone?: "neutral" | "warn" | "good";
}) => <span className={`ai-value-pill ai-value-pill-${tone}`}>{label}</span>;

const TONE_BY_STATE: Record<JourneyStageState, "good" | "warn" | "neutral"> = {
  done: "good",
  attention: "warn",
  todo: "neutral"
};

const STATE_LABELS: Record<JourneyStageState, string> = {
  done: "Ready",
  attention: "Needs input",
  todo: "Not started"
};

const scenarioInputTone = (status: string): "good" | "warn" | "neutral" => {
  if (status === "Ready to model") return "good";
  if (status === "Missing input" || status === "Awaiting review" || status === "Needs owner review") {
    return "warn";
  }
  return "neutral";
};

export const AIValueJourney = () => {
  const journey = useAiValueJourney();
  const completeCount = journey.stages.filter((stage) => stage.state === "done").length;
  const progress = Math.round((completeCount / journey.stages.length) * 100);

  return (
    <main className="ai-value-shell ai-value-journey">
      <header className="ai-value-topbar">
        <div>
          <p className="eyebrow">AI Value Platform</p>
          <h1>Value Journey</h1>
          <p>
            {journey.clientName
              ? `${journey.clientName} — from readiness and Blueprint to governed value readout.`
              : "A whole-system path from AI readiness to governed value realization."}
          </p>
        </div>
        <div className="ai-value-status-strip">
          <StatusPill label={`${completeCount}/${journey.stages.length} phases ready`} tone="good" />
          <button
            type="button"
            className="ai-value-step"
            onClick={() => void journey.refresh()}
            disabled={journey.loading}
          >
            {journey.loading ? "Checking…" : "Refresh journey"}
          </button>
        </div>
      </header>

      {journey.errorMessage && (
        <p role="alert" className="ai-value-panel">
          {journey.errorMessage}
        </p>
      )}

      <AiValueJourneyRail stages={journey.stages} />

      <section className="ai-value-journey-summary" aria-label="Value journey summary">
        <article className="ai-value-panel">
          <h2>Whole-System Spine</h2>
          <p>
            Each phase creates or validates an object that feeds the next phase. ROI is
            treated as a governed opportunity until customer-owned outcome data,
            assumptions, and claim review support stronger language.
          </p>
          <div className="ai-value-progress" aria-label={`${progress}% complete`}>
            <div style={{ width: `${progress}%` }} />
          </div>
        </article>
        <article className="ai-value-panel">
          <h2>Next Best Move</h2>
          <p>
            {journey.stages.find((stage) => stage.state !== "done")?.nextAction ??
              "Use the executive readout to decide renewal, expansion, or the next workflow pilot."}
          </p>
          <div className="ai-value-chip-row">
            <Link className="ai-value-step" to="/ai-value-discovery">
              Open Blueprint workshop
            </Link>
            <Link className="ai-value-step" to="/ai-value-workspace">
              Open value workshop
            </Link>
          </div>
        </article>
      </section>

      <section className="ai-value-handoff-panel" aria-label="Selected workflow handoff">
        <div>
          <p className="eyebrow">Blueprint Handoff</p>
          <h2>Selected Workflow Handoff</h2>
          <p>{journey.workflowHandoff.summary}</p>
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
          <Link className="ai-value-step" to="/ai-value-workspace">
            Continue in value workshop
          </Link>
          <Link className="ai-value-step" to="/ai-value-discovery">
            Refine Blueprint
          </Link>
        </div>
      </section>

      <section className="ai-value-client-questions" aria-label="Client value questions">
        <div className="ai-value-section-head">
          <div>
            <p className="eyebrow">Sponsor View</p>
            <h2>Client Value Questions</h2>
            <p>
              The Journey should make the value conversation obvious: what to change,
              where value may appear, what evidence exists, and what must still be
              validated before stronger ROI language is used.
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

      <section className="ai-value-phase-grid" aria-label="AI value platform phases">
        {journey.stages.map((stage, index) => (
          <article className="ai-value-panel ai-value-phase-card" key={stage.key}>
            <div className="ai-value-phase-head">
              <span className="ai-value-phase-number">{index + 1}</span>
              <div>
                <h3>{stage.label}</h3>
                <p>{stage.objectLabel}</p>
              </div>
              <StatusPill label={STATE_LABELS[stage.state]} tone={TONE_BY_STATE[stage.state]} />
            </div>
            <p className="ai-value-phase-detail">{stage.detail}</p>
            <div className="ai-value-phase-columns">
              <div>
                <h4>Captured</h4>
                <ul>
                  {(stage.captured.length > 0 ? stage.captured : ["Nothing captured yet."]).map(
                    (item) => (
                      <li key={item}>{item}</li>
                    )
                  )}
                </ul>
              </div>
              <div>
                <h4>Missing</h4>
                <ul>
                  {(stage.missing.length > 0 ? stage.missing : ["No major gap for this phase."]).map(
                    (item) => (
                      <li key={item}>{item}</li>
                    )
                  )}
                </ul>
              </div>
            </div>
            <p className="ai-value-feeds-next">
              <strong>Feeds next:</strong> {stage.feedsNext}
            </p>
            {stage.link && (
              <Link className="ai-value-step ai-value-phase-action" to={stage.link}>
                {stage.nextAction}
              </Link>
            )}
            {stage.key === "readout" &&
              journey.packetIds.map((packetId) => (
                <button
                  type="button"
                  className="ai-value-step ai-value-phase-action"
                  key={packetId}
                  onClick={() => void journey.openReadout(packetId)}
                >
                  Open executive readout
                </button>
              ))}
          </article>
        ))}
      </section>

      <section className="ai-value-workbench-grid" aria-label="Value opportunity workbench">
        <article className="ai-value-panel ai-value-opportunity-panel">
          <div className="ai-value-section-head">
            <div>
              <p className="eyebrow">Metrics Library Engine</p>
              <h2>Outcome &amp; ROI Opportunity Mapping</h2>
              <p>
                Convert the Blueprint route into measurable business outcomes. Each
                card separates what Glean can show from the customer-owned data needed
                before value language gets stronger.
              </p>
            </div>
            <StatusPill
              label={
                journey.opportunities.length > 0
                  ? `${journey.opportunities.length} mapped`
                  : "Needs metrics"
              }
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
                      <h3>{opportunity.valueRouteLabel}</h3>
                      <p>{opportunity.workflowName}</p>
                    </div>
                    <StatusPill
                      label={opportunity.status}
                      tone={
                        opportunity.status === "Outcome evidence attached"
                          ? "good"
                          : "warn"
                      }
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

        <article className="ai-value-panel ai-value-evidence-scenario-panel">
          <div className="ai-value-section-head">
            <div>
              <p className="eyebrow">Evidence Readiness</p>
              <h2>Evidence Readiness &amp; Scenario Plan</h2>
              <p>
                Shows what can be trusted now, what the client still needs to
                provide, and how the ROI opportunity can move into a governed
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
            <div className="ai-value-map-cell ai-value-map-cell-wide">
              <span className="ai-value-map-label">Value scenario</span>
              <p>{journey.evidenceScenarioPlan.scenarioSummary}</p>
              <div className="ai-value-scenario-band-list">
                {journey.evidenceScenarioPlan.scenarioBands.length > 0 ? (
                  journey.evidenceScenarioPlan.scenarioBands.map((band) => (
                    <div className="ai-value-scenario-band" key={band.label}>
                      <strong>{band.label}</strong>
                      <p>{band.interpretation}</p>
                    </div>
                  ))
                ) : (
                  <p>Scenario bands appear after the first opportunity is modeled.</p>
                )}
              </div>
            </div>
            <div className="ai-value-map-cell">
              <span className="ai-value-map-label">Safe value language</span>
              <p>{journey.evidenceScenarioPlan.safeValueLanguage}</p>
            </div>
            <div className="ai-value-map-cell">
              <span className="ai-value-map-label">Next client action</span>
              <p>{journey.evidenceScenarioPlan.nextClientAction}</p>
            </div>
            <div className="ai-value-map-cell ai-value-map-cell-wide ai-value-scenario-builder">
              <span className="ai-value-map-label">Value scenario controls</span>
              <div className="ai-value-scenario-builder-head">
                <div>
                  <h3>Governed Scenario Builder</h3>
                  <p>
                    Track the client-owned inputs that let the opportunity move
                    from planning range to caveated sponsor language.
                  </p>
                </div>
                <StatusPill label="Modeled range, not proof" tone="warn" />
              </div>
              <div className="ai-value-scenario-input-grid">
                {journey.evidenceScenarioPlan.scenarioInputs.map((input) => (
                  <div className="ai-value-scenario-input" key={input.label}>
                    <div>
                      <strong>{input.label}</strong>
                      <p>{input.detail}</p>
                    </div>
                    <StatusPill label={input.status} tone={scenarioInputTone(input.status)} />
                  </div>
                ))}
              </div>
              <div className="ai-value-unlock-list">
                <h4>What unlocks stronger value language</h4>
                <ul>
                  {journey.evidenceScenarioPlan.unlockConditions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </article>

        <section
          className="ai-value-panel ai-value-roi-readiness-panel"
          aria-label="ROI scenario readiness"
        >
          <div className="ai-value-section-head">
            <div>
              <p className="eyebrow">Governed Value Modeling</p>
              <h2>ROI Scenario Readiness</h2>
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

        <CustomerEvidenceRequestPanel request={journey.customerEvidenceRequest} />

        <CustomerEvidenceReviewWorkbench
          review={journey.customerEvidenceReview}
          onReview={(exportId, decision) => void journey.review(exportId, decision)}
        />

        <ExecutiveReadoutPreviewPanel
          preview={journey.executiveReadoutPreview}
          packetIds={journey.packetIds}
          onOpenReadout={(packetId) => void journey.openReadout(packetId)}
        />

        <SponsorDecisionLoopPanel loop={journey.sponsorDecisionLoop} />

        <article className="ai-value-panel ai-value-executive-plan-panel">
          <div className="ai-value-section-head">
            <div>
              <p className="eyebrow">Executive Readout</p>
              <h2>Executive Operating Packet</h2>
              <p>
                Turns the journey into a sponsor decision and a governed follow-up
                plan. Agents can carry work forward, but only through bounded tasks
                and safe value language.
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

        <article className="ai-value-panel ai-value-boundary-panel">
          <h2>Safe Value Language</h2>
          <div className="ai-value-boundary-grid">
            <div>
              <h3>Allowed Now</h3>
              <ul>
                <li>Potential ROI opportunity</li>
                <li>Modeled value scenario</li>
                <li>Customer data required</li>
                <li>Reportable with caveats after review</li>
              </ul>
            </div>
            <div>
              <h3>Still Blocked</h3>
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
    </main>
  );
};
