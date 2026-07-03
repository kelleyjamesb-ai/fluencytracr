import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  buildContributionAlignmentPromotionGatePassedArtifactHandoffFromObject as buildTs,
  contributionAlignmentPromotionGatePassedArtifactHandoffHash as hashTs,
  validateContributionAlignmentPromotionGatePassedArtifactHandoff as validateTs
} from "../dist/index.js";
import {
  buildContributionAlignmentPromotionGatePassedArtifactHandoffFromObject as buildMjs,
  validateContributionAlignmentPromotionGatePassedArtifactHandoff as validateMjs
} from "../../../scripts/run_ai_value_contribution_alignment_promotion_gate_passed_artifact_handoff.mjs";

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
const adequacyReview = readJson(golden("12-internal-diagnostics-model-adequacy-review.json"));
const packet = readJson(golden("11-diagnostics-evidence-packet.json"));
const promotionGate = readJson(golden("14-bayesian-promotion-decision-gate.json"));
const goldenHandoff = readFileSync(golden("15-promotion-gate-passed-artifact-handoff.json"), "utf8");

test("ported promotion gate passed artifact handoff reproduces the golden output byte-for-byte", () => {
  const handoff = buildTs({ source_runtime: clone(envelope) });
  assert.equal(`${JSON.stringify(handoff, null, 2)}\n`, goldenHandoff);
  assert.equal(handoff.handoff_hash, hashTs(handoff));
  assert.equal(handoff.handoff_policy.promotion_authorized, false);
  assert.equal(handoff.source_promotion_authority.handoff_promotion_authorized, false);
  assert.equal(handoff.created_artifacts.internal_bayesian_execution_artifact_v1, false);
});

test("ported promotion gate passed artifact handoff matches the .mjs runner byte-for-byte across input paths", () => {
  const inputs = [
    { source_runtime: clone(envelope) },
    clone(envelope),
    {
      source_runtime: clone(envelope),
      source_governed_diagnostics_sufficiency_evidence_source: clone(governedSource),
      source_diagnostics_review: clone(adequacyReview),
      source_diagnostics_evidence_packet: clone(packet),
      source_promotion_gate: clone(promotionGate)
    },
    { source_runtime: clone(envelope.source_runtime) },
    {
      source_runtime: clone(envelope),
      source_promotion_gate: { ...clone(promotionGate), gate_hash: "a".repeat(64) }
    },
    {
      source_runtime: clone(envelope),
      source_diagnostics_review: { ...clone(adequacyReview), review_hash: "b".repeat(64) }
    },
    { source_runtime: clone(envelope), raw_rows: [{ unsafe: true }] },
    { source_runtime: clone(envelope), confidence_output: true },
    { source_runtime: { ...clone(envelope), sidecar: "value" } },
    {},
    null
  ];
  const capture = (build, input) => {
    try {
      return { ok: true, value: JSON.stringify(build(clone(input))) };
    } catch (error) {
      return { ok: false, error: `${error.constructor.name}: ${error.message}` };
    }
  };
  for (const [index, input] of inputs.entries()) {
    assert.deepEqual(
      capture(buildTs, input),
      capture(buildMjs, input),
      `input #${index}: outputs (or thrown errors) must be identical`
    );
  }
});

test("ported promotion gate passed artifact handoff validator matches the .mjs validator verdicts and gaps", () => {
  const handoff = buildTs({ source_runtime: clone(envelope) });
  const noOptionsTs = validateTs(clone(handoff));
  const noOptionsMjs = validateMjs(clone(handoff));
  assert.equal(JSON.stringify(noOptionsTs), JSON.stringify(noOptionsMjs));

  const options = {
    sourceRuntime: clone(envelope),
    governedSource: clone(governedSource),
    diagnosticsReview: clone(adequacyReview),
    diagnosticsEvidencePacket: clone(packet),
    promotionGate: clone(promotionGate)
  };
  const boundTs = validateTs(clone(handoff), clone(options));
  const boundMjs = validateMjs(clone(handoff), clone(options));
  assert.equal(JSON.stringify(boundTs), JSON.stringify(boundMjs));

  const forged = clone(handoff);
  forged.handoff_state =
    "PROMOTION_GATE_PASSED_ARTIFACT_HANDOFF_READY_FOR_INTERNAL_EXECUTION_ARTIFACT_V1_CONTRACT_HANDOFF_ONLY";
  forged.handoff_class = "promotion_gate_passed_artifact_handoff_only";
  forged.source_bound = true;
  forged.promotion_gate_ref.promotion_authorized = true;
  forged.handoff_hash = hashTs(forged);
  const forgedTs = validateTs(clone(forged), clone(options));
  const forgedMjs = validateMjs(clone(forged), clone(options));
  assert.equal(forgedTs.valid, false);
  assert.equal(JSON.stringify(forgedTs), JSON.stringify(forgedMjs));

  const rejected = buildTs({ source_runtime: clone(envelope), raw_rows: [{ unsafe: true }] });
  const rejectedTs = validateTs(clone(rejected));
  const rejectedMjs = validateMjs(clone(rejected));
  assert.equal(rejectedTs.valid, false);
  assert.equal(JSON.stringify(rejectedTs), JSON.stringify(rejectedMjs));

  const tamperedHash = clone(handoff);
  tamperedHash.handoff_hash = "c".repeat(64);
  const tamperedTs = validateTs(clone(tamperedHash), clone(options));
  const tamperedMjs = validateMjs(clone(tamperedHash), clone(options));
  assert.equal(tamperedTs.valid, false);
  assert.equal(JSON.stringify(tamperedTs), JSON.stringify(tamperedMjs));
});
