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

const RecommendedNextActionSchema = z
  .object({
    action: z.string().min(1).max(500),
    owner: z.enum(["glean_admin", "customer_admin", "fluencytracr_operator", "data_governance"]),
    priority: z.enum(["high", "medium", "low"])
  })
  .strict();

const GleanSignalInventoryEntrySchema = z
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
    suppression_applied: z.boolean().default(false),
    suppression_reasons: z.array(z.string()).default([]),
    data_quality: z
      .object({
        completeness: z.enum(["verified", "partial", "unknown"]),
        latency: z.enum(["known", "variable", "unknown"]),
        join_reliability: z.enum(["stable", "partial", "unknown"])
      })
      .strict(),
    validation_evidence: z.array(ValidationEvidenceSchema).default([]),
    recommended_next_action: RecommendedNextActionSchema.optional()
  })
  .strict();

export const GleanSignalInventorySchema = z
  .object({
    schema_version: z.literal("GSR_INVENTORY_2026_05"),
    org_id: z.string().min(1),
    window: z.string().min(1),
    generated_at: z.string().datetime(),
    source_system: z.literal("Glean"),
    signals: z.array(GleanSignalInventoryEntrySchema).min(1)
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
export type GleanSignalInventory = z.infer<typeof GleanSignalInventorySchema>;

function deriveReadinessStatus(
  signal: z.infer<typeof GleanSignalInventoryEntrySchema>
): z.infer<typeof GleanReadinessStatusSchema> {
  if (signal.suppression_applied || signal.suppression_reasons.length > 0) {
    return "suppressed";
  }
  if (signal.source_availability === "unavailable") {
    return "missing";
  }
  if (signal.source_availability !== "available") {
    return "not_computed";
  }
  if (signal.scrub_status !== "scrubbed" && signal.scrub_status !== "not_applicable") {
    return "not_computed";
  }
  if (signal.stable_join_keys.length === 0 || signal.derived_dimensions.length === 0) {
    return "not_computed";
  }
  return "present";
}

export function buildGleanSignalReadinessMap(raw: unknown): GleanSignalReadinessMap {
  return GleanSignalReadinessMapSchema.parse(raw);
}

export function generateGleanSignalReadinessMap(raw: unknown): GleanSignalReadinessMap {
  const inventory = GleanSignalInventorySchema.parse(raw);
  return GleanSignalReadinessMapSchema.parse({
    schema_version: "GSR_2026_05",
    org_id: inventory.org_id,
    window: inventory.window,
    generated_at: inventory.generated_at,
    source_system: "Glean",
    entries: inventory.signals.map((signal) => ({
      signal_family: signal.signal_family,
      source_availability: signal.source_availability,
      export_channel: signal.export_channel,
      scrub_status: signal.scrub_status,
      stable_join_keys: signal.stable_join_keys,
      derived_dimensions: signal.derived_dimensions,
      readiness_status: deriveReadinessStatus(signal),
      suppression_applied: signal.suppression_applied,
      suppression_reasons: signal.suppression_reasons,
      data_quality: signal.data_quality,
      validation_evidence: signal.validation_evidence
    })),
    next_actions: inventory.signals.flatMap((signal) => {
      if (!signal.recommended_next_action) {
        return [];
      }
      return [{
        signal_family: signal.signal_family,
        action: signal.recommended_next_action.action,
        owner: signal.recommended_next_action.owner,
        priority: signal.recommended_next_action.priority
      }];
    })
  });
}
