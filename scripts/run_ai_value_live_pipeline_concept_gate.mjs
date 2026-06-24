#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  runMeasurementCellPreflightFromObject,
  validateMeasurementCellPreflight
} from "./run_ai_value_measurement_cell_preflight_runner.mjs";

export const LIVE_PIPELINE_CONCEPT_GATE_SCHEMA_VERSION =
  "FT_AI_VALUE_LIVE_PIPELINE_CONCEPT_GATE_2026_06";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_LIVE_PIPELINE_CONCEPT_GATE_RESULT_2026_06";

const DEFAULT_FIXTURE_PATH =
  "docs/contracts/ai-value-real-data-intake-packet-runner/examples/controlled-aggregate-fixture-review-ready.json";

const ALLOWED_SOURCE_SYSTEMS = new Set(["bigquery_export", "sigma_export"]);

const READY_STATE = "READY_FOR_SEPARATE_LIVE_PIPELINE_CONCEPT_REVIEW";
const HOLD_STATE = "HOLD_FOR_VALID_MEASUREMENT_CELL_PREFLIGHT";
const REJECTED_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";

const REQUIRED_BLOCKED_USES = [
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
  "controlled_manifest_persistence",
  "measurement_cell_series_persistence",
  "customer_facing_projection",
  "export_creation",
  "customer_facing_output",
  "customer_facing_financial_output",
  "customer_facing_economic_output",
  "financial_attribution",
  "realized_roi",
  "ebitda_claim",
  "causality_claim",
  "productivity_claim",
  "probability_output",
  "contribution_model_not_authorized",
  "research_model_not_promoted",
  "financial_claim_blocked"
];

const REQUIRED_CAVEATS = [
  "Live pipeline concept gate is a prerequisite review only; it does not authorize live BigQuery, Sigma, Glean, or customer connector execution.",
  "Execution must remain upstream in an approved Glean or customer environment unless a later exact-scope decision changes that boundary.",
  "FluencyTracr may receive only reviewed aggregate manifests, compact refs, suppression posture, k-min posture, caveats, and blocked-use metadata.",
  "This gate does not authorize pipeline-run persistence, manifest persistence, routes, UI, exports, Series persistence, research-model feed, finance output, or customer-facing output."
];

const TRUE_FEEDS = [
  "live_pipeline_concept_review",
  "connector_boundary_requirements"
];

