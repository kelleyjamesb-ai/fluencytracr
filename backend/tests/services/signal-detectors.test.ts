import type { CanonicalEvent } from "../../src/domain/canonical-event.schema";
import type { ExecutionStateSnapshot } from "../../src/domain/execution-state-machine";
import {
  detectAbandonment,
  detectDisposition,
  detectIterationDepth,
  detectLatency,
  detectRecoveryPresence,
  detectSignals,
  detectVerificationPresence,
  isExplicitError,
  isRetryTrigger,
  type SignalDetectionInput
} from "../../src/services/signal-detectors";
import type { RetrySequence } from "../../src/services/trace-reconstruction.service";

const ev = (
  partial: Partial<CanonicalEvent> & { context?: Record<string, unknown>; metadata?: Record<string, unknown> }
): CanonicalEvent => ({
  event_name: "step",
  event_version: "1",
  org_id: "o1",
  workflow_id: "w1",
  timestamp: "2026-01-01T12:00:00.000Z",
  actor_type: "ai",
  context: {},
  execution_id: "ex1",
  ...partial,
  context: { ...partial.context },
  ...(partial.metadata ? { metadata: { ...partial.metadata } } : {})
});

const rs = (indexes: [number, number], trigger?: string, resumed?: string): RetrySequence => ({
  retry_id: `r_${indexes[0]}_${indexes[1]}`,
  trigger_event_id: trigger,
  resumed_event_id: resumed,
  event_indexes: Object.freeze(indexes)
});

describe("detectIterationDepth", () => {
  it("uses retry sequence count", () => {
    const input: SignalDetectionInput = {
      ordered_events: [],
      retry_sequences: [rs([0, 1]), rs([2, 3])]
    };
    const r = detectIterationDepth(input);
    expect(r.retry_count).toBe(2);
    expect(r.raw_iteration_count).toBe(2);
    expect(r.iteration_bucket).toBe("HIGH");
  });

  it("uses calibration when provided", () => {
    const input: SignalDetectionInput = {
      ordered_events: [],
      retry_sequences: [rs([0, 1])],
      iteration_bucket_from_calibration: "LOW"
    };
    expect(detectIterationDepth(input).iteration_bucket).toBe("LOW");
  });
});

describe("detectVerificationPresence", () => {
  it("true for verification_signal", () => {
    const input: SignalDetectionInput = {
      ordered_events: [ev({ event_name: "verification_signal" })],
      retry_sequences: []
    };
    expect(detectVerificationPresence(input).verification_present).toBe(true);
  });

  it("false when absent", () => {
    const input: SignalDetectionInput = {
      ordered_events: [ev({ event_name: "step" })],
      retry_sequences: []
    };
    expect(detectVerificationPresence(input).verification_present).toBe(false);
  });

  it("Scenario C1: retrieval/search name alone does not count", () => {
    const input: SignalDetectionInput = {
      ordered_events: [
        ev({ event_name: "retrieval_recheck" }),
        ev({ event_name: "search", timestamp: "2026-01-01T12:00:01.000Z" })
      ],
      retry_sequences: []
    };
    expect(detectVerificationPresence(input).verification_present).toBe(false);
  });

  it("Scenario C2: retrieval with structural verification flag counts", () => {
    const input: SignalDetectionInput = {
      ordered_events: [
        ev({
          event_name: "retrieval_recheck",
          timestamp: "2026-01-01T12:00:00.000Z",
          context: { structural_verification: true }
        })
      ],
      retry_sequences: []
    };
    expect(detectVerificationPresence(input).verification_present).toBe(true);
  });

  it("search_verification counts when metadata marks verification_present", () => {
    const input: SignalDetectionInput = {
      ordered_events: [
        ev({
          event_name: "search_verification",
          metadata: { verification_present: true }
        })
      ],
      retry_sequences: []
    };
    expect(detectVerificationPresence(input).verification_present).toBe(true);
  });
});

describe("isExplicitError / isRetryTrigger", () => {
  it("rejection disposition is retry trigger but not explicit error", () => {
    const rej = ev({
      event_name: "ai_output_disposition",
      context: { disposition: "rejected" }
    });
    expect(isExplicitError(rej)).toBe(false);
    expect(isRetryTrigger(rej)).toBe(true);
  });

  it("execution_error is explicit error", () => {
    const err = ev({ event_name: "execution_error" });
    expect(isExplicitError(err)).toBe(true);
    expect(isRetryTrigger(err)).toBe(true);
  });
});

describe("detectRecoveryPresence", () => {
  it("Scenario A: rejection + retry + success without explicit error → no recovery", () => {
    const fail = ev({
      timestamp: "2026-01-01T12:00:00.000Z",
      event_name: "ai_output_disposition",
      context: { disposition: "rejected" },
      metadata: { event_id: "f" }
    });
    const ok = ev({
      timestamp: "2026-01-01T12:00:05.000Z",
      event_name: "ai_output_disposition",
      context: { disposition: "accepted" },
      metadata: { event_id: "ok" }
    });
    const input: SignalDetectionInput = {
      ordered_events: [fail, ok],
      retry_sequences: [
        {
          retry_id: "r1",
          trigger_event_id: "f",
          resumed_event_id: "ok",
          event_indexes: Object.freeze([0, 1])
        }
      ]
    };
    expect(detectRecoveryPresence(input).recovery_present).toBe(false);
  });

  it("Scenario B: explicit error + retry + continuation → recovery", () => {
    const errEv = ev({
      timestamp: "2026-01-01T12:00:00.000Z",
      event_name: "execution_error",
      metadata: { event_id: "err1" }
    });
    const stepEv = ev({
      timestamp: "2026-01-01T12:00:05.000Z",
      event_name: "step",
      metadata: { event_id: "s1" }
    });
    const ok = ev({
      timestamp: "2026-01-01T12:00:10.000Z",
      event_name: "ai_output_disposition",
      context: { disposition: "accepted" },
      metadata: { event_id: "ok" }
    });
    const input: SignalDetectionInput = {
      ordered_events: [errEv, stepEv, ok],
      retry_sequences: [
        {
          retry_id: "r1",
          trigger_event_id: "err1",
          resumed_event_id: "s1",
          event_indexes: Object.freeze([0, 1])
        }
      ]
    };
    expect(detectRecoveryPresence(input).recovery_present).toBe(true);
  });
});

