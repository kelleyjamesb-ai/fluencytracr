#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  AI_VALUE_CONTROLLED_AGGREGATE_PIPELINE_DRY_RUN_SCHEMA_VERSION,
  buildControlledAggregatePipelineDryRun,
  validateControlledAggregatePipelineDryRun as validateSharedControlledAggregatePipelineDryRun
} from "../shared/dist/aiValueEngine/index.js";

import {
  runControlledMeasurementCellAssemblyFromObject,
  validateControlledMeasurementCellAssembly
} from "./run_ai_value_controlled_measurement_cell_assembly.mjs";

export const CONTROLLED_AGGREGATE_PIPELINE_DRY_RUN_SCHEMA_VERSION =
  AI_VALUE_CONTROLLED_AGGREGATE_PIPELINE_DRY_RUN_SCHEMA_VERSION;

const DEFAULT_FIXTURE_PATH =
  "docs/contracts/ai-value-real-data-intake-packet-runner/examples/controlled-aggregate-fixture-review-ready.json";

const ALLOWED_SOURCE_SYSTEMS = new Set(["bigquery_export", "sigma_export"]);

const REVIEWED_SOURCE_REF_LANES = [
  "blueprint",
  "ai_fluency",
  "vbd_token",
  "customer_metric",
  "assumption",
  "governance"
];

const REQUIRED_BLOCKED_USES = [
  "realized_roi",
  "ebita_claim",
  "ebitda_claim",
  "financial_attribution",
  "causality_claim",
  "productivity_claim",
  "headcount_reduction_claim",
  "individual_attribution",
  "manager_or_team_ranking",
  "department_ranking",
  "people_decisioning",
  "customer_facing_output",
  "customer_facing_financial_output",
  "customer_facing_economic_output",
  "confidence_model",
  "confidence_percentage",
  "confidence_score",
  "probability_output",
  "contribution_probability",
  "p_value",
  "live_bigquery_execution",
  "live_sigma_execution",
  "live_glean_query",
  "pipeline_run_storage"
];

