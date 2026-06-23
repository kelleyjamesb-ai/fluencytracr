#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildBlueprintExtractionDraft,
  buildBlueprintOperatorSourceHandoff,
  buildDataSpineIntakeReadiness,
  buildMeasurementCellAssemblyRun,
  buildRealDataIntakePacketRun,
  buildSourcePackageReviewQueue,
  validateMeasurementCellAssemblyRun
} from "../shared/dist/aiValueEngine/index.js";

import {
  runControlledAggregateFixtureReviewFromObject,
  validateControlledAggregateFixtureReview
} from "./run_ai_value_controlled_aggregate_fixture_review.mjs";

export const CONTROLLED_MEASUREMENT_CELL_ASSEMBLY_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTROLLED_MEASUREMENT_CELL_ASSEMBLY_2026_06";

const FIXTURE_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTROLLED_AGGREGATE_FIXTURE_2026_06";

const DERIVATION_VERSION =
  "ai_value_controlled_measurement_cell_assembly_2026_06";

const REVIEWED_SOURCE_REF_LANES = [
  "blueprint",
  "ai_fluency",
  "vbd_token",
  "customer_metric",
  "assumption",
  "governance"
];

const REQUIRED_FALSE_FEEDS = [
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
  "customer_facing_economic_output",
  "durable_pipeline_run_storage",
  "persistence",
  "backend_routes",
  "frontend_ui",
  "live_bigquery_execution",
  "live_sigma_execution",
  "live_glean_query"
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

const ALLOWED_ASSEMBLY_STATES = new Set([
  "PASSED_INTERNAL_MEASUREMENT_CELL_CANDIDATE_REVIEW",
  "HELD_FOR_CONTROLLED_AGGREGATE_REVIEW",
  "HELD_FOR_MEASUREMENT_CELL_ASSEMBLY",
  "BLOCKED"
]);

const ALLOWED_TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "fixture_id",
  "review_state",
  "assembly_state",
  "engine_executed",
  "candidate_integrity_hash",
  "review_ref",
  "assembly_ref",
  "validation_summary",
  "internal_candidate_metadata",
  "feeds",
  "blocked_uses",
  "boundary_policy",
  "required_caveats",
  "generated_at",
  "derivation_version"
]);

const ALLOWED_INTERNAL_METADATA_FIELDS = new Set([
  "measurement_plan_id",
  "org_id",
  "client_id",
  "workflow_family",
  "function_area",
  "cohort_key",
  "time_window_id",
  "measurement_cell_ref",
  "reviewed_source_refs_hash",
  "reviewed_aggregate_context_hash",
  "reviewed_blueprint_expectation_hash",
  "source_package_count",
  "selected_metric_id",
  "expectation_path_id",
  "assembly_decision",
  "missing_evidence",
  "fixture_id"
]);

const ALLOWED_REVIEW_REF_FIELDS = new Set([
  "controlled_review_state",
  "controlled_review_engine_decision",
  "real_data_intake_run_id",
  "pilot_intake_run_id",
  "measurement_plan_id",
  "reviewed_source_refs",
  "reviewed_source_refs_hash",
  "reviewed_aggregate_context_hash",
  "reviewed_blueprint_expectation_hash"
]);

const ALLOWED_ASSEMBLY_REF_FIELDS = new Set([
  "assembly_run_id",
  "assembly_decision",
  "measurement_cell_ref"
]);

const ALLOWED_VALIDATION_SUMMARY_FIELDS = new Set([
  "controlled_review_valid",
  "assembly_run_valid",
  "source_package_count",
  "gaps",
  "missing_evidence"
]);

const ALLOWED_FEED_FIELDS = new Set([
  "controlled_measurement_cell_assembly",
  "measurement_cell_candidate",
  ...REQUIRED_FALSE_FEEDS
]);

const FORBIDDEN_FIELD_PATTERNS = [
  /^raw_rows?$/i,
  /^rows$/i,
  /^events$/i,
  /^records$/i,
  /raw_(?:prompt|response|transcript|content|file|export|event|row|rows|data)/i,
  /^raw_data$/i,
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
  /^confidence$/i,
  /confidence/i,
  /^probability$/i,
  /probability/i,
  /contribution_probability/i,
  /contribution_likelihood/i,
  /^p_value$/i,
  /^roi$/i,
  /realized_roi/i,
  /roi_(?:value|amount|calculation|result|impact|output|proof)/i,
  /return_on_investment/i,
  /^ebita$/i,
  /^ebitda$/i,
  /ebitda_(?:value|amount|impact|calculation|result)/i,
  /financial_impact/i,
  /financial_attribution/i,
  /finance_context/i,
  /^financial_output$/i,
  /^customer_facing_output$/i,
  /^customer_facing_financial_output$/i,
  /^customer_facing_economic_output$/i,
  /causality_claim/i,
  /causal_proof/i,
  /productivity_claim/i,
  /productivity/i,
  /^pipeline_run$/i,
  /^pipeline_run_id$/i,
  /^ai_value_objects$/i,
  /^executive_packet$/i,
  /^measurement_plan(?:_(?:payload|object|data|json|input))?$/i,
  /^data_spine_readiness(?:_(?:payload|object|data|json|input))?$/i,
  /^source_package_review_queue(?:_(?:payload|object|data|json|input))?$/i,
  /^real_data_intake_packet_run(?:_(?:payload|object|data|json|input))?$/i,
  /^pilot_intake_run(?:_(?:payload|object|data|json|input))?$/i,
  /^client_evidence_entries(?:_(?:payload|object|data|json|input))?$/i,
  /^source_packages?(?:_(?:payload|object|data|json|input))?$/i,
  /^source_package_payload$/i,
  /^evidence_collection_assembly(?:_(?:payload|object|data|json|input))?$/i,
  /^evidence_snapshot(?:_(?:payload|object|data|json|input))?$/i,
  /^claim_readiness_handoff(?:_(?:payload|object|data|json|input))?$/i,
  /^blueprint_operator_source_handoff(?:_(?:payload|object|data|json|input))?$/i,
  /^measurement_cell_input(?:_(?:payload|object|data|json|input))?$/i,
  /^measurement_cell(?:_(?:payload|object|data|json|input))?$/i,
  /^measurement_cell_series(?:_(?:payload|object|data|json|input))?$/i,
  /finance_review/i,
  /^financial_driver$/i,
  /^payload_json$/i,
  /^validation_json$/i,
  /^source_refs_json$/i,
  /^blueprint_path_binding_json$/i,
  /^persisted$/i,
  /^creates_(?:migrations|prisma_schema|schemas|backend_routes?|frontend_ui|ingestion_jobs|repositories|routes|ui)$/i,
  /^runs_(?:bigquery|sigma|glean_query|customer_connectors|live_connectors)$/i,
  /^backend_routes?$/i,
  /^frontend_ui$/i,
  /^persistence_table$/i,
  /^schema_ref$/i
];

const UNSAFE_VALUE_PATTERNS = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /select.*from/i,
  /\bselect\b.+\bfrom\b/i,
  /query_?text/i,
  /sql_?text/i,
  /bigquery_?sql/i,
  /raw_?(?:row|rows|prompt|response|transcript|content|file|export|event|data)/i,
  /\b(?:prompt|transcript)\b/i,
  /(?:user|person|employee|respondent)_?(?:id|uuid|email|name|identifier|key)/i,
  /(?:^|_)roi(?:_|$)/i,
  /return_?on_?investment/i,
  /dollarized_?(?:value|impact|amount|output)/i,
  /\b(?:roi|return on investment|dollarized value|ebita|ebitda|financial attribution|financial output)\b/i,
  /(?:^|_)(?:confidence|probability|p_value)(?:_|$)/i,
  /\b(?:confidence|probability|p-value|p_value)\b/i,
  /\b(?:causality|causal proof|productivity lift|productivity claim)\b/i,
  /\b(?:ai_value_objects|executive_packet|executive readout|html readout|api export)\b/i,
  /customer_?share_?package/i,
  /customer_?facing/i,
  /finance_?context/i,
  /live_?connector/i,
  /\b(?:live connector|runs bigquery|runs sigma|runs glean)\b/i
];

const EXEMPT_VALUE_PATHS = new Set([
  "blocked_uses",
  "required_caveats",
  "validation_summary.gaps"
]);

const UNSAFE_TEXT_LEAK_PATTERNS = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /\$\s*\d/i,
  /select.*from/i,
  /\bselect\b.+\bfrom\b/i,
  /query_?text/i,
  /sql_?text/i,
  /bigquery_?sql/i,
  /\braw\s+(?:transcript|prompt|response|content|row|rows|data)\b/i,
  /\b(?:prompt|transcript|query text|sql text):/i,
  /\bprompt\s+text\b/i,
  /\b(?:user|person|employee|respondent)[_\s-]?(?:id|uuid|email|name|identifier|key)\s+[\w.-]+/i,
  /\b(?:roi|return on investment)\s+(?:ready|enabled|output|impact|amount|value|claim|\$|\d)/i,
  /\b(?:ebita|ebitda)\s+(?:ready|enabled|output|impact|amount|value|claim|\$|\d)/i,
  /\bfinance\s+context\s+investigation\s+(?:ready|enabled|allowed|authorized)/i,
  /\bcustomer\s+facing\s+(?:finance|financial|economic)\s+output\s+(?:ready|enabled|allowed|authorized)/i,
  /\bconfidence\s+(?:model|ready|enabled|score|percentage|percent|\d)/i,
  /\bprobability\s+(?:model|ready|enabled|output|score|percentage|percent|\d)/i,
  /\bproductivity\s+(?:ready|enabled|output|lift|claim|gain|impact|\d)/i
];