describe("detectAbandonment", () => {
  it("true for ABANDONED state", () => {
    const state: ExecutionStateSnapshot = {
      state: "ABANDONED",
      firstEventAtMs: 1,
      lastActivityAtMs: 2,
      sawErrorOrRejection: false,
      lastTransitionReason: "x"
    };
    const input: SignalDetectionInput = {
      ordered_events: [ev({})],
      retry_sequences: [],
      execution_state: state
    };
    expect(detectAbandonment(input).abandonment_present).toBe(true);
  });

  it("true for inactivity_abandonment flag", () => {
    const input: SignalDetectionInput = {
      ordered_events: [ev({})],
      retry_sequences: [],
      inactivity_abandonment: true
    };
    expect(detectAbandonment(input).abandonment_present).toBe(true);
  });

  it("Scenario D: no structural abandonment signals → false", () => {
    const input: SignalDetectionInput = {
      ordered_events: [
        ev({
          event_name: "ai_output_disposition",
          context: { disposition: "accepted" }
        })
      ],
      retry_sequences: []
    };
    expect(detectAbandonment(input).abandonment_present).toBe(false);
  });

  it("explicit ai_abandonment event → true", () => {
    const input: SignalDetectionInput = {
      ordered_events: [ev({ event_name: "ai_abandonment" })],
      retry_sequences: []
    };
    expect(detectAbandonment(input).abandonment_present).toBe(true);
  });
});

describe("detectLatency", () => {
  it("computes span when timestamps valid", () => {
    const input: SignalDetectionInput = {
      ordered_events: [
        ev({ timestamp: "2026-01-01T12:00:00.000Z" }),
        ev({ timestamp: "2026-01-01T12:00:10.000Z" })
      ],
      retry_sequences: []
    };
    const r = detectLatency(input);
    expect(r.total_execution_ms).toBe(10_000);
    expect(r.latency_bucket).toBe("UNKNOWN");
  });

  it("UNKNOWN when no calibration and empty events", () => {
    const r = detectLatency({ ordered_events: [], retry_sequences: [] });
    expect(r.total_execution_ms).toBeNull();
    expect(r.latency_bucket).toBe("UNKNOWN");
  });

  it("uses calibration bucket", () => {
    const input: SignalDetectionInput = {
      ordered_events: [
        ev({ timestamp: "2026-01-01T12:00:00.000Z" }),
        ev({ timestamp: "2026-01-01T12:00:10.000Z" })
      ],
      retry_sequences: [],
      latency_bucket_from_calibration: "HIGH"
    };
    expect(detectLatency(input).latency_bucket).toBe("HIGH");
  });
});

describe("detectDisposition", () => {
  it("ABANDON when abandoned disposition", () => {
    const input: SignalDetectionInput = {
      ordered_events: [
        ev({
          event_name: "ai_output_disposition",
          context: { disposition: "abandoned" }
        })
      ],
      retry_sequences: []
    };
    expect(detectDisposition(input).disposition).toBe("ABANDON");
  });

  it("REJECT for rejected", () => {
    const input: SignalDetectionInput = {
      ordered_events: [
        ev({
          event_name: "ai_output_disposition",
          context: { disposition: "rejected" }
        })
      ],
      retry_sequences: []
    };
    expect(detectDisposition(input).disposition).toBe("REJECT");
  });

  it("EDIT for edited", () => {
    const input: SignalDetectionInput = {
      ordered_events: [
        ev({
          event_name: "ai_output_disposition",
          context: { disposition: "edited" }
        })
      ],
      retry_sequences: []
    };
    expect(detectDisposition(input).disposition).toBe("EDIT");
  });

  it("ACCEPT for accepted without retry", () => {
    const input: SignalDetectionInput = {
      ordered_events: [
        ev({
          event_name: "ai_output_disposition",
          context: { disposition: "accepted" }
        })
      ],
      retry_sequences: []
    };
    expect(detectDisposition(input).disposition).toBe("ACCEPT");
  });
});

describe("detectSignals", () => {
  it("aggregates profile", () => {
    const input: SignalDetectionInput = {
      ordered_events: [
        ev({ event_name: "verification_signal" }),
        ev({
          timestamp: "2026-01-01T12:00:10.000Z",
          event_name: "ai_output_disposition",
          context: { disposition: "accepted" }
        })
      ],
      retry_sequences: [],
      iteration_bucket_from_calibration: "LOW",
      latency_bucket_from_calibration: "NORMAL"
    };
    const p = detectSignals(input);
    expect(p.verification.verification_present).toBe(true);
    expect(p.iteration.iteration_bucket).toBe("LOW");
    expect(p.latency.latency_bucket).toBe("NORMAL");
  });
});
