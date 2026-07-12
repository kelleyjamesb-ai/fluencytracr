import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  LONGITUDINAL_STATE_SPACE_CONCORDANCE_SCHEMA_VERSION,
  LongitudinalStateSpaceConcordanceArtifactSchema,
  LongitudinalSyntheticOutcomeProofArtifactSchema,
  longitudinalStateSpaceConcordancePayloadHash,
  longitudinalStateSpaceConcordanceSelfHash,
  sha256Json
} from "../dist/index.js";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "..", "..", "..");
const venvPython = path.join(repoRoot, "inference", ".venv", "bin", "python");
const pythonSrc = path.join(repoRoot, "inference", "src");
const fullArtifactPath = path.join(
  repoRoot,
  "inference",
  "evidence",
  "longitudinal_state_space_nuts_concordance_full_2026_07.json"
);
const venvSkip = existsSync(venvPython)
  ? false
  : "inference/.venv missing; concordance bridge test skipped";
const fullArtifactSkip = existsSync(fullArtifactPath)
  ? false
  : "committed full concordance artifact not present";
let cachedArtifact;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function emitSmokeArtifact() {
  if (cachedArtifact) return clone(cachedArtifact);
  const script = [
    "import json",
    "from fluencytracr_inference.longitudinal_concordance_artifact import run_longitudinal_concordance_artifact",
    "artifact, _ = run_longitudinal_concordance_artifact(",
    "    mode='smoke',",
    "    generated_at='2026-07-12T00:00:00+00:00',",
    ")",
    "print(json.dumps(artifact, sort_keys=True, separators=(',', ':')))"
  ].join("\n");
  const result = spawnSync(venvPython, ["-c", script], {
    cwd: repoRoot,
    env: { ...process.env, PYTHONPATH: pythonSrc },
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    timeout: 180_000
  });
  assert.equal(result.status, 0, `Python concordance smoke failed:\n${result.stderr}`);
  cachedArtifact = JSON.parse(result.stdout);
  return clone(cachedArtifact);
}

function emitBridgeValidSmokeArtifact() {
  const artifact = emitSmokeArtifact();
  assert.equal(
    LongitudinalStateSpaceConcordanceArtifactSchema.safeParse(artifact).success,
    true,
    "adversarial mutation requires a bridge-valid source artifact"
  );
  return artifact;
}

function slotIdentity(slot) {
  return {
    slot_id: slot.slot_id,
    cell_id: slot.cell_id,
    effect_size_sd: slot.effect_size_sd,
    panel_group_count: slot.panel_group_count,
    seed: slot.seed
  };
}

function fitBindingHash(slot, engineFitSummaryHash) {
  if (!("case_binding_hash" in slot)) return engineFitSummaryHash;
  return sha256Json({
    case_binding_hash: slot.case_binding_hash,
    engine_fit_summary_hash: engineFitSummaryHash
  });
}

function refreshFitAndSlotHashes(slot) {
  if ("case_binding_hash" in slot) {
    slot.case_binding_hash = sha256Json({
      slot: slotIdentity(slot),
      prepared_input_hash: slot.prepared_input_hash,
      model_input_hash: slot.model_input_hash,
      context_binding_hash: slot.context_binding_hash,
      truth_receipt_hash: slot.truth_receipt_hash
    });
  }
  if (slot.primary_integration_diagnostics && slot.quantity_concordance.length) {
    const engineFitSummaryHash = sha256Json({
      prepared_input_hash: slot.prepared_input_hash,
      model_input_hash: slot.model_input_hash,
      engine_kind: "deterministic_gaussian_state_space_integration",
      summaries: slot.quantity_concordance.map((value) => value.primary_summary),
      integration_diagnostics: slot.primary_integration_diagnostics
    });
    slot.primary_fit_summary_hash = fitBindingHash(slot, engineFitSummaryHash);
  }
  if (
    slot.reference_settings &&
    slot.reference_sampler_diagnostics &&
    slot.quantity_concordance.length
  ) {
    const engineFitSummaryHash = sha256Json({
      prepared_input_hash: slot.prepared_input_hash,
      engine_kind: "pymc_nuts_state_space_reference",
      settings: slot.reference_settings,
      seed: slot.seed,
      summaries: slot.quantity_concordance.map((value) => value.reference_summary),
      sampler_diagnostics: slot.reference_sampler_diagnostics,
      posterior_predictive_checks: slot.posterior_predictive_checks,
      raw_posterior_draws_emitted: false
    });
    slot.reference_fit_summary_hash = fitBindingHash(slot, engineFitSummaryHash);
  }
  const { slot_result_hash: _old, ...body } = slot;
  slot.slot_result_hash = sha256Json(body);
}

