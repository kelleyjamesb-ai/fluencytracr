import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildControlledAggregateConnectorAdapter as buildSharedControlledAggregateConnectorAdapter,
  validateControlledAggregateConnectorAdapter as validateSharedControlledAggregateConnectorAdapter
} from "../shared/dist/aiValueEngine/index.js";

import {
  CONTROLLED_AGGREGATE_CONNECTOR_ADAPTER_SCHEMA_VERSION,
  buildControlledAggregateConnectorManifestFromDryRun,
  pipelineDryRunRefFromDryRun,
  runControlledAggregateConnectorAdapterFromObject,
  validateControlledAggregateConnectorAdapter
} from "./run_ai_value_controlled_aggregate_connector_adapter.mjs";

import {
  runControlledAggregatePipelineDryRunFromObject
} from "./run_ai_value_controlled_aggregate_pipeline_dry_run.mjs";

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
  "durable_connector_run_storage",
  "source_package_clearance",
  "measurement_cell_snapshot_candidate",
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

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])])
  );
}

function sha256Json(value) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

function hasNestedKey(value, key) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => hasNestedKey(item, key));
  return Object.entries(value).some(
    ([nestedKey, nestedValue]) => nestedKey === key || hasNestedKey(nestedValue, key)
  );
}

function assertPassedAdapter(adapter, sourceSystem) {
  const validation = validateControlledAggregateConnectorAdapter(adapter, {
    sourceFixture: readJson(FIXTURE_PATH)
  });
  const serialized = JSON.stringify(adapter);

  assert.equal(
    adapter.schema_version,
    CONTROLLED_AGGREGATE_CONNECTOR_ADAPTER_SCHEMA_VERSION
  );
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(adapter.adapter_state, "PASSED_INTERNAL_CONNECTOR_ADAPTER_REVIEW");
  assert.equal(adapter.source_system, sourceSystem);
  assert.equal(adapter.internal_review_executed, true);
  assert.equal(adapter.validation_summary.connector_manifest_valid, true);
  assert.equal(adapter.validation_summary.pipeline_dry_run_valid, true);
  assert.equal(adapter.validation_summary.connector_review_packet_valid, true);
  assert.equal(adapter.feeds.aggregate_connector_adapter_review, true);
  assert.equal(adapter.feeds.connector_review_packet, true);
  assert.equal(adapter.feeds.measurement_cell_candidate_proof, true);
  assert.equal(
    adapter.connector_review_packet.review_state,
    "READY_FOR_INTERNAL_CONNECTOR_REVIEW"
  );
  assert.equal(
    adapter.connector_review_packet.connector_manifest_ref.connector_manifest_hash,
    adapter.connector_manifest_ref.connector_manifest_hash
  );
  assert.equal(
    adapter.connector_review_packet.pipeline_dry_run_ref.candidate_integrity_hash,
    adapter.pipeline_dry_run_ref.candidate_integrity_hash
  );
  assert.match(adapter.connector_manifest_ref.connector_manifest_hash, /^[a-f0-9]{64}$/);
  assert.match(adapter.pipeline_dry_run_ref.manifest_hash, /^[a-f0-9]{64}$/);
  assert.match(adapter.pipeline_dry_run_ref.candidate_integrity_hash, /^[a-f0-9]{64}$/);
  for (const feed of REQUIRED_FALSE_FEEDS) {
    assert.equal(adapter.feeds[feed], false, `${feed} must remain false`);
  }
  for (const field of [
    "runs_bigquery",
    "runs_sigma",
    "runs_glean_query",
    "runs_customer_connectors",
    "runs_live_connectors",
    "uses_credentials",
    "executes_queries",
    "stores_query_strings",
    "ingests_source_records",
    "stores_raw_source_data",
    "persists_connector_run",
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
    assert.equal(adapter.boundary_policy[field], false, `${field} must remain false`);
  }
  for (const key of FORBIDDEN_OUTPUT_KEYS) {
    assert.equal(hasNestedKey(adapter, key), false, `${key} must not be emitted`);
  }
  assert.equal(serialized.includes("SELECT"), false);
  assert.equal(serialized.includes("person@example.com"), false);
}

test("controlled aggregate connector adapter accepts BigQuery-shaped reviewed aggregate exports", () => {
  const adapter = runControlledAggregateConnectorAdapterFromObject(
    readJson(FIXTURE_PATH),
    { sourceSystem: "bigquery_export" }
  );

  assertPassedAdapter(adapter, "bigquery_export");
});

test("controlled aggregate connector adapter accepts Sigma-shaped reviewed aggregate exports", () => {
  const adapter = runControlledAggregateConnectorAdapterFromObject(
    readJson(FIXTURE_PATH),
    { sourceSystem: "sigma_export" }
  );

  assertPassedAdapter(adapter, "sigma_export");
});

test("controlled aggregate connector adapter rejects unsupported source systems", () => {
  const adapter = runControlledAggregateConnectorAdapterFromObject(
    readJson(FIXTURE_PATH),
    { sourceSystem: "snowflake_export" }
  );

  assert.equal(adapter.adapter_state, "BLOCKED");
  assert.equal(adapter.source_system, null);
  assert.equal(adapter.internal_review_executed, false);
  assert.ok(
    adapter.validation_summary.gaps.some((gap) => gap.includes("source_system")),
    adapter.validation_summary.gaps.join("; ")
  );
});

test("controlled aggregate connector adapter blocks cross-source dry-run binding", () => {
  const fixture = readJson(FIXTURE_PATH);
  const dryRun = runControlledAggregatePipelineDryRunFromObject(fixture, {
    sourceSystem: "bigquery_export"
  });
  const manifest = buildControlledAggregateConnectorManifestFromDryRun(dryRun, {
    sourceSystem: "sigma_export"
  });
  const manifestHash = sha256Json(manifest);
  const adapter = buildSharedControlledAggregateConnectorAdapter({
    connectorManifest: manifest,
    pipelineDryRun: dryRun,
    connectorManifestHash: manifestHash,
    expectedConnectorManifestHash: manifestHash,
    expectedPipelineDryRunRef: pipelineDryRunRefFromDryRun(dryRun),
    generatedAt: fixture.generated_at
  });

  assert.equal(adapter.adapter_state, "BLOCKED");
  for (const token of [
    "source_system must match",
    "aggregate_export_ref must match"
  ]) {
    assert.ok(
      adapter.validation_summary.gaps.some((gap) => gap.includes(token)),
      `missing gap for ${token}`
    );
  }
});

test("controlled aggregate connector adapter blocks credentials, live execution, query text, and raw rows", () => {
  const adapter = runControlledAggregateConnectorAdapterFromObject(
    readJson(FIXTURE_PATH),
    {
      sourceSystem: "bigquery_export",
      manifestOverrides: {
        boundary_policy: {
          runs_bigquery: true,
          runs_live_connectors: true,
          uses_credentials: true,
          executes_queries: true,
          ingests_source_records: true
        },
        export_contract: {
          row_level_data_present: true,
          query_text_present: true,
          credentials_present: true
        },
        query_text: "SELECT employee_email, user_id FROM raw_rows",
        raw_rows: [{ user_id: "user_123", employee_email: "person@example.com" }],
        credential_ref: "secret://bigquery/customer"
      }
    }
  );
  const serialized = JSON.stringify(adapter);

  assert.equal(adapter.adapter_state, "BLOCKED");
  assert.equal(adapter.internal_review_executed, false);
  assert.equal(adapter.connector_review_packet, null);
  for (const token of [
    "boundary_policy.runs_bigquery",
    "boundary_policy.runs_live_connectors",
    "boundary_policy.uses_credentials",
    "boundary_policy.executes_queries",
    "boundary_policy.ingests_source_records",
    "export_contract.row_level_data_present",
    "export_contract.query_text_present",
    "export_contract.credentials_present",
    "query_text",
    "raw_rows",
    "credential_ref"
  ]) {
    assert.ok(
      adapter.validation_summary.gaps.some((gap) => gap.includes(token)),
      `missing gap for ${token}`
    );
  }
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("SELECT employee_email"), false);
});

