import { z } from "zod";

import type {
  OutcomeEvidenceAdmissionReceipt
} from "./outcomeEvidenceAdmission";
import type { OutcomeEvidenceRecord } from "./outcomeEvidenceSchemas";

export const COHORT_PROOF_SCHEMA_VERSION = "FT_COHORT_EQUALITY_PROOF_V1";
export const COHORT_PROOF_POLICY_VERSION =
  "FT_COHORT_EQUALITY_PRIVACY_POLICY_2026_07";
export const COHORT_PRODUCER_POLICY_VERSION =
  "FT_CUSTOMER_BOUNDARY_COHORT_PRODUCER_2026_07";

const CANONICAL_INSTANT =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const MACHINE_ID = /^[a-z0-9][a-z0-9:_-]{0,179}$/;
const SLICE_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const HEX_32 = /^[0-9a-f]{64}$/;
const ED25519_SIGNATURE = /^[A-Za-z0-9_-]{86}$/;

const isCanonicalInstant = (value: string): boolean =>
  CANONICAL_INSTANT.test(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString() === value;

export const CohortProofWindowSchema = z
  .object({
    period_start: z.string().refine(isCanonicalInstant),
    period_end: z.string().refine(isCanonicalInstant),
    cohort_size: z.number().int().min(5),
    evidence_content_hash: z.string().regex(HEX_32)
  })
  .strict()
  .refine(
    (value) => Date.parse(value.period_end) > Date.parse(value.period_start),
    { path: ["period_end"] }
  );

const UnsignedCohortEqualityProofObjectSchema = z
  .object({
    schema_version: z.literal(COHORT_PROOF_SCHEMA_VERSION),
    proof_policy_version: z.literal(COHORT_PROOF_POLICY_VERSION),
    producer_policy_version: z.literal(COHORT_PRODUCER_POLICY_VERSION),
    proof_id: z.string().regex(MACHINE_ID),
    org_id: z.string().regex(MACHINE_ID),
    producer_key_id: z.string().regex(MACHINE_ID),
    authority_version: z.number().int().positive(),
    issued_at: z.string().refine(isCanonicalInstant),
    expires_at: z.string().refine(isCanonicalInstant),
    workflow_id: z.string().regex(MACHINE_ID),
    jbtd_id: z.string().regex(SLICE_ID),
    persona_id: z.string().regex(SLICE_ID),
    outcome_metric: z.string().min(1).max(180),
    outcome_unit: z.string().min(1).max(80),
    source_system: z.string().min(1).max(120),
    baseline_window: CohortProofWindowSchema,
    comparison_window: CohortProofWindowSchema,
    admission_receipt_hash: z.string().regex(HEX_32),
    population_commitment: z.string().regex(HEX_32),
    reservation_key: z.string().regex(HEX_32)
  })
  .strict();

const withProofTimeAndWindowChecks = <T extends z.AnyZodObject>(schema: T) =>
  schema
    .refine(
      (value) => Date.parse(value.expires_at) > Date.parse(value.issued_at),
      {
        path: ["expires_at"]
      }
    )
    .refine(
    (value) =>
      Date.parse(value.comparison_window.period_start) >=
      Date.parse(value.baseline_window.period_end),
    { path: ["comparison_window", "period_start"] }
  );

export const UnsignedCohortEqualityProofSchema =
  withProofTimeAndWindowChecks(UnsignedCohortEqualityProofObjectSchema);

export const CohortEqualityProofSchema = withProofTimeAndWindowChecks(
  UnsignedCohortEqualityProofObjectSchema.extend({
    signature: z.string().regex(ED25519_SIGNATURE)
  }).strict()
);

export type UnsignedCohortEqualityProof = z.infer<
  typeof UnsignedCohortEqualityProofSchema
>;
export type CohortEqualityProof = z.infer<typeof CohortEqualityProofSchema>;

const encoder = new TextEncoder();

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

const uint32 = (value: number): Uint8Array => {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
    throw new Error("COHORT_CODEC_INVALID_UINT32");
  }
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, false);
  return bytes;
};

const uint64 = (value: number): Uint8Array => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("COHORT_CODEC_INVALID_UINT64");
  }
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigUint64(0, BigInt(value), false);
  return bytes;
};

const binary64 = (value: number): Uint8Array => {
  if (!Number.isFinite(value) || Object.is(value, -0)) {
    throw new Error("COHORT_CODEC_INVALID_BINARY64");
  }
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setFloat64(0, value, false);
  return bytes;
};

const hasUnpairedSurrogate = (value: string): boolean => {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!Number.isInteger(next) || next < 0xdc00 || next > 0xdfff) return true;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
};

const utf8 = (value: string): Uint8Array => {
  if (hasUnpairedSurrogate(value)) {
    throw new Error("COHORT_CODEC_INVALID_UNICODE");
  }
  return encoder.encode(value);
};

