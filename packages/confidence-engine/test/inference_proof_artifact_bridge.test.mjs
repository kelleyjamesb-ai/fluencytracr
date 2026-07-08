// Python -> TypeScript inference proof artifact bridge (tasks 3.5 / 3.6
// bridge half of add-bayesian-inference-proof-harness, slice 2 Phase B3).
//
// Proves that artifacts emitted by the Python harness
// (`inference/src/fluencytracr_inference`) cross the boundary as JSON and are
// accepted (schema-valid HOLD) or rejected (forged self-hash) by the
// `InferenceProofArtifactSchema` Zod gate, with the TS self-hash recompute
// (`inferenceProofArtifactSelfHash`) byte-agreeing with the Python
// `hashing.inference_proof_artifact_self_hash`. The clean "eligible"
// scenario fixture intentionally HOLDs until the real task-3.3 calibration
// and null proof exists; bridge fixtures must not stand in for acceptance
// evidence.
//
// Two layers:
//
// 1. Committed bridge fixtures (always run, CI-stable). Regenerate from the
//    repo root with the pinned environment:
//
//      PYTHONPATH=inference/src inference/.venv/bin/python \
//        -m fluencytracr_inference --scenario eligible \
//        > packages/confidence-engine/test/fixtures/inference_proof_artifact_eligible.json
//      PYTHONPATH=inference/src inference/.venv/bin/python \
//        -m fluencytracr_inference --scenario hold \
//        > packages/confidence-engine/test/fixtures/inference_proof_artifact_hold.json
//
//    These are fast deterministic bridge fixtures; the Python inference suite
//    owns the full seeded NUTS fit, real diagnostics checks, and calibration
//    acceptance grid.
//
// 2. Live subprocess round trip (skipped with a clear message when the
//    pinned `inference/.venv` environment is absent — mirrors the CI split:
//    the inference-harness workflow owns the Python environment; the
//    workspace suite must stay green without it). Uses the fast
//    deterministic bridge-fixture scenarios of `python -m
//    fluencytracr_inference` (seconds, no sampling).

import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { InferenceProofArtifactSchema, inferenceProofArtifactSelfHash } from "../dist/index.js";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "..", "..", "..");
const fixturesDir = path.join(testDir, "fixtures");
const venvPython = path.join(repoRoot, "inference", ".venv", "bin", "python");
const pythonSrc = path.join(repoRoot, "inference", "src");

const venvSkip = existsSync(venvPython)
  ? false
  : "inference/.venv missing — live Python subprocess round trip skipped " +
    "(committed fixtures still prove the bridge; the inference-harness CI " +
    "workflow owns the Python environment)";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadFixture(name) {
  return JSON.parse(readFileSync(path.join(fixturesDir, name), "utf8"));
}

function emitFromPython(scenario) {
  const result = spawnSync(
    venvPython,
    ["-m", "fluencytracr_inference", "--scenario", scenario],
    {
      cwd: repoRoot,
      env: { ...process.env, PYTHONPATH: pythonSrc },
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      timeout: 180_000
    }
  );
  assert.equal(
    result.status,
    0,
    `python -m fluencytracr_inference --scenario ${scenario} failed:\n${result.stderr}`
  );
  return JSON.parse(result.stdout);
}

// Task-3.5 governance pins: numeric values cross ONLY as internal validation
// inputs; nothing is customer-authorized and promotion is a separate, later,
// human decision (ref pinned null).
function assertGovernancePins(artifact) {
  assert.equal(artifact.internal_only, true);
  assert.equal(artifact.customer_output_authorized, false);
  assert.equal(artifact.probability_output_authorized, false);
  assert.equal(artifact.confidence_output_authorized, false);
  assert.equal(artifact.finance_output_authorized, false);
  assert.equal(artifact.numeric_values_role, "internal_validation_inputs_not_output");
  assert.equal(artifact.numeric_posterior_values_customer_authorized, false);
  assert.equal(artifact.promotion_decision_ref, null);
  assert.equal(artifact.synthetic_generator.real_data_present, false);
  assert.equal(artifact.synthetic_generator.customer_data_present, false);
  assert.equal(artifact.synthetic_generator.production_data_present, false);
  assert.equal(artifact.synthetic_generator.live_data_source_present, false);
}

// Task-3.5 peeking pins: fixed-horizon, look 1 of 1, exactly one milestone,
// one metric, one cohort; no sequential-procedure claim.
function assertFixedHorizonPeekingPins(artifact) {
  const control = artifact.peeking_control;
  assert.equal(control.procedure, "fixed_horizon_one_look_only");
  assert.equal(control.look_index, 1);
  assert.equal(control.total_planned_looks, 1);
  assert.equal(control.milestone_days_included.length, 1);
  assert.equal(control.metrics_included.length, 1);
  assert.equal(control.cohorts_included.length, 1);
  assert.equal(control.sequential_method_name, null);
  assert.equal(control.synthetic_null_proof_hash, null);
}

function assertSelfHashRoundTrip(artifact) {
  const recomputed = inferenceProofArtifactSelfHash(artifact);
  assert.equal(
    recomputed,
    artifact.hash_bindings.artifact_self_hash,
    "TS self-hash recompute must equal the Python-emitted artifact_self_hash"
  );
}

