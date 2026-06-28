#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildMeasurementCellSnapshotProjectionFromObject,
  validateMeasurementCellSnapshotProjection
} from "./run_ai_value_measurement_cell_snapshot_projection.mjs";

export const CUSTOMER_DATA_MODEL_PROMOTION_GATE_SCHEMA_VERSION =
  "FT_AI_VALUE_CUSTOMER_DATA_MODEL_PROMOTION_GATE_2026_06";

const VALIDATION_SCHEMA_VERSION =
  `${CUSTOMER_DATA_MODEL_PROMOTION_GATE_SCHEMA_VERSION}_VALIDATION`;

const DERIVATION_VERSION =
  "ai_value_customer_data_model_promotion_gate_2026_06";

const READY_STATE =
  "READY_FOR_SEPARATE_CUSTOMER_DATA_MODEL_PERSISTENCE_PROMOTION_DECISION";
const HOLD_PREREQUISITES_STATE = "HOLD_FOR_CUSTOMER_DATA_MODEL_PREREQUISITES";
const HOLD_PROJECTION_STATE = "HOLD_FOR_VALID_MEASUREMENT_CELL_SNAPSHOT_PROJECTION";
const REJECTED_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";

const REQUIRED_PREREQUISITES = {
  customer_projection_decision_state: "PROMOTE_SOURCE_BOUND_CUSTOMER_PROJECTION_CONTRACTS",
  route_projection_contract_state: "SOURCE_BOUND_ROUTE_PROJECTION_CONTRACT_READY",
  auth_tenant_enforcement_state: "ORG_SCOPED_AUTH_AND_TENANT_GUARDS_READY",
  legacy_readout_guard_state: "ROUTE_AND_UI_GUARD_RESOLVED",
  export_governance_state: "EXPORT_PROHIBITION_CONTRACT_READY",
  legal_trust_review_state: "APPROVED_FOR_STATUS_POSTURE_ONLY",
  privacy_k_min_review_state: "AGGREGATE_PRIVACY_POSTURE_READY",
  customer_value_language_state: "POSTURE_ONLY_VALUE_LANGUAGE_APPROVED"
};

const DEFAULT_PREREQUISITES = {
  customer_projection_decision_state: "HOLD_FOR_SOURCE_BOUND_PROJECTION_CONTRACTS",
  route_projection_contract_state: "not_promoted",
  auth_tenant_enforcement_state: "not_promoted",
  legacy_readout_guard_state: "not_resolved",
  export_governance_state: "not_promoted",
  legal_trust_review_state: "not_approved",
  privacy_k_min_review_state: "not_promoted",
  customer_value_language_state: "not_approved"
};

const TRUE_READY_FEEDS = ["customer_data_model_persistence_promotion_decision"];

const FALSE_FEEDS = [
  "customer_data_model_persistence_write",
  "customer_data_model_schema_creation",
  "backend_route",
  "frontend_ui",
  "export_creation",
  "rendered_readout",
  "customer_facing_output",
  "customer_facing_financial_output",
  "customer_facing_economic_output",
  "live_bigquery_execution",
  "live_sigma_execution",
  "live_glean_query",
  "customer_connector_execution",
  "research_model_feed",
  "model_output",
  "probability_output",
  "score_like_output",
  "finance_output"
];

const BOUNDARY_FALSE_FIELDS = [
  "creates_persistence_table",
  "writes_customer_data_model",
  "creates_prisma_schema",
  "creates_migration",
  "creates_repository",
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
  "customer_data_model_persistence_write",
  "customer_data_model_schema_creation",
  "customer_data_model_read_route",
  "customer_data_model_write_route",
  "frontend_ui",
  "export_creation",
  "rendered_readout",
  "customer_facing_output",
  "customer_facing_financial_output",
  "customer_facing_economic_output",
  "live_connector_execution",
  "live_bigquery_execution",
  "live_sigma_execution",
  "live_glean_query",
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
  "Customer Data Model Promotion Gate is a gate only; it does not authorize persistence, routes, UI, exports, rendered readouts, live connectors, model output, finance output, or customer-facing output.",
  "Ready state authorizes only a separate exact-scope customer data model persistence promotion decision.",
  "Any future customer-visible projection must remain posture/status only and carry source refs, caveats, blocked uses, suppression, privacy, k-min, and audience boundaries."
];

const TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "gate_id",
  "gate_state",
  "generated_at",
  "derivation_version",
  "source_projection_ref",
  "decision_scope",
  "customer_exposure",
  "prerequisites",
  "prerequisite_proof_refs",
  "candidate_data_model",
  "hold_reasons",
  "feeds",
  "boundary_policy",
  "required_caveats",
  "blocked_uses",
  "validation_summary",
  "gate_hash"
]);

const DECISION_SCOPE_FIELDS = [
  "internal_review_only",
  "source_bound",
  "compact_refs_only",
  "separate_promotion_decision_required",
  "persistence_authorized",
  "schema_authorized",
  "route_authorized",
  "ui_authorized",
  "export_authorized",
  "customer_facing_output_authorized",
  "customer_facing_financial_output_authorized",
  "live_connector_authorized",
  "model_output_authorized",
  "finance_output_authorized"
];

const CUSTOMER_EXPOSURE_FIELDS = [
  "customer_visible",
  "exposure_state",
  "value_proof_allowed",
  "customer_facing_output_allowed",
  "customer_facing_financial_output_allowed",
  "route_creation_allowed",
  "frontend_ui_creation_allowed",
  "export_allowed"
];

const PROJECTION_FALSE_POSTURE_FIELDS = new Set([
  "customer_facing",
  "customer_projection_promoted",
  "route_authorized",
  "ui_authorized",
  "export_authorized",
  "customer_visible",
  "value_proof_allowed",
  "customer_facing_output_allowed",
  "customer_facing_financial_output_allowed",
  "route_creation_allowed",
  "frontend_ui_creation_allowed",
  "export_allowed",
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
  "score_like_output",
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
]);

const SOURCE_PROJECTION_REF_FIELDS = [
  "schema_version",
  "projection_id",
  "projection_state",
  "projection_hash",
  "snapshot_id",
  "org_id",
  "client_id",
  "measurement_cell_id",
  "measurement_plan_id",
  "expectation_path_id",
  "metric_id",
  "workflow_family",
  "function_area",
  "cohort_key",
  "window_mode",
  "milestone_day",
  "aggregate_source_system",
  "pipeline_boundary_hash"
];

const CANDIDATE_DATA_MODEL_FIELDS = [
  "candidate_model_id",
  "candidate_model_state",
  "grain",
  "allowed_audience",
  "required_future_persistence",
  "required_future_route_contract",
  "required_future_auth_scope",
  "required_future_tests",
  "blocked_sections"
];

const PREREQUISITE_FIELDS = [
  "measurement_cell_snapshot_projection_valid",
  "customer_projection_decision_ready",
  "route_projection_contract_ready",
  "auth_tenant_enforcement_ready",
  "legacy_readout_guard_resolved",
  "export_governance_ready",
  "legal_trust_review_ready",
  "privacy_k_min_review_ready",
  "customer_value_language_ready",
  "prerequisite_proofs_bound"
];

const PREREQUISITE_STATE_FIELDS = Object.keys(REQUIRED_PREREQUISITES);

const PREREQUISITE_PROOF_REF_FIELDS = [
  "ref_id",
  "state",
  "source_doc_ref",
  "proof_hash"
];

const SAFE_REF_PATTERN = /^[A-Za-z0-9._:|-]+$/;
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
  /full_?measurement_?cell/i,
  /payload_?json/i,
  /source_?refs_?json/i,
  /validation_?json/i,
  /customer_?visible/i,
  /customer_?facing/i,
  /backend_?route/i,
  /frontend_?ui/i,
  /export_?creation/i,
  /rendered_?readout/i,
  /live_?(?:bigquery|sigma|glean|connector)/i,
  /^confidence/i,
  /confidence_?score/i,
  /model_?output/i,
  /research_?model_?feed/i,
  /^probability$/i,
  /probability_?score/i,
  /^score$/i,
  /^roi$/i,
  /ebitda/i,
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
  /(?:^|[._:-])(?:prompt|response|transcript|query|sql)[._:-]?(?:text|content)(?:[._:-]|$)/i,
  /(?:^|[._:-])(?:prompt|response|transcript|query|sql)[._:-]?(?:export|digest)(?:[._:-]|$)/i
];

