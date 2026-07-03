import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  buildContributionAlignmentInternalDiagnosticsModelAdequacyReviewFromObject as buildTs,
  contributionAlignmentInternalDiagnosticsModelAdequacyReviewHash as hashTs,
  validateContributionAlignmentInternalDiagnosticsModelAdequacyReview as validateTs
} from "../dist/index.js";
import {
  buildContributionAlignmentInternalDiagnosticsModelAdequacyReviewFromObject as buildMjs,
  validateContributionAlignmentInternalDiagnosticsModelAdequacyReview as validateMjs
} from "../../../scripts/run_ai_value_contribution_alignment_internal_diagnostics_model_adequacy_review.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const golden = (name) => join(here, "golden", name);

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const envelope = readJson(golden("09-internal-bayesian-execution-runtime-source-envelope.json"));
const governedSource = readJson(golden("10-governed-diagnostics-sufficiency-evidence-source.json"));
const goldenReview = readFileSync(golden("12-internal-diagnostics-model-adequacy-review.json"), "utf8");

test("ported adequacy review reproduces the golden output byte-for-byte", () => {
  const review = buildTs(clone(envelope));
  assert.equal(`${JSON.stringify(review, null, 2)}\n`, goldenReview);
  assert.equal(review.review_hash, hashTs(review));
  assert.equal(review.promotion_review.promotion_blocked, true);
  assert.equal(review.promotion_review.promotion_authorized, false);
  assert.equal(review.comparison_design_adequacy.causal_claim_authorized, false);
});

test("ported adequacy review matches the .mjs runner byte-for-byte across input paths", () => {
  const bareRuntime = clone(envelope.source_runtime);
  const inputs = [
    clone(envelope),
    { source_runtime: clone(envelope) },
    bareRuntime,
    { source_runtime: bareRuntime },
    {
      source_runtime: clone(envelope),
      source_diagnostics_sufficiency_evidence: clone(governedSource)
    },
    { source_runtime: { ...bareRuntime, runtime_hash: "a".repeat(64) } },
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

test("ported adequacy review validator matches the .mjs validator verdicts and gaps", () => {
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
  assert.equal(JSON.stringify(boundTs), JSON.stringify(boundMjs));

  const forged = clone(review);
  forged.promotion_review.promotion_authorized = true;
  forged.review_hash = hashTs(forged);
  const forgedTs = validateTs(clone(forged));
  const forgedMjs = validateMjs(clone(forged));
  assert.equal(forgedTs.valid, false);
  assert.equal(JSON.stringify(forgedTs), JSON.stringify(forgedMjs));

  const echoed = clone(review);
  echoed.reviewed_fixture_artifact_ref.posterior_mean_internal = 0.5;
  echoed.review_hash = hashTs(echoed);
  const echoedTs = validateTs(clone(echoed));
  const echoedMjs = validateMjs(clone(echoed));
  assert.equal(echoedTs.valid, false);
  assert.equal(JSON.stringify(echoedTs), JSON.stringify(echoedMjs));
});
