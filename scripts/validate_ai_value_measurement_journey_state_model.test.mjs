import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  MEASUREMENT_JOURNEY_STATE_IDS,
  buildMeasurementJourneyStateModel,
  measurementJourneyStateModelHash,
  validateMeasurementJourneyStateModel
} from "./run_ai_value_measurement_journey_state_model.mjs";
import {
  buildHypothesisToMetricRecommendationPlan
} from "./run_ai_value_hypothesis_to_metric_recommendation.mjs";
import {
  buildReviewerApprovedMeasurementPlanContract
} from "./run_ai_value_reviewer_approved_measurement_plan_contract.mjs";
import {
  buildAggregateDataCollectionPlanningContract
} from "./run_ai_value_aggregate_data_collection_planning_contract.mjs";
import {
  buildComparisonDesignSourcePackagePreparationBinding
} from "./run_ai_value_comparison_design_source_package_preparation_binding.mjs";
import {
  buildReviewerOwnedComparisonDesignSourcePackageCollection
} from "./run_ai_value_reviewer_owned_comparison_design_source_package_collection.mjs";
import {
  buildContributionAlignmentComparisonDesignAdequacyEvidenceReviewFromObject
} from "./run_ai_value_contribution_alignment_comparison_design_adequacy_evidence_review.mjs";
import {
  buildTriangulatedEvidenceAlignmentReview,
  triangulatedEvidenceAlignmentSourceHash
} from "./run_ai_value_triangulated_evidence_alignment_review.mjs";

const metricLibraryRef =
  "docs/contracts/ai-value-intelligence/examples/customer-support-metrics-library.json";
const BLUEPRINT_REF = "blueprint_hypothesis.customer_support.case_resolution.2026_06";
const WINDOW_REF = "observation_window.customer_support.case_resolution.t90";
const COHORT_REF = "cohort.eligible_support_cases_aggregate";
const WORKFLOW_REF = "workflow_function.customer_support_case_resolution";
const USE_CASE_REF = "prioritized_use_case.case_resolution_ai_assist";
const METRIC_REF = "metric.support_median_resolution_hours";

let cachedRuntimeSource = null;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sourceRuntimeSource() {
  if (cachedRuntimeSource) return clone(cachedRuntimeSource);
  cachedRuntimeSource = JSON.parse(
    execFileSync("npm", [
      "run",
      "--silent",
      "run:ai-value-contribution-alignment-internal-bayesian-execution-runtime-source-envelope"
    ], { encoding: "utf8" })
  );
  return clone(cachedRuntimeSource);
}

function recommendationPlan(overrides = {}) {
  return buildHypothesisToMetricRecommendationPlan({
    blueprint_hypothesis_ref: BLUEPRINT_REF,
    blueprint_hypothesis_statement:
      "Improve support case resolution capacity while keeping escalation and quality posture governed.",
    value_route: "CAPACITY_CREATION",
    workflow_function_scope: "customer_support_case_resolution",
    cohort_scope: "eligible_support_cases_aggregate",
    metric_library_refs: [metricLibraryRef],
    ...overrides
  });
}

function milestoneWindowRefs(overrides = {}) {
  return {
    T0_baseline: "measurement_window.customer_support.case_resolution.t0",
    T30: "measurement_window.customer_support.case_resolution.t30",
    T60: "measurement_window.customer_support.case_resolution.t60",
    T90: "measurement_window.customer_support.case_resolution.t90",
    T120: "measurement_window.customer_support.case_resolution.t120",
    T180_6_month: "measurement_window.customer_support.case_resolution.t180",
    T270_9_month: "measurement_window.customer_support.case_resolution.t270",
    T365_12_month: "measurement_window.customer_support.case_resolution.t365",
    ...overrides
  };
}

function collectionWindowRefs(overrides = {}) {
  return {
    T0_baseline: "planned_collection_window.customer_support.case_resolution.t0",
    T30: "planned_collection_window.customer_support.case_resolution.t30",
    T60: "planned_collection_window.customer_support.case_resolution.t60",
    T90: "planned_collection_window.customer_support.case_resolution.t90",
    T120: "planned_collection_window.customer_support.case_resolution.t120",
    T180_6_month: "planned_collection_window.customer_support.case_resolution.t180",
    T270_9_month: "planned_collection_window.customer_support.case_resolution.t270",
    T365_12_month: "planned_collection_window.customer_support.case_resolution.t365",
    ...overrides
  };
}

