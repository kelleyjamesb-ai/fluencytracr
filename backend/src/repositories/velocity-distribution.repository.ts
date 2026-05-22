import type { Prisma } from "@prisma/client";

import { getPrisma } from "../db";
import { store, type VelocityDistributionRecord, type VelocityEventName } from "../store";
import { VELOCITY_SCHEMA_VERSION, velocityStoreKey } from "../value_realization/velocity_index";

export const isVelocityPersistenceEnabled = () =>
  Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);
const VELOCITY_EVENT_NAMES: VelocityEventName[] = [
  "USER_FREQUENCY_OBSERVED",
  "USER_ENGAGEMENT_OBSERVED",
  "USER_BREADTH_OBSERVED"
];

type VelocityDistributionRow = {
  orgId: string;
  workflowId: string;
  jbtdId: string | null;
  personaId: string | null;
  eventName: string;
  schemaVersion: string;
  windowStart: Date;
  windowEnd: Date;
  cohortSize: number;
  ambiguityRate: number | null;
  distributionJson: Prisma.JsonValue;
  calibrationReference: string;
  personLevelFieldsIncluded: boolean;
  ingestedAt: Date;
};

const cacheRecord = (record: VelocityDistributionRecord): void => {
  store.velocityDistributions.set(
    velocityStoreKey(record.org_id, record.workflow_id, record.event_name, record.jbtd_id, record.persona_id),
    record
  );
};

const rowToRecord = (row: VelocityDistributionRow): VelocityDistributionRecord => ({
  org_id: row.orgId,
  schema_version: VELOCITY_SCHEMA_VERSION,
  event_name: row.eventName as VelocityEventName,
  workflow_id: row.workflowId,
  jbtd_id: row.jbtdId,
  persona_id: row.personaId,
  window_start: row.windowStart.toISOString(),
  window_end: row.windowEnd.toISOString(),
  cohort_size: row.cohortSize,
  ambiguity_rate: row.ambiguityRate ?? undefined,
  distribution: row.distributionJson as VelocityDistributionRecord["distribution"],
  calibration_reference: row.calibrationReference,
  privacy: { person_level_fields_included: false },
  ingested_at: row.ingestedAt.toISOString()
});

export const persistVelocityDistribution = async (
  record: VelocityDistributionRecord
): Promise<VelocityDistributionRecord> => {
  if (!isVelocityPersistenceEnabled()) {
    cacheRecord(record);
    return record;
  }

  await getPrisma().v2VelocityDistributionObservation.create({
    data: {
      orgId: record.org_id,
      workflowId: record.workflow_id,
      jbtdId: record.jbtd_id,
      personaId: record.persona_id,
      eventName: record.event_name,
      schemaVersion: record.schema_version,
      windowStart: new Date(record.window_start),
      windowEnd: new Date(record.window_end),
      cohortSize: record.cohort_size,
      ambiguityRate: record.ambiguity_rate ?? null,
      distributionJson: record.distribution as Prisma.InputJsonValue,
      calibrationReference: record.calibration_reference,
      personLevelFieldsIncluded: false,
      ingestedAt: new Date(record.ingested_at)
    }
  });
  cacheRecord(record);
  return record;
};

export const listVelocityDistributions = async (params: {
  orgId?: string;
  workflowId?: string;
  jbtdId?: string | null;
  personaId?: string | null;
} = {}): Promise<VelocityDistributionRecord[]> => {
  if (!isVelocityPersistenceEnabled()) {
    return Array.from(store.velocityDistributions.values()).filter((record) => {
      if (params.orgId && record.org_id !== params.orgId) {
        return false;
      }
      if (params.workflowId && record.workflow_id !== params.workflowId) {
        return false;
      }
      if (params.jbtdId !== undefined && record.jbtd_id !== params.jbtdId) {
        return false;
      }
      if (params.personaId !== undefined && record.persona_id !== params.personaId) {
        return false;
      }
      return true;
    });
  }
  if (!params.orgId) {
    return [];
  }

  try {
    const rows = await getPrisma().v2VelocityDistributionObservation.findMany({
      where: {
        orgId: params.orgId,
        workflowId: params.workflowId,
        jbtdId: params.jbtdId === undefined ? undefined : params.jbtdId,
        personaId: params.personaId === undefined ? undefined : params.personaId,
        eventName: { in: VELOCITY_EVENT_NAMES },
        schemaVersion: VELOCITY_SCHEMA_VERSION,
        personLevelFieldsIncluded: false
      },
      orderBy: [{ ingestedAt: "asc" }, { ingestSequence: "asc" }]
    });

    return rows.map(rowToRecord);
  } catch {
    return [];
  }
};
