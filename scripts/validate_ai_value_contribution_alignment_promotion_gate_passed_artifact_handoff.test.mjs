import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  buildContributionAlignmentFeatureStabilityReviewFromObject
} from "./run_ai_value_contribution_alignment_feature_stability_review.mjs";
import {
  buildContributionAlignmentInternalNumericWeightDecisionFromObject
} from "./run_ai_value_contribution_alignment_internal_numeric_weight_decision.mjs";
import {
  buildContributionAlignmentVersionedWeightObjectFromObject
} from "./run_ai_value_contribution_alignment_versioned_weight_object.mjs";
import {
  buildContributionAlignmentWeightedInternalModelFrameFromObject
} from "./run_ai_value_contribution_alignment_weighted_internal_model_frame.mjs";
import {
  buildContributionAlignmentInternalBayesianReadinessReviewFromObject
} from "./run_ai_value_contribution_alignment_internal_bayesian_readiness_review.mjs";
import {
  buildContributionAlignmentBayesianModelSpecificationFromObject
} from "./run_ai_value_contribution_alignment_bayesian_model_specification.mjs";
import {
  buildContributionAlignmentInternalBayesianExecutionGateFromObject
} from "./run_ai_value_contribution_alignment_internal_bayesian_execution_gate.mjs";
import {
  buildContributionAlignmentInternalBayesianExecutionRuntimeFromObject
} from "./run_ai_value_contribution_alignment_internal_bayesian_execution_runtime.mjs";
import {
  buildContributionAlignmentBayesianPromotionDecisionGateFromObject
} from "./run_ai_value_contribution_alignment_bayesian_promotion_decision_gate.mjs";
import {
  buildContributionAlignmentDiagnosticsEvidencePacketFromObject
} from "./run_ai_value_contribution_alignment_diagnostics_evidence_packet.mjs";
import {
  buildContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceFromObject
} from "./run_ai_value_contribution_alignment_governed_diagnostics_sufficiency_evidence_source.mjs";
import {
  buildContributionAlignmentInternalDiagnosticsModelAdequacyReviewFromObject
} from "./run_ai_value_contribution_alignment_internal_diagnostics_model_adequacy_review.mjs";
import {
  buildContributionAlignmentPromotionGatePassedArtifactHandoffFromObject,
  validateContributionAlignmentPromotionGatePassedArtifactHandoff
} from "./run_ai_value_contribution_alignment_promotion_gate_passed_artifact_handoff.mjs";

const PASSED_GATE_STATE =
  "BAYESIAN_PROMOTION_DECISION_PASSED_FOR_INTERNAL_EXECUTION_ARTIFACT_ONLY";
const HOLD_GATE_STATE = "HOLD_FOR_DIAGNOSTICS_AND_MODEL_ADEQUACY_SUFFICIENCY";
const READY_HANDOFF_STATE =
  "PROMOTION_GATE_PASSED_ARTIFACT_HANDOFF_READY_FOR_INTERNAL_EXECUTION_ARTIFACT_V1_CONTRACT_HANDOFF_ONLY";
const HOLD_HANDOFF_STATE = "HOLD_FOR_PROMOTION_GATE_PASSED_ARTIFACT_HANDOFF";

const DIMENSIONS = [
  "comparison_design_adequacy",
  "convergence_diagnostics",
  "posterior_predictive_checks",
  "prior_sensitivity",
  "residual_fit_checks",
  "calibration_backtest",
  "feature_weight_provenance"
];

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

const FIXTURE_PATH =
  "docs/contracts/ai-value-real-data-intake-packet-runner/examples/controlled-aggregate-fixture-review-ready.json";
const PACKET_PATH =
  "docs/contracts/ai-value-research-promotion-readiness-packet/examples/current-controlled-pilot-research-promotion-readiness-packet.json";
const RESEARCH_DESIGN_PATH =
  "docs/research/AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_RESEARCH_DESIGN.md";

const AGGREGATE_WINDOWS = [
  {
    aggregate_window_id: "agg_window_ai_exposed_baseline",
    comparison_role: "ai_exposed",
    window_role: "baseline",
    selected_metric_mean: 10,
    selected_metric_standard_error: 0.4,
    cohort_size: 12
  },
  {
    aggregate_window_id: "agg_window_ai_exposed_comparison",
    comparison_role: "ai_exposed",
    window_role: "comparison",
    selected_metric_mean: 13,
    selected_metric_standard_error: 0.5,
    cohort_size: 12
  },
  {
    aggregate_window_id: "agg_window_comparison_baseline",
    comparison_role: "comparison",
    window_role: "baseline",
    selected_metric_mean: 9,
    selected_metric_standard_error: 0.4,
    cohort_size: 12
  },
  {
    aggregate_window_id: "agg_window_comparison_comparison",
    comparison_role: "comparison",
    window_role: "comparison",
    selected_metric_mean: 10,
    selected_metric_standard_error: 0.5,
    cohort_size: 12
  }
];

