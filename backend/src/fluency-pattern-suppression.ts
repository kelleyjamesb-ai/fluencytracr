import type { FluencyPatternName } from "@fluencytracr/shared";
import type { ExecutionSignals, Phase2Thresholds } from "./execution_signals";
import type { TraceGateSummary } from "./fluency_execution_gates";
import {
  BehaviorPattern,
  classifyBehaviorPattern,
  type LatencyBucketForClassification,
  type PatternClassificationInput,
  type PatternClassificationResult
} from "./services/pattern-classifier";
import { evaluateSuppression, type SuppressionDecision } from "./services/suppression-engine";

/** Aligns with `resolveLatencyBucketForClassification` bands on the canonical pipeline (internal only). */
const LATENCY_LOW_MS = 60_000;

const behaviorPatternToFluency = (p: BehaviorPattern): FluencyPatternName => {
  switch (p) {
    case BehaviorPattern.UNDERTRUST_AVOIDANCE:
      return "Undertrust Avoidance";
    case BehaviorPattern.FRICTION_LOOP:
      return "Friction Loop";
    case BehaviorPattern.RECOVERY_MATURITY:
      return "Recovery Maturity";
    case BehaviorPattern.BLIND_EFFICIENCY:
      return "Blind Efficiency";
    case BehaviorPattern.CALIBRATED_FLUENCY:
      return "Calibrated Fluency";
  }
};

/**
 * Maps Fluency Phase-2 signals + workflow thresholds into the canonical §21 classifier input.
 * Iteration buckets use the same workflow-relative low/high edges as legacy `classifyExecutionPattern`.
 */
export const fluencySignalsToPatternClassificationInput = (
  signals: ExecutionSignals,
  thresholds: Phase2Thresholds
): PatternClassificationInput => {
  const raw = signals.iteration_depth;
  let iteration_bucket: "LOW" | "NORMAL" | "HIGH";
  if (raw <= thresholds.iteration_low) {
    iteration_bucket = "LOW";
  } else if (raw >= thresholds.iteration_high) {
    iteration_bucket = "HIGH";
  } else {
    iteration_bucket = "NORMAL";
  }

  let latency_bucket: LatencyBucketForClassification;
  if (signals.latency_ms === null) {
    latency_bucket = "UNKNOWN";
  } else if (signals.latency_ms >= thresholds.latency_high_ms) {
    latency_bucket = "HIGH";
  } else if (signals.latency_ms <= LATENCY_LOW_MS) {
    latency_bucket = "LOW";
  } else {
    latency_bucket = "NORMAL";
  }

  const abandonment_present =
    signals.abandonment_present || (signals.event_count > 0 && !signals.has_ai_usage);

  return {
    abandonment_present,
    iteration_bucket,
    raw_iteration_count: raw,
    verification_present: signals.verification_present,
    recovery_present: signals.recovery_present,
    latency_bucket
  };
};

export type FluencyPatternSuppressionResult = {
  readonly pattern: FluencyPatternName | null;
  readonly suppression: SuppressionDecision;
  readonly classification: PatternClassificationResult;
};

/**
 * Canonical §21 classifier + suppression hierarchy on Fluency signals (PRD phase 5 alignment).
 */
export const runFluencyPatternSuppression = (params: {
  readonly signals: ExecutionSignals;
  readonly thresholds: Phase2Thresholds;
  readonly gates: TraceGateSummary;
}): FluencyPatternSuppressionResult => {
  const { signals, thresholds, gates } = params;

  let classification: PatternClassificationResult = {
    classified: false,
    reason: "AMBIGUITY"
  };

  if (gates.fsc_eligible && gates.min_signal_allowed) {
    classification = classifyBehaviorPattern(fluencySignalsToPatternClassificationInput(signals, thresholds));
  }

  const suppression = evaluateSuppression({
    fsc_eligible: gates.fsc_eligible,
    minimum_signal_allowed: gates.min_signal_allowed,
    classification_possible: classification.classified,
    classification_reason: classification.reason
  });

  const pattern =
    suppression.status === "ALLOWED" && classification.classified && classification.pattern !== undefined
      ? behaviorPatternToFluency(classification.pattern)
      : null;

  return { pattern, suppression, classification };
};
