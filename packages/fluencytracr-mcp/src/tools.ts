import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FluencyEventSchema } from "@learnaire/shared";
import { EvidenceWindowSchema, getActorIdentity, getSchemaVersionHeader } from "./config.js";
import { findForbiddenField } from "./forbiddenScan.js";
import { writeAudit, type AuditRecord } from "./audit.js";
import { getEvidenceJson, postIngest, type FetchFn } from "./fluencyClient.js";
import { randomUUID } from "node:crypto";

const IngestInputSchema = z.object({
  org_id: z.string().min(1),
  window: EvidenceWindowSchema,
  events: z.array(FluencyEventSchema).min(1),
  idempotency_key: z.string().min(1),
  schema_version: z.string().min(1)
});

const ReadInputSchema = z.object({
  org_id: z.string().min(1),
  window: EvidenceWindowSchema
});

function readSuppression(meta: unknown): { applied: boolean; reasons: string[] } {
  if (!meta || typeof meta !== "object") {
    return { applied: false, reasons: [] };
  }
  const s = (meta as { suppression?: { suppression_applied?: boolean; suppression_reasons?: string[] } })
    .suppression;
  if (!s) {
    return { applied: false, reasons: [] };
  }
  return {
    applied: Boolean(s.suppression_applied),
    reasons: Array.isArray(s.suppression_reasons) ? s.suppression_reasons : []
  };
}

function emitAudit(partial: Omit<AuditRecord, "timestamp_utc" | "request_id" | "actor_identity">): void {
  const full: AuditRecord = {
    ...partial,
    timestamp_utc: new Date().toISOString(),
    request_id: randomUUID(),
    actor_identity: getActorIdentity()
  };
  writeAudit(full);
}

function toolError(message: string, extra?: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ error: message, ...extra }, null, 2) }],
    isError: true as const
  };
}

