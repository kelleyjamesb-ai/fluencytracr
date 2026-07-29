import { aiValueEngine } from "@fluencytracr/shared";

import {
  createSliceEAttestation,
  verifySliceEAttestation
} from "../src/services/canonical-identity-attestation.service";

const {
  CANONICAL_IDENTITY_ATTESTATION_DOMAINS,
  CanonicalArtifactCreationAttestationEnvelopeSchema,
  CanonicalHypothesisEdgeAttestationEnvelopeSchema,
  CanonicalIdentityAttestationEnvelopeSchema,
  CanonicalIdentityBindingValidationEnvelopeSchema,
  CanonicalMeasurementLineageAttestationEnvelopeSchema,
  CanonicalValueHypothesisCreationAttestationEnvelopeSchema,
  canonicalIdentityAttestationPreimage,
  createCanonicalIdentityAttestation,
  verifyCanonicalIdentityAttestation
} = aiValueEngine;

const activeKeyId = "FT_E_HMAC_PRIMARY";
const activeSecret = Buffer.alloc(32, 1);
const otherSecret = Buffer.alloc(32, 2);
const commitment = (character: string): string => character.repeat(64);
const payload = {
  org_commitment: commitment("a"),
  source_row_key: "00000000-0000-4000-8000-000000000001",
  source_version: 1
};

