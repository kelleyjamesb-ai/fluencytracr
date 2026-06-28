#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const MEASUREMENT_CELL_SNAPSHOT_PROJECTION_SCHEMA_VERSION =
  "FT_AI_VALUE_MEASUREMENT_CELL_SNAPSHOT_PROJECTION_2026_06";

const VALIDATION_SCHEMA_VERSION =
  `${MEASUREMENT_CELL_SNAPSHOT_PROJECTION_SCHEMA_VERSION}_VALIDATION`;

const DERIVATION_VERSION =
  "ai_value_measurement_cell_snapshot_projection_2026_06";

const READY_STATE = "INTERNAL_OPERATOR_PROJECTION_READY";
const HOLD_STATE = "HOLD_FOR_VALID_MEASUREMENT_CELL_SNAPSHOT";
const REJECTED_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";

const DISPLAY_MODE = "internal_operator_review";

const ALLOWED_SOURCE_SYSTEMS = new Set(["bigquery_export", "sigma_export"]);
const PASSED_REVIEW_STATES = new Map([
  ["bigquery_export", "PASSED_BIGQUERY_AGGREGATE_EXPORT_REVIEW"],
  ["sigma_export", "PASSED_SIGMA_AGGREGATE_CONNECTOR_BOUNDARY_REVIEW"]
]);
const ALLOWED_MILESTONE_DAYS = new Set([0, 30, 60, 90, 180, 365]);
const ALLOWED_VALUE_DRIVERS = new Set([
  "Revenue",
  "Cost",
  "Capacity",
  "Quality",
  "Risk"
]);

const TRUE_READY_FEEDS = ["snapshot_projection_internal_review"];

const FALSE_FEEDS = [
  "customer_facing_projection",
  "customer_facing_output",
  "customer_facing_financial_output",
  "customer_facing_economic_output",
  "backend_route",
  "frontend_ui",
  "export_creation",
  "rendered_readout",
  "live_bigquery_execution",
  "live_sigma_execution",
  "live_glean_query",
  "customer_connector_execution",
  "measurement_cell_series_persistence",
  "research_model_feed",
  "model_output",
  "finance_output",
  "probability_output",
  "score_like_output"
];

const BOUNDARY_POLICY_FALSE_FIELDS = [
  "creates_backend_route",
  "creates_frontend_ui",
  "creates_export",
  "creates_rendered_readout",
  "emits_customer_facing_projection",
  "emits_customer_facing_output",
  "emits_customer_facing_financial_output",
  "emits_customer_facing_economic_output",
  "runs_bigquery",
  "runs_sigma",
  "runs_glean_query",
  "runs_customer_connectors",
  "uses_credentials",
  "executes_queries",
  "persists_projection",
  "persists_series",
  "feeds_research_model",
  "emits_model_output",
  "emits_probability",
  "emits_score_like_output",
  "emits_finance_output",
  "computes_roi",
  "claims_causality",
  "measures_productivity"
];

const REQUIRED_BLOCKED_USES = [
  "snapshot_read_route",
  "snapshot_export",
  "customer_facing_projection",
  "customer_facing_output",
  "customer_facing_financial_output",
  "customer_facing_economic_output",
  "rendered_readout",
  "frontend_ui",
  "live_connector_execution",
  "live_bigquery_execution",
  "live_sigma_execution",
  "live_glean_query",
  "measurement_cell_series_persistence",
  "research_model_feed",
  "contribution_model",
  "probability_output",
  "score_output",
  "realized_roi",
  "ebitda_claim",
  "financial_attribution",
  "causality_claim",
  "productivity_claim",
  "individual_attribution",
  "manager_or_team_ranking",
  "people_decisioning"
];

const REQUIRED_CAVEATS = [
  "Measurement Cell Snapshot projection is internal operator review only.",
  "Projection does not authorize backend routes, frontend UI, exports, rendered readouts, live connectors, model output, finance output, or customer-facing output.",
  "Only compact Measurement Cell Snapshot lineage and source refs may be projected."
];

const TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "projection_id",
  "projection_state",
  "display_mode",
  "generated_at",
  "derivation_version",
  "projection_scope",
  "customer_exposure",
  "snapshot_identity",
  "pathway_binding",
  "metric_context",
  "workflow_context",
  "window_context",
  "source_context",
  "evidence_posture",
  "feeds",
  "boundary_policy",
  "required_caveats",
  "blocked_uses",
  "validation_summary",
  "projection_hash"
]);

const PROJECTION_SCOPE_FIELDS = [
  "internal_only",
  "source_bound",
  "compact_refs_only",
  "customer_facing",
  "customer_projection_promoted",
  "route_authorized",
  "ui_authorized",
  "export_authorized",
  "full_payload_excluded"
];

const CUSTOMER_EXPOSURE_FIELDS = [
  "customer_visible",
  "exposure_state",
  "customer_action_required",
  "value_proof_allowed",
  "customer_facing_output_allowed",
  "customer_facing_financial_output_allowed",
  "route_creation_allowed",
  "frontend_ui_creation_allowed",
  "export_allowed"
];

const SNAPSHOT_IDENTITY_FIELDS = [
  "snapshot_id",
  "org_id",
  "client_id",
  "measurement_cell_id",
  "measurement_cell_assembly_run_id",
  "measurement_plan_id",
  "version",
  "supersedes_id",
  "generated_at",
  "created_at",
  "created_by_role"
];

const PATHWAY_BINDING_FIELDS = [
  "value_hypothesis_id",
  "value_hypothesis_ref",
  "value_hypothesis_binding_state",
  "approved_blueprint_ref",
  "approved_blueprint_payload_hash",
  "blueprint_expectation_ref",
  "expectation_path_id",
  "expectation_path_version",
  "expectation_path_hash",
  "approval_state",
  "approved_at",
  "approved_by_role",
  "value_driver"
];

