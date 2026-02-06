import { evaluateDecision } from "../src/phase1/evaluateDecision";
import type { Phase1Event } from "../src/phase1/contract";

const buildEvent = (overrides: Partial<Phase1Event> = {}): Phase1Event => ({
  schema_version: "FT_V1_2026_01",
  event_name: "FT_V1_DISPOSITION_OBSERVED",
  org_id: "org-1",
  function_id: "func-1",
  role_class: "role-1",
  tool_surface: "ASSISTANT",
  event_timestamp: "2025-01-01T00:00:00Z",
  window_id: "2025-01-01__2025-03-15",
  ambiguity_flag: false,
  ...overrides
});

describe("Phase 5A runtime proofs", () => {
  it("is deterministic for identical inputs", () => {
    const events: Phase1Event[] = [
      buildEvent({ event_name: "FT_V1_DISPOSITION_OBSERVED" }),
      buildEvent({ event_name: "FT_V1_LATENCY_OBSERVED" })
    ];

    const first = evaluateDecision(events);
    const second = evaluateDecision(events);

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});