const FALSE_FEEDS = [
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

const BOUNDARY_POLICY_FIELDS = [
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
  "persists_controlled_manifests",
  "creates_measurement_cell_series",
  "creates_customer_projection",
  "creates_exports",
  "feeds_research_model",
  "emits_probability",
  "computes_roi",
  "emits_finance_output"
];

const GATE_FIELDS = new Set([
  "schema_version",
  "gate_id",
  "gate_state",
  "source_system",
  "source_owner_role",
  "legal_trust_review_state",
  "proposed_execution_boundary",
  "fluencytracr_execution_mode",
  "prerequisites",
  "upstream_controls",
  "review_refs",
  "feeds",
  "boundary_policy",
  "blocked_uses",
  "required_caveats",
  "validation_summary",
  "generated_at",
  "derivation_version",
  "concept_gate_hash"
]);

const PREREQUISITE_FIELDS = new Set([
  "measurement_cell_snapshots_promoted",
  "measurement_cell_preflight_valid",
  "aggregate_boundary_bound_to_snapshot_candidate",
  "manifest_persistence_promoted",
  "series_persistence_promoted",
  "customer_projection_promoted",
  "export_governance_promoted",
  "research_model_promoted",
  "finance_output_promoted"
]);

const UPSTREAM_CONTROL_FIELDS = new Set([
  "upstream_execution_required",
  "upstream_k_min_required",
  "upstream_suppression_required",
  "source_owner_attestation_required",
  "legal_trust_review_required",
  "approved_aggregate_manifest_required",
  "measurement_cell_preflight_binding_required",
  "compact_ref_only_required"
]);

const REVIEW_REF_FIELDS = new Set([
  "measurement_cell_preflight_ref",
  "snapshot_candidate_ref",
  "aggregate_source_system",
  "aggregate_export_review_ref",
  "aggregate_source_export_ref",
  "aggregate_export_review_hash",
  "pipeline_dry_run_ref",
  "pipeline_boundary_hash"
]);

const SAFE_ROLE_VALUES = new Set([
  "analytics_owner",
  "data_platform_owner",
  "source_owner",
  "customer_data_owner",
  "security_trust_owner"
]);

const SAFE_LEGAL_TRUST_STATES = new Set([
  "review_required",
  "approved_for_concept_review",
  "not_applicable"
]);

const FORBIDDEN_OVERRIDE_KEY_PATTERNS = [
  /raw_?rows?/i,
  /^rows$/i,
  /^records$/i,
  /^events$/i,
  /dashboard_?rows?/i,
  /query_?text/i,
  /sql/i,
  /prompt/i,
  /response/i,
  /transcript/i,
  /credential/i,
  /secret/i,
  /token_value/i,
  /user_?id/i,
  /employee/i,
  /person_?id/i,
  /respondent/i,
  /^email$/i,
  /row_?id/i,
  /span_?id/i,
  /job_?id/i,
  /query_?id/i,
  /api_?run/i,
  /dashboard_?url/i,
  /export_?url/i,
  /live_?(?:bigquery|sigma|glean|connector|execution)/i,
  /query_?execution/i,
  /customer_?connector_?execution/i,
  /fluencytracr_?runs/i,
  /fluencytracr_?executes/i,
  /credential_?access/i,
  /project_?id/i,
  /dataset_?id/i,
  /table_?id/i,
  /source_?refs?_?json/i,
  /payload_?json/i,
  /validation_?json/i,
  /blueprint_?path_?binding_?json/i,
  /source_?package_?clearance/i,
  /measurement_?cell_?series/i,
  /customer_?facing/i,
  /export_?creation/i,
  /finance/i,
  /financial/i,
  /roi/i,
  /ebitda/i,
  /causal/i,
  /productivity/i,
  /probability/i,
  /confidence/i,
  /score/i,
  /model/i
];

const FORBIDDEN_VALUE_PATTERNS = [
  /https?:\/\//i,
  /secret:\/\//i,
  /\bselect\b/i,
  /\bfrom\s+[a-z0-9_.-]+/i,
  /\bsql\b/i,
  /bquxjob/i,
  /job[_-]?[a-z0-9]+/i,
  /project[_-]?dataset[_-]?table/i,
  /\b(?:project|dataset|table)[_-]?(?:id|ref|name)\b/i,
  /dashboard[_-]?url/i,
  /query[_-]?(?:id|text|ref)/i,
  /live[_-]?execution/i,
  /live[_-]?(?:bigquery|sigma|glean|connector)/i,
  /runs[_-]?(?:bigquery|sigma|glean|connector)/i,
  /raw[_-]?rows?/i,
  /dashboard[_-]?rows?/i,
  /prompt/i,
  /transcript/i,
  /person@example\.com/i,
  /@[a-z0-9.-]+\.[a-z]{2,}/i,
  /user[_-]?id/i,
  /employee[_-]?id/i,
  /person[_-]?id/i,
  /row[_-]?id/i,
  /span[_-]?id/i,
  /customer[_-]?facing/i,
  /finance/i,
  /financial/i,
  /\broi\b/i,
  /ebitda/i,
  /causal/i,
  /productivity/i,
  /probability/i,
  /confidence/i,
  /score/i
];

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sha256(value) {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

function compactToken(value, fallback) {
  const raw = typeof value === "string" && value.trim() ? value.trim() : fallback;
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 160);
}

function isSafeCompactRef(value) {
  return (
    typeof value === "string" &&
    /^[a-z0-9_]+$/.test(value) &&
    !FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))
  );
}

function scanUnsafeOverrides(value, path = []) {
  const gaps = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      gaps.push(...scanUnsafeOverrides(item, [...path, String(index)]));
    });
    return gaps;
  }
  if (value && typeof value === "object") {
    for (const [key, nestedValue] of Object.entries(value)) {
      const nestedPath = [...path, key];
      if (FORBIDDEN_OVERRIDE_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
        gaps.push(`proposal override contains forbidden key at ${nestedPath.join(".")}`);
        continue;
      }
      gaps.push(...scanUnsafeOverrides(nestedValue, nestedPath));
    }
    return gaps;
  }
  if (
    typeof value === "string" &&
    FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))
  ) {
    gaps.push(`proposal override contains forbidden scalar at ${path.join(".")}`);
  }
  return gaps;
}

