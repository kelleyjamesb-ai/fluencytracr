import { useMemo, useState } from "react";
import { aiValueWorkspace } from "../constants/aiValueWorkspace";
import { useAiValueWorkspace } from "../hooks/useAiValueWorkspace";

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

export const AIValueWorkspace = () => {
  const [activeTab, setActiveTab] = useState<Tab>("Workflow Canvas");
  const activeIndex = useMemo(() => tabs.indexOf(activeTab), [activeTab]);
  const { mode, live, errorMessage, connectLiveEvidence } = useAiValueWorkspace();

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
