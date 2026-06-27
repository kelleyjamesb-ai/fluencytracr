import {
  allowedNextEvidenceActionLabel,
  comparisonDesignIntakeAllowedActionLabel,
  comparisonDesignIntakeGapLabel,
  comparisonDesignIntakeReadinessStateLabel,
  comparisonDesignSourcePackageDraftAllowedActionLabel,
  comparisonDesignSourcePackageDraftAssemblyStateLabel,
  comparisonDesignSourcePackageDraftStateLabel,
  evidenceGapLabel,
  modelReviewPostureLabel,
  reviewerOwnedSourcePackageCollectionAllowedActionLabel,
  reviewerOwnedSourcePackageCollectionStateLabel,
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
  const comparisonReadiness = spine.comparisonDesignIntakeReadiness;
  const sourcePackageDraft = spine.comparisonDesignSourcePackageDraft;
  const reviewerOwnedCollection = spine.reviewerOwnedSourcePackageCollection;
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
        <div className="ai-value-section-head">
          <div>
            <span className="ai-value-map-label">Comparison-design intake readiness</span>
            <h3>
              {comparisonDesignIntakeReadinessStateLabel(
                comparisonReadiness.readinessState
              )}
            </h3>
            <p>
              Readiness review prepares a comparison-design source package draft.
              It is not reviewer approval, diagnostics evidence, or Bayesian
              readiness.
            </p>
          </div>
          <StatusPill label="Readiness only" tone="warn" />
        </div>
        <div className="ai-value-map-grid">
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Source Blueprint hypothesis</span>
            <p>
              {comparisonReadiness.sourceBlueprintHypothesisRef
                ? "Supplied for readiness review"
                : "Missing"}
            </p>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Candidate recommendation ref</span>
            <p>
              {comparisonReadiness.candidateMetricRecommendationRef
                ? "Matched candidate recommendation"
                : "Missing"}
            </p>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Draft selected metric</span>
            <p>
              {comparisonReadiness.draftSelectedMetricCandidate ??
                "No draft selected metric"}
            </p>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Reviewer role</span>
            <p>{comparisonReadiness.reviewerRole ?? "Reviewer role pending"}</p>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Reviewer decision posture</span>
            <p>Reviewer decision still pending.</p>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Measurement plan posture</span>
            <p>Direction, lag, baseline, comparison, grain, and window precheck require review.</p>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Source package draft state</span>
            <p>
              {comparisonDesignSourcePackageDraftStateLabel(
                comparisonReadiness.comparisonDesignSourcePackageDraftState
              )}
            </p>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Allowed next action</span>
            <p>
              {comparisonDesignIntakeAllowedActionLabel(
                comparisonReadiness.allowedNextAction
              )}
            </p>
          </div>
          <div className="ai-value-map-cell ai-value-map-cell-wide">
            <span className="ai-value-map-label">Readiness gaps</span>
            <ul>
              {comparisonReadiness.readinessGaps.map((gap) => (
                <li key={gap}>{comparisonDesignIntakeGapLabel(gap)}</li>
              ))}
            </ul>
          </div>
          <div className="ai-value-map-cell ai-value-map-cell-wide">
            <span className="ai-value-map-label">Readiness milestone schedule</span>
            <div className="ai-value-chip-row">
              {comparisonReadiness.milestoneSchedule.requiredMilestones.map(
                (milestone) => (
                  <StatusPill key={milestone.key} label={milestone.label} />
                )
              )}
            </div>
          </div>
        </div>
        <p className="ai-value-inline-alert">
          Comparison-design readiness does not create a source package, satisfy
          comparison-design adequacy, create diagnostics evidence, or authorize
          promotion.
        </p>
      </div>
    </div>

    <div className="ai-value-map-grid">
      <div className="ai-value-map-cell ai-value-map-cell-wide">
        <div className="ai-value-section-head">
          <div>
            <span className="ai-value-map-label">Source package draft assembly</span>
            <h3>
              {comparisonDesignSourcePackageDraftAssemblyStateLabel(
                sourcePackageDraft.draftAssemblyState
              )}
            </h3>
            <p>
              Draft assembly copies safe planning posture into the intake
              checklist. It is not a reviewed source package.
            </p>
          </div>
          <StatusPill label="Draft only" tone="warn" />
        </div>
        <div className="ai-value-map-grid">
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Draft status</span>
            <p>
              {sourcePackageDraft.sourcePackageDraftCreated
                ? "Draft checklist assembled"
                : "Draft checklist held"}
            </p>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Template binding</span>
            <p>Comparison-design intake template.</p>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Draft selected metric</span>
            <p>
              {sourcePackageDraft.draftSelectedMetricCandidate ??
                "No draft selected metric"}
            </p>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Reviewer role</span>
            <p>
              {sourcePackageDraft.metricOwnerReviewerRole ??
                "Reviewer role pending"}
            </p>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Allowed next action</span>
            <p>
              {comparisonDesignSourcePackageDraftAllowedActionLabel(
                sourcePackageDraft.allowedNextAction
              )}
            </p>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Actual source package</span>
            <p>
              {sourcePackageDraft.sourcePackageCreated
                ? "Unexpected source package present"
                : "Not created"}
            </p>
          </div>
          <div className="ai-value-map-cell ai-value-map-cell-wide">
            <span className="ai-value-map-label">Draft package milestones</span>
            <div className="ai-value-chip-row">
              {sourcePackageDraft.requiredMilestoneLabels.map((milestone) => (
                <StatusPill key={milestone} label={milestone} />
              ))}
            </div>
          </div>
        </div>
        <p className="ai-value-inline-alert">
          Source package draft assembly does not create governed evidence,
          source evidence hashes, comparison-design adequacy satisfaction, or
          promotion authority.
        </p>
      </div>
    </div>

    <div className="ai-value-map-grid">
      <div className="ai-value-map-cell ai-value-map-cell-wide">
        <div className="ai-value-section-head">
          <div>
            <span className="ai-value-map-label">Reviewer-owned source package collection</span>
            <h3>
              {reviewerOwnedSourcePackageCollectionStateLabel(
                reviewerOwnedCollection.collectionState
              )}
            </h3>
            <p>
              Collection stays held until the draft source package review is
              complete. Reviewer-owned aggregate attestations remain outside
              this product flow.
            </p>
          </div>
          <StatusPill label="Outside product flow" tone="warn" />
        </div>
        <div className="ai-value-map-grid">
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Collection status</span>
            <p>
              {reviewerOwnedCollection.reviewerOwnedSourcePackageSupplied
                ? "Unexpected source package supplied"
                : "Reviewer-owned package not supplied"}
            </p>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Review readiness</span>
            <p>
              {reviewerOwnedCollection.sourcePackageReviewReady
                ? "Unexpected review-ready state"
                : "Not ready for adequacy review"}
            </p>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Allowed next action</span>
            <p>
              {reviewerOwnedSourcePackageCollectionAllowedActionLabel(
                reviewerOwnedCollection.allowedNextAction
              )}
            </p>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Evidence status</span>
            <p>No diagnostics evidence created.</p>
          </div>
          <div className="ai-value-map-cell ai-value-map-cell-wide">
            <span className="ai-value-map-label">Required reviewer attestations</span>
            <ul>
              {reviewerOwnedCollection.requiredReviewerAttestations
                .slice(0, 5)
                .map((attestation) => (
                  <li key={attestation}>{comparisonDesignIntakeGapLabel(attestation)}</li>
                ))}
            </ul>
          </div>
        </div>
        <p className="ai-value-inline-alert">
          Reviewer-owned collection remains outside this product flow and
          cannot create evidence, source hashes, comparison-design adequacy, or
          Bayesian promotion.
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
