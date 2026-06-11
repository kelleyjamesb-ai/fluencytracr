import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildRoiScenarioFromValueObjects,
  validateAiValueRoiScenario
} from "./validate_ai_value_roi_scenario.mjs";

const requiredBlockedClaims = [
  "roi_proof",
  "causality_claim",
  "individual_scoring",
  "team_or_manager_ranking",
  "hr_analytics",
  "productivity_measurement",
  "realized_roi_calculation",
  "customer_facing_economic_output"
];

const baseRoiScenario = {
  schema_version: "FT_AI_VALUE_ROI_SCENARIO_2026_06",
  roi_scenario_id: "roi_scenario_customer_support_capacity_v1",
  source_refs: {
    blueprint_id: "bp_customer_support_case_resolution",
    metrics_library_id: "metrics_customer_support_v1",
    value_scenario_id: "scenario_customer_support_capacity_v1",
    readiness_id: "readiness_customer_support_v1"
  },
  workflow: {
    workflow_family: "customer_support_case_resolution",
    workflow_name: "Support case resolution",
    value_route: "CAPACITY_CREATION"
  },
  evidence_status: {
    readiness_decision: "HOLD_FOR_ASSUMPTIONS",
    outcome_evidence_review_state: "SUBMITTED",
    source_coverage: {
      ai_activity: "PRESENT",
      workflow: "PRESENT",
      outcome: "PRESENT",
      baseline: "PRESENT",
      trust: "PRESENT",
      assumptions: "CAVEATED",
      suppression: "PRESENT"
    }
  },
  baseline_comparison: {
    baseline_window: {
      state: "PRESENT",
      owner: "support_operations",
      rule: "Compare against an approved pre-period window for the same workflow family."
    },
    comparison_window: {
      state: "PRESENT",
      owner: "support_operations",
      rule: "Compare against the approved post-period window; report directional movement only."
    }
  },
  metric_models: [
    {
      metric_id: "support_median_resolution_hours",
      name: "Median resolution time",
      value_route: "CAPACITY_CREATION",
      measurement_unit: "hours",
      source_system: {
        source_type: "support_system",
        source_name: "Support case management system",
        approved_grain: "aggregate_workflow_window"
      },
      baseline_rule: "Compare against an approved pre-period window for the same workflow family.",
      comparison_rule: "Compare against the approved post-period window; report directional movement only.",
      formula_template: "aggregate comparison only; customer computes directional delta",
      allowed_claim_level: "CAVEATED_VALUE_INVESTIGATION",
      value_model_role: "PRIMARY"
    }
  ],
  customer_owned_assumptions: [
    {
      assumption_id: "case_mix_stability",
      state: "PRESENT",
      owner: "support_operations"
    },
    {
      assumption_id: "staffing_and_coverage_context",
      state: "MISSING",
      owner: "support_leader"
    }
  ],
  scenario_bands: [
    {
      band: "CONSERVATIVE",
      interpretation: "Use the narrowest customer-owned assumption set.",
      included_metric_ids: ["support_median_resolution_hours"]
    },
    {
      band: "BASE_CASE",
      interpretation: "Use approved baseline and comparison windows with current caveats.",
      included_metric_ids: ["support_median_resolution_hours"]
    },
    {
      band: "EXPANDED",
      interpretation: "Use only after customer assumptions and outcome evidence are accepted.",
      included_metric_ids: ["support_median_resolution_hours"]
    }
  ],
  safe_value_language: {
    allowed_claim_level: "CAVEATED_VALUE_INVESTIGATION",
    allowed_phrases: [
      "Potential capacity-creation opportunity for customer-owned validation."
    ],
    required_caveats: [
      "Scenario bands are planning ranges, not realized ROI.",
      "Outcome movement cannot be attributed to AI without separate validation."
    ],
    blocked_claims: requiredBlockedClaims
  },
  economic_output_policy: {
    mode: "MODELED_RANGE_ONLY",
    customer_facing_economic_output: false,
    dollarized_output: false,
    realized_roi_calculation: false
  },
  governance_boundaries: {
    production_connector: false,
    dashboard: false,
    realized_roi_calculation: false,
    causality_claim: false,
    individual_scoring: false,
    hris_or_people_analytics: false,
    productivity_ranking: false,
    raw_prompt_or_response_storage: false,
    direct_identifiers: false,
    runtime_service: false,
    autonomous_customer_actions: false,
    customer_facing_economic_output: false
  }
};

test("validates a governed Customer Support ROI scenario", () => {
  const result = validateAiValueRoiScenario(baseRoiScenario);

  assert.equal(result.valid, true);
  assert.equal(result.roi_scenario_id, "roi_scenario_customer_support_capacity_v1");
  assert.equal(result.workflow_family, "customer_support_case_resolution");
  assert.equal(result.value_route, "CAPACITY_CREATION");
  assert.equal(result.evidence_status.readiness_decision, "HOLD_FOR_ASSUMPTIONS");
  assert.equal(result.feeds.value_modeling, true);
  assert.equal(result.feeds.customer_facing_economic_output, false);
  assert.deepEqual(result.gaps, []);
});

