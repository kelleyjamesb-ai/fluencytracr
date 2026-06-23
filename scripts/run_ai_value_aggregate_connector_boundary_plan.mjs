#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  runControlledAggregateConnectorAdapterFromObject,
  validateControlledAggregateConnectorAdapter
} from "./run_ai_value_controlled_aggregate_connector_adapter.mjs";

export const AGGREGATE_CONNECTOR_BOUNDARY_PLAN_SCHEMA_VERSION =
  "FT_AI_VALUE_AGGREGATE_CONNECTOR_BOUNDARY_PLAN_2026_06";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_AGGREGATE_CONNECTOR_BOUNDARY_PLAN_RESULT_2026_06";

const DEFAULT_FIXTURE_PATH =
  "docs/contracts/ai-value-real-data-intake-packet-runner/examples/controlled-aggregate-fixture-review-ready.json";

const ALLOWED_SOURCE_SYSTEMS = new Set(["bigquery_export", "sigma_export"]);

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
  "Aggregate connector boundary plan only; it does not authorize live BigQuery, Sigma, Glean, or customer connector execution.",
  "Aggregate connector boundary plan is not Source Package clearance.",
  "Aggregate connector boundary plan is not Measurement Cell readiness or persistence.",
  "Aggregate connector boundary plan is not customer-facing output, finance output, or research-model scoring."
];

const TRUE_FEEDS = [
  "aggregate_connector_boundary_plan_review",
  "saved_fixture_connector_adapter_candidate"
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
  "fluencytracr_receives_prompts",
  "fluencytracr_receives_transcripts",
  "fluencytracr_receives_identifiers",
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

const PLAN_FIELDS = new Set([
  "schema_version",
  "boundary_plan_state",
  "boundary_plan_id",
  "source_system",
  "source_category",
  "source_owner_role",
  "source_owner_attestation",
  "execution_boundary",
  "fluencytracr_execution_mode",
  "aggregate_definition_ref",
  "aggregate_output_ref",
  "approved_output_fields",
  "aggregate_grain",
  "source_alignment",
  "source_quality_posture",
  "connector_adapter_ref",
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

const CONNECTOR_ADAPTER_REF_FIELDS = new Set([
  "adapter_run_id",
  "adapter_state",
  "connector_manifest_ref",
  "pipeline_dry_run_ref"
]);

const VALIDATION_SUMMARY_FIELDS = new Set([
  "schema_version",
  "valid",
  "connector_adapter_valid",
  "boundary_plan_valid",
  "gaps"
]);

const FORBIDDEN_KEY_PATTERNS = [
  /raw_?rows?/i,
  /^rows$/i,
  /^records$/i,
  /^events$/i,
  /dashboard_?rows?/i,
  /query_?text/i,
  /sql/i,
  /prompt/i,
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
  /connector_?job/i,
  /^project_?id$/i,
  /^dataset_?id$/i,
  /^table_?id$/i,
  /^project$/i,
  /^dataset$/i,
  /^table$/i,
  /source_package_payload/i,
  /^source_packages$/i,
  /measurement_cell_?ref/i,
  /^measurement_cell$/i,
  /^measurement_cell_snapshot$/i,
  /^measurement_cell_series$/i,
  /^payload_json$/i,
  /^validation_json$/i,
  /^source_refs_json$/i,
  /^blueprint_path_binding_json$/i,
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
  /query_(?:id|ref|text)/i,
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

function packageFeeds(valid) {
  return {
    ...Object.fromEntries(TRUE_FEEDS.map((feed) => [feed, valid])),
    ...Object.fromEntries(FALSE_FEEDS.map((feed) => [feed, false]))
  };
}

function selectedExpectationPath(fixture) {
  return Array.isArray(fixture?.blueprint_extraction_input?.approvedExpectationPaths)
    ? fixture.blueprint_extraction_input.approvedExpectationPaths[0] ?? null
    : null;
}

function selectedMetricId(fixture, adapter) {
  const path = selectedExpectationPath(fixture);
  return path?.expected_metric_id ??
    adapter?.pipeline_dry_run_ref?.metric_id ??
    "support_median_resolution_hours";
}

function safeString(value, maxLength = 180) {
  if (typeof value !== "string") return null;
  if (value.length === 0 || value.length > maxLength) return null;
  if (!/^[A-Za-z0-9_:.| -]+$/.test(value)) return null;
  if (FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))) return null;
  return value;
}

function safeRef(value) {
  if (typeof value !== "string") return null;
  if (value.length === 0 || value.length > 180) return null;
  if (!/^[a-z0-9_]+$/.test(value)) return null;
  if (/[a-f0-9]{24,}/i.test(value)) return null;
  if (FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))) return null;
  return value;
}

