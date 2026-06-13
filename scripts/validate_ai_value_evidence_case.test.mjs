import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildValueEvidenceCase,
  validateAiValueEvidenceCase
} from "./validate_ai_value_evidence_case.mjs";

const EXAMPLES = "docs/contracts/ai-value-intelligence/examples";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

const loadInputs = () => ({
  dataBoundary: readJson(`${EXAMPLES}/customer-support-data-boundary-roi-evidence.json`),
  roiScenario: readJson(`${EXAMPLES}/customer-support-roi-scenario.json`),
  readiness: readJson(`${EXAMPLES}/customer-support-evidence-readiness.json`),
  outcomeEvidenceExport: readJson(`${EXAMPLES}/customer-support-outcome-evidence-export.json`),
  improvementLoop: readJson(`${EXAMPLES}/customer-support-value-improvement-loop.json`)
});

test("seeded Customer Support value evidence case fixture is valid", () => {
  const fixture = readJson(`${EXAMPLES}/customer-support-value-evidence-case.json`);

  const result = validateAiValueEvidenceCase(fixture);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(
    result.value_evidence_case_id,
    "value_evidence_case_customer_support_capacity_v1"
  );
  assert.equal(result.workflow_family, "customer_support_case_resolution");
  assert.equal(result.evidence_level, "CAVEATED");
  assert.equal(result.allowed_claim_level, "CAVEATED_VALUE_INVESTIGATION");
  assert.equal(result.feeds.customer_facing_economic_output, false);
  assert.equal(result.gaps.length, 0);
});

test("builds a value evidence case from data boundary, ROI scenario, readiness, outcome evidence, and improvement loop", () => {
  const evidenceCase = buildValueEvidenceCase(loadInputs());
  const result = validateAiValueEvidenceCase(evidenceCase);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(evidenceCase.workflow.workflow_family, "customer_support_case_resolution");
  assert.equal(evidenceCase.outcome_metric.metric_name, "Median resolution time");
  // The seeded export is SUBMITTED, not yet human-accepted, so evidence stays
  // directional and value language stays internal.
  assert.equal(evidenceCase.outcome_evidence_status.review_state, "SUBMITTED");
  assert.equal(evidenceCase.evidence_quality.evidence_level, "DIRECTIONAL");
  assert.equal(
    evidenceCase.safe_value_language.allowed_claim_level,
    "INTERNAL_HYPOTHESIS_ONLY"
  );
  // The case must carry the amended VBD canon.
  assert.equal(evidenceCase.vbd_summary.velocity.definition, "speed_to_adoption");
  assert.equal(
    evidenceCase.vbd_summary.breadth.definition,
    "spread_across_org_functions_workflows_surfaces"
  );
  assert.equal(
    evidenceCase.vbd_summary.depth.definition,
    "workflow_integration_embeddedness"
  );
  assert.equal(
    evidenceCase.source_refs.data_boundary_contract_id,
    "data_boundary_customer_support_roi_evidence_v1"
  );
  assert.equal(
    evidenceCase.intervention_retest.improvement_loop_id,
    "improvement_loop_customer_support_capacity_v1"
  );
});

test("rejects customer-facing economic output and realized ROI fields", () => {
  const evidenceCase = buildValueEvidenceCase(loadInputs());
  evidenceCase.economic_output_policy.realized_roi_calculation = true;
  evidenceCase.governance_boundaries.customer_facing_economic_output = true;
  evidenceCase.realized_roi_total = 120000;

  const result = validateAiValueEvidenceCase(evidenceCase);

  assert.equal(result.valid, false);
  assert.ok(
    result.gaps.some((gap) =>
      gap.includes("economic_output_policy.realized_roi_calculation must be false")
    )
  );
  assert.ok(
    result.gaps.some((gap) =>
      gap.includes("governance_boundaries.customer_facing_economic_output must be false")
    )
  );
  assert.ok(result.gaps.some((gap) => gap.includes("Forbidden field")));
});

