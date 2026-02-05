import { app } from "../../src/app";
import { store } from "../../src/store";
import { requestApp } from "../test_helpers";

beforeEach(() => {
  store.reset();
  store.orgs.set("org-1", { id: "org-1", name: "Org", minGroupSize: 5, createdAt: "now" });
});

it("suppresses patterns endpoint under TG5", async () => {
  const response = await requestApp(app, {
    method: "GET",
    path: "/api/patterns?window=60d&scope=org",
    headers: { "x-role": "EXEC_VIEWER" }
  });

  expect(response.status).toBe(404);
});
