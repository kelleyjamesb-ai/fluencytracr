#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  runControlledRepeatedPilotEvidencePackageFromObject,
  validateControlledRepeatedPilotEvidencePackage
} from "./run_ai_value_controlled_pilot_evidence_package.mjs";

export const CUSTOMER_EVIDENCE_HISTORY_READ_PATH_PROOF_SCHEMA_VERSION =
  "FT_AI_VALUE_CUSTOMER_EVIDENCE_HISTORY_READ_PATH_PROOF_2026_06";

const VALIDATION_SCHEMA_VERSION =
  `${CUSTOMER_EVIDENCE_HISTORY_READ_PATH_PROOF_SCHEMA_VERSION}_VALIDATION`;

const DERIVATION_VERSION =
  "ai_value_customer_evidence_history_read_path_proof_2026_06";

const PROVEN_STATE = "COMPACT_CUSTOMER_HISTORY_READ_PATH_PROVEN";
const HOLD_SERIES_STATE = "HOLD_FOR_VALID_MEASUREMENT_CELL_SERIES";
const HOLD_INPUTS_STATE = "HOLD_FOR_CUSTOMER_EVIDENCE_HISTORY_INPUTS";
const REJECTED_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";

const READY_PILOT_DECISION = "PILOT_PASSED_PROMOTION_REVIEW_READY";
const READY_SERIES_BOUNDARY_DECISION =
  "HOLD_SERIES_PERSISTENCE_FOR_SEPARATE_PROMOTION_DECISION";
const REQUIRED_MILESTONE_DAYS = [0, 30, 60, 90, 180, 365];

const ROUTE_PROJECTION_SCHEMA_VERSION =
  "FT_AI_VALUE_CUSTOMER_DATA_MODEL_ROUTE_PROJECTION_2026_06";

const SATISFIED_READ_PATH_RESULT = {
  compact_snapshot_projection_state:
    "COMPACT_SNAPSHOT_ROWS_SATISFY_CUSTOMER_HISTORY_READ_PATH",
  customer_history_projection_state:
    "CUSTOMER_HISTORY_CONTINUITY_CAN_BE_SERVED_FROM_COMPACT_SNAPSHOTS",
  series_contract_state: "MEASUREMENT_CELL_SERIES_CONTRACT_OUTPUT_VALIDATED",
  evidence_continuity_placement_state:
    "KEEP_EVIDENCE_CONTINUITY_INSIDE_MEASUREMENT_CELL_SERIES_CONTRACT_OUTPUT",
  storage_boundary_state: "COMPACT_REFS_ONLY_NO_NEW_PERSISTENCE",
  live_wiring_state: "NO_LIVE_CONNECTOR_EXECUTION_REQUIRED",
  route_projection_contract_state:
    "SOURCE_BOUND_CUSTOMER_DATA_MODEL_ROUTE_PROJECTION_CONTRACT_READY"
};

const HOLD_READ_PATH_RESULT = {
  compact_snapshot_projection_state: "COMPACT_SNAPSHOT_ROWS_NOT_PROVEN",
  customer_history_projection_state: "CUSTOMER_HISTORY_CONTINUITY_NOT_PROVEN",
  series_contract_state: "MEASUREMENT_CELL_SERIES_CONTRACT_NOT_VALIDATED",
  evidence_continuity_placement_state:
    "KEEP_EVIDENCE_CONTINUITY_INSIDE_MEASUREMENT_CELL_SERIES_CONTRACT_OUTPUT",
  storage_boundary_state: "COMPACT_REFS_ONLY_NO_NEW_PERSISTENCE",
  live_wiring_state: "NO_LIVE_CONNECTOR_EXECUTION_REQUIRED",
  route_projection_contract_state:
    "SOURCE_BOUND_CUSTOMER_DATA_MODEL_ROUTE_PROJECTION_CONTRACT_READY"
};

const TRUE_FEEDS = ["durable_series_read_path_decision"];

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

