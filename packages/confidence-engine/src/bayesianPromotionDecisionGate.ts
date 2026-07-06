// Ported verbatim from
// scripts/run_ai_value_contribution_alignment_bayesian_promotion_decision_gate.mjs
// under OpenSpec change add-confidence-engine-workspace (task 3.1, module 13).
// Byte-compatibility contract enforced by the golden parity suite.
// Object.hasOwn adapted to Object.prototype.hasOwnProperty.call for the
// ES2020 lib target (behavior identical).

import { sha256Json } from "./internal/hashing";
import {
  CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_RUNTIME_SCHEMA_VERSION,
  contributionAlignmentInternalBayesianExecutionRuntimeHash,
  validateContributionAlignmentInternalBayesianExecutionRuntime
} from "./internalBayesianExecutionRuntime";
import {
  CONTRIBUTION_ALIGNMENT_INTERNAL_DIAGNOSTICS_MODEL_ADEQUACY_REVIEW_SCHEMA_VERSION,
  contributionAlignmentInternalDiagnosticsModelAdequacyReviewHash
} from "./internalDiagnosticsModelAdequacyReview";
import {
  CONTRIBUTION_ALIGNMENT_DIAGNOSTICS_EVIDENCE_PACKET_SCHEMA_VERSION,
  contributionAlignmentDiagnosticsEvidencePacketHash
} from "./diagnosticsEvidencePacket";

type AnyRecord = Record<string, any>;

export const CONTRIBUTION_ALIGNMENT_BAYESIAN_PROMOTION_DECISION_GATE_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_BAYESIAN_PROMOTION_DECISION_GATE_2026_06";

const VALIDATION_SCHEMA_VERSION =
  `${CONTRIBUTION_ALIGNMENT_BAYESIAN_PROMOTION_DECISION_GATE_SCHEMA_VERSION}_VALIDATION`;

const DERIVATION_VERSION =
  "ai_value_contribution_alignment_bayesian_promotion_decision_gate_2026_06";

const PASSED_STATE =
  "BAYESIAN_PROMOTION_DECISION_PASSED_FOR_INTERNAL_EXECUTION_ARTIFACT_ONLY";
const HOLD_STATE = "HOLD_FOR_DIAGNOSTICS_AND_MODEL_ADEQUACY_SUFFICIENCY";
const REJECT_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";

const GATE_CLASS = "bayesian_promotion_decision_gate_only";
const GATE_VERSION = "bayesian_promotion_decision_gate_2026_06";
const PASSED_NEXT_STEP = "internal_bayesian_execution_artifact_v1_only";
const HELD_NEXT_STEP = "complete_diagnostics_and_model_adequacy_sufficiency";

const REQUIRED_RUNTIME_STATE =
  "INTERNAL_BAYESIAN_FIXTURE_EXECUTION_PROTOTYPE_HELD_FOR_REVIEW";
const REQUIRED_RUNTIME_CLASS = "internal_fixture_prototype_only";
const REQUIRED_REVIEW_STATE =
  "INTERNAL_DIAGNOSTICS_AND_MODEL_ADEQUACY_REVIEW_COMPLETED_PROMOTION_BLOCKED";
const REQUIRED_REVIEW_NEXT_STEP = "bayesian_promotion_decision_gate_only";
const REQUIRED_EVIDENCE_PACKET_STATE =
  "DIAGNOSTICS_EVIDENCE_PACKET_READY_FOR_PROMOTION_DECISION_REVIEW";
const REQUIRED_EVIDENCE_PACKET_NEXT_STEP = "bayesian_promotion_decision_gate_only";
const WEIGHT_PROVENANCE_VERSION = "internal_structural_equal_weights_2026_06";

const TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "gate_id",
  "gate_state",
  "gate_class",
  "generated_at",
  "derivation_version",
  "source_bound",
  "source_runtime_ref",
  "source_diagnostics_review_ref",
  "source_diagnostics_evidence_packet_ref",
  "source_fixture_artifact_ref",
  "gate_version",
  "gate_policy",
  "source_state_checks",
  "diagnostics_sufficiency",
  "governance_containment",
  "feature_weight_policy",
  "promotion_decision",
  "allowed_next_step",
  "blocked_uses",
  "required_caveats",
  "feeds",
  "boundary_policy",
  "validation_summary",
  "gate_hash"
]);

const SOURCE_RUNTIME_REF_FIELDS = [
  "schema_version",
  "runtime_id",
  "runtime_state",
  "runtime_execution_class",
  "runtime_hash"
];

