import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  LongitudinalStateSpaceConcordanceArtifactSchema,
  VBD_TRAJECTORY_PROOF_SCHEMA_VERSION,
  VbdTrajectoryProofArtifactSchema,
  sha256Json,
  vbdTrajectoryProofPayloadHash,
  vbdTrajectoryProofSelfHash
} from "../dist/index.js";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "..", "..", "..");
const venvPython = path.join(repoRoot, "inference", ".venv", "bin", "python");
const pythonSrc = path.join(repoRoot, "inference", "src");
const venvSkip = existsSync(venvPython)
  ? false
  : "inference/.venv missing; VBD trajectory bridge test skipped";
let cachedArtifact;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function emitSmokeArtifact() {
  if (cachedArtifact) return clone(cachedArtifact);
  const script = [
    "import json",
    "from fluencytracr_inference.vbd_trajectory_artifact import run_vbd_trajectory_smoke_artifact",
    "artifact = run_vbd_trajectory_smoke_artifact(",
    "    generated_at='2026-07-15T00:00:00+00:00',",
    ")",
    "print(json.dumps(artifact, sort_keys=True, separators=(',', ':')))"
  ].join("\n");
  const result = spawnSync(venvPython, ["-c", script], {
    cwd: repoRoot,
    env: { ...process.env, PYTHONPATH: pythonSrc },
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    timeout: 180_000
  });
  assert.equal(result.status, 0, `Python VBD trajectory smoke failed:\n${result.stderr}`);
  cachedArtifact = JSON.parse(result.stdout);
  return clone(cachedArtifact);
}

function bridgeValidArtifact() {
  const artifact = emitSmokeArtifact();
  assert.equal(
    VbdTrajectoryProofArtifactSchema.safeParse(artifact).success,
    true,
    "mutation requires a bridge-valid source artifact"
  );
  return artifact;
}

function refreshFitHash(fit) {
  const { fit_summary_hash: _old, ...body } = fit;
  fit.fit_summary_hash = sha256Json(body);
}

function coordinatedRehash(artifact) {
  const modelRoot = sha256Json(artifact.input_manifest.model_manifest);
  artifact.input_manifest.model_manifest_root = modelRoot;
  for (const record of artifact.lane_records) {
    record.source_bindings.model_manifest_root = modelRoot;
    refreshFitHash(record.deterministic_fit);
  }
  const bindings = artifact.hash_bindings;
  bindings.input_manifest_hash = sha256Json(artifact.input_manifest);
  bindings.model_manifest_root = modelRoot;
  bindings.ordered_panel_manifest_root =
    artifact.input_manifest.ordered_panel_manifest_root;
  bindings.cohort_partition_root = artifact.input_manifest.cohort_partition_root;
  bindings.study_plan_root = artifact.input_manifest.study_plan_root;
  bindings.seed_manifest_root = artifact.input_manifest.seed_manifest_root;
  bindings.lane_records_hash = sha256Json(artifact.lane_records);
  bindings.lane_observation_roots_hash = sha256Json(
    artifact.lane_records.map((record) => ({
      lane: record.lane,
      root: record.source_bindings.lane_observation_root
    }))
  );
  bindings.prepared_input_hashes_hash = sha256Json(
    artifact.lane_records.map((record) => record.prepared_input_hash)
  );
  bindings.fit_summary_hashes_hash = sha256Json(
    artifact.lane_records.map((record) => record.deterministic_fit.fit_summary_hash)
  );
  bindings.diagnostics_hashes_hash = sha256Json(
    artifact.lane_records.map((record) =>
      sha256Json(record.deterministic_fit.integration_diagnostics)
    )
  );
  bindings.artifact_payload_hash = vbdTrajectoryProofPayloadHash(artifact);
  bindings.artifact_self_hash = vbdTrajectoryProofSelfHash(artifact);
  return artifact;
}