function reviewerApproval(plan = recommendationPlan(), overrides = {}) {
  const recommendation = plan.candidate_metric_recommendations[0];
  return {
    reviewer_approved_measurement_plan_ref:
      "reviewer_approved_measurement_plan.customer_support.case_resolution.2026_06",
    source_blueprint_hypothesis_ref: plan.blueprint_hypothesis_ref,
    source_candidate_metric_recommendation_ref: recommendation.recommendation_ref,
    selected_metric_id: recommendation.candidate_metric_id,
    selected_metric_family: recommendation.candidate_metric_family,
    selected_measurement_unit: recommendation.measurement_unit,
    metric_owner_role_ref: recommendation.metric_owner_role_ref,
    expected_movement_direction: "decrease",
    expected_lag_definition: "lag_definition.customer_support.case_resolution.t60",
    baseline_value_source_ref: "baseline_source.customer_support.case_resolution.t0",
    comparison_condition_ref: "comparison_condition.customer_support.case_resolution.2026_06",
    milestone_schedule_ref: "milestone_schedule.customer_support.case_resolution.2026_06",
    milestone_window_refs: milestoneWindowRefs(),
    cohort_identity: "eligible_support_cases_aggregate",
    workflow_function_identity: "customer_support_case_resolution",
    aggregate_measurement_cell_grain:
      "org_id+function_area+workflow_id+cohort_key+time_window+metric_id",
    suppression_missing_held_precheck_posture: "CLEAR",
    approval_state: "APPROVED_FOR_AGGREGATE_DATA_COLLECTION_PLANNING",
    approval_role_ref: "role.value_governance_reviewer",
    reviewer_decision_ref: "reviewer_decision.customer_support.case_resolution.2026_06",
    ...overrides
  };
}

function collectionPlan(sourceReviewerApprovedMeasurementPlan, overrides = {}) {
  return {
    aggregate_data_collection_plan_ref:
      "aggregate_data_collection_plan.customer_support.case_resolution.2026_06",
    source_reviewer_approved_measurement_plan_ref:
      sourceReviewerApprovedMeasurementPlan.reviewer_approved_measurement_plan_ref,
    collection_owner_role_ref: "role.value_data_governance_reviewer",
    aggregate_source_posture_ref: "aggregate_source_posture.customer_support.case_resolution",
    source_system_posture_ref: "source_system_posture.customer_support.aggregate_export_only",
    aggregate_export_manifest_plan_ref:
      "aggregate_export_manifest_plan.customer_support.case_resolution",
    measurement_cell_binding_plan_ref:
      "measurement_cell_binding_plan.customer_support.case_resolution",
    planned_collection_window_refs: collectionWindowRefs(),
    suppression_missing_held_collection_precheck_posture: "CLEAR",
    privacy_boundary_attestation_ref:
      "privacy_boundary_attestation.aggregate_only.no_identifiers",
    raw_data_exclusion_attestation_ref:
      "raw_data_exclusion.no_raw_rows.no_prompts.no_transcripts",
    live_connector_exclusion_attestation_ref:
      "live_connector_exclusion.no_live_execution",
    reviewer_decision_ref: "reviewer_decision.aggregate_collection_plan.2026_06",
    planning_state: "APPROVED_FOR_AGGREGATE_COLLECTION_PLANNING",
    ...overrides
  };
}

