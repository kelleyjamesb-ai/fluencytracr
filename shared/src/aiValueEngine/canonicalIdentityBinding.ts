import { createHash } from "node:crypto";
import { z } from "zod";

import {
  AGGREGATE_CLAIM_AUTHORIZATION_POLICY_VERSION,
  AGGREGATE_DESCRIPTIVE_CLAIM_TEMPLATE_ID,
  AggregateAuthorizedPacketContentSchema,
  AggregateAuthorizedClaimArtifactSchema,
  AggregateAuthorizedPacketArtifactSchema,
  AggregateClaimAuthorizationManifestSchema,
  aggregateClaimCanonicalBytes,
  aggregateClaimBundleReconciles,
  aggregateClaimHash,
  aggregateClaimReadoutText,
  INTERNAL_AGGREGATE_CLAIM_OBJECT_TYPE,
  INTERNAL_AGGREGATE_MANIFEST_OBJECT_TYPE,
  INTERNAL_AGGREGATE_PACKET_OBJECT_TYPE,
  INTERNAL_CANONICAL_IDENTITY_BINDING_OBJECT_TYPE,
  type AggregateAuthorizedPacketContent
} from "./aggregateClaimAuthorization";

export const CANONICAL_IDENTITY_CORE_SCHEMA_VERSION = "FT_CANONICAL_IDENTITY_CORE_V1";
export const CANONICAL_IDENTITY_BINDING_SCHEMA_VERSION = "FT_CANONICAL_IDENTITY_BINDING_V1";
export const CANONICAL_READOUT_RENDERER_VERSION = "FT_CANONICAL_READOUT_RENDERER_V1";

const SHA256_HEX = /^[0-9a-f]{64}$/;
const SAFE_ID = /^[a-z0-9][a-z0-9:_-]{0,511}$/;
const PERSON_SHAPED_ID = /(?:@|\b(?:employee|user|person|email|name)[_:-]?[a-z0-9])/i;
const exactHash = z.string().regex(SHA256_HEX);
const positiveVersion = z.number().int().positive();
const safeAggregateId = z
  .string()
  .regex(SAFE_ID)
  .refine((value) => !PERSON_SHAPED_ID.test(value), {
    message: "canonical identity selectors must not contain person-shaped identifiers"
  });

export const CanonicalIdentitySelectorSchema = z
  .object({
    value_hypothesis_id: safeAggregateId,
    value_hypothesis_version: positiveVersion,
    measurement_plan_id: safeAggregateId,
    measurement_plan_version: positiveVersion,
    measurement_cell_id: safeAggregateId,
    measurement_cell_version: positiveVersion
  })
  .strict();

export type CanonicalIdentitySelector = z.infer<typeof CanonicalIdentitySelectorSchema>;

export const CanonicalIdentityCoreSchema = z
  .object({
    schema_version: z.literal(CANONICAL_IDENTITY_CORE_SCHEMA_VERSION),
    renderer_version: z.literal(CANONICAL_READOUT_RENDERER_VERSION),
    org_commitment: exactHash,
    hypothesis_version: positiveVersion,
    hypothesis_semantic_commitment: exactHash,
    hypothesis_creation_attestation_commitment: exactHash,
    plan_version: positiveVersion,
    plan_semantic_commitment: exactHash,
    plan_edge_attestation_commitment: exactHash,
    measurement_cell_version: positiveVersion,
    measurement_cell_semantic_commitment: exactHash,
    measurement_cell_edge_attestation_commitment: exactHash,
    metric_definition_commitment: exactHash,
    canonical_slice_commitment: exactHash,
    windows_commitment: exactHash,
    source_graph_commitment: exactHash,
    accepted_export_commitment: exactHash,
    accepted_review_commitment: exactHash,
    admission_commitment: exactHash,
    comparison_receipt_commitment: exactHash,
    comparison_projection_commitment: exactHash,
    claim_policy_version: z.literal(AGGREGATE_CLAIM_AUTHORIZATION_POLICY_VERSION),
    claim_template_id: z.literal(AGGREGATE_DESCRIPTIVE_CLAIM_TEMPLATE_ID)
  })
  .strict();

export type CanonicalIdentityCore = z.infer<typeof CanonicalIdentityCoreSchema>;

export interface BuildCanonicalIdentityCoreInput {
  orgCommitment: string;
  hypothesisVersion: number;
  hypothesisSemanticCommitment: string;
  hypothesisCreationAttestationCommitment: string;
  planVersion: number;
  planSemanticCommitment: string;
  planEdgeAttestationCommitment: string;
  measurementCellVersion: number;
  measurementCellSemanticCommitment: string;
  measurementCellEdgeAttestationCommitment: string;
  metricDefinitionCommitment: string;
  canonicalSliceCommitment: string;
  windowsCommitment: string;
  sourceGraphCommitment: string;
  acceptedExportCommitment: string;
  acceptedReviewCommitment: string;
  admissionCommitment: string;
  comparisonReceiptCommitment: string;
  comparisonProjectionCommitment: string;
  claimPolicyVersion: typeof AGGREGATE_CLAIM_AUTHORIZATION_POLICY_VERSION;
  claimTemplateId: typeof AGGREGATE_DESCRIPTIVE_CLAIM_TEMPLATE_ID;
}

