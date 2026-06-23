import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildBigQueryAggregateExportReviewFromObject,
  validateBigQueryAggregateExportReview
} from "./run_ai_value_bigquery_aggregate_export_review.mjs";

const FIXTURE_PATH =
  "docs/contracts/ai-value-real-data-intake-packet-runner/examples/controlled-aggregate-fixture-review-ready.json";

const REQUIRED_FALSE_FEEDS = [
  "live_bigquery_execution",
  "live_sigma_execution",
  "live_glean_query",
  "customer_connector_execution",
  "credential_access",
  "query_execution",
  "raw_row_ingestion",
  "dashboard_row_ingestion",
  "bigquery_job_metadata_ingestion",
  "project_dataset_table_ref_ingestion",
  "durable_bigquery_export_review_storage",
  "durable_connector_run_storage",
  "durable_pipeline_run_storage",
  "durable_manifest_storage",
  "source_package_clearance",
  "measurement_cell_creation",
  "measurement_cell_snapshot",
  "measurement_cell_series_snapshot",
  "evidence_continuity_snapshot",
  "claim_readiness_snapshot",
  "executive_readout_snapshot",
  "api_export",
  "customer_share_package",
  "finance_context_investigation",
  "research_model_feed",
  "customer_facing_output",
  "customer_facing_financial_output",
  "customer_facing_economic_output"
];

const FORBIDDEN_OUTPUT_KEYS = [
  "raw_rows",
  "rows",
  "records",
  "events",
  "dashboard_rows",
  "query_text",
  "sql_text",
  "bigquery_sql",
  "query_plan",
  "referenced_tables",
  "destination_table",
  "total_bytes_processed",
  "bytes_processed",
  "slot_ms",
  "job_id",
  "query_id",
  "project_id",
  "dataset_id",
  "table_id",
  "credential_ref",
  "secret",
  "prompt",
  "transcript",
  "user_id",
  "employee_id",
  "person_id",
  "email",
  "source_packages",
  "measurement_cell_ref",
  "measurement_cell",
  "measurement_cell_series",
  "payload_json",
  "validation_json",
  "source_refs_json",
  "blueprint_path_binding_json"
];

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const clone = (value) => JSON.parse(JSON.stringify(value));

function hasNestedKey(value, key) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => hasNestedKey(item, key));
  return Object.entries(value).some(
    ([nestedKey, nestedValue]) => nestedKey === key || hasNestedKey(nestedValue, key)
  );
}

function assertPassedReview(review) {
  const validation = validateBigQueryAggregateExportReview(review, {
    sourceFixture: readJson(FIXTURE_PATH)
  });
  const serialized = JSON.stringify(review);

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(review.review_state, "PASSED_BIGQUERY_AGGREGATE_EXPORT_REVIEW");
  assert.equal(review.source_system, "bigquery_export");
  assert.equal(review.source_owner_role, "customer_data_platform_owner");
  assert.equal(
    review.execution_boundary,
    "approved_glean_or_customer_bigquery_environment"
  );
  assert.equal(review.fluencytracr_execution_mode, "no_live_execution");
  assert.equal(
    review.bigquery_review_attestation.dry_run_attestation_state,
    "UPSTREAM_DRY_RUN_ATTESTED"
  );
  assert.equal(review.bigquery_review_attestation.query_text_retained, false);
  assert.equal(review.bigquery_review_attestation.job_metadata_retained, false);
  assert.equal(
    review.bigquery_review_attestation.project_dataset_table_refs_retained,
    false
  );
  assert.equal(review.bigquery_review_attestation.raw_rows_retained, false);
  assert.equal(
    review.bigquery_review_attestation.cost_review_posture,
    "UPSTREAM_DRY_RUN_REVIEWED_NOT_RETAINED"
  );
  assert.equal(review.feeds.bigquery_aggregate_export_review, true);
  assert.equal(review.feeds.aggregate_connector_boundary_plan_reference, true);
  assert.match(
    review.connector_boundary_plan_ref.boundary_plan_hash,
    /^[a-f0-9]{64}$/
  );
  for (const feed of REQUIRED_FALSE_FEEDS) {
    assert.equal(review.feeds[feed], false, `${feed} must remain false`);
  }
  for (const field of [
    "fluencytracr_runs_bigquery",
    "fluencytracr_uses_credentials",
    "fluencytracr_executes_queries",
    "fluencytracr_stores_query_text",
    "fluencytracr_receives_raw_rows",
    "fluencytracr_receives_bigquery_job_metadata",
    "fluencytracr_receives_project_dataset_table_refs",
    "persists_bigquery_export_review",
    "persists_pipeline_run",
    "persists_controlled_manifests",
    "creates_source_package",
    "creates_measurement_cell",
    "creates_measurement_cell_series",
    "feeds_research_model",
    "emits_probability",
    "computes_roi",
    "emits_customer_facing_output"
  ]) {
    assert.equal(review.boundary_policy[field], false, `${field} must remain false`);
  }
  for (const key of FORBIDDEN_OUTPUT_KEYS) {
    assert.equal(hasNestedKey(review, key), false, `${key} must not be emitted`);
  }
  assert.equal(serialized.includes("SELECT"), false);
  assert.equal(serialized.includes("bquxjob_"), false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("scio-apps"), false);
  assert.equal(serialized.includes("scrubbed_agentspan"), false);
}

