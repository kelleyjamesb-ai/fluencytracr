#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_INPUT =
  "docs/contracts/ai-value-intelligence/examples/customer-support-workshop-response.json";

const RESULT_SCHEMA_VERSION = "FT_AI_VALUE_SUPPORT_PILOT_VALIDATION_2026_06";

const REQUIRED_SOURCE_LANES = [
  "ai_activity",
  "workflow",
  "outcome",
  "baseline",
  "trust",
  "assumptions",
  "suppression"
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

const GOVERNANCE_STOP_CONDITIONS = [
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

const BLOCKED_CLAIMS = [
  "ROI proof",
  "causality claims",
  "individual scoring",
  "HR analytics",
  "dashboard or runtime implementation"
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
        "Usage: node scripts/validate_ai_value_support_pilot.mjs [--input path] [--output path]"
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
    if (key === "governance_stop_conditions") {
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

function addMissingRequiredFieldGaps(input, gaps) {
  for (const field of [
    "org_id",
    "workflow_family",
    "primary_value_route",
    "source_coverage",
    "approved_aggregate_inputs"
  ]) {
    if (!input?.[field]) {
      gaps.push(`${field} is missing`);
    }
  }
}

function collectGovernanceGaps(input) {
  const gaps = [];
  for (const field of [...collectForbiddenFields(input)].sort()) {
    gaps.push(`Forbidden field detected: ${field}`);
  }

  const stopConditions = input?.governance_stop_conditions ?? {};
  for (const condition of GOVERNANCE_STOP_CONDITIONS) {
    if (stopConditions[condition] === true) {
      gaps.push(`governance_stop_conditions.${condition} is true`);
    }
  }

  return gaps;
}

function collectBaselineGaps(input) {
  const gaps = [];
  if (!input?.baseline_window) {
    gaps.push("baseline_window is missing");
  }
  if (!input?.comparison_window) {
    gaps.push("comparison_window is missing");
  }
  if (normalizeState(input?.source_coverage?.baseline) !== "PRESENT") {
    gaps.push(`source_coverage.baseline is ${normalizeState(input?.source_coverage?.baseline)}`);
  }
  return gaps;
}

function collectSourceCoverageGaps(input) {
  const gaps = [];
  const coverage = input?.source_coverage ?? {};
  for (const lane of REQUIRED_SOURCE_LANES) {
    if (lane === "baseline" || lane === "assumptions") {
      continue;
    }
    const state = normalizeState(coverage[lane]);
    if (state !== "PRESENT" && state !== "NOT_APPLICABLE") {
      gaps.push(`source_coverage.${lane} is ${state}`);
    }
  }

  const aggregateInputs = input?.approved_aggregate_inputs ?? {};
  for (const field of ["case_population", "ai_activity", "outcome_signals"]) {
    if (!aggregateInputs[field]) {
      gaps.push(`approved_aggregate_inputs.${field} is missing`);
    }
  }

  return gaps;
}

function collectAssumptionGaps(input) {
  const gaps = [];
  const assumptionById = new Map(
    (input?.assumptions ?? []).map((assumption) => [
      assumption.assumption_id,
      assumption
    ])
  );

  if (normalizeState(input?.source_coverage?.assumptions) !== "PRESENT") {
    gaps.push(
      `source_coverage.assumptions is ${normalizeState(input?.source_coverage?.assumptions)}`
    );
  }

  for (const assumptionId of REQUIRED_ASSUMPTIONS) {
    const assumption = assumptionById.get(assumptionId);
    if (!assumption) {
      gaps.push(`assumption ${assumptionId} is missing`);
      continue;
    }
    const state = normalizeState(assumption.state);
    if (state !== "PRESENT" && state !== "NOT_APPLICABLE") {
      gaps.push(`assumption ${assumptionId} is ${state}`);
    }
    if (!assumption.owner) {
      gaps.push(`assumption ${assumptionId} owner is missing`);
    }
  }

  return gaps;
}

export function validateSupportPilotReadiness(input) {
  const baseGaps = [];
  addMissingRequiredFieldGaps(input, baseGaps);

  const governanceGaps = collectGovernanceGaps(input);
  const baselineGaps = collectBaselineGaps(input);
  const sourceCoverageGaps = collectSourceCoverageGaps(input);
  const assumptionGaps = collectAssumptionGaps(input);

  let decision = "PROCEED_TO_GOVERNED_PACKET";
  let gaps = baseGaps;

  if (governanceGaps.length > 0) {
    decision = "STOP_FOR_GOVERNANCE_REVIEW";
    gaps = [...baseGaps, ...governanceGaps];
  } else if (baseGaps.length > 0) {
    decision = "HOLD_FOR_SOURCE_COVERAGE";
    gaps = baseGaps;
  } else if (baselineGaps.length > 0) {
    decision = "HOLD_FOR_BASELINE";
    gaps = [...baseGaps, ...baselineGaps];
  } else if (sourceCoverageGaps.length > 0) {
    decision = "HOLD_FOR_SOURCE_COVERAGE";
    gaps = [...baseGaps, ...sourceCoverageGaps];
  } else if (assumptionGaps.length > 0) {
    decision = "HOLD_FOR_ASSUMPTIONS";
    gaps = [...baseGaps, ...assumptionGaps];
  }

  return {
    schema_version: RESULT_SCHEMA_VERSION,
    source: input?.source ?? "inline",
    org_id: input?.org_id ?? null,
    workflow_family: input?.workflow_family ?? null,
    primary_value_route: input?.primary_value_route ?? null,
    decision,
    ready: decision === "PROCEED_TO_GOVERNED_PACKET",
    gaps,
    blocked_claims: BLOCKED_CLAIMS,
    checked: {
      approved_aggregate_inputs: true,
      source_coverage: true,
      baseline_and_comparison_windows: true,
      assumption_ledger: true,
      blocked_input_fields: true,
      governance_stop_conditions: true
    }
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = resolve(process.cwd(), args.input);
  const input = JSON.parse(readFileSync(inputPath, "utf8"));
  const result = validateSupportPilotReadiness(input);
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
