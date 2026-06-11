import type { ValueSpineTrace } from "../hooks/useAiValueJourney";

const StatusPill = ({
  label,
  tone = "neutral"
}: {
  label: string;
  tone?: "neutral" | "warn" | "good";
}) => <span className={`ai-value-pill ai-value-pill-${tone}`}>{label}</span>;

export const ValueSpineTracePanel = ({ trace }: { trace: ValueSpineTrace }) => (
  <section className="ai-value-panel ai-value-spine-trace-panel" aria-label="Client value spine trace">
    <div className="ai-value-section-head">
      <div>
        <p className="eyebrow">Client Value Path</p>
        <h2>Client Value Spine Trace</h2>
        <p>{trace.summary}</p>
      </div>
      <StatusPill label={trace.statusLabel} tone={trace.available ? "good" : "warn"} />
    </div>

    {trace.steps.length > 0 ? (
      <div className="ai-value-spine-trace-list">
        {trace.steps.map((step, index) => (
          <article className="ai-value-spine-trace-step" key={step.label}>
            <div className="ai-value-spine-trace-index" aria-hidden="true">
              {index + 1}
            </div>
            <div className="ai-value-spine-trace-content">
              <div className="ai-value-spine-trace-head">
                <div>
                  <span className="ai-value-map-label">{step.label}</span>
                  <strong>{step.answer}</strong>
                </div>
                <StatusPill label={step.statusLabel} tone={step.statusTone} />
              </div>
              <p>{step.detail}</p>
              <small>{step.feedsNext}</small>
            </div>
          </article>
        ))}
      </div>
    ) : (
      <p>Finish the Blueprint and metric mapping before tracing the client value path.</p>
    )}
  </section>
);
