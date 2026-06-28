import {
  GleanSignalReadinessMapSchema,
  buildGleanSignalReadinessMap
} from "@fluencytracr/shared";

const validMap = {
  schema_version: "GSR_2026_05",
  org_id: "org-1",
  window: "weekly",
  generated_at: "2026-05-01T12:00:00.000Z",
  source_system: "Glean",
  entries: [
    {
      signal_family: "workflow_run",
      source_availability: "available",
      export_channel: "customer_event_logs",
      scrub_status: "scrubbed",
      stable_join_keys: ["run_id", "workflow_run_id"],
      derived_dimensions: ["usage_quality", "behavior_change"],
      readiness_status: "present",
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
          note: "WorkflowRun fields verified without raw content or direct identifiers."
        }
      ]
    }
  ],
  next_actions: [
    {
      signal_family: "mcp_usage",
      action: "Confirm export availability and scrubbed field set.",
      owner: "glean_admin",
      priority: "high"
    }
  ]
};

describe("GleanSignalReadinessMapSchema", () => {
  it("accepts an org-window readiness map for aggregate Glean signal families", () => {
    const parsed = buildGleanSignalReadinessMap(validMap);

    expect(parsed.schema_version).toBe("GSR_2026_05");
    expect(parsed.entries[0].derived_dimensions).toContain("behavior_change");
    expect(GleanSignalReadinessMapSchema.parse(parsed)).toEqual(parsed);
  });

  it("rejects direct identifiers, raw content fields, and ranking fields", () => {
    const unsafeKeys = ["user_id", "prompt_text", "team_ranking"];

    for (const key of unsafeKeys) {
      const parsed = GleanSignalReadinessMapSchema.safeParse({
        ...validMap,
        entries: [
          {
            ...validMap.entries[0],
            [key]: "unsafe"
          }
        ]
      });

      expect(parsed.success).toBe(false);
    }
  });
});
