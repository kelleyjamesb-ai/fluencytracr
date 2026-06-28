#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildUpstreamAggregatePipelineHandoffFromObject,
  validateUpstreamAggregatePipelineHandoff
} from "./run_ai_value_upstream_aggregate_pipeline_handoff.mjs";

export const UPSTREAM_AGGREGATE_HANDOFF_ACCEPTANCE_PACKAGE_SCHEMA_VERSION =
  "FT_AI_VALUE_UPSTREAM_AGGREGATE_HANDOFF_ACCEPTANCE_PACKAGE_2026_06";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_UPSTREAM_AGGREGATE_HANDOFF_ACCEPTANCE_PACKAGE_RESULT_2026_06";

const DEFAULT_FIXTURE_PATH =
  "docs/contracts/ai-value-real-data-intake-packet-runner/examples/controlled-aggregate-fixture-review-ready.json";

const ALLOWED_SOURCE_SYSTEMS = new Set(["bigquery_export", "sigma_export"]);

const PASSED_STATE = "PASSED_UPSTREAM_AGGREGATE_HANDOFF_ACCEPTANCE_PACKAGE";
const HOLD_STATE = "HOLD_FOR_VALID_UPSTREAM_AGGREGATE_PIPELINE_HANDOFF";
const REJECTED_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";

const REQUIRED_HANDOFF_STATE =
  "READY_FOR_UPSTREAM_AGGREGATE_HANDOFF_ACCEPTANCE_REVIEW";

