import crypto from "node:crypto";

import { Prisma, PrismaClient } from "@prisma/client";

const KEY_ID = /^FT_C1_HMAC_[A-Z0-9_]{1,48}$/;
const SECRET = /^[A-Za-z0-9_-]{43}$/;
const keyId = process.env.C1_ATTESTATION_PROVISION_KEY_ID;
const secret = process.env.C1_ATTESTATION_PROVISION_SECRET;

if (!process.env.DATABASE_URL || !keyId || !secret) {
  throw new Error(
    "DATABASE_URL, C1_ATTESTATION_PROVISION_KEY_ID, and C1_ATTESTATION_PROVISION_SECRET are required"
  );
}
if (
  !KEY_ID.test(keyId) ||
  !SECRET.test(secret) ||
  Buffer.from(secret, "base64url").length !== 32 ||
  Buffer.from(secret, "base64url").toString("base64url") !== secret
) {
  throw new Error("C.1 attestation provisioning input is not canonical");
}

const secretHash = crypto
  .createHash("sha256")
  .update(secret, "utf8")
  .digest("hex");
const prisma = new PrismaClient();
try {
  await prisma.$transaction(async (transaction) => {
    await transaction.$executeRawUnsafe(
      "SET LOCAL ROLE fluencytracr_c1_attestation_provisioner"
    );
    await transaction.$executeRaw(
      Prisma.sql`SELECT pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('FT_C1_ATTESTATION_PROVISIONING_V1', 0))`
    );
    const existing = await transaction.$queryRaw(
      Prisma.sql`SELECT algorithm, secret_hash
                 FROM public.outcome_comparison_attestation_keys
                 WHERE key_id = ${keyId}`
    );
    if (existing.length === 0) {
      await transaction.$executeRaw(
        Prisma.sql`INSERT INTO public.outcome_comparison_attestation_keys
                   (key_id, algorithm, secret_hash)
                   VALUES (${keyId}, 'HMAC-SHA-256', ${secretHash})`
      );
      return;
    }
    if (
      existing.length !== 1 ||
      existing[0]?.algorithm !== "HMAC-SHA-256" ||
      existing[0]?.secret_hash !== secretHash
    ) {
      throw new Error("C.1 attestation key registry mismatch");
    }
  });
  console.log("C.1 attestation key provisioned or exactly verified.");
} finally {
  await prisma.$disconnect();
}
