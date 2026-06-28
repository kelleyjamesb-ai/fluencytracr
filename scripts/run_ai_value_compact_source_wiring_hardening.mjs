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
  buildDataModelSpineReadinessLockFromObject,
  DATA_MODEL_SPINE_READINESS_LOCK_SCHEMA_VERSION,
  dataModelSpineReadinessLockHash,
  validateDataModelSpineReadinessLock
} from "./run_ai_value_data_model_spine_readiness_lock.mjs";

export const COMPACT_SOURCE_WIRING_HARDENING_SCHEMA_VERSION =
  "FT_AI_VALUE_COMPACT_SOURCE_WIRING_HARDENING_2026_06";

const VALIDATION_SCHEMA_VERSION =
  `${COMPACT_SOURCE_WIRING_HARDENING_SCHEMA_VERSION}_VALIDATION`;

const DERIVATION_VERSION =
  "ai_value_compact_source_wiring_hardening_2026_06";

const READY_STATE = "COMPACT_SOURCE_WIRING_HARDENED_NON_LIVE";
const HOLD_STATE = "HOLD_FOR_VALID_COMPACT_SOURCE_WIRING_INPUTS";
const REJECTED_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";

const READY_LOCK_STATE = "COMPACT_CUSTOMER_DATA_MODEL_SPINE_READY";
const READY_BOUNDARY_PLAN_STATE =
  "PASSED_AGGREGATE_CONNECTOR_BOUNDARY_PLAN_REVIEW";

const ALLOWED_NEXT_STEP =
  "draft_non_live_connector_promotion_decision_requirements_only";
const HELD_NEXT_STEP = "complete_compact_source_wiring_hardening_inputs";

const SOURCE_READINESS_LOCK_REF_FIELDS = [
  "schema_version",
  "lock_state",
  "lock_hash",
  "allowed_next_step",
  "series_persistence_state"
];

const SOURCE_DESCRIPTOR_FIELDS = [
  "source_system",
  "source_category",
  "boundary_plan_id",
  "boundary_plan_state",
  "boundary_validation_state",
  "boundary_validation_gap_count",
  "connector_adapter_run_id",
  "source_owner_role",
  "execution_mode",
  "aggregate_definition_ref",
  "aggregate_output_ref",
  "approved_output_fields",
  "aggregate_grain",
  "source_quality_posture"
];

const SOURCE_QUALITY_POSTURE_FIELDS = [
  "k_min_posture",
  "suppression_posture",
  "freshness_state",
  "legal_trust_review_state"
];

const HELD_SOURCE_SYSTEM_FIELDS = [
  "source_system",
  "hold_reason",
  "required_future_decision"
];

const SOURCE_WIRING_POSTURE_FIELDS = [
  "wiring_mode",
  "compact_descriptors_only",
  "live_execution_authorized",
  "credential_access_authorized",
  "query_execution_authorized",
  "raw_row_ingestion_authorized",
  "dashboard_row_ingestion_authorized",
  "customer_output_authorized"
];

const PREREQUISITE_FIELDS = [
  "data_model_spine_readiness_lock_valid",
  "bigquery_boundary_plan_valid",
  "sigma_boundary_plan_valid",
  "compact_source_descriptors_only",
  "all_live_wiring_feeds_false"
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
  "source_package_clearance",
  "measurement_cell_creation",
  "measurement_cell_snapshot_write",
  "measurement_cell_series_persistence",
  "evidence_continuity_persistence",
  "backend_route",
  "frontend_ui",
  "export_creation",
  "rendered_readout",
  "research_model_feed",
  "model_output",
  "confidence_output",
  "probability_output",
  "score_like_output",
  "finance_output",
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
  "extends_evidence_continuity",
  "creates_backend_route",
  "creates_frontend_ui",
  "creates_export",
  "creates_rendered_readout",
  "feeds_research_model",
  "implements_statistical_model_equation",
  "implements_confidence_math",
  "emits_probability",
  "emits_score_like_output",
  "emits_finance_output",
  "computes_roi",
  "claims_causality",
  "measures_productivity",
  "emits_customer_facing_output",
  "emits_customer_facing_financial_output",
  "emits_customer_facing_economic_output"
];

const TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "hardening_id",
  "hardening_state",
  "generated_at",
  "derivation_version",
  "source_bound",
  "source_readiness_lock_ref",
  "source_wiring_posture",
  "prepared_source_systems",
  "held_source_systems",
  "prerequisites",
  "allowed_next_step",
  "feeds",
  "boundary_policy",
  "required_caveats",
  "blocked_uses",
  "hold_reasons",
  "validation_summary",
  "hardening_hash"
]);

