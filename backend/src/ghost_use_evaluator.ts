import type { FluencyWindow } from "@fluencytracr/shared";
import { WINDOW_DAYS, windowStart } from "./fluencytracr";
import type { FluencyEventRecord } from "./store";

export type GhostUseStatus = "PRESENT" | "ABSENT" | "SUPPRESSED";

export type GhostUseEvaluation = {
  status: GhostUseStatus;
  hint: string | null;
};

const AMBIGUITY_DOMINANCE_THRESHOLD = 0.2;

const timestampOf = (event: FluencyEventRecord): Date => new Date(event.timestamp);

const inRange = (event: FluencyEventRecord, start: Date, end: Date, includeStart: boolean): boolean => {
  const ts = timestampOf(event);
  if (Number.isNaN(ts.getTime())) {
    return false;
  }
  const afterStart = includeStart ? ts >= start : ts > start;
  return afterStart && ts <= end;
};

const previousWindowStart = (currentStart: Date, window: FluencyWindow): Date => {
  const start = new Date(currentStart);
  start.setDate(start.getDate() - WINDOW_DAYS[window]);
  return start;
};

export const hasPositiveAiEvidence = (events: FluencyEventRecord[]): boolean =>
  events.some((event) => {
    if (event.event_type === "workflow_stage_transition") {
      return event.ai_assisted === true;
    }
    return (
      event.event_type === "verification_signal" ||
      event.event_type === "ai_recovery_loop" ||
      event.event_type === "ai_output_disposition" ||
      event.event_type === "ai_abandonment"
    );
  });

const hasAiExposure = (events: FluencyEventRecord[]): boolean => events.length > 0;

const hasWorkActivity = (events: FluencyEventRecord[]): boolean =>
  events.some((event) => event.event_type === "workflow_stage_transition");

const ambiguityRate = (events: FluencyEventRecord[]): number => {
  if (events.length === 0) {
    return 0;
  }
  const ambiguous = events.filter((event) => (event as FluencyEventRecord & { ambiguity_flag?: boolean }).ambiguity_flag === true);
  return ambiguous.length / events.length;
};

const basePreconditionsHold = (events: FluencyEventRecord[]): boolean =>
  hasAiExposure(events) && hasWorkActivity(events) && !hasPositiveAiEvidence(events);

export const evaluateGhostUseResidual = (
  events: FluencyEventRecord[],
  window: FluencyWindow,
  now: Date
): GhostUseEvaluation => {
  const currentStart = windowStart(window, now);
  const previousStart = previousWindowStart(currentStart, window);
  const current = events.filter((event) => inRange(event, currentStart, now, true));
  const previous = events.filter((event) => inRange(event, previousStart, currentStart, false));

  if (hasPositiveAiEvidence(current) || hasPositiveAiEvidence(previous)) {
    return { status: "ABSENT", hint: "positive evidence hard-bypass applied" };
  }

  if (
    ambiguityRate(current) > AMBIGUITY_DOMINANCE_THRESHOLD ||
    ambiguityRate(previous) > AMBIGUITY_DOMINANCE_THRESHOLD
  ) {
    return { status: "SUPPRESSED", hint: "ambiguity suppression applied" };
  }

  if (!basePreconditionsHold(current)) {
    return { status: "ABSENT", hint: null };
  }

  if (!basePreconditionsHold(previous)) {
    return { status: "ABSENT", hint: "required windows persistence gate not met" };
  }

  return { status: "PRESENT", hint: "no observed AI evidence in window" };
};
