import { app } from "../src/app";
import { store } from "../src/store";
import { requestApp, loginAs, withAuth, withSchemaVersion } from "./test_helpers";

let adminCookie: string;
beforeEach(async () => {
  store.reset();
  store.orgs.set("org-1", { id: "org-1", name: "Org", minGroupSize: 2, createdAt: "now" });
  store.teams.set("team-1", { id: "team-1", orgId: "org-1", name: "Team" });
  store.roles.set("role-1", { id: "role-1", orgId: "org-1", name: "Role" });
  adminCookie = await loginAs(app, "ADMIN");
});

it("suppresses roster import under TG5", async () => {
  const response = await requestApp(app, {
    method: "POST",
    path: "/orgs/org-1/roster/import",
    headers: withAuth(adminCookie, withSchemaVersion({ "content-type": "application/json" })),
    body: { csv: "employee_id,team_id,role_id\nemp-1,team-1,role-1\n" }
  });

  expect(response.status).toBe(404);
});
