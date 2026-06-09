#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_INPUT =
  "docs/contracts/ai-value-intelligence/examples/customer-support-blueprint.json";

const RESULT_SCHEMA_VERSION = "FT_AI_VALUE_BLUEPRINT_VALIDATION_2026_06";

const ALLOWED_VALUE_ROUTES = new Set([
  "COST_REDUCTION",
  "CAPACITY_CREATION",
  "QUALITY_IMPROVEMENT",
  "RISK_REDUCTION",
  "EXPERIENCE_IMPROVEMENT",
  "REVENUE_EXPANSION",
  "UNCLASSIFIED"
]);

const REQUIRED_SOURCE_LANES = [
  "ai_activity",
  "workflow",
  "outcome",
  "baseline",
  "trust",
  "assumptions",
  "suppression"
];

const REQUIRED_AGGREGATE_INPUTS = [
  "case_population",
  "ai_activity",
  "outcome_signals"
];

const REQUIRED_ASSUMPTIONS = [
  "case_mix_stability",
  "volume_context",
  "staffing_and_coverage_context",
  "channel_mix_context",
  "process_or_policy_context",
  "knowledge_base_context",
  "metric_definition_stability",
  "ai_rollout_context"
];

const REQUIRED_BLOCKED_CLAIMS = [
  "roi_proof",
  "causality_claim",
  "individual_scoring",
  "team_or_manager_ranking",
  "hr_analytics",
  "dashboard_or_runtime_implementation"
];

const GOVERNANCE_BOUNDARIES = [
  "requires_raw_data",
  "requires_hr_analytics",
  "requires_roi_calculation",
  "requires_causality_claim",
  "requires_individual_scoring",
  "requires_dashboard",
  "requires_runtime_service"
];

const FORBIDDEN_KEY_PATTERNS = [
  /(^|_)user(_|$)/i,
  /email/i,
  /employee/i,
  /manager_chain/i,
  /ticket_text/i,
  /sample_ticket_text/i,
  /prompt/i,
  /response/i,
  /transcript/i,
  /file_content/i,
  /person_level/i,
  /raw_/i,
  /hris/i
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
        "Usage: node scripts/validate_ai_value_blueprint.mjs [--input path] [--output path]"
      );
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
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
    if (key === "governance_boundaries") {
      continue;
    }
    if (isForbiddenKey(key)) {
      fields.add(key);
    }
    collectForbiddenFields(nested, fields);
  }
  return fields;
}

function normalizeState(value) {
  return String(value ?? "MISSING").toUpperCase();
}

function requireField(input, field, gaps) {
  if (!input?.[field]) {
    gaps.push(`${field} is missing`);
  }
}

function collectRequiredFieldGaps(blueprint) {
  const gaps = [];
  for (const field of [
    "schema_version",
    "blueprint_id",
    "org_id",
    "workflow_family",
    "workflow_name",
    "business_owner",
    "process_discovery",
    "value_hypothesis",
    "value_routes",
    "windows",
    "source_requirements",
    "assumption_ledger",
    "blocked_claims",
    "governance_boundaries"
  ]) {
    requireField(blueprint, field, gaps);
  }
  return gaps;
}

function collectProcessGaps(blueprint) {
  const gaps = [];
  if (!Array.isArray(blueprint?.process_discovery?.current_state_steps) ||
      blueprint.process_discovery.current_state_steps.length === 0) {
    gaps.push("process_discovery.current_state_steps is missing");
  }
  if (!Array.isArray(blueprint?.process_discovery?.future_state_steps) ||
      blueprint.process_discovery.future_state_steps.length === 0) {
    gaps.push("process_discovery.future_state_steps is missing");
  }
  if (!blueprint?.business_owner?.role) {
    gaps.push("business_owner.role is missing");
  }
  return gaps;
}

function collectValueRouteGaps(blueprint) {
  const gaps = [];
  const primary = blueprint?.value_routes?.primary;
  if (!primary) {
    gaps.push("value_routes.primary is missing");
  } else if (!ALLOWED_VALUE_ROUTES.has(primary)) {
    gaps.push(`value_routes.primary is invalid: ${primary}`);
  }
  for (const route of blueprint?.value_routes?.secondary ?? []) {
    if (!ALLOWED_VALUE_ROUTES.has(route)) {
      gaps.push(`value_routes.secondary contains invalid route: ${route}`);
    }
  }
  return gaps;
}

function collectSourceRequirementGaps(blueprint) {
  const gaps = [];
  const sourceCoverage = blueprint?.source_requirements?.source_coverage ?? {};
  const aggregateInputs = blueprint?.source_requirements?.approved_aggregate_inputs ?? {};

  for (const lane of REQUIRED_SOURCE_LANES) {
    if (!sourceCoverage[lane]) {
      gaps.push(`source_requirements.source_coverage.${lane} is missing`);
    }
  }

  for (const input of REQUIRED_AGGREGATE_INPUTS) {
    if (!aggregateInputs[input]) {
      gaps.push(`source_requirements.approved_aggregate_inputs.${input} is missing`);
    }
  }

  if (!blueprint?.windows?.baseline) {
    gaps.push("windows.baseline is missing");
  }
  if (!blueprint?.windows?.comparison) {
    gaps.push("windows.comparison is missing");
  }

  return gaps;
}

