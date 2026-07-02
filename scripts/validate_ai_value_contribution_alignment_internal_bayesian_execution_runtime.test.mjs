import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
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
  contributionAlignmentInternalBayesianExecutionRuntimeHash,
  validateContributionAlignmentInternalBayesianExecutionRuntime
} from "./run_ai_value_contribution_alignment_internal_bayesian_execution_runtime.mjs";

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
  "posterior_output_review_gate",
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

const REQUIRED_DIAGNOSTIC_INSUFFICIENCY_FIELDS = [
  "convergence_diagnostics_present",
  "posterior_predictive_checks_present",
  "prior_sensitivity_present",
  "residual_fit_checks_present",
  "comparison_design_adequacy_review_present",
  "calibration_evidence_present",
  "interpretation_ready"
];

let cachedGateChain = null;

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

function runtimeGateChain() {
  if (cachedGateChain) return JSON.parse(JSON.stringify(cachedGateChain));
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
  cachedGateChain = {
    sourceGate,
    sourceSpecification
  };
  return JSON.parse(JSON.stringify(cachedGateChain));
}

test("internal Bayesian execution runtime contains aggregate-only DiD candidate as fixture prototype", () => {
  const chain = runtimeGateChain();
  const runtime = buildContributionAlignmentInternalBayesianExecutionRuntimeFromObject({
    source_gate: chain.sourceGate,
    aggregate_measurement_cell_windows: AGGREGATE_WINDOWS
  });
  const validation = validateContributionAlignmentInternalBayesianExecutionRuntime(runtime, {
    sourceGate: chain.sourceGate,
    aggregateMeasurementCellWindows: AGGREGATE_WINDOWS
  });

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(
    runtime.runtime_state,
    "INTERNAL_BAYESIAN_FIXTURE_EXECUTION_PROTOTYPE_HELD_FOR_REVIEW"
  );
  assert.equal(runtime.runtime_execution_class, "internal_fixture_prototype_only");
  assert.equal(runtime.source_bound, true);
  assert.equal(runtime.runtime_version, "internal_bayesian_execution_runtime_2026_06");
  assert.equal(runtime.runtime_policy.internal_only, true);
  assert.equal(runtime.runtime_policy.aggregate_only_runtime, true);
  assert.equal(runtime.runtime_policy.internal_execution_performed, true);
  assert.equal(runtime.runtime_policy.posterior_output_review_gate_authorized, false);
  assert.equal(runtime.runtime_policy.confidence_output_authorized, false);
  assert.equal(runtime.runtime_policy.probability_output_authorized, false);
  assert.equal(runtime.runtime_policy.customer_output_authorized, false);
  assert.equal(runtime.model_equation.family, "bayesian_hierarchical_difference_in_differences");
  assert.equal(runtime.model_equation.estimand_parameter, "delta_ai_post");
  assert.equal(
    runtime.model_equation.linear_predictor,
    "mu_cell_window = alpha + alpha_cell + beta_post + beta_ai_exposed + delta_ai_post + weighted_covariate_terms"
  );
  assert.equal(runtime.aggregate_design_matrix.window_count, 4);
  assert.equal(runtime.aggregate_design_matrix.missing_window_count, 0);
  assert.equal(runtime.aggregate_design_matrix.suppressed_window_count, 0);
  assert.equal(runtime.aggregate_design_matrix.held_window_count, 0);
  assert.equal(runtime.aggregate_design_matrix.raw_row_count, 0);
  assert.equal(runtime.aggregate_design_matrix.identifier_count, 0);
  assert.equal(runtime.internal_fit_artifact.did_observed_estimate, 2);
  assert.equal(runtime.internal_fit_artifact.did_standard_error, 0.905539);
  assert.equal(runtime.internal_fit_artifact.posterior_mean_internal, 1.098901);
  assert.equal(runtime.internal_fit_artifact.posterior_sd_internal, 0.67123);
  for (const field of REQUIRED_DIAGNOSTIC_INSUFFICIENCY_FIELDS) {
    assert.equal(runtime.internal_fit_artifact[field], false, `${field} must remain false`);
  }
  assert.equal(runtime.internal_fit_artifact.probability_value_present, false);
  assert.equal(runtime.internal_fit_artifact.confidence_language_present, false);
  assert.equal(runtime.internal_fit_artifact.customer_output_present, false);
  assert.equal(runtime.allowed_next_step, "internal_diagnostics_and_model_adequacy_review_only");
  assert.equal(runtime.feeds.internal_diagnostics_and_model_adequacy_review, true);
  assert.equal(Object.hasOwn(runtime, "posterior_mean_internal"), false);
  assert.equal(Object.hasOwn(runtime, "posterior_sd_internal"), false);
  for (const feed of FALSE_FEEDS) {
    assert.equal(runtime.feeds[feed], false, `${feed} must remain false`);
  }
});

