import type { Prisma } from "@prisma/client";

import { getPrisma } from "../db";
import { store, type FluencyTracrVerdictRecord } from "../store";

export const isFluencyTracrVerdictPersistenceEnabled = () =>
  Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);

export class VerdictAlreadyExistsError extends Error {
  constructor(message = "verdict already exists") {
    super(message);
    this.name = "VerdictAlreadyExistsError";
  }
}

export const verdictSliceKey = (jbtdId: string | null, personaId: string | null): string =>
  `${jbtdId ?? ""}::${personaId ?? ""}`;

export const verdictStoreKey = (record: Pick<
  FluencyTracrVerdictRecord,
  "org_id" | "cohort_id" | "workflow_id" | "slice_key" | "window_start" | "window_end" | "calibration_id"
>): string =>
  [
    record.org_id,
    record.cohort_id,
    record.workflow_id,
    record.slice_key,
    record.window_start,
    record.window_end,
    record.calibration_id
  ].join("::");

type FluencyTracrVerdictRow = {
  id: string;
  orgId: string;
  cohortId: string;
  workflowId: string;
  jbtdId: string | null;
  personaId: string | null;
  sliceKey: string;
  windowStart: Date;
  windowEnd: Date;
  calibrationId: string;
  verdict: string;
  suppressionReason: string | null;
  cohortSize: number;
  evidenceGrade: string;
  velocityIndex: number | null;
  qualityMultiplier: number | null;
  payloadJson: Prisma.JsonValue;
  computedAt: Date;
  createdAt: Date;
};

const rowToRecord = (row: FluencyTracrVerdictRow): FluencyTracrVerdictRecord => ({
  id: row.id,
  org_id: row.orgId,
  cohort_id: row.cohortId,
  workflow_id: row.workflowId,
  jbtd_id: row.jbtdId,
  persona_id: row.personaId,
  slice_key: row.sliceKey,
  window_start: row.windowStart.toISOString(),
  window_end: row.windowEnd.toISOString(),
  calibration_id: row.calibrationId,
  verdict: row.verdict as FluencyTracrVerdictRecord["verdict"],
  suppression_reason: row.suppressionReason,
  cohort_size: row.cohortSize,
  evidence_grade: row.evidenceGrade,
  velocity_index: row.velocityIndex,
  quality_multiplier: row.qualityMultiplier,
  payload_json: row.payloadJson as Record<string, unknown>,
  computed_at: row.computedAt.toISOString(),
  created_at: row.createdAt.toISOString()
});

export const persistFluencyTracrVerdict = async (
  record: FluencyTracrVerdictRecord
): Promise<FluencyTracrVerdictRecord> => {
  const key = verdictStoreKey(record);
  if (store.fluencyTracrVerdicts.has(key)) {
    throw new VerdictAlreadyExistsError();
  }

  if (!isFluencyTracrVerdictPersistenceEnabled()) {
    store.fluencyTracrVerdicts.set(key, record);
    return record;
  }

  try {
    const created = await getPrisma().fluencyTracrVerdict.create({
      data: {
        id: record.id,
        orgId: record.org_id,
        cohortId: record.cohort_id,
        workflowId: record.workflow_id,
        jbtdId: record.jbtd_id,
        personaId: record.persona_id,
        sliceKey: record.slice_key,
        windowStart: new Date(record.window_start),
        windowEnd: new Date(record.window_end),
        calibrationId: record.calibration_id,
        verdict: record.verdict,
        suppressionReason: record.suppression_reason,
        cohortSize: record.cohort_size,
        evidenceGrade: record.evidence_grade,
        velocityIndex: record.velocity_index,
        qualityMultiplier: record.quality_multiplier,
        payloadJson: record.payload_json as Prisma.InputJsonValue,
        computedAt: new Date(record.computed_at),
        createdAt: new Date(record.created_at)
      }
    });
    const createdRecord = rowToRecord(created);
    store.fluencyTracrVerdicts.set(key, createdRecord);
    return createdRecord;
  } catch (error: any) {
    if (error?.code === "P2002") {
      throw new VerdictAlreadyExistsError();
    }
    throw error;
  }
};

export const listFluencyTracrVerdicts = async (params: {
  orgId: string;
  cohortId: string;
  workflowId?: string;
}): Promise<FluencyTracrVerdictRecord[]> => {
  if (!isFluencyTracrVerdictPersistenceEnabled()) {
    return Array.from(store.fluencyTracrVerdicts.values())
      .filter((record) => {
        if (record.org_id !== params.orgId || record.cohort_id !== params.cohortId) {
          return false;
        }
        if (params.workflowId && record.workflow_id !== params.workflowId) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.computed_at.localeCompare(b.computed_at));
  }

  const rows = await getPrisma().fluencyTracrVerdict.findMany({
    where: {
      orgId: params.orgId,
      cohortId: params.cohortId,
      workflowId: params.workflowId
    },
    orderBy: [{ computedAt: "asc" }, { createdAt: "asc" }]
  });
  return rows.map(rowToRecord);
};
