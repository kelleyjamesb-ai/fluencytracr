import { app } from "../src/app";
import { store } from "../src/store";
import { requestApp, loginAs, withAuth } from "./test_helpers";

let viewerCookie: string;
beforeEach(async () => {
  store.reset();
  store.orgs.set("org-1", { id: "org-1", name: "Org", minGroupSize: 10, createdAt: "now" });
  viewerCookie = await loginAs(app, "EXEC_VIEWER");
});

it("suppresses dashboard exports under TG5", async () => {
  const csvResponse = await requestApp(app, {
    method: "GET",
    path: "/orgs/org-1/dashboard/export.csv",
    headers: withAuth(viewerCookie)
  });
  const pdfResponse = await requestApp(app, {
    method: "GET",
    path: "/orgs/org-1/dashboard/export.pdf",
    headers: withAuth(viewerCookie)
  });

  expect(csvResponse.status).toBe(404);
  expect(pdfResponse.status).toBe(404);
});
