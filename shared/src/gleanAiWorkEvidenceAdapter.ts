import { z } from "zod";

import {
  GleanDerivedDimensionSchema,
  GleanJoinKeySchema,
  GleanSignalInventorySchema,
  type GleanSignalInventory
} from "./gleanSignalReadinessSchemas";
import {
  GleanClaimEvaluationSetSchema,
  type GleanClaimEvaluationSet
} from "./gleanClaimRegistrySchemas";

export const GleanAiWorkEvidenceSchemaVersionSchema = z.literal("GAW_2026_05");

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

const AiWorkLaneSchema = z.enum([
  "surface_usage",
  "skill_lifecycle",
  "agent_lifecycle",
  "mcp_action_boundary",
  "artifact_output",
  "control_evidence"
]);

const DataQualitySchema = z
  .object({
    completeness: z.enum(["verified", "partial", "unknown"]),
    latency: z.enum(["known", "variable", "unknown"]),
    join_reliability: z.enum(["stable", "partial", "unknown"])
  })
  .strict();

const AiWorkNoteCodeSchema = z.enum([
  "covered_assistance_surfaces_available",
  "skill_lifecycle_available",
  "agent_lifecycle_available",
  "mcp_boundary_unconfirmed",
  "artifact_outputs_available",
  "control_evidence_suppressed"
]);

const AiWorkNextActionCodeSchema = z.enum([
  "confirm_mcp_boundary_logs",
  "approve_control_evidence",
  "confirm_artifact_metadata",
  "confirm_skill_agent_join_keys"
]);

const AI_WORK_NOTES: Record<z.infer<typeof AiWorkNoteCodeSchema>, string> = {
  covered_assistance_surfaces_available:
    "Covered assistance-surface metadata is available with unsafe content excluded.",
  skill_lifecycle_available:
    "Skill lifecycle metadata is available as aggregate lifecycle fields with unsafe instruction content excluded.",
  agent_lifecycle_available:
    "Agent lifecycle metadata is available as aggregate run and status fields with unsafe content excluded.",
  mcp_boundary_unconfirmed:
    "MCP boundary metadata is not yet confirmed for customer-safe value evidence.",
  artifact_outputs_available:
    "Artifact output metadata is available as aggregate counts and types without artifact contents.",
  control_evidence_suppressed:
    "Runtime control evidence is withheld until governance approval is recorded."
};

const GovernanceHoldReasonSchema = z.enum(["policy_review_required", "governance_hold"]);

const RecommendedNextActionSchema = z
  .object({
    action_code: AiWorkNextActionCodeSchema,
    owner: z.enum(["glean_admin", "customer_admin", "fluencytracr_operator", "data_governance"]),
    priority: z.enum(["high", "medium", "low"])
  })
  .strict();

const AiWorkRecordSchema = z
  .object({
    lane: AiWorkLaneSchema,
    source_availability: SourceAvailabilitySchema,
    export_channel: ExportChannelSchema,
    scrub_status: ScrubStatusSchema,
    join_keys_present: z.array(GleanJoinKeySchema).default([]),
    derived_dimensions: z.array(GleanDerivedDimensionSchema).default([]),
    governance_hold: z.boolean().default(false),
    governance_hold_reasons: z.array(GovernanceHoldReasonSchema).default([]),
    data_quality: DataQualitySchema,
    note_code: AiWorkNoteCodeSchema.optional(),
    recommended_next_action: RecommendedNextActionSchema.optional()
  })
  .strict();

export const GleanAiWorkEvidenceExportSchema = z
  .object({
    schema_version: GleanAiWorkEvidenceSchemaVersionSchema,
    registry_id: z.string().min(1).max(120),
    org_id: z.string().min(1),
    window: z.string().min(1),
    generated_at: z.string().datetime(),
    source_system: z.literal("Glean"),
    records: z.array(AiWorkRecordSchema).min(1)
  })
  .strict()
  .superRefine((source, ctx) => {
    const seen = new Set<string>();
    for (let index = 0; index < source.records.length; index += 1) {
      const lane = source.records[index].lane;
      if (seen.has(lane)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["records", index, "lane"],
          message: "Glean AI Work Evidence exports must not contain duplicate lanes."
        });
      }
      seen.add(lane);
    }
  });

const LANE_TO_SIGNAL_FAMILY: Record<z.infer<typeof AiWorkLaneSchema>, string> = {
  surface_usage: "assistant",
  skill_lifecycle: "skill_lifecycle",
  agent_lifecycle: "agent_run",
  mcp_action_boundary: "mcp_usage",
  artifact_output: "insights",
  control_evidence: "ai_security"
};

