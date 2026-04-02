import { resolveFluencyExecutionId } from "@learnaire/shared";
import { buildFluencyEventRecord } from "../src/store";
import {
  detectRetrySequences,
  groupStageSteps,
  reconstructTrace,
  reconstructTracesForQuery,
  sortEventsByTimestamp,
  isFailureSignal
} from "../src/trace_engine";

describe("resolveFluencyExecutionId", () => {
  it("prefers run_id over workflow_run_id", () => {
    expect(
      resolveFluencyExecutionId("wf-1", {
        run_id: "r1",
        workflow_run_id: "w1",
        event_id: "e1"
      })
    ).toBe("exec:wf-1:run:r1");
  });

  it("uses workflow_run_id when run_id absent", () => {
    expect(
      resolveFluencyExecutionId("wf-1", {
        workflow_run_id: "w1",
        event_id: "e1"
      })
    ).toBe("exec:wf-1:wfrun:w1");
  });

  it("falls back to singleton per event_id", () => {
    expect(resolveFluencyExecutionId("wf-1", { event_id: "e1" })).toBe("exec:wf-1:singleton:e1");
  });
});

describe("trace_engine", () => {
  const disposition = (id: string, ts: string, disposition: "rejected" | "accepted" | "abandoned") =>
    buildFluencyEventRecord(
      {
        event_type: "ai_output_disposition",
        timestamp: ts,
        risk_class: "medium",
        workflow_id: "wf-1",
        disposition,
        edit_distance_bucket: "none",
        verification_present: false,
        time_to_action_ms: 1000,
        run_id: "run-a"
      },
      id
    );

  it("sorts by timestamp then event_id", () => {
    const b = disposition("b", "2026-01-01T00:00:02.000Z", "accepted");
    const a = disposition("a", "2026-01-01T00:00:01.000Z", "accepted");
    const ordered = sortEventsByTimestamp([b, a]);
    expect(ordered.map((e) => e.event_id)).toEqual(["a", "b"]);
  });

  it("detects retry sequence after rejection within window", () => {
    const e1 = disposition("e1", "2026-01-01T00:00:00.000Z", "rejected");
    const e2 = disposition("e2", "2026-01-01T00:01:00.000Z", "accepted");
    const ordered = sortEventsByTimestamp([e1, e2]);
    const retries = detectRetrySequences(ordered);
    expect(retries).toEqual([{ failure_event_id: "e1", subsequent_event_id: "e2" }]);
  });

  it("groups consecutive workflow_stage_transition events", () => {
    const run = "run-s";
    const s1 = buildFluencyEventRecord(
      {
        event_type: "workflow_stage_transition",
        timestamp: "2026-01-01T00:00:00.000Z",
        risk_class: "low",
        workflow_id: "wf-1",
        stage_from: "a",
        stage_to: "b",
        ai_assisted: true,
        run_id: run
      },
      "s1"
    );
    const s2 = buildFluencyEventRecord(
      {
        event_type: "workflow_stage_transition",
        timestamp: "2026-01-01T00:00:01.000Z",
        risk_class: "low",
        workflow_id: "wf-1",
        stage_from: "b",
        stage_to: "c",
        ai_assisted: false,
        run_id: run
      },
      "s2"
    );
    const d = buildFluencyEventRecord(
      {
        event_type: "ai_output_disposition",
        timestamp: "2026-01-01T00:00:02.000Z",
        risk_class: "low",
        workflow_id: "wf-1",
        disposition: "accepted",
        edit_distance_bucket: "none",
        verification_present: false,
        time_to_action_ms: 1,
        run_id: run
      },
      "d1"
    );
    const ordered = sortEventsByTimestamp([d, s1, s2]);
    const groups = groupStageSteps(ordered);
    expect(groups).toHaveLength(1);
    expect(groups[0].event_ids.sort()).toEqual(["s1", "s2"].sort());
  });

  it("reconstructTracesForQuery filters by workflow_id", () => {
    const a = buildFluencyEventRecord(
      {
        event_type: "ai_output_disposition",
        timestamp: "2026-01-01T00:00:00.000Z",
        risk_class: "low",
        workflow_id: "wf-a",
        disposition: "accepted",
        edit_distance_bucket: "none",
        verification_present: false,
        time_to_action_ms: 1
      },
      "a1"
    );
    const b = buildFluencyEventRecord(
      {
        event_type: "ai_output_disposition",
        timestamp: "2026-01-01T00:00:00.000Z",
        risk_class: "low",
        workflow_id: "wf-b",
        disposition: "accepted",
        edit_distance_bucket: "none",
        verification_present: false,
        time_to_action_ms: 1
      },
      "b1"
    );
    const traces = reconstructTracesForQuery([a, b], { workflow_id: "wf-a" });
    expect(traces).toHaveLength(1);
    expect(traces[0].workflow_id).toBe("wf-a");
  });

  it("reconstructTrace returns null for empty", () => {
    expect(reconstructTrace([])).toBeNull();
  });

  it("isFailureSignal matches rejection and abandoned disposition", () => {
    const rej = buildFluencyEventRecord(
      {
        event_type: "ai_output_disposition",
        timestamp: "2026-01-01T00:00:00.000Z",
        risk_class: "low",
        workflow_id: "w",
        disposition: "rejected",
        edit_distance_bucket: "none",
        verification_present: false,
        time_to_action_ms: 1
      },
      "x"
    );
    expect(isFailureSignal(rej)).toBe(true);
  });
});