function coordinatedRehash(artifact) {
  for (const slot of artifact.slot_results) refreshFitAndSlotHashes(slot);
  artifact.hash_bindings.study_plan_hash = artifact.study_plan.plan_hash;
  artifact.hash_bindings.slot_results_hash = sha256Json(artifact.slot_results);
  const summary = artifact.study_summary;
  const studyResultBody = {
    execution_mode: summary.execution_mode,
    plan_hash: summary.plan_hash,
    slot_result_hashes: artifact.slot_results.map((value) => value.slot_result_hash),
    missing_slot_ids: summary.missing_slot_ids,
    duplicate_slot_ids: summary.duplicate_slot_ids,
    off_plan_slot_ids: summary.off_plan_slot_ids,
    all_slots_passed: summary.all_slots_passed,
    exact_manifest_complete: summary.exact_manifest_complete,
    failing_checks: summary.failing_checks
  };
  if ("duplicate_evidence_binding_hashes" in summary) {
    studyResultBody.duplicate_evidence_binding_hashes =
      summary.duplicate_evidence_binding_hashes;
  }
  summary.study_result_hash = sha256Json(studyResultBody);
  artifact.hash_bindings.study_result_hash = summary.study_result_hash;
  artifact.hash_bindings.artifact_payload_hash =
    longitudinalStateSpaceConcordancePayloadHash(artifact);
  artifact.hash_bindings.artifact_self_hash =
    longitudinalStateSpaceConcordanceSelfHash(artifact);
  return artifact;
}

test("Python concordance smoke artifact validates as partial HOLD", { skip: venvSkip }, () => {
  const artifact = emitSmokeArtifact();
  const parsed = LongitudinalStateSpaceConcordanceArtifactSchema.parse(artifact);

  assert.equal(parsed.schema_version, LONGITUDINAL_STATE_SPACE_CONCORDANCE_SCHEMA_VERSION);
  assert.equal(parsed.governance_state.state, "HOLD");
  assert.equal(parsed.study_summary.executed_slot_count, 1);
  assert.equal(parsed.study_summary.missing_slot_ids.length, 29);
  assert.equal(parsed.study_summary.exact_manifest_complete, false);
  assert.equal(parsed.validation_scope.state_space_nuts_concordance_complete, false);
  assert.equal(parsed.validation_scope.replicated_validation_complete, false);
  assert.equal(parsed.governance_state.concordance_gate_passed, false);
  assert.equal(parsed.governance_state.independent_acceptance_required, true);
  assert.equal(parsed.governance_state.independent_acceptance_complete, false);
  assert.equal(parsed.governance_state.replicated_validation_unblocked, false);
  assert.equal(parsed.customer_output_authorized, false);
  assert.equal(parsed.probability_output_authorized, false);
  assert.equal(parsed.confidence_output_authorized, false);
});

