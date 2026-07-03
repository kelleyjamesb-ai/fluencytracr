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
  contributionAlignmentPromotionGatePassedArtifactHandoffHash
} from "./run_ai_value_contribution_alignment_promotion_gate_passed_artifact_handoff.mjs";
import {
  buildContributionAlignmentInternalBayesianExecutionArtifactV1FromObject,
  contributionAlignmentInternalBayesianExecutionArtifactV1Hash,
  validateContributionAlignmentInternalBayesianExecutionArtifactV1
} from "./run_ai_value_contribution_alignment_internal_bayesian_execution_artifact_v1.mjs";

const READY_ARTIFACT_STATE =
  "INTERNAL_BAYESIAN_EXECUTION_ARTIFACT_V1_CREATED_INTERPRETATION_BLOCKED";
const HOLD_ARTIFACT_STATE = "HOLD_FOR_INTERNAL_BAYESIAN_EXECUTION_ARTIFACT_V1";
const READY_HANDOFF_STATE =
  "PROMOTION_GATE_PASSED_ARTIFACT_HANDOFF_READY_FOR_INTERNAL_EXECUTION_ARTIFACT_V1_CONTRACT_HANDOFF_ONLY";
const PASSED_GATE_STATE =
  "BAYESIAN_PROMOTION_DECISION_PASSED_FOR_INTERNAL_EXECUTION_ARTIFACT_ONLY";
const NEXT_STEP = "posterior_interpretation_specification_gate_only";

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
  if (cachedRuntime) return clone(cachedRuntime.source_runtime);
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
  const runtime = buildContributionAlignmentInternalBayesianExecutionRuntimeFromObject({
    source_gate: sourceGate,
    aggregate_measurement_cell_windows: AGGREGATE_WINDOWS
  });
  cachedRuntime = {
    source_runtime: runtime,
    source_gate: sourceGate,
    aggregate_measurement_cell_windows: AGGREGATE_WINDOWS
  };
  return clone(cachedRuntime.source_runtime);
}

