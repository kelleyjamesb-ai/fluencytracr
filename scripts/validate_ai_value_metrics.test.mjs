import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  recommendMetricsForBlueprint,
  validateAiValueMetricsLibrary
} from "./validate_ai_value_metrics.mjs";

const baseLibrary = {
  schema_version: "FT_AI_VALUE_METRICS_LIBRARY_2026_06",
  library_id: "metrics_customer_support_v1",
  workflow_family: "customer_support_case_resolution",
  metrics: [
    {
      metric_id: "support_median_resolution_hours",
      name: "Median resolution time",
      definition:
        "Median elapsed hours from support case creation to resolved state for eligible cases.",
      value_route: "CAPACITY_CREATION",
      metric_priority: "P0",
      source_system: {
        source_type: "support_system",
        source_name: "Support case management system",
        approved_grain: "aggregate_workflow_window"
      },
      measurement_unit: "hours",
      baseline_rule: "Compare against an approved pre-period window for the same workflow family.",
      comparison_rule:
        "Compare against the approved post-period window; report directional movement only.",
      owner: "support_operations",
      allowed_claim_level: "CAVEATED_VALUE_INVESTIGATION",
      blocked_claims: [
        "roi_proof",
        "causality_claim",
        "individual_scoring",
        "team_or_manager_ranking",
        "hr_analytics",
        "productivity_measurement"
      ]
    },
    {
      metric_id: "support_escalation_rate",
      name: "Escalation rate",
      definition:
        "Share of eligible support cases escalated from first-line support to advanced support.",
      value_route: "COST_REDUCTION",
      metric_priority: "P0",
      source_system: {
        source_type: "support_system",
        source_name: "Support case management system",
        approved_grain: "aggregate_workflow_window"
      },
      measurement_unit: "share",
      baseline_rule: "Compare against an approved pre-period escalation rate.",
      comparison_rule: "Compare post-period escalation share directionally with caveats.",
      owner: "support_operations",
      allowed_claim_level: "CAVEATED_VALUE_INVESTIGATION",
      blocked_claims: [
        "roi_proof",
        "causality_claim",
        "individual_scoring",
        "team_or_manager_ranking",
        "hr_analytics",
        "productivity_measurement"
      ]
    },
    {
      metric_id: "support_reopen_rate",
      name: "Reopen rate",
      definition:
        "Share of eligible resolved support cases reopened within the approved measurement window.",
      value_route: "QUALITY_IMPROVEMENT",
      metric_priority: "P1",
      source_system: {
        source_type: "support_system",
        source_name: "Support case management system",
        approved_grain: "aggregate_workflow_window"
      },
      measurement_unit: "share",
      baseline_rule: "Compare against an approved pre-period reopen rate.",
      comparison_rule: "Compare post-period reopen share directionally with caveats.",
      owner: "support_quality",
      allowed_claim_level: "CAVEATED_VALUE_INVESTIGATION",
      blocked_claims: [
        "roi_proof",
        "causality_claim",
        "individual_scoring",
        "team_or_manager_ranking",
        "hr_analytics",
        "productivity_measurement"
      ]
    }
  ]
};

const supportBlueprint = {
  schema_version: "FT_AI_VALUE_BLUEPRINT_2026_06",
  blueprint_id: "bp_customer_support_case_resolution",
  workflow_family: "customer_support_case_resolution",
  value_routes: {
    primary: "CAPACITY_CREATION",
    secondary: ["COST_REDUCTION", "QUALITY_IMPROVEMENT"]
  }
};

function libraryWithMetricPatch(patch) {
  const library = structuredClone(baseLibrary);
  library.metrics[0] = {
    ...library.metrics[0],
    ...patch
  };
  return library;
}