test("committed full concordance artifact validates when present", { skip: fullArtifactSkip }, () => {
  const artifact = JSON.parse(readFileSync(fullArtifactPath, "utf8"));
  const parsed = LongitudinalStateSpaceConcordanceArtifactSchema.parse(artifact);

  assert.equal(parsed.study_summary.execution_mode, "full");
  assert.equal(parsed.study_summary.executed_slot_count, 30);
  assert.equal(parsed.study_summary.exact_manifest_complete, true);
  assert.equal(parsed.governance_state.state, "valid_internal_validation_non_authorizing");
  assert.equal(parsed.governance_state.concordance_gate_passed, true);
  assert.equal(parsed.governance_state.independent_acceptance_required, true);
  assert.equal(parsed.governance_state.independent_acceptance_complete, false);
  assert.equal(parsed.governance_state.replicated_validation_unblocked, false);
  assert.equal(parsed.validation_scope.state_space_nuts_concordance_complete, true);
  assert.equal(parsed.validation_scope.replicated_validation_complete, false);
  assert.equal(parsed.customer_output_authorized, false);
  assert.equal(parsed.probability_output_authorized, false);
  assert.equal(parsed.confidence_output_authorized, false);
});

test("concordance artifact is not accepted by longitudinal smoke schema", { skip: venvSkip }, () => {
  const artifact = emitSmokeArtifact();

  assert.equal(LongitudinalSyntheticOutcomeProofArtifactSchema.safeParse(artifact).success, false);
});

test("forged self hash rejects", { skip: venvSkip }, () => {
  const artifact = emitSmokeArtifact();
  artifact.hash_bindings.artifact_self_hash = "0".repeat(64);

  assert.equal(LongitudinalStateSpaceConcordanceArtifactSchema.safeParse(artifact).success, false);
});

test("coordinated rehash cannot promote a partial study", { skip: venvSkip }, () => {
  const artifact = emitSmokeArtifact();
  artifact.study_summary.execution_mode = "full";
  artifact.study_summary.missing_slot_ids = [];
  artifact.study_summary.all_slots_passed = true;
  artifact.study_summary.exact_manifest_complete = true;
  artifact.study_summary.study_status = "PASS";
  artifact.study_summary.failing_checks = [];
  artifact.validation_scope.state_space_nuts_concordance_complete = true;
  artifact.governance_state.state = "valid_internal_validation_non_authorizing";
  artifact.governance_state.failing_checks = [];
  artifact.governance_state.replicated_validation_unblocked = true;
  coordinatedRehash(artifact);

  assert.equal(LongitudinalStateSpaceConcordanceArtifactSchema.safeParse(artifact).success, false);
});

test("coordinated rehash cannot forge concordance operands or pass flags", { skip: venvSkip }, () => {
  const artifact = emitSmokeArtifact();
  const quantity = artifact.slot_results[0].quantity_concordance[0];
  quantity.absolute_mean_difference_reference_sd = 0;
  quantity.passed = true;
  coordinatedRehash(artifact);

  assert.equal(LongitudinalStateSpaceConcordanceArtifactSchema.safeParse(artifact).success, false);
});

test("coordinated rehash cannot remove real sampler failures", { skip: venvSkip }, () => {
  const artifact = emitSmokeArtifact();
  const slot = artifact.slot_results[0];
  slot.reference_sampler_diagnostics.passed = true;
  slot.reference_sampler_diagnostics.failing_diagnostics = [];
  slot.failing_checks = ["cross_engine_concordance"];
  coordinatedRehash(artifact);

  assert.equal(LongitudinalStateSpaceConcordanceArtifactSchema.safeParse(artifact).success, false);
});

test("negative R-hat rejects after coordinated rehash", { skip: venvSkip }, () => {
  const artifact = emitBridgeValidSmokeArtifact();
  artifact.slot_results[0].reference_sampler_diagnostics.parameters[0].r_hat = -1;
  coordinatedRehash(artifact);

  assert.equal(LongitudinalStateSpaceConcordanceArtifactSchema.safeParse(artifact).success, false);
});

