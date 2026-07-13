import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  LONGITUDINAL_REPLICATED_VALIDATION_SCHEMA_VERSION,
  LongitudinalReplicatedValidationArtifactSchema,
  longitudinalReplicatedValidationPayloadHash,
  longitudinalReplicatedValidationPayloadHashBody,
  longitudinalReplicatedValidationSelfHash,
  longitudinalReplicatedValidationSelfHashBody,
  sha256Json
} from "../dist/index.js";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "..", "..", "..");
const venvPython = path.join(repoRoot, "inference", ".venv", "bin", "python");
const pythonSrc = path.join(repoRoot, "inference", "src");
const venvSkip = existsSync(venvPython)
  ? false
  : "inference/.venv missing; replicated-validation bridge smoke skipped";

const EFFECTS = [0, 0.2, 0.5];
const GROUPS = [6, 12];
const REPLICATIONS = 200;
const BASE_SEED = 202607130;
const NULL_Z = 1.959963984540054;
const TRUE_LAGS = [1, 2, 3];
const CANDIDATE_LAGS = [0, 1, 2, 3, 4];
const FLOOR_KS = [4, 8, 12, 16];
const NEGATIVE_IDS = [
  "uncontrolled_common_shock",
  "approved_control_shock",
  "unrelated_outcome_shock",
  "temporary_movement",
  "weak_history",
  "missing_windows",
  "unsafe_data",
  "unsupported_route",
  "target_contamination"
];
const ACCEPTED_COMMIT = "6c0b0faa7511dc0cdc7119c2856bdbe0ad06ad5c";
const ACCEPTANCE_PATH =
  "inference/evidence/longitudinal_state_space_nuts_concordance_acceptance_2026_07.json";
const ACCEPTANCE_HASH =
  "1c71c5e7befa9e8a1995de24f3660e2b48921ea37b8318d7e7ddcfd5051bbbf6";
const CONCORDANCE_HASH =
  "0497ec12e432da0f0e270093df616c3b2a822b1fbc3c9c40070f963c53fd7b08";
const CONCORDANCE_PATH =
  "inference/evidence/longitudinal_state_space_nuts_concordance_full_2026_07.json";
const COMPACT_SUMMARY_PATH =
  "inference/evidence/longitudinal_state_space_nuts_concordance_2026_07.json";
const COMPACT_SUMMARY_HASH =
  "ce7d28408546bb0f91a19f4c79a7074190ec25e8b969afe403d9b95728dbb2b8";
const LOCK_HASH =
  "2a7ef1c0266a89ba1c4bbb9d2b40ecfa804325e2f5705bcb3b7d976ca7e92801";
const NODE_LOCK_HASH =
  "5f45f07812c8cae66e719c6a47af08cffd524b3d0ac7c6b2d9cef0aecdac407e";
const IMPLEMENTATION_PATHS = [
  "inference/src/fluencytracr_inference/__init__.py",
  "inference/src/fluencytracr_inference/design_router.py",
  "inference/src/fluencytracr_inference/hashing.py",
  "inference/src/fluencytracr_inference/longitudinal_synthetic.py",
  "inference/src/fluencytracr_inference/longitudinal_replicated_validation.py",
  "inference/src/fluencytracr_inference/longitudinal_replicated_validation_controls.py",
  "inference/src/fluencytracr_inference/longitudinal_replicated_validation_artifact.py",
  "inference/src/fluencytracr_inference/longitudinal_replicated_validation_cli.py",
  "inference/src/fluencytracr_inference/longitudinal_state_space.py",
  "inference/src/fluencytracr_inference/longitudinal_types.py",
  "inference/src/fluencytracr_inference/longitudinal_validation_synthetic.py",
  "packages/confidence-engine/src/longitudinalReplicatedValidation.ts",
  "packages/confidence-engine/src/internal/hashing.ts",
  "packages/confidence-engine/src/index.ts",
  "packages/confidence-engine/package.json",
  "packages/confidence-engine/tsconfig.json",
  "package-lock.json",
  "openspec/changes/add-longitudinal-replicated-validation-runner/design.md",
  "openspec/changes/add-longitudinal-replicated-validation-runner/specs/bayesian-ai-value-realization-and-human-transformation-model-family/spec.md",
  ACCEPTANCE_PATH,
  CONCORDANCE_PATH,
  COMPACT_SUMMARY_PATH,
  "inference/requirements.lock"
];
const STRUCTURAL_REJECTIONS = {
  weak_history: [
    "StateSpaceInputError",
    "state-space validation requires sufficient history"
  ],
  missing_windows: [
    "StateSpaceInputError",
    "required windows must be complete and observed"
  ],
  unsafe_data: [
    "ValueError",
    "longitudinal proof accepts synthetic aggregate inputs only; rejected dataset flags: real_data_present"
  ],
  unsupported_route: [
    "StateSpaceInputError",
    "evidence design does not route to longitudinal validation"
  ],
  target_contamination: [
    "StateSpaceInputError",
    "target contamination is prohibited"
  ]
};

let cachedFullArtifact;
let cachedSmokeArtifact;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function hash(label) {
  return sha256Json({ label });
}

function effectToken(effect) {
  return effect === 0 ? "0p0" : effect === 0.2 ? "0p2" : "0p5";
}

function slot(effect, groups, replication) {
  const seed =
    BASE_SEED +
    EFFECTS.indexOf(effect) * 100_000 +
    GROUPS.indexOf(groups) * 1_000 +
    replication;
  const cellId = `effect_${effectToken(effect)}__groups_${groups}`;
  return {
    slot_id: `${cellId}__rep_${String(replication).padStart(3, "0")}__seed_${seed}`,
    cell_id: cellId,
    effect_size_sd: effect,
    panel_group_count: groups,
    replication_index: replication,
    seed,
    aggregate_measurement_cell_k: 16
  };
}

const SLOTS = EFFECTS.flatMap((effect) =>
  GROUPS.flatMap((groups) =>
    Array.from({ length: REPLICATIONS }, (_, replication) =>
      slot(effect, groups, replication)
    )
  )
);
const SLOT_IDS = SLOTS.map((value) => value.slot_id);

function chunkPlan(index) {
  const start = index * 10;
  const end = start + 10;
  const body = {
    chunk_index: index,
    chunk_id: `calibration_chunk_${String(index).padStart(2, "0")}`,
    replication_index_start_inclusive: start,
    replication_index_end_exclusive: end,
    expected_slot_count: 60,
    slot_ids: SLOTS.filter(
      (value) => value.replication_index >= start && value.replication_index < end
    ).map((value) => value.slot_id)
  };
  return { ...body, chunk_plan_hash: sha256Json(body) };
}

