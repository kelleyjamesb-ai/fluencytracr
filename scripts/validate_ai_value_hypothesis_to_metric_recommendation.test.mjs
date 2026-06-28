import assert from "node:assert/strict";
import test from "node:test";

import {
  REQUIRED_MILESTONE_SCHEDULE,
  buildHypothesisToMetricRecommendationPlan,
  validateHypothesisToMetricRecommendationPlan
} from "./run_ai_value_hypothesis_to_metric_recommendation.mjs";

const metricLibraryRefs = [
  "docs/contracts/ai-value-intelligence/examples/customer-support-metrics-library.json",
  "docs/contracts/ai-value-intelligence/examples/customer-success-50-synthetic-metrics-library.json",
  "docs/contracts/ai-value-intelligence/examples/sales-pipeline-metrics-library.json"
];

function baseInput(overrides = {}) {
  return {
    blueprint_hypothesis_ref: "blueprint_hypothesis.customer_support.case_resolution.2026_06",
    blueprint_hypothesis_statement:
      "Improve support case resolution capacity while keeping escalation and quality posture governed.",
    value_route: "CAPACITY_CREATION",
    workflow_function_scope: "customer_support_case_resolution",
    cohort_scope: "eligible_support_cases_aggregate",
    metric_library_refs: [metricLibraryRefs[0]],
    ...overrides
  };
}

function validPlan(overrides = {}) {
  return buildHypothesisToMetricRecommendationPlan(baseInput(overrides));
}

test("missing hypothesis fails closed", () => {
  const plan = buildHypothesisToMetricRecommendationPlan(
    baseInput({
      blueprint_hypothesis_ref: "",
      blueprint_hypothesis_statement: ""
    })
  );

  assert.equal(plan.planning_state, "HOLD_FOR_BLUEPRINT_HYPOTHESIS");
  assert.equal(plan.recommendation_state, "HELD_NOT_RECOMMENDED");
  assert.equal(plan.feeds.comparison_design_source_package_intake, false);
  assert.equal(plan.promotion_authorized, false);
  assert.ok(plan.evidence_gap_list.includes("missing_blueprint_hypothesis_ref"));
  assert.ok(plan.evidence_gap_list.includes("missing_blueprint_hypothesis_statement"));
});

test("ambiguous hypothesis fails closed", () => {
  const plan = buildHypothesisToMetricRecommendationPlan(
    baseInput({
      blueprint_hypothesis_statement: "Make things better somehow."
    })
  );

  assert.equal(plan.planning_state, "HOLD_FOR_AMBIGUOUS_BLUEPRINT_HYPOTHESIS");
  assert.equal(plan.recommendation_state, "HELD_NOT_RECOMMENDED");
  assert.ok(plan.evidence_gap_list.includes("ambiguous_blueprint_hypothesis_statement"));
});

test("unsupported value route fails closed", () => {
  const plan = buildHypothesisToMetricRecommendationPlan(
    baseInput({
      value_route: "PRODUCTIVITY_SCORE"
    })
  );

  assert.equal(plan.planning_state, "HOLD_FOR_UNSUPPORTED_VALUE_ROUTE");
  assert.equal(plan.recommendation_state, "HELD_NOT_RECOMMENDED");
  assert.ok(plan.evidence_gap_list.includes("unsupported_value_route"));
  assert.deepEqual(plan.candidate_metric_recommendations, []);
});

test("metric recommendations require metric library refs", () => {
  const plan = buildHypothesisToMetricRecommendationPlan(
    baseInput({
      metric_library_refs: []
    })
  );

  assert.equal(plan.planning_state, "HOLD_FOR_METRIC_LIBRARY_REFS");
  assert.equal(plan.recommendation_state, "HELD_NOT_RECOMMENDED");
  assert.ok(plan.evidence_gap_list.includes("missing_metric_library_refs"));
  assert.deepEqual(plan.candidate_metric_recommendations, []);
});