test("allows aggregate workforce context but rejects raw, person-level HRIS, ranking, and inference fields", () => {
  const evidenceCase = buildValueEvidenceCase(loadInputs());
  evidenceCase.aggregate_workforce_context = {
    aggregate_hris_derived_context: {
      aggregate_only: true,
      approved_grain: "approved_aggregate_cohort",
      metric_owner_role: "workforce_analytics_manager",
      aggregate_time_to_productivity_by_cohort: "available as customer-approved aggregate only"
    }
  };
  evidenceCase.employee_id = "E-1001";
  evidenceCase.hashed_employee_id = "abc123";
  evidenceCase.client_context.manager_chain = ["VP Support"];
  evidenceCase.person_level_hris_record = { status: "unsafe" };
  evidenceCase.hris_inference_from_ai_usage = true;
  evidenceCase.attrition_prediction = { engineering: 0.04 };
  evidenceCase.productivity_rank = 1;
  evidenceCase.raw_ticket_sample = "Customer wrote in about a billing error...";
  evidenceCase.data_boundary_status.aggregate_only = false;
  evidenceCase.data_boundary_status.raw_source_rows_allowed = true;
  evidenceCase.data_boundary_status.contains_hashed_or_joinable_person_identifiers = true;

  const result = validateAiValueEvidenceCase(evidenceCase);

  assert.equal(result.valid, false);
  const forbidden = result.gaps.find((gap) => gap.includes("Forbidden field"));
  assert.ok(forbidden);
  assert.ok(forbidden.includes("employee_id"));
  assert.ok(forbidden.includes("hashed_employee_id"));
  assert.ok(forbidden.includes("manager_chain"));
  assert.ok(forbidden.includes("person_level_hris_record"));
  assert.ok(forbidden.includes("hris_inference_from_ai_usage"));
  assert.ok(forbidden.includes("attrition_prediction"));
  assert.ok(forbidden.includes("productivity_rank"));
  assert.ok(forbidden.includes("raw_ticket_sample"));
  assert.equal(forbidden.includes("aggregate_hris_derived_context"), false);
  assert.equal(forbidden.includes("aggregate_time_to_productivity_by_cohort"), false);
  assert.ok(
    result.gaps.some((gap) => gap.includes("data_boundary_status.aggregate_only must be true"))
  );
  assert.ok(
    result.gaps.some((gap) =>
      gap.includes("data_boundary_status.raw_source_rows_allowed must be false")
    )
  );
  assert.ok(
    result.gaps.some((gap) =>
      gap.includes("data_boundary_status.contains_hashed_or_joinable_person_identifiers must be false")
    )
  );
});

test("holds value language when outcome evidence is missing or rejected", () => {
  const inputs = loadInputs();

  // Missing export: the case must hold at observed-activity language.
  const missingCase = buildValueEvidenceCase({ ...inputs, outcomeEvidenceExport: null });
  assert.equal(missingCase.outcome_evidence_status.review_state, "MISSING");
  assert.equal(missingCase.evidence_quality.evidence_level, "MISSING");
  assert.equal(
    missingCase.safe_value_language.allowed_claim_level,
    "OBSERVED_AI_ACTIVITY_ONLY"
  );
  assert.equal(validateAiValueEvidenceCase(missingCase).valid, true);

  // Rejected export: same hold.
  const rejectedExport = {
    ...inputs.outcomeEvidenceExport,
    review: { review_state: "REJECTED" }
  };
  const rejectedCase = buildValueEvidenceCase({
    ...inputs,
    outcomeEvidenceExport: rejectedExport
  });
  assert.equal(rejectedCase.evidence_quality.evidence_level, "MISSING");
  assert.equal(
    rejectedCase.safe_value_language.allowed_claim_level,
    "OBSERVED_AI_ACTIVITY_ONLY"
  );

  // Hand-escalating the claim past the hold must fail closed.
  rejectedCase.evidence_quality.evidence_level = "CAVEATED";
  rejectedCase.safe_value_language.allowed_claim_level = "CAVEATED_VALUE_INVESTIGATION";
  const escalated = validateAiValueEvidenceCase(rejectedCase);
  assert.equal(escalated.valid, false);
  assert.ok(
    escalated.gaps.some((gap) =>
      gap.includes("evidence_quality.evidence_level exceeds what outcome evidence supports")
    )
  );
});

