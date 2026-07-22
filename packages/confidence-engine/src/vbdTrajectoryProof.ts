import { z } from "zod";
import { sha256Json, stableStringify } from "./internal/hashing";

export const VBD_TRAJECTORY_PROOF_SCHEMA_VERSION =
  "FT_AI_VALUE_VBD_TRAJECTORY_PROOF_2026_07_V1";
export const VBD_TRAJECTORY_PROOF_ARTIFACT_CLASS =
  "internal_synthetic_vbd_trajectory_validation";
export const VBD_TRAJECTORY_PROOF_MODEL_SLICE =
  "vbd_trajectory_synthetic_validation";

const MODEL_FAMILY =
  "bayesian_ai_value_realization_and_human_transformation_model_family";
const MODEL_COMPONENT = "bayesian_vbd_behavioral_trajectory_model";
const PRIMARY_ENGINE = "deterministic_gaussian_state_space_integration";
const HASH_POSTURE =
  "consistency_and_drift_detection_not_coordinated_replacement_authenticity";
const PYTHON_REQUIRES = ">=3.13,<3.14";
const REQUIREMENTS_LOCK_HASH =
  "2a7ef1c0266a89ba1c4bbb9d2b40ecfa804325e2f5705bcb3b7d976ca7e92801";
const SMOKE_PLAN_REF = "plan:vbd-trajectory-development-smoke-v1";
const LANES = ["frequency", "engagement", "breadth"] as const;
const PROHIBITED_COMPOSITES = [
  "velocity_index",
  "frequency_index",
  "engagement_index",
  "breadth_index",
  "overall_vbd_score",
  "integration_score",
  "vbd_quadrant"
] as const;
const SMOKE_FAILURES = ["smoke_mode_nonacceptance", "incomplete_evidence"] as const;

const MODEL_MANIFEST = {
  model_family: MODEL_FAMILY,
  model_component: MODEL_COMPONENT,
  equation: "x_star=alpha+u+beta*tau+r+known_se_error",
  priors: {
    alpha: "Normal(0,1)",
    beta: "Normal(0,1)",
    sigma_u: "HalfNormal(1)",
    sigma_r: "HalfNormal(1)",
    rho: "Uniform(-0.95,0.95)"
  },
  estimand: {
    id: "fixed_interval_smoothed_terminal_movement_v1",
    pre_window_indexes: Array.from({ length: 12 }, (_, index) => index),
    evaluation_window_indexes: [15, 16, 17],
    panel_and_window_weighting: "equal",
    direction_adjusted: true,
    forecast: false
  },
  deterministic_engine: {
    engine_id: PRIMARY_ENGINE,
    outer_sequence: "unscrambled_sobol_v1",
    outer_point_count: 8192,
    proposal: "student_t_df_5_v1",
    proposal_scale: 1.5,
    minimum_finite_point_count: 4096,
    minimum_retained_weight_count: 4096,
    minimum_effective_sample_size: 256,
    maximum_normalized_weight: 0.05,
    weight_retention_algorithm:
      "binary64_representable_normalized_weight_retention_v1",
    ordinal_commitment_algorithm: "vbd_outer_weight_ordinals_v1",
    conditional_mixture_quantile: "conditional_normal_mixture_quantile_v2",
    conditional_mixture_bisection_iterations: 64,
    normal_cdf: "scipy.special.ndtr",
    normal_quantile: "scipy.special.ndtri",
    original_sobol_ordinal_retained: true,
    original_sobol_ordinal_identity_preserved: true,
    random_numbers_used: false
  },
  reference_engine: {
    engine_id: "pymc_nuts_state_space_reference",
    sampler: "pymc",
    chains: 4,
    draws: 20000,
    tune: 5000,
    target_accept: 0.999,
    max_treedepth: 15,
    init: "jitter+adapt_full",
    cores: 1,
    blas_cores: 1,
    trajectory_movement: "conditional_normal_smoothed_contrast_v1",
    explicit_chain_seeds: true
  },
  posterior_statistics: {
    weighted_quantile: "weighted_quantile_v1",
    interval_80_probabilities: [0.1, 0.9],
    interval_99_probabilities: [0.005, 0.995]
  },
  evidence_numeric_canonicalization: {
    algorithm_id: "python_binary64_format_13_significant_digits_v1",
    significant_decimal_digits: 13,
    rendering: "python_general_format",
    negative_zero: "normalized_to_positive_zero",
    admitted_representation: "exact_native_python_float",
    rejected_equal_value_representations: [
      "boolean",
      "integer",
      "float_subclass",
      "negative_zero"
    ],
    scope: "aggregate_evidence_values_only",
    applies_before_evidence_hashing_and_preparation: true,
    canonical_values_are_model_inputs: true,
    post_admission_model_rounding: false,
    canonical_hashes_exclude_raw_float_intermediates: true
  },
  posterior_predictive_check: {
    manifest_id: "vbd_trajectory_ppc_v1",
    rng: "numpy.random.PCG64DXSM",
    state_generation: "conditional_smoothed_ar1_path_v1",
    replicate_count: 4000,
    draw_selector: "per_chain_zero_based_20*j+10_for_j_0_through_999",
    selection_order: "chain_major_then_increasing_draw_index",
    tail: "upper_inclusive",
    statistics: [
      "pre_post_mean_movement",
      "between_panel_group_variance",
      "within_panel_group_variance",
      "tail_or_extreme_aggregate_statistic",
      "lag_one_within_group_autocorrelation"
    ]
  },
  diagnostic_gates: {
    r_hat_max: 1.01,
    bulk_ess_min: 400,
    tail_ess_min: 400,
    post_warmup_divergences_max: 0,
    max_treedepth_saturation_count_max: 0,
    energy_bfmi_min: 0.3,
    max_mcse_to_posterior_sd_ratio: 0.1,
    ppc_value_range_inclusive: [0.05, 0.95]
  },
  depth_used_in_likelihood: false,
  additional_observation_scale: false
};

