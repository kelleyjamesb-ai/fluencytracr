import request from "supertest";
import { app } from "../src/app";
import { store } from "../src/store";
import { withSchemaVersion } from "./test_helpers";

const schemaHeaders = withSchemaVersion({
  "Content-Type": "application/json"
});

beforeEach(() => {
  store.reset();
  store.orgs.set("org-1", { id: "org-1", name: "Org", minGroupSize: 2, createdAt: "now" });
});

it("uploads and normalizes policy text", async () => {
  const response = await request(app)
    .post("/orgs/org-1/policies/upload")
    .set(schemaHeaders)
    .send({
      file_name: "policy.txt",
      content_type: "text/plain",
      content: "AI is permitted for approved internal workflows. External sharing disabled for all prompts."
    });

  expect(response.status).toBe(201);
  expect(response.body.policy_id).toMatch(/^policy-/);
  expect(response.body.parse_status).toBe("normalized");
  expect(response.body.clause_count).toBeGreaterThan(0);
});

it("maps policy clauses to controls and returns unresolved clauses", async () => {
  const upload = await request(app)
    .post("/orgs/org-1/policies/upload")
    .set(schemaHeaders)
    .send({
      file_name: "policy.md",
      content: [
        "AI enabled for approved workflows.",
        "External sharing disabled outside the company.",
        "All teams should review prompts weekly."
      ].join("\n")
    });

  const policyId = upload.body.policy_id as string;

  const response = await request(app)
    .post(`/orgs/org-1/policies/${policyId}/map`)
    .set(schemaHeaders)
    .send({});

  expect(response.status).toBe(200);
  expect(response.body.mapping_id).toMatch(/^mapping-/);
  expect(Array.isArray(response.body.controls)).toBe(true);
  expect(response.body.controls.find((c: any) => c.control_name === "ai_enabled_status")).toBeTruthy();
  expect(response.body.unresolved_clauses.length).toBeGreaterThanOrEqual(1);
});

it("adapts legacy controls import into canonical compliance status", async () => {
  const controlsImport = await request(app)
    .post("/orgs/org-1/controls/import")
    .set(schemaHeaders)
    .send({
      observations: [
        {
          group_key: "org",
          group_type: "org",
          control_name: "ai_enabled_status",
          control_value: true,
          bucket_start: "2026-01-01",
          bucket_end: "2026-01-01"
        },
        {
          group_key: "org",
          group_type: "org",
          control_name: "external_sharing_disabled_status",
          control_value: false,
          bucket_start: "2026-01-01",
          bucket_end: "2026-01-01"
        }
      ]
    });

  expect(controlsImport.status).toBe(200);

  const status = await request(app)
    .get("/orgs/org-1/compliance/status")
    .set({ "x-role": "ADMIN" });

  expect(status.status).toBe(200);
  expect(status.body.overall_status).toBe("disabled");
  expect(status.body.counts.enabled).toBeGreaterThanOrEqual(1);
  expect(status.body.counts.disabled).toBeGreaterThanOrEqual(1);
});

it("filters compliance events by since timestamp", async () => {
  const upload = await request(app)
    .post("/orgs/org-1/policies/upload")
    .set(schemaHeaders)
    .send({
      file_name: "policy.txt",
      content: "AI enabled for approved workflows."
    });
  const policyId = upload.body.policy_id as string;

  await request(app)
    .post(`/orgs/org-1/policies/${policyId}/map`)
    .set(schemaHeaders)
    .send({});

  const allEvents = await request(app)
    .get("/orgs/org-1/compliance/events")
    .set({ "x-role": "ADMIN" });
  expect(allEvents.status).toBe(200);
  expect(allEvents.body.total_count).toBeGreaterThanOrEqual(2);

  const futureSince = "2999-01-01T00:00:00.000Z";
  const filtered = await request(app)
    .get(`/orgs/org-1/compliance/events?since=${encodeURIComponent(futureSince)}`)
    .set({ "x-role": "ADMIN" });
  expect(filtered.status).toBe(200);
  expect(filtered.body.total_count).toBe(0);
});
