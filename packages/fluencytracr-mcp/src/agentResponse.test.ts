import { describe, expect, it } from "vitest";
import {
  buildAgentEvidenceResponse,
  validateAgentEvidenceResponse,
  AgentEvidenceResponseSchema
} from "./agentResponse.js";

const minimalBundle = {
  schema_version: "evidence_bundle.v1" as const,
  org_id: "org-1",
  window: "weekly",
  generated_at: "2026-03-31T12:00:00.000Z",
  suppression: {
    k_min: 5,
    suppression_applied: false,
    suppression_reasons: [] as string[]
  },
  coverage: {
    instrumented_sources: ["ai_output_disposition"],
    missing_sources: ["workflow_stage_transition"],
    coverage_notes: "test"
  },
  exposure: {
    shadow_ai: "not_present" as const,
    unsanctioned_tool_class: "not_computed" as const
  },
  calibration: {
    verification_presence: "present" as const,
    recovery_presence: "not_present" as const,
    escalation_to_safe_path_presence: "not_present" as const
  },
  fragility: {
    friction_loops_elevated: "not_present" as const,
    rapid_abandonment_elevated: "not_present" as const,
    blind_acceptance_risk_elevated: "not_present" as const
  },
  learning: {
    trend_direction: "stable" as const
  }
};

describe("buildAgentEvidenceResponse", () => {
  it("produces a strict-template object for a valid bundle", () => {
    const r = buildAgentEvidenceResponse(minimalBundle);
    expect(r.org_id).toBe("org-1");
    expect(r.coverage_summary.missing_sources).toContain("workflow_stage_transition");
    expect(r.decision_safe_guidance.length).toBeGreaterThan(10);
    expect(() => AgentEvidenceResponseSchema.parse(r)).not.toThrow();
  });

  it("propagates suppression without fabricating values", () => {
    const suppressed = {
      ...minimalBundle,
      suppression: {
        k_min: 5,
        suppression_applied: true,
        suppression_reasons: ["insufficient_population"]
      },
      learning: { trend_direction: "suppressed" as const }
    };
    const r = buildAgentEvidenceResponse(suppressed);
    expect(r.suppression_applied).toBe(true);
    expect(r.suppression_reasons).toEqual(["insufficient_population"]);
    expect("learning" in r).toBe(false);
    expect(r.decision_safe_guidance.toLowerCase()).toContain("suppression");
  });

  it("rejects extra top-level keys on response validation", () => {
    const r = buildAgentEvidenceResponse(minimalBundle);
    expect(() =>
      validateAgentEvidenceResponse({ ...r, team_ranking: [] })
    ).toThrow();
  });
});