function calibrationPlan() {
  const chunks = Array.from({ length: 20 }, (_, index) => chunkPlan(index));
  const body = {
    plan_version: "1.0.0",
    execution_mode: "full",
    base_seed: BASE_SEED,
    effect_sizes_sd: EFFECTS,
    panel_group_counts: GROUPS,
    replication_indexes: Array.from({ length: 200 }, (_, index) => index),
    replications_per_cell: 200,
    required_slot_count: 1200,
    aggregate_measurement_cell_k: 16,
    accepted_concordance: {
      acceptance_record_path: ACCEPTANCE_PATH,
      acceptance_record_sha256: ACCEPTANCE_HASH,
      reviewed_implementation_commit: ACCEPTED_COMMIT,
      full_artifact_sha256: CONCORDANCE_HASH,
      required_overall_decision: "GO",
      required_replicated_validation_unblocked: true
    },
    compiled_gates: {
      credible_interval_level: 0.8,
      coverage_count_min_inclusive: 148,
      coverage_count_max_inclusive: 172,
      null_signal_z: NULL_Z,
      null_signal_count_max_inclusive: 10,
      aggregate_provenance_floor_k: 5,
      validation_floor_k: 10
    },
    slot_ids_hash: sha256Json(SLOT_IDS),
    chunk_count: 20,
    slots_per_chunk: 60,
    replication_indexes_per_chunk: 10,
    chunks,
    thresholds_runtime_configurable: false,
    seeds_runtime_configurable: false,
    cells_runtime_configurable: false,
    replication_count_runtime_configurable: false,
    chunk_size_runtime_configurable: false,
    internal_only: true,
    synthetic_only: true,
    customer_output_authorized: false
  };
  return { ...body, plan_hash: sha256Json(body) };
}

function floorOutcome(k) {
  if (k < 5) return "REJECTED_BEFORE_FIT_BELOW_PROVENANCE_FLOOR";
  if (k < 10) return "VALID_INTERNAL_ONLY_BELOW_VALIDATION_FLOOR";
  return "VALIDATION_FLOOR_PASSED_NONAUTHORIZING";
}

function floorPlan(k) {
  return {
    control_id: `floor_k_${k}`,
    aggregate_measurement_cell_k: k,
    panel_group_count: 6,
    effect_size_sd: 0.2,
    seed: 203010000 + k,
    aggregate_provenance_floor_k: 5,
    validation_floor_k: 10,
    expected_outcome: floorOutcome(k),
    fit_expected: k >= 5,
    customer_output_authorized: false
  };
}

function lagPlan(trueLag, replication) {
  const seed = 203020000 + TRUE_LAGS.indexOf(trueLag) * 1000 + replication;
  return {
    control_id: `lag_true_${trueLag}__rep_${String(replication).padStart(
      2,
      "0"
    )}__seed_${seed}`,
    true_lag_windows: trueLag,
    replication_index: replication,
    seed,
    candidate_lag_windows: CANDIDATE_LAGS,
    aggregate_measurement_cell_k: 16,
    panel_group_count: 6,
    effect_size_sd: 0.5
  };
}

const LAG_PLANS = TRUE_LAGS.flatMap((trueLag) =>
  Array.from({ length: 30 }, (_, replication) => lagPlan(trueLag, replication))
);

function negativeOutcome(controlId) {
  return {
    uncontrolled_common_shock: "HOLD_UNMEASURED_COMMON_SHOCK",
    approved_control_shock: "PASS_NO_INTERNAL_SIGNAL",
    unrelated_outcome_shock: "PASS_NO_INTERNAL_SIGNAL",
    temporary_movement: "HOLD_NO_LATE_WINDOW_PERSISTENCE",
    weak_history: "REJECTED_BEFORE_FIT",
    missing_windows: "REJECTED_BEFORE_FIT",
    unsafe_data: "REJECTED_BEFORE_FIT",
    unsupported_route: "REJECTED_BEFORE_FIT",
    target_contamination: "REJECTED_BEFORE_FIT"
  }[controlId];
}

function negativePlan(controlId, index) {
  return {
    control_id: controlId,
    seed: 203100000 + index,
    aggregate_measurement_cell_k: 16,
    panel_group_count: 6,
    expected_outcome: negativeOutcome(controlId),
    customer_output_authorized: false
  };
}

function controlPlan() {
  const body = {
    plan_version: "1.0.0",
    floor_controls: FLOOR_KS.map(floorPlan),
    lag_controls: {
      true_lag_windows: TRUE_LAGS,
      candidate_lag_windows: CANDIDATE_LAGS,
      replications_per_true_lag: 30,
      required_recoveries_per_true_lag: 24,
      score: "negative_integrated_log_posterior_at_mode",
      selection: "minimum_score",
      tie_epsilon: 1e-9,
      slots: LAG_PLANS
    },
    negative_controls: NEGATIVE_IDS.map(negativePlan),
    runtime_configurable: false,
    internal_only: true,
    synthetic_only: true,
    customer_output_authorized: false
  };
  return { ...body, plan_hash: sha256Json(body) };
}

function implementationManifest() {
  const pinnedHashes = {
    [ACCEPTANCE_PATH]: ACCEPTANCE_HASH,
    [CONCORDANCE_PATH]: CONCORDANCE_HASH,
    [COMPACT_SUMMARY_PATH]: COMPACT_SUMMARY_HASH,
    "inference/requirements.lock": LOCK_HASH,
    "package-lock.json": NODE_LOCK_HASH
  };
  const files = IMPLEMENTATION_PATHS.map((filePath, index) => ({
    path: filePath,
    sha256: pinnedHashes[filePath] ?? hash(`implementation:${index}:${filePath}`)
  }));
  return { files, implementation_hash: sha256Json({ files }) };
}

function executionIdentity(plan, implementation) {
  const body = {
    source_commit: ACCEPTED_COMMIT,
    source_tree_clean: true,
    implementation_hash: implementation.implementation_hash,
    requirements_lock_hash: LOCK_HASH,
    runtime: {
      python: "3.13.5",
      pymc: "6.0.1",
      arviz: "1.2.0",
      numpy: "2.4.6",
      scipy: "1.18.0",
      platform_system: "SyntheticOS",
      platform_machine: "synthetic-machine",
      python_implementation: "CPython",
      numpy_build_config_hash: hash("numpy-build"),
      blas_thread_env_hash: hash("blas-env")
    },
    plan_hash: plan.plan_hash,
    accepted_concordance_record_hash: ACCEPTANCE_HASH,
    accepted_concordance_artifact_hash: CONCORDANCE_HASH,
    accepted_concordance_reviewed_commit: ACCEPTED_COMMIT,
    accepted_concordance_commit_is_ancestor: true
  };
  return { ...body, identity_hash: sha256Json(body) };
}

