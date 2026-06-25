import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildCompactSourceWiringHardeningFromObject,
  compactSourceWiringHardeningHash,
  validateCompactSourceWiringHardening
} from "./run_ai_value_compact_source_wiring_hardening.mjs";

const FIXTURE_PATH =
  "docs/contracts/ai-value-real-data-intake-packet-runner/examples/controlled-aggregate-fixture-review-ready.json";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const clone = (value) => JSON.parse(JSON.stringify(value));
const BASE_FIXTURE = readJson(FIXTURE_PATH);
const BASE_HARDENING = buildCompactSourceWiringHardeningFromObject(BASE_FIXTURE);

function hasNestedKey(value, key) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => hasNestedKey(item, key));
  return Object.entries(value).some(
    ([nestedKey, nestedValue]) => nestedKey === key || hasNestedKey(nestedValue, key)
  );
}

const REQUIRED_FALSE_FEEDS = [
  "live_bigquery_execution",
  "live_sigma_execution",
  "live_glean_query",
  "customer_connector_execution",
  "credential_access",
  "query_execution",
  "raw_row_ingestion",
  "dashboard_row_ingestion",
  "source_package_clearance",
  "measurement_cell_series_persistence",
  "backend_route",
  "frontend_ui",
  "export_creation",
  "rendered_readout",
  "model_output",
  "confidence_output",
  "probability_output",
  "score_like_output",
  "finance_output",
  "customer_facing_output",
  "customer_facing_financial_output",
  "customer_facing_economic_output"
];

const FORBIDDEN_OUTPUT_KEYS = [
  "raw_rows",
  "query_text",
  "sql_text",
  "bigquery_job",
  "sigma_dashboard",
  "credential_ref",
  "secret",
  "user_id",
  "employee_email",
  "project_id",
  "dataset_id",
  "table_id",
  "source_hash",
  "source_refs_json",
  "org_client_id",
  "confidence_score",
  "probability_score",
  "roi_output",
  "finance_output_value",
  "measurement_cell_series_snapshots"
];

test("compact source wiring hardening prepares non-live source descriptors from the readiness lock", () => {
  const fixture = BASE_FIXTURE;
  const hardening = BASE_HARDENING;
  const validation = validateCompactSourceWiringHardening(hardening, {
    sourceFixture: fixture,
    expectedHardening: hardening
  });

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(
    hardening.hardening_state,
    "COMPACT_SOURCE_WIRING_HARDENED_NON_LIVE"
  );
  assert.equal(hardening.source_bound, true);
  assert.equal(
    hardening.allowed_next_step,
    "draft_non_live_connector_promotion_decision_requirements_only"
  );
  assert.equal(hardening.source_wiring_posture.wiring_mode, "non_live_preparation");
  assert.equal(hardening.source_wiring_posture.live_execution_authorized, false);
  assert.equal(hardening.source_wiring_posture.credential_access_authorized, false);
  assert.equal(hardening.source_wiring_posture.raw_row_ingestion_authorized, false);
  assert.equal(hardening.source_wiring_posture.customer_output_authorized, false);
  assert.deepEqual(
    hardening.prepared_source_systems.map((source) => source.source_system),
    ["bigquery_export", "sigma_export"]
  );
  assert.deepEqual(
    hardening.held_source_systems.map((source) => source.source_system),
    ["glean_query"]
  );
  assert.equal(
    hardening.prerequisites.data_model_spine_readiness_lock_valid,
    true
  );
  assert.equal(hardening.prerequisites.bigquery_boundary_plan_valid, true);
  assert.equal(hardening.prerequisites.sigma_boundary_plan_valid, true);
  assert.equal(hardening.prerequisites.compact_source_descriptors_only, true);
  assert.equal(hardening.prerequisites.all_live_wiring_feeds_false, true);

  for (const feed of REQUIRED_FALSE_FEEDS) {
    assert.equal(hardening.feeds[feed], false, `${feed} must remain false`);
  }
  for (const key of FORBIDDEN_OUTPUT_KEYS) {
    assert.equal(hasNestedKey(hardening, key), false, `${key} must not appear`);
  }
});

