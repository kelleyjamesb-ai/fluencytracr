import { app } from "../src/app";
import { store } from "../src/store";
import { withSchemaVersion } from "./test_helpers";

const startServer = () => {
  return new Promise<{ url: string; close: () => void }>((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address();
      if (typeof address === "string" || address === null) {
        throw new Error("Unexpected address");
      }
      resolve({
        url: `http://127.0.0.1:${address.port}`,
        close: () => server.close()
      });
    });
  });
};

beforeEach(() => {
  store.reset();
  store.orgs.set("org-1", { id: "org-1", name: "Org", minGroupSize: 2, createdAt: "now" });
  store.teams.set("team-1", { id: "team-1", orgId: "org-1", name: "Team" });
  store.roles.set("role-1", { id: "role-1", orgId: "org-1", name: "Role" });
});

it("imports enablement events from JSON and returns structured errors", async () => {
  const server = await startServer();
  const response = await fetch(`${server.url}/enablement/import`, {
    method: "POST",
    headers: withSchemaVersion({ "content-type": "application/json" }),
    body: JSON.stringify({
      events: [
        {
          org_id: "org-1",
          team_id: "team-1",
          role_id: "role-1",
          timestamp: "2024-01-01T00:00:00Z",
          event_type: "assessment_pre",
          payload: { score: 3 }
        },
        {
          org_id: "org-1",
          team_id: "team-1",
          role_id: "role-1",
          timestamp: "bad",
          event_type: "assessment_post",
          payload: {}
        }
      ]
    })
  });
  const payload = await response.json();
  server.close();

  expect(payload.imported).toBe(1);
  expect(payload.rejected).toBe(1);
  expect(payload.errors[0].index).toBe(2);
  expect(store.enablementEvents.size).toBe(1);
});

it("imports enablement events from CSV", async () => {
  const server = await startServer();
  const response = await fetch(`${server.url}/enablement/import`, {
    method: "POST",
    headers: withSchemaVersion({ "content-type": "text/csv" }),
    body:
      "org_id,team_id,role_id,timestamp,event_type,payload\n" +
      "org-1,team-1,role-1,2024-01-02T00:00:00Z,session_attended,{\"source\":\"training\"}\n"
  });
  const payload = await response.json();
  server.close();

  expect(payload.imported).toBe(1);
  expect(payload.rejected).toBe(0);
  expect(store.enablementEvents.size).toBe(1);
});

it("rejects duplicate event ids", async () => {
  const server = await startServer();
  const response = await fetch(`${server.url}/enablement/import`, {
    method: "POST",
    headers: withSchemaVersion({ "content-type": "application/json" }),
    body: JSON.stringify({
      events: [
        {
          event_id: "evt-1",
          org_id: "org-1",
          team_id: "team-1",
          role_id: "role-1",
          timestamp: "2024-01-03T00:00:00Z",
          event_type: "session_attended",
          payload: {}
        },
        {
          event_id: "evt-1",
          org_id: "org-1",
          team_id: "team-1",
          role_id: "role-1",
          timestamp: "2024-01-03T00:00:00Z",
          event_type: "session_attended",
          payload: {}
        }
      ]
    })
  });
  const payload = await response.json();
  server.close();

  expect(payload.imported).toBe(1);
  expect(payload.rejected).toBe(1);
});
