import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildRoiScenarioFromValueObjects,
  validateAiValueRoiScenario
} from "./validate_ai_value_roi_scenario.mjs";

const alwaysBlockedClaims = [
  "individual_scoring",
  "named_employee_productivity",
  "individual_productivity_measurement",
  "team_or_manager_ranking",
  "productivity_ranking",
  "people_decisioning",
  "compensation_or_performance_inference",
  "hris_inference",
  "raw_prompt_or_response_storage",
  "direct_identifiers",
  "raw_content_storage"
];

const financialClaimGate = {
  mode: "BLOCKED",
  data_sufficiency: {
    aggregate_only: false,
    baseline_present: false,
    comparison_present: false,
    outcome_metric_accepted: false,
    financial_assumptions_present: false,
    investment_costs_present: false,
    finance_owner_attested: false,
    confounds_reviewed: false,
    legal_or_governance_approved: false,
    experimental_or_quasi_experimental_design: false
  },
  allowed_outputs: {
    dollarized_output: false,
    realized_roi_calculation: false,
    customer_facing_economic_output: false,
    causality_language: false,
    aggregate_workflow_productivity: false
  }
};

const workforceAnalyticsGate = {
  mode: "BLOCKED",
  aggregate_only: false,
  minimum_cohort_size_met: false,
  no_direct_identifiers: false,
  no_person_level_hris_records: false,
  no_hashed_or_joinable_person_identifiers: false,
  no_person_level_productivity: false,
  no_manager_ranking: false,
  no_individual_decisioning: false,
  no_people_decisioning: false,
  no_compensation_or_performance_inference: false,
  no_hris_inference_from_ai_usage: false,
  no_sensitive_attribute_inference: false,
  hris_join_allowed: false,
  allowed_outputs: {
    aggregate_workforce_context: false,
    aggregate_hris_derived_context: false,
    aggregate_role_family_context: false,
    aggregate_new_hire_cohort_context: false,
    aggregate_training_completion_context: false,
    aggregate_capacity_planning_context: false,
    aggregate_workforce_readiness: false,
    aggregate_enablement_coverage: false,
    aggregate_training_completion: false,
    aggregate_ai_confidence: false,
    aggregate_change_readiness: false,
    aggregate_workflow_capacity: false,
    aggregate_role_family_adoption: false
  }
};

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
    blocked_claims: alwaysBlockedClaims
  },
  economic_output_policy: {
    mode: "MODELED_RANGE_ONLY",
    customer_facing_economic_output: false,
    dollarized_output: false,
    realized_roi_calculation: false
  },
  financial_claim_gate: financialClaimGate,
  workforce_analytics_gate: workforceAnalyticsGate,
  governance_boundaries: {
    production_connector: false,
    dashboard: false,
    individual_scoring: false,
    named_employee_productivity: false,
    individual_productivity_measurement: false,
    team_or_manager_ranking: false,
    productivity_ranking: false,
    people_decisioning: false,
    compensation_or_performance_inference: false,
    hris_inference: false,
    raw_prompt_or_response_storage: false,
    raw_content_storage: false,
    direct_identifiers: false,
    runtime_service: false,
    autonomous_customer_actions: false
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
  assert.equal(roiScenario.financial_claim_gate.mode, "BLOCKED");
  assert.equal(roiScenario.workforce_analytics_gate.mode, "BLOCKED");
  assert.equal(
    roiScenario.safe_value_language.blocked_claims.includes("hr_analytics"),
    false
  );
  assert.equal(
    roiScenario.safe_value_language.blocked_claims.includes("productivity_measurement"),
    false
  );
  assert.equal(
    roiScenario.safe_value_language.blocked_claims.includes("hris_inference"),
    true
  );
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

test("allows dollarized output only when the financial claim gate has aggregate accepted assumptions", () => {
  const scenario = structuredClone(baseRoiScenario);
  scenario.financial_claim_gate.mode = "INTERNAL_MODELING";
  scenario.financial_claim_gate.allowed_outputs.dollarized_output = true;

  const result = validateAiValueRoiScenario(scenario);

  assert.equal(result.valid, false);
  assert.equal(
    result.gaps.includes("financial_claim_gate.allowed_outputs.dollarized_output requires data_sufficiency.aggregate_only"),
    true
  );
  assert.equal(
    result.gaps.includes("financial_claim_gate.allowed_outputs.dollarized_output requires data_sufficiency.outcome_metric_accepted"),
    true
  );
  assert.equal(
    result.gaps.includes("financial_claim_gate.allowed_outputs.dollarized_output requires data_sufficiency.financial_assumptions_present"),
    true
  );

  scenario.financial_claim_gate.data_sufficiency.aggregate_only = true;
  scenario.financial_claim_gate.data_sufficiency.outcome_metric_accepted = true;
  scenario.financial_claim_gate.data_sufficiency.financial_assumptions_present = true;

  const allowed = validateAiValueRoiScenario(scenario);

  assert.equal(allowed.valid, true);
});

test("routes dollarized fields through the financial claim gate instead of broad key blocking", () => {
  const scenario = structuredClone(baseRoiScenario);
  scenario.output = {
    dollar_savings: "customer-owned modeled amount"
  };

  const ungated = validateAiValueRoiScenario(scenario);

  assert.equal(ungated.valid, false);
  assert.equal(
    ungated.gaps.includes("Forbidden field detected: dollar_savings"),
    false
  );
  assert.equal(
    ungated.gaps.includes("financial_claim_gate.allowed_outputs.dollarized_output must be true when dollarized_output is requested"),
    true
  );

  scenario.financial_claim_gate.mode = "INTERNAL_MODELING";
  scenario.financial_claim_gate.allowed_outputs.dollarized_output = true;
  Object.assign(scenario.financial_claim_gate.data_sufficiency, {
    aggregate_only: true,
    outcome_metric_accepted: true,
    financial_assumptions_present: true
  });

  const gated = validateAiValueRoiScenario(scenario);

  assert.equal(gated.valid, true);
});

test("allows realized ROI only when the financial claim gate has baseline, comparison, costs, finance, and confounds", () => {
  const scenario = structuredClone(baseRoiScenario);
  scenario.financial_claim_gate.mode = "FINANCE_VALIDATED";
  scenario.financial_claim_gate.allowed_outputs.realized_roi_calculation = true;
  Object.assign(scenario.financial_claim_gate.data_sufficiency, {
    aggregate_only: true,
    baseline_present: true,
    comparison_present: true,
    outcome_metric_accepted: true,
    financial_assumptions_present: true,
    investment_costs_present: true,
    finance_owner_attested: true
  });

  const result = validateAiValueRoiScenario(scenario);

  assert.equal(result.valid, false);
  assert.equal(
    result.gaps.includes("financial_claim_gate.allowed_outputs.realized_roi_calculation requires data_sufficiency.confounds_reviewed"),
    true
  );

  scenario.financial_claim_gate.data_sufficiency.confounds_reviewed = true;

  const allowed = validateAiValueRoiScenario(scenario);

  assert.equal(allowed.valid, true);
});

test("rejects individual scoring present no matter what financial gate is approved", () => {
  const scenario = structuredClone(baseRoiScenario);
  scenario.financial_claim_gate.mode = "CUSTOMER_FACING_APPROVED";
  Object.assign(scenario.financial_claim_gate.data_sufficiency, {
    aggregate_only: true,
    outcome_metric_accepted: true,
    financial_assumptions_present: true,
    finance_owner_attested: true,
    legal_or_governance_approved: true
  });
  scenario.financial_claim_gate.allowed_outputs.customer_facing_economic_output = true;
  scenario.output = {
    individual_scoring: true
  };

  const result = validateAiValueRoiScenario(scenario);

  assert.equal(result.valid, false);
  assert.equal(result.gaps.includes("Forbidden field detected: individual_scoring"), true);
});

test("rejects named employee productivity present no matter what financial gate is approved", () => {
  const scenario = structuredClone(baseRoiScenario);
  scenario.financial_claim_gate.mode = "CUSTOMER_FACING_APPROVED";
  Object.assign(scenario.financial_claim_gate.data_sufficiency, {
    aggregate_only: true,
    outcome_metric_accepted: true,
    financial_assumptions_present: true,
    finance_owner_attested: true,
    legal_or_governance_approved: true
  });
  scenario.financial_claim_gate.allowed_outputs.customer_facing_economic_output = true;
  scenario.output = {
    named_employee_productivity: "unsafe"
  };

  const result = validateAiValueRoiScenario(scenario);

  assert.equal(result.valid, false);
  assert.equal(result.gaps.includes("Forbidden field detected: named_employee_productivity"), true);
});

test("rejects manager ranking present no matter what financial gate is approved", () => {
  const scenario = structuredClone(baseRoiScenario);
  scenario.financial_claim_gate.mode = "CUSTOMER_FACING_APPROVED";
  Object.assign(scenario.financial_claim_gate.data_sufficiency, {
    aggregate_only: true,
    outcome_metric_accepted: true,
    financial_assumptions_present: true,
    finance_owner_attested: true,
    legal_or_governance_approved: true
  });
  scenario.financial_claim_gate.allowed_outputs.customer_facing_economic_output = true;
  scenario.output = {
    team_or_manager_ranking: "unsafe"
  };

  const result = validateAiValueRoiScenario(scenario);

  assert.equal(result.valid, false);
  assert.equal(result.gaps.includes("Forbidden field detected: team_or_manager_ranking"), true);
});

test("rejects HRIS inference present no matter what financial gate is approved", () => {
  const scenario = structuredClone(baseRoiScenario);
  scenario.financial_claim_gate.mode = "CUSTOMER_FACING_APPROVED";
  Object.assign(scenario.financial_claim_gate.data_sufficiency, {
    aggregate_only: true,
    outcome_metric_accepted: true,
    financial_assumptions_present: true,
    finance_owner_attested: true,
    legal_or_governance_approved: true
  });
  scenario.financial_claim_gate.allowed_outputs.customer_facing_economic_output = true;
  scenario.output = {
    hris_inference: true
  };

  const result = validateAiValueRoiScenario(scenario);

  assert.equal(result.valid, false);
  assert.equal(result.gaps.includes("Forbidden field detected: hris_inference"), true);
});

test("requires customer-facing approval and governance signoff for customer-facing economic output", () => {
  const scenario = structuredClone(baseRoiScenario);
  scenario.financial_claim_gate.mode = "FINANCE_VALIDATED";
  scenario.financial_claim_gate.allowed_outputs.customer_facing_economic_output = true;
  scenario.financial_claim_gate.data_sufficiency.finance_owner_attested = true;

  const result = validateAiValueRoiScenario(scenario);

  assert.equal(result.valid, false);
  assert.equal(
    result.gaps.includes("financial_claim_gate.allowed_outputs.customer_facing_economic_output requires mode CUSTOMER_FACING_APPROVED"),
    true
  );
  assert.equal(
    result.gaps.includes("financial_claim_gate.allowed_outputs.customer_facing_economic_output requires data_sufficiency.legal_or_governance_approved"),
    true
  );

  scenario.financial_claim_gate.mode = "CUSTOMER_FACING_APPROVED";
  scenario.financial_claim_gate.data_sufficiency.legal_or_governance_approved = true;

  const allowed = validateAiValueRoiScenario(scenario);

  assert.equal(allowed.valid, true);
  assert.equal(allowed.feeds.customer_facing_economic_output, true);
});

test("routes customer-facing economic output fields through the financial claim gate", () => {
  const scenario = structuredClone(baseRoiScenario);
  scenario.output = {
    customer_facing_economic_output: true
  };

  const result = validateAiValueRoiScenario(scenario);

  assert.equal(result.valid, false);
  assert.equal(
    result.gaps.includes("financial_claim_gate.allowed_outputs.customer_facing_economic_output must be true when customer_facing_economic_output is requested"),
    true
  );
  assert.equal(
    result.gaps.includes("financial_claim_gate.allowed_outputs.customer_facing_economic_output requires mode CUSTOMER_FACING_APPROVED"),
    true
  );
});

test("allows causality language only with experimental or quasi-experimental design", () => {
  const scenario = structuredClone(baseRoiScenario);
  scenario.financial_claim_gate.mode = "EXECUTIVE_CAVEATED";
  scenario.financial_claim_gate.allowed_outputs.causality_language = true;

  const result = validateAiValueRoiScenario(scenario);

  assert.equal(result.valid, false);
  assert.equal(
    result.gaps.includes("financial_claim_gate.allowed_outputs.causality_language requires data_sufficiency.experimental_or_quasi_experimental_design"),
    true
  );

  scenario.financial_claim_gate.data_sufficiency.experimental_or_quasi_experimental_design = true;

  const allowed = validateAiValueRoiScenario(scenario);

  assert.equal(allowed.valid, true);
});

test("allows aggregate workflow productivity only with aggregate baseline comparison and an accepted outcome metric", () => {
  const scenario = structuredClone(baseRoiScenario);
  scenario.financial_claim_gate.mode = "EXECUTIVE_CAVEATED";
  scenario.financial_claim_gate.allowed_outputs.aggregate_workflow_productivity = true;
  Object.assign(scenario.financial_claim_gate.data_sufficiency, {
    aggregate_only: true,
    baseline_present: true,
    comparison_present: true
  });

  const result = validateAiValueRoiScenario(scenario);

  assert.equal(result.valid, false);
  assert.equal(
    result.gaps.includes("financial_claim_gate.allowed_outputs.aggregate_workflow_productivity requires data_sufficiency.outcome_metric_accepted"),
    true
  );

  scenario.financial_claim_gate.data_sufficiency.outcome_metric_accepted = true;

  const allowed = validateAiValueRoiScenario(scenario);

  assert.equal(allowed.valid, true);
});

test("allows aggregate HRIS-derived workforce context only with all workforce safety checks and no persisted HRIS join", () => {
  const scenario = structuredClone(baseRoiScenario);
  scenario.workforce_analytics_gate.mode = "AGGREGATE_INTERNAL";
  scenario.workforce_analytics_gate.allowed_outputs.aggregate_workforce_readiness = true;
  scenario.workforce_analytics_gate.allowed_outputs.aggregate_hris_derived_context = true;
  scenario.aggregate_workforce_context = {
    aggregate_hris_derived_context: {
      aggregate_only: true,
      source_owner_role: "people_analytics_manager",
      metric_owner_role: "workforce_analytics_manager",
      approved_grain: "approved_aggregate_cohort"
    }
  };
  Object.assign(scenario.workforce_analytics_gate, {
    aggregate_only: true,
    minimum_cohort_size_met: true,
    no_direct_identifiers: true,
    no_person_level_hris_records: true,
    no_hashed_or_joinable_person_identifiers: true,
    no_person_level_productivity: true,
    no_manager_ranking: true,
    no_individual_decisioning: true,
    no_people_decisioning: true,
    no_compensation_or_performance_inference: true,
    no_hris_inference_from_ai_usage: true,
    no_sensitive_attribute_inference: true,
    hris_join_allowed: true
  });

  const result = validateAiValueRoiScenario(scenario);

  assert.equal(result.valid, false);
  assert.equal(
    result.gaps.includes("workforce_analytics_gate.hris_join_allowed must be false (no persisted person-level HRIS join in FluencyTracr)"),
    true
  );

  scenario.workforce_analytics_gate.hris_join_allowed = false;

  const allowed = validateAiValueRoiScenario(scenario);

  assert.equal(allowed.valid, true);
});

test("rejects person-level HRIS, hashed identifiers, decisioning, ranking, and inference fields", () => {
  const scenario = structuredClone(baseRoiScenario);
  scenario.output = {
    person_level_hris_record: true,
    hashed_employee_id: "abc123",
    individual_productivity_measurement: true,
    team_or_manager_ranking: true,
    people_decisioning: true,
    compensation_or_performance_inference: true,
    promotion_or_discipline_inference: true,
    attrition_prediction: true,
    hris_inference_from_ai_usage: true
  };

  const result = validateAiValueRoiScenario(scenario);

  assert.equal(result.valid, false);
  for (const field of [
    "person_level_hris_record",
    "hashed_employee_id",
    "individual_productivity_measurement",
    "team_or_manager_ranking",
    "people_decisioning",
    "compensation_or_performance_inference",
    "promotion_or_discipline_inference",
    "attrition_prediction",
    "hris_inference_from_ai_usage"
  ]) {
    assert.equal(result.gaps.includes(`Forbidden field detected: ${field}`), true, field);
  }
});

test("rejects invalid economic output policy modes in engine-only validation", () => {
  const scenario = structuredClone(baseRoiScenario);
  scenario.economic_output_policy.mode = "CUSTOMER_FACING_APPROVED";

  const result = validateAiValueRoiScenario(scenario);

  assert.equal(result.valid, false);
  assert.equal(
    result.gaps.includes("economic_output_policy.mode is invalid: CUSTOMER_FACING_APPROVED"),
    true
  );
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
  assert.equal(
    result.gaps.includes("safe_value_language.blocked_claims missing named_employee_productivity"),
    true
  );
  assert.equal(
    result.gaps.includes("safe_value_language.blocked_claims missing hris_inference"),
    true
  );
});

test("rejects governance boundaries that imply production actions or unsafe claims", () => {
  const scenario = structuredClone(baseRoiScenario);
  scenario.governance_boundaries.production_connector = true;
  scenario.governance_boundaries.individual_productivity_measurement = true;
  scenario.governance_boundaries.autonomous_customer_actions = true;

  const result = validateAiValueRoiScenario(scenario);

  assert.equal(result.valid, false);
  assert.equal(result.gaps.includes("governance_boundaries.production_connector is true"), true);
  assert.equal(
    result.gaps.includes("governance_boundaries.individual_productivity_measurement is true"),
    true
  );
  assert.equal(result.gaps.includes("governance_boundaries.autonomous_customer_actions is true"), true);
});

test("keeps legacy HRIS or people analytics governance boundary blocked when gates are present", () => {
  const scenario = structuredClone(baseRoiScenario);
  scenario.governance_boundaries.hris_or_people_analytics = true;

  const result = validateAiValueRoiScenario(scenario);

  assert.equal(result.valid, false);
  assert.equal(
    result.gaps.includes("governance_boundaries.hris_or_people_analytics is true"),
    true
  );
  assert.equal(
    result.gaps.includes("governance_boundaries.hris_or_people_analytics must be false"),
    true
  );
});

test("rejects legacy productivity measurement fields when gates are present", () => {
  const scenario = structuredClone(baseRoiScenario);
  scenario.output = {
    productivity_measurement: true
  };

  const result = validateAiValueRoiScenario(scenario);

  assert.equal(result.valid, false);
  assert.equal(result.gaps.includes("Forbidden field detected: productivity_measurement"), true);
});

test("always blocks direct identifiers, raw content, and named employee productivity fields", () => {
  const scenario = structuredClone(baseRoiScenario);
  scenario.financial_claim_gate.mode = "CUSTOMER_FACING_APPROVED";
  Object.assign(scenario.financial_claim_gate.data_sufficiency, {
    aggregate_only: true,
    outcome_metric_accepted: true,
    financial_assumptions_present: true,
    finance_owner_attested: true,
    legal_or_governance_approved: true
  });
  scenario.financial_claim_gate.allowed_outputs.customer_facing_economic_output = true;
  scenario.output = {
    named_employee_productivity: "unsafe",
    direct_identifiers: true,
    employee_id: "employee-123",
    raw_content_storage: true
  };

  const result = validateAiValueRoiScenario(scenario);

  assert.equal(result.valid, false);
  assert.equal(result.gaps.includes("Forbidden field detected: direct_identifiers"), true);
  assert.equal(result.gaps.includes("Forbidden field detected: employee_id"), true);
  assert.equal(result.gaps.includes("Forbidden field detected: named_employee_productivity"), true);
  assert.equal(result.gaps.includes("Forbidden field detected: raw_content_storage"), true);
});
