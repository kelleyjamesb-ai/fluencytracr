#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  runControlledRepeatedPilotEvidencePackageFromObject,
  validateControlledRepeatedPilotEvidencePackage
} from "./run_ai_value_controlled_pilot_evidence_package.mjs";

export const RESEARCH_PROMOTION_READINESS_PACKET_SCHEMA_VERSION =
  "FT_AI_VALUE_RESEARCH_PROMOTION_READINESS_PACKET_2026_06";

const DERIVATION_VERSION =
  "ai_value_research_promotion_readiness_packet_2026_06";

const FIXTURE_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTROLLED_AGGREGATE_FIXTURE_2026_06";

const READY_DECISION = "READY_FOR_INTERNAL_RESEARCH_DESIGN";
const HOLD_REPEATED_DECISION = "HOLD_FOR_REPEATED_ALIGNED_EVIDENCE";
const HOLD_SOURCE_OR_PATH_DRIFT_DECISION = "HOLD_FOR_SOURCE_OR_PATH_DRIFT";
const HOLD_GOVERNANCE_REVIEW_DECISION = "HOLD_FOR_GOVERNANCE_REVIEW";
const REJECT_BOUNDARY_LEAKAGE_DECISION = "REJECT_FOR_BOUNDARY_LEAKAGE";

const ALLOWED_DECISIONS = new Set([
  READY_DECISION,
  HOLD_REPEATED_DECISION,
  HOLD_SOURCE_OR_PATH_DRIFT_DECISION,
  HOLD_GOVERNANCE_REVIEW_DECISION,
  REJECT_BOUNDARY_LEAKAGE_DECISION
]);

const REQUIRED_MILESTONE_DAYS = [0, 30, 60, 90, 180, 365];

const GOVERNED_VALUE_DRIVERS = new Map([
  ["revenue", "Revenue"],
  ["cost", "Cost"],
  ["capacity", "Capacity"],
  ["quality", "Quality"],
  ["risk", "Risk"]
]);

const INTERNAL_REVIEW_ROLES = new Set([
  "governance_operator",
  "value_research_owner",
  "internal_operator",
  "ai_value_product_owner"
]);

const APPROVAL_ROLES = new Set([
  "workflow_owner",
  "business_owner",
  "customer_metric_owner",
  "customer_data_platform_owner",
  "customer_research_owner",
  "finance_or_business_owner",
  "customer_governance_owner",
  "executive_sponsor"
]);

const METRIC_DIRECTIONS = new Set(["increase", "decrease", "maintain", "no_change"]);
const EXPECTED_BEHAVIORS = new Set([
  "knowledge_retrieval",
  "reuse",
  "delegation",
  "verification"
]);
const VBD_SIGNALS = new Set(["velocity", "breadth", "depth"]);

const FALSE_FEEDS = [
  "research_model_feed",
  "model_output",
  "numeric_weight_output",
  "probability_output",
  "score_like_output",
  "finance_output",
  "finance_context_investigation",
  "customer_facing_output",
  "customer_facing_export",
  "live_connector_execution",
  "route_creation",
  "ui_creation",
  "schema_creation",
  "persistence_write"
];

const FEED_FIELDS = new Set(["internal_research_design_review", ...FALSE_FEEDS]);

const POLICY_FIELDS = [
  "model_implementation_authorized",
  "statistical_model_selection_authorized",
  "numeric_weights_authorized",
  "durable_research_inputs_authorized",
  "model_outputs_authorized",
  "finance_context_investigation_authorized",
  "customer_facing_output_authorized",
  "customer_facing_export_authorized",
  "live_connector_execution_authorized",
  "route_creation_authorized",
  "ui_creation_authorized",
  "schema_creation_authorized",
  "persistence_write_authorized"
];

const POLICY_FIELD_SET = new Set(POLICY_FIELDS);

const REQUIRED_BLOCKED_USES = [
  "model_implementation",
  "statistical_model_selection",
  "numeric_weights",
  "durable_research_inputs",
  "model_output",
  "contribution_model_output",
  "probability_output",
  "score_like_output",
  "finance_output",
  "roi",
  "ebitda",
  "financial_attribution",
  "causality_proof",
  "productivity_measurement",
  "individual_or_group_ranking",
  "customer_facing_readout",
  "customer_facing_export",
  "rendered_customer_packet",
  "live_connector_execution",
  "raw_data_storage"
];

const REQUIRED_CAVEATS = [
  "Current controlled pilot packets recompute milestone refs from a saved scrubbed aggregate fixture; they are not live customer evidence or independently reviewed six-window pilot evidence.",
  "Ready only authorizes internal research design drafting; it does not authorize model implementation, numeric weights, finance output, or customer-facing output.",
  "The packet carries compact refs and hashes only; it does not carry raw rows, query text, prompts, transcripts, identifiers, source package payloads, or full Measurement Cell payloads.",
  "AI Fluency psychological context is optional context only and cannot upgrade or rescue readiness.",
  "Observed VBD context remains telemetry-derived velocity, breadth, and depth; it is separate from AI Fluency stated behavior."
];

const ALLOWED_TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "research_promotion_packet_id",
  "created_at",
  "reviewer_role",
  "decision",
  "approved_blueprint_ref",
  "value_hypothesis_ref",
  "approved_blueprint_payload_hash",
  "expectation_path_id",
  "expectation_path_version",
  "expectation_path_hash",
  "approved_at",
  "approved_by_role",
  "approval_state",
  "expected_pathway_metadata",
  "measurement_cell_snapshot_refs",
  "series_contract_continuity_ref",
  "milestone_coverage",
  "source_lane_refs",
  "ai_fluency_construct_context_ref",
  "ai_fluency_psychological_context_ref",
  "observed_vbd_context_ref",
  "selected_metric_movement_ref",
  "assumption_governance_ref",
  "source_package_review_posture_ref",
  "data_spine_alignment_ref",
  "research_boundary_policy",
  "feeds",
  "required_caveats",
  "blocked_uses",
  "validation_summary",
  "generated_at",
  "derivation_version",
  "packet_integrity_hash"
]);

const REQUIRED_TOP_LEVEL_FIELDS = new Set(
  [...ALLOWED_TOP_LEVEL_FIELDS].filter(
    (field) =>
      ![
        "approved_blueprint_ref",
        "value_hypothesis_ref",
        "approved_blueprint_payload_hash",
        "ai_fluency_psychological_context_ref"
      ].includes(field)
  )
);

const EXPECTED_PATHWAY_FIELDS = new Set([
  "expected_behavior",
  "observed_vbd_signal",
  "metric_id",
  "metric_direction",
  "metric_lag_days",
  "value_driver"
]);

const SNAPSHOT_REF_FIELDS = new Set([
  "snapshot_ref_source",
  "window_id",
  "milestone_day",
  "status",
  "snapshot_ref",
  "assembly_run_ref",
  "metric_id",
  "metric_definition_hash",
  "metric_unit",
  "metric_direction",
  "metric_lag_days",
  "expectation_path_id",
  "expectation_path_version",
  "expectation_path_hash",
  "approved_blueprint_ref",
  "approved_blueprint_payload_hash",
  "value_hypothesis_ref",
  "approved_at",
  "approved_by_role",
  "approval_state",
  "value_driver"
]);

const SERIES_REF_FIELDS = new Set([
  "contract_ref",
  "contract_decision",
  "series_validation_valid",
  "continuity_hash"
]);

const MILESTONE_COVERAGE_FIELDS = new Set([
  "required_milestones",
  "observed_milestones",
  "missing_milestones",
  "window_modes",
  "ready_windows",
  "held_windows",
  "suppressed_windows",
  "missing_windows",
  "blocked_windows",
  "rolling_30_day_context_used_as_milestone"
]);

const SOURCE_LANE_FIELDS = new Set([
  "blueprint",
  "ai_fluency_construct",
  "vbd_token",
  "customer_metric",
  "assumption_governance"
]);

const SOURCE_LANE_REF_FIELDS = new Set([
  "source_ref",
  "source_state",
  "owner_role",
  "review_state",
  "aggregate_only",
  "freshness_state",
  "window_status",
  "source_hash"
]);

const COMPACT_CONTEXT_REF_FIELDS = new Set([
  "context_ref",
  "source_ref",
  "context_scope",
  "readiness_effect",
  "behavior_source",
  "metric_id",
  "metric_direction",
  "metric_lag_days",
  "movement_state",
  "movement_direction",
  "freshness_state",
  "window_status",
  "window_alignment_state",
  "baseline_window_hash",
  "comparison_window_hash",
  "source_hash"
]);

const SOURCE_PACKAGE_POSTURE_FIELDS = new Set([
  "posture_ref",
  "source_package_count",
  "reviewed_source_refs_hash",
  "source_review_state"
]);

const DATA_SPINE_ALIGNMENT_FIELDS = new Set([
  "alignment_ref",
  "org_id",
  "client_id",
  "workflow_family",
  "function_area",
  "cohort_key",
  "measurement_plan_id",
  "selected_metric_id",
  "expectation_path_id",
  "reviewed_aggregate_context_hash",
  "reviewed_blueprint_expectation_hash"
]);

