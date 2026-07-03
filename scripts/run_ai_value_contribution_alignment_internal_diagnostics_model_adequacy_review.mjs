#!/usr/bin/env node

// Thin wrapper over packages/confidence-engine (module 11 of the ported spine).
// The verbatim implementation lives in
// packages/confidence-engine/src/internalDiagnosticsModelAdequacyReview.ts;
// this wrapper preserves the CLI and the named module exports byte-for-byte
// (OpenSpec change add-confidence-engine-workspace, task 4.1).

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export {
  CONTRIBUTION_ALIGNMENT_INTERNAL_DIAGNOSTICS_MODEL_ADEQUACY_REVIEW_SCHEMA_VERSION,
  contributionAlignmentInternalDiagnosticsModelAdequacyReviewHash,
  buildContributionAlignmentInternalDiagnosticsModelAdequacyReviewFromObject,
  validateContributionAlignmentInternalDiagnosticsModelAdequacyReview
} from "../packages/confidence-engine/dist/internalDiagnosticsModelAdequacyReview.js";

import {
  buildContributionAlignmentInternalDiagnosticsModelAdequacyReviewFromObject
} from "../packages/confidence-engine/dist/internalDiagnosticsModelAdequacyReview.js";

function inputFromCliPath(path) {
  if (path === "-") return JSON.parse(readFileSync(0, "utf8"));
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

function main() {
  const [, , inputPath, sourceDiagnosticsSufficiencyEvidencePath] = process.argv;
  if (!inputPath) {
    console.error(
      "Usage: node scripts/run_ai_value_contribution_alignment_internal_diagnostics_model_adequacy_review.mjs <internal-bayesian-execution-runtime-json|- for stdin> [governed-diagnostics-sufficiency-evidence-source-json]"
    );
    process.exit(1);
  }
  const sourceRuntime = inputFromCliPath(inputPath);
  const review = buildContributionAlignmentInternalDiagnosticsModelAdequacyReviewFromObject(
    sourceDiagnosticsSufficiencyEvidencePath
      ? {
          source_runtime: sourceRuntime,
          source_diagnostics_sufficiency_evidence:
            inputFromCliPath(sourceDiagnosticsSufficiencyEvidencePath)
        }
      : sourceRuntime
  );
  process.stdout.write(`${JSON.stringify(review, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
