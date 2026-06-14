import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CustomerJourneySchema,
  buildInitialCustomerJourney,
  validateCustomerJourney
} from "../shared/dist/aiValueEngine/index.js";

const EXAMPLES = "docs/contracts/ai-value-customer-journey/examples";

const EXAMPLE_FILES = [
  "initial-ai-fluency-only-journey.json",
  "client-evidence-phase-journey.json"
];

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

function validJourney(overrides = {}) {
  return {
    ...buildInitialCustomerJourney({
      journeyId: "customer_journey_test",
      orgId: "org_example",
      customerAccountId: "customer_account_example",
      engagementId: "engagement_example",
      createdAt: "2026-06-13T00:00:00.000Z"
    }),
    ...overrides
  };
}

function stage(journey, stageId) {
  const match = journey.stages.find((candidate) => candidate.stage_id === stageId);
  assert.ok(match, `Expected stage ${stageId}`);
  return match;
}

function expectInvalid(journey, expectedGapPattern) {
  const result = validateCustomerJourney(journey);
  assert.equal(result.valid, false, "Expected Customer Journey to fail");
  assert.ok(
    result.gaps.some((gap) => expectedGapPattern.test(gap)),
    `Expected gap matching ${expectedGapPattern}; got: ${result.gaps.join("; ")}`
  );
}

test("all examples validate", () => {
  for (const file of EXAMPLE_FILES) {
    const journey = readJson(`${EXAMPLES}/${file}`);
    const result = validateCustomerJourney(journey);
    assert.equal(result.valid, true, `${file}: ${result.gaps.join("; ")}`);
  }
});

test("builder creates the required ordered post-sales journey stages", () => {
  const journey = validJourney();
  const result = validateCustomerJourney(journey);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.deepEqual(
    journey.stages.map((candidate) => candidate.stage_id),
    CustomerJourneySchema.stage_ids
  );
  assert.equal(result.feeds.customer_journey, true);
  assert.equal(result.feeds.measurement_plan_draft_context, true);
  assert.equal(result.feeds.client_evidence_request_context, true);
  assert.equal(result.feeds.client_evidence_entry_context, true);
  assert.equal(result.feeds.claim_readiness_snapshot, false);
  assert.equal(result.feeds.executive_readout_snapshot, false);
  assert.equal(result.feeds.customer_facing_financial_output, false);
});

test("required top-level fields and schema version are enforced", () => {
  const missingId = validJourney();
  delete missingId.customer_journey_id;
  expectInvalid(missingId, /customer_journey_id is missing/);

  const badSchema = validJourney({ schema_version: "wrong" });
  expectInvalid(badSchema, /schema_version is invalid/);
});

test("stage set must be complete, ordered, and status-valid", () => {
  const missingStage = validJourney();
  missingStage.stages = missingStage.stages.filter(
    (candidate) => candidate.stage_id !== "client_evidence_entry"
  );
  expectInvalid(missingStage, /stages missing required stage: client_evidence_entry/);

  const reordered = validJourney();
  const first = reordered.stages[0];
  reordered.stages[0] = reordered.stages[1];
  reordered.stages[1] = first;
  expectInvalid(reordered, /stages\[0\]\.stage_id must be post_sales_kickoff/);

  const invalidStatus = validJourney();
  stage(invalidStatus, "measurement_plan_draft").stage_status = "ready";
  expectInvalid(invalidStatus, /stage_status is invalid/);
});

test("all stages must carry required blocked outputs", () => {
  for (const blockedOutput of CustomerJourneySchema.required_blocked_outputs) {
    const journey = validJourney();
    const kickoff = stage(journey, "post_sales_kickoff");
    kickoff.blocked_outputs = kickoff.blocked_outputs.filter((item) => item !== blockedOutput);
    expectInvalid(journey, new RegExp(`blocked_outputs must include ${blockedOutput}`));
  }
});

test("unsafe financial and people analytics outputs fail", () => {
  const roi = validJourney();
  stage(roi, "initial_signal_capture").allowed_outputs.push("realized_roi");
  expectInvalid(roi, /unsafe allowed or produced output: realized_roi/);

  const financial = validJourney();
  stage(financial, "initial_signal_capture").allowed_outputs.push("financial_output");
  expectInvalid(financial, /unsafe allowed or produced output: financial_output/);

  const roiEstimate = validJourney();
  stage(roiEstimate, "initial_signal_capture").produced_outputs.push("roi_estimate");
  expectInvalid(roiEstimate, /unsafe allowed or produced output: roi_estimate/);

  const returnOnInvestment = validJourney();
  stage(returnOnInvestment, "initial_signal_capture").produced_outputs.push(
    "return_on_investment_summary"
  );
  expectInvalid(
    returnOnInvestment,
    /unsafe allowed or produced output: return_on_investment_summary/
  );

  const peopleAnalytics = validJourney();
  stage(peopleAnalytics, "evidence_snapshot_review").produced_outputs.push("team_ranking_output");
  expectInvalid(peopleAnalytics, /unsafe allowed or produced output: team_ranking_output/);

  const employeeScore = validJourney();
  stage(employeeScore, "evidence_snapshot_review").produced_outputs.push("employee_score");
  expectInvalid(employeeScore, /unsafe allowed or produced output: employee_score/);
});

