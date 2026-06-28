#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildDemoCustomerEvidenceHistoryInputFromSourceFixture,
  buildCustomerEvidenceHistoryReadPathProofFromObject,
  CUSTOMER_EVIDENCE_HISTORY_READ_PATH_PROOF_SCHEMA_VERSION,
  customerEvidenceHistoryReadPathProofHash,
  validateCustomerEvidenceHistoryReadPathProof
} from "./run_ai_value_customer_evidence_history_read_path_proof.mjs";
import {
  buildDurableSeriesReadPathDecisionFromObject,
  DURABLE_SERIES_READ_PATH_DECISION_SCHEMA_VERSION,
  durableSeriesReadPathDecisionHash,
  validateDurableSeriesReadPathDecision
} from "./run_ai_value_durable_series_read_path_decision.mjs";

export const DATA_MODEL_SPINE_READINESS_LOCK_SCHEMA_VERSION =
  "FT_AI_VALUE_DATA_MODEL_SPINE_READINESS_LOCK_2026_06";

const VALIDATION_SCHEMA_VERSION =
  `${DATA_MODEL_SPINE_READINESS_LOCK_SCHEMA_VERSION}_VALIDATION`;

const DERIVATION_VERSION =
  "ai_value_data_model_spine_readiness_lock_2026_06";

const READY_STATE = "COMPACT_CUSTOMER_DATA_MODEL_SPINE_READY";
const HOLD_STATE = "HOLD_FOR_VALID_COMPACT_CUSTOMER_DATA_MODEL_SPINE";
const REJECTED_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";

const SERIES_PERSISTENCE_HELD_STATE =
  "HELD_NOT_REQUIRED_FOR_CURRENT_READ_PATH";
const ALLOWED_NEXT_STEP =
  "harden_compact_customer_data_model_for_real_source_wiring";
const HELD_NEXT_STEP =
  "complete_customer_history_read_path_proof_before_source_wiring";

const READY_PROOF_STATE = "COMPACT_CUSTOMER_HISTORY_READ_PATH_PROVEN";
const READY_DECISION_STATE =
  "HOLD_SERIES_PERSISTENCE_COMPACT_CUSTOMER_HISTORY_READ_PATH_SATISFIED";

const EQUATION_TERMS = [
  "measurement_cell_snapshots_promoted",
  "ai_value_customer_data_model_snapshots_promoted",
  "customer_data_model_route_projection_ready",
  "customer_evidence_history_read_path_proven",
  "durable_series_read_path_holds_series_persistence",
  "all_blocked_outputs_false"
];

const EQUATION_FIELDS = [
  "kind",
  "formula",
  "terms",
  "statistical_model_equation_implemented",
  "confidence_math_implemented",
  "numeric_weights_implemented",
  "result"
];

const PREREQUISITE_FIELDS = [
  "measurement_cell_snapshots_promoted",
  "ai_value_customer_data_model_snapshots_promoted",
  "customer_data_model_route_projection_ready",
  "customer_evidence_history_read_path_proven",
  "durable_series_read_path_holds_series_persistence",
  "all_blocked_outputs_false"
];

const SOURCE_READINESS_REF_FIELDS = [
  "customer_evidence_history_read_path_proof_schema_version",
  "customer_evidence_history_read_path_proof_state",
  "customer_evidence_history_read_path_proof_hash",
  "durable_series_read_path_decision_schema_version",
  "durable_series_read_path_decision_state",
  "durable_series_read_path_decision_hash",
  "read_model",
  "required_milestone_days",
  "observed_milestone_days",
  "missing_milestone_days",
  "latest_clear_milestone_count",
  "series_persistence_required"
];

const LOCK_SCOPE_FIELDS = [
  "internal_review_only",
  "source_bound",
  "compact_refs_only",
  "status_posture_only",
  "statistical_model_authorized",
  "confidence_math_authorized",
  "numeric_weights_authorized",
  "model_output_authorized",
  "customer_facing_output_authorized",
  "customer_facing_financial_output_authorized",
  "live_connector_authorized",
  "series_persistence_authorized"
];

const FALSE_FEEDS = [
  "measurement_cell_series_snapshot_implementation_decision",
  "measurement_cell_series_snapshot_write",
  "measurement_cell_series_schema_creation",
  "measurement_cell_series_migration_creation",
  "measurement_cell_series_repository_write_path",
  "evidence_snapshot_extension",
  "backend_route",
  "frontend_ui",
  "export_creation",
  "rendered_readout",
  "customer_facing_output",
  "customer_facing_economic_output",
  "customer_facing_financial_output",
  "live_bigquery_execution",
  "live_sigma_execution",
  "live_glean_query",
  "customer_connector_execution",
  "research_model_feed",
  "model_output",
  "confidence_output",
  "probability_output",
  "score_like_output",
  "finance_output"
];