function calibrationRow(slotValue, identityHash) {
  const covered = slotValue.replication_index < 160;
  const lower = covered
    ? slotValue.effect_size_sd - 0.2
    : slotValue.effect_size_sd + 0.01;
  const upper = slotValue.effect_size_sd + 0.2;
  const posterior = {
    posterior_mean: slotValue.effect_size_sd,
    posterior_sd: 0.2,
    credible_interval_80: { lower, upper }
  };
  const signal =
    Math.abs(posterior.posterior_mean / posterior.posterior_sd) > NULL_Z;
  const diagnostics = {
    status: "PASS",
    point_count: 8192,
    finite_point_count: 8192,
    effective_sample_size: 1024,
    compiled_min_effective_sample_size: 256,
    max_normalized_weight: 0.01,
    compiled_max_normalized_weight: 0.05,
    negative_log_posterior_at_mode: slotValue.seed / 1000,
    hessian_condition_number: 10,
    random_numbers_used: false,
    seed_used_for_computation: false
  };
  const preparedInputHash = hash(`prepared:${slotValue.slot_id}`);
  const modelInputHash = hash(`model:${slotValue.slot_id}`);
  const contextBindingHash = hash(`context:${slotValue.slot_id}`);
  const truthReceiptHash = hash(`truth:${slotValue.slot_id}`);
  const caseBindingHash = sha256Json({
    slot: slotValue,
    truth_receipt_hash: truthReceiptHash,
    prepared_input_hash: preparedInputHash,
    model_input_hash: modelInputHash,
    context_binding_hash: contextBindingHash,
    execution_identity_hash: identityHash
  });
  const fitSummaryHash = sha256Json({
    case_binding_hash: caseBindingHash,
    truth_effect_size_sd: slotValue.effect_size_sd,
    posterior_summary: posterior,
    interval_covers_truth: covered,
    internal_validation_signal_detected: signal,
    integration_diagnostics: diagnostics
  });
  const body = {
    ...slotValue,
    execution_mode: "full",
    status: "PASS",
    failing_checks: [],
    truth_effect_size_sd: slotValue.effect_size_sd,
    posterior_summary: posterior,
    interval_covers_truth: covered,
    internal_validation_signal_detected: signal,
    prepared_input_hash: preparedInputHash,
    model_input_hash: modelInputHash,
    context_binding_hash: contextBindingHash,
    truth_receipt_hash: truthReceiptHash,
    case_binding_hash: caseBindingHash,
    fit_summary_hash: fitSummaryHash,
    integration_diagnostics: diagnostics,
    execution_identity_hash: identityHash,
    runner_error_stage: null,
    runner_error_type: null
  };
  return { ...body, result_hash: sha256Json(body) };
}

function calibrationSummary(rows) {
  const passing = (row) => row.status === "PASS" && row.failing_checks.length === 0;
  const cellSummaries = EFFECTS.flatMap((effect) =>
    GROUPS.map((groups) => {
      const cell = rows.filter(
        (row) => row.effect_size_sd === effect && row.panel_group_count === groups
      );
      const coverageCount = cell.filter((row) => row.interval_covers_truth).length;
      const coverageRate = coverageCount / 200;
      const passingCount = cell.filter(passing).length;
      const nullSignalCount =
        effect === 0
          ? cell.filter((row) => row.internal_validation_signal_detected).length
          : null;
      return {
        cell_id: `effect_${effectToken(effect)}__groups_${groups}`,
        effect_size_sd: effect,
        panel_group_count: groups,
        expected_replication_count: 200,
        observed_replication_count: cell.length,
        passing_row_count: passingCount,
        hard_failure_count: cell.length - passingCount,
        coverage_count: coverageCount,
        coverage_rate: coverageRate,
        coverage_standard_error: Math.sqrt(
          (coverageRate * (1 - coverageRate)) / 200
        ),
        coverage_gate_passed:
          cell.length === 200 &&
          passingCount === 200 &&
          coverageCount >= 148 &&
          coverageCount <= 172,
        null_signal_count: nullSignalCount,
        null_signal_rate:
          nullSignalCount === null ? null : nullSignalCount / 200,
        null_gate_passed:
          nullSignalCount === null
            ? null
            : cell.length === 200 && passingCount === 200 && nullSignalCount <= 10
      };
    })
  );
  const hardFailureCount = rows.filter((row) => !passing(row)).length;
  const calibrationPassed = cellSummaries.every(
    (summary) => summary.coverage_gate_passed
  );
  const nullSummaries = cellSummaries.filter(
    (summary) => summary.null_signal_rate !== null
  );
  const nullPassed = nullSummaries.every(
    (summary) => summary.null_gate_passed === true
  );
  const failingChecks = [];
  if (hardFailureCount > 0) failingChecks.push("hard_slot_failures");
  if (!calibrationPassed) failingChecks.push("calibration_coverage");
  if (!nullPassed) failingChecks.push("null_false_signal");
  const passed =
    hardFailureCount === 0 && calibrationPassed && nullPassed;
  const body = {
    execution_mode: "full",
    cell_summaries: cellSummaries,
    expected_slot_count: 1200,
    observed_slot_count: 1200,
    missing_slot_ids: [],
    duplicate_slot_ids: [],
    off_plan_slot_ids: [],
    duplicate_case_binding_hashes: [],
    duplicate_fit_summary_hashes: [],
    exact_manifest_complete: true,
    hard_failure_count: hardFailureCount,
    calibration_gate_passed: calibrationPassed,
    null_gate_passed: nullPassed,
    worst_null_signal_rate: Math.max(
      ...nullSummaries.map((summary) => summary.null_signal_rate)
    ),
    study_status: passed ? "PASS" : "HOLD",
    failing_checks: failingChecks
  };
  return { ...body, study_result_hash: sha256Json(body) };
}

function fitEvidence(label, caseBindingHash, signal = false) {
  const evidence = {
    synthetic_input_hash: hash(`${label}:synthetic`),
    prepared_input_hash: hash(`${label}:prepared`),
    model_input_hash: hash(`${label}:model`),
    context_binding_hash: hash(`${label}:context`),
    case_binding_hash: caseBindingHash,
    fit_summary_hash: "",
    posterior_mean: signal ? 3 : 0,
    posterior_sd: 1,
    internal_validation_signal_detected: signal,
    negative_log_posterior_at_mode: 100
  };
  evidence.fit_summary_hash = sha256Json({
    case_binding_hash: evidence.case_binding_hash,
    synthetic_input_hash: evidence.synthetic_input_hash,
    prepared_input_hash: evidence.prepared_input_hash,
    model_input_hash: evidence.model_input_hash,
    context_binding_hash: evidence.context_binding_hash,
    posterior_mean: evidence.posterior_mean,
    posterior_sd: evidence.posterior_sd,
    internal_validation_signal_detected: evidence.internal_validation_signal_detected,
    negative_log_posterior_at_mode: evidence.negative_log_posterior_at_mode
  });
  return evidence;
}