const PROOF_SCOPE_FIELDS = [
  "internal_review_only",
  "source_bound",
  "compact_refs_only",
  "status_posture_only",
  "measurement_cell_series_persistence_authorized",
  "schema_authorized",
  "migration_authorized",
  "repository_write_authorized",
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

const SOURCE_SERIES_REF_FIELDS = [
  "schema_version",
  "pilot_decision",
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
  "series_ref_hash"
];

const CUSTOMER_HISTORY_REF_FIELDS = [
  "read_model",
  "route_projection_schema_version",
  "required_milestone_days",
  "observed_milestone_days",
  "missing_milestone_days",
  "latest_clear_milestone_count",
  "latest_held_milestone_count",
  "latest_row_count",
  "stale_candidate_rows_ignored",
  "history_group_hash",
  "lineage_hash"
];

const READ_PATH_RESULT_FIELDS = Object.keys(SATISFIED_READ_PATH_RESULT);

const TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "proof_id",
  "proof_state",
  "generated_at",
  "derivation_version",
  "source_bound",
  "source_series_ref",
  "customer_history_ref",
  "read_path_result",
  "proof_scope",
  "feeds",
  "boundary_policy",
  "required_caveats",
  "blocked_uses",
  "hold_reasons",
  "validation_summary",
  "proof_hash"
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
  "Customer Evidence History Read-Path Proof is internal proof only; it does not create Series persistence, routes, UI, exports, rendered readouts, live connectors, model output, finance output, or customer-facing economic output.",
  "Complete Day 0 / 30 / 60 / 90 / 180 / 365 customer history can be served from compact customer data model snapshots only when latest rows are clear and source-bound.",
  "Evidence Continuity remains inside Measurement Cell Series contract output unless a later exact-scope decision proves a durable Series read model is required."
];

const ALLOWED_INPUT_FIELDS = new Set([
  "controlled_repeated_pilot_evidence_package",
  "customer_data_model_snapshots",
  "generated_at"
]);

const SNAPSHOT_LINEAGE_FIELDS = [
  "measurement_plan_id",
  "value_hypothesis_id",
  "value_hypothesis_ref",
  "value_hypothesis_binding_state",
  "approved_blueprint_ref",
  "approved_blueprint_payload_hash",
  "blueprint_expectation_ref",
  "expectation_path_id",
  "expectation_path_version",
  "expectation_path_hash",
  "approval_state",
  "value_driver",
  "metric_id",
  "metric_definition_ref",
  "metric_definition_hash",
  "metric_owner_approval_state",
  "metric_direction",
  "metric_unit",
  "expected_metric_lag_days",
  "workflow_family",
  "workflow_id",
  "function_area",
  "cohort_key",
  "window_mode",
  "aggregate_source_system",
  "aggregate_export_review_state",
  "assembly_decision"
];

