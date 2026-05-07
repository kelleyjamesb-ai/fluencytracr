import {
  buildReportabilityDecision,
  buildCustomerEvidenceAppendix,
  CustomerEvidenceAppendixSchema,
  evaluateReportabilityGate,
  generateCustomerEvidenceAppendix,
  generateReportabilityDecision,
  REPORTABILITY_CLAIM_TAXONOMY,
  ReportabilityDecisionSchema,
  ReportabilityGateResponseSchema
} from "@learnaire/shared";

const baseReadinessMap = {
  schema_version: "GSR_2026_05",
  org_id: "org-northstar-enterprise",
  window: "weekly",
  generated_at: "2026-05-01T12:00:00.000Z",
  source_system: "Glean",
  entries: [
    {
      signal_family: "assistant",
      source_availability: "available",
      export_channel: "customer_event_logs",
      scrub_status: "scrubbed",
      stable_join_keys: ["chat_session_id", "session_tracking_token"],
      derived_dimensions: ["usage_quality", "coverage"],
      readiness_status: "present",
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
      signal_family: "search_document_retrieval",
      source_availability: "available",
      export_channel: "customer_event_logs",
      scrub_status: "scrubbed",
      stable_join_keys: ["session_tracking_token", "event_timestamp"],
      derived_dimensions: ["usage_quality", "coverage"],
      readiness_status: "present",
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
      signal_family: "insights",
      source_availability: "available",
      export_channel: "glean_api",
      scrub_status: "scrubbed",
      stable_join_keys: ["event_timestamp"],
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
    },
    {
      signal_family: "agent_run",
      source_availability: "approved_pending_export",
      export_channel: "customer_event_logs",
      scrub_status: "unknown",
      stable_join_keys: ["workflow_run_id"],
      derived_dimensions: ["behavior_change"],
      readiness_status: "not_computed",
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
      signal_family: "skill_lifecycle",
      source_availability: "unavailable",
      export_channel: "not_available",
      scrub_status: "unknown",
      stable_join_keys: [],
      derived_dimensions: ["capability_growth"],
      readiness_status: "missing",
      suppression_applied: false,
      suppression_reasons: [],
      data_quality: {
        completeness: "unknown",
        latency: "unknown",
        join_reliability: "unknown"
      },
      validation_evidence: []
    },
    {
      signal_family: "mcp_usage",
      source_availability: "available",
      export_channel: "customer_event_logs",
      scrub_status: "scrubbed",
      stable_join_keys: ["workflow_run_id", "tool_id"],
      derived_dimensions: ["capability_growth", "calibration"],
      readiness_status: "present",
      suppression_applied: false,
      suppression_reasons: [],
      data_quality: {
        completeness: "partial",
        latency: "known",
        join_reliability: "partial"
      },
      validation_evidence: []
    }
  ],
  next_actions: [
    {
      signal_family: "agent_run",
      action: "Confirm agent run export coverage before including agent ROI.",
      owner: "glean_admin",
      priority: "high"
    }
  ]
};