const ALLOWED_AGGREGATE_GRAINS = new Set([
  "org",
  "function",
  "workflow_family",
  "workflow",
  "role_family",
  "cohort",
  "custom_aggregate"
]);

const SOURCE_PACKAGE_REF_KEYS = {
  ai_fluency: "aggregate_export_id",
  vbd_token: "aggregate_probe_id",
  customer_metric: "aggregate_outcome_export_id",
  assumption: "assumption_approval_export_id",
  governance: "governance_control_export_id"
};

const SAFE_SOURCE_REF_PATTERN = /^[a-z][a-z0-9_]{2,159}$/;
const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/;

const LANE_SOURCE_REF_PATTERNS = {
  blueprint: /^(?:blueprint|blueprint_parse|blueprint_extraction_draft)_[a-z0-9_]{2,150}$/,
  ai_fluency: /^ai_fluency_[a-z0-9_]{2,150}$/,
  vbd_token: /^scrubbed_glean_vbd_token_[a-z0-9_]{2,150}$/,
  customer_metric: /^[a-z0-9_]*metric_[a-z0-9_]{2,150}$/,
  assumption: /^[a-z0-9_]*assumption_[a-z0-9_]{2,150}$/,
  governance: /^[a-z0-9_]*governance_[a-z0-9_]{2,150}$/
};

const BLUEPRINT_ASSUMPTIONS = [
  "case_mix_stability",
  "volume_context",
  "staffing_and_coverage_context",
  "channel_mix_context",
  "process_or_policy_context",
  "knowledge_base_context",
  "metric_definition_stability",
  "ai_rollout_context"
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

function safeIdPart(value) {
  return normalizeKey(value).replace(/^_+|_+$/g, "");
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

function candidateIntegrityHash(candidate) {
  const { candidate_integrity_hash: _ignored, ...compactCandidate } =
    candidate ?? {};
  return createHash("sha256")
    .update(JSON.stringify(compactCandidate))
    .digest("hex");
}

function sourceRefIsSafe(value) {
  return typeof value === "string" &&
    SAFE_SOURCE_REF_PATTERN.test(value) &&
    value.length <= 160 &&
    !sourceRefLooksEncodedPayload(value);
}

function sourceRefLooksEncodedPayload(value) {
  const normalized = String(value ?? "").toLowerCase();
  return normalized.split("_").some((segment) =>
    (segment.startsWith("eyj") && segment.length >= 12) ||
    (segment.length >= 16 && /^[a-z0-9]+$/.test(segment) && /\d/.test(segment))
  );
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

function falseFeeds(candidateReady = false) {
  return {
    controlled_measurement_cell_assembly: candidateReady,
    measurement_cell_candidate: candidateReady,
    ...Object.fromEntries(REQUIRED_FALSE_FEEDS.map((field) => [field, false]))
  };
}

function boundaryPolicy() {
  return Object.fromEntries(
    REQUIRED_FALSE_BOUNDARY_FIELDS.map((field) => [field, false])
  );
}

function requiredCaveats() {
  return [
    "Controlled Measurement Cell Assembly is an in-memory executable harness over saved aggregate fixtures only.",
    "The harness reuses the existing Measurement Cell Assembly Runner and canonical Measurement Cell builder; it does not create a second Measurement Cell model.",
    "A passed candidate means the reviewed aggregate package can form an internal Measurement Cell candidate only; it does not persist a cell, clear Source Package Review Queue as durable proof, create snapshots, create series, or authorize customer-facing output.",
    "The harness does not run BigQuery, Sigma, Glean queries, customer connectors, ingestion jobs, routes, UI, repositories, migrations, schemas, persistence writes, output-file writes, confidence models, probability models, ROI, EBITDA, causality, productivity, or customer-facing financial output."
  ];
}

function pathIsExempt(path) {
  const normalizedPath = path.map(normalizeKey).join(".");
  return [...EXEMPT_VALUE_PATHS].some((exempt) =>
    normalizedPath === exempt || normalizedPath.startsWith(`${exempt}.`)
  );
}

function isFalseBoundary(path, value) {
  if (value !== false) return false;
  const first = normalizeKey(path[0] ?? "");
  return first === "feeds" || first === "boundary_policy";
}

function collectUnsafeFields(value, path = [], gaps = []) {
  if (!value || typeof value !== "object") return gaps;
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectUnsafeFields(item, [...path, String(index)], gaps));
    return gaps;
  }
  for (const [key, nested] of Object.entries(value)) {
    const currentPath = [...path, key];
    const normalized = normalizeKey(key);
    const normalizedPath = currentPath.map(normalizeKey).join("_");
    if (
      !isFalseBoundary(currentPath, nested) &&
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
    if (
      !pathIsExempt(path) &&
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
    value.forEach((item, index) => collectUnsafeValues(item, [...path, String(index)], gaps));
    return gaps;
  }
  for (const [key, nested] of Object.entries(value)) {
    collectUnsafeValues(nested, [...path, key], gaps);
  }
  return gaps;
}

function pathNeedsUnsafeTextLeakScan(path) {
  const normalizedPath = path.map(normalizeKey).join(".");
  return normalizedPath.startsWith("required_caveats.") ||
    normalizedPath.startsWith("validation_summary.gaps.");
}

function collectUnsafeTextLeaks(value, path = [], gaps = []) {
  if (typeof value === "string") {
    const normalizedPath = path.map(normalizeKey).join(".");
    if (
      normalizedPath.startsWith("required_caveats.") &&
      requiredCaveats().includes(value)
    ) {
      return gaps;
    }
    if (
      pathNeedsUnsafeTextLeakScan(path) &&
      UNSAFE_TEXT_LEAK_PATTERNS.some((pattern) => pattern.test(value))
    ) {
      gaps.push(`Unsafe text detected: ${path.join(".")}`);
    }
    return gaps;
  }
  if (!value || typeof value !== "object") return gaps;
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectUnsafeTextLeaks(item, [...path, String(index)], gaps));
    return gaps;
  }
  for (const [key, nested] of Object.entries(value)) {
    collectUnsafeTextLeaks(nested, [...path, key], gaps);
  }
  return gaps;
}

function collectAllowedObjectShapeGaps(value, path, allowedFields) {
  const gaps = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    gaps.push(`${path} must be an object`);
    return gaps;
  }
  for (const field of Object.keys(value)) {
    if (!allowedFields.has(field)) {
      gaps.push(`${path}.${field} is not allowed`);
    }
  }
  return gaps;
}

function collectStringArrayShapeGaps(value, path) {
  const gaps = [];
  if (!Array.isArray(value)) {
    gaps.push(`${path} must be an array`);
    return gaps;
  }
  value.forEach((item, index) => {
    if (typeof item !== "string") {
      gaps.push(`${path}.${index} must be a string`);
    }
  });
  return gaps;
}

function collectPolicyMapShapeGaps(value, path, allowedFields) {
  const gaps = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    gaps.push(`${path} must be an object`);
    return gaps;
  }
  for (const [field, nested] of Object.entries(value)) {
    if (!allowedFields.has(field)) {
      gaps.push(`${path}.${field} is not allowed`);
    }
    if (typeof nested !== "boolean") {
      gaps.push(`${path}.${field} must be boolean`);
    }
  }
  return gaps;
}

function sanitizeGaps(gaps) {
  return uniqueStrings(stringsOf(gaps)).map((gap) =>
    gap
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
      .replace(/select\s+.+?\s+from/gi, "select [redacted] from")
      .replace(/raw transcript/gi, "[redacted-raw-text]")
      .replace(/Summarize/gi, "[redacted-prompt]")
  );
}

