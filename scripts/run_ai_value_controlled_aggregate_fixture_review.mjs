#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildDataSpineIntakeReadiness,
  buildRealDataIntakePacketRun,
  validateAiValuePilotIntakeRun,
  validateDataSpineIntakeReadiness,
  validateRealDataIntakePacketRun
} from "../shared/dist/aiValueEngine/index.js";

export const CONTROLLED_AGGREGATE_FIXTURE_REVIEW_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTROLLED_AGGREGATE_FIXTURE_REVIEW_2026_06";

const FIXTURE_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTROLLED_AGGREGATE_FIXTURE_2026_06";

const DERIVATION_VERSION =
  "ai_value_controlled_aggregate_fixture_review_2026_06";

const REQUIRED_FALSE_FEEDS = [
  "pipeline_run",
  "pipeline_run_id",
  "durable_pipeline_run_storage",
  "source_package_clearance",
  "measurement_cell_input",
  "measurement_cell_snapshot",
  "measurement_cell_series_snapshot",
  "evidence_continuity_snapshot",
  "claim_readiness_snapshot",
  "executive_readout_snapshot",
  "executive_packet",
  "html_readout",
  "api_export",
  "customer_share_package",
  "reportability_readiness",
  "value_hypothesis_packet_runner",
  "finance_context_investigation",
  "finance_context_investigation_planning",
  "confidence_model",
  "confidence_model_feed",
  "confidence_percentage",
  "confidence_score",
  "probability_output",
  "contribution_probability",
  "p_value",
  "roi_output",
  "ebita_claim",
  "ebitda_claim",
  "financial_attribution",
  "causality_claim",
  "productivity_claim",
  "customer_facing_output",
  "customer_facing_financial_output",
  "customer_facing_economic_output"
];

const REQUIRED_FALSE_BOUNDARY_FIELDS = [
  "persisted",
  "creates_migrations",
  "creates_prisma_schema",
  "creates_backend_routes",
  "creates_frontend_ui",
  "creates_ingestion_jobs",
  "runs_bigquery",
  "runs_sigma",
  "runs_glean_query",
  "runs_customer_connectors",
  "runs_live_connectors",
  "parses_uploaded_documents",
  "writes_output_files",
  "stores_raw_source_data",
  "creates_schemas",
  "creates_repositories",
  "creates_routes",
  "creates_ui",
  "persists_pipeline_run",
  "computes_confidence",
  "emits_probability",
  "computes_roi",
  "emits_financial_attribution",
  "customer_facing_output",
  "customer_facing_financial_output"
];

const REQUIRED_BLOCKED_USES = [
  "realized_roi",
  "ebita_claim",
  "ebitda_claim",
  "financial_attribution",
  "causality_claim",
  "productivity_claim",
  "headcount_reduction_claim",
  "individual_attribution",
  "manager_or_team_ranking",
  "department_ranking",
  "people_decisioning",
  "customer_facing_output",
  "customer_facing_financial_output",
  "customer_facing_economic_output",
  "confidence_model",
  "confidence_percentage",
  "confidence_score",
  "probability_output",
  "contribution_probability",
  "p_value",
  "live_bigquery_execution",
  "live_sigma_execution",
  "live_glean_query",
  "pipeline_run_storage"
];

const ALLOWED_FIXTURE_FIELDS = new Set([
  "schema_version",
  "fixture_id",
  "run_id",
  "generated_at",
  "measurement_plan_path",
  "measurement_plan",
  "blueprint_extraction_input",
  "data_spine_input",
  "data_spine_readiness",
  "scrubbed_glean_exports",
  "expected",
  "notes"
]);

const ALLOWED_REVIEW_STATES = new Set([
  "PASSED_INTERNAL_FIXTURE_REVIEW",
  "HELD_FOR_DATA_SPINE",
  "HELD_FOR_SUPPRESSED_AGGREGATE_TELEMETRY",
  "HELD_FOR_EVIDENCE_INPUTS",
  "BLOCKED"
]);

const ALLOWED_REVIEW_FIELDS = new Set([
  "schema_version",
  "fixture_id",
  "review_state",
  "engine_decision",
  "engine_executed",
  "run_ref",
  "validation_summary",
  "internal_review_package",
  "feeds",
  "blocked_uses",
  "boundary_policy",
  "required_caveats",
  "generated_at",
  "derivation_version"
]);

const REVIEWED_SOURCE_REF_LANES = [
  "blueprint",
  "ai_fluency",
  "vbd_token",
  "customer_metric",
  "assumption",
  "governance"
];

const SAFE_SOURCE_REF_PATTERN = /^[a-z][a-z0-9_]{2,159}$/;

const LANE_SOURCE_REF_PATTERNS = {
  blueprint: /^(?:blueprint|blueprint_parse|blueprint_extraction_draft)_[a-z0-9_]{2,150}$/,
  ai_fluency: /^ai_fluency_[a-z0-9_]{2,150}$/,
  vbd_token: /^scrubbed_glean_vbd_token_[a-z0-9_]{2,150}$/,
  customer_metric: /^[a-z0-9_]*metric_[a-z0-9_]{2,150}$/,
  assumption: /^[a-z0-9_]*assumption_[a-z0-9_]{2,150}$/,
  governance: /^[a-z0-9_]*governance_[a-z0-9_]{2,150}$/
};

const EXEMPT_VALUE_PATHS = new Set([
  "blocked_uses",
  "required_caveats",
  "internal_review_package.blocked_claims"
]);

