import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  runSpine,
  runValueChain,
  validateEngagement,
  validateFluencyBaseline,
  summarizeFluencyBaseline,
  validateOutcomeEvidenceExport,
  applyOutcomeEvidenceReview,
  buildBlueprintDraftFromWorkshopIntake,
  validateBlueprint,
  validateMetricsLibrary,
  validateValueScenario,
  validateEvidenceReadiness,
  validateClaimBoundary,
  validateExecutivePacket,
  validateDataBoundaryContract,
  validateValueImprovementLoop,
  buildValueImprovementLoopFromRoiScenario,
  validateValueEvidenceCase,
  buildValueEvidenceCase,
  validateEvidenceSnapshot,
  buildTelemetryEvidenceSnapshotDraft,
  EVIDENCE_SNAPSHOT_SCHEMA_VERSION,
  validateMeasurementPlan,
  buildPlaybookMeasurementPlanDraft,
  MEASUREMENT_PLAN_SCHEMA_VERSION
} from "../shared/dist/aiValueEngine/index.js";

function readExample(name) {
  return JSON.parse(
    readFileSync(
      resolve(
        process.cwd(),
        `docs/contracts/ai-value-intelligence/examples/${name}`
      ),
      "utf8"
    )
  );
}

const blueprint = readExample("customer-support-blueprint.json");
const metricsLibrary = readExample("customer-support-metrics-library.json");

test("engine exposes the six per-stage contract entry points", () => {
  for (const entry of [
    validateBlueprint,
    validateMetricsLibrary,
    validateValueScenario,
    validateEvidenceReadiness,
    validateClaimBoundary,
    validateExecutivePacket
  ]) {
    assert.equal(typeof entry, "function");
  }
});

test("engine exposes the data boundary contract for real evidence planning", () => {
  const contract = readExample("customer-support-data-boundary-roi-evidence.json");
  const validation = validateDataBoundaryContract(contract);

  assert.equal(typeof validateDataBoundaryContract, "function");
  assert.equal(validation.valid, true);
  assert.equal(validation.feeds.aggregate_evidence_package, true);
  assert.equal(validation.feeds.value_evidence_case, true);
  assert.equal(validation.feeds.customer_facing_economic_output, false);
});

test("engine exposes the evidence snapshot contract for caveated telemetry posture", () => {
  const snapshot = buildTelemetryEvidenceSnapshotDraft({
    orgId: "org_example",
    workflowFamily: "customer_support_case_resolution",
    windowStart: "2026-05-01",
    windowEnd: "2026-05-31",
    generatedAt: "2026-06-13T00:00:00.000Z",
    evidenceSnapshotId: "evidence_snapshot_engine_smoke"
  });
  const validation = validateEvidenceSnapshot(snapshot);

  assert.equal(typeof validateEvidenceSnapshot, "function");
  assert.equal(typeof buildTelemetryEvidenceSnapshotDraft, "function");
  assert.equal(snapshot.schema_version, EVIDENCE_SNAPSHOT_SCHEMA_VERSION);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(validation.feeds.evidence_snapshot, true);
  assert.equal(validation.feeds.executive_readout, false);
});

test("engine exposes the measurement plan contract before evidence snapshots", () => {
  const plan = buildPlaybookMeasurementPlanDraft({
    orgId: "org_example",
    workflowFamily: "customer_support_case_resolution",
    hypothesisStatement:
      "If support teams use AI for case triage and answer drafting, then eligible support cases should move faster while quality and escalation posture remain governed.",
    businessObjective: "Improve support case resolution capacity without weakening quality controls.",
    baselineWindowStart: "2026-05-01",
    baselineWindowEnd: "2026-05-31",
    generatedAt: "2026-06-13T00:00:00.000Z",
    measurementPlanId: "measurement_plan_engine_smoke"
  });
  const validation = validateMeasurementPlan(plan);

  assert.equal(plan.schema_version, MEASUREMENT_PLAN_SCHEMA_VERSION);
  assert.equal(typeof validateMeasurementPlan, "function");
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(validation.readiness.max_snapshot_type, "TELEMETRY_ONLY_CAVEATED");
  assert.equal(validation.readiness.can_build_claim_readiness, false);
});

