import { z } from "zod";
import { sha256Json, stableStringify } from "./internal/hashing";

export const LONGITUDINAL_STATE_SPACE_CONCORDANCE_SCHEMA_VERSION =
  "FT_AI_VALUE_LONGITUDINAL_STATE_SPACE_NUTS_CONCORDANCE_2026_07_V1";
export const LONGITUDINAL_STATE_SPACE_CONCORDANCE_ARTIFACT_CLASS =
  "internal_synthetic_longitudinal_state_space_nuts_concordance";
export const LONGITUDINAL_STATE_SPACE_CONCORDANCE_MODEL_SLICE =
  "longitudinal_state_space_nuts_concordance_validation";

const MODEL_FAMILY =
  "bayesian_ai_value_realization_and_human_transformation_model_family";
const PRIMARY_ENGINE = "deterministic_gaussian_state_space_integration";
const REFERENCE_ENGINE = "pymc_nuts_state_space_reference";
const MODEL_KIND = "gaussian_longitudinal_zero_sum_ar1_state_space";
const HASH_POSTURE =
  "consistency_and_drift_detection_not_coordinated_replacement_authenticity";
const EFFECT_SIZES = [0, 0.2, 0.5] as const;
const PANEL_GROUP_COUNTS = [6, 12] as const;
const SEEDS = [202607120, 202607121, 202607122, 202607123, 202607124] as const;
const REQUIRED_SLOT_COUNT = 30;
const MEAN_MAX_REFERENCE_SD = 0.15;
const ENDPOINT_MAX_REFERENCE_SD = 0.2;
const SD_RATIO_MIN = 0.85;
const SD_RATIO_MAX = 1.15;
const RHAT_MAX = 1.01;
const ESS_MIN = 400;
const BFMI_MIN = 0.3;
const MCSE_RATIO_MAX = 0.1;
const PPC_MIN = 0.05;
const PPC_MAX = 0.95;
const FIXED_EFFECT_COUNT = 7;
const REQUIRED_PARAMETER_VARIABLES = [
  "beta",
  "longitudinal_movement",
  "panel_group_scale",
  "ar1_innovation_scale",
  "rho",
  "z_panel_group",
  "u_panel_group"
] as const;
const EVIDENCE_BINDING_NAMES = [
  "prepared_input_hash",
  "model_input_hash",
  "context_binding_hash",
  "truth_receipt_hash",
  "case_binding_hash",
  "primary_fit_summary_hash",
  "reference_fit_summary_hash"
] as const;
const SHA256 = z.string().regex(/^[0-9a-f]{64}$/);
const Finite = z.number().finite();
const SafeInteger = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const ParameterNameSchema = z.string().regex(/^[a-z][a-z0-9_]*(?:\[\d+\])?$/);
const EvidenceBindingHashSchema = z.string().regex(
  /^(?:prepared_input_hash|model_input_hash|context_binding_hash|truth_receipt_hash|case_binding_hash|primary_fit_summary_hash|reference_fit_summary_hash):[0-9a-f]{64}$/
);
const timestampPattern =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-](\d{2}):(\d{2}))$/;

const QuantityNameSchema = z.enum([
  "intercept",
  "historical_time_trend",
  "beta_velocity",
  "beta_breadth",
  "beta_fluency_context",
  "control_seasonality_index",
  "control_customer_demand_index",
  "longitudinal_movement",
  "panel_group_scale",
  "ar1_innovation_scale",
  "rho"
]);
const REQUIRED_QUANTITY_NAMES = QuantityNameSchema.options;
const PpcStatisticNameSchema = z.enum([
  "pre_post_mean_movement",
  "between_panel_group_variance",
  "within_panel_group_variance",
  "tail_or_extreme_aggregate_statistic",
  "lag_one_within_group_autocorrelation"
]);
const REQUIRED_PPC_NAMES = PpcStatisticNameSchema.options;
const SamplerFailureSchema = z.enum([
  "full_sampler_settings",
  "missing_parameter_diagnostics",
  "r_hat",
  "bulk_ess",
  "tail_ess",
  "mcse",
  "divergences",
  "max_treedepth_saturation",
  "energy_bfmi",
  "posterior_predictive_check"
]);
const SlotFailureSchema = z.enum([
  ...SamplerFailureSchema.options,
  "cross_engine_concordance",
  "runner_error"
]);
const StudyFailureSchema = z.enum([
  "full_study_settings",
  "missing_slots",
  "duplicate_slots",
  "off_plan_slots",
  "duplicate_evidence_bindings",
  "slot_failures"
]);

function effectToken(effect: number): string {
  if (effect === 0) return "0p0";
  if (effect === 0.2) return "0p2";
  if (effect === 0.5) return "0p5";
  return "off_plan";
}

function slotId(effect: number, groups: number, seed: number): string {
  return `effect_${effectToken(effect)}__groups_${groups}__seed_${seed}`;
}

function cellId(effect: number, groups: number): string {
  return `effect_${effectToken(effect)}__groups_${groups}`;
}

function requiredParameterNames(panelGroupCount: number): string[] {
  return [
    ...Array.from({ length: FIXED_EFFECT_COUNT }, (_, index) => `beta[${index}]`),
    "longitudinal_movement",
    "panel_group_scale",
    "ar1_innovation_scale",
    "rho",
    ...Array.from(
      { length: panelGroupCount },
      (_, index) => `z_panel_group[${index}]`
    ),
    ...Array.from(
      { length: panelGroupCount },
      (_, index) => `u_panel_group[${index}]`
    )
  ];
}

