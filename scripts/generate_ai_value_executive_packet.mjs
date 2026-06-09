#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_OUTPUT_JSON =
  "docs/contracts/ai-value-intelligence/examples/customer-support-executive-packet.json";
const DEFAULT_OUTPUT_MD =
  "docs/contracts/ai-value-intelligence/examples/customer-support-executive-packet.md";

const RESULT_SCHEMA_VERSION = "FT_AI_VALUE_EXECUTIVE_PACKET_VALIDATION_2026_06";

const ALLOWED_DECISIONS = new Set([
  "READY_FOR_EXECUTIVE_VALIDATION",
  "HOLD_FOR_ASSUMPTIONS",
  "HOLD_FOR_SOURCE_COVERAGE",
  "HOLD_FOR_BASELINE",
  "STOP_FOR_GOVERNANCE_REVIEW"
]);

const ALLOWED_CLAIM_STATES = new Set([
  "CAVEATED",
  "INTERNAL_ONLY",
  "MISSING",
  "BLOCKED"
]);

const REQUIRED_SECTIONS = [
  "workflow",
  "metrics",
  "scenario",
  "readiness",
  "claim_boundary",
  "next_actions"
];

const FORBIDDEN_CLAIM_PATTERNS = [
  /proved ROI/i,
  /caused productivity/i,
  /caused .*lift/i,
  /saved money/i,
  /saved \$?\d/i,
  /employee/i,
  /manager/i,
  /team .*better/i
];

function readJson(path) {
  return JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8"));
}

function parseArgs(argv) {
  const args = { outputJson: DEFAULT_OUTPUT_JSON, outputMarkdown: DEFAULT_OUTPUT_MD };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--output-json") {
      args.outputJson = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--output-md") {
      args.outputMarkdown = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: node scripts/generate_ai_value_executive_packet.mjs [--output-json path] [--output-md path]"
      );
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function containsForbiddenClaimLanguage(values) {
  return (values ?? []).some((value) =>
    FORBIDDEN_CLAIM_PATTERNS.some((pattern) => pattern.test(String(value)))
  );
}

function requireField(value, path, gaps) {
  if (!value) gaps.push(`${path} is missing`);
}

function sectionArray(section, path, gaps) {
  if (!Array.isArray(section) || section.length === 0) {
    gaps.push(`${path} must include at least one item`);
  }
}

export function buildExecutiveValidationPacket({
  blueprint,
  metricsLibrary,
  scenario,
  readiness,
  claimBoundary
}) {
  const recommendedMetrics = metricsLibrary.metrics
    .filter((metric) => metric.value_route === blueprint.value_routes.primary)
    .map((metric) => ({
      metric_id: metric.metric_id,
      name: metric.name,
      value_route: metric.value_route,
      measurement_unit: metric.measurement_unit,
      owner: metric.owner
    }));

  return {
    schema_version: "FT_AI_VALUE_EXECUTIVE_PACKET_2026_06",
    packet_id: "executive_packet_customer_support_v1",
    workflow_family: blueprint.workflow_family,
    workflow_name: blueprint.workflow_name,
    value_route: blueprint.value_routes.primary,
    decision: readiness.decision,
    claim_state: claimBoundary.claim_state,
    customer_facing_economic_output: false,
    source_refs: {
      blueprint_id: blueprint.blueprint_id,
      metrics_library_id: metricsLibrary.library_id,
      scenario_id: scenario.scenario_id,
      readiness_id: readiness.readiness_id,
      claim_boundary_id: claimBoundary.claim_boundary_id
    },
    sections: {
      workflow: {
        hypothesis: blueprint.value_hypothesis,
        current_state_steps: blueprint.process_discovery.current_state_steps,
        future_state_steps: blueprint.process_discovery.future_state_steps
      },
      metrics: recommendedMetrics,
      scenario: {
        scenario_id: scenario.scenario_id,
        bands: scenario.input.scenario_bands,
        output_units: scenario.input.output_units
      },
      readiness: {
        decision: readiness.decision,
        checks: readiness.readiness_checks,
        rationale: readiness.decision_rationale
      },
      claim_boundary: {
        claim_state: claimBoundary.claim_state,
        safe_claims: claimBoundary.safe_claims,
        caveated_claims: claimBoundary.caveated_claims,
        blocked_claims: claimBoundary.blocked_claims,
        required_caveats: claimBoundary.required_caveats
      },
      next_actions: readiness.next_actions
    }
  };
}