const REQUIRED_CAVEATS = [
  "Compact Source Wiring Hardening prepares non-live source descriptors only; it does not authorize BigQuery, Sigma, Glean, or customer connector execution.",
  "Prepared source descriptors are internal compact wiring metadata, not customer-facing labels, join handles, source refs, source hashes, or warehouse handles.",
  "Glean live wiring remains held until a later exact-scope source adapter and live connector promotion gate are approved.",
  "This hardening record does not authorize routes, UI, exports, rendered readouts, model output, finance output, customer-facing output, or Measurement Cell Series persistence."
];

const REQUIRED_BLOCKED_USES = [
  "live_bigquery_execution",
  "live_sigma_execution",
  "live_glean_query",
  "customer_connector_execution",
  "credential_access",
  "query_execution",
  "query_text_storage",
  "raw_row_ingestion",
  "dashboard_row_ingestion",
  "warehouse_handle_exposure",
  "source_ref_exposure",
  "source_hash_exposure",
  "source_package_clearance",
  "measurement_cell_creation",
  "measurement_cell_snapshot_write",
  "measurement_cell_series_persistence",
  "evidence_continuity_persistence",
  "backend_route",
  "frontend_ui",
  "export_creation",
  "rendered_readout",
  "research_model_feed",
  "statistical_model_equation",
  "confidence_math",
  "probability_output",
  "score_output",
  "finance_output",
  "realized_roi",
  "financial_attribution",
  "causality_claim",
  "productivity_claim",
  "customer_facing_output",
  "customer_facing_financial_output",
  "customer_facing_economic_output",
  "individual_attribution",
  "manager_or_team_ranking",
  "people_decisioning"
];

const ALLOWED_INPUT_FIELDS = new Set([
  "source_fixture",
  "data_model_spine_readiness_lock",
  "boundary_plans",
  "generated_at"
]);

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const SAFE_REF_PATTERN = /^[A-Za-z0-9._:|-]+$/;

const FORBIDDEN_KEY_PATTERNS = [
  /raw_?rows?/i,
  /^rows$/i,
  /^records$/i,
  /^events$/i,
  /dashboard_?rows?/i,
  /query_?text/i,
  /sql/i,
  /prompt/i,
  /response/i,
  /transcript/i,
  /credential/i,
  /secret/i,
  /user_?id/i,
  /employee/i,
  /person_?id/i,
  /^email$/i,
  /row_?id/i,
  /span_?id/i,
  /trace_?id/i,
  /job_?id/i,
  /query_?id/i,
  /api_?run/i,
  /dashboard_?url/i,
  /dashboard_?slug/i,
  /dashboard_?id/i,
  /export_?url/i,
  /connector_?job/i,
  /connector_?run/i,
  /active_?connector/i,
  /warehouse_?(?:ref|handle)/i,
  /feature_?table/i,
  /table_?ref/i,
  /dataset_?path/i,
  /project_?dataset_?table/i,
  /workbook_?id/i,
  /sigma_?workbook/i,
  /looker_?dashboard/i,
  /query_?job/i,
  /^project_?id$/i,
  /^dataset_?id$/i,
  /^table_?id$/i,
  /^project$/i,
  /^dataset$/i,
  /^table$/i,
  /source_?hash/i,
  /source_?refs?_?json/i,
  /org_?client_?id/i,
  /source_?package_?payload/i,
  /^source_packages$/i,
  /measurement_?cell_?series_?snapshots/i,
  /measurement_?cell_?series_?persistence/i,
  /evidence_?continuity_?persistence/i,
  /^payload_json$/i,
  /^validation_json$/i,
  /confidence/i,
  /probability/i,
  /^score$/i,
  /score_?like/i,
  /^roi$/i,
  /finance/i,
  /financial/i,
  /ebitda/i,
  /caus(?:al|ality)/i,
  /productivity/i,
  /customer_?facing/i
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
  /connector_run/i,
  /active_connector/i,
  /warehouse/i,
  /workbook/i,
  /dashboard/i,
  /dashboard_url/i,
  /export_url/i,
  /https?:\/\//i,
  /secret:\/\//i,
  /(?:^|[._:-])(?:project|dataset|table)[._:-]?(?:id|ref)?(?:[._:-]|$)/i,
  /(?:^|[._:-])(?:org|client|customer|user|employee|person|row|span|trace)[._:-]?id(?:[._:-]|$)/i,
  /(?:^|[._:-])(?:email|user|person|employee)[._:-]?hash(?:[._:-]|$)/i,
  /(?:^|[._:-])(?:source)[._:-]?(?:hash|ref)(?:[._:-]|$)/i,
  /(?:^|[._:-])(?:prompt|response|transcript|query|sql)[._:-]?(?:text|content)(?:[._:-]|$)/i
];

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
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

