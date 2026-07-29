import crypto from "node:crypto";

import {
  COHORT_PRODUCER_POLICY_VERSION,
  COHORT_PROOF_POLICY_VERSION,
  OUTCOME_COMPARISON_CONTENT_COMMITMENT_VERSION,
  OUTCOME_COMPARISON_PRIVACY_POLICY_VERSION,
  OutcomeComparisonPrivacyReceiptSchema,
  OutcomeComparisonProjectionSchema,
  outcomeComparisonContentCommitmentBytes,
  outcomeComparisonProjectionBytes,
  outcomeEvidenceContentBytes,
  type ExactCohortSlice,
  type OutcomeComparisonPrivacyReceipt,
  type OutcomeComparisonProjection
} from "@fluencytracr/shared";
import {
  Prisma,
  type AggregatePrivacyReservation,
  type CohortProofJournal,
  type OutcomeComparisonPrivacyRelease,
  type PrismaClient,
  type V1OutcomeEvidence
} from "@prisma/client";

import {
  checkOutcomeComparisonAttestationConfigReadiness,
  parseOutcomeComparisonAttestationConfig,
  resolveOutcomeComparisonAttestationSecret,
  type OutcomeComparisonAttestationConfig
} from "../outcome-comparison-attestation-config";
import { getOutcomeComparisonRuntimePrisma } from "../outcome-comparison-runtime-client";
import type { OutcomeEvidenceStoredRecord } from "../store";
import { verifyCohortProofPrivacyHandoff } from "./cohort-proof.repository";
import { acquireCohortProducerAuthorityLock } from "./cohort-producer-authority.repository";
import { acquireOutcomeEvidenceFamilyLock } from "./outcome-evidence.repository";

const RELEASE_DECISION = "ATOMIC_COMPARISON_PRIVACY_RELEASED" as const;
const MACHINE_ID = /^[a-z0-9][a-z0-9:_-]{0,179}$/;
const SLICE_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const ATTESTATION_KEY_ID = /^FT_C1_HMAC_[A-Z0-9_]{1,48}$/;
const SHA256_HEX = /^[0-9a-f]{64}$/;

export type OutcomeComparisonPrivacyReleaseResult =
  | {
      decision: typeof RELEASE_DECISION;
      receipt: OutcomeComparisonPrivacyReceipt;
      projection: OutcomeComparisonProjection;
    }
  | { decision: "HOLD"; receipt: null; projection: null };

type CohortProofPrivacyHandoff = NonNullable<
  Awaited<ReturnType<typeof verifyCohortProofPrivacyHandoff>>
>;

const held = (): OutcomeComparisonPrivacyReleaseResult => ({
  decision: "HOLD",
  receipt: null,
  projection: null
});

const presentCreationAttestationSecret = async (
  transaction: Prisma.TransactionClient,
  keyId: string,
  secret: string
): Promise<void> => {
  await transaction.$executeRaw(
    Prisma.sql`SELECT pg_catalog.set_config('fluencytracr.c1_attestation_key_id', ${keyId}, true)`
  );
  await transaction.$executeRaw(
    Prisma.sql`SELECT pg_catalog.set_config('fluencytracr.c1_attestation_secret', ${secret}, true)`
  );
};

const verifyCreationAttestation = async (
  transaction: Prisma.TransactionClient,
  releaseId: string
): Promise<boolean> => {
  const rows = await transaction.$queryRaw<Array<{ ok: boolean }>>(
    Prisma.sql`SELECT public.verify_outcome_comparison_creation_attestation(${releaseId}::uuid) AS ok`
  );
  return rows.length === 1 && rows[0]?.ok === true;
};

const sha256Hex = (value: crypto.BinaryLike): string =>
  crypto.createHash("sha256").update(value).digest("hex");

const exactSliceIsValid = (slice: ExactCohortSlice): boolean =>
  MACHINE_ID.test(slice.org_id) &&
  MACHINE_ID.test(slice.workflow_id) &&
  SLICE_ID.test(slice.jbtd_id) &&
  SLICE_ID.test(slice.persona_id);

const handoffMatchesSlice = (
  handoff: CohortProofPrivacyHandoff,
  slice: ExactCohortSlice
): boolean =>
  handoff.org_id === slice.org_id &&
  handoff.workflow_id === slice.workflow_id &&
  handoff.jbtd_id === slice.jbtd_id &&
  handoff.persona_id === slice.persona_id;

