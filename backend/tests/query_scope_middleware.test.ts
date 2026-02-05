import { app } from "../src/app";
import { store } from "../src/store";
import { requestApp } from "./test_helpers";

beforeEach(() => {
  store.reset();
  store.orgs.set("org-1", { id: "org-1", name: "Org", minGroupSize: 10, createdAt: "now" });
});

it("rejects disallowed scopes in query", async () => {
  const response = await requestApp(app, {
    method: "GET",
    path: "/orgs/org-1/dashboard/overview?scope=employee&range=12w",
    headers: { "x-role": "EXEC_VIEWER" }
  });
  const payload = response.body as { error?: string };

  expect(response.status).toBe(400);
  expect(payload.error).toMatch(/scope/i);
});
