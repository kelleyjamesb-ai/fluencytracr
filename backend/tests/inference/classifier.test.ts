import { classifyPattern } from "../../src/inference/classifier";
import { gateInference } from "../../src/inference/gating";
import type { JudgmentEvent, PatternInferenceRecord } from "../../src/inference/types";

describe("classifier determinism", () => {
  const baseRecord: PatternInferenceRecord = {
    scope_key: "workflow-1:MEDIUM",
    scope_type: "WORKFLOW_RISK",
    pattern: "CALIBRATED_FLUENCY",
    inference_version: "v0.1.0",
    parameter_hash: "hash"
  };

  const events: JudgmentEvent[] = [
    {
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
    }
  ];

  it("returns deterministic pattern for same input", () => {
    const first = classifyPattern(baseRecord, events);
    const second = classifyPattern(baseRecord, events);
    expect(first).toEqual(second);
  });

  it("gateInference is a no-op under TG5", () => {
    const gated = gateInference(baseRecord);
    expect(gated).toEqual(baseRecord);
  });
});