function sourcePackageRefKey(lane) {
  return SOURCE_PACKAGE_REF_KEYS[lane] ?? null;
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

function loadMeasurementPlan(fixture, cwd = process.cwd(), override = null) {
  if (override) return deepClone(override);
  if (fixture.measurement_plan) return deepClone(fixture.measurement_plan);
  return JSON.parse(readFileSync(resolve(cwd, fixture.measurement_plan_path), "utf8"));
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

function exportByLayer(fixture, layer) {
  return (fixture?.scrubbed_glean_exports ?? []).find(
    (item) => item?.evidence_layer === layer
  ) ?? null;
}

export function reviewedAggregateContextHash(fixture) {
  const compact = (fixture?.scrubbed_glean_exports ?? []).map((record) => ({
    export_id: record?.export_id ?? null,
    request_id: record?.request_id ?? null,
    evidence_layer: record?.evidence_layer ?? null,
    evidence_state: record?.evidence_state ?? null,
    org_id: record?.org_id ?? null,
    measurement_plan_id: record?.measurement_plan_id ?? null,
    covered_window: record?.covered_window ?? null,
    aggregate_grain: record?.aggregate_grain ?? null,
    minimum_cohort_threshold: record?.minimum_cohort_threshold ?? null,
    privacy_boundary: record?.privacy_boundary ?? null,
    allowed_uses: record?.allowed_uses ?? null,
    blocked_uses: record?.blocked_uses ?? null,
    aggregate_probe_id: record?.aggregate_probe_id ?? null,
    aggregate_export_id: record?.aggregate_export_id ?? null,
    aggregate_outcome_export_id: record?.aggregate_outcome_export_id ?? null,
    governance_control_export_id: record?.governance_control_export_id ?? null,
    assumption_approval_export_id: record?.assumption_approval_export_id ?? null,
    source_readiness_id: record?.source_readiness_id ?? null,
    source_export_id: record?.source_export_id ?? null,
    source_refs: record?.source_refs ?? null,
    k_min_posture: record?.k_min_posture ?? null,
    vbd_summary: record?.vbd_summary ?? null,
    token_summary: record?.token_summary ?? null,
    metric_or_signal_summary: record?.metric_or_signal_summary ?? null,
    source_owner_role: record?.source_owner_role ?? null,
    approver_role: record?.approver_role ?? null,
    attestation: record?.attestation ?? null,
    source_tables: record?.source_tables ?? null,
    table_families_checked: record?.table_families_checked ?? null,
    signal_families: record?.signal_families ?? null,
    covered_signal_families: record?.covered_signal_families ?? null
  })).sort((left, right) => {
    const leftKey = [
      left.evidence_layer,
      left.aggregate_probe_id,
      left.aggregate_export_id
    ].map((part) => String(part ?? "")).join("|");
    const rightKey = [
      right.evidence_layer,
      right.aggregate_probe_id,
      right.aggregate_export_id
    ].map((part) => String(part ?? "")).join("|");
    return leftKey.localeCompare(rightKey);
  });
  return createHash("sha256").update(JSON.stringify(compact)).digest("hex");
}

export function reviewedBlueprintExpectationHash(fixture) {
  const input = fixture?.blueprint_extraction_input ?? null;
  const compact = input
    ? {
        draftId: input.draftId ?? null,
        orgId: input.orgId ?? null,
        clientId: input.clientId ?? null,
        documentSourceRef: input.documentSourceRef ?? null,
        extractionState: input.extractionState ?? null,
        approvalState: input.approvalState ?? null,
        approvedAt: input.approvedAt ?? null,
        ownerRole: input.ownerRole ?? null,
        approverRole: input.approverRole ?? null,
        workflowFamily: input.workflowFamily ?? null,
        workflowName: input.workflowName ?? null,
        functionArea: input.functionArea ?? null,
        cohortKey: input.cohortKey ?? null,
        valueHypothesis: input.valueHypothesis ?? null,
        valueRoute: input.valueRoute ?? null,
        baselineWindow: input.baselineWindow ?? null,
        comparisonWindow: input.comparisonWindow ?? null,
        expectedBehaviorPathways: input.expectedBehaviorPathways ?? null,
        metricCandidates: input.metricCandidates ?? null,
        approvedExpectationPaths: input.approvedExpectationPaths ?? null,
        assumptions: input.assumptions ?? null,
        sourceRefs: input.sourceRefs ?? null
      }
    : null;
  return createHash("sha256").update(JSON.stringify(compact)).digest("hex");
}

function collectExpectedAggregateContextHashGaps(fixture) {
  const expectedHash = fixture?.expected?.reviewed_aggregate_context_hash;
  const actualHash = reviewedAggregateContextHash(fixture);
  if (!expectedHash) {
    return ["expected.reviewed_aggregate_context_hash is required"];
  }
  if (expectedHash !== actualHash) {
    return ["expected.reviewed_aggregate_context_hash must match reviewed aggregate context"];
  }
  return [];
}

function collectExpectedBlueprintExpectationHashGaps(fixture) {
  const expectedHash = fixture?.expected?.reviewed_blueprint_expectation_hash;
  const actualHash = reviewedBlueprintExpectationHash(fixture);
  if (!expectedHash) {
    return ["expected.reviewed_blueprint_expectation_hash is required"];
  }
  if (expectedHash !== actualHash) {
    return ["expected.reviewed_blueprint_expectation_hash must match reviewed Blueprint expectation context"];
  }
  return [];
}

function controlledReviewPassed(review) {
  return review.review_state === "PASSED_INTERNAL_FIXTURE_REVIEW" &&
    review.engine_decision === "READY_FOR_MEASUREMENT_CELL_ASSEMBLY" &&
    review.engine_executed === true &&
    review.internal_review_package?.next_gate === "measurement_cell_assembly_candidate_only";
}

function collectSourceLaneAggregateGrainGaps(fixture, measurementPlan) {
  const gaps = [];
  const expectedGrain = measurementPlan?.workflow_scope?.approved_aggregate_grain;
  const sources = dataSpineInputFromFixture(fixture)?.sources ?? {};
  const normalizedSources = normalizeSourceLanes(sources);
  for (const [lane, source] of Object.entries(normalizedSources)) {
    const grain = source?.approved_aggregate_grain;
    if (grain === undefined || grain === null) continue;
    if (!ALLOWED_AGGREGATE_GRAINS.has(String(grain))) {
      gaps.push(`data_spine_input.sources.${lane}.approved_aggregate_grain is unsupported`);
    } else if (expectedGrain && grain !== expectedGrain) {
      gaps.push(`data_spine_input.sources.${lane}.approved_aggregate_grain must match Measurement Plan approved aggregate grain`);
    }
  }
  return gaps;
}

function collectBlueprintInputGaps(fixture, measurementPlan, dataSpine) {
  const gaps = [];
  const input = fixture?.blueprint_extraction_input;
  const blueprintSource = dataSpine?.source_readiness?.blueprint;
  const metric = primaryMetric(measurementPlan);
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return ["blueprint_extraction_input is required"];
  }
  if (input.draftId !== blueprintSource?.source_ref) {
    gaps.push("blueprint_extraction_input.draftId must match Data Spine blueprint source_ref");
  }
  if (!sourceRefIsSafeForLane("blueprint", input.draftId)) {
    gaps.push("blueprint_extraction_input.draftId must be a safe lane-bound reviewed source ref");
  }
  if (input.orgId !== dataSpine?.org_id) {
    gaps.push("blueprint_extraction_input.orgId must match Data Spine org_id");
  }
  if (input.clientId !== dataSpine?.client_id) {
    gaps.push("blueprint_extraction_input.clientId must match Data Spine client_id");
  }
  if (input.workflowFamily !== dataSpine?.workflow_family) {
    gaps.push("blueprint_extraction_input.workflowFamily must match Data Spine workflow_family");
  }
  if (input.functionArea !== dataSpine?.function_area) {
    gaps.push("blueprint_extraction_input.functionArea must match Data Spine function_area");
  }
  if (input.cohortKey !== dataSpine?.cohort_key) {
    gaps.push("blueprint_extraction_input.cohortKey must match Data Spine cohort_key");
  }
  if (JSON.stringify(input.baselineWindow ?? null) !== JSON.stringify(dataSpine?.baseline_window ?? null)) {
    gaps.push("blueprint_extraction_input.baselineWindow must match Data Spine baseline_window");
  }
  if (JSON.stringify(input.comparisonWindow ?? null) !== JSON.stringify(dataSpine?.comparison_window ?? null)) {
    gaps.push("blueprint_extraction_input.comparisonWindow must match Data Spine comparison_window");
  }
  if (String(input.approvalState ?? "") !== "approved") {
    gaps.push("blueprint_extraction_input.approvalState must be approved");
  }
  if (!input.approvedAt) {
    gaps.push("blueprint_extraction_input.approvedAt is required for approved Blueprint expectations");
  }
  if (input.ownerRole !== blueprintSource?.owner_role) {
    gaps.push("blueprint_extraction_input.ownerRole must match Data Spine blueprint owner_role");
  }
  if (input.approverRole !== blueprintSource?.owner_role) {
    gaps.push("blueprint_extraction_input.approverRole must match Data Spine blueprint owner_role");
  }
  if (!Array.isArray(input.approvedExpectationPaths) || input.approvedExpectationPaths.length === 0) {
    gaps.push("blueprint_extraction_input.approvedExpectationPaths is required");
  } else {
    const primaryPaths = input.approvedExpectationPaths.filter((path) =>
      path?.metric_role === "primary"
    );
    if (primaryPaths.length !== 1) {
      gaps.push("blueprint_extraction_input.approvedExpectationPaths must include exactly one primary path");
    }
    const selectedPath = primaryPaths[0] ?? input.approvedExpectationPaths[0];
    if (selectedPath?.expected_metric_id !== metric?.metric_id) {
      gaps.push("blueprint_extraction_input primary expectation path must match Measurement Plan primary metric");
    }
    if (selectedPath?.expected_metric_customer_selected !== true) {
      gaps.push("blueprint_extraction_input primary expectation path must be customer selected");
    }
    if (selectedPath?.customer_approval_state !== "approved") {
      gaps.push("blueprint_extraction_input primary expectation path must be approved");
    }
    if (!selectedPath?.approved_at) {
      gaps.push("blueprint_extraction_input primary expectation path approved_at is required");
    }
    if (
      input.approvedAt &&
      selectedPath?.approved_at &&
      selectedPath.approved_at !== input.approvedAt
    ) {
      gaps.push("blueprint_extraction_input primary expectation path approved_at must match approvedAt");
    }
    if (selectedPath?.source_ref !== blueprintSource?.source_ref) {
      gaps.push("blueprint_extraction_input primary expectation path source_ref must match Data Spine blueprint source_ref");
    }
  }
  return gaps;
}

function collectAggregateContentGaps(fixture, measurementPlan) {
  const gaps = [];
  const layerOne = exportByLayer(fixture, "layer_1_platform_telemetry");
  const layerTwo = exportByLayer(fixture, "layer_2_user_voice_empirical");
  const outcomeExport = exportByLayer(fixture, "layer_3_business_system_outcomes");
  const selectedMetricId = normalizeKey(String(primaryMetric(measurementPlan)?.metric_id ?? ""));
  const summary = outcomeExport?.metric_or_signal_summary ?? {};
  const { baselineMetricValue, comparisonMetricValue } =
    aggregateMetricValues(summary);
  const aggregateMetricName = normalizeKey(
    String(summary.aggregate_metric_name ?? summary.aggregate_signal_name ?? "")
  );
  if (!outcomeExport) {
    gaps.push("layer_3_business_system_outcomes export is required");
  } else if (!aggregateMetricName) {
    gaps.push("layer_3_business_system_outcomes.metric_or_signal_summary.aggregate_metric_name is required");
  } else if (
    selectedMetricId &&
    ![
      selectedMetricId,
      `aggregate_${selectedMetricId}`
    ].includes(aggregateMetricName)
  ) {
    gaps.push("layer_3_business_system_outcomes.metric_or_signal_summary.aggregate_metric_name must match selected metric_id");
  }
  if (summary.aggregate_value_present !== true) {
    gaps.push("layer_3_business_system_outcomes.metric_or_signal_summary.aggregate_value_present must be true");
  }
  for (const field of [
    "overall_ai_fluency_score",
    "usage_quality_score",
    "behavior_change_score",
    "leadership_reinforcement_score",
    "capability_growth_score"
  ]) {
    if (finiteNumber(layerTwo?.metric_or_signal_summary?.[field]) === null) {
      gaps.push(`layer_2_user_voice_empirical.metric_or_signal_summary.${field} is required`);
    }
  }
  for (const field of [
    "total_tokens",
    "token_per_active_seat",
    "aggregate_interaction_count",
    "aggregate_workflow_count"
  ]) {
    if (finiteNumber(layerOne?.token_summary?.[field]) === null) {
      gaps.push(`layer_1_platform_telemetry.token_summary.${field} is required`);
    }
  }
  if (!layerOne?.token_summary?.token_intensity_band) {
    gaps.push("layer_1_platform_telemetry.token_summary.token_intensity_band is required");
  }
  if (baselineMetricValue === null) {
    gaps.push("layer_3_business_system_outcomes.metric_or_signal_summary.baseline_value is required");
  }
  if (comparisonMetricValue === null) {
    gaps.push("layer_3_business_system_outcomes.metric_or_signal_summary.comparison_value is required");
  }
  return gaps;
}

const SOURCE_PACKAGE_TYPE_TO_LANE = {
  layer_2_user_voice_empirical_export: "ai_fluency",
  layer_1_bigquery_telemetry_summary: "vbd_token",
  layer_3_business_system_of_record_outcome_export: "customer_metric",
  assumption_approval_export: "assumption",
  governance_control_export: "governance"
};

const EXPORT_LAYER_TO_LANE = {
  layer_2_user_voice_empirical: "ai_fluency",
  layer_1_platform_telemetry: "vbd_token",
  layer_3_business_system_outcomes: "customer_metric",
  assumption_evidence: "assumption",
  governance_evidence: "governance"
};

function collectScrubbedExportOwnerGaps(fixture, dataSpine) {
  const gaps = [];
  for (const record of fixture?.scrubbed_glean_exports ?? []) {
    const lane = EXPORT_LAYER_TO_LANE[record?.evidence_layer];
    if (!lane) continue;
    const source = dataSpine?.source_readiness?.[lane];
    const expectedOwner = source?.owner_role;
    if (!expectedOwner) continue;
    const prefix = `scrubbed_glean_exports.${record.evidence_layer}`;
    if (record?.source_owner_role !== expectedOwner) {
      gaps.push(`${prefix}.source_owner_role must match Data Spine source owner_role`);
    }
    if (
      lane !== "customer_metric" &&
      record?.approver_role &&
      record.approver_role !== expectedOwner
    ) {
      gaps.push(`${prefix}.approver_role must match Data Spine source owner_role`);
    }
    if (
      record?.attestation?.attested_by_role !== expectedOwner
    ) {
      gaps.push(`${prefix}.attestation.attested_by_role must match Data Spine source owner_role`);
    }
  }
  return gaps;
}

function collectRealDataSourcePackageGaps(realDataRun, dataSpine) {
  const gaps = [];
  const packages = realDataRun?.pilot_intake_run?.source_packages ?? [];
  for (const pkg of packages) {
    const lane = SOURCE_PACKAGE_TYPE_TO_LANE[pkg?.source_package_type];
    if (!lane) continue;
    const source = dataSpine?.source_readiness?.[lane];
    const prefix = `real_data_intake_packet_run.source_packages.${lane}`;
    if (source?.owner_role && pkg?.source_owner_role !== source.owner_role) {
      gaps.push(`${prefix}.source_owner_role must match Data Spine source owner_role`);
    }
    if (
      source?.owner_role &&
      pkg?.source_owner_attestation?.attested_by_role !== source.owner_role
    ) {
      gaps.push(`${prefix}.source_owner_attestation.attested_by_role must match Data Spine source owner_role`);
    }
    const refKey = sourcePackageRefKey(lane);
    if (refKey && pkg?.source_refs?.[refKey] !== source?.source_ref) {
      gaps.push(`${prefix}.source_refs.${refKey} must match Data Spine source_ref`);
    }
    if (!ALLOWED_AGGREGATE_GRAINS.has(String(pkg?.approved_aggregate_grain ?? ""))) {
      gaps.push(`${prefix}.approved_aggregate_grain is unsupported`);
    }
  }
  return gaps;
}

function reviewedSourceRefsOf(review) {
  return review?.internal_review_package?.reviewed_source_refs ?? {};
}

function reviewedSourceRefsHashOf(review) {
  return review?.internal_review_package?.reviewed_source_refs_hash ?? null;
}

function primaryMetric(plan) {
  return plan?.metric_selection?.primary_metric ?? {};
}

function expectedLagDaysFromPath(path) {
  const lag = finiteNumber(path?.expected_metric_lag_days);
  return lag === null ? null : lag;
}

function milestoneWindowIdFromLag(lagDays) {
  return lagDays === null ? "day_unknown" : `day_${safeIdPart(String(lagDays))}`;
}

function buildBlueprintHandoff(fixture, generatedAt) {
  const draft = buildBlueprintExtractionDraft(fixture.blueprint_extraction_input);
  return buildBlueprintOperatorSourceHandoff({
    draft,
    generatedAt
  });
}

function finiteNumber(value) {
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
}

function scaledIndex(value) {
  const numeric = finiteNumber(value);
  if (numeric === null) return null;
  return numeric <= 1 ? Number((numeric * 100).toFixed(2)) : numeric;
}

function aggregateMetricValues(summary) {
  return {
    baselineMetricValue:
      finiteNumber(summary?.baseline_value) ??
      finiteNumber(summary?.baseline_metric_value),
    comparisonMetricValue:
      finiteNumber(summary?.comparison_value) ??
      finiteNumber(summary?.comparison_metric_value)
  };
}

function measurementCellInput(plan, dataSpine, fixture, blueprintHandoff) {
  const metric = primaryMetric(plan);
  const sources = dataSpine.source_readiness;
  const baselineWindow = dataSpine.baseline_window;
  const comparisonWindow = dataSpine.comparison_window;
  const layerOne = exportByLayer(fixture, "layer_1_platform_telemetry");
  const layerTwo = exportByLayer(fixture, "layer_2_user_voice_empirical");
  const outcome = exportByLayer(fixture, "layer_3_business_system_outcomes");
  const vbdBaseline = scaledIndex(layerOne?.vbd_summary?.baseline_index);
  const vbdComparison = scaledIndex(layerOne?.vbd_summary?.comparison_index);
  const aiFluencySummary = layerTwo?.metric_or_signal_summary ?? {};
  const tokenSummary = layerOne?.token_summary ?? {};
  const metricSummary = outcome?.metric_or_signal_summary ?? {};
  const { baselineMetricValue, comparisonMetricValue } =
    aggregateMetricValues(metricSummary);
  const alignmentContext = blueprintHandoff.blueprint_alignment_context;
  const expectationPath = alignmentContext.approved_expectation_path;
  const lagDays = expectedLagDaysFromPath(expectationPath);
  const milestoneDay = finiteNumber(fixture?.expected?.milestone_day) ?? lagDays;
  const windowMode = fixture?.expected?.window_mode ?? "milestone";
  const metricDirection = expectationPath?.expected_metric_direction ?? metric.expected_direction;
  return {
    orgId: dataSpine.org_id,
    functionArea: dataSpine.function_area,
    workflowFamily: dataSpine.workflow_family,
    workflowId: plan.workflow_scope?.workflow_id ?? `workflow_${safeIdPart(dataSpine.workflow_family)}`,
    cohortKey: dataSpine.cohort_key,
    timeWindow: {
      time_window_id: milestoneWindowIdFromLag(milestoneDay),
      window_label: milestoneDay === null ? "Day unknown" : `Day ${milestoneDay}`,
      window_mode: windowMode,
      days_since_launch: milestoneDay,
      cadence: windowMode === "rolling_30_day" ? "rolling_30_day" : "milestone",
      window_start: comparisonWindow.window_start,
      window_end: comparisonWindow.window_end,
      baseline_window: baselineWindow,
      comparison_window: comparisonWindow,
      prior_window_ref:
        milestoneDay === 0 || milestoneDay === null
          ? null
          : `measurement_cell_day_${Math.max(0, milestoneDay - 30)}`
    },
    blueprintAlignment: {
      expectation_path_id: expectationPath.expectation_path_id,
      blueprint_expectation_ref: alignmentContext.blueprint_expectation_ref,
      blueprint_customer_approval_state: alignmentContext.blueprint_customer_approval_state,
      blueprint_customer_approved_at: alignmentContext.blueprint_customer_approved_at,
      blueprint_customer_approver_role: alignmentContext.blueprint_customer_approver_role,
      value_route: alignmentContext.value_route,
      value_promise: alignmentContext.value_promise,
      expected_behavior_pathways: alignmentContext.expected_behavior_pathways,
      expected_metric_id: expectationPath.expected_metric_id,
      expected_metric_name: expectationPath.expected_metric_name,
      expected_metric_direction: expectationPath.expected_metric_direction,
      expected_metric_lag_days: expectationPath.expected_metric_lag_days,
      expected_metric_system_recommended: expectationPath.expected_metric_system_recommended,
      expected_metric_customer_selected: expectationPath.expected_metric_customer_selected,
      value_driver: expectationPath.value_driver,
      approved_expectation_path: expectationPath,
      owner_role: alignmentContext.owner_role ?? plan.value_hypothesis?.owner_role,
      assumption_refs: ["customer_owned_assumptions"],
      source_ref: sources.blueprint.source_ref
    },
    aiFluencyContext: {
      evidence_state: "present",
      fluency_score: finiteNumber(aiFluencySummary.overall_ai_fluency_score),
      dimension_scores: {
        confidence: null,
        usage_quality: finiteNumber(aiFluencySummary.usage_quality_score),
        behavior_change: finiteNumber(aiFluencySummary.behavior_change_score),
        leadership_reinforcement: finiteNumber(aiFluencySummary.leadership_reinforcement_score),
        capability_growth: finiteNumber(aiFluencySummary.capability_growth_score)
      },
      response_count: null,
      source_ref: sources.ai_fluency.source_ref,
      suppression_state: "CLEAR"
    },
    vbdContext: {
      evidence_state: "present",
      velocity: vbdComparison,
      breadth: vbdComparison,
      depth: vbdComparison,
      integration_score: vbdComparison,
      overall_vbd_score: vbdComparison,
      prior_overall_vbd_score: vbdBaseline,
      vbd_quadrant: "high_fluency_flow",
      source_ref: sources.vbd_token.source_ref,
      suppression_state: "CLEAR"
    },
    selectedMetric: {
      metric_id: metric.metric_id,
      metric_name: metric.metric_name,
      metric_source_system: "customer_support_system",
      metric_unit: "hours",
      metric_direction: metricDirection,
      metric_sensitivity: "high",
      expected_lag_days: lagDays,
      normalization_denominator: "eligible_case_count",
      baseline_value: baselineMetricValue,
      comparison_value: comparisonMetricValue,
      owner_approval_state: "approved",
      source_ref: sources.customer_metric.source_ref,
      suppression_state: "CLEAR"
    },
    tokenContext: {
      evidence_state: "present",
      token_total: finiteNumber(tokenSummary.total_tokens),
      token_per_active_seat: finiteNumber(tokenSummary.token_per_active_seat),
      aggregate_interaction_count: finiteNumber(tokenSummary.aggregate_interaction_count),
      aggregate_workflow_count: finiteNumber(tokenSummary.aggregate_workflow_count),
      token_intensity_band: tokenSummary.token_intensity_band,
      source_ref: sources.vbd_token.source_ref
    },
    confounders: [
      {
        confounder_type: "support_case_mix",
        state: "documented",
        source_ref: sources.assumption.source_ref
      }
    ],
    evidenceDesign: {
      design_type: milestoneDay === 0 ? "assumption_only" : "matched_comparison",
      design_strength_tier:
        milestoneDay === 0 ? "planning_context_only" : "comparison_supported",
      comparison_cell_ref:
        milestoneDay === 0
          ? null
          : `measurement_cell_support_lower_exposure_day_${milestoneDay}`,
      controls_documented: milestoneDay !== 0,
      baseline_stability: "stable",
      source_ref: sources.governance.source_ref
    },
    financeReviewContext: {
      finance_owner_state: "business_owner_review",
      financial_driver: expectationPath.value_driver,
      metric_to_financial_driver_pathway:
        "Resolution time is reviewed as capacity context only.",
      source_ref: sources.assumption.source_ref
    },
    governance: {
      review_state: "BUSINESS_OWNER_REVIEW_READY"
    }
  };
}

function reviewRef(review, fixture) {
  return {
    controlled_review_state: review?.review_state ?? null,
    controlled_review_engine_decision: review?.engine_decision ?? null,
    real_data_intake_run_id: review?.run_ref?.real_data_intake_run_id ?? null,
    pilot_intake_run_id: review?.run_ref?.pilot_intake_run_id ?? null,
    measurement_plan_id: review?.run_ref?.measurement_plan_id ?? null,
    reviewed_source_refs: reviewedSourceRefsOf(review),
    reviewed_source_refs_hash: reviewedSourceRefsHashOf(review),
    reviewed_aggregate_context_hash: fixture
      ? reviewedAggregateContextHash(fixture)
      : null,
    reviewed_blueprint_expectation_hash: fixture
      ? reviewedBlueprintExpectationHash(fixture)
      : null
  };
}

function emptyAssemblyRef() {
  return {
    assembly_run_id: null,
    assembly_decision: null,
    measurement_cell_ref: null
  };
}

function assemblyRef(assemblyRun) {
  return {
    assembly_run_id: assemblyRun?.run_id ?? null,
    assembly_decision: assemblyRun?.decision ?? null,
    measurement_cell_ref: assemblyRun?.measurement_cell?.measurement_cell_id ?? null
  };
}

function compactMetadata({
  fixture,
  dataSpine = null,
  measurementPlan = null,
  sourcePackageCount = 0,
  assemblyRun = null,
  review,
  blueprintHandoff = null
}) {
  const metric = primaryMetric(measurementPlan);
  const readyCell =
    assemblyRun?.decision === "READY_FOR_VALUE_HYPOTHESIS_PACKET_RUNNER" &&
    assemblyRun?.measurement_cell;
  const selectedPath = blueprintHandoff?.blueprint_alignment_context?.approved_expectation_path;
  return {
    measurement_plan_id: measurementPlan?.measurement_plan_id ?? review?.run_ref?.measurement_plan_id ?? null,
    org_id: dataSpine?.org_id ?? review?.run_ref?.org_id ?? null,
    client_id: dataSpine?.client_id ?? review?.run_ref?.client_id ?? null,
    workflow_family: dataSpine?.workflow_family ?? review?.run_ref?.workflow_family ?? null,
    function_area: dataSpine?.function_area ?? null,
    cohort_key: dataSpine?.cohort_key ?? null,
    time_window_id: readyCell ? assemblyRun.measurement_cell.time_window?.time_window_id ?? null : null,
    measurement_cell_ref: readyCell ? assemblyRun.measurement_cell.measurement_cell_id ?? null : null,
    reviewed_source_refs_hash: reviewedSourceRefsHashOf(review),
    reviewed_aggregate_context_hash: fixture
      ? reviewedAggregateContextHash(fixture)
      : null,
    reviewed_blueprint_expectation_hash: fixture
      ? reviewedBlueprintExpectationHash(fixture)
      : null,
    source_package_count: sourcePackageCount,
    selected_metric_id: readyCell ? metric?.metric_id ?? null : null,
    expectation_path_id: readyCell ? selectedPath?.expectation_path_id ?? null : null,
    assembly_decision: assemblyRun?.decision ?? null,
    missing_evidence: uniqueStrings([
      ...stringsOf(assemblyRun?.missing_evidence),
      ...stringsOf(review?.validation_summary?.missing_evidence)
    ]),
    fixture_id: fixture?.fixture_id ?? null
  };
}

function candidateEnvelope({
  fixture,
  review,
  assemblyState,
  engineExecuted,
  validationSummary,
  dataSpine = null,
  measurementPlan = null,
  sourcePackageCount = 0,
  assemblyRun = null,
  blueprintHandoff = null
}) {
  const passed =
    assemblyState === "PASSED_INTERNAL_MEASUREMENT_CELL_CANDIDATE_REVIEW";
  const candidate = {
    schema_version: CONTROLLED_MEASUREMENT_CELL_ASSEMBLY_SCHEMA_VERSION,
    fixture_id: fixture?.fixture_id ?? null,
    review_state: review?.review_state ?? null,
    assembly_state: assemblyState,
    engine_executed: engineExecuted,
    review_ref: reviewRef(review, fixture),
    assembly_ref: assemblyRun ? assemblyRef(assemblyRun) : emptyAssemblyRef(),
    validation_summary: {
      controlled_review_valid: validationSummary.controlled_review_valid === true,
      assembly_run_valid: validationSummary.assembly_run_valid === true,
      source_package_count: sourcePackageCount,
      gaps: sanitizeGaps(validationSummary.gaps ?? []),
      missing_evidence: uniqueStrings(validationSummary.missing_evidence ?? [])
    },
    internal_candidate_metadata: compactMetadata({
      fixture,
      dataSpine,
      measurementPlan,
      sourcePackageCount,
      assemblyRun,
      review,
      blueprintHandoff
    }),
    feeds: falseFeeds(passed),
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    boundary_policy: boundaryPolicy(),
    required_caveats: requiredCaveats(),
    generated_at: fixture?.generated_at ?? new Date(0).toISOString(),
    derivation_version: DERIVATION_VERSION
  };
  return {
    ...candidate,
    candidate_integrity_hash: candidateIntegrityHash(candidate)
  };
}

function blockedCandidate(
  fixture,
  review,
  gaps,
  assemblyState = "BLOCKED",
  controlledReviewValid = false
) {
  return candidateEnvelope({
    fixture,
    review,
    assemblyState,
    engineExecuted: false,
    validationSummary: {
      controlled_review_valid: controlledReviewValid,
      assembly_run_valid: false,
      gaps,
      missing_evidence: review?.validation_summary?.missing_evidence ?? []
    },
    sourcePackageCount: review?.validation_summary?.source_package_count ?? 0
  });
}

export function buildControlledMeasurementCellAssemblyArtifactsFromObject(
  fixture,
  options = {}
) {
  const cwd = options.cwd ?? process.cwd();
  const review = runControlledAggregateFixtureReviewFromObject(fixture, {
    cwd,
    measurementPlanOverride: options.measurementPlanOverride
  });
  const reviewValidation = validateControlledAggregateFixtureReview(review);

  if (!reviewValidation.valid) {
    return {
      candidate: blockedCandidate(
        fixture,
        review,
        reviewValidation.gaps.map((gap) => `controlled_aggregate_review: ${gap}`)
      ),
      review,
      reviewValidation
    };
  }

  if (fixture?.schema_version !== FIXTURE_SCHEMA_VERSION) {
    return {
      candidate: blockedCandidate(
        fixture,
        review,
        [`schema_version must be ${FIXTURE_SCHEMA_VERSION}`],
        "BLOCKED",
        true
      ),
      review,
      reviewValidation
    };
  }

  const passedReview = controlledReviewPassed(review);

  if (!passedReview) {
    const heldState =
      review.review_state === "BLOCKED"
        ? "BLOCKED"
        : "HELD_FOR_CONTROLLED_AGGREGATE_REVIEW";
    return {
      candidate: blockedCandidate(
        fixture,
        review,
        [
          ...(review.validation_summary?.gaps ?? []),
          ...collectExpectedAggregateContextHashGaps(fixture)
        ],
        heldState,
        true
      ),
      review,
      reviewValidation
    };
  }

  const reviewedRefs = reviewedSourceRefsOf(review);
  if (reviewedSourceRefsHashOf(review) !== hashReviewedSourceRefs(reviewedRefs)) {
    return {
      candidate: blockedCandidate(
        fixture,
        review,
        ["internal_review_package.reviewed_source_refs_hash must match reviewed_source_refs"],
        "BLOCKED",
        true
      ),
      review,
      reviewValidation
    };
  }

  let measurementPlan;
  let dataSpine;
  let realDataRun;
  let sourceQueue;
  let blueprintHandoff;
  let assemblyRun;
  try {
    measurementPlan = loadMeasurementPlan(
      fixture,
      cwd,
      options.measurementPlanOverride
    );
    dataSpine = buildDataSpineFromFixture(fixture);
    const actualRefs = packageRefsFromDataSpine(dataSpine);
    const refGaps = REVIEWED_SOURCE_REF_LANES
      .filter((lane) => actualRefs[lane] !== reviewedRefs[lane])
      .map((lane) => `review_ref.reviewed_source_refs.${lane} must match rebuilt Data Spine source_ref`);
    if (refGaps.length > 0) {
      return {
        candidate: blockedCandidate(fixture, review, refGaps, "BLOCKED", true),
        review,
        reviewValidation,
        measurementPlan,
        dataSpine
      };
    }

    const preAssemblyGaps = [
      ...collectExpectedAggregateContextHashGaps(fixture),
      ...collectExpectedBlueprintExpectationHashGaps(fixture),
      ...collectSourceLaneAggregateGrainGaps(fixture, measurementPlan),
      ...collectBlueprintInputGaps(fixture, measurementPlan, dataSpine),
      ...collectScrubbedExportOwnerGaps(fixture, dataSpine),
      ...collectAggregateContentGaps(fixture, measurementPlan)
    ];
    if (preAssemblyGaps.length > 0) {
      return {
        candidate: blockedCandidate(fixture, review, preAssemblyGaps, "BLOCKED", true),
        review,
        reviewValidation,
        measurementPlan,
        dataSpine
      };
    }

    realDataRun = buildRealDataIntakePacketRun({
      dataSpineReadiness: dataSpine,
      measurementPlan,
      scrubbedGleanExports: fixture.scrubbed_glean_exports,
      runId: fixture.run_id,
      generatedAt: fixture.generated_at
    });
    const realDataSourcePackageGaps =
      collectRealDataSourcePackageGaps(realDataRun, dataSpine);
      if (realDataSourcePackageGaps.length > 0) {
        return {
          candidate: blockedCandidate(fixture, review, realDataSourcePackageGaps, "BLOCKED", true),
          review,
          reviewValidation,
          measurementPlan,
          dataSpine,
          realDataRun
        };
      }
    sourceQueue = buildSourcePackageReviewQueue({
      dataSpineReadiness: dataSpine,
      sourcePackages: realDataRun?.pilot_intake_run?.source_packages ?? [],
      generatedAt: fixture.generated_at
    });
    blueprintHandoff = buildBlueprintHandoff(fixture, fixture.generated_at);
    assemblyRun = buildMeasurementCellAssemblyRun({
      dataSpineReadiness: dataSpine,
      measurementPlan,
      sourcePackageReviewQueue: sourceQueue,
      blueprintOperatorSourceHandoff: blueprintHandoff,
      realDataIntakePacketRun: realDataRun,
      measurementCellInput: measurementCellInput(
        measurementPlan,
        dataSpine,
        fixture,
        blueprintHandoff
      ),
      runId: `controlled_measurement_cell_assembly_${safeIdPart(String(fixture.fixture_id ?? "fixture"))}`,
      generatedAt: fixture.generated_at
    });
  } catch (error) {
    return {
      candidate: blockedCandidate(fixture, review, [
        error instanceof Error ? error.message : String(error)
      ], "BLOCKED", true),
      review,
      reviewValidation,
      measurementPlan,
      dataSpine,
      realDataRun,
      sourceQueue,
      blueprintHandoff,
      assemblyRun
    };
  }

  const assemblyValidation = validateMeasurementCellAssemblyRun(assemblyRun);
  const sourcePackageCount = sourceQueue?.lanes?.filter((lane) =>
    Array.isArray(lane.source_package_ids) && lane.source_package_ids.length > 0
  ).length ?? 0;
  const assemblyState =
    assemblyValidation.valid &&
    assemblyRun.decision === "READY_FOR_VALUE_HYPOTHESIS_PACKET_RUNNER" &&
    assemblyRun.measurement_cell
      ? "PASSED_INTERNAL_MEASUREMENT_CELL_CANDIDATE_REVIEW"
      : assemblyRun.decision === "BLOCKED"
        ? "BLOCKED"
        : "HELD_FOR_MEASUREMENT_CELL_ASSEMBLY";

  const candidate = candidateEnvelope({
    fixture,
    review,
    assemblyState,
    engineExecuted: true,
    validationSummary: {
      controlled_review_valid: true,
      assembly_run_valid: assemblyValidation.valid === true,
      gaps: [
        ...stringsOf(assemblyRun.gaps),
        ...stringsOf(assemblyRun.measurement_cell_validation_result?.gaps).map(
          (gap) => `measurement_cell: ${gap}`
        ),
        ...stringsOf(assemblyValidation.gaps)
      ],
      missing_evidence: [
        ...stringsOf(assemblyRun.missing_evidence),
        ...stringsOf(assemblyValidation.gaps)
      ]
    },
    dataSpine,
    measurementPlan,
    sourcePackageCount,
    assemblyRun,
    blueprintHandoff
  });
  return {
    candidate,
    review,
    reviewValidation,
    measurementPlan,
    dataSpine,
    realDataRun,
    sourceQueue,
    blueprintHandoff,
    assemblyRun,
    assemblyValidation
  };
}

export function runControlledMeasurementCellAssemblyFromObject(
  fixture,
  options = {}
) {
  return buildControlledMeasurementCellAssemblyArtifactsFromObject(
    fixture,
    options
  ).candidate;
}

export function runControlledMeasurementCellAssembly(path, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const fixture = JSON.parse(readFileSync(resolve(cwd, path), "utf8"));
  return runControlledMeasurementCellAssemblyFromObject(fixture, { cwd });
}

function collectTopLevelGaps(candidate) {
  const gaps = [];
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return ["controlled Measurement Cell assembly candidate must be an object"];
  }
  for (const field of [
    "schema_version",
    "fixture_id",
    "review_state",
    "assembly_state",
    "engine_executed",
    "candidate_integrity_hash",
    "review_ref",
    "assembly_ref",
    "validation_summary",
    "internal_candidate_metadata",
    "feeds",
    "blocked_uses",
    "boundary_policy",
    "required_caveats",
    "generated_at",
    "derivation_version"
  ]) {
    if (candidate[field] === undefined || candidate[field] === null || candidate[field] === "") {
      gaps.push(`${field} is required`);
    }
  }
  if (
    candidate?.schema_version &&
    candidate.schema_version !== CONTROLLED_MEASUREMENT_CELL_ASSEMBLY_SCHEMA_VERSION
  ) {
    gaps.push(`schema_version must be ${CONTROLLED_MEASUREMENT_CELL_ASSEMBLY_SCHEMA_VERSION}`);
  }
  if (
    candidate?.assembly_state &&
    !ALLOWED_ASSEMBLY_STATES.has(String(candidate.assembly_state))
  ) {
    gaps.push(`assembly_state is invalid: ${candidate.assembly_state}`);
  }
  for (const field of Object.keys(candidate ?? {})) {
    if (!ALLOWED_TOP_LEVEL_FIELDS.has(field)) {
      gaps.push(`Unsupported controlled Measurement Cell assembly field: ${field}`);
    }
  }
  return gaps;
}

