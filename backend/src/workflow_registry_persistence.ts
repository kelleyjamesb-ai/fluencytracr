import { getPrisma } from "./db";
import type {
  BaselineResetEventRecord,
  WorkflowRegistryCurrentRecord,
  WorkflowRegistryAuditRecord,
  WorkflowRegistryRecord,
  WorkflowVisibilityPolicyConfigRecord
} from "./store";

type PersistedRegistryRow = {
  id: string;
  orgId: string;
  workflowId: string;
  displayName: string;
  riskClass: string;
  changeReason: string | null;
  changedByUser: string;
  changedByRole: string;
  createdAt: Date;
  versionNumber: number;
};

type PersistedAuditRow = {
  id: string;
  orgId: string;
  workflowId: string;
  version: number;
  action: string;
  actorSub: string | null;
  actorRole: string | null;
  metadata: unknown;
  createdAt: Date;
};

type PersistedPolicyConfigRow = {
  id: string;
  orgId: string;
  versionName: string;
  changeReason: string;
  changedByUser: string;
  changedByRole: string;
  windowDaysLow: number;
  windowDaysMedium: number;
  windowDaysHigh: number;
  minEventsLow: number;
  minEventsMedium: number;
  minEventsHigh: number;
  requireVerificationHigh: boolean;
  createdAt: Date;
};

type PersistedBaselineResetRow = {
  id: string;
  orgId: string;
  controlConfigVersionId: string;
  resetAt: Date;
  reason: string;
  triggeredByUser: string;
  triggeredByRole: string;
};

const maybePrisma = () => {
  if (!process.env.DATABASE_URL) {
    return null;
  }
  return getPrisma();
};

const asMetadata = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
};

export const persistWorkflowRegistryEntry = async (record: WorkflowRegistryRecord) => {
  const prisma = maybePrisma();
  if (!prisma) {
    return;
  }

  await prisma.$executeRaw`
    INSERT INTO "WorkflowRegistryVersion"
      ("id", "orgId", "workflowId", "displayName", "riskClass", "changeReason", "changedByUser", "changedByRole", "createdAt")
    VALUES
      (${record.id}, ${record.orgId}, ${record.workflowId}, ${record.displayName}, ${record.riskClass}::"RiskClass",
       ${record.changeReason ?? ""}, ${record.changedByUser}, ${record.changedByRole}, ${new Date(record.createdAt)})
    ON CONFLICT ("id") DO NOTHING
  `;
};

export const upsertWorkflowRegistryCurrent = async (record: WorkflowRegistryCurrentRecord) => {
  const prisma = maybePrisma();
  if (!prisma) {
    return;
  }

  await prisma.$executeRaw`
    INSERT INTO "WorkflowRegistryCurrent"
      ("id", "orgId", "workflowId", "displayName", "riskClass", "effectiveVersionId", "updatedAt")
    VALUES
      (${record.id}, ${record.orgId}, ${record.workflowId}, ${record.displayName},
       ${record.riskClass}::"RiskClass", ${record.effectiveVersionId}, ${new Date(record.updatedAt)})
    ON CONFLICT ("orgId", "workflowId") DO UPDATE SET
      "displayName" = EXCLUDED."displayName",
      "riskClass" = EXCLUDED."riskClass",
      "effectiveVersionId" = EXCLUDED."effectiveVersionId",
      "updatedAt" = EXCLUDED."updatedAt"
  `;
};

export const listWorkflowRegistryEntriesByOrg = async (orgId: string): Promise<WorkflowRegistryRecord[]> => {
  const prisma = maybePrisma();
  if (!prisma) {
    return [];
  }

  const rows = await prisma.$queryRaw<PersistedRegistryRow[]>`
    SELECT
      "id",
      "orgId",
      "workflowId",
      "displayName",
      "riskClass",
      "changeReason",
      "changedByUser",
      "changedByRole",
      "createdAt",
      ROW_NUMBER() OVER (PARTITION BY "workflowId" ORDER BY "createdAt", "id")::int AS "versionNumber"
    FROM "WorkflowRegistryVersion"
    WHERE "orgId" = ${orgId}
    ORDER BY "workflowId" ASC, "createdAt" ASC, "id" ASC
  `;

  return rows.map((row) => ({
    id: row.id,
    orgId: row.orgId,
    workflowId: row.workflowId,
    displayName: row.displayName,
    version: Number(row.versionNumber),
    riskClass: row.riskClass as WorkflowRegistryRecord["riskClass"],
    changeReason: row.changeReason ?? "",
    changedByUser: row.changedByUser,
    changedByRole: row.changedByRole,
    createdAt: row.createdAt.toISOString()
  }));
};

export const persistWorkflowRegistryAuditEvent = async (record: WorkflowRegistryAuditRecord) => {
  const prisma = maybePrisma();
  if (!prisma) {
    return;
  }

  await prisma.$executeRaw`
    INSERT INTO "WorkflowRegistryAuditEvent"
      ("id", "orgId", "workflowId", "version", "action", "actorSub", "actorRole", "metadata", "createdAt")
    VALUES
      (${record.id}, ${record.orgId}, ${record.workflowId}, ${record.version}, ${record.action},
       ${record.actorSub ?? null}, ${record.actorRole ?? null}, ${record.metadata}::jsonb, ${new Date(record.createdAt)})
    ON CONFLICT ("id") DO NOTHING
  `;
};