function floorResult(k, identityHash) {
  const plan = floorPlan(k);
  let evidence;
  if (k === 4) {
    evidence = {
      aggregate_measurement_cell_k: k,
      fit_attempted: false,
      truth_receipt_hash: null,
      synthetic_input_hash: null,
      prepared_input_hash: null,
      model_input_hash: null,
      context_binding_hash: null,
      case_binding_hash: null,
      fit_summary_hash: null,
      posterior_mean: null,
      posterior_sd: null,
      internal_validation_signal_detected: null,
      negative_log_posterior_at_mode: null,
      customer_output_authorized: false
    };
  } else {
    const truthReceiptHash = hash(`floor:${k}:truth`);
    const syntheticInputHash = hash(`floor:${k}:synthetic`);
    const preparedInputHash = hash(`floor:${k}:prepared`);
    const modelInputHash = hash(`floor:${k}:model`);
    const contextBindingHash = hash(`floor:${k}:context`);
    const caseBindingHash = sha256Json({
      control_id: plan.control_id,
      aggregate_measurement_cell_k: k,
      truth_receipt_hash: truthReceiptHash,
      execution_identity_hash: identityHash,
      synthetic_input_hash: syntheticInputHash,
      prepared_input_hash: preparedInputHash,
      model_input_hash: modelInputHash,
      context_binding_hash: contextBindingHash
    });
    evidence = {
      aggregate_measurement_cell_k: k,
      fit_attempted: true,
      truth_receipt_hash: truthReceiptHash,
      synthetic_input_hash: syntheticInputHash,
      prepared_input_hash: preparedInputHash,
      model_input_hash: modelInputHash,
      context_binding_hash: contextBindingHash,
      case_binding_hash: caseBindingHash,
      fit_summary_hash: "",
      posterior_mean: 0,
      posterior_sd: 1,
      internal_validation_signal_detected: false,
      negative_log_posterior_at_mode: 100 + k,
      customer_output_authorized: false
    };
    evidence.fit_summary_hash = sha256Json({
      case_binding_hash: caseBindingHash,
      synthetic_input_hash: syntheticInputHash,
      prepared_input_hash: preparedInputHash,
      model_input_hash: modelInputHash,
      context_binding_hash: contextBindingHash,
      posterior_mean: 0,
      posterior_sd: 1,
      internal_validation_signal_detected: false,
      negative_log_posterior_at_mode: 100 + k
    });
  }
  const expected = floorOutcome(k);
  const body = {
    control_id: plan.control_id,
    control_family: "floor",
    execution_mode: "full",
    plan,
    evidence,
    expected_outcome: expected,
    observed_outcome: expected,
    control_passed: true,
    execution_identity_hash: identityHash
  };
  return { ...body, result_hash: sha256Json(body) };
}

function lagCandidate(plan, candidate, identityHash, truthHash) {
  const declaredLag = Math.max(candidate, 1);
  const score = candidate === plan.true_lag_windows ? 0 : 10 + candidate;
  const syntheticInputHash = hash(`${plan.control_id}:${candidate}:synthetic`);
  const preparedInputHash = hash(`${plan.control_id}:${candidate}:prepared`);
  const modelInputHash = hash(`${plan.control_id}:${candidate}:model`);
  const contextBindingHash = hash(`${plan.control_id}:${candidate}:context`);
  const caseBindingHash = sha256Json({
    lag_slot: plan,
    candidate_lag_windows: candidate,
    truth_receipt_hash: truthHash,
    synthetic_input_hash: syntheticInputHash,
    prepared_input_hash: preparedInputHash,
    model_input_hash: modelInputHash,
    context_binding_hash: contextBindingHash,
    execution_identity_hash: identityHash
  });
  const fitSummaryHash = sha256Json({
    case_binding_hash: caseBindingHash,
    synthetic_input_hash: syntheticInputHash,
    prepared_input_hash: preparedInputHash,
    model_input_hash: modelInputHash,
    context_binding_hash: contextBindingHash,
    truth_receipt_hash: truthHash,
    candidate_lag_windows: candidate,
    declared_input_lag_windows: declaredLag,
    negative_log_posterior_at_mode: score
  });
  const body = {
    candidate_lag_windows: candidate,
    declared_input_lag_windows: declaredLag,
    status: "PASS",
    negative_log_posterior_at_mode: score,
    synthetic_input_hash: syntheticInputHash,
    prepared_input_hash: preparedInputHash,
    model_input_hash: modelInputHash,
    context_binding_hash: contextBindingHash,
    truth_receipt_hash: truthHash,
    case_binding_hash: caseBindingHash,
    fit_summary_hash: fitSummaryHash,
    runner_error_type: null
  };
  return { ...body, candidate_result_hash: sha256Json(body) };
}

function lagResult(plan, identityHash) {
  const truthHash = hash(`${plan.control_id}:truth`);
  const candidateScores = CANDIDATE_LAGS.map((candidate) =>
    lagCandidate(plan, candidate, identityHash, truthHash)
  );
  const evidence = {
    true_lag_windows: plan.true_lag_windows,
    replication_index: plan.replication_index,
    seed: plan.seed,
    candidate_scores: candidateScores,
    all_candidates_passed: true,
    score_tie: false,
    selected_lag_windows: plan.true_lag_windows,
    true_lag_recovered: true,
    customer_output_authorized: false
  };
  const body = {
    control_id: plan.control_id,
    control_family: "lag",
    execution_mode: "full",
    plan,
    evidence,
    expected_outcome: "LAG_SELECTION_COMPLETED",
    observed_outcome: "LAG_SELECTION_COMPLETED",
    control_passed: true,
    execution_identity_hash: identityHash
  };
  return { ...body, result_hash: sha256Json(body) };
}

function negativeFit(controlId, truthHash, identityHash, refit = null) {
  const label = `${controlId}:${refit ?? "primary"}`;
  const syntheticInputHash = hash(`${label}:synthetic`);
  const preparedInputHash = hash(`${label}:prepared`);
  const modelInputHash = hash(`${label}:model`);
  const contextBindingHash = hash(`${label}:context`);
  const caseBody = {
    control_id: controlId,
    ...(refit ? { refit } : {}),
    truth_receipt_hash: truthHash,
    execution_identity_hash: identityHash,
    synthetic_input_hash: syntheticInputHash,
    prepared_input_hash: preparedInputHash,
    model_input_hash: modelInputHash,
    context_binding_hash: contextBindingHash
  };
  const caseBindingHash = sha256Json(caseBody);
  return fitEvidence(label, caseBindingHash, false);
}

function negativeResult(plan, identityHash) {
  const expected = plan.expected_outcome;
  const truthHash = hash(`${plan.control_id}:truth`);
  const structural = expected === "REJECTED_BEFORE_FIT";
  const rejection = structural ? STRUCTURAL_REJECTIONS[plan.control_id] : null;
  const primary = structural
    ? null
    : negativeFit(plan.control_id, truthHash, identityHash);
  const late =
    plan.control_id === "temporary_movement"
      ? negativeFit(
          plan.control_id,
          truthHash,
          identityHash,
          "late_window_persistence"
        )
      : null;
  const evidence = {
    seed: plan.seed,
    truth_receipt_hash: truthHash,
    fit_attempted: !structural,
    primary_fit: primary,
    late_window_fit: late,
    rejection_stage: structural ? "prepare" : null,
    rejection_type: rejection?.[0] ?? null,
    rejection_fingerprint: rejection
      ? sha256Json({ exception_type: rejection[0], message: rejection[1] })
      : null,
    truth_bound_negative_control: true,
    customer_output_authorized: false
  };
  const body = {
    control_id: plan.control_id,
    control_family: "negative",
    execution_mode: "full",
    plan,
    evidence,
    expected_outcome: expected,
    observed_outcome: expected,
    control_passed: true,
    execution_identity_hash: identityHash
  };
  return { ...body, result_hash: sha256Json(body) };
}

