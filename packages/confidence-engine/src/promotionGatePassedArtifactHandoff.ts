// Ported verbatim from
// scripts/run_ai_value_contribution_alignment_promotion_gate_passed_artifact_handoff.mjs
// under OpenSpec change add-confidence-engine-workspace (task 3.1, module 14).
// Byte-compatibility contract enforced by the golden parity suite.

import { sha256Json } from "./internal/hashing";
import {
  buildContributionAlignmentBayesianPromotionDecisionGateFromObject,
  contributionAlignmentBayesianPromotionDecisionGateHash,
  validateContributionAlignmentBayesianPromotionDecisionGate
} from "./bayesianPromotionDecisionGate";
import {
  buildContributionAlignmentDiagnosticsEvidencePacketFromObject,
  contributionAlignmentDiagnosticsEvidencePacketHash
} from "./diagnosticsEvidencePacket";
import {
  buildContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceFromObject,
  contributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceHash
} from "./governedDiagnosticsSufficiencyEvidenceSource";
import {
  buildContributionAlignmentInternalDiagnosticsModelAdequacyReviewFromObject,
  contributionAlignmentInternalDiagnosticsModelAdequacyReviewHash
} from "./internalDiagnosticsModelAdequacyReview";
import {
  contributionAlignmentInternalBayesianExecutionRuntimeHash
} from "./internalBayesianExecutionRuntime";

type AnyRecord = Record<string, any>;

export const CONTRIBUTION_ALIGNMENT_PROMOTION_GATE_PASSED_ARTIFACT_HANDOFF_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_PROMOTION_GATE_PASSED_ARTIFACT_HANDOFF_2026_06";

const VALIDATION_SCHEMA_VERSION =
  `${CONTRIBUTION_ALIGNMENT_PROMOTION_GATE_PASSED_ARTIFACT_HANDOFF_SCHEMA_VERSION}_VALIDATION`;

const READY_STATE =
  "PROMOTION_GATE_PASSED_ARTIFACT_HANDOFF_READY_FOR_INTERNAL_EXECUTION_ARTIFACT_V1_CONTRACT_HANDOFF_ONLY";
const HOLD_STATE = "HOLD_FOR_PROMOTION_GATE_PASSED_ARTIFACT_HANDOFF";
const REJECT_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";

const PASSED_GATE_STATE =
  "BAYESIAN_PROMOTION_DECISION_PASSED_FOR_INTERNAL_EXECUTION_ARTIFACT_ONLY";
const HOLD_NEXT_STEP = "complete_governed_diagnostics_sufficiency_evidence_source";
const PASSED_NEXT_STEP = "internal_bayesian_execution_artifact_v1_only";
const HANDOFF_CLASS = "promotion_gate_passed_artifact_handoff_only";
const HANDOFF_VERSION = "promotion_gate_passed_artifact_handoff_2026_06";
const DERIVATION_VERSION =
  "ai_value_contribution_alignment_promotion_gate_passed_artifact_handoff_2026_06";

const TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "handoff_id",
  "handoff_state",
  "handoff_class",
  "generated_at",
  "derivation_version",
  "source_bound",
  "source_hashes",
  "promotion_gate_ref",
  "source_promotion_authority",
  "handoff_policy",
  "blocked_output_proof",
  "created_artifacts",
  "allowed_next_step",
  "blocked_uses",
  "required_caveats",
  "feeds",
  "validation_summary",
  "handoff_hash"
]);

const BLOCKED_OUTPUT_FIELDS = [
  "internal_posterior_interpretation_specification",
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
  "live_connector_execution"
];

const REQUIRED_BLOCKED_USES = [
  "promotion_authorization_outside_bayesian_promotion_decision_gate",
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
  "Promotion Gate Passed Artifact Handoff is internal-only and aggregate-only.",
  "The handoff records a passed Bayesian Promotion Decision Gate artifact; it does not authorize promotion itself.",
  "Default execution remains held unless explicit governed diagnostics sufficiency evidence is supplied.",
  "The only allowed next slice after a passed gate is Internal Bayesian Execution Artifact v1."
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
  "reviewed_diagnostics_source_evidence"
];

