import { z } from "zod";

/** Matches `schemas/unified_telemetry/ut_event_union.schema.json` and `docs/contracts/unified-telemetry/README.md`. */
export const UnifiedTelemetrySchemaVersionSchema = z.literal("UT_2026_04");
export type UnifiedTelemetrySchemaVersion = z.infer<typeof UnifiedTelemetrySchemaVersionSchema>;

export const UnifiedTelemetryEventCategorySchema = z.enum([
  "HUMAN_INTERACTION",
  "AGENT_EXECUTION",
  "CONTROL_SECURITY",
  "OUTCOME"
]);
export type UnifiedTelemetryEventCategory = z.infer<typeof UnifiedTelemetryEventCategorySchema>;

export const UnifiedTelemetryIngressSurfaceSchema = z.enum([
  "CHAT",
  "AGENT_RUNTIME",
  "API",
  "IDE",
  "ASSISTANT",
  "SEARCH"
]);

export const UnifiedTelemetryTraceAxisSchema = z.enum([
  "iteration",
  "override",
  "recovery",
  "resolution"
]);

export const UnifiedTelemetryAmbiguityReasonCodeSchema = z.enum([
  "AMB_SCHEMA_MISSING_REQUIRED",
  "AMB_SCHEMA_INVALID_TYPE",
  "AMB_SCHEMA_OUT_OF_RANGE",
  "AMB_TEMPORAL_WINDOW_UNKNOWN",
  "AMB_TEMPORAL_EVENT_OUTSIDE_WINDOW",
  "AMB_EVIDENCE_CONFLICT",
  "AMB_EVIDENCE_INSUFFICIENT",
  "AMB_SOURCE_UNTRUSTED",
  "AMB_TOOL_SURFACE_UNKNOWN",
  "AMB_CROSS_SURFACE_UNKNOWN"
]);

const windowIdRegex = /^\d{4}-\d{2}-\d{2}__\d{4}-\d{2}-\d{2}$/;
const eventNameRegex = /^UT\.[A-Z]+\.[A-Z0-9_]+\.V\d+$/;

const utEnvelopeBaseSchema = z
  .object({
    schema_version: UnifiedTelemetrySchemaVersionSchema,
    event_id: z.string().uuid(),
    event_name: z.string().min(8).regex(eventNameRegex),
    event_category: UnifiedTelemetryEventCategorySchema,
    org_id: z.string().min(1),
    function_id: z.string().min(1),
    role_class: z.string().min(1),
    ingress_surface: UnifiedTelemetryIngressSurfaceSchema,
    event_timestamp: z.string().min(1),
    window_id: z.string().regex(windowIdRegex),
    trace_axes: z.array(UnifiedTelemetryTraceAxisSchema).min(1),
    ambiguity_flag: z.boolean(),
    ambiguity_reason_code: UnifiedTelemetryAmbiguityReasonCodeSchema.optional(),
    correlation_id: z.string().min(4),
    causation_event_id: z.string().uuid().optional(),
    sequence_no: z.number().int().nonnegative().optional(),
    workflow_id: z.string().min(1).optional(),
    emitter_version: z.string().min(1).optional()
  })
  .strict();

const utHumanPayloadSchema = z
  .object({
    interaction_kind: z.enum(["DISPOSITION", "VERIFICATION", "HANDOFF", "OTHER"]).optional(),
    disposition: z.enum(["ACCEPT", "EDIT", "REJECT", "ABANDON"]).optional(),
    edit_magnitude_bucket: z.enum(["NONE", "LIGHT", "HEAVY"]).optional(),
    verification_requested: z.boolean().optional(),
    override_layer: z.enum(["HUMAN", "POLICY", "SYSTEM"]).optional()
  })
  .strict();

const utAgentPayloadSchema = z
  .object({
    agent_run_id: z.string().min(1),
    step_index: z.number().int().nonnegative(),
    tool_class: z.enum([
      "RETRIEVAL",
      "TOOL_ACTION",
      "REASONING_PLAN",
      "DELEGATION",
      "OTHER"
    ]),
    attempt_outcome: z.enum(["SUCCESS", "FAIL", "SKIPPED"]),
    latency_ms: z.number().int().nonnegative()
  })
  .strict();

