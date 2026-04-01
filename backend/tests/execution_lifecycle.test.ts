import { computeExecutionLifecycle, DEFAULT_INACTIVITY_TIMEOUT_MS } from "../src/execution_lifecycle";
import { buildFluencyEventRecord } from "../src/store";
import { reconstructTrace } from "../src/trace_engine";

describe("computeExecutionLifecycle", () => {
  it("returns INIT for empty ordered", () => {
    expect(computeExecutionLifecycle([], null)).toEqual({ state: "INIT", retry_sequence_count: 0 });
  });

  it("returns COMPLETED when last output disposition is accepted", () => {
    const e1 = buildFluencyEventRecord(
      {
        event_type: "ai_output_disposition",
        timestamp: "2026-04-01T10:00:00.000Z",
        risk_class: "low",
        workflow_id: "wf",
        disposition: "accepted",
        edit_distance_bucket: "none",
        verification_present: true,
        time_to_action_ms: 1,
        run_id: "r1"
      },
      "x1"
    );
    const e2 = buildFluencyEventRecord(
      {
        event_type: "ai_output_disposition",
        timestamp: "2026-04-01T10:01:00.000Z",
        risk_class: "low",
        workflow_id: "wf",
        disposition: "accepted",
        edit_distance_bucket: "none",
        verification_present: false,
        time_to_action_ms: 1,
        run_id: "r1"
      },
      "x2"
    );
    const group = [e1, e2];
    const trace = reconstructTrace(group)!;
    const out = computeExecutionLifecycle(group, trace, { now: new Date("2026-04-01T10:30:00.000Z") });
    expect(out.state).toBe("COMPLETED");
    expect(out.retry_sequence_count).toBe(0);
  });

  it("returns ERRORED when last output disposition is rejected", () => {
    const e1 = buildFluencyEventRecord(
      {
        event_type: "ai_output_disposition",
        timestamp: "2026-04-01T10:00:00.000Z",
        risk_class: "low",
        workflow_id: "wf",
        disposition: "rejected",
        edit_distance_bucket: "none",
        verification_present: false,
        time_to_action_ms: 1,
        run_id: "r1"
      },
      "y1"
    );
    const trace = reconstructTrace([e1])!;
    const out = computeExecutionLifecycle([e1], trace, { now: new Date("2026-04-01T11:00:00.000Z") });
    expect(out.state).toBe("ERRORED");
  });

  it("returns ABANDONED on ai_abandonment", () => {
    const e1 = buildFluencyEventRecord(
      {
        event_type: "ai_abandonment",
        timestamp: "2026-04-01T10:00:00.000Z",
        risk_class: "low",
        workflow_id: "wf",
        abandonment_stage: "prompted",
        reason_bucket: "unknown"
      },
      "z1"
    );
    const trace = reconstructTrace([e1])!;
    expect(computeExecutionLifecycle([e1], trace).state).toBe("ABANDONED");
  });

  it("returns ABANDONED when last event is stale vs now", () => {
    const e1 = buildFluencyEventRecord(
      {
        event_type: "verification_signal",
        timestamp: "2026-04-01T10:00:00.000Z",
        risk_class: "low",
        workflow_id: "wf",
        verification_type: "policy_check",
        verification_latency_ms: 1
      },
      "v1"
    );
    const trace = reconstructTrace([e1])!;
    const stale = new Date(e1.timestamp).getTime() + DEFAULT_INACTIVITY_TIMEOUT_MS + 60_000;
    const out = computeExecutionLifecycle([e1], trace, { now: new Date(stale) });
    expect(out.state).toBe("ABANDONED");
  });

  it("returns RETRY when retry_sequences exist and no output disposition yet", () => {
    const e1 = buildFluencyEventRecord(
      {
        event_type: "ai_output_disposition",
        timestamp: "2026-04-01T10:00:00.000Z",
        risk_class: "low",
        workflow_id: "wf",
        disposition: "rejected",
        edit_distance_bucket: "none",
        verification_present: false,
        time_to_action_ms: 1,
        run_id: "r1"
      },
      "f1"
    );
    const e2 = buildFluencyEventRecord(
      {
        event_type: "verification_signal",
        timestamp: "2026-04-01T10:02:00.000Z",
        risk_class: "low",
        workflow_id: "wf",
        verification_type: "policy_check",
        verification_latency_ms: 1,
        run_id: "r1"
      },
      "f2"
    );
    const group = [e1, e2];
    const trace = reconstructTrace(group)!;
    expect(trace.retry_sequences.length).toBeGreaterThanOrEqual(1);
    const out = computeExecutionLifecycle(group, trace, { now: new Date("2026-04-01T10:05:00.000Z") });
    expect(out.state).toBe("RETRY");
    expect(out.retry_sequence_count).toBeGreaterThanOrEqual(1);
  });
});
