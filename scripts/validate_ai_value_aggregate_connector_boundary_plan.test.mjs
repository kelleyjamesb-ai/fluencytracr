import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildAggregateConnectorBoundaryPlanFromObject,
  validateAggregateConnectorBoundaryPlan
} from "./run_ai_value_aggregate_connector_boundary_plan.mjs";

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
  "sigma_query",
  "credential_ref",
  "secret",
  "prompt",
  "transcript",
  "user_id",
  "employee_id",
  "person_id",
  "email",
  "project_id",
  "dataset_id",
  "table_id",
  "vbd_score",
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

function assertPassedPlan(plan, sourceSystem) {
  const validation = validateAggregateConnectorBoundaryPlan(plan, {
    sourceFixture: readJson(FIXTURE_PATH)
  });
  const serialized = JSON.stringify(plan);

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(
    plan.boundary_plan_state,
    "PASSED_AGGREGATE_CONNECTOR_BOUNDARY_PLAN_REVIEW"
  );
  assert.equal(plan.source_system, sourceSystem);
  assert.equal(plan.execution_boundary, "approved_glean_or_customer_environment");
  assert.equal(plan.fluencytracr_execution_mode, "no_live_execution");
  assert.equal(plan.feeds.aggregate_connector_boundary_plan_review, true);
  assert.equal(plan.feeds.saved_fixture_connector_adapter_candidate, true);
  assert.equal(
    plan.connector_adapter_ref.adapter_state,
    "PASSED_INTERNAL_CONNECTOR_ADAPTER_REVIEW"
  );
  assert.match(plan.aggregate_definition_ref, /^[a-z0-9_]+$/);
  assert.match(plan.aggregate_output_ref, /^[a-z0-9_]+$/);
  assert.equal(
    plan.source_quality_posture.k_min_posture,
    "K_MIN_ALREADY_ENFORCED_UPSTREAM"
  );
  assert.equal(
    plan.source_quality_posture.suppression_posture,
    "SUPPRESSION_ALREADY_ENFORCED_UPSTREAM"
  );
  for (const feed of REQUIRED_FALSE_FEEDS) {
    assert.equal(plan.feeds[feed], false, `${feed} must remain false`);
  }
  for (const field of [
    "fluencytracr_runs_bigquery",
    "fluencytracr_runs_sigma",
    "fluencytracr_runs_glean_query",
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
    "persists_controlled_manifests",
    "creates_source_package",
    "creates_measurement_cell",
    "creates_measurement_cell_series",
    "feeds_research_model",
    "emits_probability",
    "computes_roi",
    "emits_customer_facing_output"
  ]) {
    assert.equal(plan.boundary_policy[field], false, `${field} must remain false`);
  }
  for (const key of FORBIDDEN_OUTPUT_KEYS) {
    assert.equal(hasNestedKey(plan, key), false, `${key} must not be emitted`);
  }
  assert.equal(serialized.includes("SELECT"), false);
  assert.equal(serialized.includes("person@example.com"), false);
}

test("aggregate connector boundary plan accepts BigQuery-shaped saved fixtures", () => {
  const plan = buildAggregateConnectorBoundaryPlanFromObject(
    readJson(FIXTURE_PATH),
    { sourceSystem: "bigquery_export" }
  );

  assertPassedPlan(plan, "bigquery_export");
});

test("aggregate connector boundary plan accepts Sigma-shaped saved fixtures", () => {
  const plan = buildAggregateConnectorBoundaryPlanFromObject(
    readJson(FIXTURE_PATH),
    { sourceSystem: "sigma_export" }
  );

  assertPassedPlan(plan, "sigma_export");
});