function fullyCoordinatedRehash(artifact) {
  for (const record of artifact.lane_records) {
    const source = record.source_bindings;
    source.context_binding_hash = sha256Json({
      ordered_panel_manifest_root: source.ordered_panel_manifest_root,
      lane_observation_root: source.lane_observation_root,
      joint_uncertainty_roots_hash: source.joint_uncertainty_roots_hash,
      cohort_partition_root: source.cohort_partition_root,
      study_plan_root: source.study_plan_root,
      seed_manifest_root: source.seed_manifest_root,
      transform_root: source.transform_root,
      cross_lane_covariance_bound_not_used_as_zero: true,
      depth_context_excluded: true
    });
    record.prepared_input_hash = sha256Json({
      model_input_hash: record.model_input_hash,
      context_binding_hash: source.context_binding_hash
    });
    record.deterministic_fit.prepared_input_hash = record.prepared_input_hash;
  }
  return coordinatedRehash(artifact);
}

test("Python VBD trajectory smoke artifact crosses as permanent HOLD", { skip: venvSkip }, () => {
  const artifact = emitSmokeArtifact();
  const parsed = VbdTrajectoryProofArtifactSchema.parse(artifact);

  assert.equal(parsed.schema_version, VBD_TRAJECTORY_PROOF_SCHEMA_VERSION);
  assert.deepEqual(
    parsed.lane_records.map((record) => record.lane),
    ["frequency", "engagement", "breadth"]
  );
  assert.equal(parsed.evidence_status.state, "HOLD");
  assert.deepEqual(parsed.evidence_status.failing_checks, [
    "smoke_mode_nonacceptance",
    "incomplete_evidence"
  ]);
  assert.equal(parsed.evidence_status.reference_engine_execution_state, "NOT_RUN");
  assert.equal(parsed.evidence_status.exact_full_evidence_complete, false);
  assert.equal(parsed.governance_state.independent_acceptance_complete, false);
  assert.equal(parsed.governance_state.task_5_6_complete, false);
  assert.equal(parsed.governance_state.promotion_complete, false);
});

test("Python and TypeScript VBD hashes have byte parity", { skip: venvSkip }, () => {
  const artifact = emitSmokeArtifact();

  assert.equal(
    artifact.hash_bindings.artifact_payload_hash,
    vbdTrajectoryProofPayloadHash(artifact)
  );
  assert.equal(
    artifact.hash_bindings.artifact_self_hash,
    vbdTrajectoryProofSelfHash(artifact)
  );
});

test("VBD artifact cannot be relabeled as longitudinal concordance", { skip: venvSkip }, () => {
  assert.equal(
    LongitudinalStateSpaceConcordanceArtifactSchema.safeParse(emitSmokeArtifact()).success,
    false
  );
});

test("stale artifact and nested fit hashes reject", { skip: venvSkip }, () => {
  const staleSelf = emitSmokeArtifact();
  staleSelf.hash_bindings.artifact_self_hash = "0".repeat(64);
  assert.equal(VbdTrajectoryProofArtifactSchema.safeParse(staleSelf).success, false);

  const staleFit = emitSmokeArtifact();
  staleFit.lane_records[0].deterministic_fit.movement_summary.posterior_mean += 0.1;
  staleFit.hash_bindings.artifact_self_hash = vbdTrajectoryProofSelfHash(staleFit);
  assert.equal(VbdTrajectoryProofArtifactSchema.safeParse(staleFit).success, false);
});

test("generated_at uses the same strict RFC3339 grammar as Python", { skip: venvSkip }, () => {
  for (const timestamp of [
    "2026-07-15 00:00:00+00:00",
    "2026-07-15T00:00+00:00",
    "2026-07-15T00:00:00",
    "2026-07-15T00:00:00+99:99",
    "2026-02-30T00:00:00+00:00",
    "2026-07-15T24:00:00+00:00"
  ]) {
    const artifact = bridgeValidArtifact();
    artifact.generated_at = timestamp;
    coordinatedRehash(artifact);
    assert.equal(VbdTrajectoryProofArtifactSchema.safeParse(artifact).success, false);
  }
});

