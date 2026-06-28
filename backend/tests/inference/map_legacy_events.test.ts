import { mapLegacyEvents } from "../../src/inference/map_legacy_events";
import type { FluencyEvent } from "@fluencytracr/shared";

describe("mapLegacyEvents", () => {
  it("treats 0ms latency as IMMEDIATE", () => {
    const event: FluencyEvent = {
      event_type: "ai_output_disposition",
      timestamp: new Date().toISOString(),
      risk_class: "low",
      workflow_id: "workflow-1",
      disposition: "accepted",
      edit_distance_bucket: "none",
      verification_present: true,
      time_to_action_ms: 0
    };

    const [mapped] = mapLegacyEvents([event]);

    expect(mapped?.latency_bucket).toBe("IMMEDIATE");
  });
});
