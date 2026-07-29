/**
 * AI Value canonical object API.
 *
 * Persistence and serving layer for the AI Value Engine object spine.
 * The engine (shared/src/aiValueEngine) owns validation, ordering, and claim
 * governance; this layer is fail-closed: objects that do not pass their
 * stage validator are rejected with 422 and never stored, and spine runs
 * only persist stage objects that validated cleanly.
 */
import type { Express, Response } from "express";
import { aiValueEngine, outcomeEvidenceAdmissionReceiptsMatch } from "@fluencytracr/shared";
import { z } from "zod";

import { rbacMiddleware, type RequestWithRole } from "./rbac";
import {
  getAiValueObject,
  listAiValueObjects,
  upsertAiValueObject
} from "./repositories/ai-value-object.repository";
import { listAiValueCustomerDataModelSnapshots } from "./repositories/ai-value-minimal-persistence.repository";
import type {
  AiValueCustomerDataModelSnapshotStoredRecord,
  AiValueObjectStoredRecord
} from "./store";
import {
  AiValueMaterializerNotFoundError,
  AiValueMaterializerValidationError,
  materializeRealEvidence
} from "./ai_value_real_evidence_materializer";
import {
  authorizeAggregateClaim,
  readAuthorizedAggregateClaim
} from "./services/aggregate-claim-authorization.service";
import {
  acceptedReadinessBoundOutcomeEvidence,
  authoritativeOutcomeEvidenceReceipt
} from "./outcome_evidence_admission_authority";

type StageValidation = {
  valid: boolean;
  gaps: string[];
  schema_version: string;
};

interface ObjectTypeConfig {
  idField: string;
  validate: (payload: unknown) => StageValidation;
}

const OBJECT_TYPES: Record<string, ObjectTypeConfig> = {
  blueprint: {
    idField: "blueprint_id",
    validate: (payload) => aiValueEngine.validateBlueprint(payload)
  },
  metrics_library: {
    idField: "library_id",
    validate: (payload) => aiValueEngine.validateMetricsLibrary(payload)
  },
  value_scenario: {
    idField: "scenario_id",
    validate: (payload) => aiValueEngine.validateValueScenario(payload)
  },
  roi_scenario: {
    idField: "roi_scenario_id",
    validate: (payload) => aiValueEngine.validateRoiScenario(payload)
  },
  evidence_readiness: {
    idField: "readiness_id",
    validate: (payload) => aiValueEngine.validateEvidenceReadiness(payload)
  },
  claim_boundary: {
    idField: "claim_boundary_id",
    validate: (payload) => aiValueEngine.validateClaimBoundary(payload)
  },
  executive_packet: {
    idField: "packet_id",
    validate: (payload) => aiValueEngine.validateExecutivePacket(payload)
  },
  engagement: {
    idField: "engagement_id",
    validate: (payload) => aiValueEngine.validateEngagement(payload)
  },
  fluency_baseline: {
    idField: "baseline_id",
    validate: (payload) => aiValueEngine.validateFluencyBaseline(payload)
  },
  outcome_evidence_export: {
    idField: "export_id",
    validate: (payload) => aiValueEngine.validateOutcomeEvidenceExport(payload)
  },
  data_boundary: {
    idField: "contract_id",
    validate: (payload) => aiValueEngine.validateDataBoundaryContract(payload)
  },
  value_improvement_loop: {
    idField: "improvement_loop_id",
    validate: (payload) => aiValueEngine.validateValueImprovementLoop(payload)
  },
  value_evidence_case: {
    idField: "value_evidence_case_id",
    validate: (payload) => aiValueEngine.validateValueEvidenceCase(payload)
  }
};

export const AI_VALUE_OBJECT_TYPES = Object.keys(OBJECT_TYPES);

const CUSTOMER_DATA_MODEL_ROUTE_PROJECTION_SCHEMA_VERSION =
  "FT_AI_VALUE_CUSTOMER_DATA_MODEL_ROUTE_PROJECTION_2026_06";

const CustomerDataModelProjectionQuerySchema = z
  .object({
    measurement_plan_id: z.string().min(1).optional()
  })
  .strict();

const CUSTOMER_DATA_MODEL_ALLOWED_OUTPUTS = [
  "Aggregate evidence status",
  "Measurement context",
  "Source-bound caveats",
  "Next evidence action"
];

const CUSTOMER_DATA_MODEL_BLOCKED_OUTPUTS = [
  "ROI proof",
  "Financial output",
  "Causal proof",
  "Productivity output",
  "Confidence, probability, or score output",
  "Live connector output",
  "Export package",
  "Raw data or source payload"
];

const CUSTOMER_DATA_MODEL_ROUTE_PROJECTION_LIMIT = 12;

const CUSTOMER_DATA_MODEL_ROUTE_CAVEATS = [
  "Aggregate evidence status only; customer-owned outcome review remains required."
];

