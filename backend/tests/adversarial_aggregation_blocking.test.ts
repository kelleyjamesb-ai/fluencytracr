import { app } from "../src/app";
import { store } from "../src/store";
import { requestApp, loginAs, withAuth } from "./test_helpers";

let adminCookie: string;
beforeEach(async () => {
  store.reset();
  store.orgs.set("org-1", { id: "org-1", name: "Org", minGroupSize: 5, createdAt: "now" });
  adminCookie = await loginAs(app, "ADMIN");
});

describe("aggregation blocking", () => {
  it("blocks aggregation-capable endpoints", async () => {
    const routes = [
      "/orgs/org-1/dashboard/overview",
      "/orgs/org-1/dashboard/export.csv",
      "/api/coverage?window=60d&scope=org",
      "/api/ledger?window=60d",
      "/orgs/org-1/behavior/signals"
    ];

    for (const path of routes) {
      const response = await requestApp(app, {
        method: "GET",
        path,
        headers: withAuth(adminCookie)
      });
      expect(response.status).toBe(404);
    }
  });
});
