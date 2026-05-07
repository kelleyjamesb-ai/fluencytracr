import crypto from "crypto";

import { store, AuditLogRecord } from "./store";

export const logAuditEvent = (params: {
  orgId: string;
  action: AuditLogRecord["action"];
  actorRole: string;
  metadata: AuditLogRecord["metadata"];
}) => {
  const record: AuditLogRecord = {
    id: `audit-${crypto.randomUUID()}`,
    orgId: params.orgId,
    action: params.action,
    actorRole: params.actorRole,
    metadata: params.metadata,
    timestamp: new Date().toISOString()
  };
  store.auditLogs.set(record.id, record);
  return record;
};

export const listAuditLogs = (orgId: string) => {
  return Array.from(store.auditLogs.values())
    .filter((record) => record.orgId === orgId)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
};
