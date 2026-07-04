// ConfidenceModel contract module — TYPES AND ZOD SCHEMAS ONLY.
//
// Added under OpenSpec change add-confidence-engine-workspace (task 4.2).
// This module gives the methodology workstream (workstream C) and the UI
// narrative a stable, governed shape to build against. It deliberately
// contains NO execution behavior: no inference, no fetching, no hashing,
// no persistence, no numeric posterior computation. The only behavior is
// Zod parse/validation of the schemas themselves.
//
// Evidence-admission vocabulary is aligned to the confidence-engine series
// read-path decision contract at
// docs/contracts/ai-value-confidence-engine-series-read-path-decision/README.md
// and its runner
// scripts/run_ai_value_confidence_engine_series_read_path_decision.mjs
// (consumer token, milestone days, requirement schema versions, hold/reject
// vocabulary). Governance posture follows SCOPE_GUARDRAILS.md and PORTING.md:
// aggregate-only (k >= 5 cohort floor), fail-closed / hold-by-default, no
// posterior numeric output authorization, no confidence/probability/score/
// finance/customer output.

import { z } from "zod";

// ---------------------------------------------------------------------------
// Schema version + aligned contract constants
// ---------------------------------------------------------------------------

export const CONFIDENCE_MODEL_CONTRACT_SCHEMA_VERSION =
  "FT_AI_VALUE_CONFIDENCE_MODEL_CONTRACT_2026_07";

// Exact tokens from the series read-path decision contract (do not edit —
// drift here is a governance defect, not an update).
export const CONFIDENCE_ENGINE_SERIES_READ_PATH_DECISION_SCHEMA_VERSION_REF =
  "FT_AI_VALUE_CONFIDENCE_ENGINE_SERIES_READ_PATH_DECISION_2026_07";
export const CONFIDENCE_OBSERVATION_REQUIREMENT_SCHEMA_VERSION_REF =
  "FT_AI_VALUE_CONFIDENCE_OBSERVATION_REQUIREMENT_2026_07";
export const INTERNAL_CONFIDENCE_CONSUMER_TOKEN =
  "internal_confidence_engine_only";

// Milestone days authorized by the read-path decision contract
// (Day 0 / 30 / 60 / 90 / 180 / 365).
export const CONFIDENCE_OBSERVATION_MILESTONE_DAYS = [
  0, 30, 60, 90, 180, 365
] as const;

// Aggregate-only cohort floor (SCOPE_GUARDRAILS aggregation-first posture;
// matches the repo-wide minimum_cohort_threshold >= 5 convention). This is
// the general aggregate convention used elsewhere; series-sourced admission
// (EvidenceAdmittedSchema, whose source_ref carries a series_ref) is
// additionally bound to the read-path floor of 10 below.
export const CONFIDENCE_MODEL_MINIMUM_COHORT_FLOOR = 5;

// Matches `minimum_cohort_size` in the confidence-engine series read-path
// decision contract (scripts/run_ai_value_confidence_engine_series_read_path_decision.mjs);
// series-sourced admission may never declare a lower floor.
export const CONFIDENCE_SERIES_READ_PATH_COHORT_FLOOR = 10;

// Held runtime the contract binds against (proposal: no behavior change).
export const CONFIDENCE_MODEL_RUNTIME_HOLD_STATE =
  "INTERNAL_BAYESIAN_FIXTURE_EXECUTION_PROTOTYPE_HELD_FOR_REVIEW";

// Placeholder-prior label aligned to the Bayesian model specification's
// prior_specification_state token (the current standard-normal /
// weakly-regularizing prior is explicitly a placeholder, not calibrated).
export const WEAKLY_REGULARIZING_PLACEHOLDER_STATE =
  "weakly_regularizing_internal_placeholder_not_calibrated";

// ---------------------------------------------------------------------------
// Reason-code vocabularies (machine-readable, fail-closed)
// ---------------------------------------------------------------------------

// Admission reason codes satisfy the read-path decision requirement
// `requires_admission_reason_codes: true`. Each admitted observation must
// state why it was admissible, in the contract's own vocabulary.
export const EVIDENCE_ADMISSION_REASON_CODES = [
  "gate_cleared_observation_admitted",
  "milestone_window_observed",
  "append_only_observation_appended",
  "compact_ref_source_bound",
  "org_scoped_aggregate_cohort_met"
] as const;

// Rejection (exclusion) reason codes — fail-closed. The first two reuse the
// exact hold vocabulary emitted by
// scripts/run_ai_value_confidence_engine_series_read_path_decision.mjs.
export const EVIDENCE_REJECTION_REASON_CODES = [
  "confidence_observation_requirement_not_valid",
  "boundary_leakage_rejected",
  "observation_not_gate_cleared",
  "milestone_day_not_in_contract",
  "cohort_floor_not_met",
  "person_level_identifier_present",
  "non_append_only_mutation_rejected",
  "compact_ref_missing",
  "org_scope_missing"
] as const;

// Blocked uses pinned by this contract (proposal "no behavior change" list).
export const CONFIDENCE_MODEL_BLOCKED_USES = [
  "model_output",
  "confidence_output",
  "probability_output",
  "score_like_output",
  "finance_output",
  "roi_output",
  "causality_claim",
  "productivity_claim",
  "customer_facing_output",
  "backend_route",
  "frontend_ui",
  "export_creation",
  "rendered_readout",
  "persistence_write",
  "live_connector_execution"
] as const;