const SOURCE_REVIEW_RUNTIME_REF_FIELDS = [
  ...SOURCE_RUNTIME_REF_FIELDS,
  "runtime_version"
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

const SOURCE_DIAGNOSTICS_REVIEW_REF_FIELDS = [
  "schema_version",
  "review_id",
  "review_state",
  "review_hash",
  "allowed_next_step"
];

const SOURCE_DIAGNOSTICS_EVIDENCE_PACKET_REF_FIELDS = [
  "schema_version",
  "packet_id",
  "packet_state",
  "packet_hash",
  "allowed_next_step"
];

const SOURCE_FIXTURE_ARTIFACT_REF_FIELDS = [
  "artifact_state",
  "estimand_parameter",
  "artifact_hash"
];

const SOURCE_REVIEW_TOP_LEVEL_FIELDS = new Set([
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

const SOURCE_REVIEW_ALLOWED_NESTED_FIELDS = new Map([
  ["sourceDiagnosticsReview.source_runtime_ref", SOURCE_REVIEW_RUNTIME_REF_FIELDS],
  [
    "sourceDiagnosticsReview.source_diagnostics_sufficiency_evidence_ref",
    SOURCE_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_REF_FIELDS
  ],
  [
    "sourceDiagnosticsReview.source_governed_diagnostics_sufficiency_evidence_source_ref",
    SOURCE_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE_REF_FIELDS
  ],
  [
    "sourceDiagnosticsReview.review_policy",
    [
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
    ]
  ],
  [
    "sourceDiagnosticsReview.data_adequacy",
    [
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
    ]
  ],
  [
    "sourceDiagnosticsReview.comparison_design_adequacy",
    [
      "aggregate_measurement_cell_grain",
      "treatment_group_defined",
      "comparison_group_defined",
      "no_person_level_fields",
      "no_unsupported_cross_slice_aggregation",
      "comparison_design_review_present",
      "comparison_design_adequacy_satisfied",
      "causal_claim_authorized"
    ]
  ],
  [
    "sourceDiagnosticsReview.model_diagnostics",
    [
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
    ]
  ],
  [
    "sourceDiagnosticsReview.boundary_checks",
    [
      "runtime_fixture_prototype_only",
      "posterior_values_contained",
      "posterior_numeric_values_withheld",
      "posterior_interpretation_blocked",
      "confidence_probability_blocked",
      "feature_weights_structural_internal_only",
      "feature_weights_not_confidence_scores",
      "customer_economic_output_blocked",
      "live_connector_execution_blocked"
    ]
  ],
  [
    "sourceDiagnosticsReview.reviewed_fixture_artifact_ref",
    [
      "artifact_state",
      "estimand_parameter",
      "artifact_hash",
      "diagnostic_fields_present",
      "numeric_posterior_values_withheld",
      "output_value_present"
    ]
  ],
  [
    "sourceDiagnosticsReview.promotion_review",
    [
      "adequacy_review_completed",
      "promotion_authorized",
      "promotion_blocked",
      "blocking_reason",
      "explicit_later_promotion_decision_required",
      "posterior_interpretation_blocked",
      "confidence_probability_blocked",
      "customer_economic_output_blocked"
    ]
  ],
  [
    "sourceDiagnosticsReview.feeds",
    [
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
    ]
  ],
  [
    "sourceDiagnosticsReview.boundary_policy",
    [
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
    ]
  ],
  [
    "sourceDiagnosticsReview.validation_summary",
    ["schema_version", "valid", "review_state", "gaps"]
  ]
]);

const GATE_POLICY_FIELDS = [
  "internal_only",
  "aggregate_only",
  "promotion_decision_only",
  "promotion_authorized",
  "internal_bayesian_execution_artifact_v1_authorized",
  "posterior_interpretation_authorized",
  "posterior_output_authorized",
  "confidence_output_authorized",
  "probability_output_authorized",
  "finance_output_authorized",
  "customer_output_authorized"
];

const SOURCE_STATE_CHECK_FIELDS = [
  "runtime_fixture_prototype_only",
  "runtime_hash_bound",
  "fixture_artifact_hash_bound",
  "diagnostics_review_completed",
  "diagnostics_review_hash_bound",
  "diagnostics_review_allowed_next_step_bound",
  "diagnostics_evidence_packet_ready",
  "diagnostics_evidence_packet_hash_bound",
  "diagnostics_evidence_packet_allowed_next_step_bound"
];

const DIAGNOSTICS_SUFFICIENCY_FIELDS = [
  "data_adequacy_satisfied",
  "suppressed_missing_held_windows_clear",
  "convergence_diagnostics_satisfied",
  "posterior_predictive_checks_satisfied",
  "prior_sensitivity_satisfied",
  "residual_fit_checks_satisfied",
  "calibration_backtest_satisfied",
  "comparison_design_adequacy_satisfied",
  "all_required_diagnostics_satisfied"
];

const GOVERNANCE_CONTAINMENT_FIELDS = [
  "runtime_fixture_prototype_only",
  "posterior_values_contained",
  "posterior_numeric_values_withheld",
  "posterior_interpretation_blocked",
  "confidence_probability_blocked",
  "customer_economic_output_blocked",
  "live_connector_execution_blocked"
];

const FEATURE_WEIGHT_POLICY_FIELDS = [
  "weights_structural_internal_only",
  "weights_not_confidence_scores",
  "weight_provenance_version_present",
  "weight_provenance_version",
  "weight_provenance_ref",
  "customer_facing_weight_output"
];

const PROMOTION_DECISION_FIELDS = [
  "promotion_authorized",
  "promotion_blocked",
  "decision",
  "explicit_next_slice_required",
  "internal_execution_artifact_v1_only",
  "posterior_interpretation_blocked",
  "confidence_probability_blocked",
  "customer_economic_output_blocked"
];

const FEED_FIELDS = [
  "internal_bayesian_execution_artifact_v1",
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
  "receives_diagnostics_model_adequacy_review",
  "receives_internal_bayesian_fixture_runtime_ref",
  "receives_fixture_artifact_ref",
  "receives_posterior_numeric_values",
  "receives_raw_rows",
  "receives_query_text",
  "receives_identifiers",
  "persists_decision",
  "creates_internal_execution_artifact",
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
  "source_diagnostics_review",
  "source_runtime",
  "source_gate",
  "aggregate_measurement_cell_windows",
  "source_diagnostics_evidence_packet",
  "generated_at"
]);

const ALLOWED_SOURCE_RUNTIME_ENVELOPE_FIELDS = new Set([
  "source_runtime",
  "source_gate",
  "sourceGate",
  "aggregate_measurement_cell_windows",
  "aggregateMeasurementCellWindows"
]);

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
  "Bayesian Promotion Decision Gate is internal-only and aggregate-only.",
  "Passed state authorizes only a later Internal Bayesian Execution Artifact v1 slice.",
  "The gate does not create an execution artifact, interpret posterior values, or emit confidence or probability language.",
  "Customer-facing, ROI, finance, causality, productivity, live connector, route, UI, schema, export, and persistence behavior remains blocked."
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
  return value && typeof value === "object" && !Array.isArray(value) ? (value as AnyRecord) : {};
}

function falseMap(keys: readonly string[]): Record<string, boolean> {
  return Object.fromEntries(keys.map((key) => [key, false]));
}

function sanitizeGaps(gaps: string[]): string[] {
  return [...new Set(gaps.filter(Boolean))].sort();
}

function safeId(value: unknown, prefix: string): string | null {
  return typeof value === "string" && new RegExp(`^${prefix}_[0-9a-f]{16}$`).test(value)
    ? value
    : null;
}

function safeHash(value: unknown): string | null {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value) ? value : null;
}

function sourceDiagnosticsReviewFromInput(input: unknown): any {
  const record = asRecord(input);
  return record.source_diagnostics_review ?? input;
}

