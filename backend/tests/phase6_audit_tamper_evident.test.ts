/**
 * Phase 6 — Audit Logging: Tamper-Evidence & Non-Repurposability Tests
 *
 * Scope: Audit logging ONLY.
 * Explicitly forbidden: Metrics, counts, time-series summaries, queryable analytics.
 *
 * Tests prove:
 * 1. Current audit logs are NOT append-only (FAIL)
 * 2. Current audit logs are NOT tamper-evident (FAIL)
 * 3. Current audit logs CAN be repurposed as metrics (FAIL)
 */
import { store } from "../src/store";
import { logAuditEvent, listAuditLogs } from "../src/audit_log";
import { app } from "../src/app";
import { requestApp, loginAs, withAuth } from "./test_helpers";

const ORG_ID = "org-audit-test";

let adminCookie: string;
beforeEach(async () => {
  store.reset();
  store.orgs.set(ORG_ID, {
    id: ORG_ID,
    name: "Audit Test Org",
    minGroupSize: 10,
    createdAt: new Date().toISOString()
  });
  adminCookie = await loginAs(app, "ADMIN");
});

// ═══════════════════════════════════════════════════════════════════════════
// REQUIREMENT 1: Append-only logging
// ═══════════════════════════════════════════════════════════════════════════

describe("Append-only logging — CURRENT STATE", () => {
  it("FAIL: audit log entries can be deleted from store", () => {
    const record = logAuditEvent({
      orgId: ORG_ID,
      action: "dashboard_access",
      actorRole: "ADMIN",
      metadata: { test: true }
    });

    expect(store.auditLogs.has(record.id)).toBe(true);

    // ATTACK: Delete an audit record
    store.auditLogs.delete(record.id);
    expect(store.auditLogs.has(record.id)).toBe(false);

    // VERDICT: FAIL — Audit log is NOT append-only.
    // Records can be deleted via direct Map access.
  });

  it("FAIL: audit log entries can be modified in place", () => {
    const record = logAuditEvent({
      orgId: ORG_ID,
      action: "dashboard_access",
      actorRole: "ADMIN",
      metadata: { original: true }
    });

    // ATTACK: Modify the record
    const storedRecord = store.auditLogs.get(record.id);
    expect(storedRecord).toBeDefined();
    if (storedRecord) {
      storedRecord.actorRole = "TAMPERED";
      storedRecord.metadata = { tampered: true };
    }

    // Verify the tamper persists
    const retrieved = store.auditLogs.get(record.id);
    expect(retrieved?.actorRole).toBe("TAMPERED");

    // VERDICT: FAIL — Audit records are mutable.
  });

  it("FAIL: entire audit log can be cleared", () => {
    logAuditEvent({ orgId: ORG_ID, action: "dashboard_access", actorRole: "ADMIN", metadata: {} });
    logAuditEvent({ orgId: ORG_ID, action: "dashboard_export", actorRole: "ADMIN", metadata: {} });

    expect(store.auditLogs.size).toBe(2);

    // ATTACK: Clear all audit logs
    store.auditLogs.clear();
    expect(store.auditLogs.size).toBe(0);

    // VERDICT: FAIL — Complete audit log destruction is trivial.
  });

  it("FAIL: audit logs do not survive server restart (in-memory only)", () => {
    logAuditEvent({ orgId: ORG_ID, action: "dashboard_access", actorRole: "ADMIN", metadata: {} });
    expect(store.auditLogs.size).toBe(1);

    // store.reset() simulates the effect of a server restart
    store.reset();
    expect(store.auditLogs.size).toBe(0);

    // VERDICT: FAIL — No persistence. All audit evidence is volatile.
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// REQUIREMENT 2: Tamper detection
// ═══════════════════════════════════════════════════════════════════════════

describe("Tamper detection — CURRENT STATE", () => {
  it("FAIL: no cryptographic integrity (no hash chain, no HMAC)", () => {
    const record = logAuditEvent({
      orgId: ORG_ID,
      action: "dashboard_access",
      actorRole: "ADMIN",
      metadata: { key: "value" }
    });

    // Check for any integrity fields
    const fields = Object.keys(record);
    const integrityFields = fields.filter(
      (f) =>
        f.includes("hash") ||
        f.includes("hmac") ||
        f.includes("signature") ||
        f.includes("checksum") ||
        f.includes("previous") ||
        f.includes("chain")
    );

    expect(integrityFields).toEqual([]);

    // VERDICT: FAIL — No tamper-detection mechanism exists.
    // Records have: id, orgId, action, actorRole, metadata, timestamp.
    // No hash chain. No HMAC. No signature.
  });

  it("FAIL: modified records are indistinguishable from originals", () => {
    const record = logAuditEvent({
      orgId: ORG_ID,
      action: "dashboard_access",
      actorRole: "ADMIN",
      metadata: { decision: "SUPPRESS", reason: "AMB_EVIDENCE" }
    });

    const originalTimestamp = record.timestamp;

    // ATTACK: Modify the record to hide a suppress event
    const stored = store.auditLogs.get(record.id)!;
    stored.action = "dashboard_access";
    stored.metadata = { decision: "SURFACE", reason: "legitimate" };

    // Verify: no way to detect the modification
    const retrieved = store.auditLogs.get(record.id)!;
    expect(retrieved.metadata).toEqual({ decision: "SURFACE", reason: "legitimate" });
    expect(retrieved.timestamp).toBe(originalTimestamp); // timestamp unchanged

    // VERDICT: FAIL — Tampering is undetectable.
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// REQUIREMENT 3: Logs cannot be repurposed as metrics
// ═══════════════════════════════════════════════════════════════════════════

describe("Log repurposability — CURRENT STATE", () => {
  it("FAIL: audit logs can be counted to derive access frequency metrics", () => {
    // Simulate 5 dashboard access events over time
    for (let i = 0; i < 5; i++) {
      logAuditEvent({
        orgId: ORG_ID,
        action: "dashboard_access",
        actorRole: "EXEC_VIEWER",
        metadata: { day: `2025-01-0${i + 1}` }
      });
    }

    // ATTACK: Query logs for counts — deriving an access frequency metric
    const logs = listAuditLogs(ORG_ID);
    const accessCount = logs.filter((l) => l.action === "dashboard_access").length;
    expect(accessCount).toBe(5);

    // This count IS a metric. The Phase 6 spec forbids this.
    // VERDICT: FAIL — Logs are queryable and countable.
  });

  it("FAIL: audit logs can be queried for time-series patterns", () => {
    // Create logs with different timestamps
    logAuditEvent({ orgId: ORG_ID, action: "dashboard_access", actorRole: "ADMIN", metadata: {} });
    logAuditEvent({ orgId: ORG_ID, action: "dashboard_export", actorRole: "ADMIN", metadata: {} });
    logAuditEvent({ orgId: ORG_ID, action: "dashboard_access", actorRole: "ADMIN", metadata: {} });

    const logs = listAuditLogs(ORG_ID);

    // ATTACK: Derive a time-series from log timestamps
    const timeSeries = logs.map((l) => ({
      time: l.timestamp,
      action: l.action
    }));

    expect(timeSeries.length).toBe(3);
    // Timestamps are present and sortable — time-series derivation is trivial
    expect(timeSeries[0].time).toBeDefined();

    // VERDICT: FAIL — Logs can be repurposed as time-series summaries.
  });

  it("FAIL: audit logs expose actor roles — queryable for analytics", () => {
    logAuditEvent({ orgId: ORG_ID, action: "dashboard_access", actorRole: "ADMIN", metadata: {} });
    logAuditEvent({
      orgId: ORG_ID,
      action: "dashboard_access",
      actorRole: "EXEC_VIEWER",
      metadata: {}
    });

    const logs = listAuditLogs(ORG_ID);

    // ATTACK: Group by role to derive role-based usage analytics
    const byRole = new Map<string, number>();
    logs.forEach((l) => {
      byRole.set(l.actorRole, (byRole.get(l.actorRole) ?? 0) + 1);
    });

    expect(byRole.get("ADMIN")).toBe(1);
    expect(byRole.get("EXEC_VIEWER")).toBe(1);

    // VERDICT: FAIL — Logs can be grouped for analytics.
  });

  it("API endpoint returns raw audit logs without aggregation protection", async () => {
    logAuditEvent({ orgId: ORG_ID, action: "dashboard_access", actorRole: "ADMIN", metadata: {} });
    logAuditEvent({ orgId: ORG_ID, action: "dashboard_access", actorRole: "ADMIN", metadata: {} });

    const response = await requestApp(app, {
      method: "GET",
      path: `/orgs/${ORG_ID}/audit-log`,
      headers: withAuth(adminCookie)
    });

    expect(response.status).toBe(200);
    const body = response.body as any;
    expect(Array.isArray(body.logs)).toBe(true);
    expect(body.logs.length).toBe(2);

    // VERDICT: FAIL — Raw logs are returned. No aggregation protection.
  });
});