const CUSTOMER_DATA_MODEL_LABEL_MAX_LENGTH = 80;

const CUSTOMER_DATA_MODEL_APPROVED_LABEL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 &()/+.,'-]*$/;

const CUSTOMER_DATA_MODEL_UNSAFE_LABEL_PATTERNS = [
  /_/,
  /:/,
  /\b[a-f0-9]{64}\b/i,
  /\b(?:bigquery|client|connector|dashboard|dataset|export|glean|hash|internal|job|org|pipeline|project|prompt|query|raw|ref|row|sigma|snapshot|source|sql|table|transcript|user|uuid|warehouse|workbook)\b/i,
  /\bdo\s*not\s*(?:expose|show)\b/i,
  /\bmeasurement\s*cell\b/i,
  /\b(?:causal|confidence|financial|probability|productivity|roi|score)\b/i
];

const approvedCustomerLabel = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const label = value.replace(/\s+/g, " ").trim();
  if (
    label.length === 0 ||
    label.length > CUSTOMER_DATA_MODEL_LABEL_MAX_LENGTH ||
    !CUSTOMER_DATA_MODEL_APPROVED_LABEL_PATTERN.test(label) ||
    CUSTOMER_DATA_MODEL_UNSAFE_LABEL_PATTERNS.some((pattern) => pattern.test(label))
  ) {
    return null;
  }
  return label;
};

const customerMetricLabel = (record: AiValueCustomerDataModelSnapshotStoredRecord) =>
  `${customerValueDriver(record.value_driver)} metric`;

const CUSTOMER_DATA_MODEL_VALUE_DRIVER_LABELS: Record<string, string> = {
  Revenue: "Revenue",
  Cost: "Cost",
  Capacity: "Capacity",
  Quality: "Quality",
  Risk: "Risk"
};

const customerValueDriver = (value: string) =>
  CUSTOMER_DATA_MODEL_VALUE_DRIVER_LABELS[value] ?? "Customer value";

const customerFunctionAreaLabel = (record: AiValueCustomerDataModelSnapshotStoredRecord) =>
  approvedCustomerLabel(record.function_area) ?? "Approved function";

const customerWorkflowLabel = (record: AiValueCustomerDataModelSnapshotStoredRecord) => {
  const functionArea = approvedCustomerLabel(record.function_area);
  return functionArea ? `${functionArea} workflow` : "Approved workflow context";
};

const customerMetricOwnerReviewState = (value: string) =>
  value.toLowerCase() === "approved" ? "Metric owner approved" : "Metric owner review held";

const CUSTOMER_DATA_MODEL_METRIC_DIRECTIONS: Record<string, string> = {
  increase: "increase",
  decrease: "decrease",
  maintain: "maintain",
  monitor: "monitor",
  no_change: "no change"
};

const customerMetricDirection = (value: string) =>
  CUSTOMER_DATA_MODEL_METRIC_DIRECTIONS[value] ?? "metric direction held";

const CUSTOMER_DATA_MODEL_METRIC_UNITS = new Set([
  "hours",
  "days",
  "minutes",
  "seconds",
  "count",
  "cases",
  "tickets",
  "percent",
  "percentage",
  "rate"
]);

const customerMetricUnit = (value: string) =>
  CUSTOMER_DATA_MODEL_METRIC_UNITS.has(value) && approvedCustomerLabel(value) === value
    ? value
    : "metric unit held";

const CUSTOMER_DATA_MODEL_PASSED_AGGREGATE_REVIEW_STATES = new Set([
  "passed_review",
  "PASSED_BIGQUERY_AGGREGATE_EXPORT_REVIEW",
  "PASSED_SIGMA_AGGREGATE_CONNECTOR_BOUNDARY_REVIEW"
]);

const customerAggregateReviewState = (value: string) =>
  CUSTOMER_DATA_MODEL_PASSED_AGGREGATE_REVIEW_STATES.has(value)
    ? "Aggregate export review passed"
    : "Aggregate review held";

const customerValidationState = (record: AiValueCustomerDataModelSnapshotStoredRecord) =>
  record.validation_valid &&
  record.assembly_validation_valid &&
  record.validation_gap_count === 0 &&
  record.assembly_validation_gap_count === 0
    ? "clear"
    : "held";

const customerWindow = (start: string, end: string) => ({ start, end });

export const setCustomerDataModelProjectionBoundaryHeaders = (res: Response) => {
  res.set("cache-control", "no-store");
  res.set("x-ai-value-customer-projection-boundary", "source_bound_customer_data_model_projection");
  res.set("x-ai-value-live-connectors", "false");
  res.set("x-ai-value-export-authorized", "false");
  res.set("x-ai-value-customer-facing-economic-output", "false");
};

