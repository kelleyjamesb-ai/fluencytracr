import { z } from "zod";
import {
  GleanDerivedDimensionSchema,
  GleanJoinKeySchema,
  GleanSignalInventorySchema,
  type GleanSignalInventory
} from "./gleanSignalReadinessSchemas";

const SourceAvailabilitySchema = z.enum([
  "available",
  "unavailable",
  "unconfirmed",
  "approved_pending_export"
]);

const ExportChannelSchema = z.enum([
  "customer_event_logs",
  "glean_api",
  "bigquery_export",
  "manual_upload",
  "mcp_tool",
  "not_available",
  "unknown"
]);

const ScrubStatusSchema = z.enum(["scrubbed", "unscrubbed_rejected", "unknown", "not_applicable"]);

const DataQualitySchema = z
  .object({
    completeness: z.enum(["verified", "partial", "unknown"]),
    latency: z.enum(["known", "variable", "unknown"]),
    join_reliability: z.enum(["stable", "partial", "unknown"])
  })
  .strict();

const RecommendedNextActionSchema = z
  .object({
    action: z.string().min(1).max(500),
    owner: z.enum(["glean_admin", "customer_admin", "fluencytracr_operator", "data_governance"]),
    priority: z.enum(["high", "medium", "low"])
  })
  .strict();

const GleanSourceRecordBaseSchema = z
  .object({
    source_availability: SourceAvailabilitySchema,
    export_channel: ExportChannelSchema,
    scrub_status: ScrubStatusSchema,
    join_keys_present: z.array(GleanJoinKeySchema).default([]),
    derived_dimensions: z.array(GleanDerivedDimensionSchema).default([]),
    governance_hold: z.boolean().default(false),
    governance_hold_reasons: z.array(z.string()).default([]),
    data_quality: DataQualitySchema,
    validation_note: z.string().min(1).max(500).optional(),
    recommended_next_action: RecommendedNextActionSchema.optional()
  })
  .strict();

const WorkflowRunSourceRecordSchema = GleanSourceRecordBaseSchema.extend({
  source_type: z.literal("workflow_run")
}).strict();

const McpUsageSourceRecordSchema = GleanSourceRecordBaseSchema.extend({
  source_type: z.literal("mcp_usage")
}).strict();

const AiSecuritySourceRecordSchema = GleanSourceRecordBaseSchema.extend({
  source_type: z.literal("ai_security")
}).strict();

export const GleanSourceRecordSchema = z.discriminatedUnion("source_type", [
  WorkflowRunSourceRecordSchema,
  McpUsageSourceRecordSchema,
  AiSecuritySourceRecordSchema
]);

export const GleanSourceExportSchema = z
  .object({
    schema_version: z.literal("GLEAN_SOURCE_EXPORT_2026_05"),
    org_id: z.string().min(1),
    window: z.string().min(1),
    generated_at: z.string().datetime(),
    records: z.array(GleanSourceRecordSchema).min(1)
  })
  .strict();

export type GleanSourceExport = z.infer<typeof GleanSourceExportSchema>;
export type GleanSourceRecord = z.infer<typeof GleanSourceRecordSchema>;

function suppressionReasons(record: GleanSourceRecord): string[] {
  if (!record.governance_hold) {
    return [];
  }
  return record.governance_hold_reasons.length > 0 ? record.governance_hold_reasons : ["governance_hold"];
}

export function mapGleanSourcesToReadinessInventory(raw: unknown): GleanSignalInventory {
  const sourceExport = GleanSourceExportSchema.parse(raw);
  return GleanSignalInventorySchema.parse({
    schema_version: "GSR_INVENTORY_2026_05",
    org_id: sourceExport.org_id,
    window: sourceExport.window,
    generated_at: sourceExport.generated_at,
    source_system: "Glean",
    signals: sourceExport.records.map((record) => ({
      signal_family: record.source_type,
      source_availability: record.source_availability,
      export_channel: record.export_channel,
      scrub_status: record.scrub_status,
      stable_join_keys: record.join_keys_present,
      derived_dimensions: record.derived_dimensions,
      suppression_applied: record.governance_hold,
      suppression_reasons: suppressionReasons(record),
      data_quality: record.data_quality,
      validation_evidence: record.validation_note
        ? [
            {
              checked_at: sourceExport.generated_at,
              evidence_type: "sample_export_review",
              note: record.validation_note
            }
          ]
        : [],
      recommended_next_action: record.recommended_next_action
    }))
  });
}
