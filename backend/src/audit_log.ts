import crypto from "crypto";
import { PrismaClient, Prisma } from "@prisma/client";

// Singleton Prisma client — reused across calls
let _prisma: PrismaClient | null = null;

export const getPrismaClient = (): PrismaClient => {
  if (!_prisma) {
    _prisma = new PrismaClient();
  }
  return _prisma;
};

/** Override the Prisma client (used by tests to inject a test-database client). */
export const setPrismaClient = (client: PrismaClient): void => {
  _prisma = client;
};

// ---------------------------------------------------------------------------
// Canonical serialization — stable recursive stringify
// ---------------------------------------------------------------------------

/**
 * Stable recursive JSON stringify.
 * - Sorts object keys lexicographically at EVERY depth
 * - Preserves array element order
 * - Deterministic handling of null, booleans, numbers, strings
 * - Never relies on JSON.stringify key ordering
 */
export const stableStringify = (value: unknown): string => {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!isFinite(value)) return "null";
    return String(value);
  }
  if (typeof value === "string") {
    // Use JSON.stringify only for string escaping (quotes, backslashes, control chars)
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(stableStringify).join(",") + "]";
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const pairs = Object.keys(obj)
      .sort()
      .filter((k) => obj[k] !== undefined)
      .map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k]));
    return "{" + pairs.join(",") + "}";
  }
  return "null";
};

/**
 * Canonical serialization for hash computation.
 * Fixed field order enforced by explicit array of keys.
 * All depths get sorted keys via stableStringify.
 */
export const canonicalize = (record: {
  seq: number;
  orgId: string;
  actorSub: string;
  actorRole: string;
  eventType: string;
  metadata: unknown;
  createdAt: string;
  prevHash: string;
}): string => {
  // Enforce top-level field order explicitly (not relying on object insertion order)
  const fields: [string, unknown][] = [
    ["seq", record.seq],
    ["orgId", record.orgId],
    ["actorSub", record.actorSub],
    ["actorRole", record.actorRole],
    ["eventType", record.eventType],
    ["metadata", record.metadata],
    ["createdAt", record.createdAt],
    ["prevHash", record.prevHash],
  ];
  return "{" + fields.map(([k, v]) => JSON.stringify(k) + ":" + stableStringify(v)).join(",") + "}";
};

/**
 * Compute SHA-256 hash of a canonical string. Returns hex-encoded digest.
 */
export const sha256 = (input: string): string => {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
};

// ---------------------------------------------------------------------------
// Core audit operations
// ---------------------------------------------------------------------------

const GENESIS = "GENESIS";
const MAX_RETRIES = 3; // 3 retries = 4 total attempts (initial + 3)

/** Exponential backoff with jitter for serialization retries. */
const backoff = (attempt: number): Promise<void> => {
  const baseMs = 10 * Math.pow(2, attempt); // 10, 20, 40ms
  const jitter = Math.random() * baseMs;
  return new Promise((resolve) => setTimeout(resolve, baseMs + jitter));
};

/**
 * Application-level mutex per orgId.
 * Serializes audit writes BEFORE entering the SERIALIZABLE transaction,
 * preventing SSI predicate conflicts from concurrent reads.
 */
const orgLocks = new Map<string, Promise<void>>();

const withOrgLock = async <T>(orgId: string, fn: () => Promise<T>): Promise<T> => {
  // Chain onto existing lock for this org (or start immediately)
  const prev = orgLocks.get(orgId) ?? Promise.resolve();
  let release: () => void;
  const next = new Promise<void>((resolve) => { release = resolve; });
  orgLocks.set(orgId, next);

  await prev; // Wait for prior write to this org to complete
  try {
    return await fn();
  } finally {
    release!();
    // Clean up if this is the tail of the chain
    if (orgLocks.get(orgId) === next) {
      orgLocks.delete(orgId);
    }
  }
};

export type AuditEventInput = {
  orgId: string;
  actorSub: string;
  actorRole: string;
  eventType: string;
  metadata: Record<string, unknown>;
};

export type AuditEventRecord = {
  id: string;
  orgId: string;
  seq: number;
  actorSub: string;
  actorRole: string;
  eventType: string;
  metadata: unknown;
  prevHash: string;
  hash: string;
  createdAt: string;
};

/**
 * Append an immutable audit event with SHA-256 hash chain.
 * Uses SERIALIZABLE isolation with bounded retry (max 3).
 * Fails closed if retries exhausted.
 */
export const logAuditEvent = async (
  params: AuditEventInput
): Promise<AuditEventRecord> => {
  // Application-level mutex serializes writes per org before entering the
  // SERIALIZABLE transaction, preventing SSI predicate conflicts.
  return withOrgLock(params.orgId, () => _logAuditEventInner(params));
};