export const buildCanonicalIdentityCore = (
  input: BuildCanonicalIdentityCoreInput
): CanonicalIdentityCore =>
  CanonicalIdentityCoreSchema.parse({
    schema_version: CANONICAL_IDENTITY_CORE_SCHEMA_VERSION,
    renderer_version: CANONICAL_READOUT_RENDERER_VERSION,
    org_commitment: input.orgCommitment,
    hypothesis_version: input.hypothesisVersion,
    hypothesis_semantic_commitment: input.hypothesisSemanticCommitment,
    hypothesis_creation_attestation_commitment: input.hypothesisCreationAttestationCommitment,
    plan_version: input.planVersion,
    plan_semantic_commitment: input.planSemanticCommitment,
    plan_edge_attestation_commitment: input.planEdgeAttestationCommitment,
    measurement_cell_version: input.measurementCellVersion,
    measurement_cell_semantic_commitment: input.measurementCellSemanticCommitment,
    measurement_cell_edge_attestation_commitment: input.measurementCellEdgeAttestationCommitment,
    metric_definition_commitment: input.metricDefinitionCommitment,
    canonical_slice_commitment: input.canonicalSliceCommitment,
    windows_commitment: input.windowsCommitment,
    source_graph_commitment: input.sourceGraphCommitment,
    accepted_export_commitment: input.acceptedExportCommitment,
    accepted_review_commitment: input.acceptedReviewCommitment,
    admission_commitment: input.admissionCommitment,
    comparison_receipt_commitment: input.comparisonReceiptCommitment,
    comparison_projection_commitment: input.comparisonProjectionCommitment,
    claim_policy_version: input.claimPolicyVersion,
    claim_template_id: input.claimTemplateId
  });

export const canonicalIdentityCoreCommitment = (core: unknown): string =>
  aggregateClaimHash(
    "FT_CANONICAL_IDENTITY_CORE_COMMITMENT_V1",
    CanonicalIdentityCoreSchema.parse(core)
  );

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export const renderAggregateClaimReadoutHtml = (
  content: AggregateAuthorizedPacketContent
): string => {
  const parsed = AggregateAuthorizedPacketContentSchema.parse(content);
  const movement = escapeHtml(aggregateClaimReadoutText(parsed.movement));
  const caveats = parsed.caveats.map((caveat) => `<li>${escapeHtml(caveat)}</li>`).join("");
  return `<!doctype html><html><body><main><h1>Internal aggregate observation</h1><p>${movement}</p><ul>${caveats}</ul></main></body></html>`;
};

export const renderCanonicalAggregateClaimReadoutHtml = (
  content: AggregateAuthorizedPacketContent
): string => {
  const parsed = AggregateAuthorizedPacketContentSchema.parse(content);
  if (parsed.canonical_identity_core_commitment === undefined) {
    throw new Error("CANONICAL_IDENTITY_CORE_COMMITMENT_REQUIRED");
  }
  return renderAggregateClaimReadoutHtml(parsed);
};

export const canonicalReadoutBytesCommitment = (html: string): string =>
  createHash("sha256")
    .update(aggregateClaimCanonicalBytes("FT_CANONICAL_READOUT_BYTES_V1", html))
    .digest("hex");

const claimId = z.string().regex(/^aggregate_claim_[0-9a-f]{64}_[0-9a-f]{64}$/);
const packetId = z.string().regex(/^aggregate_packet_[0-9a-f]{64}_[0-9a-f]{64}$/);
const manifestId = z.string().regex(/^manifest_[0-9a-f]{64}$/);

export const CanonicalIdentityBindingSchema = z
  .object({
    schema_version: z.literal(CANONICAL_IDENTITY_BINDING_SCHEMA_VERSION),
    binding_id: z.string().regex(/^canonical_identity_binding_[0-9a-f]{64}$/),
    state: z.literal("BOUND"),
    canonical_identity_core_commitment: exactHash,
    claim_id: claimId,
    claim_content_hash: exactHash,
    packet_id: packetId,
    packet_content_hash: exactHash,
    manifest_id: manifestId,
    manifest_hash: exactHash,
    rendered_body_commitment: exactHash,
    customer_facing_output_authorized: z.literal(false)
  })
  .strict();

export type CanonicalIdentityBinding = z.infer<typeof CanonicalIdentityBindingSchema>;

export interface BuildCanonicalIdentityBindingInput {
  canonicalIdentityCoreCommitment: string;
  claimId: string;
  claimContentHash: string;
  packetId: string;
  packetContentHash: string;
  manifestId: string;
  manifestHash: string;
  renderedBodyCommitment: string;
}

