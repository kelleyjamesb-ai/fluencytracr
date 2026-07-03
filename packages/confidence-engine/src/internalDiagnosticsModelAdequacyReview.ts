// Ported verbatim from
// scripts/run_ai_value_contribution_alignment_internal_diagnostics_model_adequacy_review.mjs
// under OpenSpec change add-confidence-engine-workspace (task 3.1, module 11).
// Byte-compatibility contract enforced by the golden parity suite.

import { sha256Json } from "./internal/hashing";
import {
  CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_RUNTIME_SCHEMA_VERSION,
  contributionAlignmentInternalBayesianExecutionRuntimeHash,
  validateContributionAlignmentInternalBayesianExecutionRuntime
} from "./internalBayesianExecutionRuntime";
import {
  CONTRIBUTION_ALIGNMENT_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE_SCHEMA_VERSION,
  buildContributionAlignmentDiagnosticsSufficiencyEvidenceFromGovernedSource,
  contributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceHash
} from "./governedDiagnosticsSufficiencyEvidenceSource";

type AnyRecord = Record<string, any>;

export const CONTRIBUTION_ALIGNMENT_INTERNAL_DIAGNOSTICS_MODEL_ADEQUACY_REVIEW_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_DIAGNOSTICS_MODEL_ADEQUACY_REVIEW_2026_06";

const VALIDATION_SCHEMA_VERSION =
  `${CONTRIBUTION_ALIGNMENT_INTERNAL_DIAGNOSTICS_MODEL_ADEQUACY_REVIEW_SCHEMA_VERSION}_VALIDATION`;

const DERIVATION_VERSION =
  "ai_value_contribution_alignment_internal_diagnostics_model_adequacy_review_2026_06";

const COMPLETED_STATE =
  "INTERNAL_DIAGNOSTICS_AND_MODEL_ADEQUACY_REVIEW_COMPLETED_PROMOTION_BLOCKED";
const HOLD_STATE = "HOLD_FOR_INTERNAL_DIAGNOSTICS_MODEL_ADEQUACY_SOURCE";
const REJECT_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";

const REVIEW_VERSION = "internal_diagnostics_model_adequacy_review_2026_06";
const REVIEW_CLASS = "internal_diagnostics_model_adequacy_review_only";
const READY_NEXT_STEP = "bayesian_promotion_decision_gate_only";
const HELD_NEXT_STEP = "complete_internal_diagnostics_model_adequacy_source";
const REQUIRED_RUNTIME_STATE =
  "INTERNAL_BAYESIAN_FIXTURE_EXECUTION_PROTOTYPE_HELD_FOR_REVIEW";
const REQUIRED_RUNTIME_CLASS = "internal_fixture_prototype_only";
const REQUIRED_RUNTIME_NEXT_STEP = "internal_diagnostics_and_model_adequacy_review_only";
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
  "review_id",
  "review_state",
  "review_class",
  "generated_at",
  "derivation_version",
  "source_bound",
  "source_runtime_ref",
  "source_governed_diagnostics_sufficiency_evidence_source_ref",
  "source_diagnostics_sufficiency_evidence_ref",
  "review_version",
  "review_policy",
  "data_adequacy",
  "comparison_design_adequacy",
  "model_diagnostics",
  "boundary_checks",
  "reviewed_fixture_artifact_ref",
  "promotion_review",
  "allowed_next_step",
  "blocked_uses",
  "required_caveats",
  "feeds",
  "boundary_policy",
  "validation_summary",
  "review_hash"
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

const REVIEW_POLICY_FIELDS = [
  "internal_only",
  "aggregate_only",
  "adequacy_review_only",
  "promotion_authorized",
  "posterior_interpretation_authorized",
  "posterior_output_authorized",
  "confidence_output_authorized",
  "probability_output_authorized",
  "finance_output_authorized",
  "customer_output_authorized"
];

const DATA_ADEQUACY_FIELDS = [
  "minimum_eligible_aggregate_windows_present",
  "pre_post_window_sufficiency_present",
  "treatment_comparison_available",
  "suppression_status_respected",
  "missing_or_suppressed_windows_fail_closed",
  "missing_window_count_zero",
  "suppressed_window_count_zero",
  "held_window_count_zero",
  "raw_row_count_zero",
  "identifier_count_zero",
  "query_text_absent",
  "data_adequacy_satisfied"
];

const COMPARISON_DESIGN_ADEQUACY_FIELDS = [
  "aggregate_measurement_cell_grain",
  "treatment_group_defined",
  "comparison_group_defined",
  "no_person_level_fields",
  "no_unsupported_cross_slice_aggregation",
  "comparison_design_review_present",
  "comparison_design_adequacy_satisfied",
  "causal_claim_authorized"
];

const MODEL_DIAGNOSTICS_FIELDS = [
  "convergence_diagnostics_required",
  "convergence_diagnostics_satisfied",
  "posterior_predictive_checks_required",
  "posterior_predictive_checks_satisfied",
  "prior_sensitivity_required",
  "prior_sensitivity_satisfied",
  "residual_fit_checks_required",
  "residual_fit_checks_satisfied",
  "calibration_backtest_required",
  "calibration_backtest_satisfied",
  "all_required_diagnostic_fields_present",
  "model_diagnostics_satisfied"
];

const BOUNDARY_CHECK_FIELDS = [
  "runtime_fixture_prototype_only",
  "posterior_values_contained",
  "posterior_numeric_values_withheld",
  "posterior_interpretation_blocked",
  "confidence_probability_blocked",
  "feature_weights_structural_internal_only",
  "feature_weights_not_confidence_scores",
  "customer_economic_output_blocked",
  "live_connector_execution_blocked"
];

const REVIEWED_FIXTURE_ARTIFACT_REF_FIELDS = [
  "artifact_state",
  "estimand_parameter",
  "artifact_hash",
  "diagnostic_fields_present",
  "numeric_posterior_values_withheld",
  "output_value_present"
];

