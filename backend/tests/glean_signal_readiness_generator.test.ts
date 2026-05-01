import {
  generateGleanSignalReadinessMap,
  GleanSignalInventorySchema
} from "@learnaire/shared";

const inventory = {
  schema_version: "GSR_INVENTORY_2026_05",
  org_id: "org-northstar-enterprise",
  window: "weekly",
  generated_at: "2026-05-01T12:00:00.000Z",
  source_system: "Glean",
  signals: [
    {
      signal_family: "workflow_run",
      source_availability: "available",
      export_channel: "customer_event_logs",
      scrub_status: "scrubbed",
      stable_join_keys: ["run_id", "workflow_run_id"],
      derived_dimensions: ["usage_quality", "behavior_change", "coverage"],
      suppression_applied: false,
      suppression_reasons: [],
      data_quality: {
        completeness: "verified",
        latency: "known",
        join_reliability: "stable"
      },
      validation_evidence: [
        {
          checked_at: "2026-05-01T12:30:00.000Z",
          evidence_type: "schema_review",
          note: "WorkflowRun aggregate fields verified for seeded demo."
        }
      ]
    },
    {
      signal_family: "mcp_usage",
      source_availability: "approved_pending_export",
      export_channel: "customer_event_logs",
      scrub_status: "unknown",
      stable_join_keys: ["trace_id", "workflow_run_id"],
      derived_dimensions: ["capability_growth", "calibration"],
      suppression_applied: false,
      suppression_reasons: [],
      data_quality: {
        completeness: "unknown",
        latency: "unknown",
        join_reliability: "partial"
      },
      validation_evidence: [],
      recommended_next_action: {
        action: "Confirm MCP Usage export availability and scrubbed field set.",
        owner: "glean_admin",
        priority: "high"
      }
    },
    {
      signal_family: "ai_security",
      source_availability: "available",
      export_channel: "customer_event_logs",
      scrub_status: "scrubbed",
      stable_join_keys: ["workflow_run_id", "event_timestamp"],
      derived_dimensions: ["leadership_reinforcement", "exposure"],
      suppression_applied: true,
      suppression_reasons: ["policy_review_required"],
      data_quality: {
        completeness: "partial",
        latency: "known",
        join_reliability: "partial"
      },
      validation_evidence: []
    },
    {
      signal_family: "skill_lifecycle",
      source_availability: "unavailable",
      export_channel: "not_available",
      scrub_status: "unknown",
      stable_join_keys: [],
      derived_dimensions: ["capability_growth"],
      suppression_applied: false,
      suppression_reasons: [],
      data_quality: {
        completeness: "unknown",
        latency: "unknown",
        join_reliability: "unknown"
      },
      validation_evidence: [],
      recommended_next_action: {
        action: "Identify whether Skill lifecycle events are available for customer export.",
        owner: "data_governance",
        priority: "medium"
      }
    }
  ]
};

describe("generateGleanSignalReadinessMap", () => {
  it("derives readiness statuses and next actions from seeded inventory", () => {
    const map = generateGleanSignalReadinessMap(inventory);
    const statuses = Object.fromEntries(
      map.entries.map((entry) => [entry.signal_family, entry.readiness_status])
    );

    expect(map.schema_version).toBe("GSR_2026_05");
    expect(statuses.workflow_run).toBe("present");
    expect(statuses.mcp_usage).toBe("not_computed");
    expect(statuses.ai_security).toBe("suppressed");
    expect(statuses.skill_lifecycle).toBe("missing");
    expect(map.next_actions).toEqual([
      {
        signal_family: "mcp_usage",
        action: "Confirm MCP Usage export availability and scrubbed field set.",
        owner: "glean_admin",
        priority: "high"
      },
      {
        signal_family: "skill_lifecycle",
        action: "Identify whether Skill lifecycle events are available for customer export.",
        owner: "data_governance",
        priority: "medium"
      }
    ]);
  });

  it("rejects unsafe extra fields in seeded inventory entries", () => {
    const parsed = GleanSignalInventorySchema.safeParse({
      ...inventory,
      signals: [
        {
          ...inventory.signals[0],
          user_id: "unsafe"
        }
      ]
    });

    expect(parsed.success).toBe(false);
  });
});