function reviewerOwnedPackage(overrides = {}) {
  return {
    reviewer_owned_source_package_ref:
      "reviewer_owned_comparison_design_source_package.customer_support.case_resolution.2026_06",
    source_blueprint_hypothesis_ref: BLUEPRINT_REF,
    business_function: "customer_support",
    prioritized_use_case: "case_resolution_ai_assist",
    workflow: "customer_support_case_resolution",
    workflow_step: "case_triage_to_resolution",
    cohort: "eligible_support_cases_aggregate",
    metric: "support_median_resolution_hours",
    evidence_source: "aggregate_measurement_cell_refs_only",
    observation_window: "T0_T30_T60_T90_T120_T180_T270_T365",
    governance_state: "reviewer_owned_aggregate_only",
    treatment_group_definition:
      "Aggregate Measurement Cells representing Blueprint-approved workflows after implementation of the prioritized AI-enabled use case.",
    comparison_group_definition:
      "Aggregate Measurement Cells representing the same workflow and cohort during the approved baseline observation period prior to Blueprint implementation.",
    rollout_or_comparison_design_type: "staggered_rollout",
    baseline_source_posture: "baseline_source.customer_support.case_resolution.t0",
    comparison_condition: "comparison_condition.customer_support.case_resolution.2026_06",
    baseline_window: "T0_baseline",
    comparison_window: "T30_T60_T90_T120_T180_T270_T365",
    expected_movement_direction: "decrease",
    expected_lag_definition: "lag_definition.customer_support.case_resolution.t60",
    metric_direction_lag_confirmation_ref:
      "metric_direction_lag_confirmation.customer_support.case_resolution.2026_06",
    approved_expectation_path_blueprint_hypothesis_binding_ref:
      "expectation_path_binding.customer_support.case_resolution.2026_06",
    cohort_identity_confirmation_ref:
      "cohort_identity_confirmation.customer_support.case_resolution.2026_06",
    workflow_function_identity_confirmation_ref:
      "workflow_function_identity_confirmation.customer_support.case_resolution.2026_06",
    aggregate_measurement_cell_grain_confirmation_ref:
      "measurement_cell_grain_confirmation.customer_support.case_resolution.2026_06",
    aggregate_measurement_cell_grain:
      "Blueprint Hypothesis x Business Function x Prioritized Use Case x Workflow x Workflow Step x Cohort x Metric x Evidence Source x Milestone Window",
    milestone_schedule_confirmation_refs: milestoneWindowRefs({
      T0_baseline: "reviewed_milestone.customer_support.case_resolution.t0",
      T30: "reviewed_milestone.customer_support.case_resolution.t30",
      T60: "reviewed_milestone.customer_support.case_resolution.t60",
      T90: "reviewed_milestone.customer_support.case_resolution.t90",
      T120: "reviewed_milestone.customer_support.case_resolution.t120",
      T180_6_month: "reviewed_milestone.customer_support.case_resolution.t180",
      T270_9_month: "reviewed_milestone.customer_support.case_resolution.t270",
      T365_12_month: "reviewed_milestone.customer_support.case_resolution.t365"
    }),
    suppression_missing_held_window_review: "CLEAR",
    boundary_checks: {
      raw_rows_absent: "CLEAR",
      identifiers_absent: "CLEAR",
      query_text_absent: "CLEAR",
      prompts_transcripts_absent: "CLEAR",
      person_level_data_absent: "CLEAR",
      causality_claim_absent: "CLEAR",
      roi_finance_productivity_claims_absent: "CLEAR",
      confidence_probability_output_absent: "CLEAR",
      live_connector_persistence_export_authorization_absent: "CLEAR",
      cross_slice_aggregation_prohibition_clear: "CLEAR"
    },
    reviewer_role_ref: "role.data_science_governance_reviewer",
    review_decision: "COLLECTED_FOR_REVIEW_ONLY",
    ...overrides
  };
}

function baseChain() {
  const sourceRecommendationPlan = recommendationPlan();
  const sourceReviewerApprovedMeasurementPlan = buildReviewerApprovedMeasurementPlanContract({
    sourceRecommendationPlan,
    reviewerApproval: reviewerApproval(sourceRecommendationPlan)
  });
  const sourceAggregateDataCollectionPlanningContract =
    buildAggregateDataCollectionPlanningContract({
      sourceRecommendationPlan,
      sourceReviewerApprovedMeasurementPlan,
      aggregateDataCollectionPlan: collectionPlan(sourceReviewerApprovedMeasurementPlan)
    });
  const sourceComparisonDesignSourcePackagePreparationBinding =
    buildComparisonDesignSourcePackagePreparationBinding({
      sourceRecommendationPlan,
      sourceReviewerApprovedMeasurementPlan,
      sourceAggregateDataCollectionPlanningContract
    });
  const reviewerOwnedComparisonDesignSourcePackage = reviewerOwnedPackage();
  const sourceReviewerOwnedComparisonDesignSourcePackageCollection =
    buildReviewerOwnedComparisonDesignSourcePackageCollection({
      sourceRecommendationPlan,
      sourceReviewerApprovedMeasurementPlan,
      sourceAggregateDataCollectionPlanningContract,
      sourceComparisonDesignSourcePackagePreparationBinding,
      reviewerOwnedComparisonDesignSourcePackage
    });
  return {
    sourceRecommendationPlan,
    sourceReviewerApprovedMeasurementPlan,
    sourceAggregateDataCollectionPlanningContract,
    sourceComparisonDesignSourcePackagePreparationBinding,
    reviewerOwnedComparisonDesignSourcePackage,
    sourceReviewerOwnedComparisonDesignSourcePackageCollection
  };
}

function draftInput(sourceRecommendationPlan = recommendationPlan()) {
  const recommendation = sourceRecommendationPlan.candidate_metric_recommendations[0];
  return {
    sourceBlueprintHypothesisRef: sourceRecommendationPlan.blueprint_hypothesis_ref,
    candidateMetricRecommendationRef: recommendation.recommendation_ref,
    draftSelectedMetricCandidate: recommendation.candidate_metric_id,
    selectedMetricApproved: false,
    createsGovernedApproval: false,
    createsDiagnosticsEvidence: false,
    comparisonDesignAdequacySatisfied: false,
    feedsBayesianPromotion: false
  };
}

