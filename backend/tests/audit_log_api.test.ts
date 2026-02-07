import { PrismaClient } from "@prisma/client";
import { app } from "../src/app";
import { store } from "../src/store";
import { setPrismaClient, clearAuditLogsForTest } from "../src/audit_log";
import { requestApp, loginAs, withAuth } from "./test_helpers";

const _prisma = new PrismaClient();
beforeAll(() => { setPrismaClient(_prisma); });
afterAll(async () => { await _prisma.$disconnect(); });

let viewerCookie: string;
let adminCookie: string;
beforeEach(async () => {
  store.reset();
  await clearAuditLogsForTest();
  store.orgs.set("org-1", { id: "org-1", name: "Org", minGroupSize: 1, createdAt: "now" });
  viewerCookie = await loginAs(app, "EXEC_VIEWER");
  adminCookie = await loginAs(app, "ADMIN");
});

it("does not record suppressed dashboard access", async () => {
  const dashboardResponse = await requestApp(app, {
    method: "GET",
    path: "/orgs/org-1/dashboard/overview",
    headers: withAuth(viewerCookie)
  });
  const response = await requestApp(app, {
    method: "GET",
    path: "/orgs/org-1/audit-log",
    headers: withAuth(adminCookie)
  });
  const payload = response.body as { logs: unknown[] };

  expect(dashboardResponse.status).toBe(404);
  expect(response.status).toBe(200);
  // GET /audit-log self-audits (creates audit_log_read), so exactly 1 log
  expect(payload.logs).toHaveLength(1);
  expect((payload.logs[0] as any).eventType).toBe("audit_log_read");
  // No dashboard-related audit events
  expect(payload.logs.every((l: any) => l.eventType !== "dashboard_access")).toBe(true);
});