// Credible-interval levels the posterior representation may declare.
export const CREDIBLE_INTERVAL_LEVELS = [0.5, 0.8, 0.95] as const;

// ---------------------------------------------------------------------------
// 1. BlueprintDerivedPriorProvenance — provenance only, no numeric parameters
// ---------------------------------------------------------------------------

export const BlueprintHypothesisRefSchema = z
  .object({
    hypothesis_id: z.string().min(1),
    blueprint_version: z.string().min(1)
  })
  .strict();

export const BlueprintDerivedPriorProvenanceSchema = z
  .object({
    provenance_class: z.literal("blueprint_derived_prior_provenance"),
    blueprint_hypothesis_ref: BlueprintHypothesisRefSchema,
    elicitation_basis: z.enum([
      "blueprint_hypothesis_statement",
      "internal_placeholder_not_elicited"
    ]),
    // The current standard-normal prior is a placeholder and must say so.
    is_weakly_regularizing_placeholder: z.boolean(),
    placeholder_state: z
      .literal(WEAKLY_REGULARIZING_PLACEHOLDER_STATE)
      .nullable(),
    provenance_version: z.string().min(1),
    // Provenance only: numeric prior parameters are never carried here,
    // so nothing in this record can be read as model output.
    numeric_prior_parameters_present: z.literal(false)
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.is_weakly_regularizing_placeholder && value.placeholder_state === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["placeholder_state"],
        message:
          "placeholder priors must be explicitly labeled " +
          WEAKLY_REGULARIZING_PLACEHOLDER_STATE
      });
    }
    if (!value.is_weakly_regularizing_placeholder && value.placeholder_state !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["placeholder_state"],
        message: "non-placeholder priors must not carry a placeholder label"
      });
    }
    if (
      !value.is_weakly_regularizing_placeholder &&
      value.elicitation_basis !== "blueprint_hypothesis_statement"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["elicitation_basis"],
        message:
          "non-placeholder priors must be elicited from a Blueprint hypothesis statement"
      });
    }
  });

export type BlueprintHypothesisRef = z.infer<typeof BlueprintHypothesisRefSchema>;
export type BlueprintDerivedPriorProvenance = z.infer<
  typeof BlueprintDerivedPriorProvenanceSchema
>;

// ---------------------------------------------------------------------------
// 2. EvidenceAdmission — reason-coded, aggregate-only, fail-closed
// ---------------------------------------------------------------------------

export const MilestoneDaySchema = z.union([
  z.literal(0),
  z.literal(30),
  z.literal(60),
  z.literal(90),
  z.literal(180),
  z.literal(365)
]);

export const EvidenceAdmissionReasonCodeSchema = z.enum(
  EVIDENCE_ADMISSION_REASON_CODES
);
export const EvidenceRejectionReasonCodeSchema = z.enum(
  EVIDENCE_REJECTION_REASON_CODES
);

// SHA-256 hex digest shape shared by every hash-valued field in this module
// (source snapshot binding below, posterior artifact binding in section 5).
// Hash fields must never accept arbitrary payload-bearing strings.
const Sha256HexSchema = z.string().regex(/^[0-9a-f]{64}$/);

// Compact, org-scoped source reference only — never person-level identifiers.
export const CompactObservationSourceRefSchema = z
  .object({
    series_ref: z.string().min(1),
    org_scope: z.string().min(1),
    source_snapshot_hash: Sha256HexSchema
  })
  .strict();

const evidenceAdmissionCommonFields = {
  source_consumer: z.literal(INTERNAL_CONFIDENCE_CONSUMER_TOKEN),
  read_path_decision_schema_version: z.literal(
    CONFIDENCE_ENGINE_SERIES_READ_PATH_DECISION_SCHEMA_VERSION_REF
  ),
  observation_requirement_schema_version: z.literal(
    CONFIDENCE_OBSERVATION_REQUIREMENT_SCHEMA_VERSION_REF
  ),
  person_level_identifiers_present: z.literal(false)
} as const;

export const EvidenceAdmittedSchema = z
  .object({
    ...evidenceAdmissionCommonFields,
    admission_state: z.literal("admitted"),
    source_ref: CompactObservationSourceRefSchema,
    milestone_day: MilestoneDaySchema,
    gate_cleared: z.literal(true),
    append_only: z.literal(true),
    compact_refs_only: z.literal(true),
    org_scoped: z.literal(true),
    aggregate_only: z.literal(true),
    minimum_cohort_floor: z
      .number()
      .int()
      .gte(CONFIDENCE_MODEL_MINIMUM_COHORT_FLOOR),
    cohort_size: z.number().int().gte(CONFIDENCE_MODEL_MINIMUM_COHORT_FLOOR),
    admission_reason_codes: z
      .array(EvidenceAdmissionReasonCodeSchema)
      .nonempty()
  })
  .strict()
  .superRefine((value, ctx) => {
    // Admitted observations are series-sourced (source_ref carries a
    // series_ref), so the governing series read-path decision contract's
    // minimum_cohort_size of 10 binds: a declared floor below 10 would
    // admit cohorts the read-path gate disallows.
    if (value.minimum_cohort_floor < CONFIDENCE_SERIES_READ_PATH_COHORT_FLOOR) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["minimum_cohort_floor"],
        message:
          "series-sourced admission must declare minimum_cohort_floor >= " +
          `${CONFIDENCE_SERIES_READ_PATH_COHORT_FLOOR} (the series read-path ` +
          "decision contract's minimum_cohort_size)"
      });
    }
    if (value.cohort_size < value.minimum_cohort_floor) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cohort_size"],
        message: "cohort_size must meet the stated minimum_cohort_floor"
      });
    }
  });

