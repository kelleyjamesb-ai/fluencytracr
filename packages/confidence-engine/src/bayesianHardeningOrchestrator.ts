// Ported verbatim from
// scripts/run_ai_value_contribution_alignment_bayesian_hardening_orchestrator.mjs
// under OpenSpec change add-confidence-engine-workspace (task 3.1, module 16).
// Byte-compatibility contract enforced by the golden parity suite.
// Array.prototype.at(-1) adapted to steps[steps.length - 1] for the
// ES2020 lib target (behavior identical).

import { sha256Json } from "./internal/hashing";
import {
  buildContributionAlignmentBayesianPromotionDecisionGateFromObject,
  contributionAlignmentBayesianPromotionDecisionGateHash,
  validateContributionAlignmentBayesianPromotionDecisionGate
} from "./bayesianPromotionDecisionGate";
import {
  buildContributionAlignmentDiagnosticsEvidencePacketFromObject,
  contributionAlignmentDiagnosticsEvidencePacketHash,
  validateContributionAlignmentDiagnosticsEvidencePacket
} from "./diagnosticsEvidencePacket";
import {
  buildContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceFromObject,
  contributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceHash,
  validateContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSource
} from "./governedDiagnosticsSufficiencyEvidenceSource";
import {
  buildContributionAlignmentInternalBayesianExecutionArtifactV1FromObject,
  contributionAlignmentInternalBayesianExecutionArtifactV1Hash,
  validateContributionAlignmentInternalBayesianExecutionArtifactV1
} from "./internalBayesianExecutionArtifactV1";
import {
  buildContributionAlignmentInternalDiagnosticsModelAdequacyReviewFromObject,
  contributionAlignmentInternalDiagnosticsModelAdequacyReviewHash,
  validateContributionAlignmentInternalDiagnosticsModelAdequacyReview
} from "./internalDiagnosticsModelAdequacyReview";
import {
  contributionAlignmentInternalBayesianExecutionRuntimeHash
} from "./internalBayesianExecutionRuntime";
import {
  buildContributionAlignmentPromotionGatePassedArtifactHandoffFromObject,
  contributionAlignmentPromotionGatePassedArtifactHandoffHash,
  validateContributionAlignmentPromotionGatePassedArtifactHandoff
} from "./promotionGatePassedArtifactHandoff";

type AnyRecord = Record<string, any>;

export const CONTRIBUTION_ALIGNMENT_BAYESIAN_HARDENING_ORCHESTRATOR_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_BAYESIAN_HARDENING_ORCHESTRATOR_2026_06";

const VALIDATION_SCHEMA_VERSION =
  `${CONTRIBUTION_ALIGNMENT_BAYESIAN_HARDENING_ORCHESTRATOR_SCHEMA_VERSION}_VALIDATION`;

const READY_STATE = "BAYESIAN_HARDENING_ORCHESTRATOR_REPORT_READY";
const REJECT_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";
const DERIVATION_VERSION =
  "ai_value_contribution_alignment_bayesian_hardening_orchestrator_2026_06";
const DEFAULT_FIRST_BLOCKED_GATE = "governed_diagnostics_sufficiency_evidence_source";

const STEP_ORDER = [
  "governed_diagnostics_sufficiency_evidence_source",
  "diagnostics_evidence_packet",
  "internal_diagnostics_model_adequacy_review",
  "bayesian_promotion_decision_gate",
  "promotion_gate_passed_artifact_handoff",
  "internal_bayesian_execution_artifact_v1"
];

const STEP_READY_STATES: AnyRecord = {
  governed_diagnostics_sufficiency_evidence_source:
    "GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE_READY_FOR_PACKET_REVIEW",
  diagnostics_evidence_packet:
    "DIAGNOSTICS_EVIDENCE_PACKET_READY_FOR_PROMOTION_DECISION_REVIEW",
  internal_diagnostics_model_adequacy_review:
    "INTERNAL_DIAGNOSTICS_AND_MODEL_ADEQUACY_REVIEW_COMPLETED_PROMOTION_BLOCKED",
  bayesian_promotion_decision_gate:
    "BAYESIAN_PROMOTION_DECISION_PASSED_FOR_INTERNAL_EXECUTION_ARTIFACT_ONLY",
  promotion_gate_passed_artifact_handoff:
    "PROMOTION_GATE_PASSED_ARTIFACT_HANDOFF_READY_FOR_INTERNAL_EXECUTION_ARTIFACT_V1_CONTRACT_HANDOFF_ONLY",
  internal_bayesian_execution_artifact_v1:
    "INTERNAL_BAYESIAN_EXECUTION_ARTIFACT_V1_CREATED_INTERPRETATION_BLOCKED"
};

const STEP_REPAIR_NEXT_STEPS: AnyRecord = {
  governed_diagnostics_sufficiency_evidence_source:
    "complete_governed_diagnostics_sufficiency_evidence_source",
  diagnostics_evidence_packet: "diagnostics_evidence_packet_update_only",
  internal_diagnostics_model_adequacy_review:
    "internal_diagnostics_and_model_adequacy_review_only",
  bayesian_promotion_decision_gate: "bayesian_promotion_decision_gate_only",
  promotion_gate_passed_artifact_handoff:
    "promotion_gate_passed_artifact_handoff_only",
  internal_bayesian_execution_artifact_v1:
    "internal_bayesian_execution_artifact_v1_only"
};

const TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "report_id",
  "report_state",
  "generated_at",
  "derivation_version",
  "report_policy",
  "default_execution",
  "explicit_governed_path",
  "current_state",
  "current_gate",
  "allowed_next_step",
  "artifact_hashes",
  "blocked_outputs",
  "promotion_authority",
  "verification_status",
  "blocked_uses",
  "required_caveats",
  "feeds",
  "report_hash"
]);

const REPORT_POLICY_FIELDS = new Set([
  "internal_only",
  "read_only",
  "report_only",
  "promotion_authorized",
  "creates_bayesian_model_artifacts",
  "creates_governed_evidence",
  "fabricates_governed_evidence",
  "creates_posterior_interpretation",
  "confidence_output_authorized",
  "probability_output_authorized",
  "customer_output_authorized",
  "economic_output_authorized",
  "roi_output_authorized",
  "finance_output_authorized",
  "causality_output_authorized",
  "productivity_output_authorized",
  "live_connector_execution_authorized",
  "route_ui_schema_persistence_export_authorized"
]);

const DEFAULT_EXECUTION_FIELDS = new Set([
  "supplied",
  "confirmed_held",
  "first_blocked_gate",
  "current_state",
  "allowed_next_step",
  "steps"
]);

const EXPLICIT_GOVERNED_PATH_SUMMARY_FIELDS = new Set([
  "supplied",
  "completed",
  "first_blocked_gate",
  "current_state",
  "allowed_next_step",
  "steps"
]);

const STEP_SUMMARY_FIELDS = new Set([
  "step",
  "supplied",
  "state",
  "ready",
  "hash",
  "allowed_next_step",
  "promotion_authorized",
  "validation_valid",
  "validation_gaps",
  "source_hold_report"
]);

const ARTIFACT_HASH_FIELDS = new Set([
  "runtime_hash",
  "governed_diagnostics_sufficiency_evidence_source_hash",
  "diagnostics_evidence_packet_hash",
  "diagnostics_review_hash",
  "bayesian_promotion_gate_hash",
  "promotion_handoff_hash",
  "internal_bayesian_execution_artifact_v1_hash"
]);

const PROMOTION_AUTHORITY_FIELDS = new Set([
  "orchestrator_promotion_authorized",
  "bayesian_promotion_gate_promotion_authorized",
  "non_gate_promotion_authorized",
  "only_existing_gate_artifacts_may_authorize_promotion"
]);

const VERIFICATION_STATUS_FIELDS = new Set([
  "default_execution_held",
  "explicit_path_validated",
  "stopped_at_first_blocked_gate",
  "blocked_outputs_false",
  "report_read_only"
]);

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

const FEED_FIELDS = new Set([
  "posterior_interpretation_specification_gate",
  ...BLOCKED_OUTPUT_FIELDS
]);

const SOURCE_HOLD_REPORT_FIELDS = new Set([
  "validation_summary",
  "evidence_readiness_reconciliation"
]);

const SOURCE_HOLD_VALIDATION_SUMMARY_FIELDS = new Set([
  "gaps"
]);

const SOURCE_HOLD_RECONCILIATION_FIELDS = new Set([
  "holding_reasons",
  "unsatisfied_dimensions",
  "missing_evidence_by_dimension"
]);

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
  "promotion_authorization_outside_existing_gate_artifacts",
  "governed_evidence_fabrication"
];

const REQUIRED_CAVEATS = [
  "Bayesian Hardening Orchestrator is read-only and internal-only.",
  "The orchestrator reports existing artifact states and hashes; it does not create governed diagnostics evidence.",
  "The orchestrator never authorizes promotion itself.",
  "The allowed next step is derived from the first blocked gate or completed existing chain only."
];

const FORBIDDEN_INPUT_FIELDS = [
  "reviewed_diagnostics_source_evidence",
  "raw_rows",
  "query_text",
  "identifiers",
  "user_id",
  "person_id",
  "employee_id",
  "email",
  "prompt",
  "raw_prompt",
  "prompts",
  "transcript",
  "transcripts",
  "person_level_data",
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
  "live_connector_execution"
];

const ALLOWED_INPUT_FIELDS = new Set([
  "source_runtime",
  "explicit_governed_path"
]);

const ALLOWED_SOURCE_RUNTIME_ENVELOPE_FIELDS = new Set([
  "source_runtime",
  "source_gate",
  "sourceGate",
  "aggregate_measurement_cell_windows",
  "aggregateMeasurementCellWindows"
]);

