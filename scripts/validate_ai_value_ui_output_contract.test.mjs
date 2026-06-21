import assert from "node:assert/strict";
import test from "node:test";

import {
  AI_VALUE_UI_OUTPUT_SCHEMA_VERSION,
  buildValueHypothesisUiOutput,
  validateValueHypothesisUiOutput
} from "../shared/dist/aiValueEngine/index.js";

function packet(overrides = {}) {
  return {
    packet_id: "value_hypothesis_packet_ui_test",
    org_id: "org_example",
    measurement_plan_id: "measurement_plan_example_full_playbook_ready",
    readiness: {
      readiness_state: "BUSINESS_OWNER_REVIEW_READY",
      contribution_evidence_tier: "MATCHED_COMPARISON_READY"
    },
    review_flow: {
      current_review_label: "Business-owner review",
      review_sequence: ["Glean review", "Business-owner review"]
    },
    evidence_sources: {
      blueprint: {
        state: "present",
        source_ref: "blueprint_parse_support_approved"
      },
      ai_fluency: {
        state: "present",
        source_bound: true
      },
      vbd_token_context: {
        state: "present",
        token_usage_role: "spend_or_intensity_context_only"
      },
      selected_metric_movement: {
        state: "held",
        metric_id: "support_median_resolution_hours",
        owner_approval_state: "submitted",
        customer_owned_or_approved: false
      },
      measurement_cell: {
        state: "missing"
      }
    },
    missing_evidence: [
      "CUSTOMER_METRIC_REQUIRED",
      "MEASUREMENT_CELL_REQUIRED_FOR_FINANCE_CONTEXT"
    ],
    required_caveats: [
      "Internal readiness review only; not ROI proof, causality, productivity, financial attribution, or customer-facing financial output."
    ],
    blocked_claims: [
      "roi_proof",
      "financial_attribution",
      "causality_claim",
      "productivity_claim",
      "confidence_percentage",
      "customer_facing_financial_output"
    ],
    allowed_next_actions: ["glean_review", "business_owner_review"],
    review_boundaries: {
      roi_proof_allowed: false,
      causality_claim_allowed: false,
      productivity_claim_allowed: false,
      financial_output_allowed: false,
      customer_facing_output_allowed: false
    },
    ...overrides
  };
}

function dataSpine(overrides = {}) {
  return {
    readiness_state: "INTAKE_REVIEW_READY",
    missing_evidence: ["CUSTOMER_METRIC_REQUIRED"],
    next_actions: ["Submit or approve customer-owned aggregate metric evidence."],
    source_readiness: {
      blueprint: {
        state: "present",
        review_state: "clear",
        owner_approval_state: "approved",
        source_ref: "blueprint_parse_support_approved"
      },
      ai_fluency: {
        state: "present",
        review_state: "clear",
        owner_approval_state: "approved",
        source_ref: "ai_fluency_support_day_30"
      },
      vbd_token: {
        state: "present",
        review_state: "clear",
        owner_approval_state: "approved",
        source_ref: "scrubbed_glean_vbd_token_support_day_30"
      },
      customer_metric: {
        state: "held",
        review_state: "held",
        owner_approval_state: "submitted",
        source_ref: "support_metric_resolution_hours_day_30"
      },
      assumption: {
        state: "present",
        review_state: "clear",
        owner_approval_state: "approved",
        source_ref: "support_assumption_approval_day_30"
      },
      governance: {
        state: "present",
        review_state: "clear",
        owner_approval_state: "approved",
        source_ref: "support_governance_attestation_day_30"
      }
    },
    ...overrides
  };
}

test("UI output displays readiness, source lanes, gaps, caveats, and blocked claims", () => {
  const output = buildValueHypothesisUiOutput({
    packet: packet(),
    dataSpineReadiness: dataSpine(),
    generatedAt: "2026-06-20T00:00:00.000Z"
  });
  const result = validateValueHypothesisUiOutput(output);

  assert.equal(output.schema_version, AI_VALUE_UI_OUTPUT_SCHEMA_VERSION);
  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(output.display_mode, "internal_review_queue");
  assert.equal(output.current_readiness_state, "BUSINESS_OWNER_REVIEW_READY");
  assert.equal(output.current_review_label, "Business-owner review");
  assert.ok(output.ui_sections.includes("source_alignment"));
  assert.ok(output.ui_sections.includes("evidence_gaps"));
  assert.ok(output.ui_sections.includes("blocked_claims"));
  assert.ok(output.held_lanes.includes("customer_metric"));
  assert.ok(output.evidence_gaps.includes("CUSTOMER_METRIC_REQUIRED"));
  assert.ok(output.blocked_claims.includes("roi_proof"));
  assert.equal(output.boundary_policy.customer_facing_financial_output, false);
  assert.equal(result.feeds.customer_facing_output, false);
  assert.equal(result.feeds.financial_output, false);
  assert.equal(result.feeds.confidence_or_probability_output, false);
});

test("upload and review queue state can render without a packet", () => {
  const output = buildValueHypothesisUiOutput({
    dataSpineReadiness: dataSpine(),
    generatedAt: "2026-06-20T00:00:00.000Z"
  });
  const result = validateValueHypothesisUiOutput(output);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(output.display_mode, "internal_review_queue");
  assert.equal(output.current_readiness_state, "INTAKE_REVIEW_READY");
  assert.equal(output.current_review_label, "Glean review");
  assert.equal(output.primary_next_action, "collect_missing_aggregate_evidence");
  assert.ok(output.source_lanes.some((lane) =>
    lane.lane_id === "customer_metric" && lane.state === "held"
  ));
  assert.ok(!JSON.stringify(output).includes("executive proof"));
  assert.equal(output.boundary_policy.creates_frontend_ui, false);
});

test("UI output rejects ROI, financial attribution, confidence, probability, productivity, route, and persistence side doors", () => {
  const output = buildValueHypothesisUiOutput({
    packet: packet(),
    dataSpineReadiness: dataSpine(),
    generatedAt: "2026-06-20T00:00:00.000Z"
  });
  output.roi_value = 60000000;
  output.ebitda_impact = 12000000;
  output.confidence_percentage = 88;
  output.probability = 0.74;
  output.productivity_lift = 0.2;
  output.customer_ready_financial_output = true;
  output.creates_backend_routes = true;
  output.creates_frontend_ui = true;
  output.persistence_table = "ai_value_ui_outputs";
  output.cards.push({
    card_id: "unsafe_finance_card",
    title: "AI ROI proof",
    body: "Glean proved EBITDA impact with 88% confidence.",
    severity: "ready"
  });

  const result = validateValueHypothesisUiOutput(output);

  assert.equal(result.valid, false);
  assert.equal(result.feeds.customer_facing_output, false);
  assert.equal(result.feeds.financial_output, false);
  assert.equal(result.feeds.confidence_or_probability_output, false);
  for (const token of [
    "roi_value",
    "ebitda_impact",
    "confidence_percentage",
    "probability",
    "productivity_lift",
    "customer_ready_financial_output",
    "creates_backend_routes",
    "creates_frontend_ui",
    "persistence_table",
    "AI ROI proof"
  ]) {
    assert.ok(result.gaps.some((gap) => gap.includes(token)), `missing gap for ${token}`);
  }
});
