import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

import {
  buildContributionAlignmentFeatureStabilityReviewFromObject,
  contributionAlignmentFeatureStabilityReviewHash,
  validateContributionAlignmentFeatureStabilityReview
} from "./run_ai_value_contribution_alignment_feature_stability_review.mjs";

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
  "numeric_weight_object",
  "weighted_internal_model_frame",
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

let cachedSourceDataModel = null;

function sourceDataModel() {
  if (cachedSourceDataModel) {
    return JSON.parse(JSON.stringify(cachedSourceDataModel));
  }
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
  cachedSourceDataModel = JSON.parse(output);
  return JSON.parse(JSON.stringify(cachedSourceDataModel));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function hasNestedKey(value, key) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => hasNestedKey(item, key));
  return Object.entries(value).some(
    ([nestedKey, nestedValue]) => nestedKey === key || hasNestedKey(nestedValue, key)
  );
}

test("feature stability review passes only as an internal weight-decision gate", () => {
  const source = sourceDataModel();
  const review = buildContributionAlignmentFeatureStabilityReviewFromObject(source);
  const validation = validateContributionAlignmentFeatureStabilityReview(review, {
    sourceDataModel: source,
    expectedReview: review
  });

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(
    review.review_state,
    "FEATURE_STABILITY_REVIEW_PASSED_FOR_INTERNAL_WEIGHT_DECISION"
  );
  assert.equal(review.source_bound, true);
  assert.equal(review.allowed_next_step, "internal_numeric_weight_decision_only");
  assert.equal(review.feature_stability.weight_decision_ready, true);
  assert.equal(review.feature_stability.numeric_weights_authorized, false);
  assert.equal(review.feature_stability.weight_values_present, false);
  assert.deepEqual(
    review.feature_registry.map((feature) => feature.feature_id),
    EXPECTED_FEATURES
  );
  for (const feature of review.feature_registry) {
    assert.equal(feature.stability_state, "STABLE_FOR_INTERNAL_WEIGHT_DECISION");
    assert.equal(feature.weight_candidate_role, "candidate_internal_weight_input");
    assert.equal(feature.numeric_value_present, false);
    assert.equal(feature.source_bound, true);
  }
  for (const feed of FALSE_FEEDS) {
    assert.equal(review.feeds[feed], false, `${feed} must remain false`);
  }
});

test("feature stability review rejects unsafe wrapper side doors without echo", () => {
  const review = buildContributionAlignmentFeatureStabilityReviewFromObject({
    source_data_model: sourceDataModel(),
    raw_rows: [{ email: "person@example.com" }],
    query_text: "SELECT user_id FROM raw_rows",
    numeric_weights: { observed_vbd_alignment: 0.4 },
    posterior_probability: 0.82,
    customer_facing_output: "ready"
  });
  const validation = validateContributionAlignmentFeatureStabilityReview(review);
  const serialized = `${JSON.stringify(review)} ${JSON.stringify(validation)}`;

  assert.equal(review.review_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
  assert.equal(validation.valid, false);
  for (const unsafe of [
    "person@example.com",
    "SELECT user_id",
    "posterior_probability",
    "observed_vbd_alignment\":0.4"
  ]) {
    assert.equal(serialized.includes(unsafe), false, `${unsafe} must not echo`);
  }
});

test("feature stability review holds on unstable source data model", () => {
  const source = sourceDataModel();
  source.component_registry = source.component_registry.filter(
    (component) => component.component_id !== "milestone_continuity"
  );
  source.data_model_hash =
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

  const review = buildContributionAlignmentFeatureStabilityReviewFromObject(source);
  const validation = validateContributionAlignmentFeatureStabilityReview(review, {
    sourceDataModel: source
  });

  assert.equal(review.review_state, "HOLD_FOR_STABLE_INTERNAL_RESEARCH_MATH_DATA_MODEL");
  assert.equal(review.source_bound, false);
  assert.equal(validation.valid, false);
  assert.equal(review.feature_stability.weight_decision_ready, false);
  assert.equal(review.feature_registry.length, 0);
});

test("feature stability review validation rejects forged weight authorization after rehash", () => {
  const source = sourceDataModel();
  const review = buildContributionAlignmentFeatureStabilityReviewFromObject(source);
  review.feature_stability.numeric_weights_authorized = true;
  review.feeds.numeric_weight_object = true;
  review.review_hash = contributionAlignmentFeatureStabilityReviewHash(review);

  const validation = validateContributionAlignmentFeatureStabilityReview(review, {
    sourceDataModel: source,
    expectedReview: buildContributionAlignmentFeatureStabilityReviewFromObject(source)
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /numeric_weights|feeds|sourceDataModel/.test(gap)),
    validation.gaps.join("; ")
  );
  assert.equal(hasNestedKey(validation, "raw_rows"), false);
});
