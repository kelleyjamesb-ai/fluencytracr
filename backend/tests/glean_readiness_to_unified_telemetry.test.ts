import {
  UnifiedTelemetryEventSchema,
  generateGleanSignalReadinessMap,
  mapReadinessToUnifiedTelemetryCoverage
} from "@fluencytracr/shared";

const readinessMap = generateGleanSignalReadinessMap({
  schema_version: "GSR_INVENTORY_2026_05",
  org_id: "org-northstar-enterprise",
  window: "weekly",
  generated_at: "2026-05-01T13:00:00.000Z",
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
      validation_evidence: []
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
      validation_evidence: []
    },
    {
      signal_family: "ai_security",
      source_availability: "available",
      export_channel: "customer_event_logs",
      scrub_status: "scrubbed",
      stable_join_keys: ["workflow_run_id"],
      derived_dimensions: ["leadership_reinforcement", "exposure"],
      suppression_applied: true,
      suppression_reasons: ["policy_review_required"],
      data_quality: {
        completeness: "partial",
        latency: "known",
        join_reliability: "partial"
      },
      validation_evidence: []
    }
  ]
});

describe("mapReadinessToUnifiedTelemetryCoverage", () => {
  it("emits valid aggregate UT events only for present readiness entries", () => {
    const result = mapReadinessToUnifiedTelemetryCoverage(readinessMap);

    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toEqual(
      expect.objectContaining({
        schema_version: "UT_2026_04",
        event_name: "UT.AGENT.RUN_BOUNDARY_RECORDED.V1",
        event_category: "AGENT_EXECUTION",
        org_id: "org-northstar-enterprise",
        workflow_id: "glean:workflow_run",
        window_id: "2026-04-24__2026-05-01"
      })
    );
    expect(() => UnifiedTelemetryEventSchema.parse(result.events[0])).not.toThrow();
  });

  it("preserves missing suppressed and not-computed signals without emitting UT events", () => {
    const result = mapReadinessToUnifiedTelemetryCoverage(readinessMap);

    expect(result.non_computable_signals).toEqual([
      {
        signal_family: "mcp_usage",
        readiness_status: "not_computed",
        suppression_reasons: [],
        reason: "approved_pending_export"
      },
      {
        signal_family: "ai_security",
        readiness_status: "suppressed",
        suppression_reasons: ["policy_review_required"],
        reason: "policy_review_required"
      }
    ]);
  });
});
