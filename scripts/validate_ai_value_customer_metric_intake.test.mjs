import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  AI_VALUE_CUSTOMER_METRIC_INTAKE_SCHEMA_VERSION,
  buildCustomerMetricIntake,
  validateCustomerMetricIntake
} from "../shared/dist/aiValueEngine/index.js";

const PLAN_PATH = "docs/contracts/ai-value-measurement-plan/examples/full-playbook-ready-plan.json";

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
    intakeMode: "manual_customer_metric_entry",
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
    generatedAt: "2026-06-20T00:00:00.000Z",
    ...overrides
  };
}

test("manual aggregate metric entry produces customer metric source and selected metric input", () => {
  const intake = buildCustomerMetricIntake(baseInput());
  const result = validateCustomerMetricIntake(intake);

  assert.equal(intake.schema_version, AI_VALUE_CUSTOMER_METRIC_INTAKE_SCHEMA_VERSION);
  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(intake.decision, "READY_FOR_DATA_SPINE_AND_MEASUREMENT_CELL");
  assert.equal(intake.feeds.data_spine_customer_metric_source, true);
  assert.equal(intake.feeds.measurement_cell_selected_metric, true);
  assert.equal(intake.feeds.layer_3_business_system_outcomes, true);
  assert.equal(intake.feeds.finance_context_investigation_planning, false);
  assert.equal(intake.feeds.customer_facing_financial_output, false);
  assert.equal(intake.data_spine_source.intake_mode, "manual_customer_metric_entry");
  assert.equal(intake.data_spine_source.metric_id, "support_median_resolution_hours");
  assert.equal(intake.measurement_cell_selected_metric.metric_id, "support_median_resolution_hours");
  assert.equal(intake.measurement_cell_selected_metric.metric_direction, "decrease");
  assert.equal(intake.metric_movement.movement_direction, "improved");
});

test("aggregate export metadata can produce Layer 3 metric context when approved", () => {
  const intake = buildCustomerMetricIntake(baseInput({
    intakeMode: "customer_metric_aggregate_export",
    sourceRef: "support_metric_export_metadata_day_30",
    metric: {
      ...baseInput().metric,
      metric_definition_ref: "customer_metric_catalog:support_median_resolution_hours",
      normalization_denominator: undefined
    }
  }));
  const result = validateCustomerMetricIntake(intake);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(intake.data_spine_source.intake_mode, "customer_metric_aggregate_export");
  assert.equal(intake.layer_3_metric_context.summary_type, "customer_owned_aggregate_metric_summary");
  assert.equal(intake.layer_3_metric_context.source_ref, "support_metric_export_metadata_day_30");
  assert.equal(intake.feeds.layer_3_business_system_outcomes, true);
});

test("stale, owner-missing, or metric-definition-incomplete metrics hold without downstream feeds", () => {
  const stale = buildCustomerMetricIntake(baseInput({
    freshnessState: "stale"
  }));
  const ownerMissing = buildCustomerMetricIntake(baseInput({
    ownerApprovalState: "submitted"
  }));
  const noDefinitionContext = buildCustomerMetricIntake(baseInput({
    metric: {
      ...baseInput().metric,
      normalization_denominator: undefined,
      metric_definition_ref: undefined
    }
  }));

  for (const intake of [stale, ownerMissing, noDefinitionContext]) {
    const result = validateCustomerMetricIntake(intake);
    assert.equal(result.valid, true, result.gaps.join("; "));
    assert.equal(intake.decision, "HELD_FOR_METRIC_EVIDENCE");
    assert.equal(intake.feeds.data_spine_customer_metric_source, false);
    assert.equal(intake.feeds.measurement_cell_selected_metric, false);
    assert.equal(intake.feeds.layer_3_business_system_outcomes, false);
    assert.equal(intake.feeds.finance_context_investigation_planning, false);
  }
});

test("Measurement Plan metric and window drift fail closed before Data Spine feed", () => {
  const plan = fullPlan();
  const originalInput = baseInput({ measurementPlan: plan });
  const driftedPlan = clone(plan);
  driftedPlan.metric_selection.primary_metric.metric_id = "marketing_pipeline_created";
  driftedPlan.windows.comparison_window_end = "2026-07-31";
  const intake = buildCustomerMetricIntake({
    ...originalInput,
    measurementPlan: driftedPlan
  });
  const result = validateCustomerMetricIntake(intake);

  assert.equal(result.valid, false);
  assert.equal(result.feeds.data_spine_customer_metric_source, false);
  assert.equal(result.feeds.measurement_cell_selected_metric, false);
  assert.ok(result.gaps.some((gap) => gap.includes("metric.metric_id")));
  assert.ok(result.gaps.some((gap) => gap.includes("comparisonWindow")));
});

test("unsafe raw, person-level, ROI, probability, route, persistence, and threshold fields fail closed", () => {
  const intake = buildCustomerMetricIntake(baseInput({
    raw_rows: [{ user_id: "u_123", response: "raw row" }],
    confidence_percent: 88,
    probability: 0.74,
    roi_value: 60000000,
    ebitda_impact: 12000000,
    causal_effect: 0.4,
    productivity_lift: 0.2,
    threshold: 60,
    creates_backend_routes: true,
    creates_frontend_ui: true,
    persistence_table: "customer_metric_intakes"
  }));
  const result = validateCustomerMetricIntake(intake);

  assert.equal(result.valid, false);
  assert.equal(result.feeds.data_spine_customer_metric_source, false);
  assert.equal(result.feeds.measurement_cell_selected_metric, false);
  assert.ok(result.gaps.some((gap) => gap.includes("raw_rows")));
  assert.ok(result.gaps.some((gap) => gap.includes("confidence_percent")));
  assert.ok(result.gaps.some((gap) => gap.includes("probability")));
  assert.ok(result.gaps.some((gap) => gap.includes("roi_value")));
  assert.ok(result.gaps.some((gap) => gap.includes("ebitda_impact")));
  assert.ok(result.gaps.some((gap) => gap.includes("causal_effect")));
  assert.ok(result.gaps.some((gap) => gap.includes("productivity_lift")));
  assert.ok(result.gaps.some((gap) => gap.includes("threshold")));
  assert.ok(result.gaps.some((gap) => gap.includes("creates_backend_routes")));
  assert.ok(result.gaps.some((gap) => gap.includes("creates_frontend_ui")));
  assert.ok(result.gaps.some((gap) => gap.includes("persistence_table")));
});
