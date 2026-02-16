import type {
  ComplianceEventsResponse,
  ComplianceStatusResponse,
  MappingResponse,
  PoliciesResponse
} from "../types/governance";

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

const fetchJson = async <T>(input: RequestInfo | URL, init: RequestInit = {}) => {
  const response = await fetch(input, init);
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
    fetchJson<ComplianceStatusResponse>(withApiBase(`/orgs/${ctx.orgId}/compliance/status`), {
      headers: { "x-role": ctx.role }
    }),

  getComplianceEvents: (ctx: GovernanceContext, limit = 8) =>
    fetchJson<ComplianceEventsResponse>(
      withApiBase(`/orgs/${ctx.orgId}/compliance/events?limit=${limit}`),
      {
      headers: { "x-role": ctx.role }
      }
    ),

  patchComplianceMode: (ctx: GovernanceContext, mode: "shadow" | "enforced", rationale: string) =>
    fetchJson<{ mode: "shadow" | "enforced" }>(withApiBase(`/orgs/${ctx.orgId}/compliance/mode`), {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "x-role": ctx.role,
        "X-FluencyTracr-Schema-Version": "0.1"
      },
      body: JSON.stringify({ mode, rationale })
    }),

  listPolicies: (ctx: GovernanceContext) =>
    fetchJson<PoliciesResponse>(withApiBase(`/orgs/${ctx.orgId}/policies`), {
      headers: { "x-role": ctx.role }
    }),

  getPolicyMapping: (ctx: GovernanceContext, policyId: string) =>
    fetchJson<MappingResponse>(withApiBase(`/orgs/${ctx.orgId}/policies/${policyId}/mapping`), {
      headers: { "x-role": ctx.role }
    }),

  uploadPolicy: (
    ctx: GovernanceContext,
    fileName: string,
    content: string,
    contentType = "text/plain"
  ) =>
    fetchJson<{ policy_id: string }>(withApiBase(`/orgs/${ctx.orgId}/policies/upload`), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-role": ctx.role,
        "X-FluencyTracr-Schema-Version": "0.1"
      },
      body: JSON.stringify({
        file_name: fileName,
        content_type: contentType,
        content
      })
    }),

  mapPolicy: (ctx: GovernanceContext, policyId: string) =>
    fetchJson<MappingResponse>(withApiBase(`/orgs/${ctx.orgId}/policies/${policyId}/map`), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-role": ctx.role,
        "X-FluencyTracr-Schema-Version": "0.1"
      },
      body: JSON.stringify({})
    }),

  createOrg: (name: string) =>
    fetchJson<{ org_id: string; name: string; created_at: string; min_group_size: number }>(
      withApiBase("/orgs"),
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          name,
          minGroupSize: 10
        })
      }
    )
};
