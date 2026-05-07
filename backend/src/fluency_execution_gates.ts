import type { ExecutionLifecycle, ExecutionLifecycleState } from "./execution_lifecycle";
import { evaluateFsc, type FscEvaluationResult } from "./services/fsc-evaluator";
import { evaluateMinimumSignalGate, type MinimumSignalGateResult } from "./services/minimum-signal-gate";
import type { FluencyEventRecord } from "./store";
import type { ReconstructedTrace } from "./trace_engine";
import { sortEventsByTimestamp } from "./trace_engine";

const TERMINAL_STATES: ReadonlySet<ExecutionLifecycleState> = new Set([
  "COMPLETED",
  "ERRORED",
  "ABANDONED",
  "CANCELLED"
]);

export type FluencyGateSnapshot = {
  readonly fsc: FscEvaluationResult;
  readonly minimum_signal: MinimumSignalGateResult;
};

/** Serialized on traces for disclosure and API consumers. */
export type TraceGateSummary = {
  readonly fsc_eligible: boolean;
  readonly fsc_failed_checks: readonly string[];
  readonly min_signal_allowed: boolean;
  readonly min_signal_failed_checks: readonly string[];
};

export const FLUENCY_GATES_ALL_PASS: TraceGateSummary = {
  fsc_eligible: true,
  fsc_failed_checks: [],
  min_signal_allowed: true,
  min_signal_failed_checks: []
};

export const toTraceGateSummary = (g: FluencyGateSnapshot): TraceGateSummary => ({
  fsc_eligible: g.fsc.eligible,
  fsc_failed_checks: g.fsc.failed_checks,
  min_signal_allowed: g.minimum_signal.allowed,
  min_signal_failed_checks: g.minimum_signal.failed_checks
});

const parseTs = (iso: string): number | null => {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
};

const fluencyStartEventPresent = (ordered: FluencyEventRecord[]): boolean => ordered.length > 0;

const fluencyTerminalPresent = (lifecycle: ExecutionLifecycle): boolean =>
  TERMINAL_STATES.has(lifecycle.state);

const validTimestampRatio = (ordered: FluencyEventRecord[]): number => {
  if (ordered.length === 0) {
    return 0;
  }
  let ok = 0;
  for (const e of ordered) {
    if (parseTs(e.timestamp) !== null) {
      ok += 1;
    }
  }
  return ok / ordered.length;
};

/**
 * Ordered stream matches trace reconstruction (same sort + ids as `reconstructTrace`).
 */
const orderingReconstructable = (ordered: FluencyEventRecord[], trace: ReconstructedTrace): boolean => {
  if (ordered.length === 0) {
    return false;
  }
  const sorted = sortEventsByTimestamp(ordered);
  const ids = sorted.map((e) => e.event_id);
  if (ids.length !== trace.ordered_event_ids.length) {
    return false;
  }
  for (let i = 0; i < ids.length; i += 1) {
    if (ids[i] !== trace.ordered_event_ids[i]) {
      return false;
    }
  }
  return true;
};

const retrySequencesLinkable = (ordered: FluencyEventRecord[], trace: ReconstructedTrace): boolean => {
  if (trace.retry_sequences.length === 0) {
    return true;
  }
  const ids = new Set(ordered.map((e) => e.event_id));
  for (const r of trace.retry_sequences) {
    if (!ids.has(r.failure_event_id) || !ids.has(r.subsequent_event_id)) {
      return false;
    }
  }
  return true;
};

/** Broad failure / friction signals (includes recovery cycles). */
const fluencyFscErrorOccurred = (ordered: FluencyEventRecord[]): boolean =>
  ordered.some(
    (e) =>
      e.event_type === "ai_abandonment" ||
      (e.event_type === "ai_output_disposition" &&
        (e.disposition === "rejected" || e.disposition === "abandoned")) ||
      (e.event_type === "ai_recovery_loop" && e.cycles > 0)
  );

/** Explicit error / abandonment channel (recovery-only friction is not sufficient for FSC error visibility). */
const fluencyFscErrorEventPresent = (ordered: FluencyEventRecord[]): boolean =>
  ordered.some(
    (e) =>
      e.event_type === "ai_abandonment" ||
      (e.event_type === "ai_output_disposition" &&
        (e.disposition === "rejected" || e.disposition === "abandoned"))
  );

const executionBoundaryPresent = (ordered: FluencyEventRecord[], lifecycle: ExecutionLifecycle): boolean =>
  fluencyStartEventPresent(ordered) && fluencyTerminalPresent(lifecycle);

const retryVisibility = (ordered: FluencyEventRecord[], trace: ReconstructedTrace): boolean => {
  if (trace.retry_sequences.length > 0) {
    return true;
  }
  return ordered.some((e) => e.event_type === "ai_recovery_loop");
};

const stepLogsPresent = (trace: ReconstructedTrace): boolean =>
  trace.step_groups.some((g) => g.event_ids.length > 0);

/** Minimum-signal “error” channel: explicit failures, abandonment, or verification/governance events. */
const minSignalErrorOrVerificationVisibility = (ordered: FluencyEventRecord[]): boolean => {
  if (fluencyFscErrorOccurred(ordered)) {
    return true;
  }
  return ordered.some(
    (e) =>
      e.event_type === "verification_signal" ||
      (e.event_type === "ai_output_disposition" && e.verification_present)
  );
};

/**
 * PRD-aligned hard gates for the Fluency product path (maps to INCOMPLETE_EXECUTION / INSUFFICIENT_SIGNAL).
 */
export const evaluateFluencyExecutionGates = (
  ordered: FluencyEventRecord[],
  trace: ReconstructedTrace,
  lifecycle: ExecutionLifecycle
): FluencyGateSnapshot => {
  const fsc = evaluateFsc({
    start_event_present: fluencyStartEventPresent(ordered),
    terminal_or_abandonment_present: fluencyTerminalPresent(lifecycle),
    valid_timestamp_ratio: validTimestampRatio(ordered),
    ordering_reconstructable: orderingReconstructable(ordered, trace),
    trace_count: 1,
    retry_sequences_linkable: retrySequencesLinkable(ordered, trace),
    error_occurred: fluencyFscErrorOccurred(ordered),
    error_event_present: fluencyFscErrorEventPresent(ordered)
  });

  const minimum_signal = evaluateMinimumSignalGate({
    execution_boundary_present: executionBoundaryPresent(ordered, lifecycle),
    retry_visibility: retryVisibility(ordered, trace),
    step_logs_present: stepLogsPresent(trace),
    error_visibility: minSignalErrorOrVerificationVisibility(ordered)
  });

  return { fsc, minimum_signal };
};
