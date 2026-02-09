import { store } from "../../src/store";
import { runInference } from "../../src/inference/run_inference";
import * as versioning from "../../src/inference/versioning";

const buildFluencyEvent = (workflowId: string) => ({
  event_id: `evt-${workflowId}`,
  event_type: "ai_output_disposition" as const,
  timestamp: new Date().toISOString(),
  risk_class: "medium" as const,
  org_unit: "org:executive",
  workflow_id: workflowId,
  disposition: "accepted" as const,
  edit_distance_bucket: "none" as const,
  verification_present: true,
  time_to_action_ms: 120000
});

describe("runInference", () => {
  beforeEach(() => {
    store.reset();
  });

  it("appends records on successive runs with different parameter hashes", () => {
    store.fluencyEvents.set("evt-1", buildFluencyEvent("workflow-1"));
    const hashSpy = jest.spyOn(versioning, "parameterHash");
    hashSpy.mockReturnValueOnce("hash-a").mockReturnValueOnce("hash-b");

    runInference(["60d"]);
    runInference(["60d"]);

    expect(store.patternInferenceRecords.length).toBeGreaterThan(1);
    const hashes = store.patternInferenceRecords.map((record) => record.parameter_hash);
    expect(hashes).toContain("hash-a");
    expect(hashes).toContain("hash-b");
    hashSpy.mockRestore();
  });

  it("yields NO_PATTERN when evidence is low", () => {
    store.fluencyEvents.set("evt-1", buildFluencyEvent("workflow-1"));
    runInference(["60d"]);
    expect(store.patternInferenceRecords.length).toBeGreaterThan(0);
    const record = store.patternInferenceRecords[0];
    expect(record.pattern).toBe("NO_PATTERN");
    expect(record.confidence_level).toBe("WITHHOLD");
  });
});
