import assert from "node:assert/strict";
import test from "node:test";

import {
  REQUIRED_REPORTING_SPINE_MILESTONES,
  buildAiContributionReportingSpine,
  validateAiContributionReportingSpine
} from "./run_ai_value_contribution_reporting_spine.mjs";

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

function approvedMeasurementInput(overrides = {}) {
  return baseInput({
    selected_metric_approval: {
      approved_metric_selection_ref: "approved_metric_selection.customer_support.case_resolution.2026_06",
      source_blueprint_hypothesis_ref: "blueprint_hypothesis.customer_support.case_resolution.2026_06",
      selected_metric_id: "support_median_resolution_hours",
      selected_metric_family: "workflow_cycle_context",
      selected_measurement_unit: "hours",
      metric_owner_role_ref: "support_operations",
      expected_movement_direction: "decrease",
      expected_lag_definition: "lag_definition.customer_support.case_resolution.t60",
      baseline_value_source_ref: "baseline_source.customer_support.case_resolution.t0.2026_06",
      comparison_condition_ref: "comparison_condition.customer_support.case_resolution.2026_06",
      milestone_schedule_ref: "milestone_schedule.customer_support.case_resolution.2026_06",
      approval_state: "APPROVED_FOR_COMPARISON_DESIGN_INTAKE",
      approval_role_ref: "role.value_governance_reviewer"
    },
    milestone_window_status: {
      schedule_ref: "milestone_schedule.customer_support.case_resolution.2026_06",
      window_alignment_state: "ALIGNED_FOR_REPORTING",
      suppression_missing_held_review_state: "CLEAR",
      staleness_review_state: "CURRENT",
      milestone_refs: Object.fromEntries(
        REQUIRED_REPORTING_SPINE_MILESTONES.map((milestone) => [
          milestone,
          `measurement_window.customer_support.case_resolution.${milestone.toLowerCase()}`
        ])
      ),
      unsupported_milestone_days_hold_for_reconciliation: true,
      milestone_reconciliation_state: "RECONCILED_FOR_REPORTING_INPUT_ONLY"
    },
    said_evidence_refs: ["ai_fluency_aggregate.customer_support.2026_06"],
    unsaid_behavioral_evidence_refs: ["workflow_evidence.customer_support.case_resolution.2026_06"],
    aggregate_outcome_measurement_cell_refs: [
      "measurement_cell.customer_support.case_resolution.t0",
      "measurement_cell.customer_support.case_resolution.t30",
      "measurement_cell.customer_support.case_resolution.t60",
      "measurement_cell.customer_support.case_resolution.t90",
      "measurement_cell.customer_support.case_resolution.t180",
      "measurement_cell.customer_support.case_resolution.t365"
    ],
    comparison_design_source_package_ref:
      "comparison_design_source_package.customer_support.case_resolution.2026_06",
    comparison_design_posture: "READY_FOR_COMPARISON_DESIGN_ADEQUACY_EVIDENCE_REVIEW",
    ...overrides
  });
}

test("missing hypothesis fails closed", () => {
  const spine = buildAiContributionReportingSpine(
    baseInput({
      blueprint_hypothesis_ref: "",
      blueprint_hypothesis_statement: ""
    })
  );

  assert.equal(spine.reporting_spine_state, "HOLD_FOR_BLUEPRINT_HYPOTHESIS");
  assert.equal(spine.candidate_metric_recommendation_state, "HELD_NOT_RECOMMENDED");
  assert.equal(spine.allowed_next_step, "hold_for_reviewer_evidence_collection");
  assert.ok(spine.evidence_gap_list.includes("missing_blueprint_hypothesis_ref"));
  assert.ok(spine.evidence_gap_list.includes("missing_blueprint_hypothesis_statement"));
  assert.equal(spine.promotion_authorized, false);
});

test("ambiguous hypothesis fails closed", () => {
  const spine = buildAiContributionReportingSpine(
    baseInput({
      blueprint_hypothesis_statement: "Make things better somehow."
    })
  );

  assert.equal(spine.reporting_spine_state, "HOLD_FOR_AMBIGUOUS_BLUEPRINT_HYPOTHESIS");
  assert.ok(spine.evidence_gap_list.includes("ambiguous_blueprint_hypothesis_statement"));
});