test("validates a Customer Support metrics library and recommends metrics from a blueprint", () => {
  const validation = validateAiValueMetricsLibrary(baseLibrary);
  const recommendation = recommendMetricsForBlueprint(supportBlueprint, baseLibrary);

  assert.equal(validation.valid, true);
  assert.deepEqual(validation.gaps, []);
  assert.equal(recommendation.workflow_family, "customer_support_case_resolution");
  assert.deepEqual(recommendation.value_routes, [
    "CAPACITY_CREATION",
    "COST_REDUCTION",
    "QUALITY_IMPROVEMENT"
  ]);
  assert.deepEqual(
    recommendation.recommended_metrics.map((metric) => metric.metric_id),
    [
      "support_median_resolution_hours",
      "support_escalation_rate",
      "support_reopen_rate"
    ]
  );
  assert.equal(recommendation.feeds.metrics_mapping, true);
});

test("seeded Customer Support metrics fixture is valid", () => {
  const fixture = JSON.parse(
    readFileSync(
      "docs/contracts/ai-value-intelligence/examples/customer-support-metrics-library.json",
      "utf8"
    )
  );

  const result = validateAiValueMetricsLibrary(fixture);

  assert.equal(result.valid, true);
  assert.equal(result.library_id, "metrics_customer_support_v1");
});

test("rejects a missing metric name and definition", () => {
  const result = validateAiValueMetricsLibrary(
    libraryWithMetricPatch({ name: "", definition: "" })
  );

  assert.equal(result.valid, false);
  assert.equal(result.gaps.includes("metrics[0].name is missing"), true);
  assert.equal(result.gaps.includes("metrics[0].definition is missing"), true);
});

test("rejects an unsupported value route", () => {
  const result = validateAiValueMetricsLibrary(
    libraryWithMetricPatch({ value_route: "PRODUCTIVITY_SCORE" })
  );

  assert.equal(result.valid, false);
  assert.equal(
    result.gaps.includes("metrics[0].value_route is invalid: PRODUCTIVITY_SCORE"),
    true
  );
});

test("rejects missing source system, measurement unit, baseline, comparison, and owner", () => {
  const result = validateAiValueMetricsLibrary(
    libraryWithMetricPatch({
      source_system: {},
      measurement_unit: "",
      baseline_rule: "",
      comparison_rule: "",
      owner: ""
    })
  );

  assert.equal(result.valid, false);
  assert.equal(result.gaps.includes("metrics[0].source_system.source_type is missing"), true);
  assert.equal(result.gaps.includes("metrics[0].source_system.source_name is missing"), true);
  assert.equal(result.gaps.includes("metrics[0].measurement_unit is missing"), true);
  assert.equal(result.gaps.includes("metrics[0].baseline_rule is missing"), true);
  assert.equal(result.gaps.includes("metrics[0].comparison_rule is missing"), true);
  assert.equal(result.gaps.includes("metrics[0].owner is missing"), true);
});

test("rejects unsafe claim levels and missing blocked claims", () => {
  const result = validateAiValueMetricsLibrary(
    libraryWithMetricPatch({
      allowed_claim_level: "ROI_PROOF",
      blocked_claims: ["roi_proof"]
    })
  );

  assert.equal(result.valid, false);
  assert.equal(
    result.gaps.includes("metrics[0].allowed_claim_level is invalid: ROI_PROOF"),
    true
  );
  assert.equal(result.gaps.includes("metrics[0].blocked_claims missing causality_claim"), true);
  assert.equal(
    result.gaps.includes("metrics[0].blocked_claims missing productivity_measurement"),
    true
  );
});

test("recommendation holds when no metric matches a blueprint value route", () => {
  const recommendation = recommendMetricsForBlueprint(
    {
      ...supportBlueprint,
      value_routes: {
        primary: "REVENUE_EXPANSION",
        secondary: []
      }
    },
    baseLibrary
  );

  assert.equal(recommendation.feeds.metrics_mapping, false);
  assert.equal(recommendation.decision, "HOLD_FOR_METRIC_MAPPING");
  assert.deepEqual(recommendation.recommended_metrics, []);
});