const sameDate = (value: Date, canonicalInstant: string): boolean =>
  value instanceof Date &&
  !Number.isNaN(value.getTime()) &&
  value.toISOString() === canonicalInstant;

const rowToOutcomeEvidence = (
  row: V1OutcomeEvidence
): OutcomeEvidenceStoredRecord => ({
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
  source_attestation: row.sourceAttestation as
    | Record<string, unknown>
    | undefined,
  ingested_at: row.ingestedAt.toISOString()
});

const exactEvidenceMatchesHandoff = (
  record: OutcomeEvidenceStoredRecord,
  handoff: CohortProofPrivacyHandoff,
  window: CohortProofPrivacyHandoff["baseline_window"]
): boolean =>
  record.org_id === handoff.org_id &&
  record.workflow_id === handoff.workflow_id &&
  record.jbtd_id === handoff.jbtd_id &&
  record.persona_id === handoff.persona_id &&
  record.outcome_metric === handoff.outcome_metric &&
  record.outcome_unit === handoff.outcome_unit &&
  record.source_system === handoff.source_system &&
  record.evidence_id === window.evidence_id &&
  record.period_start === window.period_start &&
  record.period_end === window.period_end &&
  record.cohort_size === window.cohort_size &&
  sha256Hex(outcomeEvidenceContentBytes(record)) ===
    window.evidence_content_hash;

const buildProjection = (
  handoff: CohortProofPrivacyHandoff,
  baseline: OutcomeEvidenceStoredRecord,
  comparison: OutcomeEvidenceStoredRecord
): OutcomeComparisonProjection | null => {
  const parsed = OutcomeComparisonProjectionSchema.safeParse({
    policy_version: OUTCOME_COMPARISON_PRIVACY_POLICY_VERSION,
    org_id: handoff.org_id,
    workflow_id: handoff.workflow_id,
    jbtd_id: handoff.jbtd_id,
    persona_id: handoff.persona_id,
    outcome_metric: handoff.outcome_metric,
    outcome_unit: handoff.outcome_unit,
    source_system: handoff.source_system,
    baseline_window: {
      period_start: baseline.period_start,
      period_end: baseline.period_end,
      evidence_id: baseline.evidence_id,
      cohort_size: baseline.cohort_size,
      aggregate_value: baseline.aggregate_value
    },
    comparison_window: {
      period_start: comparison.period_start,
      period_end: comparison.period_end,
      evidence_id: comparison.evidence_id,
      cohort_size: comparison.cohort_size,
      aggregate_value: comparison.aggregate_value
    }
  });
  return parsed.success ? parsed.data : null;
};

const journalMatchesHandoff = (
  journal: CohortProofJournal,
  handoff: CohortProofPrivacyHandoff
): boolean =>
  journal.id === handoff.proof_journal_id &&
  journal.orgId === handoff.org_id &&
  journal.proofHash === handoff.proof_hash &&
  journal.reservationKey === handoff.reservation_key &&
  journal.workflowId === handoff.workflow_id &&
  journal.jbtdId === handoff.jbtd_id &&
  journal.personaId === handoff.persona_id &&
  journal.outcomeMetric === handoff.outcome_metric &&
  journal.outcomeUnit === handoff.outcome_unit &&
  journal.sourceSystem === handoff.source_system &&
  sameDate(journal.baselinePeriodStart, handoff.baseline_window.period_start) &&
  sameDate(journal.baselinePeriodEnd, handoff.baseline_window.period_end) &&
  journal.baselineEvidenceId === handoff.baseline_window.evidence_id &&
  journal.baselineEvidenceHash ===
    handoff.baseline_window.evidence_content_hash &&
  journal.baselineCohortSize === handoff.baseline_window.cohort_size &&
  sameDate(
    journal.comparisonPeriodStart,
    handoff.comparison_window.period_start
  ) &&
  sameDate(journal.comparisonPeriodEnd, handoff.comparison_window.period_end) &&
  journal.comparisonEvidenceId === handoff.comparison_window.evidence_id &&
  journal.comparisonEvidenceHash ===
    handoff.comparison_window.evidence_content_hash &&
  journal.comparisonCohortSize === handoff.comparison_window.cohort_size &&
  journal.admissionReceiptHash === handoff.admission_receipt_hash &&
  journal.decision === "VERIFIED_PRIVACY_ONLY";