const SHA256 = z.string().regex(/^[0-9a-f]{64}$/);
const Finite = z.number().refine(Number.isFinite, "number must be finite");
const PositiveFinite = Finite.refine((value) => value > 0, "number must be positive");
const EffectiveSampleSize = Finite.refine(
  (value) => value >= 256,
  "effective sample size is below the compiled minimum"
);
const NormalizedWeight = Finite.refine(
  (value) => value > 0 && value <= 0.05,
  "normalized weight is outside the compiled range"
);
const HessianConditionNumber = Finite.refine(
  (value) => value >= 1,
  "Hessian condition number must be at least one"
);
const LaneSchema = z.enum(LANES);
const timestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const timestampComponentsPattern =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-](\d{2}):(\d{2}))$/;

function isStrictRfc3339Timestamp(value: string): boolean {
  const match = timestampComponentsPattern.exec(value);
  if (!match) return false;
  const [year, month, day, hour, minute, second, offsetHour, offsetMinute] =
    match.slice(1).map((part) => Number(part ?? 0));
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthDays = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return (
    year >= 1 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= monthDays[month - 1] &&
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

function addIssue(
  ctx: z.RefinementCtx,
  path: (string | number)[],
  message: string
): void {
  ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
}

const ExactModelManifestSchema = z.unknown().refine(
  (value) => equal(value, MODEL_MANIFEST),
  "model manifest must equal the compiled VBD trajectory manifest"
);

const DepthContextSchema = z
  .object({
    status: z.enum(["available", "unavailable"]),
    context_ref: z.enum([
      "depth-context:a",
      "depth-context:b",
      "depth-context:unavailable"
    ]),
    context_root: SHA256,
    definition_ref: z.literal("definition:depth-context-v1"),
    source_ref: z.literal("source:vbd-synthetic-depth-context"),
    source_hash: SHA256,
    aggregate_review_state: z.enum(["reviewed", "unavailable"]),
    suppression_posture: z.enum(["available", "unavailable"]),
    caveat_refs: z.tuple([z.literal("caveat:depth-context-only")]),
    numeric_value_present: z.literal(false),
    used_in_likelihood: z.literal(false),
    used_in_estimand: z.literal(false),
    used_in_eligibility: z.literal(false)
  })
  .strict()
  .superRefine((value, ctx) => {
    const unavailable = value.context_ref === "depth-context:unavailable";
    const expectedStatus = unavailable ? "unavailable" : "available";
    const expectedReview = unavailable ? "unavailable" : "reviewed";
    if (value.status !== expectedStatus) {
      addIssue(ctx, ["status"], "Depth availability must be derived from its ref");
    }
    if (value.aggregate_review_state !== expectedReview) {
      addIssue(ctx, ["aggregate_review_state"], "Depth review state must be derived");
    }
    if (value.suppression_posture !== expectedStatus) {
      addIssue(ctx, ["suppression_posture"], "Depth suppression posture must be derived");
    }
    const expectedSourceHash = sha256Json({
      context_ref: value.context_ref,
      synthetic: true
    });
    if (value.source_hash !== expectedSourceHash) {
      addIssue(ctx, ["source_hash"], "Depth source hash must be derived");
    }
    const expectedRoot = sha256Json({
      context_ref: value.context_ref,
      definition_ref: value.definition_ref,
      source_ref: value.source_ref,
      source_hash: expectedSourceHash,
      aggregate_review_state: expectedReview,
      suppression_posture: expectedStatus,
      caveat_refs: ["caveat:depth-context-only"],
      used_in_likelihood: false,
      used_in_eligibility: false
    });
    if (value.context_root !== expectedRoot) {
      addIssue(ctx, ["context_root"], "Depth context root must be derived");
    }
  });

const InputManifestSchema = z
  .object({
    accepted_input_kind: z.literal("three_primitive_aggregate_trajectories"),
    active_lanes: z.tuple([
      z.literal("frequency"),
      z.literal("engagement"),
      z.literal("breadth")
    ]),
    lane_bindings: z.tuple([
      z
        .object({
          lane: z.literal("frequency"),
          event_name: z.literal("USER_FREQUENCY_OBSERVED"),
          statistic_name: z.literal("distribution.p50"),
          transform_id: z.literal("log1p_p50_v1")
        })
        .strict(),
      z
        .object({
          lane: z.literal("engagement"),
          event_name: z.literal("USER_ENGAGEMENT_OBSERVED"),
          statistic_name: z.literal("distribution.p50"),
          transform_id: z.literal("asin_sqrt_proportion_p50_v1")
        })
        .strict(),
      z
        .object({
          lane: z.literal("breadth"),
          event_name: z.literal("USER_BREADTH_OBSERVED"),
          statistic_name: z.literal("distribution.p50"),
          transform_id: z.literal("asin_sqrt_proportion_p50_v1")
        })
        .strict()
    ]),
    canonical_velocity_estimated: z.literal(false),
    composite_input_present: z.literal(false),
    prohibited_composite_inputs: z.tuple(
      PROHIBITED_COMPOSITES.map((value) => z.literal(value)) as [
        z.ZodLiteral<"velocity_index">,
        z.ZodLiteral<"frequency_index">,
        z.ZodLiteral<"engagement_index">,
        z.ZodLiteral<"breadth_index">,
        z.ZodLiteral<"overall_vbd_score">,
        z.ZodLiteral<"integration_score">,
        z.ZodLiteral<"vbd_quadrant">
      ]
    ),
    panel_group_count: z.literal(6),
    aggregate_k: z.literal(16),
    pre_window_count: z.literal(12),
    post_window_count: z.literal(6),
    direction_vector: z.tuple([z.literal(1), z.literal(1), z.literal(1)]),
    direction_vector_root: SHA256,
    ordered_panel_manifest_root: SHA256,
    cohort_partition_root: SHA256,
    study_plan_root: SHA256,
    seed_manifest_root: SHA256,
    model_manifest: ExactModelManifestSchema,
    model_manifest_root: SHA256,
    depth_context: DepthContextSchema
  })
  .strict();

const MovementSummarySchema = z
  .object({
    quantity_name: z.literal("trajectory_movement"),
    posterior_mean: Finite,
    posterior_sd: PositiveFinite,
    credible_interval_80: z.object({ lower: Finite, upper: Finite }).strict(),
    credible_interval_99: z.object({ lower: Finite, upper: Finite }).strict()
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      !(
        value.credible_interval_99.lower <= value.credible_interval_80.lower &&
        value.credible_interval_80.lower <= value.credible_interval_80.upper &&
        value.credible_interval_80.upper <= value.credible_interval_99.upper
      )
    ) {
      addIssue(ctx, ["credible_interval_80"], "movement intervals must be ordered and nested");
    }
  });

const IntegrationDiagnosticsSchema = z
  .object({
    status: z.literal("PASS"),
    point_count: z.literal(8192),
    finite_point_count: z.number().int().min(4096).max(8192),
    compiled_min_finite_point_count: z.literal(4096),
    generated_point_count: z.literal(8192),
    finite_log_weight_count: z.number().int().min(4096).max(8192),
    retained_weight_count: z.number().int().min(4096).max(8192),
    compiled_min_retained_weight_count: z.literal(4096),
    retained_sobol_ordinal_commitment: SHA256,
    excluded_sobol_ordinal_commitment: SHA256,
    outer_weight_retention_hash: SHA256,
    effective_sample_size: EffectiveSampleSize,
    compiled_min_effective_sample_size: z.literal(256),
    compiled_ess_count_rounding_allowance: z.literal(1e-9),
    max_normalized_weight: NormalizedWeight,
    compiled_max_normalized_weight: z.literal(0.05),
    mode_transformed: z.tuple([Finite, Finite, Finite]),
    negative_log_posterior_at_mode: Finite,
    hessian_condition_number: HessianConditionNumber,
    minimum_conditional_movement_variance: PositiveFinite,
    maximum_conditional_movement_variance: PositiveFinite,
    outer_integration: z
      .object({
        sequence: z.literal("unscrambled_sobol_v1"),
        proposal: z.literal("student_t_df_5_v1"),
        original_sobol_ordinal_retained: z.literal(true),
        original_sobol_ordinal_identity_preserved: z.literal(true),
        weight_retention_algorithm: z.literal(
          "binary64_representable_normalized_weight_retention_v1"
        ),
        ordinal_commitment_algorithm: z.literal(
          "vbd_outer_weight_ordinals_v1"
        )
      })
      .strict(),
    conditional_movement_mixture: z
      .object({
        algorithm: z.literal("conditional_normal_mixture_quantile_v2"),
        component_count: z.number().int().positive(),
        bisection_iterations: z.literal(64),
        normal_cdf: z.literal("scipy.special.ndtr"),
        normal_quantile: z.literal("scipy.special.ndtri")
      })
      .strict(),
    random_numbers_used: z.literal(false),
    latent_paths_emitted: z.literal(false),
    posterior_support_emitted: z.literal(false)
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.point_count !== value.generated_point_count) {
      addIssue(ctx, ["point_count"], "legacy point count alias drifted");
    }
    if (value.finite_point_count !== value.retained_weight_count) {
      addIssue(ctx, ["finite_point_count"], "legacy finite count alias drifted");
    }
    if (
      value.retained_sobol_ordinal_commitment ===
      value.excluded_sobol_ordinal_commitment
    ) {
      addIssue(ctx, ["excluded_sobol_ordinal_commitment"], "ordinal commitments must be distinct");
    }
    if (value.retained_weight_count > value.finite_log_weight_count) {
      addIssue(ctx, ["retained_weight_count"], "retained count cannot exceed finite log-weight count");
    }
    if (value.effective_sample_size > value.retained_weight_count + 1e-9) {
      addIssue(ctx, ["effective_sample_size"], "ESS cannot exceed retained support count");
    }
    if (
      value.maximum_conditional_movement_variance <
      value.minimum_conditional_movement_variance
    ) {
      addIssue(ctx, ["maximum_conditional_movement_variance"], "movement variance bounds reversed");
    }
    if (
      value.conditional_movement_mixture.component_count !==
      value.retained_weight_count
    ) {
      addIssue(ctx, ["conditional_movement_mixture", "component_count"], "component count must be derived");
    }
    const expectedRetentionHash = sha256Json({
      algorithm: "binary64_representable_normalized_weight_retention_v1",
      excluded_sobol_ordinal_commitment:
        value.excluded_sobol_ordinal_commitment,
      finite_log_weight_count: value.finite_log_weight_count,
      generated_point_count: value.generated_point_count,
      retained_sobol_ordinal_commitment:
        value.retained_sobol_ordinal_commitment,
      retained_weight_count: value.retained_weight_count
    });
    if (value.outer_weight_retention_hash !== expectedRetentionHash) {
      addIssue(ctx, ["outer_weight_retention_hash"], "outer weight retention hash mismatch");
    }
  });

