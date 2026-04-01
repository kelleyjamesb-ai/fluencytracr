import request from "supertest";

import { app } from "../src/app";
import { store } from "../src/store";

const schemaHeaders = {
  "x-role": "ADMIN",
  "X-FluencyTracr-Schema-Version": "0.1",
  "Content-Type": "application/json"
};

const validEventPayload = {
  events: [
    {
      event_type: "ai_output_disposition",
      timestamp: "2024-01-01T00:00:00.000Z",
      risk_class: "low",
      workflow_id: "workflow-1",
      disposition: "accepted",
      edit_distance_bucket: "none",
      verification_present: true,
      time_to_action_ms: 1200
    }
  ]
};

beforeEach(() => {
  store.reset();
  store.orgs.set("org-1", { id: "org-1", name: "Org", minGroupSize: 1, createdAt: "now" });
  delete process.env.SCHEMA_ACCEPTED_VERSIONS;
  delete process.env.SCHEMA_DEPRECATED_VERSIONS;
});

it("rejects forbidden fields nested in payload", async () => {
  const payload = {
    events: [
      {
        ...validEventPayload.events[0],
        message_text: "nope"
      }
    ]
  };
  const response = await request(app)
    .post("/api/events")
    .set(schemaHeaders)
    .send(payload);
  const body = response.body;

  expect(response.status).toBe(400);
  expect(body.error).toBe("Forbidden field");
  expect(body.field_path).toBe("events[0].message_text");
  expect(body.rule).toBe("no_raw_content_or_direct_identifiers");
});

it("rejects forbidden identifiers in payload", async () => {
  const payload = {
    email: "user@example.com",
    ...validEventPayload
  };
  const response = await request(app)
    .post("/api/events")
    .set(schemaHeaders)
    .send(payload);
  const body = response.body;

  expect(response.status).toBe(400);
  expect(body.error).toBe("Forbidden field");
  expect(body.field_path).toBe("email");
});

it("rejects missing or invalid schema version headers", async () => {
  const missingResponse = await request(app)
    .post("/api/events")
    .set({ "x-role": "ADMIN", "Content-Type": "application/json" })
    .send(validEventPayload);
  const missingBody = missingResponse.body;

  const invalidResponse = await request(app)
    .post("/api/events")
    .set({ ...schemaHeaders, "X-FluencyTracr-Schema-Version": "0.2" })
    .send(validEventPayload);
  const invalidBody = invalidResponse.body;

  expect(missingResponse.status).toBe(400);
  expect(missingBody.error).toBe("Invalid schema version");
  expect(invalidResponse.status).toBe(400);
  expect(invalidBody.expected).toEqual(["0.1"]);
});

it("accepts valid payloads with schema version", async () => {
  const response = await request(app)
    .post("/api/events")
    .set(schemaHeaders)
    .send(validEventPayload);
  const body = response.body;

  expect(response.status).toBe(200);
  expect(body.ingested).toBe(1);
  expect(body.execution_ids).toHaveLength(1);
  expect(typeof body.execution_ids[0]).toBe("string");
});

it("rejects traces reconstructed query without workflow_id or execution_id", async () => {
  const response = await request(app)
    .get("/api/traces/reconstructed")
    .set({ "x-role": "ADMIN" });
  expect(response.status).toBe(400);
});

it("returns reconstructed traces for workflow_id", async () => {
  await request(app).post("/api/events").set(schemaHeaders).send({
    events: [
      {
        event_type: "ai_output_disposition",
        timestamp: "2024-01-01T00:00:00.000Z",
        risk_class: "low",
        workflow_id: "workflow-trace-1",
        disposition: "rejected",
        edit_distance_bucket: "none",
        verification_present: false,
        time_to_action_ms: 100,
        run_id: "run-xyz"
      },
      {
        event_type: "ai_output_disposition",
        timestamp: "2024-01-01T00:05:00.000Z",
        risk_class: "low",
        workflow_id: "workflow-trace-1",
        disposition: "accepted",
        edit_distance_bucket: "none",
        verification_present: false,
        time_to_action_ms: 100,
        run_id: "run-xyz"
      }
    ]
  });

  const response = await request(app)
    .get("/api/traces/reconstructed?workflow_id=workflow-trace-1")
    .set({ "x-role": "ADMIN" });

  expect(response.status).toBe(200);
  expect(response.body.traces).toHaveLength(1);
  expect(response.body.traces[0].execution_id).toContain("run-xyz");
  expect(response.body.traces[0].retry_sequences.length).toBeGreaterThanOrEqual(1);
});