test("runSpine runs the Customer Support fixtures through every stage", () => {
  const run = runSpine({ blueprint, metricsLibrary });
  assert.equal(run.halted_at, null);
  assert.equal(run.customer_facing_economic_output, false);
  for (const stage of Object.values(run.stages)) {
    assert.equal(stage.status, "VALID");
  }
  assert.equal(run.decision, run.stages.readiness.object.decision);
  assert.equal(run.stages.executive_packet.validation.valid, true);
});

test("runSpine is deterministic for identical inputs", () => {
  const first = runSpine({ blueprint, metricsLibrary });
  const second = runSpine({ blueprint, metricsLibrary });
  assert.deepEqual(first, second);
});

test("runSpine halts at blueprint when the blueprint is invalid", () => {
  const run = runSpine({ blueprint: { blueprint_id: "broken" }, metricsLibrary });
  assert.equal(run.halted_at, "blueprint");
  assert.equal(run.decision, "HOLD_FOR_BLUEPRINT");
  assert.equal(run.stages.blueprint.status, "INVALID");
  assert.equal(run.stages.metrics.status, "NOT_RUN");
  assert.equal(run.stages.scenario.status, "NOT_RUN");
  assert.equal(run.stages.executive_packet.status, "NOT_RUN");
});

test("runSpine holds at metrics when no metric maps to the blueprint routes", () => {
  const foreignLibrary = {
    ...metricsLibrary,
    workflow_family: "some_other_family",
    metrics: metricsLibrary.metrics.map((metric) => {
      const { workflow_family: _unused, ...rest } = metric;
      return rest;
    })
  };
  const run = runSpine({ blueprint, metricsLibrary: foreignLibrary });
  assert.equal(run.halted_at, "metrics");
  assert.equal(run.decision, "HOLD_FOR_METRIC_MAPPING");
  assert.equal(run.stages.metrics.status, "HELD");
  assert.equal(run.stages.scenario.status, "NOT_RUN");
});

test("runSpine halts a provided scenario that fails validation", () => {
  const run = runSpine({
    blueprint,
    metricsLibrary,
    scenario: { scenario_id: "bad_scenario" }
  });
  assert.equal(run.halted_at, "scenario");
  assert.equal(run.decision, "HOLD_FOR_SCENARIO");
  assert.equal(run.stages.scenario.status, "INVALID");
  assert.equal(run.stages.readiness.status, "NOT_RUN");
});

test("runSpine holds the claim boundary when readiness blocks progression", () => {
  const heldBlueprint = JSON.parse(JSON.stringify(blueprint));
  heldBlueprint.source_requirements.source_coverage.baseline = "MISSING";
  const run = runSpine({ blueprint: heldBlueprint, metricsLibrary });
  assert.equal(run.halted_at, "claim_boundary");
  assert.equal(run.decision, "HOLD_FOR_BASELINE");
  assert.equal(run.stages.claim_boundary.status, "HELD");
  assert.equal(run.stages.executive_packet.status, "NOT_RUN");
});

test("runSpine id overrides keep the spine domain-agnostic", () => {
  const run = runSpine({
    blueprint,
    metricsLibrary,
    ids: {
      readinessId: "readiness_other_domain_v1",
      claimBoundaryId: "claim_boundary_other_domain_v1",
      packetId: "executive_packet_other_domain_v1"
    }
  });
  assert.equal(run.stages.readiness.object.readiness_id, "readiness_other_domain_v1");
  assert.equal(
    run.stages.claim_boundary.object.claim_boundary_id,
    "claim_boundary_other_domain_v1"
  );
  assert.equal(
    run.stages.executive_packet.object.packet_id,
    "executive_packet_other_domain_v1"
  );
});

