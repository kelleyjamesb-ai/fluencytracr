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
  buildContributionAlignmentInternalBayesianReadinessReviewFromObject,
  contributionAlignmentInternalBayesianReadinessReviewHash,
  validateContributionAlignmentInternalBayesianReadinessReview
} from "./run_ai_value_contribution_alignment_internal_bayesian_readiness_review.mjs";

const FIXTURE_PATH =
  "docs/contracts/ai-value-real-data-intake-packet-runner/examples/controlled-aggregate-fixture-review-ready.json";
const PACKET_PATH =
  "docs/contracts/ai-value-research-promotion-readiness-packet/examples/current-controlled-pilot-research-promotion-readiness-packet.json";
const RESEARCH_DESIGN_PATH =
  "docs/research/AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_RESEARCH_DESIGN.md";

const EXPECTED_FEATURES = [
  "hypothesis_binding",
  "source_coverage",
  "milestone_continuity",
  "ai_fluency_construct_context_integrity",
  "psychological_context_integrity",
  "observed_vbd_alignment",
  "selected_metric_movement",
  "comparison_design_strength",
  "assumption_governance",
  "boundary_clearance"
];

const FALSE_FEEDS = [
  "bayesian_execution",
  "bayesian_model_output",
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

let cachedChain = null;

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

function readinessChain() {
  if (cachedChain) return JSON.parse(JSON.stringify(cachedChain));
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
  cachedChain = {
    sourceFeatureStabilityReview,
    sourceWeightDecision,
    sourceWeightObject,
    sourceFrame
  };
  return JSON.parse(JSON.stringify(cachedChain));
}

test("internal Bayesian readiness review authorizes only model specification", () => {
  const chain = readinessChain();
  const review = buildContributionAlignmentInternalBayesianReadinessReviewFromObject(
    chain.sourceFrame,
    {
      sourceWeightObject: chain.sourceWeightObject,
      sourceWeightDecision: chain.sourceWeightDecision,
      sourceFeatureStabilityReview: chain.sourceFeatureStabilityReview
    }
  );
  const validation = validateContributionAlignmentInternalBayesianReadinessReview(review, {
    sourceFrame: chain.sourceFrame,
    sourceWeightObject: chain.sourceWeightObject,
    expectedReview: review
  });

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(
    review.review_state,
    "INTERNAL_BAYESIAN_READINESS_REVIEW_PASSED_FOR_MODEL_SPECIFICATION"
  );
  assert.equal(review.source_bound, true);
  assert.equal(review.review_version, "internal_bayesian_readiness_review_2026_06");
  assert.equal(
    review.candidate_model_family,
    "bayesian_hierarchical_difference_in_differences_candidate"
  );
  assert.equal(review.review_policy.internal_only, true);
  assert.equal(review.review_policy.model_specification_authorized, true);
  assert.equal(review.review_policy.bayesian_execution_authorized, false);
  assert.equal(review.review_policy.posterior_output_authorized, false);
  assert.equal(review.review_policy.confidence_output_authorized, false);
  assert.equal(review.review_policy.probability_output_authorized, false);
  assert.equal(review.review_policy.customer_output_authorized, false);
  assert.equal(review.readiness_checks.weighted_frame_source_bound, true);
  assert.equal(review.readiness_checks.weighted_composition_present, true);
  assert.equal(review.readiness_checks.weights_sum_to_one, true);
  assert.equal(review.readiness_checks.repeated_milestone_context_required, true);
  assert.equal(review.readiness_checks.no_score_or_output_present, true);
  assert.deepEqual(
    review.reviewed_feature_weights.map((feature) => feature.feature_id),
    EXPECTED_FEATURES
  );
  for (const feature of review.reviewed_feature_weights) {
    assert.equal(feature.weight, 0.1);
    assert.equal(feature.source_bound, true);
    assert.equal(feature.readiness_role, "eligible_for_later_model_specification");
    assert.equal(feature.output_value_present, false);
  }
  assert.equal(review.feeds.bayesian_model_specification, true);
  for (const feed of FALSE_FEEDS) {
    assert.equal(review.feeds[feed], false, `${feed} must remain false`);
  }
});

test("internal Bayesian readiness review rejects unsafe wrapper side doors without echo", () => {
  const chain = readinessChain();
  const review = buildContributionAlignmentInternalBayesianReadinessReviewFromObject({
    source_frame: chain.sourceFrame,
    posterior_probability: 0.82,
    confidence_output: "high",
    query_text: "SELECT user_id FROM raw_rows",
    raw_rows: [{ email: "person@example.com" }],
    customer_facing_output: "ready"
  });
  const validation = validateContributionAlignmentInternalBayesianReadinessReview(review);
  const serialized = `${JSON.stringify(review)} ${JSON.stringify(validation)}`;

  assert.equal(review.review_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validation.valid, false);
  for (const unsafe of [
    "person@example.com",
    "SELECT user_id",
    "posterior_probability",
    "confidence_output",
    "customer_facing_output"
  ]) {
    assert.equal(serialized.includes(unsafe), false, `${unsafe} must not echo`);
  }
});

test("internal Bayesian readiness review holds on weighted frame drift", () => {
  const chain = readinessChain();
  chain.sourceFrame.feeds.internal_bayesian_readiness_review = false;
  chain.sourceFrame.frame_hash =
    "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

  const review = buildContributionAlignmentInternalBayesianReadinessReviewFromObject(
    chain.sourceFrame,
    { sourceWeightObject: chain.sourceWeightObject }
  );
  const validation = validateContributionAlignmentInternalBayesianReadinessReview(review, {
    sourceFrame: chain.sourceFrame,
    sourceWeightObject: chain.sourceWeightObject
  });

  assert.equal(review.review_state, "HOLD_FOR_WEIGHTED_INTERNAL_MODEL_FRAME");
  assert.equal(review.source_bound, false);
  assert.equal(review.reviewed_feature_weights.length, 0);
  assert.equal(review.review_policy.model_specification_authorized, false);
  assert.equal(validation.valid, false);
});

test("internal Bayesian readiness review validation rejects forged execution after rehash", () => {
  const chain = readinessChain();
  const review = buildContributionAlignmentInternalBayesianReadinessReviewFromObject(
    chain.sourceFrame,
    { sourceWeightObject: chain.sourceWeightObject }
  );
  review.review_policy.bayesian_execution_authorized = true;
  review.feeds.bayesian_execution = true;
  review.review_hash = contributionAlignmentInternalBayesianReadinessReviewHash(review);

  const validation = validateContributionAlignmentInternalBayesianReadinessReview(review, {
    sourceFrame: chain.sourceFrame,
    sourceWeightObject: chain.sourceWeightObject,
    expectedReview: buildContributionAlignmentInternalBayesianReadinessReviewFromObject(
      chain.sourceFrame,
      { sourceWeightObject: chain.sourceWeightObject }
    )
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /execution|sourceFrame|Bayesian|bayesian/.test(gap)),
    validation.gaps.join("; ")
  );
});