export const EvidenceRejectedSchema = z
  .object({
    ...evidenceAdmissionCommonFields,
    admission_state: z.literal("rejected_fail_closed"),
    fail_closed: z.literal(true),
    admitted: z.literal(false),
    // The day the rejected observation claimed; not constrained to the
    // contract milestones because being off-milestone is itself a rejection.
    observed_milestone_day: z.number().int().nonnegative().nullable(),
    rejection_reason_codes: z
      .array(EvidenceRejectionReasonCodeSchema)
      .nonempty()
  })
  .strict();

export const EvidenceAdmissionSchema = z.union([
  EvidenceAdmittedSchema,
  EvidenceRejectedSchema
]);

export type MilestoneDay = z.infer<typeof MilestoneDaySchema>;
export type EvidenceAdmissionReasonCode = z.infer<
  typeof EvidenceAdmissionReasonCodeSchema
>;
export type EvidenceRejectionReasonCode = z.infer<
  typeof EvidenceRejectionReasonCodeSchema
>;
export type CompactObservationSourceRef = z.infer<
  typeof CompactObservationSourceRefSchema
>;
export type EvidenceAdmitted = z.infer<typeof EvidenceAdmittedSchema>;
export type EvidenceRejected = z.infer<typeof EvidenceRejectedSchema>;
export type EvidenceAdmission = z.infer<typeof EvidenceAdmissionSchema>;

// ---------------------------------------------------------------------------
// 3. PosteriorWithCredibleIntervals — internal-only representation shape
// ---------------------------------------------------------------------------

export const CredibleIntervalLevelSchema = z.union([
  z.literal(0.5),
  z.literal(0.8),
  z.literal(0.95)
]);

// Representation shape only: it names the estimand and the interval levels
// the posterior would be summarized at, and pins that numeric posterior
// values are withheld. Never point estimates; never numeric output.
export const PosteriorWithCredibleIntervalsSchema = z
  .object({
    representation_class: z.literal("credible_intervals_only"),
    parameter_name: z.string().min(1),
    credible_interval_levels: z
      .array(CredibleIntervalLevelSchema)
      .nonempty()
      .superRefine((levels, ctx) => {
        if (new Set(levels).size !== levels.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "credible_interval_levels must be unique"
          });
        }
      }),
    point_estimate_output_authorized: z.literal(false),
    numeric_posterior_values_withheld: z.literal(true),
    internal_only: z.literal(true),
    customer_output_authorized: z.literal(false),
    confidence_output_authorized: z.literal(false),
    probability_output_authorized: z.literal(false),
    finance_output_authorized: z.literal(false)
  })
  .strict();

export type CredibleIntervalLevel = z.infer<typeof CredibleIntervalLevelSchema>;
export type PosteriorWithCredibleIntervals = z.infer<
  typeof PosteriorWithCredibleIntervalsSchema
>;

// ---------------------------------------------------------------------------
// 4. ConfidenceModelContract — aggregate contract with governance pins
// ---------------------------------------------------------------------------

export const ConfidenceModelBlockedUseSchema = z.enum(
  CONFIDENCE_MODEL_BLOCKED_USES
);

export const ConfidenceModelContractSchema = z
  .object({
    schema_version: z.literal(CONFIDENCE_MODEL_CONTRACT_SCHEMA_VERSION),
    contract_class: z.literal("types_and_schemas_only"),
    execution_authorized: z.literal(false),
    inference_authorized: z.literal(false),
    output_authorized: z.literal(false),
    internal_only: z.literal(true),
    runtime_hold_state: z.literal(CONFIDENCE_MODEL_RUNTIME_HOLD_STATE),
    prior_provenance: BlueprintDerivedPriorProvenanceSchema,
    evidence_admissions: z.array(EvidenceAdmissionSchema),
    posterior_representation: PosteriorWithCredibleIntervalsSchema,
    blocked_uses: z
      .array(ConfidenceModelBlockedUseSchema)
      .superRefine((uses, ctx) => {
        const expected = CONFIDENCE_MODEL_BLOCKED_USES;
        const matches =
          uses.length === expected.length &&
          uses.every((use, index) => use === expected[index]);
        if (!matches) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "blocked_uses must pin the full CONFIDENCE_MODEL_BLOCKED_USES list in order"
          });
        }
      })
  })
  .strict();

export type ConfidenceModelBlockedUse = z.infer<
  typeof ConfidenceModelBlockedUseSchema
>;
export type ConfidenceModelContract = z.infer<
  typeof ConfidenceModelContractSchema
>;

// ---------------------------------------------------------------------------
// 5. Internal-only probability representations — ADDITIVE (types + Zod only)
//
// Added under OpenSpec change add-bayesian-inference-proof-harness (task 2.2,
// slice 1). Both representations are internal diagnostic shapes for the
// inference methodology contract: threshold probability
// P(effect > minimum worthwhile threshold) and expected loss for the
// stop/act decision rule. Neither shape is customer output; both pin
// `internal_only: true`, `customer_output_authorized: false`, and a
// `promotion_decision_ref` that MUST be null — exposure of any probability
// language requires a separate later recorded human promotion decision,
// and no promotion ref may be carried by these schemas.
// ---------------------------------------------------------------------------

export const THRESHOLD_PROBABILITY_REPRESENTATION_SCHEMA_VERSION =
  "FT_AI_VALUE_CONFIDENCE_THRESHOLD_PROBABILITY_REPRESENTATION_2026_07";