function controlStudy(plan, identity) {
  const floorResults = FLOOR_KS.map((k) => floorResult(k, identity.identity_hash));
  const lagResults = LAG_PLANS.map((value) =>
    lagResult(value, identity.identity_hash)
  );
  const negativeResults = plan.negative_controls.map((value) =>
    negativeResult(value, identity.identity_hash)
  );
  const body = {
    report_class: "longitudinal_replicated_validation_controls_v1",
    control_plan: plan,
    execution_mode: "full",
    floor_results: floorResults,
    lag_results: lagResults,
    negative_results: negativeResults,
    lag_recovery_summaries: TRUE_LAGS.map((trueLag) => ({
      true_lag_windows: trueLag,
      expected_replication_count: 30,
      observed_replication_count: 30,
      valid_selection_count: 30,
      exact_recovery_count: 30,
      exact_recovery_rate: 1,
      required_recovery_count: 24,
      passed: true
    })),
    exact_manifest_complete: true,
    floor_gate_passed: true,
    lag_gate_passed: true,
    negative_control_gate_passed: true,
    study_status: "PASS",
    failing_checks: [],
    execution_identity: identity,
    internal_only: true,
    synthetic_only: true,
    customer_output_authorized: false,
    probability_output_authorized: false,
    confidence_output_authorized: false
  };
  return { ...body, study_result_hash: sha256Json(body) };
}

function chunkManifests(plan, rows, identity) {
  const byId = new Map(rows.map((row) => [row.slot_id, row]));
  return plan.chunks.map((chunk) => {
    const chunkRows = chunk.slot_ids.map((slotId) => byId.get(slotId));
    const chunkBody = {
      report_class: "longitudinal_replicated_validation_chunk_v1",
      plan_version: "1.0.0",
      plan_hash: plan.plan_hash,
      chunk_index: chunk.chunk_index,
      chunk_id: chunk.chunk_id,
      execution_mode: "full",
      expected_slot_count: 60,
      slot_ids: chunk.slot_ids,
      slot_result_hashes: chunkRows.map((row) => row.result_hash),
      execution_identity: identity,
      internal_only: true,
      synthetic_only: true,
      customer_output_authorized: false
    };
    return {
      chunk_index: chunk.chunk_index,
      chunk_id: chunk.chunk_id,
      execution_mode: "full",
      slot_count: 60,
      slot_result_hashes_hash: sha256Json(
        chunkRows.map((row) => row.result_hash)
      ),
      execution_identity_hash: identity.identity_hash,
      chunk_hash: sha256Json(chunkBody)
    };
  });
}

function fullArtifact() {
  if (cachedFullArtifact) return clone(cachedFullArtifact);
  const calibration = calibrationPlan();
  const controls = controlPlan();
  const implementation = implementationManifest();
  const identity = executionIdentity(calibration, implementation);
  const rows = SLOTS.map((value) => calibrationRow(value, identity.identity_hash));
  const summary = calibrationSummary(rows);
  const chunks = chunkManifests(calibration, rows, identity);
  const control = controlStudy(controls, identity);
  const combinedBody = {
    execution_mode: "full",
    execution_identity_hash: identity.identity_hash,
    calibration_study_result_hash: summary.study_result_hash,
    control_study_result_hash: control.study_result_hash,
    chunk_manifest_hashes: chunks.map((chunk) => chunk.chunk_hash),
    calibration_result_hashes_hash: sha256Json(
      rows.map((row) => row.result_hash)
    ),
    numerical_validation_gate_passed: true,
    failing_checks: []
  };
  const combined = {
    ...combinedBody,
    combined_study_hash: sha256Json(combinedBody)
  };
  const artifact = {
    schema_version: LONGITUDINAL_REPLICATED_VALIDATION_SCHEMA_VERSION,
    artifact_class: "internal_synthetic_longitudinal_replicated_validation",
    generated_at: "2026-07-12T00:00:00+00:00",
    harness_version: "0.1.0",
    python_requires: ">=3.13,<3.14",
    model_family:
      "bayesian_ai_value_realization_and_human_transformation_model_family",
    model_slice: "longitudinal_state_space_replicated_validation",
    execution_mode: "full",
    execution_identity: identity,
    implementation_manifest: implementation,
    model_specification: {
      model_kind: "gaussian_longitudinal_zero_sum_ar1_state_space",
      equation: "y[c,t]=X[c,t]beta+u[c]+r[c,t]+epsilon[c,t]",
      state_equation: "r[c,t]=rho*r[c,t-1]+eta[c,t]",
      likelihood_family: "continuous_normal_identity",
      link_function: "identity",
      known_aggregate_se_used_exactly: true,
      additional_observation_scale: false,
      stationary_ar1_initial_state: true,
      rho_abs_bound: 0.95,
      zero_sum_panel_group_effects: true,
      pre_period_only_standardization: true,
      velocity_and_breadth_separate: true,
      baseline_fluency_context_included: true,
      depth_context_only: true,
      depth_used_in_likelihood: false,
      minimum_worthwhile_change_used_in_inference: false,
      fixed_effect_prior: { family: "Normal", mean: 0, sd: 1 },
      panel_group_scale_prior: { family: "HalfNormal", sd: 1 },
      ar1_innovation_scale_prior: { family: "HalfNormal", sd: 1 },
      rho_prior: { family: "Uniform", lower: -0.95, upper: 0.95 }
    },
    engine_specification: {
      primary_engine: "deterministic_gaussian_state_space_integration",
      posterior_draws_generated: false,
      latent_states_emitted: false,
      deterministic_cubature_point_count: 8192,
      calibration_engine: "deterministic_state_space_primary_only",
      nuts_concordance_reused_not_rerun: true,
      accepted_concordance_artifact_sha256: CONCORDANCE_HASH,
      accepted_concordance_review_record: ACCEPTANCE_PATH,
      thresholds_runtime_configurable: false
    },
    calibration_plan: calibration,
    control_plan: controls,
    chunk_manifests: chunks,
    calibration_slot_results: rows,
    calibration_summary: summary,
    control_study: control,
    combined_study: combined,
    validation_scope: {
      synthetic_only: true,
      aggregate_only: true,
      state_space_nuts_concordance_accepted: true,
      replicated_validation_numerical_gate_passed: true,
      full_evidence_generation_complete: true,
      independent_acceptance_complete: false,
      longitudinal_proof_complete: false,
      production_promotion_complete: false
    },
    governance_state: {
      state: "valid_internal_validation_non_authorizing",
      failing_checks: [],
      numerical_validation_gate_passed: true,
      independent_acceptance_required: true,
      independent_acceptance_complete: false,
      proof_completion_authorized: false,
      customer_output_authorized: false,
      probability_output_authorized: false,
      confidence_output_authorized: false,
      causal_claim_authorized: false,
      promotion_decision_ref: null
    },
    synthetic_data_boundary: {
      real_data_present: false,
      customer_data_present: false,
      production_data_present: false,
      live_data_source_present: false,
      raw_rows_emitted: false,
      posterior_draws_emitted: false,
      latent_states_emitted: false,
      direct_identifiers_emitted: false
    },
    hash_bindings: {
      calibration_plan_hash: calibration.plan_hash,
      control_plan_hash: controls.plan_hash,
      execution_identity_hash: identity.identity_hash,
      implementation_hash: implementation.implementation_hash,
      chunk_manifests_hash: sha256Json(chunks),
      calibration_slot_results_hash: sha256Json(rows),
      calibration_study_result_hash: summary.study_result_hash,
      control_study_result_hash: control.study_result_hash,
      combined_study_hash: combined.combined_study_hash,
      artifact_payload_hash: "",
      artifact_self_hash: "",
      hash_posture:
        "consistency_and_drift_detection_not_coordinated_replacement_authenticity"
    },
    blocked_outputs: {
      customer_output_authorized: false,
      probability_output_authorized: false,
      confidence_output_authorized: false,
      roi_output_authorized: false,
      finance_output_authorized: false,
      causality_output_authorized: false,
      productivity_output_authorized: false,
      creates_route: false,
      creates_ui: false,
      writes_persistence: false,
      creates_export: false,
      renders_readout: false,
      executes_connector: false
    },
    internal_only: true,
    synthetic_only: true,
    numeric_values_role: "internal_synthetic_validation_not_customer_output",
    customer_output_authorized: false,
    probability_output_authorized: false,
    confidence_output_authorized: false,
    roi_output_authorized: false,
    finance_output_authorized: false,
    causality_output_authorized: false,
    productivity_output_authorized: false,
    promotion_decision_ref: null
  };
  artifact.hash_bindings.artifact_payload_hash =
    longitudinalReplicatedValidationPayloadHash(artifact);
  artifact.hash_bindings.artifact_self_hash =
    longitudinalReplicatedValidationSelfHash(artifact);
  cachedFullArtifact = artifact;
  return clone(cachedFullArtifact);
}

