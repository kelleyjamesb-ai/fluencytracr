import { readFileSync } from "fs";
import { resolve } from "path";

import request from "supertest";

import { app } from "../src/app";
import { store } from "../src/store";

const ORG_ID = "org-northstar-enterprise";
const writeAuth = { "x-role": "ADMIN", "x-org-id": ORG_ID };
const readAuth = { "x-role": "EXEC_VIEWER", "x-org-id": ORG_ID };
const readoutAuth = { "x-role": "ENABLEMENT_LEAD", "x-org-id": ORG_ID };
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
const roiScenario = readExample("customer-support-roi-scenario.json");

const blueprintId = blueprint.blueprint_id as string;
const metricsLibraryId = metricsLibrary.library_id as string;
const roiScenarioId = roiScenario.roi_scenario_id as string;
const executivePacketId = "executive_packet_customer_support_case_resolution_v1";


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

  it("does not expose Measurement Cell snapshot read routes in the persistence promotion slice", async () => {
    const response = await request(app)
      .get("/api/v1/ai-value/measurement-cell-snapshots")
      .set(readoutAuth);

    expect(response.status).toBe(404);
  });

  it("stores a governed ROI scenario as a reusable value-modeling object", async () => {
    const response = await request(app)
      .put(`/api/v1/ai-value/objects/roi_scenario/${roiScenarioId}`)
      .set(writeAuth)
      .send(roiScenario);

    expect(response.status).toBe(201);
    expect(response.body.object_type).toBe("roi_scenario");
    expect(response.body.object_id).toBe(roiScenarioId);
    expect(response.body.valid).toBe(true);
    expect(response.body.workflow_family).toBe("customer_support_case_resolution");
    expect(response.body.validation.feeds.customer_facing_economic_output).toBe(false);

    const fetched = await request(app)
      .get(`/api/v1/ai-value/objects/roi_scenario/${roiScenarioId}`)
      .set(readAuth);

    expect(fetched.status).toBe(200);
    expect(fetched.body.payload.roi_scenario_id).toBe(roiScenarioId);
    expect(fetched.body.payload.economic_output_policy.customer_facing_economic_output).toBe(false);
  });

  it("rejects legacy executive packet payload smuggling", async () => {
    const packet = readExample("customer-support-executive-packet.json");
    const tainted = {
      ...packet,
      sections: {
        ...(packet.sections as Record<string, unknown>),
        workflow: {
          ...((packet.sections as any).workflow as Record<string, unknown>),
          queryText: "select * from raw_events"
        },
        claim_boundary: {
          ...((packet.sections as any).claim_boundary as Record<string, unknown>),
          safe_claims: [
            ...(((packet.sections as any).claim_boundary.safe_claims as unknown[]) ?? []),
            "This packet supports ROI."
          ],
          required_caveats: [
            ...(((packet.sections as any).claim_boundary.required_caveats as unknown[]) ?? []),
            '{"rawRows":[],"rawEvents":[]}',
            "Causation support is available."
          ]
        },
        metrics: [
          {
            ...((packet.sections as any).metrics[0] as Record<string, unknown>),
            rawRows: [{ payloadJson: "unsafe" }]
          }
        ]
      }
    };

    const response = await request(app)
      .put(`/api/v1/ai-value/objects/executive_packet/${packet.packet_id}`)
      .set(writeAuth)
      .send(tainted);

    expect(response.status).toBe(422);
    expect(response.body.reason).toBe("ENGINE_VALIDATION_FAILED");
    expect(
      response.body.gaps.some((gap: string) => gap.includes("rawRows")) &&
      response.body.gaps.some((gap: string) => gap.includes("queryText")) &&
      response.body.gaps.some((gap: string) => gap.includes("safe_claims")) &&
      response.body.gaps.some((gap: string) => gap.includes("required_caveats"))
    ).toBe(true);
  });

  it("rejects legacy executive packets missing required source refs", async () => {
    const packet = readExample("customer-support-executive-packet.json");
    const tainted = JSON.parse(JSON.stringify(packet));
    delete tainted.source_refs.readiness_id;

    const response = await request(app)
      .put(`/api/v1/ai-value/objects/executive_packet/${packet.packet_id}`)
      .set(writeAuth)
      .send(tainted);

    expect(response.status).toBe(422);
    expect(response.body.reason).toBe("ENGINE_VALIDATION_FAILED");
    expect(
      response.body.gaps.some((gap: string) =>
        gap.includes("source_refs.readiness_id is missing")
      )
    ).toBe(true);
  });

  it.each([
    ["array", []],
    ["string", "bp_customer_support_case_resolution"]
  ])("rejects legacy executive packets with %s source refs", async (_label, sourceRefs) => {
    const packet = readExample("customer-support-executive-packet.json");
    const tainted = {
      ...packet,
      source_refs: sourceRefs
    };

    const response = await request(app)
      .put(`/api/v1/ai-value/objects/executive_packet/${packet.packet_id}`)
      .set(writeAuth)
      .send(tainted);

    expect(response.status).toBe(422);
    expect(response.body.reason).toBe("ENGINE_VALIDATION_FAILED");
    expect(
      response.body.gaps.some((gap: string) =>
        gap.includes("source_refs must be an object")
      )
    ).toBe(true);
  });

  it.each([
    ["claim boundary", (packet: any) => {
      packet.sections.claim_boundary.safe_claims = { text: "Internal only." };
    }],
    ["EBITA summary", (packet: any) => {
      packet.ebita_impact_summary = {
        status: "DIRECTIONAL_EBITA_BRIDGE",
        realized_ebita_claim_allowed: false,
        customer_facing_allowed: false,
        causality_claim_allowed: false,
        primary_ebita_levers: ["capacity"],
        evidence_quality: {
          adoption_evidence: "PRESENT",
          workflow_evidence: "PRESENT",
          outcome_evidence: "PRESENT",
          financial_evidence: "CAVEATED",
          overall_ebita_confidence: "CAVEATED"
        },
        allowed_phrases: { text: "Internal only." },
        required_caveats: ["No realized EBITA claim is allowed."],
        blocked_claims: { claim: "usage_proves_ebita" },
        next_evidence_actions: ["Keep the readout internal."]
      };
    }]
  ])("rejects malformed legacy executive packet %s string lists", async (_label, mutate) => {
    const packet = readExample("customer-support-executive-packet.json");
    const tainted = JSON.parse(JSON.stringify(packet));
    mutate(tainted);

    const response = await request(app)
      .put(`/api/v1/ai-value/objects/executive_packet/${packet.packet_id}`)
      .set(writeAuth)
      .send(tainted);

    expect(response.status).toBe(422);
    expect(response.body.reason).toBe("ENGINE_VALIDATION_FAILED");
    expect(response.body.gaps.length).toBeGreaterThan(0);
  });

  it("rejects legacy executive packets that authorize customer-facing financial language", async () => {
    const packet = readExample("customer-support-executive-packet.json");
    const tainted = {
      ...packet,
      ebita_impact_summary: {
        status: "CUSTOMER_FACING_APPROVED",
        realized_ebita_claim_allowed: false,
        customer_facing_allowed: true,
        causality_claim_allowed: false,
        primary_ebita_levers: ["capacity"],
        evidence_quality: {
          adoption_evidence: "PRESENT",
          workflow_evidence: "PRESENT",
          outcome_evidence: "PRESENT",
          financial_evidence: "PRESENT",
          overall_ebita_confidence: "FINANCE_VALIDATED"
        },
        allowed_phrases: ["Internal finance context remains caveated."],
        required_caveats: ["No customer-facing financial output is authorized."],
        blocked_claims: [
          "usage_proves_ebita",
          "ai_caused_ebita_without_causal_design",
          "headcount_reduction_from_usage",
          "individual_productivity_claim",
          "individual_productivity_measurement",
          "named_employee_productivity",
          "manager_or_team_ranking",
          "team_or_manager_ranking",
          "hris_inference"
        ],
        next_evidence_actions: ["Keep the readout internal."]
      }
    };

    const response = await request(app)
      .put(`/api/v1/ai-value/objects/executive_packet/${packet.packet_id}`)
      .set(writeAuth)
      .send(tainted);

    expect(response.status).toBe(422);
    expect(response.body.reason).toBe("ENGINE_VALIDATION_FAILED");
    expect(
      response.body.gaps.some((gap: string) =>
        gap.includes("CUSTOMER_FACING_APPROVED") ||
        gap.includes("customer_facing_allowed must be false")
      )
    ).toBe(true);
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

    const executivePacket = await request(app)
      .get(`/api/v1/ai-value/objects/executive_packet/${executivePacketId}`)
      .set(readAuth);
    expect(executivePacket.status).toBe(403);
    expect(executivePacket.body.reason).toBe("LEGACY_READOUT_INTERNAL_ONLY");

    const internalPacket = await request(app)
      .get(`/api/v1/ai-value/objects/executive_packet/${executivePacketId}`)
      .set(readoutAuth);
    expect(internalPacket.status).toBe(200);
    expect(internalPacket.body.payload.packet_id).toBe(executivePacketId);
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

  it("does not persist a mismatched explicit fluency baseline ref from value-chain run", async () => {
    await storeUpstreamObjects();
    const engagement = readExample("customer-support-engagement.json");
    const wrongBaseline = {
      ...readExample("customer-support-fluency-baseline.json"),
      baseline_id: "fluency_baseline_wrong_workflow_explicit",
      workflow_family: "sales_pipeline_hygiene"
    };

    await request(app)
      .put(`/api/v1/ai-value/objects/engagement/${engagement.engagement_id}`)
      .set(writeAuth)
      .send(engagement)
      .expect(201);
    await request(app)
      .put(`/api/v1/ai-value/objects/fluency_baseline/${wrongBaseline.baseline_id}`)
      .set(writeAuth)
      .send(wrongBaseline)
      .expect(201);

    const response = await request(app)
      .post("/api/v1/ai-value/value-chain/run")
      .set(writeAuth)
      .send({
        engagement_id: engagement.engagement_id,
        fluency_baseline_id: wrongBaseline.baseline_id,
        blueprint_id: blueprintId,
        metrics_library_id: metricsLibraryId
      });

    expect(response.status).toBe(200);
    expect(response.body.run.fluency_baseline.status).toBe("VALID");
    expect(response.body.run.spine.halted_at).toBeNull();
    expect(
      response.body.run.spine.stages.executive_packet.object.source_refs.fluency_baseline_id
    ).toBeUndefined();

    const storeKey = `${ORG_ID}:executive_packet:${executivePacketId}`;
    const stored = store.aiValueObjects.get(storeKey);
    expect(stored).toBeDefined();
    expect(
      (stored?.payload.source_refs as Record<string, unknown> | undefined)
        ?.fluency_baseline_id
    ).toBeUndefined();
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
      .send({ decision: "ACCEPTED", reviewer_role: "ADMIN" });
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
      .send({ decision: "REJECTED", reviewer_role: "ADMIN" });
    expect(secondReview.status).toBe(409);

    const resubmit = await request(app)
      .put(`/api/v1/ai-value/objects/outcome_evidence_export/${outcomeExport.export_id}`)
      .set(writeAuth)
      .send(outcomeExport);
    expect(resubmit.status).toBe(409);
    expect(resubmit.body.reason).toBe("TERMINAL_REVIEW_STATE");
  });

  it("rejects unsafe reviewer role text for evidence review", async () => {
    const outcomeExport = readExample("customer-support-outcome-evidence-export.json");
    await request(app)
      .put(`/api/v1/ai-value/objects/outcome_evidence_export/${outcomeExport.export_id}`)
      .set(writeAuth)
      .send(outcomeExport)
      .expect(201);

    const response = await request(app)
      .post(
        `/api/v1/ai-value/objects/outcome_evidence_export/${outcomeExport.export_id}/review`
      )
      .set(writeAuth)
      .send({ decision: "ACCEPTED", reviewer_role: "person@example.com" });
    expect(response.status).toBe(400);
    expect(response.body.reason).toBe("INVALID_REVIEW_DECISION");
  });

  it("rejects outcome evidence exports outside the authenticated org", async () => {
    const outcomeExport = readExample("customer-support-outcome-evidence-export.json");
    const otherOrgExport = {
      ...outcomeExport,
      org_id: "org-2"
    };

    const response = await request(app)
      .put(`/api/v1/ai-value/objects/outcome_evidence_export/${outcomeExport.export_id}`)
      .set(writeAuth)
      .send(otherOrgExport);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Token org scope does not match request org");
  });

  it("renders the executive readout HTML from stored objects", async () => {
    await storeUpstreamObjects();
    const engagement = readExample("customer-support-engagement.json");
    const fluencyBaseline = {
      ...readExample("customer-support-fluency-baseline.json"),
      workflow_family: "customer_support_case_resolution"
    };
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
    await request(app)
      .post("/api/v1/ai-value/value-chain/run")
      .set(writeAuth)
      .send({
        blueprint_id: blueprintId,
        metrics_library_id: metricsLibraryId,
        engagement_id: engagement.engagement_id,
        fluency_baseline_id: fluencyBaseline.baseline_id
      })
      .expect(200);

    const readout = await request(app)
      .get(
        `/api/v1/ai-value/readout/${executivePacketId}/html`
      )
      .set(readoutAuth);
    expect(readout.status).toBe(200);
    expect(readout.headers["content-type"]).toContain("text/html");
    expect(readout.headers["x-ai-value-readout-boundary"]).toBe(
      "legacy_internal_prototype"
    );
    expect(readout.headers["x-ai-value-source-bound"]).toBe("false");
    expect(readout.headers["x-ai-value-customer-facing-output"]).toBe("false");
    expect(readout.headers["x-ai-value-export-authorized"]).toBe("false");
    expect(readout.headers["cache-control"]).toContain("no-store");
    expect(readout.headers["content-disposition"]).toBeUndefined();
    expect(readout.text).toContain(
      "Internal/prototype readout. Not source-bound customer output."
    );
    expect(readout.text).toContain("Legacy compatibility surface only");
    expect(readout.text).toContain("Value realization planning artifact");
    expect(readout.text).toContain("Northstar Enterprise");
    expect(readout.text).toContain("Where the team started");
    expect(readout.text).toContain("2026-03-15_to_2026-03-31");
    expect(readout.text).toContain("Governance boundaries");

    const missing = await request(app)
      .get("/api/v1/ai-value/readout/not_a_packet/html")
      .set(readoutAuth);
    expect(missing.status).toBe(404);
  });

  it("keeps the legacy executive readout route out of EXEC_VIEWER access", async () => {
    await storeUpstreamObjects();
    await request(app)
      .post("/api/v1/ai-value/spine/run")
      .set(writeAuth)
      .send({ blueprint_id: blueprintId, metrics_library_id: metricsLibraryId })
      .expect(200);

    const response = await request(app)
      .get(
        `/api/v1/ai-value/readout/${executivePacketId}/html`
      )
      .set(readAuth);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Insufficient permissions for this endpoint");
  });

  it("keeps the legacy executive readout route scoped to the authenticated org", async () => {
    await storeUpstreamObjects();
    await request(app)
      .post("/api/v1/ai-value/spine/run")
      .set(writeAuth)
      .send({ blueprint_id: blueprintId, metrics_library_id: metricsLibraryId })
      .expect(200);

    const response = await request(app)
      .get(`/api/v1/ai-value/readout/${executivePacketId}/html`)
      .set(otherOrgAuth);

    expect(response.status).toBe(404);
    expect(response.body.reason).toBe("OBJECT_NOT_FOUND");
  });

  it("fails closed when a stored legacy executive packet no longer validates", async () => {
    await storeUpstreamObjects();
    await request(app)
      .post("/api/v1/ai-value/spine/run")
      .set(writeAuth)
      .send({ blueprint_id: blueprintId, metrics_library_id: metricsLibraryId })
      .expect(200);

    const storeKey = `${ORG_ID}:executive_packet:${executivePacketId}`;
    const stored = store.aiValueObjects.get(storeKey);
    expect(stored).toBeDefined();
    if (!stored) return;
    stored.payload = {
      ...stored.payload,
      sections: undefined
    };

    const response = await request(app)
      .get(`/api/v1/ai-value/readout/${executivePacketId}/html`)
      .set(readoutAuth);

    expect(response.status).toBe(422);
    expect(response.body.reason).toBe("ENGINE_VALIDATION_FAILED");
    expect(
      response.body.gaps.some((gap: string) => gap.includes("sections"))
    ).toBe(true);
  });

  it("fails closed when a stored legacy executive packet loses required source refs", async () => {
    await storeUpstreamObjects();
    await request(app)
      .post("/api/v1/ai-value/spine/run")
      .set(writeAuth)
      .send({ blueprint_id: blueprintId, metrics_library_id: metricsLibraryId })
      .expect(200);

    const storeKey = `${ORG_ID}:executive_packet:${executivePacketId}`;
    const stored = store.aiValueObjects.get(storeKey);
    expect(stored).toBeDefined();
    if (!stored) return;
    const sourceRefs = {
      ...((stored.payload.source_refs as Record<string, unknown>) ?? {})
    };
    delete sourceRefs.readiness_id;
    stored.payload = {
      ...stored.payload,
      source_refs: sourceRefs
    };

    const readout = await request(app)
      .get(`/api/v1/ai-value/readout/${executivePacketId}/html`)
      .set(readoutAuth);
    expect(readout.status).toBe(422);
    expect(readout.body.reason).toBe("ENGINE_VALIDATION_FAILED");
    expect(
      readout.body.gaps.some((gap: string) =>
        gap.includes("source_refs.readiness_id is missing")
      )
    ).toBe(true);

    const detail = await request(app)
      .get(`/api/v1/ai-value/objects/executive_packet/${executivePacketId}`)
      .set(readoutAuth);
    expect(detail.status).toBe(422);
    expect(detail.body.reason).toBe("ENGINE_VALIDATION_FAILED");
    expect(
      detail.body.gaps.some((gap: string) =>
        gap.includes("source_refs.readiness_id is missing")
      )
    ).toBe(true);
  });

  it.each([
    ["array", []],
    ["string", "bp_customer_support_case_resolution"]
  ])(
    "fails closed when a stored legacy executive packet has %s source refs",
    async (_label, sourceRefs) => {
      await storeUpstreamObjects();
      await request(app)
        .post("/api/v1/ai-value/spine/run")
        .set(writeAuth)
        .send({ blueprint_id: blueprintId, metrics_library_id: metricsLibraryId })
        .expect(200);

      const storeKey = `${ORG_ID}:executive_packet:${executivePacketId}`;
      const stored = store.aiValueObjects.get(storeKey);
      expect(stored).toBeDefined();
      if (!stored) return;
      stored.payload = {
        ...stored.payload,
        source_refs: sourceRefs
      };

      const readout = await request(app)
        .get(`/api/v1/ai-value/readout/${executivePacketId}/html`)
        .set(readoutAuth);
      expect(readout.status).toBe(422);
      expect(readout.body.reason).toBe("ENGINE_VALIDATION_FAILED");
      expect(
        readout.body.gaps.some((gap: string) =>
          gap.includes("source_refs must be an object")
        )
      ).toBe(true);

      const detail = await request(app)
        .get(`/api/v1/ai-value/objects/executive_packet/${executivePacketId}`)
        .set(readoutAuth);
      expect(detail.status).toBe(422);
      expect(detail.body.reason).toBe("ENGINE_VALIDATION_FAILED");
      expect(
        detail.body.gaps.some((gap: string) =>
          gap.includes("source_refs must be an object")
        )
      ).toBe(true);
    }
  );

  it("fails closed when generic detail reads a stale legacy executive packet", async () => {
    await storeUpstreamObjects();
    await request(app)
      .post("/api/v1/ai-value/spine/run")
      .set(writeAuth)
      .send({ blueprint_id: blueprintId, metrics_library_id: metricsLibraryId })
      .expect(200);

    const storeKey = `${ORG_ID}:executive_packet:${executivePacketId}`;
    const stored = store.aiValueObjects.get(storeKey);
    expect(stored).toBeDefined();
    if (!stored) return;
    stored.payload = {
      ...stored.payload,
      source_refs: {
        ...((stored.payload.source_refs as Record<string, unknown>) ?? {}),
        bigquery_table_id: "project.dataset.table"
      }
    };

    const response = await request(app)
      .get(`/api/v1/ai-value/objects/executive_packet/${executivePacketId}`)
      .set(readoutAuth);

    expect(response.status).toBe(422);
    expect(response.body.reason).toBe("ENGINE_VALIDATION_FAILED");
    expect(
      response.body.gaps.some((gap: string) => gap.includes("bigquery_table_id"))
    ).toBe(true);
  });

  it.each([
    [
      "missing",
      null,
      "Customer outcome evidence needed",
      "Ask the data owner for the approved aggregate export",
      "Stronger value language stays held until source, window, and metric evidence are attached."
    ],
    [
      "submitted",
      "SUBMITTED",
      "Customer outcome evidence needed",
      "Ask the data owner for the approved aggregate export",
      "Stronger value language stays held until source, window, and metric evidence are attached."
    ],
    [
      "accepted",
      "ACCEPTED",
      "Customer export accepted for caveated review",
      "Prepare the caveated sponsor readout with accepted evidence",
      "Accepted aggregate evidence supports only caveated value review. It is not ROI proof and does not establish causality."
    ],
    [
      "rejected",
      "REJECTED",
      "Customer outcome evidence needed",
      "Ask the data owner for the approved aggregate export",
      "Stronger value language stays held until source, window, and metric evidence are attached."
    ]
  ])(
    "renders source-bound evidence-aware executive readout language when outcome evidence is %s",
    async (_label, reviewState, statusText, actionText, caveatText) => {
      await storeUpstreamObjects();
      const outcomeExport = readExample("customer-support-outcome-evidence-export.json");

      const requestBody: Record<string, unknown> = {
        blueprint_id: blueprintId,
        metrics_library_id: metricsLibraryId
      };

      if (reviewState) {
        await request(app)
          .put(`/api/v1/ai-value/objects/outcome_evidence_export/${outcomeExport.export_id}`)
          .set(writeAuth)
          .send(outcomeExport)
          .expect(201);

        if (reviewState === "ACCEPTED" || reviewState === "REJECTED") {
          await request(app)
            .post(
              `/api/v1/ai-value/objects/outcome_evidence_export/${outcomeExport.export_id}/review`
            )
            .set(writeAuth)
            .send({ decision: reviewState })
            .expect(200);
        }

        requestBody.outcome_evidence_export_id = outcomeExport.export_id;
      }

      await request(app)
        .post("/api/v1/ai-value/value-chain/run")
        .set(writeAuth)
        .send(requestBody)
        .expect(200);

      const readout = await request(app)
        .get(
          `/api/v1/ai-value/readout/${executivePacketId}/html`
        )
        .set(readoutAuth)
        .expect(200);

      expect(readout.text).toContain(statusText);
      expect(readout.text).toContain(actionText);
      expect(readout.text).toContain(caveatText);
      expect(readout.text).toContain("Value realization planning artifact");
      expect(readout.text).toContain("Governance boundaries");
    }
  );

  it("does not use accepted evidence as caveated readout support without explicit source binding", async () => {
    await storeUpstreamObjects();
    const outcomeExport = readExample("customer-support-outcome-evidence-export.json");

    await request(app)
      .put(`/api/v1/ai-value/objects/outcome_evidence_export/${outcomeExport.export_id}`)
      .set(writeAuth)
      .send(outcomeExport)
      .expect(201);
    await request(app)
      .post(
        `/api/v1/ai-value/objects/outcome_evidence_export/${outcomeExport.export_id}/review`
      )
      .set(writeAuth)
      .send({ decision: "ACCEPTED" })
      .expect(200);
    await request(app)
      .post("/api/v1/ai-value/spine/run")
      .set(writeAuth)
      .send({ blueprint_id: blueprintId, metrics_library_id: metricsLibraryId })
      .expect(200);

    const readout = await request(app)
      .get(
        `/api/v1/ai-value/readout/${executivePacketId}/html`
      )
      .set(readoutAuth)
      .expect(200);

    expect(readout.text).toContain("Customer outcome evidence needed");
    expect(readout.text).not.toContain("Customer export accepted for caveated review");
  });

  it("does not attach engagement or fluency context by workflow-family fallback", async () => {
    await storeUpstreamObjects();
    const engagement = readExample("customer-support-engagement.json");
    const foreignEngagement = JSON.parse(JSON.stringify(engagement));
    foreignEngagement.engagement_id = "engagement_aaa_foreign";
    foreignEngagement.client.client_name = "Wrong Workflow Corp";
    foreignEngagement.use_cases = foreignEngagement.use_cases.map((useCase: any) => ({
      ...useCase,
      workflow_family: "sales_pipeline_hygiene"
    }));

    const fluencyBaseline = {
      ...readExample("customer-support-fluency-baseline.json"),
      workflow_family: "customer_support_case_resolution"
    };
    const foreignBaseline = {
      ...readExample("customer-support-fluency-baseline.json"),
      baseline_id: "fluency_baseline_aaa_foreign",
      workflow_family: "sales_pipeline_hygiene",
      window: "1999-01-01_to_1999-01-31"
    };

    await request(app)
      .put(`/api/v1/ai-value/objects/engagement/${foreignEngagement.engagement_id}`)
      .set(writeAuth)
      .send(foreignEngagement)
      .expect(201);
    await request(app)
      .put(`/api/v1/ai-value/objects/engagement/${engagement.engagement_id}`)
      .set(writeAuth)
      .send(engagement)
      .expect(201);
    await request(app)
      .put(`/api/v1/ai-value/objects/fluency_baseline/${foreignBaseline.baseline_id}`)
      .set(writeAuth)
      .send(foreignBaseline)
      .expect(201);
    await request(app)
      .put(`/api/v1/ai-value/objects/fluency_baseline/${fluencyBaseline.baseline_id}`)
      .set(writeAuth)
      .send(fluencyBaseline)
      .expect(201);
    await request(app)
      .post("/api/v1/ai-value/spine/run")
      .set(writeAuth)
      .send({ blueprint_id: blueprintId, metrics_library_id: metricsLibraryId })
      .expect(200);

    const readout = await request(app)
      .get(
        `/api/v1/ai-value/readout/${executivePacketId}/html`
      )
      .set(readoutAuth);

    expect(readout.status).toBe(200);
    expect(readout.text).not.toContain("Northstar Enterprise");
    expect(readout.text).not.toContain("Wrong Workflow Corp");
    expect(readout.text).not.toContain("Where the team started");
    expect(readout.text).not.toContain("2026-03-15_to_2026-03-31");
    expect(readout.text).not.toContain("1999-01-01_to_1999-01-31");
  });

  it("does not attach AI Fluency context through a stale explicit baseline ref", async () => {
    await storeUpstreamObjects();
    const wrongBaseline = {
      ...readExample("customer-support-fluency-baseline.json"),
      baseline_id: "fluency_baseline_wrong_workflow",
      workflow_family: "sales_pipeline_hygiene",
      window: "1999-01-01_to_1999-01-31"
    };

    await request(app)
      .put(`/api/v1/ai-value/objects/fluency_baseline/${wrongBaseline.baseline_id}`)
      .set(writeAuth)
      .send(wrongBaseline)
      .expect(201);
    await request(app)
      .post("/api/v1/ai-value/spine/run")
      .set(writeAuth)
      .send({ blueprint_id: blueprintId, metrics_library_id: metricsLibraryId })
      .expect(200);

    const storeKey = `${ORG_ID}:executive_packet:${executivePacketId}`;
    const stored = store.aiValueObjects.get(storeKey);
    expect(stored).toBeDefined();
    if (!stored) return;
    stored.payload = {
      ...stored.payload,
      source_refs: {
        ...((stored.payload.source_refs as Record<string, unknown>) ?? {}),
        fluency_baseline_id: wrongBaseline.baseline_id
      }
    };

    const readout = await request(app)
      .get(`/api/v1/ai-value/readout/${executivePacketId}/html`)
      .set(readoutAuth)
      .expect(200);

    expect(readout.text).not.toContain("Where the team started");
    expect(readout.text).not.toContain("1999-01-01_to_1999-01-31");
  });

  it("fails closed when a stored legacy executive packet has a non-string workflow family", async () => {
    await storeUpstreamObjects();
    const fluencyBaseline = readExample("customer-support-fluency-baseline.json");
    delete fluencyBaseline.workflow_family;

    await request(app)
      .put(`/api/v1/ai-value/objects/fluency_baseline/${fluencyBaseline.baseline_id}`)
      .set(writeAuth)
      .send(fluencyBaseline)
      .expect(201);
    await request(app)
      .post("/api/v1/ai-value/spine/run")
      .set(writeAuth)
      .send({ blueprint_id: blueprintId, metrics_library_id: metricsLibraryId })
      .expect(200);

    const storeKey = `${ORG_ID}:executive_packet:${executivePacketId}`;
    const stored = store.aiValueObjects.get(storeKey);
    expect(stored).toBeDefined();
    if (!stored) return;
    stored.payload = {
      ...stored.payload,
      workflow_family: { value: "customer_support_case_resolution" },
      source_refs: {
        ...((stored.payload.source_refs as Record<string, unknown>) ?? {}),
        fluency_baseline_id: fluencyBaseline.baseline_id
      }
    };

    const readout = await request(app)
      .get(`/api/v1/ai-value/readout/${executivePacketId}/html`)
      .set(readoutAuth);

    expect(readout.status).toBe(422);
    expect(readout.body.reason).toBe("ENGINE_VALIDATION_FAILED");
    expect(
      readout.body.gaps.some((gap: string) =>
        gap.includes("workflow_family must be a string")
      )
    ).toBe(true);
  });

  it("does not attach outcome evidence through a stale readiness binding", async () => {
    await storeUpstreamObjects();
    const outcomeExport = readExample("customer-support-outcome-evidence-export.json");

    await request(app)
      .put(`/api/v1/ai-value/objects/outcome_evidence_export/${outcomeExport.export_id}`)
      .set(writeAuth)
      .send(outcomeExport)
      .expect(201);
    await request(app)
      .post(
        `/api/v1/ai-value/objects/outcome_evidence_export/${outcomeExport.export_id}/review`
      )
      .set(writeAuth)
      .send({ decision: "ACCEPTED" })
      .expect(200);

    await request(app)
      .post("/api/v1/ai-value/spine/run")
      .set(writeAuth)
      .send({ blueprint_id: blueprintId, metrics_library_id: metricsLibraryId })
      .expect(200);

    const wrongReadiness = readExample("customer-support-evidence-readiness.json");
    wrongReadiness.readiness_id = "readiness_wrong_workflow_v1";
    wrongReadiness.workflow_family = "sales_pipeline_hygiene";
    wrongReadiness.source_refs = {
      ...(wrongReadiness.source_refs as Record<string, unknown>),
      outcome_evidence_export_id: outcomeExport.export_id
    };
    await request(app)
      .put("/api/v1/ai-value/objects/evidence_readiness/readiness_wrong_workflow_v1")
      .set(writeAuth)
      .send(wrongReadiness)
      .expect(201);

    const storeKey = `${ORG_ID}:executive_packet:${executivePacketId}`;
    const stored = store.aiValueObjects.get(storeKey);
    expect(stored).toBeDefined();
    if (!stored) return;
    stored.payload = {
      ...stored.payload,
      source_refs: {
        ...((stored.payload.source_refs as Record<string, unknown>) ?? {}),
        readiness_id: "readiness_wrong_workflow_v1"
      }
    };

    const readout = await request(app)
      .get(`/api/v1/ai-value/readout/${executivePacketId}/html`)
      .set(readoutAuth)
      .expect(200);

    expect(readout.text).toContain("Customer outcome evidence needed");
    expect(readout.text).not.toContain("Customer export accepted for caveated review");
  });

  it.each([
    ["SUBMITTED", null],
    ["REJECTED", { decision: "REJECTED" }]
  ])(
    "does not attach %s outcome evidence through explicit readiness refs",
    async (_label, reviewDecision) => {
      await storeUpstreamObjects();
      const outcomeExport = readExample("customer-support-outcome-evidence-export.json");

      await request(app)
        .put(`/api/v1/ai-value/objects/outcome_evidence_export/${outcomeExport.export_id}`)
        .set(writeAuth)
        .send(outcomeExport)
        .expect(201);
      if (reviewDecision) {
        await request(app)
          .post(
            `/api/v1/ai-value/objects/outcome_evidence_export/${outcomeExport.export_id}/review`
          )
          .set(writeAuth)
          .send(reviewDecision)
          .expect(200);
      }

      await request(app)
        .post("/api/v1/ai-value/spine/run")
        .set(writeAuth)
        .send({ blueprint_id: blueprintId, metrics_library_id: metricsLibraryId })
        .expect(200);

      const explicitReadiness = readExample("customer-support-evidence-readiness.json");
      explicitReadiness.source_refs = {
        ...(explicitReadiness.source_refs as Record<string, unknown>),
        outcome_evidence_export_id: outcomeExport.export_id
      };
      await request(app)
        .put(`/api/v1/ai-value/objects/evidence_readiness/${explicitReadiness.readiness_id}`)
        .set(writeAuth)
        .send(explicitReadiness)
        .expect(201);

      const storeKey = `${ORG_ID}:executive_packet:${executivePacketId}`;
      const stored = store.aiValueObjects.get(storeKey);
      expect(stored).toBeDefined();
      if (!stored) return;
      stored.payload = {
        ...stored.payload,
        source_refs: {
          ...((stored.payload.source_refs as Record<string, unknown>) ?? {}),
          readiness_id: explicitReadiness.readiness_id
        }
      };

      const readout = await request(app)
        .get(`/api/v1/ai-value/readout/${executivePacketId}/html`)
        .set(readoutAuth)
        .expect(200);

      expect(readout.text).toContain("Customer outcome evidence needed");
      expect(readout.text).not.toContain("Customer export accepted for caveated review");
      expect(readout.text).not.toContain("Support case system");
    }
  );

  it("requires a write role to run the spine", async () => {
    const response = await request(app)
      .post("/api/v1/ai-value/spine/run")
      .set(readAuth)
      .send({ blueprint_id: blueprintId, metrics_library_id: metricsLibraryId });
    expect(response.status).toBe(403);
  });
});
