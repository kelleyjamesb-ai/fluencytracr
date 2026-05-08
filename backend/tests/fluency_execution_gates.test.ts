import { evaluateFluencyExecutionGates, toTraceGateSummary } from "../src/fluency_execution_gates";
import { buildFluencyEventRecord } from "../src/store";
import { computeExecutionLifecycle } from "../src/execution_lifecycle";
import { reconstructTrace, sortEventsByTimestamp } from "../src/trace_engine";

describe("evaluateFluencyExecutionGates", () => {
  it("fails FSC boundary when lifecycle is RETRY (non-terminal)", () => {
    const e1 = buildFluencyEventRecord(
      {
        event_type: "ai_output_disposition",
        timestamp: "2026-04-01T10:00:00.000Z",
        risk_class: "low",
        workflow_id: "wf-g",
        disposition: "rejected",
        edit_distance_bucket: "none",
        verification_present: false,
        time_to_action_ms: 1,
        run_id: "r-act"
      },
      "g1"
    );
    const e2 = buildFluencyEventRecord(
      {
        event_type: "workflow_stage_transition",
        timestamp: "2026-04-01T10:05:00.000Z",
        risk_class: "low",
        workflow_id: "wf-g",
        stage_from: "a",
        stage_to: "b",
        ai_assisted: false,
        run_id: "r-act"
      },
      "g2"
    );
    const group = [e1, e2];
    const trace = reconstructTrace(group)!;
    const ordered = sortEventsByTimestamp(group);
    const lifecycle = computeExecutionLifecycle(ordered, trace, {
      now: new Date("2026-04-01T10:06:00.000Z")
    });
    expect(lifecycle.state).toBe("RETRY");
    const snap = evaluateFluencyExecutionGates(ordered, trace, lifecycle);
    expect(snap.fsc.eligible).toBe(false);
    expect(snap.fsc.failed_checks).toContain("boundary_integrity");
  });

  it("passes FSC and min signal for completed execution with verification channel", () => {
    const e1 = buildFluencyEventRecord(
      {
        event_type: "ai_output_disposition",
        timestamp: "2026-04-01T10:00:00.000Z",
        risk_class: "low",
        workflow_id: "wf-ok",
        disposition: "accepted",
        edit_distance_bucket: "none",
        verification_present: true,
        time_to_action_ms: 1,
        run_id: "r-ok"
      },
      "ok1"
    );
    const e2 = buildFluencyEventRecord(
      {
        event_type: "ai_output_disposition",
        timestamp: "2026-04-01T10:01:00.000Z",
        risk_class: "low",
        workflow_id: "wf-ok",
        disposition: "accepted",
        edit_distance_bucket: "none",
        verification_present: false,
        time_to_action_ms: 1,
        run_id: "r-ok"
      },
      "ok2"
    );
    const group = [e1, e2];
    const trace = reconstructTrace(group)!;
    const ordered = sortEventsByTimestamp(group);
    const lifecycle = computeExecutionLifecycle(ordered, trace, {
      now: new Date("2026-04-01T11:00:00.000Z")
    });
    const snap = evaluateFluencyExecutionGates(ordered, trace, lifecycle);
    expect(snap.fsc.eligible).toBe(true);
    expect(snap.minimum_signal.allowed).toBe(true);
    const summary = toTraceGateSummary(snap);
    expect(summary.fsc_eligible).toBe(true);
    expect(summary.min_signal_allowed).toBe(true);
  });

  it("fails minimum signal when no secondary channel (two silent accepts)", () => {
    const e1 = buildFluencyEventRecord(
      {
        event_type: "ai_output_disposition",
        timestamp: "2026-04-01T10:00:00.000Z",
        risk_class: "low",
        workflow_id: "wf-silent",
        disposition: "accepted",
        edit_distance_bucket: "none",
        verification_present: false,
        time_to_action_ms: 1,
        run_id: "r-s"
      },
      "s1"
    );
    const e2 = buildFluencyEventRecord(
      {
        event_type: "ai_output_disposition",
        timestamp: "2026-04-01T10:01:00.000Z",
        risk_class: "low",
        workflow_id: "wf-silent",
        disposition: "accepted",
        edit_distance_bucket: "none",
        verification_present: false,
        time_to_action_ms: 1,
        run_id: "r-s"
      },
      "s2"
    );
    const group = [e1, e2];
    const trace = reconstructTrace(group)!;
    const ordered = sortEventsByTimestamp(group);
    const lifecycle = computeExecutionLifecycle(ordered, trace, {
      now: new Date("2026-04-01T11:00:00.000Z")
    });
    const snap = evaluateFluencyExecutionGates(ordered, trace, lifecycle);
    expect(snap.fsc.eligible).toBe(true);
    expect(snap.minimum_signal.allowed).toBe(false);
    expect(snap.minimum_signal.failed_checks).toContain("minimum_signal_channel");
  });
});