const METRIC_CONTEXT_FIELDS = [
  "metric_id",
  "metric_definition_ref",
  "metric_definition_hash",
  "metric_owner_approval_state",
  "metric_direction",
  "metric_unit",
  "expected_metric_lag_days"
];

const WORKFLOW_CONTEXT_FIELDS = [
  "workflow_family",
  "workflow_id",
  "function_area",
  "cohort_key"
];

const WINDOW_CONTEXT_FIELDS = [
  "window_mode",
  "milestone_day",
  "baseline_window_start",
  "baseline_window_end",
  "comparison_window_start",
  "comparison_window_end"
];

const SOURCE_CONTEXT_FIELDS = [
  "aggregate_source_system",
  "aggregate_export_review_ref",
  "aggregate_export_review_state",
  "aggregate_source_export_ref",
  "aggregate_export_review_hash",
  "pipeline_dry_run_ref",
  "pipeline_boundary_hash",
  "aggregate_boundary_ref",
  "source_refs"
];

const EVIDENCE_POSTURE_FIELDS = [
  "assembly_decision",
  "validation_valid",
  "assembly_validation_valid",
  "validation_gap_count",
  "assembly_validation_gap_count"
];

const SOURCE_REF_FIELDS = new Set([
  "blueprint_source_ref",
  "ai_fluency_source_ref",
  "vbd_source_ref",
  "metric_source_ref",
  "token_source_ref"
]);

const SNAPSHOT_INPUT_FIELDS = new Set([
  "id",
  "org_id",
  "client_id",
  "measurement_cell_id",
  "measurement_cell_assembly_run_id",
  "measurement_plan_id",
  "aggregate_source_system",
  "aggregate_export_review_ref",
  "aggregate_export_review_state",
  "aggregate_source_export_ref",
  "aggregate_export_review_hash",
  "pipeline_dry_run_ref",
  "pipeline_boundary_hash",
  "aggregate_boundary_ref",
  "value_hypothesis_id",
  "value_hypothesis_ref",
  "value_hypothesis_binding_state",
  "approved_blueprint_ref",
  "approved_blueprint_payload_hash",
  "blueprint_expectation_ref",
  "expectation_path_id",
  "expectation_path_version",
  "expectation_path_hash",
  "approval_state",
  "approved_at",
  "approved_by_role",
  "value_driver",
  "metric_id",
  "metric_definition_ref",
  "metric_definition_hash",
  "metric_owner_approval_state",
  "metric_direction",
  "metric_unit",
  "expected_metric_lag_days",
  "workflow_family",
  "workflow_id",
  "function_area",
  "cohort_key",
  "window_mode",
  "milestone_day",
  "baseline_window_start",
  "baseline_window_end",
  "comparison_window_start",
  "comparison_window_end",
  "assembly_decision",
  "payload",
  "assembly_payload",
  "validation",
  "assembly_validation",
  "source_refs",
  "blueprint_path_binding",
  "required_caveats",
  "blocked_uses",
  "version",
  "supersedes_id",
  "generated_at",
  "created_at",
  "created_by_role"
]);

const AGGREGATE_BOUNDARY_REF_FIELDS = new Set([
  "source_system",
  "review_id",
  "review_state",
  "source_export_ref",
  "aggregate_definition_ref",
  "aggregate_output_ref",
  "review_hash",
  "pipeline_dry_run_id",
  "pipeline_source_export_ref",
  "pipeline_boundary_hash"
]);

const SAFE_COMPACT_REF_PATTERN = /^[A-Za-z0-9._:-]+$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

const FORBIDDEN_KEY_PATTERNS = [
  /raw_?rows?/i,
  /^rows$/i,
  /^records$/i,
  /query_?text/i,
  /sql/i,
  /prompt/i,
  /response/i,
  /transcript/i,
  /user_?id/i,
  /employee/i,
  /person_?id/i,
  /^email$/i,
  /row_?id/i,
  /span_?id/i,
  /job_?id/i,
  /query_?id/i,
  /project_?id/i,
  /dataset_?id/i,
  /table_?id/i,
  /dashboard_?url/i,
  /source_?package_?payload/i,
  /operator_?handoff_?bundle/i,
  /approved_?expectation_?paths/i,
  /full_?expectation/i,
  /full_?measurement_?cell/i,
  /payload_?json/i,
  /source_?refs_?json/i,
  /validation_?json/i,
  /blueprint_?path_?binding_?json/i,
  /customer_?visible/i,
  /customer_?facing/i,
  /backend_?route/i,
  /frontend_?ui/i,
  /export_?creation/i,
  /rendered_?readout/i,
  /snapshot_?read_?route/i,
  /^confidence/i,
  /confidence_?score/i,
  /model_?output/i,
  /research_?model_?feed/i,
  /p_?value/i,
  /credible_?interval/i,
  /^probability$/i,
  /probability_?score/i,
  /^score$/i,
  /risk_?score/i,
  /quality_?score/i,
  /^roi$/i,
  /ebitda/i,
  /savings/i,
  /payback/i,
  /financial_?output/i,
  /causality/i,
  /productivity/i
];

const FORBIDDEN_VALUE_PATTERNS = [
  /select\s+.+\s+from/i,
  /\braw_rows?\b/i,
  /\bbquxjob/i,
  /https?:\/\//i,
  /secret:\/\//i,
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /\btranscript\b/i,
  /(?:^|[._:-])(?:user|employee|person|row|span|project|dataset|table)[._:-]?id(?:[._:-]|$)/i,
  /(?:^|[._:-])(?:email|user|person|employee)[._:-]?hash(?:[._:-]|$)/i,
  /(?:^|[._:-])hashed[._:-]?(?:email|user|person|employee)(?:[._:-]|$)/i,
  /(?:^|[._:-])trace[._:-]?id(?:[._:-]|$)/i,
  /(?:^|[._:-])(?:prompt|response|transcript|query|sql)[._:-]?(?:text|content)(?:[._:-]|$)/i,
  /(?:^|[._:-])(?:prompt|response|transcript|query|sql)[._:-]?(?:export|digest)(?:[._:-]|$)/i
];

