#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { validateAiValueBlueprint } from "./validate_ai_value_blueprint.mjs";
import { recommendMetricsForBlueprint } from "./validate_ai_value_metrics.mjs";
import { validateAiValueScenario } from "./validate_ai_value_scenario.mjs";

const DEFAULT_INPUT =
  "docs/contracts/ai-value-intelligence/examples/customer-support-evidence-readiness.json";

const RESULT_SCHEMA_VERSION = "FT_AI_VALUE_READINESS_VALIDATION_2026_06";

const ALLOWED_STATES = new Set([
  "PRESENT",
  "CAVEATED",
  "MISSING",
  "SUPPRESSED",
  "BLOCKED"
]);

const ALLOWED_DECISIONS = new Set([
  "READY_FOR_EXECUTIVE_VALIDATION",
  "HOLD_FOR_ASSUMPTIONS",
  "HOLD_FOR_SOURCE_COVERAGE",
  "HOLD_FOR_BASELINE",
  "STOP_FOR_GOVERNANCE_REVIEW"
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

const REQUIRED_READINESS_CHECKS = [
  "workflow_state",
  "metric_state",
  "baseline_state",
  "assumption_state",
  "scenario_state",
  "governance_state"
];

const REQUIRED_BLOCKED_CLAIMS = [
  "roi_proof",
  "causality_claim",
  "individual_scoring",
  "team_or_manager_ranking",
  "hr_analytics",
  "productivity_measurement",
  "customer_facing_economic_output"
];

const GOVERNANCE_BOUNDARIES = [
  "production_connector",
  "dashboard",
  "realized_roi_calculation",
  "causality_claim",
  "individual_scoring",
  "hr_analytics",
  "runtime_service",
  "customer_facing_economic_output"
];

const FORBIDDEN_KEY_PATTERNS = [
  /email/i,
  /employee/i,
  /user_id/i,
  /person_id/i,
  /manager/i,
  /raw_/i,
  /prompt/i,
  /response/i,
  /transcript/i,
  /ticket_text/i,
  /file_content/i,
  /hris/i,
  /realized_roi/i,
  /dollar/i,
  /productivity/i,
  /causal/i
];

function parseArgs(argv) {
  const args = { input: DEFAULT_INPUT, output: null };
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
        "Usage: node scripts/validate_ai_value_readiness.mjs [--input path] [--output path]"
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
  if (!value || typeof value !== "object") return fields;
  if (Array.isArray(value)) {
    value.forEach((item) => collectForbiddenFields(item, fields));
    return fields;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (key === "governance_boundaries") continue;
    if (isForbiddenKey(key)) fields.add(key);
    collectForbiddenFields(nested, fields);
  }
  return fields;
}

function collectTopLevelGaps(readiness) {
  const gaps = [];
  for (const field of [
    "schema_version",
    "readiness_id",
    "workflow_family",
    "value_route",
    "source_refs",
    "source_coverage",
    "readiness_checks",
    "decision",
    "decision_rationale",
    "next_actions",
    "blocked_claims",
    "governance_boundaries"
  ]) {
    requireField(readiness?.[field], field, gaps);
  }
  if (readiness?.schema_version &&
      readiness.schema_version !== "FT_AI_VALUE_READINESS_2026_06") {
    gaps.push(`schema_version is invalid: ${readiness.schema_version}`);
  }
  return gaps;
}

function collectSourceRefGaps(readiness) {
  const gaps = [];
  const refs = readiness?.source_refs ?? {};
  for (const field of ["blueprint_id", "metrics_library_id", "scenario_id"]) {
    requireField(refs[field], `source_refs.${field}`, gaps);
  }
  return gaps;
}

function collectStateGaps(readiness) {
  const gaps = [];
  const coverage = readiness?.source_coverage ?? {};
  for (const lane of REQUIRED_SOURCE_LANES) {
    requireField(coverage[lane], `source_coverage.${lane}`, gaps);
    if (coverage[lane] && !ALLOWED_STATES.has(coverage[lane])) {
      gaps.push(`source_coverage.${lane} is invalid: ${coverage[lane]}`);
    }
  }
  const checks = readiness?.readiness_checks ?? {};
  for (const check of REQUIRED_READINESS_CHECKS) {
    requireField(checks[check], `readiness_checks.${check}`, gaps);
    if (checks[check] && !ALLOWED_STATES.has(checks[check])) {
      gaps.push(`readiness_checks.${check} is invalid: ${checks[check]}`);
    }
  }
  return gaps;
}

function collectDecisionGaps(readiness) {
  const gaps = [];
  if (readiness?.decision && !ALLOWED_DECISIONS.has(readiness.decision)) {
    gaps.push(`decision is invalid: ${readiness.decision}`);
  }
  if (!Array.isArray(readiness?.decision_rationale) ||
      readiness.decision_rationale.length === 0) {
    gaps.push("decision_rationale must include at least one reason");
  }
  if (!Array.isArray(readiness?.next_actions) || readiness.next_actions.length === 0) {
    gaps.push("next_actions must include at least one action");
  }
  return gaps;
}

function collectBlockedClaimGaps(readiness) {
  const gaps = [];
  const claims = new Set(readiness?.blocked_claims ?? []);
  for (const claim of REQUIRED_BLOCKED_CLAIMS) {
    if (!claims.has(claim)) gaps.push(`blocked_claims missing ${claim}`);
  }
  return gaps;
}

function collectGovernanceGaps(readiness) {
  const gaps = [];
  for (const field of [...collectForbiddenFields(readiness)].sort()) {
    gaps.push(`Forbidden field detected: ${field}`);
  }
  const boundaries = readiness?.governance_boundaries ?? {};
  for (const boundary of GOVERNANCE_BOUNDARIES) {
    if (boundaries[boundary] === true) {
      gaps.push(`governance_boundaries.${boundary} is true`);
    }
  }
  return gaps;
}

function normalizeState(state) {
  return String(state ?? "MISSING").toUpperCase();
}

function deriveAssumptionState(assumptions) {
  const states = (assumptions ?? []).map((assumption) => normalizeState(assumption.state));
  if (states.includes("BLOCKED")) return "BLOCKED";
  if (states.includes("MISSING") || states.includes("CAVEATED")) return "CAVEATED";
  return states.length > 0 ? "PRESENT" : "MISSING";
}

function deriveDecision(checks) {
  if (Object.values(checks).includes("BLOCKED")) return "STOP_FOR_GOVERNANCE_REVIEW";
  if (checks.baseline_state === "MISSING") return "HOLD_FOR_BASELINE";
  if (checks.workflow_state === "MISSING" || checks.metric_state === "MISSING") {
    return "HOLD_FOR_SOURCE_COVERAGE";
  }
  if (checks.assumption_state !== "PRESENT") return "HOLD_FOR_ASSUMPTIONS";
  return "READY_FOR_EXECUTIVE_VALIDATION";
}

export function validateAiValueReadiness(readiness) {
  const gaps = [
    ...collectTopLevelGaps(readiness),
    ...collectSourceRefGaps(readiness),
    ...collectStateGaps(readiness),
    ...collectDecisionGaps(readiness),
    ...collectBlockedClaimGaps(readiness),
    ...collectGovernanceGaps(readiness)
  ];
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    readiness_id: readiness?.readiness_id ?? null,
    workflow_family: readiness?.workflow_family ?? null,
    value_route: readiness?.value_route ?? null,
    decision: readiness?.decision ?? null,
    valid: gaps.length === 0,
    gaps,
    feeds: {
      claim_boundary: gaps.length === 0,
      customer_facing_economic_output: false
    }
  };
}

export function buildEvidenceReadinessFromObjects(blueprint, metricsLibrary, scenario) {
  const blueprintValidation = validateAiValueBlueprint(blueprint);
  const metricsRecommendation = recommendMetricsForBlueprint(blueprint, metricsLibrary);
  const scenarioValidation = validateAiValueScenario(scenario);
  const sourceCoverage = blueprint?.source_requirements?.source_coverage ?? {};
  const readinessChecks = {
    workflow_state: blueprintValidation.valid ? "PRESENT" : "MISSING",
    metric_state: metricsRecommendation.feeds.metrics_mapping ? "PRESENT" : "MISSING",
    baseline_state: sourceCoverage.baseline === "PRESENT" ? "PRESENT" : "MISSING",
    assumption_state: deriveAssumptionState(blueprint?.assumption_ledger),
    scenario_state: scenarioValidation.valid ? "PRESENT" : "MISSING",
    governance_state: scenarioValidation.valid && blueprintValidation.valid ? "PRESENT" : "BLOCKED"
  };
  const decision = deriveDecision(readinessChecks);
  return {
    schema_version: "FT_AI_VALUE_READINESS_2026_06",
    readiness_id: "readiness_customer_support_v1",
    workflow_family: blueprint?.workflow_family ?? scenario?.input?.workflow_family ?? null,
    value_route: blueprint?.value_routes?.primary ?? scenario?.input?.value_route ?? null,
    source_refs: {
      blueprint_id: blueprint?.blueprint_id ?? null,
      metrics_library_id: metricsLibrary?.library_id ?? null,
      scenario_id: scenario?.scenario_id ?? null
    },
    source_coverage: {
      ai_activity: normalizeState(sourceCoverage.ai_activity),
      workflow: normalizeState(sourceCoverage.workflow),
      outcome: normalizeState(sourceCoverage.outcome),
      baseline: normalizeState(sourceCoverage.baseline),
      trust: normalizeState(sourceCoverage.trust),
      assumptions: normalizeState(sourceCoverage.assumptions),
      suppression: normalizeState(sourceCoverage.suppression)
    },
    readiness_checks: readinessChecks,
    decision,
    decision_rationale:
      decision === "HOLD_FOR_ASSUMPTIONS"
        ? ["Material customer-owned assumptions are still missing or caveated."]
        : ["Readiness decision derived from local object validators."],
    next_actions:
      decision === "HOLD_FOR_ASSUMPTIONS"
        ? [
            "Review missing staffing, channel mix, process, knowledge, metric definition, and rollout assumptions with customer owners."
          ]
        : ["Move to claim boundary review."],
    blocked_claims: REQUIRED_BLOCKED_CLAIMS,
    governance_boundaries: {
      production_connector: false,
      dashboard: false,
      realized_roi_calculation: false,
      causality_claim: false,
      individual_scoring: false,
      hr_analytics: false,
      runtime_service: false,
      customer_facing_economic_output: false
    }
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = resolve(process.cwd(), args.input);
  const readiness = JSON.parse(readFileSync(inputPath, "utf8"));
  const result = validateAiValueReadiness(readiness);
  const json = `${JSON.stringify(result, null, 2)}\n`;
  if (args.output) {
    writeFileSync(resolve(process.cwd(), args.output), json, "utf8");
    console.log(`Wrote ${args.output}`);
    return;
  }
  process.stdout.write(json);
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] === currentFile) main();
