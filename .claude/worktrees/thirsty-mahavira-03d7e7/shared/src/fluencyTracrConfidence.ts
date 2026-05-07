import { z } from "zod";

export const ConfidenceSchemaVersionSchema = z.literal("v1");
export type ConfidenceSchemaVersion = z.infer<typeof ConfidenceSchemaVersionSchema>;

export const ClosureReasonSchema = z.enum([
  "EVENT_ADVANCE",
  "ROLE_TIMEOUT",
  "SESSION_END",
  "AMBIGUOUS"
]);
export type ClosureReason = z.infer<typeof ClosureReasonSchema>;

export const AmbiguityStatusSchema = z.enum(["CLEAR", "AMBIGUOUS"]);
export type AmbiguityStatus = z.infer<typeof AmbiguityStatusSchema>;

export const AmbiguityReasonCodeSchema = z.enum([
  "NO_ADVANCE",
  "TIMEOUT",
  "CONFLICT",
  "INSTRUMENTATION"
]);
export type AmbiguityReasonCode = z.infer<typeof AmbiguityReasonCodeSchema>;

export const AmbiguityStateSchema = z.object({
  status: AmbiguityStatusSchema,
  reason_code: AmbiguityReasonCodeSchema.nullable()
}).strict().refine(
  (state) => (state.status === "AMBIGUOUS" ? state.reason_code !== null : state.reason_code === null),
  {
    message: "ambiguity_state.reason_code must be set for AMBIGUOUS and null for CLEAR"
  }
);
export type AmbiguityState = z.infer<typeof AmbiguityStateSchema>;

export const SignalPrimitivesSchema = z.object({
  iteration_count: z.number().int().nonnegative(),
  verification_present: z.boolean(),
  recovery_present: z.boolean(),
  latency_ms: z.number().int().nonnegative().nullable(),
  abandonment: z.boolean()
}).strict();
export type SignalPrimitives = z.infer<typeof SignalPrimitivesSchema>;

export const IterationDepthSchema = z.enum(["None", "Light", "Heavy"]);
export type IterationDepth = z.infer<typeof IterationDepthSchema>;

export const TaskEpisodeSchema = z.object({
  episode_id: z.string().uuid(),
  org_id: z.string().min(1),
  function_id: z.string().min(1),
  role_class: z.string().min(1),
  schema_version: ConfidenceSchemaVersionSchema,
  start_ts: z.string().min(1),
  end_ts: z.string().min(1).nullable(),
  closure_reason: ClosureReasonSchema,
  ambiguity_state: AmbiguityStateSchema,
  signal_primitives: SignalPrimitivesSchema
}).strict();
export type TaskEpisode = z.infer<typeof TaskEpisodeSchema>;

export const SignalClassSchema = z.enum([
  "INTERACTION",
  "ITERATION",
  "VERIFICATION",
  "RECOVERY",
  "LATENCY",
  "ABANDONMENT"
]);
export type SignalClass = z.infer<typeof SignalClassSchema>;

export const SignalDecisionSchema = z.enum(["SURFACE", "SUPPRESS"]);
export type SignalDecision = z.infer<typeof SignalDecisionSchema>;

export const SuppressionReasonSchema = z.enum([
  "INSUFFICIENT_TIME",
  "INSUFFICIENT_VOLUME",
  "NO_CONVERGENCE",
  "BASELINE_UNSTABLE",
  "HIGH_AMBIGUITY"
]);
export type SuppressionReason = z.infer<typeof SuppressionReasonSchema>;

export const FunctionWindowAggregateSchema = z.object({
  org_id: z.string().min(1),
  function_id: z.string().min(1),
  schema_version: ConfidenceSchemaVersionSchema,
  window_start: z.string().min(1),
  window_end: z.string().min(1),
  decision: SignalDecisionSchema,
  suppression_reason: SuppressionReasonSchema.nullable(),
  signal_classes: z.array(SignalClassSchema),
  positive_evidence_present: z.boolean(),
  ghost_use_evaluated: z.boolean(),
  rolled_up: z.boolean(),
  ambiguity_rate: z.number().min(0).max(1),
  eligible_contributors: z.number().int().nonnegative(),
  population_episodes: z.number().int().nonnegative(),
  non_ambiguous_episodes: z.number().int().nonnegative()
}).strict();
export type FunctionWindowAggregate = z.infer<typeof FunctionWindowAggregateSchema>;
