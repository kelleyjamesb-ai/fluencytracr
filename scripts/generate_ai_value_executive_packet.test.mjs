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
  assert.equal(markdown.includes("HOLD_FOR_ASSUMPTIONS"), true);
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
