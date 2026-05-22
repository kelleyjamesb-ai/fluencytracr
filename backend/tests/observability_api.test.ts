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

const workOnly = (wf: string, run: string, timestamp: string) => [
  buildFluencyEventRecord(
    {
      event_type: "workflow_stage_transition",
      timestamp,
      risk_class: "medium",
      org_unit: "org:org-1",
      workflow_id: wf,
      stage_from: "not_started",
      stage_to: "started",
      ai_assisted: false,
      run_id: run
    },
    `${run}a`
  ),
  buildFluencyEventRecord(
    {
      event_type: "workflow_stage_transition",
      timestamp,
      risk_class: "medium",
      org_unit: "org:org-1",
      workflow_id: wf,
      stage_from: "started",
      stage_to: "human_work_observed",
      ai_assisted: false,
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
  expect(row?.reliability_components).toEqual({
    abandonment_rate: 0,
    friction_loop_rate: 0,
    recovery_success_rate: 0,
    verification_presence_rate: 1
  });
  expect(row?.reliability_factor).toBe(0.75);
});

it("nulls Reliability Factor fields when workflow disclosure is suppressed", async () => {
  pair("wf-sparse-reliability", "sparse-r0", true).forEach((e) => store.fluencyEvents.set(e.event_id, e));

  const res = await request(app)
    .get("/api/observability/org-1?window=60d")
    .set({ "x-role": "EXEC_VIEWER" });

  expect(res.status).toBe(200);
  const row = res.body.workflows.find((w: { workflow_id: string }) => w.workflow_id === "wf-sparse-reliability");
  expect(row?.disclosure).toBe("SUPPRESSED");
  expect(row?.reliability_factor).toBeNull();
  expect(row?.reliability_components).toBeNull();
});

it("returns ghost-use as residual observability only", async () => {
  const current = "2026-05-15T00:00:00.000Z";
  const previous = "2026-03-16T00:00:00.000Z";
  for (let i = 0; i < 5; i += 1) {
    workOnly("wf-ghost-api", `ghost-api-current-${i}`, current).forEach((e) => store.fluencyEvents.set(e.event_id, e));
    workOnly("wf-ghost-api", `ghost-api-previous-${i}`, previous).forEach((e) => store.fluencyEvents.set(e.event_id, e));
  }

  const res = await request(app)
    .get("/api/observability/org-1?window=60d")
    .set({ "x-role": "EXEC_VIEWER" });

  expect(res.status).toBe(200);
  const row = res.body.workflows.find((w: { workflow_id: string }) => w.workflow_id === "wf-ghost-api");
  expect(row?.residual_patterns).toEqual({ ghost_use: "PRESENT" });
  expect(row?.pattern_distribution?.["Undertrust Avoidance"]).toBe("LOW");
  expect(row?.allowed_interpretation_hints).toContain("no observed AI evidence in window");
  expect(JSON.stringify(row).toLowerCase()).not.toMatch(/resistance|underperformance|lack of fluency/);
});

it("returns categorical prevalence bands only at the executive boundary", async () => {
  for (let i = 0; i < 5; i += 1) {
    pair("wf-prevalence", `rp${i}`, true).forEach((e) => store.fluencyEvents.set(e.event_id, e));
  }

  const res = await request(app)
    .get("/api/observability/org-1?window=60d")
    .set({ "x-role": "EXEC_VIEWER" });

  expect(res.status).toBe(200);
  const row = res.body.workflows.find((w: { workflow_id: string }) => w.workflow_id === "wf-prevalence");
  expect(row?.pattern_distribution).not.toBeNull();
  const prevalenceValues = Object.values(row.pattern_distribution as Record<string, unknown>);
  expect(prevalenceValues.length).toBeGreaterThan(0);
  for (const value of prevalenceValues) {
    expect(typeof value).toBe("string");
    expect(["LOW", "MODERATE", "HIGH"]).toContain(value);
  }
  expect(JSON.stringify(row.pattern_distribution)).not.toMatch(/:\d/);
});

it("rejects invalid window token", async () => {
  const res = await request(app)
    .get("/api/observability/org-1?window=not-a-window")
    .set({ "x-role": "EXEC_VIEWER" });
  expect(res.status).toBe(400);
  expect(res.body.error).toBe("Invalid query");
});

it("accepts extended day windows", async () => {
  const res = await request(app)
    .get("/api/observability/org-1?window=180d")
    .set({ "x-role": "EXEC_VIEWER" });
  expect(res.status).toBe(200);
  expect(res.body.observation_window).toBe("180d");
});