test("runner-error HOLD without partial fit evidence remains bridge-valid", { skip: venvSkip }, () => {
  const artifact = emitBridgeValidSmokeArtifact();
  const slot = artifact.slot_results[0];
  slot.status = "HOLD";
  slot.failing_checks = ["runner_error"];
  slot.primary_fit_summary_hash = null;
  slot.reference_fit_summary_hash = null;
  slot.primary_integration_diagnostics = null;
  slot.reference_settings = null;
  slot.reference_sampler_diagnostics = null;
  slot.posterior_predictive_checks = [];
  slot.quantity_concordance = [];
  slot.runner_error_stage = "reference";
  slot.runner_error_type = "RuntimeError";
  coordinatedRehash(artifact);

  assert.equal(LongitudinalStateSpaceConcordanceArtifactSchema.safeParse(artifact).success, true);
});

test("deleted or duplicated scalar diagnostics reject after coordinated rehash", { skip: venvSkip }, () => {
  const mutations = [
    (parameters) => {
      const movementIndex = parameters.findIndex(
        (value) => value.parameter_name === "longitudinal_movement"
      );
      assert.notEqual(movementIndex, -1);
      parameters.splice(movementIndex, 1);
    },
    (parameters) => {
      const movement = parameters.find(
        (value) => value.parameter_name === "longitudinal_movement"
      );
      const rhoIndex = parameters.findIndex((value) => value.parameter_name === "rho");
      assert.ok(movement);
      assert.notEqual(rhoIndex, -1);
      parameters[rhoIndex] = clone(movement);
    }
  ];

  for (const mutate of mutations) {
    const artifact = emitBridgeValidSmokeArtifact();
    const diagnostics = artifact.slot_results[0].reference_sampler_diagnostics;
    const originalLength = diagnostics.parameters.length;
    mutate(diagnostics.parameters);
    coordinatedRehash(artifact);

    assert.equal(
      LongitudinalStateSpaceConcordanceArtifactSchema.safeParse(artifact).success,
      false
    );
    assert.ok(
      diagnostics.parameters.length === originalLength ||
        diagnostics.parameters.length === originalLength - 1
    );
  }
});

test("prepared hashes cannot be forged independently after coordinated rehash", { skip: venvSkip }, () => {
  const mutations = [
    ["prepared_input_hash", "7".repeat(64)],
    ["model_input_hash", "8".repeat(64)],
    ["context_binding_hash", "9".repeat(64)]
  ];

  for (const [field, forgedHash] of mutations) {
    const artifact = emitBridgeValidSmokeArtifact();
    artifact.slot_results[0][field] = forgedHash;
    coordinatedRehash(artifact);

    assert.equal(
      LongitudinalStateSpaceConcordanceArtifactSchema.safeParse(artifact).success,
      false
    );
  }
});

test("cloned evidence bindings reject under a distinct on-plan slot id", { skip: venvSkip }, () => {
  const artifact = emitBridgeValidSmokeArtifact();
  const sourceSlot = artifact.slot_results[0];
  const clonedSlot = clone(sourceSlot);
  clonedSlot.effect_size_sd = 0.2;
  clonedSlot.slot_id = `effect_0p2__groups_6__seed_${clonedSlot.seed}`;
  clonedSlot.cell_id = "effect_0p2__groups_6";
  refreshFitAndSlotHashes(clonedSlot);

  assert.equal(clonedSlot.prepared_input_hash, sourceSlot.prepared_input_hash);
  assert.notEqual(clonedSlot.slot_id, sourceSlot.slot_id);
  assert.notEqual(clonedSlot.case_binding_hash, sourceSlot.case_binding_hash);

  artifact.slot_results.push(clonedSlot);
  artifact.study_summary.executed_slot_count = artifact.slot_results.length;
  artifact.study_summary.missing_slot_ids =
    artifact.study_summary.missing_slot_ids.filter(
      (slotId) => slotId !== clonedSlot.slot_id
    );
  coordinatedRehash(artifact);

  assert.equal(LongitudinalStateSpaceConcordanceArtifactSchema.safeParse(artifact).success, false);
});

