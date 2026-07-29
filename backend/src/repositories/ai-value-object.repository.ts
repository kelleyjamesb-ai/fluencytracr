import crypto from "node:crypto";

import { aiValueEngine } from "@fluencytracr/shared";
import { Prisma } from "@prisma/client";

import { getPrisma } from "../db";
import { store, type AiValueObjectStoredRecord } from "../store";

const usePrisma = () => Boolean(process.env.DATABASE_URL);

const INTERNAL_OBJECT_TYPES = new Set(aiValueEngine.INTERNAL_AGGREGATE_CLAIM_OBJECT_TYPES);

const memoryKey = (orgId: string, objectType: string, objectId: string) =>
  `${orgId}:${objectType}:${objectId}`;

export interface AiValueObjectUpsertInput {
  orgId: string;
  objectType: string;
  objectId: string;
  schemaVersion: string;
  workflowFamily: string | null;
  payload: Record<string, unknown>;
  validation: Record<string, unknown>;
  valid: boolean;
}

export async function upsertAiValueObject(
  input: AiValueObjectUpsertInput
): Promise<AiValueObjectStoredRecord> {
  if (INTERNAL_OBJECT_TYPES.has(input.objectType)) {
    throw new Error("INTERNAL_AI_VALUE_OBJECT_REQUIRES_IMMUTABLE_REPOSITORY");
  }
  const now = new Date().toISOString();
  if (!usePrisma()) {
    const key = memoryKey(input.orgId, input.objectType, input.objectId);
    const existing = store.aiValueObjects.get(key);
    const record: AiValueObjectStoredRecord = {
      org_id: input.orgId,
      object_type: input.objectType,
      object_id: input.objectId,
      schema_version: input.schemaVersion,
      workflow_family: input.workflowFamily,
      payload: input.payload,
      validation: input.validation,
      valid: input.valid,
      created_at: existing?.created_at ?? now,
      updated_at: now
    };
    store.aiValueObjects.set(key, record);
    return record;
  }

  const row = await getPrisma().aiValueObject.upsert({
    where: {
      ai_value_objects_unique_key: {
        orgId: input.orgId,
        objectType: input.objectType,
        objectId: input.objectId
      }
    },
    create: {
      orgId: input.orgId,
      objectType: input.objectType,
      objectId: input.objectId,
      schemaVersion: input.schemaVersion,
      workflowFamily: input.workflowFamily,
      payloadJson: input.payload as Prisma.InputJsonValue,
      validationJson: input.validation as Prisma.InputJsonValue,
      valid: input.valid
    },
    update: {
      schemaVersion: input.schemaVersion,
      workflowFamily: input.workflowFamily,
      payloadJson: input.payload as Prisma.InputJsonValue,
      validationJson: input.validation as Prisma.InputJsonValue,
      valid: input.valid
    }
  });
  return rowToRecord(row);
}

const getAiValueObjectRaw = async (
  orgId: string,
  objectType: string,
  objectId: string
): Promise<AiValueObjectStoredRecord | null> => {
  if (!usePrisma()) {
    return store.aiValueObjects.get(memoryKey(orgId, objectType, objectId)) ?? null;
  }
  const row = await getPrisma().aiValueObject.findUnique({
    where: {
      ai_value_objects_unique_key: { orgId, objectType, objectId }
    }
  });
  return row ? rowToRecord(row) : null;
};

export async function getAiValueObject(
  orgId: string,
  objectType: string,
  objectId: string
): Promise<AiValueObjectStoredRecord | null> {
  if (INTERNAL_OBJECT_TYPES.has(objectType)) return null;
  return getAiValueObjectRaw(orgId, objectType, objectId);
}

export async function listAiValueObjects(
  orgId: string,
  objectType?: string
): Promise<AiValueObjectStoredRecord[]> {
  if (objectType && INTERNAL_OBJECT_TYPES.has(objectType)) return [];
  if (!usePrisma()) {
    return Array.from(store.aiValueObjects.values())
      .filter((record) => record.org_id === orgId)
      .filter((record) => !objectType || record.object_type === objectType)
      .filter((record) => !INTERNAL_OBJECT_TYPES.has(record.object_type))
      .sort(
        (a, b) =>
          a.object_type.localeCompare(b.object_type) || a.object_id.localeCompare(b.object_id)
      );
  }
  const rows = await getPrisma().aiValueObject.findMany({
    where: {
      orgId,
      objectType: objectType ? objectType : { notIn: [...INTERNAL_OBJECT_TYPES] }
    },
    orderBy: [{ objectType: "asc" }, { objectId: "asc" }]
  });
  return rows.map(rowToRecord);
}

export interface AiValueObjectRef {
  objectType: string;
  objectId: string;
}

export interface AggregateClaimBundleRecords {
  claim: AiValueObjectStoredRecord;
  packet: AiValueObjectStoredRecord;
  manifest: AiValueObjectStoredRecord;
}