function mergeSafeOverrides(gate, overrides) {
  const source = asRecord(overrides);
  const next = clone(gate);

  if (ALLOWED_SOURCE_SYSTEMS.has(source.source_system)) {
    next.source_system = source.source_system;
  }
  if (SAFE_ROLE_VALUES.has(source.source_owner_role)) {
    next.source_owner_role = source.source_owner_role;
  }
  if (SAFE_LEGAL_TRUST_STATES.has(source.legal_trust_review_state)) {
    next.legal_trust_review_state = source.legal_trust_review_state;
  }
  if (source.proposed_execution_boundary === "approved_glean_or_customer_environment") {
    next.proposed_execution_boundary = source.proposed_execution_boundary;
  }
  if (source.fluencytracr_execution_mode === "no_live_execution") {
    next.fluencytracr_execution_mode = source.fluencytracr_execution_mode;
  }

  return next;
}

function falseMap(keys) {
  return Object.fromEntries(keys.map((key) => [key, false]));
}

function trueMap(keys) {
  return Object.fromEntries(keys.map((key) => [key, true]));
}

function safePreflightValidation(preflight, sourceFixture, sourceSystem) {
  try {
    return validateMeasurementCellPreflight(preflight, {
      sourceFixture,
      sourceSystem
    });
  } catch (error) {
    return {
      valid: false,
      gaps: [
        `measurement cell preflight validation failed: ${error instanceof Error ? error.name : "unknown_error"}`
      ]
    };
  }
}

function compactReviewRefs(preflight) {
  const snapshotCandidate = asRecord(preflight?.snapshot_candidate_ref);
  const aggregateBoundary = asRecord(snapshotCandidate.aggregate_boundary_ref);
  return {
    measurement_cell_preflight_ref: isSafeCompactRef(preflight?.preflight_id)
      ? preflight.preflight_id
      : null,
    snapshot_candidate_ref: isSafeCompactRef(snapshotCandidate.measurement_cell_id)
      ? snapshotCandidate.measurement_cell_id
      : null,
    aggregate_source_system: ALLOWED_SOURCE_SYSTEMS.has(aggregateBoundary.source_system)
      ? aggregateBoundary.source_system
      : null,
    aggregate_export_review_ref: isSafeCompactRef(aggregateBoundary.review_id)
      ? aggregateBoundary.review_id
      : null,
    aggregate_source_export_ref: isSafeCompactRef(aggregateBoundary.source_export_ref)
      ? aggregateBoundary.source_export_ref
      : null,
    aggregate_export_review_hash:
      typeof aggregateBoundary.review_hash === "string" &&
      /^[a-f0-9]{64}$/.test(aggregateBoundary.review_hash)
        ? aggregateBoundary.review_hash
        : null,
    pipeline_dry_run_ref: isSafeCompactRef(aggregateBoundary.pipeline_dry_run_id)
      ? aggregateBoundary.pipeline_dry_run_id
      : null,
    pipeline_boundary_hash:
      typeof aggregateBoundary.pipeline_boundary_hash === "string" &&
      /^[a-f0-9]{64}$/.test(aggregateBoundary.pipeline_boundary_hash)
        ? aggregateBoundary.pipeline_boundary_hash
        : null
  };
}

function reviewRefsAreBound(refs, sourceSystem) {
  return (
    refs.measurement_cell_preflight_ref &&
    refs.snapshot_candidate_ref &&
    refs.aggregate_source_system === sourceSystem &&
    refs.aggregate_export_review_ref &&
    refs.aggregate_source_export_ref &&
    refs.aggregate_export_review_hash &&
    refs.pipeline_dry_run_ref &&
    refs.pipeline_boundary_hash
  );
}

function buildValidationSummary(gate, extraGaps = []) {
  const gaps = [...extraGaps, ...validateGateShape(gate)];
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    valid: gaps.length === 0 && gate.gate_state === READY_STATE,
    gate_state: gate.gate_state,
    gaps
  };
}