function sourceRuntimeFromInput(input: unknown): any {
  const record = asRecord(input);
  const sourceRuntimeEnvelope = asRecord(record.source_runtime);
  if (sourceRuntimeEnvelope.source_runtime) return sourceRuntimeEnvelope.source_runtime;
  return record.source_runtime ?? null;
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

function sourceDiagnosticsEvidencePacketFromInput(input: unknown): any {
  return asRecord(input).source_diagnostics_evidence_packet ?? null;
}

function inputBoundaryGaps(input: unknown): string[] {
  const record = asRecord(input);
  if (
    !Object.prototype.hasOwnProperty.call(record, "source_diagnostics_review") &&
    !Object.prototype.hasOwnProperty.call(record, "source_runtime")
  ) return [];
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

function sourceRuntimeRef(sourceRuntime: any, review: any): AnyRecord {
  const runtime = asRecord(sourceRuntime);
  const ref = asRecord(review?.source_runtime_ref);
  return {
    schema_version:
      runtime.schema_version === CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_RUNTIME_SCHEMA_VERSION
        ? runtime.schema_version
        : ref.schema_version === CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_RUNTIME_SCHEMA_VERSION
          ? ref.schema_version
          : null,
    runtime_id: safeId(
      runtime.runtime_id ?? ref.runtime_id,
      "contribution_alignment_internal_bayesian_execution_runtime"
    ),
    runtime_state:
      (runtime.runtime_state ?? ref.runtime_state) === REQUIRED_RUNTIME_STATE
        ? REQUIRED_RUNTIME_STATE
        : null,
    runtime_execution_class:
      (runtime.runtime_execution_class ?? ref.runtime_execution_class) === REQUIRED_RUNTIME_CLASS
        ? REQUIRED_RUNTIME_CLASS
        : null,
    runtime_hash: safeHash(runtime.runtime_hash ?? ref.runtime_hash)
  };
}

function sourceDiagnosticsReviewRef(review: any): AnyRecord {
  return {
    schema_version:
      review?.schema_version === CONTRIBUTION_ALIGNMENT_INTERNAL_DIAGNOSTICS_MODEL_ADEQUACY_REVIEW_SCHEMA_VERSION
        ? review.schema_version
        : null,
    review_id: safeId(
      review?.review_id,
      "contribution_alignment_internal_diagnostics_model_adequacy_review"
    ),
    review_state: review?.review_state === REQUIRED_REVIEW_STATE ? REQUIRED_REVIEW_STATE : null,
    review_hash: safeHash(review?.review_hash),
    allowed_next_step:
      review?.allowed_next_step === REQUIRED_REVIEW_NEXT_STEP ? REQUIRED_REVIEW_NEXT_STEP : null
  };
}

function sourceDiagnosticsEvidencePacketRef(packet: any): AnyRecord {
  return {
    schema_version:
      packet?.schema_version === CONTRIBUTION_ALIGNMENT_DIAGNOSTICS_EVIDENCE_PACKET_SCHEMA_VERSION
        ? packet.schema_version
        : null,
    packet_id: safeId(
      packet?.packet_id,
      "contribution_alignment_diagnostics_evidence_packet"
    ),
    packet_state:
      packet?.packet_state === REQUIRED_EVIDENCE_PACKET_STATE
        ? REQUIRED_EVIDENCE_PACKET_STATE
        : null,
    packet_hash: safeHash(packet?.packet_hash),
    allowed_next_step:
      packet?.allowed_next_step === REQUIRED_EVIDENCE_PACKET_NEXT_STEP
        ? REQUIRED_EVIDENCE_PACKET_NEXT_STEP
        : null
  };
}

function sourceFixtureArtifactRef(review: any, sourceRuntime: any): AnyRecord {
  const ref = asRecord(review?.reviewed_fixture_artifact_ref);
  const artifact = asRecord(sourceRuntime?.internal_fit_artifact);
  return {
    artifact_state:
      (artifact.artifact_state ?? ref.artifact_state) === "INTERNAL_POSTERIOR_CANDIDATE_HELD_FOR_OUTPUT_REVIEW"
        ? "INTERNAL_POSTERIOR_CANDIDATE_HELD_FOR_OUTPUT_REVIEW"
        : null,
    estimand_parameter:
      (artifact.estimand_parameter ?? ref.estimand_parameter) === "delta_ai_post"
        ? "delta_ai_post"
        : null,
    artifact_hash: safeHash(artifact.artifact_hash ?? ref.artifact_hash)
  };
}

function sourceDiagnosticsEvidencePacketGaps(packet: any, review: any, sourceRuntime: any): string[] {
  const gaps: string[] = [];
  if (!packet) return ["sourceDiagnosticsEvidencePacket is required for Bayesian promotion decision source binding"];
  if (packet.schema_version !== CONTRIBUTION_ALIGNMENT_DIAGNOSTICS_EVIDENCE_PACKET_SCHEMA_VERSION) {
    gaps.push("sourceDiagnosticsEvidencePacket.schema_version is invalid");
  }
  if (packet.packet_state !== REQUIRED_EVIDENCE_PACKET_STATE) {
    gaps.push("sourceDiagnosticsEvidencePacket.packet_state is not ready for promotion decision review");
  }
  if (packet.packet_hash !== contributionAlignmentDiagnosticsEvidencePacketHash(packet)) {
    gaps.push("sourceDiagnosticsEvidencePacket packet_hash drifted");
  }
  if (packet.source_bound !== true) {
    gaps.push("sourceDiagnosticsEvidencePacket is not source-bound");
  }
  if (packet.validation_summary?.valid !== true) {
    gaps.push("sourceDiagnosticsEvidencePacket.validation_summary.valid must be true");
  }
  if (packet.allowed_next_step !== REQUIRED_EVIDENCE_PACKET_NEXT_STEP) {
    gaps.push("sourceDiagnosticsEvidencePacket allowed_next_step is outside Bayesian Promotion Decision Gate");
  }
  const policy = asRecord(packet.packet_policy);
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
    if (policy[field] !== false) {
      gaps.push(`sourceDiagnosticsEvidencePacket.packet_policy.${field} must be false`);
    }
  }
  const promotion = asRecord(packet.promotion_boundary);
  for (const field of [
    "promotion_authorized",
    "posterior_interpretation_authorized",
    "confidence_probability_authorized",
    "customer_economic_output_authorized",
    "internal_bayesian_execution_artifact_v1_authorized"
  ]) {
    if (promotion[field] !== false) {
      gaps.push(`sourceDiagnosticsEvidencePacket.promotion_boundary.${field} must be false`);
    }
  }
  if (promotion.promotion_blocked !== true) {
    gaps.push("sourceDiagnosticsEvidencePacket.promotion_boundary.promotion_blocked must be true");
  }
  const packetRuntimeRef = asRecord(packet.source_runtime_ref);
  if (sourceRuntime && packetRuntimeRef.runtime_hash !== sourceRuntime.runtime_hash) {
    gaps.push("sourceDiagnosticsEvidencePacket source_runtime_ref does not match sourceRuntime");
  }
  const packetGovernedSourceRef =
    asRecord(packet.source_governed_diagnostics_sufficiency_evidence_source_ref);
  const reviewGovernedSourceRef =
    asRecord(review?.source_governed_diagnostics_sufficiency_evidence_source_ref);
  if (
    safeHash(packetGovernedSourceRef.evidence_hash) === null ||
    safeHash(reviewGovernedSourceRef.evidence_hash) === null ||
    packetGovernedSourceRef.evidence_hash !== reviewGovernedSourceRef.evidence_hash
  ) {
    gaps.push("sourceDiagnosticsEvidencePacket governed diagnostics sufficiency evidence source hash must match diagnostics review");
  }
  if (
    safeHash(packetGovernedSourceRef.projected_evidence_hash) === null ||
    safeHash(reviewGovernedSourceRef.projected_evidence_hash) === null ||
    packetGovernedSourceRef.projected_evidence_hash !==
      reviewGovernedSourceRef.projected_evidence_hash
  ) {
    gaps.push("sourceDiagnosticsEvidencePacket projected diagnostics sufficiency evidence hash must match diagnostics review");
  }
  const feeds = asRecord(packet.feeds);
  if (feeds.bayesian_promotion_decision_gate !== true) {
    gaps.push("sourceDiagnosticsEvidencePacket must feed Bayesian Promotion Decision Gate");
  }
  for (const [field, value] of Object.entries(feeds)) {
    if (
      !["bayesian_promotion_decision_gate", "internal_diagnostics_model_adequacy_review"].includes(field) &&
      value !== false
    ) {
      gaps.push(`sourceDiagnosticsEvidencePacket.feeds.${field} must be false`);
    }
  }
  const requiredPacketBlocks = [
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
  for (const blocked of requiredPacketBlocks) {
    if (!Array.isArray(packet.blocked_uses) || !packet.blocked_uses.includes(blocked)) {
      gaps.push("sourceDiagnosticsEvidencePacket blocked_uses must include governed blocks");
      break;
    }
  }

  const packetSufficiency = asRecord(packet.evidence_sufficiency);
  const reviewData = asRecord(review?.data_adequacy);
  const reviewDiagnostics = asRecord(review?.model_diagnostics);
  const reviewComparison = asRecord(review?.comparison_design_adequacy);
  const packetDiagnostics = asRecord(packet.model_diagnostics_evidence);
  const packetComparison = asRecord(packet.comparison_design_evidence);
  const packetFeatureWeights = asRecord(packet.feature_weight_provenance);

  for (const [packetField, reviewValue] of Object.entries({
    data_adequacy_satisfied: reviewData.data_adequacy_satisfied,
    comparison_design_adequacy_satisfied:
      reviewComparison.comparison_design_adequacy_satisfied,
    model_diagnostics_satisfied: reviewDiagnostics.model_diagnostics_satisfied
  })) {
    if (packetSufficiency[packetField] !== reviewValue) {
      gaps.push(`sourceDiagnosticsEvidencePacket.evidence_sufficiency.${packetField} must match diagnostics review`);
    }
  }
  if (
    packetSufficiency.suppressed_missing_held_windows_clear !==
    (
      reviewData.missing_or_suppressed_windows_fail_closed === true &&
      reviewData.missing_window_count_zero === true &&
      reviewData.suppressed_window_count_zero === true &&
      reviewData.held_window_count_zero === true
    )
  ) {
    gaps.push("sourceDiagnosticsEvidencePacket suppressed/missing/held window review must match diagnostics review");
  }
  for (const [packetField, reviewField] of Object.entries({
    convergence_diagnostics: "convergence_diagnostics_satisfied",
    posterior_predictive_checks: "posterior_predictive_checks_satisfied",
    prior_sensitivity: "prior_sensitivity_satisfied",
    residual_fit_checks: "residual_fit_checks_satisfied",
    calibration_backtest: "calibration_backtest_satisfied"
  })) {
    const detail = asRecord(packetDiagnostics[packetField]);
    if (detail.required !== true) {
      gaps.push(`sourceDiagnosticsEvidencePacket.model_diagnostics_evidence.${packetField}.required must be true`);
    }
    if (detail.evidence_satisfied !== reviewDiagnostics[reviewField]) {
      gaps.push(`sourceDiagnosticsEvidencePacket.model_diagnostics_evidence.${packetField} must match diagnostics review`);
    }
    if (detail.evidence_satisfied === true && safeHash(detail.source_evidence_hash) === null) {
      gaps.push(`sourceDiagnosticsEvidencePacket.model_diagnostics_evidence.${packetField} source_evidence_hash is required`);
    }
    if (detail.evidence_satisfied === true && safeHash(detail.reviewed_source_evidence_hash) === null) {
      gaps.push(`sourceDiagnosticsEvidencePacket.model_diagnostics_evidence.${packetField} reviewed_source_evidence_hash is required`);
    }
  }
  if (
    packetComparison.comparison_design_adequacy_satisfied !==
    reviewComparison.comparison_design_adequacy_satisfied
  ) {
    gaps.push("sourceDiagnosticsEvidencePacket.comparison_design_evidence must match diagnostics review");
  }
  if (
    packetComparison.comparison_design_adequacy_satisfied === true &&
    safeHash(packetComparison.source_evidence_hash) === null
  ) {
    gaps.push("sourceDiagnosticsEvidencePacket.comparison_design_evidence source_evidence_hash is required");
  }
  if (
    packetComparison.comparison_design_adequacy_satisfied === true &&
    safeHash(packetComparison.reviewed_source_evidence_hash) === null
  ) {
    gaps.push("sourceDiagnosticsEvidencePacket.comparison_design_evidence reviewed_source_evidence_hash is required");
  }
  if (
    packetFeatureWeights.weights_structural_internal_only !== true ||
    packetFeatureWeights.weights_not_confidence_scores !== true ||
    packetFeatureWeights.customer_facing_weight_output !== false
  ) {
    gaps.push("sourceDiagnosticsEvidencePacket feature weights must remain structural/internal");
  }
  for (const field of [
    "data_adequacy_satisfied",
    "suppressed_missing_held_windows_clear",
    "comparison_design_adequacy_satisfied",
    "model_diagnostics_satisfied",
    "feature_weight_provenance_satisfied",
    "all_required_evidence_satisfied"
  ]) {
    if (packetSufficiency[field] !== true) {
      gaps.push(`sourceDiagnosticsEvidencePacket.evidence_sufficiency.${field} must be true`);
    }
  }
  return sanitizeGaps(gaps);
}

function artifactHash(artifact: unknown): string {
  const withoutHash = clone(artifact);
  delete withoutHash.artifact_hash;
  return sha256Json(withoutHash);
}

function sourceRuntimeGaps(sourceRuntime: any, review: any, validationOptions: AnyRecord = {}): string[] {
  const gaps: string[] = [];
  const runtime = asRecord(sourceRuntime);
  if (!sourceRuntime) return ["sourceRuntime is required for Bayesian promotion decision source binding"];
  const validation = validateContributionAlignmentInternalBayesianExecutionRuntime(runtime, {
    ...validationOptions
  });
  if (validation.valid !== true) {
    gaps.push("sourceRuntime failed internal Bayesian execution runtime validation");
    gaps.push(...validation.gaps.map((gap: string) => `sourceRuntime.${gap}`));
  }
  if (runtime.runtime_state !== REQUIRED_RUNTIME_STATE) {
    gaps.push("sourceRuntime.runtime_state is not fixture prototype");
  }
  if (runtime.runtime_execution_class !== REQUIRED_RUNTIME_CLASS) {
    gaps.push("sourceRuntime.runtime_execution_class is not fixture prototype only");
  }
  if (runtime.runtime_hash !== contributionAlignmentInternalBayesianExecutionRuntimeHash(runtime)) {
    gaps.push("sourceRuntime hash drifted");
  }
  const design = asRecord(runtime.aggregate_design_matrix);
  for (const [field, expected] of Object.entries({
    missing_window_count: 0,
    suppressed_window_count: 0,
    held_window_count: 0,
    raw_row_count: 0,
    identifier_count: 0,
    query_text_present: false
  })) {
    if (design[field] !== expected) gaps.push(`sourceRuntime.aggregate_design_matrix.${field} must be ${expected}`);
  }
  const artifact = asRecord(runtime.internal_fit_artifact);
  if (artifact.artifact_hash !== artifactHash(artifact)) {
    gaps.push("sourceRuntime internal fixture artifact hash drifted");
  }
  const reviewRuntimeRef = asRecord(review?.source_runtime_ref);
  if (reviewRuntimeRef.runtime_hash && runtime.runtime_hash !== reviewRuntimeRef.runtime_hash) {
    gaps.push("sourceRuntime hash does not match diagnostics review source_runtime_ref");
  }
  const reviewArtifactRef = asRecord(review?.reviewed_fixture_artifact_ref);
  if (reviewArtifactRef.artifact_hash && artifact.artifact_hash !== reviewArtifactRef.artifact_hash) {
    gaps.push("sourceRuntime fixture artifact hash does not match diagnostics review artifact ref");
  }
  return sanitizeGaps(gaps);
}

function sourceReviewLeakageGaps(review: any): string[] {
  const gaps: string[] = [];
  const policy = asRecord(review?.review_policy);
  for (const field of [
    "posterior_interpretation_authorized",
    "posterior_output_authorized",
    "confidence_output_authorized",
    "probability_output_authorized",
    "finance_output_authorized",
    "customer_output_authorized"
  ]) {
    if (policy[field] !== false) gaps.push(`sourceDiagnosticsReview.review_policy.${field} must be false`);
  }
  const feeds = asRecord(review?.feeds);
  for (const field of FEED_FIELDS.filter((feed) => feed !== "internal_bayesian_execution_artifact_v1")) {
    if (field === "posterior_interpretation" && feeds[field] !== false) {
      gaps.push("sourceDiagnosticsReview feeds posterior interpretation");
    } else if (field !== "internal_bayesian_execution_artifact_v1" && feeds[field] === true) {
      gaps.push(`sourceDiagnosticsReview.feeds.${field} must be false`);
    }
  }
  if (review?.allowed_next_step !== REQUIRED_REVIEW_NEXT_STEP) {
    gaps.push("sourceDiagnosticsReview allowed_next_step is outside Bayesian Promotion Decision Gate");
  }
  return sanitizeGaps(gaps);
}

function sourceDiagnosticsReviewGaps(review: any, sourceRuntime: any, runtimeValidationOptions: AnyRecord = {}): string[] {
  const gaps: string[] = [];
  gaps.push(...collectAllowedFieldsGaps(review, SOURCE_REVIEW_TOP_LEVEL_FIELDS, "sourceDiagnosticsReview"));
  gaps.push(...hasForbiddenSourceDiagnosticsReviewContent(review));
  if (review?.schema_version !== CONTRIBUTION_ALIGNMENT_INTERNAL_DIAGNOSTICS_MODEL_ADEQUACY_REVIEW_SCHEMA_VERSION) {
    gaps.push("sourceDiagnosticsReview.schema_version is invalid");
  }
  if (review?.review_state !== REQUIRED_REVIEW_STATE) {
    gaps.push("sourceDiagnosticsReview.review_state is not completed promotion-blocked review");
  }
  if (review?.review_hash !== contributionAlignmentInternalDiagnosticsModelAdequacyReviewHash(review)) {
    gaps.push("sourceDiagnosticsReview hash drifted");
  }
  if (review?.source_bound !== true) {
    gaps.push("sourceDiagnosticsReview is not source-bound");
  }
  if (review?.validation_summary?.valid !== true) {
    gaps.push("sourceDiagnosticsReview.validation_summary.valid must be true");
  }
  gaps.push(...sourceReviewLeakageGaps(review));

  const data = asRecord(review?.data_adequacy);
  for (const field of [
    "data_adequacy_satisfied",
    "missing_or_suppressed_windows_fail_closed",
    "missing_window_count_zero",
    "suppressed_window_count_zero",
    "held_window_count_zero",
    "raw_row_count_zero",
    "identifier_count_zero",
    "query_text_absent"
  ]) {
    if (data[field] !== true) gaps.push(`sourceDiagnosticsReview.data_adequacy.${field} must be true`);
  }

  const diagnostics = asRecord(review?.model_diagnostics);
  for (const field of [
    "convergence_diagnostics_satisfied",
    "posterior_predictive_checks_satisfied",
    "prior_sensitivity_satisfied",
    "residual_fit_checks_satisfied",
    "calibration_backtest_satisfied",
    "all_required_diagnostic_fields_present",
    "model_diagnostics_satisfied"
  ]) {
    if (diagnostics[field] !== true) gaps.push(`sourceDiagnosticsReview.model_diagnostics.${field} must be true`);
  }
  const comparison = asRecord(review?.comparison_design_adequacy);
  if (comparison.comparison_design_adequacy_satisfied !== true) {
    gaps.push("sourceDiagnosticsReview.comparison_design_adequacy_satisfied must be true");
  }
  if (
    comparison.comparison_design_adequacy_satisfied === true &&
    diagnostics.model_diagnostics_satisfied === true &&
    safeHash(review?.source_diagnostics_sufficiency_evidence_ref?.evidence_hash) === null
  ) {
    gaps.push("sourceDiagnosticsReview source diagnostics sufficiency evidence hash is required");
  }
  if (comparison.causal_claim_authorized !== false) {
    gaps.push("sourceDiagnosticsReview causal claims must be false");
  }
  const boundary = asRecord(review?.boundary_checks);
  for (const field of [
    "runtime_fixture_prototype_only",
    "posterior_values_contained",
    "posterior_numeric_values_withheld",
    "posterior_interpretation_blocked",
    "confidence_probability_blocked",
    "feature_weights_structural_internal_only",
    "feature_weights_not_confidence_scores",
    "customer_economic_output_blocked",
    "live_connector_execution_blocked"
  ]) {
    if (boundary[field] !== true) gaps.push(`sourceDiagnosticsReview.boundary_checks.${field} must be true`);
  }

  const artifactRef = asRecord(review?.reviewed_fixture_artifact_ref);
  if (artifactRef.output_value_present !== false) {
    gaps.push("sourceDiagnosticsReview reviewed fixture artifact must not present output values");
  }
  for (const forbidden of [
    "posterior_mean_internal",
    "posterior_sd_internal",
    "did_observed_estimate",
    "did_standard_error"
  ]) {
    if (Object.prototype.hasOwnProperty.call(artifactRef, forbidden)) {
      gaps.push("sourceDiagnosticsReview must not echo posterior numeric values");
    }
  }

  const promotion = asRecord(review?.promotion_review);
  if (promotion.promotion_authorized !== false) {
    gaps.push("sourceDiagnosticsReview must not authorize promotion itself");
  }
  if (promotion.promotion_blocked !== true) {
    gaps.push("sourceDiagnosticsReview promotion must remain blocked");
  }

  const feeds = asRecord(review?.feeds);
  if (feeds.bayesian_promotion_decision_gate !== true) {
    gaps.push("sourceDiagnosticsReview must feed Bayesian Promotion Decision Gate");
  }
  for (const [field, value] of Object.entries(feeds)) {
    if (field !== "bayesian_promotion_decision_gate" && value !== false) {
      gaps.push(`sourceDiagnosticsReview.feeds.${field} must be false`);
    }
  }

  gaps.push(...sourceRuntimeGaps(sourceRuntime, review, runtimeValidationOptions));
  return sanitizeGaps(gaps);
}

function hasForbiddenSourceDiagnosticsReviewContent(value: unknown, path = "sourceDiagnosticsReview"): string[] {
  if (Array.isArray(value)) {
    if (
      path === "sourceDiagnosticsReview.blocked_uses" ||
      path === "sourceDiagnosticsReview.required_caveats" ||
      path === "sourceDiagnosticsReview.validation_summary.gaps"
    ) {
      return [];
    }
    return value.flatMap((item, index) =>
      hasForbiddenSourceDiagnosticsReviewContent(item, `${path}[${index}]`)
    );
  }
  if (value && typeof value === "object") {
    const gaps: string[] = [];
    const allowedFields = SOURCE_REVIEW_ALLOWED_NESTED_FIELDS.get(path);
    for (const [key, nested] of Object.entries(value)) {
      const safeField =
        path === "sourceDiagnosticsReview"
          ? SOURCE_REVIEW_TOP_LEVEL_FIELDS.has(key)
          : Array.isArray(allowedFields) && allowedFields.includes(key);
      if (!safeField) {
        gaps.push(
          path === "sourceDiagnosticsReview"
            ? "sourceDiagnosticsReview contains ungoverned field"
            : "sourceDiagnosticsReview contains ungoverned nested field"
        );
        if (FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
          gaps.push("sourceDiagnosticsReview contains forbidden field name");
        }
        continue;
      }
      gaps.push(...hasForbiddenSourceDiagnosticsReviewContent(nested, `${path}.${key}`));
    }
    return gaps;
  }
  if (typeof value !== "string") return [];
  if (
    path.startsWith("sourceDiagnosticsReview.blocked_uses[") ||
    path.startsWith("sourceDiagnosticsReview.required_caveats[") ||
    path.startsWith("sourceDiagnosticsReview.validation_summary.gaps[")
  ) {
    return [];
  }
  return FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))
    ? ["sourceDiagnosticsReview contains unsafe source or output content"]
    : [];
}