function comparisonReviewContext() {
  const chain = baseChain();
  const runtimeSource = sourceRuntimeSource();
  const runtime = runtimeSource.source_runtime;
  const sourceComparisonDesignAdequacyReview =
    buildContributionAlignmentComparisonDesignAdequacyEvidenceReviewFromObject({
      ...runtimeSource,
      comparison_design_source_evidence:
        chain.sourceReviewerOwnedComparisonDesignSourcePackageCollection
    });
  return {
    ...chain,
    sourceRuntime: runtime,
    sourceGate: runtimeSource.source_gate,
    aggregateMeasurementCellWindows: runtimeSource.aggregate_measurement_cell_windows,
    sourceComparisonDesignAdequacyReview
  };
}

function triangulatedSourceFields(sourceComparisonDesignAdequacyReview, overrides = {}) {
  const source = {
    reviewer_owned_triangulated_evidence_alignment_ref:
      "reviewer_owned_triangulated_evidence_alignment.customer_support.case_resolution.2026_06",
    source_blueprint_hypothesis_ref: BLUEPRINT_REF,
    source_comparison_design_adequacy_review_hash:
      sourceComparisonDesignAdequacyReview.review_hash,
    source_sed_aggregate_evidence_ref:
      "reviewed_sed_aggregate_evidence.customer_support.case_resolution.t90",
    source_sed_aggregate_evidence_hash: "1".repeat(64),
    source_vbd_aggregate_evidence_ref:
      "reviewed_vbd_aggregate_evidence.customer_support.case_resolution.t90",
    source_vbd_aggregate_evidence_hash: "2".repeat(64),
    source_outcome_metric_aggregate_evidence_ref:
      "reviewed_outcome_metric_aggregate_evidence.customer_support.case_resolution.t90",
    source_outcome_metric_aggregate_evidence_hash: "3".repeat(64),
    observation_window_ref: WINDOW_REF,
    cohort_ref: COHORT_REF,
    workflow_function_ref: WORKFLOW_REF,
    prioritized_use_case_ref: USE_CASE_REF,
    metric_ref: METRIC_REF,
    source_sed_blueprint_hypothesis_ref: BLUEPRINT_REF,
    source_sed_observation_window_ref: WINDOW_REF,
    source_sed_cohort_ref: COHORT_REF,
    source_sed_workflow_function_ref: WORKFLOW_REF,
    source_sed_prioritized_use_case_ref: USE_CASE_REF,
    source_sed_metric_ref: METRIC_REF,
    source_vbd_blueprint_hypothesis_ref: BLUEPRINT_REF,
    source_vbd_observation_window_ref: WINDOW_REF,
    source_vbd_cohort_ref: COHORT_REF,
    source_vbd_workflow_function_ref: WORKFLOW_REF,
    source_vbd_prioritized_use_case_ref: USE_CASE_REF,
    source_vbd_metric_ref: METRIC_REF,
    source_outcome_blueprint_hypothesis_ref: BLUEPRINT_REF,
    source_outcome_observation_window_ref: WINDOW_REF,
    source_outcome_cohort_ref: COHORT_REF,
    source_outcome_workflow_function_ref: WORKFLOW_REF,
    source_outcome_prioritized_use_case_ref: USE_CASE_REF,
    source_outcome_metric_ref: METRIC_REF,
    source_sed_evidence_status: "CLEAR",
    source_vbd_evidence_status: "CLEAR",
    source_outcome_evidence_status: "CLEAR",
    reviewer_role_ref: "role.value_data_governance_reviewer",
    alignment_review_decision: "ALIGNED_FOR_REVIEW",
    alignment_review_notes:
      "Reviewer-owned aggregate stream refs line up for internal review only.",
    boundary_checks_clear: "CLEAR",
    reviewer_attestations_complete: "YES",
    aggregate_only_scope: "YES",
    placeholder_evidence: "NO",
    generated_fixture_evidence: "NO",
    ...overrides
  };
  source.reviewer_owned_triangulated_evidence_alignment_hash =
    triangulatedEvidenceAlignmentSourceHash(source);
  return source;
}

function alignmentContext(overrides = {}) {
  const context = comparisonReviewContext();
  const reviewerOwnedTriangulatedEvidenceAlignment = triangulatedSourceFields(
    context.sourceComparisonDesignAdequacyReview,
    overrides
  );
  const sourceTriangulatedEvidenceAlignmentReview =
    buildTriangulatedEvidenceAlignmentReview({
      reviewerOwnedTriangulatedEvidenceAlignment,
      sourceComparisonDesignAdequacyReview: context.sourceComparisonDesignAdequacyReview
    });
  return {
    ...context,
    reviewerOwnedTriangulatedEvidenceAlignment,
    sourceTriangulatedEvidenceAlignmentReview
  };
}

