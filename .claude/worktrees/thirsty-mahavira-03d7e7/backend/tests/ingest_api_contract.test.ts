import request from "supertest";

import { app } from "../src/app";
import { store } from "../src/store";

const schemaHeaders = {
  "x-role": "ADMIN",
  "X-FluencyTracr-Schema-Version": "0.1",
  "Content-Type": "application/json"
};

const validEvent = {
  event_type: "verification_signal",
  timestamp: "2026-02-21T12:00:00.000Z",
  risk_class: "medium",
  org_unit: "org:org-1",
  workflow_id: "workflow-1",
  verification_type: "policy_check",
  verification_latency_ms: 1200
};

beforeEach(() => {
  store.reset();
  store.orgs.set("org-1", { id: "org-1", name: "Org", minGroupSize: 1, createdAt: "now" });
  delete process.env.SCHEMA_ACCEPTED_VERSIONS;
  delete process.env.SCHEMA_DEPRECATED_VERSIONS;
});

it("returns ingest receipt contract fields on successful ingest", async () => {
  const response = await request(app)
    .post("/api/ingest")
    .set({ ...schemaHeaders, "Idempotency-Key": "key-1" })
    .send({ events: [validEvent] });

  expect(response.status).toBe(202);
  expect(response.body).toHaveProperty("receipt_id");
  expect(response.body.accepted_count).toBe(1);
  expect(response.body.rejected_count).toBe(0);
  expect(response.body.rejections).toEqual([]);
});

it("rejects missing idempotency key", async () => {
  const response = await request(app)
    .post("/api/ingest")
    .set(schemaHeaders)
    .send({ events: [validEvent] });

  expect(response.status).toBe(400);
  expect(response.body.reason_code).toBe("invalid_payload");
  expect(response.body.field_path).toBe("headers.Idempotency-Key");
});

it("replays identical payload for same idempotency key", async () => {
  const first = await request(app)
    .post("/api/ingest")
    .set({ ...schemaHeaders, "Idempotency-Key": "same-key" })
    .send({ events: [validEvent] });
  const second = await request(app)
    .post("/api/ingest")
    .set({ ...schemaHeaders, "Idempotency-Key": "same-key" })
    .send({ events: [validEvent] });

  expect(first.status).toBe(202);
  expect(second.status).toBe(202);
  expect(second.body).toEqual(first.body);
  expect(store.fluencyEvents.size).toBe(1);
});

it("rejects idempotency key collision with different payload", async () => {
  await request(app)
    .post("/api/ingest")
    .set({ ...schemaHeaders, "Idempotency-Key": "collision-key" })
    .send({ events: [validEvent] });

  const response = await request(app)
    .post("/api/ingest")
    .set({ ...schemaHeaders, "Idempotency-Key": "collision-key" })
    .send({
      events: [
        {
          ...validEvent,
          workflow_id: "workflow-2"
        }
      ]
    });

  expect(response.status).toBe(409);
  expect(response.body.reason_code).toBe("idempotency_conflict");
  expect(response.body.field_path).toBe("headers.Idempotency-Key");
});

it("rejects forbidden fields with explicit reason code", async () => {
  const response = await request(app)
    .post("/api/ingest")
    .set({ ...schemaHeaders, "Idempotency-Key": "forbidden-key" })
    .send({
      events: [
        {
          ...validEvent,
          message_text: "forbidden"
        }
      ]
    });

  expect(response.status).toBe(400);
  expect(response.body.reason_code).toBe("forbidden_field");
  expect(response.body.field_path).toBe("events[0].message_text");
});

