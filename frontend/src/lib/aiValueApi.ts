import { authFetch } from "../auth";

export const ACTIVE_AI_VALUE_BLUEPRINT_ID_KEY = "aiValue.activeBlueprintId";
export const ACTIVE_AI_VALUE_ENGAGEMENT_ID_KEY = "aiValue.activeEngagementId";

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

export interface AiValueObjectDetail extends AiValueObjectSummary {
  payload: Record<string, unknown>;
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

export interface RealEvidenceMaterializerParams {
  blueprintId: string;
  metricsLibraryId: string;
  cohortId: string;
  workflowId: string;
  outcomeWorkflowId?: string;
}

export interface RealEvidenceMaterializerResult {
  customer_facing_economic_output: false;
  materialized: Array<{ object_type: string; object_id: string }>;
  held_reasons: string[];
  objects: {
    evidence_readiness: Record<string, unknown>;
    outcome_evidence_export?: Record<string, unknown>;
  };
  evidence_summary: {
    cohort_id?: string;
    workflow_id?: string;
    v3_verdict_id?: string | null;
    v3_verdict?: string | null;
    forwarded_distribution_used: boolean;
    velocity_observation_count: number;
    outcome_evidence_export_id: string | null;
  };
}

export interface CustomerDataModelProjection {
  value_driver: string;
  metric: {
    label: string;
    unit: string;
    direction: string;
    owner_review_state: string;
  };
  workflow_context: {
    function_area: string;
    workflow_label: string;
  };
  milestone: {
    day: number;
    baseline_window: {
      start: string;
      end: string;
    };
    comparison_window: {
      start: string;
      end: string;
    };
  };
  evidence_status: {
    aggregate_review_state: string;
    validation_state: string;
  };
  caveats: string[];
  allowed_output: string;
  blocked_outputs: string[];
  next_action: string;
}

export interface CustomerDataModelProjectionResponse {
  schema_version: string;
  projection_state:
    | "SOURCE_BOUND_CUSTOMER_EVIDENCE_STATUS_READY"
    | "HOLD_FOR_CUSTOMER_DATA_MODEL_SNAPSHOTS";
  display_mode: "customer_evidence_status";
  source_bound: boolean;
  filter_applied: "measurement_plan" | "latest_org_scoped";
  live_connector_execution: false;
  allowed_customer_outputs: string[];
  blocked_customer_outputs: string[];
  projections: CustomerDataModelProjection[];
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

export const fetchAiValueObject = (
  role: string,
  objectType: string,
  objectId: string
) =>
  requestJson<AiValueObjectDetail>(
    role,
    `/api/v1/ai-value/objects/${encodeURIComponent(objectType)}/${encodeURIComponent(objectId)}`
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

export const reviewOutcomeEvidence = (
  role: string,
  exportId: string,
  decision: "ACCEPTED" | "REJECTED"
) =>
  requestJson<AiValueObjectSummary & { review_state: string }>(
    role,
    `/api/v1/ai-value/objects/outcome_evidence_export/${encodeURIComponent(exportId)}/review`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision })
    }
  );

export const fetchReadoutHtml = async (role: string, packetId: string): Promise<string> => {
  const response = await authFetch(
    role,
    withApiBase(`/api/v1/ai-value/readout/${encodeURIComponent(packetId)}/html`)
  );
  if (!response.ok) {
    throw new AiValueApiError(`Readout request failed: ${response.status}`, response.status);
  }
  return response.text();
};

export const postWorkshopIntake = (
  role: string,
  intake: Record<string, unknown>
) =>
  requestJson<{ intake_id: string; blueprint: AiValueObjectSummary }>(
    role,
    "/api/v1/ai-value/intake/workshop",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(intake)
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

export const materializeRealEvidence = (
  role: string,
  params: RealEvidenceMaterializerParams
) =>
  requestJson<RealEvidenceMaterializerResult>(
    role,
    "/api/v1/ai-value/materialize/real-evidence",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        blueprint_id: params.blueprintId,
        metrics_library_id: params.metricsLibraryId,
        cohort_id: params.cohortId,
        workflow_id: params.workflowId,
        outcome_workflow_id: params.outcomeWorkflowId
      })
    }
  );

export const fetchCustomerDataModelProjections = (
  role: string,
  measurementPlanId?: string | null
) => {
  const query = measurementPlanId
    ? `?measurement_plan_id=${encodeURIComponent(measurementPlanId)}`
    : "";
  return requestJson<CustomerDataModelProjectionResponse>(
    role,
    `/api/v1/ai-value/customer-data-model/projections${query}`
  );
};
