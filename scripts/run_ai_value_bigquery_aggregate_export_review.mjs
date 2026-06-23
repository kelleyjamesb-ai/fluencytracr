#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildAggregateConnectorBoundaryPlanFromObject,
  validateAggregateConnectorBoundaryPlan
} from "./run_ai_value_aggregate_connector_boundary_plan.mjs";

export const BIGQUERY_AGGREGATE_EXPORT_REVIEW_SCHEMA_VERSION =
  "FT_AI_VALUE_BIGQUERY_AGGREGATE_EXPORT_REVIEW_2026_06";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_BIGQUERY_AGGREGATE_EXPORT_REVIEW_RESULT_2026_06";

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
  "dashboard_row_ingestion",
  "bigquery_job_metadata_ingestion",
  "project_dataset_table_ref_ingestion",
  "connector_run_persistence",
  "pipeline_run_persistence",
  "controlled_manifest_persistence",
  "bigquery_export_review_persistence",
  "source_package_clearance",
  "measurement_cell_creation",
  "measurement_cell_snapshot_persistence",
  "measurement_cell_series_persistence",
  "route_creation",
  "ui_creation",
  "schema_creation",
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
  "BigQuery aggregate export review is upstream-attested aggregate metadata only.",
  "FluencyTracr does not run BigQuery, receive SQL, retain job metadata, or inspect table refs.",
  "BigQuery aggregate export review is not Source Package clearance or Measurement Cell readiness.",
  "BigQuery aggregate export review is not customer-facing output, finance output, or research-model scoring."
];

const TRUE_FEEDS = [
  "bigquery_aggregate_export_review",
  "aggregate_connector_boundary_plan_reference"
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
  "bigquery_job_metadata_ingestion",
  "project_dataset_table_ref_ingestion",
  "durable_bigquery_export_review_storage",
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
  "fluencytracr_receives_bigquery_job_metadata",
  "fluencytracr_receives_project_dataset_table_refs",
  "fluencytracr_receives_prompts",
  "fluencytracr_receives_transcripts",
  "fluencytracr_receives_identifiers",
  "persists_bigquery_export_review",
  "persists_connector_run",
  "persists_pipeline_run",
  "persists_controlled_manifests",
  "creates_source_package",
  "clears_source_package_review",
  "creates_measurement_cell",
  "creates_measurement_cell_snapshot",
  "creates_measurement_cell_series",
  "creates_backend_routes",
  "creates_frontend_ui",
  "creates_schemas",
  "creates_exports",
  "feeds_research_model",
  "emits_probability",
  "computes_roi",
  "emits_financial_attribution",
  "emits_customer_facing_output"
];

const REVIEW_FIELDS = new Set([
  "schema_version",
  "review_state",
  "review_id",
  "source_system",
  "source_owner_role",
  "source_owner_attestation",
  "execution_boundary",
  "fluencytracr_execution_mode",
  "bigquery_review_attestation",
  "aggregate_definition_ref",
  "aggregate_output_ref",
  "approved_output_fields",
  "aggregate_grain",
  "source_alignment",
  "source_quality_posture",
  "connector_boundary_plan_ref",
  "allowed_uses",
  "blocked_uses",
  "feeds",
  "boundary_policy",
  "required_caveats",
  "validation_summary",
  "generated_at"
]);

const SOURCE_OWNER_ATTESTATION_FIELDS = new Set([
  "attestation_state",
  "attested_by_role",
  "attested_at",
  "review_state"
]);

const BIGQUERY_REVIEW_ATTESTATION_FIELDS = new Set([
  "upstream_execution_environment",
  "aggregate_export_review_state",
  "dry_run_attestation_state",
  "dry_run_attestation_ref",
  "dry_run_reviewed_by_role",
  "dry_run_reviewed_at",
  "query_text_retained",
  "job_metadata_retained",
  "project_dataset_table_refs_retained",
  "raw_rows_retained",
  "dashboard_rows_retained",
  "credential_material_retained",
  "user_identifiers_retained",
  "cost_review_posture"
]);

