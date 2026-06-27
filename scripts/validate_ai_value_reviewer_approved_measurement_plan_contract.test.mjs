import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

import {
  REQUIRED_APPROVED_MEASUREMENT_PLAN_MILESTONES,
  buildReviewerApprovedMeasurementPlanContract,
  validateReviewerApprovedMeasurementPlanContract
} from "./run_ai_value_reviewer_approved_measurement_plan_contract.mjs";
import {
  buildHypothesisToMetricRecommendationPlan
} from "./run_ai_value_hypothesis_to_metric_recommendation.mjs";

const metricLibraryRef =
  "docs/contracts/ai-value-intelligence/examples/customer-support-metrics-library.json";

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

function approval(overrides = {}) {
  const plan = recommendationPlan();
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

function validContract(overrides = {}) {
  return buildReviewerApprovedMeasurementPlanContract({
    sourceRecommendationPlan: recommendationPlan(),
    reviewerApproval: approval(overrides)
  });
}

function recomputeContractHash(contract) {
  const stableJson = (value) => {
    if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(",")}]`;
    if (value && typeof value === "object") {
      return `{${Object.keys(value)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
        .join(",")}}`;
    }
    return JSON.stringify(value);
  };
  const { contract_hash, ...hashable } = contract;
  return crypto.createHash("sha256").update(stableJson(hashable)).digest("hex");
}

function rehash(contract) {
  contract.contract_hash = recomputeContractHash(contract);
  return contract;
}

test("valid reviewer-approved measurement plan unlocks only aggregate data collection planning", () => {
  const contract = validContract();
  const validation = validateReviewerApprovedMeasurementPlanContract(contract, {
    sourceRecommendationPlan: recommendationPlan()
  });

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(
    contract.contract_state,
    "REVIEWER_APPROVED_MEASUREMENT_PLAN_READY_FOR_AGGREGATE_DATA_COLLECTION_PLANNING"
  );
  assert.equal(contract.allowed_next_step, "aggregate_data_collection_planning_only");
  assert.equal(contract.data_collection_readiness_state, "READY_FOR_AGGREGATE_DATA_COLLECTION_PLANNING_ONLY");
  assert.equal(contract.selected_metric_approved, true);
  assert.equal(contract.measurement_plan_approved, true);
  assert.equal(contract.creates_evidence, false);
  assert.equal(contract.diagnostics_evidence_satisfied, false);
  assert.equal(contract.comparison_design_adequacy_satisfied, false);
  assert.equal(contract.aggregate_data_observed, false);
  assert.equal(contract.evidence_assessment_ready, false);
  assert.equal(contract.bayesian_chain_state.current_state, "HOLD_FOR_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE");
  assert.equal(contract.promotion_authorized, false);
});

test("required milestone schedule includes T0/T30/T60/T90/T120/T180/T270/T365", () => {
  const contract = validContract();

  assert.deepEqual(REQUIRED_APPROVED_MEASUREMENT_PLAN_MILESTONES, [
    "T0_baseline",
    "T30",
    "T60",
    "T90",
    "T120",
    "T180_6_month",
    "T270_9_month",
    "T365_12_month"
  ]);
  assert.deepEqual(contract.approved_milestone_schedule.required_milestones, REQUIRED_APPROVED_MEASUREMENT_PLAN_MILESTONES);
  assert.equal(contract.approved_milestone_schedule.schedule_approved, true);
});

test("recommendation plan remains planning input and not evidence", () => {
  const contract = validContract();

  assert.equal(contract.source_candidate_metric_recommendation_is_evidence, false);
  assert.equal(contract.source_candidate_metric_recommendation_selected_by_system, false);
  assert.equal(contract.approved_plan_is_observed_data, false);
  assert.equal(contract.measurement_spec_is_bayesian_readiness, false);
  assert.equal(contract.feeds.governed_diagnostics_sufficiency_evidence_source, false);
  assert.equal(contract.feeds.bayesian_promotion_decision_gate, false);
});

test("default path without reviewer approval fails closed", () => {
  const contract = buildReviewerApprovedMeasurementPlanContract({
    sourceRecommendationPlan: recommendationPlan()
  });

  assert.equal(contract.contract_state, "HELD_FOR_REVIEWER_APPROVED_MEASUREMENT_PLAN");
  assert.equal(contract.selected_metric_approved, false);
  assert.equal(contract.measurement_plan_approved, false);
  assert.equal(contract.data_collection_readiness_state, "HELD_FOR_REVIEWER_APPROVED_MEASUREMENT_PLAN");
  assert.ok(contract.gap_list.includes("missing_reviewer_approved_measurement_plan_ref"));
});

test("draft or pending approval does not become approval", () => {
  const contract = validContract({
    approval_state: "DRAFT_INTAKE_PREPARED_REVIEW_REQUIRED"
  });

  assert.equal(contract.contract_state, "HELD_FOR_REVIEWER_APPROVED_MEASUREMENT_PLAN");
  assert.equal(contract.selected_metric_approved, false);
  assert.equal(contract.allowed_next_step, "complete_reviewer_approved_measurement_plan");
  assert.ok(contract.gap_list.includes("approval_state_not_approved"));
});

test("forged candidate recommendation ref is rejected", () => {
  const contract = validContract({
    source_candidate_metric_recommendation_ref:
      "hypothesis_metric_recommendation.blueprint_hypothesis.customer_support.case_resolution.2026_06.forged_metric"
  });

  assert.equal(contract.contract_state, "HELD_FOR_CANDIDATE_METRIC_RECOMMENDATION");
  assert.equal(contract.selected_metric_approved, false);
  assert.ok(contract.gap_list.includes("source_candidate_metric_recommendation_ref_not_found"));
});

test("selected metric must match the source recommendation", () => {
  const contract = validContract({
    selected_metric_id: "fabricated_metric_id"
  });

  assert.equal(contract.contract_state, "HELD_FOR_CANDIDATE_METRIC_RECOMMENDATION");
  assert.equal(contract.selected_metric_approved, false);
  assert.ok(contract.gap_list.includes("selected_metric_id_mismatch"));
});

test("missing milestone windows keep data collection planning held", () => {
  const contract = validContract({
    milestone_window_refs: milestoneWindowRefs({ T270_9_month: "" })
  });

  assert.equal(contract.contract_state, "HELD_FOR_REVIEWER_APPROVED_MEASUREMENT_PLAN");
  assert.equal(contract.data_collection_readiness_state, "HELD_FOR_AGGREGATE_MILESTONE_SCHEDULE");
  assert.ok(contract.gap_list.includes("missing_milestone_window_ref:T270_9_month"));
});

test("unsafe approval values fail closed and are not emitted", () => {
  const contract = validContract({
    reviewer_approved_measurement_plan_ref: "reviewer_plan.james@example.com",
    baseline_value_source_ref: "raw_rows select * from users where employee_id = 123",
    expected_lag_definition: "ROI finance confidence output at T180"
  });
  const serialized = JSON.stringify(contract).toLowerCase();

  assert.equal(contract.contract_state, "HELD_FOR_REVIEWER_APPROVED_MEASUREMENT_PLAN");
  assert.ok(contract.gap_list.includes("unsafe_reviewer_approved_measurement_plan_ref"));
  assert.ok(contract.gap_list.includes("unsafe_baseline_value_source_ref"));
  assert.ok(contract.gap_list.includes("unsafe_expected_lag_definition"));
  assert.equal(serialized.includes("james@example.com"), false);
  assert.equal(serialized.includes("select * from users"), false);
  assert.equal(serialized.includes("employee_id"), false);
  assert.equal(serialized.includes("roi finance"), false);
  assert.equal(serialized.includes("confidence output"), false);
});

test("blocked output language cannot be smuggled into approval refs", () => {
  const contract = validContract({
    reviewer_approved_measurement_plan_ref:
      "reviewer_plan.live_connector_execution.persistence_write",
    baseline_value_source_ref: "baseline_source.customer_facing_output",
    comparison_condition_ref: "comparison_condition.route_creation.schema_creation",
    reviewer_decision_ref: "reviewer_decision.individual_scoring.team_scoring"
  });

  assert.equal(contract.contract_state, "HELD_FOR_REVIEWER_APPROVED_MEASUREMENT_PLAN");
  assert.ok(contract.gap_list.includes("unsafe_reviewer_approved_measurement_plan_ref"));
  assert.ok(contract.gap_list.includes("unsafe_baseline_value_source_ref"));
  assert.ok(contract.gap_list.includes("unsafe_comparison_condition_ref"));
  assert.ok(contract.gap_list.includes("unsafe_reviewer_decision_ref"));
  assert.equal(contract.reviewer_approved_measurement_plan_ref, null);
  assert.equal(contract.reviewer_decision_ref, null);
  assert.equal(contract.approved_baseline_and_comparison.baseline_value_source_ref, null);
  assert.equal(contract.approved_baseline_and_comparison.comparison_condition_ref, null);
});

test("template generated fixture or runtime-only approval provenance fails closed", () => {
  const contract = validContract({
    reviewer_approved_measurement_plan_ref: "fixture.generated.measurement_plan.approval",
    source_candidate_metric_recommendation_ref:
      "hypothesis_metric_recommendation.blueprint_hypothesis.customer_support.case_resolution.2026_06.support_median_resolution_hours",
    baseline_value_source_ref: "template.baseline.source_hash_only",
    comparison_condition_ref: "runtime_only.comparison.condition",
    milestone_schedule_ref: "generated.milestone.schedule",
    approval_role_ref: "generated.fixture.role",
    reviewer_decision_ref: "template.runtime_only.source_hash_only.decision"
  });

  assert.equal(contract.contract_state, "HELD_FOR_REVIEWER_APPROVED_MEASUREMENT_PLAN");
  assert.equal(contract.selected_metric_approved, false);
  assert.equal(contract.measurement_plan_approved, false);
  assert.ok(contract.gap_list.includes("non_reviewed_approval_provenance:reviewer_approved_measurement_plan_ref"));
  assert.ok(contract.gap_list.includes("non_reviewed_approval_provenance:baseline_value_source_ref"));
  assert.ok(contract.gap_list.includes("non_reviewed_approval_provenance:reviewer_decision_ref"));
});

test("stale suppressed held or misaligned milestone window refs keep planning held", () => {
  const contract = validContract({
    milestone_window_refs: milestoneWindowRefs({
      T30: "measurement_window.customer_support.case_resolution.stale",
      T60: "measurement_window.customer_support.case_resolution.suppressed",
      T90: "measurement_window.customer_support.case_resolution.held",
      T120: "measurement_window.customer_support.case_resolution.misaligned"
    })
  });

  assert.equal(contract.contract_state, "HELD_FOR_REVIEWER_APPROVED_MEASUREMENT_PLAN");
  assert.equal(contract.data_collection_readiness_state, "HELD_FOR_AGGREGATE_MILESTONE_SCHEDULE");
  assert.ok(contract.gap_list.includes("non_ready_milestone_window_ref:T30"));
  assert.ok(contract.gap_list.includes("non_ready_milestone_window_ref:T60"));
  assert.ok(contract.gap_list.includes("non_ready_milestone_window_ref:T90"));
  assert.ok(contract.gap_list.includes("non_ready_milestone_window_ref:T120"));
});

test("missing approval fields remain approval hold rather than candidate recommendation hold", () => {
  const contract = validContract({
    selected_metric_id: "",
    selected_metric_family: ""
  });

  assert.equal(contract.contract_state, "HELD_FOR_REVIEWER_APPROVED_MEASUREMENT_PLAN");
  assert.equal(contract.allowed_next_step, "complete_reviewer_approved_measurement_plan");
  assert.ok(contract.gap_list.includes("missing_selected_metric_id"));
  assert.ok(contract.gap_list.includes("missing_selected_metric_family"));
  assert.equal(contract.gap_list.includes("selected_metric_id_mismatch"), false);
});

test("validation rejects evidence, connector, persistence, and Bayesian side doors", () => {
  const forged = validContract();
  forged.creates_evidence = true;
  forged.diagnostics_evidence_satisfied = true;
  forged.comparison_design_adequacy_satisfied = true;
  forged.aggregate_data_observed = true;
  forged.evidence_assessment_ready = true;
  forged.measurement_spec_is_bayesian_readiness = true;
  forged.promotion_authorized = true;
  forged.blocked_outputs.live_connector_execution = true;
  forged.blocked_outputs.persistence_write = true;
  forged.feeds.bayesian_promotion_decision_gate = true;
  forged.allowed_next_step = "bayesian_promotion_decision_gate_only";

  const validation = validateReviewerApprovedMeasurementPlanContract(forged, {
    sourceRecommendationPlan: recommendationPlan()
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.includes("creates_evidence must be false"));
  assert.ok(validation.gaps.includes("diagnostics_evidence_satisfied must be false"));
  assert.ok(validation.gaps.includes("comparison_design_adequacy_satisfied must be false"));
  assert.ok(validation.gaps.includes("aggregate_data_observed must be false"));
  assert.ok(validation.gaps.includes("evidence_assessment_ready must be false"));
  assert.ok(validation.gaps.includes("measurement_spec_is_bayesian_readiness must be false"));
  assert.ok(validation.gaps.includes("promotion_authorized must be false"));
  assert.ok(validation.gaps.includes("blocked_outputs.live_connector_execution must be present and false"));
  assert.ok(validation.gaps.includes("blocked_outputs.persistence_write must be present and false"));
  assert.ok(validation.gaps.includes("feeds.bayesian_promotion_decision_gate must be present and false"));
  assert.ok(validation.gaps.includes("ready contract allowed_next_step is invalid"));
});

test("validation rejects recomputed nested boundary side doors", () => {
  const forged = validContract();
  forged.approved_baseline_and_comparison.baseline_and_comparison_are_observed_data = true;
  forged.approved_milestone_schedule.creates_measurement_cell_evidence = true;
  forged.measurement_spec_metric_spec_internal_contract.not_bayesian_artifact = false;
  forged.measurement_spec_metric_spec_internal_contract.not_evidence_by_itself = false;
  forged.data_collection_planning.live_connector_execution_authorized = true;
  forged.data_collection_planning.raw_rows_authorized = true;
  forged.data_collection_planning.person_level_data_authorized = true;
  rehash(forged);

  const validation = validateReviewerApprovedMeasurementPlanContract(forged, {
    sourceRecommendationPlan: recommendationPlan()
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.includes(
      "approved_baseline_and_comparison.baseline_and_comparison_are_observed_data must be false"
    )
  );
  assert.ok(validation.gaps.includes("approved_milestone_schedule.creates_measurement_cell_evidence must be false"));
  assert.ok(validation.gaps.includes("measurement_spec_metric_spec_internal_contract.not_bayesian_artifact must be true"));
  assert.ok(validation.gaps.includes("measurement_spec_metric_spec_internal_contract.not_evidence_by_itself must be true"));
  assert.ok(validation.gaps.includes("data_collection_planning.live_connector_execution_authorized must be false"));
  assert.ok(validation.gaps.includes("data_collection_planning.raw_rows_authorized must be false"));
  assert.ok(validation.gaps.includes("data_collection_planning.person_level_data_authorized must be false"));
});

test("validation rejects ready contract with missing approval refs even when hash is recomputed", () => {
  const forged = validContract();
  forged.reviewer_approved_measurement_plan_ref = null;
  forged.reviewer_decision_ref = null;
  forged.review_roles.approval_state = null;
  forged.review_roles.approval_role_ref = null;
  rehash(forged);

  const validation = validateReviewerApprovedMeasurementPlanContract(forged, {
    sourceRecommendationPlan: recommendationPlan()
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.includes("ready contract requires reviewer_approved_measurement_plan_ref"));
  assert.ok(validation.gaps.includes("ready contract requires reviewer_decision_ref"));
  assert.ok(validation.gaps.includes("ready contract requires review_roles.approval_role_ref"));
  assert.ok(validation.gaps.includes("ready contract requires approved review_roles.approval_state"));
});

test("validation rejects recomputed ready contract with held suppression precheck", () => {
  const forged = validContract();
  forged.approved_scope.suppression_missing_held_precheck_posture =
    "HOLD_FOR_SUPPRESSED_MISSING_HELD_WINDOW_REVIEW";
  rehash(forged);

  const validation = validateReviewerApprovedMeasurementPlanContract(forged, {
    sourceRecommendationPlan: recommendationPlan()
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.includes(
      "ready contract requires approved_scope.suppression_missing_held_precheck_posture CLEAR"
    )
  );
});

test("validation rejects held contract that unlocks data collection planning", () => {
  const forged = validContract({
    approval_state: "DRAFT_INTAKE_PREPARED_REVIEW_REQUIRED"
  });
  forged.data_collection_readiness_state = "READY_FOR_AGGREGATE_DATA_COLLECTION_PLANNING_ONLY";
  forged.allowed_next_step = "aggregate_data_collection_planning_only";
  forged.data_collection_planning.aggregate_only_future_collection_posture = true;
  rehash(forged);

  const validation = validateReviewerApprovedMeasurementPlanContract(forged, {
    sourceRecommendationPlan: recommendationPlan()
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.includes("held contract data_collection_readiness_state must remain held"));
  assert.ok(validation.gaps.includes("held contract allowed_next_step is invalid"));
  assert.ok(
    validation.gaps.includes(
      "held contract aggregate_only_future_collection_posture must be false"
    )
  );
});

test("validation rejects unsafe emitted values in recomputed forged contracts", () => {
  const forged = validContract();
  forged.reviewer_approved_measurement_plan_ref = "reviewer_plan.james@example.com";
  forged.approved_baseline_and_comparison.baseline_value_source_ref =
    "select * from users where employee_id = 123";
  rehash(forged);

  const validation = validateReviewerApprovedMeasurementPlanContract(forged, {
    sourceRecommendationPlan: recommendationPlan()
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.some((gap) => gap.startsWith("unsafe_contract_value")));
});

test("validation rejects recomputed source hash forgeries", () => {
  const forged = validContract();
  forged.source_recommendation_plan_hash = "forged_source_plan_hash";
  forged.source_candidate_metric_recommendation_hash = "forged_candidate_hash";
  rehash(forged);

  const validation = validateReviewerApprovedMeasurementPlanContract(forged, {
    sourceRecommendationPlan: recommendationPlan()
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.includes("source_recommendation_plan_hash mismatch"));
  assert.ok(validation.gaps.includes("source_candidate_metric_recommendation_hash mismatch"));
});

test("validation requires every blocked output and feed key to exist", () => {
  const forged = validContract();
  delete forged.blocked_outputs.persistence_write;
  delete forged.feeds.bayesian_promotion_decision_gate;
  rehash(forged);

  const validation = validateReviewerApprovedMeasurementPlanContract(forged, {
    sourceRecommendationPlan: recommendationPlan()
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.includes("blocked_outputs.persistence_write must be present and false"));
  assert.ok(validation.gaps.includes("feeds.bayesian_promotion_decision_gate must be present and false"));
});

test("validation rejects forged Blueprint lineage refs despite valid source hashes", () => {
  const forged = validContract();
  forged.source_recommendation_plan_ref = "blueprint_hypothesis.other_workflow.2026_06";
  forged.source_blueprint_hypothesis_ref = "blueprint_hypothesis.other_workflow.2026_06";
  forged.approved_selected_metric.source_candidate_metric_recommendation_ref =
    "hypothesis_metric_recommendation.blueprint_hypothesis.other_workflow.2026_06.support_median_resolution_hours";
  rehash(forged);

  const validation = validateReviewerApprovedMeasurementPlanContract(forged, {
    sourceRecommendationPlan: recommendationPlan()
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.includes("source_recommendation_plan_ref must match sourceRecommendationPlan blueprint_hypothesis_ref"));
  assert.ok(validation.gaps.includes("source_blueprint_hypothesis_ref must match sourceRecommendationPlan blueprint_hypothesis_ref"));
  assert.ok(
    validation.gaps.includes(
      "approved_selected_metric.source_candidate_metric_recommendation_ref must match source_candidate_metric_recommendation_ref"
    )
  );
});

test("ready validation requires sourceRecommendationPlan", () => {
  const contract = validContract();
  const validation = validateReviewerApprovedMeasurementPlanContract(contract);

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.includes("ready contract validation requires sourceRecommendationPlan"));
});
