#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  AI_VALUE_CONTROLLED_AGGREGATE_CONNECTOR_ADAPTER_SCHEMA_VERSION,
  buildControlledAggregateConnectorAdapter,
  validateControlledAggregateConnectorAdapter as validateSharedControlledAggregateConnectorAdapter
} from "../shared/dist/aiValueEngine/index.js";

import {
  runControlledAggregatePipelineDryRunFromObject,
  validateControlledAggregatePipelineDryRun
} from "./run_ai_value_controlled_aggregate_pipeline_dry_run.mjs";

export const CONTROLLED_AGGREGATE_CONNECTOR_ADAPTER_SCHEMA_VERSION =
  AI_VALUE_CONTROLLED_AGGREGATE_CONNECTOR_ADAPTER_SCHEMA_VERSION;

const DEFAULT_FIXTURE_PATH =
  "docs/contracts/ai-value-real-data-intake-packet-runner/examples/controlled-aggregate-fixture-review-ready.json";

const REQUIRED_BLOCKED_USES = [
  "live_bigquery_execution",
  "live_sigma_execution",
  "live_glean_query",
  "customer_connector_execution",
  "credential_access",
  "query_execution",
  "raw_row_ingestion",
  "connector_run_persistence",
  "source_package_clearance",
  "measurement_cell_snapshot_persistence",
  "measurement_cell_series_persistence",
  "customer_facing_output",
  "customer_facing_financial_output",
  "customer_facing_economic_output",
  "financial_attribution",
  "realized_roi",
  "ebita_claim",
  "ebitda_claim",
  "causality_claim",
  "productivity_claim",
  "probability_output",
  "research_model_promotion"
];

