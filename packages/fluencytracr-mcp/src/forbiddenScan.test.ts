import { describe, expect, it } from "vitest";
import { findForbiddenField } from "./forbiddenScan.js";

describe("findForbiddenField", () => {
  it("detects message_text under events", () => {
    const hit = findForbiddenField({
      events: [{ event_type: "x", message_text: "secret" }]
    });
    expect(hit?.key).toBe("message_text");
  });

  it("returns null for safe metadata-only shapes", () => {
    expect(
      findForbiddenField({
        events: [
          {
            event_type: "verification_signal",
            timestamp: "2026-02-21T12:00:00.000Z",
            risk_class: "medium",
            workflow_id: "w1",
            verification_type: "policy_check",
            verification_latency_ms: 1
          }
        ]
      })
    ).toBeNull();
  });
});
