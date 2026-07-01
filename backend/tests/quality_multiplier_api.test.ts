import request from "supertest";

import { app } from "../src/app";
import { buildFluencyEventRecord, store, type FluencyEventRecord } from "../src/store";
import {
  computeQualityMultiplierFromForwardedDistribution,
  type ForwardedDistribution
} from "../src/value_realization/quality_multiplier";
import { ForwardedDistributionSchema } from "../src/value_realization/forwarded_distribution";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const BASE_NOW = Date.now();

beforeEach(() => {
  store.reset();
});

const isoDaysAgo = (days: number, offsetMs = 0): string =>
  new Date(BASE_NOW - days * MS_PER_DAY + offsetMs).toISOString();

const addEvent = (event: FluencyEventRecord): void => {
  store.fluencyEvents.set(event.event_id, event);
};

let eventCounter = 0;
const nextEventId = (): string => {
  eventCounter += 1;
  return `qm-event-${eventCounter}`;
};

const disposition = (
  workflowId: string,
  runId: string,
  daysAgo: number,
  overrides: Partial<Extract<FluencyEventRecord, { event_type: "ai_output_disposition" }>> = {},
  offsetMs = 0
) =>
  buildFluencyEventRecord(
    {
      event_type: "ai_output_disposition",
      timestamp: isoDaysAgo(daysAgo, offsetMs),
      risk_class: "low",
      org_unit: "org:org-1",
      workflow_id: workflowId,
      run_id: runId,
      disposition: "accepted",
      edit_distance_bucket: "none",
      verification_present: true,
      time_to_action_ms: 100,
      ...overrides
    },
    nextEventId()
  );

const recovery = (
  workflowId: string,
  runId: string,
  daysAgo: number,
  overrides: Partial<Extract<FluencyEventRecord, { event_type: "ai_recovery_loop" }>> = {},
  offsetMs = 0
) =>
  buildFluencyEventRecord(
    {
      event_type: "ai_recovery_loop",
      timestamp: isoDaysAgo(daysAgo, offsetMs),
      risk_class: "low",
      org_unit: "org:org-1",
      workflow_id: workflowId,
      run_id: runId,
      recovery_type: "re_prompt",
      cycles: 1,
      resolution_time_ms: 100,
      ...overrides
    },
    nextEventId()
  );

const abandonment = (workflowId: string, runId: string, daysAgo: number, offsetMs = 0) =>
  buildFluencyEventRecord(
    {
      event_type: "ai_abandonment",
      timestamp: isoDaysAgo(daysAgo, offsetMs),
      risk_class: "medium",
      org_unit: "org:org-1",
      workflow_id: workflowId,
      run_id: runId,
      abandonment_stage: "reviewed",
      reason_bucket: "low_quality"
    },
    nextEventId()
  );

const seedQualityWorkflow = (
  workflowId: string,
  count: number,
  currentDaysAgo = 5,
  previousDaysAgo = 95,
  overrides: Partial<FluencyEventRecord> = {}
): void => {
  for (let i = 0; i < count; i += 1) {
    const currentRun = `${workflowId}-current-${i}`;
    addEvent(recovery(workflowId, currentRun, currentDaysAgo, overrides, 0));
    addEvent(disposition(workflowId, currentRun, currentDaysAgo, overrides, 1_000));

    const previousRun = `${workflowId}-previous-${i}`;
    addEvent(recovery(workflowId, previousRun, previousDaysAgo, overrides, 0));
    addEvent(disposition(workflowId, previousRun, previousDaysAgo, overrides, 1_000));
  }
};

const seedBlindWorkflow = (workflowId: string, count: number): void => {
  for (let i = 0; i < count; i += 1) {
    addEvent(
      disposition(workflowId, `${workflowId}-current-${i}`, 5, {
        verification_present: false
      })
    );
    addEvent(
      disposition(workflowId, `${workflowId}-previous-${i}`, 95, {
        verification_present: false
      })
    );
  }
};

const seedBaselineUnstableWorkflow = (workflowId: string): void => {
  for (let i = 0; i < 5; i += 1) {
    const currentRun = `${workflowId}-current-${i}`;
    addEvent(recovery(workflowId, currentRun, 5));
    addEvent(disposition(workflowId, currentRun, 5, {}, 1_000));

    const previousRun = `${workflowId}-previous-${i}`;
    addEvent(abandonment(workflowId, previousRun, 95));
    addEvent(disposition(workflowId, previousRun, 95, { disposition: "abandoned" }, 1_000));
  }
};

