#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  contributionAlignmentBayesianPromotionDecisionGateHash,
  validateContributionAlignmentBayesianPromotionDecisionGate
} from "./run_ai_value_contribution_alignment_bayesian_promotion_decision_gate.mjs";
import {
  contributionAlignmentDiagnosticsEvidencePacketHash
} from "./run_ai_value_contribution_alignment_diagnostics_evidence_packet.mjs";
import {
  contributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceHash
} from "./run_ai_value_contribution_alignment_governed_diagnostics_sufficiency_evidence_source.mjs";
import {
  contributionAlignmentInternalDiagnosticsModelAdequacyReviewHash
} from "./run_ai_value_contribution_alignment_internal_diagnostics_model_adequacy_review.mjs";
import {
  contributionAlignmentInternalBayesianExecutionRuntimeHash
} from "./run_ai_value_contribution_alignment_internal_bayesian_execution_runtime.mjs";
import {
  contributionAlignmentPromotionGatePassedArtifactHandoffHash,
  validateContributionAlignmentPromotionGatePassedArtifactHandoff
} from "./run_ai_value_contribution_alignment_promotion_gate_passed_artifact_handoff.mjs";

export const CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_ARTIFACT_V1_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_ARTIFACT_V1_2026_06";

const VALIDATION_SCHEMA_VERSION =
  `${CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_ARTIFACT_V1_SCHEMA_VERSION}_VALIDATION`;

const READY_STATE =
  "INTERNAL_BAYESIAN_EXECUTION_ARTIFACT_V1_CREATED_INTERPRETATION_BLOCKED";
const HOLD_STATE = "HOLD_FOR_INTERNAL_BAYESIAN_EXECUTION_ARTIFACT_V1";
const REJECT_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";

const READY_HANDOFF_STATE =
  "PROMOTION_GATE_PASSED_ARTIFACT_HANDOFF_READY_FOR_INTERNAL_EXECUTION_ARTIFACT_V1_CONTRACT_HANDOFF_ONLY";
const PASSED_GATE_STATE =
  "BAYESIAN_PROMOTION_DECISION_PASSED_FOR_INTERNAL_EXECUTION_ARTIFACT_ONLY";
const REQUIRED_HANDOFF_NEXT_STEP = "internal_bayesian_execution_artifact_v1_only";
const PASSED_NEXT_STEP = "posterior_interpretation_specification_gate_only";
const HOLD_NEXT_STEP = "promotion_gate_passed_artifact_handoff_required";
const ARTIFACT_CLASS = "internal_bayesian_execution_artifact_v1_internal_only";
const EXECUTION_ARTIFACT_VERSION =
  "internal_bayesian_execution_artifact_v1_2026_06";
const DERIVATION_VERSION =
  "ai_value_contribution_alignment_internal_bayesian_execution_artifact_v1_2026_06";

const AGGREGATE_UNIT_OF_ANALYSIS = "aggregate_measurement_cell_window";
const CANDIDATE_MODEL_FAMILY =
  "bayesian_hierarchical_difference_in_differences_candidate";
const ESTIMAND_DEFINITION =
  "Aggregate selected metric movement aligned to an approved expectation path, compared across pre/post windows and a governed comparison condition, without causality claims.";

const TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "artifact_id",
  "artifact_state",
  "artifact_class",
  "generated_at",
  "derivation_version",
  "source_bound",
  "source_promotion_handoff_ref",
  "source_promotion_gate_ref",
  "source_runtime_ref",
  "source_diagnostics_review_ref",
  "source_diagnostics_evidence_packet_ref",
  "source_governed_diagnostics_sufficiency_evidence_source_ref",
  "aggregate_unit_of_analysis",
  "candidate_model_family",
  "estimand_definition",
  "execution_artifact_version",
  "model_execution_scope",
  "diagnostic_evidence_binding",
  "posterior_values_containment_policy",
  "interpretation_policy",
  "artifact_policy",
  "blocked_outputs",
  "allowed_next_step",
  "blocked_uses",
  "required_caveats",
  "feeds",
  "validation_summary",
  "artifact_hash"
]);

const MODEL_EXECUTION_SCOPE_FIELDS = new Set(Object.keys(modelExecutionScope()));
const DIAGNOSTIC_EVIDENCE_BINDING_FIELDS = new Set([
  "promotion_handoff_hash",
  "promotion_gate_hash",
  "runtime_hash",
  "diagnostics_review_hash",
  "diagnostics_evidence_packet_hash",
  "governed_diagnostics_sufficiency_evidence_source_hash",
  "passed_handoff_required",
  "passed_promotion_gate_required",
  "same_source_chain_required"
]);
const POSTERIOR_VALUES_CONTAINMENT_POLICY_FIELDS =
  new Set(Object.keys(posteriorValuesContainmentPolicy()));
const INTERPRETATION_POLICY_FIELDS = new Set(Object.keys(interpretationPolicy()));
const ARTIFACT_POLICY_FIELDS = new Set(Object.keys(artifactPolicy()));
const SOURCE_PROMOTION_HANDOFF_REF_FIELDS = new Set([
  "schema_version",
  "handoff_id",
  "handoff_state",
  "handoff_hash",
  "source_bound",
  "promotion_authorized",
  "allowed_next_step"
]);
const SOURCE_PROMOTION_GATE_REF_FIELDS = new Set([
  "schema_version",
  "gate_id",
  "gate_state",
  "gate_hash",
  "promotion_authorized",
  "allowed_next_step"
]);
const SOURCE_RUNTIME_REF_FIELDS = new Set(["runtime_hash"]);
const SOURCE_DIAGNOSTICS_REVIEW_REF_FIELDS = new Set(["review_hash"]);
const SOURCE_DIAGNOSTICS_EVIDENCE_PACKET_REF_FIELDS = new Set(["packet_hash"]);
const SOURCE_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE_REF_FIELDS =
  new Set(["evidence_hash"]);

