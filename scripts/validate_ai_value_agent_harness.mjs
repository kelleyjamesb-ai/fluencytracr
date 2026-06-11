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

const OUTPUT_VERIFICATION = {
  BLUEPRINT: {
    validators: ["npm run validate:ai-value-blueprint"],
    tests: ["npm run test:ai-value-blueprint"]
  },
  METRICS_MAPPING: {
    validators: ["npm run validate:ai-value-metrics"],
    tests: ["npm run test:ai-value-metrics"]
  },
  VALUE_SCENARIO: {
    validators: ["npm run validate:ai-value-scenario"],
    tests: ["npm run test:ai-value-scenario"]
  },
  EVIDENCE_READINESS: {
    validators: ["npm run validate:ai-value-readiness"],
    tests: ["npm run test:ai-value-readiness"]
  },
  CLAIM_BOUNDARY: {
    validators: ["npm run validate:ai-value-claim-boundary"],
    tests: ["npm run test:ai-value-claim-boundary"]
  },
  EXECUTIVE_READOUT: {
    validators: ["npm run generate:ai-value-executive-packet"],
    tests: ["npm run test:ai-value-executive-packet"]
  }
};

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

function collectForbiddenFields(value, fields = new Set(), path = []) {
  if (!value || typeof value !== "object") {
    return fields;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectForbiddenFields(item, fields, path);
    }
    return fields;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (key === "blocked_data_capture" || key === "governance_boundaries") {
      continue;
    }
    const nextPath = [...path, key];
    const isExplicitFalseFeedBoundary =
      key === "customer_telemetry" &&
      nested === false &&
      path.length === 1 &&
      path[0] === "feeds";
    if (isForbiddenKey(key) && !isExplicitFalseFeedBoundary) {
      fields.add(key);
    }
    collectForbiddenFields(nested, fields, nextPath);
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
    if (permissions[boundary] !== false) {
      gaps.push(`tool_permissions.${boundary} must be false`);
    }
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
  const verification = OUTPUT_VERIFICATION[handoff?.task_contract?.expected_output_type];
  if (verification) {
    for (const validator of verification.validators) {
      if (!routing.required_validators?.includes(validator)) {
        gaps.push(
          `verification_routing.required_validators must include ${validator}`
        );
      }
    }
    for (const testCommand of verification.tests) {
      if (!routing.required_tests?.includes(testCommand)) {
        gaps.push(
          `verification_routing.required_tests must include ${testCommand}`
        );
      }
    }
  }
  if (handoff?.task_contract?.validator_command &&
      !routing.required_validators?.includes(handoff.task_contract.validator_command)) {
    gaps.push(
      "verification_routing.required_validators must include task_contract.validator_command"
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

function collectBundleTopLevelGaps(bundle) {
  const gaps = [];
  for (const field of [
    "schema_version",
    "bundle_id",
    "source_packet_ref",
    "workflow_family",
    "value_route",
    "handoffs",
    "ledger",
    "blocked_data_capture",
    "governance_boundaries",
    "feeds"
  ]) {
    requireField(bundle?.[field], field, gaps);
  }
  if (bundle?.schema_version &&
      bundle.schema_version !== "FT_AI_VALUE_AGENT_HANDOFF_BUNDLE_2026_06") {
    gaps.push(`schema_version is invalid: ${bundle.schema_version}`);
  }
  if (!Array.isArray(bundle?.handoffs) || bundle.handoffs.length === 0) {
    gaps.push("handoffs must include at least one handoff");
  }
  if (bundle?.feeds?.production_agent_runtime !== false) {
    gaps.push("feeds.production_agent_runtime must be false");
  }
  if (bundle?.feeds?.customer_telemetry !== false) {
    gaps.push("feeds.customer_telemetry must be false");
  }
  return gaps;
}

function collectBundleHandoffGaps(bundle) {
  const gaps = [];
  if (!Array.isArray(bundle?.handoffs)) {
    return gaps;
  }
  bundle.handoffs.forEach((handoff, index) => {
    const result = validateAiValueAgentHandoff(handoff);
    for (const gap of result.gaps) {
      gaps.push(`handoffs[${index}]: ${gap}`);
    }
    if (handoff?.workflow_family !== bundle.workflow_family) {
      gaps.push(
        `handoffs[${index}].workflow_family must match bundle.workflow_family`
      );
    }
    if (handoff?.value_route !== bundle.value_route) {
      gaps.push(
        `handoffs[${index}].value_route must match bundle.value_route`
      );
    }
    if (handoff?.ledger?.handoff_ref !== bundle.ledger?.handoff_ref) {
      gaps.push(
        `handoffs[${index}].ledger.handoff_ref must match bundle.ledger.handoff_ref`
      );
    }
  });
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

export function validateAiValueAgentHandoffBundle(bundle) {
  const gaps = [
    ...collectBundleTopLevelGaps(bundle),
    ...collectBundleHandoffGaps(bundle),
    ...collectLedgerGaps(bundle),
    ...collectBlockedCaptureGaps(bundle),
    ...collectGovernanceGaps(bundle)
  ];

  return {
    schema_version: "FT_AI_VALUE_AGENT_HANDOFF_BUNDLE_VALIDATION_2026_06",
    bundle_id: bundle?.bundle_id ?? null,
    handoff_count: Array.isArray(bundle?.handoffs) ? bundle.handoffs.length : 0,
    valid: gaps.length === 0,
    gaps,
    feeds: {
      local_agent_run_ledger: gaps.length === 0,
      production_agent_runtime: false,
      customer_telemetry: false
    }
  };
}

function buildHandoffFromExecutivePacket(packet, options) {
  const bundleRef =
    "docs/contracts/ai-value-intelligence/examples/customer-support-agent-handoff-bundle.json";
  const sourcePacketRef =
    "docs/contracts/ai-value-intelligence/examples/customer-support-executive-packet.json";
  const workflowFamily = packet?.workflow_family ?? null;
  const valueRoute = packet?.value_route ?? null;
  const suffix = workflowFamily ?? "unknown";

  return {
    schema_version: "FT_AI_VALUE_AGENT_HANDOFF_2026_06",
    handoff_id: `handoff_${suffix}_${options.idSuffix}_v1`,
    workflow_family: workflowFamily,
    value_route: valueRoute,
    source_agent_role: "EXECUTIVE_READOUT_AGENT",
    target_agent_role: options.targetAgentRole,
    object_type: "EXECUTIVE_READOUT",
    object_ref: sourcePacketRef,
    task_contract: {
      objective: options.objective,
      expected_output_type: options.expectedOutputType,
      expected_output_ref: options.expectedOutputRef,
      validator_command: options.validatorCommand
    },
    model_selection: options.modelSelection,
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
      required_validators: options.requiredValidators,
      required_tests: options.requiredTests,
      reviewer_roles: ["REVIEWER_AGENT", "EVALUATOR_AGENT"]
    },
    ledger: {
      schema_version: "AR_LEDGER_2026_05",
      scope_ref: "docs/concepts/AI_VALUE_AGENTIC_PLATFORM_HARNESS.md",
      handoff_ref: bundleRef,
      verification_refs: ["npm run test:ai-value-agent-harness"],
      required_caveats: [
        "Development-harness telemetry only.",
        "No production agent runtime, autonomous customer action, raw prompt/response storage, ROI calculation, causality claim, or individual scoring."
      ]
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

export function buildExecutivePacketHandoffBundle(packet) {
  const workflowFamily = packet?.workflow_family ?? null;
  const valueRoute = packet?.value_route ?? null;
  const bundleRef =
    "docs/contracts/ai-value-intelligence/examples/customer-support-agent-handoff-bundle.json";

  const handoffs = [
    buildHandoffFromExecutivePacket(packet, {
      idSuffix: "executive_to_evidence_readiness",
      targetAgentRole: "EVIDENCE_READINESS_AGENT",
      expectedOutputType: "EVIDENCE_READINESS",
      expectedOutputRef:
        "docs/contracts/ai-value-intelligence/examples/customer-support-evidence-readiness.json",
      objective:
        "Track baseline exports, customer owner review, source coverage, and unresolved assumptions before stronger value language is used.",
      validatorCommand: "npm run validate:ai-value-readiness",
      requiredValidators: ["npm run validate:ai-value-readiness"],
      requiredTests: ["npm run test:ai-value-readiness"],
      modelSelection: {
        policy: "DEFAULT_INHERIT",
        allowed_model_tiers: ["BALANCED", "FRONTIER"],
        selected_model_tier: "BALANCED",
        escalation_allowed: true,
        escalation_rule:
          "Escalate only for ambiguous evidence, source coverage, or governance failures."
      }
    }),
    buildHandoffFromExecutivePacket(packet, {
      idSuffix: "executive_to_metrics",
      targetAgentRole: "METRICS_AGENT",
      expectedOutputType: "METRICS_MAPPING",
      expectedOutputRef:
        "docs/contracts/ai-value-intelligence/examples/customer-support-metrics-library.json",
      objective:
        "Carry sponsor decisions back into outcome and ROI opportunity mapping for the selected workflow.",
      validatorCommand: "npm run validate:ai-value-metrics",
      requiredValidators: ["npm run validate:ai-value-metrics"],
      requiredTests: ["npm run test:ai-value-metrics"],
      modelSelection: {
        policy: "SMALL_FAST_VALIDATOR",
        allowed_model_tiers: ["FAST", "BALANCED"],
        selected_model_tier: "FAST",
        escalation_allowed: true,
        escalation_rule:
          "Escalate only when metric ownership, source systems, or claim levels are ambiguous."
      }
    }),
    buildHandoffFromExecutivePacket(packet, {
      idSuffix: "executive_to_review",
      targetAgentRole: "REVIEWER_AGENT",
      expectedOutputType: "EXECUTIVE_READOUT",
      expectedOutputRef:
        "docs/contracts/ai-value-intelligence/examples/customer-support-executive-packet.json",
      objective:
        "Review sponsor-facing language, blocked claims, required caveats, and next-action framing before the packet is shared.",
      validatorCommand: "npm run generate:ai-value-executive-packet",
      requiredValidators: ["npm run generate:ai-value-executive-packet"],
      requiredTests: ["npm run test:ai-value-executive-packet"],
      modelSelection: {
        policy: "FRONTIER_REVIEW",
        allowed_model_tiers: ["BALANCED", "FRONTIER"],
        selected_model_tier: "FRONTIER",
        escalation_allowed: true,
        escalation_rule:
          "Use frontier review only for sponsor-language ambiguity, governance risk, or unresolved claim-boundary issues."
      }
    })
  ];

  return {
    schema_version: "FT_AI_VALUE_AGENT_HANDOFF_BUNDLE_2026_06",
    bundle_id: `handoff_bundle_${workflowFamily ?? "unknown"}_executive_v1`,
    source_packet_ref:
      "docs/contracts/ai-value-intelligence/examples/customer-support-executive-packet.json",
    workflow_family: workflowFamily,
    value_route: valueRoute,
    handoffs,
    ledger: {
      schema_version: "AR_LEDGER_2026_05",
      scope_ref: "docs/concepts/AI_VALUE_AGENTIC_PLATFORM_HARNESS.md",
      handoff_ref: bundleRef,
      verification_refs: [
        "npm run test:ai-value-agent-harness",
        "npm run test:ai-value-executive-packet"
      ],
      required_caveats: [
        "Development-harness telemetry only.",
        "Agent handoffs are local task contracts, not production agent runs."
      ]
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
    },
    feeds: {
      local_agent_run_ledger: true,
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
  const result =
    handoff?.schema_version === "FT_AI_VALUE_AGENT_HANDOFF_BUNDLE_2026_06"
      ? validateAiValueAgentHandoffBundle(handoff)
      : validateAiValueAgentHandoff(handoff);
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
