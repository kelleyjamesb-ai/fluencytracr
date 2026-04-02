/**
 * Deterministic trace reconstruction for canonical events (single execution).
 */

import type { CanonicalEvent } from "../domain/canonical-event.schema";

export const DEFAULT_TRACE_GAP_THRESHOLD_MS = 30 * 60 * 1000;
export const RETRY_SEQUENCE_WINDOW_MS = 15 * 60 * 1000;

export interface TraceReconstructionInput {
  readonly events: ReadonlyArray<CanonicalEvent>;
  /** Used when an event omits `execution_id` */
  readonly execution_id: string;
  readonly trace_gap_threshold_ms?: number;
}

export interface TraceSegment {
  readonly trace_id: string;
  readonly execution_id: string;
  readonly events: ReadonlyArray<CanonicalEvent>;
  readonly started_at: string;
  readonly ended_at: string;
}

export interface RetrySequence {
  readonly retry_id: string;
  readonly trigger_event_id?: string;
  readonly resumed_event_id?: string;
  readonly event_indexes: ReadonlyArray<number>;
}

export type TraceReconstructionFailureReason =
  | "EMPTY_INPUT"
  | "MULTIPLE_EXECUTIONS"
  | "UNORDERABLE_EVENTS";

export interface TraceReconstructionResult {
  readonly success: boolean;
  readonly execution_id: string;
  readonly ordered_events: ReadonlyArray<CanonicalEvent>;
  readonly traces: ReadonlyArray<TraceSegment>;
  readonly retry_sequences: ReadonlyArray<RetrySequence>;
  readonly failed_reason?: TraceReconstructionFailureReason;
}

/** Stable id for correlation (metadata/context `event_id`, else synthetic index). */
export function stableEventId(event: CanonicalEvent, originalIndex: number): string {
  const m = event.metadata?.event_id;
  if (typeof m === "string" && m.length > 0) {
    return m;
  }
  const c = event.context.event_id;
  if (typeof c === "string" && c.length > 0) {
    return c;
  }
  return `synthetic:${originalIndex}`;
}

function executionKey(event: CanonicalEvent, fallback: string): string {
  if (typeof event.execution_id === "string" && event.execution_id.length > 0) {
    return event.execution_id;
  }
  return fallback;
}

