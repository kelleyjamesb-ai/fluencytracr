/**
 * Phase 7 — Audit Wiring Integration Tests
 *
 * Proves: every state-changing and security-relevant route generates
 * a persistent, immutable audit record before the response is sent.
 */
import { PrismaClient } from "@prisma/client";
import { app } from "../src/app";
import { store } from "../src/store";
import {
  listAuditLogs,
  verifyChain,
  setPrismaClient,
  clearAuditLogsForTest,
} from "../src/audit_log";
import { requestApp, loginAs, withAuth, withSchemaVersion } from "./test_helpers";

const ORG_ID = "org-wiring-test";
const prisma = new PrismaClient();

beforeAll(() => { setPrismaClient(prisma); });
afterAll(async () => { await prisma.$disconnect(); });

let adminCookie: string;
let enablementCookie: string;
beforeEach(async () => {
  await clearAuditLogsForTest();
  store.reset();
  store.orgs.set(ORG_ID, {
    id: ORG_ID,
    name: "Wiring Test Org",
    minGroupSize: 10,
    createdAt: new Date().toISOString(),
  });
  adminCookie = await loginAs(app, "ADMIN");
  enablementCookie = await loginAs(app, "ENABLEMENT_LEAD");
});

const getAuditLogs = () => listAuditLogs(ORG_ID);

describe("Audit wiring — state-changing routes", () => {
  it("POST /orgs → org_create audit record", async () => {
    const res = await requestApp(app, {
      method: "POST",
      path: "/orgs",
      headers: withAuth(adminCookie),
      body: { name: "New Org" },
    });
    expect(res.status).toBe(201);
    const newOrgId = (res.body as any).org_id;
    const logs = await listAuditLogs(newOrgId);
    expect(logs.length).toBe(1);
    expect(logs[0].eventType).toBe("org_create");
    expect(logs[0].actorSub).toBe("admin");
    expect(logs[0].actorRole).toBe("ADMIN");
  });

  it("POST /orgs/:orgId/teams → team_create audit record", async () => {
    const res = await requestApp(app, {
      method: "POST",
      path: `/orgs/${ORG_ID}/teams`,
      headers: withAuth(adminCookie),
      body: { name: "Team A" },
    });
    expect(res.status).toBe(201);
    const logs = await getAuditLogs();
    expect(logs.some((l) => l.eventType === "team_create")).toBe(true);
  });

  it("PATCH /orgs/:orgId/teams/:teamId → team_update audit record", async () => {
    const teamId = "team-wiring-1";
    store.teams.set(teamId, { id: teamId, orgId: ORG_ID, name: "Old" });

    const res = await requestApp(app, {
      method: "PATCH",
      path: `/orgs/${ORG_ID}/teams/${teamId}`,
      headers: withAuth(adminCookie),
      body: { name: "New" },
    });
    expect(res.status).toBe(200);
    const logs = await getAuditLogs();
    expect(logs.some((l) => l.eventType === "team_update")).toBe(true);
  });

  it("DELETE /orgs/:orgId/teams/:teamId → team_delete audit record", async () => {
    const teamId = "team-wiring-2";
    store.teams.set(teamId, { id: teamId, orgId: ORG_ID, name: "Del" });

    const res = await requestApp(app, {
      method: "DELETE",
      path: `/orgs/${ORG_ID}/teams/${teamId}`,
      headers: withAuth(adminCookie),
    });
    expect(res.status).toBe(204);
    const logs = await getAuditLogs();
    expect(logs.some((l) => l.eventType === "team_delete")).toBe(true);
  });

  it("POST /orgs/:orgId/roles → role_create audit record", async () => {
    const res = await requestApp(app, {
      method: "POST",
      path: `/orgs/${ORG_ID}/roles`,
      headers: withAuth(adminCookie),
      body: { name: "Analyst" },
    });
    expect(res.status).toBe(201);
    const logs = await getAuditLogs();
    expect(logs.some((l) => l.eventType === "role_create")).toBe(true);
  });

  it("PATCH /orgs/:orgId/roles/:roleId → role_update audit record", async () => {
    const roleId = "role-wiring-1";
    store.roles.set(roleId, { id: roleId, orgId: ORG_ID, name: "Old" });

    const res = await requestApp(app, {
      method: "PATCH",
      path: `/orgs/${ORG_ID}/roles/${roleId}`,
      headers: withAuth(adminCookie),
      body: { name: "New" },
    });
    expect(res.status).toBe(200);
    const logs = await getAuditLogs();
    expect(logs.some((l) => l.eventType === "role_update")).toBe(true);
  });

  it("DELETE /orgs/:orgId/roles/:roleId → role_delete audit record", async () => {
    const roleId = "role-wiring-2";
    store.roles.set(roleId, { id: roleId, orgId: ORG_ID, name: "Del" });

    const res = await requestApp(app, {
      method: "DELETE",
      path: `/orgs/${ORG_ID}/roles/${roleId}`,
      headers: withAuth(adminCookie),
    });
    expect(res.status).toBe(204);
    const logs = await getAuditLogs();
    expect(logs.some((l) => l.eventType === "role_delete")).toBe(true);
  });

  it("POST /orgs/:orgId/groups → group_upsert audit record", async () => {
    const res = await requestApp(app, {
      method: "POST",
      path: `/orgs/${ORG_ID}/groups`,
      headers: { ...withAuth(adminCookie), ...withSchemaVersion() },
      body: { groups: [{ group_key: "g1", group_type: "department" }] },
    });
    expect(res.status).toBe(200);
    const logs = await getAuditLogs();
    expect(logs.some((l) => l.eventType === "group_upsert")).toBe(true);
  });
});

describe("Audit wiring — security-relevant routes", () => {
  it("GET /orgs/:orgId/audit-log → audit_log_read (self-auditing)", async () => {
    const res = await requestApp(app, {
      method: "GET",
      path: `/orgs/${ORG_ID}/audit-log`,
      headers: withAuth(adminCookie),
    });
    expect(res.status).toBe(200);

    // The read itself creates an audit record
    const logs = await getAuditLogs();
    expect(logs.some((l) => l.eventType === "audit_log_read")).toBe(true);
  });
});

describe("Audit wiring — chain integrity after mixed operations", () => {
  it("hash chain verifies after multiple different operations", async () => {
    // Create team
    await requestApp(app, {
      method: "POST",
      path: `/orgs/${ORG_ID}/teams`,
      headers: withAuth(adminCookie),
      body: { name: "Team X" },
    });

    // Create role
    await requestApp(app, {
      method: "POST",
      path: `/orgs/${ORG_ID}/roles`,
      headers: withAuth(adminCookie),
      body: { name: "Role X" },
    });

    // Read audit log
    await requestApp(app, {
      method: "GET",
      path: `/orgs/${ORG_ID}/audit-log`,
      headers: withAuth(adminCookie),
    });

    const logs = await getAuditLogs();
    expect(logs.length).toBe(3); // team_create + role_create + audit_log_read
    const result = verifyChain(logs);
    expect(result.valid).toBe(true);
    expect(result.chainLength).toBe(3);
  });
});
