import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  buildContributionAlignmentBayesianPromotionDecisionGateFromObject as buildTs,
  contributionAlignmentBayesianPromotionDecisionGateHash as hashTs,
  validateContributionAlignmentBayesianPromotionDecisionGate as validateTs
} from "../dist/index.js";
import {
  buildContributionAlignmentBayesianPromotionDecisionGateFromObject as buildMjs,
  validateContributionAlignmentBayesianPromotionDecisionGate as validateMjs
} from "../../../scripts/run_ai_value_contribution_alignment_bayesian_promotion_decision_gate.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const golden = (name) => join(here, "golden", name);

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const adequacyReview = readJson(golden("12-internal-diagnostics-model-adequacy-review.json"));
const envelope = readJson(golden("09-internal-bayesian-execution-runtime-source-envelope.json"));
const packet = readJson(golden("11-diagnostics-evidence-packet.json"));
const goldenGate = readFileSync(golden("14-bayesian-promotion-decision-gate.json"), "utf8");

function goldenInput() {
  return {
    source_diagnostics_review: clone(adequacyReview),
    source_runtime: clone(envelope),
    source_diagnostics_evidence_packet: clone(packet)
  };
}

test("ported Bayesian promotion decision gate reproduces the golden output byte-for-byte", () => {
  const gate = buildTs(goldenInput());
  assert.equal(`${JSON.stringify(gate, null, 2)}\n`, goldenGate);
  assert.equal(gate.gate_state, "HOLD_FOR_DIAGNOSTICS_AND_MODEL_ADEQUACY_SUFFICIENCY");
  assert.equal(gate.gate_hash, hashTs(gate));
  assert.equal(gate.gate_policy.promotion_authorized, false);
  assert.equal(gate.promotion_decision.promotion_blocked, true);
  assert.equal(gate.gate_policy.posterior_output_authorized, false);
  assert.equal(gate.gate_policy.confidence_output_authorized, false);
});

test("ported Bayesian promotion decision gate matches the .mjs runner byte-for-byte across input paths", () => {
  const inputs = [
    goldenInput(),
    { source_diagnostics_review: clone(adequacyReview) },
    clone(adequacyReview),
    {
      source_diagnostics_review: clone(adequacyReview),
      source_runtime: clone(envelope)
    },
    {
      source_diagnostics_review: clone(adequacyReview),
      source_runtime: clone(envelope.source_runtime),
      source_diagnostics_evidence_packet: clone(packet)
    },
    {
      source_diagnostics_review: { ...clone(adequacyReview), review_hash: "a".repeat(64) },
      source_runtime: clone(envelope),
      source_diagnostics_evidence_packet: clone(packet)
    },
    {
      source_diagnostics_review: clone(adequacyReview),
      source_runtime: clone(envelope),
      source_diagnostics_evidence_packet: { ...clone(packet), packet_state: "NOT_READY" }
    },
    { ...goldenInput(), raw_rows: [{ unsafe: true }] },
    { ...goldenInput(), sidecar: "value" },
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

test("ported Bayesian promotion decision gate validator matches the .mjs validator verdicts and gaps", () => {
  const gate = buildTs(goldenInput());
  const noOptionsTs = validateTs(clone(gate));
  const noOptionsMjs = validateMjs(clone(gate));
  assert.equal(JSON.stringify(noOptionsTs), JSON.stringify(noOptionsMjs));

  const options = {
    sourceDiagnosticsReview: clone(adequacyReview),
    sourceRuntime: clone(envelope.source_runtime),
    sourceGate: clone(envelope.source_gate),
    aggregateMeasurementCellWindows: clone(envelope.aggregate_measurement_cell_windows),
    sourceDiagnosticsEvidencePacket: clone(packet)
  };
  const boundTs = validateTs(clone(gate), clone(options));
  const boundMjs = validateMjs(clone(gate), clone(options));
  assert.equal(JSON.stringify(boundTs), JSON.stringify(boundMjs));

  const forged = clone(gate);
  forged.gate_state = "BAYESIAN_PROMOTION_DECISION_PASSED_FOR_INTERNAL_EXECUTION_ARTIFACT_ONLY";
  forged.gate_policy.promotion_authorized = true;
  forged.promotion_decision.promotion_authorized = true;
  forged.promotion_decision.promotion_blocked = false;
  forged.gate_hash = hashTs(forged);
  const forgedTs = validateTs(clone(forged), clone(options));
  const forgedMjs = validateMjs(clone(forged), clone(options));
  assert.equal(forgedTs.valid, false);
  assert.equal(JSON.stringify(forgedTs), JSON.stringify(forgedMjs));

  const rejected = buildTs({ ...goldenInput(), raw_rows: [{ unsafe: true }] });
  const rejectedTs = validateTs(clone(rejected));
  const rejectedMjs = validateMjs(clone(rejected));
  assert.equal(rejectedTs.valid, false);
  assert.equal(JSON.stringify(rejectedTs), JSON.stringify(rejectedMjs));

  const tamperedHash = clone(gate);
  tamperedHash.gate_hash = "b".repeat(64);
  const tamperedTs = validateTs(clone(tamperedHash), clone(options));
  const tamperedMjs = validateMjs(clone(tamperedHash), clone(options));
  assert.equal(tamperedTs.valid, false);
  assert.equal(JSON.stringify(tamperedTs), JSON.stringify(tamperedMjs));
});