const NEXT_ACTIONS: Record<z.infer<typeof AiWorkNextActionCodeSchema>, string> = {
  confirm_mcp_boundary_logs: "Confirm MCP boundary activity logs, host attribution, scopes, and scrubbed field set.",
  approve_control_evidence: "Approve which runtime control aggregates may support customer-safe value evidence.",
  confirm_artifact_metadata: "Confirm artifact metadata export availability without artifact contents.",
  confirm_skill_agent_join_keys: "Confirm stable join keys across Skill lifecycle and Agent lifecycle metadata."
};

function suppressionReasons(record: z.infer<typeof AiWorkRecordSchema>): string[] {
  if (!record.governance_hold && record.governance_hold_reasons.length === 0) {
    return [];
  }
  return record.governance_hold_reasons.length > 0 ? record.governance_hold_reasons : ["governance_hold"];
}

function suppressionApplied(record: z.infer<typeof AiWorkRecordSchema>): boolean {
  return record.governance_hold || record.governance_hold_reasons.length > 0;
}

function readinessStatus(record: z.infer<typeof AiWorkRecordSchema>): "present" | "missing" | "suppressed" | "not_computed" {
  if (record.governance_hold || record.governance_hold_reasons.length > 0) {
    return "suppressed";
  }
  if (record.source_availability === "unavailable") {
    return "missing";
  }
  if (record.source_availability !== "available") {
    return "not_computed";
  }
  if (record.scrub_status !== "scrubbed" && record.scrub_status !== "not_applicable") {
    return "not_computed";
  }
  if (record.derived_dimensions.length === 0 || record.join_keys_present.length === 0) {
    return "not_computed";
  }
  return "present";
}

export function mapGleanAiWorkEvidenceToReadinessInventory(raw: unknown): GleanSignalInventory {
  const source = GleanAiWorkEvidenceExportSchema.parse(raw);
  return GleanSignalInventorySchema.parse({
    schema_version: "GSR_INVENTORY_2026_05",
    org_id: source.org_id,
    window: source.window,
    generated_at: source.generated_at,
    source_system: "Glean",
    signals: source.records.map((record) => ({
      signal_family: LANE_TO_SIGNAL_FAMILY[record.lane],
      source_availability: record.source_availability,
      export_channel: record.export_channel,
      scrub_status: record.scrub_status,
      stable_join_keys: record.join_keys_present,
      derived_dimensions: record.derived_dimensions,
      suppression_applied: suppressionApplied(record),
      suppression_reasons: suppressionReasons(record),
      data_quality: record.data_quality,
      validation_evidence: record.note_code
        ? [
            {
              checked_at: source.generated_at,
              evidence_type: "sample_export_review",
              note: AI_WORK_NOTES[record.note_code]
            }
          ]
        : [],
      recommended_next_action: record.recommended_next_action
        ? {
            action: NEXT_ACTIONS[record.recommended_next_action.action_code],
            owner: record.recommended_next_action.owner,
            priority: record.recommended_next_action.priority
          }
        : undefined
    }))
  });
}

