import type { FluencyPatternName, FluencyWindow } from "@fluencytracr/shared";
import { evaluateFluencyExecutionGates, toTraceGateSummary, type TraceGateSummary } from "./fluency_execution_gates";
import { runFluencyPatternSuppression } from "./fluency-pattern-suppression";
import type { FluencyEventRecord } from "./store";
import type { ReconstructedTrace } from "./trace_engine";
import { computeExecutionLifecycle, type ExecutionLifecycle } from "./execution_lifecycle";
import { filterEventsByWindow } from "./fluencytracr";
import { sortEventsByTimestamp } from "./trace_engine";
import { buildWorkflowPhase2ThresholdMap } from "./workflow_baseline";
import type { SuppressionDecision } from "./services/suppression-engine";

export type { TraceGateSummary } from "./fluency_execution_gates";

/**
 * PRD §17-style registry: which structural inputs each signal needs.
 * Used for documentation and optional completeness checks (not user-facing).
 */
export const SIGNAL_REGISTRY = {
  iteration_depth: {
    description: "Count of retry_sequences on the trace (PRD §14.1).",
    requires_event_families: ["ai_output_disposition", "ai_recovery_loop"] as const
  },
  verification_present: {
    description: "verification_signal events or ai_output_disposition.verification_present (PRD §14.2).",
    requires_event_families: ["verification_signal", "ai_output_disposition"] as const
  },
  recovery_present: {
    description: "ai_recovery_loop or retry_sequence with later accepted/edited disposition (PRD §14.3).",
    requires_event_families: ["ai_recovery_loop", "ai_output_disposition"] as const
  },
  abandonment_present: {
    description: "ai_abandonment or disposition abandoned (PRD §14.4 partial; inferred timeout later).",
    requires_event_families: ["ai_abandonment", "ai_output_disposition"] as const
  },
  latency_ms: {
    description: "end_time - start_time over ordered events (PRD §14.5).",
    requires_event_families: ["*"] as const
  },
  last_disposition: {
    description: "Last ai_output_disposition.disposition in execution order.",
    requires_event_families: ["ai_output_disposition"] as const
  }
} as const;

export type ExecutionSignals = {
  event_count: number;
  iteration_depth: number;
  verification_present: boolean;
  recovery_present: boolean;
  abandonment_present: boolean;
  /** Span of execution timeline; null if timestamps invalid. */
  latency_ms: number | null;
  last_disposition: "accepted" | "edited" | "rejected" | "abandoned" | null;
  /** At least one AI-adjacent fluency event (PRD undertrust / no AI usage). */
  has_ai_usage: boolean;
  confidence_tier: "high" | "medium" | "low";
};

export type Phase2Thresholds = {
  /** Calibrated Fluency: iteration_depth <= this (PRD §15.2). */
  iteration_low: number;
  /** Friction Loop: iteration_depth >= this (PRD §15.2). */
  iteration_high: number;
  /** Friction Loop: latency >= this (PRD §15.2), internal only. */
  latency_high_ms: number;
};

export const DEFAULT_PHASE2_THRESHOLDS: Phase2Thresholds = {
  iteration_low: 1,
  iteration_high: 2,
  latency_high_ms: 10 * 60 * 1000
};

const toTime = (iso: string): number | null => {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
};

const hasAiUsage = (ordered: FluencyEventRecord[]): boolean =>
  ordered.some(
    (e) =>
      e.event_type === "ai_output_disposition" ||
      e.event_type === "ai_recovery_loop" ||
      e.event_type === "verification_signal"
  );

const computeRecoveryPresent = (
  ordered: FluencyEventRecord[],
  trace: ReconstructedTrace
): boolean => {
  if (ordered.some((e) => e.event_type === "ai_recovery_loop" && e.cycles > 0)) {
    return true;
  }
  if (trace.retry_sequences.length === 0) {
    return false;
  }
  const lastPair = trace.retry_sequences[trace.retry_sequences.length - 1];
  const idx = ordered.findIndex((e) => e.event_id === lastPair.subsequent_event_id);
  if (idx < 0) {
    return true;
  }
  const subsequent = ordered[idx];
  if (
    subsequent.event_type === "ai_output_disposition" &&
    (subsequent.disposition === "accepted" || subsequent.disposition === "edited")
  ) {
    return true;
  }
  return ordered.slice(idx + 1).some(
    (e) =>
      e.event_type === "ai_output_disposition" &&
      (e.disposition === "accepted" || e.disposition === "edited")
  );
};

const computeAbandonmentPresent = (ordered: FluencyEventRecord[]): boolean => {
  if (ordered.some((e) => e.event_type === "ai_abandonment")) {
    return true;
  }
  return ordered.some(
    (e) => e.event_type === "ai_output_disposition" && e.disposition === "abandoned"
  );
};

const computeVerificationPresent = (ordered: FluencyEventRecord[]): boolean => {
  if (ordered.some((e) => e.event_type === "verification_signal")) {
    return true;
  }
  return ordered.some(
    (e) => e.event_type === "ai_output_disposition" && e.verification_present
  );
};

const lastDisposition = (
  ordered: FluencyEventRecord[]
): ExecutionSignals["last_disposition"] => {
  for (let i = ordered.length - 1; i >= 0; i -= 1) {
    const e = ordered[i];
    if (e.event_type === "ai_output_disposition") {
      return e.disposition;
    }
  }
  return null;
};

