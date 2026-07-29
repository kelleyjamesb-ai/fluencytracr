import { aiValueEngine } from "@fluencytracr/shared";

import {
  canonicalIdentityAttestationWriteKey,
  parseCanonicalIdentityAttestationConfig,
  resolveCanonicalIdentityAttestationReadKey
} from "../canonical-identity-attestation-config";

export const canonicalHypothesisAttestationPayload = (input: {
  orgId: string;
  rowId: string;
  stableId: string;
  version: number;
  semanticCommitment: string;
  status: string;
  predecessor:
    | { state: "ROOT_V1" }
    | {
        state: "EXACT_PREDECESSOR";
        rowId: string;
        stableId: string;
        version: number;
        semanticCommitment: string;
        attestationCommitment: string;
      };
}) => ({
  org_id: input.orgId,
  source_row_id: input.rowId,
  value_hypothesis_id: input.stableId,
  version: input.version,
  hypothesis_semantic_commitment: input.semanticCommitment,
  status: input.status,
  predecessor:
    input.predecessor.state === "ROOT_V1"
      ? { state: "ROOT_V1" as const }
      : {
          state: "EXACT_PREDECESSOR" as const,
          source_row_id: input.predecessor.rowId,
          value_hypothesis_id: input.predecessor.stableId,
          version: input.predecessor.version,
          hypothesis_semantic_commitment: input.predecessor.semanticCommitment,
          hypothesis_creation_attestation_commitment: input.predecessor.attestationCommitment
        }
});

export const canonicalPlanEdgeAttestationPayload = (input: {
  orgId: string;
  rowId: string;
  stableId: string;
  version: number;
  semanticCommitment: string;
  readinessState: string;
  approvedAggregateGrain: string;
  canonicalSliceCommitment: string;
  canonicalMetricDefinitionCommitment: string;
  hypothesis: {
    rowId: string;
    stableId: string;
    version: number;
    semanticCommitment: string;
    attestationCommitment: string;
  };
}) => ({
  org_id: input.orgId,
  source_row_id: input.rowId,
  measurement_plan_id: input.stableId,
  version: input.version,
  plan_semantic_commitment: input.semanticCommitment,
  readiness_state: input.readinessState,
  approved_aggregate_grain: input.approvedAggregateGrain,
  canonical_slice_commitment: input.canonicalSliceCommitment,
  canonical_metric_definition_commitment_v1: input.canonicalMetricDefinitionCommitment,
  hypothesis: {
    source_row_id: input.hypothesis.rowId,
    value_hypothesis_id: input.hypothesis.stableId,
    version: input.hypothesis.version,
    hypothesis_semantic_commitment: input.hypothesis.semanticCommitment,
    hypothesis_creation_attestation_commitment: input.hypothesis.attestationCommitment
  }
});

export const canonicalMeasurementCellAttestationPayload = (input: {
  orgId: string;
  rowId: string;
  stableId: string;
  version: number;
  semanticCommitment: string;
  approvalState: string;
  metricOwnerApprovalState: string;
  approvedAggregateGrain: string;
  canonicalMetricDefinitionCommitment: string;
  canonicalDirection: string;
  plan: {
    rowId: string;
    stableId: string;
    version: number;
    semanticCommitment: string;
    attestationCommitment: string;
  };
  hypothesis: {
    rowId: string;
    stableId: string;
    version: number;
    semanticCommitment: string;
    attestationCommitment: string;
  };
}) => ({
  org_id: input.orgId,
  source_row_id: input.rowId,
  measurement_cell_id: input.stableId,
  version: input.version,
  measurement_cell_semantic_commitment: input.semanticCommitment,
  approval_state: input.approvalState,
  metric_owner_approval_state: input.metricOwnerApprovalState,
  approved_aggregate_grain: input.approvedAggregateGrain,
  canonical_metric_definition_commitment_v1: input.canonicalMetricDefinitionCommitment,
  canonical_direction: input.canonicalDirection,
  plan: {
    source_row_id: input.plan.rowId,
    measurement_plan_id: input.plan.stableId,
    version: input.plan.version,
    plan_semantic_commitment: input.plan.semanticCommitment,
    plan_edge_attestation_commitment: input.plan.attestationCommitment
  },
  hypothesis: {
    source_row_id: input.hypothesis.rowId,
    value_hypothesis_id: input.hypothesis.stableId,
    version: input.hypothesis.version,
    hypothesis_semantic_commitment: input.hypothesis.semanticCommitment,
    hypothesis_creation_attestation_commitment: input.hypothesis.attestationCommitment
  }
});

export const canonicalArtifactBundleAttestationPayload = (input: {
  orgCommitment: string;
  coreCommitment: string;
  binding: aiValueEngine.CanonicalIdentityBinding;
  claim: aiValueEngine.AggregateAuthorizedClaimArtifact;
  packet: aiValueEngine.AggregateAuthorizedPacketArtifact;
  manifest: aiValueEngine.AggregateClaimAuthorizationManifest;
}) => ({
  org_commitment: input.orgCommitment,
  binding_id: input.binding.binding_id,
  canonical_identity_core_commitment: input.coreCommitment,
  claim_semantic_hash: aiValueEngine.aggregateClaimHash(
    "FT_CANONICAL_ARTIFACT_ATTESTABLE_CLAIM_V1",
    input.claim
  ),
  packet_semantic_hash: aiValueEngine.aggregateClaimHash(
    "FT_CANONICAL_ARTIFACT_ATTESTABLE_PACKET_V1",
    input.packet
  ),
  manifest_semantic_hash: aiValueEngine.aggregateClaimHash(
    "FT_CANONICAL_ARTIFACT_ATTESTABLE_MANIFEST_V1",
    input.manifest
  ),
  binding_semantic_hash: aiValueEngine.aggregateClaimHash(
    "FT_CANONICAL_ARTIFACT_ATTESTABLE_BINDING_V1",
    input.binding
  )
});

export const createSliceEAttestation = (
  kind: aiValueEngine.CanonicalIdentityAttestationKind,
  payload: unknown
): aiValueEngine.CanonicalIdentityAttestationEnvelope | null => {
  const writeKey = canonicalIdentityAttestationWriteKey(parseCanonicalIdentityAttestationConfig());
  return writeKey
    ? aiValueEngine.createCanonicalIdentityAttestation(
        kind,
        payload,
        writeKey.keyId,
        writeKey.secret
      )
    : null;
};

export const verifySliceEAttestation = (
  kind: aiValueEngine.CanonicalIdentityAttestationKind,
  payload: unknown,
  envelope: unknown
): boolean => {
  const parsedEnvelope =
    kind === "hypothesis_creation"
      ? aiValueEngine.CanonicalValueHypothesisCreationAttestationEnvelopeSchema.safeParse(envelope)
      : kind === "plan_edge"
        ? aiValueEngine.CanonicalHypothesisEdgeAttestationEnvelopeSchema.safeParse(envelope)
        : kind === "measurement_cell_edge"
          ? aiValueEngine.CanonicalMeasurementLineageAttestationEnvelopeSchema.safeParse(envelope)
          : aiValueEngine.CanonicalArtifactCreationAttestationEnvelopeSchema.safeParse(envelope);
  if (!parsedEnvelope.success) {
    return false;
  }

  const config = parseCanonicalIdentityAttestationConfig();
  return aiValueEngine.verifyCanonicalIdentityAttestation(
    kind,
    payload,
    {
      key_id: parsedEnvelope.data.key_id,
      mac: parsedEnvelope.data.mac
    },
    (keyId) => resolveCanonicalIdentityAttestationReadKey(config, keyId)
  );
};
