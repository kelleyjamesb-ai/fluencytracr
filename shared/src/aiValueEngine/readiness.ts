/**
 * AI Value Engine — Evidence Readiness stage.
 *
 * Owns readiness validation, the deterministic readiness decision rules, and
 * the builder that derives readiness from validated upstream objects. Logic
 * migrated verbatim from scripts/validate_ai_value_readiness.mjs per the
 * migration contract.
 */

import { validateBlueprint } from "./blueprint";
import { recommendMetricsForBlueprint } from "./metrics";
import { validateValueScenario } from "./scenario";

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

export interface ReadinessValidationResult {
  schema_version: string;
  readiness_id: string | null;
  workflow_family: string | null;
  value_route: string | null;
  decision: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    claim_boundary: boolean;
    customer_facing_economic_output: boolean;
  };
}

function requireField(value: any, path: string, gaps: string[]): void {
  if (!value) {
    gaps.push(`${path} is missing`);
  }
}

function isForbiddenKey(key: string): boolean {
  return FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function collectForbiddenFields(value: any, fields: Set<string> = new Set()): Set<string> {
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

function collectTopLevelGaps(readiness: any): string[] {
  const gaps: string[] = [];
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

function collectSourceRefGaps(readiness: any): string[] {
  const gaps: string[] = [];
  const refs = readiness?.source_refs ?? {};
  for (const field of ["blueprint_id", "metrics_library_id", "scenario_id"]) {
    requireField(refs[field], `source_refs.${field}`, gaps);
  }
  return gaps;
}

function collectStateGaps(readiness: any): string[] {
  const gaps: string[] = [];
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

function collectDecisionGaps(readiness: any): string[] {
  const gaps: string[] = [];
  if (readiness?.decision && !ALLOWED_DECISIONS.has(readiness.decision)) {
    gaps.push(`decision is invalid: ${readiness.decision}`);
  } else if (readiness?.decision) {
    const expectedDecision = deriveReadinessDecision(
      readiness?.readiness_checks ?? {},
      readiness?.source_coverage ?? {}
    );
    if (readiness.decision !== expectedDecision) {
      gaps.push(
        `decision ${readiness.decision} contradicts readiness checks; expected ${expectedDecision}`
      );
    }
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

function collectBlockedClaimGaps(readiness: any): string[] {
  const gaps: string[] = [];
  const claims = new Set(readiness?.blocked_claims ?? []);
  for (const claim of REQUIRED_BLOCKED_CLAIMS) {
    if (!claims.has(claim)) gaps.push(`blocked_claims missing ${claim}`);
  }
  return gaps;
}

function collectGovernanceGaps(readiness: any): string[] {
  const gaps: string[] = [];
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

function normalizeState(state: any): string {
  return String(state ?? "MISSING").toUpperCase();
}

function deriveAssumptionState(assumptions: any): string {
  const states = (assumptions ?? []).map((assumption: any) =>
    normalizeState(assumption.state)
  );
  if (states.includes("BLOCKED")) return "BLOCKED";
  if (states.includes("MISSING") || states.includes("CAVEATED")) return "CAVEATED";
  return states.length > 0 ? "PRESENT" : "MISSING";
}

export function deriveReadinessDecision(checks: any, sourceCoverage: any = {}): string {
  const normalizedChecks: Record<string, string> = Object.fromEntries(
    Object.entries(checks ?? {}).map(([key, value]) => [key, normalizeState(value)])
  );
  const normalizedCoverage: Record<string, string> = Object.fromEntries(
    Object.entries(sourceCoverage ?? {}).map(([key, value]) => [key, normalizeState(value)])
  );
  if (
    Object.values(normalizedChecks).includes("BLOCKED") ||
    Object.values(normalizedCoverage).includes("BLOCKED")
  ) {
    return "STOP_FOR_GOVERNANCE_REVIEW";
  }
  if (normalizedChecks.baseline_state === "MISSING" ||
      normalizedCoverage.baseline === "MISSING") {
    return "HOLD_FOR_BASELINE";
  }
  if (
    normalizedChecks.workflow_state === "MISSING" ||
    normalizedChecks.metric_state === "MISSING" ||
    ["ai_activity", "workflow", "outcome", "trust", "suppression"].some(
      (lane) => normalizedCoverage[lane] !== "PRESENT"
    )
  ) {
    return "HOLD_FOR_SOURCE_COVERAGE";
  }
  if (
    normalizedChecks.assumption_state !== "PRESENT" ||
    normalizedCoverage.assumptions !== "PRESENT"
  ) {
    return "HOLD_FOR_ASSUMPTIONS";
  }
  return "READY_FOR_EXECUTIVE_VALIDATION";
}

function decisionBlocksClaimBoundary(decision: any): boolean {
  return [
    "HOLD_FOR_SOURCE_COVERAGE",
    "HOLD_FOR_BASELINE",
    "STOP_FOR_GOVERNANCE_REVIEW"
  ].includes(decision);
}

export function validateEvidenceReadiness(readiness: any): ReadinessValidationResult {
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
      claim_boundary:
        gaps.length === 0 && !decisionBlocksClaimBoundary(readiness?.decision),
      customer_facing_economic_output: false
    }
  };
}

export interface BuildReadinessOptions {
  readinessId?: string;
}

export function buildEvidenceReadinessFromObjects(
  blueprint: any,
  metricsLibrary: any,
  scenario: any,
  options: BuildReadinessOptions = {}
): any {
  const blueprintValidation = validateBlueprint(blueprint);
  const metricsRecommendation = recommendMetricsForBlueprint(blueprint, metricsLibrary);
  const scenarioValidation = validateValueScenario(scenario);
  const sourceCoverage = blueprint?.source_requirements?.source_coverage ?? {};
  const sourceCoverageStates = {
    ai_activity: normalizeState(sourceCoverage.ai_activity),
    workflow: normalizeState(sourceCoverage.workflow),
    outcome: normalizeState(sourceCoverage.outcome),
    baseline: normalizeState(sourceCoverage.baseline),
    trust: normalizeState(sourceCoverage.trust),
    assumptions: normalizeState(sourceCoverage.assumptions),
    suppression: normalizeState(sourceCoverage.suppression)
  };
  const readinessChecks = {
    workflow_state: blueprintValidation.valid ? "PRESENT" : "MISSING",
    metric_state: metricsRecommendation.feeds.metrics_mapping ? "PRESENT" : "MISSING",
    baseline_state: sourceCoverageStates.baseline === "PRESENT" ? "PRESENT" : "MISSING",
    assumption_state: deriveAssumptionState(blueprint?.assumption_ledger),
    scenario_state: scenarioValidation.valid ? "PRESENT" : "MISSING",
    governance_state:
      scenarioValidation.valid && blueprintValidation.valid ? "PRESENT" : "BLOCKED"
  };
  const decision = deriveReadinessDecision(readinessChecks, sourceCoverageStates);
  return {
    schema_version: "FT_AI_VALUE_READINESS_2026_06",
    readiness_id: options.readinessId ?? "readiness_customer_support_v1",
    workflow_family:
      blueprint?.workflow_family ?? scenario?.input?.workflow_family ?? null,
    value_route:
      blueprint?.value_routes?.primary ?? scenario?.input?.value_route ?? null,
    source_refs: {
      blueprint_id: blueprint?.blueprint_id ?? null,
      metrics_library_id: metricsLibrary?.library_id ?? null,
      scenario_id: scenario?.scenario_id ?? null
    },
    source_coverage: sourceCoverageStates,
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
