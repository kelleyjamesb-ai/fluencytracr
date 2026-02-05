import { app } from "../src/app";
import { store } from "../src/store";
import { requestApp, withSchemaVersion } from "./test_helpers";

beforeEach(() => {
  store.reset();
  store.orgs.set("org-1", { id: "org-1", name: "Org", minGroupSize: 2, createdAt: "now" });
  store.teams.set("team-1", { id: "team-1", orgId: "org-1", name: "Team" });
  store.roles.set("role-1", { id: "role-1", orgId: "org-1", name: "Role" });
});

it("suppresses enablement import under TG5", async () => {
  const response = await requestApp(app, {
    method: "POST",
    path: "/enablement/import",
    headers: withSchemaVersion({ "content-type": "application/json" }),
    body: { events: [] }
  });

  expect(response.status).toBe(404);
});