let cachedRuntime = null;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

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

function sourceDataModel() {
  const output = execFileSync(
    "node",
    [
      "scripts/run_ai_value_contribution_alignment_internal_research_math_data_model.mjs",
      PACKET_PATH,
      `--source-fixture=${FIXTURE_PATH}`,
      `--research-design=${RESEARCH_DESIGN_PATH}`
    ],
    { encoding: "utf8" }
  );
  return JSON.parse(output);
}

function sourceRuntime() {
  if (cachedRuntime) return clone(cachedRuntime);
  const sourceFeatureStabilityReview =
    buildContributionAlignmentFeatureStabilityReviewFromObject(sourceDataModel());
  const sourceWeightDecision =
    buildContributionAlignmentInternalNumericWeightDecisionFromObject(
      sourceFeatureStabilityReview
    );
  const sourceWeightObject = buildContributionAlignmentVersionedWeightObjectFromObject(
    sourceWeightDecision,
    { sourceFeatureStabilityReview }
  );
  const sourceFrame = buildContributionAlignmentWeightedInternalModelFrameFromObject(
    sourceWeightObject,
    { sourceWeightDecision, sourceFeatureStabilityReview }
  );
  const sourceReadinessReview =
    buildContributionAlignmentInternalBayesianReadinessReviewFromObject(
      sourceFrame,
      { sourceWeightObject }
    );
  const sourceSpecification =
    buildContributionAlignmentBayesianModelSpecificationFromObject(
      sourceReadinessReview,
      { sourceFrame, sourceWeightObject }
    );
  const sourceGate = buildContributionAlignmentInternalBayesianExecutionGateFromObject(
    sourceSpecification,
    { sourceReadinessReview, sourceFrame }
  );
  cachedRuntime = buildContributionAlignmentInternalBayesianExecutionRuntimeFromObject({
    source_gate: sourceGate,
    aggregate_measurement_cell_windows: AGGREGATE_WINDOWS
  });
  return clone(cachedRuntime);
}

function reviewedSourceEvidenceRef(dimension) {
  return `internal_diagnostics_sufficiency_evidence.${dimension}.2026_06`;
}

function reviewedSourceEvidenceHash(dimension) {
  return sha256Json({
    schema_version:
      "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_REVIEWED_DIAGNOSTICS_SOURCE_EVIDENCE_HASH_2026_06",
    evidence_dimension: dimension,
    reviewed_source_evidence_ref: reviewedSourceEvidenceRef(dimension),
    aggregate_only_scope: true,
    reviewed_internal_source_attestation: "governed_diagnostics_sufficiency_evidence_source"
  });
}

function sourceEvidenceHash(runtime, dimension, sourceEvidenceRef, reviewedHash) {
  return sha256Json({
    schema_version:
      "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_2026_06",
    evidence_dimension: dimension,
    source_evidence_ref: sourceEvidenceRef,
    reviewed_source_evidence_hash: reviewedHash,
    source_runtime_hash: runtime.runtime_hash,
    source_fixture_artifact_hash: runtime.internal_fit_artifact.artifact_hash,
    internal_only: true,
    aggregate_only: true,
    evidence_satisfied: true
  });
}

function reviewedEvidenceManifestHash(manifest) {
  const withoutHash = clone(manifest);
  delete withoutHash.manifest_hash;
  return sha256Json(withoutHash);
}

