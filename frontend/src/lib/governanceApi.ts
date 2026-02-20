import type {
  ComplianceEventsResponse,
  ComplianceStatusResponse,
  MappingResponse,
  PoliciesResponse,
  SandboxResetResponse,
  SandboxSeedResponse
} from "../types/governance";
import { authFetch } from "../auth";

type GovernanceContext = {
  orgId: string;
  role: string;
};

export class GovernanceApiError extends Error {
  status: number;
  payload?: unknown;
  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "GovernanceApiError";
    this.status = status;
    this.payload = payload;
  }
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").trim().replace(/\/+$/, "");
const withApiBase = (path: string) => (apiBaseUrl ? `${apiBaseUrl}${path}` : path);

const fetchJson = async <T>(role: string, input: RequestInfo | URL, init: RequestInit = {}) => {
  const response = await authFetch(role, input, init);
  if (!response.ok) {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    const errorMessage =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof (payload as Record<string, unknown>).error === "string"
        ? ((payload as Record<string, unknown>).error as string)
        : `Request failed: ${response.status}`;
    throw new GovernanceApiError(errorMessage, response.status, payload);
  }
  return (await response.json()) as T;
};

export const governanceApi = {
  getComplianceStatus: (ctx: GovernanceContext) =>
    fetchJson<ComplianceStatusResponse>(ctx.role, withApiBase(`/orgs/${ctx.orgId}/compliance/status`)),

  getComplianceEvents: (ctx: GovernanceContext, limit = 8) =>
    fetchJson<ComplianceEventsResponse>(ctx.role, withApiBase(`/orgs/${ctx.orgId}/compliance/events?limit=${limit}`)),

  patchComplianceMode: (ctx: GovernanceContext, mode: "shadow" | "enforced", rationale: string) =>
    fetchJson<{ mode: "shadow" | "enforced" }>(ctx.role, withApiBase(`/orgs/${ctx.orgId}/compliance/mode`), {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "X-FluencyTracr-Schema-Version": "0.1"
      },
      body: JSON.stringify({ mode, rationale })
    }),

  listPolicies: (ctx: GovernanceContext) =>
    fetchJson<PoliciesResponse>(ctx.role, withApiBase(`/orgs/${ctx.orgId}/policies`)),

  getPolicyMapping: (ctx: GovernanceContext, policyId: string) =>
    fetchJson<MappingResponse>(ctx.role, withApiBase(`/orgs/${ctx.orgId}/policies/${policyId}/mapping`)),

  uploadPolicy: (
    ctx: GovernanceContext,
    fileName: string,
    content: string,
    contentType = "text/plain"
  ) =>
    fetchJson<{ policy_id: string }>(ctx.role, withApiBase(`/orgs/${ctx.orgId}/policies/upload`), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-FluencyTracr-Schema-Version": "0.1"
      },
      body: JSON.stringify({
        file_name: fileName,
        content_type: contentType,
        content
      })
    }),

  updatePolicy: (
    ctx: GovernanceContext,
    policyId: string,
    updates: { fileName?: string; contentType?: string; content?: string }
  ) =>
    fetchJson<{ policy_id: string; updated_at: string; mapping_invalidated: boolean; clause_count: number }>(
      ctx.role,
      withApiBase(`/orgs/${ctx.orgId}/policies/${policyId}`),
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "X-FluencyTracr-Schema-Version": "0.1"
        },
        body: JSON.stringify({
          ...(updates.fileName ? { file_name: updates.fileName } : {}),
          ...(updates.contentType ? { content_type: updates.contentType } : {}),
          ...(updates.content ? { content: updates.content } : {})
        })
      }
    ),

  deletePolicy: (ctx: GovernanceContext, policyId: string) =>
    fetchJson<{ policy_id: string; deleted: boolean; removed_mappings: number }>(
      ctx.role,
      withApiBase(`/orgs/${ctx.orgId}/policies/${policyId}`),
      {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
          "X-FluencyTracr-Schema-Version": "0.1"
        },
        body: JSON.stringify({})
      }
    ),

  mapPolicy: (ctx: GovernanceContext, policyId: string) =>
    fetchJson<MappingResponse>(ctx.role, withApiBase(`/orgs/${ctx.orgId}/policies/${policyId}/map`), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-FluencyTracr-Schema-Version": "0.1"
      },
      body: JSON.stringify({})
    }),

  seedSyntheticPolicies: (ctx: GovernanceContext) =>
    fetchJson<SandboxSeedResponse>(ctx.role, withApiBase(`/orgs/${ctx.orgId}/sandbox/seed-synthetic`), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-FluencyTracr-Schema-Version": "0.1"
      },
      body: JSON.stringify({})
    }),

  resetSandbox: (ctx: GovernanceContext) =>
    fetchJson<SandboxResetResponse>(ctx.role, withApiBase(`/orgs/${ctx.orgId}/sandbox/reset`), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-FluencyTracr-Schema-Version": "0.1"
      },
      body: JSON.stringify({})
    }),

  createOrg: (ctx: GovernanceContext, name: string, orgId?: string) =>
    fetchJson<{ org_id: string; name: string; created_at: string; min_group_size: number }>(
      ctx.role,
      withApiBase("/orgs"),
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          minGroupSize: 10,
          ...(orgId ? { orgId } : {})
        })
      }
    )
};