export function mapGleanAiWorkEvidenceToClaimEvaluations(raw: unknown): GleanClaimEvaluationSet {
  const source = GleanAiWorkEvidenceExportSchema.parse(raw);
  const statuses = Object.fromEntries(source.records.map((record) => [record.lane, readinessStatus(record)]));
  const hasPresent = (lane: z.infer<typeof AiWorkLaneSchema>) => statuses[lane] === "present";
  const isSuppressed = (lane: z.infer<typeof AiWorkLaneSchema>) => statuses[lane] === "suppressed";

  return GleanClaimEvaluationSetSchema.parse({
    schema_version: "GCR_2026_05",
    registry_id: source.registry_id,
    org_id: source.org_id,
    window: source.window,
    evaluated_at: source.generated_at,
    source_system: "Glean",
    evaluations: [
      {
        claim_id: "glean.time_saved.covered_surfaces",
        claim_type: "time_saved",
        evaluation_state: "suppress",
        evidence_state: "not_computed",
        confidence_basis: "derived_aggregate",
        readiness_state: "not_computed",
        language_mode: "suppressed",
        reason_codes: ["assumption_dominates_result"],
        contributing_lanes: hasPresent("surface_usage") ? ["surface_usage"] : [],
        missing_lanes: hasPresent("mcp_action_boundary") ? [] : ["mcp_action_boundary"],
      },
      {
        claim_id: "glean.roi.customer_value_to_cost",
        claim_type: "roi",
        evaluation_state: "suppress",
        evidence_state: "not_safe_to_claim",
        confidence_basis: "assumption_backed",
        readiness_state: "suppressed",
        language_mode: "suppressed",
        reason_codes: ["roi_translation_not_approved", "assumption_dominates_result"],
        contributing_lanes: hasPresent("surface_usage") ? ["surface_usage"] : [],
        missing_lanes: ["skill_lifecycle", "agent_lifecycle", "mcp_action_boundary"].filter(
          (lane) => !hasPresent(lane as z.infer<typeof AiWorkLaneSchema>)
        )
      },
      {
        claim_id: "glean.skills.reusable_expertise_operationalized",
        claim_type: "skill_reuse",
        evaluation_state: hasPresent("skill_lifecycle") ? "surface" : "suppress",
        evidence_state: hasPresent("skill_lifecycle") ? "present" : "not_computed",
        confidence_basis: hasPresent("skill_lifecycle") ? "direct_observed" : "insufficient",
        readiness_state: hasPresent("skill_lifecycle") ? "customer_safe_with_caveats" : "not_computed",
        language_mode: hasPresent("skill_lifecycle") ? "customer_safe_with_caveats" : "suppressed",
        reason_codes: hasPresent("skill_lifecycle") ? ["directional_only"] : ["missing_source"],
        contributing_lanes: hasPresent("skill_lifecycle") ? ["skill_lifecycle"] : [],
        missing_lanes: hasPresent("skill_lifecycle") ? [] : ["skill_lifecycle"],
        approved_language: hasPresent("skill_lifecycle")
          ? "Aggregate Skill lifecycle evidence indicates reusable expertise is being operationalized."
          : undefined
      },
      {
        claim_id: "glean.agents.auto_mode_operationalized",
        claim_type: "agent_completion",
        evaluation_state: hasPresent("agent_lifecycle") ? "surface" : "suppress",
        evidence_state: hasPresent("agent_lifecycle") ? "present" : "not_computed",
        confidence_basis: hasPresent("agent_lifecycle") ? "direct_observed" : "insufficient",
        readiness_state: hasPresent("agent_lifecycle") ? "customer_safe_with_caveats" : "not_computed",
        language_mode: hasPresent("agent_lifecycle") ? "customer_safe_with_caveats" : "suppressed",
        reason_codes: hasPresent("agent_lifecycle") ? ["directional_only"] : ["missing_source"],
        contributing_lanes: hasPresent("agent_lifecycle") ? ["agent_lifecycle"] : [],
        missing_lanes: hasPresent("agent_lifecycle") ? [] : ["agent_lifecycle"],
        approved_language: hasPresent("agent_lifecycle")
          ? "Aggregate Auto Mode Agent lifecycle evidence shows movement from drafts into tested and repeated workflow runs."
          : undefined
      },
      {
        claim_id: "glean.mcp.governed_action_boundary",
        claim_type: "governed_action",
        evaluation_state: "suppress",
        evidence_state: isSuppressed("mcp_action_boundary") ? "suppressed" : "not_computed",
        confidence_basis: "insufficient",
        readiness_state: isSuppressed("mcp_action_boundary") ? "suppressed" : "not_computed",
        language_mode: "suppressed",
        reason_codes: isSuppressed("mcp_action_boundary") ? ["governance_approval_missing"] : ["missing_source"],
        contributing_lanes: [],
        missing_lanes: ["mcp_action_boundary", "control_evidence"].filter(
          (lane) => !hasPresent(lane as z.infer<typeof AiWorkLaneSchema>)
        )
      },
      {
        claim_id: "glean.artifacts.output_backed_work",
        claim_type: "artifact_creation",
        evaluation_state: hasPresent("artifact_output") ? "surface" : "suppress",
        evidence_state: hasPresent("artifact_output") ? "present" : "not_computed",
        confidence_basis: hasPresent("artifact_output") ? "direct_observed" : "insufficient",
        readiness_state: hasPresent("artifact_output") ? "customer_safe_with_caveats" : "not_computed",
        language_mode: hasPresent("artifact_output") ? "customer_safe_with_caveats" : "suppressed",
        reason_codes: hasPresent("artifact_output") ? ["directional_only"] : ["missing_source"],
        contributing_lanes: hasPresent("artifact_output") ? ["artifact_output"] : [],
        missing_lanes: hasPresent("artifact_output") ? [] : ["artifact_output"],
        approved_language: hasPresent("artifact_output")
          ? "Aggregate artifact evidence shows Glean is producing reusable work outputs without exposing artifact contents."
          : undefined
      }
    ]
  });
}

export type GleanAiWorkEvidenceExport = z.infer<typeof GleanAiWorkEvidenceExportSchema>;
