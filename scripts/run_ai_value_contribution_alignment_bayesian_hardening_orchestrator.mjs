#!/usr/bin/env node

// Thin wrapper over packages/confidence-engine (module 16 of the ported spine).
// The verbatim implementation lives in
// packages/confidence-engine/src/bayesianHardeningOrchestrator.ts; this
// wrapper preserves the CLI and the named module exports byte-for-byte
// (OpenSpec change add-confidence-engine-workspace, task 4.1).

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export {
  CONTRIBUTION_ALIGNMENT_BAYESIAN_HARDENING_ORCHESTRATOR_SCHEMA_VERSION,
  contributionAlignmentBayesianHardeningOrchestratorReportHash,
  buildContributionAlignmentBayesianHardeningOrchestratorReportFromObject,
  validateContributionAlignmentBayesianHardeningOrchestratorReport
} from "../packages/confidence-engine/dist/bayesianHardeningOrchestrator.js";

import {
  buildContributionAlignmentBayesianHardeningOrchestratorReportFromObject
} from "../packages/confidence-engine/dist/bayesianHardeningOrchestrator.js";

function inputFromCliPath(path) {
  if (path === "-") return JSON.parse(readFileSync(0, "utf8"));
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

function parseOptionalCliPaths(args) {
  const positional = [];
  let reviewedDiagnosticsSourceEvidencePath = null;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--reviewed-diagnostics-source-evidence") {
      reviewedDiagnosticsSourceEvidencePath = args[index + 1] ?? null;
      index += 1;
    } else if (arg.startsWith("--reviewed-diagnostics-source-evidence=")) {
      reviewedDiagnosticsSourceEvidencePath = arg.split("=").slice(1).join("=");
    } else {
      positional.push(arg);
    }
  }
  return { reviewedDiagnosticsSourceEvidencePath, positional };
}

function main() {
  const [, , runtimePath, ...rawOptionalPaths] = process.argv;
  const {
    reviewedDiagnosticsSourceEvidencePath,
    positional: [
      governedSourcePath,
      diagnosticsPacketPath,
      diagnosticsReviewPath,
      promotionGatePath,
      promotionHandoffPath,
      artifactV1Path
    ]
  } = parseOptionalCliPaths(rawOptionalPaths);
  if (!runtimePath) {
    console.error(
      "Usage: node scripts/run_ai_value_contribution_alignment_bayesian_hardening_orchestrator.mjs <runtime-json|- for stdin> [--reviewed-diagnostics-source-evidence <reviewed-evidence-json>] [governed-source-json] [diagnostics-packet-json] [diagnostics-review-json] [promotion-gate-json] [promotion-handoff-json] [artifact-v1-json]"
    );
    process.exit(1);
  }
  const sourceRuntime = inputFromCliPath(runtimePath);
  const explicit_governed_path = governedSourcePath || reviewedDiagnosticsSourceEvidencePath
    ? {
        ...(reviewedDiagnosticsSourceEvidencePath
          ? {
              source_reviewed_diagnostics_source_evidence:
                inputFromCliPath(reviewedDiagnosticsSourceEvidencePath)
            }
          : {}),
        ...(governedSourcePath
          ? {
              source_governed_diagnostics_sufficiency_evidence_source:
                inputFromCliPath(governedSourcePath)
            }
          : {}),
        ...(diagnosticsPacketPath
          ? { source_diagnostics_evidence_packet: inputFromCliPath(diagnosticsPacketPath) }
          : {}),
        ...(diagnosticsReviewPath
          ? { source_diagnostics_review: inputFromCliPath(diagnosticsReviewPath) }
          : {}),
        ...(promotionGatePath
          ? { source_promotion_gate: inputFromCliPath(promotionGatePath) }
          : {}),
        ...(promotionHandoffPath
          ? { source_promotion_handoff: inputFromCliPath(promotionHandoffPath) }
          : {}),
        ...(artifactV1Path
          ? { source_internal_bayesian_execution_artifact_v1: inputFromCliPath(artifactV1Path) }
          : {})
      }
    : undefined;
  const report = buildContributionAlignmentBayesianHardeningOrchestratorReportFromObject({
    source_runtime: sourceRuntime,
    ...(explicit_governed_path ? { explicit_governed_path } : {})
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
