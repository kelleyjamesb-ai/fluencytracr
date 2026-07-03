import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  buildContributionAlignmentBayesianHardeningOrchestratorReportFromObject as buildTs,
  contributionAlignmentBayesianHardeningOrchestratorReportHash as hashTs,
  validateContributionAlignmentBayesianHardeningOrchestratorReport as validateTs
} from "../dist/bayesianHardeningOrchestrator.js";
import {
  buildContributionAlignmentBayesianHardeningOrchestratorReportFromObject as buildMjs,
  validateContributionAlignmentBayesianHardeningOrchestratorReport as validateMjs
} from "../../../scripts/run_ai_value_contribution_alignment_bayesian_hardening_orchestrator.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const golden = (name) => join(here, "golden", name);

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const envelope = readJson(golden("09-internal-bayesian-execution-runtime-source-envelope.json"));
const governedSource = readJson(golden("10-governed-diagnostics-sufficiency-evidence-source.json"));
const packet = readJson(golden("11-diagnostics-evidence-packet.json"));
const adequacyReview = readJson(golden("12-internal-diagnostics-model-adequacy-review.json"));
const promotionGate = readJson(golden("14-bayesian-promotion-decision-gate.json"));
const promotionHandoff = readJson(golden("15-promotion-gate-passed-artifact-handoff.json"));
const artifactV1 = readJson(golden("16-internal-bayesian-execution-artifact-v1.json"));
const goldenReport = readFileSync(golden("17-bayesian-hardening-orchestrator.json"), "utf8");

function explicitGovernedPath() {
  return {
    source_governed_diagnostics_sufficiency_evidence_source: clone(governedSource),
    source_diagnostics_evidence_packet: clone(packet),
    source_diagnostics_review: clone(adequacyReview),
    source_promotion_gate: clone(promotionGate),
    source_promotion_handoff: clone(promotionHandoff),
    source_internal_bayesian_execution_artifact_v1: clone(artifactV1)
  };
}

function goldenInput() {
  return {
    source_runtime: clone(envelope),
    explicit_governed_path: explicitGovernedPath()
  };
}

test("ported bayesian hardening orchestrator reproduces the golden output byte-for-byte", () => {
  const report = buildTs(goldenInput());
  assert.equal(`${JSON.stringify(report, null, 2)}\n`, goldenReport);
  assert.equal(report.report_hash, hashTs(report));
  assert.equal(report.report_state, "BAYESIAN_HARDENING_ORCHESTRATOR_REPORT_READY");
  assert.equal(report.default_execution.confirmed_held, true);
  assert.equal(
    report.default_execution.first_blocked_gate,
    "governed_diagnostics_sufficiency_evidence_source"
  );
  assert.equal(report.report_policy.promotion_authorized, false);
  assert.equal(report.promotion_authority.orchestrator_promotion_authorized, false);
  assert.equal(report.promotion_authority.non_gate_promotion_authorized, false);
  assert.equal(report.verification_status.blocked_outputs_false, true);
  for (const value of Object.values(report.blocked_outputs)) {
    assert.equal(value, false);
  }
});

test("ported bayesian hardening orchestrator matches the .mjs runner byte-for-byte across input paths", () => {
  const inputs = [
    goldenInput(),
    { source_runtime: clone(envelope) },
    clone(envelope),
    { source_runtime: clone(envelope.source_runtime) },
    {
      source_runtime: clone(envelope),
      explicit_governed_path: {
        ...explicitGovernedPath(),
        source_promotion_gate: { ...clone(promotionGate), gate_hash: "a".repeat(64) }
      }
    },
    {
      source_runtime: clone(envelope),
      explicit_governed_path: {
        ...explicitGovernedPath(),
        source_promotion_handoff: { ...clone(promotionHandoff), handoff_hash: "b".repeat(64) }
      }
    },
    { source_runtime: { ...clone(envelope), sidecar: "value" } },
    { source_runtime: clone(envelope), raw_rows: [{ unsafe: true }] },
    { source_runtime: clone(envelope), confidence_output: true },
    {
      source_runtime: clone(envelope),
      explicit_governed_path: { ...explicitGovernedPath(), unsupported_field: true }
    },
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

test("ported bayesian hardening orchestrator validator matches the .mjs validator verdicts and gaps", () => {
  const report = buildTs(goldenInput());
  const noOptionsTs = validateTs(clone(report));
  const noOptionsMjs = validateMjs(clone(report));
  assert.equal(JSON.stringify(noOptionsTs), JSON.stringify(noOptionsMjs));

  const options = {
    sourceRuntime: clone(envelope),
    explicitGovernedPath: explicitGovernedPath()
  };
  const boundTs = validateTs(clone(report), clone(options));
  const boundMjs = validateMjs(clone(report), clone(options));
  assert.equal(JSON.stringify(boundTs), JSON.stringify(boundMjs));

  const forged = clone(report);
  forged.report_policy.promotion_authorized = true;
  forged.promotion_authority.orchestrator_promotion_authorized = true;
  forged.promotion_authority.non_gate_promotion_authorized = true;
  forged.verification_status.explicit_path_validated = true;
  forged.report_hash = hashTs(forged);
  const forgedTs = validateTs(clone(forged), clone(options));
  const forgedMjs = validateMjs(clone(forged), clone(options));
  assert.equal(forgedTs.valid, false);
  assert.equal(JSON.stringify(forgedTs), JSON.stringify(forgedMjs));

  const rejected = buildTs({ source_runtime: clone(envelope), raw_rows: [{ unsafe: true }] });
  const rejectedTs = validateTs(clone(rejected));
  const rejectedMjs = validateMjs(clone(rejected));
  assert.equal(rejectedTs.valid, false);
  assert.equal(JSON.stringify(rejectedTs), JSON.stringify(rejectedMjs));

  const tamperedHash = clone(report);
  tamperedHash.report_hash = "c".repeat(64);
  const tamperedTs = validateTs(clone(tamperedHash), clone(options));
  const tamperedMjs = validateMjs(clone(tamperedHash), clone(options));
  assert.equal(tamperedTs.valid, false);
  assert.equal(JSON.stringify(tamperedTs), JSON.stringify(tamperedMjs));
});