test("fabricated ready recommendations with non-allowlisted refs fail validation", () => {
  const forged = validPlan();
  forged.candidate_metric_recommendations[0] = {
    ...forged.candidate_metric_recommendations[0],
    source_metric_library_ref: "docs/contracts/ai-value-intelligence/examples/not-reviewed.json"
  };

  const validation = validateHypothesisToMetricRecommendationPlan(forged);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.includes(
      "candidate_metric_recommendations require allowlisted source_metric_library_ref"
    )
  );
});

test("source-ref-only validation rejects inlined hypothesis statements and metric names", () => {
  const forged = validPlan();
  forged.blueprint_hypothesis_statement = "Inline statement should not be emitted.";
  forged.candidate_metric_recommendations[0].candidate_metric_name = "Inline metric name";

  const validation = validateHypothesisToMetricRecommendationPlan(forged);

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.includes("plan must be source-ref-only and omit blueprint_hypothesis_statement"));
  assert.ok(
    validation.gaps.includes(
      "candidate_metric_recommendations must be source-ref-only and omit candidate_metric_name"
    )
  );
});

test("unsafe raw or person-level input is not emitted in held or ready plans", () => {
  const held = buildHypothesisToMetricRecommendationPlan(
    baseInput({
      blueprint_hypothesis_ref: "blueprint_hypothesis.james@example.com",
      value_route: "PRODUCTIVITY_SCORE",
      workflow_function_scope: "prompt:= summarize transcript",
      cohort_scope: "employee_id=123",
      metric_library_refs: [
        "docs/contracts/ai-value-intelligence/examples/customer-support-metrics-library.json",
        "query_text SELECT * FROM users WHERE email='james@example.com'"
      ],
      expected_lag_definition: "ROI finance confidence output ready at T180"
    })
  );
  const ready = validPlan({
    expected_lag_definition: "prompt: summarize this transcript for james@example.com"
  });
  const heldSerialized = JSON.stringify(held).toLowerCase();
  const readySerialized = JSON.stringify(ready).toLowerCase();

  const heldValidation = validateHypothesisToMetricRecommendationPlan(held);
  const readyValidation = validateHypothesisToMetricRecommendationPlan(ready);

  assert.equal(heldValidation.valid, true, heldValidation.gaps.join("; "));
  assert.equal(readyValidation.valid, true, readyValidation.gaps.join("; "));
  for (const serialized of [heldSerialized, readySerialized]) {
    assert.equal(serialized.includes("james@example.com"), false);
    assert.equal(serialized.includes("prompt:="), false);
    assert.equal(serialized.includes("transcript for"), false);
    assert.equal(serialized.includes("select * from users"), false);
    assert.equal(serialized.includes("employee_id"), false);
    assert.equal(serialized.includes("roi finance"), false);
    assert.equal(serialized.includes("confidence output"), false);
  }
  assert.equal(
    ready.expectation_path_derivation.expected_lag_definition,
    "REQUIRES_REVIEWER_APPROVAL_FROM_EXPECTATION_PATH"
  );
});

test("validation rejects forged downstream next steps and Bayesian chain advancement", () => {
  const forged = validPlan();
  forged.allowed_next_step = "posterior_interpretation_specification_gate_only";
  forged.local_planning_next_action = "advance_bayesian_chain";
  forged.bayesian_chain_state = {
    current_state: "BAYESIAN_PROMOTION_DECISION_PASSED_FOR_INTERNAL_EXECUTION_ARTIFACT_ONLY",
    allowed_next_step: "internal_bayesian_execution_artifact_v1_only",
    changed_by_this_plan: true
  };

  const validation = validateHypothesisToMetricRecommendationPlan(forged);

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.includes("ready planning allowed_next_step is invalid"));
  assert.ok(validation.gaps.includes("ready planning local_planning_next_action is invalid"));
  assert.ok(validation.gaps.includes("bayesian_chain_state.current_state must remain held"));
  assert.ok(
    validation.gaps.includes(
      "bayesian_chain_state.allowed_next_step must remain governed diagnostics source completion"
    )
  );
  assert.ok(validation.gaps.includes("bayesian_chain_state.changed_by_this_plan must be false"));
});