test("unsupported value route fails closed", () => {
  const spine = buildAiContributionReportingSpine(
    baseInput({
      value_route: "PRODUCTIVITY_SCORE"
    })
  );

  assert.equal(spine.reporting_spine_state, "HOLD_FOR_UNSUPPORTED_VALUE_ROUTE");
  assert.deepEqual(spine.candidate_metric_recommendations, []);
  assert.ok(spine.evidence_gap_list.includes("unsupported_value_route"));
});

test("metric recommendations require metric library refs", () => {
  const spine = buildAiContributionReportingSpine(
    baseInput({
      metric_library_refs: []
    })
  );

  assert.equal(spine.reporting_spine_state, "HOLD_FOR_METRIC_LIBRARY_REFS");
  assert.ok(spine.evidence_gap_list.includes("missing_metric_library_refs"));
  assert.deepEqual(spine.candidate_metric_recommendations, []);
});

test("recommendations do not create evidence or approve selected metric", () => {
  const spine = buildAiContributionReportingSpine(baseInput());
  const validation = validateAiContributionReportingSpine(spine);

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(spine.reporting_spine_state, "AI_CONTRIBUTION_REPORTING_SPINE_READY_WITH_EVIDENCE_GAPS");
  assert.equal(spine.candidate_metric_recommendation_state, "CANDIDATE_RECOMMENDATIONS_ONLY_NOT_EVIDENCE");
  assert.ok(spine.candidate_metric_recommendations.length > 0);
  assert.equal(spine.recommendations_create_evidence, false);
  assert.equal(spine.selected_metric_approved, false);
  assert.equal(spine.diagnostics_evidence_satisfied, false);
  assert.equal(spine.evidence_alignment_state, "NOT_READY");
  assert.equal(spine.source_bound, false);
  assert.equal(spine.validation_current, false);
  assert.equal(spine.allowed_next_evidence_action, "complete_reviewer_metric_selection_approval");
});

test("selected metric requires reviewer/customer approval", () => {
  const spine = buildAiContributionReportingSpine(baseInput());

  assert.equal(spine.selected_metric_approval_state, "HOLD_FOR_REVIEWER_APPROVAL");
  assert.equal(spine.approved_measurement_plan_ref, null);
  assert.ok(spine.evidence_gap_list.includes("missing_reviewer_metric_approval"));
});

test("expected direction and lag require approved hypothesis expectation path", () => {
  const spine = buildAiContributionReportingSpine(
    approvedMeasurementInput({
      selected_metric_approval: {
        ...approvedMeasurementInput().selected_metric_approval,
        expected_movement_direction: "REQUIRES_REVIEWER_APPROVAL_FROM_EXPECTATION_PATH"
      }
    })
  );

  assert.equal(spine.evidence_alignment_state, "NOT_READY");
  assert.ok(spine.evidence_gap_list.includes("missing_expected_direction_or_lag_approval"));
});

test("milestone schedule includes T0/T30/T60/T90/T120/T180/T270/T365", () => {
  const spine = buildAiContributionReportingSpine(baseInput());

  assert.deepEqual(REQUIRED_REPORTING_SPINE_MILESTONES, [
    "T0_baseline",
    "T30",
    "T60",
    "T90",
    "T120",
    "T180_6_month",
    "T270_9_month",
    "T365_12_month"
  ]);
  assert.deepEqual(spine.milestone_measurement_plan.required_milestones, REQUIRED_REPORTING_SPINE_MILESTONES);
  assert.equal(spine.milestone_measurement_plan.milestones_are_planning_only, true);
});

