import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  AI_VALUE_CUSTOMER_METRIC_OPERATOR_SOURCE_HANDOFF_SCHEMA_VERSION,
  buildCustomerMetricOperatorSourceHandoff,
  buildCustomerMetricIntake,
  validateCustomerMetricIntake,
  validateCustomerMetricOperatorSourceHandoff
} from "../shared/dist/aiValueEngine/index.js";

const PLAN_PATH =
  "docs/contracts/ai-value-measurement-plan/examples/full-playbook-ready-plan.json";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const clone = (value) => JSON.parse(JSON.stringify(value));

function fullPlan(overrides = {}) {
  return {
    ...readJson(PLAN_PATH),
    ...overrides
  };
}

function windowsFromPlan(plan) {
  return {
    baselineWindow: {
      window_start: plan.windows.baseline_window_start,
      window_end: plan.windows.baseline_window_end
    },
    comparisonWindow: {
      window_start: plan.windows.comparison_window_start,
      window_end: plan.windows.comparison_window_end
    }
  };
}

function baseInput(overrides = {}) {
  const plan = overrides.measurementPlan ?? fullPlan();
  const { baselineWindow, comparisonWindow } = windowsFromPlan(plan);
  return {
    measurementPlan: plan,
    orgId: plan.org_id,
    clientId: "client_example",
    workflowFamily: plan.workflow_scope.workflow_family,
    functionArea: plan.workflow_scope.function_area,
    cohortKey: "workflow_family:customer_support_case_resolution|eligible_cases:2300",
    intakeMode: "customer_metric_aggregate_export",
    metric: {
      metric_id: plan.metric_selection.primary_metric.metric_id,
      metric_name: plan.metric_selection.primary_metric.metric_name,
      metric_category: plan.metric_selection.primary_metric.metric_category,
      metric_unit: "hours",
      metric_direction: "decrease",
      metric_sensitivity: "high",
      source_system_type: plan.metric_selection.primary_metric.source_system_type,
      source_system_name: "customer_support_system",
      normalization_denominator: "eligible_case_count"
    },
    baselineWindow,
    comparisonWindow,
    baselineValue: 18,
    comparisonValue: 14,
    sourceRef: "support_metric_resolution_hours_day_30",
    sourceOwnerRole: "customer_data_owner",
    metricOwnerRole: plan.metric_selection.primary_metric.metric_owner_role,
    ownerApprovalState: "approved",
    reviewState: "clear",
    freshnessState: "current",
    aggregateOnly: true,
    generatedAt: "2026-06-22T00:00:00.000Z",
    ...overrides
  };
}

function readyIntake(overrides = {}) {
  return buildCustomerMetricIntake(baseInput(overrides));
}

test("approved Customer Metric Intake prepares operator source and metric contexts only", () => {
  const intake = readyIntake();
  const intakeValidation = validateCustomerMetricIntake(intake);
  const handoff = buildCustomerMetricOperatorSourceHandoff({
    customerMetricIntake: intake,
    generatedAt: "2026-06-22T00:00:00.000Z"
  });
  const result = validateCustomerMetricOperatorSourceHandoff(handoff);

  assert.equal(intakeValidation.valid, true, intakeValidation.gaps.join("; "));
  assert.equal(
    handoff.schema_version,
    AI_VALUE_CUSTOMER_METRIC_OPERATOR_SOURCE_HANDOFF_SCHEMA_VERSION
  );
  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(handoff.decision, "READY_FOR_OPERATOR_INTAKE");
  assert.equal(handoff.feeds.operator_intake_source, true);
  assert.equal(handoff.feeds.data_spine_customer_metric_source, true);
  assert.equal(handoff.feeds.measurement_cell_selected_metric_context_fragment, true);
  assert.equal(handoff.feeds.metric_movement_context_fragment, true);
  assert.equal(handoff.feeds.layer_3_metric_context_fragment, true);
  assert.equal(handoff.feeds.measurement_cell_direct_feed, false);
  assert.equal(handoff.feeds.finance_context_investigation, false);
  assert.equal(handoff.feeds.confidence_model, false);
  assert.equal(handoff.feeds.customer_facing_financial_output, false);
  assert.equal(handoff.operator_source.state, "present");
  assert.equal(handoff.operator_source.intake_mode, "customer_metric_aggregate_export");
  assert.equal(handoff.operator_source.owner_role, "customer_data_owner");
  assert.equal(handoff.operator_source.metric_owner_role, "operations_metric_owner");
  assert.equal(handoff.operator_source.owner_approval_state, "approved");
  assert.equal(handoff.operator_source.review_state, "clear");
  assert.equal(handoff.operator_source.aggregate_only, true);
  assert.equal(handoff.operator_source.metric_id, "support_median_resolution_hours");
  assert.equal(handoff.selected_metric_context.metric_id, "support_median_resolution_hours");
  assert.equal(handoff.selected_metric_context.source_ref, intake.source_ref);
  assert.equal(handoff.selected_metric_context.suppression_state, "CLEAR");
  assert.equal(handoff.metric_movement_context.movement_direction, "improved");
  assert.equal(handoff.metric_movement_context.absolute_delta, -4);
  assert.equal(
    handoff.metric_movement_context.interpretation,
    "descriptive_movement_only"
  );
  assert.equal(handoff.metric_movement_context.source_ref, intake.source_ref);
  assert.equal(handoff.layer_3_metric_context.summary_type, "customer_owned_aggregate_metric_summary");
  assert.equal(handoff.layer_3_metric_context.source_ref, intake.source_ref);
  assert.equal(
    handoff.source_package_reference.source_package_type,
    "layer_3_business_system_of_record_outcome_export"
  );
  assert.equal(
    handoff.source_package_reference.source_refs.aggregate_outcome_export_id,
    intake.source_ref
  );
});

