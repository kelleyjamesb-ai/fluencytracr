import { PrismaClient } from "@prisma/client";
import { disconnectCanonicalIdentityRuntimePrisma } from "./canonical-identity-runtime-client";
import { disconnectOutcomeComparisonRuntimePrisma } from "./outcome-comparison-runtime-client";

let prisma: PrismaClient | null = null;

export const getPrisma = () => {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
};

export const disconnectPrisma = async () => {
  await disconnectCanonicalIdentityRuntimePrisma();
  await disconnectOutcomeComparisonRuntimePrisma();
  if (!prisma) {
    return;
  }
  await prisma.$disconnect();
  prisma = null;
};