const SOURCE_ALIGNMENT_FIELDS = new Set([
  "org_id",
  "client_id",
  "measurement_plan_id",
  "workflow_family",
  "workflow_id",
  "function_area",
  "cohort_key",
  "baseline_window",
  "comparison_window",
  "metric_id",
  "expectation_path_id"
]);

const SOURCE_QUALITY_POSTURE_FIELDS = new Set([
  "k_min_posture",
  "suppression_posture",
  "freshness_state",
  "legal_trust_review_state"
]);

const CONNECTOR_BOUNDARY_PLAN_REF_FIELDS = new Set([
  "boundary_plan_id",
  "boundary_plan_state",
  "boundary_plan_hash",
  "source_system",
  "aggregate_definition_ref",
  "aggregate_output_ref",
  "connector_adapter_ref"
]);

const CONNECTOR_ADAPTER_REF_FIELDS = new Set([
  "adapter_run_id",
  "adapter_state"
]);

const VALIDATION_SUMMARY_FIELDS = new Set([
  "schema_version",
  "valid",
  "connector_boundary_plan_valid",
  "bigquery_export_review_valid",
  "gaps"
]);

const APPROVED_OUTPUT_FIELDS = new Set([
  "workflow_family",
  "workflow_id",
  "function_area",
  "cohort_key",
  "window_start",
  "window_end",
  "support_median_resolution_hours",
  "resolution_time",
  "first_contact_resolution",
  "escalation_rate",
  "token_count",
  "token_cost_proxy",
  "vbd_behavior_state"
]);

const FORBIDDEN_KEY_PATTERNS = [
  /raw_?rows?/i,
  /^rows$/i,
  /^records$/i,
  /^events$/i,
  /dashboard_?rows?/i,
  /query_?text/i,
  /^query$/i,
  /sql/i,
  /query_?plan/i,
  /referenced_?tables?/i,
  /destination_?table/i,
  /total_?bytes/i,
  /bytes_?processed/i,
  /slot_?ms/i,
  /cache_?hit/i,
  /job_?id/i,
  /query_?id/i,
  /bigquery_?job/i,
  /project_?id/i,
  /dataset_?id/i,
  /table_?id/i,
  /^project$/i,
  /^dataset$/i,
  /^table$/i,
  /table_?ref/i,
  /credential/i,
  /secret/i,
  /token_value/i,
  /prompt/i,
  /transcript/i,
  /user_?id/i,
  /employee/i,
  /person_?id/i,
  /respondent/i,
  /^email$/i,
  /row_?id/i,
  /span_?id/i,
  /api_?run/i,
  /dashboard_?url/i,
  /export_?url/i,
  /connector_?job/i,
  /^payload_json$/i,
  /^validation_json$/i,
  /^source_refs_json$/i,
  /^blueprint_path_binding_json$/i,
  /source_package_payload/i,
  /^source_packages$/i,
  /measurement_cell_?ref/i,
  /^measurement_cell$/i,
  /^measurement_cell_snapshot$/i,
  /^measurement_cell_series$/i,
  /finance_output/i,
  /financial_attribution/i,
  /confidence/i,
  /score/i,
  /probability/i,
  /ebitda/i,
  /caus(?:al|ality)/i,
  /productivity/i
];

