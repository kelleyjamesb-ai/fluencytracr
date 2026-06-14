import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildExecutiveValidationPacket,
  renderExecutiveValidationMarkdown,
  validateExecutiveValidationPacket
} from "./generate_ai_value_executive_packet.mjs";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const requiredExecutiveBlockedClaims = [
  "individual_productivity_claim",
  "named_employee_productivity",
  "manager_or_team_ranking",
  "hris_inference",
  "headcount_reduction_from_usage"
];

const sourceRoiScenario = {
  roi_scenario_id: "roi_scenario_customer_support_capacity_v1",
  baseline_comparison: {
    baseline_window: { state: "PRESENT" },
    comparison_window: { state: "PRESENT" }
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
      dollarized_output: true,
      realized_roi_calculation: false,
      customer_facing_economic_output: false,
      causality_language: false,
      aggregate_workflow_productivity: true
    }
  }
};

function financeValidatedRoiScenario() {
  const scenario = structuredClone(sourceRoiScenario);
  scenario.financial_claim_gate.mode = "FINANCE_VALIDATED";
  scenario.financial_claim_gate.allowed_outputs.realized_roi_calculation = true;
  Object.assign(scenario.financial_claim_gate.data_sufficiency, {
    investment_costs_present: true,
    finance_owner_attested: true,
    confounds_reviewed: true
  });
  return scenario;
}

function customerFacingRoiScenario() {
  const scenario = financeValidatedRoiScenario();
  scenario.financial_claim_gate.mode = "CUSTOMER_FACING_APPROVED";
  scenario.financial_claim_gate.allowed_outputs.customer_facing_economic_output = true;
  Object.assign(scenario.financial_claim_gate.data_sufficiency, {
    legal_or_governance_approved: true
  });
  return scenario;
}

function causalityApprovedRoiScenario() {
  const scenario = structuredClone(sourceRoiScenario);
  scenario.financial_claim_gate.allowed_outputs.causality_language = true;
  scenario.financial_claim_gate.data_sufficiency.experimental_or_quasi_experimental_design = true;
  return scenario;
}

function ebitaBridge(mode = "DIRECTIONAL_EBITA_BRIDGE") {
  const bridge = {
    ebita_bridge_id: "ebita_bridge_customer_support_capacity_v1",
    workflow: {
      workflow_family: "customer_support_case_resolution",
      workflow_name: "Support case resolution"
    },
    ebita_levers: [
      {
        ebita_driver: "CAPACITY_CREATION"
      },
      {
        ebita_driver: "OPERATING_COST_REDUCTION"
      }
    ],
    financial_translation_policy: {
      mode,
      realized_ebita_claim_allowed:
        mode === "FINANCE_VALIDATED_EBITA_CASE" || mode === "CUSTOMER_FACING_APPROVED",
      customer_facing_allowed: mode === "CUSTOMER_FACING_APPROVED",
      causality_claim_allowed: false
    },
    evidence_quality: {
      adoption_evidence: "SUPPORTED",
      workflow_evidence: "SUPPORTED",
      outcome_evidence: mode === "NO_FINANCIAL_TRANSLATION" ? "MISSING" : "SUPPORTED",
      financial_evidence:
        mode === "FINANCE_VALIDATED_EBITA_CASE" || mode === "CUSTOMER_FACING_APPROVED"
          ? "FINANCE_VALIDATED"
          : mode === "MODELED_EBITA_SCENARIO"
            ? "SUPPORTED"
            : "CAVEATED",
      overall_ebita_confidence:
        mode === "FINANCE_VALIDATED_EBITA_CASE" || mode === "CUSTOMER_FACING_APPROVED"
          ? "FINANCE_VALIDATED"
          : mode === "MODELED_EBITA_SCENARIO"
            ? "SUPPORTED"
            : "CAVEATED"
    },
    safe_language: {
      allowed_phrases:
        mode === "MODELED_EBITA_SCENARIO"
          ? [
              "Customer-owned financial assumptions support a modeled EBITA scenario.",
              "This is a modeled scenario, not proven EBITA impact."
            ]
          : mode === "FINANCE_VALIDATED_EBITA_CASE"
            ? [
                "Finance-attested assumptions support a finance-validated EBITA case for this workflow and window."
              ]
            : mode === "CUSTOMER_FACING_APPROVED"
              ? [
                  "This economic output is approved for customer-facing use within the stated scope and caveats."
                ]
              : [
                  "This workflow may affect EBITA through identified financial levers.",
                  "No realized EBITA claim is made."
                ],
      required_caveats:
        mode === "MODELED_EBITA_SCENARIO"
          ? ["Actual dollar math remains customer-owned and finance-reviewed."]
          : ["This is a directional bridge, not proven EBITA impact."],
      blocked_claims: [
        "usage_proves_ebita",
        "ai_caused_ebita_without_causal_design",
        "headcount_reduction_from_usage",
        "individual_productivity_claim",
        "manager_or_team_ranking"
      ]
    }
  };
  return bridge;
}

