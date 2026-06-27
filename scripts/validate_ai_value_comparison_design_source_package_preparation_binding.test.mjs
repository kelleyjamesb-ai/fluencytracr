import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

import {
  buildComparisonDesignSourcePackagePreparationBinding,
  validateComparisonDesignSourcePackagePreparationBinding
} from "./run_ai_value_comparison_design_source_package_preparation_binding.mjs";
import {
  buildAggregateDataCollectionPlanningContract
} from "./run_ai_value_aggregate_data_collection_planning_contract.mjs";
import {
  buildReviewerApprovedMeasurementPlanContract
} from "./run_ai_value_reviewer_approved_measurement_plan_contract.mjs";
import {
  buildHypothesisToMetricRecommendationPlan
} from "./run_ai_value_hypothesis_to_metric_recommendation.mjs";

const metricLibraryRef =
  "docs/contracts/ai-value-intelligence/examples/customer-support-metrics-library.json";

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function rehashPreparation(artifact) {
  const { preparation_hash, ...hashable } = artifact;
  artifact.preparation_hash = crypto.createHash("sha256").update(stableJson(hashable)).digest("hex");
  return artifact;
}

function recommendationPlan(overrides = {}) {
  return buildHypothesisToMetricRecommendationPlan({
    blueprint_hypothesis_ref: "blueprint_hypothesis.customer_support.case_resolution.2026_06",
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

function approvedMeasurementPlan() {
  const plan = recommendationPlan();
  const recommendation = plan.candidate_metric_recommendations[0];
  return buildReviewerApprovedMeasurementPlanContract({
    sourceRecommendationPlan: plan,
    reviewerApproval: {
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
      reviewer_decision_ref: "reviewer_decision.customer_support.case_resolution.2026_06"
    }
  });
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

function collectionPlan(source, overrides = {}) {
  return {
    aggregate_data_collection_plan_ref:
      "aggregate_data_collection_plan.customer_support.case_resolution.2026_06",
    source_reviewer_approved_measurement_plan_ref:
      source.reviewer_approved_measurement_plan_ref,
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

function upstreamSources() {
  const sourceRecommendationPlan = recommendationPlan();
  const recommendation = sourceRecommendationPlan.candidate_metric_recommendations[0];
  const sourceReviewerApprovedMeasurementPlan = buildReviewerApprovedMeasurementPlanContract({
    sourceRecommendationPlan,
    reviewerApproval: {
      reviewer_approved_measurement_plan_ref:
        "reviewer_approved_measurement_plan.customer_support.case_resolution.2026_06",
      source_blueprint_hypothesis_ref: sourceRecommendationPlan.blueprint_hypothesis_ref,
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
      reviewer_decision_ref: "reviewer_decision.customer_support.case_resolution.2026_06"
    }
  });
  const sourceAggregateDataCollectionPlanningContract =
    buildAggregateDataCollectionPlanningContract({
      sourceReviewerApprovedMeasurementPlan,
      sourceRecommendationPlan,
      aggregateDataCollectionPlan: collectionPlan(sourceReviewerApprovedMeasurementPlan)
    });
  return {
    sourceRecommendationPlan,
    sourceReviewerApprovedMeasurementPlan,
    sourceAggregateDataCollectionPlanningContract
  };
}

function validPreparation() {
  return buildComparisonDesignSourcePackagePreparationBinding(upstreamSources());
}

test("valid upstream contracts create only reviewer collection preparation", () => {
  const sources = upstreamSources();
  const artifact = buildComparisonDesignSourcePackagePreparationBinding(sources);
  const validation = validateComparisonDesignSourcePackagePreparationBinding(artifact, sources);

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(
    artifact.preparation_state,
    "COMPARISON_DESIGN_SOURCE_PACKAGE_PREPARATION_READY_FOR_REVIEWER_COLLECTION"
  );
  assert.equal(artifact.allowed_next_step, "collect_reviewer_owned_comparison_design_source_package_only");
  assert.equal(artifact.artifact_class, "comparison_design_source_package_preparation_binding");
  assert.equal(artifact.internal_only, true);
  assert.equal(artifact.aggregate_only, true);
  assert.equal(artifact.planning_preparation_only, true);
  assert.equal(artifact.evidence_satisfied, false);
  assert.equal(artifact.comparison_design_adequacy_satisfied, false);
  assert.equal(artifact.diagnostics_evidence_satisfied, false);
  assert.equal(artifact.promotion_authorized, false);
  assert.equal(artifact.source_package_created, false);
  assert.equal(artifact.reviewed_evidence_created, false);
  assert.equal(artifact.source_blueprint_hypothesis_ref, sources.sourceRecommendationPlan.blueprint_hypothesis_ref);
  assert.equal(
    artifact.selected_metric_id,
    sources.sourceReviewerApprovedMeasurementPlan.approved_selected_metric.selected_metric_id
  );
  assert.deepEqual(artifact.milestone_schedule.required_milestones, [
    "T0_baseline",
    "T30",
    "T60",
    "T90",
    "T120",
    "T180_6_month",
    "T270_9_month",
    "T365_12_month"
  ]);
  assert.ok(artifact.reviewer_collection_checklist.includes("treatment_group_definition"));
  assert.ok(artifact.reviewer_collection_checklist.includes("roi_finance_productivity_economic_output_exclusion_check"));
});

test("default path without valid upstream approved plan fails closed", () => {
  const artifact = buildComparisonDesignSourcePackagePreparationBinding();

  assert.equal(artifact.preparation_state, "HELD_FOR_REVIEWER_APPROVED_MEASUREMENT_PLAN");
  assert.equal(artifact.allowed_next_step, "complete_reviewer_approved_measurement_plan");
  assert.equal(artifact.preparation_ready, false);
  assert.ok(artifact.gap_list.includes("missing_source_reviewer_approved_measurement_plan"));
  assert.equal(artifact.evidence_satisfied, false);
  assert.equal(artifact.promotion_authorized, false);
});

test("missing aggregate data collection planning contract fails closed", () => {
  const sources = upstreamSources();
  const artifact = buildComparisonDesignSourcePackagePreparationBinding({
    sourceRecommendationPlan: sources.sourceRecommendationPlan,
    sourceReviewerApprovedMeasurementPlan: sources.sourceReviewerApprovedMeasurementPlan
  });

  assert.equal(artifact.preparation_state, "HELD_FOR_AGGREGATE_DATA_COLLECTION_PLANNING_CONTRACT");
  assert.equal(artifact.allowed_next_step, "complete_aggregate_data_collection_planning");
  assert.equal(artifact.preparation_ready, false);
  assert.ok(artifact.gap_list.includes("missing_source_aggregate_data_collection_planning_contract"));
});

test("validation rejects forged measurement plan hash", () => {
  const sources = upstreamSources();
  const artifact = buildComparisonDesignSourcePackagePreparationBinding(sources);
  artifact.source_reviewer_approved_measurement_plan_hash = "forged_measurement_plan_hash";
  rehashPreparation(artifact);

  const validation = validateComparisonDesignSourcePackagePreparationBinding(artifact, sources);

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.includes("source_reviewer_approved_measurement_plan_hash mismatch"));
});

test("validation rejects forged aggregate planning hash", () => {
  const sources = upstreamSources();
  const artifact = buildComparisonDesignSourcePackagePreparationBinding(sources);
  artifact.source_aggregate_data_collection_planning_hash = "forged_aggregate_planning_hash";
  rehashPreparation(artifact);

  const validation = validateComparisonDesignSourcePackagePreparationBinding(artifact, sources);

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.includes("source_aggregate_data_collection_planning_hash mismatch"));
});

test("preparation artifact remains planning-only and cannot satisfy evidence", () => {
  const artifact = validPreparation();

  assert.equal(artifact.planning_preparation_only, true);
  assert.equal(artifact.creates_evidence, false);
  assert.equal(artifact.evidence_satisfied, false);
  assert.equal(artifact.comparison_design_adequacy_satisfied, false);
  assert.equal(artifact.diagnostics_evidence_satisfied, false);
  assert.equal(artifact.feeds.governed_diagnostics_sufficiency_evidence_source, false);
  assert.equal(artifact.feeds.bayesian_promotion_decision_gate, false);
  assert.equal(artifact.promotion_authorized, false);
});

test("Bayesian chain remains held at governed diagnostics sufficiency evidence", () => {
  const artifact = validPreparation();

  assert.equal(
    artifact.bayesian_chain_state.current_state,
    "HOLD_FOR_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE"
  );
  assert.equal(
    artifact.bayesian_chain_state.allowed_next_step,
    "complete_governed_diagnostics_sufficiency_evidence_source"
  );
  assert.equal(artifact.bayesian_chain_state.changed_by_this_artifact, false);
});

test("blocked claims and outputs remain blocked", () => {
  const artifact = validPreparation();
  const serialized = JSON.stringify(artifact).toLowerCase();

  assert.ok(artifact.blocked_claims.includes("preparation_artifact_is_not_reviewed_evidence"));
  assert.ok(artifact.blocked_claims.includes("comparison_design_adequacy_not_satisfied"));
  assert.equal(artifact.blocked_outputs.confidence_output, false);
  assert.equal(artifact.blocked_outputs.probability_output, false);
  assert.equal(artifact.blocked_outputs.roi_output, false);
  assert.equal(artifact.blocked_outputs.finance_output, false);
  assert.equal(artifact.blocked_outputs.causality_output, false);
  assert.equal(artifact.blocked_outputs.productivity_output, false);
  assert.equal(artifact.blocked_outputs.customer_facing_economic_output, false);
  assert.equal(artifact.blocked_outputs.live_connector_execution, false);
  assert.equal(artifact.blocked_outputs.route_creation, false);
  assert.equal(artifact.blocked_outputs.schema_creation, false);
  assert.equal(artifact.blocked_outputs.persistence_write, false);
  assert.equal(artifact.blocked_outputs.export_creation, false);
  assert.equal(serialized.includes("select * from"), false);
  assert.equal(serialized.includes("employee_id"), false);
  assert.equal(serialized.includes("prompt:="), false);
});

test("validation rejects side doors after rehash", () => {
  const sources = upstreamSources();
  const artifact = buildComparisonDesignSourcePackagePreparationBinding(sources);
  artifact.evidence_satisfied = true;
  artifact.comparison_design_adequacy_satisfied = true;
  artifact.promotion_authorized = true;
  artifact.blocked_outputs.persistence_write = true;
  artifact.feeds.governed_diagnostics_sufficiency_evidence_source = true;
  artifact.live_connector_execution_authorized = true;
  rehashPreparation(artifact);

  const validation = validateComparisonDesignSourcePackagePreparationBinding(artifact, sources);

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.includes("evidence_satisfied must be false"));
  assert.ok(validation.gaps.includes("comparison_design_adequacy_satisfied must be false"));
  assert.ok(validation.gaps.includes("promotion_authorized must be false"));
  assert.ok(validation.gaps.includes("blocked_outputs.persistence_write must be present and false"));
  assert.ok(validation.gaps.includes("feeds.governed_diagnostics_sufficiency_evidence_source must be present and false"));
  assert.ok(validation.gaps.includes("forbidden_extra_field:live_connector_execution_authorized"));
});

test("validation rejects unsafe reviewer placeholders after rehash", () => {
  const sources = upstreamSources();
  const artifact = buildComparisonDesignSourcePackagePreparationBinding(sources);
  artifact.reviewer_role_placeholder = "user_id owner";
  artifact.review_decision_placeholder = "customer-facing ROI approval";
  rehashPreparation(artifact);

  const validation = validateComparisonDesignSourcePackagePreparationBinding(artifact, sources);

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.includes("unsafe_contract_value:contract.reviewer_role_placeholder"));
  assert.ok(validation.gaps.includes("unsafe_contract_value:contract.review_decision_placeholder"));
});

test("validation rejects missing checklist items and milestone drift", () => {
  const sources = upstreamSources();
  const artifact = buildComparisonDesignSourcePackagePreparationBinding(sources);
  artifact.reviewer_collection_checklist = artifact.reviewer_collection_checklist.filter(
    (item) => item !== "raw_rows_query_text_prompts_transcripts_exclusion_check"
  );
  artifact.milestone_schedule.required_milestones = artifact.milestone_schedule.required_milestones.filter(
    (item) => item !== "T270_9_month"
  );
  rehashPreparation(artifact);

  const validation = validateComparisonDesignSourcePackagePreparationBinding(artifact, sources);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.includes(
      "reviewer_collection_checklist missing raw_rows_query_text_prompts_transcripts_exclusion_check"
    )
  );
  assert.ok(validation.gaps.includes("milestone_schedule must include T0/T30/T60/T90/T120/T180/T270/T365"));
});

test("validation rejects source projection drift despite valid hashes", () => {
  const sources = upstreamSources();
  const artifact = buildComparisonDesignSourcePackagePreparationBinding(sources);
  artifact.selected_metric_id = "forged_metric_id";
  artifact.expected_movement_direction = "increase";
  artifact.aggregate_measurement_cell_grain = "forged_grain";
  rehashPreparation(artifact);

  const validation = validateComparisonDesignSourcePackagePreparationBinding(artifact, sources);

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.includes("selected_metric_id must match source reviewer-approved measurement plan"));
  assert.ok(validation.gaps.includes("expected_movement_direction must match source reviewer-approved measurement plan"));
  assert.ok(validation.gaps.includes("aggregate_measurement_cell_grain must match source reviewer-approved measurement plan"));
});