function buildSourceStateChecks(review: any, sourceRuntime: any, sourceDiagnosticsEvidencePacket: any, sourceGaps: string[]): AnyRecord {
  const runtime = asRecord(sourceRuntime);
  const artifact = asRecord(runtime.internal_fit_artifact);
  const reviewArtifactRef = asRecord(review?.reviewed_fixture_artifact_ref);
  return {
    runtime_fixture_prototype_only:
      (runtime.runtime_execution_class ?? review?.source_runtime_ref?.runtime_execution_class) === REQUIRED_RUNTIME_CLASS,
    runtime_hash_bound:
      safeHash(runtime.runtime_hash ?? review?.source_runtime_ref?.runtime_hash) !== null &&
      !sourceGaps.some((gap) => /sourceRuntime hash/.test(gap)),
    fixture_artifact_hash_bound:
      safeHash(artifact.artifact_hash ?? reviewArtifactRef.artifact_hash) !== null &&
      !sourceGaps.some((gap) => /artifact hash/.test(gap)),
    diagnostics_review_completed: review?.review_state === REQUIRED_REVIEW_STATE,
    diagnostics_review_hash_bound:
      review?.review_hash === contributionAlignmentInternalDiagnosticsModelAdequacyReviewHash(review),
    diagnostics_review_allowed_next_step_bound:
      review?.allowed_next_step === REQUIRED_REVIEW_NEXT_STEP,
    diagnostics_evidence_packet_ready:
      sourceDiagnosticsEvidencePacket?.packet_state === REQUIRED_EVIDENCE_PACKET_STATE,
    diagnostics_evidence_packet_hash_bound:
      Boolean(sourceDiagnosticsEvidencePacket) &&
      sourceDiagnosticsEvidencePacket.packet_hash ===
        contributionAlignmentDiagnosticsEvidencePacketHash(sourceDiagnosticsEvidencePacket),
    diagnostics_evidence_packet_allowed_next_step_bound:
      sourceDiagnosticsEvidencePacket?.allowed_next_step === REQUIRED_EVIDENCE_PACKET_NEXT_STEP
  };
}

