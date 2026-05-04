/**
 * Deterministic constants and deliberately unsafe payloads for governance matcher self-tests.
 */

export const GOV_ORG = "org_governance_regression";
export const GOV_WF_ALPHA = "workflow_gov_alpha";
export const GOV_WF_BETA = "workflow_gov_beta";

/** Intentionally violates executive surface — used only to verify matchers fail closed. */
export const LEAKY_OBSERVABILITY_BODY = {
  org_id: GOV_ORG,
  workflows: [
    {
      workflow_id: GOV_WF_ALPHA,
      classified_execution_count: 1,
      suppressed_execution_count: 0,
      prevalence_mode: "CATEGORICAL_PREVALENCE",
      pattern_distribution: [{ pattern: "BLIND_EFFICIENCY", count: 1 }],
      execution_id: "must-not-appear",
      diagnostics: ["internal"]
    }
  ]
} as const;

export const TREND_LEAK_STRINGS = [
  "workflows improved week over week",
  "productivity up 12%",
  "declined versus prior period"
] as const;

export const RANK_LEAK_STRINGS = [
  "workflow percentile rank",
  "best workflow in org"
] as const;
