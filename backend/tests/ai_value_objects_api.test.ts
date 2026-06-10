import { readFileSync } from "fs";
import { resolve } from "path";

import request from "supertest";

import { app } from "../src/app";
import { store } from "../src/store";

const ORG_ID = "org-northstar-enterprise";
const writeAuth = { "x-role": "ADMIN", "x-org-id": ORG_ID };
const readAuth = { "x-role": "EXEC_VIEWER", "x-org-id": ORG_ID };
const otherOrgAuth = { "x-role": "ADMIN", "x-org-id": "org-2" };

const readExample = (name: string): Record<string, unknown> =>
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

beforeEach(() => {
  store.reset();
});

describe("AI value object API", () => {
  it("stores a valid blueprint and returns its validation snapshot", async () => {
    const response = await request(app)
      .put(`/api/v1/ai-value/objects/blueprint/${blueprintId}`)
      .set(writeAuth)
      .send(blueprint);

    expect(response.status).toBe(201);
    expect(response.body.object_type).toBe("blueprint");
    expect(response.body.object_id).toBe(blueprintId);
    expect(response.body.valid).toBe(true);
    expect(response.body.workflow_family).toBe("customer_support_case_resolution");

    const fetched = await request(app)
      .get(`/api/v1/ai-value/objects/blueprint/${blueprintId}`)
      .set(readAuth);
    expect(fetched.status).toBe(200);
    expect(fetched.body.payload.blueprint_id).toBe(blueprintId);
  });

  it("fails closed: an invalid blueprint is rejected and never stored", async () => {
    const broken = { ...blueprint, value_routes: undefined, blueprint_id: "bp_broken" };
    const response = await request(app)
      .put("/api/v1/ai-value/objects/blueprint/bp_broken")
      .set(writeAuth)
      .send(broken);

    expect(response.status).toBe(422);
    expect(response.body.reason).toBe("ENGINE_VALIDATION_FAILED");
    expect(response.body.gaps.length).toBeGreaterThan(0);

    const fetched = await request(app)
      .get("/api/v1/ai-value/objects/blueprint/bp_broken")
      .set(readAuth);
    expect(fetched.status).toBe(404);
  });

  it("rejects payloads with forbidden person-level fields", async () => {
    const tainted = JSON.parse(JSON.stringify(blueprint));
    tainted.process_discovery.employee_email = "someone@example.com";
    const response = await request(app)
      .put(`/api/v1/ai-value/objects/blueprint/${blueprintId}`)
      .set(writeAuth)
      .send(tainted);

    expect(response.status).toBe(422);
    expect(
      response.body.gaps.some((gap: string) => gap.includes("Forbidden field"))
    ).toBe(true);
  });

  it("rejects object id mismatches and unknown object types", async () => {
    const mismatch = await request(app)
      .put("/api/v1/ai-value/objects/blueprint/some_other_id")
      .set(writeAuth)
      .send(blueprint);
    expect(mismatch.status).toBe(400);
    expect(mismatch.body.reason).toBe("OBJECT_ID_MISMATCH");

    const unknown = await request(app)
      .put("/api/v1/ai-value/objects/not_a_type/x")
      .set(writeAuth)
      .send({});
    expect(unknown.status).toBe(400);
    expect(unknown.body.reason).toBe("UNKNOWN_OBJECT_TYPE");
  });

  it("requires a write role for upserts", async () => {
    const response = await request(app)
      .put(`/api/v1/ai-value/objects/blueprint/${blueprintId}`)
      .set(readAuth)
      .send(blueprint);
    expect(response.status).toBe(403);
  });

  it("scopes objects to the authenticated org", async () => {
    await request(app)
      .put(`/api/v1/ai-value/objects/blueprint/${blueprintId}`)
      .set(writeAuth)
      .send(blueprint)
      .expect(201);

    const crossOrg = await request(app)
      .get(`/api/v1/ai-value/objects/blueprint/${blueprintId}`)
      .set(otherOrgAuth);
    expect(crossOrg.status).toBe(404);
  });

  it("lists stored objects filtered by type", async () => {
    await request(app)
      .put(`/api/v1/ai-value/objects/blueprint/${blueprintId}`)
      .set(writeAuth)
      .send(blueprint)
      .expect(201);
    await request(app)
      .put(`/api/v1/ai-value/objects/metrics_library/${metricsLibraryId}`)
      .set(writeAuth)
      .send(metricsLibrary)
      .expect(201);

    const all = await request(app).get("/api/v1/ai-value/objects").set(readAuth);
    expect(all.status).toBe(200);
    expect(all.body.objects).toHaveLength(2);

    const filtered = await request(app)
      .get("/api/v1/ai-value/objects?object_type=blueprint")
      .set(readAuth);
    expect(filtered.body.objects).toHaveLength(1);
    expect(filtered.body.objects[0].object_type).toBe("blueprint");
  });
});

