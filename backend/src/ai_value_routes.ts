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
import { aiValueEngine } from "@learnaire/shared";

import { rbacMiddleware, type RequestWithRole } from "./rbac";
import {
  getAiValueObject,
  listAiValueObjects,
  upsertAiValueObject
} from "./repositories/ai-value-object.repository";

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
  }
};

export const AI_VALUE_OBJECT_TYPES = Object.keys(OBJECT_TYPES);

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
  value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

const stringRef = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value : null;

const objectRef = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const humanize = (value: unknown): string | null => {
  if (typeof value !== "string" || !value.trim()) return null;
  return value.replace(/_/g, " ").replace(/\s+/g, " ").trim();
};

const metricNamesFromPacket = (packet: Record<string, unknown>): string[] => {
  const sections = objectRef(packet.sections);
  const metrics = Array.isArray(sections?.metrics) ? sections.metrics : [];
  return metrics
    .map((metric) => stringRef(objectRef(metric)?.name))
    .filter((name): name is string => Boolean(name));
};

const dataOwnerFromPacket = (packet: Record<string, unknown>): string | null => {
  const sections = objectRef(packet.sections);
  const metrics = Array.isArray(sections?.metrics) ? sections.metrics : [];
  for (const metric of metrics) {
    const owner = humanize(objectRef(metric)?.owner);
    if (owner) return owner;
  }
  return null;
};

const evidenceReviewForReadout = (
  packet: Record<string, unknown>,
  outcomeEvidenceExport: Record<string, unknown> | null
) => {
  const metricNames = metricNamesFromPacket(packet);
  const dataOwner = dataOwnerFromPacket(packet);
  if (!outcomeEvidenceExport) {
    return {
      reviewState: "MISSING",
      metricNames,
      dataOwner
    };
  }

  const sourceSystem = objectRef(outcomeEvidenceExport.source_system);
  const windows = objectRef(outcomeEvidenceExport.windows);
  const review = objectRef(outcomeEvidenceExport.review);
  return {
    reviewState: aiValueEngine.reviewStateOf(outcomeEvidenceExport),
    metricNames,
    sourceSystemName: stringRef(sourceSystem?.source_name),
    approvedGrain: stringRef(sourceSystem?.approved_grain),
    baselineWindow: stringRef(windows?.baseline),
    comparisonWindow: stringRef(windows?.comparison),
    reviewerRole: stringRef(review?.reviewer_role) ?? dataOwner,
    dataOwner
  };
};

