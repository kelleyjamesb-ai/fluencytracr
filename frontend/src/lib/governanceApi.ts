import type {
  ComplianceEventsResponse,
  ComplianceStatusResponse,
  MappingResponse,
  PoliciesResponse,
  SandboxResetResponse,
  SandboxSeedResponse
} from "../types/governance";
import type {
  OrientationWorkflowVisibilitySummaryResponse,
  BoardSnapshotResponse
} from "@learnaire/shared";

export type WorkflowsResponse = {
  org_id: string;
  workflows: {
    workflow_id: string;
    display_name: string;
    risk_class: string;
    version: number;
    visibility_state: string;
    dominant_pattern: string | null;
    updated_at: string;
  }[];
};

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

  updatePolicy: (
    ctx: GovernanceContext,
    policyId: string,
    updates: { fileName?: string; contentType?: string; content?: string }
  ) =>
    fetchJson<{ policy_id: string; updated_at: string; mapping_invalidated: boolean; clause_count: number }>(
      withApiBase(`/orgs/${ctx.orgId}/policies/${policyId}`),
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-role": ctx.role,
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
      withApiBase(`/orgs/${ctx.orgId}/policies/${policyId}`),
      {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
          "x-role": ctx.role,
          "X-FluencyTracr-Schema-Version": "0.1"
        },
        body: JSON.stringify({})
      }
    ),

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

  seedSyntheticPolicies: (ctx: GovernanceContext) =>
    fetchJson<SandboxSeedResponse>(withApiBase(`/orgs/${ctx.orgId}/sandbox/seed-synthetic`), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-role": ctx.role,
        "X-FluencyTracr-Schema-Version": "0.1"
      },
      body: JSON.stringify({})
    }),

  resetSandbox: (ctx: GovernanceContext) =>
    fetchJson<SandboxResetResponse>(withApiBase(`/orgs/${ctx.orgId}/sandbox/reset`), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-role": ctx.role,
        "X-FluencyTracr-Schema-Version": "0.1"
      },
      body: JSON.stringify({})
    }),

  createOrg: (name: string, orgId?: string) =>
    fetchJson<{ org_id: string; name: string; created_at: string; min_group_size: number }>(
      withApiBase("/orgs"),
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          name,
          minGroupSize: 10,
          ...(orgId ? { orgId } : {})
        })
      }
    ),

  getOrientationSummary: (orgId: string, role: string) =>
    fetchJson<OrientationWorkflowVisibilitySummaryResponse>(
      withApiBase(`/api/orientation/${orgId}?window=60d`),
      { headers: { "x-role": role } }
    ),

  getWorkflows: (orgId: string, role: string) =>
    fetchJson<WorkflowsResponse>(
      withApiBase(`/api/workflows?org_id=${orgId}`),
      { headers: { "x-role": role } }
    ),

  getBoardSnapshot: (orgId: string, role: string) =>
    fetchJson<BoardSnapshotResponse>(
      withApiBase(`/api/board-snapshot/${orgId}?window=60d`),
      { headers: { "x-role": role } }
    )
};
