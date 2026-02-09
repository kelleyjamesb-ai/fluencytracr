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
});

it("stores tool inventory for a team", async () => {
  const server = await startServer();
  const response = await fetch(`${server.url}/orgs/org-1/tools`, {
    method: "POST",
    headers: withSchemaVersion({
      "content-type": "application/json",
      "x-role": "ADMIN"
    }),
    body: JSON.stringify({ team_id: "team-1", tool_class: "llm_chat" })
  });
  const payload = await response.json();
  server.close();

  expect(response.status).toBe(201);
  expect(payload.toolClass).toBe("llm_chat");
  expect(store.toolInventory.size).toBe(1);
});
