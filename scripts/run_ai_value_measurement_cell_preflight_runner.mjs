#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildAggregateConnectorBoundaryPlanFromObject,
  validateAggregateConnectorBoundaryPlan
} from "./run_ai_value_aggregate_connector_boundary_plan.mjs";
import {
  buildBigQueryAggregateExportReviewFromObject,
  validateBigQueryAggregateExportReview
} from "./run_ai_value_bigquery_aggregate_export_review.mjs";
import {
  runControlledAggregatePipelineDryRunFromObject,
  validateControlledAggregatePipelineDryRun
} from "./run_ai_value_controlled_aggregate_pipeline_dry_run.mjs";
import {
  buildControlledMeasurementCellAssemblyArtifactsFromObject,
  validateControlledMeasurementCellAssembly
} from "./run_ai_value_controlled_measurement_cell_assembly.mjs";

export const MEASUREMENT_CELL_PREFLIGHT_RUNNER_SCHEMA_VERSION =
  "FT_AI_VALUE_MEASUREMENT_CELL_PREFLIGHT_RUNNER_2026_06";

const DEFAULT_FIXTURE_PATH =
  "docs/contracts/ai-value-real-data-intake-packet-runner/examples/controlled-aggregate-fixture-review-ready.json";

const SNAPSHOT_CANDIDATE_SCHEMA_VERSION =
  "FT_AI_VALUE_MEASUREMENT_CELL_SNAPSHOT_CANDIDATE_2026_06";

const ALLOWED_SOURCE_SYSTEMS = new Set(["bigquery_export", "sigma_export"]);
const ALLOWED_MILESTONE_DAYS = new Set([0, 30, 60, 90, 180, 365]);
const DAY_MS = 24 * 60 * 60 * 1000;

const FALSE_FEEDS = [
  "live_bigquery_execution",
  "live_sigma_execution",
  "live_glean_query",
  "customer_connector_execution",
  "source_package_clearance",
  "measurement_cell_snapshot_persistence",
  "measurement_cell_series_persistence",
  "backend_route",
  "frontend_ui",
  "schema_creation",
  "customer_facing_output",
  "customer_facing_financial_output",
  "customer_facing_economic_output",
  "research_model_feed",
  "model_likelihood_output",
  "value_contribution_model_feed",
  "model_result_output",
  "financial_claim"
];

const TRUE_FEEDS = [
  "aggregate_export_review",
  "controlled_aggregate_pipeline_dry_run",
  "controlled_measurement_cell_assembly",
  "measurement_cell_snapshot_candidate_proof"
];

const BOUNDARY_FALSE_FIELDS = [
  "runs_bigquery",
  "runs_sigma",
  "runs_glean_query",
  "runs_customer_connectors",
  "persists_snapshot",
  "persists_pipeline_run",
  "creates_route",
  "creates_ui",
  "creates_schema",
  "creates_migration",
  "creates_repository",
  "writes_output_file",
  "emits_model_likelihood_output",
  "authorizes_value_contribution_model",
  "emits_model_result_output",
  "emits_outcome_proof_claim",
  "emits_workforce_efficiency_claim",
  "computes_financial_return",
  "emits_financial_output",
  "customer_facing_output",
  "customer_facing_economic_output"
];

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
  "measurement_cell_snapshot_persistence",
  "measurement_cell_series_persistence",
  "route_creation",
  "ui_creation",
  "schema_creation",
  "migration_creation",
  "repository_creation",
  "output_file_write",
  "customer_facing_output",
  "customer_facing_financial_output",
  "customer_facing_economic_output",
  "finance_context_investigation",
  "realized_roi",
  "ebitda_claim",
  "financial_attribution",
  "causality_claim",
  "productivity_claim",
  "probability_output",
  "score_like_output",
  "contribution_model_not_authorized",
  "research_model_not_promoted",
  "financial_claim_blocked"
];

const REQUIRED_CAVEATS = [
  "Measurement Cell preflight is an internal proof only.",
  "Snapshot candidate proof does not persist Measurement Cell snapshots.",
  "No live BigQuery, Sigma, Glean, or customer connector execution occurs.",
  "Preflight output is not customer-facing output, finance output, or value contribution modeling."
];

const ALLOWED_TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "preflight_id",
  "preflight_state",
  "source_system",
  "fixture_id",
  "engine_executed",
  "aggregate_export_review_ref",
  "pipeline_ref",
  "assembly_ref",
  "snapshot_candidate_ref",
  "validation_summary",
  "feeds",
  "boundary_policy",
  "blocked_uses",
  "required_caveats",
  "preflight_integrity_hash",
  "generated_at",
  "derivation_version"
]);

const ALLOWED_REVIEW_REF_FIELDS = new Set([
  "review_id",
  "review_state",
  "source_system",
  "source_owner_role",
  "execution_boundary",
  "source_export_ref",
  "aggregate_definition_ref",
  "aggregate_output_ref",
  "review_hash"
]);

const ALLOWED_PIPELINE_REF_FIELDS = new Set([
  "dry_run_id",
  "dry_run_state",
  "source_export_ref",
  "manifest_hash",
  "aggregate_fixture_hash",
  "reviewed_source_refs_hash",
  "reviewed_aggregate_context_hash",
  "reviewed_blueprint_expectation_hash",
  "candidate_integrity_hash"
]);

const ALLOWED_ASSEMBLY_REF_FIELDS = new Set([
  "assembly_run_id",
  "assembly_state",
  "assembly_decision",
  "measurement_cell_ref"
]);

const ALLOWED_SNAPSHOT_CANDIDATE_FIELDS = new Set([
  "snapshot_candidate_state",
  "snapshot_candidate_schema_version",
  "aggregate_boundary_ref",
  "measurement_cell_id",
  "measurement_cell_assembly_run_id",
  "measurement_plan_id",
  "value_hypothesis_ref",
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
  "source_refs",
  "snapshot_candidate_hash"
]);