const FORBIDDEN_VALUE_PATTERNS = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /select\s+.+\s+from/i,
  /\bsql\b/i,
  /\bbquxjob_/i,
  /\bjob_[a-z0-9_-]{8,}/i,
  /query_(?:id|ref|text|plan)/i,
  /referenced_tables?/i,
  /destination_table/i,
  /total_bytes/i,
  /bytes_processed/i,
  /slot_ms/i,
  /api_(?:run|request)/i,
  /connector_(?:job|status)/i,
  /dashboard_url/i,
  /export_url/i,
  /https?:\/\//i,
  /(?:^|_)project_[a-z0-9_-]+/i,
  /(?:^|_)dataset_[a-z0-9_-]+/i,
  /(?:^|_)table_[a-z0-9_-]+/i,
  /credential/i,
  /secret/i,
  /raw_rows?/i,
  /dashboard_rows?/i,
  /prompt/i,
  /transcript/i,
  /(?:^|_)(?:user|employee|person|respondent)_(?:id|identifier|email|name)(?:_|$)/i,
  /(?:^|_)(?:hashed|joinable)_(?:user|person|employee|respondent|id|identifier)(?:_|$)/i,
  /row_id/i,
  /span_id/i,
  /source_package_(?:clearance|cleared|approved|passed)/i,
  /measurement_cell_(?:created|ready|snapshot|series)/i,
  /finance_(?:output|result|value|claim)/i,
  /financial_attribution/i,
  /realized_roi/i,
  /return_on_investment/i,
  /confidence/i,
  /score/i,
  /probability/i,
  /ebitda/i,
  /caus(?:al|ality)/i,
  /productivity/i
];

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

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function safeIdPart(value) {
  return String(value ?? "missing")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "missing";
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function falseObject(fields) {
  return Object.fromEntries(fields.map((field) => [field, false]));
}

function reviewFeeds(valid) {
  return {
    ...Object.fromEntries(TRUE_FEEDS.map((feed) => [feed, valid])),
    ...Object.fromEntries(FALSE_FEEDS.map((feed) => [feed, false]))
  };
}

function safePolicyPath(path) {
  return [
    "blocked_uses",
    "required_caveats",
    "feeds",
    "boundary_policy",
    "validation_summary.gaps"
  ].some((prefix) => path.join(".").startsWith(prefix));
}

function collectForbiddenGaps(value, path = []) {
  const gaps = [];
  if (!value || typeof value !== "object") {
    if (
      typeof value === "string" &&
      !safePolicyPath(path) &&
      FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))
    ) {
      gaps.push(`Forbidden value detected at ${path.length} level(s)`);
    }
    return gaps;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      gaps.push(...collectForbiddenGaps(item, [...path, String(index)]));
    });
    return gaps;
  }
  for (const [key, nestedValue] of Object.entries(value)) {
    const nestedPath = [...path, key];
    const normalizedKey = safeIdPart(key);
    if (
      !safePolicyPath(nestedPath) &&
      !isFalseBigQueryAttestationFlag(path, key, nestedValue) &&
      FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key) || pattern.test(normalizedKey))
    ) {
      gaps.push(`Forbidden field detected at ${nestedPath.length} level(s)`);
    }
    gaps.push(...collectForbiddenGaps(nestedValue, nestedPath));
  }
  return gaps;
}

function isFalseBigQueryAttestationFlag(path, key, nestedValue) {
  return path.join(".") === "bigquery_review_attestation" &&
    nestedValue === false &&
    [
      "query_text_retained",
      "job_metadata_retained",
      "project_dataset_table_refs_retained",
      "raw_rows_retained",
      "dashboard_rows_retained",
      "credential_material_retained",
      "user_identifiers_retained"
    ].includes(key);
}

function collectUnsupportedKeys(value, allowedFields, label) {
  if (!isPlainObject(value)) return [`${label} must be an object`];
  return Object.keys(value).some((key) => !allowedFields.has(key))
    ? [`${label} contains unsupported field(s)`]
    : [];
}

function collectExactArrayGap(actual, expected, label) {
  if (
    !Array.isArray(actual) ||
    actual.length !== expected.length ||
    actual.some((value, index) => value !== expected[index])
  ) {
    return [`${label} must match the governed BigQuery export review contract exactly`];
  }
  return [];
}

function collectExactObjectGaps(actual, expected, label) {
  const gaps = [];
  if (!isPlainObject(actual)) return [`${label} must be an object`];
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
    gaps.push(`${label} keys must match the governed BigQuery export review contract`);
  }
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (actual[field] !== expectedValue) {
      gaps.push(`${label}.${field} must match the governed BigQuery export review contract`);
    }
  }
  return gaps;
}

function sanitizeGaps(gaps) {
  return gaps.map((gap) =>
    String(gap)
      .replace(/select\s+.+?\s+from/gi, "<blocked_query_text>")
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "<blocked_identifier_value>")
      .replace(/employee_email|employee_name|employee_id|user_id|person_id|respondent_id/gi, "<blocked_identifier_field>")
  );
}

