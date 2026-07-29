import { PrismaClient } from "@prisma/client";

let runtimePrisma: PrismaClient | null = null;
let runtimeDatabaseUrl: string | null = null;

export const getOutcomeComparisonRuntimePrisma = (): PrismaClient | null => {
  const configuredUrl = process.env.C1_RUNTIME_DATABASE_URL;
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

export const disconnectOutcomeComparisonRuntimePrisma =
  async (): Promise<void> => {
    if (!runtimePrisma) {
      return;
    }
    await runtimePrisma.$disconnect();
    runtimePrisma = null;
    runtimeDatabaseUrl = null;
  };
