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
