import {
  DEFAULT_INACTIVITY_TIMEOUT_MS,
  initialExecutionSnapshot,
  isTerminalState,
  reduceExecutionState,
  shouldMarkAbandoned,
  type ExecutionStateSnapshot
} from "../../src/domain/execution-state-machine";

describe("reduceExecutionState", () => {
  it("transitions INIT → ACTIVE on first valid event", () => {
    let s = initialExecutionSnapshot();
    s = reduceExecutionState(s, { nowMs: 1000, receivedValidEvent: true });
    expect(s.state).toBe("ACTIVE");
    expect(s.firstEventAtMs).toBe(1000);
    expect(s.lastTransitionReason).toBe("init_to_active");
  });

  it("transitions ACTIVE → RETRY after error/rejection then retry signal", () => {
    let s: ExecutionStateSnapshot = {
      state: "ACTIVE",
      firstEventAtMs: 1000,
      lastActivityAtMs: 2000,
      sawErrorOrRejection: false,
      lastTransitionReason: "init_to_active"
    };
    s = reduceExecutionState(s, { nowMs: 3000, errorOrRejectionObserved: true });
    expect(s.sawErrorOrRejection).toBe(true);
    s = reduceExecutionState(s, { nowMs: 4000, retrySignal: true });
    expect(s.state).toBe("RETRY");
    expect(s.lastTransitionReason).toBe("active_to_retry");
  });

  it("transitions RETRY → ACTIVE on retry resolved", () => {
    let s: ExecutionStateSnapshot = {
      state: "RETRY",
      firstEventAtMs: 1000,
      lastActivityAtMs: 5000,
      sawErrorOrRejection: false,
      lastTransitionReason: "active_to_retry"
    };
    s = reduceExecutionState(s, { nowMs: 5500, retryResolved: true });
    expect(s.state).toBe("ACTIVE");
    expect(s.lastTransitionReason).toBe("retry_to_active");
  });

  it("transitions RETRY → COMPLETED on terminal success", () => {
    let s: ExecutionStateSnapshot = {
      state: "RETRY",
      firstEventAtMs: 1000,
      lastActivityAtMs: 5000,
      sawErrorOrRejection: false,
      lastTransitionReason: "active_to_retry"
    };
    s = reduceExecutionState(s, { nowMs: 6000, terminalSuccess: true });
    expect(s.state).toBe("COMPLETED");
  });

  it("transitions ACTIVE → ERRORED on terminal error", () => {
    let s: ExecutionStateSnapshot = {
      state: "ACTIVE",
      firstEventAtMs: 1000,
      lastActivityAtMs: 2000,
      sawErrorOrRejection: false,
      lastTransitionReason: "init_to_active"
    };
    s = reduceExecutionState(s, { nowMs: 3000, terminalError: true });
    expect(s.state).toBe("ERRORED");
  });

  it("marks ABANDONED when inactivity evaluated and timeout exceeded", () => {
    let s: ExecutionStateSnapshot = {
      state: "ACTIVE",
      firstEventAtMs: 0,
      lastActivityAtMs: 0,
      sawErrorOrRejection: false,
      lastTransitionReason: "init_to_active"
    };
    const now = DEFAULT_INACTIVITY_TIMEOUT_MS + 1;
    s = reduceExecutionState(s, {
      nowMs: now,
      evaluateInactivity: true,
      inactivityTimeoutMs: DEFAULT_INACTIVITY_TIMEOUT_MS
    });
    expect(s.state).toBe("ABANDONED");
    expect(s.lastTransitionReason).toBe("inactivity_timeout");
  });

  it("keeps terminal state immutable", () => {
    const s: ExecutionStateSnapshot = {
      state: "COMPLETED",
      firstEventAtMs: 1,
      lastActivityAtMs: 2,
      sawErrorOrRejection: false,
      lastTransitionReason: "completed"
    };
    const next = reduceExecutionState(s, {
      nowMs: 999,
      terminalError: true,
      receivedValidEvent: true
    });
    expect(next.state).toBe("COMPLETED");
    expect(next.lastTransitionReason).toBe("terminal_immutable");
  });
});

describe("isTerminalState / shouldMarkAbandoned", () => {
  it("identifies terminal states", () => {
    expect(isTerminalState("COMPLETED")).toBe(true);
    expect(isTerminalState("ACTIVE")).toBe(false);
    expect(isTerminalState("PAUSED")).toBe(false);
  });

  it("shouldMarkAbandoned is false without last activity", () => {
    const s = initialExecutionSnapshot();
    expect(shouldMarkAbandoned(s, 1_000_000, DEFAULT_INACTIVITY_TIMEOUT_MS)).toBe(false);
  });

  it("shouldMarkAbandoned true when elapsed beyond timeout", () => {
    const s: ExecutionStateSnapshot = {
      state: "ACTIVE",
      firstEventAtMs: 0,
      lastActivityAtMs: 0,
      sawErrorOrRejection: false,
      lastTransitionReason: "x"
    };
    expect(
      shouldMarkAbandoned(s, DEFAULT_INACTIVITY_TIMEOUT_MS + 1, DEFAULT_INACTIVITY_TIMEOUT_MS)
    ).toBe(true);
  });
});
