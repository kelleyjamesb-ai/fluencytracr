#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildCustomerDataModelPromotionGateFromObject,
  customerDataModelPromotionGateHash,
  validateCustomerDataModelPromotionGate
} from "./run_ai_value_customer_data_model_promotion_gate.mjs";
import {
  buildMeasurementCellSnapshotProjectionFromObject,
  validateMeasurementCellSnapshotProjection
} from "./run_ai_value_measurement_cell_snapshot_projection.mjs";

export const CUSTOMER_DATA_MODEL_PERSISTENCE_PROMOTION_DECISION_SCHEMA_VERSION =
  "FT_AI_VALUE_CUSTOMER_DATA_MODEL_PERSISTENCE_PROMOTION_DECISION_2026_06";

const VALIDATION_SCHEMA_VERSION =
  `${CUSTOMER_DATA_MODEL_PERSISTENCE_PROMOTION_DECISION_SCHEMA_VERSION}_VALIDATION`;

const DERIVATION_VERSION =
  "ai_value_customer_data_model_persistence_promotion_decision_2026_06";

const READY_STATE =
  "READY_FOR_EXACT_SCOPE_CUSTOMER_DATA_MODEL_PERSISTENCE_IMPLEMENTATION_DECISION";
const HOLD_PREREQUISITES_STATE =
  "HOLD_FOR_CUSTOMER_DATA_MODEL_PERSISTENCE_PREREQUISITES";
const HOLD_GATE_STATE = "HOLD_FOR_VALID_CUSTOMER_DATA_MODEL_PROMOTION_GATE";
const REJECTED_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";

const SOURCE_GATE_READY_STATE =
  "READY_FOR_SEPARATE_CUSTOMER_DATA_MODEL_PERSISTENCE_PROMOTION_DECISION";

const TRUE_READY_FEEDS = ["customer_data_model_persistence_implementation_decision"];

const FALSE_FEEDS = [
  "customer_data_model_persistence_write",
  "customer_data_model_schema_creation",
  "customer_data_model_migration_creation",
  "customer_data_model_repository_write_path",
  "backend_route",
  "frontend_ui",
  "export_creation",
  "rendered_readout",
  "customer_facing_output",
  "customer_facing_financial_output",
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

const PERSISTENCE_SCOPE_FIELDS = [
  "internal_review_only",
  "source_bound",
  "compact_refs_only",
  "separate_implementation_decision_required",
  "persistence_authorized",
  "schema_authorized",
  "migration_authorized",
  "repository_write_authorized",
  "customer_read_authorized",
  "customer_write_authorized",
  "route_authorized",
  "ui_authorized",
  "export_authorized",
  "customer_facing_output_authorized",
  "live_connector_authorized",
  "model_output_authorized",
  "finance_output_authorized"
];

const CUSTOMER_EXPOSURE_FIELDS = [
  "customer_visible",
  "exposure_state",
  "status_posture_only",
  "value_proof_allowed",
  "customer_facing_output_allowed",
  "customer_facing_financial_output_allowed",
  "route_creation_allowed",
  "frontend_ui_creation_allowed",
  "export_allowed"
];

const BOUNDARY_POLICY_FIELDS = [
  "creates_persistence_table",
  "writes_customer_data_model",
  "creates_prisma_schema",
  "creates_migration",
  "creates_repository",
  "creates_backend_route",
  "creates_frontend_ui",
  "creates_export",
  "creates_rendered_readout",
  "emits_customer_facing_output",
  "runs_bigquery",
  "runs_sigma",
  "runs_glean_query",
  "runs_customer_connectors",
  "feeds_research_model",
  "emits_model_output",
  "emits_probability",
  "emits_score_like_output",
  "emits_finance_output",
  "computes_roi",
  "claims_causality",
  "measures_productivity"
];

const SOURCE_GATE_REF_FIELDS = [
  "gate_id",
  "gate_state",
  "gate_hash",
  "projection_id",
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

const PREREQUISITE_FIELDS = [
  "customer_data_model_promotion_gate_valid",
  "source_projection_bound",
  "route_projection_contract_ready",
  "auth_tenant_enforcement_ready",
  "legacy_readout_guard_resolved",
  "export_governance_ready",
  "legal_trust_review_ready",
  "privacy_k_min_review_ready",
  "customer_value_language_ready"
];

const REQUIRED_BLOCKED_USES = [
  "customer_data_model_persistence_write",
  "customer_data_model_schema_creation",
  "customer_data_model_migration_creation",
  "customer_data_model_repository_write_path",
  "customer_data_model_read_route",
  "customer_data_model_write_route",
  "frontend_ui",
  "export_creation",
  "rendered_readout",
  "customer_facing_output",
  "customer_facing_financial_output",
  "live_connector_execution",
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
  "Customer Data Model Persistence Promotion Decision is a decision gate only.",
  "Ready state authorizes only a later exact-scope implementation decision, not persistence writes in this runner.",
  "No customer-facing route, UI, export, rendered readout, live connector execution, model output, finance output, or customer-facing output is authorized."
];

const TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "decision_id",
  "decision_state",
  "generated_at",
  "derivation_version",
  "source_gate_ref",
  "persistence_scope",
  "customer_exposure",
  "prerequisites",
  "future_physical_model",
  "hold_reasons",
  "feeds",
  "boundary_policy",
  "required_caveats",
  "blocked_uses",
  "validation_summary",
  "decision_hash"
]);

