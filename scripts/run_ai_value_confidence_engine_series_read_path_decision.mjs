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
  CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_RUNTIME_SCHEMA_VERSION
} from "./run_ai_value_contribution_alignment_internal_bayesian_execution_runtime.mjs";

export const CONFIDENCE_ENGINE_SERIES_READ_PATH_DECISION_SCHEMA_VERSION =
  "FT_AI_VALUE_CONFIDENCE_ENGINE_SERIES_READ_PATH_DECISION_2026_07";

export const CONFIDENCE_OBSERVATION_REQUIREMENT_SCHEMA_VERSION =
  "FT_AI_VALUE_CONFIDENCE_OBSERVATION_REQUIREMENT_2026_07";

const VALIDATION_SCHEMA_VERSION =
  `${CONFIDENCE_ENGINE_SERIES_READ_PATH_DECISION_SCHEMA_VERSION}_VALIDATION`;

const DERIVATION_VERSION =
  "ai_value_confidence_engine_series_read_path_decision_2026_07";

export const CONFIDENCE_SERIES_AUTHORIZED_STATE =
  "SERIES_PERSISTENCE_AUTHORIZED_FOR_INTERNAL_CONFIDENCE_OBSERVATIONS";
export const CONFIDENCE_SERIES_HOLD_STATE =
  "HOLD_FOR_CONFIDENCE_OBSERVATION_REQUIREMENT";
const REJECTED_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";

const SOURCE_PROOF_READY_STATE = "COMPACT_CUSTOMER_HISTORY_READ_PATH_PROVEN";

export const INTERNAL_CONFIDENCE_CONSUMER_TOKEN = "internal_confidence_engine_only";

const AUTHORIZED_NEXT_STEP =
  "measurement_cell_series_persistence_promotion_gate_confidence_path_review";
const HELD_NEXT_STEP =
  "complete_confidence_observation_requirement_statement_and_customer_evidence_history_proof";

const REQUIRED_MILESTONE_DAYS = [0, 30, 60, 90, 180, 365];
const REQUIRED_SOURCE_PROOF_RESULT = {
  compact_snapshot_projection_state:
    "COMPACT_SNAPSHOT_ROWS_SATISFY_CUSTOMER_HISTORY_READ_PATH",
  customer_history_projection_state:
    "CUSTOMER_HISTORY_CONTINUITY_CAN_BE_SERVED_FROM_COMPACT_SNAPSHOTS",
  evidence_continuity_placement_state:
    "KEEP_EVIDENCE_CONTINUITY_INSIDE_MEASUREMENT_CELL_SERIES_CONTRACT_OUTPUT"
};

export const REQUIRED_CONFIDENCE_OBSERVATION_REQUIREMENT = {
  schema_version: CONFIDENCE_OBSERVATION_REQUIREMENT_SCHEMA_VERSION,
  consumer: INTERNAL_CONFIDENCE_CONSUMER_TOKEN,
  consumer_runtime_schema_version:
    CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_RUNTIME_SCHEMA_VERSION,
  required_milestone_days: REQUIRED_MILESTONE_DAYS,
  requires_append_only_observations: true,
  requires_admission_reason_codes: true,
  requires_gate_cleared_observations_only: true,
  requires_compact_refs_only: true,
  requires_org_scoped_storage: true,
  minimum_cohort_size: 10,
  compact_snapshot_rows_sufficient: false,
  compact_snapshot_gap_state: "COMPACT_ROWS_SUPERSEDE_AND_LACK_ADMISSION_METADATA"
};

export function buildDemoConfidenceObservationRequirement() {
  return JSON.parse(JSON.stringify(REQUIRED_CONFIDENCE_OBSERVATION_REQUIREMENT));
}

const SCOPED_FEED_FIELD = "research_model_feed";
const GATE_PATH_FEED_FIELD =
  "measurement_cell_series_persistence_promotion_gate_confidence_path";

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
  "customer_facing_economic_output",
  "customer_facing_financial_output",
  "live_bigquery_execution",
  "live_sigma_execution",
  "live_glean_query",
  "customer_connector_execution",
  "model_output",
  "probability_output",
  "score_like_output",
  "finance_output"
];

const FEED_FIELDS = [GATE_PATH_FEED_FIELD, SCOPED_FEED_FIELD, ...FALSE_FEEDS];

