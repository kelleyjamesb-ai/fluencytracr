import crypto from "crypto";
import { PrismaClient, Prisma } from "@prisma/client";

import type { AuditStore, AuditLogEntry, ChainVerificationResult } from "./audit";
import { PostgresAuditStore } from "./audit";

let auditStore: AuditStore | null = null;

/**
 * Initialize the audit store with a PostgreSQL connection.
 * Must be called before any audit operations.
 */
export const initAuditStore = (connectionString: string): void => {
  auditStore = new PostgresAuditStore(connectionString);
};

/**
 * Get the active audit store. Throws if not initialized.
 */
export const getAuditStore = (): AuditStore => {
  if (!auditStore) {
    throw new Error("[AUDIT] Audit store not initialized. Call initAuditStore() first.");
  }
  return auditStore;
};

/**
 * Set audit store directly (for testing).
 */
export const setAuditStore = (store: AuditStore): void => {
  auditStore = store;
};

/**
 * Append an audit event. Hash chain is computed by the store.
 */
export const logAuditEvent = async (params: {
  orgId: string;
  action: string;
  actorSub: string;
  actorRole: string;
  metadata?: Record<string, unknown>;
}): Promise<AuditLogEntry> => {
  const store = getAuditStore();
  return store.append({
    id: `audit-${crypto.randomUUID()}`,
    org_id: params.orgId,
    action: params.action,
    actor_sub: params.actorSub,
    actor_role: params.actorRole,
    metadata: params.metadata ?? {},
  });
};

/**
 * Verify the hash chain for an org's audit log.
 */
export const verifyAuditChain = async (orgId: string): Promise<ChainVerificationResult> => {
  const store = getAuditStore();
  return store.verifyChain(orgId);
};
