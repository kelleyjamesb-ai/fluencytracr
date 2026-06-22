import assert from "node:assert/strict";
import test from "node:test";

import {
  AI_VALUE_ASSUMPTION_GOVERNANCE_OPERATOR_SOURCE_HANDOFF_SCHEMA_VERSION,
  buildAssumptionGovernanceOperatorSourceHandoff,
  validateAssumptionGovernanceOperatorSourceHandoff
} from "../shared/dist/aiValueEngine/index.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function baseSource(overrides = {}) {
  return {
    state: "present",
    intake_mode: "assumption_approval",
    source_ref: "support_assumption_approval_day_30",
    org_id: "org_northstar",
    client_id: "client_northstar",
    workflow_family: "customer_support_case_resolution",
    function_area: "support",
    cohort_key: "workflow_family:customer_support_case_resolution|eligible_cases:2300",
    baseline_window: {
      window_start: "2026-06-01",
      window_end: "2026-06-30"
    },
    comparison_window: {
      window_start: "2026-07-01",
      window_end: "2026-07-31"
    },
    owner_role: "finance_or_business_owner",
    owner_approval_state: "approved",
    review_state: "clear",
    aggregate_only: true,
    ...overrides
  };
}

function readyHandoff(lane = "assumption", sourceOverrides = {}) {
  const source = lane === "governance"
    ? baseSource({
        intake_mode: "governance_attestation",
        source_ref: "support_governance_attestation_day_30",
        owner_role: "governance_owner",
        ...sourceOverrides
      })
    : baseSource(sourceOverrides);
  return buildAssumptionGovernanceOperatorSourceHandoff({
    lane,
    source,
    generatedAt: "2026-06-22T00:00:00.000Z"
  });
}

test("ready assumption source handoff emits operator source and package reference only", () => {
  const handoff = readyHandoff("assumption");
  const result = validateAssumptionGovernanceOperatorSourceHandoff(handoff);

  assert.equal(handoff.schema_version, AI_VALUE_ASSUMPTION_GOVERNANCE_OPERATOR_SOURCE_HANDOFF_SCHEMA_VERSION);
  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(handoff.lane_key, "assumption");
  assert.equal(handoff.decision, "READY_FOR_OPERATOR_INTAKE");
  assert.equal(handoff.operator_source.intake_mode, "assumption_approval");
  assert.equal(handoff.operator_source.source_ref, "support_assumption_approval_day_30");
  assert.equal(handoff.assumption_context.source_ref, handoff.source_ref);
  assert.equal(handoff.assumption_context.context_role, "customer_owned_assumption_approval_context_only");
  assert.equal(handoff.governance_context, null);
  assert.equal(handoff.source_package_reference.source_package_type, "assumption_approval_export");
  assert.equal(handoff.source_package_reference.source_refs.assumption_approval_export_id, handoff.source_ref);
  assert.equal(handoff.feeds.operator_intake_source, true);
  assert.equal(handoff.feeds.data_spine_assumption_source, true);
  assert.equal(handoff.feeds.data_spine_governance_source, false);
  assert.equal(handoff.feeds.assumption_context_fragment, true);
  assert.equal(handoff.feeds.governance_context_fragment, false);
  assert.equal(handoff.feeds.measurement_cell_direct_feed, false);
  assert.equal(handoff.feeds.finance_context_investigation, false);
  assert.equal(handoff.feeds.confidence_model, false);
  assert.equal(handoff.feeds.customer_facing_financial_output, false);
});

test("ready governance source handoff emits governance context and package reference only", () => {
  const handoff = readyHandoff("governance");
  const result = validateAssumptionGovernanceOperatorSourceHandoff(handoff);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(handoff.lane_key, "governance");
  assert.equal(handoff.decision, "READY_FOR_OPERATOR_INTAKE");
  assert.equal(handoff.operator_source.intake_mode, "governance_attestation");
  assert.equal(handoff.governance_context.source_ref, handoff.source_ref);
  assert.equal(handoff.governance_context.context_role, "governance_attestation_context_only");
  assert.equal(handoff.assumption_context, null);
  assert.equal(handoff.source_package_reference.source_package_type, "governance_control_export");
  assert.equal(handoff.source_package_reference.source_refs.governance_control_export_id, handoff.source_ref);
  assert.equal(handoff.feeds.data_spine_assumption_source, false);
  assert.equal(handoff.feeds.data_spine_governance_source, true);
  assert.equal(handoff.feeds.assumption_context_fragment, false);
  assert.equal(handoff.feeds.governance_context_fragment, true);
  assert.equal(handoff.feeds.finance_context_investigation, false);
  assert.equal(handoff.feeds.customer_facing_financial_output, false);
});