const FORBIDDEN_FIELD_PATTERNS = [
  /^raw_rows?$/i,
  /^rows$/i,
  /^events$/i,
  /^records$/i,
  /raw_(?:prompt|response|transcript|content|file|export|event|row|rows)/i,
  /^raw_data$/i,
  /^raw_data_rows?$/i,
  /raw_?data_?rows?/i,
  /prompt/i,
  /^responses?$/i,
  /response_text/i,
  /transcript/i,
  /^query$/i,
  /query_text/i,
  /sql_text/i,
  /bigquery_sql/i,
  /^file_contents?$/i,
  /email/i,
  /user_id/i,
  /employee_id/i,
  /employee_email/i,
  /employee_name/i,
  /(?:user|person|employee|respondent)_?(?:uuid|identifier|key)/i,
  /respondent_email/i,
  /person_id/i,
  /person_identifier/i,
  /hashed_(?:user|person|employee)_id/i,
  /joinable_(?:user|person|employee)_identifier/i,
  /person_level_productivity/i,
  /person_level_hris/i,
  /manager_ranking/i,
  /team_ranking/i,
  /department_ranking/i,
  /people_decisioning/i,
  /^confidence_percentage$/i,
  /^confidence_percent$/i,
  /^confidence_score$/i,
  /confidence/i,
  /^confidence$/i,
  /^probability$/i,
  /^probability_score$/i,
  /probability/i,
  /probability_output/i,
  /contribution_probability/i,
  /contribution_likelihood/i,
  /^p_value$/i,
  /^roi$/i,
  /realized_roi/i,
  /roi_(?:value|amount|calculation|result|impact|output|proof)/i,
  /return_on_investment/i,
  /dollarized_(?:value|impact|amount|output)/i,
  /^ebita$/i,
  /^ebitda$/i,
  /ebitda_(?:value|amount|impact|calculation|result)/i,
  /financial_impact/i,
  /financial_attribution/i,
  /finance_context/i,
  /finance_review/i,
  /^financial_output$/i,
  /^customer_facing_output$/i,
  /^customer_facing_financial_output$/i,
  /^customer_facing_economic_output$/i,
  /causality_claim/i,
  /casuality/i,
  /causal_proof/i,
  /productivity_claim/i,
  /productivity/i,
  /productivity_lift/i,
  /^pipeline_run$/i,
  /^pipeline_run_id$/i,
  /^ai_value_objects$/i,
  /^executive_packet$/i,
  /^data_spine_readiness$/i,
  /^real_data_intake_packet_run$/i,
  /^pilot_intake_run$/i,
  /^client_evidence_entries$/i,
  /^source_packages$/i,
  /^evidence_collection_assembly$/i,
  /^evidence_snapshot$/i,
  /^claim_readiness_handoff$/i,
  /^executive_readout_snapshot$/i,
  /^html_readout$/i,
  /^api_export$/i,
  /^customer_share_package$/i,
  /^reportability_readiness$/i,
  /^payload_json$/i,
  /^validation_json$/i,
  /^source_refs_json$/i,
  /^blueprint_path_binding_json$/i,
  /^persisted$/i,
  /^creates_(?:migrations|prisma_schema|schemas|backend_routes?|frontend_ui|ingestion_jobs|repositories|routes|ui)$/i,
  /^runs_(?:bigquery|sigma|glean_query|customer_connectors|live_connectors)$/i,
  /^ingestion_job$/i,
  /^backend_routes?$/i,
  /^backend_route$/i,
  /^frontend_ui$/i,
  /^persistence_table$/i,
  /^schema_ref$/i,
  /^output_dir$/i,
  /^dogfood_output_dir$/i
];

const UNSAFE_VALUE_PATTERNS = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /select.*from/i,
  /\bselect\b.+\bfrom\b/i,
  /query_?text/i,
  /\bquery[_\s-]?text\b/i,
  /sql_?text/i,
  /\bsql[_\s-]?text\b/i,
  /bigquery_?sql/i,
  /\bbigquery[_\s-]?sql\b/i,
  /raw_?(?:row|rows|prompt|response|transcript|content|file|export|event)/i,
  /raw_?data/i,
  /\braw[_\s-]?(?:row|rows|prompt|response|transcript|content|file|export|event|data)\b/i,
  /(?:user|person|employee|respondent)_?(?:id|uuid|email|name|identifier|key)/i,
  /\b(?:user|person|employee|respondent)[_\s-]?(?:id|uuid|email|name|identifier|key)\b/i,
  /(?:^|_)roi(?:_|$)/i,
  /return_?on_?investment/i,
  /dollarized_?(?:value|impact|amount|output)/i,
  /\b(?:roi|return on investment|dollarized value|ebita|ebitda|financial attribution|financial output)\b/i,
  /(?:^|_)(?:confidence|probability|p_value)(?:_|$)/i,
  /\b(?:confidence|probability|p-value|p_value)\b/i,
  /\b(?:causality|causal proof|productivity lift|productivity claim)\b/i,
  /casuality/i,
  /\b(?:ai_value_objects|executive_packet|executive readout|html readout|api export)\b/i,
  /customer_?share_?package/i,
  /customer_?facing/i,
  /finance_?context/i,
  /finance_?review/i,
  /live_?connector/i,
  /\b(?:live connector|runs bigquery|runs sigma|runs glean)\b/i
];

const UNSAFE_PRIVACY_FLAGS = [
  "contains_direct_identifiers",
  "contains_raw_content",
  "contains_raw_rows",
  "contains_raw_files",
  "contains_raw_prompts",
  "contains_raw_responses",
  "contains_transcripts",
  "contains_query_text",
  "contains_file_contents",
  "contains_person_level_productivity",
  "contains_person_level_hris_records",
  "contains_hashed_or_joinable_person_identifiers",
  "contains_manager_or_team_ranking",
  "contains_people_decisioning",
  "contains_compensation_or_performance_inference",
  "contains_promotion_or_discipline_inference",
  "contains_attrition_prediction",
  "contains_hris_inference_from_ai_usage"
];

function deepClone(value) {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value));
}

function normalizeKey(value) {
  return String(value ?? "")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function stringsOf(value) {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean))];
}

function hashReviewedSourceRefs(refs) {
  const canonicalRefs = Object.fromEntries(
    REVIEWED_SOURCE_REF_LANES.map((lane) => [lane, refs?.[lane] ?? null])
  );
  return createHash("sha256")
    .update(JSON.stringify(canonicalRefs))
    .digest("hex");
}

function sourceRefIsSafe(value) {
  return typeof value === "string" &&
    SAFE_SOURCE_REF_PATTERN.test(value) &&
    value.length <= 160;
}

function sourceRefIsSafeForLane(lane, value) {
  return sourceRefIsSafe(value) &&
    (LANE_SOURCE_REF_PATTERNS[lane]?.test(value) ?? true);
}

function collectReviewedSourceRefsShapeGaps(refs, pathPrefix) {
  const gaps = [];
  if (!refs || typeof refs !== "object" || Array.isArray(refs)) {
    gaps.push(`${pathPrefix} must be an object`);
    return gaps;
  }
  for (const key of Object.keys(refs)) {
    if (!REVIEWED_SOURCE_REF_LANES.includes(key)) {
      gaps.push(`${pathPrefix}.${key} is not an allowed reviewed source lane`);
    }
  }
  for (const lane of REVIEWED_SOURCE_REF_LANES) {
    if (!refs[lane]) {
      gaps.push(`${pathPrefix}.${lane} is required`);
    } else if (!sourceRefIsSafeForLane(lane, refs[lane])) {
      gaps.push(`${pathPrefix}.${lane} must be a safe lane-bound reviewed source ref`);
    }
  }
  return gaps;
}

function falseFeeds(internalFixtureReview = false) {
  return {
    internal_fixture_review: internalFixtureReview,
    ...Object.fromEntries(REQUIRED_FALSE_FEEDS.map((field) => [field, false]))
  };
}

