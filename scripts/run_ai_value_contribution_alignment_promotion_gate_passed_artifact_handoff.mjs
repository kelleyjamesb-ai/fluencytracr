#!/usr/bin/env node

// Thin wrapper over packages/confidence-engine (module 14 of the ported spine).
// The verbatim implementation lives in
// packages/confidence-engine/src/promotionGatePassedArtifactHandoff.ts; this
// wrapper preserves the CLI and the named module exports byte-for-byte
// (OpenSpec change add-confidence-engine-workspace, task 4.1).

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export {
  CONTRIBUTION_ALIGNMENT_PROMOTION_GATE_PASSED_ARTIFACT_HANDOFF_SCHEMA_VERSION,
  contributionAlignmentPromotionGatePassedArtifactHandoffHash,
  buildContributionAlignmentPromotionGatePassedArtifactHandoffFromObject,
  validateContributionAlignmentPromotionGatePassedArtifactHandoff
} from "../packages/confidence-engine/dist/promotionGatePassedArtifactHandoff.js";

import {
  buildContributionAlignmentPromotionGatePassedArtifactHandoffFromObject
} from "../packages/confidence-engine/dist/promotionGatePassedArtifactHandoff.js";

function inputFromCliPath(path) {
  if (path === "-") return JSON.parse(readFileSync(0, "utf8"));
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

function main() {
  const [
    ,
    ,
    sourceRuntimePath,
    governedSourcePath,
    diagnosticsReviewPath,
    diagnosticsEvidencePacketPath,
    promotionGatePath
  ] = process.argv;
  if (!sourceRuntimePath) {
    console.error(
      "Usage: node scripts/run_ai_value_contribution_alignment_promotion_gate_passed_artifact_handoff.mjs <internal-bayesian-execution-runtime-json|- for stdin> [governed-diagnostics-source-json] [diagnostics-review-json] [diagnostics-evidence-packet-json] [promotion-gate-json]"
    );
    process.exit(1);
  }
  const sourceRuntime = inputFromCliPath(sourceRuntimePath);
  const handoffInput = {
    source_runtime: sourceRuntime,
    ...(governedSourcePath
      ? {
          source_governed_diagnostics_sufficiency_evidence_source:
            inputFromCliPath(governedSourcePath)
        }
      : {}),
    ...(diagnosticsReviewPath
      ? { source_diagnostics_review: inputFromCliPath(diagnosticsReviewPath) }
      : {}),
    ...(diagnosticsEvidencePacketPath
      ? {
          source_diagnostics_evidence_packet:
            inputFromCliPath(diagnosticsEvidencePacketPath)
        }
      : {}),
    ...(promotionGatePath
      ? { source_promotion_gate: inputFromCliPath(promotionGatePath) }
      : {})
  };
  const handoff = buildContributionAlignmentPromotionGatePassedArtifactHandoffFromObject(handoffInput);
  process.stdout.write(`${JSON.stringify(handoff, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