const evidencePairHash = (
  baselineEvidenceHash: string,
  comparisonEvidenceHash: string
): string =>
  sha256Hex(
    Buffer.concat([
      Buffer.from("FT_COHORT_EVIDENCE_PAIR_V1\0", "ascii"),
      Buffer.from(baselineEvidenceHash, "hex"),
      Buffer.from(comparisonEvidenceHash, "hex")
    ])
  );

const reservationMatchesJournal = (
  reservation: AggregatePrivacyReservation,
  journal: CohortProofJournal,
  slice: ExactCohortSlice
): boolean =>
  reservation.orgId === slice.org_id &&
  reservation.reservationKey === journal.reservationKey &&
  reservation.ownerKind === "OUTCOME_COMPARISON_PROOF" &&
  reservation.ownerReference === journal.id &&
  reservation.ownerContentHash === journal.proofHash &&
  reservation.workflowId === slice.workflow_id &&
  reservation.jbtdId === slice.jbtd_id &&
  reservation.personaId === slice.persona_id;

const receiptFor = (
  row: OutcomeComparisonPrivacyRelease
): OutcomeComparisonPrivacyReceipt | null => {
  const parsed = OutcomeComparisonPrivacyReceiptSchema.safeParse({
    policy_version: row.policyVersion,
    release_id: row.id,
    proof_journal_id: row.proofJournalId,
    reservation_key: row.reservationKey,
    content_fingerprint: row.contentFingerprint,
    projection_hash: row.projectionHash,
    comparison_privacy_only: row.comparisonPrivacyOnly,
    claim_authority_effect: row.claimAuthorityEffect,
    claim_authorized: row.claimAuthorized,
    model_authorized: row.modelAuthorized,
    customer_publishable: row.customerPublishable
  });
  return parsed.success ? parsed.data : null;
};

const projectionMatchesTypedColumns = (
  row: OutcomeComparisonPrivacyRelease,
  projection: OutcomeComparisonProjection
): boolean =>
  row.policyVersion === projection.policy_version &&
  row.orgId === projection.org_id &&
  row.workflowId === projection.workflow_id &&
  row.jbtdId === projection.jbtd_id &&
  row.personaId === projection.persona_id &&
  row.outcomeMetric === projection.outcome_metric &&
  row.outcomeUnit === projection.outcome_unit &&
  row.sourceSystem === projection.source_system &&
  sameDate(
    row.baselinePeriodStart,
    projection.baseline_window.period_start
  ) &&
  sameDate(row.baselinePeriodEnd, projection.baseline_window.period_end) &&
  row.baselineEvidenceId === projection.baseline_window.evidence_id &&
  row.baselineCohortSize === projection.baseline_window.cohort_size &&
  Object.is(
    row.baselineAggregateValue,
    projection.baseline_window.aggregate_value
  ) &&
  sameDate(
    row.comparisonPeriodStart,
    projection.comparison_window.period_start
  ) &&
  sameDate(
    row.comparisonPeriodEnd,
    projection.comparison_window.period_end
  ) &&
  row.comparisonEvidenceId === projection.comparison_window.evidence_id &&
  row.comparisonCohortSize === projection.comparison_window.cohort_size &&
  Object.is(
    row.comparisonAggregateValue,
    projection.comparison_window.aggregate_value
  );

