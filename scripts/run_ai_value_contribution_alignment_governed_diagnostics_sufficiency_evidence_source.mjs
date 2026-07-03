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
  CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_GATE_SCHEMA_VERSION,
  contributionAlignmentInternalBayesianExecutionGateHash
} from "./run_ai_value_contribution_alignment_internal_bayesian_execution_gate.mjs";

export const CONTRIBUTION_ALIGNMENT_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE_2026_06";

const VALIDATION_SCHEMA_VERSION =
  `${CONTRIBUTION_ALIGNMENT_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE_SCHEMA_VERSION}_VALIDATION`;

const PACKET_SIDE_EVIDENCE_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_2026_06";
const REVIEWED_SOURCE_EVIDENCE_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_REVIEWED_DIAGNOSTICS_SOURCE_EVIDENCE_REFS_2026_06";
const REVIEWED_SOURCE_EVIDENCE_MANIFEST_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_REVIEWED_DIAGNOSTICS_SOURCE_EVIDENCE_MANIFEST_2026_06";
const REVIEWED_SOURCE_EVIDENCE_HASH_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_REVIEWED_DIAGNOSTICS_SOURCE_EVIDENCE_HASH_2026_06";

const DERIVATION_VERSION =
  "ai_value_contribution_alignment_governed_diagnostics_sufficiency_evidence_source_2026_06";

const READY_STATE =
  "GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE_READY_FOR_PACKET_REVIEW";
const HOLD_STATE =
  "HOLD_FOR_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE";
const REJECT_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";

const PACKET_SIDE_EVIDENCE_STATE =
  "DIAGNOSTICS_SUFFICIENCY_EVIDENCE_GOVERNED_INTERNAL_ONLY";
const EVIDENCE_CLASS = "diagnostics_sufficiency_evidence_only";
const EVIDENCE_VERSION = "diagnostics_sufficiency_evidence_2026_06";
const SOURCE_CLASS = "governed_diagnostics_sufficiency_evidence_source_only";
const SOURCE_VERSION = "governed_diagnostics_sufficiency_evidence_source_2026_06";
const READY_NEXT_STEP = "diagnostics_evidence_packet_update_only";
const HELD_NEXT_STEP = "complete_governed_diagnostics_sufficiency_evidence_source";
const REQUIRED_RUNTIME_STATE =
  "INTERNAL_BAYESIAN_FIXTURE_EXECUTION_PROTOTYPE_HELD_FOR_REVIEW";
const REQUIRED_RUNTIME_CLASS = "internal_fixture_prototype_only";
const WEIGHT_PROVENANCE_VERSION = "internal_structural_equal_weights_2026_06";

const REQUIRED_EVIDENCE_DIMENSIONS = [
  "comparison_design_adequacy",
  "convergence_diagnostics",
  "posterior_predictive_checks",
  "prior_sensitivity",
  "residual_fit_checks",
  "calibration_backtest",
  "feature_weight_provenance"
];

const PACKET_CONSUMED_DIMENSIONS = REQUIRED_EVIDENCE_DIMENSIONS.filter(
  (dimension) => dimension !== "feature_weight_provenance"
);

const TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "source_id",
  "source_state",
  "source_class",
  "generated_at",
  "derivation_version",
  "source_bound",
  "source_runtime_ref",
  "evidence_state",
  "evidence_class",
  "evidence_version",
  "source_version",
  "source_policy",
  "evidence_dimensions",
  "feature_weight_provenance",
  "evidence_sufficiency",
  "evidence_readiness_reconciliation",
  "promotion_boundary",
  "allowed_next_step",
  "blocked_uses",
  "required_caveats",
  "feeds",
  "boundary_policy",
  "validation_summary",
  "evidence_hash"
]);

const SOURCE_RUNTIME_REF_FIELDS = [
  "schema_version",
  "runtime_id",
  "runtime_state",
  "runtime_execution_class",
  "runtime_hash",
  "fixture_artifact_hash"
];

const SOURCE_POLICY_FIELDS = [
  "internal_only",
  "aggregate_only",
  "evidence_source_only",
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

const EVIDENCE_DIMENSION_FIELDS = [
  "required",
  "evidence_satisfied",
  "source_evidence_ref",
  "reviewed_source_evidence_hash",
  "source_evidence_hash",
  "aggregate_only_scope",
  "suppressed_missing_held_windows_clear",
  "eligible_for_satisfied_representation",
  "placeholder_evidence",
  "generated_fixture_evidence"
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
  "comparison_design_adequacy_satisfied",
  "convergence_diagnostics_satisfied",
  "posterior_predictive_checks_satisfied",
  "prior_sensitivity_satisfied",
  "residual_fit_checks_satisfied",
  "calibration_backtest_satisfied",
  "feature_weight_provenance_satisfied",
  "all_required_evidence_satisfied"
];

const EVIDENCE_READINESS_RECONCILIATION_FIELDS = [
  "reconciliation_state",
  "governed_reviewed_evidence_supplied",
  "source_runtime_ready",
  "satisfied_dimensions",
  "unsatisfied_dimensions",
  "missing_evidence_by_dimension",
  "holding_reasons"
];

const REVIEWED_EVIDENCE_ENVELOPE_FIELDS = [
  "schema_version",
  "evidence_review_state",
  "internal_only",
  "aggregate_only",
  "source_runtime_ref",
  "reviewed_evidence_manifest_hash",
  "reviewed_evidence_manifest",
  "evidence_dimensions"
];

const REVIEWED_EVIDENCE_SOURCE_RUNTIME_REF_FIELDS = [
  "runtime_hash",
  "fixture_artifact_hash"
];

const REVIEWED_EVIDENCE_MANIFEST_FIELDS = [
  "schema_version",
  "manifest_state",
  "internal_only",
  "aggregate_only",
  "source_runtime_ref",
  "evidence_dimensions",
  "manifest_hash"
];

const REVIEWED_EVIDENCE_MANIFEST_DIMENSION_FIELDS = [
  "reviewed_source_evidence_ref",
  "reviewed_source_evidence_hash",
  "aggregate_only_scope"
];

const REVIEWED_EVIDENCE_DIMENSION_FIELDS = [
  "reviewed_source_evidence_ref",
  "reviewed_source_evidence_hash",
  "source_evidence_hash",
  "aggregate_only_scope",
  "suppressed_missing_held_windows_clear",
  "eligible_for_satisfied_representation",
  "placeholder_evidence",
  "generated_fixture_evidence",
  "evidence_satisfied"
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
  "diagnostics_evidence_packet",
  "bayesian_promotion_decision_gate",
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
  "receives_reviewed_diagnostics_source_evidence_refs",
  "receives_aggregate_measurement_cell_windows",
  "receives_raw_rows",
  "receives_query_text",
  "receives_identifiers",
  "persists_source",
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
  "source_gate",
  "aggregate_measurement_cell_windows",
  "reviewed_diagnostics_source_evidence",
  "generated_at"
]);
const ALLOWED_SOURCE_RUNTIME_ENVELOPE_FIELDS = new Set([
  "source_runtime",
  "source_gate",
  "sourceGate",
  "aggregate_measurement_cell_windows",
  "aggregateMeasurementCellWindows",
  "aggregate_windows",
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
  "Governed Diagnostics Sufficiency Evidence Source is internal-only and aggregate-only.",
  "The source can represent reviewed diagnostics evidence, but it cannot fabricate model adequacy or authorize promotion.",
  "Default output is held unless explicit governed source evidence refs and hashes are supplied.",
  "The Diagnostics Evidence Packet may accept or reject this source; only the Bayesian Promotion Decision Gate can authorize promotion."
];

const FORBIDDEN_KEY_PATTERNS = [
  /raw_?rows?/i,
  /^rows$/i,
  /^records$/i,
  /query_?text/i,
  /\bsql\b/i,
  /confidence/i,
  /probability/i,
  /score(?:_like)?/i,
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
  /confidence/i,
  /probability/i,
  /score(?:_like)?/i,
  /placeholder/i,
  /generated[_\s-]?fixture/i,
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

const FORBIDDEN_RUNTIME_ENVELOPE_SIDECAR_KEY_PATTERNS = [
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
  /dataset/i
];

const FORBIDDEN_RUNTIME_ENVELOPE_SIDECAR_VALUE_PATTERNS = [
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
  /dataset/i
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
  const sourceRuntimeEnvelope = asRecord(record.source_runtime);
  if (sourceRuntimeEnvelope.source_runtime) return sourceRuntimeEnvelope.source_runtime;
  return record.source_runtime ?? input;
}

function sourceRuntimeValidationOptions(input) {
  const record = asRecord(input);
  const sourceRuntimeEnvelope = asRecord(record.source_runtime);
  const source = sourceRuntimeEnvelope.source_runtime ? sourceRuntimeEnvelope : record;
  const sourceGate = source.source_gate ?? source.sourceGate;
  const aggregateMeasurementCellWindows =
    source.aggregate_measurement_cell_windows ??
    source.aggregateMeasurementCellWindows;
  if (sourceGate !== undefined && aggregateMeasurementCellWindows !== undefined) {
    return { sourceGate, aggregateMeasurementCellWindows };
  }
  return { allowSelfContainedSourceValidation: true };
}

function reviewedEvidenceFromInput(input) {
  return asRecord(input).reviewed_diagnostics_source_evidence ?? null;
}

function runtimeEnvelopeSidecarContentGaps(value, path = "source_runtime_envelope") {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      runtimeEnvelopeSidecarContentGaps(item, `${path}[${index}]`)
    );
  }
  if (value && typeof value === "object") {
    const gaps = [];
    for (const [key, nested] of Object.entries(value)) {
      if (FORBIDDEN_RUNTIME_ENVELOPE_SIDECAR_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
        gaps.push(`${path}.${key} contains unsafe source wrapper field`);
        continue;
      }
      gaps.push(...runtimeEnvelopeSidecarContentGaps(nested, `${path}.${key}`));
    }
    return gaps;
  }
  if (typeof value !== "string") return [];
  return FORBIDDEN_RUNTIME_ENVELOPE_SIDECAR_VALUE_PATTERNS.some((pattern) => pattern.test(value))
    ? [`${path} contains unsafe source wrapper content`]
    : [];
}

