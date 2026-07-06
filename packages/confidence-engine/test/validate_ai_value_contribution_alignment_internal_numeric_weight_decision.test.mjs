import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildContributionAlignmentFeatureStabilityReviewFromObject,
  buildContributionAlignmentInternalNumericWeightDecisionFromObject,
  contributionAlignmentInternalNumericWeightDecisionHash,
  validateContributionAlignmentInternalNumericWeightDecision
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

const FALSE_FEEDS = [
  "weight_values",
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

let cachedFeatureReview = null;

function sourceDataModel() {
  const output = execFileSync(
    "node",
    [
      join(
        REPO_ROOT,
        "scripts/run_ai_value_contribution_alignment_internal_research_math_data_model.mjs"
      ),
      PACKET_PATH,
      `--source-fixture=${FIXTURE_PATH}`,
      `--research-design=${RESEARCH_DESIGN_PATH}`
    ],
    { cwd: REPO_ROOT, encoding: "utf8" }
  );
  return JSON.parse(output);
}

function featureReview() {
  if (cachedFeatureReview) return JSON.parse(JSON.stringify(cachedFeatureReview));
  cachedFeatureReview =
    buildContributionAlignmentFeatureStabilityReviewFromObject(sourceDataModel());
  return JSON.parse(JSON.stringify(cachedFeatureReview));
}

test("internal numeric weight decision authorizes only the versioned weight object", () => {
  const source = featureReview();
  const decision =
    buildContributionAlignmentInternalNumericWeightDecisionFromObject(source);
  const validation = validateContributionAlignmentInternalNumericWeightDecision(
    decision,
    { sourceFeatureStabilityReview: source, expectedDecision: decision }
  );

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(decision.decision_state, "PROMOTE_INTERNAL_NUMERIC_WEIGHT_OBJECT");
  assert.equal(decision.source_bound, true);
  assert.equal(decision.allowed_next_step, "versioned_internal_weight_object_only");
  assert.equal(decision.weight_decision_scope.internal_only, true);
  assert.equal(decision.weight_decision_scope.versioned_weight_object_authorized, true);
  assert.equal(decision.weight_decision_scope.weight_values_present, false);
  assert.equal(decision.weight_decision_scope.weighted_model_frame_authorized, false);
  assert.equal(decision.weight_decision_scope.bayesian_execution_authorized, false);
  assert.equal(decision.feeds.versioned_internal_weight_object, true);
  for (const feed of FALSE_FEEDS) {
    assert.equal(decision.feeds[feed], false, `${feed} must remain false`);
  }
});

test("internal numeric weight decision rejects unsafe wrapper side doors without echo", () => {
  const decision =
    buildContributionAlignmentInternalNumericWeightDecisionFromObject({
      source_feature_stability_review: featureReview(),
      weight_values: { observed_vbd_alignment: 0.4 },
      posterior_probability: 0.82,
      query_text: "SELECT user_id FROM raw_rows",
      raw_rows: [{ email: "person@example.com" }],
      customer_facing_output: "ready"
    });
  const validation = validateContributionAlignmentInternalNumericWeightDecision(decision);
  const serialized = `${JSON.stringify(decision)} ${JSON.stringify(validation)}`;

  assert.equal(decision.decision_state, "REJECTED_FOR_BOUNDARY_LEAKAGE");
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

test("internal numeric weight decision holds on unstable feature review", () => {
  const source = featureReview();
  source.feature_registry = [];
  source.review_hash =
    "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

  const decision =
    buildContributionAlignmentInternalNumericWeightDecisionFromObject(source);
  const validation = validateContributionAlignmentInternalNumericWeightDecision(
    decision,
    { sourceFeatureStabilityReview: source }
  );

  assert.equal(decision.decision_state, "HOLD_FOR_FEATURE_STABILITY_REVIEW");
  assert.equal(decision.source_bound, false);
  assert.equal(decision.weight_decision_scope.versioned_weight_object_authorized, false);
  assert.equal(validation.valid, false);
});

test("internal numeric weight decision validation rejects forged weight values after rehash", () => {
  const source = featureReview();
  const decision =
    buildContributionAlignmentInternalNumericWeightDecisionFromObject(source);
  decision.weight_decision_scope.weight_values_present = true;
  decision.weight_decision_scope.weighted_model_frame_authorized = true;
  decision.feeds.weight_values = true;
  decision.decision_hash = contributionAlignmentInternalNumericWeightDecisionHash(decision);

  const validation = validateContributionAlignmentInternalNumericWeightDecision(
    decision,
    {
      sourceFeatureStabilityReview: source,
      expectedDecision:
        buildContributionAlignmentInternalNumericWeightDecisionFromObject(source)
    }
  );

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /weight_values|weighted_model|sourceFeatureStabilityReview|feeds/.test(gap)),
    validation.gaps.join("; ")
  );
});
