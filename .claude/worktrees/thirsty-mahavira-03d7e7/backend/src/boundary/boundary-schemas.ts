/**
 * Zod schemas for live ingest / adapter DTOs. Canonical validation remains downstream.
 */

import { z } from "zod";

const nonEmptyTrimmed = (field: string): z.ZodEffects<z.ZodString, string, string> =>
  z
    .string()
    .min(1)
    .refine((s) => s.trim().length > 0, { message: `${field}_must_be_non_empty_after_trim` });

export const boundaryPolicySchema = z
  .object({
    allow_composite_execution_id: z.boolean().optional()
  })
  .strict();

export type BoundaryPolicy = z.infer<typeof boundaryPolicySchema>;

export const upstreamActorFieldSchema = z.string().min(1);

export const upstreamSourceIdSchema = z.string().min(1).optional();

export const upstreamContextSchema = z.record(z.unknown());

export const upstreamMetadataSchema = z.record(z.unknown());

export const upstreamIngestEventSchema = z
  .object({
    event_name: nonEmptyTrimmed("event_name"),
    event_version: nonEmptyTrimmed("event_version"),
    org_id: nonEmptyTrimmed("org_id"),
    workflow_id: nonEmptyTrimmed("workflow_id"),
    timestamp: nonEmptyTrimmed("timestamp"),
    actor: upstreamSourceIdSchema,
    actor_type: upstreamSourceIdSchema,
    execution_id: upstreamSourceIdSchema,
    workflow_run_id: upstreamSourceIdSchema,
    run_id: upstreamSourceIdSchema,
    chat_id: upstreamSourceIdSchema,
    agent_run_id: upstreamSourceIdSchema,
    context: upstreamContextSchema.default({}),
    metadata: upstreamMetadataSchema.optional(),
    boundary_policy: boundaryPolicySchema.optional()
  })
  .strict()
  .superRefine((val, ctx) => {
    const at = val.actor_type?.trim() ?? "";
    const ac = val.actor?.trim() ?? "";
    if (at.length === 0 && ac.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "actor_or_actor_type_required",
        path: ["actor"]
      });
    }
  });

export type UpstreamIngestEvent = z.infer<typeof upstreamIngestEventSchema>;

export type ParseUpstreamIngestEventResult =
  | { readonly ok: true; readonly data: UpstreamIngestEvent }
  | { readonly ok: false; readonly error: z.ZodError<UpstreamIngestEvent> };

export function parseUpstreamIngestEvent(input: unknown): ParseUpstreamIngestEventResult {
  const parsed = upstreamIngestEventSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error };
  }
  return { ok: true, data: parsed.data };
}
