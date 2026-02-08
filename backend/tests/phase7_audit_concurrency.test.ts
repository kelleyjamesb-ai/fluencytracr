/**
 * Phase 7 — Audit Concurrency Tests
 *
 * Proves: concurrent audit writes produce valid, contiguous hash chains
 * under SERIALIZABLE isolation with bounded retry.
 */
import { PrismaClient } from "@prisma/client";
import {
  logAuditEvent,
  listAuditLogs,
  verifyChain,
  setPrismaClient,
  clearAuditLogsForTest,
} from "../src/audit_log";

const ORG_ID = "org-concurrency-test";
const prisma = new PrismaClient();

beforeAll(async () => {
  setPrismaClient(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await clearAuditLogsForTest();
});

describe("Concurrent audit writes", () => {
  it("PASS: 20 parallel writes produce contiguous seq and valid chain", async () => {
    const N = 20;
    const promises = Array.from({ length: N }, (_, i) =>
      logAuditEvent({
        orgId: ORG_ID,
        actorSub: `user-${i}`,
        actorRole: "ADMIN",
        eventType: "concurrent_test",
        metadata: { index: i },
      })
    );

    const results = await Promise.all(promises);
    expect(results.length).toBe(N);

    const logs = await listAuditLogs(ORG_ID);
    expect(logs.length).toBe(N);

    // Seq must be contiguous 1..N
    const seqs = logs.map((l) => l.seq);
    expect(seqs).toEqual(Array.from({ length: N }, (_, i) => i + 1));

    // Hash chain must verify
    const result = verifyChain(logs);
    expect(result.valid).toBe(true);
    expect(result.chainLength).toBe(N);
  });

  it("PASS: repeated concurrent runs produce valid chains", async () => {
    // Run 3 rounds of 10 concurrent writes each
    for (let round = 0; round < 3; round++) {
      const promises = Array.from({ length: 10 }, (_, i) =>
        logAuditEvent({
          orgId: ORG_ID,
          actorSub: `user-r${round}-${i}`,
          actorRole: "ADMIN",
          eventType: "repeated_test",
          metadata: { round, index: i },
        })
      );
      await Promise.all(promises);
    }

    const logs = await listAuditLogs(ORG_ID);
    expect(logs.length).toBe(30);

    const seqs = logs.map((l) => l.seq);
    expect(seqs).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));

    const result = verifyChain(logs);
    expect(result.valid).toBe(true);
    expect(result.chainLength).toBe(30);
  });

  it("PASS: concurrent writes to different orgs do not interfere", async () => {
    const ORG_A = "org-concurrency-a";
    const ORG_B = "org-concurrency-b";

    const promisesA = Array.from({ length: 10 }, (_, i) =>
      logAuditEvent({
        orgId: ORG_A,
        actorSub: `user-a-${i}`,
        actorRole: "ADMIN",
        eventType: "test",
        metadata: {},
      })
    );
    const promisesB = Array.from({ length: 10 }, (_, i) =>
      logAuditEvent({
        orgId: ORG_B,
        actorSub: `user-b-${i}`,
        actorRole: "ADMIN",
        eventType: "test",
        metadata: {},
      })
    );

    await Promise.all([...promisesA, ...promisesB]);

    const logsA = await listAuditLogs(ORG_A);
    const logsB = await listAuditLogs(ORG_B);

    expect(logsA.length).toBe(10);
    expect(logsB.length).toBe(10);

    expect(verifyChain(logsA).valid).toBe(true);
    expect(verifyChain(logsB).valid).toBe(true);
  });
});
