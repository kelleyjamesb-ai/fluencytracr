import {
  FluencyTracrV1SuppressReasonCodeSchema,
  SuppressionReasonSchema
} from "@fluencytracr/shared";
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

it("keeps internal SUPP diagnostics outside the canonical product vocabulary", () => {
  const canonicalReasons = new Set(SuppressionReasonSchema.options);

  for (const diagnostic of FluencyTracrV1SuppressReasonCodeSchema.options) {
    expect(canonicalReasons.has(diagnostic as never)).toBe(false);
    expect(SuppressionReasonSchema.safeParse(diagnostic).success).toBe(false);
  }
});

it("defaults to SUPPRESS with a reason code", () => {
  const result = enforceV1EvaluationDecision(baseInput);
  expect(result.decision).toBe("SUPPRESS");
  expect(result.suppress_reason_code).toBe("SUPP_NO_QUALIFYING_EVIDENCE");
  expect(result.value_type).toBe("UNCLASSIFIED");
  expect(result.evidence_grade).toBe("QUALITATIVE");
});

it("suppresses ambiguous inputs when ambiguity is present", () => {
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

it("nulls Reliability Factor fields on SUPPRESS decisions", () => {
  const result = enforceV1EvaluationDecision(baseInput);
  expect(result.decision).toBe("SUPPRESS");
  expect(result.reliability_factor).toBeNull();
  expect(result.reliability_components).toBeNull();
});

it("emits Reliability Factor fields on SURFACE decisions from canonical observations", () => {
  const result = enforceV1EvaluationDecision({
    ...baseInput,
    candidate_decision: "SURFACE",
    canonical_events: [
      { event_name: "FT_V1_VERIFICATION_PRESENCE_OBSERVED", verification_present: true },
      { event_name: "FT_V1_VERIFICATION_PRESENCE_OBSERVED", verification_present: false },
      { event_name: "FT_V1_RECOVERY_OBSERVED", recovery_present: true },
      { event_name: "FT_V1_RECOVERY_OBSERVED", recovery_present: true },
      { event_name: "FT_V1_ITERATION_DEPTH_OBSERVED", iteration_depth: "HEAVY" },
      { event_name: "FT_V1_ITERATION_DEPTH_OBSERVED", iteration_depth: "LIGHT" },
      { event_name: "FT_V1_ABANDONMENT_OBSERVED", abandonment_present: true },
      { event_name: "FT_V1_ABANDONMENT_OBSERVED", abandonment_present: false }
    ]
  });

  expect(result.decision).toBe("SURFACE");
  expect(result.reliability_components).toEqual({
    abandonment_rate: 0.5,
    friction_loop_rate: 0.5,
    recovery_success_rate: 1,
    verification_presence_rate: 0.5
  });
  expect(result.reliability_factor).toBe(0.625);
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

it("gates renderability when window_length_days < 60", () => {
  const result = enforceV1EvaluationDecision({
    ...baseInput,
    window_length_days: 45,
    candidate_decision: "SURFACE"
  });
  expect(result.renderable).toBe(false);
  expect(result.decision).toBe("SUPPRESS");
  expect(result.suppress_reason_code).toBe("SUPP_WINDOW_LT_60D");
});

it("sets renderable to true when window >= 60 and decision is SURFACE", () => {
  const result = enforceV1EvaluationDecision({
    ...baseInput,
    window_length_days: 60,
    behavioral_classes_present: 3,
    candidate_decision: "SURFACE"
  });
  expect(result.renderable).toBe(true);
  expect(result.decision).toBe("SURFACE");
  expect(result.suppress_reason_code).toBeUndefined();
});

it("maps acceleration from latency plus low abandonment observations", () => {
  const result = enforceV1EvaluationDecision({
    ...baseInput,
    window_length_days: 90,
    cohort_size: 30,
    behavioral_classes_present: 2,
    candidate_decision: "SURFACE",
    canonical_events: [
      { event_name: "FT_V1_LATENCY_OBSERVED", latency_ms: 100 },
      { event_name: "FT_V1_LATENCY_OBSERVED", latency_ms: 120 },
      { event_name: "FT_V1_ABANDONMENT_OBSERVED", abandonment_present: false },
      { event_name: "FT_V1_ABANDONMENT_OBSERVED", abandonment_present: false }
    ]
  });
  expect(result.value_type).toBe("ACCELERATION");
  expect(result.evidence_grade).toBe("OBJECTIVE");
});

it("maps quality premium from verification plus recovery dominance", () => {
  const result = enforceV1EvaluationDecision({
    ...baseInput,
    behavioral_classes_present: 2,
    candidate_decision: "SURFACE",
    canonical_events: [
      { event_name: "FT_V1_VERIFICATION_PRESENCE_OBSERVED", verification_present: true },
      { event_name: "FT_V1_RECOVERY_OBSERVED", recovery_present: true },
      { event_name: "FT_V1_RECOVERY_OBSERVED", recovery_present: true }
    ]
  });
  expect(result.value_type).toBe("QUALITY_PREMIUM");
  expect(result.evidence_grade).toBe("QUALITATIVE");
});

it("reserves NET_NEW for explicit upstream tagging only", () => {
  const inferred = enforceV1EvaluationDecision({
    ...baseInput,
    behavioral_classes_present: 2,
    candidate_decision: "SURFACE",
    canonical_events: [{ event_name: "FT_V1_DISPOSITION_OBSERVED" }]
  });
  expect(inferred.value_type).toBe("UNCLASSIFIED");

  const tagged = enforceV1EvaluationDecision({
    ...baseInput,
    behavioral_classes_present: 2,
    candidate_decision: "SURFACE",
    explicit_value_type: "NET_NEW",
    canonical_events: [{ event_name: "FT_V1_DISPOSITION_OBSERVED" }]
  });
  expect(tagged.value_type).toBe("NET_NEW");
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