const validateReloadedRelease = (
  row: OutcomeComparisonPrivacyRelease,
  journal: CohortProofJournal,
  reservation: AggregatePrivacyReservation,
  expectedSlice: ExactCohortSlice,
  expectedReceipt?: OutcomeComparisonPrivacyReceipt
): {
  receipt: OutcomeComparisonPrivacyReceipt;
  projection: OutcomeComparisonProjection;
} | null => {
  const parsedProjection = OutcomeComparisonProjectionSchema.safeParse(
    row.projectionJson
  );
  if (
    !parsedProjection.success ||
    row.decision !== RELEASE_DECISION ||
    !ATTESTATION_KEY_ID.test(row.attestationKeyId) ||
    !SHA256_HEX.test(row.creationAttestation) ||
    row.proofJournalId !== journal.id ||
    row.proofHash !== journal.proofHash ||
    row.reservationKey !== journal.reservationKey ||
    row.admissionReceiptHash !== journal.admissionReceiptHash ||
    row.baselineEvidenceHash !== journal.baselineEvidenceHash ||
    row.comparisonEvidenceHash !== journal.comparisonEvidenceHash ||
    journal.evidencePairHash !==
      evidencePairHash(
        journal.baselineEvidenceHash,
        journal.comparisonEvidenceHash
      ) ||
    row.orgId !== expectedSlice.org_id ||
    row.workflowId !== expectedSlice.workflow_id ||
    row.jbtdId !== expectedSlice.jbtd_id ||
    row.personaId !== expectedSlice.persona_id ||
    journal.orgId !== expectedSlice.org_id ||
    journal.workflowId !== expectedSlice.workflow_id ||
    journal.jbtdId !== expectedSlice.jbtd_id ||
    journal.personaId !== expectedSlice.persona_id ||
    journal.outcomeMetric !== row.outcomeMetric ||
    journal.outcomeUnit !== row.outcomeUnit ||
    journal.sourceSystem !== row.sourceSystem ||
    !sameDate(journal.baselinePeriodStart, row.baselinePeriodStart.toISOString()) ||
    !sameDate(journal.baselinePeriodEnd, row.baselinePeriodEnd.toISOString()) ||
    journal.baselineEvidenceId !== row.baselineEvidenceId ||
    journal.baselineCohortSize !== row.baselineCohortSize ||
    !sameDate(
      journal.comparisonPeriodStart,
      row.comparisonPeriodStart.toISOString()
    ) ||
    !sameDate(
      journal.comparisonPeriodEnd,
      row.comparisonPeriodEnd.toISOString()
    ) ||
    journal.comparisonEvidenceId !== row.comparisonEvidenceId ||
    journal.comparisonCohortSize !== row.comparisonCohortSize ||
    journal.decision !== "VERIFIED_PRIVACY_ONLY" ||
    !reservationMatchesJournal(reservation, journal, expectedSlice) ||
    !projectionMatchesTypedColumns(row, parsedProjection.data)
  ) {
    return null;
  }

  const recomputedProjectionHash = sha256Hex(
    outcomeComparisonProjectionBytes(parsedProjection.data)
  );
  const recomputedContentFingerprint = sha256Hex(
    outcomeComparisonContentCommitmentBytes({
      commitment_version: OUTCOME_COMPARISON_CONTENT_COMMITMENT_VERSION,
      projection: parsedProjection.data,
      proof_journal_id: journal.id,
      proof_hash: journal.proofHash,
      admission_receipt_hash: journal.admissionReceiptHash,
      baseline_evidence_hash: journal.baselineEvidenceHash,
      comparison_evidence_hash: journal.comparisonEvidenceHash,
      reservation_key: journal.reservationKey
    })
  );
  if (
    row.projectionHash !== recomputedProjectionHash ||
    row.contentFingerprint !== recomputedContentFingerprint
  ) {
    return null;
  }

  const receipt = receiptFor(row);
  if (
    !receipt ||
    (expectedReceipt !== undefined &&
      (receipt.policy_version !== expectedReceipt.policy_version ||
        receipt.release_id !== expectedReceipt.release_id ||
        receipt.proof_journal_id !== expectedReceipt.proof_journal_id ||
        receipt.reservation_key !== expectedReceipt.reservation_key ||
        receipt.content_fingerprint !== expectedReceipt.content_fingerprint ||
        receipt.projection_hash !== expectedReceipt.projection_hash ||
        receipt.comparison_privacy_only !==
          expectedReceipt.comparison_privacy_only ||
        receipt.claim_authority_effect !==
          expectedReceipt.claim_authority_effect ||
        receipt.claim_authorized !== expectedReceipt.claim_authorized ||
        receipt.model_authorized !== expectedReceipt.model_authorized ||
        receipt.customer_publishable !== expectedReceipt.customer_publishable))
  ) {
    return null;
  }
  return { receipt, projection: parsedProjection.data };
};

const findExactRelease = async (
  transaction: Prisma.TransactionClient,
  handoff: CohortProofPrivacyHandoff
): Promise<OutcomeComparisonPrivacyRelease | null | "MISMATCH"> => {
  const [byProof, byReservation] = await Promise.all([
    transaction.outcomeComparisonPrivacyRelease.findUnique({
      where: {
        outcome_comparison_release_proof_journal_key: {
          orgId: handoff.org_id,
          proofJournalId: handoff.proof_journal_id
        }
      }
    }),
    transaction.outcomeComparisonPrivacyRelease.findUnique({
      where: {
        outcome_comparison_release_reservation_key: {
          orgId: handoff.org_id,
          reservationKey: handoff.reservation_key
        }
      }
    })
  ]);
  if (!byProof && !byReservation) return null;
  return byProof && byReservation && byProof.id === byReservation.id
    ? byProof
    : "MISMATCH";
};

