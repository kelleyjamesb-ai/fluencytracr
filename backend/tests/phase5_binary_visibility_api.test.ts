import { app } from "../src/app";
import { requestApp } from "./test_helpers";

describe("Phase 5A binary executive visibility", () => {
  it("returns only decision fields for v1 decision endpoint", async () => {
    const payload = {
      events: [
        {
          schema_version: "FT_V1_2026_01",
          event_name: "FT_V1_DISPOSITION_OBSERVED",
          org_id: "org-1",
          function_id: "func-1",
          role_class: "role-1",
          tool_surface: "ASSISTANT",
          event_timestamp: "2025-01-01T00:00:00Z",
          window_id: "2025-01-01__2025-03-15",
          ambiguity_flag: false
        },
        {
          schema_version: "FT_V1_2026_01",
          event_name: "FT_V1_LATENCY_OBSERVED",
          org_id: "org-1",
          function_id: "func-1",
          role_class: "role-1",
          tool_surface: "ASSISTANT",
          event_timestamp: "2025-01-02T00:00:00Z",
          window_id: "2025-01-01__2025-03-15",
          ambiguity_flag: false
        }
      ]
    };

    const response = await requestApp(app, {
      method: "POST",
      path: "/api/v1/decision",
      headers: { "x-role": "EXEC_VIEWER" },
      body: payload
    });

    expect(response.status).toBe(200);
    const keys = Object.keys(response.body || {}).sort();
    expect(keys).toEqual(["decision"].sort());
  });
});
