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
  buildContributionAlignmentInternalBayesianExecutionGateFromObject,
  contributionAlignmentInternalBayesianExecutionGateHash,
  validateContributionAlignmentInternalBayesianExecutionGate
} from "./run_ai_value_contribution_alignment_internal_bayesian_execution_gate.mjs";

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

function gateChain() {
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
  const sourceSpecification =
    buildContributionAlignmentBayesianModelSpecificationFromObject(
      sourceReadinessReview,
      { sourceFrame, sourceWeightObject }
    );
  cachedChain = {
    sourceFrame,
    sourceReadinessReview,
    sourceSpecification
  };
  return JSON.parse(JSON.stringify(cachedChain));
}

test("internal Bayesian execution gate authorizes only internal runtime implementation", () => {
  const chain = gateChain();
  const gate = buildContributionAlignmentInternalBayesianExecutionGateFromObject(
    chain.sourceSpecification,
    {
      sourceReadinessReview: chain.sourceReadinessReview,
      sourceFrame: chain.sourceFrame
    }
  );
  const validation = validateContributionAlignmentInternalBayesianExecutionGate(gate, {
    sourceSpecification: chain.sourceSpecification,
    sourceReadinessReview: chain.sourceReadinessReview,
    sourceFrame: chain.sourceFrame,
    expectedGate: gate
  });

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(gate.gate_state, "INTERNAL_BAYESIAN_EXECUTION_GATE_READY");
  assert.equal(gate.source_bound, true);
  assert.equal(gate.gate_version, "internal_bayesian_execution_gate_2026_06");
  assert.equal(
    gate.candidate_model_family,
    "bayesian_hierarchical_difference_in_differences_candidate"
  );
  assert.equal(gate.gate_policy.internal_only, true);
  assert.equal(gate.gate_policy.execution_gate_only, true);
  assert.equal(gate.gate_policy.runtime_implementation_authorized, true);
  assert.equal(gate.gate_policy.bayesian_execution_authorized, false);
  assert.equal(gate.gate_policy.bayesian_model_output_authorized, false);
  assert.equal(gate.gate_policy.posterior_output_authorized, false);
  assert.equal(gate.gate_policy.confidence_output_authorized, false);
  assert.equal(gate.gate_policy.probability_output_authorized, false);
  assert.equal(gate.gate_policy.customer_output_authorized, false);
  assert.equal(
    gate.execution_contract.unit_of_analysis,
    "aggregate_measurement_cell_window"
  );
  assert.equal(
    gate.execution_contract.estimand,
    "aggregate_selected_metric_movement_difference_in_differences_candidate"
  );
  assert.equal(
    gate.execution_contract.execution_scope,
    "internal_deterministic_runtime_implementation_candidate"
  );
  assert.equal(gate.execution_contract.execution_state, "not_executed");
  assert.equal(gate.runtime_prerequisites.aggregate_measurement_cell_windows_only, true);
  assert.equal(gate.runtime_prerequisites.source_specification_hash_bound, true);
  assert.equal(gate.runtime_prerequisites.governed_feature_weights_only, true);
  assert.equal(gate.runtime_prerequisites.deterministic_fixture_or_snapshot_only, true);
  assert.equal(gate.runtime_prerequisites.no_raw_rows_or_records, true);
  assert.equal(gate.runtime_prerequisites.no_identifiers, true);
  assert.equal(gate.runtime_prerequisites.no_query_text, true);
  assert.equal(gate.runtime_prerequisites.no_live_connectors, true);
  assert.equal(gate.runtime_prerequisites.posterior_output_review_required, true);
  assert.equal(gate.runtime_prerequisites.confidence_probability_language_blocked, true);
  assert.equal(gate.runtime_prerequisites.customer_output_blocked, true);
  assert.deepEqual(
    gate.gated_feature_weights.map((feature) => feature.feature_id),
    EXPECTED_FEATURES
  );
  for (const feature of gate.gated_feature_weights) {
    assert.equal(feature.weight, 0.1);
    assert.equal(feature.source_bound, true);
    assert.equal(feature.gate_role, "eligible_for_later_internal_runtime_fixture");
    assert.equal(feature.output_value_present, false);
  }
  assert.equal(gate.allowed_next_step, "internal_bayesian_execution_runtime_only");
  assert.equal(gate.feeds.internal_bayesian_execution_runtime, true);
  for (const feed of FALSE_FEEDS) {
    assert.equal(gate.feeds[feed], false, `${feed} must remain false`);
  }
});

test("internal Bayesian execution gate rejects unsafe wrapper side doors without echo", () => {
  const chain = gateChain();
  const gate = buildContributionAlignmentInternalBayesianExecutionGateFromObject({
    source_specification: chain.sourceSpecification,
    posterior_probability: 0.82,
    confidence_output: "high",
    probability_output: 0.73,
    query_text: "SELECT user_id FROM raw_rows",
    raw_rows: [{ email: "person@example.com" }],
    customer_facing_output: "ready"
  });
  const validation = validateContributionAlignmentInternalBayesianExecutionGate(gate);
  const serialized = `${JSON.stringify(gate)} ${JSON.stringify(validation)}`;

  assert.equal(gate.gate_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
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

test("internal Bayesian execution gate holds on model specification drift", () => {
  const chain = gateChain();
  chain.sourceSpecification.feeds.internal_bayesian_execution_gate = false;
  chain.sourceSpecification.specification_hash =
    "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";

  const gate = buildContributionAlignmentInternalBayesianExecutionGateFromObject(
    chain.sourceSpecification,
    {
      sourceReadinessReview: chain.sourceReadinessReview,
      sourceFrame: chain.sourceFrame
    }
  );
  const validation = validateContributionAlignmentInternalBayesianExecutionGate(gate, {
    sourceSpecification: chain.sourceSpecification,
    sourceReadinessReview: chain.sourceReadinessReview,
    sourceFrame: chain.sourceFrame
  });

  assert.equal(gate.gate_state, "HOLD_FOR_BAYESIAN_MODEL_SPECIFICATION");
  assert.equal(gate.source_bound, false);
  assert.equal(gate.gated_feature_weights.length, 0);
  assert.equal(gate.gate_policy.runtime_implementation_authorized, false);
  assert.equal(validation.valid, false);
});

test("internal Bayesian execution gate validation rejects forged execution after rehash", () => {
  const chain = gateChain();
  const gate = buildContributionAlignmentInternalBayesianExecutionGateFromObject(
    chain.sourceSpecification,
    {
      sourceReadinessReview: chain.sourceReadinessReview,
      sourceFrame: chain.sourceFrame
    }
  );
  gate.gate_policy.bayesian_execution_authorized = true;
  gate.feeds.bayesian_execution = true;
  gate.execution_contract.execution_state = "executed";
  gate.gate_hash = contributionAlignmentInternalBayesianExecutionGateHash(gate);

  const validation = validateContributionAlignmentInternalBayesianExecutionGate(gate, {
    sourceSpecification: chain.sourceSpecification,
    sourceReadinessReview: chain.sourceReadinessReview,
    sourceFrame: chain.sourceFrame,
    expectedGate: buildContributionAlignmentInternalBayesianExecutionGateFromObject(
      chain.sourceSpecification,
      {
        sourceReadinessReview: chain.sourceReadinessReview,
        sourceFrame: chain.sourceFrame
      }
    )
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /execution|sourceSpecification|Bayesian|bayesian/.test(gap)),
    validation.gaps.join("; ")
  );
});