export const EXPECTED_LOSS_REPRESENTATION_SCHEMA_VERSION =
  "FT_AI_VALUE_CONFIDENCE_EXPECTED_LOSS_REPRESENTATION_2026_07";

export const INFERENCE_PROOF_ARTIFACT_SCHEMA_VERSION =
  "FT_AI_VALUE_CONFIDENCE_INFERENCE_PROOF_ARTIFACT_2026_07";

// Provisional compiled constant: the act/hold decision boundary for the
// expected-loss decision rule. Thresholds are compiled constants, never
// runtime-tunable; revising this value requires a contract change (the
// slice-1 methodology contract's expert review may adjust it).
export const EXPECTED_LOSS_DECISION_THRESHOLD_EPSILON = 0.01;

// Provisional compiled constant: the minimum worthwhile effect threshold,
// in standardized effect (SD) units — matches the harness's injected
// effect grid {0, 0.2, 0.5}. Thresholds are compiled constants, never
// runtime-tunable; revising this value requires a contract change (the
// slice-1 methodology contract's expert review may adjust it).
export const MINIMUM_WORTHWHILE_EFFECT_THRESHOLD = 0.2;

export const INFERENCE_PROOF_RHAT_MAX = 1.01;
export const INFERENCE_PROOF_ESS_MIN = 400;
export const INFERENCE_PROOF_PPC_P_VALUE_MIN = 0.05;
export const INFERENCE_PROOF_PPC_P_VALUE_MAX = 0.95;
export const INFERENCE_PROOF_PRIOR_SENSITIVITY_MAX_POSTERIOR_SD = 0.5;
export const INFERENCE_PROOF_CALIBRATION_COVERAGE_MIN = 0.74;
export const INFERENCE_PROOF_CALIBRATION_COVERAGE_MAX = 0.86;
export const INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN = 200;
export const INFERENCE_PROOF_NULL_FALSE_ELIGIBILITY_MAX = 0.05;
export const INFERENCE_PROOF_MCSE_TO_POSTERIOR_SD_RATIO_MAX = 0.1;

// Internal diagnostic representation of P(effect > minimum worthwhile
// threshold). Derives from the credible-interval-only posterior
// representation above and never authorizes customer-facing output.
export const ThresholdProbabilityRepresentationSchema = z
  .object({
    schema_version: z.literal(
      THRESHOLD_PROBABILITY_REPRESENTATION_SCHEMA_VERSION
    ),
    representation_class: z.literal(
      "internal_diagnostic_representation_only"
    ),
    internal_only: z.literal(true),
    customer_output_authorized: z.literal(false),
    // Same output-authorization pins as PosteriorWithCredibleIntervalsSchema:
    // no probability, confidence, or finance output may be authorized.
    probability_output_authorized: z.literal(false),
    confidence_output_authorized: z.literal(false),
    finance_output_authorized: z.literal(false),
    // Null until a separate later human promotion decision. This schema
    // intentionally cannot carry a non-null promotion reference: promotion
    // is recorded elsewhere, by a human, after this artifact exists.
    promotion_decision_ref: z.null(),
    parameter_name: z.string().min(1),
    // Pinned compiled threshold with explicit units — the threshold value
    // travels with the artifact so P(effect > threshold) stays auditable.
    minimum_worthwhile_threshold: z.literal(
      MINIMUM_WORTHWHILE_EFFECT_THRESHOLD
    ),
    threshold_units: z.literal("standardized_effect_sd"),
    // P(effect > minimum worthwhile threshold), bounded [0, 1].
    threshold_probability: z.number().gte(0).lte(1),
    // The credible-interval level context this diagnostic derives from
    // (must be one of CREDIBLE_INTERVAL_LEVELS).
    credible_interval_level_context: CredibleIntervalLevelSchema,
    // Linkage pin: this representation is derived from the
    // PosteriorWithCredibleIntervals shape, never computed independently.
    derived_from_posterior_with_credible_intervals: z.literal(true),
    // Hash binding to the source posterior artifact. The schema enforces
    // internal consistency (parameter names must match); the TS gate
    // verifies the hash against the actual posterior artifact.
    source_posterior_parameter_name: z.string().min(1),
    source_posterior_artifact_hash: Sha256HexSchema
  })
  .strict()
  .superRefine((representation, ctx) => {
    if (
      representation.source_posterior_parameter_name !==
      representation.parameter_name
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          `source_posterior_parameter_name "${representation.source_posterior_parameter_name}" ` +
          `does not match parameter_name "${representation.parameter_name}"`
      });
    }
  });

