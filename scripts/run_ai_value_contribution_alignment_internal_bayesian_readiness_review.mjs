#!/usr/bin/env node

// Thin wrapper over packages/confidence-engine (module 5 of the ported spine).
// The verbatim implementation lives in
// packages/confidence-engine/src/internalBayesianReadinessReview.ts; this
// wrapper preserves the CLI and the named module exports byte-for-byte
// (OpenSpec change add-confidence-engine-workspace, task 4.1).

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export {
  CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_READINESS_REVIEW_SCHEMA_VERSION,
  contributionAlignmentInternalBayesianReadinessReviewHash,
  buildContributionAlignmentInternalBayesianReadinessReviewFromObject,
  validateContributionAlignmentInternalBayesianReadinessReview
} from "../packages/confidence-engine/dist/internalBayesianReadinessReview.js";

import {
  buildContributionAlignmentInternalBayesianReadinessReviewFromObject
} from "../packages/confidence-engine/dist/internalBayesianReadinessReview.js";

function inputFromCliPath(path) {
  if (path === "-") return JSON.parse(readFileSync(0, "utf8"));
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

function main() {
  const [, , inputPath] = process.argv;
  if (!inputPath) {
    console.error(
      "Usage: node scripts/run_ai_value_contribution_alignment_internal_bayesian_readiness_review.mjs <weighted-internal-model-frame-json|- for stdin>"
    );
    process.exit(1);
  }
  const review = buildContributionAlignmentInternalBayesianReadinessReviewFromObject(inputFromCliPath(inputPath));
  process.stdout.write(`${JSON.stringify(review, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
