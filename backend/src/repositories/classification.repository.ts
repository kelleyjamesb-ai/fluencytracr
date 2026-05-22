/**
 * Execution-level classification outcomes — interface + in-memory store.
 */

import type { BehaviorPattern } from "../services/pattern-classifier";
import type { SuppressionReason } from "../services/suppression-engine";

export type ClassificationDiagnostics = Readonly<Record<string, unknown>>;

export interface ExecutionClassificationOutcome {
  readonly org_id: string;
  readonly workflow_id: string;
  readonly jbtd_id: string | null;
  readonly persona_id: string | null;
  readonly execution_id: string;
  readonly status: "ALLOWED" | "SUPPRESSED";
  readonly pattern?: BehaviorPattern;
  readonly suppression_reason?: SuppressionReason;
  readonly signal_profile?: ClassificationDiagnostics;
  readonly diagnostics: ReadonlyArray<string>;
  readonly processed_at: string;
}

export interface ClassificationRepository {
  upsertOutcome(outcome: ExecutionClassificationOutcome): Promise<void>;
  findByExecutionId(executionId: string): Promise<ExecutionClassificationOutcome | null>;
  findByWorkflowId(workflowId: string): Promise<ReadonlyArray<ExecutionClassificationOutcome>>;
  findByOrgIdAndWorkflowId(
    orgId: string,
    workflowId: string,
    slice?: { readonly jbtd_id: string | null; readonly persona_id: string | null }
  ): Promise<ReadonlyArray<ExecutionClassificationOutcome>>;
  findByOrgId(orgId: string): Promise<ReadonlyArray<ExecutionClassificationOutcome>>;
}

export class InMemoryClassificationRepository implements ClassificationRepository {
  private byExecution = new Map<string, ExecutionClassificationOutcome>();

  async upsertOutcome(outcome: ExecutionClassificationOutcome): Promise<void> {
    this.byExecution.set(outcome.execution_id, outcome);
  }

  async findByExecutionId(executionId: string): Promise<ExecutionClassificationOutcome | null> {
    return this.byExecution.get(executionId) ?? null;
  }

  async findByWorkflowId(workflowId: string): Promise<ReadonlyArray<ExecutionClassificationOutcome>> {
    return [...this.byExecution.values()].filter((o) => o.workflow_id === workflowId);
  }

  async findByOrgIdAndWorkflowId(
    orgId: string,
    workflowId: string,
    slice?: { readonly jbtd_id: string | null; readonly persona_id: string | null }
  ): Promise<ReadonlyArray<ExecutionClassificationOutcome>> {
    return [...this.byExecution.values()].filter((o) => {
      if (o.org_id !== orgId || o.workflow_id !== workflowId) {
        return false;
      }
      if (!slice) {
        return true;
      }
      return o.jbtd_id === slice.jbtd_id && o.persona_id === slice.persona_id;
    });
  }

  async findByOrgId(orgId: string): Promise<ReadonlyArray<ExecutionClassificationOutcome>> {
    return [...this.byExecution.values()].filter((o) => o.org_id === orgId);
  }
}
