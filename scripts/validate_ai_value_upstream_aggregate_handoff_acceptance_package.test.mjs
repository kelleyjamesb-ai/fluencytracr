import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildUpstreamAggregateHandoffAcceptancePackageFromObject,
  hashUpstreamAggregateHandoffAcceptancePackage,
  validateUpstreamAggregateHandoffAcceptancePackage
} from "./run_ai_value_upstream_aggregate_handoff_acceptance_package.mjs";
import {
  buildUpstreamAggregatePipelineHandoffFromObject,
  validateUpstreamAggregatePipelineHandoff
} from "./run_ai_value_upstream_aggregate_pipeline_handoff.mjs";

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
  "manifests",
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

function assertPassedPackage(packageRecord, sourceSystem) {
  const validation = validateUpstreamAggregateHandoffAcceptancePackage(packageRecord, {
    sourceFixture: readJson(FIXTURE_PATH)
  });
  const serialized = JSON.stringify(packageRecord);

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(
    packageRecord.acceptance_state,
    "PASSED_UPSTREAM_AGGREGATE_HANDOFF_ACCEPTANCE_PACKAGE"
  );
  assert.equal(packageRecord.source_system, sourceSystem);
  assert.equal(packageRecord.execution_boundary, "approved_glean_or_customer_environment");
  assert.equal(packageRecord.fluencytracr_execution_mode, "no_live_execution");
  assert.equal(
    packageRecord.upstream_handoff_ref.handoff_state,
    "READY_FOR_UPSTREAM_AGGREGATE_HANDOFF_ACCEPTANCE_REVIEW"
  );
  assert.equal(
    packageRecord.upstream_handoff_ref.manifest_package_ref.manifest_validation_state,
    "PASSED_CONTROLLED_AGGREGATE_MANIFEST_VALIDATION"
  );
  assert.equal(
    packageRecord.accepted_refs.source_inventory_manifest_ref.source_system,
    sourceSystem
  );
  assert.equal(packageRecord.accepted_refs.compact_refs_only, true);
  assert.match(packageRecord.acceptance_package_hash, /^[a-f0-9]{64}$/);
  for (const feed of REQUIRED_FALSE_FEEDS) {
    assert.equal(packageRecord.feeds[feed], false, `${feed} must remain false`);
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
    assert.equal(packageRecord.boundary_policy[field], false, `${field} must remain false`);
  }
  for (const key of FORBIDDEN_OUTPUT_KEYS) {
    assert.equal(hasNestedKey(packageRecord, key), false, `${key} must not be emitted`);
  }
  assert.equal(serialized.includes("SELECT"), false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("bquxjob"), false);
}

test("upstream aggregate handoff acceptance package accepts BigQuery compact refs", () => {
  const packageRecord = buildUpstreamAggregateHandoffAcceptancePackageFromObject(
    readJson(FIXTURE_PATH),
    { sourceSystem: "bigquery_export" }
  );

  assertPassedPackage(packageRecord, "bigquery_export");
});

test("upstream aggregate handoff acceptance package accepts Sigma compact refs", () => {
  const packageRecord = buildUpstreamAggregateHandoffAcceptancePackageFromObject(
    readJson(FIXTURE_PATH),
    { sourceSystem: "sigma_export" }
  );

  assertPassedPackage(packageRecord, "sigma_export");
});

test("upstream aggregate handoff validator requires source fixture for ready handoff", () => {
  const handoff = buildUpstreamAggregatePipelineHandoffFromObject(readJson(FIXTURE_PATH));
  const validation = validateUpstreamAggregatePipelineHandoff(handoff);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.includes("sourceFixture is required to validate ready upstream handoff"),
    validation.gaps.join("; ")
  );
});

test("upstream aggregate handoff acceptance package requires source fixture for passed package", () => {
  const packageRecord = buildUpstreamAggregateHandoffAcceptancePackageFromObject(
    readJson(FIXTURE_PATH)
  );
  const validation = validateUpstreamAggregateHandoffAcceptancePackage(packageRecord);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.includes("sourceFixture is required to validate passed acceptance package"),
    validation.gaps.join("; ")
  );
});

