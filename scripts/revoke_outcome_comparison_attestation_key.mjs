import { Prisma, PrismaClient } from "@prisma/client";

const KEY_ID = /^FT_C1_HMAC_[A-Z0-9_]{1,48}$/;
const REASON = /^[A-Z][A-Z0-9_]{0,63}$/;
const keyId = process.env.C1_ATTESTATION_REVOKE_KEY_ID;
const reasonCode = process.env.C1_ATTESTATION_REVOKE_REASON_CODE;
if (
  !process.env.DATABASE_URL ||
  !keyId ||
  !reasonCode ||
  !KEY_ID.test(keyId) ||
  !REASON.test(reasonCode)
) {
  throw new Error(
    "DATABASE_URL and canonical C1 attestation revocation inputs are required"
  );
}

const prisma = new PrismaClient();
try {
  await prisma.$transaction(async (transaction) => {
    await transaction.$executeRawUnsafe(
      "SET LOCAL ROLE fluencytracr_c1_attestation_provisioner"
    );
    await transaction.$executeRaw(
      Prisma.sql`SELECT pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('FT_C1_ATTESTATION_PROVISIONING_V1', 0))`
    );
    const keyRows = await transaction.$queryRaw(
      Prisma.sql`SELECT key_id
                 FROM public.outcome_comparison_attestation_keys
                 WHERE key_id = ${keyId}`
    );
    if (keyRows.length !== 1) {
      throw new Error("C.1 revocation requires a registered key");
    }
    const existing = await transaction.$queryRaw(
      Prisma.sql`SELECT reason_code
                 FROM public.outcome_comparison_attestation_key_revocations
                 WHERE key_id = ${keyId}`
    );
    if (existing.length === 0) {
      await transaction.$executeRaw(
        Prisma.sql`INSERT INTO public.outcome_comparison_attestation_key_revocations
                   (key_id, reason_code) VALUES (${keyId}, ${reasonCode})`
      );
      return;
    }
    if (existing.length !== 1 || existing[0]?.reason_code !== reasonCode) {
      throw new Error("C.1 attestation revocation mismatch");
    }
  });
  console.log("C.1 attestation key revoked or exactly verified.");
} finally {
  await prisma.$disconnect();
}
