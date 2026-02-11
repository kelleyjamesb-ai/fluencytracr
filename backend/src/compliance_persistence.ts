import { getPrisma } from "./db";
import type {
  CanonicalControlSnapshotRecord,
  ComplianceEventRecord,
  PolicyDocumentRecord,
  PolicyMappingRecord,
  PolicyUnresolvedClauseRecord
} from "./store";

type PersistedPolicyMappingRow = {
  id: string;
  policyId: string;
  orgId: string;
  controlsJson: unknown;
  unresolvedJson: unknown;
  generatedAt: Date;
};

type PersistedPolicyDocumentRow = {
  id: string;
  orgId: string;
  fileName: string;
  contentType: string;
  rawText: string;
  sourceFormat: string;
  clauseCount: number;
  createdAt: Date;
};

type PersistedControlHistoryRow = {
  id: string;
  orgId: string;
  controlName: string;
  status: string;
  source: string;
  bucketStart: string;
  bucketEnd: string;
  updatedAt: Date;
};

type PersistedComplianceEventRow = {
  id: string;
  orgId: string;
  eventType: string;
  policyId: string | null;
  controlName: string | null;
  status: string | null;
  createdAt: Date;
  metadata: unknown;
  sourceEventId: string | null;
  sourceEventType: string | null;
  recomputedAt: Date | null;
};

type EventFilters = {
  since?: string;
  policyId?: string;
  eventType?: string;
  asOf?: string;
};

const maybePrisma = () => {
  if (!process.env.DATABASE_URL) {
    return null;
  }
  return getPrisma();
};

const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
};

const asUnresolved = (value: unknown): PolicyUnresolvedClauseRecord[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry) => Boolean(entry) && typeof entry === "object") as PolicyUnresolvedClauseRecord[];
};

const asControls = (value: unknown): PolicyMappingRecord["controls"] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value as PolicyMappingRecord["controls"];
};

export const persistPolicyDocument = async (record: PolicyDocumentRecord) => {
  const prisma = maybePrisma();
  if (!prisma) {
    return;
  }
  await prisma.$executeRaw`
    INSERT INTO "PolicyDocument"
      ("id", "orgId", "fileName", "contentType", "rawText", "sourceFormat", "clauseCount", "createdAt")
    VALUES
      (${record.policyId}, ${record.orgId}, ${record.fileName}, ${record.contentType}, ${record.rawText},
       ${record.sourceFormat}, ${record.clauseCount}, ${new Date(record.createdAt)})
    ON CONFLICT ("id") DO UPDATE SET
      "fileName" = EXCLUDED."fileName",
      "contentType" = EXCLUDED."contentType",
      "rawText" = EXCLUDED."rawText",
      "sourceFormat" = EXCLUDED."sourceFormat",
      "clauseCount" = EXCLUDED."clauseCount"
  `;
};

export const listPolicyDocumentsByOrg = async (orgId: string): Promise<PolicyDocumentRecord[]> => {
  const prisma = maybePrisma();
  if (!prisma) {
    return [];
  }
  const rows = await prisma.$queryRaw<PersistedPolicyDocumentRow[]>`
    SELECT "id", "orgId", "fileName", "contentType", "rawText", "sourceFormat", "clauseCount", "createdAt"
    FROM "PolicyDocument"
    WHERE "orgId" = ${orgId}
    ORDER BY "createdAt" DESC
  `;
  return rows.map((row) => ({
    policyId: row.id,
    orgId: row.orgId,
    fileName: row.fileName,
    contentType: row.contentType,
    rawText: row.rawText,
    sourceFormat: row.sourceFormat as PolicyDocumentRecord["sourceFormat"],
    clauseCount: Number(row.clauseCount),
    createdAt: row.createdAt.toISOString()
  }));
};

export const persistPolicyMapping = async (record: PolicyMappingRecord) => {
  const prisma = maybePrisma();
  if (!prisma) {
    return;
  }
  await prisma.$executeRaw`
    INSERT INTO "PolicyMapping"
      ("id", "policyId", "orgId", "controlsJson", "unresolvedJson", "generatedAt")
    VALUES
      (${record.mappingId}, ${record.policyId}, ${record.orgId},
       ${record.controls}::jsonb, ${record.unresolvedClauses}::jsonb, ${new Date(record.generatedAt)})
    ON CONFLICT ("id") DO UPDATE SET
      "controlsJson" = EXCLUDED."controlsJson",
      "unresolvedJson" = EXCLUDED."unresolvedJson",
      "generatedAt" = EXCLUDED."generatedAt"
  `;
};

export const listPolicyMappingsByOrg = async (orgId: string): Promise<PolicyMappingRecord[]> => {
  const prisma = maybePrisma();
  if (!prisma) {
    return [];
  }
  const rows = await prisma.$queryRaw<PersistedPolicyMappingRow[]>`
    SELECT "id", "policyId", "orgId", "controlsJson", "unresolvedJson", "generatedAt"
    FROM "PolicyMapping"
    WHERE "orgId" = ${orgId}
    ORDER BY "generatedAt" DESC
  `;
  return rows.map((row) => ({
    mappingId: row.id,
    policyId: row.policyId,
    orgId: row.orgId,
    controls: asControls(row.controlsJson),
    unresolvedClauses: asUnresolved(row.unresolvedJson),
    generatedAt: row.generatedAt.toISOString()
  }));
};

