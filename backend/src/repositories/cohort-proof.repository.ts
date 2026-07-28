import crypto from "node:crypto";

import {
  COHORT_PRODUCER_POLICY_VERSION,
  COHORT_PROOF_POLICY_VERSION,
  CohortEqualityProofSchema,
  aiValueEngine,
  cohortPublicKeyFingerprintBytes,
  cohortReservationBytes,
  evaluateOutcomeEvidenceAdmission,
  outcomeEvidenceAdmissionReceiptBytes,
  outcomeEvidenceAdmissionReceiptsMatch,
  outcomeEvidenceContentBytes,
  signedCohortProofBytes,
  unsignedCohortProofBytes,
  type CohortEqualityProof,
  type ExactCohortSlice
} from "@fluencytracr/shared";
import { Prisma, type PrismaClient } from "@prisma/client";

import { getPrisma } from "../db";
import type { AiValueObjectStoredRecord, OutcomeEvidenceStoredRecord } from "../store";
import {
  acceptedReadinessBoundOutcomeEvidence,
  authoritativeOutcomeEvidenceReceipt,
  exactOutcomeEvidenceSliceSegment
} from "../outcome_evidence_admission_authority";
import { hashPrivacyDomainFingerprint } from "./aggregate-privacy-release.repository";
import {
  acquireOutcomeEvidenceFamilyLock,
  listOutcomeEvidence
} from "./outcome-evidence.repository";
import { acquireCohortProducerAuthorityLock } from "./cohort-producer-authority.repository";

const COMPILED_MAX_PROOF_LIFETIME_MS = 15 * 60 * 1000;

export interface CohortProofPrivacyReceipt {
  proof_policy_version: typeof COHORT_PROOF_POLICY_VERSION;
  proof_journal_id: string;
  proof_hash: string;
  reservation_key: string;
  authority_version: number;
  comparison_privacy_only: true;
  claim_authority_effect: "NONE";
  claim_authorized: false;
  model_authorized: false;
  customer_publishable: false;
}

export type CohortProofCommitResult =
  | { decision: "VERIFIED_PRIVACY_ONLY"; receipt: CohortProofPrivacyReceipt }
  | { decision: "HOLD"; receipt: null };

const held = (): CohortProofCommitResult => ({ decision: "HOLD", receipt: null });

const sha256Hex = (value: crypto.BinaryLike): string =>
  crypto.createHash("sha256").update(value).digest("hex");

const exactDateWindowToken = (
  start: string,
  end: string
): string | null => {
  const midnight = /^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/;
  if (!midnight.test(start) || !midnight.test(end)) return null;
  return `${start.slice(0, 10)}_to_${end.slice(0, 10)}`;
};

const rowToStoredObject = (row: {
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
}): AiValueObjectStoredRecord => ({
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
});