function sourceRuntimeEnvelope(runtime = null) {
  if (!cachedRuntime) sourceRuntime();
  const envelope = clone(cachedRuntime);
  if (runtime) envelope.source_runtime = runtime;
  return envelope;
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

function explicitPromotionPath(runtime = sourceRuntime()) {
  const runtimeInput = sourceRuntimeEnvelope(runtime);
  const governedSource =
    buildContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceFromObject({
      source_runtime: runtimeInput,
      reviewed_diagnostics_source_evidence: reviewedEvidenceInput(runtime)
    });
  const review = buildContributionAlignmentInternalDiagnosticsModelAdequacyReviewFromObject({
    source_runtime: runtimeInput,
    source_diagnostics_sufficiency_evidence: governedSource
  });
  const packet = buildContributionAlignmentDiagnosticsEvidencePacketFromObject({
    source_runtime: runtimeInput,
    source_diagnostics_sufficiency_evidence: governedSource
  });
  const gate = buildContributionAlignmentBayesianPromotionDecisionGateFromObject({
    source_diagnostics_review: review,
    source_runtime: runtimeInput,
    source_diagnostics_evidence_packet: packet
  });
  const handoff = buildContributionAlignmentPromotionGatePassedArtifactHandoffFromObject({
    source_runtime: runtimeInput,
    source_governed_diagnostics_sufficiency_evidence_source: governedSource,
    source_diagnostics_review: review,
    source_diagnostics_evidence_packet: packet,
    source_promotion_gate: gate
  });
  return { runtime, governedSource, review, packet, gate, handoff };
}

function artifactInput(path = explicitPromotionPath()) {
  return {
    source_promotion_handoff: path.handoff,
    source_promotion_gate: path.gate,
    source_runtime: sourceRuntimeEnvelope(path.runtime),
    source_diagnostics_review: path.review,
    source_diagnostics_evidence_packet: path.packet,
    source_governed_diagnostics_sufficiency_evidence_source: path.governedSource
  };
}

test("internal Bayesian execution artifact v1 fails closed without a passed promotion handoff", () => {
  const runtime = sourceRuntime();
  const heldHandoff = buildContributionAlignmentPromotionGatePassedArtifactHandoffFromObject({
    source_runtime: sourceRuntimeEnvelope(runtime)
  });
  const artifact =
    buildContributionAlignmentInternalBayesianExecutionArtifactV1FromObject({
      source_promotion_handoff: heldHandoff,
      source_runtime: sourceRuntimeEnvelope(runtime)
    });
  const validation = validateContributionAlignmentInternalBayesianExecutionArtifactV1(
    artifact,
    { sourcePromotionHandoff: heldHandoff, sourceRuntime: sourceRuntimeEnvelope(runtime) }
  );

  assert.equal(artifact.artifact_state, HOLD_ARTIFACT_STATE);
  assert.equal(artifact.source_bound, false);
  assert.equal(artifact.artifact_policy.promotion_authorized, false);
  assert.equal(artifact.feeds.posterior_interpretation_specification_gate, false);
  assert.equal(validation.valid, false);
});

test("internal Bayesian execution artifact v1 requires the full source chain", () => {
  const path = explicitPromotionPath();
  for (const input of [
    {},
    { source_runtime: path.runtime },
    { source_promotion_gate: path.gate },
    path.gate,
    { source_promotion_handoff: path.handoff }
  ]) {
    const artifact =
      buildContributionAlignmentInternalBayesianExecutionArtifactV1FromObject(input);
    const validation = validateContributionAlignmentInternalBayesianExecutionArtifactV1(artifact);

    assert.notEqual(artifact.artifact_state, READY_ARTIFACT_STATE);
    assert.equal(artifact.artifact_policy.promotion_authorized, false);
    assert.equal(validation.valid, false);
  }
});

test("internal Bayesian execution artifact v1 is created only from a passed handoff", () => {
  const path = explicitPromotionPath();
  const artifact =
    buildContributionAlignmentInternalBayesianExecutionArtifactV1FromObject(artifactInput(path));
  const validation = validateContributionAlignmentInternalBayesianExecutionArtifactV1(
    artifact,
    {
      sourcePromotionHandoff: path.handoff,
      sourcePromotionGate: path.gate,
      sourceRuntime: sourceRuntimeEnvelope(path.runtime),
      sourceDiagnosticsReview: path.review,
      sourceDiagnosticsEvidencePacket: path.packet,
      sourceGovernedDiagnosticsSufficiencyEvidenceSource: path.governedSource
    }
  );

  assert.equal(path.handoff.handoff_state, READY_HANDOFF_STATE);
  assert.equal(path.gate.gate_state, PASSED_GATE_STATE);
  assert.equal(artifact.artifact_state, READY_ARTIFACT_STATE);
  assert.equal(artifact.artifact_class, "internal_bayesian_execution_artifact_v1_internal_only");
  assert.equal(artifact.aggregate_unit_of_analysis, "aggregate_measurement_cell_window");
  assert.equal(
    artifact.candidate_model_family,
    "bayesian_hierarchical_difference_in_differences_candidate"
  );
  assert.match(
    artifact.estimand_definition,
    /without causality claims/
  );
  assert.equal(artifact.allowed_next_step, NEXT_STEP);
  assert.equal(artifact.artifact_policy.promotion_authorized, false);
  assert.equal(artifact.artifact_policy.reruns_bayesian_execution, false);
  assert.equal(artifact.source_promotion_gate_ref.promotion_authorized, true);
  assert.equal(artifact.source_promotion_handoff_ref.promotion_authorized, false);
  assert.equal(artifact.source_runtime_ref.runtime_hash, path.runtime.runtime_hash);
  assert.equal(artifact.source_promotion_handoff_ref.handoff_hash, path.handoff.handoff_hash);
  assert.equal(artifact.source_promotion_gate_ref.gate_hash, path.gate.gate_hash);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(
    validateContributionAlignmentInternalBayesianExecutionArtifactV1(artifact).valid,
    false
  );
});

test("internal Bayesian execution artifact v1 holds on mismatched source chain", () => {
  const path = explicitPromotionPath();
  const alternatePath = explicitPromotionPath();
  alternatePath.runtime.runtime_hash = "1".repeat(64);
  const artifact =
    buildContributionAlignmentInternalBayesianExecutionArtifactV1FromObject({
      ...artifactInput(path),
      source_runtime: alternatePath.runtime
    });
  const validation = validateContributionAlignmentInternalBayesianExecutionArtifactV1(
    artifact,
    {
      sourcePromotionHandoff: path.handoff,
      sourcePromotionGate: path.gate,
      sourceRuntime: alternatePath.runtime,
      sourceDiagnosticsReview: path.review,
      sourceDiagnosticsEvidencePacket: path.packet,
      sourceGovernedDiagnosticsSufficiencyEvidenceSource: path.governedSource
    }
  );

  assert.equal(artifact.artifact_state, HOLD_ARTIFACT_STATE);
  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /runtime.*hash|source runtime/i.test(gap)),
    validation.gaps.join("; ")
  );
});

