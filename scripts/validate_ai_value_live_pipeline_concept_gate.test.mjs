import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildLivePipelineConceptGateFromObject,
  validateLivePipelineConceptGate
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
  "durable_connector_run_storage",
  "durable_pipeline_run_storage",
  "durable_manifest_storage",
  "measurement_cell_series_persistence",
  "customer_facing_projection",
  "export_creation",
  "research_model_feed",
  "finance_output"
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

function gateHashForTest(gate) {
  return createHash("sha256")
    .update(JSON.stringify({
      schema_version: gate.schema_version,
      gate_id: gate.gate_id,
      gate_state: gate.gate_state,
      source_system: gate.source_system,
      source_owner_role: gate.source_owner_role,
      legal_trust_review_state: gate.legal_trust_review_state,
      proposed_execution_boundary: gate.proposed_execution_boundary,
      fluencytracr_execution_mode: gate.fluencytracr_execution_mode,
      prerequisites: gate.prerequisites,
      upstream_controls: gate.upstream_controls,
      review_refs: gate.review_refs,
      feeds: gate.feeds,
      boundary_policy: gate.boundary_policy,
      blocked_uses: gate.blocked_uses,
      required_caveats: gate.required_caveats
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

function assertPassedGate(gate, sourceSystem) {
  const validation = validateLivePipelineConceptGate(gate, {
    sourceFixture: readJson(FIXTURE_PATH)
  });
  const serialized = JSON.stringify(gate);

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(
    gate.gate_state,
    "READY_FOR_SEPARATE_LIVE_PIPELINE_CONCEPT_REVIEW"
  );
  assert.equal(gate.source_system, sourceSystem);
  assert.equal(gate.proposed_execution_boundary, "approved_glean_or_customer_environment");
  assert.equal(gate.fluencytracr_execution_mode, "no_live_execution");
  assert.equal(gate.feeds.live_pipeline_concept_review, true);
  assert.equal(gate.feeds.connector_boundary_requirements, true);
  assert.equal(gate.prerequisites.measurement_cell_snapshots_promoted, true);
  assert.equal(gate.prerequisites.measurement_cell_preflight_valid, true);
  assert.equal(
    gate.prerequisites.aggregate_boundary_bound_to_snapshot_candidate,
    true
  );
  assert.equal(gate.prerequisites.manifest_persistence_promoted, false);
  assert.equal(gate.prerequisites.series_persistence_promoted, false);
  for (const feed of REQUIRED_FALSE_FEEDS) {
    assert.equal(gate.feeds[feed], false, `${feed} must remain false`);
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
    "creates_measurement_cell_series",
    "creates_customer_projection",
    "creates_exports",
    "feeds_research_model",
    "emits_probability",
    "computes_roi",
    "emits_finance_output"
  ]) {
    assert.equal(gate.boundary_policy[field], false, `${field} must remain false`);
  }
  for (const key of FORBIDDEN_OUTPUT_KEYS) {
    assert.equal(hasNestedKey(gate, key), false, `${key} must not be emitted`);
  }
  assert.equal(serialized.includes("SELECT"), false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("bquxjob"), false);
}

test("live pipeline concept gate accepts BigQuery only as upstream concept review", () => {
  const gate = buildLivePipelineConceptGateFromObject(readJson(FIXTURE_PATH), {
    sourceSystem: "bigquery_export"
  });

  assertPassedGate(gate, "bigquery_export");
});

test("live pipeline concept gate accepts Sigma only as upstream concept review", () => {
  const gate = buildLivePipelineConceptGateFromObject(readJson(FIXTURE_PATH), {
    sourceSystem: "sigma_export"
  });

  assertPassedGate(gate, "sigma_export");
});

test("live pipeline concept gate rejects live execution, credentials, raw rows, and SQL", () => {
  const gate = buildLivePipelineConceptGateFromObject(readJson(FIXTURE_PATH), {
    sourceSystem: "bigquery_export",
    proposalOverrides: {
      fluencytracr_execution_mode: "live_execution",
      boundary_policy: {
        fluencytracr_runs_bigquery: true,
        fluencytracr_uses_credentials: true,
        fluencytracr_executes_queries: true,
        fluencytracr_receives_raw_rows: true
      },
      query_text: "SELECT user_id FROM raw_rows",
      raw_rows: [{ employee_email: "person@example.com" }],
      credential_ref: "secret://warehouse/key",
      source_refs_json: {
        job_id: "bquxjob_123"
      }
    }
  });
  const validation = validateLivePipelineConceptGate(gate, {
    sourceFixture: readJson(FIXTURE_PATH)
  });
  const serialized = JSON.stringify(gate);

  assert.equal(validation.valid, false);
  assert.equal(gate.gate_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(gate.fluencytracr_execution_mode, "no_live_execution");
  assert.equal(gate.boundary_policy.fluencytracr_runs_bigquery, false);
  assert.equal(gate.boundary_policy.fluencytracr_uses_credentials, false);
  assert.equal(hasNestedKey(gate, "raw_rows"), false);
  assert.equal(hasNestedKey(gate, "query_text"), false);
  assert.equal(hasNestedKey(gate, "credential_ref"), false);
  assert.equal(hasNestedKey(gate, "source_refs_json"), false);
  assert.equal(serialized.includes("SELECT user_id"), false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("secret://warehouse/key"), false);
  assert.equal(serialized.includes("bquxjob_123"), false);
});

test("live pipeline concept gate rejects live-only execution aliases", () => {
  const gate = buildLivePipelineConceptGateFromObject(readJson(FIXTURE_PATH), {
    sourceSystem: "bigquery_export",
    proposalOverrides: {
      feeds: {
        live_bigquery_execution: true,
        query_execution: true
      },
      boundary_policy: {
        fluencytracr_runs_bigquery: true,
        fluencytracr_executes_queries: true
      }
    }
  });
  const validation = validateLivePipelineConceptGate(gate, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  assert.equal(gate.gate_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(gate.feeds.live_bigquery_execution, false);
  assert.equal(gate.feeds.query_execution, false);
  assert.equal(gate.boundary_policy.fluencytracr_runs_bigquery, false);
  assert.equal(gate.boundary_policy.fluencytracr_executes_queries, false);
});

test("live pipeline concept gate rejects phrase-form live execution intent", () => {
  const gate = buildLivePipelineConceptGateFromObject(readJson(FIXTURE_PATH), {
    sourceSystem: "bigquery_export",
    proposalOverrides: {
      notes: "authorize live BigQuery execution and credential access"
    }
  });
  const validation = validateLivePipelineConceptGate(gate, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  assert.equal(gate.gate_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(gate.feeds.live_pipeline_concept_review, false);
  assert.equal(gate.feeds.connector_boundary_requirements, false);
  assert.equal(gate.boundary_policy.fluencytracr_runs_bigquery, false);
  assert.equal(gate.boundary_policy.fluencytracr_uses_credentials, false);
});

test("live pipeline concept gate rejects unsupported source systems instead of coercing to BigQuery", () => {
  const gate = buildLivePipelineConceptGateFromObject(readJson(FIXTURE_PATH), {
    sourceSystem: "bigquery_live"
  });
  const validation = validateLivePipelineConceptGate(gate, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  assert.equal(gate.gate_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(gate.source_system, "unsupported_source_system");
  assert.notEqual(gate.source_system, "bigquery_export");
  assert.equal(gate.feeds.live_bigquery_execution, false);
});

test("live pipeline concept gate holds when Measurement Cell preflight proof is not valid", () => {
  const gate = buildLivePipelineConceptGateFromObject(readJson(FIXTURE_PATH), {
    sourceSystem: "bigquery_export",
    preflight: {
      preflight_state: "PASSED_MEASUREMENT_CELL_PREFLIGHT",
      validation_summary: {
        valid: false,
        gaps: ["stale preflight proof"]
      }
    }
  });
  const validation = validateLivePipelineConceptGate(gate, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  assert.equal(gate.gate_state, "HOLD_FOR_VALID_MEASUREMENT_CELL_PREFLIGHT");
  assert.equal(gate.feeds.live_pipeline_concept_review, false);
  assert.equal(gate.feeds.connector_boundary_requirements, false);
  assert.equal(gate.feeds.live_bigquery_execution, false);
  assert.equal(gate.prerequisites.measurement_cell_preflight_valid, false);
});

test("live pipeline concept gate rejects forged fixture-bound gate identity", () => {
  const fixture = readJson(FIXTURE_PATH);
  const gate = buildLivePipelineConceptGateFromObject(fixture, {
    sourceSystem: "bigquery_export"
  });
  const tampered = clone(gate);
  tampered.gate_id = "live_pipeline_concept_gate_bigquery_export_other_workflow";
  tampered.concept_gate_hash = gateHashForTest(tampered);

  const validation = validateLivePipelineConceptGate(tampered, {
    sourceFixture: fixture
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("gate_id")),
    validation.gaps.join("; ")
  );
});

test("live pipeline concept gate requires fixture-bound validation for ready gates", () => {
  const gate = buildLivePipelineConceptGateFromObject(readJson(FIXTURE_PATH), {
    sourceSystem: "bigquery_export"
  });
  const validation = validateLivePipelineConceptGate(gate);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("sourceFixture is required")),
    validation.gaps.join("; ")
  );
});

test("live pipeline concept gate validator rejects held gates with ready feeds", () => {
  const gate = buildLivePipelineConceptGateFromObject(readJson(FIXTURE_PATH), {
    sourceSystem: "bigquery_export",
    preflight: {
      preflight_state: "PASSED_MEASUREMENT_CELL_PREFLIGHT",
      validation_summary: {
        valid: false,
        gaps: ["stale preflight proof"]
      }
    }
  });
  const tampered = clone(gate);
  tampered.feeds.live_pipeline_concept_review = true;
  tampered.feeds.connector_boundary_requirements = true;
  tampered.concept_gate_hash = gateHashForTest(tampered);

  const validation = validateLivePipelineConceptGate(tampered, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("must be false unless concept review is ready")),
    validation.gaps.join("; ")
  );
});

test("live pipeline concept gate rejects source-system overrides that desync preflight refs", () => {
  const fixture = readJson(FIXTURE_PATH);
  const gate = buildLivePipelineConceptGateFromObject(fixture, {
    sourceSystem: "bigquery_export",
    proposalOverrides: {
      source_system: "sigma_export"
    }
  });
  const validation = validateLivePipelineConceptGate(gate, {
    sourceFixture: fixture
  });

  assert.equal(validation.valid, false);
  assert.equal(gate.gate_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(gate.source_system, "bigquery_export");
  assert.equal(gate.review_refs.aggregate_source_system, "bigquery_export");
  assert.equal(gate.feeds.live_pipeline_concept_review, false);
  assert.equal(gate.feeds.connector_boundary_requirements, false);
  assert.ok(
    gate.validation_summary.gaps.some((gap) => gap.includes("source_system")),
    gate.validation_summary.gaps.join("; ")
  );
});

test("live pipeline concept gate validator rejects source-system and review-ref drift", () => {
  const gate = buildLivePipelineConceptGateFromObject(readJson(FIXTURE_PATH), {
    sourceSystem: "bigquery_export"
  });
  const tampered = clone(gate);
  tampered.source_system = "sigma_export";
  tampered.concept_gate_hash = "b".repeat(64);

  const validation = validateLivePipelineConceptGate(tampered);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) =>
      gap.includes("review_refs.aggregate_source_system")
    ),
    validation.gaps.join("; ")
  );
  assert.ok(
    validation.gaps.some((gap) => gap.includes("concept_gate_hash")),
    validation.gaps.join("; ")
  );
});

test("live pipeline concept gate rejects persistence, Series, customer output, and model overreach aliases", () => {
  const gate = buildLivePipelineConceptGateFromObject(readJson(FIXTURE_PATH), {
    sourceSystem: "sigma_export",
    proposalOverrides: {
      prerequisites: {
        manifest_persistence_promoted: true,
        series_persistence_promoted: true
      },
      feeds: {
        durable_pipeline_run_storage: true,
        measurement_cell_series_persistence: true,
        customer_facing_projection: true,
        export_creation: true,
        research_model_feed: true,
        finance_output: true
      },
      payload_json: {
        confidence_score: 0.91,
        probability: 0.8,
        roi: "approved",
        ebitda: "impact"
      }
    }
  });
  const validation = validateLivePipelineConceptGate(gate, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  assert.equal(gate.gate_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(gate.prerequisites.manifest_persistence_promoted, false);
  assert.equal(gate.prerequisites.series_persistence_promoted, false);
  assert.equal(gate.feeds.customer_facing_projection, false);
  assert.equal(gate.feeds.research_model_feed, false);
  assert.equal(hasNestedKey(gate, "payload_json"), false);
  assert.equal(hasNestedKey(gate, "confidence_score"), false);
});

test("live pipeline concept gate CLI emits compact concept-review output", () => {
  const output = execFileSync(
    "node",
    ["scripts/run_ai_value_live_pipeline_concept_gate.mjs", FIXTURE_PATH],
    { cwd: process.cwd(), encoding: "utf8" }
  );
  const parsed = JSON.parse(output);

  assert.equal(
    parsed.gate_state,
    "READY_FOR_SEPARATE_LIVE_PIPELINE_CONCEPT_REVIEW"
  );
  assert.equal(parsed.validation_summary.valid, true);
  assert.equal(parsed.feeds.live_bigquery_execution, false);
  assert.equal(parsed.feeds.credential_access, false);
  assert.equal(parsed.feeds.raw_row_ingestion, false);
  assert.equal(hasNestedKey(parsed, "raw_rows"), false);
  assert.equal(hasNestedKey(parsed, "payload_json"), false);
}
);