const DECISION_SCOPE_FIELDS = [
  "internal_review_only",
  "source_bound",
  "compact_refs_only",
  "status_posture_only",
  "internal_confidence_observation_store_authorized",
  "series_persistence_authorized_beyond_confidence_observations",
  "schema_authorized",
  "migration_authorized",
  "repository_write_authorized",
  "repository_read_authorized",
  "evidence_snapshot_extension_authorized",
  "route_authorized",
  "ui_authorized",
  "export_authorized",
  "rendered_readout_authorized",
  "customer_facing_output_authorized",
  "customer_facing_financial_output_authorized",
  "live_connector_authorized",
  "model_output_authorized",
  "finance_output_authorized"
];

const BOUNDARY_POLICY_FIELDS = [
  "creates_measurement_cell_series_snapshots",
  "writes_measurement_cell_series_snapshot",
  "creates_prisma_schema",
  "creates_migration",
  "creates_repository",
  "creates_backend_route",
  "creates_frontend_ui",
  "creates_export",
  "creates_rendered_readout",
  "extends_evidence_snapshots",
  "emits_customer_facing_output",
  "emits_customer_facing_financial_output",
  "emits_customer_facing_economic_output",
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

const PREREQUISITE_FIELDS = [
  "customer_evidence_history_proof_valid",
  "source_proof_bound",
  "complete_customer_history_milestones",
  "confidence_observation_requirement_valid",
  "consumer_runtime_bound",
  "compact_snapshot_rows_insufficient_for_confidence_observations",
  "live_wiring_boundary_held"
];

const SOURCE_PROOF_REF_FIELDS = [
  "proof_id",
  "proof_state",
  "proof_hash",
  "source_series_hash",
  "customer_history_hash",
  "lineage_hash",
  "required_milestone_days",
  "observed_milestone_days",
  "missing_milestone_days",
  "latest_clear_milestone_count",
  "stale_candidate_rows_ignored",
  "compact_snapshot_projection_state",
  "customer_history_projection_state",
  "evidence_continuity_placement_state"
];

const REQUIREMENT_REF_FIELDS = [
  "requirement_schema_version",
  "consumer",
  "consumer_runtime_schema_version",
  "required_milestone_days",
  "minimum_cohort_size",
  "compact_snapshot_rows_sufficient",
  "compact_snapshot_gap_state",
  "requirement_hash"
];

const TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "decision_id",
  "decision_state",
  "generated_at",
  "derivation_version",
  "source_bound",
  "source_proof_ref",
  "observation_requirement_ref",
  "prerequisites",
  "decision_scope",
  "allowed_next_step",
  "feeds",
  "boundary_policy",
  "required_caveats",
  "blocked_uses",
  "hold_reasons",
  "validation_summary",
  "decision_hash"
]);

const REQUIRED_BLOCKED_USES = [
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
  "research_model_feed_beyond_internal_confidence_engine",
  "contribution_model_execution",
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
  "Confidence-Engine Series Read-Path Decision is an internal decision record only; it does not create measurement_cell_series_snapshots, schemas, migrations, repositories, routes, UI, exports, rendered readouts, live connectors, customer-facing model output, finance output, or customer-facing economic output.",
  "Series persistence is authorized solely as append-only internal confidence-engine observation input at Day 0/30/60/90/180/365 milestones; physical implementation still requires the separate exact-scope implementation decision behind the Measurement Cell Series persistence promotion gate.",
  "The customer evidence history read path continues to be served from compact ai_value_customer_data_model_snapshots rows; this decision does not weaken or replace the durable Series read-path decision for that consumer.",
  "research_model_feed is narrowed to internal_confidence_engine_only; any other model consumer requires a new exact-scope decision."
];

