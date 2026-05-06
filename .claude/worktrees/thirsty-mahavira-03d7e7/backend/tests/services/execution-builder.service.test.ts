import type { CanonicalEvent } from "../../src/domain/canonical-event.schema";
import { buildExecutionFromEvents } from "../../src/services/execution-builder.service";

const evt = (over: Partial<CanonicalEvent> & { context?: Record<string, unknown> }): CanonicalEvent => ({
  event_name: "step",
  event_version: "1",
  org_id: "o1",
  workflow_id: "w1",
  timestamp: "2026-01-01T12:00:00.000Z",
  actor_type: "ai",
  context: {},
  execution_id: "ex1",
  ...over,
  context: { ...over.context }
});

describe("buildExecutionFromEvents", () => {
  it("builds from a coherent single-execution event set", () => {
    const events: CanonicalEvent[] = [
      evt({
        event_name: "execution_start",
        timestamp: "2026-01-01T12:00:00.000Z",
        metadata: { event_id: "e0" }
      }),
      evt({
        event_name: "step",
        timestamp: "2026-01-01T12:01:00.000Z",
        metadata: { event_id: "e1" }
      }),
      evt({
        event_name: "ai_output_disposition",
        timestamp: "2026-01-01T12:02:00.000Z",
        context: { disposition: "accepted" },
        metadata: { event_id: "e2" }
      })
    ];
    const r = buildExecutionFromEvents({ events, execution_id: "ex1" });
    expect(r).not.toBeNull();
    expect(r!.execution_id).toBe("ex1");
    expect(r!.ordered_events).toHaveLength(3);
    expect(r!.trace_count).toBeGreaterThanOrEqual(1);
    expect(r!.ordering_reconstructable).toBe(true);
    expect(r!.start_event_present).toBe(true);
    expect(r!.terminal_or_abandonment_present).toBe(true);
  });

  it("returns null when canonical execution keys span multiple ids", () => {
    const a = evt({ execution_id: "ex_a", metadata: { event_id: "a" } });
    const b = evt({ execution_id: "ex_b", metadata: { event_id: "b" } });
    const r = buildExecutionFromEvents({ events: [a, b], execution_id: "ex_a" });
    expect(r).toBeNull();
  });

  it("returns null when ordering cannot be reconstructed (invalid timestamp)", () => {
    const e = evt({ timestamp: "not-a-date", metadata: { event_id: "x" } });
    const r = buildExecutionFromEvents({ events: [e], execution_id: "ex1" });
    expect(r).toBeNull();
  });

  it("returns null when org_id or workflow_id mixed", () => {
    const a = evt({ org_id: "o1", metadata: { event_id: "a" } });
    const b = evt({ org_id: "o2", metadata: { event_id: "b" } });
    const r = buildExecutionFromEvents({ events: [a, b], execution_id: "ex1" });
    expect(r).toBeNull();
  });
});
