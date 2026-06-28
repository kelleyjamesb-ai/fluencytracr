#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_RUNTIME_SCHEMA_VERSION,
  contributionAlignmentInternalBayesianExecutionRuntimeHash,
  validateContributionAlignmentInternalBayesianExecutionRuntime
} from "./run_ai_value_contribution_alignment_internal_bayesian_execution_runtime.mjs";
import {
  CONTRIBUTION_ALIGNMENT_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE_SCHEMA_VERSION,
  buildContributionAlignmentDiagnosticsSufficiencyEvidenceFromGovernedSource,
  contributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceHash
} from "./run_ai_value_contribution_alignment_governed_diagnostics_sufficiency_evidence_source.mjs";

export const CONTRIBUTION_ALIGNMENT_DIAGNOSTICS_EVIDENCE_PACKET_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_DIAGNOSTICS_EVIDENCE_PACKET_2026_06";

const VALIDATION_SCHEMA_VERSION =
  `${CONTRIBUTION_ALIGNMENT_DIAGNOSTICS_EVIDENCE_PACKET_SCHEMA_VERSION}_VALIDATION`;

const DERIVATION_VERSION =
  "ai_value_contribution_alignment_diagnostics_evidence_packet_2026_06";

const READY_STATE = "DIAGNOSTICS_EVIDENCE_PACKET_READY_FOR_PROMOTION_DECISION_REVIEW";
const HOLD_STATE = "HOLD_FOR_DIAGNOSTICS_EVIDENCE_SOURCE";
const REJECT_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";

const PACKET_CLASS = "diagnostics_evidence_packet_only";
const PACKET_VERSION = "diagnostics_evidence_packet_2026_06";
const READY_NEXT_STEP = "bayesian_promotion_decision_gate_only";
const HELD_NEXT_STEP = "complete_diagnostics_evidence_source";
const REQUIRED_RUNTIME_STATE =
  "INTERNAL_BAYESIAN_FIXTURE_EXECUTION_PROTOTYPE_HELD_FOR_REVIEW";
const REQUIRED_RUNTIME_CLASS = "internal_fixture_prototype_only";
const WEIGHT_PROVENANCE_VERSION = "internal_structural_equal_weights_2026_06";
const DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_2026_06";
const DIAGNOSTICS_SUFFICIENCY_EVIDENCE_STATE =
  "DIAGNOSTICS_SUFFICIENCY_EVIDENCE_GOVERNED_INTERNAL_ONLY";
const DIAGNOSTICS_SUFFICIENCY_EVIDENCE_CLASS =
  "diagnostics_sufficiency_evidence_only";
const DIAGNOSTICS_SUFFICIENCY_EVIDENCE_VERSION =
  "diagnostics_sufficiency_evidence_2026_06";
const GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE_READY_STATE =
  "GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE_READY_FOR_PACKET_REVIEW";
const GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE_NEXT_STEP =
  "diagnostics_evidence_packet_update_only";

const TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "packet_id",
  "packet_state",
  "packet_class",
  "generated_at",
  "derivation_version",
  "source_bound",
  "source_runtime_ref",
  "source_governed_diagnostics_sufficiency_evidence_source_ref",
  "source_diagnostics_sufficiency_evidence_ref",
  "packet_version",
  "packet_policy",
  "data_adequacy_evidence",
  "suppressed_missing_held_window_review",
  "comparison_design_evidence",
  "model_diagnostics_evidence",
  "feature_weight_provenance",
  "evidence_sufficiency",
  "promotion_boundary",
  "allowed_next_step",
  "blocked_uses",
  "required_caveats",
  "feeds",
  "boundary_policy",
  "validation_summary",
  "packet_hash"
]);

const SOURCE_RUNTIME_REF_FIELDS = [
  "schema_version",
  "runtime_id",
  "runtime_state",
  "runtime_execution_class",
  "runtime_version",
  "runtime_hash"
];

const SOURCE_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_REF_FIELDS = [
  "schema_version",
  "evidence_state",
  "evidence_class",
  "evidence_hash"
];

const SOURCE_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE_REF_FIELDS = [
  "schema_version",
  "source_id",
  "source_state",
  "allowed_next_step",
  "evidence_hash",
  "projected_evidence_hash"
];

const PACKET_POLICY_FIELDS = [
  "internal_only",
  "aggregate_only",
  "evidence_packet_only",
  "promotion_authorized",
  "posterior_interpretation_authorized",
  "posterior_output_authorized",
  "confidence_output_authorized",
  "probability_output_authorized",
  "customer_output_authorized",
  "economic_output_authorized",
  "roi_output_authorized",
  "productivity_output_authorized",
  "causality_output_authorized",
  "finance_output_authorized"
];

const DATA_ADEQUACY_FIELDS = [
  "minimum_eligible_aggregate_windows_present",
  "pre_post_window_sufficiency_present",
  "treatment_comparison_available",
  "suppression_status_respected",
  "raw_row_count_zero",
  "identifier_count_zero",
  "query_text_absent",
  "data_adequacy_satisfied",
  "source_evidence_hash"
];

const WINDOW_REVIEW_FIELDS = [
  "missing_window_count_zero",
  "suppressed_window_count_zero",
  "held_window_count_zero",
  "suppressed_missing_held_windows_clear",
  "source_evidence_hash"
];

const COMPARISON_DESIGN_FIELDS = [
  "aggregate_measurement_cell_grain",
  "treatment_group_defined",
  "comparison_group_defined",
  "no_person_level_fields",
  "no_unsupported_cross_slice_aggregation",
  "comparison_design_review_present",
  "comparison_design_adequacy_satisfied",
  "causal_claim_authorized",
  "source_evidence_ref",
  "reviewed_source_evidence_hash",
  "source_evidence_hash"
];

const MODEL_DIAGNOSTICS_FIELDS = [
  "convergence_diagnostics",
  "posterior_predictive_checks",
  "prior_sensitivity",
  "residual_fit_checks",
  "calibration_backtest",
  "all_required_model_diagnostics_represented",
  "all_required_model_diagnostics_satisfied"
];

const DIAGNOSTIC_DETAIL_FIELDS = [
  "required",
  "evidence_present",
  "evidence_satisfied",
  "source_evidence_ref",
  "reviewed_source_evidence_hash",
  "source_evidence_hash"
];

const FEATURE_WEIGHT_FIELDS = [
  "weights_structural_internal_only",
  "weights_not_confidence_scores",
  "weight_provenance_version_present",
  "weight_provenance_version",
  "customer_facing_weight_output",
  "source_evidence_hash"
];

const EVIDENCE_SUFFICIENCY_FIELDS = [
  "data_adequacy_satisfied",
  "suppressed_missing_held_windows_clear",
  "comparison_design_adequacy_satisfied",
  "model_diagnostics_satisfied",
  "feature_weight_provenance_satisfied",
  "all_required_evidence_represented",
  "all_required_evidence_satisfied"
];

const PROMOTION_BOUNDARY_FIELDS = [
  "promotion_authorized",
  "promotion_blocked",
  "posterior_interpretation_authorized",
  "confidence_probability_authorized",
  "customer_economic_output_authorized",
  "internal_bayesian_execution_artifact_v1_authorized"
];

