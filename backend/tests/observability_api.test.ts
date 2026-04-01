import request from "supertest";
import { ObservabilityResponseSchema } from "@learnaire/shared";

import { app } from "../src/app";
import { store, buildFluencyEventRecord } from "../src/store";

beforeEach(() => {
  store.reset();
  store.orgs.set("org-1", { id: "org-1", name: "Org", minGroupSize: 1, createdAt: "now" });
});

const pair = (wf: string, run: string, ver: boolean) => [
  buildFluencyEventRecord(
    {
      event_type: "ai_output_disposition",
      timestamp: new Date().toISOString(),
      risk_class: "low",
      org_unit: "org:org-1",
      workflow_id: wf,
      disposition: "accepted",
      edit_distance_bucket: "none",
      verification_present: ver,
      time_to_action_ms: 50,
      run_id: run
    },
    `${run}a`
  ),
  buildFluencyEventRecord(
    {
      event_type: "ai_output_disposition",
      timestamp: new Date().toISOString(),
      risk_class: "low",
      org_unit: "org:org-1",
      workflow_id: wf,
      disposition: "accepted",
      edit_distance_bucket: "none",
      verification_present: false,
      time_to_action_ms: 50,
      run_id: run
    },
    `${run}b`
  )
];

it("returns 404 when org missing", async () => {
  const res = await request(app).get("/api/observability/missing-org").set({ "x-role": "EXEC_VIEWER" });
  expect(res.status).toBe(404);
});

it("returns observability payload with schema validation", async () => {
  for (let i = 0; i < 5; i += 1) {
    pair("wf-api", `r${i}`, true).forEach((e) => store.fluencyEvents.set(e.event_id, e));
  }

  const res = await request(app)
    .get("/api/observability/org-1?window=60d")
    .set({ "x-role": "EXEC_VIEWER" });

  expect(res.status).toBe(200);
  const parsed = ObservabilityResponseSchema.safeParse(res.body);
  expect(parsed.success).toBe(true);
  expect(res.body.org_id).toBe("org-1");
  expect(res.body.workflows.length).toBeGreaterThanOrEqual(1);
  const row = res.body.workflows.find((w: { workflow_id: string }) => w.workflow_id === "wf-api");
  expect(row?.disclosure).toBe("ALLOWED");
  expect(row?.pattern_distribution).not.toBeNull();
});

it("rejects unsupported window", async () => {
  const res = await request(app)
    .get("/api/observability/org-1?window=12m")
    .set({ "x-role": "EXEC_VIEWER" });
  expect(res.status).toBe(400);
  expect(res.body.supported_windows).toEqual(["30d", "60d"]);
});
