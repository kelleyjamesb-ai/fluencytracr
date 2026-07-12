import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  LONGITUDINAL_SYNTHETIC_OUTCOME_PROOF_SCHEMA_VERSION_V1,
  LONGITUDINAL_SYNTHETIC_OUTCOME_PROOF_SCHEMA_VERSION_V2,
  LongitudinalSyntheticOutcomeProofArtifactSchema,
  LongitudinalSyntheticOutcomeProofV1ArtifactSchema,
  LongitudinalSyntheticOutcomeProofV2ArtifactSchema,
  longitudinalSyntheticOutcomeProofDiagnosticsEvidenceHash,
  longitudinalSyntheticOutcomeProofFitOutputEvidenceHash,
  longitudinalSyntheticOutcomeProofInputEvidenceHash,
  longitudinalSyntheticOutcomeProofPayloadHash,
  longitudinalSyntheticOutcomeProofSelfHash,
  sha256Json
} from "../dist/index.js";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "..", "..", "..");
const venvPython = path.join(repoRoot, "inference", ".venv", "bin", "python");
const pythonSrc = path.join(repoRoot, "inference", "src");

const venvSkip = existsSync(venvPython)
  ? false
  : "inference/.venv missing; longitudinal Python bridge test skipped";
const artifactCache = new Map();

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function emitLongitudinal(scenario) {
  if (artifactCache.has(scenario)) return clone(artifactCache.get(scenario));
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
  const artifact = JSON.parse(result.stdout);
  artifactCache.set(scenario, artifact);
  return clone(artifact);
}

function emitLongitudinalBatch(scenarios) {
  const uncached = scenarios.filter((scenario) => !artifactCache.has(scenario));
  if (uncached.length > 0) {
    const script = [
      "import json, sys",
      "from fluencytracr_inference.longitudinal_artifact import run_longitudinal_proof",
      "from fluencytracr_inference.longitudinal_synthetic import generate_longitudinal_dataset",
      "scenarios = json.loads(sys.argv[1])",
      "artifacts = {}",
      "for scenario in scenarios:",
      "    artifact, _ = run_longitudinal_proof(",
      "        generate_longitudinal_dataset(scenario=scenario, seed=20260710),",
      "        seed=20260710,",
      "        generated_at='2026-07-10T00:00:00+00:00',",
      "    )",
      "    artifacts[scenario] = artifact",
      "print(json.dumps(artifacts, sort_keys=True, separators=(',', ':')))"
    ].join("\n");
    const result = spawnSync(venvPython, ["-c", script, JSON.stringify(uncached)], {
      cwd: repoRoot,
      env: { ...process.env, PYTHONPATH: pythonSrc },
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      timeout: 180_000
    });
    assert.equal(result.status, 0, `python longitudinal batch failed:\n${result.stderr}`);
    for (const [scenario, artifact] of Object.entries(JSON.parse(result.stdout))) {
      artifactCache.set(scenario, artifact);
    }
  }
  return scenarios.map((scenario) => clone(artifactCache.get(scenario)));
}

function emitTooManyControlsHold() {
  const cacheKey = "__too_many_controls__";
  if (artifactCache.has(cacheKey)) return clone(artifactCache.get(cacheKey));
  const script = [
    "import json",
    "from dataclasses import replace",
    "import numpy as np",
    "from fluencytracr_inference.longitudinal_artifact import run_longitudinal_proof",
    "from fluencytracr_inference.longitudinal_synthetic import generate_longitudinal_dataset",
    "dataset = generate_longitudinal_dataset(seed=20260710)",
    "names = ('campaign_index', 'policy_index', 'volume_index')",
    "dataset = replace(",
    "    dataset,",
    "    control_matrix=np.column_stack([dataset.control_matrix, np.zeros((len(dataset.observed_outcome), 3))]),",
    "    control_names=dataset.control_names + names,",
    "    control_source_refs=dataset.control_source_refs + tuple(f'synthetic-control://{name}' for name in names),",
    "    control_source_hashes=dataset.control_source_hashes + ('a' * 64, 'b' * 64, 'c' * 64),",
    ")",
    "artifact, _ = run_longitudinal_proof(dataset, seed=20260710, generated_at='2026-07-10T00:00:00+00:00')",
    "print(json.dumps(artifact, sort_keys=True, separators=(',', ':')))"
  ].join("\n");
  const result = spawnSync(venvPython, ["-c", script], {
    cwd: repoRoot,
    env: { ...process.env, PYTHONPATH: pythonSrc },
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    timeout: 180_000
  });
  assert.equal(result.status, 0, `python too-many-controls HOLD failed:\n${result.stderr}`);
  const artifact = JSON.parse(result.stdout);
  artifactCache.set(cacheKey, artifact);
  return clone(artifact);
}

function emitEvidenceDesignHold(evidenceDesign) {
  const cacheKey = `__evidence_design__${evidenceDesign}`;
  if (artifactCache.has(cacheKey)) return clone(artifactCache.get(cacheKey));
  const script = [
    "import json, sys",
    "from dataclasses import replace",
    "from fluencytracr_inference.longitudinal_artifact import run_longitudinal_proof",
    "from fluencytracr_inference.longitudinal_synthetic import generate_longitudinal_dataset",
    "dataset = generate_longitudinal_dataset(seed=20260710)",
    "dataset = replace(dataset, hypothesis_plan=replace(dataset.hypothesis_plan, evidence_design=sys.argv[1]))",
    "artifact, _ = run_longitudinal_proof(dataset, seed=20260710, generated_at='2026-07-10T00:00:00+00:00')",
    "print(json.dumps(artifact, sort_keys=True, separators=(',', ':')))"
  ].join("\n");
  const result = spawnSync(venvPython, ["-c", script, evidenceDesign], {
    cwd: repoRoot,
    env: { ...process.env, PYTHONPATH: pythonSrc },
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    timeout: 180_000
  });
  assert.equal(result.status, 0, `python ${evidenceDesign} HOLD failed:\n${result.stderr}`);
  const artifact = JSON.parse(result.stdout);
  artifactCache.set(cacheKey, artifact);
  return clone(artifact);
}

