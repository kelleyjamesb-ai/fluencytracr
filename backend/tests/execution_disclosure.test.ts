import { buildFluencyEventRecord } from "../src/store";
import {
  applyDisclosureToTrace,
  evaluateExecutionDisclosure,
  MIN_EVENT_COUNT_FOR_DISCLOSURE
} from "../src/execution_disclosure";
import { attachPhase2ToTraces } from "../src/execution_signals";
import { reconstructTrace } from "../src/trace_engine";

describe("evaluateExecutionDisclosure", () => {
  const signals = (partial: Record<string, unknown>) =>
    ({
      event_count: 2,
      iteration_depth: 0,
      verification_present: true,
      recovery_present: false,
      abandonment_present: false,
      latency_ms: 60_000,
      last_disposition: "accepted" as const,
      has_ai_usage: true,
      confidence_tier: "medium" as const,
      ...partial
    }) as import("../src/execution_signals").ExecutionSignals;

  it("ALLOWED when medium confidence and enough events and valid latency", () => {
    expect(evaluateExecutionDisclosure(signals({})).state).toBe("ALLOWED");
  });

  it("SUPPRESSED for low confidence", () => {
    const d = evaluateExecutionDisclosure(signals({ confidence_tier: "low" }));
    expect(d.state).toBe("SUPPRESSED");
    expect(d.reasons).toContain("low_confidence_tier");
  });

  it("SUPPRESSED for insufficient event count", () => {
    const d = evaluateExecutionDisclosure(signals({ event_count: 1, confidence_tier: "high" }));
    expect(d.state).toBe("SUPPRESSED");
    expect(d.reasons).toContain("insufficient_event_count");
  });

  it("SUPPRESSED for invalid timestamps when multiple events", () => {
    const d = evaluateExecutionDisclosure(
      signals({ event_count: 2, latency_ms: null, confidence_tier: "high" })
    );
    expect(d.state).toBe("SUPPRESSED");
    expect(d.reasons).toContain("invalid_timestamps");
  });

  it("documents minimum event threshold", () => {
    expect(MIN_EVENT_COUNT_FOR_DISCLOSURE).toBeGreaterThanOrEqual(2);
  });
});

describe("applyDisclosureToTrace", () => {
  it("strips pattern and signals when SUPPRESSED", () => {
    const e1 = buildFluencyEventRecord(
      {
        event_type: "ai_output_disposition",
        timestamp: "2026-04-01T10:00:00.000Z",
        risk_class: "low",
        workflow_id: "wf-d",
        disposition: "accepted",
        edit_distance_bucket: "none",
        verification_present: true,
        time_to_action_ms: 1,
        run_id: "r1"
      },
      "d1"
    );
    const trace = reconstructTrace([e1])!;
    const [phase2] = attachPhase2ToTraces([trace], [e1]);
    const out = applyDisclosureToTrace(phase2);
    expect(out.disclosure.state).toBe("SUPPRESSED");
    expect(out.pattern).toBeNull();
    expect(out.signals).toBeNull();
    expect(out.lifecycle.state).toBe("COMPLETED");
  });
});
