/**
 * Framework-agnostic handler for `GET /api/observability/:orgId` — workflow-level aggregates only.
 * Executive boundary: always categorical prevalence bands — never numeric share in the response.
 */

import type { WorkflowAggregateRepository } from "../repositories/workflow-aggregate.repository";

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
  readonly jbtd_id: string | null;
  readonly persona_id: string | null;
  readonly privacy_decision: "HOLD";
  readonly classified_execution_count: number;
  readonly suppressed_execution_count: number;
  readonly pattern_distribution: ReadonlyArray<ObservabilityPatternRow>;
  /** Always categorical at this boundary regardless of stored aggregate mode. */
  readonly prevalence_mode: "CATEGORICAL_PREVALENCE";
};

export async function handleGetObservability(
  orgId: string,
  deps: GetObservabilityControllerDeps
): Promise<{ readonly status: number; readonly body: unknown }> {
  const trimmed = orgId.trim();
  if (trimmed.length === 0) {
    return { status: 400, body: { error: "org_id_required" } };
  }

  void deps;
  const workflows: ObservabilityWorkflowPayload[] = [];

  return {
    status: 200,
    body: {
      org_id: trimmed,
      workflows
    }
  };
}