function collectPolicyGaps(candidate) {
  const gaps = [
    ...collectPolicyMapShapeGaps(candidate?.feeds, "feeds", ALLOWED_FEED_FIELDS),
    ...collectPolicyMapShapeGaps(
      candidate?.boundary_policy,
      "boundary_policy",
      new Set(REQUIRED_FALSE_BOUNDARY_FIELDS)
    ),
    ...collectStringArrayShapeGaps(candidate?.blocked_uses, "blocked_uses"),
    ...collectStringArrayShapeGaps(candidate?.required_caveats, "required_caveats")
  ];
  for (const feed of REQUIRED_FALSE_FEEDS) {
    if (candidate?.feeds?.[feed] !== false) {
      gaps.push(`feeds.${feed} must be false`);
    }
  }
  for (const field of REQUIRED_FALSE_BOUNDARY_FIELDS) {
    if (candidate?.boundary_policy?.[field] !== false) {
      gaps.push(`boundary_policy.${field} must be false`);
    }
  }
  for (const use of REQUIRED_BLOCKED_USES) {
    if (!stringsOf(candidate?.blocked_uses).includes(use)) {
      gaps.push(`blocked_uses missing ${use}`);
    }
  }
  if (
    JSON.stringify(stringsOf(candidate?.required_caveats)) !==
    JSON.stringify(requiredCaveats())
  ) {
    gaps.push("required_caveats must match the controlled Measurement Cell assembly caveats exactly");
  }
  return gaps;
}