function falseMap(keys) {
  return Object.fromEntries(keys.map((key) => [key, false]));
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
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

function isSafeRef(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 260 &&
    SAFE_REF_PATTERN.test(value) &&
    !FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))
  );
}

function pathContains(path, name) {
  return path.some((part) => part === name);
}

function keyIsFalsePosture(path, key) {
  if (path.length !== 1) return false;
  return (
    (path[0] === "feeds" && [...TRUE_READY_FEEDS, ...FALSE_FEEDS].includes(key)) ||
    (path[0] === "boundary_policy" && BOUNDARY_FALSE_FIELDS.includes(key)) ||
    (path[0] === "customer_exposure" && CUSTOMER_EXPOSURE_FIELDS.includes(key)) ||
    (path[0] === "decision_scope" && DECISION_SCOPE_FIELDS.includes(key))
  );
}

function isProjectionObject(value) {
  return asRecord(value).schema_version === "FT_AI_VALUE_MEASUREMENT_CELL_SNAPSHOT_PROJECTION_2026_06";
}

function collectProjectionObjectLeakage(value, path = []) {
  const gaps = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      gaps.push(...collectProjectionObjectLeakage(item, [...path, String(index)]));
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
    const falsePostureValue =
      PROJECTION_FALSE_POSTURE_FIELDS.has(key) &&
      (nestedValue === false || nestedValue === "held_for_source_bound_projection_promotion");
    if (
      !falsePostureValue &&
      !pathContains(path, "blocked_uses") &&
      !pathContains(path, "required_caveats") &&
      FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key))
    ) {
      gaps.push(`${nextPath.join(".")} is not allowed`);
      continue;
    }
    gaps.push(...collectProjectionObjectLeakage(nestedValue, nextPath));
  }
  return gaps;
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

function validationSummary(valid, gaps) {
  return {
    schema_version: VALIDATION_SCHEMA_VERSION,
    valid,
    gaps
  };
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

function prerequisiteProofHash(proof) {
  return sha256Json({
    ref_id: proof.ref_id,
    state: proof.state,
    source_doc_ref: proof.source_doc_ref
  });
}

function prerequisiteProofRefs(options = {}) {
  const refs = asRecord(options.prerequisiteProofRefs);
  return Object.fromEntries(
    PREREQUISITE_STATE_FIELDS.map((field) => {
      const proof = asRecord(refs[field]);
      if (Object.keys(proof).length === 0) return [field, null];
      return [
        field,
        {
          ref_id: proof.ref_id ?? null,
          state: proof.state ?? null,
          source_doc_ref: proof.source_doc_ref ?? null,
          proof_hash: proof.proof_hash ?? null
        }
      ];
    })
  );
}

function collectPrerequisiteProofGaps(values, refs) {
  const gaps = [];
  for (const field of PREREQUISITE_STATE_FIELDS) {
    const proof = asRecord(refs[field]);
    if (Object.keys(proof).length === 0) {
      gaps.push(`prerequisite_proof_refs.${field} is required`);
      continue;
    }
    for (const proofField of PREREQUISITE_PROOF_REF_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(proof, proofField)) {
        gaps.push(`prerequisite_proof_refs.${field}.${proofField} is required`);
      }
    }
    if (!isSafeRef(proof.ref_id)) {
      gaps.push(`prerequisite_proof_refs.${field}.ref_id must be safe compact metadata`);
    }
    if (!isSafeRef(proof.source_doc_ref)) {
      gaps.push(`prerequisite_proof_refs.${field}.source_doc_ref must be safe compact metadata`);
    }
    if (proof.state !== values[field]) {
      gaps.push(`prerequisite_proof_refs.${field}.state must match prerequisite state`);
    }
    if (proof.state !== REQUIRED_PREREQUISITES[field]) {
      gaps.push(`prerequisite_proof_refs.${field}.state must be promoted`);
    }
    if (!SHA256_PATTERN.test(String(proof.proof_hash ?? ""))) {
      gaps.push(`prerequisite_proof_refs.${field}.proof_hash must be a sha256 hash`);
    } else if (proof.proof_hash !== prerequisiteProofHash(proof)) {
      gaps.push(`prerequisite_proof_refs.${field}.proof_hash must match compact proof ref`);
    }
  }
  return gaps;
}

