import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { aiValueEngine } from "../shared/dist/index.js";

const authorizedInput = {
  hypothesisVersion: 1,
  planVersion: 2,
  measurementCellVersion: 3,
  metricId: "support_median_resolution_hours",
  measurementUnit: "hours",
  approvedDirection: "DECREASE",
  movement: {
    metric_id: "support_median_resolution_hours",
    measurement_unit: "hours",
    baseline_value: 18.4,
    comparison_value: 15.1,
    absolute_delta: -3.3,
    percent_change: -17.934783,
    observed_direction: "DECREASE",
    approved_metric_direction: "DECREASE",
    claim_label: "OBSERVED_NON_ATTRIBUTABLE"
  },
  policyState: aiValueEngine.aggregateClaimPolicyState(),
  caveats: [...aiValueEngine.AGGREGATE_CLAIM_CAVEATS]
};

test("Slice F exports one strict allowlisted trace and one fixed hold", () => {
  const trace = aiValueEngine.buildCanonicalClaimTraceAuthorized(authorizedInput);
  assert.deepEqual(Object.keys(trace), [
    "schema_version",
    "trace_state",
    "source_bound",
    "read_only",
    "customer_facing_output_authorized",
    "stages"
  ]);
  assert.equal(aiValueEngine.CanonicalClaimTraceSchema.parse(trace).trace_state, "AUTHORIZED");
  assert.deepEqual(aiValueEngine.canonicalClaimTraceFixedHold(), {
    schema_version: "FT_CANONICAL_CLAIM_TRACE_V1",
    trace_state: "HOLD",
    source_bound: false,
    read_only: true,
    canonical_identity_state: "UNBOUND",
    customer_facing_output_authorized: false
  });
});

test("Slice F never projects private or person-shaped source material", () => {
  const serialized = JSON.stringify(
    aiValueEngine.buildCanonicalClaimTraceAuthorized(authorizedInput)
  );
  for (const poison of [
    "org_id",
    "workflow_id",
    "jbtd_id",
    "persona_id",
    "binding_id",
    "packet_id",
    "manifest_id",
    "commitment",
    "attestation",
    "journal",
    "person@example.com",
    "raw_event",
    "prompt",
    "transcript",
    "secret"
  ]) {
    assert.equal(serialized.includes(poison), false, poison);
  }
});

test("Slice F JSON Schema and contract documentation are synchronized", () => {
  const schema = JSON.parse(
    readFileSync("schemas/ai-value/canonical-claim-trace.schema.json", "utf8")
  );
  const docs = readFileSync(
    "docs/contracts/ai-value-canonical-claim-trace/README.md",
    "utf8"
  );
  assert.equal(schema.oneOf.length, 2);
  assert.equal(schema.$defs.authorized.additionalProperties, false);
  assert.equal(schema.$defs.held.additionalProperties, false);
  assert.match(docs, /ADMIN/);
  assert.match(docs, /ENABLEMENT_LEAD/);
  assert.match(docs, /GET \/api\/v1\/ai-value\/claim-trace\/:bindingId/);
  assert.match(docs, /canonical_identity_binding_<64 lowercase hexadecimal characters>/);
  assert.match(docs, /not a suppression reason/i);
  assert.match(docs, /no database migration/i);
});