const BOUNDARY_POLICY_FIELDS = [
  "creates_measurement_cell_series_snapshots",
  "writes_measurement_cell_series_snapshot",
  "creates_prisma_schema",
  "creates_migration",
  "creates_repository",
  "extends_evidence_snapshots",
  "creates_backend_route",
  "creates_frontend_ui",
  "creates_export",
  "creates_rendered_readout",
  "runs_bigquery",
  "runs_sigma",
  "runs_glean_query",
  "runs_customer_connectors",
  "feeds_research_model",
  "implements_statistical_model_equation",
  "implements_confidence_math",
  "implements_numeric_weights",
  "emits_model_output",
  "emits_confidence_output",
  "emits_probability",
  "emits_score_like_output",
  "emits_finance_output",
  "emits_customer_facing_output",
  "emits_customer_facing_financial_output",
  "emits_customer_facing_economic_output",
  "computes_roi",
  "claims_causality",
  "measures_productivity"
];

const TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "lock_id",
  "lock_state",
  "generated_at",
  "derivation_version",
  "source_bound",
  "source_readiness_ref",
  "prerequisites",
  "equation",
  "series_persistence_state",
  "allowed_next_step",
  "lock_scope",
  "feeds",
  "boundary_policy",
  "required_caveats",
  "blocked_uses",
  "hold_reasons",
  "validation_summary",
  "lock_hash"
]);

const REQUIRED_BLOCKED_USES = [
  "statistical_model_equation",
  "confidence_math",
  "numeric_weights",
  "model_output",
  "confidence_output",
  "probability_output",
  "score_output",
  "research_model_feed",
  "measurement_cell_series_snapshot_write",
  "measurement_cell_series_schema_creation",
  "measurement_cell_series_migration_creation",
  "measurement_cell_series_repository_write_path",
  "evidence_snapshot_extension",
  "backend_route",
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
  "Data Model Spine Readiness Lock is a Boolean contract readiness record only; it does not implement statistical model math, confidence math, numeric weights, model output, finance output, or customer-facing economic output.",
  "The compact customer data model spine is ready for hardening against real source wiring only because current customer evidence history can be served from ai_value_customer_data_model_snapshots.",
  "Measurement Cell Series persistence remains held because the current read path does not require measurement_cell_series_snapshots."
];

const ALLOWED_INPUT_FIELDS = new Set([
  "source_fixture",
  "customer_evidence_history_read_path_input",
  "customer_evidence_history_read_path_proof",
  "durable_series_read_path_decision",
  "generated_at"
]);

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
  /trace_?id/i,
  /org_?id/i,
  /client_?id/i,
  /source_?refs?/i,
  /source_?hash/i,
  /pipeline_?ref/i,
  /source_?package/i,
  /full_?measurement_?cell/i,
  /measurement_?cell_?series_?snapshots/i,
  /evidence_?snapshots?_?extension/i,
  /backend_?route/i,
  /frontend_?ui/i,
  /export_?creation/i,
  /rendered_?readout/i,
  /live_?(?:bigquery|sigma|glean|connector)/i,
  /^confidence/i,
  /confidence_?score/i,
  /confidence_?math/i,
  /model_?equation/i,
  /model_?weight/i,
  /model_?output/i,
  /research_?model_?feed/i,
  /^probability$/i,
  /probability_?score/i,
  /^score$/i,
  /score_?like/i,
  /^roi$/i,
  /ebitda/i,
  /finance/i,
  /financial/i,
  /causality/i,
  /productivity/i,
  /customer_?facing/i
];

