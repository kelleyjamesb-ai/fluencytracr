import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  LongitudinalReplicatedValidationArtifactSchema,
  longitudinalReplicatedValidationPayloadHash,
  longitudinalReplicatedValidationSelfHash
} from "../dist/index.js";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "..", "..", "..");
const artifactPath = path.join(
  repoRoot,
  "inference",
  "evidence",
  "longitudinal_replicated_validation_full_2026_07.json"
);

test("committed 1,200-slot evidence crosses the strict TypeScript boundary", () => {
  const parsed = LongitudinalReplicatedValidationArtifactSchema.parse(
    JSON.parse(readFileSync(artifactPath, "utf8"))
  );

  assert.equal(parsed.execution_mode, "full");
  assert.equal(parsed.calibration_slot_results.length, 1200);
  assert.equal(parsed.chunk_manifests.length, 20);
  assert.equal(parsed.calibration_summary.cell_summaries.length, 6);
  assert.equal(parsed.calibration_summary.hard_failure_count, 0);
  assert.equal(parsed.calibration_summary.worst_null_signal_rate, 0.045);
  assert.equal(parsed.control_study.floor_gate_passed, true);
  assert.equal(parsed.control_study.lag_gate_passed, true);
  assert.equal(parsed.control_study.negative_control_gate_passed, true);
  assert.equal(parsed.governance_state.state, "valid_internal_validation_non_authorizing");
  assert.equal(parsed.governance_state.numerical_validation_gate_passed, true);
  assert.equal(parsed.governance_state.independent_acceptance_complete, false);
  assert.equal(parsed.governance_state.proof_completion_authorized, false);
  assert.equal(parsed.customer_output_authorized, false);
  assert.equal(
    parsed.hash_bindings.artifact_payload_hash,
    longitudinalReplicatedValidationPayloadHash(parsed)
  );
  assert.equal(
    parsed.hash_bindings.artifact_self_hash,
    longitudinalReplicatedValidationSelfHash(parsed)
  );
});