test("keeps supported evidence caveated and non-causal", () => {
  const inputs = loadInputs();
  const acceptedExport = {
    ...inputs.outcomeEvidenceExport,
    review: { review_state: "ACCEPTED" }
  };
  const resolvedScenario = JSON.parse(JSON.stringify(inputs.roiScenario));
  resolvedScenario.customer_owned_assumptions = resolvedScenario.customer_owned_assumptions.map(
    (assumption) => ({ ...assumption, state: "PRESENT" })
  );

  const supportedCase = buildValueEvidenceCase({
    ...inputs,
    roiScenario: resolvedScenario,
    outcomeEvidenceExport: acceptedExport
  });

  assert.equal(supportedCase.evidence_quality.evidence_level, "SUPPORTED");
  assert.equal(
    supportedCase.safe_value_language.allowed_claim_level,
    "SUPPORTED_VALUE_MOVEMENT"
  );
  assert.ok(
    supportedCase.safe_value_language.required_caveats.some((caveat) =>
      /does not prove ROI or causality/i.test(caveat)
    )
  );
  assert.equal(validateAiValueEvidenceCase(supportedCase).valid, true);

  // Dropping the non-causal caveat must fail closed.
  const stripped = JSON.parse(JSON.stringify(supportedCase));
  stripped.safe_value_language.required_caveats = ["Reviewed by the sponsor."];
  const strippedResult = validateAiValueEvidenceCase(stripped);
  assert.equal(strippedResult.valid, false);
  assert.ok(
    strippedResult.gaps.some((gap) =>
      gap.includes("required_caveats must state that this does not prove ROI or causality")
    )
  );

  // VALIDATED (token STRONG) cannot be hand-escalated without
  // customer-approved economic inputs recorded on the case.
  const strong = JSON.parse(JSON.stringify(supportedCase));
  strong.evidence_quality.evidence_level = "STRONG";
  const strongResult = validateAiValueEvidenceCase(strong);
  assert.equal(strongResult.valid, false);
  assert.ok(
    strongResult.gaps.some((gap) =>
      gap.includes(
        "evidence_quality.evidence_level exceeds what outcome evidence supports: STRONG > SUPPORTED"
      )
    )
  );
});

test("customer validation unlocks realized-value language while causality stays gated", () => {
  const inputs = loadInputs();
  const acceptedExport = {
    ...inputs.outcomeEvidenceExport,
    review: { review_state: "ACCEPTED" }
  };
  const resolvedScenario = JSON.parse(JSON.stringify(inputs.roiScenario));
  resolvedScenario.customer_owned_assumptions = resolvedScenario.customer_owned_assumptions.map(
    (assumption) => ({ ...assumption, state: "PRESENT" })
  );
  const customerValidation = {
    economic_inputs_approved: true,
    approved_by_role: "finance_partner",
    validation_reference: "fy26_q2_value_validation_memo",
    validation_statement:
      "Finance approved the rate inputs behind this case's realized-value readout."
  };

  const validatedCase = buildValueEvidenceCase({
    ...inputs,
    roiScenario: resolvedScenario,
    outcomeEvidenceExport: acceptedExport,
    customerValidation
  });

  // Realized-value language unlocks at the VALIDATED rung.
  assert.equal(validatedCase.evidence_quality.evidence_level, "STRONG");
  assert.equal(
    validatedCase.safe_value_language.allowed_claim_level,
    "VALIDATED_VALUE_REALIZATION"
  );

  // ROI-family gates open; causality stays locked without an approved design.
  const gateState = Object.fromEntries(
    validatedCase.claim_gates.map((gate) => [gate.claim, gate.state])
  );
  assert.equal(gateState.roi_proof, "UNLOCKED");
  assert.equal(gateState.realized_roi_calculation, "UNLOCKED");
  assert.equal(gateState.customer_facing_economic_output, "UNLOCKED");
  assert.equal(gateState.causality_claim, "LOCKED");

  // Privacy boundaries never relax; causality stays in blocked claims.
  for (const claim of [
    "individual_scoring",
    "team_or_manager_ranking",
    "hr_analytics",
    "productivity_measurement",
    "causality_claim"
  ]) {
    assert.ok(validatedCase.blocked_claims.includes(claim), claim);
  }
  assert.ok(!validatedCase.blocked_claims.includes("roi_proof"));
  assert.ok(!validatedCase.blocked_claims.includes("customer_facing_economic_output"));

  // Figures stay customer-owned: the platform still never computes economic
  // output, and the caveats say so.
  assert.equal(
    validatedCase.economic_output_policy.customer_facing_economic_output,
    false
  );
  assert.ok(
    validatedCase.safe_value_language.required_caveats.some((caveat) =>
      /customer-computed and customer-approved/i.test(caveat)
    )
  );
  assert.ok(
    validatedCase.safe_value_language.required_caveats.some((caveat) =>
      /does not prove causality/i.test(caveat)
    )
  );
  assert.equal(validateAiValueEvidenceCase(validatedCase).valid, true);

  // Stripping the customer validation while keeping the rung must fail closed.
  const stripped = JSON.parse(JSON.stringify(validatedCase));
  stripped.customer_validation = null;
  const strippedResult = validateAiValueEvidenceCase(stripped);
  assert.equal(strippedResult.valid, false);
  assert.ok(
    strippedResult.gaps.some((gap) =>
      gap.includes("evidence_quality.evidence_level exceeds what outcome evidence supports")
    )
  );
});