test("validation rejects populated selected metric approval fields", () => {
  const forged = validPlan();
  forged.required_reviewer_approval_fields = {
    ...forged.required_reviewer_approval_fields,
    approved_metric_selection_ref: "approved_metric_selection.fake",
    selected_metric_id: "support_median_resolution_hours",
    selected_metric_family: "workflow_cycle_context",
    selected_measurement_unit: "hours",
    metric_owner_role_ref: "support_ops_lead",
    baseline_value_source_ref: "baseline.fake",
    comparison_condition_ref: "comparison.fake",
    milestone_schedule_ref: "schedule.fake",
    approval_role_ref: "reviewer.fake"
  };

  const validation = validateHypothesisToMetricRecommendationPlan(forged);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.includes(
      "required_reviewer_approval_fields.approved_metric_selection_ref must remain null"
    )
  );
  assert.ok(
    validation.gaps.includes("required_reviewer_approval_fields.selected_metric_id must remain null")
  );
  assert.ok(
    validation.gaps.includes("required_reviewer_approval_fields.approval_role_ref must remain null")
  );
});

test("validation rejects candidate metric ids that are not present in the source metric library", () => {
  const forged = validPlan();
  forged.candidate_metric_recommendations[0] = {
    ...forged.candidate_metric_recommendations[0],
    candidate_metric_id: "fabricated_metric_id"
  };

  const validation = validateHypothesisToMetricRecommendationPlan(forged);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.includes(
      "candidate_metric_recommendations require candidate_metric_id present in source metric library"
    )
  );
});

test("validation rejects missing blocked claims", () => {
  const forged = validPlan();
  forged.blocked_claims = [];
  forged.candidate_metric_recommendations[0].blocked_claims = [];

  const validation = validateHypothesisToMetricRecommendationPlan(forged);

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.includes("blocked_claims must include every required blocked claim"));
  assert.ok(
    validation.gaps.includes(
      "candidate_metric_recommendations blocked_claims must include every required blocked claim"
    )
  );
});

test("recommendations are planning-only and do not create evidence or selected metric approval", () => {
  const plan = validPlan();
  const validation = validateHypothesisToMetricRecommendationPlan(plan);

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(plan.planning_state, "CANDIDATE_METRIC_FAMILIES_DRAFTED_NOT_SELECTED_NOT_EVIDENCE");
  assert.equal(plan.recommendation_state, "CANDIDATE_RECOMMENDATIONS_ONLY_NOT_EVIDENCE");
  assert.ok(plan.candidate_metric_recommendations.length > 0);
  assert.equal(Object.hasOwn(plan, "blueprint_hypothesis_statement"), false);
  assert.equal(
    plan.candidate_metric_recommendations.some((recommendation) =>
      Object.hasOwn(recommendation, "candidate_metric_name")
    ),
    false
  );
  assert.equal(plan.creates_evidence, false);
  assert.equal(plan.diagnostics_evidence_satisfied, false);
  assert.equal(plan.selected_metric_approved, false);
  assert.equal(plan.required_reviewer_approval_fields.approval_state, "HOLD_FOR_REVIEW");
  assert.equal(plan.local_planning_next_action, "prepare_reviewer_metric_selection_draft_only");
  assert.equal(plan.allowed_next_step, "ai_contribution_evidence_alignment_reporting_data_model_only");
  assert.equal(plan.feeds.comparison_design_adequacy_evidence_review, false);
  assert.equal(plan.feeds.governed_diagnostics_sufficiency_evidence_source, false);
  assert.equal(plan.promotion_authorized, false);
});