export function registerFluencyTools(server: McpServer, fetchImpl: FetchFn = fetch): void {
  server.registerTool(
    "fluency.ingest_events",
    {
      description:
        "Ingest metadata-only Fluency events for an org. Forwards to POST /api/ingest. Window is recorded for audit only.",
      inputSchema: {
        org_id: z.string().min(1),
        window: EvidenceWindowSchema,
        events: z.array(FluencyEventSchema).min(1),
        idempotency_key: z.string().min(1),
        schema_version: z.string().min(1)
      }
    },
    async (raw) => {
      const forbiddenEarly = findForbiddenField(raw);
      if (forbiddenEarly) {
        emitAudit({
          org_id: typeof (raw as { org_id?: string })?.org_id === "string" ? (raw as { org_id: string }).org_id : "",
          tool_name: "fluency.ingest_events",
          operation: "ingest",
          schema_version:
            typeof (raw as { schema_version?: string })?.schema_version === "string"
              ? (raw as { schema_version: string }).schema_version
              : "",
          idempotency_key:
            typeof (raw as { idempotency_key?: string })?.idempotency_key === "string"
              ? (raw as { idempotency_key: string }).idempotency_key
              : undefined,
          result: "rejected",
          suppression_applied: false,
          suppression_reasons: [],
          reason_code: "forbidden_field",
          field_path: forbiddenEarly.path
        });
        return toolError("Forbidden field in ingest payload", {
          field_path: forbiddenEarly.path,
          reason_code: "forbidden_field"
        });
      }
      const parsed = IngestInputSchema.safeParse(raw);
      if (!parsed.success) {
        emitAudit({
          org_id: typeof raw?.org_id === "string" ? raw.org_id : "",
          tool_name: "fluency.ingest_events",
          operation: "ingest",
          schema_version: typeof raw?.schema_version === "string" ? raw.schema_version : "",
          idempotency_key: typeof raw?.idempotency_key === "string" ? raw.idempotency_key : undefined,
          result: "rejected",
          suppression_applied: false,
          suppression_reasons: [],
          reason_code: "invalid_payload",
          field_path: parsed.error.issues[0]?.path.join(".")
        });
        return toolError("Invalid ingest tool input", { issues: parsed.error.issues });
      }
      const input = parsed.data;
      for (const ev of input.events) {
        const ou = ev.org_unit;
        if (typeof ou === "string" && ou.length > 0) {
          const prefix = `org:${input.org_id}`;
          if (ou !== prefix && !ou.startsWith(`${prefix}:`)) {
            emitAudit({
              org_id: input.org_id,
              tool_name: "fluency.ingest_events",
              operation: "ingest",
              schema_version: input.schema_version,
              idempotency_key: input.idempotency_key,
              result: "rejected",
              suppression_applied: false,
              suppression_reasons: [],
              reason_code: "org_mismatch",
              field_path: "events[].org_unit"
            });
            return toolError("Event org_unit does not match tool org_id", { org_id: input.org_id });
          }
        }
      }
      try {
        const body = await postIngest(
          input.org_id,
          {
            events: input.events,
            idempotencyKey: input.idempotency_key,
            schemaVersion: input.schema_version
          },
          fetchImpl
        );
        emitAudit({
          org_id: input.org_id,
          tool_name: "fluency.ingest_events",
          operation: "ingest",
          schema_version: input.schema_version,
          idempotency_key: input.idempotency_key,
          result: "success",
          suppression_applied: false,
          suppression_reasons: []
        });
        return { content: [{ type: "text", text: JSON.stringify(body, null, 2) }] };
      } catch (e) {
        emitAudit({
          org_id: input.org_id,
          tool_name: "fluency.ingest_events",
          operation: "ingest",
          schema_version: input.schema_version,
          idempotency_key: input.idempotency_key,
          result: "error",
          suppression_applied: false,
          suppression_reasons: [],
          reason_code: "upstream_error"
        });
        const msg = e instanceof Error ? e.message : String(e);
        return toolError(msg);
      }
    }
  );

  const registerRead = (
    name: "fluency.get_evidence_bundle" | "fluency.get_coverage_map" | "fluency.get_control_evidence",
    path: "bundles" | "coverage" | "controls",
    description: string
  ) => {
    server.registerTool(
      name,
      {
        description,
        inputSchema: {
          org_id: z.string().min(1),
          window: EvidenceWindowSchema
        }
      },
      async (raw) => {
        const parsed = ReadInputSchema.safeParse(raw);
        if (!parsed.success) {
          emitAudit({
            org_id: typeof raw?.org_id === "string" ? raw.org_id : "",
            tool_name: name,
            operation: path,
            schema_version: getSchemaVersionHeader(),
            result: "rejected",
            suppression_applied: false,
            suppression_reasons: [],
            reason_code: "invalid_payload"
          });
          return toolError("Invalid read tool input", { issues: parsed.error.issues });
        }
        const { org_id, window } = parsed.data;
        try {
          const body = await getEvidenceJson(org_id, path, window, fetchImpl);
          const { applied, reasons } = readSuppression(body);
          emitAudit({
            org_id,
            tool_name: name,
            operation: path,
            schema_version: getSchemaVersionHeader(),
            result: applied ? "suppressed" : "success",
            suppression_applied: applied,
            suppression_reasons: reasons
          });
          return { content: [{ type: "text", text: JSON.stringify(body, null, 2) }] };
        } catch (e) {
          emitAudit({
            org_id,
            tool_name: name,
            operation: path,
            schema_version: getSchemaVersionHeader(),
            result: "error",
            suppression_applied: false,
            suppression_reasons: [],
            reason_code: "upstream_error"
          });
          const msg = e instanceof Error ? e.message : String(e);
          return toolError(msg);
        }
      }
    );
  };

  registerRead(
    "fluency.get_evidence_bundle",
    "bundles",
    "GET /api/evidence/bundles — full EvidenceBundle v1 JSON for org-window."
  );
  registerRead(
    "fluency.get_coverage_map",
    "coverage",
    "GET /api/evidence/coverage — coverage slice of the EvidenceBundle."
  );
  registerRead(
    "fluency.get_control_evidence",
    "controls",
    "GET /api/evidence/controls — exposure/calibration/fragility/learning controls slice."
  );
}

export function createFluencyMcpServer(fetchImpl: FetchFn = fetch): McpServer {
  const server = new McpServer(
    { name: "fluencytracr-mcp", version: "0.1.0" },
    { instructions: "FluencyTracr governance MCP adapter. Org-level evidence only; no raw content fields." }
  );
  registerFluencyTools(server, fetchImpl);
  return server;
}
