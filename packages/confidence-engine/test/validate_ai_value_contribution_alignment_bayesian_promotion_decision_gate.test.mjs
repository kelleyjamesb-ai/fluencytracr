import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildContributionAlignmentFeatureStabilityReviewFromObject,
  buildContributionAlignmentInternalNumericWeightDecisionFromObject,
  buildContributionAlignmentVersionedWeightObjectFromObject,
  buildContributionAlignmentWeightedInternalModelFrameFromObject,
  buildContributionAlignmentInternalBayesianReadinessReviewFromObject,
  buildContributionAlignmentBayesianModelSpecificationFromObject,
  buildContributionAlignmentInternalBayesianExecutionGateFromObject,
  buildContributionAlignmentInternalBayesianExecutionRuntimeFromObject,
  contributionAlignmentInternalBayesianExecutionRuntimeHash,
  buildContributionAlignmentInternalDiagnosticsModelAdequacyReviewFromObject,
  contributionAlignmentInternalDiagnosticsModelAdequacyReviewHash,
  buildContributionAlignmentDiagnosticsEvidencePacketFromObject,
  contributionAlignmentDiagnosticsEvidencePacketHash,
  buildContributionAlignmentBayesianPromotionDecisionGateFromObject,
  contributionAlignmentBayesianPromotionDecisionGateHash,
  validateContributionAlignmentBayesianPromotionDecisionGate,
  buildContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceFromObject,
  contributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceHash
} from "../dist/index.js";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const FIXTURE_PATH = join(
  REPO_ROOT,
  "docs/contracts/ai-value-real-data-intake-packet-runner/examples/controlled-aggregate-fixture-review-ready.json"
);
const PACKET_PATH = join(
  REPO_ROOT,
  "docs/contracts/ai-value-research-promotion-readiness-packet/examples/current-controlled-pilot-research-promotion-readiness-packet.json"
);
const RESEARCH_DESIGN_PATH = join(
  REPO_ROOT,
  "docs/research/AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_RESEARCH_DESIGN.md"
);

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

const FALSE_FEEDS = [
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

const DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_2026_06";
const DIAGNOSTICS_SUFFICIENCY_EVIDENCE_STATE =
  "DIAGNOSTICS_SUFFICIENCY_EVIDENCE_GOVERNED_INTERNAL_ONLY";
const DIAGNOSTICS_SUFFICIENCY_EVIDENCE_CLASS =
  "diagnostics_sufficiency_evidence_only";
const DIAGNOSTICS_SUFFICIENCY_EVIDENCE_VERSION =
  "diagnostics_sufficiency_evidence_2026_06";

let cachedRuntimeSource = null;

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
      join(REPO_ROOT, "scripts/run_ai_value_contribution_alignment_internal_research_math_data_model.mjs"),
      PACKET_PATH,
      `--source-fixture=${FIXTURE_PATH}`,
      `--research-design=${RESEARCH_DESIGN_PATH}`
    ],
    { cwd: REPO_ROOT, encoding: "utf8" }
  );
  return JSON.parse(output);
}

function sourceRuntime() {
  if (cachedRuntimeSource) return clone(cachedRuntimeSource.source_runtime);
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
  cachedRuntimeSource = {
    source_runtime: runtime,
    source_gate: sourceGate,
    aggregate_measurement_cell_windows: AGGREGATE_WINDOWS
  };
  return clone(cachedRuntimeSource.source_runtime);
}

function sourceRuntimeSource() {
  if (!cachedRuntimeSource) sourceRuntime();
  return clone(cachedRuntimeSource);
}

function sourceRuntimeEnvelope(overrides = {}) {
  return {
    ...sourceRuntimeSource(),
    ...overrides
  };
}

function sourceRuntimeValidationOptions(overrides = {}) {
  const source = sourceRuntimeSource();
  return {
    sourceRuntime: source.source_runtime,
    sourceGate: source.source_gate,
    aggregateMeasurementCellWindows: source.aggregate_measurement_cell_windows,
    ...overrides
  };
}

function currentDiagnosticsReview(runtime = sourceRuntime()) {
  return buildContributionAlignmentInternalDiagnosticsModelAdequacyReviewFromObject(runtime);
}

function currentDiagnosticsEvidencePacket(runtime = sourceRuntime()) {
  return buildContributionAlignmentDiagnosticsEvidencePacketFromObject(runtime);
}

function sourceHash(label) {
  return sha256Json({ evidence_label: label, value: { present: true } });
}

function sufficiencyEvidenceHash(evidence) {
  const withoutHash = clone(evidence);
  delete withoutHash.evidence_hash;
  return sha256Json(withoutHash);
}

