import { Prisma, PrismaClient } from "@prisma/client";

const KEY_ID = /^FT_C1_HMAC_[A-Z0-9_]{1,48}$/;
const keyId = process.env.C1_ATTESTATION_ACTIVATE_KEY_ID;
if (!process.env.DATABASE_URL || !keyId || !KEY_ID.test(keyId)) {
  throw new Error(
    "DATABASE_URL and canonical C1_ATTESTATION_ACTIVATE_KEY_ID are required"
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
    const keyState = await transaction.$queryRaw(
      Prisma.sql`SELECT key_row.key_id,
                        revocation.key_id IS NOT NULL AS revoked
                 FROM public.outcome_comparison_attestation_keys AS key_row
                 LEFT JOIN public.outcome_comparison_attestation_key_revocations AS revocation
                   ON revocation.key_id = key_row.key_id
                 WHERE key_row.key_id = ${keyId}`
    );
    if (keyState.length !== 1 || keyState[0]?.revoked) {
      throw new Error("C.1 activation requires a registered non-revoked key");
    }
    const latest = await transaction.$queryRaw(
      Prisma.sql`SELECT key_id
                 FROM public.outcome_comparison_attestation_key_activations
                 ORDER BY activation_epoch DESC
                 LIMIT 1`
    );
    if (latest[0]?.key_id !== keyId) {
      await transaction.$executeRaw(
        Prisma.sql`INSERT INTO public.outcome_comparison_attestation_key_activations
                   (key_id) VALUES (${keyId})`
      );
    }
  });
  console.log("C.1 attestation key activated or already active.");
} finally {
  await prisma.$disconnect();
}