function trueMap(keys) {
  return Object.fromEntries(keys.map((key) => [key, true]));
}

function falseMap(keys) {
  return Object.fromEntries(keys.map((key) => [key, false]));
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256Json(value) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function compactRefIsSafe(value) {
  return (
    isNonEmptyString(value) &&
    value.length <= 160 &&
    SAFE_COMPACT_REF_PATTERN.test(value) &&
    !FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))
  );
}

function pathContains(path, name) {
  return path.some((part) => part === name);
}

function keyIsFalsePosture(path, key) {
  if (path.length !== 1) return false;
  return (
    (path[0] === "feeds" && FALSE_FEEDS.includes(key)) ||
    (path[0] === "boundary_policy" && BOUNDARY_POLICY_FALSE_FIELDS.includes(key)) ||
    (path[0] === "customer_exposure" && CUSTOMER_EXPOSURE_FIELDS.includes(key)) ||
    (path[0] === "projection_scope" && PROJECTION_SCOPE_FIELDS.includes(key))
  );
}

function collectGovernanceArrayLeakage(key, value, path) {
  const gaps = [];
  if (key !== "blocked_uses" && key !== "required_caveats") return gaps;
  if (!Array.isArray(value)) {
    return [`${[...path, key].join(".")} must be an array of strings`];
  }
  value.forEach((item, index) => {
    if (typeof item !== "string") {
      gaps.push(`${[...path, key, String(index)].join(".")} must be a string`);
      return;
    }
    if (
      FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(item))
    ) {
      gaps.push(`${[...path, key, String(index)].join(".")} contains unsafe source text`);
    }
  });
  return gaps;
}

function safeGeneratedAt(input, options = {}) {
  const candidate = options.generatedAt ?? asRecord(input).generated_at;
  if (
    typeof candidate === "string" &&
    Number.isFinite(Date.parse(candidate)) &&
    !FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(candidate))
  ) {
    return candidate;
  }
  return new Date().toISOString();
}

function collectBoundaryLeakage(value, path = []) {
  const gaps = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      gaps.push(...collectBoundaryLeakage(item, [...path, String(index)]));
    });
    return gaps;
  }
  if (!value || typeof value !== "object") {
    if (
      typeof value === "string" &&
      !pathContains(path, "blocked_uses") &&
      !pathContains(path, "required_caveats") &&
      FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))
    ) {
      gaps.push(`${path.join(".") || "value"} contains unsafe source text`);
    }
    return gaps;
  }
  for (const [key, nestedValue] of Object.entries(value)) {
    const nextPath = [...path, key];
    const governanceArrayGaps = collectGovernanceArrayLeakage(key, nestedValue, path);
    if (governanceArrayGaps.length > 0) {
      gaps.push(...governanceArrayGaps);
      continue;
    }
    if (
      !pathContains(path, "blocked_uses") &&
      !pathContains(path, "required_caveats") &&
      !keyIsFalsePosture(path, key) &&
      FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key))
    ) {
      gaps.push(`${nextPath.join(".")} is not allowed`);
      continue;
    }
    gaps.push(...collectBoundaryLeakage(nestedValue, nextPath));
  }
  return gaps;
}

function collectAllowedFieldsGaps(record, allowedFields, label) {
  return Object.keys(asRecord(record))
    .filter((key) => !allowedFields.has(key))
    .map((key) => `${label}.${key} is not allowed`);
}

function requireString(record, field, gaps, label = field) {
  if (!isNonEmptyString(record[field])) {
    gaps.push(`${label} is required`);
    return "";
  }
  return record[field];
}

function requireHash(record, field, gaps, label = field) {
  const value = requireString(record, field, gaps, label);
  if (value && !SHA256_PATTERN.test(value)) {
    gaps.push(`${label} must be a sha256 hash`);
  }
  return value;
}

function requirePositiveInteger(record, field, gaps, label = field) {
  const value = Number(record[field]);
  if (!Number.isInteger(value) || value < 1) {
    gaps.push(`${label} must be a positive integer`);
    return 0;
  }
  return value;
}

function requireNonNegativeInteger(record, field, gaps, label = field) {
  const value = Number(record[field]);
  if (!Number.isInteger(value) || value < 0) {
    gaps.push(`${label} must be a non-negative integer`);
    return 0;
  }
  return value;
}

function compare(gaps, label, left, right) {
  if (left !== right) {
    gaps.push(`${label} must match`);
  }
}

function validateDateRange(startValue, endValue, label, gaps) {
  const start = Date.parse(startValue);
  const end = Date.parse(endValue);
  if (!Number.isFinite(start)) {
    gaps.push(`${label}_start must be an ISO timestamp`);
  }
  if (!Number.isFinite(end)) {
    gaps.push(`${label}_end must be an ISO timestamp`);
  }
  if (Number.isFinite(start) && Number.isFinite(end) && end <= start) {
    gaps.push(`${label}_end must be after ${label}_start`);
  }
}

function validationIsValid(value) {
  return asRecord(value).valid === true;
}

function validationGapCount(value) {
  const gaps = asRecord(value).gaps;
  return Array.isArray(gaps) ? gaps.length : 0;
}