test("held assumption and governance posture stays structurally valid but non-feedable", () => {
  for (const [lane, sourceOverrides] of [
    ["assumption", { owner_approval_state: "submitted" }],
    ["assumption", { review_state: "held" }],
    ["governance", { state: "held" }],
    ["governance", { review_state: "suppressed" }]
  ]) {
    const handoff = readyHandoff(lane, sourceOverrides);
    const result = validateAssumptionGovernanceOperatorSourceHandoff(handoff);

    assert.equal(result.valid, true, result.gaps.join("; "));
    assert.equal(handoff.decision, "HELD_NO_FEEDABLE_SOURCE");
    assert.equal(handoff.operator_source, null);
    assert.equal(handoff.assumption_context, null);
    assert.equal(handoff.governance_context, null);
    assert.equal(handoff.source_package_reference, null);
    assert.equal(result.feeds.operator_intake_source, false);
    assert.equal(result.feeds.data_spine_assumption_source, false);
    assert.equal(result.feeds.data_spine_governance_source, false);
    assert.equal(result.feeds.finance_context_investigation, false);
    assert.equal(result.feeds.customer_facing_financial_output, false);
  }
});

test("held handoff cannot carry stale source or context fragments", () => {
  const held = readyHandoff("assumption", { owner_approval_state: "submitted" });
  const ready = readyHandoff("assumption");
  const stale = clone(held);
  stale.operator_source = ready.operator_source;
  stale.assumption_context = ready.assumption_context;
  stale.source_package_reference = ready.source_package_reference;

  const result = validateAssumptionGovernanceOperatorSourceHandoff(stale);

  assert.equal(result.valid, false);
  for (const token of [
    "operator_source",
    "assumption_context",
    "source_package_reference"
  ]) {
    assert.ok(result.gaps.some((gap) => gap.includes(`must not carry ${token}`)), token);
  }
  assert.equal(result.feeds.operator_intake_source, false);
});

test("source, context, and package reference drift fails closed", () => {
  const handoff = readyHandoff("governance");
  const drifted = clone(handoff);
  drifted.operator_source.client_id = "client_other";
  drifted.governance_context.workflow_family = "other_workflow";
  drifted.governance_context.source_ref = "other_governance_source";
  drifted.source_package_reference.source_package_type = "assumption_approval_export";
  drifted.source_package_reference.source_refs = {
    assumption_approval_export_id: handoff.source_ref
  };

  const result = validateAssumptionGovernanceOperatorSourceHandoff(drifted);

  assert.equal(result.valid, false);
  for (const token of [
    "operator_source.client_id",
    "governance_context.workflow_family",
    "governance_context.source_ref",
    "source_package_reference.source_package_type",
    "source_package_reference.source_refs.governance_control_export_id"
  ]) {
    assert.ok(result.gaps.some((gap) => gap.includes(token)), `missing gap for ${token}`);
  }
  assert.equal(result.feeds.operator_intake_source, false);
});

test("unsafe refs raw fields and finance confidence side doors fail closed without echoing unsafe values", () => {
  const unsafeValue = "jane@example.com select * from raw_events roi_probability_export";
  const handoff = readyHandoff("assumption");
  handoff.source_ref = unsafeValue;
  handoff.operator_source.source_ref = unsafeValue;
  handoff.assumption_context.source_ref = unsafeValue;
  handoff.source_package_reference.source_refs.assumption_approval_export_id = unsafeValue;
  handoff.operator_source.raw_rows = [{ user_id: "user_123" }];
  handoff.assumption_context.query_text = "select employee_email from raw_events";
  handoff.assumption_context.prompt_transcript = "raw transcript";
  handoff.roi_value = 1200000;
  handoff.contribution_probability = 0.82;
  handoff.confidence_percentage = 91;
  handoff.financial_attribution = true;
  handoff.customer_facing_financial_output = true;
  handoff.backend_route = "/api/assumption-governance-handoff";
  handoff.persistence_table = "assumption_governance_handoffs";
  handoff.allowed_uses.push("finance_context_investigation", "confidence_model_execution");
  handoff.feeds.finance_context_investigation = true;
  handoff.feeds.confidence_model = true;

  const result = validateAssumptionGovernanceOperatorSourceHandoff(handoff);

  assert.equal(result.valid, false);
  assert.ok(!result.gaps.some((gap) => gap.includes(unsafeValue)));
  for (const token of [
    "source_ref",
    "operator_source.raw_rows",
    "assumption_context.query_text",
    "assumption_context.prompt_transcript",
    "roi_value",
    "contribution_probability",
    "confidence_percentage",
    "financial_attribution",
    "customer_facing_financial_output",
    "backend_route",
    "persistence_table",
    "allowed_uses contains unsupported use: finance_context_investigation",
    "allowed_uses contains unsupported use: confidence_model_execution",
    "feeds.finance_context_investigation",
    "feeds.confidence_model"
  ]) {
    assert.ok(result.gaps.some((gap) => gap.includes(token)), `missing gap for ${token}`);
  }
  assert.equal(result.feeds.operator_intake_source, false);
  assert.equal(result.feeds.finance_context_investigation, false);
  assert.equal(result.feeds.confidence_model, false);
  assert.equal(result.feeds.customer_facing_financial_output, false);
});