const ALLOWED_AGGREGATE_BOUNDARY_REF_FIELDS = new Set([
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

const ALLOWED_SNAPSHOT_SOURCE_REF_FIELDS = new Set([
  "blueprint_source_ref",
  "ai_fluency_source_ref",
  "vbd_source_ref",
  "metric_source_ref",
  "token_source_ref"
]);

const ALLOWED_FEED_FIELDS = new Set([...TRUE_FEEDS, ...FALSE_FEEDS]);

const ALLOWED_BOUNDARY_POLICY_FIELDS = new Set(BOUNDARY_FALSE_FIELDS);

const ALLOWED_VALIDATION_SUMMARY_FIELDS = new Set([
  "valid",
  "aggregate_export_review_valid",
  "pipeline_dry_run_valid",
  "measurement_cell_assembly_valid",
  "snapshot_candidate_valid",
  "gaps"
]);

const FORBIDDEN_KEY_PATTERNS = [
  /^raw_rows?$/i,
  /^rows$/i,
  /^records$/i,
  /^events$/i,
  /query_text/i,
  /sql_text/i,
  /bigquery_sql/i,
  /sigma_query/i,
  /prompt/i,
  /response_text/i,
  /transcript/i,
  /user_id/i,
  /employee_id/i,
  /employee_email/i,
  /person_id/i,
  /^email$/i,
  /^measurement_plan$/i,
  /^data_spine_readiness$/i,
  /^source_package_review_queue$/i,
  /^real_data_intake_packet_run$/i,
  /^pilot_intake_run$/i,
  /^source_packages?$/i,
  /^blueprint_operator_source_handoff$/i,
  /^measurement_cell_input$/i,
  /^measurement_cell$/i,
  /^measurement_cell_series$/i,
  /child_payload/i,
  /full_payload/i,
  /assembly_payload/i,
  /source_package_payload/i,
  /handoff_bundle/i,
  /expectation_path_registry/i,
  /^payload_json$/i,
  /^validation_json$/i,
  /^source_refs_json$/i,
  /^blueprint_path_binding_json$/i,
  /confidence/i,
  /score/i,
  /(^|_)roi($|_)/i,
  /ebitda/i,
  /finance_context/i,
  /causality/i,
  /productivity/i,
  /probabilit/i
];

const FORBIDDEN_STRING_PATTERNS = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /https?:\/\//i,
  /\b(?:console\.cloud\.google|bigquery\.googleapis|sigma(?:computing)?\.com)\b/i,
  /(?:^|[_-])(?:bquxjob[a-z0-9]*|job[a-z0-9]*|jobs?|table[a-z0-9]*|table[_-]?ref|dataset[a-z0-9]*|dataset[_-]?ref|project[_-]?dataset[_-]?table)(?:[_-]|$)/i,
  /\bselect\s+.+\bfrom\b/i,
  /\braw\s+rows?\b/i,
  /\bquery\s+text\b/i,
  /\bsql\s+text\b/i,
  /\bprompt\s+text\b/i,
  /\btranscript\b/i,
  /(^|[^a-z0-9])(?:user|person|employee)[-_:](?:id[-_:])?[0-9][a-z0-9_-]*/i,
  /(?:user|person|employee)[_-]?(?:id|identifier)[a-z0-9_-]*/i,
  /(?:row|span|trace)[_-]?id[a-z0-9_-]*/i,
  /raw[_-]?rows?[a-z0-9_-]*/i,
  /query[_-]?text[a-z0-9_-]*/i,
  /sql[_-]?text[a-z0-9_-]*/i,
  /(?:prompt|response|transcript)[_-]?(?:text|content)[a-z0-9_-]*/i
];

const SAFE_COMPACT_SOURCE_REF_PATTERN = /^[a-z0-9][a-z0-9_-]{1,179}$/;

const FORBIDDEN_COMPACT_SOURCE_REF_VALUE_PATTERNS = [
  /https?:\/\//i,
  /\b(?:console\.cloud\.google|bigquery\.googleapis|sigma(?:computing)?\.com)\b/i,
  /(?:bquxjob|job|table|dataset|dashboard)[a-z0-9_-]*/i,
  /(?:user|person|employee)[_-]?(?:id|identifier)[a-z0-9_-]*/i,
  /(?:row|span|trace)[_-]?id[a-z0-9_-]*/i,
  /raw[_-]?rows?[a-z0-9_-]*/i,
  /query[_-]?text[a-z0-9_-]*/i,
  /sql[_-]?text[a-z0-9_-]*/i,
  /(?:prompt|response|transcript)[_-]?(?:text|content)[a-z0-9_-]*/i,
  /(?:^|[_-])select(?:[_-]|$)/i,
  /(?:^|[_-])raw[_-]?rows?(?:[_-]|$)/i,
  /(?:^|[_-])query[_-]?text(?:[_-]|$)/i,
  /(?:^|[_-])sql[_-]?text(?:[_-]|$)/i,
  /(?:^|[_-])(?:prompt|response|transcript)[_-]?(?:text|content)(?:[_-]|$)/i,
  /(?:^|[_-])(?:user|person)[_-]?id(?:[_-]|$)/i,
  /(?:^|[_-])employee[_-]?(?:id|email)(?:[_-]|$)/i,
  /(?:^|[_-])(?:bquxjob[a-z0-9]*|job[a-z0-9]*|jobs?|table[a-z0-9]*|table[_-]?ref|dataset[a-z0-9]*|dataset[_-]?ref|project[_-]?dataset[_-]?table|dashboard[a-z0-9]*)(?:[_-]|$)/i,
  /(?:^|[_-])(?:credential|secret|api[_-]?key|access[_-]?token|refresh[_-]?token)(?:[_-]|$)/i,
  /(?:^|[_-])(?:bigquery|sigma)[_-]?(?:job|url|dashboard|table|dataset|query)(?:[_-]|$)/i
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

function safeIdPart(value) {
  return String(value ?? "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function parseIsoDay(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const [year, month, day] = value.split("-").map((part) => Number(part));
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toISOString().slice(0, 10) === value ? date : null;
}

function utcDayMs(date) {
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  );
}

function titleCaseValueDriver(value) {
  const drivers = {
    revenue: "Revenue",
    cost: "Cost",
    capacity: "Capacity",
    quality: "Quality",
    risk: "Risk"
  };
  return drivers[String(value ?? "").toLowerCase()] ?? null;
}

function falseFeeds() {
  return Object.fromEntries(FALSE_FEEDS.map((feed) => [feed, false]));
}

function falseBoundaryPolicy() {
  return Object.fromEntries(BOUNDARY_FALSE_FIELDS.map((field) => [field, false]));
}

function stripPreflightIntegrityHash(preflight) {
  const clonePreflight = clone(preflight);
  delete clonePreflight.preflight_integrity_hash;
  return clonePreflight;
}

function compactBigQueryReviewRef(fixture, options = {}) {
  const review = buildBigQueryAggregateExportReviewFromObject(fixture, {
    measurementPlanOverride: options.measurementPlanOverride
  });
  const validation = validateBigQueryAggregateExportReview(review, {
    sourceFixture: fixture,
    measurementPlanOverride: options.measurementPlanOverride
  });
  const boundaryPlan = buildAggregateConnectorBoundaryPlanFromObject(fixture, {
    sourceSystem: "bigquery_export",
    measurementPlanOverride: options.measurementPlanOverride
  });
  const boundaryValidation = validateAggregateConnectorBoundaryPlan(boundaryPlan, {
    sourceFixture: fixture,
    measurementPlanOverride: options.measurementPlanOverride
  });
  if (!validation.valid || review.review_state !== "PASSED_BIGQUERY_AGGREGATE_EXPORT_REVIEW") {
    return {
      ref: {
        review_id: review.review_id ?? null,
        review_state: "BLOCKED",
        source_system: "bigquery_export",
        source_owner_role: review.source_owner_role ?? null,
        execution_boundary: review.execution_boundary ?? null,
        source_export_ref: null,
        aggregate_definition_ref: null,
        aggregate_output_ref: null,
        review_hash: null
      },
      valid: false,
      gaps: validation.gaps
    };
  }
  if (
    !boundaryValidation.valid ||
    boundaryPlan.boundary_plan_state !==
      "PASSED_AGGREGATE_CONNECTOR_BOUNDARY_PLAN_REVIEW"
  ) {
    return {
      ref: {
        review_id: review.review_id ?? null,
        review_state: "BLOCKED",
        source_system: "bigquery_export",
        source_owner_role: review.source_owner_role ?? null,
        execution_boundary: review.execution_boundary ?? null,
        source_export_ref: null,
        aggregate_definition_ref: null,
        aggregate_output_ref: null,
        review_hash: null
      },
      valid: false,
      gaps: boundaryValidation.gaps
    };
  }
  const ref = {
    review_id: review.review_id,
    review_state: review.review_state,
    source_system: "bigquery_export",
    source_owner_role: review.source_owner_role,
    execution_boundary: review.execution_boundary,
    source_export_ref:
      boundaryPlan.connector_adapter_ref?.connector_manifest_ref?.aggregate_export_ref ??
      null,
    aggregate_definition_ref: review.aggregate_definition_ref,
    aggregate_output_ref: review.aggregate_output_ref,
    review_hash: sha256Json({
      review_id: review.review_id,
      review_state: review.review_state,
      source_export_ref:
        boundaryPlan.connector_adapter_ref?.connector_manifest_ref?.aggregate_export_ref ??
        null,
      aggregate_definition_ref: review.aggregate_definition_ref,
      aggregate_output_ref: review.aggregate_output_ref
    })
  };
  return { ref, valid: true, gaps: [] };
}

function compactSigmaReviewRef(fixture, options = {}) {
  const boundaryPlan = buildAggregateConnectorBoundaryPlanFromObject(fixture, {
    sourceSystem: "sigma_export",
    measurementPlanOverride: options.measurementPlanOverride
  });
  const validation = validateAggregateConnectorBoundaryPlan(boundaryPlan, {
    sourceFixture: fixture,
    measurementPlanOverride: options.measurementPlanOverride
  });
  if (
    !validation.valid ||
    boundaryPlan.boundary_plan_state !==
      "PASSED_AGGREGATE_CONNECTOR_BOUNDARY_PLAN_REVIEW"
  ) {
    return {
      ref: {
        review_id: boundaryPlan.boundary_plan_id ?? null,
        review_state: "BLOCKED",
        source_system: "sigma_export",
        source_owner_role: boundaryPlan.source_owner_role ?? null,
        execution_boundary: boundaryPlan.execution_boundary ?? null,
        source_export_ref: null,
        aggregate_definition_ref: null,
        aggregate_output_ref: null,
        review_hash: null
      },
      valid: false,
      gaps: validation.gaps
    };
  }
  const ref = {
    review_id: boundaryPlan.boundary_plan_id,
    review_state: "PASSED_SIGMA_AGGREGATE_CONNECTOR_BOUNDARY_REVIEW",
    source_system: "sigma_export",
    source_owner_role: boundaryPlan.source_owner_role,
    execution_boundary: boundaryPlan.execution_boundary,
    source_export_ref:
      boundaryPlan.connector_adapter_ref?.connector_manifest_ref?.aggregate_export_ref ??
      null,
    aggregate_definition_ref: boundaryPlan.aggregate_definition_ref,
    aggregate_output_ref: boundaryPlan.aggregate_output_ref,
    review_hash: null
  };
  ref.review_hash = sha256Json({
    review_id: ref.review_id,
    review_state: ref.review_state,
    source_export_ref: ref.source_export_ref,
    aggregate_definition_ref: ref.aggregate_definition_ref,
    aggregate_output_ref: ref.aggregate_output_ref
  });
  return { ref, valid: true, gaps: [] };
}

function compactPipelineRef(dryRun) {
  return {
    dry_run_id: dryRun?.dry_run_id ?? null,
    dry_run_state: dryRun?.dry_run_state ?? null,
    source_export_ref: dryRun?.manifest_ref?.source_export_ref ?? null,
    manifest_hash: dryRun?.manifest_ref?.manifest_hash ?? null,
    aggregate_fixture_hash: dryRun?.manifest_ref?.aggregate_fixture_hash ?? null,
    reviewed_source_refs_hash: dryRun?.manifest_ref?.reviewed_source_refs_hash ?? null,
    reviewed_aggregate_context_hash:
      dryRun?.manifest_ref?.reviewed_aggregate_context_hash ?? null,
    reviewed_blueprint_expectation_hash:
      dryRun?.manifest_ref?.reviewed_blueprint_expectation_hash ?? null,
    candidate_integrity_hash: dryRun?.candidate_ref?.candidate_integrity_hash ?? null
  };
}

function compactAssemblyRef(candidate) {
  return {
    assembly_run_id: candidate?.assembly_ref?.assembly_run_id ?? null,
    assembly_state: candidate?.assembly_state ?? null,
    assembly_decision: candidate?.assembly_ref?.assembly_decision ?? null,
    measurement_cell_ref: candidate?.assembly_ref?.measurement_cell_ref ?? null
  };
}

function stableMetricDefinitionHash(metric) {
  return sha256Json({
    metric_id: metric?.metric_id,
    metric_name: metric?.metric_name,
    metric_source_system: metric?.metric_source_system,
    metric_unit: metric?.metric_unit,
    metric_direction: metric?.metric_direction,
    owner_approval_state: metric?.owner_approval_state,
    source_ref: metric?.source_ref
  });
}

function compactMeasurementCellSourceRefs(sourceRefs) {
  return Object.fromEntries(
    [...ALLOWED_SNAPSHOT_SOURCE_REF_FIELDS].map((key) => [
      key,
      sourceRefs?.[key] ?? null
    ])
  );
}

function compactSnapshotBindingForBoundary(candidate) {
  return {
    measurement_cell_id: candidate.measurement_cell_id,
    measurement_cell_assembly_run_id: candidate.measurement_cell_assembly_run_id,
    measurement_plan_id: candidate.measurement_plan_id,
    expectation_path_id: candidate.expectation_path_id,
    metric_id: candidate.metric_id,
    workflow_family: candidate.workflow_family,
    workflow_id: candidate.workflow_id,
    function_area: candidate.function_area,
    cohort_key: candidate.cohort_key,
    window_mode: candidate.window_mode,
    milestone_day: candidate.milestone_day,
    baseline_window_start: candidate.baseline_window_start,
    baseline_window_end: candidate.baseline_window_end,
    comparison_window_start: candidate.comparison_window_start,
    comparison_window_end: candidate.comparison_window_end,
    source_refs: candidate.source_refs
  };
}

function compactAggregateBoundaryRef(aggregateReviewRef, dryRun, snapshotBinding) {
  const boundary = {
    source_system: aggregateReviewRef?.source_system ?? null,
    review_id: aggregateReviewRef?.review_id ?? null,
    review_state: aggregateReviewRef?.review_state ?? null,
    source_export_ref: aggregateReviewRef?.source_export_ref ?? null,
    aggregate_definition_ref: aggregateReviewRef?.aggregate_definition_ref ?? null,
    aggregate_output_ref: aggregateReviewRef?.aggregate_output_ref ?? null,
    review_hash: aggregateReviewRef?.review_hash ?? null,
    pipeline_dry_run_id: dryRun?.dry_run_id ?? null,
    pipeline_source_export_ref: dryRun?.manifest_ref?.source_export_ref ?? null
  };
  return {
    ...boundary,
    pipeline_boundary_hash: sha256Json({
      schema_version: "FT_AI_VALUE_MEASUREMENT_CELL_PIPELINE_BOUNDARY_HASH_2026_06",
      aggregate_boundary: boundary,
      snapshot_binding: snapshotBinding
    })
  };
}

function collectSnapshotCandidateMilestoneWindowGaps(candidate) {
  if (!candidate || candidate.window_mode !== "milestone") return [];
  const gaps = [];
  const milestoneDay = Number(candidate.milestone_day);
  if (!Number.isInteger(milestoneDay)) {
    gaps.push("milestone_day is required for milestone snapshot candidate proof");
  } else if (!ALLOWED_MILESTONE_DAYS.has(milestoneDay)) {
    gaps.push("milestone_day must be one of Day 0, 30, 60, 90, 180, or 365");
  }

  const baselineWindowEnd = parseIsoDay(candidate.baseline_window_end);
  const comparisonWindowStart = parseIsoDay(candidate.comparison_window_start);
  const comparisonWindowEnd = parseIsoDay(candidate.comparison_window_end);
  if (!baselineWindowEnd) {
    gaps.push("baseline_window_end must be a valid ISO date");
  }
  if (!comparisonWindowStart) {
    gaps.push("comparison_window_start must be a valid ISO date");
  }
  if (!comparisonWindowEnd) {
    gaps.push("comparison_window_end must be a valid ISO date");
  }
  if (!baselineWindowEnd || !comparisonWindowStart || !comparisonWindowEnd) {
    return gaps;
  }

  const launchWindowStartMs = utcDayMs(baselineWindowEnd) + DAY_MS;
  const comparisonStartMs = utcDayMs(comparisonWindowStart);
  const comparisonEndMs = utcDayMs(comparisonWindowEnd);
  const derivedMilestoneDay = (comparisonStartMs - launchWindowStartMs) / DAY_MS;
  const comparisonWindowDays = (comparisonEndMs - comparisonStartMs) / DAY_MS + 1;

  if (!Number.isInteger(derivedMilestoneDay)) {
    gaps.push("milestone_day must derive cleanly from baseline and comparison windows");
  } else if (Number.isInteger(milestoneDay) && derivedMilestoneDay !== milestoneDay) {
    gaps.push("milestone_day must match the derived comparison-window offset");
  }
  if (comparisonWindowDays !== 30) {
    gaps.push("comparison window day count must be 30 for snapshot candidate proof");
  }
  return gaps;
}

function buildSnapshotCandidateRef(assemblyRun, aggregateReviewRef, dryRun) {
  if (
    assemblyRun?.decision !== "READY_FOR_VALUE_HYPOTHESIS_PACKET_RUNNER" ||
    !assemblyRun?.measurement_cell
  ) {
    return null;
  }
  const cell = assemblyRun.measurement_cell;
  const alignment = cell.blueprint_alignment ?? {};
  const selectedPath = alignment.approved_expectation_path ?? {};
  const metric = cell.selected_metric ?? {};
  const timeWindow = cell.time_window ?? {};
  const baselineWindow = timeWindow.baseline_window ?? {};
  const comparisonWindow = timeWindow.comparison_window ?? {};
  const handoffContext =
    assemblyRun.blueprint_operator_source_handoff?.blueprint_alignment_context ??
    {};
  const candidate = {
    snapshot_candidate_state: "READY_FOR_MEASUREMENT_CELL_SNAPSHOT_PERSISTENCE_REVIEW",
    snapshot_candidate_schema_version: SNAPSHOT_CANDIDATE_SCHEMA_VERSION,
    measurement_cell_id: cell.measurement_cell_id,
    measurement_cell_assembly_run_id: assemblyRun.run_id,
    measurement_plan_id: assemblyRun.measurement_plan_id,
    value_hypothesis_ref:
      assemblyRun.measurement_plan?.value_hypothesis?.value_hypothesis_id ??
      assemblyRun.measurement_plan?.value_hypothesis?.value_hypothesis_ref ??
      null,
    approved_blueprint_ref: alignment.source_ref,
    approved_blueprint_payload_hash: sha256Json(handoffContext),
    blueprint_expectation_ref: alignment.blueprint_expectation_ref,
    expectation_path_id: alignment.expectation_path_id,
    expectation_path_version: selectedPath.expectation_path_version ?? 1,
    expectation_path_hash: sha256Json(selectedPath),
    approval_state: alignment.blueprint_customer_approval_state,
    approved_at: selectedPath.approved_at ?? alignment.blueprint_customer_approved_at,
    approved_by_role:
      alignment.blueprint_customer_approver_role ?? selectedPath.approver_role,
    value_driver: titleCaseValueDriver(selectedPath.value_driver ?? alignment.value_driver),
    metric_id: metric.metric_id,
    metric_definition_ref: metric.source_ref,
    metric_definition_hash: stableMetricDefinitionHash(metric),
    metric_owner_approval_state: metric.owner_approval_state,
    metric_direction: metric.metric_direction,
    metric_unit: metric.metric_unit,
    expected_metric_lag_days: Number(metric.expected_lag_days),
    workflow_family: cell.workflow_family,
    workflow_id: cell.workflow_id ?? null,
    function_area: cell.function_area,
    cohort_key: cell.cohort_key,
    window_mode: timeWindow.window_mode,
    milestone_day: Number(timeWindow.days_since_launch),
    baseline_window_start: baselineWindow.window_start,
    baseline_window_end: baselineWindow.window_end,
    comparison_window_start: comparisonWindow.window_start,
    comparison_window_end: comparisonWindow.window_end,
    source_refs: compactMeasurementCellSourceRefs(cell.source_refs)
  };
  candidate.aggregate_boundary_ref = compactAggregateBoundaryRef(
    aggregateReviewRef,
    dryRun,
    compactSnapshotBindingForBoundary(candidate)
  );
  return {
    ...candidate,
    snapshot_candidate_hash: sha256Json(candidate)
  };
}

function compactValidationSummary({
  reviewValid,
  dryRunValidation,
  assemblyValidation,
  snapshotCandidateRef,
  extraGaps = []
}) {
  const snapshotCandidateValid = Boolean(snapshotCandidateRef);
  const gaps = [
    ...extraGaps,
    ...(dryRunValidation?.gaps ?? []).map((gap) => `pipeline: ${gap}`),
    ...(assemblyValidation?.gaps ?? []).map((gap) => `assembly: ${gap}`)
  ];
  return {
    valid:
      reviewValid === true &&
      dryRunValidation?.valid === true &&
      assemblyValidation?.valid === true &&
      snapshotCandidateValid &&
      gaps.length === 0,
    aggregate_export_review_valid: reviewValid === true,
    pipeline_dry_run_valid: dryRunValidation?.valid === true,
    measurement_cell_assembly_valid: assemblyValidation?.valid === true,
    snapshot_candidate_valid: snapshotCandidateValid,
    gaps
  };
}

function buildEnvelope({
  fixture,
  sourceSystem,
  preflightState,
  engineExecuted,
  aggregateReviewRef,
  dryRun,
  candidate,
  snapshotCandidateRef,
  validationSummary
}) {
  const passed = preflightState === "PASSED_INTERNAL_MEASUREMENT_CELL_PREFLIGHT";
  const envelope = {
    schema_version: MEASUREMENT_CELL_PREFLIGHT_RUNNER_SCHEMA_VERSION,
    preflight_id: `measurement_cell_preflight_${safeIdPart(sourceSystem)}_${safeIdPart(fixture?.fixture_id)}`,
    preflight_state: preflightState,
    source_system: passed || ALLOWED_SOURCE_SYSTEMS.has(sourceSystem) ? sourceSystem : null,
    fixture_id: fixture?.fixture_id ?? null,
    engine_executed: engineExecuted,
    aggregate_export_review_ref: aggregateReviewRef,
    pipeline_ref: compactPipelineRef(dryRun),
    assembly_ref: compactAssemblyRef(candidate),
    snapshot_candidate_ref: snapshotCandidateRef,
    validation_summary: validationSummary,
    feeds: {
      aggregate_export_review: passed,
      controlled_aggregate_pipeline_dry_run: passed,
      controlled_measurement_cell_assembly: passed,
      measurement_cell_snapshot_candidate_proof: passed,
      ...falseFeeds()
    },
    boundary_policy: falseBoundaryPolicy(),
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    required_caveats: [...REQUIRED_CAVEATS],
    preflight_integrity_hash: null,
    generated_at: fixture?.generated_at ?? new Date(0).toISOString(),
    derivation_version: "ai_value_measurement_cell_preflight_runner_2026_06"
  };
  envelope.preflight_integrity_hash = sha256Json(stripPreflightIntegrityHash(envelope));
  return envelope;
}

export function runMeasurementCellPreflightFromObject(sourceFixture, options = {}) {
  const fixture = clone(sourceFixture);
  const sourceSystem = options.sourceSystem ?? "bigquery_export";
  if (!ALLOWED_SOURCE_SYSTEMS.has(sourceSystem)) {
    const validationSummary = compactValidationSummary({
      reviewValid: false,
      dryRunValidation: { valid: false, gaps: ["source_system is unsupported"] },
      assemblyValidation: { valid: false, gaps: [] },
      snapshotCandidateRef: null
    });
    return buildEnvelope({
      fixture,
      sourceSystem,
      preflightState: "BLOCKED",
      engineExecuted: false,
      aggregateReviewRef: {
        review_id: null,
        review_state: "BLOCKED",
        source_system: null,
        source_owner_role: null,
        execution_boundary: null,
        aggregate_definition_ref: null,
        aggregate_output_ref: null,
        review_hash: null
      },
      dryRun: null,
      candidate: null,
      snapshotCandidateRef: null,
      validationSummary
    });
  }
  const aggregateReview = sourceSystem === "bigquery_export"
    ? compactBigQueryReviewRef(fixture, {
        measurementPlanOverride: options.measurementPlanOverride
      })
    : compactSigmaReviewRef(fixture, {
        measurementPlanOverride: options.measurementPlanOverride
      });
  const dryRun = runControlledAggregatePipelineDryRunFromObject(fixture, {
    sourceSystem,
    manifestOverrides: options.manifestOverrides,
    measurementPlanOverride: options.measurementPlanOverride
  });
  const dryRunValidation = validateControlledAggregatePipelineDryRun(dryRun, {
    sourceFixture: fixture,
    measurementPlanOverride: options.measurementPlanOverride
  });

  if (
    !aggregateReview.valid ||
    !dryRunValidation.valid ||
    dryRun.dry_run_state === "BLOCKED"
  ) {
    const heldForAggregateReview =
      typeof dryRun?.dry_run_state === "string" &&
      dryRun.dry_run_state.startsWith("HELD_");
    const heldArtifacts = heldForAggregateReview
      ? buildControlledMeasurementCellAssemblyArtifactsFromObject(fixture, {
          cwd: options.cwd ?? process.cwd(),
          measurementPlanOverride: options.measurementPlanOverride
        })
      : null;
    const validationSummary = compactValidationSummary({
      reviewValid: aggregateReview.valid,
      dryRunValidation,
      assemblyValidation: { valid: false, gaps: [] },
      snapshotCandidateRef: null,
      extraGaps: [
        ...aggregateReview.gaps.map((gap) => `aggregate_review: ${gap}`),
        ...(dryRun?.validation_summary?.gaps ?? []).map(
          (gap) => `pipeline_dry_run: ${gap}`
        ),
        ...(heldArtifacts?.candidate?.validation_summary?.gaps ?? []).map(
          (gap) => `controlled_aggregate_review: ${gap}`
        )
      ]
    });
    return buildEnvelope({
      fixture,
      sourceSystem,
      preflightState: heldForAggregateReview
        ? "HELD_FOR_CONTROLLED_AGGREGATE_REVIEW"
        : "BLOCKED",
      engineExecuted: false,
      aggregateReviewRef: aggregateReview.ref,
      dryRun,
      candidate: heldArtifacts?.candidate ?? null,
      snapshotCandidateRef: null,
      validationSummary
    });
  }

  if (dryRun.dry_run_state !== "PASSED_INTERNAL_PIPELINE_DRY_RUN_REVIEW") {
    const validationSummary = compactValidationSummary({
      reviewValid: aggregateReview.valid,
      dryRunValidation,
      assemblyValidation: { valid: false, gaps: [] },
      snapshotCandidateRef: null
    });
    return buildEnvelope({
      fixture,
      sourceSystem,
      preflightState: "HELD_FOR_CONTROLLED_AGGREGATE_REVIEW",
      engineExecuted: false,
      aggregateReviewRef: aggregateReview.ref,
      dryRun,
      candidate: null,
      snapshotCandidateRef: null,
      validationSummary
    });
  }

  const artifacts = buildControlledMeasurementCellAssemblyArtifactsFromObject(fixture, {
    cwd: options.cwd ?? process.cwd(),
    measurementPlanOverride: options.measurementPlanOverride
  });
  const assemblyValidation = validateControlledMeasurementCellAssembly(
    artifacts.candidate,
    {
      sourceFixture: fixture,
      cwd: options.cwd ?? process.cwd(),
      measurementPlanOverride: options.measurementPlanOverride
    }
  );
  const snapshotCandidateRef = buildSnapshotCandidateRef(
    artifacts.assemblyRun,
    aggregateReview.ref,
    dryRun
  );
  const snapshotCandidateGaps = collectSnapshotCandidateMilestoneWindowGaps(
    snapshotCandidateRef
  );
  const validSnapshotCandidateRef =
    snapshotCandidateGaps.length === 0 ? snapshotCandidateRef : null;
  const passed =
    assemblyValidation.valid &&
    artifacts.candidate?.assembly_state ===
      "PASSED_INTERNAL_MEASUREMENT_CELL_CANDIDATE_REVIEW" &&
    validSnapshotCandidateRef;
  const validationSummary = compactValidationSummary({
    reviewValid: aggregateReview.valid,
    dryRunValidation,
    assemblyValidation,
    snapshotCandidateRef: validSnapshotCandidateRef,
    extraGaps: snapshotCandidateGaps.map(
      (gap) => `snapshot_candidate_ref: ${gap}`
    )
  });
  return buildEnvelope({
    fixture,
    sourceSystem,
    preflightState: passed
      ? "PASSED_INTERNAL_MEASUREMENT_CELL_PREFLIGHT"
      : "HELD_FOR_MEASUREMENT_CELL_ASSEMBLY",
    engineExecuted: true,
    aggregateReviewRef: aggregateReview.ref,
    dryRun,
    candidate: artifacts.candidate,
    snapshotCandidateRef: validSnapshotCandidateRef,
    validationSummary
  });
}

function collectUnsupportedKeys(value, allowed, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [`${label} must be an object`];
  }
  return Object.keys(value)
    .filter((key) => !allowed.has(key))
    .map((key) => `${label}.${key} is not allowed`);
}

function collectForbiddenKeys(value, path = "") {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      collectForbiddenKeys(entry, `${path}[${index}]`)
    );
  }
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, nested]) => {
    const nestedPath = path ? `${path}.${key}` : key;
    const ownGap = FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key))
      ? [`${nestedPath} is not allowed`]
      : [];
    return [...ownGap, ...collectForbiddenKeys(nested, nestedPath)];
  });
}

