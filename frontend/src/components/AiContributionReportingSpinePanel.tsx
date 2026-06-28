import {
  allowedNextEvidenceActionLabel,
  comparisonDesignIntakeAllowedActionLabel,
  comparisonDesignIntakeGapLabel,
  comparisonDesignIntakeReadinessStateLabel,
  comparisonDesignSourcePackageDraftAllowedActionLabel,
  comparisonDesignSourcePackageDraftAssemblyStateLabel,
  comparisonDesignSourcePackageDraftStateLabel,
  comparisonDesignSourcePackageReviewAllowedActionLabel,
  comparisonDesignSourcePackageReviewStateLabel,
  evidenceGapLabel,
  modelReviewPostureLabel,
  reviewerOwnedSourcePackageCollectionAllowedActionLabel,
  reviewerOwnedSourcePackageCollectionStateLabel,
  reviewerMetricSelectionDraftIntakeStateLabel,
  type AiContributionReportingSpineViewModel
} from "../lib/aiValueContributionReportingSpine";
import { type AiValueUiViewModel } from "../lib/aiValueUiViewModelAdapter";

const StatusPill = ({
  label,
  tone = "neutral"
}: {
  label: string;
  tone?: "neutral" | "warn" | "good";
}) => <span className={`ai-value-pill ai-value-pill-${tone}`}>{label}</span>;

