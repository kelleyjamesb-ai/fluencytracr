import { FLUENCY_GATES_ALL_PASS } from "../src/fluency_execution_gates";
import {
  fluencySignalsToPatternClassificationInput,
  runFluencyPatternSuppression
} from "../src/fluency-pattern-suppression";
import type { ExecutionSignals, Phase2Thresholds } from "../src/execution_signals";
import { DEFAULT_PHASE2_THRESHOLDS } from "../src/execution_signals";

const baseSignals = (partial: Partial<ExecutionSignals>): ExecutionSignals => ({
  event_count: 4,
  iteration_depth: 1,
  verification_present: true,
  recovery_present: false,
  abandonment_present: false,
  latency_ms: 120_000,
  last_disposition: "accepted",
  has_ai_usage: true,
  confidence_tier: "high",
  ...partial
});

describe("fluencySignalsToPatternClassificationInput", () => {
  it("maps NORMAL iteration when depth is strictly between workflow low and high", () => {
    const thresholds: Phase2Thresholds = {
      iteration_low: 0,
      iteration_high: 3,
      latency_high_ms: 10 * 60 * 1000
    };
    const input = fluencySignalsToPatternClassificationInput(
      baseSignals({ iteration_depth: 1, verification_present: true }),
      thresholds
    );
    expect(input.iteration_bucket).toBe("NORMAL");
    expect(input.raw_iteration_count).toBe(1);
  });
});

describe("runFluencyPatternSuppression", () => {
  it("suppresses with AMBIGUITY when classifier cannot pick a mutually exclusive pattern", () => {
    const thresholds: Phase2Thresholds = {
      iteration_low: 0,
      iteration_high: 3,
      latency_high_ms: 10 * 60 * 1000
    };
    const r = runFluencyPatternSuppression({
      signals: baseSignals({
        iteration_depth: 1,
        verification_present: true,
        recovery_present: false,
        abandonment_present: false,
        latency_ms: 120_000
      }),
      thresholds,
      gates: FLUENCY_GATES_ALL_PASS
    });
    expect(r.classification.classified).toBe(false);
    expect(r.classification.reason).toBe("AMBIGUITY");
    expect(r.suppression.status).toBe("SUPPRESSED");
    expect(r.suppression.reason).toBe("AMBIGUITY");
    expect(r.pattern).toBeNull();
  });

  it("allows Calibrated Fluency when iteration is LOW and verification is present", () => {
    const r = runFluencyPatternSuppression({
      signals: baseSignals({
        iteration_depth: 0,
        verification_present: true,
        latency_ms: 120_000
      }),
      thresholds: DEFAULT_PHASE2_THRESHOLDS,
      gates: FLUENCY_GATES_ALL_PASS
    });
    expect(r.pattern).toBe("Calibrated Fluency");
    expect(r.suppression.status).toBe("ALLOWED");
  });
});
