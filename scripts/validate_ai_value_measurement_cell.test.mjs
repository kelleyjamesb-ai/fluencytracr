import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildMeasurementCell,
  validateMeasurementCell
} from "../shared/dist/aiValueEngine/measurementCell.js";

const EXAMPLES = "docs/contracts/ai-value-measurement-cell/examples";

const clone = (value) => JSON.parse(JSON.stringify(value));
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

function baseInput(overrides = {}) {
  return {
    orgId: "org-northstar-enterprise",
    functionArea: "marketing",
    workflowFamily: "campaign_brief_to_launch",
    workflowId: "workflow_campaign_brief_to_launch",
    cohortKey: "function:marketing|eligible_seats:240",
    timeWindow: {
      time_window_id: "day_90",
      window_label: "Day 90",
      window_start: "2026-09-01",
      window_end: "2026-09-30",
      baseline_window: {
        window_start: "2026-06-01",
        window_end: "2026-06-30"
      },
      comparison_window: {
        window_start: "2026-09-01",
        window_end: "2026-09-30"
      },
      prior_window_ref: "measurement_cell_org_northstar_marketing_day_60"
    },
    blueprintAlignment: {
      value_route: "revenue_expansion",
      value_promise:
        "Shorten campaign planning cycles while maintaining quality review coverage.",
      expected_metric_id: "marketing_campaign_cycle_days",
      expected_metric_direction: "decrease",
      expected_metric_lag_days: 60,
      owner_role: "marketing_operations_leader",
      assumption_refs: ["blueprint_assumption_marketing_cycle_time"],
      source_ref: "blueprint_source_marketing_2026_q3"
    },
    aiFluencyContext: {
      evidence_state: "present",
      fluency_score: 72,
      dimension_scores: {
        confidence: 74,
        usage_quality: 70,
        behavior_change: 68,
        leadership_reinforcement: 71,
        capability_growth: 77
      },
      response_count: 126,
      suppression_state: "CLEAR",
      source_ref: "ai_fluency_marketing_day_90"
    },
    vbdContext: {
      evidence_state: "present",
      velocity: 76,
      breadth: 69,
      depth: 71,
      integration_score: 70.2,
      overall_vbd_score: 71.8,
      prior_overall_vbd_score: 49.4,
      vbd_quadrant: "high_fluency_flow",
      source_ref: "vbd_marketing_day_90",
      suppression_state: "CLEAR"
    },
    selectedMetric: {
      metric_id: "marketing_campaign_cycle_days",
      metric_name: "Campaign cycle time",
      metric_source_system: "customer_marketing_operations_system",
      metric_unit: "days",
      metric_direction: "decrease",
      metric_sensitivity: "high",
      expected_lag_days: 60,
      normalization_denominator: "approved_campaign_count",
      baseline_value: 42,
      comparison_value: 31,
      owner_approval_state: "approved",
      source_ref: "metric_export_marketing_campaign_cycle_day_90",
      suppression_state: "CLEAR"
    },
    tokenContext: {
      evidence_state: "present",
      token_total: 1880000,
      token_per_active_seat: 7833,
      token_intensity_band: "moderate",
      source_ref: "token_context_marketing_day_90"
    },
    confounders: [
      {
        confounder_type: "campaign_seasonality",
        state: "documented",
        source_ref: "marketing_ops_seasonality_note_2026_q3"
      }
    ],
    evidenceDesign: {
      design_type: "matched_comparison",
      design_strength_tier: "comparison_supported",
      comparison_cell_ref: "measurement_cell_org_northstar_marketing_lower_exposure_day_90",
      controls_documented: true,
      baseline_stability: "stable",
      source_ref: "research_design_marketing_day_90"
    },
    financeReviewContext: {
      finance_owner_state: "finance_context_review",
      financial_driver: "revenue_growth",
      metric_to_financial_driver_pathway:
        "Campaign cycle time is reviewed as a pipeline timing context, not financial attribution.",
      source_ref: "finance_context_marketing_day_90"
    },
    governance: {
      review_state: "FINANCE_CONTEXT_INVESTIGATION_READY"
    },
    ...overrides
  };
}

test("builds a valid finance-review-ready Measurement Cell without finance output", () => {
  const cell = buildMeasurementCell(baseInput());
  const result = validateMeasurementCell(cell);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(result.feeds.value_hypothesis_readiness_input, true);
  assert.equal(result.feeds.business_owner_metric_review, true);
  assert.equal(result.feeds.finance_context_investigation_planning, true);
  assert.equal(result.feeds.bayesian_research_design_planning, true);
  assert.equal(result.feeds.customer_facing_financial_output, false);
  assert.equal(cell.vbd_context.vbd_momentum, 22.4);
  assert.equal(cell.metric_movement.direction_adjusted_delta, 11);
  assert.equal(cell.value_proof_policy.measurement_cell_emits_confidence_percentage, false);
});

