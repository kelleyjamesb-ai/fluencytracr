import { app } from "../src/app";
import { store } from "../src/store";
import { requestApp, loginAs, withAuth } from "./test_helpers";

let adminCookie: string;
beforeEach(async () => {
  store.reset();
  store.orgs.set("org-1", { id: "org-1", name: "Org", minGroupSize: 1, createdAt: "now" });
  adminCookie = await loginAs(app, "ADMIN");
});

it("audit-log endpoint removed — returns 404", async () => {
  const response = await requestApp(app, {
    method: "GET",
    path: "/orgs/org-1/audit-log",
    headers: withAuth(adminCookie)
  });

  // Endpoint removed per Sentinel directive. Audit logs are evidence, not a product surface.
  expect(response.status).toBe(404);
});