function collectUnsafeStrings(value, path = "") {
  if (typeof value === "string") {
    const posturePath =
      /(^|\.)(blocked_uses|required_caveats|feeds|boundary_policy)(\.|\[|$)/.test(
        path
      );
    if (posturePath) return [];
    return FORBIDDEN_STRING_PATTERNS.some((pattern) => pattern.test(value))
      ? [`${path || "<root>"} contains unsafe text`]
      : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      collectUnsafeStrings(entry, `${path}[${index}]`)
    );
  }
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, nested]) =>
    collectUnsafeStrings(nested, path ? `${path}.${key}` : key)
  );
}

function collectUnsafeSnapshotSourceRefs(sourceRefs) {
  if (!sourceRefs || typeof sourceRefs !== "object" || Array.isArray(sourceRefs)) {
    return ["snapshot_candidate_ref.source_refs must be an object"];
  }
  const gaps = [];
  for (const key of ALLOWED_SNAPSHOT_SOURCE_REF_FIELDS) {
    if (sourceRefs[key] === undefined || sourceRefs[key] === null) {
      gaps.push(`snapshot_candidate_ref.source_refs.${key} is required`);
    }
  }
  return [
    ...gaps,
    ...Object.entries(sourceRefs).flatMap(([key, value]) => {
      if (
        typeof value !== "string" ||
        !SAFE_COMPACT_SOURCE_REF_PATTERN.test(value)
      ) {
        return [`snapshot_candidate_ref.source_refs.${key} must be safe compact metadata`];
      }
      if (
        FORBIDDEN_COMPACT_SOURCE_REF_VALUE_PATTERNS.some((pattern) =>
          pattern.test(value)
        )
      ) {
        return [`snapshot_candidate_ref.source_refs.${key} contains unsafe text`];
      }
      if (value === key) {
        return [`snapshot_candidate_ref.source_refs.${key} must carry a reviewed source ref, not the source-ref key name`];
      }
      return [];
    })
  ];
}