const DeterministicFitSchema = z
  .object({
    lane: LaneSchema,
    prepared_input_hash: SHA256,
    model_input_hash: SHA256,
    engine_kind: z.literal(PRIMARY_ENGINE),
    movement_summary: MovementSummarySchema,
    integration_diagnostics: IntegrationDiagnosticsSchema,
    latent_paths_emitted: z.literal(false),
    posterior_support_emitted: z.literal(false),
    fit_summary_hash: SHA256
  })
  .strict();

const SourceBindingsSchema = z
  .object({
    ordered_panel_manifest_root: SHA256,
    cohort_partition_root: SHA256,
    study_plan_root: SHA256,
    seed_manifest_root: SHA256,
    lane_observation_root: SHA256,
    joint_uncertainty_roots_hash: SHA256,
    transform_root: SHA256,
    model_manifest_root: SHA256,
    context_binding_hash: SHA256
  })
  .strict();

function laneRecordSchema(lane: (typeof LANES)[number]) {
  return z
    .object({
      lane: z.literal(lane),
      panel_group_count: z.literal(6),
      aggregate_k: z.literal(16),
      series_evidence_eligible: z.literal(true),
      source_bindings: SourceBindingsSchema,
      prepared_input_hash: SHA256,
      model_input_hash: SHA256,
      deterministic_fit: DeterministicFitSchema,
      reference_fit_state: z.literal("NOT_RUN"),
      reference_fit_summary_hash: z.null()
    })
    .strict();
}

