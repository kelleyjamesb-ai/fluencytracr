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
  buildContributionAlignmentInternalBayesianExecutionRuntimeFromObject,
  contributionAlignmentInternalBayesianExecutionRuntimeHash
} from "./run_ai_value_contribution_alignment_internal_bayesian_execution_runtime.mjs";
import {
  buildContributionAlignmentDiagnosticsEvidencePacketFromObject,
  contributionAlignmentDiagnosticsEvidencePacketHash,
  validateContributionAlignmentDiagnosticsEvidencePacket
} from "./run_ai_value_contribution_alignment_diagnostics_evidence_packet.mjs";
import {
  buildContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceFromObject,
  contributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceHash
} from "./run_ai_value_contribution_alignment_governed_diagnostics_sufficiency_evidence_source.mjs";

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

const FALSE_FEEDS = [
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

const DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_2026_06";
const DIAGNOSTICS_SUFFICIENCY_EVIDENCE_STATE =
  "DIAGNOSTICS_SUFFICIENCY_EVIDENCE_GOVERNED_INTERNAL_ONLY";
const DIAGNOSTICS_SUFFICIENCY_EVIDENCE_CLASS =
  "diagnostics_sufficiency_evidence_only";
const DIAGNOSTICS_SUFFICIENCY_EVIDENCE_VERSION =
  "diagnostics_sufficiency_evidence_2026_06";
const GOVERNED_SOURCE_READY_STATE =
  "GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE_READY_FOR_PACKET_REVIEW";
const GOVERNED_SOURCE_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE_2026_06";

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
    evidence_dimensions: dimensions,
    ...overrides
  };
}

