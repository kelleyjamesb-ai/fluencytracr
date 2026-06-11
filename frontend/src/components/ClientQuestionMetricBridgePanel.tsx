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
    aria-label="Client questions to metrics mapping"
  >
    <div className="ai-value-section-head">
      <div>
        <p className="eyebrow">Metrics Mapping</p>
        <h2>Questions to Metrics Bridge</h2>
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
                <span className="ai-value-map-label">Client question</span>
                <strong>{item.sponsorQuestion}</strong>
                <p>{item.successMeasure}</p>
              </div>
              <div className="ai-value-map-cell">
                <span className="ai-value-map-label">Recommended metric</span>
                <strong>{item.metricName}</strong>
                <p>{item.valueRouteLabel}</p>
              </div>
              <div className="ai-value-map-cell">
                <span className="ai-value-map-label">Customer system</span>
                <strong>{item.sourceSystem}</strong>
                <p>{item.measurementUnit}</p>
              </div>
              <div className="ai-value-map-cell">
                <span className="ai-value-map-label">Comparison rule</span>
                <p>{item.baselineRule}</p>
              </div>
              <div className="ai-value-map-cell">
                <span className="ai-value-map-label">Owner</span>
                <p>{item.owner}</p>
              </div>
              <div className="ai-value-map-cell">
                <span className="ai-value-map-label">Evidence status</span>
                <p>{item.evidenceStatus}</p>
              </div>
              <div className="ai-value-map-cell ai-value-map-cell-wide">
                <span className="ai-value-map-label">Safe claim level</span>
                <p>{item.allowedClaimLevel}</p>
                <small>{item.feedsNext}</small>
              </div>
            </div>
          </article>
        ))}
      </div>
    ) : (
      <p>
        Add the client success measure and governed metric before the value
        path can feed scenario readiness.
      </p>
    )}
  </section>
);
