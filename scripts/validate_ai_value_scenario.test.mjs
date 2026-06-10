import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildValueScenarioDraftFromBlueprintAndMetrics,
  validateAiValueScenario
} from "./validate_ai_value_scenario.mjs";

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

const baseScenario = {
  schema_version: "FT_AI_VALUE_SCENARIO_2026_06",
  scenario_id: "scenario_customer_support_capacity_v1",
  source: {
    blueprint_id: "bp_customer_support_case_resolution",
    metrics_library_id: "metrics_customer_support_v1"
  },
  input: {
    workflow_family: "customer_support_case_resolution",
    value_route: "CAPACITY_CREATION",
    metric_references: [
      {
        metric_id: "support_median_resolution_hours",
        name: "Median resolution time",
        measurement_unit: "hours",
        allowed_claim_level: "CAVEATED_VALUE_INVESTIGATION"
      },
      {
        metric_id: "support_backlog_count",
        name: "Open backlog count",
        measurement_unit: "cases",
        allowed_claim_level: "CAVEATED_VALUE_INVESTIGATION"
      }
    ],
    customer_owned_assumptions: [
      {
        assumption_id: "case_mix_stability",
        state: "PRESENT",
        owner: "support_operations",
        source: "blueprint_assumption_ledger"
      },
      {
        assumption_id: "volume_context",
        state: "CAVEATED",
        owner: "support_operations",
        source: "blueprint_assumption_ledger"
      }
    ],
    scenario_bands: [
      {
        band: "CONSERVATIVE",
        interpretation: "Directional capacity scenario with narrow realization assumptions.",
        included_metric_ids: ["support_median_resolution_hours"]
      },
      {
        band: "BASE_CASE",
        interpretation: "Directional capacity scenario using all recommended capacity metrics.",
        included_metric_ids: [
          "support_median_resolution_hours",
          "support_backlog_count"
        ]
      },
      {
        band: "EXPANDED",
        interpretation: "Directional capacity scenario for later customer-owned validation.",
        included_metric_ids: [
          "support_median_resolution_hours",
          "support_backlog_count"
        ]
      }
    ],
    output_units: ["hours", "cases"]
  },
  output: {
    claim_state: "CAVEATED_VALUE_INVESTIGATION",
    scenario_summary:
      "Customer-owned scenario draft for testing whether support capacity signals merit further validation.",
    required_caveats: [
      "Scenario bands are planning ranges, not realized ROI.",
      "Outcome movement cannot be attributed to AI without separate customer-owned validation."
    ],
    safe_claims: [
      "Aggregate support metrics can support a caveated capacity-creation investigation."
    ]
  },
  blocked_claims: requiredBlockedClaims,
  governance_boundaries: {
    requires_connector: false,
    requires_dashboard: false,
    requires_realized_roi_calculation: false,
    requires_causality_claim: false,
    requires_individual_scoring: false,
    requires_hr_analytics: false,
    requires_runtime_service: false,
    customer_facing_economic_output: false
  }
};

function scenarioWithPatch(patch) {
  return {
    ...structuredClone(baseScenario),
    ...patch
  };
}

test("validates a governed Customer Support value scenario", () => {
  const result = validateAiValueScenario(baseScenario);

  assert.equal(result.valid, true);
  assert.equal(result.scenario_id, "scenario_customer_support_capacity_v1");
  assert.equal(result.workflow_family, "customer_support_case_resolution");
  assert.equal(result.value_route, "CAPACITY_CREATION");
  assert.equal(result.feeds.executive_validation, true);
  assert.deepEqual(result.gaps, []);
});

test("seeded Customer Support value scenario fixture is valid", () => {
  const fixture = JSON.parse(
    readFileSync(
      "docs/contracts/ai-value-intelligence/examples/customer-support-value-scenario.json",
      "utf8"
    )
  );

  const result = validateAiValueScenario(fixture);

  assert.equal(result.valid, true);
  assert.equal(result.scenario_id, "scenario_customer_support_capacity_v1");
});

test("builds a scenario draft from a validated Blueprint and Metrics Library", () => {
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

  const draft = buildValueScenarioDraftFromBlueprintAndMetrics(
    blueprint,
    metricsLibrary
  );
  const result = validateAiValueScenario(draft);

  assert.equal(result.valid, true);
  assert.equal(draft.source.blueprint_id, "bp_customer_support_case_resolution");
  assert.equal(draft.source.metrics_library_id, "metrics_customer_support_v1");
  assert.equal(draft.input.workflow_family, "customer_support_case_resolution");
  assert.equal(draft.input.value_route, "CAPACITY_CREATION");
  assert.deepEqual(
    draft.input.metric_references.map((metric) => metric.metric_id),
    ["support_median_resolution_hours", "support_backlog_count"]
  );
  assert.equal(draft.output.claim_state, "CAVEATED_VALUE_INVESTIGATION");
});

