import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FluencyEventSchema, GleanSignalReadinessMapSchema, GleanValueEvidencePackSchema } from "@learnaire/shared";
import { EvidenceWindowSchema, getActorIdentity, getSchemaVersionHeader } from "./config.js";
import { findForbiddenField } from "./forbiddenScan.js";
import { writeAudit, type AuditRecord } from "./audit.js";
import { getEvidenceJson, postIngest, type FetchFn } from "./fluencyClient.js";
import { buildAgentEvidenceResponse } from "./agentResponse.js";
import { buildAgentReadinessSummary } from "./readinessResponse.js";
import { buildValueEvidenceSummary, findValueClaimSafety } from "./valueEvidenceResponse.js";
import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

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

const SignalReadinessInputShape = {
  org_id: z.string().min(1),
  window: EvidenceWindowSchema
};

const SignalReadinessInputSchema = z.object(SignalReadinessInputShape).strict();

const ValueClaimSafetyInputShape = {
  org_id: z.string().min(1),
  window: EvidenceWindowSchema,
  claim_id: z.string().min(1)
};

const ValueClaimSafetyInputSchema = z.object(ValueClaimSafetyInputShape).strict();

const DEFAULT_GLEAN_READINESS_MAP_PATH =
  "docs/contracts/glean-signal-readiness/examples/org-northstar-source-derived-readiness-map.json";
const DEFAULT_GLEAN_VALUE_EVIDENCE_PACK_PATH =
  "docs/contracts/glean-value-evidence/examples/org-northstar-value-pack.json";

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

function readinessMapPath(): string {
  const configured = process.env.FLUENCYTRACR_GLEAN_READINESS_MAP_PATH;
  if (configured && configured.length > 0) {
    return path.resolve(configured);
  }
  return path.resolve(process.cwd(), DEFAULT_GLEAN_READINESS_MAP_PATH);
}

function valueEvidencePackPath(): string {
  const configured = process.env.FLUENCYTRACR_GLEAN_VALUE_EVIDENCE_PACK_PATH;
  if (configured && configured.length > 0) {
    return path.resolve(configured);
  }
  return path.resolve(process.cwd(), DEFAULT_GLEAN_VALUE_EVIDENCE_PACK_PATH);
}

function loadSignalReadinessMap(orgId: string, window: string): unknown {
  const payload = JSON.parse(fs.readFileSync(readinessMapPath(), "utf8"));
  const map = GleanSignalReadinessMapSchema.parse(payload);
  if (map.org_id !== orgId || map.window !== window) {
    throw new Error("signal readiness map not found for requested org-window");
  }
  return map;
}

function loadValueEvidencePack(orgId: string, window: string): unknown {
  const payload = JSON.parse(fs.readFileSync(valueEvidencePackPath(), "utf8"));
  const pack = GleanValueEvidencePackSchema.parse(payload);
  if (pack.org_id !== orgId || pack.window !== window) {
    throw new Error("value evidence pack not found for requested org-window");
  }
  return pack;
}

function valueEvidenceSuppression(raw: unknown): { applied: boolean; reasons: string[] } {
  const pack = GleanValueEvidencePackSchema.parse(raw);
  const reasons = Array.from(
    new Set(
      pack.claim_readiness.flatMap((claim) =>
        claim.language_mode === "suppressed" || claim.readiness_state === "suppressed" ? claim.reason_codes : []
      )
    )
  );
  const laneSuppressed = pack.coverage_lanes.some((lane) => lane.evidence_state === "suppressed");
  return { applied: reasons.length > 0 || laneSuppressed, reasons };
}

function signalReadinessSuppression(raw: unknown): { applied: boolean; reasons: string[] } {
  const map = GleanSignalReadinessMapSchema.parse(raw);
  const reasons = Array.from(
    new Set(
      map.entries.flatMap((entry) =>
        entry.suppression_applied || entry.readiness_status === "suppressed" ? entry.suppression_reasons : []
      )
    )
  );
  return { applied: reasons.length > 0, reasons };
}