const TRUE_FEEDS = [
  "upstream_aggregate_handoff_acceptance_package",
  "reviewed_manifest_ref_package"
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

const ACCEPTANCE_REQUIREMENT_FIELDS = [
  "valid_upstream_handoff_required",
  "bigquery_or_sigma_source_system_required",
  "source_owner_attestation_required",
  "legal_trust_review_required",
  "upstream_k_min_required",
  "upstream_suppression_required",
  "approved_aggregate_manifest_refs_required",
  "data_spine_alignment_required",
  "source_package_review_queue_posture_required",
  "full_manifest_payload_blocked",
  "query_text_blocked",
  "raw_rows_blocked",
  "identifier_fields_blocked",
  "persistence_blocked",
  "customer_output_blocked"
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
  "full_manifest_payload_ingestion",
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
  "Upstream aggregate handoff acceptance package is internal validation only.",
  "The package accepts compact reviewed refs only and does not accept full manifests.",
  "Execution remains upstream in an approved Glean or customer environment.",
  "This package does not authorize live execution, credentials, SQL/query handling, raw rows, persistence, routes, UI, exports, research-model feed, finance output, or customer-facing output."
];

const PACKAGE_FIELDS = new Set([
  "schema_version",
  "acceptance_package_id",
  "acceptance_state",
  "source_system",
  "execution_boundary",
  "fluencytracr_execution_mode",
  "upstream_handoff_ref",
  "accepted_refs",
  "acceptance_requirements",
  "feeds",
  "boundary_policy",
  "blocked_uses",
  "required_caveats",
  "validation_summary",
  "generated_at",
  "derivation_version",
  "acceptance_package_hash"
]);

const UPSTREAM_HANDOFF_REF_FIELDS = new Set([
  "handoff_id",
  "handoff_state",
  "source_system",
  "handoff_hash",
  "concept_review_ref",
  "manifest_package_ref"
]);

const CONCEPT_REVIEW_REF_FIELDS = new Set([
  "review_id",
  "review_hash",
  "concept_gate_hash"
]);

const HANDOFF_MANIFEST_PACKAGE_REF_FIELDS = new Set([
  "manifest_validation_state",
  "adapter_run_id"
]);

const ACCEPTED_REFS_FIELDS = new Set([
  "source_inventory_manifest_ref",
  "aggregate_extraction_manifest_ref",
  "pipeline_run_review_manifest_ref",
  "data_spine_alignment_ref",
  "source_package_review_queue_posture_ref",
  "compact_refs_only"
]);

const SOURCE_INVENTORY_MANIFEST_REF_FIELDS = new Set([
  "manifest_id",
  "manifest_hash",
  "source_lane",
  "source_system",
  "source_ref",
  "org_id",
  "client_id",
  "workflow_family",
  "function_area",
  "cohort_key",
  "window",
  "aggregate_grain"
]);

const AGGREGATE_EXTRACTION_MANIFEST_REF_FIELDS = new Set([
  "manifest_id",
  "manifest_hash",
  "source_lane",
  "source_system",
  "source_ref",
  "org_id",
  "client_id",
  "workflow_family",
  "function_area",
  "cohort_key",
  "window",
  "aggregate_grain"
]);

const PIPELINE_RUN_REVIEW_MANIFEST_REF_FIELDS = new Set([
  "manifest_id",
  "manifest_hash",
  "pipeline_review_state",
  "source_system",
  "org_id",
  "client_id",
  "workflow_family",
  "function_area",
  "cohort_key",
  "metric_id",
  "expectation_path_id"
]);

const DATA_SPINE_ALIGNMENT_REF_FIELDS = new Set([
  "source_system",
  "source_lane",
  "org_id",
  "client_id",
  "workflow_family",
  "function_area",
  "cohort_key",
  "metric_id",
  "expectation_path_id"
]);

const SOURCE_PACKAGE_REVIEW_QUEUE_POSTURE_REF_FIELDS = new Set([
  "queue_ref",
  "queue_state",
  "reviewed_at",
  "reviewed_by_role"
]);

const WINDOW_REF_FIELDS = new Set(["window_start", "window_end"]);

const VALIDATION_SUMMARY_FIELDS = new Set([
  "schema_version",
  "valid",
  "acceptance_state",
  "gaps"
]);

const FORBIDDEN_KEY_PATTERNS = [
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
  /dashboard_?handle/i,
  /dashboard_?url/i,
  /sigma_?workbook/i,
  /project_?id/i,
  /dataset_?id/i,
  /table_?id/i,
  /^manifests$/i,
  /full_?manifest/i,
  /payload/i,
  /payload_?json/i,
  /payload_?b64/i,
  /validation_?json/i,
  /source_?refs?_?json/i,
  /blueprint_?path_?binding_?json/i,
  /source_?package_?clearance/i,
  /measurement_?cell_?series/i,
  /customer_?facing/i,
  /customer_?share/i,
  /executive_?readout/i,
  /export_?creation/i,
  /finance/i,
  /financial/i,
  /roi/i,
  /ebita/i,
  /ebitda/i,
  /causal/i,
  /productivity/i,
  /probability/i,
  /confidence/i,
  /score/i,
  /model/i,
  /durable_?storage/i,
  /manifest_?persistence/i
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
  /\b[a-z0-9_-]+\.[a-z0-9_-]+\.[a-z0-9_-]+\b/i,
  /\b(?:project|dataset|table)[_-]?(?:id|ref|name)\b/i,
  /table[_-]?handle/i,
  /workbook[_-]?(?:id|handle)/i,
  /api[_-]?handle/i,
  /dashboard[_-]?(?:url|handle)/i,
  /sigma[_-]?workbook/i,
  /query[_-]?(?:id|text|ref)/i,
  /(?:full\s+)?package[_\s-]?json/i,
  /\b(?:full|acceptance|upstream\s+handoff|manifest)\s+package\s+(?:should\s+be\s+)?(?:stored|persisted|saved)\b/i,
  /\b(?:full\s+)?manifest\s+(?:should\s+be\s+)?(?:stored|persisted|saved)\b/i,
  /\b(?:store|persist|save)\s+accepted\s+refs?(?:\s+as\s+json)?\b/i,
  /\bdurable\s+(?:acceptance|handoff|package|manifest|pipeline|connector)\s+record\b/i,
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
  /customer[_-]?share/i,
  /executive[_-]?readout/i,
  /finance/i,
  /financial/i,
  /\broi\b/i,
  /ebita/i,
  /ebitda/i,
  /causal/i,
  /productivity/i,
  /probability/i,
  /confidence/i,
  /score/i,
  /eyJ[a-z0-9_-]{20,}/i,
  /[a-z0-9+/]{80,}={0,2}/i,
  /select%20/i,
  /s\u200belect/i
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

function unsupportedFields(value, allowed, label) {
  const record = asRecord(value);
  return Object.keys(record)
    .filter((key) => !allowed.has(key))
    .map((key) => `${label}.${key} is not allowed`);
}

function scanUnsafe(value, label) {
  const gaps = [];
  const visit = (nestedValue) => {
    if (Array.isArray(nestedValue)) {
      nestedValue.forEach((item) => visit(item));
      return;
    }
    if (nestedValue && typeof nestedValue === "object") {
      for (const [key, child] of Object.entries(nestedValue)) {
        if (FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
          gaps.push(`${label} contains a forbidden key`);
          continue;
        }
        visit(child);
      }
      return;
    }
    if (
      typeof nestedValue === "string" &&
      FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(nestedValue))
    ) {
      gaps.push(`${label} contains forbidden text`);
    }
  };
  visit(value);
  return [...new Set(gaps)];
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
    : [`${label} must match the governed acceptance package contract exactly`];
}

function compactUpstreamHandoffRef(handoff) {
  const conceptReviewRef = asRecord(handoff?.concept_review_ref);
  const conceptGateRef = asRecord(conceptReviewRef.concept_gate_ref);
  const manifestPackageRef = asRecord(handoff?.manifest_package_ref);
  return {
    handoff_id: handoff?.handoff_id ?? null,
    handoff_state: handoff?.handoff_state ?? null,
    source_system: handoff?.source_system ?? null,
    handoff_hash: handoff?.handoff_hash ?? null,
    concept_review_ref: {
      review_id: conceptReviewRef.review_id ?? null,
      review_hash: conceptReviewRef.review_hash ?? null,
      concept_gate_hash: conceptGateRef.concept_gate_hash ?? null
    },
    manifest_package_ref: {
      manifest_validation_state: manifestPackageRef.manifest_validation_state ?? null,
      adapter_run_id: manifestPackageRef.adapter_run_id ?? null
    }
  };
}

function emptyUpstreamHandoffRef(handoff) {
  return {
    handoff_id: null,
    handoff_state:
      handoff?.handoff_state === REQUIRED_HANDOFF_STATE
        ? REQUIRED_HANDOFF_STATE
        : null,
    source_system: ALLOWED_SOURCE_SYSTEMS.has(handoff?.source_system)
      ? handoff.source_system
      : null,
    handoff_hash: null,
    concept_review_ref: {
      review_id: null,
      review_hash: null,
      concept_gate_hash: null
    },
    manifest_package_ref: {
      manifest_validation_state: null,
      adapter_run_id: null
    }
  };
}

function compactAcceptedRefs(handoff) {
  const manifestPackageRef = asRecord(handoff?.manifest_package_ref);
  return {
    source_inventory_manifest_ref:
      manifestPackageRef.source_inventory_manifest_ref ?? null,
    aggregate_extraction_manifest_ref:
      manifestPackageRef.aggregate_extraction_manifest_ref ?? null,
    pipeline_run_review_manifest_ref:
      manifestPackageRef.pipeline_run_review_manifest_ref ?? null,
    data_spine_alignment_ref:
      manifestPackageRef.data_spine_alignment_ref ?? null,
    source_package_review_queue_posture_ref:
      manifestPackageRef.source_package_review_queue_posture_ref ?? null,
    compact_refs_only: true
  };
}

function emptyAcceptedRefs() {
  return {
    source_inventory_manifest_ref: null,
    aggregate_extraction_manifest_ref: null,
    pipeline_run_review_manifest_ref: null,
    data_spine_alignment_ref: null,
    source_package_review_queue_posture_ref: null,
    compact_refs_only: false
  };
}

export function hashUpstreamAggregateHandoffAcceptancePackage(packageRecord) {
  return sha256({
    schema_version: packageRecord.schema_version,
    acceptance_package_id: packageRecord.acceptance_package_id,
    acceptance_state: packageRecord.acceptance_state,
    source_system: packageRecord.source_system,
    execution_boundary: packageRecord.execution_boundary,
    fluencytracr_execution_mode: packageRecord.fluencytracr_execution_mode,
    upstream_handoff_ref: packageRecord.upstream_handoff_ref,
    accepted_refs: packageRecord.accepted_refs,
    acceptance_requirements: packageRecord.acceptance_requirements,
    feeds: packageRecord.feeds,
    boundary_policy: packageRecord.boundary_policy,
    blocked_uses: packageRecord.blocked_uses,
    required_caveats: packageRecord.required_caveats
  });
}

function buildValidationSummary(packageRecord, extraGaps = []) {
  const normalizedPackage = {
    ...packageRecord,
    validation_summary: {
      schema_version: RESULT_SCHEMA_VERSION,
      valid: packageRecord.acceptance_state === PASSED_STATE,
      acceptance_state: packageRecord.acceptance_state,
      gaps: extraGaps
    }
  };
  const gaps = [...extraGaps, ...validatePackageShape(normalizedPackage)];
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    valid: gaps.length === 0 && packageRecord.acceptance_state === PASSED_STATE,
    acceptance_state: packageRecord.acceptance_state,
    gaps
  };
}