test("compact source wiring hardening rejects unsafe live handles without echo", () => {
  const hardening = buildCompactSourceWiringHardeningFromObject({
    source_fixture: BASE_FIXTURE,
    query_text: "select * from raw_rows where user_id is not null",
    raw_rows: [{ employee_email: "person@example.com" }],
    bigquery_job: "bquxjob_123",
    sigma_dashboard: "https://sigma.example/dashboard",
    credential_ref: "secret://warehouse/key",
    source_hash: "source_hash:person_level",
    project_id: "project_sensitive",
    dataset_id: "dataset_sensitive",
    table_id: "table_sensitive",
    measurement_cell_series_snapshots: [{ series_persistence: true }]
  });
  const validation = validateCompactSourceWiringHardening(hardening);
  const serialized = JSON.stringify(hardening);

  assert.equal(hardening.hardening_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validation.valid, false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("select * from raw_rows"), false);
  assert.equal(serialized.includes("bquxjob_123"), false);
  assert.equal(serialized.includes("sigma.example"), false);
  assert.equal(serialized.includes("secret://warehouse/key"), false);
  assert.equal(hasNestedKey(hardening, "measurement_cell_series_snapshots"), false);
  assert.equal(serialized.includes("project_sensitive"), false);
  assert.equal(serialized.includes("dataset_sensitive"), false);
  assert.equal(serialized.includes("table_sensitive"), false);
});

test("compact source wiring hardening validates generated rejected shape without extra source-lock gaps", () => {
  const hardening = buildCompactSourceWiringHardeningFromObject({
    source_fixture: BASE_FIXTURE,
    raw_rows: [{ employee_email: "person@example.com" }]
  });
  const validation = validateCompactSourceWiringHardening(hardening);

  assert.equal(hardening.hardening_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validation.valid, false);
  assert.deepEqual(validation.gaps, []);
});