function assertValidModel(input, expectedState) {
  const model = buildMeasurementJourneyStateModel(input);
  const validation = validateMeasurementJourneyStateModel(model, { sourceInput: input });
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(model.measurement_journey_state.state_id, expectedState);
  assert.equal(model.creates_evidence, false);
  assert.equal(model.diagnostics_evidence_satisfied, false);
  assert.deepEqual(model.evidence_dimensions_satisfied, []);
  assert.equal(model.bayesian_readiness_authorized, false);
  assert.equal(model.promotion_authorized, false);
  assert.equal(model.posterior_interpretation_authorized, false);
  assert.equal(model.confidence_probability_authorized, false);
  assert.equal(model.customer_economic_output_authorized, false);
  for (const value of Object.values(model.blocked_outputs)) assert.equal(value, false);
  for (const value of Object.values(model.feeds)) assert.equal(value, false);
  return model;
}

test("default state model fails closed to no Blueprint", () => {
  const model = buildMeasurementJourneyStateModel();
  const validation = validateMeasurementJourneyStateModel(model);

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(model.measurement_journey_state.state_id, "NO_BLUEPRINT");
  assert.equal(model.current_blocker, "missing_blueprint_hypothesis");
  assert.equal(model.next_allowed_action, "complete_blueprint_hypothesis");
  assert.equal(
    model.model_review_posture,
    "BLOCKED_UNTIL_GOVERNED_DIAGNOSTICS_EVIDENCE"
  );
  assert.equal(model.diagnostics_evidence_satisfied, false);
  assert.equal(model.bayesian_readiness_authorized, false);
  assert.equal(model.promotion_authorized, false);
});

test("every required journey state has a complete UI-safe definition", () => {
  const model = buildMeasurementJourneyStateModel();
  const definitions = model.state_definitions;

  assert.deepEqual(
    MEASUREMENT_JOURNEY_STATE_IDS,
    [
      "NO_BLUEPRINT",
      "BLUEPRINT_RECEIVED",
      "METRICS_RECOMMENDED",
      "MEASUREMENT_PLAN_DRAFTED",
      "MEASUREMENT_PLAN_APPROVED",
      "DATA_COLLECTION_PLANNING_READY",
      "SOURCE_PACKAGE_COLLECTION_READY",
      "COMPARISON_DESIGN_REVIEWED",
      "EVIDENCE_ALIGNMENT_HELD",
      "EVIDENCE_ALIGNMENT_PARTIAL",
      "EVIDENCE_ALIGNMENT_ALIGNED",
      "EVIDENCE_ALIGNMENT_DIVERGENT",
      "MODEL_REVIEW_BLOCKED"
    ]
  );

  for (const stateId of MEASUREMENT_JOURNEY_STATE_IDS) {
    const definition = definitions[stateId];
    assert.equal(definition.state_id, stateId);
    for (const field of [
      "status_label",
      "plain_language_description",
      "source_contract_dependency",
      "readiness_level",
      "next_action",
      "user_should_do_next"
    ]) {
      assert.equal(typeof definition[field], "string", `${stateId}.${field}`);
      assert.notEqual(definition[field].trim(), "", `${stateId}.${field}`);
    }
    for (const field of [
      "blocked_claims",
      "what_is_not_yet_evidence",
      "allowed_ui_language",
      "blocked_ui_language"
    ]) {
      assert.ok(Array.isArray(definition[field]), `${stateId}.${field}`);
      assert.ok(definition[field].length > 0, `${stateId}.${field}`);
    }
  }
});

test("state model hash is source-bound to the emitted state model", () => {
  const model = buildMeasurementJourneyStateModel();

  assert.match(model.state_model_hash, /^[0-9a-f]{64}$/);
  assert.equal(model.state_model_hash, measurementJourneyStateModelHash(model));
  assert.equal(validateMeasurementJourneyStateModel(model).valid, true);

  const forged = {
    ...model,
    state_model_hash: createHash("sha256").update("forged").digest("hex")
  };
  const validation = validateMeasurementJourneyStateModel(forged);

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.includes("state_model_hash mismatch"));
});

