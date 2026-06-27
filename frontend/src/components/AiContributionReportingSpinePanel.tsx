import {
  allowedNextEvidenceActionLabel,
  evidenceGapLabel,
  modelReviewPostureLabel,
  type AiContributionReportingSpineViewModel
} from "../lib/aiValueContributionReportingSpine";

const StatusPill = ({
  label,
  tone = "neutral"
}: {
  label: string;
  tone?: "neutral" | "warn" | "good";
}) => <span className={`ai-value-pill ai-value-pill-${tone}`}>{label}</span>;

export const AiContributionReportingSpinePanel = ({
  spine
}: {
  spine: AiContributionReportingSpineViewModel;
}) => (
  <section className="ai-value-panel" aria-label="AI contribution reporting spine">
    <div className="ai-value-section-head">
      <div>
        <p className="eyebrow">Reporting spine</p>
        <h2>Measurement story</h2>
        <p>
          Blueprint hypothesis, candidate metrics, metric approval status,
          window schedule, evidence gaps, and model-review posture stay
          separated.
        </p>
      </div>
      <StatusPill label={spine.statusLabel} tone={spine.statusTone} />
    </div>

    <div className="ai-value-map-grid">
      <div className="ai-value-map-cell">
        <span className="ai-value-map-label">Blueprint hypothesis</span>
        <strong>{spine.blueprintHypothesisRef ? "Supplied" : "Missing"}</strong>
        <p>{spine.workflowFunctionScope}</p>
      </div>
      <div className="ai-value-map-cell">
        <span className="ai-value-map-label">Candidate recommendations</span>
        <strong>Planning inputs only</strong>
        <p>Candidate metric recommendations are planning inputs.</p>
      </div>
      <div className="ai-value-map-cell">
        <span className="ai-value-map-label">Selected metric approval</span>
        <strong>{spine.selectedMetricPosture.label}</strong>
        <p>{spine.selectedMetricPosture.metricLabel}</p>
      </div>
      <div className="ai-value-map-cell">
        <span className="ai-value-map-label">Model review posture</span>
        <strong>{modelReviewPostureLabel(spine.modelReviewInputPosture)}</strong>
        <p>Governed diagnostics source remains held.</p>
      </div>
      <div className="ai-value-map-cell">
        <span className="ai-value-map-label">Allowed next evidence action</span>
        <strong>{allowedNextEvidenceActionLabel(spine.allowedNextEvidenceAction)}</strong>
        <p>Derived from the reporting-spine evidence gaps.</p>
      </div>
      <div className="ai-value-map-cell">
        <span className="ai-value-map-label">Value route</span>
        <strong>{spine.valueRouteLabel}</strong>
        <p>Aggregate planning context only.</p>
      </div>
    </div>

    <div className="ai-value-map-grid">
      <div className="ai-value-map-cell ai-value-map-cell-wide">
        <span className="ai-value-map-label">Milestone plan</span>
        <div className="ai-value-chip-row">
          {spine.milestonePlan.requiredMilestones.map((milestone) => (
            <StatusPill key={milestone.key} label={milestone.label} />
          ))}
        </div>
      </div>
      <div className="ai-value-map-cell">
        <span className="ai-value-map-label">Evidence gaps</span>
        <ul>
          {spine.evidenceGapList.map((gap) => (
            <li key={gap}>{evidenceGapLabel(gap)}</li>
          ))}
        </ul>
      </div>
      <div className="ai-value-map-cell">
        <span className="ai-value-map-label">Candidate metrics</span>
        {spine.candidateMetricRecommendations.length > 0 ? (
          <ul>
            {spine.candidateMetricRecommendations.slice(0, 4).map((recommendation) => (
              <li key={recommendation.candidateMetricId}>{recommendation.metricLabel}</li>
            ))}
          </ul>
        ) : (
          <p>No candidate metric recommendation until planning inputs are supplied.</p>
        )}
      </div>
    </div>
  </section>
);
