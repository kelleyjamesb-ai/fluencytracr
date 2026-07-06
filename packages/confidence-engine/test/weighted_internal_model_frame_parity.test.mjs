import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  buildContributionAlignmentWeightedInternalModelFrameFromObject as buildTs,
  contributionAlignmentWeightedInternalModelFrameHash as hashTs,
  validateContributionAlignmentWeightedInternalModelFrame as validateTs
} from "../dist/index.js";
import {
  buildContributionAlignmentWeightedInternalModelFrameFromObject as buildMjs,
  validateContributionAlignmentWeightedInternalModelFrame as validateMjs
} from "../../../scripts/run_ai_value_contribution_alignment_weighted_internal_model_frame.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const golden = (name) => join(here, "golden", name);

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const sourceReview = readJson(golden("01-feature-stability-review.json"));
const sourceDecision = readJson(golden("02-internal-numeric-weight-decision.json"));
const sourceWeightObject = readJson(golden("03-versioned-weight-object.json"));
const goldenFrame = readFileSync(golden("04-weighted-internal-model-frame.json"), "utf8");

test("ported model frame reproduces the golden output byte-for-byte", () => {
  const frame = buildTs({ source_weight_object: sourceWeightObject });
  assert.equal(`${JSON.stringify(frame, null, 2)}\n`, goldenFrame);
  assert.equal(frame.frame_state, "WEIGHTED_INTERNAL_MODEL_FRAME_READY");
  assert.equal(frame.frame_hash, hashTs(frame));
  assert.equal(frame.feature_weight_composition.length, 10);
});

test("ported model frame matches the .mjs runner byte-for-byte across input paths", () => {
  const inputs = [
    { source_weight_object: sourceWeightObject },
    sourceWeightObject,
    {
      source_weight_object: sourceWeightObject,
      source_weight_decision: sourceDecision,
      source_feature_stability_review: sourceReview
    },
    { source_weight_object: { ...sourceWeightObject, weight_object_state: "NOT_READY" } },
    { source_weight_object: { ...sourceWeightObject, weight_object_hash: "a".repeat(64) } },
    {
      source_weight_object: (() => {
        const tampered = clone(sourceWeightObject);
        tampered.weights[0].weight = 0.2;
        return tampered;
      })()
    },
    { source_weight_object: sourceWeightObject, raw_rows: [{ unsafe: true }] },
    { source_weight_object: sourceWeightObject, sidecar: "value" },
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

test("ported model frame validator matches the .mjs validator verdicts and gaps", () => {
  const ready = buildTs({ source_weight_object: sourceWeightObject });
  const options = {
    sourceWeightObject,
    sourceWeightDecision: sourceDecision,
    sourceFeatureStabilityReview: sourceReview
  };
  const readyTs = validateTs(ready, clone(options));
  const readyMjs = validateMjs(clone(ready), clone(options));
  assert.equal(readyTs.valid, true, readyTs.gaps.join("; "));
  assert.equal(JSON.stringify(readyTs), JSON.stringify(readyMjs));

  const forged = clone(ready);
  forged.frame_policy.bayesian_execution_authorized = true;
  const forgedTs = validateTs(forged);
  const forgedMjs = validateMjs(clone(forged));
  assert.equal(forgedTs.valid, false);
  assert.equal(JSON.stringify(forgedTs), JSON.stringify(forgedMjs));

  const drifted = clone(ready);
  drifted.feature_weight_composition[0].weight = 0.5;
  const driftedTs = validateTs(drifted);
  const driftedMjs = validateMjs(clone(drifted));
  assert.equal(driftedTs.valid, false);
  assert.equal(JSON.stringify(driftedTs), JSON.stringify(driftedMjs));
});
