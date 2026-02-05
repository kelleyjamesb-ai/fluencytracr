import { evaluateV1SignalDecisions } from "../src/inference/fluencytracr_v1_signal_evaluation";
import type { FluencyTracrV1Event } from "@learnaire/shared";

describe("suppression before surfacing", () => {
  it("does not surface ambiguous events", () => {
    const events: FluencyTracrV1Event[] = [
      {
        schema_version: "FT_V1_2026_01",
        event_name: "FT_V1_DISPOSITION_OBSERVED",
        org_id: "org-1",
        function_id: "func-1",
        role_class: "IC",
        tool_surface: "ASSISTANT",
        event_timestamp: "2026-01-15T00:00:00Z",
        window_id: "2026-01-01__2026-03-01",
        ambiguity_flag: true,
        ambiguity_reason_code: "AMB_EVIDENCE_INSUFFICIENT",
        disposition: "ACCEPT"
      }
    ];

    const decisions = evaluateV1SignalDecisions(events);
    expect(decisions).toEqual([]);
  });
});