function emitSmokeArtifact() {
  if (cachedSmokeArtifact) return clone(cachedSmokeArtifact);
  const script = [
    "import json",
    "from fluencytracr_inference.longitudinal_replicated_validation_artifact import run_replicated_validation_smoke_artifact",
    "artifact = run_replicated_validation_smoke_artifact(",
    "    generated_at='2026-07-12T00:00:00+00:00',",
    ")",
    "print(json.dumps(artifact, sort_keys=True, separators=(',', ':')))"
  ].join("\n");
  const result = spawnSync(venvPython, ["-c", script], {
    cwd: repoRoot,
    env: { ...process.env, PYTHONPATH: pythonSrc },
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    timeout: 300_000
  });
  assert.equal(result.status, 0, `Python replicated smoke failed:\n${result.stderr}`);
  cachedSmokeArtifact = JSON.parse(result.stdout);
  return clone(cachedSmokeArtifact);
}

function rehashCalibrationRow(row) {
  const { result_hash: _old, ...body } = row;
  row.result_hash = sha256Json(body);
}

function rehashCandidate(candidate) {
  const { candidate_result_hash: _old, ...body } = candidate;
  candidate.candidate_result_hash = sha256Json(body);
}

function rehashControlResult(result) {
  if (result.control_family === "lag") {
    for (const candidate of result.evidence.candidate_scores) {
      rehashCandidate(candidate);
    }
  }
  const { result_hash: _old, ...body } = result;
  result.result_hash = sha256Json(body);
}

function coordinatedEnvelopeRehash(artifact) {
  for (const row of artifact.calibration_slot_results) rehashCalibrationRow(row);
  for (const result of [
    ...artifact.control_study.floor_results,
    ...artifact.control_study.lag_results,
    ...artifact.control_study.negative_results
  ]) {
    rehashControlResult(result);
  }
  const { study_result_hash: _calibrationHash, ...calibrationBody } =
    artifact.calibration_summary;
  artifact.calibration_summary.study_result_hash = sha256Json(calibrationBody);
  const { study_result_hash: _controlHash, ...controlBody } = artifact.control_study;
  artifact.control_study.study_result_hash = sha256Json(controlBody);
  const rowIds = new Set(
    artifact.calibration_slot_results.map((row) => row.slot_id)
  );
  if (
    artifact.calibration_slot_results.length === 1200 &&
    artifact.calibration_plan.chunks.every((chunk) =>
      chunk.slot_ids.every((slotId) => rowIds.has(slotId))
    )
  ) {
    artifact.chunk_manifests = chunkManifests(
      artifact.calibration_plan,
      artifact.calibration_slot_results,
      artifact.execution_identity
    );
  }
  artifact.combined_study.calibration_study_result_hash =
    artifact.calibration_summary.study_result_hash;
  artifact.combined_study.control_study_result_hash =
    artifact.control_study.study_result_hash;
  artifact.combined_study.chunk_manifest_hashes = artifact.chunk_manifests.map(
    (chunk) => chunk.chunk_hash
  );
  artifact.combined_study.calibration_result_hashes_hash = sha256Json(
    artifact.calibration_slot_results.map((row) => row.result_hash)
  );
  const { combined_study_hash: _combinedHash, ...combinedBody } =
    artifact.combined_study;
  artifact.combined_study.combined_study_hash = sha256Json(combinedBody);
  artifact.hash_bindings.calibration_plan_hash = artifact.calibration_plan.plan_hash;
  artifact.hash_bindings.control_plan_hash = artifact.control_plan.plan_hash;
  artifact.hash_bindings.execution_identity_hash =
    artifact.execution_identity.identity_hash;
  artifact.hash_bindings.implementation_hash =
    artifact.implementation_manifest.implementation_hash;
  artifact.hash_bindings.chunk_manifests_hash = sha256Json(
    artifact.chunk_manifests
  );
  artifact.hash_bindings.calibration_slot_results_hash = sha256Json(
    artifact.calibration_slot_results
  );
  artifact.hash_bindings.calibration_study_result_hash =
    artifact.calibration_summary.study_result_hash;
  artifact.hash_bindings.control_study_result_hash =
    artifact.control_study.study_result_hash;
  artifact.hash_bindings.combined_study_hash =
    artifact.combined_study.combined_study_hash;
  artifact.hash_bindings.artifact_payload_hash =
    longitudinalReplicatedValidationPayloadHash(artifact);
  artifact.hash_bindings.artifact_self_hash =
    longitudinalReplicatedValidationSelfHash(artifact);
  return artifact;
}