test("selects every journey state from the most advanced valid source dependency", () => {
  const sourceRecommendationPlan = recommendationPlan();
  const chain = baseChain();
  const comparison = comparisonReviewContext();
  const aligned = alignmentContext({ alignment_review_decision: "ALIGNED_FOR_REVIEW" });
  const partial = alignmentContext({ alignment_review_decision: "PARTIAL_ALIGNMENT_FOR_REVIEW" });
  const divergent = alignmentContext({ alignment_review_decision: "DIVERGENT_FOR_REVIEW" });
  const held = alignmentContext({ source_vbd_evidence_status: "MISSING" });

  const cases = [
    [{}, "NO_BLUEPRINT"],
    [{ blueprint_hypothesis_ref: BLUEPRINT_REF }, "BLUEPRINT_RECEIVED"],
    [{ sourceRecommendationPlan }, "METRICS_RECOMMENDED"],
    [
      { sourceRecommendationPlan, reviewerMetricSelectionDraft: draftInput(sourceRecommendationPlan) },
      "MEASUREMENT_PLAN_DRAFTED"
    ],
    [
      {
        sourceRecommendationPlan: chain.sourceRecommendationPlan,
        sourceReviewerApprovedMeasurementPlan:
          chain.sourceReviewerApprovedMeasurementPlan
      },
      "MEASUREMENT_PLAN_APPROVED"
    ],
    [
      {
        sourceRecommendationPlan: chain.sourceRecommendationPlan,
        sourceReviewerApprovedMeasurementPlan:
          chain.sourceReviewerApprovedMeasurementPlan,
        sourceAggregateDataCollectionPlanningContract:
          chain.sourceAggregateDataCollectionPlanningContract
      },
      "DATA_COLLECTION_PLANNING_READY"
    ],
    [
      {
        ...chain,
        reviewerMetricSelectionDraft: draftInput(chain.sourceRecommendationPlan)
      },
      "SOURCE_PACKAGE_COLLECTION_READY"
    ],
    [{ ...comparison, reviewerMetricSelectionDraft: draftInput(comparison.sourceRecommendationPlan) }, "COMPARISON_DESIGN_REVIEWED"],
    [{ ...held, reviewerMetricSelectionDraft: draftInput(held.sourceRecommendationPlan) }, "EVIDENCE_ALIGNMENT_HELD"],
    [{ ...partial, reviewerMetricSelectionDraft: draftInput(partial.sourceRecommendationPlan) }, "EVIDENCE_ALIGNMENT_PARTIAL"],
    [{ ...aligned, reviewerMetricSelectionDraft: draftInput(aligned.sourceRecommendationPlan) }, "EVIDENCE_ALIGNMENT_ALIGNED"],
    [{ ...divergent, reviewerMetricSelectionDraft: draftInput(divergent.sourceRecommendationPlan) }, "EVIDENCE_ALIGNMENT_DIVERGENT"],
    [
      {
        ...aligned,
        reviewerMetricSelectionDraft: draftInput(aligned.sourceRecommendationPlan),
        modelReviewGatePosture: {
          next_visible_action: "model_review_gating",
          source_triangulated_evidence_alignment_review_hash:
            aligned.sourceTriangulatedEvidenceAlignmentReview.alignment_review_hash
        }
      },
      "MODEL_REVIEW_BLOCKED"
    ]
  ];

  for (const [input, expectedState] of cases) {
    assertValidModel(input, expectedState);
  }
});

test("earliest unmet prerequisite wins even when later artifacts are present", () => {
  const aligned = alignmentContext({ alignment_review_decision: "ALIGNED_FOR_REVIEW" });
  const withoutRecommendation = {
    blueprint_hypothesis_ref: BLUEPRINT_REF,
    sourceTriangulatedEvidenceAlignmentReview:
      aligned.sourceTriangulatedEvidenceAlignmentReview,
    sourceComparisonDesignAdequacyReview:
      aligned.sourceComparisonDesignAdequacyReview
  };
  const model = buildMeasurementJourneyStateModel(withoutRecommendation);

  assert.equal(model.measurement_journey_state.state_id, "BLUEPRINT_RECEIVED");
  assert.equal(model.current_blocker, "missing_source_recommendation_plan");
  assert.equal(model.model_review_posture, "BLOCKED_UNTIL_GOVERNED_DIAGNOSTICS_EVIDENCE");
});

test("draft metric selection cannot be mistaken for reviewer approval or evidence", () => {
  const sourceRecommendationPlan = recommendationPlan();
  const unsafeDraft = {
    ...draftInput(sourceRecommendationPlan),
    selectedMetricApproved: true,
    createsGovernedApproval: true,
    createsDiagnosticsEvidence: true,
    comparisonDesignAdequacySatisfied: true,
    feedsBayesianPromotion: true
  };
  const model = buildMeasurementJourneyStateModel({
    sourceRecommendationPlan,
    reviewerMetricSelectionDraft: unsafeDraft
  });

  assert.equal(model.measurement_journey_state.state_id, "METRICS_RECOMMENDED");
  assert.equal(
    model.current_blocker,
    "missing_reviewer_metric_selection_draft"
  );
  assert.equal(model.promotion_authorized, false);
});

test("hash-only comparison review does not advance beyond source package collection", () => {
  const comparison = comparisonReviewContext();
  const input = {
    ...baseChain(),
    reviewerMetricSelectionDraft: draftInput(comparison.sourceRecommendationPlan),
    sourceComparisonDesignAdequacyReview: comparison.sourceComparisonDesignAdequacyReview
  };
  const model = buildMeasurementJourneyStateModel(input);

  assert.equal(model.measurement_journey_state.state_id, "SOURCE_PACKAGE_COLLECTION_READY");
  assert.equal(model.current_blocker, "missing_comparison_design_adequacy_review");
});

