import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildControlledAggregateManifestValidationPackageFromObject,
  validateControlledAggregateManifestValidationPackage
} from "./run_ai_value_controlled_aggregate_manifest_validation.mjs";

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
  "query_text",
  "sql_text",
  "bigquery_sql",
  "sigma_query",
  "credential_ref",
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

function assertPassedPackage(manifestPackage, sourceSystem) {
  const validation = validateControlledAggregateManifestValidationPackage(
    manifestPackage,
    { sourceFixture: readJson(FIXTURE_PATH) }
  );
  const serialized = JSON.stringify(manifestPackage);

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(
    manifestPackage.manifest_validation_state,
    "PASSED_CONTROLLED_AGGREGATE_MANIFEST_VALIDATION"
  );
  assert.equal(manifestPackage.source_system, sourceSystem);
  assert.equal(manifestPackage.validation_summary.valid, true);
  assert.equal(manifestPackage.validation_summary.connector_adapter_valid, true);
  assert.equal(manifestPackage.validation_summary.source_inventory_manifest_valid, true);
  assert.equal(manifestPackage.validation_summary.aggregate_extraction_manifest_valid, true);
  assert.equal(manifestPackage.validation_summary.pipeline_run_review_manifest_valid, true);
  assert.equal(manifestPackage.validation_summary.manifest_chain_valid, true);
  assert.equal(manifestPackage.feeds.controlled_aggregate_manifest_validation, true);
  assert.equal(manifestPackage.feeds.manual_operator_promotion_review, true);
  assert.equal(
    manifestPackage.manifests.source_inventory_manifest.source_system,
    sourceSystem
  );
  assert.equal(
    manifestPackage.manifests.aggregate_extraction_manifest.source_system,
    sourceSystem
  );
  assert.equal(
    manifestPackage.manifests.pipeline_run_review_manifest.data_spine_alignment_envelope.source_system,
    sourceSystem
  );
  assert.match(
    manifestPackage.manifest_refs.source_inventory_manifest_ref.manifest_hash,
    /^[a-f0-9]{64}$/
  );
  assert.match(
    manifestPackage.manifest_refs.aggregate_extraction_manifest_ref.manifest_hash,
    /^[a-f0-9]{64}$/
  );
  assert.match(
    manifestPackage.manifest_refs.pipeline_run_review_manifest_ref.manifest_hash,
    /^[a-f0-9]{64}$/
  );
  for (const feed of REQUIRED_FALSE_FEEDS) {
    assert.equal(manifestPackage.feeds[feed], false, `${feed} must remain false`);
  }
  for (const field of [
    "runs_bigquery",
    "runs_sigma",
    "runs_glean_query",
    "runs_live_connectors",
    "runs_customer_connectors",
    "uses_credentials",
    "executes_queries",
    "stores_query_strings",
    "stores_raw_source_data",
    "persists_manifests",
    "persists_pipeline_run",
    "creates_ingestion_jobs",
    "creates_backend_routes",
    "creates_frontend_ui",
    "creates_repositories",
    "creates_migrations",
    "creates_schemas",
    "writes_output_files",
    "authorizes_research_model",
    "emits_probability",
    "computes_roi",
    "emits_financial_attribution",
    "emits_customer_facing_output"
  ]) {
    assert.equal(manifestPackage.boundary_policy[field], false, `${field} must remain false`);
  }
  for (const key of FORBIDDEN_OUTPUT_KEYS) {
    assert.equal(hasNestedKey(manifestPackage, key), false, `${key} must not be emitted`);
  }
  assert.equal(serialized.includes("SELECT"), false);
  assert.equal(serialized.includes("person@example.com"), false);
}

function assertPackageSourceLane(manifestPackage, sourceLane) {
  assert.equal(
    manifestPackage.manifests.source_inventory_manifest.source_lane,
    sourceLane
  );
  assert.equal(
    manifestPackage.manifests.aggregate_extraction_manifest.source_package_lane,
    sourceLane
  );
  assert.equal(
    manifestPackage.manifests.pipeline_run_review_manifest.data_spine_alignment_envelope.source_lane,
    sourceLane
  );
  assert.equal(
    manifestPackage.manifest_refs.source_inventory_manifest_ref.source_lane,
    sourceLane
  );
  assert.equal(
    manifestPackage.manifest_refs.aggregate_extraction_manifest_ref.source_lane,
    sourceLane
  );
}

