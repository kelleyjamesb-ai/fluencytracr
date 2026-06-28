/**
 * FluencyTracr v1 — append-only canonical_events persistence (Phase 1 blueprint).
 * When DATABASE_URL is set, POST /api/events and /api/ingest also write Prisma rows;
 * readers merge DB rows with the in-memory store (memory wins on duplicate event_id).
 */

import type { FluencyEvent } from "@fluencytracr/shared";
import { FluencyEventSchema } from "@fluencytracr/shared";
import type { Prisma } from "@prisma/client";
import { getPrisma } from "../db";
import { insertFluencyEvent, store, type FluencyEventRecord } from "../store";

type FluencyPayloadV1 = {
  readonly v: 1;
  readonly event: FluencyEvent;
  readonly event_id: string;
  readonly execution_id: string;
};

const isPayloadV1 = (value: unknown): value is FluencyPayloadV1 => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const rec = value as Record<string, unknown>;
  return rec.v === 1 && FluencyEventSchema.safeParse(rec.event).success;
};

export const isFluencyCanonicalPersistenceEnabled = (): boolean =>
  Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);

const inferActorType = (event: FluencyEvent): string => {
  switch (event.event_type) {
    case "ai_output_disposition":
    case "ai_recovery_loop":
    case "ai_abandonment":
      return "ai";
    case "workflow_stage_transition":
      return event.ai_assisted ? "ai" : "human";
    case "verification_signal":
    default:
      return "human";
  }
};

const stripRecordToEvent = (record: FluencyEventRecord): FluencyEvent => {
  const { event_id: _eid, execution_id: _ex, ...rest } = record;
  return rest as FluencyEvent;
};

const tagOrgUnit = (record: FluencyEventRecord, orgId?: string): FluencyEventRecord => {
  if (!orgId) {
    return record;
  }
  if (typeof record.org_unit === "string" && record.org_unit.length > 0) {
    return record;
  }
  return { ...record, org_unit: `org:${orgId}` };
};

const eventTimestamp = (record: FluencyEventRecord): Date => {
  const t = new Date(record.timestamp);
  return Number.isNaN(t.getTime()) ? new Date(0) : t;
};

const compareRecords = (a: FluencyEventRecord, b: FluencyEventRecord): number => {
  const ta = eventTimestamp(a).getTime();
  const tb = eventTimestamp(b).getTime();
  if (ta !== tb) {
    return ta - tb;
  }
  return a.event_id.localeCompare(b.event_id);
};

const canonicalRowToRecord = (row: {
  orgId: string;
  eventPayloadJson: Prisma.JsonValue;
}): FluencyEventRecord | null => {
  const raw = row.eventPayloadJson;
  if (!isPayloadV1(raw)) {
    return null;
  }
  const merged: FluencyEventRecord = {
    ...raw.event,
    event_id: raw.event_id,
    execution_id: raw.execution_id
  };
  if (!merged.org_unit || merged.org_unit.length === 0) {
    return { ...merged, org_unit: `org:${row.orgId}` };
  }
  return merged;
};

const mergeByEventId = (dbRows: FluencyEventRecord[], memory: FluencyEventRecord[]): FluencyEventRecord[] => {
  const map = new Map<string, FluencyEventRecord>();
  for (const r of dbRows) {
    map.set(r.event_id, r);
  }
  for (const r of memory) {
    map.set(r.event_id, r);
  }
  return Array.from(map.values()).sort(compareRecords);
};

export type LoadFluencyEventRecordsOptions = {
  /** When set, only canonical_events rows for this org are loaded from Postgres. */
  readonly dbOrgId?: string;
};

/**
 * Returns fluency events for pipeline routes: in-memory store merged with canonical_events
 * when DATABASE_URL is configured.
 */
export const loadFluencyEventRecords = async (
  options: LoadFluencyEventRecordsOptions = {}
): Promise<FluencyEventRecord[]> => {
  const memory = Array.from(store.fluencyEvents.values());
  const tenant = options.dbOrgId;
  if (!isFluencyCanonicalPersistenceEnabled()) {
    return memory;
  }
  try {
    const prisma = getPrisma();
    const where = tenant ? { orgId: tenant } : {};
    const rows = await prisma.v1CanonicalEvent.findMany({
      where,
      orderBy: { ingestSequence: "asc" }
    });
    const fromDb: FluencyEventRecord[] = [];
    for (const row of rows) {
      const rec = canonicalRowToRecord(row);
      if (rec) {
        fromDb.push(rec);
      }
    }
    return mergeByEventId(fromDb, memory);
  } catch {
    return memory;
  }
};

export type PersistFluencyEventOptions = {
  readonly orgId?: string;
  readonly schemaVersion: string;
};

/**
 * Persists one Fluency event: optional Postgres append (when DATABASE_URL + orgId),
 * then in-memory store (always).
 */
export const persistFluencyEventRecord = async (
  record: FluencyEventRecord,
  options: PersistFluencyEventOptions
): Promise<void> => {
  const tagged = tagOrgUnit(record, options.orgId);
  if (isFluencyCanonicalPersistenceEnabled()) {
    if (!options.orgId) {
      throw new Error("org_id required when DATABASE_URL is set (JWT org_id or x-org-id header)");
    }
    const prisma = getPrisma();
    const payload: FluencyPayloadV1 = {
      v: 1,
      event: stripRecordToEvent(tagged),
      event_id: tagged.event_id,
      execution_id: tagged.execution_id
    };
    await prisma.v1CanonicalEvent.create({
      data: {
        orgId: options.orgId,
        workflowId: tagged.workflow_id,
        jbtdId: tagged.jbtd_id ?? null,
        personaId: tagged.persona_id ?? null,
        executionId: tagged.execution_id,
        eventName: tagged.event_type,
        eventVersion: options.schemaVersion,
        actorType: inferActorType(tagged),
        eventTimestamp: eventTimestamp(tagged),
        eventPayloadJson: payload as Prisma.InputJsonValue,
        sourceIdentityJson: {}
      }
    });
  }
  insertFluencyEvent(tagged);
};
