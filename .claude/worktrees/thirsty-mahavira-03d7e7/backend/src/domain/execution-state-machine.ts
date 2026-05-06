/**
 * Deterministic execution lifecycle reducer — explicit transitions, terminal immutability, inactivity abandonment.
 */

export type ExecutionState =
  | "INIT"
  | "ACTIVE"
  | "RETRY"
  | "PAUSED"
  | "COMPLETED"
  | "ERRORED"
  | "ABANDONED"
  | "CANCELLED";

export interface ExecutionStateSnapshot {
  readonly state: ExecutionState;
  readonly firstEventAtMs: number | null;
  readonly lastActivityAtMs: number | null;
  /** True after a structural error/rejection that may precede a retry transition */
  readonly sawErrorOrRejection: boolean;
  readonly lastTransitionReason: string;
}

export interface ExecutionStateTransitionInput {
  readonly nowMs: number;
  /** If true, non-terminal snapshots may transition to ABANDONED when inactivity threshold exceeded */
  readonly evaluateInactivity?: boolean;
  readonly inactivityTimeoutMs?: number;
  readonly receivedValidEvent?: boolean;
  readonly errorOrRejectionObserved?: boolean;
  readonly retrySignal?: boolean;
  /** Progress after retry (RETRY → ACTIVE) */
  readonly retryResolved?: boolean;
  readonly terminalSuccess?: boolean;
  readonly terminalError?: boolean;
  readonly cancelSignal?: boolean;
  readonly pauseSignal?: boolean;
  readonly resumeSignal?: boolean;
}

export const DEFAULT_INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
export const DEFAULT_MAX_EXECUTION_WINDOW_MS = 24 * 60 * 60 * 1000;

export function initialExecutionSnapshot(): ExecutionStateSnapshot {
  return {
    state: "INIT",
    firstEventAtMs: null,
    lastActivityAtMs: null,
    sawErrorOrRejection: false,
    lastTransitionReason: "init"
  };
}

export function isTerminalState(state: ExecutionState): boolean {
  return (
    state === "COMPLETED" ||
    state === "ERRORED" ||
    state === "ABANDONED" ||
    state === "CANCELLED"
  );
}

export function shouldMarkAbandoned(
  snapshot: ExecutionStateSnapshot,
  nowMs: number,
  inactivityTimeoutMs: number = DEFAULT_INACTIVITY_TIMEOUT_MS
): boolean {
  if (isTerminalState(snapshot.state)) {
    return false;
  }
  if (snapshot.lastActivityAtMs === null) {
    return false;
  }
  return nowMs - snapshot.lastActivityAtMs > inactivityTimeoutMs;
}

function withReason(
  snap: ExecutionStateSnapshot,
  patch: Partial<ExecutionStateSnapshot>,
  reason: string
): ExecutionStateSnapshot {
  return { ...snap, ...patch, lastTransitionReason: reason };
}

/**
 * Single-step reducer. Invalid combinations are fail-closed (state unchanged, explicit reason).
 */
export function reduceExecutionState(
  current: ExecutionStateSnapshot,
  input: ExecutionStateTransitionInput
): ExecutionStateSnapshot {
  if (isTerminalState(current.state)) {
    return withReason(current, {}, "terminal_immutable");
  }

  const timeoutMs = input.inactivityTimeoutMs ?? DEFAULT_INACTIVITY_TIMEOUT_MS;
  if (
    input.evaluateInactivity === true &&
    shouldMarkAbandoned(current, input.nowMs, timeoutMs)
  ) {
    return {
      ...current,
      state: "ABANDONED",
      lastActivityAtMs: input.nowMs,
      lastTransitionReason: "inactivity_timeout"
    };
  }

  if (current.state === "PAUSED") {
    if (input.resumeSignal === true) {
      return withReason(
        current,
        { state: "ACTIVE", lastActivityAtMs: input.nowMs },
        "resumed_from_paused"
      );
    }
    return withReason(current, {}, "paused_no_op");
  }

  if (current.state === "INIT") {
    if (input.receivedValidEvent === true) {
      return {
        state: "ACTIVE",
        firstEventAtMs: input.nowMs,
        lastActivityAtMs: input.nowMs,
        sawErrorOrRejection: false,
        lastTransitionReason: "init_to_active"
      };
    }
    return withReason(current, {}, "init_no_op");
  }

  if (current.state === "ACTIVE" || current.state === "RETRY") {
    if (input.pauseSignal === true) {
      return withReason(
        current,
        { state: "PAUSED", lastActivityAtMs: input.nowMs },
        "paused"
      );
    }
    if (input.cancelSignal === true) {
      return {
        ...current,
        state: "CANCELLED",
        lastActivityAtMs: input.nowMs,
        lastTransitionReason: "cancelled"
      };
    }
    if (input.terminalError === true) {
      return {
        ...current,
        state: "ERRORED",
        lastActivityAtMs: input.nowMs,
        sawErrorOrRejection: false,
        lastTransitionReason: "terminal_error"
      };
    }
    if (input.terminalSuccess === true) {
      return {
        ...current,
        state: "COMPLETED",
        lastActivityAtMs: input.nowMs,
        sawErrorOrRejection: false,
        lastTransitionReason: "completed"
      };
    }
    if (input.errorOrRejectionObserved === true) {
      return withReason(
        current,
        { sawErrorOrRejection: true, lastActivityAtMs: input.nowMs },
        "error_or_rejection_marked"
      );
    }
    if (current.state === "RETRY" && input.retryResolved === true) {
      return withReason(
        current,
        { state: "ACTIVE", lastActivityAtMs: input.nowMs, sawErrorOrRejection: false },
        "retry_to_active"
      );
    }
    if (current.state === "ACTIVE" && input.retrySignal === true && current.sawErrorOrRejection) {
      return withReason(
        current,
        { state: "RETRY", lastActivityAtMs: input.nowMs, sawErrorOrRejection: false },
        "active_to_retry"
      );
    }
    if (input.retrySignal === true && !current.sawErrorOrRejection) {
      return withReason(current, { lastActivityAtMs: input.nowMs }, "retry_signal_ignored_no_prior_error");
    }
    if (input.receivedValidEvent === true) {
      return withReason(current, { lastActivityAtMs: input.nowMs }, "activity_updated");
    }
    return withReason(current, {}, "active_retry_no_op");
  }

  return withReason(current, {}, "unexpected_state_no_op");
}