const VALIDATION_SUMMARY_FIELDS = new Set([
  "schema_version",
  "valid",
  "decision",
  "repeated_pilot_validation_valid",
  "source_fixture_bound",
  "gaps"
]);

const FORBIDDEN_KEY_PATTERNS = [
  /^raw_?rows?$/i,
  /^rows$/i,
  /^records$/i,
  /^events$/i,
  /query_?text/i,
  /sql_?text/i,
  /^sql$/i,
  /prompt/i,
  /response_text/i,
  /transcript/i,
  /^files?$/i,
  /raw_text_answers?/i,
  /item_level/i,
  /respondent/i,
  /user_?id/i,
  /employee_?(?:id|email|name)/i,
  /person_?id/i,
  /row_?id/i,
  /span_?id/i,
  /hashed_?(?:user|person|employee|respondent)?_?id/i,
  /joinable_?(?:user|person|employee|respondent)?_?identifier/i,
  /^source_packages$/i,
  /source_package_payload/i,
  /^operator_source_handoff_bundle$/i,
  /full_handoff/i,
  /^measurement_cell_payload$/i,
  /^measurement_cell_series$/i,
  /^approved_expectation_paths$/i,
  /^payload_json$/i,
  /^validation_json$/i,
  /^source_refs_json$/i,
  /^blueprint_path_binding_json$/i,
  /finance_output/i,
  /financial_attribution/i,
  /^roi$/i,
  /realized_roi/i,
  /^ebitda$/i,
  /causality/i,
  /causal/i,
  /productivity/i,
  /probability/i,
  /contribution_probability/i,
  /confidence/i,
  /score/i,
  /numeric_weight/i,
  /customer_facing.*(?:ready|approved|authorized|output|export)/i,
  /route_creation/i,
  /ui_creation/i,
  /schema_creation/i,
  /persistence_write/i,
  /live_connector/i,
  /force_ready/i,
  /admin_override/i
];

const FORBIDDEN_VALUE_PATTERNS = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /select\s+.+\s+from/i,
  /\bsql\b/i,
  /\bbquxjob_/i,
  /https?:\/\//i,
  /raw[_-\s]?rows?/i,
  /query[_-\s]?text/i,
  /prompt/i,
  /transcript/i,
  /(?:^|_)(?:user|employee|person|respondent)_(?:id|identifier|email|name)(?:_|$)/i,
  /hashed[_-\s]?(?:user|person|employee|respondent)/i,
  /joinable[_-\s]?(?:user|person|employee|respondent)/i,
  /row[_-\s]?id/i,
  /span[_-\s]?id/i,
  /source_package_(?:payload|clearance|cleared|approved|passed)/i,
  /operator_source_handoff_bundle/i,
  /measurement_cell_payload/i,
  /measurement_cell_series_payload/i,
  /approved_expectation_paths/i,
  /payload_json/i,
  /validation_json/i,
  /source_refs_json/i,
  /blueprint_path_binding_json/i,
  /research[_-\s]?model/i,
  /model[_-\s]?(?:output|outputs|training|feed|approved|approval|authorized|authorization)/i,
  /statistical[_-\s]?model[_-\s]?selection/i,
  /durable[_-\s]?research[_-\s]?inputs/i,
  /feature[_-\s]?table/i,
  /prediction[_-\s]?output/i,
  /^\s*[\[{]/,
  /confidence[_-\s]?(?:score|percentage|percent|model|output|ready)/i,
  /customer[-_\s]?facing\s+confidence/i,
  /probability/i,
  /score[_-\s]?(?:like|output|ready|field)?/i,
  /numeric[_-\s]?weight/i,
  /finance[_-\s]?(?:output|claim|result|ready)/i,
  /financial[_-\s]?attribution/i,
  /\broi\b/i,
  /ebitda/i,
  /causal(?:ity)?/i,
  /productivity/i
];

const ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const repeatedPilotPackageCache = new Map();
const sourceBoundPacketHashCache = new Map();

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

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function arrayOf(value) {
  return Array.isArray(value) ? value : [];
}

function optionOrDefault(options, key, defaultValue) {
  return Object.prototype.hasOwnProperty.call(options, key)
    ? options[key]
    : defaultValue;
}

function safeIdPart(value) {
  return String(value ?? "missing")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "missing";
}

function falseObject(fields) {
  return Object.fromEntries(fields.map((field) => [field, false]));
}

function feedsForDecision(decision) {
  return {
    internal_research_design_review: decision === READY_DECISION,
    ...falseObject(FALSE_FEEDS)
  };
}

function sanitizeGap(gap) {
  return String(gap)
    .replace(/select\s+.+?\s+from/gi, "<blocked_query_text>")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "<blocked_identifier_value>")
    .replace(/\b(?:user|employee|person|respondent)[_-]?\d+\b/gi, "<blocked_identifier_value>")
    .replace(/raw transcript/gi, "<blocked_transcript>");
}

function sanitizeGaps(gaps) {
  return [...new Set((gaps ?? []).map(sanitizeGap).filter(Boolean))];
}

function stringsOf(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === "string" && item.trim());
}

function compactHashRef(prefix, value) {
  return `${prefix}_${sha256Json(value).slice(0, 16)}`;
}

function safeRef(value, maxLength = 180) {
  if (typeof value !== "string" || value.length === 0 || value.length > maxLength) {
    return null;
  }
  if (!/^[a-z0-9_:|.-]+$/i.test(value)) return null;
  if (/[a-f0-9]{24,}/i.test(value)) return null;
  if (FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))) return null;
  return value;
}

function safeEnumValue(value, allowedValues) {
  if (typeof value !== "string") return null;
  if (!allowedValues.has(value)) return null;
  if (FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))) return null;
  return value;
}

function safeTimestamp(value) {
  if (typeof value !== "string" || !ISO_TIMESTAMP_PATTERN.test(value)) return null;
  if (FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))) return null;
  return value;
}

function safeExpectationPathId(value) {
  if (!safeRef(value)) return null;
  if (!/^expectation_path_[a-z0-9_]+$/.test(value)) return null;
  return value;
}

