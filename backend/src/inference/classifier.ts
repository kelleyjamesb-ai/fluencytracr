import type { JudgmentEvent, PatternInferenceRecord } from "./types";

const confidenceFromEvidence = (count: number, days: number) => {
  if (count >= 80 && days >= 20) {
    return "HIGH" as const;
  }
  if (count >= 40 && days >= 14) {
    return "MEDIUM" as const;
  }
  return "LOW" as const;
};

export const classifyPattern = (
  record: PatternInferenceRecord,
  events: JudgmentEvent[]
): PatternInferenceRecord => {
  if (events.length === 0) {
    return { ...record, pattern: "NO_PATTERN", confidence_level: "WITHHOLD" };
  }

  const total = Math.max(events.length, 1);
  const acceptance = events.filter((event) => event.event_type === "ACCEPT").length;
  const edits = events.filter((event) => event.event_type === "EDIT").length;
  const rejects = events.filter((event) => event.event_type === "REJECT").length;
  const abandons = events.filter((event) => event.event_type === "ABANDON").length;
  const overrides = events.filter((event) => event.event_type === "OVERRIDE").length;
  const longLatency = events.filter((event) => event.latency_bucket === "LONG_DELAY").length;

  const acceptanceRate = acceptance / total;
  const editRate = edits / total;
  const abandonmentRate = abandons / total;
  const overrideRate = overrides / total;
  const longLatencyRate = longLatency / total;
  const rejectionRate = rejects / total;

  let pattern: PatternInferenceRecord["pattern"] = "NO_PATTERN";

  if (acceptanceRate >= 0.6 && editRate <= 0.2 && overrideRate <= 0.1) {
    pattern = "CALIBRATED_FLUENCY";
  } else if (acceptanceRate >= 0.7 && longLatencyRate <= 0.2 && rejectionRate <= 0.1) {
    pattern = "BLIND_EFFICIENCY";
  } else if (overrideRate >= 0.2 && abandonmentRate <= 0.1) {
    pattern = "RECOVERY_MATURITY";
  } else if (editRate >= 0.35 || abandonmentRate >= 0.2) {
    pattern = "FRICTION_LOOP";
  } else if (rejectionRate >= 0.2 && abandonmentRate >= 0.15) {
    pattern = "UNDERTRUST_AVOIDANCE";
  }

  return {
    ...record,
    pattern,
    confidence_level: confidenceFromEvidence(record.evidence_count, record.coverage_days)
  };
};
