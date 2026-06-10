import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildEvidenceReadinessFromObjects,
  validateAiValueReadiness
} from "./validate_ai_value_readiness.mjs";

const requiredBlockedClaims = [
  "roi_proof",
  "causality_claim",
  "individual_scoring",
  "team_or_manager_ranking",
  "hr_analytics",
  "productivity_measurement",
  "customer_facing_economic_output"
];

const baseReadiness = {
  schema_version: "FT_AI_VALUE_READINESS_2026_06",
  readiness_id: "readiness_customer_support_v1",
  workflow_family: "customer_support_case_resolution",
  value_route: "CAPACITY_CREATION",
  source_refs: {
    blueprint_id: "bp_customer_support_case_resolution",
    metrics_library_id: "metrics_customer_support_v1",
    scenario_id: "scenario_customer_support_capacity_v1"
  },
  source_coverage: {
    ai_activity: "PRESENT",
    workflow: "PRESENT",
    outcome: "PRESENT",
    baseline: "PRESENT",
    trust: "PRESENT",
    assumptions: "CAVEATED",
    suppression: "PRESENT"
  },
  readiness_checks: {
    workflow_state: "PRESENT",
    metric_state: "PRESENT",
    baseline_state: "PRESENT",
    assumption_state: "CAVEATED",
    scenario_state: "PRESENT",
    governance_state: "PRESENT"
  },
  decision: "HOLD_FOR_ASSUMPTIONS",
  decision_rationale: [
    "Material customer-owned assumptions are still missing or caveated."
  ],
  next_actions: [
    "Review missing staffing, channel mix, process, knowledge, metric definition, and rollout assumptions with customer owners."
  ],
  blocked_claims: requiredBlockedClaims,
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

test("validates a governed Evidence Readiness record", () => {
  const result = validateAiValueReadiness(baseReadiness);

  assert.equal(result.valid, true);
  assert.equal(result.readiness_id, "readiness_customer_support_v1");
  assert.equal(result.decision, "HOLD_FOR_ASSUMPTIONS");
  assert.equal(result.feeds.claim_boundary, true);
  assert.deepEqual(result.gaps, []);
});

test("seeded Customer Support readiness fixture is valid", () => {
  const fixture = JSON.parse(
    readFileSync(
      "docs/contracts/ai-value-intelligence/examples/customer-support-evidence-readiness.json",
      "utf8"
    )
  );

  const result = validateAiValueReadiness(fixture);

  assert.equal(result.valid, true);
  assert.equal(result.decision, "HOLD_FOR_ASSUMPTIONS");
});

test("builds readiness from Blueprint, Metrics Library, and Value Scenario", () => {
  const blueprint = JSON.parse(
    readFileSync(
      "docs/contracts/ai-value-intelligence/examples/customer-support-blueprint.json",
      "utf8"
    )
  );
  const metricsLibrary = JSON.parse(
    readFileSync(
      "docs/contracts/ai-value-intelligence/examples/customer-support-metrics-library.json",
      "utf8"
    )
  );
  const scenario = JSON.parse(
    readFileSync(
      "docs/contracts/ai-value-intelligence/examples/customer-support-value-scenario.json",
      "utf8"
    )
  );

  const readiness = buildEvidenceReadinessFromObjects(
    blueprint,
    metricsLibrary,
    scenario
  );
  const result = validateAiValueReadiness(readiness);

  assert.equal(result.valid, true);
  assert.equal(readiness.workflow_family, "customer_support_case_resolution");
  assert.equal(readiness.value_route, "CAPACITY_CREATION");
  assert.equal(readiness.decision, "HOLD_FOR_ASSUMPTIONS");
});

test("rejects missing workflow, value route, source refs, and readiness decision", () => {
  const readiness = structuredClone(baseReadiness);
  readiness.workflow_family = "";
  readiness.value_route = "";
  readiness.source_refs = {};
  readiness.decision = "";

  const result = validateAiValueReadiness(readiness);

  assert.equal(result.valid, false);
  assert.equal(result.gaps.includes("workflow_family is missing"), true);
  assert.equal(result.gaps.includes("value_route is missing"), true);
  assert.equal(result.gaps.includes("source_refs.blueprint_id is missing"), true);
  assert.equal(result.gaps.includes("decision is missing"), true);
});

test("rejects invalid source, readiness, and decision states", () => {
  const readiness = structuredClone(baseReadiness);
  readiness.source_coverage.outcome = "RAW_ROWS_PRESENT";
  readiness.readiness_checks.metric_state = "SCORED";
  readiness.decision = "READY_FOR_ROI_PROOF";

  const result = validateAiValueReadiness(readiness);

  assert.equal(result.valid, false);
  assert.equal(
    result.gaps.includes("source_coverage.outcome is invalid: RAW_ROWS_PRESENT"),
    true
  );
  assert.equal(
    result.gaps.includes("readiness_checks.metric_state is invalid: SCORED"),
    true
  );
  assert.equal(result.gaps.includes("decision is invalid: READY_FOR_ROI_PROOF"), true);
});

test("rejects missing blocked claims and unsafe governance boundaries", () => {
  const readiness = structuredClone(baseReadiness);
  readiness.blocked_claims = ["roi_proof"];
  readiness.governance_boundaries.realized_roi_calculation = true;
  readiness.governance_boundaries.hr_analytics = true;

  const result = validateAiValueReadiness(readiness);

  assert.equal(result.valid, false);
  assert.equal(result.gaps.includes("blocked_claims missing causality_claim"), true);
  assert.equal(
    result.gaps.includes("governance_boundaries.realized_roi_calculation is true"),
    true
  );
  assert.equal(result.gaps.includes("governance_boundaries.hr_analytics is true"), true);
});

test("holds source coverage when outcome trust or suppression lanes are missing", () => {
  const readiness = structuredClone(baseReadiness);
  readiness.source_coverage.outcome = "MISSING";
  readiness.source_coverage.trust = "MISSING";
  readiness.source_coverage.suppression = "SUPPRESSED";
  readiness.decision = "READY_FOR_EXECUTIVE_VALIDATION";

  const result = validateAiValueReadiness(readiness);

  assert.equal(result.valid, false);
  assert.equal(
    result.gaps.includes(
      "decision READY_FOR_EXECUTIVE_VALIDATION contradicts readiness checks; expected HOLD_FOR_SOURCE_COVERAGE"
    ),
    true
  );
  assert.equal(result.feeds.claim_boundary, false);
});

test("rejects ready decisions when governance checks are blocked", () => {
  const readiness = structuredClone(baseReadiness);
  readiness.readiness_checks.governance_state = "BLOCKED";
  readiness.decision = "READY_FOR_EXECUTIVE_VALIDATION";

  const result = validateAiValueReadiness(readiness);

  assert.equal(result.valid, false);
  assert.equal(
    result.gaps.includes(
      "decision READY_FOR_EXECUTIVE_VALIDATION contradicts readiness checks; expected STOP_FOR_GOVERNANCE_REVIEW"
    ),
    true
  );
  assert.equal(result.feeds.claim_boundary, false);
});
