import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  buildContributionAlignmentVersionedWeightObjectFromObject as buildTs,
  contributionAlignmentVersionedWeightObjectHash as hashTs,
  validateContributionAlignmentVersionedWeightObject as validateTs
} from "../dist/index.js";
import {
  buildContributionAlignmentVersionedWeightObjectFromObject as buildMjs,
  validateContributionAlignmentVersionedWeightObject as validateMjs
} from "../../../scripts/run_ai_value_contribution_alignment_versioned_weight_object.mjs";

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
const goldenObject = readFileSync(golden("03-versioned-weight-object.json"), "utf8");

test("ported weight object reproduces the golden output byte-for-byte", () => {
  const weightObject = buildTs({ source_weight_decision: sourceDecision });
  assert.equal(`${JSON.stringify(weightObject, null, 2)}\n`, goldenObject);
  assert.equal(weightObject.weight_object_state, "VERSIONED_INTERNAL_WEIGHT_OBJECT_READY");
  assert.equal(weightObject.weight_object_hash, hashTs(weightObject));
  assert.equal(weightObject.weights.length, 10);
});

test("ported weight object matches the .mjs runner byte-for-byte across input paths", () => {
  const inputs = [
    { source_weight_decision: sourceDecision },
    sourceDecision,
    {
      source_weight_decision: sourceDecision,
      source_feature_stability_review: sourceReview
    },
    { source_weight_decision: { ...sourceDecision, decision_state: "NOT_READY" } },
    { source_weight_decision: { ...sourceDecision, decision_hash: "a".repeat(64) } },
    { source_weight_decision: sourceDecision, raw_rows: [{ unsafe: true }] },
    { source_weight_decision: sourceDecision, sidecar: "value" },
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

test("ported weight object validator matches the .mjs validator verdicts and gaps", () => {
  const ready = buildTs({ source_weight_decision: sourceDecision });
  const options = {
    sourceWeightDecision: sourceDecision,
    sourceFeatureStabilityReview: sourceReview
  };
  const readyTs = validateTs(ready, clone(options));
  const readyMjs = validateMjs(clone(ready), clone(options));
  assert.equal(readyTs.valid, true, readyTs.gaps.join("; "));
  assert.equal(JSON.stringify(readyTs), JSON.stringify(readyMjs));

  const forged = clone(ready);
  forged.weights[0].weight = 0.5;
  const forgedTs = validateTs(forged);
  const forgedMjs = validateMjs(clone(forged));
  assert.equal(forgedTs.valid, false);
  assert.equal(JSON.stringify(forgedTs), JSON.stringify(forgedMjs));

  const drifted = clone(ready);
  drifted.calibration_state = "empirically_calibrated";
  const driftedTs = validateTs(drifted);
  const driftedMjs = validateMjs(clone(drifted));
  assert.equal(driftedTs.valid, false);
  assert.equal(JSON.stringify(driftedTs), JSON.stringify(driftedMjs));
});