export const canonicalIdentityBindingIdFromPacketId = (value: string): string => {
  const parsed = packetId.parse(value);
  return `canonical_identity_binding_${aggregateClaimHash("FT_CANONICAL_IDENTITY_BINDING_ID_V1", {
    packet_id: parsed
  })}`;
};

export const buildCanonicalIdentityBinding = (
  input: BuildCanonicalIdentityBindingInput
): CanonicalIdentityBinding =>
  CanonicalIdentityBindingSchema.parse({
    schema_version: CANONICAL_IDENTITY_BINDING_SCHEMA_VERSION,
    binding_id: canonicalIdentityBindingIdFromPacketId(input.packetId),
    state: "BOUND",
    canonical_identity_core_commitment: input.canonicalIdentityCoreCommitment,
    claim_id: input.claimId,
    claim_content_hash: input.claimContentHash,
    packet_id: input.packetId,
    packet_content_hash: input.packetContentHash,
    manifest_id: input.manifestId,
    manifest_hash: input.manifestHash,
    rendered_body_commitment: input.renderedBodyCommitment,
    customer_facing_output_authorized: false
  });

export const canonicalIdentityBindingReconciles = (binding: unknown): boolean => {
  const parsed = CanonicalIdentityBindingSchema.safeParse(binding);
  return (
    parsed.success &&
    parsed.data.binding_id === canonicalIdentityBindingIdFromPacketId(parsed.data.packet_id)
  );
};

export const canonicalIdentityBundleReconciles = (input: {
  claim: unknown;
  packet: unknown;
  manifest: unknown;
  binding: unknown;
}): boolean => {
  const claim = AggregateAuthorizedClaimArtifactSchema.safeParse(input.claim);
  const packet = AggregateAuthorizedPacketArtifactSchema.safeParse(input.packet);
  const manifest = AggregateClaimAuthorizationManifestSchema.safeParse(input.manifest);
  const binding = CanonicalIdentityBindingSchema.safeParse(input.binding);
  if (
    !claim.success ||
    !packet.success ||
    !manifest.success ||
    !binding.success ||
    !aggregateClaimBundleReconciles({
      claim: claim.data,
      packet: packet.data,
      manifest: manifest.data
    }) ||
    !canonicalIdentityBindingReconciles(binding.data)
  ) {
    return false;
  }
  try {
    const coreCommitment = manifest.data.core.canonical_identity_core_commitment;
    if (!coreCommitment) return false;
    const html = renderCanonicalAggregateClaimReadoutHtml(packet.data.content);
    return (
      claim.data.content.canonical_identity_core_commitment === coreCommitment &&
      packet.data.content.canonical_identity_core_commitment === coreCommitment &&
      binding.data.canonical_identity_core_commitment === coreCommitment &&
      binding.data.claim_id === claim.data.claim_id &&
      binding.data.claim_content_hash === claim.data.content_hash &&
      binding.data.packet_id === packet.data.packet_id &&
      binding.data.packet_content_hash === packet.data.content_hash &&
      binding.data.manifest_id === manifest.data.manifest_id &&
      binding.data.manifest_hash === manifest.data.manifest_hash &&
      binding.data.rendered_body_commitment === canonicalReadoutBytesCommitment(html)
    );
  } catch {
    return false;
  }
};

export const CanonicalIdentityStateSchema = z.enum(["UNBOUND", "BOUND"]);
export type CanonicalIdentityState = z.infer<typeof CanonicalIdentityStateSchema>;

export const CanonicalIdentityAuthorizedResponseSchema = z
  .object({
    decision: z.literal("AUTHORIZED"),
    claim_authorization_state: z.literal("AUTHORIZED"),
    canonical_identity_state: z.literal("BOUND"),
    source_bound: z.literal(true),
    canonical_identity_core_commitment: exactHash,
    packet_id: packetId,
    persisted: z
      .array(
        z
          .object({
            object_type: z.enum([
              INTERNAL_AGGREGATE_CLAIM_OBJECT_TYPE,
              INTERNAL_AGGREGATE_PACKET_OBJECT_TYPE,
              INTERNAL_AGGREGATE_MANIFEST_OBJECT_TYPE,
              INTERNAL_CANONICAL_IDENTITY_BINDING_OBJECT_TYPE
            ]),
            object_id: z.string().min(1)
          })
          .strict()
      )
      .length(4)
      .superRefine((entries, context) => {
        const actual = new Set(entries.map((entry) => entry.object_type));
        for (const required of [
          INTERNAL_AGGREGATE_CLAIM_OBJECT_TYPE,
          INTERNAL_AGGREGATE_PACKET_OBJECT_TYPE,
          INTERNAL_AGGREGATE_MANIFEST_OBJECT_TYPE,
          INTERNAL_CANONICAL_IDENTITY_BINDING_OBJECT_TYPE
        ] as const) {
          if (!actual.has(required)) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: `persisted must include ${required}`
            });
          }
        }
      }),
    customer_facing_output_authorized: z.literal(false)
  })
  .strict();

export type CanonicalIdentityAuthorizedResponse = z.infer<
  typeof CanonicalIdentityAuthorizedResponseSchema
>;