const BLOCKED_OUTPUT_FIELDS = [
  "posterior_interpretation",
  "posterior_output",
  "confidence_output",
  "probability_output",
  "score_like_output",
  "weighted_internal_model_output",
  "aggregate_score_output",
  "research_model_feed",
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
  "live_connector_execution",
  "raw_rows",
  "query_text",
  "identifiers",
  "prompts",
  "transcripts",
  "person_level_data"
];

const REQUIRED_BLOCKED_USES = [
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
  "live_connector_execution",
  "route_creation",
  "ui_creation",
  "schema_creation",
  "persistence_write",
  "export_creation",
  "raw_rows",
  "query_text",
  "identifiers",
  "prompts",
  "transcripts",
  "person_level_data",
  "promotion_authorization_outside_bayesian_promotion_decision_gate",
  "bayesian_runtime_rerun"
];

const REQUIRED_CAVEATS = [
  "Internal Bayesian Execution Artifact v1 is internal-only and aggregate-only.",
  "The artifact is authorized only by a passed Bayesian Promotion Decision Gate through a passed promotion handoff.",
  "The artifact does not rerun Bayesian execution or reinterpret posterior-like prototype values.",
  "Posterior interpretation, confidence, probability, customer-facing, economic, ROI, finance, causality, and productivity outputs remain blocked."
];

const FORBIDDEN_INPUT_FIELDS = [
  "confidence_output",
  "probability_output",
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
  "live_connector_execution",
  "raw_rows",
  "query_text",
  "identifiers",
  "prompts",
  "transcripts",
  "person_level_data",
  "reviewed_diagnostics_source_evidence"
];

const ALLOWED_INPUT_FIELDS = new Set([
  "source_promotion_handoff",
  "source_promotion_gate",
  "source_runtime",
  "source_diagnostics_review",
  "source_diagnostics_evidence_packet",
  "source_governed_diagnostics_sufficiency_evidence_source"
]);

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

function safeHash(value) {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value) ? value : null;
}

function inputBoundaryGaps(input) {
  const record = asRecord(input);
  const gaps = [];
  for (const key of Object.keys(record)) {
    if (!ALLOWED_INPUT_FIELDS.has(key)) {
      gaps.push(`internal Bayesian execution artifact v1 input contains unsupported wrapper field ${key}`);
    }
  }
  if (FORBIDDEN_INPUT_FIELDS.some((field) => Object.prototype.hasOwnProperty.call(record, field))) {
    gaps.push("internal Bayesian execution artifact v1 input contains blocked output or raw source side door");
  }
  return sanitizeGaps(gaps);
}

function sourceHandoffFromInput(input) {
  const record = asRecord(input);
  return record.source_promotion_handoff ?? input;
}

function buildSources(input) {
  const record = asRecord(input);
  return {
    sourcePromotionHandoff: sourceHandoffFromInput(input),
    sourcePromotionGate: record.source_promotion_gate ?? null,
    sourceRuntime: record.source_runtime ?? null,
    sourceDiagnosticsReview: record.source_diagnostics_review ?? null,
    sourceDiagnosticsEvidencePacket: record.source_diagnostics_evidence_packet ?? null,
    sourceGovernedDiagnosticsSufficiencyEvidenceSource:
      record.source_governed_diagnostics_sufficiency_evidence_source ?? null
  };
}

function promotionHandoffRef(handoff, includeSourceDetails = true) {
  return {
    schema_version: includeSourceDetails ? handoff?.schema_version ?? null : null,
    handoff_id: includeSourceDetails ? handoff?.handoff_id ?? null : null,
    handoff_state: includeSourceDetails ? handoff?.handoff_state ?? null : null,
    handoff_hash: safeHash(handoff?.handoff_hash),
    source_bound: includeSourceDetails && handoff?.source_bound === true,
    promotion_authorized:
      includeSourceDetails && handoff?.handoff_policy?.promotion_authorized === true,
    allowed_next_step: includeSourceDetails ? handoff?.allowed_next_step ?? null : null
  };
}

function promotionGateRef(handoff, sourceGate, includeSourceDetails = true) {
  const gateRef = asRecord(handoff?.promotion_gate_ref);
  return {
    schema_version: includeSourceDetails
      ? gateRef.schema_version ?? sourceGate?.schema_version ?? null
      : null,
    gate_id: includeSourceDetails ? gateRef.gate_id ?? sourceGate?.gate_id ?? null : null,
    gate_state: includeSourceDetails
      ? gateRef.gate_state ?? sourceGate?.gate_state ?? null
      : null,
    gate_hash: safeHash(gateRef.gate_hash ?? sourceGate?.gate_hash),
    promotion_authorized: includeSourceDetails && gateRef.promotion_authorized === true,
    allowed_next_step: includeSourceDetails
      ? gateRef.allowed_next_step ?? sourceGate?.allowed_next_step ?? null
      : null
  };
}

