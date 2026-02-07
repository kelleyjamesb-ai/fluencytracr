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
  store.fluencyEvents.set(`event-${timestamp}`, {
    event_id: `event-${timestamp}`,
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

const parse = (body: unknown) => {
  const parsed = OrientationSignalResponseSchema.safeParse(body);
  expect(parsed.success).toBe(true);
  if (!parsed.success) {
    throw new Error("Orientation response invalid");
  }
  return parsed.data;
};

beforeEach(async () => {
  adminCookie = await loginAs(app, "ADMIN");
});

it("cannot be checked reliably for repeated workflow", async () => {
  seedOrg();
  const now = new Date();
  seedEvent(new Date(now.getTime() - 2 * 60 * 1000).toISOString());
  seedEvent(new Date(now.getTime() - 1 * 60 * 1000).toISOString());
  const sessionStart = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

  const path = `/api/orientation/org-1?session_start=${encodeURIComponent(
    sessionStart
  )}&role=individual_contributor&workflow=document_editing&signal=verification_presence&trigger_event=HUMAN_CORRECTION&trigger_phase=post_ai_insertion&trigger_before=content_share&workflow_step=step-1`;

  const first = await requestApp(app, { method: "GET", path, headers: withAuth(adminCookie) });
  const second = await requestApp(app, { method: "GET", path, headers: withAuth(adminCookie) });

  const firstState = parse(first.body).observation_detected.state;
  const secondState = parse(second.body).observation_detected.state;

  expect([firstState, secondState]).toContain("SUPPRESSED");
});

it("absence is uninterpretable when suppressed", async () => {
  seedOrg();
  const response = await requestApp(app, {
    method: "GET",
    path: "/api/orientation/org-1",
    headers: withAuth(adminCookie)
  });
  const data = parse(response.body);
  expect(data.observation_detected.state).toBe("SUPPRESSED");
  expect(Array.isArray(data.observation_detected.does_not_mean)).toBe(true);
});

it("no destination surfaces without WAIM context", async () => {
  seedOrg();
  const now = new Date();
  seedEvent(new Date(now.getTime() - 2 * 60 * 1000).toISOString());
  const sessionStart = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

  const response = await requestApp(app, {
    method: "GET",
    path: `/api/orientation/org-1?session_start=${encodeURIComponent(sessionStart)}`,
    headers: withAuth(adminCookie)
  });
  const data = parse(response.body);
  expect(data.observation_detected.state).toBe("SUPPRESSED");
});

it("suppresses any WAIM-like context parameters", async () => {
  seedOrg();
  const now = new Date();
  seedEvent(new Date(now.getTime() - 2 * 60 * 1000).toISOString());
  const sessionStart = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

  const response = await requestApp(app, {
    method: "GET",
    path: `/api/orientation/org-1?session_start=${encodeURIComponent(
      sessionStart
    )}&role=individual_contributor&workflow=document_editing&signal=verification_presence&trigger_event=HUMAN_CORRECTION&trigger_phase=post_ai_insertion&trigger_before=content_share&workflow_step=step-1`,
    headers: withAuth(adminCookie)
  });
  const data = parse(response.body);
  expect(data.observation_detected.state).toBe("SUPPRESSED");
});

it("does not persist orientation state", async () => {
  seedOrg();
  const countBefore = store.fluencyEvents.size;
  const response = await requestApp(app, {
    method: "GET",
    path: "/api/orientation/org-1",
    headers: withAuth(adminCookie)
  });
  parse(response.body);
  const countAfter = store.fluencyEvents.size;
  expect(countAfter).toBe(countBefore);
});
