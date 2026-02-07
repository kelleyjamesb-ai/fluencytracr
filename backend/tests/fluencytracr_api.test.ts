import { app } from "../src/app";
import { store } from "../src/store";
import { requestApp, loginAs, withAuth, withSchemaVersion } from "./test_helpers";

const buildEvent = (workflowId: string, overrides: Partial<Record<string, unknown>> = {}) => ({
  event_type: "ai_output_disposition",
  timestamp: new Date().toISOString(),
  risk_class: "medium",
  org_unit: "org:executive",
  workflow_id: workflowId,
  disposition: "accepted",
  edit_distance_bucket: "none",
  verification_present: true,
  time_to_action_ms: 120000,
  ...overrides
});

let adminCookie: string;
let viewerCookie: string;
beforeEach(async () => {
  store.reset();
  store.orgs.set("org-1", { id: "org-1", name: "Org", minGroupSize: 5, createdAt: "now" });
  adminCookie = await loginAs(app, "ADMIN");
  viewerCookie = await loginAs(app, "EXEC_VIEWER");
});

it("ingests fluency events and returns acceptance", async () => {
  const response = await requestApp(app, {
    method: "POST",
    path: "/api/events",
    headers: withAuth(adminCookie, withSchemaVersion({ "content-type": "application/json" })),
    body: { events: [buildEvent("workflow-1")] }
  });
  const payload = response.body as { status: string; event_ids: unknown[] };

  expect(response.status).toBe(200);
  expect(payload.status).toBe("accepted");
  expect(Array.isArray(payload.event_ids)).toBe(true);
});

it("suppresses patterns endpoint under TG5", async () => {
  const response = await requestApp(app, {
    method: "GET",
    path: "/api/patterns?window=60d&scope=org",
    headers: withAuth(viewerCookie)
  });

  expect(response.status).toBe(404);
});