test("unknown fields reject at every artifact layer", { skip: venvSkip }, () => {
  const mutations = [
    (artifact) => { artifact.extension = {}; },
    (artifact) => { artifact.input_manifest.extension = {}; },
    (artifact) => { artifact.input_manifest.depth_context.extension = {}; },
    (artifact) => { artifact.lane_records[0].extension = {}; },
    (artifact) => { artifact.lane_records[0].source_bindings.extension = {}; },
    (artifact) => { artifact.lane_records[0].deterministic_fit.extension = {}; },
    (artifact) => {
      artifact.lane_records[0].deterministic_fit.integration_diagnostics.extension = {};
    },
    (artifact) => { artifact.evidence_status.extension = {}; },
    (artifact) => { artifact.governance_state.extension = {}; },
    (artifact) => { artifact.synthetic_data_boundary.extension = {}; },
    (artifact) => { artifact.blocked_outputs.extension = false; },
    (artifact) => { artifact.hash_bindings.extension = "0".repeat(64); }
  ];
  for (const mutate of mutations) {
    const artifact = bridgeValidArtifact();
    mutate(artifact);
    coordinatedRehash(artifact);
    assert.equal(VbdTrajectoryProofArtifactSchema.safeParse(artifact).success, false);
  }
});

test("composite and duplicated-Breadth inputs reject after coordinated rehash", { skip: venvSkip }, () => {
  const mutations = [
    (artifact) => { artifact.velocity_index = 50; },
    (artifact) => { artifact.input_manifest.overall_vbd_score = 50; },
    (artifact) => { artifact.input_manifest.integration_score = 50; },
    (artifact) => { artifact.input_manifest.composite_input_present = true; },
    (artifact) => {
      artifact.input_manifest.lane_bindings[0] = clone(
        artifact.input_manifest.lane_bindings[2]
      );
    },
    (artifact) => { artifact.input_manifest.canonical_velocity_estimated = true; }
  ];
  for (const mutate of mutations) {
    const artifact = bridgeValidArtifact();
    mutate(artifact);
    coordinatedRehash(artifact);
    assert.equal(VbdTrajectoryProofArtifactSchema.safeParse(artifact).success, false);
  }
});

test("numeric or promoted Depth rejects after coordinated rehash", { skip: venvSkip }, () => {
  const mutations = [
    (artifact) => { artifact.input_manifest.depth_context.depth_value = 50; },
    (artifact) => { artifact.input_manifest.depth_context.depth_band = "high"; },
    (artifact) => { artifact.input_manifest.depth_context.used_in_likelihood = true; },
    (artifact) => { artifact.input_manifest.depth_context.used_in_estimand = true; },
    (artifact) => { artifact.input_manifest.depth_context.used_in_eligibility = true; },
    (artifact) => { artifact.input_manifest.depth_context.context_ref = "depth-context:50"; },
    (artifact) => { artifact.input_manifest.model_manifest.depth_used_in_likelihood = true; }
  ];
  for (const mutate of mutations) {
    const artifact = bridgeValidArtifact();
    mutate(artifact);
    coordinatedRehash(artifact);
    assert.equal(VbdTrajectoryProofArtifactSchema.safeParse(artifact).success, false);
  }
});

test("engine, prior, quadrature, and diagnostic claims are immutable", { skip: venvSkip }, () => {
  const mutations = [
    (artifact) => {
      artifact.lane_records[0].deterministic_fit.engine_kind =
        "pymc_nuts_state_space_reference";
    },
    (artifact) => {
      artifact.input_manifest.model_manifest.priors.alpha = "Normal(0,10)";
    },
    (artifact) => {
      artifact.input_manifest.model_manifest.deterministic_engine.outer_point_count = 4096;
    },
    (artifact) => {
      artifact.input_manifest.model_manifest.deterministic_engine.conditional_quadrature_point_count = 8;
    },
    (artifact) => {
      artifact.input_manifest.model_manifest.diagnostic_gates.r_hat_max = 1.1;
    },
    (artifact) => {
      artifact.lane_records[0].deterministic_fit.integration_diagnostics.random_numbers_used = true;
    }
  ];
  for (const mutate of mutations) {
    const artifact = bridgeValidArtifact();
    mutate(artifact);
    coordinatedRehash(artifact);
    assert.equal(VbdTrajectoryProofArtifactSchema.safeParse(artifact).success, false);
  }
});