test("controlled aggregate connector adapter blocks source-owner and attestation drift", () => {
  const adapter = runControlledAggregateConnectorAdapterFromObject(
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
            "Reviewed scrubbed aggregate export only.",
            "No source-system execution was performed."
          ],
          source_packages: []
        }
      }
    }
  );

  assert.equal(adapter.adapter_state, "BLOCKED");
  for (const token of [
    "source_owner_role",
    "source_owner_attestation.attested_by_role",
    "source_owner_attestation field: source_packages",
    "source_owner_attestation.source_packages"
  ]) {
    assert.ok(
      adapter.validation_summary.gaps.some((gap) => gap.includes(token)),
      `missing gap for ${token}`
    );
  }
});

test("controlled aggregate connector adapter blocks identity, window, and source-ref drift", () => {
  const adapter = runControlledAggregateConnectorAdapterFromObject(
    readJson(FIXTURE_PATH),
    {
      sourceSystem: "bigquery_export",
      manifestOverrides: {
        org_id: "org_drifted",
        workflow_family: "claims_support",
        comparison_window: {
          window_start: "2026-05-01",
          window_end: "2026-05-30"
        },
        aggregate_export_ref: "bigquery_export_eyj1c2vyx2lkijoxmjm"
      }
    }
  );

  assert.equal(adapter.adapter_state, "BLOCKED");
  for (const token of [
    "org_id",
    "workflow_family",
    "comparison_window",
    "aggregate_export_ref"
  ]) {
    assert.ok(
      adapter.validation_summary.gaps.some((gap) => gap.includes(token)),
      `missing gap for ${token}`
    );
  }
});

