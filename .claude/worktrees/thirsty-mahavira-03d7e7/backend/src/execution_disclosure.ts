import type { FluencyPatternName } from "@learnaire/shared";
import type { ExecutionSignals, TraceWithPhase2 } from "./execution_signals";

/** Minimum events before interpretive signals/patterns may be disclosed (PRD Phase 3). */
export const MIN_EVENT_COUNT_FOR_DISCLOSURE = Number(
  process.env.FLUENCY_MIN_EXECUTION_EVENTS_FOR_DISCLOSURE ?? 2
);

export type DisclosureState = "ALLOWED" | "SUPPRESSED";

export type ExecutionDisclosure = {
  state: DisclosureState;
  /** Stable machine-readable reasons when SUPPRESSED; empty when ALLOWED. */
  reasons: string[];
};

export type TraceWithGovernance = Omit<TraceWithPhase2, "signals" | "pattern" | "pattern_confidence_tier"> & {
  disclosure: ExecutionDisclosure;
  signals: ExecutionSignals | null;
  pattern: FluencyPatternName | null;
  pattern_confidence_tier: ExecutionSignals["confidence_tier"] | null;
};

/**
 * Fail-closed governance for per-execution interpretive output (PRD Phase 3).
 * Does not suppress structural trace fields (ordered_event_ids, retry_sequences, etc.).
 */
export const evaluateExecutionDisclosure = (signals: ExecutionSignals): ExecutionDisclosure => {
  const reasons: string[] = [];

  if (signals.event_count < MIN_EVENT_COUNT_FOR_DISCLOSURE) {
    reasons.push("insufficient_event_count");
  }

  if (signals.confidence_tier === "low") {
    reasons.push("low_confidence_tier");
  }

  if (signals.event_count >= 2 && signals.latency_ms === null) {
    reasons.push("invalid_timestamps");
  }

  if (reasons.length > 0) {
    return { state: "SUPPRESSED", reasons };
  }

  return { state: "ALLOWED", reasons: [] };
};

export const applyDisclosureToTrace = (trace: TraceWithPhase2): TraceWithGovernance => {
  const disclosure = evaluateExecutionDisclosure(trace.signals);
  if (disclosure.state === "SUPPRESSED") {
    return {
      ...trace,
      disclosure,
      signals: null,
      pattern: null,
      pattern_confidence_tier: null
    };
  }
  return {
    ...trace,
    disclosure,
    signals: trace.signals,
    pattern: trace.pattern,
    pattern_confidence_tier: trace.pattern_confidence_tier
  };
};

export const applyDisclosureToTraces = (traces: TraceWithPhase2[]): TraceWithGovernance[] =>
  traces.map(applyDisclosureToTrace);
