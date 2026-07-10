import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  LongitudinalSyntheticOutcomeProofArtifactSchema,
  longitudinalSyntheticOutcomeProofSelfHash
} from "../dist/index.js";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "..", "..", "..");
const venvPython = path.join(repoRoot, "inference", ".venv", "bin", "python");
const pythonSrc = path.join(repoRoot, "inference", "src");

const venvSkip = existsSync(venvPython)
  ? false
  : "inference/.venv missing; longitudinal Python bridge test skipped";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function emitLongitudinal(scenario) {
  const result = spawnSync(
    venvPython,
    [
      "-m",
      "fluencytracr_inference",
      "--longitudinal-scenario",
      scenario,
      "--seed",
      "20260710"
    ],
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
    `python longitudinal scenario ${scenario} failed:\n${result.stderr}`
  );
  return JSON.parse(result.stdout);
}

function rehash(artifact) {
  artifact.hash_bindings.artifact_self_hash =
    longitudinalSyntheticOutcomeProofSelfHash(artifact);
  return artifact;
}

function assertPins(artifact) {
  assert.equal(artifact.internal_only, true);
  assert.equal(artifact.synthetic_only, true);
  assert.equal(artifact.customer_output_authorized, false);
  assert.equal(artifact.probability_output_authorized, false);
  assert.equal(artifact.confidence_output_authorized, false);
  assert.equal(artifact.roi_output_authorized, false);
  assert.equal(artifact.finance_output_authorized, false);
  assert.equal(artifact.causality_output_authorized, false);
  assert.equal(artifact.productivity_output_authorized, false);
  assert.equal(artifact.full_pathway_coherence_authorized, false);
  assert.equal(artifact.promotion_decision_ref, null);
  assert.equal(artifact.model_specification.synthetic_smoke_only, true);
  assert.equal(artifact.model_specification.replicated_calibration_complete, false);
}

test("Python clean longitudinal artifact validates as internal smoke only", { skip: venvSkip }, () => {
  const artifact = emitLongitudinal("clean_historical_pathway");
  assert.equal(
    longitudinalSyntheticOutcomeProofSelfHash(artifact),
    artifact.hash_bindings.artifact_self_hash
  );
  const parsed = LongitudinalSyntheticOutcomeProofArtifactSchema.parse(artifact);
  assert.equal(parsed.governance_state.state, "eligible_internal_smoke_only");
  assert.deepEqual(parsed.governance_state.failing_diagnostics, []);
  assert.equal(parsed.design_route.evidence_design, "HISTORICAL_STATE_SPACE");
  assert.equal(parsed.design_route.decision, "ROUTE_LONGITUDINAL_SYNTHETIC_PROTOTYPE");
  assertPins(parsed);
});

test("Python null longitudinal artifact validates as non-authorizing", { skip: venvSkip }, () => {
  const artifact = emitLongitudinal("null_pathway");
  const parsed = LongitudinalSyntheticOutcomeProofArtifactSchema.parse(artifact);
  assert.equal(parsed.governance_state.state, "valid_internal_non_authorizing");
  assert.equal(
    parsed.behavior_outcome_pathway_evidence.pathway_state,
    "NO_MEANINGFUL_MOVEMENT"
  );
  assert.ok(parsed.posterior_estimand_summary.credible_interval_80.lower < 0);
  assertPins(parsed);
});

test("Python HOLD longitudinal artifact validates with named diagnostic", { skip: venvSkip }, () => {
  const artifact = emitLongitudinal("missing_or_suppressed_windows");
  const parsed = LongitudinalSyntheticOutcomeProofArtifactSchema.parse(artifact);
  assert.equal(parsed.governance_state.state, "HOLD");
  assert.ok(
    parsed.governance_state.failing_diagnostics.includes("missing_or_suppressed_windows")
  );
  assert.equal(parsed.posterior_estimand_summary, null);
  assertPins(parsed);
});

test("forged self-hash rejects", { skip: venvSkip }, () => {
  const forged = clone(emitLongitudinal("clean_historical_pathway"));
  forged.posterior_estimand_summary.posterior_mean_movement += 0.01;
  assert.notEqual(
    longitudinalSyntheticOutcomeProofSelfHash(forged),
    forged.hash_bindings.artifact_self_hash
  );
  assert.equal(LongitudinalSyntheticOutcomeProofArtifactSchema.safeParse(forged).success, false);
});