function validationSummaryGapsAreSafe(gaps) {
  return Array.isArray(gaps) &&
    gaps.every((gap) => {
      const text = String(gap);
      return text === sanitizeGaps([gap])[0] &&
        !FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(text));
    });
}

function stripValidation(value) {
  const cloneValue = clone(value);
  delete cloneValue.validation_summary;
  return cloneValue;
}

function safeRef(value) {
  if (typeof value !== "string") return null;
  if (value.length === 0 || value.length > 180) return null;
  if (!/^[a-z0-9_]+$/.test(value)) return null;
  if (/[a-f0-9]{24,}/i.test(value)) return null;
  if (FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))) return null;
  return value;
}

function connectorBoundaryPlanRefFromPlan(plan) {
  if (!isPlainObject(plan)) return null;
  return {
    boundary_plan_id: plan.boundary_plan_id ?? null,
    boundary_plan_state: plan.boundary_plan_state ?? null,
    boundary_plan_hash: sha256Json(plan),
    source_system: plan.source_system ?? null,
    aggregate_definition_ref: plan.aggregate_definition_ref ?? null,
    aggregate_output_ref: plan.aggregate_output_ref ?? null,
    connector_adapter_ref: {
      adapter_run_id: plan.connector_adapter_ref?.adapter_run_id ?? null,
      adapter_state: plan.connector_adapter_ref?.adapter_state ?? null
    }
  };
}

function reviewId(boundaryPlan) {
  const alignment = boundaryPlan?.source_alignment ?? {};
  return [
    "bigquery_aggregate_export_review",
    alignment.workflow_family,
    alignment.function_area,
    alignment.metric_id
  ].map(safeIdPart).join("_");
}

function dryRunAttestationRef(boundaryPlan) {
  const alignment = boundaryPlan?.source_alignment ?? {};
  return [
    "bigquery_dry_run_attestation",
    alignment.workflow_family,
    alignment.metric_id
  ].map(safeIdPart).join("_");
}

function blockedReview({ boundaryPlan, boundaryValidation, generatedAt, gaps }) {
  const review = {
    schema_version: BIGQUERY_AGGREGATE_EXPORT_REVIEW_SCHEMA_VERSION,
    review_state: "BLOCKED",
    review_id: null,
    source_system: "bigquery_export",
    source_owner_role: null,
    source_owner_attestation: null,
    execution_boundary: "approved_glean_or_customer_bigquery_environment",
    fluencytracr_execution_mode: "no_live_execution",
    bigquery_review_attestation: null,
    aggregate_definition_ref: null,
    aggregate_output_ref: null,
    approved_output_fields: [],
    aggregate_grain: null,
    source_alignment: null,
    source_quality_posture: null,
    connector_boundary_plan_ref: null,
    allowed_uses: [],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    feeds: reviewFeeds(false),
    boundary_policy: falseObject(BOUNDARY_POLICY_FIELDS),
    required_caveats: [...REQUIRED_CAVEATS],
    validation_summary: {
      schema_version: RESULT_SCHEMA_VERSION,
      valid: false,
      connector_boundary_plan_valid: boundaryValidation?.valid === true,
      bigquery_export_review_valid: false,
      gaps: sanitizeGaps(gaps ?? boundaryValidation?.gaps ?? ["connector boundary plan validation did not pass"])
    },
    generated_at: generatedAt ?? new Date(0).toISOString()
  };
  return review;
}

function deepMerge(base, overrides) {
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) return base;
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