const hexBytes = (value: string): Uint8Array => {
  if (!HEX_32.test(value)) throw new Error("COHORT_CODEC_INVALID_HASH");
  const bytes = new Uint8Array(32);
  for (let index = 0; index < 32; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
};

const base64UrlBytes = (value: string): Uint8Array => {
  if (!ED25519_SIGNATURE.test(value)) {
    throw new Error("COHORT_CODEC_INVALID_SIGNATURE");
  }
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let bits = 0;
  let accumulator = 0;
  const output: number[] = [];
  for (const character of value) {
    const digit = alphabet.indexOf(character);
    if (digit < 0) throw new Error("COHORT_CODEC_INVALID_SIGNATURE");
    accumulator = (accumulator << 6) | digit;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output.push((accumulator >> bits) & 0xff);
    }
  }
  if (bits !== 4 || (accumulator & 0x0f) !== 0 || output.length !== 64) {
    throw new Error("COHORT_CODEC_INVALID_SIGNATURE");
  }
  return Uint8Array.from(output);
};

const compareBytes = (left: Uint8Array, right: Uint8Array): number => {
  const length = Math.min(left.byteLength, right.byteLength);
  for (let index = 0; index < length; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return left.byteLength - right.byteLength;
};

type Field = readonly [tag: string, type: string, value: Uint8Array];

const transcript = (domain: string, fields: ReadonlyArray<Field>): Uint8Array => {
  const domainBytes = utf8(domain);
  const encodedFields = fields.map(([tag, type, value]) => {
    const tagBytes = utf8(tag);
    const typeBytes = utf8(type);
    return concat([
      uint32(tagBytes.byteLength),
      tagBytes,
      uint32(typeBytes.byteLength),
      typeBytes,
      uint32(value.byteLength),
      value
    ]);
  });
  return concat([
    uint32(domainBytes.byteLength),
    domainBytes,
    uint32(encodedFields.length),
    ...encodedFields
  ]);
};

const stringField = (tag: string, value: string): Field => [
  tag,
  "utf8",
  utf8(value)
];
const nullableStringField = (
  tag: string,
  value: string | null | undefined
): Field =>
  value === null || value === undefined
    ? [tag, "null", new Uint8Array()]
    : stringField(tag, value);
const uintField = (tag: string, value: number): Field => [
  tag,
  "u64be",
  uint64(value)
];
const hashField = (tag: string, value: string): Field => [
  tag,
  "sha256",
  hexBytes(value)
];

const canonicalJsonString = (value: unknown): string => {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) {
      throw new Error("COHORT_CODEC_INVALID_JSON_NUMBER");
    }
    return JSON.stringify(value);
  }
  if (typeof value === "string") {
    utf8(value);
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    if (
      Object.keys(value).length !== value.length ||
      Object.keys(value).some((key) => !/^(0|[1-9]\d*)$/.test(key))
    ) {
      throw new Error("COHORT_CODEC_INVALID_JSON_ARRAY");
    }
    return `[${value.map(canonicalJsonString).join(",")}]`;
  }
  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    const keys = Object.keys(object).sort((left, right) =>
      compareBytes(utf8(left), utf8(right))
    );
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${canonicalJsonString(object[key])}`)
      .join(",")}}`;
  }
  throw new Error("COHORT_CODEC_UNSUPPORTED_JSON");
};

export const canonicalCohortJsonBytes = (value: unknown): Uint8Array =>
  utf8(canonicalJsonString(value));

export interface ExactCohortSlice {
  org_id: string;
  workflow_id: string;
  jbtd_id: string;
  persona_id: string;
}

const sliceFields = (slice: ExactCohortSlice): Field[] => [
  stringField("org_id", slice.org_id),
  stringField("workflow_id", slice.workflow_id),
  stringField("jbtd_id", slice.jbtd_id),
  stringField("persona_id", slice.persona_id)
];

export const cohortReservationBytes = (
  slice: ExactCohortSlice
): Uint8Array =>
  transcript("FT_COHORT_RESERVATION_V1", sliceFields(slice));

export const cohortMemberSetBytes = (
  slice: ExactCohortSlice,
  memberHandles: ReadonlyArray<string>
): Uint8Array => {
  if (memberHandles.length < 5) {
    throw new Error("COHORT_CODEC_INSUFFICIENT_MEMBERS");
  }
  const members = memberHandles.map((handle) => {
    const bytes = utf8(handle);
    if (
      bytes.byteLength < 1 ||
      bytes.byteLength > 256 ||
      [...handle].some((character) => character.codePointAt(0)! < 0x20)
    ) {
      throw new Error("COHORT_CODEC_INVALID_MEMBER");
    }
    return bytes;
  });
  members.sort(compareBytes);
  for (let index = 1; index < members.length; index += 1) {
    if (compareBytes(members[index - 1], members[index]) === 0) {
      throw new Error("COHORT_CODEC_DUPLICATE_MEMBER");
    }
  }
  return transcript("FT_COHORT_EQUALITY_COMMITMENT_V1", [
    ...sliceFields(slice),
    ["member_count", "u32be", uint32(members.length)],
    [
      "members",
      "framed_utf8_set",
      concat(
        members.flatMap((member) => [uint32(member.byteLength), member])
      )
    ]
  ]);
};