test("workshop intake builds a valid blueprint for a second domain", () => {
  const intake = readExample("sales-pipeline-workshop-intake.json");
  const result = buildBlueprintDraftFromWorkshopIntake(intake);
  assert.deepEqual(result.intake_gaps, []);
  assert.equal(result.blueprint.blueprint_id, "bp_sales_pipeline_hygiene");
  assert.equal(result.blueprint_validation.valid, true);
});

test("workshop intake fails closed on missing fields", () => {
  const result = buildBlueprintDraftFromWorkshopIntake({ intake_id: "broken" });
  assert.ok(result.intake_gaps.length > 0);
  assert.equal(result.blueprint, null);
  assert.equal(result.blueprint_validation, null);
});

test("workshop intake always attaches engine-owned governance", () => {
  const intake = readExample("sales-pipeline-workshop-intake.json");
  const tampered = { ...intake, blocked_claims: [], governance_boundaries: { requires_raw_data: true } };
  const result = buildBlueprintDraftFromWorkshopIntake(tampered);
  assert.equal(result.blueprint.governance_boundaries.requires_raw_data, false);
  assert.ok(result.blueprint.blocked_claims.includes("roi_proof"));
});

test("the spine is domain-agnostic: sales pipeline runs end to end", () => {
  const intake = readExample("sales-pipeline-workshop-intake.json");
  const salesLibrary = readExample("sales-pipeline-metrics-library.json");
  const { blueprint: salesBlueprint } = buildBlueprintDraftFromWorkshopIntake(intake);
  const run = runSpine({
    blueprint: salesBlueprint,
    metricsLibrary: salesLibrary,
    ids: {
      readinessId: "readiness_sales_pipeline_hygiene_v1",
      claimBoundaryId: "claim_boundary_sales_pipeline_hygiene_v1",
      packetId: "executive_packet_sales_pipeline_hygiene_v1"
    }
  });
  assert.equal(run.halted_at, null);
  assert.equal(run.decision, "READY_FOR_EXECUTIVE_VALIDATION");
  assert.equal(run.stages.claim_boundary.object.claim_state, "CAVEATED");
  assert.equal(run.stages.executive_packet.object.packet_id, "executive_packet_sales_pipeline_hygiene_v1");
  assert.equal(
    run.stages.executive_packet.object.customer_facing_economic_output,
    false
  );
});

test("the synthetic 50-person Customer Success motion runs from intake through value chain", () => {
  const intake = readExample("customer-success-50-synthetic-workshop-intake.json");
  const csLibrary = readExample("customer-success-50-synthetic-metrics-library.json");
  const csEngagement = readExample("customer-success-50-synthetic-engagement.json");
  const csBaseline = readExample("customer-success-50-synthetic-fluency-baseline.json");
  const csFollowup = readExample("customer-success-50-synthetic-fluency-followup.json");
  const csOutcomeExport = readExample("customer-success-50-synthetic-outcome-evidence-export.json");
  const { blueprint: csBlueprint, blueprint_validation } =
    buildBlueprintDraftFromWorkshopIntake(intake);

  assert.equal(blueprint_validation.valid, true);
  assert.equal(csBlueprint.workflow_family, "customer_success_account_health_review");
  assert.equal(validateMetricsLibrary(csLibrary).valid, true);
  assert.equal(csLibrary.metrics.length, 11);
  assert.equal(validateFluencyBaseline(csFollowup).valid, true);
  assert.equal(csFollowup.collection_mode, "followup");
  assert.equal(summarizeFluencyBaseline(csBaseline).total_respondents, 50);
  assert.equal(intake.approved_aggregate_inputs.vbd_movement.velocity_index.comparison, 0.61);
  assert.equal(
    intake.approved_aggregate_inputs.ai_influence_posture.state,
    "DIRECTIONAL_ALIGNMENT_ONLY"
  );
  assert.ok(
    intake.approved_aggregate_inputs.ai_influence_posture.does_not_support.includes(
      "causality_claim"
    )
  );
  assert.equal(
    intake.approved_aggregate_inputs.ai_activity_by_window.assistant_sessions.comparison,
    480
  );
  assert.equal(
    intake.approved_aggregate_inputs.trust_and_friction_by_window.verification_attached_episodes.comparison,
    264
  );
  assert.deepEqual(
    csLibrary.metrics
      .filter((metric) => metric.metric_priority === "P0")
      .map((metric) => metric.metric_id),
    [
      "gross_revenue_retention_rate",
      "renewal_rate",
      "at_risk_account_share",
      "account_health_review_cycle_days",
      "risk_review_coverage_share"
    ]
  );

  const run = runValueChain({
    engagement: csEngagement,
    fluencyBaseline: csBaseline,
    outcomeEvidenceExport: csOutcomeExport,
    blueprint: csBlueprint,
    metricsLibrary: csLibrary,
    ids: {
      readinessId: "readiness_customer_success_50_synthetic_v1",
      claimBoundaryId: "claim_boundary_customer_success_50_synthetic_v1",
      packetId: "executive_packet_customer_success_50_synthetic_v1"
    }
  });

  assert.equal(run.engagement.status, "VALID");
  assert.equal(run.engagement.covers_workflow_family, true);
  assert.equal(run.fluency_baseline.status, "VALID");
  assert.equal(run.outcome_evidence.status, "VALID");
  assert.equal(run.outcome_evidence.attached, true);
  assert.equal(run.outcome_evidence.validation.metric_count, 11);
  assert.equal(run.spine.halted_at, null);
  assert.equal(run.decision, "READY_FOR_EXECUTIVE_VALIDATION");
  assert.equal(run.spine.stages.claim_boundary.object.claim_state, "CAVEATED");
  assert.equal(
    run.spine.stages.executive_packet.object.customer_facing_economic_output,
    false
  );
});

