import { readFileSync } from "fs";
import { resolve } from "path";

import request from "supertest";

import { app } from "../src/app";
import { store } from "../src/store";

const ORG_ID = "org-northstar-enterprise";
const writeAuth = { "x-role": "ADMIN", "x-org-id": ORG_ID };
const readAuth = { "x-role": "EXEC_VIEWER", "x-org-id": ORG_ID };

const readExample = (name: string): Record<string, any> =>
  JSON.parse(
    readFileSync(
      resolve(
        __dirname,
        `../../docs/contracts/ai-value-intelligence/examples/${name}`
      ),
      "utf8"
    )
  );

const blueprint = readExample("customer-support-blueprint.json");
const metricsLibrary = readExample("customer-support-metrics-library.json");
const blueprintId = blueprint.blueprint_id as string;
const metricsLibraryId = metricsLibrary.library_id as string;

const withMissingEvidenceLanes = () => {
  const clone = JSON.parse(JSON.stringify(blueprint));
  clone.source_requirements.source_coverage.ai_activity = "MISSING";
  clone.source_requirements.source_coverage.workflow = "MISSING";
  clone.source_requirements.source_coverage.outcome = "MISSING";
  clone.source_requirements.source_coverage.trust = "MISSING";
  clone.source_requirements.source_coverage.suppression = "MISSING";
  return clone;
};

const postUpstreamObjects = async (bp: Record<string, any> = withMissingEvidenceLanes()) => {
  await request(app)
    .put(`/api/v1/ai-value/objects/blueprint/${blueprintId}`)
    .set(writeAuth)
    .send(bp)
    .expect(201);
  await request(app)
    .put(`/api/v1/ai-value/objects/metrics_library/${metricsLibraryId}`)
    .set(writeAuth)
    .send(metricsLibrary)
    .expect(201);
};

