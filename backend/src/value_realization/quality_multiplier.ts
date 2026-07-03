import type { SuppressionReason } from "@fluencytracr/shared";
import { computeExecutionSignals, DEFAULT_PHASE2_THRESHOLDS } from "../execution_signals";
import type { FluencyEventRecord } from "../store";
import { groupEventsByExecution, reconstructTrace } from "../trace_engine";
import {
  ForwardedDistributionLegacyCompatibleSchema,
  type ForwardedDistribution
} from "./forwarded_distribution";

export type { ForwardedDistribution } from "./forwarded_distribution";

export type QualityMultiplierVerdict = "SURFACE" | "SUPPRESS";
export type QualityMultiplierEvidenceGrade = "OBJECTIVE" | "CALIBRATED" | "QUALITATIVE";
export type QualityMultiplierValueType = "QUALITY_PREMIUM";

export type QualityMultiplierResponse = {
  workflow_id: string;
  jbtd_id: string | null;
  persona_id: string | null;
  window_days: number;
  multiplier: number | null;
  verdict: QualityMultiplierVerdict;
  suppression_reason: SuppressionReason | null;
  cohort_size: number;
  evidence_grade: QualityMultiplierEvidenceGrade;
  computed_at: string;
  value_type?: QualityMultiplierValueType;
  velocity_adjustment_factor?: number;
  velocity_index?: number;
};

type QualitySignalClass =
  | "INTERACTION"
  | "ITERATION"
  | "VERIFICATION"
  | "RECOVERY"
  | "LATENCY"
  | "ABANDONMENT";

type QualityMultiplierInputs = {
  workflowId: string;
  jbtdId?: string | null;
  personaId?: string | null;
  windowDays: number;
  events: FluencyEventRecord[];
  now?: Date;
};

type WindowSlice = {
  events: FluencyEventRecord[];
  executionGroups: Map<string, FluencyEventRecord[]>;
  cohortSize: number;
  ambiguityRate: number;
  signalClasses: Set<QualitySignalClass>;
};

const MIN_WINDOW_DAYS = 60;
const MIN_COHORT_SIZE = 5;
const OBJECTIVE_COHORT_SIZE = 30;
const OBJECTIVE_WINDOW_DAYS = 90;
const AMBIGUITY_RATE_THRESHOLD = 0.2;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const roundMultiplier = (value: number): number => Number(value.toFixed(3));

const toTime = (iso: string): number | null => {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
};

const daysAgo = (now: Date, days: number): Date =>
  new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

const eventInRange = (event: FluencyEventRecord, start: Date, end: Date): boolean => {
  const t = toTime(event.timestamp);
  return t !== null && t >= start.getTime() && t <= end.getTime();
};

const eventInSlice = (
  event: FluencyEventRecord,
  jbtdId: string | null,
  personaId: string | null
): boolean => (event.jbtd_id ?? null) === jbtdId && (event.persona_id ?? null) === personaId;

const executionHasVerification = (events: FluencyEventRecord[]): boolean =>
  events.some((event) => {
    if (event.event_type === "verification_signal") {
      return true;
    }
    return event.event_type === "ai_output_disposition" && event.verification_present;
  });

const executionHasRecovery = (events: FluencyEventRecord[]): boolean =>
  events.some((event) => event.event_type === "ai_recovery_loop" && event.cycles > 0);

const executionHasAbandonment = (events: FluencyEventRecord[]): boolean =>
  events.some((event) => {
    if (event.event_type === "ai_abandonment") {
      return true;
    }
    return event.event_type === "ai_output_disposition" && event.disposition === "abandoned";
  });

const executionHasLatency = (events: FluencyEventRecord[]): boolean =>
  events.some((event) => {
    if (event.event_type === "ai_output_disposition") {
      return event.time_to_action_ms >= 0;
    }
    if (event.event_type === "verification_signal") {
      return event.verification_latency_ms >= 0;
    }
    if (event.event_type === "ai_recovery_loop") {
      return event.resolution_time_ms >= 0;
    }
    return false;
  });