function isHashBoundExecutionGate(value) {
  const gate = asRecord(value);
  return (
    gate.schema_version === CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_GATE_SCHEMA_VERSION &&
    gate.gate_hash === contributionAlignmentInternalBayesianExecutionGateHash(gate)
  );
}

function inputBoundaryGaps(input) {
  const record = asRecord(input);
  if (!Object.prototype.hasOwnProperty.call(record, "source_runtime")) return [];
  const gaps = [];
  const sidecar = Object.fromEntries(
    Object.entries(record).filter(([key]) => !ALLOWED_INPUT_FIELDS.has(key))
  );
  if (Object.keys(sidecar).length > 0) {
    gaps.push("input wrapper rejected unsafe or unsupported content");
  }
  const sourceRuntimeEnvelope = asRecord(record.source_runtime);
  if (Object.prototype.hasOwnProperty.call(sourceRuntimeEnvelope, "source_runtime")) {
    const envelopeSidecar = Object.fromEntries(
      Object.entries(sourceRuntimeEnvelope).filter(
        ([key]) => !ALLOWED_SOURCE_RUNTIME_ENVELOPE_FIELDS.has(key)
      )
    );
    if (Object.keys(envelopeSidecar).length > 0) {
      gaps.push("source_runtime envelope rejected unsafe or unsupported content");
    }
    for (const [key, nested] of Object.entries(sourceRuntimeEnvelope)) {
      if (key === "source_runtime") continue;
      if (!ALLOWED_SOURCE_RUNTIME_ENVELOPE_FIELDS.has(key)) continue;
      // A hash-bound execution gate is byte-exactly the governed module output;
      // its own boundary fields (no_raw_rows_or_records, receives_query_text)
      // legitimately match the sidecar patterns, so only unbound content is walked.
      if (isHashBoundExecutionGate(nested)) continue;
      gaps.push(...runtimeEnvelopeSidecarContentGaps(nested, `source_runtime envelope.${key}`));
    }
  }
  return sanitizeGaps(gaps);
}

function artifactHash(artifact) {
  const withoutHash = clone(artifact);
  delete withoutHash.artifact_hash;
  return sha256Json(withoutHash);
}

function diagnosticsEvidenceRef(dimension) {
  return `internal_diagnostics_sufficiency_evidence.${dimension}.2026_06`;
}

function governedReviewedSourceEvidenceHash(dimension) {
  return sha256Json({
    schema_version: REVIEWED_SOURCE_EVIDENCE_HASH_SCHEMA_VERSION,
    evidence_dimension: dimension,
    reviewed_source_evidence_ref: diagnosticsEvidenceRef(dimension),
    aggregate_only_scope: true,
    reviewed_internal_source_attestation: "governed_diagnostics_sufficiency_evidence_source"
  });
}

function dimensionHashFromBoundHashes(
  sourceRuntimeHash,
  sourceFixtureArtifactHash,
  dimension,
  sourceEvidenceRef,
  reviewedSourceEvidenceHash
) {
  return sha256Json({
    schema_version: PACKET_SIDE_EVIDENCE_SCHEMA_VERSION,
    evidence_dimension: dimension,
    source_evidence_ref: sourceEvidenceRef,
    reviewed_source_evidence_hash: reviewedSourceEvidenceHash,
    source_runtime_hash: sourceRuntimeHash ?? null,
    source_fixture_artifact_hash: sourceFixtureArtifactHash ?? null,
    internal_only: true,
    aggregate_only: true,
    evidence_satisfied: true
  });
}

function dimensionHash(sourceRuntime, dimension, sourceEvidenceRef, reviewedSourceEvidenceHash) {
  return dimensionHashFromBoundHashes(
    sourceRuntime?.runtime_hash ?? null,
    sourceRuntime?.internal_fit_artifact?.artifact_hash ?? null,
    dimension,
    sourceEvidenceRef,
    reviewedSourceEvidenceHash
  );
}

function reviewedEvidenceManifestHash(manifest) {
  const withoutHash = clone(manifest);
  delete withoutHash.manifest_hash;
  return sha256Json(withoutHash);
}