function boundaryPolicy() {
  return Object.fromEntries(
    REQUIRED_FALSE_BOUNDARY_FIELDS.map((field) => [field, false])
  );
}

function isFalseFeedOrBoundary(path, value) {
  if (value !== false) return false;
  const normalized = path.map(normalizeKey);
  return normalized[0] === "feeds" ||
    normalized[0] === "boundary_policy" ||
    normalized.includes("privacy_boundary") ||
    normalized.includes("persistence_policy") ||
    normalized.includes("value_proof_policy");
}

function pathIsValueExempt(path) {
  const normalizedParts = path.map(normalizeKey);
  if (
    normalizedParts.includes("blocked_uses") ||
    normalizedParts.includes("blocked_claims") ||
    normalizedParts.includes("required_caveats")
  ) {
    return true;
  }
  const normalizedPath = normalizedParts.join(".");
  return [...EXEMPT_VALUE_PATHS].some((exempt) =>
    normalizedPath === exempt || normalizedPath.startsWith(`${exempt}.`)
  );
}

function isValidationSummaryGapPath(path) {
  const normalizedParts = path.map(normalizeKey);
  return normalizedParts[0] === "validation_summary" &&
    normalizedParts[1] === "gaps";
}

function privacyTextLeaksUnsafeValue(value) {
  return [
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
    /select.*from/i,
    /\braw\s+(?:transcript|prompt|response|content|row|rows|data)\b/i,
    /\b(?:prompt|transcript|query text|sql text):/i,
    /\b(?:user|person|employee|respondent)[_\s-]?(?:id|uuid|email|name|identifier|key)\b/i
  ].some((pattern) => pattern.test(value));
}

function validationGapLeaksUnsafeValue(value) {
  return [
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
    /select.*from/i,
    /\braw\s+(?:transcript|prompt|response|content|row|rows|data)\b/i,
    /\b(?:prompt|transcript|query text|sql text):/i
  ].some((pattern) => pattern.test(value));
}

function collectUnsafeFields(value, path = [], gaps = []) {
  if (!value || typeof value !== "object") return gaps;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectUnsafeFields(item, [...path, String(index)], gaps)
    );
    return gaps;
  }
  for (const [key, nested] of Object.entries(value)) {
    const currentPath = [...path, key];
    const normalized = normalizeKey(key);
    const normalizedPath = currentPath.map(normalizeKey).join("_");
    if (
      !isFalseFeedOrBoundary(currentPath, nested) &&
      !["blocked_uses"].includes(normalized) &&
      FORBIDDEN_FIELD_PATTERNS.some((pattern) =>
        pattern.test(key) || pattern.test(normalized) || pattern.test(normalizedPath)
      )
    ) {
      gaps.push(`Forbidden field detected: ${currentPath.join(".")}`);
    }
    collectUnsafeFields(nested, currentPath, gaps);
  }
  return gaps;
}

function collectUnsafeValues(value, path = [], gaps = []) {
  if (typeof value === "string") {
    const normalizedValue = normalizeKey(value);
    if (isValidationSummaryGapPath(path)) {
      if (validationGapLeaksUnsafeValue(value)) {
        gaps.push(`Unsafe validation gap value detected: ${path.join(".")}`);
      }
      return gaps;
    }
    if (path.map(normalizeKey).includes("blocked_uses")) {
      if (privacyTextLeaksUnsafeValue(value)) {
        gaps.push(`Unsafe blocked use value detected: ${path.join(".")}`);
      }
      return gaps;
    }
    if (
      !pathIsValueExempt(path) &&
      UNSAFE_VALUE_PATTERNS.some((pattern) =>
        pattern.test(value) || pattern.test(normalizedValue)
      )
    ) {
      gaps.push(`Unsafe value detected: ${path.join(".") || "value"}`);
    }
    return gaps;
  }
  if (!value || typeof value !== "object") return gaps;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectUnsafeValues(item, [...path, String(index)], gaps)
    );
    return gaps;
  }
  for (const [key, nested] of Object.entries(value)) {
    collectUnsafeValues(nested, [...path, key], gaps);
  }
  return gaps;
}

function collectUnsafePrivacyTextValues(value, path = [], gaps = []) {
  if (typeof value === "string") {
    if (privacyTextLeaksUnsafeValue(value)) {
      gaps.push(`Unsafe privacy text detected: ${path.join(".") || "value"}`);
    }
    return gaps;
  }
  if (!value || typeof value !== "object") return gaps;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectUnsafePrivacyTextValues(item, [...path, String(index)], gaps)
    );
    return gaps;
  }
  for (const [key, nested] of Object.entries(value)) {
    collectUnsafePrivacyTextValues(nested, [...path, key], gaps);
  }
  return gaps;
}

function collectConnectorStatusGaps(value, path = [], gaps = []) {
  if (!value || typeof value !== "object") return gaps;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectConnectorStatusGaps(item, [...path, String(index)], gaps)
    );
    return gaps;
  }
  for (const [key, nested] of Object.entries(value)) {
    const currentPath = [...path, key];
    if (normalizeKey(key) === "connector_status") {
      const normalized = normalizeKey(nested);
      if (
        nested !== null &&
        nested !== undefined &&
        !["scrubbed_export_only", "aggregate_export_only", "not_applicable", "none"].includes(normalized)
      ) {
        gaps.push(`Unsafe connector_status detected: ${currentPath.join(".")}`);
      }
    }
    collectConnectorStatusGaps(nested, currentPath, gaps);
  }
  return gaps;
}

function collectFixtureShapeGaps(fixture) {
  const gaps = [];
  if (!fixture || typeof fixture !== "object" || Array.isArray(fixture)) {
    return ["controlled aggregate fixture must be an object"];
  }
  if (fixture.schema_version !== FIXTURE_SCHEMA_VERSION) {
    gaps.push(`schema_version must be ${FIXTURE_SCHEMA_VERSION}`);
  }
  for (const field of ["fixture_id", "run_id", "generated_at", "measurement_plan_path"]) {
    if (!fixture[field]) gaps.push(`${field} is required`);
  }
  if (!fixture.data_spine_input && !fixture.data_spine_readiness) {
    gaps.push("data_spine_input or data_spine_readiness is required");
  }
  if (!Array.isArray(fixture.scrubbed_glean_exports)) {
    gaps.push("scrubbed_glean_exports must be an array");
  }
  for (const field of Object.keys(fixture)) {
    if (!ALLOWED_FIXTURE_FIELDS.has(field)) {
      gaps.push(`Unsupported controlled aggregate fixture field: ${field}`);
    }
  }
  return gaps;
}

