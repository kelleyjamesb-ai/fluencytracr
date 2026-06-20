import assert from "node:assert/strict";
import test from "node:test";

import {
  AI_VALUE_VBD_TOKEN_AGGREGATE_INTAKE_SCHEMA_VERSION,
  buildVbdTokenAggregateIntake,
  validateVbdTokenAggregateIntake
} from "../shared/dist/aiValueEngine/index.js";

function baseInput(overrides = {}) {
  return {
    intakeId: "vbd_token_aggregate_intake_northstar_day_90",
    orgId: "org_northstar",
    clientId: "client_northstar",
    sourceRef: "scrubbed_glean_vbd_token_summary_northstar_day_90",
    sourceOwnerRole: "glean_data_owner",
    ownerApprovalState: "approved",
    reviewState: "clear",
    workflowFamily: "campaign_brief_to_launch",
    workflowId: "workflow_campaign_brief_to_launch",
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
    vbd: {
      velocity: 72,
      breadth: 68,
      depth: 74,
      threshold: 60
    },
    tokenSummary: {
      total_tokens: 860000,
      aggregate_interaction_count: 740,
      aggregate_workflow_count: 186,
      high_intensity_workflow_share: 0.22,
      average_tokens_per_interaction: 1162,
      average_tokens_per_workflow: 4624,
      token_intensity_band: "moderate"
    },
    kMinPosture: {
      minimum_cohort_threshold: 5,
      cohort_threshold_met: true,
      total_slices: 8,
      k_min_clear_slices: 8,
      suppressed_or_unknown_slices: 0
    },
    sourceOwnerAttestation: {
      attestation_state: "attested",
      attested_by_role: "glean_data_owner",
      attested_at: "2026-06-20T00:00:00.000Z"
    },
    generatedAt: "2026-06-20T00:00:00.000Z",
    ...overrides
  };
}

test("valid scrubbed aggregate VBD and token summary aligns to Data Spine source", () => {
  const intake = buildVbdTokenAggregateIntake(baseInput());
  const result = validateVbdTokenAggregateIntake(intake);

  assert.equal(intake.schema_version, AI_VALUE_VBD_TOKEN_AGGREGATE_INTAKE_SCHEMA_VERSION);
  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(intake.vbd_context.overall_vbd_score, 71.6);
  assert.equal(intake.vbd_context.integration_score, 71.6);
  assert.equal(intake.vbd_context.vbd_quadrant, "high_fluency_flow");
  assert.equal(intake.data_spine_source.state, "present");
  assert.equal(intake.data_spine_source.intake_mode, "scrubbed_glean_export_summary");
  assert.equal(result.feeds.data_spine_vbd_token_source, true);
  assert.equal(result.feeds.measurement_cell_vbd_context, true);
  assert.equal(result.feeds.finance_context_investigation_planning, false);
});

test("live BigQuery fields and raw samples fail closed", () => {
  const intake = buildVbdTokenAggregateIntake(baseInput());
  intake.bigquery_sql = "SELECT * FROM raw_customer_events";
  intake.raw_rows = [{ user_id: "u_123" }];
  intake.query_text = "raw query";

  const result = validateVbdTokenAggregateIntake(intake);

  assert.equal(result.valid, false);
  assert.equal(result.feeds.data_spine_vbd_token_source, false);
  for (const token of ["bigquery_sql", "raw_rows", "query_text"]) {
    assert.ok(result.gaps.some((gap) => gap.includes(token)), `missing gap for ${token}`);
  }
});

test("token usage remains intensity context and cannot change VBD score or claim readiness", () => {
  const lowToken = buildVbdTokenAggregateIntake(
    baseInput({
      tokenSummary: {
        total_tokens: 1000,
        aggregate_interaction_count: 740,
        aggregate_workflow_count: 186,
        high_intensity_workflow_share: 0.01,
        average_tokens_per_interaction: 2,
        average_tokens_per_workflow: 5,
        token_intensity_band: "low"
      }
    })
  );
  const highToken = buildVbdTokenAggregateIntake(
    baseInput({
      tokenSummary: {
        total_tokens: 9000000,
        aggregate_interaction_count: 740,
        aggregate_workflow_count: 186,
        high_intensity_workflow_share: 0.91,
        average_tokens_per_interaction: 12162,
        average_tokens_per_workflow: 48424,
        token_intensity_band: "very_high"
      }
    })
  );

  assert.equal(lowToken.vbd_context.overall_vbd_score, highToken.vbd_context.overall_vbd_score);
  assert.equal(lowToken.vbd_context.integration_score, highToken.vbd_context.integration_score);
  assert.equal(highToken.token_usage_role, "spend_or_intensity_context_only");
  assert.equal(highToken.feeds.claim_readiness_upgrade, false);
  assert.equal(highToken.feeds.finance_context_investigation_planning, false);
});
