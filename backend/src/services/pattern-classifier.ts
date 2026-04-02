/**
 * Deterministic mutually exclusive pattern classification — fixed priority; ambiguity fails closed.
 */

export enum BehaviorPattern {
  UNDERTRUST_AVOIDANCE = "UNDERTRUST_AVOIDANCE",
  FRICTION_LOOP = "FRICTION_LOOP",
  RECOVERY_MATURITY = "RECOVERY_MATURITY",
  BLIND_EFFICIENCY = "BLIND_EFFICIENCY",
  CALIBRATED_FLUENCY = "CALIBRATED_FLUENCY"
}

export type SignalBucket = "LOW" | "NORMAL" | "HIGH";

export type LatencyBucketForClassification = SignalBucket | "UNKNOWN";

export interface PatternClassificationInput {
  readonly abandonment_present: boolean;
  readonly iteration_bucket: SignalBucket;
  readonly raw_iteration_count: number;
  readonly verification_present: boolean;
  readonly recovery_present: boolean;
  /** UNKNOWN skips rules that require a known latency band (e.g. FRICTION_LOOP). */
  readonly latency_bucket: LatencyBucketForClassification;
}

export interface PatternClassificationResult {
  readonly classified: boolean;
  readonly pattern?: BehaviorPattern;
  readonly reason?: "AMBIGUITY";
}

export function classifyBehaviorPattern(
  input: PatternClassificationInput
): PatternClassificationResult {
  if (input.abandonment_present) {
    return { classified: true, pattern: BehaviorPattern.UNDERTRUST_AVOIDANCE };
  }
  if (
    input.iteration_bucket === "HIGH" &&
    input.latency_bucket !== "UNKNOWN" &&
    input.latency_bucket === "HIGH"
  ) {
    return { classified: true, pattern: BehaviorPattern.FRICTION_LOOP };
  }
  if (input.recovery_present) {
    return { classified: true, pattern: BehaviorPattern.RECOVERY_MATURITY };
  }
  if (input.raw_iteration_count === 0 && !input.verification_present) {
    return { classified: true, pattern: BehaviorPattern.BLIND_EFFICIENCY };
  }
  if (input.iteration_bucket === "LOW" && input.verification_present) {
    return { classified: true, pattern: BehaviorPattern.CALIBRATED_FLUENCY };
  }

  return { classified: false, reason: "AMBIGUITY" };
}
