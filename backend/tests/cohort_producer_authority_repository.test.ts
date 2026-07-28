import crypto from "node:crypto";

import {
  registerCohortProducerAuthority,
  revokeCohortProducerAuthority
} from "../src/repositories/cohort-producer-authority.repository";

const inputFor = (publicKeyDerBase64: string) => ({
  org_id: "org_alpha",
  producer_key_id: "producer_primary",
  authority_version: 1,
  public_key_der_base64: publicKeyDerBase64,
  valid_from: "2026-05-01T00:00:00.000Z",
  expires_at: "2026-05-03T00:00:00.000Z"
});

describe("C.0 cohort producer authority repository", () => {
  it("registers only canonical Ed25519 SPKI material", async () => {
    const { publicKey } = crypto.generateKeyPairSync("ed25519");
    const der = publicKey.export({ format: "der", type: "spki" });
    if (!Buffer.isBuffer(der)) throw new Error("test key export failed");
    const create = jest.fn(async ({ data }: any) => ({
      id: "authority-id",
      ...data
    }));
    const transaction = {
      $queryRaw: jest.fn(async () => []),
      cohortProducerAuthority: {
        findMany: jest.fn(async () => []),
        create
      }
    };
    const client = {
      $transaction: jest.fn(
        async (operation: (tx: any) => Promise<unknown>) =>
          operation(transaction)
      )
    };

    const result = await registerCohortProducerAuthority(
      inputFor(der.toString("base64")),
      client as never
    );

    expect(result).toEqual({
      authority_id: "authority-id",
      public_key_fingerprint: expect.stringMatching(/^[0-9a-f]{64}$/)
    });
    expect(create).toHaveBeenCalledTimes(1);

    await expect(
      registerCohortProducerAuthority(
        inputFor(Buffer.from("not-der").toString("base64")),
        client as never
      )
    ).resolves.toBeNull();
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("rejects non-Ed25519 authority material and invalid epochs", async () => {
    const { publicKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048
    });
    const der = publicKey.export({ format: "der", type: "spki" });
    if (!Buffer.isBuffer(der)) throw new Error("test key export failed");
    const create = jest.fn();
    const client = {
      $transaction: jest.fn(),
      cohortProducerAuthority: { create }
    };

    await expect(
      registerCohortProducerAuthority(
        inputFor(der.toString("base64")),
        client as never
      )
    ).resolves.toBeNull();
    await expect(
      registerCohortProducerAuthority(
        {
          ...inputFor(der.toString("base64")),
          authority_version: 0
        },
        client as never
      )
    ).resolves.toBeNull();
    expect(create).not.toHaveBeenCalled();
  });

  it("locks the exact epoch and uses database time for revocation", async () => {
    const revokedAt = new Date("2026-05-02T01:05:00.000Z");
    const create = jest.fn(async () => ({ id: "revocation-id" }));
    let query = 0;
    const transaction = {
      $queryRaw: jest.fn(async () => {
        query += 1;
        if (query === 1) return [];
        return query === 2
          ? [{ id: "authority-id" }]
          : [{ revoked_at: revokedAt }];
      }),
      cohortProducerAuthorityRevocation: { create }
    };
    const client = {
      $transaction: jest.fn(async (operation: (tx: any) => Promise<boolean>) =>
        operation(transaction)
      )
    };

    await expect(
      revokeCohortProducerAuthority(
        {
          org_id: "org_alpha",
          producer_key_id: "producer_primary",
          authority_version: 1,
          reason_code: "KEY_ROTATED"
        },
        client as never
      )
    ).resolves.toBe(true);
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        authorityId: "authority-id",
        revokedAt,
        reasonCode: "KEY_ROTATED"
      })
    });
    expect(client.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: "Serializable" }
    );
  });

  it("rejects overlapping or non-monotonic authority epochs", async () => {
    const { publicKey } = crypto.generateKeyPairSync("ed25519");
    const der = publicKey.export({ format: "der", type: "spki" });
    if (!Buffer.isBuffer(der)) throw new Error("test key export failed");
    const create = jest.fn();
    const transaction = {
      $queryRaw: jest.fn(async () => []),
      cohortProducerAuthority: {
        findMany: jest.fn(async () => [{
          authorityVersion: 1,
          validFrom: new Date("2026-05-01T00:00:00.000Z"),
          expiresAt: new Date("2026-05-03T00:00:00.000Z")
        }]),
        create
      }
    };
    const client = {
      $transaction: jest.fn(
        async (operation: (tx: any) => Promise<unknown>) =>
          operation(transaction)
      )
    };

    await expect(
      registerCohortProducerAuthority(
        {
          ...inputFor(der.toString("base64")),
          authority_version: 2,
          valid_from: "2026-05-02T00:00:00.000Z",
          expires_at: "2026-05-04T00:00:00.000Z"
        },
        client as never
      )
    ).resolves.toBeNull();
    await expect(
      registerCohortProducerAuthority(
        {
          ...inputFor(der.toString("base64")),
          authority_version: 1,
          valid_from: "2026-05-03T00:00:00.000Z",
          expires_at: "2026-05-04T00:00:00.000Z"
        },
        client as never
      )
    ).resolves.toBeNull();
    expect(create).not.toHaveBeenCalled();
  });

  it("fails closed for invalid reasons and missing authority epochs", async () => {
    const client = {
      $transaction: jest.fn(async (operation: (tx: any) => Promise<boolean>) =>
        operation({
          $queryRaw: jest
            .fn()
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([]),
          cohortProducerAuthorityRevocation: { create: jest.fn() }
        })
      )
    };

    await expect(
      revokeCohortProducerAuthority(
        {
          org_id: "org_alpha",
          producer_key_id: "producer_primary",
          authority_version: 1,
          reason_code: "not allowed"
        },
        client as never
      )
    ).resolves.toBe(false);
    expect(client.$transaction).not.toHaveBeenCalled();

    await expect(
      revokeCohortProducerAuthority(
        {
          org_id: "org_alpha",
          producer_key_id: "producer_primary",
          authority_version: 1,
          reason_code: "KEY_ROTATED"
        },
        client as never
      )
    ).resolves.toBe(false);
  });
});