test("controlled aggregate manifest validation package accepts BigQuery-shaped saved fixtures", () => {
  const manifestPackage = buildControlledAggregateManifestValidationPackageFromObject(
    readJson(FIXTURE_PATH),
    { sourceSystem: "bigquery_export" }
  );

  assertPassedPackage(manifestPackage, "bigquery_export");
  assertPackageSourceLane(manifestPackage, "vbd_token");
});

test("controlled aggregate manifest validation package accepts Sigma-shaped saved fixtures", () => {
  const manifestPackage = buildControlledAggregateManifestValidationPackageFromObject(
    readJson(FIXTURE_PATH),
    { sourceSystem: "sigma_export" }
  );

  assertPassedPackage(manifestPackage, "sigma_export");
  assertPackageSourceLane(manifestPackage, "vbd_token");
});

test("controlled aggregate manifest validation package derives non-VBD source lanes from reviewed fixture refs", () => {
  const manifestPackage = buildControlledAggregateManifestValidationPackageFromObject(
    readJson(FIXTURE_PATH),
    { sourceSystem: "bigquery_export", sourceLane: "customer_metric" }
  );

  assertPassedPackage(manifestPackage, "bigquery_export");
  assertPackageSourceLane(manifestPackage, "customer_metric");
  assert.equal(
    manifestPackage.manifests.source_inventory_manifest.approved_source_ref,
    "bigquery_export_support_metric_resolution_hours_day_30"
  );
});

test("controlled aggregate manifest validation fails closed without emitting invalid source lanes", () => {
  const manifestPackage = buildControlledAggregateManifestValidationPackageFromObject(
    readJson(FIXTURE_PATH),
    {
      sourceSystem: "bigquery_export",
      sourceLane: "SELECT user_id FROM raw_rows WHERE employee_email = 'person@example.com'"
    }
  );
  const validation = validateControlledAggregateManifestValidationPackage(
    manifestPackage,
    { sourceFixture: readJson(FIXTURE_PATH) }
  );
  const serializedPackage = JSON.stringify(manifestPackage);
  const serializedGaps = JSON.stringify(validation.gaps);

  assert.equal(manifestPackage.manifest_validation_state, "BLOCKED");
  assert.equal(validation.valid, false);
  assert.equal(serializedPackage.includes("person@example.com"), false);
  assert.equal(serializedPackage.includes("SELECT user_id"), false);
  assert.equal(serializedGaps.includes("person@example.com"), false);
  assert.equal(serializedGaps.includes("SELECT user_id"), false);
});

test("controlled aggregate manifest validation fails closed when selected lane lacks reviewed source ref", () => {
  const fixture = readJson(FIXTURE_PATH);
  delete fixture.expected.reviewed_source_refs.customer_metric;

  const manifestPackage = buildControlledAggregateManifestValidationPackageFromObject(
    fixture,
    { sourceSystem: "bigquery_export", sourceLane: "customer_metric" }
  );
  const validation = validateControlledAggregateManifestValidationPackage(
    manifestPackage,
    { sourceFixture: fixture }
  );

  assert.equal(manifestPackage.manifest_validation_state, "BLOCKED");
  assert.equal(validation.valid, false);
  if (manifestPackage.manifests) {
    assert.equal(
      manifestPackage.manifests.source_inventory_manifest.approved_source_ref,
      null
    );
  } else {
    assert.equal(manifestPackage.manifests, null);
  }
  assert.equal(
    JSON.stringify(manifestPackage).includes(
      "bigquery_export_scrubbed_glean_vbd_token_support_day_30"
    ),
    false
  );
});