function sourceRuntimeRef(sourceRuntime) {
  const runtime = asRecord(sourceRuntime);
  const artifact = asRecord(runtime.internal_fit_artifact);
  return {
    schema_version:
      runtime.schema_version === CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_RUNTIME_SCHEMA_VERSION
        ? runtime.schema_version
        : null,
    runtime_id: safeId(
      runtime.runtime_id,
      "contribution_alignment_internal_bayesian_execution_runtime"
    ),
    runtime_state: runtime.runtime_state === REQUIRED_RUNTIME_STATE ? REQUIRED_RUNTIME_STATE : null,
    runtime_execution_class:
      runtime.runtime_execution_class === REQUIRED_RUNTIME_CLASS ? REQUIRED_RUNTIME_CLASS : null,
    runtime_hash: safeHash(runtime.runtime_hash),
    fixture_artifact_hash: safeHash(artifact.artifact_hash)
  };
}

function sourceRuntimeGaps(sourceRuntime, validationOptions = {}) {
  const runtime = asRecord(sourceRuntime);
  const design = asRecord(runtime.aggregate_design_matrix);
  const artifact = asRecord(runtime.internal_fit_artifact);
  const gaps = [];
  const validation = validateContributionAlignmentInternalBayesianExecutionRuntime(runtime, {
    ...validationOptions
  });
  if (validation.valid !== true) {
    gaps.push("source_runtime failed internal Bayesian execution runtime validation");
    gaps.push(...validation.gaps.map((gap) => `source_runtime.${gap}`));
  }
  if (runtime.schema_version !== CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_RUNTIME_SCHEMA_VERSION) {
    gaps.push("source_runtime.schema_version is invalid");
  }
  if (runtime.runtime_state !== REQUIRED_RUNTIME_STATE) {
    gaps.push("source_runtime.runtime_state is not contained fixture prototype");
  }
  if (runtime.runtime_execution_class !== REQUIRED_RUNTIME_CLASS) {
    gaps.push("source_runtime.runtime_execution_class is not fixture prototype only");
  }
  if (runtime.runtime_hash !== contributionAlignmentInternalBayesianExecutionRuntimeHash(runtime)) {
    gaps.push("source_runtime hash drifted");
  }
  if (artifact.artifact_hash !== artifactHash(artifact)) {
    gaps.push("source_runtime internal fixture artifact hash drifted");
  }
  for (const [field, expected] of Object.entries({
    missing_window_count: 0,
    suppressed_window_count: 0,
    held_window_count: 0,
    raw_row_count: 0,
    identifier_count: 0,
    query_text_present: false
  })) {
    if (design[field] !== expected) {
      gaps.push(`source_runtime.aggregate_design_matrix.${field} must be ${expected}`);
    }
  }
  if (typeof design.minimum_cohort_size !== "number" || design.minimum_cohort_size < 5) {
    gaps.push("source_runtime minimum cohort size must satisfy aggregate suppression floor");
  }
  return sanitizeGaps(gaps);
}

function reviewedEvidenceContentGaps(value, path = "reviewed_diagnostics_source_evidence") {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => reviewedEvidenceContentGaps(item, `${path}[${index}]`));
  }
  if (value && typeof value === "object") {
    const gaps = [];
    for (const [key, nested] of Object.entries(value)) {
      if (FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
        gaps.push("reviewed diagnostics source evidence contains forbidden field name");
        continue;
      }
      gaps.push(...reviewedEvidenceContentGaps(nested, `${path}.${key}`));
    }
    return gaps;
  }
  if (typeof value !== "string") return [];
  return FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))
    ? ["reviewed diagnostics source evidence contains unsafe source or output content"]
    : [];
}

function reviewedEvidenceEnvelopeGaps(sourceRuntime, reviewedEvidence) {
  if (!reviewedEvidence) return ["reviewed diagnostics source evidence is required"];
  const evidence = asRecord(reviewedEvidence);
  const gaps = [];
  gaps.push(...collectAllowedFieldsGaps(
    evidence,
    new Set(REVIEWED_EVIDENCE_ENVELOPE_FIELDS),
    "reviewed_diagnostics_source_evidence"
  ));
  gaps.push(...collectAllowedFieldsGaps(
    evidence.source_runtime_ref,
    new Set(REVIEWED_EVIDENCE_SOURCE_RUNTIME_REF_FIELDS),
    "reviewed_diagnostics_source_evidence.source_runtime_ref"
  ));
  if (evidence.schema_version !== REVIEWED_SOURCE_EVIDENCE_SCHEMA_VERSION) {
    gaps.push("reviewed diagnostics source evidence schema_version is invalid");
  }
  if (evidence.evidence_review_state !== "REVIEWED_DIAGNOSTICS_SOURCE_EVIDENCE_INTERNAL_ONLY") {
    gaps.push("reviewed diagnostics source evidence review state is invalid");
  }
  if (evidence.internal_only !== true) {
    gaps.push("reviewed diagnostics source evidence must be internal-only");
  }
  if (evidence.aggregate_only !== true) {
    gaps.push("reviewed diagnostics source evidence must be aggregate-only");
  }
  if (evidence.source_runtime_ref?.runtime_hash !== sourceRuntime?.runtime_hash) {
    gaps.push("reviewed diagnostics source evidence runtime hash must match source runtime");
  }
  if (
    evidence.source_runtime_ref?.fixture_artifact_hash !==
    sourceRuntime?.internal_fit_artifact?.artifact_hash
  ) {
    gaps.push("reviewed diagnostics source evidence fixture artifact hash must match source runtime");
  }
  gaps.push(...reviewedEvidenceManifestGaps(sourceRuntime, reviewedEvidence));
  gaps.push(...reviewedEvidenceContentGaps(reviewedEvidence));
  return sanitizeGaps(gaps);
}

function reviewedEvidenceManifestGaps(sourceRuntime, reviewedEvidence) {
  const evidence = asRecord(reviewedEvidence);
  const manifest = asRecord(evidence.reviewed_evidence_manifest);
  const gaps = [];
  if (!manifest || Object.keys(manifest).length === 0) {
    return ["reviewed diagnostics source evidence manifest is required"];
  }
  gaps.push(...collectAllowedFieldsGaps(
    manifest,
    new Set(REVIEWED_EVIDENCE_MANIFEST_FIELDS),
    "reviewed_diagnostics_source_evidence.reviewed_evidence_manifest"
  ));
  gaps.push(...collectAllowedFieldsGaps(
    manifest.source_runtime_ref,
    new Set(REVIEWED_EVIDENCE_SOURCE_RUNTIME_REF_FIELDS),
    "reviewed_diagnostics_source_evidence.reviewed_evidence_manifest.source_runtime_ref"
  ));
  if (evidence.reviewed_evidence_manifest_hash !== manifest.manifest_hash) {
    gaps.push("reviewed diagnostics source evidence manifest hash must match envelope");
  }
  if (manifest.manifest_hash !== reviewedEvidenceManifestHash(manifest)) {
    gaps.push("reviewed diagnostics source evidence manifest hash is invalid");
  }
  if (manifest.schema_version !== REVIEWED_SOURCE_EVIDENCE_MANIFEST_SCHEMA_VERSION) {
    gaps.push("reviewed diagnostics source evidence manifest schema_version is invalid");
  }
  if (manifest.manifest_state !== "REVIEWED_DIAGNOSTICS_SOURCE_EVIDENCE_MANIFEST_INTERNAL_ONLY") {
    gaps.push("reviewed diagnostics source evidence manifest state is invalid");
  }
  if (manifest.internal_only !== true) {
    gaps.push("reviewed diagnostics source evidence manifest must be internal-only");
  }
  if (manifest.aggregate_only !== true) {
    gaps.push("reviewed diagnostics source evidence manifest must be aggregate-only");
  }
  if (manifest.source_runtime_ref?.runtime_hash !== sourceRuntime?.runtime_hash) {
    gaps.push("reviewed diagnostics source evidence manifest runtime hash must match source runtime");
  }
  if (
    manifest.source_runtime_ref?.fixture_artifact_hash !==
    sourceRuntime?.internal_fit_artifact?.artifact_hash
  ) {
    gaps.push("reviewed diagnostics source evidence manifest fixture artifact hash must match source runtime");
  }
  const manifestDimensions = asRecord(manifest.evidence_dimensions);
  for (const dimension of REQUIRED_EVIDENCE_DIMENSIONS) {
    const detail = asRecord(asRecord(evidence.evidence_dimensions)[dimension]);
    const manifestDetail = asRecord(manifestDimensions[dimension]);
    gaps.push(...collectAllowedFieldsGaps(
      manifestDetail,
      new Set(REVIEWED_EVIDENCE_MANIFEST_DIMENSION_FIELDS),
      `reviewed_diagnostics_source_evidence.reviewed_evidence_manifest.evidence_dimensions.${dimension}`
    ));
    if (manifestDetail.reviewed_source_evidence_ref !== detail.reviewed_source_evidence_ref) {
      gaps.push(`${dimension} reviewed source evidence ref must match reviewed evidence manifest`);
    }
    if (manifestDetail.reviewed_source_evidence_hash !== detail.reviewed_source_evidence_hash) {
      gaps.push(`${dimension} reviewed source evidence hash must match reviewed evidence manifest`);
    }
    if (manifestDetail.aggregate_only_scope !== true) {
      gaps.push(`${dimension} reviewed evidence manifest aggregate_only_scope must be true`);
    }
  }
  return sanitizeGaps(gaps);
}

