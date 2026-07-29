import { Prisma, PrismaClient } from "@prisma/client";

let runtimePrisma: PrismaClient | null = null;
let runtimeDatabaseUrl: string | null = null;

interface CanonicalIdentityDatabaseIdentity {
  serverAddress: string;
  serverPort: string;
  serverStartedAt: string;
  databaseName: string;
  databaseOid: string;
}

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

const loadCanonicalIdentityDatabaseIdentity = async (
  client: Pick<Prisma.TransactionClient, "$queryRaw">
): Promise<CanonicalIdentityDatabaseIdentity | null> => {
  try {
    const rows = await client.$queryRaw<
      Array<{
        server_address: string | null;
        server_port: string | number | null;
        server_started_at: string | Date;
        database_name: string;
        database_oid: string | number;
      }>
    >`SELECT
      pg_catalog.inet_server_addr()::text AS server_address,
      pg_catalog.inet_server_port()::text AS server_port,
      pg_catalog.pg_postmaster_start_time()::text AS server_started_at,
      pg_catalog.current_database() AS database_name,
      database_row.oid::text AS database_oid
    FROM pg_catalog.pg_database AS database_row
    WHERE database_row.datname = pg_catalog.current_database()`;
    const row = rows[0];
    if (
      rows.length !== 1 ||
      !row ||
      typeof row.server_address !== "string" ||
      row.server_address.length === 0 ||
      (typeof row.server_port !== "string" &&
        typeof row.server_port !== "number") ||
      (typeof row.server_started_at !== "string" &&
        !(row.server_started_at instanceof Date)) ||
      typeof row.database_name !== "string" ||
      row.database_name.length === 0 ||
      (typeof row.database_oid !== "string" &&
        typeof row.database_oid !== "number")
    ) {
      return null;
    }
    return {
      serverAddress: row.server_address,
      serverPort: String(row.server_port),
      serverStartedAt:
        row.server_started_at instanceof Date
          ? row.server_started_at.toISOString()
          : row.server_started_at,
      databaseName: row.database_name,
      databaseOid: String(row.database_oid)
    };
  } catch {
    return null;
  }
};

export const canonicalIdentityRuntimeTargetsPrimaryDatabase = async (
  primaryClient: Pick<Prisma.TransactionClient, "$queryRaw">,
  runtimeClient: Pick<Prisma.TransactionClient, "$queryRaw">
): Promise<boolean> => {
  const [primaryIdentity, runtimeIdentity] = await Promise.all([
    loadCanonicalIdentityDatabaseIdentity(primaryClient),
    loadCanonicalIdentityDatabaseIdentity(runtimeClient)
  ]);
  return (
    primaryIdentity !== null &&
    runtimeIdentity !== null &&
    primaryIdentity.serverAddress === runtimeIdentity.serverAddress &&
    primaryIdentity.serverPort === runtimeIdentity.serverPort &&
    primaryIdentity.serverStartedAt === runtimeIdentity.serverStartedAt &&
    primaryIdentity.databaseName === runtimeIdentity.databaseName &&
    primaryIdentity.databaseOid === runtimeIdentity.databaseOid
  );
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