export function buildBigQueryAggregateExportReviewFromObject(
  sourceFixture,
  options = {}
) {
  const fixture = clone(sourceFixture);
  const sourceSystem = options.sourceSystem ?? "bigquery_export";
  const boundaryPlan = options.boundaryPlan ?? buildAggregateConnectorBoundaryPlanFromObject(
    fixture,
    { sourceSystem }
  );
  const boundaryValidation = validateAggregateConnectorBoundaryPlan(boundaryPlan, {
    sourceFixture: fixture
  });
  if (
    sourceSystem !== "bigquery_export" ||
    boundaryPlan?.source_system !== "bigquery_export" ||
    boundaryValidation.valid !== true ||
    boundaryPlan.boundary_plan_state !== "PASSED_AGGREGATE_CONNECTOR_BOUNDARY_PLAN_REVIEW"
  ) {
    return blockedReview({
      boundaryPlan,
      boundaryValidation,
      generatedAt: boundaryPlan?.generated_at,
      gaps: sourceSystem === "bigquery_export"
        ? boundaryValidation.gaps
        : ["BigQuery aggregate export review accepts only bigquery_export source_system"]
    });
  }

  const review = {
    schema_version: BIGQUERY_AGGREGATE_EXPORT_REVIEW_SCHEMA_VERSION,
    review_state: "PASSED_BIGQUERY_AGGREGATE_EXPORT_REVIEW",
    review_id: reviewId(boundaryPlan),
    source_system: "bigquery_export",
    source_owner_role: boundaryPlan.source_owner_role,
    source_owner_attestation: {
      attestation_state: "attested",
      attested_by_role: boundaryPlan.source_owner_role,
      attested_at: boundaryPlan.generated_at,
      review_state: "clear"
    },
    execution_boundary: "approved_glean_or_customer_bigquery_environment",
    fluencytracr_execution_mode: "no_live_execution",
    bigquery_review_attestation: {
      upstream_execution_environment: "approved_glean_or_customer_bigquery_environment",
      aggregate_export_review_state: "AGGREGATE_EXPORT_REVIEWED",
      dry_run_attestation_state: "UPSTREAM_DRY_RUN_ATTESTED",
      dry_run_attestation_ref: dryRunAttestationRef(boundaryPlan),
      dry_run_reviewed_by_role: boundaryPlan.source_owner_role,
      dry_run_reviewed_at: boundaryPlan.generated_at,
      query_text_retained: false,
      job_metadata_retained: false,
      project_dataset_table_refs_retained: false,
      raw_rows_retained: false,
      dashboard_rows_retained: false,
      credential_material_retained: false,
      user_identifiers_retained: false,
      cost_review_posture: "UPSTREAM_DRY_RUN_REVIEWED_NOT_RETAINED"
    },
    aggregate_definition_ref: boundaryPlan.aggregate_definition_ref,
    aggregate_output_ref: boundaryPlan.aggregate_output_ref,
    approved_output_fields: [...boundaryPlan.approved_output_fields],
    aggregate_grain: boundaryPlan.aggregate_grain,
    source_alignment: clone(boundaryPlan.source_alignment),
    source_quality_posture: clone(boundaryPlan.source_quality_posture),
    connector_boundary_plan_ref: connectorBoundaryPlanRefFromPlan(boundaryPlan),
    allowed_uses: [
      "bigquery_aggregate_export_review",
      "aggregate_connector_boundary_plan_reference"
    ],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    feeds: reviewFeeds(true),
    boundary_policy: falseObject(BOUNDARY_POLICY_FIELDS),
    required_caveats: [...REQUIRED_CAVEATS],
    validation_summary: null,
    generated_at: boundaryPlan.generated_at
  };
  const merged = deepMerge(review, options.reviewOverrides);
  const validation = validateBigQueryAggregateExportReviewShape(merged, {
    boundaryValidation
  });
  if (!validation.valid) {
    return blockedReview({
      boundaryPlan,
      boundaryValidation,
      generatedAt: boundaryPlan.generated_at,
      gaps: validation.gaps
    });
  }
  if (sha256Json(stripValidation(merged)) !== sha256Json(stripValidation(review))) {
    return blockedReview({
      boundaryPlan,
      boundaryValidation,
      generatedAt: boundaryPlan.generated_at,
      gaps: ["BigQuery aggregate export review must match recomputed saved-fixture review"]
    });
  }
  merged.validation_summary = {
    schema_version: RESULT_SCHEMA_VERSION,
    valid: true,
    connector_boundary_plan_valid: true,
    bigquery_export_review_valid: true,
    gaps: []
  };
  return merged;
}

