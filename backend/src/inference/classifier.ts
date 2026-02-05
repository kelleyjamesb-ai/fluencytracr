import type { JudgmentEvent, PatternInferenceRecord } from "./types";

export const classifyPattern = (
  record: PatternInferenceRecord,
  _events: JudgmentEvent[]
): PatternInferenceRecord => {
  return record;
};