const deriveSignalClasses = (executionGroups: Map<string, FluencyEventRecord[]>): Set<QualitySignalClass> => {
  const classes = new Set<QualitySignalClass>();
  for (const [, events] of executionGroups) {
    if (events.length > 0) {
      classes.add("INTERACTION");
    }
    if (executionHasVerification(events)) {
      classes.add("VERIFICATION");
    }
    if (executionHasRecovery(events)) {
      classes.add("RECOVERY");
    }
    if (executionHasAbandonment(events)) {
      classes.add("ABANDONMENT");
    }
    if (executionHasLatency(events)) {
      classes.add("LATENCY");
    }
    const trace = reconstructTrace(events);
    if (trace && trace.retry_sequences.length > 0) {
      classes.add("ITERATION");
    }
  }
  return classes;
};

const buildSlice = (events: FluencyEventRecord[]): WindowSlice => {
  const executionGroups = groupEventsByExecution(events);
  const ambiguous = events.filter((event) => event.ambiguity_flag === true).length;
  const ambiguityRate = events.length === 0 ? 0 : ambiguous / events.length;
  return {
    events,
    executionGroups,
    cohortSize: executionGroups.size,
    ambiguityRate,
    signalClasses: deriveSignalClasses(executionGroups)
  };
};

const hasConvergence = (slice: WindowSlice): boolean => {
  const nonLatencyClasses = [...slice.signalClasses].filter(
    (signalClass) => signalClass !== "INTERACTION" && signalClass !== "LATENCY"
  );
  return slice.signalClasses.size >= 2 && nonLatencyClasses.length >= 1;
};

const sameSignalClasses = (a: Set<QualitySignalClass>, b: Set<QualitySignalClass>): boolean => {
  if (a.size !== b.size) {
    return false;
  }
  for (const value of a) {
    if (!b.has(value)) {
      return false;
    }
  }
  return true;
};

const evidenceGrade = (
  verdict: QualityMultiplierVerdict,
  cohortSize: number,
  windowDays: number
): QualityMultiplierEvidenceGrade => {
  if (verdict === "SURFACE" && cohortSize >= OBJECTIVE_COHORT_SIZE && windowDays >= OBJECTIVE_WINDOW_DAYS) {
    return "OBJECTIVE";
  }
  return "QUALITATIVE";
};

const forwardedHasConvergence = (forwardedDistribution: ForwardedDistribution): boolean => {
  const quality = forwardedDistribution.quality_signals;
  return quality.completion_rate > 0 ||
    quality.error_rate > 0 ||
    quality.abandonment_rate > 0 ||
    quality.recovery_rate > 0 ||
    quality.verification_rate > 0;
};

const suppress = (
  params: {
    workflowId: string;
    jbtdId: string | null;
    personaId: string | null;
    windowDays: number;
    reason: SuppressionReason;
    cohortSize: number;
    computedAt: string;
  }
): QualityMultiplierResponse => ({
  workflow_id: params.workflowId,
  jbtd_id: params.jbtdId,
  persona_id: params.personaId,
  window_days: params.windowDays,
  multiplier: null,
  verdict: "SUPPRESS",
  suppression_reason: params.reason,
  cohort_size: params.cohortSize,
  evidence_grade: evidenceGrade("SUPPRESS", params.cohortSize, params.windowDays),
  computed_at: params.computedAt
});

const suppressForwardedDistribution = (
  forwardedDistribution: ForwardedDistribution,
  reason: SuppressionReason,
  computedAt: string
): QualityMultiplierResponse => ({
  workflow_id: forwardedDistribution.workflow_id,
  jbtd_id: forwardedDistribution.jbtd_id,
  persona_id: forwardedDistribution.persona_id,
  window_days: forwardedDistribution.window_days,
  multiplier: null,
  verdict: "SUPPRESS",
  suppression_reason: reason,
  cohort_size: forwardedDistribution.cohort_size,
  evidence_grade: "QUALITATIVE",
  computed_at: computedAt
});