function validateBigQueryAggregateExportReviewShape(review, options = {}) {
  const gaps = [];
  if (!isPlainObject(review)) {
    return {
      schema_version: RESULT_SCHEMA_VERSION,
      valid: false,
      gaps: ["BigQuery aggregate export review must be an object"]
    };
  }
  gaps.push(...collectUnsupportedKeys(review, REVIEW_FIELDS, "bigquery_export_review"));
  gaps.push(...collectForbiddenGaps(review));
  if (review.schema_version !== BIGQUERY_AGGREGATE_EXPORT_REVIEW_SCHEMA_VERSION) {
    gaps.push("schema_version is invalid");
  }
  if (review.review_state !== "PASSED_BIGQUERY_AGGREGATE_EXPORT_REVIEW") {
    gaps.push("review_state must be PASSED_BIGQUERY_AGGREGATE_EXPORT_REVIEW");
  }
  if (review.source_system !== "bigquery_export") {
    gaps.push("source_system must be bigquery_export");
  }
  if (review.source_owner_role !== "customer_data_platform_owner") {
    gaps.push("source_owner_role must be customer_data_platform_owner");
  }
  gaps.push(...collectUnsupportedKeys(
    review.source_owner_attestation,
    SOURCE_OWNER_ATTESTATION_FIELDS,
    "source_owner_attestation"
  ));
  if (review.source_owner_attestation?.attestation_state !== "attested") {
    gaps.push("source_owner_attestation.attestation_state must be attested");
  }
  if (review.source_owner_attestation?.attested_by_role !== review.source_owner_role) {
    gaps.push("source_owner_attestation.attested_by_role must match source_owner_role");
  }
  if (review.source_owner_attestation?.review_state !== "clear") {
    gaps.push("source_owner_attestation.review_state must be clear");
  }
  if (review.execution_boundary !== "approved_glean_or_customer_bigquery_environment") {
    gaps.push("execution_boundary must keep BigQuery execution upstream");
  }
  if (review.fluencytracr_execution_mode !== "no_live_execution") {
    gaps.push("fluencytracr_execution_mode must be no_live_execution");
  }
  gaps.push(...collectUnsupportedKeys(
    review.bigquery_review_attestation,
    BIGQUERY_REVIEW_ATTESTATION_FIELDS,
    "bigquery_review_attestation"
  ));
  const attestation = review.bigquery_review_attestation ?? {};
  if (attestation.upstream_execution_environment !== "approved_glean_or_customer_bigquery_environment") {
    gaps.push("bigquery_review_attestation.upstream_execution_environment must keep execution upstream");
  }
  if (attestation.aggregate_export_review_state !== "AGGREGATE_EXPORT_REVIEWED") {
    gaps.push("bigquery_review_attestation.aggregate_export_review_state must be reviewed");
  }
  if (attestation.dry_run_attestation_state !== "UPSTREAM_DRY_RUN_ATTESTED") {
    gaps.push("bigquery_review_attestation.dry_run_attestation_state must be upstream-attested");
  }
  if (!safeRef(attestation.dry_run_attestation_ref)) {
    gaps.push("bigquery_review_attestation.dry_run_attestation_ref must be a compact safe ref");
  }
  if (attestation.dry_run_reviewed_by_role !== review.source_owner_role) {
    gaps.push("bigquery_review_attestation.dry_run_reviewed_by_role must match source_owner_role");
  }
  for (const field of [
    "query_text_retained",
    "job_metadata_retained",
    "project_dataset_table_refs_retained",
    "raw_rows_retained",
    "dashboard_rows_retained",
    "credential_material_retained",
    "user_identifiers_retained"
  ]) {
    if (attestation[field] !== false) {
      gaps.push(`bigquery_review_attestation.${field} must be false`);
    }
  }
  if (attestation.cost_review_posture !== "UPSTREAM_DRY_RUN_REVIEWED_NOT_RETAINED") {
    gaps.push("bigquery_review_attestation.cost_review_posture must avoid retained BigQuery job metadata");
  }
  if (!safeRef(review.review_id)) gaps.push("review_id must be a compact safe ref");
  if (!safeRef(review.aggregate_definition_ref)) {
    gaps.push("aggregate_definition_ref must be a compact safe ref");
  }
  if (!safeRef(review.aggregate_output_ref)) {
    gaps.push("aggregate_output_ref must be a compact safe ref");
  }
  if (
    !Array.isArray(review.approved_output_fields) ||
    review.approved_output_fields.some((field) => !APPROVED_OUTPUT_FIELDS.has(field))
  ) {
    gaps.push("approved_output_fields must contain only governed aggregate output fields");
  }
  if (review.aggregate_grain !== "workflow_function_cohort_window") {
    gaps.push("aggregate_grain must be workflow_function_cohort_window");
  }
  gaps.push(...collectUnsupportedKeys(
    review.source_alignment,
    SOURCE_ALIGNMENT_FIELDS,
    "source_alignment"
  ));
  gaps.push(...collectUnsupportedKeys(
    review.source_quality_posture,
    SOURCE_QUALITY_POSTURE_FIELDS,
    "source_quality_posture"
  ));
  if (review.source_quality_posture?.k_min_posture !== "K_MIN_ALREADY_ENFORCED_UPSTREAM") {
    gaps.push("source_quality_posture.k_min_posture must be upstream-enforced");
  }
  if (review.source_quality_posture?.suppression_posture !== "SUPPRESSION_ALREADY_ENFORCED_UPSTREAM") {
    gaps.push("source_quality_posture.suppression_posture must be upstream-enforced");
  }
  if (review.source_quality_posture?.freshness_state !== "CURRENT_FOR_APPROVED_WINDOW") {
    gaps.push("source_quality_posture.freshness_state must be current for the approved window");
  }
  gaps.push(...collectUnsupportedKeys(
    review.connector_boundary_plan_ref,
    CONNECTOR_BOUNDARY_PLAN_REF_FIELDS,
    "connector_boundary_plan_ref"
  ));
  gaps.push(...collectUnsupportedKeys(
    review.connector_boundary_plan_ref?.connector_adapter_ref,
    CONNECTOR_ADAPTER_REF_FIELDS,
    "connector_boundary_plan_ref.connector_adapter_ref"
  ));
  if (review.connector_boundary_plan_ref?.source_system !== "bigquery_export") {
    gaps.push("connector_boundary_plan_ref.source_system must be bigquery_export");
  }
  if (!/^[a-f0-9]{64}$/.test(String(review.connector_boundary_plan_ref?.boundary_plan_hash ?? ""))) {
    gaps.push("connector_boundary_plan_ref.boundary_plan_hash must be a hash");
  }
  if (review.connector_boundary_plan_ref?.aggregate_definition_ref !== review.aggregate_definition_ref) {
    gaps.push("connector_boundary_plan_ref.aggregate_definition_ref must match review aggregate_definition_ref");
  }
  if (review.connector_boundary_plan_ref?.aggregate_output_ref !== review.aggregate_output_ref) {
    gaps.push("connector_boundary_plan_ref.aggregate_output_ref must match review aggregate_output_ref");
  }
  gaps.push(...collectExactArrayGap(
    review.allowed_uses,
    ["bigquery_aggregate_export_review", "aggregate_connector_boundary_plan_reference"],
    "allowed_uses"
  ));
  gaps.push(...collectExactArrayGap(review.blocked_uses, REQUIRED_BLOCKED_USES, "blocked_uses"));
  gaps.push(...collectExactArrayGap(review.required_caveats, REQUIRED_CAVEATS, "required_caveats"));
  gaps.push(...collectExactObjectGaps(review.feeds, reviewFeeds(true), "feeds"));
  gaps.push(...collectExactObjectGaps(
    review.boundary_policy,
    falseObject(BOUNDARY_POLICY_FIELDS),
    "boundary_policy"
  ));
  if (review.validation_summary !== null) {
    gaps.push("validation_summary must be recomputed by the builder");
  }
  if (options.boundaryValidation?.valid !== true) {
    gaps.push("connector boundary plan validation must pass before BigQuery export review can pass");
  }
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    valid: gaps.length === 0,
    gaps: sanitizeGaps(gaps)
  };
}

