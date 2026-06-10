import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  validateAiValueAgentHandoff,
  buildScenarioToReadinessHandoff
} from "./validate_ai_value_agent_harness.mjs";

const requiredBlockedCapture = [
  "raw_prompt",
  "raw_response",
  "message_text",
  "file_content",
  "diff",
  "patch",
  "email",
  "user_id",
  "person_id",
  "customer_telemetry",
  "roi_calculation",
  "causality_claim",
  "individual_scoring"
];

const baseHandoff = {
  schema_version: "FT_AI_VALUE_AGENT_HANDOFF_2026_06",
  handoff_id: "handoff_support_scenario_to_readiness_v1",
  workflow_family: "customer_support_case_resolution",
  value_route: "CAPACITY_CREATION",
  source_agent_role: "SCENARIO_AGENT",
  target_agent_role: "EVIDENCE_READINESS_AGENT",
  object_type: "VALUE_SCENARIO",
  object_ref:
    "docs/contracts/ai-value-intelligence/examples/customer-support-value-scenario.json",
  task_contract: {
    objective:
      "Evaluate whether the Customer Support value scenario is ready for executive validation.",
    expected_output_type: "EVIDENCE_READINESS",
    expected_output_ref:
      "docs/contracts/ai-value-intelligence/examples/customer-support-evidence-readiness.json",
    validator_command: "npm run validate:ai-value-readiness"
  },
  model_selection: {
    policy: "DEFAULT_INHERIT",
    allowed_model_tiers: ["BALANCED", "FRONTIER"],
    selected_model_tier: "BALANCED",
    escalation_allowed: true,
    escalation_rule:
      "Escalate only for ambiguous governance, schema, or adapter failures."
  },
  tool_permissions: {
    read_scopes: [
      "docs/contracts/ai-value-intelligence/",
      "schemas/ai-value-intelligence/",
      "scripts/"
    ],
    write_scopes: ["docs/contracts/ai-value-intelligence/examples/"],
    allowed_tools: ["filesystem_read", "filesystem_write", "local_validator", "test_runner"],
    network_access: false,
    production_access: false,
    secrets_access: false,
    customer_data_access: false
  },
  verification_routing: {
    required_validators: ["npm run validate:ai-value-readiness"],
    required_tests: ["npm run test:ai-value-readiness"],
    reviewer_roles: ["REVIEWER_AGENT", "EVALUATOR_AGENT"]
  },
  ledger: {
    schema_version: "AR_LEDGER_2026_05",
    scope_ref: "docs/concepts/AI_VALUE_AGENTIC_PLATFORM_HARNESS.md",
    handoff_ref:
      "docs/contracts/ai-value-intelligence/examples/customer-support-agent-handoff.json",
    verification_refs: ["npm run test:ai-value-agent-harness"],
    required_caveats: ["Development-harness telemetry only."]
  },
  blocked_data_capture: requiredBlockedCapture,
  governance_boundaries: {
    customer_telemetry: false,
    production_agent_runtime: false,
    autonomous_customer_action: false,
    raw_prompt_or_response_storage: false,
    direct_identifier_capture: false,
    roi_calculation: false,
    causality_claim: false,
    individual_scoring: false,
    customer_facing_economic_output: false
  }
};

test("validates a governed AI Value agent handoff", () => {
  const result = validateAiValueAgentHandoff(baseHandoff);

  assert.equal(result.valid, true);
  assert.equal(result.handoff_id, "handoff_support_scenario_to_readiness_v1");
  assert.equal(result.source_agent_role, "SCENARIO_AGENT");
  assert.equal(result.target_agent_role, "EVIDENCE_READINESS_AGENT");
  assert.equal(result.object_type, "VALUE_SCENARIO");
  assert.equal(result.feeds.local_agent_run_ledger, true);
  assert.deepEqual(result.gaps, []);
});

test("seeded Customer Support agent handoff fixture is valid", () => {
  const fixture = JSON.parse(
    readFileSync(
      "docs/contracts/ai-value-intelligence/examples/customer-support-agent-handoff.json",
      "utf8"
    )
  );

  const result = validateAiValueAgentHandoff(fixture);

  assert.equal(result.valid, true);
  assert.equal(result.handoff_id, "handoff_support_scenario_to_readiness_v1");
});

test("builds a scenario-to-readiness handoff from a value scenario", () => {
  const scenario = JSON.parse(
    readFileSync(
      "docs/contracts/ai-value-intelligence/examples/customer-support-value-scenario.json",
      "utf8"
    )
  );

  const handoff = buildScenarioToReadinessHandoff(scenario);
  const result = validateAiValueAgentHandoff(handoff);

  assert.equal(result.valid, true);
  assert.equal(handoff.workflow_family, "customer_support_case_resolution");
  assert.equal(handoff.value_route, "CAPACITY_CREATION");
  assert.equal(handoff.source_agent_role, "SCENARIO_AGENT");
  assert.equal(handoff.target_agent_role, "EVIDENCE_READINESS_AGENT");
  assert.equal(handoff.object_type, "VALUE_SCENARIO");
  assert.deepEqual(handoff.verification_routing.required_validators, [
    "npm run validate:ai-value-readiness"
  ]);
  assert.deepEqual(handoff.verification_routing.required_tests, [
    "npm run test:ai-value-readiness"
  ]);
});

