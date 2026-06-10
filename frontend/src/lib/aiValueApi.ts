import { authFetch } from "../auth";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").trim().replace(/\/+$/, "");
const withApiBase = (path: string) => (apiBaseUrl ? `${apiBaseUrl}${path}` : path);

export class AiValueApiError extends Error {
  status: number;
  payload?: unknown;
  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "AiValueApiError";
    this.status = status;
    this.payload = payload;
  }
}

export interface AiValueObjectSummary {
  object_type: string;
  object_id: string;
  schema_version: string;
  workflow_family: string | null;
  valid: boolean;
  validation: Record<string, unknown>;
  updated_at: string;
}

export interface AiValueSpineStage {
  status: "VALID" | "INVALID" | "HELD" | "NOT_RUN";
  validation: Record<string, unknown> | null;
  object: Record<string, unknown> | null;
  generated: boolean;
  hold_reason: string | null;
}

export interface AiValueSpineRun {
  schema_version: string;
  decision: string;
  halted_at: string | null;
  customer_facing_economic_output: false;
  stages: {
    blueprint: AiValueSpineStage;
    metrics: AiValueSpineStage;
    scenario: AiValueSpineStage;
    readiness: AiValueSpineStage;
    claim_boundary: AiValueSpineStage;
    executive_packet: AiValueSpineStage;
  };
}

const requestJson = async <T>(
  role: string,
  path: string,
  init: RequestInit = {}
): Promise<T> => {
  const response = await authFetch(role, withApiBase(path), init);
  if (!response.ok) {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    const message =
      typeof payload === "object" && payload !== null && "error" in payload
        ? String((payload as Record<string, unknown>).error)
        : `Request failed: ${response.status}`;
    throw new AiValueApiError(message, response.status, payload);
  }
  return (await response.json()) as T;
};

export const listAiValueObjects = (role: string, objectType?: string) =>
  requestJson<{ objects: AiValueObjectSummary[] }>(
    role,
    objectType
      ? `/api/v1/ai-value/objects?object_type=${encodeURIComponent(objectType)}`
      : "/api/v1/ai-value/objects"
  );

export const putAiValueObject = (
  role: string,
  objectType: string,
  objectId: string,
  payload: Record<string, unknown>
) =>
  requestJson<AiValueObjectSummary>(
    role,
    `/api/v1/ai-value/objects/${encodeURIComponent(objectType)}/${encodeURIComponent(objectId)}`,
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    }
  );

export interface AiValueChainRun {
  schema_version: string;
  decision: string;
  halted_at: string | null;
  customer_facing_economic_output: false;
  engagement: AiValueSpineStage & { covers_workflow_family: boolean | null };
  fluency_baseline: AiValueSpineStage & { summary: Record<string, unknown> | null };
  spine: AiValueSpineRun | null;
}

export const runAiValueChain = (
  role: string,
  params: {
    blueprintId: string;
    metricsLibraryId: string;
    engagementId?: string;
    fluencyBaselineId?: string;
  }
) =>
  requestJson<{ run: AiValueChainRun; persisted: Array<{ object_type: string; object_id: string }> }>(
    role,
    "/api/v1/ai-value/value-chain/run",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        blueprint_id: params.blueprintId,
        metrics_library_id: params.metricsLibraryId,
        engagement_id: params.engagementId,
        fluency_baseline_id: params.fluencyBaselineId
      })
    }
  );

export const runAiValueSpine = (
  role: string,
  blueprintId: string,
  metricsLibraryId: string
) =>
  requestJson<{ run: AiValueSpineRun; persisted: Array<{ object_type: string; object_id: string }> }>(
    role,
    "/api/v1/ai-value/spine/run",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        blueprint_id: blueprintId,
        metrics_library_id: metricsLibraryId
      })
    }
  );