const utControlPayloadSchema = z
  .object({
    control_action: z.enum(["ALLOW", "DENY", "RATE_LIMIT", "QUARANTINE", "AUDIT_ONLY"]),
    policy_rule_class: z.enum([
      "DATA_CLASSIFICATION",
      "ACCESS_CONTROL",
      "RATE",
      "CONTENT_POLICY",
      "TOOL_ALLOWLIST",
      "OTHER"
    ]),
    risk_bucket: z.enum(["NONE", "LOW", "MEDIUM", "HIGH"])
  })
  .strict();

const utOutcomePayloadSchema = z
  .object({
    outcome_status: z.enum(["COMPLETED", "FAILED", "ABANDONED", "SUPPRESSED", "ESCALATED"]),
    resolution_bucket: z.enum([
      "SUCCESS",
      "USER_ABORT",
      "POLICY_BLOCK",
      "SYSTEM_ERROR",
      "INSUFFICIENT_EVIDENCE",
      "OTHER"
    ]),
    escalation_triggered: z.boolean()
  })
  .strict();

const utHumanEventSchema = utEnvelopeBaseSchema
  .extend({
    event_category: z.literal("HUMAN_INTERACTION"),
    event_name: z.enum([
      "UT.HUMAN.DISPOSITION_RECORDED.V1",
      "UT.HUMAN.VERIFICATION_SIGNAL_RECORDED.V1",
      "UT.HUMAN.HANDOFF_RECORDED.V1"
    ]),
    payload: utHumanPayloadSchema
  })
  .strict();

const utAgentEventSchema = utEnvelopeBaseSchema
  .extend({
    event_category: z.literal("AGENT_EXECUTION"),
    event_name: z.enum(["UT.AGENT.TOOL_STEP_RECORDED.V1", "UT.AGENT.RUN_BOUNDARY_RECORDED.V1"]),
    payload: utAgentPayloadSchema
  })
  .strict();

const utControlEventSchema = utEnvelopeBaseSchema
  .extend({
    event_category: z.literal("CONTROL_SECURITY"),
    event_name: z.literal("UT.CONTROL.POLICY_DECISION_RECORDED.V1"),
    payload: utControlPayloadSchema
  })
  .strict();

const utOutcomeEventSchema = utEnvelopeBaseSchema
  .extend({
    event_category: z.literal("OUTCOME"),
    event_name: z.literal("UT.OUTCOME.WORK_UNIT_RESOLVED.V1"),
    payload: utOutcomePayloadSchema
  })
  .strict();

const refineAmbiguity = (event: { ambiguity_flag: boolean; ambiguity_reason_code?: string }, ctx: z.RefinementCtx) => {
  if (event.ambiguity_flag && !event.ambiguity_reason_code) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "ambiguity_reason_code required when ambiguity_flag is true",
      path: ["ambiguity_reason_code"]
    });
  }
  if (!event.ambiguity_flag && event.ambiguity_reason_code !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "ambiguity_reason_code must be omitted when ambiguity_flag is false",
      path: ["ambiguity_reason_code"]
    });
  }
};

export const UnifiedTelemetryEventSchema = z
  .discriminatedUnion("event_category", [
    utHumanEventSchema,
    utAgentEventSchema,
    utControlEventSchema,
    utOutcomeEventSchema
  ])
  .superRefine((event, ctx) => {
    refineAmbiguity(event, ctx);
    if (new Set(event.trace_axes).size !== event.trace_axes.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "trace_axes must be unique",
        path: ["trace_axes"]
      });
    }
  });

export type UnifiedTelemetryEvent = z.infer<typeof UnifiedTelemetryEventSchema>;

export const UnifiedTelemetryIngestSchema = z
  .object({
    events: z.array(UnifiedTelemetryEventSchema).min(1)
  })
  .strict();

export type UnifiedTelemetryIngest = z.infer<typeof UnifiedTelemetryIngestSchema>;
