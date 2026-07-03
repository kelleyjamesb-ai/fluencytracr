import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  buildContributionAlignmentInternalNumericWeightDecisionFromObject as buildTs,
  contributionAlignmentInternalNumericWeightDecisionHash as hashTs,
  validateContributionAlignmentInternalNumericWeightDecision as validateTs
} from "../dist/index.js";
import {
  buildContributionAlignmentInternalNumericWeightDecisionFromObject as buildMjs,
  validateContributionAlignmentInternalNumericWeightDecision as validateMjs
} from "../../../scripts/run_ai_value_contribution_alignment_internal_numeric_weight_decision.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const golden = (name) => join(here, "golden", name);

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const sourceReview = readJson(golden("01-feature-stability-review.json"));
const goldenDecision = readFileSync(golden("02-internal-numeric-weight-decision.json"), "utf8");

test("ported weight decision reproduces the golden output byte-for-byte", () => {
  const decision = buildTs({ source_feature_stability_review: sourceReview });
  assert.equal(`${JSON.stringify(decision, null, 2)}\n`, goldenDecision);
  assert.equal(decision.decision_state, "PROMOTE_INTERNAL_NUMERIC_WEIGHT_OBJECT");
  assert.equal(decision.decision_hash, hashTs(decision));
});

test("ported weight decision matches the .mjs runner byte-for-byte across input paths", () => {
  const inputs = [
    { source_feature_stability_review: sourceReview },
    sourceReview,
    { source_feature_stability_review: { ...sourceReview, review_state: "NOT_READY" } },
    { source_feature_stability_review: { ...sourceReview, review_hash: "a".repeat(64) } },
    {
      source_feature_stability_review: (() => {
        const tampered = clone(sourceReview);
        tampered.feature_registry = tampered.feature_registry.slice(1);
        return tampered;
      })()
    },
    { source_feature_stability_review: sourceReview, raw_rows: [{ unsafe: true }] },
    { source_feature_stability_review: sourceReview, sidecar: "value" },
    {},
    null
  ];
  for (const [index, input] of inputs.entries()) {
    const tsOut = buildTs(clone(input));
    const mjsOut = buildMjs(clone(input));
    assert.equal(
      JSON.stringify(tsOut),
      JSON.stringify(mjsOut),
      `input #${index}: outputs must be byte-identical`
    );
  }
});

test("ported weight decision validator matches the .mjs validator verdicts and gaps", () => {
  const ready = buildTs({ source_feature_stability_review: sourceReview });
  const readyTs = validateTs(ready, { sourceFeatureStabilityReview: sourceReview });
  const readyMjs = validateMjs(clone(ready), { sourceFeatureStabilityReview: sourceReview });
  assert.equal(readyTs.valid, true, readyTs.gaps.join("; "));
  assert.equal(JSON.stringify(readyTs), JSON.stringify(readyMjs));

  const forged = clone(ready);
  forged.weight_decision_scope.weight_values_present = true;
  const forgedTs = validateTs(forged);
  const forgedMjs = validateMjs(clone(forged));
  assert.equal(forgedTs.valid, false);
  assert.equal(JSON.stringify(forgedTs), JSON.stringify(forgedMjs));

  const drifted = clone(ready);
  drifted.generated_at = "2026-06-26T00:00:00.000Z";
  const driftedTs = validateTs(drifted);
  const driftedMjs = validateMjs(clone(drifted));
  assert.equal(driftedTs.valid, false);
  assert.equal(JSON.stringify(driftedTs), JSON.stringify(driftedMjs));
});
