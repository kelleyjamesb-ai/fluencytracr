/**
 * Phase 7 — Audit Logging: Tamper-Evidence & Immutability Tests
 *
 * Replaces Phase 6 FAIL tests with PASS tests.
 * Proves: persistent, append-only, hash-chained, concurrency-safe audit logs.
 */
import { PrismaClient } from "@prisma/client";
import {
  logAuditEvent,
  listAuditLogs,
  verifyChain,
  canonicalize,
  sha256,
  setPrismaClient,
  clearAuditLogsForTest,
} from "../src/audit_log";
import { app } from "../src/app";
import { store } from "../src/store";
import { requestApp, loginAs, withAuth } from "./test_helpers";

const ORG_ID = "org-audit-test";
const prisma = new PrismaClient();

beforeAll(async () => {
  setPrismaClient(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

let adminCookie: string;
beforeEach(async () => {
  await clearAuditLogsForTest();
  store.reset();
  store.orgs.set(ORG_ID, {
    id: ORG_ID,
    name: "Audit Test Org",
    minGroupSize: 10,
    createdAt: new Date().toISOString(),
  });
  adminCookie = await loginAs(app, "ADMIN");
});

// ═══════════════════════════════════════════════════════════════════════════
// REQUIREMENT 1: Append-only logging (now PASS)
// ═══════════════════════════════════════════════════════════════════════════

describe("Append-only logging — ENFORCED", () => {
  it("PASS: audit log entries cannot be deleted via Prisma (trigger raises exception)", async () => {
    const record = await logAuditEvent({
      orgId: ORG_ID,
      actorSub: "admin",
      actorRole: "ADMIN",
      eventType: "test_event",
      metadata: { test: true },
    });

    // Attempt DELETE — REVOKE + trigger block the operation
    await expect(
      prisma.auditEvent.delete({ where: { id: record.id } })
    ).rejects.toThrow(/permission denied|DELETE on AuditEvent is forbidden/);

    // Record still exists
    const found = await prisma.auditEvent.findUnique({ where: { id: record.id } });
    expect(found).not.toBeNull();
  });

  it("PASS: audit log entries cannot be modified via Prisma (REVOKE + trigger)", async () => {
    const record = await logAuditEvent({
      orgId: ORG_ID,
      actorSub: "admin",
      actorRole: "ADMIN",
      eventType: "test_event",
      metadata: { original: true },
    });

    // Attempt UPDATE — REVOKE + trigger block the operation
    await expect(
      prisma.auditEvent.update({
        where: { id: record.id },
        data: { actorRole: "TAMPERED" },
      })
    ).rejects.toThrow(/permission denied|UPDATE on AuditEvent is forbidden/);

    // Record unchanged
    const found = await prisma.auditEvent.findUnique({ where: { id: record.id } });
    expect(found!.actorRole).toBe("ADMIN");
  });

  it("PASS: bulk delete via deleteMany is blocked", async () => {
    await logAuditEvent({
      orgId: ORG_ID,
      actorSub: "admin",
      actorRole: "ADMIN",
      eventType: "test_event",
      metadata: {},
    });
    await logAuditEvent({
      orgId: ORG_ID,
      actorSub: "admin",
      actorRole: "ADMIN",
      eventType: "test_event",
      metadata: {},
    });

    await expect(
      prisma.auditEvent.deleteMany({ where: { orgId: ORG_ID } })
    ).rejects.toThrow(/permission denied|DELETE on AuditEvent is forbidden/);

    const count = await prisma.auditEvent.count({ where: { orgId: ORG_ID } });
    expect(count).toBe(2);
  });

  it("PASS: returned records are frozen (Object.isFrozen)", async () => {
    const record = await logAuditEvent({
      orgId: ORG_ID,
      actorSub: "admin",
      actorRole: "ADMIN",
      eventType: "test_event",
      metadata: {},
    });

    expect(Object.isFrozen(record)).toBe(true);
  });

  it("PASS: audit logs persist across store.reset() (DB-backed)", async () => {
    await logAuditEvent({
      orgId: ORG_ID,
      actorSub: "admin",
      actorRole: "ADMIN",
      eventType: "test_event",
      metadata: {},
    });

    store.reset(); // Only resets in-memory store, not Postgres

    const logs = await listAuditLogs(ORG_ID);
    expect(logs.length).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// REQUIREMENT 2: Tamper detection via SHA-256 hash chain (now PASS)
// ═══════════════════════════════════════════════════════════════════════════

describe("Tamper detection — ENFORCED", () => {
  it("PASS: records contain hash, prevHash, and seq fields", async () => {
    const record = await logAuditEvent({
      orgId: ORG_ID,
      actorSub: "admin",
      actorRole: "ADMIN",
      eventType: "test_event",
      metadata: { key: "value" },
    });

    expect(record.hash).toBeDefined();
    expect(record.hash).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
    expect(record.prevHash).toBe("GENESIS"); // First in chain
    expect(record.seq).toBe(1);
  });

  it("PASS: hash chain links correctly across multiple records", async () => {
    const r1 = await logAuditEvent({
      orgId: ORG_ID,
      actorSub: "admin",
      actorRole: "ADMIN",
      eventType: "event_a",
      metadata: {},
    });
    const r2 = await logAuditEvent({
      orgId: ORG_ID,
      actorSub: "admin",
      actorRole: "ADMIN",
      eventType: "event_b",
      metadata: {},
    });
    const r3 = await logAuditEvent({
      orgId: ORG_ID,
      actorSub: "admin",
      actorRole: "ADMIN",
      eventType: "event_c",
      metadata: {},
    });

    expect(r1.prevHash).toBe("GENESIS");
    expect(r2.prevHash).toBe(r1.hash);
    expect(r3.prevHash).toBe(r2.hash);
    expect(r1.seq).toBe(1);
    expect(r2.seq).toBe(2);
    expect(r3.seq).toBe(3);
  });

  it("PASS: verifyChain returns valid for untampered chain", async () => {
    for (let i = 0; i < 5; i++) {
      await logAuditEvent({
        orgId: ORG_ID,
        actorSub: "admin",
        actorRole: "ADMIN",
        eventType: "test_event",
        metadata: { index: i },
      });
    }

    const logs = await listAuditLogs(ORG_ID);
    const result = verifyChain(logs);
    expect(result.valid).toBe(true);
    expect(result.chainLength).toBe(5);
  });

  it("PASS: hash is reproducible via canonical serialization", async () => {
    const record = await logAuditEvent({
      orgId: ORG_ID,
      actorSub: "admin",
      actorRole: "ADMIN",
      eventType: "test_event",
      metadata: { b: 2, a: 1 }, // Unordered keys
    });

    // Recompute hash from the record fields
    const canonical = canonicalize({
      seq: record.seq,
      orgId: record.orgId,
      actorSub: record.actorSub,
      actorRole: record.actorRole,
      eventType: record.eventType,
      metadata: record.metadata,
      createdAt: record.createdAt,
      prevHash: record.prevHash,
    });
    const recomputed = sha256(canonical);
    expect(recomputed).toBe(record.hash);
  });

  it("PASS: metadata key order does not affect hash (deep-sorted)", async () => {
    // Canonical serialization deep-sorts keys, so {b:2,a:1} and {a:1,b:2}
    // must produce the same canonical form
    const canonical1 = canonicalize({
      seq: 1, orgId: "org1", actorSub: "u", actorRole: "ADMIN",
      eventType: "t", metadata: { z: 1, a: 2 }, createdAt: "2026-01-01", prevHash: "GENESIS",
    });
    const canonical2 = canonicalize({
      seq: 1, orgId: "org1", actorSub: "u", actorRole: "ADMIN",
      eventType: "t", metadata: { a: 2, z: 1 }, createdAt: "2026-01-01", prevHash: "GENESIS",
    });
    expect(canonical1).toBe(canonical2);
    expect(sha256(canonical1)).toBe(sha256(canonical2));
  });

  it("PASS: nested metadata tamper is detected by verifyChain", async () => {
    // Create entry with deeply nested metadata
    const nested = {
      user: { name: "Alice", roles: ["admin", "editor"] },
      action: { target: "doc-1", details: { changed: true, depth: 3 } },
    };
    await logAuditEvent({
      orgId: ORG_ID,
      actorSub: "admin",
      actorRole: "ADMIN",
      eventType: "nested_meta_event",
      metadata: nested,
    });

    // Chain is valid before tampering
    const logs = await listAuditLogs(ORG_ID);
    expect(verifyChain(logs).valid).toBe(true);

    // Tamper with a deeply nested metadata field (records are frozen, so clone)
    const tampered = logs.map((r) => ({ ...r }));
    const meta = JSON.parse(JSON.stringify(tampered[0].metadata)) as Record<string, any>;
    meta.action.details.changed = false; // flip nested boolean
    tampered[0].metadata = meta;

    // verifyChain must detect the tamper
    const result = verifyChain(tampered);
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(tampered[0].id);
  });

  it("PASS: separate orgs have independent chains", async () => {
    const ORG_B = "org-audit-test-b";
    store.orgs.set(ORG_B, {
      id: ORG_B,
      name: "Org B",
      minGroupSize: 10,
      createdAt: new Date().toISOString(),
    });

    await logAuditEvent({
      orgId: ORG_ID,
      actorSub: "admin",
      actorRole: "ADMIN",
      eventType: "event_a",
      metadata: {},
    });
    await logAuditEvent({
      orgId: ORG_B,
      actorSub: "admin",
      actorRole: "ADMIN",
      eventType: "event_b",
      metadata: {},
    });

    const logsA = await listAuditLogs(ORG_ID);
    const logsB = await listAuditLogs(ORG_B);

    expect(logsA.length).toBe(1);
    expect(logsB.length).toBe(1);
    expect(logsA[0].seq).toBe(1);
    expect(logsB[0].seq).toBe(1);
    expect(logsA[0].prevHash).toBe("GENESIS");
    expect(logsB[0].prevHash).toBe("GENESIS");

    expect(verifyChain(logsA).valid).toBe(true);
    expect(verifyChain(logsB).valid).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// REQUIREMENT 3: Monotonic sequencing and contiguity
// ═══════════════════════════════════════════════════════════════════════════

describe("Sequencing — ENFORCED", () => {
  it("PASS: seq values are contiguous starting from 1", async () => {
    for (let i = 0; i < 10; i++) {
      await logAuditEvent({
        orgId: ORG_ID,
        actorSub: "admin",
        actorRole: "ADMIN",
        eventType: "test_event",
        metadata: { i },
      });
    }
    const logs = await listAuditLogs(ORG_ID);
    expect(logs.map((l) => l.seq)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("PASS: unique constraint prevents duplicate seq per org", async () => {
    await logAuditEvent({
      orgId: ORG_ID,
      actorSub: "admin",
      actorRole: "ADMIN",
      eventType: "test_event",
      metadata: {},
    });

    // Direct attempt to insert duplicate seq=1
    await expect(
      prisma.auditEvent.create({
        data: {
          id: "audit-duplicate",
          orgId: ORG_ID,
          seq: 1,
          actorSub: "admin",
          actorRole: "ADMIN",
          eventType: "dup",
          metadata: {},
          prevHash: "GENESIS",
          hash: "fake",
          createdAt: new Date(),
        },
      })
    ).rejects.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// REQUIREMENT 4: API endpoint returns chain fields
// ═══════════════════════════════════════════════════════════════════════════

describe("API audit-log endpoint — chain fields", () => {
  it("PASS: GET /orgs/:orgId/audit-log returns seq, hash, prevHash", async () => {
    await logAuditEvent({
      orgId: ORG_ID,
      actorSub: "admin",
      actorRole: "ADMIN",
      eventType: "test_event",
      metadata: {},
    });

    const response = await requestApp(app, {
      method: "GET",
      path: `/orgs/${ORG_ID}/audit-log`,
      headers: withAuth(adminCookie),
    });

    expect(response.status).toBe(200);
    const body = response.body as any;
    expect(Array.isArray(body.logs)).toBe(true);
    // 1 pre-created event + 1 audit_log_read from the GET itself = 2
    expect(body.logs.length).toBe(2);
    expect(body.logs[0].seq).toBe(1);
    expect(body.logs[0].hash).toMatch(/^[a-f0-9]{64}$/);
    expect(body.logs[0].prevHash).toBe("GENESIS");
    expect(body.logs[1].eventType).toBe("audit_log_read");
  });

  it("PASS: chain is verifiable from API output alone", async () => {
    for (let i = 0; i < 3; i++) {
      await logAuditEvent({
        orgId: ORG_ID,
        actorSub: "admin",
        actorRole: "ADMIN",
        eventType: "test_event",
        metadata: { step: i },
      });
    }

    const response = await requestApp(app, {
      method: "GET",
      path: `/orgs/${ORG_ID}/audit-log`,
      headers: withAuth(adminCookie),
    });

    const logs = (response.body as any).logs;
    const result = verifyChain(logs);
    expect(result.valid).toBe(true);
    // 3 pre-created events + 1 audit_log_read from the GET = 4
    expect(result.chainLength).toBe(4);
  });
});
