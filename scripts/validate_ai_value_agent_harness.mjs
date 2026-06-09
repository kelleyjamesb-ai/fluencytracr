#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_INPUT =
  "docs/contracts/ai-value-intelligence/examples/customer-support-agent-handoff.json";

const RESULT_SCHEMA_VERSION = "FT_AI_VALUE_AGENT_HANDOFF_VALIDATION_2026_06";

const AGENT_ROLES = new Set([
  "BLUEPRINT_AGENT",
  "METRICS_AGENT",
  "SCENARIO_AGENT",
  "EVIDENCE_READINESS_AGENT",
  "CLAIM_BOUNDARY_AGENT",
  "EXECUTIVE_READOUT_AGENT",
  "REVIEWER_AGENT",
  "EVALUATOR_AGENT",
  "INTEGRATOR_AGENT"
]);

const OBJECT_TYPES = new Set([
  "BLUEPRINT",
  "METRICS_MAPPING",
  "VALUE_SCENARIO",
  "EVIDENCE_READINESS",
  "CLAIM_BOUNDARY",
  "EXECUTIVE_READOUT"
]);

const MODEL_POLICIES = new Set([
  "DEFAULT_INHERIT",
  "SMALL_FAST_VALIDATOR",
  "SPECIALIST_UPGRADE",
  "FRONTIER_REVIEW"
]);

const MODEL_TIERS = new Set(["FAST", "BALANCED", "FRONTIER"]);

