import type { FluencyPatternName, FluencyWindow, ObservabilityReliabilityComponents } from "@learnaire/shared";
import { computeExecutionSignals, DEFAULT_PHASE2_THRESHOLDS, type Phase2Thresholds } from "./execution_signals";
import { evaluateExecutionDisclosure } from "./execution_disclosure";
import { evaluateFluencyExecutionGates, toTraceGateSummary } from "./fluency_execution_gates";
import { runFluencyPatternSuppression } from "./fluency-pattern-suppression";
import type { FluencyEventRecord } from "./store";
import { computeExecutionLifecycle } from "./execution_lifecycle";
import { filterEventsByWindow, MIN_COHORT_SIZE } from "./fluencytracr";
import { evaluateGhostUseResidual, hasPositiveAiEvidence, type GhostUseStatus } from "./ghost_use_evaluator";
import { groupEventsByExecution, reconstructTrace, sortEventsByTimestamp } from "./trace_engine";
import { buildWorkflowPhase2ThresholdMap } from "./workflow_baseline";
import { toPrevalenceBand } from "./services/workflow-aggregate.service";
import {
  computeReliabilityFactor,
  reliabilityComponentsFromCounts
} from "./value_realization/reliability_factor";

export const PATTERN_ORDER: FluencyPatternName[] = [
  "Calibrated Fluency",
  "Blind Efficiency",
  "Recovery Maturity",
  "Friction Loop",
  "Undertrust Avoidance"
];

export const emptyPatternDistribution = (): Record<FluencyPatternName, number> => ({
  "Calibrated Fluency": 0,
  "Blind Efficiency": 0,
  "Recovery Maturity": 0,
  "Friction Loop": 0,
  "Undertrust Avoidance": 0
});

export type ObservabilityPrevalenceBand = "LOW" | "MODERATE" | "HIGH";

export const emptyCategoricalPatternDistribution = (): Record<FluencyPatternName, ObservabilityPrevalenceBand> => ({
  "Calibrated Fluency": "LOW",
  "Blind Efficiency": "LOW",
  "Recovery Maturity": "LOW",
  "Friction Loop": "LOW",
  "Undertrust Avoidance": "LOW"
});

export const toCategoricalPatternDistribution = (
  dist: Record<FluencyPatternName, number>,
  disclosedExecutions: number
): Record<FluencyPatternName, ObservabilityPrevalenceBand> => {
  const out = emptyCategoricalPatternDistribution();
  for (const pattern of PATTERN_ORDER) {
    const share = disclosedExecutions > 0 ? dist[pattern] / disclosedExecutions : 0;
    out[pattern] = toPrevalenceBand(share);
  }
  return out;
};

/**
 * Fail-closed org scoping: only events whose org_unit encodes this org_id.
 */
export const eventBelongsToOrg = (event: FluencyEventRecord, orgId: string): boolean => {
  if (!event.org_unit || event.org_unit.length === 0) {
    return false;
  }
  return event.org_unit === `org:${orgId}` || event.org_unit.startsWith(`org:${orgId}:`);
};

export type WorkflowObservabilityRow = {
  workflow_id: string;
  jbtd_id: string | null;
  persona_id: string | null;
  executions_total: number;
  executions_disclosed: number;
  executions_suppressed: number;
  disclosure: "ALLOWED" | "SUPPRESSED";
  suppression_reasons: string[];
  pattern_distribution: Record<FluencyPatternName, ObservabilityPrevalenceBand> | null;
  residual_patterns: { ghost_use: GhostUseStatus };
  reliability_factor: number | null;
  reliability_components: ObservabilityReliabilityComponents | null;
  /** Qualitative hints only; no scores, ranks, or trends (PRD §8). */
  allowed_interpretation_hints: string[];
};

const sliceKey = (workflowId: string, jbtdId: string | null, personaId: string | null): string =>
  JSON.stringify([workflowId, jbtdId, personaId]);

const interpretationHints = (dist: Record<FluencyPatternName, number>): string[] => {
  const hints: string[] = [];
  if (dist["Recovery Maturity"] > 0) {
    hints.push("recovery_behavior");
  }
  if (dist["Friction Loop"] > 0) {
    hints.push("friction_patterns");
  }
  if (dist["Undertrust Avoidance"] > 0) {
    hints.push("undertrust_signals");
  }
  return hints;
};

export type BuildObservabilityRollupOptions = {
  minDisclosedExecutions?: number;
  now?: Date;
  thresholdMapBuilder?: (events: FluencyEventRecord[]) => Map<string, Phase2Thresholds>;
};

/**
 * Workflow-level aggregates only. No execution IDs, event IDs, ranks, or time series.
 */