const LaneRecordsSchema = z.tuple([
  laneRecordSchema("frequency"),
  laneRecordSchema("engagement"),
  laneRecordSchema("breadth")
]);

const EvidenceStatusSchema = z
  .object({
    state: z.literal("HOLD"),
    failing_checks: z.tuple([
      z.literal("smoke_mode_nonacceptance"),
      z.literal("incomplete_evidence")
    ]),
    deterministic_lane_fit_count: z.literal(3),
    all_deterministic_lane_fits_present: z.literal(true),
    reference_engine_execution_state: z.literal("NOT_RUN"),
    concordance_bundle_count: z.literal(0),
    canary_receipt_count: z.literal(0),
    non_nuts_original_case_count: z.literal(0),
    non_nuts_recomputation_case_count: z.literal(0),
    floor_control_count: z.literal(0),
    negative_control_count: z.literal(0),
    exact_full_evidence_complete: z.literal(false)
  })
  .strict();

const GovernanceStateSchema = z
  .object({
    state: z.literal("HOLD"),
    failing_checks: z.tuple([
      z.literal("smoke_mode_nonacceptance"),
      z.literal("incomplete_evidence")
    ]),
    summary_only: z.literal(true),
    synthetic_only: z.literal(true),
    aggregate_only: z.literal(true),
    noncausal: z.literal(true),
    independent_acceptance_required: z.literal(true),
    independent_acceptance_complete: z.literal(false),
    task_5_6_complete: z.literal(false),
    promotion_complete: z.literal(false),
    acceptance_execution_authorized: z.literal(false),
    downstream_outcome_integration_authorized: z.literal(false)
  })
  .strict();