const REQUIRED_BLOCKED_CAPTURE = [
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

const TOOL_PERMISSION_BOUNDARIES = [
  "network_access",
  "production_access",
  "secrets_access",
  "customer_data_access"
];

const GOVERNANCE_BOUNDARIES = [
  "customer_telemetry",
  "production_agent_runtime",
  "autonomous_customer_action",
  "raw_prompt_or_response_storage",
  "direct_identifier_capture",
  "roi_calculation",
  "causality_claim",
  "individual_scoring",
  "customer_facing_economic_output"
];

const FORBIDDEN_KEY_PATTERNS = [
  /prompt/i,
  /response/i,
  /message_text/i,
  /file_content/i,
  /^diff$/i,
  /^patch$/i,
  /email/i,
  /user_id/i,
  /person_id/i,
  /employee/i,
  /manager/i,
  /customer_telemetry/i,
  /raw_/i,
  /hris/i,
  /roi_calculation/i,
  /dollar/i,
  /productivity/i,
  /causal/i,
  /individual_scoring/i
];

function parseArgs(argv) {
  const args = {
    input: DEFAULT_INPUT,
    output: null
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--input") {
      args.input = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--output") {
      args.output = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: node scripts/validate_ai_value_agent_harness.mjs [--input path] [--output path]"
      );
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function requireField(value, path, gaps) {
  if (!value) {
    gaps.push(`${path} is missing`);
  }
}

function isForbiddenKey(key) {
  return FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function collectForbiddenFields(value, fields = new Set()) {
  if (!value || typeof value !== "object") {
    return fields;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectForbiddenFields(item, fields);
    }
    return fields;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (key === "blocked_data_capture" || key === "governance_boundaries") {
      continue;
    }
    if (isForbiddenKey(key)) {
      fields.add(key);
    }
    collectForbiddenFields(nested, fields);
  }
  return fields;
}

function collectTopLevelGaps(handoff) {
  const gaps = [];
  for (const field of [
    "schema_version",
    "handoff_id",
    "workflow_family",
    "value_route",
    "source_agent_role",
    "target_agent_role",
    "object_type",
    "object_ref",
    "task_contract",
    "model_selection",
    "tool_permissions",
    "verification_routing",
    "ledger",
    "blocked_data_capture",
    "governance_boundaries"
  ]) {
    requireField(handoff?.[field], field, gaps);
  }
  if (handoff?.schema_version &&
      handoff.schema_version !== "FT_AI_VALUE_AGENT_HANDOFF_2026_06") {
    gaps.push(`schema_version is invalid: ${handoff.schema_version}`);
  }
  if (handoff?.source_agent_role && !AGENT_ROLES.has(handoff.source_agent_role)) {
    gaps.push(`source_agent_role is invalid: ${handoff.source_agent_role}`);
  }
  if (handoff?.target_agent_role && !AGENT_ROLES.has(handoff.target_agent_role)) {
    gaps.push(`target_agent_role is invalid: ${handoff.target_agent_role}`);
  }
  if (handoff?.object_type && !OBJECT_TYPES.has(handoff.object_type)) {
    gaps.push(`object_type is invalid: ${handoff.object_type}`);
  }
  return gaps;
}

function collectTaskContractGaps(handoff) {
  const gaps = [];
  const contract = handoff?.task_contract ?? {};
  requireField(contract.objective, "task_contract.objective", gaps);
  requireField(
    contract.expected_output_type,
    "task_contract.expected_output_type",
    gaps
  );
  if (contract.expected_output_type &&
      !OBJECT_TYPES.has(contract.expected_output_type)) {
    gaps.push(
      `task_contract.expected_output_type is invalid: ${contract.expected_output_type}`
    );
  }
  requireField(
    contract.expected_output_ref,
    "task_contract.expected_output_ref",
    gaps
  );
  requireField(contract.validator_command, "task_contract.validator_command", gaps);
  return gaps;
}

function collectModelSelectionGaps(handoff) {
  const gaps = [];
  const selection = handoff?.model_selection ?? {};
  requireField(selection.policy, "model_selection.policy", gaps);
  if (selection.policy && !MODEL_POLICIES.has(selection.policy)) {
    gaps.push(`model_selection.policy is invalid: ${selection.policy}`);
  }
  if (!Array.isArray(selection.allowed_model_tiers) ||
      selection.allowed_model_tiers.length === 0) {
    gaps.push("model_selection.allowed_model_tiers must include at least one tier");
  } else {
    for (const tier of selection.allowed_model_tiers) {
      if (!MODEL_TIERS.has(tier)) {
        gaps.push(`model_selection.allowed_model_tiers contains invalid tier: ${tier}`);
      }
    }
  }
  requireField(
    selection.selected_model_tier,
    "model_selection.selected_model_tier",
    gaps
  );
  if (selection.selected_model_tier &&
      !MODEL_TIERS.has(selection.selected_model_tier)) {
    gaps.push(
      `model_selection.selected_model_tier is invalid: ${selection.selected_model_tier}`
    );
  }
  if (selection.selected_model_tier &&
      Array.isArray(selection.allowed_model_tiers) &&
      !selection.allowed_model_tiers.includes(selection.selected_model_tier)) {
    gaps.push(
      `model_selection.selected_model_tier is not allowed: ${selection.selected_model_tier}`
    );
  }
  return gaps;
}

function collectToolPermissionGaps(handoff) {
  const gaps = [];
  const permissions = handoff?.tool_permissions ?? {};
  for (const field of ["read_scopes", "write_scopes", "allowed_tools"]) {
    if (!Array.isArray(permissions[field]) || permissions[field].length === 0) {
      gaps.push(`tool_permissions.${field} must include at least one entry`);
    }
  }
  for (const boundary of TOOL_PERMISSION_BOUNDARIES) {
    if (permissions[boundary] === true) {
      gaps.push(`tool_permissions.${boundary} is true`);
    }
  }
  return gaps;
}

function collectVerificationGaps(handoff) {
  const gaps = [];
  const routing = handoff?.verification_routing ?? {};
  if (!Array.isArray(routing.required_validators) ||
      routing.required_validators.length === 0) {
    gaps.push(
      "verification_routing.required_validators must include at least one validator"
    );
  }
  if (!Array.isArray(routing.required_tests) ||
      routing.required_tests.length === 0) {
    gaps.push(
      "verification_routing.required_tests must include at least one test command"
    );
  }
  if (!Array.isArray(routing.reviewer_roles) || routing.reviewer_roles.length === 0) {
    gaps.push("verification_routing.reviewer_roles must include at least one role");
  } else {
    for (const role of routing.reviewer_roles) {
      if (!AGENT_ROLES.has(role)) {
        gaps.push(`verification_routing.reviewer_roles contains invalid role: ${role}`);
      }
    }
  }
  return gaps;
}

function collectLedgerGaps(handoff) {
  const gaps = [];
  const ledger = handoff?.ledger ?? {};
  if (ledger.schema_version !== "AR_LEDGER_2026_05") {
    gaps.push("ledger.schema_version is invalid");
  }
  requireField(ledger.scope_ref, "ledger.scope_ref", gaps);
  requireField(ledger.handoff_ref, "ledger.handoff_ref", gaps);
  if (!Array.isArray(ledger.verification_refs) ||
      ledger.verification_refs.length === 0) {
    gaps.push("ledger.verification_refs must include at least one reference");
  }
  if (!Array.isArray(ledger.required_caveats) ||
      ledger.required_caveats.length === 0) {
    gaps.push("ledger.required_caveats must include at least one caveat");
  }
  return gaps;
}

function collectBlockedCaptureGaps(handoff) {
  const gaps = [];
  const blocked = new Set(handoff?.blocked_data_capture ?? []);
  for (const field of REQUIRED_BLOCKED_CAPTURE) {
    if (!blocked.has(field)) {
      gaps.push(`blocked_data_capture missing ${field}`);
    }
  }
  return gaps;
}

function collectGovernanceGaps(handoff) {
  const gaps = [];
  for (const field of [...collectForbiddenFields(handoff)].sort()) {
    gaps.push(`Forbidden field detected: ${field}`);
  }
  const boundaries = handoff?.governance_boundaries ?? {};
  for (const boundary of GOVERNANCE_BOUNDARIES) {
    if (boundaries[boundary] === true) {
      gaps.push(`governance_boundaries.${boundary} is true`);
    }
  }
  return gaps;
}

export function validateAiValueAgentHandoff(handoff) {
  const gaps = [
    ...collectTopLevelGaps(handoff),
    ...collectTaskContractGaps(handoff),
    ...collectModelSelectionGaps(handoff),
    ...collectToolPermissionGaps(handoff),
    ...collectVerificationGaps(handoff),
    ...collectLedgerGaps(handoff),
    ...collectBlockedCaptureGaps(handoff),
    ...collectGovernanceGaps(handoff)
  ];

  return {
    schema_version: RESULT_SCHEMA_VERSION,
    handoff_id: handoff?.handoff_id ?? null,
    source_agent_role: handoff?.source_agent_role ?? null,
    target_agent_role: handoff?.target_agent_role ?? null,
    object_type: handoff?.object_type ?? null,
    valid: gaps.length === 0,
    gaps,
    feeds: {
      local_agent_run_ledger: gaps.length === 0,
      production_agent_runtime: false,
      customer_telemetry: false
    }
  };
}

export function buildScenarioToReadinessHandoff(scenario) {
  return {
    schema_version: "FT_AI_VALUE_AGENT_HANDOFF_2026_06",
    handoff_id: "handoff_support_scenario_to_readiness_v1",
    workflow_family: scenario?.input?.workflow_family ?? null,
    value_route: scenario?.input?.value_route ?? null,
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
      allowed_tools: [
        "filesystem_read",
        "filesystem_write",
        "local_validator",
        "test_runner"
      ],
      network_access: false,
      production_access: false,
      secrets_access: false,
      customer_data_access: false
    },
    verification_routing: {
      required_validators: ["npm run validate:ai-value-scenario"],
      required_tests: ["npm run test:ai-value-scenario"],
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
    blocked_data_capture: REQUIRED_BLOCKED_CAPTURE,
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
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = resolve(process.cwd(), args.input);
  const handoff = JSON.parse(readFileSync(inputPath, "utf8"));
  const result = validateAiValueAgentHandoff(handoff);
  const json = `${JSON.stringify(result, null, 2)}\n`;

  if (args.output) {
    writeFileSync(resolve(process.cwd(), args.output), json, "utf8");
    console.log(`Wrote ${args.output}`);
    return;
  }

  process.stdout.write(json);
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] === currentFile) {
  main();
}