test("aggregate connector boundary plan blocks unsupported source systems", () => {
  const plan = buildAggregateConnectorBoundaryPlanFromObject(
    readJson(FIXTURE_PATH),
    { sourceSystem: "snowflake_export" }
  );
  const validation = validateAggregateConnectorBoundaryPlan(plan, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(plan.boundary_plan_state, "BLOCKED");
  assert.equal(validation.valid, false);
  for (const feed of REQUIRED_FALSE_FEEDS) {
    assert.equal(plan.feeds[feed], false, `${feed} must remain false`);
  }
});

test("aggregate connector boundary plan rejects live handles, query text, credentials, and raw rows", () => {
  const plan = buildAggregateConnectorBoundaryPlanFromObject(
    readJson(FIXTURE_PATH),
    {
      sourceSystem: "bigquery_export",
      planOverrides: {
        aggregate_definition_ref: "SELECT user_id FROM raw_rows",
        aggregate_output_ref: "https://bigquery.example/jobs/bquxjob_123",
        boundary_policy: {
          fluencytracr_runs_bigquery: true,
          fluencytracr_uses_credentials: true,
          fluencytracr_executes_queries: true,
          fluencytracr_receives_raw_rows: true
        },
        raw_rows: [{ employee_email: "person@example.com" }],
        credential_ref: "secret://warehouse/key",
        connector_adapter_ref: {
          pipeline_dry_run_ref: {
            measurement_cell_ref: "measurement_cell_candidate_smuggled"
          }
        }
      }
    }
  );
  const validation = validateAggregateConnectorBoundaryPlan(plan, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  const serializedPlan = JSON.stringify(plan);
  assert.equal(validation.valid, false);
  assert.equal(JSON.stringify(plan).includes("person@example.com"), false);
  assert.equal(JSON.stringify(plan).includes("SELECT user_id"), false);
  assert.equal(plan.boundary_plan_state, "BLOCKED");
  assert.equal(plan.aggregate_definition_ref, null);
  assert.equal(plan.aggregate_output_ref, null);
  assert.equal(plan.source_alignment, null);
  assert.equal(plan.connector_adapter_ref, null);
  assert.equal(plan.boundary_policy.fluencytracr_runs_bigquery, false);
  assert.equal(hasNestedKey(plan, "raw_rows"), false);
  assert.equal(hasNestedKey(plan, "credential_ref"), false);
  assert.equal(hasNestedKey(plan, "measurement_cell_ref"), false);
  assert.equal(serializedPlan.includes("person@example.com"), false);
  assert.equal(serializedPlan.includes("SELECT user_id"), false);
  assert.equal(serializedPlan.includes("secret://warehouse/key"), false);
  assert.equal(serializedPlan.includes("measurement_cell_candidate_smuggled"), false);
  assert.ok(validation.gaps.length > 0);
  assert.ok(validation.gaps.some((gap) => gap.includes("aggregate_definition_ref")));
  assert.ok(validation.gaps.some((gap) => gap.includes("aggregate_output_ref")));
  assert.ok(validation.gaps.some((gap) => gap.includes("boundary_plan")));
  assert.equal(JSON.stringify(validation.gaps).includes("person@example.com"), false);
  assert.equal(JSON.stringify(validation.gaps).includes("SELECT user_id"), false);
});

test("aggregate connector boundary plan rejects score-like approved output fields", () => {
  const plan = buildAggregateConnectorBoundaryPlanFromObject(
    readJson(FIXTURE_PATH),
    {
      sourceSystem: "bigquery_export",
      planOverrides: {
        approved_output_fields: [
          "workflow_family",
          "workflow_id",
          "function_area",
          "cohort_key",
          "window_start",
          "window_end",
          "vbd_score"
        ]
      }
    }
  );
  const validation = validateAggregateConnectorBoundaryPlan(plan, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("approved_output_fields")),
    validation.gaps.join("; ")
  );
});

test("aggregate connector boundary plan rejects project dataset and table refs", () => {
  const plan = buildAggregateConnectorBoundaryPlanFromObject(
    readJson(FIXTURE_PATH),
    {
      sourceSystem: "bigquery_export",
      planOverrides: {
        aggregate_definition_ref: "aggregate_definition_project_scio_apps",
        aggregate_output_ref: "reviewed_output_dataset_scrubbed_table_agent_span"
      }
    }
  );
  const validation = validateAggregateConnectorBoundaryPlan(plan);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("aggregate_definition_ref")),
    validation.gaps.join("; ")
  );
  assert.ok(
    validation.gaps.some((gap) => gap.includes("aggregate_output_ref")),
    validation.gaps.join("; ")
  );
});

