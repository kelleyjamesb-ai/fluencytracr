import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildUpstreamAggregatePipelineHandoffFromObject,
  validateUpstreamAggregatePipelineHandoff
} from "./run_ai_value_upstream_aggregate_pipeline_handoff.mjs";
import {
  buildLivePipelineConceptReviewFromObject
} from "./run_ai_value_live_pipeline_concept_review.mjs";

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
  "manifests",
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

function reviewHashForTest(review) {
  return createHash("sha256")
    .update(JSON.stringify({
      schema_version: review.schema_version,
      review_id: review.review_id,
      review_state: review.review_state,
      source_system: review.source_system,
      execution_boundary: review.execution_boundary,
      fluencytracr_execution_mode: review.fluencytracr_execution_mode,
      concept_gate_ref: review.concept_gate_ref,
      review_scope: review.review_scope,
      upstream_execution_requirements: review.upstream_execution_requirements,
      package_acceptance_requirements: review.package_acceptance_requirements,
      feeds: review.feeds,
      boundary_policy: review.boundary_policy,
      blocked_uses: review.blocked_uses,
      required_caveats: review.required_caveats
    }))
    .digest("hex");
}

function hasNestedKey(value, key) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => hasNestedKey(item, key));
  return Object.entries(value).some(
    ([nestedKey, nestedValue]) => nestedKey === key || hasNestedKey(nestedValue, key)
  );
}

function assertPassedHandoff(handoff, sourceSystem) {
  const validation = validateUpstreamAggregatePipelineHandoff(handoff, {
    sourceFixture: readJson(FIXTURE_PATH)
  });
  const serialized = JSON.stringify(handoff);

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(
    handoff.handoff_state,
    "READY_FOR_UPSTREAM_AGGREGATE_HANDOFF_ACCEPTANCE_REVIEW"
  );
  assert.equal(handoff.source_system, sourceSystem);
  assert.equal(handoff.execution_boundary, "approved_glean_or_customer_environment");
  assert.equal(handoff.fluencytracr_execution_mode, "no_live_execution");
  assert.equal(
    handoff.concept_review_ref.review_state,
    "READY_FOR_UPSTREAM_AGGREGATE_PIPELINE_DESIGN"
  );
  assert.equal(
    handoff.manifest_package_ref.manifest_validation_state,
    "PASSED_CONTROLLED_AGGREGATE_MANIFEST_VALIDATION"
  );
  assert.equal(handoff.feeds.upstream_aggregate_handoff_acceptance_review, true);
  assert.equal(handoff.feeds.reviewed_manifest_ref_package, true);
  assert.equal(
    handoff.manifest_package_ref.source_inventory_manifest_ref.source_system,
    sourceSystem
  );
  assert.equal(
    handoff.manifest_package_ref.aggregate_extraction_manifest_ref.source_system,
    sourceSystem
  );
  assert.equal(
    handoff.manifest_package_ref.pipeline_run_review_manifest_ref.source_system,
    sourceSystem
  );
  assert.match(
    handoff.manifest_package_ref.source_inventory_manifest_ref.manifest_hash,
    /^[a-f0-9]{64}$/
  );
  assert.match(
    handoff.manifest_package_ref.aggregate_extraction_manifest_ref.manifest_hash,
    /^[a-f0-9]{64}$/
  );
  assert.match(
    handoff.manifest_package_ref.pipeline_run_review_manifest_ref.manifest_hash,
    /^[a-f0-9]{64}$/
  );
  for (const feed of REQUIRED_FALSE_FEEDS) {
    assert.equal(handoff.feeds[feed], false, `${feed} must remain false`);
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
    assert.equal(handoff.boundary_policy[field], false, `${field} must remain false`);
  }
  for (const key of FORBIDDEN_OUTPUT_KEYS) {
    assert.equal(hasNestedKey(handoff, key), false, `${key} must not be emitted`);
  }
  assert.equal(serialized.includes("SELECT"), false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("bquxjob"), false);
}

test("upstream aggregate pipeline handoff accepts BigQuery compact manifest refs", () => {
  const handoff = buildUpstreamAggregatePipelineHandoffFromObject(readJson(FIXTURE_PATH), {
    sourceSystem: "bigquery_export"
  });

  assertPassedHandoff(handoff, "bigquery_export");
});

test("upstream aggregate pipeline handoff accepts Sigma compact manifest refs", () => {
  const handoff = buildUpstreamAggregatePipelineHandoffFromObject(readJson(FIXTURE_PATH), {
    sourceSystem: "sigma_export"
  });

  assertPassedHandoff(handoff, "sigma_export");
});