function safeMetricLagDays(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function loadMeasurementPlan(fixture, cwd) {
  if (fixture?.measurement_plan) return fixture.measurement_plan;
  if (!fixture?.measurement_plan_path) return null;
  try {
    return JSON.parse(readFileSync(resolve(cwd, fixture.measurement_plan_path), "utf8"));
  } catch {
    return null;
  }
}

function selectedExpectationPath(fixture) {
  const paths = fixture?.blueprint_extraction_input?.approvedExpectationPaths;
  if (!Array.isArray(paths) || paths.length === 0) return null;
  const selectedPathId =
    fixture?.blueprint_extraction_input?.selectedExpectationPathId ??
    fixture?.blueprint_extraction_input?.selected_expectation_path_id ??
    null;
  if (selectedPathId) {
    return paths.find((path) => path?.expectation_path_id === selectedPathId) ?? null;
  }
  return paths.length === 1 ? paths[0] : null;
}

function repeatedPilotPackageCacheKey(fixture, options = {}) {
  return sha256Json({
    fixture,
    cwd: options.cwd ?? process.cwd(),
    milestoneDays: options.milestoneDays ?? REQUIRED_MILESTONE_DAYS,
    windowMode: options.windowMode ?? "milestone"
  });
}

function sourceBoundPacketCacheKey(fixture, options = {}) {
  return sha256Json({
    fixture,
    cwd: options.cwd ?? process.cwd(),
    milestoneDays: options.milestoneDays ?? REQUIRED_MILESTONE_DAYS,
    windowMode: options.windowMode ?? "milestone",
    reviewerRole: optionOrDefault(options, "reviewerRole", "governance_operator")
  });
}

function getControlledRepeatedPilotEvidencePackage(fixture, options = {}) {
  if (options.repeatedPilotEvidencePackage) {
    return clone(options.repeatedPilotEvidencePackage);
  }
  const cacheKey = repeatedPilotPackageCacheKey(fixture, options);
  if (!repeatedPilotPackageCache.has(cacheKey)) {
    repeatedPilotPackageCache.set(
      cacheKey,
      runControlledRepeatedPilotEvidencePackageFromObject(fixture, {
        cwd: options.cwd,
        milestoneDays: options.milestoneDays,
        windowMode: options.windowMode
      })
    );
  }
  return clone(repeatedPilotPackageCache.get(cacheKey));
}

function normalizeValueDriver(value) {
  return GOVERNED_VALUE_DRIVERS.get(String(value ?? "").toLowerCase()) ?? null;
}

function pathBinding(path, blueprint, measurementPlan) {
  const valueDriver = normalizeValueDriver(path?.value_driver);
  const approvedByRole =
    path?.approver_role ?? blueprint?.approverRole ?? blueprint?.ownerRole ?? null;
  return {
    expectation_path_id: safeExpectationPathId(path?.expectation_path_id),
    expectation_path_version: "approved_path_v1",
    expected_behavior: safeEnumValue(path?.expected_behavior, EXPECTED_BEHAVIORS),
    observed_vbd_signal: safeEnumValue(path?.expected_vbd_signal, VBD_SIGNALS),
    metric_id: safeRef(path?.expected_metric_id),
    metric_name: path?.expected_metric_name ?? null,
    metric_unit:
      safeRef(path?.expected_metric_unit) ??
      (String(path?.expected_metric_id ?? "").endsWith("_hours")
        ? "hours"
        : "aggregate_metric_unit"),
    metric_direction: safeEnumValue(
      path?.expected_metric_direction,
      METRIC_DIRECTIONS
    ),
    metric_lag_days: safeMetricLagDays(path?.expected_metric_lag_days),
    value_driver: valueDriver,
    approved_blueprint_ref:
      safeRef(path?.source_ref) ??
      safeRef(blueprint?.draftId) ??
      safeRef(blueprint?.documentSourceRef) ??
      null,
    value_hypothesis_ref:
      safeRef(measurementPlan?.value_hypothesis?.value_hypothesis_id) ??
      safeRef(measurementPlan?.value_hypothesis_id) ??
      null,
    approved_at: safeTimestamp(path?.approved_at ?? blueprint?.approvedAt),
    approved_by_role: safeEnumValue(approvedByRole, APPROVAL_ROLES),
    approval_state: path?.customer_approval_state ?? blueprint?.approvalState ?? null
  };
}

function compactSnapshotRef(ref, binding, expectationPathHash, approvedBlueprintPayloadHash) {
  return {
    snapshot_ref_source: "controlled_recomputed_measurement_cell_snapshot_candidate",
    window_id: safeRef(ref?.window_id),
    milestone_day: ref?.milestone_day ?? null,
    status: safeRef(ref?.status),
    snapshot_ref: compactHashRef("measurement_cell_snapshot_ref", {
      window_id: ref?.window_id,
      milestone_day: ref?.milestone_day,
      measurement_cell_ref: ref?.measurement_cell_ref
    }),
    assembly_run_ref: compactHashRef("assembly_run_ref", {
      window_id: ref?.window_id,
      assembly_run_id: ref?.measurement_cell_assembly_run_id
    }),
    metric_id: safeRef(ref?.metric_id),
    metric_definition_hash: sha256Json({
      metric_id: binding.metric_id,
      metric_name: binding.metric_name,
      metric_unit: binding.metric_unit,
      metric_direction: binding.metric_direction
    }),
    metric_unit: binding.metric_unit,
    metric_direction: binding.metric_direction,
    metric_lag_days: binding.metric_lag_days,
    expectation_path_id: binding.expectation_path_id,
    expectation_path_version: binding.expectation_path_version,
    expectation_path_hash: expectationPathHash,
    approved_blueprint_ref: binding.approved_blueprint_ref,
    approved_blueprint_payload_hash: approvedBlueprintPayloadHash,
    value_hypothesis_ref: binding.value_hypothesis_ref,
    approved_at: binding.approved_at,
    approved_by_role: binding.approved_by_role,
    approval_state: binding.approval_state,
    value_driver: binding.value_driver
  };
}

function sourceLaneRef(source) {
  if (!isPlainObject(source)) return null;
  return {
    source_ref: safeRef(source.source_ref),
    source_state: safeRef(source.state),
    owner_role: safeRef(source.owner_role),
    review_state: safeRef(source.review_state),
    aggregate_only: source.aggregate_only === true,
    freshness_state: safeRef(source.freshness_state),
    window_status: safeRef(source.window_status),
    source_hash: sha256Json({
      source_ref: source.source_ref ?? null,
      state: source.state ?? null,
      owner_role: source.owner_role ?? null,
      owner_approval_state: source.owner_approval_state ?? null,
      review_state: source.review_state ?? null,
      freshness_state: source.freshness_state ?? null,
      window_status: source.window_status ?? null,
      aggregate_only: source.aggregate_only === true
    })
  };
}

function sourceLaneRefs(fixture) {
  const sources = fixture?.data_spine_input?.sources ?? {};
  return {
    blueprint: sourceLaneRef(sources.blueprint),
    ai_fluency_construct: sourceLaneRef(sources.aiFluency),
    vbd_token: sourceLaneRef(sources.vbdToken),
    customer_metric: sourceLaneRef(sources.customerMetric),
    assumption_governance: {
      source_ref: [
        safeRef(sources.assumption?.source_ref),
        safeRef(sources.governance?.source_ref)
      ].filter(Boolean).join("|") || null,
      source_state:
        sources.assumption?.state === "present" &&
        sources.governance?.state === "present"
          ? "present"
          : null,
      owner_role: [
        safeRef(sources.assumption?.owner_role),
        safeRef(sources.governance?.owner_role)
      ].filter(Boolean).join("|") || null,
      review_state:
        sources.assumption?.review_state === "clear" &&
        sources.governance?.review_state === "clear"
          ? "clear"
          : null,
      aggregate_only:
        sources.assumption?.aggregate_only === true &&
        sources.governance?.aggregate_only === true,
      freshness_state:
        sources.assumption?.freshness_state ===
          "current_for_approved_window" &&
        sources.governance?.freshness_state ===
          "current_for_approved_window"
          ? "current_for_approved_window"
          : "stale",
      window_status:
        sources.assumption?.window_status === "current" &&
        sources.governance?.window_status === "current"
          ? "current"
          : "stale",
      source_hash: sha256Json({
        assumption: sourceLaneRef(sources.assumption),
        governance: sourceLaneRef(sources.governance)
      })
    }
  };
}

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function sameWindow(a, b) {
  if (!isPlainObject(a) || !isPlainObject(b)) return false;
  return a.window_start === b.window_start && a.window_end === b.window_end;
}

function customerMetricExport(fixture, source) {
  const sourceRef = safeRef(source?.source_ref);
  return (fixture?.scrubbed_glean_exports ?? []).find(
    (entry) =>
      entry?.evidence_layer === "layer_3_business_system_outcomes" &&
      (
        safeRef(entry?.aggregate_probe_id) === sourceRef ||
        safeRef(entry?.export_id) === sourceRef ||
        safeRef(entry?.source_readiness_id) === sourceRef
      )
  ) ?? null;
}

function movementDirectionFor(baseline, comparison) {
  if (!Number.isFinite(baseline) || !Number.isFinite(comparison)) return "missing";
  if (comparison < baseline) return "decrease";
  if (comparison > baseline) return "increase";
  return "flat";
}

function selectedMetricMovementRef(fixture, binding) {
  const source = fixture?.data_spine_input?.sources?.customerMetric;
  if (!isPlainObject(source)) return null;
  const exportRecord = customerMetricExport(fixture, source);
  const summary = exportRecord?.metric_or_signal_summary ?? {};
  const sourceMetricId = safeRef(source.metric_id);
  const baseline = finiteNumber(summary.baseline_value);
  const comparison = finiteNumber(summary.comparison_value);
  const movementDirection = movementDirectionFor(baseline, comparison);
  const expectedDirection = binding.metric_direction;
  const metricAligned = sourceMetricId === binding.metric_id;
  const directionAligned =
    expectedDirection === "decrease"
      ? movementDirection === "decrease"
      : expectedDirection === "increase"
        ? movementDirection === "increase"
        : expectedDirection === "maintain" || expectedDirection === "no_change"
          ? movementDirection === "flat"
          : false;
  const baselineWindow = fixture?.data_spine_input?.baseline_window ?? null;
  const comparisonWindow = fixture?.data_spine_input?.comparison_window ?? null;
  const sourceWindowAligned =
    sameWindow(source.baseline_window, baselineWindow) &&
    sameWindow(source.comparison_window, comparisonWindow);
  const exportWindowAligned = sameWindow(exportRecord?.covered_window, comparisonWindow);
  const exportMetricName = safeRef(summary.aggregate_metric_name);
  const exportMetricNameAligned =
    exportMetricName === `aggregate_${binding.metric_id}`;
  const sourceFreshnessState = safeRef(source.freshness_state);
  const exportFreshnessState = safeRef(exportRecord?.freshness_state);
  const sourceWindowStatus = safeRef(source.window_status);
  const exportWindowStatus = safeRef(exportRecord?.window_status);
  const freshnessState =
    sourceFreshnessState === "current_for_approved_window" &&
    exportFreshnessState === "current_for_approved_window"
      ? "current_for_approved_window"
      : "stale";
  const windowStatus =
    sourceWindowStatus === "current" && exportWindowStatus === "current"
      ? "current"
      : "stale";
  const currentWindow =
    freshnessState === "current_for_approved_window" && windowStatus === "current";
  return {
    context_ref: compactHashRef("selected_metric_movement_ref", source),
    source_ref: safeRef(source.source_ref),
    context_scope: "aggregate_customer_metric_movement_only",
    readiness_effect: "required_selected_metric_context",
    metric_id: sourceMetricId,
    metric_direction: expectedDirection ?? null,
    metric_lag_days: binding.metric_lag_days ?? null,
    movement_state:
      metricAligned &&
      exportMetricNameAligned &&
      directionAligned &&
      sourceWindowAligned &&
      exportWindowAligned &&
      currentWindow
        ? "aligned"
        : "held",
    movement_direction: movementDirection,
    freshness_state: safeRef(freshnessState),
    window_status: safeRef(windowStatus),
    window_alignment_state:
      metricAligned &&
      exportMetricNameAligned &&
      sourceWindowAligned &&
      exportWindowAligned
        ? "aligned"
        : "drifted",
    baseline_window_hash: sha256Json(baselineWindow),
    comparison_window_hash: sha256Json(comparisonWindow),
    source_hash: sha256Json({
      source_ref: source.source_ref ?? null,
      export_ref: exportRecord?.aggregate_probe_id ?? exportRecord?.export_id ?? null,
      metric_id: sourceMetricId,
      export_metric_name: exportMetricName,
      baseline_present: baseline !== null,
      comparison_present: comparison !== null,
      movement_direction: movementDirection,
      expected_direction: expectedDirection,
      metric_aligned: metricAligned,
      export_metric_name_aligned: exportMetricNameAligned,
      source_window_aligned: sourceWindowAligned,
      export_window_aligned: exportWindowAligned,
      source_freshness_state: sourceFreshnessState,
      export_freshness_state: exportFreshnessState,
      source_window_status: sourceWindowStatus,
      export_window_status: exportWindowStatus
    })
  };
}

function aiFluencyConstructContextRef(fixture) {
  const source = fixture?.data_spine_input?.sources?.aiFluency;
  if (!isPlainObject(source)) return null;
  return {
    context_ref: compactHashRef("ai_fluency_construct_context_ref", source),
    source_ref: safeRef(source.source_ref),
    context_scope: "aggregate_construct_context_only",
    readiness_effect: "context_only_cannot_upgrade_or_rescue",
    source_hash: sha256Json(source)
  };
}

function aiFluencyPsychologicalContextRef(fixture) {
  const source = fixture?.data_spine_input?.sources?.aiFluency;
  if (!isPlainObject(source)) return null;
  return {
    context_ref: compactHashRef("ai_fluency_attitude_behavioral_intent_context_ref", source),
    source_ref: safeRef(source.source_ref),
    context_scope: "aggregate_attitude_and_behavioral_intent_context_only",
    readiness_effect: "context_only_cannot_upgrade_or_rescue",
    source_hash: sha256Json({
      source_ref: source.source_ref ?? null,
      context_scope: "attitude_and_behavioral_intent"
    })
  };
}

function observedVbdContextRef(fixture) {
  const source = fixture?.data_spine_input?.sources?.vbdToken;
  if (!isPlainObject(source)) return null;
  return {
    context_ref: compactHashRef("observed_vbd_context_ref", source),
    source_ref: safeRef(source.source_ref),
    context_scope: "aggregate_velocity_breadth_depth_context_only",
    readiness_effect: "required_observed_behavior_context",
    behavior_source: "observed_telemetry_vbd",
    source_hash: sha256Json(source)
  };
}

function assumptionGovernanceRef(fixture) {
  const sources = fixture?.data_spine_input?.sources ?? {};
  const compact = {
    assumption_source_ref: safeRef(sources.assumption?.source_ref),
    governance_source_ref: safeRef(sources.governance?.source_ref),
    assumption_review_state: safeRef(sources.assumption?.review_state),
    governance_review_state: safeRef(sources.governance?.review_state)
  };
  return {
    context_ref: compactHashRef("assumption_governance_ref", compact),
    source_ref: [
      compact.assumption_source_ref,
      compact.governance_source_ref
    ].filter(Boolean).join("|") || null,
    context_scope: "aggregate_assumption_and_governance_review_only",
    readiness_effect: "required_governance_context",
    source_hash: sha256Json(compact)
  };
}

function sourcePackageReviewPostureRef(repeatedPackage) {
  return {
    posture_ref: compactHashRef("source_package_review_posture_ref", {
      reviewed_source_refs_hash:
        repeatedPackage?.alignment_summary?.reviewed_source_refs_hash,
      source_package_count:
        repeatedPackage?.validation_summary?.source_package_count
    }),
    source_package_count:
      repeatedPackage?.validation_summary?.source_package_count ?? 0,
    reviewed_source_refs_hash:
      repeatedPackage?.alignment_summary?.reviewed_source_refs_hash ?? null,
    source_review_state:
      repeatedPackage?.validation_summary?.controlled_review_valid === true
        ? "reviewed"
        : "held"
  };
}

function dataSpineAlignmentRef(repeatedPackage) {
  const alignment = repeatedPackage?.alignment_summary ?? {};
  return {
    alignment_ref: compactHashRef("data_spine_alignment_ref", alignment),
    org_id: safeRef(alignment.org_id),
    client_id: safeRef(alignment.client_id),
    workflow_family: safeRef(alignment.workflow_family),
    function_area: safeRef(alignment.function_area),
    cohort_key: safeRef(alignment.cohort_key),
    measurement_plan_id: safeRef(alignment.measurement_plan_id),
    selected_metric_id: safeRef(alignment.selected_metric_id),
    expectation_path_id: safeExpectationPathId(alignment.expectation_path_id),
    reviewed_aggregate_context_hash:
      alignment.reviewed_aggregate_context_hash ?? null,
    reviewed_blueprint_expectation_hash:
      alignment.reviewed_blueprint_expectation_hash ?? null
  };
}

function hasBoundaryLeakage(gaps) {
  return gaps.some((gap) =>
    /\b(?:raw|query|sql|prompt|transcript|identifier|user|employee|person|row_id|span_id|confidence|probability|score|numeric_weight|roi|ebitda|finance|financial|causal|productivity|customer_facing|model|research_model|model_feed|feature_table|prediction|authorization|live connector|route|ui|schema|persistence)\b/i.test(gap)
  );
}

function forbiddenAliasGap(label, originalValue, sanitizedValue) {
  if (originalValue === undefined || originalValue === null || originalValue === "") {
    return null;
  }
  if (sanitizedValue !== null && sanitizedValue !== undefined) return null;
  const text = String(originalValue);
  if (FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(text))) {
    return `${label} contains forbidden model/feed/authorization alias`;
  }
  return `${label} is unsupported or unsafe`;
}