function parameterVariable(parameterName: string): string | null {
  if (/^beta\[\d+\]$/.test(parameterName)) return "beta";
  if (/^z_panel_group\[\d+\]$/.test(parameterName)) return "z_panel_group";
  if (/^u_panel_group\[\d+\]$/.test(parameterName)) return "u_panel_group";
  if (
    parameterName === "longitudinal_movement" ||
    parameterName === "panel_group_scale" ||
    parameterName === "ar1_innovation_scale" ||
    parameterName === "rho"
  ) {
    return parameterName;
  }
  return null;
}

const COMPILED_SLOT_IDS = EFFECT_SIZES.flatMap((effect) =>
  PANEL_GROUP_COUNTS.flatMap((groups) =>
    SEEDS.map((seed) => slotId(effect, groups, seed))
  )
);

function equal(left: unknown, right: unknown): boolean {
  return stableStringify(left) === stableStringify(right);
}

function near(left: number, right: number, tolerance = 1e-10): boolean {
  return Math.abs(left - right) <= tolerance * Math.max(1, Math.abs(left), Math.abs(right));
}

function addIssue(
  ctx: z.RefinementCtx,
  path: (string | number)[],
  message: string
): void {
  ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
}

const PosteriorSummarySchema = z
  .object({
    quantity_name: QuantityNameSchema,
    posterior_mean: Finite,
    posterior_sd: Finite.positive(),
    credible_interval_80: z
      .object({ lower: Finite, upper: Finite })
      .strict()
      .refine((value) => value.lower <= value.upper, {
        message: "credible interval endpoints must be ordered"
      })
  })
  .strict();

const QuantityConcordanceSchema = z
  .object({
    quantity_name: QuantityNameSchema,
    primary_summary: PosteriorSummarySchema,
    reference_summary: PosteriorSummarySchema,
    absolute_mean_difference_reference_sd: Finite.nonnegative(),
    lower_endpoint_difference_reference_sd: Finite.nonnegative(),
    upper_endpoint_difference_reference_sd: Finite.nonnegative(),
    primary_to_reference_sd_ratio: Finite.positive(),
    passed: z.boolean()
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.quantity_name !== value.primary_summary.quantity_name ||
      value.quantity_name !== value.reference_summary.quantity_name
    ) {
      addIssue(ctx, ["quantity_name"], "concordance quantity names must align");
      return;
    }
    const referenceSd = value.reference_summary.posterior_sd;
    const expectedMean =
      Math.abs(
        value.primary_summary.posterior_mean - value.reference_summary.posterior_mean
      ) / referenceSd;
    const expectedLower =
      Math.abs(
        value.primary_summary.credible_interval_80.lower -
          value.reference_summary.credible_interval_80.lower
      ) / referenceSd;
    const expectedUpper =
      Math.abs(
        value.primary_summary.credible_interval_80.upper -
          value.reference_summary.credible_interval_80.upper
      ) / referenceSd;
    const expectedRatio = value.primary_summary.posterior_sd / referenceSd;
    const expectedPass =
      expectedMean <= MEAN_MAX_REFERENCE_SD &&
      expectedLower <= ENDPOINT_MAX_REFERENCE_SD &&
      expectedUpper <= ENDPOINT_MAX_REFERENCE_SD &&
      expectedRatio >= SD_RATIO_MIN &&
      expectedRatio <= SD_RATIO_MAX;
    const checks: Array<[keyof typeof value, number]> = [
      ["absolute_mean_difference_reference_sd", expectedMean],
      ["lower_endpoint_difference_reference_sd", expectedLower],
      ["upper_endpoint_difference_reference_sd", expectedUpper],
      ["primary_to_reference_sd_ratio", expectedRatio]
    ];
    for (const [key, expected] of checks) {
      const actual = value[key];
      if (typeof actual !== "number" || !near(actual, expected)) {
        addIssue(ctx, [key], `${key} must be independently derived`);
      }
    }
    if (value.passed !== expectedPass) {
      addIssue(ctx, ["passed"], "concordance pass must match compiled gates");
    }
  });

const ReferenceSettingsSchema = z
  .object({
    mode: z.enum(["full", "smoke"]),
    chains: z.number().int().positive(),
    draws: z.number().int().positive(),
    tune: z.number().int().positive(),
    target_accept: Finite,
    max_treedepth: z.number().int().positive(),
    full_settings: z.boolean()
  })
  .strict()
  .superRefine((value, ctx) => {
    const isFull =
      value.mode === "full" &&
      value.chains === 4 &&
      value.draws === 1000 &&
      value.tune === 2000 &&
      value.target_accept === 0.99 &&
      value.max_treedepth === 15;
    const isSmoke =
      value.mode === "smoke" &&
      value.chains === 2 &&
      value.draws === 80 &&
      value.tune === 120 &&
      value.target_accept === 0.9 &&
      value.max_treedepth === 10;
    if (!isFull && !isSmoke) {
      addIssue(ctx, [], "reference settings must match a compiled execution mode");
    }
    if (value.full_settings !== isFull) {
      addIssue(ctx, ["full_settings"], "full_settings must be derived from settings");
    }
  });

const ParameterDiagnosticSchema = z
  .object({
    parameter_name: ParameterNameSchema,
    r_hat: Finite.positive(),
    bulk_ess: Finite.nonnegative(),
    tail_ess: Finite.nonnegative(),
    posterior_mean_mcse: Finite.nonnegative(),
    interval_endpoint_mcse: Finite.nonnegative(),
    posterior_sd: Finite.positive(),
    max_mcse_to_posterior_sd_ratio: Finite.nonnegative()
  })
  .strict()
  .superRefine((value, ctx) => {
    const expected =
      Math.max(value.posterior_mean_mcse, value.interval_endpoint_mcse) /
      value.posterior_sd;
    if (!near(value.max_mcse_to_posterior_sd_ratio, expected)) {
      addIssue(ctx, ["max_mcse_to_posterior_sd_ratio"], "MCSE ratio must be derived");
    }
  });