test("controlled aggregate manifest validation blocks unsupported source systems", () => {
  const manifestPackage = buildControlledAggregateManifestValidationPackageFromObject(
    readJson(FIXTURE_PATH),
    { sourceSystem: "snowflake_export" }
  );
  const validation = validateControlledAggregateManifestValidationPackage(
    manifestPackage,
    { sourceFixture: readJson(FIXTURE_PATH) }
  );

  assert.equal(manifestPackage.manifest_validation_state, "BLOCKED");
  assert.equal(validation.valid, false);
  for (const feed of REQUIRED_FALSE_FEEDS) {
    assert.equal(manifestPackage.feeds[feed], false, `${feed} must remain false`);
  }
});

test("controlled aggregate manifest validation fails closed on live execution and unsafe refs", () => {
  const manifestPackage = buildControlledAggregateManifestValidationPackageFromObject(
    readJson(FIXTURE_PATH),
    {
      sourceSystem: "bigquery_export",
      sourceInventoryManifestOverrides: {
        approved_source_ref: "https://bigquery.example/jobs/bquxjob_123",
        boundary_policy: {
          runs_live_connector: true
        },
        raw_rows: [{ employee_email: "person@example.com" }]
      }
    }
  );
  const validation = validateControlledAggregateManifestValidationPackage(
    manifestPackage,
    { sourceFixture: readJson(FIXTURE_PATH) }
  );

  assert.equal(validation.valid, false);
  assert.equal(manifestPackage.manifests, null);
  assert.equal(manifestPackage.manifest_refs, null);
  assert.equal(JSON.stringify(manifestPackage).includes("person@example.com"), false);
  assert.equal(JSON.stringify(manifestPackage).includes("raw_rows"), false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("source_inventory_manifest")),
    validation.gaps.join("; ")
  );
  assert.equal(JSON.stringify(validation.gaps).includes("person@example.com"), false);
  assert.equal(JSON.stringify(validation.gaps).includes("raw_rows"), false);
});

test("controlled aggregate manifest validation catches hand-edited passed packages", () => {
  const manifestPackage = buildControlledAggregateManifestValidationPackageFromObject(
    readJson(FIXTURE_PATH),
    { sourceSystem: "bigquery_export" }
  );
  const tampered = clone(manifestPackage);
  tampered.manifest_refs.source_inventory_manifest_ref.manifest_hash =
    "0".repeat(64);
  tampered.manifests.pipeline_run_review_manifest.metric_id =
    "first_contact_resolution";

  const validation = validateControlledAggregateManifestValidationPackage(
    tampered,
    { sourceFixture: readJson(FIXTURE_PATH) }
  );

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("manifest_refs.source_inventory_manifest_ref")),
    validation.gaps.join("; ")
  );
  assert.ok(
    validation.gaps.some((gap) => gap.includes("metric_id")),
    validation.gaps.join("; ")
  );
});

test("controlled aggregate manifest validation binds connector adapter summary validity", () => {
  const manifestPackage = buildControlledAggregateManifestValidationPackageFromObject(
    readJson(FIXTURE_PATH),
    { sourceSystem: "bigquery_export" }
  );
  const tampered = clone(manifestPackage);
  tampered.validation_summary.connector_adapter_valid = false;

  const validation = validateControlledAggregateManifestValidationPackage(
    tampered,
    { sourceFixture: readJson(FIXTURE_PATH) }
  );

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("connector_adapter_valid")),
    validation.gaps.join("; ")
  );
});

test("controlled aggregate manifest validation preserves per-manifest summary flags when blocked", () => {
  const manifestPackage = buildControlledAggregateManifestValidationPackageFromObject(
    readJson(FIXTURE_PATH),
    {
      sourceSystem: "bigquery_export",
      pipelineRunReviewManifestOverrides: {
        validation_result_refs: {
          source_inventory_validation_hash: "0".repeat(64)
        }
      }
    }
  );
  const validation = validateControlledAggregateManifestValidationPackage(
    manifestPackage,
    { sourceFixture: readJson(FIXTURE_PATH) }
  );

  assert.equal(manifestPackage.manifest_validation_state, "BLOCKED");
  assert.equal(manifestPackage.manifests, null);
  assert.equal(manifestPackage.validation_summary.source_inventory_manifest_valid, true);
  assert.equal(manifestPackage.validation_summary.aggregate_extraction_manifest_valid, true);
  assert.equal(manifestPackage.validation_summary.pipeline_run_review_manifest_valid, false);
  assert.equal(manifestPackage.validation_summary.manifest_chain_valid, false);
  assert.equal(validation.valid, false);
});