const FEED_FIELDS = [
  "bayesian_promotion_decision_gate",
  "internal_diagnostics_model_adequacy_review",
  "internal_bayesian_execution_artifact_v1",
  "posterior_interpretation",
  "posterior_output",
  "confidence_output",
  "probability_output",
  "score_like_output",
  "customer_facing_output",
  "economic_output",
  "roi_output",
  "finance_output",
  "causality_output",
  "productivity_output",
  "route_creation",
  "ui_creation",
  "schema_creation",
  "persistence_write",
  "export_creation",
  "live_connector_execution"
];

const BOUNDARY_POLICY_FIELDS = [
  "receives_internal_bayesian_fixture_runtime_only",
  "receives_aggregate_measurement_cell_windows",
  "receives_diagnostic_evidence_refs",
  "receives_raw_rows",
  "receives_query_text",
  "receives_identifiers",
  "persists_packet",
  "creates_routes",
  "creates_ui",
  "creates_schemas",
  "creates_exports",
  "runs_live_connectors",
  "emits_posterior_output",
  "emits_confidence_output",
  "emits_probability",
  "emits_customer_facing_output",
  "emits_economic_output",
  "computes_roi",
  "claims_causality",
  "measures_productivity"
];

const ALLOWED_INPUT_FIELDS = new Set([
  "source_runtime",
  "source_diagnostics_sufficiency_evidence",
  "generated_at"
]);

const REQUIRED_BLOCKED_USES = [
  "promotion_authorization",
  "internal_bayesian_execution_artifact_v1_creation",
  "posterior_interpretation",
  "posterior_output",
  "confidence_output",
  "probability_output",
  "score_like_output",
  "customer_facing_output",
  "economic_output",
  "finance_output",
  "roi",
  "causality_claim",
  "productivity_measurement",
  "route_creation",
  "ui_creation",
  "schema_creation",
  "persistence_write",
  "export_creation",
  "live_connector_execution",
  "raw_data_storage"
];

const REQUIRED_CAVEATS = [
  "Diagnostics Evidence Packet is internal-only and aggregate-only.",
  "The packet represents diagnostics and comparison-design evidence; it does not fabricate model adequacy.",
  "The packet may feed promotion-decision review but cannot authorize promotion by itself.",
  "Confidence, probability, customer-facing, economic, ROI, finance, causality, productivity, live connector, route, UI, schema, export, and persistence behavior remains blocked."
];

const FORBIDDEN_KEY_PATTERNS = [
  /raw_?rows?/i,
  /^rows$/i,
  /^records$/i,
  /query_?text/i,
  /\bsql\b/i,
  /prompt/i,
  /response/i,
  /transcript/i,
  /user_?id/i,
  /employee/i,
  /person_?id/i,
  /^email$/i,
  /payload_?json/i,
  /feature_?table/i,
  /warehouse/i,
  /dataset/i,
  /dashboard/i
];

const FORBIDDEN_VALUE_PATTERNS = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /\bselect\b[\s\S]+\bfrom\b/i,
  /\bsql\b/i,
  /\bbquxjob_/i,
  /https?:\/\//i,
  /secret:\/\//i,
  /raw[_-\s]?rows?/i,
  /query[_-\s]?text/i,
  /payload_json/i,
  /feature[_-\s]?table/i,
  /warehouse/i,
  /dataset/i,
  /dashboard/i,
  /customer[-_\s]?facing/i,
  /\broi\b/i,
  /finance[_-\s]?(?:output|claim|result|ready)/i,
  /financial[_-\s]?(?:output|attribution)/i,
  /causal(?:ity)?/i,
  /\bcaused\b/i,
  /\bproductivity\b/i
];

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256Json(value) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function clone(value) {
  if (value === undefined || value === null) return null;
  return JSON.parse(JSON.stringify(value));
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function falseMap(keys) {
  return Object.fromEntries(keys.map((key) => [key, false]));
}

function sanitizeGaps(gaps) {
  return [...new Set(gaps.filter(Boolean))].sort();
}

function safeId(value, prefix) {
  return typeof value === "string" && new RegExp(`^${prefix}_[0-9a-f]{16}$`).test(value)
    ? value
    : null;
}

function safeHash(value) {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value) ? value : null;
}

function sourceRuntimeFromInput(input) {
  const record = asRecord(input);
  return record.source_runtime ?? input;
}

function sourceDiagnosticsSufficiencyEvidenceFromInput(input) {
  return buildContributionAlignmentDiagnosticsSufficiencyEvidenceFromGovernedSource(
    sourceGovernedDiagnosticsSufficiencyEvidenceSourceFromInput(input)
  );
}

function sourceGovernedDiagnosticsSufficiencyEvidenceSourceFromInput(input) {
  return asRecord(input).source_diagnostics_sufficiency_evidence ?? null;
}

function inputBoundaryGaps(input) {
  const record = asRecord(input);
  if (!Object.prototype.hasOwnProperty.call(record, "source_runtime")) return [];
  const sidecar = Object.fromEntries(
    Object.entries(record).filter(([key]) => !ALLOWED_INPUT_FIELDS.has(key))
  );
  return Object.keys(sidecar).length > 0
    ? ["input wrapper rejected unsafe or unsupported content"]
    : [];
}

function artifactHash(artifact) {
  const withoutHash = clone(artifact);
  delete withoutHash.artifact_hash;
  return sha256Json(withoutHash);
}

function sourceRuntimeRef(sourceRuntime) {
  return {
    schema_version:
      sourceRuntime?.schema_version ===
      CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_RUNTIME_SCHEMA_VERSION
        ? sourceRuntime.schema_version
        : null,
    runtime_id: safeId(
      sourceRuntime?.runtime_id,
      "contribution_alignment_internal_bayesian_execution_runtime"
    ),
    runtime_state:
      sourceRuntime?.runtime_state === REQUIRED_RUNTIME_STATE
        ? sourceRuntime.runtime_state
        : null,
    runtime_execution_class:
      sourceRuntime?.runtime_execution_class === REQUIRED_RUNTIME_CLASS
        ? sourceRuntime.runtime_execution_class
        : null,
    runtime_version:
      sourceRuntime?.runtime_version === "internal_bayesian_execution_runtime_2026_06"
        ? sourceRuntime.runtime_version
        : null,
    runtime_hash: safeHash(sourceRuntime?.runtime_hash)
  };
}

function sourceDiagnosticsSufficiencyEvidenceRef(evidence) {
  const source = asRecord(evidence);
  return {
    schema_version:
      source.schema_version === DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SCHEMA_VERSION
        ? source.schema_version
        : null,
    evidence_state:
      source.evidence_state === DIAGNOSTICS_SUFFICIENCY_EVIDENCE_STATE
        ? source.evidence_state
        : null,
    evidence_class:
      source.evidence_class === DIAGNOSTICS_SUFFICIENCY_EVIDENCE_CLASS
        ? source.evidence_class
        : null,
    evidence_hash: safeHash(source.evidence_hash)
  };
}

