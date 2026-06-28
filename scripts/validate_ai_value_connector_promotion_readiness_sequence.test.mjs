import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildConnectorPromotionReadinessSequenceFromObject,
  connectorPromotionReadinessSequenceHash,
  validateConnectorPromotionReadinessSequence
} from "./run_ai_value_connector_promotion_readiness_sequence.mjs";

const FIXTURE_PATH =
  "docs/contracts/ai-value-real-data-intake-packet-runner/examples/controlled-aggregate-fixture-review-ready.json";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const clone = (value) => JSON.parse(JSON.stringify(value));
const BASE_FIXTURE = readJson(FIXTURE_PATH);
const BASE_SEQUENCE = buildConnectorPromotionReadinessSequenceFromObject(BASE_FIXTURE);

function hasNestedKey(value, key) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => hasNestedKey(item, key));
  return Object.entries(value).some(
    ([nestedKey, nestedValue]) => nestedKey === key || hasNestedKey(nestedValue, key)
  );
}

test("connector promotion readiness sequence records the next four actions without live or model authorization", () => {
  const sequence = BASE_SEQUENCE;
  const validation = validateConnectorPromotionReadinessSequence(sequence, {
    sourceFixture: BASE_FIXTURE,
    expectedSequence: sequence
  });

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(
    sequence.sequence_state,
    "CONNECTOR_PROMOTION_READINESS_SEQUENCE_DESIGNED_NON_LIVE"
  );
  assert.equal(sequence.source_bound, true);
  assert.equal(
    sequence.action_sequence.non_live_connector_promotion_requirements.state,
    "READY_REQUIREMENTS_DRAFT_ONLY"
  );
  assert.equal(
    sequence.action_sequence.glean_source_adapter_boundary.state,
    "HELD_NON_LIVE_GLEAN_ADAPTER_BOUNDARY_REQUIRED"
  );
  assert.equal(
    sequence.action_sequence.source_descriptor_promotion_checklist.state,
    "READY_FOR_HUMAN_REVIEW_CHECKLIST"
  );
  assert.equal(
    sequence.action_sequence.exact_scope_live_connector_promotion_gate.state,
    "DESIGNED_EXACT_SCOPE_GATE_REQUIREMENTS_ONLY"
  );
  assert.deepEqual(sequence.prepared_source_systems, ["bigquery_export", "sigma_export"]);
  assert.deepEqual(sequence.held_source_systems, ["glean_query"]);
  assert.equal(sequence.future_model_readiness.numeric_weights_authorized, false);
  assert.equal(sequence.future_model_readiness.bayesian_model_authorized, false);
  assert.equal(sequence.future_model_readiness.model_output_authorized, false);
  assert.equal(sequence.feeds.live_bigquery_execution, false);
  assert.equal(sequence.feeds.live_sigma_execution, false);
  assert.equal(sequence.feeds.live_glean_query, false);
  assert.equal(sequence.feeds.research_model_feed, false);
  assert.equal(sequence.feeds.numeric_weights_output, false);
  assert.equal(sequence.feeds.bayesian_probability_output, false);
  assert.equal(sequence.feeds.customer_facing_output, false);
});

test("connector promotion readiness sequence rejects unsafe live handles without echo", () => {
  const sequence = buildConnectorPromotionReadinessSequenceFromObject({
    source_fixture: BASE_FIXTURE,
    query_text: "select * from raw_rows where employee_email is not null",
    raw_rows: [{ employee_email: "person@example.com" }],
    bigquery_job_id: "bquxjob_unsafe",
    sigma_dashboard_url: "https://sigma.example/workbook/123",
    credential_ref: "secret://warehouse/key",
    dataset_id: "customer_sensitive_dataset",
    table_id: "customer_sensitive_table",
    bayesian_posterior: { probability: 0.82 },
    numeric_weights: { vbd: 0.4, metric: 0.6 }
  });
  const validation = validateConnectorPromotionReadinessSequence(sequence);
  const serialized = JSON.stringify(sequence);

  assert.equal(sequence.sequence_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validation.valid, false);
  assert.deepEqual(validation.gaps, []);
  for (const unsafe of [
    "person@example.com",
    "select * from raw_rows",
    "bquxjob_unsafe",
    "sigma.example",
    "secret://warehouse/key",
    "customer_sensitive_dataset",
    "customer_sensitive_table"
  ]) {
    assert.equal(serialized.includes(unsafe), false, `${unsafe} must not echo`);
  }
  assert.equal(hasNestedKey(sequence, "bayesian_posterior"), false);
  assert.equal(hasNestedKey(sequence, "numeric_weights"), false);
});

test("connector promotion readiness sequence sanitizes unsafe supplied compact hardening refs without echo", () => {
  const sequence = buildConnectorPromotionReadinessSequenceFromObject({
    source_fixture: BASE_FIXTURE,
    compact_source_wiring_hardening: {
      schema_version: "FT_AI_VALUE_COMPACT_SOURCE_WIRING_HARDENING_2026_06",
      hardening_id: "https://sigma.example/workbook/123",
      hardening_state:
        "COMPACT_SOURCE_WIRING_HARDENED_NON_LIVE select * from raw_rows",
      hardening_hash: "bquxjob_unsafe",
      allowed_next_step:
        "draft_non_live_connector_promotion_decision_requirements_only"
    }
  });
  const validation = validateConnectorPromotionReadinessSequence(sequence);
  const serialized = JSON.stringify(sequence);

  assert.equal(sequence.sequence_state, "HOLD_FOR_COMPACT_SOURCE_WIRING_HARDENING");
  assert.equal(validation.valid, false);
  assert.equal(sequence.source_compact_hardening_ref.hardening_id, null);
  assert.equal(sequence.source_compact_hardening_ref.hardening_state, null);
  assert.equal(sequence.source_compact_hardening_ref.hardening_hash, null);
  for (const unsafe of [
    "https://sigma.example/workbook/123",
    "select * from raw_rows",
    "bquxjob_unsafe",
    "sigma.example"
  ]) {
    assert.equal(serialized.includes(unsafe), false, `${unsafe} must not echo`);
  }
});