function governedDiagnosticsSufficiencyEvidenceSource(runtime, overrides = {}) {
  return buildContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceFromObject({
    source_runtime: runtime,
    reviewed_diagnostics_source_evidence: governedReviewedEvidenceInput(runtime, overrides)
  });
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

test("diagnostics evidence packet holds without governed evidence source", () => {
  const runtime = sourceRuntime();
  const packet = buildContributionAlignmentDiagnosticsEvidencePacketFromObject(runtime);
  const validation = validateContributionAlignmentDiagnosticsEvidencePacket(packet, {
    sourceRuntime: runtime
  });

  assert.equal(validation.valid, false);
  assert.equal(
    packet.packet_state,
    "HOLD_FOR_DIAGNOSTICS_EVIDENCE_SOURCE"
  );
  assert.equal(packet.packet_policy.internal_only, true);
  assert.equal(packet.packet_policy.aggregate_only, false);
  assert.equal(packet.packet_policy.promotion_authorized, false);
  assert.equal(packet.packet_policy.posterior_interpretation_authorized, false);
  assert.equal(packet.packet_policy.confidence_output_authorized, false);
  assert.equal(packet.packet_policy.probability_output_authorized, false);
  assert.equal(packet.packet_policy.customer_output_authorized, false);
  assert.equal(packet.packet_policy.economic_output_authorized, false);
  assert.equal(packet.packet_policy.roi_output_authorized, false);
  assert.equal(packet.packet_policy.productivity_output_authorized, false);
  assert.equal(packet.packet_policy.causality_output_authorized, false);
  assert.equal(packet.packet_policy.finance_output_authorized, false);
  assert.equal(packet.data_adequacy_evidence.data_adequacy_satisfied, false);
  assert.equal(
    packet.suppressed_missing_held_window_review.suppressed_missing_held_windows_clear,
    false
  );
  assert.equal(packet.comparison_design_evidence.comparison_design_adequacy_satisfied, false);
  assert.equal(packet.model_diagnostics_evidence.convergence_diagnostics.evidence_satisfied, false);
  assert.equal(packet.model_diagnostics_evidence.posterior_predictive_checks.evidence_satisfied, false);
  assert.equal(packet.model_diagnostics_evidence.prior_sensitivity.evidence_satisfied, false);
  assert.equal(packet.model_diagnostics_evidence.residual_fit_checks.evidence_satisfied, false);
  assert.equal(packet.model_diagnostics_evidence.calibration_backtest.evidence_satisfied, false);
  assert.equal(packet.model_diagnostics_evidence.all_required_model_diagnostics_satisfied, false);
  assert.equal(packet.feature_weight_provenance.weights_structural_internal_only, false);
  assert.equal(packet.feature_weight_provenance.weights_not_confidence_scores, true);
  assert.equal(packet.feature_weight_provenance.customer_facing_weight_output, false);
  assert.equal(packet.evidence_sufficiency.all_required_evidence_satisfied, false);
  assert.equal(packet.promotion_boundary.promotion_authorized, false);
  assert.equal(packet.promotion_boundary.internal_bayesian_execution_artifact_v1_authorized, false);
  assert.equal(packet.allowed_next_step, "complete_diagnostics_evidence_source");
  assert.equal(packet.feeds.bayesian_promotion_decision_gate, false);
  assert.equal(packet.feeds.internal_diagnostics_model_adequacy_review, false);
  for (const feed of FALSE_FEEDS) {
    assert.equal(packet.feeds[feed], false, `${feed} must remain false`);
  }
  assert.ok(
    validation.gaps.some((gap) => /governed diagnostics sufficiency evidence source is required/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("diagnostics evidence packet holds when required evidence fields are missing", () => {
  const runtime = sourceRuntime();
  delete runtime.internal_fit_artifact.convergence_diagnostics_present;
  runtime.internal_fit_artifact.artifact_hash = "0".repeat(64);
  runtime.runtime_hash = contributionAlignmentInternalBayesianExecutionRuntimeHash(runtime);

  const packet = buildContributionAlignmentDiagnosticsEvidencePacketFromObject(runtime);
  const validation = validateContributionAlignmentDiagnosticsEvidencePacket(packet, {
    sourceRuntime: runtime
  });

  assert.equal(packet.packet_state, "HOLD_FOR_DIAGNOSTICS_EVIDENCE_SOURCE");
  assert.equal(packet.source_bound, false);
  assert.equal(packet.feeds.bayesian_promotion_decision_gate, false);
  assert.equal(packet.promotion_boundary.promotion_authorized, false);
  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /convergence_diagnostics_present|artifact_hash|source_runtime/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("diagnostics evidence packet rejects forged satisfied evidence against bound runtime", () => {
  const runtime = sourceRuntime();
  const packet = buildContributionAlignmentDiagnosticsEvidencePacketFromObject(runtime);
  packet.model_diagnostics_evidence.convergence_diagnostics.evidence_present = true;
  packet.model_diagnostics_evidence.convergence_diagnostics.evidence_satisfied = true;
  packet.model_diagnostics_evidence.all_required_model_diagnostics_satisfied = true;
  packet.evidence_sufficiency.model_diagnostics_satisfied = true;
  packet.evidence_sufficiency.all_required_evidence_satisfied = true;
  packet.packet_hash = contributionAlignmentDiagnosticsEvidencePacketHash(packet);

  const validation = validateContributionAlignmentDiagnosticsEvidencePacket(packet, {
    sourceRuntime: runtime
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /does not match bound source runtime/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("diagnostics evidence packet requires source runtime for ready validation", () => {
  const runtime = sourceRuntime();
  const sourceDiagnosticsSufficiencyEvidence =
    governedDiagnosticsSufficiencyEvidenceSource(runtime);
  const packet = buildContributionAlignmentDiagnosticsEvidencePacketFromObject({
    source_runtime: runtime,
    source_diagnostics_sufficiency_evidence: sourceDiagnosticsSufficiencyEvidence
  });

  const validation = validateContributionAlignmentDiagnosticsEvidencePacket(packet);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /sourceRuntime is required/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("diagnostics evidence packet holds when suppressed windows are present", () => {
  const runtime = sourceRuntime();
  runtime.aggregate_design_matrix.suppressed_window_count = 1;
  runtime.runtime_hash = contributionAlignmentInternalBayesianExecutionRuntimeHash(runtime);

  const packet = buildContributionAlignmentDiagnosticsEvidencePacketFromObject(runtime);
  const validation = validateContributionAlignmentDiagnosticsEvidencePacket(packet, {
    sourceRuntime: runtime
  });

  assert.equal(packet.packet_state, "HOLD_FOR_DIAGNOSTICS_EVIDENCE_SOURCE");
  assert.equal(packet.evidence_sufficiency.all_required_evidence_satisfied, false);
  assert.equal(packet.promotion_boundary.promotion_authorized, false);
  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /suppressed_window_count|source_runtime/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("diagnostics evidence packet rejects promotion or output authorization", () => {
  const runtime = sourceRuntime();
  const packet = buildContributionAlignmentDiagnosticsEvidencePacketFromObject(runtime);
  packet.packet_policy.promotion_authorized = true;
  packet.packet_policy.confidence_output_authorized = true;
  packet.packet_policy.probability_output_authorized = true;
  packet.packet_policy.customer_output_authorized = true;
  packet.packet_policy.economic_output_authorized = true;
  packet.packet_policy.roi_output_authorized = true;
  packet.packet_policy.productivity_output_authorized = true;
  packet.packet_policy.causality_output_authorized = true;
  packet.packet_policy.finance_output_authorized = true;
  packet.promotion_boundary.promotion_authorized = true;
  packet.promotion_boundary.posterior_interpretation_authorized = true;
  packet.promotion_boundary.internal_bayesian_execution_artifact_v1_authorized = true;
  packet.feeds.internal_bayesian_execution_artifact_v1 = true;
  packet.feeds.customer_facing_output = true;
  packet.packet_hash = contributionAlignmentDiagnosticsEvidencePacketHash(packet);

  const validation = validateContributionAlignmentDiagnosticsEvidencePacket(packet, {
    sourceRuntime: runtime
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /promotion|confidence|probability|customer|economic|roi|finance|feed|posterior/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("diagnostics evidence packet rejects unsafe wrapper side doors without echo", () => {
  const runtime = sourceRuntime();
  const packet = buildContributionAlignmentDiagnosticsEvidencePacketFromObject({
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
  const validation = validateContributionAlignmentDiagnosticsEvidencePacket(packet);
  const serialized = `${JSON.stringify(packet)} ${JSON.stringify(validation)}`;

  assert.equal(packet.packet_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
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

test("diagnostics evidence packet can mark diagnostics satisfied only from governed sufficiency evidence hashes", () => {
  const runtime = sourceRuntime();
  const sourceDiagnosticsSufficiencyEvidence =
    governedDiagnosticsSufficiencyEvidenceSource(runtime);
  const packet = buildContributionAlignmentDiagnosticsEvidencePacketFromObject({
    source_runtime: runtime,
    source_diagnostics_sufficiency_evidence: sourceDiagnosticsSufficiencyEvidence
  });
  const validation = validateContributionAlignmentDiagnosticsEvidencePacket(packet, {
    sourceRuntime: runtime,
    sourceGovernedDiagnosticsSufficiencyEvidenceSource: sourceDiagnosticsSufficiencyEvidence
  });

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(
    packet.packet_state,
    "DIAGNOSTICS_EVIDENCE_PACKET_READY_FOR_PROMOTION_DECISION_REVIEW"
  );
  assert.equal(
    packet.source_governed_diagnostics_sufficiency_evidence_source_ref.schema_version,
    GOVERNED_SOURCE_SCHEMA_VERSION
  );
  assert.equal(
    packet.source_governed_diagnostics_sufficiency_evidence_source_ref.source_state,
    GOVERNED_SOURCE_READY_STATE
  );
  assert.equal(
    packet.source_governed_diagnostics_sufficiency_evidence_source_ref.evidence_hash,
    sourceDiagnosticsSufficiencyEvidence.evidence_hash
  );
  assert.equal(
    packet.source_diagnostics_sufficiency_evidence_ref.evidence_hash,
    packet.source_governed_diagnostics_sufficiency_evidence_source_ref.projected_evidence_hash
  );
  assert.equal(packet.comparison_design_evidence.comparison_design_adequacy_satisfied, true);
  assert.equal(
    packet.comparison_design_evidence.source_evidence_ref,
    diagnosticsEvidenceRef("comparison_design_adequacy")
  );
  for (const [field, dimension] of Object.entries({
    convergence_diagnostics: "convergence_diagnostics",
    posterior_predictive_checks: "posterior_predictive_checks",
    prior_sensitivity: "prior_sensitivity",
    residual_fit_checks: "residual_fit_checks",
    calibration_backtest: "calibration_backtest"
  })) {
    assert.equal(packet.model_diagnostics_evidence[field].evidence_present, true);
    assert.equal(packet.model_diagnostics_evidence[field].evidence_satisfied, true);
    assert.equal(
      packet.model_diagnostics_evidence[field].source_evidence_ref,
      diagnosticsEvidenceRef(dimension)
    );
    assert.equal(
      packet.model_diagnostics_evidence[field].source_evidence_hash,
      diagnosticsDimensionHash(
        runtime,
        dimension,
        diagnosticsEvidenceRef(dimension),
        reviewedSourceEvidenceHash(dimension)
      )
    );
    assert.equal(
      packet.model_diagnostics_evidence[field].reviewed_source_evidence_hash,
      reviewedSourceEvidenceHash(dimension)
    );
  }
  assert.equal(packet.evidence_sufficiency.model_diagnostics_satisfied, true);
  assert.equal(packet.evidence_sufficiency.comparison_design_adequacy_satisfied, true);
  assert.equal(packet.evidence_sufficiency.all_required_evidence_satisfied, true);
  assert.equal(packet.packet_policy.promotion_authorized, false);
  assert.equal(packet.promotion_boundary.promotion_authorized, false);
  assert.equal(packet.promotion_boundary.internal_bayesian_execution_artifact_v1_authorized, false);
});

test("diagnostics evidence packet rejects direct sidecar evidence without governed source binding", () => {
  const runtime = sourceRuntime();
  const sourceDiagnosticsSufficiencyEvidence =
    governedDiagnosticsSufficiencyEvidence(runtime);
  const packet = buildContributionAlignmentDiagnosticsEvidencePacketFromObject({
    source_runtime: runtime,
    source_diagnostics_sufficiency_evidence: sourceDiagnosticsSufficiencyEvidence
  });
  const validation = validateContributionAlignmentDiagnosticsEvidencePacket(packet, {
    sourceRuntime: runtime,
    sourceDiagnosticsSufficiencyEvidence
  });

  assert.equal(packet.packet_state, "HOLD_FOR_DIAGNOSTICS_EVIDENCE_SOURCE");
  assert.equal(packet.evidence_sufficiency.all_required_evidence_satisfied, false);
  assert.equal(packet.promotion_boundary.promotion_authorized, false);
  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /governed diagnostics sufficiency evidence source/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("diagnostics evidence packet holds partial governed sufficiency evidence", () => {
  const runtime = sourceRuntime();
  const sourceDiagnosticsSufficiencyEvidence =
    governedDiagnosticsSufficiencyEvidenceSource(
      runtime,
      {
        evidence_dimensions: {
          ...governedReviewedEvidenceInput(runtime).evidence_dimensions,
          prior_sensitivity: {
            ...governedReviewedEvidenceInput(runtime).evidence_dimensions.prior_sensitivity,
            evidence_satisfied: false
          }
        }
      }
    );
  sourceDiagnosticsSufficiencyEvidence.evidence_hash =
    contributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceHash(sourceDiagnosticsSufficiencyEvidence);

  const packet = buildContributionAlignmentDiagnosticsEvidencePacketFromObject({
    source_runtime: runtime,
    source_diagnostics_sufficiency_evidence: sourceDiagnosticsSufficiencyEvidence
  });
  const validation = validateContributionAlignmentDiagnosticsEvidencePacket(packet, {
    sourceRuntime: runtime,
    sourceGovernedDiagnosticsSufficiencyEvidenceSource: sourceDiagnosticsSufficiencyEvidence
  });

  assert.equal(packet.packet_state, "HOLD_FOR_DIAGNOSTICS_EVIDENCE_SOURCE");
  assert.equal(packet.evidence_sufficiency.all_required_evidence_satisfied, false);
  assert.equal(packet.promotion_boundary.promotion_authorized, false);
  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /prior_sensitivity|sufficiency evidence/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("diagnostics evidence packet rejects satisfied diagnostics without governed evidence hash", () => {
  const runtime = sourceRuntime();
  const sourceDiagnosticsSufficiencyEvidence =
    governedDiagnosticsSufficiencyEvidenceSource(
      runtime,
      {
        evidence_dimensions: {
          ...governedReviewedEvidenceInput(runtime).evidence_dimensions,
          convergence_diagnostics: {
            ...governedReviewedEvidenceInput(runtime).evidence_dimensions.convergence_diagnostics
          }
        }
      }
    );
  sourceDiagnosticsSufficiencyEvidence.evidence_dimensions.convergence_diagnostics.source_evidence_hash = null;
  sourceDiagnosticsSufficiencyEvidence.evidence_hash =
    contributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceHash(sourceDiagnosticsSufficiencyEvidence);

  const packet = buildContributionAlignmentDiagnosticsEvidencePacketFromObject({
    source_runtime: runtime,
    source_diagnostics_sufficiency_evidence: sourceDiagnosticsSufficiencyEvidence
  });
  const validation = validateContributionAlignmentDiagnosticsEvidencePacket(packet, {
    sourceRuntime: runtime,
    sourceGovernedDiagnosticsSufficiencyEvidenceSource: sourceDiagnosticsSufficiencyEvidence
  });

  assert.equal(packet.packet_state, "HOLD_FOR_DIAGNOSTICS_EVIDENCE_SOURCE");
  assert.equal(packet.model_diagnostics_evidence.convergence_diagnostics.evidence_satisfied, false);
  assert.equal(packet.promotion_boundary.promotion_authorized, false);
  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /convergence_diagnostics|source_evidence_hash/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("diagnostics evidence packet rejects forged governed evidence source hash", () => {
  const runtime = sourceRuntime();
  const sourceDiagnosticsSufficiencyEvidence =
    governedDiagnosticsSufficiencyEvidenceSource(runtime);
  sourceDiagnosticsSufficiencyEvidence.evidence_hash = "f".repeat(64);

  const packet = buildContributionAlignmentDiagnosticsEvidencePacketFromObject({
    source_runtime: runtime,
    source_diagnostics_sufficiency_evidence: sourceDiagnosticsSufficiencyEvidence
  });
  const validation = validateContributionAlignmentDiagnosticsEvidencePacket(packet, {
    sourceRuntime: runtime,
    sourceGovernedDiagnosticsSufficiencyEvidenceSource: sourceDiagnosticsSufficiencyEvidence
  });

  assert.equal(packet.packet_state, "HOLD_FOR_DIAGNOSTICS_EVIDENCE_SOURCE");
  assert.equal(packet.evidence_sufficiency.all_required_evidence_satisfied, false);
  assert.equal(packet.promotion_boundary.promotion_authorized, false);
  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /governed diagnostics sufficiency evidence source|hash/.test(gap)),
    validation.gaps.join("; ")
  );
});