function buildPacketWithEbita(bridge, roiScenario = sourceRoiScenario) {
  return buildExecutiveValidationPacket({
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
    ),
    roiScenario,
    ebitaBridge: bridge
  });
}

test("builds a governed executive validation packet from the V1 spine", () => {
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

  const result = validateExecutiveValidationPacket(packet);

  assert.equal(result.valid, true);
  assert.equal(packet.packet_id, "executive_packet_customer_support_v1");
  assert.equal(packet.workflow_family, "customer_support_case_resolution");
  assert.equal(packet.decision, "HOLD_FOR_ASSUMPTIONS");
  assert.equal(packet.claim_state, "INTERNAL_ONLY");
  assert.equal(packet.customer_facing_economic_output, false);
});

test("seeded executive packet fixture is valid", () => {
  const fixture = readJson(
    "docs/contracts/ai-value-intelligence/examples/customer-support-executive-packet.json"
  );

  const result = validateExecutiveValidationPacket(fixture);

  assert.equal(result.valid, true);
  assert.equal(fixture.decision, "HOLD_FOR_ASSUMPTIONS");
});

test("renders markdown without unsafe economic language", () => {
  const fixture = readJson(
    "docs/contracts/ai-value-intelligence/examples/customer-support-executive-packet.json"
  );
  const markdown = renderExecutiveValidationMarkdown(fixture);

  assert.equal(markdown.includes("# Customer Support AI Value Validation Packet"), true);
  assert.equal(markdown.includes("Measurement Readiness"), true);
  assert.equal(markdown.includes("Needs client assumptions before validation"), true);
  assert.equal(markdown.includes("HOLD_FOR_ASSUMPTIONS"), false);
  assert.equal(markdown.includes("INTERNAL_ONLY"), false);
  assert.equal(markdown.includes("Glean proved ROI"), false);
  assert.equal(markdown.includes("caused productivity"), false);
});

test("rejects missing sections, unsafe decisions, and customer-facing output", () => {
  const packet = readJson(
    "docs/contracts/ai-value-intelligence/examples/customer-support-executive-packet.json"
  );
  packet.packet_id = "";
  packet.decision = "READY_FOR_ROI_PROOF";
  packet.customer_facing_economic_output = true;
  packet.sections.metrics = [];

  const result = validateExecutiveValidationPacket(packet);

  assert.equal(result.valid, false);
  assert.equal(result.gaps.includes("packet_id is missing"), true);
  assert.equal(result.gaps.includes("decision is invalid: READY_FOR_ROI_PROOF"), true);
  assert.equal(result.gaps.includes("customer_facing_economic_output is true"), true);
  assert.equal(result.gaps.includes("sections.metrics must include at least one item"), true);
});

test("rejects unsafe claim text inside executive packet", () => {
  const packet = readJson(
    "docs/contracts/ai-value-intelligence/examples/customer-support-executive-packet.json"
  );
  packet.sections.claim_boundary.safe_claims = [
    "This team saved money because Glean caused productivity lift."
  ];

  const result = validateExecutiveValidationPacket(packet);

  assert.equal(result.valid, false);
  assert.equal(
    result.gaps.includes("sections.claim_boundary.safe_claims contains forbidden claim language"),
    true
  );
});

