import crypto from "node:crypto";

import {
  COHORT_PRODUCER_POLICY_VERSION,
  COHORT_PROOF_POLICY_VERSION,
  cohortPublicKeyFingerprintBytes
} from "@fluencytracr/shared";
import { Prisma, type PrismaClient } from "@prisma/client";

import { getPrisma } from "../db";

export interface RegisterCohortProducerAuthorityInput {
  org_id: string;
  producer_key_id: string;
  authority_version: number;
  public_key_der_base64: string;
  valid_from: string;
  expires_at: string;
}

const canonicalEd25519Der = (encoded: string): Buffer | null => {
  try {
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) {
      return null;
    }
    const der = Buffer.from(encoded, "base64");
    if (der.toString("base64") !== encoded) return null;
    const key = crypto.createPublicKey({ key: der, format: "der", type: "spki" });
    if (key.asymmetricKeyType !== "ed25519") return null;
    const canonical = key.export({ format: "der", type: "spki" });
    return Buffer.isBuffer(canonical) &&
      canonical.byteLength === der.byteLength &&
      crypto.timingSafeEqual(canonical, der)
      ? der
      : null;
  } catch {
    return null;
  }
};

const authorityLockKey = (orgId: string, producerKeyId: string): string =>
  JSON.stringify([
    "FT_COHORT_PRODUCER_AUTHORITY_LOCK_V1",
    orgId,
    producerKeyId
  ]);

export const acquireCohortProducerAuthorityLock = async (
  client: Prisma.TransactionClient,
  orgId: string,
  producerKeyId: string
): Promise<void> => {
  await client.$executeRaw(
    Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${authorityLockKey(
      orgId,
      producerKeyId
    )}, 0))`
  );
};

export const registerCohortProducerAuthority = async (
  input: RegisterCohortProducerAuthorityInput,
  client?: PrismaClient
): Promise<{ authority_id: string; public_key_fingerprint: string } | null> => {
  if (!client && !process.env.DATABASE_URL) return null;
  const der = canonicalEd25519Der(input.public_key_der_base64);
  const validFrom = Date.parse(input.valid_from);
  const expiresAt = Date.parse(input.expires_at);
  if (
    !der ||
    !Number.isInteger(input.authority_version) ||
    input.authority_version < 1 ||
    !Number.isFinite(validFrom) ||
    !Number.isFinite(expiresAt) ||
    expiresAt <= validFrom
  ) {
    return null;
  }
  const fingerprint = crypto
    .createHash("sha256")
    .update(cohortPublicKeyFingerprintBytes(der))
    .digest("hex");
  try {
    const row = await (client ?? getPrisma()).$transaction(
      async (transaction) => {
        await acquireCohortProducerAuthorityLock(
          transaction,
          input.org_id,
          input.producer_key_id
        );
        const existing = await transaction.cohortProducerAuthority.findMany({
          where: {
            orgId: input.org_id,
            producerKeyId: input.producer_key_id
          },
          orderBy: { authorityVersion: "desc" }
        });
        if (
          existing.some(
            (authority) =>
              authority.authorityVersion >= input.authority_version ||
              (authority.validFrom.getTime() < expiresAt &&
                validFrom < authority.expiresAt.getTime())
          )
        ) {
          throw new Error("COHORT_AUTHORITY_EPOCH_CONFLICT");
        }
        return transaction.cohortProducerAuthority.create({
          data: {
            orgId: input.org_id,
            producerKeyId: input.producer_key_id,
            authorityVersion: input.authority_version,
            proofPolicyVersion: COHORT_PROOF_POLICY_VERSION,
            producerPolicyVersion: COHORT_PRODUCER_POLICY_VERSION,
            publicKeyDerBase64: der.toString("base64"),
            publicKeyFingerprint: fingerprint,
            validFrom: new Date(validFrom),
            expiresAt: new Date(expiresAt)
          }
        });
      },
      { isolationLevel: "ReadCommitted" }
    );
    return { authority_id: row.id, public_key_fingerprint: fingerprint };
  } catch {
    return null;
  }
};

export const revokeCohortProducerAuthority = async (
  input: {
    org_id: string;
    producer_key_id: string;
    authority_version: number;
    reason_code: string;
  },
  client?: PrismaClient
): Promise<boolean> => {
  if (
    (!client && !process.env.DATABASE_URL) ||
    !/^[A-Z][A-Z0-9_]{0,63}$/.test(input.reason_code)
  ) {
    return false;
  }
  try {
    return await (client ?? getPrisma()).$transaction(
      async (transaction) => {
        await acquireCohortProducerAuthorityLock(
          transaction,
          input.org_id,
          input.producer_key_id
        );
        const locked = await transaction.$queryRaw<Array<{ id: string }>>(
          Prisma.sql`SELECT "id" FROM "cohort_producer_authorities"
            WHERE "org_id" = ${input.org_id}
              AND "producer_key_id" = ${input.producer_key_id}
              AND "authority_version" = ${input.authority_version}
            FOR UPDATE`
        );
        if (locked.length !== 1) return false;
        const time = await transaction.$queryRaw<Array<{ revoked_at: Date }>>(
          Prisma.sql`SELECT clock_timestamp() AS revoked_at`
        );
        if (!(time[0]?.revoked_at instanceof Date)) return false;
        await transaction.cohortProducerAuthorityRevocation.create({
          data: {
            authorityId: locked[0].id,
            orgId: input.org_id,
            producerKeyId: input.producer_key_id,
            authorityVersion: input.authority_version,
            revokedAt: time[0].revoked_at,
            reasonCode: input.reason_code
          }
        });
        return true;
      },
      { isolationLevel: "ReadCommitted" }
    );
  } catch {
    return false;
  }
};