function falseMap(keys) {
  return Object.fromEntries(keys.map((key) => [key, false]));
}

function validationSummary(valid, gaps) {
  return {
    schema_version: VALIDATION_SCHEMA_VERSION,
    valid,
    gaps
  };
}

function isSafeRef(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 260 &&
    SAFE_REF_PATTERN.test(value) &&
    !FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(value)) &&
    !FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))
  );
}

function collectBoundaryValueLeakage(value, path = []) {
  const gaps = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      gaps.push(...collectBoundaryValueLeakage(item, [...path, String(index)]));
    });
    return gaps;
  }
  if (!value || typeof value !== "object") {
    if (
      typeof value === "string" &&
      !pathContains(path, "blocked_uses") &&
      !pathContains(path, "required_caveats") &&
      (FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(value)) ||
        FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value)))
    ) {
      gaps.push(`${path.join(".") || "value"} contains unsafe source text`);
    }
    return gaps;
  }
  for (const [key, nestedValue] of Object.entries(value)) {
    gaps.push(...collectBoundaryValueLeakage(nestedValue, [...path, key]));
  }
  return gaps;
}

function safeCompactString(value) {
  if (typeof value !== "string") return null;
  return isSafeRef(value) ? value : null;
}

function safeHash(value) {
  return typeof value === "string" && SHA256_PATTERN.test(value) ? value : null;
}

function sanitizeValidationGap(gap) {
  const text = String(gap ?? "validation_gap");
  return FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(text))
    ? "upstream_validation_gap_contains_unsafe_source_text"
    : text;
}

function uniqueSanitizedGaps(gaps) {
  return [...new Set(asArray(gaps).map(sanitizeValidationGap))];
}

function pathContains(path, name) {
  return path.some((part) => part === name);
}

function keyIsFalsePosture(path, key) {
  if (path.length !== 1) return false;
  return (
    (path[0] === "feeds" && FALSE_FEEDS.includes(key)) ||
    (path[0] === "boundary_policy" && BOUNDARY_POLICY_FIELDS.includes(key)) ||
    (path[0] === "source_wiring_posture" &&
      SOURCE_WIRING_POSTURE_FIELDS.includes(key))
  );
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

function safeGeneratedAt(input, options = {}) {
  const candidate = options.generatedAt ?? asRecord(input).generated_at;
  if (
    typeof candidate === "string" &&
    Number.isFinite(Date.parse(candidate)) &&
    !FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(candidate))
  ) {
    return { value: candidate, gaps: [] };
  }
  if (candidate !== undefined) {
    return {
      value: new Date().toISOString(),
      gaps: ["generated_at contains unsafe or invalid timestamp"]
    };
  }
  return { value: new Date().toISOString(), gaps: [] };
}

function inputBoundaryGaps(input, generatedAtGaps) {
  const record = asRecord(input);
  const wrapper = Object.prototype.hasOwnProperty.call(record, "source_fixture");
  if (!wrapper) return generatedAtGaps;
  const sidecar = Object.fromEntries(
    Object.entries(record).filter(([key]) => !ALLOWED_INPUT_FIELDS.has(key))
  );
  return [
    ...generatedAtGaps,
    ...collectBoundaryLeakage(sidecar),
    ...collectBoundaryValueLeakage(record.data_model_spine_readiness_lock, [
      "data_model_spine_readiness_lock"
    ]),
    ...collectBoundaryValueLeakage(record.boundary_plans, ["boundary_plans"]),
    ...Object.keys(sidecar)
      .filter((key) => !FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key)))
      .map((key) => `${key} is not allowed`)
  ];
}

function sourceFixtureFromInput(input) {
  const record = asRecord(input);
  return record.source_fixture ?? record;
}

function sourceLockFromInput(input, sourceFixture, generatedAt, options = {}) {
  const record = asRecord(input);
  if (record.data_model_spine_readiness_lock) {
    return {
      lock: asRecord(record.data_model_spine_readiness_lock),
      supplied: true
    };
  }
  return {
    lock: buildDataModelSpineReadinessLockFromObject(sourceFixture, {
      cwd: options.cwd ?? process.cwd(),
      generatedAt
    }),
    supplied: false
  };
}

