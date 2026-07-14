import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  buildEbitaBridgeFromValueObjects,
  EBITA_BRIDGE_SCHEMA_VERSION,
  validateEbitaBridge
} from "../shared/dist/aiValueEngine/index.js";

function readExample(name) {
  return JSON.parse(
    readFileSync(
      resolve(process.cwd(), `docs/contracts/ai-value-intelligence/examples/${name}`),
      "utf8"
    )
  );
}

const requiredBlockedClaims = [
  "usage_proves_ebita",
  "ai_caused_ebita_without_causal_design",
  "headcount_reduction_from_usage",
  "individual_productivity_claim",
  "manager_or_team_ranking"
];

const sourceRoiScenario = {
  schema_version: "FT_AI_VALUE_ROI_SCENARIO_2026_06",
  roi_scenario_id: "roi_scenario_customer_support_capacity_v1",
  workflow: {
    workflow_family: "customer_support_case_resolution",
    workflow_name: "Support case resolution",
    value_route: "CAPACITY_CREATION"
  },
  financial_claim_gate: {
    mode: "EXECUTIVE_CAVEATED",
    data_sufficiency: {
      aggregate_only: true,
      baseline_present: true,
      comparison_present: true,
      outcome_metric_accepted: true,
      financial_assumptions_present: true,
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
  }
};

function financeValidatedRoiScenario() {
  const scenario = structuredClone(sourceRoiScenario);
  scenario.financial_claim_gate.mode = "FINANCE_VALIDATED";
  scenario.financial_claim_gate.allowed_outputs.realized_roi_calculation = true;
  Object.assign(scenario.financial_claim_gate.data_sufficiency, {
    aggregate_only: true,
    baseline_present: true,
    comparison_present: true,
    outcome_metric_accepted: true,
    financial_assumptions_present: true,
    investment_costs_present: true,
    finance_owner_attested: true,
    confounds_reviewed: true
  });
  return scenario;
}

const baseEbitaBridge = {
  schema_version: EBITA_BRIDGE_SCHEMA_VERSION,
  ebita_bridge_id: "ebita_bridge_customer_support_capacity_v1",
  source_refs: {
    blueprint_id: "bp_customer_support_case_resolution",
    metrics_library_id: "metrics_customer_support_v1",
    value_scenario_id: "scenario_customer_support_capacity_v1",
    readiness_id: "readiness_customer_support_v1",
    claim_boundary_id: "claim_boundary_customer_support_v1",
    roi_scenario_id: "roi_scenario_customer_support_capacity_v1"
  },
  workflow: {
    workflow_family: "customer_support_case_resolution",
    workflow_name: "Support case resolution",
    function: "Customer Support",
    value_routes: ["CAPACITY_CREATION"],
    baseline_window: "2026-02-01_to_2026-03-31",
    comparison_window: "2026-04-01_to_2026-05-31"
  },
  ebita_levers: [
    {
      lever_id: "lever_capacity_creation_capacity_creation_v1",
      value_route: "CAPACITY_CREATION",
      ebita_driver: "CAPACITY_CREATION",
      business_metric_id: "support_median_resolution_hours",
      financial_assumption_ids: [],
      evidence_level: "CAVEATED",
      claim_level: "DIRECTIONAL_EBITA_LEVER"
    }
  ],
  financial_translation_policy: {
    mode: "DIRECTIONAL_EBITA_BRIDGE",
    customer_owned_financials_required: false,
    realized_ebita_claim_allowed: false,
    causality_claim_allowed: false,
    customer_facing_allowed: false
  },
  evidence_quality: {
    adoption_evidence: "SUPPORTED",
    workflow_evidence: "SUPPORTED",
    outcome_evidence: "CAVEATED",
    financial_evidence: "CAVEATED",
    overall_ebita_confidence: "CAVEATED"
  },
  safe_language: {
    allowed_phrases: [
      "This workflow may affect EBITA through identified financial levers.",
      "No realized EBITA claim is made."
    ],
    required_caveats: [
      "This is a directional bridge, not proven EBITA impact."
    ],
    blocked_claims: requiredBlockedClaims
  }
};

test("missing source refs is invalid", () => {
  const bridge = structuredClone(baseEbitaBridge);
  delete bridge.source_refs.roi_scenario_id;

  const result = validateEbitaBridge(bridge, { roiScenario: sourceRoiScenario });

  assert.equal(result.valid, false);
  assert.equal(result.gaps.includes("source_refs.roi_scenario_id is missing"), true);
});

test("invalid schema version is invalid", () => {
  const bridge = structuredClone(baseEbitaBridge);
  bridge.schema_version = "BROKEN";

  const result = validateEbitaBridge(bridge, { roiScenario: sourceRoiScenario });

  assert.equal(result.valid, false);
  assert.equal(result.gaps.includes("schema_version is invalid: BROKEN"), true);
});

test("unknown EBITA driver is invalid", () => {
  const bridge = structuredClone(baseEbitaBridge);
  bridge.ebita_levers[0].ebita_driver = "UNKNOWN_DRIVER";

  const result = validateEbitaBridge(bridge, { roiScenario: sourceRoiScenario });

  assert.equal(result.valid, false);
  assert.equal(result.gaps.includes("ebita_levers[0].ebita_driver is invalid: UNKNOWN_DRIVER"), true);
});

test("driver not allowed for value route is invalid", () => {
  const bridge = structuredClone(baseEbitaBridge);
  bridge.ebita_levers[0].value_route = "RISK_REDUCTION";
  bridge.ebita_levers[0].ebita_driver = "REVENUE_GROWTH";

  const result = validateEbitaBridge(bridge, { roiScenario: sourceRoiScenario });

  assert.equal(result.valid, false);
  assert.equal(
    result.gaps.includes("ebita_levers[0].ebita_driver REVENUE_GROWTH is not allowed for value_route RISK_REDUCTION"),
    true
  );
});

test("no financial translation with realized claim true is invalid", () => {
  const bridge = structuredClone(baseEbitaBridge);
  bridge.financial_translation_policy.mode = "NO_FINANCIAL_TRANSLATION";
  bridge.financial_translation_policy.realized_ebita_claim_allowed = true;
  bridge.ebita_levers = [];

  const result = validateEbitaBridge(bridge, { roiScenario: sourceRoiScenario });

  assert.equal(result.valid, false);
  assert.equal(
    result.gaps.includes("financial_translation_policy.realized_ebita_claim_allowed must be false for NO_FINANCIAL_TRANSLATION"),
    true
  );
});

test("directional EBITA bridge with caveats is valid", () => {
  const result = validateEbitaBridge(baseEbitaBridge, { roiScenario: sourceRoiScenario });

  assert.equal(result.valid, true);
  assert.equal(result.feeds.executive_readout, true);
  assert.equal(result.feeds.customer_facing_economic_output, false);
  assert.deepEqual(result.gaps, []);
});

test("modeled EBITA scenario without customer-owned financials is invalid", () => {
  const bridge = structuredClone(baseEbitaBridge);
  bridge.financial_translation_policy.mode = "MODELED_EBITA_SCENARIO";
  bridge.financial_translation_policy.customer_owned_financials_required = false;
  bridge.evidence_quality.financial_evidence = "SUPPORTED";
  bridge.ebita_levers[0].claim_level = "MODELED_EBITA_SCENARIO";
  bridge.ebita_levers[0].evidence_level = "SUPPORTED";

  const result = validateEbitaBridge(bridge, { roiScenario: sourceRoiScenario });

  assert.equal(result.valid, false);
  assert.equal(
    result.gaps.includes("financial_translation_policy.customer_owned_financials_required must be true for MODELED_EBITA_SCENARIO"),
    true
  );
  assert.equal(
    result.gaps.includes("ebita_levers[0].financial_assumption_ids must include at least one assumption for MODELED_EBITA_SCENARIO"),
    true
  );
});

test("modeled EBITA scenario with supported financial evidence is valid", () => {
  const bridge = structuredClone(baseEbitaBridge);
  bridge.financial_translation_policy.mode = "MODELED_EBITA_SCENARIO";
  bridge.financial_translation_policy.customer_owned_financials_required = true;
  bridge.evidence_quality.financial_evidence = "SUPPORTED";
  bridge.evidence_quality.overall_ebita_confidence = "SUPPORTED";
  bridge.ebita_levers[0].claim_level = "MODELED_EBITA_SCENARIO";
  bridge.ebita_levers[0].evidence_level = "SUPPORTED";
  bridge.ebita_levers[0].financial_assumption_ids = ["approved_cost_to_serve_assumption"];

  const result = validateEbitaBridge(bridge, { roiScenario: sourceRoiScenario });

  assert.equal(result.valid, true);
});

test("finance validated case without FINANCE_VALIDATED evidence is invalid", () => {
  const bridge = structuredClone(baseEbitaBridge);
  bridge.financial_translation_policy.mode = "FINANCE_VALIDATED_EBITA_CASE";
  bridge.financial_translation_policy.customer_owned_financials_required = true;
  bridge.evidence_quality.financial_evidence = "SUPPORTED";
  bridge.evidence_quality.overall_ebita_confidence = "SUPPORTED";
  bridge.ebita_levers[0].claim_level = "FINANCE_VALIDATED_EBITA_CASE";
  bridge.ebita_levers[0].evidence_level = "SUPPORTED";
  bridge.ebita_levers[0].financial_assumption_ids = ["finance_attested_assumption"];

  const result = validateEbitaBridge(bridge, { roiScenario: sourceRoiScenario });

  assert.equal(result.valid, false);
  assert.equal(
    result.gaps.includes("evidence_quality.financial_evidence must be FINANCE_VALIDATED for FINANCE_VALIDATED_EBITA_CASE"),
    true
  );
});

test("finance validated case without source ROI finance validation is invalid", () => {
  const bridge = structuredClone(baseEbitaBridge);
  bridge.financial_translation_policy.mode = "FINANCE_VALIDATED_EBITA_CASE";
  bridge.financial_translation_policy.customer_owned_financials_required = true;
  bridge.financial_translation_policy.realized_ebita_claim_allowed = true;
  bridge.evidence_quality.financial_evidence = "FINANCE_VALIDATED";
  bridge.evidence_quality.overall_ebita_confidence = "FINANCE_VALIDATED";
  bridge.ebita_levers[0].claim_level = "FINANCE_VALIDATED_EBITA_CASE";
  bridge.ebita_levers[0].evidence_level = "FINANCE_VALIDATED";
  bridge.ebita_levers[0].financial_assumption_ids = ["finance_attested_assumption"];

  const result = validateEbitaBridge(bridge, { roiScenario: sourceRoiScenario });

  assert.equal(result.valid, false);
  assert.equal(
    result.gaps.includes("source roiScenario financial_claim_gate.mode must be FINANCE_VALIDATED or CUSTOMER_FACING_APPROVED for finance-validated EBITA output"),
    true
  );
});

test("finance validated case with required evidence is valid", () => {
  const bridge = structuredClone(baseEbitaBridge);
  bridge.financial_translation_policy.mode = "FINANCE_VALIDATED_EBITA_CASE";
  bridge.financial_translation_policy.customer_owned_financials_required = true;
  bridge.financial_translation_policy.realized_ebita_claim_allowed = false;
  bridge.evidence_quality.financial_evidence = "FINANCE_VALIDATED";
  bridge.evidence_quality.overall_ebita_confidence = "FINANCE_VALIDATED";
  bridge.ebita_levers[0].claim_level = "FINANCE_VALIDATED_EBITA_CASE";
  bridge.ebita_levers[0].evidence_level = "FINANCE_VALIDATED";
  bridge.ebita_levers[0].financial_assumption_ids = ["finance_attested_assumption"];
  const roiScenario = financeValidatedRoiScenario();

  const result = validateEbitaBridge(bridge, { roiScenario });

  assert.equal(result.valid, true);
});

test("customer-facing approved without ROI source approval is invalid", () => {
  const bridge = structuredClone(baseEbitaBridge);
  bridge.financial_translation_policy.mode = "CUSTOMER_FACING_APPROVED";
  bridge.financial_translation_policy.customer_owned_financials_required = true;
  bridge.financial_translation_policy.customer_facing_allowed = true;
  bridge.evidence_quality.financial_evidence = "FINANCE_VALIDATED";
  bridge.evidence_quality.overall_ebita_confidence = "FINANCE_VALIDATED";
  bridge.ebita_levers[0].claim_level = "CUSTOMER_FACING_APPROVED";
  bridge.ebita_levers[0].evidence_level = "FINANCE_VALIDATED";
  bridge.ebita_levers[0].financial_assumption_ids = ["customer_facing_approval"];

  const result = validateEbitaBridge(bridge, { roiScenario: sourceRoiScenario });

  assert.equal(result.valid, false);
  assert.equal(
    result.gaps.includes("source roiScenario financial_claim_gate.mode must be CUSTOMER_FACING_APPROVED for customer-facing EBITA output"),
    true
  );
});

test("customer-facing approved remains invalid even with ROI source approval", () => {
  const bridge = structuredClone(baseEbitaBridge);
  bridge.financial_translation_policy.mode = "CUSTOMER_FACING_APPROVED";
  bridge.financial_translation_policy.customer_owned_financials_required = true;
  bridge.financial_translation_policy.customer_facing_allowed = true;
  bridge.evidence_quality.financial_evidence = "FINANCE_VALIDATED";
  bridge.evidence_quality.overall_ebita_confidence = "FINANCE_VALIDATED";
  bridge.ebita_levers[0].claim_level = "CUSTOMER_FACING_APPROVED";
  bridge.ebita_levers[0].evidence_level = "FINANCE_VALIDATED";
  bridge.ebita_levers[0].financial_assumption_ids = ["customer_facing_approval"];
  const approvedRoiScenario = structuredClone(sourceRoiScenario);
  approvedRoiScenario.financial_claim_gate.mode = "CUSTOMER_FACING_APPROVED";
  approvedRoiScenario.financial_claim_gate.allowed_outputs.customer_facing_economic_output = true;
  approvedRoiScenario.financial_claim_gate.data_sufficiency.finance_owner_attested = true;
  approvedRoiScenario.financial_claim_gate.data_sufficiency.legal_or_governance_approved = true;

  const result = validateEbitaBridge(bridge, { roiScenario: approvedRoiScenario });

  assert.equal(result.valid, false);
  assert.equal(
    result.gaps.includes("CUSTOMER_FACING_APPROVED is not authorized for EBITA bridge output"),
    true
  );
});

test("causality allowed without source causal gate is invalid", () => {
  const bridge = structuredClone(baseEbitaBridge);
  bridge.financial_translation_policy.causality_claim_allowed = true;

  const result = validateEbitaBridge(bridge, { roiScenario: sourceRoiScenario });

  assert.equal(result.valid, false);
  assert.equal(
    result.gaps.includes("source roiScenario causality gate must be approved when causality_claim_allowed is true"),
    true
  );
});

test("held source causality lane cannot authorize EBITA causality", () => {
  const bridge = structuredClone(baseEbitaBridge);
  bridge.financial_translation_policy.causality_claim_allowed = true;
  const causalRoiScenario = structuredClone(sourceRoiScenario);
  causalRoiScenario.financial_claim_gate.allowed_outputs.causality_language = true;
  causalRoiScenario.financial_claim_gate.data_sufficiency.experimental_or_quasi_experimental_design = true;

  const result = validateEbitaBridge(bridge, { roiScenario: causalRoiScenario });

  assert.equal(result.valid, false);
  assert.equal(
    result.gaps.includes("source roiScenario causality gate must be approved when causality_claim_allowed is true"),
    true
  );
});

test("missing blocked claims in safe language is invalid", () => {
  const bridge = structuredClone(baseEbitaBridge);
  bridge.safe_language.blocked_claims = ["usage_proves_ebita"];

  const result = validateEbitaBridge(bridge, { roiScenario: sourceRoiScenario });

  assert.equal(result.valid, false);
  assert.equal(
    result.gaps.includes("safe_language.blocked_claims missing ai_caused_ebita_without_causal_design"),
    true
  );
});

test("rejects forbidden fields anywhere in EBITA bridge output artifacts", () => {
  const bridge = structuredClone(baseEbitaBridge);
  bridge.output = {
    employee_email: "person@example.com",
    user_id: "user-123",
    raw_prompt: "unsafe raw prompt",
    productivity_measurement: true
  };

  const result = validateEbitaBridge(bridge, { roiScenario: sourceRoiScenario });

  assert.equal(result.valid, false);
  assert.equal(result.gaps.includes("Forbidden field detected: employee_email"), true);
  assert.equal(result.gaps.includes("Forbidden field detected: productivity_measurement"), true);
  assert.equal(result.gaps.includes("Forbidden field detected: raw_prompt"), true);
  assert.equal(result.gaps.includes("Forbidden field detected: user_id"), true);
});

test("buildEbitaBridgeFromValueObjects creates a caveated directional EBITA bridge when ROI allows modeled financial routing but not realized ROI", () => {
  const blueprint = readExample("customer-support-blueprint.json");
  const metricsLibrary = readExample("customer-support-metrics-library.json");
  const valueScenario = readExample("customer-support-value-scenario.json");
  const readiness = readExample("customer-support-evidence-readiness.json");
  const claimBoundary = readExample("customer-support-claim-boundary.json");
  const roiScenario = structuredClone(sourceRoiScenario);

  const bridge = buildEbitaBridgeFromValueObjects({
    blueprint,
    metricsLibrary,
    valueScenario,
    readiness,
    claimBoundary,
    roiScenario
  });
  const result = validateEbitaBridge(bridge, { roiScenario });

  assert.equal(result.valid, true);
  assert.equal(bridge.financial_translation_policy.mode, "DIRECTIONAL_EBITA_BRIDGE");
  assert.equal(bridge.workflow.value_routes.includes("CAPACITY_CREATION"), true);
  assert.equal(bridge.ebita_levers.some((lever) => lever.ebita_driver === "CAPACITY_CREATION"), true);
  assert.equal(bridge.safe_language.blocked_claims.includes("usage_proves_ebita"), true);
});

test("held ROI lane reduces the generated EBITA bridge to no financial translation", () => {
  const blueprint = readExample("customer-support-blueprint.json");
  const metricsLibrary = readExample("customer-support-metrics-library.json");
  const valueScenario = readExample("customer-support-value-scenario.json");
  const readiness = readExample("customer-support-evidence-readiness.json");
  const claimBoundary = readExample("customer-support-claim-boundary.json");
  const roiScenario = structuredClone(sourceRoiScenario);
  roiScenario.financial_claim_gate.allowed_outputs.dollarized_output = true;

  const bridge = buildEbitaBridgeFromValueObjects({
    blueprint,
    metricsLibrary,
    valueScenario,
    readiness,
    claimBoundary,
    roiScenario
  });

  assert.equal(bridge.financial_translation_policy.mode, "NO_FINANCIAL_TRANSLATION");
  assert.deepEqual(bridge.ebita_levers, []);
  assert.equal(validateEbitaBridge(bridge, { roiScenario }).valid, true);
});
