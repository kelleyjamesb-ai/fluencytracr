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
  buildContributionAlignmentWeightedInternalModelFrameFromObject,
  contributionAlignmentWeightedInternalModelFrameHash,
  validateContributionAlignmentWeightedInternalModelFrame
} from "./run_ai_value_contribution_alignment_weighted_internal_model_frame.mjs";

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
  "aggregate_score_output",
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

function frameChain() {
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
  cachedChain = {
    sourceFeatureStabilityReview,
    sourceWeightDecision,
    sourceWeightObject
  };
  return JSON.parse(JSON.stringify(cachedChain));
}

test("weighted internal model frame composes source-bound weights without emitting a score", () => {
  const chain = frameChain();
  const frame = buildContributionAlignmentWeightedInternalModelFrameFromObject(
    chain.sourceWeightObject,
    {
      sourceWeightDecision: chain.sourceWeightDecision,
      sourceFeatureStabilityReview: chain.sourceFeatureStabilityReview
    }
  );
  const validation = validateContributionAlignmentWeightedInternalModelFrame(frame, {
    sourceWeightObject: chain.sourceWeightObject,
    sourceWeightDecision: chain.sourceWeightDecision,
    sourceFeatureStabilityReview: chain.sourceFeatureStabilityReview,
    expectedFrame: frame
  });

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(frame.frame_state, "WEIGHTED_INTERNAL_MODEL_FRAME_READY");
  assert.equal(frame.source_bound, true);
  assert.equal(frame.frame_version, "internal_weighted_feature_composition_frame_2026_06");
  assert.equal(frame.frame_policy.weighted_feature_composition_present, true);
  assert.equal(frame.frame_policy.aggregate_score_output_authorized, false);
  assert.equal(frame.frame_policy.weighted_internal_model_output_authorized, false);
  assert.equal(frame.frame_policy.confidence_output_authorized, false);
  assert.equal(frame.frame_policy.probability_output_authorized, false);
  assert.equal(frame.frame_policy.bayesian_execution_authorized, false);
  assert.equal(frame.frame_policy.customer_output_authorized, false);
  assert.deepEqual(
    frame.feature_weight_composition.map((feature) => feature.feature_id),
    EXPECTED_FEATURES
  );
  assert.equal(
    Number(frame.feature_weight_composition.reduce((sum, feature) => sum + feature.weight, 0).toFixed(6)),
    1
  );
  for (const feature of frame.feature_weight_composition) {
    assert.equal(feature.weight, 0.1);
    assert.equal(feature.source_bound, true);
    assert.equal(feature.frame_role, "internal_weighted_feature_component");
    assert.equal(feature.value_output_present, false);
  }
  assert.equal(frame.feeds.internal_bayesian_readiness_review, true);
  for (const feed of FALSE_FEEDS) {
    assert.equal(frame.feeds[feed], false, `${feed} must remain false`);
  }
});

test("weighted internal model frame rejects unsafe wrapper side doors without echo", () => {
  const chain = frameChain();
  const frame = buildContributionAlignmentWeightedInternalModelFrameFromObject({
    source_weight_object: chain.sourceWeightObject,
    source_weight_decision: chain.sourceWeightDecision,
    source_feature_stability_review: chain.sourceFeatureStabilityReview,
    posterior_probability: 0.82,
    aggregate_score_output: 0.71,
    query_text: "SELECT user_id FROM raw_rows",
    raw_rows: [{ email: "person@example.com" }],
    customer_facing_output: "ready"
  });
  const validation = validateContributionAlignmentWeightedInternalModelFrame(frame);
  const serialized = `${JSON.stringify(frame)} ${JSON.stringify(validation)}`;

  assert.equal(frame.frame_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validation.valid, false);
  for (const unsafe of [
    "person@example.com",
    "SELECT user_id",
    "posterior_probability",
    "aggregate_score_output",
    "customer_facing_output"
  ]) {
    assert.equal(serialized.includes(unsafe), false, `${unsafe} must not echo`);
  }
});

test("weighted internal model frame holds on versioned weight object drift", () => {
  const chain = frameChain();
  chain.sourceWeightObject.weight_policy.weights_sum_to_one = false;
  chain.sourceWeightObject.feeds.weighted_internal_model_frame = false;
  chain.sourceWeightObject.weight_object_hash =
    "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";

  const frame = buildContributionAlignmentWeightedInternalModelFrameFromObject(
    chain.sourceWeightObject,
    {
      sourceWeightDecision: chain.sourceWeightDecision,
      sourceFeatureStabilityReview: chain.sourceFeatureStabilityReview
    }
  );
  const validation = validateContributionAlignmentWeightedInternalModelFrame(frame, {
    sourceWeightObject: chain.sourceWeightObject,
    sourceWeightDecision: chain.sourceWeightDecision,
    sourceFeatureStabilityReview: chain.sourceFeatureStabilityReview
  });

  assert.equal(frame.frame_state, "HOLD_FOR_VERSIONED_WEIGHT_OBJECT");
  assert.equal(frame.source_bound, false);
  assert.equal(frame.feature_weight_composition.length, 0);
  assert.equal(validation.valid, false);
});

test("weighted internal model frame validation rejects forged composition after rehash", () => {
  const chain = frameChain();
  const frame = buildContributionAlignmentWeightedInternalModelFrameFromObject(
    chain.sourceWeightObject,
    {
      sourceWeightDecision: chain.sourceWeightDecision,
      sourceFeatureStabilityReview: chain.sourceFeatureStabilityReview
    }
  );
  frame.feature_weight_composition[0].weight = 0.2;
  frame.frame_policy.aggregate_score_output_authorized = true;
  frame.frame_hash = contributionAlignmentWeightedInternalModelFrameHash(frame);

  const validation = validateContributionAlignmentWeightedInternalModelFrame(frame, {
    sourceWeightObject: chain.sourceWeightObject,
    sourceWeightDecision: chain.sourceWeightDecision,
    sourceFeatureStabilityReview: chain.sourceFeatureStabilityReview,
    expectedFrame: buildContributionAlignmentWeightedInternalModelFrameFromObject(
      chain.sourceWeightObject,
      {
        sourceWeightDecision: chain.sourceWeightDecision,
        sourceFeatureStabilityReview: chain.sourceFeatureStabilityReview
      }
    )
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /composition|sourceWeightObject|score|sum/.test(gap)),
    validation.gaps.join("; ")
  );
});