test("internal Bayesian execution runtime rejects unsafe wrapper side doors without echo", () => {
  const chain = runtimeGateChain();
  const runtime = buildContributionAlignmentInternalBayesianExecutionRuntimeFromObject({
    source_gate: chain.sourceGate,
    aggregate_measurement_cell_windows: AGGREGATE_WINDOWS,
    raw_rows: [{ email: "person@example.com" }],
    query_text: "SELECT user_id FROM raw_rows",
    probability_output: 0.91,
    confidence_output: "high",
    customer_facing_output: "ready"
  });
  const validation = validateContributionAlignmentInternalBayesianExecutionRuntime(runtime);
  const serialized = `${JSON.stringify(runtime)} ${JSON.stringify(validation)}`;

  assert.equal(runtime.runtime_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validation.valid, false);
  for (const unsafe of [
    "person@example.com",
    "SELECT user_id",
    "probability_output",
    "confidence_output",
    "customer_facing_output"
  ]) {
    assert.equal(serialized.includes(unsafe), false, `${unsafe} must not echo`);
  }
});

test("internal Bayesian execution runtime holds on execution gate drift", () => {
  const chain = runtimeGateChain();
  chain.sourceGate.feeds.internal_bayesian_execution_runtime = false;
  chain.sourceGate.gate_hash =
    "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";

  const runtime = buildContributionAlignmentInternalBayesianExecutionRuntimeFromObject({
    source_gate: chain.sourceGate,
    aggregate_measurement_cell_windows: AGGREGATE_WINDOWS
  });
  const validation = validateContributionAlignmentInternalBayesianExecutionRuntime(runtime, {
    sourceGate: chain.sourceGate
  });

  assert.equal(runtime.runtime_state, "HOLD_FOR_INTERNAL_BAYESIAN_EXECUTION_GATE");
  assert.equal(runtime.source_bound, false);
  assert.equal(runtime.runtime_policy.internal_execution_performed, false);
  assert.equal(runtime.internal_fit_artifact, null);
  assert.equal(validation.valid, false);
});

