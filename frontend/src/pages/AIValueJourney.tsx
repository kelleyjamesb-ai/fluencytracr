import { Link } from "react-router-dom";

import { useAiValueJourney } from "../hooks/useAiValueJourney";
import { AiValueJourneyRail } from "../components/AiValueJourneyRail";

const StatusPill = ({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "warn" | "good" }) => (
  <span className={`ai-value-pill ai-value-pill-${tone}`}>{label}</span>
);

const TONE_BY_STATE: Record<string, "good" | "warn" | "neutral"> = {
  done: "good",
  attention: "warn",
  todo: "neutral"
};

export const AIValueJourney = () => {
  const journey = useAiValueJourney();

  return (
    <main className="ai-value-shell">
      <header className="ai-value-topbar">
        <div>
          <p className="eyebrow">Client Value Workshop</p>
          <h1>Value Journey</h1>
          <p>
            {journey.clientName
              ? `${journey.clientName} — from kickoff to executive readout.`
              : "One engagement, from kickoff to executive readout."}
          </p>
        </div>
        <div className="ai-value-status-strip">
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

      <section className="ai-value-grid">
        {journey.stages.map((stage, index) => (
          <article className="ai-value-panel" key={stage.key}>
            <h3>
              {index + 1}. {stage.label}
            </h3>
            <StatusPill label={stage.detail} tone={TONE_BY_STATE[stage.state]} />

            {stage.key === "discovery" && (
              <p>
                <Link className="ai-value-step" to="/ai-value-discovery">
                  Open discovery &amp; blueprinting
                </Link>
              </p>
            )}
            {stage.key === "workshop" && (
              <p>
                <Link className="ai-value-step" to="/ai-value-workspace">
                  Open the value workshop
                </Link>
              </p>
            )}

            {stage.key === "evidence" && journey.evidenceItems.length > 0 && (
              <div>
                {journey.evidenceItems.map((item) => (
                  <div className="ai-value-row" role="row" key={item.exportId}>
                    <span>{(item.workflowFamily ?? item.exportId).replace(/_/g, " ")}</span>
                    <StatusPill
                      label={
                        item.reviewState === "ACCEPTED"
                          ? "Accepted"
                          : item.reviewState === "REJECTED"
                            ? "Rejected"
                            : "Awaiting review"
                      }
                      tone={
                        item.reviewState === "ACCEPTED"
                          ? "good"
                          : item.reviewState === "SUBMITTED"
                            ? "warn"
                            : "neutral"
                      }
                    />
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
            )}

            {stage.key === "readout" &&
              journey.packetIds.map((packetId) => (
                <p key={packetId}>
                  <button
                    type="button"
                    className="ai-value-step"
                    onClick={() => void journey.openReadout(packetId)}
                  >
                    Open executive readout
                  </button>
                </p>
              ))}
          </article>
        ))}
      </section>
    </main>
  );
};
