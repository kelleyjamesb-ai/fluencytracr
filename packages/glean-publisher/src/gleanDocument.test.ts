import { describe, expect, it } from "vitest";
import { buildGleanDocument, validateGleanDocument } from "./gleanDocument.js";

const bundle = {
  schema_version: "evidence_bundle.v1" as const,
  org_id: "acme",
  window: "weekly",
  generated_at: "2026-03-31T15:00:00.000Z",
  suppression: {
    k_min: 5,
    suppression_applied: false,
    suppression_reasons: [] as string[]
  },
  coverage: {
    instrumented_sources: ["verification_signal"],
    missing_sources: ["ai_abandonment"]
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

describe("buildGleanDocument", () => {
  it("uses deterministic doc_id from org, window, and UTC date", () => {
    const doc = buildGleanDocument(bundle);
    expect(doc.doc_id).toBe("org_acme_weekly_2026-03-31");
    expect(doc.metadata.source_system).toBe("fluencytracr");
  });

  it("fails validateGleanDocument when a required field is dropped", () => {
    const doc = buildGleanDocument(bundle);
    const { trend_direction: _, ...bad } = doc;
    expect(() => validateGleanDocument(bad)).toThrow();
  });
});
