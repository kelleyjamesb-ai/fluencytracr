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

const blueprintWithMissingEvidenceLanes = () => {
  const clone = JSON.parse(JSON.stringify(blueprint));
  clone.source_requirements.source_coverage.ai_activity = "MISSING";
  clone.source_requirements.source_coverage.workflow = "MISSING";
  clone.source_requirements.source_coverage.outcome = "MISSING";
  clone.source_requirements.source_coverage.trust = "MISSING";
  clone.source_requirements.source_coverage.suppression = "MISSING";
  return clone;
};

beforeEach(() => {
  store.reset();
});

describe("AI Value aggregate API push path", () => {
  it("moves sanitized aggregate API-push payloads through V3 ingest, outcome evidence, materializer, and Workspace-readable objects", async () => {
    await request(app)
      .put(`/api/v1/ai-value/objects/blueprint/${blueprintId}`)
      .set(writeAuth)
      .send(blueprintWithMissingEvidenceLanes())
      .expect(201);
    await request(app)
      .put(`/api/v1/ai-value/objects/metrics_library/${metricsLibraryId}`)
      .set(writeAuth)
      .send(metricsLibrary)
      .expect(201);

    const v3Payload = readExample("customer-support-v3-aggregate-ingest-request.json");
    const baselineOutcome = readExample("customer-support-outcome-evidence-api-push-baseline.json");
    const comparisonOutcome = readExample("customer-support-outcome-evidence-api-push-comparison.json");
    const materializerRequest = readExample("customer-support-real-evidence-materializer-request.json");

    const v3 = await request(app)
      .post("/api/v3/ingest/aggregate")
      .set(writeAuth)
      .send(v3Payload);
    expect(v3.status).toBe(202);
    expect(v3.body.verdict.verdict).toBe("SURFACE");
    expect(v3.body.verdict.forwarded_distribution).toMatchObject({
      cohort_id: "cohort-real-evidence",
      workflow_id: "workflow:CHAT",
      privacy: {
        aggregate_only: true,
        person_level_fields_included: false
      }
    });

    await request(app)
      .post("/api/v1/outcome-evidence")
      .set(writeAuth)
      .send(baselineOutcome)
      .expect(201);
    await request(app)
      .post("/api/v1/outcome-evidence")
      .set(writeAuth)
      .send(comparisonOutcome)
      .expect(201);

    const materialized = await request(app)
      .post("/api/v1/ai-value/materialize/real-evidence")
      .set(writeAuth)
      .send(materializerRequest);

    expect(materialized.status).toBe(200);
    expect(materialized.body.customer_facing_economic_output).toBe(false);
    expect(materialized.body.evidence_summary).toMatchObject({
      cohort_id: "cohort-real-evidence",
      workflow_id: "workflow:CHAT",
      forwarded_distribution_used: true,
      velocity_observation_count: 3
    });
    expect(materialized.body.materialized).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ object_type: "evidence_readiness" }),
        expect.objectContaining({ object_type: "outcome_evidence_export" })
      ])
    );

    const readinessId = materialized.body.objects.evidence_readiness.readiness_id;
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
    expect(readiness.body.payload.source_refs).toMatchObject({
      v3_verdict_id: expect.any(String),
      velocity_observations_ref: "velocity_observations:3",
      outcome_evidence_export_id: expect.any(String)
    });

    const listed = await request(app)
      .get("/api/v1/ai-value/objects?type=evidence_readiness")
      .set(readAuth);
    expect(listed.status).toBe(200);
    expect(listed.body.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          object_type: "evidence_readiness",
          object_id: readinessId,
          valid: true
        })
      ])
    );

    const serialized = JSON.stringify({
      v3Payload,
      baselineOutcome,
      comparisonOutcome,
      materializerRequest,
      readiness: readiness.body.payload
    }).toLowerCase();
    for (const forbidden of [
      "user_id",
      "employee_id",
      "raw_prompt",
      "raw_output",
      "transcript",
      "skill_name",
      "raw_rows",
      "action_rows"
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});