function collectSourceRefGaps(sourceRefs) {
  const gaps = [];
  const refs = asRecord(sourceRefs);
  gaps.push(...collectAllowedFieldsGaps(refs, SOURCE_REF_FIELDS, "source_refs"));
  for (const field of SOURCE_REF_FIELDS) {
    if (!compactRefIsSafe(refs[field])) {
      gaps.push(`source_refs.${field} must be safe compact metadata`);
    }
  }
  return gaps;
}

function collectAggregateBoundaryRefGaps(boundaryRef, snapshot) {
  const gaps = [];
  const boundary = asRecord(boundaryRef);
  const sourceRefs = compactSourceRefs(snapshot.source_refs);
  gaps.push(
    ...collectAllowedFieldsGaps(
      boundary,
      AGGREGATE_BOUNDARY_REF_FIELDS,
      "aggregate_boundary_ref"
    )
  );
  for (const field of [
    "source_system",
    "review_id",
    "review_state",
    "source_export_ref",
    "aggregate_definition_ref",
    "aggregate_output_ref",
    "pipeline_dry_run_id",
    "pipeline_source_export_ref"
  ]) {
    if (!compactRefIsSafe(boundary[field])) {
      gaps.push(`aggregate_boundary_ref.${field} must be safe compact metadata`);
    }
  }
  for (const field of ["review_hash", "pipeline_boundary_hash"]) {
    if (!isNonEmptyString(boundary[field]) || !SHA256_PATTERN.test(boundary[field])) {
      gaps.push(`aggregate_boundary_ref.${field} must be a sha256 hash`);
    }
  }
  compare(
    gaps,
    "aggregate_boundary_ref.source_system",
    boundary.source_system,
    snapshot.aggregate_source_system
  );
  compare(
    gaps,
    "aggregate_boundary_ref.review_id",
    boundary.review_id,
    snapshot.aggregate_export_review_ref
  );
  compare(
    gaps,
    "aggregate_boundary_ref.review_state",
    boundary.review_state,
    snapshot.aggregate_export_review_state
  );
  compare(
    gaps,
    "aggregate_boundary_ref.source_export_ref",
    boundary.source_export_ref,
    snapshot.aggregate_source_export_ref
  );
  compare(
    gaps,
    "aggregate_boundary_ref.review_hash",
    boundary.review_hash,
    snapshot.aggregate_export_review_hash
  );
  compare(
    gaps,
    "aggregate_boundary_ref.pipeline_dry_run_id",
    boundary.pipeline_dry_run_id,
    snapshot.pipeline_dry_run_ref
  );
  compare(
    gaps,
    "aggregate_boundary_ref.pipeline_boundary_hash",
    boundary.pipeline_boundary_hash,
    snapshot.pipeline_boundary_hash
  );
  compare(
    gaps,
    "aggregate_boundary_ref.pipeline_source_export_ref",
    boundary.pipeline_source_export_ref,
    snapshot.aggregate_source_export_ref
  );
  const expectedReviewHash = sha256Json({
    review_id: boundary.review_id,
    review_state: boundary.review_state,
    source_export_ref: boundary.source_export_ref,
    aggregate_definition_ref: boundary.aggregate_definition_ref,
    aggregate_output_ref: boundary.aggregate_output_ref
  });
  if (boundary.review_hash !== expectedReviewHash) {
    gaps.push("aggregate_boundary_ref.review_hash must match compact aggregate review proof");
  }
  if (snapshot.aggregate_export_review_hash !== expectedReviewHash) {
    gaps.push("aggregate_export_review_hash must match compact aggregate review proof");
  }
  if (boundary.source_export_ref !== boundary.pipeline_source_export_ref) {
    gaps.push("aggregate_boundary_ref.source_export_ref must match pipeline_source_export_ref");
  }
  if (
    isNonEmptyString(boundary.source_system) &&
    isNonEmptyString(boundary.source_export_ref) &&
    !boundary.source_export_ref.startsWith(`${boundary.source_system}_`)
  ) {
    gaps.push("aggregate_boundary_ref.source_export_ref must carry the reviewed source-system prefix");
  }
  if (
    isNonEmptyString(sourceRefs.vbd_source_ref) &&
    isNonEmptyString(boundary.source_system) &&
    boundary.source_export_ref !== `${boundary.source_system}_${sourceRefs.vbd_source_ref}`
  ) {
    gaps.push("aggregate_boundary_ref.source_export_ref must bind to source_refs.vbd_source_ref");
  }
  const expectedPipelineHash = sha256Json({
    schema_version: "FT_AI_VALUE_MEASUREMENT_CELL_PIPELINE_BOUNDARY_HASH_2026_06",
    aggregate_boundary: {
      source_system: boundary.source_system,
      review_id: boundary.review_id,
      review_state: boundary.review_state,
      source_export_ref: boundary.source_export_ref,
      aggregate_definition_ref: boundary.aggregate_definition_ref,
      aggregate_output_ref: boundary.aggregate_output_ref,
      review_hash: boundary.review_hash,
      pipeline_dry_run_id: boundary.pipeline_dry_run_id,
      pipeline_source_export_ref: boundary.pipeline_source_export_ref
    },
    snapshot_binding: {
      measurement_cell_id: snapshot.measurement_cell_id,
      measurement_cell_assembly_run_id: snapshot.measurement_cell_assembly_run_id,
      measurement_plan_id: snapshot.measurement_plan_id,
      expectation_path_id: snapshot.expectation_path_id,
      metric_id: snapshot.metric_id,
      workflow_family: snapshot.workflow_family,
      workflow_id: snapshot.workflow_id ?? null,
      function_area: snapshot.function_area,
      cohort_key: snapshot.cohort_key,
      window_mode: snapshot.window_mode,
      milestone_day: snapshot.milestone_day,
      baseline_window_start: snapshot.baseline_window_start,
      baseline_window_end: snapshot.baseline_window_end,
      comparison_window_start: snapshot.comparison_window_start,
      comparison_window_end: snapshot.comparison_window_end,
      source_refs: sourceRefs
    }
  });
  if (boundary.pipeline_boundary_hash !== expectedPipelineHash) {
    gaps.push("aggregate_boundary_ref.pipeline_boundary_hash must match recomputed compact pipeline boundary binding");
  }
  if (snapshot.pipeline_boundary_hash !== expectedPipelineHash) {
    gaps.push("pipeline_boundary_hash must match recomputed compact pipeline boundary binding");
  }
  return gaps;
}