function boundaryPlansFromInput(input, sourceFixture) {
  const record = asRecord(input);
  const suppliedPlans = asRecord(record.boundary_plans);
  const bigquerySupplied = Boolean(suppliedPlans.bigquery_export);
  const sigmaSupplied = Boolean(suppliedPlans.sigma_export);
  return {
    bigquery:
      suppliedPlans.bigquery_export ??
      buildAggregateConnectorBoundaryPlanFromObject(sourceFixture, {
        sourceSystem: "bigquery_export"
      }),
    sigma:
      suppliedPlans.sigma_export ??
      buildAggregateConnectorBoundaryPlanFromObject(sourceFixture, {
        sourceSystem: "sigma_export"
      }),
    bigquerySupplied,
    sigmaSupplied
  };
}

function lockRef(lock) {
  return {
    schema_version: safeCompactString(lock.schema_version),
    lock_state: safeCompactString(lock.lock_state),
    lock_hash: safeHash(lock.lock_hash),
    allowed_next_step: safeCompactString(lock.allowed_next_step),
    series_persistence_state: safeCompactString(lock.series_persistence_state)
  };
}

function sourceDescriptorFromBoundaryPlan(plan) {
  const quality = asRecord(plan.source_quality_posture);
  const validation = asRecord(plan.validation_summary);
  const connector = asRecord(plan.connector_adapter_ref);
  return {
    source_system: safeCompactString(plan.source_system),
    source_category: safeCompactString(plan.source_category),
    boundary_plan_id: safeCompactString(plan.boundary_plan_id),
    boundary_plan_state: safeCompactString(plan.boundary_plan_state),
    boundary_validation_state:
      validation.boundary_plan_valid === true
        ? "boundary_plan_validated"
        : "boundary_plan_not_validated",
    boundary_validation_gap_count: asArray(validation.gaps).length,
    connector_adapter_run_id: safeCompactString(connector.adapter_run_id),
    source_owner_role: safeCompactString(plan.source_owner_role),
    execution_mode: safeCompactString(plan.fluencytracr_execution_mode),
    aggregate_definition_ref: safeCompactString(plan.aggregate_definition_ref),
    aggregate_output_ref: safeCompactString(plan.aggregate_output_ref),
    approved_output_fields: asArray(plan.approved_output_fields).filter((field) =>
      isSafeRef(field)
    ),
    aggregate_grain: safeCompactString(plan.aggregate_grain),
    source_quality_posture: {
      k_min_posture: safeCompactString(quality.k_min_posture),
      suppression_posture: safeCompactString(quality.suppression_posture),
      freshness_state: safeCompactString(quality.freshness_state),
      legal_trust_review_state: safeCompactString(quality.legal_trust_review_state)
    }
  };
}

function compactDescriptorIsSafe(descriptor) {
  if (!["bigquery_export", "sigma_export"].includes(descriptor.source_system)) return false;
  if (descriptor.boundary_plan_state !== READY_BOUNDARY_PLAN_STATE) return false;
  if (!isSafeRef(String(descriptor.boundary_plan_id ?? ""))) return false;
  if (
    !String(descriptor.boundary_plan_id ?? "").startsWith(
      `aggregate_connector_boundary_plan_${descriptor.source_system}_`
    )
  ) {
    return false;
  }
  if (descriptor.boundary_validation_state !== "boundary_plan_validated") return false;
  if (descriptor.boundary_validation_gap_count !== 0) return false;
  if (!isSafeRef(String(descriptor.connector_adapter_run_id ?? ""))) return false;
  if (
    !String(descriptor.connector_adapter_run_id ?? "").startsWith(
      `controlled_aggregate_connector_adapter_${descriptor.source_system}_`
    )
  ) {
    return false;
  }
  if (descriptor.execution_mode !== "no_live_execution") return false;
  if (
    !String(descriptor.aggregate_definition_ref ?? "").startsWith(
      `aggregate_definition_review_${descriptor.source_system}_`
    )
  ) {
    return false;
  }
  if (
    !String(descriptor.aggregate_output_ref ?? "").startsWith(
      `reviewed_aggregate_output_${descriptor.source_system}_`
    )
  ) {
    return false;
  }
  for (const field of [
    "source_system",
    "source_category",
    "boundary_plan_id",
    "boundary_plan_state",
    "boundary_validation_state",
    "connector_adapter_run_id",
    "source_owner_role",
    "execution_mode",
    "aggregate_definition_ref",
    "aggregate_output_ref",
    "aggregate_grain"
  ]) {
    if (!isSafeRef(String(descriptor[field] ?? ""))) return false;
  }
  return asArray(descriptor.approved_output_fields).every((field) =>
    isSafeRef(String(field ?? ""))
  );
}

function allFalse(record, fields) {
  return fields.every((field) => asRecord(record)[field] === false);
}

