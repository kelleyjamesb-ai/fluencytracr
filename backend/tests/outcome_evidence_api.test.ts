import request from "supertest";

import { app } from "../src/app";
import { buildFluencyEventRecord, store } from "../src/store";

const PERIOD_START = "2026-05-01T00:00:00.000Z";
const PERIOD_END = "2026-05-15T00:00:00.000Z";
const EXACT_SLICE_QUERY = "&jbtd_id=manager-review&persona_id=frontline-manager";

beforeEach(() => {
  store.reset();
});

const auth = { "x-role": "EXEC_VIEWER", "x-org-id": "org-1" };
const writeAuth = { "x-role": "ADMIN", "x-org-id": "org-1" };

const basePayload = (overrides: Record<string, unknown> = {}) => ({
  workflow_id: "wf-outcome",
  outcome_metric: "jira_cycle_time",
  outcome_unit: "days",
  period_start: PERIOD_START,
  period_end: PERIOD_END,
  aggregate_value: 4.2,
  cohort_size: 12,
  source_system: "Jira",
  jbtd_id: "manager-review",
  persona_id: "frontline-manager",
  ...overrides
});

const addSurfaceEvents = (workflowId = "wf-outcome", orgId = "org-1") => {
  for (let i = 0; i < 5; i += 1) {
    const runId = `${orgId}-${workflowId}-run-${i}`;
    const timestamp = `2026-05-1${i}T00:00:00.000Z`;
    const verified = buildFluencyEventRecord(
      {
        event_type: "ai_output_disposition",
        timestamp,
        risk_class: "low",
        org_unit: `org:${orgId}`,
        workflow_id: workflowId,
        jbtd_id: "manager-review",
        persona_id: "frontline-manager",
        run_id: runId,
        disposition: "accepted",
        edit_distance_bucket: "none",
        verification_present: true,
        time_to_action_ms: 50
      },
      `${runId}-event`
    );
    const corroborating = buildFluencyEventRecord(
      {
        event_type: "ai_output_disposition",
        timestamp,
        risk_class: "low",
        org_unit: `org:${orgId}`,
        workflow_id: workflowId,
        jbtd_id: "manager-review",
        persona_id: "frontline-manager",
        run_id: runId,
        disposition: "accepted",
        edit_distance_bucket: "none",
        verification_present: false,
        time_to_action_ms: 50
      },
      `${runId}-event-b`
    );
    store.fluencyEvents.set(verified.event_id, verified);
    store.fluencyEvents.set(corroborating.event_id, corroborating);
  }
};

