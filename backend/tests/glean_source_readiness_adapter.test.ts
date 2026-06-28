import {
  GleanSourceExportSchema,
  generateGleanSignalReadinessMap,
  mapGleanSourcesToReadinessInventory
} from "@fluencytracr/shared";

const sourceExport = {
  schema_version: "GLEAN_SOURCE_EXPORT_2026_05",
  org_id: "org-northstar-enterprise",
  window: "weekly",
  generated_at: "2026-05-01T13:00:00.000Z",
  records: [
    {
      source_type: "workflow_run",
      source_availability: "available",
      export_channel: "customer_event_logs",
      scrub_status: "scrubbed",
      join_keys_present: ["run_id", "workflow_run_id", "chat_session_id"],
      derived_dimensions: ["usage_quality", "behavior_change", "coverage"],
      data_quality: {
        completeness: "verified",
        latency: "known",
        join_reliability: "stable"
      },
      validation_note_code: "workflow_run_aggregate_available"
    },
    {
      source_type: "agent_run",
      source_availability: "available",
      export_channel: "customer_event_logs",
      scrub_status: "scrubbed",
      join_keys_present: ["run_id", "workflow_run_id", "trace_id"],
      derived_dimensions: ["behavior_change", "capability_growth", "coverage"],
      data_quality: {
        completeness: "verified",
        latency: "known",
        join_reliability: "stable"
      },
      validation_note_code: "auto_mode_agent_lifecycle_available"
    },
    {
      source_type: "skill_lifecycle",
      source_availability: "available",
      export_channel: "customer_event_logs",
      scrub_status: "not_applicable",
      join_keys_present: ["skill_artifact_id", "event_timestamp"],
      derived_dimensions: ["capability_growth", "coverage"],
      data_quality: {
        completeness: "partial",
        latency: "known",
        join_reliability: "stable"
      },
      validation_note_code: "skill_lifecycle_available"
    },
    {
      source_type: "mcp_usage",
      source_availability: "approved_pending_export",
      export_channel: "customer_event_logs",
      scrub_status: "unknown",
      join_keys_present: ["trace_id", "workflow_run_id", "tool_id"],
      derived_dimensions: ["capability_growth", "calibration", "coverage"],
      data_quality: {
        completeness: "unknown",
        latency: "unknown",
        join_reliability: "partial"
      },
      recommended_next_action: {
        action_code: "confirm_mcp_usage_export",
        owner: "glean_admin",
        priority: "high"
      }
    },
    {
      source_type: "ai_security",
      source_availability: "available",
      export_channel: "customer_event_logs",
      scrub_status: "scrubbed",
      join_keys_present: ["workflow_run_id", "event_timestamp"],
      derived_dimensions: ["leadership_reinforcement", "exposure"],
      governance_hold: true,
      governance_hold_reasons: ["policy_review_required"],
      data_quality: {
        completeness: "partial",
        latency: "known",
        join_reliability: "partial"
      },
      validation_note_code: "ai_security_governance_review_required"
    }
  ]
};

describe("mapGleanSourcesToReadinessInventory", () => {
  it("maps WorkflowRun, Auto Mode Agent, Skill lifecycle, MCP Usage, and AI Security records", () => {
    const inventory = mapGleanSourcesToReadinessInventory(sourceExport);
    const readinessMap = generateGleanSignalReadinessMap(inventory);
    const statuses = Object.fromEntries(
      readinessMap.entries.map((entry) => [entry.signal_family, entry.readiness_status])
    );

    expect(inventory.schema_version).toBe("GSR_INVENTORY_2026_05");
    expect(inventory.signals.map((signal) => signal.signal_family)).toEqual([
      "workflow_run",
      "agent_run",
      "skill_lifecycle",
      "mcp_usage",
      "ai_security"
    ]);
    expect(statuses.workflow_run).toBe("present");
    expect(statuses.agent_run).toBe("present");
    expect(statuses.skill_lifecycle).toBe("present");
    expect(statuses.mcp_usage).toBe("not_computed");
    expect(statuses.ai_security).toBe("suppressed");
    expect(readinessMap.next_actions).toContainEqual({
      signal_family: "mcp_usage",
      action: "Confirm MCP Usage export availability and scrubbed field set.",
      owner: "glean_admin",
      priority: "high"
    });
  });

  it("rejects unsafe source fields before inventory generation", () => {
    const parsed = GleanSourceExportSchema.safeParse({
      ...sourceExport,
      records: [
        {
          ...sourceExport.records[0],
          prompt_text: "unsafe raw content"
        }
      ]
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects raw content inside allowed Skill lifecycle text fields", () => {
    const parsed = GleanSourceExportSchema.safeParse({
      ...sourceExport,
      records: [
        {
          ...sourceExport.records[2],
          validation_note: "SKILL.md prompt: use this confidential account plan."
        }
      ]
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects direct identifiers inside allowed Agent lifecycle text fields", () => {
    const parsed = GleanSourceExportSchema.safeParse({
      ...sourceExport,
      records: [
        {
          ...sourceExport.records[1],
          recommended_next_action: {
            action: "Review agent run for user_id 12345 and user@example.com.",
            owner: "glean_admin",
            priority: "high"
          }
        }
      ]
    });

    expect(parsed.success).toBe(false);
  });
});