test("held, stale, unapproved, or unreviewed metric evidence cannot feed operator intake", () => {
  const cases = [
    { name: "stale", overrides: { freshnessState: "stale" } },
    { name: "unknown freshness", overrides: { freshnessState: "unknown" } },
    { name: "submitted owner approval", overrides: { ownerApprovalState: "submitted" } },
    { name: "held owner approval", overrides: { ownerApprovalState: "held" } },
    { name: "review held", overrides: { reviewState: "held" } }
  ];

  for (const { name, overrides } of cases) {
    const intake = readyIntake(overrides);
    const intakeValidation = validateCustomerMetricIntake(intake);
    const handoff = buildCustomerMetricOperatorSourceHandoff({
      customerMetricIntake: intake,
      generatedAt: "2026-06-22T00:00:00.000Z"
    });
    const result = validateCustomerMetricOperatorSourceHandoff(handoff);

    assert.equal(intakeValidation.valid, true, name);
    assert.equal(handoff.decision, "HELD_NO_FEEDABLE_CUSTOMER_METRIC_SOURCE", name);
    assert.equal(result.valid, true, result.gaps.join("; "));
    assert.equal(handoff.operator_source, null, name);
    assert.equal(handoff.selected_metric_context, null, name);
    assert.equal(handoff.metric_movement_context, null, name);
    assert.equal(handoff.layer_3_metric_context, null, name);
    assert.equal(handoff.source_package_reference, null, name);
    assert.equal(result.feeds.operator_intake_source, false, name);
    assert.equal(result.feeds.data_spine_customer_metric_source, false, name);
    assert.equal(result.feeds.measurement_cell_selected_metric_context_fragment, false, name);
    assert.equal(result.feeds.metric_movement_context_fragment, false, name);
    assert.equal(result.feeds.layer_3_metric_context_fragment, false, name);
    assert.equal(result.feeds.finance_context_investigation, false, name);
    assert.equal(result.feeds.confidence_model, false, name);
  }
});

test("invalid Customer Metric Intake blocks before handoff feeds", () => {
  const intake = readyIntake();
  intake.raw_rows = [{ user_id: "user_123", response: "raw row" }];
  intake.metric_evidence.freshness_state = "stale";
  intake.metric_evidence.owner_approval_state = "submitted";
  intake.financial_attribution = true;
  intake.confidence_percentage = 91;

  const handoff = buildCustomerMetricOperatorSourceHandoff({
    customerMetricIntake: intake,
    generatedAt: "2026-06-22T00:00:00.000Z"
  });
  const result = validateCustomerMetricOperatorSourceHandoff(handoff);

  assert.equal(validateCustomerMetricIntake(intake).valid, false);
  assert.equal(handoff.decision, "BLOCKED");
  assert.equal(result.valid, false);
  assert.equal(handoff.operator_source, null);
  assert.equal(handoff.selected_metric_context, null);
  assert.equal(handoff.metric_movement_context, null);
  assert.equal(handoff.layer_3_metric_context, null);
  assert.ok(result.gaps.some((gap) => gap.includes("customer_metric_intake:")));
  assert.ok(result.gaps.some((gap) => gap.includes("raw_rows")));
  assert.ok(result.gaps.some((gap) => gap.includes("financial_attribution")));
  assert.ok(result.gaps.some((gap) => gap.includes("confidence_percentage")));
  assert.equal(result.feeds.operator_intake_source, false);
  assert.equal(result.feeds.finance_context_investigation, false);
  assert.equal(result.feeds.confidence_model, false);
});

