import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildControlledAggregatePipelineDryRun as buildSharedControlledAggregatePipelineDryRun,
  validateControlledAggregatePipelineDryRun as validateSharedControlledAggregatePipelineDryRun
} from "../shared/dist/aiValueEngine/index.js";

import {
  CONTROLLED_AGGREGATE_PIPELINE_DRY_RUN_SCHEMA_VERSION,
  buildControlledAggregatePipelineRunManifestFromFixture,
  runControlledAggregatePipelineDryRunFromObject,
  validateControlledAggregatePipelineDryRun
} from "./run_ai_value_controlled_aggregate_pipeline_dry_run.mjs";

const FIXTURE_PATH =
  "docs/contracts/ai-value-real-data-intake-packet-runner/examples/controlled-aggregate-fixture-review-ready.json";

const REQUIRED_FALSE_FEEDS = [
  "live_bigquery_execution",
  "live_sigma_execution",
  "live_glean_query",
  "durable_pipeline_run_storage",
  "source_package_clearance",
  "measurement_cell_snapshot_candidate",
  "measurement_cell_snapshot",
  "measurement_cell_series_snapshot",
  "evidence_continuity_snapshot",
  "claim_readiness_snapshot",
  "executive_readout_snapshot",
  "executive_packet",
  "html_readout",
  "api_export",
  "customer_share_package",
  "reportability_readiness",
  "value_hypothesis_packet_runner",
  "finance_context_investigation",
  "finance_context_investigation_planning",
  "confidence_model",
  "confidence_model_feed",
  "confidence_percentage",
  "confidence_score",
  "probability_output",
  "contribution_probability",
  "p_value",
  "roi_output",
  "ebita_claim",
  "ebitda_claim",
  "financial_attribution",
  "causality_claim",
  "productivity_claim",
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
  "bigquery_sql",
  "sigma_query",
  "prompt",
  "prompt_text",
  "transcript",
  "user_id",
  "employee_id",
  "person_id",
  "email",
  "measurement_plan",
  "data_spine_readiness",
  "real_data_intake_packet_run",
  "pilot_intake_run",
  "source_packages",
  "client_evidence_entries",
  "measurement_cell",
  "measurement_cell_series",
  "source_package_payload",
  "payload_json",
  "validation_json",
  "source_refs_json",
  "blueprint_path_binding_json"
];

const clone = (value) => JSON.parse(JSON.stringify(value));
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

function hasNestedKey(value, key) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => hasNestedKey(item, key));
  return Object.entries(value).some(
    ([nestedKey, nestedValue]) => nestedKey === key || hasNestedKey(nestedValue, key)
  );
}

