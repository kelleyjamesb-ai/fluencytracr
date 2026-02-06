import { app } from "../src/app";
import { store } from "../src/store";
import { requestApp, loginAs, withAuth } from "./test_helpers";

let viewerCookie: string;
beforeEach(async () => {
  store.reset();
  store.orgs.set("org-1", { id: "org-1", name: "Org", minGroupSize: 10, createdAt: "now" });
  viewerCookie = await loginAs(app, "EXEC_VIEWER");
});

it("suppresses dashboard overview under TG5", async () => {
  const response = await requestApp(app, {
    method: "GET",
    path: "/orgs/org-1/dashboard/overview?range=12w&vendor=all&groupType=org",
    headers: withAuth(viewerCookie)
  });

  expect(response.status).toBe(404);
});