const engagement = readExample("customer-support-engagement.json");
const fluencyBaseline = readExample("customer-support-fluency-baseline.json");

test("engagement context validates and traces to the blueprint workflow family", () => {
  const validation = validateEngagement(engagement);
  assert.equal(validation.valid, true);
  assert.equal(validation.use_case_count, 2);
  assert.equal(validation.objective_count, 2);
});

test("engagements require at least one measurable objective", () => {
  const noObjectives = JSON.parse(JSON.stringify(engagement));
  delete noObjectives.business_objectives;
  const validation = validateEngagement(noObjectives);
  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.some((gap) => gap.includes("at least one objective")));
});

test("objective success measures and use case links are validated", () => {
  const badMeasure = JSON.parse(JSON.stringify(engagement));
  badMeasure.business_objectives[0].success_measures[0].expected_direction = "WIN";
  const measureValidation = validateEngagement(badMeasure);
  assert.ok(
    measureValidation.gaps.some((gap) => gap.includes("expected_direction is invalid"))
  );

  const badLink = JSON.parse(JSON.stringify(engagement));
  badLink.use_cases[0].objective_id = "objective_that_does_not_exist";
  const linkValidation = validateEngagement(badLink);
  assert.ok(
    linkValidation.gaps.some((gap) => gap.includes("does not match any business objective"))
  );
});

test("legacy single business_objective engagements still validate", () => {
  const legacy = JSON.parse(JSON.stringify(engagement));
  const [first] = legacy.business_objectives;
  delete legacy.business_objectives;
  legacy.business_objective = first;
  for (const useCase of legacy.use_cases) delete useCase.objective_id;
  const validation = validateEngagement(legacy);
  assert.equal(validation.valid, true);
  assert.equal(validation.objective_count, 1);
});

test("fluency baseline validates with suppressed small cohorts", () => {
  const validation = validateFluencyBaseline(fluencyBaseline);
  assert.equal(validation.valid, true);
  assert.equal(validation.suppressed_cohort_count, 1);
  assert.equal(validation.feeds.value_chain_context, true);
  assert.equal(validation.feeds.individual_scoring, false);
});

test("fluency baseline fails closed on small unsuppressed cohorts", () => {
  const tampered = JSON.parse(JSON.stringify(fluencyBaseline));
  tampered.cohorts[2] = {
    cohort_id: "cohort_tiny",
    cohort_label: "Tiny cohort",
    respondent_count: 3,
    construct_scores: { confidence: { mean: 4.0 } }
  };
  const validation = validateFluencyBaseline(tampered);
  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.some((gap) => gap.includes("must be marked suppressed")));
});