const EXPLICIT_GOVERNED_PATH_FIELDS = new Set([
  "source_reviewed_diagnostics_source_evidence",
  "source_governed_diagnostics_sufficiency_evidence_source",
  "source_diagnostics_evidence_packet",
  "source_diagnostics_review",
  "source_promotion_gate",
  "source_promotion_handoff",
  "source_internal_bayesian_execution_artifact_v1"
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

function containsForbiddenKey(value: any): boolean {
  if (Array.isArray(value)) return value.some((item) => containsForbiddenKey(item));
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(([key, nestedValue]) =>
    FORBIDDEN_INPUT_FIELDS.includes(key) || containsForbiddenKey(nestedValue)
  );
}

function inputBoundaryGaps(input: any): string[] {
  const record = asRecord(input);
  const gaps: string[] = [];
  for (const key of Object.keys(record)) {
    if (!ALLOWED_INPUT_FIELDS.has(key)) {
      gaps.push(`Bayesian hardening orchestrator input contains unsupported wrapper field ${key}`);
    }
  }
  if (FORBIDDEN_INPUT_FIELDS.some((field) => Object.prototype.hasOwnProperty.call(record, field))) {
    gaps.push("Bayesian hardening orchestrator input contains blocked output, raw source, or governed evidence fabrication side door");
  }
  const sourceRuntimeEnvelope = asRecord(record.source_runtime);
  if (sourceRuntimeEnvelope.source_runtime) {
    for (const key of Object.keys(sourceRuntimeEnvelope)) {
      if (!ALLOWED_SOURCE_RUNTIME_ENVELOPE_FIELDS.has(key)) {
        gaps.push("Bayesian hardening orchestrator input contains blocked output, raw source, or governed evidence fabrication side door");
      }
    }
  }
  const explicit = asRecord(record.explicit_governed_path);
  for (const key of Object.keys(explicit)) {
    if (!EXPLICIT_GOVERNED_PATH_FIELDS.has(key)) {
      gaps.push(`explicit_governed_path contains unsupported wrapper field ${key}`);
    }
  }
  if (FORBIDDEN_INPUT_FIELDS.some((field) => Object.prototype.hasOwnProperty.call(explicit, field))) {
    gaps.push("explicit_governed_path contains blocked output, raw source, or governed evidence fabrication side door");
  }
  if (
    Object.prototype.hasOwnProperty.call(explicit, "source_reviewed_diagnostics_source_evidence") &&
    !Object.prototype.hasOwnProperty.call(
      explicit,
      "source_governed_diagnostics_sufficiency_evidence_source"
    )
  ) {
    gaps.push("source_reviewed_diagnostics_source_evidence requires source_governed_diagnostics_sufficiency_evidence_source");
  }
  if (containsForbiddenKey(explicit.source_reviewed_diagnostics_source_evidence)) {
    gaps.push("source_reviewed_diagnostics_source_evidence contains blocked output, raw source, or governed evidence fabrication side door");
  }
  return sanitizeGaps(gaps);
}

function stateOf(step: string, artifact: any): any {
  if (!artifact) return null;
  if (step === "governed_diagnostics_sufficiency_evidence_source") return artifact.source_state ?? null;
  if (step === "diagnostics_evidence_packet") return artifact.packet_state ?? null;
  if (step === "internal_diagnostics_model_adequacy_review") return artifact.review_state ?? null;
  if (step === "bayesian_promotion_decision_gate") return artifact.gate_state ?? null;
  if (step === "promotion_gate_passed_artifact_handoff") return artifact.handoff_state ?? null;
  if (step === "internal_bayesian_execution_artifact_v1") return artifact.artifact_state ?? null;
  return null;
}

function hashOf(step: string, artifact: any): string | null {
  if (!artifact) return null;
  if (step === "governed_diagnostics_sufficiency_evidence_source") return safeHash(artifact.evidence_hash);
  if (step === "diagnostics_evidence_packet") return safeHash(artifact.packet_hash);
  if (step === "internal_diagnostics_model_adequacy_review") return safeHash(artifact.review_hash);
  if (step === "bayesian_promotion_decision_gate") return safeHash(artifact.gate_hash);
  if (step === "promotion_gate_passed_artifact_handoff") return safeHash(artifact.handoff_hash);
  if (step === "internal_bayesian_execution_artifact_v1") return safeHash(artifact.artifact_hash);
  return null;
}

function promotionAuthorizedOf(step: string, artifact: any): boolean {
  if (!artifact) return false;
  if (step === "bayesian_promotion_decision_gate") {
    return artifact.promotion_decision?.promotion_authorized === true;
  }
  if (step === "promotion_gate_passed_artifact_handoff") {
    return artifact.handoff_policy?.promotion_authorized === true;
  }
  if (step === "internal_bayesian_execution_artifact_v1") {
    return artifact.artifact_policy?.promotion_authorized === true;
  }
  if (step === "diagnostics_evidence_packet") {
    return artifact.packet_policy?.promotion_authorized === true ||
      artifact.promotion_boundary?.promotion_authorized === true;
  }
  if (step === "internal_diagnostics_model_adequacy_review") {
    return artifact.review_policy?.promotion_authorized === true ||
      artifact.promotion_review?.promotion_authorized === true;
  }
  if (step === "governed_diagnostics_sufficiency_evidence_source") {
    return artifact.source_policy?.promotion_authorized === true ||
      artifact.promotion_boundary?.promotion_authorized === true;
  }
  return false;
}

function sourceHoldReport(step: string, artifact: any): AnyRecord | null {
  if (step !== "governed_diagnostics_sufficiency_evidence_source" || !artifact) {
    return null;
  }
  const validationSummary = asRecord(artifact.validation_summary);
  const reconciliation = asRecord(artifact.evidence_readiness_reconciliation);
  return {
    validation_summary: {
      gaps: Array.isArray(validationSummary.gaps) ? [...validationSummary.gaps] : []
    },
    evidence_readiness_reconciliation: {
      holding_reasons: Array.isArray(reconciliation.holding_reasons)
        ? [...reconciliation.holding_reasons]
        : [],
      unsatisfied_dimensions: Array.isArray(reconciliation.unsatisfied_dimensions)
        ? [...reconciliation.unsatisfied_dimensions]
        : [],
      missing_evidence_by_dimension: clone(reconciliation.missing_evidence_by_dimension) ?? {}
    }
  };
}

function stepSummary(step: string, artifact: any, validation: any, options: AnyRecord = {}): AnyRecord {
  return {
    step,
    supplied: artifact !== null && artifact !== undefined,
    state: stateOf(step, artifact),
    ready: stateOf(step, artifact) === STEP_READY_STATES[step],
    hash: hashOf(step, artifact),
    allowed_next_step: artifact?.allowed_next_step ?? null,
    promotion_authorized: promotionAuthorizedOf(step, artifact),
    validation_valid: validation?.valid === true,
    validation_gaps: Array.isArray(validation?.gaps) ? validation.gaps : [],
    source_hold_report: options.includeSourceHoldReport === true
      ? sourceHoldReport(step, artifact)
      : null
  };
}

function firstBlockedStep(steps: AnyRecord[]): AnyRecord | null {
  return steps.find((step) =>
    step.supplied !== true || step.ready !== true || step.validation_valid !== true
  ) ?? null;
}

function allowedNextStepForBlocked(steps: AnyRecord[], firstBlocked: AnyRecord | null): any {
  if (!firstBlocked) return steps[steps.length - 1]?.allowed_next_step ?? null;
  if (firstBlocked.supplied === true && firstBlocked.validation_valid !== true) {
    return STEP_REPAIR_NEXT_STEPS[firstBlocked.step] ?? firstBlocked.allowed_next_step;
  }
  if (firstBlocked.allowed_next_step) return firstBlocked.allowed_next_step;
  const blockedIndex = steps.findIndex((step) => step.step === firstBlocked.step);
  if (blockedIndex > 0) return steps[blockedIndex - 1]?.allowed_next_step ?? null;
  return null;
}

function sourceRuntimeSourceFromInput(input: any): AnyRecord {
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

function buildDefaultChain(sourceRuntime: any): AnyRecord {
  const governedSource =
    buildContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceFromObject(sourceRuntime);
  return { governedSource };
}

function defaultExecutionSummary(sourceRuntimeSource: any): AnyRecord {
  const chain = buildDefaultChain(sourceRuntimeSource.sourceRuntimeInput);
  const governedValidation =
    validateContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSource(
      chain.governedSource,
      {
        sourceRuntime: sourceRuntimeSource.sourceRuntime,
        sourceGate: sourceRuntimeSource.sourceGate,
        aggregateMeasurementCellWindows: sourceRuntimeSource.aggregateMeasurementCellWindows
      }
    );
  const steps = [
    stepSummary(
      "governed_diagnostics_sufficiency_evidence_source",
      chain.governedSource,
      governedValidation,
      { includeSourceHoldReport: true }
    ),
    stepSummary("diagnostics_evidence_packet", null, null),
    stepSummary("internal_diagnostics_model_adequacy_review", null, null),
    stepSummary("bayesian_promotion_decision_gate", null, null),
    stepSummary("promotion_gate_passed_artifact_handoff", null, null),
    stepSummary("internal_bayesian_execution_artifact_v1", null, null)
  ];
  const firstBlocked = firstBlockedStep(steps);
  return {
    supplied: true,
    confirmed_held: firstBlocked?.step === DEFAULT_FIRST_BLOCKED_GATE,
    first_blocked_gate: firstBlocked?.step ?? null,
    current_state: firstBlocked?.state ?? null,
    allowed_next_step: firstBlocked?.allowed_next_step ?? null,
    steps
  };
}

function explicitArtifacts(input: any): AnyRecord {
  const explicit = asRecord(input.explicit_governed_path);
  return {
    reviewedDiagnosticsSourceEvidence:
      explicit.source_reviewed_diagnostics_source_evidence ?? null,
    governedSource:
      explicit.source_governed_diagnostics_sufficiency_evidence_source ?? null,
    packet: explicit.source_diagnostics_evidence_packet ?? null,
    review: explicit.source_diagnostics_review ?? null,
    gate: explicit.source_promotion_gate ?? null,
    handoff: explicit.source_promotion_handoff ?? null,
    artifact: explicit.source_internal_bayesian_execution_artifact_v1 ?? null
  };
}

function explicitValidation(step: string, artifacts: any, sourceRuntimeSource: any): AnyRecord | null {
  const sourceRuntime = sourceRuntimeSource.sourceRuntime;
  const runtimeOptions = {
    sourceRuntime,
    sourceGate: sourceRuntimeSource.sourceGate,
    aggregateMeasurementCellWindows: sourceRuntimeSource.aggregateMeasurementCellWindows
  };
  if (step === "governed_diagnostics_sufficiency_evidence_source") {
    if (!artifacts.governedSource) return null;
    return validateContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSource(
      artifacts.governedSource,
      {
        ...runtimeOptions,
        ...(artifacts.reviewedDiagnosticsSourceEvidence
          ? {
              reviewedDiagnosticsSourceEvidence:
                artifacts.reviewedDiagnosticsSourceEvidence
            }
          : {})
      }
    );
  }
  if (step === "diagnostics_evidence_packet") {
    return artifacts.packet
      ? validateContributionAlignmentDiagnosticsEvidencePacket(artifacts.packet, {
          ...runtimeOptions,
          sourceGovernedDiagnosticsSufficiencyEvidenceSource: artifacts.governedSource
        })
      : null;
  }
  if (step === "internal_diagnostics_model_adequacy_review") {
    return artifacts.review
      ? validateContributionAlignmentInternalDiagnosticsModelAdequacyReview(
          artifacts.review,
          {
            ...runtimeOptions,
            sourceGovernedDiagnosticsSufficiencyEvidenceSource: artifacts.governedSource
          }
        )
      : null;
  }
  if (step === "bayesian_promotion_decision_gate") {
    return artifacts.gate
      ? validateContributionAlignmentBayesianPromotionDecisionGate(artifacts.gate, {
          sourceDiagnosticsReview: artifacts.review,
          ...runtimeOptions,
          sourceDiagnosticsEvidencePacket: artifacts.packet
        })
      : null;
  }
  if (step === "promotion_gate_passed_artifact_handoff") {
    return artifacts.handoff
      ? validateContributionAlignmentPromotionGatePassedArtifactHandoff(artifacts.handoff, {
          ...runtimeOptions,
          governedSource: artifacts.governedSource,
          diagnosticsReview: artifacts.review,
          diagnosticsEvidencePacket: artifacts.packet,
          promotionGate: artifacts.gate
        })
      : null;
  }
  if (step === "internal_bayesian_execution_artifact_v1") {
    return artifacts.artifact
      ? validateContributionAlignmentInternalBayesianExecutionArtifactV1(
          artifacts.artifact,
          {
            sourcePromotionHandoff: artifacts.handoff,
            sourcePromotionGate: artifacts.gate,
            ...runtimeOptions,
            sourceDiagnosticsReview: artifacts.review,
            sourceDiagnosticsEvidencePacket: artifacts.packet,
            sourceGovernedDiagnosticsSufficiencyEvidenceSource: artifacts.governedSource
          }
        )
      : null;
  }
  return null;
}

function explicitPathSummary(input: any, sourceRuntimeSource: any): AnyRecord {
  const supplied = Object.prototype.hasOwnProperty.call(
    asRecord(input),
    "explicit_governed_path"
  );
  if (!supplied) {
    return {
      supplied: false,
      completed: false,
      first_blocked_gate: null,
      current_state: null,
      allowed_next_step: null,
      steps: []
    };
  }
  const artifacts = explicitArtifacts(input);
  const byStep: AnyRecord = {
    governed_diagnostics_sufficiency_evidence_source: artifacts.governedSource,
    diagnostics_evidence_packet: artifacts.packet,
    internal_diagnostics_model_adequacy_review: artifacts.review,
    bayesian_promotion_decision_gate: artifacts.gate,
    promotion_gate_passed_artifact_handoff: artifacts.handoff,
    internal_bayesian_execution_artifact_v1: artifacts.artifact
  };
  const steps = STEP_ORDER.map((step) =>
    stepSummary(step, byStep[step], explicitValidation(step, artifacts, sourceRuntimeSource))
  );
  const firstBlocked = firstBlockedStep(steps);
  return {
    supplied: true,
    completed: firstBlocked === null,
    first_blocked_gate: firstBlocked?.step ?? null,
    current_state: firstBlocked?.state ?? steps[steps.length - 1]?.state ?? null,
    allowed_next_step: allowedNextStepForBlocked(steps, firstBlocked),
    steps
  };
}

function artifactHashes(sourceRuntime: any, defaultExecution: any, explicitPath: any): AnyRecord {
  const explicitSteps = Object.fromEntries(
    explicitPath.steps.map((step: AnyRecord) => [step.step, step])
  );
  const defaultSteps = Object.fromEntries(
    defaultExecution.steps.map((step: AnyRecord) => [step.step, step])
  );
  const step = (name: string) => explicitSteps[name]?.hash ?? defaultSteps[name]?.hash ?? null;
  return {
    runtime_hash: safeHash(sourceRuntime?.runtime_hash),
    governed_diagnostics_sufficiency_evidence_source_hash:
      step("governed_diagnostics_sufficiency_evidence_source"),
    diagnostics_evidence_packet_hash: step("diagnostics_evidence_packet"),
    diagnostics_review_hash: step("internal_diagnostics_model_adequacy_review"),
    bayesian_promotion_gate_hash: step("bayesian_promotion_decision_gate"),
    promotion_handoff_hash: step("promotion_gate_passed_artifact_handoff"),
    internal_bayesian_execution_artifact_v1_hash:
      step("internal_bayesian_execution_artifact_v1")
  };
}

function promotionAuthority(explicitPath: any): AnyRecord {
  const gateStep = explicitPath.steps.find((step: AnyRecord) => step.step === "bayesian_promotion_decision_gate");
  const nonGatePromotion = explicitPath.steps.some((step: AnyRecord) =>
    step.step !== "bayesian_promotion_decision_gate" &&
    step.promotion_authorized === true
  );
  return {
    orchestrator_promotion_authorized: false,
    bayesian_promotion_gate_promotion_authorized:
      gateStep?.promotion_authorized === true,
    non_gate_promotion_authorized: nonGatePromotion,
    only_existing_gate_artifacts_may_authorize_promotion:
      nonGatePromotion === false
  };
}

function verificationStatus(defaultExecution: any, explicitPath: any): AnyRecord {
  const defaultHeld = defaultExecution.confirmed_held === true;
  const explicitValidationValid =
    explicitPath.supplied !== true ||
    explicitPath.steps.every((step: AnyRecord) =>
      step.supplied === true ? step.validation_valid === true : true
    );
  return {
    default_execution_held: defaultHeld,
    explicit_path_validated: explicitValidationValid,
    stopped_at_first_blocked_gate:
      explicitPath.supplied === true
        ? explicitPath.completed === true || explicitPath.first_blocked_gate !== null
        : defaultExecution.first_blocked_gate !== null,
    blocked_outputs_false: true,
    report_read_only: true
  };
}

function buildReport(input: any): AnyRecord {
  const sourceRuntimeSource = sourceRuntimeSourceFromInput(input);
  const sourceRuntime = sourceRuntimeSource.sourceRuntime;
  const defaultExecution = defaultExecutionSummary(sourceRuntimeSource);
  const explicitPath = explicitPathSummary(input, sourceRuntimeSource);
  const allowedNextStep =
    explicitPath.supplied === true
      ? explicitPath.allowed_next_step
      : defaultExecution.allowed_next_step;
  const currentState =
    explicitPath.supplied === true && explicitPath.current_state
      ? explicitPath.current_state
      : defaultExecution.current_state;
  const currentGate =
    explicitPath.completed === true
      ? "internal_bayesian_execution_artifact_v1"
      : explicitPath.first_blocked_gate ?? defaultExecution.first_blocked_gate;
  const report: AnyRecord = {
    schema_version: CONTRIBUTION_ALIGNMENT_BAYESIAN_HARDENING_ORCHESTRATOR_SCHEMA_VERSION,
    report_id: `contribution_alignment_bayesian_hardening_orchestrator_${sha256Json({
      runtime_hash: sourceRuntime?.runtime_hash,
      allowed_next_step: allowedNextStep,
      report_version: DERIVATION_VERSION
    }).slice(0, 16)}`,
    report_state: READY_STATE,
    generated_at: "2026-06-26T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    report_policy: {
      internal_only: true,
      read_only: true,
      report_only: true,
      promotion_authorized: false,
      creates_bayesian_model_artifacts: false,
      creates_governed_evidence: false,
      fabricates_governed_evidence: false,
      creates_posterior_interpretation: false,
      confidence_output_authorized: false,
      probability_output_authorized: false,
      customer_output_authorized: false,
      economic_output_authorized: false,
      roi_output_authorized: false,
      finance_output_authorized: false,
      causality_output_authorized: false,
      productivity_output_authorized: false,
      live_connector_execution_authorized: false,
      route_ui_schema_persistence_export_authorized: false
    },
    default_execution: defaultExecution,
    explicit_governed_path: explicitPath,
    current_state: currentState,
    current_gate: currentGate,
    allowed_next_step: allowedNextStep,
    artifact_hashes: artifactHashes(sourceRuntime, defaultExecution, explicitPath),
    blocked_outputs: falseMap(BLOCKED_OUTPUT_FIELDS),
    promotion_authority: promotionAuthority(explicitPath),
    verification_status: verificationStatus(defaultExecution, explicitPath),
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    required_caveats: [...REQUIRED_CAVEATS],
    feeds: {
      posterior_interpretation_specification_gate: false,
      ...falseMap(BLOCKED_OUTPUT_FIELDS)
    }
  };
  report.report_hash = contributionAlignmentBayesianHardeningOrchestratorReportHash(report);
  return report;
}

function rejectedReport(): AnyRecord {
  const report: AnyRecord = {
    schema_version: CONTRIBUTION_ALIGNMENT_BAYESIAN_HARDENING_ORCHESTRATOR_SCHEMA_VERSION,
    report_id: null,
    report_state: REJECT_STATE,
    generated_at: "2026-06-26T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    report_policy: {
      internal_only: true,
      read_only: true,
      report_only: true,
      promotion_authorized: false,
      fabricates_governed_evidence: false
    },
    default_execution: null,
    explicit_governed_path: null,
    current_state: null,
    current_gate: null,
    allowed_next_step: null,
    artifact_hashes: {},
    blocked_outputs: falseMap(BLOCKED_OUTPUT_FIELDS),
    promotion_authority: {
      orchestrator_promotion_authorized: false,
      bayesian_promotion_gate_promotion_authorized: false,
      non_gate_promotion_authorized: false,
      only_existing_gate_artifacts_may_authorize_promotion: true
    },
    verification_status: {
      default_execution_held: false,
      explicit_path_validated: false,
      stopped_at_first_blocked_gate: false,
      blocked_outputs_false: true,
      report_read_only: true
    },
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    required_caveats: [...REQUIRED_CAVEATS],
    feeds: {
      posterior_interpretation_specification_gate: false,
      ...falseMap(BLOCKED_OUTPUT_FIELDS)
    }
  };
  report.report_hash = contributionAlignmentBayesianHardeningOrchestratorReportHash(report);
  return report;
}

export function contributionAlignmentBayesianHardeningOrchestratorReportHash(report: any): string {
  const withoutHash = clone(report);
  delete withoutHash.report_hash;
  return sha256Json(withoutHash);
}

export function buildContributionAlignmentBayesianHardeningOrchestratorReportFromObject(input: unknown): AnyRecord {
  if (inputBoundaryGaps(input).length > 0) return rejectedReport();
  return buildReport(input);
}

function collectAllowedFieldsGaps(record: any, fields: Set<string>, label: string): string[] {
  return Object.keys(asRecord(record))
    .filter((key) => !fields.has(key))
    .map((key) => `${label} contains ungoverned field ${key}`);
}

function collectStepSummaryGaps(steps: any, label: string): string[] {
  if (!Array.isArray(steps)) return [`${label}.steps must be an array`];
  return steps.flatMap((step, index) => {
    const stepLabel = `${label}.steps[${index}]`;
    const gaps = collectAllowedFieldsGaps(step, STEP_SUMMARY_FIELDS, stepLabel);
    if (step?.source_hold_report !== null) {
      gaps.push(...collectAllowedFieldsGaps(
        step?.source_hold_report,
        SOURCE_HOLD_REPORT_FIELDS,
        `${stepLabel}.source_hold_report`
      ));
      gaps.push(...collectAllowedFieldsGaps(
        step?.source_hold_report?.validation_summary,
        SOURCE_HOLD_VALIDATION_SUMMARY_FIELDS,
        `${stepLabel}.source_hold_report.validation_summary`
      ));
      gaps.push(...collectAllowedFieldsGaps(
        step?.source_hold_report?.evidence_readiness_reconciliation,
        SOURCE_HOLD_RECONCILIATION_FIELDS,
        `${stepLabel}.source_hold_report.evidence_readiness_reconciliation`
      ));
    }
    return gaps;
  });
}

function validateAgainstSources(report: any, options: AnyRecord): string[] {
  const gaps: string[] = [];
  const sourceRuntimeSource = sourceRuntimeSourceFromInput({
    source_runtime: options.sourceRuntime,
    source_gate: options.sourceGate,
    aggregate_measurement_cell_windows: options.aggregateMeasurementCellWindows
  });
  const sourceRuntime = sourceRuntimeSource.sourceRuntime;
  if (report?.report_state === READY_STATE && !sourceRuntime) {
    gaps.push("sourceRuntime is required for ready Bayesian hardening orchestrator validation");
  }
  if (
    report?.report_state === READY_STATE &&
    report.explicit_governed_path?.supplied === true &&
    !options.explicitGovernedPath
  ) {
    gaps.push("explicitGovernedPath is required for ready explicit governed path validation");
  }
  if (sourceRuntime && report.artifact_hashes?.runtime_hash !== sourceRuntime.runtime_hash) {
    gaps.push("report runtime hash does not match sourceRuntime");
  }
  if (sourceRuntime) {
    const expected = buildContributionAlignmentBayesianHardeningOrchestratorReportFromObject({
      source_runtime: sourceRuntimeSource.sourceRuntimeInput,
      ...(options.explicitGovernedPath
        ? { explicit_governed_path: options.explicitGovernedPath }
        : {})
    });
    const actualWithoutHash = clone(report);
    const expectedWithoutHash = clone(expected);
    delete actualWithoutHash.report_hash;
    delete expectedWithoutHash.report_hash;
    if (stableStringify(actualWithoutHash) !== stableStringify(expectedWithoutHash)) {
      gaps.push("Bayesian hardening orchestrator report mismatch against supplied sourceRuntime or explicit governed path");
    }
  }
  return gaps;
}

export function validateContributionAlignmentBayesianHardeningOrchestratorReport(
  report: any,
  options: AnyRecord = {}
): AnyRecord {
  if (report?.report_state === REJECT_STATE) {
    return {
      schema_version: VALIDATION_SCHEMA_VERSION,
      valid: false,
      gaps: ["boundary leakage rejected"]
    };
  }
  const record = asRecord(report);
  const gaps: string[] = [];
  gaps.push(...collectAllowedFieldsGaps(record, TOP_LEVEL_FIELDS, "report"));
  gaps.push(...collectAllowedFieldsGaps(record.report_policy, REPORT_POLICY_FIELDS, "report_policy"));
  gaps.push(...collectAllowedFieldsGaps(record.default_execution, DEFAULT_EXECUTION_FIELDS, "default_execution"));
  gaps.push(...collectAllowedFieldsGaps(
    record.explicit_governed_path,
    EXPLICIT_GOVERNED_PATH_SUMMARY_FIELDS,
    "explicit_governed_path"
  ));
  gaps.push(...collectStepSummaryGaps(record.default_execution?.steps, "default_execution"));
  gaps.push(...collectStepSummaryGaps(record.explicit_governed_path?.steps, "explicit_governed_path"));
  gaps.push(...collectAllowedFieldsGaps(record.artifact_hashes, ARTIFACT_HASH_FIELDS, "artifact_hashes"));
  gaps.push(...collectAllowedFieldsGaps(record.blocked_outputs, new Set(BLOCKED_OUTPUT_FIELDS), "blocked_outputs"));
  gaps.push(...collectAllowedFieldsGaps(
    record.promotion_authority,
    PROMOTION_AUTHORITY_FIELDS,
    "promotion_authority"
  ));
  gaps.push(...collectAllowedFieldsGaps(
    record.verification_status,
    VERIFICATION_STATUS_FIELDS,
    "verification_status"
  ));
  gaps.push(...collectAllowedFieldsGaps(record.feeds, FEED_FIELDS, "feeds"));
  if (record.schema_version !== CONTRIBUTION_ALIGNMENT_BAYESIAN_HARDENING_ORCHESTRATOR_SCHEMA_VERSION) {
    gaps.push("schema_version is invalid");
  }
  if (record.report_state !== READY_STATE) {
    gaps.push("report_state must be BAYESIAN_HARDENING_ORCHESTRATOR_REPORT_READY");
  }
  if (record.report_policy?.promotion_authorized !== false) {
    gaps.push("report_policy.promotion_authorized must be false");
  }
  if (record.report_policy?.read_only !== true) {
    gaps.push("report_policy.read_only must be true");
  }
  if (record.report_policy?.fabricates_governed_evidence !== false) {
    gaps.push("report_policy.fabricates_governed_evidence must be false");
  }
  if (record.default_execution?.confirmed_held !== true) {
    gaps.push("default execution must remain held");
  }
  if (record.default_execution?.first_blocked_gate !== DEFAULT_FIRST_BLOCKED_GATE) {
    gaps.push("default execution must stop first at governed diagnostics sufficiency evidence source");
  }
  if (record.verification_status?.stopped_at_first_blocked_gate !== true) {
    gaps.push("orchestrator must stop at the first missing or blocked gate");
  }
  if (record.verification_status?.explicit_path_validated !== true) {
    const invalidSuppliedSteps = asRecord(record.explicit_governed_path).steps?.filter?.((step: AnyRecord) =>
      step?.supplied === true && step?.validation_valid !== true
    ) ?? [];
    if (invalidSuppliedSteps.length > 0) {
      gaps.push("explicit governed path contains supplied artifacts that failed validation");
    }
  }
  if (record.promotion_authority?.orchestrator_promotion_authorized !== false) {
    gaps.push("orchestrator must not authorize promotion");
  }
  if (record.promotion_authority?.non_gate_promotion_authorized !== false) {
    gaps.push("non-gate artifacts must not authorize promotion");
  }
  if (record.promotion_authority?.only_existing_gate_artifacts_may_authorize_promotion !== true) {
    gaps.push("promotion authority must stay inside existing gate artifacts");
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
  for (const [key, value] of Object.entries(asRecord(record.artifact_hashes))) {
    if (value !== null && safeHash(value) === null) {
      gaps.push(`artifact_hashes.${key} must be a sha256 hash or null`);
    }
  }
  if (stableStringify(record.blocked_uses) !== stableStringify(REQUIRED_BLOCKED_USES)) {
    gaps.push("blocked_uses must match governed list");
  }
  if (stableStringify(record.required_caveats) !== stableStringify(REQUIRED_CAVEATS)) {
    gaps.push("required_caveats must match governed list");
  }
  if (record.report_hash !== contributionAlignmentBayesianHardeningOrchestratorReportHash(record)) {
    gaps.push("report_hash must match report body");
  }
  gaps.push(...validateAgainstSources(record, options));
  return {
    schema_version: VALIDATION_SCHEMA_VERSION,
    valid: gaps.length === 0,
    gaps: sanitizeGaps(gaps)
  };
}
