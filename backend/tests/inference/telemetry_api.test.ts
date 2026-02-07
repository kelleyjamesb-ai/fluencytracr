import { app } from "../../src/app";
import { store } from "../../src/store";
import { requestApp, loginAs, withAuth } from "../test_helpers";

let adminCookie: string;
beforeEach(async () => {
  store.reset();
  store.orgs.set("org-1", { id: "org-1", name: "Org", minGroupSize: 5, createdAt: "now" });
  adminCookie = await loginAs(app, "ADMIN");
});

it("suppresses telemetry index under TG5", async () => {
  const response = await requestApp(app, {
    method: "GET",
    path: "/orgs/org-1/telemetry/index?window=60d",
    headers: withAuth(adminCookie)
  });

  expect(response.status).toBe(404);
});