test("BigQuery aggregate export review accepts saved aggregate BigQuery fixtures", () => {
  const review = buildBigQueryAggregateExportReviewFromObject(
    readJson(FIXTURE_PATH)
  );

  assertPassedReview(review);
});

test("BigQuery aggregate export review blocks Sigma source-system attempts", () => {
  const review = buildBigQueryAggregateExportReviewFromObject(
    readJson(FIXTURE_PATH),
    { sourceSystem: "sigma_export" }
  );
  const validation = validateBigQueryAggregateExportReview(review, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(review.review_state, "BLOCKED");
  assert.equal(validation.valid, false);
  assert.equal(review.source_system, "bigquery_export");
  assert.equal(review.aggregate_definition_ref, null);
  assert.equal(review.aggregate_output_ref, null);
  assert.equal(review.source_alignment, null);
  for (const feed of REQUIRED_FALSE_FEEDS) {
    assert.equal(review.feeds[feed], false, `${feed} must remain false`);
  }
});

test("BigQuery aggregate export review blocks query text, jobs, table refs, credentials, and raw rows", () => {
  const review = buildBigQueryAggregateExportReviewFromObject(
    readJson(FIXTURE_PATH),
    {
      reviewOverrides: {
        bigquery_review_attestation: {
          dry_run_attestation_ref: "bquxjob_123456789",
          job_metadata_retained: true,
          project_dataset_table_refs_retained: true,
          query_text_retained: true
        },
        aggregate_definition_ref: "SELECT user_id FROM scrubbed_agentspan_raw_rows",
        aggregate_output_ref: "scio_apps.scrubbed_agentspan.action_runs_v2",
        query_plan: {
          referenced_tables: ["scio-apps.glean.scrubbed_agentspan_20260622"]
        },
        total_bytes_processed: 12345,
        raw_rows: [{ employee_email: "person@example.com" }],
        credential_ref: "secret://bigquery/key"
      }
    }
  );
  const validation = validateBigQueryAggregateExportReview(review, {
    sourceFixture: readJson(FIXTURE_PATH)
  });
  const serialized = JSON.stringify(review);

  assert.equal(review.review_state, "BLOCKED");
  assert.equal(validation.valid, false);
  assert.equal(review.bigquery_review_attestation, null);
  assert.equal(review.aggregate_definition_ref, null);
  assert.equal(review.aggregate_output_ref, null);
  assert.equal(review.connector_boundary_plan_ref, null);
  assert.equal(hasNestedKey(review, "raw_rows"), false);
  assert.equal(hasNestedKey(review, "query_plan"), false);
  assert.equal(hasNestedKey(review, "total_bytes_processed"), false);
  assert.equal(hasNestedKey(review, "credential_ref"), false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("SELECT user_id"), false);
  assert.equal(serialized.includes("bquxjob_123456789"), false);
  assert.equal(serialized.includes("secret://bigquery/key"), false);
  assert.equal(JSON.stringify(validation.gaps).includes("person@example.com"), false);
  assert.equal(JSON.stringify(validation.gaps).includes("SELECT user_id"), false);
});

test("BigQuery aggregate export review builder blocks safe-looking source drift", () => {
  const review = buildBigQueryAggregateExportReviewFromObject(
    readJson(FIXTURE_PATH),
    {
      reviewOverrides: {
        source_alignment: {
          org_id: "org_other_safe"
        }
      }
    }
  );
  const validation = validateBigQueryAggregateExportReview(review, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(review.review_state, "BLOCKED");
  assert.equal(review.source_alignment, null);
  assert.equal(review.connector_boundary_plan_ref, null);
  assert.equal(validation.valid, false);
  assert.ok(
    review.validation_summary.gaps.some((gap) =>
      gap.includes("recomputed saved-fixture review")
    ),
    review.validation_summary.gaps.join("; ")
  );
});

test("BigQuery aggregate export review rejects retained BigQuery job metadata flags", () => {
  const review = buildBigQueryAggregateExportReviewFromObject(
    readJson(FIXTURE_PATH),
    {
      reviewOverrides: {
        bigquery_review_attestation: {
          job_metadata_retained: true,
          cost_review_posture: "TOTAL_BYTES_PROCESSED_RETAINED"
        }
      }
    }
  );
  const validation = validateBigQueryAggregateExportReview(review, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(review.review_state, "BLOCKED");
  assert.equal(validation.valid, false);
  assert.equal(review.bigquery_review_attestation, null);
  assert.ok(validation.gaps.length > 0);
});

test("BigQuery aggregate export review catches hand-edited passed packages", () => {
  const review = buildBigQueryAggregateExportReviewFromObject(
    readJson(FIXTURE_PATH)
  );
  const tampered = clone(review);
  tampered.aggregate_output_ref = "reviewed_aggregate_output_bigquery_export_other_metric";
  tampered.source_alignment.metric_id = "first_contact_resolution";
  tampered.validation_summary.valid = true;

  const validation = validateBigQueryAggregateExportReview(tampered, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("recomputed saved-fixture")),
    validation.gaps.join("; ")
  );
});

test("BigQuery aggregate export review requires source fixture for passed validation", () => {
  const review = buildBigQueryAggregateExportReviewFromObject(
    readJson(FIXTURE_PATH)
  );
  const validation = validateBigQueryAggregateExportReview(review);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("sourceFixture is required")),
    validation.gaps.join("; ")
  );
});