function sourceGovernedDiagnosticsSufficiencyEvidenceSourceRef(source, projectedEvidence) {
  const record = asRecord(source);
  return {
    schema_version:
      record.schema_version ===
      CONTRIBUTION_ALIGNMENT_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE_SCHEMA_VERSION
        ? record.schema_version
        : null,
    source_id: safeId(
      record.source_id,
      "contribution_alignment_governed_diagnostics_sufficiency_evidence_source"
    ),
    source_state:
      record.source_state === GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE_READY_STATE
        ? record.source_state
        : null,
    allowed_next_step:
      record.allowed_next_step === GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE_NEXT_STEP
        ? record.allowed_next_step
        : null,
    evidence_hash: safeHash(record.evidence_hash),
    projected_evidence_hash: safeHash(projectedEvidence?.evidence_hash)
  };
}

function sourceRuntimeGaps(sourceRuntime) {
  const source = asRecord(sourceRuntime);
  const artifact = asRecord(source.internal_fit_artifact);
  const design = asRecord(source.aggregate_design_matrix);
  const gaps = [];
  const runtimeValidation = validateContributionAlignmentInternalBayesianExecutionRuntime(source, {
    allowSelfContainedSourceValidation: true
  });
  if (runtimeValidation.valid !== true) {
    gaps.push("source_runtime failed internal Bayesian execution runtime validation");
    gaps.push(...runtimeValidation.gaps.map((gap) => `source_runtime.${gap}`));
  }
  if (source.schema_version !== CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_RUNTIME_SCHEMA_VERSION) {
    gaps.push("source_runtime.schema_version is invalid");
  }
  if (source.runtime_state !== REQUIRED_RUNTIME_STATE) {
    gaps.push("source_runtime.runtime_state is not contained fixture prototype");
  }
  if (source.runtime_execution_class !== REQUIRED_RUNTIME_CLASS) {
    gaps.push("source_runtime.runtime_execution_class is not fixture prototype only");
  }
  if (source.runtime_hash !== contributionAlignmentInternalBayesianExecutionRuntimeHash(source)) {
    gaps.push("source_runtime hash drifted");
  }
  if (source.source_bound !== true) gaps.push("source_runtime is not source-bound");
  if (source.runtime_policy?.internal_only !== true) {
    gaps.push("source_runtime is not internal-only");
  }
  if (source.runtime_policy?.aggregate_only_runtime !== true) {
    gaps.push("source_runtime is not aggregate-only");
  }
  if (source.validation_summary?.valid !== true) {
    gaps.push("source_runtime validation must be valid");
  }
  for (const [field, expected] of Object.entries({
    window_count: 4,
    required_window_roles_present: true,
    required_comparison_roles_present: true,
    raw_row_count: 0,
    identifier_count: 0,
    query_text_present: false,
    missing_window_count: 0,
    suppressed_window_count: 0,
    held_window_count: 0
  })) {
    if (design[field] !== expected) {
      gaps.push(`source_runtime.aggregate_design_matrix.${field} must be ${expected}`);
    }
  }
  if (typeof design.minimum_cohort_size !== "number" || design.minimum_cohort_size < 5) {
    gaps.push("source_runtime minimum cohort size must satisfy aggregate suppression floor");
  }
  if (artifact.artifact_state !== "INTERNAL_POSTERIOR_CANDIDATE_HELD_FOR_OUTPUT_REVIEW") {
    gaps.push("source_runtime internal fixture artifact is not held");
  }
  if (artifact.artifact_hash !== artifactHash(artifact)) {
    gaps.push("source_runtime internal fixture artifact hash drifted");
  }
  for (const field of [
    "convergence_diagnostics_present",
    "posterior_predictive_checks_present",
    "prior_sensitivity_present",
    "residual_fit_checks_present",
    "comparison_design_adequacy_review_present",
    "calibration_evidence_present"
  ]) {
    if (typeof artifact[field] !== "boolean") {
      gaps.push(`source_runtime internal fixture artifact ${field} must exist`);
    }
  }
  return sanitizeGaps(gaps);
}

function evidenceHash(label, value) {
  return sha256Json({ evidence_label: label, value });
}

function sufficiencyEvidenceHash(evidence) {
  const withoutHash = clone(evidence);
  delete withoutHash.evidence_hash;
  return sha256Json(withoutHash);
}

function diagnosticsEvidenceRef(dimension) {
  return `internal_diagnostics_sufficiency_evidence.${dimension}.2026_06`;
}

function diagnosticsDimensionHash(sourceRuntime, dimension, sourceEvidenceRef, reviewedSourceEvidenceHash) {
  return sha256Json({
    schema_version: DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SCHEMA_VERSION,
    evidence_dimension: dimension,
    source_evidence_ref: sourceEvidenceRef,
    reviewed_source_evidence_hash: reviewedSourceEvidenceHash,
    source_runtime_hash: sourceRuntime?.runtime_hash ?? null,
    source_fixture_artifact_hash: sourceRuntime?.internal_fit_artifact?.artifact_hash ?? null,
    internal_only: true,
    aggregate_only: true,
    evidence_satisfied: true
  });
}

const REQUIRED_SUFFICIENCY_DIMENSIONS = [
  "comparison_design_adequacy",
  "convergence_diagnostics",
  "posterior_predictive_checks",
  "prior_sensitivity",
  "residual_fit_checks",
  "calibration_backtest"
];

function sourceDiagnosticsSufficiencyEvidenceGaps(sourceRuntime, evidence) {
  if (!evidence) return [];
  const source = asRecord(evidence);
  const dimensions = asRecord(source.evidence_dimensions);
  const gaps = [];
  if (source.schema_version !== DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SCHEMA_VERSION) {
    gaps.push("source diagnostics sufficiency evidence schema_version is invalid");
  }
  if (source.evidence_state !== DIAGNOSTICS_SUFFICIENCY_EVIDENCE_STATE) {
    gaps.push("source diagnostics sufficiency evidence state is invalid");
  }
  if (source.evidence_class !== DIAGNOSTICS_SUFFICIENCY_EVIDENCE_CLASS) {
    gaps.push("source diagnostics sufficiency evidence class is invalid");
  }
  if (source.evidence_version !== DIAGNOSTICS_SUFFICIENCY_EVIDENCE_VERSION) {
    gaps.push("source diagnostics sufficiency evidence version is invalid");
  }
  if (source.internal_only !== true) {
    gaps.push("source diagnostics sufficiency evidence must be internal-only");
  }
  if (source.aggregate_only !== true) {
    gaps.push("source diagnostics sufficiency evidence must be aggregate-only");
  }
  if (source.source_runtime_ref?.runtime_hash !== sourceRuntime?.runtime_hash) {
    gaps.push("source diagnostics sufficiency evidence runtime hash must match source runtime");
  }
  if (
    source.source_runtime_ref?.fixture_artifact_hash !==
    sourceRuntime?.internal_fit_artifact?.artifact_hash
  ) {
    gaps.push("source diagnostics sufficiency evidence fixture artifact hash must match source runtime");
  }
  for (const field of [
    "promotion_authorized",
    "posterior_interpretation_authorized",
    "confidence_output_authorized",
    "probability_output_authorized",
    "customer_output_authorized",
    "economic_output_authorized",
    "roi_output_authorized",
    "productivity_output_authorized",
    "causality_output_authorized",
    "finance_output_authorized"
  ]) {
    if (source[field] !== false) {
      gaps.push(`source diagnostics sufficiency evidence ${field} must be false`);
    }
  }
  for (const dimension of REQUIRED_SUFFICIENCY_DIMENSIONS) {
    const detail = asRecord(dimensions[dimension]);
    const expectedRef = diagnosticsEvidenceRef(dimension);
    if (detail.evidence_satisfied !== true) {
      gaps.push(`source diagnostics sufficiency evidence ${dimension} must be satisfied`);
    }
    if (detail.source_evidence_ref !== expectedRef) {
      gaps.push(`source diagnostics sufficiency evidence ${dimension} source_evidence_ref is invalid`);
    }
    if (safeHash(detail.reviewed_source_evidence_hash) === null) {
      gaps.push(`source diagnostics sufficiency evidence ${dimension} reviewed_source_evidence_hash is required`);
    }
    if (
      detail.source_evidence_hash !==
      diagnosticsDimensionHash(
        sourceRuntime,
        dimension,
        expectedRef,
        detail.reviewed_source_evidence_hash
      )
    ) {
      gaps.push(`source diagnostics sufficiency evidence ${dimension} source_evidence_hash is invalid`);
    }
  }
  if (source.evidence_hash !== sufficiencyEvidenceHash(source)) {
    gaps.push("source diagnostics sufficiency evidence hash drifted");
  }
  return sanitizeGaps(gaps);
}

