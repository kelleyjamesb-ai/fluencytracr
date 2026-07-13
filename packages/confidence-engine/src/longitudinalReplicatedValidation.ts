import { z } from "zod";
import { sha256Json, stableStringify } from "./internal/hashing";

export const LONGITUDINAL_REPLICATED_VALIDATION_SCHEMA_VERSION =
  "FT_AI_VALUE_LONGITUDINAL_REPLICATED_VALIDATION_2026_07_V1";
export const LONGITUDINAL_REPLICATED_VALIDATION_ARTIFACT_CLASS =
  "internal_synthetic_longitudinal_replicated_validation";
export const LONGITUDINAL_REPLICATED_VALIDATION_MODEL_SLICE =
  "longitudinal_state_space_replicated_validation";

const MODEL_FAMILY =
  "bayesian_ai_value_realization_and_human_transformation_model_family";
const MODEL_KIND = "gaussian_longitudinal_zero_sum_ar1_state_space";
const PRIMARY_ENGINE = "deterministic_gaussian_state_space_integration";
const PYTHON_REQUIRES = ">=3.13,<3.14";
const HASH_POSTURE =
  "consistency_and_drift_detection_not_coordinated_replacement_authenticity";
const NUMERIC_VALUES_ROLE =
  "internal_synthetic_validation_not_customer_output";

const PLAN_VERSION = "1.0.0";
const BASE_SEED = 202607130;
const EFFECT_SEED_OFFSET = 100_000;
const GROUP_SEED_OFFSET = 1_000;
const EFFECT_SIZES = [0, 0.2, 0.5] as const;
const PANEL_GROUP_COUNTS = [6, 12] as const;
const REPLICATIONS_PER_CELL = 200;
const REQUIRED_SLOT_COUNT = 1_200;
const AGGREGATE_MEASUREMENT_CELL_K = 16;
const CHUNK_COUNT = 20;
const REPLICATION_INDEXES_PER_CHUNK = 10;
const SLOTS_PER_CHUNK = 60;
const COVERAGE_COUNT_MIN = 148;
const COVERAGE_COUNT_MAX = 172;
const NULL_SIGNAL_Z = 1.959963984540054;
const NULL_SIGNAL_COUNT_MAX = 10;
const AGGREGATE_PROVENANCE_FLOOR_K = 5;
const VALIDATION_FLOOR_K = 10;

const ACCEPTED_CONCORDANCE_REVIEWED_COMMIT =
  "6c0b0faa7511dc0cdc7119c2856bdbe0ad06ad5c";
const ACCEPTED_CONCORDANCE_RECORD_PATH =
  "inference/evidence/longitudinal_state_space_nuts_concordance_acceptance_2026_07.json";
const ACCEPTED_CONCORDANCE_RECORD_SHA256 =
  "1c71c5e7befa9e8a1995de24f3660e2b48921ea37b8318d7e7ddcfd5051bbbf6";
const ACCEPTED_CONCORDANCE_ARTIFACT_SHA256 =
  "0497ec12e432da0f0e270093df616c3b2a822b1fbc3c9c40070f963c53fd7b08";
const ACCEPTED_CONCORDANCE_ARTIFACT_PATH =
  "inference/evidence/longitudinal_state_space_nuts_concordance_full_2026_07.json";
const ACCEPTED_CONCORDANCE_COMPACT_SUMMARY_PATH =
  "inference/evidence/longitudinal_state_space_nuts_concordance_2026_07.json";
const ACCEPTED_CONCORDANCE_COMPACT_SUMMARY_SHA256 =
  "ce7d28408546bb0f91a19f4c79a7074190ec25e8b969afe403d9b95728dbb2b8";
const REQUIREMENTS_LOCK_SHA256 =
  "2a7ef1c0266a89ba1c4bbb9d2b40ecfa804325e2f5705bcb3b7d976ca7e92801";
const NODE_LOCK_SHA256 =
  "5f45f07812c8cae66e719c6a47af08cffd524b3d0ac7c6b2d9cef0aecdac407e";

const FLOOR_K_VALUES = [4, 8, 12, 16] as const;
const FLOOR_CONTROL_BASE_SEED = 203010000;
const LAG_TRUE_WINDOWS = [1, 2, 3] as const;
const LAG_CANDIDATE_WINDOWS = [0, 1, 2, 3, 4] as const;
const LAG_REPLICATIONS_PER_TRUTH = 30;
const LAG_REQUIRED_RECOVERIES = 24;
const LAG_SCORE_TIE_EPSILON = 1e-9;
const LAG_EFFECT_SIZE_SD = 0.5;
const LAG_PANEL_GROUP_COUNT = 6;
const LAG_CONTROL_BASE_SEED = 203020000;
const NEGATIVE_CONTROL_BASE_SEED = 203100000;
const NEGATIVE_CONTROL_IDS = [
  "uncontrolled_common_shock",
  "approved_control_shock",
  "unrelated_outcome_shock",
  "temporary_movement",
  "weak_history",
  "missing_windows",
  "unsafe_data",
  "unsupported_route",
  "target_contamination"
] as const;
const STRUCTURAL_NEGATIVE_REJECTIONS: Record<
  string,
  { exceptionType: string; message: string }
> = {
  weak_history: {
    exceptionType: "StateSpaceInputError",
    message: "state-space validation requires sufficient history"
  },
  missing_windows: {
    exceptionType: "StateSpaceInputError",
    message: "required windows must be complete and observed"
  },
  unsafe_data: {
    exceptionType: "ValueError",
    message:
      "longitudinal proof accepts synthetic aggregate inputs only; rejected dataset flags: real_data_present"
  },
  unsupported_route: {
    exceptionType: "StateSpaceInputError",
    message: "evidence design does not route to longitudinal validation"
  },
  target_contamination: {
    exceptionType: "StateSpaceInputError",
    message: "target contamination is prohibited"
  }
};

function rejectionFingerprint(exceptionType: string, message: string): string {
  return sha256Json({ exception_type: exceptionType, message });
}

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
  ACCEPTED_CONCORDANCE_RECORD_PATH,
  ACCEPTED_CONCORDANCE_ARTIFACT_PATH,
  ACCEPTED_CONCORDANCE_COMPACT_SUMMARY_PATH,
  "inference/requirements.lock"
] as const;

const SHA256 = z.string().regex(/^[0-9a-f]{64}$/);
const GIT_SHA1 = z.string().regex(/^[0-9a-f]{40}$/);
const Finite = z.number().finite();
const SafeInteger = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const NonEmptyString = z.string().min(1);
const timestampPattern =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-](\d{2}):(\d{2}))$/;

function isValidRfc3339Timestamp(value: string): boolean {
  const match = timestampPattern.exec(value);
  if (match === null) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const offsetHour = match[7] === undefined ? 0 : Number(match[7]);
  const offsetMinute = match[8] === undefined ? 0 : Number(match[8]);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysByMonth = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31
  ];
  return (
    year >= 1 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysByMonth[month - 1] &&
    hour <= 23 &&
    minute <= 59 &&
    second <= 59 &&
    offsetHour <= 23 &&
    offsetMinute <= 59
  );
}

function equal(left: unknown, right: unknown): boolean {
  return stableStringify(left) === stableStringify(right);
}

function near(left: number, right: number, tolerance = 1e-12): boolean {
  return (
    Math.abs(left - right) <=
    tolerance * Math.max(1, Math.abs(left), Math.abs(right))
  );
}

function addIssue(
  ctx: z.RefinementCtx,
  path: (string | number)[],
  message: string
): void {
  ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
}

function effectToken(effect: number): string {
  if (effect === 0) return "0p0";
  if (effect === 0.2) return "0p2";
  if (effect === 0.5) return "0p5";
  return "off_plan";
}

function calibrationSeed(effect: number, groups: number, replication: number): number {
  return (
    BASE_SEED +
    EFFECT_SIZES.indexOf(effect as (typeof EFFECT_SIZES)[number]) * EFFECT_SEED_OFFSET +
    PANEL_GROUP_COUNTS.indexOf(
      groups as (typeof PANEL_GROUP_COUNTS)[number]
    ) *
      GROUP_SEED_OFFSET +
    replication
  );
}

function calibrationSlot(effect: number, groups: number, replication: number) {
  const seed = calibrationSeed(effect, groups, replication);
  const cellId = `effect_${effectToken(effect)}__groups_${groups}`;
  return {
    slot_id: `${cellId}__rep_${String(replication).padStart(3, "0")}__seed_${seed}`,
    cell_id: cellId,
    effect_size_sd: effect,
    panel_group_count: groups,
    replication_index: replication,
    seed,
    aggregate_measurement_cell_k: AGGREGATE_MEASUREMENT_CELL_K
  };
}

const REPLICATION_INDEXES = Array.from(
  { length: REPLICATIONS_PER_CELL },
  (_, index) => index
);
const COMPILED_SLOTS = EFFECT_SIZES.flatMap((effect) =>
  PANEL_GROUP_COUNTS.flatMap((groups) =>
    REPLICATION_INDEXES.map((replication) =>
      calibrationSlot(effect, groups, replication)
    )
  )
);
const COMPILED_SLOT_IDS = COMPILED_SLOTS.map((slot) => slot.slot_id);
const COMPILED_SLOT_ID_SET = new Set(COMPILED_SLOT_IDS);

function calibrationChunkPlan(chunkIndex: number) {
  const start = chunkIndex * REPLICATION_INDEXES_PER_CHUNK;
  const stop = start + REPLICATION_INDEXES_PER_CHUNK;
  const slotIds = COMPILED_SLOTS.filter(
    (slot) => slot.replication_index >= start && slot.replication_index < stop
  ).map((slot) => slot.slot_id);
  const body = {
    chunk_index: chunkIndex,
    chunk_id: `calibration_chunk_${String(chunkIndex).padStart(2, "0")}`,
    replication_index_start_inclusive: start,
    replication_index_end_exclusive: stop,
    expected_slot_count: SLOTS_PER_CHUNK,
    slot_ids: slotIds
  };
  return { ...body, chunk_plan_hash: sha256Json(body) };
}

const COMPILED_CHUNKS = Array.from({ length: CHUNK_COUNT }, (_, index) =>
  calibrationChunkPlan(index)
);