function buildDiagnosticsSufficiency(review: any, sourceRuntime: any, sourceDiagnosticsEvidencePacket: any): AnyRecord {
  const data = asRecord(review?.data_adequacy);
  const diagnostics = asRecord(review?.model_diagnostics);
  const comparison = asRecord(review?.comparison_design_adequacy);
  const packetSufficiency = asRecord(sourceDiagnosticsEvidencePacket?.evidence_sufficiency);
  const packetDiagnostics = asRecord(sourceDiagnosticsEvidencePacket?.model_diagnostics_evidence);
  const packetComparison = asRecord(sourceDiagnosticsEvidencePacket?.comparison_design_evidence);
  const checks = {
    data_adequacy_satisfied:
      data.data_adequacy_satisfied === true &&
      packetSufficiency.data_adequacy_satisfied === true,
    suppressed_missing_held_windows_clear:
      data.missing_or_suppressed_windows_fail_closed === true &&
      data.missing_window_count_zero === true &&
      data.suppressed_window_count_zero === true &&
      data.held_window_count_zero === true &&
      packetSufficiency.suppressed_missing_held_windows_clear === true,
    convergence_diagnostics_satisfied:
      diagnostics.convergence_diagnostics_satisfied === true &&
      packetDiagnostics.convergence_diagnostics?.evidence_satisfied === true,
    posterior_predictive_checks_satisfied:
      diagnostics.posterior_predictive_checks_satisfied === true &&
      packetDiagnostics.posterior_predictive_checks?.evidence_satisfied === true,
    prior_sensitivity_satisfied:
      diagnostics.prior_sensitivity_satisfied === true &&
      packetDiagnostics.prior_sensitivity?.evidence_satisfied === true,
    residual_fit_checks_satisfied:
      diagnostics.residual_fit_checks_satisfied === true &&
      packetDiagnostics.residual_fit_checks?.evidence_satisfied === true,
    calibration_backtest_satisfied:
      diagnostics.calibration_backtest_satisfied === true &&
      packetDiagnostics.calibration_backtest?.evidence_satisfied === true,
    comparison_design_adequacy_satisfied:
      comparison.comparison_design_adequacy_satisfied === true &&
      packetComparison.comparison_design_adequacy_satisfied === true
  };
  return {
    ...checks,
    all_required_diagnostics_satisfied: Object.values(checks).every(Boolean)
  };
}