function prerequisiteValues(options) {
  return {
    ...DEFAULT_PREREQUISITES,
    ...asRecord(options.prerequisites)
  };
}

function sourceProjectionFromInput(input) {
  const record = asRecord(input);
  if (record.schema_version === "FT_AI_VALUE_MEASUREMENT_CELL_SNAPSHOT_PROJECTION_2026_06") {
    return record;
  }
  if (record.measurement_cell_snapshot_projection) {
    return asRecord(record.measurement_cell_snapshot_projection);
  }
  return buildMeasurementCellSnapshotProjectionFromObject(input);
}

function sourceProjectionRef(projection) {
  const snapshotIdentity = asRecord(projection.snapshot_identity);
  const pathway = asRecord(projection.pathway_binding);
  const metric = asRecord(projection.metric_context);
  const workflow = asRecord(projection.workflow_context);
  const window = asRecord(projection.window_context);
  const source = asRecord(projection.source_context);
  return {
    schema_version: projection.schema_version,
    projection_id: projection.projection_id,
    projection_state: projection.projection_state,
    projection_hash: projection.projection_hash,
    snapshot_id: snapshotIdentity.snapshot_id,
    org_id: snapshotIdentity.org_id,
    client_id: snapshotIdentity.client_id ?? null,
    measurement_cell_id: snapshotIdentity.measurement_cell_id,
    measurement_plan_id: snapshotIdentity.measurement_plan_id,
    expectation_path_id: pathway.expectation_path_id,
    metric_id: metric.metric_id,
    workflow_family: workflow.workflow_family,
    function_area: workflow.function_area,
    cohort_key: workflow.cohort_key,
    window_mode: window.window_mode,
    milestone_day: window.milestone_day,
    aggregate_source_system: source.aggregate_source_system,
    pipeline_boundary_hash: source.pipeline_boundary_hash
  };
}

function gateIdForProjectionRef(ref) {
  return `customer_data_model_promotion_gate:${ref.org_id}:${ref.measurement_cell_id}`;
}

function projectionRefGaps(ref) {
  const gaps = [];
  for (const field of SOURCE_PROJECTION_REF_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(ref, field)) {
      gaps.push(`source_projection_ref.${field} is required`);
      continue;
    }
    if (
      field !== "milestone_day" &&
      typeof ref[field] === "string" &&
      !isSafeRef(ref[field]) &&
      !SHA256_PATTERN.test(ref[field])
    ) {
      gaps.push(`source_projection_ref.${field} must be safe compact metadata`);
    }
    if (
      field === "client_id" &&
      ref[field] != null &&
      (typeof ref[field] !== "string" || !isSafeRef(ref[field]))
    ) {
      gaps.push("source_projection_ref.client_id must be safe compact metadata");
    }
  }
  if (ref.window_mode !== "milestone") {
    gaps.push("source_projection_ref.window_mode must be milestone");
  }
  if (!Number.isInteger(Number(ref.milestone_day))) {
    gaps.push("source_projection_ref.milestone_day must be an integer");
  }
  return gaps;
}

function prerequisiteBooleans(values, projectionValid, prerequisiteProofsBound = false) {
  return {
    measurement_cell_snapshot_projection_valid: projectionValid,
    customer_projection_decision_ready:
      values.customer_projection_decision_state ===
      REQUIRED_PREREQUISITES.customer_projection_decision_state,
    route_projection_contract_ready:
      values.route_projection_contract_state ===
      REQUIRED_PREREQUISITES.route_projection_contract_state,
    auth_tenant_enforcement_ready:
      values.auth_tenant_enforcement_state ===
      REQUIRED_PREREQUISITES.auth_tenant_enforcement_state,
    legacy_readout_guard_resolved:
      values.legacy_readout_guard_state ===
      REQUIRED_PREREQUISITES.legacy_readout_guard_state,
    export_governance_ready:
      values.export_governance_state === REQUIRED_PREREQUISITES.export_governance_state,
    legal_trust_review_ready:
      values.legal_trust_review_state === REQUIRED_PREREQUISITES.legal_trust_review_state,
    privacy_k_min_review_ready:
      values.privacy_k_min_review_state ===
      REQUIRED_PREREQUISITES.privacy_k_min_review_state,
    customer_value_language_ready:
      values.customer_value_language_state ===
      REQUIRED_PREREQUISITES.customer_value_language_state,
    prerequisite_proofs_bound: prerequisiteProofsBound
  };
}

