/**
 * Constructs execution-level derived inputs from canonical events (single execution, deterministic).
 */

import type { CanonicalEvent } from "../domain/canonical-event.schema";
import {
  initialExecutionSnapshot,
  reduceExecutionState,
  type ExecutionStateSnapshot
} from "../domain/execution-state-machine";
import { canonicalExecutionKey } from "../integration/v1-pipeline-types";
import {
  reconstructExecutionTrace,
  stableEventId,
  type RetrySequence,
  type TraceSegment
} from "./trace-reconstruction.service";

export interface ExecutionBuildInput {
  readonly events: ReadonlyArray<CanonicalEvent>;
  /** Must equal `canonicalExecutionKey` for every event in the batch */
  readonly execution_id: string;
  readonly trace_gap_threshold_ms?: number;
}

export interface ExecutionBuildResult {
  readonly execution_id: string;
  readonly org_id: string;
  readonly workflow_id: string;
  readonly ordered_events: ReadonlyArray<CanonicalEvent>;
  readonly traces: ReadonlyArray<TraceSegment>;
  readonly retry_sequences: ReadonlyArray<RetrySequence>;
  readonly start_event_present: boolean;
  readonly terminal_or_abandonment_present: boolean;
  readonly valid_timestamp_ratio: number;
  readonly ordering_reconstructable: boolean;
  readonly trace_count: number;
  readonly retry_sequences_linkable: boolean;
  readonly error_occurred: boolean;
  readonly error_event_present: boolean;
  readonly execution_boundary_present: boolean;
  readonly retry_visibility_present: boolean;
  readonly step_logs_present: boolean;
  readonly error_visibility_present: boolean;
  /** Folded state for signal detectors (structural transitions only). */
  readonly execution_state_snapshot: ExecutionStateSnapshot;
}