test("approved evidence design unlocks causality and survives validation", () => {
  const inputs = loadInputs();
  const acceptedExport = {
    ...inputs.outcomeEvidenceExport,
    review: { review_state: "ACCEPTED" }
  };
  const resolvedScenario = JSON.parse(JSON.stringify(inputs.roiScenario));
  resolvedScenario.customer_owned_assumptions = resolvedScenario.customer_owned_assumptions.map(
    (assumption) => ({ ...assumption, state: "PRESENT" })
  );

  const validatedCase = buildValueEvidenceCase({
    ...inputs,
    roiScenario: resolvedScenario,
    outcomeEvidenceExport: acceptedExport,
    customerValidation: {
      economic_inputs_approved: true,
      approved_by_role: "finance_partner",
      validation_reference: "fy26_q2_value_validation_memo"
    },
    evidenceDesign: {
      design_state: "APPROVED_COMPARISON_DESIGN",
      design_type: "matched_comparison",
      approved_by_role: "analytics_owner",
      design_reference: "fy26_q2_comparison_design"
    }
  });

  const gateState = Object.fromEntries(
    validatedCase.claim_gates.map((gate) => [gate.claim, gate.state])
  );

  assert.equal(validatedCase.evidence_design.design_state, "APPROVED_COMPARISON_DESIGN");
  assert.equal(validatedCase.evidence_design.design_type, "matched_comparison");
  assert.equal(gateState.causality_claim, "UNLOCKED");
  assert.ok(!validatedCase.blocked_claims.includes("causality_claim"));
  assert.equal(validateAiValueEvidenceCase(validatedCase).valid, true);
});

test("does not persist free-form customer validation statements", () => {
  const inputs = loadInputs();
  const acceptedExport = {
    ...inputs.outcomeEvidenceExport,
    review: { review_state: "ACCEPTED" }
  };
  const resolvedScenario = JSON.parse(JSON.stringify(inputs.roiScenario));
  resolvedScenario.customer_owned_assumptions = resolvedScenario.customer_owned_assumptions.map(
    (assumption) => ({ ...assumption, state: "PRESENT" })
  );

  const validatedCase = buildValueEvidenceCase({
    ...inputs,
    roiScenario: resolvedScenario,
    outcomeEvidenceExport: acceptedExport,
    customerValidation: {
      economic_inputs_approved: true,
      approved_by_role: "finance_partner",
      validation_reference: "fy26_q2_value_validation_memo",
      validation_statement:
        "Finance approved $250,000 ROI for jane@example.com in the source memo."
    }
  });

  assert.equal(validatedCase.customer_validation.validation_statement, undefined);
  assert.equal(validateAiValueEvidenceCase(validatedCase).valid, true);

  const handAuthored = JSON.parse(JSON.stringify(validatedCase));
  handAuthored.customer_validation.validation_statement = "Do not store this free-form note.";
  const result = validateAiValueEvidenceCase(handAuthored);

  assert.equal(result.valid, false);
  assert.ok(
    result.gaps.some((gap) =>
      gap.includes("customer_validation.validation_statement must not be stored")
    )
  );
});

test("published schema allows validated value realization claim level", () => {
  const schema = readJson("schemas/ai-value-intelligence/value-evidence-case.schema.json");
  const allowed =
    schema.properties.safe_value_language.properties.allowed_claim_level.enum;

  assert.ok(allowed.includes("VALIDATED_VALUE_REALIZATION"));
});