function validateGateShape(gate) {
  const gaps = [];
  const record = asRecord(gate);

  for (const key of Object.keys(record)) {
    if (!GATE_FIELDS.has(key)) {
      gaps.push(`field ${key} is not allowed`);
    }
  }
  if (record.schema_version !== LIVE_PIPELINE_CONCEPT_GATE_SCHEMA_VERSION) {
    gaps.push("schema_version is not supported");
  }
  if (![READY_STATE, HOLD_STATE, REJECTED_STATE].includes(record.gate_state)) {
    gaps.push("gate_state is not supported");
  }
  if (!ALLOWED_SOURCE_SYSTEMS.has(record.source_system)) {
    gaps.push("source_system must be bigquery_export or sigma_export");
  }
  if (record.proposed_execution_boundary !== "approved_glean_or_customer_environment") {
    gaps.push("proposed_execution_boundary must keep execution upstream");
  }
  if (record.fluencytracr_execution_mode !== "no_live_execution") {
    gaps.push("fluencytracr_execution_mode must be no_live_execution");
  }
  if (!SAFE_ROLE_VALUES.has(record.source_owner_role)) {
    gaps.push("source_owner_role is not governed");
  }
  if (!SAFE_LEGAL_TRUST_STATES.has(record.legal_trust_review_state)) {
    gaps.push("legal_trust_review_state is not governed");
  }

  const prerequisites = asRecord(record.prerequisites);
  for (const key of Object.keys(prerequisites)) {
    if (!PREREQUISITE_FIELDS.has(key)) {
      gaps.push(`prerequisites.${key} is not allowed`);
    }
  }
  for (const key of [
    "measurement_cell_snapshots_promoted",
    "measurement_cell_preflight_valid",
    "aggregate_boundary_bound_to_snapshot_candidate"
  ]) {
    if (prerequisites[key] !== true && record.gate_state === READY_STATE) {
      gaps.push(`prerequisites.${key} must be true for concept review readiness`);
    }
  }
  for (const key of [
    "manifest_persistence_promoted",
    "series_persistence_promoted",
    "customer_projection_promoted",
    "export_governance_promoted",
    "research_model_promoted",
    "finance_output_promoted"
  ]) {
    if (prerequisites[key] !== false) {
      gaps.push(`prerequisites.${key} must remain false`);
    }
  }

  const controls = asRecord(record.upstream_controls);
  for (const key of Object.keys(controls)) {
    if (!UPSTREAM_CONTROL_FIELDS.has(key)) {
      gaps.push(`upstream_controls.${key} is not allowed`);
    }
  }
  for (const key of UPSTREAM_CONTROL_FIELDS) {
    if (controls[key] !== true && record.gate_state === READY_STATE) {
      gaps.push(`upstream_controls.${key} must be true for concept review readiness`);
    }
  }

  const reviewRefs = asRecord(record.review_refs);
  for (const key of Object.keys(reviewRefs)) {
    if (!REVIEW_REF_FIELDS.has(key)) {
      gaps.push(`review_refs.${key} is not allowed`);
    }
  }
  for (const [key, value] of Object.entries(reviewRefs)) {
    if (key.endsWith("_hash")) {
      if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) {
        gaps.push(`review_refs.${key} must be a sha256 hash`);
      }
    } else if (key === "aggregate_source_system") {
      if (!ALLOWED_SOURCE_SYSTEMS.has(value)) {
        gaps.push("review_refs.aggregate_source_system is not governed");
      }
    } else if (!isSafeCompactRef(value)) {
      gaps.push(`review_refs.${key} must be a compact safe ref`);
    }
  }

  const feeds = asRecord(record.feeds);
  for (const key of TRUE_FEEDS) {
    if (feeds[key] !== true && record.gate_state === READY_STATE) {
      gaps.push(`feeds.${key} must be true for concept review readiness`);
    }
  }
  for (const key of FALSE_FEEDS) {
    if (feeds[key] !== false) {
      gaps.push(`feeds.${key} must remain false`);
    }
  }

  const boundaryPolicy = asRecord(record.boundary_policy);
  for (const key of BOUNDARY_POLICY_FIELDS) {
    if (boundaryPolicy[key] !== false) {
      gaps.push(`boundary_policy.${key} must remain false`);
    }
  }

  const blockedUses = Array.isArray(record.blocked_uses) ? record.blocked_uses : [];
  for (const use of REQUIRED_BLOCKED_USES) {
    if (!blockedUses.includes(use)) {
      gaps.push(`blocked_uses must include ${use}`);
    }
  }

  const caveats = Array.isArray(record.required_caveats)
    ? record.required_caveats
    : [];
  for (const caveat of REQUIRED_CAVEATS) {
    if (!caveats.includes(caveat)) {
      gaps.push("required_caveats is missing a required concept-gate caveat");
      break;
    }
  }

  return gaps;
}