const storedRecordSemanticProjection = (
  record: AiValueObjectStoredRecord
): Record<string, unknown> => ({
  org_id: record.org_id,
  object_type: record.object_type,
  object_id: record.object_id,
  schema_version: record.schema_version,
  workflow_family: record.workflow_family,
  payload: record.payload,
  validation: record.validation,
  valid: record.valid
});

export const aiValueObjectSemanticHash = (record: AiValueObjectStoredRecord): string =>
  aiValueEngine.aggregateClaimHash(
    "FT_AI_VALUE_OBJECT_SEMANTIC_RECORD_V1",
    storedRecordSemanticProjection(record)
  );

export const aiValueObjectUsesPrisma = (): boolean => usePrisma();

export async function readAiValueObjectSet(
  orgId: string,
  refs: ReadonlyArray<AiValueObjectRef>
): Promise<AiValueObjectStoredRecord[] | null> {
  const sorted = [...refs].sort(
    (left, right) =>
      left.objectType.localeCompare(right.objectType) || left.objectId.localeCompare(right.objectId)
  );
  const records: AiValueObjectStoredRecord[] = [];
  for (const ref of sorted) {
    const record = await getAiValueObject(orgId, ref.objectType, ref.objectId);
    if (!record) return null;
    records.push(record);
  }
  return records;
}

const artifactInput = (
  orgId: string,
  objectType: string,
  objectId: string,
  payload: Record<string, unknown>,
  workflowFamily: string | null,
  manifestId: string
): AiValueObjectUpsertInput => ({
  orgId,
  objectType,
  objectId,
  schemaVersion: String(payload.schema_version),
  workflowFamily,
  payload,
  validation: {
    valid: true,
    claim_authorization_authoritative: true,
    immutable: true,
    manifest_id: manifestId
  },
  valid: true
});

const inputSemanticProjection = (input: AiValueObjectUpsertInput): Record<string, unknown> => ({
  org_id: input.orgId,
  object_type: input.objectType,
  object_id: input.objectId,
  schema_version: input.schemaVersion,
  workflow_family: input.workflowFamily,
  payload: input.payload,
  validation: input.validation,
  valid: input.valid
});

const inputSemanticHash = (input: AiValueObjectUpsertInput): string =>
  aiValueEngine.aggregateClaimHash(
    "FT_AI_VALUE_OBJECT_SEMANTIC_RECORD_V1",
    inputSemanticProjection(input)
  );

const transactionRecord = async (
  transaction: Prisma.TransactionClient,
  orgId: string,
  ref: AiValueObjectRef
): Promise<AiValueObjectStoredRecord | null> => {
  const row = await transaction.aiValueObject.findUnique({
    where: {
      ai_value_objects_unique_key: {
        orgId,
        objectType: ref.objectType,
        objectId: ref.objectId
      }
    }
  });
  return row ? rowToRecord(row) : null;
};

const insertOrExactArtifact = async (
  transaction: Prisma.TransactionClient,
  input: AiValueObjectUpsertInput
): Promise<AiValueObjectStoredRecord> => {
  const now = new Date();
  await transaction.$executeRaw(
    Prisma.sql`INSERT INTO "ai_value_objects" (
      "id", "org_id", "object_type", "object_id", "schema_version",
      "workflow_family", "payload_json", "validation_json", "valid",
      "created_at", "updated_at"
    ) VALUES (
      ${crypto.randomUUID()}::uuid,
      ${input.orgId},
      ${input.objectType},
      ${input.objectId},
      ${input.schemaVersion},
      ${input.workflowFamily},
      ${JSON.stringify(input.payload)}::jsonb,
      ${JSON.stringify(input.validation)}::jsonb,
      ${input.valid},
      ${now},
      ${now}
    )
    ON CONFLICT ("org_id", "object_type", "object_id") DO NOTHING`
  );
  const exact = await transactionRecord(transaction, input.orgId, {
    objectType: input.objectType,
    objectId: input.objectId
  });
  if (!exact || aiValueObjectSemanticHash(exact) !== inputSemanticHash(input)) {
    throw new Error("AGGREGATE_CLAIM_IMMUTABLE_ARTIFACT_CONFLICT");
  }
  return exact;
};