// Internal expected-loss representation for the stop/act decision rule.
// Same governance pins as the threshold-probability representation.
export const ExpectedLossRepresentationSchema = z
  .object({
    schema_version: z.literal(EXPECTED_LOSS_REPRESENTATION_SCHEMA_VERSION),
    representation_class: z.literal(
      "internal_diagnostic_representation_only"
    ),
    internal_only: z.literal(true),
    customer_output_authorized: z.literal(false),
    // Same output-authorization pins as PosteriorWithCredibleIntervalsSchema:
    // no probability, confidence, or finance output may be authorized.
    probability_output_authorized: z.literal(false),
    confidence_output_authorized: z.literal(false),
    finance_output_authorized: z.literal(false),
    // Null until a separate later human promotion decision (see above).
    promotion_decision_ref: z.null(),
    parameter_name: z.string().min(1),
    loss_function_declared: z.literal(true),
    expected_loss: z.number().gte(0),
    // Pinned compiled act/hold boundary — never runtime-tunable.
    decision_threshold_epsilon: z.literal(
      EXPECTED_LOSS_DECISION_THRESHOLD_EPSILON
    ),
    decision_rule: z.literal(
      "act_when_expected_loss_below_epsilon_internal_only"
    ),
    // Hash binding to the same source posterior artifact (expected loss
    // derives from the same posterior and has the same forgery surface).
    source_posterior_parameter_name: z.string().min(1),
    source_posterior_artifact_hash: Sha256HexSchema
  })
  .strict()
  .superRefine((representation, ctx) => {
    if (
      representation.source_posterior_parameter_name !==
      representation.parameter_name
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          `source_posterior_parameter_name "${representation.source_posterior_parameter_name}" ` +
          `does not match parameter_name "${representation.parameter_name}"`
      });
    }
  });

export type ThresholdProbabilityRepresentation = z.infer<
  typeof ThresholdProbabilityRepresentationSchema
>;
export type ExpectedLossRepresentation = z.infer<
  typeof ExpectedLossRepresentationSchema
>;

// ---------------------------------------------------------------------------
// 6. InferenceProofArtifact — internal synthetic proof boundary
//
// This schema is the TypeScript boundary for the future Slice 2 Python proof
// harness. It is NOT a customer-facing emitted artifact and does not authorize
// inference execution in TypeScript. Python may carry numeric diagnostic values
// here so TypeScript can validate/hold them; PosteriorWithCredibleIntervals
// above remains numeric-values-withheld for any readout-shaped contract.
// ---------------------------------------------------------------------------

const OrderedConfidenceModelBlockedUsesSchema = z
  .array(ConfidenceModelBlockedUseSchema)
  .superRefine((uses, ctx) => {
    const expected = CONFIDENCE_MODEL_BLOCKED_USES;
    const matches =
      uses.length === expected.length &&
      uses.every((use, index) => use === expected[index]);
    if (!matches) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "blocked_uses must pin the full CONFIDENCE_MODEL_BLOCKED_USES list in order"
      });
    }
  });

export const InferenceProofGovernanceStateSchema = z.enum([
  "eligible_internal_only",
  "HOLD"
]);

export const InferenceProofFailingDiagnosticSchema = z.enum([
  "r_hat",
  "bulk_ess",
  "tail_ess",
  "divergences",
  "mcse",
  "posterior_predictive_check",
  "prior_sensitivity",
  "pre_trend",
  "calibration_coverage",
  "null_false_eligibility",
  "floor_check",
  "peeking_control",
  "comparison_cohort_adequacy",
  "missing_or_suppressed_windows"
]);

export const InferenceProofLikelihoodFamilySchema = z.enum([
  "normal_continuous_aggregate",
  "binomial_rate_aggregate",
  "beta_binomial_rate_aggregate",
  "poisson_count_aggregate",
  "negative_binomial_count_aggregate"
]);

const NonNegativeFiniteNumberSchema = z.number().finite().gte(0);
const FiniteNumberSchema = z.number().finite();

const InferenceProofSeedRangeSchema = z
  .object({
    start_seed: z.number().int().nonnegative(),
    end_seed: z.number().int().nonnegative()
  })
  .strict()
  .superRefine((range, ctx) => {
    if (range.end_seed < range.start_seed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["end_seed"],
        message: "end_seed must be greater than or equal to start_seed"
      });
    }
  });

export const InferenceProofSyntheticGeneratorSchema = z
  .object({
    generator_id: z.string().min(1),
    generator_version: z.string().min(1),
    seed_range: InferenceProofSeedRangeSchema,
    synthetic_input_hash: Sha256HexSchema,
    real_data_present: z.literal(false),
    customer_data_present: z.literal(false),
    production_data_present: z.literal(false),
    live_data_source_present: z.literal(false)
  })
  .strict();

export const InferenceProofModelSpecBindingSchema = z
  .object({
    model_family: z.literal(
      "bayesian_hierarchical_difference_in_differences_candidate"
    ),
    estimand_name: z.literal("aggregate_selected_metric_movement"),
    estimand_units: z.enum([
      "standardized_effect_sd",
      "raw_metric_units_internal_only"
    ]),
    likelihood_family: InferenceProofLikelihoodFamilySchema,
    link_function: z.enum(["identity", "logit", "log"]),
    aggregate_cell_variance_mode: z.enum([
      "cohort_size_weighted_known_variance",
      "estimated_overdispersion_internal_only"
    ]),
    cohort_size_enters_likelihood: z.literal(true),
    missing_or_suppressed_windows_hold: z.literal(true),
    treatment_effect_pooling: z.enum([
      "global",
      "workflow",
      "function",
      "cohort"
    ]),
    pooling_structure: z
      .object({
        expectation_path: z.literal(true),
        workflow: z.literal(true),
        function: z.literal(true),
        cohort: z.literal(true),
        organization: z.literal(true)
      })
      .strict()
  })
  .strict();

const InferenceProofCredibleInterval80Schema = z
  .object({
    lower: FiniteNumberSchema,
    upper: FiniteNumberSchema
  })
  .strict()
  .superRefine((interval, ctx) => {
    if (interval.upper < interval.lower) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["upper"],
        message: "credible interval upper bound must be >= lower bound"
      });
    }
  });