test("controlled aggregate connector adapter blocks semantic authorization aliases in source refs", () => {
  const adapter = runControlledAggregateConnectorAdapterFromObject(
    readJson(FIXTURE_PATH),
    {
      sourceSystem: "bigquery_export",
      manifestOverrides: {
        aggregate_export_ref: "bigquery_export_live_bigquery_execution"
      }
    }
  );

  assert.equal(adapter.adapter_state, "BLOCKED");
  assert.ok(
    adapter.validation_summary.gaps.some((gap) => gap.includes("aggregate_export_ref")),
    adapter.validation_summary.gaps.join("; ")
  );
});

test("controlled aggregate connector adapter blocks positive authorization aliases in manifest allowed uses", () => {
  const adapter = runControlledAggregateConnectorAdapterFromObject(
    readJson(FIXTURE_PATH),
    {
      sourceSystem: "bigquery_export",
      manifestOverrides: {
        allowed_uses: [
          "aggregate_connector_adapter_review",
          "connector_review_packet",
          "controlled_pipeline_dry_run_reference",
          "measurement_cell_candidate_proof_reference",
          "bigquery_execution"
        ]
      }
    }
  );

  assert.equal(adapter.adapter_state, "BLOCKED");
  assert.ok(
    adapter.validation_summary.gaps.some((gap) => gap.includes("allowed_uses")),
    adapter.validation_summary.gaps.join("; ")
  );
});

test("controlled aggregate connector adapter blocks structured payloads inside manifest blocked uses", () => {
  const adapter = runControlledAggregateConnectorAdapterFromObject(
    readJson(FIXTURE_PATH),
    {
      sourceSystem: "bigquery_export",
      manifestOverrides: {
        blocked_uses: [
          "live_bigquery_execution",
          { raw_rows: [], query_text: "SELECT user_id FROM raw_rows" },
          "live_glean_query"
        ]
      }
    }
  );
  const serialized = JSON.stringify(adapter);

  assert.equal(adapter.adapter_state, "BLOCKED");
  assert.equal(adapter.internal_review_executed, false);
  assert.ok(
    adapter.validation_summary.gaps.some((gap) => gap.includes("blocked_uses")),
    adapter.validation_summary.gaps.join("; ")
  );
  assert.equal(serialized.includes("SELECT user_id"), false);
});