const ALLOWED_SOURCE_RUNTIME_ENVELOPE_FIELDS = new Set([
  "source_runtime",
  "source_gate",
  "sourceGate",
  "aggregate_measurement_cell_windows",
  "aggregateMeasurementCellWindows"
]);

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

function safeHash(value: unknown): string | null {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value) ? value : null;
}

function sourceRuntimeSourceFromInput(input: unknown): AnyRecord {
  const record = asRecord(input);
  const supplied = Object.prototype.hasOwnProperty.call(record, "source_runtime")
    ? record.source_runtime
    : input;
  const envelope = asRecord(supplied);
  if (envelope.source_runtime) {
    return {
      sourceRuntime: envelope.source_runtime,
      sourceRuntimeInput: envelope,
      sourceGate: envelope.source_gate ?? envelope.sourceGate,
      aggregateMeasurementCellWindows:
        envelope.aggregate_measurement_cell_windows ??
        envelope.aggregateMeasurementCellWindows
    };
  }
  const sourceGate = record.source_gate ?? record.sourceGate;
  const aggregateMeasurementCellWindows =
    record.aggregate_measurement_cell_windows ??
    record.aggregateMeasurementCellWindows;
  const sourceRuntimeInput =
    supplied && sourceGate && Array.isArray(aggregateMeasurementCellWindows)
      ? {
          source_runtime: supplied,
          source_gate: sourceGate,
          aggregate_measurement_cell_windows: aggregateMeasurementCellWindows
        }
      : supplied;
  return {
    sourceRuntime: supplied,
    sourceRuntimeInput,
    sourceGate,
    aggregateMeasurementCellWindows
  };
}

function inputBoundaryGaps(input: unknown): string[] {
  const record = asRecord(input);
  const sourceRuntimeEnvelope = asRecord(record.source_runtime);
  const nestedSidecar =
    sourceRuntimeEnvelope.source_runtime
      ? Object.fromEntries(
          Object.entries(sourceRuntimeEnvelope).filter(
            ([key]) => !ALLOWED_SOURCE_RUNTIME_ENVELOPE_FIELDS.has(key)
          )
        )
      : {};
  return FORBIDDEN_INPUT_FIELDS.some((field) => Object.prototype.hasOwnProperty.call(record, field)) ||
    Object.keys(nestedSidecar).length > 0
    ? ["promotion gate passed artifact handoff input contains blocked output or raw source side door"]
    : [];
}

function buildSources(input: unknown): AnyRecord {
  const record = asRecord(input);
  const sourceRuntimeSource = sourceRuntimeSourceFromInput(input);
  const sourceRuntime = sourceRuntimeSource.sourceRuntime;
  const sourceRuntimeInput = sourceRuntimeSource.sourceRuntimeInput;
  const governedSource =
    record.source_governed_diagnostics_sufficiency_evidence_source ??
    buildContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceFromObject(
      sourceRuntimeInput
    );
  const diagnosticsReview =
    record.source_diagnostics_review ??
    buildContributionAlignmentInternalDiagnosticsModelAdequacyReviewFromObject({
      source_runtime: sourceRuntimeInput,
      source_diagnostics_sufficiency_evidence: governedSource
    });
  const diagnosticsEvidencePacket =
    record.source_diagnostics_evidence_packet ??
    buildContributionAlignmentDiagnosticsEvidencePacketFromObject({
      source_runtime: sourceRuntimeInput,
      source_diagnostics_sufficiency_evidence: governedSource
    });
  const promotionGate =
    record.source_promotion_gate ??
    buildContributionAlignmentBayesianPromotionDecisionGateFromObject({
      source_diagnostics_review: diagnosticsReview,
      source_runtime: sourceRuntimeInput,
      source_diagnostics_evidence_packet: diagnosticsEvidencePacket
    });
  return {
    sourceRuntime,
    sourceGate: sourceRuntimeSource.sourceGate,
    aggregateMeasurementCellWindows: sourceRuntimeSource.aggregateMeasurementCellWindows,
    governedSource,
    diagnosticsReview,
    diagnosticsEvidencePacket,
    promotionGate
  };
}