function bindingSafetyGaps(path, blueprint, binding) {
  const approvalRole =
    path?.approver_role ?? blueprint?.approverRole ?? blueprint?.ownerRole ?? null;
  return [
    forbiddenAliasGap(
      "expectation_path_id",
      path?.expectation_path_id,
      binding.expectation_path_id
    ),
    forbiddenAliasGap("expected_behavior", path?.expected_behavior, binding.expected_behavior),
    forbiddenAliasGap(
      "expected_vbd_signal",
      path?.expected_vbd_signal,
      binding.observed_vbd_signal
    ),
    forbiddenAliasGap("expected_metric_id", path?.expected_metric_id, binding.metric_id),
    forbiddenAliasGap(
      "expected_metric_direction",
      path?.expected_metric_direction,
      binding.metric_direction
    ),
    forbiddenAliasGap("approved_at", path?.approved_at ?? blueprint?.approvedAt, binding.approved_at),
    forbiddenAliasGap("approved_by_role", approvalRole, binding.approved_by_role),
    forbiddenAliasGap("approved_blueprint_ref", path?.source_ref, binding.approved_blueprint_ref)
  ].filter(Boolean);
}

function readinessGapsFor({
  repeatedPackage,
  repeatedValidation,
  path,
  blueprint,
  binding,
  lanes,
  selectedMetricRef,
  expectedPathHash,
  reviewerRole
}) {
  const gaps = [];
  gaps.push(...bindingSafetyGaps(path, blueprint, binding));
  if (!reviewerRole) {
    gaps.push("reviewer_role must be an internal review role");
  }
  if (repeatedValidation.valid !== true) {
    gaps.push(
      ...stringsOf(repeatedValidation.gaps).map((gap) =>
        `repeated_pilot: ${sanitizeGap(gap)}`
      )
    );
  }
  if (repeatedPackage?.pilot_decision === "PILOT_REJECTED_FOR_BOUNDARY_LEAKAGE") {
    gaps.push("repeated_pilot rejected for boundary leakage");
  }

  const coverage = repeatedPackage?.series_boundary ?? {};
  const windowModes = Array.isArray(coverage.window_modes) ? coverage.window_modes : [];
  const hasNonMilestoneMode = windowModes.some((mode) => mode !== "milestone");
  if (hasNonMilestoneMode) {
    gaps.push("rolling_30_day operating context cannot count as milestone evidence");
  }
  for (const day of REQUIRED_MILESTONE_DAYS) {
    if (!(coverage.observed_milestones ?? []).includes(day)) {
      gaps.push(`missing milestone Day ${day}`);
    }
  }
  for (const field of [
    "held_windows",
    "suppressed_windows",
    "missing_windows",
    "blocked_windows"
  ]) {
    if (Number(coverage[field] ?? 0) !== 0) {
      gaps.push(`${field} must be zero for research promotion readiness`);
    }
  }
  if (coverage.complete_milestone_series !== true) {
    gaps.push("complete milestone series is required");
  }
  if (coverage.validation_valid !== true) {
    gaps.push("series contract continuity validation must be valid");
  }
  if ((coverage.compact_refs ?? []).length !== REQUIRED_MILESTONE_DAYS.length && !hasNonMilestoneMode) {
    gaps.push("compact snapshot refs are required for every governed milestone");
  }
  for (const ref of coverage.compact_refs ?? []) {
    if (ref.status !== "ready") {
      gaps.push(`snapshot ref ${ref.window_id ?? "unknown"} must be ready`);
    }
    if (ref.metric_id !== binding.metric_id) {
      gaps.push(`snapshot ref ${ref.window_id ?? "unknown"} metric_id drift`);
    }
    if (ref.expectation_path_id !== binding.expectation_path_id) {
      gaps.push(`snapshot ref ${ref.window_id ?? "unknown"} expectation_path_id drift`);
    }
  }

  if (!path) gaps.push("approved expectation path is required");
  if (!binding.approved_blueprint_ref && !binding.value_hypothesis_ref) {
    gaps.push("approved_blueprint_ref or value_hypothesis_ref is required");
  }
  if (!binding.value_hypothesis_ref && binding.expectation_path_id) {
    gaps.push("value_hypothesis_ref is required when expectation_path_id is present");
  }
  if (!binding.expectation_path_id) gaps.push("expectation_path_id is required");
  if (!binding.expectation_path_version) gaps.push("expectation_path_version is required");
  if (!expectedPathHash) gaps.push("expectation_path_hash is required");
  if (!binding.expected_behavior) gaps.push("expected_pathway_metadata.expected_behavior is required");
  if (!binding.observed_vbd_signal) {
    gaps.push("expected_pathway_metadata.observed_vbd_signal is required");
  }
  if (!binding.approved_at) gaps.push("approved_at is required");
  if (!binding.approved_by_role) gaps.push("approved_by_role is required");
  if (binding.approval_state !== "approved") {
    gaps.push("approval_state must be approved");
  }
  if (!binding.metric_id) gaps.push("selected metric id is required");
  if (!binding.metric_direction) gaps.push("selected metric direction is required");
  if (safeMetricLagDays(binding.metric_lag_days) === null) {
    gaps.push("selected metric lag is required");
  }
  if (!binding.value_driver) {
    gaps.push("value driver must be one of Revenue, Cost, Capacity, Quality, or Risk");
  }

  for (const [lane, ref] of Object.entries(lanes)) {
    if (!ref) {
      gaps.push(`source_lane_refs.${lane} is required`);
      continue;
    }
    if (ref.source_state !== "present") {
      gaps.push(`source_lane_refs.${lane}.source_state must be present`);
    }
    if (ref.review_state !== "clear") {
      gaps.push(`source_lane_refs.${lane}.review_state must be clear`);
    }
    if (ref.aggregate_only !== true) {
      gaps.push(`source_lane_refs.${lane}.aggregate_only must be true`);
    }
    if (ref.freshness_state !== "current_for_approved_window") {
      gaps.push(`source_lane_refs.${lane}.freshness_state must be current`);
    }
    if (ref.window_status !== "current") {
      gaps.push(`source_lane_refs.${lane}.window_status must be current`);
    }
    if (!safeRef(ref.source_ref)) {
      gaps.push(`source_lane_refs.${lane}.source_ref must be a safe compact ref`);
    }
  }
  if (!selectedMetricRef) {
    gaps.push("selected_metric_movement_ref is required");
  } else {
    if (selectedMetricRef.movement_state !== "aligned") {
      gaps.push("selected customer metric movement is missing or not aligned to expected metric_direction");
    }
    if (selectedMetricRef.window_alignment_state !== "aligned") {
      gaps.push("selected_metric_movement_ref.window must match evidence series and Data Spine alignment");
    }
    if (selectedMetricRef.freshness_state !== "current_for_approved_window") {
      gaps.push("selected_metric_movement_ref.freshness_state must be current");
    }
    if (selectedMetricRef.window_status !== "current") {
      gaps.push("stale windows must remain visible and force hold");
    }
  }
  return sanitizeGaps(gaps);
}

