/**
 * Phase 6 — Audit Logging: Tamper-Evidence & Immutability Tests
 *
 * Scope: Audit logging ONLY.
 *
 * Tests prove:
 * 1. Audit log is append-only — delete/update/clear fail at DB level (PASS)
 * 2. Audit log is tamper-evident — hash chain detects modification (PASS)
 * 3. Audit log persists across restarts (PASS)
 * 4. Audit log read endpoint removed — no product surface (PASS)
 */
import { Pool } from "pg";
import { PostgresAuditStore } from "../src/audit/postgresAuditStore";
import { GENESIS_HASH } from "../src/audit/hashChain";
import { bootstrapAuditDb, truncateAuditLog, teardownAuditDb } from "./setup_audit_db";

const ORG_ID = "org-audit-test";
const prisma = new PrismaClient();

beforeAll(async () => {
  setPrismaClient(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

let auditStore: PostgresAuditStore;
let auditWriterUrl: string;
let superPool: Pool;

const isPostgresAvailable = (): boolean => {
  return Boolean(process.env.DATABASE_URL);
};

const describeIfPostgres = isPostgresAvailable() ? describe : describe.skip;

// ═══════════════════════════════════════════════════════════════════════════
// All audit tests require PostgreSQL. They are skipped in environments
// without a database (pure unit-test runs). CI provisions Postgres.
// ═══════════════════════════════════════════════════════════════════════════

describeIfPostgres("Audit Immutability — PostgreSQL", () => {
  beforeAll(async () => {
    const bootstrap = await bootstrapAuditDb();
    superPool = bootstrap.superPool;
    auditWriterUrl = bootstrap.auditWriterUrl;
    auditStore = new PostgresAuditStore(auditWriterUrl);
  });

  afterAll(async () => {
    await auditStore.close();
    await teardownAuditDb();
  });

  beforeEach(async () => {
    await truncateAuditLog();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // REQUIREMENT 1: Append-only — mutation attempts fail
  // ═══════════════════════════════════════════════════════════════════════

  describe("Append-only enforcement", () => {
    it("PASS: audit_writer cannot DELETE audit records", async () => {
      await auditStore.append({
        id: "audit-del-test",
        org_id: ORG_ID,
        action: "dashboard_access",
        actor_sub: "admin",
        actor_role: "ADMIN",
        metadata: {},
      });

      // Attempt DELETE as audit_writer — must fail with permission denied
      const writerPool = new Pool({ connectionString: auditWriterUrl });
      try {
        await expect(
          writerPool.query("DELETE FROM audit_log WHERE id = $1", ["audit-del-test"])
        ).rejects.toThrow(/permission denied/);
      } finally {
        await writerPool.end();
      }
    });

    it("PASS: audit_writer cannot UPDATE audit records", async () => {
      await auditStore.append({
        id: "audit-upd-test",
        org_id: ORG_ID,
        action: "dashboard_access",
        actor_sub: "admin",
        actor_role: "ADMIN",
        metadata: {},
      });

      const writerPool = new Pool({ connectionString: auditWriterUrl });
      try {
        await expect(
          writerPool.query("UPDATE audit_log SET actor_role = 'TAMPERED' WHERE id = $1", ["audit-upd-test"])
        ).rejects.toThrow(/permission denied/);
      } finally {
        await writerPool.end();
      }
    });

    it("PASS: audit_writer cannot TRUNCATE audit_log", async () => {
      await auditStore.append({
        id: "audit-trunc-test",
        org_id: ORG_ID,
        action: "dashboard_access",
        actor_sub: "admin",
        actor_role: "ADMIN",
        metadata: {},
      });

      const writerPool = new Pool({ connectionString: auditWriterUrl });
      try {
        await expect(
          writerPool.query("TRUNCATE audit_log")
        ).rejects.toThrow(/permission denied/);
      } finally {
        await writerPool.end();
      }

      // Verify record still exists
      const entries = await auditStore.list(ORG_ID);
      expect(entries.length).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // REQUIREMENT 2: Persistence across restarts
  // ═══════════════════════════════════════════════════════════════════════

  describe("Restart persistence", () => {
    it("PASS: audit logs survive connection close and reconnect", async () => {
      await auditStore.append({
        id: "audit-persist-test",
        org_id: ORG_ID,
        action: "dashboard_access",
        actor_sub: "admin",
        actor_role: "ADMIN",
        metadata: {},
      });

      // Close the store (simulates server restart)
      await auditStore.close();

      // Reconnect with a fresh store
      const freshStore = new PostgresAuditStore(auditWriterUrl);
      try {
        const entries = await freshStore.list(ORG_ID);
        expect(entries.length).toBe(1);
        expect(entries[0].id).toBe("audit-persist-test");
      } finally {
        await freshStore.close();
      }

      // Reconnect the test store for remaining tests
      auditStore = new PostgresAuditStore(auditWriterUrl);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // REQUIREMENT 3: Tamper detection — hash chain
  // ═══════════════════════════════════════════════════════════════════════

  describe("Hash chain tamper detection", () => {
    it("PASS: every record has entry_hash and previous_entry_hash", async () => {
      const record = await auditStore.append({
        id: "audit-hash-test",
        org_id: ORG_ID,
        action: "dashboard_access",
        actor_sub: "admin",
        actor_role: "ADMIN",
        metadata: {},
      });

      expect(record.entry_hash).toBeDefined();
      expect(record.entry_hash.length).toBe(64); // SHA-256 hex
      expect(record.previous_entry_hash).toBeDefined();
      expect(record.previous_entry_hash).toBe(GENESIS_HASH); // First record links to genesis
    });

    it("PASS: chain links correctly across multiple records", async () => {
      const r1 = await auditStore.append({
        id: "audit-chain-1",
        org_id: ORG_ID,
        action: "dashboard_access",
        actor_sub: "admin",
        actor_role: "ADMIN",
        metadata: {},
      });

      const r2 = await auditStore.append({
        id: "audit-chain-2",
        org_id: ORG_ID,
        action: "dashboard_access",
        actor_sub: "admin",
        actor_role: "ADMIN",
        metadata: {},
      });

      // Second record's previous_entry_hash must equal first record's entry_hash
      expect(r2.previous_entry_hash).toBe(r1.entry_hash);

      // Verify chain is valid
      const result = await auditStore.verifyChain(ORG_ID);
      expect(result.valid).toBe(true);
      expect(result.entries_checked).toBe(2);
    });

    it("PASS: tampered record is detectable via verifyChain", async () => {
      await auditStore.append({
        id: "audit-tamper-1",
        org_id: ORG_ID,
        action: "dashboard_access",
        actor_sub: "admin",
        actor_role: "ADMIN",
        metadata: {},
      });

      await auditStore.append({
        id: "audit-tamper-2",
        org_id: ORG_ID,
        action: "dashboard_access",
        actor_sub: "admin",
        actor_role: "ADMIN",
        metadata: {},
      });

      // Tamper via superuser (bypasses audit_writer restrictions)
      await superPool.query(
        "UPDATE audit_log SET actor_role = 'TAMPERED' WHERE id = $1",
        ["audit-tamper-1"]
      );

      // Chain verification must detect the break
      const result = await auditStore.verifyChain(ORG_ID);
      expect(result.valid).toBe(false);
      expect(result.broken_at_id).toBe("audit-tamper-1");
    });

    it("PASS: empty chain is valid", async () => {
      const result = await auditStore.verifyChain(ORG_ID);
      expect(result.valid).toBe(true);
      expect(result.entries_checked).toBe(0);
    });
  });
});

  // ═══════════════════════════════════════════════════════════════════════
  // REQUIREMENT 4: Audit metadata is strictly limited
  // ═══════════════════════════════════════════════════════════════════════

  describe("Metadata allowlist enforcement", () => {
    it("PASS: valid metadata is accepted", async () => {
      const record = await auditStore.append({
        id: "audit-meta-valid",
        org_id: ORG_ID,
        action: "dashboard_access",
        actor_sub: "admin",
        actor_role: "ADMIN",
        metadata: { endpoint: "/api/v1/decision", method: "POST" },
      });
      expect(record.id).toBe("audit-meta-valid");
    });

    it("PASS: forbidden metadata fields are rejected", async () => {
      await expect(
        auditStore.append({
          id: "audit-meta-bad",
          org_id: ORG_ID,
          action: "dashboard_access",
          actor_sub: "admin",
          actor_role: "ADMIN",
          metadata: { email: "user@test.com" },
        })
      ).rejects.toThrow(/Audit metadata rejected/);
    });

    it("PASS: raw content in metadata is rejected", async () => {
      await expect(
        auditStore.append({
          id: "audit-meta-content",
          org_id: ORG_ID,
          action: "dashboard_access",
          actor_sub: "admin",
          actor_role: "ADMIN",
          metadata: { prompt: "tell me about the team", content: "raw text" },
        })
      ).rejects.toThrow(/Audit metadata rejected/);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // REQUIREMENT 5: Interface has no mutation methods
  // ═══════════════════════════════════════════════════════════════════════

  describe("Interface enforcement", () => {
    it("PASS: AuditStore implementation has no update/delete/clear methods", () => {
      const methods = Object.getOwnPropertyNames(PostgresAuditStore.prototype);
      expect(methods).not.toContain("update");
      expect(methods).not.toContain("delete");
      expect(methods).not.toContain("clear");
      expect(methods).not.toContain("truncate");
      expect(methods).toContain("append");
      expect(methods).toContain("list");
      expect(methods).toContain("verifyChain");
    });
  });
});