test("fluency baseline rejects respondent identifiers", () => {
  const tampered = JSON.parse(JSON.stringify(fluencyBaseline));
  tampered.cohorts[0].respondent_ids = ["r-1", "r-2"];
  const validation = validateFluencyBaseline(tampered);
  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.some((gap) => gap.includes("Forbidden field")));
});

test("fluency baseline summary only reports unsuppressed cohorts", () => {
  const summary = summarizeFluencyBaseline(fluencyBaseline);
  assert.equal(summary.reported_cohorts, 2);
  assert.equal(summary.suppressed_cohorts, 1);
  assert.equal(summary.total_respondents, 180);
  assert.ok(summary.construct_means.confidence >= 1 && summary.construct_means.confidence <= 5);
});

test("runValueChain runs kickoff through executive packet", () => {
  const run = runValueChain({ engagement, fluencyBaseline, blueprint, metricsLibrary });
  assert.equal(run.engagement.status, "VALID");
  assert.equal(run.engagement.covers_workflow_family, true);
  assert.equal(run.fluency_baseline.status, "VALID");
  assert.ok(run.fluency_baseline.summary);
  assert.equal(run.spine.halted_at, null);
  assert.equal(run.decision, run.spine.decision);
  assert.equal(run.customer_facing_economic_output, false);
});

test("runValueChain halts when the engagement does not cover the workflow", () => {
  const foreign = JSON.parse(JSON.stringify(engagement));
  for (const useCase of foreign.use_cases) useCase.workflow_family = "some_other_family";
  const run = runValueChain({ engagement: foreign, blueprint, metricsLibrary });
  assert.equal(run.halted_at, "engagement");
  assert.equal(run.decision, "HOLD_FOR_USE_CASE_TRACEABILITY");
  assert.equal(run.engagement.status, "HELD");
  assert.equal(run.spine, null);
});

test("runValueChain halts on an invalid fluency baseline instead of dropping it", () => {
  const broken = { baseline_id: "broken" };
  const run = runValueChain({ engagement, fluencyBaseline: broken, blueprint, metricsLibrary });
  assert.equal(run.halted_at, "fluency_baseline");
  assert.equal(run.decision, "HOLD_FOR_FLUENCY_BASELINE");
  assert.equal(run.spine, null);
});

test("runValueChain without kickoff context behaves like the spine", () => {
  const chain = runValueChain({ blueprint, metricsLibrary });
  const spine = runSpine({ blueprint, metricsLibrary });
  assert.equal(chain.engagement.status, "NOT_RUN");
  assert.equal(chain.fluency_baseline.status, "NOT_RUN");
  assert.deepEqual(chain.spine, spine);
});

const outcomeExport = readExample("customer-support-outcome-evidence-export.json");

test("outcome evidence export validates with metrics library and blueprint context", () => {
  const validation = validateOutcomeEvidenceExport(outcomeExport, {
    metricsLibrary,
    blueprint
  });
  assert.equal(validation.valid, true);
  assert.deepEqual(validation.cross_check_gaps, []);
  assert.equal(validation.review_state, "SUBMITTED");
  assert.equal(validation.feeds.evidence_attachment, false);
  assert.equal(validation.feeds.roi_proof, false);
});

