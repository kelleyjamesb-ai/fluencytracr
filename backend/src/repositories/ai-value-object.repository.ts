import type { Prisma } from "@prisma/client";

import { getPrisma } from "../db";
import { store, type AiValueObjectStoredRecord } from "../store";

const usePrisma = () => Boolean(process.env.DATABASE_URL);

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

export async function getAiValueObject(
  orgId: string,
  objectType: string,
  objectId: string
): Promise<AiValueObjectStoredRecord | null> {
  if (!usePrisma()) {
    return store.aiValueObjects.get(memoryKey(orgId, objectType, objectId)) ?? null;
  }
  const row = await getPrisma().aiValueObject.findUnique({
    where: {
      ai_value_objects_unique_key: { orgId, objectType, objectId }
    }
  });
  return row ? rowToRecord(row) : null;
}

export async function listAiValueObjects(
  orgId: string,
  objectType?: string
): Promise<AiValueObjectStoredRecord[]> {
  if (!usePrisma()) {
    return Array.from(store.aiValueObjects.values())
      .filter((record) => record.org_id === orgId)
      .filter((record) => !objectType || record.object_type === objectType)
      .sort(
        (a, b) =>
          a.object_type.localeCompare(b.object_type) ||
          a.object_id.localeCompare(b.object_id)
      );
  }
  const rows = await getPrisma().aiValueObject.findMany({
    where: { orgId, objectType },
    orderBy: [{ objectType: "asc" }, { objectId: "asc" }]
  });
  return rows.map(rowToRecord);
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
