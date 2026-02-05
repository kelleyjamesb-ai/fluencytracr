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
  test("surfaces decisions when evidence is present and unambiguous", () => {
    const start = new Date(Date.UTC(2026, 0, 1));
    const windowId = buildWindowId(start, 60);
    const events: FluencyTracrV1Event[] = [
      buildEvent("FT_V1_DISPOSITION_OBSERVED", windowId)
    ];

    const decisions = evaluateV1SignalDecisions(events);
    expect(decisions).toHaveLength(1);
    expect(decisions[0].decision).toBe("SURFACE");
    expect(decisions[0].window_id).toBe(windowId);
  });

  test("ambiguous evidence suppresses output", () => {
    const start = new Date(Date.UTC(2026, 0, 1));
    const windowId = buildWindowId(start, 60);
    const events: FluencyTracrV1Event[] = [
      buildEvent("FT_V1_DISPOSITION_OBSERVED", windowId, { ambiguity_flag: true })
    ];

    const decisions = evaluateV1SignalDecisions(events);
    expect(decisions).toHaveLength(0);
  });

  test("invalid events fail closed for their cohort", () => {
    const start = new Date(Date.UTC(2026, 0, 1));
    const windowId = buildWindowId(start, 60);
    const key = buildCohortWindowKey({
      org_id: "org-1",
      function_id: "func-1",
      role_class: "IC",
      window_id: windowId
    });

    const decisions = evaluateV1SignalDecisions([
      { org_id: "org-1", function_id: "func-1", role_class: "IC", window_id: windowId, event_name: "bad" }
    ]);

    expect(decisions).toHaveLength(0);
    expect(key).toContain(windowId);
  });
});