test("ready-looking Customer Metric handoff fails closed on context or source package drift", () => {
  const handoff = buildCustomerMetricOperatorSourceHandoff({
    customerMetricIntake: readyIntake(),
    generatedAt: "2026-06-22T00:00:00.000Z"
  });
  const drifted = clone(handoff);
  drifted.selected_metric_context.metric_id = "other_metric";
  drifted.metric_movement_context.source_ref = "other_metric_export";
  drifted.layer_3_metric_context.cohort_key = "function:sales";
  drifted.source_package_reference.source_package_type =
    "layer_2_user_voice_empirical_export";
  drifted.source_package_reference.source_refs = {
    aggregate_export_id: handoff.source_ref
  };
  drifted.source_package_ref = {
    source_package_type: "layer_3_business_system_of_record_outcome_export"
  };

  const result = validateCustomerMetricOperatorSourceHandoff(drifted);

  assert.equal(result.valid, false);
  for (const token of [
    "selected_metric_context.metric_id",
    "metric_movement_context.source_ref",
    "layer_3_metric_context.cohort_key",
    "source_package_reference.source_package_type",
    "source_package_reference.source_refs.aggregate_outcome_export_id",
    "source_package_ref"
  ]) {
    assert.ok(result.gaps.some((gap) => gap.includes(token)), `missing gap for ${token}`);
  }
  assert.equal(result.feeds.operator_intake_source, false);
});

test("ready-looking Customer Metric handoff fails closed on top-level identity drift", () => {
  const handoff = buildCustomerMetricOperatorSourceHandoff({
    customerMetricIntake: readyIntake(),
    generatedAt: "2026-06-22T00:00:00.000Z"
  });
  const drifted = clone(handoff);
  drifted.org_id = "other_org";
  drifted.client_id = "other_client";
  drifted.measurement_plan_id = "other_plan";
  drifted.workflow_family = "other_workflow";
  drifted.function_area = "sales";
  drifted.cohort_key = "function:sales";
  drifted.metric_id = "other_metric";

  const result = validateCustomerMetricOperatorSourceHandoff(drifted);

  assert.equal(result.valid, false);
  for (const token of [
    "org_id must match operator_source.org_id",
    "client_id must match operator_source.client_id",
    "measurement_plan_id must match",
    "workflow_family must match operator_source.workflow_family",
    "function_area must match operator_source.function_area",
    "cohort_key must match operator_source.cohort_key",
    "metric_id must match operator_source.metric_id"
  ]) {
    assert.ok(result.gaps.some((gap) => gap.includes(token)), `missing gap for ${token}`);
  }
  assert.equal(result.feeds.operator_intake_source, false);
});

test("Customer Metric handoff rejects side-channel fields caveats feeds and movement tampering", () => {
  const handoff = buildCustomerMetricOperatorSourceHandoff({
    customerMetricIntake: readyIntake(),
    generatedAt: "2026-06-22T00:00:00.000Z"
  });
  const tampered = clone(handoff);
  tampered.measurement_cell_input = { selected_metric: handoff.selected_metric_context };
  tampered.source_package_review_clear = true;
  tampered.source_package = { review_state: "clear" };
  tampered.operator_intake_payload = { source: handoff.operator_source };
  tampered.feeds.measurement_cell_input = true;
  tampered.feeds.source_package_review_clear = true;
  tampered.boundary_policy.measurement_cell_input = true;
  tampered.required_caveats = [
    "This proves ROI causality, productivity, confidence, probability, and customer-facing financial output."
  ];
  tampered.metric_movement_context.absolute_delta = 999;
  tampered.metric_movement_context.movement_direction = "improved";
  tampered.metric_movement_context.baseline_value = 14;
  tampered.metric_movement_context.comparison_value = 18;
  tampered.source_package_reference.source_refs.query_text =
    "select employee_email from raw_events";

  const result = validateCustomerMetricOperatorSourceHandoff(tampered);

  assert.equal(result.valid, false);
  for (const token of [
    "Unsupported customer metric operator source handoff field: measurement_cell_input",
    "Unsupported customer metric operator source handoff field: source_package_review_clear",
    "Unsupported customer metric operator source handoff field: source_package",
    "Unsupported customer metric operator source handoff field: operator_intake_payload",
    "feeds.measurement_cell_input is not supported",
    "feeds.source_package_review_clear is not supported",
    "boundary_policy.measurement_cell_input is not supported",
    "required_caveats.0",
    "metric_movement_context.absolute_delta must match comparison minus baseline",
    "metric_movement_context.movement_direction must match metric direction and values",
    "source_package_reference.source_refs.query_text"
  ]) {
    assert.ok(result.gaps.some((gap) => gap.includes(token)), `missing gap for ${token}`);
  }
  assert.equal(result.feeds.operator_intake_source, false);
  assert.equal(result.feeds.finance_context_investigation, false);
});