test("engine, prior, Depth, and threshold claims are immutable", { skip: venvSkip }, () => {
  const mutations = [
    (artifact) => {
      artifact.engine_specification.reference.engine_kind = "closed_form_fixture";
    },
    (artifact) => {
      artifact.model_specification.depth_used_in_likelihood = true;
    },
    (artifact) => {
      artifact.model_specification.minimum_worthwhile_change_used_in_inference = true;
    },
    (artifact) => {
      artifact.study_plan.compiled_concordance_gates.mean_max_reference_sd = 1;
    },
    (artifact) => {
      artifact.engine_specification.reference.chains = 2;
    }
  ];
  for (const mutate of mutations) {
    const artifact = emitSmokeArtifact();
    mutate(artifact);
    coordinatedRehash(artifact);
    assert.equal(
      LongitudinalStateSpaceConcordanceArtifactSchema.safeParse(artifact).success,
      false
    );
  }
});

test("runtime and lockfile claims are immutable", { skip: venvSkip }, () => {
  const runtimeArtifact = emitSmokeArtifact();
  runtimeArtifact.python_requires = ">=3.12,<3.13";
  coordinatedRehash(runtimeArtifact);
  assert.equal(
    LongitudinalStateSpaceConcordanceArtifactSchema.safeParse(runtimeArtifact).success,
    false
  );

  const lockfileArtifact = emitSmokeArtifact();
  lockfileArtifact.lockfile_hash = "0".repeat(64);
  coordinatedRehash(lockfileArtifact);
  assert.equal(
    LongitudinalStateSpaceConcordanceArtifactSchema.safeParse(lockfileArtifact).success,
    false
  );

  const runtimeVersionArtifact = emitSmokeArtifact();
  runtimeVersionArtifact.generation_runtime.pymc = "6.0.0";
  coordinatedRehash(runtimeVersionArtifact);
  assert.equal(
    LongitudinalStateSpaceConcordanceArtifactSchema.safeParse(runtimeVersionArtifact).success,
    false
  );
});

test("prepared-input and fit-summary splicing rejects", { skip: venvSkip }, () => {
  const artifact = emitSmokeArtifact();
  artifact.slot_results[0].prepared_input_hash = "f".repeat(64);
  coordinatedRehash(artifact);
  artifact.slot_results[0].primary_fit_summary_hash = "a".repeat(64);
  const { slot_result_hash: _old, ...body } = artifact.slot_results[0];
  artifact.slot_results[0].slot_result_hash = sha256Json(body);
  artifact.hash_bindings.slot_results_hash = sha256Json(artifact.slot_results);
  artifact.hash_bindings.artifact_payload_hash =
    longitudinalStateSpaceConcordancePayloadHash(artifact);
  artifact.hash_bindings.artifact_self_hash =
    longitudinalStateSpaceConcordanceSelfHash(artifact);

  assert.equal(LongitudinalStateSpaceConcordanceArtifactSchema.safeParse(artifact).success, false);
});

test("unsafe output side doors and unknown fields reject", { skip: venvSkip }, () => {
  const artifact = emitSmokeArtifact();
  artifact.customer_output_authorized = true;
  coordinatedRehash(artifact);
  assert.equal(LongitudinalStateSpaceConcordanceArtifactSchema.safeParse(artifact).success, false);

  const unknown = emitSmokeArtifact();
  unknown.route = "/api/concordance";
  coordinatedRehash(unknown);
  assert.equal(LongitudinalStateSpaceConcordanceArtifactSchema.safeParse(unknown).success, false);
});

test("schema relabeling rejects even after rehash", { skip: venvSkip }, () => {
  const artifact = emitSmokeArtifact();
  artifact.schema_version = "FT_AI_VALUE_LONGITUDINAL_SYNTHETIC_OUTCOME_PROOF_2026_07_V2";
  coordinatedRehash(artifact);

  assert.equal(LongitudinalStateSpaceConcordanceArtifactSchema.safeParse(artifact).success, false);
  assert.equal(LongitudinalSyntheticOutcomeProofArtifactSchema.safeParse(artifact).success, false);
});
