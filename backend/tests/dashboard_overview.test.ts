import { app } from "../src/app";
import { store } from "../src/store";
import { requestApp } from "./test_helpers";

beforeEach(() => {
  store.reset();
  store.orgs.set("org-1", { id: "org-1", name: "Org", minGroupSize: 10, createdAt: "now" });
});

it("suppresses dashboard overview under TG5", async () => {
  const response = await requestApp(app, {
    method: "GET",
    path: "/orgs/org-1/dashboard/overview?range=12w&vendor=all&groupType=org",
    headers: { "x-role": "EXEC_VIEWER" }
  });

  expect(response.status).toBe(404);
});
