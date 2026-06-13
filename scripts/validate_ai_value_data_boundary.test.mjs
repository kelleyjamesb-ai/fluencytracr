import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { validateAiValueDataBoundary } from "./validate_ai_value_data_boundary.mjs";

const fixturePath =
  "docs/contracts/ai-value-intelligence/examples/customer-support-data-boundary-roi-evidence.json";

const loadFixture = () => JSON.parse(readFileSync(fixturePath, "utf8"));

test("seeded organizational data boundary fixture is valid", () => {
  const contract = loadFixture();

  const result = validateAiValueDataBoundary(contract);

  assert.equal(result.valid, true);
  assert.equal(result.contract_id, "data_boundary_customer_support_roi_evidence_v1");
  assert.equal(result.source_count, 9);
  assert.equal(result.reconciliation.conflicts_detected, false);
  assert.equal(result.feeds.aggregate_evidence_package, true);
  assert.equal(result.feeds.value_evidence_case, true);
  assert.equal(result.feeds.customer_facing_economic_output, false);
  assert.deepEqual(result.gaps, []);
});

test("allows sensitive organizational data only as upstream aggregate evidence inputs", () => {
  const contract = loadFixture();

  const hris = contract.organizational_data_sources.find(
    (source) => source.source_category === "HRIS_ORG_CONTEXT"
  );
  const finance = contract.organizational_data_sources.find(
    (source) => source.source_category === "FINANCE_ASSUMPTION"
  );

  assert.equal(hris.raw_data_policy.allowed_upstream, true);
  assert.equal(hris.raw_data_policy.raw_rows_cross_boundary, false);
  assert.ok(hris.allowed_aggregate_fields.includes("function"));
  assert.ok(hris.allowed_aggregate_fields.includes("attrition_rate"));
  assert.equal(finance.raw_data_policy.allowed_upstream, true);
  assert.equal(finance.raw_data_policy.raw_rows_cross_boundary, false);
  assert.ok(finance.allowed_aggregate_fields.includes("loaded_labor_rate_band"));

  const result = validateAiValueDataBoundary(contract);

  assert.equal(result.valid, true);
  assert.equal(result.allowed_upstream_sensitive_source_count, 4);
});

test("locks the metric pyramid and corrected VBD definitions", () => {
  const contract = loadFixture();

  const result = validateAiValueDataBoundary(contract);

  assert.equal(result.valid, true);
  assert.equal(contract.metric_pyramid.north_star_metric.name, "Validated AI Value Movement");
  assert.equal(contract.metric_pyramid.supporting_metrics[0].name, "AI Work Integration / VBD");
  assert.equal(contract.metric_pyramid.supporting_metrics[1].name, "AI Capability Growth");
  assert.equal(contract.vbd_definitions.velocity.definition, "speed_to_adoption");
  assert.equal(contract.vbd_definitions.breadth.definition, "spread_across_org_functions_workflows_surfaces");
  assert.equal(contract.vbd_definitions.depth.definition, "workflow_integration_embeddedness");
  assert.equal(result.vbd_definitions.velocity, "speed_to_adoption");
  assert.equal(result.vbd_definitions.depth, "workflow_integration_embeddedness");
});

test("rejects raw data, direct identifiers, manager chains, and raw content crossing the boundary", () => {
  const contract = loadFixture();
  const hris = contract.organizational_data_sources.find(
    (source) => source.source_category === "HRIS_ORG_CONTEXT"
  );
  hris.raw_data_policy.raw_rows_cross_boundary = true;
  hris.allowed_aggregate_fields.push(
    "employee_id",
    "hashed_employee_id",
    "manager_chain",
    "person_level_hris_record",
    "attrition_prediction"
  );

  const aiWork = contract.organizational_data_sources.find(
    (source) => source.source_category === "AI_WORK_EVIDENCE"
  );
  aiWork.allowed_aggregate_fields.push("raw_prompt", "user_email");

  const result = validateAiValueDataBoundary(contract);

  assert.equal(result.valid, false);
  assert.ok(result.gaps.includes("organizational_data_sources[5].raw_data_policy.raw_rows_cross_boundary must be false"));
  assert.ok(result.gaps.includes("organizational_data_sources[5].allowed_aggregate_fields contains forbidden field employee_id"));
  assert.ok(result.gaps.includes("organizational_data_sources[5].allowed_aggregate_fields contains forbidden field hashed_employee_id"));
  assert.ok(result.gaps.includes("organizational_data_sources[5].allowed_aggregate_fields contains forbidden field manager_chain"));
  assert.ok(result.gaps.includes("organizational_data_sources[5].allowed_aggregate_fields contains forbidden field person_level_hris_record"));
  assert.ok(result.gaps.includes("organizational_data_sources[5].allowed_aggregate_fields contains forbidden field attrition_prediction"));
  assert.ok(result.gaps.includes("organizational_data_sources[0].allowed_aggregate_fields contains forbidden field raw_prompt"));
  assert.ok(result.gaps.includes("organizational_data_sources[0].allowed_aggregate_fields contains forbidden field user_email"));
});