function collectCandidateConsistencyGaps(candidate) {
  const gaps = [];
  const passed =
    candidate?.assembly_state === "PASSED_INTERNAL_MEASUREMENT_CELL_CANDIDATE_REVIEW";
  if (
    candidate?.candidate_integrity_hash &&
    candidate.candidate_integrity_hash !== candidateIntegrityHash(candidate)
  ) {
    gaps.push("candidate_integrity_hash must match compact candidate metadata");
  }
  if (
    candidate?.candidate_integrity_hash &&
    !SHA256_HEX_PATTERN.test(String(candidate.candidate_integrity_hash))
  ) {
    gaps.push("candidate_integrity_hash must be a sha256 hex hash");
  }
  if (candidate?.feeds?.controlled_measurement_cell_assembly !== passed) {
    gaps.push("feeds.controlled_measurement_cell_assembly must match passed candidate state");
  }
  if (candidate?.feeds?.measurement_cell_candidate !== passed) {
    gaps.push("feeds.measurement_cell_candidate must match passed candidate state");
  }
  const reviewedRefs = candidate?.review_ref?.reviewed_source_refs;
  const reviewedHash = candidate?.review_ref?.reviewed_source_refs_hash;
  gaps.push(
    ...collectAllowedObjectShapeGaps(
      candidate?.review_ref,
      "review_ref",
      ALLOWED_REVIEW_REF_FIELDS
    ),
    ...collectAllowedObjectShapeGaps(
      candidate?.assembly_ref,
      "assembly_ref",
      ALLOWED_ASSEMBLY_REF_FIELDS
    ),
    ...collectAllowedObjectShapeGaps(
      candidate?.validation_summary,
      "validation_summary",
      ALLOWED_VALIDATION_SUMMARY_FIELDS
    ),
    ...collectStringArrayShapeGaps(
      candidate?.validation_summary?.gaps,
      "validation_summary.gaps"
    ),
    ...collectStringArrayShapeGaps(
      candidate?.validation_summary?.missing_evidence,
      "validation_summary.missing_evidence"
    ),
    ...collectStringArrayShapeGaps(
      candidate?.internal_candidate_metadata?.missing_evidence,
      "internal_candidate_metadata.missing_evidence"
    )
  );
  if (
    reviewedRefs &&
    typeof reviewedRefs === "object" &&
    !Array.isArray(reviewedRefs) &&
    (
      passed ||
      reviewedHash ||
      Object.keys(reviewedRefs).length > 0
    )
  ) {
    gaps.push(
      ...collectReviewedSourceRefsShapeGaps(
        reviewedRefs,
        "review_ref.reviewed_source_refs"
      )
    );
  }
  for (const key of Object.keys(candidate?.internal_candidate_metadata ?? {})) {
    if (!ALLOWED_INTERNAL_METADATA_FIELDS.has(key)) {
      gaps.push(`internal_candidate_metadata.${key} is not allowed`);
    }
  }
  if (
    reviewedRefs &&
    typeof reviewedRefs === "object" &&
    !Array.isArray(reviewedRefs) &&
    (
      reviewedHash !== null ||
      Object.keys(reviewedRefs).length > 0
    ) &&
    reviewedHash !== hashReviewedSourceRefs(reviewedRefs)
  ) {
    gaps.push("review_ref.reviewed_source_refs_hash must match reviewed_source_refs");
  }
  if (
    candidate?.internal_candidate_metadata?.reviewed_aggregate_context_hash !==
    candidate?.review_ref?.reviewed_aggregate_context_hash
  ) {
    gaps.push("internal_candidate_metadata.reviewed_aggregate_context_hash must match review_ref.reviewed_aggregate_context_hash");
  }
  if (
    candidate?.internal_candidate_metadata?.reviewed_blueprint_expectation_hash !==
    candidate?.review_ref?.reviewed_blueprint_expectation_hash
  ) {
    gaps.push("internal_candidate_metadata.reviewed_blueprint_expectation_hash must match review_ref.reviewed_blueprint_expectation_hash");
  }
  for (const path of [
    "review_ref.reviewed_aggregate_context_hash",
    "internal_candidate_metadata.reviewed_aggregate_context_hash",
    "review_ref.reviewed_blueprint_expectation_hash",
    "internal_candidate_metadata.reviewed_blueprint_expectation_hash"
  ]) {
    const value = path.split(".").reduce((nested, key) => nested?.[key], candidate);
    if (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      !SHA256_HEX_PATTERN.test(String(value))
    ) {
      gaps.push(`${path} must be a sha256 hex hash`);
    }
  }
  if (
    candidate?.internal_candidate_metadata?.reviewed_blueprint_expectation_hash !== undefined &&
    candidate?.internal_candidate_metadata?.reviewed_blueprint_expectation_hash !== null &&
    !SHA256_HEX_PATTERN.test(String(candidate.internal_candidate_metadata.reviewed_blueprint_expectation_hash))
  ) {
    gaps.push("internal_candidate_metadata.reviewed_blueprint_expectation_hash must be a sha256 hex hash");
  }
  if (passed) {
    if (candidate.engine_executed !== true) {
      gaps.push("engine_executed must be true for passed Measurement Cell candidate review");
    }
    if (candidate.review_state !== "PASSED_INTERNAL_FIXTURE_REVIEW") {
      gaps.push("review_state must be PASSED_INTERNAL_FIXTURE_REVIEW for passed candidate");
    }
    if (
      candidate.review_ref?.controlled_review_state !==
      "PASSED_INTERNAL_FIXTURE_REVIEW"
    ) {
      gaps.push("review_ref.controlled_review_state must be PASSED_INTERNAL_FIXTURE_REVIEW for passed candidate");
    }
    if (candidate.validation_summary?.controlled_review_valid !== true) {
      gaps.push("validation_summary.controlled_review_valid must be true for passed candidate");
    }
    if (candidate.validation_summary?.assembly_run_valid !== true) {
      gaps.push("validation_summary.assembly_run_valid must be true for passed candidate");
    }
    if (stringsOf(candidate.validation_summary?.gaps).length > 0) {
      gaps.push("validation_summary.gaps must be empty for passed candidate");
    }
    if (candidate.assembly_ref?.assembly_decision !== "READY_FOR_VALUE_HYPOTHESIS_PACKET_RUNNER") {
      gaps.push("assembly_ref.assembly_decision must be READY_FOR_VALUE_HYPOTHESIS_PACKET_RUNNER for passed candidate");
    }
    if (!candidate.assembly_ref?.measurement_cell_ref) {
      gaps.push("assembly_ref.measurement_cell_ref is required for passed candidate");
    }
    if (
      candidate.internal_candidate_metadata?.measurement_cell_ref !==
      candidate.assembly_ref?.measurement_cell_ref
    ) {
      gaps.push("internal_candidate_metadata.measurement_cell_ref must match assembly_ref.measurement_cell_ref");
    }
    if (
      candidate.internal_candidate_metadata?.assembly_decision !==
      candidate.assembly_ref?.assembly_decision
    ) {
      gaps.push("internal_candidate_metadata.assembly_decision must match assembly_ref.assembly_decision");
    }
    if (
      candidate.internal_candidate_metadata?.reviewed_source_refs_hash !==
      candidate.review_ref?.reviewed_source_refs_hash
    ) {
      gaps.push("internal_candidate_metadata.reviewed_source_refs_hash must match review_ref.reviewed_source_refs_hash");
    }
    if (!candidate.review_ref?.reviewed_aggregate_context_hash) {
      gaps.push("review_ref.reviewed_aggregate_context_hash is required for passed candidate");
    }
    for (const field of [
      "measurement_plan_id",
      "org_id",
      "client_id",
      "workflow_family",
      "function_area",
      "cohort_key",
      "time_window_id",
      "measurement_cell_ref",
      "reviewed_source_refs_hash",
      "reviewed_aggregate_context_hash",
      "reviewed_blueprint_expectation_hash",
      "selected_metric_id",
      "expectation_path_id",
      "assembly_decision"
    ]) {
      if (
        candidate.internal_candidate_metadata?.[field] === undefined ||
        candidate.internal_candidate_metadata?.[field] === null ||
        candidate.internal_candidate_metadata?.[field] === ""
      ) {
        gaps.push(`internal_candidate_metadata.${field} is required for passed candidate`);
      }
    }
    if (
      !Number.isFinite(Number(candidate.internal_candidate_metadata?.source_package_count)) ||
      Number(candidate.internal_candidate_metadata?.source_package_count) <= 0
    ) {
      gaps.push("internal_candidate_metadata.source_package_count must be greater than 0 for passed candidate");
    }
    if (
      candidate.validation_summary?.source_package_count !==
      candidate.internal_candidate_metadata?.source_package_count
    ) {
      gaps.push("validation_summary.source_package_count must match internal_candidate_metadata.source_package_count");
    }
  } else {
    if (candidate?.feeds?.controlled_measurement_cell_assembly !== false) {
      gaps.push("feeds.controlled_measurement_cell_assembly must be false unless candidate passed");
    }
    if (candidate?.feeds?.measurement_cell_candidate !== false) {
      gaps.push("feeds.measurement_cell_candidate must be false unless candidate passed");
    }
    if (candidate?.assembly_ref?.measurement_cell_ref) {
      gaps.push("assembly_ref.measurement_cell_ref must be null unless candidate passed");
    }
    if (candidate?.assembly_ref?.assembly_decision === "READY_FOR_VALUE_HYPOTHESIS_PACKET_RUNNER") {
      gaps.push("assembly_ref.assembly_decision cannot be READY_FOR_VALUE_HYPOTHESIS_PACKET_RUNNER unless candidate passed");
    }
    for (const field of [
      "time_window_id",
      "measurement_cell_ref",
      "selected_metric_id",
      "expectation_path_id"
    ]) {
      if (
        candidate?.internal_candidate_metadata?.[field] !== undefined &&
        candidate.internal_candidate_metadata[field] !== null &&
        candidate.internal_candidate_metadata[field] !== ""
      ) {
        gaps.push(`internal_candidate_metadata.${field} must be null unless candidate passed`);
      }
    }
    if (
      candidate?.internal_candidate_metadata?.assembly_decision ===
      "READY_FOR_VALUE_HYPOTHESIS_PACKET_RUNNER"
    ) {
      gaps.push("internal_candidate_metadata.assembly_decision cannot be READY_FOR_VALUE_HYPOTHESIS_PACKET_RUNNER unless candidate passed");
    }
  }
  if (
    candidate?.assembly_state === "HELD_FOR_CONTROLLED_AGGREGATE_REVIEW" &&
    candidate.engine_executed !== false
  ) {
    gaps.push("engine_executed must be false when held for controlled aggregate review");
  }
  return gaps;
}

