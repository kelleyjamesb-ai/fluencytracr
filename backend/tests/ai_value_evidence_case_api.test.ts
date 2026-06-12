import { readFileSync } from "fs";
import { resolve } from "path";

import request from "supertest";

import { app } from "../src/app";
import { store } from "../src/store";

const ORG_ID = "org-northstar-enterprise";
const writeAuth = { "x-role": "ADMIN", "x-org-id": ORG_ID };
const readAuth = { "x-role": "EXEC_VIEWER", "x-org-id": ORG_ID };

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

const dataBoundary = readExample("customer-support-data-boundary-roi-evidence.json");
const roiScenario = readExample("customer-support-roi-scenario.json");
const readiness = readExample("customer-support-evidence-readiness.json");
const outcomeExport = readExample("customer-support-outcome-evidence-export.json");
const improvementLoop = readExample("customer-support-value-improvement-loop.json");
const evidenceCaseFixture = readExample("customer-support-value-evidence-case.json");

const putObject = async (
  objectType: string,
  objectId: string,
  payload: Record<string, unknown>
) => {
  const response = await request(app)
    .put(`/api/v1/ai-value/objects/${objectType}/${objectId}`)
    .set(writeAuth)
    .send(payload);
  expect(response.status).toBe(201);
  return response;
};

beforeEach(() => {
  store.reset();
});

describe("AI value evidence case API", () => {
  it("stores the seeded value evidence case fixture through the registry", async () => {
    const response = await putObject(
      "value_evidence_case",
      evidenceCaseFixture.value_evidence_case_id as string,
      evidenceCaseFixture
    );
    expect(response.body.object_type).toBe("value_evidence_case");
    expect(response.body.valid).toBe(true);
    expect(response.body.workflow_family).toBe("customer_support_case_resolution");
  });

  it("fails closed: an escalated evidence case is rejected and never stored", async () => {
    const tainted = JSON.parse(JSON.stringify(evidenceCaseFixture));
    tainted.value_evidence_case_id = "value_evidence_case_tainted";
    tainted.economic_output_policy.realized_roi_calculation = true;
    const response = await request(app)
      .put("/api/v1/ai-value/objects/value_evidence_case/value_evidence_case_tainted")
      .set(writeAuth)
      .send(tainted);
    expect(response.status).toBe(422);
    expect(response.body.reason).toBe("ENGINE_VALIDATION_FAILED");

    const fetched = await request(app)
      .get("/api/v1/ai-value/objects/value_evidence_case/value_evidence_case_tainted")
      .set(readAuth);
    expect(fetched.status).toBe(404);
  });

  it("assembles a value evidence case from stored objects with fail-closed evidence gating", async () => {
    await putObject("data_boundary", dataBoundary.contract_id as string, dataBoundary);
    await putObject("roi_scenario", roiScenario.roi_scenario_id as string, roiScenario);
    await putObject("evidence_readiness", readiness.readiness_id as string, readiness);
    await putObject(
      "outcome_evidence_export",
      outcomeExport.export_id as string,
      outcomeExport
    );
    await putObject(
      "value_improvement_loop",
      improvementLoop.improvement_loop_id as string,
      improvementLoop
    );

    const response = await request(app)
      .post("/api/v1/ai-value/evidence-case/assemble")
      .set(writeAuth)
      .send({
        data_boundary_contract_id: dataBoundary.contract_id,
        roi_scenario_id: roiScenario.roi_scenario_id,
        readiness_id: readiness.readiness_id,
        outcome_export_id: outcomeExport.export_id,
        improvement_loop_id: improvementLoop.improvement_loop_id
      });

    expect(response.status).toBe(201);
    expect(response.body.object_type).toBe("value_evidence_case");
    // Uploaded outcome evidence is forced to SUBMITTED, so the assembled case
    // must stay directional until a human accepts the evidence.
    expect(response.body.payload.outcome_evidence_status.review_state).toBe("SUBMITTED");
    expect(response.body.payload.evidence_quality.evidence_level).toBe("DIRECTIONAL");
    expect(response.body.payload.safe_value_language.allowed_claim_level).toBe(
      "INTERNAL_HYPOTHESIS_ONLY"
    );
    expect(response.body.payload.vbd_summary.depth.definition).toBe(
      "workflow_integration_embeddedness"
    );

    const fetched = await request(app)
      .get(
        `/api/v1/ai-value/objects/value_evidence_case/${response.body.object_id}`
      )
      .set(readAuth);
    expect(fetched.status).toBe(200);
  });

  it("assembles a held case when no outcome export is referenced", async () => {
    await putObject("data_boundary", dataBoundary.contract_id as string, dataBoundary);
    await putObject("roi_scenario", roiScenario.roi_scenario_id as string, roiScenario);
    await putObject("evidence_readiness", readiness.readiness_id as string, readiness);

    const response = await request(app)
      .post("/api/v1/ai-value/evidence-case/assemble")
      .set(writeAuth)
      .send({
        data_boundary_contract_id: dataBoundary.contract_id,
        roi_scenario_id: roiScenario.roi_scenario_id,
        readiness_id: readiness.readiness_id
      });

    expect(response.status).toBe(201);
    expect(response.body.payload.evidence_quality.evidence_level).toBe("MISSING");
    expect(response.body.payload.safe_value_language.allowed_claim_level).toBe(
      "OBSERVED_AI_ACTIVITY_ONLY"
    );
  });

  it("returns 404 when a referenced source object is missing", async () => {
    const response = await request(app)
      .post("/api/v1/ai-value/evidence-case/assemble")
      .set(writeAuth)
      .send({
        data_boundary_contract_id: "missing_contract",
        roi_scenario_id: "missing_scenario",
        readiness_id: "missing_readiness"
      });
    expect(response.status).toBe(404);
  });
});
