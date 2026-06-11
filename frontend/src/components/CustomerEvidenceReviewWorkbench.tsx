import type { CustomerEvidenceReviewWorkbench as CustomerEvidenceReviewWorkbenchModel } from "../hooks/useAiValueJourney";

const StatusPill = ({
  label,
  tone = "neutral"
}: {
  label: string;
  tone?: "neutral" | "warn" | "good";
}) => <span className={`ai-value-pill ai-value-pill-${tone}`}>{label}</span>;

export const CustomerEvidenceReviewWorkbench = ({
  review,
  onReview
}: {
  review: CustomerEvidenceReviewWorkbenchModel;
  onReview: (exportId: string, decision: "ACCEPTED" | "REJECTED") => void;
}) => (
  <section
    className="ai-value-panel ai-value-customer-evidence-review-panel"
    aria-label="Customer evidence review"
  >
    <div className="ai-value-section-head">
      <div>
        <p className="eyebrow">Evidence Review</p>
        <h2>Customer Evidence Review</h2>
        <p>
          Check the customer export against the request packet before any value
          language gets stronger.
        </p>
      </div>
      <StatusPill label={review.statusLabel} tone={review.statusTone} />
    </div>

    <div className="ai-value-review-workbench">
      <div className="ai-value-review-summary">
        <p>{review.summary}</p>
      </div>

      <div className="ai-value-map-grid">
        <div className="ai-value-map-cell">
          <span className="ai-value-map-label">Reviewer</span>
          <strong>{review.reviewer}</strong>
          <p>{review.reviewerDetail}</p>
        </div>
        <div className="ai-value-map-cell">
          <span className="ai-value-map-label">Match check</span>
          <p>{review.matchSummary}</p>
        </div>
        <div className="ai-value-map-cell ai-value-map-cell-wide">
          <span className="ai-value-map-label">Requested export must match</span>
          <div className="ai-value-review-fact-grid">
            {review.facts.map((fact) => (
              <div className="ai-value-review-fact" key={fact.label}>
                <strong>{fact.label}</strong>
                <p>{fact.value}</p>
                <small>{fact.detail}</small>
              </div>
            ))}
          </div>
        </div>
        <div className="ai-value-map-cell ai-value-map-cell-wide">
          <span className="ai-value-map-label">Still blocked</span>
          <div className="ai-value-chip-row">
            {review.remainingBlockedLanguage.map((language) => (
              <StatusPill key={language} label={language} />
            ))}
          </div>
          <p>{review.nextAction}</p>
        </div>
      </div>

      {review.canReview && review.reviewableExportId && (
        <div className="ai-value-chip-row ai-value-review-actions">
          <button
            type="button"
            className="ai-value-step"
            onClick={() => onReview(review.reviewableExportId!, "ACCEPTED")}
          >
            Accept
          </button>
          <button
            type="button"
            className="ai-value-step"
            onClick={() => onReview(review.reviewableExportId!, "REJECTED")}
          >
            Reject
          </button>
        </div>
      )}
    </div>
  </section>
);
