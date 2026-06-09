import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildClaimBoundaryFromReadiness,
  validateAiValueClaimBoundary
} from "./validate_ai_value_claim_boundary.mjs";

const baseBoundary = {
  schema_version: "FT_AI_VALUE_CLAIM_BOUNDARY_2026_06",
  claim_boundary_id: "claim_boundary_customer_support_v1",
  workflow_family: "customer_support_case_resolution",
  value_route: "CAPACITY_CREATION",
  source_readiness_id: "readiness_customer_support_v1",
  claim_state: "INTERNAL_ONLY",
  safe_claims: [
    "Aggregate support metrics and AI work evidence can support internal planning for a capacity-creation investigation."
  ],
  caveated_claims: [
    "Customer-owned assumptions must be reviewed before executive validation."
  ],
  blocked_claims: [
    "roi_proof",
    "causality_claim",
    "individual_scoring",
    "team_or_manager_ranking",
    "hr_analytics",
    "productivity_measurement",
    "customer_facing_economic_output"
  ],
  required_caveats: [
    "This is a pre-ROI planning artifact.",
    "Missing or caveated assumptions prevent external economic claims."
  ],
  review_state: "READY_FOR_INTERNAL_REVIEW",
  governance_boundaries: {
    customer_facing_economic_output: false,
    realized_roi_calculation: false,
    causality_claim: false,
    individual_scoring: false,
    hr_analytics: false,
    productivity_measurement: false
  }
};

test("validates a governed Claim Boundary record", () => {
  const result = validateAiValueClaimBoundary(baseBoundary);

  assert.equal(result.valid, true);
  assert.equal(result.claim_boundary_id, "claim_boundary_customer_support_v1");
  assert.equal(result.claim_state, "INTERNAL_ONLY");
  assert.equal(result.feeds.executive_packet, true);
  assert.deepEqual(result.gaps, []);
});

test("seeded Customer Support claim boundary fixture is valid", () => {
  const fixture = JSON.parse(
    readFileSync(
      "docs/contracts/ai-value-intelligence/examples/customer-support-claim-boundary.json",
      "utf8"
    )
  );

  const result = validateAiValueClaimBoundary(fixture);

  assert.equal(result.valid, true);
  assert.equal(result.claim_state, "INTERNAL_ONLY");
});

test("builds claim boundary from Evidence Readiness", () => {
  const readiness = JSON.parse(
    readFileSync(
      "docs/contracts/ai-value-intelligence/examples/customer-support-evidence-readiness.json",
      "utf8"
    )
  );

  const boundary = buildClaimBoundaryFromReadiness(readiness);
  const result = validateAiValueClaimBoundary(boundary);

  assert.equal(result.valid, true);
  assert.equal(boundary.source_readiness_id, "readiness_customer_support_v1");
  assert.equal(boundary.claim_state, "INTERNAL_ONLY");
  assert.equal(boundary.review_state, "READY_FOR_INTERNAL_REVIEW");
});

test("rejects missing identity and claim arrays", () => {
  const boundary = structuredClone(baseBoundary);
  boundary.claim_boundary_id = "";
  boundary.workflow_family = "";
  boundary.safe_claims = [];
  boundary.required_caveats = [];

  const result = validateAiValueClaimBoundary(boundary);

  assert.equal(result.valid, false);
  assert.equal(result.gaps.includes("claim_boundary_id is missing"), true);
  assert.equal(result.gaps.includes("workflow_family is missing"), true);
  assert.equal(result.gaps.includes("safe_claims must include at least one claim"), true);
  assert.equal(
    result.gaps.includes("required_caveats must include at least one caveat"),
    true
  );
});

test("rejects unsafe claim state, review state, and missing blocked claims", () => {
  const boundary = structuredClone(baseBoundary);
  boundary.claim_state = "ROI_PROOF";
  boundary.review_state = "CUSTOMER_READY";
  boundary.blocked_claims = ["roi_proof"];

  const result = validateAiValueClaimBoundary(boundary);

  assert.equal(result.valid, false);
  assert.equal(result.gaps.includes("claim_state is invalid: ROI_PROOF"), true);
  assert.equal(result.gaps.includes("review_state is invalid: CUSTOMER_READY"), true);
  assert.equal(result.gaps.includes("blocked_claims missing causality_claim"), true);
});

test("rejects forbidden claim text and unsafe governance boundaries", () => {
  const boundary = structuredClone(baseBoundary);
  boundary.safe_claims = ["Glean proved ROI and caused productivity lift."];
  boundary.governance_boundaries.realized_roi_calculation = true;
  boundary.governance_boundaries.productivity_measurement = true;

  const result = validateAiValueClaimBoundary(boundary);

  assert.equal(result.valid, false);
  assert.equal(result.gaps.includes("safe_claims contains forbidden claim language"), true);
  assert.equal(
    result.gaps.includes("governance_boundaries.realized_roi_calculation is true"),
    true
  );
  assert.equal(
    result.gaps.includes("governance_boundaries.productivity_measurement is true"),
    true
  );
});