const SyntheticBoundarySchema = z
  .object({
    real_data_present: z.literal(false),
    customer_data_present: z.literal(false),
    production_data_present: z.literal(false),
    live_data_source_present: z.literal(false),
    respondent_rows_present: z.literal(false),
    person_level_fields_present: z.literal(false),
    raw_event_rows_emitted: z.literal(false),
    input_arrays_emitted: z.literal(false),
    posterior_draws_emitted: z.literal(false),
    latent_paths_emitted: z.literal(false),
    posterior_support_emitted: z.literal(false),
    posterior_predictive_replicates_emitted: z.literal(false)
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
    ai_impact_claim_authorized: z.literal(false),
    ranking_authorized: z.literal(false),
    outcome_model_integration_authorized: z.literal(false),
    creates_route: z.literal(false),
    creates_ui: z.literal(false),
    writes_persistence: z.literal(false),
    creates_export: z.literal(false),
    renders_readout: z.literal(false),
    executes_connector: z.literal(false)
  })
  .strict();

const HashBindingsSchema = z
  .object({
    input_manifest_hash: SHA256,
    model_manifest_root: SHA256,
    ordered_panel_manifest_root: SHA256,
    cohort_partition_root: SHA256,
    study_plan_root: SHA256,
    seed_manifest_root: SHA256,
    lane_records_hash: SHA256,
    lane_observation_roots_hash: SHA256,
    prepared_input_hashes_hash: SHA256,
    fit_summary_hashes_hash: SHA256,
    diagnostics_hashes_hash: SHA256,
    artifact_payload_hash: SHA256,
    artifact_self_hash: SHA256,
    hash_posture: z.literal(HASH_POSTURE)
  })
  .strict();

