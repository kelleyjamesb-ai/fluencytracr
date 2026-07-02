#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  runControlledRepeatedPilotEvidencePackageFromObject,
  validateControlledRepeatedPilotEvidencePackage
} from "./run_ai_value_controlled_pilot_evidence_package.mjs";
import {
  CONFIDENCE_ENGINE_SERIES_READ_PATH_DECISION_SCHEMA_VERSION,
  CONFIDENCE_SERIES_AUTHORIZED_STATE,
  confidenceEngineSeriesReadPathDecisionHash,
  validateConfidenceEngineSeriesReadPathDecision
} from "./run_ai_value_confidence_engine_series_read_path_decision.mjs";

export const MEASUREMENT_CELL_SERIES_PERSISTENCE_PROMOTION_GATE_SCHEMA_VERSION =
  "FT_AI_VALUE_MEASUREMENT_CELL_SERIES_PERSISTENCE_PROMOTION_GATE_2026_06";

const VALIDATION_SCHEMA_VERSION =
  `${MEASUREMENT_CELL_SERIES_PERSISTENCE_PROMOTION_GATE_SCHEMA_VERSION}_VALIDATION`;

const DERIVATION_VERSION =
  "ai_value_measurement_cell_series_persistence_promotion_gate_2026_06";

const READY_STATE =
  "READY_FOR_SEPARATE_MEASUREMENT_CELL_SERIES_SNAPSHOT_IMPLEMENTATION_DECISION";
const HOLD_READ_PATH_STATE = "HOLD_FOR_DURABLE_SERIES_READ_PATH_PROOF";
const HOLD_SERIES_STATE = "HOLD_FOR_VALID_MEASUREMENT_CELL_SERIES";
const REJECTED_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";

const READY_PILOT_DECISION = "PILOT_PASSED_PROMOTION_REVIEW_READY";
const READY_SERIES_BOUNDARY_DECISION =
  "HOLD_SERIES_PERSISTENCE_FOR_SEPARATE_PROMOTION_DECISION";
const REQUIRED_MILESTONE_DAYS = [0, 30, 60, 90, 180, 365];

const REQUIRED_READ_PATH_PROOF = {
  durable_read_path_state: "DURABLE_SERIES_READ_PATH_PROVEN",
  compact_snapshot_projection_state:
    "COMPACT_SNAPSHOT_ROWS_CANNOT_SATISFY_CONTINUITY_READ_PATH",
  customer_history_projection_state:
    "CUSTOMER_HISTORY_CONTINUITY_REQUIRES_SERIES_SNAPSHOT_READ_MODEL",
  series_contract_state: "MEASUREMENT_CELL_SERIES_CONTRACT_OUTPUT_VALIDATED",
  auth_tenant_enforcement_state: "ORG_SCOPED_SERIES_READ_GUARDS_REQUIRED",
  privacy_k_min_review_state: "AGGREGATE_PRIVACY_POSTURE_READY",
  evidence_continuity_placement_state:
    "KEEP_EVIDENCE_CONTINUITY_INSIDE_SERIES_SNAPSHOT_SCOPE",
  storage_boundary_state: "APPEND_ONLY_COMPACT_REFS_ONLY",
  live_wiring_state: "NO_LIVE_CONNECTOR_EXECUTION_REQUIRED"
};

const DEFAULT_READ_PATH_PROOF = {
  durable_read_path_state: "NOT_PROVEN",
  compact_snapshot_projection_state: "COMPACT_SNAPSHOT_ROWS_NOT_TESTED",
  customer_history_projection_state: "CUSTOMER_HISTORY_NOT_REQUIRED",
  series_contract_state: "SERIES_CONTRACT_NOT_VALIDATED",
  auth_tenant_enforcement_state: "NOT_PROMOTED",
  privacy_k_min_review_state: "NOT_PROMOTED",
  evidence_continuity_placement_state: "KEEP_EVIDENCE_CONTINUITY_INSIDE_SERIES_CONTRACT_OUTPUT",
  storage_boundary_state: "NOT_PROMOTED",
  live_wiring_state: "NO_LIVE_CONNECTOR_EXECUTION_REQUIRED"
};

const READ_PATH_LANE_CUSTOMER_HISTORY = "customer_history";
const READ_PATH_LANE_CONFIDENCE = "internal_confidence_observation";
const READ_PATH_LANES = [READ_PATH_LANE_CUSTOMER_HISTORY, READ_PATH_LANE_CONFIDENCE];

const CONFIDENCE_REQUIRED_READ_PATH_PROOF = {
  ...REQUIRED_READ_PATH_PROOF,
  durable_read_path_state: "CONFIDENCE_OBSERVATION_READ_PATH_PROVEN",
  compact_snapshot_projection_state:
    "COMPACT_SNAPSHOT_ROWS_CANNOT_SATISFY_CONFIDENCE_OBSERVATION_READ_PATH",
  customer_history_projection_state:
    "CUSTOMER_HISTORY_CONTINUITY_REMAINS_ON_COMPACT_SNAPSHOTS"
};