export const buildObservabilityRollup = (
  allEvents: FluencyEventRecord[],
  orgId: string,
  window: FluencyWindow,
  options: BuildObservabilityRollupOptions = {}
): WorkflowObservabilityRow[] => {
  const now = options.now ?? new Date();
  const minDisclosed = options.minDisclosedExecutions ?? MIN_COHORT_SIZE;
  const thresholdMapBuilder = options.thresholdMapBuilder ?? buildWorkflowPhase2ThresholdMap;

  const scoped = allEvents.filter((e) => eventBelongsToOrg(e, orgId));
  const windowed = filterEventsByWindow(scoped, window, now) as FluencyEventRecord[];

  const sliceKeys = [
    ...new Set(windowed.map((e) => sliceKey(e.workflow_id, e.jbtd_id ?? null, e.persona_id ?? null)))
  ].sort((a, b) => a.localeCompare(b));

  return sliceKeys.map((key) => {
    const [workflowId, jbtdId, personaId] = JSON.parse(key) as [string, string | null, string | null];
    const wfEvents = windowed.filter(
      (e) =>
        e.workflow_id === workflowId &&
        (e.jbtd_id ?? null) === jbtdId &&
        (e.persona_id ?? null) === personaId
    );
    const allWorkflowEvents = scoped.filter(
      (e) =>
        e.workflow_id === workflowId &&
        (e.jbtd_id ?? null) === jbtdId &&
        (e.persona_id ?? null) === personaId
    );
    const ghostUse = evaluateGhostUseResidual(allWorkflowEvents, window, now);
    const byExec = groupEventsByExecution(wfEvents);
    const thresholdsByWorkflow = thresholdMapBuilder(wfEvents);
    const workflowThresholds =
      thresholdsByWorkflow.get(workflowId) ?? DEFAULT_PHASE2_THRESHOLDS;
    let executions_disclosed = 0;
    let executions_suppressed = 0;
    const reliabilityCounts = {
      total: 0,
      abandonment: 0,
      frictionLoop: 0,
      recoverySuccess: 0,
      verificationPresence: 0
    };
    const dist = emptyPatternDistribution();

    for (const [, group] of byExec) {
      const trace = reconstructTrace(group);
      if (!trace) {
        continue;
      }
      const ordered = sortEventsByTimestamp(group);
      const lifecycle = computeExecutionLifecycle(ordered, trace, { now });
      const gates = toTraceGateSummary(evaluateFluencyExecutionGates(ordered, trace, lifecycle));
      const signals = computeExecutionSignals(group, trace);
      const { pattern, suppression } = runFluencyPatternSuppression({
        signals,
        thresholds: workflowThresholds,
        gates
      });
      const disclosure = evaluateExecutionDisclosure(signals, gates, suppression);
      if (disclosure.state === "ALLOWED") {
        executions_disclosed += 1;
        reliabilityCounts.total += 1;
        if (signals.abandonment_present) {
          reliabilityCounts.abandonment += 1;
        }
        if (
          signals.recovery_present &&
          (signals.last_disposition === "accepted" || signals.last_disposition === "edited")
        ) {
          reliabilityCounts.recoverySuccess += 1;
        }
        if (signals.verification_present) {
          reliabilityCounts.verificationPresence += 1;
        }
        if (pattern !== null && hasPositiveAiEvidence(group)) {
          dist[pattern] += 1;
        }
        if (pattern === "Friction Loop") {
          reliabilityCounts.frictionLoop += 1;
        }
      } else {
        executions_suppressed += 1;
      }
    }

    const executions_total = executions_disclosed + executions_suppressed;
    const suppression_reasons: string[] = [];
    let disclosure: "ALLOWED" | "SUPPRESSED" = "ALLOWED";
    let pattern_distribution: Record<FluencyPatternName, ObservabilityPrevalenceBand> | null =
      toCategoricalPatternDistribution(dist, executions_disclosed);
    let residual_patterns: { ghost_use: GhostUseStatus } = { ghost_use: ghostUse.status };
    let reliability_components: ObservabilityReliabilityComponents | null =
      reliabilityComponentsFromCounts(reliabilityCounts);
    let reliability_factor: number | null = computeReliabilityFactor(reliability_components);
    let allowed_interpretation_hints: string[] = [];

    if (executions_disclosed < minDisclosed) {
      disclosure = "SUPPRESSED";
      suppression_reasons.push("insufficient_disclosed_executions");
      pattern_distribution = null;
      residual_patterns = { ghost_use: "SUPPRESSED" };
      reliability_components = null;
      reliability_factor = null;
    } else {
      allowed_interpretation_hints = interpretationHints(dist);
      if (ghostUse.hint) {
        allowed_interpretation_hints.push(ghostUse.hint);
      }
    }

    return {
      workflow_id: workflowId,
      jbtd_id: jbtdId,
      persona_id: personaId,
      executions_total,
      executions_disclosed,
      executions_suppressed,
      disclosure,
      suppression_reasons,
      pattern_distribution,
      residual_patterns,
      reliability_factor,
      reliability_components,
      allowed_interpretation_hints
    };
  });
};