const ArtifactObjectSchema = z
  .object({
    schema_version: z.literal(VBD_TRAJECTORY_PROOF_SCHEMA_VERSION),
    artifact_class: z.literal(VBD_TRAJECTORY_PROOF_ARTIFACT_CLASS),
    generated_at: z
      .string()
      .regex(timestampPattern)
      .refine(isStrictRfc3339Timestamp),
    harness_version: z.literal("0.1.0"),
    python_requires: z.literal(PYTHON_REQUIRES),
    lockfile_hash: z.literal(REQUIREMENTS_LOCK_HASH),
    generation_runtime: z
      .object({
        python: z.string().regex(/^3\.13\.\d+$/),
        pymc: z.literal("6.0.1"),
        arviz: z.literal("1.2.0"),
        numpy: z.literal("2.4.6"),
        scipy: z.literal("1.18.0")
      })
      .strict(),
    model_family: z.literal(MODEL_FAMILY),
    model_component: z.literal(MODEL_COMPONENT),
    model_slice: z.literal(VBD_TRAJECTORY_PROOF_MODEL_SLICE),
    execution_mode: z.literal("development_smoke"),
    input_manifest: InputManifestSchema,
    lane_records: LaneRecordsSchema,
    evidence_status: EvidenceStatusSchema,
    governance_state: GovernanceStateSchema,
    synthetic_data_boundary: SyntheticBoundarySchema,
    blocked_outputs: BlockedOutputsSchema,
    hash_bindings: HashBindingsSchema,
    internal_only: z.literal(true),
    synthetic_only: z.literal(true),
    aggregate_only: z.literal(true),
    numeric_values_role: z.literal("internal_validation_evidence_not_customer_output"),
    customer_output_authorized: z.literal(false),
    probability_output_authorized: z.literal(false),
    confidence_output_authorized: z.literal(false),
    roi_output_authorized: z.literal(false),
    finance_output_authorized: z.literal(false),
    causality_output_authorized: z.literal(false),
    productivity_output_authorized: z.literal(false),
    ai_impact_claim_authorized: z.literal(false),
    promotion_decision_ref: z.null()
  })
  .strict();