const FORBIDDEN_VALUE_PATTERNS = [
  /select\s+.+\s+from/i,
  /\braw_rows?\b/i,
  /\bbquxjob\b/i,
  /https?:\/\//i,
  /secret:\/\//i,
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /\btranscript\b/i,
  /(?:^|[._:-])(?:org|client|customer|user|employee|person|row|span|trace)[._:-]?id(?:[._:-]|$)/i,
  /(?:^|[._:-])(?:email|user|person|employee)[._:-]?hash(?:[._:-]|$)/i,
  /(?:^|[._:-])(?:prompt|response|transcript|query|sql)[._:-]?(?:text|content)(?:[._:-]|$)/i,
  /(?:^|[._:-])(?:source|pipeline)[._:-]?(?:ref|hash)(?:[._:-]|$)/i
];

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
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
    (path[0] === "boundary_policy" && BOUNDARY_POLICY_FIELDS.includes(key)) ||
    (path[0] === "lock_scope" && LOCK_SCOPE_FIELDS.includes(key)) ||
    (path[0] === "equation" &&
      [
        "statistical_model_equation_implemented",
        "confidence_math_implemented",
        "numeric_weights_implemented"
      ].includes(key))
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
  const isKnownSource =
    record.schema_version === CUSTOMER_EVIDENCE_HISTORY_READ_PATH_PROOF_SCHEMA_VERSION ||
    record.schema_version === DURABLE_SERIES_READ_PATH_DECISION_SCHEMA_VERSION ||
    Array.isArray(record.customer_data_model_snapshots);
  if (isKnownSource) return generatedAtGaps;
  if (record.source_fixture === undefined) {
    return generatedAtGaps;
  }
  const sidecar = Object.fromEntries(
    Object.entries(record).filter(([key]) => !ALLOWED_INPUT_FIELDS.has(key))
  );
  return [
    ...generatedAtGaps,
    ...collectBoundaryLeakage(sidecar),
    ...Object.keys(sidecar)
      .filter((key) => !FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key)))
      .map((key) => `${key} is not allowed`)
  ];
}

function inputForProof(input, options = {}) {
  const record = asRecord(input);
  if (record.schema_version === CUSTOMER_EVIDENCE_HISTORY_READ_PATH_PROOF_SCHEMA_VERSION) {
    return record;
  }
  if (record.schema_version === DURABLE_SERIES_READ_PATH_DECISION_SCHEMA_VERSION) {
    return record;
  }
  if (Array.isArray(record.customer_data_model_snapshots)) {
    return record;
  }
  if (record.customer_evidence_history_read_path_input) {
    return asRecord(record.customer_evidence_history_read_path_input);
  }
  if (record.customer_evidence_history_read_path_proof) {
    return asRecord(record.customer_evidence_history_read_path_proof);
  }
  if (record.durable_series_read_path_decision) {
    return asRecord(record.durable_series_read_path_decision);
  }
  const sourceFixture = record.source_fixture ?? record;
  return buildDemoCustomerEvidenceHistoryInputFromSourceFixture(sourceFixture, {
    cwd: options.cwd ?? process.cwd()
  });
}

function sourceRecordsFromInput(input, options = {}) {
  const proofInput = inputForProof(input, options);
  if (proofInput.schema_version === DURABLE_SERIES_READ_PATH_DECISION_SCHEMA_VERSION) {
    const decision = proofInput;
    return { proof: null, decision };
  }
  const proof =
    proofInput.schema_version === CUSTOMER_EVIDENCE_HISTORY_READ_PATH_PROOF_SCHEMA_VERSION
      ? proofInput
      : buildCustomerEvidenceHistoryReadPathProofFromObject(proofInput, {
          cwd: options.cwd ?? process.cwd(),
          generatedAt: options.generatedAt
        });
  const decision = buildDurableSeriesReadPathDecisionFromObject(proof, {
    cwd: options.cwd ?? process.cwd(),
    generatedAt: options.generatedAt
  });
  return { proof, decision };
}

function sourceReadinessRef(proof, decision) {
  const proofRecord = asRecord(proof);
  const decisionRecord = asRecord(decision);
  const proofHistoryRef = asRecord(proofRecord.customer_history_ref);
  const decisionSourceRef = asRecord(decisionRecord.source_proof_ref);
  const hasProofRef =
    proofRecord.schema_version === CUSTOMER_EVIDENCE_HISTORY_READ_PATH_PROOF_SCHEMA_VERSION ||
    typeof decisionSourceRef.proof_state === "string";
  return {
    customer_evidence_history_read_path_proof_schema_version:
      hasProofRef ? CUSTOMER_EVIDENCE_HISTORY_READ_PATH_PROOF_SCHEMA_VERSION : null,
    customer_evidence_history_read_path_proof_state:
      proofRecord.proof_state ?? decisionSourceRef.proof_state ?? null,
    customer_evidence_history_read_path_proof_hash:
      proofRecord.proof_hash ?? decisionSourceRef.proof_hash ?? null,
    durable_series_read_path_decision_schema_version: decisionRecord.schema_version ?? null,
    durable_series_read_path_decision_state: decisionRecord.decision_state ?? null,
    durable_series_read_path_decision_hash: decisionRecord.decision_hash ?? null,
    read_model: proofHistoryRef.read_model ?? "ai_value_customer_data_model_snapshots",
    required_milestone_days:
      proofHistoryRef.required_milestone_days ?? decisionSourceRef.required_milestone_days ?? [],
    observed_milestone_days:
      proofHistoryRef.observed_milestone_days ?? decisionSourceRef.observed_milestone_days ?? [],
    missing_milestone_days:
      proofHistoryRef.missing_milestone_days ?? decisionSourceRef.missing_milestone_days ?? [],
    latest_clear_milestone_count:
      proofHistoryRef.latest_clear_milestone_count ??
      decisionSourceRef.latest_clear_milestone_count ??
      0,
    series_persistence_required: false
  };
}