describe("Slice E canonical identity attestation contract", () => {
  it("uses four fixed and distinct Slice E domains", () => {
    expect(Object.keys(CANONICAL_IDENTITY_ATTESTATION_DOMAINS).sort()).toEqual([
      "four_artifact_bundle",
      "hypothesis_creation",
      "measurement_cell_edge",
      "plan_edge"
    ]);
    expect(new Set(Object.values(CANONICAL_IDENTITY_ATTESTATION_DOMAINS)).size).toBe(4);
    expect(Object.values(CANONICAL_IDENTITY_ATTESTATION_DOMAINS)).not.toContain(
      expect.stringContaining("C1")
    );
  });

  it("builds deterministic canonical preimages independent of object key order", () => {
    const reordered = {
      source_version: 1,
      source_row_key: "00000000-0000-4000-8000-000000000001",
      org_commitment: "a".repeat(64)
    };
    expect(canonicalIdentityAttestationPreimage("hypothesis_creation", payload)).toEqual(
      canonicalIdentityAttestationPreimage("hypothesis_creation", reordered)
    );
    expect(canonicalIdentityAttestationPreimage("hypothesis_creation", payload)).not.toEqual(
      canonicalIdentityAttestationPreimage("plan_edge", payload)
    );
  });

  it("stores only key ID and MAC and verifies exact payloads", () => {
    const envelope = createCanonicalIdentityAttestation(
      "hypothesis_creation",
      payload,
      activeKeyId,
      activeSecret
    );

    expect(CanonicalIdentityAttestationEnvelopeSchema.parse(envelope)).toEqual(envelope);
    expect(Object.keys(envelope).sort()).toEqual(["key_id", "mac"]);
    expect(JSON.stringify(envelope)).not.toContain(activeSecret.toString("base64url"));
    expect(
      verifyCanonicalIdentityAttestation("hypothesis_creation", payload, envelope, (keyId) =>
        keyId === activeKeyId ? activeSecret : null
      )
    ).toBe(true);
  });

  it("separates domains and rejects payload, key, MAC, and envelope substitution", () => {
    const envelope = createCanonicalIdentityAttestation(
      "hypothesis_creation",
      payload,
      activeKeyId,
      activeSecret
    );
    const resolveActive = (keyId: string) => (keyId === activeKeyId ? activeSecret : null);

    expect(verifyCanonicalIdentityAttestation("plan_edge", payload, envelope, resolveActive)).toBe(
      false
    );
    expect(
      verifyCanonicalIdentityAttestation(
        "hypothesis_creation",
        { ...payload, source_version: 2 },
        envelope,
        resolveActive
      )
    ).toBe(false);
    expect(
      verifyCanonicalIdentityAttestation(
        "hypothesis_creation",
        payload,
        envelope,
        () => otherSecret
      )
    ).toBe(false);
    expect(
      verifyCanonicalIdentityAttestation(
        "hypothesis_creation",
        payload,
        {
          ...envelope,
          mac: `${envelope.mac[0] === "0" ? "1" : "0"}${envelope.mac.slice(1)}`
        },
        resolveActive
      )
    ).toBe(false);
    expect(
      verifyCanonicalIdentityAttestation(
        "hypothesis_creation",
        payload,
        { key_id: activeKeyId, mac: "not-a-mac", secret: "forged" },
        resolveActive
      )
    ).toBe(false);
  });

  it("fails closed for absent keys and invalid secret lengths", () => {
    const envelope = createCanonicalIdentityAttestation(
      "four_artifact_bundle",
      payload,
      activeKeyId,
      activeSecret
    );
    expect(
      verifyCanonicalIdentityAttestation("four_artifact_bundle", payload, envelope, () => null)
    ).toBe(false);
    expect(() =>
      createCanonicalIdentityAttestation(
        "four_artifact_bundle",
        payload,
        activeKeyId,
        Buffer.alloc(31)
      )
    ).toThrow("CANONICAL_IDENTITY_ATTESTATION_SECRET_INVALID");
  });

  it("strictly validates the three source envelopes and their exact parent commitments", () => {
    const hypothesis = CanonicalValueHypothesisCreationAttestationEnvelopeSchema.parse({
      hypothesis_semantic_commitment: commitment("a"),
      key_id: activeKeyId,
      mac: commitment("b")
    });
    const plan = CanonicalHypothesisEdgeAttestationEnvelopeSchema.parse({
      plan_semantic_commitment: commitment("c"),
      hypothesis_row_id: "00000000-0000-4000-8000-000000000001",
      hypothesis_version: 1,
      hypothesis_semantic_commitment: hypothesis.hypothesis_semantic_commitment,
      hypothesis_creation_attestation_commitment: commitment("d"),
      approved_aggregate_grain: "workflow_function_cohort_window",
      canonical_slice_commitment: commitment("e"),
      key_id: activeKeyId,
      mac: commitment("f")
    });
    const cell = CanonicalMeasurementLineageAttestationEnvelopeSchema.parse({
      measurement_cell_semantic_commitment: commitment("0"),
      plan_row_id: "00000000-0000-4000-8000-000000000002",
      plan_version: 1,
      plan_semantic_commitment: plan.plan_semantic_commitment,
      plan_edge_attestation_commitment: commitment("1"),
      hypothesis_row_id: plan.hypothesis_row_id,
      hypothesis_version: plan.hypothesis_version,
      hypothesis_semantic_commitment: plan.hypothesis_semantic_commitment,
      hypothesis_creation_attestation_commitment: plan.hypothesis_creation_attestation_commitment,
      approved_aggregate_grain: plan.approved_aggregate_grain,
      canonical_metric_definition_commitment_v1: commitment("2"),
      canonical_direction: "DECREASE",
      key_id: activeKeyId,
      mac: commitment("3")
    });

    expect(cell.plan_version).toBe(1);
    expect(
      CanonicalHypothesisEdgeAttestationEnvelopeSchema.safeParse({
        ...plan,
        caller_supplied_authority: true
      }).success
    ).toBe(false);
    expect(
      CanonicalMeasurementLineageAttestationEnvelopeSchema.safeParse({
        ...cell,
        hypothesis_creation_attestation_commitment: undefined
      }).success
    ).toBe(false);
  });

  it("keeps the private four-artifact bundle envelope key-and-MAC only", () => {
    const attestation = CanonicalArtifactCreationAttestationEnvelopeSchema.parse({
      key_id: activeKeyId,
      mac: commitment("a")
    });
    const validation = CanonicalIdentityBindingValidationEnvelopeSchema.parse({
      canonical_artifact_creation_attestation_v1: attestation
    });

    expect(Object.keys(attestation).sort()).toEqual(["key_id", "mac"]);
    expect(validation.canonical_artifact_creation_attestation_v1).toEqual(attestation);
    expect(
      CanonicalIdentityBindingValidationEnvelopeSchema.safeParse({
        ...validation,
        canonical_identity_core_commitment: commitment("b")
      }).success
    ).toBe(false);
  });

  it("verifies strict source-specific envelopes through the service boundary", () => {
    const previousEnvironment = {
      activeKeyId: process.env.SLICE_E_CANONICAL_IDENTITY_ATTESTATION_ACTIVE_WRITE_KEY_ID,
      activeSecret: process.env.SLICE_E_CANONICAL_IDENTITY_ATTESTATION_ACTIVE_WRITE_SECRET,
      retainedKeys: process.env.SLICE_E_CANONICAL_IDENTITY_ATTESTATION_RETAINED_READ_KEYS_JSON
    };
    process.env.SLICE_E_CANONICAL_IDENTITY_ATTESTATION_ACTIVE_WRITE_KEY_ID = activeKeyId;
    process.env.SLICE_E_CANONICAL_IDENTITY_ATTESTATION_ACTIVE_WRITE_SECRET =
      activeSecret.toString("base64url");
    process.env.SLICE_E_CANONICAL_IDENTITY_ATTESTATION_RETAINED_READ_KEYS_JSON = "{}";

    try {
      const attestation = createSliceEAttestation("hypothesis_creation", payload);
      expect(attestation).not.toBeNull();
      const sourceEnvelope = {
        hypothesis_semantic_commitment: commitment("a"),
        ...attestation!
      };

      expect(verifySliceEAttestation("hypothesis_creation", payload, sourceEnvelope)).toBe(true);
      expect(
        verifySliceEAttestation("hypothesis_creation", payload, {
          ...sourceEnvelope,
          caller_supplied_authority: true
        })
      ).toBe(false);
    } finally {
      const restore = (key: string, value: string | undefined) => {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      };
      restore(
        "SLICE_E_CANONICAL_IDENTITY_ATTESTATION_ACTIVE_WRITE_KEY_ID",
        previousEnvironment.activeKeyId
      );
      restore(
        "SLICE_E_CANONICAL_IDENTITY_ATTESTATION_ACTIVE_WRITE_SECRET",
        previousEnvironment.activeSecret
      );
      restore(
        "SLICE_E_CANONICAL_IDENTITY_ATTESTATION_RETAINED_READ_KEYS_JSON",
        previousEnvironment.retainedKeys
      );
    }
  });
});