function holdReasons(prerequisites, projectionValid) {
  const reasons = [];
  if (!projectionValid) reasons.push("measurement_cell_snapshot_projection_invalid");
  if (!prerequisites.customer_projection_decision_ready) {
    reasons.push("customer_projection_decision_not_promoted");
  }
  if (!prerequisites.route_projection_contract_ready) {
    reasons.push("route_projection_contract_not_ready");
  }
  if (!prerequisites.auth_tenant_enforcement_ready) {
    reasons.push("auth_tenant_enforcement_not_ready");
  }
  if (!prerequisites.legacy_readout_guard_resolved) {
    reasons.push("legacy_readout_guard_not_resolved");
  }
  if (!prerequisites.export_governance_ready) {
    reasons.push("export_governance_not_ready");
  }
  if (!prerequisites.legal_trust_review_ready) {
    reasons.push("legal_trust_review_not_ready");
  }
  if (!prerequisites.privacy_k_min_review_ready) {
    reasons.push("privacy_k_min_review_not_ready");
  }
  if (!prerequisites.customer_value_language_ready) {
    reasons.push("customer_value_language_not_ready");
  }
  if (!prerequisites.prerequisite_proofs_bound) {
    reasons.push("prerequisite_proofs_not_bound");
  }
  return reasons;
}

function baseGate(state, valid, gaps, generatedAt) {
  const ready = state === READY_STATE && valid;
  return {
    schema_version: CUSTOMER_DATA_MODEL_PROMOTION_GATE_SCHEMA_VERSION,
    gate_id: `customer_data_model_promotion_gate:${state.toLowerCase()}`,
    gate_state: state,
    generated_at: generatedAt,
    derivation_version: DERIVATION_VERSION,
    decision_scope: {
      internal_review_only: true,
      source_bound: ready,
      compact_refs_only: true,
      separate_promotion_decision_required: true,
      persistence_authorized: false,
      schema_authorized: false,
      route_authorized: false,
      ui_authorized: false,
      export_authorized: false,
      customer_facing_output_authorized: false,
      customer_facing_financial_output_authorized: false,
      live_connector_authorized: false,
      model_output_authorized: false,
      finance_output_authorized: false
    },
    customer_exposure: {
      customer_visible: false,
      exposure_state: "not_authorized_by_gate",
      value_proof_allowed: false,
      customer_facing_output_allowed: false,
      customer_facing_financial_output_allowed: false,
      route_creation_allowed: false,
      frontend_ui_creation_allowed: false,
      export_allowed: false
    },
    feeds: {
      customer_data_model_persistence_promotion_decision: ready,
      ...falseMap(FALSE_FEEDS)
    },
    boundary_policy: falseMap(BOUNDARY_FALSE_FIELDS),
    required_caveats: REQUIRED_CAVEATS,
    blocked_uses: REQUIRED_BLOCKED_USES,
    validation_summary: validationSummary(valid, gaps)
  };
}

function candidateDataModel() {
  return {
    candidate_model_id: "source_bound_customer_data_model_candidate",
    candidate_model_state: "promotion_gate_only",
    grain: "org_measurement_plan_measurement_cell_metric_expectation_path_window",
    allowed_audience: "internal_product_data_model_review",
    required_future_persistence: "separate_exact_scope_promotion_decision_required",
    required_future_route_contract: "separate_source_bound_route_projection_contract_required",
    required_future_auth_scope: "org_scoped_auth_and_tenant_guards_required",
    required_future_tests: [
      "cross_org_read_denial",
      "cross_org_write_denial",
      "role_denial",
      "source_ref_drift_rejection",
      "raw_payload_rejection",
      "blocked_use_carry_forward",
      "export_denial",
      "customer_facing_financial_output_denial"
    ],
    blocked_sections: [
      "rendered_readout",
      "financial_output",
      "model_output",
      "raw_payloads",
      "full_source_packages",
      "full_measurement_cells"
    ]
  };
}

