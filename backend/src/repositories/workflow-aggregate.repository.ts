/**
 * Workflow-level aggregate results — interface + in-memory implementation.
 */

import type { WorkflowAggregateResult } from "../services/workflow-aggregate.service";

export interface WorkflowAggregateRepository {
  upsertAggregate(result: WorkflowAggregateResult, orgId: string): Promise<void>;
  replaceWorkflowAggregates(
    orgId: string,
    workflowId: string,
    results: ReadonlyArray<WorkflowAggregateResult>
  ): Promise<void>;
  findByOrgId(orgId: string): Promise<ReadonlyArray<WorkflowAggregateResult>>;
  findByWorkflowId(
    orgId: string,
    workflowId: string,
    slice?: { readonly jbtd_id?: string | null; readonly persona_id?: string | null }
  ): Promise<WorkflowAggregateResult | null>;
}

type StoredAggregate = { readonly result: WorkflowAggregateResult; readonly org_id: string };

export class InMemoryWorkflowAggregateRepository implements WorkflowAggregateRepository {
  private byKey = new Map<string, StoredAggregate>();

  private key(orgId: string, workflowId: string, jbtdId: string | null, personaId: string | null): string {
    return `${orgId}::${workflowId}::${jbtdId ?? ""}::${personaId ?? ""}`;
  }

  async upsertAggregate(result: WorkflowAggregateResult, orgId: string): Promise<void> {
    this.byKey.set(
      this.key(orgId, result.workflow_id, result.jbtd_id, result.persona_id),
      { result, org_id: orgId }
    );
  }

  async replaceWorkflowAggregates(
    orgId: string,
    workflowId: string,
    results: ReadonlyArray<WorkflowAggregateResult>
  ): Promise<void> {
    for (const [key, value] of this.byKey.entries()) {
      if (value.org_id === orgId && value.result.workflow_id === workflowId) {
        this.byKey.delete(key);
      }
    }
    for (const result of results) {
      await this.upsertAggregate(result, orgId);
    }
  }

  async findByOrgId(orgId: string): Promise<ReadonlyArray<WorkflowAggregateResult>> {
    const out: WorkflowAggregateResult[] = [];
    for (const v of this.byKey.values()) {
      if (v.org_id === orgId) {
        out.push(v.result);
      }
    }
    out.sort((a, b) => {
      const byWorkflow = a.workflow_id.localeCompare(b.workflow_id);
      if (byWorkflow !== 0) {
        return byWorkflow;
      }
      const byJbtd = (a.jbtd_id ?? "").localeCompare(b.jbtd_id ?? "");
      if (byJbtd !== 0) {
        return byJbtd;
      }
      return (a.persona_id ?? "").localeCompare(b.persona_id ?? "");
    });
    return out;
  }

  async findByWorkflowId(
    orgId: string,
    workflowId: string,
    slice?: { readonly jbtd_id?: string | null; readonly persona_id?: string | null }
  ): Promise<WorkflowAggregateResult | null> {
    return this.byKey.get(
      this.key(orgId, workflowId, slice?.jbtd_id ?? null, slice?.persona_id ?? null)
    )?.result ?? null;
  }
}
