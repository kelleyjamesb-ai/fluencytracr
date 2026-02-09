import type { PatternInferenceRecord } from "./types";

export const MIN_EVENTS = 12;
export const MIN_DAYS = 7;

export const gateInference = (
  record: PatternInferenceRecord
): PatternInferenceRecord => {
  if (record.evidence_count < MIN_EVENTS || record.coverage_days < MIN_DAYS) {
    return {
      ...record,
      pattern: "NO_PATTERN",
      confidence_level: "WITHHOLD",
      top_drivers: ["Insufficient evidence", "Coverage below threshold"]
    };
  }
  return record;
};
