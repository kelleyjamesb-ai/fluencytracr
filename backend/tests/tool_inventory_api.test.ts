import { app } from "../src/app";
import { store } from "../src/store";
import { requestApp, loginAs, withAuth, withSchemaVersion } from "./test_helpers";

let adminCookie: string;
beforeEach(async () => {
  store.reset();
  store.orgs.set("org-1", { id: "org-1", name: "Org", minGroupSize: 5, createdAt: "now" });
  store.teams.set("team-1", { id: "team-1", orgId: "org-1", name: "Team" });
  adminCookie = await loginAs(app, "ADMIN");
});

it("suppresses tool inventory ingestion under TG5", async () => {
  const response = await requestApp(app, {
    method: "POST",
    path: "/orgs/org-1/tools",
    headers: withAuth(adminCookie, withSchemaVersion({ "content-type": "application/json" })),
    body: {
      org_id: "org-1",
      team_id: "team-1",
      tool_class: "llm_chat",
      first_seen: "2026-01-01T00:00:00Z"
    }
  });

  expect(response.status).toBe(404);
});