test("selected metric requires explicit reviewer approval fields", () => {
  const plan = validPlan();

  assert.deepEqual(
    Object.keys(plan.required_reviewer_approval_fields),
    [
      "approved_metric_selection_ref",
      "source_blueprint_hypothesis_ref",
      "selected_metric_id",
      "selected_metric_family",
      "selected_measurement_unit",
      "metric_owner_role_ref",
      "expected_movement_direction",
      "expected_lag_definition",
      "baseline_value_source_ref",
      "comparison_condition_ref",
      "milestone_schedule_ref",
      "approval_state",
      "approval_role_ref"
    ]
  );
  assert.equal(plan.required_reviewer_approval_fields.approved_metric_selection_ref, null);
  assert.equal(plan.required_reviewer_approval_fields.approval_role_ref, null);
});

test("direction and lag are derived from the approved hypothesis and expectation path", () => {
  const plan = validPlan({
    expected_movement_direction: "decrease",
    expected_lag_definition: "first reviewed at T60 after enablement rollout"
  });

  assert.equal(plan.expectation_path_derivation.source_blueprint_hypothesis_ref, plan.blueprint_hypothesis_ref);
  assert.equal(plan.expectation_path_derivation.expected_movement_direction, "REQUIRES_REVIEWER_APPROVAL_FROM_EXPECTATION_PATH");
  assert.equal(plan.expectation_path_derivation.expected_lag_definition, "REQUIRES_REVIEWER_APPROVAL_FROM_EXPECTATION_PATH");
  assert.equal(plan.expectation_path_derivation.derivation_state, "REQUIRES_REVIEWER_APPROVAL_FROM_EXPECTATION_PATH");
  assert.equal(plan.required_reviewer_approval_fields.expected_movement_direction, "REQUIRES_REVIEWER_APPROVAL_FROM_EXPECTATION_PATH");
  assert.equal(plan.required_reviewer_approval_fields.expected_lag_definition, "REQUIRES_REVIEWER_APPROVAL_FROM_EXPECTATION_PATH");
});

test("milestone schedule includes T0/T30/T60/T90/T120/T180/T270/T365", () => {
  const plan = validPlan();

  assert.deepEqual(REQUIRED_MILESTONE_SCHEDULE, [
    "T0_baseline",
    "T30",
    "T60",
    "T90",
    "T120",
    "T180_6_month",
    "T270_9_month",
    "T365_12_month"
  ]);
  assert.deepEqual(plan.required_milestone_schedule.required_milestones, REQUIRED_MILESTONE_SCHEDULE);
  assert.equal(plan.required_milestone_schedule.schedule_state, "REQUIRES_REVIEWER_APPROVAL");
});

test("blocked outputs and unsafe content remain blocked", () => {
  const plan = validPlan();
  const serialized = JSON.stringify(plan).toLowerCase();

  assert.equal(plan.blocked_outputs.confidence_output, false);
  assert.equal(plan.blocked_outputs.probability_output, false);
  assert.equal(plan.blocked_outputs.roi_output, false);
  assert.equal(plan.blocked_outputs.finance_output, false);
  assert.equal(plan.blocked_outputs.causality_output, false);
  assert.equal(plan.blocked_outputs.productivity_output, false);
  assert.equal(plan.blocked_outputs.customer_facing_economic_output, false);
  assert.equal(plan.blocked_outputs.raw_rows, false);
  assert.equal(plan.blocked_outputs.identifiers, false);
  assert.equal(plan.blocked_outputs.prompts, false);
  assert.equal(plan.blocked_outputs.transcripts, false);
  assert.equal(plan.blocked_outputs.person_level_data, false);
  assert.equal(serialized.includes("confidence_percentage"), false);
  assert.equal(serialized.includes("attribution_probability"), false);
  assert.equal(serialized.includes("roi_value"), false);
  assert.equal(serialized.includes("productivity_score"), false);
});

test("Bayesian chain remains held", () => {
  const plan = validPlan();

  assert.equal(plan.bayesian_chain_state.current_state, "HOLD_FOR_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE");
  assert.equal(plan.bayesian_chain_state.allowed_next_step, "complete_governed_diagnostics_sufficiency_evidence_source");
  assert.equal(plan.bayesian_chain_state.changed_by_this_plan, false);
  assert.equal(plan.promotion_authorized, false);
});
