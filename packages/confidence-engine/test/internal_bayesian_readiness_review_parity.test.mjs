import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  buildContributionAlignmentInternalBayesianReadinessReviewFromObject as buildTs,
  contributionAlignmentInternalBayesianReadinessReviewHash as hashTs,
  validateContributionAlignmentInternalBayesianReadinessReview as validateTs
} from "../dist/index.js";
import {
  buildContributionAlignmentInternalBayesianReadinessReviewFromObject as buildMjs,
  validateContributionAlignmentInternalBayesianReadinessReview as validateMjs
} from "../../../scripts/run_ai_value_contribution_alignment_internal_bayesian_readiness_review.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const golden = (name) => join(here, "golden", name);

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const sourceWeightObject = readJson(golden("03-versioned-weight-object.json"));
const sourceFrame = readJson(golden("04-weighted-internal-model-frame.json"));
const goldenReview = readFileSync(golden("05-internal-bayesian-readiness-review.json"), "utf8");

test("ported readiness review reproduces the golden output byte-for-byte", () => {
  const review = buildTs({ source_frame: sourceFrame });
  assert.equal(`${JSON.stringify(review, null, 2)}\n`, goldenReview);
  assert.equal(review.review_state, "INTERNAL_BAYESIAN_READINESS_REVIEW_PASSED_FOR_MODEL_SPECIFICATION");
  assert.equal(review.review_hash, hashTs(review));
  assert.equal(review.candidate_model_family, "bayesian_hierarchical_difference_in_differences_candidate");
});

test("ported readiness review matches the .mjs runner byte-for-byte across input paths", () => {
  const inputs = [
    { source_frame: sourceFrame },
    sourceFrame,
    { source_frame: sourceFrame, source_weight_object: sourceWeightObject },
    { source_frame: { ...sourceFrame, frame_state: "NOT_READY" } },
    { source_frame: { ...sourceFrame, frame_hash: "a".repeat(64) } },
    {
      source_frame: (() => {
        const tampered = clone(sourceFrame);
        tampered.feature_weight_composition[0].weight = 0.4;
        return tampered;
      })()
    },
    { source_frame: sourceFrame, raw_rows: [{ unsafe: true }] },
    { source_frame: sourceFrame, sidecar: "value" },
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

test("ported readiness review validator matches the .mjs validator verdicts and gaps", () => {
  const ready = buildTs({ source_frame: sourceFrame });
  const options = { sourceFrame, sourceWeightObject };
  const readyTs = validateTs(ready, clone(options));
  const readyMjs = validateMjs(clone(ready), clone(options));
  assert.equal(readyTs.valid, true, readyTs.gaps.join("; "));
  assert.equal(JSON.stringify(readyTs), JSON.stringify(readyMjs));

  const forged = clone(ready);
  forged.review_policy.bayesian_execution_authorized = true;
  const forgedTs = validateTs(forged);
  const forgedMjs = validateMjs(clone(forged));
  assert.equal(forgedTs.valid, false);
  assert.equal(JSON.stringify(forgedTs), JSON.stringify(forgedMjs));

  const drifted = clone(ready);
  drifted.readiness_checks.privacy_boundary_clear = false;
  const driftedTs = validateTs(drifted);
  const driftedMjs = validateMjs(clone(drifted));
  assert.equal(driftedTs.valid, false);
  assert.equal(JSON.stringify(driftedTs), JSON.stringify(driftedMjs));
});