function baseHardening(state, valid, gaps, generatedAt) {
  const sourceBound = state === READY_STATE && valid;
  return {
    schema_version: COMPACT_SOURCE_WIRING_HARDENING_SCHEMA_VERSION,
    hardening_id: `compact_source_wiring_hardening:${state.toLowerCase()}`,
    hardening_state: state,
    generated_at: generatedAt,
    derivation_version: DERIVATION_VERSION,
    source_bound: sourceBound,
    source_wiring_posture: {
      wiring_mode: "non_live_preparation",
      compact_descriptors_only: true,
      live_execution_authorized: false,
      credential_access_authorized: false,
      query_execution_authorized: false,
      raw_row_ingestion_authorized: false,
      dashboard_row_ingestion_authorized: false,
      customer_output_authorized: false
    },
    held_source_systems: [
      {
        source_system: "glean_query",
        hold_reason: "no_exact_scope_non_live_adapter_contract",
        required_future_decision: "glean_source_adapter_boundary_plan"
      }
    ],
    allowed_next_step: sourceBound ? ALLOWED_NEXT_STEP : HELD_NEXT_STEP,
    feeds: falseMap(FALSE_FEEDS),
    boundary_policy: falseMap(BOUNDARY_POLICY_FIELDS),
    required_caveats: REQUIRED_CAVEATS,
    blocked_uses: REQUIRED_BLOCKED_USES,
    hold_reasons: gaps,
    validation_summary: validationSummary(valid, gaps)
  };
}

function rejectedHardening(gaps, generatedAt) {
  const prerequisites = Object.fromEntries(PREREQUISITE_FIELDS.map((field) => [field, false]));
  const hardening = {
    ...baseHardening(REJECTED_STATE, false, ["boundary_leakage_rejected"], generatedAt),
    source_readiness_lock_ref: null,
    prepared_source_systems: [],
    prerequisites
  };
  hardening.hardening_hash = compactSourceWiringHardeningHash(hardening);
  return hardening;
}

export function compactSourceWiringHardeningHash(hardening) {
  const clone = JSON.parse(JSON.stringify(hardening));
  delete clone.hardening_hash;
  return sha256Json(clone);
}

export function buildCompactSourceWiringHardeningFromObject(input, options = {}) {
  const generatedAtResult = safeGeneratedAt(input, options);
  const generatedAt = generatedAtResult.value;
  const wrapperGaps = inputBoundaryGaps(input, generatedAtResult.gaps);
  if (wrapperGaps.length > 0) {
    return rejectedHardening(wrapperGaps, generatedAt);
  }

  const sourceFixture = sourceFixtureFromInput(input);
  const sourceLock = sourceLockFromInput(input, sourceFixture, generatedAt, options);
  const lock = sourceLock.lock;
  const plans = boundaryPlansFromInput(input, sourceFixture);
  const lockValidation = validateDataModelSpineReadinessLock(
    lock,
    sourceLock.supplied
      ? {
          cwd: options.cwd ?? process.cwd(),
          sourceFixture
        }
      : { cwd: options.cwd ?? process.cwd() }
  );
  const bigqueryValidation = validateAggregateConnectorBoundaryPlan(
    plans.bigquery,
    plans.bigquerySupplied ? { sourceFixture } : {}
  );
  const sigmaValidation = validateAggregateConnectorBoundaryPlan(
    plans.sigma,
    plans.sigmaSupplied ? { sourceFixture } : {}
  );
  const bigqueryDescriptor = sourceDescriptorFromBoundaryPlan(plans.bigquery);
  const sigmaDescriptor = sourceDescriptorFromBoundaryPlan(plans.sigma);
  const preparedSourceSystems = [bigqueryDescriptor, sigmaDescriptor];
  const feeds = falseMap(FALSE_FEEDS);
  const boundaryPolicy = falseMap(BOUNDARY_POLICY_FIELDS);
  const prerequisites = {
    data_model_spine_readiness_lock_valid:
      lockValidation.valid === true &&
      lock.lock_state === READY_LOCK_STATE &&
      lock.lock_hash === dataModelSpineReadinessLockHash(lock),
    bigquery_boundary_plan_valid:
      (plans.bigquerySupplied
        ? bigqueryValidation.valid === true
        : asRecord(plans.bigquery.validation_summary).boundary_plan_valid === true) &&
      plans.bigquery.boundary_plan_state === READY_BOUNDARY_PLAN_STATE,
    sigma_boundary_plan_valid:
      (plans.sigmaSupplied
        ? sigmaValidation.valid === true
        : asRecord(plans.sigma.validation_summary).boundary_plan_valid === true) &&
      plans.sigma.boundary_plan_state === READY_BOUNDARY_PLAN_STATE,
    compact_source_descriptors_only:
      preparedSourceSystems.every(compactDescriptorIsSafe) &&
      collectBoundaryLeakage(preparedSourceSystems).length === 0,
    all_live_wiring_feeds_false:
      allFalse(feeds, FALSE_FEEDS) && allFalse(boundaryPolicy, BOUNDARY_POLICY_FIELDS)
  };
  const gaps = [];
  if (!prerequisites.data_model_spine_readiness_lock_valid) {
    gaps.push("data_model_spine_readiness_lock_not_valid");
  }
  if (!prerequisites.bigquery_boundary_plan_valid) {
    gaps.push("bigquery_boundary_plan_not_valid");
  }
  if (!prerequisites.sigma_boundary_plan_valid) {
    gaps.push("sigma_boundary_plan_not_valid");
  }
  if (!prerequisites.compact_source_descriptors_only) {
    gaps.push("compact_source_descriptors_not_safe");
  }
  if (!prerequisites.all_live_wiring_feeds_false) {
    gaps.push("live_wiring_feeds_must_remain_false");
  }
  gaps.push(
    ...asArray(lockValidation.gaps),
    ...(plans.bigquerySupplied ? asArray(bigqueryValidation.gaps) : []),
    ...(plans.sigmaSupplied ? asArray(sigmaValidation.gaps) : [])
  );
  const holdReasons = uniqueSanitizedGaps(gaps);
  const valid = Object.values(prerequisites).every((value) => value === true) && gaps.length === 0;
  const hardening = {
    ...baseHardening(valid ? READY_STATE : HOLD_STATE, valid, valid ? [] : holdReasons, generatedAt),
    source_readiness_lock_ref: lockRef(lock),
    prepared_source_systems: preparedSourceSystems,
    prerequisites,
    feeds,
    boundary_policy: boundaryPolicy,
    hold_reasons: valid ? [] : holdReasons
  };
  if (hardening.source_readiness_lock_ref.lock_hash) {
    hardening.hardening_id =
      `compact_source_wiring_hardening:${hardening.source_readiness_lock_ref.lock_hash}`;
  }
  hardening.hardening_hash = compactSourceWiringHardeningHash(hardening);
  return hardening;
}

