import { z } from "zod";

export const AgentRunSchemaVersionSchema = z.literal("AR_2026_05");
export type AgentRunSchemaVersion = z.infer<typeof AgentRunSchemaVersionSchema>;

export const AgentRunProviderSchema = z.enum([
  "CURSOR",
  "OPENAI_AGENTS",
  "CODEX",
  "CLAUDE",
  "OTHER"
]);
export type AgentRunProvider = z.infer<typeof AgentRunProviderSchema>;

export const AgentRunHarnessSurfaceSchema = z.enum([
  "CURSOR_CLI",
  "CURSOR_EDITOR",
  "OPENAI_AGENTS_SDK",
  "CODEX_CLI",
  "CLAUDE_CODE",
  "OTHER"
]);
export type AgentRunHarnessSurface = z.infer<typeof AgentRunHarnessSurfaceSchema>;

export const AgentRunEventKindSchema = z.enum([
  "SESSION_START",
  "MESSAGE",
  "TOOL_START",
  "TOOL_END",
  "RESULT",
  "ERROR",
  "DELEGATION",
  "CHECKPOINT"
]);
export type AgentRunEventKind = z.infer<typeof AgentRunEventKindSchema>;

export const AgentRunPermissionModeSchema = z.enum([
  "READ_ONLY",
  "ASK_EVERY_TIME",
  "AUTO_RUN_SANDBOX",
  "FULL_ACCESS",
  "UNKNOWN"
]);

export const AgentRunToolStatusSchema = z.enum([
  "STARTED",
  "SUCCESS",
  "FAIL",
  "SKIPPED",
  "USER_ABORTED",
  "TIMEOUT"
]);

export const AgentRunErrorClassSchema = z.enum([
  "InvalidArguments",
  "UnexpectedEnvironment",
  "ProviderError",
  "UserAborted",
  "Timeout",
  "Unknown"
]);

const eventNameRegex = /^AR\.[A-Z]+\.[A-Z0-9_]+\.V\d+$/;

const forbiddenPayloadKeys = new Set([
  "prompt",
  "raw_prompt",
  "response",
  "raw_response",
  "raw_output",
  "message_text",
  "file_content",
  "diff",
  "patch",
  "user_email",
  "email",
  "user_id",
  "person_id"
]);

const agentRunPayloadSchema = z
  .object({
    cwd_present: z.boolean().optional(),
    git_status: z.enum(["clean", "dirty", "unknown"]).optional(),
    harness_docs_loaded: z.array(z.string().min(1)).optional(),
    document_key: z.string().min(1).optional(),
    output_ref: z.string().min(1).optional(),
    error_class: AgentRunErrorClassSchema.optional(),
    error_ref: z.string().min(1).optional(),
    delegation_target: z.string().min(1).optional(),
    checkpoint_ref: z.string().min(1).optional(),
    result_status: z.enum(["SUCCESS", "FAILURE", "ABORTED", "SUPPRESSED"]).optional()
  })
  .strict();

const rejectForbiddenPayloadKeys = (value: unknown, ctx: z.RefinementCtx, path: Array<string | number> = []) => {
  if (!value || typeof value !== "object") {
    return;
  }

  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    const nextPath = [...path, key];
    if (forbiddenPayloadKeys.has(key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `forbidden agent-run field: ${key}`,
        path: nextPath
      });
    }
    rejectForbiddenPayloadKeys(nestedValue, ctx, nextPath);
  }
};

export const AgentRunEventSchema = z
  .object({
    schema_version: AgentRunSchemaVersionSchema,
    event_id: z.string().uuid(),
    event_name: z.string().min(8).regex(eventNameRegex),
    provider: AgentRunProviderSchema,
    harness_surface: AgentRunHarnessSurfaceSchema,
    event_kind: AgentRunEventKindSchema,
    event_timestamp: z.string().min(1),
    repo_id: z.string().min(1),
    branch_name: z.string().min(1).optional(),
    session_id: z.string().min(1),
    run_id: z.string().min(1),
    parent_run_id: z.string().min(1).optional(),
    model: z.string().min(1).optional(),
    permission_mode: AgentRunPermissionModeSchema.optional(),
    tool_call_id: z.string().min(1).optional(),
    tool_name: z.string().min(1).optional(),
    tool_status: AgentRunToolStatusSchema.optional(),
    duration_ms: z.number().int().nonnegative().optional(),
    payload: agentRunPayloadSchema
  })
  .strict()
  .superRefine((event, ctx) => {
    rejectForbiddenPayloadKeys(event, ctx);
  });

export type AgentRunEvent = z.infer<typeof AgentRunEventSchema>;

export const AgentRunEventBatchSchema = z
  .object({
    events: z.array(AgentRunEventSchema).min(1)
  })
  .strict();

export type AgentRunEventBatch = z.infer<typeof AgentRunEventBatchSchema>;
