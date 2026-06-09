import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { validateSupportPilotReadiness } from "./validate_ai_value_support_pilot.mjs";

const baseResponse = {
  schema_version: "FT_AI_VALUE_SUPPORT_WORKSHOP_RESPONSE_2026_06",
  org_id: "org-northstar-enterprise",
  workflow_family: "customer_support_case_resolution",
  primary_value_route: "CAPACITY_CREATION",
  baseline_window: "2026-02-01_to_2026-03-31",
  comparison_window: "2026-04-01_to_2026-05-31",
  source_coverage: {
    ai_activity: "PRESENT",
    workflow: "PRESENT",
    outcome: "PRESENT",
    baseline: "PRESENT",
    trust: "PRESENT",
    assumptions: "PRESENT",
    suppression: "PRESENT"
  },
  approved_aggregate_inputs: {
    case_population: {
      total_cases: 2480,
      eligible_cases: 2300,
      excluded_cases: 180
    },
    ai_activity: {
      assistant_sessions: 1840,
      search_sessions: 2260,
      skill_invocations: 312,
      agent_runs: 148
    },
    trust_and_friction: {
      verification_attached_episodes: 780,
      recovery_episodes: 96,
      abandonment_episodes: 41
    },
    outcome_signals: {
      median_resolution_hours: { baseline: 18.4, comparison: 15.1, unit: "hours" },
      escalation_rate: { baseline: 0.18, comparison: 0.14, unit: "share" },
      reopen_rate: { baseline: 0.075, comparison: 0.061, unit: "share" },
      backlog_count: { baseline: 1240, comparison: 1102, unit: "cases" }
    }
  },
  assumptions: [
    { assumption_id: "case_mix_stability", state: "PRESENT", owner: "support_operations" },
    { assumption_id: "volume_context", state: "PRESENT", owner: "support_operations" },
    { assumption_id: "staffing_and_coverage_context", state: "PRESENT", owner: "support_leader" },
    { assumption_id: "channel_mix_context", state: "PRESENT", owner: "support_operations" },
    { assumption_id: "process_or_policy_context", state: "PRESENT", owner: "business_sponsor" },
    { assumption_id: "knowledge_base_context", state: "PRESENT", owner: "knowledge_owner" },
    { assumption_id: "metric_definition_stability", state: "PRESENT", owner: "data_owner" },
    { assumption_id: "ai_rollout_context", state: "PRESENT", owner: "aiom" }
  ],
  governance_stop_conditions: {
    requires_raw_data: false,
    requires_hr_analytics: false,
    requires_roi_calculation: false,
    requires_causality_claim: false,
    requires_individual_scoring: false,
    requires_dashboard: false,
    requires_runtime_service: false
  }
};

function responseWith(patch) {
  return {
    ...structuredClone(baseResponse),
    ...patch
  };
}

test("returns PROCEED_TO_GOVERNED_PACKET when required aggregate evidence is ready", () => {
  const result = validateSupportPilotReadiness(baseResponse);

  assert.equal(result.decision, "PROCEED_TO_GOVERNED_PACKET");
  assert.equal(result.ready, true);
  assert.deepEqual(result.blocked_claims, [
    "ROI proof",
    "causality claims",
    "individual scoring",
    "HR analytics",
    "dashboard or runtime implementation"
  ]);
});

test("returns HOLD_FOR_ASSUMPTIONS when material assumptions are incomplete", () => {
  const input = structuredClone(baseResponse);
  input.assumptions.find(
    (assumption) => assumption.assumption_id === "staffing_and_coverage_context"
  ).state = "MISSING";

  const result = validateSupportPilotReadiness(input);

  assert.equal(result.decision, "HOLD_FOR_ASSUMPTIONS");
  assert.equal(result.ready, false);
  assert.equal(
    result.gaps.some((gap) => gap.includes("staffing_and_coverage_context")),
    true
  );
});

test("returns HOLD_FOR_SOURCE_COVERAGE when a required source lane is held", () => {
  const input = responseWith({
    source_coverage: {
      ...baseResponse.source_coverage,
      outcome: "HELD"
    }
  });

  const result = validateSupportPilotReadiness(input);

  assert.equal(result.decision, "HOLD_FOR_SOURCE_COVERAGE");
  assert.equal(result.ready, false);
  assert.equal(result.gaps.includes("source_coverage.outcome is HELD"), true);
});

test("returns HOLD_FOR_BASELINE when baseline evidence is missing", () => {
  const input = responseWith({
    baseline_window: "",
    source_coverage: {
      ...baseResponse.source_coverage,
      baseline: "MISSING"
    }
  });

  const result = validateSupportPilotReadiness(input);

  assert.equal(result.decision, "HOLD_FOR_BASELINE");
  assert.equal(result.ready, false);
  assert.equal(result.gaps.includes("baseline_window is missing"), true);
});

test("returns STOP_FOR_GOVERNANCE_REVIEW when unsafe fields or stop conditions appear", () => {
  const input = responseWith({
    sample_ticket_text: "Customer asked for a refund.",
    governance_stop_conditions: {
      ...baseResponse.governance_stop_conditions,
      requires_roi_calculation: true
    }
  });

  const result = validateSupportPilotReadiness(input);

  assert.equal(result.decision, "STOP_FOR_GOVERNANCE_REVIEW");
  assert.equal(result.ready, false);
  assert.equal(result.gaps.includes("Forbidden field detected: sample_ticket_text"), true);
  assert.equal(result.gaps.includes("governance_stop_conditions.requires_roi_calculation is true"), true);
});

test("seeded workshop response fixture emits HOLD_FOR_ASSUMPTIONS", () => {
  const fixture = JSON.parse(
    readFileSync(
      "docs/contracts/ai-value-intelligence/examples/customer-support-workshop-response.json",
      "utf8"
    )
  );

  const result = validateSupportPilotReadiness(fixture);

  assert.equal(result.decision, "HOLD_FOR_ASSUMPTIONS");
  assert.equal(result.ready, false);
  assert.equal(result.source, "customer-support-workshop-response");
});