const REQUIRED_SNAPSHOT_FIELDS = [
  "customer_data_model_snapshot_id",
  "measurement_plan_id",
  "measurement_cell_id",
  "value_hypothesis_binding_state",
  "approved_blueprint_payload_hash",
  "expectation_path_id",
  "expectation_path_version",
  "expectation_path_hash",
  "approval_state",
  "value_driver",
  "metric_id",
  "metric_definition_hash",
  "metric_owner_approval_state",
  "metric_direction",
  "metric_unit",
  "expected_metric_lag_days",
  "workflow_family",
  "function_area",
  "cohort_key",
  "window_mode",
  "milestone_day",
  "baseline_window_start",
  "baseline_window_end",
  "comparison_window_start",
  "comparison_window_end",
  "aggregate_export_review_state",
  "validation_valid",
  "assembly_validation_valid",
  "validation_gap_count",
  "assembly_validation_gap_count",
  "blocked_uses",
  "version"
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
    (path[0] === "feeds" && [...TRUE_FEEDS, ...FALSE_FEEDS].includes(key)) ||
    (path[0] === "boundary_policy" && BOUNDARY_POLICY_FIELDS.includes(key)) ||
    (path[0] === "proof_scope" && PROOF_SCOPE_FIELDS.includes(key))
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

function sourcePackageFromInput(input) {
  const record = asRecord(input);
  if (record.schema_version === "FT_AI_VALUE_CONTROLLED_PILOT_EVIDENCE_PACKAGE_2026_06") {
    return record;
  }
  return asRecord(record.controlled_repeated_pilot_evidence_package);
}

function sourceSeriesRef(packageRecord) {
  const seriesBoundary = asRecord(packageRecord.series_boundary);
  return {
    schema_version: packageRecord.schema_version ?? null,
    pilot_decision: packageRecord.pilot_decision ?? null,
    series_boundary_decision: seriesBoundary.decision ?? null,
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
    series_ref_hash: sha256Json({
      package_integrity_hash: packageRecord.package_integrity_hash ?? null,
      compact_refs: seriesBoundary.compact_refs ?? [],
      required_milestones: seriesBoundary.required_milestones ?? [],
      observed_milestones: seriesBoundary.observed_milestones ?? []
    })
  };
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

function latestSnapshotsBySnapshotId(snapshots) {
  const latest = new Map();
  for (const snapshot of snapshots.map(asRecord)) {
    const id = snapshot.customer_data_model_snapshot_id;
    if (!isSafeRef(id)) continue;
    const existing = latest.get(id);
    if (!existing) {
      latest.set(id, snapshot);
      continue;
    }
    const version = Number(snapshot.version ?? 0);
    const existingVersion = Number(existing.version ?? 0);
    if (
      version > existingVersion ||
      (version === existingVersion &&
        Date.parse(String(snapshot.created_at ?? "")) >
          Date.parse(String(existing.created_at ?? "")))
    ) {
      latest.set(id, snapshot);
    }
  }
  return [...latest.values()];
}

function snapshotIsClear(snapshot) {
  return (
    snapshot.validation_valid === true &&
    snapshot.assembly_validation_valid === true &&
    Number(snapshot.validation_gap_count) === 0 &&
    Number(snapshot.assembly_validation_gap_count) === 0 &&
    snapshot.window_mode === "milestone"
  );
}

function snapshotRequiredFieldGaps(snapshot, index) {
  const gaps = [];
  for (const field of REQUIRED_SNAPSHOT_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(snapshot, field)) {
      gaps.push(`customer_data_model_snapshots.${index}.${field} is required`);
    }
  }
  for (const field of [
    "customer_data_model_snapshot_id",
    "measurement_plan_id",
    "measurement_cell_id",
    "metric_id",
    "workflow_family",
    "cohort_key"
  ]) {
    if (snapshot[field] !== undefined && !isSafeRef(String(snapshot[field]))) {
      gaps.push(`customer_data_model_snapshots.${index}.${field} must be safe compact metadata`);
    }
  }
  if (!Array.isArray(snapshot.blocked_uses)) {
    gaps.push(`customer_data_model_snapshots.${index}.blocked_uses must be an array`);
  }
  return gaps;
}

function lineageForSnapshot(snapshot) {
  return Object.fromEntries(
    SNAPSHOT_LINEAGE_FIELDS.map((field) => [field, snapshot[field] ?? null])
  );
}

function customerHistoryAnalysis(input) {
  const snapshots = asArray(asRecord(input).customer_data_model_snapshots).map(asRecord);
  const gaps = [];
  if (snapshots.length === 0) {
    gaps.push("customer_data_model_snapshots are required");
  }
  snapshots.forEach((snapshot, index) => {
    gaps.push(...snapshotRequiredFieldGaps(snapshot, index));
    gaps.push(
      ...collectBoundaryLeakage(snapshot).map(
        (gap) => `customer_data_model_snapshots.${index}: ${gap}`
      )
    );
  });

  const latestRows = latestSnapshotsBySnapshotId(snapshots);
  const staleCandidateRowsIgnored = Math.max(0, snapshots.length - latestRows.length);
  const clearLatestRows = latestRows.filter(snapshotIsClear);
  const requiredClearRows = clearLatestRows.filter((snapshot) =>
    REQUIRED_MILESTONE_DAYS.includes(Number(snapshot.milestone_day))
  );
  const observedMilestones = [
    ...new Set(requiredClearRows.map((snapshot) => Number(snapshot.milestone_day)))
  ].sort((left, right) => left - right);
  const missingMilestones = REQUIRED_MILESTONE_DAYS.filter(
    (day) => !observedMilestones.includes(day)
  );
  const latestHeldRows = latestRows.filter(
    (snapshot) =>
      REQUIRED_MILESTONE_DAYS.includes(Number(snapshot.milestone_day)) &&
      !snapshotIsClear(snapshot)
  );

  if (missingMilestones.length > 0) {
    gaps.push("customer_history_missing_required_milestones");
  }
  if (latestHeldRows.length > 0) {
    gaps.push("latest_customer_snapshots_not_clear");
  }

  const lineageHashes = [
    ...new Set(requiredClearRows.map((snapshot) => sha256Json(lineageForSnapshot(snapshot))))
  ];
  if (lineageHashes.length > 1) {
    gaps.push("customer_history_lineage_drift");
  }

  const lineageHash = lineageHashes[0] ?? sha256Json({ no_clear_lineage: true });
  const historyGroupHash = sha256Json({
    lineage_hash: lineageHash,
    required_milestone_days: REQUIRED_MILESTONE_DAYS,
    observed_milestone_days: observedMilestones,
    route_projection_schema_version: ROUTE_PROJECTION_SCHEMA_VERSION
  });

  return {
    gaps,
    ref: {
      read_model: "ai_value_customer_data_model_snapshots",
      route_projection_schema_version: ROUTE_PROJECTION_SCHEMA_VERSION,
      required_milestone_days: REQUIRED_MILESTONE_DAYS,
      observed_milestone_days: observedMilestones,
      missing_milestone_days: missingMilestones,
      latest_clear_milestone_count: observedMilestones.length,
      latest_held_milestone_count: latestHeldRows.length,
      latest_row_count: latestRows.length,
      stale_candidate_rows_ignored: staleCandidateRowsIgnored,
      history_group_hash: historyGroupHash,
      lineage_hash: lineageHash
    }
  };
}

function inputBoundaryGaps(input, generatedAtGaps) {
  const record = asRecord(input);
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

function baseProof(state, valid, gaps, generatedAt) {
  const sourceBound = state === PROVEN_STATE && valid;
  return {
    schema_version: CUSTOMER_EVIDENCE_HISTORY_READ_PATH_PROOF_SCHEMA_VERSION,
    proof_id: `customer_evidence_history_read_path_proof:${state.toLowerCase()}`,
    proof_state: state,
    generated_at: generatedAt,
    derivation_version: DERIVATION_VERSION,
    source_bound: sourceBound,
    proof_scope: {
      internal_review_only: true,
      source_bound: sourceBound,
      compact_refs_only: true,
      status_posture_only: true,
      measurement_cell_series_persistence_authorized: false,
      schema_authorized: false,
      migration_authorized: false,
      repository_write_authorized: false,
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
    feeds: {
      durable_series_read_path_decision: sourceBound,
      ...falseMap(FALSE_FEEDS)
    },
    boundary_policy: falseMap(BOUNDARY_POLICY_FIELDS),
    required_caveats: REQUIRED_CAVEATS,
    blocked_uses: REQUIRED_BLOCKED_USES,
    validation_summary: validationSummary(valid, gaps)
  };
}

function rejectedProof(gaps, generatedAt) {
  const proof = {
    ...baseProof(REJECTED_STATE, false, gaps, generatedAt),
    source_series_ref: null,
    customer_history_ref: null,
    read_path_result: HOLD_READ_PATH_RESULT,
    hold_reasons: ["boundary_leakage_rejected"]
  };
  proof.proof_hash = customerEvidenceHistoryReadPathProofHash(proof);
  return proof;
}

export function customerEvidenceHistoryReadPathProofHash(proof) {
  const clone = JSON.parse(JSON.stringify(proof));
  delete clone.proof_hash;
  return sha256Json(clone);
}

export function buildCustomerEvidenceHistoryReadPathProofFromObject(input, options = {}) {
  const generatedAtResult = safeGeneratedAt(input, options);
  const generatedAt = generatedAtResult.value;
  const wrapperGaps = inputBoundaryGaps(input, generatedAtResult.gaps);
  if (wrapperGaps.length > 0) {
    return rejectedProof(wrapperGaps, generatedAt);
  }

  const packageRecord = sourcePackageFromInput(input);
  const packageValidation = validateControlledRepeatedPilotEvidencePackage(packageRecord, {
    cwd: options.cwd ?? process.cwd()
  });
  const seriesRef = sourceSeriesRef(packageRecord);
  const sourceSeriesValid = packageHasCompleteSeries(packageRecord, packageValidation);

  const history = customerHistoryAnalysis(input);
  if (history.gaps.some((gap) => /is not allowed|unsafe source text/.test(gap))) {
    return rejectedProof(history.gaps, generatedAt);
  }

  const holdReasons = [];
  if (!sourceSeriesValid) {
    holdReasons.push("measurement_cell_series_invalid_or_incomplete");
  }
  if (history.gaps.includes("customer_data_model_snapshots are required")) {
    holdReasons.push("customer_history_snapshots_required");
  }
  if (history.gaps.includes("customer_history_missing_required_milestones")) {
    holdReasons.push("customer_history_missing_required_milestones");
  }
  if (history.gaps.includes("latest_customer_snapshots_not_clear")) {
    holdReasons.push("latest_customer_snapshots_not_clear");
  }
  if (history.gaps.includes("customer_history_lineage_drift")) {
    holdReasons.push("customer_history_lineage_drift");
  }
  const nonRejectGaps = history.gaps.filter(
    (gap) =>
      ![
        "customer_data_model_snapshots are required",
        "customer_history_missing_required_milestones",
        "latest_customer_snapshots_not_clear",
        "customer_history_lineage_drift"
      ].includes(gap)
  );
  holdReasons.push(...nonRejectGaps);

  const historyValid = history.gaps.length === 0;
  const state = !sourceSeriesValid
    ? HOLD_SERIES_STATE
    : historyValid
      ? PROVEN_STATE
      : HOLD_INPUTS_STATE;
  const valid = state === PROVEN_STATE;
  const gaps = valid ? [] : holdReasons;
  const proof = {
    ...baseProof(state, valid, gaps, generatedAt),
    source_series_ref: seriesRef,
    customer_history_ref: history.ref,
    read_path_result: valid ? SATISFIED_READ_PATH_RESULT : HOLD_READ_PATH_RESULT,
    hold_reasons: gaps
  };
  proof.proof_id = `customer_evidence_history_read_path_proof:${history.ref.history_group_hash}`;
  proof.proof_hash = customerEvidenceHistoryReadPathProofHash(proof);
  return proof;
}

function expectedReadPathResultForState(state) {
  if (state === PROVEN_STATE) return SATISFIED_READ_PATH_RESULT;
  return HOLD_READ_PATH_RESULT;
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

function collectProofShapeGaps(proof) {
  const gaps = [];
  const record = asRecord(proof);
  gaps.push(...collectAllowedFieldsGaps(record, TOP_LEVEL_FIELDS, "proof"));
  if (record.schema_version !== CUSTOMER_EVIDENCE_HISTORY_READ_PATH_PROOF_SCHEMA_VERSION) {
    gaps.push("schema_version is unsupported");
  }
  if (
    ![
      PROVEN_STATE,
      HOLD_SERIES_STATE,
      HOLD_INPUTS_STATE,
      REJECTED_STATE
    ].includes(record.proof_state)
  ) {
    gaps.push("proof_state is unsupported");
  }
  const sourceBound = record.proof_state === PROVEN_STATE;
  if (record.source_bound !== sourceBound) {
    gaps.push(`source_bound must be ${sourceBound}`);
  }

  gaps.push(...collectRefShapeGaps(record.source_series_ref, SOURCE_SERIES_REF_FIELDS, "source_series_ref"));
  gaps.push(...collectRefShapeGaps(record.customer_history_ref, CUSTOMER_HISTORY_REF_FIELDS, "customer_history_ref"));
  gaps.push(...collectRefShapeGaps(record.read_path_result, READ_PATH_RESULT_FIELDS, "read_path_result"));
  gaps.push(...collectRefShapeGaps(record.proof_scope, PROOF_SCOPE_FIELDS, "proof_scope"));

  const result = asRecord(record.read_path_result);
  const expectedResult = expectedReadPathResultForState(record.proof_state);
  for (const [field, expected] of Object.entries(expectedResult)) {
    if (result[field] !== expected) {
      gaps.push(`read_path_result.${field} must be ${expected}`);
    }
  }

  const historyRef = asRecord(record.customer_history_ref);
  for (const field of [
    "required_milestone_days",
    "observed_milestone_days",
    "missing_milestone_days"
  ]) {
    if (!Array.isArray(historyRef[field])) {
      gaps.push(`customer_history_ref.${field} must be an array`);
    }
  }
  if (!SHA256_PATTERN.test(String(historyRef.history_group_hash ?? ""))) {
    gaps.push("customer_history_ref.history_group_hash must be a sha256 hash");
  }
  if (!SHA256_PATTERN.test(String(historyRef.lineage_hash ?? ""))) {
    gaps.push("customer_history_ref.lineage_hash must be a sha256 hash");
  }
  if (record.proof_state === PROVEN_STATE) {
    if (stableStringify(historyRef.required_milestone_days) !== stableStringify(REQUIRED_MILESTONE_DAYS)) {
      gaps.push("customer_history_ref.required_milestone_days must be Day 0 / 30 / 60 / 90 / 180 / 365");
    }
    if (stableStringify(historyRef.observed_milestone_days) !== stableStringify(REQUIRED_MILESTONE_DAYS)) {
      gaps.push("customer_history_ref.observed_milestone_days must include all required milestones");
    }
    if (!Array.isArray(historyRef.missing_milestone_days) || historyRef.missing_milestone_days.length !== 0) {
      gaps.push("customer_history_ref.missing_milestone_days must be empty");
    }
    if (historyRef.latest_clear_milestone_count !== REQUIRED_MILESTONE_DAYS.length) {
      gaps.push("customer_history_ref.latest_clear_milestone_count must be 6");
    }
  }

  const proofScope = asRecord(record.proof_scope);
  for (const field of PROOF_SCOPE_FIELDS) {
    let expected = false;
    if (["internal_review_only", "compact_refs_only", "status_posture_only"].includes(field)) {
      expected = true;
    }
    if (field === "source_bound") {
      expected = sourceBound;
    }
    if (proofScope[field] !== expected) {
      gaps.push(`proof_scope.${field} must be ${expected}`);
    }
  }

  const feeds = asRecord(record.feeds);
  gaps.push(...collectAllowedFieldsGaps(feeds, new Set([...TRUE_FEEDS, ...FALSE_FEEDS]), "feeds"));
  if (feeds.durable_series_read_path_decision !== sourceBound) {
    gaps.push(`feeds.durable_series_read_path_decision must be ${sourceBound}`);
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
    if (!asArray(record.required_caveats).includes(caveat)) {
      gaps.push(`required_caveats must include: ${caveat}`);
    }
  }
  for (const blockedUse of REQUIRED_BLOCKED_USES) {
    if (!asArray(record.blocked_uses).includes(blockedUse)) {
      gaps.push(`blocked_uses must include ${blockedUse}`);
    }
  }
  gaps.push(
    ...collectBoundaryLeakage({
      required_caveats: record.required_caveats,
      blocked_uses: record.blocked_uses
    })
  );

  const boundaryGaps = collectBoundaryLeakage(record);
  gaps.push(...boundaryGaps);

  const expectedHash = customerEvidenceHistoryReadPathProofHash(record);
  if (record.proof_hash !== expectedHash) {
    gaps.push("proof_hash must match proof body");
  }

  const summary = asRecord(record.validation_summary);
  if (summary.schema_version !== VALIDATION_SCHEMA_VERSION) {
    gaps.push("validation_summary.schema_version is unsupported");
  }
  const expectedValid = record.proof_state === PROVEN_STATE;
  if (summary.valid !== expectedValid) {
    gaps.push(`validation_summary.valid must be ${expectedValid}`);
  }
  if (expectedValid && asArray(summary.gaps).length !== 0) {
    gaps.push("validation_summary.gaps must be empty for valid proof states");
  }
  if (!expectedValid && stableStringify(summary.gaps) !== stableStringify(record.hold_reasons ?? [])) {
    gaps.push("validation_summary.gaps must match hold_reasons for held proof states");
  }
  return [...new Set(gaps)];
}

function collectSourceInputBindingGaps(proof, options = {}) {
  const record = asRecord(proof);
  if (!options.sourceInput) return [];
  const expected = buildCustomerEvidenceHistoryReadPathProofFromObject(options.sourceInput, {
    cwd: options.cwd ?? process.cwd()
  });
  const gaps = [];
  for (const field of [
    "proof_state",
    "source_bound",
    "source_series_ref",
    "customer_history_ref",
    "read_path_result",
    "proof_scope",
    "feeds",
    "boundary_policy",
    "required_caveats",
    "blocked_uses",
    "hold_reasons",
    "validation_summary"
  ]) {
    if (stableStringify(record[field]) !== stableStringify(expected[field])) {
      gaps.push(`sourceInput binding mismatch for ${field}`);
    }
  }
  if (record.proof_id !== expected.proof_id) {
    gaps.push("sourceInput binding mismatch for proof_id");
  }
  return gaps;
}

export function validateCustomerEvidenceHistoryReadPathProof(proof, options = {}) {
  const record = asRecord(proof);
  const gaps = [
    ...collectProofShapeGaps(proof),
    ...collectSourceInputBindingGaps(proof, options)
  ];
  return validationSummary(
    gaps.length === 0 && record.proof_state === PROVEN_STATE,
    [...new Set(gaps)]
  );
}

function demoSnapshot(day) {
  return {
    id: `demo_row_day_${day}`,
    org_id: "demo_org_internal",
    client_id: null,
    customer_data_model_snapshot_id: `demo_customer_snapshot_day_${day}`,
    source_snapshot_id: `demo_measurement_cell_snapshot_day_${day}`,
    source_projection_id: `demo_measurement_cell_projection_day_${day}`,
    source_projection_hash: "a".repeat(64),
    source_gate_id: `demo_customer_data_model_gate_day_${day}`,
    source_gate_hash: "b".repeat(64),
    source_promotion_decision_id: `demo_customer_data_model_promotion_day_${day}`,
    source_promotion_decision_hash: "c".repeat(64),
    implementation_decision_id: `demo_customer_data_model_implementation_day_${day}`,
    implementation_decision_hash: "d".repeat(64),
    measurement_cell_id: "demo_measurement_cell_support_resolution",
    measurement_cell_assembly_run_id: `demo_assembly_run_day_${day}`,
    measurement_plan_id: "demo_measurement_plan_customer_support",
    value_hypothesis_id: "demo_value_hypothesis_capacity",
    value_hypothesis_ref: "demo_value_hypothesis_ref_capacity",
    value_hypothesis_binding_state: "bound",
    approved_blueprint_ref: "demo_approved_blueprint_capacity",
    approved_blueprint_payload_hash: "e".repeat(64),
    blueprint_expectation_ref: "demo_blueprint_expectation_resolution",
    expectation_path_id: "demo_expectation_path_resolution",
    expectation_path_version: 1,
    expectation_path_hash: "f".repeat(64),
    approval_state: "approved",
    approved_at: "2026-06-24T00:00:00.000Z",
    approved_by_role: "value_realization_pm",
    value_driver: "Capacity",
    metric_id: "demo_support_resolution_hours",
    metric_definition_ref: "demo_metric_definition_resolution",
    metric_definition_hash: "1".repeat(64),
    metric_owner_approval_state: "approved",
    metric_direction: "decrease",
    metric_unit: "hours",
    expected_metric_lag_days: 30,
    workflow_family: "customer_support_case_resolution",
    workflow_id: "demo_workflow_support_resolution",
    function_area: "Customer Support",
    cohort_key: "function:customer_support",
    window_mode: "milestone",
    milestone_day: day,
    baseline_window_start: "2026-02-01",
    baseline_window_end: "2026-03-31",
    comparison_window_start: "2026-04-01",
    comparison_window_end: "2026-05-31",
    aggregate_source_system: "bigquery_export",
    aggregate_export_review_ref: `demo_aggregate_review_day_${day}`,
    aggregate_export_review_state: "passed_review",
    aggregate_source_export_ref: `demo_source_export_day_${day}`,
    aggregate_export_review_hash: "2".repeat(64),
    pipeline_dry_run_ref: `demo_pipeline_dry_run_day_${day}`,
    pipeline_boundary_hash: "3".repeat(64),
    source_refs: {
      vbd_source_ref: `demo_vbd_probe_day_${day}`,
      token_source_ref: `demo_token_probe_day_${day}`
    },
    aggregate_boundary_ref: {
      source_inventory_manifest_ref: `demo_source_inventory_day_${day}`,
      aggregate_extraction_manifest_ref: `demo_aggregate_extraction_day_${day}`,
      pipeline_run_review_manifest_ref: `demo_pipeline_review_day_${day}`
    },
    assembly_decision: "READY_FOR_VALUE_HYPOTHESIS_PACKET_RUNNER",
    validation_valid: true,
    assembly_validation_valid: true,
    validation_gap_count: 0,
    assembly_validation_gap_count: 0,
    required_caveats: [
      "Aggregate evidence status only; customer-owned outcome review remains required."
    ],
    blocked_uses: [
      "realized_roi",
      "finance_output",
      "causality_claim",
      "productivity_claim",
      "confidence_output",
      "probability_output",
      "score_output",
      "live_bigquery_execution",
      "live_sigma_execution",
      "customer_facing_financial_output"
    ],
    version: 1,
    supersedes_id: null,
    generated_at: "2026-06-25T18:30:00.000Z",
    created_at: "2026-06-25T18:31:00.000Z",
    created_by_role: "value_realization_pm"
  };
}

export function buildDemoCustomerEvidenceHistoryInputFromSourceFixture(sourceFixture, options = {}) {
  const repeatedPackage = runControlledRepeatedPilotEvidencePackageFromObject(sourceFixture, {
    cwd: options.cwd ?? process.cwd()
  });
  return {
    controlled_repeated_pilot_evidence_package: repeatedPackage,
    customer_data_model_snapshots: REQUIRED_MILESTONE_DAYS.map(demoSnapshot)
  };
}

function inputFromCliPath(path) {
  const parsed = JSON.parse(readFileSync(resolve(path), "utf8"));
  if (Array.isArray(parsed.customer_data_model_snapshots)) {
    return parsed;
  }
  return buildDemoCustomerEvidenceHistoryInputFromSourceFixture(parsed, {
    cwd: process.cwd()
  });
}

function main() {
  const [, , inputPath] = process.argv;
  if (!inputPath) {
    console.error(
      "Usage: node scripts/run_ai_value_customer_evidence_history_read_path_proof.mjs <input-json-or-source-fixture>"
    );
    process.exit(1);
  }
  const proof = buildCustomerEvidenceHistoryReadPathProofFromObject(inputFromCliPath(inputPath), {
    cwd: process.cwd()
  });
  process.stdout.write(`${JSON.stringify(proof, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
