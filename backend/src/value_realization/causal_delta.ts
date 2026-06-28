import type { FluencyPatternName, SuppressionReason } from "@fluencytracr/shared";
import { computeExecutionLifecycle } from "../execution_lifecycle";
import { computeExecutionSignals, DEFAULT_PHASE2_THRESHOLDS } from "../execution_signals";
import { evaluateExecutionDisclosure } from "../execution_disclosure";
import { toTraceGateSummary, evaluateFluencyExecutionGates } from "../fluency_execution_gates";
import { runFluencyPatternSuppression } from "../fluency-pattern-suppression";
import { MIN_COHORT_SIZE } from "../fluencytracr";
import type { FluencyEventRecord } from "../store";
import { groupEventsByExecution, reconstructTrace, sortEventsByTimestamp } from "../trace_engine";
import { buildWorkflowPhase2ThresholdMap } from "../workflow_baseline";

export type CausalDeltaShift = "IMPROVED" | "HELD" | "REGRESSED" | "INDETERMINATE";
export type CausalDeltaEvidenceGrade = "OBJECTIVE" | "CALIBRATED" | "QUALITATIVE";

export type CausalDeltaResponse = {
  workflow_id: string;
  jbtd_id: string | null;
  persona_id: string | null;
  verdict: "SURFACE" | "SUPPRESS";
  suppression_reason: SuppressionReason | null;
  pre_pattern: FluencyPatternName | null;
  post_pattern: FluencyPatternName | null;
  shift: CausalDeltaShift;
  pre_cohort_size: number;
  post_cohort_size: number;
  evidence_grade: CausalDeltaEvidenceGrade;
  computed_at: string;
};

type WindowSummary = {
  pattern: FluencyPatternName | null;
  suppressionReason: SuppressionReason | null;
  cohortSize: number;
};

type CausalDeltaInput = {
  workflowId: string;
  jbtdId?: string | null;
  personaId?: string | null;
  eventAt: string;
  preWindowDays: number;
  postWindowDays: number;
  events: FluencyEventRecord[];
  now?: Date;
};

export const MIN_CAUSAL_DELTA_WINDOW_DAYS = 14;

const AMBIGUITY_RATE_THRESHOLD = 0.2;
const OBJECTIVE_COHORT_SIZE = 30;
const OBJECTIVE_WINDOW_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const PATTERN_RANK: Record<FluencyPatternName, number> = {
  "Undertrust Avoidance": 0,
  "Friction Loop": 1,
  "Blind Efficiency": 2,
  "Recovery Maturity": 3,
  "Calibrated Fluency": 4
};

const toTime = (iso: string): number | null => {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
};

const addDays = (date: Date, days: number): Date =>
  new Date(date.getTime() + days * MS_PER_DAY);

export const causalDeltaWindowsOverlap = (
  preStart: Date,
  preEndExclusive: Date,
  postStartInclusive: Date,
  postEndExclusive: Date
): boolean =>
  preStart.getTime() < postEndExclusive.getTime() &&
  postStartInclusive.getTime() < preEndExclusive.getTime();

const inWindow = (event: FluencyEventRecord, start: Date, endExclusive: Date): boolean => {
  const t = toTime(event.timestamp);
  return t !== null && t >= start.getTime() && t < endExclusive.getTime();
};

const eventInSlice = (
  event: FluencyEventRecord,
  jbtdId: string | null,
  personaId: string | null
): boolean => (event.jbtd_id ?? null) === jbtdId && (event.persona_id ?? null) === personaId;

const resolveSuppression = (
  summary: WindowSummary
): SuppressionReason | null => summary.suppressionReason;

const topPattern = (
  counts: Map<FluencyPatternName, number>
): { pattern: FluencyPatternName | null; tied: boolean } => {
  let pattern: FluencyPatternName | null = null;
  let count = 0;
  let tied = false;

  for (const [candidate, candidateCount] of counts) {
    if (candidateCount > count) {
      pattern = candidate;
      count = candidateCount;
      tied = false;
    } else if (candidateCount === count && candidateCount > 0) {
      tied = true;
    }
  }

  return { pattern, tied };
};

const summarizeWindow = (
  events: FluencyEventRecord[],
  allWorkflowEvents: FluencyEventRecord[],
  now: Date
): WindowSummary => {
  const byExecution = groupEventsByExecution(events);
  const cohortSize = byExecution.size;
  const ambiguityRate =
    events.length === 0 ? 0 : events.filter((event) => event.ambiguity_flag === true).length / events.length;

  if (ambiguityRate > AMBIGUITY_RATE_THRESHOLD) {
    return { pattern: null, suppressionReason: "HIGH_AMBIGUITY", cohortSize };
  }
  if (cohortSize < MIN_COHORT_SIZE) {
    return { pattern: null, suppressionReason: "INSUFFICIENT_VOLUME", cohortSize };
  }

  const thresholdsByWorkflow = buildWorkflowPhase2ThresholdMap(allWorkflowEvents);
  const patternCounts = new Map<FluencyPatternName, number>();
  let disclosedExecutions = 0;

  for (const [, group] of byExecution) {
    const trace = reconstructTrace(group);
    if (!trace) {
      continue;
    }
    const ordered = sortEventsByTimestamp(group);
    const lifecycle = computeExecutionLifecycle(ordered, trace, { now });
    const gates = toTraceGateSummary(evaluateFluencyExecutionGates(ordered, trace, lifecycle));
    const signals = computeExecutionSignals(group, trace);
    const thresholds = thresholdsByWorkflow.get(trace.workflow_id) ?? DEFAULT_PHASE2_THRESHOLDS;
    const { pattern, suppression } = runFluencyPatternSuppression({ signals, thresholds, gates });
    const disclosure = evaluateExecutionDisclosure(signals, gates, suppression);
    if (disclosure.state !== "ALLOWED" || pattern === null) {
      continue;
    }
    disclosedExecutions += 1;
    patternCounts.set(pattern, (patternCounts.get(pattern) ?? 0) + 1);
  }

  if (disclosedExecutions < MIN_COHORT_SIZE) {
    return { pattern: null, suppressionReason: "INSUFFICIENT_VOLUME", cohortSize };
  }

  const dominant = topPattern(patternCounts);
  if (dominant.tied) {
    return { pattern: null, suppressionReason: "BASELINE_UNSTABLE", cohortSize };
  }
  if (dominant.pattern === null) {
    return { pattern: null, suppressionReason: "NO_CONVERGENCE", cohortSize };
  }

  return { pattern: dominant.pattern, suppressionReason: null, cohortSize };
};

