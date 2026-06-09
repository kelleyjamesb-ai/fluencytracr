import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildEvidenceReadinessFromObjects } from "./validate_ai_value_readiness.mjs";
import { buildClaimBoundaryFromReadiness } from "./validate_ai_value_claim_boundary.mjs";
import {
  buildExecutiveValidationPacket,
  validateExecutiveValidationPacket
} from "./generate_ai_value_executive_packet.mjs";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

test("runs the Customer Support V1 spine from Blueprint through Executive Packet", () => {
  const blueprint = readJson(
    "docs/contracts/ai-value-intelligence/examples/customer-support-blueprint.json"
  );
  const metricsLibrary = readJson(
    "docs/contracts/ai-value-intelligence/examples/customer-support-metrics-library.json"
  );
  const scenario = readJson(
    "docs/contracts/ai-value-intelligence/examples/customer-support-value-scenario.json"
  );

  const readiness = buildEvidenceReadinessFromObjects(
    blueprint,
    metricsLibrary,
    scenario
  );
  const claimBoundary = buildClaimBoundaryFromReadiness(readiness);
  const packet = buildExecutiveValidationPacket({
    blueprint,
    metricsLibrary,
    scenario,
    readiness,
    claimBoundary
  });
  const validation = validateExecutiveValidationPacket(packet);

  assert.equal(readiness.decision, "HOLD_FOR_ASSUMPTIONS");
  assert.equal(claimBoundary.claim_state, "INTERNAL_ONLY");
  assert.equal(packet.sections.metrics.length, 2);
  assert.equal(packet.customer_facing_economic_output, false);
  assert.equal(validation.valid, true);
});