function collectSnapshotGaps(snapshot) {
  const gaps = [];
  const record = asRecord(snapshot);
  gaps.push(...collectAllowedFieldsGaps(record, SNAPSHOT_INPUT_FIELDS, "snapshot"));

  for (const field of [
    "id",
    "org_id",
    "measurement_cell_id",
    "measurement_cell_assembly_run_id",
    "measurement_plan_id",
    "aggregate_source_system",
    "aggregate_export_review_ref",
    "aggregate_export_review_state",
    "aggregate_source_export_ref",
    "pipeline_dry_run_ref",
    "approved_blueprint_ref",
    "approved_blueprint_payload_hash",
    "blueprint_expectation_ref",
    "expectation_path_id",
    "expectation_path_hash",
    "approval_state",
    "approved_at",
    "approved_by_role",
    "value_driver",
    "metric_id",
    "metric_definition_ref",
    "metric_definition_hash",
    "metric_owner_approval_state",
    "metric_direction",
    "metric_unit",
    "workflow_family",
    "function_area",
    "cohort_key",
    "window_mode",
    "baseline_window_start",
    "baseline_window_end",
    "comparison_window_start",
    "comparison_window_end",
    "assembly_decision",
    "generated_at",
    "created_at",
    "created_by_role"
  ]) {
    requireString(record, field, gaps);
  }

  requireHash(record, "aggregate_export_review_hash", gaps);
  requireHash(record, "pipeline_boundary_hash", gaps);
  requirePositiveInteger(record, "expectation_path_version", gaps);
  requirePositiveInteger(record, "version", gaps);
  requireNonNegativeInteger(record, "expected_metric_lag_days", gaps);

  if (!ALLOWED_SOURCE_SYSTEMS.has(record.aggregate_source_system)) {
    gaps.push("aggregate_source_system is unsupported");
  }
  const expectedReviewState = PASSED_REVIEW_STATES.get(record.aggregate_source_system);
  if (expectedReviewState && record.aggregate_export_review_state !== expectedReviewState) {
    gaps.push("aggregate_export_review_state must be passed for aggregate_source_system");
  }
  if (record.window_mode !== "milestone") {
    gaps.push("window_mode must be milestone");
  }
  if (!ALLOWED_MILESTONE_DAYS.has(Number(record.milestone_day))) {
    gaps.push("milestone_day must be one of Day 0, 30, 60, 90, 180, or 365");
  }
  if (record.approval_state !== "approved") {
    gaps.push("approval_state must be approved");
  }
  if (!ALLOWED_VALUE_DRIVERS.has(record.value_driver)) {
    gaps.push("value_driver must be one of Revenue, Cost, Capacity, Quality, or Risk");
  }
  if (
    record.expectation_path_id &&
    record.value_hypothesis_binding_state !== "inapplicable" &&
    !isNonEmptyString(record.value_hypothesis_id) &&
    !isNonEmptyString(record.value_hypothesis_ref)
  ) {
    gaps.push("value_hypothesis_id or value_hypothesis_ref is required");
  }
  if (record.metric_owner_approval_state !== "approved") {
    gaps.push("metric_owner_approval_state must be approved");
  }
  if (!validationIsValid(record.validation)) {
    gaps.push("validation.valid must be true");
  }
  if (!validationIsValid(record.assembly_validation)) {
    gaps.push("assembly_validation.valid must be true");
  }
  if (record.assembly_payload !== null && record.assembly_payload !== undefined) {
    gaps.push("assembly_payload must be null for snapshot projection");
  }
  validateDateRange(
    record.baseline_window_start,
    record.baseline_window_end,
    "baseline_window",
    gaps
  );
  validateDateRange(
    record.comparison_window_start,
    record.comparison_window_end,
    "comparison_window",
    gaps
  );
  gaps.push(...collectSourceRefGaps(record.source_refs));
  gaps.push(...collectAggregateBoundaryRefGaps(record.aggregate_boundary_ref, record));
  const binding = asRecord(record.blueprint_path_binding);
  if (Object.prototype.hasOwnProperty.call(binding, "approved_expectation_paths")) {
    gaps.push("blueprint_path_binding.approved_expectation_paths is not allowed");
  }
  compare(
    gaps,
    "blueprint_path_binding.expectation_path_id",
    binding.expectation_path_id,
    record.expectation_path_id
  );
  compare(
    gaps,
    "blueprint_path_binding.expectation_path_version",
    binding.expectation_path_version,
    record.expectation_path_version
  );
  compare(
    gaps,
    "blueprint_path_binding.expectation_path_hash",
    binding.expectation_path_hash,
    record.expectation_path_hash
  );
  compare(
    gaps,
    "blueprint_path_binding.approved_blueprint_payload_hash",
    binding.approved_blueprint_payload_hash,
    record.approved_blueprint_payload_hash
  );
  compare(
    gaps,
    "blueprint_path_binding.approved_blueprint_ref",
    binding.approved_blueprint_ref,
    record.approved_blueprint_ref
  );
  compare(
    gaps,
    "blueprint_path_binding.blueprint_expectation_ref",
    binding.blueprint_expectation_ref,
    record.blueprint_expectation_ref
  );
  compare(
    gaps,
    "blueprint_path_binding.approval_state",
    binding.approval_state,
    record.approval_state
  );
  compare(
    gaps,
    "blueprint_path_binding.approved_at",
    binding.approved_at,
    record.approved_at
  );
  compare(
    gaps,
    "blueprint_path_binding.approved_by_role",
    binding.approved_by_role,
    record.approved_by_role
  );
  compare(
    gaps,
    "blueprint_path_binding.value_driver",
    binding.value_driver,
    record.value_driver
  );
  compare(
    gaps,
    "blueprint_path_binding.expected_metric_id",
    binding.expected_metric_id,
    record.metric_id
  );
  compare(
    gaps,
    "blueprint_path_binding.expected_metric_lag_days",
    binding.expected_metric_lag_days,
    record.expected_metric_lag_days
  );
  for (const blockedUse of REQUIRED_BLOCKED_USES) {
    if (!Array.isArray(record.blocked_uses) || !record.blocked_uses.includes(blockedUse)) {
      gaps.push(`blocked_uses missing ${blockedUse}`);
    }
  }
  return gaps;
}