function sourceHashes(handoff) {
  return asRecord(handoff?.source_hashes);
}

function sourceRuntimeRef(handoff, sourceRuntime) {
  const hashes = sourceHashes(handoff);
  return {
    runtime_hash: safeHash(hashes.runtime_hash ?? sourceRuntime?.runtime_hash)
  };
}

function sourceDiagnosticsReviewRef(handoff, sourceReview) {
  const hashes = sourceHashes(handoff);
  return {
    review_hash: safeHash(
      hashes.diagnostics_model_adequacy_review_hash ?? sourceReview?.review_hash
    )
  };
}

function sourceDiagnosticsEvidencePacketRef(handoff, sourcePacket) {
  const hashes = sourceHashes(handoff);
  return {
    packet_hash: safeHash(hashes.diagnostics_evidence_packet_hash ?? sourcePacket?.packet_hash)
  };
}

function sourceGovernedDiagnosticsSufficiencyEvidenceSourceRef(handoff, sourceGovernedSource) {
  const hashes = sourceHashes(handoff);
  return {
    evidence_hash: safeHash(
      hashes.governed_diagnostics_sufficiency_evidence_source_hash ??
        sourceGovernedSource?.evidence_hash
    )
  };
}

function modelExecutionScope() {
  return {
    internal_only: true,
    aggregate_only: true,
    source_bound_artifact_record_only: true,
    reruns_bayesian_execution: false,
    reinterprets_posterior_values: false,
    creates_runtime: false,
    live_connector_execution: false,
    route_creation: false,
    ui_creation: false,
    schema_creation: false,
    persistence_write: false,
    export_creation: false,
    raw_rows_ingested: false,
    identifiers_ingested: false
  };
}

function diagnosticEvidenceBinding(sources) {
  const handoff = sources.sourcePromotionHandoff;
  return {
    promotion_handoff_hash: safeHash(handoff?.handoff_hash),
    promotion_gate_hash: safeHash(handoff?.promotion_gate_ref?.gate_hash),
    runtime_hash: sourceRuntimeRef(handoff, sources.sourceRuntime).runtime_hash,
    diagnostics_review_hash:
      sourceDiagnosticsReviewRef(handoff, sources.sourceDiagnosticsReview).review_hash,
    diagnostics_evidence_packet_hash:
      sourceDiagnosticsEvidencePacketRef(
        handoff,
        sources.sourceDiagnosticsEvidencePacket
      ).packet_hash,
    governed_diagnostics_sufficiency_evidence_source_hash:
      sourceGovernedDiagnosticsSufficiencyEvidenceSourceRef(
        handoff,
        sources.sourceGovernedDiagnosticsSufficiencyEvidenceSource
      ).evidence_hash,
    passed_handoff_required: true,
    passed_promotion_gate_required: true,
    same_source_chain_required: true
  };
}

function posteriorValuesContainmentPolicy() {
  return {
    posterior_values_reemitted: false,
    posterior_values_reinterpreted: false,
    posterior_interpretation_authorized: false,
    confidence_output_authorized: false,
    probability_output_authorized: false,
    prototype_runtime_values_remain_source_contained: true
  };
}

function interpretationPolicy() {
  return {
    posterior_interpretation_authorized: false,
    posterior_output_authorized: false,
    confidence_output_authorized: false,
    probability_output_authorized: false,
    score_like_output_authorized: false,
    customer_facing_output_authorized: false,
    economic_output_authorized: false,
    roi_output_authorized: false,
    finance_output_authorized: false,
    causality_output_authorized: false,
    productivity_output_authorized: false
  };
}

function artifactPolicy() {
  return {
    internal_only: true,
    aggregate_only: true,
    no_individual_scoring: true,
    no_user_identifiable_fields: true,
    no_new_canonical_events: true,
    no_new_suppression_reasons: true,
    no_tunable_thresholds: true,
    no_admin_overrides: true,
    fail_closed_default: true,
    promotion_authorized: false,
    promotion_authority_source: "bayesian_promotion_decision_gate_only",
    artifact_creates_promotion_authority: false,
    reruns_bayesian_execution: false,
    posterior_interpretation_authorized: false,
    confidence_output_authorized: false,
    probability_output_authorized: false,
    customer_output_authorized: false,
    economic_output_authorized: false,
    roi_output_authorized: false,
    productivity_output_authorized: false,
    causality_output_authorized: false,
    finance_output_authorized: false,
    live_connector_execution_authorized: false,
    route_ui_schema_persistence_export_authorized: false
  };
}