describe("AI value spine run API", () => {
  const storeUpstreamObjects = async () => {
    await request(app)
      .put(`/api/v1/ai-value/objects/blueprint/${blueprintId}`)
      .set(writeAuth)
      .send(blueprint)
      .expect(201);
    await request(app)
      .put(`/api/v1/ai-value/objects/metrics_library/${metricsLibraryId}`)
      .set(writeAuth)
      .send(metricsLibrary)
      .expect(201);
  };

  it("runs the spine from stored objects and persists validated stage outputs", async () => {
    await storeUpstreamObjects();

    const response = await request(app)
      .post("/api/v1/ai-value/spine/run")
      .set(writeAuth)
      .send({ blueprint_id: blueprintId, metrics_library_id: metricsLibraryId });

    expect(response.status).toBe(200);
    expect(response.body.run.halted_at).toBeNull();
    expect(response.body.run.decision).toBe("HOLD_FOR_ASSUMPTIONS");
    expect(response.body.run.customer_facing_economic_output).toBe(false);
    expect(response.body.persisted).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ object_type: "value_scenario" }),
        expect.objectContaining({ object_type: "evidence_readiness" }),
        expect.objectContaining({ object_type: "claim_boundary" }),
        expect.objectContaining({ object_type: "executive_packet" })
      ])
    );

    const readiness = await request(app)
      .get(
        "/api/v1/ai-value/objects/evidence_readiness/readiness_customer_support_case_resolution_v1"
      )
      .set(readAuth);
    expect(readiness.status).toBe(200);
    expect(readiness.body.valid).toBe(true);
    expect(readiness.body.payload.decision).toBe("HOLD_FOR_ASSUMPTIONS");
  });

  it("does not persist stage outputs when persist is false", async () => {
    await storeUpstreamObjects();

    const response = await request(app)
      .post("/api/v1/ai-value/spine/run")
      .set(writeAuth)
      .send({
        blueprint_id: blueprintId,
        metrics_library_id: metricsLibraryId,
        persist: false
      });
    expect(response.status).toBe(200);
    expect(response.body.persisted).toEqual([]);

    const list = await request(app)
      .get("/api/v1/ai-value/objects?object_type=evidence_readiness")
      .set(readAuth);
    expect(list.body.objects).toHaveLength(0);
  });

  it("returns 404 when upstream objects are missing", async () => {
    const response = await request(app)
      .post("/api/v1/ai-value/spine/run")
      .set(writeAuth)
      .send({ blueprint_id: "missing", metrics_library_id: "also_missing" });
    expect(response.status).toBe(404);
    expect(response.body.reason).toBe("OBJECT_NOT_FOUND");
  });

  it("accepts a workshop intake and runs a second domain end to end", async () => {
    const intake = readExample("sales-pipeline-workshop-intake.json");
    const salesLibrary = readExample("sales-pipeline-metrics-library.json");

    const intakeResponse = await request(app)
      .post("/api/v1/ai-value/intake/workshop")
      .set(writeAuth)
      .send(intake);
    expect(intakeResponse.status).toBe(201);
    expect(intakeResponse.body.blueprint.object_id).toBe("bp_sales_pipeline_hygiene");
    expect(intakeResponse.body.blueprint.valid).toBe(true);

    await request(app)
      .put(`/api/v1/ai-value/objects/metrics_library/${salesLibrary.library_id}`)
      .set(writeAuth)
      .send(salesLibrary)
      .expect(201);

    const run = await request(app)
      .post("/api/v1/ai-value/spine/run")
      .set(writeAuth)
      .send({
        blueprint_id: "bp_sales_pipeline_hygiene",
        metrics_library_id: salesLibrary.library_id
      });
    expect(run.status).toBe(200);
    expect(run.body.run.decision).toBe("READY_FOR_EXECUTIVE_VALIDATION");
    expect(run.body.run.halted_at).toBeNull();
  });

  it("fails closed on incomplete workshop intakes", async () => {
    const response = await request(app)
      .post("/api/v1/ai-value/intake/workshop")
      .set(writeAuth)
      .send({ intake_id: "broken", org_id: ORG_ID });
    expect(response.status).toBe(422);
    expect(response.body.reason).toBe("INTAKE_VALIDATION_FAILED");

    const list = await request(app)
      .get("/api/v1/ai-value/objects?object_type=blueprint")
      .set(readAuth);
    expect(list.body.objects).toHaveLength(0);
  });

  it("runs the full value chain from engagement and fluency kickoff to packet", async () => {
    await storeUpstreamObjects();
    const engagement = readExample("customer-support-engagement.json");
    const fluencyBaseline = readExample("customer-support-fluency-baseline.json");

    await request(app)
      .put(`/api/v1/ai-value/objects/engagement/${engagement.engagement_id}`)
      .set(writeAuth)
      .send(engagement)
      .expect(201);
    await request(app)
      .put(`/api/v1/ai-value/objects/fluency_baseline/${fluencyBaseline.baseline_id}`)
      .set(writeAuth)
      .send(fluencyBaseline)
      .expect(201);

    const response = await request(app)
      .post("/api/v1/ai-value/value-chain/run")
      .set(writeAuth)
      .send({
        engagement_id: engagement.engagement_id,
        fluency_baseline_id: fluencyBaseline.baseline_id,
        blueprint_id: blueprintId,
        metrics_library_id: metricsLibraryId
      });

    expect(response.status).toBe(200);
    expect(response.body.run.engagement.status).toBe("VALID");
    expect(response.body.run.engagement.covers_workflow_family).toBe(true);
    expect(response.body.run.fluency_baseline.status).toBe("VALID");
    expect(response.body.run.fluency_baseline.summary.suppressed_cohorts).toBe(1);
    expect(response.body.run.spine.halted_at).toBeNull();
    expect(response.body.persisted.length).toBe(4);
  });

  it("rejects fluency baselines with respondent identifiers", async () => {
    const fluencyBaseline = readExample("customer-support-fluency-baseline.json");
    const tainted = JSON.parse(JSON.stringify(fluencyBaseline));
    tainted.cohorts[0].respondent_ids = ["r-1"];
    const response = await request(app)
      .put(`/api/v1/ai-value/objects/fluency_baseline/${tainted.baseline_id}`)
      .set(writeAuth)
      .send(tainted);
    expect(response.status).toBe(422);
    expect(
      response.body.gaps.some((gap: string) => gap.includes("Forbidden field"))
    ).toBe(true);
  });

  it("runs the evidence lifecycle: submit, accept, attach to the chain", async () => {
    const evidenceGapBlueprint = JSON.parse(JSON.stringify(blueprint));
    evidenceGapBlueprint.source_requirements.source_coverage.outcome = "MISSING";
    await request(app)
      .put(`/api/v1/ai-value/objects/blueprint/${blueprintId}`)
      .set(writeAuth)
      .send(evidenceGapBlueprint)
      .expect(201);
    await request(app)
      .put(`/api/v1/ai-value/objects/metrics_library/${metricsLibraryId}`)
      .set(writeAuth)
      .send(metricsLibrary)
      .expect(201);

    const outcomeExport = readExample("customer-support-outcome-evidence-export.json");
    // Self-asserted acceptance must be ignored: uploads enter as SUBMITTED.
    const selfAccepted = JSON.parse(JSON.stringify(outcomeExport));
    selfAccepted.review = {
      review_state: "ACCEPTED",
      reviewer_role: "self",
      reviewed_at: "2026-06-10T00:00:00.000Z"
    };
    const submitted = await request(app)
      .put(`/api/v1/ai-value/objects/outcome_evidence_export/${outcomeExport.export_id}`)
      .set(writeAuth)
      .send(selfAccepted);
    expect(submitted.status).toBe(201);
    expect(submitted.body.validation.review_state).toBe("SUBMITTED");

    // Without acceptance, evidence is pending and the chain holds for coverage.
    const pendingRun = await request(app)
      .post("/api/v1/ai-value/value-chain/run")
      .set(writeAuth)
      .send({
        blueprint_id: blueprintId,
        metrics_library_id: metricsLibraryId,
        outcome_evidence_export_id: outcomeExport.export_id,
        persist: false
      });
    expect(pendingRun.status).toBe(200);
    expect(pendingRun.body.run.outcome_evidence.status).toBe("HELD");
    expect(pendingRun.body.run.decision).toBe("HOLD_FOR_SOURCE_COVERAGE");

    // Accept, then the chain attaches the evidence and upgrades the lane.
    const review = await request(app)
      .post(
        `/api/v1/ai-value/objects/outcome_evidence_export/${outcomeExport.export_id}/review`
      )
      .set(writeAuth)
      .send({ decision: "ACCEPTED", reviewer_role: "enablement_lead" });
    expect(review.status).toBe(200);
    expect(review.body.review_state).toBe("ACCEPTED");

    const acceptedRun = await request(app)
      .post("/api/v1/ai-value/value-chain/run")
      .set(writeAuth)
      .send({
        blueprint_id: blueprintId,
        metrics_library_id: metricsLibraryId,
        outcome_evidence_export_id: outcomeExport.export_id
      });
    expect(acceptedRun.status).toBe(200);
    expect(acceptedRun.body.run.outcome_evidence.attached).toBe(true);
    expect(acceptedRun.body.run.decision).toBe("HOLD_FOR_ASSUMPTIONS");
    expect(
      acceptedRun.body.run.spine.stages.readiness.object.source_refs
        .outcome_evidence_export_id
    ).toBe(outcomeExport.export_id);

    // Terminal review: a second decision is rejected.
    const secondReview = await request(app)
      .post(
        `/api/v1/ai-value/objects/outcome_evidence_export/${outcomeExport.export_id}/review`
      )
      .set(writeAuth)
      .send({ decision: "REJECTED", reviewer_role: "enablement_lead" });
    expect(secondReview.status).toBe(409);
  });

  it("requires a reviewer role for evidence review", async () => {
    const response = await request(app)
      .post("/api/v1/ai-value/objects/outcome_evidence_export/x/review")
      .set(readAuth)
      .send({ decision: "ACCEPTED", reviewer_role: "exec" });
    expect(response.status).toBe(403);
  });

  it("requires a write role to run the spine", async () => {
    const response = await request(app)
      .post("/api/v1/ai-value/spine/run")
      .set(readAuth)
      .send({ blueprint_id: blueprintId, metrics_library_id: metricsLibraryId });
    expect(response.status).toBe(403);
  });
});