function assertPassedDryRun(packageResult, sourceSystem) {
  const validation = validateControlledAggregatePipelineDryRun(packageResult, {
    sourceFixture: readJson(FIXTURE_PATH)
  });
  const serialized = JSON.stringify(packageResult);

  assert.equal(
    packageResult.schema_version,
    CONTROLLED_AGGREGATE_PIPELINE_DRY_RUN_SCHEMA_VERSION
  );
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(packageResult.dry_run_state, "PASSED_INTERNAL_PIPELINE_DRY_RUN_REVIEW");
  assert.equal(packageResult.source_system, sourceSystem);
  assert.equal(packageResult.engine_executed, true);
  assert.equal(packageResult.validation_summary.manifest_valid, true);
  assert.equal(packageResult.validation_summary.measurement_cell_candidate_valid, true);
  assert.equal(packageResult.validation_summary.source_package_count, 5);
  assert.equal(packageResult.feeds.pipeline_dry_run_review, true);
  assert.equal(packageResult.feeds.source_package_review_path, true);
  assert.equal(packageResult.feeds.measurement_cell_candidate_proof, true);
  assert.equal(
    packageResult.candidate_ref.measurement_cell_ref,
    "measurement_cell_org_example_customer_support_customer_support_case_resolution_workflow_family_customer_support_case_resolution_eligible_cases_2300_day_30_support_median_resolution_hours"
  );
  assert.equal(packageResult.candidate_ref.expectation_path_id, "expectation_path_support_median_resolution_hours_capacity");
  assert.match(packageResult.candidate_ref.candidate_integrity_hash, /^[a-f0-9]{64}$/);
  assert.match(packageResult.manifest_ref.manifest_hash, /^[a-f0-9]{64}$/);
  assert.match(packageResult.manifest_ref.aggregate_fixture_hash, /^[a-f0-9]{64}$/);
  for (const feed of REQUIRED_FALSE_FEEDS) {
    assert.equal(packageResult.feeds[feed], false, `${feed} must remain false`);
  }
  for (const field of [
    "runs_bigquery",
    "runs_sigma",
    "runs_glean_query",
    "runs_live_connectors",
    "runs_customer_connectors",
    "persists_pipeline_run",
    "creates_ingestion_jobs",
    "creates_backend_routes",
    "creates_frontend_ui",
    "stores_raw_source_data",
    "writes_output_files",
    "creates_schemas",
    "creates_repositories",
    "creates_routes",
    "creates_ui",
    "computes_confidence",
    "emits_probability",
    "computes_roi",
    "emits_financial_attribution",
    "customer_facing_output",
    "customer_facing_financial_output"
  ]) {
    assert.equal(packageResult.boundary_policy[field], false, `${field} must remain false`);
  }
  for (const key of FORBIDDEN_OUTPUT_KEYS) {
    assert.equal(hasNestedKey(packageResult, key), false, `${key} must not be emitted`);
  }
  assert.equal(serialized.includes("SELECT"), false);
  assert.equal(serialized.includes("person@example.com"), false);
}

test("controlled aggregate pipeline dry run accepts BigQuery-shaped aggregate export manifests", () => {
  const packageResult = runControlledAggregatePipelineDryRunFromObject(
    readJson(FIXTURE_PATH),
    { sourceSystem: "bigquery_export" }
  );

  assertPassedDryRun(packageResult, "bigquery_export");
});

test("controlled aggregate pipeline dry run accepts Sigma-shaped aggregate export manifests", () => {
  const packageResult = runControlledAggregatePipelineDryRunFromObject(
    readJson(FIXTURE_PATH),
    { sourceSystem: "sigma_export" }
  );

  assertPassedDryRun(packageResult, "sigma_export");
});

test("controlled aggregate pipeline dry run rejects unsupported source systems instead of normalizing to BigQuery", () => {
  const packageResult = runControlledAggregatePipelineDryRunFromObject(
    readJson(FIXTURE_PATH),
    { sourceSystem: "snowflake_export" }
  );

  assert.equal(packageResult.dry_run_state, "BLOCKED");
  assert.equal(packageResult.source_system, null);
  assert.equal(packageResult.engine_executed, false);
  assert.ok(
    packageResult.validation_summary.gaps.some((gap) => gap.includes("source_system")),
    packageResult.validation_summary.gaps.join("; ")
  );
});