function sourceGaps(sources) {
  const gaps = [];
  const handoff = sources.sourcePromotionHandoff;
  if (!handoff || typeof handoff !== "object") {
    return ["passed promotion handoff is required"];
  }
  if (!sources.sourcePromotionGate) {
    gaps.push("source promotion gate object is required");
  }
  if (!sources.sourceRuntime) {
    gaps.push("source runtime object is required");
  }
  if (!sources.sourceDiagnosticsReview) {
    gaps.push("source diagnostics/model adequacy review object is required");
  }
  if (!sources.sourceDiagnosticsEvidencePacket) {
    gaps.push("source diagnostics evidence packet object is required");
  }
  if (!sources.sourceGovernedDiagnosticsSufficiencyEvidenceSource) {
    gaps.push("source governed diagnostics sufficiency evidence source object is required");
  }
  if (handoff.handoff_hash !== contributionAlignmentPromotionGatePassedArtifactHandoffHash(handoff)) {
    gaps.push("source promotion handoff hash drifted");
  }
  const handoffValidation = validateContributionAlignmentPromotionGatePassedArtifactHandoff(
    handoff,
    {
      sourceRuntime: sources.sourceRuntime,
      governedSource: sources.sourceGovernedDiagnosticsSufficiencyEvidenceSource,
      diagnosticsReview: sources.sourceDiagnosticsReview,
      diagnosticsEvidencePacket: sources.sourceDiagnosticsEvidencePacket,
      promotionGate: sources.sourcePromotionGate
    }
  );
  if (handoffValidation.valid !== true) {
    gaps.push("source promotion handoff failed validation");
    gaps.push(...handoffValidation.gaps.map((gap) => `promotion_handoff.${gap}`));
  }
  if (handoff.handoff_state !== READY_HANDOFF_STATE) {
    gaps.push("source promotion handoff is not passed and ready for Artifact v1");
  }
  if (handoff.source_bound !== true) {
    gaps.push("source promotion handoff must be source_bound");
  }
  if (handoff.allowed_next_step !== REQUIRED_HANDOFF_NEXT_STEP) {
    gaps.push("source promotion handoff allowed_next_step must be internal Bayesian execution artifact v1 only");
  }
  if (handoff.handoff_policy?.promotion_authorized !== false) {
    gaps.push("source promotion handoff must not authorize promotion itself");
  }
  const handoffAuthority = asRecord(handoff.source_promotion_authority);
  if (handoffAuthority.governed_source_promotion_authorized !== false) {
    gaps.push("governed diagnostics source must not authorize promotion");
  }
  if (handoffAuthority.diagnostics_packet_promotion_authorized !== false) {
    gaps.push("diagnostics packet must not authorize promotion");
  }
  if (handoffAuthority.diagnostics_review_promotion_authorized !== false) {
    gaps.push("diagnostics review must not authorize promotion");
  }
  if (handoffAuthority.only_promotion_gate_authorizes_promotion !== true) {
    gaps.push("only Bayesian Promotion Decision Gate may authorize promotion");
  }
  const gateRef = asRecord(handoff.promotion_gate_ref);
  if (gateRef.gate_state !== PASSED_GATE_STATE) {
    gaps.push("source promotion gate is not passed");
  }
  if (gateRef.promotion_authorized !== true) {
    gaps.push("source promotion gate did not authorize Artifact v1");
  }
  if (gateRef.allowed_next_step !== REQUIRED_HANDOFF_NEXT_STEP) {
    gaps.push("source promotion gate allowed_next_step must be internal Bayesian execution artifact v1 only");
  }
  const blockedProof = asRecord(handoff.blocked_output_proof);
  for (const [field, value] of Object.entries(blockedProof)) {
    if (value !== false) gaps.push(`source handoff blocked output ${field} must remain false`);
  }
  if (sources.sourcePromotionGate) {
    if (
      sources.sourcePromotionGate.gate_hash !==
      contributionAlignmentBayesianPromotionDecisionGateHash(sources.sourcePromotionGate)
    ) {
      gaps.push("source promotion gate hash drifted");
    }
    if (sources.sourcePromotionGate.gate_hash !== gateRef.gate_hash) {
      gaps.push("source promotion gate hash does not match handoff gate ref");
    }
    if (sources.sourcePromotionGate.gate_state !== PASSED_GATE_STATE) {
      gaps.push("source promotion gate object is not passed");
    }
    if (sources.sourcePromotionGate.promotion_decision?.promotion_authorized !== true) {
      gaps.push("source promotion gate object did not authorize Artifact v1");
    }
    const gateValidation = validateContributionAlignmentBayesianPromotionDecisionGate(
      sources.sourcePromotionGate,
      {
        sourceDiagnosticsReview: sources.sourceDiagnosticsReview,
        sourceRuntime: sources.sourceRuntime,
        sourceDiagnosticsEvidencePacket: sources.sourceDiagnosticsEvidencePacket
      }
    );
    if (gateValidation.valid !== true) {
      gaps.push("source promotion gate failed validation");
      gaps.push(...gateValidation.gaps.map((gap) => `promotion_gate.${gap}`));
    }
  }
  if (sources.sourceRuntime) {
    if (
      sources.sourceRuntime.runtime_hash !==
      contributionAlignmentInternalBayesianExecutionRuntimeHash(sources.sourceRuntime)
    ) {
      gaps.push("source runtime hash drifted");
    }
    if (sourceRuntimeRef(handoff, sources.sourceRuntime).runtime_hash !== sources.sourceRuntime.runtime_hash) {
      gaps.push("source runtime hash does not match handoff source hashes");
    }
  }
  if (sources.sourceDiagnosticsReview) {
    if (
      sources.sourceDiagnosticsReview.review_hash !==
      contributionAlignmentInternalDiagnosticsModelAdequacyReviewHash(sources.sourceDiagnosticsReview)
    ) {
      gaps.push("source diagnostics review hash drifted");
    }
    if (
      sourceDiagnosticsReviewRef(handoff, sources.sourceDiagnosticsReview).review_hash !==
      sources.sourceDiagnosticsReview.review_hash
    ) {
      gaps.push("source diagnostics review hash does not match handoff source hashes");
    }
  }
  if (sources.sourceDiagnosticsEvidencePacket) {
    if (
      sources.sourceDiagnosticsEvidencePacket.packet_hash !==
      contributionAlignmentDiagnosticsEvidencePacketHash(sources.sourceDiagnosticsEvidencePacket)
    ) {
      gaps.push("source diagnostics evidence packet hash drifted");
    }
    if (
      sourceDiagnosticsEvidencePacketRef(handoff, sources.sourceDiagnosticsEvidencePacket).packet_hash !==
      sources.sourceDiagnosticsEvidencePacket.packet_hash
    ) {
      gaps.push("source diagnostics evidence packet hash does not match handoff source hashes");
    }
  }
  if (sources.sourceGovernedDiagnosticsSufficiencyEvidenceSource) {
    if (
      sources.sourceGovernedDiagnosticsSufficiencyEvidenceSource.evidence_hash !==
      contributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceHash(
        sources.sourceGovernedDiagnosticsSufficiencyEvidenceSource
      )
    ) {
      gaps.push("source governed diagnostics sufficiency evidence source hash drifted");
    }
    if (
      sourceGovernedDiagnosticsSufficiencyEvidenceSourceRef(
        handoff,
        sources.sourceGovernedDiagnosticsSufficiencyEvidenceSource
      ).evidence_hash !== sources.sourceGovernedDiagnosticsSufficiencyEvidenceSource.evidence_hash
    ) {
      gaps.push("source governed diagnostics sufficiency evidence source hash does not match handoff source hashes");
    }
  }
  for (const hash of Object.values(diagnosticEvidenceBinding(sources))) {
    if (typeof hash === "string" && safeHash(hash) === null) {
      gaps.push("diagnostic evidence binding contains invalid source hash");
    }
  }
  return sanitizeGaps(gaps);
}