test("seeded Customer Support ROI scenario fixture is valid", () => {
  const fixture = JSON.parse(
    readFileSync(
      "docs/contracts/ai-value-intelligence/examples/customer-support-roi-scenario.json",
      "utf8"
    )
  );

  const result = validateAiValueRoiScenario(fixture);

  assert.equal(result.valid, true);
  assert.equal(result.roi_scenario_id, "roi_scenario_customer_support_capacity_v1");
});

test("builds a governed ROI scenario from Blueprint, Metrics, Value Scenario, and Readiness", () => {
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
  const valueScenario = JSON.parse(
    readFileSync(
      "docs/contracts/ai-value-intelligence/examples/customer-support-value-scenario.json",
      "utf8"
    )
  );
  const readiness = JSON.parse(
    readFileSync(
      "docs/contracts/ai-value-intelligence/examples/customer-support-evidence-readiness.json",
      "utf8"
    )
  );

  const roiScenario = buildRoiScenarioFromValueObjects({
    blueprint,
    metricsLibrary,
    valueScenario,
    readiness,
    outcomeEvidenceReviewState: "SUBMITTED"
  });
  const result = validateAiValueRoiScenario(roiScenario);

  assert.equal(result.valid, true);
  assert.equal(roiScenario.source_refs.blueprint_id, "bp_customer_support_case_resolution");
  assert.equal(roiScenario.workflow.value_route, "CAPACITY_CREATION");
  assert.equal(roiScenario.baseline_comparison.baseline_window.state, "PRESENT");
  assert.equal(roiScenario.evidence_status.outcome_evidence_review_state, "SUBMITTED");
  assert.equal(roiScenario.economic_output_policy.customer_facing_economic_output, false);
});

test("rejects missing source refs and missing baseline/comparison windows", () => {
  const scenario = structuredClone(baseRoiScenario);
  delete scenario.source_refs.readiness_id;
  scenario.baseline_comparison.baseline_window.state = "";
  scenario.baseline_comparison.comparison_window.rule = "";

  const result = validateAiValueRoiScenario(scenario);

  assert.equal(result.valid, false);
  assert.equal(result.gaps.includes("source_refs.readiness_id is missing"), true);
  assert.equal(result.gaps.includes("baseline_comparison.baseline_window.state is missing"), true);
  assert.equal(result.gaps.includes("baseline_comparison.comparison_window.rule is missing"), true);
});

test("rejects realized ROI, dollarized output, direct identifiers, and productivity fields", () => {
  const scenario = structuredClone(baseRoiScenario);
  scenario.economic_output_policy.customer_facing_economic_output = true;
  scenario.output = {
    realized_roi: 250000,
    dollar_savings: 125000,
    productivity_score: 0.12,
    employee_id: "employee-123"
  };

  const result = validateAiValueRoiScenario(scenario);

  assert.equal(result.valid, false);
  assert.equal(result.gaps.includes("economic_output_policy.customer_facing_economic_output is true"), true);
  assert.equal(result.gaps.includes("Forbidden field detected: realized_roi"), true);
  assert.equal(result.gaps.includes("Forbidden field detected: dollar_savings"), true);
  assert.equal(result.gaps.includes("Forbidden field detected: productivity_score"), true);
  assert.equal(result.gaps.includes("Forbidden field detected: employee_id"), true);
});

test("rejects unsafe safe-value language and missing blocked claims", () => {
  const scenario = structuredClone(baseRoiScenario);
  scenario.safe_value_language.allowed_phrases = [
    "Glean proved ROI and caused productivity lift."
  ];
  scenario.safe_value_language.blocked_claims = ["roi_proof"];

  const result = validateAiValueRoiScenario(scenario);

  assert.equal(result.valid, false);
  assert.equal(result.gaps.includes("safe_value_language.allowed_phrases contains forbidden claim language"), true);
  assert.equal(result.gaps.includes("safe_value_language.blocked_claims missing causality_claim"), true);
  assert.equal(
    result.gaps.includes("safe_value_language.blocked_claims missing customer_facing_economic_output"),
    true
  );
});

test("rejects governance boundaries that imply production actions or unsafe claims", () => {
  const scenario = structuredClone(baseRoiScenario);
  scenario.governance_boundaries.production_connector = true;
  scenario.governance_boundaries.causality_claim = true;
  scenario.governance_boundaries.autonomous_customer_actions = true;

  const result = validateAiValueRoiScenario(scenario);

  assert.equal(result.valid, false);
  assert.equal(result.gaps.includes("governance_boundaries.production_connector is true"), true);
  assert.equal(result.gaps.includes("governance_boundaries.causality_claim is true"), true);
  assert.equal(result.gaps.includes("governance_boundaries.autonomous_customer_actions is true"), true);
});
