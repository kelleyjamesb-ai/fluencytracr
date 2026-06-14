import crypto from "crypto";

import type { Prisma } from "@prisma/client";
import { getPrisma } from "./db";
import type { WorkflowObservabilityRow } from "./observability_aggregate";
import { store, type SuppressionAuditLogRecord } from "./store";
import { isFluencyCanonicalPersistenceEnabled } from "./services/fluency-canonical-persistence";

type SuppressionAuditParams = {
  orgId: string;
  workflowId: string;
  executionId?: string;
  suppressionReason: string;
  diagnostics?: Record<string, unknown>;
  decidedAt?: string;
};

export const logSuppressionAuditDecision = async (
  params: SuppressionAuditParams
): Promise<SuppressionAuditLogRecord> => {
  const decidedAt = params.decidedAt ?? new Date().toISOString();
  const record: SuppressionAuditLogRecord = {
    id: `suppression-audit-${crypto.randomUUID()}`,
    orgId: params.orgId,
    workflowId: params.workflowId,
    executionId: params.executionId ?? `workflow:${params.workflowId}`,
    suppressionReason: params.suppressionReason,
    diagnostics: params.diagnostics ?? {},
    decidedAt
  };

  if (isFluencyCanonicalPersistenceEnabled()) {
    const prisma = getPrisma();
    await prisma.v1SuppressionAuditLog.create({
      data: {
        id: record.id.replace(/^suppression-audit-/, ""),
        orgId: record.orgId,
        workflowId: record.workflowId,
        executionId: record.executionId,
        suppressionReason: record.suppressionReason,
        diagnosticsJson: record.diagnostics as Prisma.InputJsonValue,
        createdAt: new Date(decidedAt)
      }
    });
  }

  store.suppressionAuditLogs.set(record.id, record);
  return record;
};

export const auditSuppressedObservabilityRows = async (
  orgId: string,
  rows: WorkflowObservabilityRow[],
  decidedAt = new Date().toISOString()
): Promise<SuppressionAuditLogRecord[]> => {
  const written: SuppressionAuditLogRecord[] = [];
  for (const row of rows) {
    if (row.disclosure !== "SUPPRESSED") {
      continue;
    }
    const reasons = row.suppression_reasons.length > 0 ? row.suppression_reasons : ["unknown"];
    for (const reason of reasons) {
      written.push(
        await logSuppressionAuditDecision({
          orgId,
          workflowId: row.workflow_id,
          suppressionReason: reason,
          decidedAt,
          diagnostics: {
            source: "observability_rollup",
            executions_total: row.executions_total,
            executions_disclosed: row.executions_disclosed,
            executions_suppressed: row.executions_suppressed,
            suppression_reasons: row.suppression_reasons
          }
        })
      );
    }
  }
  return written;
};

export const listSuppressionAuditLogs = (orgId: string) =>
  Array.from(store.suppressionAuditLogs.values())
    .filter((record) => record.orgId === orgId)
    .sort((a, b) => b.decidedAt.localeCompare(a.decidedAt))
    .map((record) => ({
      id: record.id,
      org_id: record.orgId,
      workflow_id: record.workflowId,
      execution_id: record.executionId,
      suppression_reason: record.suppressionReason,
      diagnostics: record.diagnostics,
      decided_at: record.decidedAt
    }));
