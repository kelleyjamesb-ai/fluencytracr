#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildLivePipelineConceptGateFromObject,
  validateLivePipelineConceptGate
} from "./run_ai_value_live_pipeline_concept_gate.mjs";

export const LIVE_PIPELINE_CONCEPT_REVIEW_SCHEMA_VERSION =
  "FT_AI_VALUE_LIVE_PIPELINE_CONCEPT_REVIEW_2026_06";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_LIVE_PIPELINE_CONCEPT_REVIEW_RESULT_2026_06";

const DEFAULT_FIXTURE_PATH =
  "docs/contracts/ai-value-real-data-intake-packet-runner/examples/controlled-aggregate-fixture-review-ready.json";

const ALLOWED_SOURCE_SYSTEMS = new Set(["bigquery_export", "sigma_export"]);

const READY_STATE = "READY_FOR_UPSTREAM_AGGREGATE_PIPELINE_DESIGN";
const HOLD_STATE = "HOLD_FOR_VALID_LIVE_PIPELINE_CONCEPT_GATE";
const REJECTED_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";

const TRUE_FEEDS = [
  "live_pipeline_concept_review",
  "upstream_aggregate_pipeline_design_requirements"
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
];

const REQUIRED_BLOCKED_USES = [
  "live_bigquery_execution",
  "live_sigma_execution",
  "live_glean_query",
  "customer_connector_execution",
  "live_connector_implementation",
  "credential_access",
  "warehouse_credentials_in_fluencytracr",
  "query_execution",
  "sql_runner",
  "dashboard_runner",
  "raw_row_ingestion",
  "dashboard_row_ingestion",
  "connector_run_persistence",
  "pipeline_run_persistence",
  "manifest_persistence",
  "measurement_cell_series_persistence",
  "customer_projection",
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
  "Live pipeline concept review is design-only and does not authorize implementation.",
  "Execution remains upstream in an approved Glean or customer environment.",
  "FluencyTracr may receive only reviewed aggregate manifests, compact refs, suppression posture, caveats, and blocked-use metadata.",
  "This review does not authorize credentials, SQL/query handling, raw rows, persistence, routes, UI, exports, research-model feed, finance output, or customer-facing output."
];

const REVIEW_FIELDS = new Set([
  "schema_version",
  "review_id",
  "review_state",
  "source_system",
  "source_owner_role",
  "execution_boundary",
  "fluencytracr_execution_mode",
  "concept_gate_ref",
  "review_scope",
  "upstream_execution_requirements",
  "package_acceptance_requirements",
  "feeds",
  "boundary_policy",
  "blocked_uses",
  "required_caveats",
  "validation_summary",
  "generated_at",
  "derivation_version",
  "review_hash"
]);

const GATE_REF_FIELDS = new Set([
  "gate_id",
  "gate_state",
  "source_system",
  "concept_gate_hash",
  "measurement_cell_preflight_ref",
  "snapshot_candidate_ref",
  "aggregate_source_export_ref",
  "pipeline_boundary_hash"
]);

const REVIEW_SCOPE_FIELDS = new Set([
  "design_only",
  "live_connector_implementation_authorized",
  "credential_handling_authorized",
  "query_execution_authorized",
  "raw_data_receipt_authorized",
  "durable_pipeline_storage_authorized",
  "customer_output_authorized",
  "research_model_feed_authorized",
  "finance_output_authorized"
]);

const UPSTREAM_REQUIREMENT_FIELDS = new Set([
  "approved_glean_or_customer_environment_required",
  "source_owner_attestation_required",
  "legal_trust_review_required",
  "upstream_k_min_required",
  "upstream_suppression_required",
  "approved_aggregate_manifest_required",
  "compact_ref_only_required",
  "measurement_cell_preflight_binding_required"
]);

const PACKAGE_REQUIREMENT_FIELDS = new Set([
  "source_inventory_manifest_ref_required",
  "aggregate_extraction_manifest_ref_required",
  "pipeline_run_review_manifest_ref_required",
  "source_package_review_posture_ref_required",
  "data_spine_alignment_ref_required",
  "snapshot_candidate_ref_required",
  "aggregate_boundary_hash_required",
  "full_manifest_payload_blocked",
  "query_text_blocked",
  "raw_rows_blocked",
  "identifier_fields_blocked"
]);

const VALIDATION_SUMMARY_FIELDS = new Set([
  "schema_version",
  "valid",
  "review_state",
  "gaps"
]);