test("unsafe source refs are blocked by the builder before exposing ready feeds", () => {
  const handoff = buildCustomerMetricOperatorSourceHandoff({
    customerMetricIntake: readyIntake({
      sourceRef: "raw_prompt_roi_probability_export"
    }),
    generatedAt: "2026-06-22T00:00:00.000Z"
  });
  const result = validateCustomerMetricOperatorSourceHandoff(handoff);

  assert.equal(handoff.decision, "BLOCKED");
  assert.equal(result.valid, false);
  assert.equal(handoff.operator_source, null);
  assert.equal(handoff.selected_metric_context, null);
  assert.equal(handoff.source_package_reference, null);
  assert.equal(handoff.feeds.operator_intake_source, false);
  assert.equal(result.feeds.operator_intake_source, false);
  assert.ok(result.gaps.some((gap) => gap.includes("Unsafe identifier value detected")));
});

test("unsafe refs fields values allowed uses and direct feeds are blocked", () => {
  const handoff = buildCustomerMetricOperatorSourceHandoff({
    customerMetricIntake: readyIntake(),
    generatedAt: "2026-06-22T00:00:00.000Z"
  });
  handoff.source_ref = "raw_prompt_roi_probability_export";
  handoff.operator_source.source_ref = handoff.source_ref;
  handoff.selected_metric_context.source_ref = handoff.source_ref;
  handoff.metric_movement_context.source_ref = handoff.source_ref;
  handoff.layer_3_metric_context.source_ref = handoff.source_ref;
  handoff.source_package_reference.source_refs.aggregate_outcome_export_id =
    handoff.source_ref;
  handoff.operator_source.user_id = "user_123";
  handoff.metric_movement_context.query_text = "select email from raw_events";
  handoff.layer_3_metric_context.prompt_transcript = "raw transcript";
  handoff.contribution_probability = 0.82;
  handoff.finance_context_investigation_ready = true;
  handoff.allowed_uses.push(
    "measurement_cell_direct_feed",
    "finance_context_investigation",
    "confidence_model_execution",
    "customer_facing_financial_output",
    "realized_roi",
    "causality_claim",
    "productivity_claim"
  );
  handoff.feeds.measurement_cell_direct_feed = true;
  handoff.feeds.finance_context_investigation = true;
  handoff.feeds.confidence_model = true;
  handoff.feeds.customer_facing_financial_output = true;

  const result = validateCustomerMetricOperatorSourceHandoff(handoff);

  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) =>
    gap.includes("Unsafe identifier value detected") && gap.includes("source_ref")
  ));
  for (const token of [
    "operator_source.user_id",
    "metric_movement_context.query_text",
    "layer_3_metric_context.prompt_transcript",
    "contribution_probability",
    "finance_context_investigation_ready",
    "allowed_uses contains unsupported use: measurement_cell_direct_feed",
    "allowed_uses contains unsupported use: finance_context_investigation",
    "allowed_uses contains unsupported use: confidence_model_execution",
    "allowed_uses contains unsupported use: customer_facing_financial_output",
    "allowed_uses contains unsupported use: realized_roi",
    "allowed_uses contains unsupported use: causality_claim",
    "allowed_uses contains unsupported use: productivity_claim",
    "feeds.measurement_cell_direct_feed",
    "feeds.finance_context_investigation",
    "feeds.confidence_model",
    "feeds.customer_facing_financial_output"
  ]) {
    assert.ok(result.gaps.some((gap) => gap.includes(token)), `missing gap for ${token}`);
  }
  assert.equal(result.feeds.operator_intake_source, false);
  assert.equal(result.feeds.data_spine_customer_metric_source, false);
  assert.equal(result.feeds.measurement_cell_selected_metric_context_fragment, false);
  assert.equal(result.feeds.metric_movement_context_fragment, false);
  assert.equal(result.feeds.layer_3_metric_context_fragment, false);
  assert.equal(result.feeds.finance_context_investigation, false);
  assert.equal(result.feeds.confidence_model, false);
  assert.equal(result.feeds.customer_facing_financial_output, false);
});
