import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  buildContributionAlignmentFeatureStabilityReviewFromObject as buildTs,
  contributionAlignmentFeatureStabilityReviewHash as hashTs,
  validateContributionAlignmentFeatureStabilityReview as validateTs,
  CONTRIBUTION_ALIGNMENT_INTERNAL_RESEARCH_MATH_DATA_MODEL_SCHEMA_VERSION as RMDM_VERSION_TS
} from "../dist/index.js";
import {
  buildContributionAlignmentFeatureStabilityReviewFromObject as buildMjs,
  validateContributionAlignmentFeatureStabilityReview as validateMjs
} from "../../../scripts/run_ai_value_contribution_alignment_feature_stability_review.mjs";
import {
  CONTRIBUTION_ALIGNMENT_INTERNAL_RESEARCH_MATH_DATA_MODEL_SCHEMA_VERSION as RMDM_VERSION_MJS
} from "../../../scripts/run_ai_value_contribution_alignment_internal_research_math_data_model.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const golden = (name) => join(here, "golden", name);

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const sourceDataModel = readJson(golden("00-internal-research-math-data-model.json"));
const goldenReview = readFileSync(golden("01-feature-stability-review.json"), "utf8");

test("inlined research data model schema version is pinned to the .mjs original", () => {
  assert.equal(RMDM_VERSION_TS, RMDM_VERSION_MJS);
});

test("ported module reproduces the golden review byte-for-byte", () => {
  const review = buildTs({ source_data_model: sourceDataModel });
  assert.equal(`${JSON.stringify(review, null, 2)}\n`, goldenReview);
  assert.equal(review.review_state, "FEATURE_STABILITY_REVIEW_PASSED_FOR_INTERNAL_WEIGHT_DECISION");
  assert.equal(review.review_hash, hashTs(review));
});

test("ported module matches the .mjs runner byte-for-byte on ready, held, and rejected paths", () => {
  const inputs = [
    { source_data_model: sourceDataModel },
    sourceDataModel,
    { source_data_model: { ...sourceDataModel, data_model_state: "NOT_READY" } },
    { source_data_model: { ...sourceDataModel, data_model_hash: "a".repeat(64) } },
    {
      source_data_model: (() => {
        const tampered = clone(sourceDataModel);
        tampered.component_registry = tampered.component_registry.slice(1);
        return tampered;
      })()
    },
    { source_data_model: sourceDataModel, raw_rows: [{ unsafe: true }] },
    { source_data_model: sourceDataModel, sidecar: "value" },
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

test("ported validator matches the .mjs validator verdicts and gaps", () => {
  const ready = buildTs({ source_data_model: sourceDataModel });
  const readyTs = validateTs(ready, { sourceDataModel });
  const readyMjs = validateMjs(clone(ready), { sourceDataModel });
  assert.equal(readyTs.valid, true, readyTs.gaps.join("; "));
  assert.equal(JSON.stringify(readyTs), JSON.stringify(readyMjs));

  const forged = clone(ready);
  forged.feature_stability.numeric_weights_authorized = true;
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