const _logAuditEventInner = async (
  params: AuditEventInput
): Promise<AuditEventRecord> => {
  const prisma = getPrismaClient();
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await prisma.$transaction(
        async (tx) => {
          // Advisory lock per org — serializes concurrent writes to the same chain
          // Uses a hash of orgId as the lock key (bigint)
          const lockKey = Buffer.from(
            crypto.createHash("md5").update(params.orgId).digest()
          ).readInt32BE(0);
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;

          // Get current chain head for this org
          const head = await tx.auditEvent.findFirst({
            where: { orgId: params.orgId },
            orderBy: { seq: "desc" },
          });

          const seq = head ? head.seq + 1 : 1;
          const prevHash = head ? head.hash : GENESIS;
          const id = `audit-${crypto.randomUUID()}`;
          const createdAt = new Date().toISOString();

          const canonicalStr = canonicalize({
            seq,
            orgId: params.orgId,
            actorSub: params.actorSub,
            actorRole: params.actorRole,
            eventType: params.eventType,
            metadata: params.metadata,
            createdAt,
            prevHash,
          });
          const hash = sha256(canonicalStr);

          const record = await tx.auditEvent.create({
            data: {
              id,
              orgId: params.orgId,
              seq,
              actorSub: params.actorSub,
              actorRole: params.actorRole,
              eventType: params.eventType,
              metadata: params.metadata as Prisma.InputJsonValue,
              prevHash,
              hash,
              createdAt: new Date(createdAt),
            },
          });

          return {
            id: record.id,
            orgId: record.orgId,
            seq: record.seq,
            actorSub: record.actorSub,
            actorRole: record.actorRole,
            eventType: record.eventType,
            metadata: record.metadata,
            prevHash: record.prevHash,
            hash: record.hash,
            createdAt,
          } satisfies AuditEventRecord;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 30000,
          timeout: 30000,
        }
      );

      return Object.freeze(result) as AuditEventRecord;
    } catch (err: unknown) {
      lastError = err;
      // Retry only on serialization failure (Prisma P2034 or unique violation from race)
      const isSerializationError =
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2034";
      const isUniqueViolation =
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002";
      if (isSerializationError || isUniqueViolation) {
        if (attempt < MAX_RETRIES) {
          await backoff(attempt);
        }
        continue;
      }
      throw err;
    }
  }

  throw new Error(
    `logAuditEvent: serialization retries exhausted (${MAX_RETRIES} attempts). Last error: ${lastError}`
  );
};

/**
 * List audit events for an org, ordered by seq ascending.
 * Returns frozen records with chain fields for offline verification.
 */
export const listAuditLogs = async (
  orgId: string
): Promise<AuditEventRecord[]> => {
  const prisma = getPrismaClient();
  const records = await prisma.auditEvent.findMany({
    where: { orgId },
    orderBy: { seq: "asc" },
  });

  return records.map((r) =>
    Object.freeze({
      id: r.id,
      orgId: r.orgId,
      seq: r.seq,
      actorSub: r.actorSub,
      actorRole: r.actorRole,
      eventType: r.eventType,
      metadata: r.metadata,
      prevHash: r.prevHash,
      hash: r.hash,
      createdAt: r.createdAt.toISOString(),
    } satisfies AuditEventRecord)
  );
};

/**
 * Verify the hash chain integrity for an org.
 * Returns { valid, chainLength, brokenAt? }.
 * No secrets required — uses public SHA-256 only.
 */
export const verifyChain = (
  records: AuditEventRecord[]
): { valid: boolean; chainLength: number; brokenAt?: string } => {
  if (records.length === 0) {
    return { valid: true, chainLength: 0 };
  }

  const sorted = [...records].sort((a, b) => a.seq - b.seq);

  for (let i = 0; i < sorted.length; i++) {
    const record = sorted[i];

    // Check prevHash linkage
    if (i === 0) {
      if (record.prevHash !== GENESIS) {
        return { valid: false, chainLength: sorted.length, brokenAt: record.id };
      }
    } else {
      if (record.prevHash !== sorted[i - 1].hash) {
        return { valid: false, chainLength: sorted.length, brokenAt: record.id };
      }
    }

    // Check seq contiguity
    if (record.seq !== i + 1) {
      return { valid: false, chainLength: sorted.length, brokenAt: record.id };
    }

    // Recompute hash
    const canonicalStr = canonicalize({
      seq: record.seq,
      orgId: record.orgId,
      actorSub: record.actorSub,
      actorRole: record.actorRole,
      eventType: record.eventType,
      metadata: record.metadata,
      createdAt: record.createdAt,
      prevHash: record.prevHash,
    });
    const expectedHash = sha256(canonicalStr);
    if (record.hash !== expectedHash) {
      return { valid: false, chainLength: sorted.length, brokenAt: record.id };
    }
  }

  return { valid: true, chainLength: sorted.length };
};

/**
 * Clear all audit events. TEST ONLY.
 * TRUNCATE bypasses row-level triggers (BEFORE DELETE fires per-row, not for TRUNCATE).
 */
export const clearAuditLogsForTest = async (): Promise<void> => {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("clearAuditLogsForTest is only available in test environment");
  }
  const prisma = getPrismaClient();
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "AuditEvent" RESTART IDENTITY');
};
