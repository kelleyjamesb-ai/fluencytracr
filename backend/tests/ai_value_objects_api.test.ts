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

  it("requires a write role to run the spine", async () => {
    const response = await request(app)
      .post("/api/v1/ai-value/spine/run")
      .set(readAuth)
      .send({ blueprint_id: blueprintId, metrics_library_id: metricsLibraryId });
    expect(response.status).toBe(403);
  });
});
