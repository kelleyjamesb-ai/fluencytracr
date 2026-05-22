import { z } from "zod";
import { AivmEvidenceGradeSchema, AivmValueTypeSchema } from "./fluencyTracrAivm";

export const FluencyTracrV1SchemaVersionSchema = z.literal("FT_V1_2026_01");
export type FluencyTracrV1SchemaVersion = z.infer<typeof FluencyTracrV1SchemaVersionSchema>;

export const FluencyTracrV1EventNameSchema = z.enum([
  "FT_V1_DISPOSITION_OBSERVED",
  "FT_V1_ITERATION_DEPTH_OBSERVED",
  "FT_V1_VERIFICATION_PRESENCE_OBSERVED",
  "FT_V1_RECOVERY_OBSERVED",
  "FT_V1_LATENCY_OBSERVED",
  "FT_V1_ABANDONMENT_OBSERVED"
]);
export type FluencyTracrV1EventName = z.infer<typeof FluencyTracrV1EventNameSchema>;

export const FluencyTracrV1ToolSurfaceSchema = z.enum(["ASSISTANT", "AGENT", "SEARCH"]);
export type FluencyTracrV1ToolSurface = z.infer<typeof FluencyTracrV1ToolSurfaceSchema>;

export const FluencyTracrV1AmbiguityReasonCodeSchema = z.enum([
  "AMB_SCHEMA_MISSING_REQUIRED",
  "AMB_SCHEMA_INVALID_TYPE",
  "AMB_SCHEMA_OUT_OF_RANGE",
  "AMB_TEMPORAL_WINDOW_UNKNOWN",
  "AMB_TEMPORAL_EVENT_OUTSIDE_WINDOW",
  "AMB_EVIDENCE_CONFLICT",
  "AMB_EVIDENCE_INSUFFICIENT",
  "AMB_SOURCE_UNTRUSTED",
  "AMB_TOOL_SURFACE_UNKNOWN"
]);
export type FluencyTracrV1AmbiguityReasonCode = z.infer<
  typeof FluencyTracrV1AmbiguityReasonCodeSchema
>;

const FluencyTracrV1BaseEventSchema = z.object({
  schema_version: FluencyTracrV1SchemaVersionSchema,
  event_name: FluencyTracrV1EventNameSchema,
  org_id: z.string().min(1),
  function_id: z.string().min(1),
  role_class: z.string().min(1),
  tool_surface: FluencyTracrV1ToolSurfaceSchema,
  event_timestamp: z.string().min(1),
  window_id: z.string().regex(/^\d{4}-\d{2}-\d{2}__\d{4}-\d{2}-\d{2}$/),
  ambiguity_flag: z.boolean(),
  ambiguity_reason_code: FluencyTracrV1AmbiguityReasonCodeSchema.optional()
}).strict();

export const FluencyTracrV1DispositionObservedSchema = FluencyTracrV1BaseEventSchema.extend({
  event_name: z.literal("FT_V1_DISPOSITION_OBSERVED"),
  disposition: z.enum(["ACCEPT", "EDIT", "REJECT", "ABANDON"])
}).strict();

export const FluencyTracrV1IterationDepthObservedSchema = FluencyTracrV1BaseEventSchema.extend({
  event_name: z.literal("FT_V1_ITERATION_DEPTH_OBSERVED"),
  iteration_depth: z.enum(["NONE", "LIGHT", "HEAVY"])
}).strict();

export const FluencyTracrV1VerificationPresenceObservedSchema = FluencyTracrV1BaseEventSchema.extend({
  event_name: z.literal("FT_V1_VERIFICATION_PRESENCE_OBSERVED"),
  verification_present: z.boolean()
}).strict();

export const FluencyTracrV1RecoveryObservedSchema = FluencyTracrV1BaseEventSchema.extend({
  event_name: z.literal("FT_V1_RECOVERY_OBSERVED"),
  recovery_present: z.boolean()
}).strict();

export const FluencyTracrV1LatencyObservedSchema = FluencyTracrV1BaseEventSchema.extend({
  event_name: z.literal("FT_V1_LATENCY_OBSERVED"),
  latency_ms: z.number().int().nonnegative()
}).strict();

export const FluencyTracrV1AbandonmentObservedSchema = FluencyTracrV1BaseEventSchema.extend({
  event_name: z.literal("FT_V1_ABANDONMENT_OBSERVED"),
  abandonment_present: z.boolean()
}).strict();

const FluencyTracrV1EventUnionSchema = z.discriminatedUnion("event_name", [
  FluencyTracrV1DispositionObservedSchema,
  FluencyTracrV1IterationDepthObservedSchema,
  FluencyTracrV1VerificationPresenceObservedSchema,
  FluencyTracrV1RecoveryObservedSchema,
  FluencyTracrV1LatencyObservedSchema,
  FluencyTracrV1AbandonmentObservedSchema
]);
export const FluencyTracrV1EventSchema = FluencyTracrV1EventUnionSchema.superRefine(
  (event, context) => {
    if (event.ambiguity_flag && !event.ambiguity_reason_code) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ambiguity_reason_code must be set iff ambiguity_flag is true",
        path: ["ambiguity_reason_code"]
      });
    }
    if (!event.ambiguity_flag && event.ambiguity_reason_code) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ambiguity_reason_code must be set iff ambiguity_flag is true",
        path: ["ambiguity_reason_code"]
      });
    }
  }
);
export type FluencyTracrV1Event = z.infer<typeof FluencyTracrV1EventSchema>;

export const FluencyTracrV1DecisionSchema = z.enum(["SURFACE", "SUPPRESS"]);
export type FluencyTracrV1Decision = z.infer<typeof FluencyTracrV1DecisionSchema>;

export const FluencyTracrV1SuppressReasonCodeSchema = z.enum([
  "SUPP_INTERNAL_INVARIANT_FAIL",
  "SUPP_AMBIGUITY_PRESENT",
  "SUPP_SMALL_TEAM_LT_5",
  "SUPP_WINDOW_LT_60D",
  "SUPP_NOT_ADJACENT_WINDOWS",
  "SUPP_LT_2_BEHAVIOR_CLASSES",
  "SUPP_NO_QUALIFYING_EVIDENCE",
  "SUPP_SPARSE_DATA"
]);
export type FluencyTracrV1SuppressReasonCode = z.infer<
  typeof FluencyTracrV1SuppressReasonCodeSchema
>;

export const FluencyTracrV1EvaluationDecisionSchema = z.object({
  schema_version: FluencyTracrV1SchemaVersionSchema,
  org_id: z.string().min(1),
  function_id: z.string().min(1),
  role_class: z.string().min(1),
  window_id: z.string().regex(/^\d{4}-\d{2}-\d{2}__\d{4}-\d{2}-\d{2}$/),
  decision: FluencyTracrV1DecisionSchema,
  value_type: AivmValueTypeSchema,
  evidence_grade: AivmEvidenceGradeSchema,
  suppress_reason_code: FluencyTracrV1SuppressReasonCodeSchema.optional()
}).strict().superRefine((decision, context) => {
  if (decision.decision === "SUPPRESS" && !decision.suppress_reason_code) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "suppress_reason_code is required when decision is SUPPRESS",
      path: ["suppress_reason_code"]
    });
  }
  if (decision.decision === "SURFACE" && decision.suppress_reason_code) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "suppress_reason_code must be omitted when decision is SURFACE",
      path: ["suppress_reason_code"]
    });
  }
});
export type FluencyTracrV1EvaluationDecision = z.infer<
  typeof FluencyTracrV1EvaluationDecisionSchema
>;