function rejectedGate(gaps, generatedAt) {
  const gate = {
    ...baseGate(REJECTED_STATE, false, gaps, generatedAt),
    prerequisites: prerequisiteBooleans(DEFAULT_PREREQUISITES, false, false),
    prerequisite_proof_refs: prerequisiteProofRefs(),
    candidate_data_model: candidateDataModel(),
    hold_reasons: ["boundary_leakage_rejected"]
  };
  gate.gate_hash = customerDataModelPromotionGateHash(gate);
  return gate;
}

export function customerDataModelPromotionGateHash(gate) {
  const clone = JSON.parse(JSON.stringify(gate));
  delete clone.gate_hash;
  return sha256Json(clone);
}

export function buildCustomerDataModelPromotionGateFromObject(input, options = {}) {
  const generatedAt = safeGeneratedAt(input, options);
  const inputRecord = asRecord(input);
  const hasProjectionWrapper = Object.prototype.hasOwnProperty.call(
    inputRecord,
    "measurement_cell_snapshot_projection"
  );
  const hasSnapshotWrapper = Object.prototype.hasOwnProperty.call(inputRecord, "snapshot");
  if (hasProjectionWrapper && hasSnapshotWrapper) {
    return rejectedGate(["projection wrapper cannot include snapshot sidecar"], generatedAt);
  }
  if (
    (hasProjectionWrapper || hasSnapshotWrapper) &&
    Object.keys(inputRecord).some((key) => !["measurement_cell_snapshot_projection", "snapshot"].includes(key))
  ) {
    return rejectedGate(["projection wrapper cannot include sidecar fields"], generatedAt);
  }
  const leakageGaps = isProjectionObject(input)
    ? collectProjectionObjectLeakage(input)
    : hasProjectionWrapper && isProjectionObject(inputRecord.measurement_cell_snapshot_projection)
      ? collectProjectionObjectLeakage(inputRecord.measurement_cell_snapshot_projection)
      : collectBoundaryLeakage(input);
  if (leakageGaps.length > 0) {
    return rejectedGate(leakageGaps, generatedAt);
  }

  const projection = sourceProjectionFromInput(input);
  const projectionValidation = validateMeasurementCellSnapshotProjection(projection);
  const projectionValid = projectionValidation.valid === true;
  const values = prerequisiteValues(options);
  const proofRefs = prerequisiteProofRefs(options);
  const proofGaps = collectPrerequisiteProofGaps(values, proofRefs);
  const prerequisites = prerequisiteBooleans(values, projectionValid, proofGaps.length === 0);
  const reasons = [...holdReasons(prerequisites, projectionValid), ...proofGaps];
  const state = !projectionValid
    ? HOLD_PROJECTION_STATE
    : reasons.length === 0
      ? READY_STATE
      : HOLD_PREREQUISITES_STATE;
  const valid = state === READY_STATE;
  const gate = {
    ...baseGate(state, valid, valid ? [] : reasons, generatedAt),
    source_projection_ref: projectionValid ? sourceProjectionRef(projection) : null,
    prerequisites,
    prerequisite_proof_refs: proofRefs,
    candidate_data_model: candidateDataModel(),
    hold_reasons: reasons
  };
  gate.gate_id = projectionValid
    ? gateIdForProjectionRef(asRecord(gate.source_projection_ref))
    : `customer_data_model_promotion_gate:${state.toLowerCase()}`;
  gate.gate_hash = customerDataModelPromotionGateHash(gate);
  return gate;
}

function collectSourceProjectionBindingGaps(gate, options = {}) {
  const record = asRecord(gate);
  const gaps = [];
  if (record.gate_state !== READY_STATE) return gaps;
  if (!options.sourceProjection) {
    gaps.push("sourceProjection is required to validate ready customer data model promotion gates");
    return gaps;
  }
  const projection = sourceProjectionFromInput(options.sourceProjection);
  const projectionValidation = validateMeasurementCellSnapshotProjection(projection);
  if (projectionValidation.valid !== true) {
    gaps.push("sourceProjection must be a valid Measurement Cell Snapshot Projection");
    return gaps;
  }
  const expectedRef = sourceProjectionRef(projection);
  const actualRef = asRecord(record.source_projection_ref);
  for (const field of SOURCE_PROJECTION_REF_FIELDS) {
    if (stableStringify(actualRef[field]) !== stableStringify(expectedRef[field])) {
      gaps.push(`source_projection_ref.${field} does not match source projection`);
    }
  }
  const expectedGateId = gateIdForProjectionRef(expectedRef);
  if (record.gate_id !== expectedGateId) {
    gaps.push("gate_id does not match source projection binding");
  }
  return gaps;
}