test("internal Bayesian execution artifact v1 rejects forged promotion handoff hashes", () => {
  const path = explicitPromotionPath();
  const forgedHandoff = clone(path.handoff);
  forgedHandoff.handoff_hash = "0".repeat(64);
  const artifact =
    buildContributionAlignmentInternalBayesianExecutionArtifactV1FromObject({
      ...artifactInput(path),
      source_promotion_handoff: forgedHandoff
    });
  const validation = validateContributionAlignmentInternalBayesianExecutionArtifactV1(
    artifact,
    {
      sourcePromotionHandoff: forgedHandoff,
      sourcePromotionGate: path.gate,
      sourceRuntime: sourceRuntimeEnvelope(path.runtime),
      sourceDiagnosticsReview: path.review,
      sourceDiagnosticsEvidencePacket: path.packet,
      sourceGovernedDiagnosticsSufficiencyEvidenceSource: path.governedSource
    }
  );

  assert.equal(artifact.artifact_state, HOLD_ARTIFACT_STATE);
  assert.equal(artifact.artifact_policy.promotion_authorized, false);
  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /handoff.*hash|promotion handoff/i.test(gap)),
    validation.gaps.join("; ")
  );
});

test("internal Bayesian execution artifact v1 rejects forged promotion gate hashes", () => {
  const path = explicitPromotionPath();
  const forgedHandoff = clone(path.handoff);
  forgedHandoff.promotion_gate_ref.gate_hash = "f".repeat(64);
  forgedHandoff.handoff_hash =
    contributionAlignmentPromotionGatePassedArtifactHandoffHash(forgedHandoff);
  const artifact =
    buildContributionAlignmentInternalBayesianExecutionArtifactV1FromObject({
      ...artifactInput(path),
      source_promotion_handoff: forgedHandoff
    });
  const validation = validateContributionAlignmentInternalBayesianExecutionArtifactV1(
    artifact,
    {
      sourcePromotionHandoff: forgedHandoff,
      sourcePromotionGate: path.gate,
      sourceRuntime: sourceRuntimeEnvelope(path.runtime),
      sourceDiagnosticsReview: path.review,
      sourceDiagnosticsEvidencePacket: path.packet,
      sourceGovernedDiagnosticsSufficiencyEvidenceSource: path.governedSource
    }
  );

  assert.equal(artifact.artifact_state, HOLD_ARTIFACT_STATE);
  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /promotion gate.*hash|gate_hash/i.test(gap)),
    validation.gaps.join("; ")
  );
});