function validateManifestRef(ref, allowedFields, label, sourceSystem) {
  const record = asRecord(ref);
  const gaps = unsupportedFields(record, allowedFields, label);
  if (Object.keys(record).length === 0) {
    gaps.push(`${label} is required`);
  }
  if (record.source_system !== sourceSystem) {
    gaps.push(`${label}.source_system must match acceptance source_system`);
  }
  if (typeof record.manifest_hash !== "string" || !/^[a-f0-9]{64}$/.test(record.manifest_hash)) {
    gaps.push(`${label}.manifest_hash must be a sha256 hash`);
  }
  if (record.window) {
    gaps.push(...unsupportedFields(asRecord(record.window), WINDOW_REF_FIELDS, `${label}.window`));
  }
  gaps.push(...scanUnsafe(record, label));
  return gaps;
}

function validateAcceptedRefs(refs, sourceSystem) {
  const gaps = unsupportedFields(refs, ACCEPTED_REFS_FIELDS, "accepted_refs");
  const record = asRecord(refs);
  if (record.compact_refs_only !== true) {
    gaps.push("accepted_refs.compact_refs_only must be true");
  }
  gaps.push(
    ...validateManifestRef(
      record.source_inventory_manifest_ref,
      SOURCE_INVENTORY_MANIFEST_REF_FIELDS,
      "accepted_refs.source_inventory_manifest_ref",
      sourceSystem
    )
  );
  gaps.push(
    ...validateManifestRef(
      record.aggregate_extraction_manifest_ref,
      AGGREGATE_EXTRACTION_MANIFEST_REF_FIELDS,
      "accepted_refs.aggregate_extraction_manifest_ref",
      sourceSystem
    )
  );
  gaps.push(
    ...validateManifestRef(
      record.pipeline_run_review_manifest_ref,
      PIPELINE_RUN_REVIEW_MANIFEST_REF_FIELDS,
      "accepted_refs.pipeline_run_review_manifest_ref",
      sourceSystem
    )
  );
  const alignment = asRecord(record.data_spine_alignment_ref);
  gaps.push(
    ...unsupportedFields(
      alignment,
      DATA_SPINE_ALIGNMENT_REF_FIELDS,
      "accepted_refs.data_spine_alignment_ref"
    )
  );
  if (alignment.source_system !== sourceSystem) {
    gaps.push("accepted_refs.data_spine_alignment_ref.source_system must match acceptance source_system");
  }
  for (const field of [
    "source_lane",
    "org_id",
    "client_id",
    "workflow_family",
    "function_area",
    "cohort_key",
    "metric_id",
    "expectation_path_id"
  ]) {
    if (typeof alignment[field] !== "string" || !alignment[field].trim()) {
      gaps.push(`accepted_refs.data_spine_alignment_ref.${field} is required`);
    }
  }
  gaps.push(...scanUnsafe(alignment, "accepted_refs.data_spine_alignment_ref"));
  const queueRef = asRecord(record.source_package_review_queue_posture_ref);
  gaps.push(
    ...unsupportedFields(
      queueRef,
      SOURCE_PACKAGE_REVIEW_QUEUE_POSTURE_REF_FIELDS,
      "accepted_refs.source_package_review_queue_posture_ref"
    )
  );
  if (queueRef.queue_state !== "DATA_SPINE_REVIEW_READY") {
    gaps.push("accepted_refs.source_package_review_queue_posture_ref.queue_state must remain DATA_SPINE_REVIEW_READY");
  }
  gaps.push(...scanUnsafe(record.source_package_review_queue_posture_ref, "accepted_refs.source_package_review_queue_posture_ref"));
  return gaps;
}