function diagnosticsEvidenceRef(dimension) {
  return `internal_diagnostics_sufficiency_evidence.${dimension}.2026_06`;
}

function reviewedSourceEvidenceHash(dimension) {
  return sha256Json({
    schema_version:
      "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_REVIEWED_DIAGNOSTICS_SOURCE_EVIDENCE_HASH_2026_06",
    evidence_dimension: dimension,
    reviewed_source_evidence_ref: diagnosticsEvidenceRef(dimension),
    aggregate_only_scope: true,
    reviewed_internal_source_attestation: "governed_diagnostics_sufficiency_evidence_source"
  });
}

function diagnosticsDimensionHash(runtime, dimension, sourceEvidenceRef, reviewedHash) {
  return sha256Json({
    schema_version: DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SCHEMA_VERSION,
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

function governedDiagnosticsSufficiencyEvidence(runtime, overrides = {}) {
  const dimensions = {};
  for (const dimension of [
    "comparison_design_adequacy",
    "convergence_diagnostics",
    "posterior_predictive_checks",
    "prior_sensitivity",
    "residual_fit_checks",
    "calibration_backtest"
  ]) {
    const sourceEvidenceRef = diagnosticsEvidenceRef(dimension);
    const reviewedHash = reviewedSourceEvidenceHash(dimension);
    dimensions[dimension] = {
      evidence_satisfied: true,
      source_evidence_ref: sourceEvidenceRef,
      reviewed_source_evidence_hash: reviewedHash,
      source_evidence_hash: diagnosticsDimensionHash(
        runtime,
        dimension,
        sourceEvidenceRef,
        reviewedHash
      )
    };
  }
  const evidence = {
    schema_version: DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SCHEMA_VERSION,
    evidence_state: DIAGNOSTICS_SUFFICIENCY_EVIDENCE_STATE,
    evidence_class: DIAGNOSTICS_SUFFICIENCY_EVIDENCE_CLASS,
    evidence_version: DIAGNOSTICS_SUFFICIENCY_EVIDENCE_VERSION,
    internal_only: true,
    aggregate_only: true,
    source_runtime_ref: {
      runtime_hash: runtime.runtime_hash,
      fixture_artifact_hash: runtime.internal_fit_artifact.artifact_hash
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
    finance_output_authorized: false,
    ...overrides
  };
  evidence.evidence_hash = sufficiencyEvidenceHash(evidence);
  return evidence;
}

function governedReviewedEvidenceInput(runtime, overrides = {}) {
  const dimensions = {};
  for (const dimension of [
    "comparison_design_adequacy",
    "convergence_diagnostics",
    "posterior_predictive_checks",
    "prior_sensitivity",
    "residual_fit_checks",
    "calibration_backtest",
    "feature_weight_provenance"
  ]) {
    const sourceEvidenceRef = diagnosticsEvidenceRef(dimension);
    const reviewedHash = reviewedSourceEvidenceHash(dimension);
    dimensions[dimension] = {
      reviewed_source_evidence_ref: sourceEvidenceRef,
      reviewed_source_evidence_hash: reviewedHash,
      source_evidence_hash: diagnosticsDimensionHash(
        runtime,
        dimension,
        sourceEvidenceRef,
        reviewedHash
      ),
      aggregate_only_scope: true,
      suppressed_missing_held_windows_clear: true,
      eligible_for_satisfied_representation: true,
      placeholder_evidence: false,
      generated_fixture_evidence: false,
      evidence_satisfied: true
    };
  }
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
      Object.keys(dimensions).map((dimension) => [
        dimension,
        {
          reviewed_source_evidence_ref: diagnosticsEvidenceRef(dimension),
          reviewed_source_evidence_hash: dimensions[dimension].reviewed_source_evidence_hash,
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
    evidence_dimensions: dimensions,
    ...overrides
  };
}

function governedDiagnosticsSufficiencyEvidenceSource(runtime, overrides = {}) {
  return buildContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceFromObject(sourceRuntimeEnvelope({
    source_runtime: runtime,
    reviewed_diagnostics_source_evidence: governedReviewedEvidenceInput(runtime, overrides)
  }));
}

function alternateGovernedDiagnosticsSufficiencyEvidenceSource(runtime) {
  const source = governedDiagnosticsSufficiencyEvidenceSource(runtime);
  source.generated_at = "2026-06-25T00:00:01.000Z";
  source.evidence_hash =
    contributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceHash(source);
  return source;
}

function promotableDiagnosticsEvidencePacket(runtime = sourceRuntime()) {
  return buildContributionAlignmentDiagnosticsEvidencePacketFromObject(sourceRuntimeEnvelope({
    source_runtime: runtime,
    source_diagnostics_sufficiency_evidence:
      governedDiagnosticsSufficiencyEvidenceSource(runtime)
  }));
}

function diagnosticEvidencePacketRef(packet) {
  return {
    schema_version: packet.schema_version,
    packet_id: packet.packet_id,
    packet_state: packet.packet_state,
    packet_hash: packet.packet_hash,
    allowed_next_step: packet.allowed_next_step
  };
}

function satisfiedRuntimeFixture() {
  const runtime = sourceRuntime();
  for (const field of [
    "convergence_diagnostics_present",
    "posterior_predictive_checks_present",
    "prior_sensitivity_present",
    "residual_fit_checks_present",
    "comparison_design_adequacy_review_present",
    "calibration_evidence_present"
  ]) {
    runtime.internal_fit_artifact[field] = true;
  }
  const artifactWithoutHash = clone(runtime.internal_fit_artifact);
  delete artifactWithoutHash.artifact_hash;
  runtime.internal_fit_artifact.artifact_hash = sha256Json(artifactWithoutHash);
  runtime.runtime_hash = contributionAlignmentInternalBayesianExecutionRuntimeHash(runtime);
  return runtime;
}

function promotableDiagnosticsReview(runtime = sourceRuntime()) {
  return buildContributionAlignmentInternalDiagnosticsModelAdequacyReviewFromObject(sourceRuntimeEnvelope({
    source_runtime: runtime,
    source_diagnostics_sufficiency_evidence:
      governedDiagnosticsSufficiencyEvidenceSource(runtime)
  }));
}

function gateInput(
  sourceDiagnosticsReview,
  runtime = sourceRuntime(),
  sourceDiagnosticsEvidencePacket = currentDiagnosticsEvidencePacket(runtime)
) {
  return {
    source_diagnostics_review: sourceDiagnosticsReview,
    ...sourceRuntimeEnvelope({ source_runtime: runtime }),
    source_diagnostics_evidence_packet: sourceDiagnosticsEvidencePacket
  };
}

test("Bayesian promotion decision gate holds on current unsatisfied diagnostics review", () => {
  const runtime = sourceRuntime();
  const review = currentDiagnosticsReview(runtime);
  const evidencePacket = currentDiagnosticsEvidencePacket(runtime);
  const gate = buildContributionAlignmentBayesianPromotionDecisionGateFromObject(
    gateInput(review, runtime, evidencePacket)
  );
  const validation = validateContributionAlignmentBayesianPromotionDecisionGate(gate, {
    sourceDiagnosticsReview: review,
    sourceRuntime: runtime,
    sourceDiagnosticsEvidencePacket: evidencePacket
  });

  assert.equal(validation.valid, false);
  assert.equal(gate.gate_state, "HOLD_FOR_DIAGNOSTICS_AND_MODEL_ADEQUACY_SUFFICIENCY");
  assert.deepEqual(gate.source_diagnostics_evidence_packet_ref, {
    schema_version: evidencePacket.schema_version,
    packet_id: evidencePacket.packet_id,
    packet_state: null,
    packet_hash: evidencePacket.packet_hash,
    allowed_next_step: null
  });
  assert.equal(gate.gate_policy.promotion_authorized, false);
  assert.equal(gate.promotion_decision.promotion_authorized, false);
  assert.equal(gate.promotion_decision.promotion_blocked, true);
  assert.equal(gate.allowed_next_step, "complete_diagnostics_and_model_adequacy_sufficiency");
  assert.equal(gate.feeds.internal_bayesian_execution_artifact_v1, false);
});

test("Bayesian promotion decision gate holds when diagnostics evidence packet is missing", () => {
  const runtime = sourceRuntime();
  const review = promotableDiagnosticsReview(runtime);
  const gate = buildContributionAlignmentBayesianPromotionDecisionGateFromObject({
    source_diagnostics_review: review,
    source_runtime: runtime
  });
  const validation = validateContributionAlignmentBayesianPromotionDecisionGate(gate, {
    sourceDiagnosticsReview: review,
    sourceRuntime: runtime
  });

  assert.equal(gate.gate_state, "HOLD_FOR_DIAGNOSTICS_AND_MODEL_ADEQUACY_SUFFICIENCY");
  assert.equal(gate.promotion_decision.promotion_authorized, false);
  assert.equal(gate.feeds.internal_bayesian_execution_artifact_v1, false);
  assert.ok(
    validation.gaps.some((gap) => /sourceDiagnosticsEvidencePacket is required/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("Bayesian promotion decision gate rejects forged diagnostics evidence packet hash", () => {
  const runtime = sourceRuntime();
  const review = currentDiagnosticsReview(runtime);
  const evidencePacket = currentDiagnosticsEvidencePacket(runtime);
  evidencePacket.packet_hash = "c".repeat(64);
  const gate = buildContributionAlignmentBayesianPromotionDecisionGateFromObject(
    gateInput(review, runtime, evidencePacket)
  );
  const validation = validateContributionAlignmentBayesianPromotionDecisionGate(gate, {
    sourceDiagnosticsReview: review,
    sourceRuntime: runtime,
    sourceDiagnosticsEvidencePacket: evidencePacket
  });

  assert.equal(gate.gate_state, "HOLD_FOR_DIAGNOSTICS_AND_MODEL_ADEQUACY_SUFFICIENCY");
  assert.equal(gate.promotion_decision.promotion_authorized, false);
  assert.ok(
    validation.gaps.some((gap) => /sourceDiagnosticsEvidencePacket|packet_hash|hash/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("Bayesian promotion decision gate holds on unsatisfied bound diagnostics evidence packet", () => {
  const runtime = sourceRuntime();
  const review = currentDiagnosticsReview(runtime);
  const evidencePacket = currentDiagnosticsEvidencePacket(runtime);
  const gate = buildContributionAlignmentBayesianPromotionDecisionGateFromObject(
    gateInput(review, runtime, evidencePacket)
  );
  const validation = validateContributionAlignmentBayesianPromotionDecisionGate(gate, {
    sourceDiagnosticsReview: review,
    sourceRuntime: runtime,
    sourceDiagnosticsEvidencePacket: evidencePacket
  });

  assert.equal(gate.gate_state, "HOLD_FOR_DIAGNOSTICS_AND_MODEL_ADEQUACY_SUFFICIENCY");
  assert.equal(gate.diagnostics_sufficiency.comparison_design_adequacy_satisfied, false);
  assert.equal(gate.diagnostics_sufficiency.convergence_diagnostics_satisfied, false);
  assert.equal(gate.diagnostics_sufficiency.all_required_diagnostics_satisfied, false);
  assert.equal(gate.promotion_decision.promotion_authorized, false);
  assert.ok(
    validation.gaps.some((gap) => /evidence_sufficiency|model_diagnostics|comparison_design/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("Bayesian promotion decision gate rejects diagnostics evidence packet promotion side door", () => {
  const runtime = sourceRuntime();
  const review = currentDiagnosticsReview(runtime);
  const evidencePacket = currentDiagnosticsEvidencePacket(runtime);
  evidencePacket.packet_policy.promotion_authorized = true;
  evidencePacket.promotion_boundary.promotion_authorized = true;
  evidencePacket.packet_hash = contributionAlignmentDiagnosticsEvidencePacketHash(evidencePacket);

  const gate = buildContributionAlignmentBayesianPromotionDecisionGateFromObject(
    gateInput(review, runtime, evidencePacket)
  );
  const validation = validateContributionAlignmentBayesianPromotionDecisionGate(gate, {
    sourceDiagnosticsReview: review,
    sourceRuntime: runtime,
    sourceDiagnosticsEvidencePacket: evidencePacket
  });

  assert.equal(gate.gate_state, "HOLD_FOR_DIAGNOSTICS_AND_MODEL_ADEQUACY_SUFFICIENCY");
  assert.equal(gate.promotion_decision.promotion_authorized, false);
  assert.ok(
    validation.gaps.some((gap) => /evidence packet.*promotion|promotion_authorized/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("Bayesian promotion decision gate may pass only with governed sufficiency evidence bound through review and packet", () => {
  const runtime = sourceRuntime();
  const sourceDiagnosticsSufficiencyEvidence =
    governedDiagnosticsSufficiencyEvidenceSource(runtime);
  const review = buildContributionAlignmentInternalDiagnosticsModelAdequacyReviewFromObject(sourceRuntimeEnvelope({
    source_runtime: runtime,
    source_diagnostics_sufficiency_evidence: sourceDiagnosticsSufficiencyEvidence
  }));
  const evidencePacket = buildContributionAlignmentDiagnosticsEvidencePacketFromObject(sourceRuntimeEnvelope({
    source_runtime: runtime,
    source_diagnostics_sufficiency_evidence:
      governedDiagnosticsSufficiencyEvidenceSource(runtime)
  }));
  const gate = buildContributionAlignmentBayesianPromotionDecisionGateFromObject(
    gateInput(review, runtime, evidencePacket)
  );
  const validation = validateContributionAlignmentBayesianPromotionDecisionGate(gate, sourceRuntimeValidationOptions({
    sourceDiagnosticsReview: review,
    sourceRuntime: runtime,
    sourceDiagnosticsEvidencePacket: evidencePacket
  }));

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(
    gate.gate_state,
    "BAYESIAN_PROMOTION_DECISION_PASSED_FOR_INTERNAL_EXECUTION_ARTIFACT_ONLY"
  );
  assert.equal(gate.gate_policy.promotion_authorized, true);
  assert.equal(gate.promotion_decision.promotion_authorized, true);
  assert.equal(gate.feeds.internal_bayesian_execution_artifact_v1, true);
  assert.equal(gate.promotion_decision.posterior_interpretation_blocked, true);
  assert.equal(gate.promotion_decision.confidence_probability_blocked, true);
  assert.equal(gate.promotion_decision.customer_economic_output_blocked, true);
  assert.equal(gate.allowed_next_step, "internal_bayesian_execution_artifact_v1_only");
  assert.equal(evidencePacket.packet_policy.promotion_authorized, false);
  assert.equal(evidencePacket.promotion_boundary.promotion_authorized, false);
  assert.equal(
    review.source_governed_diagnostics_sufficiency_evidence_source_ref.evidence_hash,
    sourceDiagnosticsSufficiencyEvidence.evidence_hash
  );
  assert.equal(
    evidencePacket.source_governed_diagnostics_sufficiency_evidence_source_ref.evidence_hash,
    sourceDiagnosticsSufficiencyEvidence.evidence_hash
  );
  for (const feed of FALSE_FEEDS) {
    assert.equal(gate.feeds[feed], false, `${feed} must remain false`);
  }
});

test("Bayesian promotion decision gate holds when review and packet use different governed sufficiency sources", () => {
  const runtime = sourceRuntime();
  const reviewSource = governedDiagnosticsSufficiencyEvidenceSource(runtime);
  const packetSource = alternateGovernedDiagnosticsSufficiencyEvidenceSource(runtime);
  const review = buildContributionAlignmentInternalDiagnosticsModelAdequacyReviewFromObject({
    source_runtime: runtime,
    source_diagnostics_sufficiency_evidence: reviewSource
  });
  const evidencePacket = buildContributionAlignmentDiagnosticsEvidencePacketFromObject({
    source_runtime: runtime,
    source_diagnostics_sufficiency_evidence: packetSource
  });
  const gate = buildContributionAlignmentBayesianPromotionDecisionGateFromObject(
    gateInput(review, runtime, evidencePacket)
  );
  const validation = validateContributionAlignmentBayesianPromotionDecisionGate(gate, sourceRuntimeValidationOptions({
    sourceDiagnosticsReview: review,
    sourceRuntime: runtime,
    sourceDiagnosticsEvidencePacket: evidencePacket
  }));

  assert.notEqual(
    review.source_governed_diagnostics_sufficiency_evidence_source_ref.evidence_hash,
    evidencePacket.source_governed_diagnostics_sufficiency_evidence_source_ref.evidence_hash
  );
  assert.equal(gate.gate_state, "HOLD_FOR_DIAGNOSTICS_AND_MODEL_ADEQUACY_SUFFICIENCY");
  assert.equal(gate.promotion_decision.promotion_authorized, false);
  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /governed diagnostics sufficiency evidence source hash/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("Bayesian promotion decision gate holds when diagnostics review uses direct sidecar evidence", () => {
  const runtime = sourceRuntime();
  const review = buildContributionAlignmentInternalDiagnosticsModelAdequacyReviewFromObject({
    source_runtime: runtime,
    source_diagnostics_sufficiency_evidence:
      governedDiagnosticsSufficiencyEvidence(runtime)
  });
  const evidencePacket = promotableDiagnosticsEvidencePacket(runtime);
  const gate = buildContributionAlignmentBayesianPromotionDecisionGateFromObject(
    gateInput(review, runtime, evidencePacket)
  );
  const validation = validateContributionAlignmentBayesianPromotionDecisionGate(gate, {
    sourceDiagnosticsReview: review,
    sourceRuntime: runtime,
    sourceDiagnosticsEvidencePacket: evidencePacket
  });

  assert.equal(review.review_state, "HOLD_FOR_INTERNAL_DIAGNOSTICS_MODEL_ADEQUACY_SOURCE");
  assert.equal(gate.gate_state, "HOLD_FOR_DIAGNOSTICS_AND_MODEL_ADEQUACY_SUFFICIENCY");
  assert.equal(gate.promotion_decision.promotion_authorized, false);
  assert.equal(gate.feeds.internal_bayesian_execution_artifact_v1, false);
  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /sourceDiagnosticsReview|diagnostics review/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("Bayesian promotion decision gate rejects rehashed satisfied diagnostics without packet sufficiency", () => {
  const runtime = sourceRuntime();
  const review = promotableDiagnosticsReview(runtime);
  const evidencePacket = currentDiagnosticsEvidencePacket(runtime);
  const gate = buildContributionAlignmentBayesianPromotionDecisionGateFromObject(
    gateInput(review, runtime, evidencePacket)
  );
  const validation = validateContributionAlignmentBayesianPromotionDecisionGate(gate, {
    sourceDiagnosticsReview: review,
    sourceRuntime: runtime,
    sourceDiagnosticsEvidencePacket: evidencePacket
  });

  assert.equal(
    gate.gate_state,
    "HOLD_FOR_DIAGNOSTICS_AND_MODEL_ADEQUACY_SUFFICIENCY"
  );
  assert.equal(validation.valid, false);
  assert.equal(gate.source_bound, false);
  assert.equal(gate.gate_policy.aggregate_only, false);
  assert.equal(gate.gate_policy.promotion_authorized, false);
  assert.equal(gate.gate_policy.posterior_interpretation_authorized, false);
  assert.equal(gate.gate_policy.confidence_output_authorized, false);
  assert.equal(gate.gate_policy.probability_output_authorized, false);
  assert.equal(gate.gate_policy.customer_output_authorized, false);
  assert.equal(gate.source_state_checks.runtime_fixture_prototype_only, true);
  assert.equal(gate.source_state_checks.diagnostics_review_completed, true);
  assert.equal(gate.diagnostics_sufficiency.all_required_diagnostics_satisfied, false);
  assert.equal(gate.diagnostics_sufficiency.convergence_diagnostics_satisfied, false);
  assert.equal(gate.diagnostics_sufficiency.posterior_predictive_checks_satisfied, false);
  assert.equal(gate.diagnostics_sufficiency.prior_sensitivity_satisfied, false);
  assert.equal(gate.diagnostics_sufficiency.residual_fit_checks_satisfied, false);
  assert.equal(gate.diagnostics_sufficiency.calibration_backtest_satisfied, false);
  assert.equal(gate.diagnostics_sufficiency.comparison_design_adequacy_satisfied, false);
  assert.equal(gate.governance_containment.posterior_values_contained, true);
  assert.equal(gate.governance_containment.posterior_interpretation_blocked, true);
  assert.equal(gate.governance_containment.confidence_probability_blocked, true);
  assert.equal(gate.feature_weight_policy.weights_structural_internal_only, true);
  assert.equal(gate.feature_weight_policy.weights_not_confidence_scores, true);
  assert.equal(gate.feature_weight_policy.weight_provenance_version_present, true);
  assert.equal(gate.feature_weight_policy.customer_facing_weight_output, false);
  assert.equal(gate.promotion_decision.promotion_authorized, false);
  assert.equal(gate.promotion_decision.promotion_blocked, true);
  assert.equal(gate.allowed_next_step, "complete_diagnostics_and_model_adequacy_sufficiency");
  assert.equal(gate.feeds.internal_bayesian_execution_artifact_v1, false);
  assert.ok(
    validation.gaps.some((gap) => /sourceDiagnosticsEvidencePacket|evidence_sufficiency|must match diagnostics review/.test(gap)),
    validation.gaps.join("; ")
  );
  for (const feed of FALSE_FEEDS) {
    assert.equal(gate.feeds[feed], false, `${feed} must remain false`);
  }
});

test("Bayesian promotion decision gate holds when suppressed windows are present", () => {
  const runtime = sourceRuntime();
  runtime.aggregate_design_matrix.suppressed_window_count = 1;
  runtime.runtime_hash = contributionAlignmentInternalBayesianExecutionRuntimeHash(runtime);
  const review = promotableDiagnosticsReview(runtime);
  review.data_adequacy.suppressed_window_count_zero = false;
  review.data_adequacy.missing_or_suppressed_windows_fail_closed = false;
  review.data_adequacy.data_adequacy_satisfied = false;
  review.review_hash = contributionAlignmentInternalDiagnosticsModelAdequacyReviewHash(review);

  const gate = buildContributionAlignmentBayesianPromotionDecisionGateFromObject(
    gateInput(review, runtime)
  );
  const validation = validateContributionAlignmentBayesianPromotionDecisionGate(gate, {
    sourceDiagnosticsReview: review,
    sourceRuntime: runtime
  });

  assert.equal(gate.gate_state, "HOLD_FOR_DIAGNOSTICS_AND_MODEL_ADEQUACY_SUFFICIENCY");
  assert.equal(gate.promotion_decision.promotion_authorized, false);
  assert.equal(gate.feeds.internal_bayesian_execution_artifact_v1, false);
  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /suppressed|data_adequacy|sourceRuntime/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("Bayesian promotion decision gate rejects unsafe wrapper side doors without echo", () => {
  const runtime = sourceRuntime();
  const review = promotableDiagnosticsReview(runtime);
  const gate = buildContributionAlignmentBayesianPromotionDecisionGateFromObject({
    source_diagnostics_review: review,
    source_runtime: runtime,
    confidence_output: "high",
    probability_output: 0.91,
    customer_facing_output: "ready",
    roi_output: "dollars",
    causality_output: "caused",
    productivity_output: "productivity",
    query_text: "SELECT user_id FROM raw_rows",
    raw_rows: [{ email: "person@example.com" }]
  });
  const validation = validateContributionAlignmentBayesianPromotionDecisionGate(gate);
  const serialized = `${JSON.stringify(gate)} ${JSON.stringify(validation)}`;

  assert.equal(gate.gate_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validation.valid, false);
  for (const unsafe of [
    "person@example.com",
    "SELECT user_id",
    "confidence_output",
    "probability_output",
    "customer_facing_output",
    "roi_output",
    "causality_output",
    "productivity_output"
  ]) {
    assert.equal(serialized.includes(unsafe), false, `${unsafe} must not echo`);
  }
});

test("Bayesian promotion decision gate rejects unsafe nested runtime envelope sidecars", () => {
  const runtime = sourceRuntime();
  const gate = buildContributionAlignmentBayesianPromotionDecisionGateFromObject({
    source_diagnostics_review: promotableDiagnosticsReview(runtime),
    source_runtime: {
      ...sourceRuntimeSource(),
      raw_rows: [{ email: "person@example.com" }],
      query_text: "SELECT user_id FROM raw_rows",
      user_id: "person-123"
    },
    source_diagnostics_evidence_packet: promotableDiagnosticsEvidencePacket(runtime)
  });
  const validation = validateContributionAlignmentBayesianPromotionDecisionGate(gate);
  const serialized = `${JSON.stringify(gate)} ${JSON.stringify(validation)}`;

  assert.equal(gate.gate_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validation.valid, false);
  for (const unsafe of ["person@example.com", "SELECT user_id", "person-123"]) {
    assert.equal(serialized.includes(unsafe), false, `${unsafe} must not echo`);
  }
});

test("Bayesian promotion decision gate rejects unsafe source diagnostics review side doors after rehash", () => {
  const runtime = sourceRuntime();
  const review = promotableDiagnosticsReview(runtime);
  review.raw_rows = [{ email: "person@example.com" }];
  review.query_text = "SELECT user_id FROM raw_rows";
  review.review_hash = contributionAlignmentInternalDiagnosticsModelAdequacyReviewHash(review);

  const gate = buildContributionAlignmentBayesianPromotionDecisionGateFromObject(
    gateInput(review, runtime)
  );
  const validation = validateContributionAlignmentBayesianPromotionDecisionGate(gate, {
    sourceDiagnosticsReview: review,
    sourceRuntime: runtime
  });
  const serialized = `${JSON.stringify(gate)} ${JSON.stringify(validation)}`;

  assert.notEqual(
    gate.gate_state,
    "BAYESIAN_PROMOTION_DECISION_PASSED_FOR_INTERNAL_EXECUTION_ARTIFACT_ONLY"
  );
  assert.equal(validation.valid, false);
  for (const unsafe of ["person@example.com", "SELECT user_id"]) {
    assert.equal(serialized.includes(unsafe), false, `${unsafe} must not echo`);
  }
});

test("Bayesian promotion decision gate rejects safe-named nested source diagnostics side doors", () => {
  const runtime = sourceRuntime();
  const review = promotableDiagnosticsReview(runtime);
  review.model_diagnostics.extra_safe_alias = true;
  review.review_hash = contributionAlignmentInternalDiagnosticsModelAdequacyReviewHash(review);

  const gate = buildContributionAlignmentBayesianPromotionDecisionGateFromObject(
    gateInput(review, runtime)
  );
  const validation = validateContributionAlignmentBayesianPromotionDecisionGate(gate, {
    sourceDiagnosticsReview: review,
    sourceRuntime: runtime
  });

  assert.equal(gate.gate_state, "HOLD_FOR_DIAGNOSTICS_AND_MODEL_ADEQUACY_SUFFICIENCY");
  assert.equal(gate.promotion_decision.promotion_authorized, false);
  assert.equal(gate.feeds.internal_bayesian_execution_artifact_v1, false);
  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /ungoverned nested field/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("Bayesian promotion decision gate rejects unsafe source feed leakage without echo", () => {
  const runtime = sourceRuntime();
  const review = promotableDiagnosticsReview(runtime);
  review.feeds.roi_output = true;
  review.feeds.causality_output = true;
  review.feeds.productivity_output = true;
  review.feeds.route_creation = true;
  review.review_hash = contributionAlignmentInternalDiagnosticsModelAdequacyReviewHash(review);

  const gate = buildContributionAlignmentBayesianPromotionDecisionGateFromObject(
    gateInput(review, runtime)
  );
  const validation = validateContributionAlignmentBayesianPromotionDecisionGate(gate);
  const serialized = `${JSON.stringify(gate)} ${JSON.stringify(validation)}`;

  assert.equal(gate.gate_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validation.valid, false);
  for (const unsafe of [
    "roi_output",
    "causality_output",
    "productivity_output",
    "route_creation"
  ]) {
    assert.equal(serialized.includes(unsafe), false, `${unsafe} must not echo`);
  }
});

test("Bayesian promotion decision gate cannot pass without the source runtime artifact", () => {
  const runtime = sourceRuntime();
  const review = promotableDiagnosticsReview(runtime);
  const gate = buildContributionAlignmentBayesianPromotionDecisionGateFromObject(review);
  const validation = validateContributionAlignmentBayesianPromotionDecisionGate(gate, {
    sourceDiagnosticsReview: review
  });

  assert.equal(gate.gate_state, "HOLD_FOR_DIAGNOSTICS_AND_MODEL_ADEQUACY_SUFFICIENCY");
  assert.equal(gate.promotion_decision.promotion_authorized, false);
  assert.equal(gate.feeds.internal_bayesian_execution_artifact_v1, false);
  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /sourceRuntime is required/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("Bayesian promotion decision gate validation rejects forged fixture artifact hash", () => {
  const runtime = sourceRuntime();
  const review = promotableDiagnosticsReview(runtime);
  const gate = buildContributionAlignmentBayesianPromotionDecisionGateFromObject(
    gateInput(review, runtime)
  );
  gate.source_fixture_artifact_ref.artifact_hash =
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  gate.gate_hash = contributionAlignmentBayesianPromotionDecisionGateHash(gate);

  const validation = validateContributionAlignmentBayesianPromotionDecisionGate(gate, {
    sourceDiagnosticsReview: review,
    sourceRuntime: runtime
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /source_fixture_artifact_ref|artifact_hash/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("Bayesian promotion decision gate validation rejects forged diagnostics review hash", () => {
  const runtime = sourceRuntime();
  const review = promotableDiagnosticsReview(runtime);
  const gate = buildContributionAlignmentBayesianPromotionDecisionGateFromObject(
    gateInput(review, runtime)
  );
  gate.source_diagnostics_review_ref.review_hash =
    "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  gate.gate_hash = contributionAlignmentBayesianPromotionDecisionGateHash(gate);

  const validation = validateContributionAlignmentBayesianPromotionDecisionGate(gate, {
    sourceDiagnosticsReview: review,
    sourceRuntime: runtime
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /source_diagnostics_review_ref|review_hash/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("Bayesian promotion decision gate rejects posterior interpretation authorization", () => {
  const runtime = sourceRuntime();
  const review = promotableDiagnosticsReview(runtime);
  review.review_policy.posterior_interpretation_authorized = true;
  review.feeds.posterior_interpretation = true;
  review.allowed_next_step = "internal_posterior_interpretation_specification_only";
  review.review_hash = contributionAlignmentInternalDiagnosticsModelAdequacyReviewHash(review);

  const gate = buildContributionAlignmentBayesianPromotionDecisionGateFromObject(
    gateInput(review, runtime)
  );
  const validation = validateContributionAlignmentBayesianPromotionDecisionGate(gate);
  const serialized = `${JSON.stringify(gate)} ${JSON.stringify(validation)}`;

  assert.equal(gate.gate_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validation.valid, false);
  assert.equal(serialized.includes("internal_posterior_interpretation_specification_only"), false);
});

test("Bayesian promotion decision gate validation rejects forged customer weight output", () => {
  const runtime = sourceRuntime();
  const review = promotableDiagnosticsReview(runtime);
  const gate = buildContributionAlignmentBayesianPromotionDecisionGateFromObject(
    gateInput(review, runtime)
  );
  gate.feature_weight_policy.customer_facing_weight_output = true;
  gate.feeds.weighted_internal_model_output = true;
  gate.gate_hash = contributionAlignmentBayesianPromotionDecisionGateHash(gate);

  const validation = validateContributionAlignmentBayesianPromotionDecisionGate(gate, {
    sourceDiagnosticsReview: review,
    sourceRuntime: runtime,
    expectedGate: buildContributionAlignmentBayesianPromotionDecisionGateFromObject(
      gateInput(review, runtime)
    )
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /feature_weight|weighted|customer|feed/.test(gap)),
    validation.gaps.join("; ")
  );
});