function sourceReadinessFromInput(dataSpineInput) {
  const sources = normalizeSourceLanes(dataSpineInput?.sources ?? {});
  return {
    blueprint: sources.blueprint ?? null,
    ai_fluency: sources.aiFluency ?? null,
    vbd_token: sources.vbdToken ?? null,
    customer_metric: sources.customerMetric ?? null,
    assumption: sources.assumption ?? null,
    governance: sources.governance ?? null
  };
}

function normalizeSourceLanes(sources = {}) {
  return {
    blueprint: sources.blueprint ?? null,
    aiFluency: sources.aiFluency ?? sources.ai_fluency ?? null,
    vbdToken: sources.vbdToken ?? sources.vbd_token ?? null,
    customerMetric: sources.customerMetric ?? sources.customer_metric ?? null,
    assumption: sources.assumption ?? null,
    governance: sources.governance ?? null
  };
}

function dataSpineInputFromFixture(fixture) {
  return fixture.data_spine_input ?? {
    org_id: fixture.data_spine_readiness?.org_id,
    client_id: fixture.data_spine_readiness?.client_id,
    workflow_family: fixture.data_spine_readiness?.workflow_family,
    function_area: fixture.data_spine_readiness?.function_area,
    cohort_key: fixture.data_spine_readiness?.cohort_key,
    baseline_window: fixture.data_spine_readiness?.baseline_window,
    comparison_window: fixture.data_spine_readiness?.comparison_window,
    sources: fixture.data_spine_readiness?.source_readiness
  };
}

function buildDataSpineFromFixture(fixture) {
  const input = dataSpineInputFromFixture(fixture);
  return buildDataSpineIntakeReadiness({
    orgId: input.org_id,
    clientId: input.client_id,
    workflowFamily: input.workflow_family,
    functionArea: input.function_area,
    cohortKey: input.cohort_key,
    baselineWindow: input.baseline_window,
    comparisonWindow: input.comparison_window,
    sources: normalizeSourceLanes(input.sources),
    generatedAt: fixture.generated_at
  });
}

function sourceReadinessOfFixture(fixture, dataSpine = null) {
  return dataSpine?.source_readiness ??
    fixture.data_spine_readiness?.source_readiness ??
    sourceReadinessFromInput(fixture.data_spine_input);
}

function exportByLayer(exports, layer) {
  return exports.find((item) => item?.evidence_layer === layer) ?? null;
}

function aggregateRefOf(exportRecord, layer) {
  if (!exportRecord) return null;
  if (layer === "layer_2_user_voice_empirical") {
    return exportRecord.aggregate_export_id ??
      exportRecord.source_refs?.aggregate_export_id ??
      exportRecord.aggregate_probe_id ??
      exportRecord.source_refs?.aggregate_probe_id ??
      null;
  }
  if (layer === "layer_3_business_system_outcomes") {
    return exportRecord.aggregate_outcome_export_id ??
      exportRecord.source_refs?.aggregate_outcome_export_id ??
      exportRecord.aggregate_probe_id ??
      exportRecord.source_refs?.aggregate_probe_id ??
      null;
  }
  if (layer === "governance_evidence") {
    return exportRecord.governance_control_export_id ??
      exportRecord.source_refs?.governance_control_export_id ??
      exportRecord.aggregate_probe_id ??
      exportRecord.source_refs?.aggregate_probe_id ??
      null;
  }
  if (layer === "assumption_evidence") {
    return exportRecord.assumption_approval_export_id ??
      exportRecord.source_refs?.assumption_approval_export_id ??
      exportRecord.aggregate_probe_id ??
      exportRecord.source_refs?.aggregate_probe_id ??
      null;
  }
  return exportRecord.aggregate_probe_id ??
    exportRecord.source_refs?.aggregate_probe_id ??
    null;
}

function collectSourceAlignmentGaps(fixture) {
  const gaps = [];
  const sources = sourceReadinessOfFixture(fixture);
  const exports = fixture.scrubbed_glean_exports ?? [];
  const checks = [
    {
      layer: "layer_1_platform_telemetry",
      lane: "vbd_token",
      label: "vbd_token",
      expected: sources.vbd_token?.source_ref
    },
    {
      layer: "layer_2_user_voice_empirical",
      lane: "ai_fluency",
      label: "ai_fluency",
      expected: sources.ai_fluency?.source_ref
    },
    {
      layer: "layer_3_business_system_outcomes",
      lane: "customer_metric",
      label: "customer_metric",
      expected: sources.customer_metric?.source_ref
    },
    {
      layer: "governance_evidence",
      lane: "governance",
      label: "governance",
      expected: sources.governance?.source_ref
    },
    {
      layer: "assumption_evidence",
      lane: "assumption",
      label: "assumption",
      expected: sources.assumption?.source_ref
    }
  ];
  for (const check of checks) {
    const exportRecord = exportByLayer(exports, check.layer);
    const actual = aggregateRefOf(exportRecord, check.layer);
    if (!exportRecord) {
      gaps.push(`${check.layer} export is required`);
      continue;
    }
    if (actual !== check.expected) {
      gaps.push(`${check.layer} aggregate ref must match Data Spine ${check.label} source_ref`);
    }
  }
  return gaps;
}

function collectExpectedSourceRefGaps(fixture, dataSpine) {
  const gaps = [];
  const expected = fixture.expected?.reviewed_source_refs;
  if (!expected || typeof expected !== "object" || Array.isArray(expected)) {
    return ["expected.reviewed_source_refs is required"];
  }
  gaps.push(...collectReviewedSourceRefsShapeGaps(expected, "expected.reviewed_source_refs"));
  const actual = packageRefsFromDataSpine(dataSpine);
  for (const lane of REVIEWED_SOURCE_REF_LANES) {
    if (!expected[lane]) {
      gaps.push(`expected.reviewed_source_refs.${lane} is required`);
    } else if (expected[lane] !== actual[lane]) {
      gaps.push(`expected.reviewed_source_refs.${lane} must match Data Spine ${lane} source_ref`);
    }
  }
  return gaps;
}

function collectDataSpinePreflightGaps(dataSpine) {
  const gaps = [];
  const sources = dataSpine?.source_readiness ?? {};
  for (const lane of REVIEWED_SOURCE_REF_LANES) {
    const source = sources[lane];
    const path = `data_spine_input.sources.${lane}`;
    if (!source) {
      gaps.push(`${path} is required`);
      continue;
    }
    if (source.state !== "present") {
      gaps.push(`${path}.state must be present`);
    }
    if (!source.source_ref) {
      gaps.push(`${path}.source_ref is required`);
    } else if (!sourceRefIsSafeForLane(lane, source.source_ref)) {
      gaps.push(`${path}.source_ref must be a safe lane-bound reviewed source ref`);
    }
    if (!source.owner_role) {
      gaps.push(`${path}.owner_role is required`);
    }
    if (lane === "customer_metric" && !source.metric_id) {
      gaps.push(`${path}.metric_id is required`);
    }
    if (source.owner_approval_state !== "approved") {
      gaps.push(`${path}.owner_approval_state must be approved`);
    }
    if (source.review_state !== "clear") {
      gaps.push(`${path}.review_state must be clear`);
    }
    if (source.aggregate_only !== true) {
      gaps.push(`${path}.aggregate_only must be true`);
    }
    if (source.aligned !== true) {
      gaps.push(`${path}.aligned must be true`);
    }
  }
  return gaps;
}