function sourceHashes(sources: AnyRecord): AnyRecord {
  return {
    runtime_hash: safeHash(sources.sourceRuntime?.runtime_hash),
    diagnostics_model_adequacy_review_hash: safeHash(sources.diagnosticsReview?.review_hash),
    diagnostics_evidence_packet_hash: safeHash(sources.diagnosticsEvidencePacket?.packet_hash),
    governed_diagnostics_sufficiency_evidence_source_hash:
      safeHash(sources.governedSource?.evidence_hash),
    promotion_gate_hash: safeHash(sources.promotionGate?.gate_hash)
  };
}

function promotionGateRef(gate: any, accepted: boolean): AnyRecord {
  return {
    schema_version: gate?.schema_version ?? null,
    gate_id: gate?.gate_id ?? null,
    gate_state: gate?.gate_state ?? null,
    gate_hash: safeHash(gate?.gate_hash),
    promotion_authorized: accepted === true &&
      gate?.promotion_decision?.promotion_authorized === true &&
      gate?.gate_policy?.promotion_authorized === true,
    allowed_next_step: gate?.allowed_next_step ?? null
  };
}

function promotionAuthority(sources: AnyRecord): AnyRecord {
  const governedPolicy = asRecord(sources.governedSource?.source_policy);
  const governedBoundary = asRecord(sources.governedSource?.promotion_boundary);
  const packetPolicy = asRecord(sources.diagnosticsEvidencePacket?.packet_policy);
  const packetBoundary = asRecord(sources.diagnosticsEvidencePacket?.promotion_boundary);
  const reviewPolicy = asRecord(sources.diagnosticsReview?.review_policy);
  const reviewPromotion = asRecord(sources.diagnosticsReview?.promotion_review);
  const gate = sources.promotionGate;
  const authority: AnyRecord = {
    governed_source_promotion_authorized:
      governedPolicy.promotion_authorized === true ||
      governedBoundary.promotion_authorized === true,
    diagnostics_packet_promotion_authorized:
      packetPolicy.promotion_authorized === true ||
      packetBoundary.promotion_authorized === true,
    diagnostics_review_promotion_authorized:
      reviewPolicy.promotion_authorized === true ||
      reviewPromotion.promotion_authorized === true,
    bayesian_promotion_decision_gate_promotion_authorized:
      gate?.promotion_decision?.promotion_authorized === true &&
      gate?.gate_policy?.promotion_authorized === true,
    handoff_promotion_authorized: false
  };
  authority.only_promotion_gate_authorizes_promotion =
    authority.governed_source_promotion_authorized === false &&
    authority.diagnostics_packet_promotion_authorized === false &&
    authority.diagnostics_review_promotion_authorized === false &&
    authority.handoff_promotion_authorized === false;
  return authority;
}

function blockedOutputProof(sources: AnyRecord): AnyRecord {
  const gateFeeds = asRecord(sources.promotionGate?.feeds);
  return Object.fromEntries(
    BLOCKED_OUTPUT_FIELDS.map((field) => [field, gateFeeds[field] === true ? true : false])
  );
}

function createdArtifacts(): AnyRecord {
  return {
    internal_bayesian_execution_artifact_v1: false,
    posterior_interpretation_specification: false,
    customer_facing_output: false,
    route_ui_schema_or_persistence: false
  };
}

