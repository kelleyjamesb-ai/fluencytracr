import {
  aiValueEngine,
  outcomeEvidenceAdmissionReceiptGaps,
  outcomeEvidenceAdmissionReceiptsMatch,
  type OutcomeEvidenceAdmissionReceipt
} from "@fluencytracr/shared";

import type { AiValueObjectStoredRecord } from "./store";

export interface ExactOutcomeEvidenceSlice {
  workflowId: string;
  jbtdId: string;
  personaId: string;
  baselineWindow: string;
  comparisonWindow: string;
}

export const exactOutcomeEvidenceSliceSegment = (
  slice: ExactOutcomeEvidenceSlice
): string =>
  Buffer.from(
    JSON.stringify([
      slice.workflowId,
      slice.jbtdId,
      slice.personaId,
      slice.baselineWindow,
      slice.comparisonWindow
    ]),
    "utf8"
  ).toString("hex");

export const authoritativeOutcomeEvidenceReceipt = (
  record: AiValueObjectStoredRecord | null | undefined
): OutcomeEvidenceAdmissionReceipt | null => {
  const payloadReceipt = record?.payload.admission;
  if (
    record?.validation.admission_authoritative !== true ||
    outcomeEvidenceAdmissionReceiptGaps(payloadReceipt).length > 0 ||
    !outcomeEvidenceAdmissionReceiptsMatch(
      record.validation.admission_receipt,
      payloadReceipt
    )
  ) {
    return null;
  }
  return payloadReceipt as OutcomeEvidenceAdmissionReceipt;
};

export const authoritativeReadinessOutcomeEvidenceReceipt = (
  readiness: AiValueObjectStoredRecord | null | undefined
): OutcomeEvidenceAdmissionReceipt | null => {
  const receipt = readiness?.validation.outcome_evidence_admission_receipt;
  if (
    readiness?.validation.outcome_evidence_admission_authoritative !== true ||
    outcomeEvidenceAdmissionReceiptGaps(receipt).length > 0
  ) {
    return null;
  }
  return receipt as OutcomeEvidenceAdmissionReceipt;
};

export const readinessAuthorizesOutcomeEvidence = (
  readiness: AiValueObjectStoredRecord | null | undefined,
  outcomeEvidence: AiValueObjectStoredRecord | null | undefined
): boolean => {
  const outcomeReceipt = authoritativeOutcomeEvidenceReceipt(outcomeEvidence);
  const readinessReceipt =
    authoritativeReadinessOutcomeEvidenceReceipt(readiness);
  const sourceRefs = readiness?.payload.source_refs as
    | Record<string, unknown>
    | undefined;
  return Boolean(
    outcomeReceipt &&
      readinessReceipt &&
      outcomeEvidenceAdmissionReceiptsMatch(readinessReceipt, outcomeReceipt) &&
      sourceRefs?.outcome_evidence_export_id === outcomeEvidence?.object_id &&
      readiness?.payload.workflow_family === outcomeReceipt.workflow_id
  );
};

export const acceptedReadinessBoundOutcomeEvidence = (
  readiness: AiValueObjectStoredRecord | null | undefined,
  outcomeEvidence: AiValueObjectStoredRecord | null | undefined
): boolean =>
  readinessAuthorizesOutcomeEvidence(readiness, outcomeEvidence) &&
  aiValueEngine.validateOutcomeEvidenceExport(outcomeEvidence?.payload).valid &&
  aiValueEngine.reviewStateOf(outcomeEvidence?.payload) === "ACCEPTED";
