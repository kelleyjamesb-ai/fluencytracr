import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
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
  buildContributionAlignmentPosteriorOutputReviewGateFromObject,
  contributionAlignmentPosteriorOutputReviewGateHash,
  validateContributionAlignmentPosteriorOutputReviewGate
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

let cachedRuntimeSource = null;

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
  if (cachedRuntimeSource) return JSON.parse(JSON.stringify(cachedRuntimeSource.source_runtime));
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
  return JSON.parse(JSON.stringify(cachedRuntimeSource.source_runtime));
}

function sourceRuntimeSource() {
  if (!cachedRuntimeSource) sourceRuntime();
  return JSON.parse(JSON.stringify(cachedRuntimeSource));
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

test("posterior output review gate contains fixture artifact without authorizing interpretation", () => {
  const runtime = sourceRuntime();
  const review = buildContributionAlignmentPosteriorOutputReviewGateFromObject(
    sourceRuntimeEnvelope()
  );
  const validation = validateContributionAlignmentPosteriorOutputReviewGate(review, {
    ...sourceRuntimeValidationOptions(),
    expectedReview: review
  });

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(
    review.review_state,
    "POSTERIOR_ARTIFACT_CONTAINMENT_REVIEW_PASSED"
  );
  assert.equal(review.review_class, "artifact_containment_only");
  assert.equal(review.source_bound, true);
  assert.equal(review.review_version, "posterior_output_review_gate_2026_06");
  assert.equal(review.review_policy.internal_only, true);
  assert.equal(review.review_policy.review_gate_only, true);
  assert.equal(review.review_policy.internal_interpretation_specification_authorized, false);
  assert.equal(review.review_policy.posterior_output_authorized, false);
  assert.equal(review.review_policy.confidence_output_authorized, false);
  assert.equal(review.review_policy.probability_output_authorized, false);
  assert.equal(review.review_policy.customer_output_authorized, false);
  assert.equal(review.review_checks.runtime_source_bound, true);
  assert.equal(review.review_checks.aggregate_only_runtime, true);
  assert.equal(review.review_checks.internal_fit_artifact_hash_bound, true);
  assert.equal(review.review_checks.posterior_candidate_held_for_review, true);
  assert.equal(review.review_checks.no_probability_value_present, true);
  assert.equal(review.review_checks.no_confidence_language_present, true);
  assert.equal(review.review_checks.no_customer_output_present, true);
  assert.equal(review.review_checks.diagnostics_missing_require_adequacy_review, true);
  assert.equal(review.review_checks.interpretation_specification_blocked, true);
  assert.equal(review.reviewed_fit_artifact_ref.artifact_state, "INTERNAL_POSTERIOR_CANDIDATE_HELD_FOR_OUTPUT_REVIEW");
  assert.equal(review.reviewed_fit_artifact_ref.artifact_hash, runtime.internal_fit_artifact.artifact_hash);
  assert.equal(Object.hasOwn(review.reviewed_fit_artifact_ref, "posterior_mean_internal"), false);
  assert.equal(Object.hasOwn(review.reviewed_fit_artifact_ref, "posterior_sd_internal"), false);
  assert.equal(review.reviewed_fit_artifact_ref.numeric_posterior_values_withheld, true);
  assert.equal(review.reviewed_fit_artifact_ref.output_value_present, false);
  assert.equal(review.allowed_next_step, "internal_diagnostics_and_model_adequacy_review_only");
  assert.equal(review.feeds.internal_diagnostics_and_model_adequacy_review, true);
  for (const feed of FALSE_FEEDS) {
    assert.equal(review.feeds[feed], false, `${feed} must remain false`);
  }
});

test("posterior output review gate rejects unsafe wrapper side doors without echo", () => {
  const runtime = sourceRuntime();
  const review = buildContributionAlignmentPosteriorOutputReviewGateFromObject({
    source_runtime: runtime,
    confidence_output: "high",
    probability_output: 0.91,
    posterior_output: "approved",
    customer_facing_output: "ready",
    query_text: "SELECT user_id FROM raw_rows",
    raw_rows: [{ email: "person@example.com" }]
  });
  const validation = validateContributionAlignmentPosteriorOutputReviewGate(review);
  const serialized = `${JSON.stringify(review)} ${JSON.stringify(validation)}`;

  assert.equal(review.review_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validation.valid, false);
  for (const unsafe of [
    "person@example.com",
    "SELECT user_id",
    "confidence_output",
    "probability_output",
    "approved",
    "customer_facing_output"
  ]) {
    assert.equal(serialized.includes(unsafe), false, `${unsafe} must not echo`);
  }
});

test("posterior output review gate rejects unsafe nested runtime envelope sidecars", () => {
  const review = buildContributionAlignmentPosteriorOutputReviewGateFromObject({
    source_runtime: {
      ...sourceRuntimeSource(),
      raw_rows: [{ email: "person@example.com" }],
      query_text: "SELECT user_id FROM raw_rows",
      user_id: "person-123"
    }
  });
  const validation = validateContributionAlignmentPosteriorOutputReviewGate(review);
  const serialized = `${JSON.stringify(review)} ${JSON.stringify(validation)}`;

  assert.equal(review.review_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validation.valid, false);
  for (const unsafe of ["person@example.com", "SELECT user_id", "person-123"]) {
    assert.equal(serialized.includes(unsafe), false, `${unsafe} must not echo`);
  }
});

test("posterior output review gate holds on runtime drift", () => {
  const runtime = sourceRuntime();
  runtime.feeds.posterior_output_review_gate = false;
  runtime.runtime_hash =
    "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

  const review = buildContributionAlignmentPosteriorOutputReviewGateFromObject(runtime);
  const validation = validateContributionAlignmentPosteriorOutputReviewGate(review, {
    sourceRuntime: runtime
  });

  assert.equal(review.review_state, "HOLD_FOR_INTERNAL_BAYESIAN_EXECUTION_RUNTIME");
  assert.equal(review.source_bound, false);
  assert.equal(review.review_policy.internal_interpretation_specification_authorized, false);
  assert.equal(review.reviewed_fit_artifact_ref.artifact_hash, null);
  assert.equal(validation.valid, false);
});

test("posterior output review gate rejects forged source runtime side doors after rehash", () => {
  const runtime = sourceRuntime();
  runtime.raw_rows = [{ email: "person@example.com" }];
  runtime.query_text = "SELECT user_id FROM raw_rows";
  runtime.runtime_hash = contributionAlignmentInternalBayesianExecutionRuntimeHash(runtime);

  const review = buildContributionAlignmentPosteriorOutputReviewGateFromObject(runtime);
  const validation = validateContributionAlignmentPosteriorOutputReviewGate(review, {
    sourceRuntime: runtime
  });
  const serialized = `${JSON.stringify(review)} ${JSON.stringify(validation)}`;

  assert.equal(review.review_state, "HOLD_FOR_INTERNAL_BAYESIAN_EXECUTION_RUNTIME");
  assert.equal(review.source_bound, false);
  assert.equal(validation.valid, false);
  for (const unsafe of ["person@example.com", "SELECT user_id"]) {
    assert.equal(serialized.includes(unsafe), false, `${unsafe} must not echo`);
  }
});

test("posterior output review gate validation rejects forged confidence after rehash", () => {
  const runtime = sourceRuntime();
  const review = buildContributionAlignmentPosteriorOutputReviewGateFromObject(runtime);
  review.review_policy.confidence_output_authorized = true;
  review.feeds.confidence_output = true;
  review.review_hash = contributionAlignmentPosteriorOutputReviewGateHash(review);

  const validation = validateContributionAlignmentPosteriorOutputReviewGate(review, {
    sourceRuntime: runtime,
    expectedReview: buildContributionAlignmentPosteriorOutputReviewGateFromObject(runtime)
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /confidence|output|sourceRuntime|review/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("posterior output review gate validation requires source runtime for passed records", () => {
  const review = buildContributionAlignmentPosteriorOutputReviewGateFromObject(
    sourceRuntimeEnvelope()
  );
  const validation = validateContributionAlignmentPosteriorOutputReviewGate(review);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /sourceRuntime|required/.test(gap)),
    validation.gaps.join("; ")
  );
});

test("posterior output review gate validation rejects forged interpretation feed after rehash", () => {
  const runtime = sourceRuntime();
  const review = buildContributionAlignmentPosteriorOutputReviewGateFromObject(runtime);
  review.review_policy.internal_interpretation_specification_authorized = true;
  review.feeds.internal_posterior_interpretation_specification = true;
  review.allowed_next_step = "internal_posterior_interpretation_specification_only";
  review.review_hash = contributionAlignmentPosteriorOutputReviewGateHash(review);

  const validation = validateContributionAlignmentPosteriorOutputReviewGate(review, {
    sourceRuntime: runtime,
    expectedReview: buildContributionAlignmentPosteriorOutputReviewGateFromObject(runtime)
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /interpretation|allowed_next_step|feed|review/.test(gap)),
    validation.gaps.join("; ")
  );
});
