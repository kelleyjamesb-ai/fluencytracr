import { enforceV1EvaluationDecision } from "../src/v1/evaluationDecision";

const baseInput = {
  schema_version: "FT_V1_2026_01" as const,
  artifact_name: "FT_V1_EVALUATION_DECISION" as const,
  org_id: "org-1",
  function_id: "func-1",
  role_class: "role-1",
  window_id: "2026-01-01__2026-03-01",
  ambiguity_flag: false,
  evidence_present: true
};

it("suppresses ambiguous inputs", () => {
  const result = enforceV1EvaluationDecision({
    ...baseInput,
    ambiguity_flag: true
  });
  expect(result).toBeNull();
});

it("suppresses when evidence is absent", () => {
  const result = enforceV1EvaluationDecision({
    ...baseInput,
    evidence_present: false
  });
  expect(result).toBeNull();
});

it("surfaces when unambiguous evidence is present", () => {
  const result = enforceV1EvaluationDecision(baseInput);
  expect(result).toEqual({
    schema_version: baseInput.schema_version,
    artifact_name: baseInput.artifact_name,
    org_id: baseInput.org_id,
    function_id: baseInput.function_id,
    role_class: baseInput.role_class,
    window_id: baseInput.window_id,
    decision: "SURFACE"
  });
});
