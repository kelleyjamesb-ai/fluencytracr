import { z } from "zod";

export const EvidenceWindowSchema = z.enum([
  "daily",
  "weekly",
  "30d",
  "60d",
  "90d",
  "180d",
  "360d",
  "3m",
  "6m",
  "12m"
]);

export type EvidenceWindow = z.infer<typeof EvidenceWindowSchema>;

export function getFluencyBaseUrl(): string {
  const u = process.env.FLUENCYTRACR_BASE_URL ?? "http://localhost:3000";
  return u.replace(/\/$/, "");
}

export function getSchemaVersionHeader(): string {
  return process.env.FLUENCYTRACR_SCHEMA_VERSION ?? "0.1";
}

export function getActorIdentity(): string {
  return process.env.FLUENCYTRACR_MCP_ACTOR ?? "mcp_adapter";
}

/** Headers for FluencyTracr API (per-request org for dev headers). */
export function fluencyAuthHeaders(orgId: string): Record<string, string> {
  const token = process.env.FLUENCYTRACR_SERVICE_TOKEN;
  if (token && token.length > 0) {
    return { Authorization: `Bearer ${token}` };
  }
  if (process.env.FLUENCYTRACR_DEV_HEADERS === "true" || process.env.FLUENCYTRACR_DEV_HEADERS === "1") {
    const role = process.env.FLUENCYTRACR_DEV_ROLE ?? "GOV_OPERATOR";
    return {
      "x-role": role,
      "x-org-id": orgId
    };
  }
  return {};
}