test("validation rejects arbitrary top-level laundering fields after rehash", () => {
  const sources = upstreamSources();
  const artifact = buildComparisonDesignSourcePackagePreparationBinding(sources);
  artifact.notes = "reviewed evidence created; comparison_design_adequacy satisfied; source package collected";
  artifact.downstream_collection_unlocked = true;
  rehashPreparation(artifact);

  const validation = validateComparisonDesignSourcePackagePreparationBinding(artifact, sources);

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.includes("unexpected_top_level_field:notes"));
  assert.ok(validation.gaps.includes("unexpected_top_level_field:downstream_collection_unlocked"));
  assert.ok(validation.gaps.includes("unsafe_contract_value:contract.notes"));
});

test("validation rejects extra nested blocked output and feed side doors", () => {
  const sources = upstreamSources();
  const artifact = buildComparisonDesignSourcePackagePreparationBinding(sources);
  artifact.blocked_outputs.reviewed_evidence_created = true;
  artifact.blocked_outputs.comparison_design_adequacy_satisfied = true;
  artifact.feeds.reviewer_attestation_complete = true;
  rehashPreparation(artifact);

  const validation = validateComparisonDesignSourcePackagePreparationBinding(artifact, sources);

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.includes("blocked_outputs.reviewed_evidence_created is not an allowed blocked output key"));
  assert.ok(
    validation.gaps.includes(
      "blocked_outputs.comparison_design_adequacy_satisfied is not an allowed blocked output key"
    )
  );
  assert.ok(validation.gaps.includes("feeds.reviewer_attestation_complete is not an allowed feed key"));
});

