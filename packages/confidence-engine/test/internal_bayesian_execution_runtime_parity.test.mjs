import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  buildContributionAlignmentInternalBayesianExecutionRuntimeFromObject as buildTs,
  contributionAlignmentInternalBayesianExecutionRuntimeHash as hashTs,
  validateContributionAlignmentInternalBayesianExecutionRuntime as validateTs
} from "../dist/index.js";
import {
  buildContributionAlignmentInternalBayesianExecutionRuntimeFromObject as buildMjs,
  validateContributionAlignmentInternalBayesianExecutionRuntime as validateMjs
} from "../../../scripts/run_ai_value_contribution_alignment_internal_bayesian_execution_runtime.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const golden = (name) => join(here, "golden", name);
const repoRoot = join(here, "..", "..", "..");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const sourceGate = readJson(golden("07-internal-bayesian-execution-gate.json"));
const aggregateWindows = readJson(
  join(
    repoRoot,
    "docs/contracts/ai-value-contribution-alignment-internal-bayesian-execution-runtime/examples/aggregate-window-runtime-fixture.json"
  )
);
const goldenRuntime = readFileSync(golden("08-internal-bayesian-execution-runtime.json"), "utf8");
const goldenEnvelope = readJson(golden("09-internal-bayesian-execution-runtime-source-envelope.json"));

test("ported execution runtime reproduces the golden output byte-for-byte", () => {
  const runtime = buildTs({
    source_gate: sourceGate,
    aggregate_measurement_cell_windows: aggregateWindows
  });
  assert.equal(`${JSON.stringify(runtime, null, 2)}\n`, goldenRuntime);
  assert.equal(runtime.runtime_state, "INTERNAL_BAYESIAN_FIXTURE_EXECUTION_PROTOTYPE_HELD_FOR_REVIEW");
  assert.equal(runtime.runtime_hash, hashTs(runtime));
  assert.equal(runtime.internal_fit_artifact.prior_mean, 0);
  assert.equal(runtime.internal_fit_artifact.prior_sd, 1);
  assert.equal(runtime.internal_fit_artifact.interpretation_ready, false);
  assert.equal(runtime.internal_fit_artifact.posterior_output_review_required, true);
});

test("ported execution runtime matches the golden source envelope runtime", () => {
  const runtime = buildTs({
    source_gate: sourceGate,
    aggregate_measurement_cell_windows: aggregateWindows
  });
  assert.equal(JSON.stringify(runtime), JSON.stringify(goldenEnvelope.source_runtime));
});

test("ported execution runtime matches the .mjs runner byte-for-byte across input paths", () => {
  const shrunkWindows = clone(aggregateWindows);
  shrunkWindows[0].cohort_size = 3;
  const inputs = [
    { source_gate: sourceGate, aggregate_measurement_cell_windows: aggregateWindows },
    { source_gate: sourceGate, aggregate_measurement_cell_windows: aggregateWindows.slice(1) },
    { source_gate: sourceGate, aggregate_measurement_cell_windows: shrunkWindows },
    { source_gate: { ...sourceGate, gate_state: "NOT_READY" }, aggregate_measurement_cell_windows: aggregateWindows },
    { source_gate: { ...sourceGate, gate_hash: "a".repeat(64) }, aggregate_measurement_cell_windows: aggregateWindows },
    { source_gate: sourceGate },
    {
      source_gate: sourceGate,
      aggregate_measurement_cell_windows: aggregateWindows,
      raw_rows: [{ unsafe: true }]
    },
    { source_gate: sourceGate, aggregate_measurement_cell_windows: aggregateWindows, sidecar: "x" },
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

test("ported execution runtime validator matches the .mjs validator verdicts and gaps", () => {
  const ready = buildTs({
    source_gate: sourceGate,
    aggregate_measurement_cell_windows: aggregateWindows
  });
  const options = { sourceGate, aggregateMeasurementCellWindows: aggregateWindows };
  const readyTs = validateTs(ready, clone(options));
  const readyMjs = validateMjs(clone(ready), clone(options));
  assert.equal(readyTs.valid, true, readyTs.gaps.join("; "));
  assert.equal(JSON.stringify(readyTs), JSON.stringify(readyMjs));

  const missingBinding = validateTs(clone(ready), {});
  const missingBindingMjs = validateMjs(clone(ready), {});
  assert.equal(missingBinding.valid, false);
  assert.equal(JSON.stringify(missingBinding), JSON.stringify(missingBindingMjs));

  const forged = clone(ready);
  forged.internal_fit_artifact.interpretation_ready = true;
  const forgedTs = validateTs(forged, clone(options));
  const forgedMjs = validateMjs(clone(forged), clone(options));
  assert.equal(forgedTs.valid, false);
  assert.equal(JSON.stringify(forgedTs), JSON.stringify(forgedMjs));

  const tamperedPosterior = clone(ready);
  tamperedPosterior.internal_fit_artifact.posterior_mean_internal = 999;
  const tamperedTs = validateTs(tamperedPosterior, clone(options));
  const tamperedMjs = validateMjs(clone(tamperedPosterior), clone(options));
  assert.equal(tamperedTs.valid, false);
  assert.equal(JSON.stringify(tamperedTs), JSON.stringify(tamperedMjs));
});
