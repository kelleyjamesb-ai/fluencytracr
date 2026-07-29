import {
  canonicalIdentityAttestationWriteKey,
  parseCanonicalIdentityAttestationConfig,
  resolveCanonicalIdentityAttestationReadKey
} from "../src/canonical-identity-attestation-config";

const activeSecret = Buffer.alloc(32, 1).toString("base64url");
const retainedSecret = Buffer.alloc(32, 2).toString("base64url");

const validEnv = () => ({
  SLICE_E_CANONICAL_IDENTITY_ATTESTATION_ACTIVE_WRITE_KEY_ID: "FT_E_HMAC_PRIMARY",
  SLICE_E_CANONICAL_IDENTITY_ATTESTATION_ACTIVE_WRITE_SECRET: activeSecret,
  SLICE_E_CANONICAL_IDENTITY_ATTESTATION_RETAINED_READ_KEYS_JSON: JSON.stringify({
    FT_E_HMAC_RETIRED: retainedSecret
  })
});

describe("Slice E canonical identity attestation configuration", () => {
  it("loads one active write key and explicit retained read keys", () => {
    const config = parseCanonicalIdentityAttestationConfig(validEnv());
    expect(config).not.toBeNull();
    expect(canonicalIdentityAttestationWriteKey(config)).toEqual({
      keyId: "FT_E_HMAC_PRIMARY",
      secret: Buffer.from(activeSecret, "base64url")
    });
    expect(resolveCanonicalIdentityAttestationReadKey(config, "FT_E_HMAC_PRIMARY")).toEqual(
      Buffer.from(activeSecret, "base64url")
    );
    expect(resolveCanonicalIdentityAttestationReadKey(config, "FT_E_HMAC_RETIRED")).toEqual(
      Buffer.from(retainedSecret, "base64url")
    );
  });

  it("accepts an explicit empty retained-read map", () => {
    const config = parseCanonicalIdentityAttestationConfig({
      ...validEnv(),
      SLICE_E_CANONICAL_IDENTITY_ATTESTATION_RETAINED_READ_KEYS_JSON: "{}"
    });
    expect(config).not.toBeNull();
    expect(resolveCanonicalIdentityAttestationReadKey(config, "FT_E_HMAC_RETIRED")).toBeNull();
  });

  it("does not read or accept C.1 configuration", () => {
    expect(
      parseCanonicalIdentityAttestationConfig({
        C1_CREATION_ATTESTATION_ACTIVE_KEY_ID: "FT_C1_HMAC_PRIMARY",
        C1_CREATION_ATTESTATION_KEYS_JSON: JSON.stringify({
          FT_C1_HMAC_PRIMARY: activeSecret
        })
      })
    ).toBeNull();
    expect(
      parseCanonicalIdentityAttestationConfig({
        ...validEnv(),
        SLICE_E_CANONICAL_IDENTITY_ATTESTATION_ACTIVE_WRITE_KEY_ID: "FT_C1_HMAC_PRIMARY"
      })
    ).toBeNull();
  });

  it.each([
    ["missing configuration", {}],
    [
      "missing explicit retained map",
      {
        ...validEnv(),
        SLICE_E_CANONICAL_IDENTITY_ATTESTATION_RETAINED_READ_KEYS_JSON: undefined
      }
    ],
    [
      "short active secret",
      {
        ...validEnv(),
        SLICE_E_CANONICAL_IDENTITY_ATTESTATION_ACTIVE_WRITE_SECRET:
          Buffer.alloc(31).toString("base64url")
      }
    ],
    [
      "padded retained secret",
      {
        ...validEnv(),
        SLICE_E_CANONICAL_IDENTITY_ATTESTATION_RETAINED_READ_KEYS_JSON: JSON.stringify({
          FT_E_HMAC_RETIRED: `${retainedSecret}=`
        })
      }
    ],
    [
      "active key repeated as retained",
      {
        ...validEnv(),
        SLICE_E_CANONICAL_IDENTITY_ATTESTATION_RETAINED_READ_KEYS_JSON: JSON.stringify({
          FT_E_HMAC_PRIMARY: retainedSecret
        })
      }
    ],
    [
      "secret reused under another key ID",
      {
        ...validEnv(),
        SLICE_E_CANONICAL_IDENTITY_ATTESTATION_RETAINED_READ_KEYS_JSON: JSON.stringify({
          FT_E_HMAC_RETIRED: activeSecret
        })
      }
    ],
    [
      "retained array",
      {
        ...validEnv(),
        SLICE_E_CANONICAL_IDENTITY_ATTESTATION_RETAINED_READ_KEYS_JSON: JSON.stringify([
          retainedSecret
        ])
      }
    ]
  ])("rejects %s", (_label, env) => {
    expect(parseCanonicalIdentityAttestationConfig(env)).toBeNull();
  });

  it("returns no write or read key from invalid configuration", () => {
    expect(canonicalIdentityAttestationWriteKey(null)).toBeNull();
    expect(resolveCanonicalIdentityAttestationReadKey(null, "FT_E_HMAC_PRIMARY")).toBeNull();
  });
});
