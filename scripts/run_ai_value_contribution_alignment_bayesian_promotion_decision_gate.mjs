#!/usr/bin/env node

// Thin wrapper over packages/confidence-engine (module 13 of the ported spine).
// The verbatim implementation lives in
// packages/confidence-engine/src/bayesianPromotionDecisionGate.ts; this
// wrapper preserves the CLI and the named module exports byte-for-byte
// (OpenSpec change add-confidence-engine-workspace, task 4.1).

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export {
  CONTRIBUTION_ALIGNMENT_BAYESIAN_PROMOTION_DECISION_GATE_SCHEMA_VERSION,
  contributionAlignmentBayesianPromotionDecisionGateHash,
  buildContributionAlignmentBayesianPromotionDecisionGateFromObject,
  validateContributionAlignmentBayesianPromotionDecisionGate
} from "../packages/confidence-engine/dist/bayesianPromotionDecisionGate.js";

import {
  buildContributionAlignmentBayesianPromotionDecisionGateFromObject
} from "../packages/confidence-engine/dist/bayesianPromotionDecisionGate.js";

function inputFromCliPath(path) {
  if (path === "-") return JSON.parse(readFileSync(0, "utf8"));
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

function main() {
  const [, , inputPath, sourceRuntimePath, sourceDiagnosticsEvidencePacketPath] = process.argv;
  if (!inputPath) {
    console.error(
      "Usage: node scripts/run_ai_value_contribution_alignment_bayesian_promotion_decision_gate.mjs <diagnostics-model-adequacy-review-json|- for stdin> [source-runtime-json] [diagnostics-evidence-packet-json]"
    );
    process.exit(1);
  }
  const sourceDiagnosticsReview = inputFromCliPath(inputPath);
  const input = sourceRuntimePath
    ? {
        source_diagnostics_review: sourceDiagnosticsReview,
        source_runtime: inputFromCliPath(sourceRuntimePath),
        ...(sourceDiagnosticsEvidencePacketPath
          ? {
              source_diagnostics_evidence_packet:
                inputFromCliPath(sourceDiagnosticsEvidencePacketPath)
            }
          : {})
      }
    : sourceDiagnosticsReview;
  const gate = buildContributionAlignmentBayesianPromotionDecisionGateFromObject(
    input
  );
  process.stdout.write(`${JSON.stringify(gate, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