function invalidReadinessInputResult(raw: unknown, toolName: string, operation: string, issues: unknown) {
  emitAudit({
    org_id: typeof (raw as { org_id?: string })?.org_id === "string" ? (raw as { org_id: string }).org_id : "",
    tool_name: toolName,
    operation,
    schema_version: getSchemaVersionHeader(),
    result: "rejected",
    suppression_applied: false,
    suppression_reasons: [],
    reason_code: "invalid_payload"
  });
  return toolError("Invalid signal readiness tool input", {
    reason_code: "invalid_payload",
    issues
  });
}

function invalidValueInputResult(raw: unknown, toolName: string, operation: string, issues: unknown) {
  emitAudit({
    org_id: typeof (raw as { org_id?: string })?.org_id === "string" ? (raw as { org_id: string }).org_id : "",
    tool_name: toolName,
    operation,
    schema_version: getSchemaVersionHeader(),
    result: "rejected",
    suppression_applied: false,
    suppression_reasons: [],
    reason_code: "invalid_payload"
  });
  return toolError("Invalid value evidence tool input", {
    reason_code: "invalid_payload",
    issues
  });
}

function valueSourceErrorResult(orgId: string, toolName: string, operation: string) {
  emitAudit({
    org_id: orgId,
    tool_name: toolName,
    operation,
    schema_version: getSchemaVersionHeader(),
    result: "error",
    suppression_applied: false,
    suppression_reasons: [],
    reason_code: "value_evidence_source_error"
  });
  return toolError("Value evidence source unavailable or invalid", { reason_code: "value_evidence_source_error" });
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
        inputSchema: ReadInputSchema
      },
      async ({ org_id, window }) => {
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

  server.registerTool(
    "fluency.get_signal_readiness_map",
    {
      description:
        "Return a trusted aggregate Glean Signal Readiness Map snapshot for an org-window. Does not expose raw source records.",
      inputSchema: SignalReadinessInputShape
    },
    async (raw) => {
      const parsed = SignalReadinessInputSchema.safeParse(raw);
      if (!parsed.success) {
        return invalidReadinessInputResult(
          raw,
          "fluency.get_signal_readiness_map",
          "signal_readiness_map",
          parsed.error.issues
        );
      }
      try {
        const map = loadSignalReadinessMap(parsed.data.org_id, parsed.data.window);
        const { applied, reasons } = signalReadinessSuppression(map);
        emitAudit({
          org_id: parsed.data.org_id,
          tool_name: "fluency.get_signal_readiness_map",
          operation: "signal_readiness_map",
          schema_version: getSchemaVersionHeader(),
          result: applied ? "suppressed" : "success",
          suppression_applied: applied,
          suppression_reasons: reasons
        });
        return { content: [{ type: "text", text: JSON.stringify(map, null, 2) }] };
      } catch (e) {
        emitAudit({
          org_id: parsed.data.org_id,
          tool_name: "fluency.get_signal_readiness_map",
          operation: "signal_readiness_map",
          schema_version: getSchemaVersionHeader(),
          result: "error",
          suppression_applied: false,
          suppression_reasons: [],
          reason_code: "readiness_source_error"
        });
        const msg = e instanceof Error ? e.message : String(e);
        return toolError(msg, { reason_code: "readiness_source_error" });
      }
    }
  );

  server.registerTool(
    "fluency.get_signal_readiness_summary",
    {
      description:
        "Return the strict agent-safe summary of which Glean signal families are present, missing, suppressed, or not computed.",
      inputSchema: SignalReadinessInputShape
    },
    async (raw) => {
      const parsed = SignalReadinessInputSchema.safeParse(raw);
      if (!parsed.success) {
        return invalidReadinessInputResult(
          raw,
          "fluency.get_signal_readiness_summary",
          "signal_readiness_summary",
          parsed.error.issues
        );
      }
      try {
        const map = loadSignalReadinessMap(parsed.data.org_id, parsed.data.window);
        const summary = buildAgentReadinessSummary(map);
        emitAudit({
          org_id: parsed.data.org_id,
          tool_name: "fluency.get_signal_readiness_summary",
          operation: "signal_readiness_summary",
          schema_version: getSchemaVersionHeader(),
          result: summary.suppression_applied ? "suppressed" : "success",
          suppression_applied: summary.suppression_applied,
          suppression_reasons: summary.suppression_reasons
        });
        return { content: [{ type: "text", text: JSON.stringify(summary, null, 2) }] };
      } catch (e) {
        emitAudit({
          org_id: parsed.data.org_id,
          tool_name: "fluency.get_signal_readiness_summary",
          operation: "signal_readiness_summary",
          schema_version: getSchemaVersionHeader(),
          result: "error",
          suppression_applied: false,
          suppression_reasons: [],
          reason_code: "readiness_source_error"
        });
        const msg = e instanceof Error ? e.message : String(e);
        return toolError(msg, { reason_code: "readiness_source_error" });
      }
    }
  );

  server.registerTool(
    "fluency.get_agent_evidence_summary",
    {
      description:
        "GET /api/evidence/bundles and return the strict agent-safe EvidenceBundle summary template for a Glean Agent.",
      inputSchema: ReadInputSchema
    },
    async ({ org_id, window }) => {
      try {
        const body = await getEvidenceJson(org_id, "bundles", window, fetchImpl);
        const summary = buildAgentEvidenceResponse(body);
        emitAudit({
          org_id,
          tool_name: "fluency.get_agent_evidence_summary",
          operation: "agent_summary",
          schema_version: getSchemaVersionHeader(),
          result: summary.suppression_applied ? "suppressed" : "success",
          suppression_applied: summary.suppression_applied,
          suppression_reasons: summary.suppression_reasons
        });
        return { content: [{ type: "text", text: JSON.stringify(summary, null, 2) }] };
      } catch (e) {
        emitAudit({
          org_id,
          tool_name: "fluency.get_agent_evidence_summary",
          operation: "agent_summary",
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

  server.registerTool(
    "fluency.get_value_evidence_pack",
    {
      description:
        "Return the validated aggregate Glean Value Evidence Pack snapshot for an org-window. Does not expose raw source records.",
      inputSchema: SignalReadinessInputShape
    },
    async (raw) => {
      const parsed = SignalReadinessInputSchema.safeParse(raw);
      if (!parsed.success) {
        return invalidValueInputResult(raw, "fluency.get_value_evidence_pack", "value_evidence_pack", parsed.error.issues);
      }
      try {
        const pack = loadValueEvidencePack(parsed.data.org_id, parsed.data.window);
        const { applied, reasons } = valueEvidenceSuppression(pack);
        emitAudit({
          org_id: parsed.data.org_id,
          tool_name: "fluency.get_value_evidence_pack",
          operation: "value_evidence_pack",
          schema_version: getSchemaVersionHeader(),
          result: applied ? "suppressed" : "success",
          suppression_applied: applied,
          suppression_reasons: reasons
        });
        return { content: [{ type: "text", text: JSON.stringify(pack, null, 2) }] };
      } catch (e) {
        return valueSourceErrorResult(parsed.data.org_id, "fluency.get_value_evidence_pack", "value_evidence_pack");
      }
    }
  );

  server.registerTool(
    "fluency.get_value_claim_readiness_summary",
    {
      description:
        "Return a strict Glean Agent-safe summary of value claim readiness, non-computable claims, and next instrumentation actions.",
      inputSchema: SignalReadinessInputShape
    },
    async (raw) => {
      const parsed = SignalReadinessInputSchema.safeParse(raw);
      if (!parsed.success) {
        return invalidValueInputResult(
          raw,
          "fluency.get_value_claim_readiness_summary",
          "value_claim_readiness_summary",
          parsed.error.issues
        );
      }
      try {
        const pack = loadValueEvidencePack(parsed.data.org_id, parsed.data.window);
        const summary = buildValueEvidenceSummary(pack);
        emitAudit({
          org_id: parsed.data.org_id,
          tool_name: "fluency.get_value_claim_readiness_summary",
          operation: "value_claim_readiness_summary",
          schema_version: getSchemaVersionHeader(),
          result: summary.non_computable_claims.length > 0 ? "suppressed" : "success",
          suppression_applied: summary.non_computable_claims.length > 0,
          suppression_reasons: summary.non_computable_claims.flatMap((claim) => claim.reason_codes)
        });
        return { content: [{ type: "text", text: JSON.stringify(summary, null, 2) }] };
      } catch (e) {
        return valueSourceErrorResult(
          parsed.data.org_id,
          "fluency.get_value_claim_readiness_summary",
          "value_claim_readiness_summary"
        );
      }
    }
  );

  server.registerTool(
    "fluency.evaluate_claim_safety",
    {
      description:
        "Return claim-safety state for one registered Glean value claim in an org-window. Rejects unknown extra input fields.",
      inputSchema: ValueClaimSafetyInputShape
    },
    async (raw) => {
      const parsed = ValueClaimSafetyInputSchema.safeParse(raw);
      if (!parsed.success) {
        return invalidValueInputResult(raw, "fluency.evaluate_claim_safety", "evaluate_claim_safety", parsed.error.issues);
      }
      try {
        const pack = loadValueEvidencePack(parsed.data.org_id, parsed.data.window);
        const claim = findValueClaimSafety(pack, parsed.data.claim_id);
        emitAudit({
          org_id: parsed.data.org_id,
          tool_name: "fluency.evaluate_claim_safety",
          operation: "evaluate_claim_safety",
          schema_version: getSchemaVersionHeader(),
          result: claim.language_mode === "suppressed" ? "suppressed" : "success",
          suppression_applied: claim.language_mode === "suppressed",
          suppression_reasons: claim.reason_codes
        });
        return { content: [{ type: "text", text: JSON.stringify(claim, null, 2) }] };
      } catch (e) {
        if (e instanceof Error && e.message === "value_claim_not_found") {
          emitAudit({
            org_id: parsed.data.org_id,
            tool_name: "fluency.evaluate_claim_safety",
            operation: "evaluate_claim_safety",
            schema_version: getSchemaVersionHeader(),
            result: "rejected",
            suppression_applied: false,
            suppression_reasons: [],
            reason_code: "value_claim_not_found"
          });
          return toolError("Value claim not found", { reason_code: "value_claim_not_found" });
        }
        return valueSourceErrorResult(parsed.data.org_id, "fluency.evaluate_claim_safety", "evaluate_claim_safety");
      }
    }
  );

  server.registerTool(
    "fluency.get_non_computable_value_claims",
    {
      description: "Return only suppressed or not-computed Glean value claims and reason codes for an org-window.",
      inputSchema: SignalReadinessInputShape
    },
    async (raw) => {
      const parsed = SignalReadinessInputSchema.safeParse(raw);
      if (!parsed.success) {
        return invalidValueInputResult(
          raw,
          "fluency.get_non_computable_value_claims",
          "non_computable_value_claims",
          parsed.error.issues
        );
      }
      try {
        const pack = loadValueEvidencePack(parsed.data.org_id, parsed.data.window);
        const summary = buildValueEvidenceSummary(pack);
        emitAudit({
          org_id: parsed.data.org_id,
          tool_name: "fluency.get_non_computable_value_claims",
          operation: "non_computable_value_claims",
          schema_version: getSchemaVersionHeader(),
          result: summary.non_computable_claims.length > 0 ? "suppressed" : "success",
          suppression_applied: summary.non_computable_claims.length > 0,
          suppression_reasons: summary.non_computable_claims.flatMap((claim) => claim.reason_codes)
        });
        return { content: [{ type: "text", text: JSON.stringify(summary.non_computable_claims, null, 2) }] };
      } catch (e) {
        return valueSourceErrorResult(
          parsed.data.org_id,
          "fluency.get_non_computable_value_claims",
          "non_computable_value_claims"
        );
      }
    }
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
