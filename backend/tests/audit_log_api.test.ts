import { app } from "../src/app";
import { store } from "../src/store";
import { requestApp, loginAs, withAuth } from "./test_helpers";

let viewerCookie: string;
let adminCookie: string;
beforeEach(async () => {
  store.reset();
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
  expect(payload.logs).toHaveLength(0);
});