const seedLowQualityWorkflow = (workflowId: string): void => {
  for (let i = 0; i < 5; i += 1) {
    for (const daysAgo of [5, 95]) {
      const runId = `${workflowId}-${daysAgo}-${i}`;
      addEvent(recovery(workflowId, runId, daysAgo, {}, 0));
      addEvent(recovery(workflowId, runId, daysAgo, {}, 60_000));
      addEvent(disposition(workflowId, runId, daysAgo, { disposition: "abandoned", verification_present: false }, 11 * 60_000));
    }
  }
};

const getMultiplier = (workflowId: string, windowDays = 90) =>
  request(app)
    .get(`/api/v1/quality-multiplier?workflow_id=${workflowId}&window_days=${windowDays}`)
    .set({ "x-role": "EXEC_VIEWER", "x-org-id": "org-1" });

const getForwardedMultiplier = (workflowId: string, cohortId: string, windowDays = 90) =>
  request(app)
    .get(
      `/api/v1/quality-multiplier?workflow_id=${workflowId}&window_days=${windowDays}&cohort_id=${cohortId}&use_forwarded_distribution=true`
    )
    .set({ "x-role": "EXEC_VIEWER", "x-org-id": "org-1" });

const getSlicedMultiplier = (workflowId: string, jbtdId: string, personaId: string, windowDays = 90) =>
  request(app)
    .get(
      `/api/v1/quality-multiplier?workflow_id=${workflowId}&window_days=${windowDays}&jbtd_id=${jbtdId}&persona_id=${personaId}`
    )
    .set({ "x-role": "EXEC_VIEWER", "x-org-id": "org-1" });

const forwardedDistribution = (overrides: Partial<ForwardedDistribution> = {}): ForwardedDistribution => ({
  schema_version: "FT_V3_FORWARDED_DISTRIBUTION_2026_06",
  source_schema_version: "FT_V3_2026_05",
  cohort_id: "cohort-forwarded-qm",
  workflow_id: "wf-forwarded-qm",
  jbtd_id: null,
  persona_id: null,
  window_start: new Date(BASE_NOW - 90 * MS_PER_DAY).toISOString(),
  window_end: new Date(BASE_NOW).toISOString(),
  window_days: 90,
  cohort_size: 50,
  ambiguity_rate: 0,
  calibration_id: "scio-prod-60d-2026-05",
  surface_taxonomy_ids: ["wf-forwarded-qm"],
  velocity: {
    frequency: { p10: 10, p50: 71, p90: 400, p99: 701 },
    engagement: { p10: 30, p50: 61, p90: 61, p99: 61 },
    breadth: { p10: 3, p50: 7, p90: 10, p99: 12 }
  },
  quality_signals: {
    completion_rate: 0.92,
    error_rate: 0.03,
    abandonment_rate: 0.01,
    recovery_rate: 0.8,
    verification_rate: 0.4,
    p50_latency_ms: 1000,
    p95_latency_ms: 3000
  },
  distribution_moments: {
    frequency_mean: 295.5,
    engagement_mean: 53.25,
    breadth_mean: 8
  },
  baseline_stable: true,
  value_type: "UNCLASSIFIED",
  evidence_grade: "OBJECTIVE",
  privacy: {
    aggregate_only: true,
    person_level_fields_included: false
  },
  ...overrides
});

