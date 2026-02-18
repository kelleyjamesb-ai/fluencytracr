import { getPrisma } from "./db";
import type {
  WorkflowRegistryAuditRecord,
  WorkflowRegistryRecord,
  WorkflowVisibilityPolicyConfigRecord
} from "./store";

type PersistedRegistryRow = {
  id: string;
  orgId: string;
  workflowId: string;
  version: number;
  riskClass: string;
  changeReason: string | null;
  actorSub: string | null;
  actorRole: string | null;
  createdAt: Date;
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
  workflowId: string;
  registryVersion: number;
  policyVersion: string;
  lowMinEvents: number;
  mediumMinEvents: number;
  highMinEvents: number;
  minWindowDays: number;
  highSparseMinEvents: number;
  highSparseMinWindowDays: number;
  createdAt: Date;
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
    INSERT INTO "WorkflowRegistryEntry"
      ("id", "orgId", "workflowId", "version", "riskClass", "changeReason", "actorSub", "actorRole", "createdAt")
    VALUES
      (${record.id}, ${record.orgId}, ${record.workflowId}, ${record.version}, ${record.riskClass},
       ${record.changeReason ?? null}, ${record.actorSub ?? null}, ${record.actorRole ?? null}, ${new Date(record.createdAt)})
    ON CONFLICT ("orgId", "workflowId", "version") DO NOTHING
  `;
};

export const listWorkflowRegistryEntriesByOrg = async (orgId: string): Promise<WorkflowRegistryRecord[]> => {
  const prisma = maybePrisma();
  if (!prisma) {
    return [];
  }

  const rows = await prisma.$queryRaw<PersistedRegistryRow[]>`
    SELECT "id", "orgId", "workflowId", "version", "riskClass", "changeReason", "actorSub", "actorRole", "createdAt"
    FROM "WorkflowRegistryEntry"
    WHERE "orgId" = ${orgId}
    ORDER BY "workflowId" ASC, "version" ASC, "createdAt" ASC
  `;

  return rows.map((row) => ({
    id: row.id,
    orgId: row.orgId,
    workflowId: row.workflowId,
    version: Number(row.version),
    riskClass: row.riskClass as WorkflowRegistryRecord["riskClass"],
    changeReason: row.changeReason ?? undefined,
    actorSub: row.actorSub ?? undefined,
    actorRole: row.actorRole ?? undefined,
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
    INSERT INTO "WorkflowVisibilityPolicyConfig"
      ("id", "orgId", "workflowId", "registryVersion", "policyVersion",
       "lowMinEvents", "mediumMinEvents", "highMinEvents", "minWindowDays",
       "highSparseMinEvents", "highSparseMinWindowDays", "createdAt")
    VALUES
      (${record.id}, ${record.orgId}, ${record.workflowId}, ${record.registryVersion},
       ${record.policyVersion}, ${record.lowMinEvents}, ${record.mediumMinEvents},
       ${record.highMinEvents}, ${record.minWindowDays}, ${record.highSparseMinEvents},
       ${record.highSparseMinWindowDays}, ${new Date(record.createdAt)})
    ON CONFLICT ("orgId", "workflowId", "registryVersion") DO UPDATE SET
      "policyVersion" = EXCLUDED."policyVersion",
      "lowMinEvents" = EXCLUDED."lowMinEvents",
      "mediumMinEvents" = EXCLUDED."mediumMinEvents",
      "highMinEvents" = EXCLUDED."highMinEvents",
      "minWindowDays" = EXCLUDED."minWindowDays",
      "highSparseMinEvents" = EXCLUDED."highSparseMinEvents",
      "highSparseMinWindowDays" = EXCLUDED."highSparseMinWindowDays"
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
    SELECT "id", "orgId", "workflowId", "registryVersion", "policyVersion",
           "lowMinEvents", "mediumMinEvents", "highMinEvents", "minWindowDays",
           "highSparseMinEvents", "highSparseMinWindowDays", "createdAt"
    FROM "WorkflowVisibilityPolicyConfig"
    WHERE "orgId" = ${orgId}
    ORDER BY "workflowId" ASC, "registryVersion" ASC, "createdAt" ASC
  `;

  return rows.map((row) => ({
    id: row.id,
    orgId: row.orgId,
    workflowId: row.workflowId,
    registryVersion: Number(row.registryVersion),
    policyVersion: row.policyVersion,
    lowMinEvents: Number(row.lowMinEvents),
    mediumMinEvents: Number(row.mediumMinEvents),
    highMinEvents: Number(row.highMinEvents),
    minWindowDays: Number(row.minWindowDays),
    highSparseMinEvents: Number(row.highSparseMinEvents),
    highSparseMinWindowDays: Number(row.highSparseMinWindowDays),
    createdAt: row.createdAt.toISOString()
  }));
};