function readSecondarySequence(event: CanonicalEvent): number {
  const seq = event.context.sequence ?? event.metadata?.sequence;
  if (typeof seq === "number" && Number.isFinite(seq)) {
    return seq;
  }
  if (typeof seq === "string" && seq.length > 0) {
    const n = Number(seq);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function readTraceId(event: CanonicalEvent): string | null {
  const t = event.metadata?.trace_id ?? event.context.trace_id;
  if (typeof t === "string" && t.length > 0) {
    return t;
  }
  return null;
}

function parseTs(iso: string): number | null {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

/**
 * Total order: timestamp ASC, secondary sequence ASC, original index ASC.
 */
export function orderExecutionEvents(
  events: ReadonlyArray<CanonicalEvent>
): ReadonlyArray<CanonicalEvent> | null {
  if (events.length === 0) {
    return [];
  }
  const rows: Array<{
    event: CanonicalEvent;
    originalIndex: number;
    t: number;
    sec: number;
  }> = [];
  for (let i = 0; i < events.length; i += 1) {
    const event = events[i]!;
    const t = parseTs(event.timestamp);
    if (t === null) {
      return null;
    }
    rows.push({
      event,
      originalIndex: i,
      t,
      sec: readSecondarySequence(event)
    });
  }
  rows.sort((a, b) => {
    if (a.t !== b.t) {
      return a.t - b.t;
    }
    if (a.sec !== b.sec) {
      return a.sec - b.sec;
    }
    return a.originalIndex - b.originalIndex;
  });
  return rows.map((r) => r.event);
}

function isStructuralTerminal(event: CanonicalEvent): boolean {
  if (event.event_name === "ai_output_disposition") {
    const d = event.context.disposition;
    return (
      d === "accepted" ||
      d === "edited" ||
      d === "rejected" ||
      d === "abandoned"
    );
  }
  if (event.event_name === "execution_terminal" || event.event_name === "workflow_terminal") {
    return true;
  }
  if (event.context.terminal === true || event.metadata?.terminal === true) {
    return true;
  }
  return false;
}

function isStructuralFailureTrigger(event: CanonicalEvent): boolean {
  if (event.event_name === "ai_output_disposition") {
    const d = event.context.disposition;
    return d === "rejected" || d === "abandoned";
  }
  if (event.event_name === "execution_error" || event.context.error_signal === true) {
    return true;
  }
  return false;
}

function isResumedActivityAfterTerminal(prevTerminal: boolean, event: CanonicalEvent): boolean {
  if (!prevTerminal) {
    return false;
  }
  return (
    event.context.resumed_after_terminal === true ||
    event.metadata?.resumed_after_terminal === true
  );
}

/**
 * Segment ordered events: trace_id change, terminal→resumed boundary, or long gap.
 */
export function segmentTraces(
  events: ReadonlyArray<CanonicalEvent>,
  execution_id: string,
  traceGapThresholdMs: number = DEFAULT_TRACE_GAP_THRESHOLD_MS
): ReadonlyArray<TraceSegment> {
  if (events.length === 0) {
    return [];
  }

  const segments: TraceSegment[] = [];
  let current: CanonicalEvent[] = [];
  let currentTraceLabel = "trace_0";
  let segmentIndex = 0;
  let prevTs: number | null = null;
  let sawTerminalInCurrent = false;

  const flush = () => {
    if (current.length === 0) {
      return;
    }
    const started_at = current[0]!.timestamp;
    const ended_at = current[current.length - 1]!.timestamp;
    segments.push({
      trace_id: currentTraceLabel,
      execution_id,
      events: Object.freeze([...current]),
      started_at,
      ended_at
    });
    current = [];
    segmentIndex += 1;
    currentTraceLabel = `trace_${segmentIndex}`;
    sawTerminalInCurrent = false;
  };

  for (let i = 0; i < events.length; i += 1) {
    const e = events[i]!;
    const t = parseTs(e.timestamp);
    const tid = readTraceId(e);

    if (current.length > 0) {
      const gap =
        prevTs !== null && t !== null ? t - prevTs : 0;
      const prev = current[current.length - 1]!;
      const prevTid = readTraceId(prev);
      if (tid !== null && prevTid !== null && tid !== prevTid) {
        flush();
      } else if (gap > traceGapThresholdMs) {
        flush();
      } else if (sawTerminalInCurrent && isResumedActivityAfterTerminal(sawTerminalInCurrent, e)) {
        flush();
      }
    }

    if (current.length === 0) {
      const labelTid = readTraceId(e);
      currentTraceLabel = labelTid ?? `trace_${segmentIndex}`;
    }

    current.push(e);
    if (isStructuralTerminal(e)) {
      sawTerminalInCurrent = true;
    }
    prevTs = t;
  }
  flush();
  return Object.freeze(segments);
}

/**
 * Failure-like event followed by a later event within `RETRY_SEQUENCE_WINDOW_MS`.
 */
export function detectRetrySequences(
  events: ReadonlyArray<CanonicalEvent>
): ReadonlyArray<RetrySequence> {
  const out: RetrySequence[] = [];
  for (let i = 0; i < events.length; i += 1) {
    if (!isStructuralFailureTrigger(events[i]!)) {
      continue;
    }
    const t0 = parseTs(events[i]!.timestamp);
    if (t0 === null) {
      continue;
    }
    const triggerId = stableEventId(events[i]!, i);
    for (let j = i + 1; j < events.length; j += 1) {
      const t1 = parseTs(events[j]!.timestamp);
      if (t1 === null || t1 <= t0) {
        continue;
      }
      if (t1 - t0 > RETRY_SEQUENCE_WINDOW_MS) {
        break;
      }
      out.push({
        retry_id: `retry_${triggerId}_${stableEventId(events[j]!, j)}`,
        trigger_event_id: triggerId,
        resumed_event_id: stableEventId(events[j]!, j),
        event_indexes: Object.freeze([i, j])
      });
      break;
    }
  }
  return Object.freeze(out);
}

export function reconstructExecutionTrace(
  input: TraceReconstructionInput
): TraceReconstructionResult {
  const { events, execution_id } = input;
  const gapMs = input.trace_gap_threshold_ms ?? DEFAULT_TRACE_GAP_THRESHOLD_MS;

  if (events.length === 0) {
    return {
      success: false,
      execution_id,
      ordered_events: Object.freeze([]),
      traces: Object.freeze([]),
      retry_sequences: Object.freeze([]),
      failed_reason: "EMPTY_INPUT"
    };
  }

  const keys = new Set<string>();
  for (const e of events) {
    keys.add(executionKey(e, execution_id));
  }
  if (keys.size > 1) {
    return {
      success: false,
      execution_id,
      ordered_events: Object.freeze([]),
      traces: Object.freeze([]),
      retry_sequences: Object.freeze([]),
      failed_reason: "MULTIPLE_EXECUTIONS"
    };
  }

  const ordered = orderExecutionEvents(events);
  if (ordered === null) {
    return {
      success: false,
      execution_id,
      ordered_events: Object.freeze([]),
      traces: Object.freeze([]),
      retry_sequences: Object.freeze([]),
      failed_reason: "UNORDERABLE_EVENTS"
    };
  }

  const traces = segmentTraces(ordered, execution_id, gapMs);
  const retry_sequences = detectRetrySequences(ordered);

  return {
    success: true,
    execution_id,
    ordered_events: Object.freeze([...ordered]),
    traces: Object.freeze([...traces]),
    retry_sequences: Object.freeze([...retry_sequences])
  };
}