export const persistCanonicalControlHistory = async (record: CanonicalControlSnapshotRecord) => {
  const prisma = maybePrisma();
  if (!prisma) {
    return;
  }
  await prisma.$executeRaw`
    INSERT INTO "CanonicalControlStateHistory"
      ("id", "orgId", "controlName", "status", "source", "bucketStart", "bucketEnd", "updatedAt")
    VALUES
      (${`${record.orgId}:${record.control_name}:${record.updatedAt}:${Math.random()}`},
       ${record.orgId}, ${record.control_name}, ${record.status}, ${record.source},
       ${record.bucket_start}, ${record.bucket_end}, ${new Date(record.updatedAt)})
  `;
};

export const listLatestCanonicalControlsByOrg = async (
  orgId: string,
  asOf?: string
): Promise<CanonicalControlSnapshotRecord[]> => {
  const prisma = maybePrisma();
  if (!prisma) {
    return [];
  }
  const asOfDate = asOf ? new Date(asOf) : null;
  const rows = asOfDate && !Number.isNaN(asOfDate.getTime())
    ? await prisma.$queryRaw<PersistedControlHistoryRow[]>`
        SELECT DISTINCT ON ("controlName")
          "id", "orgId", "controlName", "status", "source", "bucketStart", "bucketEnd", "updatedAt"
        FROM "CanonicalControlStateHistory"
        WHERE "orgId" = ${orgId} AND "updatedAt" <= ${asOfDate}
        ORDER BY "controlName", "updatedAt" DESC
      `
    : await prisma.$queryRaw<PersistedControlHistoryRow[]>`
        SELECT DISTINCT ON ("controlName")
          "id", "orgId", "controlName", "status", "source", "bucketStart", "bucketEnd", "updatedAt"
        FROM "CanonicalControlStateHistory"
        WHERE "orgId" = ${orgId}
        ORDER BY "controlName", "updatedAt" DESC
      `;

  return rows.map((row) => ({
    orgId: row.orgId,
    control_name: row.controlName,
    status: row.status as CanonicalControlSnapshotRecord["status"],
    source: row.source as CanonicalControlSnapshotRecord["source"],
    bucket_start: row.bucketStart,
    bucket_end: row.bucketEnd,
    updatedAt: row.updatedAt.toISOString()
  }));
};

export const persistComplianceEvent = async (record: ComplianceEventRecord) => {
  const prisma = maybePrisma();
  if (!prisma) {
    return;
  }
  const metadata = asRecord(record.metadata);
  const sourceEventId = typeof metadata.source_event_id === "string" ? metadata.source_event_id : null;
  const sourceEventType = typeof metadata.source_event_type === "string" ? metadata.source_event_type : null;
  const recomputedAt =
    typeof metadata.recomputed_at === "string" && !Number.isNaN(new Date(metadata.recomputed_at).getTime())
      ? new Date(metadata.recomputed_at)
      : null;

  await prisma.$executeRaw`
    INSERT INTO "ComplianceEvent"
      ("id", "orgId", "eventType", "policyId", "controlName", "status", "createdAt",
       "metadata", "sourceEventId", "sourceEventType", "recomputedAt")
    VALUES
      (${record.eventId}, ${record.orgId}, ${record.eventType}, ${record.policyId ?? null},
       ${record.controlName ?? null}, ${record.status ?? null}, ${new Date(record.createdAt)},
       ${metadata}::jsonb, ${sourceEventId}, ${sourceEventType}, ${recomputedAt})
    ON CONFLICT ("id") DO NOTHING
  `;
};

export const listComplianceEventsByOrg = async (
  orgId: string,
  filters: EventFilters
): Promise<ComplianceEventRecord[]> => {
  const prisma = maybePrisma();
  if (!prisma) {
    return [];
  }
  const rows = await prisma.$queryRaw<PersistedComplianceEventRow[]>`
    SELECT
      "id", "orgId", "eventType", "policyId", "controlName", "status", "createdAt",
      "metadata", "sourceEventId", "sourceEventType", "recomputedAt"
    FROM "ComplianceEvent"
    WHERE "orgId" = ${orgId}
      AND (${filters.policyId ?? null}::text IS NULL OR "policyId" = ${filters.policyId ?? null})
      AND (${filters.eventType ?? null}::text IS NULL OR "eventType" = ${filters.eventType ?? null})
      AND (${filters.since ? new Date(filters.since) : null}::timestamptz IS NULL OR "createdAt" >= ${filters.since ? new Date(filters.since) : null})
      AND (${filters.asOf ? new Date(filters.asOf) : null}::timestamptz IS NULL OR "createdAt" <= ${filters.asOf ? new Date(filters.asOf) : null})
    ORDER BY "createdAt" ASC
  `;

  return rows.map((row) => {
    const metadata = asRecord(row.metadata);
    if (row.sourceEventId) {
      metadata.source_event_id = row.sourceEventId;
    }
    if (row.sourceEventType) {
      metadata.source_event_type = row.sourceEventType;
    }
    if (row.recomputedAt) {
      metadata.recomputed_at = row.recomputedAt.toISOString();
    }
    return {
      eventId: row.id,
      orgId: row.orgId,
      eventType: row.eventType as ComplianceEventRecord["eventType"],
      policyId: row.policyId ?? undefined,
      controlName: row.controlName ?? undefined,
      status: (row.status as ComplianceEventRecord["status"]) ?? undefined,
      createdAt: row.createdAt.toISOString(),
      metadata
    };
  });
};