export function vbdTrajectoryProofPayloadHashBody(artifact: unknown): unknown {
  const record = { ...(artifact as Record<string, unknown>) };
  delete record.hash_bindings;
  return record;
}

export function vbdTrajectoryProofPayloadHash(artifact: unknown): string {
  return sha256Json(vbdTrajectoryProofPayloadHashBody(artifact));
}

export function vbdTrajectoryProofSelfHashBody(artifact: unknown): unknown {
  const record = artifact as Record<string, unknown>;
  const bindings = record.hash_bindings as Record<string, unknown>;
  return {
    ...record,
    hash_bindings: { ...bindings, artifact_self_hash: "" }
  };
}

export function vbdTrajectoryProofSelfHash(artifact: unknown): string {
  return sha256Json(vbdTrajectoryProofSelfHashBody(artifact));
}

export const VbdTrajectoryProofArtifactSchema = ArtifactObjectSchema.superRefine(
  (artifact, ctx) => {
    const expectedDirectionVectorRoot = sha256Json({
      lane_order: [...LANES],
      direction_vector: [...artifact.input_manifest.direction_vector],
      plan_ref: SMOKE_PLAN_REF
    });
    if (artifact.input_manifest.direction_vector_root !== expectedDirectionVectorRoot) {
      addIssue(
        ctx,
        ["input_manifest", "direction_vector_root"],
        "direction vector root must bind the canonical lanes, vector, and smoke plan"
      );
    }
    const manifestRoot = sha256Json(artifact.input_manifest.model_manifest);
    if (artifact.input_manifest.model_manifest_root !== manifestRoot) {
      addIssue(ctx, ["input_manifest", "model_manifest_root"], "model manifest root mismatch");
    }
    if (artifact.hash_bindings.model_manifest_root !== manifestRoot) {
      addIssue(ctx, ["hash_bindings", "model_manifest_root"], "model manifest binding mismatch");
    }
    const sharedRootChecks: Array<[string, string, string]> = [
      ["ordered_panel_manifest_root", artifact.input_manifest.ordered_panel_manifest_root, artifact.hash_bindings.ordered_panel_manifest_root],
      ["cohort_partition_root", artifact.input_manifest.cohort_partition_root, artifact.hash_bindings.cohort_partition_root],
      ["study_plan_root", artifact.input_manifest.study_plan_root, artifact.hash_bindings.study_plan_root],
      ["seed_manifest_root", artifact.input_manifest.seed_manifest_root, artifact.hash_bindings.seed_manifest_root]
    ];
    for (const [name, inputValue, bindingValue] of sharedRootChecks) {
      if (inputValue !== bindingValue) {
        addIssue(ctx, ["hash_bindings", name], `${name} binding mismatch`);
      }
    }

    for (const [index, record] of artifact.lane_records.entries()) {
      const expectedLane = LANES[index];
      if (record.lane !== expectedLane || record.deterministic_fit.lane !== expectedLane) {
        addIssue(ctx, ["lane_records", index, "lane"], "lane identities must remain aligned");
      }
      if (
        record.prepared_input_hash !== record.deterministic_fit.prepared_input_hash ||
        record.model_input_hash !== record.deterministic_fit.model_input_hash
      ) {
        addIssue(ctx, ["lane_records", index], "fit and prepared hashes must align");
      }
      const source = record.source_bindings;
      const sharedSources: Array<[string, string]> = [
        ["ordered_panel_manifest_root", artifact.input_manifest.ordered_panel_manifest_root],
        ["cohort_partition_root", artifact.input_manifest.cohort_partition_root],
        ["study_plan_root", artifact.input_manifest.study_plan_root],
        ["seed_manifest_root", artifact.input_manifest.seed_manifest_root],
        ["model_manifest_root", manifestRoot]
      ];
      for (const [name, expected] of sharedSources) {
        if (source[name as keyof typeof source] !== expected) {
          addIssue(ctx, ["lane_records", index, "source_bindings", name], `${name} must match the input manifest`);
        }
      }
      const expectedContextBindingHash = sha256Json({
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
      if (source.context_binding_hash !== expectedContextBindingHash) {
        addIssue(
          ctx,
          ["lane_records", index, "source_bindings", "context_binding_hash"],
          "context binding hash must be derived from emitted source roots"
        );
      }
      const expectedPreparedInputHash = sha256Json({
        model_input_hash: record.model_input_hash,
        context_binding_hash: expectedContextBindingHash
      });
      if (record.prepared_input_hash !== expectedPreparedInputHash) {
        addIssue(
          ctx,
          ["lane_records", index, "prepared_input_hash"],
          "prepared input hash must bind model input and emitted source context"
        );
      }
      const { fit_summary_hash: _fitHash, ...fitBody } = record.deterministic_fit;
      if (record.deterministic_fit.fit_summary_hash !== sha256Json(fitBody)) {
        addIssue(ctx, ["lane_records", index, "deterministic_fit", "fit_summary_hash"], "fit summary hash mismatch");
      }
    }

    const uniqueFields: Array<[string, string[]]> = [
      ["prepared_input_hash", artifact.lane_records.map((value) => value.prepared_input_hash)],
      ["model_input_hash", artifact.lane_records.map((value) => value.model_input_hash)],
      ["lane_observation_root", artifact.lane_records.map((value) => value.source_bindings.lane_observation_root)],
      ["transform_root", artifact.lane_records.map((value) => value.source_bindings.transform_root)]
    ];
    for (const [name, values] of uniqueFields) {
      if (new Set(values).size !== LANES.length) {
        addIssue(ctx, ["lane_records"], `${name} must be unique per lane`);
      }
    }
    if (
      new Set(
        artifact.lane_records.map(
          (value) => value.source_bindings.joint_uncertainty_roots_hash
        )
      ).size !== 1
    ) {
      addIssue(
        ctx,
        ["lane_records"],
        "joint_uncertainty_roots_hash must be shared across all lanes"
      );
    }

    const expectedBindings: Record<string, string> = {
      input_manifest_hash: sha256Json(artifact.input_manifest),
      lane_records_hash: sha256Json(artifact.lane_records),
      lane_observation_roots_hash: sha256Json(
        artifact.lane_records.map((record) => ({
          lane: record.lane,
          root: record.source_bindings.lane_observation_root
        }))
      ),
      prepared_input_hashes_hash: sha256Json(
        artifact.lane_records.map((record) => record.prepared_input_hash)
      ),
      fit_summary_hashes_hash: sha256Json(
        artifact.lane_records.map((record) => record.deterministic_fit.fit_summary_hash)
      ),
      diagnostics_hashes_hash: sha256Json(
        artifact.lane_records.map((record) =>
          sha256Json(record.deterministic_fit.integration_diagnostics)
        )
      ),
      artifact_payload_hash: vbdTrajectoryProofPayloadHash(artifact),
      artifact_self_hash: vbdTrajectoryProofSelfHash(artifact)
    };
    for (const [name, expected] of Object.entries(expectedBindings)) {
      if (artifact.hash_bindings[name as keyof typeof artifact.hash_bindings] !== expected) {
        addIssue(ctx, ["hash_bindings", name], `${name} mismatch`);
      }
    }
  }
);

export type VbdTrajectoryProofArtifact = z.infer<
  typeof VbdTrajectoryProofArtifactSchema
>;