function buildArtifact(sources, state, gaps) {
  const ready = state === READY_STATE;
  const handoff = sources.sourcePromotionHandoff;
  const refs = {
    source_promotion_handoff_ref: promotionHandoffRef(handoff, ready),
    source_promotion_gate_ref: promotionGateRef(
      handoff,
      sources.sourcePromotionGate,
      ready
    ),
    source_runtime_ref: sourceRuntimeRef(handoff, sources.sourceRuntime),
    source_diagnostics_review_ref:
      sourceDiagnosticsReviewRef(handoff, sources.sourceDiagnosticsReview),
    source_diagnostics_evidence_packet_ref:
      sourceDiagnosticsEvidencePacketRef(
        handoff,
        sources.sourceDiagnosticsEvidencePacket
      ),
    source_governed_diagnostics_sufficiency_evidence_source_ref:
      sourceGovernedDiagnosticsSufficiencyEvidenceSourceRef(
        handoff,
        sources.sourceGovernedDiagnosticsSufficiencyEvidenceSource
      )
  };
  const artifact = {
    schema_version:
      CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_ARTIFACT_V1_SCHEMA_VERSION,
    artifact_id: `contribution_alignment_internal_bayesian_execution_artifact_v1_${sha256Json({
      handoff_hash: refs.source_promotion_handoff_ref.handoff_hash,
      gate_hash: refs.source_promotion_gate_ref.gate_hash,
      execution_artifact_version: EXECUTION_ARTIFACT_VERSION
    }).slice(0, 16)}`,
    artifact_state: state,
    artifact_class: ready ? ARTIFACT_CLASS : null,
    generated_at: "2026-06-26T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    source_bound: ready,
    ...refs,
    aggregate_unit_of_analysis: AGGREGATE_UNIT_OF_ANALYSIS,
    candidate_model_family: CANDIDATE_MODEL_FAMILY,
    estimand_definition: ESTIMAND_DEFINITION,
    execution_artifact_version: EXECUTION_ARTIFACT_VERSION,
    model_execution_scope: modelExecutionScope(),
    diagnostic_evidence_binding: diagnosticEvidenceBinding(sources),
    posterior_values_containment_policy: posteriorValuesContainmentPolicy(),
    interpretation_policy: interpretationPolicy(),
    artifact_policy: artifactPolicy(),
    blocked_outputs: falseMap(BLOCKED_OUTPUT_FIELDS),
    allowed_next_step: ready ? PASSED_NEXT_STEP : HOLD_NEXT_STEP,
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    required_caveats: [...REQUIRED_CAVEATS],
    feeds: {
      posterior_interpretation_specification_gate: false,
      ...falseMap(BLOCKED_OUTPUT_FIELDS)
    },
    validation_summary: {
      schema_version:
        `${CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_ARTIFACT_V1_SCHEMA_VERSION}_SUMMARY`,
      valid: ready,
      artifact_state: state,
      gaps: ready ? [] : sanitizeGaps(gaps)
    }
  };
  artifact.artifact_hash =
    contributionAlignmentInternalBayesianExecutionArtifactV1Hash(artifact);
  return artifact;
}