function sourceGovernedDiagnosticsSufficiencyEvidenceSourceGaps(sourceRuntime, source, projectedEvidence) {
  if (!source) return ["governed diagnostics sufficiency evidence source is required"];
  const record = asRecord(source);
  const gaps = [];
  const hasGovernedSourceSchema =
    record.schema_version ===
    CONTRIBUTION_ALIGNMENT_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE_SCHEMA_VERSION;
  if (
    !hasGovernedSourceSchema
  ) {
    gaps.push("governed diagnostics sufficiency evidence source schema_version is invalid");
  }
  if (record.source_state !== GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE_READY_STATE) {
    gaps.push("governed diagnostics sufficiency evidence source is not ready for packet review");
  }
  if (record.allowed_next_step !== GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE_NEXT_STEP) {
    gaps.push("governed diagnostics sufficiency evidence source allowed_next_step is invalid");
  }
  if (record.evidence_hash !== contributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceHash(record)) {
    gaps.push("governed diagnostics sufficiency evidence source hash drifted");
  }
  if (record.source_runtime_ref?.runtime_hash !== sourceRuntime?.runtime_hash) {
    gaps.push("governed diagnostics sufficiency evidence source runtime hash must match source runtime");
  }
  if (
    record.source_runtime_ref?.fixture_artifact_hash !==
    sourceRuntime?.internal_fit_artifact?.artifact_hash
  ) {
    gaps.push("governed diagnostics sufficiency evidence source fixture artifact hash must match source runtime");
  }
  if (!hasGovernedSourceSchema) {
    if (!projectedEvidence) {
      gaps.push("governed diagnostics sufficiency evidence source projection is invalid");
    }
    return sanitizeGaps(gaps);
  }
  const governedDimensions = asRecord(record.evidence_dimensions);
  for (const dimension of [
    ...REQUIRED_SUFFICIENCY_DIMENSIONS,
    "feature_weight_provenance"
  ]) {
    const detail = asRecord(governedDimensions[dimension]);
    if (detail.evidence_satisfied !== true) {
      gaps.push(`governed diagnostics sufficiency evidence source ${dimension} must be satisfied`);
    }
    if (safeHash(detail.source_evidence_hash) === null) {
      gaps.push(`governed diagnostics sufficiency evidence source ${dimension} source_evidence_hash is required`);
    }
    if (safeHash(detail.reviewed_source_evidence_hash) === null) {
      gaps.push(`governed diagnostics sufficiency evidence source ${dimension} reviewed_source_evidence_hash is required`);
    }
  }
  const sourcePolicy = asRecord(record.source_policy);
  for (const field of [
    "promotion_authorized",
    "posterior_interpretation_authorized",
    "posterior_output_authorized",
    "confidence_output_authorized",
    "probability_output_authorized",
    "customer_output_authorized",
    "economic_output_authorized",
    "roi_output_authorized",
    "productivity_output_authorized",
    "causality_output_authorized",
    "finance_output_authorized"
  ]) {
    if (sourcePolicy[field] !== false) {
      gaps.push(`governed diagnostics sufficiency evidence source ${field} must be false`);
    }
  }
  if (sourcePolicy.internal_only !== true) {
    gaps.push("governed diagnostics sufficiency evidence source must be internal-only");
  }
  if (sourcePolicy.aggregate_only !== true) {
    gaps.push("governed diagnostics sufficiency evidence source must be aggregate-only");
  }
  const promotion = asRecord(record.promotion_boundary);
  for (const field of [
    "promotion_authorized",
    "posterior_interpretation_authorized",
    "confidence_probability_authorized",
    "customer_economic_output_authorized",
    "internal_bayesian_execution_artifact_v1_authorized"
  ]) {
    if (promotion[field] !== false) {
      gaps.push(`governed diagnostics sufficiency evidence source promotion_boundary.${field} must be false`);
    }
  }
  if (record.feeds?.diagnostics_evidence_packet !== true) {
    gaps.push("governed diagnostics sufficiency evidence source must feed diagnostics evidence packet only");
  }
  for (const [field, value] of Object.entries(asRecord(record.feeds))) {
    if (field !== "diagnostics_evidence_packet" && value !== false) {
      gaps.push(`governed diagnostics sufficiency evidence source feeds.${field} must be false`);
    }
  }
  if (!projectedEvidence) {
    gaps.push("governed diagnostics sufficiency evidence source projection is invalid");
  }
  return sanitizeGaps(gaps);
}

function validSufficiencyEvidence(sourceRuntime, evidence) {
  return Boolean(evidence) && sourceDiagnosticsSufficiencyEvidenceGaps(sourceRuntime, evidence).length === 0;
}

function sufficiencyDimension(evidence, dimension) {
  return asRecord(asRecord(evidence).evidence_dimensions)[dimension] ?? null;
}

function buildDataAdequacyEvidence(sourceRuntime, ready) {
  const design = asRecord(sourceRuntime?.aggregate_design_matrix);
  const evidence = {
    minimum_eligible_aggregate_windows_present: ready && design.window_count === 4,
    pre_post_window_sufficiency_present: ready && design.required_window_roles_present === true,
    treatment_comparison_available: ready && design.required_comparison_roles_present === true,
    suppression_status_respected:
      ready && typeof design.minimum_cohort_size === "number" && design.minimum_cohort_size >= 5,
    raw_row_count_zero: ready && design.raw_row_count === 0,
    identifier_count_zero: ready && design.identifier_count === 0,
    query_text_absent: ready && design.query_text_present === false
  };
  evidence.data_adequacy_satisfied = Object.values(evidence).every(Boolean);
  evidence.source_evidence_hash = ready ? evidenceHash("data_adequacy", evidence) : null;
  return evidence;
}