test("source hash mismatch rejects even when self-hash is refreshed", { skip: venvSkip }, () => {
  const forged = clone(emitLongitudinal("clean_historical_pathway"));
  forged.source_hashes.ai_fluency_snapshot_hashes[0] = "c".repeat(64);
  rehash(forged);
  const result = LongitudinalSyntheticOutcomeProofArtifactSchema.safeParse(forged);
  assert.equal(result.success, false);
  assert.ok(
    result.error.issues.some((issue) =>
      issue.message.includes("AI Fluency snapshot source hashes must match")
    )
  );
});

test("unknown fields and unsafe output side doors reject", { skip: venvSkip }, () => {
  const unknown = rehash({
    ...clone(emitLongitudinal("clean_historical_pathway")),
    customer_confidence: 0.92
  });
  assert.equal(LongitudinalSyntheticOutcomeProofArtifactSchema.safeParse(unknown).success, false);

  const unsafe = clone(emitLongitudinal("clean_historical_pathway"));
  unsafe.customer_output_authorized = true;
  rehash(unsafe);
  assert.equal(LongitudinalSyntheticOutcomeProofArtifactSchema.safeParse(unsafe).success, false);

  const hashSidecar = clone(emitLongitudinal("clean_historical_pathway"));
  hashSidecar.primary_metric_binding.user_hash = "b".repeat(64);
  rehash(hashSidecar);
  assert.equal(
    LongitudinalSyntheticOutcomeProofArtifactSchema.safeParse(hashSidecar).success,
    false
  );
});

test("oracle generator sidecars reject even when rehashed", { skip: venvSkip }, () => {
  const groundTruth = clone(emitLongitudinal("clean_historical_pathway"));
  groundTruth.synthetic_generator.ground_truth = { beta_depth: 0.5 };
  rehash(groundTruth);
  assert.equal(
    LongitudinalSyntheticOutcomeProofArtifactSchema.safeParse(groundTruth).success,
    false
  );

  const scenario = clone(emitLongitudinal("clean_historical_pathway"));
  scenario.synthetic_generator.scenario = "clean_historical_pathway";
  rehash(scenario);
  assert.equal(LongitudinalSyntheticOutcomeProofArtifactSchema.safeParse(scenario).success, false);
});

test("non-HOLD artifacts require aggregate AI Fluency uncertainty", { skip: venvSkip }, () => {
  const forged = clone(emitLongitudinal("clean_historical_pathway"));
  for (const snapshot of forged.ai_fluency_snapshot_evidence) {
    snapshot.overall_standard_error = null;
    snapshot.dimension_standard_errors = {
      overall_ai_fluency: null,
      confidence: null,
      usage_quality: null,
      behavior_change: null,
      leadership_reinforcement: null,
      capability_growth: null
    };
    snapshot.measurement_uncertainty_state = "missing_uncertainty_visible";
  }
  rehash(forged);
  const result = LongitudinalSyntheticOutcomeProofArtifactSchema.safeParse(forged);
  assert.equal(result.success, false);
  assert.ok(
    result.error.issues.some((issue) =>
      issue.message.includes("aggregate AI Fluency uncertainty")
    )
  );
});

test("non-HOLD artifacts reject diagnostic and governance contradictions", { skip: venvSkip }, () => {
  const forged = clone(emitLongitudinal("clean_historical_pathway"));
  forged.diagnostics.passed = false;
  forged.diagnostics.failing_diagnostics = ["lag_sensitivity"];
  forged.diagnostics.lag_sensitivity_check.pass = false;
  rehash(forged);
  const result = LongitudinalSyntheticOutcomeProofArtifactSchema.safeParse(forged);
  assert.equal(result.success, false);
  assert.ok(
    result.error.issues.some((issue) =>
      issue.message.includes("diagnostic failures must match governance failures") ||
      issue.message.includes("non-HOLD artifacts require every diagnostic check")
    )
  );
});

