#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  AI_VALUE_AGGREGATE_EXTRACTION_MANIFEST_SCHEMA_VERSION,
  AI_VALUE_PIPELINE_RUN_REVIEW_MANIFEST_SCHEMA_VERSION,
  AI_VALUE_SOURCE_INVENTORY_MANIFEST_SCHEMA_VERSION,
  validateAiValueAggregateExtractionManifest,
  validateAiValueControlledAggregateManifestChain,
  validateAiValuePipelineRunReviewManifest,
  validateAiValueSourceInventoryManifest
} from "../shared/dist/aiValueEngine/index.js";

import {
  runControlledAggregateConnectorAdapterFromObject,
  validateControlledAggregateConnectorAdapter
} from "./run_ai_value_controlled_aggregate_connector_adapter.mjs";

export const CONTROLLED_AGGREGATE_MANIFEST_VALIDATION_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTROLLED_AGGREGATE_MANIFEST_VALIDATION_RUN_2026_06";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTROLLED_AGGREGATE_MANIFEST_VALIDATION_RESULT_2026_06";

const DEFAULT_FIXTURE_PATH =
  "docs/contracts/ai-value-real-data-intake-packet-runner/examples/controlled-aggregate-fixture-review-ready.json";

const ALLOWED_SOURCE_SYSTEMS = new Set(["bigquery_export", "sigma_export"]);
const ALLOWED_SOURCE_LANES = new Set([
  "blueprint",
  "ai_fluency",
  "vbd_token",
  "customer_metric",
  "assumption",
  "governance"
]);