function dimensionGaps(sourceRuntime, reviewedEvidence, dimension) {
  const detail = asRecord(asRecord(asRecord(reviewedEvidence).evidence_dimensions)[dimension]);
  const manifestDetail = asRecord(asRecord(
    asRecord(asRecord(reviewedEvidence).reviewed_evidence_manifest).evidence_dimensions
  )[dimension]);
  const gaps = [];
  if (Object.keys(detail).length === 0) {
    return [`${dimension} reviewed source evidence is required`];
  }
  gaps.push(...collectAllowedFieldsGaps(
    detail,
    new Set(REVIEWED_EVIDENCE_DIMENSION_FIELDS),
    `reviewed_diagnostics_source_evidence.evidence_dimensions.${dimension}`
  ));
  const sourceEvidenceRef = detail.reviewed_source_evidence_ref;
  const reviewedSourceEvidenceHash = detail.reviewed_source_evidence_hash;
  const expectedRef = diagnosticsEvidenceRef(dimension);
  if (sourceEvidenceRef !== expectedRef) {
    gaps.push(`${dimension} reviewed source evidence ref must be ${expectedRef}`);
  }
  if (safeHash(reviewedSourceEvidenceHash) === null) {
    gaps.push(`${dimension} reviewed source evidence hash is required`);
  }
  if (
    safeHash(reviewedSourceEvidenceHash) !== null &&
    reviewedSourceEvidenceHash !== governedReviewedSourceEvidenceHash(dimension)
  ) {
    gaps.push(`${dimension} reviewed source evidence hash is not recognized governed reviewed evidence`);
  }
  if (reviewedSourceEvidenceHash !== manifestDetail.reviewed_source_evidence_hash) {
    gaps.push(`${dimension} reviewed source evidence hash must be manifest-bound`);
  }
  if (
    detail.source_evidence_hash !==
    dimensionHash(sourceRuntime, dimension, sourceEvidenceRef, reviewedSourceEvidenceHash)
  ) {
    gaps.push(`${dimension} source evidence hash is invalid`);
  }
  for (const [field, expected] of Object.entries({
    aggregate_only_scope: true,
    suppressed_missing_held_windows_clear: true,
    eligible_for_satisfied_representation: true,
    placeholder_evidence: false,
    generated_fixture_evidence: false,
    evidence_satisfied: true
  })) {
    if (detail[field] !== expected) {
      gaps.push(`${dimension} ${field} must be ${expected}`);
    }
  }
  return sanitizeGaps(gaps);
}

function dimensionMissingEvidenceRequirements(sourceRuntime, reviewedEvidence, dimension) {
  const detail = asRecord(asRecord(asRecord(reviewedEvidence).evidence_dimensions)[dimension]);
  const manifestDetail = asRecord(asRecord(
    asRecord(asRecord(reviewedEvidence).reviewed_evidence_manifest).evidence_dimensions
  )[dimension]);
  if (Object.keys(detail).length === 0) {
    return [
      "reviewed_source_evidence_ref",
      "reviewed_source_evidence_hash",
      "source_evidence_hash",
      "aggregate_only_scope",
      "suppressed_missing_held_windows_clear",
      "eligible_for_satisfied_representation",
      "evidence_satisfied"
    ];
  }
  const missing = [];
  const sourceEvidenceRef = detail.reviewed_source_evidence_ref;
  const reviewedSourceEvidenceHash = detail.reviewed_source_evidence_hash;
  if (sourceEvidenceRef !== diagnosticsEvidenceRef(dimension)) {
    missing.push("reviewed_source_evidence_ref");
  }
  if (safeHash(reviewedSourceEvidenceHash) === null) {
    missing.push("reviewed_source_evidence_hash");
  }
  if (
    safeHash(reviewedSourceEvidenceHash) !== null &&
    reviewedSourceEvidenceHash !== governedReviewedSourceEvidenceHash(dimension)
  ) {
    missing.push("reviewed_source_evidence_hash");
  }
  if (reviewedSourceEvidenceHash !== manifestDetail.reviewed_source_evidence_hash) {
    missing.push("reviewed_evidence_manifest_hash");
  }
  if (
    detail.source_evidence_hash !==
    dimensionHash(sourceRuntime, dimension, sourceEvidenceRef, reviewedSourceEvidenceHash)
  ) {
    missing.push("source_evidence_hash");
  }
  for (const [field, expected] of Object.entries({
    aggregate_only_scope: true,
    suppressed_missing_held_windows_clear: true,
    eligible_for_satisfied_representation: true,
    evidence_satisfied: true,
    placeholder_evidence: false,
    generated_fixture_evidence: false
  })) {
    if (detail[field] !== expected) missing.push(field);
  }
  return missing;
}

function reviewedEvidenceGaps(sourceRuntime, reviewedEvidence) {
  if (!reviewedEvidence) return ["reviewed diagnostics source evidence is required"];
  return sanitizeGaps([
    ...reviewedEvidenceEnvelopeGaps(sourceRuntime, reviewedEvidence),
    ...REQUIRED_EVIDENCE_DIMENSIONS.flatMap((dimension) =>
      dimensionGaps(sourceRuntime, reviewedEvidence, dimension)
    )
  ]);
}

function allEvidenceReady(sourceRuntime, reviewedEvidence) {
  return reviewedEvidenceGaps(sourceRuntime, reviewedEvidence).length === 0;
}

