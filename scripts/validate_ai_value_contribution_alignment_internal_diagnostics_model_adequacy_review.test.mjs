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
  buildContributionAlignmentInternalDiagnosticsModelAdequacyReviewFromObject,
  contributionAlignmentInternalDiagnosticsModelAdequacyReviewHash,
  validateContributionAlignmentInternalDiagnosticsModelAdequacyReview
} from "./run_ai_value_contribution_alignment_internal_diagnostics_model_adequacy_review.mjs";

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

let cachedRuntime = null;

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

function rehashArtifact(artifact) {
  const withoutHash = JSON.parse(JSON.stringify(artifact));
  delete withoutHash.artifact_hash;
  return sha256Json(withoutHash);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sufficiencyEvidenceHash(evidence) {
  const withoutHash = clone(evidence);
  delete withoutHash.evidence_hash;
  return sha256Json(withoutHash);
}

function diagnosticsEvidenceRef(dimension) {
  return `internal_diagnostics_sufficiency_evidence.${dimension}.2026_06`;
}

function diagnosticsDimensionHash(runtime, dimension, sourceEvidenceRef) {
  return sha256Json({
    schema_version: DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SCHEMA_VERSION,
    evidence_dimension: dimension,
    source_evidence_ref: sourceEvidenceRef,
    source_runtime_hash: runtime.runtime_hash,
    source_fixture_artifact_hash: runtime.internal_fit_artifact.artifact_hash,
    internal_only: true,
    aggregate_only: true,
    evidence_satisfied: true
  });
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
    dimensions[dimension] = {
      evidence_satisfied: true,
      source_evidence_ref: sourceEvidenceRef,
      source_evidence_hash: diagnosticsDimensionHash(runtime, dimension, sourceEvidenceRef)
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
  if (cachedRuntime) return JSON.parse(JSON.stringify(cachedRuntime));
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
  return JSON.parse(JSON.stringify(cachedRuntime));
}

test("internal diagnostics and model adequacy review completes with promotion still blocked", () => {
  const runtime = sourceRuntime();
  const review =
    buildContributionAlignmentInternalDiagnosticsModelAdequacyReviewFromObject(runtime);
  const validation = validateContributionAlignmentInternalDiagnosticsModelAdequacyReview(
    review,
    { sourceRuntime: runtime, expectedReview: review }
  );

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(
    review.review_state,
    "INTERNAL_DIAGNOSTICS_AND_MODEL_ADEQUACY_REVIEW_COMPLETED_PROMOTION_BLOCKED"
  );
  assert.equal(review.source_bound, true);
  assert.equal(review.review_class, "internal_diagnostics_model_adequacy_review_only");
  assert.equal(review.review_policy.internal_only, true);
  assert.equal(review.review_policy.aggregate_only, true);
  assert.equal(review.review_policy.promotion_authorized, false);
  assert.equal(review.review_policy.posterior_interpretation_authorized, false);
  assert.equal(review.review_policy.confidence_output_authorized, false);
  assert.equal(review.review_policy.probability_output_authorized, false);
  assert.equal(review.review_policy.customer_output_authorized, false);
  assert.equal(review.data_adequacy.minimum_eligible_aggregate_windows_present, true);
  assert.equal(review.data_adequacy.pre_post_window_sufficiency_present, true);
  assert.equal(review.data_adequacy.treatment_comparison_available, true);
  assert.equal(review.data_adequacy.suppression_status_respected, true);
  assert.equal(review.data_adequacy.missing_or_suppressed_windows_fail_closed, true);
  assert.equal(review.data_adequacy.missing_window_count_zero, true);
  assert.equal(review.data_adequacy.suppressed_window_count_zero, true);
  assert.equal(review.data_adequacy.held_window_count_zero, true);
  assert.equal(review.comparison_design_adequacy.aggregate_measurement_cell_grain, true);
  assert.equal(review.comparison_design_adequacy.no_person_level_fields, true);
  assert.equal(review.comparison_design_adequacy.no_unsupported_cross_slice_aggregation, true);
  assert.equal(review.comparison_design_adequacy.causal_claim_authorized, false);
  assert.equal(review.model_diagnostics.convergence_diagnostics_required, true);
  assert.equal(review.model_diagnostics.convergence_diagnostics_satisfied, false);
  assert.equal(review.model_diagnostics.posterior_predictive_checks_required, true);
  assert.equal(review.model_diagnostics.posterior_predictive_checks_satisfied, false);
  assert.equal(review.model_diagnostics.prior_sensitivity_required, true);
  assert.equal(review.model_diagnostics.prior_sensitivity_satisfied, false);
  assert.equal(review.model_diagnostics.residual_fit_checks_required, true);
  assert.equal(review.model_diagnostics.residual_fit_checks_satisfied, false);
  assert.equal(review.model_diagnostics.calibration_backtest_required, true);
  assert.equal(review.model_diagnostics.calibration_backtest_satisfied, false);
  assert.equal(review.promotion_review.promotion_blocked, true);
  assert.equal(review.promotion_review.blocking_reason, "diagnostics_and_model_adequacy_unsatisfied");
  assert.equal(review.promotion_review.explicit_later_promotion_decision_required, true);
  assert.equal(review.boundary_checks.feature_weights_structural_internal_only, true);
  assert.equal(review.boundary_checks.feature_weights_not_confidence_scores, true);
  assert.equal(review.allowed_next_step, "bayesian_promotion_decision_gate_only");
  assert.equal(review.feeds.bayesian_promotion_decision_gate, true);
  assert.equal(Object.hasOwn(review.reviewed_fixture_artifact_ref, "posterior_mean_internal"), false);
  assert.equal(Object.hasOwn(review.reviewed_fixture_artifact_ref, "posterior_sd_internal"), false);
  for (const feed of FALSE_FEEDS) {
    assert.equal(review.feeds[feed], false, `${feed} must remain false`);
  }
});

test("internal diagnostics and model adequacy review records governed sufficiency evidence without promoting", () => {
  const runtime = sourceRuntime();
  const sourceDiagnosticsSufficiencyEvidence =
    governedDiagnosticsSufficiencyEvidence(runtime);
  const review =
    buildContributionAlignmentInternalDiagnosticsModelAdequacyReviewFromObject({
      source_runtime: runtime,
      source_diagnostics_sufficiency_evidence: sourceDiagnosticsSufficiencyEvidence
    });
  const validation = validateContributionAlignmentInternalDiagnosticsModelAdequacyReview(
    review,
    { sourceRuntime: runtime, sourceDiagnosticsSufficiencyEvidence }
  );

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(
    review.review_state,
    "INTERNAL_DIAGNOSTICS_AND_MODEL_ADEQUACY_REVIEW_COMPLETED_PROMOTION_BLOCKED"
  );
  assert.equal(review.source_diagnostics_sufficiency_evidence_ref.evidence_hash, sourceDiagnosticsSufficiencyEvidence.evidence_hash);
  assert.equal(review.comparison_design_adequacy.comparison_design_review_present, true);
  assert.equal(review.comparison_design_adequacy.comparison_design_adequacy_satisfied, true);
  assert.equal(review.model_diagnostics.convergence_diagnostics_satisfied, true);
  assert.equal(review.model_diagnostics.posterior_predictive_checks_satisfied, true);
  assert.equal(review.model_diagnostics.prior_sensitivity_satisfied, true);
  assert.equal(review.model_diagnostics.residual_fit_checks_satisfied, true);
  assert.equal(review.model_diagnostics.calibration_backtest_satisfied, true);
  assert.equal(review.model_diagnostics.model_diagnostics_satisfied, true);
  assert.equal(review.promotion_review.promotion_authorized, false);
  assert.equal(review.promotion_review.promotion_blocked, true);
  assert.equal(review.promotion_review.blocking_reason, "diagnostics_and_model_adequacy_satisfied_promotion_decision_required");
  assert.equal(review.allowed_next_step, "bayesian_promotion_decision_gate_only");
  assert.equal(review.feeds.bayesian_promotion_decision_gate, true);
});

test("internal diagnostics and model adequacy review holds partial governed sufficiency evidence", () => {
  const runtime = sourceRuntime();
  const sourceDiagnosticsSufficiencyEvidence =
    governedDiagnosticsSufficiencyEvidence(runtime);
  sourceDiagnosticsSufficiencyEvidence.evidence_dimensions.calibration_backtest.evidence_satisfied = false;
  sourceDiagnosticsSufficiencyEvidence.evidence_hash =
    sufficiencyEvidenceHash(sourceDiagnosticsSufficiencyEvidence);

  const review =
    buildContributionAlignmentInternalDiagnosticsModelAdequacyReviewFromObject({
      source_runtime: runtime,
      source_diagnostics_sufficiency_evidence: sourceDiagnosticsSufficiencyEvidence
    });
  const validation = validateContributionAlignmentInternalDiagnosticsModelAdequacyReview(
    review,
    { sourceRuntime: runtime, sourceDiagnosticsSufficiencyEvidence }
  );

  assert.equal(review.review_state, "HOLD_FOR_INTERNAL_DIAGNOSTICS_MODEL_ADEQUACY_SOURCE");
  assert.equal(review.model_diagnostics.calibration_backtest_satisfied, false);
  assert.equal(review.promotion_review.promotion_authorized, false);
  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /calibration_backtest|sufficiency evidence/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("internal diagnostics and model adequacy review rejects unsafe wrapper side doors without echo", () => {
  const runtime = sourceRuntime();
  const review = buildContributionAlignmentInternalDiagnosticsModelAdequacyReviewFromObject({
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
  const validation = validateContributionAlignmentInternalDiagnosticsModelAdequacyReview(review);
  const serialized = `${JSON.stringify(review)} ${JSON.stringify(validation)}`;

  assert.equal(review.review_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
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

test("internal diagnostics and model adequacy review holds when required diagnostics fields are missing", () => {
  const runtime = sourceRuntime();
  delete runtime.internal_fit_artifact.convergence_diagnostics_present;
  runtime.runtime_hash = contributionAlignmentInternalBayesianExecutionRuntimeHash(runtime);

  const review =
    buildContributionAlignmentInternalDiagnosticsModelAdequacyReviewFromObject(runtime);
  const validation = validateContributionAlignmentInternalDiagnosticsModelAdequacyReview(
    review,
    { sourceRuntime: runtime }
  );

  assert.equal(review.review_state, "HOLD_FOR_INTERNAL_DIAGNOSTICS_MODEL_ADEQUACY_SOURCE");
  assert.equal(review.source_bound, false);
  assert.equal(review.review_policy.promotion_authorized, false);
  assert.equal(review.promotion_review.promotion_blocked, true);
  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /diagnostics|sourceRuntime|runtime/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("internal diagnostics and model adequacy review holds when source runtime has suppressed windows", () => {
  const runtime = sourceRuntime();
  runtime.aggregate_design_matrix.suppressed_window_count = 1;
  runtime.runtime_hash = contributionAlignmentInternalBayesianExecutionRuntimeHash(runtime);

  const review =
    buildContributionAlignmentInternalDiagnosticsModelAdequacyReviewFromObject(runtime);
  const validation = validateContributionAlignmentInternalDiagnosticsModelAdequacyReview(
    review,
    { sourceRuntime: runtime }
  );

  assert.equal(review.review_state, "HOLD_FOR_INTERNAL_DIAGNOSTICS_MODEL_ADEQUACY_SOURCE");
  assert.equal(review.source_bound, false);
  assert.equal(review.review_policy.promotion_authorized, false);
  assert.equal(review.promotion_review.promotion_blocked, true);
  assert.equal(review.feeds.bayesian_promotion_decision_gate, false);
  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /suppressed|sourceRuntime|runtime/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("internal diagnostics and model adequacy review rejects forged source runtime side doors after rehash", () => {
  const runtime = sourceRuntime();
  runtime.raw_rows = [{ email: "person@example.com" }];
  runtime.query_text = "SELECT user_id FROM raw_rows";
  runtime.runtime_hash = contributionAlignmentInternalBayesianExecutionRuntimeHash(runtime);

  const review =
    buildContributionAlignmentInternalDiagnosticsModelAdequacyReviewFromObject(runtime);
  const validation = validateContributionAlignmentInternalDiagnosticsModelAdequacyReview(
    review,
    { sourceRuntime: runtime }
  );
  const serialized = `${JSON.stringify(review)} ${JSON.stringify(validation)}`;

  assert.equal(review.review_state, "HOLD_FOR_INTERNAL_DIAGNOSTICS_MODEL_ADEQUACY_SOURCE");
  assert.equal(review.source_bound, false);
  assert.equal(review.review_policy.promotion_authorized, false);
  assert.equal(review.promotion_review.promotion_blocked, true);
  assert.equal(validation.valid, false);
  for (const unsafe of ["person@example.com", "SELECT user_id"]) {
    assert.equal(serialized.includes(unsafe), false, `${unsafe} must not echo`);
  }
});

test("internal diagnostics and model adequacy review holds on forged satisfied diagnostics after rehash", () => {
  const runtime = sourceRuntime();
  runtime.internal_fit_artifact.convergence_diagnostics_present = true;
  runtime.internal_fit_artifact.posterior_predictive_checks_present = true;
  runtime.internal_fit_artifact.prior_sensitivity_present = true;
  runtime.internal_fit_artifact.residual_fit_checks_present = true;
  runtime.internal_fit_artifact.comparison_design_adequacy_review_present = true;
  runtime.internal_fit_artifact.calibration_evidence_present = true;
  runtime.internal_fit_artifact.artifact_hash = rehashArtifact(runtime.internal_fit_artifact);
  runtime.runtime_hash = contributionAlignmentInternalBayesianExecutionRuntimeHash(runtime);

  const review =
    buildContributionAlignmentInternalDiagnosticsModelAdequacyReviewFromObject(runtime);
  const validation = validateContributionAlignmentInternalDiagnosticsModelAdequacyReview(
    review,
    { sourceRuntime: runtime }
  );

  assert.equal(review.review_state, "HOLD_FOR_INTERNAL_DIAGNOSTICS_MODEL_ADEQUACY_SOURCE");
  assert.equal(review.source_bound, false);
  assert.equal(review.review_policy.promotion_authorized, false);
  assert.equal(review.promotion_review.promotion_blocked, true);
  assert.equal(review.feeds.bayesian_promotion_decision_gate, false);
  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /diagnostics|runtime|sourceRuntime/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("internal diagnostics and model adequacy review validation rejects forged interpretation after rehash", () => {
  const runtime = sourceRuntime();
  const review =
    buildContributionAlignmentInternalDiagnosticsModelAdequacyReviewFromObject(runtime);
  review.review_policy.posterior_interpretation_authorized = true;
  review.review_policy.promotion_authorized = true;
  review.feeds.posterior_interpretation = true;
  review.allowed_next_step = "internal_posterior_interpretation_specification_only";
  review.review_hash = contributionAlignmentInternalDiagnosticsModelAdequacyReviewHash(review);

  const validation = validateContributionAlignmentInternalDiagnosticsModelAdequacyReview(
    review,
    {
      sourceRuntime: runtime,
      expectedReview: buildContributionAlignmentInternalDiagnosticsModelAdequacyReviewFromObject(
        runtime
      )
    }
  );

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /interpretation|promotion|feed|allowed_next_step|review/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("internal diagnostics and model adequacy review validation rejects forged weight confidence posture", () => {
  const runtime = sourceRuntime();
  const review =
    buildContributionAlignmentInternalDiagnosticsModelAdequacyReviewFromObject(runtime);
  review.boundary_checks.feature_weights_structural_internal_only = false;
  review.boundary_checks.feature_weights_not_confidence_scores = false;
  review.feeds.weighted_internal_model_output = true;
  review.review_hash = contributionAlignmentInternalDiagnosticsModelAdequacyReviewHash(review);

  const validation = validateContributionAlignmentInternalDiagnosticsModelAdequacyReview(
    review,
    {
      sourceRuntime: runtime,
      expectedReview: buildContributionAlignmentInternalDiagnosticsModelAdequacyReviewFromObject(
        runtime
      )
    }
  );

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /feature_weights|weighted|confidence|feed|review/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("internal diagnostics and model adequacy review validation requires source runtime for completed records", () => {
  const runtime = sourceRuntime();
  const review =
    buildContributionAlignmentInternalDiagnosticsModelAdequacyReviewFromObject(runtime);
  const validation = validateContributionAlignmentInternalDiagnosticsModelAdequacyReview(review);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /sourceRuntime|required/.test(gap)),
    validation.gaps.join("; ")
  );
});