function decisionForGaps(gaps) {
  if (hasBoundaryLeakage(gaps)) return REJECT_BOUNDARY_LEAKAGE_DECISION;
  if (gaps.length === 0) return READY_DECISION;
  if (/expectation_path|expected_pathway_metadata|approval|metric|lag|value driver|source_lane_refs\..*source_ref/i.test(gaps.join(" | "))) {
    return HOLD_SOURCE_OR_PATH_DRIFT_DECISION;
  }
  if (/source_lane_refs|governance|review_state|aggregate_only|source_state|reviewer_role/i.test(gaps.join(" | "))) {
    return HOLD_GOVERNANCE_REVIEW_DECISION;
  }
  return HOLD_REPEATED_DECISION;
}

export function researchPromotionPacketIntegrityHash(packet) {
  const packetWithoutHash = { ...packet };
  delete packetWithoutHash.packet_integrity_hash;
  return sha256Json(packetWithoutHash);
}

export function buildResearchPromotionReadinessPacketFromObject(
  sourceFixture,
  options = {}
) {
  const cwd = options.cwd ?? process.cwd();
  const fixture = clone(sourceFixture);
  const reviewerRole = safeEnumValue(
    optionOrDefault(options, "reviewerRole", "governance_operator"),
    INTERNAL_REVIEW_ROLES
  );
  const repeatedPackage = getControlledRepeatedPilotEvidencePackage(fixture, {
    cwd,
    milestoneDays: options.milestoneDays,
    windowMode: options.windowMode,
    repeatedPilotEvidencePackage: options.repeatedPilotEvidencePackage
  });
  const repeatedValidation = validateControlledRepeatedPilotEvidencePackage(
    repeatedPackage,
    options.repeatedPilotEvidencePackage
      ? {
          sourceFixture: fixture,
          cwd,
          milestoneDays: options.milestoneDays,
          windowMode: options.windowMode
        }
      : { cwd }
  );
  const measurementPlan = loadMeasurementPlan(fixture, cwd);
  const blueprint = fixture?.blueprint_extraction_input ?? {};
  const path = selectedExpectationPath(fixture);
  const binding = pathBinding(path, blueprint, measurementPlan);
  const expectationPathHash = sha256Json(binding);
  const approvedBlueprintPayloadHash =
    repeatedPackage?.alignment_summary?.reviewed_blueprint_expectation_hash ??
    sha256Json(blueprint);
  const lanes = sourceLaneRefs(fixture);
  const selectedMetricRef = selectedMetricMovementRef(fixture, binding);
  const readinessGaps = readinessGapsFor({
    repeatedPackage,
    repeatedValidation,
    path,
    blueprint,
    binding,
    lanes,
    selectedMetricRef,
    expectedPathHash: expectationPathHash,
    reviewerRole
  });
  const decision = decisionForGaps(readinessGaps);
  const milestoneCoverage = repeatedPackage?.series_boundary ?? {};
  const nonMilestoneWindow =
    (milestoneCoverage.window_modes ?? []).some((mode) => mode !== "milestone");
  const snapshotRefs = nonMilestoneWindow
    ? []
    : (milestoneCoverage.compact_refs ?? []).map((ref) =>
        compactSnapshotRef(ref, binding, expectationPathHash, approvedBlueprintPayloadHash)
      );
  const packet = {
    schema_version: RESEARCH_PROMOTION_READINESS_PACKET_SCHEMA_VERSION,
    research_promotion_packet_id: compactHashRef(
      "research_promotion_packet",
      {
        fixture_id: fixture?.fixture_id,
        repeated_package_id: repeatedPackage?.pilot_id,
        expectation_path_id: binding.expectation_path_id
      }
    ),
    created_at: fixture?.generated_at ?? new Date(0).toISOString(),
    reviewer_role: reviewerRole,
    decision,
    approved_blueprint_ref: binding.approved_blueprint_ref,
    value_hypothesis_ref: binding.value_hypothesis_ref,
    approved_blueprint_payload_hash: approvedBlueprintPayloadHash,
    expectation_path_id: binding.expectation_path_id,
    expectation_path_version: binding.expectation_path_version,
    expectation_path_hash: expectationPathHash,
    approved_at: binding.approved_at,
    approved_by_role: binding.approved_by_role,
    approval_state: binding.approval_state,
    expected_pathway_metadata: {
      expected_behavior: binding.expected_behavior,
      observed_vbd_signal: binding.observed_vbd_signal,
      metric_id: binding.metric_id,
      metric_direction: binding.metric_direction,
      metric_lag_days: binding.metric_lag_days,
      value_driver: binding.value_driver
    },
    measurement_cell_snapshot_refs: snapshotRefs,
    series_contract_continuity_ref: {
      contract_ref: compactHashRef("series_contract_continuity_ref", {
        pilot_id: repeatedPackage?.pilot_id,
        series_boundary: repeatedPackage?.series_boundary
      }),
      contract_decision: repeatedPackage?.series_boundary?.decision ?? null,
      series_validation_valid:
        repeatedPackage?.series_boundary?.validation_valid === true,
      continuity_hash: sha256Json({
        required_milestones: repeatedPackage?.series_boundary?.required_milestones,
        observed_milestones: repeatedPackage?.series_boundary?.observed_milestones,
        compact_refs: repeatedPackage?.series_boundary?.compact_refs
      })
    },
    milestone_coverage: {
      required_milestones: [...REQUIRED_MILESTONE_DAYS],
      observed_milestones: nonMilestoneWindow
        ? []
        : repeatedPackage?.series_boundary?.observed_milestones ?? [],
      missing_milestones: nonMilestoneWindow
        ? []
        : repeatedPackage?.series_boundary?.missing_milestones ?? [],
      window_modes: repeatedPackage?.series_boundary?.window_modes ?? [],
      ready_windows: nonMilestoneWindow
        ? 0
        : Number(repeatedPackage?.series_boundary?.ready_windows ?? 0),
      held_windows: nonMilestoneWindow
        ? 0
        : Number(repeatedPackage?.series_boundary?.held_windows ?? 0),
      suppressed_windows: nonMilestoneWindow
        ? 0
        : Number(repeatedPackage?.series_boundary?.suppressed_windows ?? 0),
      missing_windows: nonMilestoneWindow
        ? 0
        : Number(repeatedPackage?.series_boundary?.missing_windows ?? 0),
      blocked_windows: nonMilestoneWindow
        ? 0
        : Number(repeatedPackage?.series_boundary?.blocked_windows ?? 0),
      rolling_30_day_context_used_as_milestone: false
    },
    source_lane_refs: lanes,
    ai_fluency_construct_context_ref: aiFluencyConstructContextRef(fixture),
    ai_fluency_psychological_context_ref: aiFluencyPsychologicalContextRef(fixture),
    observed_vbd_context_ref: observedVbdContextRef(fixture),
    selected_metric_movement_ref: selectedMetricRef,
    assumption_governance_ref: assumptionGovernanceRef(fixture),
    source_package_review_posture_ref: sourcePackageReviewPostureRef(repeatedPackage),
    data_spine_alignment_ref: dataSpineAlignmentRef(repeatedPackage),
    research_boundary_policy: falseObject(POLICY_FIELDS),
    feeds: feedsForDecision(decision),
    required_caveats: [...REQUIRED_CAVEATS],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    validation_summary: {
      schema_version:
        `${RESEARCH_PROMOTION_READINESS_PACKET_SCHEMA_VERSION}_VALIDATION_SUMMARY`,
      valid: decision === READY_DECISION,
      decision,
      repeated_pilot_validation_valid: repeatedValidation.valid === true,
      source_fixture_bound: true,
      gaps: readinessGaps
    },
    generated_at: fixture?.generated_at ?? new Date(0).toISOString(),
    derivation_version: DERIVATION_VERSION
  };
  const packetWithHash = {
    ...packet,
    packet_integrity_hash: researchPromotionPacketIntegrityHash(packet)
  };
  sourceBoundPacketHashCache.set(
    sourceBoundPacketCacheKey(fixture, {
      cwd,
      milestoneDays: options.milestoneDays,
      windowMode: options.windowMode,
      reviewerRole
    }),
    packetWithHash.packet_integrity_hash
  );
  return packetWithHash;
}