function validateUpstreamHandoffRef(ref, sourceSystem) {
  const gaps = unsupportedFields(ref, UPSTREAM_HANDOFF_REF_FIELDS, "upstream_handoff_ref");
  const record = asRecord(ref);
  if (record.handoff_state !== REQUIRED_HANDOFF_STATE) {
    gaps.push("upstream_handoff_ref.handoff_state must be READY_FOR_UPSTREAM_AGGREGATE_HANDOFF_ACCEPTANCE_REVIEW");
  }
  if (record.source_system !== sourceSystem) {
    gaps.push("upstream_handoff_ref.source_system must match acceptance source_system");
  }
  if (typeof record.handoff_hash !== "string" || !/^[a-f0-9]{64}$/.test(record.handoff_hash)) {
    gaps.push("upstream_handoff_ref.handoff_hash must be a sha256 hash");
  }
  gaps.push(
    ...unsupportedFields(
      asRecord(record.concept_review_ref),
      CONCEPT_REVIEW_REF_FIELDS,
      "upstream_handoff_ref.concept_review_ref"
    )
  );
  gaps.push(
    ...unsupportedFields(
      asRecord(record.manifest_package_ref),
      HANDOFF_MANIFEST_PACKAGE_REF_FIELDS,
      "upstream_handoff_ref.manifest_package_ref"
    )
  );
  if (
    typeof record.concept_review_ref?.review_hash !== "string" ||
    !/^[a-f0-9]{64}$/.test(record.concept_review_ref.review_hash)
  ) {
    gaps.push("upstream_handoff_ref.concept_review_ref.review_hash must be a sha256 hash");
  }
  if (
    typeof record.concept_review_ref?.concept_gate_hash !== "string" ||
    !/^[a-f0-9]{64}$/.test(record.concept_review_ref.concept_gate_hash)
  ) {
    gaps.push("upstream_handoff_ref.concept_review_ref.concept_gate_hash must be a sha256 hash");
  }
  if (
    record.manifest_package_ref?.manifest_validation_state !==
    "PASSED_CONTROLLED_AGGREGATE_MANIFEST_VALIDATION"
  ) {
    gaps.push("upstream_handoff_ref.manifest_package_ref.manifest_validation_state must be passed");
  }
  gaps.push(...scanUnsafe(record, "upstream_handoff_ref"));
  return gaps;
}