test("rejects unsupported agent roles and unsupported object types", () => {
  const handoff = structuredClone(baseHandoff);
  handoff.source_agent_role = "ROI_AGENT";
  handoff.target_agent_role = "HR_ANALYTICS_AGENT";
  handoff.object_type = "CUSTOMER_TELEMETRY";

  const result = validateAiValueAgentHandoff(handoff);

  assert.equal(result.valid, false);
  assert.equal(
    result.gaps.includes("source_agent_role is invalid: ROI_AGENT"),
    true
  );
  assert.equal(
    result.gaps.includes("target_agent_role is invalid: HR_ANALYTICS_AGENT"),
    true
  );
  assert.equal(
    result.gaps.includes("object_type is invalid: CUSTOMER_TELEMETRY"),
    true
  );
});

test("rejects unsafe model-selection policy", () => {
  const handoff = structuredClone(baseHandoff);
  handoff.model_selection.policy = "UNBOUNDED_AUTONOMY";
  handoff.model_selection.selected_model_tier = "UNREVIEWED_MODEL";

  const result = validateAiValueAgentHandoff(handoff);

  assert.equal(result.valid, false);
  assert.equal(
    result.gaps.includes("model_selection.policy is invalid: UNBOUNDED_AUTONOMY"),
    true
  );
  assert.equal(
    result.gaps.includes(
      "model_selection.selected_model_tier is invalid: UNREVIEWED_MODEL"
    ),
    true
  );
});

test("rejects unsafe tool permissions", () => {
  const handoff = structuredClone(baseHandoff);
  handoff.tool_permissions.network_access = true;
  handoff.tool_permissions.production_access = true;
  handoff.tool_permissions.secrets_access = true;
  handoff.tool_permissions.customer_data_access = true;

  const result = validateAiValueAgentHandoff(handoff);

  assert.equal(result.valid, false);
  assert.equal(result.gaps.includes("tool_permissions.network_access is true"), true);
  assert.equal(result.gaps.includes("tool_permissions.production_access is true"), true);
  assert.equal(result.gaps.includes("tool_permissions.secrets_access is true"), true);
  assert.equal(result.gaps.includes("tool_permissions.customer_data_access is true"), true);
});

test("rejects missing verification routing and ledger references", () => {
  const handoff = structuredClone(baseHandoff);
  handoff.verification_routing.required_validators = [];
  handoff.verification_routing.required_tests = [];
  handoff.ledger.verification_refs = [];
  handoff.ledger.required_caveats = [];

  const result = validateAiValueAgentHandoff(handoff);

  assert.equal(result.valid, false);
  assert.equal(
    result.gaps.includes(
      "verification_routing.required_validators must include at least one validator"
    ),
    true
  );
  assert.equal(
    result.gaps.includes(
      "verification_routing.required_tests must include at least one test command"
    ),
    true
  );
  assert.equal(
    result.gaps.includes("ledger.verification_refs must include at least one reference"),
    true
  );
  assert.equal(
    result.gaps.includes("ledger.required_caveats must include at least one caveat"),
    true
  );
});

test("rejects scenario validators for readiness-producing handoffs", () => {
  const handoff = structuredClone(baseHandoff);
  handoff.verification_routing.required_validators = [
    "npm run validate:ai-value-scenario"
  ];
  handoff.verification_routing.required_tests = [
    "npm run test:ai-value-scenario"
  ];

  const result = validateAiValueAgentHandoff(handoff);

  assert.equal(result.valid, false);
  assert.equal(
    result.gaps.includes(
      "verification_routing.required_validators must include npm run validate:ai-value-readiness"
    ),
    true
  );
  assert.equal(
    result.gaps.includes(
      "verification_routing.required_tests must include npm run test:ai-value-readiness"
    ),
    true
  );
});

test("rejects missing blocked data capture protections", () => {
  const handoff = structuredClone(baseHandoff);
  handoff.blocked_data_capture = ["raw_prompt"];

  const result = validateAiValueAgentHandoff(handoff);

  assert.equal(result.valid, false);
  assert.equal(result.gaps.includes("blocked_data_capture missing raw_response"), true);
  assert.equal(result.gaps.includes("blocked_data_capture missing customer_telemetry"), true);
  assert.equal(result.gaps.includes("blocked_data_capture missing individual_scoring"), true);
});

test("rejects forbidden raw fields and unsafe governance boundaries", () => {
  const handoff = structuredClone(baseHandoff);
  handoff.raw_prompt = "not allowed";
  handoff.message_text = "not allowed";
  handoff.governance_boundaries.roi_calculation = true;
  handoff.governance_boundaries.customer_facing_economic_output = true;

  const result = validateAiValueAgentHandoff(handoff);

  assert.equal(result.valid, false);
  assert.equal(result.gaps.includes("Forbidden field detected: message_text"), true);
  assert.equal(result.gaps.includes("Forbidden field detected: raw_prompt"), true);
  assert.equal(result.gaps.includes("governance_boundaries.roi_calculation is true"), true);
  assert.equal(
    result.gaps.includes(
      "governance_boundaries.customer_facing_economic_output is true"
    ),
    true
  );
});
