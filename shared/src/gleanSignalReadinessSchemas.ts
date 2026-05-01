import { z } from "zod";

export const GleanSignalReadinessSchemaVersionSchema = z.literal("GSR_2026_05");

export const GleanSignalFamilySchema = z.enum([
  "workflow_run",
  "agent_run",
  "agent_step",
  "actions",
  "mcp_usage",
  "ai_security",
  "skill_lifecycle",
  "user_memory_tool",
  "assistant",
  "search_document_retrieval",
  "insights"
]);

export const GleanReadinessStatusSchema = z.enum([
  "present",
  "missing",
  "suppressed",
  "not_computed"
]);

export const GleanDerivedDimensionSchema = z.enum([
  "confidence",
  "usage_quality",
  "behavior_change",
  "leadership_reinforcement",
  "capability_growth",
  "exposure",
  "calibration",
  "fragility",
  "coverage"
]);

export const GleanJoinKeySchema = z.enum([
  "run_id",
  "workflow_run_id",
  "trace_id",
  "span_id",
  "parent_span_id",
  "action_run_id",
  "action_id",
  "chat_session_id",
  "session_tracking_token",
  "workflow_id",
  "root_workflow_id",
  "step_id",
  "tool_id",
  "skill_artifact_id",
  "event_timestamp"
]);

const ValidationEvidenceSchema = z
  .object({
    checked_at: z.string().datetime(),
    evidence_type: z.enum([
      "schema_review",
      "sample_export_review",
      "admin_confirmation",
      "automated_contract_check"
    ]),
    note: z.string().min(1).max(500)
  })
  .strict();

const GleanSignalReadinessEntrySchema = z
  .object({
    signal_family: GleanSignalFamilySchema,
    source_availability: z.enum(["available", "unavailable", "unconfirmed", "approved_pending_export"]),
    export_channel: z.enum([
      "customer_event_logs",
      "glean_api",
      "bigquery_export",
      "manual_upload",
      "mcp_tool",
      "not_available",
      "unknown"
    ]),
    scrub_status: z.enum(["scrubbed", "unscrubbed_rejected", "unknown", "not_applicable"]),
    stable_join_keys: z.array(GleanJoinKeySchema).default([]),
    derived_dimensions: z.array(GleanDerivedDimensionSchema).default([]),
    readiness_status: GleanReadinessStatusSchema,
    suppression_applied: z.boolean(),
    suppression_reasons: z.array(z.string()).default([]),
    data_quality: z
      .object({
        completeness: z.enum(["verified", "partial", "unknown"]),
        latency: z.enum(["known", "variable", "unknown"]),
        join_reliability: z.enum(["stable", "partial", "unknown"])
      })
      .strict(),
    validation_evidence: z.array(ValidationEvidenceSchema).default([])
  })
  .strict();

const NextActionSchema = z
  .object({
    signal_family: GleanSignalFamilySchema,
    action: z.string().min(1).max(500),
    owner: z.enum(["glean_admin", "customer_admin", "fluencytracr_operator", "data_governance"]),
    priority: z.enum(["high", "medium", "low"])
  })
  .strict();

export const GleanSignalReadinessMapSchema = z
  .object({
    schema_version: GleanSignalReadinessSchemaVersionSchema,
    org_id: z.string().min(1),
    window: z.string().min(1),
    generated_at: z.string().datetime(),
    source_system: z.literal("Glean"),
    entries: z.array(GleanSignalReadinessEntrySchema).min(1),
    next_actions: z.array(NextActionSchema).default([])
  })
  .strict();

export type GleanSignalReadinessMap = z.infer<typeof GleanSignalReadinessMapSchema>;
export type GleanSignalReadinessEntry = z.infer<typeof GleanSignalReadinessEntrySchema>;

export function buildGleanSignalReadinessMap(raw: unknown): GleanSignalReadinessMap {
  return GleanSignalReadinessMapSchema.parse(raw);
}
