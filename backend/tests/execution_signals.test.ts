import { buildFluencyEventRecord } from "../src/store";
import {
  SIGNAL_REGISTRY,
  attachPhase2ToTraces,
  classifyExecutionPattern,
  computeExecutionSignals,
  DEFAULT_PHASE2_THRESHOLDS,
  type ExecutionSignals
} from "../src/execution_signals";
import { reconstructTrace } from "../src/trace_engine";

describe("SIGNAL_REGISTRY", () => {
  it("declares known signals", () => {
    expect(Object.keys(SIGNAL_REGISTRY)).toEqual([
      "iteration_depth",
      "verification_present",
      "recovery_present",
      "abandonment_present",
      "latency_ms",
      "last_disposition"
    ]);
  });
});

describe("classifyExecutionPattern", () => {
  const baseSignals = (overrides: Partial<ExecutionSignals>): ExecutionSignals => ({
    event_count: 2,
    iteration_depth: 0,
    verification_present: false,
    recovery_present: false,
    abandonment_present: false,
    latency_ms: 1000,
    last_disposition: "accepted",
    has_ai_usage: true,
    confidence_tier: "medium",
    ...overrides
  });

  it("returns Undertrust Avoidance for abandonment", () => {
    expect(classifyExecutionPattern(baseSignals({ abandonment_present: true }))).toBe("Undertrust Avoidance");
  });

  it("returns Undertrust Avoidance when no AI-adjacent events but events exist", () => {
    expect(
      classifyExecutionPattern(
        baseSignals({ has_ai_usage: false, event_count: 1, last_disposition: null })
      )
    ).toBe("Undertrust Avoidance");
  });

  it("returns Friction Loop when high iteration and high latency", () => {
    expect(
      classifyExecutionPattern(
        baseSignals({
          iteration_depth: 2,
          latency_ms: DEFAULT_PHASE2_THRESHOLDS.latency_high_ms,
          abandonment_present: false
        })
      )
    ).toBe("Friction Loop");
  });

  it("returns Recovery Maturity when recovery_present (after friction checks)", () => {
    expect(
      classifyExecutionPattern(
        baseSignals({
          recovery_present: true,
          iteration_depth: 1,
          latency_ms: 60_000
        })
      )
    ).toBe("Recovery Maturity");
  });

  it("returns Blind Efficiency for zero iteration and no verification", () => {
    expect(classifyExecutionPattern(baseSignals({ verification_present: false, iteration_depth: 0 }))).toBe(
      "Blind Efficiency"
    );
  });

  it("returns Calibrated Fluency for low iteration and verification", () => {
    expect(
      classifyExecutionPattern(
        baseSignals({ iteration_depth: 1, verification_present: true, recovery_present: false })
      )
    ).toBe("Calibrated Fluency");
  });
});

describe("computeExecutionSignals + attachPhase2ToTraces", () => {
  const runId = "run-classify-1";

  it("classifies recovery after rejection then acceptance", () => {
    const e1 = buildFluencyEventRecord(
      {
        event_type: "ai_output_disposition",
        timestamp: "2026-04-01T10:00:00.000Z",
        risk_class: "low",
        workflow_id: "wf-r",
        disposition: "rejected",
        edit_distance_bucket: "none",
        verification_present: false,
        time_to_action_ms: 100,
        run_id: runId
      },
      "e1"
    );
    const e2 = buildFluencyEventRecord(
      {
        event_type: "ai_output_disposition",
        timestamp: "2026-04-01T10:05:00.000Z",
        risk_class: "low",
        workflow_id: "wf-r",
        disposition: "accepted",
        edit_distance_bucket: "none",
        verification_present: false,
        time_to_action_ms: 100,
        run_id: runId
      },
      "e2"
    );
    const group = [e1, e2];
    const trace = reconstructTrace(group)!;
    const signals = computeExecutionSignals(group, trace);
    expect(signals.iteration_depth).toBeGreaterThanOrEqual(1);
    expect(signals.recovery_present).toBe(true);
    const pattern = classifyExecutionPattern(signals);
    expect(pattern).toBe("Recovery Maturity");
  });

  it("attachPhase2ToTraces adds pattern to trace payload", () => {
    const e1 = buildFluencyEventRecord(
      {
        event_type: "ai_output_disposition",
        timestamp: "2026-04-01T10:00:00.000Z",
        risk_class: "low",
        workflow_id: "wf-p",
        disposition: "accepted",
        edit_distance_bucket: "none",
        verification_present: true,
        time_to_action_ms: 100,
        run_id: "r2"
      },
      "p1"
    );
    const trace = reconstructTrace([e1])!;
    const enriched = attachPhase2ToTraces([trace], [e1]);
    expect(enriched).toHaveLength(1);
    expect(enriched[0].pattern).toBe("Calibrated Fluency");
    expect(enriched[0].signals.event_count).toBe(1);
    expect(enriched[0].pattern_confidence_tier).toBe("low");
  });

  it("stage-only execution is Undertrust Avoidance", () => {
    const s1 = buildFluencyEventRecord(
      {
        event_type: "workflow_stage_transition",
        timestamp: "2026-04-01T10:00:00.000Z",
        risk_class: "low",
        workflow_id: "wf-stage",
        stage_from: "a",
        stage_to: "b",
        ai_assisted: false,
        run_id: "r3"
      },
      "s1"
    );
    const trace = reconstructTrace([s1])!;
    const signals = computeExecutionSignals([s1], trace);
    expect(signals.has_ai_usage).toBe(false);
    expect(classifyExecutionPattern(signals)).toBe("Undertrust Avoidance");
  });
});