function collectReviewConsistencyGaps(review) {
  const gaps = [];
  const state = String(review.review_state ?? "");
  const nextGate = review.internal_review_package?.next_gate;
  const validationSummary = review.validation_summary ?? {};
  const reviewedSourceRefs = review.internal_review_package?.reviewed_source_refs;
  const reviewedSourceRefsHash = review.internal_review_package?.reviewed_source_refs_hash;

  if (state === "PASSED_INTERNAL_FIXTURE_REVIEW") {
    if (review.engine_executed !== true) {
      gaps.push("engine_executed must be true for PASSED_INTERNAL_FIXTURE_REVIEW");
    }
    if (review.engine_decision !== "READY_FOR_MEASUREMENT_CELL_ASSEMBLY") {
      gaps.push("engine_decision must be READY_FOR_MEASUREMENT_CELL_ASSEMBLY for PASSED_INTERNAL_FIXTURE_REVIEW");
    }
    if (validationSummary.fixture_valid !== true) {
      gaps.push("validation_summary.fixture_valid must be true for PASSED_INTERNAL_FIXTURE_REVIEW");
    }
    if (validationSummary.real_data_intake_valid !== true) {
      gaps.push("validation_summary.real_data_intake_valid must be true for PASSED_INTERNAL_FIXTURE_REVIEW");
    }
    if (validationSummary.pilot_intake_valid !== true) {
      gaps.push("validation_summary.pilot_intake_valid must be true for PASSED_INTERNAL_FIXTURE_REVIEW");
    }
    if (Array.isArray(validationSummary.gaps) && validationSummary.gaps.length > 0) {
      gaps.push("validation_summary.gaps must be empty for PASSED_INTERNAL_FIXTURE_REVIEW");
    }
    if (
      Array.isArray(validationSummary.missing_evidence) &&
      validationSummary.missing_evidence.length > 0
    ) {
      gaps.push("validation_summary.missing_evidence must be empty for PASSED_INTERNAL_FIXTURE_REVIEW");
    }
    if (nextGate !== "measurement_cell_assembly_candidate_only") {
      gaps.push("internal_review_package.next_gate must be measurement_cell_assembly_candidate_only for PASSED_INTERNAL_FIXTURE_REVIEW");
    }
    if (!review.run_ref?.real_data_intake_run_id) {
      gaps.push("run_ref.real_data_intake_run_id is required for PASSED_INTERNAL_FIXTURE_REVIEW");
    }
    if (!review.run_ref?.pilot_intake_run_id) {
      gaps.push("run_ref.pilot_intake_run_id is required for PASSED_INTERNAL_FIXTURE_REVIEW");
    }
    if (!review.run_ref?.measurement_plan_id) {
      gaps.push("run_ref.measurement_plan_id is required for PASSED_INTERNAL_FIXTURE_REVIEW");
    }
    if (
      !reviewedSourceRefs ||
      typeof reviewedSourceRefs !== "object" ||
      Array.isArray(reviewedSourceRefs)
    ) {
      gaps.push("internal_review_package.reviewed_source_refs is required for PASSED_INTERNAL_FIXTURE_REVIEW");
    } else {
      gaps.push(
        ...collectReviewedSourceRefsShapeGaps(
          reviewedSourceRefs,
          "internal_review_package.reviewed_source_refs"
        )
      );
      for (const lane of REVIEWED_SOURCE_REF_LANES) {
        if (!reviewedSourceRefs[lane]) {
          gaps.push(`internal_review_package.reviewed_source_refs.${lane} is required for PASSED_INTERNAL_FIXTURE_REVIEW`);
        }
      }
      if (reviewedSourceRefsHash !== hashReviewedSourceRefs(reviewedSourceRefs)) {
        gaps.push("internal_review_package.reviewed_source_refs_hash must match reviewed_source_refs for PASSED_INTERNAL_FIXTURE_REVIEW");
      }
    }
  }

  if (["HELD_FOR_DATA_SPINE", "HELD_FOR_SUPPRESSED_AGGREGATE_TELEMETRY"].includes(state)) {
    if (review.engine_executed !== false) {
      gaps.push("engine_executed must be false when review is held before engine execution");
    }
    if (review.engine_decision !== null) {
      gaps.push("engine_decision must be null when review is held before engine execution");
    }
    if (review.run_ref?.real_data_intake_run_id !== null) {
      gaps.push("run_ref.real_data_intake_run_id must be null when review is held before engine execution");
    }
    if (review.run_ref?.pilot_intake_run_id !== null) {
      gaps.push("run_ref.pilot_intake_run_id must be null when review is held before engine execution");
    }
    if (review.run_ref?.measurement_plan_id !== null) {
      gaps.push("run_ref.measurement_plan_id must be null when review is held before engine execution");
    }
    if (validationSummary.fixture_valid !== false) {
      gaps.push("validation_summary.fixture_valid must be false when review is held before engine execution");
    }
    if (validationSummary.real_data_intake_valid !== false) {
      gaps.push("validation_summary.real_data_intake_valid must be false when review is held before engine execution");
    }
    if (validationSummary.pilot_intake_valid !== false) {
      gaps.push("validation_summary.pilot_intake_valid must be false when review is held before engine execution");
    }
    if (validationSummary.source_package_count !== 0) {
      gaps.push("validation_summary.source_package_count must be 0 when review is held before engine execution");
    }
    if (reviewedSourceRefsHash !== null) {
      gaps.push("internal_review_package.reviewed_source_refs_hash must be null when review is held before engine execution");
    }
  }

  if (state === "BLOCKED") {
    if (review.engine_executed === false) {
      if (review.engine_decision !== null) {
        gaps.push("engine_decision must be null when BLOCKED before engine execution");
      }
      if (nextGate !== "fix_fixture_before_engine_execution") {
        gaps.push("internal_review_package.next_gate must be fix_fixture_before_engine_execution for pre-engine BLOCKED");
      }
      if (review.run_ref?.real_data_intake_run_id !== null) {
        gaps.push("run_ref.real_data_intake_run_id must be null when BLOCKED before engine execution");
      }
      if (review.run_ref?.pilot_intake_run_id !== null) {
        gaps.push("run_ref.pilot_intake_run_id must be null when BLOCKED before engine execution");
      }
      if (review.run_ref?.measurement_plan_id !== null) {
        gaps.push("run_ref.measurement_plan_id must be null when BLOCKED before engine execution");
      }
      if (review.run_ref?.org_id !== null) {
        gaps.push("run_ref.org_id must be null when BLOCKED before engine execution");
      }
      if (review.run_ref?.client_id !== null) {
        gaps.push("run_ref.client_id must be null when BLOCKED before engine execution");
      }
      if (review.run_ref?.workflow_family !== null) {
        gaps.push("run_ref.workflow_family must be null when BLOCKED before engine execution");
      }
      if (validationSummary.fixture_valid !== false) {
        gaps.push("validation_summary.fixture_valid must be false when BLOCKED before engine execution");
      }
      if (validationSummary.real_data_intake_valid !== false) {
        gaps.push("validation_summary.real_data_intake_valid must be false when BLOCKED before engine execution");
      }
      if (validationSummary.pilot_intake_valid !== false) {
        gaps.push("validation_summary.pilot_intake_valid must be false when BLOCKED before engine execution");
      }
      if (validationSummary.source_package_count !== 0) {
        gaps.push("validation_summary.source_package_count must be 0 when BLOCKED before engine execution");
      }
      if (
        reviewedSourceRefs &&
        typeof reviewedSourceRefs === "object" &&
        !Array.isArray(reviewedSourceRefs) &&
        Object.keys(reviewedSourceRefs).length > 0
      ) {
        gaps.push("internal_review_package.reviewed_source_refs must be empty when BLOCKED before engine execution");
      }
      if (reviewedSourceRefsHash !== null) {
        gaps.push("internal_review_package.reviewed_source_refs_hash must be null when BLOCKED before engine execution");
      }
    } else if (review.engine_executed === true) {
      if (review.engine_decision !== "BLOCKED") {
        gaps.push("engine_decision must be BLOCKED when review is BLOCKED after engine execution");
      }
      if (nextGate !== "fix_fixture_before_measurement_cell_assembly") {
        gaps.push("internal_review_package.next_gate must be fix_fixture_before_measurement_cell_assembly for post-engine BLOCKED");
      }
      if (!review.run_ref?.real_data_intake_run_id) {
        gaps.push("run_ref.real_data_intake_run_id is required when BLOCKED after engine execution");
      }
      if (validationSummary.real_data_intake_valid !== false) {
        gaps.push("validation_summary.real_data_intake_valid must be false when BLOCKED after engine execution");
      }
      if (
        reviewedSourceRefs &&
        typeof reviewedSourceRefs === "object" &&
        !Array.isArray(reviewedSourceRefs) &&
        reviewedSourceRefsHash !== hashReviewedSourceRefs(reviewedSourceRefs)
      ) {
        gaps.push("internal_review_package.reviewed_source_refs_hash must match reviewed_source_refs when BLOCKED after engine execution");
      }
      if (
        reviewedSourceRefs &&
        typeof reviewedSourceRefs === "object" &&
        !Array.isArray(reviewedSourceRefs)
      ) {
        gaps.push(
          ...collectReviewedSourceRefsShapeGaps(
            reviewedSourceRefs,
            "internal_review_package.reviewed_source_refs"
          )
        );
      }
    } else {
      gaps.push("engine_executed must be boolean for BLOCKED review");
    }
  }

  if (state === "HELD_FOR_DATA_SPINE" && nextGate !== "fix_data_spine_before_engine_execution") {
    gaps.push("internal_review_package.next_gate must be fix_data_spine_before_engine_execution for HELD_FOR_DATA_SPINE");
  }

  if (
    state === "HELD_FOR_SUPPRESSED_AGGREGATE_TELEMETRY" &&
    nextGate !== "fix_aggregate_telemetry_before_engine_execution"
  ) {
    gaps.push("internal_review_package.next_gate must be fix_aggregate_telemetry_before_engine_execution for HELD_FOR_SUPPRESSED_AGGREGATE_TELEMETRY");
  }

  return gaps;
}

