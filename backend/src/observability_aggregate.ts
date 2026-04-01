import type { FluencyPatternName, FluencyWindow } from "@learnaire/shared";
import { classifyExecutionPattern, computeExecutionSignals } from "./execution_signals";
import { evaluateExecutionDisclosure } from "./execution_disclosure";
import type { FluencyEventRecord } from "./store";
import { filterEventsByWindow, MIN_COHORT_SIZE } from "./fluencytracr";
import { groupEventsByExecution, reconstructTrace } from "./trace_engine";

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
  executions_total: number;
  executions_disclosed: number;
  executions_suppressed: number;
  disclosure: "ALLOWED" | "SUPPRESSED";
  suppression_reasons: string[];
  pattern_distribution: Record<FluencyPatternName, number> | null;
  /** Qualitative hints only; no scores, ranks, or trends (PRD §8). */
  allowed_interpretation_hints: string[];
};

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

  const scoped = allEvents.filter((e) => eventBelongsToOrg(e, orgId));
  const windowed = filterEventsByWindow(scoped, window, now) as FluencyEventRecord[];

  const workflowIds = [...new Set(windowed.map((e) => e.workflow_id))].sort((a, b) =>
    a.localeCompare(b)
  );

  return workflowIds.map((workflowId) => {
    const wfEvents = windowed.filter((e) => e.workflow_id === workflowId);
    const byExec = groupEventsByExecution(wfEvents);
    let executions_disclosed = 0;
    let executions_suppressed = 0;
    const dist = emptyPatternDistribution();

    for (const [, group] of byExec) {
      const trace = reconstructTrace(group);
      if (!trace) {
        continue;
      }
      const signals = computeExecutionSignals(group, trace);
      const disclosure = evaluateExecutionDisclosure(signals);
      const pattern = classifyExecutionPattern(signals);
      if (disclosure.state === "ALLOWED") {
        executions_disclosed += 1;
        dist[pattern] += 1;
      } else {
        executions_suppressed += 1;
      }
    }

    const executions_total = executions_disclosed + executions_suppressed;
    const suppression_reasons: string[] = [];
    let disclosure: "ALLOWED" | "SUPPRESSED" = "ALLOWED";
    let pattern_distribution: Record<FluencyPatternName, number> | null = { ...dist };
    let allowed_interpretation_hints: string[] = [];

    if (executions_disclosed < minDisclosed) {
      disclosure = "SUPPRESSED";
      suppression_reasons.push("insufficient_disclosed_executions");
      pattern_distribution = null;
    } else {
      allowed_interpretation_hints = interpretationHints(dist);
    }

    return {
      workflow_id: workflowId,
      executions_total,
      executions_disclosed,
      executions_suppressed,
      disclosure,
      suppression_reasons,
      pattern_distribution,
      allowed_interpretation_hints
    };
  });
};