test("compact source wiring hardening validation rejects forged live execution after rehash", () => {
  const fixture = BASE_FIXTURE;
  const hardening = BASE_HARDENING;
  const forged = clone(hardening);
  forged.feeds.live_bigquery_execution = true;
  forged.boundary_policy.fluencytracr_runs_bigquery = true;
  forged.source_wiring_posture.live_execution_authorized = true;
  forged.hardening_hash = compactSourceWiringHardeningHash(forged);

  const validation = validateCompactSourceWiringHardening(forged, {
    sourceFixture: fixture,
    expectedHardening: hardening
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /feeds|boundary_policy|source_wiring_posture/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("compact source wiring hardening validation rejects forged readiness lock binding after rehash", () => {
  const fixture = BASE_FIXTURE;
  const hardening = BASE_HARDENING;
  const forged = clone(hardening);
  forged.source_readiness_lock_ref.lock_state = "COMPACT_CUSTOMER_DATA_MODEL_SPINE_READY";
  forged.source_readiness_lock_ref.lock_hash =
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  forged.prerequisites.data_model_spine_readiness_lock_valid = true;
  forged.hardening_hash = compactSourceWiringHardeningHash(forged);

  const validation = validateCompactSourceWiringHardening(forged, {
    sourceFixture: fixture,
    expectedHardening: hardening
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /sourceFixture|source_readiness_lock_ref/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("compact source wiring hardening validation rejects safe-looking descriptor ref swaps after rehash", () => {
  const hardening = BASE_HARDENING;
  const forged = clone(hardening);
  forged.prepared_source_systems[0].aggregate_definition_ref =
    "approved_customer_slug_northstar_workflow_summary";
  forged.prepared_source_systems[0].aggregate_output_ref =
    "approved_customer_slug_northstar_output_summary";
  forged.hardening_hash = compactSourceWiringHardeningHash(forged);

  const validation = validateCompactSourceWiringHardening(forged, {
    sourceFixture: BASE_FIXTURE,
    expectedHardening: hardening
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /aggregate_definition_ref|aggregate_output_ref|sourceFixture/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("compact source wiring hardening validation requires source fixture binding for ready records", () => {
  const hardening = BASE_HARDENING;
  const validation = validateCompactSourceWiringHardening(hardening);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /sourceFixture is required/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("compact source wiring hardening rejects warehouse and dashboard aliases without echo", () => {
  const hardening = buildCompactSourceWiringHardeningFromObject({
    source_fixture: BASE_FIXTURE,
    warehouse_ref: "warehouse:customer_sensitive",
    warehouse_handle: "warehouse_handle_live",
    feature_table: "feature_table_person_level",
    table_ref: "dataset_sensitive.table_sensitive",
    dataset_path: "project_sensitive.dataset_sensitive",
    project_dataset_table: "project_sensitive.dataset_sensitive.table_sensitive",
    dashboard_slug: "dashboard_sensitive",
    workbook_id: "workbook_sensitive",
    looker_dashboard_id: "dashboard_123",
    sigma_workbook: "https://sigma.example/workbook/123",
    connector_run_id: "connector_run_123",
    query_job_id: "bquxjob_456",
    api_run_id: "api_run_789",
    active_connector_ref: "active_connector_live"
  });
  const validation = validateCompactSourceWiringHardening(hardening);
  const serialized = JSON.stringify(hardening);

  assert.equal(hardening.hardening_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validation.valid, false);
  for (const unsafe of [
    "warehouse_handle_live",
    "feature_table_person_level",
    "dataset_sensitive.table_sensitive",
    "project_sensitive.dataset_sensitive",
    "dashboard_sensitive",
    "workbook_sensitive",
    "dashboard_123",
    "sigma.example",
    "connector_run_123",
    "bquxjob_456",
    "api_run_789",
    "active_connector_live"
  ]) {
    assert.equal(serialized.includes(unsafe), false, `${unsafe} must not echo`);
  }
});

test("compact source wiring hardening rejects unsafe supplied boundary plans without echo", () => {
  const hardening = buildCompactSourceWiringHardeningFromObject({
    source_fixture: BASE_FIXTURE,
    boundary_plans: {
      bigquery_export: {
        source_system: "bigquery_export",
        source_category: "warehouse_export",
        boundary_plan_state: "PASSED_AGGREGATE_CONNECTOR_BOUNDARY_PLAN_REVIEW",
        source_owner_role: "customer_data_platform_owner",
        fluencytracr_execution_mode: "no_live_execution",
        aggregate_definition_ref: "select * from raw_rows",
        aggregate_output_ref: "bquxjob_unsafe_override",
        approved_output_fields: ["workflow_family", "employee_email"],
        aggregate_grain: "workflow_function_cohort_window",
        source_quality_posture: {
          k_min_posture: "K_MIN_ALREADY_ENFORCED_UPSTREAM",
          suppression_posture: "SUPPRESSION_ALREADY_ENFORCED_UPSTREAM",
          freshness_state: "CURRENT_FOR_APPROVED_WINDOW",
          legal_trust_review_state: "LEGAL_TRUST_REVIEW_NOT_REQUIRED"
        }
      }
    }
  });
  const validation = validateCompactSourceWiringHardening(hardening);
  const serialized = JSON.stringify(hardening);

  assert.equal(
    hardening.hardening_state,
    "REJECTED_FOR_BOUNDARY_LEAKAGE"
  );
  assert.equal(validation.valid, false);
  for (const unsafe of [
    "select * from raw_rows",
    "bquxjob_unsafe_override",
    "employee_email"
  ]) {
    assert.equal(serialized.includes(unsafe), false, `${unsafe} must not echo`);
  }
});

test("compact source wiring hardening rejects unsafe supplied readiness locks without echo", () => {
  const hardening = buildCompactSourceWiringHardeningFromObject({
    source_fixture: BASE_FIXTURE,
    data_model_spine_readiness_lock: {
      schema_version: "FT_AI_VALUE_DATA_MODEL_SPINE_READINESS_LOCK_2026_06",
      lock_state: "COMPACT_CUSTOMER_DATA_MODEL_SPINE_READY select * from raw_rows",
      lock_hash: "bquxjob_unsafe_lock",
      allowed_next_step: "harden_compact_customer_data_model_for_real_source_wiring",
      series_persistence_state: "HELD_NOT_REQUIRED_FOR_CURRENT_READ_PATH"
    }
  });
  const validation = validateCompactSourceWiringHardening(hardening);
  const serialized = JSON.stringify(hardening);

  assert.equal(
    hardening.hardening_state,
    "REJECTED_FOR_BOUNDARY_LEAKAGE"
  );
  assert.equal(validation.valid, false);
  assert.equal(serialized.includes("select * from raw_rows"), false);
  assert.equal(serialized.includes("bquxjob_unsafe_lock"), false);
});

test("compact source wiring hardening CLI emits non-live hardened posture", () => {
  const output = execFileSync(
    process.execPath,
    ["scripts/run_ai_value_compact_source_wiring_hardening.mjs", FIXTURE_PATH],
    { cwd: process.cwd(), encoding: "utf8" }
  );
  const hardening = JSON.parse(output);
  const expectedHardening = buildCompactSourceWiringHardeningFromObject(
    BASE_FIXTURE,
    {
      generatedAt: hardening.generated_at
    }
  );
  const validation = validateCompactSourceWiringHardening(hardening, {
    sourceFixture: BASE_FIXTURE,
    expectedHardening
  });

  assert.equal(
    hardening.hardening_state,
    "COMPACT_SOURCE_WIRING_HARDENED_NON_LIVE"
  );
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(hardening.feeds.live_bigquery_execution, false);
});
