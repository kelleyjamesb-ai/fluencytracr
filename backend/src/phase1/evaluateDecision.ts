import type { Phase1Event } from "./contract";
import { parseWindowId } from "./windowing";

export type Phase1Decision = {
  decision: "SURFACE" | "SUPPRESS";
  suppression_reason_code?: string;
  window_length_days: number;
};

export const SUPPRESSION_REASONS = {
  AMBIGUITY: "SUPP_AMBIGUITY",
  AMBIGUOUS_INPUT: "SUPP_AMBIGUOUS_INPUT",
  WINDOW_LT_60: "SUPP_WINDOW_LT_60D",
  WINDOW_INVALID: "SUPP_WINDOW_INVALID",
  INSUFFICIENT_EVIDENCE: "SUPP_INSUFFICIENT_EVIDENCE",
  SPARSE_DATA: "SUPP_SPARSE_DATA"
} as const;

const ensureCohortConsistency = (events: Phase1Event[]): boolean => {
  if (events.length === 0) {
    return false;
  }
  const { org_id, function_id, role_class, window_id } = events[0];
  return events.every(
    (event) =>
      event.org_id === org_id &&
      event.function_id === function_id &&
      event.role_class === role_class &&
      event.window_id === window_id
  );
};

const countDistinctEventNames = (events: Phase1Event[]): number => {
  return new Set(events.map((event) => event.event_name)).size;
};

export const evaluateDecision = (events: Phase1Event[]): Phase1Decision => {
  if (events.length === 0) {
    return {
      decision: "SUPPRESS",
      suppression_reason_code: SUPPRESSION_REASONS.SPARSE_DATA,
      window_length_days: 0
    };
  }

  if (!ensureCohortConsistency(events)) {
    return {
      decision: "SUPPRESS",
      suppression_reason_code: SUPPRESSION_REASONS.AMBIGUOUS_INPUT,
      window_length_days: 0
    };
  }

  const ambiguityEvent = events.find((event) => event.ambiguity_flag);
  if (ambiguityEvent) {
    return {
      decision: "SUPPRESS",
      suppression_reason_code: ambiguityEvent.ambiguity_reason_code ?? SUPPRESSION_REASONS.AMBIGUITY,
      window_length_days: 0
    };
  }

  const window = parseWindowId(events[0].window_id);
  if (!window) {
    return {
      decision: "SUPPRESS",
      suppression_reason_code: SUPPRESSION_REASONS.WINDOW_INVALID,
      window_length_days: 0
    };
  }

  if (window.lengthDays < 60) {
    return {
      decision: "SUPPRESS",
      suppression_reason_code: SUPPRESSION_REASONS.WINDOW_LT_60,
      window_length_days: window.lengthDays
    };
  }

  if (countDistinctEventNames(events) < 2) {
    return {
      decision: "SUPPRESS",
      suppression_reason_code: SUPPRESSION_REASONS.INSUFFICIENT_EVIDENCE,
      window_length_days: window.lengthDays
    };
  }

  return {
    decision: "SURFACE",
    window_length_days: window.lengthDays
  };
};
