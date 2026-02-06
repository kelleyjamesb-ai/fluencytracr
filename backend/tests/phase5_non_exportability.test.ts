import { app } from "../src/app";
import { store } from "../src/store";
import { requestApp } from "./test_helpers";

describe("Phase 5A runtime proofs", () => {
  beforeEach(() => {
    store.reset();
    store.orgs.set("org-1", { id: "org-1", name: "Org", minGroupSize: 10, createdAt: "now" });
  });

  it("blocks executive export endpoints", async () => {
    const csvResponse = await requestApp(app, {
      method: "GET",
      path: "/orgs/org-1/dashboard/export.csv",
      headers: { "x-role": "EXEC_VIEWER" }
    });
    const pdfResponse = await requestApp(app, {
      method: "GET",
      path: "/orgs/org-1/dashboard/export.pdf",
      headers: { "x-role": "EXEC_VIEWER" }
    });

    expect(csvResponse.status).toBe(404);
    expect(pdfResponse.status).toBe(404);
  });
});
