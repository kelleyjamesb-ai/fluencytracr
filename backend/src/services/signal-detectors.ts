/**
 * Structural signal detectors — canonical events only; no NLP or ML.
 */

import type { CanonicalEvent } from "../domain/canonical-event.schema";
import type { ExecutionStateSnapshot } from "../domain/execution-state-machine";
import type { SignalBucket } from "./pattern-classifier";
import type { RetrySequence } from "./trace-reconstruction.service";

export interface SignalDetectionInput {
  readonly ordered_events: ReadonlyArray<CanonicalEvent>;
  readonly retry_sequences: ReadonlyArray<RetrySequence>;
  readonly execution_state?: ExecutionStateSnapshot;
  /** Set by ingest/adapter when timeout inference yields abandonment (not guessed here). */
  readonly inactivity_abandonment?: boolean;
  /** When set, overrides heuristic iteration bucket */
  readonly iteration_bucket_from_calibration?: SignalBucket;
  /** When set, overrides heuristic latency bucket */
  readonly latency_bucket_from_calibration?: SignalBucket;
}

export interface IterationDetectionResult {
  readonly retry_count: number;
  readonly raw_iteration_count: number;
  readonly iteration_bucket: SignalBucket | "UNKNOWN";
}

export interface VerificationDetectionResult {
  readonly verification_present: boolean;
}

export interface RecoveryDetectionResult {
  readonly recovery_present: boolean;
}

export interface AbandonmentDetectionResult {
  readonly abandonment_present: boolean;
}

export interface LatencyDetectionResult {
  readonly total_execution_ms: number | null;
  readonly latency_bucket: SignalBucket | "UNKNOWN";
}

export type StructuralDisposition = "ACCEPT" | "EDIT" | "REJECT" | "ABANDON" | "UNKNOWN";

export interface DispositionDetectionResult {
  readonly disposition: StructuralDisposition;
}

/** Wire to `classifyBehaviorPattern`: map `UNKNOWN` iteration/latency buckets via calibration or suppress. */
export interface DetectedSignalProfile {
  readonly iteration: IterationDetectionResult;
  readonly verification: VerificationDetectionResult;
  readonly recovery: RecoveryDetectionResult;
  readonly abandonment: AbandonmentDetectionResult;
  readonly latency: LatencyDetectionResult;
  readonly disposition: DispositionDetectionResult;
}

