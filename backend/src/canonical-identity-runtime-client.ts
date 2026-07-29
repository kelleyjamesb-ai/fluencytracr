import { Prisma, PrismaClient } from "@prisma/client";

let runtimePrisma: PrismaClient | null = null;
let runtimeDatabaseUrl: string | null = null;

export const getCanonicalIdentityRuntimePrisma = (): PrismaClient | null => {
  const configuredUrl = process.env.SLICE_E_RUNTIME_DATABASE_URL;
  if (!configuredUrl) {
    return null;
  }
  if (runtimePrisma) {
    return runtimeDatabaseUrl === configuredUrl ? runtimePrisma : null;
  }
  runtimeDatabaseUrl = configuredUrl;
  runtimePrisma = new PrismaClient({
    datasources: { db: { url: configuredUrl } }
  });
  return runtimePrisma;
};

export const canonicalIdentityRuntimeCredentialIsReady = async (
  client: Pick<Prisma.TransactionClient, "$queryRaw">
): Promise<boolean> => {
  try {
    const rows = await client.$queryRaw<
      Array<{ ok: boolean }>
    >`SELECT (
      session_user = 'fluencytracr_slice_e_runtime'
      AND current_user = 'fluencytracr_slice_e_runtime'
      AND NOT rolsuper
      AND NOT rolbypassrls
      AND NOT rolcreaterole
      AND NOT rolcreatedb
    ) AS ok
    FROM pg_catalog.pg_roles
    WHERE rolname = current_user`;
    return rows.length === 1 && rows[0]?.ok === true;
  } catch {
    return false;
  }
};

export const disconnectCanonicalIdentityRuntimePrisma =
  async (): Promise<void> => {
    if (!runtimePrisma) {
      return;
    }
    await runtimePrisma.$disconnect();
    runtimePrisma = null;
    runtimeDatabaseUrl = null;
  };