test("controlled aggregate pipeline dry run blocks live execution and raw/query leakage before candidate assembly", () => {
  const packageResult = runControlledAggregatePipelineDryRunFromObject(
    readJson(FIXTURE_PATH),
    {
      sourceSystem: "bigquery_export",
      manifestOverrides: {
        execution_policy: {
          runs_bigquery: true,
          runs_sigma: false,
          runs_glean_query: false,
          runs_live_connectors: true,
          runs_customer_connectors: true,
          stores_raw_source_data: false
        },
        query_text: "SELECT employee_email, user_id FROM raw_rows",
        raw_rows: [{ user_id: "user_123", employee_email: "person@example.com" }],
        source_refs: {
          aggregate_export_ref: "bigquery_query_text_user_id_roi_probability"
        }
      }
    }
  );
  const validation = validateControlledAggregatePipelineDryRun(packageResult);
  const serialized = JSON.stringify(packageResult);

  assert.equal(validation.valid, false);
  assert.equal(packageResult.dry_run_state, "BLOCKED");
  assert.equal(packageResult.engine_executed, false);
  assert.equal(packageResult.candidate_ref, null);
  assert.equal(packageResult.feeds.pipeline_dry_run_review, false);
  assert.equal(packageResult.feeds.source_package_review_path, false);
  assert.equal(packageResult.feeds.measurement_cell_candidate_proof, false);
  for (const token of [
    "execution_policy.runs_bigquery",
    "execution_policy.runs_live_connectors",
    "execution_policy.runs_customer_connectors",
    "query_text",
    "raw_rows",
    "source_refs.aggregate_export_ref"
  ]) {
    assert.ok(
      packageResult.validation_summary.gaps.some((gap) => gap.includes(token)),
      `missing gap for ${token}`
    );
  }
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("SELECT employee_email"), false);
});

test("controlled aggregate pipeline dry run blocks connector aliases and preview payload smuggling", () => {
  const packageResult = runControlledAggregatePipelineDryRunFromObject(
    readJson(FIXTURE_PATH),
    {
      manifestOverrides: {
        bigquery_job_id: "job_123",
        sigma_api_run: "run_123",
        query_job_ref: "query_job_123",
        connector_status: "active",
        ingestion_job: "live_connector",
        preview_rows: [{ user_uuid: "user_uuid_123" }],
        metric_values: [1, 2, 3],
        raw_export: { records: [] },
        source_refs: {
          aggregate_export_ref: "bigquery_export_eyj1c2vyx2lkijoxmjm"
        }
      }
    }
  );

  assert.equal(packageResult.dry_run_state, "BLOCKED");
  assert.equal(packageResult.engine_executed, false);
  for (const token of [
    "bigquery_job_id",
    "sigma_api_run",
    "query_job_ref",
    "connector_status",
    "ingestion_job",
    "preview_rows",
    "metric_values",
    "raw_export",
    "source_refs.aggregate_export_ref"
  ]) {
    assert.ok(
      packageResult.validation_summary.gaps.some((gap) => gap.includes(token)),
      `missing gap for ${token}`
    );
  }
});

test("controlled aggregate pipeline dry run does not echo raw data hidden inside window objects", () => {
  const packageResult = runControlledAggregatePipelineDryRunFromObject(
    readJson(FIXTURE_PATH),
    {
      manifestOverrides: {
        baseline_window: {
          window_start: "2026-05-01",
          window_end: "2026-05-31",
          employee_email: "person@example.com"
        }
      }
    }
  );
  const serialized = JSON.stringify(packageResult);

  assert.equal(packageResult.dry_run_state, "BLOCKED");
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("employee_email"), false);
  assert.ok(
    packageResult.validation_summary.gaps.some((gap) =>
      gap.includes("baseline_window.<blocked_identifier_field>")
    ),
    packageResult.validation_summary.gaps.join("; ")
  );
});

test("controlled aggregate pipeline dry run blocks identity and window drift", () => {
  const packageResult = runControlledAggregatePipelineDryRunFromObject(
    readJson(FIXTURE_PATH),
    {
      sourceSystem: "sigma_export",
      manifestOverrides: {
        org_id: "org_drifted",
        workflow_family: "claims_support",
        comparison_window: {
          window_start: "2026-05-01",
          window_end: "2026-05-30"
        }
      }
    }
  );

  assert.equal(packageResult.dry_run_state, "BLOCKED");
  assert.equal(packageResult.engine_executed, false);
  assert.ok(
    packageResult.validation_summary.gaps.some((gap) => gap.includes("org_id")),
    packageResult.validation_summary.gaps.join("; ")
  );
  assert.ok(
    packageResult.validation_summary.gaps.some((gap) => gap.includes("workflow_family")),
    packageResult.validation_summary.gaps.join("; ")
  );
  assert.ok(
    packageResult.validation_summary.gaps.some((gap) => gap.includes("comparison_window")),
    packageResult.validation_summary.gaps.join("; ")
  );
});