const reloadCommitChain = async (
  transaction: Prisma.TransactionClient,
  rowId: string,
  handoff: CohortProofPrivacyHandoff
): Promise<{
  row: OutcomeComparisonPrivacyRelease;
  journal: CohortProofJournal;
  reservation: AggregatePrivacyReservation;
} | null> => {
  const [row, journal, reservation] = await Promise.all([
    transaction.outcomeComparisonPrivacyRelease.findUnique({
      where: { id: rowId }
    }),
    transaction.cohortProofJournal.findUnique({
      where: { id: handoff.proof_journal_id }
    }),
    transaction.aggregatePrivacyReservation.findUnique({
      where: {
        aggregate_privacy_reservation_key: {
          orgId: handoff.org_id,
          reservationKey: handoff.reservation_key
        }
      }
    })
  ]);
  if (
    !row ||
    !journal ||
    !reservation ||
    !journalMatchesHandoff(journal, handoff)
  ) {
    return null;
  }
  return { row, journal, reservation };
};

export const commitOutcomeComparisonPrivacyRelease = async (
  signedCohortProof: unknown,
  expectedSlice: ExactCohortSlice,
  client?: PrismaClient
): Promise<OutcomeComparisonPrivacyReleaseResult> => {
  const attestationConfig = parseOutcomeComparisonAttestationConfig(
    process.env
  );
  if (
    !exactSliceIsValid(expectedSlice) ||
    !attestationConfig ||
    (!client && !process.env.C1_RUNTIME_DATABASE_URL)
  ) {
    return held();
  }
  const resolvedClient = client ?? getOutcomeComparisonRuntimePrisma();
  if (!resolvedClient) return held();
  try {
    return await resolvedClient.$transaction(
      async (transaction) => {
        const attestationReadiness =
          await checkOutcomeComparisonAttestationConfigReadiness(
            transaction,
            attestationConfig
          );
        if (!attestationReadiness.ok) return held();

        const handoff = await verifyCohortProofPrivacyHandoff(
          signedCohortProof,
          expectedSlice,
          transaction
        );
        if (
          !handoff ||
          handoff.owner_kind !== "OUTCOME_COMPARISON_PROOF" ||
          !handoffMatchesSlice(handoff, expectedSlice)
        ) {
          return held();
        }

        // The C.0 verifier acquired the family advisory lock before returning.
        // Keep this exact-ID read plain: FOR UPDATE would reverse the database
        // mutation trigger's row-lock/family-lock order.
        const evidenceRows = await transaction.v1OutcomeEvidence.findMany({
          where: {
            orgId: handoff.org_id,
            evidenceId: {
              in: [
                handoff.baseline_window.evidence_id,
                handoff.comparison_window.evidence_id
              ]
            }
          },
          orderBy: { evidenceId: "asc" }
        });
        if (evidenceRows.length !== 2) return held();
        const evidence = evidenceRows.map(rowToOutcomeEvidence);
        const baseline = evidence.find(
          (record) =>
            record.evidence_id === handoff.baseline_window.evidence_id
        );
        const comparison = evidence.find(
          (record) =>
            record.evidence_id === handoff.comparison_window.evidence_id
        );
        if (
          !baseline ||
          !comparison ||
          !exactEvidenceMatchesHandoff(
            baseline,
            handoff,
            handoff.baseline_window
          ) ||
          !exactEvidenceMatchesHandoff(
            comparison,
            handoff,
            handoff.comparison_window
          )
        ) {
          return held();
        }

        const projection = buildProjection(handoff, baseline, comparison);
        if (!projection) return held();
        const projectionHash = sha256Hex(
          outcomeComparisonProjectionBytes(projection)
        );
        const contentFingerprint = sha256Hex(
          outcomeComparisonContentCommitmentBytes({
            commitment_version:
              OUTCOME_COMPARISON_CONTENT_COMMITMENT_VERSION,
            projection,
            proof_journal_id: handoff.proof_journal_id,
            proof_hash: handoff.proof_hash,
            admission_receipt_hash: handoff.admission_receipt_hash,
            baseline_evidence_hash:
              handoff.baseline_window.evidence_content_hash,
            comparison_evidence_hash:
              handoff.comparison_window.evidence_content_hash,
            reservation_key: handoff.reservation_key
          })
        );

        const existing = await findExactRelease(transaction, handoff);
        if (existing === "MISMATCH") return held();
        let releaseId: string;
        let releaseKeyId: string;
        if (existing) {
          releaseId = existing.id;
          releaseKeyId = existing.attestationKeyId;
        } else {
          releaseId = crypto.randomUUID();
          releaseKeyId = attestationConfig.activeKeyId;
        }
        const releaseSecret = resolveOutcomeComparisonAttestationSecret(
          attestationConfig,
          releaseKeyId
        );
        if (!releaseSecret) return held();
        await presentCreationAttestationSecret(
          transaction,
          releaseKeyId,
          releaseSecret
        );
        if (!existing) {
          await transaction.outcomeComparisonPrivacyRelease.create({
            data: {
              id: releaseId,
              orgId: handoff.org_id,
              policyVersion: OUTCOME_COMPARISON_PRIVACY_POLICY_VERSION,
              proofJournalId: handoff.proof_journal_id,
              proofHash: handoff.proof_hash,
              reservationKey: handoff.reservation_key,
              admissionReceiptHash: handoff.admission_receipt_hash,
              workflowId: handoff.workflow_id,
              jbtdId: handoff.jbtd_id,
              personaId: handoff.persona_id,
              outcomeMetric: handoff.outcome_metric,
              outcomeUnit: handoff.outcome_unit,
              sourceSystem: handoff.source_system,
              baselinePeriodStart: new Date(
                handoff.baseline_window.period_start
              ),
              baselinePeriodEnd: new Date(handoff.baseline_window.period_end),
              baselineEvidenceId: handoff.baseline_window.evidence_id,
              baselineEvidenceHash:
                handoff.baseline_window.evidence_content_hash,
              baselineCohortSize: handoff.baseline_window.cohort_size,
              baselineAggregateValue:
                projection.baseline_window.aggregate_value,
              comparisonPeriodStart: new Date(
                handoff.comparison_window.period_start
              ),
              comparisonPeriodEnd: new Date(
                handoff.comparison_window.period_end
              ),
              comparisonEvidenceId: handoff.comparison_window.evidence_id,
              comparisonEvidenceHash:
                handoff.comparison_window.evidence_content_hash,
              comparisonCohortSize: handoff.comparison_window.cohort_size,
              comparisonAggregateValue:
                projection.comparison_window.aggregate_value,
              projectionJson: projection as Prisma.InputJsonValue,
              projectionHash,
              contentFingerprint,
              decision: RELEASE_DECISION,
              comparisonPrivacyOnly: true,
              claimAuthorityEffect: "NONE",
              claimAuthorized: false,
              modelAuthorized: false,
              customerPublishable: false,
              attestationKeyId: releaseKeyId,
              creationAttestation: "0".repeat(64)
            }
          });
        }

        const chain = await reloadCommitChain(
          transaction,
          releaseId,
          handoff
        );
        if (!chain) {
          throw new Error("OUTCOME_COMPARISON_FINAL_RELOAD_MISMATCH");
        }
        const validated = validateReloadedRelease(
          chain.row,
          chain.journal,
          chain.reservation,
          expectedSlice
        );
        if (
          !validated ||
          chain.row.attestationKeyId !== releaseKeyId ||
          validated.receipt.projection_hash !== projectionHash ||
          validated.receipt.content_fingerprint !== contentFingerprint
        ) {
          throw new Error("OUTCOME_COMPARISON_FINAL_VALIDATION_MISMATCH");
        }
        if (!(await verifyCreationAttestation(transaction, releaseId))) {
          throw new Error("OUTCOME_COMPARISON_CREATION_ATTESTATION_MISMATCH");
        }
        return {
          decision: RELEASE_DECISION,
          receipt: validated.receipt,
          projection: validated.projection
        };
      },
      { isolationLevel: "ReadCommitted" }
    );
  } catch {
    return held();
  }
};

