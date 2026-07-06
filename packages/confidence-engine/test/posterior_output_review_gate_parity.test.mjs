import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  buildContributionAlignmentPosteriorOutputReviewGateFromObject as buildTs,
  contributionAlignmentPosteriorOutputReviewGateHash as hashTs,
  validateContributionAlignmentPosteriorOutputReviewGate as validateTs
} from "../dist/index.js";
import {
  buildContributionAlignmentPosteriorOutputReviewGateFromObject as buildMjs,
  validateContributionAlignmentPosteriorOutputReviewGate as validateMjs
} from "../../../scripts/run_ai_value_contribution_alignment_posterior_output_review_gate.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const golden = (name) => join(here, "golden", name);

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const envelope = readJson(golden("09-internal-bayesian-execution-runtime-source-envelope.json"));
const goldenReview = readFileSync(golden("13-posterior-output-review-gate.json"), "utf8");

test("ported posterior output review gate reproduces the golden output byte-for-byte", () => {
  const review = buildTs(clone(envelope));
  assert.equal(`${JSON.stringify(review, null, 2)}\n`, goldenReview);
  assert.equal(review.review_state, "POSTERIOR_ARTIFACT_CONTAINMENT_REVIEW_PASSED");
  assert.equal(review.review_hash, hashTs(review));
  assert.equal(review.review_policy.posterior_output_authorized, false);
  assert.equal(review.reviewed_fit_artifact_ref.numeric_posterior_values_withheld, true);
});

test("ported posterior output review gate matches the .mjs runner byte-for-byte across input paths", () => {
  const bareRuntime = clone(envelope.source_runtime);
  const inputs = [
    clone(envelope),
    { source_runtime: clone(envelope) },
    bareRuntime,
    { source_runtime: bareRuntime },
    { source_runtime: { ...bareRuntime, runtime_hash: "a".repeat(64) } },
    { source_runtime: { ...bareRuntime, runtime_state: "NOT_HELD" } },
    { source_runtime: bareRuntime, raw_rows: [{ unsafe: true }] },
    { source_runtime: bareRuntime, sidecar: "value" },
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

test("ported posterior output review gate validator matches the .mjs validator verdicts and gaps", () => {
  const review = buildTs(clone(envelope));
  const noOptionsTs = validateTs(clone(review));
  const noOptionsMjs = validateMjs(clone(review));
  assert.equal(JSON.stringify(noOptionsTs), JSON.stringify(noOptionsMjs));

  const options = {
    sourceRuntime: clone(envelope.source_runtime),
    sourceGate: clone(envelope.source_gate),
    aggregateMeasurementCellWindows: clone(envelope.aggregate_measurement_cell_windows)
  };
  const boundTs = validateTs(clone(review), clone(options));
  const boundMjs = validateMjs(clone(review), clone(options));
  assert.equal(boundTs.valid, true, boundTs.gaps.join("; "));
  assert.equal(JSON.stringify(boundTs), JSON.stringify(boundMjs));

  const forged = clone(review);
  forged.review_policy.posterior_output_authorized = true;
  forged.review_hash = hashTs(forged);
  const forgedTs = validateTs(clone(forged), clone(options));
  const forgedMjs = validateMjs(clone(forged), clone(options));
  assert.equal(forgedTs.valid, false);
  assert.equal(JSON.stringify(forgedTs), JSON.stringify(forgedMjs));

  const echoed = clone(review);
  echoed.reviewed_fit_artifact_ref.posterior_mean_internal = 0.42;
  echoed.review_hash = hashTs(echoed);
  const echoedTs = validateTs(clone(echoed), clone(options));
  const echoedMjs = validateMjs(clone(echoed), clone(options));
  assert.equal(echoedTs.valid, false);
  assert.equal(JSON.stringify(echoedTs), JSON.stringify(echoedMjs));
});
