import { buildFluencyEventRecord } from "../src/store";
import {
  applyDisclosureToTrace,
  evaluateExecutionDisclosure,
  MIN_EVENT_COUNT_FOR_DISCLOSURE
} from "../src/execution_disclosure";
import { FLUENCY_GATES_ALL_PASS } from "../src/fluency_execution_gates";
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

  it("SUPPRESSED with incomplete_execution when FSC fails", () => {
    const d = evaluateExecutionDisclosure(signals({}), {
      fsc_eligible: false,
      fsc_failed_checks: ["boundary_integrity"],
      min_signal_allowed: true,
      min_signal_failed_checks: []
    });
    expect(d.state).toBe("SUPPRESSED");
    expect(d.reasons).toContain("incomplete_execution");
    expect(d.reasons).toContain("fsc:boundary_integrity");
  });

  it("SUPPRESSED with insufficient_signal when min gate fails after FSC", () => {
    const d = evaluateExecutionDisclosure(signals({}), {
      fsc_eligible: true,
      fsc_failed_checks: [],
      min_signal_allowed: false,
      min_signal_failed_checks: ["minimum_signal_channel"]
    });
    expect(d.state).toBe("SUPPRESSED");
    expect(d.reasons).toContain("insufficient_signal");
    expect(d.reasons).toContain("min_signal:minimum_signal_channel");
  });

  it("SUPPRESSED with classification_ambiguity when suppression engine returns AMBIGUITY", () => {
    const d = evaluateExecutionDisclosure(
      signals({ confidence_tier: "high" }),
      FLUENCY_GATES_ALL_PASS,
      {
        status: "SUPPRESSED",
        reason: "AMBIGUITY",
        diagnostics: Object.freeze(["classification_blocked:AMBIGUITY"])
      }
    );
    expect(d.state).toBe("SUPPRESSED");
    expect(d.reasons).toContain("classification_ambiguity");
    expect(d.reasons).toContain("suppression:classification_blocked:AMBIGUITY");
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