const customerDataModelProjection = (record: AiValueCustomerDataModelSnapshotStoredRecord) => ({
  value_driver: customerValueDriver(record.value_driver),
  metric: {
    label: customerMetricLabel(record),
    unit: customerMetricUnit(record.metric_unit),
    direction: customerMetricDirection(record.metric_direction),
    owner_review_state: customerMetricOwnerReviewState(record.metric_owner_approval_state)
  },
  workflow_context: {
    function_area: customerFunctionAreaLabel(record),
    workflow_label: customerWorkflowLabel(record)
  },
  milestone: {
    day: record.milestone_day,
    baseline_window: customerWindow(record.baseline_window_start, record.baseline_window_end),
    comparison_window: customerWindow(record.comparison_window_start, record.comparison_window_end)
  },
  evidence_status: {
    aggregate_review_state: customerAggregateReviewState(record.aggregate_export_review_state),
    validation_state: customerValidationState(record)
  },
  caveats: CUSTOMER_DATA_MODEL_ROUTE_CAVEATS,
  allowed_output: "Aggregate evidence status only",
  blocked_outputs: CUSTOMER_DATA_MODEL_BLOCKED_OUTPUTS,
  next_action: "Customer-owned outcome review is required before any stronger claim is considered."
});

const workflowFamilyOf = (payload: Record<string, unknown>): string | null => {
  if (typeof payload.workflow_family === "string") {
    return payload.workflow_family;
  }
  const input = payload.input as Record<string, unknown> | undefined;
  if (input && typeof input.workflow_family === "string") {
    return input.workflow_family;
  }
  const workflow = payload.workflow as Record<string, unknown> | undefined;
  if (workflow && typeof workflow.workflow_family === "string") {
    return workflow.workflow_family;
  }
  return null;
};

const recordSummary = (record: {
  object_type: string;
  object_id: string;
  schema_version: string;
  workflow_family: string | null;
  valid: boolean;
  validation: Record<string, unknown>;
  updated_at: string;
}) => ({
  object_type: record.object_type,
  object_id: record.object_id,
  schema_version: record.schema_version,
  workflow_family: record.workflow_family,
  valid: record.valid,
  validation: record.validation,
  updated_at: record.updated_at
});

const requireOrg = (req: RequestWithRole, res: Response): string | null => {
  if (!req.authOrgId) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  return req.authOrgId;
};

const sanitizeIdSegment = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const stringRef = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value : null;

const objectRef = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const aggregateClaimHeldHtml = (): string =>
  "<!doctype html><html><body><main><h1>Claim authorization held</h1><p>No authorized aggregate claim is available.</p></main></body></html>";

const aggregateClaimReadoutHtml = (
  content: aiValueEngine.AggregateAuthorizedPacketContent
): string => {
  const movementText = aiValueEngine.aggregateClaimReadoutText(content.movement);
  const caveats = content.caveats.map((caveat) => `<li>${escapeHtml(caveat)}</li>`).join("");
  return `<!doctype html><html><body><main><h1>Internal aggregate observation</h1><p>${escapeHtml(
    movementText
  )}</p><ul>${caveats}</ul></main></body></html>`;
};

const legacyExecutivePacketIsolationGaps = (packet: Record<string, unknown>): string[] => {
  const summary = objectRef(packet.ebita_impact_summary);
  if (!summary) return [];

  const gaps: string[] = [];
  if (summary.status === "CUSTOMER_FACING_APPROVED") {
    gaps.push("legacy executive packet cannot carry CUSTOMER_FACING_APPROVED status");
  }
  if (summary.realized_ebita_claim_allowed === true) {
    gaps.push("legacy executive packet cannot authorize realized financial language");
  }
  if (summary.customer_facing_allowed === true) {
    gaps.push("legacy executive packet cannot authorize customer-facing financial language");
  }
  if (summary.causality_claim_allowed === true) {
    gaps.push("legacy executive packet cannot authorize causality language");
  }
  return gaps;
};

const invalidExecutivePacketGaps = (payload: Record<string, unknown>): string[] => {
  const validation = aiValueEngine.validateExecutivePacket(payload);
  return validation.valid
    ? legacyExecutivePacketIsolationGaps(payload)
    : [...validation.gaps, ...legacyExecutivePacketIsolationGaps(payload)];
};