function collectFixtureBoundCandidateGaps(candidate, options = {}) {
  const passed =
    candidate?.assembly_state === "PASSED_INTERNAL_MEASUREMENT_CELL_CANDIDATE_REVIEW";
  if (!passed) return [];
  const sourceFixture = options.sourceFixture ?? options.fixture;
  if (!sourceFixture) {
    return ["sourceFixture is required to validate a passed Measurement Cell candidate"];
  }
  const expectedCandidate = runControlledMeasurementCellAssemblyFromObject(
    sourceFixture,
    {
      cwd: options.cwd ?? process.cwd(),
      measurementPlanOverride: options.measurementPlanOverride
    }
  );
  if (JSON.stringify(candidate) !== JSON.stringify(expectedCandidate)) {
    return ["passed candidate must match fixture-bound controlled Measurement Cell assembly output"];
  }
  return [];
}

export function validateControlledMeasurementCellAssembly(candidate, options = {}) {
  const gaps = [
    ...collectTopLevelGaps(candidate),
    ...collectPolicyGaps(candidate),
    ...collectCandidateConsistencyGaps(candidate),
    ...collectFixtureBoundCandidateGaps(candidate, options),
    ...collectUnsafeFields(candidate),
    ...collectUnsafeValues(candidate),
    ...collectUnsafeTextLeaks(candidate)
  ];
  return {
    schema_version: `${CONTROLLED_MEASUREMENT_CELL_ASSEMBLY_SCHEMA_VERSION}_VALIDATION`,
    fixture_id: candidate?.fixture_id ?? null,
    valid: gaps.length === 0,
    gaps
  };
}

function printUsageAndExit() {
  console.error(
    "Usage: node scripts/run_ai_value_controlled_measurement_cell_assembly.mjs <fixture.json>"
  );
  process.exit(1);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
const currentPath = fileURLToPath(import.meta.url);
if (invokedPath === currentPath) {
  const fixturePath = process.argv[2];
  if (!fixturePath) printUsageAndExit();
  const cwd = process.cwd();
  const fixture = JSON.parse(readFileSync(resolve(cwd, fixturePath), "utf8"));
  const candidate = runControlledMeasurementCellAssemblyFromObject(fixture, { cwd });
  const validation = validateControlledMeasurementCellAssembly(candidate, {
    sourceFixture: fixture,
    cwd
  });
  if (!validation.valid) {
    console.error(JSON.stringify(validation, null, 2));
    process.exitCode = 1;
  }
  console.log(JSON.stringify(candidate, null, 2));
}
