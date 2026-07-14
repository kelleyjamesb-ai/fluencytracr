import request from "supertest";

import { app } from "../src/app";
import {
  causalDeltaWindowsOverlap,
  computeCausalDelta,
  MIN_CAUSAL_DELTA_WINDOW_DAYS
} from "../src/value_realization/causal_delta";
import { buildFluencyEventRecord, store, type FluencyEventRecord } from "../src/store";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const EVENT_AT = new Date(Date.now() - 75 * MS_PER_DAY).toISOString();

beforeEach(() => {
  store.reset();
});

let eventCounter = 0;
const nextEventId = (): string => {
  eventCounter += 1;
  return `cd-event-${eventCounter}`;
};

const timestampFromEventAt = (eventAt: string, dayOffset: number, msOffset = 0): string =>
  new Date(Date.parse(eventAt) + dayOffset * MS_PER_DAY + msOffset).toISOString();

const addEvents = (events: FluencyEventRecord[]): void => {
  for (const event of events) {
    store.fluencyEvents.set(event.event_id, event);
  }
};

const base = (
  workflowId: string,
  runId: string,
  at: string
) => ({
  timestamp: at,
  risk_class: "low" as const,
  org_unit: "org:org-1",
  workflow_id: workflowId,
  run_id: runId
});

const stage = (workflowId: string, runId: string, at: string, from: string, to: string) =>
  buildFluencyEventRecord(
    {
      ...base(workflowId, runId, at),
      event_type: "workflow_stage_transition",
      stage_from: from,
      stage_to: to,
      ai_assisted: to === "attempt"
    },
    nextEventId()
  );

const disposition = (
  workflowId: string,
  runId: string,
  at: string,
  dispositionValue: "accepted" | "edited" | "rejected" | "abandoned",
  verificationPresent: boolean
) =>
  buildFluencyEventRecord(
    {
      ...base(workflowId, runId, at),
      event_type: "ai_output_disposition",
      disposition: dispositionValue,
      edit_distance_bucket: "none",
      verification_present: verificationPresent,
      time_to_action_ms: 100
    },
    nextEventId()
  );

const verification = (workflowId: string, runId: string, at: string) =>
  buildFluencyEventRecord(
    {
      ...base(workflowId, runId, at),
      event_type: "verification_signal",
      verification_type: "policy_check",
      verification_latency_ms: 100
    },
    nextEventId()
  );

const recovery = (workflowId: string, runId: string, at: string, cycles = 1) =>
  buildFluencyEventRecord(
    {
      ...base(workflowId, runId, at),
      event_type: "ai_recovery_loop",
      recovery_type: "re_prompt",
      cycles,
      resolution_time_ms: 100
    },
    nextEventId()
  );

const calibratedExecution = (workflowId: string, runId: string, at: string) => [
  stage(workflowId, runId, at, "not_started", "started"),
  stage(workflowId, runId, new Date(Date.parse(at) + 30_000).toISOString(), "started", "attempt"),
  verification(workflowId, runId, new Date(Date.parse(at) + 45_000).toISOString()),
  disposition(workflowId, runId, new Date(Date.parse(at) + 60_000).toISOString(), "accepted", true)
];

const blindExecution = (workflowId: string, runId: string, at: string) => [
  stage(workflowId, runId, at, "not_started", "started"),
  stage(workflowId, runId, new Date(Date.parse(at) + 15_000).toISOString(), "started", "attempt"),
  disposition(workflowId, runId, new Date(Date.parse(at) + 30_000).toISOString(), "accepted", false)
];

const frictionExecution = (workflowId: string, runId: string, at: string) => [
  stage(workflowId, runId, at, "not_started", "started"),
  disposition(workflowId, runId, new Date(Date.parse(at) + 60_000).toISOString(), "rejected", false),
  recovery(workflowId, runId, new Date(Date.parse(at) + 120_000).toISOString()),
  disposition(workflowId, runId, new Date(Date.parse(at) + 300_000).toISOString(), "rejected", false),
  recovery(workflowId, runId, new Date(Date.parse(at) + 360_000).toISOString()),
  disposition(workflowId, runId, new Date(Date.parse(at) + 660_000).toISOString(), "accepted", false)
];

type ExecutionFactory = (workflowId: string, runId: string, at: string) => FluencyEventRecord[];

const seedWindow = (
  workflowId: string,
  phase: "pre" | "post",
  count: number,
  factory: ExecutionFactory,
  overrides: Partial<FluencyEventRecord> = {}
) => {
  const dayOffset = phase === "pre" ? -15 : 15;
  for (let i = 0; i < count; i += 1) {
    const at = timestampFromEventAt(EVENT_AT, dayOffset, i * 60_000);
    addEvents(
      factory(workflowId, `${workflowId}-${phase}-${i}`, at).map((event) => ({
        ...event,
        ...overrides
      }))
    );
  }
};

