import { enforceV1EvaluationDecision } from "../src/v1/evaluationDecision";

const baseInput = {
  schema_version: "FT_V1_2026_01" as const,
  artifact_name: "FT_V1_EVALUATION_DECISION" as const,
  org_id: "org-1",
  function_id: "func-1",
  role_class: "role-1",
  window_id: "2026-01-01__2026-03-01",
  window_length_days: 60,
  ambiguity_flag: false,
  behavioral_classes_present: 2,
  positive_evidence_present: false,
  ghost_use_candidate: false
};

it("defaults to SUPPRESS with a reason code", () => {
  const result = enforceV1EvaluationDecision(baseInput);
  expect(result.decision).toBe("SUPPRESS");
  expect(result.suppress_reason_code).toBe("SUPP_NO_QUALIFYING_EVIDENCE");
});

it("suppresses when ambiguity is present", () => {
  const result = enforceV1EvaluationDecision({
    ...baseInput,
    ambiguity_flag: true,
    candidate_decision: "SURFACE"
  });
  expect(result.decision).toBe("SUPPRESS");
  expect(result.suppress_reason_code).toBe("SUPP_AMBIGUITY_PRESENT");
});

it("suppresses when window length is below 60 days", () => {
  const result = enforceV1EvaluationDecision({
    ...baseInput,
    window_length_days: 59,
    candidate_decision: "SURFACE"
  });
  expect(result.decision).toBe("SUPPRESS");
  expect(result.suppress_reason_code).toBe("SUPP_WINDOW_LT_60D");
});

it("suppresses when fewer than two behavioral classes are present", () => {
  const result = enforceV1EvaluationDecision({
    ...baseInput,
    behavioral_classes_present: 1,
    candidate_decision: "SURFACE"
  });
  expect(result.decision).toBe("SUPPRESS");
  expect(result.suppress_reason_code).toBe("SUPP_LT_2_BEHAVIOR_CLASSES");
});

it("drops suppress reason codes on SURFACE decisions", () => {
  const result = enforceV1EvaluationDecision({
    ...baseInput,
    candidate_decision: "SURFACE",
    suppress_reason_code: "SUPP_SPARSE_DATA"
  });
  expect(result.decision).toBe("SURFACE");
  expect(result.suppress_reason_code).toBeUndefined();
});

it("fails closed when ghost-use is evaluated with positive evidence", () => {
  const result = enforceV1EvaluationDecision({
    ...baseInput,
    ghost_use_candidate: true,
    positive_evidence_present: true,
    candidate_decision: "SURFACE"
  });
  expect(result.decision).toBe("SUPPRESS");
  expect(result.suppress_reason_code).toBe("SUPP_INTERNAL_INVARIANT_FAIL");
});
