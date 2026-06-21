import assert from "node:assert/strict";
import test from "node:test";

import {
  AI_VALUE_AI_FLUENCY_CLIENT_IMPORT_SCHEMA_VERSION,
  buildAIFluencyClientImport,
  validateAIFluencyClientImport,
  validateFluencyBaseline
} from "../shared/dist/aiValueEngine/index.js";

function cohort(overrides = {}) {
  return {
    cohort_id: "marketing_eligible_seats",
    cohort_label: "Marketing eligible seats",
    cohort_key: "function:marketing|eligible_seats:240",
    function_area: "marketing",
    workflow_family: "campaign_brief_to_launch",
    respondent_count: 128,
    suppressed: false,
    construct_scores: {
      confidence: { mean: 3.8 },
      usage_quality: { mean: 3.4 },
      behavior_change: { mean: 3.2 },
      leadership_reinforcement: { mean: 3.1 },
      capability_growth: { mean: 3.6 },
      ai_attitude: { mean: 3.7 },
      behavioral_intent: { mean: 3.5 },
      perceived_ai_impact: { mean: 3.3 }
    },
    ...overrides
  };
}

function baseInput(overrides = {}) {
  return {
    importId: "ai_fluency_client_import_northstar_day_90",
    orgId: "org_northstar",
    clientId: "client_northstar",
    dashboardExportId: "ai_fluency_dashboard_export_northstar_day_90",
    instrumentId: "ai_fluency_long_v1",
    collectionMode: "followup",
    workflowFamily: "campaign_brief_to_launch",
    functionArea: "marketing",
    cohortKey: "function:marketing|eligible_seats:240",
    baselineWindow: {
      window_start: "2026-06-01",
      window_end: "2026-06-30"
    },
    comparisonWindow: {
      window_start: "2026-09-01",
      window_end: "2026-09-30"
    },
    exportWindow: {
      window_start: "2026-09-01",
      window_end: "2026-09-30"
    },
    ownerApprovalState: "approved",
    reviewState: "clear",
    cohorts: [cohort()],
    generatedAt: "2026-06-20T00:00:00.000Z",
    ...overrides
  };
}

test("valid aggregate AI Fluency dashboard export normalizes by client and org", () => {
  const intake = buildAIFluencyClientImport(baseInput());
  const result = validateAIFluencyClientImport(intake);
  const baselineResult = validateFluencyBaseline(intake.fluency_baseline);

  assert.equal(intake.schema_version, AI_VALUE_AI_FLUENCY_CLIENT_IMPORT_SCHEMA_VERSION);
  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(baselineResult.valid, true, baselineResult.gaps.join("; "));
  assert.equal(intake.org_id, "org_northstar");
  assert.equal(intake.client_id, "client_northstar");
  assert.equal(intake.aggregate_summary.total_respondents, 128);
  assert.equal(intake.aggregate_summary.weighted_construct_means.confidence, 3.8);
  assert.equal(intake.data_spine_source.state, "present");
  assert.equal(intake.data_spine_source.intake_mode, "ai_fluency_dashboard_export");
  assert.equal(result.feeds.fluency_baseline, true);
  assert.equal(result.feeds.data_spine_ai_fluency_source, true);
  assert.equal(result.feeds.measurement_cell_input, false);
});

test("small or suppressed cohorts carry no scores and cannot feed Data Spine by themselves", () => {
  const intake = buildAIFluencyClientImport(
    baseInput({
      cohorts: [
        cohort({
          cohort_id: "small_marketing",
          respondent_count: 4,
          suppressed: true,
          construct_scores: {}
        })
      ]
    })
  );
  const result = validateAIFluencyClientImport(intake);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(intake.aggregate_summary.usable_cohort_count, 0);
  assert.equal(intake.aggregate_summary.suppressed_cohort_count, 1);
  assert.equal(intake.data_spine_source.state, "suppressed");
  assert.equal(result.feeds.fluency_baseline, false);
  assert.equal(result.feeds.data_spine_ai_fluency_source, false);
});

test("dashboard client import with fewer than twenty usable respondents cannot feed Data Spine", () => {
  const intake = buildAIFluencyClientImport(
    baseInput({
      cohorts: [
        cohort({
          cohort_id: "marketing_under_function_k_min",
          respondent_count: 19,
          suppressed: false
        })
      ]
    })
  );
  const result = validateAIFluencyClientImport(intake);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(intake.aggregate_summary.usable_respondents, 19);
  assert.equal(intake.data_spine_source.state, "suppressed");
  assert.equal(result.feeds.fluency_baseline, false);
  assert.equal(result.feeds.data_spine_ai_fluency_source, false);
});

test("dashboard client import with twenty usable respondents can feed Data Spine when approved", () => {
  const intake = buildAIFluencyClientImport(
    baseInput({
      cohorts: [
        cohort({
          cohort_id: "marketing_at_function_k_min",
          respondent_count: 20,
          suppressed: false
        })
      ]
    })
  );
  const result = validateAIFluencyClientImport(intake);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(intake.aggregate_summary.usable_respondents, 20);
  assert.equal(intake.data_spine_source.state, "present");
  assert.equal(result.feeds.fluency_baseline, true);
  assert.equal(result.feeds.data_spine_ai_fluency_source, true);
});

test("client or org drift fails closed", () => {
  const intake = buildAIFluencyClientImport(baseInput());
  intake.fluency_baseline.client_id = "client_other";
  intake.data_spine_source.org_id = "org_other";

  const result = validateAIFluencyClientImport(intake);

  assert.equal(result.valid, false);
  assert.equal(result.feeds.data_spine_ai_fluency_source, false);
  assert.ok(result.gaps.some((gap) => gap.includes("client_id")));
  assert.ok(result.gaps.some((gap) => gap.includes("org_id")));
});