function allFalse(record, keys) {
  return keys.every((key) => asRecord(record)[key] === false);
}

function buildEquation(prerequisites) {
  return {
    kind: "boolean_contract_readiness",
    formula: EQUATION_TERMS.join(" AND "),
    terms: [...EQUATION_TERMS],
    statistical_model_equation_implemented: false,
    confidence_math_implemented: false,
    numeric_weights_implemented: false,
    result: EQUATION_TERMS.every((term) => prerequisites[term] === true)
  };
}

function baseLock(state, valid, gaps, generatedAt) {
  const sourceBound = state === READY_STATE && valid;
  const feeds = falseMap(FALSE_FEEDS);
  const boundaryPolicy = falseMap(BOUNDARY_POLICY_FIELDS);
  return {
    schema_version: DATA_MODEL_SPINE_READINESS_LOCK_SCHEMA_VERSION,
    lock_id: `data_model_spine_readiness_lock:${state.toLowerCase()}`,
    lock_state: state,
    generated_at: generatedAt,
    derivation_version: DERIVATION_VERSION,
    source_bound: sourceBound,
    series_persistence_state: SERIES_PERSISTENCE_HELD_STATE,
    allowed_next_step: sourceBound ? ALLOWED_NEXT_STEP : HELD_NEXT_STEP,
    lock_scope: {
      internal_review_only: true,
      source_bound: sourceBound,
      compact_refs_only: true,
      status_posture_only: true,
      statistical_model_authorized: false,
      confidence_math_authorized: false,
      numeric_weights_authorized: false,
      model_output_authorized: false,
      customer_facing_output_authorized: false,
      customer_facing_financial_output_authorized: false,
      live_connector_authorized: false,
      series_persistence_authorized: false
    },
    feeds,
    boundary_policy: boundaryPolicy,
    required_caveats: REQUIRED_CAVEATS,
    blocked_uses: REQUIRED_BLOCKED_USES,
    hold_reasons: gaps,
    validation_summary: validationSummary(valid, gaps)
  };
}

function rejectedLock(gaps, generatedAt) {
  const prerequisites = Object.fromEntries(PREREQUISITE_FIELDS.map((field) => [field, false]));
  prerequisites.all_blocked_outputs_false = false;
  const lock = {
    ...baseLock(REJECTED_STATE, false, ["boundary_leakage_rejected"], generatedAt),
    source_readiness_ref: null,
    prerequisites,
    equation: buildEquation(prerequisites)
  };
  lock.lock_hash = dataModelSpineReadinessLockHash(lock);
  return lock;
}

export function dataModelSpineReadinessLockHash(lock) {
  const clone = JSON.parse(JSON.stringify(lock));
  delete clone.lock_hash;
  return sha256Json(clone);
}

