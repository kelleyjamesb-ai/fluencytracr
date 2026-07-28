import request from "supertest";
import { ObservabilityResponseSchema } from "@fluencytracr/shared";

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
      jbtd_id: "default-jbtd",
      persona_id: "default-persona",
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
      jbtd_id: "default-jbtd",
      persona_id: "default-persona",
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
      jbtd_id: "default-jbtd",
      persona_id: "default-persona",
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
      jbtd_id: "default-jbtd",
      persona_id: "default-persona",
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
  expect(res.body.workflows).toEqual([]);
});

it("omits an exact workflow slice when its disclosure is suppressed", async () => {
  pair("wf-sparse-reliability", "sparse-r0", true).forEach((e) => store.fluencyEvents.set(e.event_id, e));

  const res = await request(app)
    .get("/api/observability/org-1?window=60d")
    .set({ "x-role": "EXEC_VIEWER" });

  expect(res.status).toBe(200);
  const row = res.body.workflows.find((w: { workflow_id: string }) => w.workflow_id === "wf-sparse-reliability");
  expect(row).toBeUndefined();
});

it("returns ghost-use as residual observability only", async () => {
  jest.useFakeTimers({
    doNotFake: [
      "hrtime",
      "nextTick",
      "performance",
      "queueMicrotask",
      "setImmediate",
      "clearImmediate",
      "setInterval",
      "clearInterval",
      "setTimeout",
      "clearTimeout"
    ]
  });
  jest.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));

  try {
    const current = "2026-05-16T12:00:00.000Z";
    const previous = "2026-03-17T12:00:00.000Z";
    for (let i = 0; i < 5; i += 1) {
      workOnly("wf-ghost-api", `ghost-api-current-${i}`, current).forEach((e) => store.fluencyEvents.set(e.event_id, e));
      workOnly("wf-ghost-api", `ghost-api-previous-${i}`, previous).forEach((e) => store.fluencyEvents.set(e.event_id, e));
    }

    const res = await request(app)
      .get("/api/observability/org-1?window=60d")
      .set({ "x-role": "EXEC_VIEWER" });

    expect(res.status).toBe(200);
    expect(res.body.workflows).toEqual([]);
  } finally {
    jest.useRealTimers();
  }
});

it("holds categorical prevalence for a rolling executive query", async () => {
  for (let i = 0; i < 5; i += 1) {
    pair("wf-prevalence", `rp${i}`, true).forEach((e) => store.fluencyEvents.set(e.event_id, e));
  }

  const res = await request(app)
    .get("/api/observability/org-1?window=60d")
    .set({ "x-role": "EXEC_VIEWER" });

  expect(res.status).toBe(200);
  expect(res.body.workflows).toEqual([]);
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

it("rejects a HOLD projection that carries observable aggregate values", () => {
  const parsed = ObservabilityResponseSchema.safeParse({
    org_id: "org-1",
    observation_window: "60d",
    workflows: [{
      workflow_id: "wf-leaky",
      jbtd_id: "default-jbtd",
      persona_id: "default-persona",
      executions_total: 5,
      executions_disclosed: 5,
      executions_suppressed: 0,
      disclosure: "ALLOWED",
      privacy_decision: "HOLD",
      suppression_reasons: [],
      pattern_distribution: null,
      residual_patterns: { ghost_use: "SUPPRESSED" },
      reliability_factor: null,
      reliability_components: null,
      allowed_interpretation_hints: []
    }]
  });

  expect(parsed.success).toBe(false);
});