const resolveAcceptedChain = async (
  transaction: Prisma.TransactionClient,
  proof: CohortEqualityProof
): Promise<{
  exportRecord: AiValueObjectStoredRecord;
  readinessRecord: AiValueObjectStoredRecord;
} | null> => {
  const baselineToken = exactDateWindowToken(
    proof.baseline_window.period_start,
    proof.baseline_window.period_end
  );
  const comparisonToken = exactDateWindowToken(
    proof.comparison_window.period_start,
    proof.comparison_window.period_end
  );
  if (!baselineToken || !comparisonToken) return null;
  const segment = exactOutcomeEvidenceSliceSegment({
    workflowId: proof.workflow_id,
    jbtdId: proof.jbtd_id,
    personaId: proof.persona_id,
    baselineWindow: baselineToken,
    comparisonWindow: comparisonToken
  });
  const exportId = `outcome_export_${segment}_real_evidence_v1`;
  const readinessId = `readiness_${segment}_real_evidence_v1`;
  const ids = [exportId, readinessId];

  const initialRows = await transaction.aiValueObject.findMany({
    where: {
      orgId: proof.org_id,
      OR: [
        { objectType: "outcome_evidence_export", objectId: exportId },
        { objectType: "evidence_readiness", objectId: readinessId }
      ]
    }
  });
  if (initialRows.length !== 2) return null;
  await transaction.$queryRaw(
    Prisma.sql`SELECT "id" FROM "ai_value_objects"
      WHERE "org_id" = ${proof.org_id}
        AND "object_id" IN (${Prisma.join(ids)})
      FOR UPDATE`
  );
  const rows = await transaction.aiValueObject.findMany({
    where: {
      orgId: proof.org_id,
      OR: [
        { objectType: "outcome_evidence_export", objectId: exportId },
        { objectType: "evidence_readiness", objectId: readinessId }
      ]
    }
  });
  if (rows.length !== 2) return null;
  const exportRow = rows.find(
    (row) =>
      row.objectType === "outcome_evidence_export" &&
      row.objectId === exportId
  );
  const readinessRow = rows.find(
    (row) =>
      row.objectType === "evidence_readiness" &&
      row.objectId === readinessId
  );
  if (!exportRow || !readinessRow) return null;
  const exportRecord = rowToStoredObject(exportRow);
  const readinessRecord = rowToStoredObject(readinessRow);
  if (
    !acceptedReadinessBoundOutcomeEvidence(readinessRecord, exportRecord) ||
    readinessRecord.validation.outcome_evidence_export_id !== exportId
  ) {
    return null;
  }
  return { exportRecord, readinessRecord };
};

const canonicalEd25519PublicKey = (
  encoded: string
): { key: crypto.KeyObject; der: Buffer } | null => {
  try {
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) {
      return null;
    }
    const der = Buffer.from(encoded, "base64");
    if (der.toString("base64") !== encoded) return null;
    const key = crypto.createPublicKey({ key: der, format: "der", type: "spki" });
    if (key.asymmetricKeyType !== "ed25519") return null;
    const canonical = key.export({ format: "der", type: "spki" });
    if (!Buffer.isBuffer(canonical) || !crypto.timingSafeEqual(canonical, der)) {
      return null;
    }
    return { key, der };
  } catch {
    return null;
  }
};

const verifyAuthorityAndSignature = (
  proof: CohortEqualityProof,
  authority: {
    orgId: string;
    producerKeyId: string;
    authorityVersion: number;
    proofPolicyVersion: string;
    producerPolicyVersion: string;
    publicKeyDerBase64: string;
    publicKeyFingerprint: string;
    validFrom: Date;
    expiresAt: Date;
  },
  hasRevocation: boolean,
  decisionTime: Date
): boolean => {
  if (
    hasRevocation ||
    authority.orgId !== proof.org_id ||
    authority.producerKeyId !== proof.producer_key_id ||
    authority.authorityVersion !== proof.authority_version ||
    authority.proofPolicyVersion !== COHORT_PROOF_POLICY_VERSION ||
    authority.producerPolicyVersion !== COHORT_PRODUCER_POLICY_VERSION
  ) {
    return false;
  }
  const issuedAt = Date.parse(proof.issued_at);
  const expiresAt = Date.parse(proof.expires_at);
  const decisionAt = decisionTime.getTime();
  if (
    authority.validFrom.getTime() > issuedAt ||
    issuedAt > decisionAt ||
    decisionAt >= expiresAt ||
    expiresAt > authority.expiresAt.getTime() ||
    expiresAt - issuedAt > COMPILED_MAX_PROOF_LIFETIME_MS
  ) {
    return false;
  }
  const publicKey = canonicalEd25519PublicKey(authority.publicKeyDerBase64);
  if (!publicKey) return false;
  const fingerprint = sha256Hex(
    cohortPublicKeyFingerprintBytes(publicKey.der)
  );
  const expectedFingerprint = Buffer.from(
    authority.publicKeyFingerprint,
    "hex"
  );
  const actualFingerprint = Buffer.from(fingerprint, "hex");
  if (
    expectedFingerprint.byteLength !== 32 ||
    actualFingerprint.byteLength !== 32 ||
    !crypto.timingSafeEqual(expectedFingerprint, actualFingerprint)
  ) {
    return false;
  }
  const signature = Buffer.from(proof.signature, "base64url");
  if (
    signature.byteLength !== 64 ||
    signature.toString("base64url") !== proof.signature
  ) {
    return false;
  }
  const { signature: _signature, ...unsigned } = proof;
  return crypto.verify(
    null,
    unsignedCohortProofBytes(unsigned),
    publicKey.key,
    signature
  );
};