function collectUnsafeAggregateBoundaryRef(boundaryRef) {
  if (!boundaryRef || typeof boundaryRef !== "object" || Array.isArray(boundaryRef)) {
    return ["snapshot_candidate_ref.aggregate_boundary_ref must be an object"];
  }
  const gaps = [];
  const sourceSystem = boundaryRef.source_system;
  const reviewState = boundaryRef.review_state;
  if (!ALLOWED_SOURCE_SYSTEMS.has(sourceSystem)) {
    gaps.push("snapshot_candidate_ref.aggregate_boundary_ref.source_system is unsupported");
  }
  if (
    (sourceSystem === "bigquery_export" &&
      reviewState !== "PASSED_BIGQUERY_AGGREGATE_EXPORT_REVIEW") ||
    (sourceSystem === "sigma_export" &&
      reviewState !== "PASSED_SIGMA_AGGREGATE_CONNECTOR_BOUNDARY_REVIEW")
  ) {
    gaps.push("snapshot_candidate_ref.aggregate_boundary_ref.review_state must be passed for the source system");
  }
  if (
    boundaryRef.source_export_ref !== boundaryRef.pipeline_source_export_ref
  ) {
    gaps.push("snapshot_candidate_ref.aggregate_boundary_ref.source_export_ref must match pipeline_source_export_ref");
  }
  for (const field of [
    "review_id",
    "source_export_ref",
    "aggregate_definition_ref",
    "aggregate_output_ref",
    "pipeline_dry_run_id"
  ]) {
    const value = boundaryRef[field];
    if (
      typeof value !== "string" ||
      !SAFE_COMPACT_SOURCE_REF_PATTERN.test(value) ||
      FORBIDDEN_COMPACT_SOURCE_REF_VALUE_PATTERNS.some((pattern) =>
        pattern.test(value)
      )
    ) {
      gaps.push(`snapshot_candidate_ref.aggregate_boundary_ref.${field} must be safe compact metadata`);
    }
  }
  for (const field of [
    "review_hash",
    "pipeline_boundary_hash"
  ]) {
    if (
      typeof boundaryRef[field] !== "string" ||
      !/^[a-f0-9]{64}$/.test(boundaryRef[field])
    ) {
      gaps.push(`snapshot_candidate_ref.aggregate_boundary_ref.${field} must be a sha256 hash`);
    }
  }
  return gaps;
}