function buildGovernanceContainment(review: any, sourceRuntime: any): AnyRecord {
  const boundary = asRecord(review?.boundary_checks);
  const runtime = asRecord(sourceRuntime);
  return {
    runtime_fixture_prototype_only:
      boundary.runtime_fixture_prototype_only === true &&
      (runtime.runtime_execution_class === undefined ||
        runtime.runtime_execution_class === REQUIRED_RUNTIME_CLASS),
    posterior_values_contained: boundary.posterior_values_contained === true,
    posterior_numeric_values_withheld: boundary.posterior_numeric_values_withheld === true,
    posterior_interpretation_blocked: boundary.posterior_interpretation_blocked === true,
    confidence_probability_blocked: boundary.confidence_probability_blocked === true,
    customer_economic_output_blocked: boundary.customer_economic_output_blocked === true,
    live_connector_execution_blocked: boundary.live_connector_execution_blocked === true
  };
}

function buildFeatureWeightPolicy(review: any): AnyRecord {
  const boundary = asRecord(review?.boundary_checks);
  return {
    weights_structural_internal_only:
      boundary.feature_weights_structural_internal_only === true,
    weights_not_confidence_scores:
      boundary.feature_weights_not_confidence_scores === true,
    weight_provenance_version_present: true,
    weight_provenance_version: WEIGHT_PROVENANCE_VERSION,
    weight_provenance_ref: "source_internal_bayesian_execution_gate.gated_feature_weights",
    customer_facing_weight_output: false
  };
}

function buildPromotionDecision(passed: boolean): AnyRecord {
  return {
    promotion_authorized: passed,
    promotion_blocked: !passed,
    decision: passed
      ? "promote_to_internal_bayesian_execution_artifact_v1_only"
      : "hold_for_diagnostics_and_model_adequacy_sufficiency",
    explicit_next_slice_required: true,
    internal_execution_artifact_v1_only: passed,
    posterior_interpretation_blocked: true,
    confidence_probability_blocked: true,
    customer_economic_output_blocked: true
  };
}

function buildGate(review: any, sourceRuntime: any, sourceDiagnosticsEvidencePacket: any, state: string, sourceGaps: string[]): AnyRecord {
  const passed = state === PASSED_STATE;
  const sourceStateChecks = buildSourceStateChecks(
    review,
    sourceRuntime,
    sourceDiagnosticsEvidencePacket,
    sourceGaps
  );
  const diagnosticsSufficiency = buildDiagnosticsSufficiency(
    review,
    sourceRuntime,
    sourceDiagnosticsEvidencePacket
  );
  const governanceContainment = buildGovernanceContainment(review, sourceRuntime);
  const featureWeightPolicy = buildFeatureWeightPolicy(review);
  const gate: AnyRecord = {
    schema_version: CONTRIBUTION_ALIGNMENT_BAYESIAN_PROMOTION_DECISION_GATE_SCHEMA_VERSION,
    gate_id: `contribution_alignment_bayesian_promotion_decision_gate_${sha256Json({
      review_id: review?.review_id ?? null,
      review_hash: review?.review_hash ?? null,
      runtime_hash: sourceRuntime?.runtime_hash ?? review?.source_runtime_ref?.runtime_hash ?? null,
      artifact_hash: review?.reviewed_fixture_artifact_ref?.artifact_hash ?? null,
      gate_version: GATE_VERSION
    }).slice(0, 16)}`,
    gate_state: state,
    gate_class: passed ? GATE_CLASS : null,
    generated_at: "2026-06-25T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    source_bound: passed,
    source_runtime_ref: sourceRuntimeRef(sourceRuntime, review),
    source_diagnostics_review_ref: sourceDiagnosticsReviewRef(review),
    source_diagnostics_evidence_packet_ref:
      sourceDiagnosticsEvidencePacketRef(sourceDiagnosticsEvidencePacket),
    source_fixture_artifact_ref: sourceFixtureArtifactRef(review, sourceRuntime),
    gate_version: passed ? GATE_VERSION : null,
    gate_policy: {
      internal_only: true,
      aggregate_only: passed,
      promotion_decision_only: true,
      promotion_authorized: passed,
      internal_bayesian_execution_artifact_v1_authorized: passed,
      posterior_interpretation_authorized: false,
      posterior_output_authorized: false,
      confidence_output_authorized: false,
      probability_output_authorized: false,
      finance_output_authorized: false,
      customer_output_authorized: false
    },
    source_state_checks: sourceStateChecks,
    diagnostics_sufficiency: diagnosticsSufficiency,
    governance_containment: governanceContainment,
    feature_weight_policy: featureWeightPolicy,
    promotion_decision: buildPromotionDecision(passed),
    allowed_next_step: passed ? PASSED_NEXT_STEP : HELD_NEXT_STEP,
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    required_caveats: [...REQUIRED_CAVEATS],
    feeds: {
      internal_bayesian_execution_artifact_v1: passed,
      ...falseMap(FEED_FIELDS.filter((field) => field !== "internal_bayesian_execution_artifact_v1"))
    },
    boundary_policy: {
      receives_diagnostics_model_adequacy_review: state !== REJECT_STATE,
      receives_internal_bayesian_fixture_runtime_ref: state !== REJECT_STATE,
      receives_fixture_artifact_ref: state !== REJECT_STATE,
      ...falseMap(
        BOUNDARY_POLICY_FIELDS.filter((field) =>
          ![
            "receives_diagnostics_model_adequacy_review",
            "receives_internal_bayesian_fixture_runtime_ref",
            "receives_fixture_artifact_ref"
          ].includes(field)
        )
      )
    },
    validation_summary: {
      schema_version: `${CONTRIBUTION_ALIGNMENT_BAYESIAN_PROMOTION_DECISION_GATE_SCHEMA_VERSION}_SUMMARY`,
      valid: passed,
      gate_state: state,
      gaps: passed ? [] : sanitizeGaps(sourceGaps)
    }
  };
  gate.gate_hash = contributionAlignmentBayesianPromotionDecisionGateHash(gate);
  return gate;
}

function rejectedGate(): AnyRecord {
  const gate: AnyRecord = {
    schema_version: CONTRIBUTION_ALIGNMENT_BAYESIAN_PROMOTION_DECISION_GATE_SCHEMA_VERSION,
    gate_id: null,
    gate_state: REJECT_STATE,
    generated_at: "2026-06-25T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    source_bound: false,
    promotion_decision: buildPromotionDecision(false),
    validation_summary: {
      schema_version: `${CONTRIBUTION_ALIGNMENT_BAYESIAN_PROMOTION_DECISION_GATE_SCHEMA_VERSION}_SUMMARY`,
      valid: false,
      gate_state: REJECT_STATE,
      gaps: ["boundary leakage rejected"]
    }
  };
  gate.gate_hash = contributionAlignmentBayesianPromotionDecisionGateHash(gate);
  return gate;
}

