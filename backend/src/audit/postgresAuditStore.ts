import { Pool } from "pg";
import type { AuditStore, AuditLogEntry, ChainVerificationResult } from "./types";
import { GENESIS_HASH, canonicalize, computeEntryHash } from "./hashChain";
import { AuditMetadataSchema } from "./auditMetadataSchema";

/**
 * PostgreSQL append-only audit store.
 *
 * Connects as the audit_writer role which has INSERT + SELECT only.
 * No UPDATE, DELETE, or TRUNCATE SQL is ever constructed.
 * Advisory lock per org prevents concurrent chain forks.
 */
export class PostgresAuditStore implements AuditStore {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async append(
    entry: Omit<AuditLogEntry, "entry_hash" | "previous_entry_hash" | "created_at">
  ): Promise<AuditLogEntry> {
    const metaResult = AuditMetadataSchema.safeParse(entry.metadata);
    if (!metaResult.success) {
      throw new Error(`Audit metadata rejected: ${metaResult.error.message}`);
    }

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Advisory lock per org — prevents concurrent chain forks.
      // hashToInt64: use first 8 bytes of SHA-256 of org_id as a bigint lock key.
      const lockKey = hashToInt64(entry.org_id);
      await client.query("SELECT pg_advisory_xact_lock($1)", [lockKey]);

      // Get latest hash with deterministic ordering (created_at DESC, id DESC).
      const latest = await client.query(
        "SELECT entry_hash FROM audit_log WHERE org_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1",
        [entry.org_id]
      );
      const previousHash: string = latest.rows[0]?.entry_hash ?? GENESIS_HASH;

      // Compute hash chain entry.
      const canonical = canonicalize({
        id: entry.id,
        org_id: entry.org_id,
        action: entry.action,
        actor_sub: entry.actor_sub,
        actor_role: entry.actor_role,
        metadata: entry.metadata,
      });
      const entryHash = computeEntryHash(previousHash, canonical);

      // INSERT — the only write operation audit_writer can perform.
      const result = await client.query(
        `INSERT INTO audit_log (id, org_id, action, actor_sub, actor_role, metadata, entry_hash, previous_entry_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [entry.id, entry.org_id, entry.action, entry.actor_sub, entry.actor_role,
         JSON.stringify(entry.metadata), entryHash, previousHash]
      );

      await client.query("COMMIT");

      const row = result.rows[0];
      return {
        id: row.id,
        org_id: row.org_id,
        action: row.action,
        actor_sub: row.actor_sub,
        actor_role: row.actor_role,
        metadata: typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata,
        entry_hash: row.entry_hash,
        previous_entry_hash: row.previous_entry_hash,
        created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      };
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  async list(orgId: string): Promise<AuditLogEntry[]> {
    const result = await this.pool.query(
      "SELECT * FROM audit_log WHERE org_id = $1 ORDER BY created_at ASC, id ASC",
      [orgId]
    );
    return result.rows.map(rowToEntry);
  }

  async verifyChain(orgId: string): Promise<ChainVerificationResult> {
    const entries = await this.list(orgId);
    if (entries.length === 0) {
      return { valid: true, entries_checked: 0 };
    }

    let expectedPreviousHash = GENESIS_HASH;
    for (const entry of entries) {
      if (entry.previous_entry_hash !== expectedPreviousHash) {
        return { valid: false, broken_at_id: entry.id, entries_checked: entries.length };
      }

      const canonical = canonicalize({
        id: entry.id,
        org_id: entry.org_id,
        action: entry.action,
        actor_sub: entry.actor_sub,
        actor_role: entry.actor_role,
        metadata: entry.metadata,
      });
      const recomputed = computeEntryHash(expectedPreviousHash, canonical);
      if (recomputed !== entry.entry_hash) {
        return { valid: false, broken_at_id: entry.id, entries_checked: entries.length };
      }

      expectedPreviousHash = entry.entry_hash;
    }

    return { valid: true, entries_checked: entries.length };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

function rowToEntry(row: any): AuditLogEntry {
  return {
    id: row.id,
    org_id: row.org_id,
    action: row.action,
    actor_sub: row.actor_sub,
    actor_role: row.actor_role,
    metadata: typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata,
    entry_hash: row.entry_hash,
    previous_entry_hash: row.previous_entry_hash,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

/**
 * Convert org_id to a bigint lock key for pg_advisory_xact_lock.
 * Uses first 7 bytes of SHA-256 to stay within JS safe integer range.
 */
function hashToInt64(value: string): string {
  const crypto = require("crypto");
  const hex = crypto.createHash("sha256").update(value).digest("hex").slice(0, 14);
  return BigInt("0x" + hex).toString();
}