function collectUnsupportedKeys(value, allowedFields, label) {
  if (!isPlainObject(value)) return [`${label} must be an object`];
  return Object.keys(value)
    .filter((key) => !allowedFields.has(key))
    .map((key) => `${label} contains unsupported field: ${key}`);
}

function collectExactObjectKeys(value, allowedFields, label) {
  const gaps = collectUnsupportedKeys(value, allowedFields, label);
  if (!isPlainObject(value)) return gaps;
  for (const field of allowedFields) {
    if (!(field in value)) {
      gaps.push(`${label} missing required field: ${field}`);
    }
  }
  return gaps;
}

function collectTopLevelGaps(packet) {
  const gaps = [];
  if (!isPlainObject(packet)) return ["research promotion packet must be an object"];
  for (const field of REQUIRED_TOP_LEVEL_FIELDS) {
    if (packet[field] === undefined || packet[field] === null || packet[field] === "") {
      gaps.push(`${field} is required`);
    }
  }
  for (const field of Object.keys(packet)) {
    if (!ALLOWED_TOP_LEVEL_FIELDS.has(field)) {
      gaps.push(`Unsupported research promotion packet field: ${field}`);
    }
  }
  if (packet.schema_version !== RESEARCH_PROMOTION_READINESS_PACKET_SCHEMA_VERSION) {
    gaps.push(`schema_version must be ${RESEARCH_PROMOTION_READINESS_PACKET_SCHEMA_VERSION}`);
  }
  if (!ALLOWED_DECISIONS.has(String(packet.decision ?? ""))) {
    gaps.push(`decision is invalid: ${packet.decision}`);
  }
  if (!INTERNAL_REVIEW_ROLES.has(String(packet.reviewer_role ?? ""))) {
    gaps.push("reviewer_role must be an internal review role");
  }
  if (!ISO_TIMESTAMP_PATTERN.test(String(packet.created_at ?? ""))) {
    gaps.push("created_at must be an ISO timestamp");
  }
  if (!HASH_PATTERN.test(String(packet.packet_integrity_hash ?? ""))) {
    gaps.push("packet_integrity_hash must be a sha256 hex hash");
  } else if (packet.packet_integrity_hash !== researchPromotionPacketIntegrityHash(packet)) {
    gaps.push("packet_integrity_hash must match packet contents");
  }
  return gaps;
}

function collectShapeGaps(packet) {
  const gaps = [
    ...collectUnsupportedKeys(
      packet?.expected_pathway_metadata,
      EXPECTED_PATHWAY_FIELDS,
      "expected_pathway_metadata"
    ),
    ...collectUnsupportedKeys(
      packet?.series_contract_continuity_ref,
      SERIES_REF_FIELDS,
      "series_contract_continuity_ref"
    ),
    ...collectUnsupportedKeys(
      packet?.milestone_coverage,
      MILESTONE_COVERAGE_FIELDS,
      "milestone_coverage"
    ),
    ...collectUnsupportedKeys(
      packet?.source_lane_refs,
      SOURCE_LANE_FIELDS,
      "source_lane_refs"
    ),
    ...collectUnsupportedKeys(
      packet?.ai_fluency_construct_context_ref,
      COMPACT_CONTEXT_REF_FIELDS,
      "ai_fluency_construct_context_ref"
    ),
    ...(packet?.ai_fluency_psychological_context_ref === undefined ||
    packet?.ai_fluency_psychological_context_ref === null
      ? []
      : collectUnsupportedKeys(
          packet.ai_fluency_psychological_context_ref,
          COMPACT_CONTEXT_REF_FIELDS,
          "ai_fluency_psychological_context_ref"
        )),
    ...collectUnsupportedKeys(
      packet?.observed_vbd_context_ref,
      COMPACT_CONTEXT_REF_FIELDS,
      "observed_vbd_context_ref"
    ),
    ...collectUnsupportedKeys(
      packet?.selected_metric_movement_ref,
      COMPACT_CONTEXT_REF_FIELDS,
      "selected_metric_movement_ref"
    ),
    ...collectUnsupportedKeys(
      packet?.assumption_governance_ref,
      COMPACT_CONTEXT_REF_FIELDS,
      "assumption_governance_ref"
    ),
    ...collectUnsupportedKeys(
      packet?.source_package_review_posture_ref,
      SOURCE_PACKAGE_POSTURE_FIELDS,
      "source_package_review_posture_ref"
    ),
    ...collectUnsupportedKeys(
      packet?.data_spine_alignment_ref,
      DATA_SPINE_ALIGNMENT_FIELDS,
      "data_spine_alignment_ref"
    ),
    ...collectUnsupportedKeys(
      packet?.validation_summary,
      VALIDATION_SUMMARY_FIELDS,
      "validation_summary"
    ),
    ...collectExactObjectKeys(packet?.feeds, FEED_FIELDS, "feeds"),
    ...collectExactObjectKeys(
      packet?.research_boundary_policy,
      POLICY_FIELD_SET,
      "research_boundary_policy"
    )
  ];
  if (!Array.isArray(packet?.measurement_cell_snapshot_refs)) {
    gaps.push("measurement_cell_snapshot_refs must be an array");
  } else {
    packet.measurement_cell_snapshot_refs.forEach((ref, index) => {
      gaps.push(
        ...collectUnsupportedKeys(
          ref,
          SNAPSHOT_REF_FIELDS,
          `measurement_cell_snapshot_refs.${index}`
        )
      );
    });
  }
  if (!Array.isArray(packet?.required_caveats)) {
    gaps.push("required_caveats must be an array");
  }
  if (!Array.isArray(packet?.blocked_uses)) {
    gaps.push("blocked_uses must be an array");
  }
  if (!Array.isArray(packet?.validation_summary?.gaps)) {
    gaps.push("validation_summary.gaps must be an array");
  }
  for (const [lane, ref] of Object.entries(
    isPlainObject(packet?.source_lane_refs) ? packet.source_lane_refs : {}
  )) {
    gaps.push(
      ...collectUnsupportedKeys(ref, SOURCE_LANE_REF_FIELDS, `source_lane_refs.${lane}`)
    );
  }
  return gaps;
}