test("controlled aggregate connector adapter rejects stale dry-run refs and manifest hash drift", () => {
  const adapter = runControlledAggregateConnectorAdapterFromObject(readJson(FIXTURE_PATH));
  const tampered = clone(adapter);
  tampered.connector_manifest_ref.connector_manifest_hash = "a".repeat(64);
  tampered.pipeline_dry_run_ref.manifest_hash = "b".repeat(64);
  tampered.pipeline_dry_run_ref.candidate_integrity_hash = "c".repeat(64);

  const validation = validateControlledAggregateConnectorAdapter(tampered, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  for (const token of [
    "connector_manifest_hash",
    "pipeline_dry_run_ref.manifest_hash",
    "pipeline_dry_run_ref.candidate_integrity_hash"
  ]) {
    assert.ok(
      validation.gaps.some((gap) => gap.includes(token)),
      `missing gap for ${token}`
    );
  }
});

test("shared controlled aggregate connector adapter builder rejects stale manifest hash proof", () => {
  const fixture = readJson(FIXTURE_PATH);
  const dryRun = runControlledAggregatePipelineDryRunFromObject(fixture);
  const manifest = buildControlledAggregateConnectorManifestFromDryRun(dryRun);
  const adapter = buildSharedControlledAggregateConnectorAdapter({
    connectorManifest: manifest,
    pipelineDryRun: dryRun,
    connectorManifestHash: "a".repeat(64),
    expectedConnectorManifestHash: sha256Json(manifest),
    expectedPipelineDryRunRef: pipelineDryRunRefFromDryRun(dryRun),
    generatedAt: fixture.generated_at
  });

  assert.notEqual(adapter.adapter_state, "PASSED_INTERNAL_CONNECTOR_ADAPTER_REVIEW");
  assert.ok(
    adapter.validation_summary.gaps.some((gap) => gap.includes("connectorManifestHash")),
    adapter.validation_summary.gaps.join("; ")
  );
});

test("shared controlled aggregate connector adapter builder rejects missing source export ref proof", () => {
  const fixture = readJson(FIXTURE_PATH);
  const dryRun = runControlledAggregatePipelineDryRunFromObject(fixture);
  const forgedDryRun = clone(dryRun);
  delete forgedDryRun.manifest_ref.source_export_ref;
  const manifest = buildControlledAggregateConnectorManifestFromDryRun(forgedDryRun);
  const manifestHash = sha256Json(manifest);
  const adapter = buildSharedControlledAggregateConnectorAdapter({
    connectorManifest: manifest,
    pipelineDryRun: forgedDryRun,
    connectorManifestHash: manifestHash,
    expectedConnectorManifestHash: manifestHash,
    expectedPipelineDryRunRef: pipelineDryRunRefFromDryRun(forgedDryRun),
    generatedAt: fixture.generated_at
  });

  assert.notEqual(adapter.adapter_state, "PASSED_INTERNAL_CONNECTOR_ADAPTER_REVIEW");
  assert.ok(
    adapter.validation_summary.gaps.some((gap) => gap.includes("source_export_ref")),
    adapter.validation_summary.gaps.join("; ")
  );
});

test("shared controlled aggregate connector adapter validator requires fixture-bound expected proof", () => {
  const adapter = runControlledAggregateConnectorAdapterFromObject(readJson(FIXTURE_PATH));
  const validation = validateSharedControlledAggregateConnectorAdapter(adapter);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("sourceFixture is required")),
    validation.gaps.join("; ")
  );
  assert.ok(
    validation.gaps.some((gap) => gap.includes("expectedConnectorManifestHash is required")),
    validation.gaps.join("; ")
  );
  assert.ok(
    validation.gaps.some((gap) => gap.includes("expectedConnectorManifestRef is required")),
    validation.gaps.join("; ")
  );
  assert.ok(
    validation.gaps.some((gap) => gap.includes("expectedPipelineDryRunRef is required")),
    validation.gaps.join("; ")
  );
});