const CONFIDENCE_DECISION_REF_FIELDS = [
  "decision_id",
  "decision_state",
  "decision_schema_version",
  "decision_hash",
  "customer_history_hash",
  "requirement_hash"
];

function requiredReadPathProofForLane(lane) {
  return lane === READ_PATH_LANE_CONFIDENCE
    ? CONFIDENCE_REQUIRED_READ_PATH_PROOF
    : REQUIRED_READ_PATH_PROOF;
}

const TRUE_READY_FEEDS = [
  "measurement_cell_series_snapshot_implementation_decision"
];

const FALSE_FEEDS = [
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

const GATE_SCOPE_FIELDS = [
  "internal_review_only",
  "source_bound",
  "compact_refs_only",
  "separate_implementation_decision_required",
  "persistence_authorized",
  "schema_authorized",
  "migration_authorized",
  "repository_write_authorized",
  "evidence_snapshot_extension_authorized",
  "customer_read_authorized",
  "customer_write_authorized",
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
  "writes_measurement_cell_series_snapshot",
  "creates_prisma_schema",
  "creates_migration",
  "creates_repository",
  "extends_evidence_snapshots",
  "creates_backend_route",
  "creates_frontend_ui",
  "creates_export",
  "creates_rendered_readout",
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
  "repeated_milestone_evidence_valid",
  "complete_milestone_series",
  "durable_read_path_proven",
  "compact_snapshot_projection_gap_proven",
  "customer_history_projection_need_proven",
  "series_contract_validated",
  "auth_tenant_enforcement_ready",
  "privacy_k_min_review_ready",
  "evidence_continuity_placement_bound",
  "storage_boundary_compact",
  "live_wiring_boundary_held",
  "durable_read_path_decision_bound",
  "read_path_proof_refs_bound"
];

const READ_PATH_PROOF_FIELDS = Object.keys(REQUIRED_READ_PATH_PROOF);

const READ_PATH_PROOF_REF_FIELDS = [
  "ref_id",
  "state",
  "source_doc_ref",
  "proof_hash"
];

const SOURCE_SERIES_REF_FIELDS = [
  "schema_version",
  "pilot_id",
  "fixture_id",
  "pilot_decision",
  "package_integrity_hash",
  "series_boundary_decision",
  "complete_milestone_series",
  "required_milestone_days",
  "observed_milestone_days",
  "missing_milestone_days",
  "ready_windows",
  "held_windows",
  "suppressed_windows",
  "missing_windows",
  "blocked_windows",
  "alignment_state",
  "validation_valid",
  "compact_refs_hash"
];

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
  "Measurement Cell Series Persistence Promotion Gate is a gate only; it does not authorize measurement_cell_series_snapshots implementation.",
  "Ready state authorizes only a separate exact-scope implementation decision, not persistence writes in this runner.",
  "Evidence Continuity remains inside the Series scope; this gate does not extend evidence_snapshots.",
  "No customer-facing route, UI, export, rendered readout, live connector execution, model output, finance output, or customer-facing output is authorized."
];

const TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "gate_id",
  "gate_state",
  "generated_at",
  "derivation_version",
  "source_series_ref",
  "gate_scope",
  "customer_exposure",
  "prerequisites",
  "read_path_lane",
  "read_path_proof_refs",
  "internal_confidence_observation_decision_ref",
  "future_physical_model",
  "hold_reasons",
  "feeds",
  "boundary_policy",
  "required_caveats",
  "blocked_uses",
  "validation_summary",
  "gate_hash"
]);

const SOURCE_PACKAGE_TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "pilot_id",
  "fixture_id",
  "pilot_decision",
  "engine_executed",
  "evidence_flow",
  "alignment_summary",
  "validation_summary",
  "measurement_cell_promotion_record",
  "series_boundary",
  "feeds",
  "blocked_uses",
  "boundary_policy",
  "required_caveats",
  "generated_at",
  "derivation_version",
  "package_integrity_hash"
]);

const SAFE_REF_PATTERN = /^[A-Za-z0-9._:|-]+$/;
const SAFE_PROOF_DOC_REF_PATTERN =
  /^docs\.(?:architecture|contracts|research)\.[A-Za-z0-9._:|-]+$/;
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
  /measurement_?cell_?series_?snapshots/i,
  /evidence_?snapshots?_?extension/i,
  /full_?measurement_?cell_?series/i,
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