export function buildDataModelSpineReadinessLockFromObject(input, options = {}) {
  const generatedAtResult = safeGeneratedAt(input, options);
  const generatedAt = generatedAtResult.value;
  const wrapperGaps = inputBoundaryGaps(input, generatedAtResult.gaps);
  if (wrapperGaps.length > 0) {
    return rejectedLock(wrapperGaps, generatedAt);
  }

  const { proof, decision } = sourceRecordsFromInput(input, {
    ...options,
    generatedAt
  });
  const proofValidation = proof
    ? validateCustomerEvidenceHistoryReadPathProof(proof, {
        cwd: options.cwd ?? process.cwd()
      })
    : validationSummary(false, ["customer_evidence_history_read_path_proof is required"]);
  const decisionValidation = validateDurableSeriesReadPathDecision(decision, {
    cwd: options.cwd ?? process.cwd(),
    sourceCustomerEvidenceHistoryReadPathProof: proof ?? undefined
  });
  const ref = sourceReadinessRef(proof, decision);
  const feeds = falseMap(FALSE_FEEDS);
  const boundaryPolicy = falseMap(BOUNDARY_POLICY_FIELDS);
  const prerequisites = {
    measurement_cell_snapshots_promoted: true,
    ai_value_customer_data_model_snapshots_promoted: true,
    customer_data_model_route_projection_ready: true,
    customer_evidence_history_read_path_proven:
      proofValidation.valid === true &&
      asRecord(proof).proof_state === READY_PROOF_STATE &&
      asRecord(proof).proof_hash === customerEvidenceHistoryReadPathProofHash(proof),
    durable_series_read_path_holds_series_persistence:
      decisionValidation.valid === true &&
      asRecord(decision).decision_state === READY_DECISION_STATE &&
      asRecord(decision).decision_hash === durableSeriesReadPathDecisionHash(decision),
    all_blocked_outputs_false:
      allFalse(feeds, FALSE_FEEDS) && allFalse(boundaryPolicy, BOUNDARY_POLICY_FIELDS)
  };
  const equation = buildEquation(prerequisites);
  const gaps = [];
  if (!prerequisites.customer_evidence_history_read_path_proven) {
    gaps.push("customer_evidence_history_read_path_not_proven");
  }
  if (!prerequisites.durable_series_read_path_holds_series_persistence) {
    gaps.push("durable_series_read_path_hold_not_valid");
  }
  gaps.push(...asArray(proofValidation.gaps), ...asArray(decisionValidation.gaps));

  const valid = equation.result === true && gaps.length === 0;
  const lock = {
    ...baseLock(valid ? READY_STATE : HOLD_STATE, valid, valid ? [] : [...new Set(gaps)], generatedAt),
    source_readiness_ref: ref,
    prerequisites,
    equation,
    feeds,
    boundary_policy: boundaryPolicy,
    hold_reasons: valid ? [] : [...new Set(gaps)]
  };
  if (ref.durable_series_read_path_decision_hash) {
    lock.lock_id = `data_model_spine_readiness_lock:${ref.durable_series_read_path_decision_hash}`;
  }
  lock.lock_hash = dataModelSpineReadinessLockHash(lock);
  return lock;
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

function collectLockShapeGaps(lock) {
  const gaps = [];
  const record = asRecord(lock);
  gaps.push(...collectAllowedFieldsGaps(record, TOP_LEVEL_FIELDS, "lock"));
  if (record.schema_version !== DATA_MODEL_SPINE_READINESS_LOCK_SCHEMA_VERSION) {
    gaps.push("schema_version is unsupported");
  }
  if (![READY_STATE, HOLD_STATE, REJECTED_STATE].includes(record.lock_state)) {
    gaps.push("lock_state is unsupported");
  }

  const sourceBound = record.lock_state === READY_STATE;
  if (record.source_bound !== sourceBound) {
    gaps.push(`source_bound must be ${sourceBound}`);
  }
  if (record.series_persistence_state !== SERIES_PERSISTENCE_HELD_STATE) {
    gaps.push(`series_persistence_state must be ${SERIES_PERSISTENCE_HELD_STATE}`);
  }
  if (sourceBound && record.allowed_next_step !== ALLOWED_NEXT_STEP) {
    gaps.push(`allowed_next_step must be ${ALLOWED_NEXT_STEP}`);
  }
  if (!sourceBound && record.allowed_next_step !== HELD_NEXT_STEP) {
    gaps.push(`allowed_next_step must be ${HELD_NEXT_STEP}`);
  }

  gaps.push(...collectRefShapeGaps(record.source_readiness_ref, SOURCE_READINESS_REF_FIELDS, "source_readiness_ref"));
  gaps.push(...collectRefShapeGaps(record.prerequisites, PREREQUISITE_FIELDS, "prerequisites"));
  gaps.push(...collectRefShapeGaps(record.equation, EQUATION_FIELDS, "equation"));
  gaps.push(...collectRefShapeGaps(record.lock_scope, LOCK_SCOPE_FIELDS, "lock_scope"));

  const sourceRef = asRecord(record.source_readiness_ref);
  for (const field of [
    "customer_evidence_history_read_path_proof_hash",
    "durable_series_read_path_decision_hash"
  ]) {
    if (sourceBound && !SHA256_PATTERN.test(String(sourceRef[field] ?? ""))) {
      gaps.push(`source_readiness_ref.${field} must be a sha256 hash`);
    }
  }
  for (const field of [
    "customer_evidence_history_read_path_proof_state",
    "durable_series_read_path_decision_state",
    "read_model"
  ]) {
    if (sourceRef[field] !== null && !isSafeRef(String(sourceRef[field]))) {
      gaps.push(`source_readiness_ref.${field} must be safe compact metadata`);
    }
  }
  for (const field of [
    "required_milestone_days",
    "observed_milestone_days",
    "missing_milestone_days"
  ]) {
    if (!Array.isArray(sourceRef[field])) {
      gaps.push(`source_readiness_ref.${field} must be an array`);
    }
  }
  if (sourceRef.series_persistence_required !== false) {
    gaps.push("source_readiness_ref.series_persistence_required must be false");
  }

  const prerequisites = asRecord(record.prerequisites);
  for (const field of PREREQUISITE_FIELDS) {
    const expected = sourceBound;
    if (prerequisites[field] !== expected) {
      gaps.push(`prerequisites.${field} must be ${expected}`);
    }
  }

  const equation = asRecord(record.equation);
  if (equation.kind !== "boolean_contract_readiness") {
    gaps.push("equation.kind must be boolean_contract_readiness");
  }
  if (equation.formula !== EQUATION_TERMS.join(" AND ")) {
    gaps.push("equation.formula must match the compact readiness terms");
  }
  if (stableStringify(equation.terms) !== stableStringify(EQUATION_TERMS)) {
    gaps.push("equation.terms must match the compact readiness terms");
  }
  for (const field of [
    "statistical_model_equation_implemented",
    "confidence_math_implemented",
    "numeric_weights_implemented"
  ]) {
    if (equation[field] !== false) {
      gaps.push(`equation.${field} must be false`);
    }
  }
  if (equation.result !== sourceBound) {
    gaps.push(`equation.result must be ${sourceBound}`);
  }

  const lockScope = asRecord(record.lock_scope);
  for (const field of LOCK_SCOPE_FIELDS) {
    let expected = false;
    if (["internal_review_only", "compact_refs_only", "status_posture_only"].includes(field)) {
      expected = true;
    }
    if (field === "source_bound") {
      expected = sourceBound;
    }
    if (lockScope[field] !== expected) {
      gaps.push(`lock_scope.${field} must be ${expected}`);
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

  const expectedHash = dataModelSpineReadinessLockHash(record);
  if (record.lock_hash !== expectedHash) {
    gaps.push("lock_hash must match lock body");
  }

  const summary = asRecord(record.validation_summary);
  if (summary.schema_version !== VALIDATION_SCHEMA_VERSION) {
    gaps.push("validation_summary.schema_version is unsupported");
  }
  if (summary.valid !== sourceBound) {
    gaps.push(`validation_summary.valid must be ${sourceBound}`);
  }
  if (sourceBound && asArray(summary.gaps).length !== 0) {
    gaps.push("validation_summary.gaps must be empty for ready locks");
  }
  if (!sourceBound && stableStringify(summary.gaps) !== stableStringify(record.hold_reasons ?? [])) {
    gaps.push("validation_summary.gaps must match hold_reasons for held locks");
  }

  return [...new Set(gaps)];
}

function collectSourceFixtureBindingGaps(lock, options = {}) {
  if (!options.sourceFixture) return [];
  const expected = buildDataModelSpineReadinessLockFromObject(options.sourceFixture, {
    cwd: options.cwd ?? process.cwd(),
    generatedAt: asRecord(lock).generated_at
  });
  const record = asRecord(lock);
  const gaps = [];
  for (const field of [
    "lock_state",
    "source_bound",
    "source_readiness_ref",
    "prerequisites",
    "equation",
    "series_persistence_state",
    "allowed_next_step",
    "lock_scope",
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

export function validateDataModelSpineReadinessLock(lock, options = {}) {
  const record = asRecord(lock);
  const gaps = [
    ...collectLockShapeGaps(record),
    ...collectSourceFixtureBindingGaps(record, options)
  ];
  return validationSummary(
    gaps.length === 0 && record.lock_state === READY_STATE,
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
      "Usage: node scripts/run_ai_value_data_model_spine_readiness_lock.mjs <source-fixture-or-history-input-json>"
    );
    process.exit(1);
  }
  const lock = buildDataModelSpineReadinessLockFromObject(inputFromCliPath(inputPath), {
    cwd: process.cwd()
  });
  process.stdout.write(`${JSON.stringify(lock, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