test("outcome Measurement Cell refs preserve T120 and T270 milestone refs", () => {
  const spine = buildAiContributionReportingSpine(
    approvedMeasurementInput({
      aggregate_outcome_measurement_cell_refs: [
        "measurement_cell.customer_support.case_resolution.t0",
        "measurement_cell.customer_support.case_resolution.t30",
        "measurement_cell.customer_support.case_resolution.t60",
        "measurement_cell.customer_support.case_resolution.t90",
        "measurement_cell.customer_support.case_resolution.t120",
        "measurement_cell.customer_support.case_resolution.t180",
        "measurement_cell.customer_support.case_resolution.t270",
        "measurement_cell.customer_support.case_resolution.t365"
      ]
    })
  );

  assert.deepEqual(spine.aggregate_outcome_measurement_cell_refs, [
    "measurement_cell.customer_support.case_resolution.t0",
    "measurement_cell.customer_support.case_resolution.t30",
    "measurement_cell.customer_support.case_resolution.t60",
    "measurement_cell.customer_support.case_resolution.t90",
    "measurement_cell.customer_support.case_resolution.t120",
    "measurement_cell.customer_support.case_resolution.t180",
    "measurement_cell.customer_support.case_resolution.t270",
    "measurement_cell.customer_support.case_resolution.t365"
  ]);
  assert.equal(spine.outcome_movement_state, "PRESENT_AGGREGATE_MEASUREMENT_CELL_REFS");
});

test("evidence alignment reports gaps without satisfying evidence", () => {
  const spine = buildAiContributionReportingSpine(approvedMeasurementInput({
    said_evidence_refs: [],
    unsaid_behavioral_evidence_refs: [],
    aggregate_outcome_measurement_cell_refs: []
  }));

  assert.equal(spine.evidence_alignment_state, "HELD_FOR_MISSING_SAID_EVIDENCE");
  assert.ok(spine.evidence_gap_list.includes("missing_said_evidence_refs"));
  assert.ok(spine.evidence_gap_list.includes("missing_unsaid_behavioral_evidence_refs"));
  assert.ok(spine.evidence_gap_list.includes("missing_outcome_measurement_cell_refs"));
  assert.equal(spine.diagnostics_evidence_satisfied, false);
  assert.equal(spine.evidence_dimensions_satisfied.length, 0);
});

test("model-review posture remains separate from interpretation", () => {
  const spine = buildAiContributionReportingSpine(approvedMeasurementInput());

  assert.equal(spine.evidence_alignment_state, "READY_FOR_MODEL_REVIEW");
  assert.equal(spine.model_eligibility_status, "ELIGIBLE_FOR_INTERNAL_MODEL_REVIEW_INPUT_ONLY");
  assert.equal(spine.model_review_input_posture, "MODEL_REVIEW_INPUT_READY_DIAGNOSTICS_STILL_GOVERNED");
  assert.match(spine.customer_safe_interpretation, /Diagnostics sufficiency remains separately governed/);
  assert.equal(spine.customer_safe_interpretation_guidance.model_status_separate_from_interpretation, true);
  assert.equal(spine.posterior_interpretation_authorized, false);
  assert.equal(spine.diagnostics_evidence_satisfied, false);
});

test("unreconciled T120/T270 planning milestones keep model-review input held", () => {
  const spine = buildAiContributionReportingSpine(approvedMeasurementInput({
    milestone_window_status: {
      ...approvedMeasurementInput().milestone_window_status,
      milestone_reconciliation_state: "HOLD_FOR_MILESTONE_RECONCILIATION"
    }
  }));

  assert.equal(spine.evidence_alignment_state, "HELD_FOR_SUPPRESSED_OR_MISALIGNED_WINDOWS");
  assert.equal(spine.model_review_input_posture, "MODEL_REVIEW_INPUT_HELD_FOR_EVIDENCE_GAPS");
  assert.ok(spine.evidence_gap_list.includes("missing_milestone_reconciliation"));
  assert.equal(spine.diagnostics_evidence_satisfied, false);
  assert.equal(spine.bayesian_chain_state.current_state, "HOLD_FOR_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE");
});