test("shared controlled aggregate connector adapter builder cannot pass with an arbitrary dry-run proof", () => {
  const fixture = readJson(FIXTURE_PATH);
  const validDryRun = runControlledAggregatePipelineDryRunFromObject(fixture);
  const manifest = buildControlledAggregateConnectorManifestFromDryRun(validDryRun);
  const forgedDryRun = clone(validDryRun);
  forgedDryRun.dry_run_id = "forged_dry_run";
  forgedDryRun.manifest_ref.manifest_hash = "f".repeat(64);
  forgedDryRun.candidate_ref.candidate_integrity_hash = "e".repeat(64);
  const manifestHash = sha256Json(manifest);

  const adapter = buildSharedControlledAggregateConnectorAdapter({
    connectorManifest: manifest,
    pipelineDryRun: forgedDryRun,
    connectorManifestHash: manifestHash,
    expectedConnectorManifestHash: manifestHash,
    expectedPipelineDryRunRef: pipelineDryRunRefFromDryRun(validDryRun),
    generatedAt: fixture.generated_at
  });
  const validation = validateSharedControlledAggregateConnectorAdapter(adapter, {
    expectedConnectorManifestHash: "a".repeat(64),
    expectedPipelineDryRunRef: pipelineDryRunRefFromDryRun(validDryRun)
  });

  assert.notEqual(adapter.adapter_state, "PASSED_INTERNAL_CONNECTOR_ADAPTER_REVIEW");
  assert.equal(validation.valid, false);
});