function sourceGaps(sources: AnyRecord): string[] {
  const gaps: string[] = [];
  if (!sources.sourceRuntime) gaps.push("source runtime is required");
  if (!sources.governedSource) {
    gaps.push("governed diagnostics sufficiency evidence source is required");
  }
  if (!sources.diagnosticsReview) gaps.push("diagnostics/model adequacy review is required");
  if (!sources.diagnosticsEvidencePacket) gaps.push("diagnostics evidence packet is required");
  if (!sources.promotionGate) gaps.push("Bayesian Promotion Decision Gate is required");
  if (
    sources.sourceRuntime?.runtime_hash !==
    contributionAlignmentInternalBayesianExecutionRuntimeHash(sources.sourceRuntime)
  ) {
    gaps.push("source runtime hash drifted");
  }
  if (
    sources.governedSource?.evidence_hash !==
    contributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceHash(sources.governedSource)
  ) {
    gaps.push("governed diagnostics sufficiency evidence source hash drifted");
  }
  if (
    sources.diagnosticsReview?.review_hash !==
    contributionAlignmentInternalDiagnosticsModelAdequacyReviewHash(sources.diagnosticsReview)
  ) {
    gaps.push("diagnostics/model adequacy review hash drifted");
  }
  if (
    sources.diagnosticsEvidencePacket?.packet_hash !==
    contributionAlignmentDiagnosticsEvidencePacketHash(sources.diagnosticsEvidencePacket)
  ) {
    gaps.push("diagnostics evidence packet hash drifted");
  }
  if (
    sources.promotionGate?.gate_hash !==
    contributionAlignmentBayesianPromotionDecisionGateHash(sources.promotionGate)
  ) {
    gaps.push("Bayesian Promotion Decision Gate hash drifted");
  }
  const gateValidation = validateContributionAlignmentBayesianPromotionDecisionGate(
    sources.promotionGate,
    {
      sourceDiagnosticsReview: sources.diagnosticsReview,
      sourceRuntime: sources.sourceRuntime,
      sourceGate: sources.sourceGate,
      aggregateMeasurementCellWindows: sources.aggregateMeasurementCellWindows,
      sourceDiagnosticsEvidencePacket: sources.diagnosticsEvidencePacket
    }
  );
  if (gateValidation.valid !== true) {
    gaps.push("Bayesian Promotion Decision Gate failed validation against supplied source chain");
    gaps.push(...gateValidation.gaps.map((gap: string) => `promotion_gate.${gap}`));
  }
  if (
    sources.diagnosticsReview?.source_governed_diagnostics_sufficiency_evidence_source_ref?.evidence_hash !==
    sources.governedSource?.evidence_hash
  ) {
    gaps.push("diagnostics/model adequacy review is not bound to governed diagnostics source hash");
  }
  if (
    sources.diagnosticsEvidencePacket?.source_governed_diagnostics_sufficiency_evidence_source_ref?.evidence_hash !==
    sources.governedSource?.evidence_hash
  ) {
    gaps.push("diagnostics evidence packet is not bound to governed diagnostics source hash");
  }
  if (
    sources.promotionGate?.source_diagnostics_review_ref?.review_hash !==
    sources.diagnosticsReview?.review_hash
  ) {
    gaps.push("Promotion Gate is not bound to diagnostics/model adequacy review hash");
  }
  if (
    sources.promotionGate?.source_diagnostics_evidence_packet_ref?.packet_hash !==
    sources.diagnosticsEvidencePacket?.packet_hash
  ) {
    gaps.push("Promotion Gate is not bound to diagnostics evidence packet hash");
  }
  if (
    sources.promotionGate?.source_runtime_ref?.runtime_hash !== sources.sourceRuntime?.runtime_hash
  ) {
    gaps.push("Promotion Gate is not bound to source runtime hash");
  }
  if (sources.promotionGate?.gate_state !== PASSED_GATE_STATE) {
    gaps.push("Promotion Gate did not pass for Internal Bayesian Execution Artifact v1 handoff");
  }
  if (sources.promotionGate?.allowed_next_step !== PASSED_NEXT_STEP) {
    gaps.push("Promotion Gate allowed_next_step is not Internal Bayesian Execution Artifact v1 only");
  }
  const authority = promotionAuthority(sources);
  if (authority.governed_source_promotion_authorized) {
    gaps.push("governed diagnostics sufficiency evidence source promotion_authorized must be false");
  }
  if (authority.diagnostics_packet_promotion_authorized) {
    gaps.push("diagnostics evidence packet promotion_authorized must be false");
  }
  if (authority.diagnostics_review_promotion_authorized) {
    gaps.push("internal diagnostics/model adequacy review promotion_authorized must be false");
  }
  const blocked = blockedOutputProof(sources);
  for (const [field, value] of Object.entries(blocked)) {
    if (value !== false) gaps.push(`${field} must remain blocked`);
  }
  return sanitizeGaps(gaps);
}

