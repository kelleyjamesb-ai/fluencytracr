import { app } from "../../src/app";
import { store } from "../../src/store";
import { requestApp, loginAs, withAuth } from "../test_helpers";

let viewerCookie: string;
beforeEach(async () => {
  store.reset();
  store.orgs.set("org-1", { id: "org-1", name: "Org", minGroupSize: 5, createdAt: "now" });
  viewerCookie = await loginAs(app, "EXEC_VIEWER");
});

it("suppresses patterns endpoint under TG5", async () => {
  const response = await requestApp(app, {
    method: "GET",
    path: "/api/patterns?window=60d&scope=org",
    headers: withAuth(viewerCookie)
  });

  expect(response.status).toBe(404);
});