function rehash(artifact) {
  artifact.hash_bindings.artifact_self_hash =
    longitudinalSyntheticOutcomeProofSelfHash(artifact);
  return artifact;
}

function coordinatedRehash(artifact) {
  artifact.hash_bindings.artifact_payload_hash =
    longitudinalSyntheticOutcomeProofPayloadHash(artifact);
  return rehash(artifact);
}

function rebindV2PublicInputCommitments(artifact) {
  const inputEvidenceHash = longitudinalSyntheticOutcomeProofInputEvidenceHash(artifact);
  const syntheticInputHash = sha256Json({
    input_evidence_hash: inputEvidenceHash,
    synthetic_input_private_remainder_hash:
      artifact.hash_bindings.synthetic_input_private_remainder_hash
  });
  artifact.hash_bindings.input_evidence_hash = inputEvidenceHash;
  artifact.hash_bindings.synthetic_input_hash = syntheticInputHash;
  artifact.synthetic_generator.synthetic_input_hash = syntheticInputHash;
  if (artifact.hash_bindings.fit_summary_hash !== null) {
    artifact.hash_bindings.fit_summary_hash = sha256Json({
      synthetic_input_hash: syntheticInputHash,
      diagnostics_fit_summary_hash:
        artifact.hash_bindings.diagnostics_fit_summary_hash,
      fit_output_evidence_hash: artifact.hash_bindings.fit_output_evidence_hash
    });
  }
  return coordinatedRehash(artifact);
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

function assertV2Pins(artifact) {
  assertPins(artifact);
  assert.equal(
    artifact.model_specification.model_kind,
    "closed_form_gaussian_longitudinal_smoke_regression"
  );
  assert.equal(
    artifact.model_specification.residual_structure,
    "independent_gaussian_with_posthoc_ar1_diagnostic_only"
  );
  assert.equal(
    artifact.model_specification.posterior_engine,
    "closed_form_gaussian_analytic_draws"
  );
  assert.equal(artifact.model_specification.nuts_sampler_used, false);
  assert.equal(artifact.model_specification.ar1_likelihood_modeled, false);
  assert.equal(artifact.model_specification.partial_pooling_implemented, false);
  assert.equal(artifact.model_specification.historical_forecast, false);
  assert.equal(artifact.model_specification.mcmc_chains, 0);
  assert.equal(
    artifact.model_input_governance.minimum_worthwhile_change_used_in_inference,
    false
  );
  for (const diagnostic of [
    artifact.diagnostics.placebo_intervention_date_check,
    artifact.diagnostics.counterfactual_stability_check,
    artifact.diagnostics.prior_sensitivity_check,
    artifact.diagnostics.posterior_predictive_check,
    artifact.diagnostics.sampler_diagnostics
  ]) {
    assert.equal(diagnostic.status, "NOT_RUN");
    assert.equal("pass" in diagnostic, false);
  }
}

function asLegacyV1(v2Artifact) {
  const legacy = clone(v2Artifact);
  const diagnostics = legacy.diagnostics;
  const pathway = legacy.behavior_outcome_pathway_evidence;

  legacy.schema_version = LONGITUDINAL_SYNTHETIC_OUTCOME_PROOF_SCHEMA_VERSION_V1;
  legacy.model_specification = {
    likelihood_family: "continuous_normal_identity",
    link_function: "identity",
    residual_structure: "ar1_residual_structure",
    sampler_kind: "closed_form_gaussian_posterior_smoke_not_nuts",
    chains: 2,
    synthetic_smoke_only: true,
    replicated_calibration_complete: false
  };
  legacy.governance_state.state = "eligible_internal_smoke_only";
  legacy.behavior_outcome_pathway_evidence = {
    pathway_state: "BEHAVIOR_AND_OUTCOME_ALIGNED",
    velocity_moved_as_expected: pathway.velocity_moved_as_expected,
    breadth_moved_as_expected: pathway.breadth_moved_as_expected,
    depth_moved_as_expected: pathway.depth_moved_as_expected,
    posterior_direction_beta_velocity: pathway.posterior_direction_beta_velocity,
    posterior_direction_beta_breadth: pathway.posterior_direction_beta_breadth,
    depth_context_only: true,
    meaningful_primary_outcome_movement_supported:
      pathway.meaningful_primary_outcome_movement_supported,
    approved_lag_respected: pathway.approved_lag_respected,
    quality_guardrail_acceptable: true
  };
  legacy.diagnostics = {
    passed: diagnostics.executed_checks_passed,
    failing_diagnostics: diagnostics.failing_diagnostics,
    design_matrix_identifiability: diagnostics.design_matrix_identifiability,
    residual_autocorrelation_check: {
      pass: diagnostics.residual_autocorrelation_check.pass,
      residual_structure: "ar1_residual_structure",
      rho_estimate: diagnostics.residual_autocorrelation_check.rho_estimate,
      residual_sd_estimate:
        diagnostics.residual_autocorrelation_check.residual_sd_estimate
    },
    pre_period_fit_check: diagnostics.pre_period_fit_check,
    pre_period_rolling_backtest: {
      pass: diagnostics.pre_period_rolling_backtest.pass,
      compiled_backtest_policy:
        diagnostics.pre_period_rolling_backtest.compiled_backtest_policy,
      holdout_rmse: diagnostics.pre_period_rolling_backtest.holdout_rmse,
      rmse_threshold: diagnostics.pre_period_rolling_backtest.rmse_threshold
    },
    placebo_intervention_date_check: {
      pass: true,
      placebo_date_policy: "false_pre_period_intervention_date_smoke",
      early_post_direction_adjusted_residual_max:
        diagnostics.lag_sensitivity_check.early_post_direction_adjusted_residual_max,
      early_post_threshold: diagnostics.lag_sensitivity_check.early_post_threshold
    },
    counterfactual_stability_check: {
      pass: true,
      counterfactual_reference: legacy.counterfactual_derivation.counterfactual_reference,
      smoke_scope: legacy.counterfactual_derivation.smoke_scope
    },
    lag_sensitivity_check: diagnostics.lag_sensitivity_check,
    common_shock_sensitivity_check: diagnostics.common_shock_sensitivity_check,
    temporary_effect_persistence_check: diagnostics.temporary_effect_persistence_check,
    prior_sensitivity_check: {
      pass: true,
      posterior_mean_movement:
        legacy.posterior_estimand_summary.posterior_mean_movement,
      smoke_only: true
    }
  };
  delete legacy.model_input_governance;
  delete legacy.hash_bindings.synthetic_input_private_remainder_hash;
  delete legacy.hash_bindings.input_evidence_hash;
  delete legacy.hash_bindings.fit_summary_hash;
  delete legacy.hash_bindings.diagnostics_fit_summary_hash;
  delete legacy.hash_bindings.fit_private_remainder_hash;
  delete legacy.hash_bindings.diagnostics_evidence_hash;
  delete legacy.hash_bindings.fit_output_evidence_hash;
  delete legacy.hash_bindings.artifact_payload_hash;
  return rehash(legacy);
}

function asLegacyV1NoFitHold(v2Artifact) {
  const legacy = clone(v2Artifact);
  legacy.schema_version = LONGITUDINAL_SYNTHETIC_OUTCOME_PROOF_SCHEMA_VERSION_V1;
  legacy.model_specification = {
    likelihood_family: "continuous_normal_identity",
    link_function: "identity",
    residual_structure: "ar1_residual_structure",
    sampler_kind: "not_fit_due_to_fail_closed_hold",
    chains: 0,
    synthetic_smoke_only: true,
    replicated_calibration_complete: false
  };
  legacy.behavior_outcome_pathway_evidence = {
    pathway_state: "HOLD",
    velocity_moved_as_expected: false,
    breadth_moved_as_expected: false,
    depth_moved_as_expected: false,
    meaningful_primary_outcome_movement_supported: false,
    approved_lag_respected: false,
    quality_guardrail_acceptable: false
  };
  legacy.diagnostics = {
    passed: false,
    failing_diagnostics: legacy.governance_state.failing_diagnostics
  };
  delete legacy.model_input_governance;
  delete legacy.hash_bindings.synthetic_input_private_remainder_hash;
  delete legacy.hash_bindings.input_evidence_hash;
  delete legacy.hash_bindings.fit_summary_hash;
  delete legacy.hash_bindings.diagnostics_fit_summary_hash;
  delete legacy.hash_bindings.fit_private_remainder_hash;
  delete legacy.hash_bindings.diagnostics_evidence_hash;
  delete legacy.hash_bindings.fit_output_evidence_hash;
  delete legacy.hash_bindings.artifact_payload_hash;
  return rehash(legacy);
}

test("Python clean V2 artifact validates as nonauthorizing analytic smoke", { skip: venvSkip }, () => {
  const artifact = emitLongitudinal("clean_historical_pathway");
  assert.equal(
    longitudinalSyntheticOutcomeProofSelfHash(artifact),
    artifact.hash_bindings.artifact_self_hash
  );
  assert.equal(
    longitudinalSyntheticOutcomeProofInputEvidenceHash(artifact),
    artifact.hash_bindings.input_evidence_hash
  );
  assert.equal(
    longitudinalSyntheticOutcomeProofDiagnosticsEvidenceHash(artifact.diagnostics),
    artifact.hash_bindings.diagnostics_evidence_hash
  );
  assert.equal(
    longitudinalSyntheticOutcomeProofFitOutputEvidenceHash(artifact),
    artifact.hash_bindings.fit_output_evidence_hash
  );
  assert.equal(
    artifact.diagnostics.fit_summary_hash,
    artifact.hash_bindings.diagnostics_fit_summary_hash
  );
  assert.equal(
    artifact.hash_bindings.fit_summary_hash,
    sha256Json({
      synthetic_input_hash: artifact.hash_bindings.synthetic_input_hash,
      diagnostics_fit_summary_hash:
        artifact.hash_bindings.diagnostics_fit_summary_hash,
      fit_output_evidence_hash: artifact.hash_bindings.fit_output_evidence_hash
    })
  );
  const parsed = LongitudinalSyntheticOutcomeProofV2ArtifactSchema.parse(artifact);
  assert.equal(
    LongitudinalSyntheticOutcomeProofArtifactSchema.parse(artifact).schema_version,
    LONGITUDINAL_SYNTHETIC_OUTCOME_PROOF_SCHEMA_VERSION_V2
  );
  assert.equal(LongitudinalSyntheticOutcomeProofV1ArtifactSchema.safeParse(artifact).success, false);
  assert.equal(parsed.governance_state.state, "valid_internal_smoke_non_authorizing");
  assert.deepEqual(parsed.governance_state.failing_diagnostics, []);
  assert.equal(parsed.design_route.evidence_design, "HISTORICAL_STATE_SPACE");
  assert.equal(parsed.design_route.decision, "ROUTE_LONGITUDINAL_SYNTHETIC_PROTOTYPE");
  assertV2Pins(parsed);
});

test("Python null longitudinal artifact validates as non-authorizing", { skip: venvSkip }, () => {
  const artifact = emitLongitudinal("null_pathway");
  const parsed = LongitudinalSyntheticOutcomeProofV2ArtifactSchema.parse(artifact);
  assert.equal(parsed.governance_state.state, "valid_internal_smoke_non_authorizing");
  assert.equal(
    parsed.behavior_outcome_pathway_evidence.pathway_state,
    "NO_INTERNAL_SMOKE_MOVEMENT"
  );
  assert.ok(parsed.posterior_estimand_summary.credible_interval_80.lower < 0);
  assertV2Pins(parsed);
});

test("Python HOLD longitudinal artifact validates with named diagnostic", { skip: venvSkip }, () => {
  const artifact = emitLongitudinal("missing_or_suppressed_windows");
  const parsed = LongitudinalSyntheticOutcomeProofV2ArtifactSchema.parse(artifact);
  assert.equal(parsed.governance_state.state, "HOLD");
  assert.ok(
    parsed.governance_state.failing_diagnostics.includes("missing_or_suppressed_windows")
  );
  assert.equal(parsed.posterior_estimand_summary, null);
  assert.equal(parsed.hash_bindings.fit_summary_hash, null);
  assert.equal(parsed.hash_bindings.diagnostics_fit_summary_hash, null);
  assert.equal(parsed.hash_bindings.fit_private_remainder_hash, null);
  assert.equal(parsed.hash_bindings.diagnostics_evidence_hash, null);
  assert.equal(parsed.hash_bindings.fit_output_evidence_hash, null);
  assertV2Pins(parsed);
});

test("every emitted Python HOLD class remains bridge-readable", { skip: venvSkip }, () => {
  const scenarios = [
    ["insufficient_history", "insufficient_history"],
    ["missing_or_suppressed_windows", "missing_or_suppressed_windows"],
    ["collinear_vbd", "design_matrix_identifiability"],
    ["non_normal_metric_request", "unsupported_likelihood_family"],
    ["target_contamination", "target_contamination"],
    ["staggered_rollout_misroute", "unsupported_staggered_event_study"],
    ["baseline_only", "baseline_only_no_contribution_confidence"],
    ["missing_measurement_uncertainty", "missing_measurement_uncertainty"],
    ["wrong_lag", "lag_sensitivity"],
    ["approved_control_common_shock", "common_shock_sensitivity"],
    ["temporary_spike", "temporary_effect_persistence"]
  ];
  const artifacts = emitLongitudinalBatch(scenarios.map(([scenario]) => scenario));
  for (const [index, [scenario, diagnostic]] of scenarios.entries()) {
    const parsed = LongitudinalSyntheticOutcomeProofV2ArtifactSchema.parse(
      artifacts[index]
    );
    assert.equal(parsed.governance_state.state, "HOLD", scenario);
    assert.ok(
      parsed.governance_state.failing_diagnostics.includes(diagnostic),
      `${scenario} must name ${diagnostic}`
    );
    assertV2Pins(parsed);
  }
});

test("too many aligned controls remain a bridge-readable design HOLD", { skip: venvSkip }, () => {
  const parsed = LongitudinalSyntheticOutcomeProofV2ArtifactSchema.parse(
    emitTooManyControlsHold()
  );
  assert.equal(parsed.governance_state.state, "HOLD");
  assert.ok(
    parsed.governance_state.failing_diagnostics.includes(
      "design_matrix_identifiability"
    )
  );
  assert.equal(parsed.business_control_evidence.control_names.length, 5);
});

test("controlled and matched designs remain bridge-readable longitudinal HOLDs", { skip: venvSkip }, () => {
  for (const evidenceDesign of ["CONTROLLED_TEST", "MATCHED_COMPARISON"]) {
    const parsed = LongitudinalSyntheticOutcomeProofV2ArtifactSchema.parse(
      emitEvidenceDesignHold(evidenceDesign)
    );
    assert.equal(parsed.governance_state.state, "HOLD");
    assert.deepEqual(parsed.governance_state.failing_diagnostics, [
      "unsupported_evidence_design"
    ]);
    assert.equal(parsed.design_route.decision, "HOLD_UNSUPPORTED_CONTROLLED_TEST_MODEL");
  }
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

test("V2 payload commitment rejects self-rehashed payload rewrites", { skip: venvSkip }, () => {
  const clean = emitLongitudinal("clean_historical_pathway");
  assert.equal(
    clean.hash_bindings.artifact_payload_hash,
    longitudinalSyntheticOutcomeProofPayloadHash(clean)
  );
  const mutations = [
    (artifact) => {
      artifact.posterior_estimand_summary.posterior_mean_movement += 0.01;
    },
    (artifact) => {
      artifact.ai_fluency_snapshot_evidence[0].overall_ai_fluency_score += 1;
    },
    (artifact) => {
      artifact.hypothesis_binding.primary_metric_id = "rewritten_metric";
      artifact.primary_metric_binding.metric_id = "rewritten_metric";
    }
  ];
  for (const mutate of mutations) {
    const forged = emitLongitudinal("clean_historical_pathway");
    mutate(forged);
    rehash(forged);
    const result = LongitudinalSyntheticOutcomeProofV2ArtifactSchema.safeParse(forged);
    assert.equal(result.success, false);
    assert.ok(
      result.error.issues.some((issue) =>
        issue.message.includes("artifact_payload_hash must bind")
      )
    );
  }
});

test("source hash mismatch rejects even when self-hash is refreshed", { skip: venvSkip }, () => {
  const forged = clone(emitLongitudinal("clean_historical_pathway"));
  forged.source_hashes.ai_fluency_snapshot_hashes[0] = "c".repeat(64);
  forged.hash_bindings.source_hashes_hash = sha256Json(forged.source_hashes);
  rehash(forged);
  const result = LongitudinalSyntheticOutcomeProofArtifactSchema.safeParse(forged);
  assert.equal(result.success, false);
  assert.ok(
    result.error.issues.some((issue) =>
      issue.message.includes("AI Fluency snapshot source hashes must match")
    )
  );
});

test("final fit commitment rejects input and fit splicing", { skip: venvSkip }, () => {
  const inputArtifact = emitLongitudinal("clean_historical_pathway");
  const fitArtifact = emitLongitudinal("null_pathway");
  for (const field of [
    "fit_summary_hash",
    "diagnostics_fit_summary_hash",
    "fit_private_remainder_hash",
    "diagnostics_evidence_hash",
    "fit_output_evidence_hash"
  ]) {
    inputArtifact.hash_bindings[field] = fitArtifact.hash_bindings[field];
  }
  inputArtifact.diagnostics = fitArtifact.diagnostics;
  inputArtifact.posterior_estimand_summary = fitArtifact.posterior_estimand_summary;
  inputArtifact.model_specification.analytic_posterior_draw_count =
    fitArtifact.model_specification.analytic_posterior_draw_count;
  inputArtifact.behavior_outcome_pathway_evidence =
    fitArtifact.behavior_outcome_pathway_evidence;
  coordinatedRehash(inputArtifact);

  const result = LongitudinalSyntheticOutcomeProofV2ArtifactSchema.safeParse(inputArtifact);
  assert.equal(result.success, false);
  assert.ok(
    result.error.issues.some((issue) =>
      issue.message.includes("fit outputs must remain bound")
    )
  );
});

test("V2 rejects unapproved synthetic controls after public input rebinding", { skip: venvSkip }, () => {
  const forged = emitLongitudinal("clean_historical_pathway");
  forged.business_control_evidence.control_names[0] = "ssn_123_45_6789_index";
  forged.business_control_evidence.control_source_refs[0] =
    "synthetic-control://ssn_123_45_6789_index";
  rebindV2PublicInputCommitments(forged);

  const result = LongitudinalSyntheticOutcomeProofV2ArtifactSchema.safeParse(forged);
  assert.equal(result.success, false);
  assert.ok(
    result.error.issues.some((issue) =>
      issue.message.includes("compiled approved synthetic identities")
    )
  );
});

test("V2 rejects unsafe timestamps and JavaScript-unsafe seeds", { skip: venvSkip }, () => {
  for (const generatedAt of [
    "James Kelley +1 212-555-0199",
    "2026-02-30T00:00:00Z"
  ]) {
    const invalidTimestamp = emitLongitudinal("clean_historical_pathway");
    invalidTimestamp.generated_at = generatedAt;
    coordinatedRehash(invalidTimestamp);
    const timestampResult =
      LongitudinalSyntheticOutcomeProofV2ArtifactSchema.safeParse(invalidTimestamp);
    assert.equal(timestampResult.success, false);
    assert.ok(
      timestampResult.error.issues.some((issue) =>
        issue.message.includes("timezone-aware RFC3339")
      )
    );
  }

  const unsafeSeed = emitLongitudinal("clean_historical_pathway");
  unsafeSeed.synthetic_generator.seed = Number.MAX_SAFE_INTEGER + 1;
  rebindV2PublicInputCommitments(unsafeSeed);
  const seedResult = LongitudinalSyntheticOutcomeProofV2ArtifactSchema.safeParse(unsafeSeed);
  assert.equal(seedResult.success, false);
  assert.ok(
    seedResult.error.issues.some((issue) =>
      issue.message.includes("JavaScript-safe integer")
    )
  );
});

test("V2 Python and TypeScript privacy vocabularies reject birth metadata", { skip: venvSkip }, () => {
  const forged = emitLongitudinal("clean_historical_pathway");
  forged.hypothesis_binding.hypothesis_statement = "date_of_birth";
  rebindV2PublicInputCommitments(forged);

  const result = LongitudinalSyntheticOutcomeProofV2ArtifactSchema.safeParse(forged);
  assert.equal(result.success, false);
  assert.ok(
    result.error.issues.some((issue) =>
      issue.message.includes("unsafe person-level")
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
  groundTruth.synthetic_generator.ground_truth = { beta_breadth: 0.72 };
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

  const missingOverallDimension = emitLongitudinal("clean_historical_pathway");
  missingOverallDimension.ai_fluency_snapshot_evidence[0]
    .dimension_standard_errors.overall_ai_fluency = null;
  rehash(missingOverallDimension);
  assert.equal(
    LongitudinalSyntheticOutcomeProofArtifactSchema.safeParse(missingOverallDimension).success,
    false
  );
});

test("V2 rejects Python-incompatible directions and zero uncertainty", { skip: venvSkip }, () => {
  const stable = emitLongitudinal("clean_historical_pathway");
  stable.hypothesis_binding.expected_metric_direction = "stable_or_guardrail";
  stable.primary_metric_binding.expected_direction = "stable_or_guardrail";
  rehash(stable);
  assert.equal(
    LongitudinalSyntheticOutcomeProofV2ArtifactSchema.safeParse(stable).success,
    false
  );

  const zeroUncertainty = emitLongitudinal("clean_historical_pathway");
  zeroUncertainty.ai_fluency_snapshot_evidence[0].overall_standard_error = 0;
  rehash(zeroUncertainty);
  assert.equal(
    LongitudinalSyntheticOutcomeProofV2ArtifactSchema.safeParse(zeroUncertainty).success,
    false
  );
});

test("non-finite posterior values and reversed intervals reject after rehash", { skip: venvSkip }, () => {
  const nonfinite = emitLongitudinal("clean_historical_pathway");
  nonfinite.posterior_estimand_summary.posterior_mean_movement = Infinity;
  rehash(nonfinite);
  assert.equal(
    LongitudinalSyntheticOutcomeProofV2ArtifactSchema.safeParse(nonfinite).success,
    false
  );

  const reversed = emitLongitudinal("clean_historical_pathway");
  const interval = reversed.posterior_estimand_summary.credible_interval_80;
  [interval.lower, interval.upper] = [interval.upper, interval.lower];
  rehash(reversed);
  assert.equal(
    LongitudinalSyntheticOutcomeProofV2ArtifactSchema.safeParse(reversed).success,
    false
  );
});

test("non-HOLD artifacts reject diagnostic and governance contradictions", { skip: venvSkip }, () => {
  const forged = clone(emitLongitudinal("clean_historical_pathway"));
  forged.diagnostics.executed_checks_passed = false;
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

test("rehashed V2 sampler and model-capability overclaims reject", { skip: venvSkip }, () => {
  const mutations = [
    ["posterior_engine", "pymc_nuts"],
    ["nuts_sampler_used", true],
    ["ar1_likelihood_modeled", true],
    ["partial_pooling_implemented", true],
    ["historical_forecast", true],
    ["mcmc_chains", 4]
  ];
  for (const [field, value] of mutations) {
    const forged = emitLongitudinal("clean_historical_pathway");
    forged.model_specification[field] = value;
    rehash(forged);
    assert.equal(
      LongitudinalSyntheticOutcomeProofArtifactSchema.safeParse(forged).success,
      false,
      `expected forged ${field} claim to reject`
    );
  }
});

test("rehashed V2 NOT_RUN diagnostic overclaims reject", { skip: venvSkip }, () => {
  for (const diagnostic of [
    "placebo_intervention_date_check",
    "counterfactual_stability_check",
    "prior_sensitivity_check",
    "posterior_predictive_check",
    "sampler_diagnostics"
  ]) {
    const forged = emitLongitudinal("clean_historical_pathway");
    forged.diagnostics[diagnostic] = { status: "PASS", pass: true };
    rehash(forged);
    assert.equal(
      LongitudinalSyntheticOutcomeProofArtifactSchema.safeParse(forged).success,
      false,
      `expected forged ${diagnostic} result to reject`
    );
  }

  const forgedReason = emitLongitudinal("clean_historical_pathway");
  forgedReason.diagnostics.prior_sensitivity_check.reason =
    "prior_sensitivity_passed_in_closed_form_smoke";
  rehash(forgedReason);
  assert.equal(
    LongitudinalSyntheticOutcomeProofArtifactSchema.safeParse(forgedReason).success,
    false
  );
});

test("coordinated rehash cannot rewrite compiled diagnostic thresholds", { skip: venvSkip }, () => {
  const mutations = [
    (artifact) => {
      artifact.diagnostics.pre_period_rolling_backtest.rmse_threshold *= 100;
    },
    (artifact) => {
      artifact.diagnostics.lag_sensitivity_check.early_post_threshold *= 100;
      artifact.diagnostics.lag_sensitivity_check.evaluation_movement_threshold *= 100;
    },
    (artifact) => {
      artifact.diagnostics.temporary_effect_persistence_check.spike_threshold *= 100;
      artifact.diagnostics.temporary_effect_persistence_check.slope_threshold *= 100;
    }
  ];
  for (const mutate of mutations) {
    const forged = emitLongitudinal("clean_historical_pathway");
    mutate(forged);
    coordinatedRehash(forged);
    assert.equal(
      LongitudinalSyntheticOutcomeProofV2ArtifactSchema.safeParse(forged).success,
      false
    );
  }
});

test("coordinated rehash cannot rewrite diagnostic operands beneath an unchanged fit commitment", { skip: venvSkip }, () => {
  const forged = emitLongitudinal("temporary_spike");
  forged.diagnostics.temporary_effect_persistence_check.evaluation_residual_max += 0.001;
  coordinatedRehash(forged);

  const result = LongitudinalSyntheticOutcomeProofV2ArtifactSchema.safeParse(forged);
  assert.equal(result.success, false);
  assert.ok(
    result.error.issues.some((issue) =>
      issue.message.includes("diagnostics evidence must remain bound")
    )
  );
});

test("coordinated rehash cannot rewrite fit outputs beneath an unchanged fit commitment", { skip: venvSkip }, () => {
  const mutations = [
    (artifact) => {
      artifact.posterior_estimand_summary.posterior_mean_movement += 0.01;
    },
    (artifact) => {
      artifact.model_specification.analytic_posterior_draw_count += 1;
    },
    (artifact) => {
      const pathway = artifact.behavior_outcome_pathway_evidence;
      pathway.posterior_direction_beta_velocity =
        pathway.posterior_direction_beta_velocity === "positive"
          ? "not_positive"
          : "positive";
    }
  ];
  for (const mutate of mutations) {
    const forged = emitLongitudinal("clean_historical_pathway");
    mutate(forged);
    coordinatedRehash(forged);
    const result = LongitudinalSyntheticOutcomeProofV2ArtifactSchema.safeParse(forged);
    assert.equal(result.success, false);
    assert.ok(
      result.error.issues.some((issue) =>
        issue.message.includes("fit outputs must remain bound")
      )
    );
  }
});

test("coordinated rehash cannot relabel no-fit HOLD reasons", { skip: venvSkip }, () => {
  const relabeled = emitLongitudinal("missing_or_suppressed_windows");
  relabeled.diagnostics.failing_diagnostics = ["placebo_intervention_date"];
  relabeled.governance_state.failing_diagnostics = ["placebo_intervention_date"];
  coordinatedRehash(relabeled);
  const relabeledResult =
    LongitudinalSyntheticOutcomeProofV2ArtifactSchema.safeParse(relabeled);
  assert.equal(relabeledResult.success, false);
  assert.ok(
    relabeledResult.error.issues.some((issue) =>
      issue.message.includes("no-fit HOLD reason must be derived")
    )
  );

  const forgedDesign = emitLongitudinal("collinear_vbd");
  forgedDesign.diagnostics.pre_fit_design_matrix_check.rank =
    forgedDesign.diagnostics.pre_fit_design_matrix_check.parameter_count;
  forgedDesign.diagnostics.pre_fit_design_matrix_check.condition_number = 1;
  forgedDesign.diagnostics.pre_fit_design_matrix_check.max_abs_velocity_breadth_correlation = 0;
  coordinatedRehash(forgedDesign);
  assert.equal(
    LongitudinalSyntheticOutcomeProofV2ArtifactSchema.safeParse(forgedDesign).success,
    false
  );

  const misplacedDesignEvidence = emitLongitudinal("missing_or_suppressed_windows");
  misplacedDesignEvidence.diagnostics.pre_fit_design_matrix_check = clone(
    emitLongitudinal("collinear_vbd").diagnostics.pre_fit_design_matrix_check
  );
  coordinatedRehash(misplacedDesignEvidence);
  assert.equal(
    LongitudinalSyntheticOutcomeProofV2ArtifactSchema.safeParse(
      misplacedDesignEvidence
    ).success,
    false
  );
});

test("coordinated rehash cannot rewrite no-fit operands beneath an unchanged input commitment", { skip: venvSkip }, () => {
  const forged = emitLongitudinal("missing_or_suppressed_windows");
  forged.model_input_governance.target_value_used_as_prior = true;
  forged.diagnostics.failing_diagnostics = ["target_contamination"];
  forged.governance_state.failing_diagnostics = ["target_contamination"];
  coordinatedRehash(forged);

  const result = LongitudinalSyntheticOutcomeProofV2ArtifactSchema.safeParse(forged);
  assert.equal(result.success, false);
  assert.ok(
    result.error.issues.some((issue) =>
      issue.message.includes("input evidence must remain bound")
    )
  );
});

test("V2 uncertainty state remains structurally consistent on HOLD artifacts", { skip: venvSkip }, () => {
  const forged = emitLongitudinal("non_normal_metric_request");
  forged.ai_fluency_snapshot_evidence[0].overall_standard_error = null;
  coordinatedRehash(forged);

  const result = LongitudinalSyntheticOutcomeProofV2ArtifactSchema.safeParse(forged);
  assert.equal(result.success, false);
  assert.ok(
    result.error.issues.some((issue) =>
      issue.message.includes("uncertainty state must match")
    )
  );
});

test("V2 rejects redacted privacy violations instead of accepting a HOLD artifact", { skip: venvSkip }, () => {
  const forged = emitLongitudinal("missing_or_suppressed_windows");
  forged.business_control_evidence.control_names = [];
  forged.business_control_evidence.control_source_refs = [];
  forged.business_control_evidence.source_hashes = [];
  forged.business_control_evidence.unsafe_control_refs_redacted = true;
  forged.source_hashes.control_source_hashes = [];
  forged.hash_bindings.source_hashes_hash = sha256Json(forged.source_hashes);
  coordinatedRehash(forged);

  const result = LongitudinalSyntheticOutcomeProofV2ArtifactSchema.safeParse(forged);
  assert.equal(result.success, false);
  assert.ok(
    result.error.issues.some((issue) =>
      issue.message.includes("must reject before V2 artifact emission")
    )
  );
});

test("fit and diagnostics hash mismatches reject after rehash", { skip: venvSkip }, () => {
  const forged = emitLongitudinal("clean_historical_pathway");
  forged.hash_bindings.diagnostics_fit_summary_hash = "d".repeat(64);
  rehash(forged);
  const result = LongitudinalSyntheticOutcomeProofArtifactSchema.safeParse(forged);
  assert.equal(result.success, false);
  assert.ok(
    result.error.issues.some((issue) =>
      issue.message.includes("diagnostics must bind to the diagnostics fit commitment")
    )
  );
});

test("dataset, fit, and diagnostics hash mismatches reject after self-rehash", { skip: venvSkip }, () => {
  const mutations = [
    (artifact) => {
      artifact.synthetic_generator.synthetic_input_hash = "a".repeat(64);
    },
    (artifact) => {
      artifact.hash_bindings.fit_summary_hash = "b".repeat(64);
    },
    (artifact) => {
      artifact.diagnostics.fit_summary_hash = "c".repeat(64);
    }
  ];
  for (const mutate of mutations) {
    const forged = emitLongitudinal("clean_historical_pathway");
    mutate(forged);
    rehash(forged);
    assert.equal(
      LongitudinalSyntheticOutcomeProofArtifactSchema.safeParse(forged).success,
      false
    );
  }
});

test("derived governance and no-fit HOLD semantics reject rehashed claims", { skip: venvSkip }, () => {
  const falseHold = emitLongitudinal("clean_historical_pathway");
  falseHold.governance_state.state = "HOLD";
  rehash(falseHold);
  assert.equal(
    LongitudinalSyntheticOutcomeProofArtifactSchema.safeParse(falseHold).success,
    false
  );

  const claimedFit = emitLongitudinal("missing_or_suppressed_windows");
  claimedFit.model_specification.analytic_posterior_draw_count = 100;
  rehash(claimedFit);
  assert.equal(
    LongitudinalSyntheticOutcomeProofArtifactSchema.safeParse(claimedFit).success,
    false
  );

  const modeledAr1 = emitLongitudinal("clean_historical_pathway");
  modeledAr1.diagnostics.residual_autocorrelation_check.modeled_in_likelihood = true;
  rehash(modeledAr1);
  assert.equal(
    LongitudinalSyntheticOutcomeProofArtifactSchema.safeParse(modeledAr1).success,
    false
  );

  const authorized = emitLongitudinal("clean_historical_pathway");
  authorized.behavior_outcome_pathway_evidence.pathway_evidence_authorized = true;
  rehash(authorized);
  assert.equal(
    LongitudinalSyntheticOutcomeProofArtifactSchema.safeParse(authorized).success,
    false
  );
});

test("legacy V1 smoke artifacts remain readable but retain V1 semantics", { skip: venvSkip }, () => {
  const legacy = asLegacyV1(emitLongitudinal("clean_historical_pathway"));
  legacy.ai_fluency_snapshot_evidence[0].dimension_standard_errors.legacy_uncertainty = null;
  rehash(legacy);
  const parsed = LongitudinalSyntheticOutcomeProofV1ArtifactSchema.parse(legacy);

  assert.equal(
    LongitudinalSyntheticOutcomeProofArtifactSchema.parse(legacy).schema_version,
    LONGITUDINAL_SYNTHETIC_OUTCOME_PROOF_SCHEMA_VERSION_V1
  );
  assert.equal(LongitudinalSyntheticOutcomeProofV2ArtifactSchema.safeParse(legacy).success, false);
  assert.equal(parsed.governance_state.state, "eligible_internal_smoke_only");
  assert.equal("fit_summary_hash" in parsed.hash_bindings, false);
  assert.equal("model_kind" in parsed.model_specification, false);
  assertPins(parsed);
});

test("legacy V1 no-fit HOLD artifacts remain readable", { skip: venvSkip }, () => {
  const legacy = asLegacyV1NoFitHold(
    emitLongitudinal("missing_or_suppressed_windows")
  );
  const parsed = LongitudinalSyntheticOutcomeProofV1ArtifactSchema.parse(legacy);

  assert.equal(parsed.governance_state.state, "HOLD");
  assert.equal(parsed.posterior_estimand_summary, null);
  assert.equal(parsed.model_specification.sampler_kind, "not_fit_due_to_fail_closed_hold");
  assert.equal(parsed.model_specification.chains, 0);
  assert.equal(LongitudinalSyntheticOutcomeProofV2ArtifactSchema.safeParse(legacy).success, false);
});

test("legacy V1 artifacts reject more than four aligned controls after self-rehash", { skip: venvSkip }, () => {
  const legacy = asLegacyV1(emitLongitudinal("clean_historical_pathway"));
  const extraControls = [
    ["campaign_index", "synthetic-control://campaign-index", "a".repeat(64)],
    ["policy_index", "synthetic-control://policy-index", "b".repeat(64)],
    ["volume_index", "synthetic-control://volume-index", "c".repeat(64)]
  ];
  legacy.business_control_evidence.control_names.push(
    ...extraControls.map(([name]) => name)
  );
  legacy.business_control_evidence.control_source_refs.push(
    ...extraControls.map(([, sourceRef]) => sourceRef)
  );
  legacy.business_control_evidence.source_hashes.push(
    ...extraControls.map(([, , sourceHash]) => sourceHash)
  );
  legacy.source_hashes.control_source_hashes.push(
    ...extraControls.map(([, , sourceHash]) => sourceHash)
  );
  legacy.hash_bindings.source_hashes_hash = sha256Json(legacy.source_hashes);
  rehash(legacy);

  const v1Result = LongitudinalSyntheticOutcomeProofV1ArtifactSchema.safeParse(legacy);
  assert.equal(v1Result.success, false);
  assert.ok(
    v1Result.error.issues.some(
      (issue) => issue.path.join(".") === "business_control_evidence.control_names"
    )
  );
  assert.equal(LongitudinalSyntheticOutcomeProofArtifactSchema.safeParse(legacy).success, false);
});

test("legacy fitted non-HOLD artifacts reject a failed placebo check after self-rehash", { skip: venvSkip }, () => {
  const legacy = asLegacyV1(emitLongitudinal("clean_historical_pathway"));
  legacy.diagnostics.placebo_intervention_date_check.pass = false;
  rehash(legacy);

  assert.equal(LongitudinalSyntheticOutcomeProofV1ArtifactSchema.safeParse(legacy).success, false);
  assert.equal(LongitudinalSyntheticOutcomeProofArtifactSchema.safeParse(legacy).success, false);
});

test("V1 and V2 bodies cannot be relabeled across schema versions", { skip: venvSkip }, () => {
  const v2AsV1 = emitLongitudinal("clean_historical_pathway");
  v2AsV1.schema_version = LONGITUDINAL_SYNTHETIC_OUTCOME_PROOF_SCHEMA_VERSION_V1;
  rehash(v2AsV1);
  assert.equal(LongitudinalSyntheticOutcomeProofArtifactSchema.safeParse(v2AsV1).success, false);

  const v1AsV2 = asLegacyV1(emitLongitudinal("clean_historical_pathway"));
  v1AsV2.schema_version = LONGITUDINAL_SYNTHETIC_OUTCOME_PROOF_SCHEMA_VERSION_V2;
  rehash(v1AsV2);
  assert.equal(LongitudinalSyntheticOutcomeProofArtifactSchema.safeParse(v1AsV2).success, false);
});

test("legacy V1 cannot be rehashed into a sampler claim", { skip: venvSkip }, () => {
  const forged = asLegacyV1(emitLongitudinal("clean_historical_pathway"));
  forged.model_specification.sampler_kind = "pymc_nuts";
  forged.model_specification.chains = 4;
  rehash(forged);

  assert.equal(LongitudinalSyntheticOutcomeProofV1ArtifactSchema.safeParse(forged).success, false);
  assert.equal(LongitudinalSyntheticOutcomeProofArtifactSchema.safeParse(forged).success, false);
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

  const diagnosticTokenAsMetadata = emitLongitudinal("clean_historical_pathway");
  diagnosticTokenAsMetadata.hypothesis_binding.hypothesis_statement =
    "person_level_data_present";
  coordinatedRehash(diagnosticTokenAsMetadata);
  assert.equal(
    LongitudinalSyntheticOutcomeProofArtifactSchema.safeParse(
      diagnosticTokenAsMetadata
    ).success,
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

test("rehashed route, hypothesis, metric, VBD, and source commitment drift rejects", { skip: venvSkip }, () => {
  const mutations = [
    (artifact) => {
      artifact.design_route.claim_cap = "internal_smoke_authorized";
      artifact.evidence_design_claim_cap.claim_cap = "internal_smoke_authorized";
    },
    (artifact) => {
      artifact.primary_metric_binding.metric_id = "different_metric";
    },
    (artifact) => {
      artifact.primary_metric_binding.minimum_worthwhile_change += 0.01;
    },
    (artifact) => {
      artifact.primary_metric_binding.supporting_metric_ids = ["different_supporting_metric"];
    },
    (artifact) => {
      artifact.vbd_exposure_evidence.breadth_exposure_role = "CONTEXT";
      artifact.vbd_exposure_evidence.movement_checks.breadth.role = "CONTEXT";
    },
    (artifact) => {
      artifact.hypothesis_binding.expected_vbd_signature.breadth = "CONTEXT";
      artifact.vbd_exposure_evidence.breadth_exposure_role = "CONTEXT";
      artifact.vbd_exposure_evidence.movement_checks.breadth.role = "CONTEXT";
      artifact.vbd_exposure_evidence.movement_checks.breadth.positive_movement_required = false;
    },
    (artifact) => {
      artifact.vbd_exposure_evidence.lag_windows += 1;
    },
    (artifact) => {
      artifact.business_control_evidence.source_hashes[0] = "e".repeat(64);
    },
    (artifact) => {
      artifact.synthetic_generator.generator_id = "untrusted.generator";
    },
    (artifact) => {
      artifact.ai_fluency_snapshot_evidence[0].source_ref =
        "customer-source://ai-fluency";
    },
    (artifact) => {
      artifact.business_control_evidence.control_source_refs[0] =
        "customer-source://seasonality";
    }
  ];
  for (const mutate of mutations) {
    const forged = emitLongitudinal("clean_historical_pathway");
    mutate(forged);
    rehash(forged);
    assert.equal(
      LongitudinalSyntheticOutcomeProofArtifactSchema.safeParse(forged).success,
      false
    );
  }
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
