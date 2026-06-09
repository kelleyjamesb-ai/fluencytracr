import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildSupportValueEvidencePack } from "./generate_ai_value_support_pack.mjs";
import { validateSupportPilotReadiness } from "./validate_ai_value_support_pilot.mjs";
import {
  blueprintToSupportValueInput,
  blueprintToWorkshopResponse,
  validateAiValueBlueprint
} from "./validate_ai_value_blueprint.mjs";

const baseBlueprint = {
  schema_version: "FT_AI_VALUE_BLUEPRINT_2026_06",
  blueprint_id: "bp_customer_support_case_resolution",
  org_id: "org-northstar-enterprise",
  workflow_family: "customer_support_case_resolution",
  workflow_name: "Customer support case resolution",
  business_owner: {
    role: "customer_support_business_sponsor",
    approval_state: "PRESENT"
  },
  process_discovery: {
    current_state_steps: [
      "Support agent searches knowledge sources",
      "Support agent drafts response",
      "Support agent escalates unresolved cases"
    ],
    future_state_steps: [
      "Support agent uses Search and Assistant for knowledge access",
      "Approved Skills and agents support repeatable resolution workflows",
      "Verification and recovery signals are reviewed in aggregate"
    ]
  },
  value_hypothesis:
    "AI-assisted support work may be associated with faster case resolution, lower escalation, and improved knowledge reuse.",
  value_routes: {
    primary: "CAPACITY_CREATION",
    secondary: ["COST_REDUCTION", "QUALITY_IMPROVEMENT", "EXPERIENCE_IMPROVEMENT"]
  },
  windows: {
    baseline: "2026-02-01_to_2026-03-31",
    comparison: "2026-04-01_to_2026-05-31"
  },
  source_requirements: {
    source_coverage: {
      ai_activity: "PRESENT",
      workflow: "PRESENT",
      outcome: "PRESENT",
      baseline: "PRESENT",
      trust: "PRESENT",
      assumptions: "CAVEATED",
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
    }
  },
  assumption_ledger: [
    { assumption_id: "case_mix_stability", state: "PRESENT", owner: "support_operations" },
    { assumption_id: "volume_context", state: "CAVEATED", owner: "support_operations" },
    { assumption_id: "staffing_and_coverage_context", state: "MISSING", owner: "support_leader" },
    { assumption_id: "channel_mix_context", state: "MISSING", owner: "support_operations" },
    { assumption_id: "process_or_policy_context", state: "MISSING", owner: "business_sponsor" },
    { assumption_id: "knowledge_base_context", state: "MISSING", owner: "knowledge_owner" },
    { assumption_id: "metric_definition_stability", state: "MISSING", owner: "data_owner" },
    { assumption_id: "ai_rollout_context", state: "MISSING", owner: "aiom" }
  ],
  blocked_claims: [
    "roi_proof",
    "causality_claim",
    "individual_scoring",
    "team_or_manager_ranking",
    "hr_analytics",
    "dashboard_or_runtime_implementation"
  ],
  governance_boundaries: {
    requires_raw_data: false,
    requires_hr_analytics: false,
    requires_roi_calculation: false,
    requires_causality_claim: false,
    requires_individual_scoring: false,
    requires_dashboard: false,
    requires_runtime_service: false
  }
};

function blueprintWith(patch) {
  return {
    ...structuredClone(baseBlueprint),
    ...patch
  };
}

test("validates a support blueprint and feeds the existing pilot and evidence paths", () => {
  const result = validateAiValueBlueprint(baseBlueprint);
  const workshopResponse = blueprintToWorkshopResponse(baseBlueprint);
  const pilotDecision = validateSupportPilotReadiness(workshopResponse);
  const supportValueInput = blueprintToSupportValueInput(baseBlueprint);
  const evidencePack = buildSupportValueEvidencePack(supportValueInput);

  assert.equal(result.valid, true);
  assert.deepEqual(result.gaps, []);
  assert.equal(workshopResponse.source, "bp_customer_support_case_resolution");
  assert.equal(pilotDecision.decision, "HOLD_FOR_ASSUMPTIONS");
  assert.equal(supportValueInput.workflow_family, "customer_support_case_resolution");
  assert.equal(evidencePack.claim_confidence.overall_state, "CAVEATED");
});

test("seeded Customer Support blueprint fixture is valid", () => {
  const fixture = JSON.parse(
    readFileSync(
      "docs/contracts/ai-value-intelligence/examples/customer-support-blueprint.json",
      "utf8"
    )
  );

  const result = validateAiValueBlueprint(fixture);

  assert.equal(result.valid, true);
  assert.equal(result.blueprint_id, "bp_customer_support_case_resolution");
});

test("rejects missing required workflow fields", () => {
  const blueprint = blueprintWith({ workflow_family: "" });

  const result = validateAiValueBlueprint(blueprint);

  assert.equal(result.valid, false);
  assert.equal(result.gaps.includes("workflow_family is missing"), true);
});

test("rejects an invalid primary value route", () => {
  const blueprint = blueprintWith({
    value_routes: {
      ...baseBlueprint.value_routes,
      primary: "PRODUCTIVITY_SCORE"
    }
  });

  const result = validateAiValueBlueprint(blueprint);

  assert.equal(result.valid, false);
  assert.equal(result.gaps.includes("value_routes.primary is invalid: PRODUCTIVITY_SCORE"), true);
});

test("rejects missing source requirements", () => {
  const blueprint = structuredClone(baseBlueprint);
  delete blueprint.source_requirements.approved_aggregate_inputs.outcome_signals;

  const result = validateAiValueBlueprint(blueprint);

  assert.equal(result.valid, false);
  assert.equal(
    result.gaps.includes("source_requirements.approved_aggregate_inputs.outcome_signals is missing"),
    true
  );
});

test("rejects incomplete assumption ledger", () => {
  const blueprint = structuredClone(baseBlueprint);
  blueprint.assumption_ledger = blueprint.assumption_ledger.filter(
    (assumption) => assumption.assumption_id !== "metric_definition_stability"
  );

  const result = validateAiValueBlueprint(blueprint);

  assert.equal(result.valid, false);
  assert.equal(result.gaps.includes("assumption metric_definition_stability is missing"), true);
});

test("rejects missing blocked claims and unsafe governance boundaries", () => {
  const blueprint = blueprintWith({
    blocked_claims: ["roi_proof"],
    governance_boundaries: {
      ...baseBlueprint.governance_boundaries,
      requires_roi_calculation: true
    },
    sample_ticket_text: "Customer asked for a refund."
  });

  const result = validateAiValueBlueprint(blueprint);

  assert.equal(result.valid, false);
  assert.equal(result.gaps.includes("blocked_claims missing causality_claim"), true);
  assert.equal(result.gaps.includes("Forbidden field detected: sample_ticket_text"), true);
  assert.equal(result.gaps.includes("governance_boundaries.requires_roi_calculation is true"), true);
});