describe("GET /api/v1/quality-multiplier", () => {
  it("surfaces a bounded quality multiplier on the green path", async () => {
    seedQualityWorkflow("wf-quality-green", 5);

    const res = await getMultiplier("wf-quality-green");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      workflow_id: "wf-quality-green",
      window_days: 90,
      verdict: "SURFACE",
      suppression_reason: null,
      cohort_size: 5,
      evidence_grade: "QUALITATIVE"
    });
    expect(res.body.multiplier).toBeGreaterThanOrEqual(0.5);
    expect(res.body.multiplier).toBeLessThanOrEqual(1.5);
    expect(Date.parse(res.body.computed_at)).not.toBeNaN();
  });

  it("can consume a governed forwarded distribution without raw event records", async () => {
    const ingest = await request(app)
      .post("/api/v3/ingest/aggregate")
      .set({ "x-role": "ADMIN", "x-org-id": "org-1", "Content-Type": "application/json" })
      .send({
        schema_version: "FT_V3_2026_05",
        cohort_id: "cohort-forwarded-qm",
        workflow_id: "workflow:FORWARDED-QM",
        window_start: new Date(BASE_NOW - 90 * MS_PER_DAY).toISOString(),
        window_end: new Date(BASE_NOW).toISOString(),
        cohort_size: 50,
        calibration_id: "scio-prod-60d-2026-05",
        velocity: {
          frequency: { p10: 10, p50: 71, p90: 400, p99: 701 },
          engagement: { p10: 30, p50: 61, p90: 61, p99: 61 },
          breadth: { p10: 3, p50: 7, p90: 10, p99: 12 }
        },
        quality_signals: {
          completion_rate: 0.92,
          error_rate: 0.03,
          abandonment_rate: 0.01,
          recovery_rate: 0.8,
          verification_rate: 0.4,
          p50_latency_ms: 1000,
          p95_latency_ms: 3000
        },
        privacy: { person_level_fields_included: false }
      });
    expect(ingest.status).toBe(202);

    const res = await getForwardedMultiplier("workflow:FORWARDED-QM", "cohort-forwarded-qm");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      workflow_id: "workflow:FORWARDED-QM",
      window_days: 90,
      verdict: "SURFACE",
      suppression_reason: null,
      cohort_size: 50,
      value_type: "QUALITY_PREMIUM",
      evidence_grade: "CALIBRATED"
    });
    expect(res.body.multiplier).toBeGreaterThanOrEqual(0.5);
    expect(res.body.multiplier).toBeLessThanOrEqual(1.5);
  });

  it("suppresses when the requested window is too short", async () => {
    seedQualityWorkflow("wf-insufficient-time", 5, 5, 45);

    const res = await getMultiplier("wf-insufficient-time", 30);

    expect(res.status).toBe(200);
    expect(res.body.verdict).toBe("SUPPRESS");
    expect(res.body.multiplier).toBeNull();
    expect(res.body.suppression_reason).toBe("INSUFFICIENT_TIME");
  });

  it("suppresses ambiguous windows", async () => {
    seedQualityWorkflow("wf-high-ambiguity", 5);
    addEvent(
      disposition("wf-high-ambiguity", "wf-high-ambiguity-ambiguous", 5, {
        ambiguity_flag: true,
        ambiguity_reason_code: "AMB_EVIDENCE_CONFLICT"
      })
    );
    addEvent(
      disposition("wf-high-ambiguity", "wf-high-ambiguity-ambiguous-2", 5, {
        ambiguity_flag: true,
        ambiguity_reason_code: "AMB_EVIDENCE_CONFLICT"
      })
    );
    addEvent(
      disposition("wf-high-ambiguity", "wf-high-ambiguity-ambiguous-3", 5, {
        ambiguity_flag: true,
        ambiguity_reason_code: "AMB_EVIDENCE_CONFLICT"
      })
    );

    const res = await getMultiplier("wf-high-ambiguity");

    expect(res.status).toBe(200);
    expect(res.body.verdict).toBe("SUPPRESS");
    expect(res.body.multiplier).toBeNull();
    expect(res.body.suppression_reason).toBe("HIGH_AMBIGUITY");
  });

  it("suppresses below minimum cohort volume", async () => {
    seedQualityWorkflow("wf-low-volume", 4);

    const res = await getMultiplier("wf-low-volume");

    expect(res.status).toBe(200);
    expect(res.body.verdict).toBe("SUPPRESS");
    expect(res.body.multiplier).toBeNull();
    expect(res.body.suppression_reason).toBe("INSUFFICIENT_VOLUME");
    expect(res.body.cohort_size).toBe(4);
  });

  it("applies cohort gates independently within JBTD/persona slices", async () => {
    seedQualityWorkflow("wf-sliced-quality", 5, 5, 95, {
      jbtd_id: "manager-review",
      persona_id: "frontline-manager"
    });
    seedQualityWorkflow("wf-sliced-quality", 1, 5, 95, {
      jbtd_id: "manager-review",
      persona_id: "exec"
    });

    const large = await getSlicedMultiplier("wf-sliced-quality", "manager-review", "frontline-manager");
    const small = await getSlicedMultiplier("wf-sliced-quality", "manager-review", "exec");

    expect(large.status).toBe(200);
    expect(large.body).toMatchObject({
      jbtd_id: "manager-review",
      persona_id: "frontline-manager",
      verdict: "SURFACE",
      cohort_size: 5
    });
    expect(small.status).toBe(200);
    expect(small.body).toMatchObject({
      jbtd_id: "manager-review",
      persona_id: "exec",
      verdict: "SUPPRESS",
      suppression_reason: "INSUFFICIENT_VOLUME",
      cohort_size: 1
    });
  });

  it("suppresses when the workflow has not converged on sufficient behavioral classes", async () => {
    seedBlindWorkflow("wf-no-convergence", 5);

    const res = await getMultiplier("wf-no-convergence");

    expect(res.status).toBe(200);
    expect(res.body.verdict).toBe("SUPPRESS");
    expect(res.body.multiplier).toBeNull();
    expect(res.body.suppression_reason).toBe("NO_CONVERGENCE");
  });

  it("suppresses when the baseline window is unstable", async () => {
    seedBaselineUnstableWorkflow("wf-baseline-unstable");

    const res = await getMultiplier("wf-baseline-unstable");

    expect(res.status).toBe(200);
    expect(res.body.verdict).toBe("SUPPRESS");
    expect(res.body.multiplier).toBeNull();
    expect(res.body.suppression_reason).toBe("BASELINE_UNSTABLE");
  });

  it("fails closed for malformed input", async () => {
    const res = await request(app)
      .get("/api/v1/quality-multiplier?workflow_id=&window_days=not-a-number")
      .set({ "x-role": "EXEC_VIEWER", "x-org-id": "org-1" });

    expect(res.status).toBe(400);
    expect(res.body.verdict).toBe("SUPPRESS");
    expect(res.body.multiplier).toBeNull();
  });

  it("enforces multiplier upper and lower bounds", async () => {
    seedQualityWorkflow("wf-upper-bound", 30);
    seedLowQualityWorkflow("wf-lower-bound");

    const upper = await getMultiplier("wf-upper-bound");
    const lower = await getMultiplier("wf-lower-bound");

    expect(upper.status).toBe(200);
    expect(upper.body.verdict).toBe("SURFACE");
    expect(upper.body.multiplier).toBe(1.5);
    expect(upper.body.evidence_grade).toBe("OBJECTIVE");

    expect(lower.status).toBe(200);
    expect(lower.body.verdict).toBe("SURFACE");
    expect(lower.body.multiplier).toBe(0.5);
  });
});

