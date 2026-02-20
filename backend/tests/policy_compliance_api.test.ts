import request from "supertest";
import { app } from "../src/app";
import { store } from "../src/store";
import { withSchemaVersion } from "./test_helpers";
import { buildDeterministicDecisionId } from "../src/policy_compliance";

const schemaHeaders = withSchemaVersion({
  "Content-Type": "application/json"
});
const adminSchemaHeaders = withSchemaVersion({
  "Content-Type": "application/json",
  "x-role": "ADMIN"
});

beforeEach(() => {
  delete process.env.BETA_ORG_ALLOWLIST;
  delete process.env.ENFORCEMENT_PILOT_ORG_ALLOWLIST;
  delete process.env.ENFORCEMENT_MAX_UNRESOLVED_CLAUSES;
  process.env.COMPLIANCE_MODE = "shadow";
  store.reset();
  store.orgs.set("org-1", { id: "org-1", name: "Org", minGroupSize: 2, createdAt: "now" });
});

it("accepts snake_case org create payload for min_group_size", async () => {
  const response = await request(app)
    .post("/orgs")
    .set(schemaHeaders)
    .send({
      name: "Snake Case Org",
      min_group_size: 3
    });

  expect(response.status).toBe(201);
  expect(response.body.min_group_size).toBe(3);
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

it("supports as_of status reconstruction without mutating current state", async () => {
  const controlsImport = await request(app)
    .post("/orgs/org-1/controls/import")
    .set(schemaHeaders)
    .send({
      observations: [
        {
          group_key: "org",
          group_type: "org",
          control_name: "external_sharing_disabled_status",
          control_value: true,
          bucket_start: "2026-01-01",
          bucket_end: "2026-01-01"
        }
      ]
    });
  expect(controlsImport.status).toBe(200);

  const beforeUpdate = await request(app)
    .get("/orgs/org-1/compliance/status")
    .set({ "x-role": "ADMIN" });
  expect(beforeUpdate.status).toBe(200);
  const beforeAsOf = beforeUpdate.body.as_of as string;

  await new Promise((resolve) => setTimeout(resolve, 5));

  const secondImport = await request(app)
    .post("/orgs/org-1/controls/import")
    .set(schemaHeaders)
    .send({
      observations: [
        {
          group_key: "org",
          group_type: "org",
          control_name: "external_sharing_disabled_status",
          control_value: false,
          bucket_start: "2026-01-02",
          bucket_end: "2026-01-02"
        }
      ]
    });
  expect(secondImport.status).toBe(200);

  const reconstructed = await request(app)
    .get(`/orgs/org-1/compliance/status?as_of=${encodeURIComponent(beforeAsOf)}`)
    .set({ "x-role": "ADMIN" });
  expect(reconstructed.status).toBe(200);
  expect(reconstructed.body.controls.find((c: any) => c.control_name === "external_sharing_disabled_status")?.status).toBe(
    "enabled"
  );

  const current = await request(app)
    .get("/orgs/org-1/compliance/status")
    .set({ "x-role": "ADMIN" });
  expect(current.status).toBe(200);
  expect(current.body.controls.find((c: any) => c.control_name === "external_sharing_disabled_status")?.status).toBe(
    "disabled"
  );
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

it("seeds synthetic policy data and resets sandbox artifacts", async () => {
  const seeded = await request(app)
    .post("/orgs/org-1/sandbox/seed-synthetic")
    .set(adminSchemaHeaders)
    .send({});
  expect(seeded.status).toBe(201);
  expect(seeded.body.synthetic_pack_size).toBeGreaterThanOrEqual(1);
  expect(seeded.body.created_policies).toBeGreaterThanOrEqual(1);
  expect(Array.isArray(seeded.body.seeded)).toBe(true);

  const listAfterSeed = await request(app)
    .get("/orgs/org-1/policies")
    .set({ "x-role": "ADMIN" });
  expect(listAfterSeed.status).toBe(200);
  expect(listAfterSeed.body.policies.length).toBeGreaterThanOrEqual(1);
  expect(listAfterSeed.body.policies[0].latest_mapping).toBeTruthy();

  const reset = await request(app)
    .post("/orgs/org-1/sandbox/reset")
    .set(adminSchemaHeaders)
    .send({});
  expect(reset.status).toBe(200);
  expect(reset.body.cleared.policies).toBeGreaterThanOrEqual(1);
  expect(reset.body.cleared.mappings).toBeGreaterThanOrEqual(1);

  const listAfterReset = await request(app)
    .get("/orgs/org-1/policies")
    .set({ "x-role": "ADMIN" });
  expect(listAfterReset.status).toBe(200);
  expect(listAfterReset.body.policies).toHaveLength(0);
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

  const events = await request(app)
    .get(`/orgs/org-1/compliance/events?policy_id=${policyId}&event_type=unresolved_clause_decided`)
    .set({ "x-role": "ADMIN" });
  expect(events.status).toBe(200);
  expect(events.body.events.length).toBeGreaterThanOrEqual(1);
  const decisionEvent = events.body.events[events.body.events.length - 1];
  const expectedDecisionId = buildDeterministicDecisionId({
    orgId: "org-1",
    policyId,
    mappingId: mapped.body.mapping_id,
    clauseId: unresolved.clause_id,
    action: "map",
    rationale: "Map this governance clause in beta.",
    status: "partial",
    decidedAt: decisionEvent.created_at
  });
  expect(decisionEvent.metadata.decision_id).toBe(expectedDecisionId);
  expect(decisionEvent.metadata.clause_id).toBe(unresolved.clause_id);
  expect(decisionEvent.metadata.action).toBe("map");

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

it("replays unresolved clause decisions idempotently with deterministic decision IDs", async () => {
  const upload = await request(app)
    .post("/orgs/org-1/policies/upload")
    .set(schemaHeaders)
    .send({
      file_name: "idempotent-decision-policy.txt",
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
  const unresolved = mapped.body.unresolved_clauses.find((clause: any) => clause.clause_id);
  expect(unresolved).toBeTruthy();

  const payload = {
    action: "ignore",
    rationale: "Governance determined this is informational only."
  };

  const first = await request(app)
    .patch(`/orgs/org-1/policies/${policyId}/mapping/unresolved/${unresolved.clause_id}`)
    .set(withSchemaVersion({ "Content-Type": "application/json", "x-role": "ADMIN" }))
    .send(payload);
  expect(first.status).toBe(200);

  const firstMapping = await request(app)
    .get(`/orgs/org-1/policies/${policyId}/mapping`)
    .set({ "x-role": "ADMIN" });
  expect(firstMapping.status).toBe(200);
  const firstClause = firstMapping.body.unresolved_clauses.find((clause: any) => clause.clause_id === unresolved.clause_id);
  expect(firstClause).toBeTruthy();
  const firstDecidedAt = firstClause.decided_at as string;

  const replay = await request(app)
    .patch(`/orgs/org-1/policies/${policyId}/mapping/unresolved/${unresolved.clause_id}`)
    .set(withSchemaVersion({ "Content-Type": "application/json", "x-role": "ADMIN" }))
    .send(payload);
  expect(replay.status).toBe(200);

  const replayMapping = await request(app)
    .get(`/orgs/org-1/policies/${policyId}/mapping`)
    .set({ "x-role": "ADMIN" });
  expect(replayMapping.status).toBe(200);
  const replayClause = replayMapping.body.unresolved_clauses.find((clause: any) => clause.clause_id === unresolved.clause_id);
  expect(replayClause).toBeTruthy();
  expect(replayClause.decided_at).toBe(firstDecidedAt);

  const events = await request(app)
    .get(`/orgs/org-1/compliance/events?policy_id=${policyId}&event_type=unresolved_clause_decided`)
    .set({ "x-role": "ADMIN" });
  expect(events.status).toBe(200);
  const expectedDecisionId = buildDeterministicDecisionId({
    orgId: "org-1",
    policyId,
    mappingId: mapped.body.mapping_id,
    clauseId: unresolved.clause_id,
    action: "ignore",
    rationale: payload.rationale,
    decidedAt: firstDecidedAt
  });
  expect(events.body.events.length).toBeGreaterThanOrEqual(2);
  const matching = events.body.events.filter((event: any) => event.metadata?.clause_id === unresolved.clause_id);
  expect(matching.length).toBeGreaterThanOrEqual(2);
  expect(matching.every((event: any) => event.metadata?.decision_id === expectedDecisionId)).toBe(true);
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
  expect(filtered.body.events.every((event: any) => "source_event_id" in event)).toBe(true);
});

it("updates org compliance mode with admin role and records an event", async () => {
  process.env.ENFORCEMENT_PILOT_ORG_ALLOWLIST = "org-1";
  process.env.ENFORCEMENT_MAX_UNRESOLVED_CLAUSES = "0";

  const response = await request(app)
    .patch("/orgs/org-1/compliance/mode")
    .set(withSchemaVersion({ "Content-Type": "application/json", "x-role": "ADMIN" }))
    .send({
      mode: "enforced",
      rationale: "Pilot org is ready for controlled enforcement."
    });

  expect(response.status).toBe(200);
  expect(response.body.mode).toBe("enforced");
  expect(response.body.source_event_id).toMatch(/^event-/);

  const status = await request(app)
    .get("/orgs/org-1/compliance/status")
    .set({ "x-role": "ADMIN" });
  expect(status.status).toBe(200);
  expect(status.body.mode).toBe("enforced");

  const events = await request(app)
    .get("/orgs/org-1/compliance/events?event_type=compliance_mode_updated")
    .set({ "x-role": "ADMIN" });
  expect(events.status).toBe(200);
  expect(events.body.total_count).toBeGreaterThanOrEqual(1);
});

it("records explicit rollback metadata when mode transitions from enforced to shadow", async () => {
  process.env.ENFORCEMENT_PILOT_ORG_ALLOWLIST = "org-1";
  process.env.ENFORCEMENT_MAX_UNRESOLVED_CLAUSES = "0";

  const enforce = await request(app)
    .patch("/orgs/org-1/compliance/mode")
    .set(withSchemaVersion({ "Content-Type": "application/json", "x-role": "ADMIN" }))
    .send({
      mode: "enforced",
      rationale: "Enable pilot for rollback drill."
    });
  expect(enforce.status).toBe(200);
  expect(enforce.body.rollback).toBe(false);

  const rollback = await request(app)
    .patch("/orgs/org-1/compliance/mode")
    .set(withSchemaVersion({ "Content-Type": "application/json", "x-role": "ADMIN" }))
    .send({
      mode: "shadow",
      rationale: "Rollback drill execution."
    });
  expect(rollback.status).toBe(200);
  expect(rollback.body.mode).toBe("shadow");
  expect(rollback.body.rollback).toBe(true);

  const events = await request(app)
    .get("/orgs/org-1/compliance/events?event_type=compliance_mode_updated")
    .set({ "x-role": "ADMIN" });
  expect(events.status).toBe(200);

  const rollbackEvent = events.body.events.find((event: any) =>
    event.metadata?.previous_mode === "enforced" &&
    event.metadata?.next_mode === "shadow"
  );
  expect(rollbackEvent).toBeTruthy();
  expect(rollbackEvent.metadata.rollback).toBe(true);
  expect(rollbackEvent.metadata.mode_transition).toBe("enforced->shadow");
});

it("exports deterministic compliance events as json and csv", async () => {
  const upload = await request(app)
    .post("/orgs/org-1/policies/upload")
    .set(schemaHeaders)
    .send({
      file_name: "export-policy.txt",
      content: "AI enabled for approved workflows. External sharing disabled."
    });
  expect(upload.status).toBe(201);
  const policyId = upload.body.policy_id as string;

  await request(app)
    .post(`/orgs/org-1/policies/${policyId}/map`)
    .set(schemaHeaders)
    .send({});

  const jsonExport = await request(app)
    .get("/orgs/org-1/compliance/export")
    .set({ "x-role": "ADMIN" });
  expect(jsonExport.status).toBe(200);
  expect(jsonExport.body.total_count).toBeGreaterThan(0);
  expect(jsonExport.body.events[0]).toHaveProperty("created_at_utc");

  const csvExport = await request(app)
    .get("/orgs/org-1/compliance/export?format=csv")
    .set({ "x-role": "ADMIN" });
  expect(csvExport.status).toBe(200);
  expect(csvExport.headers["content-type"]).toContain("text/csv");
  expect(csvExport.text).toContain("created_at_utc");
});

it("replays deterministic export payload when normalized", async () => {
  const upload = await request(app)
    .post("/orgs/org-1/policies/upload")
    .set(schemaHeaders)
    .send({
      file_name: "determinism-policy.txt",
      content: "AI enabled for approved workflows. External sharing disabled."
    });
  expect(upload.status).toBe(201);
  const policyId = upload.body.policy_id as string;

  const map = await request(app)
    .post(`/orgs/org-1/policies/${policyId}/map`)
    .set(schemaHeaders)
    .send({});
  expect(map.status).toBe(200);

  const exportA = await request(app)
    .get("/orgs/org-1/compliance/export")
    .set({ "x-role": "ADMIN" });
  const exportB = await request(app)
    .get("/orgs/org-1/compliance/export")
    .set({ "x-role": "ADMIN" });

  expect(exportA.status).toBe(200);
  expect(exportB.status).toBe(200);

  const normalize = (payload: any) => ({
    org_id: payload.org_id,
    mode: payload.mode,
    total_count: payload.total_count,
    events: payload.events
  });

  expect(normalize(exportA.body)).toEqual(normalize(exportB.body));
});

it("rejects compliance mode update for non-admin role", async () => {
  const response = await request(app)
    .patch("/orgs/org-1/compliance/mode")
    .set(withSchemaVersion({ "Content-Type": "application/json", "x-role": "EXEC_VIEWER" }))
    .send({
      mode: "enforced",
      rationale: "Unauthorized attempt."
    });

  expect(response.status).toBe(403);
});

it("blocks enforced mode for orgs outside enforcement pilot allowlist", async () => {
  process.env.ENFORCEMENT_PILOT_ORG_ALLOWLIST = "org-allowlisted";

  const denied = await request(app)
    .patch("/orgs/org-1/compliance/mode")
    .set(withSchemaVersion({ "Content-Type": "application/json", "x-role": "ADMIN" }))
    .send({
      mode: "enforced",
      rationale: "Should fail because org is not pilot-eligible."
    });

  expect(denied.status).toBe(403);

  const rollback = await request(app)
    .patch("/orgs/org-1/compliance/mode")
    .set(withSchemaVersion({ "Content-Type": "application/json", "x-role": "ADMIN" }))
    .send({
      mode: "shadow",
      rationale: "Rollback to shadow must remain available."
    });
  expect(rollback.status).toBe(200);
  expect(rollback.body.mode).toBe("shadow");
});

it("blocks enforced mode when unresolved clauses exceed threshold", async () => {
  process.env.ENFORCEMENT_PILOT_ORG_ALLOWLIST = "org-1";
  process.env.ENFORCEMENT_MAX_UNRESOLVED_CLAUSES = "0";

  const upload = await request(app)
    .post("/orgs/org-1/policies/upload")
    .set(schemaHeaders)
    .send({
      file_name: "threshold-policy.txt",
      content: "Document quarterly office hours and facilitator reflections for operating cadence."
    });
  const policyId = upload.body.policy_id as string;
  const mapped = await request(app)
    .post(`/orgs/org-1/policies/${policyId}/map`)
    .set(schemaHeaders)
    .send({});
  expect(mapped.status).toBe(200);
  expect(mapped.body.unresolved_clauses.length).toBeGreaterThan(0);

  const denied = await request(app)
    .patch("/orgs/org-1/compliance/mode")
    .set(withSchemaVersion({ "Content-Type": "application/json", "x-role": "ADMIN" }))
    .send({
      mode: "enforced",
      rationale: "Should fail because unresolved clauses are outstanding."
    });

  expect(denied.status).toBe(409);
});

it("emits an auditable event chain for upload, map, unresolved decision, and mode update", async () => {
  process.env.ENFORCEMENT_PILOT_ORG_ALLOWLIST = "org-1";
  process.env.ENFORCEMENT_MAX_UNRESOLVED_CLAUSES = "0";

  const upload = await request(app)
    .post("/orgs/org-1/policies/upload")
    .set(schemaHeaders)
    .send({
      file_name: "audit-chain-policy.txt",
      content: [
        "AI enabled for approved workflows.",
        "Teams should keep facilitator notes for weekly operating rhythm."
      ].join(" ")
    });
  expect(upload.status).toBe(201);
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
      action: "ignore",
      rationale: "Governance review marked this informational for phase 2."
    });
  expect(decision.status).toBe(200);

  const mode = await request(app)
    .patch("/orgs/org-1/compliance/mode")
    .set(withSchemaVersion({ "Content-Type": "application/json", "x-role": "ADMIN" }))
    .send({
      mode: "enforced",
      rationale: "Audit trail validation for test coverage."
    });
  expect(mode.status).toBe(200);

  const events = await request(app)
    .get("/orgs/org-1/compliance/events")
    .set({ "x-role": "ADMIN" });
  expect(events.status).toBe(200);

  const eventTypes = events.body.events.map((event: any) => event.event_type);
  expect(eventTypes).toContain("policy_uploaded");
  expect(eventTypes).toContain("policy_mapped");
  expect(eventTypes).toContain("unresolved_clause_decided");
  expect(eventTypes).toContain("compliance_mode_updated");
  expect(eventTypes).toContain("compliance_status_refreshed");

  const refreshed = events.body.events.find(
    (event: any) => event.event_type === "compliance_status_refreshed" && event.source_event_id
  );
  expect(refreshed).toBeTruthy();
  expect(refreshed.source_event_id).toBeTruthy();
  expect(refreshed.source_event_type).toBeTruthy();
  expect(refreshed.recomputed_at).toBeTruthy();

  const exported = await request(app)
    .get("/orgs/org-1/compliance/export")
    .set({ "x-role": "ADMIN" });
  expect(exported.status).toBe(200);
  const exportedRefreshed = exported.body.events.find(
    (event: any) => event.event_type === "compliance_status_refreshed" && event.source_event_id
  );
  expect(exportedRefreshed).toBeTruthy();
  expect(exportedRefreshed.source_event_id).toBeTruthy();
  expect(exportedRefreshed.source_event_type).toBeTruthy();
});

it("validates compliance mode payload", async () => {
  const response = await request(app)
    .patch("/orgs/org-1/compliance/mode")
    .set(withSchemaVersion({ "Content-Type": "application/json", "x-role": "ADMIN" }))
    .send({
      mode: "invalid-mode"
    });

  expect(response.status).toBe(400);
});

it("enforces beta allowlist for policy and compliance endpoints", async () => {
  process.env.BETA_ORG_ALLOWLIST = "org-allowlisted";

  const uploadDenied = await request(app)
    .post("/orgs/org-1/policies/upload")
    .set(schemaHeaders)
    .send({
      file_name: "policy.txt",
      content: "AI enabled for approved workflows."
    });
  expect(uploadDenied.status).toBe(403);

  const statusDenied = await request(app)
    .get("/orgs/org-1/compliance/status")
    .set({ "x-role": "ADMIN" });
  expect(statusDenied.status).toBe(403);
});
