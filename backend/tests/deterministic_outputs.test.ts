import { enforceV1EvaluationDecision } from "../src/v1/evaluationDecision";

describe("deterministic outputs", () => {
  it("identical inputs yield identical outputs", () => {
    const input = {
      schema_version: "FT_V1_2026_01" as const,
      artifact_name: "FT_V1_EVALUATION_DECISION" as const,
      org_id: "org-1",
      function_id: "func-1",
      role_class: "role-1",
      window_id: "2026-01-01__2026-03-01",
      ambiguity_flag: false,
      evidence_present: true
    };

    const first = enforceV1EvaluationDecision(input);
    const second = enforceV1EvaluationDecision(input);

    expect(first).toEqual(second);
  });
});