function parseTs(iso: string): number | null {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

function isStructuralTerminal(event: CanonicalEvent): boolean {
  if (event.event_name === "ai_output_disposition") {
    const d = event.context.disposition;
    return d === "accepted" || d === "edited" || d === "rejected" || d === "abandoned";
  }
  if (event.event_name === "execution_terminal" || event.event_name === "workflow_terminal") {
    return true;
  }
  if (event.context.terminal === true || event.metadata?.terminal === true) {
    return true;
  }
  return false;
}

function isStructuralStartEvent(event: CanonicalEvent): boolean {
  if (event.event_name === "execution_start" || event.event_name === "workflow_start") {
    return true;
  }
  if (event.context.structural_start === true || event.metadata?.structural_start === true) {
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

function isExplicitErrorEvent(event: CanonicalEvent): boolean {
  if (event.event_name === "execution_error") {
    return true;
  }
  if (event.context.error_signal === true) {
    return true;
  }
  return false;
}

function validTimestampRatio(events: ReadonlyArray<CanonicalEvent>): number {
  if (events.length === 0) {
    return 0;
  }
  let ok = 0;
  for (const e of events) {
    if (parseTs(e.timestamp) !== null) {
      ok += 1;
    }
  }
  return ok / events.length;
}

function retrySequencesLinkable(
  ordered: ReadonlyArray<CanonicalEvent>,
  retries: ReadonlyArray<RetrySequence>
): boolean {
  if (retries.length === 0) {
    return true;
  }
  const ids = new Set<string>();
  for (let i = 0; i < ordered.length; i += 1) {
    ids.add(stableEventId(ordered[i]!, i));
  }
  for (const r of retries) {
    const t = r.trigger_event_id;
    const u = r.resumed_event_id;
    if (typeof t !== "string" || t.length === 0 || typeof u !== "string" || u.length === 0) {
      return false;
    }
    if (!ids.has(t) || !ids.has(u)) {
      return false;
    }
  }
  return true;
}

function stepLogsPresent(ordered: ReadonlyArray<CanonicalEvent>): boolean {
  return ordered.some(
    (e) =>
      e.event_name === "step" ||
      e.event_name === "tool_invocation" ||
      typeof e.context.step_index === "number" ||
      typeof e.metadata?.step_index === "number"
  );
}

function retryVisibilityPresent(
  ordered: ReadonlyArray<CanonicalEvent>,
  retries: ReadonlyArray<RetrySequence>
): boolean {
  if (retries.length > 0) {
    return true;
  }
  return ordered.some(
    (e) => e.context.retry_visibility === true || e.metadata?.retry_visibility === true
  );
}

function deriveExecutionStateSnapshot(ordered: ReadonlyArray<CanonicalEvent>): ExecutionStateSnapshot {
  let snap = initialExecutionSnapshot();
  if (ordered.length === 0) {
    return snap;
  }
  for (let i = 0; i < ordered.length; i += 1) {
    const e = ordered[i]!;
    const ts = parseTs(e.timestamp);
    const nowMs = ts ?? 0;
    const d = e.context.disposition;
    const terminalSuccess =
      (e.event_name === "ai_output_disposition" && d === "accepted") ||
      (e.event_name === "execution_terminal" && e.context.success === true);
    const terminalError =
      e.event_name === "execution_error" ||
      (e.event_name === "execution_terminal" && e.context.success === false);
    const errorOrRejection =
      (e.event_name === "ai_output_disposition" && (d === "rejected" || d === "abandoned")) ||
      e.event_name === "execution_error" ||
      e.context.error_signal === true;
    const prev = i > 0 ? ordered[i - 1]! : null;
    const prevWasFailure =
      prev !== null &&
      ((prev.event_name === "ai_output_disposition" &&
        (prev.context.disposition === "rejected" || prev.context.disposition === "abandoned")) ||
        prev.event_name === "execution_error" ||
        prev.context.error_signal === true);
    const retrySignal = prevWasFailure && !errorOrRejection;
    const retryResolved =
      snap.state === "RETRY" &&
      ((e.event_name === "ai_output_disposition" && (d === "accepted" || d === "edited")) ||
        (e.event_name === "execution_terminal" && e.context.success === true));

    snap = reduceExecutionState(snap, {
      nowMs,
      receivedValidEvent: true,
      errorOrRejectionObserved: errorOrRejection,
      terminalSuccess,
      terminalError,
      retrySignal,
      retryResolved,
      evaluateInactivity: false
    });
  }
  return snap;
}

function homogeneousOrgWorkflow(events: ReadonlyArray<CanonicalEvent>): { org_id: string; workflow_id: string } | null {
  if (events.length === 0) {
    return null;
  }
  const org = events[0]!.org_id;
  const wf = events[0]!.workflow_id;
  for (const e of events) {
    if (e.org_id !== org || e.workflow_id !== wf) {
      return null;
    }
  }
  return { org_id: org, workflow_id: wf };
}

/**
 * Fail-closed: returns `null` when execution keys diverge, ordering fails, or trace reconstruction fails.
 */
export function buildExecutionFromEvents(input: ExecutionBuildInput): ExecutionBuildResult | null {
  const { events, execution_id } = input;
  if (events.length === 0) {
    return null;
  }
  const hom = homogeneousOrgWorkflow(events);
  if (hom === null) {
    return null;
  }
  const keys = new Set<string>();
  for (const e of events) {
    keys.add(canonicalExecutionKey(e));
  }
  if (keys.size !== 1 || !keys.has(execution_id)) {
    return null;
  }

  const recon = reconstructExecutionTrace({
    events,
    execution_id,
    trace_gap_threshold_ms: input.trace_gap_threshold_ms
  });
  const ordering_reconstructable = recon.success;
  if (!recon.success || recon.ordered_events.length === 0) {
    return null;
  }

  const ordered = recon.ordered_events;
  const valid_timestamp_ratio = validTimestampRatio(events);
  const start_event_present = ordered.some(isStructuralStartEvent);
  const terminal_or_abandonment_present = ordered.some(isStructuralTerminal);
  const execution_boundary_present = start_event_present && terminal_or_abandonment_present;
  const error_occurred = ordered.some(isStructuralFailureTrigger);
  const error_event_present = ordered.some(isExplicitErrorEvent);
  const trace_count = recon.traces.length;
  const retry_sequences_linkable = retrySequencesLinkable(ordered, recon.retry_sequences);
  const retry_visibility_present = retryVisibilityPresent(ordered, recon.retry_sequences);
  const step_logs_present = stepLogsPresent(ordered);
  const error_visibility_present =
    error_event_present ||
    ordered.some(
      (e) =>
        e.event_name === "execution_error" ||
        e.context.error_channel_visible === true ||
        e.metadata?.error_channel_visible === true
    );

  const execution_state_snapshot = deriveExecutionStateSnapshot(ordered);

  return {
    execution_id,
    org_id: hom.org_id,
    workflow_id: hom.workflow_id,
    ordered_events: ordered,
    traces: recon.traces,
    retry_sequences: recon.retry_sequences,
    start_event_present,
    terminal_or_abandonment_present,
    valid_timestamp_ratio,
    ordering_reconstructable,
    trace_count,
    retry_sequences_linkable,
    error_occurred,
    error_event_present,
    execution_boundary_present,
    retry_visibility_present,
    step_logs_present,
    error_visibility_present,
    execution_state_snapshot
  };
}