export const InferenceProofParameterDiagnosticSchema = z
  .object({
    parameter_name: z.string().min(1),
    r_hat: NonNegativeFiniteNumberSchema,
    bulk_ess: NonNegativeFiniteNumberSchema,
    tail_ess: NonNegativeFiniteNumberSchema,
    posterior_mean_mcse: NonNegativeFiniteNumberSchema,
    interval_endpoint_mcse: NonNegativeFiniteNumberSchema,
    posterior_sd: NonNegativeFiniteNumberSchema,
    max_mcse_to_posterior_sd_ratio: NonNegativeFiniteNumberSchema
  })
  .strict();

export const InferenceProofSamplerDiagnosticsSchema = z
  .object({
    parameters: z.array(InferenceProofParameterDiagnosticSchema).nonempty(),
    post_warmup_divergences: z.number().int().nonnegative(),
    max_treedepth_saturation_rate: z.number().finite().gte(0).lte(1),
    energy_bfmi_min: NonNegativeFiniteNumberSchema,
    rank_plots_recorded: z.literal(true),
    energy_plots_recorded: z.literal(true)
  })
  .strict();

export const InferenceProofPpcStatisticSchema = z
  .object({
    statistic_name: z.enum([
      "pre_post_mean_movement",
      "between_cohort_variance",
      "within_cohort_variance",
      "tail_or_extreme_cell_statistic",
      "difference_in_differences_contrast"
    ]),
    observed_value: FiniteNumberSchema,
    posterior_predictive_summary: z
      .object({
        mean: FiniteNumberSchema,
        credible_interval_80: InferenceProofCredibleInterval80Schema
      })
      .strict(),
    p_value: z.number().finite().gte(0).lte(1),
    pass: z.boolean()
  })
  .strict();

export const InferenceProofPriorSensitivitySchema = z
  .object({
    posterior_mean_shift_in_posterior_sd: NonNegativeFiniteNumberSchema,
    pass: z.boolean()
  })
  .strict();

export const InferenceProofPreTrendCheckSchema = z
  .object({
    pseudo_effect_credible_interval_80: InferenceProofCredibleInterval80Schema,
    includes_zero: z.boolean(),
    pass: z.boolean()
  })
  .strict();

export const InferenceProofDiagnosticsSchema = z
  .object({
    sampler: InferenceProofSamplerDiagnosticsSchema,
    posterior_predictive_checks: z
      .array(InferenceProofPpcStatisticSchema)
      .nonempty(),
    prior_sensitivity: InferenceProofPriorSensitivitySchema,
    pre_trend: InferenceProofPreTrendCheckSchema
  })
  .strict()
  .superRefine((diagnostics, ctx) => {
    const expected = [
      "pre_post_mean_movement",
      "between_cohort_variance",
      "within_cohort_variance",
      "tail_or_extreme_cell_statistic",
      "difference_in_differences_contrast"
    ] as const;
    const observed = diagnostics.posterior_predictive_checks.map(
      (statistic) => statistic.statistic_name
    );
    for (const statisticName of expected) {
      if (!observed.includes(statisticName)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["posterior_predictive_checks"],
          message: `posterior_predictive_checks must include ${statisticName}`
        });
      }
    }
    if (new Set(observed).size !== observed.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["posterior_predictive_checks"],
        message: "posterior_predictive_checks must not duplicate statistic_name"
      });
    }
  });

export const InferenceProofCalibrationScenarioSchema = z
  .object({
    scenario_id: z.string().min(1),
    injected_effect_size_sd: z.union([
      z.literal(0),
      z.literal(0.2),
      z.literal(0.5)
    ]),
    cohort_size: z.union([z.literal(12), z.literal(16)]),
    replication_count: z
      .number()
      .int()
      .gte(INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN),
    credible_interval_level: z.literal(0.8),
    coverage_rate: z.number().finite().gte(0).lte(1),
    coverage_standard_error: NonNegativeFiniteNumberSchema,
    pass: z.boolean()
  })
  .strict();

export const InferenceProofCalibrationSchema = z
  .object({
    scenarios: z.array(InferenceProofCalibrationScenarioSchema).nonempty(),
    per_scenario_required: z.literal(true)
  })
  .strict()
  .superRefine((calibration, ctx) => {
    const required = [
      "0:12",
      "0:16",
      "0.2:12",
      "0.2:16",
      "0.5:12",
      "0.5:16"
    ];
    const observed = calibration.scenarios.map(
      (scenario) => `${scenario.injected_effect_size_sd}:${scenario.cohort_size}`
    );
    for (const cell of required) {
      if (!observed.includes(cell)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["scenarios"],
          message:
            "calibration scenarios must include every effect-size/cohort-size cell"
        });
      }
    }
    if (new Set(observed).size !== observed.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scenarios"],
        message: "calibration scenarios must not duplicate effect/cohort cells"
      });
    }
  });

export const InferenceProofNullChecksSchema = z
  .object({
    null_effect_scenario_count: z
      .number()
      .int()
      .gte(INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN),
    false_eligibility_rate: z.number().finite().gte(0).lte(1),
    pass: z.boolean()
  })
  .strict();