export function registerAiValueRoutes(app: Express): void {
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
      }

      if (payload[config.idField] !== objectId) {
        return res.status(400).json({
          error: `Payload ${config.idField} must match the object id in the path`,
          reason: "OBJECT_ID_MISMATCH"
        });
      }

      const validation = config.validate(payload);
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
      return res.json({
        ...recordSummary(record),
        payload: record.payload
      });
    }
  );

  app.get(
    "/api/v1/ai-value/readout/:packetId/html",
    rbacMiddleware(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD"]),
    async (req: RequestWithRole, res) => {
      const orgId = requireOrg(req, res);
      if (!orgId) return;

      const { packetId } = req.params;
      const packetRecord = await getAiValueObject(orgId, "executive_packet", packetId);
      if (!packetRecord) {
        return res.status(404).json({
          error: "executive packet not found",
          reason: "OBJECT_NOT_FOUND"
        });
      }
      const packetValidation = aiValueEngine.validateExecutivePacket(packetRecord.payload);
      if (!packetValidation.valid) {
        // Fail closed: a stored packet that no longer validates never renders.
        return res.status(422).json({
          error: "executive packet failed engine validation",
          reason: "ENGINE_VALIDATION_FAILED",
          gaps: packetValidation.gaps
        });
      }

      const packet = packetRecord.payload as Record<string, unknown>;
      const packetWorkflowFamily = stringRef(packet.workflow_family);
      const sourceRefs =
        packet.source_refs && typeof packet.source_refs === "object"
          ? packet.source_refs as Record<string, unknown>
          : {};
      const blueprintRef = stringRef(sourceRefs.blueprint_id);
      const metricsLibraryRef = stringRef(sourceRefs.metrics_library_id);
      const engagementRef = stringRef(sourceRefs.engagement_id);
      const fluencyBaselineRef = stringRef(sourceRefs.fluency_baseline_id);
      const readinessRef = stringRef(sourceRefs.readiness_id);

      const engagements = await listAiValueObjects(orgId, "engagement");
      let engagementPayload: Record<string, unknown> | null = null;
      for (const record of engagements) {
        const validation = aiValueEngine.validateEngagement(record.payload);
        const coversPacketWorkflow = aiValueEngine.engagementCoversWorkflowFamily(
          record.payload,
          packetWorkflowFamily
        );
        const matchesSourceRef = engagementRef ? record.object_id === engagementRef : true;
        if (validation.valid && coversPacketWorkflow && matchesSourceRef) {
          engagementPayload = record.payload;
          break;
        }
      }

      const baselines = await listAiValueObjects(orgId, "fluency_baseline");
      let fluencySummary: Record<string, unknown> | null = null;
      const validBaselines = baselines.filter((record) =>
        aiValueEngine.validateFluencyBaseline(record.payload).valid
      );
      const matchedBaseline = fluencyBaselineRef
        ? validBaselines.find((record) => record.object_id === fluencyBaselineRef)
        : validBaselines.find(
            (record) =>
              packetWorkflowFamily && record.workflow_family === packetWorkflowFamily
          ) ??
          validBaselines.find((record) => !record.workflow_family);
      if (matchedBaseline) {
        fluencySummary = aiValueEngine.summarizeFluencyBaseline(matchedBaseline.payload);
      }

      const blueprintContextRecord = blueprintRef
        ? await getAiValueObject(orgId, "blueprint", blueprintRef)
        : null;
      const metricsContextRecord = metricsLibraryRef
        ? await getAiValueObject(orgId, "metrics_library", metricsLibraryRef)
        : null;
      const blueprintContext =
        blueprintContextRecord &&
        aiValueEngine.validateBlueprint(blueprintContextRecord.payload).valid
          ? blueprintContextRecord.payload
          : undefined;
      const metricsContext =
        metricsContextRecord &&
        aiValueEngine.validateMetricsLibrary(metricsContextRecord.payload).valid
          ? metricsContextRecord.payload
          : undefined;
      const validateEvidenceForReadout = (payload: Record<string, unknown>) =>
        aiValueEngine.validateOutcomeEvidenceExport(payload, {
          blueprint: blueprintContext,
          metricsLibrary: metricsContext
        });
      const canUseEvidenceForReadout = (payload: Record<string, unknown>) => {
        const validation = validateEvidenceForReadout(payload);
        if (!validation.valid) return false;
        return (
          validation.review_state !== "ACCEPTED" ||
          validation.cross_check_gaps.length === 0
        );
      };

      let outcomeEvidenceRef: string | null = null;
      if (readinessRef) {
        const readinessRecord = await getAiValueObject(
          orgId,
          "evidence_readiness",
          readinessRef
        );
        if (
          readinessRecord &&
          aiValueEngine.validateEvidenceReadiness(readinessRecord.payload).valid
        ) {
          const readinessSourceRefs = objectRef(readinessRecord.payload.source_refs);
          outcomeEvidenceRef = stringRef(readinessSourceRefs?.outcome_evidence_export_id);
        }
      }

      let outcomeEvidencePayload: Record<string, unknown> | null = null;
      if (outcomeEvidenceRef) {
        const outcomeEvidenceRecord = await getAiValueObject(
          orgId,
          "outcome_evidence_export",
          outcomeEvidenceRef
        );
        if (
          outcomeEvidenceRecord &&
          canUseEvidenceForReadout(outcomeEvidenceRecord.payload)
        ) {
          outcomeEvidencePayload = outcomeEvidenceRecord.payload;
        }
      }

      if (!outcomeEvidencePayload) {
        const outcomeEvidenceRecords = await listAiValueObjects(
          orgId,
          "outcome_evidence_export"
        );
        const candidates = outcomeEvidenceRecords
          .filter((record) => record.workflow_family === packetWorkflowFamily)
          .filter((record) => canUseEvidenceForReadout(record.payload))
          .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
        outcomeEvidencePayload = candidates[0]?.payload ?? null;
      }

      const html = aiValueEngine.renderExecutiveReadoutHtml({
        packet,
        engagement: engagementPayload,
        fluencySummary,
        evidenceReview: evidenceReviewForReadout(packet, outcomeEvidencePayload)
      });
      res.set("content-type", "text/html; charset=utf-8");
      return res.send(html);
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
      if (
        body.reviewer_role !== undefined &&
        body.reviewer_role !== reviewerRole
      ) {
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

      const validation = aiValueEngine.validateOutcomeEvidenceExport(reviewed.exportObject);
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
      const blueprintId = body.blueprint_id;
      const metricsLibraryId = body.metrics_library_id;
      const engagementId = body.engagement_id;
      const fluencyBaselineId = body.fluency_baseline_id;
      const outcomeEvidenceExportId = body.outcome_evidence_export_id;
      const scenarioId = body.scenario_id;
      const persist = body.persist !== false;

      if (typeof blueprintId !== "string" || typeof metricsLibraryId !== "string") {
        return res.status(400).json({
          error: "blueprint_id and metrics_library_id are required",
          reason: "INVALID_VALUE_CHAIN_REQUEST"
        });
      }

      const load = async (objectType: string, objectId: unknown) => {
        if (typeof objectId !== "string") return undefined;
        const record = await getAiValueObject(orgId, objectType, objectId);
        if (!record) {
          res.status(404).json({
            error: `${objectType} ${objectId} not found`,
            reason: "OBJECT_NOT_FOUND"
          });
          return null;
        }
        return record.payload;
      };

      const blueprintPayload = await load("blueprint", blueprintId);
      if (blueprintPayload === null) return;
      const metricsPayload = await load("metrics_library", metricsLibraryId);
      if (metricsPayload === null) return;
      const engagementPayload = await load("engagement", engagementId);
      if (engagementPayload === null) return;
      const fluencyPayload = await load("fluency_baseline", fluencyBaselineId);
      if (fluencyPayload === null) return;
      const outcomeEvidencePayload = await load(
        "outcome_evidence_export",
        outcomeEvidenceExportId
      );
      if (outcomeEvidencePayload === null) return;
      const scenarioPayload = await load("value_scenario", scenarioId);
      if (scenarioPayload === null) return;

      const familySegment = sanitizeIdSegment(
        (blueprintPayload as Record<string, unknown>).workflow_family as string ??
          (blueprintId as string)
      );
      const run = aiValueEngine.runValueChain({
        engagement: engagementPayload,
        fluencyBaseline: fluencyPayload,
        outcomeEvidenceExport: outcomeEvidencePayload,
        blueprint: blueprintPayload,
        metricsLibrary: metricsPayload,
        scenario: scenarioPayload,
        ids: {
          readinessId: `readiness_${familySegment}_v1`,
          claimBoundaryId: `claim_boundary_${familySegment}_v1`,
          packetId: `executive_packet_${familySegment}_v1`
        }
      });

      const persisted: Array<{ object_type: string; object_id: string }> = [];
      if (persist && run.spine) {
        const generatedStages: Array<{ stage: "scenario" | "readiness" | "claim_boundary" | "executive_packet"; objectType: string; idField: string }> = [
          { stage: "scenario", objectType: "value_scenario", idField: "scenario_id" },
          { stage: "readiness", objectType: "evidence_readiness", idField: "readiness_id" },
          { stage: "claim_boundary", objectType: "claim_boundary", idField: "claim_boundary_id" },
          { stage: "executive_packet", objectType: "executive_packet", idField: "packet_id" }
        ];
        for (const { stage, objectType, idField } of generatedStages) {
          const stageResult = run.spine.stages[stage];
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

      return res.json({ run, persisted });
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
      const metricsRecord = await getAiValueObject(
        orgId,
        "metrics_library",
        metricsLibraryId
      );
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

      const familySegment = sanitizeIdSegment(
        blueprintRecord.workflow_family ?? blueprintId
      );
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

      const persisted: Array<{ object_type: string; object_id: string }> = [];
      if (persist) {
        const generatedStages: Array<{ stage: keyof typeof run.stages; objectType: string; idField: string }> = [
          { stage: "scenario", objectType: "value_scenario", idField: "scenario_id" },
          { stage: "readiness", objectType: "evidence_readiness", idField: "readiness_id" },
          { stage: "claim_boundary", objectType: "claim_boundary", idField: "claim_boundary_id" },
          { stage: "executive_packet", objectType: "executive_packet", idField: "packet_id" }
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