function buildWindowReview(sourceRuntime, ready) {
  const design = asRecord(sourceRuntime?.aggregate_design_matrix);
  const evidence = {
    missing_window_count_zero: ready && design.missing_window_count === 0,
    suppressed_window_count_zero: ready && design.suppressed_window_count === 0,
    held_window_count_zero: ready && design.held_window_count === 0
  };
  evidence.suppressed_missing_held_windows_clear = Object.values(evidence).every(Boolean);
  evidence.source_evidence_hash = ready ? evidenceHash("suppressed_missing_held_window_review", evidence) : null;
  return evidence;
}

function diagnosticDetail(sourceRuntime, sourceEvidence, dimension, ready, evidenceReady) {
  const evidence = asRecord(sufficiencyDimension(sourceEvidence, dimension));
  const evidencePresent = ready && evidenceReady;
  return {
    required: true,
    evidence_present: evidencePresent,
    evidence_satisfied: evidencePresent,
    source_evidence_ref: evidencePresent ? evidence.source_evidence_ref : null,
    reviewed_source_evidence_hash: evidencePresent ? evidence.reviewed_source_evidence_hash : null,
    source_evidence_hash: evidencePresent
      ? diagnosticsDimensionHash(
          sourceRuntime,
          dimension,
          evidence.source_evidence_ref,
          evidence.reviewed_source_evidence_hash
        )
      : null
  };
}

function buildModelDiagnosticsEvidence(sourceRuntime, sourceEvidence, ready, evidenceReady) {
  const diagnostics = {
    convergence_diagnostics: diagnosticDetail(
      sourceRuntime,
      sourceEvidence,
      "convergence_diagnostics",
      ready,
      evidenceReady
    ),
    posterior_predictive_checks: diagnosticDetail(
      sourceRuntime,
      sourceEvidence,
      "posterior_predictive_checks",
      ready,
      evidenceReady
    ),
    prior_sensitivity: diagnosticDetail(
      sourceRuntime,
      sourceEvidence,
      "prior_sensitivity",
      ready,
      evidenceReady
    ),
    residual_fit_checks: diagnosticDetail(
      sourceRuntime,
      sourceEvidence,
      "residual_fit_checks",
      ready,
      evidenceReady
    ),
    calibration_backtest: diagnosticDetail(
      sourceRuntime,
      sourceEvidence,
      "calibration_backtest",
      ready,
      evidenceReady
    )
  };
  diagnostics.all_required_model_diagnostics_represented = ready;
  diagnostics.all_required_model_diagnostics_satisfied = [
    diagnostics.convergence_diagnostics,
    diagnostics.posterior_predictive_checks,
    diagnostics.prior_sensitivity,
    diagnostics.residual_fit_checks,
    diagnostics.calibration_backtest
  ].every((item) => item.evidence_satisfied === true);
  return diagnostics;
}

function buildComparisonDesignEvidence(sourceRuntime, sourceEvidence, ready, evidenceReady) {
  const sourceEvidenceDimension = asRecord(
    sufficiencyDimension(sourceEvidence, "comparison_design_adequacy")
  );
  const evidence = {
    aggregate_measurement_cell_grain:
      ready && sourceRuntime?.model_equation?.unit_of_analysis === "aggregate_measurement_cell_window",
    treatment_group_defined: ready,
    comparison_group_defined: ready,
    no_person_level_fields: ready,
    no_unsupported_cross_slice_aggregation: ready,
    comparison_design_review_present: ready && evidenceReady,
    comparison_design_adequacy_satisfied: ready && evidenceReady,
    causal_claim_authorized: false
  };
  return {
    ...evidence,
    source_evidence_ref: evidence.comparison_design_review_present
      ? sourceEvidenceDimension.source_evidence_ref
      : null,
    reviewed_source_evidence_hash: evidence.comparison_design_review_present
      ? sourceEvidenceDimension.reviewed_source_evidence_hash
      : null,
    source_evidence_hash: evidence.comparison_design_review_present
      ? diagnosticsDimensionHash(
          sourceRuntime,
          "comparison_design_adequacy",
          sourceEvidenceDimension.source_evidence_ref,
          sourceEvidenceDimension.reviewed_source_evidence_hash
        )
      : null
  };
}

function buildFeatureWeightProvenance(sourceRuntime, ready) {
  const evidence = {
    weights_structural_internal_only: ready,
    weights_not_confidence_scores: true,
    weight_provenance_version_present: true,
    weight_provenance_version: WEIGHT_PROVENANCE_VERSION,
    customer_facing_weight_output: false
  };
  evidence.source_evidence_hash = ready ? evidenceHash("feature_weight_provenance", evidence) : null;
  return evidence;
}

function buildEvidenceSufficiency(packet) {
  return {
    data_adequacy_satisfied:
      packet.data_adequacy_evidence.data_adequacy_satisfied === true,
    suppressed_missing_held_windows_clear:
      packet.suppressed_missing_held_window_review.suppressed_missing_held_windows_clear === true,
    comparison_design_adequacy_satisfied:
      packet.comparison_design_evidence.comparison_design_adequacy_satisfied === true,
    model_diagnostics_satisfied:
      packet.model_diagnostics_evidence.all_required_model_diagnostics_satisfied === true,
    feature_weight_provenance_satisfied:
      packet.feature_weight_provenance.weights_structural_internal_only === true &&
      packet.feature_weight_provenance.weights_not_confidence_scores === true &&
      packet.feature_weight_provenance.weight_provenance_version_present === true &&
      packet.feature_weight_provenance.customer_facing_weight_output === false,
    all_required_evidence_represented:
      packet.model_diagnostics_evidence.all_required_model_diagnostics_represented === true,
    all_required_evidence_satisfied: false
  };
}

function addAllEvidenceSatisfied(evidence) {
  return {
    ...evidence,
    all_required_evidence_satisfied:
      evidence.data_adequacy_satisfied === true &&
      evidence.suppressed_missing_held_windows_clear === true &&
      evidence.comparison_design_adequacy_satisfied === true &&
      evidence.model_diagnostics_satisfied === true &&
      evidence.feature_weight_provenance_satisfied === true
  };
}

