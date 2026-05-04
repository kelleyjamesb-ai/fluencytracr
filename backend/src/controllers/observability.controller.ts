/**
 * Framework-agnostic handler for `GET /api/observability/:orgId` — workflow-level aggregates only.
 * Executive boundary: always categorical prevalence bands — never numeric share in the response.
 */

import type { WorkflowAggregateRepository } from "../repositories/workflow-aggregate.repository";
import type { WorkflowPatternDistribution } from "../services/workflow-aggregate.service";
import { toPrevalenceBand } from "../services/workflow-aggregate.service";

export interface GetObservabilityControllerDeps {
  readonly workflowAggregateRepository: WorkflowAggregateRepository;
}

export type ObservabilityPatternRow = {
  readonly pattern: string;
  readonly count: number;
  readonly prevalence_band: "LOW" | "MODERATE" | "HIGH";
};

export type ObservabilityWorkflowPayload = {
  readonly workflow_id: string;
  readonly classified_execution_count: number;
  readonly suppressed_execution_count: number;
  readonly pattern_distribution: ReadonlyArray<ObservabilityPatternRow>;
  /** Always categorical at this boundary regardless of stored aggregate mode. */
  readonly prevalence_mode: "CATEGORICAL_PREVALENCE";
};

function toExecutivePatternRows(
  rows: ReadonlyArray<WorkflowPatternDistribution>,
  classified_execution_count: number
): ReadonlyArray<ObservabilityPatternRow> {
  return rows.map((p) => {
    let prevalence_band: "LOW" | "MODERATE" | "HIGH";
    if (p.prevalence_band !== undefined) {
      prevalence_band = p.prevalence_band;
    } else if (p.share !== undefined) {
      prevalence_band = toPrevalenceBand(p.share);
    } else if (classified_execution_count > 0) {
      prevalence_band = toPrevalenceBand(p.count / classified_execution_count);
    } else {
      prevalence_band = "LOW";
    }
    return {
      pattern: p.pattern,
      count: p.count,
      prevalence_band
    };
  });
}

export async function handleGetObservability(
  orgId: string,
  deps: GetObservabilityControllerDeps
): Promise<{ readonly status: number; readonly body: unknown }> {
  const trimmed = orgId.trim();
  if (trimmed.length === 0) {
    return { status: 400, body: { error: "org_id_required" } };
  }

  const workflowsRaw = await deps.workflowAggregateRepository.findByOrgId(trimmed);
  const workflows: ObservabilityWorkflowPayload[] = workflowsRaw.map((w) => ({
    workflow_id: w.workflow_id,
    classified_execution_count: w.classified_execution_count,
    suppressed_execution_count: w.suppressed_execution_count,
    pattern_distribution: toExecutivePatternRows(w.pattern_distribution, w.classified_execution_count),
    prevalence_mode: "CATEGORICAL_PREVALENCE"
  }));

  return {
    status: 200,
    body: {
      org_id: trimmed,
      workflows
    }
  };
}