const confidenceTier = (n: number): ExecutionSignals["confidence_tier"] => {
  if (n >= 4) {
    return "high";
  }
  if (n >= 2) {
    return "medium";
  }
  return "low";
};

export const computeExecutionSignals = (
  orderedInput: FluencyEventRecord[],
  trace: ReconstructedTrace
): ExecutionSignals => {
  const ordered = sortEventsByTimestamp(orderedInput);
  const times = ordered.map((e) => toTime(e.timestamp)).filter((t): t is number => t !== null);
  const latency_ms =
    times.length >= 2 ? Math.max(0, times[times.length - 1]! - times[0]!) : times.length === 1 ? 0 : null;

  return {
    event_count: ordered.length,
    iteration_depth: trace.retry_sequences.length,
    verification_present: computeVerificationPresent(ordered),
    recovery_present: computeRecoveryPresent(ordered, trace),
    abandonment_present: computeAbandonmentPresent(ordered),
    latency_ms,
    last_disposition: lastDisposition(ordered),
    has_ai_usage: hasAiUsage(ordered),
    confidence_tier: confidenceTier(ordered.length)
  };
};

/**
 * PRD §15.1 priority: Undertrust → Friction → Recovery → Blind → Calibrated → residual.
 */
export const classifyExecutionPattern = (
  signals: ExecutionSignals,
  thresholds: Phase2Thresholds = DEFAULT_PHASE2_THRESHOLDS
): FluencyPatternName => {
  const {
    event_count,
    iteration_depth,
    verification_present,
    recovery_present,
    abandonment_present,
    latency_ms,
    has_ai_usage
  } = signals;

  const noAiButSomethingObserved = event_count > 0 && !has_ai_usage;
  if (abandonment_present || noAiButSomethingObserved) {
    return "Undertrust Avoidance";
  }

  const highLatency = latency_ms !== null && latency_ms >= thresholds.latency_high_ms;
  if (iteration_depth >= thresholds.iteration_high && highLatency) {
    return "Friction Loop";
  }

  if (recovery_present) {
    return "Recovery Maturity";
  }

  if (iteration_depth === 0 && !verification_present) {
    return "Blind Efficiency";
  }

  if (iteration_depth <= thresholds.iteration_low && verification_present) {
    return "Calibrated Fluency";
  }

  return verification_present ? "Calibrated Fluency" : "Blind Efficiency";
};

export type TraceWithPhase2 = ReconstructedTrace & {
  signals: ExecutionSignals;
  pattern: FluencyPatternName | null;
  pattern_confidence_tier: ExecutionSignals["confidence_tier"] | null;
  /** PRD §13 — structural lifecycle; not suppressed with signals/pattern. */
  lifecycle: ExecutionLifecycle;
  /** FSC + minimum-signal snapshot (PRD §18 / §20); disclosure consumes without recomputing. */
  fluency_gates: TraceGateSummary;
  /** §21 suppression decision (FSC → min-signal → classification ambiguity). */
  fluency_suppression: SuppressionDecision;
};

export type AttachPhase2Options = {
  now?: Date;
  /** PRD §16: when omitted, derived from `allEvents` in `baselineWindow`. */
  thresholdsByWorkflow?: Map<string, Phase2Thresholds>;
  baselineWindow?: FluencyWindow;
  /** Use one threshold map for all workflows (tests / pinned behavior). */
  flatThresholds?: Phase2Thresholds;
};

export const attachPhase2ToTraces = (
  traces: ReconstructedTrace[],
  allEvents: FluencyEventRecord[],
  options: AttachPhase2Options = {}
): TraceWithPhase2[] => {
  const now = options.now ?? new Date();
  const baselineWindow = options.baselineWindow ?? "90d";
  const windowed = filterEventsByWindow(allEvents, baselineWindow, now) as FluencyEventRecord[];
  const thresholdsByWorkflow: Map<string, Phase2Thresholds> | null = options.flatThresholds
    ? null
    : options.thresholdsByWorkflow ?? buildWorkflowPhase2ThresholdMap(windowed);

  const byExec = new Map<string, FluencyEventRecord[]>();
  for (const e of allEvents) {
    const list = byExec.get(e.execution_id) ?? [];
    list.push(e);
    byExec.set(e.execution_id, list);
  }

  return traces.map((trace) => {
    const group = byExec.get(trace.execution_id) ?? [];
    const ordered = sortEventsByTimestamp(group);
    const signals = computeExecutionSignals(group, trace);
    const thresholds =
      options.flatThresholds ??
      thresholdsByWorkflow?.get(trace.workflow_id) ??
      DEFAULT_PHASE2_THRESHOLDS;
    const lifecycle = computeExecutionLifecycle(ordered, trace, { now });
    const gateSnapshot = toTraceGateSummary(evaluateFluencyExecutionGates(ordered, trace, lifecycle));
    const { pattern, suppression } = runFluencyPatternSuppression({
      signals,
      thresholds,
      gates: gateSnapshot
    });
    return {
      ...trace,
      signals,
      pattern,
      pattern_confidence_tier: pattern !== null ? signals.confidence_tier : null,
      lifecycle,
      fluency_gates: gateSnapshot,
      fluency_suppression: suppression
    };
  });
};