describe("Outcome Evidence API", () => {
  it("stores aggregate outcome evidence but returns a value-independent privacy hold", async () => {
    addSurfaceEvents();

    const posted = await request(app)
      .post("/api/v1/outcome-evidence")
      .set(writeAuth)
      .send(basePayload());

    expect(posted.status).toBe(201);
    expect(posted.body.workflow_id).toBe("wf-outcome");
    expect(posted.body.evidence_id).toEqual(expect.any(String));

    const read = await request(app)
      .get(`/api/v1/outcome-evidence?workflow_id=wf-outcome&period_start=${PERIOD_START}&period_end=${PERIOD_END}${EXACT_SLICE_QUERY}`)
      .set(auth);

    expect(read.status).toBe(200);
    expect(read.body).toMatchObject({
      workflow_id: "wf-outcome",
      verdict: "SUPPRESS",
      privacy_decision: "HOLD",
      suppression_reason: "INSUFFICIENT_VOLUME",
      value_type: "UNCLASSIFIED",
      evidence_grade: "QUALITATIVE",
      reliability_factor: null
    });
    expect(read.body.outcome_evidence).toEqual([]);
  });

  it("rejects cohort_size below 5 unless aggregate_kind is team_level_kpi", async () => {
    const rejected = await request(app)
      .post("/api/v1/outcome-evidence")
      .set(writeAuth)
      .send(basePayload({ cohort_size: 4 }));

    expect(rejected.status).toBe(422);
    expect(rejected.body.reason).toBe("INSUFFICIENT_VOLUME");

    const accepted = await request(app)
      .post("/api/v1/outcome-evidence")
      .set(writeAuth)
      .send(basePayload({ cohort_size: 1, aggregate_kind: "team_level_kpi" }));

    expect(accepted.status).toBe(201);
  });

  it("rejects sub-week, future, and overlapping periods", async () => {
    const subWeek = await request(app)
      .post("/api/v1/outcome-evidence")
      .set(writeAuth)
      .send(basePayload({ period_end: "2026-05-05T00:00:00.000Z" }));
    expect(subWeek.status).toBe(400);

    const future = await request(app)
      .post("/api/v1/outcome-evidence")
      .set(writeAuth)
      .send(basePayload({ period_end: "2999-05-15T00:00:00.000Z" }));
    expect(future.status).toBe(400);

    const overlapping = await request(app)
      .post("/api/v1/outcome-evidence")
      .set(writeAuth)
      .send(basePayload({ period_start: PERIOD_END, period_end: PERIOD_START }));
    expect(overlapping.status).toBe(400);
  });

  it("rejects unknown fields and source attestation fields that carry free-form user identifiers", async () => {
    const unknown = await request(app)
      .post("/api/v1/outcome-evidence")
      .set(writeAuth)
      .send(basePayload({ unexpected: "field" }));
    expect(unknown.status).toBe(400);

    const forbidden = await request(app)
      .post("/api/v1/outcome-evidence")
      .set(writeAuth)
      .send(basePayload({ source_attestation: { user_name: "Alice" } }));
    expect(forbidden.status).toBe(400);

    const forbiddenNumeric = await request(app)
      .post("/api/v1/outcome-evidence")
      .set(writeAuth)
      .send(basePayload({ source_attestation: { user_id: 12345 } }));
    expect(forbiddenNumeric.status).toBe(400);

    const forbiddenNested = await request(app)
      .post("/api/v1/outcome-evidence")
      .set(writeAuth)
      .send(basePayload({ source_attestation: { approver: { email_address: ["person@example.com"] } } }));
    expect(forbiddenNested.status).toBe(400);
  });

  it("scopes outcome evidence reads by authenticated org when workflow identifiers collide", async () => {
    addSurfaceEvents("wf-shared", "org-1");
    addSurfaceEvents("wf-shared", "org-2");

    const org1 = await request(app)
      .post("/api/v1/outcome-evidence")
      .set({ "x-role": "ADMIN", "x-org-id": "org-1" })
      .send(basePayload({ workflow_id: "wf-shared", aggregate_value: 4.2 }));
    const org2 = await request(app)
      .post("/api/v1/outcome-evidence")
      .set({ "x-role": "ADMIN", "x-org-id": "org-2" })
      .send(basePayload({ workflow_id: "wf-shared", aggregate_value: 9.9 }));

    expect(org1.status).toBe(201);
    expect(org2.status).toBe(201);

    const org1Read = await request(app)
      .get(`/api/v1/outcome-evidence?workflow_id=wf-shared&period_start=${PERIOD_START}&period_end=${PERIOD_END}${EXACT_SLICE_QUERY}`)
      .set({ "x-role": "EXEC_VIEWER", "x-org-id": "org-1" });
    const org2Read = await request(app)
      .get(`/api/v1/outcome-evidence?workflow_id=wf-shared&period_start=${PERIOD_START}&period_end=${PERIOD_END}${EXACT_SLICE_QUERY}`)
      .set({ "x-role": "EXEC_VIEWER", "x-org-id": "org-2" });

    expect(org1Read.status).toBe(200);
    expect(org2Read.status).toBe(200);
    expect(org1Read.body.privacy_decision).toBe("HOLD");
    expect(org2Read.body.privacy_decision).toBe("HOLD");
    expect(org1Read.body.outcome_evidence).toEqual([]);
    expect(org2Read.body.outcome_evidence).toEqual([]);
  });

  it("keeps a suppressed workflow suppressed even when outcome evidence exists", async () => {
    const event = buildFluencyEventRecord(
      {
        event_type: "workflow_stage_transition",
        timestamp: "2026-05-10T00:00:00.000Z",
        risk_class: "medium",
        org_unit: "org:org-1",
        workflow_id: "wf-suppressed-outcome",
        run_id: "wf-suppressed-run",
        stage_from: "not_started",
        stage_to: "started",
        ai_assisted: false
      },
      "wf-suppressed-event"
    );
    store.fluencyEvents.set(event.event_id, event);

    await request(app)
      .post("/api/v1/outcome-evidence")
      .set(writeAuth)
      .send(basePayload({ workflow_id: "wf-suppressed-outcome" }));

    const read = await request(app)
      .get(
        `/api/v1/outcome-evidence?workflow_id=wf-suppressed-outcome&period_start=${PERIOD_START}&period_end=${PERIOD_END}${EXACT_SLICE_QUERY}`
      )
      .set(auth);

    expect(read.status).toBe(200);
    expect(read.body.verdict).toBe("SUPPRESS");
    expect(read.body.suppression_reason).toBe("INSUFFICIENT_VOLUME");
    expect(read.body.reliability_factor).toBeNull();
    expect(read.body.outcome_evidence).toEqual([]);
  });
});