test("Bayesian chain remains held without governed diagnostics evidence", () => {
  const spine = buildAiContributionReportingSpine(approvedMeasurementInput());

  assert.equal(
    spine.bayesian_chain_state.current_state,
    "HOLD_FOR_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE"
  );
  assert.equal(
    spine.bayesian_chain_state.allowed_next_step,
    "complete_governed_diagnostics_sufficiency_evidence_source"
  );
  assert.equal(spine.bayesian_chain_state.changed_by_this_spine, false);
  assert.equal(spine.promotion_authorized, false);
});

test("validation rejects forged top-level metric library refs", () => {
  const spine = buildAiContributionReportingSpine(baseInput());
  spine.metric_library_refs = [];

  const validation = validateAiContributionReportingSpine(spine);

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.includes("metric_library_refs must include every candidate source metric library ref"));
});

test("validation rejects candidate source refs that were not supplied at top level", () => {
  const spine = buildAiContributionReportingSpine(baseInput());
  spine.metric_library_refs = [
    "docs/contracts/ai-value-intelligence/examples/customer-success-50-synthetic-metrics-library.json"
  ];

  const validation = validateAiContributionReportingSpine(spine);

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.includes("metric_library_refs must include every candidate source metric library ref"));
});

test("validation rejects tampered candidate metric fields", () => {
  const spine = buildAiContributionReportingSpine(baseInput());
  spine.candidate_metric_recommendations[0] = {
    ...spine.candidate_metric_recommendations[0],
    candidate_metric_family: "tampered_family",
    measurement_unit: "individual_user",
    metric_owner_role_ref: "tampered_owner",
    recommendation_state: "APPROVED",
    expected_source_system_posture: {
      ...spine.candidate_metric_recommendations[0].expected_source_system_posture,
      approved_grain: "individual_user"
    }
  };

  const validation = validateAiContributionReportingSpine(spine);

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.includes("candidate_metric_family must match source metric library value route"));
  assert.ok(validation.gaps.includes("candidate measurement_unit must match source metric library"));
  assert.ok(validation.gaps.includes("candidate metric_owner_role_ref must match source metric library"));
  assert.ok(validation.gaps.includes("candidate recommendation_state must remain CANDIDATE_ONLY_NOT_SELECTED"));
  assert.ok(validation.gaps.includes("candidate expected_source_system_posture.approved_grain must match source metric library"));
});

test("validation rejects missing blocked output, feed, and UI false-gate keys", () => {
  const spine = buildAiContributionReportingSpine(approvedMeasurementInput());
  delete spine.blocked_outputs.roi_output;
  delete spine.feeds.route_or_ui_creation;
  delete spine.existing_ui_integration_readiness.creates_new_ui;

  const validation = validateAiContributionReportingSpine(spine);

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.includes("blocked_outputs.roi_output must be present and false"));
  assert.ok(validation.gaps.includes("feeds.route_or_ui_creation must be present and false"));
  assert.ok(validation.gaps.includes("existing_ui_integration_readiness.creates_new_ui must be present and false"));
});

test("forged evidence refs do not satisfy reporting alignment", () => {
  const spine = buildAiContributionReportingSpine(approvedMeasurementInput({
    said_evidence_refs: ["not_a_reviewed_said_ref"],
    unsaid_behavioral_evidence_refs: ["not_a_reviewed_unsaid_ref"],
    aggregate_outcome_measurement_cell_refs: ["not_a_measurement_cell_ref"],
    comparison_design_source_package_ref: "not_a_source_package_ref"
  }));
  const validation = validateAiContributionReportingSpine(spine);

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(spine.evidence_alignment_state, "HELD_FOR_MISSING_SAID_EVIDENCE");
  assert.deepEqual(spine.said_evidence_refs, []);
  assert.deepEqual(spine.unsaid_behavioral_evidence_refs, []);
  assert.deepEqual(spine.aggregate_outcome_measurement_cell_refs, []);
  assert.equal(spine.comparison_design_source_package_ref, null);
  assert.equal(spine.diagnostics_evidence_satisfied, false);
});

