import type { PrismaClient } from "@prisma/client";

import {
  canonicalIdentityRuntimeCredentialIsReady,
  canonicalIdentityRuntimeTargetsPrimaryDatabase
} from "../src/canonical-identity-runtime-client";

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

  it("binds both the authenticated session and effective role", async () => {
    let sql = "";
    const client = {
      $queryRaw: async (strings: TemplateStringsArray) => {
        sql = strings.join("");
        return [{ ok: true }];
      }
    } as unknown as PrismaClient;
    await expect(canonicalIdentityRuntimeCredentialIsReady(client)).resolves.toBe(true);
    expect(sql).toContain("session_user = 'fluencytracr_slice_e_runtime'");
    expect(sql).toContain("current_user = 'fluencytracr_slice_e_runtime'");
  });

  it("accepts only the same PostgreSQL cluster and database as the primary client", async () => {
    const databaseClient = (serverStartedAt: string, databaseOid: string) =>
      ({
        $queryRaw: async () => [
          {
            server_address: "127.0.0.1",
            server_port: "5432",
            server_started_at: serverStartedAt,
            database_name: "fluency",
            database_oid: databaseOid
          }
        ]
      }) as unknown as PrismaClient;

    await expect(
      canonicalIdentityRuntimeTargetsPrimaryDatabase(
        databaseClient("2026-07-29 12:00:00+00", "16384"),
        databaseClient("2026-07-29 12:00:00+00", "16384")
      )
    ).resolves.toBe(true);
    await expect(
      canonicalIdentityRuntimeTargetsPrimaryDatabase(
        databaseClient("2026-07-29 12:00:00+00", "16384"),
        databaseClient("2026-07-29 12:00:00+00", "16385")
      )
    ).resolves.toBe(false);
    await expect(
      canonicalIdentityRuntimeTargetsPrimaryDatabase(
        databaseClient("2026-07-29 12:00:00+00", "16384"),
        databaseClient("2026-07-29 12:00:01+00", "16384")
      )
    ).resolves.toBe(false);
  });

  it("fails closed when either database identity cannot be proved", async () => {
    const readyClient = {
      $queryRaw: async () => [
        {
          server_address: "127.0.0.1",
          server_port: "5432",
          server_started_at: "2026-07-29 12:00:00+00",
          database_name: "fluency",
          database_oid: "16384"
        }
      ]
    } as unknown as PrismaClient;
    const failingClient = {
      $queryRaw: async () => {
        throw new Error("identity probe unavailable");
      }
    } as unknown as PrismaClient;

    await expect(
      canonicalIdentityRuntimeTargetsPrimaryDatabase(readyClient, failingClient)
    ).resolves.toBe(false);
    await expect(
      canonicalIdentityRuntimeTargetsPrimaryDatabase(failingClient, readyClient)
    ).resolves.toBe(false);
  });
});