test("evidence gap review must preserve missing Layer 2 and Layer 3 caveats", () => {
  const missingLayer2 = validJourney();
  stage(missingLayer2, "evidence_gap_review").required_caveats = [
    "Missing Layer 3 outcome evidence remains explicit."
  ];
  expectInvalid(missingLayer2, /missing Layer 2 evidence/);

  const missingLayer3 = validJourney();
  stage(missingLayer3, "evidence_gap_review").required_caveats = [
    "Missing Layer 2 user voice evidence remains explicit."
  ];
  expectInvalid(missingLayer3, /missing Layer 3 evidence/);

  const falseSupport = validJourney();
  stage(falseSupport, "evidence_gap_review").required_caveats = [
    "Layer 2 evidence is fully present.",
    "Layer 3 evidence is claim support."
  ];
  expectInvalid(falseSupport, /missing Layer 2 evidence/);
});

test("client evidence request cannot produce claim outputs", () => {
  const journey = validJourney();
  stage(journey, "client_evidence_request").produced_outputs.push("customer_claim_packet");
  expectInvalid(journey, /cannot create claim-equivalent outputs/);

  const proof = validJourney();
  stage(proof, "client_evidence_request").produced_outputs.push("value_proof_packet");
  expectInvalid(proof, /cannot create claim-equivalent outputs/);

  const safeEvidenceRequest = validJourney();
  stage(safeEvidenceRequest, "client_evidence_request").allowed_outputs.push(
    "financial_metric_evidence_request",
    "economic_source_owner_attestation_request"
  );
  assert.equal(validateCustomerJourney(safeEvidenceRequest).valid, true);
});

test("client evidence entry accepts only aggregate-safe attested inputs", () => {
  const nonAggregate = validJourney();
  stage(nonAggregate, "client_evidence_entry").input_boundary.aggregate_only = false;
  expectInvalid(nonAggregate, /input_boundary\.aggregate_only must be true/);

  const directIds = validJourney();
  stage(directIds, "client_evidence_entry").input_boundary.contains_direct_identifiers = true;
  expectInvalid(directIds, /input_boundary\.contains_direct_identifiers must be false/);

  const rawRows = validJourney();
  stage(rawRows, "client_evidence_entry").raw_rows = [{ unsafe: true }];
  expectInvalid(rawRows, /Forbidden field detected: raw_rows/);

  const hashedIds = validJourney();
  stage(hashedIds, "client_evidence_entry").hashed_person_id = "hash";
  expectInvalid(hashedIds, /Forbidden field detected: hashed_person_id/);
});

test("blocked concepts cannot be reintroduced as arbitrary fields", () => {
  for (const blockedField of [
    "realized_roi",
    "customer_facing_financial_output",
    "manager_or_team_ranking",
    "people_decisioning",
    "raw_rows"
  ]) {
    const journey = validJourney();
    stage(journey, "evidence_snapshot_review")[blockedField] = true;
    expectInvalid(journey, new RegExp(`Forbidden field detected: ${blockedField}`));
  }
});

test("intervention retest continues to block causality without causal design", () => {
  const journey = validJourney();
  const retest = stage(journey, "intervention_retest");
  assert.equal(retest.causal_design.approved, false);
  assert.ok(retest.blocked_outputs.includes("causality_claim"));

  retest.blocked_outputs = retest.blocked_outputs.filter((item) => item !== "causality_claim");
  expectInvalid(journey, /blocked_outputs must include causality_claim/);
});

test("governance and persistence boundaries fail closed", () => {
  const financialOutput = validJourney();
  financialOutput.governance.customer_facing_financial_output_allowed = true;
  expectInvalid(financialOutput, /governance\.customer_facing_financial_output_allowed must be false/);

  const persisted = validJourney();
  persisted.persistence_policy.persisted = true;
  expectInvalid(persisted, /persistence_policy\.persisted must be false/);

  const routeCreating = validJourney();
  routeCreating.persistence_policy.creates_backend_routes = true;
  expectInvalid(routeCreating, /persistence_policy\.creates_backend_routes must be false/);
});