test("controlled aggregate manifest validation keeps the default VBD lane for the selected support metric", () => {
  const fixture = readJson(FIXTURE_PATH);
  const manifestPackage = buildControlledAggregateManifestValidationPackageFromObject(
    fixture,
    { sourceSystem: "bigquery_export" }
  );
  const validation = validateControlledAggregateManifestValidationPackage(
    manifestPackage,
    { sourceFixture: fixture }
  );

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(
    manifestPackage.manifests.source_inventory_manifest.source_lane,
    "vbd_token"
  );
  assert.equal(
    manifestPackage.manifests.aggregate_extraction_manifest.source_package_lane,
    "vbd_token"
  );
});

test("controlled aggregate manifest validation fails closed on wrapper-level smuggling", () => {
  const manifestPackage = buildControlledAggregateManifestValidationPackageFromObject(
    readJson(FIXTURE_PATH),
    { sourceSystem: "bigquery_export" }
  );
  const tampered = clone(manifestPackage);
  tampered.raw_rows = [{ employee_email: "person@example.com" }];
  tampered.query_text = "SELECT user_id FROM raw_rows";
  tampered.manifests.raw_rows = [{ user_id: "user-123" }];
  tampered.manifest_refs.query_text = "SELECT * FROM source";
  tampered.feeds.measurement_cell_snapshot_persistence = true;
  tampered.boundary_policy.customer_facing_confidence_score = true;
  tampered.validation_summary.score = 1;
  tampered.required_caveats = [
    ...tampered.required_caveats,
    "ROI and confidence output ready"
  ];

  const validation = validateControlledAggregateManifestValidationPackage(
    tampered,
    { sourceFixture: readJson(FIXTURE_PATH) }
  );

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("manifest_validation_package")),
    validation.gaps.join("; ")
  );
  assert.ok(validation.gaps.some((gap) => gap.includes("feeds")));
  assert.ok(validation.gaps.some((gap) => gap.includes("boundary_policy")));
  assert.ok(validation.gaps.some((gap) => gap.includes("validation_summary")));
  assert.ok(validation.gaps.some((gap) => gap.includes("required_caveats")));
  assert.equal(JSON.stringify(validation.gaps).includes("person@example.com"), false);
  assert.equal(JSON.stringify(validation.gaps).includes("SELECT user_id"), false);
});

test("controlled aggregate manifest validation rejects validation-summary gap smuggling", () => {
  const manifestPackage = buildControlledAggregateManifestValidationPackageFromObject(
    readJson(FIXTURE_PATH),
    { sourceSystem: "bigquery_export" }
  );
  const tampered = clone(manifestPackage);
  tampered.validation_summary.gaps = [
    "SELECT user_id FROM raw_rows",
    "person@example.com",
    "confidence_score=0.91"
  ];

  const validation = validateControlledAggregateManifestValidationPackage(
    tampered,
    { sourceFixture: readJson(FIXTURE_PATH) }
  );

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("validation_summary.gaps")),
    validation.gaps.join("; ")
  );
  assert.equal(JSON.stringify(validation.gaps).includes("person@example.com"), false);
  assert.equal(JSON.stringify(validation.gaps).includes("SELECT user_id"), false);
});

test("controlled aggregate manifest validation binds passed package state and true feeds", () => {
  const manifestPackage = buildControlledAggregateManifestValidationPackageFromObject(
    readJson(FIXTURE_PATH),
    { sourceSystem: "bigquery_export" }
  );
  const tampered = clone(manifestPackage);
  tampered.manifest_validation_state = "BLOCKED";
  tampered.feeds.controlled_aggregate_manifest_validation = false;
  tampered.feeds.manual_operator_promotion_review = false;

  const validation = validateControlledAggregateManifestValidationPackage(
    tampered,
    { sourceFixture: readJson(FIXTURE_PATH) }
  );

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("manifest_validation_state")),
    validation.gaps.join("; ")
  );
  assert.ok(validation.gaps.some((gap) => gap.includes("feeds")));
});