function compactAggregateBoundaryRef(boundaryRef) {
  const boundary = asRecord(boundaryRef);
  return Object.fromEntries(
    [...AGGREGATE_BOUNDARY_REF_FIELDS].map((field) => [field, boundary[field] ?? null])
  );
}

function compactSourceRefs(sourceRefs) {
  const refs = asRecord(sourceRefs);
  return Object.fromEntries(
    [...SOURCE_REF_FIELDS].map((field) => [field, refs[field] ?? null])
  );
}

function validationSummary(valid, gaps) {
  return {
    schema_version: VALIDATION_SCHEMA_VERSION,
    valid,
    gaps
  };
}

function baseProjectionFields(state, valid, gaps, generatedAt) {
  const ready = state === READY_STATE && valid;
  return {
    schema_version: MEASUREMENT_CELL_SNAPSHOT_PROJECTION_SCHEMA_VERSION,
    projection_id: ready
      ? "measurement_cell_snapshot_projection_pending_identity"
      : `measurement_cell_snapshot_projection_${state.toLowerCase()}`,
    projection_state: state,
    display_mode: DISPLAY_MODE,
    generated_at: generatedAt,
    derivation_version: DERIVATION_VERSION,
    projection_scope: {
      internal_only: true,
      source_bound: ready,
      compact_refs_only: true,
      customer_facing: false,
      customer_projection_promoted: false,
      route_authorized: false,
      ui_authorized: false,
      export_authorized: false,
      full_payload_excluded: true
    },
    customer_exposure: {
      customer_visible: false,
      exposure_state: "held_for_source_bound_projection_promotion",
      customer_action_required: false,
      value_proof_allowed: false,
      customer_facing_output_allowed: false,
      customer_facing_financial_output_allowed: false,
      route_creation_allowed: false,
      frontend_ui_creation_allowed: false,
      export_allowed: false
    },
    feeds: {
      ...Object.fromEntries(TRUE_READY_FEEDS.map((feed) => [feed, ready])),
      ...falseMap(FALSE_FEEDS)
    },
    boundary_policy: falseMap(BOUNDARY_POLICY_FALSE_FIELDS),
    required_caveats: REQUIRED_CAVEATS,
    blocked_uses: REQUIRED_BLOCKED_USES,
    validation_summary: validationSummary(valid, gaps)
  };
}

function buildRejectedProjection(gaps, generatedAt) {
  const projection = {
    ...baseProjectionFields(REJECTED_STATE, false, gaps, generatedAt)
  };
  projection.projection_hash = measurementCellSnapshotProjectionHash(projection);
  return projection;
}

function buildHoldProjection(snapshot, gaps, generatedAt) {
  const record = asRecord(snapshot);
  const projection = {
    ...baseProjectionFields(HOLD_STATE, false, gaps, generatedAt),
    snapshot_identity: {
      snapshot_id: record.id ?? null,
      org_id: record.org_id ?? null,
      client_id: record.client_id ?? null,
      measurement_cell_id: record.measurement_cell_id ?? null,
      measurement_cell_assembly_run_id: record.measurement_cell_assembly_run_id ?? null,
      measurement_plan_id: record.measurement_plan_id ?? null,
      version: record.version ?? null,
      supersedes_id: record.supersedes_id ?? null,
      generated_at: record.generated_at ?? null,
      created_at: record.created_at ?? null,
      created_by_role: record.created_by_role ?? null
    }
  };
  projection.projection_hash = measurementCellSnapshotProjectionHash(projection);
  return projection;
}

