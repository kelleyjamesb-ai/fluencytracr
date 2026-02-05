import { app } from "../src/app";
import { store } from "../src/store";
import { requestApp, withSchemaVersion } from "./test_helpers";

beforeEach(() => {
  store.reset();
  store.orgs.set("org-1", { id: "org-1", name: "Org", minGroupSize: 5, createdAt: "now" });
});

it("suppresses usage shape ingestion under TG5", async () => {
  const response = await requestApp(app, {
    method: "POST",
    path: "/orgs/org-1/usage-shape",
    headers: withSchemaVersion({ "content-type": "application/json", "x-role": "ADMIN" }),
    body: {
      org_id: "org-1",
      tool_class: "llm_chat",
      category: "rare",
      recorded_at: "2026-01-01T00:00:00Z"
    }
  });

  expect(response.status).toBe(404);
});