export function contributionAlignmentBayesianPromotionDecisionGateHash(gate: unknown): string {
  const withoutHash = clone(gate);
  delete withoutHash.gate_hash;
  return sha256Json(withoutHash);
}

function sourceReviewRejectedForBoundary(review: any): boolean {
  const policy = asRecord(review?.review_policy);
  for (const field of [
    "posterior_interpretation_authorized",
    "posterior_output_authorized",
    "confidence_output_authorized",
    "probability_output_authorized",
    "finance_output_authorized",
    "customer_output_authorized"
  ]) {
    if (policy[field] !== false) return true;
  }
  const feeds = asRecord(review?.feeds);
  for (const [field, value] of Object.entries(feeds)) {
    if (field !== "bayesian_promotion_decision_gate" && value !== false) return true;
  }
  return false;
}

export function buildContributionAlignmentBayesianPromotionDecisionGateFromObject(input: unknown): AnyRecord {
  const wrapperGaps = inputBoundaryGaps(input);
  if (wrapperGaps.length > 0) return rejectedGate();
  const sourceDiagnosticsReview = sourceDiagnosticsReviewFromInput(input);
  if (sourceReviewRejectedForBoundary(sourceDiagnosticsReview)) return rejectedGate();
  const sourceRuntime = sourceRuntimeFromInput(input);
  const runtimeValidationOptions = sourceRuntimeValidationOptions(input);
  const sourceDiagnosticsEvidencePacket = sourceDiagnosticsEvidencePacketFromInput(input);
  const sourceGaps = sanitizeGaps([
    ...sourceDiagnosticsReviewGaps(
      sourceDiagnosticsReview,
      sourceRuntime,
      runtimeValidationOptions
    ),
    ...sourceDiagnosticsEvidencePacketGaps(
      sourceDiagnosticsEvidencePacket,
      sourceDiagnosticsReview,
      sourceRuntime
    )
  ]);
  const state = sourceGaps.length === 0 ? PASSED_STATE : HOLD_STATE;
  return buildGate(
    sourceDiagnosticsReview,
    sourceRuntime,
    sourceDiagnosticsEvidencePacket,
    state,
    sourceGaps
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

function rejectValidation(gate: any): AnyRecord | null {
  if (gate?.gate_state !== REJECT_STATE) return null;
  return {
    schema_version: VALIDATION_SCHEMA_VERSION,
    valid: false,
    gaps: ["boundary leakage rejected"]
  };
}

function collectShapeGaps(gate: any): string[] {
  const rejected = rejectValidation(gate);
  if (rejected) return rejected.gaps;

  const record = asRecord(gate);
  const gaps: string[] = [];
  gaps.push(...collectAllowedFieldsGaps(record, TOP_LEVEL_FIELDS, "gate"));
  if (record.schema_version !== CONTRIBUTION_ALIGNMENT_BAYESIAN_PROMOTION_DECISION_GATE_SCHEMA_VERSION) {
    gaps.push("schema_version is invalid");
  }
  if (![PASSED_STATE, HOLD_STATE].includes(record.gate_state)) {
    gaps.push("gate_state is invalid");
  }
  const passed = record.gate_state === PASSED_STATE;
  if (record.source_bound !== passed) gaps.push(`source_bound must be ${passed}`);
  if (record.gate_class !== (passed ? GATE_CLASS : null)) {
    gaps.push(`gate_class must be ${passed ? GATE_CLASS : "null"}`);
  }
  if (record.gate_version !== (passed ? GATE_VERSION : null)) {
    gaps.push(`gate_version must be ${passed ? GATE_VERSION : "null"}`);
  }
  if (record.allowed_next_step !== (passed ? PASSED_NEXT_STEP : HELD_NEXT_STEP)) {
    gaps.push(`allowed_next_step must be ${passed ? PASSED_NEXT_STEP : HELD_NEXT_STEP}`);
  }

  gaps.push(...collectRefGaps(record.source_runtime_ref, SOURCE_RUNTIME_REF_FIELDS, "source_runtime_ref"));
  gaps.push(...collectRefGaps(record.source_diagnostics_review_ref, SOURCE_DIAGNOSTICS_REVIEW_REF_FIELDS, "source_diagnostics_review_ref"));
  gaps.push(...collectRefGaps(record.source_diagnostics_evidence_packet_ref, SOURCE_DIAGNOSTICS_EVIDENCE_PACKET_REF_FIELDS, "source_diagnostics_evidence_packet_ref"));
  gaps.push(...collectRefGaps(record.source_fixture_artifact_ref, SOURCE_FIXTURE_ARTIFACT_REF_FIELDS, "source_fixture_artifact_ref"));

  const policy = asRecord(record.gate_policy);
  gaps.push(...collectRefGaps(policy, GATE_POLICY_FIELDS, "gate_policy"));
  for (const [field, expected] of Object.entries({
    internal_only: true,
    aggregate_only: passed,
    promotion_decision_only: true,
    promotion_authorized: passed,
    internal_bayesian_execution_artifact_v1_authorized: passed,
    posterior_interpretation_authorized: false,
    posterior_output_authorized: false,
    confidence_output_authorized: false,
    probability_output_authorized: false,
    finance_output_authorized: false,
    customer_output_authorized: false
  })) {
    if (policy[field] !== expected) gaps.push(`gate_policy.${field} must be ${expected}`);
  }

  const sourceState = asRecord(record.source_state_checks);
  gaps.push(...collectRefGaps(sourceState, SOURCE_STATE_CHECK_FIELDS, "source_state_checks"));
  const diagnostics = asRecord(record.diagnostics_sufficiency);
  gaps.push(...collectRefGaps(diagnostics, DIAGNOSTICS_SUFFICIENCY_FIELDS, "diagnostics_sufficiency"));
  const governance = asRecord(record.governance_containment);
  gaps.push(...collectRefGaps(governance, GOVERNANCE_CONTAINMENT_FIELDS, "governance_containment"));
  const featureWeight = asRecord(record.feature_weight_policy);
  gaps.push(...collectRefGaps(featureWeight, FEATURE_WEIGHT_POLICY_FIELDS, "feature_weight_policy"));
  const promotion = asRecord(record.promotion_decision);
  gaps.push(...collectRefGaps(promotion, PROMOTION_DECISION_FIELDS, "promotion_decision"));

  if (passed) {
    for (const [groupLabel, group] of Object.entries({
      source_state_checks: sourceState,
      diagnostics_sufficiency: diagnostics,
      governance_containment: governance
    })) {
      for (const [field, value] of Object.entries(group)) {
        if (value !== true) gaps.push(`${groupLabel}.${field} must be true`);
      }
    }
  }

  for (const [field, expected] of Object.entries({
    weights_structural_internal_only: true,
    weights_not_confidence_scores: true,
    weight_provenance_version_present: true,
    weight_provenance_version: WEIGHT_PROVENANCE_VERSION,
    weight_provenance_ref: "source_internal_bayesian_execution_gate.gated_feature_weights",
    customer_facing_weight_output: false
  })) {
    if (featureWeight[field] !== expected) gaps.push(`feature_weight_policy.${field} must be ${expected}`);
  }

  for (const [field, expected] of Object.entries({
    promotion_authorized: passed,
    promotion_blocked: !passed,
    explicit_next_slice_required: true,
    internal_execution_artifact_v1_only: passed,
    posterior_interpretation_blocked: true,
    confidence_probability_blocked: true,
    customer_economic_output_blocked: true
  })) {
    if (promotion[field] !== expected) gaps.push(`promotion_decision.${field} must be ${expected}`);
  }

  const expectedDecision = passed
    ? "promote_to_internal_bayesian_execution_artifact_v1_only"
    : "hold_for_diagnostics_and_model_adequacy_sufficiency";
  if (promotion.decision !== expectedDecision) {
    gaps.push(`promotion_decision.decision must be ${expectedDecision}`);
  }

  const feeds = asRecord(record.feeds);
  if (feeds.internal_bayesian_execution_artifact_v1 !== passed) {
    gaps.push(`feeds.internal_bayesian_execution_artifact_v1 must be ${passed}`);
  }
  for (const field of FEED_FIELDS.filter((feed) => feed !== "internal_bayesian_execution_artifact_v1")) {
    if (feeds[field] !== false) gaps.push(`feeds.${field} must be false`);
  }
  for (const key of Object.keys(feeds)) {
    if (!FEED_FIELDS.includes(key)) gaps.push("feeds contains ungoverned field");
  }

  const boundary = asRecord(record.boundary_policy);
  for (const field of BOUNDARY_POLICY_FIELDS) {
    const expected = [
      "receives_diagnostics_model_adequacy_review",
      "receives_internal_bayesian_fixture_runtime_ref",
      "receives_fixture_artifact_ref"
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
  if (summary.valid !== passed) gaps.push(`validation_summary.valid must be ${passed}`);
  if (summary.gate_state !== record.gate_state) {
    gaps.push("validation_summary.gate_state must match gate_state");
  }
  if (passed && Array.isArray(summary.gaps) && summary.gaps.length !== 0) {
    gaps.push("validation_summary.gaps must be empty for passed gate");
  }
  if (record.gate_hash !== contributionAlignmentBayesianPromotionDecisionGateHash(record)) {
    gaps.push("gate_hash must match gate body");
  }
  gaps.push(...hasForbiddenContent(record));
  return sanitizeGaps(gaps);
}

function collectSourceBindingGaps(gate: any, options: AnyRecord = {}): string[] {
  const gaps: string[] = [];
  if (gate?.gate_state === PASSED_STATE && !options.sourceDiagnosticsReview) {
    gaps.push("sourceDiagnosticsReview is required for passed Bayesian promotion decision gate validation");
  }
  if (gate?.gate_state === PASSED_STATE && !options.sourceRuntime) {
    gaps.push("sourceRuntime is required for passed Bayesian promotion decision gate validation");
  }
  if (gate?.gate_state !== REJECT_STATE && !options.sourceDiagnosticsEvidencePacket) {
    gaps.push("sourceDiagnosticsEvidencePacket is required for Bayesian promotion decision gate validation");
  }
  if (options.sourceDiagnosticsReview) {
    const runtimeValidationOptions = sourceRuntimeValidationOptions(options);
    const sourceGaps = sourceDiagnosticsReviewGaps(
      options.sourceDiagnosticsReview,
      options.sourceRuntime,
      runtimeValidationOptions
    );
    if (sourceGaps.length > 0) gaps.push(...sourceGaps);
    const actualRef = asRecord(gate.source_diagnostics_review_ref);
    const expectedRef = sourceDiagnosticsReviewRef(options.sourceDiagnosticsReview);
    for (const field of SOURCE_DIAGNOSTICS_REVIEW_REF_FIELDS) {
      if (actualRef[field] !== expectedRef[field]) {
        gaps.push(`source_diagnostics_review_ref.${field} does not match sourceDiagnosticsReview`);
      }
    }
  }
  if (options.sourceRuntime) {
    const runtimeValidationOptions = sourceRuntimeValidationOptions(options);
    const runtimeGaps = sourceRuntimeGaps(
      options.sourceRuntime,
      options.sourceDiagnosticsReview,
      runtimeValidationOptions
    );
    if (runtimeGaps.length > 0) gaps.push(...runtimeGaps);
    const actualRuntimeRef = asRecord(gate.source_runtime_ref);
    const expectedRuntimeRef = sourceRuntimeRef(options.sourceRuntime, options.sourceDiagnosticsReview);
    for (const field of SOURCE_RUNTIME_REF_FIELDS) {
      if (actualRuntimeRef[field] !== expectedRuntimeRef[field]) {
        gaps.push(`source_runtime_ref.${field} does not match sourceRuntime`);
      }
    }
    const actualArtifactRef = asRecord(gate.source_fixture_artifact_ref);
    const expectedArtifactRef = sourceFixtureArtifactRef(
      options.sourceDiagnosticsReview,
      options.sourceRuntime
    );
    for (const field of SOURCE_FIXTURE_ARTIFACT_REF_FIELDS) {
      if (actualArtifactRef[field] !== expectedArtifactRef[field]) {
        gaps.push(`source_fixture_artifact_ref.${field} does not match sourceRuntime`);
      }
    }
  }
  if (options.sourceDiagnosticsEvidencePacket) {
    const packetGaps = sourceDiagnosticsEvidencePacketGaps(
      options.sourceDiagnosticsEvidencePacket,
      options.sourceDiagnosticsReview,
      options.sourceRuntime
    );
    if (packetGaps.length > 0) gaps.push(...packetGaps);
    const actualPacketRef = asRecord(gate.source_diagnostics_evidence_packet_ref);
    const expectedPacketRef = sourceDiagnosticsEvidencePacketRef(
      options.sourceDiagnosticsEvidencePacket
    );
    for (const field of SOURCE_DIAGNOSTICS_EVIDENCE_PACKET_REF_FIELDS) {
      if (actualPacketRef[field] !== expectedPacketRef[field]) {
        gaps.push(`source_diagnostics_evidence_packet_ref.${field} does not match sourceDiagnosticsEvidencePacket`);
      }
    }
  }
  if (options.expectedGate) {
    const actualWithoutHash = clone(gate);
    const expectedWithoutHash = clone(options.expectedGate);
    delete actualWithoutHash.gate_hash;
    delete expectedWithoutHash.gate_hash;
    if (stableStringify(actualWithoutHash) !== stableStringify(expectedWithoutHash)) {
      gaps.push("Bayesian promotion decision gate mismatch against expectedGate");
    }
  }
  return sanitizeGaps(gaps);
}

function hasForbiddenContent(value: unknown, path = "gate"): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => hasForbiddenContent(item, `${path}[${index}]`));
  }
  if (value && typeof value === "object") {
    const gaps: string[] = [];
    for (const [key, nested] of Object.entries(value)) {
      const safeField =
        (
          path === "gate.gate_policy" &&
          GATE_POLICY_FIELDS.includes(key)
        ) ||
        (
          path === "gate.source_state_checks" &&
          SOURCE_STATE_CHECK_FIELDS.includes(key)
        ) ||
        (
          path === "gate.diagnostics_sufficiency" &&
          DIAGNOSTICS_SUFFICIENCY_FIELDS.includes(key)
        ) ||
        (
          path === "gate.governance_containment" &&
          GOVERNANCE_CONTAINMENT_FIELDS.includes(key)
        ) ||
        (
          path === "gate.feature_weight_policy" &&
          FEATURE_WEIGHT_POLICY_FIELDS.includes(key)
        ) ||
        (
          path === "gate.promotion_decision" &&
          PROMOTION_DECISION_FIELDS.includes(key)
        ) ||
        (
          path === "gate.feeds" &&
          FEED_FIELDS.includes(key)
        ) ||
        (
          path === "gate.boundary_policy" &&
          BOUNDARY_POLICY_FIELDS.includes(key)
        );
      if (
        !safeField &&
        FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key))
      ) {
        gaps.push("gate contains forbidden field name");
        continue;
      }
      gaps.push(...hasForbiddenContent(nested, `${path}.${key}`));
    }
    return gaps;
  }
  if (typeof value !== "string") return [];
  if (
    path.startsWith("gate.blocked_uses[") ||
    path.startsWith("gate.required_caveats[") ||
    path === "gate.feature_weight_policy.weight_provenance_ref"
  ) {
    return [];
  }
  return FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))
    ? [`${path} contains unsafe source or output language`]
    : [];
}

export function validateContributionAlignmentBayesianPromotionDecisionGate(gate: any, options: AnyRecord = {}): AnyRecord {
  if (gate?.gate_state === REJECT_STATE) {
    return rejectValidation(gate) as AnyRecord;
  }
  const gaps = sanitizeGaps([
    ...collectShapeGaps(gate),
    ...collectSourceBindingGaps(gate, options)
  ]);
  return {
    schema_version: VALIDATION_SCHEMA_VERSION,
    valid: gaps.length === 0 && gate?.gate_state === PASSED_STATE,
    gaps
  };
}