test("internal Bayesian execution artifact v1 keeps all interpretation and output paths blocked", () => {
  const path = explicitPromotionPath();
  const artifact =
    buildContributionAlignmentInternalBayesianExecutionArtifactV1FromObject(artifactInput(path));

  for (const field of BLOCKED_OUTPUT_FIELDS) {
    assert.equal(artifact.blocked_outputs[field], false, `blocked_outputs.${field}`);
    assert.equal(artifact.feeds[field], false, `feeds.${field}`);
  }
  assert.equal(artifact.posterior_values_containment_policy.posterior_values_reemitted, false);
  assert.equal(artifact.posterior_values_containment_policy.posterior_interpretation_authorized, false);
  assert.equal(artifact.interpretation_policy.posterior_interpretation_authorized, false);
  assert.equal(artifact.interpretation_policy.confidence_output_authorized, false);
  assert.equal(artifact.interpretation_policy.probability_output_authorized, false);
  assert.equal(artifact.model_execution_scope.reruns_bayesian_execution, false);
  assert.equal(artifact.model_execution_scope.live_connector_execution, false);
});

test("internal Bayesian execution artifact v1 rejects unsafe wrapper side doors without echo", () => {
  const artifact =
    buildContributionAlignmentInternalBayesianExecutionArtifactV1FromObject({
      source_promotion_handoff: explicitPromotionPath().handoff,
      raw_rows: [{ user_id: "user_123", prompt: "show customer ROI probability" }],
      identifiers: ["person@example.com"],
      query_text: "customer confidence probability",
      prompts: ["posterior interpretation"],
      transcripts: ["raw transcript"],
      person_level_data: true
    });
  const serialized = JSON.stringify(artifact);
  const validation = validateContributionAlignmentInternalBayesianExecutionArtifactV1(artifact);

  assert.equal(artifact.artifact_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validation.valid, false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("show customer ROI probability"), false);
  assert.equal(serialized.includes("raw transcript"), false);
});

test("internal Bayesian execution artifact v1 redacts invalid nested source ref strings while held", () => {
  const forgedHandoff = {
    schema_version: "person@example.com",
    handoff_id: "customer_123",
    handoff_state: "show customer ROI probability",
    handoff_hash: "0".repeat(64),
    source_bound: true,
    allowed_next_step: "posterior interpretation for person@example.com",
    handoff_policy: {
      promotion_authorized: false
    },
    promotion_gate_ref: {
      schema_version: "customer confidence probability schema",
      gate_id: "customer_123",
      gate_state: "customer ROI probability",
      gate_hash: "f".repeat(64),
      promotion_authorized: true,
      allowed_next_step: "customer economic output"
    }
  };
  const artifact =
    buildContributionAlignmentInternalBayesianExecutionArtifactV1FromObject({
      source_promotion_handoff: forgedHandoff
    });
  const serialized = JSON.stringify(artifact);

  assert.equal(artifact.artifact_state, HOLD_ARTIFACT_STATE);
  assert.equal(artifact.source_promotion_handoff_ref.schema_version, null);
  assert.equal(artifact.source_promotion_handoff_ref.handoff_id, null);
  assert.equal(artifact.source_promotion_handoff_ref.handoff_state, null);
  assert.equal(artifact.source_promotion_handoff_ref.allowed_next_step, null);
  assert.equal(artifact.source_promotion_gate_ref.schema_version, null);
  assert.equal(artifact.source_promotion_gate_ref.gate_id, null);
  assert.equal(artifact.source_promotion_gate_ref.gate_state, null);
  assert.equal(artifact.source_promotion_gate_ref.allowed_next_step, null);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("customer_123"), false);
  assert.equal(serialized.includes("show customer ROI probability"), false);
  assert.equal(serialized.includes("customer economic output"), false);
});

