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

export const DURABLE_SERIES_READ_PATH_DECISION_SCHEMA_VERSION =
  "FT_AI_VALUE_DURABLE_SERIES_READ_PATH_DECISION_2026_06";

const VALIDATION_SCHEMA_VERSION =
  `${DURABLE_SERIES_READ_PATH_DECISION_SCHEMA_VERSION}_VALIDATION`;

const DERIVATION_VERSION =
  "ai_value_durable_series_read_path_decision_2026_06";

const SATISFIED_HOLD_STATE =
  "HOLD_SERIES_PERSISTENCE_COMPACT_CUSTOMER_HISTORY_READ_PATH_SATISFIED";
const HOLD_PROOF_STATE = "HOLD_FOR_CUSTOMER_EVIDENCE_HISTORY_READ_PATH_PROOF";
const REJECTED_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";

const SOURCE_PROOF_READY_STATE = "COMPACT_CUSTOMER_HISTORY_READ_PATH_PROVEN";

const ALLOWED_NEXT_STEP =
  "continue_customer_history_reads_from_ai_value_customer_data_model_snapshots";
const HELD_NEXT_STEP =
  "complete_customer_evidence_history_read_path_proof_before_series_persistence_reconsideration";

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
  "research_model_feed",
  "model_output",
  "probability_output",
  "score_like_output",
  "finance_output"
];

const DECISION_SCOPE_FIELDS = [
  "internal_review_only",
  "source_bound",
  "compact_refs_only",
  "status_posture_only",
  "measurement_cell_series_persistence_authorized",
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
  "compact_snapshot_history_satisfies_read_path",
  "series_snapshot_read_model_required",
  "evidence_continuity_stays_in_series_contract",
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

const TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "decision_id",
  "decision_state",
  "generated_at",
  "derivation_version",
  "source_bound",
  "source_proof_ref",
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
  "Durable Series Read-Path Decision is an internal decision record only; it does not create measurement_cell_series_snapshots, schemas, migrations, repositories, routes, UI, exports, rendered readouts, live connectors, model output, finance output, or customer-facing economic output.",
  "When compact customer data model snapshots satisfy customer evidence history reads, Series persistence remains held.",
  "A later compact-gap decision would require new source-bound proof; caller-edited proof states or hashes do not authorize implementation."
];