test("BigQuery aggregate export review rejects validation-summary smuggling", () => {
  const review = buildBigQueryAggregateExportReviewFromObject(
    readJson(FIXTURE_PATH)
  );
  const tampered = clone(review);
  tampered.validation_summary.gaps = [
    "SELECT user_id FROM raw_rows",
    "person@example.com",
    "bquxjob_123456789",
    "confidence_score=0.91"
  ];

  const validation = validateBigQueryAggregateExportReview(tampered, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("validation_summary.gaps")),
    validation.gaps.join("; ")
  );
  assert.equal(JSON.stringify(validation.gaps).includes("person@example.com"), false);
  assert.equal(JSON.stringify(validation.gaps).includes("SELECT user_id"), false);
});

test("BigQuery aggregate export review CLI emits compact non-live output", () => {
  const output = execFileSync(
    process.execPath,
    [
      "scripts/run_ai_value_bigquery_aggregate_export_review.mjs",
      FIXTURE_PATH
    ],
    { encoding: "utf8" }
  );
  const parsed = JSON.parse(output);

  assert.equal(parsed.review_state, "PASSED_BIGQUERY_AGGREGATE_EXPORT_REVIEW");
  assert.equal(parsed.source_system, "bigquery_export");
  assert.equal(parsed.validation_summary.valid, true);
  assert.equal(parsed.feeds.live_bigquery_execution, false);
  assert.equal(parsed.feeds.durable_bigquery_export_review_storage, false);
  assert.equal(parsed.feeds.measurement_cell_series_snapshot, false);
  assert.equal(parsed.boundary_policy.fluencytracr_runs_bigquery, false);
  assert.equal(parsed.boundary_policy.persists_bigquery_export_review, false);
  assert.equal(hasNestedKey(parsed, "raw_rows"), false);
});
