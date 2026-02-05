import { z } from "zod";

export const Phase1SchemaVersion = "FT_V1_2026_01" as const;

export const Phase1EventNameSchema = z.enum([
  "FT_V1_DISPOSITION_OBSERVED",
  "FT_V1_ITERATION_DEPTH_OBSERVED",
  "FT_V1_VERIFICATION_PRESENCE_OBSERVED",
  "FT_V1_RECOVERY_OBSERVED",
  "FT_V1_LATENCY_OBSERVED",
  "FT_V1_ABANDONMENT_OBSERVED"
]);

export const Phase1ToolSurfaceSchema = z.enum(["ASSISTANT", "AGENT", "SEARCH"]);

export const Phase1AmbiguityReasonSchema = z.enum([
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

const IsoUtcTimestampSchema = z
  .string()
  .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,6})?Z$/);

const WindowIdSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}__\d{4}-\d{2}-\d{2}$/);

export const Phase1EventSchema = z
  .object({
    schema_version: z.literal(Phase1SchemaVersion),
    event_name: Phase1EventNameSchema,
    org_id: z.string().min(1),
    function_id: z.string().min(1),
    role_class: z.string().min(1),
    tool_surface: Phase1ToolSurfaceSchema,
    event_timestamp: IsoUtcTimestampSchema,
    window_id: WindowIdSchema,
    ambiguity_flag: z.boolean(),
    ambiguity_reason_code: Phase1AmbiguityReasonSchema.optional()
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.ambiguity_flag && !value.ambiguity_reason_code) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ambiguity_reason_code required when ambiguity_flag=true",
        path: ["ambiguity_reason_code"]
      });
    }
    if (!value.ambiguity_flag && value.ambiguity_reason_code) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ambiguity_reason_code forbidden when ambiguity_flag=false",
        path: ["ambiguity_reason_code"]
      });
    }
  });

export type Phase1Event = z.infer<typeof Phase1EventSchema>;

export const Phase1IngestPayloadSchema = z
  .object({
    events: z.array(Phase1EventSchema).min(1)
  })
  .strict();

export type Phase1IngestPayload = z.infer<typeof Phase1IngestPayloadSchema>;