function buildDimension(sourceRuntime, reviewedEvidence, dimension, ready) {
  const detail = asRecord(asRecord(reviewedEvidence).evidence_dimensions)[dimension];
  const sourceEvidenceRef = typeof detail?.reviewed_source_evidence_ref === "string"
    ? detail.reviewed_source_evidence_ref
    : null;
  const reviewedSourceEvidenceHash = safeHash(detail?.reviewed_source_evidence_hash);
  return {
    required: true,
    evidence_satisfied: ready,
    source_evidence_ref: ready ? sourceEvidenceRef : null,
    reviewed_source_evidence_hash: ready ? reviewedSourceEvidenceHash : null,
    source_evidence_hash: ready
      ? dimensionHash(sourceRuntime, dimension, sourceEvidenceRef, reviewedSourceEvidenceHash)
      : null,
    aggregate_only_scope: ready,
    suppressed_missing_held_windows_clear: ready,
    eligible_for_satisfied_representation: ready,
    placeholder_evidence: false,
    generated_fixture_evidence: false
  };
}

function buildDimensions(sourceRuntime, reviewedEvidence, ready) {
  return Object.fromEntries(
    REQUIRED_EVIDENCE_DIMENSIONS.map((dimension) => [
      dimension,
      buildDimension(sourceRuntime, reviewedEvidence, dimension, ready)
    ])
  );
}

function buildFeatureWeightProvenance(dimensions, ready) {
  return {
    weights_structural_internal_only: ready,
    weights_not_confidence_scores: true,
    weight_provenance_version_present: true,
    weight_provenance_version: WEIGHT_PROVENANCE_VERSION,
    customer_facing_weight_output: false,
    source_evidence_hash: dimensions.feature_weight_provenance.source_evidence_hash
  };
}

function buildEvidenceSufficiency(dimensions) {
  return {
    comparison_design_adequacy_satisfied:
      dimensions.comparison_design_adequacy.evidence_satisfied === true,
    convergence_diagnostics_satisfied:
      dimensions.convergence_diagnostics.evidence_satisfied === true,
    posterior_predictive_checks_satisfied:
      dimensions.posterior_predictive_checks.evidence_satisfied === true,
    prior_sensitivity_satisfied:
      dimensions.prior_sensitivity.evidence_satisfied === true,
    residual_fit_checks_satisfied:
      dimensions.residual_fit_checks.evidence_satisfied === true,
    calibration_backtest_satisfied:
      dimensions.calibration_backtest.evidence_satisfied === true,
    feature_weight_provenance_satisfied:
      dimensions.feature_weight_provenance.evidence_satisfied === true,
    all_required_evidence_satisfied:
      REQUIRED_EVIDENCE_DIMENSIONS.every(
        (dimension) => dimensions[dimension].evidence_satisfied === true
      )
  };
}

function buildEvidenceReadinessReconciliation(sourceRuntime, reviewedEvidence, sourceGaps, evidenceGaps) {
  const supplied = Boolean(reviewedEvidence);
  const sourceRuntimeReady = sourceGaps.length === 0;
  const envelopeGaps = supplied
    ? reviewedEvidenceEnvelopeGaps(sourceRuntime, reviewedEvidence)
    : ["reviewed diagnostics source evidence is required"];
  const missingByDimension = Object.fromEntries(
    REQUIRED_EVIDENCE_DIMENSIONS.map((dimension) => [
      dimension,
      dimensionMissingEvidenceRequirements(sourceRuntime, reviewedEvidence, dimension)
    ])
  );
  const satisfiedDimensions = REQUIRED_EVIDENCE_DIMENSIONS.filter(
    (dimension) =>
      supplied &&
      sourceRuntimeReady &&
      envelopeGaps.length === 0 &&
      missingByDimension[dimension].length === 0
  );
  const unsatisfiedDimensions = REQUIRED_EVIDENCE_DIMENSIONS.filter(
    (dimension) => !satisfiedDimensions.includes(dimension)
  );
  const complete =
    supplied &&
    sourceRuntimeReady &&
    envelopeGaps.length === 0 &&
    unsatisfiedDimensions.length === 0 &&
    evidenceGaps.length === 0;
  return {
    reconciliation_state: complete
      ? "GOVERNED_REVIEWED_EVIDENCE_COMPLETE"
      : supplied
        ? "HOLD_INCOMPLETE_GOVERNED_REVIEWED_EVIDENCE"
        : "HOLD_MISSING_GOVERNED_REVIEWED_EVIDENCE",
    governed_reviewed_evidence_supplied: supplied,
    source_runtime_ready: sourceRuntimeReady,
    satisfied_dimensions: satisfiedDimensions,
    unsatisfied_dimensions: unsatisfiedDimensions,
    missing_evidence_by_dimension: missingByDimension,
    holding_reasons: complete ? [] : sanitizeGaps([...sourceGaps, ...evidenceGaps])
  };
}

function buildSource(sourceRuntime, reviewedEvidence, state, gaps, sourceGapsOverride, evidenceGapsOverride) {
  const ready = state === READY_STATE;
  const dimensions = buildDimensions(sourceRuntime, reviewedEvidence, ready);
  const sourceGaps = sourceGapsOverride ?? sourceRuntimeGaps(sourceRuntime);
  const evidenceGaps =
    evidenceGapsOverride ??
    (
      reviewedEvidence
        ? reviewedEvidenceGaps(sourceRuntime, reviewedEvidence)
        : ["reviewed diagnostics source evidence is required"]
    );
  const source = {
    schema_version:
      CONTRIBUTION_ALIGNMENT_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE_SCHEMA_VERSION,
    source_id: `contribution_alignment_governed_diagnostics_sufficiency_evidence_source_${sha256Json({
      runtime_hash: sourceRuntime?.runtime_hash ?? null,
      artifact_hash: sourceRuntime?.internal_fit_artifact?.artifact_hash ?? null,
      source_version: SOURCE_VERSION
    }).slice(0, 16)}`,
    source_state: state,
    source_class: ready ? SOURCE_CLASS : null,
    generated_at: "2026-06-25T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    source_bound: sourceGaps.length === 0,
    source_runtime_ref: sourceRuntimeRef(sourceRuntime),
    evidence_state: PACKET_SIDE_EVIDENCE_STATE,
    evidence_class: EVIDENCE_CLASS,
    evidence_version: EVIDENCE_VERSION,
    source_version: ready ? SOURCE_VERSION : null,
    source_policy: {
      internal_only: true,
      aggregate_only: sourceGaps.length === 0,
      evidence_source_only: true,
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
    evidence_dimensions: dimensions,
    feature_weight_provenance: buildFeatureWeightProvenance(dimensions, ready),
    evidence_sufficiency: buildEvidenceSufficiency(dimensions),
    evidence_readiness_reconciliation:
      buildEvidenceReadinessReconciliation(sourceRuntime, reviewedEvidence, sourceGaps, evidenceGaps),
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
      diagnostics_evidence_packet: ready,
      ...falseMap(FEED_FIELDS.filter((field) => field !== "diagnostics_evidence_packet"))
    },
    boundary_policy: {
      receives_internal_bayesian_fixture_runtime_only: state !== REJECT_STATE,
      receives_reviewed_diagnostics_source_evidence_refs: ready,
      receives_aggregate_measurement_cell_windows: state !== REJECT_STATE,
      ...falseMap(
        BOUNDARY_POLICY_FIELDS.filter((field) =>
          ![
            "receives_internal_bayesian_fixture_runtime_only",
            "receives_reviewed_diagnostics_source_evidence_refs",
            "receives_aggregate_measurement_cell_windows"
          ].includes(field)
        )
      )
    },
    validation_summary: {
      schema_version:
        `${CONTRIBUTION_ALIGNMENT_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE_SCHEMA_VERSION}_SUMMARY`,
      valid: ready,
      source_state: state,
      gaps: ready ? [] : sanitizeGaps(gaps)
    }
  };
  source.evidence_hash =
    contributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceHash(source);
  return source;
}