test("internal Bayesian execution artifact v1 rejects unrecognized sidecar wrapper fields", () => {
  const path = explicitPromotionPath();
  const artifact =
    buildContributionAlignmentInternalBayesianExecutionArtifactV1FromObject({
      ...artifactInput(path),
      posterior_mean_internal: 0.42,
      customer_confidence: "high",
      export_url: "https://example.invalid/export.csv",
      customer_id: "customer_123"
    });
  const serialized = JSON.stringify(artifact);
  const validation = validateContributionAlignmentInternalBayesianExecutionArtifactV1(
    artifact,
    {
      sourcePromotionHandoff: path.handoff,
      sourcePromotionGate: path.gate,
      sourceRuntime: sourceRuntimeEnvelope(path.runtime),
      sourceDiagnosticsReview: path.review,
      sourceDiagnosticsEvidencePacket: path.packet,
      sourceGovernedDiagnosticsSufficiencyEvidenceSource: path.governedSource
    }
  );

  assert.equal(artifact.artifact_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(artifact.source_bound, false);
  assert.equal(artifact.artifact_policy.promotion_authorized, false);
  assert.equal(artifact.feeds.posterior_interpretation_specification_gate, false);
  assert.ok(artifact.blocked_uses.includes("customer_facing_output"));
  assert.ok(artifact.required_caveats.some((caveat) => /does not rerun Bayesian execution/.test(caveat)));
  assert.equal(validation.valid, false);
  assert.equal(serialized.includes("customer_123"), false);
  assert.equal(serialized.includes("posterior_mean_internal"), false);
  assert.equal(serialized.includes("export.csv"), false);
});

test("internal Bayesian execution artifact v1 rejects unsafe nested runtime envelope sidecars", () => {
  const path = explicitPromotionPath();
  const artifact =
    buildContributionAlignmentInternalBayesianExecutionArtifactV1FromObject({
      ...artifactInput(path),
      source_runtime: {
        ...sourceRuntimeEnvelope(path.runtime),
        raw_rows: [{ email: "person@example.com" }],
        query_text: "SELECT user_id FROM raw_rows",
        user_id: "person-123"
      }
    });
  const validation = validateContributionAlignmentInternalBayesianExecutionArtifactV1(artifact);
  const serialized = `${JSON.stringify(artifact)} ${JSON.stringify(validation)}`;

  assert.equal(artifact.artifact_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validation.valid, false);
  for (const unsafe of ["person@example.com", "SELECT user_id", "person-123"]) {
    assert.equal(serialized.includes(unsafe), false, `${unsafe} must not echo`);
  }
});

test("internal Bayesian execution artifact v1 validation redacts ungoverned field names", () => {
  const path = explicitPromotionPath();
  const artifact =
    buildContributionAlignmentInternalBayesianExecutionArtifactV1FromObject(artifactInput(path));
  const forgedArtifact = clone(artifact);
  forgedArtifact["person@example.com"] = "customer ROI probability";
  forgedArtifact.artifact_hash =
    contributionAlignmentInternalBayesianExecutionArtifactV1Hash(forgedArtifact);
  const validation = validateContributionAlignmentInternalBayesianExecutionArtifactV1(
    forgedArtifact,
    {
      sourcePromotionHandoff: path.handoff,
      sourcePromotionGate: path.gate,
      sourceRuntime: sourceRuntimeEnvelope(path.runtime),
      sourceDiagnosticsReview: path.review,
      sourceDiagnosticsEvidencePacket: path.packet,
      sourceGovernedDiagnosticsSufficiencyEvidenceSource: path.governedSource
    }
  );
  const serialized = JSON.stringify(validation);

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.some((gap) => /ungoverned field/.test(gap)));
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("customer ROI probability"), false);
});

