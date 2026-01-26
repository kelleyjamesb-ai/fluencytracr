import {
  evaluateV1SignalDecisions,
  buildCohortWindowKey
} from "../../src/inference/fluencytracr_v1_signal_evaluation";
import type { FluencyTracrV1Event, FluencyTracrV1EventName } from "@learnaire/shared";

const addDays = (date: Date, days: number): Date => {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
};

const formatDate = (date: Date): string => {
  return date.toISOString().slice(0, 10);
};

const buildWindowId = (start: Date, lengthDays: number): string => {
  const end = addDays(start, lengthDays - 1);
  return `${formatDate(start)}__${formatDate(end)}`;
};

const buildEvent = (
  event_name: FluencyTracrV1EventName,
  window_id: string,
  overrides: Record<string, unknown> = {}
): FluencyTracrV1Event => {
  const base = {
    schema_version: "FT_V1_2026_01",
    event_name,
    org_id: "org-1",
    function_id: "func-1",
    role_class: "IC",
    tool_surface: "ASSISTANT",
    event_timestamp: "2026-01-15T00:00:00Z",
    window_id,
    ambiguity_flag: false
  };

  switch (event_name) {
    case "FT_V1_DISPOSITION_OBSERVED":
      return { ...base, disposition: "ACCEPT", ...overrides } as FluencyTracrV1Event;
    case "FT_V1_ITERATION_DEPTH_OBSERVED":
      return { ...base, iteration_depth: "LIGHT", ...overrides } as FluencyTracrV1Event;
    case "FT_V1_VERIFICATION_PRESENCE_OBSERVED":
      return { ...base, verification_present: true, ...overrides } as FluencyTracrV1Event;
    case "FT_V1_RECOVERY_OBSERVED":
      return { ...base, recovery_present: true, ...overrides } as FluencyTracrV1Event;
    case "FT_V1_LATENCY_OBSERVED":
      return { ...base, latency_ms: 120, ...overrides } as FluencyTracrV1Event;
    case "FT_V1_ABANDONMENT_OBSERVED":
      return { ...base, abandonment_present: true, ...overrides } as FluencyTracrV1Event;
  }
};

describe("FluencyTracr V1 Signal Evaluation", () => {
  test("SUPPRESS includes exactly one suppress_reason_code and SURFACE omits it", () => {
    const start = new Date(Date.UTC(2026, 0, 1));
    const window1 = buildWindowId(start, 60);
    const window2 = buildWindowId(addDays(start, 60), 60);

    const events: FluencyTracrV1Event[] = [
      buildEvent("FT_V1_DISPOSITION_OBSERVED", window1),
      buildEvent("FT_V1_VERIFICATION_PRESENCE_OBSERVED", window2)
    ];
    const cohortSizes = new Map<string, number>([
      [buildCohortWindowKey({ org_id: "org-1", function_id: "func-1", role_class: "IC", window_id: window1 }), 6],
      [buildCohortWindowKey({ org_id: "org-1", function_id: "func-1", role_class: "IC", window_id: window2 }), 6]
    ]);

    const decisions = evaluateV1SignalDecisions(events, cohortSizes);
    const first = decisions.find((decision) => decision.window_id === window1);
    const second = decisions.find((decision) => decision.window_id === window2);

    expect(first?.decision).toBe("SUPPRESS");
    expect(first?.suppress_reason_code).toBeDefined();
    expect(second?.decision).toBe("SURFACE");
    expect(second).not.toHaveProperty("suppress_reason_code");
  });

  test("ambiguity suppresses before other gates", () => {
    const start = new Date(Date.UTC(2026, 0, 1));
    const windowId = buildWindowId(start, 30);

    const event = buildEvent("FT_V1_DISPOSITION_OBSERVED", windowId, {
      ambiguity_flag: true,
      ambiguity_reason_code: "AMB_EVIDENCE_CONFLICT"
    });

    const cohortSizes = new Map<string, number>([
      [buildCohortWindowKey({ org_id: "org-1", function_id: "func-1", role_class: "IC", window_id: windowId }), 3]
    ]);

    const [decision] = evaluateV1SignalDecisions([event], cohortSizes);
    expect(decision.decision).toBe("SUPPRESS");
    expect(decision.suppress_reason_code).toBe("SUPP_AMBIGUITY_PRESENT");
  });

  test("window_length_days < 60 always suppresses", () => {
    const start = new Date(Date.UTC(2026, 0, 1));

    for (let lengthDays = 1; lengthDays < 60; lengthDays += 1) {
      const windowId = buildWindowId(start, lengthDays);
      const event = buildEvent("FT_V1_VERIFICATION_PRESENCE_OBSERVED", windowId);
      const cohortSizes = new Map<string, number>([
        [buildCohortWindowKey({ org_id: "org-1", function_id: "func-1", role_class: "IC", window_id: windowId }), 6]
      ]);

      const [decision] = evaluateV1SignalDecisions([event], cohortSizes);
      expect(decision.decision).toBe("SUPPRESS");
      expect(decision.suppress_reason_code).toBe("SUPP_WINDOW_LT_60D");
    }
  });

  test("small-team cohorts always suppress", () => {
    const start = new Date(Date.UTC(2026, 0, 1));
    const windowId = buildWindowId(start, 60);

    const event = buildEvent("FT_V1_VERIFICATION_PRESENCE_OBSERVED", windowId);
    const cohortSizes = new Map<string, number>([
      [buildCohortWindowKey({ org_id: "org-1", function_id: "func-1", role_class: "IC", window_id: windowId }), 4]
    ]);

    const [decision] = evaluateV1SignalDecisions([event], cohortSizes);
    expect(decision.decision).toBe("SUPPRESS");
    expect(decision.suppress_reason_code).toBe("SUPP_SMALL_TEAM_LT_5");
  });

  test("unknown enum or missing required fields fail closed", () => {
    const start = new Date(Date.UTC(2026, 0, 1));
    const windowId = buildWindowId(start, 60);

    const invalidEvent = {
      schema_version: "FT_V1_2026_01",
      event_name: "FT_V1_DISPOSITION_OBSERVED",
      org_id: "org-1",
      function_id: "func-1",
      role_class: "IC",
      event_timestamp: "2026-01-15T00:00:00Z",
      window_id: windowId,
      ambiguity_flag: false,
      disposition: "ACCEPT"
    };

    const cohortSizes = new Map<string, number>([
      [buildCohortWindowKey({ org_id: "org-1", function_id: "func-1", role_class: "IC", window_id: windowId }), 6]
    ]);

    const [decision] = evaluateV1SignalDecisions([invalidEvent], cohortSizes);
    expect(decision.decision).toBe("SUPPRESS");
    expect(decision.suppress_reason_code).toBe("SUPP_INTERNAL_INVARIANT_FAIL");
  });
});
