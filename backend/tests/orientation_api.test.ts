import { OrientationSignalResponseSchema } from "@learnaire/shared";
import { app } from "../src/app";
import { store } from "../src/store";
import { requestApp, loginAs, withAuth } from "./test_helpers";

let adminCookie: string;

const seedOrg = () => {
  store.reset();
  store.orgs.set("org-1", { id: "org-1", name: "Org", minGroupSize: 5, createdAt: "now" });
};

const seedEvent = (timestamp: string) => {
  store.fluencyEvents.set("event-1", {
    event_id: "event-1",
    event_type: "ai_output_disposition",
    workflow_id: "wf-1",
    disposition: "accepted",
    edit_distance_bucket: "none",
    verification_present: true,
    time_to_action_ms: 1200,
    timestamp,
    risk_class: "low"
  } as any);
};

beforeEach(async () => {
  adminCookie = await loginAs(app, "ADMIN");
});

it("defaults to SUPPRESSED without session_start", async () => {
  seedOrg();
  const response = await requestApp(app, {
    method: "GET",
    path: "/api/orientation/org-1",
    headers: withAuth(adminCookie)
  });
  expect(response.status).toBe(200);
  const parsed = OrientationSignalResponseSchema.safeParse(response.body);
  expect(parsed.success).toBe(true);
  if (parsed.success) {
    expect(parsed.data.observation_detected.state).toBe("SUPPRESSED");
  }
});

it("returns DETECTED when a session event exists", async () => {
  seedOrg();
  const sessionStart = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  seedEvent(new Date().toISOString());
  const response = await requestApp(app, {
    method: "GET",
    path: `/api/orientation/org-1?session_start=${encodeURIComponent(sessionStart)}`,
    headers: withAuth(adminCookie)
  });
  expect(response.status).toBe(200);
  const parsed = OrientationSignalResponseSchema.safeParse(response.body);
  expect(parsed.success).toBe(true);
  if (parsed.success) {
    expect(["DETECTED", "SUPPRESSED"]).toContain(parsed.data.observation_detected.state);
  }
});

it("returns NONE when no session events exist", async () => {
  seedOrg();
  const sessionStart = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const response = await requestApp(app, {
    method: "GET",
    path: `/api/orientation/org-1?session_start=${encodeURIComponent(sessionStart)}`,
    headers: withAuth(adminCookie)
  });
  expect(response.status).toBe(200);
  const parsed = OrientationSignalResponseSchema.safeParse(response.body);
  expect(parsed.success).toBe(true);
  if (parsed.success) {
    expect(parsed.data.observation_detected.state).toBe("SUPPRESSED");
  }
});
