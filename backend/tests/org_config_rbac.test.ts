import request from "supertest";

import { app } from "../src/app";
import { store } from "../src/store";
import { withSchemaVersion } from "./test_helpers";

beforeEach(() => {
  store.reset();
  store.orgs.set("org-1", {
    id: "org-1",
    name: "Org",
    minGroupSize: 5,
    createdAt: new Date().toISOString(),
    complianceMode: "shadow"
  });
});

it("blocks EXEC_VIEWER from mutating team and role configuration", async () => {
  const teamCreate = await request(app)
    .post("/orgs/org-1/teams")
    .set({ "x-role": "EXEC_VIEWER", "x-org-id": "org-1", "Content-Type": "application/json" })
    .send({ name: "Team A" });
  expect(teamCreate.status).toBe(403);

  const roleCreate = await request(app)
    .post("/orgs/org-1/roles")
    .set({ "x-role": "EXEC_VIEWER", "x-org-id": "org-1", "Content-Type": "application/json" })
    .send({ name: "Role A" });
  expect(roleCreate.status).toBe(403);

  const groupsImport = await request(app)
    .post("/orgs/org-1/groups")
    .set(withSchemaVersion({ "x-role": "EXEC_VIEWER", "x-org-id": "org-1", "Content-Type": "application/json" }))
    .send({
      groups: [{ group_key: "team-a", group_type: "team", name: "Team A" }]
    });
  expect(groupsImport.status).toBe(403);
});

it("allows ADMIN to mutate team and role configuration", async () => {
  const teamCreate = await request(app)
    .post("/orgs/org-1/teams")
    .set({ "x-role": "ADMIN", "x-org-id": "org-1", "Content-Type": "application/json" })
    .send({ name: "Team A" });
  expect(teamCreate.status).toBe(201);
  expect(teamCreate.body.orgId).toBe("org-1");

  const roleCreate = await request(app)
    .post("/orgs/org-1/roles")
    .set({ "x-role": "ADMIN", "x-org-id": "org-1", "Content-Type": "application/json" })
    .send({ name: "Role A" });
  expect(roleCreate.status).toBe(201);
  expect(roleCreate.body.orgId).toBe("org-1");

  const groupsImport = await request(app)
    .post("/orgs/org-1/groups")
    .set(withSchemaVersion({ "x-role": "ADMIN", "x-org-id": "org-1", "Content-Type": "application/json" }))
    .send({
      groups: [{ group_key: "team-a", group_type: "team", name: "Team A" }]
    });
  expect(groupsImport.status).toBe(200);
});
