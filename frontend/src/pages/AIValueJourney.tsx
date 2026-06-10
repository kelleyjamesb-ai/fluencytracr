import { Link } from "react-router-dom";

import { useAiValueJourney, type JourneyStageState } from "../hooks/useAiValueJourney";
import { AiValueJourneyRail } from "../components/AiValueJourneyRail";

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

const EvidenceStatePill = ({ state }: { state: string }) => {
  if (state === "ACCEPTED") return <StatusPill label="Accepted" tone="good" />;
  if (state === "SUBMITTED") return <StatusPill label="Awaiting review" tone="warn" />;
  return <StatusPill label="Rejected" />;
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
              <h2>ROI / Value Opportunity Map</h2>
              <p>
                Potential ROI points Glean can help investigate. Each row separates
                Glean evidence from customer-owned outcome data.
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
          <div className="ai-value-opportunity-table">
            <div className="ai-value-opportunity-row ai-value-opportunity-header" role="row">
              <span>ROI point</span>
              <span>Glean evidence</span>
              <span>Customer data needed</span>
              <span>Status</span>
            </div>
            {journey.opportunities.length > 0 ? (
              journey.opportunities.map((opportunity) => (
                <div className="ai-value-opportunity-row" role="row" key={opportunity.id}>
                  <span>
                    <strong>{opportunity.valueRouteLabel}</strong>
                    <small>{opportunity.metricName}</small>
                    <small>{opportunity.roiPoint}</small>
                  </span>
                  <span>{opportunity.gleanEvidence}</span>
                  <span>{opportunity.customerDataNeeded}</span>
                  <span>
                    <StatusPill
                      label={opportunity.status}
                      tone={
                        opportunity.status === "Outcome evidence attached"
                          ? "good"
                          : "warn"
                      }
                    />
                    <small>{opportunity.claimBoundary}</small>
                    <small>{opportunity.nextValidationStep}</small>
                  </span>
                </div>
              ))
            ) : (
              <p>
                Add a Metrics Library for the selected Blueprint to map cost,
                capacity, quality, risk, experience, or growth opportunities.
              </p>
            )}
          </div>
        </article>

        <article className="ai-value-panel">
          <h2>Customer Evidence Review</h2>
          <p>
            Outcome exports stay customer-owned and only attach after human review.
            Accepted evidence can support caveated value language; pending or rejected
            evidence never silently upgrades a claim.
          </p>
          {journey.evidenceItems.length > 0 ? (
            <div className="ai-value-review-list">
              {journey.evidenceItems.map((item) => (
                <div className="ai-value-review-card" key={item.exportId}>
                  <div>
                    <strong>{(item.workflowFamily ?? item.exportId).replace(/_/g, " ")}</strong>
                    <p>{item.exportId}</p>
                  </div>
                  <EvidenceStatePill state={item.reviewState} />
                  {item.reviewState === "SUBMITTED" && (
                    <span className="ai-value-chip-row">
                      <button
                        type="button"
                        className="ai-value-step"
                        onClick={() => void journey.review(item.exportId, "ACCEPTED")}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        className="ai-value-step"
                        onClick={() => void journey.review(item.exportId, "REJECTED")}
                      >
                        Reject
                      </button>
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p>No customer outcome export has been submitted for this journey yet.</p>
          )}
        </article>

        <article className="ai-value-panel ai-value-boundary-panel">
          <h2>Claim Boundary</h2>
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
