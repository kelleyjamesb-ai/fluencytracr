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
  validateExecutivePacket
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

const engagement = readExample("customer-support-engagement.json");
const fluencyBaseline = readExample("customer-support-fluency-baseline.json");

test("engagement context validates and traces to the blueprint workflow family", () => {
  const validation = validateEngagement(engagement);
  assert.equal(validation.valid, true);
  assert.equal(validation.use_case_count, 2);
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

  const again = applyOutcomeEvidenceReview(
    accepted.exportObject,
    "REJECTED",
    "enablement_lead",
    "2026-06-10T18:00:00.000Z"
  );
  assert.ok(again.error.includes("only SUBMITTED"));
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