test("rejects missing workflow family, value route, and metric references", () => {
  const scenario = structuredClone(baseScenario);
  scenario.input.workflow_family = "";
  scenario.input.value_route = "";
  scenario.input.metric_references = [];

  const result = validateAiValueScenario(scenario);

  assert.equal(result.valid, false);
  assert.equal(result.gaps.includes("input.workflow_family is missing"), true);
  assert.equal(result.gaps.includes("input.value_route is missing"), true);
  assert.equal(
    result.gaps.includes("input.metric_references must include at least one metric"),
    true
  );
});

test("rejects unsafe value routes and unsafe claim states", () => {
  const scenario = structuredClone(baseScenario);
  scenario.input.value_route = "PRODUCTIVITY_SCORE";
  scenario.output.claim_state = "ROI_PROOF";

  const result = validateAiValueScenario(scenario);

  assert.equal(result.valid, false);
  assert.equal(
    result.gaps.includes("input.value_route is invalid: PRODUCTIVITY_SCORE"),
    true
  );
  assert.equal(
    result.gaps.includes("output.claim_state is invalid: ROI_PROOF"),
    true
  );
});

test("rejects missing customer-owned assumptions, scenario bands, and output units", () => {
  const scenario = structuredClone(baseScenario);
  scenario.input.customer_owned_assumptions = [];
  scenario.input.scenario_bands = [
    {
      band: "BASE_CASE",
      interpretation: "Only one band is not enough.",
      included_metric_ids: ["support_median_resolution_hours"]
    }
  ];
  scenario.input.output_units = [];

  const result = validateAiValueScenario(scenario);

  assert.equal(result.valid, false);
  assert.equal(
    result.gaps.includes(
      "input.customer_owned_assumptions must include at least one assumption"
    ),
    true
  );
  assert.equal(result.gaps.includes("input.scenario_bands missing CONSERVATIVE"), true);
  assert.equal(result.gaps.includes("input.scenario_bands missing EXPANDED"), true);
  assert.equal(
    result.gaps.includes("input.output_units must include at least one unit"),
    true
  );
});

test("rejects missing blocked claims", () => {
  const result = validateAiValueScenario(
    scenarioWithPatch({
      blocked_claims: ["roi_proof"]
    })
  );

  assert.equal(result.valid, false);
  assert.equal(result.gaps.includes("blocked_claims missing causality_claim"), true);
  assert.equal(
    result.gaps.includes("blocked_claims missing customer_facing_economic_output"),
    true
  );
});

test("rejects governance boundaries that imply production or unsafe claims", () => {
  const scenario = structuredClone(baseScenario);
  scenario.governance_boundaries.requires_connector = true;
  scenario.governance_boundaries.requires_realized_roi_calculation = true;
  scenario.governance_boundaries.requires_hr_analytics = true;

  const result = validateAiValueScenario(scenario);

  assert.equal(result.valid, false);
  assert.equal(
    result.gaps.includes("governance_boundaries.requires_connector is true"),
    true
  );
  assert.equal(
    result.gaps.includes(
      "governance_boundaries.requires_realized_roi_calculation is true"
    ),
    true
  );
  assert.equal(
    result.gaps.includes("governance_boundaries.requires_hr_analytics is true"),
    true
  );
});

test("rejects realized ROI, dollarized output, direct identifiers, and productivity claims", () => {
  const scenario = structuredClone(baseScenario);
  scenario.output.realized_roi = 250000;
  scenario.output.dollar_savings = 125000;
  scenario.output.productivity_lift = "12%";
  scenario.input.employee_id = "employee-123";

  const result = validateAiValueScenario(scenario);

  assert.equal(result.valid, false);
  assert.equal(result.gaps.includes("Forbidden field detected: realized_roi"), true);
  assert.equal(result.gaps.includes("Forbidden field detected: dollar_savings"), true);
  assert.equal(result.gaps.includes("Forbidden field detected: productivity_lift"), true);
  assert.equal(result.gaps.includes("Forbidden field detected: employee_id"), true);
});

test("rejects unsafe language inside scenario safe claims", () => {
  const scenario = structuredClone(baseScenario);
  scenario.output.safe_claims = [
    "This scenario proves ROI and caused productivity lift."
  ];

  const result = validateAiValueScenario(scenario);

  assert.equal(result.valid, false);
  assert.equal(result.gaps.includes("output.safe_claims contains forbidden claim language"), true);
});
