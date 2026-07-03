import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  buildContributionAlignmentDiagnosticsEvidencePacketFromObject as buildTs,
  contributionAlignmentDiagnosticsEvidencePacketHash as hashTs,
  validateContributionAlignmentDiagnosticsEvidencePacket as validateTs
} from "../dist/index.js";
import {
  buildContributionAlignmentDiagnosticsEvidencePacketFromObject as buildMjs,
  validateContributionAlignmentDiagnosticsEvidencePacket as validateMjs
} from "../../../scripts/run_ai_value_contribution_alignment_diagnostics_evidence_packet.mjs";

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
const goldenPacket = readFileSync(golden("11-diagnostics-evidence-packet.json"), "utf8");

test("ported diagnostics evidence packet reproduces the golden output byte-for-byte", () => {
  const packet = buildTs(clone(envelope));
  assert.equal(`${JSON.stringify(packet, null, 2)}\n`, goldenPacket);
  assert.equal(packet.packet_hash, hashTs(packet));
  assert.equal(packet.promotion_boundary.promotion_blocked, true);
  assert.equal(packet.comparison_design_evidence.causal_claim_authorized, false);
});

test("ported diagnostics evidence packet matches the .mjs runner byte-for-byte across input paths", () => {
  const bareRuntime = clone(envelope.source_runtime);
  const inputs = [
    clone(envelope),
    { source_runtime: clone(envelope) },
    bareRuntime,
    { source_runtime: bareRuntime },
    {
      source_runtime: clone(envelope),
      source_diagnostics_sufficiency_evidence: clone(governedSource)
    },
    { source_runtime: { ...bareRuntime, runtime_hash: "a".repeat(64) } },
    { source_runtime: bareRuntime, raw_rows: [{ unsafe: true }] },
    { source_runtime: bareRuntime, sidecar: "value" },
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

test("ported diagnostics evidence packet validator matches the .mjs validator verdicts and gaps", () => {
  const packet = buildTs(clone(envelope));
  const noOptionsTs = validateTs(clone(packet));
  const noOptionsMjs = validateMjs(clone(packet));
  assert.equal(JSON.stringify(noOptionsTs), JSON.stringify(noOptionsMjs));

  const options = {
    sourceRuntime: clone(envelope.source_runtime),
    sourceGate: clone(envelope.source_gate),
    aggregateMeasurementCellWindows: clone(envelope.aggregate_measurement_cell_windows)
  };
  const boundTs = validateTs(clone(packet), clone(options));
  const boundMjs = validateMjs(clone(packet), clone(options));
  assert.equal(JSON.stringify(boundTs), JSON.stringify(boundMjs));

  const forged = clone(packet);
  forged.promotion_boundary.promotion_authorized = true;
  forged.packet_hash = hashTs(forged);
  const forgedTs = validateTs(clone(forged));
  const forgedMjs = validateMjs(clone(forged));
  assert.equal(forgedTs.valid, false);
  assert.equal(JSON.stringify(forgedTs), JSON.stringify(forgedMjs));

  const drifted = clone(packet);
  drifted.comparison_design_evidence.causal_claim_authorized = true;
  drifted.packet_hash = hashTs(drifted);
  const driftedTs = validateTs(clone(drifted));
  const driftedMjs = validateMjs(clone(drifted));
  assert.equal(driftedTs.valid, false);
  assert.equal(JSON.stringify(driftedTs), JSON.stringify(driftedMjs));
});