const computeRates = (slice: WindowSlice) => {
  let verificationCount = 0;
  let recoverySuccessCount = 0;
  let abandonmentCount = 0;
  let frictionLoopCount = 0;

  for (const [, events] of slice.executionGroups) {
    const trace = reconstructTrace(events);
    if (!trace) {
      continue;
    }
    const signals = computeExecutionSignals(events, trace);
    if (signals.verification_present) {
      verificationCount += 1;
    }
    if (
      signals.recovery_present &&
      (signals.last_disposition === "accepted" || signals.last_disposition === "edited")
    ) {
      recoverySuccessCount += 1;
    }
    if (signals.abandonment_present) {
      abandonmentCount += 1;
    }
    const highLatency =
      signals.latency_ms !== null && signals.latency_ms >= DEFAULT_PHASE2_THRESHOLDS.latency_high_ms;
    if (signals.iteration_depth >= DEFAULT_PHASE2_THRESHOLDS.iteration_high && highLatency) {
      frictionLoopCount += 1;
    }
  }

  const denominator = Math.max(slice.cohortSize, 1);
  return {
    verificationRate: verificationCount / denominator,
    recoverySuccessRate: recoverySuccessCount / denominator,
    abandonmentRate: abandonmentCount / denominator,
    frictionLoopRate: frictionLoopCount / denominator
  };
};

export const computeQualityMultiplier = ({
  workflowId,
  jbtdId = null,
  personaId = null,
  windowDays,
  events,
  now = new Date()
}: QualityMultiplierInputs): QualityMultiplierResponse => {
  const computedAt = now.toISOString();
  const workflowEvents = events.filter(
    (event) => event.workflow_id === workflowId && eventInSlice(event, jbtdId, personaId)
  );
  const currentStart = daysAgo(now, windowDays);
  const previousStart = daysAgo(now, windowDays * 2);
  const currentEvents = workflowEvents.filter((event) => eventInRange(event, currentStart, now));
  const previousEvents = workflowEvents.filter((event) => eventInRange(event, previousStart, currentStart));
  const current = buildSlice(currentEvents);
  const previous = buildSlice(previousEvents);

  if (windowDays < MIN_WINDOW_DAYS) {
    return suppress({
      workflowId,
      jbtdId,
      personaId,
      windowDays,
      reason: "INSUFFICIENT_TIME",
      cohortSize: current.cohortSize,
      computedAt
    });
  }
  if (current.ambiguityRate > AMBIGUITY_RATE_THRESHOLD) {
    return suppress({
      workflowId,
      jbtdId,
      personaId,
      windowDays,
      reason: "HIGH_AMBIGUITY",
      cohortSize: current.cohortSize,
      computedAt
    });
  }
  if (current.cohortSize < MIN_COHORT_SIZE) {
    return suppress({
      workflowId,
      jbtdId,
      personaId,
      windowDays,
      reason: "INSUFFICIENT_VOLUME",
      cohortSize: current.cohortSize,
      computedAt
    });
  }
  if (!hasConvergence(current) || !hasConvergence(previous)) {
    return suppress({
      workflowId,
      jbtdId,
      personaId,
      windowDays,
      reason: "NO_CONVERGENCE",
      cohortSize: current.cohortSize,
      computedAt
    });
  }
  if (!sameSignalClasses(current.signalClasses, previous.signalClasses)) {
    return suppress({
      workflowId,
      jbtdId,
      personaId,
      windowDays,
      reason: "BASELINE_UNSTABLE",
      cohortSize: current.cohortSize,
      computedAt
    });
  }

  const rates = computeRates(current);
  const rawMultiplier =
    1 +
    0.3 * rates.verificationRate +
    0.25 * rates.recoverySuccessRate -
    0.35 * rates.abandonmentRate -
    0.3 * rates.frictionLoopRate;
  const multiplier = roundMultiplier(clamp(rawMultiplier, 0.5, 1.5));

  return {
    workflow_id: workflowId,
    jbtd_id: jbtdId,
    persona_id: personaId,
    window_days: windowDays,
    multiplier,
    verdict: "SURFACE",
    suppression_reason: null,
    cohort_size: current.cohortSize,
    evidence_grade: evidenceGrade("SURFACE", current.cohortSize, windowDays),
    computed_at: computedAt
  };
};