const shiftFor = (
  prePattern: FluencyPatternName,
  postPattern: FluencyPatternName
): CausalDeltaShift => {
  const pre = PATTERN_RANK[prePattern];
  const post = PATTERN_RANK[postPattern];
  if (post > pre) {
    return "IMPROVED";
  }
  if (post < pre) {
    return "REGRESSED";
  }
  return "HELD";
};

const evidenceGrade = (
  preCohortSize: number,
  postCohortSize: number,
  preWindowDays: number,
  postWindowDays: number,
  verdict: "SURFACE" | "SUPPRESS"
): CausalDeltaEvidenceGrade => {
  if (
    verdict === "SURFACE" &&
    preCohortSize >= OBJECTIVE_COHORT_SIZE &&
    postCohortSize >= OBJECTIVE_COHORT_SIZE &&
    preWindowDays >= OBJECTIVE_WINDOW_DAYS &&
    postWindowDays >= OBJECTIVE_WINDOW_DAYS
  ) {
    return "OBJECTIVE";
  }
  return "QUALITATIVE";
};

const suppress = (
  params: {
    workflowId: string;
    jbtdId: string | null;
    personaId: string | null;
    reason: SuppressionReason;
    prePattern: FluencyPatternName | null;
    postPattern: FluencyPatternName | null;
    preCohortSize: number;
    postCohortSize: number;
    preWindowDays: number;
    postWindowDays: number;
    computedAt: string;
  }
): CausalDeltaResponse => ({
  workflow_id: params.workflowId,
  jbtd_id: params.jbtdId,
  persona_id: params.personaId,
  verdict: "SUPPRESS",
  suppression_reason: params.reason,
  pre_pattern: params.prePattern,
  post_pattern: params.postPattern,
  shift: "INDETERMINATE",
  pre_cohort_size: params.preCohortSize,
  post_cohort_size: params.postCohortSize,
  evidence_grade: evidenceGrade(
    params.preCohortSize,
    params.postCohortSize,
    params.preWindowDays,
    params.postWindowDays,
    "SUPPRESS"
  ),
  computed_at: params.computedAt
});

export const computeCausalDelta = ({
  workflowId,
  jbtdId = null,
  personaId = null,
  eventAt,
  preWindowDays,
  postWindowDays,
  events,
  now = new Date()
}: CausalDeltaInput): CausalDeltaResponse => {
  const computedAt = now.toISOString();
  const changeAt = new Date(eventAt);
  const preStart = addDays(changeAt, -preWindowDays);
  const preEnd = changeAt;
  const postStart = changeAt;
  const postEnd = addDays(changeAt, postWindowDays);

  const workflowEvents = events.filter(
    (event) => event.workflow_id === workflowId && eventInSlice(event, jbtdId, personaId)
  );
  const preEvents = workflowEvents.filter((event) => inWindow(event, preStart, preEnd));
  const postEvents = workflowEvents.filter((event) => inWindow(event, postStart, postEnd));
  const allWindowEvents = workflowEvents.filter((event) => inWindow(event, preStart, postEnd));

  const pre = summarizeWindow(preEvents, allWindowEvents, now);
  const post = summarizeWindow(postEvents, allWindowEvents, now);
  const preReason = resolveSuppression(pre);
  const postReason = resolveSuppression(post);

  if (preReason || postReason || pre.pattern === null || post.pattern === null) {
    return suppress({
      workflowId,
      jbtdId,
      personaId,
      reason: preReason ?? postReason ?? "NO_CONVERGENCE",
      prePattern: pre.pattern,
      postPattern: post.pattern,
      preCohortSize: pre.cohortSize,
      postCohortSize: post.cohortSize,
      preWindowDays,
      postWindowDays,
      computedAt
    });
  }

  return {
    workflow_id: workflowId,
    jbtd_id: jbtdId,
    persona_id: personaId,
    verdict: "SURFACE",
    suppression_reason: null,
    pre_pattern: pre.pattern,
    post_pattern: post.pattern,
    shift: shiftFor(pre.pattern, post.pattern),
    pre_cohort_size: pre.cohortSize,
    post_cohort_size: post.cohortSize,
    evidence_grade: evidenceGrade(pre.cohortSize, post.cohortSize, preWindowDays, postWindowDays, "SURFACE"),
    computed_at: computedAt
  };
};
