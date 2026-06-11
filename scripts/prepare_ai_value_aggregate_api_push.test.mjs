import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildAggregateApiPushPlan,
  validateAggregateApiPushPackage
} from "./prepare_ai_value_aggregate_api_push.mjs";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

const packageFixture = () =>
  readJson("docs/contracts/ai-value-intelligence/examples/customer-support-aggregate-api-push-package.json");

test("validates the customer-side aggregate API push package and emits governed API payloads", () => {
  const input = packageFixture();
  const validation = validateAggregateApiPushPackage(input);
  const plan = buildAggregateApiPushPlan(input);
  const v3Example = readJson(
    "docs/contracts/ai-value-intelligence/examples/customer-support-v3-aggregate-ingest-request.json"
  );
  const baselineExample = readJson(
    "docs/contracts/ai-value-intelligence/examples/customer-support-outcome-evidence-api-push-baseline.json"
  );
  const comparisonExample = readJson(
    "docs/contracts/ai-value-intelligence/examples/customer-support-outcome-evidence-api-push-comparison.json"
  );
  const materializerExample = readJson(
    "docs/contracts/ai-value-intelligence/examples/customer-support-real-evidence-materializer-request.json"
  );

  assert.equal(validation.valid, true);
  assert.deepEqual(validation.gaps, []);
  assert.deepEqual(plan.v3_aggregate_ingest, v3Example);
  assert.deepEqual(plan.outcome_evidence, [baselineExample, comparisonExample]);
  assert.deepEqual(plan.materializer_request, materializerExample);
  assert.equal(plan.customer_facing_economic_output, false);
  assert.deepEqual(
    plan.api_push_sequence.map((step) => `${step.method} ${step.endpoint}`),
    [
      "POST /api/v3/ingest/aggregate",
      "POST /api/v1/outcome-evidence",
      "POST /api/v1/outcome-evidence",
      "POST /api/v1/ai-value/materialize/real-evidence"
    ]
  );
});

test("rejects aggregate push packages that contain raw or identifying fields", () => {
  const unsafe = {
    ...packageFixture(),
    source_boundary: {
      ...packageFixture().source_boundary,
      direct_identifiers_included: true
    },
    outcome_evidence: [
      ...packageFixture().outcome_evidence,
      {
        ...packageFixture().outcome_evidence[0],
        source_attestation: {
          user_id: "person-123"
        }
      }
    ]
  };

  const validation = validateAggregateApiPushPackage(unsafe);

  assert.equal(validation.valid, false);
  assert.equal(
    validation.gaps.includes("source_boundary.direct_identifiers_included must be false"),
    true
  );
  assert.equal(
    validation.gaps.includes("forbidden field source_attestation.user_id is not allowed"),
    true
  );
});