function buildReadyProjection(snapshot, generatedAt) {
  const record = asRecord(snapshot);
  const projection = {
    ...baseProjectionFields(READY_STATE, true, [], generatedAt),
    projection_id: `measurement_cell_snapshot_projection:${record.org_id}:${record.measurement_cell_id}:v${record.version}`,
    snapshot_identity: {
      snapshot_id: record.id,
      org_id: record.org_id,
      client_id: record.client_id ?? null,
      measurement_cell_id: record.measurement_cell_id,
      measurement_cell_assembly_run_id: record.measurement_cell_assembly_run_id,
      measurement_plan_id: record.measurement_plan_id,
      version: Number(record.version),
      supersedes_id: record.supersedes_id ?? null,
      generated_at: record.generated_at,
      created_at: record.created_at,
      created_by_role: record.created_by_role
    },
    pathway_binding: {
      value_hypothesis_id: record.value_hypothesis_id ?? null,
      value_hypothesis_ref: record.value_hypothesis_ref ?? null,
      value_hypothesis_binding_state: record.value_hypothesis_binding_state,
      approved_blueprint_ref: record.approved_blueprint_ref,
      approved_blueprint_payload_hash: record.approved_blueprint_payload_hash,
      blueprint_expectation_ref: record.blueprint_expectation_ref,
      expectation_path_id: record.expectation_path_id,
      expectation_path_version: Number(record.expectation_path_version),
      expectation_path_hash: record.expectation_path_hash,
      approval_state: record.approval_state,
      approved_at: record.approved_at,
      approved_by_role: record.approved_by_role,
      value_driver: record.value_driver
    },
    metric_context: {
      metric_id: record.metric_id,
      metric_definition_ref: record.metric_definition_ref,
      metric_definition_hash: record.metric_definition_hash,
      metric_owner_approval_state: record.metric_owner_approval_state,
      metric_direction: record.metric_direction,
      metric_unit: record.metric_unit,
      expected_metric_lag_days: Number(record.expected_metric_lag_days)
    },
    workflow_context: {
      workflow_family: record.workflow_family,
      workflow_id: record.workflow_id ?? null,
      function_area: record.function_area,
      cohort_key: record.cohort_key
    },
    window_context: {
      window_mode: record.window_mode,
      milestone_day: Number(record.milestone_day),
      baseline_window_start: record.baseline_window_start,
      baseline_window_end: record.baseline_window_end,
      comparison_window_start: record.comparison_window_start,
      comparison_window_end: record.comparison_window_end
    },
    source_context: {
      aggregate_source_system: record.aggregate_source_system,
      aggregate_export_review_ref: record.aggregate_export_review_ref,
      aggregate_export_review_state: record.aggregate_export_review_state,
      aggregate_source_export_ref: record.aggregate_source_export_ref,
      aggregate_export_review_hash: record.aggregate_export_review_hash,
      pipeline_dry_run_ref: record.pipeline_dry_run_ref,
      pipeline_boundary_hash: record.pipeline_boundary_hash,
      aggregate_boundary_ref: compactAggregateBoundaryRef(record.aggregate_boundary_ref),
      source_refs: compactSourceRefs(record.source_refs)
    },
    evidence_posture: {
      assembly_decision: record.assembly_decision,
      validation_valid: validationIsValid(record.validation),
      assembly_validation_valid: validationIsValid(record.assembly_validation),
      validation_gap_count: validationGapCount(record.validation),
      assembly_validation_gap_count: validationGapCount(record.assembly_validation)
    }
  };
  projection.projection_hash = measurementCellSnapshotProjectionHash(projection);
  return projection;
}

export function measurementCellSnapshotProjectionHash(projection) {
  const clone = JSON.parse(JSON.stringify(projection));
  delete clone.projection_hash;
  return sha256Json(clone);
}

export function buildMeasurementCellSnapshotProjectionFromObject(input, options = {}) {
  const generatedAt = safeGeneratedAt(input, options);
  const fullInputLeakageGaps = collectBoundaryLeakage(input);
  if (fullInputLeakageGaps.length > 0) {
    return buildRejectedProjection(fullInputLeakageGaps, generatedAt);
  }
  const wrapper = asRecord(input);
  const wrapperKeys = Object.keys(wrapper);
  if (
    (Object.prototype.hasOwnProperty.call(wrapper, "measurement_cell_snapshot") ||
      Object.prototype.hasOwnProperty.call(wrapper, "snapshot")) &&
    wrapperKeys.some((key) => !["measurement_cell_snapshot", "snapshot"].includes(key))
  ) {
    return buildRejectedProjection(["snapshot wrapper cannot include sidecar fields"], generatedAt);
  }
  const source =
    asRecord(input).measurement_cell_snapshot ??
    asRecord(input).snapshot ??
    input;
  const leakageGaps = collectBoundaryLeakage(source);
  if (leakageGaps.length > 0) {
    return buildRejectedProjection(leakageGaps, generatedAt);
  }
  const snapshotGaps = collectSnapshotGaps(source);
  if (snapshotGaps.length > 0) {
    return buildHoldProjection(source, snapshotGaps, generatedAt);
  }
  return buildReadyProjection(source, generatedAt);
}

