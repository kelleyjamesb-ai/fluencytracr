/**
 * Framework-agnostic handler for `GET /api/observability/:orgId` — workflow-level aggregates only.
 */

import type { WorkflowAggregateRepository } from "../repositories/workflow-aggregate.repository";

export interface GetObservabilityControllerDeps {
  readonly workflowAggregateRepository: WorkflowAggregateRepository;
}

export type ObservabilityWorkflowPayload = {
  readonly workflow_id: string;
  readonly classified_execution_count: number;
  readonly suppressed_execution_count: number;
  readonly pattern_distribution: ReadonlyArray<{
    readonly pattern: string;
    readonly count: number;
    readonly share?: number;
    readonly prevalence_band?: "LOW" | "MODERATE" | "HIGH";
  }>;
  readonly prevalence_mode: string;
};

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
    pattern_distribution: w.pattern_distribution.map((p) => ({
      pattern: p.pattern,
      count: p.count,
      ...(p.share !== undefined ? { share: p.share } : {}),
      ...(p.prevalence_band !== undefined ? { prevalence_band: p.prevalence_band } : {})
    })),
    prevalence_mode: w.prevalence_mode
  }));

  return {
    status: 200,
    body: {
      org_id: trimmed,
      workflows
    }
  };
}
