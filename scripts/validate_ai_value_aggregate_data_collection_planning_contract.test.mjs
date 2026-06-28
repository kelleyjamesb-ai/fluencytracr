import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

import {
  buildAggregateDataCollectionPlanningContract,
  validateAggregateDataCollectionPlanningContract
} from "./run_ai_value_aggregate_data_collection_planning_contract.mjs";
import {
  buildReviewerApprovedMeasurementPlanContract
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

function collectionPlan(overrides = {}) {
  const source = approvedMeasurementPlan();
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

function validContract(overrides = {}) {
  return buildAggregateDataCollectionPlanningContract({
    sourceReviewerApprovedMeasurementPlan: approvedMeasurementPlan(),
    sourceRecommendationPlan: recommendationPlan(),
    aggregateDataCollectionPlan: collectionPlan(overrides)
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

test("valid aggregate data collection plan unlocks only comparison-design source package preparation", () => {
  const source = approvedMeasurementPlan();
  const contract = buildAggregateDataCollectionPlanningContract({
    sourceReviewerApprovedMeasurementPlan: source,
    sourceRecommendationPlan: recommendationPlan(),
    aggregateDataCollectionPlan: collectionPlan()
  });
  const validation = validateAggregateDataCollectionPlanningContract(contract, {
    sourceReviewerApprovedMeasurementPlan: source,
    sourceRecommendationPlan: recommendationPlan()
  });

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(
    contract.contract_state,
    "AGGREGATE_DATA_COLLECTION_PLANNING_READY_FOR_COMPARISON_DESIGN_SOURCE_PACKAGE_PREPARATION"
  );
  assert.equal(contract.allowed_next_step, "prepare_comparison_design_source_package_only");
  assert.equal(contract.aggregate_data_collection_planning_ready, true);
  assert.equal(contract.aggregate_data_observed, false);
  assert.equal(contract.creates_evidence, false);
  assert.equal(contract.evidence_assessment_ready, false);
  assert.equal(contract.comparison_design_adequacy_satisfied, false);
  assert.equal(contract.diagnostics_evidence_satisfied, false);
  assert.equal(contract.promotion_authorized, false);
});

test("default path without approved measurement plan fails closed", () => {
  const contract = buildAggregateDataCollectionPlanningContract();

  assert.equal(contract.contract_state, "HELD_FOR_REVIEWER_APPROVED_MEASUREMENT_PLAN");
  assert.equal(contract.allowed_next_step, "complete_reviewer_approved_measurement_plan");
  assert.equal(contract.aggregate_data_collection_planning_ready, false);
  assert.ok(contract.gap_list.includes("missing_source_reviewer_approved_measurement_plan"));
});

test("missing aggregate collection plan holds after approved measurement plan", () => {
  const source = approvedMeasurementPlan();
  const contract = buildAggregateDataCollectionPlanningContract({
    sourceReviewerApprovedMeasurementPlan: source,
    sourceRecommendationPlan: recommendationPlan()
  });

  assert.equal(contract.contract_state, "HELD_FOR_AGGREGATE_DATA_COLLECTION_PLANNING");
  assert.equal(contract.allowed_next_step, "complete_aggregate_data_collection_planning");
  assert.equal(contract.aggregate_data_collection_planning_ready, false);
  assert.ok(contract.gap_list.includes("missing_aggregate_data_collection_plan_ref"));
});

test("collection plan must bind to source reviewer-approved measurement plan", () => {
  const contract = validContract({
    source_reviewer_approved_measurement_plan_ref:
      "reviewer_approved_measurement_plan.other.2026_06"
  });

  assert.equal(contract.contract_state, "HELD_FOR_AGGREGATE_DATA_COLLECTION_PLANNING");
  assert.equal(contract.aggregate_data_collection_planning_ready, false);
  assert.ok(contract.gap_list.includes("source_reviewer_approved_measurement_plan_ref_mismatch"));
});

test("planned collection windows require T0/T30/T60/T90/T120/T180/T270/T365", () => {
  const contract = validContract({
    planned_collection_window_refs: collectionWindowRefs({ T365_12_month: "" })
  });

  assert.equal(contract.contract_state, "HELD_FOR_AGGREGATE_MILESTONE_COLLECTION_PLAN");
  assert.equal(contract.aggregate_data_collection_planning_ready, false);
  assert.ok(contract.gap_list.includes("missing_planned_collection_window_ref:T365_12_month"));
});

test("stale suppressed held or misaligned collection windows fail closed", () => {
  const contract = validContract({
    planned_collection_window_refs: collectionWindowRefs({
      T30: "planned_collection_window.customer_support.case_resolution.stale",
      T60: "planned_collection_window.customer_support.case_resolution.suppressed",
      T90: "planned_collection_window.customer_support.case_resolution.held",
      T120: "planned_collection_window.customer_support.case_resolution.misaligned"
    })
  });

  assert.equal(contract.contract_state, "HELD_FOR_AGGREGATE_MILESTONE_COLLECTION_PLAN");
  assert.ok(contract.gap_list.includes("non_ready_planned_collection_window_ref:T30"));
  assert.ok(contract.gap_list.includes("non_ready_planned_collection_window_ref:T60"));
  assert.ok(contract.gap_list.includes("non_ready_planned_collection_window_ref:T90"));
  assert.ok(contract.gap_list.includes("non_ready_planned_collection_window_ref:T120"));
});

test("unsafe plan values and live connector posture fail closed and are not emitted", () => {
  const contract = validContract({
    aggregate_export_manifest_plan_ref: "select * from users where employee_id = 123",
    source_system_posture_ref: "live_connector_execution.bigquery",
    privacy_boundary_attestation_ref: "person_level identifier posture",
    raw_data_exclusion_attestation_ref: "raw_rows prompt:=secret transcript:=call"
  });
  const serialized = JSON.stringify(contract).toLowerCase();

  assert.equal(contract.contract_state, "HELD_FOR_AGGREGATE_DATA_COLLECTION_PLANNING");
  assert.ok(contract.gap_list.includes("unsafe_aggregate_export_manifest_plan_ref"));
  assert.ok(contract.gap_list.includes("unsafe_source_system_posture_ref"));
  assert.ok(contract.gap_list.includes("unsafe_privacy_boundary_attestation_ref"));
  assert.ok(contract.gap_list.includes("unsafe_raw_data_exclusion_attestation_ref"));
  assert.equal(serialized.includes("select * from users"), false);
  assert.equal(serialized.includes("employee_id"), false);
  assert.equal(serialized.includes("prompt:=secret"), false);
  assert.equal(serialized.includes("transcript:=call"), false);
});

test("validation rejects recomputed source measurement plan hash forgeries", () => {
  const source = approvedMeasurementPlan();
  const forged = buildAggregateDataCollectionPlanningContract({
    sourceReviewerApprovedMeasurementPlan: source,
    sourceRecommendationPlan: recommendationPlan(),
    aggregateDataCollectionPlan: collectionPlan()
  });
  forged.source_reviewer_approved_measurement_plan_hash = "forged_source_hash";
  rehash(forged);

  const validation = validateAggregateDataCollectionPlanningContract(forged, {
    sourceReviewerApprovedMeasurementPlan: source,
    sourceRecommendationPlan: recommendationPlan()
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.includes("source_reviewer_approved_measurement_plan_hash mismatch"));
});

test("validation rejects nested side doors even when contract hash is recomputed", () => {
  const source = approvedMeasurementPlan();
  const forged = buildAggregateDataCollectionPlanningContract({
    sourceReviewerApprovedMeasurementPlan: source,
    sourceRecommendationPlan: recommendationPlan(),
    aggregateDataCollectionPlan: collectionPlan()
  });
  forged.aggregate_data_collection_plan_is_observed_data = true;
  forged.aggregate_data_observed = true;
  forged.creates_evidence = true;
  forged.evidence_assessment_ready = true;
  forged.future_collection_authorizations.live_connector_execution_authorized = true;
  forged.future_collection_authorizations.raw_rows_authorized = true;
  forged.future_collection_authorizations.person_level_data_authorized = true;
  forged.feeds.governed_diagnostics_sufficiency_evidence_source = true;
  forged.blocked_outputs.persistence_write = true;
  rehash(forged);

  const validation = validateAggregateDataCollectionPlanningContract(forged, {
    sourceReviewerApprovedMeasurementPlan: source,
    sourceRecommendationPlan: recommendationPlan()
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.includes("aggregate_data_collection_plan_is_observed_data must be false"));
  assert.ok(validation.gaps.includes("aggregate_data_observed must be false"));
  assert.ok(validation.gaps.includes("creates_evidence must be false"));
  assert.ok(validation.gaps.includes("evidence_assessment_ready must be false"));
  assert.ok(validation.gaps.includes("future_collection_authorizations.live_connector_execution_authorized must be false"));
  assert.ok(validation.gaps.includes("future_collection_authorizations.raw_rows_authorized must be false"));
  assert.ok(validation.gaps.includes("future_collection_authorizations.person_level_data_authorized must be false"));
  assert.ok(validation.gaps.includes("feeds.governed_diagnostics_sufficiency_evidence_source must be present and false"));
  assert.ok(validation.gaps.includes("blocked_outputs.persistence_write must be present and false"));
});

test("ready validation requires source reviewer-approved measurement plan", () => {
  const contract = validContract();
  const validation = validateAggregateDataCollectionPlanningContract(contract);

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.includes("ready contract validation requires sourceReviewerApprovedMeasurementPlan"));
});

test("ready validation rejects missing collection-plan bindings even when rehashed", () => {
  const source = approvedMeasurementPlan();
  const contract = validContract();
  contract.aggregate_data_collection_plan_ref = null;
  contract.collection_owner_role_ref = null;
  contract.aggregate_source_posture_ref = null;
  contract.source_system_posture_ref = null;
  contract.aggregate_export_manifest_plan_ref = null;
  contract.measurement_cell_binding_plan_ref = null;
  contract.collection_review.privacy_boundary_attestation_ref = null;
  contract.collection_review.raw_data_exclusion_attestation_ref = null;
  contract.collection_review.live_connector_exclusion_attestation_ref = null;
  contract.collection_review.reviewer_decision_ref = null;
  rehash(contract);

  const validation = validateAggregateDataCollectionPlanningContract(contract, {
    sourceReviewerApprovedMeasurementPlan: source,
    sourceRecommendationPlan: recommendationPlan()
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.includes("ready contract missing aggregate_data_collection_plan_ref"));
  assert.ok(validation.gaps.includes("ready contract missing collection_owner_role_ref"));
  assert.ok(validation.gaps.includes("ready contract missing aggregate_export_manifest_plan_ref"));
  assert.ok(validation.gaps.includes("ready contract missing collection_review.privacy_boundary_attestation_ref"));
  assert.ok(validation.gaps.includes("ready contract missing collection_review.reviewer_decision_ref"));
});

test("validation rejects source measurement-plan projection forgeries", () => {
  const source = approvedMeasurementPlan();
  const contract = validContract();
  contract.source_measurement_plan_projection.selected_metric_family = "forged_metric_family";
  contract.source_measurement_plan_projection.expected_movement_direction = "increase";
  contract.source_measurement_plan_projection.expected_lag_definition = "forged_lag";
  contract.source_measurement_plan_projection.baseline_value_source_ref = "forged_baseline";
  contract.source_measurement_plan_projection.comparison_condition_ref = "forged_comparison";
  contract.source_measurement_plan_projection.cohort_identity = "forged_cohort";
  contract.source_measurement_plan_projection.workflow_function_identity = "forged_workflow";
  rehash(contract);

  const validation = validateAggregateDataCollectionPlanningContract(contract, {
    sourceReviewerApprovedMeasurementPlan: source,
    sourceRecommendationPlan: recommendationPlan()
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.includes(
      "source_measurement_plan_projection.selected_metric_family must match source reviewer-approved measurement plan"
    )
  );
  assert.ok(
    validation.gaps.includes(
      "source_measurement_plan_projection.expected_movement_direction must match source reviewer-approved measurement plan"
    )
  );
  assert.ok(
    validation.gaps.includes(
      "source_measurement_plan_projection.expected_lag_definition must match source reviewer-approved measurement plan"
    )
  );
  assert.ok(
    validation.gaps.includes(
      "source_measurement_plan_projection.baseline_value_source_ref must match source reviewer-approved measurement plan"
    )
  );
  assert.ok(
    validation.gaps.includes(
      "source_measurement_plan_projection.comparison_condition_ref must match source reviewer-approved measurement plan"
    )
  );
  assert.ok(
    validation.gaps.includes(
      "source_measurement_plan_projection.cohort_identity must match source reviewer-approved measurement plan"
    )
  );
  assert.ok(
    validation.gaps.includes(
      "source_measurement_plan_projection.workflow_function_identity must match source reviewer-approved measurement plan"
    )
  );
});

test("validation rejects unsafe or non-reviewed projection and plan provenance after rehash", () => {
  const source = approvedMeasurementPlan();
  const contract = validContract();
  contract.source_measurement_plan_projection.baseline_value_source_ref =
    "select * from users where employee_id = 123";
  contract.planned_collection_schedule.planned_collection_window_refs.T30 =
    "planned_collection_window.fixture";
  contract.collection_review.reviewer_decision_ref = "reviewer_decision.pending";
  rehash(contract);

  const validation = validateAggregateDataCollectionPlanningContract(contract, {
    sourceReviewerApprovedMeasurementPlan: source,
    sourceRecommendationPlan: recommendationPlan()
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.includes(
      "unsafe_contract_value:contract.source_measurement_plan_projection.baseline_value_source_ref"
    )
  );
  assert.ok(validation.gaps.includes("non_reviewed_contract_value:contract.collection_review.reviewer_decision_ref"));
  assert.ok(
    validation.gaps.includes(
      "non_reviewed_contract_value:contract.planned_collection_schedule.planned_collection_window_refs.T30"
    )
  );
});

test("validation rejects extra top-level side-door fields after rehash", () => {
  const source = approvedMeasurementPlan();
  const contract = validContract();
  contract.live_connector_execution_authorized = true;
  contract.schema_created = true;
  contract.persistence_write_authorized = true;
  contract.export_authorized = true;
  rehash(contract);

  const validation = validateAggregateDataCollectionPlanningContract(contract, {
    sourceReviewerApprovedMeasurementPlan: source,
    sourceRecommendationPlan: recommendationPlan()
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.includes("forbidden_extra_field:live_connector_execution_authorized"));
  assert.ok(validation.gaps.includes("forbidden_extra_field:schema_created"));
  assert.ok(validation.gaps.includes("forbidden_extra_field:persistence_write_authorized"));
  assert.ok(validation.gaps.includes("forbidden_extra_field:export_authorized"));
});

test("validation rejects unknown held states and mismatched held next steps", () => {
  const unknownHeld = validContract();
  unknownHeld.contract_state = "HELD_FOR_UNKNOWN_DOWNSTREAM_GATE";
  unknownHeld.aggregate_data_collection_planning_ready = false;
  unknownHeld.planned_collection_schedule.schedule_ready = false;
  unknownHeld.future_collection_authorizations.aggregate_future_collection_planning_only = false;
  unknownHeld.allowed_next_step = "complete_governed_diagnostics_sufficiency_evidence_source";
  rehash(unknownHeld);

  const unknownValidation = validateAggregateDataCollectionPlanningContract(unknownHeld, {
    sourceReviewerApprovedMeasurementPlan: approvedMeasurementPlan(),
    sourceRecommendationPlan: recommendationPlan()
  });

  assert.equal(unknownValidation.valid, false);
  assert.ok(unknownValidation.gaps.includes("contract_state is invalid"));

  const mismatchedNextStep = validContract();
  mismatchedNextStep.contract_state = "HELD_FOR_AGGREGATE_DATA_COLLECTION_PLANNING";
  mismatchedNextStep.aggregate_data_collection_planning_ready = false;
  mismatchedNextStep.planned_collection_schedule.schedule_ready = false;
  mismatchedNextStep.future_collection_authorizations.aggregate_future_collection_planning_only = false;
  mismatchedNextStep.allowed_next_step = "complete_governed_diagnostics_sufficiency_evidence_source";
  rehash(mismatchedNextStep);

  const nextStepValidation = validateAggregateDataCollectionPlanningContract(mismatchedNextStep, {
    sourceReviewerApprovedMeasurementPlan: approvedMeasurementPlan(),
    sourceRecommendationPlan: recommendationPlan()
  });

  assert.equal(nextStepValidation.valid, false);
  assert.ok(
    nextStepValidation.gaps.includes(
      "held contract allowed_next_step must match complete_aggregate_data_collection_planning"
    )
  );
});