function buildPacket(
  sourceRuntime,
  sourceGovernedDiagnosticsSufficiencyEvidenceSource,
  sourceDiagnosticsSufficiencyEvidence,
  state,
  gaps
) {
  const ready = state === READY_STATE;
  const evidenceReady = validSufficiencyEvidence(
    sourceRuntime,
    sourceDiagnosticsSufficiencyEvidence
  );
  const packet = {
    schema_version: CONTRIBUTION_ALIGNMENT_DIAGNOSTICS_EVIDENCE_PACKET_SCHEMA_VERSION,
    packet_id: `contribution_alignment_diagnostics_evidence_packet_${sha256Json({
      runtime_id: sourceRuntime?.runtime_id ?? null,
      runtime_hash: sourceRuntime?.runtime_hash ?? null,
      artifact_hash: sourceRuntime?.internal_fit_artifact?.artifact_hash ?? null,
      packet_version: PACKET_VERSION
    }).slice(0, 16)}`,
    packet_state: state,
    packet_class: ready ? PACKET_CLASS : null,
    generated_at: "2026-06-25T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    source_bound: ready,
    source_runtime_ref: sourceRuntimeRef(sourceRuntime),
    source_governed_diagnostics_sufficiency_evidence_source_ref:
      sourceGovernedDiagnosticsSufficiencyEvidenceSourceRef(
        sourceGovernedDiagnosticsSufficiencyEvidenceSource,
        sourceDiagnosticsSufficiencyEvidence
      ),
    source_diagnostics_sufficiency_evidence_ref:
      sourceDiagnosticsSufficiencyEvidenceRef(sourceDiagnosticsSufficiencyEvidence),
    packet_version: ready ? PACKET_VERSION : null,
    packet_policy: {
      internal_only: true,
      aggregate_only: ready,
      evidence_packet_only: true,
      promotion_authorized: false,
      posterior_interpretation_authorized: false,
      posterior_output_authorized: false,
      confidence_output_authorized: false,
      probability_output_authorized: false,
      customer_output_authorized: false,
      economic_output_authorized: false,
      roi_output_authorized: false,
      productivity_output_authorized: false,
      causality_output_authorized: false,
      finance_output_authorized: false
    },
    data_adequacy_evidence: buildDataAdequacyEvidence(sourceRuntime, ready),
    suppressed_missing_held_window_review: buildWindowReview(sourceRuntime, ready),
    comparison_design_evidence: buildComparisonDesignEvidence(
      sourceRuntime,
      sourceDiagnosticsSufficiencyEvidence,
      ready,
      evidenceReady
    ),
    model_diagnostics_evidence: buildModelDiagnosticsEvidence(
      sourceRuntime,
      sourceDiagnosticsSufficiencyEvidence,
      ready,
      evidenceReady
    ),
    feature_weight_provenance: buildFeatureWeightProvenance(sourceRuntime, ready),
    evidence_sufficiency: null,
    promotion_boundary: {
      promotion_authorized: false,
      promotion_blocked: true,
      posterior_interpretation_authorized: false,
      confidence_probability_authorized: false,
      customer_economic_output_authorized: false,
      internal_bayesian_execution_artifact_v1_authorized: false
    },
    allowed_next_step: ready ? READY_NEXT_STEP : HELD_NEXT_STEP,
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    required_caveats: [...REQUIRED_CAVEATS],
    feeds: {
      bayesian_promotion_decision_gate: ready,
      internal_diagnostics_model_adequacy_review: ready,
      ...falseMap(
        FEED_FIELDS.filter((field) =>
          !["bayesian_promotion_decision_gate", "internal_diagnostics_model_adequacy_review"].includes(field)
        )
      )
    },
    boundary_policy: {
      receives_internal_bayesian_fixture_runtime_only: state !== REJECT_STATE,
      receives_aggregate_measurement_cell_windows: state !== REJECT_STATE,
      receives_diagnostic_evidence_refs: ready,
      ...falseMap(
        BOUNDARY_POLICY_FIELDS.filter((field) =>
          ![
            "receives_internal_bayesian_fixture_runtime_only",
            "receives_aggregate_measurement_cell_windows",
            "receives_diagnostic_evidence_refs"
          ].includes(field)
        )
      )
    },
    validation_summary: {
      schema_version: `${CONTRIBUTION_ALIGNMENT_DIAGNOSTICS_EVIDENCE_PACKET_SCHEMA_VERSION}_SUMMARY`,
      valid: ready,
      packet_state: state,
      gaps: ready ? [] : sanitizeGaps(gaps)
    }
  };
  packet.evidence_sufficiency = addAllEvidenceSatisfied(buildEvidenceSufficiency(packet));
  packet.packet_hash = contributionAlignmentDiagnosticsEvidencePacketHash(packet);
  return packet;
}

function rejectedPacket() {
  const packet = {
    schema_version: CONTRIBUTION_ALIGNMENT_DIAGNOSTICS_EVIDENCE_PACKET_SCHEMA_VERSION,
    packet_id: null,
    packet_state: REJECT_STATE,
    generated_at: "2026-06-25T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    source_bound: false,
    promotion_boundary: {
      promotion_authorized: false,
      promotion_blocked: true,
      posterior_interpretation_authorized: false,
      confidence_probability_authorized: false,
      customer_economic_output_authorized: false,
      internal_bayesian_execution_artifact_v1_authorized: false
    },
    validation_summary: {
      schema_version: `${CONTRIBUTION_ALIGNMENT_DIAGNOSTICS_EVIDENCE_PACKET_SCHEMA_VERSION}_SUMMARY`,
      valid: false,
      packet_state: REJECT_STATE,
      gaps: ["boundary leakage rejected"]
    }
  };
  packet.packet_hash = contributionAlignmentDiagnosticsEvidencePacketHash(packet);
  return packet;
}

export function contributionAlignmentDiagnosticsEvidencePacketHash(packet) {
  const withoutHash = clone(packet);
  delete withoutHash.packet_hash;
  return sha256Json(withoutHash);
}

export function buildContributionAlignmentDiagnosticsEvidencePacketFromObject(input) {
  const wrapperGaps = inputBoundaryGaps(input);
  if (wrapperGaps.length > 0) return rejectedPacket();
  const sourceRuntime = sourceRuntimeFromInput(input);
  const sourceGovernedDiagnosticsSufficiencyEvidenceSource =
    sourceGovernedDiagnosticsSufficiencyEvidenceSourceFromInput(input);
  const sourceDiagnosticsSufficiencyEvidence =
    sourceDiagnosticsSufficiencyEvidenceFromInput(input);
  const sourceGaps = sanitizeGaps([
    ...sourceRuntimeGaps(sourceRuntime),
    ...sourceGovernedDiagnosticsSufficiencyEvidenceSourceGaps(
      sourceRuntime,
      sourceGovernedDiagnosticsSufficiencyEvidenceSource,
      sourceDiagnosticsSufficiencyEvidence
    ),
    ...sourceDiagnosticsSufficiencyEvidenceGaps(
      sourceRuntime,
      sourceDiagnosticsSufficiencyEvidence
    )
  ]);
  const state = sourceGaps.length === 0 ? READY_STATE : HOLD_STATE;
  return buildPacket(
    sourceRuntime,
    sourceGovernedDiagnosticsSufficiencyEvidenceSource,
    sourceDiagnosticsSufficiencyEvidence,
    state,
    sourceGaps
  );
}

function collectAllowedFieldsGaps(record, fields, label) {
  return Object.keys(asRecord(record))
    .filter((key) => !fields.has(key))
    .map(() => `${label} contains ungoverned field`);
}

function collectRefGaps(record, fields, label) {
  const ref = asRecord(record);
  const gaps = [];
  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(ref, field)) gaps.push(`${label}.${field} is required`);
  }
  gaps.push(...collectAllowedFieldsGaps(ref, new Set(fields), label));
  return gaps;
}