export function validateBigQueryAggregateExportReview(review, options = {}) {
  if (review?.review_state === "BLOCKED") {
    const gaps = [];
    gaps.push(...collectUnsupportedKeys(review, REVIEW_FIELDS, "bigquery_export_review"));
    gaps.push(...collectForbiddenGaps(review));
    if (review.validation_summary?.valid !== false) {
      gaps.push("blocked review validation_summary.valid must be false");
    }
    if (review.feeds) {
      gaps.push(...collectExactObjectGaps(review.feeds, reviewFeeds(false), "feeds"));
    }
    if (review.boundary_policy) {
      gaps.push(...collectExactObjectGaps(
        review.boundary_policy,
        falseObject(BOUNDARY_POLICY_FIELDS),
        "boundary_policy"
      ));
    }
    return {
      schema_version: RESULT_SCHEMA_VERSION,
      valid: false,
      gaps: sanitizeGaps(gaps.length > 0 ? gaps : review.validation_summary?.gaps ?? ["BigQuery aggregate export review is blocked"])
    };
  }

  const shapeValidation = validateBigQueryAggregateExportReviewShape(
    {
      ...review,
      validation_summary: null
    },
    {
    boundaryValidation: { valid: true }
    }
  );
  const gaps = [...shapeValidation.gaps];
  gaps.push(...collectUnsupportedKeys(
    review?.validation_summary,
    VALIDATION_SUMMARY_FIELDS,
    "validation_summary"
  ));
  if (review?.validation_summary?.schema_version !== RESULT_SCHEMA_VERSION) {
    gaps.push("validation_summary.schema_version is invalid");
  }
  if (review?.validation_summary?.valid !== true) {
    gaps.push("validation_summary.valid must match recomputed BigQuery export review");
  }
  if (review?.validation_summary?.connector_boundary_plan_valid !== true) {
    gaps.push("validation_summary.connector_boundary_plan_valid must be true for passed reviews");
  }
  if (review?.validation_summary?.bigquery_export_review_valid !== true) {
    gaps.push("validation_summary.bigquery_export_review_valid must be true for passed reviews");
  }
  if (!validationSummaryGapsAreSafe(review?.validation_summary?.gaps ?? [])) {
    gaps.push("validation_summary.gaps must not contain unsafe copied values");
  } else if ((review?.validation_summary?.gaps ?? []).length !== 0) {
    gaps.push("validation_summary.gaps must be empty for passed reviews");
  }
  if (options.sourceFixture) {
    const expected = buildBigQueryAggregateExportReviewFromObject(options.sourceFixture);
    if (
      review?.review_state === "PASSED_BIGQUERY_AGGREGATE_EXPORT_REVIEW" &&
      sha256Json(stripValidation(review)) !== sha256Json(stripValidation(expected))
    ) {
      gaps.push("BigQuery aggregate export review must match recomputed saved-fixture review");
    }
  } else if (review?.review_state === "PASSED_BIGQUERY_AGGREGATE_EXPORT_REVIEW") {
    gaps.push("sourceFixture is required to validate passed BigQuery aggregate export reviews");
  }
  const valid = gaps.length === 0;
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    valid,
    gaps: sanitizeGaps(gaps)
  };
}

function parseCliArgs(argv) {
  let fixturePath = DEFAULT_FIXTURE_PATH;
  for (const arg of argv) {
    if (!arg.startsWith("--")) fixturePath = arg;
  }
  return { fixturePath };
}

const isDirectRun = process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const { fixturePath } = parseCliArgs(process.argv.slice(2));
  const fixture = readJson(fixturePath);
  const review = buildBigQueryAggregateExportReviewFromObject(fixture);
  const validation = validateBigQueryAggregateExportReview(review, {
    sourceFixture: fixture
  });
  process.stdout.write(
    `${JSON.stringify(
      {
        ...review,
        validation_summary: {
          ...review.validation_summary,
          valid: validation.valid,
          gaps: validation.gaps
        }
      },
      null,
      2
    )}\n`
  );
  if (!validation.valid || review.review_state === "BLOCKED") {
    process.exitCode = 1;
  }
}
