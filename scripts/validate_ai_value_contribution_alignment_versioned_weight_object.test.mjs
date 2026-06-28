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
  buildContributionAlignmentVersionedWeightObjectFromObject,
  contributionAlignmentVersionedWeightObjectHash,
  validateContributionAlignmentVersionedWeightObject
} from "./run_ai_value_contribution_alignment_versioned_weight_object.mjs";

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
  "weighted_internal_model_output",
  "research_model_feed",
  "model_output",
  "confidence_output",
  "probability_output",
  "bayesian_execution",
  "score_like_output",
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

let cachedDecision = null;

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

function weightDecisionChain() {
  if (cachedDecision) return JSON.parse(JSON.stringify(cachedDecision));
  const sourceFeatureStabilityReview =
    buildContributionAlignmentFeatureStabilityReviewFromObject(sourceDataModel());
  const sourceWeightDecision =
    buildContributionAlignmentInternalNumericWeightDecisionFromObject(
      sourceFeatureStabilityReview
    );
  cachedDecision = { sourceFeatureStabilityReview, sourceWeightDecision };
  return JSON.parse(JSON.stringify(cachedDecision));
}

test("versioned weight object emits neutral internal structural weights only", () => {
  const chain = weightDecisionChain();
  const weightObject = buildContributionAlignmentVersionedWeightObjectFromObject(
    chain.sourceWeightDecision,
    { sourceFeatureStabilityReview: chain.sourceFeatureStabilityReview }
  );
  const validation = validateContributionAlignmentVersionedWeightObject(weightObject, {
    sourceWeightDecision: chain.sourceWeightDecision,
    sourceFeatureStabilityReview: chain.sourceFeatureStabilityReview,
    expectedWeightObject: weightObject
  });

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(weightObject.weight_object_state, "VERSIONED_INTERNAL_WEIGHT_OBJECT_READY");
  assert.equal(weightObject.source_bound, true);
  assert.equal(weightObject.weight_version, "internal_structural_equal_weights_2026_06");
  assert.equal(
    weightObject.calibration_state,
    "initial_internal_structural_weights_not_empirical_confidence"
  );
  assert.equal(weightObject.weight_policy.weights_sum_to_one, true);
  assert.equal(weightObject.weight_policy.weighted_model_output_authorized, false);
  assert.equal(weightObject.weight_policy.bayesian_execution_authorized, false);
  assert.deepEqual(weightObject.weights.map((weight) => weight.feature_id), EXPECTED_FEATURES);
  assert.equal(
    Number(weightObject.weights.reduce((sum, weight) => sum + weight.weight, 0).toFixed(6)),
    1
  );
  for (const weight of weightObject.weights) {
    assert.equal(weight.weight, 0.1);
    assert.equal(weight.source_bound, true);
    assert.equal(weight.rationale, "neutral_initial_structural_weight");
  }
  assert.equal(weightObject.feeds.weighted_internal_model_frame, true);
  for (const feed of FALSE_FEEDS) {
    assert.equal(weightObject.feeds[feed], false, `${feed} must remain false`);
  }
});

test("versioned weight object rejects unsafe wrapper side doors without echo", () => {
  const chain = weightDecisionChain();
  const weightObject = buildContributionAlignmentVersionedWeightObjectFromObject({
    source_weight_decision: chain.sourceWeightDecision,
    source_feature_stability_review: chain.sourceFeatureStabilityReview,
    posterior_probability: 0.82,
    query_text: "SELECT user_id FROM raw_rows",
    raw_rows: [{ email: "person@example.com" }],
    customer_facing_output: "ready"
  });
  const validation = validateContributionAlignmentVersionedWeightObject(weightObject);
  const serialized = `${JSON.stringify(weightObject)} ${JSON.stringify(validation)}`;

  assert.equal(weightObject.weight_object_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validation.valid, false);
  for (const unsafe of [
    "person@example.com",
    "SELECT user_id",
    "posterior_probability",
    "customer_facing_output"
  ]) {
    assert.equal(serialized.includes(unsafe), false, `${unsafe} must not echo`);
  }
});

test("versioned weight object holds on weight decision drift", () => {
  const chain = weightDecisionChain();
  chain.sourceWeightDecision.weight_decision_scope.versioned_weight_object_authorized = false;
  chain.sourceWeightDecision.decision_hash =
    "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";

  const weightObject = buildContributionAlignmentVersionedWeightObjectFromObject(
    chain.sourceWeightDecision,
    { sourceFeatureStabilityReview: chain.sourceFeatureStabilityReview }
  );
  const validation = validateContributionAlignmentVersionedWeightObject(weightObject, {
    sourceWeightDecision: chain.sourceWeightDecision,
    sourceFeatureStabilityReview: chain.sourceFeatureStabilityReview
  });

  assert.equal(weightObject.weight_object_state, "HOLD_FOR_INTERNAL_NUMERIC_WEIGHT_DECISION");
  assert.equal(weightObject.source_bound, false);
  assert.equal(weightObject.weights.length, 0);
  assert.equal(validation.valid, false);
});

test("versioned weight object validation rejects forged weights after rehash", () => {
  const chain = weightDecisionChain();
  const weightObject = buildContributionAlignmentVersionedWeightObjectFromObject(
    chain.sourceWeightDecision,
    { sourceFeatureStabilityReview: chain.sourceFeatureStabilityReview }
  );
  weightObject.weights[0].weight = 0.25;
  weightObject.weights[1].weight = 0.25;
  weightObject.weight_policy.weights_sum_to_one = false;
  weightObject.weight_object_hash = contributionAlignmentVersionedWeightObjectHash(weightObject);

  const validation = validateContributionAlignmentVersionedWeightObject(weightObject, {
    sourceWeightDecision: chain.sourceWeightDecision,
    sourceFeatureStabilityReview: chain.sourceFeatureStabilityReview,
    expectedWeightObject: buildContributionAlignmentVersionedWeightObjectFromObject(
      chain.sourceWeightDecision,
      { sourceFeatureStabilityReview: chain.sourceFeatureStabilityReview }
    )
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /weights|sourceWeightDecision|sum/.test(gap)),
    validation.gaps.join("; ")
  );
});
