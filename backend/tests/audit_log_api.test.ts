import { app } from "../src/app";
import { store } from "../src/store";
import { requestApp } from "./test_helpers";

beforeEach(() => {
  store.reset();
  store.orgs.set("org-1", { id: "org-1", name: "Org", minGroupSize: 1, createdAt: "now" });
});

it("does not record suppressed dashboard access", async () => {
  const dashboardResponse = await requestApp(app, {
    method: "GET",
    path: "/orgs/org-1/dashboard/overview",
    headers: { "x-role": "EXEC_VIEWER" }
  });
  const response = await requestApp(app, {
    method: "GET",
    path: "/orgs/org-1/audit-log",
    headers: { "x-role": "ADMIN" }
  });
  const payload = response.body as { logs: unknown[] };

  expect(dashboardResponse.status).toBe(404);
  expect(response.status).toBe(200);
  expect(payload.logs).toHaveLength(0);
});