test("controlled aggregate pipeline dry run blocks source-owner and attestation drift", () => {
  const packageResult = runControlledAggregatePipelineDryRunFromObject(
    readJson(FIXTURE_PATH),
    {
      sourceSystem: "sigma_export",
      manifestOverrides: {
        source_owner_role: "customer_data_platform_owner",
        source_owner_attestation: {
          attestation_state: "attested",
          attested_by_role: "customer_analytics_owner",
          attested_at: "2026-06-01T00:00:00.000Z",
          caveats: [
            "Scrubbed aggregate export summary only.",
            "No live connector execution was performed."
          ],
          payload: { source_packages: [] }
        }
      }
    }
  );

  assert.equal(packageResult.dry_run_state, "BLOCKED");
  assert.equal(packageResult.engine_executed, false);
  for (const token of [
    "source_owner_role",
    "source_owner_attestation.attested_by_role",
    "source_owner_attestation field: payload",
    "source_owner_attestation.payload.source_packages"
  ]) {
    assert.ok(
      packageResult.validation_summary.gaps.some((gap) => gap.includes(token)),
      `missing gap for ${token}`
    );
  }
});

test("controlled aggregate pipeline dry run blocks finance, confidence, probability, causality, and productivity fields", () => {
  const packageResult = runControlledAggregatePipelineDryRunFromObject(
    readJson(FIXTURE_PATH),
    {
      manifestOverrides: {
        roi_output: 120000,
        ebitda_claim: "AI proved EBITDA impact",
        finance_review_context: "ready",
        finance_context_investigation_ready: true,
        confidence_score: 0.91,
        confidence_interval: [0.8, 0.9],
        probability_output: 0.72,
        likelihood: "high",
        p_value: 0.01,
        estimated_savings: 50000,
        causality_claim: "AI caused resolution time to drop",
        casuality_claim: "typo should still block",
        causal_lift: 0.2,
        productivity_claim: "agents became 20% more productive"
      }
    }
  );

  assert.equal(packageResult.dry_run_state, "BLOCKED");
  assert.equal(packageResult.engine_executed, false);
  for (const token of [
    "roi_output",
    "ebitda_claim",
    "finance_review_context",
    "finance_context_investigation_ready",
    "confidence_score",
    "confidence_interval",
    "probability_output",
    "likelihood",
    "p_value",
    "estimated_savings",
    "causality_claim",
    "casuality_claim",
    "causal_lift",
    "productivity_claim"
  ]) {
    assert.ok(
      packageResult.validation_summary.gaps.some((gap) => gap.includes(token)),
      `missing gap for ${token}`
    );
  }
});

test("controlled aggregate pipeline dry run validator rejects stale fixture and candidate hashes", () => {
  const packageResult = runControlledAggregatePipelineDryRunFromObject(readJson(FIXTURE_PATH));
  const tampered = clone(packageResult);
  tampered.manifest_ref.aggregate_fixture_hash = "a".repeat(64);
  tampered.manifest_ref.manifest_hash = "b".repeat(64);
  tampered.candidate_ref.candidate_integrity_hash = "c".repeat(64);

  const validation = validateControlledAggregatePipelineDryRun(tampered, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  for (const token of [
    "aggregate_fixture_hash",
    "manifest_hash",
    "candidate_integrity_hash"
  ]) {
    assert.ok(
      validation.gaps.some((gap) => gap.includes(token)),
      `missing gap for ${token}`
    );
  }
});

test("controlled aggregate pipeline dry run validator rejects compact candidate-ref drift", () => {
  const packageResult = runControlledAggregatePipelineDryRunFromObject(readJson(FIXTURE_PATH));
  const tampered = clone(packageResult);
  tampered.candidate_ref.measurement_cell_ref = "measurement_cell_other";
  tampered.candidate_ref.selected_metric_id = "metric_other";
  tampered.candidate_ref.source_package_count = 99;

  const validation = validateControlledAggregatePipelineDryRun(tampered, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  for (const token of [
    "measurement_cell_ref",
    "selected_metric_id",
    "source_package_count"
  ]) {
    assert.ok(
      validation.gaps.some((gap) => gap.includes(token)),
      `missing gap for ${token}`
    );
  }
});

test("shared controlled aggregate pipeline dry run validator requires fixture-bound expected proof for passed envelopes", () => {
  const packageResult = runControlledAggregatePipelineDryRunFromObject(readJson(FIXTURE_PATH));
  const validation = validateSharedControlledAggregatePipelineDryRun(packageResult);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("sourceFixture is required")),
    validation.gaps.join("; ")
  );
  assert.ok(
    validation.gaps.some((gap) => gap.includes("expectedCandidateRef is required")),
    validation.gaps.join("; ")
  );
});

