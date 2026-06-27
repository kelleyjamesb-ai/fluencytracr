import { describe, expect, it } from "vitest";

import {
  REQUIRED_CONTRIBUTION_REPORTING_MILESTONES,
  buildAiContributionReportingSpineViewModel
} from "./aiValueContributionReportingSpine";

const bridge = {
  available: true,
  statusLabel: "Metric setup ready",
  summary: "Metric planning summary.",
  items: [
    {
      id: "support_resolution_hours",
      sponsorQuestion: "Which support outcome should we watch?",
      successMeasure: "Reduce median support resolution hours",
      metricName: "Median resolution time",
      valueRouteLabel: "Capacity creation",
      sourceSystem: "Support case management system",
      measurementUnit: "hours",
      baselineRule: "Compare against an approved pre-period window.",
      owner: "Customer data owner",
      evidenceStatus: "Customer outcome export missing",
      allowedClaimLevel: "Planning language only",
      feedsNext: "Next: Evidence Readiness"
    }
  ]
};
const unsafeTestTerm = (...parts: string[]) => parts.join("");
const escapedTestPatternText = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const completeReviewerOwnedComparisonDesignSourcePackage = {
  sourcePackageMode: "reviewer_owned_source_package",
  sourceBlueprintHypothesisRef:
    "blueprint_hypothesis.customer_support.case_resolution.2026_06",
  reviewerOwnedSourcePackageRef:
    "comparison_design_source_package.customer_support.case_resolution.2026_06",
  candidateMetricRecommendationRef:
    "candidate_metric_recommendation.support_resolution_hours",
  reviewerSelectedMetricCandidate: "Median resolution time",
  reviewerRole: "data_science_reviewer+governance_reviewer",
  reviewerDecisionPosture: "APPROVED_FOR_COMPARISON_DESIGN_ADEQUACY_REVIEW",
  expectedMovementDirection: "decrease",
  lagContext: "reviewer_approved_30_day_lag",
  milestoneScheduleRef:
    "milestone_schedule.customer_support.case_resolution.2026_06",
  milestoneWindowRefs: {
    T0: "milestone_window.customer_support.case_resolution.T0.2026_06",
    T30: "milestone_window.customer_support.case_resolution.T30.2026_06",
    T60: "milestone_window.customer_support.case_resolution.T60.2026_06",
    T90: "milestone_window.customer_support.case_resolution.T90.2026_06",
    T120: "milestone_window.customer_support.case_resolution.T120.2026_06",
    T180: "milestone_window.customer_support.case_resolution.T180.2026_06",
    T270: "milestone_window.customer_support.case_resolution.T270.2026_06",
    T365: "milestone_window.customer_support.case_resolution.T365.2026_06"
  },
  baselineSourcePosture: "reviewed_aggregate_baseline_source",
  comparisonCondition: "governed_comparison_group",
  cohortIdentity: "aggregate_customer_support_cohort",
  workflowFunctionIdentity: "customer_support_case_resolution",
  aggregateMeasurementCellGrain:
    "workflow_function+cohort+metric+expectation_path+milestone_window",
  suppressionMissingHeldPrecheckPosture: "CLEAR",
  forbiddenUseAttestationPosture: "ATTESTED_CLEAR",
  privacyIdentifierExclusionPosture: "ATTESTED_CLEAR",
  noCausalityClaimAttestationPosture: "ATTESTED_CLEAR"
} as const;