test("aggregate connector boundary plan builder blocks safe-looking source drift", () => {
  const plan = buildAggregateConnectorBoundaryPlanFromObject(
    readJson(FIXTURE_PATH),
    {
      sourceSystem: "bigquery_export",
      planOverrides: {
        source_alignment: {
          org_id: "org_other_safe"
        }
      }
    }
  );
  const validation = validateAggregateConnectorBoundaryPlan(plan, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(plan.boundary_plan_state, "BLOCKED");
  assert.equal(plan.connector_adapter_ref, null);
  assert.equal(validation.valid, false);
  assert.ok(
    plan.validation_summary.gaps.some((gap) =>
      gap.includes("recomputed saved-fixture boundary plan")
    ),
    plan.validation_summary.gaps.join("; ")
  );
});

test("aggregate connector boundary plan rejects impossible date windows", () => {
  const plan = buildAggregateConnectorBoundaryPlanFromObject(
    readJson(FIXTURE_PATH),
    {
      sourceSystem: "bigquery_export",
      planOverrides: {
        source_alignment: {
          baseline_window: {
            window_start: "2026-02-31",
            window_end: "2026-03-01"
          }
        }
      }
    }
  );
  const validation = validateAggregateConnectorBoundaryPlan(plan, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(plan.boundary_plan_state, "BLOCKED");
  assert.equal(plan.connector_adapter_ref, null);
  assert.equal(validation.valid, false);
  assert.ok(
    plan.validation_summary.gaps.some((gap) =>
      gap.includes("source_alignment.baseline_window")
    ),
    plan.validation_summary.gaps.join("; ")
  );
});

test("aggregate connector boundary plan catches hand-edited passed packages", () => {
  const plan = buildAggregateConnectorBoundaryPlanFromObject(
    readJson(FIXTURE_PATH),
    { sourceSystem: "bigquery_export" }
  );
  const tampered = clone(plan);
  tampered.aggregate_output_ref = "reviewed_aggregate_output_bigquery_export_other_metric";
  tampered.source_alignment.metric_id = "first_contact_resolution";
  tampered.validation_summary.valid = true;

  const validation = validateAggregateConnectorBoundaryPlan(tampered, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("recomputed saved-fixture")),
    validation.gaps.join("; ")
  );
});

test("aggregate connector boundary plan requires source fixture for passed validation", () => {
  const plan = buildAggregateConnectorBoundaryPlanFromObject(
    readJson(FIXTURE_PATH),
    { sourceSystem: "bigquery_export" }
  );
  const validation = validateAggregateConnectorBoundaryPlan(plan);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("sourceFixture is required")),
    validation.gaps.join("; ")
  );
  assert.ok(
    validation.gaps.some((gap) => gap.includes("boundary_plan_state")),
    validation.gaps.join("; ")
  );
});

test("aggregate connector boundary plan rejects wrapper-level smuggling", () => {
  const plan = buildAggregateConnectorBoundaryPlanFromObject(
    readJson(FIXTURE_PATH),
    { sourceSystem: "bigquery_export" }
  );
  const tampered = clone(plan);
  tampered.project_id = "scio-apps";
  tampered.dataset_id = "scrubbed_client_analytics";
  tampered.query_text = "SELECT * FROM raw_rows";
  tampered.feeds.durable_manifest_storage = true;
  tampered.boundary_policy.customer_facing_confidence_score = true;
  tampered.validation_summary.score = 1;

  const validation = validateAggregateConnectorBoundaryPlan(tampered, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.some((gap) => gap.includes("boundary_plan")));
  assert.ok(validation.gaps.some((gap) => gap.includes("feeds")));
  assert.ok(validation.gaps.some((gap) => gap.includes("boundary_policy")));
  assert.ok(validation.gaps.some((gap) => gap.includes("validation_summary")));
  assert.equal(JSON.stringify(validation.gaps).includes("SELECT"), false);
});

test("aggregate connector boundary plan rejects validation-summary smuggling", () => {
  const plan = buildAggregateConnectorBoundaryPlanFromObject(
    readJson(FIXTURE_PATH),
    { sourceSystem: "bigquery_export" }
  );
  const tampered = clone(plan);
  tampered.validation_summary.gaps = [
    "SELECT user_id FROM raw_rows",
    "person@example.com",
    "confidence_score=0.91"
  ];

  const validation = validateAggregateConnectorBoundaryPlan(tampered, {
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

test("aggregate connector boundary plan rejects measurement-cell ref aliases", () => {
  const plan = buildAggregateConnectorBoundaryPlanFromObject(
    readJson(FIXTURE_PATH),
    { sourceSystem: "bigquery_export" }
  );
  const tampered = clone(plan);
  tampered.connector_adapter_ref.pipeline_dry_run_ref.measurement_cell_ref =
    "measurement_cell_org_example_support_ready";

  const validation = validateAggregateConnectorBoundaryPlan(tampered, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("Forbidden field")),
    validation.gaps.join("; ")
  );
});

test("aggregate connector boundary plan CLI emits compact non-live output", () => {
  const output = execFileSync(
    process.execPath,
    [
      "scripts/run_ai_value_aggregate_connector_boundary_plan.mjs",
      FIXTURE_PATH,
      "--source-system=sigma_export"
    ],
    { encoding: "utf8" }
  );
  const parsed = JSON.parse(output);

  assert.equal(
    parsed.boundary_plan_state,
    "PASSED_AGGREGATE_CONNECTOR_BOUNDARY_PLAN_REVIEW"
  );
  assert.equal(parsed.source_system, "sigma_export");
  assert.equal(parsed.validation_summary.valid, true);
  assert.equal(parsed.feeds.live_sigma_execution, false);
  assert.equal(parsed.feeds.durable_manifest_storage, false);
  assert.equal(parsed.feeds.measurement_cell_series_snapshot, false);
  assert.equal(parsed.boundary_policy.fluencytracr_runs_sigma, false);
  assert.equal(parsed.boundary_policy.persists_controlled_manifests, false);
  assert.equal(hasNestedKey(parsed, "raw_rows"), false);
});