const ALLOWED_INPUT_FIELDS = new Set([
  "customer_evidence_history_read_path_proof",
  "confidence_observation_requirement",
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
  /measurement_?cell_?series_?snapshots/i,
  /evidence_?snapshots?_?extension/i,
  /backend_?route/i,
  /frontend_?ui/i,
  /export_?creation/i,
  /rendered_?readout/i,
  /live_?(?:bigquery|sigma|glean|connector)/i,
  /confidence_?(?:score|band|interval|percent)/i,
  /model_?output/i,
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
  /\bbquxjob\b/i,
  /https?:\/\//i,
  /secret:\/\//i,
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /\btranscript\b/i,
  /(?:^|[._:-])(?:user|employee|person|row|span|trace)[._:-]?id(?:[._:-]|$)/i,
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

function keyIsKnownPosture(path, key) {
  const parent = path[path.length - 1];
  return (
    (parent === "feeds" && FEED_FIELDS.includes(key)) ||
    (parent === "boundary_policy" && BOUNDARY_POLICY_FIELDS.includes(key)) ||
    (parent === "decision_scope" && DECISION_SCOPE_FIELDS.includes(key)) ||
    parent === "proof_scope"
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
      !keyIsKnownPosture(path, key) &&
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

function inputProof(input) {
  const record = asRecord(input);
  if (record.schema_version === CUSTOMER_EVIDENCE_HISTORY_READ_PATH_PROOF_SCHEMA_VERSION) {
    return record;
  }
  return asRecord(record.customer_evidence_history_read_path_proof);
}

function inputRequirement(input) {
  const record = asRecord(input);
  if (record.schema_version === CUSTOMER_EVIDENCE_HISTORY_READ_PATH_PROOF_SCHEMA_VERSION) {
    return {};
  }
  return asRecord(record.confidence_observation_requirement);
}

function inputBoundaryGaps(input, generatedAtGaps) {
  const record = asRecord(input);
  if (record.schema_version === CUSTOMER_EVIDENCE_HISTORY_READ_PATH_PROOF_SCHEMA_VERSION) {
    return [
      ...generatedAtGaps,
      ...collectBoundaryLeakage(record)
    ];
  }
  const sidecar = Object.fromEntries(
    Object.entries(record).filter(([key]) => !ALLOWED_INPUT_FIELDS.has(key))
  );
  return [
    ...generatedAtGaps,
    ...collectBoundaryLeakage(sidecar),
    ...Object.keys(sidecar)
      .filter((key) => !FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key)))
      .map((key) => `${key} is not allowed`),
    ...collectBoundaryLeakage(
      inputProof(input),
      ["customer_evidence_history_read_path_proof"]
    ),
    ...collectBoundaryLeakage(
      inputRequirement(input),
      ["confidence_observation_requirement"]
    )
  ];
}

function sourceProofRef(proof) {
  const seriesRef = asRecord(proof.source_series_ref);
  const historyRef = asRecord(proof.customer_history_ref);
  const result = asRecord(proof.read_path_result);
  return {
    proof_id: proof.proof_id ?? null,
    proof_state: proof.proof_state ?? null,
    proof_hash: proof.proof_hash ?? null,
    source_series_hash: seriesRef.series_ref_hash ?? null,
    customer_history_hash: historyRef.history_group_hash ?? null,
    lineage_hash: historyRef.lineage_hash ?? null,
    required_milestone_days: Array.isArray(historyRef.required_milestone_days)
      ? [...historyRef.required_milestone_days]
      : [],
    observed_milestone_days: Array.isArray(historyRef.observed_milestone_days)
      ? [...historyRef.observed_milestone_days]
      : [],
    missing_milestone_days: Array.isArray(historyRef.missing_milestone_days)
      ? [...historyRef.missing_milestone_days]
      : [],
    latest_clear_milestone_count: Number(historyRef.latest_clear_milestone_count ?? 0),
    stale_candidate_rows_ignored: Number(historyRef.stale_candidate_rows_ignored ?? 0),
    compact_snapshot_projection_state: result.compact_snapshot_projection_state ?? null,
    customer_history_projection_state: result.customer_history_projection_state ?? null,
    evidence_continuity_placement_state: result.evidence_continuity_placement_state ?? null
  };
}

export function confidenceObservationRequirementHash(requirement) {
  return sha256Json(asRecord(requirement));
}

function observationRequirementRef(requirement) {
  const record = asRecord(requirement);
  return {
    requirement_schema_version: record.schema_version ?? null,
    consumer: record.consumer ?? null,
    consumer_runtime_schema_version: record.consumer_runtime_schema_version ?? null,
    required_milestone_days: Array.isArray(record.required_milestone_days)
      ? [...record.required_milestone_days]
      : [],
    minimum_cohort_size: Number.isFinite(Number(record.minimum_cohort_size))
      ? Number(record.minimum_cohort_size)
      : null,
    compact_snapshot_rows_sufficient:
      typeof record.compact_snapshot_rows_sufficient === "boolean"
        ? record.compact_snapshot_rows_sufficient
        : null,
    compact_snapshot_gap_state: record.compact_snapshot_gap_state ?? null,
    requirement_hash: confidenceObservationRequirementHash(record)
  };
}

function prerequisitesFor(proof, proofValidation, requirement) {
  const ref = sourceProofRef(proof);
  const proofValid =
    proofValidation.valid === true &&
    proof.proof_state === SOURCE_PROOF_READY_STATE &&
    proof.proof_hash === customerEvidenceHistoryReadPathProofHash(proof);
  const requirementValid =
    stableStringify(asRecord(requirement)) ===
    stableStringify(REQUIRED_CONFIDENCE_OBSERVATION_REQUIREMENT);
  const requirementRecord = asRecord(requirement);
  return {
    customer_evidence_history_proof_valid: proofValid,
    source_proof_bound: proofValid,
    complete_customer_history_milestones:
      proofValid &&
      stableStringify(ref.required_milestone_days) === stableStringify(REQUIRED_MILESTONE_DAYS) &&
      stableStringify(ref.observed_milestone_days) === stableStringify(REQUIRED_MILESTONE_DAYS) &&
      ref.missing_milestone_days.length === 0 &&
      ref.latest_clear_milestone_count === REQUIRED_MILESTONE_DAYS.length,
    confidence_observation_requirement_valid: requirementValid,
    consumer_runtime_bound:
      requirementValid &&
      requirementRecord.consumer === INTERNAL_CONFIDENCE_CONSUMER_TOKEN &&
      requirementRecord.consumer_runtime_schema_version ===
        CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_RUNTIME_SCHEMA_VERSION,
    compact_snapshot_rows_insufficient_for_confidence_observations:
      requirementValid &&
      requirementRecord.compact_snapshot_rows_sufficient === false &&
      requirementRecord.compact_snapshot_gap_state ===
        REQUIRED_CONFIDENCE_OBSERVATION_REQUIREMENT.compact_snapshot_gap_state,
    live_wiring_boundary_held: proofValid
  };
}

function holdReasonsFor(prerequisites, proofValidation) {
  const reasons = [];
  if (!prerequisites.customer_evidence_history_proof_valid) {
    reasons.push("customer_evidence_history_proof_not_valid");
  }
  if (!prerequisites.complete_customer_history_milestones) {
    reasons.push("complete_customer_history_milestones_not_proven");
  }
  if (!prerequisites.confidence_observation_requirement_valid) {
    reasons.push("confidence_observation_requirement_not_valid");
  }
  if (!prerequisites.consumer_runtime_bound) {
    reasons.push("consumer_runtime_not_bound");
  }
  if (!prerequisites.compact_snapshot_rows_insufficient_for_confidence_observations) {
    reasons.push("compact_snapshot_confidence_gap_not_stated");
  }
  if (!prerequisites.live_wiring_boundary_held) {
    reasons.push("live_wiring_boundary_not_held");
  }
  return [...new Set([...reasons, ...asArray(proofValidation.gaps)])];
}

function decisionFeeds(authorized) {
  return {
    [GATE_PATH_FEED_FIELD]: authorized,
    [SCOPED_FEED_FIELD]: authorized ? INTERNAL_CONFIDENCE_CONSUMER_TOKEN : false,
    ...falseMap(FALSE_FEEDS)
  };
}

function baseDecision(state, authorized, gaps, generatedAt) {
  return {
    schema_version: CONFIDENCE_ENGINE_SERIES_READ_PATH_DECISION_SCHEMA_VERSION,
    decision_id: `confidence_engine_series_read_path_decision:${state.toLowerCase()}`,
    decision_state: state,
    generated_at: generatedAt,
    derivation_version: DERIVATION_VERSION,
    source_bound: authorized,
    decision_scope: {
      internal_review_only: true,
      source_bound: authorized,
      compact_refs_only: true,
      status_posture_only: true,
      internal_confidence_observation_store_authorized: authorized,
      series_persistence_authorized_beyond_confidence_observations: false,
      schema_authorized: false,
      migration_authorized: false,
      repository_write_authorized: false,
      repository_read_authorized: false,
      evidence_snapshot_extension_authorized: false,
      route_authorized: false,
      ui_authorized: false,
      export_authorized: false,
      rendered_readout_authorized: false,
      customer_facing_output_authorized: false,
      customer_facing_financial_output_authorized: false,
      live_connector_authorized: false,
      model_output_authorized: false,
      finance_output_authorized: false
    },
    allowed_next_step: authorized ? AUTHORIZED_NEXT_STEP : HELD_NEXT_STEP,
    feeds: decisionFeeds(authorized),
    boundary_policy: falseMap(BOUNDARY_POLICY_FIELDS),
    required_caveats: REQUIRED_CAVEATS,
    blocked_uses: REQUIRED_BLOCKED_USES,
    hold_reasons: gaps,
    validation_summary: validationSummary(authorized, gaps)
  };
}

function rejectedDecision(gaps, generatedAt) {
  const decision = {
    ...baseDecision(REJECTED_STATE, false, gaps, generatedAt),
    source_proof_ref: null,
    observation_requirement_ref: null,
    prerequisites: Object.fromEntries(PREREQUISITE_FIELDS.map((field) => [field, false])),
    hold_reasons: ["boundary_leakage_rejected"]
  };
  decision.validation_summary = validationSummary(false, decision.hold_reasons);
  decision.decision_hash = confidenceEngineSeriesReadPathDecisionHash(decision);
  return decision;
}

export function confidenceEngineSeriesReadPathDecisionHash(decision) {
  const clone = JSON.parse(JSON.stringify(decision));
  delete clone.decision_hash;
  return sha256Json(clone);
}

export function buildConfidenceEngineSeriesReadPathDecisionFromObject(input, options = {}) {
  const generatedAtResult = safeGeneratedAt(input, options);
  const generatedAt = generatedAtResult.value;
  const wrapperGaps = inputBoundaryGaps(input, generatedAtResult.gaps);
  if (wrapperGaps.length > 0) {
    return rejectedDecision(wrapperGaps, generatedAt);
  }

  const proof = inputProof(input);
  const requirement = inputRequirement(input);
  const proofValidation = validateCustomerEvidenceHistoryReadPathProof(proof, {
    cwd: options.cwd ?? process.cwd()
  });
  const prerequisites = prerequisitesFor(proof, proofValidation, requirement);
  const reasons = holdReasonsFor(prerequisites, proofValidation);
  const authorized = PREREQUISITE_FIELDS.every((field) => prerequisites[field] === true);
  const state = authorized ? CONFIDENCE_SERIES_AUTHORIZED_STATE : CONFIDENCE_SERIES_HOLD_STATE;
  const decision = {
    ...baseDecision(state, authorized, authorized ? [] : reasons, generatedAt),
    source_proof_ref: sourceProofRef(proof),
    observation_requirement_ref: observationRequirementRef(requirement),
    prerequisites,
    hold_reasons: authorized ? [] : reasons
  };
  if (decision.source_proof_ref?.customer_history_hash) {
    decision.decision_id =
      `confidence_engine_series_read_path_decision:${decision.source_proof_ref.customer_history_hash}`;
  }
  decision.decision_hash = confidenceEngineSeriesReadPathDecisionHash(decision);
  return decision;
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

function collectDecisionShapeGaps(decision) {
  const gaps = [];
  const record = asRecord(decision);
  gaps.push(...collectAllowedFieldsGaps(record, TOP_LEVEL_FIELDS, "decision"));
  if (record.schema_version !== CONFIDENCE_ENGINE_SERIES_READ_PATH_DECISION_SCHEMA_VERSION) {
    gaps.push("schema_version is unsupported");
  }
  if (
    ![CONFIDENCE_SERIES_AUTHORIZED_STATE, CONFIDENCE_SERIES_HOLD_STATE, REJECTED_STATE].includes(
      record.decision_state
    )
  ) {
    gaps.push("decision_state is unsupported");
  }
  const authorized = record.decision_state === CONFIDENCE_SERIES_AUTHORIZED_STATE;
  if (record.source_bound !== authorized) {
    gaps.push(`source_bound must be ${authorized}`);
  }
  gaps.push(...collectRefShapeGaps(record.source_proof_ref, SOURCE_PROOF_REF_FIELDS, "source_proof_ref"));
  gaps.push(
    ...collectRefShapeGaps(
      record.observation_requirement_ref,
      REQUIREMENT_REF_FIELDS,
      "observation_requirement_ref"
    )
  );
  gaps.push(...collectRefShapeGaps(record.prerequisites, PREREQUISITE_FIELDS, "prerequisites"));
  gaps.push(...collectRefShapeGaps(record.decision_scope, DECISION_SCOPE_FIELDS, "decision_scope"));

  const ref = asRecord(record.source_proof_ref);
  for (const field of ["proof_hash", "source_series_hash", "customer_history_hash", "lineage_hash"]) {
    if (!SHA256_PATTERN.test(String(ref[field] ?? ""))) {
      gaps.push(`source_proof_ref.${field} must be a sha256 hash`);
    }
  }
  for (const field of ["proof_id", "proof_state"]) {
    if (ref[field] !== null && !isSafeRef(String(ref[field]))) {
      gaps.push(`source_proof_ref.${field} must be safe compact metadata`);
    }
  }

  const requirementRef = asRecord(record.observation_requirement_ref);
  if (!SHA256_PATTERN.test(String(requirementRef.requirement_hash ?? ""))) {
    gaps.push("observation_requirement_ref.requirement_hash must be a sha256 hash");
  }
  for (const field of ["requirement_schema_version", "consumer", "consumer_runtime_schema_version", "compact_snapshot_gap_state"]) {
    if (requirementRef[field] !== null && !isSafeRef(String(requirementRef[field]))) {
      gaps.push(`observation_requirement_ref.${field} must be safe compact metadata`);
    }
  }
  if (authorized) {
    if (record.decision_id !== `confidence_engine_series_read_path_decision:${ref.customer_history_hash}`) {
      gaps.push("decision_id must bind to source_proof_ref.customer_history_hash");
    }
    if (ref.proof_state !== SOURCE_PROOF_READY_STATE) {
      gaps.push(`source_proof_ref.proof_state must be ${SOURCE_PROOF_READY_STATE}`);
    }
    if (stableStringify(ref.required_milestone_days) !== stableStringify(REQUIRED_MILESTONE_DAYS)) {
      gaps.push("source_proof_ref.required_milestone_days must be [0,30,60,90,180,365]");
    }
    if (stableStringify(ref.observed_milestone_days) !== stableStringify(REQUIRED_MILESTONE_DAYS)) {
      gaps.push("source_proof_ref.observed_milestone_days must be [0,30,60,90,180,365]");
    }
    if (!Array.isArray(ref.missing_milestone_days) || ref.missing_milestone_days.length !== 0) {
      gaps.push("source_proof_ref.missing_milestone_days must be empty");
    }
    if (ref.latest_clear_milestone_count !== REQUIRED_MILESTONE_DAYS.length) {
      gaps.push("source_proof_ref.latest_clear_milestone_count must be 6");
    }
    for (const [field, expected] of Object.entries(REQUIRED_SOURCE_PROOF_RESULT)) {
      if (ref[field] !== expected) {
        gaps.push(`source_proof_ref.${field} must be ${expected}`);
      }
    }
    if (requirementRef.consumer !== INTERNAL_CONFIDENCE_CONSUMER_TOKEN) {
      gaps.push(`observation_requirement_ref.consumer must be ${INTERNAL_CONFIDENCE_CONSUMER_TOKEN}`);
    }
    if (
      requirementRef.consumer_runtime_schema_version !==
      CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_RUNTIME_SCHEMA_VERSION
    ) {
      gaps.push(
        "observation_requirement_ref.consumer_runtime_schema_version must match the internal Bayesian execution runtime schema version"
      );
    }
    if (
      stableStringify(requirementRef.required_milestone_days) !==
      stableStringify(REQUIRED_MILESTONE_DAYS)
    ) {
      gaps.push("observation_requirement_ref.required_milestone_days must be [0,30,60,90,180,365]");
    }
    if (requirementRef.minimum_cohort_size !== 10) {
      gaps.push("observation_requirement_ref.minimum_cohort_size must be 10");
    }
    if (requirementRef.compact_snapshot_rows_sufficient !== false) {
      gaps.push("observation_requirement_ref.compact_snapshot_rows_sufficient must be false");
    }
    if (
      requirementRef.compact_snapshot_gap_state !==
      REQUIRED_CONFIDENCE_OBSERVATION_REQUIREMENT.compact_snapshot_gap_state
    ) {
      gaps.push(
        `observation_requirement_ref.compact_snapshot_gap_state must be ${REQUIRED_CONFIDENCE_OBSERVATION_REQUIREMENT.compact_snapshot_gap_state}`
      );
    }
    if (
      requirementRef.requirement_hash !==
      confidenceObservationRequirementHash(REQUIRED_CONFIDENCE_OBSERVATION_REQUIREMENT)
    ) {
      gaps.push("observation_requirement_ref.requirement_hash must match the required confidence observation requirement");
    }
  }

  if (authorized && record.allowed_next_step !== AUTHORIZED_NEXT_STEP) {
    gaps.push(`allowed_next_step must be ${AUTHORIZED_NEXT_STEP}`);
  }
  if (!authorized && record.decision_state === CONFIDENCE_SERIES_HOLD_STATE && record.allowed_next_step !== HELD_NEXT_STEP) {
    gaps.push(`allowed_next_step must be ${HELD_NEXT_STEP}`);
  }

  if (authorized) {
    const prerequisites = asRecord(record.prerequisites);
    for (const field of PREREQUISITE_FIELDS) {
      if (prerequisites[field] !== true) {
        gaps.push(`prerequisites.${field} must be true for authorized decisions`);
      }
    }
  }

  const decisionScope = asRecord(record.decision_scope);
  for (const field of DECISION_SCOPE_FIELDS) {
    let expected = false;
    if (["internal_review_only", "compact_refs_only", "status_posture_only"].includes(field)) {
      expected = true;
    }
    if (["source_bound", "internal_confidence_observation_store_authorized"].includes(field)) {
      expected = authorized;
    }
    if (decisionScope[field] !== expected) {
      gaps.push(`decision_scope.${field} must be ${expected}`);
    }
  }

  const feeds = asRecord(record.feeds);
  gaps.push(...collectAllowedFieldsGaps(feeds, new Set(FEED_FIELDS), "feeds"));
  for (const field of FALSE_FEEDS) {
    if (feeds[field] !== false) {
      gaps.push(`feeds.${field} must be false`);
    }
  }
  const expectedScopedFeed = authorized ? INTERNAL_CONFIDENCE_CONSUMER_TOKEN : false;
  if (feeds[SCOPED_FEED_FIELD] !== expectedScopedFeed) {
    gaps.push(
      `feeds.${SCOPED_FEED_FIELD} must be ${authorized ? INTERNAL_CONFIDENCE_CONSUMER_TOKEN : false}`
    );
  }
  if (feeds[GATE_PATH_FEED_FIELD] !== authorized) {
    gaps.push(`feeds.${GATE_PATH_FEED_FIELD} must be ${authorized}`);
  }

  const boundaryPolicy = asRecord(record.boundary_policy);
  gaps.push(...collectAllowedFieldsGaps(boundaryPolicy, new Set(BOUNDARY_POLICY_FIELDS), "boundary_policy"));
  for (const field of BOUNDARY_POLICY_FIELDS) {
    if (boundaryPolicy[field] !== false) {
      gaps.push(`boundary_policy.${field} must be false`);
    }
  }

  if (stableStringify(record.required_caveats) !== stableStringify(REQUIRED_CAVEATS)) {
    gaps.push("required_caveats must match the required safe caveat set exactly");
  }
  if (stableStringify(record.blocked_uses) !== stableStringify(REQUIRED_BLOCKED_USES)) {
    gaps.push("blocked_uses must match the required safe blocked-use set exactly");
  }
  gaps.push(...collectBoundaryLeakage(record));

  const expectedHash = confidenceEngineSeriesReadPathDecisionHash(record);
  if (record.decision_hash !== expectedHash) {
    gaps.push("decision_hash must match decision body");
  }

  const summary = asRecord(record.validation_summary);
  if (summary.schema_version !== VALIDATION_SCHEMA_VERSION) {
    gaps.push("validation_summary.schema_version is unsupported");
  }
  if (summary.valid !== authorized) {
    gaps.push(`validation_summary.valid must be ${authorized}`);
  }
  if (authorized && asArray(summary.gaps).length !== 0) {
    gaps.push("validation_summary.gaps must be empty for authorized decisions");
  }
  if (!authorized && stableStringify(summary.gaps) !== stableStringify(record.hold_reasons ?? [])) {
    gaps.push("validation_summary.gaps must match hold_reasons for held decisions");
  }
  if (authorized && (!Array.isArray(record.hold_reasons) || record.hold_reasons.length !== 0)) {
    gaps.push("hold_reasons must be empty for authorized decisions");
  }

  return [...new Set(gaps)];
}

function collectSourceBindingGaps(decision, options = {}) {
  const record = asRecord(decision);
  const proof = asRecord(options.sourceCustomerEvidenceHistoryReadPathProof);
  const requirement = asRecord(options.sourceConfidenceObservationRequirement);
  if (Object.keys(proof).length === 0 && Object.keys(requirement).length === 0) return [];
  const gaps = [];
  if (Object.keys(proof).length === 0) {
    gaps.push("sourceCustomerEvidenceHistoryReadPathProof is required when binding");
    return gaps;
  }
  const proofValidation = validateCustomerEvidenceHistoryReadPathProof(proof, {
    cwd: options.cwd ?? process.cwd(),
    sourceInput: options.sourceInput
  });
  if (proofValidation.valid !== true) {
    gaps.push("sourceCustomerEvidenceHistoryReadPathProof must validate before binding");
  }
  const expectedRef = sourceProofRef(proof);
  const actualRef = asRecord(record.source_proof_ref);
  for (const field of SOURCE_PROOF_REF_FIELDS) {
    if (stableStringify(actualRef[field]) !== stableStringify(expectedRef[field])) {
      gaps.push(
        `sourceCustomerEvidenceHistoryReadPathProof binding mismatch for source_proof_ref.${field}`
      );
    }
  }
  const expectedRequirementRef = observationRequirementRef(requirement);
  const actualRequirementRef = asRecord(record.observation_requirement_ref);
  for (const field of REQUIREMENT_REF_FIELDS) {
    if (
      stableStringify(actualRequirementRef[field]) !==
      stableStringify(expectedRequirementRef[field])
    ) {
      gaps.push(
        `sourceConfidenceObservationRequirement binding mismatch for observation_requirement_ref.${field}`
      );
    }
  }
  const expectedDecision = buildConfidenceEngineSeriesReadPathDecisionFromObject(
    {
      customer_evidence_history_read_path_proof: proof,
      confidence_observation_requirement: requirement
    },
    { cwd: options.cwd ?? process.cwd() }
  );
  for (const field of [
    "decision_state",
    "decision_id",
    "source_bound",
    "prerequisites",
    "decision_scope",
    "allowed_next_step",
    "feeds",
    "boundary_policy",
    "required_caveats",
    "blocked_uses",
    "hold_reasons",
    "validation_summary"
  ]) {
    if (stableStringify(record[field]) !== stableStringify(expectedDecision[field])) {
      gaps.push(`source binding mismatch for ${field}`);
    }
  }
  return gaps;
}

export function validateConfidenceEngineSeriesReadPathDecision(decision, options = {}) {
  const record = asRecord(decision);
  const gaps = [
    ...collectDecisionShapeGaps(decision),
    ...collectSourceBindingGaps(decision, options)
  ];
  return validationSummary(
    gaps.length === 0 && record.decision_state === CONFIDENCE_SERIES_AUTHORIZED_STATE,
    [...new Set(gaps)]
  );
}

function main() {
  const [, , inputPath] = process.argv;
  if (!inputPath) {
    console.error(
      "Usage: node scripts/run_ai_value_confidence_engine_series_read_path_decision.mjs <proof-json-or-history-input-json-or-fixture-json>"
    );
    process.exit(1);
  }
  const parsed = JSON.parse(readFileSync(resolve(inputPath), "utf8"));
  const proof =
    parsed.schema_version === CUSTOMER_EVIDENCE_HISTORY_READ_PATH_PROOF_SCHEMA_VERSION
      ? parsed
      : buildCustomerEvidenceHistoryReadPathProofFromObject(
          Array.isArray(parsed.customer_data_model_snapshots)
            ? parsed
            : buildDemoCustomerEvidenceHistoryInputFromSourceFixture(parsed, {
                cwd: process.cwd()
              }),
          {
            cwd: process.cwd()
          }
        );
  const decision = buildConfidenceEngineSeriesReadPathDecisionFromObject(
    {
      customer_evidence_history_read_path_proof: proof,
      confidence_observation_requirement: buildDemoConfidenceObservationRequirement()
    },
    { cwd: process.cwd() }
  );
  process.stdout.write(`${JSON.stringify(decision, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