function rejectedArtifact() {
  const artifact = {
    schema_version:
      CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_ARTIFACT_V1_SCHEMA_VERSION,
    artifact_id: null,
    artifact_state: REJECT_STATE,
    artifact_class: null,
    generated_at: "2026-06-26T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    source_bound: false,
    aggregate_unit_of_analysis: AGGREGATE_UNIT_OF_ANALYSIS,
    candidate_model_family: CANDIDATE_MODEL_FAMILY,
    estimand_definition: ESTIMAND_DEFINITION,
    execution_artifact_version: EXECUTION_ARTIFACT_VERSION,
    model_execution_scope: modelExecutionScope(),
    diagnostic_evidence_binding: {},
    posterior_values_containment_policy: posteriorValuesContainmentPolicy(),
    interpretation_policy: interpretationPolicy(),
    artifact_policy: artifactPolicy(),
    blocked_outputs: falseMap(BLOCKED_OUTPUT_FIELDS),
    allowed_next_step: HOLD_NEXT_STEP,
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    required_caveats: [...REQUIRED_CAVEATS],
    feeds: {
      posterior_interpretation_specification_gate: false,
      ...falseMap(BLOCKED_OUTPUT_FIELDS)
    },
    validation_summary: {
      schema_version:
        `${CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_ARTIFACT_V1_SCHEMA_VERSION}_SUMMARY`,
      valid: false,
      artifact_state: REJECT_STATE,
      gaps: ["boundary leakage rejected"]
    }
  };
  artifact.artifact_hash =
    contributionAlignmentInternalBayesianExecutionArtifactV1Hash(artifact);
  return artifact;
}

export function contributionAlignmentInternalBayesianExecutionArtifactV1Hash(artifact) {
  const withoutHash = clone(artifact);
  delete withoutHash.artifact_hash;
  return sha256Json(withoutHash);
}

export function buildContributionAlignmentInternalBayesianExecutionArtifactV1FromObject(input) {
  if (inputBoundaryGaps(input).length > 0) return rejectedArtifact();
  const sources = buildSources(input);
  const gaps = sourceGaps(sources);
  const state = gaps.length === 0 ? READY_STATE : HOLD_STATE;
  return buildArtifact(sources, state, gaps);
}

function collectAllowedFieldsGaps(record, fields, label) {
  return Object.keys(asRecord(record))
    .filter((key) => !fields.has(key))
    .map(() => `${label} contains ungoverned field`);
}

function validateSourceRefs(artifact, options) {
  const gaps = [];
  if (!options.sourcePromotionHandoff) {
    gaps.push("sourcePromotionHandoff is required for Artifact v1 validation");
  }
  if (!options.sourcePromotionGate) {
    gaps.push("sourcePromotionGate is required for Artifact v1 validation");
  }
  if (!options.sourceRuntime) {
    gaps.push("sourceRuntime is required for Artifact v1 validation");
  }
  if (!options.sourceDiagnosticsReview) {
    gaps.push("sourceDiagnosticsReview is required for Artifact v1 validation");
  }
  if (!options.sourceDiagnosticsEvidencePacket) {
    gaps.push("sourceDiagnosticsEvidencePacket is required for Artifact v1 validation");
  }
  if (!options.sourceGovernedDiagnosticsSufficiencyEvidenceSource) {
    gaps.push("sourceGovernedDiagnosticsSufficiencyEvidenceSource is required for Artifact v1 validation");
  }
  if (
    options.sourcePromotionHandoff &&
    artifact.source_promotion_handoff_ref?.handoff_hash !==
      options.sourcePromotionHandoff.handoff_hash
  ) {
    gaps.push("artifact source promotion handoff hash does not match sourcePromotionHandoff");
  }
  if (
    options.sourcePromotionGate &&
    artifact.source_promotion_gate_ref?.gate_hash !== options.sourcePromotionGate.gate_hash
  ) {
    gaps.push("artifact source promotion gate hash does not match sourcePromotionGate");
  }
  if (
    options.sourceRuntime &&
    artifact.source_runtime_ref?.runtime_hash !== options.sourceRuntime.runtime_hash
  ) {
    gaps.push("artifact source runtime hash does not match sourceRuntime");
  }
  if (
    options.sourceDiagnosticsReview &&
    artifact.source_diagnostics_review_ref?.review_hash !==
      options.sourceDiagnosticsReview.review_hash
  ) {
    gaps.push("artifact source diagnostics review hash does not match sourceDiagnosticsReview");
  }
  if (
    options.sourceDiagnosticsEvidencePacket &&
    artifact.source_diagnostics_evidence_packet_ref?.packet_hash !==
      options.sourceDiagnosticsEvidencePacket.packet_hash
  ) {
    gaps.push("artifact source diagnostics evidence packet hash does not match sourceDiagnosticsEvidencePacket");
  }
  if (
    options.sourceGovernedDiagnosticsSufficiencyEvidenceSource &&
    artifact.source_governed_diagnostics_sufficiency_evidence_source_ref?.evidence_hash !==
      options.sourceGovernedDiagnosticsSufficiencyEvidenceSource.evidence_hash
  ) {
    gaps.push("artifact source governed diagnostics sufficiency evidence source hash does not match sourceGovernedDiagnosticsSufficiencyEvidenceSource");
  }
  if (
    options.sourcePromotionHandoff?.handoff_state === READY_HANDOFF_STATE &&
    options.sourcePromotionGate &&
    options.sourceRuntime &&
    options.sourceDiagnosticsReview &&
    options.sourceDiagnosticsEvidencePacket &&
    options.sourceGovernedDiagnosticsSufficiencyEvidenceSource
  ) {
    const expected = buildContributionAlignmentInternalBayesianExecutionArtifactV1FromObject({
      source_promotion_handoff: options.sourcePromotionHandoff,
      source_promotion_gate: options.sourcePromotionGate,
      source_runtime: options.sourceRuntime,
      source_diagnostics_review: options.sourceDiagnosticsReview,
      source_diagnostics_evidence_packet: options.sourceDiagnosticsEvidencePacket,
      source_governed_diagnostics_sufficiency_evidence_source:
        options.sourceGovernedDiagnosticsSufficiencyEvidenceSource
    });
    const actualWithoutHash = clone(artifact);
    const expectedWithoutHash = clone(expected);
    delete actualWithoutHash.artifact_hash;
    delete expectedWithoutHash.artifact_hash;
    if (stableStringify(actualWithoutHash) !== stableStringify(expectedWithoutHash)) {
      gaps.push("internal Bayesian execution artifact v1 mismatch against supplied sources");
    }
  }
  return gaps;
}