export const computeQualityMultiplierFromForwardedDistribution = ({
  forwardedDistribution,
  now = new Date()
}: {
  forwardedDistribution: ForwardedDistribution;
  now?: Date;
}): QualityMultiplierResponse => {
  const computedAt = now.toISOString();
  const parsed = ForwardedDistributionLegacyCompatibleSchema.safeParse(forwardedDistribution);
  if (!parsed.success) {
    return {
      workflow_id: forwardedDistribution.workflow_id ?? "",
      jbtd_id: forwardedDistribution.jbtd_id ?? null,
      persona_id: forwardedDistribution.persona_id ?? null,
      window_days: forwardedDistribution.window_days ?? 0,
      multiplier: null,
      verdict: "SUPPRESS",
      suppression_reason: "NO_CONVERGENCE",
      cohort_size: forwardedDistribution.cohort_size ?? 0,
      evidence_grade: "QUALITATIVE",
      computed_at: computedAt
    };
  }
  const distribution = parsed.data;

  if (distribution.window_days < MIN_WINDOW_DAYS) {
    return suppressForwardedDistribution(distribution, "INSUFFICIENT_TIME", computedAt);
  }
  if (distribution.ambiguity_rate > AMBIGUITY_RATE_THRESHOLD) {
    return suppressForwardedDistribution(distribution, "HIGH_AMBIGUITY", computedAt);
  }
  if (distribution.cohort_size < MIN_COHORT_SIZE) {
    return suppressForwardedDistribution(distribution, "INSUFFICIENT_VOLUME", computedAt);
  }
  if (!forwardedHasConvergence(distribution)) {
    return suppressForwardedDistribution(distribution, "NO_CONVERGENCE", computedAt);
  }
  if (distribution.baseline_stable !== true) {
    return suppressForwardedDistribution(distribution, "BASELINE_UNSTABLE", computedAt);
  }

  const quality = distribution.quality_signals;
  const rawMultiplier =
    1 +
    0.3 * quality.verification_rate +
    0.25 * quality.recovery_rate -
    0.35 * quality.abandonment_rate -
    0.3 * quality.error_rate;
  const multiplier = roundMultiplier(clamp(rawMultiplier, 0.5, 1.5));

  return {
    workflow_id: distribution.workflow_id,
    jbtd_id: distribution.jbtd_id,
    persona_id: distribution.persona_id,
    window_days: distribution.window_days,
    multiplier,
    verdict: "SURFACE",
    suppression_reason: null,
    cohort_size: distribution.cohort_size,
    evidence_grade: "CALIBRATED",
    value_type: "QUALITY_PREMIUM",
    computed_at: computedAt
  };
};

export const failClosedQualityMultiplierResponse = (
  workflowId: string,
  windowDays: number,
  computedAt = new Date().toISOString(),
  jbtdId: string | null = null,
  personaId: string | null = null
): QualityMultiplierResponse => ({
  workflow_id: workflowId,
  jbtd_id: jbtdId,
  persona_id: personaId,
  window_days: windowDays,
  multiplier: null,
  verdict: "SUPPRESS",
  suppression_reason: "NO_CONVERGENCE",
  cohort_size: 0,
  evidence_grade: "QUALITATIVE",
  computed_at: computedAt
});
