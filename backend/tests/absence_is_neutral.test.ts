import { evaluateV1SignalDecisions } from "../src/inference/fluencytracr_v1_signal_evaluation";
import { enforceV1EvaluationDecision } from "../src/v1/evaluationDecision";

describe("absence is neutral", () => {
  it("omits outputs when no evidence is present", () => {
    expect(evaluateV1SignalDecisions([])).toEqual([]);
  });

  it("does not emit placeholder decisions for missing evidence", () => {
    const result = enforceV1EvaluationDecision({
      schema_version: "FT_V1_2026_01",
      artifact_name: "FT_V1_EVALUATION_DECISION",
      org_id: "org-1",
      function_id: "func-1",
      role_class: "role-1",
      window_id: "2026-01-01__2026-03-01",
      ambiguity_flag: false,
      evidence_present: false
    });

    expect(result).toBeNull();
  });
});