test("ready triangulated alignment report requires source-bound validation before mapping", () => {
  const aligned = alignmentContext({ alignment_review_decision: "ALIGNED_FOR_REVIEW" });
  const input = {
    ...aligned,
    reviewerMetricSelectionDraft: draftInput(aligned.sourceRecommendationPlan),
    reviewerOwnedTriangulatedEvidenceAlignment: undefined
  };
  const model = buildMeasurementJourneyStateModel(input);

  assert.equal(model.measurement_journey_state.state_id, "COMPARISON_DESIGN_REVIEWED");
  assert.equal(model.current_blocker, "reviewerOwnedTriangulatedEvidenceAlignment source is required for ready validation");
});

test("held triangulated alignment also requires source-bound held validation", () => {
  const comparison = comparisonReviewContext();
  const forgedHeldReview = {
    triangulated_evidence_alignment_review_state: "HOLD_FOR_GOVERNED_EVIDENCE",
    gap_list: ["missing_source_sed_aggregate_evidence_ref"],
    alignment_review_hash: null,
    reviewed_source_evidence_hash: null,
    source_evidence_hash: null,
    promotion_authorized: false,
    bayesian_readiness_authorized: false,
    diagnostics_sufficiency_satisfied: false
  };
  const model = buildMeasurementJourneyStateModel({
    ...comparison,
    reviewerMetricSelectionDraft: draftInput(comparison.sourceRecommendationPlan),
    sourceTriangulatedEvidenceAlignmentReview: forgedHeldReview
  });

  assert.equal(model.measurement_journey_state.state_id, "COMPARISON_DESIGN_REVIEWED");
  assert.notEqual(model.current_blocker, "governed_evidence_alignment_inputs_held");
  assert.notEqual(model.measurement_journey_state.state_id, "EVIDENCE_ALIGNMENT_HELD");
});

test("malformed held triangulated review cannot advance with narrow null false gates", () => {
  const held = alignmentContext({ source_vbd_evidence_status: "MISSING" });
  const forgedHeldReview = {
    ...held.sourceTriangulatedEvidenceAlignmentReview,
    schema_version: "forged_schema",
    internal_only: false,
    aggregate_only: false,
    source_ref_only: false,
    fail_closed: false
  };
  const model = buildMeasurementJourneyStateModel({
    ...held,
    reviewerMetricSelectionDraft: draftInput(held.sourceRecommendationPlan),
    sourceTriangulatedEvidenceAlignmentReview: forgedHeldReview
  });

  assert.equal(model.measurement_journey_state.state_id, "COMPARISON_DESIGN_REVIEWED");
  assert.notEqual(model.measurement_journey_state.state_id, "EVIDENCE_ALIGNMENT_HELD");
  assert.notEqual(model.current_blocker, "governed_evidence_alignment_inputs_held");
});

test("valid alignment state remains separate from model review posture", () => {
  const aligned = alignmentContext({ alignment_review_decision: "ALIGNED_FOR_REVIEW" });
  const model = assertValidModel(
    {
      ...aligned,
      reviewerMetricSelectionDraft: draftInput(aligned.sourceRecommendationPlan)
    },
    "EVIDENCE_ALIGNMENT_ALIGNED"
  );

  assert.equal(model.model_review_posture, "BLOCKED_UNTIL_GOVERNED_DIAGNOSTICS_EVIDENCE");
  assert.equal(model.current_blocker, "governed_diagnostics_sufficiency_evidence_missing");
  assert.equal(model.customer_safe_summary.includes("internal review only"), true);
  assert.equal(model.bayesian_readiness_authorized, false);
});

test("model review blocked does not hide held partial or divergent alignment states", () => {
  for (const [alignmentDecision, expectedState] of [
    ["PARTIAL_ALIGNMENT_FOR_REVIEW", "EVIDENCE_ALIGNMENT_PARTIAL"],
    ["DIVERGENT_FOR_REVIEW", "EVIDENCE_ALIGNMENT_DIVERGENT"]
  ]) {
    const context = alignmentContext({ alignment_review_decision: alignmentDecision });
    const model = assertValidModel(
      {
        ...context,
        reviewerMetricSelectionDraft: draftInput(context.sourceRecommendationPlan),
        modelReviewGatePosture: {
          next_visible_action: "model_review_gating",
          source_triangulated_evidence_alignment_review_hash:
            context.sourceTriangulatedEvidenceAlignmentReview.alignment_review_hash
        }
      },
      expectedState
    );

    assert.equal(model.model_review_posture, "BLOCKED_UNTIL_GOVERNED_DIAGNOSTICS_EVIDENCE");
  }

  const held = alignmentContext({ source_vbd_evidence_status: "MISSING" });
  const heldModel = assertValidModel(
    {
      ...held,
      reviewerMetricSelectionDraft: draftInput(held.sourceRecommendationPlan),
      modelReviewGatePosture: {
        next_visible_action: "model_review_gating",
        source_triangulated_evidence_alignment_review_hash: "not-a-ready-alignment-hash"
      }
    },
    "EVIDENCE_ALIGNMENT_HELD"
  );
  assert.equal(heldModel.current_blocker, "governed_evidence_alignment_inputs_held");
});

