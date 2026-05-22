import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";

import { app } from "../src/app";
import { loadCalibrationBaselines } from "../src/value_realization/calibration_registry";
import { store } from "../src/store";

const headers = {
  "x-role": "ADMIN",
  "x-org-id": "org-v3",
  "Content-Type": "application/json"
};

const baseDistribution = {
  p10: 10,
  p50: 71,
  p90: 400,
  p99: 701
};

const validPayload = (overrides: Record<string, unknown> = {}) => ({
  schema_version: "FT_V3_2026_05",
  cohort_id: "cohort-enterprise-aiom",
  workflow_id: "workflow:CHAT",
  window_start: "2026-02-21T00:00:00.000Z",
  window_end: "2026-05-22T00:00:00.000Z",
  cohort_size: 50,
  calibration_id: "scio-prod-60d-2026-05",
  velocity: {
    frequency: baseDistribution,
    engagement: { p10: 30, p50: 61, p90: 61, p99: 61 },
    breadth: { p10: 3, p50: 7, p90: 10, p99: 12 }
  },
  quality_signals: {
    completion_rate: 0.92,
    error_rate: 0.03,
    abandonment_rate: 0.01,
    recovery_rate: 0.8,
    verification_rate: 0.4,
    p50_latency_ms: 1000,
    p95_latency_ms: 3000
  },
  privacy: { person_level_fields_included: false },
  ...overrides
});

beforeEach(() => {
  store.reset();
});

describe("V3 calibration baselines", () => {
  it("lists governed calibration baselines", async () => {
    const res = await request(app)
      .get("/api/v3/calibration/baselines")
      .set({ "x-role": "EXEC_VIEWER", "x-org-id": "org-v3" });

    expect(res.status).toBe(200);
    expect(res.body.baselines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          calibration_id: "scio-prod-60d-2026-05",
          frequency_p50: 71
        })
      ])
    );
  });

  it("validates baseline files on load", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fluencytracr-baselines-"));
    fs.writeFileSync(
      path.join(dir, "broken.json"),
      JSON.stringify({ calibration_id: "broken", frequency_p50: 0 })
    );

    expect(() => loadCalibrationBaselines(dir)).toThrow(/invalid calibration baseline/);
  });
});

describe("POST /api/v3/ingest/aggregate", () => {
  it("accepts aggregate-only payloads, stores immutable verdicts, and feeds velocity replay", async () => {
    const res = await request(app)
      .post("/api/v3/ingest/aggregate")
      .set(headers)
      .send(validPayload());

    expect(res.status).toBe(202);
    expect(res.body.verdict).toMatchObject({
      cohort_id: "cohort-enterprise-aiom",
      workflow_id: "workflow:CHAT",
      verdict: "SURFACE",
      suppression_reason: null,
      calibration_id: "scio-prod-60d-2026-05",
      velocity_index: 1
    });

    const verdicts = await request(app)
      .get("/api/v3/verdicts?cohort_id=cohort-enterprise-aiom")
      .set({ "x-role": "EXEC_VIEWER", "x-org-id": "org-v3" });

    expect(verdicts.status).toBe(200);
    expect(verdicts.body.verdicts).toHaveLength(1);
    expect(verdicts.body.verdicts[0].quality_multiplier).toBeGreaterThan(1);

    const velocity = await request(app)
      .get("/api/v2/velocity-index?workflow_id=workflow:CHAT&window_days=60")
      .set({ "x-role": "EXEC_VIEWER", "x-org-id": "org-v3" });

    expect(velocity.status).toBe(200);
    expect(velocity.body.verdict).toBe("SURFACE");
    expect(velocity.body.velocity_index).toBe(1);
  });

  it("rejects person-level fields at the boundary", async () => {
    const res = await request(app)
      .post("/api/v3/ingest/aggregate")
      .set(headers)
      .send({ ...validPayload(), user_id: "person-123" });

    expect(res.status).toBe(400);
    expect(res.body.reason_code).toBe("person_level_field_rejected");
  });

  it("rejects unknown calibration ids", async () => {
    const res = await request(app)
      .post("/api/v3/ingest/aggregate")
      .set(headers)
      .send(validPayload({ calibration_id: "unknown-baseline" }));

    expect(res.status).toBe(400);
    expect(res.body.reason_code).toBe("unknown_calibration_id");
  });

  it("keeps verdicts immutable once written", async () => {
    const first = await request(app)
      .post("/api/v3/ingest/aggregate")
      .set(headers)
      .send(validPayload());
    expect(first.status).toBe(202);

    const second = await request(app)
      .post("/api/v3/ingest/aggregate")
      .set(headers)
      .send(validPayload({ quality_signals: { ...validPayload().quality_signals, completion_rate: 0.1 } }));

    expect(second.status).toBe(409);
    expect(second.body.reason_code).toBe("verdict_already_exists");

    const verdicts = await request(app)
      .get("/api/v3/verdicts?cohort_id=cohort-enterprise-aiom")
      .set({ "x-role": "EXEC_VIEWER", "x-org-id": "org-v3" });
    expect(verdicts.body.verdicts).toHaveLength(1);
    expect(verdicts.body.verdicts[0].quality_multiplier).toBe(first.body.verdict.quality_multiplier);
  });

  it("fails closed for sparse aggregate cohorts", async () => {
    const res = await request(app)
      .post("/api/v3/ingest/aggregate")
      .set(headers)
      .send(validPayload({ cohort_size: 4, workflow_id: "workflow:SPARSE" }));

    expect(res.status).toBe(202);
    expect(res.body.verdict.verdict).toBe("SUPPRESS");
    expect(res.body.verdict.suppression_reason).toBe("INSUFFICIENT_VOLUME");
    expect(res.body.verdict.velocity_index).toBeNull();
  });

  it("documents the verdict persistence table migration", () => {
    const migrationSql = fs.readFileSync(
      path.resolve(
        __dirname,
        "../prisma/migrations/20260522170000_add_v3_fluencytracr_verdicts/migration.sql"
      ),
      "utf8"
    );

    expect(migrationSql).toContain('CREATE TABLE IF NOT EXISTS "fluencytracr_verdicts"');
    expect(migrationSql).toContain("fluencytracr_verdicts_immutable_key");
    expect(migrationSql).toContain("INSUFFICIENT_VOLUME");
  });
});