function collectProjectionShapeGaps(projection) {
  const gaps = [];
  const record = asRecord(projection);
  gaps.push(...collectAllowedFieldsGaps(record, TOP_LEVEL_FIELDS, "projection"));
  if (record.projection_state === READY_STATE) {
    for (const field of TOP_LEVEL_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(record, field)) {
        gaps.push(`projection.${field} is required`);
      }
    }
  }

  if (record.schema_version !== MEASUREMENT_CELL_SNAPSHOT_PROJECTION_SCHEMA_VERSION) {
    gaps.push("schema_version is unsupported");
  }
  if (![READY_STATE, HOLD_STATE, REJECTED_STATE].includes(record.projection_state)) {
    gaps.push("projection_state is unsupported");
  }
  if (record.display_mode !== DISPLAY_MODE) {
    gaps.push("display_mode must be internal_operator_review");
  }
  for (const [name, fields] of [
    ["projection_scope", PROJECTION_SCOPE_FIELDS],
    ["customer_exposure", CUSTOMER_EXPOSURE_FIELDS],
    ["snapshot_identity", SNAPSHOT_IDENTITY_FIELDS],
    ["pathway_binding", PATHWAY_BINDING_FIELDS],
    ["metric_context", METRIC_CONTEXT_FIELDS],
    ["workflow_context", WORKFLOW_CONTEXT_FIELDS],
    ["window_context", WINDOW_CONTEXT_FIELDS],
    ["source_context", SOURCE_CONTEXT_FIELDS],
    ["evidence_posture", EVIDENCE_POSTURE_FIELDS]
  ]) {
    const nested = asRecord(record[name]);
    if (
      Object.keys(nested).length > 0 ||
      record.projection_state === READY_STATE
    ) {
      for (const field of fields) {
        if (!Object.prototype.hasOwnProperty.call(nested, field)) {
          gaps.push(`${name}.${field} is required`);
        }
      }
      gaps.push(
        ...collectAllowedFieldsGaps(
          nested,
          new Set(fields),
          name
        )
      );
    }
  }
  if (record.projection_state === READY_STATE) {
    if (asRecord(record.projection_scope).internal_only !== true) {
      gaps.push("projection_scope.internal_only must be true");
    }
    if (asRecord(record.projection_scope).source_bound !== true) {
      gaps.push("projection_scope.source_bound must be true");
    }
    if (asRecord(record.customer_exposure).customer_visible !== false) {
      gaps.push("customer_exposure.customer_visible must be false");
    }
    if (asRecord(record.feeds).snapshot_projection_internal_review !== true) {
      gaps.push("feeds.snapshot_projection_internal_review must be true");
    }
  }
  for (const feed of FALSE_FEEDS) {
    if (asRecord(record.feeds)[feed] !== false) {
      gaps.push(`feeds.${feed} must be false`);
    }
  }
  gaps.push(
    ...collectAllowedFieldsGaps(
      asRecord(record.feeds),
      new Set([...TRUE_READY_FEEDS, ...FALSE_FEEDS]),
      "feeds"
    )
  );
  for (const feed of [...TRUE_READY_FEEDS, ...FALSE_FEEDS]) {
    if (!Object.prototype.hasOwnProperty.call(asRecord(record.feeds), feed)) {
      gaps.push(`feeds.${feed} is required`);
    }
  }
  for (const field of BOUNDARY_POLICY_FALSE_FIELDS) {
    if (asRecord(record.boundary_policy)[field] !== false) {
      gaps.push(`boundary_policy.${field} must be false`);
    }
  }
  gaps.push(
    ...collectAllowedFieldsGaps(
      asRecord(record.boundary_policy),
      new Set(BOUNDARY_POLICY_FALSE_FIELDS),
      "boundary_policy"
    )
  );
  for (const field of BOUNDARY_POLICY_FALSE_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(asRecord(record.boundary_policy), field)) {
      gaps.push(`boundary_policy.${field} is required`);
    }
  }
  if (stableStringify(record.required_caveats) !== stableStringify(REQUIRED_CAVEATS)) {
    gaps.push("required_caveats must match governed projection caveats exactly");
  }
  if (stableStringify(record.blocked_uses) !== stableStringify(REQUIRED_BLOCKED_USES)) {
    gaps.push("blocked_uses must match governed projection blocked uses exactly");
  }
  for (const caveat of REQUIRED_CAVEATS) {
    if (!Array.isArray(record.required_caveats) || !record.required_caveats.includes(caveat)) {
      gaps.push(`required_caveats missing governed caveat: ${caveat}`);
    }
  }
  for (const blockedUse of REQUIRED_BLOCKED_USES) {
    if (!Array.isArray(record.blocked_uses) || !record.blocked_uses.includes(blockedUse)) {
      gaps.push(`blocked_uses missing ${blockedUse}`);
    }
  }
  if (record.projection_state === READY_STATE) {
    const sourceContext = asRecord(record.source_context);
    gaps.push(...collectSourceRefGaps(sourceContext.source_refs));
    gaps.push(
      ...collectAllowedFieldsGaps(
        asRecord(sourceContext.aggregate_boundary_ref),
        AGGREGATE_BOUNDARY_REF_FIELDS,
        "source_context.aggregate_boundary_ref"
      )
    );
  }
  if (!isNonEmptyString(record.projection_hash) || !SHA256_PATTERN.test(record.projection_hash)) {
    gaps.push("projection_hash must be a sha256 hash");
  } else if (record.projection_hash !== measurementCellSnapshotProjectionHash(record)) {
    gaps.push("projection_hash must match recomputed hash");
  }
  return gaps;
}

export function validateMeasurementCellSnapshotProjection(projection) {
  const leakageGaps = collectBoundaryLeakage(projection);
  const shapeGaps = collectProjectionShapeGaps(projection);
  const gaps = [...leakageGaps, ...shapeGaps];
  const summary = asRecord(asRecord(projection).validation_summary);
  const summaryGaps = Array.isArray(summary.gaps)
    ? summary.gaps.filter((gap) => typeof gap === "string" && gap.length > 0)
    : [];
  const projectedValid = summary.valid === true;
  if (asRecord(projection).projection_state === READY_STATE && projectedValid !== true) {
    gaps.push("validation_summary.valid must be true for ready projections");
  }
  if (asRecord(projection).projection_state !== READY_STATE && projectedValid !== false) {
    gaps.push("validation_summary.valid must be false for held or rejected projections");
  }
  if (asRecord(projection).projection_state === READY_STATE && summaryGaps.length > 0) {
    gaps.push("validation_summary.gaps must be empty for ready projections");
  }
  if (asRecord(projection).projection_state !== READY_STATE) {
    gaps.push(...summaryGaps);
    if (summaryGaps.length === 0) {
      gaps.push("projection_state is not ready");
    }
  }
  return validationSummary(gaps.length === 0, gaps);
}

function main() {
  const [, , inputPath] = process.argv;
  if (!inputPath) {
    throw new Error("Usage: run_ai_value_measurement_cell_snapshot_projection.mjs <snapshot.json>");
  }
  const input = JSON.parse(readFileSync(resolve(inputPath), "utf8"));
  const projection = buildMeasurementCellSnapshotProjectionFromObject(input);
  process.stdout.write(`${JSON.stringify(projection, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