export function validateContributionAlignmentInternalBayesianExecutionArtifactV1(
  artifact,
  options = {}
) {
  if (artifact?.artifact_state === REJECT_STATE) {
    return {
      schema_version: VALIDATION_SCHEMA_VERSION,
      valid: false,
      gaps: ["boundary leakage rejected"]
    };
  }
  const record = asRecord(artifact);
  const ready = record.artifact_state === READY_STATE;
  const gaps = [];
  gaps.push(...collectAllowedFieldsGaps(record, TOP_LEVEL_FIELDS, "artifact"));
  gaps.push(...collectAllowedFieldsGaps(
    record.source_promotion_handoff_ref,
    SOURCE_PROMOTION_HANDOFF_REF_FIELDS,
    "source_promotion_handoff_ref"
  ));
  gaps.push(...collectAllowedFieldsGaps(
    record.source_promotion_gate_ref,
    SOURCE_PROMOTION_GATE_REF_FIELDS,
    "source_promotion_gate_ref"
  ));
  gaps.push(...collectAllowedFieldsGaps(
    record.source_runtime_ref,
    SOURCE_RUNTIME_REF_FIELDS,
    "source_runtime_ref"
  ));
  gaps.push(...collectAllowedFieldsGaps(
    record.source_diagnostics_review_ref,
    SOURCE_DIAGNOSTICS_REVIEW_REF_FIELDS,
    "source_diagnostics_review_ref"
  ));
  gaps.push(...collectAllowedFieldsGaps(
    record.source_diagnostics_evidence_packet_ref,
    SOURCE_DIAGNOSTICS_EVIDENCE_PACKET_REF_FIELDS,
    "source_diagnostics_evidence_packet_ref"
  ));
  gaps.push(...collectAllowedFieldsGaps(
    record.source_governed_diagnostics_sufficiency_evidence_source_ref,
    SOURCE_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE_REF_FIELDS,
    "source_governed_diagnostics_sufficiency_evidence_source_ref"
  ));
  gaps.push(...collectAllowedFieldsGaps(
    record.model_execution_scope,
    MODEL_EXECUTION_SCOPE_FIELDS,
    "model_execution_scope"
  ));
  gaps.push(...collectAllowedFieldsGaps(
    record.diagnostic_evidence_binding,
    DIAGNOSTIC_EVIDENCE_BINDING_FIELDS,
    "diagnostic_evidence_binding"
  ));
  gaps.push(...collectAllowedFieldsGaps(
    record.posterior_values_containment_policy,
    POSTERIOR_VALUES_CONTAINMENT_POLICY_FIELDS,
    "posterior_values_containment_policy"
  ));
  gaps.push(...collectAllowedFieldsGaps(
    record.interpretation_policy,
    INTERPRETATION_POLICY_FIELDS,
    "interpretation_policy"
  ));
  gaps.push(...collectAllowedFieldsGaps(
    record.artifact_policy,
    ARTIFACT_POLICY_FIELDS,
    "artifact_policy"
  ));
  if (
    record.schema_version !==
    CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_ARTIFACT_V1_SCHEMA_VERSION
  ) {
    gaps.push("schema_version is invalid");
  }
  if (![READY_STATE, HOLD_STATE].includes(record.artifact_state)) {
    gaps.push("artifact_state is invalid");
  }
  if (record.artifact_class !== (ready ? ARTIFACT_CLASS : null)) {
    gaps.push(`artifact_class must be ${ready ? ARTIFACT_CLASS : "null"}`);
  }
  if (record.source_bound !== ready) gaps.push(`source_bound must be ${ready}`);
  if (record.aggregate_unit_of_analysis !== AGGREGATE_UNIT_OF_ANALYSIS) {
    gaps.push("aggregate_unit_of_analysis is invalid");
  }
  if (record.candidate_model_family !== CANDIDATE_MODEL_FAMILY) {
    gaps.push("candidate_model_family is invalid");
  }
  if (record.estimand_definition !== ESTIMAND_DEFINITION) {
    gaps.push("estimand_definition is invalid");
  }
  if (record.execution_artifact_version !== EXECUTION_ARTIFACT_VERSION) {
    gaps.push("execution_artifact_version is invalid");
  }
  if (record.allowed_next_step !== (ready ? PASSED_NEXT_STEP : HOLD_NEXT_STEP)) {
    gaps.push(`allowed_next_step must be ${ready ? PASSED_NEXT_STEP : HOLD_NEXT_STEP}`);
  }
  if (record.source_promotion_handoff_ref?.promotion_authorized !== false) {
    gaps.push("source_promotion_handoff_ref.promotion_authorized must be false");
  }
  if (ready && record.source_promotion_handoff_ref?.handoff_state !== READY_HANDOFF_STATE) {
    gaps.push("source_promotion_handoff_ref.handoff_state must be passed handoff state");
  }
  if (ready && record.source_promotion_gate_ref?.gate_state !== PASSED_GATE_STATE) {
    gaps.push("source_promotion_gate_ref.gate_state must be passed");
  }
  if (ready && record.source_promotion_gate_ref?.promotion_authorized !== true) {
    gaps.push("source_promotion_gate_ref.promotion_authorized must be true");
  }
  for (const field of [
    "handoff_hash",
    "gate_hash",
    "runtime_hash",
    "review_hash",
    "packet_hash",
    "evidence_hash"
  ]) {
    const value =
      record.source_promotion_handoff_ref?.[field] ??
      record.source_promotion_gate_ref?.[field] ??
      record.source_runtime_ref?.[field] ??
      record.source_diagnostics_review_ref?.[field] ??
      record.source_diagnostics_evidence_packet_ref?.[field] ??
      record.source_governed_diagnostics_sufficiency_evidence_source_ref?.[field];
    if (ready && safeHash(value) === null) gaps.push(`${field} must be a source hash`);
  }
  const scope = asRecord(record.model_execution_scope);
  for (const [field, expected] of Object.entries(modelExecutionScope())) {
    if (scope[field] !== expected) gaps.push(`model_execution_scope.${field} must be ${expected}`);
  }
  const posteriorPolicy = asRecord(record.posterior_values_containment_policy);
  for (const [field, expected] of Object.entries(posteriorValuesContainmentPolicy())) {
    if (posteriorPolicy[field] !== expected) {
      gaps.push(`posterior_values_containment_policy.${field} must be ${expected}`);
    }
  }
  const interpretation = asRecord(record.interpretation_policy);
  for (const [field, expected] of Object.entries(interpretationPolicy())) {
    if (interpretation[field] !== expected) {
      gaps.push(`interpretation_policy.${field} must be ${expected}`);
    }
  }
  const policy = asRecord(record.artifact_policy);
  for (const [field, expected] of Object.entries(artifactPolicy())) {
    if (policy[field] !== expected) gaps.push(`artifact_policy.${field} must be ${expected}`);
  }
  for (const field of BLOCKED_OUTPUT_FIELDS) {
    if (record.blocked_outputs?.[field] !== false) {
      gaps.push(`blocked_outputs.${field} must be false`);
    }
    if (record.feeds?.[field] !== false) {
      gaps.push(`feeds.${field} must be false`);
    }
  }
  if (record.feeds?.posterior_interpretation_specification_gate !== false) {
    gaps.push("feeds.posterior_interpretation_specification_gate must be false");
  }
  if (stableStringify(record.blocked_uses) !== stableStringify(REQUIRED_BLOCKED_USES)) {
    gaps.push("blocked_uses must match governed list");
  }
  if (stableStringify(record.required_caveats) !== stableStringify(REQUIRED_CAVEATS)) {
    gaps.push("required_caveats must match governed list");
  }
  if (record.artifact_hash !== contributionAlignmentInternalBayesianExecutionArtifactV1Hash(record)) {
    gaps.push("artifact_hash must match artifact body");
  }
  if (record.validation_summary?.valid !== ready) {
    gaps.push(`validation_summary.valid must be ${ready}`);
  }
  if (record.validation_summary?.artifact_state !== record.artifact_state) {
    gaps.push("validation_summary.artifact_state must match artifact_state");
  }
  if (!ready && Array.isArray(record.validation_summary?.gaps)) {
    gaps.push(...record.validation_summary.gaps);
  }
  gaps.push(...validateSourceRefs(record, options));
  return {
    schema_version: VALIDATION_SCHEMA_VERSION,
    valid: gaps.length === 0 && ready,
    gaps: sanitizeGaps(gaps)
  };
}

