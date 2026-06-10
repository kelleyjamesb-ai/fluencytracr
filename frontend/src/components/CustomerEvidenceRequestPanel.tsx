import type { CustomerEvidenceRequest } from "../hooks/useAiValueJourney";

const StatusPill = ({
  label,
  tone = "neutral"
}: {
  label: string;
  tone?: "neutral" | "warn" | "good";
}) => <span className={`ai-value-pill ai-value-pill-${tone}`}>{label}</span>;

export const CustomerEvidenceRequestPanel = ({
  request
}: {
  request: CustomerEvidenceRequest;
}) => (
  <section
    className="ai-value-panel ai-value-customer-evidence-request-panel"
    aria-label="Customer evidence request"
  >
    <div className="ai-value-section-head">
      <div>
        <p className="eyebrow">Client Data Ask</p>
        <h2>Customer Evidence Request</h2>
        <p>
          Turn value-model readiness into the aggregate export, owner, review
          step, and claim limits the client needs before stronger value language.
        </p>
      </div>
      <StatusPill label={request.statusLabel} tone={request.available ? "good" : "warn"} />
    </div>

    <div className="ai-value-map-grid">
      <div className="ai-value-map-cell ai-value-map-cell-wide">
        <span className="ai-value-map-label">Request to make</span>
        <p>{request.requestedExport}</p>
      </div>
      <div className="ai-value-map-cell">
        <span className="ai-value-map-label">Outcome metric</span>
        <strong>{request.metricName}</strong>
      </div>
      <div className="ai-value-map-cell">
        <span className="ai-value-map-label">Customer system</span>
        <strong>{request.sourceSystem}</strong>
      </div>
      <div className="ai-value-map-cell">
        <span className="ai-value-map-label">Approved export level</span>
        <strong>{request.approvedGrain}</strong>
      </div>
      <div className="ai-value-map-cell">
        <span className="ai-value-map-label">Baseline window</span>
        <p>{request.baselineWindow}</p>
      </div>
      <div className="ai-value-map-cell">
        <span className="ai-value-map-label">Comparison window</span>
        <p>{request.comparisonWindow}</p>
      </div>
      <div className="ai-value-map-cell ai-value-map-cell-wide">
        <span className="ai-value-map-label">Owners and review</span>
        <div className="ai-value-agent-handoff-grid">
          {request.owners.map((owner) => (
            <div className="ai-value-agent-handoff" key={`${owner.label}-${owner.owner}`}>
              <strong>{owner.label}</strong>
              <p>{owner.owner}</p>
              <small>{owner.detail}</small>
            </div>
          ))}
        </div>
        <p>{request.reviewStep}</p>
      </div>
      <div className="ai-value-map-cell ai-value-map-cell-wide">
        <span className="ai-value-map-label">Still blocked until review</span>
        <div className="ai-value-chip-row">
          {request.remainingBlockedLanguage.map((language) => (
            <StatusPill key={language} label={language} />
          ))}
        </div>
        <p>{request.caveat}</p>
      </div>
    </div>
  </section>
);
