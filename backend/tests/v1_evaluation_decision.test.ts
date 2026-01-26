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

it("bypasses ghost-use evaluation when positive evidence is present", () => {
  const result = enforceV1EvaluationDecision({
    ...baseInput,
    ghost_use_candidate: true,
    positive_evidence_present: true,
    candidate_decision: "SURFACE"
  });
  expect(result.decision).toBe("SURFACE");
  expect(result.suppress_reason_code).toBeUndefined();
});

describe("TG3 property tests", () => {
  it("always suppresses when ambiguity is present", () => {
    const result = enforceV1EvaluationDecision({
      ...baseInput,
      ambiguity_flag: true,
      candidate_decision: "SURFACE"
    });
    expect(result.decision).toBe("SUPPRESS");
    expect(result.suppress_reason_code).toBe("SUPP_AMBIGUITY_PRESENT");
  });

  it("never surfaces 30-59 day windows", () => {
    for (let days = 30; days <= 59; days += 1) {
      const result = enforceV1EvaluationDecision({
        ...baseInput,
        window_length_days: days,
        candidate_decision: "SURFACE"
      });
      expect(result.decision).toBe("SUPPRESS");
      expect(result.suppress_reason_code).toBe("SUPP_WINDOW_LT_60D");
    }
  });

  it("never surfaces when fewer than two behavioral classes are present", () => {
    for (const classes of [0, 1]) {
      const result = enforceV1EvaluationDecision({
        ...baseInput,
        behavioral_classes_present: classes,
        candidate_decision: "SURFACE"
      });
      expect(result.decision).toBe("SUPPRESS");
      expect(result.suppress_reason_code).toBe("SUPP_LT_2_BEHAVIOR_CLASSES");
    }
  });

  it("bypasses ghost-use evaluation when positive evidence is present", () => {
    const result = enforceV1EvaluationDecision({
      ...baseInput,
      ghost_use_candidate: true,
      positive_evidence_present: true,
      candidate_decision: "SURFACE"
    });
    expect(result.decision).toBe("SURFACE");
    expect(result.suppress_reason_code).toBeUndefined();
  });

  it("fails closed under sparse data, noisy instrumentation, and partial adoption", () => {
    const cases = [
      {
        name: "sparse data",
        input: {
          window_length_days: 60,
          behavioral_classes_present: 0,
          candidate_decision: "SURFACE" as const
        },
        expectedDecision: "SUPPRESS",
        expectedReason: "SUPP_LT_2_BEHAVIOR_CLASSES"
      },
      {
        name: "noisy instrumentation",
        input: {
          ambiguity_flag: true,
          candidate_decision: "SURFACE" as const
        },
        expectedDecision: "SUPPRESS",
        expectedReason: "SUPP_AMBIGUITY_PRESENT"
      },
      {
        name: "partial adoption",
        input: {
          window_length_days: 45,
          behavioral_classes_present: 1,
          candidate_decision: "SURFACE" as const
        },
        expectedDecision: "SUPPRESS",
        expectedReason: "SUPP_WINDOW_LT_60D"
      },
      {
        name: "eligible with positive evidence",
        input: {
          window_length_days: 60,
          ambiguity_flag: false,
          behavioral_classes_present: 2,
          positive_evidence_present: true,
          candidate_decision: "SURFACE" as const
        },
        expectedDecision: "SURFACE"
      }
    ];

    for (const testCase of cases) {
      const result = enforceV1EvaluationDecision({
        ...baseInput,
        ...testCase.input
      });
      expect(result.decision).toBe(testCase.expectedDecision);
      if (testCase.expectedDecision === "SUPPRESS") {
        expect(result.suppress_reason_code).toBe(testCase.expectedReason);
      } else {
        expect(result.suppress_reason_code).toBeUndefined();
      }
    }
  });
});
