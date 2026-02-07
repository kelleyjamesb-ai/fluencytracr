import { app } from "../src/app";
import { requestApp, loginAs, withAuth, withSchemaVersion } from "./test_helpers";

let adminCookie: string;
beforeEach(async () => {
  adminCookie = await loginAs(app, "ADMIN");
});

describe("ambiguity fail-closed", () => {
  it("rejects ambiguous inputs at ingestion", async () => {
    const payload = {
      events: [
        {
          event_type: "ai_output_disposition",
          timestamp: "2024-01-01T00:00:00.000Z",
          risk_class: "low",
          workflow_id: "workflow-1",
          disposition: "accepted",
          edit_distance_bucket: "none",
          verification_present: true,
          time_to_action_ms: 1200,
          ambiguity_flag: true
        }
      ]
    };

    const response = await requestApp(app, {
      method: "POST",
      path: "/api/events",
      headers: withAuth(adminCookie, withSchemaVersion()),
      body: payload
    });

    expect(response.status).toBe(400);
    expect((response.body as { error?: string }).error).toBe("Ambiguous input rejected");
  });
});