function rejectedSource() {
  const source = {
    schema_version:
      CONTRIBUTION_ALIGNMENT_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE_SCHEMA_VERSION,
    source_id: null,
    source_state: REJECT_STATE,
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
      schema_version:
        `${CONTRIBUTION_ALIGNMENT_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE_SCHEMA_VERSION}_SUMMARY`,
      valid: false,
      source_state: REJECT_STATE,
      gaps: ["boundary leakage rejected"]
    }
  };
  source.evidence_hash =
    contributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceHash(source);
  return source;
}

export function contributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceHash(source) {
  const withoutHash = clone(source);
  delete withoutHash.evidence_hash;
  delete withoutHash.source_hash;
  return sha256Json(withoutHash);
}

function packetSideEvidenceHash(evidence) {
  const withoutHash = clone(evidence);
  delete withoutHash.evidence_hash;
  return sha256Json(withoutHash);
}

function packetProjectionGaps(source) {
  const record = asRecord(source);
  const gaps = [...validateShape(record)];
  if (record.source_state !== READY_STATE) {
    gaps.push("governed diagnostics source must be ready before packet projection");
  }
  const runtimeRef = asRecord(record.source_runtime_ref);
  const dimensions = asRecord(record.evidence_dimensions);
  for (const dimension of REQUIRED_EVIDENCE_DIMENSIONS) {
    const detail = asRecord(dimensions[dimension]);
    const sourceEvidenceRef = diagnosticsEvidenceRef(dimension);
    const reviewedSourceEvidenceHash = detail.reviewed_source_evidence_hash;
    if (reviewedSourceEvidenceHash !== governedReviewedSourceEvidenceHash(dimension)) {
      gaps.push(`${dimension} reviewed source evidence hash is not recognized for packet projection`);
    }
    if (detail.source_evidence_ref !== sourceEvidenceRef) {
      gaps.push(`${dimension} source evidence ref is invalid for packet projection`);
    }
    if (
      detail.source_evidence_hash !==
      dimensionHashFromBoundHashes(
        runtimeRef.runtime_hash,
        runtimeRef.fixture_artifact_hash,
        dimension,
        sourceEvidenceRef,
        reviewedSourceEvidenceHash
      )
    ) {
      gaps.push(`${dimension} source evidence hash is invalid for packet projection`);
    }
  }
  return sanitizeGaps(gaps);
}

export function buildContributionAlignmentDiagnosticsSufficiencyEvidenceFromGovernedSource(source) {
  const record = asRecord(source);
  if (packetProjectionGaps(record).length > 0) return null;
  const runtimeRef = asRecord(record.source_runtime_ref);
  const dimensions = Object.fromEntries(
    PACKET_CONSUMED_DIMENSIONS.map((dimension) => {
      const sourceEvidenceRef = diagnosticsEvidenceRef(dimension);
      const detail = asRecord(asRecord(record.evidence_dimensions)[dimension]);
      return [
        dimension,
        {
          evidence_satisfied: detail.evidence_satisfied === true,
          source_evidence_ref: sourceEvidenceRef,
          reviewed_source_evidence_hash: detail.reviewed_source_evidence_hash,
          source_evidence_hash: detail.source_evidence_hash
        }
      ];
    })
  );
  const evidence = {
    schema_version: PACKET_SIDE_EVIDENCE_SCHEMA_VERSION,
    evidence_state: PACKET_SIDE_EVIDENCE_STATE,
    evidence_class: EVIDENCE_CLASS,
    evidence_version: EVIDENCE_VERSION,
    internal_only: true,
    aggregate_only: true,
    source_runtime_ref: {
      runtime_hash: runtimeRef.runtime_hash,
      fixture_artifact_hash: runtimeRef.fixture_artifact_hash
    },
    evidence_dimensions: dimensions,
    promotion_authorized: false,
    posterior_interpretation_authorized: false,
    confidence_output_authorized: false,
    probability_output_authorized: false,
    customer_output_authorized: false,
    economic_output_authorized: false,
    roi_output_authorized: false,
    productivity_output_authorized: false,
    causality_output_authorized: false,
    finance_output_authorized: false
  };
  evidence.evidence_hash = packetSideEvidenceHash(evidence);
  return evidence;
}

export function buildContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceFromObject(input) {
  const wrapperGaps = inputBoundaryGaps(input);
  if (wrapperGaps.length > 0) return rejectedSource();
  const sourceRuntime = sourceRuntimeFromInput(input);
  const runtimeValidationOptions = sourceRuntimeValidationOptions(input);
  const reviewedEvidence = reviewedEvidenceFromInput(input);
  if (reviewedEvidenceContentGaps(reviewedEvidence).length > 0) return rejectedSource();
  const sourceGaps = sourceRuntimeGaps(sourceRuntime, runtimeValidationOptions);
  const evidenceGaps = reviewedEvidence
    ? reviewedEvidenceGaps(sourceRuntime, reviewedEvidence)
    : ["reviewed diagnostics source evidence is required"];
  const gaps = sanitizeGaps([...sourceGaps, ...evidenceGaps]);
  const state =
    sourceGaps.length === 0 && reviewedEvidence && allEvidenceReady(sourceRuntime, reviewedEvidence)
      ? READY_STATE
      : HOLD_STATE;
  return buildSource(sourceRuntime, reviewedEvidence, state, gaps, sourceGaps, evidenceGaps);
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

function hasForbiddenContent(value, path = "source") {
  if (Array.isArray(value)) {
    if (
      path === "source.blocked_uses" ||
      path === "source.required_caveats" ||
      path === "source.validation_summary.gaps" ||
      path === "source.evidence_readiness_reconciliation.holding_reasons" ||
      path.startsWith("source.evidence_readiness_reconciliation.missing_evidence_by_dimension.")
    ) {
      return [];
    }
    return value.flatMap((item, index) => hasForbiddenContent(item, `${path}[${index}]`));
  }
  if (value && typeof value === "object") {
    const gaps = [];
    for (const [key, nested] of Object.entries(value)) {
      const safeField =
        (path === "source.source_policy" && SOURCE_POLICY_FIELDS.includes(key)) ||
        (path.startsWith("source.evidence_dimensions.") && EVIDENCE_DIMENSION_FIELDS.includes(key)) ||
        (path === "source.feature_weight_provenance" && FEATURE_WEIGHT_FIELDS.includes(key)) ||
        (path === "source.evidence_sufficiency" && EVIDENCE_SUFFICIENCY_FIELDS.includes(key)) ||
        (path === "source.evidence_readiness_reconciliation" &&
          EVIDENCE_READINESS_RECONCILIATION_FIELDS.includes(key)) ||
        (path === "source.evidence_readiness_reconciliation.missing_evidence_by_dimension" &&
          REQUIRED_EVIDENCE_DIMENSIONS.includes(key)) ||
        (path === "source.promotion_boundary" && PROMOTION_BOUNDARY_FIELDS.includes(key)) ||
        (path === "source.feeds" && FEED_FIELDS.includes(key)) ||
        (path === "source.boundary_policy" && BOUNDARY_POLICY_FIELDS.includes(key));
      if (
        !safeField &&
        FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key))
      ) {
        gaps.push("source contains forbidden field name");
        continue;
      }
      gaps.push(...hasForbiddenContent(nested, `${path}.${key}`));
    }
    return gaps;
  }
  if (typeof value !== "string") return [];
  if (
    path.startsWith("source.blocked_uses[") ||
    path.startsWith("source.required_caveats[") ||
    path.startsWith("source.validation_summary.gaps[") ||
    path.startsWith("source.evidence_readiness_reconciliation.holding_reasons[") ||
    path.startsWith("source.evidence_readiness_reconciliation.missing_evidence_by_dimension.") ||
    path === "source.feature_weight_provenance.weight_provenance_version"
  ) {
    return [];
  }
  return FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))
    ? [`${path} contains unsafe source or output language`]
    : [];
}