const SamplerDiagnosticsSchema = z
  .object({
    passed: z.boolean(),
    failing_diagnostics: z.array(SamplerFailureSchema),
    parameters: z.array(ParameterDiagnosticSchema).nonempty(),
    required_parameter_variables: z.tuple([
      z.literal("beta"),
      z.literal("longitudinal_movement"),
      z.literal("panel_group_scale"),
      z.literal("ar1_innovation_scale"),
      z.literal("rho"),
      z.literal("z_panel_group"),
      z.literal("u_panel_group")
    ]),
    missing_parameter_variables: z.array(
      z.enum([
        "beta",
        "longitudinal_movement",
        "panel_group_scale",
        "ar1_innovation_scale",
        "rho",
        "z_panel_group",
        "u_panel_group"
      ])
    ),
    required_parameter_names: z.array(ParameterNameSchema).nonempty(),
    missing_parameter_names: z.array(ParameterNameSchema),
    duplicate_parameter_names: z.array(ParameterNameSchema),
    off_plan_parameter_names: z.array(ParameterNameSchema),
    post_warmup_divergences: z.number().int().nonnegative(),
    max_treedepth_saturation_count: z.number().int().min(-1),
    energy_bfmi_min: Finite,
    compiled_gates: z
      .object({
        r_hat_max: z.literal(RHAT_MAX),
        bulk_ess_min: z.literal(ESS_MIN),
        tail_ess_min: z.literal(ESS_MIN),
        post_warmup_divergences_max: z.literal(0),
        max_treedepth_saturation_count_max: z.literal(0),
        energy_bfmi_min: z.literal(BFMI_MIN),
        max_mcse_to_posterior_sd_ratio: z.literal(MCSE_RATIO_MAX)
      })
      .strict()
  })
  .strict();

const PpcSchema = z
  .object({
    statistic_name: PpcStatisticNameSchema,
    observed_value: Finite,
    predictive_mean: Finite,
    predictive_interval_80: z
      .object({ lower: Finite, upper: Finite })
      .strict()
      .refine((value) => value.lower <= value.upper),
    p_value: Finite.min(0).max(1),
    passed: z.boolean()
  })
  .strict()
  .superRefine((value, ctx) => {
    const expected = value.p_value >= PPC_MIN && value.p_value <= PPC_MAX;
    if (value.passed !== expected) {
      addIssue(ctx, ["passed"], "PPC pass must match compiled p-value gate");
    }
  });

const PrimaryIntegrationDiagnosticsSchema = z
  .object({
    status: z.literal("PASS"),
    point_count: z.literal(8192),
    finite_point_count: z.number().int().min(4096).max(8192),
    effective_sample_size: Finite.min(256),
    compiled_min_effective_sample_size: z.literal(256),
    max_normalized_weight: Finite.min(0).max(0.05),
    compiled_max_normalized_weight: z.literal(0.05),
    mode_transformed: z.tuple([Finite, Finite, Finite]),
    negative_log_posterior_at_mode: Finite,
    hessian_condition_number: Finite.positive(),
    random_numbers_used: z.literal(false),
    seed_used_for_computation: z.literal(false)
  })
  .strict();

const SlotResultObjectSchema = z
  .object({
    slot_id: z.string(),
    cell_id: z.string(),
    effect_size_sd: z.union([z.literal(0), z.literal(0.2), z.literal(0.5)]),
    panel_group_count: z.union([z.literal(6), z.literal(12)]),
    seed: SafeInteger.refine((value) => (SEEDS as readonly number[]).includes(value)),
    execution_mode: z.enum(["full", "smoke"]),
    status: z.enum(["PASS", "HOLD"]),
    failing_checks: z.array(SlotFailureSchema),
    prepared_input_hash: SHA256.nullable(),
    model_input_hash: SHA256.nullable(),
    context_binding_hash: SHA256.nullable(),
    truth_receipt_hash: SHA256.nullable(),
    case_binding_hash: SHA256.nullable(),
    primary_fit_summary_hash: SHA256.nullable(),
    reference_fit_summary_hash: SHA256.nullable(),
    primary_integration_diagnostics: PrimaryIntegrationDiagnosticsSchema.nullable(),
    reference_settings: ReferenceSettingsSchema.nullable(),
    reference_sampler_diagnostics: SamplerDiagnosticsSchema.nullable(),
    posterior_predictive_checks: z.array(PpcSchema),
    quantity_concordance: z.array(QuantityConcordanceSchema),
    runner_error_stage: z
      .enum(["generate", "prepare", "primary", "reference", "concordance"])
      .nullable(),
    runner_error_type: z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,99}$/).nullable(),
    slot_result_hash: SHA256
  })
  .strict();

type SlotResult = z.infer<typeof SlotResultObjectSchema>;

function slotBodyWithoutHash(slot: SlotResult): Record<string, unknown> {
  const { slot_result_hash: _hash, ...body } = slot;
  return body;
}

