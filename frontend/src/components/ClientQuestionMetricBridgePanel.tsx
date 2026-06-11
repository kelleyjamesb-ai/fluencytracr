import type { ClientQuestionMetricBridge } from "../hooks/useAiValueJourney";

const StatusPill = ({
  label,
  tone = "neutral"
}: {
  label: string;
  tone?: "neutral" | "warn" | "good";
}) => <span className={`ai-value-pill ai-value-pill-${tone}`}>{label}</span>;

export const ClientQuestionMetricBridgePanel = ({
  bridge
}: {
  bridge: ClientQuestionMetricBridge;
}) => (
  <section
    className="ai-value-panel ai-value-question-metric-bridge-panel"
    aria-label="Outcome metric setup"
  >
    <div className="ai-value-section-head">
      <div>
        <p className="eyebrow">Outcome Setup</p>
        <h2>Choose the outcome metric</h2>
        <p>{bridge.summary}</p>
      </div>
      <StatusPill label={bridge.statusLabel} tone={bridge.available ? "good" : "warn"} />
    </div>

    {bridge.items.length > 0 ? (
      <div className="ai-value-question-metric-list">
        {bridge.items.map((item) => (
          <article className="ai-value-question-metric-item" key={item.id}>
            <div className="ai-value-map-grid">
              <div className="ai-value-map-cell ai-value-map-cell-wide">
                <span className="ai-value-map-label">Client value question</span>
                <strong>{item.sponsorQuestion}</strong>
                <p>{item.successMeasure}</p>
              </div>
              <div className="ai-value-map-cell">
                <span className="ai-value-map-label">Outcome to measure</span>
                <strong>{item.metricName}</strong>
                <p>{item.valueRouteLabel}</p>
              </div>
              <div className="ai-value-map-cell">
                <span className="ai-value-map-label">Customer data source</span>
                <strong>{item.sourceSystem}</strong>
                <p>{item.measurementUnit}</p>
              </div>
              <div className="ai-value-map-cell">
                <span className="ai-value-map-label">Comparison window</span>
                <p>{item.baselineRule}</p>
              </div>
              <div className="ai-value-map-cell">
                <span className="ai-value-map-label">Data owner</span>
                <p>{item.owner}</p>
              </div>
              <div className="ai-value-map-cell">
                <span className="ai-value-map-label">Evidence status</span>
                <p>{item.evidenceStatus}</p>
              </div>
              <div className="ai-value-map-cell ai-value-map-cell-wide">
                <span className="ai-value-map-label">Allowed value language</span>
                <p>{item.allowedClaimLevel}</p>
                <small>{item.feedsNext}</small>
              </div>
            </div>
          </article>
        ))}
      </div>
    ) : (
      <p>
        Add the client success measure and outcome metric before Evidence
        Readiness can start.
      </p>
    )}
  </section>
);