function validatePackageShape(packageRecord) {
  const gaps = [];
  const record = asRecord(packageRecord);
  gaps.push(...unsupportedFields(record, PACKAGE_FIELDS, "acceptance_package"));
  if (record.schema_version !== UPSTREAM_AGGREGATE_HANDOFF_ACCEPTANCE_PACKAGE_SCHEMA_VERSION) {
    gaps.push("schema_version is not supported");
  }
  if (![PASSED_STATE, HOLD_STATE, REJECTED_STATE].includes(record.acceptance_state)) {
    gaps.push("acceptance_state is not supported");
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
  if (record.generated_at !== "2026-06-24T00:00:00.000Z") {
    gaps.push("generated_at must match the governed acceptance package timestamp");
  }
  if (record.derivation_version !== "upstream_aggregate_handoff_acceptance_package_2026_06") {
    gaps.push("derivation_version is not supported");
  }
  gaps.push(...validateUpstreamHandoffRef(record.upstream_handoff_ref, record.source_system));
  gaps.push(...validateAcceptedRefs(record.accepted_refs, record.source_system));
  gaps.push(
    ...exactTrueMapGaps(
      record.acceptance_requirements,
      ACCEPTANCE_REQUIREMENT_FIELDS,
      "acceptance_requirements"
    )
  );
  const feeds = asRecord(record.feeds);
  for (const key of TRUE_FEEDS) {
    if (feeds[key] !== true && record.acceptance_state === PASSED_STATE) {
      gaps.push(`feeds.${key} must be true for passed acceptance package`);
    } else if (feeds[key] !== false && record.acceptance_state !== PASSED_STATE) {
      gaps.push(`feeds.${key} must remain false unless acceptance package is passed`);
    }
  }
  for (const key of FALSE_FEEDS) {
    if (feeds[key] !== false) {
      gaps.push(`feeds.${key} must remain false`);
    }
  }
  gaps.push(...unsupportedFields(feeds, new Set([...TRUE_FEEDS, ...FALSE_FEEDS]), "feeds"));
  gaps.push(...exactFalseMapGaps(record.boundary_policy, BOUNDARY_POLICY_FIELDS, "boundary_policy"));
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
    if (record.acceptance_state === PASSED_STATE && validationSummary.gaps.length > 0) {
      gaps.push("validation_summary.gaps must be empty for passed acceptance package");
    }
  }
  if (validationSummary.acceptance_state !== record.acceptance_state) {
    gaps.push("validation_summary.acceptance_state must match acceptance_state");
  }
  if (validationSummary.valid !== (record.acceptance_state === PASSED_STATE)) {
    gaps.push("validation_summary.valid must match acceptance_state readiness");
  }
  return gaps;
}

