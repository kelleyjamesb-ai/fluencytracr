/**
 * Single-workflow classification aggregation — no rankings, trends, or cross-workflow logic.
 */

import type { BehaviorPattern } from "./pattern-classifier";
import type { SuppressionReason } from "./suppression-engine";

export type PrevalenceMode = "NUMERIC_SHARE" | "CATEGORICAL_PREVALENCE";

/**
 * Default: categorical bands are preferred for executive-facing surfaces (no raw proportion exposure).
 * Use `NUMERIC_SHARE` only for controlled internal/analytic callers that need explicit shares.
 */
export const DEFAULT_PREVALENCE_MODE: PrevalenceMode = "CATEGORICAL_PREVALENCE";

/** Share strictly below this maps to prevalence `LOW`. */
export const PREVALENCE_BAND_LOW_MAX_SHARE = 0.2;

/** Share below this (and >= LOW threshold) maps to `MODERATE`; at or above maps to `HIGH`. */
export const PREVALENCE_BAND_MODERATE_MAX_SHARE = 0.5;

export interface ExecutionClassificationRecord {
  readonly workflow_id: string;
  readonly execution_id: string;
  readonly status: "ALLOWED" | "SUPPRESSED";
  readonly pattern?: BehaviorPattern;
  readonly suppression_reason?: SuppressionReason;
}

export interface WorkflowAggregateInput {
  readonly records: ReadonlyArray<ExecutionClassificationRecord>;
  readonly prevalence_mode?: PrevalenceMode;
}

export type WorkflowPatternDistribution = {
  readonly pattern: BehaviorPattern;
  readonly count: number;
  readonly share?: number;
  readonly prevalence_band?: "LOW" | "MODERATE" | "HIGH";
};

export interface WorkflowAggregateResult {
  readonly workflow_id: string;
  readonly classified_execution_count: number;
  readonly suppressed_execution_count: number;
  readonly pattern_distribution: ReadonlyArray<WorkflowPatternDistribution>;
  readonly prevalence_mode: PrevalenceMode;
}

export type WorkflowAggregateFailureReason = "MIXED_WORKFLOW" | "EMPTY_INPUT";

export type WorkflowAggregateOutput =
  | { readonly success: true; readonly result: WorkflowAggregateResult }
  | { readonly success: false; readonly failed_reason: WorkflowAggregateFailureReason };

/** Decimal places for numeric share (deterministic rounding). */
export const WORKFLOW_SHARE_DECIMALS = 4;

function roundShare(n: number): number {
  const f = 10 ** WORKFLOW_SHARE_DECIMALS;
  return Math.round(n * f) / f;
}

export function toPrevalenceBand(share: number): "LOW" | "MODERATE" | "HIGH" {
  if (share < PREVALENCE_BAND_LOW_MAX_SHARE) {
    return "LOW";
  }
  if (share < PREVALENCE_BAND_MODERATE_MAX_SHARE) {
    return "MODERATE";
  }
  return "HIGH";
}

export function computePatternDistribution(
  records: ReadonlyArray<ExecutionClassificationRecord>,
  prevalenceMode: PrevalenceMode = DEFAULT_PREVALENCE_MODE
): ReadonlyArray<WorkflowPatternDistribution> {
  const allowed = records.filter((r) => r.status === "ALLOWED" && r.pattern !== undefined);
  const denom = allowed.length;
  if (denom === 0) {
    return Object.freeze([]);
  }
  const counts = new Map<BehaviorPattern, number>();
  for (const r of allowed) {
    const p = r.pattern!;
    counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  const out: WorkflowPatternDistribution[] = [];
  for (const [pattern, count] of [...counts.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const rawShare = count / denom;
    if (prevalenceMode === "NUMERIC_SHARE") {
      out.push({
        pattern,
        count,
        share: roundShare(rawShare)
      });
    } else {
      out.push({
        pattern,
        count,
        prevalence_band: toPrevalenceBand(rawShare)
      });
    }
  }
  return Object.freeze(out);
}

export function aggregateWorkflowClassifications(
  input: WorkflowAggregateInput
): WorkflowAggregateOutput {
  const { records } = input;
  const prevalence_mode = input.prevalence_mode ?? DEFAULT_PREVALENCE_MODE;

  if (records.length === 0) {
    return { success: false, failed_reason: "EMPTY_INPUT" };
  }
  const wf = new Set(records.map((r) => r.workflow_id));
  if (wf.size !== 1) {
    return { success: false, failed_reason: "MIXED_WORKFLOW" };
  }
  const workflow_id = records[0]!.workflow_id;
  const suppressed_execution_count = records.filter((r) => r.status === "SUPPRESSED").length;
  const classified_execution_count = records.filter((r) => r.status === "ALLOWED").length;
  const pattern_distribution = computePatternDistribution(records, prevalence_mode);

  return {
    success: true,
    result: {
      workflow_id,
      classified_execution_count,
      suppressed_execution_count,
      pattern_distribution,
      prevalence_mode
    }
  };
}