test("unsafe direction and lag text is not echoed as approved measurement context", () => {
  const spine = buildAiContributionReportingSpine(approvedMeasurementInput({
    selected_metric_approval: {
      ...approvedMeasurementInput().selected_metric_approval,
      expected_movement_direction: "95% probability Glean caused productivity gain",
      expected_lag_definition: "ROI finance confidence output ready at T180"
    }
  }));
  const validation = validateAiContributionReportingSpine(spine);
  const serialized = JSON.stringify(spine).toLowerCase();

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(spine.selected_metric_approved, false);
  assert.equal(spine.evidence_alignment_state, "NOT_READY");
  assert.equal(serialized.includes("95% probability"), false);
  assert.equal(serialized.includes("roi finance"), false);
  assert.equal(serialized.includes("productivity gain"), false);
});

test("validation rejects removed compatibility fields and unsafe tampered selected metric", () => {
  const spine = buildAiContributionReportingSpine(approvedMeasurementInput());
  delete spine.source_bound;
  delete spine.validation_current;
  spine.customer_safe_interpretation = "The model is confident this caused ROI.";
  spine.selected_metric.expected_lag_definition = "prompt:= leaked transcript with ROI confidence";

  const validation = validateAiContributionReportingSpine(spine);

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.includes("source_bound must be false for this planning/reporting spine"));
  assert.ok(validation.gaps.includes("validation_current must be false for this planning/reporting spine"));
  assert.ok(validation.gaps.includes("customer_safe_interpretation must be present and safe"));
  assert.ok(validation.gaps.includes("selected_metric expected direction and lag must be approved controlled values"));
});

test("existing UI integration readiness is downstream-only and does not create claims", () => {
  const spine = buildAiContributionReportingSpine(approvedMeasurementInput());

  assert.equal(spine.existing_ui_integration_readiness.downstream_only, true);
  assert.equal(spine.existing_ui_integration_readiness.creates_new_ui, false);
  assert.equal(spine.existing_ui_integration_readiness.creates_routes, false);
  assert.equal(spine.existing_ui_integration_readiness.creates_schemas, false);
  assert.equal(spine.existing_ui_integration_readiness.persistence_write, false);
  assert.equal(spine.existing_ui_integration_readiness.export_creation, false);
  assert.ok(
    spine.existing_ui_integration_readiness.downstream_surfaces.includes(
      "frontend/src/pages/AIValueJourney.tsx"
    )
  );
  assert.ok(spine.existing_ui_integration_readiness.safe_render_fields.includes("evidence_gap_list"));
});

test("blocked outputs remain blocked", () => {
  const spine = buildAiContributionReportingSpine(approvedMeasurementInput());
  const validation = validateAiContributionReportingSpine(spine);
  const serialized = JSON.stringify(spine).toLowerCase();

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(spine.blocked_outputs.confidence_output, false);
  assert.equal(spine.blocked_outputs.probability_output, false);
  assert.equal(spine.blocked_outputs.roi_output, false);
  assert.equal(spine.blocked_outputs.finance_output, false);
  assert.equal(spine.blocked_outputs.economic_output, false);
  assert.equal(spine.blocked_outputs.causality_output, false);
  assert.equal(spine.blocked_outputs.productivity_output, false);
  assert.equal(spine.blocked_outputs.customer_facing_economic_output, false);
  assert.equal(spine.blocked_outputs.raw_rows, false);
  assert.equal(spine.blocked_outputs.identifiers, false);
  assert.equal(spine.blocked_outputs.prompts, false);
  assert.equal(spine.blocked_outputs.transcripts, false);
  assert.equal(spine.blocked_outputs.person_level_data, false);
  assert.equal(spine.blocked_outputs.live_connector_execution, false);
  assert.equal(spine.blocked_outputs.route_creation, false);
  assert.equal(spine.blocked_outputs.ui_creation, false);
  assert.equal(spine.blocked_outputs.schema_creation, false);
  assert.equal(spine.blocked_outputs.persistence_write, false);
  assert.equal(spine.blocked_outputs.export_creation, false);
  assert.equal(serialized.includes("confidence_percentage"), false);
  assert.equal(serialized.includes("attribution_probability"), false);
  assert.equal(serialized.includes("roi_value"), false);
  assert.equal(serialized.includes("productivity_score"), false);
});