const PROMOTION_REVIEW_FIELDS = [
  "adequacy_review_completed",
  "promotion_authorized",
  "promotion_blocked",
  "blocking_reason",
  "explicit_later_promotion_decision_required",
  "posterior_interpretation_blocked",
  "confidence_probability_blocked",
  "customer_economic_output_blocked"
];

const FEED_FIELDS = [
  "bayesian_promotion_decision_gate",
  "posterior_interpretation",
  "internal_posterior_interpretation_specification",
  "posterior_output",
  "confidence_output",
  "probability_output",
  "score_like_output",
  "weighted_internal_model_output",
  "aggregate_score_output",
  "research_model_feed",
  "finance_output",
  "roi_output",
  "causality_output",
  "productivity_output",
  "customer_facing_output",
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
  "receives_fit_artifact_ref",
  "receives_posterior_numeric_values",
  "receives_raw_rows",
  "receives_query_text",
  "receives_identifiers",
  "persists_review",
  "creates_routes",
  "creates_ui",
  "creates_schemas",
  "creates_exports",
  "runs_live_connectors",
  "emits_posterior_output",
  "emits_confidence_output",
  "emits_probability",
  "emits_score_like_output",
  "emits_finance_output",
  "emits_customer_facing_output",
  "computes_roi",
  "claims_causality",
  "measures_productivity"
];

const ALLOWED_INPUT_FIELDS = new Set([
  "source_runtime",
  "source_gate",
  "aggregate_measurement_cell_windows",
  "source_diagnostics_sufficiency_evidence",
  "generated_at"
]);

const ALLOWED_SOURCE_RUNTIME_ENVELOPE_FIELDS = new Set([
  "source_runtime",
  "source_gate",
  "sourceGate",
  "aggregate_measurement_cell_windows",
  "aggregateMeasurementCellWindows"
]);

const DIAGNOSTIC_SOURCE_FIELDS = [
  "convergence_diagnostics_present",
  "posterior_predictive_checks_present",
  "prior_sensitivity_present",
  "residual_fit_checks_present",
  "comparison_design_adequacy_review_present",
  "calibration_evidence_present",
  "interpretation_ready"
];

const REQUIRED_BLOCKED_USES = [
  "posterior_interpretation",
  "posterior_output",
  "confidence_output",
  "probability_output",
  "score_like_output",
  "weighted_internal_model_output",
  "aggregate_score_output",
  "research_model_feed",
  "finance_output",
  "roi",
  "causality_claim",
  "productivity_measurement",
  "customer_facing_output",
  "route_creation",
  "ui_creation",
  "schema_creation",
  "persistence_write",
  "export_creation",
  "live_connector_execution",
  "raw_data_storage"
];

const REQUIRED_CAVEATS = [
  "Internal Diagnostics and Model Adequacy Review is internal-only and aggregate-only.",
  "The review records diagnostic presence and adequacy status; it does not calculate diagnostics, reinterpret posterior values, or authorize posterior interpretation.",
  "Promotion remains blocked until a later explicit Bayesian Promotion Decision Gate is created.",
  "Confidence, probability, customer-facing, ROI, finance, causality, productivity, live connector, route, UI, schema, export, and persistence behavior remains blocked."
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
  /dashboard/i,
  /score/i,
  /^roi$/i,
  /finance/i,
  /financial/i,
  /caus(?:al|ality)/i,
  /productivity/i,
  /customer_?facing/i
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
  /score[_-\s]?(?:like|output|ready|field)?/i,
  /\broi\b/i,
  /finance[_-\s]?(?:output|claim|result|ready)/i,
  /financial[_-\s]?attribution/i,
  /causal(?:ity)?/i,
  /\bcaused\b/i,
  /\bproductivity\b/i,
  /customer[-_\s]?facing/i
];

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as AnyRecord;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function clone(value: unknown): any {
  if (value === undefined || value === null) return null;
  return JSON.parse(JSON.stringify(value));
}

function asRecord(value: unknown): AnyRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as AnyRecord)
    : {};
}

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function falseMap(keys: readonly string[]): Record<string, boolean> {
  return Object.fromEntries(keys.map((key) => [key, false]));
}

function sanitizeGaps(gaps: string[]): string[] {
  return [...new Set(gaps.filter(Boolean))].sort();
}

function sourceRuntimeFromInput(input: unknown): any {
  const record = asRecord(input);
  const sourceRuntimeEnvelope = asRecord(record.source_runtime);
  if (sourceRuntimeEnvelope.source_runtime) return sourceRuntimeEnvelope.source_runtime;
  return record.source_runtime ?? input;
}

function sourceRuntimeValidationOptions(input: unknown): AnyRecord {
  const record = asRecord(input);
  const sourceRuntimeEnvelope = asRecord(record.source_runtime);
  const source = sourceRuntimeEnvelope.source_runtime ? sourceRuntimeEnvelope : record;
  return {
    sourceGate: source.source_gate ?? source.sourceGate,
    aggregateMeasurementCellWindows:
      source.aggregate_measurement_cell_windows ??
      source.aggregateMeasurementCellWindows
  };
}

function sourceDiagnosticsSufficiencyEvidenceFromInput(input: unknown): any {
  return buildContributionAlignmentDiagnosticsSufficiencyEvidenceFromGovernedSource(
    sourceGovernedDiagnosticsSufficiencyEvidenceSourceFromInput(input)
  );
}

function sourceGovernedDiagnosticsSufficiencyEvidenceSourceFromInput(input: unknown): any {
  return asRecord(input).source_diagnostics_sufficiency_evidence ?? null;
}

