import type { CanonicalEvent } from "../../src/domain/canonical-event.schema";
import {
  DEFAULT_TRACE_GAP_THRESHOLD_MS,
  detectRetrySequences,
  orderExecutionEvents,
  reconstructExecutionTrace,
  segmentTraces,
  stableEventId
} from "../../src/services/trace-reconstruction.service";

const base = (over: Partial<CanonicalEvent> & { context?: Record<string, unknown> }): CanonicalEvent => ({
  event_name: "step",
  event_version: "1",
  org_id: "o1",
  workflow_id: "w1",
  timestamp: "2026-01-01T00:00:00.000Z",
  actor_type: "ai",
  context: {},
  execution_id: "ex1",
  ...over,
  context: { ...over.context }
});

describe("orderExecutionEvents", () => {
  it("orders by timestamp then secondary sequence then index", () => {
    const a = base({
      timestamp: "2026-01-01T00:00:01.000Z",
      context: { sequence: 2 },
      metadata: { event_id: "a" }
    });
    const b = base({
      timestamp: "2026-01-01T00:00:01.000Z",
      context: { sequence: 1 },
      metadata: { event_id: "b" }
    });
    const ordered = orderExecutionEvents([a, b]);
    expect(ordered).not.toBeNull();
    expect(ordered!.map((e) => (e.metadata as { event_id: string }).event_id)).toEqual(["b", "a"]);
  });

  it("returns null when timestamp invalid", () => {
    const e = base({ timestamp: "invalid" });
    expect(orderExecutionEvents([e])).toBeNull();
  });
});

describe("reconstructExecutionTrace", () => {
  it("happy path: ordered events and retries", () => {
    const e0 = base({
      timestamp: "2026-01-01T00:00:00.000Z",
      metadata: { event_id: "e0" }
    });
    const e1 = base({
      timestamp: "2026-01-01T00:00:05.000Z",
      event_name: "ai_output_disposition",
      context: { disposition: "rejected" },
      metadata: { event_id: "e1" }
    });
    const e2 = base({
      timestamp: "2026-01-01T00:00:06.000Z",
      metadata: { event_id: "e2" }
    });
    const r = reconstructExecutionTrace({ events: [e0, e1, e2], execution_id: "ex1" });
    expect(r.success).toBe(true);
    expect(r.ordered_events).toHaveLength(3);
    expect(r.retry_sequences.length).toBeGreaterThanOrEqual(1);
  });

  it("groups same execution_id", () => {
    const e1 = base({ metadata: { event_id: "1" } });
    const e2 = base({ metadata: { event_id: "2" } });
    const r = reconstructExecutionTrace({ events: [e1, e2], execution_id: "ex1" });
    expect(r.success).toBe(true);
    expect(r.execution_id).toBe("ex1");
  });

  it("rejects multiple executions", () => {
    const a = base({ execution_id: "ex_a", metadata: { event_id: "a" } });
    const b = base({ execution_id: "ex_b", metadata: { event_id: "b" } });
    const r = reconstructExecutionTrace({ events: [a, b], execution_id: "ex1" });
    expect(r.success).toBe(false);
    expect(r.failed_reason).toBe("MULTIPLE_EXECUTIONS");
  });

  it("fails EMPTY_INPUT", () => {
    const r = reconstructExecutionTrace({ events: [], execution_id: "ex1" });
    expect(r.success).toBe(false);
    expect(r.failed_reason).toBe("EMPTY_INPUT");
  });

  it("fails UNORDERABLE_EVENTS on bad timestamp", () => {
    const e = base({ timestamp: "bad", metadata: { event_id: "x" } });
    const r = reconstructExecutionTrace({ events: [e], execution_id: "ex1" });
    expect(r.success).toBe(false);
    expect(r.failed_reason).toBe("UNORDERABLE_EVENTS");
  });
});

describe("segmentTraces", () => {
  it("splits after terminal and resumed_after_terminal", () => {
    const t0 = base({
      timestamp: "2026-01-01T00:00:00.000Z",
      event_name: "ai_output_disposition",
      context: { disposition: "accepted" },
      metadata: { event_id: "t0" }
    });
    const t1 = base({
      timestamp: "2026-01-01T00:00:01.000Z",
      context: { resumed_after_terminal: true },
      metadata: { event_id: "t1" }
    });
    const segs = segmentTraces([t0, t1], "ex1", DEFAULT_TRACE_GAP_THRESHOLD_MS);
    expect(segs.length).toBe(2);
  });

  it("splits on trace_id change", () => {
    const a = base({
      metadata: { event_id: "a", trace_id: "A" },
      timestamp: "2026-01-01T00:00:00.000Z"
    });
    const b = base({
      metadata: { event_id: "b", trace_id: "B" },
      timestamp: "2026-01-01T00:00:01.000Z"
    });
    const segs = segmentTraces([a, b], "ex1");
    expect(segs.length).toBe(2);
  });
});

describe("detectRetrySequences", () => {
  it("detects retry pair within window", () => {
    const events = [
      base({
        timestamp: "2026-01-01T00:00:00.000Z",
        event_name: "ai_output_disposition",
        context: { disposition: "rejected" },
        metadata: { event_id: "f" }
      }),
      base({
        timestamp: "2026-01-01T00:00:01.000Z",
        metadata: { event_id: "s" }
      })
    ];
    const rs = detectRetrySequences(events);
    expect(rs.length).toBe(1);
    expect(rs[0]!.event_indexes).toEqual([0, 1]);
  });
});

describe("stableEventId", () => {
  it("uses synthetic index when no ids", () => {
    expect(stableEventId(base({}), 3)).toBe("synthetic:3");
  });
});