const exactExportMetric = (
  exportRecord: AiValueObjectStoredRecord,
  proof: CohortEqualityProof
): boolean => {
  if (
    aiValueEngine.reviewStateOf(exportRecord.payload) !== "ACCEPTED" ||
    !Array.isArray(exportRecord.payload.metrics) ||
    exportRecord.payload.metrics.length !== 1
  ) {
    return false;
  }
  const metric = exportRecord.payload.metrics[0] as Record<string, unknown>;
  const source = exportRecord.payload.source_system as
    | Record<string, unknown>
    | undefined;
  return (
    metric.metric_id === proof.outcome_metric &&
    metric.measurement_unit === proof.outcome_unit &&
    source?.source_name === proof.source_system
  );
};

const receiptFor = (
  journalId: string,
  proofHash: string,
  reservationKey: string,
  authorityVersion: number
): CohortProofPrivacyReceipt => ({
  proof_policy_version: COHORT_PROOF_POLICY_VERSION,
  proof_journal_id: journalId,
  proof_hash: proofHash,
  reservation_key: reservationKey,
  authority_version: authorityVersion,
  comparison_privacy_only: true,
  claim_authority_effect: "NONE",
  claim_authorized: false,
  model_authorized: false,
  customer_publishable: false
});

export const commitCohortEqualityProof = async (
  input: unknown,
  client?: PrismaClient
): Promise<CohortProofCommitResult> => {
  const parsed = CohortEqualityProofSchema.safeParse(input);
  if (!parsed.success || (!client && !process.env.DATABASE_URL)) return held();
  const proof = parsed.data;
  const resolvedClient = client ?? getPrisma();

  try {
    return await resolvedClient.$transaction(
      async (transaction) => {
        await acquireOutcomeEvidenceFamilyLock(transaction, {
          orgId: proof.org_id,
          workflowId: proof.workflow_id,
          jbtdId: proof.jbtd_id,
          personaId: proof.persona_id
        });

        await acquireCohortProducerAuthorityLock(
          transaction,
          proof.org_id,
          proof.producer_key_id
        );
        const authorityRows = await transaction.$queryRaw<
          Array<{ id: string }>
        >(Prisma.sql`SELECT "id" FROM "cohort_producer_authorities"
          WHERE "org_id" = ${proof.org_id}
            AND "producer_key_id" = ${proof.producer_key_id}
          FOR UPDATE`);
        if (authorityRows.length === 0) return held();

        const decisionRows = await transaction.$queryRaw<
          Array<{ decision_time: Date }>
        >(Prisma.sql`SELECT clock_timestamp() AS decision_time`);
        const decisionTime = decisionRows[0]?.decision_time;
        if (!(decisionTime instanceof Date)) return held();
        const activeAuthorities =
          await transaction.cohortProducerAuthority.findMany({
            where: {
              orgId: proof.org_id,
              producerKeyId: proof.producer_key_id,
              validFrom: { lte: decisionTime },
              expiresAt: { gt: decisionTime }
            },
            include: { revocation: true },
            orderBy: { authorityVersion: "desc" }
          });
        if (
          activeAuthorities.length !== 1 ||
          activeAuthorities[0].authorityVersion !== proof.authority_version
        ) {
          return held();
        }
        const authority = activeAuthorities[0];
        if (
          !verifyAuthorityAndSignature(
            proof,
            authority,
            authority.revocation !== null,
            decisionTime
          )
        ) {
          return held();
        }

        const chain = await resolveAcceptedChain(transaction, proof);
        if (!chain || !exactExportMetric(chain.exportRecord, proof)) return held();
        const authoritativeReceipt =
          authoritativeOutcomeEvidenceReceipt(chain.exportRecord);
        if (!authoritativeReceipt) return held();

        const records = await listOutcomeEvidence(
          proof.org_id,
          {
            workflow_id: proof.workflow_id,
            period_start: proof.baseline_window.period_start,
            period_end: proof.comparison_window.period_end,
            jbtd_id: proof.jbtd_id,
            persona_id: proof.persona_id
          },
          transaction
        );
        const admission = evaluateOutcomeEvidenceAdmission({
          expected: {
            workflow_id: proof.workflow_id,
            jbtd_id: proof.jbtd_id,
            persona_id: proof.persona_id,
            baseline_window: {
              period_start: proof.baseline_window.period_start,
              period_end: proof.baseline_window.period_end
            },
            comparison_window: {
              period_start: proof.comparison_window.period_start,
              period_end: proof.comparison_window.period_end
            }
          },
          records
        });
        if (
          admission.decision !== "ADMITTED" ||
          !admission.receipt ||
          admission.admitted_pairs.length !== 1 ||
          admission.receipt.baseline_window.evidence_ids.length !== 1 ||
          admission.receipt.comparison_window.evidence_ids.length !== 1 ||
          !outcomeEvidenceAdmissionReceiptsMatch(
            admission.receipt,
            authoritativeReceipt
          )
        ) {
          return held();
        }
        const pair = admission.admitted_pairs[0] as {
          baseline: OutcomeEvidenceStoredRecord;
          comparison: OutcomeEvidenceStoredRecord;
        };
        const baselineHash = sha256Hex(outcomeEvidenceContentBytes(pair.baseline));
        const comparisonHash = sha256Hex(
          outcomeEvidenceContentBytes(pair.comparison)
        );
        const admissionHash = sha256Hex(
          outcomeEvidenceAdmissionReceiptBytes(admission.receipt)
        );
        const reservationKey = sha256Hex(
          cohortReservationBytes({
            org_id: proof.org_id,
            workflow_id: proof.workflow_id,
            jbtd_id: proof.jbtd_id,
            persona_id: proof.persona_id
          })
        );
        if (
          pair.baseline.outcome_metric !== proof.outcome_metric ||
          pair.baseline.outcome_unit !== proof.outcome_unit ||
          pair.baseline.source_system !== proof.source_system ||
          pair.comparison.outcome_metric !== proof.outcome_metric ||
          pair.comparison.outcome_unit !== proof.outcome_unit ||
          pair.comparison.source_system !== proof.source_system ||
          pair.baseline.cohort_size !== proof.baseline_window.cohort_size ||
          pair.comparison.cohort_size !== proof.comparison_window.cohort_size ||
          baselineHash !== proof.baseline_window.evidence_content_hash ||
          comparisonHash !== proof.comparison_window.evidence_content_hash ||
          admissionHash !== proof.admission_receipt_hash ||
          reservationKey !== proof.reservation_key
        ) {
          return held();
        }

        const legacy = await transaction.aggregatePrivacyReleaseJournal.findFirst({
          where: {
            orgId: proof.org_id,
            privacyDomainFingerprint: hashPrivacyDomainFingerprint({
              org_id: proof.org_id,
              workflow_id: proof.workflow_id,
              jbtd_id: proof.jbtd_id,
              persona_id: proof.persona_id
            })
          }
        });
        if (legacy) return held();

        const proofHash = sha256Hex(signedCohortProofBytes(proof));
        const evidencePairHash = sha256Hex(
          Buffer.concat([
            Buffer.from("FT_COHORT_EVIDENCE_PAIR_V1\0", "ascii"),
            Buffer.from(baselineHash, "hex"),
            Buffer.from(comparisonHash, "hex")
          ])
        );
        const existingJournal = await transaction.cohortProofJournal.findUnique({
          where: {
            cohort_proof_journal_proof_id_key: {
              orgId: proof.org_id,
              proofId: proof.proof_id
            }
          }
        });
        const existingReservation =
          await transaction.aggregatePrivacyReservation.findUnique({
            where: {
              aggregate_privacy_reservation_key: {
                orgId: proof.org_id,
                reservationKey
              }
            }
          });
        if (existingJournal || existingReservation) {
          if (
            !existingJournal ||
            !existingReservation ||
            existingJournal.proofHash !== proofHash ||
            existingJournal.producerKeyId !== proof.producer_key_id ||
            existingJournal.authorityVersion !== proof.authority_version ||
            existingJournal.workflowId !== proof.workflow_id ||
            existingJournal.jbtdId !== proof.jbtd_id ||
            existingJournal.personaId !== proof.persona_id ||
            existingJournal.outcomeMetric !== proof.outcome_metric ||
            existingJournal.outcomeUnit !== proof.outcome_unit ||
            existingJournal.sourceSystem !== proof.source_system ||
            existingJournal.baselinePeriodStart.getTime() !==
              Date.parse(proof.baseline_window.period_start) ||
            existingJournal.baselinePeriodEnd.getTime() !==
              Date.parse(proof.baseline_window.period_end) ||
            existingJournal.baselineCohortSize !==
              proof.baseline_window.cohort_size ||
            existingJournal.baselineEvidenceId !== pair.baseline.evidence_id ||
            existingJournal.baselineEvidenceHash !== baselineHash ||
            existingJournal.comparisonPeriodStart.getTime() !==
              Date.parse(proof.comparison_window.period_start) ||
            existingJournal.comparisonPeriodEnd.getTime() !==
              Date.parse(proof.comparison_window.period_end) ||
            existingJournal.comparisonCohortSize !==
              proof.comparison_window.cohort_size ||
            existingJournal.comparisonEvidenceId !==
              pair.comparison.evidence_id ||
            existingJournal.comparisonEvidenceHash !== comparisonHash ||
            existingJournal.evidencePairHash !== evidencePairHash ||
            existingJournal.admissionReceiptHash !== admissionHash ||
            existingJournal.reservationKey !== reservationKey ||
            existingJournal.decision !== "VERIFIED_PRIVACY_ONLY" ||
            existingReservation.ownerKind !== "OUTCOME_COMPARISON_PROOF" ||
            existingReservation.ownerReference !== existingJournal.id ||
            existingReservation.ownerContentHash !== proofHash ||
            existingReservation.workflowId !== proof.workflow_id ||
            existingReservation.jbtdId !== proof.jbtd_id ||
            existingReservation.personaId !== proof.persona_id
          ) {
            return held();
          }
          return {
            decision: "VERIFIED_PRIVACY_ONLY" as const,
            receipt: receiptFor(
              existingJournal.id,
              proofHash,
              reservationKey,
              proof.authority_version
            )
          };
        }

        const journalId = crypto.randomUUID();
        await transaction.aggregatePrivacyReservation.create({
          data: {
            orgId: proof.org_id,
            reservationKey,
            ownerKind: "OUTCOME_COMPARISON_PROOF",
            ownerReference: journalId,
            ownerContentHash: proofHash,
            workflowId: proof.workflow_id,
            jbtdId: proof.jbtd_id,
            personaId: proof.persona_id
          }
        });
        await transaction.cohortProofJournal.create({
          data: {
            id: journalId,
            orgId: proof.org_id,
            proofId: proof.proof_id,
            proofHash,
            producerKeyId: proof.producer_key_id,
            authorityVersion: proof.authority_version,
            workflowId: proof.workflow_id,
            jbtdId: proof.jbtd_id,
            personaId: proof.persona_id,
            outcomeMetric: proof.outcome_metric,
            outcomeUnit: proof.outcome_unit,
            sourceSystem: proof.source_system,
            baselinePeriodStart: new Date(proof.baseline_window.period_start),
            baselinePeriodEnd: new Date(proof.baseline_window.period_end),
            baselineCohortSize: proof.baseline_window.cohort_size,
            baselineEvidenceId: pair.baseline.evidence_id,
            baselineEvidenceHash: baselineHash,
            comparisonPeriodStart: new Date(
              proof.comparison_window.period_start
            ),
            comparisonPeriodEnd: new Date(proof.comparison_window.period_end),
            comparisonCohortSize: proof.comparison_window.cohort_size,
            comparisonEvidenceId: pair.comparison.evidence_id,
            comparisonEvidenceHash: comparisonHash,
            evidencePairHash,
            admissionReceiptHash: admissionHash,
            reservationKey,
            decision: "VERIFIED_PRIVACY_ONLY"
          }
        });
        return {
          decision: "VERIFIED_PRIVACY_ONLY" as const,
          receipt: receiptFor(
            journalId,
            proofHash,
            reservationKey,
            proof.authority_version
          )
        };
      },
      { isolationLevel: "Serializable" }
    );
  } catch {
    return held();
  }
};

