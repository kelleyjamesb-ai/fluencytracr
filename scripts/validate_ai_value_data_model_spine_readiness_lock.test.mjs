import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildDataModelSpineReadinessLockFromObject,
  dataModelSpineReadinessLockHash,
  validateDataModelSpineReadinessLock
} from "./run_ai_value_data_model_spine_readiness_lock.mjs";

const FIXTURE_PATH =
  "docs/contracts/ai-value-real-data-intake-packet-runner/examples/controlled-aggregate-fixture-review-ready.json";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function hasNestedKey(value, key) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => hasNestedKey(item, key));
  return Object.entries(value).some(
    ([nestedKey, nestedValue]) => nestedKey === key || hasNestedKey(nestedValue, key)
  );
}

const FORBIDDEN_OUTPUT_KEYS = [
  "confidence_score",
  "probability_score",
  "model_result",
  "model_weights",
  "coefficient",
  "p_value",
  "statistical_significance",
  "roi_output",
  "finance_output_value",
  "financial_attribution",
  "raw_rows",
  "query_text",
  "sql_text",
  "prompt_text",
  "response_text",
  "transcript",
  "user_id",
  "employee_email",
  "source_hash",
  "org_client_id",
  "bigquery_job",
  "sigma_dashboard",
  "dataset",
  "table",
  "credential",
  "measurement_cell_series_snapshots",
  "evidence_continuity_persistence"
];

test("data model spine readiness lock emits a Boolean contract equation, not model math", () => {
  const fixture = readJson(FIXTURE_PATH);
  const lock = buildDataModelSpineReadinessLockFromObject(fixture);
  const validation = validateDataModelSpineReadinessLock(lock, { sourceFixture: fixture });

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(lock.lock_state, "COMPACT_CUSTOMER_DATA_MODEL_SPINE_READY");
  assert.equal(lock.equation.kind, "boolean_contract_readiness");
  assert.equal(lock.equation.statistical_model_equation_implemented, false);
  assert.equal(lock.equation.confidence_math_implemented, false);
  assert.equal(lock.equation.numeric_weights_implemented, false);
  assert.equal(lock.equation.formula, [
    "measurement_cell_snapshots_promoted",
    "ai_value_customer_data_model_snapshots_promoted",
    "customer_data_model_route_projection_ready",
    "customer_evidence_history_read_path_proven",
    "durable_series_read_path_holds_series_persistence",
    "all_blocked_outputs_false"
  ].join(" AND "));
  assert.equal(lock.equation.result, true);
  assert.equal(lock.series_persistence_state, "HELD_NOT_REQUIRED_FOR_CURRENT_READ_PATH");
  assert.equal(lock.allowed_next_step, "harden_compact_customer_data_model_for_real_source_wiring");
  assert.equal(lock.feeds.model_output, false);
  assert.equal(lock.feeds.confidence_output, false);
  assert.equal(lock.feeds.probability_output, false);
  assert.equal(lock.feeds.score_like_output, false);
  assert.equal(lock.feeds.finance_output, false);
  assert.equal(lock.feeds.customer_facing_output, false);
  assert.equal(lock.feeds.customer_facing_economic_output, false);
  assert.equal(lock.feeds.customer_facing_financial_output, false);
  assert.equal(lock.feeds.live_bigquery_execution, false);
  assert.equal(lock.feeds.live_sigma_execution, false);
  assert.equal(lock.feeds.live_glean_query, false);
  assert.equal(lock.feeds.measurement_cell_series_snapshot_implementation_decision, false);
  assert.equal(lock.boundary_policy.implements_statistical_model_equation, false);
  assert.equal(lock.boundary_policy.implements_confidence_math, false);
  assert.equal(lock.boundary_policy.implements_numeric_weights, false);
  assert.equal(lock.boundary_policy.runs_bigquery, false);
  assert.equal(lock.boundary_policy.runs_sigma, false);
  assert.equal(lock.boundary_policy.emits_customer_facing_economic_output, false);

  for (const key of FORBIDDEN_OUTPUT_KEYS) {
    assert.equal(hasNestedKey(lock, key), false, `${key} must not appear in the lock`);
  }
});

