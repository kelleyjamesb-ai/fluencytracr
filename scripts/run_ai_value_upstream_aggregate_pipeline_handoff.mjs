#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildControlledAggregateManifestValidationPackageFromObject,
  validateControlledAggregateManifestValidationPackage
} from "./run_ai_value_controlled_aggregate_manifest_validation.mjs";
import {
  buildLivePipelineConceptReviewFromObject,
  validateLivePipelineConceptReview
} from "./run_ai_value_live_pipeline_concept_review.mjs";

export const UPSTREAM_AGGREGATE_PIPELINE_HANDOFF_SCHEMA_VERSION =
  "FT_AI_VALUE_UPSTREAM_AGGREGATE_PIPELINE_HANDOFF_2026_06";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_UPSTREAM_AGGREGATE_PIPELINE_HANDOFF_RESULT_2026_06";

const DEFAULT_FIXTURE_PATH =
  "docs/contracts/ai-value-real-data-intake-packet-runner/examples/controlled-aggregate-fixture-review-ready.json";

const ALLOWED_SOURCE_SYSTEMS = new Set(["bigquery_export", "sigma_export"]);

const READY_STATE = "READY_FOR_UPSTREAM_AGGREGATE_HANDOFF_ACCEPTANCE_REVIEW";
const HOLD_STATE = "HOLD_FOR_VALID_LIVE_PIPELINE_CONCEPT_REVIEW";
const REJECTED_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";

const TRUE_FEEDS = [
  "upstream_aggregate_handoff_acceptance_review",
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
  "Upstream aggregate pipeline handoff is an acceptance-review package only.",
  "Execution remains upstream in an approved Glean or customer environment.",
  "FluencyTracr may receive compact manifest refs and aggregate-boundary refs only.",
  "This handoff does not authorize live execution, credentials, SQL/query handling, raw rows, persistence, routes, UI, exports, research-model feed, finance output, or customer-facing output."
];

const HANDOFF_FIELDS = new Set([
  "schema_version",
  "handoff_id",
  "handoff_state",
  "source_system",
  "execution_boundary",
  "fluencytracr_execution_mode",
  "concept_review_ref",
  "manifest_package_ref",
  "accepted_components",
  "handoff_requirements",
  "feeds",
  "boundary_policy",
  "blocked_uses",
  "required_caveats",
  "validation_summary",
  "generated_at",
  "derivation_version",
  "handoff_hash"
]);

const CONCEPT_REVIEW_REF_FIELDS = new Set([
  "review_id",
  "review_state",
  "source_system",
  "review_hash",
  "concept_gate_ref"
]);

const MANIFEST_PACKAGE_REF_FIELDS = new Set([
  "manifest_validation_state",
  "source_system",
  "adapter_run_id",
  "source_inventory_manifest_ref",
  "aggregate_extraction_manifest_ref",
  "pipeline_run_review_manifest_ref",
  "data_spine_alignment_ref",
  "source_package_review_queue_posture_ref"
]);

const ACCEPTED_COMPONENT_FIELDS = new Set([
  "source_inventory_manifest_ref",
  "aggregate_extraction_manifest_ref",
  "pipeline_run_review_manifest_ref",
  "source_package_review_queue_posture_ref",
  "data_spine_alignment_ref",
  "concept_review_ref",
  "compact_refs_only"
]);

const HANDOFF_REQUIREMENT_FIELDS = new Set([
  "source_owner_attestation_required",
  "legal_trust_review_required",
  "upstream_k_min_required",
  "upstream_suppression_required",
  "approved_aggregate_manifest_required",
  "measurement_cell_preflight_binding_required",
  "full_manifest_payload_blocked",
  "query_text_blocked",
  "raw_rows_blocked",
  "identifier_fields_blocked",
  "persistence_blocked",
  "customer_output_blocked"
]);

