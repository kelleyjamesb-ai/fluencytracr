import { z } from "zod";

import {
  AGGREGATE_CLAIM_CAVEATS,
  AggregateClaimMetricIdSchema,
  AggregateClaimMeasurementUnitSchema,
  AggregateClaimPolicyStateSchema,
  AggregateObservedMovementSchema
} from "./aggregateClaimAuthorization";
import type { AggregateClaimPolicyState, AggregateObservedMovement } from "./aggregateClaimAuthorization";

export const CANONICAL_CLAIM_TRACE_SCHEMA_VERSION = "FT_CANONICAL_CLAIM_TRACE_V1" as const;

export const CanonicalClaimTraceApprovedDirectionSchema = z.enum([
  "INCREASE",
  "DECREASE",
  "MAINTAIN",
  "MONITOR",
  "NO_CHANGE"
]);

const PositiveVersionSchema = z.number().int().positive();
const ExactCaveatsSchema = z
  .array(z.string())
  .length(AGGREGATE_CLAIM_CAVEATS.length)
  .refine((value) => value.every((entry, index) => entry === AGGREGATE_CLAIM_CAVEATS[index]), {
    message: "canonical claim trace caveats must match the fixed template"
  });

const CanonicalClaimTraceStagesSchema = z
  .object({
    hypothesis: z.object({ approval_state: z.literal("APPROVED"), version: PositiveVersionSchema }).strict(),
    measurement: z
      .object({
        approval_state: z.literal("APPROVED"),
        plan_version: PositiveVersionSchema,
        cell_version: PositiveVersionSchema,
        metric_id: AggregateClaimMetricIdSchema,
        measurement_unit: AggregateClaimMeasurementUnitSchema,
        approved_direction: CanonicalClaimTraceApprovedDirectionSchema,
        aggregate_only: z.literal(true)
      })
      .strict(),
    evidence: z
      .object({
        schema_state: z.literal("VALID"),
        review_state: z.literal("ACCEPTED"),
        admission_state: z.literal("ADMITTED"),
        comparison_privacy_state: z.literal("ATOMIC_COMPARISON_PRIVACY_RELEASED")
      })
      .strict(),
    policy: AggregateClaimPolicyStateSchema,
    claim: z.object({ movement: AggregateObservedMovementSchema, caveats: ExactCaveatsSchema }).strict(),
    readout: z
      .object({
        canonical_identity_state: z.literal("BOUND"),
        current_state: z.literal("CURRENT"),
        source_bound: z.literal(true),
        mutation_authorized: z.literal(false),
        export_authorized: z.literal(false),
        customer_facing_output_authorized: z.literal(false)
      })
      .strict()
  })
  .strict();

export const CanonicalClaimTraceAuthorizedSchema = z
  .object({
    schema_version: z.literal(CANONICAL_CLAIM_TRACE_SCHEMA_VERSION),
    trace_state: z.literal("AUTHORIZED"),
    source_bound: z.literal(true),
    read_only: z.literal(true),
    customer_facing_output_authorized: z.literal(false),
    stages: CanonicalClaimTraceStagesSchema
  })
  .strict();

export const CanonicalClaimTraceHeldSchema = z
  .object({
    schema_version: z.literal(CANONICAL_CLAIM_TRACE_SCHEMA_VERSION),
    trace_state: z.literal("HOLD"),
    source_bound: z.literal(false),
    read_only: z.literal(true),
    canonical_identity_state: z.literal("UNBOUND"),
    customer_facing_output_authorized: z.literal(false)
  })
  .strict();

export const CanonicalClaimTraceSchema = z.discriminatedUnion("trace_state", [
  CanonicalClaimTraceAuthorizedSchema,
  CanonicalClaimTraceHeldSchema
]);

export type CanonicalClaimTraceMetricId = z.infer<typeof AggregateClaimMetricIdSchema>;
export type CanonicalClaimTraceMeasurementUnit = z.infer<typeof AggregateClaimMeasurementUnitSchema>;
export type CanonicalClaimTraceApprovedDirection = z.infer<
  typeof CanonicalClaimTraceApprovedDirectionSchema
>;
export interface CanonicalClaimTraceAuthorizedInput {
  hypothesisVersion: number;
  planVersion: number;
  measurementCellVersion: number;
  metricId: CanonicalClaimTraceMetricId;
  measurementUnit: CanonicalClaimTraceMeasurementUnit;
  approvedDirection: CanonicalClaimTraceApprovedDirection;
  movement: AggregateObservedMovement;
  policyState: AggregateClaimPolicyState;
  caveats: readonly string[];
}
export type CanonicalClaimTraceAuthorized = z.infer<typeof CanonicalClaimTraceAuthorizedSchema>;
export type CanonicalClaimTraceHeld = z.infer<typeof CanonicalClaimTraceHeldSchema>;
export type CanonicalClaimTrace = z.infer<typeof CanonicalClaimTraceSchema>;

export const canonicalClaimTraceFixedHold = (): CanonicalClaimTraceHeld =>
  CanonicalClaimTraceHeldSchema.parse({
    schema_version: CANONICAL_CLAIM_TRACE_SCHEMA_VERSION,
    trace_state: "HOLD",
    source_bound: false,
    read_only: true,
    canonical_identity_state: "UNBOUND",
    customer_facing_output_authorized: false
  });

export const buildCanonicalClaimTraceAuthorized = (
  input: CanonicalClaimTraceAuthorizedInput
): CanonicalClaimTraceAuthorized => {
  const hypothesisVersion = PositiveVersionSchema.parse(input.hypothesisVersion);
  const planVersion = PositiveVersionSchema.parse(input.planVersion);
  const measurementCellVersion = PositiveVersionSchema.parse(input.measurementCellVersion);
  const metricId = AggregateClaimMetricIdSchema.parse(input.metricId);
  const measurementUnit = AggregateClaimMeasurementUnitSchema.parse(input.measurementUnit);
  const approvedDirection = CanonicalClaimTraceApprovedDirectionSchema.parse(input.approvedDirection);
  const movement = AggregateObservedMovementSchema.parse(input.movement);
  const policyState = AggregateClaimPolicyStateSchema.parse(input.policyState);
  const caveats = ExactCaveatsSchema.parse([...input.caveats]);

  return CanonicalClaimTraceAuthorizedSchema.parse({
    schema_version: CANONICAL_CLAIM_TRACE_SCHEMA_VERSION,
    trace_state: "AUTHORIZED",
    source_bound: true,
    read_only: true,
    customer_facing_output_authorized: false,
    stages: {
      hypothesis: { approval_state: "APPROVED", version: hypothesisVersion },
      measurement: {
        approval_state: "APPROVED",
        plan_version: planVersion,
        cell_version: measurementCellVersion,
        metric_id: metricId,
        measurement_unit: measurementUnit,
        approved_direction: approvedDirection,
        aggregate_only: true
      },
      evidence: {
        schema_state: "VALID",
        review_state: "ACCEPTED",
        admission_state: "ADMITTED",
        comparison_privacy_state: "ATOMIC_COMPARISON_PRIVACY_RELEASED"
      },
      policy: policyState,
      claim: { movement, caveats },
      readout: {
        canonical_identity_state: "BOUND",
        current_state: "CURRENT",
        source_bound: true,
        mutation_authorized: false,
        export_authorized: false,
        customer_facing_output_authorized: false
      }
    }
  });
};