test("data model spine readiness lock rejects attempts to add a statistical equation or weights", () => {
  const lock = buildDataModelSpineReadinessLockFromObject({
    source_fixture: readJson(FIXTURE_PATH),
    model_equation: "confidence = 0.4 * vbd + 0.6 * metric",
    model_weights: { vbd: 0.4, metric: 0.6 },
    confidence_score: 0.87,
    probability_score: 0.72,
    roi: 100
  });
  const validation = validateDataModelSpineReadinessLock(lock);
  const serialized = JSON.stringify(lock);

  assert.equal(lock.lock_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validation.valid, false);
  assert.equal(serialized.includes("0.4 * vbd"), false);
  assert.equal(serialized.includes("confidence_score"), false);
  assert.equal(serialized.includes("probability_score"), false);
  assert.equal(serialized.includes("model_weights"), false);
  assert.equal(hasNestedKey(lock, "model_equation"), false);
});

test("data model spine readiness lock validation rejects forged model outputs after rehash", () => {
  const fixture = readJson(FIXTURE_PATH);
  const lock = buildDataModelSpineReadinessLockFromObject(fixture);
  const forged = clone(lock);
  forged.equation.statistical_model_equation_implemented = true;
  forged.equation.numeric_weights_implemented = true;
  forged.feeds.model_output = true;
  forged.feeds.confidence_output = true;
  forged.lock_hash = dataModelSpineReadinessLockHash(forged);

  const validation = validateDataModelSpineReadinessLock(forged, {
    sourceFixture: fixture
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /equation|feeds/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("data model spine readiness lock validation rejects forged prerequisites after rehash", () => {
  const fixture = readJson(FIXTURE_PATH);
  const lock = buildDataModelSpineReadinessLockFromObject(fixture);
  const forged = clone(lock);
  forged.prerequisites.customer_evidence_history_read_path_proven = false;
  forged.prerequisites.durable_series_read_path_holds_series_persistence = false;
  forged.equation.result = true;
  forged.validation_summary.valid = true;
  forged.lock_hash = dataModelSpineReadinessLockHash(forged);

  const validation = validateDataModelSpineReadinessLock(forged, {
    sourceFixture: fixture
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /prerequisites|sourceFixture/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("data model spine readiness lock rejects unsafe source and live-wiring sidecars without echo", () => {
  const lock = buildDataModelSpineReadinessLockFromObject({
    source_fixture: readJson(FIXTURE_PATH),
    raw_rows: [{ user_id: "user-123", employee_email: "person@example.com" }],
    query_text: "select * from sensitive.table",
    source_hash: "person:source:hash",
    bigquery_job: "bquxjob_123",
    sigma_dashboard: "https://sigma.example/dashboard",
    measurement_cell_series_snapshots: [{ series_persistence: true }]
  });
  const validation = validateDataModelSpineReadinessLock(lock);
  const serialized = JSON.stringify(lock);

  assert.equal(lock.lock_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validation.valid, false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("select * from sensitive.table"), false);
  assert.equal(serialized.includes("bquxjob_123"), false);
  assert.equal(serialized.includes("sigma.example"), false);
  assert.equal(hasNestedKey(lock, "measurement_cell_series_snapshots"), false);
});

test("data model spine readiness lock CLI emits the compact ready state", () => {
  const output = execFileSync(
    process.execPath,
    ["scripts/run_ai_value_data_model_spine_readiness_lock.mjs", FIXTURE_PATH],
    { cwd: process.cwd(), encoding: "utf8" }
  );
  const lock = JSON.parse(output);
  const validation = validateDataModelSpineReadinessLock(lock, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(lock.lock_state, "COMPACT_CUSTOMER_DATA_MODEL_SPINE_READY");
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(lock.equation.statistical_model_equation_implemented, false);
});
