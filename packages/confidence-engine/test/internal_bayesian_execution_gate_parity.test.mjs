import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  buildContributionAlignmentInternalBayesianExecutionGateFromObject as buildTs,
  contributionAlignmentInternalBayesianExecutionGateHash as hashTs,
  validateContributionAlignmentInternalBayesianExecutionGate as validateTs
} from "../dist/index.js";
import {
  buildContributionAlignmentInternalBayesianExecutionGateFromObject as buildMjs,
  validateContributionAlignmentInternalBayesianExecutionGate as validateMjs
} from "../../../scripts/run_ai_value_contribution_alignment_internal_bayesian_execution_gate.mjs";

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
const sourceSpecification = readJson(golden("06-bayesian-model-specification.json"));
const goldenGate = readFileSync(golden("07-internal-bayesian-execution-gate.json"), "utf8");

test("ported execution gate reproduces the golden output byte-for-byte", () => {
  const gate = buildTs({ source_specification: sourceSpecification });
  assert.equal(`${JSON.stringify(gate, null, 2)}\n`, goldenGate);
  assert.equal(gate.gate_state, "INTERNAL_BAYESIAN_EXECUTION_GATE_READY");
  assert.equal(gate.gate_hash, hashTs(gate));
  assert.equal(gate.execution_contract.execution_state, "not_executed");
  assert.equal(gate.gate_policy.bayesian_execution_authorized, false);
});

test("ported execution gate matches the .mjs runner byte-for-byte across input paths", () => {
  const inputs = [
    { source_specification: sourceSpecification },
    sourceSpecification,
    {
      source_specification: sourceSpecification,
      source_readiness_review: sourceReview,
      source_frame: sourceFrame
    },
    { source_specification: { ...sourceSpecification, specification_state: "NOT_READY" } },
    { source_specification: { ...sourceSpecification, specification_hash: "a".repeat(64) } },
    {
      source_specification: (() => {
        const tampered = clone(sourceSpecification);
        tampered.data_adequacy_requirements.raw_rows_allowed = true;
        return tampered;
      })()
    },
    { source_specification: sourceSpecification, raw_rows: [{ unsafe: true }] },
    { source_specification: sourceSpecification, sidecar: "value" },
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

test("ported execution gate validator matches the .mjs validator verdicts and gaps", () => {
  const ready = buildTs({ source_specification: sourceSpecification });
  const options = {
    sourceSpecification,
    sourceReadinessReview: sourceReview,
    sourceFrame
  };
  const readyTs = validateTs(ready, clone(options));
  const readyMjs = validateMjs(clone(ready), clone(options));
  assert.equal(readyTs.valid, true, readyTs.gaps.join("; "));
  assert.equal(JSON.stringify(readyTs), JSON.stringify(readyMjs));

  const forged = clone(ready);
  forged.gate_policy.bayesian_execution_authorized = true;
  const forgedTs = validateTs(forged);
  const forgedMjs = validateMjs(clone(forged));
  assert.equal(forgedTs.valid, false);
  assert.equal(JSON.stringify(forgedTs), JSON.stringify(forgedMjs));

  const drifted = clone(ready);
  drifted.runtime_prerequisites.no_live_connectors = false;
  const driftedTs = validateTs(drifted);
  const driftedMjs = validateMjs(clone(drifted));
  assert.equal(driftedTs.valid, false);
  assert.equal(JSON.stringify(driftedTs), JSON.stringify(driftedMjs));

  const executionDrift = clone(ready);
  executionDrift.execution_contract.execution_state = "executed";
  const executionTs = validateTs(executionDrift);
  const executionMjs = validateMjs(clone(executionDrift));
  assert.equal(executionTs.valid, false);
  assert.equal(JSON.stringify(executionTs), JSON.stringify(executionMjs));
});