describe("AI contribution reporting spine view model", () => {
  it("fails closed when no Blueprint hypothesis is supplied", () => {
    const spine = buildAiContributionReportingSpineViewModel({});

    expect(spine.reportingSpineState).toBe("HOLD_FOR_BLUEPRINT_HYPOTHESIS");
    expect(spine.statusLabel).toBe("Needs Blueprint hypothesis");
    expect(spine.allowedNextEvidenceAction).toBe("clarify_blueprint_hypothesis");
    expect(spine.candidateMetricRecommendations).toEqual([]);
    expect(spine.reviewerMetricSelectionDraftIntake).toMatchObject({
      draftIntakeState: "DRAFT_INTAKE_HELD_FOR_BLUEPRINT_HYPOTHESIS",
      draftOnly: true,
      selectedMetricApproved: false,
      createsGovernedApproval: false,
      createsDiagnosticsEvidence: false,
      comparisonDesignAdequacySatisfied: false,
      feedsBayesianPromotion: false
    });
    expect(spine.comparisonDesignIntakeReadiness).toMatchObject({
      readinessState: "COMPARISON_DESIGN_INTAKE_HELD_FOR_BLUEPRINT_HYPOTHESIS",
      comparisonDesignSourcePackageDraftState: "SOURCE_PACKAGE_DRAFT_NOT_STARTED",
      allowedNextAction: "clarify_blueprint_hypothesis",
      draftReadinessOnly: true,
      sourceRefAndPostureOnly: true,
      selectedMetricApproved: false,
      createsGovernedApproval: false,
      createsDiagnosticsEvidence: false,
      comparisonDesignAdequacySatisfied: false,
      diagnosticsEvidenceSatisfied: false,
      feedsBayesianPromotion: false,
      promotionAuthorized: false
    });
    expect(spine.comparisonDesignIntakeReadiness.missingFields).toEqual([
      "missing_source_blueprint_hypothesis_ref",
      "missing_candidate_metric_recommendation_ref",
      "missing_draft_selected_metric_candidate",
      "missing_metric_owner_reviewer_role"
    ]);
    expect(spine.comparisonDesignSourcePackageDraft).toMatchObject({
      draftAssemblyState:
        "COMPARISON_DESIGN_SOURCE_PACKAGE_DRAFT_HELD_FOR_BLUEPRINT_HYPOTHESIS",
      sourcePackageDraftCreated: false,
      sourcePackageCreated: false,
      reviewerOwnedEvidenceCollected: false,
      createsGovernedApproval: false,
      createsDiagnosticsEvidence: false,
      comparisonDesignAdequacySatisfied: false,
      feedsBayesianPromotion: false,
      promotionAuthorized: false,
      allowedNextAction: "clarify_blueprint_hypothesis"
    });
    expect(spine.reviewerOwnedSourcePackageCollection).toMatchObject({
      collectionState:
        "REVIEWER_OWNED_SOURCE_PACKAGE_COLLECTION_HELD_FOR_SOURCE_PACKAGE_DRAFT",
      reviewerOwnedSourcePackageSupplied: false,
      sourcePackageReviewReady: false,
      evidenceSatisfied: false,
      comparisonDesignAdequacySatisfied: false,
      promotionAuthorized: false,
      allowedNextAction: "clarify_blueprint_hypothesis"
    });
    expect(spine.milestonePlan.requiredMilestones.map((milestone) => milestone.label)).toEqual([
      "T0",
      "T30",
      "T60",
      "T90",
      "T120",
      "T180",
      "T270",
      "T365"
    ]);
    expect(spine.promotionAuthorized).toBe(false);
    expect(spine.diagnosticsEvidenceSatisfied).toBe(false);
    expect(Object.values(spine.blockedOutputs).every((value) => value === false)).toBe(true);
  });

  it("renders candidate recommendations as planning inputs without selected metric approval", () => {
    const spine = buildAiContributionReportingSpineViewModel({
      blueprintHypothesisRef: "blueprint_hypothesis.customer_support.case_resolution.2026_06",
      workflowFunctionScope: "Customer Support case resolution",
      valueRouteLabel: "Capacity creation",
      metricLibraryRef: "metrics_library.customer_support.aggregate_outcomes",
      questionMetricBridge: bridge
    });

    expect(spine.reportingSpineState).toBe(
      "AI_CONTRIBUTION_REPORTING_SPINE_READY_WITH_EVIDENCE_GAPS"
    );
    expect(spine.candidateMetricRecommendations).toHaveLength(1);
    expect(spine.candidateMetricRecommendations[0]).toMatchObject({
      candidateMetricId: "support_resolution_hours",
      metricLabel: "Median resolution time",
      recommendationIsEvidence: false,
      selectedMetricApproved: false
    });
    expect(spine.selectedMetricApprovalState).toBe("HOLD_FOR_REVIEWER_APPROVAL");
    expect(spine.selectedMetricApproved).toBe(false);
    expect(spine.evidenceGapList).toContain("missing_reviewer_metric_approval");
    expect(spine.evidenceGapList).toContain("missing_comparison_design_source_package");
    expect(spine.allowedNextEvidenceAction).toBe("complete_reviewer_metric_selection_approval");
    expect(spine.comparisonDesignIntakeReadiness.readinessState).toBe(
      "COMPARISON_DESIGN_INTAKE_HELD_FOR_DRAFT_SELECTION"
    );
    expect(spine.comparisonDesignIntakeReadiness.allowedNextAction).toBe(
      "prepare_reviewer_metric_selection_draft_intake"
    );
    expect(spine.comparisonDesignIntakeReadiness.comparisonDesignAdequacySatisfied).toBe(false);
  });

  it("holds for metric library refs before rendering candidate recommendations", () => {
    const spine = buildAiContributionReportingSpineViewModel({
      blueprintHypothesisRef: "blueprint_hypothesis.customer_support.case_resolution.2026_06",
      workflowFunctionScope: "Customer Support case resolution",
      valueRouteLabel: "Capacity creation",
      questionMetricBridge: bridge
    });

    expect(spine.reportingSpineState).toBe("HOLD_FOR_METRIC_LIBRARY_REFS");
    expect(spine.candidateMetricRecommendations).toEqual([]);
    expect(spine.evidenceGapList).toEqual(["missing_metric_library_refs"]);
    expect(spine.allowedNextEvidenceAction).toBe("supply_metric_library_refs");
    expect(spine.recommendationsCreateEvidence).toBe(false);
    expect(spine.selectedMetricApproved).toBe(false);
  });

  it("keeps browser-local metric selection separate from reviewer approval", () => {
    const spine = buildAiContributionReportingSpineViewModel({
      blueprintHypothesisRef: "blueprint_hypothesis.customer_support.case_resolution.2026_06",
      workflowFunctionScope: "Customer Support case resolution",
      valueRouteLabel: "Capacity creation",
      metricLibraryRef: "metrics_library.customer_support.aggregate_outcomes",
      questionMetricBridge: bridge,
      selectedOutcomeMetricSelection: {
        functionArea: "Customer or Account Success",
        quadrantLabel: "Deep but slow",
        vbdBaseline: "Velocity 42 · Breadth 55 · Depth 66",
        metrics: [
          {
            id: "support_resolution_hours",
            name: "Median resolution time",
            valueRoute: "Capacity creation",
            sourceSystem: "Support case management system",
            measurementUnit: "hours",
            owner: "Customer data owner"
          }
        ]
      }
    });

    expect(spine.selectedMetricApprovalState).toBe("LOCAL_SELECTION_NOT_REVIEWER_APPROVED");
    expect(spine.selectedMetricPosture.label).toBe("Local selection only");
    expect(spine.selectedMetricPosture.metricLabel).toBe("Median resolution time");
    expect(spine.reviewerMetricSelectionDraftIntake).toMatchObject({
      draftIntakeState: "DRAFT_INTAKE_PREPARED_REVIEW_REQUIRED",
      sourceBlueprintHypothesisRef: "blueprint_hypothesis.customer_support.case_resolution.2026_06",
      candidateMetricRecommendationRef:
        "candidate_metric_recommendation.support_resolution_hours",
      draftSelectedMetricCandidate: "Median resolution time",
      metricOwnerReviewerRole: "Metric owner / reviewer role supplied",
      expectedMovementDirection: "directional_review_required",
      lagContext: "HOLD_FOR_REVIEWER_EXPECTATION_PATH",
      baselineSourcePosture: "HOLD_FOR_BASELINE_SOURCE_REVIEW",
      comparisonCondition: "HOLD_FOR_COMPARISON_CONDITION_REVIEW",
      cohortIdentity: "Customer or Account Success",
      workflowFunctionIdentity: "Customer Support case resolution",
      aggregateMeasurementCellGrain: "DRAFT_GRAIN_PENDING_REVIEW",
      suppressionMissingHeldPrecheckPosture:
        "HOLD_FOR_SUPPRESSION_MISSING_HELD_PRECHECK",
      reviewerDecisionPlaceholder: "HOLD_FOR_REVIEWER_DECISION",
      draftOnly: true,
      localFrontendStateOnly: true,
      selectedMetricApproved: false,
      createsGovernedApproval: false,
      createsDiagnosticsEvidence: false,
      comparisonDesignAdequacySatisfied: false,
      feedsBayesianPromotion: false
    });
    expect(spine.comparisonDesignIntakeReadiness).toMatchObject({
      readinessState: "COMPARISON_DESIGN_INTAKE_READY_FOR_SOURCE_PACKAGE_DRAFT_REVIEW",
      sourceBlueprintHypothesisRef: "blueprint_hypothesis.customer_support.case_resolution.2026_06",
      candidateMetricRecommendationRef:
        "candidate_metric_recommendation.support_resolution_hours",
      draftSelectedMetricCandidate: "Median resolution time",
      reviewerRole: "Metric owner / reviewer role supplied",
      reviewerDecisionPosture: "HOLD_FOR_REVIEWER_DECISION",
      expectedMovementDirection: "directional_review_required",
      lagContext: "HOLD_FOR_REVIEWER_EXPECTATION_PATH",
      baselineSourcePosture: "HOLD_FOR_BASELINE_SOURCE_REVIEW",
      comparisonCondition: "HOLD_FOR_COMPARISON_CONDITION_REVIEW",
      aggregateMeasurementCellGrain: "DRAFT_GRAIN_PENDING_REVIEW",
      suppressionMissingHeldPrecheckPosture:
        "HOLD_FOR_SUPPRESSION_MISSING_HELD_PRECHECK",
      comparisonDesignSourcePackageDraftState:
        "SOURCE_PACKAGE_DRAFT_READY_FOR_REVIEW_PREPARATION",
      missingFields: [],
      allowedNextAction: "complete_comparison_design_source_package_draft_review",
      selectedMetricApproved: false,
      createsGovernedApproval: false,
      createsDiagnosticsEvidence: false,
      comparisonDesignAdequacySatisfied: false,
      diagnosticsEvidenceSatisfied: false,
      feedsBayesianPromotion: false,
      promotionAuthorized: false
    });
    expect(spine.comparisonDesignIntakeReadiness.readinessGaps).toEqual([
      "reviewer_decision_pending",
      "expected_direction_review_required",
      "lag_context_review_required",
      "baseline_source_review_required",
      "comparison_condition_review_required",
      "measurement_cell_grain_review_required",
      "suppression_missing_held_precheck_required",
      "source_package_draft_review_required"
    ]);
    expect(spine.comparisonDesignSourcePackageDraft).toMatchObject({
      draftAssemblyState:
        "COMPARISON_DESIGN_SOURCE_PACKAGE_DRAFT_ASSEMBLED_REVIEW_REQUIRED",
      draftStatus: "DRAFT_ASSEMBLY_ONLY_NOT_EVIDENCE",
      templateRef:
        "docs/contracts/ai-value-contribution-alignment-governed-diagnostics-evidence-collection-packet/COMPARISON_DESIGN_SOURCE_PACKAGE_INTAKE_TEMPLATE.md",
      sourceBlueprintHypothesisRef:
        "blueprint_hypothesis.customer_support.case_resolution.2026_06",
      candidateMetricRecommendationRef:
        "candidate_metric_recommendation.support_resolution_hours",
      draftSelectedMetricCandidate: "Median resolution time",
      metricOwnerReviewerRole: "Metric owner / reviewer role supplied",
      reviewerDecisionPlaceholder: "HOLD_FOR_REVIEWER_DECISION",
      expectedMovementDirection: "directional_review_required",
      expectedLagContext: "HOLD_FOR_REVIEWER_EXPECTATION_PATH",
      baselineSourcePosture: "HOLD_FOR_BASELINE_SOURCE_REVIEW",
      comparisonCondition: "HOLD_FOR_COMPARISON_CONDITION_REVIEW",
      cohortIdentity: "Customer or Account Success",
      workflowFunctionIdentity: "Customer Support case resolution",
      aggregateMeasurementCellGrain: "DRAFT_GRAIN_PENDING_REVIEW",
      suppressionMissingHeldPrecheckPosture:
        "HOLD_FOR_SUPPRESSION_MISSING_HELD_PRECHECK",
      sourcePackageDraftCreated: true,
      sourcePackageCreated: false,
      reviewerOwnedEvidenceCollected: false,
      createsGovernedApproval: false,
      createsDiagnosticsEvidence: false,
      comparisonDesignAdequacySatisfied: false,
      feedsBayesianPromotion: false,
      promotionAuthorized: false,
      allowedNextAction: "complete_comparison_design_source_package_draft_review"
    });
    expect(
      spine.comparisonDesignSourcePackageDraft.requiredMilestoneLabels
    ).toEqual(["T0", "T30", "T60", "T90", "T120", "T180", "T270", "T365"]);
    expect(spine.comparisonDesignSourcePackageDraft.forbiddenSourceInputs).toEqual([
      "template_prose",
      "generated_examples",
      "fixture_defaults",
      "runtime_hashes_alone",
      "posterior_like_values",
      "raw_rows",
      "identifiers",
      "query_text",
      "prompts",
      "transcripts",
      "person_level_data",
      "live_connector_output"
    ]);
    expect(spine.reviewerOwnedSourcePackageCollection).toMatchObject({
      collectionState:
        "REVIEWER_OWNED_SOURCE_PACKAGE_COLLECTION_HELD_FOR_SOURCE_PACKAGE_DRAFT_REVIEW",
      reviewerOwnedSourcePackageSupplied: false,
      sourcePackageReviewReady: false,
      sourcePackageHashAuthorized: false,
      reviewedSourceEvidenceHashAuthorized: false,
      sourceEvidenceHashAuthorized: false,
      reviewedEvidenceManifestHashAuthorized: false,
      evidenceSatisfied: false,
      comparisonDesignAdequacySatisfied: false,
      diagnosticsEvidenceSatisfied: false,
      feedsGovernedDiagnosticsSufficiencySource: false,
      feedsBayesianPromotion: false,
      promotionAuthorized: false,
      allowedNextAction: "complete_comparison_design_source_package_draft_review"
    });
    expect(spine.reviewerOwnedSourcePackageCollection.requiredReviewerAttestations).toEqual([
      "reviewer_approved_metric_selection",
      "approved_expectation_path_direction_lag",
      "milestone_window_alignment",
      "baseline_source_review",
      "comparison_condition_review",
      "cohort_identity_review",
      "workflow_function_identity_review",
      "aggregate_measurement_cell_grain_review",
      "suppression_missing_held_window_review",
      "cross_slice_aggregation_prohibition_review",
      "person_level_identifier_exclusion_review",
      "causality_claim_exclusion_review",
      "data_science_and_governance_reviewer_decision"
    ]);
    expect(
      spine.reviewerMetricSelectionDraftIntake.milestoneSchedule.requiredMilestones.map(
        (milestone) => milestone.label
      )
    ).toEqual(["T0", "T30", "T60", "T90", "T120", "T180", "T270", "T365"]);
    expect(
      spine.reviewerMetricSelectionDraftIntake.milestoneSchedule.createsMeasurementCellEvidence
    ).toBe(false);
    expect(spine.selectedMetricApproved).toBe(false);
    expect(spine.evidenceGapList).toContain("missing_reviewer_metric_approval");
  });

  it("scrubs unsafe browser-local selected metric labels", () => {
    const spine = buildAiContributionReportingSpineViewModel({
      blueprintHypothesisRef: "blueprint_hypothesis.customer_support.case_resolution.2026_06",
      workflowFunctionScope: unsafeTestTerm("workflow", "_", "state raw prompt"),
      valueRouteLabel: "Capacity creation",
      metricLibraryRef: "metrics_library.customer_support.aggregate_outcomes",
      questionMetricBridge: bridge,
      selectedOutcomeMetricSelection: {
        functionArea: unsafeTestTerm("employee", "_", "id cohort"),
        metrics: [
          {
            id: "local_metric",
            name: unsafeTestTerm("alex", "@", "example", ".", "com select * from table"),
            valueRoute: "Capacity creation",
            sourceSystem: "Support case management system",
            measurementUnit: "hours",
            owner: "Customer data owner"
          }
        ]
      }
    });

    expect(spine.selectedMetricApprovalState).toBe("HOLD_FOR_REVIEWER_APPROVAL");
    expect(spine.selectedMetricPosture.metricLabel).toBe(
      "No reviewer-approved selected metric"
    );
    expect(spine.reviewerMetricSelectionDraftIntake.draftIntakeState).toBe(
      "DRAFT_INTAKE_HELD_FOR_CANDIDATE_RECOMMENDATION"
    );
    expect(spine.reviewerMetricSelectionDraftIntake.draftSelectedMetricCandidate).toBeNull();
    expect(spine.reviewerMetricSelectionDraftIntake.metricOwnerReviewerRole).toBeNull();
    expect(spine.comparisonDesignIntakeReadiness.readinessState).toBe(
      "COMPARISON_DESIGN_INTAKE_HELD_FOR_CANDIDATE_RECOMMENDATION"
    );
    expect(spine.comparisonDesignIntakeReadiness.missingFields).toEqual([
      "missing_candidate_metric_recommendation_ref",
      "missing_draft_selected_metric_candidate",
      "missing_metric_owner_reviewer_role"
    ]);
    expect(spine.comparisonDesignIntakeReadiness.createsDiagnosticsEvidence).toBe(false);
    expect(spine.comparisonDesignIntakeReadiness.feedsBayesianPromotion).toBe(false);
    expect(spine.reviewerMetricSelectionDraftIntake.cohortIdentity).toBe(
      "Aggregate cohort pending reviewer intake"
    );
    expect(spine.reviewerMetricSelectionDraftIntake.workflowFunctionIdentity).toBe(
      "Workflow/function pending"
    );
  });

  it("does not echo arbitrary owner text as reviewer role in draft posture", () => {
    const spine = buildAiContributionReportingSpineViewModel({
      blueprintHypothesisRef: "blueprint_hypothesis.customer_support.case_resolution.2026_06",
      workflowFunctionScope: "Customer Support case resolution",
      valueRouteLabel: "Capacity creation",
      metricLibraryRef: "metrics_library.customer_support.aggregate_outcomes",
      questionMetricBridge: bridge,
      selectedOutcomeMetricSelection: {
        functionArea: "Customer or Account Success",
        metrics: [
          {
            id: "support_resolution_hours",
            name: "Median resolution time",
            valueRoute: "Capacity creation",
            sourceSystem: "Support case management system",
            measurementUnit: "hours",
            owner: "Alex Kelley"
          }
        ]
      }
    });

    expect(spine.reviewerMetricSelectionDraftIntake.metricOwnerReviewerRole).toBe(
      "Metric owner / reviewer role supplied"
    );
    expect(spine.comparisonDesignIntakeReadiness.reviewerRole).toBe(
      "Metric owner / reviewer role supplied"
    );
    expect(spine.comparisonDesignSourcePackageDraft.metricOwnerReviewerRole).toBe(
      "Metric owner / reviewer role supplied"
    );
    expect(JSON.stringify(spine)).not.toMatch(/Alex Kelley/i);
  });

  it("keeps candidate-mismatched source package draft held for candidate recommendation", () => {
    const spine = buildAiContributionReportingSpineViewModel({
      blueprintHypothesisRef: "blueprint_hypothesis.customer_support.case_resolution.2026_06",
      workflowFunctionScope: "Customer Support case resolution",
      valueRouteLabel: "Capacity creation",
      metricLibraryRef: "metrics_library.customer_support.aggregate_outcomes",
      questionMetricBridge: bridge,
      selectedOutcomeMetricSelection: {
        functionArea: "Customer or Account Success",
        metrics: [
          {
            id: "unmatched_metric",
            name: "Unmatched aggregate metric",
            valueRoute: "Capacity creation",
            sourceSystem: "Support case management system",
            measurementUnit: "hours",
            owner: "Customer data owner"
          }
        ]
      }
    });

    expect(spine.comparisonDesignIntakeReadiness).toMatchObject({
      readinessState: "COMPARISON_DESIGN_INTAKE_HELD_FOR_CANDIDATE_RECOMMENDATION",
      comparisonDesignSourcePackageDraftState:
        "SOURCE_PACKAGE_DRAFT_HELD_FOR_CANDIDATE_RECOMMENDATION",
      allowedNextAction: "supply_candidate_metric_recommendation"
    });
    expect(spine.comparisonDesignSourcePackageDraft).toMatchObject({
      draftAssemblyState:
        "COMPARISON_DESIGN_SOURCE_PACKAGE_DRAFT_HELD_FOR_CANDIDATE_RECOMMENDATION",
      sourcePackageDraftCreated: false,
      allowedNextAction: "supply_candidate_metric_recommendation"
    });
    expect(spine.reviewerOwnedSourcePackageCollection).toMatchObject({
      collectionState:
        "REVIEWER_OWNED_SOURCE_PACKAGE_COLLECTION_HELD_FOR_SOURCE_PACKAGE_DRAFT",
      allowedNextAction: "supply_candidate_metric_recommendation"
    });
  });

  it("keeps comparison-design readiness held when a matched draft lacks reviewer role", () => {
    const spine = buildAiContributionReportingSpineViewModel({
      blueprintHypothesisRef: "blueprint_hypothesis.customer_support.case_resolution.2026_06",
      workflowFunctionScope: "Customer Support case resolution",
      valueRouteLabel: "Capacity creation",
      metricLibraryRef: "metrics_library.customer_support.aggregate_outcomes",
      questionMetricBridge: bridge,
      selectedOutcomeMetricSelection: {
        functionArea: "Customer or Account Success",
        quadrantLabel: "Deep but slow",
        vbdBaseline: "Velocity 42 · Breadth 55 · Depth 66",
        metrics: [
          {
            id: "support_resolution_hours",
            name: "Median resolution time",
            valueRoute: "Capacity creation",
            sourceSystem: "Support case management system",
            measurementUnit: "hours"
          }
        ]
      }
    });

    expect(spine.reviewerMetricSelectionDraftIntake.draftIntakeState).toBe(
      "DRAFT_INTAKE_PREPARED_REVIEW_REQUIRED"
    );
    expect(spine.reviewerMetricSelectionDraftIntake.metricOwnerReviewerRole).toBeNull();
    expect(spine.comparisonDesignIntakeReadiness).toMatchObject({
      readinessState: "COMPARISON_DESIGN_INTAKE_HELD_FOR_REQUIRED_INTAKE_FIELDS",
      comparisonDesignSourcePackageDraftState:
        "SOURCE_PACKAGE_DRAFT_HELD_FOR_REQUIRED_INTAKE_FIELDS",
      allowedNextAction: "complete_required_comparison_design_intake_fields",
      reviewerRole: null,
      createsGovernedApproval: false,
      createsDiagnosticsEvidence: false,
      comparisonDesignAdequacySatisfied: false,
      diagnosticsEvidenceSatisfied: false,
      feedsBayesianPromotion: false,
      promotionAuthorized: false
    });
    expect(spine.comparisonDesignIntakeReadiness.missingFields).toEqual([
      "missing_metric_owner_reviewer_role"
    ]);
    expect(spine.comparisonDesignIntakeReadiness.readinessGaps).toEqual([
      "missing_metric_owner_reviewer_role"
    ]);
    expect(spine.comparisonDesignSourcePackageDraft).toMatchObject({
      draftAssemblyState:
        "COMPARISON_DESIGN_SOURCE_PACKAGE_DRAFT_HELD_FOR_REQUIRED_INTAKE_FIELDS",
      sourcePackageDraftCreated: false,
      sourcePackageCreated: false,
      reviewerOwnedEvidenceCollected: false,
      allowedNextAction: "complete_required_comparison_design_intake_fields"
    });
    expect(spine.reviewerOwnedSourcePackageCollection).toMatchObject({
      collectionState:
        "REVIEWER_OWNED_SOURCE_PACKAGE_COLLECTION_HELD_FOR_SOURCE_PACKAGE_DRAFT",
      sourcePackageReviewReady: false,
      evidenceSatisfied: false,
      comparisonDesignAdequacySatisfied: false,
      promotionAuthorized: false
    });
  });

  it("holds source package review when no reviewer-owned package is supplied", () => {
    const spine = buildAiContributionReportingSpineViewModel({
      blueprintHypothesisRef: "blueprint_hypothesis.customer_support.case_resolution.2026_06",
      workflowFunctionScope: "Customer Support case resolution",
      valueRouteLabel: "Capacity creation",
      metricLibraryRef: "metrics_library.customer_support.aggregate_outcomes",
      questionMetricBridge: bridge,
      selectedOutcomeMetricSelection: {
        functionArea: "Customer or Account Success",
        metrics: [
          {
            id: "support_resolution_hours",
            name: "Median resolution time",
            valueRoute: "Capacity creation",
            sourceSystem: "Support case management system",
            measurementUnit: "hours",
            owner: "Customer data owner"
          }
        ]
      }
    });

    expect(spine.comparisonDesignSourcePackageReview).toMatchObject({
      reviewState:
        "COMPARISON_DESIGN_SOURCE_PACKAGE_REVIEW_HELD_FOR_REVIEWER_OWNED_SOURCE_PACKAGE",
      reviewerOwnedSourcePackageSupplied: false,
      packageCompletenessState: "SOURCE_PACKAGE_MISSING",
      admissibilityState: "NOT_ADMISSIBLE_REVIEWER_PACKAGE_MISSING",
      allowedNextAction: "collect_reviewer_owned_comparison_design_source_package",
      sourcePackageReviewReady: false,
      evidenceSatisfied: false,
      comparisonDesignAdequacySatisfied: false,
      diagnosticsEvidenceSatisfied: false,
      feedsGovernedDiagnosticsSufficiencySource: false,
      feedsBayesianPromotion: false,
      promotionAuthorized: false
    });
    expect(spine.comparisonDesignSourcePackageReview.missingFields).toEqual([
      "missing_source_blueprint_hypothesis_ref",
      "missing_reviewer_owned_source_package_ref",
      "missing_candidate_metric_recommendation_ref",
      "missing_reviewer_selected_metric_candidate",
      "missing_reviewer_role",
      "missing_reviewer_decision_posture",
      "missing_expected_movement_direction",
      "missing_lag_context",
      "missing_milestone_schedule",
      "missing_baseline_source_posture",
      "missing_comparison_condition",
      "missing_cohort_identity",
      "missing_workflow_function_identity",
      "missing_aggregate_measurement_cell_grain",
      "missing_suppression_missing_held_precheck_posture",
      "missing_forbidden_use_attestation_posture",
      "missing_privacy_identifier_exclusion_posture",
      "missing_no_causality_claim_attestation_posture"
    ]);
  });

  it("holds incomplete reviewer-owned source packages with exact missing fields", () => {
    const spine = buildAiContributionReportingSpineViewModel({
      blueprintHypothesisRef: "blueprint_hypothesis.customer_support.case_resolution.2026_06",
      workflowFunctionScope: "Customer Support case resolution",
      valueRouteLabel: "Capacity creation",
      metricLibraryRef: "metrics_library.customer_support.aggregate_outcomes",
      questionMetricBridge: bridge,
      selectedOutcomeMetricSelection: {
        functionArea: "Customer or Account Success",
        metrics: [
          {
            id: "support_resolution_hours",
            name: "Median resolution time",
            valueRoute: "Capacity creation",
            sourceSystem: "Support case management system",
            measurementUnit: "hours",
            owner: "Customer data owner"
          }
        ]
      },
      reviewerOwnedComparisonDesignSourcePackage: {
        ...completeReviewerOwnedComparisonDesignSourcePackage,
        milestoneScheduleRef: "",
        privacyIdentifierExclusionPosture: "",
        noCausalityClaimAttestationPosture: ""
      }
    });

    expect(spine.comparisonDesignSourcePackageReview).toMatchObject({
      reviewState:
        "COMPARISON_DESIGN_SOURCE_PACKAGE_REVIEW_HELD_FOR_INCOMPLETE_SOURCE_PACKAGE",
      reviewerOwnedSourcePackageSupplied: true,
      packageCompletenessState: "SOURCE_PACKAGE_INCOMPLETE",
      admissibilityState: "NOT_ADMISSIBLE_REVIEW_GAPS_REMAIN",
      allowedNextAction: "complete_reviewer_owned_source_package_fields",
      sourcePackageReviewReady: false,
      evidenceSatisfied: false,
      comparisonDesignAdequacySatisfied: false,
      promotionAuthorized: false
    });
    expect(spine.comparisonDesignSourcePackageReview.missingFields).toEqual([
      "missing_milestone_schedule",
      "missing_privacy_identifier_exclusion_posture",
      "missing_no_causality_claim_attestation_posture"
    ]);
  });

  it("treats complete reviewer-owned packages as ready for later adequacy review only", () => {
    const spine = buildAiContributionReportingSpineViewModel({
      blueprintHypothesisRef: "blueprint_hypothesis.customer_support.case_resolution.2026_06",
      workflowFunctionScope: "Customer Support case resolution",
      valueRouteLabel: "Capacity creation",
      metricLibraryRef: "metrics_library.customer_support.aggregate_outcomes",
      questionMetricBridge: bridge,
      selectedOutcomeMetricSelection: {
        functionArea: "Customer or Account Success",
        metrics: [
          {
            id: "support_resolution_hours",
            name: "Median resolution time",
            valueRoute: "Capacity creation",
            sourceSystem: "Support case management system",
            measurementUnit: "hours",
            owner: "Customer data owner"
          }
        ]
      },
      reviewerOwnedComparisonDesignSourcePackage:
        completeReviewerOwnedComparisonDesignSourcePackage
    });

    expect(spine.comparisonDesignSourcePackageReview).toMatchObject({
      reviewState: "READY_FOR_COMPARISON_DESIGN_ADEQUACY_REVIEW_ONLY",
      sourceBlueprintHypothesisRef:
        "blueprint_hypothesis.customer_support.case_resolution.2026_06",
      reviewerOwnedSourcePackageRef:
        "comparison_design_source_package.customer_support.case_resolution.2026_06",
      candidateMetricRecommendationRef:
        "candidate_metric_recommendation.support_resolution_hours",
      reviewerSelectedMetricCandidate: "Median resolution time",
      reviewerRole: "Reviewer role supplied",
      reviewerDecisionPosture: "APPROVED_FOR_COMPARISON_DESIGN_ADEQUACY_REVIEW",
      expectedMovementDirection: "Reviewer-approved direction supplied",
      lagContext: "Reviewer-approved lag context supplied",
      baselineSourcePosture: "Reviewer-owned baseline source posture supplied",
      comparisonCondition: "Reviewer-owned comparison condition supplied",
      cohortIdentity: "Reviewer-owned aggregate cohort supplied",
      workflowFunctionIdentity: "Reviewer-owned workflow/function supplied",
      aggregateMeasurementCellGrain:
        "Reviewer-owned aggregate Measurement Cell grain supplied",
      suppressionMissingHeldPrecheckPosture: "CLEAR",
      forbiddenUseAttestationPosture: "ATTESTED_CLEAR",
      privacyIdentifierExclusionPosture: "ATTESTED_CLEAR",
      noCausalityClaimAttestationPosture: "ATTESTED_CLEAR",
      packageCompletenessState: "COMPLETE_FOR_REVIEW_ONLY_NOT_EVIDENCE",
      admissibilityState: "ADMISSIBLE_FOR_LATER_ADEQUACY_REVIEW_ONLY",
      sourcePackageReviewReady: true,
      reviewerOwnedSourcePackageSupplied: true,
      evidenceSatisfied: false,
      comparisonDesignAdequacySatisfied: false,
      diagnosticsEvidenceSatisfied: false,
      feedsGovernedDiagnosticsSufficiencySource: false,
      feedsBayesianPromotion: false,
      promotionAuthorized: false,
      allowedNextAction: "run_comparison_design_adequacy_evidence_review"
    });
    expect(
      spine.comparisonDesignSourcePackageReview.milestoneSchedule.requiredMilestones.map(
        (milestone) => milestone.label
      )
    ).toEqual(["T0", "T30", "T60", "T90", "T120", "T180", "T270", "T365"]);
    expect(spine.comparisonDesignSourcePackageReview.missingFields).toEqual([]);
    expect(spine.comparisonDesignSourcePackageReview.reviewGaps).toEqual([]);
    expect(spine.reviewerOwnedSourcePackageCollection).toMatchObject({
      collectionState:
        "REVIEWER_OWNED_SOURCE_PACKAGE_COLLECTION_RECEIVED_FOR_REVIEW_ONLY",
      reviewerOwnedSourcePackageSupplied: true,
      sourcePackageReviewReady: true,
      evidenceSatisfied: false,
      comparisonDesignAdequacySatisfied: false,
      feedsBayesianPromotion: false,
      promotionAuthorized: false
    });
    expect(JSON.stringify(spine.comparisonDesignSourcePackageReview)).not.toMatch(
      /source_evidence_hash|reviewed_source_evidence_hash|reviewed_evidence_manifest_hash/i
    );
  });

  it("holds complete-looking packages whose source refs or reviewer decision do not match review requirements", () => {
    const spine = buildAiContributionReportingSpineViewModel({
      blueprintHypothesisRef: "blueprint_hypothesis.customer_support.case_resolution.2026_06",
      workflowFunctionScope: "Customer Support case resolution",
      valueRouteLabel: "Capacity creation",
      metricLibraryRef: "metrics_library.customer_support.aggregate_outcomes",
      questionMetricBridge: bridge,
      selectedOutcomeMetricSelection: {
        functionArea: "Customer or Account Success",
        metrics: [
          {
            id: "support_resolution_hours",
            name: "Median resolution time",
            valueRoute: "Capacity creation",
            sourceSystem: "Support case management system",
            measurementUnit: "hours",
            owner: "Customer data owner"
          }
        ]
      },
      reviewerOwnedComparisonDesignSourcePackage: {
        ...completeReviewerOwnedComparisonDesignSourcePackage,
        sourceBlueprintHypothesisRef:
          "blueprint_hypothesis.customer_success.onboarding.2026_06",
        candidateMetricRecommendationRef:
          "candidate_metric_recommendation.customer_onboarding_days",
        reviewerDecisionPosture: "HOLD_FOR_REVIEW"
      }
    });

    expect(spine.comparisonDesignSourcePackageReview).toMatchObject({
      reviewState:
        "COMPARISON_DESIGN_SOURCE_PACKAGE_REVIEW_HELD_FOR_INCOMPLETE_SOURCE_PACKAGE",
      packageCompletenessState: "SOURCE_PACKAGE_INCOMPLETE",
      admissibilityState: "NOT_ADMISSIBLE_REVIEW_GAPS_REMAIN",
      sourcePackageReviewReady: false,
      evidenceSatisfied: false,
      comparisonDesignAdequacySatisfied: false,
      promotionAuthorized: false,
      allowedNextAction: "complete_reviewer_owned_source_package_fields"
    });
    expect(spine.comparisonDesignSourcePackageReview.missingFields).toEqual([]);
    expect(spine.comparisonDesignSourcePackageReview.reviewGaps).toEqual([
      "source_blueprint_hypothesis_ref_mismatch",
      "candidate_metric_recommendation_ref_mismatch",
      "reviewer_decision_not_approved_for_adequacy_review"
    ]);
    expect(spine.comparisonDesignSourcePackageReview.reviewerDecisionPosture).toBeNull();
    expect(spine.comparisonDesignSourcePackageReview.expectedMovementDirection).toBeNull();
  });

  it("holds complete-looking packages that omit extended milestone windows", () => {
    const spine = buildAiContributionReportingSpineViewModel({
      blueprintHypothesisRef: "blueprint_hypothesis.customer_support.case_resolution.2026_06",
      workflowFunctionScope: "Customer Support case resolution",
      valueRouteLabel: "Capacity creation",
      metricLibraryRef: "metrics_library.customer_support.aggregate_outcomes",
      questionMetricBridge: bridge,
      selectedOutcomeMetricSelection: {
        functionArea: "Customer or Account Success",
        metrics: [
          {
            id: "support_resolution_hours",
            name: "Median resolution time",
            valueRoute: "Capacity creation",
            sourceSystem: "Support case management system",
            measurementUnit: "hours",
            owner: "Customer data owner"
          }
        ]
      },
      reviewerOwnedComparisonDesignSourcePackage: {
        ...completeReviewerOwnedComparisonDesignSourcePackage,
        milestoneWindowRefs: {
          T0: "milestone_window.customer_support.case_resolution.T0.2026_06",
          T30: "milestone_window.customer_support.case_resolution.T30.2026_06",
          T60: "milestone_window.customer_support.case_resolution.T60.2026_06",
          T90: "milestone_window.customer_support.case_resolution.T90.2026_06",
          T120: "milestone_window.customer_support.case_resolution.T120.2026_06"
        }
      }
    });

    expect(spine.comparisonDesignSourcePackageReview).toMatchObject({
      reviewState:
        "COMPARISON_DESIGN_SOURCE_PACKAGE_REVIEW_HELD_FOR_INCOMPLETE_SOURCE_PACKAGE",
      packageCompletenessState: "SOURCE_PACKAGE_INCOMPLETE",
      admissibilityState: "NOT_ADMISSIBLE_REVIEW_GAPS_REMAIN",
      sourcePackageReviewReady: false,
      comparisonDesignAdequacySatisfied: false,
      promotionAuthorized: false
    });
    expect(spine.comparisonDesignSourcePackageReview.reviewGaps).toEqual([
      "missing_milestone_window_T180",
      "missing_milestone_window_T270",
      "missing_milestone_window_T365"
    ]);
  });

  it("rejects trusted-looking packages that reference fixture, template, runtime, local, or generated provenance", () => {
    for (const reviewerOwnedSourcePackageRef of [
      "comparison_design_source_package.fixture.customer_support.2026_06",
      "comparison_design_source_package.template.customer_support.2026_06",
      "comparison_design_source_package.runtime_output.customer_support.2026_06",
      "comparison_design_source_package.local_ui_draft.customer_support.2026_06",
      "comparison_design_source_package.generated_default.customer_support.2026_06"
    ]) {
      const spine = buildAiContributionReportingSpineViewModel({
        blueprintHypothesisRef:
          "blueprint_hypothesis.customer_support.case_resolution.2026_06",
        workflowFunctionScope: "Customer Support case resolution",
        valueRouteLabel: "Capacity creation",
        metricLibraryRef: "metrics_library.customer_support.aggregate_outcomes",
        questionMetricBridge: bridge,
        selectedOutcomeMetricSelection: {
          functionArea: "Customer or Account Success",
          metrics: [
            {
              id: "support_resolution_hours",
              name: "Median resolution time",
              valueRoute: "Capacity creation",
              sourceSystem: "Support case management system",
              measurementUnit: "hours",
              owner: "Customer data owner"
            }
          ]
        },
        reviewerOwnedComparisonDesignSourcePackage: {
          ...completeReviewerOwnedComparisonDesignSourcePackage,
          reviewerOwnedSourcePackageRef
        }
      });

      expect(spine.comparisonDesignSourcePackageReview).toMatchObject({
        reviewState:
          "COMPARISON_DESIGN_SOURCE_PACKAGE_REVIEW_REJECTED_FOR_BOUNDARY_LEAKAGE",
        packageCompletenessState: "SOURCE_PACKAGE_BOUNDARY_REVIEW_FAILED",
        admissibilityState: "NOT_ADMISSIBLE_BOUNDARY_LEAKAGE",
        sourcePackageReviewReady: false,
        evidenceSatisfied: false,
        comparisonDesignAdequacySatisfied: false,
        promotionAuthorized: false,
        allowedNextAction: "repair_reviewer_owned_source_package_boundaries"
      });
      expect(spine.comparisonDesignSourcePackageReview.reviewGaps).toEqual([
        "forbidden_source_package_provenance"
      ]);
    }
  });

  it("rejects unsafe or local milestone window refs inside trusted-looking packages", () => {
    for (const milestoneWindowRefs of [
      {
        ...completeReviewerOwnedComparisonDesignSourcePackage.milestoneWindowRefs,
        T180: "milestone-window.local-ui-draft.customer_support.T180.2026_06"
      },
      {
        ...completeReviewerOwnedComparisonDesignSourcePackage.milestoneWindowRefs,
        T270: "milestone window local draft customer support T270"
      },
      {
        ...completeReviewerOwnedComparisonDesignSourcePackage.milestoneWindowRefs,
        T365: unsafeTestTerm("select", " user_email from table")
      }
    ]) {
      const spine = buildAiContributionReportingSpineViewModel({
        blueprintHypothesisRef:
          "blueprint_hypothesis.customer_support.case_resolution.2026_06",
        workflowFunctionScope: "Customer Support case resolution",
        valueRouteLabel: "Capacity creation",
        metricLibraryRef: "metrics_library.customer_support.aggregate_outcomes",
        questionMetricBridge: bridge,
        selectedOutcomeMetricSelection: {
          functionArea: "Customer or Account Success",
          metrics: [
            {
              id: "support_resolution_hours",
              name: "Median resolution time",
              valueRoute: "Capacity creation",
              sourceSystem: "Support case management system",
              measurementUnit: "hours",
              owner: "Customer data owner"
            }
          ]
        },
        reviewerOwnedComparisonDesignSourcePackage: {
          ...completeReviewerOwnedComparisonDesignSourcePackage,
          milestoneWindowRefs
        }
      });

      expect(spine.comparisonDesignSourcePackageReview).toMatchObject({
        reviewState:
          "COMPARISON_DESIGN_SOURCE_PACKAGE_REVIEW_REJECTED_FOR_BOUNDARY_LEAKAGE",
        packageCompletenessState: "SOURCE_PACKAGE_BOUNDARY_REVIEW_FAILED",
        admissibilityState: "NOT_ADMISSIBLE_BOUNDARY_LEAKAGE",
        sourcePackageReviewReady: false,
        evidenceSatisfied: false,
        comparisonDesignAdequacySatisfied: false,
        promotionAuthorized: false
      });
      expect(spine.comparisonDesignSourcePackageReview.reviewGaps).toEqual([
        "unsafe_milestone_window_refs"
      ]);
    }
  });

  it("rejects template, fixture, runtime, local draft, and generated package modes", () => {
    for (const sourcePackageMode of [
      "template",
      "example",
      "fixture",
      "runtime_output",
      "local_ui_draft",
      "generated_default"
    ]) {
      const spine = buildAiContributionReportingSpineViewModel({
        blueprintHypothesisRef:
          "blueprint_hypothesis.customer_support.case_resolution.2026_06",
        workflowFunctionScope: "Customer Support case resolution",
        valueRouteLabel: "Capacity creation",
        metricLibraryRef: "metrics_library.customer_support.aggregate_outcomes",
        questionMetricBridge: bridge,
        selectedOutcomeMetricSelection: {
          functionArea: "Customer or Account Success",
          metrics: [
            {
              id: "support_resolution_hours",
              name: "Median resolution time",
              valueRoute: "Capacity creation",
              sourceSystem: "Support case management system",
              measurementUnit: "hours",
              owner: "Customer data owner"
            }
          ]
        },
        reviewerOwnedComparisonDesignSourcePackage: {
          ...completeReviewerOwnedComparisonDesignSourcePackage,
          sourcePackageMode
        }
      });

      expect(spine.comparisonDesignSourcePackageReview).toMatchObject({
        reviewState:
          "COMPARISON_DESIGN_SOURCE_PACKAGE_REVIEW_HELD_FOR_NON_REVIEWER_OWNED_SOURCE",
        packageCompletenessState: "SOURCE_PACKAGE_MODE_NOT_REVIEWER_OWNED",
        admissibilityState: "NOT_ADMISSIBLE_NON_REVIEWER_OWNED_SOURCE",
        sourcePackageReviewReady: false,
        evidenceSatisfied: false,
        comparisonDesignAdequacySatisfied: false,
        promotionAuthorized: false,
        allowedNextAction: "collect_reviewer_owned_comparison_design_source_package"
      });
      expect(spine.comparisonDesignSourcePackageReview.reviewGaps).toContain(
        `source_package_mode_not_reviewer_owned:${sourcePackageMode}`
      );
    }
  });

  it("holds boundary-leaking source packages without echoing unsafe field values", () => {
    const spine = buildAiContributionReportingSpineViewModel({
      blueprintHypothesisRef: "blueprint_hypothesis.customer_support.case_resolution.2026_06",
      workflowFunctionScope: "Customer Support case resolution",
      valueRouteLabel: "Capacity creation",
      metricLibraryRef: "metrics_library.customer_support.aggregate_outcomes",
      questionMetricBridge: bridge,
      selectedOutcomeMetricSelection: {
        functionArea: "Customer or Account Success",
        metrics: [
          {
            id: "support_resolution_hours",
            name: "Median resolution time",
            valueRoute: "Capacity creation",
            sourceSystem: "Support case management system",
            measurementUnit: "hours",
            owner: "Customer data owner"
          }
        ]
      },
      reviewerOwnedComparisonDesignSourcePackage: {
        ...completeReviewerOwnedComparisonDesignSourcePackage,
        reviewerRole: unsafeTestTerm("alex", "@", "example", ".", "com"),
        reviewerDecisionPosture: unsafeTestTerm("approved ", "R", "OI proof"),
        expectedMovementDirection: unsafeTestTerm("increase with confi", "dence"),
        baselineSourcePosture: unsafeTestTerm("select * from table"),
        privacyIdentifierExclusionPosture: "ATTESTED_CLEAR"
      }
    });

    expect(spine.comparisonDesignSourcePackageReview).toMatchObject({
      reviewState:
        "COMPARISON_DESIGN_SOURCE_PACKAGE_REVIEW_REJECTED_FOR_BOUNDARY_LEAKAGE",
      packageCompletenessState: "SOURCE_PACKAGE_BOUNDARY_REVIEW_FAILED",
      admissibilityState: "NOT_ADMISSIBLE_BOUNDARY_LEAKAGE",
      allowedNextAction: "repair_reviewer_owned_source_package_boundaries",
      sourcePackageReviewReady: false,
      evidenceSatisfied: false,
      comparisonDesignAdequacySatisfied: false,
      promotionAuthorized: false
    });
    expect(spine.comparisonDesignSourcePackageReview.reviewGaps).toEqual([
      "unsafe_reviewer_role",
      "unsafe_reviewer_decision_posture",
      "unsafe_expected_movement_direction",
      "unsafe_baseline_source_posture"
    ]);
    const reviewPayload = JSON.stringify(spine.comparisonDesignSourcePackageReview);
    for (const term of [
      unsafeTestTerm("alex", "@", "example", ".", "com"),
      unsafeTestTerm("R", "OI"),
      unsafeTestTerm("confi", "dence"),
      unsafeTestTerm("select * from table")
    ]) {
      expect(reviewPayload).not.toMatch(new RegExp(escapedTestPatternText(term), "i"));
    }
  });

  it("uses the reporting-spine milestone schedule and keeps model posture held", () => {
    const spine = buildAiContributionReportingSpineViewModel({
      blueprintHypothesisRef: "blueprint_hypothesis.customer_support.case_resolution.2026_06",
      workflowFunctionScope: "Customer Support case resolution",
      valueRouteLabel: "Capacity creation",
      metricLibraryRef: "metrics_library.customer_support.aggregate_outcomes",
      questionMetricBridge: bridge
    });

    expect(REQUIRED_CONTRIBUTION_REPORTING_MILESTONES.map((milestone) => milestone.key)).toEqual([
      "T0_baseline",
      "T30",
      "T60",
      "T90",
      "T120",
      "T180_6_month",
      "T270_9_month",
      "T365_12_month"
    ]);
    expect(spine.modelReviewInputPosture).toBe("MODEL_REVIEW_INPUT_HELD_FOR_EVIDENCE_GAPS");
    expect(spine.modelEligibilityStatus).toBe("HELD_FOR_EVIDENCE_GAPS");
    expect(spine.bayesianChainState.currentState).toBe(
      "HOLD_FOR_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE"
    );
    expect(spine.bayesianChainState.changedByThisSpine).toBe(false);
  });

  it("scrubs unsafe recommendation display text before it reaches UI surfaces", () => {
    const spine = buildAiContributionReportingSpineViewModel({
      blueprintHypothesisRef: "blueprint_hypothesis.customer_support.case_resolution.2026_06",
      workflowFunctionScope: "Customer Support case resolution",
      valueRouteLabel: "Capacity creation",
      metricLibraryRef: unsafeTestTerm("source", "_", "ref", ".customer_metrics"),
      questionMetricBridge: {
        available: true,
        items: [
          {
            id: unsafeTestTerm("metric", "_", "id", ".", "raw", "_", "prompt"),
            metricName: unsafeTestTerm(
              "raw",
              " ",
              "prompt",
              " ",
              "produc",
              "tivity",
              " ",
              "score with ",
              "R",
              "OI ",
              "confi",
              "dence"
            ),
            valueRouteLabel: "Capacity creation",
            sourceSystem: unsafeTestTerm("select", " owner_email from table"),
            measurementUnit: "hours",
            owner: "Customer data owner",
            successMeasure: unsafeTestTerm(
              "employ",
              "ee",
              "_",
              "id",
              " ",
              "produc",
              "tivity",
              " score"
            )
          }
        ]
      }
    });

    expect(spine.candidateMetricRecommendations).toHaveLength(1);
    expect(spine.candidateMetricRecommendations[0]).toMatchObject({
      candidateMetricId: "candidate_aggregate_metric",
      metricLabel: "Candidate aggregate metric held for safe display review",
      sourceMetricLibraryRef: "Existing aggregate metric library",
      expectedSourceSystemPosture: "Customer-owned aggregate outcome source",
      rationale: "Candidate aggregate metric from the existing outcome metric bridge."
    });
    const recommendationPayload = JSON.stringify(spine.candidateMetricRecommendations);
    for (const term of [
      unsafeTestTerm("raw", " prompt"),
      unsafeTestTerm("raw", "_", "prompt"),
      unsafeTestTerm("produc", "tivity", " score"),
      unsafeTestTerm("R", "OI"),
      unsafeTestTerm("confi", "dence"),
      unsafeTestTerm("employ", "ee", "_", "id"),
      unsafeTestTerm("source", "_", "ref"),
      unsafeTestTerm("select", " owner_email from table")
    ]) {
      expect(recommendationPayload).not.toMatch(
        new RegExp(escapedTestPatternText(term), "i")
      );
    }
  });
});