test("shared controlled aggregate pipeline dry run builder cannot pass with an arbitrary candidate", () => {
  const fixture = readJson(FIXTURE_PATH);
  const manifest = buildControlledAggregatePipelineRunManifestFromFixture(fixture);
  const validDryRun = runControlledAggregatePipelineDryRunFromObject(fixture);
  const forgedCandidate = {
    assembly_state: "PASSED_INTERNAL_MEASUREMENT_CELL_CANDIDATE_REVIEW",
    review_state: "PASSED_INTERNAL_FIXTURE_REVIEW",
    engine_executed: true,
    candidate_integrity_hash: "f".repeat(64),
    assembly_ref: {
      assembly_run_id: "forged",
      measurement_cell_ref: "measurement_cell_forged"
    },
    internal_candidate_metadata: {
      measurement_cell_ref: "measurement_cell_forged",
      selected_metric_id: "support_median_resolution_hours",
      expectation_path_id: "expectation_path_support_median_resolution_hours_capacity",
      source_package_count: 5
    }
  };

  const dryRun = buildSharedControlledAggregatePipelineDryRun({
    pipelineRunManifest: manifest,
    controlledMeasurementCellAssembly: forgedCandidate,
    sourceFixture: fixture,
    manifestHash: "a".repeat(64),
    aggregateFixtureHash: "b".repeat(64),
    expectedReviewedSourceRefsHash:
      validDryRun.manifest_ref.reviewed_source_refs_hash,
    expectedCandidateRef: validDryRun.candidate_ref,
    generatedAt: fixture.generated_at
  });
  const validation = validateSharedControlledAggregatePipelineDryRun(dryRun, {
    sourceFixture: fixture
  });

  assert.notEqual(dryRun.dry_run_state, "PASSED_INTERNAL_PIPELINE_DRY_RUN_REVIEW");
  assert.equal(validation.valid, false);
});

test("controlled aggregate pipeline dry run keeps reviewed source-ref hashes aligned with candidate proof", () => {
  const fixture = readJson(FIXTURE_PATH);
  const dryRun = runControlledAggregatePipelineDryRunFromObject(fixture);
  const validation = validateControlledAggregatePipelineDryRun(dryRun, {
    sourceFixture: fixture
  });

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(
    dryRun.manifest_ref.reviewed_source_refs_hash,
    dryRun.candidate_ref.reviewed_source_refs_hash
  );
});

test("controlled aggregate pipeline dry run validator rejects unsafe language in passed caveats and gaps", () => {
  const packageResult = runControlledAggregatePipelineDryRunFromObject(readJson(FIXTURE_PATH));
  const tampered = clone(packageResult);
  tampered.required_caveats = [
    ...tampered.required_caveats,
    "ROI output ready with confidence score 91%."
  ];
  tampered.validation_summary.gaps = ["confidence score 91% and ROI output ready"];

  const validation = validateControlledAggregatePipelineDryRun(tampered, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("required_caveats")),
    validation.gaps.join("; ")
  );
  assert.ok(
    validation.gaps.some((gap) => gap.includes("validation_summary.gaps")),
    validation.gaps.join("; ")
  );
});