function collectGateShapeGaps(gate) {
  const gaps = [];
  const record = asRecord(gate);
  gaps.push(...collectAllowedFieldsGaps(record, TOP_LEVEL_FIELDS, "gate"));
  if (record.gate_state === READY_STATE) {
    for (const field of TOP_LEVEL_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(record, field)) {
        gaps.push(`gate.${field} is required`);
      }
    }
  }
  if (record.schema_version !== CUSTOMER_DATA_MODEL_PROMOTION_GATE_SCHEMA_VERSION) {
    gaps.push("schema_version is unsupported");
  }
  if (![READY_STATE, HOLD_PREREQUISITES_STATE, HOLD_PROJECTION_STATE, REJECTED_STATE].includes(record.gate_state)) {
    gaps.push("gate_state is unsupported");
  }
  for (const [label, fields] of [
    ["decision_scope", DECISION_SCOPE_FIELDS],
    ["customer_exposure", CUSTOMER_EXPOSURE_FIELDS],
    ["candidate_data_model", CANDIDATE_DATA_MODEL_FIELDS],
    ["prerequisites", PREREQUISITE_FIELDS]
  ]) {
    const nested = asRecord(record[label]);
    for (const field of fields) {
      if (!Object.prototype.hasOwnProperty.call(nested, field)) {
        gaps.push(`${label}.${field} is required`);
      }
    }
    if (record.gate_state === READY_STATE && label === "prerequisites") {
      for (const field of PREREQUISITE_FIELDS) {
        if (nested[field] !== true) {
          gaps.push(`prerequisites.${field} must be true for ready gates`);
        }
      }
    }
    gaps.push(...collectAllowedFieldsGaps(nested, new Set(fields), label));
  }
  const proofRefs = asRecord(record.prerequisite_proof_refs);
  gaps.push(
    ...collectAllowedFieldsGaps(
      proofRefs,
      new Set(PREREQUISITE_STATE_FIELDS),
      "prerequisite_proof_refs"
    )
  );
  if (record.gate_state === READY_STATE) {
    const prerequisiteValuesForValidation = {
      customer_projection_decision_state: asRecord(proofRefs.customer_projection_decision_state).state,
      route_projection_contract_state: asRecord(proofRefs.route_projection_contract_state).state,
      auth_tenant_enforcement_state: asRecord(proofRefs.auth_tenant_enforcement_state).state,
      legacy_readout_guard_state: asRecord(proofRefs.legacy_readout_guard_state).state,
      export_governance_state: asRecord(proofRefs.export_governance_state).state,
      legal_trust_review_state: asRecord(proofRefs.legal_trust_review_state).state,
      privacy_k_min_review_state: asRecord(proofRefs.privacy_k_min_review_state).state,
      customer_value_language_state: asRecord(proofRefs.customer_value_language_state).state
    };
    gaps.push(...collectPrerequisiteProofGaps(prerequisiteValuesForValidation, proofRefs));
  }
  if (record.gate_state === READY_STATE) {
    const ref = asRecord(record.source_projection_ref);
    for (const field of SOURCE_PROJECTION_REF_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(ref, field)) {
        gaps.push(`source_projection_ref.${field} is required`);
      }
    }
    gaps.push(...collectAllowedFieldsGaps(ref, new Set(SOURCE_PROJECTION_REF_FIELDS), "source_projection_ref"));
    gaps.push(...projectionRefGaps(ref));
  }
  for (const field of DECISION_SCOPE_FIELDS) {
    let expected = false;
    if (
      [
        "internal_review_only",
        "compact_refs_only",
        "separate_promotion_decision_required"
      ].includes(field)
    ) {
      expected = true;
    }
    if (field === "source_bound") {
      expected = record.gate_state === READY_STATE;
    }
    if (asRecord(record.decision_scope)[field] !== expected) {
      gaps.push(`decision_scope.${field} must be ${expected}`);
    }
  }
  for (const field of CUSTOMER_EXPOSURE_FIELDS) {
    const expected = field === "exposure_state" ? "not_authorized_by_gate" : false;
    if (asRecord(record.customer_exposure)[field] !== expected) {
      gaps.push(`customer_exposure.${field} must be ${expected}`);
    }
  }
  const feeds = asRecord(record.feeds);
  gaps.push(
    ...collectAllowedFieldsGaps(
      feeds,
      new Set([...TRUE_READY_FEEDS, ...FALSE_FEEDS]),
      "feeds"
    )
  );
  if (record.gate_state === READY_STATE) {
    if (feeds.customer_data_model_persistence_promotion_decision !== true) {
      gaps.push("feeds.customer_data_model_persistence_promotion_decision must be true for ready gates");
    }
  } else if (feeds.customer_data_model_persistence_promotion_decision !== false) {
    gaps.push("feeds.customer_data_model_persistence_promotion_decision must be false unless ready");
  }
  for (const feed of FALSE_FEEDS) {
    if (feeds[feed] !== false) gaps.push(`feeds.${feed} must be false`);
  }
  const boundary = asRecord(record.boundary_policy);
  gaps.push(...collectAllowedFieldsGaps(boundary, new Set(BOUNDARY_FALSE_FIELDS), "boundary_policy"));
  for (const field of BOUNDARY_FALSE_FIELDS) {
    if (boundary[field] !== false) gaps.push(`boundary_policy.${field} must be false`);
  }
  if (stableStringify(record.required_caveats) !== stableStringify(REQUIRED_CAVEATS)) {
    gaps.push("required_caveats must match governed customer data model gate caveats exactly");
  }
  if (stableStringify(record.blocked_uses) !== stableStringify(REQUIRED_BLOCKED_USES)) {
    gaps.push("blocked_uses must match governed customer data model gate blocked uses exactly");
  }
  if (!Array.isArray(record.hold_reasons)) {
    gaps.push("hold_reasons must be an array");
  }
  if (record.gate_state === READY_STATE && record.hold_reasons.length !== 0) {
    gaps.push("hold_reasons must be empty for ready gates");
  }
  if (!record.gate_hash || !SHA256_PATTERN.test(record.gate_hash)) {
    gaps.push("gate_hash must be a sha256 hash");
  } else if (record.gate_hash !== customerDataModelPromotionGateHash(record)) {
    gaps.push("gate_hash must match recomputed hash");
  }
  return gaps;
}

