import {
  checkOutcomeComparisonAttestationReadiness,
  parseOutcomeComparisonAttestationConfig,
  resolveOutcomeComparisonAttestationSecret
} from "../src/outcome-comparison-attestation-config";
import {
  disconnectOutcomeComparisonRuntimePrisma,
  getOutcomeComparisonRuntimePrisma
} from "../src/outcome-comparison-runtime-client";

const firstSecret = "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE";
const secondSecret = "AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI";

describe("C.1 creation-attestation runtime configuration", () => {
  afterEach(async () => {
    delete process.env.C1_RUNTIME_DATABASE_URL;
    await disconnectOutcomeComparisonRuntimePrisma();
  });

  it("memoizes only the dedicated C.1 runtime client", () => {
    expect(getOutcomeComparisonRuntimePrisma()).toBeNull();
    process.env.C1_RUNTIME_DATABASE_URL =
      "postgresql://fluencytracr_c1_runtime:secret@localhost:5432/fluency";
    const first = getOutcomeComparisonRuntimePrisma();
    expect(first).not.toBeNull();
    expect(getOutcomeComparisonRuntimePrisma()).toBe(first);
  });

  it("accepts a canonical active key and retained key map", () => {
    const parsed = parseOutcomeComparisonAttestationConfig({
      C1_CREATION_ATTESTATION_ACTIVE_KEY_ID: "FT_C1_HMAC_PRIMARY",
      C1_CREATION_ATTESTATION_KEYS_JSON: JSON.stringify({
        FT_C1_HMAC_PRIMARY: firstSecret,
        FT_C1_HMAC_RETIRED: secondSecret
      })
    });

    expect(parsed).toEqual({
      activeKeyId: "FT_C1_HMAC_PRIMARY",
      keys: new Map([
        ["FT_C1_HMAC_PRIMARY", firstSecret],
        ["FT_C1_HMAC_RETIRED", secondSecret]
      ])
    });
    expect(
      resolveOutcomeComparisonAttestationSecret(
        parsed,
        "FT_C1_HMAC_RETIRED"
      )
    ).toBe(secondSecret);
  });

  it.each([
    [
      "missing active key",
      {
        C1_CREATION_ATTESTATION_KEYS_JSON: JSON.stringify({
          FT_C1_HMAC_PRIMARY: firstSecret
        })
      }
    ],
    [
      "malformed key id",
      {
        C1_CREATION_ATTESTATION_ACTIVE_KEY_ID: "primary",
        C1_CREATION_ATTESTATION_KEYS_JSON: JSON.stringify({
          primary: firstSecret
        })
      }
    ],
    [
      "padded secret",
      {
        C1_CREATION_ATTESTATION_ACTIVE_KEY_ID: "FT_C1_HMAC_PRIMARY",
        C1_CREATION_ATTESTATION_KEYS_JSON: JSON.stringify({
          FT_C1_HMAC_PRIMARY: `${firstSecret}=`
        })
      }
    ],
    [
      "short secret",
      {
        C1_CREATION_ATTESTATION_ACTIVE_KEY_ID: "FT_C1_HMAC_PRIMARY",
        C1_CREATION_ATTESTATION_KEYS_JSON: JSON.stringify({
          FT_C1_HMAC_PRIMARY: "AQE"
        })
      }
    ],
    [
      "active key absent from map",
      {
        C1_CREATION_ATTESTATION_ACTIVE_KEY_ID: "FT_C1_HMAC_PRIMARY",
        C1_CREATION_ATTESTATION_KEYS_JSON: JSON.stringify({
          FT_C1_HMAC_RETIRED: secondSecret
        })
      }
    ],
    [
      "array instead of object",
      {
        C1_CREATION_ATTESTATION_ACTIVE_KEY_ID: "FT_C1_HMAC_PRIMARY",
        C1_CREATION_ATTESTATION_KEYS_JSON: JSON.stringify([firstSecret])
      }
    ]
  ])("rejects %s", (_label, env) => {
    expect(parseOutcomeComparisonAttestationConfig(env)).toBeNull();
  });

  it("does not resolve an absent retained secret", () => {
    const parsed = parseOutcomeComparisonAttestationConfig({
      C1_CREATION_ATTESTATION_ACTIVE_KEY_ID: "FT_C1_HMAC_PRIMARY",
      C1_CREATION_ATTESTATION_KEYS_JSON: JSON.stringify({
        FT_C1_HMAC_PRIMARY: firstSecret
      })
    });
    expect(parsed).not.toBeNull();
    expect(
      resolveOutcomeComparisonAttestationSecret(
        parsed,
        "FT_C1_HMAC_RETIRED"
      )
    ).toBeNull();
  });

  it("passes only one bounded key-state query with validated configuration", async () => {
    const client = {
      $queryRaw: jest.fn(async () => [{ ok: true, diagnostics: [] }])
    };
    await expect(
      checkOutcomeComparisonAttestationReadiness(client as never, {
        C1_CREATION_ATTESTATION_ACTIVE_KEY_ID: "FT_C1_HMAC_PRIMARY",
        C1_CREATION_ATTESTATION_KEYS_JSON: JSON.stringify({
          FT_C1_HMAC_PRIMARY: firstSecret,
          FT_C1_HMAC_RETIRED: secondSecret
        })
      })
    ).resolves.toEqual({ ok: true, diagnostics: [] });
    expect(client.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it("fails closed without querying when runtime configuration is invalid", async () => {
    const client = { $queryRaw: jest.fn() };
    await expect(
      checkOutcomeComparisonAttestationReadiness(client as never, {})
    ).resolves.toEqual({
      ok: false,
      diagnostics: ["CONFIG_INVALID"]
    });
    expect(client.$queryRaw).not.toHaveBeenCalled();
  });
});
