import {
  canonicalIdentitySourceSemanticCommitment,
  type CanonicalIdentitySourceRow
} from "../src/repositories/canonical-identity-source.repository";

const source = (): Omit<CanonicalIdentitySourceRow, "semanticCommitment"> => ({
  sourceKind: "VALUE_HYPOTHESIS",
  rowId: "00000000-0000-4000-8000-000000000001",
  orgId: "org-northstar",
  stableId: "hypothesis-support-resolution",
  version: 1,
  predecessorRowId: null,
  payload: { statement: "Aggregate resolution time may move." },
  validation: {
    valid: true,
    canonical_value_hypothesis_creation_attestation_v1: {
      key_id: "FT_E_HMAC_PRIMARY",
      mac: "a".repeat(64),
      hypothesis_semantic_commitment: "b".repeat(64)
    }
  },
  authority: { status: "approved" }
});

describe("canonical identity source semantic authority", () => {
  it("excludes only the source's own non-circular attestation envelope", () => {
    const first = source();
    const changedMac = source();
    (
      changedMac.validation.canonical_value_hypothesis_creation_attestation_v1 as Record<
        string,
        unknown
      >
    ).mac = "c".repeat(64);
    const changedValidation = source();
    changedValidation.validation.valid = false;

    expect(canonicalIdentitySourceSemanticCommitment(changedMac)).toBe(
      canonicalIdentitySourceSemanticCommitment(first)
    );
    expect(canonicalIdentitySourceSemanticCommitment(changedValidation)).not.toBe(
      canonicalIdentitySourceSemanticCommitment(first)
    );
  });

  it("binds the physical row key and exact predecessor", () => {
    const first = source();
    const reinserted = {
      ...source(),
      rowId: "00000000-0000-4000-8000-000000000002"
    };
    const child = {
      ...source(),
      version: 2,
      predecessorRowId: first.rowId
    };

    expect(canonicalIdentitySourceSemanticCommitment(reinserted)).not.toBe(
      canonicalIdentitySourceSemanticCommitment(first)
    );
    expect(canonicalIdentitySourceSemanticCommitment(child)).not.toBe(
      canonicalIdentitySourceSemanticCommitment(first)
    );
  });
});