export function buildLivePipelineConceptGateFromObject(sourceFixture, options = {}) {
  const requestedSourceSystem =
    typeof options.sourceSystem === "string" && options.sourceSystem.trim()
      ? options.sourceSystem.trim()
      : "bigquery_export";
  const sourceSystemSupported = ALLOWED_SOURCE_SYSTEMS.has(requestedSourceSystem);
  const sourceSystem = sourceSystemSupported
    ? requestedSourceSystem
    : "unsupported_source_system";
  const preflightSourceSystem = sourceSystemSupported
    ? sourceSystem
    : "bigquery_export";
  const fixture = clone(sourceFixture);
  const preflight =
    options.preflight ??
    runMeasurementCellPreflightFromObject(fixture, {
      sourceSystem: preflightSourceSystem
    });
  const preflightValidation = safePreflightValidation(
    preflight,
    fixture,
    preflightSourceSystem
  );
  const reviewRefs = compactReviewRefs(preflight);
  const overrideGaps = [
    ...(!sourceSystemSupported
      ? ["sourceSystem must be bigquery_export or sigma_export"]
      : []),
    ...scanUnsafeOverrides(options.proposalOverrides ?? {})
  ];
  const preflightPassed =
    preflight?.preflight_state === "PASSED_INTERNAL_MEASUREMENT_CELL_PREFLIGHT" &&
    preflightValidation.valid === true;
  const refsBound = Boolean(reviewRefsAreBound(reviewRefs, sourceSystem));

  let gateState = READY_STATE;
  if (overrideGaps.length > 0) {
    gateState = REJECTED_STATE;
  } else if (!preflightPassed || !refsBound) {
    gateState = HOLD_STATE;
  }

  const baseGate = {
    schema_version: LIVE_PIPELINE_CONCEPT_GATE_SCHEMA_VERSION,
    gate_id: `live_pipeline_concept_gate_${sourceSystem}_${compactToken(
      fixture?.data_spine_input?.sources?.vbdToken?.workflow_family ??
        fixture?.measurement_cell_input?.workflow_family,
      "aggregate_workflow"
    )}`,
    gate_state: gateState,
    source_system: sourceSystem,
    source_owner_role: "data_platform_owner",
    legal_trust_review_state: "review_required",
    proposed_execution_boundary: "approved_glean_or_customer_environment",
    fluencytracr_execution_mode: "no_live_execution",
    prerequisites: {
      measurement_cell_snapshots_promoted: true,
      measurement_cell_preflight_valid: preflightPassed,
      aggregate_boundary_bound_to_snapshot_candidate: refsBound,
      manifest_persistence_promoted: false,
      series_persistence_promoted: false,
      customer_projection_promoted: false,
      export_governance_promoted: false,
      research_model_promoted: false,
      finance_output_promoted: false
    },
    upstream_controls: {
      upstream_execution_required: true,
      upstream_k_min_required: true,
      upstream_suppression_required: true,
      source_owner_attestation_required: true,
      legal_trust_review_required: true,
      approved_aggregate_manifest_required: true,
      measurement_cell_preflight_binding_required: true,
      compact_ref_only_required: true
    },
    review_refs: reviewRefs,
    feeds: {
      ...trueMap(TRUE_FEEDS),
      ...falseMap(FALSE_FEEDS)
    },
    boundary_policy: falseMap(BOUNDARY_POLICY_FIELDS),
    blocked_uses: REQUIRED_BLOCKED_USES,
    required_caveats: REQUIRED_CAVEATS,
    validation_summary: {
      schema_version: RESULT_SCHEMA_VERSION,
      valid: false,
      gate_state: gateState,
      gaps: []
    },
    generated_at: "2026-06-23T00:00:00.000Z",
    derivation_version: "live_pipeline_concept_gate_2026_06"
  };

  const gate = mergeSafeOverrides(baseGate, options.proposalOverrides);
  gate.gate_state = gateState;
  gate.validation_summary = buildValidationSummary(gate, [
    ...overrideGaps,
    ...preflightValidation.gaps.map((gap) => `measurement_cell_preflight: ${gap}`)
  ]);
  if (gate.gate_state === READY_STATE && gate.validation_summary.gaps.length > 0) {
    gate.gate_state = REJECTED_STATE;
    gate.validation_summary.gate_state = gate.gate_state;
    gate.validation_summary.valid = false;
  }
  gate.concept_gate_hash = sha256({
    schema_version: gate.schema_version,
    gate_id: gate.gate_id,
    gate_state: gate.gate_state,
    source_system: gate.source_system,
    proposed_execution_boundary: gate.proposed_execution_boundary,
    fluencytracr_execution_mode: gate.fluencytracr_execution_mode,
    prerequisites: gate.prerequisites,
    upstream_controls: gate.upstream_controls,
    review_refs: gate.review_refs,
    feeds: gate.feeds,
    boundary_policy: gate.boundary_policy,
    blocked_uses: gate.blocked_uses,
    required_caveats: gate.required_caveats
  });
  gate.validation_summary = buildValidationSummary(gate, [
    ...overrideGaps,
    ...preflightValidation.gaps.map((gap) => `measurement_cell_preflight: ${gap}`)
  ]);
  return gate;
}