function buildCalibrationPlan() {
  const body = {
    plan_version: PLAN_VERSION,
    execution_mode: "full",
    base_seed: BASE_SEED,
    effect_sizes_sd: [...EFFECT_SIZES],
    panel_group_counts: [...PANEL_GROUP_COUNTS],
    replication_indexes: REPLICATION_INDEXES,
    replications_per_cell: REPLICATIONS_PER_CELL,
    required_slot_count: REQUIRED_SLOT_COUNT,
    aggregate_measurement_cell_k: AGGREGATE_MEASUREMENT_CELL_K,
    accepted_concordance: {
      acceptance_record_path: ACCEPTED_CONCORDANCE_RECORD_PATH,
      acceptance_record_sha256: ACCEPTED_CONCORDANCE_RECORD_SHA256,
      reviewed_implementation_commit: ACCEPTED_CONCORDANCE_REVIEWED_COMMIT,
      full_artifact_sha256: ACCEPTED_CONCORDANCE_ARTIFACT_SHA256,
      required_overall_decision: "GO",
      required_replicated_validation_unblocked: true
    },
    compiled_gates: {
      credible_interval_level: 0.8,
      coverage_count_min_inclusive: COVERAGE_COUNT_MIN,
      coverage_count_max_inclusive: COVERAGE_COUNT_MAX,
      null_signal_z: NULL_SIGNAL_Z,
      null_signal_count_max_inclusive: NULL_SIGNAL_COUNT_MAX,
      aggregate_provenance_floor_k: AGGREGATE_PROVENANCE_FLOOR_K,
      validation_floor_k: VALIDATION_FLOOR_K
    },
    slot_ids_hash: sha256Json(COMPILED_SLOT_IDS),
    chunk_count: CHUNK_COUNT,
    slots_per_chunk: SLOTS_PER_CHUNK,
    replication_indexes_per_chunk: REPLICATION_INDEXES_PER_CHUNK,
    chunks: COMPILED_CHUNKS,
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

const COMPILED_CALIBRATION_PLAN = buildCalibrationPlan();

function floorExpectedOutcome(aggregateK: number): string {
  if (aggregateK < AGGREGATE_PROVENANCE_FLOOR_K) {
    return "REJECTED_BEFORE_FIT_BELOW_PROVENANCE_FLOOR";
  }
  if (aggregateK < VALIDATION_FLOOR_K) {
    return "VALID_INTERNAL_ONLY_BELOW_VALIDATION_FLOOR";
  }
  return "VALIDATION_FLOOR_PASSED_NONAUTHORIZING";
}

function floorPlan(aggregateK: number) {
  return {
    control_id: `floor_k_${aggregateK}`,
    aggregate_measurement_cell_k: aggregateK,
    panel_group_count: 6,
    effect_size_sd: 0.2,
    seed: FLOOR_CONTROL_BASE_SEED + aggregateK,
    aggregate_provenance_floor_k: AGGREGATE_PROVENANCE_FLOOR_K,
    validation_floor_k: VALIDATION_FLOOR_K,
    expected_outcome: floorExpectedOutcome(aggregateK),
    fit_expected: aggregateK >= AGGREGATE_PROVENANCE_FLOOR_K,
    customer_output_authorized: false
  };
}

function lagSeed(trueLag: number, replication: number): number {
  return LAG_CONTROL_BASE_SEED + LAG_TRUE_WINDOWS.indexOf(
    trueLag as (typeof LAG_TRUE_WINDOWS)[number]
  ) * 1_000 + replication;
}

function lagPlan(trueLag: number, replication: number) {
  const seed = lagSeed(trueLag, replication);
  return {
    control_id: `lag_true_${trueLag}__rep_${String(replication).padStart(
      2,
      "0"
    )}__seed_${seed}`,
    true_lag_windows: trueLag,
    replication_index: replication,
    seed,
    candidate_lag_windows: [...LAG_CANDIDATE_WINDOWS],
    aggregate_measurement_cell_k: AGGREGATE_MEASUREMENT_CELL_K,
    panel_group_count: LAG_PANEL_GROUP_COUNT,
    effect_size_sd: LAG_EFFECT_SIZE_SD
  };
}

const COMPILED_LAG_PLANS = LAG_TRUE_WINDOWS.flatMap((trueLag) =>
  Array.from({ length: LAG_REPLICATIONS_PER_TRUTH }, (_, replication) =>
    lagPlan(trueLag, replication)
  )
);

function negativeExpectedOutcome(controlId: string): string {
  const outcomes: Record<string, string> = {
    uncontrolled_common_shock: "HOLD_UNMEASURED_COMMON_SHOCK",
    approved_control_shock: "PASS_NO_INTERNAL_SIGNAL",
    unrelated_outcome_shock: "PASS_NO_INTERNAL_SIGNAL",
    temporary_movement: "HOLD_NO_LATE_WINDOW_PERSISTENCE",
    weak_history: "REJECTED_BEFORE_FIT",
    missing_windows: "REJECTED_BEFORE_FIT",
    unsafe_data: "REJECTED_BEFORE_FIT",
    unsupported_route: "REJECTED_BEFORE_FIT",
    target_contamination: "REJECTED_BEFORE_FIT"
  };
  return outcomes[controlId];
}

function negativePlan(controlId: string, index: number) {
  return {
    control_id: controlId,
    seed: NEGATIVE_CONTROL_BASE_SEED + index,
    aggregate_measurement_cell_k: AGGREGATE_MEASUREMENT_CELL_K,
    panel_group_count: 6,
    expected_outcome: negativeExpectedOutcome(controlId),
    customer_output_authorized: false
  };
}

const COMPILED_FLOOR_PLANS = FLOOR_K_VALUES.map(floorPlan);
const COMPILED_NEGATIVE_PLANS = NEGATIVE_CONTROL_IDS.map(negativePlan);

function buildControlPlan() {
  const body = {
    plan_version: PLAN_VERSION,
    floor_controls: COMPILED_FLOOR_PLANS,
    lag_controls: {
      true_lag_windows: [...LAG_TRUE_WINDOWS],
      candidate_lag_windows: [...LAG_CANDIDATE_WINDOWS],
      replications_per_true_lag: LAG_REPLICATIONS_PER_TRUTH,
      required_recoveries_per_true_lag: LAG_REQUIRED_RECOVERIES,
      score: "negative_integrated_log_posterior_at_mode",
      selection: "minimum_score",
      tie_epsilon: LAG_SCORE_TIE_EPSILON,
      slots: COMPILED_LAG_PLANS
    },
    negative_controls: COMPILED_NEGATIVE_PLANS,
    runtime_configurable: false,
    internal_only: true,
    synthetic_only: true,
    customer_output_authorized: false
  };
  return { ...body, plan_hash: sha256Json(body) };
}

const COMPILED_CONTROL_PLAN = buildControlPlan();

const ChunkPlanSchema = z
  .object({
    chunk_index: SafeInteger,
    chunk_id: NonEmptyString,
    replication_index_start_inclusive: SafeInteger,
    replication_index_end_exclusive: SafeInteger,
    expected_slot_count: SafeInteger,
    slot_ids: z.array(NonEmptyString),
    chunk_plan_hash: SHA256
  })
  .strict();

const CalibrationPlanObjectSchema = z
  .object({
    plan_version: z.literal(PLAN_VERSION),
    execution_mode: z.literal("full"),
    base_seed: z.literal(BASE_SEED),
    effect_sizes_sd: z.array(Finite).length(EFFECT_SIZES.length),
    panel_group_counts: z.array(SafeInteger).length(PANEL_GROUP_COUNTS.length),
    replication_indexes: z.array(SafeInteger).length(REPLICATIONS_PER_CELL),
    replications_per_cell: z.literal(REPLICATIONS_PER_CELL),
    required_slot_count: z.literal(REQUIRED_SLOT_COUNT),
    aggregate_measurement_cell_k: z.literal(AGGREGATE_MEASUREMENT_CELL_K),
    accepted_concordance: z
      .object({
        acceptance_record_path: z.literal(ACCEPTED_CONCORDANCE_RECORD_PATH),
        acceptance_record_sha256: z.literal(ACCEPTED_CONCORDANCE_RECORD_SHA256),
        reviewed_implementation_commit: z.literal(
          ACCEPTED_CONCORDANCE_REVIEWED_COMMIT
        ),
        full_artifact_sha256: z.literal(ACCEPTED_CONCORDANCE_ARTIFACT_SHA256),
        required_overall_decision: z.literal("GO"),
        required_replicated_validation_unblocked: z.literal(true)
      })
      .strict(),
    compiled_gates: z
      .object({
        credible_interval_level: z.literal(0.8),
        coverage_count_min_inclusive: z.literal(COVERAGE_COUNT_MIN),
        coverage_count_max_inclusive: z.literal(COVERAGE_COUNT_MAX),
        null_signal_z: z.literal(NULL_SIGNAL_Z),
        null_signal_count_max_inclusive: z.literal(NULL_SIGNAL_COUNT_MAX),
        aggregate_provenance_floor_k: z.literal(AGGREGATE_PROVENANCE_FLOOR_K),
        validation_floor_k: z.literal(VALIDATION_FLOOR_K)
      })
      .strict(),
    slot_ids_hash: SHA256,
    chunk_count: z.literal(CHUNK_COUNT),
    slots_per_chunk: z.literal(SLOTS_PER_CHUNK),
    replication_indexes_per_chunk: z.literal(REPLICATION_INDEXES_PER_CHUNK),
    chunks: z.array(ChunkPlanSchema).length(CHUNK_COUNT),
    thresholds_runtime_configurable: z.literal(false),
    seeds_runtime_configurable: z.literal(false),
    cells_runtime_configurable: z.literal(false),
    replication_count_runtime_configurable: z.literal(false),
    chunk_size_runtime_configurable: z.literal(false),
    internal_only: z.literal(true),
    synthetic_only: z.literal(true),
    customer_output_authorized: z.literal(false),
    plan_hash: SHA256
  })
  .strict();

const CalibrationPlanSchema = CalibrationPlanObjectSchema.superRefine((plan, ctx) => {
  if (!equal(plan, COMPILED_CALIBRATION_PLAN)) {
    addIssue(ctx, [], "calibration plan must equal the independently compiled plan");
  }
});

const FloorPlanSchema = z
  .object({
    control_id: NonEmptyString,
    aggregate_measurement_cell_k: SafeInteger,
    panel_group_count: SafeInteger,
    effect_size_sd: Finite,
    seed: SafeInteger,
    aggregate_provenance_floor_k: z.literal(AGGREGATE_PROVENANCE_FLOOR_K),
    validation_floor_k: z.literal(VALIDATION_FLOOR_K),
    expected_outcome: NonEmptyString,
    fit_expected: z.boolean(),
    customer_output_authorized: z.literal(false)
  })
  .strict();

const LagPlanSchema = z
  .object({
    control_id: NonEmptyString,
    true_lag_windows: SafeInteger,
    replication_index: SafeInteger,
    seed: SafeInteger,
    candidate_lag_windows: z.array(SafeInteger).length(LAG_CANDIDATE_WINDOWS.length),
    aggregate_measurement_cell_k: z.literal(AGGREGATE_MEASUREMENT_CELL_K),
    panel_group_count: z.literal(LAG_PANEL_GROUP_COUNT),
    effect_size_sd: z.literal(LAG_EFFECT_SIZE_SD)
  })
  .strict();

const NegativePlanSchema = z
  .object({
    control_id: NonEmptyString,
    seed: SafeInteger,
    aggregate_measurement_cell_k: z.literal(AGGREGATE_MEASUREMENT_CELL_K),
    panel_group_count: z.literal(6),
    expected_outcome: NonEmptyString,
    customer_output_authorized: z.literal(false)
  })
  .strict();

const ControlPlanObjectSchema = z
  .object({
    plan_version: z.literal(PLAN_VERSION),
    floor_controls: z.array(FloorPlanSchema).length(FLOOR_K_VALUES.length),
    lag_controls: z
      .object({
        true_lag_windows: z.array(SafeInteger).length(LAG_TRUE_WINDOWS.length),
        candidate_lag_windows: z
          .array(SafeInteger)
          .length(LAG_CANDIDATE_WINDOWS.length),
        replications_per_true_lag: z.literal(LAG_REPLICATIONS_PER_TRUTH),
        required_recoveries_per_true_lag: z.literal(LAG_REQUIRED_RECOVERIES),
        score: z.literal("negative_integrated_log_posterior_at_mode"),
        selection: z.literal("minimum_score"),
        tie_epsilon: z.literal(LAG_SCORE_TIE_EPSILON),
        slots: z.array(LagPlanSchema).length(COMPILED_LAG_PLANS.length)
      })
      .strict(),
    negative_controls: z
      .array(NegativePlanSchema)
      .length(NEGATIVE_CONTROL_IDS.length),
    runtime_configurable: z.literal(false),
    internal_only: z.literal(true),
    synthetic_only: z.literal(true),
    customer_output_authorized: z.literal(false),
    plan_hash: SHA256
  })
  .strict();

const ControlPlanSchema = ControlPlanObjectSchema.superRefine((plan, ctx) => {
  if (!equal(plan, COMPILED_CONTROL_PLAN)) {
    addIssue(ctx, [], "control plan must equal the independently compiled plan");
  }
});

const RuntimeSchema = z
  .object({
    python: z.string().regex(/^3\.13\.\d+$/),
    pymc: z.literal("6.0.1"),
    arviz: z.literal("1.2.0"),
    numpy: z.literal("2.4.6"),
    scipy: z.literal("1.18.0"),
    platform_system: NonEmptyString,
    platform_machine: NonEmptyString,
    python_implementation: NonEmptyString,
    numpy_build_config_hash: SHA256,
    blas_thread_env_hash: SHA256
  })
  .strict();

const ExecutionIdentityObjectSchema = z
  .object({
    source_commit: GIT_SHA1,
    source_tree_clean: z.boolean(),
    implementation_hash: SHA256,
    requirements_lock_hash: z.literal(REQUIREMENTS_LOCK_SHA256),
    runtime: RuntimeSchema,
    plan_hash: SHA256,
    accepted_concordance_record_hash: z.literal(
      ACCEPTED_CONCORDANCE_RECORD_SHA256
    ),
    accepted_concordance_artifact_hash: z.literal(
      ACCEPTED_CONCORDANCE_ARTIFACT_SHA256
    ),
    accepted_concordance_reviewed_commit: z.literal(
      ACCEPTED_CONCORDANCE_REVIEWED_COMMIT
    ),
    accepted_concordance_commit_is_ancestor: z.literal(true),
    identity_hash: SHA256
  })
  .strict();

type ExecutionIdentity = z.infer<typeof ExecutionIdentityObjectSchema>;

function executionIdentityBody(identity: ExecutionIdentity) {
  const { identity_hash: _hash, ...body } = identity;
  return body;
}

const ExecutionIdentitySchema = ExecutionIdentityObjectSchema.superRefine(
  (identity, ctx) => {
    if (identity.plan_hash !== COMPILED_CALIBRATION_PLAN.plan_hash) {
      addIssue(ctx, ["plan_hash"], "execution identity plan hash is invalid");
    }
    if (identity.identity_hash !== sha256Json(executionIdentityBody(identity))) {
      addIssue(ctx, ["identity_hash"], "execution identity hash mismatch");
    }
  }
);

const ImplementationManifestObjectSchema = z
  .object({
    files: z
      .array(
        z.object({ path: NonEmptyString, sha256: SHA256 }).strict()
      )
      .length(IMPLEMENTATION_PATHS.length),
    implementation_hash: SHA256
  })
  .strict();

type ImplementationManifest = z.infer<typeof ImplementationManifestObjectSchema>;

const ImplementationManifestSchema = ImplementationManifestObjectSchema.superRefine(
  (manifest, ctx) => {
    if (!equal(manifest.files.map((file) => file.path), IMPLEMENTATION_PATHS)) {
      addIssue(ctx, ["files"], "implementation manifest paths are not exact");
    }
    if (
      manifest.implementation_hash !== sha256Json({ files: manifest.files })
    ) {
      addIssue(ctx, ["implementation_hash"], "implementation hash mismatch");
    }
    const hashes = new Map(manifest.files.map((file) => [file.path, file.sha256]));
    const pinnedFiles: Array<[string, string]> = [
      [ACCEPTED_CONCORDANCE_RECORD_PATH, ACCEPTED_CONCORDANCE_RECORD_SHA256],
      [ACCEPTED_CONCORDANCE_ARTIFACT_PATH, ACCEPTED_CONCORDANCE_ARTIFACT_SHA256],
      [
        ACCEPTED_CONCORDANCE_COMPACT_SUMMARY_PATH,
        ACCEPTED_CONCORDANCE_COMPACT_SUMMARY_SHA256
      ],
      ["inference/requirements.lock", REQUIREMENTS_LOCK_SHA256],
      ["package-lock.json", NODE_LOCK_SHA256]
    ];
    for (const [path, expectedHash] of pinnedFiles) {
      if (hashes.get(path) !== expectedHash) {
        addIssue(ctx, ["files"], `${path} hash does not match the pinned evidence`);
      }
    }
  }
);

const PosteriorSummarySchema = z
  .object({
    posterior_mean: Finite,
    posterior_sd: Finite,
    credible_interval_80: z
      .object({ lower: Finite, upper: Finite })
      .strict()
  })
  .strict();

const IntegrationDiagnosticsSchema = z
  .object({
    status: z.literal("PASS"),
    point_count: z.literal(8192),
    finite_point_count: z.number().int().min(4096).max(8192),
    effective_sample_size: Finite,
    compiled_min_effective_sample_size: z.literal(256),
    max_normalized_weight: Finite,
    compiled_max_normalized_weight: z.literal(0.05),
    negative_log_posterior_at_mode: Finite,
    hessian_condition_number: Finite,
    random_numbers_used: z.literal(false),
    seed_used_for_computation: z.literal(false)
  })
  .strict()
  .superRefine((diagnostics, ctx) => {
    if (diagnostics.effective_sample_size < 256) {
      addIssue(ctx, ["effective_sample_size"], "effective sample size is below 256");
    }
    if (
      diagnostics.max_normalized_weight < 0 ||
      diagnostics.max_normalized_weight > 0.05
    ) {
      addIssue(ctx, ["max_normalized_weight"], "normalized weight is outside 0..0.05");
    }
    if (diagnostics.hessian_condition_number <= 0) {
      addIssue(ctx, ["hessian_condition_number"], "condition number must be positive");
    }
  });

const CalibrationSlotResultObjectSchema = z
  .object({
    slot_id: NonEmptyString,
    cell_id: NonEmptyString,
    effect_size_sd: z.union([z.literal(0), z.literal(0.2), z.literal(0.5)]),
    panel_group_count: z.union([z.literal(6), z.literal(12)]),
    replication_index: z.number().int().min(0).max(199),
    seed: SafeInteger,
    aggregate_measurement_cell_k: z.literal(AGGREGATE_MEASUREMENT_CELL_K),
    execution_mode: z.enum(["full", "canary", "smoke"]),
    status: z.enum(["PASS", "HOLD"]),
    failing_checks: z.array(NonEmptyString),
    truth_effect_size_sd: Finite.nullable(),
    posterior_summary: PosteriorSummarySchema.nullable(),
    interval_covers_truth: z.boolean().nullable(),
    internal_validation_signal_detected: z.boolean().nullable(),
    prepared_input_hash: SHA256.nullable(),
    model_input_hash: SHA256.nullable(),
    context_binding_hash: SHA256.nullable(),
    truth_receipt_hash: SHA256.nullable(),
    case_binding_hash: SHA256.nullable(),
    fit_summary_hash: SHA256.nullable(),
    integration_diagnostics: IntegrationDiagnosticsSchema.nullable(),
    execution_identity_hash: SHA256,
    runner_error_stage: NonEmptyString.nullable(),
    runner_error_type: NonEmptyString.nullable(),
    result_hash: SHA256
  })
  .strict();

type CalibrationSlotResult = z.infer<typeof CalibrationSlotResultObjectSchema>;

function calibrationResultBody(result: CalibrationSlotResult) {
  const { result_hash: _hash, ...body } = result;
  return body;
}

const CalibrationSlotResultSchema = CalibrationSlotResultObjectSchema.superRefine(
  (result, ctx) => {
    const expectedSlot = calibrationSlot(
      result.effect_size_sd,
      result.panel_group_count,
      result.replication_index
    );
    for (const key of ["slot_id", "cell_id", "seed"] as const) {
      if (result[key] !== expectedSlot[key]) {
        addIssue(ctx, [key], `${key} must be derived from the compiled slot`);
      }
    }
    if (result.result_hash !== sha256Json(calibrationResultBody(result))) {
      addIssue(ctx, ["result_hash"], "calibration result hash mismatch");
    }

    if (result.status === "PASS") {
      if (result.failing_checks.length !== 0) {
        addIssue(ctx, ["failing_checks"], "passing rows cannot carry failures");
      }
      const posterior = result.posterior_summary;
      if (
        result.truth_effect_size_sd === null ||
        posterior === null ||
        result.interval_covers_truth === null ||
        result.internal_validation_signal_detected === null ||
        result.prepared_input_hash === null ||
        result.model_input_hash === null ||
        result.context_binding_hash === null ||
        result.truth_receipt_hash === null ||
        result.case_binding_hash === null ||
        result.fit_summary_hash === null ||
        result.integration_diagnostics === null
      ) {
        addIssue(ctx, [], "passing calibration rows require complete summary evidence");
        return;
      }
      if (posterior.posterior_sd <= 0) {
        addIssue(ctx, ["posterior_summary", "posterior_sd"], "posterior SD must be positive");
      }
      if (posterior.credible_interval_80.lower > posterior.credible_interval_80.upper) {
        addIssue(ctx, ["posterior_summary", "credible_interval_80"], "interval is unordered");
      }
      if (!near(result.truth_effect_size_sd, result.effect_size_sd, 1e-10)) {
        addIssue(ctx, ["truth_effect_size_sd"], "truth must match the compiled effect");
      }
      const expectedCoverage =
        posterior.credible_interval_80.lower <= result.truth_effect_size_sd &&
        result.truth_effect_size_sd <= posterior.credible_interval_80.upper;
      const expectedSignal =
        Math.abs(posterior.posterior_mean / posterior.posterior_sd) > NULL_SIGNAL_Z;
      if (result.interval_covers_truth !== expectedCoverage) {
        addIssue(ctx, ["interval_covers_truth"], "coverage flag must be derived");
      }
      if (result.internal_validation_signal_detected !== expectedSignal) {
        addIssue(ctx, ["internal_validation_signal_detected"], "signal flag must be derived");
      }
      const expectedCaseHash = sha256Json({
        slot: expectedSlot,
        truth_receipt_hash: result.truth_receipt_hash,
        prepared_input_hash: result.prepared_input_hash,
        model_input_hash: result.model_input_hash,
        context_binding_hash: result.context_binding_hash,
        execution_identity_hash: result.execution_identity_hash
      });
      if (result.case_binding_hash !== expectedCaseHash) {
        addIssue(ctx, ["case_binding_hash"], "case binding hash must be derived");
      }
      const expectedFitHash = sha256Json({
        case_binding_hash: expectedCaseHash,
        truth_effect_size_sd: result.truth_effect_size_sd,
        posterior_summary: posterior,
        interval_covers_truth: expectedCoverage,
        internal_validation_signal_detected: expectedSignal,
        integration_diagnostics: result.integration_diagnostics
      });
      if (result.fit_summary_hash !== expectedFitHash) {
        addIssue(ctx, ["fit_summary_hash"], "fit summary hash must be derived");
      }
      if (result.runner_error_stage !== null || result.runner_error_type !== null) {
        addIssue(ctx, ["runner_error_stage"], "passing rows cannot carry runner errors");
      }
    } else if (result.failing_checks.length === 0) {
      addIssue(ctx, ["failing_checks"], "HOLD rows must name at least one failure");
    }
  }
);

const CalibrationCellSummarySchema = z
  .object({
    cell_id: NonEmptyString,
    effect_size_sd: Finite,
    panel_group_count: SafeInteger,
    expected_replication_count: SafeInteger,
    observed_replication_count: SafeInteger,
    passing_row_count: SafeInteger,
    hard_failure_count: SafeInteger,
    coverage_count: SafeInteger,
    coverage_rate: Finite,
    coverage_standard_error: Finite,
    coverage_gate_passed: z.boolean(),
    null_signal_count: SafeInteger.nullable(),
    null_signal_rate: Finite.nullable(),
    null_gate_passed: z.boolean().nullable()
  })
  .strict();

const CalibrationSummaryObjectSchema = z
  .object({
    execution_mode: z.enum(["full", "canary", "smoke"]),
    cell_summaries: z.array(CalibrationCellSummarySchema).length(6),
    expected_slot_count: z.literal(REQUIRED_SLOT_COUNT),
    observed_slot_count: SafeInteger,
    missing_slot_ids: z.array(NonEmptyString),
    duplicate_slot_ids: z.array(NonEmptyString),
    off_plan_slot_ids: z.array(NonEmptyString),
    duplicate_case_binding_hashes: z.array(SHA256),
    duplicate_fit_summary_hashes: z.array(SHA256),
    exact_manifest_complete: z.boolean(),
    hard_failure_count: SafeInteger,
    calibration_gate_passed: z.boolean(),
    null_gate_passed: z.boolean(),
    worst_null_signal_rate: Finite.nullable(),
    study_status: z.enum(["PASS", "HOLD"]),
    failing_checks: z.array(NonEmptyString),
    study_result_hash: SHA256
  })
  .strict();

type CalibrationSummary = z.infer<typeof CalibrationSummaryObjectSchema>;

const ChunkManifestSchema = z
  .object({
    chunk_index: z.number().int().min(0).max(19),
    chunk_id: NonEmptyString,
    execution_mode: z.enum(["full", "canary", "smoke"]),
    slot_count: SafeInteger,
    slot_result_hashes_hash: SHA256,
    execution_identity_hash: SHA256,
    chunk_hash: SHA256
  })
  .strict();

const FitEvidenceSchema = z
  .object({
    synthetic_input_hash: SHA256,
    prepared_input_hash: SHA256,
    model_input_hash: SHA256,
    context_binding_hash: SHA256,
    case_binding_hash: SHA256,
    fit_summary_hash: SHA256,
    posterior_mean: Finite,
    posterior_sd: Finite,
    internal_validation_signal_detected: z.boolean(),
    negative_log_posterior_at_mode: Finite
  })
  .strict();

type FitEvidence = z.infer<typeof FitEvidenceSchema>;

const FloorEvidenceBaseSchema = z
  .object({
    aggregate_measurement_cell_k: SafeInteger,
    fit_attempted: z.boolean(),
    truth_receipt_hash: SHA256.nullable(),
    synthetic_input_hash: SHA256.nullable(),
    prepared_input_hash: SHA256.nullable(),
    model_input_hash: SHA256.nullable(),
    context_binding_hash: SHA256.nullable(),
    case_binding_hash: SHA256.nullable(),
    fit_summary_hash: SHA256.nullable(),
    posterior_mean: Finite.nullable(),
    posterior_sd: Finite.nullable(),
    internal_validation_signal_detected: z.boolean().nullable(),
    negative_log_posterior_at_mode: Finite.nullable(),
    customer_output_authorized: z.literal(false)
  })
  .strict();

const FloorEvidenceErrorSchema = z
  .object({
    aggregate_measurement_cell_k: SafeInteger,
    fit_attempted: z.boolean(),
    truth_receipt_hash: SHA256.nullable(),
    synthetic_input_hash: SHA256.nullable(),
    prepared_input_hash: SHA256.nullable(),
    model_input_hash: SHA256.nullable(),
    context_binding_hash: SHA256.nullable(),
    case_binding_hash: SHA256.nullable(),
    fit_summary_hash: SHA256.nullable(),
    posterior_mean: Finite.nullable(),
    posterior_sd: Finite.nullable(),
    internal_validation_signal_detected: z.boolean().nullable(),
    negative_log_posterior_at_mode: Finite.nullable(),
    customer_output_authorized: z.literal(false),
    runner_error_stage: z.enum(["generate", "fit"]),
    runner_error_type: NonEmptyString
  })
  .strict();

const LagCandidateObjectSchema = z
  .object({
    candidate_lag_windows: z.number().int().min(0).max(4),
    declared_input_lag_windows: z.number().int().min(1).max(4),
    status: z.enum(["PASS", "HOLD"]),
    negative_log_posterior_at_mode: Finite.nullable(),
    synthetic_input_hash: SHA256.nullable(),
    prepared_input_hash: SHA256.nullable(),
    model_input_hash: SHA256.nullable(),
    context_binding_hash: SHA256.nullable(),
    truth_receipt_hash: SHA256.nullable(),
    case_binding_hash: SHA256.nullable(),
    fit_summary_hash: SHA256.nullable(),
    runner_error_type: NonEmptyString.nullable(),
    candidate_result_hash: SHA256
  })
  .strict();

type LagCandidate = z.infer<typeof LagCandidateObjectSchema>;

function lagCandidateBody(candidate: LagCandidate) {
  const { candidate_result_hash: _hash, ...body } = candidate;
  return body;
}

const LagCandidateSchema = LagCandidateObjectSchema.superRefine((candidate, ctx) => {
  if (candidate.declared_input_lag_windows !== Math.max(candidate.candidate_lag_windows, 1)) {
    addIssue(ctx, ["declared_input_lag_windows"], "declared lag must be derived");
  }
  if (candidate.candidate_result_hash !== sha256Json(lagCandidateBody(candidate))) {
    addIssue(ctx, ["candidate_result_hash"], "candidate result hash mismatch");
  }
  const hashValues = [
    candidate.synthetic_input_hash,
    candidate.prepared_input_hash,
    candidate.model_input_hash,
    candidate.context_binding_hash,
    candidate.truth_receipt_hash,
    candidate.case_binding_hash,
    candidate.fit_summary_hash
  ];
  if (candidate.status === "PASS") {
    if (
      candidate.negative_log_posterior_at_mode === null ||
      hashValues.some((value) => value === null) ||
      candidate.runner_error_type !== null
    ) {
      addIssue(ctx, [], "passing lag candidates require complete evidence");
    }
  } else if (candidate.runner_error_type === null) {
    addIssue(ctx, ["runner_error_type"], "HOLD candidates must name a runner error");
  }
});

const LagEvidenceSchema = z
  .object({
    true_lag_windows: SafeInteger,
    replication_index: SafeInteger,
    seed: SafeInteger,
    candidate_scores: z.array(LagCandidateSchema).length(5),
    all_candidates_passed: z.boolean(),
    score_tie: z.boolean(),
    selected_lag_windows: SafeInteger.nullable(),
    true_lag_recovered: z.boolean(),
    customer_output_authorized: z.literal(false)
  })
  .strict();

const NegativeEvidenceSchema = z
  .object({
    seed: SafeInteger,
    truth_receipt_hash: SHA256.nullable(),
    fit_attempted: z.boolean(),
    primary_fit: FitEvidenceSchema.nullable(),
    late_window_fit: FitEvidenceSchema.nullable(),
    rejection_stage: NonEmptyString.nullable(),
    rejection_type: NonEmptyString.nullable(),
    rejection_fingerprint: SHA256.nullable(),
    truth_bound_negative_control: z.literal(true),
    customer_output_authorized: z.literal(false)
  })
  .strict();

const ControlResultCommonShape = {
  control_id: NonEmptyString,
  execution_mode: z.enum(["full", "smoke"]),
  expected_outcome: NonEmptyString,
  observed_outcome: NonEmptyString,
  control_passed: z.boolean(),
  execution_identity_hash: SHA256,
  result_hash: SHA256
};

const FloorControlResultSchema = z
  .object({
    ...ControlResultCommonShape,
    control_family: z.literal("floor"),
    plan: FloorPlanSchema,
    evidence: z.union([FloorEvidenceBaseSchema, FloorEvidenceErrorSchema])
  })
  .strict();

const LagControlResultSchema = z
  .object({
    ...ControlResultCommonShape,
    control_family: z.literal("lag"),
    plan: LagPlanSchema,
    evidence: LagEvidenceSchema
  })
  .strict();

const NegativeControlResultSchema = z
  .object({
    ...ControlResultCommonShape,
    control_family: z.literal("negative"),
    plan: NegativePlanSchema,
    evidence: NegativeEvidenceSchema
  })
  .strict();

const ControlResultObjectSchema = z.discriminatedUnion("control_family", [
  FloorControlResultSchema,
  LagControlResultSchema,
  NegativeControlResultSchema
]);

type ControlResult = z.infer<typeof ControlResultObjectSchema>;

const LagRecoverySummarySchema = z
  .object({
    true_lag_windows: SafeInteger,
    expected_replication_count: SafeInteger,
    observed_replication_count: SafeInteger,
    valid_selection_count: SafeInteger,
    exact_recovery_count: SafeInteger,
    exact_recovery_rate: Finite,
    required_recovery_count: SafeInteger,
    passed: z.boolean()
  })
  .strict();

const ControlStudyObjectSchema = z
  .object({
    report_class: z.literal("longitudinal_replicated_validation_controls_v1"),
    control_plan: ControlPlanSchema,
    execution_mode: z.enum(["full", "smoke"]),
    floor_results: z.array(FloorControlResultSchema).max(FLOOR_K_VALUES.length),
    lag_results: z.array(LagControlResultSchema).max(COMPILED_LAG_PLANS.length),
    negative_results: z
      .array(NegativeControlResultSchema)
      .max(NEGATIVE_CONTROL_IDS.length),
    lag_recovery_summaries: z.array(LagRecoverySummarySchema).length(3),
    exact_manifest_complete: z.boolean(),
    floor_gate_passed: z.boolean(),
    lag_gate_passed: z.boolean(),
    negative_control_gate_passed: z.boolean(),
    study_status: z.enum(["PASS", "HOLD"]),
    failing_checks: z.array(NonEmptyString),
    execution_identity: ExecutionIdentitySchema,
    internal_only: z.literal(true),
    synthetic_only: z.literal(true),
    customer_output_authorized: z.literal(false),
    probability_output_authorized: z.literal(false),
    confidence_output_authorized: z.literal(false),
    study_result_hash: SHA256
  })
  .strict();

type ControlStudy = z.infer<typeof ControlStudyObjectSchema>;

function controlResultBody(result: ControlResult) {
  const { result_hash: _hash, ...body } = result;
  return body;
}

function fitEvidenceHash(evidence: FitEvidence): string {
  return sha256Json({
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
}

function validateFitEvidence(
  evidence: FitEvidence,
  ctx: z.RefinementCtx,
  path: (string | number)[]
): void {
  const expectedSignal =
    Math.abs(evidence.posterior_mean / evidence.posterior_sd) > NULL_SIGNAL_Z;
  if (evidence.posterior_sd <= 0) {
    addIssue(ctx, [...path, "posterior_sd"], "posterior SD must be positive");
  }
  if (evidence.internal_validation_signal_detected !== expectedSignal) {
    addIssue(ctx, [...path, "internal_validation_signal_detected"], "signal must be derived");
  }
  if (evidence.fit_summary_hash !== fitEvidenceHash({
    ...evidence,
    internal_validation_signal_detected: expectedSignal
  })) {
    addIssue(ctx, [...path, "fit_summary_hash"], "fit summary hash must be derived");
  }
}

function expectedControlPlan(result: ControlResult): unknown | undefined {
  if (result.control_family === "floor") {
    return COMPILED_FLOOR_PLANS.find((plan) => plan.control_id === result.control_id);
  }
  if (result.control_family === "lag") {
    return COMPILED_LAG_PLANS.find((plan) => plan.control_id === result.control_id);
  }
  return COMPILED_NEGATIVE_PLANS.find((plan) => plan.control_id === result.control_id);
}

function validateFloorControl(
  result: ControlResult,
  ctx: z.RefinementCtx,
  path: (string | number)[]
): void {
  const plan = result.plan as z.infer<typeof FloorPlanSchema>;
  const evidence = result.evidence as z.infer<typeof FloorEvidenceBaseSchema> & {
    runner_error_stage?: "generate" | "fit";
    runner_error_type?: string;
  };
  if (evidence.aggregate_measurement_cell_k !== plan.aggregate_measurement_cell_k) {
    addIssue(ctx, [...path, "evidence", "aggregate_measurement_cell_k"], "floor k mismatch");
  }
  const aggregateK = plan.aggregate_measurement_cell_k;
  const expectedOutcome = floorExpectedOutcome(aggregateK);
  if (aggregateK < AGGREGATE_PROVENANCE_FLOOR_K) {
    const nullableKeys = [
      "truth_receipt_hash",
      "synthetic_input_hash",
      "prepared_input_hash",
      "model_input_hash",
      "context_binding_hash",
      "case_binding_hash",
      "fit_summary_hash",
      "posterior_mean",
      "posterior_sd",
      "internal_validation_signal_detected",
      "negative_log_posterior_at_mode"
    ] as const;
    if (
      evidence.fit_attempted !== false ||
      nullableKeys.some((key) => evidence[key] !== null) ||
      result.observed_outcome !== expectedOutcome
    ) {
      addIssue(ctx, [...path, "evidence"], "k=4 must reject before fit");
    }
  } else if (result.observed_outcome === "RUNNER_ERROR") {
    if (
      evidence.fit_attempted !== true ||
      !evidence.runner_error_stage ||
      !evidence.runner_error_type
    ) {
      addIssue(ctx, [...path, "evidence"], "runner errors require attempted fit and error type");
    }
  } else {
    const requiredHashes = [
      evidence.truth_receipt_hash,
      evidence.synthetic_input_hash,
      evidence.prepared_input_hash,
      evidence.model_input_hash,
      evidence.context_binding_hash,
      evidence.case_binding_hash,
      evidence.fit_summary_hash
    ];
    if (
      evidence.fit_attempted !== true ||
      requiredHashes.some((value) => value === null) ||
      evidence.posterior_mean === null ||
      evidence.posterior_sd === null ||
      evidence.internal_validation_signal_detected === null ||
      evidence.negative_log_posterior_at_mode === null
    ) {
      addIssue(ctx, [...path, "evidence"], "floor fit evidence is incomplete");
    } else {
      const expectedSignal =
        Math.abs(evidence.posterior_mean / evidence.posterior_sd) > NULL_SIGNAL_Z;
      if (evidence.posterior_sd <= 0) {
        addIssue(ctx, [...path, "evidence", "posterior_sd"], "posterior SD must be positive");
      }
      if (evidence.internal_validation_signal_detected !== expectedSignal) {
        addIssue(ctx, [...path, "evidence", "internal_validation_signal_detected"], "signal must be derived");
      }
      const expectedCaseHash = sha256Json({
        control_id: result.control_id,
        aggregate_measurement_cell_k: aggregateK,
        truth_receipt_hash: evidence.truth_receipt_hash,
        execution_identity_hash: result.execution_identity_hash,
        synthetic_input_hash: evidence.synthetic_input_hash,
        prepared_input_hash: evidence.prepared_input_hash,
        model_input_hash: evidence.model_input_hash,
        context_binding_hash: evidence.context_binding_hash
      });
      if (evidence.case_binding_hash !== expectedCaseHash) {
        addIssue(ctx, [...path, "evidence", "case_binding_hash"], "floor case hash must be derived");
      }
      const expectedFitHash = sha256Json({
        case_binding_hash: expectedCaseHash,
        synthetic_input_hash: evidence.synthetic_input_hash,
        prepared_input_hash: evidence.prepared_input_hash,
        model_input_hash: evidence.model_input_hash,
        context_binding_hash: evidence.context_binding_hash,
        posterior_mean: evidence.posterior_mean,
        posterior_sd: evidence.posterior_sd,
        internal_validation_signal_detected: expectedSignal,
        negative_log_posterior_at_mode: evidence.negative_log_posterior_at_mode
      });
      if (evidence.fit_summary_hash !== expectedFitHash) {
        addIssue(ctx, [...path, "evidence", "fit_summary_hash"], "floor fit hash must be derived");
      }
    }
    if (result.observed_outcome !== expectedOutcome) {
      addIssue(ctx, [...path, "observed_outcome"], "floor outcome must follow compiled policy");
    }
  }
}

function validateLagControl(
  result: ControlResult,
  ctx: z.RefinementCtx,
  path: (string | number)[]
): void {
  const plan = result.plan as z.infer<typeof LagPlanSchema>;
  const evidence = result.evidence as z.infer<typeof LagEvidenceSchema>;
  for (const key of ["true_lag_windows", "replication_index", "seed"] as const) {
    if (evidence[key] !== plan[key]) {
      addIssue(ctx, [...path, "evidence", key], "lag evidence identity mismatch");
    }
  }
  if (!equal(
    evidence.candidate_scores.map((score) => score.candidate_lag_windows),
    LAG_CANDIDATE_WINDOWS
  )) {
    addIssue(ctx, [...path, "evidence", "candidate_scores"], "candidate order is not compiled");
  }
  const passing = evidence.candidate_scores.filter((score) => score.status === "PASS");
  const truthHashes = new Set(passing.map((score) => score.truth_receipt_hash));
  if (passing.length > 0 && truthHashes.size !== 1) {
    addIssue(ctx, [...path, "evidence", "candidate_scores"], "lag candidates must share truth");
  }
  for (const [index, score] of passing.entries()) {
    const expectedCaseHash = sha256Json({
      lag_slot: plan,
      candidate_lag_windows: score.candidate_lag_windows,
      truth_receipt_hash: score.truth_receipt_hash,
      synthetic_input_hash: score.synthetic_input_hash,
      prepared_input_hash: score.prepared_input_hash,
      model_input_hash: score.model_input_hash,
      context_binding_hash: score.context_binding_hash,
      execution_identity_hash: result.execution_identity_hash
    });
    if (score.case_binding_hash !== expectedCaseHash) {
      addIssue(ctx, [...path, "evidence", "candidate_scores", index, "case_binding_hash"], "lag case hash must be derived");
    }
    const expectedFitHash = sha256Json({
      case_binding_hash: expectedCaseHash,
      synthetic_input_hash: score.synthetic_input_hash,
      prepared_input_hash: score.prepared_input_hash,
      model_input_hash: score.model_input_hash,
      context_binding_hash: score.context_binding_hash,
      truth_receipt_hash: score.truth_receipt_hash,
      candidate_lag_windows: score.candidate_lag_windows,
      declared_input_lag_windows: score.declared_input_lag_windows,
      negative_log_posterior_at_mode: score.negative_log_posterior_at_mode
    });
    if (score.fit_summary_hash !== expectedFitHash) {
      addIssue(ctx, [...path, "evidence", "candidate_scores", index, "fit_summary_hash"], "lag fit hash must be derived");
    }
  }
  const allPassed = evidence.candidate_scores.every((score) => score.status === "PASS");
  let tied = false;
  let selected: number | null = null;
  if (allPassed) {
    const ordered = [...evidence.candidate_scores].sort(
      (left, right) =>
        (left.negative_log_posterior_at_mode as number) -
          (right.negative_log_posterior_at_mode as number) ||
        left.candidate_lag_windows - right.candidate_lag_windows
    );
    tied =
      Math.abs(
        (ordered[1].negative_log_posterior_at_mode as number) -
          (ordered[0].negative_log_posterior_at_mode as number)
      ) <= LAG_SCORE_TIE_EPSILON;
    if (!tied) selected = ordered[0].candidate_lag_windows;
  }
  const expectedObserved = !allPassed
    ? "LAG_CANDIDATE_RUNNER_ERROR"
    : tied
      ? "LAG_SCORE_TIE"
      : "LAG_SELECTION_COMPLETED";
  const checks: Array<[string, unknown, unknown]> = [
    ["all_candidates_passed", evidence.all_candidates_passed, allPassed],
    ["score_tie", evidence.score_tie, tied],
    ["selected_lag_windows", evidence.selected_lag_windows, selected],
    ["true_lag_recovered", evidence.true_lag_recovered, selected === plan.true_lag_windows],
    ["observed_outcome", result.observed_outcome, expectedObserved]
  ];
  for (const [key, actual, expected] of checks) {
    if (!equal(actual, expected)) {
      addIssue(ctx, [...path, key === "observed_outcome" ? key : "evidence", ...(key === "observed_outcome" ? [] : [key])], `${key} must be derived`);
    }
  }
}

function validateNegativeControl(
  result: ControlResult,
  ctx: z.RefinementCtx,
  path: (string | number)[]
): void {
  const plan = result.plan as z.infer<typeof NegativePlanSchema>;
  const evidence = result.evidence as z.infer<typeof NegativeEvidenceSchema>;
  if (evidence.seed !== plan.seed) {
    addIssue(ctx, [...path, "evidence", "seed"], "negative-control seed mismatch");
  }
  const expectedOutcome = plan.expected_outcome;
  const primary = evidence.primary_fit;
  const late = evidence.late_window_fit;
  if (expectedOutcome === "REJECTED_BEFORE_FIT") {
    const rejection = STRUCTURAL_NEGATIVE_REJECTIONS[result.control_id];
    const expectedFingerprint = rejectionFingerprint(
      rejection.exceptionType,
      rejection.message
    );
    if (
      evidence.fit_attempted !== false ||
      primary !== null ||
      late !== null ||
      evidence.rejection_stage !== "prepare" ||
      evidence.truth_receipt_hash === null
    ) {
      addIssue(ctx, [...path, "evidence"], "structural negative control must reject before fit");
    }
    let expectedObserved: string | null = null;
    if (
      evidence.rejection_type === null &&
      evidence.rejection_fingerprint === null
    ) {
      expectedObserved = "UNEXPECTED_PREPARATION_PASS";
    } else if (
      evidence.rejection_type === rejection.exceptionType &&
      evidence.rejection_fingerprint === expectedFingerprint
    ) {
      expectedObserved = "REJECTED_BEFORE_FIT";
    } else if (
      evidence.rejection_type !== null &&
      evidence.rejection_fingerprint !== null
    ) {
      expectedObserved = "RUNNER_ERROR";
    } else {
      addIssue(ctx, [...path, "evidence"], "structural rejection evidence is incomplete");
    }
    if (expectedObserved !== null && result.observed_outcome !== expectedObserved) {
      addIssue(ctx, [...path, "observed_outcome"], "structural outcome must be derived");
    }
    return;
  }
  if (result.observed_outcome === "RUNNER_ERROR") {
    const validStages = new Set(["generate", "primary_fit", "late_window_fit"]);
    const expectedFitAttempted = evidence.rejection_stage !== "generate";
    if (
      evidence.rejection_stage === null ||
      !validStages.has(evidence.rejection_stage) ||
      evidence.fit_attempted !== expectedFitAttempted ||
      evidence.rejection_type === null ||
      evidence.rejection_fingerprint === null ||
      (evidence.rejection_stage !== "generate" &&
        evidence.truth_receipt_hash === null)
    ) {
      addIssue(ctx, [...path, "evidence"], "negative-control runner error is incomplete");
    }
    if (primary !== null) {
      validateFitEvidence(primary, ctx, [...path, "evidence", "primary_fit"]);
    }
    if (late !== null) {
      validateFitEvidence(late, ctx, [...path, "evidence", "late_window_fit"]);
    }
    return;
  }
  if (
    evidence.rejection_stage !== null ||
    evidence.rejection_type !== null ||
    evidence.rejection_fingerprint !== null ||
    evidence.truth_receipt_hash === null
  ) {
    addIssue(ctx, [...path, "evidence"], "successful control cannot carry rejection evidence");
    return;
  }
  if (evidence.fit_attempted !== true || primary === null) {
    addIssue(ctx, [...path, "evidence"], "statistical negative control requires primary fit");
    return;
  }
  validateFitEvidence(primary, ctx, [...path, "evidence", "primary_fit"]);
  const expectedPrimaryCaseHash = sha256Json({
    control_id: result.control_id,
    truth_receipt_hash: evidence.truth_receipt_hash,
    execution_identity_hash: result.execution_identity_hash,
    synthetic_input_hash: primary.synthetic_input_hash,
    prepared_input_hash: primary.prepared_input_hash,
    model_input_hash: primary.model_input_hash,
    context_binding_hash: primary.context_binding_hash
  });
  if (primary.case_binding_hash !== expectedPrimaryCaseHash) {
    addIssue(ctx, [...path, "evidence", "primary_fit", "case_binding_hash"], "primary case hash must be derived");
  }
  let expectedObserved: string;
  if (
    result.control_id === "approved_control_shock" ||
    result.control_id === "unrelated_outcome_shock"
  ) {
    expectedObserved = primary.internal_validation_signal_detected
      ? "HOLD_UNEXPECTED_INTERNAL_SIGNAL"
      : "PASS_NO_INTERNAL_SIGNAL";
    if (late !== null) {
      addIssue(ctx, [...path, "evidence", "late_window_fit"], "late fit is not permitted");
    }
  } else if (result.control_id === "uncontrolled_common_shock") {
    expectedObserved = "HOLD_UNMEASURED_COMMON_SHOCK";
    if (late !== null) {
      addIssue(ctx, [...path, "evidence", "late_window_fit"], "late fit is not permitted");
    }
  } else {
    if (late === null) {
      addIssue(ctx, [...path, "evidence", "late_window_fit"], "temporary movement needs a late fit");
      return;
    }
    validateFitEvidence(late, ctx, [...path, "evidence", "late_window_fit"]);
    const expectedLateCaseHash = sha256Json({
      control_id: result.control_id,
      refit: "late_window_persistence",
      truth_receipt_hash: evidence.truth_receipt_hash,
      execution_identity_hash: result.execution_identity_hash,
      synthetic_input_hash: late.synthetic_input_hash,
      prepared_input_hash: late.prepared_input_hash,
      model_input_hash: late.model_input_hash,
      context_binding_hash: late.context_binding_hash
    });
    if (late.case_binding_hash !== expectedLateCaseHash) {
      addIssue(ctx, [...path, "evidence", "late_window_fit", "case_binding_hash"], "late case hash must be derived");
    }
    expectedObserved = late.internal_validation_signal_detected
      ? "HOLD_UNEXPECTED_PERSISTENCE"
      : "HOLD_NO_LATE_WINDOW_PERSISTENCE";
  }
  if (result.observed_outcome !== expectedObserved) {
    addIssue(ctx, [...path, "observed_outcome"], "negative-control outcome must be derived");
  }
}

function validateControlResult(
  result: ControlResult,
  expectedIdentityHash: string,
  expectedMode: "full" | "smoke",
  ctx: z.RefinementCtx,
  path: (string | number)[]
): void {
  if (result.result_hash !== sha256Json(controlResultBody(result))) {
    addIssue(ctx, [...path, "result_hash"], "control result hash mismatch");
  }
  if (result.execution_identity_hash !== expectedIdentityHash) {
    addIssue(ctx, [...path, "execution_identity_hash"], "control identity mismatch");
  }
  if (result.execution_mode !== expectedMode) {
    addIssue(ctx, [...path, "execution_mode"], "control execution mode mismatch");
  }
  const expectedPlan = expectedControlPlan(result);
  if (expectedPlan === undefined || !equal(result.plan, expectedPlan)) {
    addIssue(ctx, [...path, "plan"], "control plan binding mismatch");
  }
  if (result.control_family === "floor") {
    validateFloorControl(result, ctx, path);
  } else if (result.control_family === "lag") {
    validateLagControl(result, ctx, path);
  } else {
    validateNegativeControl(result, ctx, path);
  }
  const expectedOutcome =
    result.control_family === "lag"
      ? "LAG_SELECTION_COMPLETED"
      : (expectedPlan as { expected_outcome?: string } | undefined)?.expected_outcome;
  if (result.expected_outcome !== expectedOutcome) {
    addIssue(ctx, [...path, "expected_outcome"], "expected outcome must match plan");
  }
  if (result.control_passed !== (result.observed_outcome === result.expected_outcome)) {
    addIssue(ctx, [...path, "control_passed"], "control pass flag must be derived");
  }
}

function deriveCalibrationSummary(
  results: CalibrationSlotResult[],
  executionMode: "full" | "canary" | "smoke"
): Omit<CalibrationSummary, "study_result_hash"> {
  const observedIds = results.map((result) => result.slot_id);
  const duplicateIds = [...new Set(
    observedIds.filter((slotId, index) => observedIds.indexOf(slotId) !== index)
  )].sort();
  const offPlanIds = [...new Set(
    observedIds.filter((slotId) => !COMPILED_SLOT_ID_SET.has(slotId))
  )].sort();
  const missingIds = COMPILED_SLOT_IDS.filter((slotId) => !observedIds.includes(slotId));
  const expectedPresentOrder = COMPILED_SLOT_IDS.filter((slotId) => observedIds.includes(slotId));
  const compiledOrder = equal(observedIds, expectedPresentOrder);
  const caseHashes = results.flatMap((result) =>
    result.case_binding_hash === null ? [] : [result.case_binding_hash]
  );
  const fitHashes = results.flatMap((result) =>
    result.fit_summary_hash === null ? [] : [result.fit_summary_hash]
  );
  const duplicateCaseHashes = [...new Set(
    caseHashes.filter((value, index) => caseHashes.indexOf(value) !== index)
  )].sort();
  const duplicateFitHashes = [...new Set(
    fitHashes.filter((value, index) => fitHashes.indexOf(value) !== index)
  )].sort();
  const identityHashes = new Set(results.map((result) => result.execution_identity_hash));
  const exactManifest =
    executionMode === "full" &&
    results.length === REQUIRED_SLOT_COUNT &&
    missingIds.length === 0 &&
    duplicateIds.length === 0 &&
    offPlanIds.length === 0 &&
    duplicateCaseHashes.length === 0 &&
    duplicateFitHashes.length === 0 &&
    compiledOrder &&
    identityHashes.size === 1 &&
    results.every((result) => result.execution_mode === "full");
  const passed = (result: CalibrationSlotResult) =>
    result.status === "PASS" && result.failing_checks.length === 0;
  const hardFailureCount = results.filter((result) => !passed(result)).length;
  const cellSummaries = EFFECT_SIZES.flatMap((effect) =>
    PANEL_GROUP_COUNTS.map((groups) => {
      const cell = results.filter(
        (result) =>
          result.effect_size_sd === effect && result.panel_group_count === groups
      );
      const passingCount = cell.filter(passed).length;
      const coverageCount = cell.filter(
        (result) => result.interval_covers_truth === true
      ).length;
      const coverageRate = coverageCount / REPLICATIONS_PER_CELL;
      const coverageStandardError = Math.sqrt(
        (coverageRate * (1 - coverageRate)) / REPLICATIONS_PER_CELL
      );
      const coverageGatePassed =
        cell.length === REPLICATIONS_PER_CELL &&
        passingCount === REPLICATIONS_PER_CELL &&
        coverageCount >= COVERAGE_COUNT_MIN &&
        coverageCount <= COVERAGE_COUNT_MAX;
      const nullSignalCount =
        effect === 0
          ? cell.filter((result) => result.internal_validation_signal_detected === true)
              .length
          : null;
      const nullSignalRate =
        nullSignalCount === null ? null : nullSignalCount / REPLICATIONS_PER_CELL;
      const nullGatePassed =
        nullSignalCount === null
          ? null
          : cell.length === REPLICATIONS_PER_CELL &&
            passingCount === REPLICATIONS_PER_CELL &&
            nullSignalCount <= NULL_SIGNAL_COUNT_MAX;
      return {
        cell_id: `effect_${effectToken(effect)}__groups_${groups}`,
        effect_size_sd: effect,
        panel_group_count: groups,
        expected_replication_count: REPLICATIONS_PER_CELL,
        observed_replication_count: cell.length,
        passing_row_count: passingCount,
        hard_failure_count: cell.length - passingCount,
        coverage_count: coverageCount,
        coverage_rate: coverageRate,
        coverage_standard_error: coverageStandardError,
        coverage_gate_passed: coverageGatePassed,
        null_signal_count: nullSignalCount,
        null_signal_rate: nullSignalRate,
        null_gate_passed: nullGatePassed
      };
    })
  );
  const calibrationPassed = cellSummaries.every(
    (summary) => summary.coverage_gate_passed
  );
  const nullSummaries = cellSummaries.filter(
    (summary) => summary.null_signal_rate !== null
  );
  const nullPassed =
    nullSummaries.length > 0 &&
    nullSummaries.every((summary) => summary.null_gate_passed === true);
  const worstNullRate =
    nullSummaries.length === 0
      ? null
      : Math.max(...nullSummaries.map((summary) => summary.null_signal_rate as number));
  const failures: string[] = [];
  if (executionMode !== "full") failures.push("full_execution_required");
  if (missingIds.length > 0) failures.push("missing_slots");
  if (duplicateIds.length > 0) failures.push("duplicate_slots");
  if (offPlanIds.length > 0) failures.push("off_plan_slots");
  if (!compiledOrder || identityHashes.size !== 1) failures.push("manifest_integrity");
  if (duplicateCaseHashes.length > 0 || duplicateFitHashes.length > 0) {
    failures.push("duplicate_evidence_bindings");
  }
  if (hardFailureCount > 0) failures.push("hard_slot_failures");
  if (!calibrationPassed) failures.push("calibration_coverage");
  if (!nullPassed) failures.push("null_false_signal");
  const expectedPass =
    exactManifest && hardFailureCount === 0 && calibrationPassed && nullPassed;
  return {
    execution_mode: executionMode,
    cell_summaries: cellSummaries,
    expected_slot_count: REQUIRED_SLOT_COUNT,
    observed_slot_count: results.length,
    missing_slot_ids: missingIds,
    duplicate_slot_ids: duplicateIds,
    off_plan_slot_ids: offPlanIds,
    duplicate_case_binding_hashes: duplicateCaseHashes,
    duplicate_fit_summary_hashes: duplicateFitHashes,
    exact_manifest_complete: exactManifest,
    hard_failure_count: hardFailureCount,
    calibration_gate_passed: calibrationPassed,
    null_gate_passed: nullPassed,
    worst_null_signal_rate: worstNullRate,
    study_status: expectedPass ? "PASS" : "HOLD",
    failing_checks: failures
  };
}

function deriveControlStudy(
  study: ControlStudy,
  ctx: z.RefinementCtx
): Omit<ControlStudy, "study_result_hash"> {
  const allResults = [
    ...study.floor_results,
    ...study.lag_results,
    ...study.negative_results
  ];
  for (const [index, result] of study.floor_results.entries()) {
    validateControlResult(
      result,
      study.execution_identity.identity_hash,
      study.execution_mode,
      ctx,
      ["control_study", "floor_results", index]
    );
  }
  for (const [index, result] of study.lag_results.entries()) {
    validateControlResult(
      result,
      study.execution_identity.identity_hash,
      study.execution_mode,
      ctx,
      ["control_study", "lag_results", index]
    );
  }
  for (const [index, result] of study.negative_results.entries()) {
    validateControlResult(
      result,
      study.execution_identity.identity_hash,
      study.execution_mode,
      ctx,
      ["control_study", "negative_results", index]
    );
  }
  const exact =
    study.execution_mode === "full" &&
    equal(study.floor_results.map((result) => result.control_id), COMPILED_FLOOR_PLANS.map((plan) => plan.control_id)) &&
    equal(study.lag_results.map((result) => result.control_id), COMPILED_LAG_PLANS.map((plan) => plan.control_id)) &&
    equal(study.negative_results.map((result) => result.control_id), NEGATIVE_CONTROL_IDS) &&
    new Set(allResults.map((result) => result.result_hash)).size === allResults.length;
  const floorPassed =
    study.floor_results.length === COMPILED_FLOOR_PLANS.length &&
    study.floor_results.every((result) => result.control_passed);
  const lagSummaries = LAG_TRUE_WINDOWS.map((trueLag) => {
    const rows = study.lag_results.filter(
      (result) => (result.plan as z.infer<typeof LagPlanSchema>).true_lag_windows === trueLag
    );
    const validCount = rows.filter((result) => result.control_passed).length;
    const recovered = rows.filter(
      (result) => (result.evidence as z.infer<typeof LagEvidenceSchema>).true_lag_recovered
    ).length;
    return {
      true_lag_windows: trueLag,
      expected_replication_count: LAG_REPLICATIONS_PER_TRUTH,
      observed_replication_count: rows.length,
      valid_selection_count: validCount,
      exact_recovery_count: recovered,
      exact_recovery_rate: recovered / LAG_REPLICATIONS_PER_TRUTH,
      required_recovery_count: LAG_REQUIRED_RECOVERIES,
      passed:
        rows.length === LAG_REPLICATIONS_PER_TRUTH &&
        validCount === LAG_REPLICATIONS_PER_TRUTH &&
        recovered >= LAG_REQUIRED_RECOVERIES
    };
  });
  const lagPassed = lagSummaries.every((summary) => summary.passed);
  const negativePassed =
    study.negative_results.length === COMPILED_NEGATIVE_PLANS.length &&
    study.negative_results.every((result) => result.control_passed);
  const failures: string[] = [];
  if (study.execution_mode !== "full") failures.push("full_control_execution_required");
  if (!exact) failures.push("control_manifest_incomplete");
  if (!floorPassed) failures.push("floor_controls");
  if (!lagPassed) failures.push("lag_recovery");
  if (!negativePassed) failures.push("negative_controls");
  const passed = exact && floorPassed && lagPassed && negativePassed;
  return {
    report_class: "longitudinal_replicated_validation_controls_v1",
    control_plan: study.control_plan,
    execution_mode: study.execution_mode,
    floor_results: study.floor_results,
    lag_results: study.lag_results,
    negative_results: study.negative_results,
    lag_recovery_summaries: lagSummaries,
    exact_manifest_complete: exact,
    floor_gate_passed: floorPassed,
    lag_gate_passed: lagPassed,
    negative_control_gate_passed: negativePassed,
    study_status: passed ? "PASS" : "HOLD",
    failing_checks: failures,
    execution_identity: study.execution_identity,
    internal_only: true,
    synthetic_only: true,
    customer_output_authorized: false,
    probability_output_authorized: false,
    confidence_output_authorized: false
  };
}

const ModelSpecificationSchema = z
  .object({
    model_kind: z.literal(MODEL_KIND),
    equation: z.literal("y[c,t]=X[c,t]beta+u[c]+r[c,t]+epsilon[c,t]"),
    state_equation: z.literal("r[c,t]=rho*r[c,t-1]+eta[c,t]"),
    likelihood_family: z.literal("continuous_normal_identity"),
    link_function: z.literal("identity"),
    known_aggregate_se_used_exactly: z.literal(true),
    additional_observation_scale: z.literal(false),
    stationary_ar1_initial_state: z.literal(true),
    rho_abs_bound: z.literal(0.95),
    zero_sum_panel_group_effects: z.literal(true),
    pre_period_only_standardization: z.literal(true),
    velocity_and_breadth_separate: z.literal(true),
    baseline_fluency_context_included: z.literal(true),
    depth_context_only: z.literal(true),
    depth_used_in_likelihood: z.literal(false),
    minimum_worthwhile_change_used_in_inference: z.literal(false),
    fixed_effect_prior: z
      .object({ family: z.literal("Normal"), mean: z.literal(0), sd: z.literal(1) })
      .strict(),
    panel_group_scale_prior: z
      .object({ family: z.literal("HalfNormal"), sd: z.literal(1) })
      .strict(),
    ar1_innovation_scale_prior: z
      .object({ family: z.literal("HalfNormal"), sd: z.literal(1) })
      .strict(),
    rho_prior: z
      .object({ family: z.literal("Uniform"), lower: z.literal(-0.95), upper: z.literal(0.95) })
      .strict()
  })
  .strict();

const EngineSpecificationSchema = z
  .object({
    primary_engine: z.literal(PRIMARY_ENGINE),
    posterior_draws_generated: z.literal(false),
    latent_states_emitted: z.literal(false),
    deterministic_cubature_point_count: z.literal(8192),
    calibration_engine: z.literal("deterministic_state_space_primary_only"),
    nuts_concordance_reused_not_rerun: z.literal(true),
    accepted_concordance_artifact_sha256: z.literal(
      ACCEPTED_CONCORDANCE_ARTIFACT_SHA256
    ),
    accepted_concordance_review_record: z.literal(
      ACCEPTED_CONCORDANCE_RECORD_PATH
    ),
    thresholds_runtime_configurable: z.literal(false)
  })
  .strict();

const CombinedStudySchema = z
  .object({
    execution_mode: z.enum(["full", "canary", "smoke"]),
    execution_identity_hash: SHA256,
    calibration_study_result_hash: SHA256,
    control_study_result_hash: SHA256,
    chunk_manifest_hashes: z.array(SHA256),
    calibration_result_hashes_hash: SHA256,
    numerical_validation_gate_passed: z.boolean(),
    failing_checks: z.array(NonEmptyString),
    combined_study_hash: SHA256
  })
  .strict();

const BlockedOutputsSchema = z
  .object({
    customer_output_authorized: z.literal(false),
    probability_output_authorized: z.literal(false),
    confidence_output_authorized: z.literal(false),
    roi_output_authorized: z.literal(false),
    finance_output_authorized: z.literal(false),
    causality_output_authorized: z.literal(false),
    productivity_output_authorized: z.literal(false),
    creates_route: z.literal(false),
    creates_ui: z.literal(false),
    writes_persistence: z.literal(false),
    creates_export: z.literal(false),
    renders_readout: z.literal(false),
    executes_connector: z.literal(false)
  })
  .strict();

const ArtifactObjectSchema = z
  .object({
    schema_version: z.literal(LONGITUDINAL_REPLICATED_VALIDATION_SCHEMA_VERSION),
    artifact_class: z.literal(LONGITUDINAL_REPLICATED_VALIDATION_ARTIFACT_CLASS),
    generated_at: z
      .string()
      .refine(isValidRfc3339Timestamp),
    harness_version: z.literal("0.1.0"),
    python_requires: z.literal(PYTHON_REQUIRES),
    model_family: z.literal(MODEL_FAMILY),
    model_slice: z.literal(LONGITUDINAL_REPLICATED_VALIDATION_MODEL_SLICE),
    execution_mode: z.enum(["full", "canary", "smoke"]),
    execution_identity: ExecutionIdentitySchema,
    implementation_manifest: ImplementationManifestSchema,
    model_specification: ModelSpecificationSchema,
    engine_specification: EngineSpecificationSchema,
    calibration_plan: CalibrationPlanSchema,
    control_plan: ControlPlanSchema,
    chunk_manifests: z.array(ChunkManifestSchema).max(CHUNK_COUNT),
    calibration_slot_results: z
      .array(CalibrationSlotResultSchema)
      .max(REQUIRED_SLOT_COUNT),
    calibration_summary: CalibrationSummaryObjectSchema,
    control_study: ControlStudyObjectSchema,
    combined_study: CombinedStudySchema,
    validation_scope: z
      .object({
        synthetic_only: z.literal(true),
        aggregate_only: z.literal(true),
        state_space_nuts_concordance_accepted: z.literal(true),
        replicated_validation_numerical_gate_passed: z.boolean(),
        full_evidence_generation_complete: z.boolean(),
        independent_acceptance_complete: z.literal(false),
        longitudinal_proof_complete: z.literal(false),
        production_promotion_complete: z.literal(false)
      })
      .strict(),
    governance_state: z
      .object({
        state: z.enum(["HOLD", "valid_internal_validation_non_authorizing"]),
        failing_checks: z.array(NonEmptyString),
        numerical_validation_gate_passed: z.boolean(),
        independent_acceptance_required: z.literal(true),
        independent_acceptance_complete: z.literal(false),
        proof_completion_authorized: z.literal(false),
        customer_output_authorized: z.literal(false),
        probability_output_authorized: z.literal(false),
        confidence_output_authorized: z.literal(false),
        causal_claim_authorized: z.literal(false),
        promotion_decision_ref: z.null()
      })
      .strict(),
    synthetic_data_boundary: z
      .object({
        real_data_present: z.literal(false),
        customer_data_present: z.literal(false),
        production_data_present: z.literal(false),
        live_data_source_present: z.literal(false),
        raw_rows_emitted: z.literal(false),
        posterior_draws_emitted: z.literal(false),
        latent_states_emitted: z.literal(false),
        direct_identifiers_emitted: z.literal(false)
      })
      .strict(),
    hash_bindings: z
      .object({
        calibration_plan_hash: SHA256,
        control_plan_hash: SHA256,
        execution_identity_hash: SHA256,
        implementation_hash: SHA256,
        chunk_manifests_hash: SHA256,
        calibration_slot_results_hash: SHA256,
        calibration_study_result_hash: SHA256,
        control_study_result_hash: SHA256,
        combined_study_hash: SHA256,
        artifact_payload_hash: SHA256,
        artifact_self_hash: SHA256,
        hash_posture: z.literal(HASH_POSTURE)
      })
      .strict(),
    blocked_outputs: BlockedOutputsSchema,
    internal_only: z.literal(true),
    synthetic_only: z.literal(true),
    numeric_values_role: z.literal(NUMERIC_VALUES_ROLE),
    customer_output_authorized: z.literal(false),
    probability_output_authorized: z.literal(false),
    confidence_output_authorized: z.literal(false),
    roi_output_authorized: z.literal(false),
    finance_output_authorized: z.literal(false),
    causality_output_authorized: z.literal(false),
    productivity_output_authorized: z.literal(false),
    promotion_decision_ref: z.null()
  })
  .strict();

export function longitudinalReplicatedValidationPayloadHashBody(
  artifact: unknown
): unknown {
  const record = { ...(artifact as Record<string, unknown>) };
  delete record.hash_bindings;
  return record;
}

export function longitudinalReplicatedValidationPayloadHash(
  artifact: unknown
): string {
  return sha256Json(longitudinalReplicatedValidationPayloadHashBody(artifact));
}

export function longitudinalReplicatedValidationSelfHashBody(
  artifact: unknown
): unknown {
  const record = artifact as Record<string, unknown>;
  const bindings = record.hash_bindings as Record<string, unknown>;
  return {
    ...record,
    hash_bindings: { ...bindings, artifact_self_hash: "" }
  };
}

export function longitudinalReplicatedValidationSelfHash(
  artifact: unknown
): string {
  return sha256Json(longitudinalReplicatedValidationSelfHashBody(artifact));
}

export const LongitudinalReplicatedValidationArtifactSchema =
  ArtifactObjectSchema.superRefine((artifact, ctx) => {
    if (
      artifact.implementation_manifest.implementation_hash !==
        artifact.execution_identity.implementation_hash ||
      artifact.hash_bindings.implementation_hash !==
        artifact.implementation_manifest.implementation_hash
    ) {
      addIssue(ctx, ["implementation_manifest"], "implementation binding mismatch");
    }
    if (!equal(artifact.calibration_plan, COMPILED_CALIBRATION_PLAN)) {
      addIssue(ctx, ["calibration_plan"], "calibration plan mismatch");
    }
    if (!equal(artifact.control_plan, COMPILED_CONTROL_PLAN)) {
      addIssue(ctx, ["control_plan"], "control plan mismatch");
    }
    if (artifact.execution_identity.identity_hash !== artifact.hash_bindings.execution_identity_hash) {
      addIssue(ctx, ["hash_bindings", "execution_identity_hash"], "identity binding mismatch");
    }
    if (artifact.execution_identity.identity_hash !== artifact.control_study.execution_identity.identity_hash ||
        !equal(artifact.execution_identity, artifact.control_study.execution_identity)) {
      addIssue(ctx, ["control_study", "execution_identity"], "control and artifact identities differ");
    }

    for (const [index, result] of artifact.calibration_slot_results.entries()) {
      if (result.execution_identity_hash !== artifact.execution_identity.identity_hash) {
        addIssue(ctx, ["calibration_slot_results", index, "execution_identity_hash"], "row identity mismatch");
      }
      if (result.execution_mode !== artifact.execution_mode) {
        addIssue(ctx, ["calibration_slot_results", index, "execution_mode"], "row mode mismatch");
      }
    }

    const expectedCalibration = deriveCalibrationSummary(
      artifact.calibration_slot_results,
      artifact.execution_mode
    );
    const expectedCalibrationHash = sha256Json(expectedCalibration);
    if (!equal(
      artifact.calibration_summary,
      { ...expectedCalibration, study_result_hash: expectedCalibrationHash }
    )) {
      addIssue(ctx, ["calibration_summary"], "calibration summary must be independently derived");
    }

    const expectedControl = deriveControlStudy(artifact.control_study, ctx);
    const expectedControlHash = sha256Json(expectedControl);
    if (!equal(
      artifact.control_study,
      { ...expectedControl, study_result_hash: expectedControlHash }
    )) {
      addIssue(ctx, ["control_study"], "control study must be independently derived");
    }

    const rowsById = new Map<string, CalibrationSlotResult[]>();
    for (const result of artifact.calibration_slot_results) {
      rowsById.set(result.slot_id, [...(rowsById.get(result.slot_id) ?? []), result]);
    }
    const expectedChunkIndexes = artifact.chunk_manifests.map((manifest) => manifest.chunk_index);
    const uniqueChunkIndexes = new Set(expectedChunkIndexes);
    if (uniqueChunkIndexes.size !== expectedChunkIndexes.length ||
        !equal(expectedChunkIndexes, [...expectedChunkIndexes].sort((a, b) => a - b))) {
      addIssue(ctx, ["chunk_manifests"], "chunk manifests must be unique and ordered");
    }
    for (const [manifestIndex, manifest] of artifact.chunk_manifests.entries()) {
      const plan = COMPILED_CHUNKS[manifest.chunk_index];
      const chunkRows = plan.slot_ids.flatMap((slotId) => rowsById.get(slotId) ?? []);
      if (chunkRows.length !== SLOTS_PER_CHUNK ||
          plan.slot_ids.some((slotId) => (rowsById.get(slotId) ?? []).length !== 1)) {
        addIssue(ctx, ["chunk_manifests", manifestIndex], "chunk does not bind its exact 60 rows");
        continue;
      }
      const chunkBody = {
        report_class: "longitudinal_replicated_validation_chunk_v1",
        plan_version: PLAN_VERSION,
        plan_hash: artifact.execution_identity.plan_hash,
        chunk_index: manifest.chunk_index,
        chunk_id: plan.chunk_id,
        execution_mode: manifest.execution_mode,
        expected_slot_count: SLOTS_PER_CHUNK,
        slot_ids: plan.slot_ids,
        slot_result_hashes: chunkRows.map((row) => row.result_hash),
        execution_identity: artifact.execution_identity,
        internal_only: true,
        synthetic_only: true,
        customer_output_authorized: false
      };
      const expectedManifest = {
        chunk_index: manifest.chunk_index,
        chunk_id: plan.chunk_id,
        execution_mode: manifest.execution_mode,
        slot_count: SLOTS_PER_CHUNK,
        slot_result_hashes_hash: sha256Json(chunkRows.map((row) => row.result_hash)),
        execution_identity_hash: artifact.execution_identity.identity_hash,
        chunk_hash: sha256Json(chunkBody)
      };
      if (!equal(manifest, expectedManifest) || manifest.execution_mode !== artifact.execution_mode) {
        addIssue(ctx, ["chunk_manifests", manifestIndex], "chunk manifest must be derived");
      }
    }
    const chunkManifestComplete =
      artifact.execution_mode === "full" &&
      equal(expectedChunkIndexes, Array.from({ length: CHUNK_COUNT }, (_, index) => index)) &&
      artifact.chunk_manifests.every((manifest) => manifest.execution_mode === "full");

    const combinedFailures: string[] = [];
    if (!artifact.execution_identity.source_tree_clean) {
      combinedFailures.push("source_tree_not_clean");
    }
    if (!chunkManifestComplete) combinedFailures.push("chunk_manifest_incomplete");
    combinedFailures.push(
      ...expectedCalibration.failing_checks.map((failure) => `calibration:${failure}`),
      ...expectedControl.failing_checks.map((failure) => `controls:${failure}`)
    );
    const failures = [...new Set(combinedFailures)];
    const numericalPass =
      artifact.execution_mode === "full" &&
      artifact.execution_identity.source_tree_clean &&
      chunkManifestComplete &&
      expectedCalibration.study_status === "PASS" &&
      expectedControl.study_status === "PASS";
    const fullEvidenceGenerationComplete =
      artifact.execution_mode === "full" &&
      artifact.execution_identity.source_tree_clean &&
      chunkManifestComplete &&
      expectedCalibration.exact_manifest_complete &&
      expectedControl.exact_manifest_complete;
    const combinedBody = {
      execution_mode: artifact.execution_mode,
      execution_identity_hash: artifact.execution_identity.identity_hash,
      calibration_study_result_hash: expectedCalibrationHash,
      control_study_result_hash: expectedControlHash,
      chunk_manifest_hashes: artifact.chunk_manifests.map((manifest) => manifest.chunk_hash),
      calibration_result_hashes_hash: sha256Json(
        artifact.calibration_slot_results.map((result) => result.result_hash)
      ),
      numerical_validation_gate_passed: numericalPass,
      failing_checks: failures
    };
    const expectedCombined = {
      ...combinedBody,
      combined_study_hash: sha256Json(combinedBody)
    };
    if (!equal(artifact.combined_study, expectedCombined)) {
      addIssue(ctx, ["combined_study"], "combined study must be independently derived");
    }

    const expectedState = numericalPass
      ? "valid_internal_validation_non_authorizing"
      : "HOLD";
    const governanceChecks: Array<[string, unknown, unknown]> = [
      ["state", artifact.governance_state.state, expectedState],
      ["failing_checks", artifact.governance_state.failing_checks, failures],
      ["numerical_validation_gate_passed", artifact.governance_state.numerical_validation_gate_passed, numericalPass],
      ["replicated_validation_numerical_gate_passed", artifact.validation_scope.replicated_validation_numerical_gate_passed, numericalPass],
      [
        "full_evidence_generation_complete",
        artifact.validation_scope.full_evidence_generation_complete,
        fullEvidenceGenerationComplete
      ]
    ];
    for (const [key, actual, expected] of governanceChecks) {
      if (!equal(actual, expected)) {
        addIssue(ctx, [key in artifact.governance_state ? "governance_state" : "validation_scope", key], `${key} must be derived`);
      }
    }

    const bindingChecks: Array<[string, unknown, unknown]> = [
      ["calibration_plan_hash", artifact.hash_bindings.calibration_plan_hash, COMPILED_CALIBRATION_PLAN.plan_hash],
      ["control_plan_hash", artifact.hash_bindings.control_plan_hash, COMPILED_CONTROL_PLAN.plan_hash],
      ["chunk_manifests_hash", artifact.hash_bindings.chunk_manifests_hash, sha256Json(artifact.chunk_manifests)],
      ["calibration_slot_results_hash", artifact.hash_bindings.calibration_slot_results_hash, sha256Json(artifact.calibration_slot_results)],
      ["calibration_study_result_hash", artifact.hash_bindings.calibration_study_result_hash, expectedCalibrationHash],
      ["control_study_result_hash", artifact.hash_bindings.control_study_result_hash, expectedControlHash],
      ["combined_study_hash", artifact.hash_bindings.combined_study_hash, expectedCombined.combined_study_hash]
    ];
    for (const [key, actual, expected] of bindingChecks) {
      if (!equal(actual, expected)) {
        addIssue(ctx, ["hash_bindings", key], `${key} mismatch`);
      }
    }
    if (
      artifact.hash_bindings.artifact_payload_hash !==
      longitudinalReplicatedValidationPayloadHash(artifact)
    ) {
      addIssue(ctx, ["hash_bindings", "artifact_payload_hash"], "payload hash mismatch");
    }
    if (
      artifact.hash_bindings.artifact_self_hash !==
      longitudinalReplicatedValidationSelfHash(artifact)
    ) {
      addIssue(ctx, ["hash_bindings", "artifact_self_hash"], "self hash mismatch");
    }
  });

export type LongitudinalReplicatedValidationArtifact = z.infer<
  typeof LongitudinalReplicatedValidationArtifactSchema
>;