test("controlled aggregate pipeline dry run validator rejects nested metadata smuggling in compact refs", () => {
  const packageResult = runControlledAggregatePipelineDryRunFromObject(readJson(FIXTURE_PATH));
  const tampered = clone(packageResult);
  tampered.manifest_ref.payload = { aggregate: true };
  tampered.candidate_ref.extra = { compact: true };
  tampered.validation_summary.extra = { safe_sounding: "metadata" };

  const validation = validateControlledAggregatePipelineDryRun(tampered, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  for (const token of [
    "manifest_ref.payload",
    "candidate_ref.extra",
    "validation_summary.extra"
  ]) {
    assert.ok(
      validation.gaps.some((gap) => gap.includes(token)),
      `missing gap for ${token}`
    );
  }
});

test("controlled aggregate pipeline dry run validator rejects smuggled child payloads in passed packages", () => {
  const packageResult = runControlledAggregatePipelineDryRunFromObject(readJson(FIXTURE_PATH));
  const tampered = clone(packageResult);
  tampered.measurement_cell = { payload_json: { raw_rows: [] } };
  tampered.feeds.customer_facing_financial_output = true;

  const validation = validateControlledAggregatePipelineDryRun(tampered);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("Unsupported pipeline dry-run field: measurement_cell")),
    validation.gaps.join("; ")
  );
  assert.ok(
    validation.gaps.some((gap) => gap.includes("feeds.customer_facing_financial_output")),
    validation.gaps.join("; ")
  );
});

test("controlled aggregate pipeline dry run CLI emits compact dry-run metadata", () => {
  const output = execFileSync(
    "node",
    [
      "scripts/run_ai_value_controlled_aggregate_pipeline_dry_run.mjs",
      FIXTURE_PATH,
      "--source-system=sigma_export"
    ],
    { encoding: "utf8" }
  );
  const parsed = JSON.parse(output);
  const serialized = JSON.stringify(parsed);

  assert.equal(parsed.dry_run_state, "PASSED_INTERNAL_PIPELINE_DRY_RUN_REVIEW");
  assert.equal(parsed.source_system, "sigma_export");
  assert.equal(parsed.validation_summary.valid, true);
  assert.match(parsed.manifest_ref.manifest_hash, /^[a-f0-9]{64}$/);
  assert.match(parsed.candidate_ref.candidate_integrity_hash, /^[a-f0-9]{64}$/);
  assert.equal(Object.hasOwn(parsed, "measurement_cell"), false);
  assert.equal(Object.hasOwn(parsed, "pipeline_run_manifest"), false);
  for (const token of [
    "SELECT",
    "query_text",
    "raw_rows",
    "user_id",
    "employee_email",
    "\"source_packages\"",
    "\"measurement_plan\"",
    "customer_facing_financial_output\":true"
  ]) {
    assert.equal(serialized.includes(token), false, `${token} must not be emitted`);
  }
});

test("controlled aggregate pipeline dry run CLI blocks unsupported source systems", () => {
  let parsed = null;
  assert.throws(
    () => {
      try {
        execFileSync(
          "node",
          [
            "scripts/run_ai_value_controlled_aggregate_pipeline_dry_run.mjs",
            FIXTURE_PATH,
            "--source-system=snowflake_export"
          ],
          { encoding: "utf8" }
        );
      } catch (error) {
        parsed = JSON.parse(error.stdout);
        throw error;
      }
    },
    /Command failed/
  );
  assert.ok(parsed);
  assert.equal(parsed.dry_run_state, "BLOCKED");
  assert.equal(parsed.validation_summary.valid, false);
  assert.ok(
    parsed.validation_summary.gaps.some((gap) => gap.includes("source_system")),
    parsed.validation_summary.gaps.join("; ")
  );
});