test("validation rejects aggregate collection posture and milestone projection drift", () => {
  const sources = upstreamSources();
  const artifact = buildComparisonDesignSourcePackagePreparationBinding(sources);
  artifact.aggregate_collection_plan_posture.collection_owner_role_ref = "forged_collection_owner";
  artifact.aggregate_collection_plan_posture.privacy_boundary_attestation_ref =
    "privacy_boundary_attestation.forged";
  artifact.aggregate_collection_plan_posture.unreviewed_attestation_complete = true;
  artifact.milestone_schedule.approved_milestone_window_refs.T90 = "measurement_window.forged";
  artifact.milestone_schedule.planned_collection_window_refs.T90 = "planned_collection_window.forged";
  rehashPreparation(artifact);

  const validation = validateComparisonDesignSourcePackagePreparationBinding(artifact, sources);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.includes(
      "aggregate_collection_plan_posture.collection_owner_role_ref must match source aggregate planning contract"
    )
  );
  assert.ok(
    validation.gaps.includes(
      "aggregate_collection_plan_posture.privacy_boundary_attestation_ref must match source aggregate planning contract"
    )
  );
  assert.ok(
    validation.gaps.includes(
      "aggregate_collection_plan_posture.unreviewed_attestation_complete is not an allowed aggregate collection posture key"
    )
  );
  assert.ok(
    validation.gaps.includes(
      "milestone_schedule.approved_milestone_window_refs must match source reviewer-approved measurement plan"
    )
  );
  assert.ok(
    validation.gaps.includes(
      "milestone_schedule.planned_collection_window_refs must match source aggregate planning contract"
    )
  );
});