function reviewedEvidenceInput(runtime, overrides = {}) {
  const evidenceDimensions = Object.fromEntries(
    DIMENSIONS.map((dimension) => {
      const sourceRef = reviewedSourceEvidenceRef(dimension);
      const reviewedHash = reviewedSourceEvidenceHash(dimension);
      return [
        dimension,
        {
          reviewed_source_evidence_ref: sourceRef,
          reviewed_source_evidence_hash: reviewedHash,
          source_evidence_hash: sourceEvidenceHash(runtime, dimension, sourceRef, reviewedHash),
          aggregate_only_scope: true,
          suppressed_missing_held_windows_clear: true,
          eligible_for_satisfied_representation: true,
          placeholder_evidence: false,
          generated_fixture_evidence: false,
          evidence_satisfied: true
        }
      ];
    })
  );
  const manifest = {
    schema_version:
      "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_REVIEWED_DIAGNOSTICS_SOURCE_EVIDENCE_MANIFEST_2026_06",
    manifest_state: "REVIEWED_DIAGNOSTICS_SOURCE_EVIDENCE_MANIFEST_INTERNAL_ONLY",
    internal_only: true,
    aggregate_only: true,
    source_runtime_ref: {
      runtime_hash: runtime.runtime_hash,
      fixture_artifact_hash: runtime.internal_fit_artifact.artifact_hash
    },
    evidence_dimensions: Object.fromEntries(
      DIMENSIONS.map((dimension) => [
        dimension,
        {
          reviewed_source_evidence_ref: reviewedSourceEvidenceRef(dimension),
          reviewed_source_evidence_hash: reviewedSourceEvidenceHash(dimension),
          aggregate_only_scope: true
        }
      ])
    )
  };
  manifest.manifest_hash = reviewedEvidenceManifestHash(manifest);
  return {
    schema_version:
      "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_REVIEWED_DIAGNOSTICS_SOURCE_EVIDENCE_REFS_2026_06",
    evidence_review_state: "REVIEWED_DIAGNOSTICS_SOURCE_EVIDENCE_INTERNAL_ONLY",
    internal_only: true,
    aggregate_only: true,
    source_runtime_ref: {
      runtime_hash: runtime.runtime_hash,
      fixture_artifact_hash: runtime.internal_fit_artifact.artifact_hash
    },
    reviewed_evidence_manifest_hash: manifest.manifest_hash,
    reviewed_evidence_manifest: manifest,
    evidence_dimensions: evidenceDimensions,
    ...overrides
  };
}

function explicitPromotionPath(runtime, reviewedEvidence = reviewedEvidenceInput(runtime)) {
  const governedSource =
    buildContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceFromObject({
      source_runtime: runtime,
      reviewed_diagnostics_source_evidence: reviewedEvidence
    });
  const review = buildContributionAlignmentInternalDiagnosticsModelAdequacyReviewFromObject({
    source_runtime: runtime,
    source_diagnostics_sufficiency_evidence: governedSource
  });
  const packet = buildContributionAlignmentDiagnosticsEvidencePacketFromObject({
    source_runtime: runtime,
    source_diagnostics_sufficiency_evidence: governedSource
  });
  const gate = buildContributionAlignmentBayesianPromotionDecisionGateFromObject({
    source_diagnostics_review: review,
    source_runtime: runtime,
    source_diagnostics_evidence_packet: packet
  });
  return { governedSource, review, packet, gate };
}

test("promotion gate passed artifact handoff defaults to hold", () => {
  const runtime = sourceRuntime();
  const handoff =
    buildContributionAlignmentPromotionGatePassedArtifactHandoffFromObject({
      source_runtime: runtime
    });
  const validation = validateContributionAlignmentPromotionGatePassedArtifactHandoff(
    handoff,
    { sourceRuntime: runtime }
  );

  assert.equal(handoff.handoff_state, HOLD_HANDOFF_STATE);
  assert.equal(handoff.promotion_gate_ref.gate_state, HOLD_GATE_STATE);
  assert.equal(handoff.handoff_policy.promotion_authorized, false);
  assert.equal(handoff.promotion_gate_ref.promotion_authorized, false);
  assert.equal(handoff.allowed_next_step, "complete_governed_diagnostics_sufficiency_evidence_source");
  assert.equal(handoff.feeds.internal_bayesian_execution_artifact_v1, false);
  assert.equal(validation.valid, false);
  assert.equal(handoff.created_artifacts.internal_bayesian_execution_artifact_v1, false);
});