test("outcome evidence export rejects raw content, identifiers, and window drift", () => {
  const tainted = JSON.parse(JSON.stringify(outcomeExport));
  tainted.sample_ticket_text = "raw text";
  const taintedValidation = validateOutcomeEvidenceExport(tainted);
  assert.equal(taintedValidation.valid, false);
  assert.ok(taintedValidation.gaps.some((gap) => gap.includes("Forbidden field")));

  const drifted = JSON.parse(JSON.stringify(outcomeExport));
  drifted.windows.comparison = "2026-04-01_to_2026-06-30";
  const driftValidation = validateOutcomeEvidenceExport(drifted, { blueprint });
  assert.ok(
    driftValidation.cross_check_gaps.some((gap) => gap.includes("must exactly match"))
  );

  const unattested = JSON.parse(JSON.stringify(outcomeExport));
  unattested.attestation.contains_person_level_data = true;
  const attestValidation = validateOutcomeEvidenceExport(unattested);
  assert.ok(
    attestValidation.gaps.some((gap) => gap.includes("must be explicitly false"))
  );

  const attestationExtra = JSON.parse(JSON.stringify(outcomeExport));
  attestationExtra.attestation.approver_email = "person@example.com";
  const attestationValidation = validateOutcomeEvidenceExport(attestationExtra);
  assert.ok(
    attestationValidation.gaps.some((gap) =>
      gap.includes("attestation.approver_email is not allowed")
    )
  );

  const identifyingSource = JSON.parse(JSON.stringify(outcomeExport));
  identifyingSource.source_system.source_name = "person@example.com";
  const sourceValidation = validateOutcomeEvidenceExport(identifyingSource);
  assert.ok(
    sourceValidation.gaps.some((gap) =>
      gap.includes("source_system contains forbidden identifier metadata")
    )
  );

  const currencyMetric = JSON.parse(JSON.stringify(outcomeExport));
  currencyMetric.metrics[0].measurement_unit = "currency_usd";
  const currencyValidation = validateOutcomeEvidenceExport(currencyMetric);
  assert.ok(
    currencyValidation.gaps.some((gap) =>
      gap.includes("metrics[0].measurement_unit is a forbidden monetary unit")
    )
  );
});

test("review lifecycle: only SUBMITTED exports can be reviewed, accept attaches", () => {
  const accepted = applyOutcomeEvidenceReview(
    outcomeExport,
    "ACCEPTED",
    "enablement_lead",
    "2026-06-10T17:00:00.000Z"
  );
  assert.equal(accepted.error, null);
  const validation = validateOutcomeEvidenceExport(accepted.exportObject, {
    metricsLibrary,
    blueprint
  });
  assert.equal(validation.feeds.evidence_attachment, true);

  const noContextValidation = validateOutcomeEvidenceExport(accepted.exportObject);
  assert.equal(noContextValidation.valid, true);
  assert.equal(noContextValidation.feeds.evidence_attachment, false);
  assert.ok(
    noContextValidation.cross_check_gaps.some((gap) =>
      gap.includes("metrics library context is required")
    )
  );

  const again = applyOutcomeEvidenceReview(
    accepted.exportObject,
    "REJECTED",
    "enablement_lead",
    "2026-06-10T18:00:00.000Z"
  );
  assert.ok(again.error.includes("only SUBMITTED"));

  const invalidReviewer = applyOutcomeEvidenceReview(
    outcomeExport,
    "ACCEPTED",
    "person@example.com",
    "2026-06-10T18:00:00.000Z"
  );
  assert.ok(invalidReviewer.error.includes("reviewer_role is invalid"));
});

test("outcome evidence cross-checks workflow and source metadata", () => {
  const { exportObject: accepted } = applyOutcomeEvidenceReview(
    outcomeExport,
    "ACCEPTED",
    "enablement_lead",
    "2026-06-10T17:00:00.000Z"
  );

  const sourceNameDrift = JSON.parse(JSON.stringify(accepted));
  sourceNameDrift.source_system.source_name = "Different support system";
  const sourceNameValidation = validateOutcomeEvidenceExport(sourceNameDrift, {
    metricsLibrary,
    blueprint
  });
  assert.ok(
    sourceNameValidation.cross_check_gaps.some((gap) =>
      gap.includes("expects source name")
    )
  );
  assert.equal(sourceNameValidation.feeds.evidence_attachment, false);

  const grainDrift = JSON.parse(JSON.stringify(accepted));
  grainDrift.source_system.approved_grain = "case_and_user";
  const grainValidation = validateOutcomeEvidenceExport(grainDrift, {
    metricsLibrary,
    blueprint
  });
  assert.ok(
    grainValidation.cross_check_gaps.some((gap) =>
      gap.includes("expects approved grain")
    )
  );

  const foreignWorkflow = JSON.parse(JSON.stringify(accepted));
  foreignWorkflow.metrics[0].metric_id = "metric_foreign_workflow";
  const mixedLibrary = JSON.parse(JSON.stringify(metricsLibrary));
  mixedLibrary.metrics.push({
    ...mixedLibrary.metrics[0],
    metric_id: "metric_foreign_workflow",
    workflow_family: "sales_pipeline_hygiene"
  });
  const workflowValidation = validateOutcomeEvidenceExport(foreignWorkflow, {
    metricsLibrary: mixedLibrary,
    blueprint
  });
  assert.ok(
    workflowValidation.cross_check_gaps.some((gap) =>
      gap.includes("belongs to workflow sales_pipeline_hygiene")
    )
  );
});