function parseTs(iso: string): number | null {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

export function stableEventIdForSignals(e: CanonicalEvent, index: number): string {
  const m = e.metadata?.event_id;
  if (typeof m === "string" && m.length > 0) {
    return m;
  }
  const c = e.context.event_id;
  if (typeof c === "string" && c.length > 0) {
    return c;
  }
  return `synthetic:${index}`;
}

function hasStructuralVerificationFlag(event: CanonicalEvent): boolean {
  return (
    event.context.verification_present === true ||
    event.metadata?.verification_present === true ||
    event.context.structural_verification === true ||
    event.metadata?.structural_verification === true
  );
}

/** Retrieval/search-shaped names need an explicit verification flag; no name-only inference. */
function isRetrievalOrSearchEventName(name: string): boolean {
  const n = name.toLowerCase();
  if (n === "retrieval" || n === "search") {
    return true;
  }
  if (n.startsWith("retrieval_") || n.startsWith("search_")) {
    return true;
  }
  if (n.endsWith("_retrieval") || n.endsWith("_search")) {
    return true;
  }
  if (n.includes("_retrieval_") || n.includes("_search_")) {
    return true;
  }
  return false;
}

function isVerificationEvent(event: CanonicalEvent): boolean {
  if (event.event_name === "verification_signal") {
    return true;
  }
  if (event.event_name === "validation_tool_call" || event.event_name === "validation_check") {
    return true;
  }
  if (hasStructuralVerificationFlag(event)) {
    return true;
  }
  if (isRetrievalOrSearchEventName(event.event_name)) {
    return hasStructuralVerificationFlag(event);
  }
  return false;
}

/** Structural explicit error only — rejection disposition is not an error signal for recovery. */
export function isExplicitError(event: CanonicalEvent): boolean {
  if (event.event_name === "execution_error") {
    return true;
  }
  if (event.context.error_signal === true || event.metadata?.error_signal === true) {
    return true;
  }
  return false;
}

/**
 * Structural signals that can correlate with a retry window (rejection or explicit error).
 * Recovery still requires {@link isExplicitError} at the anchor index.
 */
export function isRetryTrigger(event: CanonicalEvent): boolean {
  if (isExplicitError(event)) {
    return true;
  }
  if (event.event_name === "ai_output_disposition" && event.context.disposition === "rejected") {
    return true;
  }
  return false;
}

function isContinuationOrSuccess(event: CanonicalEvent): boolean {
  if (event.event_name === "ai_output_disposition") {
    const d = event.context.disposition;
    return d === "accepted" || d === "edited";
  }
  if (event.event_name === "execution_terminal" && event.context.success === true) {
    return true;
  }
  return false;
}

function isTerminalSuccess(event: CanonicalEvent): boolean {
  if (event.event_name === "ai_output_disposition" && event.context.disposition === "accepted") {
    return true;
  }
  if (event.context.terminal === true && event.context.success === true) {
    return true;
  }
  return false;
}

export function detectIterationDepth(
  input: SignalDetectionInput
): IterationDetectionResult {
  const retry_count = input.retry_sequences.length;
  const raw_iteration_count = retry_count;
  if (input.iteration_bucket_from_calibration !== undefined) {
    return {
      retry_count,
      raw_iteration_count,
      iteration_bucket: input.iteration_bucket_from_calibration
    };
  }
  if (raw_iteration_count === 0) {
    return { retry_count, raw_iteration_count, iteration_bucket: "LOW" };
  }
  if (raw_iteration_count >= 2) {
    return { retry_count, raw_iteration_count, iteration_bucket: "HIGH" };
  }
  return { retry_count, raw_iteration_count, iteration_bucket: "NORMAL" };
}

export function detectVerificationPresence(
  input: SignalDetectionInput
): VerificationDetectionResult {
  const verification_present = input.ordered_events.some(isVerificationEvent);
  return { verification_present };
}

export function detectRecoveryPresence(
  input: SignalDetectionInput
): RecoveryDetectionResult {
  const ordered = input.ordered_events;
  for (let i = 0; i < ordered.length; i += 1) {
    if (!isExplicitError(ordered[i]!)) {
      continue;
    }
    const hasRetry = input.retry_sequences.some(
      (r) =>
        r.event_indexes[0] === i ||
        r.trigger_event_id === stableEventIdForSignals(ordered[i]!, i)
    );
    if (!hasRetry) {
      continue;
    }
    for (let j = i + 1; j < ordered.length; j += 1) {
      if (isContinuationOrSuccess(ordered[j]!) || isTerminalSuccess(ordered[j]!)) {
        return { recovery_present: true };
      }
    }
  }
  return { recovery_present: false };
}

export function detectAbandonment(
  input: SignalDetectionInput
): AbandonmentDetectionResult {
  if (input.inactivity_abandonment === true) {
    return { abandonment_present: true };
  }
  if (input.execution_state?.state === "ABANDONED") {
    return { abandonment_present: true };
  }
  if (input.ordered_events.some((e) => e.event_name === "ai_abandonment")) {
    return { abandonment_present: true };
  }
  if (
    input.ordered_events.some(
      (e) => e.event_name === "ai_output_disposition" && e.context.disposition === "abandoned"
    )
  ) {
    return { abandonment_present: true };
  }
  return { abandonment_present: false };
}

export function detectLatency(input: SignalDetectionInput): LatencyDetectionResult {
  if (input.latency_bucket_from_calibration !== undefined) {
    const span = spanMs(input.ordered_events);
    return {
      total_execution_ms: span,
      latency_bucket: input.latency_bucket_from_calibration
    };
  }
  const span = spanMs(input.ordered_events);
  if (span === null) {
    return { total_execution_ms: null, latency_bucket: "UNKNOWN" };
  }
  return {
    total_execution_ms: span,
    latency_bucket: "UNKNOWN"
  };
}

function spanMs(events: ReadonlyArray<CanonicalEvent>): number | null {
  if (events.length === 0) {
    return null;
  }
  const first = parseTs(events[0]!.timestamp);
  const last = parseTs(events[events.length - 1]!.timestamp);
  if (first === null || last === null || last < first) {
    return null;
  }
  return last - first;
}

export function detectDisposition(
  input: SignalDetectionInput
): DispositionDetectionResult {
  if (input.execution_state?.state === "ABANDONED") {
    return { disposition: "ABANDON" };
  }
  const dispEvents = input.ordered_events.filter((e) => e.event_name === "ai_output_disposition");
  if (dispEvents.length === 0) {
    return { disposition: "UNKNOWN" };
  }
  const last = dispEvents[dispEvents.length - 1]!;
  const d = last.context.disposition;
  if (d === "abandoned") {
    return { disposition: "ABANDON" };
  }
  if (d === "rejected") {
    return { disposition: "REJECT" };
  }
  if (d === "edited") {
    return { disposition: "EDIT" };
  }
  if (d === "accepted") {
    const hadRefinement = input.ordered_events.some(
      (e) =>
        e.event_name === "ai_output_disposition" &&
        (e.context.disposition === "edited" || e.context.disposition === "rejected")
    );
    if (hadRefinement) {
      return { disposition: "EDIT" };
    }
    const hadRetry = input.retry_sequences.length > 0;
    if (hadRetry) {
      return { disposition: "REJECT" };
    }
    return { disposition: "ACCEPT" };
  }
  return { disposition: "UNKNOWN" };
}

export function detectSignals(input: SignalDetectionInput): DetectedSignalProfile {
  return Object.freeze({
    iteration: detectIterationDepth(input),
    verification: detectVerificationPresence(input),
    recovery: detectRecoveryPresence(input),
    abandonment: detectAbandonment(input),
    latency: detectLatency(input),
    disposition: detectDisposition(input)
  });
}
