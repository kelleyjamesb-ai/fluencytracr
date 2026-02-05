import { enforceV1EvaluationDecision } from "../src/v1/evaluationDecision";

describe("binary-only visibility", () => {
  it("emits only SURFACE decisions", () => {
    const result = enforceV1EvaluationDecision({
      schema_version: "FT_V1_2026_01",
      artifact_name: "FT_V1_EVALUATION_DECISION",
      org_id: "org-1",
      function_id: "func-1",
      role_class: "role-1",
      window_id: "2026-01-01__2026-03-01",
      ambiguity_flag: false,
      evidence_present: true
    });

    expect(result?.decision).toBe("SURFACE");
    expect(result).not.toHaveProperty("renderable");
  });
});