export const listWorkflowRegistryAuditByOrg = async (
  orgId: string,
  workflowId?: string
): Promise<WorkflowRegistryAuditRecord[]> => {
  const prisma = maybePrisma();
  if (!prisma) {
    return [];
  }

  const rows = await prisma.$queryRaw<PersistedAuditRow[]>`
    SELECT "id", "orgId", "workflowId", "version", "action", "actorSub", "actorRole", "metadata", "createdAt"
    FROM "WorkflowRegistryAuditEvent"
    WHERE "orgId" = ${orgId}
      AND (${workflowId ?? null}::text IS NULL OR "workflowId" = ${workflowId ?? null})
    ORDER BY "createdAt" ASC
  `;

  return rows.map((row) => ({
    id: row.id,
    orgId: row.orgId,
    workflowId: row.workflowId,
    version: Number(row.version),
    action: row.action as WorkflowRegistryAuditRecord["action"],
    actorSub: row.actorSub ?? undefined,
    actorRole: row.actorRole ?? undefined,
    metadata: asMetadata(row.metadata),
    createdAt: row.createdAt.toISOString()
  }));
};

export const persistWorkflowVisibilityPolicyConfig = async (
  record: WorkflowVisibilityPolicyConfigRecord
) => {
  const prisma = maybePrisma();
  if (!prisma) {
    return;
  }

  await prisma.$executeRaw`
    INSERT INTO "ControlConfigVersion"
      ("id", "orgId", "versionName", "changeReason", "changedByUser", "changedByRole", "createdAt",
       "windowDaysLow", "windowDaysMedium", "windowDaysHigh",
       "minEventsLow", "minEventsMedium", "minEventsHigh", "requireVerificationHigh")
    VALUES
      (${record.id}, ${record.orgId}, ${record.versionName}, ${record.changeReason}, ${record.changedByUser}, ${record.changedByRole},
       ${new Date(record.createdAt)}, ${record.windowDaysLow}, ${record.windowDaysMedium}, ${record.windowDaysHigh},
       ${record.minEventsLow}, ${record.minEventsMedium}, ${record.minEventsHigh}, ${record.requireVerificationHigh})
    ON CONFLICT ("id") DO NOTHING
  `;
};

export const listWorkflowVisibilityPolicyConfigsByOrg = async (
  orgId: string
): Promise<WorkflowVisibilityPolicyConfigRecord[]> => {
  const prisma = maybePrisma();
  if (!prisma) {
    return [];
  }

  const rows = await prisma.$queryRaw<PersistedPolicyConfigRow[]>`
    SELECT "id", "orgId", "versionName", "changeReason", "changedByUser", "changedByRole",
           "windowDaysLow", "windowDaysMedium", "windowDaysHigh",
           "minEventsLow", "minEventsMedium", "minEventsHigh", "requireVerificationHigh", "createdAt"
    FROM "ControlConfigVersion"
    WHERE "orgId" = ${orgId}
    ORDER BY "createdAt" ASC, "id" ASC
  `;

  return rows.map((row) => ({
    id: row.id,
    orgId: row.orgId,
    versionName: row.versionName,
    changeReason: row.changeReason,
    changedByUser: row.changedByUser,
    changedByRole: row.changedByRole,
    windowDaysLow: Number(row.windowDaysLow),
    windowDaysMedium: Number(row.windowDaysMedium),
    windowDaysHigh: Number(row.windowDaysHigh),
    minEventsLow: Number(row.minEventsLow),
    minEventsMedium: Number(row.minEventsMedium),
    minEventsHigh: Number(row.minEventsHigh),
    requireVerificationHigh: Boolean(row.requireVerificationHigh),
    createdAt: row.createdAt.toISOString()
  }));
};

export const persistBaselineResetEvent = async (record: BaselineResetEventRecord) => {
  const prisma = maybePrisma();
  if (!prisma) {
    return;
  }

  await prisma.$executeRaw`
    INSERT INTO "BaselineResetEvent"
      ("id", "orgId", "controlConfigVersionId", "resetAt", "reason", "triggeredByUser", "triggeredByRole")
    VALUES
      (${record.id}, ${record.orgId}, ${record.controlConfigVersionId}, ${new Date(record.resetAt)},
       ${record.reason}, ${record.triggeredByUser}, ${record.triggeredByRole})
    ON CONFLICT ("id") DO NOTHING
  `;
};

export const listBaselineResetEventsByOrg = async (
  orgId: string
): Promise<BaselineResetEventRecord[]> => {
  const prisma = maybePrisma();
  if (!prisma) {
    return [];
  }

  const rows = await prisma.$queryRaw<PersistedBaselineResetRow[]>`
    SELECT "id", "orgId", "controlConfigVersionId", "resetAt", "reason", "triggeredByUser", "triggeredByRole"
    FROM "BaselineResetEvent"
    WHERE "orgId" = ${orgId}
    ORDER BY "resetAt" ASC, "id" ASC
  `;

  return rows.map((row) => ({
    id: row.id,
    orgId: row.orgId,
    controlConfigVersionId: row.controlConfigVersionId,
    resetAt: row.resetAt.toISOString(),
    reason: row.reason,
    triggeredByUser: row.triggeredByUser,
    triggeredByRole: row.triggeredByRole
  }));
};