export const verifyCohortProofPrivacyHandoff = async (
  input: unknown,
  expectedSlice: ExactCohortSlice,
  transaction: Prisma.TransactionClient
): Promise<{
  proof_journal_id: string;
  proof_hash: string;
  reservation_key: string;
  owner_kind: "OUTCOME_COMPARISON_PROOF";
  org_id: string;
  workflow_id: string;
  jbtd_id: string;
  persona_id: string;
  outcome_metric: string;
  outcome_unit: string;
  source_system: string;
  baseline_window: {
    period_start: string;
    period_end: string;
    cohort_size: number;
    evidence_id: string;
    evidence_content_hash: string;
  };
  comparison_window: {
    period_start: string;
    period_end: string;
    cohort_size: number;
    evidence_id: string;
    evidence_content_hash: string;
  };
  admission_receipt_hash: string;
} | null> => {
  const parsed = CohortEqualityProofSchema.safeParse(input);
  if (
    !parsed.success ||
    parsed.data.org_id !== expectedSlice.org_id ||
    parsed.data.workflow_id !== expectedSlice.workflow_id ||
    parsed.data.jbtd_id !== expectedSlice.jbtd_id ||
    parsed.data.persona_id !== expectedSlice.persona_id
  ) {
    return null;
  }
  const proof = parsed.data;
  try {
    const existingJournal = await transaction.cohortProofJournal.findUnique({
      where: {
        cohort_proof_journal_proof_id_key: {
          orgId: expectedSlice.org_id,
          proofId: proof.proof_id
        }
      }
    });
    const existingReservation =
      await transaction.aggregatePrivacyReservation.findUnique({
        where: {
          aggregate_privacy_reservation_key: {
            orgId: expectedSlice.org_id,
            reservationKey: proof.reservation_key
          }
        }
      });
    if (!existingJournal || !existingReservation) return null;
    const adapter = {
          $transaction: async (
            operation: (
              existing: Prisma.TransactionClient
            ) => Promise<CohortProofCommitResult>
          ) => operation(transaction)
        } as unknown as PrismaClient;
    const verified = await commitCohortEqualityProof(proof, adapter);
        if (verified.decision !== "VERIFIED_PRIVACY_ONLY") return null;
        const receipt = verified.receipt;
        if (
          receipt.proof_policy_version !== COHORT_PROOF_POLICY_VERSION ||
          receipt.authority_version !== proof.authority_version ||
          receipt.comparison_privacy_only !== true ||
          receipt.claim_authority_effect !== "NONE" ||
          receipt.claim_authorized !== false ||
          receipt.model_authorized !== false ||
          receipt.customer_publishable !== false
        ) {
          return null;
        }
        const journal = await transaction.cohortProofJournal.findUnique({
          where: { id: receipt.proof_journal_id }
        });
        if (
          !journal ||
          journal.orgId !== expectedSlice.org_id ||
          journal.proofHash !== receipt.proof_hash ||
          journal.reservationKey !== receipt.reservation_key ||
          journal.producerKeyId !== proof.producer_key_id ||
          journal.authorityVersion !== proof.authority_version ||
          journal.workflowId !== expectedSlice.workflow_id ||
          journal.jbtdId !== expectedSlice.jbtd_id ||
          journal.personaId !== expectedSlice.persona_id ||
          journal.outcomeMetric !== proof.outcome_metric ||
          journal.outcomeUnit !== proof.outcome_unit ||
          journal.sourceSystem !== proof.source_system ||
          journal.baselinePeriodStart.getTime() !==
            Date.parse(proof.baseline_window.period_start) ||
          journal.baselinePeriodEnd.getTime() !==
            Date.parse(proof.baseline_window.period_end) ||
          journal.baselineCohortSize !== proof.baseline_window.cohort_size ||
          journal.baselineEvidenceHash !==
            proof.baseline_window.evidence_content_hash ||
          journal.comparisonPeriodStart.getTime() !==
            Date.parse(proof.comparison_window.period_start) ||
          journal.comparisonPeriodEnd.getTime() !==
            Date.parse(proof.comparison_window.period_end) ||
          journal.comparisonCohortSize !==
            proof.comparison_window.cohort_size ||
          journal.comparisonEvidenceHash !==
            proof.comparison_window.evidence_content_hash ||
          journal.admissionReceiptHash !== proof.admission_receipt_hash ||
          journal.decision !== "VERIFIED_PRIVACY_ONLY"
        ) {
          return null;
        }
        const reservation =
          await transaction.aggregatePrivacyReservation.findUnique({
            where: {
              aggregate_privacy_reservation_key: {
                orgId: journal.orgId,
                reservationKey: journal.reservationKey
              }
            }
          });
        if (
          !reservation ||
          reservation.ownerKind !== "OUTCOME_COMPARISON_PROOF" ||
          reservation.ownerReference !== journal.id ||
          reservation.ownerContentHash !== journal.proofHash ||
          reservation.workflowId !== expectedSlice.workflow_id ||
          reservation.jbtdId !== expectedSlice.jbtd_id ||
          reservation.personaId !== expectedSlice.persona_id
        ) {
          return null;
        }
    return {
          proof_journal_id: journal.id,
          proof_hash: journal.proofHash,
          reservation_key: journal.reservationKey,
          owner_kind: "OUTCOME_COMPARISON_PROOF" as const,
          org_id: journal.orgId,
          workflow_id: journal.workflowId,
          jbtd_id: journal.jbtdId,
          persona_id: journal.personaId,
          outcome_metric: journal.outcomeMetric,
          outcome_unit: journal.outcomeUnit,
          source_system: journal.sourceSystem,
          baseline_window: {
            period_start: journal.baselinePeriodStart.toISOString(),
            period_end: journal.baselinePeriodEnd.toISOString(),
            cohort_size: journal.baselineCohortSize,
            evidence_id: journal.baselineEvidenceId,
            evidence_content_hash: journal.baselineEvidenceHash
          },
          comparison_window: {
            period_start: journal.comparisonPeriodStart.toISOString(),
            period_end: journal.comparisonPeriodEnd.toISOString(),
            cohort_size: journal.comparisonCohortSize,
            evidence_id: journal.comparisonEvidenceId,
            evidence_content_hash: journal.comparisonEvidenceHash
          },
          admission_receipt_hash: journal.admissionReceiptHash
        };
  } catch {
    return null;
  }
};
