import request from "supertest";

import { app } from "../src/app";
import { store } from "../src/store";

const validHumanEvent = {
  schema_version: "UT_2026_04",
  event_id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  event_name: "UT.HUMAN.DISPOSITION_RECORDED.V1",
  event_category: "HUMAN_INTERACTION",
  org_id: "org-1",
  function_id: "fn_test",
  role_class: "IC",
  ingress_surface: "CHAT",
  event_timestamp: "2026-03-31T18:00:00.000Z",
  window_id: "2026-03-24__2026-03-31",
  trace_axes: ["override", "resolution"],
  correlation_id: "corr_test_1",
  sequence_no: 0,
  workflow_id: "wf_1",
  ambiguity_flag: false,
  payload: {
    disposition: "EDIT",
    edit_magnitude_bucket: "LIGHT",
    verification_requested: true
  }
};

const headersBase = {
  "x-role": "ADMIN",
  "X-FluencyTracr-Schema-Version": "UT_2026_04",
  "Content-Type": "application/json"
};

beforeEach(() => {
  store.reset();
  store.orgs.set("org-1", { id: "org-1", name: "Org", minGroupSize: 1, createdAt: "now" });
  delete process.env.UNIFIED_TELEMETRY_SCHEMA_ACCEPTED_VERSIONS;
});

afterEach(() => {
  delete process.env.FLUENCY_UNIFIED_TELEMETRY_INGEST;
});

it("returns 403 when unified telemetry ingest is disabled", async () => {
  const response = await request(app)
    .post("/api/ingest/unified-telemetry")
    .set({ ...headersBase, "Idempotency-Key": "ut-key-1" })
    .send({ events: [validHumanEvent] });

  expect(response.status).toBe(403);
  expect(response.body.reason_code).toBe("feature_disabled");
});

it("accepts a valid unified telemetry batch when enabled", async () => {
  process.env.FLUENCY_UNIFIED_TELEMETRY_INGEST = "true";

  const response = await request(app)
    .post("/api/ingest/unified-telemetry")
    .set({ ...headersBase, "Idempotency-Key": "ut-key-ok" })
    .send({ events: [validHumanEvent] });

  expect(response.status).toBe(202);
  expect(response.body.accepted_count).toBe(1);
  expect(response.body.rejected_count).toBe(0);
  expect(store.unifiedTelemetryEvents.size).toBe(1);
  expect(store.unifiedTelemetryEvents.get(validHumanEvent.event_id)?.event_name).toBe(
    "UT.HUMAN.DISPOSITION_RECORDED.V1"
  );
});

it("rejects duplicate event_id within the same batch", async () => {
  process.env.FLUENCY_UNIFIED_TELEMETRY_INGEST = "true";

  const response = await request(app)
    .post("/api/ingest/unified-telemetry")
    .set({ ...headersBase, "Idempotency-Key": "ut-dup" })
    .send({ events: [validHumanEvent, { ...validHumanEvent }] });

  expect(response.status).toBe(400);
  expect(response.body.reason_code).toBe("invalid_payload");
  expect(response.body.field_path).toBe("events[1].event_id");
});

it("rejects forbidden fields", async () => {
  process.env.FLUENCY_UNIFIED_TELEMETRY_INGEST = "true";

  const response = await request(app)
    .post("/api/ingest/unified-telemetry")
    .set({ ...headersBase, "Idempotency-Key": "ut-forbidden" })
    .send({
      events: [
        {
          ...validHumanEvent,
          event_id: "a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1",
          message_text: "nope"
        }
      ]
    });

  expect(response.status).toBe(400);
  expect(response.body.reason_code).toBe("forbidden_field");
});

it("replays identical payload for same idempotency key", async () => {
  process.env.FLUENCY_UNIFIED_TELEMETRY_INGEST = "true";

  const first = await request(app)
    .post("/api/ingest/unified-telemetry")
    .set({ ...headersBase, "Idempotency-Key": "ut-idem" })
    .send({ events: [validHumanEvent] });
  const second = await request(app)
    .post("/api/ingest/unified-telemetry")
    .set({ ...headersBase, "Idempotency-Key": "ut-idem" })
    .send({ events: [validHumanEvent] });

  expect(first.status).toBe(202);
  expect(second.status).toBe(202);
  expect(second.body).toEqual(first.body);
  expect(store.unifiedTelemetryEvents.size).toBe(1);
});