test("internal Bayesian execution runtime validation rejects forged probability after rehash", () => {
  const chain = runtimeGateChain();
  const runtime = buildContributionAlignmentInternalBayesianExecutionRuntimeFromObject({
    source_gate: chain.sourceGate,
    aggregate_measurement_cell_windows: AGGREGATE_WINDOWS
  });
  runtime.internal_fit_artifact.probability_value_present = true;
  runtime.feeds.probability_output = true;
  runtime.runtime_hash = contributionAlignmentInternalBayesianExecutionRuntimeHash(runtime);

  const validation = validateContributionAlignmentInternalBayesianExecutionRuntime(runtime, {
    sourceGate: chain.sourceGate,
    aggregateMeasurementCellWindows: AGGREGATE_WINDOWS
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /probability|output|sourceGate|runtime/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("internal Bayesian execution runtime validation requires source gate for ready records unless self-contained fallback is explicit", () => {
  const chain = runtimeGateChain();
  const runtime = buildContributionAlignmentInternalBayesianExecutionRuntimeFromObject({
    source_gate: chain.sourceGate,
    aggregate_measurement_cell_windows: AGGREGATE_WINDOWS
  });
  const strictValidation = validateContributionAlignmentInternalBayesianExecutionRuntime(runtime);
  const selfContainedValidation = validateContributionAlignmentInternalBayesianExecutionRuntime(runtime, {
    allowSelfContainedSourceValidation: true
  });

  assert.equal(strictValidation.valid, false);
  assert.ok(
    strictValidation.gaps.some((gap) => /sourceGate|required/.test(gap)),
    strictValidation.gaps.join("; ")
  );
  assert.equal(selfContainedValidation.valid, true, selfContainedValidation.gaps.join("; "));
});

test("internal Bayesian execution runtime validation requires deterministic rebuild source for ready records", () => {
  const chain = runtimeGateChain();
  const runtime = buildContributionAlignmentInternalBayesianExecutionRuntimeFromObject({
    source_gate: chain.sourceGate,
    aggregate_measurement_cell_windows: AGGREGATE_WINDOWS
  });
  const validation = validateContributionAlignmentInternalBayesianExecutionRuntime(runtime, {
    sourceGate: chain.sourceGate
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /aggregateMeasurementCellWindows/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("internal Bayesian execution runtime validation rejects legacy aggregateWindows alias", () => {
  const chain = runtimeGateChain();
  const runtime = buildContributionAlignmentInternalBayesianExecutionRuntimeFromObject({
    source_gate: chain.sourceGate,
    aggregate_measurement_cell_windows: AGGREGATE_WINDOWS
  });
  const validation = validateContributionAlignmentInternalBayesianExecutionRuntime(runtime, {
    sourceGate: chain.sourceGate,
    aggregateWindows: AGGREGATE_WINDOWS
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /aggregateMeasurementCellWindows/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("internal Bayesian execution runtime validation accepts source gate plus aggregate windows rebuild", () => {
  const chain = runtimeGateChain();
  const runtime = buildContributionAlignmentInternalBayesianExecutionRuntimeFromObject({
    source_gate: chain.sourceGate,
    aggregate_measurement_cell_windows: AGGREGATE_WINDOWS
  });
  const validation = validateContributionAlignmentInternalBayesianExecutionRuntime(runtime, {
    sourceGate: chain.sourceGate,
    aggregateMeasurementCellWindows: AGGREGATE_WINDOWS
  });

  assert.equal(validation.valid, true, validation.gaps.join("; "));
});

test("internal Bayesian execution runtime validation rejects forged DiD fields after rehash against windows", () => {
  const chain = runtimeGateChain();
  const runtime = buildContributionAlignmentInternalBayesianExecutionRuntimeFromObject({
    source_gate: chain.sourceGate,
    aggregate_measurement_cell_windows: AGGREGATE_WINDOWS
  });
  runtime.internal_fit_artifact.did_observed_estimate = 99;
  runtime.internal_fit_artifact.artifact_hash = "f".repeat(64);
  runtime.runtime_hash = contributionAlignmentInternalBayesianExecutionRuntimeHash(runtime);
  const validation = validateContributionAlignmentInternalBayesianExecutionRuntime(runtime, {
    sourceGate: chain.sourceGate,
    aggregateMeasurementCellWindows: AGGREGATE_WINDOWS
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /artifact_hash|runtime binding mismatch/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("internal Bayesian execution runtime validation rejects forged interpretation readiness", () => {
  const chain = runtimeGateChain();
  const runtime = buildContributionAlignmentInternalBayesianExecutionRuntimeFromObject({
    source_gate: chain.sourceGate,
    aggregate_measurement_cell_windows: AGGREGATE_WINDOWS
  });
  runtime.internal_fit_artifact.convergence_diagnostics_present = true;
  runtime.internal_fit_artifact.posterior_predictive_checks_present = true;
  runtime.internal_fit_artifact.prior_sensitivity_present = true;
  runtime.internal_fit_artifact.comparison_design_adequacy_review_present = true;
  runtime.internal_fit_artifact.calibration_evidence_present = true;
  runtime.internal_fit_artifact.interpretation_ready = true;
  runtime.allowed_next_step = "internal_posterior_interpretation_specification_only";
  runtime.runtime_hash = contributionAlignmentInternalBayesianExecutionRuntimeHash(runtime);

  const validation = validateContributionAlignmentInternalBayesianExecutionRuntime(runtime, {
    sourceGate: chain.sourceGate,
    aggregateMeasurementCellWindows: AGGREGATE_WINDOWS
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /diagnostic|interpretation|allowed_next_step|runtime/.test(gap)),
    validation.gaps.join("; ")
  );
});
