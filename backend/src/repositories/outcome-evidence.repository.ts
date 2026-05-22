import type { OutcomeEvidenceCreate, OutcomeEvidenceQuery } from "@learnaire/shared";
import type { Prisma } from "@prisma/client";

import { getPrisma } from "../db";
import { store, type OutcomeEvidenceStoredRecord } from "../store";

const usePrisma = () => Boolean(process.env.DATABASE_URL);

export async function persistOutcomeEvidence(
  payload: OutcomeEvidenceCreate,
  evidenceId: string,
  acceptedAt: string
): Promise<OutcomeEvidenceStoredRecord> {
  const record: OutcomeEvidenceStoredRecord = {
    ...payload,
    jbtd_id: payload.jbtd_id ?? null,
    persona_id: payload.persona_id ?? null,
    aggregate_kind: payload.aggregate_kind ?? null,
    evidence_id: evidenceId,
    ingested_at: acceptedAt
  };

  if (!usePrisma()) {
    store.outcomeEvidence.set(evidenceId, record);
    return record;
  }

  await getPrisma().v1OutcomeEvidence.create({
    data: {
      evidenceId,
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
      sourceAttestation: record.source_attestation as Prisma.InputJsonValue | undefined,
      ingestedAt: new Date(acceptedAt)
    }
  });
  return record;
}

export async function listOutcomeEvidence(query: OutcomeEvidenceQuery): Promise<OutcomeEvidenceStoredRecord[]> {
  const periodStart = Date.parse(query.period_start);
  const periodEnd = Date.parse(query.period_end);

  if (!usePrisma()) {
    return Array.from(store.outcomeEvidence.values())
      .filter((record) => record.workflow_id === query.workflow_id)
      .filter((record) => Date.parse(record.period_start) >= periodStart)
      .filter((record) => Date.parse(record.period_end) <= periodEnd)
      .filter((record) => query.jbtd_id === undefined || record.jbtd_id === query.jbtd_id)
      .filter((record) => query.persona_id === undefined || record.persona_id === query.persona_id)
      .sort((a, b) => a.period_start.localeCompare(b.period_start) || a.evidence_id.localeCompare(b.evidence_id));
  }

  const rows = await getPrisma().v1OutcomeEvidence.findMany({
    where: {
      workflowId: query.workflow_id,
      periodStart: { gte: new Date(query.period_start) },
      periodEnd: { lte: new Date(query.period_end) },
      jbtdId: query.jbtd_id,
      personaId: query.persona_id
    },
    orderBy: [{ periodStart: "asc" }, { evidenceId: "asc" }]
  });

  return rows.map((row) => ({
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