function scanUnsafeOverrides(value) {
  return scanUnsafe(value, "proposal override");
}

export function buildUpstreamAggregateHandoffAcceptancePackageFromObject(
  sourceFixture,
  options = {}
) {
  const requestedSourceSystem =
    typeof options.sourceSystem === "string" && options.sourceSystem.trim()
      ? options.sourceSystem.trim()
      : "bigquery_export";
  const sourceSystemSupported = ALLOWED_SOURCE_SYSTEMS.has(requestedSourceSystem);
  const sourceSystem = sourceSystemSupported
    ? requestedSourceSystem
    : "unsupported_source_system";
  const fixture = clone(sourceFixture);
  const expectedSourceSystem = sourceSystemSupported ? sourceSystem : "bigquery_export";
  const upstreamHandoff =
    options.upstreamHandoff ??
    buildUpstreamAggregatePipelineHandoffFromObject(fixture, {
      sourceSystem: expectedSourceSystem
    });
  const upstreamHandoffValidation = validateUpstreamAggregatePipelineHandoff(upstreamHandoff, {
    sourceFixture: fixture
  });
  const overrideGaps = [
    ...(!sourceSystemSupported
      ? ["sourceSystem must be bigquery_export or sigma_export"]
      : []),
    ...scanUnsafeOverrides(options.proposalOverrides ?? {})
  ];
  const handoffReady =
    upstreamHandoff?.handoff_state === REQUIRED_HANDOFF_STATE &&
    upstreamHandoffValidation.valid === true &&
    upstreamHandoff.source_system === sourceSystem;
  const canEmitCompactRefs =
    handoffReady &&
    overrideGaps.length === 0 &&
    sourceSystemSupported;

  let acceptanceState = PASSED_STATE;
  if (overrideGaps.length > 0) {
    acceptanceState = REJECTED_STATE;
  } else if (!handoffReady) {
    acceptanceState = HOLD_STATE;
  }

  const packageRecord = {
    schema_version: UPSTREAM_AGGREGATE_HANDOFF_ACCEPTANCE_PACKAGE_SCHEMA_VERSION,
    acceptance_package_id: `upstream_aggregate_handoff_acceptance_package_${compactToken(sourceSystem, "unsupported_source_system")}_${compactToken(
      fixture?.data_spine_input?.sources?.vbdToken?.workflow_family ??
        fixture?.measurement_cell_input?.workflow_family,
      "aggregate_workflow"
    )}`,
    acceptance_state: acceptanceState,
    source_system: sourceSystem,
    execution_boundary: "approved_glean_or_customer_environment",
    fluencytracr_execution_mode: "no_live_execution",
    upstream_handoff_ref: canEmitCompactRefs
      ? compactUpstreamHandoffRef(upstreamHandoff)
      : emptyUpstreamHandoffRef(upstreamHandoff),
    accepted_refs: canEmitCompactRefs
      ? compactAcceptedRefs(upstreamHandoff)
      : emptyAcceptedRefs(),
    acceptance_requirements: trueMap(ACCEPTANCE_REQUIREMENT_FIELDS),
    feeds: {
      ...(acceptanceState === PASSED_STATE
        ? trueMap(TRUE_FEEDS)
        : falseMap(TRUE_FEEDS)),
      ...falseMap(FALSE_FEEDS)
    },
    boundary_policy: falseMap(BOUNDARY_POLICY_FIELDS),
    blocked_uses: REQUIRED_BLOCKED_USES,
    required_caveats: REQUIRED_CAVEATS,
    validation_summary: {
      schema_version: RESULT_SCHEMA_VERSION,
      valid: false,
      acceptance_state: acceptanceState,
      gaps: []
    },
    generated_at: "2026-06-24T00:00:00.000Z",
    derivation_version: "upstream_aggregate_handoff_acceptance_package_2026_06",
    acceptance_package_hash: null
  };
  packageRecord.validation_summary = buildValidationSummary(packageRecord, [
    ...overrideGaps,
    ...upstreamHandoffValidation.gaps.map((gap) => `upstream_handoff: ${gap}`)
  ]);
  packageRecord.acceptance_package_hash =
    hashUpstreamAggregateHandoffAcceptancePackage(packageRecord);
  packageRecord.validation_summary = buildValidationSummary(packageRecord, [
    ...overrideGaps,
    ...upstreamHandoffValidation.gaps.map((gap) => `upstream_handoff: ${gap}`)
  ]);
  return packageRecord;
}

