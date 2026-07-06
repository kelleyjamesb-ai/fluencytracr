import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  buildContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceFromObject as buildTs,
  buildContributionAlignmentDiagnosticsSufficiencyEvidenceFromGovernedSource as projectTs,
  contributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceHash as hashTs,
  validateContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSource as validateTs
} from "../dist/index.js";
import {
  buildContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSourceFromObject as buildMjs,
  buildContributionAlignmentDiagnosticsSufficiencyEvidenceFromGovernedSource as projectMjs,
  validateContributionAlignmentGovernedDiagnosticsSufficiencyEvidenceSource as validateMjs
} from "../../../scripts/run_ai_value_contribution_alignment_governed_diagnostics_sufficiency_evidence_source.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const golden = (name) => join(here, "golden", name);

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const envelope = readJson(golden("09-internal-bayesian-execution-runtime-source-envelope.json"));
const goldenSource = readFileSync(golden("10-governed-diagnostics-sufficiency-evidence-source.json"), "utf8");

test("ported governed diagnostics source reproduces the golden output byte-for-byte", () => {
  const source = buildTs(clone(envelope));
  assert.equal(`${JSON.stringify(source, null, 2)}\n`, goldenSource);
  assert.equal(source.evidence_hash, hashTs(source));
  assert.equal(source.promotion_boundary.promotion_blocked, true);
  assert.equal(source.promotion_boundary.promotion_authorized, false);
});

test("ported governed diagnostics source matches the .mjs runner byte-for-byte across input paths", () => {
  const bareRuntime = clone(envelope.source_runtime);
  const inputs = [
    clone(envelope),
    { source_runtime: clone(envelope) },
    bareRuntime,
    { source_runtime: bareRuntime },
    {
      source_runtime: { ...clone(envelope), aggregate_measurement_cell_windows: undefined }
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

test("ported governed diagnostics validator and packet projection match the .mjs behavior", () => {
  const source = buildTs(clone(envelope));
  const validation = validateTs(clone(source));
  const validationMjs = validateMjs(clone(source));
  assert.equal(JSON.stringify(validation), JSON.stringify(validationMjs));

  const projection = projectTs(clone(source));
  const projectionMjs = projectMjs(clone(source));
  assert.equal(JSON.stringify(projection), JSON.stringify(projectionMjs));

  const forged = clone(source);
  forged.promotion_boundary.promotion_authorized = true;
  forged.evidence_hash = hashTs(forged);
  const forgedTs = validateTs(clone(forged));
  const forgedMjs = validateMjs(clone(forged));
  assert.equal(forgedTs.valid, false);
  assert.equal(JSON.stringify(forgedTs), JSON.stringify(forgedMjs));

  const drifted = clone(source);
  drifted.evidence_readiness_reconciliation.source_runtime_ready =
    !drifted.evidence_readiness_reconciliation.source_runtime_ready;
  const driftedTs = validateTs(clone(drifted));
  const driftedMjs = validateMjs(clone(drifted));
  assert.equal(driftedTs.valid, false);
  assert.equal(JSON.stringify(driftedTs), JSON.stringify(driftedMjs));
});