const FALSE_EXECUTION_POLICY = {
  runs_bigquery: false,
  runs_sigma: false,
  runs_glean_query: false,
  runs_live_connectors: false,
  runs_customer_connectors: false,
  stores_raw_source_data: false,
  credentials_present: false,
  query_text_present: false,
  raw_rows_present: false,
  writes_output_files: false,
  persists_pipeline_run: false,
  creates_ingestion_jobs: false
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

function reviewedSourceRefsHash(fixture) {
  const refs = fixture?.expected?.reviewed_source_refs ?? {};
  const canonicalRefs = Object.fromEntries(
    REVIEWED_SOURCE_REF_LANES.map((lane) => [lane, refs?.[lane] ?? null])
  );
  return createHash("sha256")
    .update(JSON.stringify(canonicalRefs))
    .digest("hex");
}

function sourceRefFor(sourceSystem, fixture) {
  const suffix = safeIdPart(
    fixture?.expected?.reviewed_source_refs?.vbd_token ??
      fixture?.fixture_id ??
      "controlled_fixture"
  );
  return `${sourceSystem}_${suffix}`;
}

function candidateRefFromCandidate(candidate) {
  if (!candidate) return null;
  return {
    assembly_run_id: candidate?.assembly_ref?.assembly_run_id ?? null,
    assembly_state: candidate?.assembly_state ?? null,
    measurement_cell_ref: candidate?.assembly_ref?.measurement_cell_ref ??
      candidate?.internal_candidate_metadata?.measurement_cell_ref ??
      null,
    selected_metric_id: candidate?.internal_candidate_metadata?.selected_metric_id ?? null,
    expectation_path_id: candidate?.internal_candidate_metadata?.expectation_path_id ?? null,
    source_package_count: candidate?.internal_candidate_metadata?.source_package_count ?? null,
    candidate_integrity_hash: candidate?.candidate_integrity_hash ?? null,
    reviewed_source_refs_hash: candidate?.review_ref?.reviewed_source_refs_hash ??
      candidate?.internal_candidate_metadata?.reviewed_source_refs_hash ??
      null,
    reviewed_aggregate_context_hash: candidate?.review_ref?.reviewed_aggregate_context_hash ??
      candidate?.internal_candidate_metadata?.reviewed_aggregate_context_hash ??
      null,
    reviewed_blueprint_expectation_hash:
      candidate?.review_ref?.reviewed_blueprint_expectation_hash ??
      candidate?.internal_candidate_metadata?.reviewed_blueprint_expectation_hash ??
      null
  };
}

export function buildControlledAggregatePipelineRunManifestFromFixture(
  fixture,
  options = {}
) {
  const sourceSystem = options.sourceSystem ?? "bigquery_export";
  const spine = fixture?.data_spine_input ?? {};
  const firstExport = Array.isArray(fixture?.scrubbed_glean_exports)
    ? fixture.scrubbed_glean_exports[0] ?? {}
    : {};
  const ownerRole = sourceSystem === "sigma_export"
    ? "customer_analytics_owner"
    : "customer_data_platform_owner";
  const manifest = {
    manifest_id: `controlled_${sourceSystem}_dry_run_${safeIdPart(spine.workflow_family ?? fixture?.fixture_id)}`,
    source_system: sourceSystem,
    run_mode: "controlled_dry_run",
    execution_mode: "no_live_execution",
    org_id: spine.org_id ?? firstExport.org_id ?? null,
    client_id: spine.client_id ?? null,
    measurement_plan_id: firstExport.measurement_plan_id ?? null,
    workflow_family: spine.workflow_family ?? null,
    function_area: spine.function_area ?? null,
    cohort_key: spine.cohort_key ?? null,
    baseline_window: spine.baseline_window ?? null,
    comparison_window: spine.comparison_window ?? firstExport.covered_window ?? null,
    source_owner_role: ownerRole,
    owner_approval_state: "approved",
    review_state: "clear",
    source_owner_attestation: {
      attestation_state: "attested",
      attested_by_role: ownerRole,
      attested_at: firstExport.generated_at ?? fixture?.generated_at ?? new Date(0).toISOString(),
      caveats: [
        "Scrubbed aggregate export summary only.",
        "No live connector execution was performed."
      ]
    },
    source_refs: {
      aggregate_export_ref: sourceRefFor(sourceSystem, fixture),
      reviewed_source_refs_hash: reviewedSourceRefsHash(fixture),
      reviewed_aggregate_context_hash:
        fixture?.expected?.reviewed_aggregate_context_hash ?? null,
      reviewed_blueprint_expectation_hash:
        fixture?.expected?.reviewed_blueprint_expectation_hash ?? null
    },
    execution_policy: { ...FALSE_EXECUTION_POLICY },
    allowed_uses: [
      "controlled_pipeline_dry_run",
      "source_package_review_path_proof",
      "measurement_cell_candidate_proof"
    ],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    required_caveats: [
      "Dry-run manifest only; it does not authorize live BigQuery or Sigma execution.",
      "Source package review path proof is not source package clearance.",
      "Measurement Cell candidate proof is not Measurement Cell snapshot persistence."
    ],
    generated_at: fixture?.generated_at ?? new Date(0).toISOString()
  };

  return deepMerge(manifest, options.manifestOverrides);
}

export function runControlledAggregatePipelineDryRunFromObject(
  sourceFixture,
  options = {}
) {
  const fixture = clone(sourceFixture);
  const manifest = buildControlledAggregatePipelineRunManifestFromFixture(
    fixture,
    options
  );
  const manifestHash = sha256Json(manifest);
  const aggregateFixtureHash = sha256Json(fixture);

  const blockedDryRun = buildControlledAggregatePipelineDryRun({
    pipelineRunManifest: manifest,
    controlledMeasurementCellAssembly: null,
    sourceFixture: fixture,
    manifestHash,
    aggregateFixtureHash,
    expectedReviewedSourceRefsHash: reviewedSourceRefsHash(fixture),
    generatedAt: manifest.generated_at
  });

  if (blockedDryRun.dry_run_state === "BLOCKED") {
    return blockedDryRun;
  }

  const candidate = runControlledMeasurementCellAssemblyFromObject(fixture, {
    measurementPlanOverride: options.measurementPlanOverride
  });
  const candidateValidation = validateControlledMeasurementCellAssembly(candidate, {
    sourceFixture: fixture,
    measurementPlanOverride: options.measurementPlanOverride
  });
  if (!candidateValidation.valid) {
    const held = buildControlledAggregatePipelineDryRun({
      pipelineRunManifest: manifest,
      controlledMeasurementCellAssembly: null,
      sourceFixture: fixture,
      manifestHash,
      aggregateFixtureHash,
      expectedReviewedSourceRefsHash: reviewedSourceRefsHash(fixture),
      generatedAt: manifest.generated_at
    });
    held.dry_run_state = "HELD_FOR_MEASUREMENT_CELL_CANDIDATE";
    held.validation_summary.gaps = [
      ...held.validation_summary.gaps,
      ...candidateValidation.gaps.map((gap) => `controlled_measurement_cell_candidate: ${gap}`)
    ];
    return held;
  }

  return buildControlledAggregatePipelineDryRun({
    pipelineRunManifest: manifest,
    controlledMeasurementCellAssembly: candidate,
    sourceFixture: fixture,
    manifestHash,
    aggregateFixtureHash,
    expectedReviewedSourceRefsHash: reviewedSourceRefsHash(fixture),
    expectedCandidateRef: candidateRefFromCandidate(candidate),
    generatedAt: manifest.generated_at
  });
}

export function validateControlledAggregatePipelineDryRun(dryRun, options = {}) {
  const enrichedOptions = { ...options };
  if (options.sourceFixture && dryRun?.dry_run_state === "PASSED_INTERNAL_PIPELINE_DRY_RUN_REVIEW") {
    const expectedManifest = buildControlledAggregatePipelineRunManifestFromFixture(
      options.sourceFixture,
      { sourceSystem: dryRun?.source_system }
    );
    const expectedCandidate =
      runControlledMeasurementCellAssemblyFromObject(options.sourceFixture, {
        measurementPlanOverride: options.measurementPlanOverride
      });
    enrichedOptions.expectedManifestHash = sha256Json(expectedManifest);
    enrichedOptions.expectedAggregateFixtureHash = sha256Json(options.sourceFixture);
    enrichedOptions.expectedReviewedSourceRefsHash =
      reviewedSourceRefsHash(options.sourceFixture);
    enrichedOptions.expectedCandidateRef = candidateRefFromCandidate(expectedCandidate);
  }
  const validation = validateSharedControlledAggregatePipelineDryRun(
    dryRun,
    enrichedOptions
  );
  const gaps = [...validation.gaps];
  if (options.sourceFixture) {
    const expectedFixtureHash = sha256Json(options.sourceFixture);
    if (
      dryRun?.manifest_ref?.aggregate_fixture_hash &&
      dryRun.manifest_ref.aggregate_fixture_hash !== expectedFixtureHash
    ) {
      gaps.push("manifest_ref.aggregate_fixture_hash must match recomputed controlled aggregate fixture hash");
    }
    if (dryRun?.dry_run_state === "PASSED_INTERNAL_PIPELINE_DRY_RUN_REVIEW") {
      const expectedManifestHash = enrichedOptions.expectedManifestHash;
      if (dryRun?.manifest_ref?.manifest_hash !== expectedManifestHash) {
        gaps.push("manifest_ref.manifest_hash must match recomputed pipeline run manifest hash");
      }
      const expectedCandidateRef = enrichedOptions.expectedCandidateRef;
      if (
        dryRun?.candidate_ref?.candidate_integrity_hash !==
        expectedCandidateRef?.candidate_integrity_hash
      ) {
        gaps.push("candidate_ref.candidate_integrity_hash must match recomputed Measurement Cell candidate hash");
      }
      if (
        dryRun?.candidate_ref?.expectation_path_id !==
        expectedCandidateRef?.expectation_path_id
      ) {
        gaps.push("candidate_ref.expectation_path_id must match recomputed Measurement Cell candidate");
      }
      for (const field of [
        "assembly_run_id",
        "assembly_state",
        "measurement_cell_ref",
        "selected_metric_id",
        "source_package_count",
        "reviewed_source_refs_hash",
        "reviewed_aggregate_context_hash",
        "reviewed_blueprint_expectation_hash"
      ]) {
        if (dryRun?.candidate_ref?.[field] !== expectedCandidateRef?.[field]) {
          gaps.push(`candidate_ref.${field} must match recomputed Measurement Cell candidate`);
        }
      }
    }
  }
  const valid = gaps.length === 0;
  return {
    ...validation,
    valid,
    gaps,
    feeds: {
      ...validation.feeds,
      pipeline_dry_run_review:
        valid && validation.feeds.pipeline_dry_run_review,
      source_package_review_path:
        valid && validation.feeds.source_package_review_path,
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

function compactCliOutput(dryRun, validation) {
  return {
    dry_run_state: dryRun.dry_run_state,
    source_system: dryRun.source_system,
    dry_run_id: dryRun.dry_run_id,
    manifest_ref: dryRun.manifest_ref,
    candidate_ref: dryRun.candidate_ref,
    feeds: dryRun.feeds,
    validation_summary: {
      valid: validation.valid,
      gaps: validation.gaps,
      manifest_valid: dryRun.validation_summary.manifest_valid,
      measurement_cell_candidate_valid:
        dryRun.validation_summary.measurement_cell_candidate_valid,
      source_package_count: dryRun.validation_summary.source_package_count
    },
    boundary_policy: dryRun.boundary_policy,
    blocked_uses: dryRun.blocked_uses,
    required_caveats: dryRun.required_caveats,
    generated_at: dryRun.generated_at,
    derivation_version: dryRun.derivation_version
  };
}

const isDirectRun = process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const { fixturePath, sourceSystem } = parseCliArgs(process.argv.slice(2));
  const fixture = readJson(fixturePath);
  const dryRun = runControlledAggregatePipelineDryRunFromObject(fixture, {
    sourceSystem
  });
  const validation = validateControlledAggregatePipelineDryRun(dryRun, {
    sourceFixture: fixture
  });
  process.stdout.write(
    `${JSON.stringify(compactCliOutput(dryRun, validation), null, 2)}\n`
  );
  if (!validation.valid || dryRun.dry_run_state === "BLOCKED") {
    process.exitCode = 1;
  }
}
