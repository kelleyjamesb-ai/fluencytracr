/**
 * Append-only canonical event persistence — interface + in-memory implementation.
 */

import type { CanonicalEvent } from "../domain/canonical-event.schema";
import { canonicalExecutionKey } from "../integration/v1-pipeline-types";

export interface EventRepository {
  append(event: CanonicalEvent): Promise<void>;
  findByExecutionId(executionId: string): Promise<ReadonlyArray<CanonicalEvent>>;
  findByOrgId(orgId: string): Promise<ReadonlyArray<CanonicalEvent>>;
}

type StoredRow = { readonly event: CanonicalEvent; readonly seq: number };

export class InMemoryEventRepository implements EventRepository {
  private rows: StoredRow[] = [];
  private nextSeq = 0;

  async append(event: CanonicalEvent): Promise<void> {
    const seq = this.nextSeq;
    this.nextSeq += 1;
    this.rows.push({ event, seq });
  }

  async findByExecutionId(executionId: string): Promise<ReadonlyArray<CanonicalEvent>> {
    const matched = this.rows.filter((r) => canonicalExecutionKey(r.event) === executionId);
    matched.sort((a, b) => a.seq - b.seq);
    return matched.map((r) => r.event);
  }

  async findByOrgId(orgId: string): Promise<ReadonlyArray<CanonicalEvent>> {
    const matched = this.rows.filter((r) => r.event.org_id === orgId);
    matched.sort((a, b) => a.seq - b.seq);
    return matched.map((r) => r.event);
  }
}