const RequirementList = ({
  title,
  items
}: {
  title: string;
  items: string[];
}) => {
  if (items.length === 0) return null;

  return (
    <div className="ai-value-map-cell">
      <span className="ai-value-map-label">{title}</span>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
};

export const AiValueUiViewModelPanel = ({
  viewModel
}: {
  viewModel: AiValueUiViewModel;
}) => {
  const journeySections = [
    viewModel.can_show_blueprint && "Blueprint",
    viewModel.can_show_metrics && "Metric options",
    viewModel.can_show_measurement_plan && "Measurement plan",
    viewModel.can_show_data_collection_plan && "Collection planning",
    viewModel.can_show_source_package_status && "Source package",
    viewModel.can_show_comparison_design_status && "Comparison design",
    viewModel.can_show_evidence_alignment_status && "Evidence alignment"
  ].filter(Boolean) as string[];
  const canShowEvidenceStreams =
    viewModel.can_show_evidence_alignment_status &&
    viewModel.visible_evidence_streams.length > 0;

  return (
    <section
      className="ai-value-map-cell ai-value-map-cell-wide"
      aria-label="AI value UI view model"
    >
      <div className="ai-value-section-head">
        <div>
          <span className="ai-value-map-label">Measurement journey status</span>
          <h3>{viewModel.status_label}</h3>
          <p>{viewModel.status_description}</p>
        </div>
        <StatusPill
          label={`Step ${viewModel.progress_step_index} of ${viewModel.progress_step_total}`}
          tone="warn"
        />
      </div>

      <div className="ai-value-map-grid">
        <div className="ai-value-map-cell">
          <span className="ai-value-map-label">Next action</span>
          <strong>{viewModel.next_action_label}</strong>
          <p>{viewModel.next_action_description}</p>
        </div>
        <div className="ai-value-map-cell">
          <span className="ai-value-map-label">User should do next</span>
          <p>{viewModel.user_should_do_next}</p>
        </div>
        {viewModel.can_show_model_review_status && (
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Model review posture</span>
            <strong>Model review blocked</strong>
            <p>Held until governed diagnostics evidence exists.</p>
          </div>
        )}
        <div className="ai-value-map-cell">
          <span className="ai-value-map-label">Governance banner</span>
          <p>{viewModel.governance_banner}</p>
        </div>
        <div className="ai-value-map-cell">
          <span className="ai-value-map-label">What can be shown</span>
          <p>{viewModel.allowed_user_message}</p>
        </div>
        <div className="ai-value-map-cell">
          <span className="ai-value-map-label">Boundary</span>
          <p>{viewModel.blocked_language_message}</p>
        </div>
      </div>

      {(journeySections.length > 0 || canShowEvidenceStreams) && (
        <div className="ai-value-map-grid">
          {journeySections.length > 0 && (
            <div className="ai-value-map-cell">
              <span className="ai-value-map-label">Journey sections</span>
              <ul>
                {journeySections.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {canShowEvidenceStreams && (
            <div className="ai-value-map-cell">
              <span className="ai-value-map-label">Evidence streams for review</span>
              <ul>
                {viewModel.visible_evidence_streams.map((stream) => (
                  <li key={stream}>{stream}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="ai-value-map-grid">
        <RequirementList
          title="Missing requirements"
          items={viewModel.missing_requirements}
        />
        <RequirementList
          title="Held requirements"
          items={viewModel.held_requirements}
        />
        <RequirementList
          title="Suppressed requirements"
          items={viewModel.suppressed_requirements}
        />
        <RequirementList title="Not yet evidence" items={viewModel.not_yet_evidence} />
        <RequirementList title="Held boundaries" items={viewModel.blocked_claims} />
      </div>
    </section>
  );
};

export const AiContributionReportingSpinePanel = ({
  spine
}: {
  spine: AiContributionReportingSpineViewModel;
}) => {
  const draft = spine.reviewerMetricSelectionDraftIntake;
  const comparisonReadiness = spine.comparisonDesignIntakeReadiness;
  const sourcePackageDraft = spine.comparisonDesignSourcePackageDraft;
  const reviewerOwnedCollection = spine.reviewerOwnedSourcePackageCollection;
  const sourcePackageReview = spine.comparisonDesignSourcePackageReview;
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
      <AiValueUiViewModelPanel viewModel={spine.uiViewModel} />
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
            <span className="ai-value-map-label">Comparison-design source package review</span>
            <h3>
              {comparisonDesignSourcePackageReviewStateLabel(
                sourcePackageReview.reviewState
              )}
            </h3>
            <p>
              Source package review checks reviewer-owned completeness and
              admissibility only. It is not evidence satisfaction or Bayesian
              readiness.
            </p>
          </div>
          <StatusPill
            label={
              sourcePackageReview.sourcePackageReviewReady
                ? "Review-ready only"
                : "Held"
            }
            tone="warn"
          />
        </div>
        <div className="ai-value-map-grid">
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Reviewer-owned package</span>
            <p>
              {sourcePackageReview.reviewerOwnedSourcePackageSupplied
                ? "Reviewer-owned package supplied"
                : "Reviewer-owned package not supplied"}
            </p>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Completeness</span>
            <p>
              {sourcePackageReview.sourcePackageReviewReady
                ? "Complete for later adequacy review only"
                : "Held for package review"}
            </p>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Admissibility</span>
            <p>
              {sourcePackageReview.sourcePackageReviewReady
                ? "Admissible for later review only"
                : "Not admissible yet"}
            </p>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Allowed next action</span>
            <p>
              {comparisonDesignSourcePackageReviewAllowedActionLabel(
                sourcePackageReview.allowedNextAction
              )}
            </p>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Evidence status</span>
            <p>No diagnostics evidence created.</p>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Comparison-design adequacy</span>
            <p>Not satisfied by source package review.</p>
          </div>
          <div className="ai-value-map-cell ai-value-map-cell-wide">
            <span className="ai-value-map-label">Review package milestones</span>
            <div className="ai-value-chip-row">
              {sourcePackageReview.milestoneSchedule.requiredMilestones.map(
                (milestone) => (
                  <StatusPill key={milestone.key} label={milestone.label} />
                )
              )}
            </div>
          </div>
          <div className="ai-value-map-cell ai-value-map-cell-wide">
            <span className="ai-value-map-label">Missing fields / review gaps</span>
            {sourcePackageReview.missingFields.length > 0 ||
            sourcePackageReview.reviewGaps.length > 0 ? (
              <ul>
                {[
                  ...sourcePackageReview.missingFields,
                  ...sourcePackageReview.reviewGaps
                ]
                  .slice(0, 6)
                  .map((gap) => (
                    <li key={gap}>{comparisonDesignIntakeGapLabel(gap)}</li>
                  ))}
              </ul>
            ) : (
              <p>No review gaps for later adequacy review.</p>
            )}
          </div>
        </div>
        <p className="ai-value-inline-alert">
          Source package review checks reviewer-owned completeness and
          admissibility only; it does not satisfy comparison-design adequacy,
          create diagnostics evidence, or feed Bayesian promotion.
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
                ? "Reviewer-owned package received for review only"
                : "Reviewer-owned package not supplied"}
            </p>
          </div>
          <div className="ai-value-map-cell">
            <span className="ai-value-map-label">Review readiness</span>
            <p>
              {reviewerOwnedCollection.sourcePackageReviewReady
                ? "Ready for later adequacy review only"
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
