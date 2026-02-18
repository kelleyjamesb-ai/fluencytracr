import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient | null = null;

export const getPrisma = () => {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
};

export const disconnectPrisma = async () => {
  if (!prisma) {
    return;
  }
  await prisma.$disconnect();
  prisma = null;
};