export const outcomeEvidenceContentBytes = (
  record: OutcomeEvidenceRecord
): Uint8Array =>
  transcript("FT_OUTCOME_EVIDENCE_CONTENT_V1", [
    stringField("evidence_id", record.evidence_id),
    stringField("org_id", record.org_id),
    stringField("workflow_id", record.workflow_id),
    nullableStringField("jbtd_id", record.jbtd_id),
    nullableStringField("persona_id", record.persona_id),
    stringField("outcome_metric", record.outcome_metric),
    stringField("outcome_unit", record.outcome_unit),
    stringField("source_system", record.source_system),
    stringField("period_start", record.period_start),
    stringField("period_end", record.period_end),
    ["aggregate_value", "binary64be", binary64(record.aggregate_value)],
    uintField("cohort_size", record.cohort_size),
    nullableStringField("aggregate_kind", record.aggregate_kind),
    [
      "source_attestation",
      "canonical_json",
      canonicalCohortJsonBytes(record.source_attestation ?? null)
    ],
    stringField("ingested_at", record.ingested_at)
  ]);

const stringListBytes = (values: ReadonlyArray<string>): Uint8Array =>
  concat(
    values.map((value) => {
      const bytes = utf8(value);
      return concat([uint32(bytes.byteLength), bytes]);
    })
  );

export const outcomeEvidenceAdmissionReceiptBytes = (
  receipt: OutcomeEvidenceAdmissionReceipt
): Uint8Array =>
  transcript("FT_OUTCOME_EVIDENCE_ADMISSION_RECEIPT_V1", [
    stringField("policy_version", receipt.policy_version),
    stringField("workflow_id", receipt.workflow_id),
    stringField("jbtd_id", receipt.jbtd_id),
    stringField("persona_id", receipt.persona_id),
    stringField("baseline_period_start", receipt.baseline_window.period_start),
    stringField("baseline_period_end", receipt.baseline_window.period_end),
    [
      "baseline_evidence_ids",
      "framed_utf8_list",
      stringListBytes(receipt.baseline_window.evidence_ids)
    ],
    stringField(
      "comparison_period_start",
      receipt.comparison_window.period_start
    ),
    stringField("comparison_period_end", receipt.comparison_window.period_end),
    [
      "comparison_evidence_ids",
      "framed_utf8_list",
      stringListBytes(receipt.comparison_window.evidence_ids)
    ]
  ]);

export const unsignedCohortProofBytes = (
  input: UnsignedCohortEqualityProof
): Uint8Array => {
  const proof = UnsignedCohortEqualityProofSchema.parse(input);
  return transcript("FT_COHORT_EQUALITY_PROOF_SIGNATURE_V1", [
    stringField("schema_version", proof.schema_version),
    stringField("proof_policy_version", proof.proof_policy_version),
    stringField("producer_policy_version", proof.producer_policy_version),
    stringField("proof_id", proof.proof_id),
    stringField("org_id", proof.org_id),
    stringField("producer_key_id", proof.producer_key_id),
    uintField("authority_version", proof.authority_version),
    stringField("issued_at", proof.issued_at),
    stringField("expires_at", proof.expires_at),
    stringField("workflow_id", proof.workflow_id),
    stringField("jbtd_id", proof.jbtd_id),
    stringField("persona_id", proof.persona_id),
    stringField("outcome_metric", proof.outcome_metric),
    stringField("outcome_unit", proof.outcome_unit),
    stringField("source_system", proof.source_system),
    stringField(
      "baseline_period_start",
      proof.baseline_window.period_start
    ),
    stringField("baseline_period_end", proof.baseline_window.period_end),
    uintField("baseline_cohort_size", proof.baseline_window.cohort_size),
    hashField(
      "baseline_evidence_content_hash",
      proof.baseline_window.evidence_content_hash
    ),
    stringField(
      "comparison_period_start",
      proof.comparison_window.period_start
    ),
    stringField("comparison_period_end", proof.comparison_window.period_end),
    uintField("comparison_cohort_size", proof.comparison_window.cohort_size),
    hashField(
      "comparison_evidence_content_hash",
      proof.comparison_window.evidence_content_hash
    ),
    hashField("admission_receipt_hash", proof.admission_receipt_hash),
    hashField("population_commitment", proof.population_commitment),
    hashField("reservation_key", proof.reservation_key)
  ]);
};

export const signedCohortProofBytes = (
  input: CohortEqualityProof
): Uint8Array => {
  const proof = CohortEqualityProofSchema.parse(input);
  const { signature, ...unsigned } = proof;
  return transcript("FT_COHORT_EQUALITY_SIGNED_PROOF_V1", [
    ["unsigned_proof", "transcript", unsignedCohortProofBytes(unsigned)],
    ["signature", "ed25519", base64UrlBytes(signature)]
  ]);
};

export const cohortPublicKeyFingerprintBytes = (
  canonicalDerSpki: Uint8Array
): Uint8Array =>
  transcript("FT_ED25519_PUBLIC_KEY_FINGERPRINT_V1", [
    ["der_spki", "bytes", canonicalDerSpki]
  ]);