const FALSE_BOUNDARY_POLICY = {
  runs_bigquery: false,
  runs_sigma: false,
  runs_glean_query: false,
  runs_customer_connectors: false,
  runs_live_connectors: false,
  uses_credentials: false,
  executes_queries: false,
  stores_query_strings: false,
  ingests_source_records: false,
  stores_raw_source_data: false,
  persists_connector_run: false,
  creates_ingestion_jobs: false,
  creates_backend_routes: false,
  creates_frontend_ui: false,
  creates_repositories: false,
  creates_migrations: false,
  creates_schemas: false,
  writes_output_files: false,
  authorizes_research_model: false,
  emits_probability: false,
  computes_roi: false,
  emits_financial_attribution: false,
  emits_customer_facing_output: false
};

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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function deepMerge(base, overrides) {
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) {
    return base;
  }
  const merged = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      base[key] &&
      typeof base[key] === "object" &&
      !Array.isArray(base[key])
    ) {
      merged[key] = deepMerge(base[key], value);
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

function safeIdPart(value) {
  return String(value ?? "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function pipelineDryRunRefFromDryRun(dryRun) {
  return {
    dry_run_id: dryRun?.dry_run_id ?? null,
    dry_run_state: dryRun?.dry_run_state ?? null,
    source_system: dryRun?.source_system ?? null,
    source_export_ref: dryRun?.manifest_ref?.source_export_ref ?? null,
    manifest_hash: dryRun?.manifest_ref?.manifest_hash ?? null,
    aggregate_fixture_hash: dryRun?.manifest_ref?.aggregate_fixture_hash ?? null,
    reviewed_source_refs_hash: dryRun?.manifest_ref?.reviewed_source_refs_hash ?? null,
    reviewed_aggregate_context_hash: dryRun?.manifest_ref?.reviewed_aggregate_context_hash ?? null,
    reviewed_blueprint_expectation_hash:
      dryRun?.manifest_ref?.reviewed_blueprint_expectation_hash ?? null,
    candidate_integrity_hash: dryRun?.candidate_ref?.candidate_integrity_hash ?? null,
    measurement_cell_ref: dryRun?.candidate_ref?.measurement_cell_ref ?? null,
    expectation_path_id: dryRun?.candidate_ref?.expectation_path_id ?? null
  };
}

function sourceRefFor(sourceSystem, dryRun) {
  if (dryRun?.source_system === sourceSystem && dryRun?.manifest_ref?.source_export_ref) {
    return dryRun.manifest_ref.source_export_ref;
  }
  const base = safeIdPart(
    dryRun?.manifest_ref?.source_export_ref ??
      dryRun?.manifest_ref?.workflow_family ??
      "controlled_fixture"
  );
  const suffix = base.startsWith(`${sourceSystem}_`)
    ? base.slice(`${sourceSystem}_`.length)
    : base;
  return `${sourceSystem}_${suffix}`;
}

function connectorManifestRefFromManifest(manifest, connectorManifestHash) {
  const sourceSystem = manifest?.source_system ?? null;
  return {
    connector_manifest_id: manifest?.connector_manifest_id ?? null,
    source_system: ["bigquery_export", "sigma_export"].includes(sourceSystem)
      ? sourceSystem
      : null,
    adapter_mode: manifest?.adapter_mode === "reviewed_aggregate_export"
      ? "reviewed_aggregate_export"
      : null,
    execution_mode: manifest?.execution_mode === "no_live_execution"
      ? "no_live_execution"
      : null,
    aggregate_export_ref: manifest?.aggregate_export_ref ?? null,
    connector_manifest_hash: connectorManifestHash ?? null,
    org_id: manifest?.org_id ?? null,
    client_id: manifest?.client_id ?? null,
    measurement_plan_id: manifest?.measurement_plan_id ?? null,
    workflow_family: manifest?.workflow_family ?? null,
    function_area: manifest?.function_area ?? null,
    cohort_key: manifest?.cohort_key ?? null,
    baseline_window: manifest?.baseline_window ?? null,
    comparison_window: manifest?.comparison_window ?? null,
    source_owner_role: manifest?.source_owner_role ?? null,
    owner_approval_state: manifest?.owner_approval_state === "approved" ? "approved" : null,
    review_state: manifest?.review_state === "clear" ? "clear" : null,
    attestation_state: manifest?.source_owner_attestation?.attestation_state === "attested"
      ? "attested"
      : null,
    attested_by_role: manifest?.source_owner_attestation?.attested_by_role ?? null,
    attested_at: manifest?.source_owner_attestation?.attested_at ?? null,
    aggregate_grain: manifest?.export_contract?.aggregate_grain === "workflow_function_cohort_window"
      ? "workflow_function_cohort_window"
      : null
  };
}

export function buildControlledAggregateConnectorManifestFromDryRun(
  dryRun,
  options = {}
) {
  const sourceSystem = options.sourceSystem ?? dryRun?.source_system ?? "bigquery_export";
  const ownerRole = sourceSystem === "sigma_export"
    ? "customer_analytics_owner"
    : "customer_data_platform_owner";
  const manifestRef = dryRun?.manifest_ref ?? {};
  const manifest = {
    connector_manifest_id:
      `controlled_${sourceSystem}_aggregate_connector_${safeIdPart(manifestRef.workflow_family)}`,
    source_system: sourceSystem,
    adapter_mode: "reviewed_aggregate_export",
    execution_mode: "no_live_execution",
    org_id: manifestRef.org_id ?? null,
    client_id: manifestRef.client_id ?? null,
    measurement_plan_id: manifestRef.measurement_plan_id ?? null,
    workflow_family: manifestRef.workflow_family ?? null,
    function_area: manifestRef.function_area ?? null,
    cohort_key: manifestRef.cohort_key ?? null,
    baseline_window: manifestRef.baseline_window ?? null,
    comparison_window: manifestRef.comparison_window ?? null,
    source_owner_role: ownerRole,
    owner_approval_state: "approved",
    review_state: "clear",
    source_owner_attestation: {
      attestation_state: "attested",
      attested_by_role: ownerRole,
      attested_at: dryRun?.generated_at ?? new Date(0).toISOString(),
      caveats: [
        "Reviewed scrubbed aggregate export only.",
        "No source-system execution was performed."
      ]
    },
    aggregate_export_ref: sourceRefFor(sourceSystem, dryRun),
    pipeline_dry_run_ref: pipelineDryRunRefFromDryRun(dryRun),
    export_contract: {
      approved_export_only: true,
      scrubbed_aggregate_only: true,
      aggregate_grain: "workflow_function_cohort_window",
      row_level_data_present: false,
      query_text_present: false,
      credentials_present: false,
      prompt_or_transcript_present: false,
      user_identifier_present: false
    },
    allowed_uses: [
      "aggregate_connector_adapter_review",
      "connector_review_packet",
      "controlled_pipeline_dry_run_reference",
      "measurement_cell_candidate_proof_reference"
    ],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    boundary_policy: { ...FALSE_BOUNDARY_POLICY },
    required_caveats: [
      "Connector adapter manifest only; it does not authorize live BigQuery or Sigma execution.",
      "Connector review packet is not Source Package clearance.",
      "Connector review packet is not Measurement Cell snapshot persistence."
    ],
    generated_at: dryRun?.generated_at ?? new Date(0).toISOString()
  };

  return deepMerge(manifest, options.manifestOverrides);
}

export function runControlledAggregateConnectorAdapterFromObject(
  sourceFixture,
  options = {}
) {
  const fixture = clone(sourceFixture);
  const dryRun = runControlledAggregatePipelineDryRunFromObject(fixture, {
    sourceSystem: options.sourceSystem,
    measurementPlanOverride: options.measurementPlanOverride
  });
  const dryRunValidation = validateControlledAggregatePipelineDryRun(dryRun, {
    sourceFixture: fixture,
    measurementPlanOverride: options.measurementPlanOverride
  });
  const manifest = buildControlledAggregateConnectorManifestFromDryRun(
    dryRun,
    options
  );
  const connectorManifestHash = sha256Json(manifest);
  return buildControlledAggregateConnectorAdapter({
    connectorManifest: manifest,
    pipelineDryRun: dryRun,
    connectorManifestHash,
    expectedConnectorManifestHash: connectorManifestHash,
    expectedPipelineDryRunRef: dryRunValidation.valid
      ? pipelineDryRunRefFromDryRun(dryRun)
      : null,
    generatedAt: manifest.generated_at
  });
}

export function validateControlledAggregateConnectorAdapter(adapter, options = {}) {
  const enrichedOptions = { ...options };
  if (options.sourceFixture && adapter?.adapter_state === "PASSED_INTERNAL_CONNECTOR_ADAPTER_REVIEW") {
    const expectedDryRun = runControlledAggregatePipelineDryRunFromObject(
      options.sourceFixture,
      {
        sourceSystem: adapter?.source_system,
        measurementPlanOverride: options.measurementPlanOverride
      }
    );
    const expectedManifest = buildControlledAggregateConnectorManifestFromDryRun(
      expectedDryRun,
      { sourceSystem: adapter?.source_system }
    );
    enrichedOptions.expectedConnectorManifestHash = sha256Json(expectedManifest);
    enrichedOptions.expectedConnectorManifestRef = connectorManifestRefFromManifest(
      expectedManifest,
      enrichedOptions.expectedConnectorManifestHash
    );
    enrichedOptions.expectedPipelineDryRunRef = pipelineDryRunRefFromDryRun(expectedDryRun);
  }
  const validation = validateSharedControlledAggregateConnectorAdapter(
    adapter,
    { ...enrichedOptions, sourceFixture: options.sourceFixture }
  );
  const gaps = [...validation.gaps];
  if (options.sourceFixture && adapter?.adapter_state === "PASSED_INTERNAL_CONNECTOR_ADAPTER_REVIEW") {
    if (
      adapter?.connector_manifest_ref?.connector_manifest_hash !==
      enrichedOptions.expectedConnectorManifestHash
    ) {
      gaps.push("connector_manifest_ref.connector_manifest_hash must match recomputed connector manifest hash");
    }
    for (const [field, value] of Object.entries(enrichedOptions.expectedConnectorManifestRef ?? {})) {
      const actual = JSON.stringify(adapter?.connector_manifest_ref?.[field] ?? null);
      const expected = JSON.stringify(value ?? null);
      if (actual !== expected) {
        gaps.push(`connector_manifest_ref.${field} must match recomputed connector manifest ref`);
      }
    }
    for (const [field, value] of Object.entries(enrichedOptions.expectedPipelineDryRunRef ?? {})) {
      if (adapter?.pipeline_dry_run_ref?.[field] !== value) {
        gaps.push(`pipeline_dry_run_ref.${field} must match recomputed pipeline dry-run proof`);
      }
    }
  }
  const valid = gaps.length === 0;
  return {
    ...validation,
    valid,
    gaps: gaps.map((gap) =>
      String(gap)
        .replace(/select\s+.+?\s+from/gi, "<blocked_query_text>")
        .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "<blocked_identifier_value>")
    ),
    feeds: {
      ...validation.feeds,
      aggregate_connector_adapter_review:
        valid && validation.feeds.aggregate_connector_adapter_review,
      connector_review_packet:
        valid && validation.feeds.connector_review_packet,
      measurement_cell_candidate_proof:
        valid && validation.feeds.measurement_cell_candidate_proof,
      customer_facing_financial_output: false
    }
  };
}

function parseCliArgs(argv) {
  let fixturePath = DEFAULT_FIXTURE_PATH;
  let sourceSystem = "bigquery_export";
  for (const arg of argv) {
    if (arg.startsWith("--source-system=")) {
      sourceSystem = arg.split("=", 2)[1];
    } else if (!arg.startsWith("--")) {
      fixturePath = arg;
    }
  }
  return { fixturePath, sourceSystem };
}

function compactCliOutput(adapter, validation) {
  return {
    adapter_state: adapter.adapter_state,
    source_system: adapter.source_system,
    adapter_run_id: adapter.adapter_run_id,
    connector_manifest_ref: adapter.connector_manifest_ref,
    pipeline_dry_run_ref: adapter.pipeline_dry_run_ref,
    connector_review_packet: adapter.connector_review_packet,
    feeds: adapter.feeds,
    validation_summary: {
      valid: validation.valid,
      gaps: validation.gaps,
      connector_manifest_valid:
        adapter.validation_summary.connector_manifest_valid,
      pipeline_dry_run_valid:
        adapter.validation_summary.pipeline_dry_run_valid,
      connector_review_packet_valid:
        adapter.validation_summary.connector_review_packet_valid
    },
    boundary_policy: adapter.boundary_policy,
    blocked_uses: adapter.blocked_uses,
    required_caveats: adapter.required_caveats,
    generated_at: adapter.generated_at,
    derivation_version: adapter.derivation_version
  };
}

const isDirectRun = process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const { fixturePath, sourceSystem } = parseCliArgs(process.argv.slice(2));
  const fixture = readJson(fixturePath);
  const adapter = runControlledAggregateConnectorAdapterFromObject(fixture, {
    sourceSystem
  });
  const validation = validateControlledAggregateConnectorAdapter(adapter, {
    sourceFixture: fixture
  });
  process.stdout.write(
    `${JSON.stringify(compactCliOutput(adapter, validation), null, 2)}\n`
  );
  if (!validation.valid || adapter.adapter_state === "BLOCKED") {
    process.exitCode = 1;
  }
}
