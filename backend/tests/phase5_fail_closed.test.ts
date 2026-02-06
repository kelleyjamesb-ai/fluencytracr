import { evaluateDecision, SUPPRESSION_REASONS } from "../src/phase1/evaluateDecision";
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
  it("fails closed on ambiguity", () => {
    const events: Phase1Event[] = [
      buildEvent({
        ambiguity_flag: true,
        ambiguity_reason_code: "AMB_EVIDENCE_INSUFFICIENT"
      }),
      buildEvent({ event_name: "FT_V1_LATENCY_OBSERVED" })
    ];

    const decision = evaluateDecision(events);

    expect(decision.decision).toBe("SUPPRESS");
    expect(decision.suppression_reason_code).toBe("AMB_EVIDENCE_INSUFFICIENT");
  });
});
