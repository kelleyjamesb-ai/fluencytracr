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
  buildContributionAlignmentBayesianModelSpecificationFromObject,
  contributionAlignmentBayesianModelSpecificationHash,
  validateContributionAlignmentBayesianModelSpecification
} from "./run_ai_value_contribution_alignment_bayesian_model_specification.mjs";

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

function specificationChain() {
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
  const sourceReadinessReview =
    buildContributionAlignmentInternalBayesianReadinessReviewFromObject(
      sourceFrame,
      { sourceWeightObject }
    );
  cachedChain = {
    sourceWeightObject,
    sourceFrame,
    sourceReadinessReview
  };
  return JSON.parse(JSON.stringify(cachedChain));
}

test("Bayesian model specification defines the internal model contract without execution", () => {
  const chain = specificationChain();
  const specification = buildContributionAlignmentBayesianModelSpecificationFromObject(
    chain.sourceReadinessReview,
    {
      sourceFrame: chain.sourceFrame,
      sourceWeightObject: chain.sourceWeightObject
    }
  );
  const validation = validateContributionAlignmentBayesianModelSpecification(specification, {
    sourceReadinessReview: chain.sourceReadinessReview,
    sourceFrame: chain.sourceFrame,
    sourceWeightObject: chain.sourceWeightObject,
    expectedSpecification: specification
  });

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(specification.specification_state, "BAYESIAN_MODEL_SPECIFICATION_READY");
  assert.equal(specification.source_bound, true);
  assert.equal(specification.specification_version, "bayesian_hierarchical_did_spec_2026_06");
  assert.equal(
    specification.candidate_model_family,
    "bayesian_hierarchical_difference_in_differences_candidate"
  );
  assert.equal(specification.specification_policy.internal_only, true);
  assert.equal(specification.specification_policy.specification_only, true);
  assert.equal(specification.specification_policy.execution_gate_authorized, true);
  assert.equal(specification.specification_policy.bayesian_execution_authorized, false);
  assert.equal(specification.specification_policy.posterior_output_authorized, false);
  assert.equal(specification.specification_policy.confidence_output_authorized, false);
  assert.equal(specification.specification_policy.probability_output_authorized, false);
  assert.equal(specification.specification_policy.customer_output_authorized, false);
  assert.equal(
    specification.model_contract.unit_of_analysis,
    "aggregate_measurement_cell_window"
  );
  assert.equal(
    specification.model_contract.estimand,
    "aggregate_selected_metric_movement_difference_in_differences_candidate"
  );
  assert.equal(
    specification.model_contract.prior_specification_state,
    "weakly_regularizing_internal_placeholder_not_calibrated"
  );
  assert.equal(
    specification.model_contract.likelihood_specification_state,
    "aggregate_window_likelihood_placeholder_not_executed"
  );
  assert.deepEqual(
    specification.specified_feature_weights.map((feature) => feature.feature_id),
    EXPECTED_FEATURES
  );
  for (const feature of specification.specified_feature_weights) {
    assert.equal(feature.weight, 0.1);
    assert.equal(feature.source_bound, true);
    assert.equal(feature.specification_role, "internal_model_covariate_candidate");
    assert.equal(feature.output_value_present, false);
  }
  assert.equal(specification.feeds.internal_bayesian_execution_gate, true);
  for (const feed of FALSE_FEEDS) {
    assert.equal(specification.feeds[feed], false, `${feed} must remain false`);
  }
});

test("Bayesian model specification rejects unsafe wrapper side doors without echo", () => {
  const chain = specificationChain();
  const specification = buildContributionAlignmentBayesianModelSpecificationFromObject({
    source_readiness_review: chain.sourceReadinessReview,
    posterior_probability: 0.82,
    confidence_output: "high",
    probability_output: 0.73,
    query_text: "SELECT user_id FROM raw_rows",
    raw_rows: [{ email: "person@example.com" }],
    customer_facing_output: "ready"
  });
  const validation = validateContributionAlignmentBayesianModelSpecification(specification);
  const serialized = `${JSON.stringify(specification)} ${JSON.stringify(validation)}`;

  assert.equal(specification.specification_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validation.valid, false);
  for (const unsafe of [
    "person@example.com",
    "SELECT user_id",
    "posterior_probability",
    "confidence_output",
    "probability_output",
    "customer_facing_output"
  ]) {
    assert.equal(serialized.includes(unsafe), false, `${unsafe} must not echo`);
  }
});

test("Bayesian model specification holds on readiness review drift", () => {
  const chain = specificationChain();
  chain.sourceReadinessReview.feeds.bayesian_model_specification = false;
  chain.sourceReadinessReview.review_hash =
    "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

  const specification = buildContributionAlignmentBayesianModelSpecificationFromObject(
    chain.sourceReadinessReview,
    { sourceFrame: chain.sourceFrame }
  );
  const validation = validateContributionAlignmentBayesianModelSpecification(specification, {
    sourceReadinessReview: chain.sourceReadinessReview,
    sourceFrame: chain.sourceFrame
  });

  assert.equal(specification.specification_state, "HOLD_FOR_INTERNAL_BAYESIAN_READINESS_REVIEW");
  assert.equal(specification.source_bound, false);
  assert.equal(specification.specified_feature_weights.length, 0);
  assert.equal(specification.specification_policy.execution_gate_authorized, false);
  assert.equal(validation.valid, false);
});

test("Bayesian model specification validation rejects forged execution after rehash", () => {
  const chain = specificationChain();
  const specification = buildContributionAlignmentBayesianModelSpecificationFromObject(
    chain.sourceReadinessReview,
    { sourceFrame: chain.sourceFrame }
  );
  specification.specification_policy.bayesian_execution_authorized = true;
  specification.feeds.bayesian_execution = true;
  specification.specification_hash =
    contributionAlignmentBayesianModelSpecificationHash(specification);

  const validation = validateContributionAlignmentBayesianModelSpecification(specification, {
    sourceReadinessReview: chain.sourceReadinessReview,
    sourceFrame: chain.sourceFrame,
    expectedSpecification: buildContributionAlignmentBayesianModelSpecificationFromObject(
      chain.sourceReadinessReview,
      { sourceFrame: chain.sourceFrame }
    )
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /execution|sourceReadinessReview|Bayesian|bayesian/.test(gap)),
    validation.gaps.join("; ")
  );
});