const FUTURE_PHYSICAL_MODEL_FIELDS = [
  "candidate_model_id",
  "candidate_model_state",
  "candidate_grain",
  "allowed_audience",
  "required_next_step",
  "current_authority",
  "future_table_scope",
  "blocked_sections"
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
  /payload_?json/i,
  /source_?refs_?json/i,
  /validation_?json/i,
  /persistence_?write/i,
  /schema_?creation/i,
  /migration_?creation/i,
  /repository_?write/i,
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
  /https?:\/\//i,
  /secret:\/\//i,
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /\btranscript\b/i,
  /(?:^|[._:-])(?:user|employee|person|row|span|project|dataset|table)[._:-]?id(?:[._:-]|$)/i,
  /(?:^|[._:-])(?:email|user|person|employee)[._:-]?hash(?:[._:-]|$)/i,
  /(?:^|[._:-])(?:prompt|response|transcript|query|sql)[._:-]?(?:text|content)(?:[._:-]|$)/i,
  /(?:^|[._:-])(?:prompt|response|transcript|query|sql)[._:-]?(?:export|digest)(?:[._:-]|$)/i
];

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function falseMap(keys) {
  return Object.fromEntries(keys.map((key) => [key, false]));
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

function pathContains(path, name) {
  return path.some((part) => part === name);
}

function keyIsFalsePosture(path, key) {
  if (path.length !== 1) return false;
  return (
    (path[0] === "feeds" && [...TRUE_READY_FEEDS, ...FALSE_FEEDS].includes(key)) ||
    (path[0] === "boundary_policy" && BOUNDARY_POLICY_FIELDS.includes(key)) ||
    (path[0] === "customer_exposure" && CUSTOMER_EXPOSURE_FIELDS.includes(key)) ||
    (path[0] === "persistence_scope" && PERSISTENCE_SCOPE_FIELDS.includes(key))
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

function sourceProjectionFromInput(input, options = {}) {
  if (options.sourceProjection) return asRecord(options.sourceProjection);
  const record = asRecord(input);
  if (record.schema_version === "FT_AI_VALUE_MEASUREMENT_CELL_SNAPSHOT_PROJECTION_2026_06") {
    return record;
  }
  if (record.source_projection_ref || record.source_gate_ref) return null;
  return buildMeasurementCellSnapshotProjectionFromObject(input);
}

function isGate(value) {
  return asRecord(value).schema_version === "FT_AI_VALUE_CUSTOMER_DATA_MODEL_PROMOTION_GATE_2026_06";
}

function isProjection(value) {
  return asRecord(value).schema_version === "FT_AI_VALUE_MEASUREMENT_CELL_SNAPSHOT_PROJECTION_2026_06";
}

function sourceGateFromInput(input, options = {}) {
  if (options.sourceGate) return asRecord(options.sourceGate);
  if (isGate(input)) return asRecord(input);
  return buildCustomerDataModelPromotionGateFromObject(input, options);
}

function sourceGateRef(gate) {
  const sourceRef = asRecord(gate.source_projection_ref);
  return {
    gate_id: gate.gate_id,
    gate_state: gate.gate_state,
    gate_hash: gate.gate_hash,
    projection_id: sourceRef.projection_id,
    projection_hash: sourceRef.projection_hash,
    snapshot_id: sourceRef.snapshot_id,
    org_id: sourceRef.org_id,
    client_id: sourceRef.client_id ?? null,
    measurement_cell_id: sourceRef.measurement_cell_id,
    measurement_plan_id: sourceRef.measurement_plan_id,
    expectation_path_id: sourceRef.expectation_path_id,
    metric_id: sourceRef.metric_id,
    workflow_family: sourceRef.workflow_family,
    function_area: sourceRef.function_area,
    cohort_key: sourceRef.cohort_key,
    window_mode: sourceRef.window_mode,
    milestone_day: sourceRef.milestone_day,
    aggregate_source_system: sourceRef.aggregate_source_system,
    pipeline_boundary_hash: sourceRef.pipeline_boundary_hash
  };
}

function futurePhysicalModel() {
  return {
    candidate_model_id: "source_bound_customer_data_model_persistence_candidate",
    candidate_model_state: "implementation_decision_required",
    candidate_grain: "org_measurement_plan_measurement_cell_metric_expectation_path_window",
    allowed_audience: "internal_product_data_model_review",
    required_next_step: "separate_exact_scope_implementation_decision_required",
    current_authority: "measurement_cell_snapshots_backend_internal_projection",
    future_table_scope: "not_authorized_by_this_decision_runner",
    blocked_sections: [
      "customer_read_route",
      "customer_write_route",
      "frontend_ui",
      "export",
      "rendered_readout",
      "model_output",
      "financial_output",
      "raw_payloads"
    ]
  };
}

function baseDecision(state, valid, gaps, generatedAt) {
  const ready = state === READY_STATE && valid;
  return {
    schema_version: CUSTOMER_DATA_MODEL_PERSISTENCE_PROMOTION_DECISION_SCHEMA_VERSION,
    decision_id: `customer_data_model_persistence_promotion_decision:${state.toLowerCase()}`,
    decision_state: state,
    generated_at: generatedAt,
    derivation_version: DERIVATION_VERSION,
    persistence_scope: {
      internal_review_only: true,
      source_bound: ready,
      compact_refs_only: true,
      separate_implementation_decision_required: true,
      persistence_authorized: false,
      schema_authorized: false,
      migration_authorized: false,
      repository_write_authorized: false,
      customer_read_authorized: false,
      customer_write_authorized: false,
      route_authorized: false,
      ui_authorized: false,
      export_authorized: false,
      customer_facing_output_authorized: false,
      live_connector_authorized: false,
      model_output_authorized: false,
      finance_output_authorized: false
    },
    customer_exposure: {
      customer_visible: false,
      exposure_state: "not_authorized_by_decision",
      status_posture_only: true,
      value_proof_allowed: false,
      customer_facing_output_allowed: false,
      customer_facing_financial_output_allowed: false,
      route_creation_allowed: false,
      frontend_ui_creation_allowed: false,
      export_allowed: false
    },
    feeds: {
      customer_data_model_persistence_implementation_decision: ready,
      ...falseMap(FALSE_FEEDS)
    },
    boundary_policy: falseMap(BOUNDARY_POLICY_FIELDS),
    future_physical_model: futurePhysicalModel(),
    required_caveats: REQUIRED_CAVEATS,
    blocked_uses: REQUIRED_BLOCKED_USES,
    validation_summary: validationSummary(valid, gaps)
  };
}

function rejectedDecision(gaps, generatedAt) {
  const decision = {
    ...baseDecision(REJECTED_STATE, false, gaps, generatedAt),
    source_gate_ref: null,
    prerequisites: Object.fromEntries(PREREQUISITE_FIELDS.map((field) => [field, false])),
    hold_reasons: ["boundary_leakage_rejected"]
  };
  decision.decision_hash = customerDataModelPersistencePromotionDecisionHash(decision);
  return decision;
}

function prerequisiteBooleans(gateUsable, gateReady, gate) {
  const gatePrerequisites = asRecord(gate.prerequisites);
  return {
    customer_data_model_promotion_gate_valid: gateUsable,
    source_projection_bound: gateReady && gate.gate_state === SOURCE_GATE_READY_STATE,
    route_projection_contract_ready: gatePrerequisites.route_projection_contract_ready === true,
    auth_tenant_enforcement_ready: gatePrerequisites.auth_tenant_enforcement_ready === true,
    legacy_readout_guard_resolved: gatePrerequisites.legacy_readout_guard_resolved === true,
    export_governance_ready: gatePrerequisites.export_governance_ready === true,
    legal_trust_review_ready: gatePrerequisites.legal_trust_review_ready === true,
    privacy_k_min_review_ready: gatePrerequisites.privacy_k_min_review_ready === true,
    customer_value_language_ready: gatePrerequisites.customer_value_language_ready === true
  };
}

function holdReasons(prerequisites) {
  const reasons = [];
  if (!prerequisites.customer_data_model_promotion_gate_valid) {
    reasons.push("customer_data_model_promotion_gate_invalid");
  }
  if (!prerequisites.source_projection_bound) {
    reasons.push("customer_data_model_promotion_gate_not_ready");
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
  return reasons;
}

export function customerDataModelPersistencePromotionDecisionHash(decision) {
  const clone = JSON.parse(JSON.stringify(decision));
  delete clone.decision_hash;
  return sha256Json(clone);
}

export function buildCustomerDataModelPersistencePromotionDecisionFromObject(input, options = {}) {
  const generatedAt = safeGeneratedAt(input, options);
  const leakageGaps = isGate(input) || isProjection(input) ? [] : collectBoundaryLeakage(input);
  if (leakageGaps.length > 0 && !isGate(input)) {
    return rejectedDecision(leakageGaps, generatedAt);
  }

  const projection = sourceProjectionFromInput(input, options);
  const projectionValidation = projection
    ? validateMeasurementCellSnapshotProjection(projection)
    : { valid: false, gaps: ["source projection is required"] };
  const gate = sourceGateFromInput(input, {
    ...options,
    sourceProjection: projection
  });
  const gateValidation = validateCustomerDataModelPromotionGate(gate, {
    sourceProjection: projection
  });
  const gateReady = gateValidation.valid === true;
  const gateRefGaps = gate.gate_hash ? collectSourceGateRefGaps(sourceGateRef(gate)) : [];
  const gateUsable =
    gateReady ||
    ([
      "HOLD_FOR_CUSTOMER_DATA_MODEL_PREREQUISITES",
      "HOLD_FOR_VALID_MEASUREMENT_CELL_SNAPSHOT_PROJECTION"
    ].includes(gate.gate_state) &&
      gate.gate_hash === customerDataModelPromotionGateHash(gate) &&
      gateRefGaps.length === 0);
  const prerequisites = prerequisiteBooleans(gateUsable, gateReady, gate);
  const reasons = holdReasons(prerequisites);
  const state =
    projectionValidation.valid !== true || !gateUsable
      ? HOLD_GATE_STATE
      : gateReady && reasons.length === 0
        ? READY_STATE
        : HOLD_PREREQUISITES_STATE;
  const valid = state === READY_STATE;
  const gaps = valid
    ? []
    : [
        ...new Set([
          ...reasons,
          ...gateRefGaps.map((gap) => `source_gate: ${gap}`),
          ...gateValidation.gaps.map((gap) => `source_gate: ${gap}`)
        ])
      ];
  const decision = {
    ...baseDecision(state, valid, gaps, generatedAt),
    source_gate_ref: gateUsable ? sourceGateRef(gate) : null,
    prerequisites,
    hold_reasons: reasons
  };
  if (decision.source_gate_ref?.org_id && decision.source_gate_ref?.measurement_cell_id) {
    decision.decision_id =
      `customer_data_model_persistence_promotion_decision:${decision.source_gate_ref.org_id}:${decision.source_gate_ref.measurement_cell_id}`;
  }
  decision.decision_hash = customerDataModelPersistencePromotionDecisionHash(decision);
  return decision;
}

function collectAllowedFieldsGaps(record, allowedFields, label) {
  return Object.keys(asRecord(record))
    .filter((key) => !allowedFields.has(key))
    .map((key) => `${label}.${key} is not allowed`);
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

function collectSourceGateRefGaps(ref) {
  const gaps = [];
  for (const field of SOURCE_GATE_REF_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(ref, field)) {
      gaps.push(`source_gate_ref.${field} is required`);
      continue;
    }
    if (
      field !== "milestone_day" &&
      ref[field] != null &&
      typeof ref[field] === "string" &&
      !isSafeRef(ref[field]) &&
      !SHA256_PATTERN.test(ref[field])
    ) {
      gaps.push(`source_gate_ref.${field} must be safe compact metadata`);
    }
  }
  if (ref.window_mode !== "milestone") {
    gaps.push("source_gate_ref.window_mode must be milestone");
  }
  return gaps;
}

function collectShapeGaps(decision) {
  const gaps = [];
  const record = asRecord(decision);
  gaps.push(...collectAllowedFieldsGaps(record, TOP_LEVEL_FIELDS, "decision"));
  if (record.schema_version !== CUSTOMER_DATA_MODEL_PERSISTENCE_PROMOTION_DECISION_SCHEMA_VERSION) {
    gaps.push("schema_version is unsupported");
  }
  if (![READY_STATE, HOLD_PREREQUISITES_STATE, HOLD_GATE_STATE, REJECTED_STATE].includes(record.decision_state)) {
    gaps.push("decision_state is unsupported");
  }
  for (const [label, fields] of [
    ["source_gate_ref", SOURCE_GATE_REF_FIELDS],
    ["persistence_scope", PERSISTENCE_SCOPE_FIELDS],
    ["customer_exposure", CUSTOMER_EXPOSURE_FIELDS],
    ["prerequisites", PREREQUISITE_FIELDS],
    ["future_physical_model", FUTURE_PHYSICAL_MODEL_FIELDS]
  ]) {
    const nested = asRecord(record[label]);
    if (record.decision_state === READY_STATE || label !== "source_gate_ref") {
      for (const field of fields) {
        if (!Object.prototype.hasOwnProperty.call(nested, field)) {
          gaps.push(`${label}.${field} is required`);
        }
      }
    }
    gaps.push(...collectAllowedFieldsGaps(nested, new Set(fields), label));
  }
  if (record.decision_state === READY_STATE) {
    const sourceRef = asRecord(record.source_gate_ref);
    gaps.push(...collectSourceGateRefGaps(sourceRef));
    for (const field of PREREQUISITE_FIELDS) {
      if (asRecord(record.prerequisites)[field] !== true) {
        gaps.push(`prerequisites.${field} must be true for ready decisions`);
      }
    }
  }
  for (const field of PERSISTENCE_SCOPE_FIELDS) {
    let expected = false;
    if (
      ["internal_review_only", "compact_refs_only", "separate_implementation_decision_required"].includes(field)
    ) {
      expected = true;
    }
    if (field === "source_bound") expected = record.decision_state === READY_STATE;
    if (asRecord(record.persistence_scope)[field] !== expected) {
      gaps.push(`persistence_scope.${field} must be ${expected}`);
    }
  }
  for (const field of CUSTOMER_EXPOSURE_FIELDS) {
    let expected = false;
    if (field === "exposure_state") expected = "not_authorized_by_decision";
    if (field === "status_posture_only") expected = true;
    if (asRecord(record.customer_exposure)[field] !== expected) {
      gaps.push(`customer_exposure.${field} must be ${expected}`);
    }
  }
  const feeds = asRecord(record.feeds);
  gaps.push(...collectAllowedFieldsGaps(feeds, new Set([...TRUE_READY_FEEDS, ...FALSE_FEEDS]), "feeds"));
  const ready = record.decision_state === READY_STATE;
  if (feeds.customer_data_model_persistence_implementation_decision !== ready) {
    gaps.push(`feeds.customer_data_model_persistence_implementation_decision must be ${ready}`);
  }
  for (const feed of FALSE_FEEDS) {
    if (feeds[feed] !== false) gaps.push(`feeds.${feed} must be false`);
  }
  const boundary = asRecord(record.boundary_policy);
  gaps.push(...collectAllowedFieldsGaps(boundary, new Set(BOUNDARY_POLICY_FIELDS), "boundary_policy"));
  for (const field of BOUNDARY_POLICY_FIELDS) {
    if (boundary[field] !== false) gaps.push(`boundary_policy.${field} must be false`);
  }
  if (stableStringify(record.required_caveats) !== stableStringify(REQUIRED_CAVEATS)) {
    gaps.push("required_caveats must match governed customer data model persistence caveats exactly");
  }
  if (stableStringify(record.blocked_uses) !== stableStringify(REQUIRED_BLOCKED_USES)) {
    gaps.push("blocked_uses must match governed customer data model persistence blocked uses exactly");
  }
  if (!Array.isArray(record.hold_reasons)) {
    gaps.push("hold_reasons must be an array");
  }
  if (record.decision_state === READY_STATE && record.hold_reasons.length !== 0) {
    gaps.push("hold_reasons must be empty for ready decisions");
  }
  if (!record.decision_hash || !SHA256_PATTERN.test(record.decision_hash)) {
    gaps.push("decision_hash must be a sha256 hash");
  } else if (record.decision_hash !== customerDataModelPersistencePromotionDecisionHash(record)) {
    gaps.push("decision_hash must match compact decision envelope");
  }
  return gaps;
}

function collectSourceBindingGaps(decision, options = {}) {
  const record = asRecord(decision);
  const gaps = [];
  if (record.decision_state !== READY_STATE) return gaps;
  if (!options.sourceProjection || !options.sourceGate) {
    gaps.push("sourceProjection and sourceGate are required to validate ready persistence decisions");
    return gaps;
  }
  const gateValidation = validateCustomerDataModelPromotionGate(options.sourceGate, {
    sourceProjection: options.sourceProjection
  });
  if (gateValidation.valid !== true) {
    gaps.push("sourceGate must be a valid ready customer data model promotion gate");
    return gaps;
  }
  const expectedRef = sourceGateRef(options.sourceGate);
  const actualRef = asRecord(record.source_gate_ref);
  for (const field of SOURCE_GATE_REF_FIELDS) {
    if (stableStringify(actualRef[field]) !== stableStringify(expectedRef[field])) {
      gaps.push(`source_gate_ref.${field} does not match source gate`);
    }
  }
  return gaps;
}

export function validateCustomerDataModelPersistencePromotionDecision(decision, options = {}) {
  const leakageGaps = collectBoundaryLeakage(decision);
  const shapeGaps = collectShapeGaps(decision);
  const bindingGaps = collectSourceBindingGaps(decision, options);
  const summary = asRecord(asRecord(decision).validation_summary);
  const summaryGaps = Array.isArray(summary.gaps)
    ? summary.gaps.filter((gap) => typeof gap === "string" && gap.length > 0)
    : [];
  const gaps = [...leakageGaps, ...shapeGaps, ...bindingGaps];
  const ready = asRecord(decision).decision_state === READY_STATE;
  if (summary.valid !== ready) {
    gaps.push(`validation_summary.valid must be ${ready}`);
  }
  if (ready && summaryGaps.length > 0) {
    gaps.push("validation_summary.gaps must be empty for ready decisions");
  }
  if (!ready) {
    gaps.push(...summaryGaps);
    if (summaryGaps.length === 0) gaps.push("decision_state is not ready");
  }
  return validationSummary(gaps.length === 0, gaps);
}

function main() {
  const [, , inputPath] = process.argv;
  if (!inputPath) {
    throw new Error(
      "Usage: run_ai_value_customer_data_model_persistence_promotion_decision.mjs <snapshot-or-projection-or-gate.json>"
    );
  }
  const input = JSON.parse(readFileSync(resolve(inputPath), "utf8"));
  const decision = buildCustomerDataModelPersistencePromotionDecisionFromObject(input);
  process.stdout.write(`${JSON.stringify(decision, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