export function registerAiValueRoutes(app: Express): void {
  app.get(
    "/api/v1/ai-value/customer-data-model/projections",
    rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]),
    async (req: RequestWithRole, res) => {
      const orgId = requireOrg(req, res);
      if (!orgId) return;
      setCustomerDataModelProjectionBoundaryHeaders(res);

      const parsed = CustomerDataModelProjectionQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({
          error: "only measurement_plan_id is allowed for this source-bound projection",
          reason: "INVALID_CUSTOMER_DATA_MODEL_PROJECTION_QUERY"
        });
      }

      const records = await listAiValueCustomerDataModelSnapshots({
        orgId,
        measurementPlanId: parsed.data.measurement_plan_id,
        latestOnly: true
      });
      const projections = records
        .filter((record) => customerValidationState(record) === "clear")
        .slice(0, CUSTOMER_DATA_MODEL_ROUTE_PROJECTION_LIMIT)
        .map(customerDataModelProjection);
      const projectionState =
        projections.length > 0
          ? "SOURCE_BOUND_CUSTOMER_EVIDENCE_STATUS_READY"
          : "HOLD_FOR_CUSTOMER_DATA_MODEL_SNAPSHOTS";

      return res.json({
        schema_version: CUSTOMER_DATA_MODEL_ROUTE_PROJECTION_SCHEMA_VERSION,
        projection_state: projectionState,
        display_mode: "customer_evidence_status",
        source_bound: true,
        filter_applied: parsed.data.measurement_plan_id ? "measurement_plan" : "latest_org_scoped",
        live_connector_execution: false,
        boundary: {
          live_connectors: false,
          live_bigquery_execution: false,
          live_sigma_execution: false,
          exports: false,
          rendered_readout: false,
          raw_or_identity_data: false,
          model_or_economic_claims: false,
          source_payload_exposure: false
        },
        allowed_customer_outputs: CUSTOMER_DATA_MODEL_ALLOWED_OUTPUTS,
        blocked_customer_outputs: CUSTOMER_DATA_MODEL_BLOCKED_OUTPUTS,
        projections
      });
    }
  );

  app.post(
    "/api/v1/ai-value/materialize/real-evidence",
    rbacMiddleware(["ADMIN", "ENABLEMENT_LEAD"]),
    async (req: RequestWithRole, res) => {
      const orgId = requireOrg(req, res);
      if (!orgId) return;

      const body = (req.body ?? {}) as Record<string, unknown>;
      const {
        blueprint_id: blueprintId,
        metrics_library_id: metricsLibraryId,
        cohort_id: cohortId,
        workflow_id: workflowId,
        outcome_workflow_id: outcomeWorkflowId,
        jbtd_id: jbtdId,
        persona_id: personaId
      } = body;
      if (
        typeof blueprintId !== "string" ||
        typeof metricsLibraryId !== "string" ||
        typeof cohortId !== "string" ||
        typeof workflowId !== "string" ||
        typeof outcomeWorkflowId !== "string" ||
        typeof jbtdId !== "string" ||
        jbtdId.trim().length === 0 ||
        typeof personaId !== "string" ||
        personaId.trim().length === 0
      ) {
        return res.status(400).json({
          error:
            "blueprint_id, metrics_library_id, cohort_id, workflow_id, outcome_workflow_id, jbtd_id, and persona_id are required",
          reason: "INVALID_REAL_EVIDENCE_MATERIALIZER_REQUEST"
        });
      }

      try {
        const result = await materializeRealEvidence({
          orgId,
          blueprintId,
          metricsLibraryId,
          cohortId,
          workflowId,
          outcomeWorkflowId,
          jbtdId,
          personaId
        });
        return res.json(result);
      } catch (error) {
        if (error instanceof AiValueMaterializerNotFoundError) {
          return res.status(404).json({
            error: error.message,
            reason: "OBJECT_NOT_FOUND"
          });
        }
        if (error instanceof AiValueMaterializerValidationError) {
          return res.status(422).json({
            error: error.message,
            reason: "ENGINE_VALIDATION_FAILED",
            gaps: error.gaps
          });
        }
        return res.status(500).json({
          error: "real evidence materialization failed",
          reason: "REAL_EVIDENCE_MATERIALIZATION_FAILED"
        });
      }
    }
  );

  app.post(
    "/api/v1/ai-value/evidence-case/assemble",
    rbacMiddleware(["ADMIN", "ENABLEMENT_LEAD"]),
    async (req: RequestWithRole, res) => {
      const orgId = requireOrg(req, res);
      if (!orgId) return;

      const body = (req.body ?? {}) as Record<string, unknown>;
      const dataBoundaryContractId = stringRef(body.data_boundary_contract_id);
      const roiScenarioId = stringRef(body.roi_scenario_id);
      const readinessId = stringRef(body.readiness_id);
      if (!dataBoundaryContractId || !roiScenarioId || !readinessId) {
        return res.status(400).json({
          error: "data_boundary_contract_id, roi_scenario_id, and readiness_id are required",
          reason: "INVALID_EVIDENCE_CASE_REQUEST"
        });
      }
      const outcomeExportId = stringRef(body.outcome_export_id);
      const improvementLoopId = stringRef(body.improvement_loop_id);

      const required: Array<[string, string, string]> = [
        ["data_boundary", dataBoundaryContractId, "data boundary contract"],
        ["roi_scenario", roiScenarioId, "ROI scenario"],
        ["evidence_readiness", readinessId, "evidence readiness"]
      ];
      const loaded: Record<string, Record<string, unknown>> = {};
      const loadedRecords: Record<string, AiValueObjectStoredRecord> = {};
      for (const [objectType, objectId, label] of required) {
        const record = await getAiValueObject(orgId, objectType, objectId);
        if (!record) {
          return res.status(404).json({
            error: `${label} ${objectId} not found`,
            reason: "OBJECT_NOT_FOUND"
          });
        }
        loaded[objectType] = record.payload as Record<string, unknown>;
        loadedRecords[objectType] = record;
      }
      const outcomeExportRecord = outcomeExportId
        ? await getAiValueObject(orgId, "outcome_evidence_export", outcomeExportId)
        : null;
      const outcomeReceipt = authoritativeOutcomeEvidenceReceipt(outcomeExportRecord);
      const roiWorkflow = objectRef(loaded.roi_scenario.workflow);
      const roiSourceRefs = objectRef(loaded.roi_scenario.source_refs);
      const outcomeExport =
        acceptedReadinessBoundOutcomeEvidence(
          loadedRecords.evidence_readiness,
          outcomeExportRecord
        ) &&
        outcomeReceipt &&
        roiWorkflow?.workflow_family === outcomeReceipt.workflow_id &&
        roiSourceRefs?.readiness_id === readinessId
          ? (outcomeExportRecord?.payload ?? null)
          : null;
      const improvementLoop = improvementLoopId
        ? ((await getAiValueObject(orgId, "value_improvement_loop", improvementLoopId))?.payload ??
          null)
        : null;

      const currentRoiValidation = aiValueEngine.validateRoiScenario(loaded.roi_scenario);
      if (!currentRoiValidation.valid) {
        return res.status(422).json({
          error: "ROI scenario is no longer admissible for evidence-case assembly",
          reason: "INVALID_ROI_SCENARIO_SOURCE",
          gaps: currentRoiValidation.gaps
        });
      }

      const evidenceCase = aiValueEngine.buildValueEvidenceCase(
        {
          dataBoundary: loaded.data_boundary,
          roiScenario: loaded.roi_scenario,
          readiness: loaded.evidence_readiness,
          outcomeEvidenceExport: outcomeExport,
          improvementLoop,
          customerValidation:
            body.customer_validation && typeof body.customer_validation === "object"
              ? body.customer_validation
              : undefined,
          evidenceDesign:
            body.evidence_design && typeof body.evidence_design === "object"
              ? body.evidence_design
              : undefined
        },
        {
          caseId: stringRef(body.case_id) ?? undefined,
          engagementLabel: stringRef(body.engagement_label) ?? undefined,
          functionArea: stringRef(body.function_area) ?? undefined
        }
      );
      const validation = aiValueEngine.validateValueEvidenceCase(evidenceCase);
      if (!validation.valid) {
        // Fail closed: an assembled case that does not validate is never stored.
        return res.status(422).json({
          error: "assembled value evidence case failed engine validation",
          reason: "ENGINE_VALIDATION_FAILED",
          gaps: validation.gaps
        });
      }

      const record = await upsertAiValueObject({
        orgId,
        objectType: "value_evidence_case",
        objectId: String(evidenceCase.value_evidence_case_id),
        schemaVersion: String(evidenceCase.schema_version),
        workflowFamily: workflowFamilyOf(evidenceCase),
        payload: evidenceCase,
        validation: validation as unknown as Record<string, unknown>,
        valid: validation.valid
      });

      return res.status(201).json({
        ...recordSummary(record),
        payload: evidenceCase
      });
    }
  );

  app.put(
    "/api/v1/ai-value/objects/:objectType/:objectId",
    rbacMiddleware(["ADMIN", "ENABLEMENT_LEAD"]),
    async (req: RequestWithRole, res) => {
      const orgId = requireOrg(req, res);
      if (!orgId) return;

      const { objectType, objectId } = req.params;
      const config = OBJECT_TYPES[objectType];
      if (!config) {
        return res.status(400).json({
          error: "Unknown AI value object type",
          reason: "UNKNOWN_OBJECT_TYPE",
          allowed_types: AI_VALUE_OBJECT_TYPES
        });
      }

      const payload = req.body;
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return res.status(400).json({
          error: "Payload must be a JSON object",
          reason: "INVALID_PAYLOAD"
        });
      }

      if (objectType === "outcome_evidence_export") {
        if (payload.org_id !== orgId) {
          return res.status(403).json({
            error: "Outcome evidence export org_id must match authenticated org",
            reason: "ORG_SCOPE_MISMATCH"
          });
        }
        const existing = await getAiValueObject(orgId, objectType, objectId);
        const existingReviewState = aiValueEngine.reviewStateOf(existing?.payload);
        if (existingReviewState === "ACCEPTED" || existingReviewState === "REJECTED") {
          return res.status(409).json({
            error: `outcome evidence export is ${existingReviewState} and cannot be resubmitted`,
            reason: "TERMINAL_REVIEW_STATE"
          });
        }
        // Uploads always enter as SUBMITTED; acceptance is reviewer-only.
        payload.review = { review_state: "SUBMITTED" };
        // Admission receipts are materializer-owned server state. Direct
        // uploads may be reviewed, but caller receipt values are not stored.
        delete payload.admission;
      }
      if (objectType === "evidence_readiness") {
        delete payload.source_graph_authoritative;
        delete payload.aggregate_claim_source_graph;
      }

      if (payload[config.idField] !== objectId) {
        return res.status(400).json({
          error: `Payload ${config.idField} must match the object id in the path`,
          reason: "OBJECT_ID_MISMATCH"
        });
      }

      const baseValidation = config.validate(payload);
      const legacyIsolationGaps =
        objectType === "executive_packet" ? legacyExecutivePacketIsolationGaps(payload) : [];
      const validated =
        legacyIsolationGaps.length > 0
          ? {
              ...baseValidation,
              valid: false,
              gaps: [...baseValidation.gaps, ...legacyIsolationGaps]
            }
          : baseValidation;
      const validation =
        objectType === "outcome_evidence_export"
          ? {
              ...validated,
              admission_authoritative: false
            }
          : objectType === "evidence_readiness"
            ? {
                ...validated,
                source_graph_authoritative: false
              }
            : objectType === "claim_boundary" || objectType === "executive_packet"
              ? {
                  ...validated,
                  claim_authorization_authoritative: false
                }
              : validated;
      if (!validation.valid) {
        // Fail closed: invalid objects are rejected, never stored.
        return res.status(422).json({
          error: "AI value object failed engine validation",
          reason: "ENGINE_VALIDATION_FAILED",
          object_type: objectType,
          object_id: objectId,
          gaps: validation.gaps
        });
      }

      const record = await upsertAiValueObject({
        orgId,
        objectType,
        objectId,
        schemaVersion: String(payload.schema_version ?? "UNKNOWN"),
        workflowFamily: workflowFamilyOf(payload),
        payload,
        validation: validation as unknown as Record<string, unknown>,
        valid: validation.valid
      });

      return res.status(201).json(recordSummary(record));
    }
  );

  app.get(
    "/api/v1/ai-value/objects",
    rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]),
    async (req: RequestWithRole, res) => {
      const orgId = requireOrg(req, res);
      if (!orgId) return;

      const objectType =
        typeof req.query.object_type === "string" ? req.query.object_type : undefined;
      if (objectType && !OBJECT_TYPES[objectType]) {
        return res.status(400).json({
          error: "Unknown AI value object type",
          reason: "UNKNOWN_OBJECT_TYPE",
          allowed_types: AI_VALUE_OBJECT_TYPES
        });
      }
      const records = await listAiValueObjects(orgId, objectType);
      return res.json({
        objects: records.map(recordSummary)
      });
    }
  );

  app.get(
    "/api/v1/ai-value/objects/:objectType/:objectId",
    rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]),
    async (req: RequestWithRole, res) => {
      const orgId = requireOrg(req, res);
      if (!orgId) return;

      const { objectType, objectId } = req.params;
      if (!OBJECT_TYPES[objectType]) {
        return res.status(400).json({
          error: "Unknown AI value object type",
          reason: "UNKNOWN_OBJECT_TYPE",
          allowed_types: AI_VALUE_OBJECT_TYPES
        });
      }
      const record = await getAiValueObject(orgId, objectType, objectId);
      if (!record) {
        return res.status(404).json({
          error: "AI value object not found",
          reason: "OBJECT_NOT_FOUND"
        });
      }
      if (objectType === "executive_packet" && req.role === "EXEC_VIEWER") {
        return res.status(403).json({
          error: "legacy executive packet payloads are internal only",
          reason: "LEGACY_READOUT_INTERNAL_ONLY"
        });
      }
      if (objectType === "executive_packet") {
        const gaps = invalidExecutivePacketGaps(record.payload);
        if (gaps.length > 0) {
          return res.status(422).json({
            error: "executive packet failed engine validation",
            reason: "ENGINE_VALIDATION_FAILED",
            gaps
          });
        }
      }
      return res.json({
        ...recordSummary(record),
        payload: record.payload
      });
    }
  );

  app.get(
    "/api/v1/ai-value/readout/:packetId/html",
    rbacMiddleware(["ADMIN", "ENABLEMENT_LEAD"]),
    async (req: RequestWithRole, res) => {
      const orgId = requireOrg(req, res);
      if (!orgId) return;

      const content = await readAuthorizedAggregateClaim(orgId, req.params.packetId);
      res.set("x-ai-value-readout-boundary", "aggregate_claim_authority");
      res.set("x-ai-value-source-bound", content ? "true" : "false");
      res.set("x-ai-value-customer-facing-output", "false");
      res.set("x-ai-value-export-authorized", "false");
      res.set("cache-control", "no-store");
      res.set("content-type", "text/html; charset=utf-8");
      return res.send(content ? aggregateClaimReadoutHtml(content) : aggregateClaimHeldHtml());
    }
  );

  app.post(
    "/api/v1/ai-value/objects/outcome_evidence_export/:objectId/review",
    rbacMiddleware(["ADMIN", "ENABLEMENT_LEAD"]),
    async (req: RequestWithRole, res) => {
      const orgId = requireOrg(req, res);
      if (!orgId) return;

      const { objectId } = req.params;
      const body = (req.body ?? {}) as Record<string, unknown>;
      const decision = body.decision;
      const reviewerRole = req.role;
      if (decision !== "ACCEPTED" && decision !== "REJECTED") {
        return res.status(400).json({
          error: "decision must be ACCEPTED or REJECTED",
          reason: "INVALID_REVIEW_DECISION"
        });
      }
      if (body.reviewer_role !== undefined && body.reviewer_role !== reviewerRole) {
        return res.status(400).json({
          error: "reviewer_role must match the authenticated role",
          reason: "INVALID_REVIEW_DECISION"
        });
      }
      if (typeof reviewerRole !== "string" || reviewerRole.length === 0) {
        return res.status(400).json({
          error: "reviewer_role is required",
          reason: "INVALID_REVIEW_DECISION"
        });
      }

      const record = await getAiValueObject(orgId, "outcome_evidence_export", objectId);
      if (!record) {
        return res.status(404).json({
          error: "outcome evidence export not found",
          reason: "OBJECT_NOT_FOUND"
        });
      }

      const reviewed = aiValueEngine.applyOutcomeEvidenceReview(
        record.payload,
        decision,
        reviewerRole,
        new Date().toISOString()
      );
      if (reviewed.error || !reviewed.exportObject) {
        return res.status(409).json({
          error: reviewed.error ?? "review could not be applied",
          reason: "REVIEW_NOT_APPLICABLE"
        });
      }

      const admissionAuthoritative = Boolean(
        authoritativeOutcomeEvidenceReceipt(record) &&
          outcomeEvidenceAdmissionReceiptsMatch(
            record.validation.admission_receipt,
            reviewed.exportObject.admission
          )
      );
      const validation = {
        ...aiValueEngine.validateOutcomeEvidenceExport(reviewed.exportObject),
        admission_authoritative: admissionAuthoritative,
        ...(admissionAuthoritative
          ? { admission_receipt: record.validation.admission_receipt }
          : {})
      };
      if (!validation.valid) {
        return res.status(422).json({
          error: "reviewed export failed engine validation",
          reason: "ENGINE_VALIDATION_FAILED",
          gaps: validation.gaps
        });
      }

      const updated = await upsertAiValueObject({
        orgId,
        objectType: "outcome_evidence_export",
        objectId,
        schemaVersion: String(reviewed.exportObject.schema_version ?? "UNKNOWN"),
        workflowFamily: workflowFamilyOf(reviewed.exportObject),
        payload: reviewed.exportObject,
        validation: validation as unknown as Record<string, unknown>,
        valid: true
      });

      return res.json({
        ...recordSummary(updated),
        review_state: validation.review_state
      });
    }
  );

  app.post(
    "/api/v1/ai-value/value-chain/run",
    rbacMiddleware(["ADMIN", "ENABLEMENT_LEAD"]),
    async (req: RequestWithRole, res) => {
      const orgId = requireOrg(req, res);
      if (!orgId) return;

      const body = (req.body ?? {}) as Record<string, unknown>;
      return res.json(
        await authorizeAggregateClaim({
          orgId,
          blueprintId: stringRef(body.blueprint_id) ?? undefined,
          metricsLibraryId: stringRef(body.metrics_library_id) ?? undefined,
          scenarioId: stringRef(body.scenario_id) ?? undefined,
          outcomeEvidenceExportId: stringRef(body.outcome_evidence_export_id) ?? undefined,
          outcomeEvidenceReadinessId: stringRef(body.outcome_evidence_readiness_id) ?? undefined,
          comparisonPrivacyReceipt: body.comparison_privacy_receipt,
          persist: body.persist !== false
        })
      );
    }
  );

  app.post(
    "/api/v1/ai-value/intake/workshop",
    rbacMiddleware(["ADMIN", "ENABLEMENT_LEAD"]),
    async (req: RequestWithRole, res) => {
      const orgId = requireOrg(req, res);
      if (!orgId) return;

      const intake = req.body;
      if (!intake || typeof intake !== "object" || Array.isArray(intake)) {
        return res.status(400).json({
          error: "Intake payload must be a JSON object",
          reason: "INVALID_PAYLOAD"
        });
      }

      const result = aiValueEngine.buildBlueprintDraftFromWorkshopIntake(intake);
      if (result.intake_gaps.length > 0 || !result.blueprint) {
        return res.status(422).json({
          error: "Workshop intake failed engine validation",
          reason: "INTAKE_VALIDATION_FAILED",
          intake_id: result.intake_id,
          gaps: result.intake_gaps
        });
      }
      if (!result.blueprint_validation?.valid) {
        // Fail closed: a structurally complete intake whose blueprint draft
        // fails the Blueprint stage is rejected and never stored.
        return res.status(422).json({
          error: "Workshop intake produced an invalid blueprint draft",
          reason: "ENGINE_VALIDATION_FAILED",
          intake_id: result.intake_id,
          gaps: result.blueprint_validation?.gaps ?? []
        });
      }

      const blueprint = result.blueprint as Record<string, unknown>;
      const record = await upsertAiValueObject({
        orgId,
        objectType: "blueprint",
        objectId: String(blueprint.blueprint_id),
        schemaVersion: String(blueprint.schema_version ?? "UNKNOWN"),
        workflowFamily: workflowFamilyOf(blueprint),
        payload: blueprint,
        validation: result.blueprint_validation as unknown as Record<string, unknown>,
        valid: true
      });

      return res.status(201).json({
        intake_id: result.intake_id,
        blueprint: recordSummary(record)
      });
    }
  );

  app.post(
    "/api/v1/ai-value/spine/run",
    rbacMiddleware(["ADMIN", "ENABLEMENT_LEAD"]),
    async (req: RequestWithRole, res) => {
      const orgId = requireOrg(req, res);
      if (!orgId) return;

      const body = (req.body ?? {}) as Record<string, unknown>;
      const blueprintId = body.blueprint_id;
      const metricsLibraryId = body.metrics_library_id;
      const scenarioId = body.scenario_id;
      const persist = body.persist !== false;

      if (typeof blueprintId !== "string" || typeof metricsLibraryId !== "string") {
        return res.status(400).json({
          error: "blueprint_id and metrics_library_id are required",
          reason: "INVALID_SPINE_REQUEST"
        });
      }

      const blueprintRecord = await getAiValueObject(orgId, "blueprint", blueprintId);
      if (!blueprintRecord) {
        return res.status(404).json({
          error: `blueprint ${blueprintId} not found`,
          reason: "OBJECT_NOT_FOUND"
        });
      }
      const metricsRecord = await getAiValueObject(orgId, "metrics_library", metricsLibraryId);
      if (!metricsRecord) {
        return res.status(404).json({
          error: `metrics_library ${metricsLibraryId} not found`,
          reason: "OBJECT_NOT_FOUND"
        });
      }
      let scenarioPayload: Record<string, unknown> | undefined;
      if (typeof scenarioId === "string") {
        const scenarioRecord = await getAiValueObject(orgId, "value_scenario", scenarioId);
        if (!scenarioRecord) {
          return res.status(404).json({
            error: `value_scenario ${scenarioId} not found`,
            reason: "OBJECT_NOT_FOUND"
          });
        }
        scenarioPayload = scenarioRecord.payload;
      }

      const familySegment = sanitizeIdSegment(blueprintRecord.workflow_family ?? blueprintId);
      const run = aiValueEngine.runSpine({
        blueprint: blueprintRecord.payload,
        metricsLibrary: metricsRecord.payload,
        scenario: scenarioPayload,
        ids: {
          readinessId: `readiness_${familySegment}_v1`,
          claimBoundaryId: `claim_boundary_${familySegment}_v1`,
          packetId: `executive_packet_${familySegment}_v1`
        }
      });

      if (run.stages.readiness.status === "VALID") {
        run.stages.claim_boundary = {
          status: "HELD",
          validation: null,
          object: null,
          generated: false,
          hold_reason: "server-owned aggregate claim authorization is required"
        };
        run.stages.executive_packet = {
          status: "HELD",
          validation: null,
          object: null,
          generated: false,
          hold_reason: "server-owned aggregate claim authorization is required"
        };
        run.halted_at = "claim_authorization";
      }

      const persisted: Array<{ object_type: string; object_id: string }> = [];
      if (persist) {
        const generatedStages: Array<{
          stage: keyof typeof run.stages;
          objectType: string;
          idField: string;
        }> = [
          { stage: "scenario", objectType: "value_scenario", idField: "scenario_id" },
          { stage: "readiness", objectType: "evidence_readiness", idField: "readiness_id" }
        ];
        for (const { stage, objectType, idField } of generatedStages) {
          const stageResult = run.stages[stage];
          // Fail closed: only stage objects that validated cleanly are stored.
          if (stageResult.status !== "VALID" || !stageResult.generated || !stageResult.object) {
            continue;
          }
          const objectPayload = stageResult.object as Record<string, unknown>;
          const objectId = String(objectPayload[idField]);
          await upsertAiValueObject({
            orgId,
            objectType,
            objectId,
            schemaVersion: String(objectPayload.schema_version ?? "UNKNOWN"),
            workflowFamily: workflowFamilyOf(objectPayload),
            payload: objectPayload,
            validation: stageResult.validation as unknown as Record<string, unknown>,
            valid: true
          });
          persisted.push({ object_type: objectType, object_id: objectId });
        }
      }

      return res.json({
        run,
        persisted
      });
    }
  );
}
