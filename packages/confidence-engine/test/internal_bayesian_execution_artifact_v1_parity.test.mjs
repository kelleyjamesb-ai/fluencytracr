import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  buildContributionAlignmentInternalBayesianExecutionArtifactV1FromObject as buildTs,
  contributionAlignmentInternalBayesianExecutionArtifactV1Hash as hashTs,
  validateContributionAlignmentInternalBayesianExecutionArtifactV1 as validateTs
} from "../dist/internalBayesianExecutionArtifactV1.js";
import {
  buildContributionAlignmentInternalBayesianExecutionArtifactV1FromObject as buildMjs,
  validateContributionAlignmentInternalBayesianExecutionArtifactV1 as validateMjs
} from "../../../scripts/run_ai_value_contribution_alignment_internal_bayesian_execution_artifact_v1.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const golden = (name) => join(here, "golden", name);

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const handoff = readJson(golden("15-promotion-gate-passed-artifact-handoff.json"));
const promotionGate = readJson(golden("14-bayesian-promotion-decision-gate.json"));
const envelope = readJson(golden("09-internal-bayesian-execution-runtime-source-envelope.json"));
const adequacyReview = readJson(golden("12-internal-diagnostics-model-adequacy-review.json"));
const packet = readJson(golden("11-diagnostics-evidence-packet.json"));
const governedSource = readJson(golden("10-governed-diagnostics-sufficiency-evidence-source.json"));
const goldenArtifact = readFileSync(golden("16-internal-bayesian-execution-artifact-v1.json"), "utf8");

function goldenInput() {
  return {
    source_promotion_handoff: clone(handoff),
    source_promotion_gate: clone(promotionGate),
    source_runtime: clone(envelope),
    source_diagnostics_review: clone(adequacyReview),
    source_diagnostics_evidence_packet: clone(packet),
    source_governed_diagnostics_sufficiency_evidence_source: clone(governedSource)
  };
}

test("ported internal Bayesian execution artifact v1 reproduces the golden output byte-for-byte", () => {
  const artifact = buildTs(goldenInput());
  assert.equal(`${JSON.stringify(artifact, null, 2)}\n`, goldenArtifact);
  assert.equal(artifact.artifact_hash, hashTs(artifact));
  assert.equal(artifact.artifact_policy.promotion_authorized, false);
  assert.equal(artifact.artifact_policy.posterior_interpretation_authorized, false);
  assert.equal(artifact.interpretation_policy.posterior_output_authorized, false);
  assert.equal(artifact.interpretation_policy.confidence_output_authorized, false);
  assert.equal(
    artifact.posterior_values_containment_policy.posterior_interpretation_authorized,
    false
  );
  assert.equal(artifact.feeds.posterior_interpretation_specification_gate, false);
});

test("ported internal Bayesian execution artifact v1 matches the .mjs runner byte-for-byte across input paths", () => {
  const inputs = [
    goldenInput(),
    { source_promotion_handoff: clone(handoff) },
    clone(handoff),
    { source_promotion_handoff: clone(handoff), source_promotion_gate: clone(promotionGate) },
    { ...goldenInput(), source_runtime: clone(envelope.source_runtime) },
    {
      ...goldenInput(),
      source_promotion_gate: { ...clone(promotionGate), gate_hash: "a".repeat(64) }
    },
    {
      ...goldenInput(),
      source_promotion_handoff: { ...clone(handoff), handoff_hash: "b".repeat(64) }
    },
    { ...goldenInput(), source_runtime: { ...clone(envelope), sidecar: "value" } },
    { ...goldenInput(), raw_rows: [{ unsafe: true }] },
    { ...goldenInput(), confidence_output: true },
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

test("ported internal Bayesian execution artifact v1 validator matches the .mjs validator verdicts and gaps", () => {
  const artifact = buildTs(goldenInput());
  const noOptionsTs = validateTs(clone(artifact));
  const noOptionsMjs = validateMjs(clone(artifact));
  assert.equal(JSON.stringify(noOptionsTs), JSON.stringify(noOptionsMjs));

  const options = {
    sourcePromotionHandoff: clone(handoff),
    sourcePromotionGate: clone(promotionGate),
    sourceRuntime: clone(envelope),
    sourceDiagnosticsReview: clone(adequacyReview),
    sourceDiagnosticsEvidencePacket: clone(packet),
    sourceGovernedDiagnosticsSufficiencyEvidenceSource: clone(governedSource)
  };
  const boundTs = validateTs(clone(artifact), clone(options));
  const boundMjs = validateMjs(clone(artifact), clone(options));
  assert.equal(JSON.stringify(boundTs), JSON.stringify(boundMjs));

  const forged = clone(artifact);
  forged.artifact_policy.promotion_authorized = true;
  forged.interpretation_policy.posterior_interpretation_authorized = true;
  forged.posterior_values_containment_policy.confidence_output_authorized = true;
  forged.artifact_hash = hashTs(forged);
  const forgedTs = validateTs(clone(forged), clone(options));
  const forgedMjs = validateMjs(clone(forged), clone(options));
  assert.equal(forgedTs.valid, false);
  assert.equal(JSON.stringify(forgedTs), JSON.stringify(forgedMjs));

  const rejected = buildTs({ ...goldenInput(), raw_rows: [{ unsafe: true }] });
  const rejectedTs = validateTs(clone(rejected));
  const rejectedMjs = validateMjs(clone(rejected));
  assert.equal(rejectedTs.valid, false);
  assert.equal(JSON.stringify(rejectedTs), JSON.stringify(rejectedMjs));

  const tamperedHash = clone(artifact);
  tamperedHash.artifact_hash = "c".repeat(64);
  const tamperedTs = validateTs(clone(tamperedHash), clone(options));
  const tamperedMjs = validateMjs(clone(tamperedHash), clone(options));
  assert.equal(tamperedTs.valid, false);
  assert.equal(JSON.stringify(tamperedTs), JSON.stringify(tamperedMjs));
});