test("accepted evidence upgrades the outcome lane in the value chain", () => {
  const evidenceGapBlueprint = JSON.parse(JSON.stringify(blueprint));
  evidenceGapBlueprint.source_requirements.source_coverage.outcome = "MISSING";

  const withoutEvidence = runValueChain({
    blueprint: evidenceGapBlueprint,
    metricsLibrary
  });
  assert.equal(withoutEvidence.decision, "HOLD_FOR_SOURCE_COVERAGE");

  const { exportObject: accepted } = applyOutcomeEvidenceReview(
    outcomeExport,
    "ACCEPTED",
    "enablement_lead",
    "2026-06-10T17:00:00.000Z"
  );
  const withEvidence = runValueChain({
    blueprint: evidenceGapBlueprint,
    metricsLibrary,
    outcomeEvidenceExport: accepted
  });
  assert.equal(withEvidence.outcome_evidence.status, "VALID");
  assert.equal(withEvidence.outcome_evidence.attached, true);
  assert.equal(withEvidence.decision, "HOLD_FOR_ASSUMPTIONS");
  assert.equal(
    withEvidence.spine.stages.readiness.object.source_refs.outcome_evidence_export_id,
    outcomeExport.export_id
  );
});

test("submitted evidence is pending and never halts; invalid evidence halts", () => {
  const pending = runValueChain({
    blueprint,
    metricsLibrary,
    outcomeEvidenceExport: outcomeExport
  });
  assert.equal(pending.outcome_evidence.status, "HELD");
  assert.equal(pending.outcome_evidence.attached, false);
  assert.ok(pending.outcome_evidence.hold_reason.includes("awaiting human review"));
  assert.notEqual(pending.spine, null);

  const broken = runValueChain({
    blueprint,
    metricsLibrary,
    outcomeEvidenceExport: { export_id: "broken" }
  });
  assert.equal(broken.halted_at, "outcome_evidence");
  assert.equal(broken.decision, "HOLD_FOR_OUTCOME_EVIDENCE");
  assert.equal(broken.spine, null);
});

test("accepted evidence that fails cross-checks halts for alignment", () => {
  const { exportObject: accepted } = applyOutcomeEvidenceReview(
    outcomeExport,
    "ACCEPTED",
    "enablement_lead",
    "2026-06-10T17:00:00.000Z"
  );
  const misaligned = JSON.parse(JSON.stringify(accepted));
  misaligned.windows.comparison = "2026-04-01_to_2026-06-30";
  const run = runValueChain({
    blueprint,
    metricsLibrary,
    outcomeEvidenceExport: misaligned
  });
  assert.equal(run.halted_at, "outcome_evidence");
  assert.equal(run.decision, "HOLD_FOR_EVIDENCE_ALIGNMENT");
});

test("evidence overrides can never downgrade a lane", () => {
  const run = runSpine({
    blueprint,
    metricsLibrary,
    sourceCoverageOverrides: { outcome: "MISSING", trust: "SUPPRESSED" }
  });
  assert.equal(run.stages.readiness.object.source_coverage.outcome, "PRESENT");
  assert.equal(run.stages.readiness.object.source_coverage.trust, "PRESENT");
});