const postCausalDelta = (body: Record<string, unknown>) =>
  request(app)
    .post("/api/v1/causal-delta")
    .set({ "x-role": "EXEC_VIEWER", "x-org-id": "org-1" })
    .send(body);

const bodyFor = (workflowId: string, overrides: Record<string, unknown> = {}) => ({
  workflow_id: workflowId,
  event_at: EVENT_AT,
  pre_window_days: MIN_CAUSAL_DELTA_WINDOW_DAYS,
  post_window_days: MIN_CAUSAL_DELTA_WINDOW_DAYS,
  label: "Skill publish",
  ...overrides
});

describe("POST /api/v1/causal-delta", () => {
  it("surfaces IMPROVED when the post pattern ranks higher", async () => {
    seedWindow("wf-improved", "pre", 5, blindExecution);
    seedWindow("wf-improved", "post", 5, calibratedExecution);

    const res = await postCausalDelta(bodyFor("wf-improved"));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      verdict: "SURFACE",
      suppression_reason: null,
      pre_pattern: "Blind Efficiency",
      post_pattern: "Calibrated Fluency",
      shift: "IMPROVED",
      pre_cohort_size: 5,
      post_cohort_size: 5,
      evidence_grade: "QUALITATIVE"
    });
    expect(Date.parse(res.body.computed_at)).not.toBeNaN();
  });

  it("uses the compiled 60-day windows when window fields are omitted", async () => {
    seedWindow("wf-default-window", "pre", 5, blindExecution);
    seedWindow("wf-default-window", "post", 5, calibratedExecution);
    const body = bodyFor("wf-default-window");
    delete body.pre_window_days;
    delete body.post_window_days;

    const res = await postCausalDelta(body);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      verdict: "SURFACE",
      suppression_reason: null,
      shift: "IMPROVED"
    });
  });

  it("surfaces HELD when the dominant pattern is unchanged", async () => {
    seedWindow("wf-held", "pre", 5, calibratedExecution);
    seedWindow("wf-held", "post", 5, calibratedExecution);

    const res = await postCausalDelta(bodyFor("wf-held"));

    expect(res.status).toBe(200);
    expect(res.body.verdict).toBe("SURFACE");
    expect(res.body.shift).toBe("HELD");
    expect(res.body.pre_pattern).toBe("Calibrated Fluency");
    expect(res.body.post_pattern).toBe("Calibrated Fluency");
  });

  it("surfaces REGRESSED when the post pattern ranks lower", async () => {
    seedWindow("wf-regressed", "pre", 5, calibratedExecution);
    seedWindow("wf-regressed", "post", 5, frictionExecution);

    const res = await postCausalDelta(bodyFor("wf-regressed"));

    expect(res.status).toBe(200);
    expect(res.body.verdict).toBe("SURFACE");
    expect(res.body.shift).toBe("REGRESSED");
    expect(res.body.pre_pattern).toBe("Calibrated Fluency");
    expect(res.body.post_pattern).toBe("Friction Loop");
  });

  it("suppresses as INDETERMINATE when the pre window is sparse", async () => {
    seedWindow("wf-sparse-pre", "pre", 4, calibratedExecution);
    seedWindow("wf-sparse-pre", "post", 5, calibratedExecution);

    const res = await postCausalDelta(bodyFor("wf-sparse-pre"));

    expect(res.status).toBe(200);
    expect(res.body.verdict).toBe("SUPPRESS");
    expect(res.body.shift).toBe("INDETERMINATE");
    expect(res.body.suppression_reason).toBe("INSUFFICIENT_VOLUME");
    expect(res.body.pre_cohort_size).toBe(4);
    expect(res.body.post_cohort_size).toBe(5);
  });

  it("suppresses as INDETERMINATE when the post window is sparse", async () => {
    seedWindow("wf-sparse-post", "pre", 5, calibratedExecution);
    seedWindow("wf-sparse-post", "post", 4, calibratedExecution);

    const res = await postCausalDelta(bodyFor("wf-sparse-post"));

    expect(res.status).toBe(200);
    expect(res.body.verdict).toBe("SUPPRESS");
    expect(res.body.shift).toBe("INDETERMINATE");
    expect(res.body.suppression_reason).toBe("INSUFFICIENT_VOLUME");
    expect(res.body.pre_cohort_size).toBe(5);
    expect(res.body.post_cohort_size).toBe(4);
  });

  it("applies pre/post cohort gates independently within JBTD/persona slices", async () => {
    seedWindow("wf-sliced-delta", "pre", 5, blindExecution, {
      jbtd_id: "manager-review",
      persona_id: "frontline-manager"
    });
    seedWindow("wf-sliced-delta", "post", 5, calibratedExecution, {
      jbtd_id: "manager-review",
      persona_id: "frontline-manager"
    });
    seedWindow("wf-sliced-delta", "pre", 1, blindExecution, {
      jbtd_id: "manager-review",
      persona_id: "exec"
    });
    seedWindow("wf-sliced-delta", "post", 1, calibratedExecution, {
      jbtd_id: "manager-review",
      persona_id: "exec"
    });

    const large = await postCausalDelta(
      bodyFor("wf-sliced-delta", {
        jbtd_id: "manager-review",
        persona_id: "frontline-manager"
      })
    );
    const small = await postCausalDelta(
      bodyFor("wf-sliced-delta", {
        jbtd_id: "manager-review",
        persona_id: "exec"
      })
    );

    expect(large.status).toBe(200);
    expect(large.body).toMatchObject({
      jbtd_id: "manager-review",
      persona_id: "frontline-manager",
      verdict: "SURFACE",
      pre_cohort_size: 5,
      post_cohort_size: 5
    });
    expect(small.status).toBe(200);
    expect(small.body).toMatchObject({
      jbtd_id: "manager-review",
      persona_id: "exec",
      verdict: "SUPPRESS",
      suppression_reason: "INSUFFICIENT_VOLUME",
      pre_cohort_size: 1,
      post_cohort_size: 1
    });
  });

  it("rejects overlapping window definitions", () => {
    const eventAt = new Date(EVENT_AT);
    const preStart = new Date(eventAt.getTime() - 30 * MS_PER_DAY);
    const preEnd = new Date(eventAt.getTime() + 1);
    const postStart = eventAt;
    const postEnd = new Date(eventAt.getTime() + 30 * MS_PER_DAY);

    expect(causalDeltaWindowsOverlap(preStart, preEnd, postStart, postEnd)).toBe(true);
  });

  it("rejects malformed event_at", async () => {
    const res = await postCausalDelta(bodyFor("wf-bad-event-at", { event_at: "not-a-date" }));

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid causal delta request");
  });

  it("suppresses windows below the compiled 60-day surfacing minimum", async () => {
    seedWindow("wf-short-window", "pre", 5, blindExecution);
    seedWindow("wf-short-window", "post", 5, calibratedExecution);

    const res = await postCausalDelta(bodyFor("wf-short-window", { pre_window_days: 59 }));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      verdict: "SUPPRESS",
      suppression_reason: "INSUFFICIENT_TIME",
      pre_pattern: null,
      post_pattern: null,
      shift: "INDETERMINATE"
    });
  });

  it("suppresses when the nominal 60-day post window has not fully elapsed", async () => {
    const recentEventAt = new Date(Date.now() - 45 * MS_PER_DAY).toISOString();

    const res = await postCausalDelta(
      bodyFor("wf-incomplete-post-window", { event_at: recentEventAt })
    );

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      verdict: "SUPPRESS",
      suppression_reason: "INSUFFICIENT_TIME",
      pre_pattern: null,
      post_pattern: null,
      shift: "INDETERMINATE"
    });
  });

  it("suppresses when only the post window is below 60 days", async () => {
    const res = await postCausalDelta(
      bodyFor("wf-short-post-window", { post_window_days: 59 })
    );

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      verdict: "SUPPRESS",
      suppression_reason: "INSUFFICIENT_TIME",
      pre_pattern: null,
      post_pattern: null,
      shift: "INDETERMINATE"
    });
  });

  it("rejects unsafe integer window values", async () => {
    const res = await postCausalDelta(
      bodyFor("wf-unsafe-window", { pre_window_days: Number.MAX_SAFE_INTEGER + 1 })
    );

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid causal delta request");
  });

  it("fails closed below 60 days when the domain helper is called directly", () => {
    seedWindow("wf-direct-short-window", "pre", 5, blindExecution);
    seedWindow("wf-direct-short-window", "post", 5, calibratedExecution);

    const result = computeCausalDelta({
      workflowId: "wf-direct-short-window",
      eventAt: EVENT_AT,
      preWindowDays: 59,
      postWindowDays: MIN_CAUSAL_DELTA_WINDOW_DAYS,
      events: [...store.fluencyEvents.values()]
    });

    expect(result).toMatchObject({
      verdict: "SUPPRESS",
      suppression_reason: "INSUFFICIENT_TIME",
      pre_pattern: null,
      post_pattern: null,
      shift: "INDETERMINATE"
    });
  });
});