test("connector promotion readiness sequence strips unsafe supplied source systems without echo", () => {
  const sequence = buildConnectorPromotionReadinessSequenceFromObject({
    source_fixture: BASE_FIXTURE,
    compact_source_wiring_hardening: {
      schema_version: "FT_AI_VALUE_COMPACT_SOURCE_WIRING_HARDENING_2026_06",
      hardening_id: "compact_source_wiring_hardening:safe_but_incomplete",
      hardening_state: "COMPACT_SOURCE_WIRING_HARDENED_NON_LIVE",
      hardening_hash:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      allowed_next_step:
        "draft_non_live_connector_promotion_decision_requirements_only",
      prepared_source_systems: [
        { source_system: "https://sigma.example/workbook/123" },
        { source_system: "bigquery_export" }
      ],
      held_source_systems: [
        { source_system: "secret://warehouse/glean_query" },
        { source_system: "glean_query" }
      ],
      feeds: {
        live_bigquery_execution: false,
        live_sigma_execution: false,
        live_glean_query: false
      }
    }
  });
  const serialized = JSON.stringify(sequence);

  assert.equal(sequence.sequence_state, "HOLD_FOR_COMPACT_SOURCE_WIRING_HARDENING");
  assert.deepEqual(sequence.prepared_source_systems, ["bigquery_export"]);
  assert.deepEqual(sequence.held_source_systems, ["glean_query"]);
  for (const unsafe of [
    "https://sigma.example/workbook/123",
    "secret://warehouse/glean_query",
    "sigma.example",
    "secret://warehouse"
  ]) {
    assert.equal(serialized.includes(unsafe), false, `${unsafe} must not echo`);
  }
});

test("connector promotion readiness sequence validation rejects forged sequence id after rehash", () => {
  const forged = clone(BASE_SEQUENCE);
  forged.sequence_id = "connector_promotion_readiness_sequence:forged";
  forged.sequence_hash = connectorPromotionReadinessSequenceHash(forged);

  const validation = validateConnectorPromotionReadinessSequence(forged, {
    sourceFixture: BASE_FIXTURE,
    expectedSequence: BASE_SEQUENCE
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /sequence_id|sourceFixture/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("connector promotion readiness sequence validation rejects forged Glean preparation after rehash", () => {
  const forged = clone(BASE_SEQUENCE);
  forged.held_source_systems = [];
  forged.prepared_source_systems.push("glean_query");
  forged.action_sequence.glean_source_adapter_boundary.state =
    "READY_FOR_GLEAN_QUERY_EXECUTION";
  forged.feeds.live_glean_query = true;
  forged.sequence_hash = connectorPromotionReadinessSequenceHash(forged);

  const validation = validateConnectorPromotionReadinessSequence(forged, {
    sourceFixture: BASE_FIXTURE,
    expectedSequence: BASE_SEQUENCE
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /glean|feeds|sourceFixture/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("connector promotion readiness sequence validation rejects forged weights and Bayesian readiness after rehash", () => {
  const forged = clone(BASE_SEQUENCE);
  forged.future_model_readiness.numeric_weights_authorized = true;
  forged.future_model_readiness.bayesian_model_authorized = true;
  forged.feeds.numeric_weights_output = true;
  forged.feeds.bayesian_probability_output = true;
  forged.sequence_hash = connectorPromotionReadinessSequenceHash(forged);

  const validation = validateConnectorPromotionReadinessSequence(forged, {
    sourceFixture: BASE_FIXTURE,
    expectedSequence: BASE_SEQUENCE
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /numeric_weights|bayesian|feeds|sourceFixture/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("connector promotion readiness sequence validation requires source fixture binding for ready records", () => {
  const validation = validateConnectorPromotionReadinessSequence(BASE_SEQUENCE);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /sourceFixture is required/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("connector promotion readiness sequence CLI emits requirements-only posture", () => {
  const output = execFileSync(
    process.execPath,
    ["scripts/run_ai_value_connector_promotion_readiness_sequence.mjs", FIXTURE_PATH],
    { cwd: process.cwd(), encoding: "utf8" }
  );
  const sequence = JSON.parse(output);
  const expectedSequence = buildConnectorPromotionReadinessSequenceFromObject(
    BASE_FIXTURE,
    { generatedAt: sequence.generated_at }
  );
  const validation = validateConnectorPromotionReadinessSequence(sequence, {
    sourceFixture: BASE_FIXTURE,
    expectedSequence
  });

  assert.equal(
    sequence.sequence_state,
    "CONNECTOR_PROMOTION_READINESS_SEQUENCE_DESIGNED_NON_LIVE"
  );
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(sequence.future_model_readiness.numeric_weights_authorized, false);
  assert.equal(sequence.future_model_readiness.bayesian_model_authorized, false);
  assert.equal(sequence.feeds.live_bigquery_execution, false);
});