export function validateCustomerDataModelPromotionGate(gate, options = {}) {
  const leakageGaps = collectBoundaryLeakage(gate);
  const shapeGaps = collectGateShapeGaps(gate);
  const sourceBindingGaps = collectSourceProjectionBindingGaps(gate, options);
  const summary = asRecord(asRecord(gate).validation_summary);
  const summaryGaps = Array.isArray(summary.gaps)
    ? summary.gaps.filter((gap) => typeof gap === "string" && gap.length > 0)
    : [];
  const gaps = [...leakageGaps, ...shapeGaps, ...sourceBindingGaps];
  if (asRecord(gate).gate_state === READY_STATE && summary.valid !== true) {
    gaps.push("validation_summary.valid must be true for ready gates");
  }
  if (asRecord(gate).gate_state !== READY_STATE && summary.valid !== false) {
    gaps.push("validation_summary.valid must be false unless ready");
  }
  if (asRecord(gate).gate_state !== READY_STATE) {
    gaps.push(...summaryGaps);
    if (summaryGaps.length === 0) gaps.push("gate_state is not ready");
  }
  return validationSummary(gaps.length === 0, gaps);
}

function main() {
  const [, , inputPath] = process.argv;
  if (!inputPath) {
    throw new Error("Usage: run_ai_value_customer_data_model_promotion_gate.mjs <snapshot-or-projection.json>");
  }
  const input = JSON.parse(readFileSync(resolve(inputPath), "utf8"));
  const gate = buildCustomerDataModelPromotionGateFromObject(input);
  process.stdout.write(`${JSON.stringify(gate, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