function deriveSamplerFailures(
  diagnostics: z.infer<typeof SamplerDiagnosticsSchema>,
  settings: z.infer<typeof ReferenceSettingsSchema>,
  ppc: z.infer<typeof PpcSchema>[],
  panelGroupCount: number
): string[] {
  const failures: string[] = [];
  const expectedNames = requiredParameterNames(panelGroupCount);
  const actualNames = diagnostics.parameters.map((value) => value.parameter_name);
  const duplicateNames = [
    ...new Set(actualNames.filter((name, index) => actualNames.indexOf(name) !== index))
  ].sort();
  const missingNames = expectedNames.filter((name) => !actualNames.includes(name));
  const offPlanNames = [...new Set(actualNames.filter((name) => !expectedNames.includes(name)))].sort();
  if (
    diagnostics.missing_parameter_variables.length > 0 ||
    missingNames.length > 0 ||
    duplicateNames.length > 0 ||
    offPlanNames.length > 0 ||
    !equal(actualNames, expectedNames)
  ) {
    failures.push("missing_parameter_diagnostics");
  }
  if (!settings.full_settings) failures.push("full_sampler_settings");
  if (
    diagnostics.parameters.some(
      (value) => value.r_hat <= 0 || value.r_hat > RHAT_MAX
    )
  ) {
    failures.push("r_hat");
  }
  if (diagnostics.parameters.some((value) => value.bulk_ess < ESS_MIN)) failures.push("bulk_ess");
  if (diagnostics.parameters.some((value) => value.tail_ess < ESS_MIN)) failures.push("tail_ess");
  if (
    diagnostics.parameters.some(
      (value) => value.max_mcse_to_posterior_sd_ratio > MCSE_RATIO_MAX
    )
  ) {
    failures.push("mcse");
  }
  if (diagnostics.post_warmup_divergences !== 0) failures.push("divergences");
  if (diagnostics.max_treedepth_saturation_count !== 0) {
    failures.push("max_treedepth_saturation");
  }
  if (diagnostics.energy_bfmi_min < BFMI_MIN) failures.push("energy_bfmi");
  if (ppc.some((value) => !value.passed)) failures.push("posterior_predictive_check");
  return failures;
}

function slotIdentity(slot: SlotResult): Record<string, unknown> {
  return {
    slot_id: slot.slot_id,
    cell_id: slot.cell_id,
    effect_size_sd: slot.effect_size_sd,
    panel_group_count: slot.panel_group_count,
    seed: slot.seed
  };
}

function preparedInputHash(slot: SlotResult): string | null {
  if (slot.model_input_hash === null || slot.context_binding_hash === null) {
    return null;
  }
  return sha256Json({
    model_input_hash: slot.model_input_hash,
    context_binding_hash: slot.context_binding_hash
  });
}

function caseBindingHash(slot: SlotResult): string | null {
  if (
    slot.prepared_input_hash === null ||
    slot.model_input_hash === null ||
    slot.context_binding_hash === null ||
    slot.truth_receipt_hash === null
  ) {
    return null;
  }
  return sha256Json({
    slot: slotIdentity(slot),
    prepared_input_hash: slot.prepared_input_hash,
    model_input_hash: slot.model_input_hash,
    context_binding_hash: slot.context_binding_hash,
    truth_receipt_hash: slot.truth_receipt_hash
  });
}

function primaryEngineFitSummaryHash(slot: SlotResult): string | null {
  if (
    slot.prepared_input_hash === null ||
    slot.model_input_hash === null ||
    slot.primary_integration_diagnostics === null ||
    slot.quantity_concordance.length === 0
  ) {
    return null;
  }
  return sha256Json({
    prepared_input_hash: slot.prepared_input_hash,
    model_input_hash: slot.model_input_hash,
    engine_kind: PRIMARY_ENGINE,
    summaries: slot.quantity_concordance.map((value) => value.primary_summary),
    integration_diagnostics: slot.primary_integration_diagnostics
  });
}

function referenceEngineFitSummaryHash(slot: SlotResult): string | null {
  if (
    slot.prepared_input_hash === null ||
    slot.reference_settings === null ||
    slot.reference_sampler_diagnostics === null ||
    slot.quantity_concordance.length === 0
  ) {
    return null;
  }
  return sha256Json({
    prepared_input_hash: slot.prepared_input_hash,
    engine_kind: REFERENCE_ENGINE,
    settings: slot.reference_settings,
    seed: slot.seed,
    summaries: slot.quantity_concordance.map((value) => value.reference_summary),
    sampler_diagnostics: slot.reference_sampler_diagnostics,
    posterior_predictive_checks: slot.posterior_predictive_checks,
    raw_posterior_draws_emitted: false
  });
}

function fitBindingHash(
  caseHash: string | null,
  engineFitSummaryHash: string | null
): string | null {
  if (caseHash === null || engineFitSummaryHash === null) return null;
  return sha256Json({
    case_binding_hash: caseHash,
    engine_fit_summary_hash: engineFitSummaryHash
  });
}

function primaryFitHash(slot: SlotResult): string | null {
  return fitBindingHash(slot.case_binding_hash, primaryEngineFitSummaryHash(slot));
}

function referenceFitHash(slot: SlotResult): string | null {
  return fitBindingHash(slot.case_binding_hash, referenceEngineFitSummaryHash(slot));
}

function validatePreparedAndCaseBindings(
  slot: SlotResult,
  ctx: z.RefinementCtx
): void {
  const preparedCommitments = [
    slot.prepared_input_hash,
    slot.model_input_hash,
    slot.context_binding_hash
  ];
  const anyPreparedCommitment = preparedCommitments.some((value) => value !== null);
  const allPreparedCommitments = preparedCommitments.every((value) => value !== null);
  if (anyPreparedCommitment && !allPreparedCommitments) {
    addIssue(ctx, ["prepared_input_hash"], "prepared-input commitments must be complete");
  }
  if (allPreparedCommitments) {
    if (slot.prepared_input_hash !== preparedInputHash(slot)) {
      addIssue(
        ctx,
        ["prepared_input_hash"],
        "prepared_input_hash must bind model and context commitments"
      );
    }
    if (slot.truth_receipt_hash === null || slot.case_binding_hash === null) {
      addIssue(ctx, ["case_binding_hash"], "prepared evidence requires a complete case binding");
    } else if (slot.case_binding_hash !== caseBindingHash(slot)) {
      addIssue(ctx, ["case_binding_hash"], "case_binding_hash must bind the compiled slot and evidence");
    }
  } else if (slot.case_binding_hash !== null) {
    addIssue(ctx, ["case_binding_hash"], "case binding requires complete prepared evidence");
  }
}