export const readOutcomeComparisonPrivacyRelease = async (
  receiptInput: unknown,
  expectedSlice: ExactCohortSlice,
  client?: PrismaClient
): Promise<OutcomeComparisonPrivacyReleaseResult> => {
  const attestationConfig = parseOutcomeComparisonAttestationConfig(
    process.env
  );
  const parsedReceipt = OutcomeComparisonPrivacyReceiptSchema.safeParse(
    receiptInput
  );
  if (
    !parsedReceipt.success ||
    !exactSliceIsValid(expectedSlice) ||
    !attestationConfig ||
    (!client && !process.env.C1_RUNTIME_DATABASE_URL)
  ) {
    return held();
  }
  const receipt = parsedReceipt.data;
  const resolvedClient = client ?? getOutcomeComparisonRuntimePrisma();
  if (!resolvedClient) return held();
  try {
    return await resolvedClient.$transaction(
      async (transaction) => {
        const attestationReadiness =
          await checkOutcomeComparisonAttestationConfigReadiness(
            transaction,
            attestationConfig
          );
        if (!attestationReadiness.ok) return held();

        await acquireOutcomeEvidenceFamilyLock(transaction, {
          orgId: expectedSlice.org_id,
          workflowId: expectedSlice.workflow_id,
          jbtdId: expectedSlice.jbtd_id,
          personaId: expectedSlice.persona_id
        });

        // Discovery is intentionally non-authorizing and selects no projection,
        // aggregate value, evidence ID, cohort size, or decision payload.
        const discoveryRelease =
          await transaction.outcomeComparisonPrivacyRelease.findUnique({
            where: { id: receipt.release_id },
            select: {
              orgId: true,
              proofJournalId: true
            }
          });
        if (
          !discoveryRelease ||
          discoveryRelease.orgId !== expectedSlice.org_id ||
          discoveryRelease.proofJournalId !== receipt.proof_journal_id
        ) {
          return held();
        }
        const discoveryJournal = await transaction.cohortProofJournal.findUnique(
          {
            where: { id: discoveryRelease.proofJournalId },
            select: {
              id: true,
              orgId: true,
              producerKeyId: true,
              authorityVersion: true
            }
          }
        );
        if (
          !discoveryJournal ||
          discoveryJournal.id !== receipt.proof_journal_id ||
          discoveryJournal.orgId !== expectedSlice.org_id
        ) {
          return held();
        }

        await acquireCohortProducerAuthorityLock(
          transaction,
          expectedSlice.org_id,
          discoveryJournal.producerKeyId
        );

        const [row, journal, reservation, authority] = await Promise.all([
          transaction.outcomeComparisonPrivacyRelease.findUnique({
            where: { id: receipt.release_id }
          }),
          transaction.cohortProofJournal.findUnique({
            where: { id: receipt.proof_journal_id }
          }),
          transaction.aggregatePrivacyReservation.findUnique({
            where: {
              aggregate_privacy_reservation_key: {
                orgId: expectedSlice.org_id,
                reservationKey: receipt.reservation_key
              }
            }
          }),
          transaction.cohortProducerAuthority.findUnique({
            where: {
              cohort_producer_authority_epoch_key: {
                orgId: expectedSlice.org_id,
                producerKeyId: discoveryJournal.producerKeyId,
                authorityVersion: discoveryJournal.authorityVersion
              }
            },
            include: { revocation: true }
          })
        ]);
        if (
          !row ||
          !journal ||
          !reservation ||
          !authority ||
          authority.orgId !== expectedSlice.org_id ||
          authority.producerKeyId !== discoveryJournal.producerKeyId ||
          authority.authorityVersion !== discoveryJournal.authorityVersion ||
          authority.proofPolicyVersion !== COHORT_PROOF_POLICY_VERSION ||
          authority.producerPolicyVersion !== COHORT_PRODUCER_POLICY_VERSION ||
          authority.revocation !== null ||
          journal.producerKeyId !== discoveryJournal.producerKeyId ||
          journal.authorityVersion !== discoveryJournal.authorityVersion
        ) {
          return held();
        }

        const validated = validateReloadedRelease(
          row,
          journal,
          reservation,
          expectedSlice,
          receipt
        );
        const releaseSecret = resolveOutcomeComparisonAttestationSecret(
          attestationConfig,
          row.attestationKeyId
        );
        if (!validated || !releaseSecret) return held();
        await presentCreationAttestationSecret(
          transaction,
          row.attestationKeyId,
          releaseSecret
        );
        if (!(await verifyCreationAttestation(transaction, row.id))) {
          return held();
        }
        return validated
          ? {
              decision: RELEASE_DECISION,
              receipt: validated.receipt,
              projection: validated.projection
            }
          : held();
      },
      { isolationLevel: "ReadCommitted" }
    );
  } catch {
    return held();
  }
};
