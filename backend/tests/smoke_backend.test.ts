import request from "supertest";
import { app } from "../src/app";
import { store } from "../src/store";
import { withSchemaVersion } from "./test_helpers";

beforeEach(() => {
  store.reset();
  store.orgs.set("org-1", { id: "org-1", name: "Org", minGroupSize: 2, createdAt: "now", complianceMode: "shadow" });
});

it("smoke: health endpoint responds", async () => {
  const response = await request(app).get("/health");
  expect(response.status).toBe(200);
  expect(response.body.status).toBe("ok");
});

it("smoke: policy upload and compliance status flow", async () => {
  const headers = withSchemaVersion({ "Content-Type": "application/json", "x-role": "ADMIN" });
  const upload = await request(app)
    .post("/orgs/org-1/policies/upload")
    .set(headers)
    .send({
      file_name: "smoke-policy.txt",
      content: "AI enabled for approved workflows."
    });

  expect(upload.status).toBe(201);

  const status = await request(app)
    .get("/orgs/org-1/compliance/status")
    .set({ "x-role": "ADMIN" });

  expect(status.status).toBe(200);
  expect(status.body.mode).toBe("shadow");
  expect(status.body.org_id).toBe("org-1");
});