const VALIDATION_SUMMARY_FIELDS = new Set([
  "schema_version",
  "valid",
  "handoff_state",
  "gaps"
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
  /api_?handle/i,
  /dashboard_?handle/i,
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
  /table_?handle/i,
  /workbook_?id/i,
  /workbook_?handle/i,
  /sigma_?workbook/i,
  /^manifests$/i,
  /full_?manifest/i,
  /payload/i,
  /payload_?b64/i,
  /source_?refs?_?json/i,
  /payload_?json/i,
  /validation_?json/i,
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
  /durable_?storage/i
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

const EXPECTED_ARTIFACT_CACHE = new Map();

function expectedArtifactFromFixture(fixture, sourceSystem, label, builder, validator) {
  const key = `${label}:${sourceSystem}:${sha256(fixture)}`;
  if (!EXPECTED_ARTIFACT_CACHE.has(key)) {
    const artifact = builder(fixture, { sourceSystem });
    const validation = artifact?.validation_summary?.valid === true
      ? artifact.validation_summary
      : validator(artifact, { sourceFixture: fixture });
    EXPECTED_ARTIFACT_CACHE.set(key, { artifact, validation });
  }
  return EXPECTED_ARTIFACT_CACHE.get(key);
}

function expectedConceptReviewFromFixture(fixture, sourceSystem) {
  return expectedArtifactFromFixture(
    fixture,
    sourceSystem,
    "live_pipeline_concept_review",
    buildLivePipelineConceptReviewFromObject,
    validateLivePipelineConceptReview
  );
}

function expectedManifestPackageFromFixture(fixture, sourceSystem) {
  return expectedArtifactFromFixture(
    fixture,
    sourceSystem,
    "controlled_aggregate_manifest_validation_package",
    buildControlledAggregateManifestValidationPackageFromObject,
    validateControlledAggregateManifestValidationPackage
  );
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

function scanCompactRefSafety(value, label) {
  const gaps = [];
  const visit = (nestedValue) => {
    if (Array.isArray(nestedValue)) {
      nestedValue.forEach((item) => visit(item));
      return;
    }
    if (nestedValue && typeof nestedValue === "object") {
      for (const [key, child] of Object.entries(nestedValue)) {
        if (FORBIDDEN_OVERRIDE_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
          gaps.push(`${label} contains a forbidden compact-ref key`);
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
      gaps.push(`${label} contains forbidden compact-ref text`);
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
    : [`${label} must match the governed upstream handoff contract exactly`];
}

function compactConceptReviewRef(review) {
  return {
    review_id: review?.review_id ?? null,
    review_state: review?.review_state ?? null,
    source_system: review?.source_system ?? null,
    review_hash: review?.review_hash ?? null,
    concept_gate_ref: review?.concept_gate_ref ?? null
  };
}

function compactManifestPackageRef(manifestPackage) {
  const pipelineManifest =
    manifestPackage?.manifests?.pipeline_run_review_manifest ?? {};
  const envelope = pipelineManifest.data_spine_alignment_envelope ?? {};
  return {
    manifest_validation_state: manifestPackage?.manifest_validation_state ?? null,
    source_system: manifestPackage?.source_system ?? null,
    adapter_run_id: manifestPackage?.adapter_run_id ?? null,
    source_inventory_manifest_ref:
      manifestPackage?.manifest_refs?.source_inventory_manifest_ref ?? null,
    aggregate_extraction_manifest_ref:
      manifestPackage?.manifest_refs?.aggregate_extraction_manifest_ref ?? null,
    pipeline_run_review_manifest_ref:
      manifestPackage?.manifest_refs?.pipeline_run_review_manifest_ref ?? null,
    data_spine_alignment_ref: {
      source_system: envelope.source_system ?? null,
      source_lane: envelope.source_lane ?? null,
      org_id: envelope.org_id ?? null,
      client_id: envelope.client_id ?? null,
      workflow_family: envelope.workflow_family ?? null,
      function_area: envelope.function_area ?? null,
      cohort_key: envelope.cohort_key ?? null,
      metric_id: envelope.metric_id ?? null,
      expectation_path_id: envelope.expectation_path_id ?? null
    },
    source_package_review_queue_posture_ref:
      pipelineManifest.source_package_review_queue_posture_ref ?? null
  };
}

function buildValidationSummary(handoff, extraGaps = []) {
  const normalizedHandoff = {
    ...handoff,
    validation_summary: {
      schema_version: RESULT_SCHEMA_VERSION,
      valid: handoff.handoff_state === READY_STATE,
      handoff_state: handoff.handoff_state,
      gaps: extraGaps
    }
  };
  const gaps = [...extraGaps, ...validateHandoffShape(normalizedHandoff)];
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    valid: gaps.length === 0 && handoff.handoff_state === READY_STATE,
    handoff_state: handoff.handoff_state,
    gaps
  };
}

function validateManifestPackageRef(ref, sourceSystem) {
  const gaps = unsupportedFields(ref, MANIFEST_PACKAGE_REF_FIELDS, "manifest_package_ref");
  const record = asRecord(ref);
  if (record.manifest_validation_state !== "PASSED_CONTROLLED_AGGREGATE_MANIFEST_VALIDATION") {
    gaps.push("manifest_package_ref.manifest_validation_state must be passed");
  }
  if (record.source_system !== sourceSystem) {
    gaps.push("manifest_package_ref.source_system must match handoff source_system");
  }
  for (const [label, manifestRef] of [
    ["source_inventory_manifest_ref", record.source_inventory_manifest_ref],
    ["aggregate_extraction_manifest_ref", record.aggregate_extraction_manifest_ref],
    ["pipeline_run_review_manifest_ref", record.pipeline_run_review_manifest_ref]
  ]) {
    const nested = asRecord(manifestRef);
    if (Object.keys(nested).length === 0) {
      gaps.push(`manifest_package_ref.${label} is required`);
    }
    const allowedFields =
      label === "source_inventory_manifest_ref"
        ? SOURCE_INVENTORY_MANIFEST_REF_FIELDS
        : label === "aggregate_extraction_manifest_ref"
          ? AGGREGATE_EXTRACTION_MANIFEST_REF_FIELDS
          : PIPELINE_RUN_REVIEW_MANIFEST_REF_FIELDS;
    gaps.push(
      ...unsupportedFields(
        nested,
        allowedFields,
        `manifest_package_ref.${label}`
      )
    );
    if (nested.source_system !== sourceSystem) {
      gaps.push(`manifest_package_ref.${label}.source_system must match handoff source_system`);
    }
    if (typeof nested.manifest_hash !== "string" || !/^[a-f0-9]{64}$/.test(nested.manifest_hash)) {
      gaps.push(`manifest_package_ref.${label}.manifest_hash must be a sha256 hash`);
    }
    gaps.push(...scanCompactRefSafety(nested, `manifest_package_ref.${label}`));
    if (nested.window) {
      const windowRef = asRecord(nested.window);
      gaps.push(
        ...unsupportedFields(
          windowRef,
          WINDOW_REF_FIELDS,
          `manifest_package_ref.${label}.window`
        )
      );
    }
  }
  const alignment = asRecord(record.data_spine_alignment_ref);
  gaps.push(
    ...unsupportedFields(
      alignment,
      DATA_SPINE_ALIGNMENT_REF_FIELDS,
      "manifest_package_ref.data_spine_alignment_ref"
    )
  );
  if (alignment.source_system !== sourceSystem) {
    gaps.push("manifest_package_ref.data_spine_alignment_ref.source_system must match handoff source_system");
  }
  for (const requiredAlignmentField of [
    "source_lane",
    "org_id",
    "client_id",
    "workflow_family",
    "function_area",
    "cohort_key",
    "metric_id",
    "expectation_path_id"
  ]) {
    if (
      typeof alignment[requiredAlignmentField] !== "string" ||
      !alignment[requiredAlignmentField].trim()
    ) {
      gaps.push(`manifest_package_ref.data_spine_alignment_ref.${requiredAlignmentField} is required`);
    }
  }
  gaps.push(
    ...unsupportedFields(
      asRecord(record.source_package_review_queue_posture_ref),
      SOURCE_PACKAGE_REVIEW_QUEUE_POSTURE_REF_FIELDS,
      "manifest_package_ref.source_package_review_queue_posture_ref"
    )
  );
  gaps.push(
    ...scanCompactRefSafety(
      record.source_package_review_queue_posture_ref,
      "manifest_package_ref.source_package_review_queue_posture_ref"
    )
  );
  return gaps;
}

function validateConceptReviewRef(ref, sourceSystem) {
  const gaps = unsupportedFields(ref, CONCEPT_REVIEW_REF_FIELDS, "concept_review_ref");
  const record = asRecord(ref);
  if (record.review_state !== "READY_FOR_UPSTREAM_AGGREGATE_PIPELINE_DESIGN") {
    gaps.push("concept_review_ref.review_state must be READY_FOR_UPSTREAM_AGGREGATE_PIPELINE_DESIGN");
  }
  if (record.source_system !== sourceSystem) {
    gaps.push("concept_review_ref.source_system must match handoff source_system");
  }
  if (typeof record.review_hash !== "string" || !/^[a-f0-9]{64}$/.test(record.review_hash)) {
    gaps.push("concept_review_ref.review_hash must be a sha256 hash");
  }
  if (!record.concept_gate_ref || typeof record.concept_gate_ref !== "object") {
    gaps.push("concept_review_ref.concept_gate_ref is required");
  }
  return gaps;
}

function validateHandoffShape(handoff) {
  const gaps = [];
  const record = asRecord(handoff);
  gaps.push(...unsupportedFields(record, HANDOFF_FIELDS, "handoff"));
  if (record.schema_version !== UPSTREAM_AGGREGATE_PIPELINE_HANDOFF_SCHEMA_VERSION) {
    gaps.push("schema_version is not supported");
  }
  if (![READY_STATE, HOLD_STATE, REJECTED_STATE].includes(record.handoff_state)) {
    gaps.push("handoff_state is not supported");
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
  if (record.generated_at !== "2026-06-23T00:00:00.000Z") {
    gaps.push("generated_at must match the governed upstream handoff timestamp");
  }
  if (record.derivation_version !== "upstream_aggregate_pipeline_handoff_2026_06") {
    gaps.push("derivation_version is not supported");
  }
  for (const field of ["generated_at", "derivation_version"]) {
    if (
      typeof record[field] !== "string" ||
      FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(record[field]))
    ) {
      gaps.push(`${field} must not contain unsafe text`);
    }
  }
  gaps.push(...validateConceptReviewRef(record.concept_review_ref, record.source_system));
  gaps.push(...validateManifestPackageRef(record.manifest_package_ref, record.source_system));
  gaps.push(
    ...exactTrueMapGaps(
      record.accepted_components,
      [...ACCEPTED_COMPONENT_FIELDS],
      "accepted_components"
    )
  );
  gaps.push(
    ...exactTrueMapGaps(
      record.handoff_requirements,
      [...HANDOFF_REQUIREMENT_FIELDS],
      "handoff_requirements"
    )
  );
  gaps.push(...exactFalseMapGaps(record.boundary_policy, BOUNDARY_POLICY_FIELDS, "boundary_policy"));
  const feeds = asRecord(record.feeds);
  for (const key of TRUE_FEEDS) {
    if (feeds[key] !== true && record.handoff_state === READY_STATE) {
      gaps.push(`feeds.${key} must be true for ready upstream handoff`);
    } else if (feeds[key] !== false && record.handoff_state !== READY_STATE) {
      gaps.push(`feeds.${key} must remain false unless upstream handoff is ready`);
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
    if (record.handoff_state === READY_STATE && validationSummary.gaps.length > 0) {
      gaps.push("validation_summary.gaps must be empty for ready upstream handoff");
    }
  }
  if (validationSummary.handoff_state !== record.handoff_state) {
    gaps.push("validation_summary.handoff_state must match handoff_state");
  }
  if (validationSummary.valid !== (record.handoff_state === READY_STATE)) {
    gaps.push("validation_summary.valid must match handoff_state readiness");
  }
  return gaps;
}

export function buildUpstreamAggregatePipelineHandoffFromObject(
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
  const expectedConceptReview = options.conceptReview
    ? null
    : expectedConceptReviewFromFixture(fixture, expectedSourceSystem);
  const expectedManifestPackage = options.manifestPackage
    ? null
    : expectedManifestPackageFromFixture(fixture, expectedSourceSystem);
  const conceptReview = options.conceptReview ?? expectedConceptReview.artifact;
  const manifestPackage = options.manifestPackage ?? expectedManifestPackage.artifact;
  const conceptReviewValidation =
    options.conceptReview
      ? validateLivePipelineConceptReview(conceptReview, { sourceFixture: fixture })
      : expectedConceptReview.validation;
  const manifestPackageValidation =
    options.manifestPackage
      ? validateControlledAggregateManifestValidationPackage(manifestPackage, {
          sourceFixture: fixture
        })
      : expectedManifestPackage.validation;
  const overrideGaps = [
    ...(!sourceSystemSupported
      ? ["sourceSystem must be bigquery_export or sigma_export"]
      : []),
    ...scanUnsafeOverrides(options.proposalOverrides ?? {})
  ];
  const conceptReady =
    conceptReview?.review_state === "READY_FOR_UPSTREAM_AGGREGATE_PIPELINE_DESIGN" &&
    conceptReviewValidation.valid === true &&
    conceptReview.source_system === sourceSystem;
  const manifestReady =
    manifestPackage?.manifest_validation_state ===
      "PASSED_CONTROLLED_AGGREGATE_MANIFEST_VALIDATION" &&
    manifestPackageValidation.valid === true &&
    manifestPackage.source_system === sourceSystem;

  let handoffState = READY_STATE;
  if (overrideGaps.length > 0) {
    handoffState = REJECTED_STATE;
  } else if (!conceptReady || !manifestReady) {
    handoffState = HOLD_STATE;
  }

  const handoff = {
    schema_version: UPSTREAM_AGGREGATE_PIPELINE_HANDOFF_SCHEMA_VERSION,
    handoff_id: `upstream_aggregate_pipeline_handoff_${compactToken(sourceSystem, "unsupported_source_system")}_${compactToken(
      fixture?.data_spine_input?.sources?.vbdToken?.workflow_family ??
        fixture?.measurement_cell_input?.workflow_family,
      "aggregate_workflow"
    )}`,
    handoff_state: handoffState,
    source_system: sourceSystem,
    execution_boundary: "approved_glean_or_customer_environment",
    fluencytracr_execution_mode: "no_live_execution",
    concept_review_ref: compactConceptReviewRef(conceptReview),
    manifest_package_ref: compactManifestPackageRef(manifestPackage),
    accepted_components: trueMap([...ACCEPTED_COMPONENT_FIELDS]),
    handoff_requirements: trueMap([...HANDOFF_REQUIREMENT_FIELDS]),
    feeds: {
      ...(handoffState === READY_STATE
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
      handoff_state: handoffState,
      gaps: []
    },
    generated_at: "2026-06-23T00:00:00.000Z",
    derivation_version: "upstream_aggregate_pipeline_handoff_2026_06",
    handoff_hash: null
  };
  handoff.validation_summary = buildValidationSummary(handoff, [
    ...overrideGaps,
    ...conceptReviewValidation.gaps.map((gap) => `live_pipeline_concept_review: ${gap}`),
    ...manifestPackageValidation.gaps.map((gap) => `controlled_manifest_package: ${gap}`)
  ]);
  handoff.handoff_hash = sha256({
    schema_version: handoff.schema_version,
    handoff_id: handoff.handoff_id,
    handoff_state: handoff.handoff_state,
    source_system: handoff.source_system,
    execution_boundary: handoff.execution_boundary,
    fluencytracr_execution_mode: handoff.fluencytracr_execution_mode,
    concept_review_ref: handoff.concept_review_ref,
    manifest_package_ref: handoff.manifest_package_ref,
    accepted_components: handoff.accepted_components,
    handoff_requirements: handoff.handoff_requirements,
    feeds: handoff.feeds,
    boundary_policy: handoff.boundary_policy,
    blocked_uses: handoff.blocked_uses,
    required_caveats: handoff.required_caveats
  });
  handoff.validation_summary = buildValidationSummary(handoff, [
    ...overrideGaps,
    ...conceptReviewValidation.gaps.map((gap) => `live_pipeline_concept_review: ${gap}`),
    ...manifestPackageValidation.gaps.map((gap) => `controlled_manifest_package: ${gap}`)
  ]);
  return handoff;
}

export function validateUpstreamAggregatePipelineHandoff(handoff, options = {}) {
  const record = asRecord(handoff);
  const gaps = validateHandoffShape(record);

  if (record.handoff_hash !== sha256({
    schema_version: record.schema_version,
    handoff_id: record.handoff_id,
    handoff_state: record.handoff_state,
    source_system: record.source_system,
    execution_boundary: record.execution_boundary,
    fluencytracr_execution_mode: record.fluencytracr_execution_mode,
    concept_review_ref: record.concept_review_ref,
    manifest_package_ref: record.manifest_package_ref,
    accepted_components: record.accepted_components,
    handoff_requirements: record.handoff_requirements,
    feeds: record.feeds,
    boundary_policy: record.boundary_policy,
    blocked_uses: record.blocked_uses,
    required_caveats: record.required_caveats
  })) {
    gaps.push("handoff_hash must match compact upstream handoff envelope");
  }

  if (record.handoff_state === READY_STATE && !options.sourceFixture) {
    gaps.push("sourceFixture is required to validate ready upstream handoff");
  }

  if (options.sourceFixture && ALLOWED_SOURCE_SYSTEMS.has(record.source_system)) {
    const expectedReview = expectedConceptReviewFromFixture(
      options.sourceFixture,
      record.source_system
    ).artifact;
    const expectedManifestPackage = expectedManifestPackageFromFixture(
      options.sourceFixture,
      record.source_system
    ).artifact;
    const expectedConceptReviewRef = compactConceptReviewRef(expectedReview);
    const expectedManifestPackageRef = compactManifestPackageRef(expectedManifestPackage);
    const expectedHandoffId = `upstream_aggregate_pipeline_handoff_${compactToken(record.source_system, "unsupported_source_system")}_${compactToken(
      options.sourceFixture?.data_spine_input?.sources?.vbdToken?.workflow_family ??
        options.sourceFixture?.measurement_cell_input?.workflow_family,
      "aggregate_workflow"
    )}`;
    if (record.handoff_id !== expectedHandoffId) {
      gaps.push("handoff_id must match recomputed upstream handoff proof");
    }
    if (JSON.stringify(record.concept_review_ref) !== JSON.stringify(expectedConceptReviewRef)) {
      gaps.push("concept_review_ref must match recomputed upstream handoff proof");
    }
    if (JSON.stringify(record.manifest_package_ref) !== JSON.stringify(expectedManifestPackageRef)) {
      gaps.push("manifest_package_ref must match recomputed upstream handoff proof");
    }
  }

  if (record.handoff_state === HOLD_STATE) {
    const conceptReady =
      record.concept_review_ref?.review_state ===
      "READY_FOR_UPSTREAM_AGGREGATE_PIPELINE_DESIGN";
    const manifestReady =
      record.manifest_package_ref?.manifest_validation_state ===
      "PASSED_CONTROLLED_AGGREGATE_MANIFEST_VALIDATION";
    if (conceptReady && manifestReady) {
      gaps.push("hold state requires a non-ready concept review or manifest package");
    }
  }
  if (record.handoff_state === REJECTED_STATE) {
    const falseFeedsOk = FALSE_FEEDS.every((feed) => record.feeds?.[feed] === false);
    const falsePolicyOk = BOUNDARY_POLICY_FIELDS.every(
      (field) => record.boundary_policy?.[field] === false
    );
    if (!falseFeedsOk || !falsePolicyOk) {
      gaps.push("rejected upstream handoff must keep false feeds and boundary policy false");
    }
  }

  return {
    schema_version: RESULT_SCHEMA_VERSION,
    valid: gaps.length === 0 && record.handoff_state === READY_STATE,
    handoff_state: record.handoff_state,
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
  const handoff = buildUpstreamAggregatePipelineHandoffFromObject(fixture, {
    sourceSystem
  });
  const validation = validateUpstreamAggregatePipelineHandoff(handoff, {
    sourceFixture: fixture
  });
  handoff.validation_summary = validation;
  process.stdout.write(`${JSON.stringify(handoff, null, 2)}\n`);
  if (!validation.valid) {
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
