#!/usr/bin/env node

// Thin wrapper over packages/confidence-engine (module 15 of the ported spine).
// The verbatim implementation lives in
// packages/confidence-engine/src/internalBayesianExecutionArtifactV1.ts; this
// wrapper preserves the CLI and the named module exports byte-for-byte
// (OpenSpec change add-confidence-engine-workspace, task 4.1).

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export {
  CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_ARTIFACT_V1_SCHEMA_VERSION,
  contributionAlignmentInternalBayesianExecutionArtifactV1Hash,
  buildContributionAlignmentInternalBayesianExecutionArtifactV1FromObject,
  validateContributionAlignmentInternalBayesianExecutionArtifactV1
} from "../packages/confidence-engine/dist/internalBayesianExecutionArtifactV1.js";

import {
  buildContributionAlignmentInternalBayesianExecutionArtifactV1FromObject
} from "../packages/confidence-engine/dist/internalBayesianExecutionArtifactV1.js";

function inputFromCliPath(path) {
  if (path === "-") return JSON.parse(readFileSync(0, "utf8"));
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

function main() {
  const [
    ,
    ,
    promotionHandoffPath,
    promotionGatePath,
    runtimePath,
    diagnosticsReviewPath,
    diagnosticsEvidencePacketPath,
    governedSourcePath
  ] = process.argv;
  if (!promotionHandoffPath) {
    console.error(
      "Usage: node scripts/run_ai_value_contribution_alignment_internal_bayesian_execution_artifact_v1.mjs <promotion-gate-passed-handoff-json|- for stdin> [promotion-gate-json] [runtime-json] [diagnostics-review-json] [diagnostics-evidence-packet-json] [governed-diagnostics-source-json]"
    );
    process.exit(1);
  }
  const artifact = buildContributionAlignmentInternalBayesianExecutionArtifactV1FromObject({
    source_promotion_handoff: inputFromCliPath(promotionHandoffPath),
    ...(promotionGatePath ? { source_promotion_gate: inputFromCliPath(promotionGatePath) } : {}),
    ...(runtimePath ? { source_runtime: inputFromCliPath(runtimePath) } : {}),
    ...(diagnosticsReviewPath
      ? { source_diagnostics_review: inputFromCliPath(diagnosticsReviewPath) }
      : {}),
    ...(diagnosticsEvidencePacketPath
      ? { source_diagnostics_evidence_packet: inputFromCliPath(diagnosticsEvidencePacketPath) }
      : {}),
    ...(governedSourcePath
      ? {
          source_governed_diagnostics_sufficiency_evidence_source:
            inputFromCliPath(governedSourcePath)
        }
      : {})
  });
  process.stdout.write(`${JSON.stringify(artifact, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
