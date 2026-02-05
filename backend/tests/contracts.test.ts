import { app } from "../src/app";
import { store } from "../src/store";
import { requestApp } from "./test_helpers";

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
  const response = await requestApp(app, {
    method: "POST",
    path: "/api/events",
    headers: schemaHeaders,
    body: payload
  });
  const body = response.body as { error?: string; field_path?: string; rule?: string };

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
  const response = await requestApp(app, {
    method: "POST",
    path: "/api/events",
    headers: schemaHeaders,
    body: payload
  });
  const body = response.body as { error?: string; field_path?: string };

  expect(response.status).toBe(400);
  expect(body.error).toBe("Forbidden field");
  expect(body.field_path).toBe("email");
});

it("rejects missing or invalid schema version headers", async () => {
  const missingResponse = await requestApp(app, {
    method: "POST",
    path: "/api/events",
    headers: { "x-role": "ADMIN", "Content-Type": "application/json" },
    body: validEventPayload
  });
  const missingBody = missingResponse.body as { error?: string };

  const invalidResponse = await requestApp(app, {
    method: "POST",
    path: "/api/events",
    headers: { ...schemaHeaders, "X-FluencyTracr-Schema-Version": "0.2" },
    body: validEventPayload
  });
  const invalidBody = invalidResponse.body as { expected?: string[] };

  expect(missingResponse.status).toBe(400);
  expect(missingBody.error).toBe("Invalid schema version");
  expect(invalidResponse.status).toBe(400);
  expect(invalidBody.expected).toEqual(["0.1"]);
});

it("accepts valid payloads with schema version", async () => {
  const response = await requestApp(app, {
    method: "POST",
    path: "/api/events",
    headers: schemaHeaders,
    body: validEventPayload
  });
  const body = response.body as { status?: string; event_ids?: unknown[] };

  expect(response.status).toBe(200);
  expect(body.status).toBe("accepted");
  expect(Array.isArray(body.event_ids)).toBe(true);
});

it("suppresses connector imports under TG5", async () => {
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

  const response = await requestApp(app, {
    method: "POST",
    path: "/orgs/org-1/behavior/connector/import",
    headers: schemaHeaders,
    body: payload
  });

  expect(response.status).toBe(404);
});