function assertEligibleRoundTrip(artifact) {
  assertSelfHashRoundTrip(artifact);
  const parsed = InferenceProofArtifactSchema.parse(artifact);
  assert.equal(parsed.governance_state.state, "eligible_internal_only");
  assert.deepEqual(parsed.governance_state.failing_diagnostics, []);
  assert.equal(
    parsed.governance_state.comparison_supported_contribution_estimate_authorized,
    true
  );
  assert.equal(parsed.governance_state.evidence_tier_only, false);
  assertGovernancePins(parsed);
  assertFixedHorizonPeekingPins(parsed);
}

function assertHoldRoundTrip(artifact, expectedFailingDiagnostic) {
  assertSelfHashRoundTrip(artifact);
  const parsed = InferenceProofArtifactSchema.parse(artifact);
  assert.equal(parsed.governance_state.state, "HOLD");
  assert.ok(
    parsed.governance_state.failing_diagnostics.length >= 1,
    "HOLD artifacts must name at least one failing diagnostic"
  );
  assert.ok(
    parsed.governance_state.failing_diagnostics.includes(expectedFailingDiagnostic),
    `HOLD artifact must name ${expectedFailingDiagnostic}; got ` +
      JSON.stringify(parsed.governance_state.failing_diagnostics)
  );
  assert.equal(
    parsed.governance_state.comparison_supported_contribution_estimate_authorized,
    false
  );
  assertGovernancePins(parsed);
  assertFixedHorizonPeekingPins(parsed);
}

// ---------------------------------------------------------------------------
// Layer 1: committed bridge fixtures (deterministic Python emitter output)
// ---------------------------------------------------------------------------

const eligibleFixture = loadFixture("inference_proof_artifact_eligible.json");
const holdFixture = loadFixture("inference_proof_artifact_hold.json");

test("fixture: Python clean scenario HOLDs until calibration proof exists", () => {
  assertHoldRoundTrip(eligibleFixture, "calibration_coverage");
});

test("fixture: Python HOLD artifact parses as valid HOLD naming the failing diagnostic", () => {
  assertHoldRoundTrip(holdFixture, "missing_or_suppressed_windows");
});

test("fixture: forged numeric field without hash update is rejected", () => {
  const forged = clone(eligibleFixture);
  // Mutate one numeric diagnostic value; deliberately do NOT update the
  // self-hash. The value stays inside its own gate band so the ONLY defense
  // being tested is the hash binding.
  forged.diagnostics.sampler.parameters[0].r_hat += 1e-6;

  const recomputed = inferenceProofArtifactSelfHash(forged);
  assert.notEqual(
    recomputed,
    forged.hash_bindings.artifact_self_hash,
    "TS recompute over a mutated body must diverge from the stored self-hash"
  );

  const rejected = InferenceProofArtifactSchema.safeParse(forged);
  assert.equal(rejected.success, false, "the Zod gate must reject the forged artifact");
  assert.ok(
    rejected.error.issues.some(
      (issue) =>
        issue.path.join(".") === "hash_bindings.artifact_self_hash" &&
        issue.message === "artifact_self_hash must match the artifact body"
    ),
    "rejection must be pinned to the artifact_self_hash binding"
  );
});

test("fixture: forged HOLD artifact is equally rejected by the hash binding", () => {
  const forged = clone(holdFixture);
  forged.diagnostics.sampler.parameters[0].bulk_ess += 1;
  assert.notEqual(
    inferenceProofArtifactSelfHash(forged),
    forged.hash_bindings.artifact_self_hash
  );
  assert.equal(InferenceProofArtifactSchema.safeParse(forged).success, false);
});

test("fixture: governance pins hold on both clean-scenario and HOLD artifacts", () => {
  assertGovernancePins(eligibleFixture);
  assertGovernancePins(holdFixture);
});

test("fixture: fixed-horizon peeking pins hold on both clean-scenario and HOLD artifacts", () => {
  assertFixedHorizonPeekingPins(eligibleFixture);
  assertFixedHorizonPeekingPins(holdFixture);
});

// ---------------------------------------------------------------------------
// Layer 2: live subprocess round trip (skips cleanly without the venv)
// ---------------------------------------------------------------------------

test("subprocess: live Python clean scenario HOLDs until calibration proof exists", { skip: venvSkip }, () => {
  const artifact = emitFromPython("eligible");
  assertHoldRoundTrip(artifact, "calibration_coverage");
});

test("subprocess: live Python HOLD artifact round-trips as valid HOLD", { skip: venvSkip }, () => {
  const artifact = emitFromPython("hold");
  assertHoldRoundTrip(artifact, "missing_or_suppressed_windows");
  const evidence = artifact.measurement_cell_window_evidence;
  assert.equal(evidence.all_required_windows_observed, false);
  assert.ok(evidence.missing_window_refs.length >= 1);
});

test("subprocess: live clean scenario artifact survives forgery check end to end", { skip: venvSkip }, () => {
  const artifact = emitFromPython("eligible");
  const forged = clone(artifact);
  forged.hash_bindings.source_posterior_hash =
    forged.hash_bindings.source_posterior_hash.slice(0, 63) +
    (forged.hash_bindings.source_posterior_hash.endsWith("0") ? "1" : "0");
  assert.notEqual(
    inferenceProofArtifactSelfHash(forged),
    forged.hash_bindings.artifact_self_hash
  );
  assert.equal(InferenceProofArtifactSchema.safeParse(forged).success, false);
});
