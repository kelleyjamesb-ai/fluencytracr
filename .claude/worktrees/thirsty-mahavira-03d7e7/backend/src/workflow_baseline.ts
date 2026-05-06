import type { Phase2Thresholds } from "./execution_signals";
import type { FluencyEventRecord } from "./store";
import { groupEventsByExecution, reconstructTrace, sortEventsByTimestamp } from "./trace_engine";

/**
 * PRD §16 — workflow-scoped baselines for Phase 2 thresholds only.
 * Distributions are internal; numeric baselines are never exposed on APIs.
 */

export const WORKFLOW_BASELINE_MIN_EXECUTIONS = Number(process.env.WORKFLOW_BASELINE_MIN_EXECUTIONS ?? 3);

/** Matches latency span in computeExecutionSignals (no cross-module import to avoid cycles). */
const latencyMsForOrdered = (ordered: FluencyEventRecord[]): number | null => {
  const toTime = (iso: string): number | null => {
    const t = Date.parse(iso);
    return Number.isNaN(t) ? null : t;
  };
  const times = ordered.map((e) => toTime(e.timestamp)).filter((t): t is number => t !== null);
  if (times.length >= 2) {
    return Math.max(0, times[times.length - 1]! - times[0]!);
  }
  if (times.length === 1) {
    return 0;
  }
  return null;
};

/** Keep aligned with `DEFAULT_PHASE2_THRESHOLDS` in `execution_signals.ts` (avoid circular import). */
const BASELINE_FALLBACK: Phase2Thresholds = {
  iteration_low: 1,
  iteration_high: 2,
  latency_high_ms: 10 * 60 * 1000
};

/** Linear interpolation on sorted samples; p in [0,1]. */
export const percentileLinear = (sorted: number[], p: number): number => {
  if (sorted.length === 0) {
    return 0;
  }
  if (sorted.length === 1) {
    return sorted[0]!;
  }
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) {
    return sorted[lo]!;
  }
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (idx - lo);
};

export const thresholdsFromExecutionSamples = (
  iterationDepths: number[],
  latencyMsValues: number[]
): Phase2Thresholds => {
  if (iterationDepths.length < WORKFLOW_BASELINE_MIN_EXECUTIONS) {
    return { ...BASELINE_FALLBACK };
  }
  const sortedI = [...iterationDepths].sort((a, b) => a - b);
  const iteration_low = Math.max(0, Math.floor(percentileLinear(sortedI, 0.5)));
  let iteration_high = Math.ceil(percentileLinear(sortedI, 0.75));
  iteration_high = Math.max(iteration_low + 1, iteration_high);

  let latency_high_ms = BASELINE_FALLBACK.latency_high_ms;
  if (latencyMsValues.length >= WORKFLOW_BASELINE_MIN_EXECUTIONS) {
    const sortedL = [...latencyMsValues].sort((a, b) => a - b);
    latency_high_ms = Math.max(60_000, Math.round(percentileLinear(sortedL, 0.75)));
  }

  return { iteration_low, iteration_high, latency_high_ms };
};

/**
 * Build per-workflow Phase 2 thresholds from executions in `windowedEvents`
 * (caller filters org + time window). Each workflow uses only its own executions (PRD §16.2).
 */
export const buildWorkflowPhase2ThresholdMap = (windowedEvents: FluencyEventRecord[]): Map<string, Phase2Thresholds> => {
  const byWorkflow = new Map<string, FluencyEventRecord[]>();
  for (const e of windowedEvents) {
    const w = e.workflow_id;
    const list = byWorkflow.get(w) ?? [];
    list.push(e);
    byWorkflow.set(w, list);
  }

  const map = new Map<string, Phase2Thresholds>();
  for (const [workflowId, wfEvents] of byWorkflow) {
    const iterationDepths: number[] = [];
    const latencyMsValues: number[] = [];
    const byExec = groupEventsByExecution(wfEvents);
    for (const [, group] of byExec) {
      const trace = reconstructTrace(group);
      if (!trace) {
        continue;
      }
      iterationDepths.push(trace.retry_sequences.length);
      const ordered = sortEventsByTimestamp(group);
      const lat = latencyMsForOrdered(ordered);
      if (lat !== null) {
        latencyMsValues.push(lat);
      }
    }
    map.set(
      workflowId,
      iterationDepths.length === 0 ? { ...BASELINE_FALLBACK } : thresholdsFromExecutionSamples(iterationDepths, latencyMsValues)
    );
  }
  return map;
};
