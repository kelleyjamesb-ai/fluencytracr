import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

import { aggregateClaimCanonicalBytes } from "./aggregateClaimAuthorization";

export const CANONICAL_IDENTITY_ATTESTATION_DOMAINS = Object.freeze({
  hypothesis_creation: "FT_CANONICAL_VALUE_HYPOTHESIS_CREATION_ATTESTATION_V1",
  plan_edge: "FT_CANONICAL_HYPOTHESIS_EDGE_ATTESTATION_V1",
  measurement_cell_edge: "FT_CANONICAL_MEASUREMENT_LINEAGE_ATTESTATION_V1",
  four_artifact_bundle: "FT_CANONICAL_ARTIFACT_CREATION_ATTESTATION_V1"
} as const);

export type CanonicalIdentityAttestationKind = keyof typeof CANONICAL_IDENTITY_ATTESTATION_DOMAINS;

const SHA256_HEX = /^[0-9a-f]{64}$/;
const SLICE_E_KEY_ID = /^FT_E_HMAC_[A-Z0-9_]{1,48}$/;
const exactCommitment = z.string().regex(SHA256_HEX);
const sourceRowId = z.string().uuid();
const sourceVersion = z.number().int().positive();
const aggregateGrain = z.string().min(1).max(128);
const canonicalDirection = z.enum(["INCREASE", "DECREASE", "MAINTAIN", "MONITOR", "NO_CHANGE"]);

export const CanonicalIdentityAttestationKeyIdSchema = z.string().regex(SLICE_E_KEY_ID);

export const CanonicalIdentityAttestationEnvelopeSchema = z
  .object({
    key_id: CanonicalIdentityAttestationKeyIdSchema,
    mac: exactCommitment
  })
  .strict();

export type CanonicalIdentityAttestationEnvelope = z.infer<
  typeof CanonicalIdentityAttestationEnvelopeSchema
>;

export const CanonicalValueHypothesisCreationAttestationEnvelopeSchema = z
  .object({
    hypothesis_semantic_commitment: exactCommitment,
    key_id: CanonicalIdentityAttestationKeyIdSchema,
    mac: exactCommitment
  })
  .strict();

export type CanonicalValueHypothesisCreationAttestationEnvelope = z.infer<
  typeof CanonicalValueHypothesisCreationAttestationEnvelopeSchema
>;

export const CanonicalHypothesisEdgeAttestationEnvelopeSchema = z
  .object({
    plan_semantic_commitment: exactCommitment,
    hypothesis_row_id: sourceRowId,
    hypothesis_version: sourceVersion,
    hypothesis_semantic_commitment: exactCommitment,
    hypothesis_creation_attestation_commitment: exactCommitment,
    approved_aggregate_grain: aggregateGrain,
    canonical_slice_commitment: exactCommitment,
    key_id: CanonicalIdentityAttestationKeyIdSchema,
    mac: exactCommitment
  })
  .strict();

export type CanonicalHypothesisEdgeAttestationEnvelope = z.infer<
  typeof CanonicalHypothesisEdgeAttestationEnvelopeSchema
>;

export const CanonicalMeasurementLineageAttestationEnvelopeSchema = z
  .object({
    measurement_cell_semantic_commitment: exactCommitment,
    plan_row_id: sourceRowId,
    plan_version: sourceVersion,
    plan_semantic_commitment: exactCommitment,
    plan_edge_attestation_commitment: exactCommitment,
    hypothesis_row_id: sourceRowId,
    hypothesis_version: sourceVersion,
    hypothesis_semantic_commitment: exactCommitment,
    hypothesis_creation_attestation_commitment: exactCommitment,
    approved_aggregate_grain: aggregateGrain,
    canonical_metric_definition_commitment_v1: exactCommitment,
    canonical_direction: canonicalDirection,
    key_id: CanonicalIdentityAttestationKeyIdSchema,
    mac: exactCommitment
  })
  .strict();

export type CanonicalMeasurementLineageAttestationEnvelope = z.infer<
  typeof CanonicalMeasurementLineageAttestationEnvelopeSchema
>;

export const CanonicalArtifactCreationAttestationEnvelopeSchema =
  CanonicalIdentityAttestationEnvelopeSchema;

export type CanonicalArtifactCreationAttestationEnvelope = CanonicalIdentityAttestationEnvelope;

export const CanonicalIdentityBindingValidationEnvelopeSchema = z
  .object({
    canonical_artifact_creation_attestation_v1: CanonicalArtifactCreationAttestationEnvelopeSchema
  })
  .strict();

export type CanonicalIdentityBindingValidationEnvelope = z.infer<
  typeof CanonicalIdentityBindingValidationEnvelopeSchema
>;

export type CanonicalIdentityAttestationSecretResolver = (keyId: string) => Uint8Array | null;

const assertSecret = (secret: Uint8Array): void => {
  if (secret.byteLength !== 32) {
    throw new Error("CANONICAL_IDENTITY_ATTESTATION_SECRET_INVALID");
  }
};

export const canonicalIdentityAttestationPreimage = (
  kind: CanonicalIdentityAttestationKind,
  payload: unknown
): Uint8Array =>
  aggregateClaimCanonicalBytes(CANONICAL_IDENTITY_ATTESTATION_DOMAINS[kind], payload);

export const createCanonicalIdentityAttestation = (
  kind: CanonicalIdentityAttestationKind,
  payload: unknown,
  keyId: string,
  secret: Uint8Array
): CanonicalIdentityAttestationEnvelope => {
  const parsedKeyId = CanonicalIdentityAttestationKeyIdSchema.safeParse(keyId);
  if (!parsedKeyId.success) {
    throw new Error("CANONICAL_IDENTITY_ATTESTATION_KEY_ID_INVALID");
  }
  assertSecret(secret);

  return {
    key_id: parsedKeyId.data,
    mac: createHmac("sha256", secret)
      .update(canonicalIdentityAttestationPreimage(kind, payload))
      .digest("hex")
  };
};

const UNKNOWN_KEY_SECRET = Buffer.alloc(32);

export const verifyCanonicalIdentityAttestation = (
  kind: CanonicalIdentityAttestationKind,
  payload: unknown,
  envelopeInput: unknown,
  resolveSecret: CanonicalIdentityAttestationSecretResolver
): boolean => {
  const parsedEnvelope = CanonicalIdentityAttestationEnvelopeSchema.safeParse(envelopeInput);
  if (!parsedEnvelope.success) {
    return false;
  }

  try {
    const resolvedSecret = resolveSecret(parsedEnvelope.data.key_id);
    const keyWasResolved = resolvedSecret !== null;
    const usableSecret =
      keyWasResolved && resolvedSecret.byteLength === 32 ? resolvedSecret : UNKNOWN_KEY_SECRET;
    const expectedMac = createHmac("sha256", usableSecret)
      .update(canonicalIdentityAttestationPreimage(kind, payload))
      .digest();
    const suppliedMac = Buffer.from(parsedEnvelope.data.mac, "hex");
    const macMatches =
      suppliedMac.byteLength === expectedMac.byteLength &&
      timingSafeEqual(expectedMac, suppliedMac);

    return keyWasResolved && resolvedSecret?.byteLength === 32 && macMatches;
  } catch {
    return false;
  }
};