export function validateUpstreamAggregateHandoffAcceptancePackage(
  packageRecord,
  options = {}
) {
  const record = asRecord(packageRecord);
  const gaps = validatePackageShape(record);
  if (
    record.acceptance_package_hash !==
    hashUpstreamAggregateHandoffAcceptancePackage(record)
  ) {
    gaps.push("acceptance_package_hash must match compact acceptance package envelope");
  }
  if (record.acceptance_state === PASSED_STATE && !options.sourceFixture) {
    gaps.push("sourceFixture is required to validate passed acceptance package");
  }
  if (options.sourceFixture && ALLOWED_SOURCE_SYSTEMS.has(record.source_system)) {
    const expectedHandoff = buildUpstreamAggregatePipelineHandoffFromObject(
      options.sourceFixture,
      { sourceSystem: record.source_system }
    );
    const expectedPackage = buildUpstreamAggregateHandoffAcceptancePackageFromObject(
      options.sourceFixture,
      {
        sourceSystem: record.source_system,
        upstreamHandoff: expectedHandoff
      }
    );
    if (record.acceptance_package_id !== expectedPackage.acceptance_package_id) {
      gaps.push("acceptance_package_id must match recomputed upstream acceptance proof");
    }
    if (
      JSON.stringify(record.upstream_handoff_ref) !==
      JSON.stringify(expectedPackage.upstream_handoff_ref)
    ) {
      gaps.push("upstream_handoff_ref must match recomputed upstream acceptance proof");
    }
    if (
      JSON.stringify(record.accepted_refs) !==
      JSON.stringify(expectedPackage.accepted_refs)
    ) {
      gaps.push("accepted_refs must match recomputed upstream acceptance proof");
    }
  }
  if (record.acceptance_state === HOLD_STATE) {
    if (record.upstream_handoff_ref?.handoff_state === REQUIRED_HANDOFF_STATE) {
      gaps.push("hold state requires a non-ready upstream aggregate pipeline handoff");
    }
  }
  if (record.acceptance_state === REJECTED_STATE) {
    const falseFeedsOk = FALSE_FEEDS.every((feed) => record.feeds?.[feed] === false);
    const falsePolicyOk = BOUNDARY_POLICY_FIELDS.every(
      (field) => record.boundary_policy?.[field] === false
    );
    if (!falseFeedsOk || !falsePolicyOk) {
      gaps.push("rejected acceptance package must keep false feeds and boundary policy false");
    }
  }
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    valid: gaps.length === 0 && record.acceptance_state === PASSED_STATE,
    acceptance_state: record.acceptance_state,
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
  const packageRecord = buildUpstreamAggregateHandoffAcceptancePackageFromObject(
    fixture,
    { sourceSystem }
  );
  const validation = validateUpstreamAggregateHandoffAcceptancePackage(packageRecord, {
    sourceFixture: fixture
  });
  packageRecord.validation_summary = validation;
  process.stdout.write(`${JSON.stringify(packageRecord, null, 2)}\n`);
  if (!validation.valid) {
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
