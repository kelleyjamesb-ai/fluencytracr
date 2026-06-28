import {
  evaluateReportabilityGate,
  ReportabilityGateRequestSchema
} from "@fluencytracr/shared";

const presentEntry = (signal_family: string, stable_join_keys: string[] = ["event_timestamp"]) => ({
  signal_family,
  source_availability: "available",
  export_channel: "customer_event_logs",
  scrub_status: "scrubbed",
  stable_join_keys,
  derived_dimensions: ["coverage"],
  readiness_status: "present",
  suppression_applied: false,
  suppression_reasons: [],
  data_quality: {
    completeness: "verified",
    latency: "known",
    join_reliability: "stable"
  },
  validation_evidence: []
});

const readinessMap = {
  schema_version: "GSR_2026_05",
  org_id: "org-governance-regression",
  window: "weekly",
  generated_at: "2026-05-06T12:00:00.000Z",
  source_system: "Glean",
  entries: [
    presentEntry("assistant", ["chat_session_id", "session_tracking_token"]),
    presentEntry("search_document_retrieval", ["session_tracking_token"]),
    presentEntry("insights", ["event_timestamp"]),
    presentEntry("agent_run", ["workflow_run_id"]),
    presentEntry("agent_step", ["workflow_run_id", "step_id"]),
    presentEntry("skill_lifecycle", ["skill_artifact_id", "event_timestamp"]),
    presentEntry("mcp_usage", ["workflow_run_id", "tool_id"])
  ],
  next_actions: []
};

describe("reportability governance regressions", () => {
  it.each([
    ["roi", "roi_model"],
    ["agent_insights", "agent_insights"],
    ["skills_reporting", "skills_reporting"],
    ["mcp_reporting", "mcp_reporting"]
  ])("keeps unsafe claims blocked for %s", (report_context, caller_system) => {
    const response = evaluateReportabilityGate({
      schema_version: "FT_REPORTABILITY_GATE_2026_05",
      caller_system,
      report_context,
      requested_claims: [
        "total_productivity_impact",
        "causal_productivity_lift",
        "individual_productivity",
        "team_ranking"
      ],
      readiness_map: readinessMap
    });

    expect(response.requested_claim_results).toHaveLength(4);
    expect(response.requested_claim_results.every((claim) => claim.disposition === "blocked")).toBe(true);
    expect(response.appendix.governance_posture.join(" ")).toContain("Aggregate-only");
  });

  it("rejects unsafe fields at the gate request boundary", () => {
    const parsed = ReportabilityGateRequestSchema.safeParse({
      schema_version: "FT_REPORTABILITY_GATE_2026_05",
      caller_system: "roi_model",
      report_context: "roi",
      requested_claims: ["covered_time_saved"],
      readiness_map: readinessMap,
      user_email: "unsafe@example.com"
    });

    expect(parsed.success).toBe(false);
  });

  it("fails closed for report contexts that have not been implemented", () => {
    expect(() =>
      evaluateReportabilityGate({
        schema_version: "FT_REPORTABILITY_GATE_2026_05",
        caller_system: "transformation_report",
        report_context: "transformation_narrative",
        requested_claims: ["surface_adoption"],
        readiness_map: readinessMap
      })
    ).toThrow("not implemented");
  });
});
