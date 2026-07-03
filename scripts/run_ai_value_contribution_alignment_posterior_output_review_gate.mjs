#!/usr/bin/env node

// Thin wrapper over packages/confidence-engine (module 12 of the ported spine).
// The verbatim implementation lives in
// packages/confidence-engine/src/posteriorOutputReviewGate.ts; this wrapper
// preserves the CLI and the named module exports byte-for-byte (OpenSpec
// change add-confidence-engine-workspace, task 4.1).

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export {
  CONTRIBUTION_ALIGNMENT_POSTERIOR_OUTPUT_REVIEW_GATE_SCHEMA_VERSION,
  contributionAlignmentPosteriorOutputReviewGateHash,
  buildContributionAlignmentPosteriorOutputReviewGateFromObject,
  validateContributionAlignmentPosteriorOutputReviewGate
} from "../packages/confidence-engine/dist/posteriorOutputReviewGate.js";

import {
  buildContributionAlignmentPosteriorOutputReviewGateFromObject
} from "../packages/confidence-engine/dist/posteriorOutputReviewGate.js";

function inputFromCliPath(path) {
  if (path === "-") return JSON.parse(readFileSync(0, "utf8"));
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

function main() {
  const [, , inputPath] = process.argv;
  if (!inputPath) {
    console.error(
      "Usage: node scripts/run_ai_value_contribution_alignment_posterior_output_review_gate.mjs <internal-bayesian-execution-runtime-json|- for stdin>"
    );
    process.exit(1);
  }
  const review = buildContributionAlignmentPosteriorOutputReviewGateFromObject(inputFromCliPath(inputPath));
  process.stdout.write(`${JSON.stringify(review, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