test("missing, duplicated, reordered, or spliced lanes reject", { skip: venvSkip }, () => {
  const mutations = [
    (artifact) => { artifact.lane_records.pop(); },
    (artifact) => { artifact.lane_records[2] = clone(artifact.lane_records[1]); },
    (artifact) => { artifact.lane_records.reverse(); },
    (artifact) => {
      artifact.lane_records[0].prepared_input_hash =
        artifact.lane_records[1].prepared_input_hash;
      artifact.lane_records[0].deterministic_fit.prepared_input_hash =
        artifact.lane_records[1].prepared_input_hash;
    },
    (artifact) => {
      artifact.lane_records[0].source_bindings.lane_observation_root =
        artifact.lane_records[1].source_bindings.lane_observation_root;
    }
  ];
  for (const mutate of mutations) {
    const artifact = bridgeValidArtifact();
    mutate(artifact);
    coordinatedRehash(artifact);
    assert.equal(VbdTrajectoryProofArtifactSchema.safeParse(artifact).success, false);
  }
});

test("changed panel and source roots reject after coordinated envelope rehash", { skip: venvSkip }, () => {
  const mutations = [
    (artifact) => {
      artifact.input_manifest.ordered_panel_manifest_root = "f".repeat(64);
      for (const record of artifact.lane_records) {
        record.source_bindings.ordered_panel_manifest_root = "f".repeat(64);
      }
    },
    (artifact) => {
      artifact.lane_records[0].source_bindings.lane_observation_root = "e".repeat(64);
    },
    (artifact) => {
      artifact.lane_records[0].source_bindings.joint_uncertainty_roots_hash =
        "d".repeat(64);
    },
    (artifact) => {
      const first = artifact.lane_records[0].source_bindings.transform_root;
      artifact.lane_records[0].source_bindings.transform_root =
        artifact.lane_records[1].source_bindings.transform_root;
      artifact.lane_records[1].source_bindings.transform_root = first;
    },
    (artifact) => {
      artifact.lane_records[0].source_bindings.context_binding_hash = "c".repeat(64);
    },
    (artifact) => {
      artifact.lane_records[0].prepared_input_hash = "b".repeat(64);
      artifact.lane_records[0].deterministic_fit.prepared_input_hash = "b".repeat(64);
    }
  ];
  for (const mutate of mutations) {
    const artifact = bridgeValidArtifact();
    mutate(artifact);
    coordinatedRehash(artifact);
    assert.equal(VbdTrajectoryProofArtifactSchema.safeParse(artifact).success, false);
  }
});

test("one lane cannot fork the shared joint uncertainty root after full rehash", { skip: venvSkip }, () => {
  const artifact = bridgeValidArtifact();
  artifact.lane_records[0].source_bindings.joint_uncertainty_roots_hash =
    "a".repeat(64);
  fullyCoordinatedRehash(artifact);
  assert.equal(VbdTrajectoryProofArtifactSchema.safeParse(artifact).success, false);
});

test("incomplete smoke evidence cannot be rehashed into completion", { skip: venvSkip }, () => {
  const mutations = [
    (artifact) => { artifact.evidence_status.state = "PASS"; },
    (artifact) => { artifact.evidence_status.failing_checks = []; },
    (artifact) => { artifact.evidence_status.reference_engine_execution_state = "PASS"; },
    (artifact) => { artifact.evidence_status.concordance_bundle_count = 30; },
    (artifact) => { artifact.evidence_status.canary_receipt_count = 4; },
    (artifact) => { artifact.evidence_status.non_nuts_original_case_count = 2000; },
    (artifact) => { artifact.evidence_status.non_nuts_recomputation_case_count = 2000; },
    (artifact) => { artifact.evidence_status.exact_full_evidence_complete = true; },
    (artifact) => { artifact.governance_state.state = "valid_internal_validation_non_authorizing"; }
  ];
  for (const mutate of mutations) {
    const artifact = bridgeValidArtifact();
    mutate(artifact);
    coordinatedRehash(artifact);
    assert.equal(VbdTrajectoryProofArtifactSchema.safeParse(artifact).success, false);
  }
});