test("excludes blocked metrics from executive packets", () => {
  const blueprint = readJson(
    "docs/contracts/ai-value-intelligence/examples/customer-support-blueprint.json"
  );
  const metricsLibrary = readJson(
    "docs/contracts/ai-value-intelligence/examples/customer-support-metrics-library.json"
  );
  metricsLibrary.metrics[0].allowed_claim_level = "BLOCKED";
  const packet = buildExecutiveValidationPacket({
    blueprint,
    metricsLibrary,
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

  assert.equal(
    packet.sections.metrics.some(
      (metric) => metric.metric_id === metricsLibrary.metrics[0].metric_id
    ),
    false
  );
});

test("requires explicit non-customer-facing economic output flag", () => {
  const packet = readJson(
    "docs/contracts/ai-value-intelligence/examples/customer-support-executive-packet.json"
  );
  delete packet.customer_facing_economic_output;

  const result = validateExecutiveValidationPacket(packet);

  assert.equal(result.valid, false);
  assert.equal(
    result.gaps.includes("customer_facing_economic_output must be false"),
    true
  );
  assert.equal(result.feeds.local_workspace_ui, false);
});

test("executive packet remains valid when no EBITA bridge exists", () => {
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

  const result = validateExecutiveValidationPacket(packet);

  assert.equal(result.valid, true);
  assert.equal(packet.ebita_impact_summary, undefined);
});

test("executive packet includes directional EBITA summary and blocks realized EBITA language", () => {
  const packet = buildPacketWithEbita(ebitaBridge("DIRECTIONAL_EBITA_BRIDGE"));

  const result = validateExecutiveValidationPacket(packet);

  assert.equal(result.valid, true);
  assert.equal(packet.ebita_impact_summary.status, "DIRECTIONAL_EBITA_BRIDGE");
  assert.deepEqual(packet.ebita_impact_summary.primary_ebita_levers, [
    "CAPACITY_CREATION",
    "OPERATING_COST_REDUCTION"
  ]);
  assert.equal(packet.ebita_impact_summary.realized_ebita_claim_allowed, false);
  assert.equal(packet.ebita_impact_summary.customer_facing_allowed, false);
  assert.equal(packet.ebita_impact_summary.causality_claim_allowed, false);
  assert.equal(
    packet.ebita_impact_summary.required_caveats.includes(
      "This is a directional EBITA bridge, not proven financial impact."
    ),
    true
  );
});

test("modeled EBITA scenario carries required caveats and next evidence actions", () => {
  const packet = buildPacketWithEbita(ebitaBridge("MODELED_EBITA_SCENARIO"));

  const result = validateExecutiveValidationPacket(packet);

  assert.equal(result.valid, true);
  assert.equal(packet.ebita_impact_summary.status, "MODELED_EBITA_SCENARIO");
  assert.equal(packet.ebita_impact_summary.realized_ebita_claim_allowed, false);
  assert.equal(
    packet.ebita_impact_summary.required_caveats.includes(
      "Customer-owned financial assumptions are required before dollarized claims."
    ),
    true
  );
  assert.equal(
    packet.ebita_impact_summary.next_evidence_actions.includes(
      "Finance validation is required before realized EBITA language."
    ),
    true
  );
});

test("finance validated EBITA case allows finance-validated language only", () => {
  const packet = buildPacketWithEbita(
    ebitaBridge("FINANCE_VALIDATED_EBITA_CASE"),
    financeValidatedRoiScenario()
  );

  const result = validateExecutiveValidationPacket(packet);

  assert.equal(result.valid, true);
  assert.equal(packet.ebita_impact_summary.status, "FINANCE_VALIDATED_EBITA_CASE");
  assert.equal(packet.ebita_impact_summary.realized_ebita_claim_allowed, true);
  assert.equal(packet.ebita_impact_summary.customer_facing_allowed, false);
  assert.equal(
    packet.ebita_impact_summary.allowed_phrases.includes(
      "Finance-attested assumptions support a finance-validated EBITA case for this workflow and window."
    ),
    true
  );
});

test("customer-facing EBITA approval requires both ROI gate and EBITA bridge approval", () => {
  const withoutRoiApproval = buildPacketWithEbita(
    ebitaBridge("CUSTOMER_FACING_APPROVED"),
    financeValidatedRoiScenario()
  );
  const missingAggregateEvidenceScenario = customerFacingRoiScenario();
  missingAggregateEvidenceScenario.financial_claim_gate.data_sufficiency.aggregate_only = false;
  const withoutAggregateEvidence = buildPacketWithEbita(
    ebitaBridge("CUSTOMER_FACING_APPROVED"),
    missingAggregateEvidenceScenario
  );
  const withRoiApproval = buildPacketWithEbita(
    ebitaBridge("CUSTOMER_FACING_APPROVED"),
    customerFacingRoiScenario()
  );

  assert.equal(withoutRoiApproval.ebita_impact_summary.customer_facing_allowed, false);
  assert.equal(withoutRoiApproval.ebita_impact_summary.realized_ebita_claim_allowed, true);
  assert.equal(withoutAggregateEvidence.ebita_impact_summary.customer_facing_allowed, false);
  assert.equal(withRoiApproval.ebita_impact_summary.customer_facing_allowed, true);
  assert.equal(
    validateExecutiveValidationPacket(withRoiApproval).valid,
    true
  );
});

test("downgraded customer-facing EBITA bridge suppresses customer-facing approval language", () => {
  const bridge = ebitaBridge("CUSTOMER_FACING_APPROVED");
  const scenario = customerFacingRoiScenario();
  scenario.financial_claim_gate.data_sufficiency.outcome_metric_accepted = false;
  const packet = buildPacketWithEbita(bridge, scenario);

  assert.equal(packet.ebita_impact_summary.status, "FINANCE_VALIDATED_EBITA_CASE");
  assert.equal(packet.ebita_impact_summary.customer_facing_allowed, false);
  assert.equal(
    packet.ebita_impact_summary.allowed_phrases.includes(
      "This economic output is approved for customer-facing use within the stated scope and caveats."
    ),
    false
  );
  assert.equal(
    packet.ebita_impact_summary.allowed_phrases.includes(
      "Finance-attested assumptions support a finance-validated EBITA case for this workflow and window."
    ),
    true
  );
  assert.equal(validateExecutiveValidationPacket(packet).valid, true);
});

test("causality language requires aggregate outcome evidence and aligned windows", () => {
  const bridge = ebitaBridge("MODELED_EBITA_SCENARIO");
  bridge.financial_translation_policy.causality_claim_allowed = true;
  const missingOutcomeEvidenceScenario = causalityApprovedRoiScenario();
  missingOutcomeEvidenceScenario.financial_claim_gate.data_sufficiency.outcome_metric_accepted = false;

  const withoutAcceptedOutcomeEvidence = buildPacketWithEbita(
    bridge,
    missingOutcomeEvidenceScenario
  );
  const withAggregateOutcomeEvidence = buildPacketWithEbita(
    bridge,
    causalityApprovedRoiScenario()
  );

  assert.equal(
    withoutAcceptedOutcomeEvidence.ebita_impact_summary.causality_claim_allowed,
    false
  );
  assert.equal(withAggregateOutcomeEvidence.ebita_impact_summary.causality_claim_allowed, true);
});

test("usage-only financial claims are downgraded and blocked", () => {
  const usageOnlyBridge = ebitaBridge("DIRECTIONAL_EBITA_BRIDGE");
  usageOnlyBridge.evidence_quality.workflow_evidence = "MISSING";
  usageOnlyBridge.evidence_quality.outcome_evidence = "MISSING";
  usageOnlyBridge.evidence_quality.financial_evidence = "MISSING";
  usageOnlyBridge.safe_language.allowed_phrases = ["Usage proves EBITA for this workflow."];

  const packet = buildPacketWithEbita(usageOnlyBridge);
  const result = validateExecutiveValidationPacket(packet);

  assert.equal(result.valid, true);
  assert.equal(packet.ebita_impact_summary.status, "NO_FINANCIAL_TRANSLATION");
  assert.equal(packet.ebita_impact_summary.allowed_phrases.includes("Usage proves EBITA for this workflow."), false);
  assert.equal(
    packet.ebita_impact_summary.next_evidence_actions.includes(
      "Attach accepted customer-owned outcome evidence for the same workflow and window."
    ),
    true
  );
});

test("EBITA summary preserves people and headcount blocked claims", () => {
  const packet = buildPacketWithEbita(ebitaBridge("DIRECTIONAL_EBITA_BRIDGE"));

  for (const blockedClaim of requiredExecutiveBlockedClaims) {
    assert.equal(packet.ebita_impact_summary.blocked_claims.includes(blockedClaim), true);
  }
});

test("rejects unsafe EBITA summary that allows individual or headcount claims", () => {
  const packet = buildPacketWithEbita(ebitaBridge("DIRECTIONAL_EBITA_BRIDGE"));
  packet.ebita_impact_summary.blocked_claims = ["usage_proves_ebita"];
  packet.ebita_impact_summary.allowed_phrases = [
    "Usage proves EBITA and supports headcount reduction."
  ];

  const result = validateExecutiveValidationPacket(packet);

  assert.equal(result.valid, false);
  assert.equal(
    result.gaps.includes("ebita_impact_summary.blocked_claims missing individual_productivity_claim"),
    true
  );
  assert.equal(
    result.gaps.includes("ebita_impact_summary.allowed_phrases contains forbidden financial claim language"),
    true
  );
});

test("renders Financial Translation section when available", () => {
  const packet = buildPacketWithEbita(ebitaBridge("MODELED_EBITA_SCENARIO"));
  const markdown = renderExecutiveValidationMarkdown(packet);

  assert.equal(markdown.includes("## Financial Translation"), true);
  assert.equal(markdown.includes("Status: Financial Translation"), true);
  assert.equal(markdown.includes("MODELED_EBITA_SCENARIO"), false);
  assert.equal(markdown.includes("Customer-owned financial assumptions are required before dollarized claims."), true);
  assert.equal(markdown.includes("Finance validation is required before realized EBITA language."), true);
});
