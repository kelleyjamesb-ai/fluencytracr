import { classifyPattern } from "../../src/inference/classifier";
import { gateInference } from "../../src/inference/gating";
import type { JudgmentEvent, PatternInferenceRecord } from "../../src/inference/types";

describe("classifier determinism", () => {
  const baseRecord: PatternInferenceRecord = {
    scope_key: "workflow-1:MEDIUM",
    scope_type: "WORKFLOW_RISK",
    window_start: new Date().toISOString(),
    window_end: new Date().toISOString(),
    pattern: "NO_PATTERN",
    confidence_level: "WITHHOLD",
    evidence_count: 50,
    coverage_days: 15,
    surface_mix: { CHAT: 10, DOC_BLOCK: 0, CODE_BLOCK: 0, SUMMARY: 0 },
    top_drivers: [],
    inference_version: "v0.1.0",
    parameter_hash: "hash",
    code_commit_hash: "hash",
    generated_at: new Date().toISOString()
  };

  const events: JudgmentEvent[] = Array.from({ length: 50 }, () => ({
    event_id: "evt",
    schema_version: "v0.2",
    source_system: "legacy_fluency",
    workflow_id: "workflow-1",
    role_context: "EXEC",
    workflow_risk_level: "MEDIUM",
    surface_type: "CHAT",
    event_type: "ACCEPT",
    human_action_timestamp: new Date().toISOString(),
    latency_bucket: "SHORT_DELAY"
  }));

  it("returns deterministic pattern for same input", () => {
    const first = classifyPattern(baseRecord, events);
    const second = classifyPattern(baseRecord, events);
    expect(first.pattern).toBe(second.pattern);
    expect(first.confidence_level).toBe(second.confidence_level);
  });

  it("gates when evidence is below thresholds", () => {
    const lowEvidence = {
      ...baseRecord,
      evidence_count: 2,
      coverage_days: 1
    };
    const gated = gateInference(lowEvidence);
    expect(gated.pattern).toBe("NO_PATTERN");
    expect(gated.confidence_level).toBe("WITHHOLD");
  });
});
