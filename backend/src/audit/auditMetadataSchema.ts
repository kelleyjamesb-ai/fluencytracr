import { z } from "zod";

/**
 * Strict allowlist for audit metadata.
 * Must not accept raw event payloads, prompts, content, or identifiers
 * beyond actor_sub and org_id (which are top-level fields, not metadata).
 */
export const AuditMetadataSchema = z.object({
  endpoint: z.string().optional(),
  method: z.string().optional(),
  status_code: z.number().optional(),
  suppression_reason_code: z.string().optional(),
  enforcement_point: z.string().optional(),
  schema_version: z.string().optional(),
}).strict();