function validatePresentFitBindings(slot: SlotResult, ctx: z.RefinementCtx): void {
  if (slot.primary_fit_summary_hash !== null) {
    const expectedPrimary = primaryFitHash(slot);
    if (expectedPrimary === null || slot.primary_fit_summary_hash !== expectedPrimary) {
      addIssue(
        ctx,
        ["primary_fit_summary_hash"],
        "primary fit hash must be independently derived and slot-bound"
      );
    }
  }
  if (slot.reference_fit_summary_hash !== null) {
    const expectedReference = referenceFitHash(slot);
    if (expectedReference === null || slot.reference_fit_summary_hash !== expectedReference) {
      addIssue(
        ctx,
        ["reference_fit_summary_hash"],
        "reference fit hash must be independently derived and slot-bound"
      );
    }
  }
}

const SlotResultSchema = SlotResultObjectSchema.superRefine((slot, ctx) => {
  if (slot.slot_id !== slotId(slot.effect_size_sd, slot.panel_group_count, slot.seed)) {
    addIssue(ctx, ["slot_id"], "slot_id must be derived from the compiled slot");
  }
  if (slot.cell_id !== cellId(slot.effect_size_sd, slot.panel_group_count)) {
    addIssue(ctx, ["cell_id"], "cell_id must be derived from the compiled cell");
  }
  if (slot.slot_result_hash !== sha256Json(slotBodyWithoutHash(slot))) {
    addIssue(ctx, ["slot_result_hash"], "slot_result_hash must bind the slot body");
  }
  validatePreparedAndCaseBindings(slot, ctx);
  validatePresentFitBindings(slot, ctx);
  const hasRunnerError = slot.runner_error_stage !== null || slot.runner_error_type !== null;
  if (hasRunnerError) {
    if (
      slot.runner_error_stage === null ||
      slot.runner_error_type === null ||
      slot.status !== "HOLD" ||
      !equal(slot.failing_checks, ["runner_error"])
    ) {
      addIssue(ctx, ["runner_error_stage"], "runner errors must be explicit HOLD records");
    }
    if (
      slot.reference_fit_summary_hash !== null ||
      slot.reference_settings !== null ||
      slot.reference_sampler_diagnostics !== null ||
      slot.posterior_predictive_checks.length > 0 ||
      slot.quantity_concordance.length > 0
    ) {
      addIssue(
        ctx,
        ["runner_error_stage"],
        "runner-error slots cannot carry unvalidated reference or concordance evidence"
      );
    }
    if (
      (slot.primary_fit_summary_hash === null) !==
      (slot.primary_integration_diagnostics === null)
    ) {
      addIssue(
        ctx,
        ["primary_fit_summary_hash"],
        "runner-error primary fit evidence must be complete or absent"
      );
    }
    return;
  }
  const requiredValues = [
    slot.prepared_input_hash,
    slot.model_input_hash,
    slot.context_binding_hash,
    slot.truth_receipt_hash,
    slot.case_binding_hash,
    slot.primary_fit_summary_hash,
    slot.reference_fit_summary_hash,
    slot.primary_integration_diagnostics,
    slot.reference_settings,
    slot.reference_sampler_diagnostics
  ];
  if (requiredValues.some((value) => value === null)) {
    addIssue(ctx, [], "completed slots require all bound engine evidence");
    return;
  }
  const quantityNames = slot.quantity_concordance.map((value) => value.quantity_name);
  if (!equal(quantityNames, REQUIRED_QUANTITY_NAMES)) {
    addIssue(ctx, ["quantity_concordance"], "slot must report the exact quantity set and order");
  }
  const ppcNames = slot.posterior_predictive_checks.map((value) => value.statistic_name);
  if (!equal(ppcNames, REQUIRED_PPC_NAMES)) {
    addIssue(ctx, ["posterior_predictive_checks"], "slot must report all fixed PPCs in order");
  }
  const settings = slot.reference_settings!;
  const diagnostics = slot.reference_sampler_diagnostics!;
  if (settings.mode !== slot.execution_mode) {
    addIssue(ctx, ["reference_settings", "mode"], "reference mode must match slot mode");
  }
  const expectedParameterNames = requiredParameterNames(slot.panel_group_count);
  const actualParameterNames = diagnostics.parameters.map((value) => value.parameter_name);
  const missingParameterNames = expectedParameterNames.filter(
    (name) => !actualParameterNames.includes(name)
  );
  const duplicateParameterNames = [
    ...new Set(
      actualParameterNames.filter(
        (name, index) => actualParameterNames.indexOf(name) !== index
      )
    )
  ].sort();
  const offPlanParameterNames = [
    ...new Set(actualParameterNames.filter((name) => !expectedParameterNames.includes(name)))
  ].sort();
  const presentParameterVariables = new Set(
    actualParameterNames
      .map((name) => parameterVariable(name))
      .filter((name): name is string => name !== null)
  );
  const missingParameterVariables = REQUIRED_PARAMETER_VARIABLES.filter(
    (name) => !presentParameterVariables.has(name)
  );
  const manifestChecks: Array<[string, unknown, unknown]> = [
    ["required_parameter_names", diagnostics.required_parameter_names, expectedParameterNames],
    ["missing_parameter_names", diagnostics.missing_parameter_names, missingParameterNames],
    ["duplicate_parameter_names", diagnostics.duplicate_parameter_names, duplicateParameterNames],
    ["off_plan_parameter_names", diagnostics.off_plan_parameter_names, offPlanParameterNames],
    [
      "missing_parameter_variables",
      diagnostics.missing_parameter_variables,
      missingParameterVariables
    ]
  ];
  for (const [key, actual, expected] of manifestChecks) {
    if (!equal(actual, expected)) {
      addIssue(
        ctx,
        ["reference_sampler_diagnostics", key],
        `${key} must be independently derived`
      );
    }
  }
  const samplerFailures = deriveSamplerFailures(
    diagnostics,
    settings,
    slot.posterior_predictive_checks,
    slot.panel_group_count
  );
  if (!equal(diagnostics.failing_diagnostics, samplerFailures)) {
    addIssue(ctx, ["reference_sampler_diagnostics", "failing_diagnostics"], "sampler failures must be derived");
  }
  if (diagnostics.passed !== (samplerFailures.length === 0)) {
    addIssue(ctx, ["reference_sampler_diagnostics", "passed"], "sampler pass must be derived");
  }
  const expectedFailures = [...samplerFailures];
  if (slot.quantity_concordance.some((value) => !value.passed)) {
    expectedFailures.push("cross_engine_concordance");
  }
  const deduplicated = [...new Set(expectedFailures)];
  if (!equal(slot.failing_checks, deduplicated)) {
    addIssue(ctx, ["failing_checks"], "slot failures must be independently derived");
  }
  const expectedStatus = deduplicated.length === 0 ? "PASS" : "HOLD";
  if (slot.status !== expectedStatus) {
    addIssue(ctx, ["status"], "slot status must match derived failures");
  }
  if (slot.execution_mode === "smoke" && slot.status !== "HOLD") {
    addIssue(ctx, ["status"], "smoke slots must HOLD");
  }
});