const FORBIDDEN_LIVE_HANDLE_PATTERNS = [
  /\bbigquery\b/i,
  /\bsigma\b/i,
  /\bglean\b/i,
  /\bbquxjob\b/i,
  /(?:^|[._:-])(?:project|dataset|table|dashboard|job|query)[._:-]?(?:id|url|ref|handle)(?:[._:-]|$)/i,
  /(?:^|[._:-])(?:project|dataset|table)[._:-][A-Za-z0-9_-]+[._:-][A-Za-z0-9_-]+(?:[._:-]|$)/i
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

function isSafeProofDocRef(value) {
  return (
    isSafeRef(value) &&
    SAFE_PROOF_DOC_REF_PATTERN.test(value) &&
    !FORBIDDEN_LIVE_HANDLE_PATTERNS.some((pattern) => pattern.test(value))
  );
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
    (path[0] === "gate_scope" && GATE_SCOPE_FIELDS.includes(key))
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

function proofRefHash(proof) {
  return sha256Json({
    ref_id: proof.ref_id,
    state: proof.state,
    source_doc_ref: proof.source_doc_ref
  });
}

function readPathProofValues(options) {
  return {
    ...DEFAULT_READ_PATH_PROOF,
    ...asRecord(options.readPathProof)
  };
}

function readPathProofRefs(options = {}) {
  const refs = asRecord(options.readPathProofRefs);
  return Object.fromEntries(
    READ_PATH_PROOF_FIELDS.map((field) => {
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

function collectReadPathProofGaps(values, refs, requiredProof = REQUIRED_READ_PATH_PROOF) {
  const gaps = [];
  for (const field of READ_PATH_PROOF_FIELDS) {
    const proof = asRecord(refs[field]);
    if (values[field] !== requiredProof[field]) {
      continue;
    }
    if (Object.keys(proof).length === 0) {
      gaps.push(`read_path_proof_refs.${field} is required`);
      continue;
    }
    for (const proofField of READ_PATH_PROOF_REF_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(proof, proofField)) {
        gaps.push(`read_path_proof_refs.${field}.${proofField} is required`);
      }
    }
    if (!isSafeRef(proof.ref_id)) {
      gaps.push(`read_path_proof_refs.${field}.ref_id must be safe compact metadata`);
    }
    if (!isSafeProofDocRef(proof.source_doc_ref)) {
      gaps.push(`read_path_proof_refs.${field}.source_doc_ref must be safe compact metadata`);
    }
    if (proof.state !== values[field]) {
      gaps.push(`read_path_proof_refs.${field}.state must match read-path proof state`);
    }
    if (!SHA256_PATTERN.test(String(proof.proof_hash ?? ""))) {
      gaps.push(`read_path_proof_refs.${field}.proof_hash must be a sha256 hash`);
    } else if (proof.proof_hash !== proofRefHash(proof)) {
      gaps.push(`read_path_proof_refs.${field}.proof_hash must match compact proof ref`);
    }
  }
  return gaps;
}

function sourcePackageFromInput(input) {
  const record = asRecord(input);
  if (record.schema_version === "FT_AI_VALUE_CONTROLLED_PILOT_EVIDENCE_PACKAGE_2026_06") {
    return record;
  }
  if (record.controlled_repeated_pilot_evidence_package) {
    return asRecord(record.controlled_repeated_pilot_evidence_package);
  }
  return record;
}

function sourceSeriesRef(packageRecord) {
  const seriesBoundary = asRecord(packageRecord.series_boundary);
  return {
    schema_version: packageRecord.schema_version,
    pilot_id: packageRecord.pilot_id,
    fixture_id: packageRecord.fixture_id,
    pilot_decision: packageRecord.pilot_decision,
    package_integrity_hash: packageRecord.package_integrity_hash,
    series_boundary_decision: seriesBoundary.decision,
    complete_milestone_series: seriesBoundary.complete_milestone_series === true,
    required_milestone_days: Array.isArray(seriesBoundary.required_milestones)
      ? [...seriesBoundary.required_milestones]
      : [],
    observed_milestone_days: Array.isArray(seriesBoundary.observed_milestones)
      ? [...seriesBoundary.observed_milestones]
      : [],
    missing_milestone_days: Array.isArray(seriesBoundary.missing_milestones)
      ? [...seriesBoundary.missing_milestones]
      : [],
    ready_windows: Number(seriesBoundary.ready_windows ?? 0),
    held_windows: Number(seriesBoundary.held_windows ?? 0),
    suppressed_windows: Number(seriesBoundary.suppressed_windows ?? 0),
    missing_windows: Number(seriesBoundary.missing_windows ?? 0),
    blocked_windows: Number(seriesBoundary.blocked_windows ?? 0),
    alignment_state: seriesBoundary.alignment_state ?? null,
    validation_valid: seriesBoundary.validation_valid === true,
    compact_refs_hash: sha256Json(seriesBoundary.compact_refs ?? [])
  };
}

function sourceRefGaps(ref) {
  const gaps = [];
  for (const field of SOURCE_SERIES_REF_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(ref, field)) {
      gaps.push(`source_series_ref.${field} is required`);
      continue;
    }
    if (
      typeof ref[field] === "string" &&
      !isSafeRef(ref[field]) &&
      !SHA256_PATTERN.test(ref[field])
    ) {
      gaps.push(`source_series_ref.${field} must be safe compact metadata`);
    }
  }
  for (const field of [
    "required_milestone_days",
    "observed_milestone_days",
    "missing_milestone_days"
  ]) {
    if (!Array.isArray(ref[field])) {
      gaps.push(`source_series_ref.${field} must be an array`);
    } else if (!ref[field].every((day) => Number.isInteger(Number(day)))) {
      gaps.push(`source_series_ref.${field} must contain integer milestone days`);
    }
  }
  if (!SHA256_PATTERN.test(String(ref.package_integrity_hash ?? ""))) {
    gaps.push("source_series_ref.package_integrity_hash must be a sha256 hash");
  }
  if (!SHA256_PATTERN.test(String(ref.compact_refs_hash ?? ""))) {
    gaps.push("source_series_ref.compact_refs_hash must be a sha256 hash");
  }
  return gaps;
}

function packageHasCompleteSeries(packageRecord, packageValidation) {
  const ref = sourceSeriesRef(packageRecord);
  return (
    packageValidation.valid === true &&
    ref.pilot_decision === READY_PILOT_DECISION &&
    ref.series_boundary_decision === READY_SERIES_BOUNDARY_DECISION &&
    ref.complete_milestone_series === true &&
    ref.validation_valid === true &&
    ref.ready_windows === REQUIRED_MILESTONE_DAYS.length &&
    ref.held_windows === 0 &&
    ref.suppressed_windows === 0 &&
    ref.missing_windows === 0 &&
    ref.blocked_windows === 0 &&
    stableStringify(ref.required_milestone_days) === stableStringify(REQUIRED_MILESTONE_DAYS) &&
    stableStringify(ref.observed_milestone_days) === stableStringify(REQUIRED_MILESTONE_DAYS) &&
    Array.isArray(ref.missing_milestone_days) &&
    ref.missing_milestone_days.length === 0
  );
}

function prerequisiteBooleans(
  values,
  sourceValid,
  proofRefsBound = false,
  durableReadPathDecisionBound = false,
  requiredProof = REQUIRED_READ_PATH_PROOF
) {
  return {
    repeated_milestone_evidence_valid: sourceValid,
    complete_milestone_series: sourceValid,
    durable_read_path_proven:
      values.durable_read_path_state === requiredProof.durable_read_path_state,
    compact_snapshot_projection_gap_proven:
      values.compact_snapshot_projection_state ===
      requiredProof.compact_snapshot_projection_state,
    customer_history_projection_need_proven:
      values.customer_history_projection_state ===
      requiredProof.customer_history_projection_state,
    series_contract_validated:
      values.series_contract_state === requiredProof.series_contract_state,
    auth_tenant_enforcement_ready:
      values.auth_tenant_enforcement_state ===
      requiredProof.auth_tenant_enforcement_state,
    privacy_k_min_review_ready:
      values.privacy_k_min_review_state === requiredProof.privacy_k_min_review_state,
    evidence_continuity_placement_bound:
      values.evidence_continuity_placement_state ===
      requiredProof.evidence_continuity_placement_state,
    storage_boundary_compact:
      values.storage_boundary_state === requiredProof.storage_boundary_state,
    live_wiring_boundary_held:
      values.live_wiring_state === requiredProof.live_wiring_state,
    durable_read_path_decision_bound: durableReadPathDecisionBound,
    read_path_proof_refs_bound: proofRefsBound
  };
}

function confidenceObservationDecisionRef(decision) {
  const record = asRecord(decision);
  return {
    decision_id: record.decision_id ?? null,
    decision_state: record.decision_state ?? null,
    decision_schema_version: record.schema_version ?? null,
    decision_hash: record.decision_hash ?? null,
    customer_history_hash: asRecord(record.source_proof_ref).customer_history_hash ?? null,
    requirement_hash: asRecord(record.observation_requirement_ref).requirement_hash ?? null
  };
}

function confidenceBindingBound(options = {}) {
  const binding = asRecord(options.confidenceSeriesReadPathBinding);
  const decision = asRecord(binding.decision);
  if (Object.keys(decision).length === 0) return false;
  const validation = validateConfidenceEngineSeriesReadPathDecision(decision, {
    cwd: options.cwd ?? process.cwd(),
    sourceCustomerEvidenceHistoryReadPathProof:
      binding.sourceCustomerEvidenceHistoryReadPathProof,
    sourceConfidenceObservationRequirement:
      binding.sourceConfidenceObservationRequirement
  });
  return (
    validation.valid === true &&
    decision.decision_state === CONFIDENCE_SERIES_AUTHORIZED_STATE
  );
}

function holdReasons(prerequisites, sourceValid) {
  const reasons = [];
  if (!sourceValid) reasons.push("repeated_milestone_evidence_invalid_or_incomplete");
  if (!prerequisites.durable_read_path_proven) {
    reasons.push("durable_series_read_path_not_proven");
  }
  if (!prerequisites.compact_snapshot_projection_gap_proven) {
    reasons.push("compact_snapshot_projection_gap_not_proven");
  }
  if (!prerequisites.customer_history_projection_need_proven) {
    reasons.push("customer_history_projection_need_not_proven");
  }
  if (!prerequisites.series_contract_validated) {
    reasons.push("series_contract_not_validated");
  }
  if (!prerequisites.auth_tenant_enforcement_ready) {
    reasons.push("auth_tenant_enforcement_not_ready");
  }
  if (!prerequisites.privacy_k_min_review_ready) {
    reasons.push("privacy_k_min_review_not_ready");
  }
  if (!prerequisites.evidence_continuity_placement_bound) {
    reasons.push("evidence_continuity_placement_not_bound");
  }
  if (!prerequisites.storage_boundary_compact) {
    reasons.push("storage_boundary_not_compact");
  }
  if (!prerequisites.live_wiring_boundary_held) {
    reasons.push("live_wiring_boundary_not_held");
  }
  if (!prerequisites.durable_read_path_decision_bound) {
    reasons.push("durable_read_path_decision_not_bound");
  }
  if (!prerequisites.read_path_proof_refs_bound) {
    reasons.push("read_path_proof_refs_not_bound");
  }
  return reasons;
}

function baseGate(state, valid, gaps, generatedAt) {
  const ready = state === READY_STATE && valid;
  return {
    schema_version: MEASUREMENT_CELL_SERIES_PERSISTENCE_PROMOTION_GATE_SCHEMA_VERSION,
    gate_id: `measurement_cell_series_persistence_promotion_gate:${state.toLowerCase()}`,
    gate_state: state,
    generated_at: generatedAt,
    derivation_version: DERIVATION_VERSION,
    gate_scope: {
      internal_review_only: true,
      source_bound: ready,
      compact_refs_only: true,
      separate_implementation_decision_required: true,
      persistence_authorized: false,
      schema_authorized: false,
      migration_authorized: false,
      repository_write_authorized: false,
      evidence_snapshot_extension_authorized: false,
      customer_read_authorized: false,
      customer_write_authorized: false,
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
      status_posture_only: true,
      value_proof_allowed: false,
      customer_facing_output_allowed: false,
      customer_facing_financial_output_allowed: false,
      route_creation_allowed: false,
      frontend_ui_creation_allowed: false,
      export_allowed: false
    },
    feeds: {
      measurement_cell_series_snapshot_implementation_decision: ready,
      ...falseMap(FALSE_FEEDS)
    },
    boundary_policy: falseMap(BOUNDARY_POLICY_FIELDS),
    required_caveats: REQUIRED_CAVEATS,
    blocked_uses: REQUIRED_BLOCKED_USES,
    validation_summary: validationSummary(valid, gaps)
  };
}

function futurePhysicalModel() {
  return {
    candidate_model_id: "measurement_cell_series_snapshots_candidate",
    candidate_model_state: "promotion_gate_only",
    candidate_grain: "org_measurement_cell_series_milestone_window",
    allowed_audience: "internal_product_data_model_review",
    required_next_step:
      "separate_exact_scope_measurement_cell_series_snapshot_implementation_decision",
    current_authority: "gate_only_no_implementation",
    future_table_scope:
      "candidate_append_only_compact_series_snapshot_refs_only_after_later_decision",
    blocked_sections: [
      "raw_payloads",
      "full_measurement_cell_series",
      "full_measurement_cells",
      "evidence_snapshots_extension",
      "rendered_readout",
      "financial_output",
      "model_output",
      "customer_facing_output"
    ]
  };
}

function rejectedGate(gaps, generatedAt) {
  const gate = {
    ...baseGate(REJECTED_STATE, false, gaps, generatedAt),
    source_series_ref: null,
    prerequisites: prerequisiteBooleans(DEFAULT_READ_PATH_PROOF, false, false),
    read_path_lane: READ_PATH_LANE_CUSTOMER_HISTORY,
    read_path_proof_refs: readPathProofRefs(),
    internal_confidence_observation_decision_ref: null,
    future_physical_model: futurePhysicalModel(),
    hold_reasons: ["boundary_leakage_rejected"]
  };
  gate.gate_hash = measurementCellSeriesPersistencePromotionGateHash(gate);
  return gate;
}

export function measurementCellSeriesPersistencePromotionGateHash(gate) {
  const clone = JSON.parse(JSON.stringify(gate));
  delete clone.gate_hash;
  return sha256Json(clone);
}

export function buildMeasurementCellSeriesPersistencePromotionGateFromObject(
  input,
  options = {}
) {
  const generatedAt = safeGeneratedAt(input, options);
  const inputRecord = asRecord(input);
  const hasPackageWrapper = Object.prototype.hasOwnProperty.call(
    inputRecord,
    "controlled_repeated_pilot_evidence_package"
  );
  if (hasPackageWrapper) {
    const sidecarFields = Object.keys(inputRecord).filter(
      (key) => key !== "controlled_repeated_pilot_evidence_package"
    );
    if (sidecarFields.length > 0) {
      return rejectedGate(["controlled repeated package wrapper cannot include sidecar fields"], generatedAt);
    }
  }
  if (inputRecord.schema_version === "FT_AI_VALUE_CONTROLLED_PILOT_EVIDENCE_PACKAGE_2026_06") {
    const sidecarRecord = Object.fromEntries(
      Object.entries(inputRecord).filter(([key]) => !SOURCE_PACKAGE_TOP_LEVEL_FIELDS.has(key))
    );
    const sidecarGaps = collectBoundaryLeakage(sidecarRecord);
    if (sidecarGaps.length > 0) {
      return rejectedGate(sidecarGaps, generatedAt);
    }
  }

  const packageRecord = sourcePackageFromInput(input);
  const packageValidation = validateControlledRepeatedPilotEvidencePackage(packageRecord, {
    cwd: options.cwd ?? process.cwd()
  });
  const sourceValid = packageHasCompleteSeries(packageRecord, packageValidation);
  const confidenceBound = confidenceBindingBound(options);
  const readPathLane = confidenceBound
    ? READ_PATH_LANE_CONFIDENCE
    : READ_PATH_LANE_CUSTOMER_HISTORY;
  const requiredProof = requiredReadPathProofForLane(readPathLane);
  const values = readPathProofValues(options);
  const proofRefs = readPathProofRefs(options);
  const proofGaps = collectReadPathProofGaps(values, proofRefs, requiredProof);
  const readyValues = Object.entries(requiredProof).every(
    ([field, value]) => values[field] === value
  );
  const prerequisites = prerequisiteBooleans(
    values,
    sourceValid,
    readyValues && proofGaps.length === 0,
    confidenceBound,
    requiredProof
  );
  const reasons = [
    ...holdReasons(prerequisites, sourceValid),
    ...proofGaps
  ];
  const state = !sourceValid
    ? HOLD_SERIES_STATE
    : reasons.length === 0
      ? READY_STATE
      : HOLD_READ_PATH_STATE;
  const valid = state === READY_STATE;
  const gate = {
    ...baseGate(state, valid, valid ? [] : reasons, generatedAt),
    source_series_ref:
      packageRecord?.schema_version === "FT_AI_VALUE_CONTROLLED_PILOT_EVIDENCE_PACKAGE_2026_06"
        ? sourceSeriesRef(packageRecord)
        : null,
    prerequisites,
    read_path_lane: readPathLane,
    read_path_proof_refs: proofRefs,
    internal_confidence_observation_decision_ref: confidenceBound
      ? confidenceObservationDecisionRef(
          asRecord(asRecord(options.confidenceSeriesReadPathBinding).decision)
        )
      : null,
    future_physical_model: futurePhysicalModel(),
    hold_reasons: reasons
  };
  if (gate.source_series_ref) {
    gate.gate_id =
      `measurement_cell_series_persistence_promotion_gate:${gate.source_series_ref.fixture_id}:${gate.source_series_ref.pilot_id}`;
  }
  gate.gate_hash = measurementCellSeriesPersistencePromotionGateHash(gate);
  return gate;
}

function collectSourcePackageBindingGaps(gate, options = {}) {
  const record = asRecord(gate);
  const gaps = [];
  if (record.gate_state !== READY_STATE) return gaps;
  if (!options.sourceRepeatedPilotEvidencePackage) {
    gaps.push("sourceRepeatedPilotEvidencePackage is required to validate ready Series persistence promotion gates");
    return gaps;
  }
  const sourcePackage = sourcePackageFromInput(options.sourceRepeatedPilotEvidencePackage);
  const packageValidation = validateControlledRepeatedPilotEvidencePackage(sourcePackage, {
    cwd: options.cwd ?? process.cwd(),
    sourceFixture: options.sourceFixture
  });
  if (!packageHasCompleteSeries(sourcePackage, packageValidation)) {
    gaps.push("sourceRepeatedPilotEvidencePackage must be a valid complete repeated pilot evidence package");
    return gaps;
  }
  const expectedRef = sourceSeriesRef(sourcePackage);
  const actualRef = asRecord(record.source_series_ref);
  for (const field of SOURCE_SERIES_REF_FIELDS) {
    if (stableStringify(actualRef[field]) !== stableStringify(expectedRef[field])) {
      gaps.push(`source_series_ref.${field} does not match source repeated pilot evidence package`);
    }
  }
  const expectedGateId =
    `measurement_cell_series_persistence_promotion_gate:${expectedRef.fixture_id}:${expectedRef.pilot_id}`;
  if (record.gate_id !== expectedGateId) {
    gaps.push("gate_id does not match source repeated pilot evidence package binding");
  }
  return gaps;
}

function collectDurableReadPathDecisionBindingGaps(gate, options = {}) {
  const record = asRecord(gate);
  if (record.gate_state !== READY_STATE) return [];
  if (record.read_path_lane === READ_PATH_LANE_CONFIDENCE) {
    const binding = asRecord(options.confidenceSeriesReadPathBinding);
    const decision = asRecord(binding.decision);
    if (Object.keys(decision).length === 0) {
      return [
        "confidenceSeriesReadPathBinding.decision is required to validate ready confidence-lane Series persistence promotion gates"
      ];
    }
    const gaps = [];
    const validation = validateConfidenceEngineSeriesReadPathDecision(decision, {
      cwd: options.cwd ?? process.cwd(),
      sourceCustomerEvidenceHistoryReadPathProof:
        binding.sourceCustomerEvidenceHistoryReadPathProof,
      sourceConfidenceObservationRequirement:
        binding.sourceConfidenceObservationRequirement
    });
    if (validation.valid !== true) {
      gaps.push(
        "confidenceSeriesReadPathBinding.decision must validate as an authorized confidence-engine series read-path decision"
      );
    }
    if (decision.decision_hash !== confidenceEngineSeriesReadPathDecisionHash(decision)) {
      gaps.push("confidenceSeriesReadPathBinding.decision hash must match decision body");
    }
    const expectedRef = confidenceObservationDecisionRef(decision);
    const actualRef = asRecord(record.internal_confidence_observation_decision_ref);
    for (const field of CONFIDENCE_DECISION_REF_FIELDS) {
      if (stableStringify(actualRef[field]) !== stableStringify(expectedRef[field])) {
        gaps.push(
          `internal_confidence_observation_decision_ref.${field} does not match bound confidence decision`
        );
      }
    }
    return gaps;
  }
  if (!options.sourceDurableReadPathDecision) {
    return [
      "sourceDurableReadPathDecision is required to validate ready Series persistence promotion gates"
    ];
  }
  return [
    "sourceDurableReadPathDecision validation is not implemented in this gate slice"
  ];
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
  if (record.schema_version !== MEASUREMENT_CELL_SERIES_PERSISTENCE_PROMOTION_GATE_SCHEMA_VERSION) {
    gaps.push("schema_version is unsupported");
  }
  if (![READY_STATE, HOLD_READ_PATH_STATE, HOLD_SERIES_STATE, REJECTED_STATE].includes(record.gate_state)) {
    gaps.push("gate_state is unsupported");
  }
  for (const [label, fields] of [
    ["gate_scope", GATE_SCOPE_FIELDS],
    ["customer_exposure", CUSTOMER_EXPOSURE_FIELDS],
    ["future_physical_model", FUTURE_PHYSICAL_MODEL_FIELDS],
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
  if (!READ_PATH_LANES.includes(record.read_path_lane)) {
    gaps.push("read_path_lane is unsupported");
  }
  const proofRefs = asRecord(record.read_path_proof_refs);
  gaps.push(
    ...collectAllowedFieldsGaps(
      proofRefs,
      new Set(READ_PATH_PROOF_FIELDS),
      "read_path_proof_refs"
    )
  );
  if (record.gate_state === READY_STATE) {
    const proofValuesForValidation = Object.fromEntries(
      READ_PATH_PROOF_FIELDS.map((field) => [
        field,
        asRecord(proofRefs[field]).state
      ])
    );
    gaps.push(
      ...collectReadPathProofGaps(
        proofValuesForValidation,
        proofRefs,
        requiredReadPathProofForLane(record.read_path_lane)
      )
    );
  }
  if (record.gate_state === READY_STATE) {
    if (record.read_path_lane !== READ_PATH_LANE_CONFIDENCE) {
      gaps.push("ready gates require the internal confidence observation read-path lane");
    } else {
      const confidenceRef = asRecord(record.internal_confidence_observation_decision_ref);
      for (const field of CONFIDENCE_DECISION_REF_FIELDS) {
        if (!Object.prototype.hasOwnProperty.call(confidenceRef, field)) {
          gaps.push(`internal_confidence_observation_decision_ref.${field} is required`);
        }
      }
      gaps.push(
        ...collectAllowedFieldsGaps(
          confidenceRef,
          new Set(CONFIDENCE_DECISION_REF_FIELDS),
          "internal_confidence_observation_decision_ref"
        )
      );
      if (confidenceRef.decision_state !== CONFIDENCE_SERIES_AUTHORIZED_STATE) {
        gaps.push(
          `internal_confidence_observation_decision_ref.decision_state must be ${CONFIDENCE_SERIES_AUTHORIZED_STATE}`
        );
      }
      if (
        confidenceRef.decision_schema_version !==
        CONFIDENCE_ENGINE_SERIES_READ_PATH_DECISION_SCHEMA_VERSION
      ) {
        gaps.push(
          "internal_confidence_observation_decision_ref.decision_schema_version is unsupported"
        );
      }
      for (const field of ["decision_hash", "customer_history_hash", "requirement_hash"]) {
        if (!SHA256_PATTERN.test(String(confidenceRef[field] ?? ""))) {
          gaps.push(
            `internal_confidence_observation_decision_ref.${field} must be a sha256 hash`
          );
        }
      }
      if (!isSafeRef(String(confidenceRef.decision_id ?? ""))) {
        gaps.push(
          "internal_confidence_observation_decision_ref.decision_id must be safe compact metadata"
        );
      }
    }
  } else if (
    record.internal_confidence_observation_decision_ref !== null &&
    record.internal_confidence_observation_decision_ref !== undefined &&
    record.read_path_lane !== READ_PATH_LANE_CONFIDENCE
  ) {
    gaps.push(
      "internal_confidence_observation_decision_ref requires the internal confidence observation read-path lane"
    );
  }
  if ([READY_STATE, HOLD_READ_PATH_STATE].includes(record.gate_state)) {
    const ref = asRecord(record.source_series_ref);
    for (const field of SOURCE_SERIES_REF_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(ref, field)) {
        gaps.push(`source_series_ref.${field} is required`);
      }
    }
    gaps.push(...collectAllowedFieldsGaps(ref, new Set(SOURCE_SERIES_REF_FIELDS), "source_series_ref"));
    gaps.push(...sourceRefGaps(ref));
  }
  for (const field of GATE_SCOPE_FIELDS) {
    let expected = false;
    if (
      [
        "internal_review_only",
        "compact_refs_only",
        "separate_implementation_decision_required"
      ].includes(field)
    ) {
      expected = true;
    }
    if (field === "source_bound") {
      expected = record.gate_state === READY_STATE;
    }
    if (asRecord(record.gate_scope)[field] !== expected) {
      gaps.push(`gate_scope.${field} must be ${expected}`);
    }
  }
  for (const field of CUSTOMER_EXPOSURE_FIELDS) {
    const expected = field === "status_posture_only"
      ? true
      : field === "exposure_state"
        ? "not_authorized_by_gate"
        : false;
    if (asRecord(record.customer_exposure)[field] !== expected) {
      gaps.push(`customer_exposure.${field} must be ${expected}`);
    }
  }
  const feeds = asRecord(record.feeds);
  const allowedFeeds = new Set([...TRUE_READY_FEEDS, ...FALSE_FEEDS]);
  gaps.push(...collectAllowedFieldsGaps(feeds, allowedFeeds, "feeds"));
  for (const field of TRUE_READY_FEEDS) {
    const expected = record.gate_state === READY_STATE;
    if (feeds[field] !== expected) {
      gaps.push(`feeds.${field} must be ${expected}`);
    }
  }
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
    if (!Array.isArray(record.required_caveats) || !record.required_caveats.includes(caveat)) {
      gaps.push(`required_caveats must include ${caveat}`);
    }
  }
  if (!Array.isArray(record.required_caveats)) {
    gaps.push("required_caveats must be an array");
  } else if (stableStringify(record.required_caveats) !== stableStringify(REQUIRED_CAVEATS)) {
    gaps.push("required_caveats must match the required safe caveat set exactly");
  }
  for (const blockedUse of REQUIRED_BLOCKED_USES) {
    if (!Array.isArray(record.blocked_uses) || !record.blocked_uses.includes(blockedUse)) {
      gaps.push(`blocked_uses must include ${blockedUse}`);
    }
  }
  if (!Array.isArray(record.blocked_uses)) {
    gaps.push("blocked_uses must be an array");
  } else if (stableStringify(record.blocked_uses) !== stableStringify(REQUIRED_BLOCKED_USES)) {
    gaps.push("blocked_uses must match the required safe blocked-use set exactly");
  }
  const summary = asRecord(record.validation_summary);
  if (summary.schema_version !== VALIDATION_SCHEMA_VERSION) {
    gaps.push("validation_summary.schema_version is unsupported");
  }
  if (!Array.isArray(summary.gaps)) {
    gaps.push("validation_summary.gaps must be an array");
  }
  if (record.gate_state === READY_STATE) {
    if (summary.valid !== true) {
      gaps.push("validation_summary.valid must be true for ready gates");
    }
    if (Array.isArray(summary.gaps) && summary.gaps.length !== 0) {
      gaps.push("validation_summary.gaps must be empty for ready gates");
    }
    if (!Array.isArray(record.hold_reasons) || record.hold_reasons.length !== 0) {
      gaps.push("hold_reasons must be empty for ready gates");
    }
  } else {
    if (summary.valid !== false) {
      gaps.push("validation_summary.valid must be false for non-ready gates");
    }
    if (!Array.isArray(record.hold_reasons) || record.hold_reasons.length === 0) {
      gaps.push("hold_reasons must be present for non-ready gates");
    }
  }
  if (!SHA256_PATTERN.test(String(record.gate_hash ?? ""))) {
    gaps.push("gate_hash must be a sha256 hash");
  } else if (record.gate_hash !== measurementCellSeriesPersistencePromotionGateHash(record)) {
    gaps.push("gate_hash must match gate contents");
  }
  return gaps;
}

export function validateMeasurementCellSeriesPersistencePromotionGate(gate, options = {}) {
  const gaps = [
    ...collectGateShapeGaps(gate),
    ...collectSourcePackageBindingGaps(gate, options),
    ...collectDurableReadPathDecisionBindingGaps(gate, options),
    ...collectBoundaryLeakage(gate)
  ];
  const ready = asRecord(gate).gate_state === READY_STATE;
  return {
    schema_version: VALIDATION_SCHEMA_VERSION,
    gate_id: gate?.gate_id ?? null,
    valid: ready && gaps.length === 0,
    gaps
  };
}

function printUsageAndExit() {
  console.error(
    "Usage: node scripts/run_ai_value_measurement_cell_series_persistence_promotion_gate.mjs <controlled-aggregate-fixture.json>"
  );
  process.exit(1);
}

function main() {
  const args = process.argv.slice(2);
  const fixturePath = args.find((arg) => !arg.startsWith("--"));
  if (!fixturePath) printUsageAndExit();
  const cwd = process.cwd();
  const fixture = JSON.parse(readFileSync(resolve(cwd, fixturePath), "utf8"));
  const sourcePackage = runControlledRepeatedPilotEvidencePackageFromObject(fixture, { cwd });
  const gate = buildMeasurementCellSeriesPersistencePromotionGateFromObject(sourcePackage, {
    cwd
  });
  process.stdout.write(`${JSON.stringify(gate, null, 2)}\n`);
}

const isCli = process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isCli) {
  main();
}