function collectPolicyGaps(packet) {
  const gaps = [];
  const blockedUses = arrayOf(packet?.blocked_uses);
  const requiredCaveats = arrayOf(packet?.required_caveats);
  if (packet?.feeds?.internal_research_design_review !== (packet?.decision === READY_DECISION)) {
    gaps.push("feeds.internal_research_design_review must match ready decision");
  }
  for (const feed of FALSE_FEEDS) {
    if (packet?.feeds?.[feed] !== false) {
      gaps.push(`feeds.${feed} must be false`);
    }
  }
  for (const field of POLICY_FIELDS) {
    if (packet?.research_boundary_policy?.[field] !== false) {
      gaps.push(`research_boundary_policy.${field} must be false`);
    }
  }
  for (const use of REQUIRED_BLOCKED_USES) {
    if (!blockedUses.includes(use)) {
      gaps.push(`blocked_uses must include ${use}`);
    }
  }
  for (const use of blockedUses) {
    if (!REQUIRED_BLOCKED_USES.includes(use)) {
      gaps.push("blocked_uses contains ungoverned value");
    }
  }
  for (const caveat of REQUIRED_CAVEATS) {
    if (!requiredCaveats.includes(caveat)) {
      gaps.push(`required_caveats must include governed caveat`);
    }
  }
  for (const caveat of requiredCaveats) {
    if (!REQUIRED_CAVEATS.includes(caveat)) {
      gaps.push("required_caveats contains ungoverned value");
    }
  }
  return gaps;
}

function collectReadinessConsistencyGaps(packet) {
  const gaps = [];
  const ready = packet?.decision === READY_DECISION;
  if (ready && packet?.validation_summary?.valid !== true) {
    gaps.push("validation_summary.valid must be true when packet is ready");
  }
  if (!ready && packet?.feeds?.internal_research_design_review === true) {
    gaps.push("held or rejected packets cannot feed internal research design review");
  }
  if (packet?.approval_state !== "approved") {
    gaps.push("approval_state must be approved");
  }
  if (!packet?.approved_blueprint_ref && !packet?.value_hypothesis_ref) {
    gaps.push("approved_blueprint_ref or value_hypothesis_ref is required");
  }
  if (packet?.expectation_path_id && !packet?.value_hypothesis_ref) {
    gaps.push("value_hypothesis_ref is required when expectation_path_id is present");
  }
  const requiredHashFields = [
    ...(packet?.approved_blueprint_ref ? ["approved_blueprint_payload_hash"] : []),
    "expectation_path_hash",
    "source_package_review_posture_ref.reviewed_source_refs_hash",
    "data_spine_alignment_ref.reviewed_aggregate_context_hash",
    "data_spine_alignment_ref.reviewed_blueprint_expectation_hash"
  ];
  for (const field of requiredHashFields) {
    const value = field.split(".").reduce((acc, key) => acc?.[key], packet);
    if (!HASH_PATTERN.test(String(value ?? ""))) {
      gaps.push(`${field} must be a sha256 hex hash`);
    }
  }
  if (
    ![...GOVERNED_VALUE_DRIVERS.values()].includes(
      String(packet?.expected_pathway_metadata?.value_driver ?? "")
    )
  ) {
    gaps.push("expected_pathway_metadata.value_driver must be governed");
  }
  if (!packet?.expected_pathway_metadata?.expected_behavior) {
    gaps.push("expected_pathway_metadata.expected_behavior is required");
  }
  if (!packet?.expected_pathway_metadata?.observed_vbd_signal) {
    gaps.push("expected_pathway_metadata.observed_vbd_signal is required");
  }
  if (
    safeMetricLagDays(packet?.expected_pathway_metadata?.metric_lag_days) === null
  ) {
    gaps.push("expected_pathway_metadata.metric_lag_days is required");
  }
  const coverage = packet?.milestone_coverage ?? {};
  const requiredMilestones = arrayOf(coverage.required_milestones);
  const observedMilestones = arrayOf(coverage.observed_milestones);
  const missingMilestones = arrayOf(coverage.missing_milestones);
  const windowModes = arrayOf(coverage.window_modes);
  const snapshotRefs = arrayOf(packet?.measurement_cell_snapshot_refs);
  if (JSON.stringify(requiredMilestones) !== JSON.stringify(REQUIRED_MILESTONE_DAYS)) {
    gaps.push("milestone_coverage.required_milestones must be Day 0, 30, 60, 90, 180, and 365");
  }
  const rolling = windowModes.some((mode) => mode !== "milestone");
  if (rolling) {
    if (coverage.rolling_30_day_context_used_as_milestone !== false) {
      gaps.push("rolling_30_day context must not be marked as milestone evidence");
    }
    if (snapshotRefs.length !== 0) {
      gaps.push("rolling_30_day context must not emit milestone snapshot refs");
    }
  }
  if (ready) {
    if (JSON.stringify(observedMilestones) !== JSON.stringify(REQUIRED_MILESTONE_DAYS)) {
      gaps.push("ready packet requires all governed milestones");
    }
    if (missingMilestones.length !== 0) {
      gaps.push("ready packet cannot have missing milestones");
    }
    for (const field of [
      "held_windows",
      "suppressed_windows",
      "missing_windows",
      "blocked_windows"
    ]) {
      if (Number(coverage[field] ?? 0) !== 0) {
        gaps.push(`ready packet requires milestone_coverage.${field} to be zero`);
      }
    }
    if (snapshotRefs.length !== REQUIRED_MILESTONE_DAYS.length) {
      gaps.push("ready packet requires compact snapshot refs for each governed milestone");
    }
  }
  for (const ref of snapshotRefs) {
    if (
      ref.snapshot_ref_source !==
      "controlled_recomputed_measurement_cell_snapshot_candidate"
    ) {
      gaps.push(`measurement_cell_snapshot_refs.${ref.window_id ?? "unknown"}.snapshot_ref_source must be controlled recomputed candidate`);
    }
    if (ref.expectation_path_id !== packet.expectation_path_id) {
      gaps.push(`measurement_cell_snapshot_refs.${ref.window_id ?? "unknown"}.expectation_path_id must match packet expectation_path_id`);
    }
    if (ref.expectation_path_version !== packet.expectation_path_version) {
      gaps.push(`measurement_cell_snapshot_refs.${ref.window_id ?? "unknown"}.expectation_path_version must match packet expectation_path_version`);
    }
    if (ref.expectation_path_hash !== packet.expectation_path_hash) {
      gaps.push(`measurement_cell_snapshot_refs.${ref.window_id ?? "unknown"}.expectation_path_hash must match packet expectation_path_hash`);
    }
    if (ref.approved_blueprint_ref !== packet.approved_blueprint_ref) {
      gaps.push(`measurement_cell_snapshot_refs.${ref.window_id ?? "unknown"}.approved_blueprint_ref must match packet approved_blueprint_ref`);
    }
    if (ref.approved_blueprint_payload_hash !== packet.approved_blueprint_payload_hash) {
      gaps.push(`measurement_cell_snapshot_refs.${ref.window_id ?? "unknown"}.approved_blueprint_payload_hash must match packet approved_blueprint_payload_hash`);
    }
    if (ref.value_hypothesis_ref !== packet.value_hypothesis_ref) {
      gaps.push(`measurement_cell_snapshot_refs.${ref.window_id ?? "unknown"}.value_hypothesis_ref must match packet value_hypothesis_ref`);
    }
    if (ref.approved_at !== packet.approved_at) {
      gaps.push(`measurement_cell_snapshot_refs.${ref.window_id ?? "unknown"}.approved_at must match packet approved_at`);
    }
    if (ref.approved_by_role !== packet.approved_by_role) {
      gaps.push(`measurement_cell_snapshot_refs.${ref.window_id ?? "unknown"}.approved_by_role must match packet approved_by_role`);
    }
    if (ref.approval_state !== packet.approval_state) {
      gaps.push(`measurement_cell_snapshot_refs.${ref.window_id ?? "unknown"}.approval_state must match packet approval_state`);
    }
    if (ref.metric_id !== packet.expected_pathway_metadata?.metric_id) {
      gaps.push(`measurement_cell_snapshot_refs.${ref.window_id ?? "unknown"}.metric_id must match selected metric`);
    }
    if (ref.metric_direction !== packet.expected_pathway_metadata?.metric_direction) {
      gaps.push(`measurement_cell_snapshot_refs.${ref.window_id ?? "unknown"}.metric_direction must match selected metric direction`);
    }
    if (ref.metric_lag_days !== packet.expected_pathway_metadata?.metric_lag_days) {
      gaps.push(`measurement_cell_snapshot_refs.${ref.window_id ?? "unknown"}.metric_lag_days must match selected metric lag`);
    }
    if (ref.value_driver !== packet.expected_pathway_metadata?.value_driver) {
      gaps.push(`measurement_cell_snapshot_refs.${ref.window_id ?? "unknown"}.value_driver must match governed value driver`);
    }
    if (!safeRef(ref.snapshot_ref) || !safeRef(ref.assembly_run_ref)) {
      gaps.push(`measurement_cell_snapshot_refs.${ref.window_id ?? "unknown"} must use safe compact refs`);
    }
  }
  for (const [lane, ref] of Object.entries(
    isPlainObject(packet?.source_lane_refs) ? packet.source_lane_refs : {}
  )) {
    if (!safeRef(ref?.source_ref)) {
      gaps.push(`source_lane_refs.${lane}.source_ref must be a safe compact ref`);
    }
    if (ref?.source_state !== "present") {
      gaps.push(`source_lane_refs.${lane}.source_state must be present`);
    }
    if (ref?.review_state !== "clear") {
      gaps.push(`source_lane_refs.${lane}.review_state must be clear`);
    }
    if (ref?.aggregate_only !== true) {
      gaps.push(`source_lane_refs.${lane}.aggregate_only must be true`);
    }
    if (ref?.freshness_state !== "current_for_approved_window") {
      gaps.push(`source_lane_refs.${lane}.freshness_state must be current`);
    }
    if (ref?.window_status !== "current") {
      gaps.push(`source_lane_refs.${lane}.window_status must be current`);
    }
  }
  for (const [label, ref] of [
    ["ai_fluency_construct_context_ref", packet?.ai_fluency_construct_context_ref],
    ["observed_vbd_context_ref", packet?.observed_vbd_context_ref],
    ["selected_metric_movement_ref", packet?.selected_metric_movement_ref],
    ["assumption_governance_ref", packet?.assumption_governance_ref]
  ]) {
    if (!isPlainObject(ref)) {
      gaps.push(`${label} is required`);
      continue;
    }
    if (!safeRef(ref.source_ref)) {
      gaps.push(`${label}.source_ref must be a safe compact ref`);
    }
  }
  const selectedMetricRef = packet?.selected_metric_movement_ref;
  if (isPlainObject(selectedMetricRef)) {
    if (selectedMetricRef.metric_id !== packet?.expected_pathway_metadata?.metric_id) {
      gaps.push("selected_metric_movement_ref.metric_id must match selected metric");
    }
    if (
      selectedMetricRef.metric_direction !==
      packet?.expected_pathway_metadata?.metric_direction
    ) {
      gaps.push("selected_metric_movement_ref.metric_direction must match selected metric direction");
    }
    if (
      selectedMetricRef.metric_lag_days !==
      packet?.expected_pathway_metadata?.metric_lag_days
    ) {
      gaps.push("selected_metric_movement_ref.metric_lag_days must match selected metric lag");
    }
    if (selectedMetricRef.movement_state !== "aligned") {
      gaps.push("selected customer metric movement is missing or not aligned to expected metric_direction");
    }
    if (selectedMetricRef.window_alignment_state !== "aligned") {
      gaps.push("selected_metric_movement_ref.window must match evidence series and Data Spine alignment");
    }
    if (selectedMetricRef.freshness_state !== "current_for_approved_window") {
      gaps.push("selected_metric_movement_ref.freshness_state must be current");
    }
    if (selectedMetricRef.window_status !== "current") {
      gaps.push("stale windows must remain visible and force hold");
    }
  }
  if (
    packet?.ai_fluency_psychological_context_ref &&
    packet.ai_fluency_psychological_context_ref.readiness_effect !==
      "context_only_cannot_upgrade_or_rescue"
  ) {
    gaps.push("ai_fluency_psychological_context_ref cannot upgrade or rescue readiness");
  }
  if (packet?.observed_vbd_context_ref?.behavior_source !== "observed_telemetry_vbd") {
    gaps.push("observed_vbd_context_ref must remain observed telemetry VBD behavior");
  }
  if (!validationSummaryGapsAreSafe(packet?.validation_summary?.gaps)) {
    gaps.push("validation_summary.gaps contains unsafe smuggled content");
  }
  return sanitizeGaps(gaps);
}

