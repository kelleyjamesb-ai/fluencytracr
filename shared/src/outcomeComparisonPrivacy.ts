import { z } from "zod";

import { canonicalCohortJsonBytes } from "./cohortProof";

export const OUTCOME_COMPARISON_PRIVACY_POLICY_VERSION =
  "FT_OUTCOME_COMPARISON_PRIVACY_POLICY_2026_07";
export const OUTCOME_COMPARISON_CONTENT_COMMITMENT_VERSION =
  "FT_OUTCOME_COMPARISON_CONTENT_COMMITMENT_V1";

const CANONICAL_INSTANT =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const MACHINE_ID = /^[a-z0-9][a-z0-9:_-]{0,179}$/;
const SLICE_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const OPAQUE_EVIDENCE_ID = /^[a-z0-9][a-z0-9_-]{0,127}$/;
const HEX_32 = /^[0-9a-f]{64}$/;

const isCanonicalInstant = (value: string): boolean =>
  CANONICAL_INSTANT.test(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString() === value;

const finiteAggregateValue = z
  .number()
  .finite()
  .refine((value) => !Object.is(value, -0), {
    message: "aggregate_value must not be negative zero"
  });

export const OutcomeComparisonProjectionWindowSchema = z
  .object({
    period_start: z.string().refine(isCanonicalInstant),
    period_end: z.string().refine(isCanonicalInstant),
    evidence_id: z.string().regex(OPAQUE_EVIDENCE_ID),
    cohort_size: z.number().int().min(5),
    aggregate_value: finiteAggregateValue
  })
  .strict()
  .refine(
    (value) => Date.parse(value.period_end) > Date.parse(value.period_start),
    {
      path: ["period_end"],
      message: "period_end must be after period_start"
    }
  );

export const OutcomeComparisonProjectionSchema = z
  .object({
    policy_version: z.literal(OUTCOME_COMPARISON_PRIVACY_POLICY_VERSION),
    org_id: z.string().regex(MACHINE_ID),
    workflow_id: z.string().regex(MACHINE_ID),
    jbtd_id: z.string().regex(SLICE_ID),
    persona_id: z.string().regex(SLICE_ID),
    outcome_metric: z.string().min(1).max(180),
    outcome_unit: z.string().min(1).max(80),
    source_system: z.string().min(1).max(120),
    baseline_window: OutcomeComparisonProjectionWindowSchema,
    comparison_window: OutcomeComparisonProjectionWindowSchema
  })
  .strict()
  .refine(
    (value) =>
      Date.parse(value.comparison_window.period_start) >=
      Date.parse(value.baseline_window.period_end),
    {
      path: ["comparison_window", "period_start"],
      message: "comparison windows must not overlap"
    }
  )
  .refine(
    (value) =>
      value.baseline_window.evidence_id !==
      value.comparison_window.evidence_id,
    {
      path: ["comparison_window", "evidence_id"],
      message: "comparison windows must reference distinct evidence IDs"
    }
  );

export type OutcomeComparisonProjection = z.infer<
  typeof OutcomeComparisonProjectionSchema
>;

export const OutcomeComparisonPrivacyReceiptSchema = z
  .object({
    policy_version: z.literal(OUTCOME_COMPARISON_PRIVACY_POLICY_VERSION),
    release_id: z.string().uuid(),
    proof_journal_id: z.string().uuid(),
    reservation_key: z.string().regex(HEX_32),
    content_fingerprint: z.string().regex(HEX_32),
    projection_hash: z.string().regex(HEX_32),
    comparison_privacy_only: z.literal(true),
    claim_authority_effect: z.literal("NONE"),
    claim_authorized: z.literal(false),
    model_authorized: z.literal(false),
    customer_publishable: z.literal(false)
  })
  .strict();

export type OutcomeComparisonPrivacyReceipt = z.infer<
  typeof OutcomeComparisonPrivacyReceiptSchema
>;

export const OutcomeComparisonContentCommitmentSchema = z
  .object({
    commitment_version: z.literal(
      OUTCOME_COMPARISON_CONTENT_COMMITMENT_VERSION
    ),
    projection: OutcomeComparisonProjectionSchema,
    proof_journal_id: z.string().uuid(),
    proof_hash: z.string().regex(HEX_32),
    admission_receipt_hash: z.string().regex(HEX_32),
    baseline_evidence_hash: z.string().regex(HEX_32),
    comparison_evidence_hash: z.string().regex(HEX_32),
    reservation_key: z.string().regex(HEX_32)
  })
  .strict();

export type OutcomeComparisonContentCommitment = z.infer<
  typeof OutcomeComparisonContentCommitmentSchema
>;

const encoder = new TextEncoder();

const uint32 = (value: number): Uint8Array => {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, false);
  return bytes;
};

const concat = (parts: ReadonlyArray<Uint8Array>): Uint8Array => {
  const size = parts.reduce((total, part) => total + part.byteLength, 0);
  const result = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }
  return result;
};

const canonicalContractBytes = (
  domain: string,
  value: unknown
): Uint8Array => {
  const domainBytes = encoder.encode(domain);
  const payloadBytes = canonicalCohortJsonBytes(value);
  return concat([
    uint32(domainBytes.byteLength),
    domainBytes,
    uint32(payloadBytes.byteLength),
    payloadBytes
  ]);
};

export const outcomeComparisonProjectionBytes = (
  input: OutcomeComparisonProjection
): Uint8Array =>
  canonicalContractBytes(
    "FT_OUTCOME_COMPARISON_PROJECTION_V1",
    OutcomeComparisonProjectionSchema.parse(input)
  );

export const outcomeComparisonPrivacyReceiptBytes = (
  input: OutcomeComparisonPrivacyReceipt
): Uint8Array =>
  canonicalContractBytes(
    "FT_OUTCOME_COMPARISON_PRIVACY_RECEIPT_V1",
    OutcomeComparisonPrivacyReceiptSchema.parse(input)
  );

export const outcomeComparisonContentCommitmentBytes = (
  input: OutcomeComparisonContentCommitment
): Uint8Array =>
  canonicalContractBytes(
    "FT_OUTCOME_COMPARISON_CONTENT_COMMITMENT_BYTES_V1",
    OutcomeComparisonContentCommitmentSchema.parse(input)
  );

export const OUTCOME_COMPARISON_PRIVACY_DIAGNOSTICS = [
  "INVALID_INPUT",
  "PERSISTENCE_UNAVAILABLE",
  "C0_AUTHORITY_UNAVAILABLE",
  "EVIDENCE_PAIR_MISMATCH",
  "RESERVATION_MISMATCH",
  "REPLAY_MISMATCH",
  "JOURNAL_READBACK_MISMATCH",
  "PRODUCER_AUTHORITY_REVOKED"
] as const;

export type OutcomeComparisonPrivacyDiagnostic =
  (typeof OUTCOME_COMPARISON_PRIVACY_DIAGNOSTICS)[number];