it("returns signals and pattern when include_signals=true and disclosure ALLOWED (>=2 events)", async () => {
  await request(app).post("/api/events").set(schemaHeaders).send({
    events: [
      {
        event_type: "ai_output_disposition",
        timestamp: "2024-01-02T00:00:00.000Z",
        risk_class: "low",
        workflow_id: "workflow-phase2",
        disposition: "accepted",
        edit_distance_bucket: "none",
        verification_present: true,
        time_to_action_ms: 100,
        run_id: "run-p2"
      },
      {
        event_type: "verification_signal",
        timestamp: "2024-01-02T00:01:00.000Z",
        risk_class: "low",
        workflow_id: "workflow-phase2",
        verification_type: "policy_check",
        verification_latency_ms: 50,
        run_id: "run-p2"
      }
    ]
  });

  const response = await request(app)
    .get("/api/traces/reconstructed?workflow_id=workflow-phase2&include_signals=true")
    .set({ "x-role": "ADMIN" });

  expect(response.status).toBe(200);
  expect(response.body.traces).toHaveLength(1);
  expect(response.body.traces[0].disclosure.state).toBe("ALLOWED");
  expect(response.body.traces[0].disclosure.reasons).toEqual([]);
  expect(response.body.traces[0].pattern).toBe("Calibrated Fluency");
  expect(response.body.traces[0].signals).toMatchObject({
    event_count: 2,
    verification_present: true
  });
  expect(response.body.traces[0].pattern_confidence_tier).toBe("medium");
});

it("suppresses interpretive fields when include_signals=true and disclosure rules fail", async () => {
  await request(app).post("/api/events").set(schemaHeaders).send({
    events: [
      {
        event_type: "ai_output_disposition",
        timestamp: "2024-01-03T00:00:00.000Z",
        risk_class: "low",
        workflow_id: "workflow-phase3-suppress",
        disposition: "accepted",
        edit_distance_bucket: "none",
        verification_present: true,
        time_to_action_ms: 100,
        run_id: "run-single"
      }
    ]
  });

  const response = await request(app)
    .get("/api/traces/reconstructed?workflow_id=workflow-phase3-suppress&include_signals=true")
    .set({ "x-role": "ADMIN" });

  expect(response.status).toBe(200);
  expect(response.body.traces[0].disclosure.state).toBe("SUPPRESSED");
  expect(response.body.traces[0].disclosure.reasons).toContain("insufficient_event_count");
  expect(response.body.traces[0].disclosure.reasons).toContain("low_confidence_tier");
  expect(response.body.traces[0].pattern).toBeNull();
  expect(response.body.traces[0].signals).toBeNull();
  expect(response.body.traces[0].pattern_confidence_tier).toBeNull();
  expect(response.body.traces[0].ordered_event_ids.length).toBe(1);
});

it("accepts configured compatibility versions and marks deprecated versions", async () => {
  process.env.SCHEMA_ACCEPTED_VERSIONS = "0.1,0.2";
  process.env.SCHEMA_DEPRECATED_VERSIONS = "0.1";
  const response = await request(app)
    .post("/api/events")
    .set({ ...schemaHeaders, "X-FluencyTracr-Schema-Version": "0.1" })
    .send(validEventPayload);
  const body = response.body;

  expect(response.status).toBe(200);
  expect(body.ingested).toBe(1);
  expect(response.headers["x-fluencytracr-schema-deprecated"]).toBe("true");
});

it("quarantines connector events with unknown event types", async () => {
  const payload = {
    vendor: "example-chat-vendor",
    connector_name: "chat-tool-connector",
    org_id: "org-1",
    group_id: "org-1",
    group_type: "org",
    bucket_start: "2024-01-01",
    events: [
      {
        event_type: "chat.unknown",
        timestamp: "2024-01-01T00:00:00.000Z"
      }
    ]
  };

  const response = await request(app)
    .post("/orgs/org-1/behavior/connector/import")
    .set(schemaHeaders)
    .send(payload);
  const body = response.body;

  expect(response.status).toBe(202);
  expect(body.status).toBe("quarantined");
  expect(body.quarantined_count).toBe(1);
  expect(body.unknown_event_types).toEqual(["chat.unknown"]);

  const quarantines = Array.from(store.connectorEventQuarantine.values());
  expect(quarantines.length).toBe(1);
  expect(quarantines[0].unknown_event_types).toEqual(["chat.unknown"]);
  expect(quarantines[0].sample_events[0].event_type).toBe("chat.unknown");
});

it("quarantines connector events that fail mapping validation", async () => {
  const payload = {
    vendor: "example-chat-vendor",
    connector_name: "chat-tool-connector",
    org_id: "org-1",
    group_id: "org-1",
    group_type: "org",
    bucket_start: "2024-01-01",
    events: [
      {
        event_type: "chat.action.executed",
        timestamp: "2024-01-01T00:00:00.000Z",
        action: {
          type: "execute_external",
          side_effect_occurred: false
        }
      }
    ]
  };

  const response = await request(app)
    .post("/orgs/org-1/behavior/connector/import")
    .set(schemaHeaders)
    .send(payload);
  const body = response.body;

  expect(response.status).toBe(202);
  expect(body.status).toBe("quarantined");
  expect(body.invalid_event_types).toEqual(["chat.action.executed"]);

  const quarantines = Array.from(store.connectorEventQuarantine.values());
  expect(quarantines.length).toBe(1);
  expect(quarantines[0].invalid_event_types).toEqual(["chat.action.executed"]);
  expect(quarantines[0].invalid_sample_events?.[0].reason).toBe("missing_external_side_effect");
});
