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

it("stores usage shape signals", async () => {
  const server = await startServer();
  const response = await fetch(`${server.url}/orgs/org-1/usage-shape`, {
    method: "POST",
    headers: withSchemaVersion({
      "content-type": "application/json",
      "x-role": "ENABLEMENT_LEAD"
    }),
    body: JSON.stringify({ team_id: "team-1", tool_class: "coding", category: "regular" })
  });
  const payload = await response.json();
  server.close();

  expect(response.status).toBe(201);
  expect(payload.category).toBe("regular");
  expect(store.usageShapes.size).toBe(1);
});

it("stores usage shape at role level", async () => {
  const server = await startServer();
  const response = await fetch(`${server.url}/orgs/org-1/usage-shape`, {
    method: "POST",
    headers: withSchemaVersion({
      "content-type": "application/json",
      "x-role": "ENABLEMENT_LEAD"
    }),
    body: JSON.stringify({ role_id: "role-1", tool_class: "llm_chat", category: "rare" })
  });
  const payload = await response.json();
  server.close();

  expect(response.status).toBe(201);
  expect(payload.roleId).toBe("role-1");
});

it("rejects usage shape linked to individuals", async () => {
  const server = await startServer();
  const response = await fetch(`${server.url}/orgs/org-1/usage-shape`, {
    method: "POST",
    headers: withSchemaVersion({
      "content-type": "application/json",
      "x-role": "ENABLEMENT_LEAD"
    }),
    body: JSON.stringify({
      team_id: "team-1",
      tool_class: "embedded_ai",
      category: "occasional",
      employee_id: "emp-1"
    })
  });
  const payload = await response.json();
  server.close();

  expect(response.status).toBe(400);
  expect(payload.error).toMatch(/invalid|forbidden/i);
});