test("controlled aggregate connector adapter validator rejects review-packet projection drift", () => {
  const adapter = runControlledAggregateConnectorAdapterFromObject(readJson(FIXTURE_PATH));
  const tampered = clone(adapter);
  tampered.connector_review_packet.review_packet_id = "connector_review_packet_sigma_export_wrong_workflow";
  tampered.connector_review_packet.allowed_uses.push("customer_facing_output");
  tampered.connector_review_packet.source_system = "sigma_export";
  tampered.connector_review_packet.identity_binding.org_id = "org_drifted";
  tampered.connector_review_packet.owner_review.attested_by_role = "different_owner";
  tampered.validation_summary.connector_manifest_valid = false;
  tampered.validation_summary.gaps = "manually cleared";

  const validation = validateControlledAggregateConnectorAdapter(tampered, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  for (const token of [
    "connector_review_packet.review_packet_id",
    "connector_review_packet.source_system",
    "connector_review_packet.allowed_uses",
    "connector_review_packet.identity_binding.org_id",
    "connector_review_packet.owner_review.attested_by_role",
    "validation_summary.connector_manifest_valid",
    "validation_summary.gaps"
  ]) {
    assert.ok(
      validation.gaps.some((gap) => gap.includes(token)),
      `missing gap for ${token}`
    );
  }
});

test("controlled aggregate connector adapter validator rejects positive authorization aliases", () => {
  const adapter = runControlledAggregateConnectorAdapterFromObject(readJson(FIXTURE_PATH));
  const tampered = clone(adapter);
  tampered.feeds.bigquery_execution = true;
  tampered.feeds.source_package_cleared = true;
  tampered.boundary_policy.connector_execution_authorized = true;
  tampered.connector_review_packet.boundary_policy.connector_execution_authorized = true;

  const validation = validateControlledAggregateConnectorAdapter(tampered, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  for (const token of [
    "feeds.bigquery_execution",
    "feeds.source_package_cleared",
    "boundary_policy.connector_execution_authorized",
    "connector_review_packet.boundary_policy"
  ]) {
    assert.ok(
      validation.gaps.some((gap) => gap.includes(token)),
      `missing gap for ${token}`
    );
  }
});

test("controlled aggregate connector adapter validator sanitizes unsafe diagnostics", () => {
  const adapter = runControlledAggregateConnectorAdapterFromObject(readJson(FIXTURE_PATH));
  const tampered = clone(adapter);
  tampered.adapter_run_id = "bad person@example.com";
  tampered.adapter_state = "bad SELECT user_id FROM raw_rows person@example.com";
  tampered.schema_version = "bad SELECT user_id FROM raw_rows person@example.com";
  tampered.source_system = "bad person@example.com";

  const validation = validateControlledAggregateConnectorAdapter(tampered, {
    sourceFixture: readJson(FIXTURE_PATH)
  });
  const serializedGaps = JSON.stringify(validation.gaps);

  assert.equal(validation.valid, false);
  assert.equal(validation.adapter_run_id, null);
  assert.equal(validation.source_system, null);
  assert.equal(serializedGaps.includes("person@example.com"), false);
  assert.equal(serializedGaps.includes("SELECT user_id"), false);
  assert.equal(serializedGaps.includes("raw_rows"), false);
});

test("controlled aggregate connector adapter validator rejects smuggled child payloads", () => {
  const adapter = runControlledAggregateConnectorAdapterFromObject(readJson(FIXTURE_PATH));
  const tampered = clone(adapter);
  tampered.connector_review_packet.payload_json = { raw_rows: [] };
  tampered.measurement_cell = { source_packages: [] };
  tampered.feeds.customer_facing_financial_output = true;
  tampered.blocked_uses = clone(tampered.blocked_uses);
  tampered.blocked_uses.push({ raw_rows: [], query_text: "SELECT user_id FROM raw_rows" });

  const validation = validateControlledAggregateConnectorAdapter(tampered, {
    sourceFixture: readJson(FIXTURE_PATH)
  });

  assert.equal(validation.valid, false);
  for (const token of [
    "connector_review_packet.payload_json",
    "measurement_cell",
    "feeds.customer_facing_financial_output",
    "blocked_uses"
  ]) {
    assert.ok(
      validation.gaps.some((gap) => gap.includes(token)),
      `missing gap for ${token}`
    );
  }
});

test("controlled aggregate connector adapter CLI emits compact review packet metadata", () => {
  const output = execFileSync(
    "node",
    [
      "scripts/run_ai_value_controlled_aggregate_connector_adapter.mjs",
      FIXTURE_PATH,
      "--source-system=sigma_export"
    ],
    { encoding: "utf8" }
  );
  const parsed = JSON.parse(output);
  const serialized = JSON.stringify(parsed);

  assert.equal(parsed.adapter_state, "PASSED_INTERNAL_CONNECTOR_ADAPTER_REVIEW");
  assert.equal(parsed.source_system, "sigma_export");
  assert.equal(parsed.validation_summary.valid, true);
  assert.match(parsed.connector_manifest_ref.connector_manifest_hash, /^[a-f0-9]{64}$/);
  assert.match(parsed.pipeline_dry_run_ref.candidate_integrity_hash, /^[a-f0-9]{64}$/);
  assert.equal(Object.hasOwn(parsed, "connector_manifest"), false);
  assert.equal(Object.hasOwn(parsed, "pipeline_run_manifest"), false);
  for (const token of [
    "SELECT",
    "query_text",
    "raw_rows",
    "user_id",
    "employee_email",
    "\"source_packages\"",
    "\"measurement_cell\"",
    "customer_facing_financial_output\":true"
  ]) {
    assert.equal(serialized.includes(token), false, `${token} must not be emitted`);
  }
});

test("controlled aggregate connector adapter CLI blocks unsupported source systems", () => {
  let parsed = null;
  assert.throws(
    () => {
      try {
        execFileSync(
          "node",
          [
            "scripts/run_ai_value_controlled_aggregate_connector_adapter.mjs",
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
  assert.equal(parsed.adapter_state, "BLOCKED");
  assert.equal(parsed.validation_summary.valid, false);
  assert.ok(
    parsed.validation_summary.gaps.some((gap) => gap.includes("source_system")),
    parsed.validation_summary.gaps.join("; ")
  );
});