export const InferenceProofFloorChecksSchema = z
  .object({
    k4_rejected: z
      .object({
        cohort_size: z.literal(4),
        outcome: z.literal("rejected_below_schema_floor"),
        pass: z.literal(true)
      })
      .strict(),
    k8_internal_only: z
      .object({
        cohort_size: z.literal(8),
        outcome: z.literal("internal_only_display_ineligible"),
        valid_internal: z.literal(true),
        display_eligible: z.literal(false),
        pass: z.literal(true)
      })
      .strict(),
    eligible_floor_cases: z
      .array(
        z
          .object({
            cohort_size: z.union([z.literal(12), z.literal(16)]),
            valid_internal: z.literal(true),
            display_eligible: z.literal(true),
            pass: z.literal(true)
          })
          .strict()
      )
      .length(2)
  })
  .strict()
  .superRefine((checks, ctx) => {
    const sizes = checks.eligible_floor_cases.map((check) => check.cohort_size);
    if (!sizes.includes(12) || !sizes.includes(16)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["eligible_floor_cases"],
        message: "eligible_floor_cases must include k=12 and k=16"
      });
    }
  });

export const InferenceProofPeekingControlSchema = z
  .object({
    procedure: z.enum([
      "fixed_horizon_one_look_only",
      "always_valid_sequential_procedure_proven"
    ]),
    repeated_evaluation: z.boolean(),
    look_index: z.number().int().positive(),
    total_planned_looks: z.number().int().positive(),
    milestone_days_included: z.array(MilestoneDaySchema).nonempty(),
    metrics_included: z.array(z.string().min(1)).nonempty(),
    cohorts_included: z.array(z.string().min(1)).nonempty(),
    sequential_method_name: z.string().min(1).nullable(),
    synthetic_null_proof_hash: Sha256HexSchema.nullable(),
    false_eligibility_bound: z.literal(
      INFERENCE_PROOF_NULL_FALSE_ELIGIBILITY_MAX
    ),
    pass: z.boolean()
  })
  .strict()
  .superRefine((control, ctx) => {
    if (control.procedure === "fixed_horizon_one_look_only") {
      if (control.repeated_evaluation) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["repeated_evaluation"],
          message: "fixed-horizon proof artifacts must not use repeated evaluation"
        });
      }
      if (control.look_index !== 1 || control.total_planned_looks !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["look_index"],
          message: "fixed-horizon proof artifacts must carry exactly one look"
        });
      }
      if (control.milestone_days_included.length !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["milestone_days_included"],
          message: "fixed-horizon proof artifacts must include exactly one milestone"
        });
      }
      if (
        control.sequential_method_name !== null ||
        control.synthetic_null_proof_hash !== null
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sequential_method_name"],
          message: "fixed-horizon proof artifacts must not claim sequential proof"
        });
      }
    }
    if (control.procedure === "always_valid_sequential_procedure_proven") {
      if (!control.repeated_evaluation) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["repeated_evaluation"],
          message: "always-valid proof must declare repeated evaluation"
        });
      }
      if (
        control.sequential_method_name === null ||
        control.synthetic_null_proof_hash === null
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["synthetic_null_proof_hash"],
          message:
            "always-valid proof requires a named method and synthetic null proof hash"
        });
      }
    }
  });

export const InferenceProofGovernanceSchema = z
  .object({
    state: InferenceProofGovernanceStateSchema,
    failing_diagnostics: z.array(InferenceProofFailingDiagnosticSchema),
    comparison_supported_contribution_estimate_authorized: z.boolean(),
    evidence_tier_only: z.boolean()
  })
  .strict();

export const InferenceProofHashBindingsSchema = z
  .object({
    source_posterior_hash: Sha256HexSchema,
    synthetic_input_hash: Sha256HexSchema,
    artifact_self_hash: Sha256HexSchema
  })
  .strict();