test("exact 1,200-slot artifact validates only as internal nonauthorizing evidence", () => {
  const artifact = fullArtifact();
  const parsed = LongitudinalReplicatedValidationArtifactSchema.parse(artifact);

  assert.equal(parsed.calibration_slot_results.length, 1200);
  assert.equal(parsed.chunk_manifests.length, 20);
  assert.equal(parsed.calibration_summary.cell_summaries.length, 6);
  assert.equal(parsed.control_study.lag_results.length, 90);
  assert.equal(parsed.governance_state.state, "valid_internal_validation_non_authorizing");
  assert.equal(parsed.governance_state.numerical_validation_gate_passed, true);
  assert.equal(parsed.governance_state.independent_acceptance_complete, false);
  assert.equal(parsed.governance_state.proof_completion_authorized, false);
  assert.equal(parsed.validation_scope.longitudinal_proof_complete, false);
  assert.equal(parsed.customer_output_authorized, false);
  assert.equal(parsed.probability_output_authorized, false);
  assert.equal(parsed.confidence_output_authorized, false);
});

test("complete evidence remains complete when a numerical gate holds", () => {
  const artifact = fullArtifact();
  const rows = artifact.calibration_slot_results.filter(
    (row) => row.effect_size_sd === 0 && row.panel_group_count === 6
  );
  for (const row of rows.slice(0, 20)) {
    row.posterior_summary.credible_interval_80 = { lower: 0.01, upper: 0.2 };
    row.interval_covers_truth = false;
    row.fit_summary_hash = sha256Json({
      case_binding_hash: row.case_binding_hash,
      truth_effect_size_sd: row.truth_effect_size_sd,
      posterior_summary: row.posterior_summary,
      interval_covers_truth: false,
      internal_validation_signal_detected: row.internal_validation_signal_detected,
      integration_diagnostics: row.integration_diagnostics
    });
    rehashCalibrationRow(row);
  }
  artifact.calibration_summary = calibrationSummary(
    artifact.calibration_slot_results
  );
  artifact.combined_study.numerical_validation_gate_passed = false;
  artifact.combined_study.failing_checks = [
    "calibration:calibration_coverage"
  ];
  artifact.validation_scope.replicated_validation_numerical_gate_passed = false;
  artifact.validation_scope.full_evidence_generation_complete = true;
  artifact.governance_state.state = "HOLD";
  artifact.governance_state.failing_checks = [
    "calibration:calibration_coverage"
  ];
  artifact.governance_state.numerical_validation_gate_passed = false;

  const parsed = LongitudinalReplicatedValidationArtifactSchema.parse(
    coordinatedEnvelopeRehash(artifact)
  );
  assert.equal(parsed.governance_state.state, "HOLD");
  assert.equal(parsed.validation_scope.full_evidence_generation_complete, true);
  assert.equal(parsed.governance_state.numerical_validation_gate_passed, false);
});

test("Python smoke artifact crosses the bridge as HOLD", { skip: venvSkip }, () => {
  const artifact = emitSmokeArtifact();
  const parsed = LongitudinalReplicatedValidationArtifactSchema.parse(artifact);

  assert.equal(parsed.governance_state.state, "HOLD");
  assert.equal(parsed.execution_mode, "smoke");
  assert.equal(parsed.calibration_slot_results.length, 1);
  assert.equal(parsed.chunk_manifests.length, 0);
  assert.equal(parsed.governance_state.numerical_validation_gate_passed, false);
  assert.equal(parsed.validation_scope.full_evidence_generation_complete, false);
});

test("payload and self hash bodies match the Python boundary", () => {
  const artifact = fullArtifact();
  const payloadBody = longitudinalReplicatedValidationPayloadHashBody(artifact);
  const selfBody = longitudinalReplicatedValidationSelfHashBody(artifact);

  assert.equal("hash_bindings" in payloadBody, false);
  assert.equal(selfBody.hash_bindings.artifact_self_hash, "");
  assert.equal(
    longitudinalReplicatedValidationPayloadHash(artifact),
    artifact.hash_bindings.artifact_payload_hash
  );
  assert.equal(
    longitudinalReplicatedValidationSelfHash(artifact),
    artifact.hash_bindings.artifact_self_hash
  );
});

test("timestamp grammar matches the Python RFC3339 boundary", () => {
  for (const generatedAt of [
    "2026-07-12T00:00+00:00",
    "2026-02-30T00:00:00+00:00",
    "2026-07-12T24:00:00+00:00"
  ]) {
    const artifact = fullArtifact();
    artifact.generated_at = generatedAt;
    coordinatedEnvelopeRehash(artifact);
    assert.equal(
      LongitudinalReplicatedValidationArtifactSchema.safeParse(artifact).success,
      false
    );
  }

  const leapDay = fullArtifact();
  leapDay.generated_at = "2024-02-29T00:00:00Z";
  coordinatedEnvelopeRehash(leapDay);
  assert.equal(
    LongitudinalReplicatedValidationArtifactSchema.safeParse(leapDay).success,
    true
  );
});

test("missing and duplicate rows cannot retain a forged complete state", () => {
  const missing = fullArtifact();
  missing.calibration_slot_results.splice(159, 1);
  assert.equal(
    LongitudinalReplicatedValidationArtifactSchema.safeParse(
      coordinatedEnvelopeRehash(missing)
    ).success,
    false
  );

  const duplicate = fullArtifact();
  duplicate.calibration_slot_results[1] = clone(
    duplicate.calibration_slot_results[0]
  );
  assert.equal(
    LongitudinalReplicatedValidationArtifactSchema.safeParse(
      coordinatedEnvelopeRehash(duplicate)
    ).success,
    false
  );
});

test("off-plan rows and denominator gaming reject", () => {
  const offPlan = fullArtifact();
  const row = offPlan.calibration_slot_results[0];
  row.replication_index = 200;
  row.slot_id = `${row.cell_id}__rep_200__seed_${row.seed + 200}`;
  row.seed += 200;
  rehashCalibrationRow(row);
  assert.equal(
    LongitudinalReplicatedValidationArtifactSchema.safeParse(offPlan).success,
    false
  );

  const denominator = fullArtifact();
  denominator.calibration_slot_results.splice(159, 1);
  const cell = denominator.calibration_summary.cell_summaries[0];
  cell.expected_replication_count = 199;
  cell.observed_replication_count = 199;
  cell.coverage_rate = cell.coverage_count / 199;
  cell.coverage_standard_error = Math.sqrt(
    (cell.coverage_rate * (1 - cell.coverage_rate)) / 199
  );
  assert.equal(
    LongitudinalReplicatedValidationArtifactSchema.safeParse(
      coordinatedEnvelopeRehash(denominator)
    ).success,
    false
  );
});

test("rehashed derived coverage flags and counts reject", () => {
  const artifact = fullArtifact();
  const row = artifact.calibration_slot_results[0];
  row.interval_covers_truth = false;
  row.fit_summary_hash = sha256Json({
    case_binding_hash: row.case_binding_hash,
    truth_effect_size_sd: row.truth_effect_size_sd,
    posterior_summary: row.posterior_summary,
    interval_covers_truth: false,
    internal_validation_signal_detected: row.internal_validation_signal_detected,
    integration_diagnostics: row.integration_diagnostics
  });
  artifact.calibration_summary.cell_summaries[0].coverage_count -= 1;
  artifact.calibration_summary.cell_summaries[0].coverage_rate = 159 / 200;
  artifact.calibration_summary.cell_summaries[0].coverage_standard_error = Math.sqrt(
    ((159 / 200) * (1 - 159 / 200)) / 200
  );

  assert.equal(
    LongitudinalReplicatedValidationArtifactSchema.safeParse(
      coordinatedEnvelopeRehash(artifact)
    ).success,
    false
  );
});