test("allows aggregate HRIS-derived workforce context when cohort-safe and attested", () => {
  const contract = loadFixture();
  const hris = contract.organizational_data_sources.find(
    (source) => source.source_category === "HRIS_ORG_CONTEXT"
  );
  hris.evidence_level = "SUPPORTED";
  hris.allowed_claim_level = "SUPPORTED_VALUE_MOVEMENT";
  hris.allowed_aggregate_fields.push(
    "aggregate_hris_derived_context",
    "aggregate_role_family_context",
    "aggregate_new_hire_cohort_context",
    "aggregate_training_completion_context",
    "aggregate_capacity_planning_context"
  );
  Object.assign(hris.required_attestation, {
    aggregate_workforce_context_allowed: true,
    contains_person_level_hris_records: false,
    contains_hashed_or_joinable_person_identifiers: false,
    contains_person_level_productivity: false,
    contains_manager_or_team_ranking: false,
    contains_people_decisioning: false,
    contains_compensation_or_performance_inference: false,
    contains_hris_inference_from_ai_usage: false
  });

  const result = validateAiValueDataBoundary(contract);

  assert.equal(result.valid, true, result.gaps.join("; "));
});

test("rejects aggregate HRIS context if unsafe person-level attestation flags are true", () => {
  const contract = loadFixture();
  const hris = contract.organizational_data_sources.find(
    (source) => source.source_category === "HRIS_ORG_CONTEXT"
  );
  Object.assign(hris.required_attestation, {
    contains_person_level_hris_records: true,
    contains_hashed_or_joinable_person_identifiers: true,
    contains_people_decisioning: true,
    contains_compensation_or_performance_inference: true,
    contains_hris_inference_from_ai_usage: true
  });

  const result = validateAiValueDataBoundary(contract);

  assert.equal(result.valid, false);
  assert.ok(result.gaps.includes("organizational_data_sources[5].required_attestation.contains_person_level_hris_records must be false"));
  assert.ok(result.gaps.includes("organizational_data_sources[5].required_attestation.contains_hashed_or_joinable_person_identifiers must be false"));
  assert.ok(result.gaps.includes("organizational_data_sources[5].required_attestation.contains_people_decisioning must be false"));
  assert.ok(result.gaps.includes("organizational_data_sources[5].required_attestation.contains_compensation_or_performance_inference must be false"));
  assert.ok(result.gaps.includes("organizational_data_sources[5].required_attestation.contains_hris_inference_from_ai_usage must be false"));
});

test("rejects conflicts with existing ROI, outcome evidence, and reportability contracts", () => {
  const contract = loadFixture();
  contract.contract_outputs.customer_facing_economic_output = true;
  contract.contract_outputs.realized_roi_calculation = true;
  contract.reconciliation.existing_contract_alignment.outcome_evidence_export = "CONFLICTS";
  contract.reconciliation.conflicts_detected = true;

  const result = validateAiValueDataBoundary(contract);

  assert.equal(result.valid, false);
  assert.ok(result.gaps.includes("contract_outputs.customer_facing_economic_output must be false"));
  assert.ok(result.gaps.includes("contract_outputs.realized_roi_calculation must be false"));
  assert.ok(result.gaps.includes("reconciliation.existing_contract_alignment.outcome_evidence_export must not be CONFLICTS"));
  assert.ok(result.gaps.includes("reconciliation.conflicts_detected must be false"));
});