function collectSuppressedAggregateGaps(fixture) {
  const gaps = [];
  const finiteRequiredNumber = (value) => {
    if (
      value === null ||
      value === undefined ||
      typeof value === "boolean" ||
      (typeof value === "string" && value.trim() === "")
    ) {
      return null;
    }
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  };
  for (const [index, exportRecord] of (fixture.scrubbed_glean_exports ?? []).entries()) {
    const prefix = `scrubbed_glean_exports.${index}`;
    const evidenceState = String(exportRecord?.evidence_state ?? "");
    if (!["present"].includes(evidenceState)) {
      gaps.push(`${prefix}.evidence_state must be present`);
    }
    if (exportRecord?.k_min_posture?.cohort_threshold_met !== true) {
      gaps.push(`${prefix}.k_min_posture.cohort_threshold_met must be true`);
    }
    const suppressedValue = exportRecord?.k_min_posture?.suppressed_or_unknown_slices;
    const suppressed = finiteRequiredNumber(suppressedValue);
    if (suppressed === null) {
      gaps.push(`${prefix}.k_min_posture.suppressed_or_unknown_slices is required`);
    } else if (suppressed > 0) {
      gaps.push(`${prefix}.k_min_posture.suppressed_or_unknown_slices must be 0`);
    }
    if (exportRecord?.evidence_layer === "layer_1_platform_telemetry") {
      if (!exportRecord?.vbd_summary || typeof exportRecord.vbd_summary !== "object") {
        gaps.push(`${prefix}.vbd_summary is required`);
      } else {
        if (finiteRequiredNumber(exportRecord.vbd_summary.baseline_index) === null) {
          gaps.push(`${prefix}.vbd_summary.baseline_index is required`);
        }
        if (finiteRequiredNumber(exportRecord.vbd_summary.comparison_index) === null) {
          gaps.push(`${prefix}.vbd_summary.comparison_index is required`);
        }
        if (exportRecord.vbd_summary.aggregate_only !== true) {
          gaps.push(`${prefix}.vbd_summary.aggregate_only must be true`);
        }
      }
    } else {
      if (exportRecord?.metric_or_signal_summary?.aggregate_value_present !== true) {
        gaps.push(`${prefix}.metric_or_signal_summary.aggregate_value_present must be true`);
      }
    }
    for (const flag of UNSAFE_PRIVACY_FLAGS) {
      if (exportRecord?.privacy_boundary?.[flag] !== false) {
        gaps.push(`${prefix}.privacy_boundary.${flag} must be false`);
      }
    }
  }
  return gaps;
}