const REQUIRED_BLOCKED_USES = [
  "live_bigquery_execution",
  "live_sigma_execution",
  "live_glean_query",
  "customer_connector_execution",
  "credential_access",
  "query_execution",
  "raw_row_ingestion",
  "dashboard_row_ingestion",
  "source_package_clearance",
  "measurement_cell_creation",
  "measurement_cell_snapshot_persistence",
  "measurement_cell_series_persistence",
  "persistence_write",
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

const REQUIRED_BLOCKED_CLAIMS = [
  "source_package_cleared",
  "measurement_cell_ready",
  "measurement_cell_snapshot_ready",
  "measurement_cell_series_ready",
  "finance_context_ready",
  "customer_output_ready",
  "roi_claim",
  "ebitda_claim",
  "causality_claim",
  "productivity_claim",
  "probability_output",
  "contribution_model_not_authorized",
  "research_model_not_promoted",
  "financial_claim_blocked"
];

const SOURCE_INVENTORY_CAVEATS = [
  "Source inventory manifest only; it does not authorize live connector execution.",
  "Source inventory readiness is not Source Package clearance.",
  "Source inventory readiness is not Measurement Cell readiness."
];

const AGGREGATE_EXTRACTION_CAVEATS = [
  "Aggregate extraction manifest only; it does not authorize FluencyTracr query execution.",
  "Aggregate extraction review is not Source Package clearance.",
  "Aggregate extraction review is not Measurement Cell readiness."
];

const PIPELINE_REVIEW_CAVEATS = [
  "Pipeline run review manifest only; it is manual promotion-review context.",
  "Pipeline run review does not feed intake, persist records, or clear Source Package review.",
  "Pipeline run review is not Measurement Cell, Series, research-model, finance, or customer output."
];

const SOURCE_INVENTORY_FALSE_BOUNDARY_FIELDS = [
  "runs_live_connector",
  "executes_query",
  "uses_credentials",
  "stores_query_text",
  "stores_raw_rows",
  "stores_dashboard_rows",
  "stores_prompts",
  "stores_transcripts",
  "stores_user_identifiers",
  "creates_source_package",
  "clears_source_package_review",
  "creates_measurement_cell",
  "creates_measurement_cell_snapshot",
  "creates_measurement_cell_series",
  "feeds_research_model",
  "emits_probability",
  "computes_roi",
  "emits_financial_output",
  "emits_customer_facing_output"
];

const AGGREGATE_EXTRACTION_FALSE_BOUNDARY_FIELDS = [
  "fluencytracr_runs_bigquery",
  "fluencytracr_runs_sigma",
  "fluencytracr_runs_glean_query",
  "fluencytracr_uses_credentials",
  "query_text_stored",
  "raw_rows_present",
  "dashboard_rows_present",
  "prompts_present",
  "transcripts_present",
  "user_identifiers_present",
  "source_package_cleared",
  "measurement_cell_created",
  "measurement_cell_snapshot_created",
  "measurement_cell_series_created",
  "research_model_input_created",
  "probability_output_created",
  "roi_output_created",
  "financial_output_created",
  "customer_facing_output_created"
];

const PIPELINE_REVIEW_FALSE_BOUNDARY_FIELDS = [
  "runs_live_connector",
  "executes_query",
  "uses_credentials",
  "stores_query_text",
  "stores_raw_rows",
  "stores_dashboard_rows",
  "stores_prompts",
  "stores_transcripts",
  "stores_user_identifiers",
  "creates_source_package",
  "clears_source_package_review",
  "creates_measurement_cell",
  "creates_measurement_cell_snapshot",
  "creates_measurement_cell_series",
  "writes_persistence",
  "creates_route",
  "creates_ui",
  "creates_schema",
  "creates_export",
  "renders_readout",
  "feeds_research_model",
  "emits_probability",
  "computes_roi",
  "emits_financial_output",
  "emits_customer_facing_output"
];

const PACKAGE_FALSE_FEEDS = [
  "live_bigquery_execution",
  "live_sigma_execution",
  "live_glean_query",
  "customer_connector_execution",
  "credential_access",
  "query_execution",
  "raw_row_ingestion",
  "dashboard_row_ingestion",
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

const PACKAGE_FALSE_BOUNDARY_FIELDS = [
  "runs_bigquery",
  "runs_sigma",
  "runs_glean_query",
  "runs_live_connectors",
  "runs_customer_connectors",
  "uses_credentials",
  "executes_queries",
  "stores_query_strings",
  "stores_raw_source_data",
  "persists_manifests",
  "persists_pipeline_run",
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
];

const PACKAGE_TRUE_FEEDS = [
  "controlled_aggregate_manifest_validation",
  "source_inventory_manifest_review",
  "aggregate_extraction_manifest_review",
  "pipeline_run_review_manifest_review",
  "connector_adapter_review_reference",
  "manual_operator_promotion_review"
];

const PACKAGE_ALLOWED_FIELDS = new Set([
  "schema_version",
  "manifest_validation_state",
  "source_system",
  "adapter_run_id",
  "connector_adapter_ref",
  "approved_expectation_path_binding",
  "manifests",
  "manifest_refs",
  "validation_summary",
  "feeds",
  "boundary_policy",
  "blocked_uses",
  "required_caveats",
  "generated_at"
]);

const PACKAGE_VALIDATION_SUMMARY_FIELDS = new Set([
  "schema_version",
  "valid",
  "connector_adapter_valid",
  "source_inventory_manifest_valid",
  "aggregate_extraction_manifest_valid",
  "pipeline_run_review_manifest_valid",
  "manifest_chain_valid",
  "gaps"
]);

const PACKAGE_MANIFESTS_FIELDS = new Set([
  "source_inventory_manifest",
  "aggregate_extraction_manifest",
  "pipeline_run_review_manifest"
]);

const PACKAGE_MANIFEST_REFS_FIELDS = new Set([
  "source_inventory_manifest_ref",
  "aggregate_extraction_manifest_ref",
  "pipeline_run_review_manifest_ref"
]);

const PACKAGE_PASSED_CAVEATS = [
  "Controlled aggregate manifest validation is saved-fixture only.",
  "The package validates manifest contracts but does not persist manifests.",
  "The package does not authorize live BigQuery, Sigma, Glean, or customer connector execution.",
  "The package does not authorize Measurement Cell Series snapshots, research-model scoring, finance output, or customer-facing output."
];

const PACKAGE_BLOCKED_CAVEATS = [
  "Controlled aggregate manifest validation is saved-fixture only.",
  "Manifest validation does not authorize persistence, live execution, Series snapshots, or customer-facing output."
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

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function safeIdPart(value) {
  return String(value ?? "missing")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "missing";
}

function falseBoundary(fields) {
  return Object.fromEntries(fields.map((field) => [field, false]));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function collectUnsupportedKeys(value, allowedFields, label) {
  if (!isPlainObject(value)) return [`${label} must be an object`];
  const unsupported = Object.keys(value).filter((key) => !allowedFields.has(key));
  return unsupported.length > 0 ? [`${label} contains unsupported field(s)`] : [];
}

function collectExactArrayGap(actual, expected, label) {
  if (
    !Array.isArray(actual) ||
    actual.length !== expected.length ||
    actual.some((value, index) => value !== expected[index])
  ) {
    return [`${label} must match the governed package contract exactly`];
  }
  return [];
}

function collectExactObjectShapeGaps(actual, expected, label) {
  const gaps = [];
  if (!isPlainObject(actual)) return [`${label} must be an object`];
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
    gaps.push(`${label} keys must match the governed package contract exactly`);
  }
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (actual[field] !== expectedValue) {
      gaps.push(`${label}.${field} must match recomputed package state`);
    }
  }
  return gaps;
}

function connectorAdapterRefPassed(ref) {
  return isPlainObject(ref) &&
    ref.adapter_state === "PASSED_INTERNAL_CONNECTOR_ADAPTER_REVIEW" &&
    isPlainObject(ref.connector_manifest_ref) &&
    isPlainObject(ref.pipeline_dry_run_ref);
}

function sourceOwnerRole(sourceSystem) {
  return sourceSystem === "sigma_export"
    ? "customer_analytics_owner"
    : "customer_data_platform_owner";
}

function selectedSourceLane(fixture, options = {}) {
  const candidate =
    options.sourceLane ??
    fixture?.controlled_aggregate_source_lane ??
    fixture?.source_lane ??
    fixture?.expected?.controlled_aggregate_source_lane;
  if (candidate === undefined || candidate === null || candidate === "") {
    return sourceLaneForMetric(selectedMetricId(fixture));
  }
  return ALLOWED_SOURCE_LANES.has(String(candidate))
    ? String(candidate)
    : null;
}

function reviewedSourceRefForLane(fixture, sourceLane) {
  const refs = fixture?.expected?.reviewed_source_refs ?? {};
  return refs?.[sourceLane] ?? null;
}

function aggregateSourceRefForLane(sourceSystem, fixture, sourceLane, fallbackRef) {
  const laneRef = reviewedSourceRefForLane(fixture, sourceLane);
  if (!laneRef) return null;
  const base = safeIdPart(laneRef ?? fallbackRef ?? fixture?.fixture_id ?? "controlled_fixture");
  const suffix = base.startsWith(`${sourceSystem}_`)
    ? base.slice(`${sourceSystem}_`.length)
    : base;
  return `${sourceSystem}_${suffix}`;
}

function selectedExpectationPath(fixture) {
  return Array.isArray(fixture?.blueprint_extraction_input?.approvedExpectationPaths)
    ? fixture.blueprint_extraction_input.approvedExpectationPaths[0] ?? null
    : null;
}

function selectedMetricId(fixture) {
  const path = selectedExpectationPath(fixture);
  const candidate = Array.isArray(fixture?.blueprint_extraction_input?.metricCandidates)
    ? fixture.blueprint_extraction_input.metricCandidates[0] ?? null
    : null;
  return path?.expected_metric_id ?? candidate?.metric_id ?? "support_median_resolution_hours";
}

function sourceLaneForMetric(metricId) {
  if (String(metricId ?? "").startsWith("ai_fluency_")) return "ai_fluency";
  if (
    [
      "token_count",
      "token_cost_index",
      "token_efficiency_index",
      "vbd_quality_index",
      "vbd_reuse_index",
      "support_median_resolution_hours"
    ].includes(String(metricId ?? ""))
  ) {
    return "vbd_token";
  }
  return "customer_metric";
}

function approvedExpectationPathBindingFromFixture(fixture, adapter) {
  const path = selectedExpectationPath(fixture);
  const expectationPathId =
    path?.expectation_path_id ??
    adapter?.pipeline_dry_run_ref?.expectation_path_id ??
    "expectation_path_support_median_resolution_hours_capacity";
  return {
    expectation_path_id: expectationPathId,
    expectation_path_version: 1,
    expectation_path_hash: sha256Json({
      expectation_path_id: expectationPathId,
      expected_metric_id: path?.expected_metric_id ?? selectedMetricId(fixture),
      value_driver: path?.value_driver ?? "capacity",
      approved_at: path?.approved_at ?? "2026-06-21T00:00:00.000Z",
      approved_by_role: path?.approver_role ?? "workflow_owner"
    }),
    approved_blueprint_payload_hash:
      fixture?.expected?.reviewed_blueprint_expectation_hash ??
      sha256Json(fixture?.blueprint_extraction_input ?? {}),
    approval_state:
      path?.customer_approval_state === "approved"
        ? "customer_approved"
        : path?.customer_approval_state ?? "customer_approved",
    approved_at: path?.approved_at ?? "2026-06-21T00:00:00.000Z",
    approved_by_role: path?.approver_role ?? "workflow_owner",
    value_driver: path?.value_driver ?? "capacity"
  };
}

function manifestRefFromInventory(manifest) {
  return {
    manifest_id: manifest?.source_inventory_manifest_id ?? null,
    manifest_hash: sha256Json(manifest),
    source_lane: manifest?.source_lane ?? null,
    source_system: manifest?.source_system ?? null,
    source_ref: manifest?.approved_source_ref ?? null,
    org_id: manifest?.org_id ?? null,
    client_id: manifest?.client_id ?? null,
    workflow_family: manifest?.workflow_family ?? null,
    function_area: manifest?.function_area ?? null,
    cohort_key: manifest?.cohort_key ?? null,
    window: manifest?.approved_extraction_window ?? null,
    aggregate_grain: manifest?.approved_aggregate_grain ?? null
  };
}

function manifestRefFromExtraction(manifest) {
  return {
    manifest_id: manifest?.aggregate_extraction_manifest_id ?? null,
    manifest_hash: sha256Json(manifest),
    source_lane: manifest?.source_package_lane ?? null,
    source_system: manifest?.source_system ?? null,
    source_ref: manifest?.aggregate_output_ref ?? null,
    org_id: manifest?.org_id ?? null,
    client_id: manifest?.client_id ?? null,
    workflow_family: manifest?.workflow_family ?? null,
    function_area: manifest?.function_area ?? null,
    cohort_key: manifest?.cohort_key ?? null,
    window: manifest?.extraction_window ?? null,
    aggregate_grain: manifest?.aggregate_grain ?? null
  };
}

function validationProofHash(manifest, validation) {
  return sha256Json({
    manifest_hash: sha256Json(manifest),
    validation_result: validation
  });
}

function expectedQueueRef(source, extraction, review, binding) {
  const identityHash = sha256Json({
    source_manifest_ref: manifestRefFromInventory(source),
    aggregate_extraction_manifest_ref: manifestRefFromExtraction(extraction),
    org_id: review.org_id,
    client_id: review.client_id,
    measurement_plan_id: review.measurement_plan_id,
    workflow_family: review.workflow_family,
    workflow_id: review.workflow_id,
    function_area: review.function_area,
    cohort_key: review.cohort_key,
    baseline_window: review.baseline_window,
    comparison_window: review.comparison_window,
    metric_id: review.metric_id,
    approved_expectation_path_binding: binding
  }).slice(0, 24);
  return [
    "source_package_review_queue",
    source.source_system,
    review.org_id,
    review.client_id,
    review.workflow_family,
    review.function_area,
    review.cohort_key,
    review.metric_id,
    identityHash
  ].map(safeIdPart).join("_");
}

function buildSourceInventoryManifest({ adapter, fixture, sourceLane, overrides }) {
  const ref = adapter.connector_manifest_ref ?? {};
  const metricId = selectedMetricId(fixture);
  const sourceSystem = adapter.source_system;
  const ownerRole = sourceOwnerRole(sourceSystem);
  const manifest = {
    source_inventory_manifest_id:
      `source_inventory_${sourceSystem}_${safeIdPart(sourceLane)}_${safeIdPart(ref.workflow_family)}_${safeIdPart(metricId)}`,
    schema_version: AI_VALUE_SOURCE_INVENTORY_MANIFEST_SCHEMA_VERSION,
    source_lane: sourceLane,
    source_system: sourceSystem,
    source_category: "scrubbed_aggregate_export",
    source_owner_role: ownerRole,
    source_owner_attestation: "AGGREGATE_ONLY_ATTESTED",
    org_id: ref.org_id,
    client_id: ref.client_id,
    workflow_family: ref.workflow_family,
    function_area: ref.function_area,
    cohort_key: ref.cohort_key,
    approved_source_ref: aggregateSourceRefForLane(
      sourceSystem,
      fixture,
      sourceLane,
      ref.aggregate_export_ref
    ),
    approved_extraction_window: ref.comparison_window,
    approved_aggregate_grain: "workflow_function_cohort_window",
    approved_output_fields: [
      "workflow_family",
      "workflow_id",
      "function_area",
      "cohort_key",
      "window_start",
      "window_end",
      metricId
    ],
    k_min_posture: "K_MIN_ALREADY_ENFORCED_UPSTREAM",
    suppression_posture: "SUPPRESSION_ALREADY_ENFORCED_UPSTREAM",
    legal_trust_review_state: "LEGAL_TRUST_REVIEW_NOT_REQUIRED",
    allowed_uses: [
      "source_inventory_review",
      "aggregate_extraction_candidate"
    ],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    boundary_policy: falseBoundary(SOURCE_INVENTORY_FALSE_BOUNDARY_FIELDS),
    required_caveats: [...SOURCE_INVENTORY_CAVEATS],
    generated_at: adapter.generated_at
  };
  return deepMerge(manifest, overrides);
}

function buildAggregateExtractionManifest({ source, adapter, fixture, overrides }) {
  const metricId = selectedMetricId(fixture);
  const manifest = {
    aggregate_extraction_manifest_id:
      `aggregate_extraction_${source.source_system}_${safeIdPart(source.workflow_family)}_${safeIdPart(metricId)}`,
    schema_version: AI_VALUE_AGGREGATE_EXTRACTION_MANIFEST_SCHEMA_VERSION,
    source_inventory_manifest_ref: manifestRefFromInventory(source),
    source_system: source.source_system,
    execution_boundary: "approved_glean_or_customer_environment",
    approved_aggregate_definition_ref:
      `aggregate_definition_${source.source_system}_${safeIdPart(source.workflow_family)}_${safeIdPart(metricId)}`,
    upstream_aggregate_attestation_ref:
      `aggregate_attestation_${source.source_system}_${safeIdPart(source.workflow_family)}_${safeIdPart(metricId)}`,
    org_id: source.org_id,
    client_id: source.client_id,
    workflow_family: source.workflow_family,
    function_area: source.function_area,
    cohort_key: source.cohort_key,
    extraction_window: source.approved_extraction_window,
    aggregate_grain: source.approved_aggregate_grain,
    metric_definitions: [metricId],
    source_package_lane: source.source_lane,
    aggregate_output_ref:
      `${source.source_system}_${safeIdPart(source.workflow_family)}_${safeIdPart(metricId)}_aggregate_output`,
    aggregate_output_hash: sha256Json(adapter.connector_review_packet),
    k_min_posture: "K_MIN_ENFORCED",
    suppression_results: {
      suppression_state: "SUPPRESSION_ENFORCED",
      k_min_state: "K_MIN_ENFORCED",
      held_telemetry_present: false,
      suppressed_telemetry_present: false
    },
    freshness_state: "CURRENT_FOR_APPROVED_WINDOW",
    owner_review_state: "AGGREGATE_EXTRACTION_ATTESTED",
    allowed_uses: [
      "aggregate_extraction_review",
      "pipeline_run_review_candidate"
    ],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    boundary_policy: falseBoundary(AGGREGATE_EXTRACTION_FALSE_BOUNDARY_FIELDS),
    required_caveats: [...AGGREGATE_EXTRACTION_CAVEATS],
    generated_at: adapter.generated_at
  };
  return deepMerge(manifest, overrides);
}

function buildPipelineRunReviewManifest({ source, extraction, adapter, fixture, binding, overrides }) {
  const ref = adapter.connector_manifest_ref ?? {};
  const sourceValidation = validateAiValueSourceInventoryManifest(source);
  const extractionValidation = validateAiValueAggregateExtractionManifest(
    extraction,
    { sourceInventoryManifest: source }
  );
  const workflowId = `${safeIdPart(ref.workflow_family)}_workflow`;
  const review = {
    pipeline_run_review_manifest_id:
      `pipeline_run_review_${source.source_system}_${safeIdPart(ref.workflow_family)}_${safeIdPart(extraction.metric_definitions?.[0])}`,
    schema_version: AI_VALUE_PIPELINE_RUN_REVIEW_MANIFEST_SCHEMA_VERSION,
    pipeline_review_state: "ELIGIBLE_FOR_OPERATOR_PROMOTION_REVIEW",
    source_inventory_manifest_ref: manifestRefFromInventory(source),
    aggregate_extraction_manifest_ref: manifestRefFromExtraction(extraction),
    operator_role: "internal_ai_value_operator",
    source_owner_role: source.source_owner_role,
    org_id: source.org_id,
    client_id: source.client_id,
    measurement_plan_id: ref.measurement_plan_id,
    workflow_family: source.workflow_family,
    workflow_id: workflowId,
    function_area: source.function_area,
    cohort_key: source.cohort_key,
    baseline_window: ref.baseline_window,
    comparison_window: extraction.extraction_window,
    metric_id: extraction.metric_definitions[0],
    expectation_path_id: binding.expectation_path_id,
    reviewed_aggregate_source_refs: [
      source.approved_source_ref,
      extraction.aggregate_output_ref
    ],
    data_spine_alignment_envelope: {
      source_lane: source.source_lane,
      source_system: source.source_system,
      source_ref: source.approved_source_ref,
      source_owner_role: source.source_owner_role,
      org_id: source.org_id,
      client_id: source.client_id,
      measurement_plan_id: ref.measurement_plan_id,
      workflow_family: source.workflow_family,
      workflow_id: workflowId,
      function_area: source.function_area,
      cohort_key: source.cohort_key,
      baseline_window: ref.baseline_window,
      comparison_window: extraction.extraction_window,
      metric_id: extraction.metric_definitions[0],
      expectation_path_id: binding.expectation_path_id,
      expectation_path_version: binding.expectation_path_version,
      expectation_path_hash: binding.expectation_path_hash,
      approved_blueprint_payload_hash: binding.approved_blueprint_payload_hash,
      approval_state: binding.approval_state,
      approved_at: binding.approved_at,
      approved_by_role: binding.approved_by_role
    },
    source_package_review_queue_posture_ref: {
      queue_ref: null,
      queue_state: "DATA_SPINE_REVIEW_READY",
      reviewed_at: adapter.generated_at,
      reviewed_by_role: "internal_ai_value_operator"
    },
    validation_result_refs: {
      source_inventory_validation_ref:
        `source_inventory_validation_${source.source_system}_${safeIdPart(source.workflow_family)}`,
      source_inventory_validation_hash: validationProofHash(source, sourceValidation),
      aggregate_extraction_validation_ref:
        `aggregate_extraction_validation_${source.source_system}_${safeIdPart(source.workflow_family)}`,
      aggregate_extraction_validation_hash: validationProofHash(extraction, extractionValidation),
      connector_adapter_ref: adapter.adapter_run_id
    },
    allowed_uses: ["manual_operator_promotion_review"],
    blocked_claims: [...REQUIRED_BLOCKED_CLAIMS],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    boundary_policy: falseBoundary(PIPELINE_REVIEW_FALSE_BOUNDARY_FIELDS),
    required_caveats: [...PIPELINE_REVIEW_CAVEATS],
    stop_conditions: [...REQUIRED_BLOCKED_USES],
    generated_at: adapter.generated_at
  };
  review.source_package_review_queue_posture_ref.queue_ref = expectedQueueRef(
    source,
    extraction,
    review,
    binding
  );
  return deepMerge(review, overrides);
}

function packageFeeds(valid) {
  return {
    ...Object.fromEntries(PACKAGE_TRUE_FEEDS.map((feed) => [feed, valid])),
    ...Object.fromEntries(PACKAGE_FALSE_FEEDS.map((feed) => [feed, false]))
  };
}

function sanitizeGaps(gaps) {
  return gaps.map((gap) =>
    String(gap)
      .replace(/select\s+.+?\s+from/gi, "<blocked_query_text>")
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "<blocked_identifier_value>")
      .replace(/employee_email|employee_name|employee_id|user_id|person_id|respondent_id/gi, "<blocked_identifier_field>")
  );
}

function combinedGaps(validations) {
  return sanitizeGaps(
    validations.flatMap(([label, validation]) =>
      (validation?.gaps ?? []).map((gap) => `${label}: ${gap}`)
    )
  );
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

function blockedPackage({
  sourceSystem,
  adapter,
  adapterValidation,
  generatedAt,
  validationGaps,
  sourceValidation,
  extractionValidation,
  reviewValidation,
  chainValidation
}) {
  return {
    schema_version: CONTROLLED_AGGREGATE_MANIFEST_VALIDATION_SCHEMA_VERSION,
    manifest_validation_state: "BLOCKED",
    source_system: ALLOWED_SOURCE_SYSTEMS.has(String(sourceSystem ?? ""))
      ? sourceSystem
      : null,
    adapter_run_id: null,
    connector_adapter_ref: null,
    approved_expectation_path_binding: null,
    manifests: null,
    manifest_refs: null,
    validation_summary: {
      schema_version: RESULT_SCHEMA_VERSION,
      valid: false,
      connector_adapter_valid: false,
      source_inventory_manifest_valid: sourceValidation?.valid === true,
      aggregate_extraction_manifest_valid: extractionValidation?.valid === true,
      pipeline_run_review_manifest_valid: reviewValidation?.valid === true,
      manifest_chain_valid: chainValidation?.valid === true,
      gaps: sanitizeGaps(
        validationGaps ??
        adapterValidation?.gaps ??
        ["connector adapter validation did not pass"]
      )
    },
    feeds: packageFeeds(false),
    boundary_policy: falseBoundary(PACKAGE_FALSE_BOUNDARY_FIELDS),
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    required_caveats: [...PACKAGE_BLOCKED_CAVEATS],
    generated_at: generatedAt ?? new Date(0).toISOString()
  };
}

export function buildControlledAggregateManifestValidationPackageFromObject(
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
  if (adapterValidation.valid !== true || adapter.adapter_state !== "PASSED_INTERNAL_CONNECTOR_ADAPTER_REVIEW") {
    return blockedPackage({
      sourceSystem,
      adapter,
      adapterValidation,
      generatedAt: adapter?.generated_at
    });
  }

  const sourceLane = selectedSourceLane(fixture, options);
  const binding = deepMerge(
    approvedExpectationPathBindingFromFixture(fixture, adapter),
    options.approvedExpectationPathBindingOverrides
  );
  const sourceInventoryManifest = buildSourceInventoryManifest({
    adapter,
    fixture,
    sourceLane,
    overrides: options.sourceInventoryManifestOverrides
  });
  const aggregateExtractionManifest = buildAggregateExtractionManifest({
    source: sourceInventoryManifest,
    adapter,
    fixture,
    overrides: options.aggregateExtractionManifestOverrides
  });
  const pipelineRunReviewManifest = buildPipelineRunReviewManifest({
    source: sourceInventoryManifest,
    extraction: aggregateExtractionManifest,
    adapter,
    fixture,
    binding,
    overrides: options.pipelineRunReviewManifestOverrides
  });

  const sourceValidation = validateAiValueSourceInventoryManifest(sourceInventoryManifest);
  const extractionValidation = validateAiValueAggregateExtractionManifest(
    aggregateExtractionManifest,
    { sourceInventoryManifest }
  );
  const reviewValidation = validateAiValuePipelineRunReviewManifest(
    pipelineRunReviewManifest,
    {
      sourceInventoryManifest,
      aggregateExtractionManifest,
      approvedExpectationPathBinding: binding
    }
  );
  const chainValidation = validateAiValueControlledAggregateManifestChain({
    sourceInventoryManifest,
    aggregateExtractionManifest,
    pipelineRunReviewManifest,
    approvedExpectationPathBinding: binding
  });
  const valid =
    sourceValidation.valid &&
    extractionValidation.valid &&
    reviewValidation.valid &&
    chainValidation.valid;

  const validationGaps = combinedGaps([
    ["source_inventory_manifest", sourceValidation],
    ["aggregate_extraction_manifest", extractionValidation],
    ["pipeline_run_review_manifest", reviewValidation],
    ["manifest_chain", chainValidation]
  ]);

  if (!valid) {
    return blockedPackage({
      sourceSystem,
      adapter,
      adapterValidation,
      generatedAt: adapter.generated_at,
      validationGaps,
      sourceValidation,
      extractionValidation,
      reviewValidation,
      chainValidation
    });
  }

  return {
    schema_version: CONTROLLED_AGGREGATE_MANIFEST_VALIDATION_SCHEMA_VERSION,
    manifest_validation_state: valid
      ? "PASSED_CONTROLLED_AGGREGATE_MANIFEST_VALIDATION"
      : "BLOCKED",
    source_system: adapter.source_system,
    adapter_run_id: valid ? adapter.adapter_run_id : null,
    connector_adapter_ref: valid ? {
      adapter_run_id: adapter.adapter_run_id,
      adapter_state: adapter.adapter_state,
      connector_manifest_ref: adapter.connector_manifest_ref,
      pipeline_dry_run_ref: compactPipelineDryRunRef(adapter.pipeline_dry_run_ref)
    } : null,
    approved_expectation_path_binding: binding,
    manifests: valid ? {
      source_inventory_manifest: sourceInventoryManifest,
      aggregate_extraction_manifest: aggregateExtractionManifest,
      pipeline_run_review_manifest: pipelineRunReviewManifest
    } : null,
    manifest_refs: valid ? {
      source_inventory_manifest_ref: manifestRefFromInventory(sourceInventoryManifest),
      aggregate_extraction_manifest_ref: manifestRefFromExtraction(aggregateExtractionManifest),
      pipeline_run_review_manifest_ref: {
        manifest_id: pipelineRunReviewManifest.pipeline_run_review_manifest_id,
        manifest_hash: sha256Json(pipelineRunReviewManifest),
        pipeline_review_state: pipelineRunReviewManifest.pipeline_review_state,
        source_system: pipelineRunReviewManifest.data_spine_alignment_envelope.source_system,
        org_id: pipelineRunReviewManifest.org_id,
        client_id: pipelineRunReviewManifest.client_id,
        workflow_family: pipelineRunReviewManifest.workflow_family,
        function_area: pipelineRunReviewManifest.function_area,
        cohort_key: pipelineRunReviewManifest.cohort_key,
        metric_id: pipelineRunReviewManifest.metric_id,
        expectation_path_id: pipelineRunReviewManifest.expectation_path_id
      }
    } : null,
    validation_summary: {
      schema_version: RESULT_SCHEMA_VERSION,
      valid,
      connector_adapter_valid: valid && adapterValidation.valid === true,
      source_inventory_manifest_valid: sourceValidation.valid === true,
      aggregate_extraction_manifest_valid: extractionValidation.valid === true,
      pipeline_run_review_manifest_valid: reviewValidation.valid === true,
      manifest_chain_valid: chainValidation.valid === true,
      gaps: validationGaps
    },
    feeds: packageFeeds(valid),
    boundary_policy: falseBoundary(PACKAGE_FALSE_BOUNDARY_FIELDS),
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    required_caveats: valid ? [...PACKAGE_PASSED_CAVEATS] : [...PACKAGE_BLOCKED_CAVEATS],
    generated_at: adapter.generated_at
  };
}

export function validateControlledAggregateManifestValidationPackage(
  manifestPackage,
  options = {}
) {
  const gaps = [];
  if (!manifestPackage || typeof manifestPackage !== "object" || Array.isArray(manifestPackage)) {
    return {
      schema_version: RESULT_SCHEMA_VERSION,
      valid: false,
      gaps: ["manifest validation package must be an object"],
      feeds: packageFeeds(false)
    };
  }
  if (manifestPackage.schema_version !== CONTROLLED_AGGREGATE_MANIFEST_VALIDATION_SCHEMA_VERSION) {
    gaps.push("schema_version is invalid");
  }
  gaps.push(...collectUnsupportedKeys(manifestPackage, PACKAGE_ALLOWED_FIELDS, "manifest_validation_package"));

  const manifests = manifestPackage.manifests ?? {};
  const binding = manifestPackage.approved_expectation_path_binding;
  const sourceValidation = validateAiValueSourceInventoryManifest(
    manifests.source_inventory_manifest
  );
  const extractionValidation = validateAiValueAggregateExtractionManifest(
    manifests.aggregate_extraction_manifest,
    { sourceInventoryManifest: manifests.source_inventory_manifest }
  );
  const reviewValidation = validateAiValuePipelineRunReviewManifest(
    manifests.pipeline_run_review_manifest,
    {
      sourceInventoryManifest: manifests.source_inventory_manifest,
      aggregateExtractionManifest: manifests.aggregate_extraction_manifest,
      approvedExpectationPathBinding: binding
    }
  );
  const chainValidation = validateAiValueControlledAggregateManifestChain({
    sourceInventoryManifest: manifests.source_inventory_manifest,
    aggregateExtractionManifest: manifests.aggregate_extraction_manifest,
    pipelineRunReviewManifest: manifests.pipeline_run_review_manifest,
    approvedExpectationPathBinding: binding
  });
  const recomputedValidationGaps = combinedGaps([
    ["source_inventory_manifest", sourceValidation],
    ["aggregate_extraction_manifest", extractionValidation],
    ["pipeline_run_review_manifest", reviewValidation],
    ["manifest_chain", chainValidation]
  ]);

  gaps.push(
    ...recomputedValidationGaps
  );

  const manifestChainValid =
    sourceValidation.valid &&
    extractionValidation.valid &&
    reviewValidation.valid &&
    chainValidation.valid;
  const expectedState = manifestChainValid
    ? "PASSED_CONTROLLED_AGGREGATE_MANIFEST_VALIDATION"
    : "BLOCKED";
  if (manifestPackage.manifest_validation_state !== expectedState) {
    gaps.push("manifest_validation_state must match recomputed package state");
  }
  if (
    manifestPackage.manifest_validation_state ===
      "PASSED_CONTROLLED_AGGREGATE_MANIFEST_VALIDATION" &&
    !options.sourceFixture
  ) {
    gaps.push("sourceFixture is required to validate a passed saved-fixture package");
  }

  if (manifestChainValid) {
    gaps.push(...collectUnsupportedKeys(manifestPackage.manifests, PACKAGE_MANIFESTS_FIELDS, "manifests"));
    gaps.push(...collectUnsupportedKeys(manifestPackage.manifest_refs, PACKAGE_MANIFEST_REFS_FIELDS, "manifest_refs"));
  } else {
    if (
      manifestPackage.adapter_run_id !== null &&
      manifestPackage.adapter_run_id !== undefined
    ) {
      gaps.push("blocked manifest validation packages must not carry adapter refs");
    }
    if (
      manifestPackage.connector_adapter_ref !== null &&
      manifestPackage.connector_adapter_ref !== undefined
    ) {
      gaps.push("blocked manifest validation packages must not carry adapter refs");
    }
    if (manifestPackage.manifests !== null && manifestPackage.manifests !== undefined) {
      gaps.push("blocked manifest validation packages must not carry manifest payloads");
    }
    if (manifestPackage.manifest_refs !== null && manifestPackage.manifest_refs !== undefined) {
      gaps.push("blocked manifest validation packages must not carry manifest refs");
    }
  }

  gaps.push(
    ...collectExactObjectShapeGaps(
      manifestPackage.feeds,
      packageFeeds(manifestChainValid),
      "feeds"
    )
  );
  gaps.push(
    ...collectExactObjectShapeGaps(
      manifestPackage.boundary_policy,
      falseBoundary(PACKAGE_FALSE_BOUNDARY_FIELDS),
      "boundary_policy"
    )
  );
  gaps.push(...collectExactArrayGap(manifestPackage.blocked_uses, REQUIRED_BLOCKED_USES, "blocked_uses"));
  gaps.push(
    ...collectExactArrayGap(
      manifestPackage.required_caveats,
      manifestChainValid ? PACKAGE_PASSED_CAVEATS : PACKAGE_BLOCKED_CAVEATS,
      "required_caveats"
    )
  );

  gaps.push(
    ...collectUnsupportedKeys(
      manifestPackage.validation_summary,
      PACKAGE_VALIDATION_SUMMARY_FIELDS,
      "validation_summary"
    )
  );
  if (manifestPackage.validation_summary?.schema_version !== RESULT_SCHEMA_VERSION) {
    gaps.push("validation_summary.schema_version is invalid");
  }
  for (const [field, expectedValue] of [
    ["valid", manifestChainValid],
    ["connector_adapter_valid", connectorAdapterRefPassed(manifestPackage.connector_adapter_ref)],
    ["source_inventory_manifest_valid", sourceValidation.valid === true],
    ["aggregate_extraction_manifest_valid", extractionValidation.valid === true],
    ["pipeline_run_review_manifest_valid", reviewValidation.valid === true],
    ["manifest_chain_valid", chainValidation.valid === true]
  ]) {
    if (manifestPackage.validation_summary?.[field] !== expectedValue) {
      gaps.push(`validation_summary.${field} must match recomputed validation`);
    }
  }
  if (!Array.isArray(manifestPackage.validation_summary?.gaps)) {
    gaps.push("validation_summary.gaps must be an array");
  } else if (
    JSON.stringify(manifestPackage.validation_summary.gaps) !==
      JSON.stringify(recomputedValidationGaps)
  ) {
    gaps.push("validation_summary.gaps must match recomputed validation");
  } else if (
    manifestPackage.validation_summary.gaps.some((gap) => sanitizeGaps([gap])[0] !== gap)
  ) {
    gaps.push("validation_summary.gaps must not contain unsafe values");
  }

  if (
    manifestPackage.manifest_validation_state ===
      "PASSED_CONTROLLED_AGGREGATE_MANIFEST_VALIDATION" &&
    (!sourceValidation.valid || !extractionValidation.valid || !reviewValidation.valid || !chainValidation.valid)
  ) {
    gaps.push("passed manifest validation packages must have all manifest validations valid");
  }

  if (options.sourceFixture && manifestPackage.manifest_validation_state === "PASSED_CONTROLLED_AGGREGATE_MANIFEST_VALIDATION") {
    const expected = buildControlledAggregateManifestValidationPackageFromObject(
      options.sourceFixture,
      {
        sourceSystem: manifestPackage.source_system,
        sourceLane: selectedSourceLane(options.sourceFixture, {
          sourceLane:
            manifestPackage.manifests?.source_inventory_manifest?.source_lane ??
            manifestPackage.manifest_refs?.source_inventory_manifest_ref?.source_lane
        })
      }
    );
    for (const field of [
      "source_system",
      "adapter_run_id",
      "connector_adapter_ref",
      "generated_at"
    ]) {
      if (JSON.stringify(manifestPackage[field] ?? null) !== JSON.stringify(expected[field] ?? null)) {
        gaps.push(`${field} must match recomputed saved-fixture package`);
      }
    }
    for (const [field, expectedValue] of Object.entries(expected.manifest_refs ?? {})) {
      if (JSON.stringify(manifestPackage.manifest_refs?.[field] ?? null) !== JSON.stringify(expectedValue ?? null)) {
        gaps.push(`manifest_refs.${field} must match recomputed saved-fixture manifest ref`);
      }
    }
    if (JSON.stringify(manifestPackage.approved_expectation_path_binding) !== JSON.stringify(expected.approved_expectation_path_binding)) {
      gaps.push("approved_expectation_path_binding must match recomputed saved-fixture binding");
    }
    if (sha256Json(manifestPackage.manifests?.source_inventory_manifest) !== sha256Json(expected.manifests?.source_inventory_manifest)) {
      gaps.push("source_inventory_manifest must match recomputed saved-fixture manifest");
    }
    if (sha256Json(manifestPackage.manifests?.aggregate_extraction_manifest) !== sha256Json(expected.manifests?.aggregate_extraction_manifest)) {
      gaps.push("aggregate_extraction_manifest must match recomputed saved-fixture manifest");
    }
    if (sha256Json(manifestPackage.manifests?.pipeline_run_review_manifest) !== sha256Json(expected.manifests?.pipeline_run_review_manifest)) {
      gaps.push("pipeline_run_review_manifest must match recomputed saved-fixture manifest");
    }
  }

  const valid = gaps.length === 0;
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    valid,
    gaps: sanitizeGaps(gaps),
    feeds: packageFeeds(valid)
  };
}

function compactCliOutput(manifestPackage, validation) {
  return {
    manifest_validation_state: manifestPackage.manifest_validation_state,
    source_system: manifestPackage.source_system,
    adapter_run_id: manifestPackage.adapter_run_id,
    connector_adapter_ref: manifestPackage.connector_adapter_ref,
    approved_expectation_path_binding: manifestPackage.approved_expectation_path_binding,
    manifest_refs: manifestPackage.manifest_refs,
    data_spine_alignment_envelope:
      manifestPackage.manifests?.pipeline_run_review_manifest?.data_spine_alignment_envelope ?? null,
    source_package_review_queue_posture_ref:
      manifestPackage.manifests?.pipeline_run_review_manifest?.source_package_review_queue_posture_ref ?? null,
    validation_summary: {
      ...manifestPackage.validation_summary,
      valid: validation.valid,
      gaps: validation.gaps
    },
    feeds: manifestPackage.feeds,
    boundary_policy: manifestPackage.boundary_policy,
    blocked_uses: manifestPackage.blocked_uses,
    required_caveats: manifestPackage.required_caveats,
    generated_at: manifestPackage.generated_at
  };
}

function parseCliArgs(argv) {
  let fixturePath = DEFAULT_FIXTURE_PATH;
  let sourceSystem = "bigquery_export";
  let sourceLane;
  for (const arg of argv) {
    if (arg.startsWith("--source-system=")) {
      sourceSystem = arg.split("=", 2)[1];
    } else if (arg.startsWith("--source-lane=")) {
      sourceLane = arg.split("=", 2)[1];
    } else if (!arg.startsWith("--")) {
      fixturePath = arg;
    }
  }
  return { fixturePath, sourceSystem, sourceLane };
}

const isDirectRun = process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const { fixturePath, sourceSystem, sourceLane } = parseCliArgs(process.argv.slice(2));
  const fixture = readJson(fixturePath);
  const manifestPackage = buildControlledAggregateManifestValidationPackageFromObject(
    fixture,
    { sourceSystem, sourceLane }
  );
  const validation = validateControlledAggregateManifestValidationPackage(
    manifestPackage,
    { sourceFixture: fixture }
  );
  process.stdout.write(
    `${JSON.stringify(compactCliOutput(manifestPackage, validation), null, 2)}\n`
  );
  if (!validation.valid || manifestPackage.manifest_validation_state === "BLOCKED") {
    process.exitCode = 1;
  }
}