function hasForbiddenContent(value, path = "packet") {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => hasForbiddenContent(item, `${path}[${index}]`));
  }
  if (value && typeof value === "object") {
    const gaps = [];
    for (const [key, nested] of Object.entries(value)) {
      const safeField =
        (path === "packet.packet_policy" && PACKET_POLICY_FIELDS.includes(key)) ||
        (path === "packet.data_adequacy_evidence" && DATA_ADEQUACY_FIELDS.includes(key)) ||
        (path === "packet.suppressed_missing_held_window_review" && WINDOW_REVIEW_FIELDS.includes(key)) ||
        (path === "packet.comparison_design_evidence" && COMPARISON_DESIGN_FIELDS.includes(key)) ||
        (path === "packet.model_diagnostics_evidence" && MODEL_DIAGNOSTICS_FIELDS.includes(key)) ||
        (path.startsWith("packet.model_diagnostics_evidence.") && DIAGNOSTIC_DETAIL_FIELDS.includes(key)) ||
        (path === "packet.feature_weight_provenance" && FEATURE_WEIGHT_FIELDS.includes(key)) ||
        (path === "packet.evidence_sufficiency" && EVIDENCE_SUFFICIENCY_FIELDS.includes(key)) ||
        (path === "packet.promotion_boundary" && PROMOTION_BOUNDARY_FIELDS.includes(key)) ||
        (path === "packet.feeds" && FEED_FIELDS.includes(key)) ||
        (path === "packet.boundary_policy" && BOUNDARY_POLICY_FIELDS.includes(key));
      if (
        !safeField &&
        FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key))
      ) {
        gaps.push("packet contains forbidden field name");
        continue;
      }
      gaps.push(...hasForbiddenContent(nested, `${path}.${key}`));
    }
    return gaps;
  }
  if (typeof value !== "string") return [];
  if (
    path.startsWith("packet.blocked_uses[") ||
    path.startsWith("packet.required_caveats[") ||
    path === "packet.feature_weight_provenance.weight_provenance_version"
  ) {
    return [];
  }
  return FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))
    ? [`${path} contains unsafe source or output language`]
    : [];
}

function validateEvidenceAgainstRuntime(
  packet,
  sourceRuntime,
  sourceGovernedDiagnosticsSufficiencyEvidenceSource
) {
  const gaps = [];
  if (!sourceRuntime) return gaps;
  const expectedPacket = buildContributionAlignmentDiagnosticsEvidencePacketFromObject({
    source_runtime: sourceRuntime,
    ...(sourceGovernedDiagnosticsSufficiencyEvidenceSource
      ? {
          source_diagnostics_sufficiency_evidence:
            sourceGovernedDiagnosticsSufficiencyEvidenceSource
        }
      : {})
  });
  const actualWithoutHash = clone(packet);
  const expectedWithoutHash = clone(expectedPacket);
  delete actualWithoutHash.packet_hash;
  delete expectedWithoutHash.packet_hash;
  if (stableStringify(actualWithoutHash) !== stableStringify(expectedWithoutHash)) {
    gaps.push("diagnostics evidence packet does not match bound source runtime");
  }
  return gaps;
}

function validatePacketShape(packet) {
  if (packet?.packet_state === REJECT_STATE) return ["boundary leakage rejected"];
  const record = asRecord(packet);
  const gaps = [];
  const ready = record.packet_state === READY_STATE;
  gaps.push(...collectAllowedFieldsGaps(record, TOP_LEVEL_FIELDS, "packet"));
  if (record.schema_version !== CONTRIBUTION_ALIGNMENT_DIAGNOSTICS_EVIDENCE_PACKET_SCHEMA_VERSION) {
    gaps.push("schema_version is invalid");
  }
  if (![READY_STATE, HOLD_STATE].includes(record.packet_state)) {
    gaps.push("packet_state is invalid");
  }
  if (record.source_bound !== ready) gaps.push(`source_bound must be ${ready}`);
  if (record.packet_class !== (ready ? PACKET_CLASS : null)) {
    gaps.push(`packet_class must be ${ready ? PACKET_CLASS : "null"}`);
  }
  if (record.packet_version !== (ready ? PACKET_VERSION : null)) {
    gaps.push(`packet_version must be ${ready ? PACKET_VERSION : "null"}`);
  }
  if (record.allowed_next_step !== (ready ? READY_NEXT_STEP : HELD_NEXT_STEP)) {
    gaps.push(`allowed_next_step must be ${ready ? READY_NEXT_STEP : HELD_NEXT_STEP}`);
  }
  gaps.push(...collectRefGaps(record.source_runtime_ref, SOURCE_RUNTIME_REF_FIELDS, "source_runtime_ref"));
  gaps.push(...collectRefGaps(
    record.source_governed_diagnostics_sufficiency_evidence_source_ref,
    SOURCE_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE_REF_FIELDS,
    "source_governed_diagnostics_sufficiency_evidence_source_ref"
  ));
  gaps.push(...collectRefGaps(
    record.source_diagnostics_sufficiency_evidence_ref,
    SOURCE_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_REF_FIELDS,
    "source_diagnostics_sufficiency_evidence_ref"
  ));

  const policy = asRecord(record.packet_policy);
  gaps.push(...collectRefGaps(policy, PACKET_POLICY_FIELDS, "packet_policy"));
  for (const [field, expected] of Object.entries({
    internal_only: true,
    aggregate_only: ready,
    evidence_packet_only: true,
    promotion_authorized: false,
    posterior_interpretation_authorized: false,
    posterior_output_authorized: false,
    confidence_output_authorized: false,
    probability_output_authorized: false,
    customer_output_authorized: false,
    economic_output_authorized: false,
    roi_output_authorized: false,
    productivity_output_authorized: false,
    causality_output_authorized: false,
    finance_output_authorized: false
  })) {
    if (policy[field] !== expected) gaps.push(`packet_policy.${field} must be ${expected}`);
  }

  const data = asRecord(record.data_adequacy_evidence);
  gaps.push(...collectRefGaps(data, DATA_ADEQUACY_FIELDS, "data_adequacy_evidence"));
  const windows = asRecord(record.suppressed_missing_held_window_review);
  gaps.push(...collectRefGaps(windows, WINDOW_REVIEW_FIELDS, "suppressed_missing_held_window_review"));
  const comparison = asRecord(record.comparison_design_evidence);
  gaps.push(...collectRefGaps(comparison, COMPARISON_DESIGN_FIELDS, "comparison_design_evidence"));
  if (comparison.causal_claim_authorized !== false) {
    gaps.push("comparison_design_evidence.causal_claim_authorized must be false");
  }
  const diagnostics = asRecord(record.model_diagnostics_evidence);
  gaps.push(...collectRefGaps(diagnostics, MODEL_DIAGNOSTICS_FIELDS, "model_diagnostics_evidence"));
  for (const field of [
    "convergence_diagnostics",
    "posterior_predictive_checks",
    "prior_sensitivity",
    "residual_fit_checks",
    "calibration_backtest"
  ]) {
    gaps.push(...collectRefGaps(asRecord(diagnostics[field]), DIAGNOSTIC_DETAIL_FIELDS, `model_diagnostics_evidence.${field}`));
    if (diagnostics[field]?.required !== true) {
      gaps.push(`model_diagnostics_evidence.${field}.required must be true`);
    }
    if (diagnostics[field]?.evidence_satisfied === true) {
      if (typeof diagnostics[field].source_evidence_ref !== "string") {
        gaps.push(`model_diagnostics_evidence.${field}.source_evidence_ref is required`);
      }
      if (safeHash(diagnostics[field].source_evidence_hash) === null) {
        gaps.push(`model_diagnostics_evidence.${field}.source_evidence_hash is required`);
      }
    }
  }
  const featureWeights = asRecord(record.feature_weight_provenance);
  gaps.push(...collectRefGaps(featureWeights, FEATURE_WEIGHT_FIELDS, "feature_weight_provenance"));
  for (const [field, expected] of Object.entries({
    weights_structural_internal_only: ready,
    weights_not_confidence_scores: true,
    weight_provenance_version_present: true,
    weight_provenance_version: WEIGHT_PROVENANCE_VERSION,
    customer_facing_weight_output: false
  })) {
    if (featureWeights[field] !== expected) gaps.push(`feature_weight_provenance.${field} must be ${expected}`);
  }
  const sufficiency = asRecord(record.evidence_sufficiency);
  gaps.push(...collectRefGaps(sufficiency, EVIDENCE_SUFFICIENCY_FIELDS, "evidence_sufficiency"));
  if (sufficiency.all_required_evidence_satisfied === true && record.promotion_boundary?.promotion_authorized !== false) {
    gaps.push("evidence packet must not authorize promotion");
  }
  if (
    sufficiency.all_required_evidence_satisfied === true &&
    safeHash(record.source_diagnostics_sufficiency_evidence_ref?.evidence_hash) === null
  ) {
    gaps.push("source_diagnostics_sufficiency_evidence_ref.evidence_hash is required when evidence is satisfied");
  }
  const promotion = asRecord(record.promotion_boundary);
  gaps.push(...collectRefGaps(promotion, PROMOTION_BOUNDARY_FIELDS, "promotion_boundary"));
  for (const [field, expected] of Object.entries({
    promotion_authorized: false,
    promotion_blocked: true,
    posterior_interpretation_authorized: false,
    confidence_probability_authorized: false,
    customer_economic_output_authorized: false,
    internal_bayesian_execution_artifact_v1_authorized: false
  })) {
    if (promotion[field] !== expected) gaps.push(`promotion_boundary.${field} must be ${expected}`);
  }
  const feeds = asRecord(record.feeds);
  for (const [field, expected] of Object.entries({
    bayesian_promotion_decision_gate: ready,
    internal_diagnostics_model_adequacy_review: ready
  })) {
    if (feeds[field] !== expected) gaps.push(`feeds.${field} must be ${expected}`);
  }
  for (const field of FEED_FIELDS.filter((field) =>
    !["bayesian_promotion_decision_gate", "internal_diagnostics_model_adequacy_review"].includes(field)
  )) {
    if (feeds[field] !== false) gaps.push(`feeds.${field} must be false`);
  }
  const boundary = asRecord(record.boundary_policy);
  for (const field of BOUNDARY_POLICY_FIELDS) {
    const expected =
      [
        "receives_internal_bayesian_fixture_runtime_only",
        "receives_aggregate_measurement_cell_windows"
      ].includes(field) && record.packet_state !== REJECT_STATE
        ? true
        : field === "receives_diagnostic_evidence_refs" && ready;
    if (boundary[field] !== expected) gaps.push(`boundary_policy.${field} must be ${expected}`);
  }
  if (stableStringify(record.blocked_uses) !== stableStringify(REQUIRED_BLOCKED_USES)) {
    gaps.push("blocked_uses must match governed list");
  }
  if (stableStringify(record.required_caveats) !== stableStringify(REQUIRED_CAVEATS)) {
    gaps.push("required_caveats must match governed list");
  }
  const summary = asRecord(record.validation_summary);
  if (summary.valid !== ready) gaps.push(`validation_summary.valid must be ${ready}`);
  if (summary.packet_state !== record.packet_state) {
    gaps.push("validation_summary.packet_state must match packet_state");
  }
  if (ready && Array.isArray(summary.gaps) && summary.gaps.length !== 0) {
    gaps.push("validation_summary.gaps must be empty for ready packet");
  }
  if (!ready && Array.isArray(summary.gaps)) {
    gaps.push(...summary.gaps);
  }
  if (record.packet_hash !== contributionAlignmentDiagnosticsEvidencePacketHash(record)) {
    gaps.push("packet_hash must match packet body");
  }
  gaps.push(...hasForbiddenContent(record));
  return sanitizeGaps(gaps);
}