function inputFromCliPath(path) {
  if (path === "-") return JSON.parse(readFileSync(0, "utf8"));
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

function main() {
  const [
    ,
    ,
    promotionHandoffPath,
    promotionGatePath,
    runtimePath,
    diagnosticsReviewPath,
    diagnosticsEvidencePacketPath,
    governedSourcePath
  ] = process.argv;
  if (!promotionHandoffPath) {
    console.error(
      "Usage: node scripts/run_ai_value_contribution_alignment_internal_bayesian_execution_artifact_v1.mjs <promotion-gate-passed-handoff-json|- for stdin> [promotion-gate-json] [runtime-json] [diagnostics-review-json] [diagnostics-evidence-packet-json] [governed-diagnostics-source-json]"
    );
    process.exit(1);
  }
  const artifact = buildContributionAlignmentInternalBayesianExecutionArtifactV1FromObject({
    source_promotion_handoff: inputFromCliPath(promotionHandoffPath),
    ...(promotionGatePath ? { source_promotion_gate: inputFromCliPath(promotionGatePath) } : {}),
    ...(runtimePath ? { source_runtime: inputFromCliPath(runtimePath) } : {}),
    ...(diagnosticsReviewPath
      ? { source_diagnostics_review: inputFromCliPath(diagnosticsReviewPath) }
      : {}),
    ...(diagnosticsEvidencePacketPath
      ? { source_diagnostics_evidence_packet: inputFromCliPath(diagnosticsEvidencePacketPath) }
      : {}),
    ...(governedSourcePath
      ? {
          source_governed_diagnostics_sufficiency_evidence_source:
            inputFromCliPath(governedSourcePath)
        }
      : {})
  });
  process.stdout.write(`${JSON.stringify(artifact, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