export function validateExecutiveValidationPacket(packet) {
  const gaps = [];
  for (const field of [
    "schema_version",
    "packet_id",
    "workflow_family",
    "value_route",
    "decision",
    "claim_state",
    "source_refs",
    "sections"
  ]) {
    requireField(packet?.[field], field, gaps);
  }
  if (packet?.schema_version &&
      packet.schema_version !== "FT_AI_VALUE_EXECUTIVE_PACKET_2026_06") {
    gaps.push(`schema_version is invalid: ${packet.schema_version}`);
  }
  if (packet?.decision && !ALLOWED_DECISIONS.has(packet.decision)) {
    gaps.push(`decision is invalid: ${packet.decision}`);
  }
  if (packet?.claim_state && !ALLOWED_CLAIM_STATES.has(packet.claim_state)) {
    gaps.push(`claim_state is invalid: ${packet.claim_state}`);
  }
  if (packet?.customer_facing_economic_output === true) {
    gaps.push("customer_facing_economic_output is true");
  }
  const sections = packet?.sections ?? {};
  for (const section of REQUIRED_SECTIONS) {
    requireField(sections[section], `sections.${section}`, gaps);
  }
  sectionArray(sections.metrics, "sections.metrics", gaps);
  sectionArray(sections.next_actions, "sections.next_actions", gaps);
  if (containsForbiddenClaimLanguage(sections?.claim_boundary?.safe_claims)) {
    gaps.push("sections.claim_boundary.safe_claims contains forbidden claim language");
  }
  if (containsForbiddenClaimLanguage(sections?.claim_boundary?.caveated_claims)) {
    gaps.push("sections.claim_boundary.caveated_claims contains forbidden claim language");
  }
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    packet_id: packet?.packet_id ?? null,
    decision: packet?.decision ?? null,
    valid: gaps.length === 0,
    gaps,
    feeds: {
      local_workspace_ui: gaps.length === 0,
      customer_facing_economic_output: false
    }
  };
}

export function renderExecutiveValidationMarkdown(packet) {
  const metrics = packet.sections.metrics
    .map((metric) => `- ${metric.name} (${metric.metric_id}) - ${metric.measurement_unit}`)
    .join("\n");
  const caveats = packet.sections.claim_boundary.required_caveats
    .map((caveat) => `- ${caveat}`)
    .join("\n");
  const nextActions = packet.sections.next_actions.map((action) => `- ${action}`).join("\n");
  return `# Customer Support AI Value Validation Packet

## Decision

${packet.decision}

## Workflow

${packet.workflow_name}

${packet.sections.workflow.hypothesis}

## Metrics

${metrics}

## Scenario

Value route: ${packet.value_route}

Scenario bands are planning ranges only. They are not realized ROI.

## Claim Boundary

Claim state: ${packet.claim_state}

${packet.sections.claim_boundary.safe_claims.map((claim) => `- ${claim}`).join("\n")}

## Required Caveats

${caveats}

## Next Actions

${nextActions}
`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const packet = buildExecutiveValidationPacket({
    blueprint: readJson(
      "docs/contracts/ai-value-intelligence/examples/customer-support-blueprint.json"
    ),
    metricsLibrary: readJson(
      "docs/contracts/ai-value-intelligence/examples/customer-support-metrics-library.json"
    ),
    scenario: readJson(
      "docs/contracts/ai-value-intelligence/examples/customer-support-value-scenario.json"
    ),
    readiness: readJson(
      "docs/contracts/ai-value-intelligence/examples/customer-support-evidence-readiness.json"
    ),
    claimBoundary: readJson(
      "docs/contracts/ai-value-intelligence/examples/customer-support-claim-boundary.json"
    )
  });
  const validation = validateExecutiveValidationPacket(packet);
  if (!validation.valid) {
    throw new Error(`Invalid executive packet: ${validation.gaps.join("; ")}`);
  }
  writeFileSync(
    resolve(process.cwd(), args.outputJson),
    `${JSON.stringify(packet, null, 2)}\n`,
    "utf8"
  );
  writeFileSync(
    resolve(process.cwd(), args.outputMarkdown),
    renderExecutiveValidationMarkdown(packet),
    "utf8"
  );
  console.log(`Wrote ${args.outputJson}`);
  console.log(`Wrote ${args.outputMarkdown}`);
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] === currentFile) main();
