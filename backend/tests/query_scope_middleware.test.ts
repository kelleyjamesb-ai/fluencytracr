import { app } from "../src/app";
import { store } from "../src/store";
import { requestApp, loginAs, withAuth } from "./test_helpers";

let viewerCookie: string;
beforeEach(async () => {
  store.reset();
  store.orgs.set("org-1", { id: "org-1", name: "Org", minGroupSize: 10, createdAt: "now" });
  viewerCookie = await loginAs(app, "EXEC_VIEWER");
});

it("rejects disallowed scopes in query", async () => {
  const response = await requestApp(app, {
    method: "GET",
    path: "/orgs/org-1/dashboard/overview?scope=employee&range=12w",
    headers: withAuth(viewerCookie)
  });
  const payload = response.body as { error?: string };

  expect(response.status).toBe(400);
  expect(payload.error).toMatch(/scope/i);
});