test("validates checked-in valid example", () => {
  const cell = readJson(`${EXAMPLES}/valid-finance-review-measurement-cell.json`);
  const result = validateMeasurementCell(cell);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(result.feeds.finance_context_investigation_planning, true);
  assert.equal(result.feeds.customer_facing_financial_output, false);
});

test("keeps suppressed example valid but unable to feed readiness", () => {
  const cell = readJson(`${EXAMPLES}/suppressed-measurement-cell.json`);
  const result = validateMeasurementCell(cell);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(result.feeds.value_hypothesis_readiness_input, false);
  assert.equal(result.feeds.finance_context_investigation_planning, false);
  assert.equal(result.feeds.customer_facing_financial_output, false);
});

test("builder does not emit feeds before validation", () => {
  const input = baseInput();
  input.vbdContext.suppression_state = "SUPPRESSED";
  const cell = buildMeasurementCell(input);

  assert.equal(Object.hasOwn(cell, "feeds"), false);
  const result = validateMeasurementCell(cell);
  assert.equal(result.valid, false);
  assert.equal(result.feeds.value_hypothesis_readiness_input, false);
});

test("keeps mismatched example invalid", () => {
  const cell = readJson(`${EXAMPLES}/metric-window-mismatch-measurement-cell.json`);
  const result = validateMeasurementCell(cell);

  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) => gap.includes("selected_metric.metric_id")));
  assert.ok(result.gaps.some((gap) => gap.includes("selected_metric.baseline_window")));
});

test("rejects source identity drift", () => {
  const cell = buildMeasurementCell(baseInput());
  cell.vbd_context.org_id = "org-other";
  cell.selected_metric.function_area = "sales";
  cell.token_context.cohort_key = "function:sales";

  const result = validateMeasurementCell(cell);

  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) => gap.includes("vbd_context.org_id")));
  assert.ok(result.gaps.some((gap) => gap.includes("selected_metric.function_area")));
  assert.ok(result.gaps.some((gap) => gap.includes("token_context.cohort_key")));
});

test("preserves and rejects input-level source identity drift", () => {
  const input = baseInput();
  input.vbdContext.org_id = "org-other";
  input.selectedMetric.function_area = "sales";
  input.tokenContext.cohort_key = "function:sales";

  const cell = buildMeasurementCell(input);
  const result = validateMeasurementCell(cell);

  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) => gap.includes("vbd_context.org_id")));
  assert.ok(result.gaps.some((gap) => gap.includes("selected_metric.function_area")));
  assert.ok(result.gaps.some((gap) => gap.includes("token_context.cohort_key")));
});

test("rejects top-level source_ref drift from nested source refs", () => {
  const cell = buildMeasurementCell(baseInput());
  cell.source_refs.metric_source_ref = "wrong_metric_ref";
  cell.source_refs.vbd_source_ref = "wrong_vbd_ref";

  const result = validateMeasurementCell(cell);

  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) => gap.includes("source_refs.metric_source_ref")));
  assert.ok(result.gaps.some((gap) => gap.includes("source_refs.vbd_source_ref")));
});

test("missing numeric metric values stay missing instead of becoming zero", () => {
  const cell = buildMeasurementCell(baseInput({
    selectedMetric: {
      ...baseInput().selectedMetric,
      baseline_value: null,
      comparison_value: ""
    }
  }));
  const result = validateMeasurementCell(cell);

  assert.equal(cell.selected_metric.baseline_value, null);
  assert.equal(cell.selected_metric.comparison_value, null);
  assert.equal(cell.metric_movement.movement_state, "missing");
  assert.equal(result.feeds.business_owner_metric_review, false);
  assert.equal(result.feeds.finance_context_investigation_planning, false);
});

test("rejects metric movement rescuing suppressed VBD evidence", () => {
  const cell = buildMeasurementCell(baseInput());
  cell.vbd_context.suppression_state = "SUPPRESSED";

  const result = validateMeasurementCell(cell);

  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) => gap.includes("suppressed Measurement Cells")));
  assert.ok(result.gaps.some((gap) => gap.includes("metric movement cannot rescue")));
  assert.equal(result.feeds.value_hypothesis_readiness_input, false);
});