const FORBIDDEN_OVERRIDE_KEY_PATTERNS = [
  /raw_?rows?/i,
  /^rows$/i,
  /^records$/i,
  /^events$/i,
  /dashboard_?rows?/i,
  /\bselect\b/i,
  /\bfrom\s+[a-z0-9_.-]+/i,
  /\braw\s+rows?\b/i,
  /\bquery\s+text\b/i,
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
  /live_?bigquery_?execution/i,
  /live_?sigma_?execution/i,
  /live_?glean_?query/i,
  /(?:bigquery|sigma|glean|connector)[\s_,-]*(?:execution|query|run)/i,
  /(?:execute|run|query)[\s_,-]*(?:bigquery|sigma|glean|connector)/i,
  /customer_?connector_?execution/i,
  /live_?connector_?implementation/i,
  /query_?execution/i,
  /credential_?access/i,
  /raw_?row_?ingestion/i,
  /dashboard_?row_?ingestion/i,
  /connector_?run_?persistence/i,
  /pipeline_?run_?persistence/i,
  /manifest_?persistence/i,
  /live_?connector_?implementation_?authorized/i,
  /credential_?handling_?authorized/i,
  /query_?execution_?authorized/i,
  /raw_?data_?receipt_?authorized/i,
  /durable_?pipeline_?storage_?authorized/i,
  /customer_?output_?authorized/i,
  /research_?model_?feed_?authorized/i,
  /finance_?output_?authorized/i,
  /fluencytracr_?runs/i,
  /fluencytracr_?executes/i,
  /fluencytracr_?receives/i,
  /creates_?routes?/i,
  /creates_?ui/i,
  /dashboard_?url/i,
  /export_?url/i,
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
  /\b(?:warehouse|service\s+account|oauth|tokens?)\b/i,
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
  /\blive\s+(?:bigquery|sigma|glean|connector)\s+(?:execution|query|run)\b/i,
  /\b(?:bigquery|sigma|glean|connector)\s+(?:execution|query|run)\b/i,
  /\b(?:execute|run|query)\s+(?:bigquery|sigma|glean|connector)\b/i,
  /\bcredentials?\b/i,
  /\bcredential\s+access\b/i,
  /\bqueries?\s+execution\b/i,
  /\b(?:run|execute|allow|authorize|enable)\s+quer(?:y|ies)\b/i,
  /\b(?:run|execute|allow|authorize|enable)\s+sql\b/i,
  /\bsql\s+runner\b/i,
  /\bquery\s+runner\b/i,
  /\bdashboard\s+runner\b/i,
  /\braw\s+rows?\s+(?:ingestion|receipt|access)\b/i,
  /\bdashboard\s+rows?\s+(?:ingestion|receipt|access)\b/i,
  /\b(?:authorize|authorized|enable|enabled|allow|allowed)\s+(?:live|credential|query|sql|raw|dashboard|customer|finance|financial|model|export|persistence)\b/i,
  /runs[_-]?(?:bigquery|sigma|glean|connector)/i,
  /raw[_-]?rows?/i,
  /dashboard[_-]?rows?/i,
  /prompt/i,
  /response[_-]?text/i,
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

function falseMap(keys) {
  return Object.fromEntries(keys.map((key) => [key, false]));
}

function trueMap(keys) {
  return Object.fromEntries(keys.map((key) => [key, true]));
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
        gaps.push("proposal override contains a forbidden key");
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

function unsupportedFields(value, allowed, label) {
  const record = asRecord(value);
  return Object.keys(record)
    .filter((key) => !allowed.has(key))
    .map((key) => `${label}.${key} is not allowed`);
}

function exactFalseMapGaps(actual, keys, label) {
  const record = asRecord(actual);
  const gaps = unsupportedFields(record, new Set(keys), label);
  for (const key of keys) {
    if (record[key] !== false) {
      gaps.push(`${label}.${key} must remain false`);
    }
  }
  return gaps;
}

function exactTrueMapGaps(actual, keys, label) {
  const record = asRecord(actual);
  const gaps = unsupportedFields(record, new Set(keys), label);
  for (const key of keys) {
    if (record[key] !== true) {
      gaps.push(`${label}.${key} must be true`);
    }
  }
  return gaps;
}

function exactArrayGap(actual, expected, label) {
  return Array.isArray(actual) &&
    actual.length === expected.length &&
    actual.every((value, index) => value === expected[index])
    ? []
    : [`${label} must match the governed concept-review contract exactly`];
}

function compactGateRef(gate) {
  const refs = asRecord(gate.review_refs);
  return {
    gate_id: gate.gate_id ?? null,
    gate_state: gate.gate_state ?? null,
    source_system: gate.source_system ?? null,
    concept_gate_hash: gate.concept_gate_hash ?? null,
    measurement_cell_preflight_ref: refs.measurement_cell_preflight_ref ?? null,
    snapshot_candidate_ref: refs.snapshot_candidate_ref ?? null,
    aggregate_source_export_ref: refs.aggregate_source_export_ref ?? null,
    pipeline_boundary_hash: refs.pipeline_boundary_hash ?? null
  };
}

function gateRefGaps(ref, sourceSystem) {
  const gaps = unsupportedFields(ref, GATE_REF_FIELDS, "concept_gate_ref");
  const record = asRecord(ref);
  if (record.gate_state !== "READY_FOR_SEPARATE_LIVE_PIPELINE_CONCEPT_REVIEW") {
    gaps.push("concept_gate_ref.gate_state must be READY_FOR_SEPARATE_LIVE_PIPELINE_CONCEPT_REVIEW");
  }
  if (record.source_system !== sourceSystem) {
    gaps.push("concept_gate_ref.source_system must match review source_system");
  }
  for (const field of [
    "gate_id",
    "measurement_cell_preflight_ref",
    "snapshot_candidate_ref",
    "aggregate_source_export_ref"
  ]) {
    if (!isSafeCompactRef(record[field])) {
      gaps.push(`concept_gate_ref.${field} must be a compact safe ref`);
    }
  }
  for (const field of ["concept_gate_hash", "pipeline_boundary_hash"]) {
    if (typeof record[field] !== "string" || !/^[a-f0-9]{64}$/.test(record[field])) {
      gaps.push(`concept_gate_ref.${field} must be a sha256 hash`);
    }
  }
  return gaps;
}

function buildValidationSummary(review, extraGaps = []) {
  const normalizedReview = {
    ...review,
    validation_summary: {
      schema_version: RESULT_SCHEMA_VERSION,
      valid: review.review_state === READY_STATE,
      review_state: review.review_state,
      gaps: extraGaps
    }
  };
  const gaps = [...extraGaps, ...validateReviewShape(normalizedReview)];
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    valid: gaps.length === 0 && review.review_state === READY_STATE,
    review_state: review.review_state,
    gaps
  };
}

function validateReviewShape(review) {
  const gaps = [];
  const record = asRecord(review);

  gaps.push(...unsupportedFields(record, REVIEW_FIELDS, "review"));
  if (record.schema_version !== LIVE_PIPELINE_CONCEPT_REVIEW_SCHEMA_VERSION) {
    gaps.push("schema_version is not supported");
  }
  if (![READY_STATE, HOLD_STATE, REJECTED_STATE].includes(record.review_state)) {
    gaps.push("review_state is not supported");
  }
  if (!ALLOWED_SOURCE_SYSTEMS.has(record.source_system)) {
    gaps.push("source_system must be bigquery_export or sigma_export");
  }
  if (record.execution_boundary !== "approved_glean_or_customer_environment") {
    gaps.push("execution_boundary must keep execution upstream");
  }
  if (record.fluencytracr_execution_mode !== "no_live_execution") {
    gaps.push("fluencytracr_execution_mode must be no_live_execution");
  }
  if (record.source_owner_role !== "data_platform_owner") {
    gaps.push("source_owner_role must be data_platform_owner");
  }
  if (record.generated_at !== "2026-06-23T00:00:00.000Z") {
    gaps.push("generated_at must match the governed concept-review timestamp");
  }
  if (record.derivation_version !== "live_pipeline_concept_review_2026_06") {
    gaps.push("derivation_version is not supported");
  }
  for (const field of ["source_owner_role", "generated_at", "derivation_version"]) {
    if (
      typeof record[field] !== "string" ||
      FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(record[field]))
    ) {
      gaps.push(`${field} must not contain unsafe text`);
    }
  }

  gaps.push(...gateRefGaps(record.concept_gate_ref, record.source_system));

  const scope = asRecord(record.review_scope);
  gaps.push(...unsupportedFields(scope, REVIEW_SCOPE_FIELDS, "review_scope"));
  if (scope.design_only !== true) {
    gaps.push("review_scope.design_only must be true");
  }
  for (const key of [
    "live_connector_implementation_authorized",
    "credential_handling_authorized",
    "query_execution_authorized",
    "raw_data_receipt_authorized",
    "durable_pipeline_storage_authorized",
    "customer_output_authorized",
    "research_model_feed_authorized",
    "finance_output_authorized"
  ]) {
    if (scope[key] !== false) {
      gaps.push(`review_scope.${key} must remain false`);
    }
  }

  gaps.push(
    ...exactTrueMapGaps(
      record.upstream_execution_requirements,
      [...UPSTREAM_REQUIREMENT_FIELDS],
      "upstream_execution_requirements"
    )
  );
  gaps.push(
    ...exactTrueMapGaps(
      record.package_acceptance_requirements,
      [...PACKAGE_REQUIREMENT_FIELDS],
      "package_acceptance_requirements"
    )
  );
  gaps.push(...exactFalseMapGaps(record.boundary_policy, BOUNDARY_POLICY_FIELDS, "boundary_policy"));

  const feeds = asRecord(record.feeds);
  for (const key of TRUE_FEEDS) {
    if (feeds[key] !== true && record.review_state === READY_STATE) {
      gaps.push(`feeds.${key} must be true for ready concept review`);
    }
  }
  for (const key of FALSE_FEEDS) {
    if (feeds[key] !== false) {
      gaps.push(`feeds.${key} must remain false`);
    }
  }
  gaps.push(...unsupportedFields(feeds, new Set([...TRUE_FEEDS, ...FALSE_FEEDS]), "feeds"));

  gaps.push(...exactArrayGap(record.blocked_uses, REQUIRED_BLOCKED_USES, "blocked_uses"));
  gaps.push(...exactArrayGap(record.required_caveats, REQUIRED_CAVEATS, "required_caveats"));

  const validationSummary = asRecord(record.validation_summary);
  gaps.push(...unsupportedFields(validationSummary, VALIDATION_SUMMARY_FIELDS, "validation_summary"));
  if (!Array.isArray(validationSummary.gaps)) {
    gaps.push("validation_summary.gaps must be an array");
  } else {
    if (
      validationSummary.gaps.some(
        (gap) =>
          typeof gap !== "string" ||
          FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(gap))
      )
    ) {
      gaps.push("validation_summary.gaps must not carry unsafe copied text");
    }
    if (record.review_state === READY_STATE && validationSummary.gaps.length > 0) {
      gaps.push("validation_summary.gaps must be empty for ready concept review");
    }
  }
  if (validationSummary.review_state !== record.review_state) {
    gaps.push("validation_summary.review_state must match review_state");
  }
  if (validationSummary.valid !== (record.review_state === READY_STATE)) {
    gaps.push("validation_summary.valid must match review_state readiness");
  }

  return gaps;
}