test("promotion gate passed artifact handoff records explicit governed-evidence passed gate", () => {
  const runtime = sourceRuntime();
  const reviewedEvidence = reviewedEvidenceInput(runtime);
  const { governedSource, review, packet, gate } = explicitPromotionPath(runtime, reviewedEvidence);
  const handoff =
    buildContributionAlignmentPromotionGatePassedArtifactHandoffFromObject({
      source_runtime: runtime,
      source_governed_diagnostics_sufficiency_evidence_source: governedSource,
      source_diagnostics_review: review,
      source_diagnostics_evidence_packet: packet,
      source_promotion_gate: gate
    });
  const validation = validateContributionAlignmentPromotionGatePassedArtifactHandoff(
    handoff,
    { sourceRuntime: runtime, governedSource, diagnosticsReview: review, diagnosticsEvidencePacket: packet, promotionGate: gate }
  );

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(handoff.handoff_state, READY_HANDOFF_STATE);
  assert.equal(handoff.promotion_gate_ref.gate_state, PASSED_GATE_STATE);
  assert.equal(handoff.promotion_gate_ref.promotion_authorized, true);
  assert.equal(handoff.handoff_policy.promotion_authorized, false);
  assert.equal(handoff.allowed_next_step, "internal_bayesian_execution_artifact_v1_only");
  assert.equal(handoff.feeds.internal_bayesian_execution_artifact_v1, false);
  assert.equal(handoff.promotion_gate_ref.allowed_next_step, "internal_bayesian_execution_artifact_v1_only");
  assert.equal(handoff.source_hashes.runtime_hash, runtime.runtime_hash);
  assert.equal(handoff.source_hashes.diagnostics_model_adequacy_review_hash, review.review_hash);
  assert.equal(handoff.source_hashes.diagnostics_evidence_packet_hash, packet.packet_hash);
  assert.equal(
    handoff.source_hashes.governed_diagnostics_sufficiency_evidence_source_hash,
    governedSource.evidence_hash
  );
  assert.equal(handoff.source_promotion_authority.governed_source_promotion_authorized, false);
  assert.equal(handoff.source_promotion_authority.diagnostics_packet_promotion_authorized, false);
  assert.equal(handoff.source_promotion_authority.diagnostics_review_promotion_authorized, false);
  assert.equal(handoff.source_promotion_authority.only_promotion_gate_authorizes_promotion, true);
  assert.equal(handoff.created_artifacts.internal_bayesian_execution_artifact_v1, false);
  for (const field of BLOCKED_OUTPUT_FIELDS) {
    assert.equal(handoff.blocked_output_proof[field], false, `${field} must remain false`);
  }
});

test("promotion gate passed artifact handoff rejects forged governed evidence", () => {
  const runtime = sourceRuntime();
  const { governedSource, review, packet, gate } =
    explicitPromotionPath(runtime, reviewedEvidenceInput(runtime));
  const forgedGovernedSource = clone(governedSource);
  forgedGovernedSource.evidence_hash = "0".repeat(64);

  const handoff =
    buildContributionAlignmentPromotionGatePassedArtifactHandoffFromObject({
      source_runtime: runtime,
      source_governed_diagnostics_sufficiency_evidence_source: forgedGovernedSource,
      source_diagnostics_review: review,
      source_diagnostics_evidence_packet: packet,
      source_promotion_gate: gate
    });
  const validation = validateContributionAlignmentPromotionGatePassedArtifactHandoff(
    handoff,
    { sourceRuntime: runtime }
  );

  assert.equal(handoff.handoff_state, HOLD_HANDOFF_STATE);
  assert.equal(handoff.promotion_gate_ref.promotion_authorized, false);
  assert.equal(handoff.source_promotion_authority.only_promotion_gate_authorizes_promotion, true);
  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /governed|hash/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("promotion gate passed artifact handoff rejects non-gate promotion side doors", () => {
  const runtime = sourceRuntime();
  const reviewedEvidence = reviewedEvidenceInput(runtime);
  const { governedSource, review, packet, gate } = explicitPromotionPath(runtime, reviewedEvidence);
  packet.promotion_boundary.promotion_authorized = true;

  const handoff =
    buildContributionAlignmentPromotionGatePassedArtifactHandoffFromObject({
      source_runtime: runtime,
      source_governed_diagnostics_sufficiency_evidence_source: governedSource,
      source_diagnostics_review: review,
      source_diagnostics_evidence_packet: packet,
      source_promotion_gate: gate
    });
  const validation = validateContributionAlignmentPromotionGatePassedArtifactHandoff(handoff);

  assert.equal(handoff.handoff_state, HOLD_HANDOFF_STATE);
  assert.equal(handoff.handoff_policy.promotion_authorized, false);
  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /promotion_authorized/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("promotion gate passed artifact handoff does not create or feed execution artifact v1", () => {
  const runtime = sourceRuntime();
  const { governedSource, review, packet, gate } =
    explicitPromotionPath(runtime, reviewedEvidenceInput(runtime));
  const handoff =
    buildContributionAlignmentPromotionGatePassedArtifactHandoffFromObject({
      source_runtime: runtime,
      source_governed_diagnostics_sufficiency_evidence_source: governedSource,
      source_diagnostics_review: review,
      source_diagnostics_evidence_packet: packet,
      source_promotion_gate: gate
    });

  assert.equal(handoff.created_artifacts.internal_bayesian_execution_artifact_v1, false);
  assert.equal(handoff.created_artifacts.posterior_interpretation_specification, false);
  assert.equal(handoff.feeds.internal_bayesian_execution_artifact_v1, false);
  assert.equal(handoff.handoff_policy.promotion_authorized, false);
  assert.equal(handoff.allowed_next_step, "internal_bayesian_execution_artifact_v1_only");
});
