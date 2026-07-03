#!/usr/bin/env node

// Thin wrapper over packages/confidence-engine (module 9 of the ported spine).
// The verbatim implementation lives in
// packages/confidence-engine/src/governedDiagnosticsSufficiencyEvidenceSource.ts;
// this wrapper preserves the CLI and the named module exports byte-for-byte
// (OpenSpec change add-confidence-engine-workspace, task 4.1).

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export {
  CONTRIBUTION_ALIGNMENT_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE_SCHEMA_VERSION,
  contributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceHash,
  buildContributionAlignmentDiagnosticsSufficiencyEvidenceFromGovernedSource,
  buildContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceFromObject,
  validateContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSource
} from "../packages/confidence-engine/dist/governedDiagnosticsSufficiencyEvidenceSource.js";

import {
  buildContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceFromObject
} from "../packages/confidence-engine/dist/governedDiagnosticsSufficiencyEvidenceSource.js";

function inputFromCliPath(path) {
  if (path === "-") return JSON.parse(readFileSync(0, "utf8"));
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

function main() {
  const [, , sourceRuntimePath, reviewedEvidencePath] = process.argv;
  if (!sourceRuntimePath) {
    console.error(
      "Usage: node scripts/run_ai_value_contribution_alignment_governed_diagnostics_sufficiency_evidence_source.mjs <internal-bayesian-execution-runtime-json|- for stdin> [reviewed-diagnostics-source-evidence-json]"
    );
    process.exit(1);
  }
  const sourceRuntime = inputFromCliPath(sourceRuntimePath);
  const source = buildContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceFromObject(
    reviewedEvidencePath
      ? {
          source_runtime: sourceRuntime,
          reviewed_diagnostics_source_evidence: inputFromCliPath(reviewedEvidencePath)
        }
      : sourceRuntime
  );
  process.stdout.write(`${JSON.stringify(source, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