export function buildLivePipelineConceptReviewFromObject(sourceFixture, options = {}) {
  const requestedSourceSystem =
    typeof options.sourceSystem === "string" && options.sourceSystem.trim()
      ? options.sourceSystem.trim()
      : "bigquery_export";
  const sourceSystemSupported = ALLOWED_SOURCE_SYSTEMS.has(requestedSourceSystem);
  const sourceSystem = sourceSystemSupported
    ? requestedSourceSystem
    : "unsupported_source_system";
  const fixture = clone(sourceFixture);
  const gate =
    options.gate ??
    buildLivePipelineConceptGateFromObject(fixture, {
      sourceSystem: sourceSystemSupported ? sourceSystem : "bigquery_export"
    });
  const gateValidation = validateLivePipelineConceptGate(gate, {
    sourceFixture: fixture
  });
  const overrideGaps = [
    ...(!sourceSystemSupported
      ? ["sourceSystem must be bigquery_export or sigma_export"]
      : []),
    ...scanUnsafeOverrides(options.proposalOverrides ?? {})
  ];
  const gateReady =
    gate?.gate_state === "READY_FOR_SEPARATE_LIVE_PIPELINE_CONCEPT_REVIEW" &&
    gateValidation.valid === true &&
    gate.source_system === sourceSystem;

  let reviewState = READY_STATE;
  if (overrideGaps.length > 0) {
    reviewState = REJECTED_STATE;
  } else if (!gateReady) {
    reviewState = HOLD_STATE;
  }

  const review = {
    schema_version: LIVE_PIPELINE_CONCEPT_REVIEW_SCHEMA_VERSION,
    review_id: `live_pipeline_concept_review_${compactToken(sourceSystem, "unsupported_source_system")}_${compactToken(
      fixture?.data_spine_input?.sources?.vbdToken?.workflow_family ??
        fixture?.measurement_cell_input?.workflow_family,
      "aggregate_workflow"
    )}`,
    review_state: reviewState,
    source_system: sourceSystem,
    source_owner_role: "data_platform_owner",
    execution_boundary: "approved_glean_or_customer_environment",
    fluencytracr_execution_mode: "no_live_execution",
    concept_gate_ref: compactGateRef(gate),
    review_scope: {
      design_only: true,
      live_connector_implementation_authorized: false,
      credential_handling_authorized: false,
      query_execution_authorized: false,
      raw_data_receipt_authorized: false,
      durable_pipeline_storage_authorized: false,
      customer_output_authorized: false,
      research_model_feed_authorized: false,
      finance_output_authorized: false
    },
    upstream_execution_requirements: trueMap([...UPSTREAM_REQUIREMENT_FIELDS]),
    package_acceptance_requirements: trueMap([...PACKAGE_REQUIREMENT_FIELDS]),
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
      review_state: reviewState,
      gaps: []
    },
    generated_at: "2026-06-23T00:00:00.000Z",
    derivation_version: "live_pipeline_concept_review_2026_06",
    review_hash: null
  };

  review.validation_summary = buildValidationSummary(review, [
    ...overrideGaps,
    ...gateValidation.gaps.map((gap) => `live_pipeline_concept_gate: ${gap}`)
  ]);
  review.review_hash = sha256({
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
  });
  review.validation_summary = buildValidationSummary(review, [
    ...overrideGaps,
    ...gateValidation.gaps.map((gap) => `live_pipeline_concept_gate: ${gap}`)
  ]);
  return review;
}