describe("generateReportabilityDecision", () => {
  it("allows covered ROI claims while caveating excluded advanced surfaces", () => {
    const decision = generateReportabilityDecision({
      report_context: "roi",
      readiness_map: baseReadinessMap
    });

    expect(decision.schema_version).toBe("FT_REPORTABILITY_2026_05");
    expect(decision.reportability).toBe("REPORTABLE_WITH_CAVEATS");
    expect(decision.evidence_confidence).toBe("MEDIUM");
    expect(decision.included_surfaces).toEqual(expect.arrayContaining(["chat", "search", "ai_answers", "mcp"]));
    expect(decision.excluded_surfaces).toEqual(expect.arrayContaining(["agents", "skills"]));
    expect(decision.allowed_claims.map((claim) => claim.claim_type)).toContain("covered_time_saved");
    expect(decision.blocked_claims.map((claim) => claim.claim_type)).toEqual(
      expect.arrayContaining([
        "total_productivity_impact",
        "causal_productivity_lift",
        "individual_productivity",
        "team_ranking",
        "agent_roi_included",
        "skill_roi_included",
        "api_roi_included",
        "gleanbot_roi_included"
      ])
    );
    expect(decision.required_caveats.join(" ")).toContain("excluded surfaces: agents, skills, apis, gleanbot");
    expect(ReportabilityDecisionSchema.parse(decision)).toEqual(decision);
  });

  it("suppresses ROI reporting when no required surface is present and a required surface is suppressed", () => {
    const suppressedMap = {
      ...baseReadinessMap,
      entries: baseReadinessMap.entries.map((entry) =>
        ["assistant", "search_document_retrieval", "insights"].includes(entry.signal_family)
          ? {
              ...entry,
              readiness_status: "suppressed",
              suppression_applied: true,
              suppression_reasons: ["INSUFFICIENT_VOLUME"]
            }
          : entry
      )
    };

    const decision = generateReportabilityDecision({
      report_context: "roi",
      readiness_map: suppressedMap
    });

    expect(decision.reportability).toBe("SUPPRESSED");
    expect(decision.allowed_claims).toEqual([]);
    expect(decision.required_caveats.join(" ")).toContain("suppressed");
  });

  it("rejects unsafe extra fields in reportability output", () => {
    const decision = generateReportabilityDecision({
      report_context: "roi",
      readiness_map: baseReadinessMap
    });

    const parsed = ReportabilityDecisionSchema.safeParse({
      ...decision,
      user_id: "unsafe"
    });

    expect(parsed.success).toBe(false);
  });

  it("parses a prebuilt reportability decision without changing semantics", () => {
    const decision = generateReportabilityDecision({
      report_context: "roi",
      readiness_map: baseReadinessMap
    });

    expect(buildReportabilityDecision(decision)).toEqual(decision);
  });

  it("exposes an explicit ROI claim taxonomy instead of ad hoc claim strings", () => {
    const roiClaimTypes = REPORTABILITY_CLAIM_TAXONOMY
      .filter((claim) => claim.report_contexts.includes("roi"))
      .map((claim) => claim.claim_type);

    expect(roiClaimTypes).toEqual(expect.arrayContaining([
      "covered_time_saved",
      "surface_adoption",
      "total_productivity_impact",
      "causal_productivity_lift"
    ]));
    expect(REPORTABILITY_CLAIM_TAXONOMY.every((claim) => claim.rationale.length > 0)).toBe(true);
  });

  it("supports agent insights as a bounded observability context", () => {
    const agentReadyMap = {
      ...baseReadinessMap,
      entries: [
        ...baseReadinessMap.entries,
        {
          signal_family: "agent_step",
          source_availability: "available",
          export_channel: "customer_event_logs",
          scrub_status: "scrubbed",
          stable_join_keys: ["workflow_run_id", "step_id"],
          derived_dimensions: ["behavior_change", "coverage"],
          readiness_status: "present",
          suppression_applied: false,
          suppression_reasons: [],
          data_quality: {
            completeness: "verified",
            latency: "known",
            join_reliability: "stable"
          },
          validation_evidence: []
        }
      ].map((entry) =>
        entry.signal_family === "agent_run"
          ? {
              ...entry,
              source_availability: "available",
              scrub_status: "scrubbed",
              readiness_status: "present",
              data_quality: {
                completeness: "verified",
                latency: "known",
                join_reliability: "stable"
              }
            }
          : entry
      )
    };

    const decision = generateReportabilityDecision({
      report_context: "agent_insights",
      readiness_map: agentReadyMap
    });

    expect(decision.reportability).toBe("REPORTABLE_WITH_CAVEATS");
    expect(decision.included_surfaces).toEqual(expect.arrayContaining(["agents", "mcp"]));
    expect(decision.excluded_surfaces).toEqual(["skills"]);
    expect(decision.allowed_claims.map((claim) => claim.claim_type)).toEqual(expect.arrayContaining([
      "agent_observability",
      "workflow_coverage",
      "surface_adoption"
    ]));
    expect(decision.blocked_claims.map((claim) => claim.claim_type)).toEqual(expect.arrayContaining([
      "total_productivity_impact",
      "causal_productivity_lift",
      "individual_productivity",
      "team_ranking"
    ]));
    expect(decision.blocked_claims.map((claim) => claim.claim_type)).not.toContain("skill_roi_included");
    expect(decision.required_caveats.join(" ")).toContain("Agent insight claims must be limited");
  });

  it("supports skills reporting as lifecycle visibility without skill quality claims", () => {
    const skillReadyMap = {
      ...baseReadinessMap,
      entries: baseReadinessMap.entries.map((entry) =>
        entry.signal_family === "skill_lifecycle"
          ? {
              ...entry,
              source_availability: "available",
              export_channel: "customer_event_logs",
              scrub_status: "scrubbed",
              stable_join_keys: ["skill_artifact_id", "event_timestamp"],
              readiness_status: "present",
              data_quality: {
                completeness: "verified",
                latency: "known",
                join_reliability: "stable"
              }
            }
          : entry
      )
    };

    const decision = generateReportabilityDecision({
      report_context: "skills_reporting",
      readiness_map: skillReadyMap
    });

    expect(decision.reportability).toBe("REPORTABLE_WITH_CAVEATS");
    expect(decision.included_surfaces).toEqual(expect.arrayContaining(["skills", "mcp"]));
    expect(decision.allowed_claims.map((claim) => claim.claim_type)).toEqual(expect.arrayContaining([
      "skill_lifecycle_visibility",
      "surface_adoption"
    ]));
    expect(decision.blocked_claims.map((claim) => claim.claim_type)).toEqual(expect.arrayContaining([
      "total_productivity_impact",
      "causal_productivity_lift",
      "individual_productivity",
      "team_ranking"
    ]));
  });

  it("supports MCP reporting as tool observability without MCP success claims", () => {
    const decision = generateReportabilityDecision({
      report_context: "mcp_reporting",
      readiness_map: baseReadinessMap
    });

    expect(decision.reportability).toBe("REPORTABLE_WITH_CAVEATS");
    expect(decision.included_surfaces).toContain("mcp");
    expect(decision.excluded_surfaces).toEqual(expect.arrayContaining(["agents", "skills"]));
    expect(decision.allowed_claims.map((claim) => claim.claim_type)).toEqual(expect.arrayContaining([
      "mcp_tool_observability",
      "surface_adoption"
    ]));
    expect(decision.blocked_claims.map((claim) => claim.claim_type)).not.toContain("mcp_roi_included");
    expect(decision.required_caveats.join(" ")).toContain("MCP reporting claims must be limited");
  });

  it("generates a customer-facing evidence appendix from a reportability decision", () => {
    const decision = generateReportabilityDecision({
      report_context: "roi",
      readiness_map: baseReadinessMap
    });

    const appendix = generateCustomerEvidenceAppendix(decision);

    expect(appendix.schema_version).toBe("FT_EVIDENCE_APPENDIX_2026_05");
    expect(appendix.reportability).toBe("REPORTABLE_WITH_CAVEATS");
    expect(appendix.covered_surfaces).toEqual(expect.arrayContaining(["chat", "search", "ai_answers", "mcp"]));
    expect(appendix.excluded_surfaces.map((surface) => surface.surface)).toEqual(expect.arrayContaining(["agents", "skills", "apis", "gleanbot"]));
    expect(appendix.evidence_gaps.join(" ")).toContain("agent");
    expect(appendix.governance_posture.join(" ")).toContain("Aggregate-only");
    expect(appendix.blocked_claims.map((claim) => claim.claim_type)).toContain("team_ranking");
    expect(CustomerEvidenceAppendixSchema.parse(appendix)).toEqual(appendix);
    expect(buildCustomerEvidenceAppendix(appendix)).toEqual(appendix);
  });

  it("rejects unsafe extra fields in the customer evidence appendix", () => {
    const decision = generateReportabilityDecision({
      report_context: "roi",
      readiness_map: baseReadinessMap
    });
    const appendix = generateCustomerEvidenceAppendix(decision);

    const parsed = CustomerEvidenceAppendixSchema.safeParse({
      ...appendix,
      email: "unsafe@example.com"
    });

    expect(parsed.success).toBe(false);
  });

  it("evaluates requested claims through the downstream reportability gate", () => {
    const response = evaluateReportabilityGate({
      schema_version: "FT_REPORTABILITY_GATE_2026_05",
      caller_system: "roi_model",
      report_context: "roi",
      requested_claims: ["covered_time_saved", "total_productivity_impact", "agent_observability"],
      readiness_map: baseReadinessMap
    });

    expect(response.decision.reportability).toBe("REPORTABLE_WITH_CAVEATS");
    expect(response.appendix.schema_version).toBe("FT_EVIDENCE_APPENDIX_2026_05");
    expect(response.requested_claim_results).toEqual([
      expect.objectContaining({ claim_type: "covered_time_saved", disposition: "allowed" }),
      expect.objectContaining({ claim_type: "total_productivity_impact", disposition: "blocked" }),
      expect.objectContaining({ claim_type: "agent_observability", disposition: "blocked" })
    ]);
    expect(ReportabilityGateResponseSchema.parse(response)).toEqual(response);
  });
});