function inputBoundaryGaps(input: unknown): string[] {
  const record = asRecord(input);
  if (!Object.prototype.hasOwnProperty.call(record, "source_runtime")) return [];
  const sidecar = Object.fromEntries(
    Object.entries(record).filter(([key]) => !ALLOWED_INPUT_FIELDS.has(key))
  );
  const sourceRuntimeEnvelope = asRecord(record.source_runtime);
  const nestedSidecar =
    sourceRuntimeEnvelope.source_runtime
      ? Object.fromEntries(
          Object.entries(sourceRuntimeEnvelope).filter(
            ([key]) => !ALLOWED_SOURCE_RUNTIME_ENVELOPE_FIELDS.has(key)
          )
        )
      : {};
  return Object.keys(sidecar).length > 0 || Object.keys(nestedSidecar).length > 0
    ? ["input wrapper rejected unsafe or unsupported content"]
    : [];
}

function safeId(value: unknown, prefix: string): string | null {
  return typeof value === "string" && new RegExp(`^${prefix}_[0-9a-f]{16}$`).test(value)
    ? value
    : null;
}

function safeHash(value: unknown): string | null {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value) ? value : null;
}

function sourceRuntimeRef(sourceRuntime: any): AnyRecord {
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

function sourceDiagnosticsSufficiencyEvidenceRef(evidence: any): AnyRecord {
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

function sourceGovernedDiagnosticsSufficiencyEvidenceSourceRef(source: any, projectedEvidence: any): AnyRecord {
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

function artifactHash(artifact: unknown): string {
  const withoutHash = clone(artifact);
  delete withoutHash.artifact_hash;
  return sha256Json(withoutHash);
}

function sufficiencyEvidenceHash(evidence: unknown): string {
  const withoutHash = clone(evidence);
  delete withoutHash.evidence_hash;
  return sha256Json(withoutHash);
}

function diagnosticsEvidenceRef(dimension: string): string {
  return `internal_diagnostics_sufficiency_evidence.${dimension}.2026_06`;
}

function diagnosticsDimensionHash(
  sourceRuntime: any,
  dimension: string,
  sourceEvidenceRef: unknown,
  reviewedSourceEvidenceHash: unknown
): string {
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

function sourceDiagnosticsSufficiencyEvidenceGaps(sourceRuntime: any, evidence: any): string[] {
  if (!evidence) return [];
  const source = asRecord(evidence);
  const dimensions = asRecord(source.evidence_dimensions);
  const gaps: string[] = [];
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

function sourceGovernedDiagnosticsSufficiencyEvidenceSourceGaps(
  sourceRuntime: any,
  source: any,
  projectedEvidence: any
): string[] {
  if (!source) return [];
  const record = asRecord(source);
  const gaps: string[] = [];
  const hasGovernedSourceSchema =
    record.schema_version ===
    CONTRIBUTION_ALIGNMENT_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE_SCHEMA_VERSION;
  if (!hasGovernedSourceSchema) {
    gaps.push("governed diagnostics sufficiency evidence source schema_version is invalid");
  }
  if (record.source_state !== GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE_READY_STATE) {
    gaps.push("governed diagnostics sufficiency evidence source is not ready for review");
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
    gaps.push("governed diagnostics sufficiency evidence source must feed diagnostics evidence packet");
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

function validSufficiencyEvidence(sourceRuntime: any, evidence: any): boolean {
  return Boolean(evidence) && sourceDiagnosticsSufficiencyEvidenceGaps(sourceRuntime, evidence).length === 0;
}

function hasForbiddenContent(value: unknown, path = "review"): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => hasForbiddenContent(item, `${path}[${index}]`));
  }
  if (value && typeof value === "object") {
    const gaps: string[] = [];
    for (const [key, nested] of Object.entries(value)) {
      const safeFalseFlag =
        nested === false &&
        (
          path === "review.review_policy" ||
          path === "review.comparison_design_adequacy" ||
          path === "review.model_diagnostics" ||
          path === "review.boundary_checks" ||
          path === "review.promotion_review" ||
          path === "review.reviewed_fixture_artifact_ref" ||
          path === "review.feeds" ||
          path === "review.boundary_policy"
        );
      const safeReviewField =
        (
          path === "review.review_policy" &&
          REVIEW_POLICY_FIELDS.includes(key)
        ) ||
        (
          path === "review.source_governed_diagnostics_sufficiency_evidence_source_ref" &&
          SOURCE_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE_REF_FIELDS.includes(key)
        ) ||
        (
          path === "review.data_adequacy" &&
          DATA_ADEQUACY_FIELDS.includes(key)
        ) ||
        (
          path === "review.comparison_design_adequacy" &&
          COMPARISON_DESIGN_ADEQUACY_FIELDS.includes(key)
        ) ||
        (
          path === "review.model_diagnostics" &&
          MODEL_DIAGNOSTICS_FIELDS.includes(key)
        ) ||
        (
          path === "review.boundary_checks" &&
          BOUNDARY_CHECK_FIELDS.includes(key)
        ) ||
        (
          path === "review.reviewed_fixture_artifact_ref" &&
          REVIEWED_FIXTURE_ARTIFACT_REF_FIELDS.includes(key)
        ) ||
        (
          path === "review.promotion_review" &&
          PROMOTION_REVIEW_FIELDS.includes(key)
        ) ||
        (
          path === "review.feeds" &&
          FEED_FIELDS.includes(key)
        ) ||
        (
          path === "review.boundary_policy" &&
          BOUNDARY_POLICY_FIELDS.includes(key)
        );
      if (
        !safeFalseFlag &&
        !safeReviewField &&
        FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key))
      ) {
        gaps.push("review contains forbidden field name");
        continue;
      }
      gaps.push(...hasForbiddenContent(nested, `${path}.${key}`));
    }
    return gaps;
  }
  if (typeof value !== "string") return [];
  if (
    path.startsWith("review.blocked_uses[") ||
    path.startsWith("review.required_caveats[")
  ) {
    return [];
  }
  return FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))
    ? [`${path} contains unsafe source or output language`]
    : [];
}

