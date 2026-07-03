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
// matches the repo-wide minimum_cohort_threshold >= 5 convention).
export const CONFIDENCE_MODEL_MINIMUM_COHORT_FLOOR = 5;

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

// Compact, org-scoped source reference only — never person-level identifiers.
export const CompactObservationSourceRefSchema = z
  .object({
    series_ref: z.string().min(1),
    org_scope: z.string().min(1),
    source_snapshot_hash: z.string().min(1)
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