function loadMeasurementPlan(fixture, cwd = process.cwd(), override = null) {
  if (override) return deepClone(override);
  if (fixture.measurement_plan) return deepClone(fixture.measurement_plan);
  const planPath = resolve(cwd, fixture.measurement_plan_path);
  return JSON.parse(readFileSync(planPath, "utf8"));
}

function packageRefsFromDataSpine(dataSpine) {
  const sources = dataSpine?.source_readiness ?? {};
  return {
    blueprint: sources.blueprint?.source_ref ?? null,
    ai_fluency: sources.ai_fluency?.source_ref ?? null,
    vbd_token: sources.vbd_token?.source_ref ?? null,
    customer_metric: sources.customer_metric?.source_ref ?? null,
    assumption: sources.assumption?.source_ref ?? null,
    governance: sources.governance?.source_ref ?? null
  };
}

function reviewStateFor({
  unsafeGaps,
  suppressedGaps,
  alignmentGaps,
  realDataValidation,
  pilotValidation,
  engineDecision
}) {
  if (unsafeGaps.length > 0 || alignmentGaps.length > 0) return "BLOCKED";
  if (suppressedGaps.length > 0) return "HELD_FOR_SUPPRESSED_AGGREGATE_TELEMETRY";
  if (engineDecision === "BLOCKED") return "BLOCKED";
  if (engineDecision === "HELD_FOR_DATA_SPINE") return "HELD_FOR_DATA_SPINE";
  if (realDataValidation?.valid && pilotValidation?.valid) {
    return "PASSED_INTERNAL_FIXTURE_REVIEW";
  }
  return "HELD_FOR_EVIDENCE_INPUTS";
}

function blockedReview(
  fixture,
  reviewState,
  gaps,
  nextGate = "fix_fixture_before_engine_execution"
) {
  return {
    schema_version: CONTROLLED_AGGREGATE_FIXTURE_REVIEW_SCHEMA_VERSION,
    fixture_id: fixture?.fixture_id ?? null,
    review_state: reviewState,
    engine_decision: null,
    engine_executed: false,
    run_ref: {
      real_data_intake_run_id: null,
      pilot_intake_run_id: null,
      measurement_plan_id: null,
      org_id: null,
      client_id: null,
      workflow_family: null
    },
    validation_summary: {
      fixture_valid: false,
      real_data_intake_valid: false,
      pilot_intake_valid: false,
      source_package_count: 0,
      gaps: uniqueStrings(gaps),
      missing_evidence: []
    },
    internal_review_package: {
      package_scope: "controlled_aggregate_fixture_review_only",
      next_gate: nextGate,
      evidence_layers: [],
      reviewed_source_refs: {},
      reviewed_source_refs_hash: null,
      blocked_claims: [...REQUIRED_BLOCKED_USES]
    },
    feeds: falseFeeds(false),
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    boundary_policy: boundaryPolicy(),
    required_caveats: requiredCaveats(),
    generated_at: fixture?.generated_at ?? new Date(0).toISOString(),
    derivation_version: DERIVATION_VERSION
  };
}

function requiredCaveats() {
  return [
    "Controlled Aggregate Fixture Review is an in-memory test harness over saved aggregate fixtures only.",
    "The harness does not run BigQuery, Sigma, Glean queries, customer connectors, ingestion jobs, routes, UI, repositories, migrations, schemas, persistence writes, output-file writes, confidence models, probability models, ROI, EBITDA, causality, productivity, or customer-facing output.",
    "A passed review means the fixture can proceed to the next explicit Measurement Cell Assembly gate only; it does not clear Source Package Review Queue as durable proof or create a customer-safe readout."
  ];
}