export function validateContributionAlignmentDiagnosticsEvidencePacket(packet, options = {}) {
  if (packet?.packet_state === REJECT_STATE) {
    return {
      schema_version: VALIDATION_SCHEMA_VERSION,
      valid: false,
      gaps: ["boundary leakage rejected"]
    };
  }
  const sourceBindingGaps =
    packet?.packet_state === READY_STATE && !options.sourceRuntime
      ? ["sourceRuntime is required for ready diagnostics evidence packet validation"]
      : [];
  const sourceDiagnosticsEvidenceGaps =
    packet?.evidence_sufficiency?.all_required_evidence_satisfied === true &&
    !options.sourceGovernedDiagnosticsSufficiencyEvidenceSource
      ? ["sourceGovernedDiagnosticsSufficiencyEvidenceSource is required for satisfied diagnostics evidence packet validation"]
      : [];
  const sourceGovernedDiagnosticsSufficiencyEvidenceSource =
    options.sourceGovernedDiagnosticsSufficiencyEvidenceSource ?? null;
  const projectedDiagnosticsSufficiencyEvidence =
    buildContributionAlignmentDiagnosticsSufficiencyEvidenceFromGovernedSource(
      sourceGovernedDiagnosticsSufficiencyEvidenceSource
    );
  const gaps = sanitizeGaps([
    ...validatePacketShape(packet),
    ...sourceBindingGaps,
    ...sourceDiagnosticsEvidenceGaps,
    ...validateEvidenceAgainstRuntime(
      packet,
      options.sourceRuntime,
      sourceGovernedDiagnosticsSufficiencyEvidenceSource
    ),
    ...sourceGovernedDiagnosticsSufficiencyEvidenceSourceGaps(
      options.sourceRuntime,
      sourceGovernedDiagnosticsSufficiencyEvidenceSource,
      projectedDiagnosticsSufficiencyEvidence
    ),
    ...sourceDiagnosticsSufficiencyEvidenceGaps(
      options.sourceRuntime,
      projectedDiagnosticsSufficiencyEvidence
    )
  ]);
  return {
    schema_version: VALIDATION_SCHEMA_VERSION,
    valid: gaps.length === 0 && packet?.packet_state === READY_STATE,
    gaps
  };
}

function inputFromCliPath(path) {
  if (path === "-") return JSON.parse(readFileSync(0, "utf8"));
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

function main() {
  const [, , inputPath, sourceDiagnosticsSufficiencyEvidencePath] = process.argv;
  if (!inputPath) {
    console.error(
      "Usage: node scripts/run_ai_value_contribution_alignment_diagnostics_evidence_packet.mjs <internal-bayesian-execution-runtime-json|- for stdin> [governed-diagnostics-sufficiency-evidence-source-json]"
    );
    process.exit(1);
  }
  const sourceRuntime = inputFromCliPath(inputPath);
  const packet = buildContributionAlignmentDiagnosticsEvidencePacketFromObject(
    sourceDiagnosticsSufficiencyEvidencePath
      ? {
          source_runtime: sourceRuntime,
          source_diagnostics_sufficiency_evidence:
            inputFromCliPath(sourceDiagnosticsSufficiencyEvidencePath)
        }
      : sourceRuntime
  );
  process.stdout.write(`${JSON.stringify(packet, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
