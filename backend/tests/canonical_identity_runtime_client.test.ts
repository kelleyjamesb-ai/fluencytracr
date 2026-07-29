import type { PrismaClient } from "@prisma/client";

import { canonicalIdentityRuntimeCredentialIsReady } from "../src/canonical-identity-runtime-client";

const clientReturning = (rows: Array<{ ok: boolean }>) =>
  ({
    $queryRaw: async () => rows
  }) as unknown as PrismaClient;

describe("Slice E runtime credential readiness", () => {
  it("accepts only the exact ready role result", async () => {
    await expect(
      canonicalIdentityRuntimeCredentialIsReady(clientReturning([{ ok: true }]))
    ).resolves.toBe(true);
    await expect(
      canonicalIdentityRuntimeCredentialIsReady(clientReturning([{ ok: false }]))
    ).resolves.toBe(false);
    await expect(
      canonicalIdentityRuntimeCredentialIsReady(clientReturning([]))
    ).resolves.toBe(false);
  });

  it("fails closed when the credential probe cannot run", async () => {
    const client = {
      $queryRaw: async () => {
        throw new Error("credential probe unavailable");
      }
    } as unknown as PrismaClient;
    await expect(canonicalIdentityRuntimeCredentialIsReady(client)).resolves.toBe(false);
  });
});