function safeWindow(window) {
  if (!isPlainObject(window)) return false;
  const start = window.window_start;
  const end = window.window_end;
  return typeof start === "string" &&
    typeof end === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(start) &&
    /^\d{4}-\d{2}-\d{2}$/.test(end) &&
    start <= end;
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
      FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key) || pattern.test(normalizedKey))
    ) {
      gaps.push(`Forbidden field detected at ${nestedPath.length} level(s)`);
    }
    gaps.push(...collectForbiddenGaps(nestedValue, nestedPath));
  }
  return gaps;
}

function collectUnsupportedKeys(value, allowedFields, label) {
  if (!isPlainObject(value)) return [`${label} must be an object`];
  return Object.keys(value).some((key) => !allowedFields.has(key))
    ? [`${label} contains unsupported field(s)`]
    : [];
}

function collectExactObjectGaps(actual, expected, label) {
  const gaps = [];
  if (!isPlainObject(actual)) return [`${label} must be an object`];
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
    gaps.push(`${label} keys must match the governed boundary contract`);
  }
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (actual[field] !== expectedValue) {
      gaps.push(`${label}.${field} must match the governed boundary contract`);
    }
  }
  return gaps;
}

function collectExactArrayGap(actual, expected, label) {
  if (
    !Array.isArray(actual) ||
    actual.length !== expected.length ||
    actual.some((value, index) => value !== expected[index])
  ) {
    return [`${label} must match the governed boundary contract exactly`];
  }
  return [];
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

function sourceOwnerRole(sourceSystem) {
  return sourceSystem === "sigma_export"
    ? "customer_analytics_owner"
    : "customer_data_platform_owner";
}

function compactPipelineDryRunRef(ref) {
  if (!isPlainObject(ref)) return null;
  return {
    dry_run_id: ref.dry_run_id ?? null,
    dry_run_state: ref.dry_run_state ?? null,
    source_system: ref.source_system ?? null,
    source_export_ref: ref.source_export_ref ?? null,
    manifest_hash: ref.manifest_hash ?? null,
    aggregate_fixture_hash: ref.aggregate_fixture_hash ?? null,
    reviewed_source_refs_hash: ref.reviewed_source_refs_hash ?? null,
    reviewed_aggregate_context_hash: ref.reviewed_aggregate_context_hash ?? null,
    reviewed_blueprint_expectation_hash: ref.reviewed_blueprint_expectation_hash ?? null,
    candidate_integrity_hash: ref.candidate_integrity_hash ?? null,
    expectation_path_id: ref.expectation_path_id ?? null
  };
}

function compactConnectorAdapterRef(adapter) {
  if (!isPlainObject(adapter)) return null;
  return {
    adapter_run_id: adapter.adapter_run_id ?? null,
    adapter_state: adapter.adapter_state ?? null,
    connector_manifest_ref: adapter.connector_manifest_ref ?? null,
    pipeline_dry_run_ref: compactPipelineDryRunRef(adapter.pipeline_dry_run_ref)
  };
}

function boundaryPlanId(sourceSystem, adapter, metricId) {
  const ref = adapter?.connector_manifest_ref ?? {};
  return [
    "aggregate_connector_boundary_plan",
    sourceSystem,
    ref.workflow_family,
    ref.function_area,
    metricId
  ].map(safeIdPart).join("_");
}

function aggregateDefinitionRef(sourceSystem, adapter, metricId) {
  return [
    "aggregate_definition_review",
    sourceSystem,
    adapter?.connector_manifest_ref?.workflow_family,
    metricId
  ].map(safeIdPart).join("_");
}

function aggregateOutputRef(sourceSystem, adapter, metricId) {
  return [
    "reviewed_aggregate_output",
    sourceSystem,
    adapter?.connector_manifest_ref?.workflow_family,
    metricId
  ].map(safeIdPart).join("_");
}

function blockedPlan({ sourceSystem, adapter, adapterValidation, generatedAt }) {
  const plan = {
    schema_version: AGGREGATE_CONNECTOR_BOUNDARY_PLAN_SCHEMA_VERSION,
    boundary_plan_state: "BLOCKED",
    boundary_plan_id: null,
    source_system: ALLOWED_SOURCE_SYSTEMS.has(String(sourceSystem ?? ""))
      ? sourceSystem
      : null,
    source_category: "scrubbed_aggregate_export",
    source_owner_role: null,
    source_owner_attestation: null,
    execution_boundary: "approved_glean_or_customer_environment",
    fluencytracr_execution_mode: "no_live_execution",
    aggregate_definition_ref: null,
    aggregate_output_ref: null,
    approved_output_fields: [],
    aggregate_grain: null,
    source_alignment: null,
    source_quality_posture: null,
    connector_adapter_ref: compactConnectorAdapterRef(adapter),
    allowed_uses: [],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    feeds: packageFeeds(false),
    boundary_policy: falseObject(BOUNDARY_POLICY_FIELDS),
    required_caveats: [...REQUIRED_CAVEATS],
    validation_summary: {
      schema_version: RESULT_SCHEMA_VERSION,
      valid: false,
      connector_adapter_valid: adapterValidation?.valid === true,
      boundary_plan_valid: false,
      gaps: sanitizeGaps(adapterValidation?.gaps ?? ["connector adapter validation did not pass"])
    },
    generated_at: generatedAt ?? new Date(0).toISOString()
  };
  return plan;
}

export function buildAggregateConnectorBoundaryPlanFromObject(
  sourceFixture,
  options = {}
) {
  const fixture = clone(sourceFixture);
  const sourceSystem = options.sourceSystem ?? "bigquery_export";
  const adapter = options.adapter ?? runControlledAggregateConnectorAdapterFromObject(
    fixture,
    { sourceSystem }
  );
  const adapterValidation = validateControlledAggregateConnectorAdapter(adapter, {
    sourceFixture: fixture
  });
  if (
    adapterValidation.valid !== true ||
    adapter.adapter_state !== "PASSED_INTERNAL_CONNECTOR_ADAPTER_REVIEW"
  ) {
    return blockedPlan({
      sourceSystem,
      adapter,
      adapterValidation,
      generatedAt: adapter?.generated_at
    });
  }

  const ref = adapter.connector_manifest_ref ?? {};
  const metricId = selectedMetricId(fixture, adapter);
  const plan = {
    schema_version: AGGREGATE_CONNECTOR_BOUNDARY_PLAN_SCHEMA_VERSION,
    boundary_plan_state: "PASSED_AGGREGATE_CONNECTOR_BOUNDARY_PLAN_REVIEW",
    boundary_plan_id: boundaryPlanId(adapter.source_system, adapter, metricId),
    source_system: adapter.source_system,
    source_category: "scrubbed_aggregate_export",
    source_owner_role: sourceOwnerRole(adapter.source_system),
    source_owner_attestation: {
      attestation_state: "attested",
      attested_by_role: sourceOwnerRole(adapter.source_system),
      attested_at: adapter.generated_at,
      review_state: "clear"
    },
    execution_boundary: "approved_glean_or_customer_environment",
    fluencytracr_execution_mode: "no_live_execution",
    aggregate_definition_ref: aggregateDefinitionRef(adapter.source_system, adapter, metricId),
    aggregate_output_ref: aggregateOutputRef(adapter.source_system, adapter, metricId),
    approved_output_fields: [
      "workflow_family",
      "workflow_id",
      "function_area",
      "cohort_key",
      "window_start",
      "window_end",
      metricId
    ],
    aggregate_grain: "workflow_function_cohort_window",
    source_alignment: {
      org_id: ref.org_id,
      client_id: ref.client_id,
      measurement_plan_id: ref.measurement_plan_id,
      workflow_family: ref.workflow_family,
      workflow_id: `${safeIdPart(ref.workflow_family)}_workflow`,
      function_area: ref.function_area,
      cohort_key: ref.cohort_key,
      baseline_window: ref.baseline_window,
      comparison_window: ref.comparison_window,
      metric_id: metricId,
      expectation_path_id: adapter.pipeline_dry_run_ref?.expectation_path_id ?? null
    },
    source_quality_posture: {
      k_min_posture: "K_MIN_ALREADY_ENFORCED_UPSTREAM",
      suppression_posture: "SUPPRESSION_ALREADY_ENFORCED_UPSTREAM",
      freshness_state: "CURRENT_FOR_APPROVED_WINDOW",
      legal_trust_review_state: "LEGAL_TRUST_REVIEW_NOT_REQUIRED"
    },
    connector_adapter_ref: compactConnectorAdapterRef(adapter),
    allowed_uses: [
      "aggregate_connector_boundary_plan_review",
      "saved_fixture_connector_adapter_candidate"
    ],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    feeds: packageFeeds(true),
    boundary_policy: falseObject(BOUNDARY_POLICY_FIELDS),
    required_caveats: [...REQUIRED_CAVEATS],
    validation_summary: null,
    generated_at: adapter.generated_at
  };
  const merged = deepMerge(plan, options.planOverrides);
  const validation = validateAggregateConnectorBoundaryPlanShape(merged, {
    adapterValidation
  });
  merged.boundary_plan_state = validation.valid
    ? "PASSED_AGGREGATE_CONNECTOR_BOUNDARY_PLAN_REVIEW"
    : "BLOCKED";
  merged.feeds = packageFeeds(validation.valid);
  merged.validation_summary = {
    schema_version: RESULT_SCHEMA_VERSION,
    valid: validation.valid,
    connector_adapter_valid: adapterValidation.valid === true,
    boundary_plan_valid: validation.valid,
    gaps: validation.gaps
  };
  return merged;
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

function validateAggregateConnectorBoundaryPlanShape(plan, options = {}) {
  const gaps = [];
  if (!isPlainObject(plan)) {
    return {
      schema_version: RESULT_SCHEMA_VERSION,
      valid: false,
      gaps: ["boundary plan must be an object"]
    };
  }
  gaps.push(...collectUnsupportedKeys(plan, PLAN_FIELDS, "boundary_plan"));
  if (plan.schema_version !== AGGREGATE_CONNECTOR_BOUNDARY_PLAN_SCHEMA_VERSION) {
    gaps.push("schema_version is invalid");
  }
  if (!ALLOWED_SOURCE_SYSTEMS.has(String(plan.source_system ?? ""))) {
    gaps.push("source_system is invalid");
  }
  if (plan.source_category !== "scrubbed_aggregate_export") {
    gaps.push("source_category must be scrubbed_aggregate_export");
  }
  if (plan.source_owner_role !== sourceOwnerRole(plan.source_system)) {
    gaps.push("source_owner_role must match source_system owner role");
  }
  gaps.push(...collectUnsupportedKeys(
    plan.source_owner_attestation,
    SOURCE_OWNER_ATTESTATION_FIELDS,
    "source_owner_attestation"
  ));
  if (plan.source_owner_attestation?.attestation_state !== "attested") {
    gaps.push("source_owner_attestation.attestation_state must be attested");
  }
  if (plan.source_owner_attestation?.attested_by_role !== plan.source_owner_role) {
    gaps.push("source_owner_attestation.attested_by_role must match source_owner_role");
  }
  if (!safeString(plan.source_owner_attestation?.attested_at, 120)) {
    gaps.push("source_owner_attestation.attested_at must be safe metadata");
  }
  if (plan.source_owner_attestation?.review_state !== "clear") {
    gaps.push("source_owner_attestation.review_state must be clear");
  }
  if (plan.execution_boundary !== "approved_glean_or_customer_environment") {
    gaps.push("execution_boundary must stay upstream of FluencyTracr");
  }
  if (plan.fluencytracr_execution_mode !== "no_live_execution") {
    gaps.push("fluencytracr_execution_mode must be no_live_execution");
  }
  if (!safeRef(plan.boundary_plan_id)) {
    gaps.push("boundary_plan_id must be safe metadata");
  }
  if (!safeRef(plan.aggregate_definition_ref)) {
    gaps.push("aggregate_definition_ref must be safe metadata, not SQL or a live handle");
  }
  if (!safeRef(plan.aggregate_output_ref)) {
    gaps.push("aggregate_output_ref must be safe metadata, not raw output or a live handle");
  }
  if (
    !Array.isArray(plan.approved_output_fields) ||
    plan.approved_output_fields.length === 0 ||
    !plan.approved_output_fields.every((field) => APPROVED_OUTPUT_FIELDS.has(field))
  ) {
    gaps.push("approved_output_fields must be governed aggregate field names");
  }
  if (plan.aggregate_grain !== "workflow_function_cohort_window") {
    gaps.push("aggregate_grain must be workflow_function_cohort_window");
  }
  gaps.push(...collectUnsupportedKeys(plan.source_alignment, SOURCE_ALIGNMENT_FIELDS, "source_alignment"));
  for (const field of [
    "org_id",
    "client_id",
    "measurement_plan_id",
    "workflow_family",
    "workflow_id",
    "function_area",
    "cohort_key",
    "metric_id",
    "expectation_path_id"
  ]) {
    if (!safeString(plan.source_alignment?.[field], 180)) {
      gaps.push(`source_alignment.${field} must be safe metadata`);
    }
  }
  if (!safeWindow(plan.source_alignment?.baseline_window)) {
    gaps.push("source_alignment.baseline_window must be a compact safe window");
  }
  if (!safeWindow(plan.source_alignment?.comparison_window)) {
    gaps.push("source_alignment.comparison_window must be a compact safe window");
  }
  gaps.push(...collectUnsupportedKeys(
    plan.source_quality_posture,
    SOURCE_QUALITY_POSTURE_FIELDS,
    "source_quality_posture"
  ));
  if (plan.source_quality_posture?.k_min_posture !== "K_MIN_ALREADY_ENFORCED_UPSTREAM") {
    gaps.push("source_quality_posture.k_min_posture must be terminal and upstream-enforced");
  }
  if (plan.source_quality_posture?.suppression_posture !== "SUPPRESSION_ALREADY_ENFORCED_UPSTREAM") {
    gaps.push("source_quality_posture.suppression_posture must be terminal and upstream-enforced");
  }
  if (plan.source_quality_posture?.freshness_state !== "CURRENT_FOR_APPROVED_WINDOW") {
    gaps.push("source_quality_posture.freshness_state must be current for approved window");
  }
  if (
    plan.source_quality_posture?.legal_trust_review_state !== "LEGAL_TRUST_REVIEW_APPROVED" &&
    plan.source_quality_posture?.legal_trust_review_state !== "LEGAL_TRUST_REVIEW_NOT_REQUIRED"
  ) {
    gaps.push("source_quality_posture.legal_trust_review_state must be approved or not required");
  }
  gaps.push(...collectUnsupportedKeys(
    plan.connector_adapter_ref,
    CONNECTOR_ADAPTER_REF_FIELDS,
    "connector_adapter_ref"
  ));
  if (plan.connector_adapter_ref?.adapter_state !== "PASSED_INTERNAL_CONNECTOR_ADAPTER_REVIEW") {
    gaps.push("connector_adapter_ref.adapter_state must be passed internal connector review");
  }
  if (plan.connector_adapter_ref?.connector_manifest_ref?.source_system !== plan.source_system) {
    gaps.push("connector_adapter_ref source_system must match boundary plan source_system");
  }
  if (plan.connector_adapter_ref?.connector_manifest_ref?.source_owner_role !== plan.source_owner_role) {
    gaps.push("connector_adapter_ref source owner role must match boundary plan");
  }
  if (plan.connector_adapter_ref?.connector_manifest_ref?.aggregate_grain !== plan.aggregate_grain) {
    gaps.push("connector_adapter_ref aggregate grain must match boundary plan");
  }
  if (plan.connector_adapter_ref?.pipeline_dry_run_ref?.expectation_path_id !== plan.source_alignment?.expectation_path_id) {
    gaps.push("connector_adapter_ref expectation path must match boundary plan");
  }
  gaps.push(...collectExactArrayGap(
    plan.allowed_uses,
    TRUE_FEEDS,
    "allowed_uses"
  ));
  gaps.push(...collectExactArrayGap(plan.blocked_uses, REQUIRED_BLOCKED_USES, "blocked_uses"));
  gaps.push(...collectExactArrayGap(plan.required_caveats, REQUIRED_CAVEATS, "required_caveats"));
  gaps.push(...collectExactObjectGaps(plan.feeds, packageFeeds(true), "feeds"));
  gaps.push(...collectExactObjectGaps(
    plan.boundary_policy,
    falseObject(BOUNDARY_POLICY_FIELDS),
    "boundary_policy"
  ));
  if (options.adapterValidation?.valid === false) {
    gaps.push("connector adapter validation must pass before boundary plan review");
  }
  gaps.push(...collectForbiddenGaps(plan));
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    valid: gaps.length === 0,
    gaps: sanitizeGaps(gaps)
  };
}

export function validateAggregateConnectorBoundaryPlan(plan, options = {}) {
  const gaps = [];
  const shapeValidation = validateAggregateConnectorBoundaryPlanShape(
    {
      ...plan,
      validation_summary: null
    },
    {}
  );
  gaps.push(...shapeValidation.gaps);

  const hasSourceFixture = Boolean(options.sourceFixture);
  if (shapeValidation.valid && !hasSourceFixture) {
    gaps.push("sourceFixture is required to validate passed saved-fixture boundary plans");
  }
  const expectedValid = shapeValidation.valid && hasSourceFixture;
  const expectedState = expectedValid
    ? "PASSED_AGGREGATE_CONNECTOR_BOUNDARY_PLAN_REVIEW"
    : "BLOCKED";
  if (plan?.boundary_plan_state !== expectedState) {
    gaps.push("boundary_plan_state must match recomputed boundary plan state");
  }
  gaps.push(...collectExactObjectGaps(plan?.feeds, packageFeeds(expectedValid), "feeds"));
  gaps.push(...collectUnsupportedKeys(
    plan?.validation_summary,
    VALIDATION_SUMMARY_FIELDS,
    "validation_summary"
  ));
  if (plan?.validation_summary?.schema_version !== RESULT_SCHEMA_VERSION) {
    gaps.push("validation_summary.schema_version is invalid");
  }
  if (plan?.validation_summary?.valid !== expectedValid) {
    gaps.push("validation_summary.valid must match recomputed boundary validation");
  }
  if (plan?.validation_summary?.boundary_plan_valid !== expectedValid) {
    gaps.push("validation_summary.boundary_plan_valid must match recomputed boundary validation");
  }
  if (plan?.validation_summary?.connector_adapter_valid !== true && expectedValid) {
    gaps.push("validation_summary.connector_adapter_valid must be true for passed boundary plans");
  }
  if (!Array.isArray(plan?.validation_summary?.gaps)) {
    gaps.push("validation_summary.gaps must be an array");
  } else if (!validationSummaryGapsAreSafe(plan.validation_summary.gaps)) {
    gaps.push("validation_summary.gaps must not contain unsafe values");
  } else if (expectedValid && plan.validation_summary.gaps.length !== 0) {
    gaps.push("validation_summary.gaps must be empty for passed boundary plans");
  }

  if (hasSourceFixture && expectedValid) {
    const expected = buildAggregateConnectorBoundaryPlanFromObject(
      options.sourceFixture,
      { sourceSystem: plan?.source_system }
    );
    if (JSON.stringify(stripValidation(plan)) !== JSON.stringify(stripValidation(expected))) {
      gaps.push("boundary plan must match recomputed saved-fixture boundary plan");
    }
  }

  return {
    schema_version: RESULT_SCHEMA_VERSION,
    valid: gaps.length === 0,
    gaps: sanitizeGaps(gaps),
    feeds: packageFeeds(gaps.length === 0)
  };
}

function compactCliOutput(plan, validation) {
  return {
    boundary_plan_state: plan.boundary_plan_state,
    source_system: plan.source_system,
    boundary_plan_id: plan.boundary_plan_id,
    source_owner_role: plan.source_owner_role,
    source_owner_attestation: plan.source_owner_attestation,
    execution_boundary: plan.execution_boundary,
    fluencytracr_execution_mode: plan.fluencytracr_execution_mode,
    aggregate_definition_ref: plan.aggregate_definition_ref,
    aggregate_output_ref: plan.aggregate_output_ref,
    approved_output_fields: plan.approved_output_fields,
    aggregate_grain: plan.aggregate_grain,
    source_alignment: plan.source_alignment,
    source_quality_posture: plan.source_quality_posture,
    connector_adapter_ref: plan.connector_adapter_ref,
    feeds: plan.feeds,
    boundary_policy: plan.boundary_policy,
    blocked_uses: plan.blocked_uses,
    required_caveats: plan.required_caveats,
    validation_summary: {
      ...plan.validation_summary,
      valid: validation.valid,
      gaps: validation.gaps
    },
    generated_at: plan.generated_at
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

const isDirectRun = process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const { fixturePath, sourceSystem } = parseCliArgs(process.argv.slice(2));
  const fixture = readJson(fixturePath);
  const plan = buildAggregateConnectorBoundaryPlanFromObject(fixture, {
    sourceSystem
  });
  const validation = validateAggregateConnectorBoundaryPlan(plan, {
    sourceFixture: fixture
  });
  process.stdout.write(
    `${JSON.stringify(compactCliOutput(plan, validation), null, 2)}\n`
  );
  if (!validation.valid || plan.boundary_plan_state === "BLOCKED") {
    process.exitCode = 1;
  }
}