test("upstream aggregate handoff acceptance package rejects full manifests, SQL, raw rows, and credentials", () => {
  const packageRecord = buildUpstreamAggregateHandoffAcceptancePackageFromObject(
    readJson(FIXTURE_PATH),
    {
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
    }
  );
  const validation = validateUpstreamAggregateHandoffAcceptancePackage(packageRecord, {
    sourceFixture: readJson(FIXTURE_PATH)
  });
  const serialized = JSON.stringify(packageRecord);

  assert.equal(validation.valid, false);
  assert.equal(packageRecord.acceptance_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(hasNestedKey(packageRecord, "manifests"), false);
  assert.equal(hasNestedKey(packageRecord, "raw_rows"), false);
  assert.equal(hasNestedKey(packageRecord, "query_text"), false);
  assert.equal(serialized.includes("SELECT user_id"), false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("secret://warehouse/key"), false);
});

test("upstream aggregate handoff acceptance package rejects execution, persistence, and customer-output aliases", () => {
  const packageRecord = buildUpstreamAggregateHandoffAcceptancePackageFromObject(
    readJson(FIXTURE_PATH),
    {
      proposalOverrides: {
        durableStorageAuthorized: true,
        manifestPersistencePromoted: true,
        customerSharePackage: true,
        executiveReadoutSnapshot: true,
        notes: "authorize live BigQuery execution and credential access"
      }
    }
  );
  const validation = validateUpstreamAggregateHandoffAcceptancePackage(packageRecord, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  assert.equal(packageRecord.acceptance_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(packageRecord.feeds.live_bigquery_execution, false);
  assert.equal(packageRecord.feeds.manifest_persistence, false);
  assert.equal(packageRecord.boundary_policy.creates_customer_projection, false);
});

test("upstream aggregate handoff acceptance package rejects economic and score-like aliases", () => {
  const packageRecord = buildUpstreamAggregateHandoffAcceptancePackageFromObject(
    readJson(FIXTURE_PATH),
    {
      proposalOverrides: {
        EBITA: "blocked",
        contribution_confidence: 0.9,
        attribution_probability: 0.8,
        value_score: 92
      }
    }
  );
  const validation = validateUpstreamAggregateHandoffAcceptancePackage(packageRecord, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  assert.equal(packageRecord.acceptance_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
});

test("upstream aggregate handoff acceptance package rejects encoded and handle smuggling", () => {
  const packageRecord = buildUpstreamAggregateHandoffAcceptancePackageFromObject(
    readJson(FIXTURE_PATH),
    {
      proposalOverrides: {
        payload_b64: "eyJzZWxlY3QiOiJTRUxFQ1QgdXNlcl9pZCBGUk9NIHJhd19yb3dzIn0",
        encoded_sql: "select%20user_id%20from%20raw_rows",
        dashboard_handle: "sigma_workbook_id:abc123",
        table_handle: "project.dataset.table"
      }
    }
  );
  const validation = validateUpstreamAggregateHandoffAcceptancePackage(packageRecord, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  assert.equal(packageRecord.acceptance_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
});

test("upstream aggregate handoff acceptance package rejects accepted-ref drift even after rehash", () => {
  const packageRecord = buildUpstreamAggregateHandoffAcceptancePackageFromObject(
    readJson(FIXTURE_PATH)
  );
  const tampered = clone(packageRecord);
  tampered.accepted_refs.data_spine_alignment_ref.metric_id = "safe_metric_drift";
  tampered.acceptance_package_hash = hashUpstreamAggregateHandoffAcceptancePackage(tampered);

  const validation = validateUpstreamAggregateHandoffAcceptancePackage(tampered, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("accepted_refs")),
    validation.gaps.join("; ")
  );
});

test("upstream aggregate handoff acceptance package rejects nested compact-ref smuggling after rehash", () => {
  const packageRecord = buildUpstreamAggregateHandoffAcceptancePackageFromObject(
    readJson(FIXTURE_PATH)
  );
  const tampered = clone(packageRecord);
  tampered.accepted_refs.source_inventory_manifest_ref.payload_json = {
    query_text: "SELECT user_id FROM raw_rows"
  };
  tampered.acceptance_package_hash = hashUpstreamAggregateHandoffAcceptancePackage(tampered);

  const validation = validateUpstreamAggregateHandoffAcceptancePackage(tampered, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("accepted_refs.source_inventory_manifest_ref")),
    validation.gaps.join("; ")
  );
});

test("upstream aggregate handoff acceptance package rejects friendly state aliases", () => {
  const packageRecord = buildUpstreamAggregateHandoffAcceptancePackageFromObject(
    readJson(FIXTURE_PATH)
  );
  const tampered = clone(packageRecord);
  tampered.acceptance_state = "APPROVED";
  tampered.upstream_handoff_ref.handoff_state = "ACCEPTED";
  tampered.accepted_refs.source_package_review_queue_posture_ref.queue_state =
    "SOURCE_PACKAGE_CLEARED";
  tampered.validation_summary.acceptance_state = "APPROVED";
  tampered.validation_summary.valid = true;
  tampered.acceptance_package_hash = hashUpstreamAggregateHandoffAcceptancePackage(tampered);

  const validation = validateUpstreamAggregateHandoffAcceptancePackage(tampered, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("acceptance_state")),
    validation.gaps.join("; ")
  );
});

test("upstream aggregate handoff acceptance package holds when upstream handoff is invalid", () => {
  const packageRecord = buildUpstreamAggregateHandoffAcceptancePackageFromObject(
    readJson(FIXTURE_PATH),
    {
      upstreamHandoff: {
        handoff_state: "READY_FOR_UPSTREAM_AGGREGATE_HANDOFF_ACCEPTANCE_REVIEW",
        validation_summary: {
          valid: false,
          gaps: ["stale handoff"]
        }
      }
    }
  );
  const validation = validateUpstreamAggregateHandoffAcceptancePackage(packageRecord, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  assert.equal(
    packageRecord.acceptance_state,
    "HOLD_FOR_VALID_UPSTREAM_AGGREGATE_PIPELINE_HANDOFF"
  );
  assert.equal(packageRecord.feeds.live_bigquery_execution, false);
});

test("upstream aggregate handoff acceptance package does not echo unsafe refs from invalid handoff", () => {
  const handoff = buildUpstreamAggregatePipelineHandoffFromObject(readJson(FIXTURE_PATH));
  const tamperedHandoff = clone(handoff);
  tamperedHandoff.manifest_package_ref.data_spine_alignment_ref.metric_id =
    "SELECT user_id FROM raw_rows";
  tamperedHandoff.manifest_package_ref.source_inventory_manifest_ref.dashboard_handle =
    "sigma_workbook_id:unsafe";

  const packageRecord = buildUpstreamAggregateHandoffAcceptancePackageFromObject(
    readJson(FIXTURE_PATH),
    { upstreamHandoff: tamperedHandoff }
  );
  const validation = validateUpstreamAggregateHandoffAcceptancePackage(packageRecord, {
    sourceFixture: readJson(FIXTURE_PATH)
  });
  const serialized = JSON.stringify(packageRecord);

  assert.equal(validation.valid, false);
  assert.equal(
    packageRecord.acceptance_state,
    "HOLD_FOR_VALID_UPSTREAM_AGGREGATE_PIPELINE_HANDOFF"
  );
  assert.equal(serialized.includes("SELECT user_id"), false);
  assert.equal(serialized.includes("sigma_workbook_id"), false);
  assert.equal(packageRecord.accepted_refs.source_inventory_manifest_ref, null);
  assert.equal(packageRecord.accepted_refs.compact_refs_only, false);
});

test("upstream aggregate handoff acceptance package rejects unsupported source systems", () => {
  const packageRecord = buildUpstreamAggregateHandoffAcceptancePackageFromObject(
    readJson(FIXTURE_PATH),
    { sourceSystem: "bigquery_live" }
  );
  const validation = validateUpstreamAggregateHandoffAcceptancePackage(packageRecord, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  assert.equal(packageRecord.acceptance_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(packageRecord.source_system, "unsupported_source_system");
  assert.equal(packageRecord.feeds.live_bigquery_execution, false);
});

test("upstream aggregate handoff acceptance package validator rejects unsafe copied gap text", () => {
  const packageRecord = buildUpstreamAggregateHandoffAcceptancePackageFromObject(
    readJson(FIXTURE_PATH)
  );
  const tampered = clone(packageRecord);
  tampered.validation_summary.gaps = ["SELECT user_id FROM raw_rows"];
  tampered.acceptance_package_hash = hashUpstreamAggregateHandoffAcceptancePackage(tampered);

  const validation = validateUpstreamAggregateHandoffAcceptancePackage(tampered, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("validation_summary.gaps")),
    validation.gaps.join("; ")
  );
});

test("upstream aggregate handoff acceptance package CLI emits compact package output", () => {
  const output = execFileSync(
    "node",
    [
      "scripts/run_ai_value_upstream_aggregate_handoff_acceptance_package.mjs",
      FIXTURE_PATH
    ],
    { cwd: process.cwd(), encoding: "utf8", timeout: 120000 }
  );
  const parsed = JSON.parse(output);

  assert.equal(
    parsed.acceptance_state,
    "PASSED_UPSTREAM_AGGREGATE_HANDOFF_ACCEPTANCE_PACKAGE"
  );
  assert.equal(parsed.validation_summary.valid, true);
  assert.equal(parsed.feeds.live_bigquery_execution, false);
  assert.equal(parsed.boundary_policy.fluencytracr_executes_queries, false);
  assert.equal(hasNestedKey(parsed, "manifests"), false);
  assert.equal(hasNestedKey(parsed, "raw_rows"), false);
  assert.equal(hasNestedKey(parsed, "payload_json"), false);
});