test("mixed execution identity and forged completion reject", () => {
  const mixed = fullArtifact();
  const row = mixed.calibration_slot_results[0];
  row.execution_identity_hash = "c".repeat(64);
  row.case_binding_hash = sha256Json({
    slot: slot(row.effect_size_sd, row.panel_group_count, row.replication_index),
    truth_receipt_hash: row.truth_receipt_hash,
    prepared_input_hash: row.prepared_input_hash,
    model_input_hash: row.model_input_hash,
    context_binding_hash: row.context_binding_hash,
    execution_identity_hash: row.execution_identity_hash
  });
  row.fit_summary_hash = sha256Json({
    case_binding_hash: row.case_binding_hash,
    truth_effect_size_sd: row.truth_effect_size_sd,
    posterior_summary: row.posterior_summary,
    interval_covers_truth: row.interval_covers_truth,
    internal_validation_signal_detected: row.internal_validation_signal_detected,
    integration_diagnostics: row.integration_diagnostics
  });
  assert.equal(
    LongitudinalReplicatedValidationArtifactSchema.safeParse(
      coordinatedEnvelopeRehash(mixed)
    ).success,
    false
  );

  const completion = fullArtifact();
  completion.governance_state.independent_acceptance_complete = true;
  completion.governance_state.proof_completion_authorized = true;
  completion.validation_scope.longitudinal_proof_complete = true;
  coordinatedEnvelopeRehash(completion);
  assert.equal(
    LongitudinalReplicatedValidationArtifactSchema.safeParse(completion).success,
    false
  );
});

test("lag score mutation and forged lag selection reject", () => {
  const artifact = fullArtifact();
  const lag = artifact.control_study.lag_results[0];
  lag.evidence.candidate_scores[0].negative_log_posterior_at_mode = -100;
  lag.evidence.selected_lag_windows = 1;
  lag.evidence.true_lag_recovered = true;

  assert.equal(
    LongitudinalReplicatedValidationArtifactSchema.safeParse(
      coordinatedEnvelopeRehash(artifact)
    ).success,
    false
  );
});

test("aggregate k cannot be conflated with panel-group count", () => {
  const rowArtifact = fullArtifact();
  rowArtifact.calibration_slot_results[0].aggregate_measurement_cell_k = 6;
  rehashCalibrationRow(rowArtifact.calibration_slot_results[0]);
  assert.equal(
    LongitudinalReplicatedValidationArtifactSchema.safeParse(rowArtifact).success,
    false
  );

  const floorArtifact = fullArtifact();
  floorArtifact.control_study.floor_results[1].plan.aggregate_measurement_cell_k = 6;
  floorArtifact.control_study.floor_results[1].evidence.aggregate_measurement_cell_k = 6;
  assert.equal(
    LongitudinalReplicatedValidationArtifactSchema.safeParse(
      coordinatedEnvelopeRehash(floorArtifact)
    ).success,
    false
  );

  const booleanPlan = fullArtifact();
  booleanPlan.control_study.negative_results[0].plan.customer_output_authorized = 0;
  assert.equal(
    LongitudinalReplicatedValidationArtifactSchema.safeParse(
      coordinatedEnvelopeRehash(booleanPlan)
    ).success,
    false
  );
});

test("wrong structural rejection cannot pass a compiled control", () => {
  const artifact = fullArtifact();
  const control = artifact.control_study.negative_results.find(
    (result) => result.control_id === "weak_history"
  );
  control.evidence.rejection_type = "RuntimeError";
  control.evidence.rejection_fingerprint = sha256Json({
    exception_type: "RuntimeError",
    message: "unrelated preparation failure"
  });
  rehashControlResult(control);

  assert.equal(
    LongitudinalReplicatedValidationArtifactSchema.safeParse(
      coordinatedEnvelopeRehash(artifact)
    ).success,
    false
  );
});

test("durable control runner errors remain exact full evidence but force HOLD", () => {
  const artifact = fullArtifact();
  const control = artifact.control_study.floor_results[1];
  control.evidence = {
    aggregate_measurement_cell_k: 8,
    fit_attempted: true,
    truth_receipt_hash: null,
    synthetic_input_hash: null,
    prepared_input_hash: null,
    model_input_hash: null,
    context_binding_hash: null,
    case_binding_hash: null,
    fit_summary_hash: null,
    posterior_mean: null,
    posterior_sd: null,
    internal_validation_signal_detected: null,
    negative_log_posterior_at_mode: null,
    customer_output_authorized: false,
    runner_error_stage: "generate",
    runner_error_type: "RuntimeError"
  };
  control.observed_outcome = "RUNNER_ERROR";
  control.control_passed = false;
  rehashControlResult(control);
  artifact.control_study.floor_gate_passed = false;
  artifact.control_study.study_status = "HOLD";
  artifact.control_study.failing_checks = ["floor_controls"];
  artifact.combined_study.numerical_validation_gate_passed = false;
  artifact.combined_study.failing_checks = ["controls:floor_controls"];
  artifact.validation_scope.replicated_validation_numerical_gate_passed = false;
  artifact.validation_scope.full_evidence_generation_complete = true;
  artifact.governance_state.state = "HOLD";
  artifact.governance_state.failing_checks = ["controls:floor_controls"];
  artifact.governance_state.numerical_validation_gate_passed = false;

  const parsed = LongitudinalReplicatedValidationArtifactSchema.parse(
    coordinatedEnvelopeRehash(artifact)
  );
  assert.equal(parsed.control_study.exact_manifest_complete, true);
  assert.equal(parsed.validation_scope.full_evidence_generation_complete, true);
  assert.equal(parsed.governance_state.state, "HOLD");
});

test("unknown fields and every unsafe authorization side door reject", () => {
  const unknown = fullArtifact();
  unknown.control_study.lag_results[0].evidence.candidate_scores[0].raw_draws = [];
  coordinatedEnvelopeRehash(unknown);
  assert.equal(
    LongitudinalReplicatedValidationArtifactSchema.safeParse(unknown).success,
    false
  );

  const mutations = [
    (artifact) => {
      artifact.customer_output_authorized = true;
    },
    (artifact) => {
      artifact.blocked_outputs.creates_export = true;
    },
    (artifact) => {
      artifact.governance_state.confidence_output_authorized = true;
    },
    (artifact) => {
      artifact.roi_output_authorized = true;
    }
  ];
  for (const mutate of mutations) {
    const artifact = fullArtifact();
    mutate(artifact);
    coordinatedEnvelopeRehash(artifact);
    assert.equal(
      LongitudinalReplicatedValidationArtifactSchema.safeParse(artifact).success,
      false
    );
  }
});
