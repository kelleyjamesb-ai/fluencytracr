import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildLivePipelineConceptReviewFromObject,
  validateLivePipelineConceptReview
} from "./run_ai_value_live_pipeline_concept_review.mjs";
import {
  buildLivePipelineConceptGateFromObject
} from "./run_ai_value_live_pipeline_concept_gate.mjs";

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
  "connector_run_persistence",
  "pipeline_run_persistence",
  "manifest_persistence",
  "measurement_cell_series_persistence",
  "customer_projection",
  "export_creation",
  "research_model_feed",
  "finance_output",
  "customer_facing_output"
];

const FORBIDDEN_OUTPUT_KEYS = [
  "raw_rows",
  "rows",
  "records",
  "query_text",
  "sql_text",
  "bigquery_sql",
  "sigma_query",
  "credential_ref",
  "secret",
  "prompt",
  "transcript",
  "user_id",
  "employee_id",
  "person_id",
  "email",
  "job_id",
  "project_id",
  "dataset_id",
  "table_id",
  "dashboard_url",
  "source_package_clearance",
  "measurement_cell_series",
  "payload_json",
  "validation_json",
  "source_refs_json",
  "confidence_score",
  "probability",
  "roi",
  "ebitda"
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

function assertPassedReview(review, sourceSystem) {
  const validation = validateLivePipelineConceptReview(review, {
    sourceFixture: readJson(FIXTURE_PATH)
  });
  const serialized = JSON.stringify(review);

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(
    review.review_state,
    "READY_FOR_UPSTREAM_AGGREGATE_PIPELINE_DESIGN"
  );
  assert.equal(review.source_system, sourceSystem);
  assert.equal(review.execution_boundary, "approved_glean_or_customer_environment");
  assert.equal(review.fluencytracr_execution_mode, "no_live_execution");
  assert.equal(
    review.concept_gate_ref.gate_state,
    "READY_FOR_SEPARATE_LIVE_PIPELINE_CONCEPT_REVIEW"
  );
  assert.equal(review.feeds.live_pipeline_concept_review, true);
  assert.equal(review.feeds.upstream_aggregate_pipeline_design_requirements, true);
  assert.equal(review.review_scope.design_only, true);
  for (const field of [
    "live_connector_implementation_authorized",
    "credential_handling_authorized",
    "query_execution_authorized",
    "raw_data_receipt_authorized",
    "durable_pipeline_storage_authorized",
    "customer_output_authorized",
    "research_model_feed_authorized",
    "finance_output_authorized"
  ]) {
    assert.equal(review.review_scope[field], false, `${field} must remain false`);
  }
  for (const feed of REQUIRED_FALSE_FEEDS) {
    assert.equal(review.feeds[feed], false, `${feed} must remain false`);
  }
  for (const field of [
    "fluencytracr_runs_bigquery",
    "fluencytracr_runs_sigma",
    "fluencytracr_runs_glean_query",
    "fluencytracr_runs_customer_connectors",
    "fluencytracr_uses_credentials",
    "fluencytracr_executes_queries",
    "fluencytracr_stores_query_text",
    "fluencytracr_receives_raw_rows",
    "fluencytracr_receives_dashboard_rows",
    "fluencytracr_receives_prompts",
    "fluencytracr_receives_transcripts",
    "fluencytracr_receives_identifiers",
    "persists_connector_run",
    "persists_pipeline_run",
    "persists_manifests",
    "creates_measurement_cell_series",
    "creates_customer_projection",
    "creates_exports",
    "creates_routes",
    "creates_ui",
    "feeds_research_model",
    "emits_probability",
    "computes_roi",
    "emits_finance_output"
  ]) {
    assert.equal(review.boundary_policy[field], false, `${field} must remain false`);
  }
  for (const key of FORBIDDEN_OUTPUT_KEYS) {
    assert.equal(hasNestedKey(review, key), false, `${key} must not be emitted`);
  }
  assert.equal(serialized.includes("SELECT"), false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("bquxjob"), false);
}

test("live pipeline concept review accepts BigQuery only as upstream design requirements", () => {
  const review = buildLivePipelineConceptReviewFromObject(readJson(FIXTURE_PATH), {
    sourceSystem: "bigquery_export"
  });

  assertPassedReview(review, "bigquery_export");
});

test("live pipeline concept review accepts Sigma only as upstream design requirements", () => {
  const review = buildLivePipelineConceptReviewFromObject(readJson(FIXTURE_PATH), {
    sourceSystem: "sigma_export"
  });

  assertPassedReview(review, "sigma_export");
});

test("live pipeline concept review rejects connector implementation, credentials, SQL, and raw rows", () => {
  const review = buildLivePipelineConceptReviewFromObject(readJson(FIXTURE_PATH), {
    sourceSystem: "bigquery_export",
    proposalOverrides: {
      review_scope: {
        live_connector_implementation_authorized: true,
        credential_handling_authorized: true,
        query_execution_authorized: true
      },
      query_text: "SELECT user_id FROM raw_rows",
      raw_rows: [{ employee_email: "person@example.com" }],
      credential_ref: "secret://warehouse/key",
      source_refs_json: {
        job_id: "bquxjob_123"
      }
    }
  });
  const validation = validateLivePipelineConceptReview(review, {
    sourceFixture: readJson(FIXTURE_PATH)
  });
  const serialized = JSON.stringify(review);

  assert.equal(validation.valid, false);
  assert.equal(review.review_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(review.feeds.live_pipeline_concept_review, false);
  assert.equal(review.feeds.upstream_aggregate_pipeline_design_requirements, false);
  assert.equal(review.review_scope.live_connector_implementation_authorized, false);
  assert.equal(review.review_scope.credential_handling_authorized, false);
  assert.equal(review.review_scope.query_execution_authorized, false);
  assert.equal(hasNestedKey(review, "raw_rows"), false);
  assert.equal(hasNestedKey(review, "query_text"), false);
  assert.equal(hasNestedKey(review, "credential_ref"), false);
  assert.equal(serialized.includes("SELECT user_id"), false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("secret://warehouse/key"), false);
});

test("live pipeline concept review rejects boolean-only live aliases instead of sanitizing them ready", () => {
  const review = buildLivePipelineConceptReviewFromObject(readJson(FIXTURE_PATH), {
    sourceSystem: "bigquery_export",
    proposalOverrides: {
      feeds: {
        live_bigquery_execution: true,
        query_execution: true
      },
      boundary_policy: {
        fluencytracr_runs_bigquery: true,
        fluencytracr_executes_queries: true,
        creates_routes: true
      },
      review_scope: {
        raw_data_receipt_authorized: true,
        customer_output_authorized: true
      }
    }
  });
  const validation = validateLivePipelineConceptReview(review, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  assert.equal(review.review_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(review.feeds.live_bigquery_execution, false);
  assert.equal(review.boundary_policy.fluencytracr_runs_bigquery, false);
  assert.equal(review.boundary_policy.fluencytracr_executes_queries, false);
  assert.equal(review.review_scope.raw_data_receipt_authorized, false);
  assert.equal(review.review_scope.customer_output_authorized, false);
});

test("live pipeline concept review rejects free-text live execution intent", () => {
  const review = buildLivePipelineConceptReviewFromObject(readJson(FIXTURE_PATH), {
    sourceSystem: "bigquery_export",
    proposalOverrides: {
      notes: "authorize live BigQuery execution and credential access"
    }
  });
  const validation = validateLivePipelineConceptReview(review, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  assert.equal(review.review_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(review.feeds.live_bigquery_execution, false);
  assert.equal(review.boundary_policy.fluencytracr_uses_credentials, false);
});

test("live pipeline concept review rejects plural credential intent", () => {
  const review = buildLivePipelineConceptReviewFromObject(readJson(FIXTURE_PATH), {
    sourceSystem: "bigquery_export",
    proposalOverrides: {
      notes: "allow credentials and run queries through the warehouse"
    }
  });
  const validation = validateLivePipelineConceptReview(review, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  assert.equal(review.review_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(review.boundary_policy.fluencytracr_uses_credentials, false);
});

test("live pipeline concept review rejects BigQuery execution intent without live keyword", () => {
  const review = buildLivePipelineConceptReviewFromObject(readJson(FIXTURE_PATH), {
    sourceSystem: "bigquery_export",
    proposalOverrides: {
      notes: "allow BigQuery execution"
    }
  });
  const validation = validateLivePipelineConceptReview(review, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  assert.equal(review.review_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(review.boundary_policy.fluencytracr_runs_bigquery, false);
});

test("live pipeline concept review rejects unsafe override keys without echoing them", () => {
  const review = buildLivePipelineConceptReviewFromObject(readJson(FIXTURE_PATH), {
    sourceSystem: "bigquery_export",
    proposalOverrides: {
      "SELECT user_id FROM raw_rows": true
    }
  });
  const validation = validateLivePipelineConceptReview(review, {
    sourceFixture: readJson(FIXTURE_PATH)
  });
  const serialized = JSON.stringify(review);

  assert.equal(validation.valid, false);
  assert.equal(review.review_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(serialized.includes("SELECT user_id"), false);
  assert.equal(serialized.includes("SELECT user_id FROM raw_rows"), false);
  assert.equal(
    review.validation_summary.gaps.some((gap) => gap.includes("SELECT user_id")),
    false
  );
});

test("live pipeline concept review rejects SQL-shaped override keys without raw-row tokens", () => {
  const review = buildLivePipelineConceptReviewFromObject(readJson(FIXTURE_PATH), {
    sourceSystem: "bigquery_export",
    proposalOverrides: {
      "SELECT aggregate_count FROM manifest": true
    }
  });
  const validation = validateLivePipelineConceptReview(review, {
    sourceFixture: readJson(FIXTURE_PATH)
  });
  const serialized = JSON.stringify(review);

  assert.equal(validation.valid, false);
  assert.equal(review.review_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(serialized.includes("SELECT aggregate_count"), false);
});

test("live pipeline concept review holds when the concept gate is not valid", () => {
  const review = buildLivePipelineConceptReviewFromObject(readJson(FIXTURE_PATH), {
    sourceSystem: "bigquery_export",
    gate: {
      gate_state: "READY_FOR_SEPARATE_LIVE_PIPELINE_CONCEPT_REVIEW",
      validation_summary: {
        valid: false,
        gaps: ["stale concept gate"]
      }
    }
  });
  const validation = validateLivePipelineConceptReview(review, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  assert.equal(review.review_state, "HOLD_FOR_VALID_LIVE_PIPELINE_CONCEPT_GATE");
  assert.equal(review.feeds.live_pipeline_concept_review, false);
  assert.equal(review.feeds.upstream_aggregate_pipeline_design_requirements, false);
  assert.equal(review.feeds.live_bigquery_execution, false);
  assert.equal(review.boundary_policy.fluencytracr_runs_bigquery, false);
});

test("live pipeline concept review rejects unsupported source systems", () => {
  const review = buildLivePipelineConceptReviewFromObject(readJson(FIXTURE_PATH), {
    sourceSystem: "bigquery_live"
  });
  const validation = validateLivePipelineConceptReview(review, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  assert.equal(review.review_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(review.source_system, "unsupported_source_system");
  assert.equal(review.feeds.live_pipeline_concept_review, false);
  assert.equal(review.feeds.upstream_aggregate_pipeline_design_requirements, false);
  assert.equal(review.feeds.live_bigquery_execution, false);
});

test("live pipeline concept review validator rejects hand-edited gate refs", () => {
  const review = buildLivePipelineConceptReviewFromObject(readJson(FIXTURE_PATH));
  const tampered = clone(review);
  tampered.concept_gate_ref.aggregate_source_export_ref =
    "bigquery_export_other_safe_ref";

  const validation = validateLivePipelineConceptReview(tampered, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("concept_gate_ref")),
    validation.gaps.join("; ")
  );
});

test("live pipeline concept review validator rejects unsafe copied validation gap text", () => {
  const review = buildLivePipelineConceptReviewFromObject(readJson(FIXTURE_PATH));
  const tampered = clone(review);
  tampered.validation_summary.gaps = ["SELECT user_id FROM raw_rows"];

  const validation = validateLivePipelineConceptReview(tampered, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("validation_summary.gaps")),
    validation.gaps.join("; ")
  );
});

test("live pipeline concept review validator rejects unsafe metadata text", () => {
  const review = buildLivePipelineConceptReviewFromObject(readJson(FIXTURE_PATH));
  const tampered = clone(review);
  tampered.source_owner_role = "person@example.com SELECT user_id FROM raw_rows";

  const validation = validateLivePipelineConceptReview(tampered, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("source_owner_role")),
    validation.gaps.join("; ")
  );
});

test("live pipeline concept review rejects a gate for the wrong source system", () => {
  const sigmaGate = buildLivePipelineConceptGateFromObject(readJson(FIXTURE_PATH), {
    sourceSystem: "sigma_export"
  });
  const review = buildLivePipelineConceptReviewFromObject(readJson(FIXTURE_PATH), {
    sourceSystem: "bigquery_export",
    gate: sigmaGate
  });
  const validation = validateLivePipelineConceptReview(review, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  assert.equal(review.review_state, "HOLD_FOR_VALID_LIVE_PIPELINE_CONCEPT_GATE");
});

test("live pipeline concept review CLI emits compact design-only output", () => {
  const output = execFileSync(
    "node",
    ["scripts/run_ai_value_live_pipeline_concept_review.mjs", FIXTURE_PATH],
    { cwd: process.cwd(), encoding: "utf8" }
  );
  const parsed = JSON.parse(output);

  assert.equal(
    parsed.review_state,
    "READY_FOR_UPSTREAM_AGGREGATE_PIPELINE_DESIGN"
  );
  assert.equal(parsed.validation_summary.valid, true);
  assert.equal(parsed.feeds.live_bigquery_execution, false);
  assert.equal(parsed.boundary_policy.fluencytracr_executes_queries, false);
  assert.equal(parsed.review_scope.design_only, true);
  assert.equal(hasNestedKey(parsed, "raw_rows"), false);
  assert.equal(hasNestedKey(parsed, "payload_json"), false);
});