test("self-completion and execution authorization reject", { skip: venvSkip }, () => {
  const fields = [
    "independent_acceptance_complete",
    "task_5_6_complete",
    "promotion_complete",
    "acceptance_execution_authorized",
    "downstream_outcome_integration_authorized"
  ];
  for (const field of fields) {
    const artifact = bridgeValidArtifact();
    artifact.governance_state[field] = true;
    coordinatedRehash(artifact);
    assert.equal(VbdTrajectoryProofArtifactSchema.safeParse(artifact).success, false);
  }
  const reviewRoot = bridgeValidArtifact();
  reviewRoot.review_root = "a".repeat(64);
  coordinatedRehash(reviewRoot);
  assert.equal(VbdTrajectoryProofArtifactSchema.safeParse(reviewRoot).success, false);
});

test("unsafe output, claim, and real-data flags reject", { skip: venvSkip }, () => {
  const topLevelFlags = [
    "customer_output_authorized",
    "probability_output_authorized",
    "confidence_output_authorized",
    "roi_output_authorized",
    "finance_output_authorized",
    "causality_output_authorized",
    "productivity_output_authorized",
    "ai_impact_claim_authorized"
  ];
  for (const field of topLevelFlags) {
    const artifact = bridgeValidArtifact();
    artifact[field] = true;
    coordinatedRehash(artifact);
    assert.equal(VbdTrajectoryProofArtifactSchema.safeParse(artifact).success, false);
  }
  for (const field of Object.keys(bridgeValidArtifact().blocked_outputs)) {
    const artifact = bridgeValidArtifact();
    artifact.blocked_outputs[field] = true;
    coordinatedRehash(artifact);
    assert.equal(VbdTrajectoryProofArtifactSchema.safeParse(artifact).success, false);
  }
  for (const field of [
    "real_data_present",
    "customer_data_present",
    "production_data_present",
    "live_data_source_present",
    "respondent_rows_present",
    "person_level_fields_present"
  ]) {
    const artifact = bridgeValidArtifact();
    artifact.synthetic_data_boundary[field] = true;
    coordinatedRehash(artifact);
    assert.equal(VbdTrajectoryProofArtifactSchema.safeParse(artifact).success, false);
  }
});

test("raw draws, paths, supports, arrays, and replicates are structurally impossible", { skip: venvSkip }, () => {
  const fields = [
    "posterior_draws",
    "latent_paths",
    "posterior_support_values",
    "posterior_support_weights",
    "input_arrays",
    "posterior_predictive_replicates",
    "respondent_rows"
  ];
  for (const field of fields) {
    const artifact = bridgeValidArtifact();
    artifact.lane_records[0].deterministic_fit[field] = [];
    coordinatedRehash(artifact);
    assert.equal(VbdTrajectoryProofArtifactSchema.safeParse(artifact).success, false);
  }
});

test("movement and integration diagnostics remain internally coherent", { skip: venvSkip }, () => {
  const mutations = [
    (artifact) => {
      artifact.lane_records[0].deterministic_fit.movement_summary.credible_interval_80 = {
        lower: 2,
        upper: 1
      };
    },
    (artifact) => {
      artifact.lane_records[0].deterministic_fit.integration_diagnostics.finite_point_count = 4095;
    },
    (artifact) => {
      artifact.lane_records[0].deterministic_fit.integration_diagnostics.effective_sample_size = 9000;
    },
    (artifact) => {
      artifact.lane_records[0].deterministic_fit.integration_diagnostics
        .maximum_conditional_movement_variance = 0.0001;
    },
    (artifact) => {
      artifact.lane_records[0].deterministic_fit.integration_diagnostics
        .conditional_movement_quadrature.movement_support_count = 16;
    }
  ];
  for (const mutate of mutations) {
    const artifact = bridgeValidArtifact();
    mutate(artifact);
    coordinatedRehash(artifact);
    assert.equal(VbdTrajectoryProofArtifactSchema.safeParse(artifact).success, false);
  }
});

test("nonfinite numerical evidence rejects even after coordinated rehash", { skip: venvSkip }, () => {
  for (const nonfinite of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    const artifact = bridgeValidArtifact();
    artifact.lane_records[0].deterministic_fit.movement_summary.posterior_mean = nonfinite;
    coordinatedRehash(artifact);
    assert.equal(VbdTrajectoryProofArtifactSchema.safeParse(artifact).success, false);
  }
});