test("rejects ROI, probability, and finance-output field injection", () => {
  const cell = buildMeasurementCell(baseInput());
  cell.confidence_percent = 0.82;
  cell.ai_contribution_probability = 0.74;
  cell.ebitda_impact = 1200000;
  cell.finance_prediction = "AI will improve EBITDA";
  cell.savings = 500000;
  cell.value_at_risk = 100000;
  cell.customer_facing_prediction = "AI will improve finance metrics";

  const result = validateMeasurementCell(cell);

  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) => gap.includes("confidence_percent")));
  assert.ok(result.gaps.some((gap) => gap.includes("ai_contribution_probability")));
  assert.ok(result.gaps.some((gap) => gap.includes("ebitda_impact")));
  assert.ok(result.gaps.some((gap) => gap.includes("finance_prediction")));
  assert.ok(result.gaps.some((gap) => gap.includes("savings")));
  assert.ok(result.gaps.some((gap) => gap.includes("value_at_risk")));
  assert.ok(result.gaps.some((gap) => gap.includes("customer_facing_prediction")));
});

test("rejects unsafe value-claim language inside allowed text fields", () => {
  const cell = buildMeasurementCell(baseInput());
  cell.finance_review_context.metric_to_financial_driver_pathway =
    "This proved ROI savings from AI and should be treated as EBITDA impact.";

  const result = validateMeasurementCell(cell);

  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) => gap.includes("Unsafe claim language")));
});

test("rejects person-level and workforce-risk field injection", () => {
  const cell = buildMeasurementCell(baseInput());
  cell.selected_metric.employee_email = "person@example.com";
  cell.ai_fluency_context.user_id = "u_123";
  cell.governance.privacy_boundary.contains_person_level_hris_records = true;

  const result = validateMeasurementCell(cell);

  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) => gap.includes("employee_email")));
  assert.ok(result.gaps.some((gap) => gap.includes("user_id")));
  assert.ok(result.gaps.some((gap) => gap.includes("contains_person_level_hris_records")));
});

test("rejects finance-review readiness without confounders and controls", () => {
  const cell = buildMeasurementCell(baseInput({
    confounders: [],
    evidenceDesign: {
      design_type: "matched_comparison",
      design_strength_tier: "comparison_supported",
      controls_documented: false,
      baseline_stability: "stable",
      source_ref: "research_design_marketing_day_90"
    }
  }));

  const result = validateMeasurementCell(cell);

  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) => gap.includes("documented confounders")));
  assert.ok(result.gaps.some((gap) => gap.includes("controls_documented true")));
  assert.equal(result.feeds.finance_context_investigation_planning, false);
});

test("rejects contradictory evidence design type and strength tier", () => {
  const cell = buildMeasurementCell(baseInput());
  cell.evidence_design.design_type = "pre_post";
  cell.evidence_design.design_strength_tier = "controlled_test_candidate";

  const result = validateMeasurementCell(cell);

  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) => gap.includes("design_strength_tier")));
});

test("classifies exact maintain movement as expected direction", () => {
  const input = baseInput();
  input.blueprintAlignment.expected_metric_direction = "maintain";
  input.selectedMetric.metric_direction = "maintain";
  input.selectedMetric.baseline_value = 96;
  input.selectedMetric.comparison_value = 96;

  const cell = buildMeasurementCell(input);
  const result = validateMeasurementCell(cell);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(cell.metric_movement.direction_adjusted_delta, 0);
  assert.equal(cell.metric_movement.moved_in_expected_direction, true);
});

test("rejects metric window mismatch", () => {
  const cell = buildMeasurementCell(baseInput());
  cell.selected_metric.baseline_window = {
    window_start: "2026-05-01",
    window_end: "2026-05-31"
  };
  cell.selected_metric.comparison_window = {
    window_start: "2026-08-01",
    window_end: "2026-08-31"
  };

  const result = validateMeasurementCell(cell);

  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) => gap.includes("selected_metric.baseline_window")));
  assert.ok(result.gaps.some((gap) => gap.includes("selected_metric.comparison_window")));
});

test("rejects finance-action overreach through claim boundary", () => {
  const cell = buildMeasurementCell(baseInput());
  cell.governance.claim_boundary.customer_facing_output_allowed = true;
  cell.governance.claim_boundary.confidence_percentage_allowed = true;

  const result = validateMeasurementCell(cell);

  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) => gap.includes("customer_facing_output_allowed")));
  assert.ok(result.gaps.some((gap) => gap.includes("confidence_percentage_allowed")));
});