function compareField(gaps, label, expected, actual) {
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    gaps.push(`${label} must match fixture-bound preflight output`);
  }
}

function collectExactObjectGaps(actual, expected, label) {
  const gaps = [];
  if (!actual || typeof actual !== "object" || Array.isArray(actual)) {
    return [`${label} must be an object`];
  }
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
    gaps.push(`${label} keys must match the governed preflight contract`);
  }
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (actual[field] !== expectedValue) {
      gaps.push(`${label}.${field} must match the governed preflight contract`);
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
    return [`${label} must match the governed preflight contract exactly`];
  }
  return [];
}

export function validateMeasurementCellPreflight(preflight, options = {}) {
  const gaps = [
    ...collectUnsupportedKeys(preflight, ALLOWED_TOP_LEVEL_FIELDS, "preflight"),
    ...collectUnsupportedKeys(
      preflight?.aggregate_export_review_ref,
      ALLOWED_REVIEW_REF_FIELDS,
      "aggregate_export_review_ref"
    ),
    ...collectUnsupportedKeys(preflight?.pipeline_ref, ALLOWED_PIPELINE_REF_FIELDS, "pipeline_ref"),
    ...collectUnsupportedKeys(preflight?.assembly_ref, ALLOWED_ASSEMBLY_REF_FIELDS, "assembly_ref"),
    ...collectUnsupportedKeys(preflight?.validation_summary, ALLOWED_VALIDATION_SUMMARY_FIELDS, "validation_summary"),
    ...collectUnsupportedKeys(preflight?.feeds, ALLOWED_FEED_FIELDS, "feeds"),
    ...collectUnsupportedKeys(preflight?.boundary_policy, ALLOWED_BOUNDARY_POLICY_FIELDS, "boundary_policy"),
    ...(preflight?.snapshot_candidate_ref
      ? collectUnsupportedKeys(
          preflight.snapshot_candidate_ref,
          ALLOWED_SNAPSHOT_CANDIDATE_FIELDS,
          "snapshot_candidate_ref"
        )
      : []),
    ...(preflight?.snapshot_candidate_ref?.source_refs
      ? collectUnsupportedKeys(
          preflight.snapshot_candidate_ref.source_refs,
          ALLOWED_SNAPSHOT_SOURCE_REF_FIELDS,
          "snapshot_candidate_ref.source_refs"
        )
      : []),
    ...(preflight?.snapshot_candidate_ref?.aggregate_boundary_ref
      ? collectUnsupportedKeys(
          preflight.snapshot_candidate_ref.aggregate_boundary_ref,
          ALLOWED_AGGREGATE_BOUNDARY_REF_FIELDS,
          "snapshot_candidate_ref.aggregate_boundary_ref"
        )
      : ["snapshot_candidate_ref.aggregate_boundary_ref is required"]),
    ...collectUnsafeAggregateBoundaryRef(
      preflight?.snapshot_candidate_ref?.aggregate_boundary_ref
    ),
    ...(preflight?.snapshot_candidate_ref
      ? collectSnapshotCandidateMilestoneWindowGaps(preflight.snapshot_candidate_ref).map(
          (gap) => `snapshot_candidate_ref.${gap}`
        )
      : []),
    ...(preflight?.snapshot_candidate_ref
      ? collectUnsafeSnapshotSourceRefs(preflight.snapshot_candidate_ref.source_refs)
      : []),
    ...collectExactArrayGap(preflight?.blocked_uses, REQUIRED_BLOCKED_USES, "blocked_uses"),
    ...collectExactArrayGap(preflight?.required_caveats, REQUIRED_CAVEATS, "required_caveats"),
    ...collectExactObjectGaps(
      preflight?.boundary_policy,
      falseBoundaryPolicy(),
      "boundary_policy"
    ),
    ...collectForbiddenKeys(preflight),
    ...collectUnsafeStrings(preflight)
  ];

  for (const feed of FALSE_FEEDS) {
    if (preflight?.feeds?.[feed] !== false) {
      gaps.push(`feeds.${feed} must remain false`);
    }
  }
  for (const field of BOUNDARY_FALSE_FIELDS) {
    if (preflight?.boundary_policy?.[field] !== false) {
      gaps.push(`boundary_policy.${field} must remain false`);
    }
  }
  if (
    preflight?.preflight_state === "PASSED_INTERNAL_MEASUREMENT_CELL_PREFLIGHT" &&
    (!preflight?.aggregate_export_review_ref?.source_export_ref ||
      preflight.aggregate_export_review_ref.source_export_ref !==
        preflight?.pipeline_ref?.source_export_ref)
  ) {
    gaps.push("aggregate_export_review_ref.source_export_ref must match pipeline_ref.source_export_ref");
  }
  if (
    preflight?.preflight_state === "PASSED_INTERNAL_MEASUREMENT_CELL_PREFLIGHT" &&
    preflight?.snapshot_candidate_ref?.aggregate_boundary_ref
  ) {
    const boundaryRef = preflight.snapshot_candidate_ref.aggregate_boundary_ref;
    if (
      boundaryRef.source_export_ref !==
        preflight.aggregate_export_review_ref.source_export_ref ||
      boundaryRef.source_export_ref !== preflight.pipeline_ref.source_export_ref
    ) {
      gaps.push("snapshot_candidate_ref.aggregate_boundary_ref.source_export_ref must match aggregate review and pipeline refs");
    }
  }

  const recomputedHash = sha256Json(stripPreflightIntegrityHash(preflight));
  if (preflight?.preflight_integrity_hash !== recomputedHash) {
    gaps.push("preflight_integrity_hash must match compact preflight envelope");
  }

  const passed =
    preflight?.preflight_state === "PASSED_INTERNAL_MEASUREMENT_CELL_PREFLIGHT";
  const skipFixtureRerun = options.skipFixtureRerun === true;
  if (passed && !options.sourceFixture && !skipFixtureRerun) {
    gaps.push("sourceFixture is required to validate passed preflight envelopes");
  }
  if (passed) {
    for (const feed of [
      "aggregate_export_review",
      "controlled_aggregate_pipeline_dry_run",
      "controlled_measurement_cell_assembly",
      "measurement_cell_snapshot_candidate_proof"
    ]) {
      if (preflight?.feeds?.[feed] !== true) {
        gaps.push(`feeds.${feed} must be true for passed preflight`);
      }
    }
  }
  if (!passed) {
    gaps.push("preflight_state must be PASSED_INTERNAL_MEASUREMENT_CELL_PREFLIGHT");
  }

  if (passed && options.sourceFixture && !skipFixtureRerun) {
    const expected = runMeasurementCellPreflightFromObject(options.sourceFixture, {
      sourceSystem: options.sourceSystem ?? preflight.source_system,
      cwd: options.cwd ?? process.cwd(),
      measurementPlanOverride: options.measurementPlanOverride
    });
    compareField(
      gaps,
      "snapshot_candidate_ref.metric_id",
      expected.snapshot_candidate_ref?.metric_id,
      preflight.snapshot_candidate_ref?.metric_id
    );
    compareField(
      gaps,
      "snapshot_candidate_ref.snapshot_candidate_hash",
      expected.snapshot_candidate_ref?.snapshot_candidate_hash,
      preflight.snapshot_candidate_ref?.snapshot_candidate_hash
    );
    compareField(
      gaps,
      "snapshot_candidate_ref.source_refs",
      expected.snapshot_candidate_ref?.source_refs,
      preflight.snapshot_candidate_ref?.source_refs
    );
    compareField(
      gaps,
      "snapshot_candidate_ref.aggregate_boundary_ref",
      expected.snapshot_candidate_ref?.aggregate_boundary_ref,
      preflight.snapshot_candidate_ref?.aggregate_boundary_ref
    );
    compareField(
      gaps,
      "preflight_integrity_hash",
      expected.preflight_integrity_hash,
      preflight.preflight_integrity_hash
    );
    if (JSON.stringify(preflight) !== JSON.stringify(expected)) {
      gaps.push("passed preflight must match fixture-bound rerun");
    }
  }

  return {
    schema_version: `${MEASUREMENT_CELL_PREFLIGHT_RUNNER_SCHEMA_VERSION}_VALIDATION`,
    valid: gaps.length === 0,
    gaps
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
  const fixture = readJson(resolve(process.cwd(), fixturePath));
  const preflight = runMeasurementCellPreflightFromObject(fixture, {
    sourceSystem,
    cwd: process.cwd()
  });
  const validation = validateMeasurementCellPreflight(preflight, {
    sourceFixture: fixture,
    sourceSystem,
    cwd: process.cwd()
  });
  process.stdout.write(`${JSON.stringify(preflight, null, 2)}\n`);
  if (!validation.valid) {
    process.exitCode = 1;
  }
}