describe("computeQualityMultiplierFromForwardedDistribution", () => {
  it("rejects forbidden forwarded distribution fields and raw-text shaped tokens", () => {
    const forbiddenPayloads = [
      { prompt: "summarize the account plan" },
      { output: "raw model answer" },
      { message: "raw chat message" },
      { email: "person@example.com" },
      { user_id: "user-123" },
      { actor_id: "actor-123" },
      { skill_name: "personal skill" },
      { transcript: "long transcript" },
      { body: "raw text body" },
      { quality_signals: { ...forwardedDistribution().quality_signals, prompt: "raw nested prompt" } },
      { surface_taxonomy_ids: ["this is a raw natural language surface label"] }
    ];

    for (const override of forbiddenPayloads) {
      const parsed = ForwardedDistributionSchema.safeParse({
        ...forwardedDistribution(),
        ...override
      });
      expect(parsed.success).toBe(false);
    }
  });

  it("accepts legacy persisted forwarded distributions that predate surface taxonomy ids", () => {
    const legacyDistribution = {
      ...forwardedDistribution()
    } as Record<string, unknown>;
    delete legacyDistribution.surface_taxonomy_ids;

    const parsed = ForwardedDistributionSchema.safeParse(legacyDistribution);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.surface_taxonomy_ids).toEqual([parsed.data.workflow_id]);

    const result = computeQualityMultiplierFromForwardedDistribution({
      forwardedDistribution: legacyDistribution as ForwardedDistribution
    });

    expect(result).toMatchObject({
      workflow_id: "wf-forwarded-qm",
      verdict: "SURFACE",
      suppression_reason: null,
      evidence_grade: "CALIBRATED"
    });
  });

  it("re-checks gates and emits calibrated quality-premium evidence for surfaced distributions", () => {
    const result = computeQualityMultiplierFromForwardedDistribution({
      forwardedDistribution: forwardedDistribution()
    });

    expect(result).toMatchObject({
      workflow_id: "wf-forwarded-qm",
      verdict: "SURFACE",
      suppression_reason: null,
      cohort_size: 50,
      value_type: "QUALITY_PREMIUM",
      evidence_grade: "CALIBRATED"
    });
    expect(result.multiplier).toBeGreaterThanOrEqual(0.5);
    expect(result.multiplier).toBeLessThanOrEqual(1.5);
  });

  it.each([
    ["INSUFFICIENT_TIME", { window_days: 30 }],
    ["INSUFFICIENT_VOLUME", { cohort_size: 4 }],
    ["NO_CONVERGENCE", {
      quality_signals: {
        completion_rate: 0,
        error_rate: 0,
        abandonment_rate: 0,
        recovery_rate: 0,
        verification_rate: 0,
        p50_latency_ms: 1000,
        p95_latency_ms: 3000
      }
    }],
    ["BASELINE_UNSTABLE", { baseline_stable: false }],
    ["HIGH_AMBIGUITY", { ambiguity_rate: 0.5 }]
  ] as const)("suppresses forwarded distributions that fail %s", (reason, overrides) => {
    const result = computeQualityMultiplierFromForwardedDistribution({
      forwardedDistribution: forwardedDistribution(overrides)
    });

    expect(result).toMatchObject({
      verdict: "SUPPRESS",
      suppression_reason: reason,
      multiplier: null,
      evidence_grade: "QUALITATIVE"
    });
    expect(result.value_type).toBeUndefined();
  });
});