function validateShape(source) {
  if (source?.source_state === REJECT_STATE) return ["boundary leakage rejected"];
  const record = asRecord(source);
  const ready = record.source_state === READY_STATE;
  const gaps = [];
  gaps.push(...collectAllowedFieldsGaps(record, TOP_LEVEL_FIELDS, "source"));
  if (record.schema_version !== CONTRIBUTION_ALIGNMENT_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE_SCHEMA_VERSION) {
    gaps.push("schema_version is invalid");
  }
  if (![READY_STATE, HOLD_STATE].includes(record.source_state)) {
    gaps.push("source_state is invalid");
  }
  if (record.source_class !== (ready ? SOURCE_CLASS : null)) {
    gaps.push(`source_class must be ${ready ? SOURCE_CLASS : "null"}`);
  }
  if (record.evidence_state !== PACKET_SIDE_EVIDENCE_STATE) {
    gaps.push("evidence_state is invalid for packet sidecar compatibility");
  }
  if (record.evidence_class !== EVIDENCE_CLASS) {
    gaps.push("evidence_class is invalid");
  }
  if (record.evidence_version !== EVIDENCE_VERSION) {
    gaps.push("evidence_version is invalid");
  }
  if (record.source_version !== (ready ? SOURCE_VERSION : null)) {
    gaps.push(`source_version must be ${ready ? SOURCE_VERSION : "null"}`);
  }
  if (record.allowed_next_step !== (ready ? READY_NEXT_STEP : HELD_NEXT_STEP)) {
    gaps.push(`allowed_next_step must be ${ready ? READY_NEXT_STEP : HELD_NEXT_STEP}`);
  }
  gaps.push(...collectRefGaps(record.source_runtime_ref, SOURCE_RUNTIME_REF_FIELDS, "source_runtime_ref"));

  const policy = asRecord(record.source_policy);
  gaps.push(...collectRefGaps(policy, SOURCE_POLICY_FIELDS, "source_policy"));
  for (const [field, expected] of Object.entries({
    internal_only: true,
    evidence_source_only: true,
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
    if (policy[field] !== expected) gaps.push(`source_policy.${field} must be ${expected}`);
  }

  const dimensions = asRecord(record.evidence_dimensions);
  const sourceRuntimeRefRecord = asRecord(record.source_runtime_ref);
  for (const dimension of REQUIRED_EVIDENCE_DIMENSIONS) {
    const detail = asRecord(dimensions[dimension]);
    gaps.push(...collectRefGaps(detail, EVIDENCE_DIMENSION_FIELDS, `evidence_dimensions.${dimension}`));
    if (detail.required !== true) gaps.push(`evidence_dimensions.${dimension}.required must be true`);
    if (detail.evidence_satisfied !== ready) {
      gaps.push(`evidence_dimensions.${dimension}.evidence_satisfied must be ${ready}`);
    }
    if (ready && safeHash(detail.source_evidence_hash) === null) {
      gaps.push(`evidence_dimensions.${dimension}.source_evidence_hash is required`);
    }
    if (ready && safeHash(detail.reviewed_source_evidence_hash) === null) {
      gaps.push(`evidence_dimensions.${dimension}.reviewed_source_evidence_hash is required`);
    }
    if (!ready && detail.source_evidence_hash !== null) {
      gaps.push(`evidence_dimensions.${dimension}.source_evidence_hash must be null`);
    }
    if (!ready && detail.reviewed_source_evidence_hash !== null) {
      gaps.push(`evidence_dimensions.${dimension}.reviewed_source_evidence_hash must be null`);
    }
    if (
      ready &&
      detail.source_evidence_hash !==
        dimensionHashFromBoundHashes(
          sourceRuntimeRefRecord.runtime_hash,
          sourceRuntimeRefRecord.fixture_artifact_hash,
          dimension,
          detail.source_evidence_ref,
          detail.reviewed_source_evidence_hash
        )
    ) {
      gaps.push(`evidence_dimensions.${dimension}.source_evidence_hash must bind reviewed evidence hash`);
    }
    for (const [field, expected] of Object.entries({
      aggregate_only_scope: ready,
      suppressed_missing_held_windows_clear: ready,
      eligible_for_satisfied_representation: ready,
      placeholder_evidence: false,
      generated_fixture_evidence: false
    })) {
      if (detail[field] !== expected) {
        gaps.push(`evidence_dimensions.${dimension}.${field} must be ${expected}`);
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
  for (const [field, expected] of Object.entries({
    comparison_design_adequacy_satisfied: ready,
    convergence_diagnostics_satisfied: ready,
    posterior_predictive_checks_satisfied: ready,
    prior_sensitivity_satisfied: ready,
    residual_fit_checks_satisfied: ready,
    calibration_backtest_satisfied: ready,
    feature_weight_provenance_satisfied: ready,
    all_required_evidence_satisfied: ready
  })) {
    if (sufficiency[field] !== expected) gaps.push(`evidence_sufficiency.${field} must be ${expected}`);
  }

  const reconciliation = asRecord(record.evidence_readiness_reconciliation);
  gaps.push(...collectRefGaps(
    reconciliation,
    EVIDENCE_READINESS_RECONCILIATION_FIELDS,
    "evidence_readiness_reconciliation"
  ));
  const expectedReconciliation = ready
    ? "GOVERNED_REVIEWED_EVIDENCE_COMPLETE"
    : reconciliation.governed_reviewed_evidence_supplied === true
      ? "HOLD_INCOMPLETE_GOVERNED_REVIEWED_EVIDENCE"
      : "HOLD_MISSING_GOVERNED_REVIEWED_EVIDENCE";
  if (reconciliation.reconciliation_state !== expectedReconciliation) {
    gaps.push(`evidence_readiness_reconciliation.reconciliation_state must be ${expectedReconciliation}`);
  }
  if (reconciliation.source_runtime_ready !== record.source_bound) {
    gaps.push("evidence_readiness_reconciliation.source_runtime_ready must match source_bound");
  }
  if (!Array.isArray(reconciliation.satisfied_dimensions)) {
    gaps.push("evidence_readiness_reconciliation.satisfied_dimensions must be an array");
  }
  if (!Array.isArray(reconciliation.unsatisfied_dimensions)) {
    gaps.push("evidence_readiness_reconciliation.unsatisfied_dimensions must be an array");
  }
  if (Array.isArray(reconciliation.satisfied_dimensions)) {
    for (const dimension of reconciliation.satisfied_dimensions) {
      if (!REQUIRED_EVIDENCE_DIMENSIONS.includes(dimension)) {
        gaps.push("evidence_readiness_reconciliation.satisfied_dimensions contains invalid dimension");
      }
    }
  }
  if (Array.isArray(reconciliation.unsatisfied_dimensions)) {
    for (const dimension of reconciliation.unsatisfied_dimensions) {
      if (!REQUIRED_EVIDENCE_DIMENSIONS.includes(dimension)) {
        gaps.push("evidence_readiness_reconciliation.unsatisfied_dimensions contains invalid dimension");
      }
    }
  }
  const missingByDimension = asRecord(reconciliation.missing_evidence_by_dimension);
  if (ready) {
    if (reconciliation.governed_reviewed_evidence_supplied !== true) {
      gaps.push("evidence_readiness_reconciliation.governed_reviewed_evidence_supplied must be true for ready source");
    }
    if (stableStringify(reconciliation.satisfied_dimensions) !== stableStringify(REQUIRED_EVIDENCE_DIMENSIONS)) {
      gaps.push("evidence_readiness_reconciliation.satisfied_dimensions must match all required dimensions for ready source");
    }
    if (stableStringify(reconciliation.unsatisfied_dimensions) !== stableStringify([])) {
      gaps.push("evidence_readiness_reconciliation.unsatisfied_dimensions must be empty for ready source");
    }
    if (stableStringify(reconciliation.holding_reasons) !== stableStringify([])) {
      gaps.push("evidence_readiness_reconciliation.holding_reasons must be empty for ready source");
    }
  }
  for (const dimension of REQUIRED_EVIDENCE_DIMENSIONS) {
    if (!Array.isArray(missingByDimension[dimension])) {
      gaps.push(`evidence_readiness_reconciliation.missing_evidence_by_dimension.${dimension} must be an array`);
    }
    if (ready && stableStringify(missingByDimension[dimension]) !== stableStringify([])) {
      gaps.push(`evidence_readiness_reconciliation.missing_evidence_by_dimension.${dimension} must be empty for ready source`);
    }
  }
  for (const dimension of Object.keys(missingByDimension)) {
    if (!REQUIRED_EVIDENCE_DIMENSIONS.includes(dimension)) {
      gaps.push("evidence_readiness_reconciliation.missing_evidence_by_dimension contains invalid dimension");
    }
  }
  if (!Array.isArray(reconciliation.holding_reasons)) {
    gaps.push("evidence_readiness_reconciliation.holding_reasons must be an array");
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
  if (feeds.diagnostics_evidence_packet !== ready) {
    gaps.push(`feeds.diagnostics_evidence_packet must be ${ready}`);
  }
  for (const field of FEED_FIELDS.filter((field) => field !== "diagnostics_evidence_packet")) {
    if (feeds[field] !== false) gaps.push(`feeds.${field} must be false`);
  }

  const boundary = asRecord(record.boundary_policy);
  for (const field of BOUNDARY_POLICY_FIELDS) {
    const expected =
      [
        "receives_internal_bayesian_fixture_runtime_only",
        "receives_aggregate_measurement_cell_windows"
      ].includes(field) && record.source_state !== REJECT_STATE
        ? true
        : field === "receives_reviewed_diagnostics_source_evidence_refs" && ready;
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
  if (summary.source_state !== record.source_state) {
    gaps.push("validation_summary.source_state must match source_state");
  }
  if (ready && Array.isArray(summary.gaps) && summary.gaps.length !== 0) {
    gaps.push("validation_summary.gaps must be empty for ready source");
  }
  if (record.evidence_hash !== contributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceHash(record)) {
    gaps.push("evidence_hash must match source body");
  }
  gaps.push(...hasForbiddenContent(record));
  return sanitizeGaps(gaps);
}

function validateAgainstSources(source, options = {}) {
  const gaps = [];
  if (source?.source_state === READY_STATE && !options.sourceRuntime) {
    gaps.push("sourceRuntime is required for ready governed diagnostics sufficiency evidence validation");
  }
  if (source?.source_state === READY_STATE && !options.reviewedDiagnosticsSourceEvidence) {
    gaps.push("reviewedDiagnosticsSourceEvidence is required for ready governed diagnostics sufficiency evidence validation");
  }
  if (options.sourceRuntime) {
    const runtimeValidationOptions = sourceRuntimeValidationOptions(options);
    gaps.push(...sourceRuntimeGaps(options.sourceRuntime, runtimeValidationOptions));
    const actualRuntimeRef = asRecord(source.source_runtime_ref);
    const expectedRuntimeRef = sourceRuntimeRef(options.sourceRuntime);
    for (const field of SOURCE_RUNTIME_REF_FIELDS) {
      if (actualRuntimeRef[field] !== expectedRuntimeRef[field]) {
        gaps.push(`source_runtime_ref.${field} does not match sourceRuntime`);
      }
    }
  }
  if (options.reviewedDiagnosticsSourceEvidence) {
    gaps.push(...reviewedEvidenceGaps(
      options.sourceRuntime,
      options.reviewedDiagnosticsSourceEvidence
    ));
    const expected = buildContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceFromObject({
      source_runtime: options.sourceRuntime,
      source_gate: options.sourceGate,
      aggregate_measurement_cell_windows: options.aggregateMeasurementCellWindows,
      reviewed_diagnostics_source_evidence: options.reviewedDiagnosticsSourceEvidence
    });
    const actualWithoutHash = clone(source);
    const expectedWithoutHash = clone(expected);
    delete actualWithoutHash.evidence_hash;
    delete expectedWithoutHash.evidence_hash;
    if (stableStringify(actualWithoutHash) !== stableStringify(expectedWithoutHash)) {
      gaps.push("governed diagnostics sufficiency evidence source mismatch against reviewed evidence");
    }
  }
  return sanitizeGaps(gaps);
}

export function validateContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSource(source, options = {}) {
  if (source?.source_state === REJECT_STATE) {
    return {
      schema_version: VALIDATION_SCHEMA_VERSION,
      valid: false,
      gaps: ["boundary leakage rejected"]
    };
  }
  const gaps = sanitizeGaps([
    ...validateShape(source),
    ...validateAgainstSources(source, options)
  ]);
  return {
    schema_version: VALIDATION_SCHEMA_VERSION,
    valid: gaps.length === 0 && source?.source_state === READY_STATE,
    gaps
  };
}

function inputFromCliPath(path) {
  if (path === "-") return JSON.parse(readFileSync(0, "utf8"));
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

function main() {
  const [, , sourceRuntimePath, reviewedEvidencePath] = process.argv;
  if (!sourceRuntimePath) {
    console.error(
      "Usage: node scripts/run_ai_value_contribution_alignment_governed_diagnostics_sufficiency_evidence_source.mjs <internal-bayesian-execution-runtime-json|- for stdin> [reviewed-diagnostics-source-evidence-json]"
    );
    process.exit(1);
  }
  const sourceRuntime = inputFromCliPath(sourceRuntimePath);
  const source = buildContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceFromObject(
    reviewedEvidencePath
      ? {
          source_runtime: sourceRuntime,
          reviewed_diagnostics_source_evidence: inputFromCliPath(reviewedEvidencePath)
        }
      : sourceRuntime
  );
  process.stdout.write(`${JSON.stringify(source, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
