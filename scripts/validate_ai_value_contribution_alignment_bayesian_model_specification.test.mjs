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

const EXPECTED_STATISTICAL_DESIGN_CONTRACT = {
  model_equation_family: "hierarchical_difference_in_differences_design_contract",
  hierarchy_structure:
    "partial_pooling_candidate_by_expectation_path_workflow_function_and_cohort_context",
  unit_of_analysis: "aggregate_measurement_cell_window",
  treatment_definition: "approved_expectation_path_aligned_ai_work_evidence_condition_candidate",
  comparison_definition: "governed_comparison_condition_or_staggered_rollout_required",
  pre_post_window_definition: "exact_baseline_and_comparison_milestone_window_alignment_required",
  estimand_definition:
    "aggregate_selected_metric_movement_aligned_to_approved_expectation_path_compared_across_pre_post_windows_and_governed_comparison_condition_candidate_no_causality_claim",
  metric_direction: "metric_owner_approved_direction_required_before_execution",
  metric_lag_handling: "metric_owner_approved_lag_window_required_before_execution",
  likelihood_family_placeholder_by_metric_type: {
    continuous_metric: "normal_likelihood_placeholder_not_executed",
    proportion_metric: "binomial_or_beta_binomial_likelihood_placeholder_not_executed",
    count_metric: "poisson_or_negative_binomial_likelihood_placeholder_not_executed"
  },
  weakly_regularizing_prior_placeholder:
    "weakly_regularizing_priors_placeholder_not_calibrated",
  missing_suppressed_window_behavior:
    "hold_no_imputation_no_rescue_for_suppressed_held_missing_or_stale_windows",
  posterior_diagnostics_required_later: true,
  execution_state: "not_executed"
};

const EXPECTED_DATA_ADEQUACY_REQUIREMENTS = {
  non_suppressed_aggregate_measurement_cell_windows_only: true,
  exact_baseline_comparison_window_alignment_required: true,
  same_metric_direction_lag_expectation_path_cohort_workflow_function_identity_required: true,
  governed_comparison_group_or_staggered_rollout_design_required_before_did_execution: true,
  pre_period_trend_plausibility_check_required_before_posterior_review: true,
  rolling_30_day_context_allowed_as_milestone_evidence: false,
  imputation_rescue_for_suppressed_held_missing_or_stale_windows_allowed: false,
  raw_rows_allowed: false,
  identifiers_allowed: false,
  query_text_allowed: false,
  live_connector_reads_allowed: false
};

const EXPECTED_POSTERIOR_OUTPUT_REVIEW_REQUIREMENTS = {
  convergence_diagnostics_required: true,
  posterior_predictive_checks_required: true,
  prior_sensitivity_required: true,
  comparison_design_adequacy_review_required: true,
  confidence_probability_language_requires_later_explicit_promotion_gate: true,
  posterior_output_authorized: false,
  confidence_output_authorized: false,
  probability_output_authorized: false
};

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
    specification.statistical_design_contract,
    EXPECTED_STATISTICAL_DESIGN_CONTRACT
  );
  assert.deepEqual(
    specification.data_adequacy_requirements,
    EXPECTED_DATA_ADEQUACY_REQUIREMENTS
  );
  assert.deepEqual(
    specification.posterior_output_review_requirements,
    EXPECTED_POSTERIOR_OUTPUT_REVIEW_REQUIREMENTS
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
    score_output: 99,
    roi_output: "ready",
    finance_output: "ready",
    causality_output: "ready",
    productivity_output: "ready",
    query_text: "SELECT user_id FROM raw_rows",
    person_id: "person_123",
    live_connector_execution: true,
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
    "score_output",
    "roi_output",
    "finance_output",
    "causality_output",
    "productivity_output",
    "person_123",
    "live_connector_execution",
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
  assert.equal(specification.statistical_design_contract, null);
  assert.equal(specification.data_adequacy_requirements, null);
  assert.equal(specification.posterior_output_review_requirements, null);
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

test("Bayesian model specification validation rejects forged data adequacy relaxation after rehash", () => {
  const chain = specificationChain();
  const specification = buildContributionAlignmentBayesianModelSpecificationFromObject(
    chain.sourceReadinessReview,
    { sourceFrame: chain.sourceFrame }
  );
  specification.data_adequacy_requirements.raw_rows_allowed = true;
  specification.data_adequacy_requirements.rolling_30_day_context_allowed_as_milestone_evidence =
    true;
  specification.posterior_output_review_requirements.confidence_output_authorized = true;
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
    validation.gaps.some((gap) => /adequacy|confidence|sourceReadinessReview|specification/.test(gap)),
    validation.gaps.join("; ")
  );
});
