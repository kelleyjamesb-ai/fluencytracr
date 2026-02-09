import { PrismaClient } from "@prisma/client";

let _prisma: PrismaClient | null = null;

export const getPrisma = (): PrismaClient => {
  if (!_prisma) {
    _prisma = new PrismaClient();
  }
  return _prisma;
};