export function validateLivePipelineConceptGate(gate, options = {}) {
  const record = asRecord(gate);
  const gaps = validateGateShape(record);

  if (options.sourceFixture) {
    const expected = buildLivePipelineConceptGateFromObject(options.sourceFixture, {
      sourceSystem: record.source_system
    });
    const expectedRefs = expected.review_refs;
    for (const key of REVIEW_REF_FIELDS) {
      if (record.review_refs?.[key] !== expectedRefs[key]) {
        gaps.push(`review_refs.${key} does not match recomputed preflight proof`);
      }
    }
  }

  if (record.gate_state === HOLD_STATE && record.prerequisites?.measurement_cell_preflight_valid !== false) {
    gaps.push("hold state requires measurement_cell_preflight_valid=false");
  }
  if (record.gate_state === REJECTED_STATE) {
    const falseFeedsOk = FALSE_FEEDS.every((feed) => record.feeds?.[feed] === false);
    const falsePolicyOk = BOUNDARY_POLICY_FIELDS.every(
      (field) => record.boundary_policy?.[field] === false
    );
    if (!falseFeedsOk || !falsePolicyOk) {
      gaps.push("rejected gate must keep false feeds and boundary policy false");
    }
  }

  return {
    schema_version: RESULT_SCHEMA_VERSION,
    valid: gaps.length === 0 && record.gate_state === READY_STATE,
    gate_state: record.gate_state,
    gaps
  };
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8"));
}

function parseCliArgs(argv) {
  const inputPath = argv.find((arg) => !arg.startsWith("--")) ?? DEFAULT_FIXTURE_PATH;
  const sourceSystemArg = argv.find((arg) => arg.startsWith("--source-system="));
  const sourceSystem = sourceSystemArg
    ? sourceSystemArg.split("=").slice(1).join("=")
    : "bigquery_export";
  return { inputPath, sourceSystem };
}

function main() {
  const { inputPath, sourceSystem } = parseCliArgs(process.argv.slice(2));
  const fixture = readJson(inputPath);
  const gate = buildLivePipelineConceptGateFromObject(fixture, { sourceSystem });
  const validation = validateLivePipelineConceptGate(gate, {
    sourceFixture: fixture
  });
  gate.validation_summary = validation;
  process.stdout.write(`${JSON.stringify(gate, null, 2)}\n`);
  if (!validation.valid) {
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
