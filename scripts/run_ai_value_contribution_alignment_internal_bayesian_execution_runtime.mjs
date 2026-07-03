#!/usr/bin/env node

// Thin wrapper over packages/confidence-engine (module 8 of the ported spine).
// The verbatim implementation lives in
// packages/confidence-engine/src/internalBayesianExecutionRuntime.ts; this
// wrapper preserves the CLI and the named module exports byte-for-byte
// (OpenSpec change add-confidence-engine-workspace, task 4.1).

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export {
  CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_RUNTIME_SCHEMA_VERSION,
  contributionAlignmentInternalBayesianExecutionRuntimeHash,
  buildContributionAlignmentInternalBayesianExecutionRuntimeFromObject,
  validateContributionAlignmentInternalBayesianExecutionRuntime
} from "../packages/confidence-engine/dist/internalBayesianExecutionRuntime.js";

import {
  buildContributionAlignmentInternalBayesianExecutionRuntimeFromObject
} from "../packages/confidence-engine/dist/internalBayesianExecutionRuntime.js";

function inputFromCliPath(path) {
  if (path === "-") return JSON.parse(readFileSync(0, "utf8"));
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

function main() {
  const [, , inputPath, windowsPath, ...flags] = process.argv;
  if (!inputPath || !windowsPath) {
    console.error(
      "Usage: node scripts/run_ai_value_contribution_alignment_internal_bayesian_execution_runtime.mjs <internal-bayesian-execution-gate-json|- for stdin> <aggregate-windows-json> [--source-envelope]"
    );
    process.exit(1);
  }
  const sourceGate = inputFromCliPath(inputPath);
  const aggregateWindows = inputFromCliPath(windowsPath);
  const runtime = buildContributionAlignmentInternalBayesianExecutionRuntimeFromObject({
    source_gate: sourceGate,
    aggregate_measurement_cell_windows: aggregateWindows
  });
  if (flags.includes("--source-envelope")) {
    process.stdout.write(`${JSON.stringify({
      source_runtime: runtime,
      source_gate: sourceGate,
      aggregate_measurement_cell_windows: aggregateWindows
    }, null, 2)}\n`);
    return;
  }
  process.stdout.write(`${JSON.stringify(runtime, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