function sourceRuntimeGaps(sourceRuntime: any, validationOptions: AnyRecord = {}): string[] {
  const source = asRecord(sourceRuntime);
  const artifact = asRecord(source.internal_fit_artifact);
  const design = asRecord(source.aggregate_design_matrix);
  const gaps: string[] = [];
  const runtimeValidation = validateContributionAlignmentInternalBayesianExecutionRuntime(source, {
    ...validationOptions
  });
  if (runtimeValidation.valid !== true) {
    gaps.push("source_runtime failed internal Bayesian execution runtime validation");
    gaps.push(...runtimeValidation.gaps.map((gap: string) => `source_runtime.${gap}`));
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
    gaps.push("sourceRuntime hash drifted");
  }
  if (source.validation_summary?.valid !== true) {
    gaps.push("source_runtime.validation_summary is not valid");
  }
  if (source.source_bound !== true) {
    gaps.push("source_runtime is not source-bound");
  }
  if (source.runtime_policy?.internal_only !== true) {
    gaps.push("source_runtime is not internal-only");
  }
  if (source.runtime_policy?.aggregate_only_runtime !== true) {
    gaps.push("source_runtime is not aggregate-only");
  }
  if (source.allowed_next_step !== REQUIRED_RUNTIME_NEXT_STEP) {
    gaps.push("source_runtime.allowed_next_step must require diagnostics and model adequacy review");
  }
  for (const field of [
    "posterior_output_review_gate_authorized",
    "posterior_output_authorized",
    "confidence_output_authorized",
    "probability_output_authorized",
    "finance_output_authorized",
    "customer_output_authorized"
  ]) {
    if (source.runtime_policy?.[field] !== false) {
      gaps.push(`source_runtime.${field} must be false`);
    }
  }
  if (source.feeds?.internal_diagnostics_and_model_adequacy_review !== true) {
    gaps.push("source_runtime does not feed diagnostics and model adequacy review");
  }
  for (const feed of [
    "posterior_output_review_gate",
    "confidence_output",
    "probability_output",
    "score_like_output",
    "finance_output",
    "roi_output",
    "causality_output",
    "productivity_output",
    "customer_facing_output"
  ]) {
    if (source.feeds?.[feed] !== false) {
      gaps.push(`source_runtime.feeds.${feed} must be false`);
    }
  }
  if (design.window_count !== 4) gaps.push("source_runtime aggregate window count must be 4");
  if (design.required_window_roles_present !== true) {
    gaps.push("source_runtime pre/post window roles are not sufficient");
  }
  if (design.required_comparison_roles_present !== true) {
    gaps.push("source_runtime treatment/comparison roles are not sufficient");
  }
  if (design.raw_row_count !== 0) gaps.push("source_runtime must not include raw rows");
  if (design.identifier_count !== 0) gaps.push("source_runtime must not include identifiers");
  if (design.query_text_present !== false) gaps.push("source_runtime must not include query text");
  if (design.missing_window_count !== 0) {
    gaps.push("source_runtime must not include missing aggregate windows");
  }
  if (design.suppressed_window_count !== 0) {
    gaps.push("source_runtime must not include suppressed aggregate windows");
  }
  if (design.held_window_count !== 0) {
    gaps.push("source_runtime must not include held aggregate windows");
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
  for (const field of DIAGNOSTIC_SOURCE_FIELDS) {
    if (typeof artifact[field] !== "boolean") {
      gaps.push(`source_runtime internal fixture artifact ${field} must exist`);
    }
  }
  if (artifact.interpretation_ready !== false) {
    gaps.push("source_runtime internal fixture artifact interpretation_ready must be false");
  }
  if (artifact.probability_value_present !== false) {
    gaps.push("source_runtime internal fixture artifact has probability value");
  }
  if (artifact.confidence_language_present !== false) {
    gaps.push("source_runtime internal fixture artifact has confidence language");
  }
  if (artifact.customer_output_present !== false) {
    gaps.push("source_runtime internal fixture artifact has customer output");
  }
  return sanitizeGaps(gaps);
}

function diagnosticFieldsPresent(artifact: any): boolean {
  return DIAGNOSTIC_SOURCE_FIELDS.every((field) => typeof artifact?.[field] === "boolean");
}

function buildDataAdequacy(sourceRuntime: any, ready: boolean): AnyRecord {
  const design = asRecord(sourceRuntime?.aggregate_design_matrix);
  const checks = {
    minimum_eligible_aggregate_windows_present: ready && design.window_count === 4,
    pre_post_window_sufficiency_present: ready && design.required_window_roles_present === true,
    treatment_comparison_available: ready && design.required_comparison_roles_present === true,
    suppression_status_respected:
      ready && typeof design.minimum_cohort_size === "number" && design.minimum_cohort_size >= 5,
    missing_or_suppressed_windows_fail_closed:
      ready &&
      design.missing_window_count === 0 &&
      design.suppressed_window_count === 0 &&
      design.held_window_count === 0,
    missing_window_count_zero: ready && design.missing_window_count === 0,
    suppressed_window_count_zero: ready && design.suppressed_window_count === 0,
    held_window_count_zero: ready && design.held_window_count === 0,
    raw_row_count_zero: ready && design.raw_row_count === 0,
    identifier_count_zero: ready && design.identifier_count === 0,
    query_text_absent: ready && design.query_text_present === false
  };
  return {
    ...checks,
    data_adequacy_satisfied: Object.values(checks).every(Boolean)
  };
}

function buildComparisonDesignAdequacy(sourceRuntime: any, ready: boolean, evidenceReady: boolean): AnyRecord {
  return {
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
}

function buildModelDiagnostics(sourceRuntime: any, ready: boolean, evidenceReady: boolean): AnyRecord {
  const artifact = asRecord(sourceRuntime?.internal_fit_artifact);
  const diagnostics = {
    convergence_diagnostics_required: true,
    convergence_diagnostics_satisfied: ready && evidenceReady,
    posterior_predictive_checks_required: true,
    posterior_predictive_checks_satisfied: ready && evidenceReady,
    prior_sensitivity_required: true,
    prior_sensitivity_satisfied: ready && evidenceReady,
    residual_fit_checks_required: true,
    residual_fit_checks_satisfied: ready && evidenceReady,
    calibration_backtest_required: true,
    calibration_backtest_satisfied: ready && evidenceReady,
    all_required_diagnostic_fields_present: ready && diagnosticFieldsPresent(artifact)
  };
  return {
    ...diagnostics,
    model_diagnostics_satisfied:
      diagnostics.convergence_diagnostics_satisfied &&
      diagnostics.posterior_predictive_checks_satisfied &&
      diagnostics.prior_sensitivity_satisfied &&
      diagnostics.residual_fit_checks_satisfied &&
      diagnostics.calibration_backtest_satisfied
  };
}

function buildBoundaryChecks(sourceRuntime: any, ready: boolean): AnyRecord {
  const artifact = asRecord(sourceRuntime?.internal_fit_artifact);
  return {
    runtime_fixture_prototype_only:
      ready && sourceRuntime?.runtime_execution_class === REQUIRED_RUNTIME_CLASS,
    posterior_values_contained:
      ready && typeof artifact.posterior_mean_internal === "number" && typeof artifact.posterior_sd_internal === "number",
    posterior_numeric_values_withheld: ready,
    posterior_interpretation_blocked: true,
    confidence_probability_blocked: true,
    feature_weights_structural_internal_only: true,
    feature_weights_not_confidence_scores: true,
    customer_economic_output_blocked: true,
    live_connector_execution_blocked: true
  };
}

function reviewedFixtureArtifactRef(sourceRuntime: any, ready: boolean): AnyRecord {
  const artifact = asRecord(sourceRuntime?.internal_fit_artifact);
  return {
    artifact_state: ready ? artifact.artifact_state : null,
    estimand_parameter: ready ? artifact.estimand_parameter : null,
    artifact_hash: ready ? safeHash(artifact.artifact_hash) : null,
    diagnostic_fields_present: ready && diagnosticFieldsPresent(artifact),
    numeric_posterior_values_withheld: ready,
    output_value_present: false
  };
}

function buildPromotionReview(ready: boolean, evidenceReady = false): AnyRecord {
  return {
    adequacy_review_completed: ready,
    promotion_authorized: false,
    promotion_blocked: true,
    blocking_reason: ready
      ? evidenceReady
        ? "diagnostics_and_model_adequacy_satisfied_promotion_decision_required"
        : "diagnostics_and_model_adequacy_unsatisfied"
      : "diagnostics_and_model_adequacy_source_not_ready",
    explicit_later_promotion_decision_required: true,
    posterior_interpretation_blocked: true,
    confidence_probability_blocked: true,
    customer_economic_output_blocked: true
  };
}

function buildReview(
  sourceRuntime: any,
  sourceGovernedDiagnosticsSufficiencyEvidenceSource: any,
  sourceDiagnosticsSufficiencyEvidence: any,
  state: string,
  gaps: string[]
): AnyRecord {
  const ready = state === COMPLETED_STATE;
  const evidenceReady = validSufficiencyEvidence(
    sourceRuntime,
    sourceDiagnosticsSufficiencyEvidence
  );
  const review: AnyRecord = {
    schema_version: CONTRIBUTION_ALIGNMENT_INTERNAL_DIAGNOSTICS_MODEL_ADEQUACY_REVIEW_SCHEMA_VERSION,
    review_id: `contribution_alignment_internal_diagnostics_model_adequacy_review_${sha256Json({
      runtime_id: sourceRuntime?.runtime_id ?? null,
      runtime_hash: sourceRuntime?.runtime_hash ?? null,
      artifact_hash: sourceRuntime?.internal_fit_artifact?.artifact_hash ?? null,
      review_version: REVIEW_VERSION
    }).slice(0, 16)}`,
    review_state: state,
    review_class: ready ? REVIEW_CLASS : null,
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
    review_version: ready ? REVIEW_VERSION : null,
    review_policy: {
      internal_only: true,
      aggregate_only: ready,
      adequacy_review_only: true,
      promotion_authorized: false,
      posterior_interpretation_authorized: false,
      posterior_output_authorized: false,
      confidence_output_authorized: false,
      probability_output_authorized: false,
      finance_output_authorized: false,
      customer_output_authorized: false
    },
    data_adequacy: buildDataAdequacy(sourceRuntime, ready),
    comparison_design_adequacy: buildComparisonDesignAdequacy(
      sourceRuntime,
      ready,
      evidenceReady
    ),
    model_diagnostics: buildModelDiagnostics(sourceRuntime, ready, evidenceReady),
    boundary_checks: buildBoundaryChecks(sourceRuntime, ready),
    reviewed_fixture_artifact_ref: reviewedFixtureArtifactRef(sourceRuntime, ready),
    promotion_review: buildPromotionReview(ready, evidenceReady),
    allowed_next_step: ready ? READY_NEXT_STEP : HELD_NEXT_STEP,
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    required_caveats: [...REQUIRED_CAVEATS],
    feeds: {
      bayesian_promotion_decision_gate: ready,
      ...falseMap(FEED_FIELDS.filter((field) => field !== "bayesian_promotion_decision_gate"))
    },
    boundary_policy: {
      receives_internal_bayesian_fixture_runtime_only: state !== REJECT_STATE,
      receives_aggregate_measurement_cell_windows: state !== REJECT_STATE,
      receives_fit_artifact_ref: state !== REJECT_STATE,
      ...falseMap(
        BOUNDARY_POLICY_FIELDS.filter((field) =>
          ![
            "receives_internal_bayesian_fixture_runtime_only",
            "receives_aggregate_measurement_cell_windows",
            "receives_fit_artifact_ref"
          ].includes(field)
        )
      )
    },
    validation_summary: {
      schema_version: `${CONTRIBUTION_ALIGNMENT_INTERNAL_DIAGNOSTICS_MODEL_ADEQUACY_REVIEW_SCHEMA_VERSION}_SUMMARY`,
      valid: ready,
      review_state: state,
      gaps: ready ? [] : sanitizeGaps(gaps)
    }
  };
  review.review_hash = contributionAlignmentInternalDiagnosticsModelAdequacyReviewHash(review);
  return review;
}

function rejectedReview(): AnyRecord {
  const review: AnyRecord = {
    schema_version: CONTRIBUTION_ALIGNMENT_INTERNAL_DIAGNOSTICS_MODEL_ADEQUACY_REVIEW_SCHEMA_VERSION,
    review_id: null,
    review_state: REJECT_STATE,
    generated_at: "2026-06-25T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    source_bound: false,
    reviewed_fixture_artifact_ref: {
      artifact_state: null,
      estimand_parameter: null,
      artifact_hash: null,
      diagnostic_fields_present: false,
      numeric_posterior_values_withheld: false,
      output_value_present: false
    },
    promotion_review: buildPromotionReview(false),
    validation_summary: {
      schema_version: `${CONTRIBUTION_ALIGNMENT_INTERNAL_DIAGNOSTICS_MODEL_ADEQUACY_REVIEW_SCHEMA_VERSION}_SUMMARY`,
      valid: false,
      review_state: REJECT_STATE,
      gaps: ["boundary leakage rejected"]
    }
  };
  review.review_hash = contributionAlignmentInternalDiagnosticsModelAdequacyReviewHash(review);
  return review;
}

export function contributionAlignmentInternalDiagnosticsModelAdequacyReviewHash(review: unknown): string {
  const withoutHash = clone(review);
  delete withoutHash.review_hash;
  return sha256Json(withoutHash);
}

export function buildContributionAlignmentInternalDiagnosticsModelAdequacyReviewFromObject(input: unknown): AnyRecord {
  const wrapperGaps = inputBoundaryGaps(input);
  if (wrapperGaps.length > 0) return rejectedReview();
  const sourceRuntime = sourceRuntimeFromInput(input);
  const runtimeValidationOptions = sourceRuntimeValidationOptions(input);
  const sourceGovernedDiagnosticsSufficiencyEvidenceSource =
    sourceGovernedDiagnosticsSufficiencyEvidenceSourceFromInput(input);
  const sourceDiagnosticsSufficiencyEvidence =
    sourceDiagnosticsSufficiencyEvidenceFromInput(input);
  const gaps = sanitizeGaps([
    ...sourceRuntimeGaps(sourceRuntime, runtimeValidationOptions),
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
  return buildReview(
    sourceRuntime,
    sourceGovernedDiagnosticsSufficiencyEvidenceSource,
    sourceDiagnosticsSufficiencyEvidence,
    gaps.length === 0 ? COMPLETED_STATE : HOLD_STATE,
    gaps
  );
}

function collectAllowedFieldsGaps(record: unknown, fields: Set<string>, label: string): string[] {
  return Object.keys(asRecord(record))
    .filter((key) => !fields.has(key))
    .map(() => `${label} contains ungoverned field`);
}

function collectRefGaps(record: unknown, fields: string[], label: string): string[] {
  const ref = asRecord(record);
  const gaps: string[] = [];
  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(ref, field)) gaps.push(`${label}.${field} is required`);
  }
  gaps.push(...collectAllowedFieldsGaps(ref, new Set(fields), label));
  return gaps;
}

function rejectValidation(review: any): AnyRecord | null {
  if (review?.review_state !== REJECT_STATE) return null;
  return {
    schema_version: VALIDATION_SCHEMA_VERSION,
    valid: false,
    gaps: ["boundary leakage rejected"]
  };
}

function collectShapeGaps(review: any): string[] {
  const rejected = rejectValidation(review);
  if (rejected) return rejected.gaps;

  const record = asRecord(review);
  const gaps: string[] = [];
  gaps.push(...collectAllowedFieldsGaps(record, TOP_LEVEL_FIELDS, "review"));
  if (record.schema_version !== CONTRIBUTION_ALIGNMENT_INTERNAL_DIAGNOSTICS_MODEL_ADEQUACY_REVIEW_SCHEMA_VERSION) {
    gaps.push("schema_version is invalid");
  }
  if (![COMPLETED_STATE, HOLD_STATE].includes(record.review_state)) {
    gaps.push("review_state is invalid");
  }
  const ready = record.review_state === COMPLETED_STATE;
  if (record.source_bound !== ready) gaps.push(`source_bound must be ${ready}`);
  if (record.review_class !== (ready ? REVIEW_CLASS : null)) {
    gaps.push(`review_class must be ${ready ? REVIEW_CLASS : "null"}`);
  }
  if (record.review_version !== (ready ? REVIEW_VERSION : null)) {
    gaps.push(`review_version must be ${ready ? REVIEW_VERSION : "null"}`);
  }
  if (ready && record.allowed_next_step !== READY_NEXT_STEP) {
    gaps.push(`allowed_next_step must be ${READY_NEXT_STEP}`);
  }
  if (!ready && record.allowed_next_step !== HELD_NEXT_STEP) {
    gaps.push(`allowed_next_step must be ${HELD_NEXT_STEP}`);
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

  const policy = asRecord(record.review_policy);
  gaps.push(...collectRefGaps(policy, REVIEW_POLICY_FIELDS, "review_policy"));
  for (const [field, expected] of Object.entries({
    internal_only: true,
    aggregate_only: ready,
    adequacy_review_only: true,
    promotion_authorized: false,
    posterior_interpretation_authorized: false,
    posterior_output_authorized: false,
    confidence_output_authorized: false,
    probability_output_authorized: false,
    finance_output_authorized: false,
    customer_output_authorized: false
  })) {
    if (policy[field] !== expected) gaps.push(`review_policy.${field} must be ${expected}`);
  }

  const data = asRecord(record.data_adequacy);
  gaps.push(...collectRefGaps(data, DATA_ADEQUACY_FIELDS, "data_adequacy"));
  if (ready) {
    for (const field of DATA_ADEQUACY_FIELDS) {
      if (data[field] !== true) gaps.push(`data_adequacy.${field} must be true`);
    }
  }

  const comparison = asRecord(record.comparison_design_adequacy);
  gaps.push(...collectRefGaps(comparison, COMPARISON_DESIGN_ADEQUACY_FIELDS, "comparison_design_adequacy"));
  for (const [field, expected] of Object.entries({
    aggregate_measurement_cell_grain: ready,
    treatment_group_defined: ready,
    comparison_group_defined: ready,
    no_person_level_fields: ready,
    no_unsupported_cross_slice_aggregation: ready,
    causal_claim_authorized: false
  })) {
    if (comparison[field] !== expected) gaps.push(`comparison_design_adequacy.${field} must be ${expected}`);
  }
  if (typeof comparison.comparison_design_review_present !== "boolean") {
    gaps.push("comparison_design_adequacy.comparison_design_review_present must be boolean");
  }
  if (typeof comparison.comparison_design_adequacy_satisfied !== "boolean") {
    gaps.push("comparison_design_adequacy.comparison_design_adequacy_satisfied must be boolean");
  }
  if (comparison.comparison_design_adequacy_satisfied !== comparison.comparison_design_review_present) {
    gaps.push("comparison_design_adequacy satisfied state must match review presence");
  }

  const diagnostics = asRecord(record.model_diagnostics);
  gaps.push(...collectRefGaps(diagnostics, MODEL_DIAGNOSTICS_FIELDS, "model_diagnostics"));
  for (const [field, expected] of Object.entries({
    convergence_diagnostics_required: true,
    posterior_predictive_checks_required: true,
    prior_sensitivity_required: true,
    residual_fit_checks_required: true,
    calibration_backtest_required: true,
    all_required_diagnostic_fields_present: ready
  })) {
    if (diagnostics[field] !== expected) gaps.push(`model_diagnostics.${field} must be ${expected}`);
  }
  const diagnosticSatisfiedFields = [
    "convergence_diagnostics_satisfied",
    "posterior_predictive_checks_satisfied",
    "prior_sensitivity_satisfied",
    "residual_fit_checks_satisfied",
    "calibration_backtest_satisfied"
  ];
  for (const field of diagnosticSatisfiedFields) {
    if (typeof diagnostics[field] !== "boolean") {
      gaps.push(`model_diagnostics.${field} must be boolean`);
    }
  }
  const modelDiagnosticsSatisfied =
    diagnosticSatisfiedFields.every((field) => diagnostics[field] === true);
  if (diagnostics.model_diagnostics_satisfied !== modelDiagnosticsSatisfied) {
    gaps.push("model_diagnostics.model_diagnostics_satisfied must match diagnostic satisfaction fields");
  }
  const adequacySatisfied =
    comparison.comparison_design_adequacy_satisfied === true &&
    diagnostics.model_diagnostics_satisfied === true;
  if (
    adequacySatisfied &&
    safeHash(record.source_diagnostics_sufficiency_evidence_ref?.evidence_hash) === null
  ) {
    gaps.push("source_diagnostics_sufficiency_evidence_ref.evidence_hash is required when diagnostics are satisfied");
  }

  const boundaryChecks = asRecord(record.boundary_checks);
  gaps.push(...collectRefGaps(boundaryChecks, BOUNDARY_CHECK_FIELDS, "boundary_checks"));
  for (const [field, expected] of Object.entries({
    runtime_fixture_prototype_only: ready,
    posterior_values_contained: ready,
    posterior_numeric_values_withheld: ready,
    posterior_interpretation_blocked: true,
    confidence_probability_blocked: true,
    feature_weights_structural_internal_only: true,
    feature_weights_not_confidence_scores: true,
    customer_economic_output_blocked: true,
    live_connector_execution_blocked: true
  })) {
    if (boundaryChecks[field] !== expected) gaps.push(`boundary_checks.${field} must be ${expected}`);
  }

  const artifactRef = asRecord(record.reviewed_fixture_artifact_ref);
  gaps.push(...collectRefGaps(artifactRef, REVIEWED_FIXTURE_ARTIFACT_REF_FIELDS, "reviewed_fixture_artifact_ref"));
  if (ready) {
    if (artifactRef.artifact_state !== "INTERNAL_POSTERIOR_CANDIDATE_HELD_FOR_OUTPUT_REVIEW") {
      gaps.push("reviewed_fixture_artifact_ref.artifact_state is invalid");
    }
    if (artifactRef.estimand_parameter !== "delta_ai_post") {
      gaps.push("reviewed_fixture_artifact_ref.estimand_parameter is invalid");
    }
    if (!safeHash(artifactRef.artifact_hash)) {
      gaps.push("reviewed_fixture_artifact_ref.artifact_hash is invalid");
    }
    if (artifactRef.diagnostic_fields_present !== true) {
      gaps.push("reviewed_fixture_artifact_ref.diagnostic_fields_present must be true");
    }
    if (artifactRef.numeric_posterior_values_withheld !== true) {
      gaps.push("reviewed_fixture_artifact_ref must withhold posterior numeric values");
    }
  }
  if (artifactRef.output_value_present !== false) {
    gaps.push("reviewed_fixture_artifact_ref must not present output values");
  }
  for (const forbidden of [
    "posterior_mean_internal",
    "posterior_sd_internal",
    "did_observed_estimate",
    "did_standard_error"
  ]) {
    if (Object.prototype.hasOwnProperty.call(artifactRef, forbidden)) {
      gaps.push("reviewed_fixture_artifact_ref must not echo posterior numeric values");
    }
  }

  const promotion = asRecord(record.promotion_review);
  gaps.push(...collectRefGaps(promotion, PROMOTION_REVIEW_FIELDS, "promotion_review"));
  for (const [field, expected] of Object.entries({
    adequacy_review_completed: ready,
    promotion_authorized: false,
    promotion_blocked: true,
    explicit_later_promotion_decision_required: true,
    posterior_interpretation_blocked: true,
    confidence_probability_blocked: true,
    customer_economic_output_blocked: true
  })) {
    if (promotion[field] !== expected) gaps.push(`promotion_review.${field} must be ${expected}`);
  }
  const expectedBlockingReason = ready
    ? adequacySatisfied
      ? "diagnostics_and_model_adequacy_satisfied_promotion_decision_required"
      : "diagnostics_and_model_adequacy_unsatisfied"
    : "diagnostics_and_model_adequacy_source_not_ready";
  if (promotion.blocking_reason !== expectedBlockingReason) {
    gaps.push(`promotion_review.blocking_reason must be ${expectedBlockingReason}`);
  }

  const feeds = asRecord(record.feeds);
  if (feeds.bayesian_promotion_decision_gate !== ready) {
    gaps.push(`feeds.bayesian_promotion_decision_gate must be ${ready}`);
  }
  for (const field of FEED_FIELDS.filter((feed) => feed !== "bayesian_promotion_decision_gate")) {
    if (feeds[field] !== false) gaps.push(`feeds.${field} must be false`);
  }
  for (const key of Object.keys(feeds)) {
    if (!FEED_FIELDS.includes(key)) gaps.push("feeds contains ungoverned field");
  }

  const boundary = asRecord(record.boundary_policy);
  for (const field of BOUNDARY_POLICY_FIELDS) {
    const expected = [
      "receives_internal_bayesian_fixture_runtime_only",
      "receives_aggregate_measurement_cell_windows",
      "receives_fit_artifact_ref"
    ].includes(field);
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
  if (summary.review_state !== record.review_state) {
    gaps.push("validation_summary.review_state must match review_state");
  }
  if (ready && asArray(summary.gaps).length !== 0) {
    gaps.push("validation_summary.gaps must be empty for completed review");
  }
  if (record.review_hash !== contributionAlignmentInternalDiagnosticsModelAdequacyReviewHash(record)) {
    gaps.push("review_hash must match review body");
  }
  gaps.push(...hasForbiddenContent(record));
  return sanitizeGaps(gaps);
}

function collectSourceBindingGaps(review: any, options: AnyRecord = {}): string[] {
  const gaps: string[] = [];
  const sourceGovernedDiagnosticsSufficiencyEvidenceSource =
    options.sourceGovernedDiagnosticsSufficiencyEvidenceSource ?? null;
  const projectedDiagnosticsSufficiencyEvidence =
    buildContributionAlignmentDiagnosticsSufficiencyEvidenceFromGovernedSource(
      sourceGovernedDiagnosticsSufficiencyEvidenceSource
    );
  if (review?.review_state === COMPLETED_STATE && !options.sourceRuntime) {
    gaps.push("sourceRuntime is required for completed diagnostics model adequacy review validation");
  }
  if (
    review?.model_diagnostics?.model_diagnostics_satisfied === true &&
    review?.comparison_design_adequacy?.comparison_design_adequacy_satisfied === true &&
    !sourceGovernedDiagnosticsSufficiencyEvidenceSource
  ) {
    gaps.push("sourceGovernedDiagnosticsSufficiencyEvidenceSource is required for satisfied diagnostics model adequacy review validation");
  }
  if (options.sourceRuntime) {
    const runtimeValidationOptions = sourceRuntimeValidationOptions(options);
    const runtimeGaps = sourceRuntimeGaps(options.sourceRuntime, runtimeValidationOptions);
    if (runtimeGaps.length > 0) gaps.push(...runtimeGaps);
    const expectedFromSource =
      buildContributionAlignmentInternalDiagnosticsModelAdequacyReviewFromObject({
        source_runtime: options.sourceRuntime,
        source_gate: options.sourceGate,
        aggregate_measurement_cell_windows: options.aggregateMeasurementCellWindows,
        ...(sourceGovernedDiagnosticsSufficiencyEvidenceSource
          ? {
              source_diagnostics_sufficiency_evidence:
                sourceGovernedDiagnosticsSufficiencyEvidenceSource
            }
          : {})
      });
    const actualWithoutHash = clone(review);
    const expectedWithoutHash = clone(expectedFromSource);
    delete actualWithoutHash.review_hash;
    delete expectedWithoutHash.review_hash;
    if (stableStringify(actualWithoutHash) !== stableStringify(expectedWithoutHash)) {
      gaps.push("diagnostics model adequacy review binding mismatch against sourceRuntime");
    }
  }
  if (options.expectedReview) {
    const actualWithoutHash = clone(review);
    const expectedWithoutHash = clone(options.expectedReview);
    delete actualWithoutHash.review_hash;
    delete expectedWithoutHash.review_hash;
    if (stableStringify(actualWithoutHash) !== stableStringify(expectedWithoutHash)) {
      gaps.push("diagnostics model adequacy review mismatch against expectedReview");
    }
  }
  if (sourceGovernedDiagnosticsSufficiencyEvidenceSource) {
    gaps.push(...sourceGovernedDiagnosticsSufficiencyEvidenceSourceGaps(
      options.sourceRuntime,
      sourceGovernedDiagnosticsSufficiencyEvidenceSource,
      projectedDiagnosticsSufficiencyEvidence
    ));
    gaps.push(...sourceDiagnosticsSufficiencyEvidenceGaps(
      options.sourceRuntime,
      projectedDiagnosticsSufficiencyEvidence
    ));
  }
  return sanitizeGaps(gaps);
}

export function validateContributionAlignmentInternalDiagnosticsModelAdequacyReview(review: any, options: AnyRecord = {}): AnyRecord {
  if (review?.review_state === REJECT_STATE) {
    return rejectValidation(review) as AnyRecord;
  }
  const gaps = sanitizeGaps([
    ...collectShapeGaps(review),
    ...collectSourceBindingGaps(review, options)
  ]);
  return {
    schema_version: VALIDATION_SCHEMA_VERSION,
    valid: gaps.length === 0 && review?.review_state === COMPLETED_STATE,
    gaps
  };
}