const StudyPlanObjectSchema = z
  .object({
    plan_version: z.literal("1.0.0"),
    effect_sizes_sd: z.tuple([z.literal(0), z.literal(0.2), z.literal(0.5)]),
    panel_group_counts: z.tuple([z.literal(6), z.literal(12)]),
    seeds: z.tuple(SEEDS.map((seed) => z.literal(seed)) as [
      z.ZodLiteral<202607120>,
      z.ZodLiteral<202607121>,
      z.ZodLiteral<202607122>,
      z.ZodLiteral<202607123>,
      z.ZodLiteral<202607124>
    ]),
    required_slot_count: z.literal(REQUIRED_SLOT_COUNT),
    slot_ids: z.array(z.string()).length(REQUIRED_SLOT_COUNT),
    compiled_concordance_gates: z
      .object({
        mean_max_reference_sd: z.literal(MEAN_MAX_REFERENCE_SD),
        endpoint_max_reference_sd: z.literal(ENDPOINT_MAX_REFERENCE_SD),
        sd_ratio_min: z.literal(SD_RATIO_MIN),
        sd_ratio_max: z.literal(SD_RATIO_MAX)
      })
      .strict(),
    plan_hash: SHA256
  })
  .strict();

type StudyPlan = z.infer<typeof StudyPlanObjectSchema>;

function planBody(plan: StudyPlan): Record<string, unknown> {
  const { plan_hash: _hash, ...body } = plan;
  return body;
}

const StudyPlanSchema = StudyPlanObjectSchema.superRefine((plan, ctx) => {
  if (!equal(plan.slot_ids, COMPILED_SLOT_IDS)) {
    addIssue(ctx, ["slot_ids"], "study plan must contain the exact compiled slots");
  }
  if (plan.plan_hash !== sha256Json(planBody(plan))) {
    addIssue(ctx, ["plan_hash"], "plan hash must bind the compiled plan");
  }
});

const StudySummarySchema = z
  .object({
    execution_mode: z.enum(["full", "smoke"]),
    planned_slot_count: z.literal(REQUIRED_SLOT_COUNT),
    executed_slot_count: z.number().int().min(0).max(REQUIRED_SLOT_COUNT),
    missing_slot_ids: z.array(z.string()),
    duplicate_slot_ids: z.array(z.string()),
    off_plan_slot_ids: z.array(z.string()),
    duplicate_evidence_binding_hashes: z.array(EvidenceBindingHashSchema),
    all_slots_passed: z.boolean(),
    exact_manifest_complete: z.boolean(),
    study_status: z.enum(["PASS", "HOLD"]),
    failing_checks: z.array(StudyFailureSchema),
    plan_hash: SHA256,
    study_result_hash: SHA256
  })
  .strict();