function isExactAllowedArrayValue(path, value) {
  if (path[0] === "blocked_uses") return REQUIRED_BLOCKED_USES.includes(value);
  if (path[0] === "required_caveats") return REQUIRED_CAVEATS.includes(value);
  return false;
}

function isAllowedPolicyPath(path) {
  if (path.length === 2 && path[0] === "feeds" && FEED_FIELDS.has(path[1])) {
    return true;
  }
  if (
    path.length === 2 &&
    path[0] === "research_boundary_policy" &&
    POLICY_FIELD_SET.has(path[1])
  ) {
    return true;
  }
  return path[0] === "validation_summary" && path[1] === "schema_version";
}

function collectForbiddenContentGaps(value, path = []) {
  const gaps = [];
  if (typeof value === "string") {
    if (
      !isAllowedPolicyPath(path) &&
      !isExactAllowedArrayValue(path, value) &&
      FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))
    ) {
      gaps.push(`Unsafe value detected at ${path.join(".") || "value"}`);
    }
    if (
      path[0] === "validation_summary" &&
      path[1] === "gaps" &&
      FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))
    ) {
      gaps.push("validation_summary.gaps contains unsafe smuggled content");
    }
    return gaps;
  }
  if (!value || typeof value !== "object") return gaps;
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      gaps.push(...collectForbiddenContentGaps(item, [...path, String(index)]));
    });
    return gaps;
  }
  for (const [key, nestedValue] of Object.entries(value)) {
    const nextPath = [...path, key];
    if (
      !isAllowedPolicyPath(nextPath) &&
      FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key))
    ) {
      gaps.push(`Unsafe field detected: ${nextPath.join(".")}`);
    }
    gaps.push(...collectForbiddenContentGaps(nestedValue, nextPath));
  }
  return sanitizeGaps(gaps);
}

function validationSummaryGapsAreSafe(gaps) {
  return Array.isArray(gaps) &&
    gaps.every((gap) => {
      const sanitized = sanitizeGap(gap);
      return sanitized === gap &&
        !FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(String(gap)));
    });
}

function collectSourceFixtureBoundGaps(packet, options = {}) {
  if (!options.sourceFixture) {
    return ["sourceFixture is required to validate a research promotion packet"];
  }
  if (options.sourceFixture?.schema_version !== FIXTURE_SCHEMA_VERSION) {
    return [`sourceFixture.schema_version must be ${FIXTURE_SCHEMA_VERSION}`];
  }
  const expectedOptions = {
    cwd: options.cwd ?? process.cwd(),
    milestoneDays: options.milestoneDays,
    windowMode: options.windowMode,
    reviewerRole: packet?.reviewer_role
  };
  const cacheKey = sourceBoundPacketCacheKey(options.sourceFixture, expectedOptions);
  let expectedHash = sourceBoundPacketHashCache.get(cacheKey);
  if (!expectedHash) {
    const expected = buildResearchPromotionReadinessPacketFromObject(
      options.sourceFixture,
      expectedOptions
    );
    expectedHash = expected.packet_integrity_hash;
  }
  if (packet?.packet_integrity_hash !== expectedHash) {
    return ["research promotion packet must match source-fixture-bound output"];
  }
  return [];
}

export function validateResearchPromotionReadinessPacket(packet, options = {}) {
  const gaps = sanitizeGaps([
    ...collectTopLevelGaps(packet),
    ...collectShapeGaps(packet),
    ...collectPolicyGaps(packet),
    ...collectReadinessConsistencyGaps(packet),
    ...collectForbiddenContentGaps(packet),
    ...collectSourceFixtureBoundGaps(packet, options)
  ]);
  return {
    schema_version:
      `${RESEARCH_PROMOTION_READINESS_PACKET_SCHEMA_VERSION}_VALIDATION`,
    research_promotion_packet_id: packet?.research_promotion_packet_id ?? null,
    valid: gaps.length === 0,
    gaps
  };
}

function printUsageAndExit() {
  console.error(
    "Usage: node scripts/run_ai_value_research_promotion_readiness_packet.mjs <fixture.json> [--milestones=0,30,60,90,180,365] [--window-mode=milestone]"
  );
  process.exit(1);
}

function cliOptions(argv) {
  const fixturePath = argv.filter((arg) => !arg.startsWith("--")).at(-1);
  const milestonesArg = argv.find((arg) => arg.startsWith("--milestones="));
  const windowModeArg = argv.find((arg) => arg.startsWith("--window-mode="));
  return {
    fixturePath,
    milestoneDays: milestonesArg
      ? milestonesArg
          .split("=")[1]
          .split(",")
          .map((day) => Number(day.trim()))
          .filter((day) => Number.isFinite(day))
      : undefined,
    windowMode: windowModeArg ? windowModeArg.split("=")[1] : undefined
  };
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
const currentPath = fileURLToPath(import.meta.url);
if (invokedPath === currentPath) {
  const { fixturePath, milestoneDays, windowMode } = cliOptions(process.argv.slice(2));
  if (!fixturePath) printUsageAndExit();
  const cwd = process.cwd();
  const fixture = JSON.parse(readFileSync(resolve(cwd, fixturePath), "utf8"));
  const packet = buildResearchPromotionReadinessPacketFromObject(fixture, {
    cwd,
    milestoneDays,
    windowMode
  });
  const validation = validateResearchPromotionReadinessPacket(packet, {
    sourceFixture: fixture,
    cwd,
    milestoneDays,
    windowMode
  });
  if (!validation.valid) {
    console.error(JSON.stringify(validation, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(packet, null, 2));
}