function collectAssumptionGaps(blueprint) {
  const gaps = [];
  const assumptionById = new Map(
    (blueprint?.assumption_ledger ?? []).map((assumption) => [
      assumption.assumption_id,
      assumption
    ])
  );

  for (const assumptionId of REQUIRED_ASSUMPTIONS) {
    const assumption = assumptionById.get(assumptionId);
    if (!assumption) {
      gaps.push(`assumption ${assumptionId} is missing`);
      continue;
    }
    if (!assumption.owner) {
      gaps.push(`assumption ${assumptionId} owner is missing`);
    }
    if (!assumption.state) {
      gaps.push(`assumption ${assumptionId} state is missing`);
    }
  }
  return gaps;
}

function collectBlockedClaimGaps(blueprint) {
  const gaps = [];
  const claims = new Set(blueprint?.blocked_claims ?? []);
  for (const claim of REQUIRED_BLOCKED_CLAIMS) {
    if (!claims.has(claim)) {
      gaps.push(`blocked_claims missing ${claim}`);
    }
  }
  return gaps;
}

function collectGovernanceGaps(blueprint) {
  const gaps = [];
  for (const field of [...collectForbiddenFields(blueprint)].sort()) {
    gaps.push(`Forbidden field detected: ${field}`);
  }
  const boundaries = blueprint?.governance_boundaries ?? {};
  for (const boundary of GOVERNANCE_BOUNDARIES) {
    if (boundaries[boundary] === true) {
      gaps.push(`governance_boundaries.${boundary} is true`);
    }
  }
  return gaps;
}

export function blueprintToWorkshopResponse(blueprint) {
  return {
    schema_version: "FT_AI_VALUE_SUPPORT_WORKSHOP_RESPONSE_2026_06",
    source: blueprint.blueprint_id,
    org_id: blueprint.org_id,
    workflow_family: blueprint.workflow_family,
    primary_value_route: blueprint.value_routes.primary,
    baseline_window: blueprint.windows.baseline,
    comparison_window: blueprint.windows.comparison,
    source_coverage: blueprint.source_requirements.source_coverage,
    approved_aggregate_inputs:
      blueprint.source_requirements.approved_aggregate_inputs,
    assumptions: blueprint.assumption_ledger,
    governance_stop_conditions: blueprint.governance_boundaries
  };
}

export function blueprintToSupportValueInput(blueprint) {
  const aggregateInputs = blueprint.source_requirements.approved_aggregate_inputs;
  const activity = aggregateInputs.ai_activity ?? {};
  const trust = aggregateInputs.trust_and_friction ?? {};
  return {
    schema_version: "FT_AI_VALUE_SUPPORT_INPUT_2026_06",
    org_id: blueprint.org_id,
    window_id: blueprint.windows.comparison,
    workflow_family: blueprint.workflow_family,
    workflow_value_hypothesis: blueprint.value_hypothesis,
    ai_work_evidence: {
      verdict:
        normalizeState(blueprint.source_requirements.source_coverage.suppression) === "SUPPRESSED"
          ? "SUPPRESS"
          : "SURFACE",
      suppression_reason: null,
      cohort_size: aggregateInputs.case_population?.eligible_cases,
      window_days: 61,
      aggregate_patterns: {
        assistant_sessions: activity.assistant_sessions,
        search_sessions: activity.search_sessions,
        skill_invocations: activity.skill_invocations,
        agent_runs: activity.agent_runs,
        verification_attached_episodes: trust.verification_attached_episodes,
        recovery_episodes: trust.recovery_episodes,
        abandonment_episodes: trust.abandonment_episodes
      }
    },
    outcome_evidence: {
      source_type: "support_system",
      baseline_window: blueprint.windows.baseline,
      comparison_window: blueprint.windows.comparison,
      metrics: aggregateInputs.outcome_signals
    },
    source_coverage: Object.fromEntries(
      Object.entries(blueprint.source_requirements.source_coverage).map(
        ([lane, state]) => [lane, String(state).toLowerCase()]
      )
    ),
    assumptions: blueprint.assumption_ledger
  };
}

export function validateAiValueBlueprint(blueprint) {
  const gaps = [
    ...collectRequiredFieldGaps(blueprint),
    ...collectProcessGaps(blueprint),
    ...collectValueRouteGaps(blueprint),
    ...collectSourceRequirementGaps(blueprint),
    ...collectAssumptionGaps(blueprint),
    ...collectBlockedClaimGaps(blueprint),
    ...collectGovernanceGaps(blueprint)
  ];

  return {
    schema_version: RESULT_SCHEMA_VERSION,
    blueprint_id: blueprint?.blueprint_id ?? null,
    org_id: blueprint?.org_id ?? null,
    workflow_family: blueprint?.workflow_family ?? null,
    valid: gaps.length === 0,
    gaps,
    feeds: {
      workshop_response: gaps.length === 0,
      support_value_input: gaps.length === 0
    }
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = resolve(process.cwd(), args.input);
  const blueprint = JSON.parse(readFileSync(inputPath, "utf8"));
  const result = validateAiValueBlueprint(blueprint);
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