function duplicateEvidenceBindingHashes(slotResults: SlotResult[]): string[] {
  const bindings = slotResults.flatMap((slot) =>
    EVIDENCE_BINDING_NAMES.flatMap((name) => {
      const value = slot[name];
      return value === null ? [] : [`${name}:${value}`];
    })
  );
  return [
    ...new Set(
      bindings.filter((binding, index) => bindings.indexOf(binding) !== index)
    )
  ].sort();
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
    zero_sum_parameterization: z.literal("c_minus_one_orthonormal_basis"),
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
    primary: z
      .object({
        engine_kind: z.literal(PRIMARY_ENGINE),
        gaussian_states_integrated_analytically: z.literal(true),
        fixed_effects_integrated_conditionally: z.literal(true),
        posterior_draws_generated: z.literal(false),
        cubature: z
          .object({
            rule: z.literal("unscrambled_sobol_student_t_importance_cubature"),
            log2_point_count: z.literal(13),
            point_count: z.literal(8192),
            student_t_degrees_of_freedom: z.literal(5),
            proposal_scale: z.literal(1.5),
            min_effective_sample_size: z.literal(256),
            max_normalized_weight: z.literal(0.05)
          })
          .strict()
      })
      .strict(),
    reference: z
      .object({
        engine_kind: z.literal(REFERENCE_ENGINE),
        sampler: z.literal("pymc_nuts"),
        chains: z.literal(4),
        draws: z.literal(1000),
        tune: z.literal(2000),
        target_accept: z.literal(0.99),
        max_treedepth: z.literal(15),
        cores: z.literal(1),
        blas_cores: z.literal(1),
        raw_posterior_draws_emitted: z.literal(false)
      })
      .strict(),
    compiled_reference_diagnostic_gates: z
      .object({
        r_hat_max: z.literal(RHAT_MAX),
        bulk_ess_min: z.literal(ESS_MIN),
        tail_ess_min: z.literal(ESS_MIN),
        post_warmup_divergences_max: z.literal(0),
        max_treedepth_saturation_count_max: z.literal(0),
        energy_bfmi_min: z.literal(BFMI_MIN),
        max_mcse_to_posterior_sd_ratio: z.literal(MCSE_RATIO_MAX),
        posterior_predictive_p_value_min: z.literal(PPC_MIN),
        posterior_predictive_p_value_max: z.literal(PPC_MAX),
        posterior_predictive_statistics: z.tuple([
          z.literal("pre_post_mean_movement"),
          z.literal("between_panel_group_variance"),
          z.literal("within_panel_group_variance"),
          z.literal("tail_or_extreme_aggregate_statistic"),
          z.literal("lag_one_within_group_autocorrelation")
        ])
      })
      .strict()
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
    full_pathway_coherence_authorized: z.literal(false),
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
    schema_version: z.literal(LONGITUDINAL_STATE_SPACE_CONCORDANCE_SCHEMA_VERSION),
    artifact_class: z.literal(LONGITUDINAL_STATE_SPACE_CONCORDANCE_ARTIFACT_CLASS),
    generated_at: z
      .string()
      .regex(timestampPattern)
      .refine((value) => Number.isFinite(Date.parse(value))),
    harness_version: z.literal("0.1.0"),
    model_family: z.literal(MODEL_FAMILY),
    model_slice: z.literal(LONGITUDINAL_STATE_SPACE_CONCORDANCE_MODEL_SLICE),
    model_specification: ModelSpecificationSchema,
    engine_specification: EngineSpecificationSchema,
    study_plan: StudyPlanSchema,
    study_summary: StudySummarySchema,
    slot_results: z.array(SlotResultSchema).max(REQUIRED_SLOT_COUNT),
    validation_scope: z
      .object({
        synthetic_only: z.literal(true),
        aggregate_only: z.literal(true),
        state_space_nuts_concordance_complete: z.boolean(),
        replicated_validation_complete: z.literal(false),
        calibration_complete: z.literal(false),
        production_promotion_complete: z.literal(false)
      })
      .strict(),
    governance_state: z
      .object({
        state: z.enum(["HOLD", "valid_internal_validation_non_authorizing"]),
        failing_checks: z.array(StudyFailureSchema),
        concordance_gate_passed: z.boolean(),
        independent_acceptance_required: z.literal(true),
        independent_acceptance_complete: z.literal(false),
        replicated_validation_unblocked: z.literal(false),
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
        latent_states_emitted: z.literal(false)
      })
      .strict(),
    hash_bindings: z
      .object({
        study_plan_hash: SHA256,
        slot_results_hash: SHA256,
        study_result_hash: SHA256,
        artifact_payload_hash: SHA256,
        artifact_self_hash: SHA256,
        hash_posture: z.literal(HASH_POSTURE)
      })
      .strict(),
    blocked_outputs: BlockedOutputsSchema,
    internal_only: z.literal(true),
    synthetic_only: z.literal(true),
    numeric_values_role: z.literal("internal_validation_evidence_not_customer_output"),
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

export function longitudinalStateSpaceConcordancePayloadHashBody(
  artifact: unknown
): unknown {
  const record = { ...(artifact as Record<string, unknown>) };
  delete record.hash_bindings;
  return record;
}

export function longitudinalStateSpaceConcordancePayloadHash(artifact: unknown): string {
  return sha256Json(longitudinalStateSpaceConcordancePayloadHashBody(artifact));
}

export function longitudinalStateSpaceConcordanceSelfHashBody(artifact: unknown): unknown {
  const record = artifact as Record<string, unknown>;
  const bindings = record.hash_bindings as Record<string, unknown>;
  return {
    ...record,
    hash_bindings: { ...bindings, artifact_self_hash: "" }
  };
}

export function longitudinalStateSpaceConcordanceSelfHash(artifact: unknown): string {
  return sha256Json(longitudinalStateSpaceConcordanceSelfHashBody(artifact));
}

export const LongitudinalStateSpaceConcordanceArtifactSchema =
  ArtifactObjectSchema.superRefine((artifact, ctx) => {
    if (artifact.hash_bindings.study_plan_hash !== artifact.study_plan.plan_hash) {
      addIssue(ctx, ["hash_bindings", "study_plan_hash"], "study plan hash binding mismatch");
    }
    if (artifact.hash_bindings.slot_results_hash !== sha256Json(artifact.slot_results)) {
      addIssue(ctx, ["hash_bindings", "slot_results_hash"], "slot results hash mismatch");
    }
    if (
      artifact.hash_bindings.artifact_payload_hash !==
      longitudinalStateSpaceConcordancePayloadHash(artifact)
    ) {
      addIssue(ctx, ["hash_bindings", "artifact_payload_hash"], "payload hash mismatch");
    }
    if (
      artifact.hash_bindings.artifact_self_hash !==
      longitudinalStateSpaceConcordanceSelfHash(artifact)
    ) {
      addIssue(ctx, ["hash_bindings", "artifact_self_hash"], "self hash mismatch");
    }

    const resultIds = artifact.slot_results.map((value) => value.slot_id);
    const duplicates = [
      ...new Set(resultIds.filter((value, index) => resultIds.indexOf(value) !== index))
    ].sort();
    const offPlan = [
      ...new Set(resultIds.filter((value) => !COMPILED_SLOT_IDS.includes(value)))
    ].sort();
    const missing = COMPILED_SLOT_IDS.filter((value) => !resultIds.includes(value));
    const resultIdsInCompiledOrder = COMPILED_SLOT_IDS.filter((value) =>
      resultIds.includes(value)
    );
    const compiledOrder = equal(resultIds, resultIdsInCompiledOrder);
    if (!compiledOrder) {
      addIssue(ctx, ["slot_results"], "slot results must follow compiled plan order");
    }
    if (
      artifact.slot_results.some(
        (value) => value.execution_mode !== artifact.study_summary.execution_mode
      )
    ) {
      addIssue(
        ctx,
        ["slot_results"],
        "every slot execution mode must match the study execution mode"
      );
    }
    const duplicateEvidenceBindings = duplicateEvidenceBindingHashes(
      artifact.slot_results
    );
    const exactManifest =
      missing.length === 0 &&
      duplicates.length === 0 &&
      offPlan.length === 0 &&
      duplicateEvidenceBindings.length === 0 &&
      compiledOrder &&
      artifact.slot_results.length === REQUIRED_SLOT_COUNT;
    const allPassed =
      artifact.slot_results.length > 0 &&
      artifact.slot_results.every(
        (value) => value.status === "PASS" && value.failing_checks.length === 0
      );
    const studyFailures: string[] = [];
    if (artifact.study_summary.execution_mode !== "full") studyFailures.push("full_study_settings");
    if (missing.length > 0) studyFailures.push("missing_slots");
    if (duplicates.length > 0) studyFailures.push("duplicate_slots");
    if (offPlan.length > 0) studyFailures.push("off_plan_slots");
    if (duplicateEvidenceBindings.length > 0) {
      studyFailures.push("duplicate_evidence_bindings");
    }
    if (!allPassed) studyFailures.push("slot_failures");
    const expectedPass =
      artifact.study_summary.execution_mode === "full" && exactManifest && allPassed;
    const expectedStudyStatus = expectedPass ? "PASS" : "HOLD";
    const summaryChecks: Array<[string, unknown, unknown]> = [
      ["executed_slot_count", artifact.study_summary.executed_slot_count, artifact.slot_results.length],
      ["missing_slot_ids", artifact.study_summary.missing_slot_ids, missing],
      ["duplicate_slot_ids", artifact.study_summary.duplicate_slot_ids, duplicates],
      ["off_plan_slot_ids", artifact.study_summary.off_plan_slot_ids, offPlan],
      [
        "duplicate_evidence_binding_hashes",
        artifact.study_summary.duplicate_evidence_binding_hashes,
        duplicateEvidenceBindings
      ],
      ["all_slots_passed", artifact.study_summary.all_slots_passed, allPassed],
      ["exact_manifest_complete", artifact.study_summary.exact_manifest_complete, exactManifest],
      ["study_status", artifact.study_summary.study_status, expectedStudyStatus],
      ["failing_checks", artifact.study_summary.failing_checks, studyFailures],
      ["plan_hash", artifact.study_summary.plan_hash, artifact.study_plan.plan_hash]
    ];
    for (const [key, actual, expected] of summaryChecks) {
      if (!equal(actual, expected)) {
        addIssue(ctx, ["study_summary", key], `${key} must be independently derived`);
      }
    }
    const expectedStudyHash = sha256Json({
      execution_mode: artifact.study_summary.execution_mode,
      plan_hash: artifact.study_plan.plan_hash,
      slot_result_hashes: artifact.slot_results.map((value) => value.slot_result_hash),
      missing_slot_ids: missing,
      duplicate_slot_ids: duplicates,
      off_plan_slot_ids: offPlan,
      duplicate_evidence_binding_hashes: duplicateEvidenceBindings,
      all_slots_passed: allPassed,
      exact_manifest_complete: exactManifest,
      failing_checks: studyFailures
    });
    if (artifact.study_summary.study_result_hash !== expectedStudyHash) {
      addIssue(ctx, ["study_summary", "study_result_hash"], "study result hash must be derived");
    }
    if (artifact.hash_bindings.study_result_hash !== expectedStudyHash) {
      addIssue(ctx, ["hash_bindings", "study_result_hash"], "study result hash binding mismatch");
    }
    const expectedState = expectedPass
      ? "valid_internal_validation_non_authorizing"
      : "HOLD";
    if (artifact.governance_state.state !== expectedState) {
      addIssue(ctx, ["governance_state", "state"], "governance state must be derived");
    }
    if (!equal(artifact.governance_state.failing_checks, studyFailures)) {
      addIssue(ctx, ["governance_state", "failing_checks"], "governance failures must be derived");
    }
    if (artifact.governance_state.concordance_gate_passed !== expectedPass) {
      addIssue(ctx, ["governance_state", "concordance_gate_passed"], "concordance gate must be derived");
    }
    if (artifact.validation_scope.state_space_nuts_concordance_complete !== expectedPass) {
      addIssue(ctx, ["validation_scope", "state_space_nuts_concordance_complete"], "completion must be derived");
    }
  });

export type LongitudinalStateSpaceConcordanceArtifact = z.infer<
  typeof LongitudinalStateSpaceConcordanceArtifactSchema
>;
