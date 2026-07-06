import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  buildContributionAlignmentBayesianModelSpecificationFromObject as buildTs,
  contributionAlignmentBayesianModelSpecificationHash as hashTs,
  validateContributionAlignmentBayesianModelSpecification as validateTs
} from "../dist/index.js";
import {
  buildContributionAlignmentBayesianModelSpecificationFromObject as buildMjs,
  validateContributionAlignmentBayesianModelSpecification as validateMjs
} from "../../../scripts/run_ai_value_contribution_alignment_bayesian_model_specification.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const golden = (name) => join(here, "golden", name);

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const sourceFrame = readJson(golden("04-weighted-internal-model-frame.json"));
const sourceReview = readJson(golden("05-internal-bayesian-readiness-review.json"));
const goldenSpecification = readFileSync(golden("06-bayesian-model-specification.json"), "utf8");

test("ported model specification reproduces the golden output byte-for-byte", () => {
  const specification = buildTs({ source_readiness_review: sourceReview });
  assert.equal(`${JSON.stringify(specification, null, 2)}\n`, goldenSpecification);
  assert.equal(specification.specification_state, "BAYESIAN_MODEL_SPECIFICATION_READY");
  assert.equal(specification.specification_hash, hashTs(specification));
  assert.equal(
    specification.statistical_design_contract.model_equation_family,
    "hierarchical_difference_in_differences_design_contract"
  );
  assert.equal(specification.model_contract.execution_state, "not_executed");
});

test("ported model specification matches the .mjs runner byte-for-byte across input paths", () => {
  const inputs = [
    { source_readiness_review: sourceReview },
    sourceReview,
    { source_readiness_review: sourceReview, source_frame: sourceFrame },
    { source_readiness_review: { ...sourceReview, review_state: "NOT_READY" } },
    { source_readiness_review: { ...sourceReview, review_hash: "a".repeat(64) } },
    {
      source_readiness_review: (() => {
        const tampered = clone(sourceReview);
        tampered.reviewed_feature_weights = tampered.reviewed_feature_weights.slice(1);
        return tampered;
      })()
    },
    { source_readiness_review: sourceReview, raw_rows: [{ unsafe: true }] },
    { source_readiness_review: sourceReview, sidecar: "value" },
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

test("ported model specification validator matches the .mjs validator verdicts and gaps", () => {
  const ready = buildTs({ source_readiness_review: sourceReview });
  const options = { sourceReadinessReview: sourceReview, sourceFrame };
  const readyTs = validateTs(ready, clone(options));
  const readyMjs = validateMjs(clone(ready), clone(options));
  assert.equal(readyTs.valid, true, readyTs.gaps.join("; "));
  assert.equal(JSON.stringify(readyTs), JSON.stringify(readyMjs));

  const forged = clone(ready);
  forged.specification_policy.bayesian_execution_authorized = true;
  const forgedTs = validateTs(forged);
  const forgedMjs = validateMjs(clone(forged));
  assert.equal(forgedTs.valid, false);
  assert.equal(JSON.stringify(forgedTs), JSON.stringify(forgedMjs));

  const drifted = clone(ready);
  drifted.data_adequacy_requirements.raw_rows_allowed = true;
  const driftedTs = validateTs(drifted);
  const driftedMjs = validateMjs(clone(drifted));
  assert.equal(driftedTs.valid, false);
  assert.equal(JSON.stringify(driftedTs), JSON.stringify(driftedMjs));

  const executionDrift = clone(ready);
  executionDrift.model_contract.execution_state = "executed";
  const executionTs = validateTs(executionDrift);
  const executionMjs = validateMjs(clone(executionDrift));
  assert.equal(executionTs.valid, false);
  assert.equal(JSON.stringify(executionTs), JSON.stringify(executionMjs));
});
