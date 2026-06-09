import { useMemo, useState } from "react";
import { aiValueWorkspace } from "../constants/aiValueWorkspace";

const tabs = [
  "Blueprint",
  "Metrics",
  "Scenario",
  "Evidence Readiness",
  "Claim Boundary",
  "Executive Packet"
] as const;

type Tab = (typeof tabs)[number];

const StatusPill = ({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "warn" | "good" }) => (
  <span className={`ai-value-pill ai-value-pill-${tone}`}>{label}</span>
);

export const AIValueWorkspace = () => {
  const [activeTab, setActiveTab] = useState<Tab>("Blueprint");
  const activeIndex = useMemo(() => tabs.indexOf(activeTab), [activeTab]);

  return (
    <main className="ai-value-shell">
      <header className="ai-value-topbar">
        <div>
          <p className="eyebrow">Local V1 Workspace</p>
          <h1>AI Value Workspace</h1>
          <p>{aiValueWorkspace.workflowName}</p>
        </div>
        <div className="ai-value-status-strip" aria-label="Workspace status">
          <StatusPill label={aiValueWorkspace.valueRoute} tone="good" />
          <StatusPill label={aiValueWorkspace.decision} tone="warn" />
          <StatusPill label={aiValueWorkspace.claimState} />
        </div>
      </header>

      <section className="ai-value-spine" aria-label="V1 spine">
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
          <p>{aiValueWorkspace.blueprint.hypothesis}</p>
          <div className="ai-value-progress" aria-label="Spine progress">
            <div style={{ width: `${((activeIndex + 1) / tabs.length) * 100}%` }} />
          </div>
        </article>

        {activeTab === "Blueprint" && (
          <article className="ai-value-panel">
            <h3>Blueprint</h3>
            <div className="ai-value-columns">
              <div>
                <h4>Current state</h4>
                <ul>
                  {aiValueWorkspace.blueprint.currentStateSteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4>Future state</h4>
                <ul>
                  {aiValueWorkspace.blueprint.futureStateSteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        )}

        {activeTab === "Metrics" && (
          <article className="ai-value-panel">
            <h3>Metrics</h3>
            <div className="ai-value-table" role="table" aria-label="Recommended metrics">
              {aiValueWorkspace.metrics.map((metric) => (
                <div className="ai-value-row" role="row" key={metric.metricId}>
                  <span>{metric.name}</span>
                  <span>{metric.metricId}</span>
                  <span>{metric.unit}</span>
                  <span>{metric.owner}</span>
                </div>
              ))}
            </div>
          </article>
        )}

        {activeTab === "Scenario" && (
          <article className="ai-value-panel">
            <h3>Scenario</h3>
            <div className="ai-value-band-grid">
              {aiValueWorkspace.scenarioBands.map((band) => (
                <div className="ai-value-band" key={band.band}>
                  <h4>{band.band}</h4>
                  <p>{band.interpretation}</p>
                </div>
              ))}
            </div>
          </article>
        )}

        {activeTab === "Evidence Readiness" && (
          <article className="ai-value-panel">
            <h3>Evidence Readiness</h3>
            <div className="ai-value-table" role="table" aria-label="Readiness checks">
              {aiValueWorkspace.readinessChecks.map(([label, state]) => (
                <div className="ai-value-row" role="row" key={label}>
                  <span>{label}</span>
                  <StatusPill label={state} tone={state === "CAVEATED" ? "warn" : "good"} />
                </div>
              ))}
            </div>
          </article>
        )}

        {activeTab === "Claim Boundary" && (
          <article className="ai-value-panel">
            <h3>Claim Boundary</h3>
            <h4>Safe claims</h4>
            <ul>
              {aiValueWorkspace.safeClaims.map((claim) => (
                <li key={claim}>{claim}</li>
              ))}
            </ul>
            <h4>Required caveats</h4>
            <ul>
              {aiValueWorkspace.requiredCaveats.map((caveat) => (
                <li key={caveat}>{caveat}</li>
              ))}
            </ul>
            <h4>Blocked claims</h4>
            <div className="ai-value-chip-row">
              {aiValueWorkspace.blockedClaims.map((claim) => (
                <StatusPill key={claim} label={claim} />
              ))}
            </div>
          </article>
        )}

        {activeTab === "Executive Packet" && (
          <article className="ai-value-panel">
            <h3>Executive Packet</h3>
            <p className="ai-value-mono">{aiValueWorkspace.packetId}</p>
            <h4>{aiValueWorkspace.title}</h4>
            <h4>Next actions</h4>
            <ul>
              {aiValueWorkspace.nextActions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
            <textarea
              aria-label="Executive packet markdown preview"
              readOnly
              value={aiValueWorkspace.markdownPreview}
            />
          </article>
        )}
      </section>
    </main>
  );
};