test("controlled aggregate manifest validation binds connector adapter validity to recomputed state", () => {
  const manifestPackage = buildControlledAggregateManifestValidationPackageFromObject(
    readJson(FIXTURE_PATH),
    { sourceSystem: "bigquery_export" }
  );
  const tampered = clone(manifestPackage);
  tampered.validation_summary.connector_adapter_valid = false;

  const validation = validateControlledAggregateManifestValidationPackage(
    tampered,
    { sourceFixture: readJson(FIXTURE_PATH) }
  );

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) =>
      gap.includes("validation_summary.connector_adapter_valid")
    ),
    validation.gaps.join("; ")
  );
});

test("controlled aggregate manifest validation binds summary gaps to sanitized recomputed gaps", () => {
  const manifestPackage = buildControlledAggregateManifestValidationPackageFromObject(
    readJson(FIXTURE_PATH),
    { sourceSystem: "bigquery_export" }
  );
  const tampered = clone(manifestPackage);
  tampered.validation_summary.gaps = [
    "SELECT user_id FROM raw_rows WHERE employee_email = 'person@example.com'"
  ];

  const validation = validateControlledAggregateManifestValidationPackage(
    tampered,
    { sourceFixture: readJson(FIXTURE_PATH) }
  );

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) =>
      gap.includes("validation_summary.gaps must match recomputed validation")
    ),
    validation.gaps.join("; ")
  );
  assert.equal(JSON.stringify(validation.gaps).includes("person@example.com"), false);
  assert.equal(JSON.stringify(validation.gaps).includes("SELECT user_id"), false);
});

test("controlled aggregate manifest validation keeps blocked packages free of adapter refs", () => {
  const manifestPackage = buildControlledAggregateManifestValidationPackageFromObject(
    readJson(FIXTURE_PATH),
    { sourceSystem: "snowflake_export" }
  );
  const tampered = clone(manifestPackage);
  tampered.adapter_run_id = "adapter_run_smuggled";
  tampered.connector_adapter_ref = {
    adapter_state: "PASSED_INTERNAL_CONNECTOR_ADAPTER_REVIEW",
    connector_manifest_ref: {
      raw_rows: [{ employee_email: "person@example.com" }]
    },
    pipeline_dry_run_ref: {
      query_text: "SELECT user_id FROM raw_rows"
    }
  };

  const validation = validateControlledAggregateManifestValidationPackage(
    tampered,
    { sourceFixture: readJson(FIXTURE_PATH) }
  );

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) =>
      gap.includes("blocked manifest validation packages must not carry adapter refs")
    ),
    validation.gaps.join("; ")
  );
  assert.equal(JSON.stringify(validation.gaps).includes("person@example.com"), false);
  assert.equal(JSON.stringify(validation.gaps).includes("SELECT user_id"), false);
});

test("controlled aggregate manifest validation runner emits compact non-persisted output", () => {
  const output = execFileSync(
    process.execPath,
    [
      "scripts/run_ai_value_controlled_aggregate_manifest_validation.mjs",
      FIXTURE_PATH,
      "--source-system=sigma_export"
    ],
    { encoding: "utf8" }
  );
  const parsed = JSON.parse(output);

  assert.equal(parsed.manifest_validation_state, "PASSED_CONTROLLED_AGGREGATE_MANIFEST_VALIDATION");
  assert.equal(parsed.source_system, "sigma_export");
  assert.equal(parsed.validation_summary.valid, true);
  assert.equal(parsed.feeds.live_sigma_execution, false);
  assert.equal(parsed.feeds.durable_manifest_storage, false);
  assert.equal(parsed.feeds.measurement_cell_series_snapshot, false);
  assert.equal(parsed.boundary_policy.persists_manifests, false);
  assert.equal(hasNestedKey(parsed, "raw_rows"), false);
});