test("runSpine never emits customer-facing economic output", () => {
  const run = runSpine({ blueprint, metricsLibrary });
  assert.equal(run.customer_facing_economic_output, false);
  assert.equal(
    run.stages.executive_packet.object.customer_facing_economic_output,
    false
  );
  assert.equal(
    run.stages.scenario.validation.feeds.customer_facing_economic_output,
    false
  );
  assert.equal(
    run.stages.readiness.validation.feeds.customer_facing_economic_output,
    false
  );
});

test("builds a governed value improvement loop when a value target is not improving", () => {
  const roiScenario = readExample("customer-support-roi-scenario.json");
  const improvementLoop = buildValueImprovementLoopFromRoiScenario(roiScenario, {
    valueTargetStatus: "NOT_IMPROVING",
    fluencyReadiness: "MIXED",
    velocityStatus: "STALLING",
    breadthStatus: "LIMITED",
    depthStatus: "SHALLOW",
    evidenceConfidence: "MEDIUM"
  });
  const validation = validateValueImprovementLoop(improvementLoop);

  assert.equal(validation.valid, true);
  assert.equal(validation.feeds.improvement_planning, true);
  assert.equal(validation.feeds.customer_facing_economic_output, false);
  assert.equal(improvementLoop.value_target.current_status, "NOT_IMPROVING");
  assert.ok(improvementLoop.likely_blockers.length >= 3);
  assert.ok(
    improvementLoop.likely_blockers.some((blocker) =>
      blocker.blocker_id.includes("breadth")
    )
  );
  assert.ok(improvementLoop.recommended_interventions.length >= 3);
  assert.ok(improvementLoop.retest_plan.window_label.includes("30-45 days"));
  assert.ok(improvementLoop.next_data_needed.length > 0);
  assert.equal(improvementLoop.economic_output_policy.customer_facing_economic_output, false);
});

test("value improvement loop validation rejects ROI proof, identifiers, and missing next actions", () => {
  const roiScenario = readExample("customer-support-roi-scenario.json");
  const improvementLoop = buildValueImprovementLoopFromRoiScenario(roiScenario, {
    valueTargetStatus: "NOT_IMPROVING"
  });
  improvementLoop.safe_language.allowed_phrases.push("Glean proved ROI for the customer.");
  improvementLoop.recommended_interventions = [];
  improvementLoop.direct_user_ids = ["user-1"];

  const validation = validateValueImprovementLoop(improvementLoop);

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("recommended_interventions"))
  );
  assert.ok(validation.gaps.some((gap) => gap.includes("Forbidden field")));
  assert.ok(validation.gaps.some((gap) => gap.includes("unsafe claim language")));
});

test("value evidence case engine exports validate the seeded fixture and gate the evidence ladder", () => {
  const fixture = readExample("customer-support-value-evidence-case.json");
  const validation = validateValueEvidenceCase(fixture);

  assert.equal(validation.valid, true);
  assert.equal(validation.evidence_level, "CAVEATED");
  assert.equal(validation.allowed_claim_level, "CAVEATED_VALUE_INVESTIGATION");
  assert.equal(validation.feeds.customer_facing_economic_output, false);

  const evidenceCase = buildValueEvidenceCase({
    dataBoundary: readExample("customer-support-data-boundary-roi-evidence.json"),
    roiScenario: readExample("customer-support-roi-scenario.json"),
    readiness: readExample("customer-support-evidence-readiness.json"),
    outcomeEvidenceExport: readExample("customer-support-outcome-evidence-export.json"),
    improvementLoop: readExample("customer-support-value-improvement-loop.json")
  });

  assert.equal(validateValueEvidenceCase(evidenceCase).valid, true);
  assert.equal(evidenceCase.vbd_summary.depth.definition, "workflow_integration_embeddedness");
  // The seeded export is SUBMITTED, so the built case stays directional.
  assert.equal(evidenceCase.evidence_quality.evidence_level, "DIRECTIONAL");
});