function buildHandoff(sources: AnyRecord, state: string, gaps: string[]): AnyRecord {
  const ready = state === READY_STATE;
  const hashes = sourceHashes(sources);
  const handoff: AnyRecord = {
    schema_version: CONTRIBUTION_ALIGNMENT_PROMOTION_GATE_PASSED_ARTIFACT_HANDOFF_SCHEMA_VERSION,
    handoff_id: `contribution_alignment_promotion_gate_passed_artifact_handoff_${sha256Json({
      promotion_gate_hash: hashes.promotion_gate_hash,
      diagnostics_review_hash: hashes.diagnostics_model_adequacy_review_hash,
      diagnostics_packet_hash: hashes.diagnostics_evidence_packet_hash,
      governed_source_hash: hashes.governed_diagnostics_sufficiency_evidence_source_hash,
      handoff_version: HANDOFF_VERSION
    }).slice(0, 16)}`,
    handoff_state: state,
    handoff_class: ready ? HANDOFF_CLASS : null,
    generated_at: "2026-06-25T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    source_bound: ready,
    source_hashes: hashes,
    promotion_gate_ref: promotionGateRef(sources.promotionGate, ready),
    source_promotion_authority: promotionAuthority(sources),
    handoff_policy: {
      internal_only: true,
      aggregate_only: true,
      handoff_only: true,
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
    blocked_output_proof: blockedOutputProof(sources),
    created_artifacts: createdArtifacts(),
    allowed_next_step: ready ? PASSED_NEXT_STEP : HOLD_NEXT_STEP,
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    required_caveats: [...REQUIRED_CAVEATS],
    feeds: {
      internal_bayesian_execution_artifact_v1: false,
      ...falseMap(BLOCKED_OUTPUT_FIELDS)
    },
    validation_summary: {
      schema_version:
        `${CONTRIBUTION_ALIGNMENT_PROMOTION_GATE_PASSED_ARTIFACT_HANDOFF_SCHEMA_VERSION}_SUMMARY`,
      valid: ready,
      handoff_state: state,
      gaps: ready ? [] : sanitizeGaps(gaps)
    }
  };
  handoff.handoff_hash =
    contributionAlignmentPromotionGatePassedArtifactHandoffHash(handoff);
  return handoff;
}

function rejectedHandoff(): AnyRecord {
  const handoff: AnyRecord = {
    schema_version: CONTRIBUTION_ALIGNMENT_PROMOTION_GATE_PASSED_ARTIFACT_HANDOFF_SCHEMA_VERSION,
    handoff_id: null,
    handoff_state: REJECT_STATE,
    generated_at: "2026-06-25T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    source_bound: false,
    handoff_policy: {
      internal_only: true,
      aggregate_only: false,
      handoff_only: true,
      promotion_authorized: false
    },
    blocked_output_proof: falseMap(BLOCKED_OUTPUT_FIELDS),
    created_artifacts: createdArtifacts(),
    allowed_next_step: HOLD_NEXT_STEP,
    validation_summary: {
      schema_version:
        `${CONTRIBUTION_ALIGNMENT_PROMOTION_GATE_PASSED_ARTIFACT_HANDOFF_SCHEMA_VERSION}_SUMMARY`,
      valid: false,
      handoff_state: REJECT_STATE,
      gaps: ["boundary leakage rejected"]
    }
  };
  handoff.handoff_hash =
    contributionAlignmentPromotionGatePassedArtifactHandoffHash(handoff);
  return handoff;
}

export function contributionAlignmentPromotionGatePassedArtifactHandoffHash(handoff: unknown): string {
  const withoutHash = clone(handoff);
  delete withoutHash.handoff_hash;
  return sha256Json(withoutHash);
}

export function buildContributionAlignmentPromotionGatePassedArtifactHandoffFromObject(input: unknown): AnyRecord {
  if (inputBoundaryGaps(input).length > 0) return rejectedHandoff();
  const sources = buildSources(input);
  const gaps = sourceGaps(sources);
  const state = gaps.length === 0 ? READY_STATE : HOLD_STATE;
  return buildHandoff(sources, state, gaps);
}

function collectAllowedFieldsGaps(record: unknown, fields: Set<string>, label: string): string[] {
  return Object.keys(asRecord(record))
    .filter((key) => !fields.has(key))
    .map(() => `${label} contains ungoverned field`);
}

function validateAgainstSources(handoff: AnyRecord, options: AnyRecord): string[] {
  const gaps: string[] = [];
  const sourceRuntimeSource = sourceRuntimeSourceFromInput({
    source_runtime: options.sourceRuntime,
    source_gate: options.sourceGate,
    aggregate_measurement_cell_windows: options.aggregateMeasurementCellWindows
  });
  const sources = {
    sourceRuntime: sourceRuntimeSource.sourceRuntime,
    sourceGate: sourceRuntimeSource.sourceGate,
    aggregateMeasurementCellWindows: sourceRuntimeSource.aggregateMeasurementCellWindows,
    governedSource: options.governedSource,
    diagnosticsReview: options.diagnosticsReview,
    diagnosticsEvidencePacket: options.diagnosticsEvidencePacket,
    promotionGate: options.promotionGate
  };
  if (sources.sourceRuntime && handoff.source_hashes?.runtime_hash !== sources.sourceRuntime.runtime_hash) {
    gaps.push("handoff source runtime hash does not match sourceRuntime");
  }
  if (options.governedSource && handoff.source_hashes?.governed_diagnostics_sufficiency_evidence_source_hash !== options.governedSource.evidence_hash) {
    gaps.push("handoff governed source hash does not match governedSource");
  }
  if (options.diagnosticsReview && handoff.source_hashes?.diagnostics_model_adequacy_review_hash !== options.diagnosticsReview.review_hash) {
    gaps.push("handoff diagnostics review hash does not match diagnosticsReview");
  }
  if (options.diagnosticsEvidencePacket && handoff.source_hashes?.diagnostics_evidence_packet_hash !== options.diagnosticsEvidencePacket.packet_hash) {
    gaps.push("handoff diagnostics evidence packet hash does not match diagnosticsEvidencePacket");
  }
  if (options.promotionGate && handoff.source_hashes?.promotion_gate_hash !== options.promotionGate.gate_hash) {
    gaps.push("handoff promotion gate hash does not match promotionGate");
  }
  const providedSources = Object.values(sources).some(Boolean);
  if (providedSources && options.promotionGate?.gate_state === PASSED_GATE_STATE) {
    const expected = buildHandoff(sources, READY_STATE, []);
    const actualWithoutHash = clone(handoff);
    const expectedWithoutHash = clone(expected);
    delete actualWithoutHash.handoff_hash;
    delete expectedWithoutHash.handoff_hash;
    if (stableStringify(actualWithoutHash) !== stableStringify(expectedWithoutHash)) {
      gaps.push("promotion gate passed artifact handoff mismatch against supplied sources");
    }
  }
  return gaps;
}

export function validateContributionAlignmentPromotionGatePassedArtifactHandoff(handoff: any, options: AnyRecord = {}): AnyRecord {
  if (handoff?.handoff_state === REJECT_STATE) {
    return {
      schema_version: VALIDATION_SCHEMA_VERSION,
      valid: false,
      gaps: ["boundary leakage rejected"]
    };
  }
  const record = asRecord(handoff);
  const ready = record.handoff_state === READY_STATE;
  const gaps: string[] = [];
  gaps.push(...collectAllowedFieldsGaps(record, TOP_LEVEL_FIELDS, "handoff"));
  if (record.schema_version !== CONTRIBUTION_ALIGNMENT_PROMOTION_GATE_PASSED_ARTIFACT_HANDOFF_SCHEMA_VERSION) {
    gaps.push("schema_version is invalid");
  }
  if (![READY_STATE, HOLD_STATE].includes(record.handoff_state)) {
    gaps.push("handoff_state is invalid");
  }
  if (record.handoff_class !== (ready ? HANDOFF_CLASS : null)) {
    gaps.push(`handoff_class must be ${ready ? HANDOFF_CLASS : "null"}`);
  }
  if (record.source_bound !== ready) gaps.push(`source_bound must be ${ready}`);
  if (record.handoff_policy?.promotion_authorized !== false) {
    gaps.push("handoff_policy.promotion_authorized must be false");
  }
  if (record.promotion_gate_ref?.promotion_authorized !== ready) {
    gaps.push(`promotion_gate_ref.promotion_authorized must be ${ready}`);
  }
  if (ready && record.promotion_gate_ref?.gate_state !== PASSED_GATE_STATE) {
    gaps.push("promotion_gate_ref.gate_state must be passed");
  }
  if (record.allowed_next_step !== (ready ? PASSED_NEXT_STEP : HOLD_NEXT_STEP)) {
    gaps.push(`allowed_next_step must be ${ready ? PASSED_NEXT_STEP : HOLD_NEXT_STEP}`);
  }
  if (record.source_promotion_authority?.governed_source_promotion_authorized !== false) {
    gaps.push("governed source promotion_authorized must be false");
  }
  if (record.source_promotion_authority?.diagnostics_packet_promotion_authorized !== false) {
    gaps.push("diagnostics packet promotion_authorized must be false");
  }
  if (record.source_promotion_authority?.diagnostics_review_promotion_authorized !== false) {
    gaps.push("diagnostics review promotion_authorized must be false");
  }
  if (record.source_promotion_authority?.only_promotion_gate_authorizes_promotion !== true) {
    gaps.push("only promotion gate may authorize promotion");
  }
  for (const field of BLOCKED_OUTPUT_FIELDS) {
    if (record.blocked_output_proof?.[field] !== false) {
      gaps.push(`blocked_output_proof.${field} must be false`);
    }
    if (record.feeds?.[field] !== false) {
      gaps.push(`feeds.${field} must be false`);
    }
  }
  for (const [field, expected] of Object.entries(createdArtifacts())) {
    if (record.created_artifacts?.[field] !== expected) {
      gaps.push(`created_artifacts.${field} must be ${expected}`);
    }
  }
  if (record.feeds?.internal_bayesian_execution_artifact_v1 !== false) {
    gaps.push("feeds.internal_bayesian_execution_artifact_v1 must be false");
  }
  if (record.handoff_hash !== contributionAlignmentPromotionGatePassedArtifactHandoffHash(record)) {
    gaps.push("handoff_hash must match handoff body");
  }
  if (record.validation_summary?.valid !== ready) {
    gaps.push(`validation_summary.valid must be ${ready}`);
  }
  if (record.validation_summary?.handoff_state !== record.handoff_state) {
    gaps.push("validation_summary.handoff_state must match handoff_state");
  }
  if (!ready && Array.isArray(record.validation_summary?.gaps)) {
    gaps.push(...record.validation_summary.gaps);
  }
  gaps.push(...validateAgainstSources(record, options));
  return {
    schema_version: VALIDATION_SCHEMA_VERSION,
    valid: gaps.length === 0 && ready,
    gaps: sanitizeGaps(gaps)
  };
}
