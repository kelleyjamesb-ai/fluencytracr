/**
 * Workflow-level aggregate results — interface + in-memory implementation.
 */

import type { WorkflowAggregateResult } from "../services/workflow-aggregate.service";

export interface WorkflowAggregateRepository {
  upsertAggregate(result: WorkflowAggregateResult, orgId: string): Promise<void>;
  findByOrgId(orgId: string): Promise<ReadonlyArray<WorkflowAggregateResult>>;
  findByWorkflowId(orgId: string, workflowId: string): Promise<WorkflowAggregateResult | null>;
}

type StoredAggregate = { readonly result: WorkflowAggregateResult; readonly org_id: string };

export class InMemoryWorkflowAggregateRepository implements WorkflowAggregateRepository {
  private byKey = new Map<string, StoredAggregate>();

  private key(orgId: string, workflowId: string): string {
    return `${orgId}::${workflowId}`;
  }

  async upsertAggregate(result: WorkflowAggregateResult, orgId: string): Promise<void> {
    this.byKey.set(this.key(orgId, result.workflow_id), { result, org_id: orgId });
  }

  async findByOrgId(orgId: string): Promise<ReadonlyArray<WorkflowAggregateResult>> {
    const out: WorkflowAggregateResult[] = [];
    for (const v of this.byKey.values()) {
      if (v.org_id === orgId) {
        out.push(v.result);
      }
    }
    out.sort((a, b) => a.workflow_id.localeCompare(b.workflow_id));
    return out;
  }

  async findByWorkflowId(orgId: string, workflowId: string): Promise<WorkflowAggregateResult | null> {
    return this.byKey.get(this.key(orgId, workflowId))?.result ?? null;
  }
}