export const InferenceProofArtifactSchema = z
  .object({
    schema_version: z.literal(INFERENCE_PROOF_ARTIFACT_SCHEMA_VERSION),
    artifact_class: z.literal("internal_synthetic_inference_proof"),
    generated_at: z.string().min(1),
    harness_version: z.string().min(1),
    lockfile_hash: Sha256HexSchema,
    synthetic_generator: InferenceProofSyntheticGeneratorSchema,
    model_spec_binding: InferenceProofModelSpecBindingSchema,
    diagnostics: InferenceProofDiagnosticsSchema,
    calibration: InferenceProofCalibrationSchema,
    null_checks: InferenceProofNullChecksSchema,
    floor_checks: InferenceProofFloorChecksSchema,
    peeking_control: InferenceProofPeekingControlSchema,
    governance_state: InferenceProofGovernanceSchema,
    hash_bindings: InferenceProofHashBindingsSchema,
    blocked_uses: OrderedConfidenceModelBlockedUsesSchema,
    numeric_values_role: z.literal("internal_validation_inputs_not_output"),
    numeric_posterior_values_customer_authorized: z.literal(false),
    internal_only: z.literal(true),
    customer_output_authorized: z.literal(false),
    probability_output_authorized: z.literal(false),
    confidence_output_authorized: z.literal(false),
    finance_output_authorized: z.literal(false),
    creates_route: z.literal(false),
    creates_ui: z.literal(false),
    writes_persistence: z.literal(false),
    creates_export: z.literal(false),
    renders_readout: z.literal(false),
    executes_connector: z.literal(false),
    promotion_decision_ref: z.null()
  })
  .strict()
  .superRefine((artifact, ctx) => {
    if (
      artifact.hash_bindings.synthetic_input_hash !==
      artifact.synthetic_generator.synthetic_input_hash
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hash_bindings", "synthetic_input_hash"],
        message:
          "hash_bindings.synthetic_input_hash must match synthetic_generator.synthetic_input_hash"
      });
    }

    const failing = new Set(artifact.governance_state.failing_diagnostics);
    if (
      artifact.governance_state.state === "eligible_internal_only" &&
      failing.size > 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["governance_state", "failing_diagnostics"],
        message: "eligible_internal_only artifacts must not name failing diagnostics"
      });
    }
    if (artifact.governance_state.state === "HOLD" && failing.size === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["governance_state", "failing_diagnostics"],
        message: "HOLD artifacts must name at least one failing diagnostic"
      });
    }

    const failOrIssue = (
      diagnostic: z.infer<typeof InferenceProofFailingDiagnosticSchema>,
      path: (string | number)[],
      message: string
    ) => {
      if (artifact.governance_state.state === "eligible_internal_only") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path,
          message
        });
      } else if (!failing.has(diagnostic)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["governance_state", "failing_diagnostics"],
          message: `HOLD artifacts must name failing diagnostic ${diagnostic}`
        });
      }
    };

    for (const [index, parameter] of artifact.diagnostics.sampler.parameters.entries()) {
      if (parameter.r_hat > INFERENCE_PROOF_RHAT_MAX) {
        failOrIssue(
          "r_hat",
          ["diagnostics", "sampler", "parameters", index, "r_hat"],
          `r_hat must be <= ${INFERENCE_PROOF_RHAT_MAX} for eligible artifacts`
        );
      }
      if (parameter.bulk_ess < INFERENCE_PROOF_ESS_MIN) {
        failOrIssue(
          "bulk_ess",
          ["diagnostics", "sampler", "parameters", index, "bulk_ess"],
          `bulk_ess must be >= ${INFERENCE_PROOF_ESS_MIN} for eligible artifacts`
        );
      }
      if (parameter.tail_ess < INFERENCE_PROOF_ESS_MIN) {
        failOrIssue(
          "tail_ess",
          ["diagnostics", "sampler", "parameters", index, "tail_ess"],
          `tail_ess must be >= ${INFERENCE_PROOF_ESS_MIN} for eligible artifacts`
        );
      }
      if (
        parameter.max_mcse_to_posterior_sd_ratio >
        INFERENCE_PROOF_MCSE_TO_POSTERIOR_SD_RATIO_MAX
      ) {
        failOrIssue(
          "mcse",
          [
            "diagnostics",
            "sampler",
            "parameters",
            index,
            "max_mcse_to_posterior_sd_ratio"
          ],
          "MCSE must be small relative to posterior SD for eligible artifacts"
        );
      }
    }

    if (artifact.diagnostics.sampler.post_warmup_divergences > 0) {
      failOrIssue(
        "divergences",
        ["diagnostics", "sampler", "post_warmup_divergences"],
        "eligible artifacts must have zero post-warmup divergences"
      );
    }

    for (const [index, statistic] of artifact.diagnostics.posterior_predictive_checks.entries()) {
      if (
        !statistic.pass ||
        statistic.p_value < INFERENCE_PROOF_PPC_P_VALUE_MIN ||
        statistic.p_value > INFERENCE_PROOF_PPC_P_VALUE_MAX
      ) {
        failOrIssue(
          "posterior_predictive_check",
          ["diagnostics", "posterior_predictive_checks", index, "p_value"],
          "posterior predictive checks must pass within the configured p-value band"
        );
      }
    }

    if (
      !artifact.diagnostics.prior_sensitivity.pass ||
      artifact.diagnostics.prior_sensitivity
        .posterior_mean_shift_in_posterior_sd >=
        INFERENCE_PROOF_PRIOR_SENSITIVITY_MAX_POSTERIOR_SD
    ) {
      failOrIssue(
        "prior_sensitivity",
        ["diagnostics", "prior_sensitivity"],
        "prior sensitivity must stay below the posterior-SD shift gate"
      );
    }

    if (
      !artifact.diagnostics.pre_trend.pass ||
      !artifact.diagnostics.pre_trend.includes_zero
    ) {
      failOrIssue(
        "pre_trend",
        ["diagnostics", "pre_trend"],
        "pre-trend 80% credible interval must include zero"
      );
    }

    for (const [index, scenario] of artifact.calibration.scenarios.entries()) {
      if (
        !scenario.pass ||
        scenario.coverage_rate < INFERENCE_PROOF_CALIBRATION_COVERAGE_MIN ||
        scenario.coverage_rate > INFERENCE_PROOF_CALIBRATION_COVERAGE_MAX
      ) {
        failOrIssue(
          "calibration_coverage",
          ["calibration", "scenarios", index, "coverage_rate"],
          "calibration coverage must pass within the configured per-scenario band"
        );
      }
    }

    if (
      !artifact.null_checks.pass ||
      artifact.null_checks.false_eligibility_rate >
        INFERENCE_PROOF_NULL_FALSE_ELIGIBILITY_MAX
    ) {
      failOrIssue(
        "null_false_eligibility",
        ["null_checks", "false_eligibility_rate"],
        "null false-eligibility must stay within the configured bound"
      );
    }

    if (!artifact.peeking_control.pass) {
      failOrIssue(
        "peeking_control",
        ["peeking_control", "pass"],
        "peeking control must pass for eligible artifacts"
      );
    }
  });

export type InferenceProofGovernanceState = z.infer<
  typeof InferenceProofGovernanceStateSchema
>;
export type InferenceProofFailingDiagnostic = z.infer<
  typeof InferenceProofFailingDiagnosticSchema
>;
export type InferenceProofLikelihoodFamily = z.infer<
  typeof InferenceProofLikelihoodFamilySchema
>;
export type InferenceProofArtifact = z.infer<
  typeof InferenceProofArtifactSchema
>;
