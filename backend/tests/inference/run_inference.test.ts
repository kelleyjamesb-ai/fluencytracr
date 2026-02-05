import { store } from "../../src/store";
import { runInference } from "../../src/inference/run_inference";

describe("runInference", () => {
  beforeEach(() => {
    store.reset();
  });

  it("clears inference records and does not accumulate across runs", () => {
    store.patternInferenceRecords.push({
      scope_key: "old",
      scope_type: "WORKFLOW_RISK",
      pattern: "CALIBRATED_FLUENCY",
      inference_version: "v1",
      parameter_hash: "hash"
    });

    runInference("60d");
    expect(store.patternInferenceRecords).toHaveLength(0);

    runInference("60d");
    expect(store.patternInferenceRecords).toHaveLength(0);
  });
});