function collectRefShapeGaps(record, fields, label) {
  const gaps = [];
  const ref = asRecord(record);
  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(ref, field)) {
      gaps.push(`${label}.${field} is required`);
    }
  }
  gaps.push(...collectAllowedFieldsGaps(ref, new Set(fields), label));
  return gaps;
}

function collectDescriptorGaps(descriptor, label) {
  const gaps = collectRefShapeGaps(descriptor, SOURCE_DESCRIPTOR_FIELDS, label);
  if (!["bigquery_export", "sigma_export"].includes(descriptor.source_system)) {
    gaps.push(`${label}.source_system is unsupported`);
  }
  if (descriptor.boundary_plan_state !== READY_BOUNDARY_PLAN_STATE) {
    gaps.push(`${label}.boundary_plan_state must be ${READY_BOUNDARY_PLAN_STATE}`);
  }
  if (
    !String(descriptor.boundary_plan_id ?? "").startsWith(
      `aggregate_connector_boundary_plan_${descriptor.source_system}_`
    )
  ) {
    gaps.push(`${label}.boundary_plan_id must use governed boundary-plan prefix`);
  }
  if (
    !String(descriptor.connector_adapter_run_id ?? "").startsWith(
      `controlled_aggregate_connector_adapter_${descriptor.source_system}_`
    )
  ) {
    gaps.push(`${label}.connector_adapter_run_id must use governed adapter-run prefix`);
  }
  if (
    !String(descriptor.aggregate_definition_ref ?? "").startsWith(
      `aggregate_definition_review_${descriptor.source_system}_`
    )
  ) {
    gaps.push(`${label}.aggregate_definition_ref must use governed definition prefix`);
  }
  if (
    !String(descriptor.aggregate_output_ref ?? "").startsWith(
      `reviewed_aggregate_output_${descriptor.source_system}_`
    )
  ) {
    gaps.push(`${label}.aggregate_output_ref must use governed output prefix`);
  }
  if (descriptor.execution_mode !== "no_live_execution") {
    gaps.push(`${label}.execution_mode must be no_live_execution`);
  }
  for (const field of [
    "source_system",
    "source_category",
    "boundary_plan_state",
    "source_owner_role",
    "execution_mode",
    "aggregate_definition_ref",
    "aggregate_output_ref",
    "aggregate_grain"
  ]) {
    if (!isSafeRef(String(descriptor[field] ?? ""))) {
      gaps.push(`${label}.${field} must be safe compact metadata`);
    }
  }
  if (!Array.isArray(descriptor.approved_output_fields)) {
    gaps.push(`${label}.approved_output_fields must be an array`);
  } else {
    descriptor.approved_output_fields.forEach((field, index) => {
      if (!isSafeRef(String(field ?? ""))) {
        gaps.push(`${label}.approved_output_fields.${index} must be safe compact metadata`);
      }
    });
  }
  gaps.push(
    ...collectRefShapeGaps(
      descriptor.source_quality_posture,
      SOURCE_QUALITY_POSTURE_FIELDS,
      `${label}.source_quality_posture`
    )
  );
  return gaps;
}

