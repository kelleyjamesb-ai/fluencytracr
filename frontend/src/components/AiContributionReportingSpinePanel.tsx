import {
  allowedNextEvidenceActionLabel,
  evidenceGapLabel,
  modelReviewPostureLabel,
  reviewerMetricSelectionDraftIntakeStateLabel,
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
}) => {
  const draft = spine.reviewerMetricSelectionDraftIntake;
  const draftPrepared =
    draft.draftIntakeState === "DRAFT_INTAKE_PREPARED_REVIEW_REQUIRED";

  return (
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
        <div className="ai-value-section-head">
          <div>
            <span className="ai-value-map-label">Reviewer metric-selection draft intake</span>
            <h3>{reviewerMetricSelectionDraftIntakeStateLabel(draft.draftIntakeState)}</h3>
            <p>
              {draftPrepared
                ? "Reviewer approval still required before metric selection can become comparison-design input."
                : "Choose a candidate metric before draft intake preparation."}
            </p>
          </div>
          <StatusPill label="Draft only" tone="warn" />
        </div>
        <div className="ai-value-map-grid">
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Source Blueprint hypothesis</span>
            <p>{draft.sourceBlueprintHypothesisRef ? "Supplied for draft intake" : "Missing"}</p>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Candidate metric recommendation</span>
            <p>
              {draft.candidateMetricRecommendationRef
                ? "Matched candidate recommendation"
                : "No matched candidate recommendation"}
            </p>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Draft selected metric candidate</span>
            <p>{draft.draftSelectedMetricCandidate ?? "No draft selected metric"}</p>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Metric owner / reviewer role</span>
            <p>{draft.metricOwnerReviewerRole ?? "Metric owner / reviewer role pending"}</p>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Expected direction</span>
            <p>Direction requires reviewer expectation path.</p>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Lag context</span>
            <p>Lag requires reviewer expectation path.</p>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Baseline source posture</span>
            <p>Baseline source review required.</p>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Comparison condition</span>
            <p>Comparison condition review required.</p>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Cohort identity</span>
            <p>{draft.cohortIdentity}</p>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Workflow / function identity</span>
            <p>{draft.workflowFunctionIdentity}</p>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Aggregate Measurement Cell grain</span>
            <p>Draft grain pending review.</p>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Suppression / missing / held precheck</span>
            <p>Suppression, missing, or held window precheck required.</p>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Reviewer decision placeholder</span>
            <p>Reviewer decision still pending.</p>
          </div>
          <div className="ai-value-map-cell ai-value-map-cell-wide">
            <span className="ai-value-map-label">Draft milestone schedule</span>
            <div className="ai-value-chip-row">
              {draft.milestoneSchedule.requiredMilestones.map((milestone) => (
                <StatusPill key={milestone.key} label={milestone.label} />
              ))}
            </div>
          </div>
        </div>
        <p className="ai-value-inline-alert">
          Draft intake does not approve the metric, create governed approval,
          create diagnostics evidence, satisfy comparison-design adequacy, or
          feed Bayesian promotion.
        </p>
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
};