test("pathway movement contradictions reject when rehashed", { skip: venvSkip }, () => {
  const forged = clone(emitLongitudinal("clean_historical_pathway"));
  forged.behavior_outcome_pathway_evidence.depth_moved_as_expected =
    !forged.vbd_exposure_evidence.movement_checks.depth.moved_as_expected;
  rehash(forged);
  const result = LongitudinalSyntheticOutcomeProofArtifactSchema.safeParse(forged);
  assert.equal(result.success, false);
  assert.ok(
    result.error.issues.some((issue) =>
      issue.message.includes("pathway movement booleans must match")
    )
  );
});

test("diagnostic sidecars reject even when artifact is rehashed", { skip: venvSkip }, () => {
  for (const sidecar of [
    { customer_output_authorized: true },
    { export_authorization: true },
    { writes_persistence: true },
    { confidence_percent: 91 },
    { probability_score: 0.91 },
    { causal_effect: 0.2 },
    { roi_amount: 1000 },
    { level_band: 5 },
    { segment_ref: "9".repeat(64) }
  ]) {
    const forged = clone(emitLongitudinal("clean_historical_pathway"));
    Object.assign(forged.diagnostics.prior_sensitivity_check, sidecar);
    rehash(forged);
    assert.equal(
      LongitudinalSyntheticOutcomeProofArtifactSchema.safeParse(forged).success,
      false
    );
  }
});

test("unsafe aggregate grain values reject when forged into artifacts", { skip: venvSkip }, () => {
  const forgedPlan = clone(emitLongitudinal("clean_historical_pathway"));
  forgedPlan.hypothesis_binding.cohort_scope = "manager_level_l5_tenure_0_1";
  rehash(forgedPlan);
  assert.equal(LongitudinalSyntheticOutcomeProofArtifactSchema.safeParse(forgedPlan).success, false);

  const forgedSnapshot = clone(emitLongitudinal("clean_historical_pathway"));
  forgedSnapshot.ai_fluency_snapshot_evidence[0].source_ref =
    "synthetic-ai-fluency://manager_level_tenure";
  rehash(forgedSnapshot);
  assert.equal(
    LongitudinalSyntheticOutcomeProofArtifactSchema.safeParse(forgedSnapshot).success,
    false
  );
});

test("unsupported route claims reject when forged", { skip: venvSkip }, () => {
  const forged = clone(emitLongitudinal("clean_historical_pathway"));
  forged.design_route.evidence_design = "STAGGERED_ROLLOUT";
  forged.design_route.decision = "ROUTE_LONGITUDINAL_SYNTHETIC_PROTOTYPE";
  rehash(forged);
  const result = LongitudinalSyntheticOutcomeProofArtifactSchema.safeParse(forged);
  assert.equal(result.success, false);
  assert.ok(
    result.error.issues.some((issue) =>
      issue.message.includes("staggered rollout must HOLD")
    )
  );
});

test("forged DiD route rejects under longitudinal schema", { skip: venvSkip }, () => {
  const forged = clone(emitLongitudinal("clean_historical_pathway"));
  forged.design_route.evidence_design = "TWO_GROUP_PRE_POST_COMPARISON";
  forged.design_route.decision = "ROUTE_COMPARISON_SUPPORTED_DID";
  forged.design_route.module = "comparison_supported_bayesian_did_module";
  forged.design_route.routing_diagnostic = null;
  rehash(forged);
  const result = LongitudinalSyntheticOutcomeProofArtifactSchema.safeParse(forged);
  assert.equal(result.success, false);
  assert.ok(
    result.error.issues.some((issue) =>
      issue.message.includes("DiD routes must use the DiD artifact schema")
    )
  );
});

test("unsafe business controls reject when forged", { skip: venvSkip }, () => {
  for (const controlName of [
    "manager_performance_rating",
    "level_band",
    "tenure_band"
  ]) {
    const forged = clone(emitLongitudinal("clean_historical_pathway"));
    forged.business_control_evidence.control_names.push(controlName);
    forged.business_control_evidence.control_source_refs.push(`synthetic-control://${controlName}`);
    rehash(forged);
    const result = LongitudinalSyntheticOutcomeProofArtifactSchema.safeParse(forged);
    assert.equal(result.success, false);
    assert.ok(
      result.error.issues.some((issue) =>
        issue.message.includes("unsafe HR/personnel/productivity control evidence") ||
        issue.message.includes("unsafe person-level")
      )
    );
  }
});