export function validateLivePipelineConceptReview(review, options = {}) {
  const record = asRecord(review);
  const gaps = validateReviewShape(record);

  if (record.review_hash !== sha256({
    schema_version: record.schema_version,
    review_id: record.review_id,
    review_state: record.review_state,
    source_system: record.source_system,
    execution_boundary: record.execution_boundary,
    fluencytracr_execution_mode: record.fluencytracr_execution_mode,
    concept_gate_ref: record.concept_gate_ref,
    review_scope: record.review_scope,
    upstream_execution_requirements: record.upstream_execution_requirements,
    package_acceptance_requirements: record.package_acceptance_requirements,
    feeds: record.feeds,
    boundary_policy: record.boundary_policy,
    blocked_uses: record.blocked_uses,
    required_caveats: record.required_caveats
  })) {
    gaps.push("review_hash must match compact concept-review envelope");
  }

  if (options.sourceFixture && ALLOWED_SOURCE_SYSTEMS.has(record.source_system)) {
    const expected = buildLivePipelineConceptReviewFromObject(options.sourceFixture, {
      sourceSystem: record.source_system
    });
    if (JSON.stringify(record.concept_gate_ref) !== JSON.stringify(expected.concept_gate_ref)) {
      gaps.push("concept_gate_ref must match recomputed live-pipeline concept gate");
    }
    if (record.review_id !== expected.review_id) {
      gaps.push("review_id must match recomputed concept review");
    }
  }

  if (record.review_state === HOLD_STATE) {
    const gateReady =
      record.concept_gate_ref?.gate_state ===
      "READY_FOR_SEPARATE_LIVE_PIPELINE_CONCEPT_REVIEW";
    if (gateReady) {
      gaps.push("hold state requires a non-ready live-pipeline concept gate");
    }
  }
  if (record.review_state === REJECTED_STATE) {
    const falseFeedsOk = FALSE_FEEDS.every((feed) => record.feeds?.[feed] === false);
    const falsePolicyOk = BOUNDARY_POLICY_FIELDS.every(
      (field) => record.boundary_policy?.[field] === false
    );
    if (!falseFeedsOk || !falsePolicyOk) {
      gaps.push("rejected concept review must keep false feeds and boundary policy false");
    }
  }

  return {
    schema_version: RESULT_SCHEMA_VERSION,
    valid: gaps.length === 0 && record.review_state === READY_STATE,
    review_state: record.review_state,
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
  const review = buildLivePipelineConceptReviewFromObject(fixture, { sourceSystem });
  const validation = validateLivePipelineConceptReview(review, {
    sourceFixture: fixture
  });
  review.validation_summary = validation;
  process.stdout.write(`${JSON.stringify(review, null, 2)}\n`);
  if (!validation.valid) {
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