test("upstream aggregate pipeline handoff rejects live execution, credentials, SQL, raw rows, and full manifests", () => {
  const handoff = buildUpstreamAggregatePipelineHandoffFromObject(readJson(FIXTURE_PATH), {
    sourceSystem: "bigquery_export",
    proposalOverrides: {
      manifests: {
        source_inventory_manifest: {
          raw_rows: [{ user_id: "user_123" }]
        }
      },
      query_text: "SELECT user_id FROM raw_rows",
      raw_rows: [{ employee_email: "person@example.com" }],
      credential_ref: "secret://warehouse/key",
      source_refs_json: {
        job_id: "bquxjob_123"
      }
    }
  });
  const validation = validateUpstreamAggregatePipelineHandoff(handoff, {
    sourceFixture: readJson(FIXTURE_PATH)
  });
  const serialized = JSON.stringify(handoff);

  assert.equal(validation.valid, false);
  assert.equal(handoff.handoff_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(hasNestedKey(handoff, "manifests"), false);
  assert.equal(hasNestedKey(handoff, "raw_rows"), false);
  assert.equal(hasNestedKey(handoff, "query_text"), false);
  assert.equal(hasNestedKey(handoff, "credential_ref"), false);
  assert.equal(serialized.includes("SELECT user_id"), false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("secret://warehouse/key"), false);
});

test("upstream aggregate pipeline handoff rejects boolean-only live aliases instead of sanitizing them ready", () => {
  const handoff = buildUpstreamAggregatePipelineHandoffFromObject(readJson(FIXTURE_PATH), {
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
  const validation = validateUpstreamAggregatePipelineHandoff(handoff, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  assert.equal(handoff.handoff_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(handoff.feeds.upstream_aggregate_handoff_acceptance_review, false);
  assert.equal(handoff.feeds.reviewed_manifest_ref_package, false);
  assert.equal(handoff.feeds.live_bigquery_execution, false);
  assert.equal(handoff.boundary_policy.fluencytracr_runs_bigquery, false);
  assert.equal(handoff.boundary_policy.fluencytracr_executes_queries, false);
});

test("upstream aggregate pipeline handoff rejects free-text live execution intent", () => {
  const handoff = buildUpstreamAggregatePipelineHandoffFromObject(readJson(FIXTURE_PATH), {
    sourceSystem: "bigquery_export",
    proposalOverrides: {
      notes: "authorize live BigQuery execution and credential access"
    }
  });
  const validation = validateUpstreamAggregatePipelineHandoff(handoff, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  assert.equal(handoff.handoff_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(handoff.feeds.live_bigquery_execution, false);
  assert.equal(handoff.boundary_policy.fluencytracr_uses_credentials, false);
});

test("upstream aggregate pipeline handoff rejects plural credential intent", () => {
  const handoff = buildUpstreamAggregatePipelineHandoffFromObject(readJson(FIXTURE_PATH), {
    sourceSystem: "bigquery_export",
    proposalOverrides: {
      notes: "allow credentials and run queries through the warehouse"
    }
  });
  const validation = validateUpstreamAggregatePipelineHandoff(handoff, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  assert.equal(handoff.handoff_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(handoff.boundary_policy.fluencytracr_uses_credentials, false);
});

test("upstream aggregate pipeline handoff rejects BigQuery execution intent without live keyword", () => {
  const handoff = buildUpstreamAggregatePipelineHandoffFromObject(readJson(FIXTURE_PATH), {
    sourceSystem: "bigquery_export",
    proposalOverrides: {
      notes: "allow BigQuery execution"
    }
  });
  const validation = validateUpstreamAggregatePipelineHandoff(handoff, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  assert.equal(handoff.handoff_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(handoff.boundary_policy.fluencytracr_runs_bigquery, false);
});

test("upstream aggregate pipeline handoff rejects unsafe override keys without echoing them", () => {
  const handoff = buildUpstreamAggregatePipelineHandoffFromObject(readJson(FIXTURE_PATH), {
    sourceSystem: "bigquery_export",
    proposalOverrides: {
      "SELECT user_id FROM raw_rows": true
    }
  });
  const validation = validateUpstreamAggregatePipelineHandoff(handoff, {
    sourceFixture: readJson(FIXTURE_PATH)
  });
  const serialized = JSON.stringify(handoff);

  assert.equal(validation.valid, false);
  assert.equal(handoff.handoff_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(serialized.includes("SELECT user_id"), false);
  assert.equal(serialized.includes("SELECT user_id FROM raw_rows"), false);
  assert.equal(
    handoff.validation_summary.gaps.some((gap) => gap.includes("SELECT user_id")),
    false
  );
});

test("upstream aggregate pipeline handoff rejects SQL-shaped override keys without raw-row tokens", () => {
  const handoff = buildUpstreamAggregatePipelineHandoffFromObject(readJson(FIXTURE_PATH), {
    sourceSystem: "bigquery_export",
    proposalOverrides: {
      "SELECT aggregate_count FROM manifest": true
    }
  });
  const validation = validateUpstreamAggregatePipelineHandoff(handoff, {
    sourceFixture: readJson(FIXTURE_PATH)
  });
  const serialized = JSON.stringify(handoff);

  assert.equal(validation.valid, false);
  assert.equal(handoff.handoff_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(serialized.includes("SELECT aggregate_count"), false);
});

test("upstream aggregate pipeline handoff rejects encoded and handle smuggling", () => {
  const handoff = buildUpstreamAggregatePipelineHandoffFromObject(readJson(FIXTURE_PATH), {
    sourceSystem: "bigquery_export",
    proposalOverrides: {
      payload_b64: "opaque_encoded_payload_ref",
      dashboard_handle: "dashboard_handle_ref",
      table_handle: "table_handle_ref",
      workbook_id: "workbook_ref"
    }
  });
  const validation = validateUpstreamAggregatePipelineHandoff(handoff, {
    sourceFixture: readJson(FIXTURE_PATH)
  });
  const serialized = JSON.stringify(handoff);

  assert.equal(validation.valid, false);
  assert.equal(handoff.handoff_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(serialized.includes("opaque_encoded_payload_ref"), false);
  assert.equal(serialized.includes("dashboard_handle_ref"), false);
  assert.equal(serialized.includes("table_handle_ref"), false);
  assert.equal(serialized.includes("workbook_ref"), false);
});

test("upstream aggregate pipeline handoff rejects value-only handle and package persistence smuggling", () => {
  for (const unsafeValue of [
    "workbook_id wb123",
    "api_handle api123",
    "table_handle tbl123",
    "full package JSON should be stored",
    "project.dataset.table",
    "full package should be stored",
    "acceptance package should be stored",
    "upstream handoff package should be stored",
    "full manifest should be stored",
    "manifest package should be stored",
    "store accepted refs as JSON",
    "persist accepted refs",
    "durable acceptance record"
  ]) {
    const handoff = buildUpstreamAggregatePipelineHandoffFromObject(readJson(FIXTURE_PATH), {
      sourceSystem: "bigquery_export",
      proposalOverrides: {
        notes: unsafeValue
      }
    });
    const validation = validateUpstreamAggregatePipelineHandoff(handoff, {
      sourceFixture: readJson(FIXTURE_PATH)
    });
    const serialized = JSON.stringify(handoff);

    assert.equal(validation.valid, false, unsafeValue);
    assert.equal(handoff.handoff_state, "REJECTED_FOR_BOUNDARY_LEAKAGE", unsafeValue);
    assert.equal(serialized.includes(unsafeValue), false, unsafeValue);
  }
});

test("upstream aggregate pipeline handoff holds when concept review is not valid", () => {
  const handoff = buildUpstreamAggregatePipelineHandoffFromObject(readJson(FIXTURE_PATH), {
    sourceSystem: "bigquery_export",
    conceptReview: {
      review_state: "READY_FOR_UPSTREAM_AGGREGATE_PIPELINE_DESIGN",
      validation_summary: {
        valid: false,
        gaps: ["stale concept review"]
      }
    }
  });
  const validation = validateUpstreamAggregatePipelineHandoff(handoff, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  assert.equal(handoff.handoff_state, "HOLD_FOR_VALID_LIVE_PIPELINE_CONCEPT_REVIEW");
  assert.equal(handoff.feeds.upstream_aggregate_handoff_acceptance_review, false);
  assert.equal(handoff.feeds.reviewed_manifest_ref_package, false);
  assert.equal(handoff.feeds.live_bigquery_execution, false);
  assert.equal(handoff.boundary_policy.fluencytracr_runs_bigquery, false);
});

test("upstream aggregate pipeline handoff validator rejects non-ready positive feeds", () => {
  const handoff = buildUpstreamAggregatePipelineHandoffFromObject(readJson(FIXTURE_PATH), {
    sourceSystem: "bigquery_export",
    conceptReview: {
      review_state: "READY_FOR_UPSTREAM_AGGREGATE_PIPELINE_DESIGN",
      validation_summary: {
        valid: false,
        gaps: ["stale concept review"]
      }
    }
  });
  const tampered = clone(handoff);
  tampered.feeds.upstream_aggregate_handoff_acceptance_review = true;
  tampered.feeds.reviewed_manifest_ref_package = true;

  const validation = validateUpstreamAggregatePipelineHandoff(tampered, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("must remain false unless")),
    validation.gaps.join("; ")
  );
});

test("upstream aggregate pipeline handoff rejects unsupported source systems", () => {
  const handoff = buildUpstreamAggregatePipelineHandoffFromObject(readJson(FIXTURE_PATH), {
    sourceSystem: "bigquery_live"
  });
  const validation = validateUpstreamAggregatePipelineHandoff(handoff, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  assert.equal(handoff.handoff_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(handoff.source_system, "unsupported_source_system");
  assert.equal(handoff.feeds.live_bigquery_execution, false);
});

test("upstream aggregate pipeline handoff validator rejects manifest ref drift", () => {
  const handoff = buildUpstreamAggregatePipelineHandoffFromObject(readJson(FIXTURE_PATH));
  const tampered = clone(handoff);
  tampered.manifest_package_ref.pipeline_run_review_manifest_ref.manifest_hash =
    "a".repeat(64);

  const validation = validateUpstreamAggregatePipelineHandoff(tampered, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("manifest_package_ref")),
    validation.gaps.join("; ")
  );
});

test("upstream aggregate pipeline handoff validator rejects unsafe copied validation gap text", () => {
  const handoff = buildUpstreamAggregatePipelineHandoffFromObject(readJson(FIXTURE_PATH));
  const tampered = clone(handoff);
  tampered.validation_summary.gaps = ["SELECT user_id FROM raw_rows"];

  const validation = validateUpstreamAggregatePipelineHandoff(tampered, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("validation_summary.gaps")),
    validation.gaps.join("; ")
  );
});

test("upstream aggregate pipeline handoff validator rejects unsafe metadata text", () => {
  const handoff = buildUpstreamAggregatePipelineHandoffFromObject(readJson(FIXTURE_PATH));
  const tampered = clone(handoff);
  tampered.generated_at = "SELECT user_id FROM raw_rows";

  const validation = validateUpstreamAggregatePipelineHandoff(tampered, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("generated_at")),
    validation.gaps.join("; ")
  );
});

test("upstream aggregate pipeline handoff builder holds self-rehashed concept review drift", () => {
  const conceptReview = buildLivePipelineConceptReviewFromObject(readJson(FIXTURE_PATH));
  const tamperedReview = clone(conceptReview);
  tamperedReview.concept_gate_ref.aggregate_source_export_ref =
    "bigquery_export_other_safe_ref";
  tamperedReview.review_hash = reviewHashForTest(tamperedReview);

  const handoff = buildUpstreamAggregatePipelineHandoffFromObject(readJson(FIXTURE_PATH), {
    sourceSystem: "bigquery_export",
    conceptReview: tamperedReview
  });
  const validation = validateUpstreamAggregatePipelineHandoff(handoff, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(handoff.handoff_state, "HOLD_FOR_VALID_LIVE_PIPELINE_CONCEPT_REVIEW");
  assert.equal(validation.valid, false);
});

test("upstream aggregate pipeline handoff rejects a concept review for the wrong source system", () => {
  const sigmaReview = buildLivePipelineConceptReviewFromObject(readJson(FIXTURE_PATH), {
    sourceSystem: "sigma_export"
  });
  const handoff = buildUpstreamAggregatePipelineHandoffFromObject(readJson(FIXTURE_PATH), {
    sourceSystem: "bigquery_export",
    conceptReview: sigmaReview
  });
  const validation = validateUpstreamAggregatePipelineHandoff(handoff, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  assert.equal(handoff.handoff_state, "HOLD_FOR_VALID_LIVE_PIPELINE_CONCEPT_REVIEW");
});

test("upstream aggregate pipeline handoff CLI emits compact acceptance-review output", () => {
  const output = execFileSync(
    "node",
    ["scripts/run_ai_value_upstream_aggregate_pipeline_handoff.mjs", FIXTURE_PATH],
    { cwd: process.cwd(), encoding: "utf8" }
  );
  const parsed = JSON.parse(output);

  assert.equal(
    parsed.handoff_state,
    "READY_FOR_UPSTREAM_AGGREGATE_HANDOFF_ACCEPTANCE_REVIEW"
  );
  assert.equal(parsed.validation_summary.valid, true);
  assert.equal(parsed.feeds.live_bigquery_execution, false);
  assert.equal(parsed.boundary_policy.fluencytracr_executes_queries, false);
  assert.equal(hasNestedKey(parsed, "manifests"), false);
  assert.equal(hasNestedKey(parsed, "raw_rows"), false);
  assert.equal(hasNestedKey(parsed, "payload_json"), false);
});
