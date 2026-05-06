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

it("smoke: fail-closed ops endpoint responds for authorized roles", async () => {
  const response = await request(app)
    .get("/ops/failclosed")
    .set({ "x-role": "ADMIN" });

  expect(response.status).toBe(200);
  expect(typeof response.body.total).toBe("number");
  expect(Array.isArray(response.body.by_route)).toBe(true);
  expect(Array.isArray(response.body.by_reason)).toBe(true);
  expect(Array.isArray(response.body.recent)).toBe(true);
});

it("smoke: db readiness endpoint responds when db is not configured", async () => {
  const response = await request(app)
    .get("/ops/db/readiness")
    .set({ "x-role": "ADMIN" });

  expect(response.status).toBe(200);
  expect(response.body.status).toBe("not_configured");
  expect(Array.isArray(response.body.required_tables)).toBe(true);
});

it("smoke: ops metrics endpoint exposes sli payload", async () => {
  const response = await request(app)
    .get("/ops/metrics")
    .set({ "x-role": "ADMIN" });

  expect(response.status).toBe(200);
  expect(typeof response.body.as_of).toBe("string");
  expect(typeof response.body.uptime_seconds).toBe("number");
  expect(typeof response.body.counters).toBe("object");
  expect(typeof response.body.sli).toBe("object");
  expect(typeof response.body.sli.compliance_status_availability.value).toBe("number");
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