function collectHardeningShapeGaps(hardening) {
  const gaps = [];
  const record = asRecord(hardening);
  gaps.push(...collectAllowedFieldsGaps(record, TOP_LEVEL_FIELDS, "hardening"));
  if (record.schema_version !== COMPACT_SOURCE_WIRING_HARDENING_SCHEMA_VERSION) {
    gaps.push("schema_version is unsupported");
  }
  if (![READY_STATE, HOLD_STATE, REJECTED_STATE].includes(record.hardening_state)) {
    gaps.push("hardening_state is unsupported");
  }
  const sourceBound = record.hardening_state === READY_STATE;
  const rejected = record.hardening_state === REJECTED_STATE;
  if (record.source_bound !== sourceBound) {
    gaps.push(`source_bound must be ${sourceBound}`);
  }
  if (sourceBound && record.allowed_next_step !== ALLOWED_NEXT_STEP) {
    gaps.push(`allowed_next_step must be ${ALLOWED_NEXT_STEP}`);
  }
  if (!sourceBound && record.allowed_next_step !== HELD_NEXT_STEP) {
    gaps.push(`allowed_next_step must be ${HELD_NEXT_STEP}`);
  }

  if (rejected) {
    if (record.source_readiness_lock_ref !== null) {
      gaps.push("source_readiness_lock_ref must be null for rejected records");
    }
  } else {
    gaps.push(
      ...collectRefShapeGaps(
        record.source_readiness_lock_ref,
        SOURCE_READINESS_LOCK_REF_FIELDS,
        "source_readiness_lock_ref"
      )
    );
  }
  const lockRefRecord = asRecord(record.source_readiness_lock_ref);
  if (sourceBound) {
    if (lockRefRecord.schema_version !== DATA_MODEL_SPINE_READINESS_LOCK_SCHEMA_VERSION) {
      gaps.push("source_readiness_lock_ref.schema_version is unsupported");
    }
    if (lockRefRecord.lock_state !== READY_LOCK_STATE) {
      gaps.push(`source_readiness_lock_ref.lock_state must be ${READY_LOCK_STATE}`);
    }
    if (!SHA256_PATTERN.test(String(lockRefRecord.lock_hash ?? ""))) {
      gaps.push("source_readiness_lock_ref.lock_hash must be a sha256 hash");
    }
  }

  gaps.push(
    ...collectRefShapeGaps(
      record.source_wiring_posture,
      SOURCE_WIRING_POSTURE_FIELDS,
      "source_wiring_posture"
    )
  );
  const posture = asRecord(record.source_wiring_posture);
  const expectedPosture = {
    wiring_mode: "non_live_preparation",
    compact_descriptors_only: true,
    live_execution_authorized: false,
    credential_access_authorized: false,
    query_execution_authorized: false,
    raw_row_ingestion_authorized: false,
    dashboard_row_ingestion_authorized: false,
    customer_output_authorized: false
  };
  for (const [field, expected] of Object.entries(expectedPosture)) {
    if (posture[field] !== expected) {
      gaps.push(`source_wiring_posture.${field} must be ${expected}`);
    }
  }

  const prepared = asArray(record.prepared_source_systems);
  if (sourceBound && stableStringify(prepared.map((source) => source.source_system)) !== stableStringify(["bigquery_export", "sigma_export"])) {
    gaps.push("prepared_source_systems must include bigquery_export and sigma_export");
  }
  prepared.forEach((descriptor, index) => {
    gaps.push(...collectDescriptorGaps(asRecord(descriptor), `prepared_source_systems.${index}`));
  });

  const held = asArray(record.held_source_systems);
  if (held.length !== 1 || asRecord(held[0]).source_system !== "glean_query") {
    gaps.push("held_source_systems must hold glean_query");
  }
  held.forEach((heldSource, index) => {
    gaps.push(...collectRefShapeGaps(asRecord(heldSource), HELD_SOURCE_SYSTEM_FIELDS, `held_source_systems.${index}`));
  });

  gaps.push(...collectRefShapeGaps(record.prerequisites, PREREQUISITE_FIELDS, "prerequisites"));
  const prerequisites = asRecord(record.prerequisites);
  for (const field of PREREQUISITE_FIELDS) {
    if (prerequisites[field] !== sourceBound) {
      gaps.push(`prerequisites.${field} must be ${sourceBound}`);
    }
  }

  const feeds = asRecord(record.feeds);
  gaps.push(...collectAllowedFieldsGaps(feeds, new Set(FALSE_FEEDS), "feeds"));
  for (const field of FALSE_FEEDS) {
    if (feeds[field] !== false) {
      gaps.push(`feeds.${field} must be false`);
    }
  }

  const boundaryPolicy = asRecord(record.boundary_policy);
  gaps.push(...collectAllowedFieldsGaps(boundaryPolicy, new Set(BOUNDARY_POLICY_FIELDS), "boundary_policy"));
  for (const field of BOUNDARY_POLICY_FIELDS) {
    if (boundaryPolicy[field] !== false) {
      gaps.push(`boundary_policy.${field} must be false`);
    }
  }

  for (const caveat of REQUIRED_CAVEATS) {
    if (!asArray(record.required_caveats).includes(caveat)) {
      gaps.push(`required_caveats must include: ${caveat}`);
    }
  }
  for (const blockedUse of REQUIRED_BLOCKED_USES) {
    if (!asArray(record.blocked_uses).includes(blockedUse)) {
      gaps.push(`blocked_uses must include ${blockedUse}`);
    }
  }
  gaps.push(...collectBoundaryLeakage(record));

  const expectedHash = compactSourceWiringHardeningHash(record);
  if (record.hardening_hash !== expectedHash) {
    gaps.push("hardening_hash must match hardening body");
  }

  const summary = asRecord(record.validation_summary);
  if (summary.schema_version !== VALIDATION_SCHEMA_VERSION) {
    gaps.push("validation_summary.schema_version is unsupported");
  }
  if (summary.valid !== sourceBound) {
    gaps.push(`validation_summary.valid must be ${sourceBound}`);
  }
  if (sourceBound && asArray(summary.gaps).length !== 0) {
    gaps.push("validation_summary.gaps must be empty for hardened records");
  }
  if (!sourceBound && stableStringify(summary.gaps) !== stableStringify(record.hold_reasons ?? [])) {
    gaps.push("validation_summary.gaps must match hold_reasons for held records");
  }
  return [...new Set(gaps)];
}

