import type { OutcomeEvidenceCreate, OutcomeEvidenceQuery } from "@fluencytracr/shared";
import { Prisma, type PrismaClient } from "@prisma/client";

import { getPrisma } from "../db";
import { store, type OutcomeEvidenceStoredRecord } from "../store";

const usePrisma = () => Boolean(process.env.DATABASE_URL);

type OutcomeEvidenceDbClient = PrismaClient | Prisma.TransactionClient;

export interface OutcomeEvidenceFamily {
  orgId: string;
  workflowId: string;
  jbtdId: string | null;
  personaId: string | null;
}

export const outcomeEvidenceFamilyLockKey = (
  family: OutcomeEvidenceFamily
): string =>
  JSON.stringify([
    "FT_OUTCOME_EVIDENCE_FAMILY_LOCK_V1",
    family.orgId,
    family.workflowId,
    family.jbtdId,
    family.personaId
  ]);

export const acquireOutcomeEvidenceFamilyLock = async (
  client: Prisma.TransactionClient,
  family: OutcomeEvidenceFamily
): Promise<void> => {
  await client.$executeRaw(
    Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${outcomeEvidenceFamilyLockKey(
      family
    )}, 0))`
  );
};

const createOutcomeEvidence = async (
  client: OutcomeEvidenceDbClient,
  record: OutcomeEvidenceStoredRecord
): Promise<void> => {
  await client.v1OutcomeEvidence.create({
    data: {
      evidenceId: record.evidence_id,
      orgId: record.org_id,
      workflowId: record.workflow_id,
      outcomeMetric: record.outcome_metric,
      outcomeUnit: record.outcome_unit,
      periodStart: new Date(record.period_start),
      periodEnd: new Date(record.period_end),
      aggregateValue: record.aggregate_value,
      cohortSize: record.cohort_size,
      sourceSystem: record.source_system,
      jbtdId: record.jbtd_id,
      personaId: record.persona_id,
      aggregateKind: record.aggregate_kind,
      sourceAttestation:
        record.source_attestation as Prisma.InputJsonValue | undefined,
      ingestedAt: new Date(record.ingested_at)
    }
  });
};

export async function persistOutcomeEvidence(
  orgId: string,
  payload: OutcomeEvidenceCreate,
  evidenceId: string,
  acceptedAt: string,
  client?: Prisma.TransactionClient
): Promise<OutcomeEvidenceStoredRecord> {
  const record: OutcomeEvidenceStoredRecord = {
    ...payload,
    org_id: orgId,
    jbtd_id: payload.jbtd_id ?? null,
    persona_id: payload.persona_id ?? null,
    aggregate_kind: payload.aggregate_kind ?? null,
    evidence_id: evidenceId,
    ingested_at: acceptedAt
  };

  if (!usePrisma() && !client) {
    store.outcomeEvidence.set(evidenceId, record);
    return record;
  }

  const family = {
    orgId,
    workflowId: record.workflow_id,
    jbtdId: record.jbtd_id ?? null,
    personaId: record.persona_id ?? null
  };
  if (client) {
    await acquireOutcomeEvidenceFamilyLock(client, family);
    await createOutcomeEvidence(client, record);
  } else {
    await getPrisma().$transaction(
      async (transaction) => {
        await acquireOutcomeEvidenceFamilyLock(transaction, family);
        await createOutcomeEvidence(transaction, record);
      },
      { isolationLevel: "ReadCommitted" }
    );
  }
  return record;
}

export async function listOutcomeEvidence(
  orgId: string,
  query: OutcomeEvidenceQuery,
  client?: OutcomeEvidenceDbClient
): Promise<OutcomeEvidenceStoredRecord[]> {
  const periodStart = Date.parse(query.period_start);
  const periodEnd = Date.parse(query.period_end);

  if (!usePrisma() && !client) {
    return Array.from(store.outcomeEvidence.values())
      .filter((record) => record.org_id === orgId)
      .filter((record) => record.workflow_id === query.workflow_id)
      .filter((record) => Date.parse(record.period_start) >= periodStart)
      .filter((record) => Date.parse(record.period_end) <= periodEnd)
      .filter((record) => query.jbtd_id === undefined || record.jbtd_id === query.jbtd_id)
      .filter((record) => query.persona_id === undefined || record.persona_id === query.persona_id)
      .sort((a, b) => a.period_start.localeCompare(b.period_start) || a.evidence_id.localeCompare(b.evidence_id));
  }

  const rows = await (client ?? getPrisma()).v1OutcomeEvidence.findMany({
    where: {
      orgId,
      workflowId: query.workflow_id,
      periodStart: { gte: new Date(query.period_start) },
      periodEnd: { lte: new Date(query.period_end) },
      jbtdId: query.jbtd_id,
      personaId: query.persona_id
    },
    orderBy: [{ periodStart: "asc" }, { evidenceId: "asc" }]
  });

  return rows.map((row) => ({
    org_id: row.orgId,
    evidence_id: row.evidenceId,
    workflow_id: row.workflowId,
    outcome_metric: row.outcomeMetric,
    outcome_unit: row.outcomeUnit,
    period_start: row.periodStart.toISOString(),
    period_end: row.periodEnd.toISOString(),
    aggregate_value: row.aggregateValue,
    cohort_size: row.cohortSize,
    source_system: row.sourceSystem,
    jbtd_id: row.jbtdId,
    persona_id: row.personaId,
    aggregate_kind: row.aggregateKind,
    source_attestation: row.sourceAttestation as Record<string, unknown> | undefined,
    ingested_at: row.ingestedAt.toISOString()
  }));
}
