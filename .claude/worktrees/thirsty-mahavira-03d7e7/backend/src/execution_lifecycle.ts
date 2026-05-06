import type { FluencyEventRecord } from "./store";
import type { ReconstructedTrace } from "./trace_engine";

/**
 * PRD §13 execution lifecycle (terminal inference from event stream + optional wall clock).
 * PAUSED and CANCELLED are reserved until explicit event types exist.
 */

export type ExecutionLifecycleState =
  | "INIT"
  | "ACTIVE"
  | "RETRY"
  | "PAUSED"
  | "COMPLETED"
  | "ERRORED"
  | "ABANDONED"
  | "CANCELLED";

export type ExecutionLifecycle = {
  /** State after processing the full ordered stream, with optional open/inactivity resolution. */
  state: ExecutionLifecycleState;
  /** Matches trace.retry_sequences.length (PRD §14.1). */
  retry_sequence_count: number;
};

export const DEFAULT_INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
export const DEFAULT_MAX_EXECUTION_WINDOW_MS = 24 * 60 * 60 * 1000;

const toTime = (iso: string): number | null => {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
};

const lastOutputDisposition = (
  ordered: FluencyEventRecord[]
): "accepted" | "edited" | "rejected" | "abandoned" | null => {
  for (let i = ordered.length - 1; i >= 0; i -= 1) {
    const e = ordered[i];
    if (e.event_type === "ai_output_disposition") {
      return e.disposition;
    }
  }
  return null;
};

/**
 * Derives lifecycle from ordered events. Uses retry_sequence_count for PRD §13 RETRY semantics;
 * when the stream is still open without a terminal disposition, state may be RETRY or ACTIVE.
 */
export const computeExecutionLifecycle = (
  ordered: FluencyEventRecord[],
  trace: ReconstructedTrace | null,
  opts?: {
    now?: Date;
    inactivity_timeout_ms?: number;
    max_execution_window_ms?: number;
  }
): ExecutionLifecycle => {
  const now = opts?.now ?? new Date();
  const inactivityMs = opts?.inactivity_timeout_ms ?? DEFAULT_INACTIVITY_TIMEOUT_MS;
  const maxWindowMs = opts?.max_execution_window_ms ?? DEFAULT_MAX_EXECUTION_WINDOW_MS;
  const retry_sequence_count = trace?.retry_sequences.length ?? 0;

  if (ordered.length === 0 || !trace) {
    return { state: "INIT", retry_sequence_count: 0 };
  }

  for (const e of ordered) {
    if (e.event_type === "ai_abandonment") {
      return { state: "ABANDONED", retry_sequence_count };
    }
    if (e.event_type === "ai_output_disposition" && e.disposition === "abandoned") {
      return { state: "ABANDONED", retry_sequence_count };
    }
  }

  const times = ordered.map((e) => toTime(e.timestamp)).filter((t): t is number => t !== null);
  const lastT = times.length > 0 ? times[times.length - 1]! : null;
  const firstT = times.length > 0 ? times[0]! : null;

  if (firstT !== null && lastT !== null && lastT - firstT > maxWindowMs) {
    return { state: "ABANDONED", retry_sequence_count };
  }

  const lastDisp = lastOutputDisposition(ordered);

  if (lastDisp === "accepted" || lastDisp === "edited") {
    return { state: "COMPLETED", retry_sequence_count };
  }

  let lastOutputIdx = -1;
  for (let i = ordered.length - 1; i >= 0; i -= 1) {
    if (ordered[i].event_type === "ai_output_disposition") {
      lastOutputIdx = i;
      break;
    }
  }

  if (lastOutputIdx >= 0) {
    const lo = ordered[lastOutputIdx];
    if (lo.event_type === "ai_output_disposition" && lo.disposition === "rejected") {
      const hasLaterActivity = lastOutputIdx < ordered.length - 1;
      if (hasLaterActivity && retry_sequence_count > 0) {
        return { state: "RETRY", retry_sequence_count };
      }
      if (hasLaterActivity) {
        return { state: "ACTIVE", retry_sequence_count };
      }
      return { state: "ERRORED", retry_sequence_count };
    }
  }

  if (lastT !== null && now.getTime() - lastT > inactivityMs) {
    return { state: "ABANDONED", retry_sequence_count };
  }

  if (lastDisp === null && retry_sequence_count > 0) {
    return { state: "RETRY", retry_sequence_count };
  }

  return { state: "ACTIVE", retry_sequence_count };
};