test("validation rejects held artifacts with nested reviewer-collection readiness", () => {
  const sources = upstreamSources();
  const artifact = buildComparisonDesignSourcePackagePreparationBinding({
    sourceRecommendationPlan: sources.sourceRecommendationPlan,
    sourceReviewerApprovedMeasurementPlan: sources.sourceReviewerApprovedMeasurementPlan
  });
  artifact.milestone_schedule.prepared_for_reviewer_collection = true;
  rehashPreparation(artifact);

  const validation = validateComparisonDesignSourcePackagePreparationBinding(artifact, {
    sourceRecommendationPlan: sources.sourceRecommendationPlan,
    sourceReviewerApprovedMeasurementPlan: sources.sourceReviewerApprovedMeasurementPlan
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.includes(
      "milestone_schedule.prepared_for_reviewer_collection must match ready state"
    )
  );
});

test("validation rejects checklist laundering that implies attestation or evidence completion", () => {
  const sources = upstreamSources();
  const artifact = buildComparisonDesignSourcePackagePreparationBinding(sources);
  artifact.reviewer_collection_checklist.push("reviewer_attestation_complete");
  artifact.reviewer_collection_checklist.push("comparison_design_adequacy_satisfied");
  rehashPreparation(artifact);

  const validation = validateComparisonDesignSourcePackagePreparationBinding(artifact, sources);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.includes(
      "reviewer_collection_checklist contains unexpected item reviewer_attestation_complete"
    )
  );
  assert.ok(
    validation.gaps.includes(
      "reviewer_collection_checklist contains unexpected item comparison_design_adequacy_satisfied"
    )
  );
});