test("internal Bayesian execution artifact v1 validation rejects forged output after rehash", () => {
  const path = explicitPromotionPath();
  const artifact =
    buildContributionAlignmentInternalBayesianExecutionArtifactV1FromObject(artifactInput(path));
  const forgedArtifact = clone(artifact);
  forgedArtifact.blocked_outputs.confidence_output = true;
  forgedArtifact.feeds.customer_facing_output = true;
  forgedArtifact.interpretation_policy.probability_output_authorized = true;
  forgedArtifact.model_execution_scope.export_creation = true;
  forgedArtifact.artifact_hash =
    contributionAlignmentInternalBayesianExecutionArtifactV1Hash(forgedArtifact);
  const validation = validateContributionAlignmentInternalBayesianExecutionArtifactV1(
    forgedArtifact,
    {
      sourcePromotionHandoff: path.handoff,
      sourcePromotionGate: path.gate,
      sourceRuntime: sourceRuntimeEnvelope(path.runtime),
      sourceDiagnosticsReview: path.review,
      sourceDiagnosticsEvidencePacket: path.packet,
      sourceGovernedDiagnosticsSufficiencyEvidenceSource: path.governedSource
    }
  );

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /confidence|probability|customer|export/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("internal Bayesian execution artifact v1 rejects nested ungoverned leakage after rehash", () => {
  const path = explicitPromotionPath();
  const artifact =
    buildContributionAlignmentInternalBayesianExecutionArtifactV1FromObject(artifactInput(path));
  const forgedArtifact = clone(artifact);
  forgedArtifact.diagnostic_evidence_binding.customer_confidence = "high probability";
  forgedArtifact.model_execution_scope.export_url = "https://example.invalid/export.csv";
  forgedArtifact.posterior_values_containment_policy.posterior_mean_internal = 0.42;
  forgedArtifact.artifact_hash =
    contributionAlignmentInternalBayesianExecutionArtifactV1Hash(forgedArtifact);
  const validation = validateContributionAlignmentInternalBayesianExecutionArtifactV1(
    forgedArtifact,
    {
      sourcePromotionHandoff: path.handoff,
      sourcePromotionGate: path.gate,
      sourceRuntime: sourceRuntimeEnvelope(path.runtime),
      sourceDiagnosticsReview: path.review,
      sourceDiagnosticsEvidencePacket: path.packet,
      sourceGovernedDiagnosticsSufficiencyEvidenceSource: path.governedSource
    }
  );
  const serialized = JSON.stringify(
    buildContributionAlignmentInternalBayesianExecutionArtifactV1FromObject(artifactInput(path))
  );

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /ungoverned|posterior|confidence|export/.test(gap)),
    validation.gaps.join("; ")
  );
  assert.equal(serialized.includes("posterior_mean_internal"), false);
  assert.equal(serialized.includes("posterior_sd_internal"), false);
  assert.equal(serialized.includes("did_observed_estimate"), false);
  assert.equal(serialized.includes("did_standard_error"), false);
});

test("internal Bayesian execution artifact v1 rejects promotion authority side doors", () => {
  const path = explicitPromotionPath();
  const artifact =
    buildContributionAlignmentInternalBayesianExecutionArtifactV1FromObject(artifactInput(path));
  const forgedArtifact = clone(artifact);
  forgedArtifact.artifact_policy.promotion_authorized = true;
  forgedArtifact.artifact_hash =
    buildContributionAlignmentInternalBayesianExecutionArtifactV1FromObject(artifactInput(path))
      .artifact_hash;
  const validation = validateContributionAlignmentInternalBayesianExecutionArtifactV1(
    forgedArtifact,
    {
      sourcePromotionHandoff: path.handoff,
      sourcePromotionGate: path.gate,
      sourceRuntime: sourceRuntimeEnvelope(path.runtime),
      sourceDiagnosticsReview: path.review,
      sourceDiagnosticsEvidencePacket: path.packet,
      sourceGovernedDiagnosticsSufficiencyEvidenceSource: path.governedSource
    }
  );

  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.some((gap) => /promotion_authorized/.test(gap)));
});

test("internal Bayesian execution artifact v1 package default executable sample remains held", () => {
  const output = execFileSync(
    "npm",
    ["run", "--silent", "run:ai-value-contribution-alignment-internal-bayesian-execution-artifact-v1"],
    { encoding: "utf8" }
  );
  const artifact = JSON.parse(output);

  assert.equal(artifact.artifact_state, HOLD_ARTIFACT_STATE);
  assert.equal(artifact.source_bound, false);
  assert.equal(artifact.allowed_next_step, "promotion_gate_passed_artifact_handoff_required");
  assert.equal(artifact.artifact_policy.promotion_authorized, false);
  assert.equal(artifact.feeds.posterior_interpretation_specification_gate, false);
  assert.equal(artifact.feeds.confidence_output, false);
  assert.equal(artifact.feeds.probability_output, false);
  assert.equal(artifact.feeds.customer_facing_output, false);
});
