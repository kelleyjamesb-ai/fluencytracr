import { evaluateDecision } from "../src/phase1/evaluateDecision";
import { surfaceDecision } from "../src/phase1/surfaceDecision";
import type { Phase1Event } from "../src/phase1/contract";

const buildEvent = (overrides: Partial<Phase1Event> = {}): Phase1Event => ({
  schema_version: "FT_V1_2026_01",
  event_name: "FT_V1_DISPOSITION_OBSERVED",
  org_id: "org-1",
  function_id: "func-1",
  role_class: "role-1",
  tool_surface: "ASSISTANT",
  event_timestamp: "2025-01-01T00:00:00Z",
  window_id: "2025-01-01__2025-02-01",
  ambiguity_flag: false,
  ...overrides
});

describe("Phase 5A runtime proofs", () => {
  it("suppresses before surfacing", () => {
    const events: Phase1Event[] = [
      buildEvent({ event_name: "FT_V1_DISPOSITION_OBSERVED" })
    ];

    const decision = evaluateDecision(events);
    const surfaced = surfaceDecision(decision);

    expect(surfaced.decision).toBe("SUPPRESS");
    expect(surfaced.suppression_reason_code).toBeDefined();
  });
});
