import {
  GleanSourceExportSchema,
  generateGleanSignalReadinessMap,
  mapGleanSourcesToReadinessInventory
} from "@learnaire/shared";

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
      validation_note: "WorkflowRun aggregate fields are available without raw content."
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
        action: "Confirm MCP Usage export availability and scrubbed field set.",
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
      validation_note: "AI Security aggregates require governance approval before use."
    }
  ]
};

describe("mapGleanSourcesToReadinessInventory", () => {
  it("maps WorkflowRun, MCP Usage, and AI Security source records into readiness statuses", () => {
    const inventory = mapGleanSourcesToReadinessInventory(sourceExport);
    const readinessMap = generateGleanSignalReadinessMap(inventory);
    const statuses = Object.fromEntries(
      readinessMap.entries.map((entry) => [entry.signal_family, entry.readiness_status])
    );

    expect(inventory.schema_version).toBe("GSR_INVENTORY_2026_05");
    expect(inventory.signals.map((signal) => signal.signal_family)).toEqual([
      "workflow_run",
      "mcp_usage",
      "ai_security"
    ]);
    expect(statuses.workflow_run).toBe("present");
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
});
