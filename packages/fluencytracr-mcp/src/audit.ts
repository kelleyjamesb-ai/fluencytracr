import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export type AuditResult = "success" | "rejected" | "suppressed" | "error";

export type AuditRecord = {
  timestamp_utc: string;
  request_id: string;
  org_id: string;
  actor_identity: string;
  tool_name: string;
  operation: string;
  schema_version: string;
  idempotency_key?: string;
  result: AuditResult;
  suppression_applied: boolean;
  suppression_reasons: string[];
  field_path?: string;
  reason_code?: string;
};

function line(record: AuditRecord): string {
  return `${JSON.stringify(record)}\n`;
}

export function writeAudit(record: AuditRecord): void {
  const path = process.env.FLUENCYTRACR_MCP_AUDIT_LOG;
  if (path) {
    try {
      mkdirSync(dirname(path), { recursive: true });
      appendFileSync(path, line(record), { encoding: "utf8" });
    } catch {
      console.error("[fluencytracr-mcp] audit log write failed");
    }
  } else {
    console.error(line(record).trimEnd());
  }
}
