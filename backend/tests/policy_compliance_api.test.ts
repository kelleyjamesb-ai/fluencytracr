import request from "supertest";
import { app } from "../src/app";
import { store } from "../src/store";
import { withSchemaVersion } from "./test_helpers";

const schemaHeaders = withSchemaVersion({
  "Content-Type": "application/json"
});

beforeEach(() => {
  delete process.env.BETA_ORG_ALLOWLIST;
  process.env.COMPLIANCE_MODE = "shadow";
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

it("lists policies and fetches latest mapping for a policy", async () => {
  const upload = await request(app)
    .post("/orgs/org-1/policies/upload")
    .set(schemaHeaders)
    .send({
      file_name: "org-policy.txt",
      content: "AI enabled for approved workflows. External sharing disabled."
    });
  const policyId = upload.body.policy_id as string;

  await request(app)
    .post(`/orgs/org-1/policies/${policyId}/map`)
    .set(schemaHeaders)
    .send({});

  const listResponse = await request(app)
    .get("/orgs/org-1/policies")
    .set({ "x-role": "ADMIN" });
  expect(listResponse.status).toBe(200);
  expect(listResponse.body.mode).toBe("shadow");
  expect(listResponse.body.policies.length).toBeGreaterThanOrEqual(1);
  expect(listResponse.body.policies[0].latest_mapping).toBeTruthy();

  const mappingResponse = await request(app)
    .get(`/orgs/org-1/policies/${policyId}/mapping`)
    .set({ "x-role": "ADMIN" });
  expect(mappingResponse.status).toBe(200);
  expect(mappingResponse.body.policy_id).toBe(policyId);
  expect(Array.isArray(mappingResponse.body.controls)).toBe(true);
});

it("supports unresolved clause decisions and updates compliance status", async () => {
  const upload = await request(app)
    .post("/orgs/org-1/policies/upload")
    .set(schemaHeaders)
    .send({
      file_name: "unresolved-policy.txt",
      content: [
        "AI enabled for approved workflows.",
        "Teams should keep a local checklist and facilitator notes for weekly operating rhythm."
      ].join(" ")
    });
  const policyId = upload.body.policy_id as string;

  const mapped = await request(app)
    .post(`/orgs/org-1/policies/${policyId}/map`)
    .set(schemaHeaders)
    .send({});
  expect(mapped.status).toBe(200);

  const unresolved = mapped.body.unresolved_clauses.find((clause: any) => clause.clause_id);
  expect(unresolved).toBeTruthy();

  const decision = await request(app)
    .patch(`/orgs/org-1/policies/${policyId}/mapping/unresolved/${unresolved.clause_id}`)
    .set(withSchemaVersion({ "Content-Type": "application/json", "x-role": "ADMIN" }))
    .send({
      action: "map",
      rationale: "Map this governance clause in beta.",
      control_name: "compliance_posture_flag",
      status: "partial"
    });

  expect(decision.status).toBe(200);
  expect(decision.body.decision).toBe("map");

  const statusResponse = await request(app)
    .get("/orgs/org-1/compliance/status")
    .set({ "x-role": "ADMIN" });
  expect(statusResponse.status).toBe(200);
  expect(statusResponse.body.mode).toBe("shadow");
  expect(statusResponse.body.freshness).toBeDefined();
});

it("blocks unresolved clause decisions for non-admin roles", async () => {
  const upload = await request(app)
    .post("/orgs/org-1/policies/upload")
    .set(schemaHeaders)
    .send({
      file_name: "policy.txt",
      content: [
        "AI enabled for approved workflows.",
        "Document quarterly office hours and facilitator reflections for operating cadence."
      ].join(" ")
    });
  const policyId = upload.body.policy_id as string;

  const mapped = await request(app)
    .post(`/orgs/org-1/policies/${policyId}/map`)
    .set(schemaHeaders)
    .send({});
  expect(mapped.status).toBe(200);
  expect(mapped.body.unresolved_clauses.length).toBeGreaterThan(0);
  const unresolved = mapped.body.unresolved_clauses.find((clause: any) => clause.clause_id);
  expect(unresolved).toBeTruthy();

  const denied = await request(app)
    .patch(`/orgs/org-1/policies/${policyId}/mapping/unresolved/${unresolved.clause_id}`)
    .set(withSchemaVersion({ "Content-Type": "application/json", "x-role": "EXEC_VIEWER" }))
    .send({
      action: "ignore",
      rationale: "Not authorized"
    });

  expect(denied.status).toBe(403);
});

it("paginates and filters compliance events", async () => {
  const upload = await request(app)
    .post("/orgs/org-1/policies/upload")
    .set(schemaHeaders)
    .send({
      file_name: "policy-events.txt",
      content: "AI enabled for approved workflows."
    });
  const policyId = upload.body.policy_id as string;
  await request(app)
    .post(`/orgs/org-1/policies/${policyId}/map`)
    .set(schemaHeaders)
    .send({});

  const firstPage = await request(app)
    .get("/orgs/org-1/compliance/events?limit=1")
    .set({ "x-role": "ADMIN" });
  expect(firstPage.status).toBe(200);
  expect(firstPage.body.events.length).toBe(1);

  const filtered = await request(app)
    .get(`/orgs/org-1/compliance/events?policy_id=${policyId}&event_type=policy_uploaded`)
    .set({ "x-role": "ADMIN" });
  expect(filtered.status).toBe(200);
  expect(filtered.body.events.every((event: any) => event.event_type === "policy_uploaded")).toBe(true);
});