const v3Payload = (overrides: Record<string, any> = {}) => ({
  schema_version: "FT_V3_2026_05",
  cohort_id: "cohort-real-evidence",
  workflow_id: "workflow:CHAT",
  window_start: "2026-04-01T00:00:00.000Z",
  window_end: "2026-05-31T00:00:00.000Z",
  cohort_size: 50,
  calibration_id: "scio-prod-60d-2026-05",
  velocity: {
    frequency: { p10: 10, p50: 71, p90: 400, p99: 701 },
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

const postV3Aggregate = (payload: Record<string, any>) =>
  request(app)
    .post("/api/v3/ingest/aggregate")
    .set(writeAuth)
    .send(payload);

const postOutcomeEvidencePair = async () => {
  const base = {
    workflow_id: "customer_support_case_resolution",
    outcome_metric: "support_median_resolution_hours",
    outcome_unit: "hours",
    cohort_size: 2300,
    source_system: "Support case management system"
  };
  await request(app)
    .post("/api/v1/outcome-evidence")
    .set(writeAuth)
    .send({
      ...base,
      period_start: "2026-02-01T00:00:00.000Z",
      period_end: "2026-03-31T00:00:00.000Z",
      aggregate_value: 18.4
    })
    .expect(201);
  await request(app)
    .post("/api/v1/outcome-evidence")
    .set(writeAuth)
    .send({
      ...base,
      period_start: "2026-04-01T00:00:00.000Z",
      period_end: "2026-05-31T00:00:00.000Z",
      aggregate_value: 15.1
    })
    .expect(201);
};

const materialize = () =>
  request(app)
    .post("/api/v1/ai-value/materialize/real-evidence")
    .set(writeAuth)
    .send({
      blueprint_id: blueprintId,
      metrics_library_id: metricsLibraryId,
      cohort_id: "cohort-real-evidence",
      workflow_id: "workflow:CHAT",
      outcome_workflow_id: "customer_support_case_resolution"
    });

beforeEach(() => {
  store.reset();
});

describe("AI Value real evidence materializer", () => {
  it("materializes surfaced aggregate evidence and submitted outcome evidence into AI Value objects", async () => {
    await postUpstreamObjects();
    await postV3Aggregate(v3Payload()).expect(202);
    await postOutcomeEvidencePair();

    const response = await materialize();

    expect(response.status).toBe(200);
    expect(response.body.customer_facing_economic_output).toBe(false);
    expect(response.body.evidence_summary).toMatchObject({
      forwarded_distribution_used: true,
      velocity_observation_count: 3
    });
    expect(response.body.materialized).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ object_type: "evidence_readiness" }),
        expect.objectContaining({ object_type: "outcome_evidence_export" })
      ])
    );

    const readinessId = response.body.objects.evidence_readiness.readiness_id;
    const readiness = await request(app)
      .get(`/api/v1/ai-value/objects/evidence_readiness/${readinessId}`)
      .set(readAuth);

    expect(readiness.status).toBe(200);
    expect(readiness.body.payload.source_coverage).toMatchObject({
      ai_activity: "PRESENT",
      workflow: "PRESENT",
      trust: "PRESENT",
      suppression: "PRESENT",
      outcome: "MISSING"
    });
    expect(readiness.body.payload.source_refs.v3_verdict_id).toEqual(expect.any(String));
    expect(readiness.body.payload.source_refs.outcome_evidence_export_id).toEqual(expect.any(String));

    const exportId = response.body.objects.outcome_evidence_export.export_id;
    const outcomeExport = await request(app)
      .get(`/api/v1/ai-value/objects/outcome_evidence_export/${exportId}`)
      .set(readAuth);

    expect(outcomeExport.status).toBe(200);
    expect(outcomeExport.body.payload.review.review_state).toBe("SUBMITTED");
    expect(outcomeExport.body.payload.metrics[0]).toMatchObject({
      metric_id: "support_median_resolution_hours",
      baseline_value: 18.4,
      comparison_value: 15.1,
      measurement_unit: "hours",
      eligible_population: 2300
    });

    const serialized = JSON.stringify({
      readiness: readiness.body.payload,
      outcomeExport: outcomeExport.body.payload
    }).toLowerCase();
    for (const forbidden of ["user_id", "prompt", "transcript", "skill_name", "raw_rows"]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("materializes legacy surfaced aggregate evidence without surface taxonomy ids", async () => {
    await postUpstreamObjects();
    await postV3Aggregate(v3Payload()).expect(202);
    const storedVerdict = Array.from(store.fluencyTracrVerdicts.values())[0];
    delete (storedVerdict.payload_json.forwarded_distribution as Record<string, unknown>)
      .surface_taxonomy_ids;

    const response = await materialize();

    expect(response.status).toBe(200);
    expect(response.body.evidence_summary).toMatchObject({
      forwarded_distribution_used: true,
      velocity_observation_count: 3
    });
    expect(response.body.objects.evidence_readiness.source_coverage).toMatchObject({
      ai_activity: "PRESENT",
      workflow: "PRESENT",
      trust: "PRESENT",
      suppression: "PRESENT"
    });
  });

  it("keeps surfaced aggregate evidence held when the nested forwarded distribution slice drifts", async () => {
    await postUpstreamObjects();
    await postV3Aggregate(v3Payload()).expect(202);
    const storedVerdict = Array.from(store.fluencyTracrVerdicts.values())[0];
    (storedVerdict.payload_json.forwarded_distribution as Record<string, unknown>).workflow_id =
      "workflow:OTHER";

    const response = await materialize();

    expect(response.status).toBe(200);
    expect(response.body.evidence_summary).toMatchObject({
      forwarded_distribution_used: false,
      velocity_observation_count: 3
    });
    expect(response.body.held_reasons).toEqual(
      expect.arrayContaining([
        expect.stringContaining("forwarded_distribution slice does not match verdict row")
      ])
    );
    expect(response.body.objects.evidence_readiness.source_coverage).toMatchObject({
      ai_activity: "MISSING",
      workflow: "MISSING",
      trust: "MISSING",
      suppression: "MISSING"
    });
  });

  it("keeps surfaced aggregate evidence held when nested forwarded window or calibration drifts", async () => {
    await postUpstreamObjects();
    await postV3Aggregate(v3Payload()).expect(202);
    const storedVerdict = Array.from(store.fluencyTracrVerdicts.values())[0];
    Object.assign(storedVerdict.payload_json.forwarded_distribution as Record<string, unknown>, {
      window_start: "2026-04-02T00:00:00.000Z",
      calibration_id: "scio-prod-60d-2026-06"
    });

    const response = await materialize();

    expect(response.status).toBe(200);
    expect(response.body.evidence_summary).toMatchObject({
      forwarded_distribution_used: false,
      velocity_observation_count: 3
    });
    expect(response.body.held_reasons).toEqual(
      expect.arrayContaining([
        expect.stringContaining("forwarded_distribution slice does not match verdict row")
      ])
    );
    expect(response.body.objects.evidence_readiness.source_coverage).toMatchObject({
      ai_activity: "MISSING",
      workflow: "MISSING",
      trust: "MISSING",
      suppression: "MISSING"
    });
  });

  it("keeps suppressed aggregate evidence from upgrading source coverage", async () => {
    await postUpstreamObjects();
    await postV3Aggregate(v3Payload({ cohort_size: 4 })).expect(202);

    const response = await materialize();

    expect(response.status).toBe(200);
    expect(response.body.held_reasons).toEqual(
      expect.arrayContaining([expect.stringContaining("V3 verdict is SUPPRESS")])
    );
    expect(response.body.objects.evidence_readiness.source_coverage).toMatchObject({
      ai_activity: "MISSING",
      workflow: "MISSING",
      trust: "MISSING",
      suppression: "MISSING"
    });
  });

  it("keeps missing aggregate evidence held instead of synthesizing readiness upgrades", async () => {
    await postUpstreamObjects();

    const response = await materialize();

    expect(response.status).toBe(200);
    expect(response.body.evidence_summary).toMatchObject({
      v3_verdict_id: null,
      v3_verdict: null,
      forwarded_distribution_used: false
    });
    expect(response.body.held_reasons).toEqual(
      expect.arrayContaining([expect.stringContaining("V3 verdict is missing")])
    );
    expect(response.body.objects.evidence_readiness.source_coverage).toMatchObject({
      ai_activity: "MISSING",
      workflow: "MISSING",
      trust: "MISSING",
      suppression: "MISSING"
    });
  });

  it("does not upgrade trust from surfaced aggregate evidence without verification or recovery", async () => {
    await postUpstreamObjects();
    await postV3Aggregate(v3Payload({
      quality_signals: {
        completion_rate: 0.92,
        error_rate: 0,
        abandonment_rate: 0,
        recovery_rate: 0,
        verification_rate: 0,
        p50_latency_ms: 1000,
        p95_latency_ms: 3000
      }
    })).expect(202);

    const response = await materialize();

    expect(response.status).toBe(200);
    expect(response.body.held_reasons).toEqual(
      expect.arrayContaining([expect.stringContaining("trust lane held")])
    );
    expect(response.body.objects.evidence_readiness.source_coverage).toMatchObject({
      ai_activity: "PRESENT",
      workflow: "PRESENT",
      trust: "MISSING",
      suppression: "PRESENT"
    });
  });

  it("keeps misaligned outcome evidence held instead of materializing an export", async () => {
    await postUpstreamObjects();
    await postV3Aggregate(v3Payload()).expect(202);

    const base = {
      workflow_id: "customer_support_case_resolution",
      outcome_metric: "support_median_resolution_hours",
      outcome_unit: "hours",
      cohort_size: 2300,
      source_system: "Unapproved support extract"
    };
    await request(app)
      .post("/api/v1/outcome-evidence")
      .set(writeAuth)
      .send({
        ...base,
        period_start: "2026-02-01T00:00:00.000Z",
        period_end: "2026-03-31T00:00:00.000Z",
        aggregate_value: 18.4
      })
      .expect(201);
    await request(app)
      .post("/api/v1/outcome-evidence")
      .set(writeAuth)
      .send({
        ...base,
        period_start: "2026-04-01T00:00:00.000Z",
        period_end: "2026-05-31T00:00:00.000Z",
        aggregate_value: 15.1
      })
      .expect(201);

    const response = await materialize();

    expect(response.status).toBe(200);
    expect(response.body.materialized).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ object_type: "outcome_evidence_export" })
      ])
    );
    expect(response.body.objects.outcome_evidence_export).toBeUndefined();
    expect(response.body.held_reasons).toEqual(
      expect.arrayContaining([
        expect.stringContaining("no paired baseline/comparison evidence aligned to the metrics library")
      ])
    );
    expect(response.body.objects.evidence_readiness.source_coverage.outcome).toBe("MISSING");
  });
});