const ALLOWED_INPUT_FIELDS = new Set([
  "customer_evidence_history_read_path_proof",
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

function keyIsFalsePosture(path, key) {
  if (path.length !== 1) return false;
  return (
    (path[0] === "feeds" && FALSE_FEEDS.includes(key)) ||
    (path[0] === "boundary_policy" && BOUNDARY_POLICY_FIELDS.includes(key)) ||
    (path[0] === "decision_scope" && DECISION_SCOPE_FIELDS.includes(key))
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

function inputBoundaryGaps(input, generatedAtGaps) {
  const record = asRecord(input);
  if (record.schema_version === CUSTOMER_EVIDENCE_HISTORY_READ_PATH_PROOF_SCHEMA_VERSION) {
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

function prerequisitesForProof(proof, proofValidation) {
  const ref = sourceProofRef(proof);
  const proofValid =
    proofValidation.valid === true &&
    proof.proof_state === SOURCE_PROOF_READY_STATE &&
    proof.proof_hash === customerEvidenceHistoryReadPathProofHash(proof);
  return {
    customer_evidence_history_proof_valid: proofValid,
    source_proof_bound: proofValid,
    complete_customer_history_milestones:
      proofValid &&
      stableStringify(ref.required_milestone_days) ===
        stableStringify([0, 30, 60, 90, 180, 365]) &&
      stableStringify(ref.observed_milestone_days) ===
        stableStringify([0, 30, 60, 90, 180, 365]) &&
      ref.missing_milestone_days.length === 0 &&
      ref.latest_clear_milestone_count === 6,
    compact_snapshot_history_satisfies_read_path:
      proofValid &&
      ref.compact_snapshot_projection_state ===
        "COMPACT_SNAPSHOT_ROWS_SATISFY_CUSTOMER_HISTORY_READ_PATH" &&
      ref.customer_history_projection_state ===
        "CUSTOMER_HISTORY_CONTINUITY_CAN_BE_SERVED_FROM_COMPACT_SNAPSHOTS",
    series_snapshot_read_model_required: false,
    evidence_continuity_stays_in_series_contract:
      proofValid &&
      ref.evidence_continuity_placement_state ===
        "KEEP_EVIDENCE_CONTINUITY_INSIDE_MEASUREMENT_CELL_SERIES_CONTRACT_OUTPUT",
    live_wiring_boundary_held: proofValid
  };
}

function holdReasons(prerequisites, proofValidation) {
  const reasons = [];
  if (!prerequisites.customer_evidence_history_proof_valid) {
    reasons.push("customer_evidence_history_proof_not_valid");
  }
  if (!prerequisites.complete_customer_history_milestones) {
    reasons.push("complete_customer_history_milestones_not_proven");
  }
  if (!prerequisites.compact_snapshot_history_satisfies_read_path) {
    reasons.push("compact_snapshot_history_read_path_not_satisfied");
  }
  if (!prerequisites.evidence_continuity_stays_in_series_contract) {
    reasons.push("evidence_continuity_placement_not_bound");
  }
  if (!prerequisites.live_wiring_boundary_held) {
    reasons.push("live_wiring_boundary_not_held");
  }
  return [...new Set([...reasons, ...asArray(proofValidation.gaps)])];
}

function baseDecision(state, valid, gaps, generatedAt) {
  const sourceBound = state === SATISFIED_HOLD_STATE && valid;
  return {
    schema_version: DURABLE_SERIES_READ_PATH_DECISION_SCHEMA_VERSION,
    decision_id: `durable_series_read_path_decision:${state.toLowerCase()}`,
    decision_state: state,
    generated_at: generatedAt,
    derivation_version: DERIVATION_VERSION,
    source_bound: sourceBound,
    decision_scope: {
      internal_review_only: true,
      source_bound: sourceBound,
      compact_refs_only: true,
      status_posture_only: true,
      measurement_cell_series_persistence_authorized: false,
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
    allowed_next_step: sourceBound ? ALLOWED_NEXT_STEP : HELD_NEXT_STEP,
    feeds: falseMap(FALSE_FEEDS),
    boundary_policy: falseMap(BOUNDARY_POLICY_FIELDS),
    required_caveats: REQUIRED_CAVEATS,
    blocked_uses: REQUIRED_BLOCKED_USES,
    hold_reasons: gaps,
    validation_summary: validationSummary(valid, gaps)
  };
}

function rejectedDecision(gaps, generatedAt) {
  const decision = {
    ...baseDecision(REJECTED_STATE, false, gaps, generatedAt),
    source_proof_ref: null,
    prerequisites: Object.fromEntries(PREREQUISITE_FIELDS.map((field) => [field, false])),
    hold_reasons: ["boundary_leakage_rejected"]
  };
  decision.validation_summary = validationSummary(false, decision.hold_reasons);
  decision.decision_hash = durableSeriesReadPathDecisionHash(decision);
  return decision;
}

export function durableSeriesReadPathDecisionHash(decision) {
  const clone = JSON.parse(JSON.stringify(decision));
  delete clone.decision_hash;
  return sha256Json(clone);
}

export function buildDurableSeriesReadPathDecisionFromObject(input, options = {}) {
  const generatedAtResult = safeGeneratedAt(input, options);
  const generatedAt = generatedAtResult.value;
  const wrapperGaps = inputBoundaryGaps(input, generatedAtResult.gaps);
  if (wrapperGaps.length > 0) {
    return rejectedDecision(wrapperGaps, generatedAt);
  }

  const proof = inputProof(input);
  const proofValidation = validateCustomerEvidenceHistoryReadPathProof(proof, {
    cwd: options.cwd ?? process.cwd()
  });
  const prerequisites = prerequisitesForProof(proof, proofValidation);
  const reasons = holdReasons(prerequisites, proofValidation);
  const valid =
    prerequisites.customer_evidence_history_proof_valid &&
    prerequisites.complete_customer_history_milestones &&
    prerequisites.compact_snapshot_history_satisfies_read_path &&
    prerequisites.evidence_continuity_stays_in_series_contract &&
    prerequisites.live_wiring_boundary_held;
  const state = valid ? SATISFIED_HOLD_STATE : HOLD_PROOF_STATE;
  const decision = {
    ...baseDecision(state, valid, valid ? [] : reasons, generatedAt),
    source_proof_ref: sourceProofRef(proof),
    prerequisites,
    hold_reasons: valid ? [] : reasons
  };
  if (decision.source_proof_ref?.customer_history_hash) {
    decision.decision_id =
      `durable_series_read_path_decision:${decision.source_proof_ref.customer_history_hash}`;
  }
  decision.decision_hash = durableSeriesReadPathDecisionHash(decision);
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
  if (record.schema_version !== DURABLE_SERIES_READ_PATH_DECISION_SCHEMA_VERSION) {
    gaps.push("schema_version is unsupported");
  }
  if (![SATISFIED_HOLD_STATE, HOLD_PROOF_STATE, REJECTED_STATE].includes(record.decision_state)) {
    gaps.push("decision_state is unsupported");
  }
  const sourceBound = record.decision_state === SATISFIED_HOLD_STATE;
  if (record.source_bound !== sourceBound) {
    gaps.push(`source_bound must be ${sourceBound}`);
  }
  gaps.push(...collectRefShapeGaps(record.source_proof_ref, SOURCE_PROOF_REF_FIELDS, "source_proof_ref"));
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
  for (const field of [
    "required_milestone_days",
    "observed_milestone_days",
    "missing_milestone_days"
  ]) {
    if (!Array.isArray(ref[field])) {
      gaps.push(`source_proof_ref.${field} must be an array`);
    }
  }
  if (sourceBound && record.allowed_next_step !== ALLOWED_NEXT_STEP) {
    gaps.push(`allowed_next_step must be ${ALLOWED_NEXT_STEP}`);
  }
  if (!sourceBound && record.allowed_next_step !== HELD_NEXT_STEP) {
    gaps.push(`allowed_next_step must be ${HELD_NEXT_STEP}`);
  }

  const prerequisites = asRecord(record.prerequisites);
  for (const field of PREREQUISITE_FIELDS) {
    const expected =
      sourceBound && field !== "series_snapshot_read_model_required"
        ? true
        : false;
    if (prerequisites[field] !== expected) {
      gaps.push(`prerequisites.${field} must be ${expected}`);
    }
  }

  const decisionScope = asRecord(record.decision_scope);
  for (const field of DECISION_SCOPE_FIELDS) {
    let expected = false;
    if (["internal_review_only", "compact_refs_only", "status_posture_only"].includes(field)) {
      expected = true;
    }
    if (field === "source_bound") {
      expected = sourceBound;
    }
    if (decisionScope[field] !== expected) {
      gaps.push(`decision_scope.${field} must be ${expected}`);
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

  const expectedHash = durableSeriesReadPathDecisionHash(record);
  if (record.decision_hash !== expectedHash) {
    gaps.push("decision_hash must match decision body");
  }

  const summary = asRecord(record.validation_summary);
  if (summary.schema_version !== VALIDATION_SCHEMA_VERSION) {
    gaps.push("validation_summary.schema_version is unsupported");
  }
  if (summary.valid !== sourceBound) {
    gaps.push(`validation_summary.valid must be ${sourceBound}`);
  }
  if (sourceBound && asArray(summary.gaps).length !== 0) {
    gaps.push("validation_summary.gaps must be empty for source-bound hold decisions");
  }
  if (!sourceBound && stableStringify(summary.gaps) !== stableStringify(record.hold_reasons ?? [])) {
    gaps.push("validation_summary.gaps must match hold_reasons for held decisions");
  }

  return [...new Set(gaps)];
}

function collectSourceProofBindingGaps(decision, options = {}) {
  const record = asRecord(decision);
  const proof = asRecord(options.sourceCustomerEvidenceHistoryReadPathProof);
  if (Object.keys(proof).length === 0) return [];
  const proofValidation = validateCustomerEvidenceHistoryReadPathProof(proof, {
    cwd: options.cwd ?? process.cwd(),
    sourceInput: options.sourceInput
  });
  const gaps = [];
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
  const expectedDecision = buildDurableSeriesReadPathDecisionFromObject(proof, {
    cwd: options.cwd ?? process.cwd()
  });
  for (const field of [
    "decision_state",
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
      gaps.push(`sourceCustomerEvidenceHistoryReadPathProof binding mismatch for ${field}`);
    }
  }
  return gaps;
}

export function validateDurableSeriesReadPathDecision(decision, options = {}) {
  const record = asRecord(decision);
  const gaps = [
    ...collectDecisionShapeGaps(decision),
    ...collectSourceProofBindingGaps(decision, options)
  ];
  return validationSummary(
    gaps.length === 0 && record.decision_state === SATISFIED_HOLD_STATE,
    [...new Set(gaps)]
  );
}

function main() {
  const [, , inputPath] = process.argv;
  if (!inputPath) {
    console.error(
      "Usage: node scripts/run_ai_value_durable_series_read_path_decision.mjs <proof-json-or-history-input-json>"
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
  const decision = buildDurableSeriesReadPathDecisionFromObject(proof, {
    cwd: process.cwd()
  });
  process.stdout.write(`${JSON.stringify(decision, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
