import request from "supertest";

import { app } from "../src/app";
import { store } from "../src/store";

const schemaHeaders = {
  "x-role": "ADMIN",
  "X-FluencyTracr-Schema-Version": "0.1",
  "Content-Type": "application/json"
};

const evidenceHeaders = {
  "x-role": "EXEC_VIEWER"
};

beforeEach(() => {
  store.reset();
  store.orgs.set("org-1", { id: "org-1", name: "Org", minGroupSize: 1, createdAt: "now" });
});

it("returns suppression-safe not_computed bundle when no org-scoped events exist", async () => {
  const response = await request(app)
    .get("/api/evidence/bundles/org-1?window=weekly")
    .set(evidenceHeaders);

  expect(response.status).toBe(200);
  expect(response.body.schema_version).toBe("evidence_bundle.v1");
  expect(response.body.org_id).toBe("org-1");
  expect(response.body.window).toBe("weekly");
  expect(response.body.suppression.suppression_applied).toBe(false);
  expect(response.body.calibration.verification_presence).toBe("not_computed");
});

it("applies suppression for low cohort size in org-scoped evidence", async () => {
  await request(app)
    .post("/api/events")
    .set(schemaHeaders)
    .send({
      events: [
        {
          event_type: "ai_output_disposition",
          timestamp: new Date().toISOString(),
          risk_class: "high",
          org_unit: "org:org-1",
          workflow_id: "workflow-1",
          disposition: "accepted",
          edit_distance_bucket: "none",
          verification_present: true,
          time_to_action_ms: 900
        }
      ]
    });

  const response = await request(app)
    .get("/api/evidence/bundles/org-1?window=weekly")
    .set(evidenceHeaders);

  expect(response.status).toBe(200);
  expect(response.body.suppression.suppression_applied).toBe(true);
  expect(response.body.suppression.suppression_reasons).toContain("insufficient_population");
  expect(response.body.calibration.verification_presence).toBe("suppressed");
});

it("returns coverage and controls evidence routes with bounded payloads", async () => {
  const coverage = await request(app)
    .get("/api/evidence/coverage/org-1?window=30d")
    .set(evidenceHeaders);
  const controls = await request(app)
    .get("/api/evidence/controls/org-1?window=30d")
    .set(evidenceHeaders);

  expect(coverage.status).toBe(200);
  expect(coverage.body).toHaveProperty("coverage");
  expect(coverage.body).toHaveProperty("suppression");

  expect(controls.status).toBe(200);
  expect(controls.body).toHaveProperty("exposure");
  expect(controls.body).toHaveProperty("calibration");
  expect(controls.body).toHaveProperty("fragility");
  expect(controls.body).toHaveProperty("learning");
});

it("rejects invalid evidence window", async () => {
  const response = await request(app)
    .get("/api/evidence/bundles/org-1?window=bad_window")
    .set(evidenceHeaders);

  expect(response.status).toBe(400);
  expect(response.body.reason_code).toBe("invalid_payload");
  expect(response.body.field_path).toBe("window");
});