export function runControlledAggregateFixtureReviewFromObject(
  fixture,
  options = {}
) {
  const shapeGaps = collectFixtureShapeGaps(fixture);
  const unsafeGaps = [
    ...collectUnsafeFields(fixture),
    ...collectUnsafeValues(fixture),
    ...collectConnectorStatusGaps(fixture)
  ];
  if (shapeGaps.length > 0 || unsafeGaps.length > 0) {
    return blockedReview(fixture, "BLOCKED", [...shapeGaps, ...unsafeGaps]);
  }

  let measurementPlan;
  let dataSpine;
  try {
    measurementPlan = loadMeasurementPlan(
      fixture,
      options.cwd,
      options.measurementPlanOverride
    );
    dataSpine = buildDataSpineFromFixture(fixture);
  } catch (error) {
    return blockedReview(fixture, "BLOCKED", [
      error instanceof Error ? error.message : String(error)
    ]);
  }

  const measurementPlanPrivacyGaps = collectUnsafePrivacyTextValues(
    measurementPlan,
    ["measurement_plan"]
  );
  if (measurementPlanPrivacyGaps.length > 0) {
    return blockedReview(fixture, "BLOCKED", measurementPlanPrivacyGaps);
  }

  const dataSpineValidation = validateDataSpineIntakeReadiness(dataSpine);
  if (!dataSpineValidation.valid) {
    return blockedReview(
      fixture,
      "BLOCKED",
      dataSpineValidation.gaps.map((gap) => `data_spine_readiness: ${gap}`)
    );
  }

  const dataSpinePreflightGaps = collectDataSpinePreflightGaps(dataSpine);
  if (dataSpinePreflightGaps.length > 0) {
    const unsafeSourceRef = dataSpinePreflightGaps.some((gap) =>
      gap.includes("safe lane-bound reviewed source ref")
    );
    return blockedReview(
      fixture,
      unsafeSourceRef ? "BLOCKED" : "HELD_FOR_DATA_SPINE",
      dataSpinePreflightGaps,
      unsafeSourceRef
        ? "fix_fixture_before_engine_execution"
        : "fix_data_spine_before_engine_execution"
    );
  }

  const expectedSourceRefGaps = collectExpectedSourceRefGaps(fixture, dataSpine);
  if (expectedSourceRefGaps.length > 0) {
    return blockedReview(fixture, "BLOCKED", expectedSourceRefGaps);
  }

  const alignmentGaps = collectSourceAlignmentGaps(fixture);
  if (alignmentGaps.length > 0) {
    return blockedReview(fixture, "BLOCKED", alignmentGaps);
  }

  const suppressedGaps = collectSuppressedAggregateGaps(fixture);
  if (suppressedGaps.length > 0) {
    return blockedReview(
      fixture,
      "HELD_FOR_SUPPRESSED_AGGREGATE_TELEMETRY",
      suppressedGaps,
      "fix_aggregate_telemetry_before_engine_execution"
    );
  }

  const run = buildRealDataIntakePacketRun({
    dataSpineReadiness: dataSpine,
    measurementPlan,
    scrubbedGleanExports: fixture.scrubbed_glean_exports,
    runId: fixture.run_id,
    generatedAt: fixture.generated_at
  });
  const realDataValidation = validateRealDataIntakePacketRun(run);
  const pilotValidation = run.pilot_intake_run
    ? validateAiValuePilotIntakeRun(run.pilot_intake_run)
    : null;
  const reviewState = reviewStateFor({
    unsafeGaps: [],
    suppressedGaps: [],
    alignmentGaps: [],
    realDataValidation,
    pilotValidation,
    engineDecision: run.decision
  });
  const realDataGaps = stringsOf(realDataValidation.gaps).map(
    (gap) => `real_data_intake_packet_run: ${gap}`
  );
  const pilotGaps = pilotValidation
    ? stringsOf(pilotValidation.gaps).map((gap) => `pilot_intake_run: ${gap}`)
    : [];
  const validationGaps = uniqueStrings([
    ...dataSpineValidation.gaps.map((gap) => `data_spine_readiness: ${gap}`),
    ...realDataGaps,
    ...pilotGaps
  ]);
  const sourcePackageCount = Array.isArray(run.pilot_intake_run?.source_packages)
    ? run.pilot_intake_run.source_packages.length
    : 0;
  const reviewedSourceRefs = packageRefsFromDataSpine(dataSpine);

  return {
    schema_version: CONTROLLED_AGGREGATE_FIXTURE_REVIEW_SCHEMA_VERSION,
    fixture_id: fixture.fixture_id,
    review_state: reviewState,
    engine_decision: run.decision,
    engine_executed: true,
    run_ref: {
      real_data_intake_run_id: run.run_id,
      pilot_intake_run_id: run.pilot_intake_run?.intake_run_id ?? null,
      measurement_plan_id: run.measurement_plan_id,
      org_id: run.org_id,
      client_id: run.client_id,
      workflow_family: run.workflow_family
    },
    validation_summary: {
      fixture_valid: validationGaps.length === 0,
      real_data_intake_valid: realDataValidation.valid === true,
      pilot_intake_valid: pilotValidation?.valid === true,
      source_package_count: sourcePackageCount,
      gaps: validationGaps,
      missing_evidence: uniqueStrings([
        ...stringsOf(run.missing_evidence),
        ...stringsOf(run.pilot_intake_run?.missing_evidence)
      ])
    },
    internal_review_package: {
      package_scope: "controlled_aggregate_fixture_review_only",
      next_gate:
        reviewState === "PASSED_INTERNAL_FIXTURE_REVIEW"
          ? "measurement_cell_assembly_candidate_only"
          : "fix_fixture_before_measurement_cell_assembly",
      evidence_layers: (fixture.scrubbed_glean_exports ?? []).map(
        (item) => item.evidence_layer
      ),
      source_package_count: sourcePackageCount,
      reviewed_source_refs: reviewedSourceRefs,
      reviewed_source_refs_hash: hashReviewedSourceRefs(reviewedSourceRefs),
      blocked_claims: [...REQUIRED_BLOCKED_USES]
    },
    feeds: falseFeeds(reviewState === "PASSED_INTERNAL_FIXTURE_REVIEW"),
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    boundary_policy: boundaryPolicy(),
    required_caveats: requiredCaveats(),
    generated_at: fixture.generated_at,
    derivation_version: DERIVATION_VERSION
  };
}

export function runControlledAggregateFixtureReview(path, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const fixture = JSON.parse(readFileSync(resolve(cwd, path), "utf8"));
  return runControlledAggregateFixtureReviewFromObject(fixture, { cwd });
}

export function validateControlledAggregateFixtureReview(review) {
  const gaps = [];
  if (!review || typeof review !== "object" || Array.isArray(review)) {
    return {
      schema_version: `${CONTROLLED_AGGREGATE_FIXTURE_REVIEW_SCHEMA_VERSION}_VALIDATION`,
      fixture_id: null,
      valid: false,
      gaps: ["controlled aggregate fixture review must be an object"]
    };
  }
  if (review.schema_version !== CONTROLLED_AGGREGATE_FIXTURE_REVIEW_SCHEMA_VERSION) {
    gaps.push(`schema_version must be ${CONTROLLED_AGGREGATE_FIXTURE_REVIEW_SCHEMA_VERSION}`);
  }
  if (!ALLOWED_REVIEW_STATES.has(String(review.review_state ?? ""))) {
    gaps.push(`review_state is invalid: ${review.review_state}`);
  }
  for (const field of Object.keys(review)) {
    if (!ALLOWED_REVIEW_FIELDS.has(field)) {
      gaps.push(`Unsupported controlled aggregate fixture review field: ${field}`);
    }
  }
  if (review.feeds?.internal_fixture_review !== (review.review_state === "PASSED_INTERNAL_FIXTURE_REVIEW")) {
    gaps.push("feeds.internal_fixture_review must match passed review state");
  }
  for (const feed of REQUIRED_FALSE_FEEDS) {
    if (review.feeds?.[feed] !== false) {
      gaps.push(`feeds.${feed} must be false`);
    }
  }
  for (const field of REQUIRED_FALSE_BOUNDARY_FIELDS) {
    if (review.boundary_policy?.[field] !== false) {
      gaps.push(`boundary_policy.${field} must be false`);
    }
  }
  for (const use of REQUIRED_BLOCKED_USES) {
    if (!stringsOf(review.blocked_uses).includes(use)) {
      gaps.push(`blocked_uses missing ${use}`);
    }
  }
  for (const gap of collectReviewConsistencyGaps(review)) {
    gaps.push(gap);
  }
  for (const gap of collectUnsafeFields(review)) {
    gaps.push(gap);
  }
  for (const gap of collectUnsafeValues(review)) {
    gaps.push(gap);
  }
  return {
    schema_version: `${CONTROLLED_AGGREGATE_FIXTURE_REVIEW_SCHEMA_VERSION}_VALIDATION`,
    fixture_id: review.fixture_id ?? null,
    valid: gaps.length === 0,
    gaps
  };
}

function printUsageAndExit() {
  console.error(
    "Usage: node scripts/run_ai_value_controlled_aggregate_fixture_review.mjs <fixture.json>"
  );
  process.exit(1);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
const currentPath = fileURLToPath(import.meta.url);
if (invokedPath === currentPath) {
  const fixturePath = process.argv[2];
  if (!fixturePath) printUsageAndExit();
  const review = runControlledAggregateFixtureReview(fixturePath);
  const validation = validateControlledAggregateFixtureReview(review);
  if (!validation.valid) {
    console.error(JSON.stringify(validation, null, 2));
    process.exitCode = 1;
  }
  console.log(JSON.stringify(review, null, 2));
}
