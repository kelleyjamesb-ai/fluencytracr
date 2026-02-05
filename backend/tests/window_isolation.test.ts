import { runInference } from "../src/inference/run_inference";
import { store } from "../src/store";

describe("window isolation", () => {
  beforeEach(() => {
    store.reset();
  });

  it("does not accumulate across consecutive runs", () => {
    store.patternInferenceRecords.push({
      scope_key: "old",
      scope_type: "WORKFLOW_RISK",
      pattern: "CALIBRATED_FLUENCY",
      inference_version: "v1",
      parameter_hash: "hash"
    });

    runInference("60d");
    expect(store.patternInferenceRecords).toHaveLength(0);

    runInference("30d");
    expect(store.patternInferenceRecords).toHaveLength(0);
  });
});