export async function sealAiValueClaimBundleSerializable(input: {
  orgId: string;
  sourceSnapshots: ReadonlyArray<AiValueObjectStoredRecord>;
  claim: aiValueEngine.AggregateAuthorizedClaimArtifact;
  packet: aiValueEngine.AggregateAuthorizedPacketArtifact;
  manifest: aiValueEngine.AggregateClaimAuthorizationManifest;
}): Promise<AggregateClaimBundleRecords | null> {
  // The in-memory fallback is intentionally non-authoritative. It may support
  // pure contract tests, but it cannot prove durable locking or isolation.
  if (!usePrisma()) return null;
  const sourceSnapshots = [...input.sourceSnapshots].sort(
    (left, right) =>
      left.object_type.localeCompare(right.object_type) ||
      left.object_id.localeCompare(right.object_id)
  );
  // Reserved Slice D artifacts retain only opaque commitments in their payload
  // and do not duplicate a raw workflow identity into the row envelope.
  const workflowFamily = null;
  const artifactInputs = [
    artifactInput(
      input.orgId,
      aiValueEngine.INTERNAL_AGGREGATE_CLAIM_OBJECT_TYPE,
      input.claim.claim_id,
      input.claim,
      workflowFamily,
      input.manifest.manifest_id
    ),
    artifactInput(
      input.orgId,
      aiValueEngine.INTERNAL_AGGREGATE_MANIFEST_OBJECT_TYPE,
      input.manifest.manifest_id,
      input.manifest,
      workflowFamily,
      input.manifest.manifest_id
    ),
    artifactInput(
      input.orgId,
      aiValueEngine.INTERNAL_AGGREGATE_PACKET_OBJECT_TYPE,
      input.packet.packet_id,
      input.packet,
      workflowFamily,
      input.manifest.manifest_id
    )
  ].sort(
    (left, right) =>
      left.objectType.localeCompare(right.objectType) || left.objectId.localeCompare(right.objectId)
  );

  try {
    return await getPrisma().$transaction(
      async (transaction) => {
        for (const source of sourceSnapshots) {
          await transaction.$queryRaw(
            Prisma.sql`SELECT "id" FROM "ai_value_objects"
              WHERE "org_id" = ${input.orgId}
                AND "object_type" = ${source.object_type}
                AND "object_id" = ${source.object_id}
              FOR UPDATE`
          );
        }
        for (const source of sourceSnapshots) {
          const reloaded = await transactionRecord(transaction, input.orgId, {
            objectType: source.object_type,
            objectId: source.object_id
          });
          if (
            !reloaded ||
            aiValueObjectSemanticHash(reloaded) !== aiValueObjectSemanticHash(source)
          ) {
            throw new Error("AGGREGATE_CLAIM_SOURCE_CHANGED");
          }
        }
        const stored = new Map<string, AiValueObjectStoredRecord>();
        for (const artifact of artifactInputs) {
          stored.set(artifact.objectType, await insertOrExactArtifact(transaction, artifact));
        }
        const claim = stored.get(aiValueEngine.INTERNAL_AGGREGATE_CLAIM_OBJECT_TYPE);
        const packet = stored.get(aiValueEngine.INTERNAL_AGGREGATE_PACKET_OBJECT_TYPE);
        const manifest = stored.get(aiValueEngine.INTERNAL_AGGREGATE_MANIFEST_OBJECT_TYPE);
        if (!claim || !packet || !manifest) {
          throw new Error("AGGREGATE_CLAIM_BUNDLE_INCOMPLETE");
        }
        return { claim, packet, manifest };
      },
      { isolationLevel: "Serializable" }
    );
  } catch {
    return null;
  }
}

export async function readAiValueClaimBundle(
  orgId: string,
  packetId: string
): Promise<AggregateClaimBundleRecords | null> {
  const manifestId = aiValueEngine.aggregateManifestIdFromPacketId(packetId);
  if (!manifestId) return null;
  const packet = await getAiValueObjectRaw(
    orgId,
    aiValueEngine.INTERNAL_AGGREGATE_PACKET_OBJECT_TYPE,
    packetId
  );
  const manifest = await getAiValueObjectRaw(
    orgId,
    aiValueEngine.INTERNAL_AGGREGATE_MANIFEST_OBJECT_TYPE,
    manifestId
  );
  const parsedManifest = aiValueEngine.AggregateClaimAuthorizationManifestSchema.safeParse(
    manifest?.payload
  );
  if (!packet || !manifest || !parsedManifest.success) return null;
  const claim = await getAiValueObjectRaw(
    orgId,
    aiValueEngine.INTERNAL_AGGREGATE_CLAIM_OBJECT_TYPE,
    parsedManifest.data.claim_id
  );
  return claim ? { claim, packet, manifest } : null;
}

function rowToRecord(row: {
  orgId: string;
  objectType: string;
  objectId: string;
  schemaVersion: string;
  workflowFamily: string | null;
  payloadJson: Prisma.JsonValue;
  validationJson: Prisma.JsonValue;
  valid: boolean;
  createdAt: Date;
  updatedAt: Date;
}): AiValueObjectStoredRecord {
  return {
    org_id: row.orgId,
    object_type: row.objectType,
    object_id: row.objectId,
    schema_version: row.schemaVersion,
    workflow_family: row.workflowFamily,
    payload: row.payloadJson as Record<string, unknown>,
    validation: row.validationJson as Record<string, unknown>,
    valid: row.valid,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString()
  };
}