test("aligned and divergent states do not imply causality success failure or model readiness", () => {
  for (const state of [
    "EVIDENCE_ALIGNMENT_ALIGNED",
    "EVIDENCE_ALIGNMENT_DIVERGENT",
    "MODEL_REVIEW_BLOCKED"
  ]) {
    const model = buildMeasurementJourneyStateModel();
    const definition = model.state_definitions[state];
    const combinedSafeText = [
      definition.status_label,
      definition.plain_language_description,
      definition.next_action,
      definition.user_should_do_next
    ].join(" ").toLowerCase();

    assert.equal(/\bcaus/.test(combinedSafeText), false, state);
    assert.equal(/\bconfidence\b|\bprobability\b|\bposterior\b/.test(combinedSafeText), false, state);
    assert.equal(/\broi\b|\bfinance\b|\beconomic\b|\bproductivity\b/.test(combinedSafeText), false, state);
    assert.equal(/\bsuccess\b/.test(combinedSafeText), false, state);
    assert.equal(/\bfailure\b/.test(combinedSafeText), false, state);
    assert.ok(definition.blocked_ui_language.includes("success"));
    assert.ok(definition.blocked_ui_language.includes("failure"));
  }
});

test("unsafe source ref input is not echoed into the state model", () => {
  const model = buildMeasurementJourneyStateModel({
    blueprint_hypothesis_ref:
      "blueprint select * from raw_rows where employee_id = 123 and roi_value = 10"
  });
  const serialized = JSON.stringify(model).toLowerCase();

  assert.equal(model.measurement_journey_state.state_id, "NO_BLUEPRINT");
  assert.equal(serialized.includes("select * from raw_rows"), false);
  assert.equal(serialized.includes("employee_id = 123"), false);
  assert.equal(serialized.includes("roi_value = 10"), false);
});

test("non-default validation requires source-bound recomputation", () => {
  const sourceRecommendationPlan = recommendationPlan();
  const model = buildMeasurementJourneyStateModel({ sourceRecommendationPlan });
  const validation = validateMeasurementJourneyStateModel(model);

  assert.equal(model.measurement_journey_state.state_id, "METRICS_RECOMMENDED");
  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.includes("sourceInput is required for non-default state validation"));
});

test("source-bound validation rejects forged body fields even with recomputed hash", () => {
  const sourceRecommendationPlan = recommendationPlan();
  const sourceInput = { sourceRecommendationPlan };
  const model = buildMeasurementJourneyStateModel(sourceInput);
  const forged = {
    ...model,
    current_blocker: "forged_blocker",
    customer_safe_summary: "forged summary"
  };
  forged.state_model_hash = measurementJourneyStateModelHash(forged);

  const validation = validateMeasurementJourneyStateModel(forged, { sourceInput });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.includes(
      "measurement_journey_state does not match source-bound recomputation"
    )
  );
});

test("validation requires blocked output and feed keys to remain present and false", () => {
  const model = buildMeasurementJourneyStateModel();
  const forged = clone(model);
  delete forged.blocked_outputs.raw_rows;
  forged.feeds.bayesian_promotion_decision_gate = true;
  forged.state_model_hash = measurementJourneyStateModelHash(forged);
  const validation = validateMeasurementJourneyStateModel(forged);

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.includes("blocked_outputs.raw_rows must be present and false"));
  assert.ok(
    validation.gaps.includes(
      "feeds.bayesian_promotion_decision_gate must be present and false"
    )
  );
});

test("default validation rejects forged unsafe UI and source text with recomputed hash", () => {
  const forged = clone(buildMeasurementJourneyStateModel());
  forged.customer_safe_summary =
    "ROI confidence output from select * from raw_rows where employee_id = 123";
  forged.source_contract_refs.blueprint_hypothesis_ref =
    "blueprint.raw_rows.employee_id.roi_value";
  forged.measurement_journey_state.plain_language_description =
    "customer-facing economic productivity score";
  forged.state_model_hash = measurementJourneyStateModelHash(forged);

  const validation = validateMeasurementJourneyStateModel(forged);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.startsWith("unsafe_output_value:")),
    validation.gaps.join("; ")
  );
});
