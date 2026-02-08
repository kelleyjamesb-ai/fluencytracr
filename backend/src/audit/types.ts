export type AuditLogEntry = {
  id: string;
  org_id: string;
  action: string;
  actor_sub: string;
  actor_role: string;
  metadata: Record<string, unknown>;
  entry_hash: string;
  previous_entry_hash: string;
  created_at: string;
};

export type ChainVerificationResult = {
  valid: boolean;
  broken_at_id?: string;
  entries_checked: number;
};

/**
 * Append-only audit store contract.
 * No update(). No delete(). No clear(). The interface IS the enforcement.
 */
export interface AuditStore {
  append(entry: Omit<AuditLogEntry, "entry_hash" | "previous_entry_hash" | "created_at">): Promise<AuditLogEntry>;
  list(orgId: string): Promise<AuditLogEntry[]>;
  verifyChain(orgId: string): Promise<ChainVerificationResult>;
}