function collectSourceFixtureBindingGaps(hardening, options = {}) {
  if (!options.sourceFixture) return [];
  const expected = options.expectedHardening
    ? asRecord(options.expectedHardening)
    : buildCompactSourceWiringHardeningFromObject(options.sourceFixture, {
        cwd: options.cwd ?? process.cwd(),
        generatedAt: asRecord(hardening).generated_at
      });
  const record = asRecord(hardening);
  const gaps = [];
  for (const field of [
    "hardening_state",
    "source_bound",
    "source_readiness_lock_ref",
    "source_wiring_posture",
    "prepared_source_systems",
    "held_source_systems",
    "prerequisites",
    "allowed_next_step",
    "feeds",
    "boundary_policy",
    "required_caveats",
    "blocked_uses",
    "hold_reasons",
    "validation_summary"
  ]) {
    if (stableStringify(record[field]) !== stableStringify(expected[field])) {
      gaps.push(`sourceFixture binding mismatch for ${field}`);
    }
  }
  return gaps;
}

export function validateCompactSourceWiringHardening(hardening, options = {}) {
  const record = asRecord(hardening);
  const gaps = [
    ...collectHardeningShapeGaps(record),
    ...collectSourceFixtureBindingGaps(record, options)
  ];
  if (record.hardening_state === READY_STATE && !options.sourceFixture) {
    gaps.push("sourceFixture is required to validate ready compact source wiring hardening");
  }
  return validationSummary(
    gaps.length === 0 && record.hardening_state === READY_STATE,
    [...new Set(gaps)]
  );
}

function inputFromCliPath(path) {
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

function main() {
  const [, , inputPath] = process.argv;
  if (!inputPath) {
    console.error(
      "Usage: node scripts/run_ai_value_compact_source_wiring_hardening.mjs <source-fixture-or-hardening-input-json>"
    );
    process.exit(1);
  }
  const hardening = buildCompactSourceWiringHardeningFromObject(inputFromCliPath(inputPath), {
    cwd: process.cwd()
  });
  process.stdout.write(`${JSON.stringify(hardening, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
