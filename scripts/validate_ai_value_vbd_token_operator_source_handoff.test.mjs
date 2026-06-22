import assert from "node:assert/strict";
import test from "node:test";

import {
  AI_VALUE_VBD_TOKEN_OPERATOR_SOURCE_HANDOFF_SCHEMA_VERSION,
  buildVbdTokenAggregateIntake,
  buildVbdTokenOperatorSourceHandoff,
  validateVbdTokenAggregateIntake,
  validateVbdTokenOperatorSourceHandoff
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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readyIntake(overrides = {}) {
  return buildVbdTokenAggregateIntake(baseInput(overrides));
}

test("approved VBD and token aggregate intake prepares operator source and Measurement Cell contexts only", () => {
  const intake = readyIntake();
  const intakeValidation = validateVbdTokenAggregateIntake(intake);
  const handoff = buildVbdTokenOperatorSourceHandoff({
    aggregateIntake: intake,
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const result = validateVbdTokenOperatorSourceHandoff(handoff);

  assert.equal(intakeValidation.valid, true, intakeValidation.gaps.join("; "));
  assert.equal(handoff.schema_version, AI_VALUE_VBD_TOKEN_OPERATOR_SOURCE_HANDOFF_SCHEMA_VERSION);
  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(handoff.decision, "READY_FOR_OPERATOR_INTAKE");
  assert.equal(handoff.feeds.operator_intake_source, true);
  assert.equal(handoff.feeds.data_spine_vbd_token_source, true);
  assert.equal(handoff.feeds.measurement_cell_vbd_context_fragment, true);
  assert.equal(handoff.feeds.measurement_cell_token_context_fragment, true);
  assert.equal(handoff.feeds.measurement_cell_direct_feed, false);
  assert.equal(handoff.feeds.finance_context_investigation, false);
  assert.equal(handoff.feeds.confidence_model, false);
  assert.equal(handoff.feeds.customer_facing_financial_output, false);
  assert.equal(handoff.operator_source.state, "present");
  assert.equal(handoff.operator_source.intake_mode, "scrubbed_glean_export_summary");
  assert.equal(handoff.operator_source.owner_role, "glean_data_owner");
  assert.equal(handoff.operator_source.owner_approval_state, "approved");
  assert.equal(handoff.operator_source.review_state, "clear");
  assert.equal(handoff.operator_source.aggregate_only, true);
  assert.equal(handoff.operator_source.connector_status, "scrubbed_export_only");
  assert.equal(handoff.vbd_context.org_id, "org_northstar");
  assert.equal(handoff.vbd_context.client_id, "client_northstar");
  assert.equal(handoff.vbd_context.workflow_family, "campaign_brief_to_launch");
  assert.equal(handoff.vbd_context.workflow_id, "workflow_campaign_brief_to_launch");
  assert.equal(handoff.vbd_context.function_area, "marketing");
  assert.equal(handoff.vbd_context.cohort_key, "function:marketing|eligible_seats:240");
  assert.deepEqual(handoff.vbd_context.baseline_window, intake.baseline_window);
  assert.deepEqual(handoff.vbd_context.comparison_window, intake.comparison_window);
  assert.equal(handoff.vbd_context.source_review_state, "clear");
  assert.equal(handoff.vbd_context.owner_approval_state, "approved");
  assert.equal(handoff.vbd_context.source_ref, intake.source_ref);
  assert.equal(handoff.vbd_context.overall_vbd_score, 71.6);
  assert.equal(handoff.vbd_context.integration_score, 71.6);
  assert.equal(handoff.vbd_context.vbd_quadrant, "high_fluency_flow");
  assert.equal(handoff.vbd_context.suppression_state, "CLEAR");
  assert.equal(handoff.token_context.org_id, "org_northstar");
  assert.equal(handoff.token_context.client_id, "client_northstar");
  assert.equal(handoff.token_context.workflow_family, "campaign_brief_to_launch");
  assert.equal(handoff.token_context.workflow_id, "workflow_campaign_brief_to_launch");
  assert.equal(handoff.token_context.function_area, "marketing");
  assert.equal(handoff.token_context.cohort_key, "function:marketing|eligible_seats:240");
  assert.deepEqual(handoff.token_context.baseline_window, intake.baseline_window);
  assert.deepEqual(handoff.token_context.comparison_window, intake.comparison_window);
  assert.equal(handoff.token_context.source_review_state, "clear");
  assert.equal(handoff.token_context.owner_approval_state, "approved");
  assert.equal(handoff.token_context.source_ref, intake.source_ref);
  assert.equal(handoff.token_context.token_usage_role, "spend_or_intensity_context_only");
  assert.equal(handoff.source_package_reference.source_package_type, "layer_1_bigquery_telemetry_summary");
  assert.equal(handoff.source_package_reference.source_refs.aggregate_probe_id, intake.source_ref);
});

test("held or suppressed aggregate telemetry cannot feed operator intake", () => {
  const intake = readyIntake({
    kMinPosture: {
      minimum_cohort_threshold: 5,
      cohort_threshold_met: false,
      total_slices: 8,
      k_min_clear_slices: 7,
      suppressed_or_unknown_slices: 1
    }
  });
  const intakeValidation = validateVbdTokenAggregateIntake(intake);
  const handoff = buildVbdTokenOperatorSourceHandoff({
    aggregateIntake: intake,
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const result = validateVbdTokenOperatorSourceHandoff(handoff);

  assert.equal(intakeValidation.valid, true, intakeValidation.gaps.join("; "));
  assert.equal(intakeValidation.feeds.data_spine_vbd_token_source, false);
  assert.equal(intake.data_spine_source.state, "suppressed");
  assert.equal(handoff.decision, "HELD_NO_FEEDABLE_VBD_TOKEN_SOURCE");
  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(handoff.operator_source, null);
  assert.equal(handoff.vbd_context, null);
  assert.equal(handoff.token_context, null);
  assert.equal(handoff.source_package_reference, null);
  assert.equal(result.feeds.operator_intake_source, false);
  assert.equal(result.feeds.measurement_cell_vbd_context_fragment, false);
  assert.equal(result.feeds.measurement_cell_token_context_fragment, false);
  assert.equal(result.feeds.finance_context_investigation, false);
  assert.equal(result.feeds.confidence_model, false);
  assert.equal(result.feeds.customer_facing_financial_output, false);
});

test("non-feedable owner approval, review, or attestation states stay held with all feeds false", () => {
  const cases = [
    { name: "owner held", overrides: { ownerApprovalState: "held" } },
    { name: "review held", overrides: { reviewState: "held" } },
    { name: "review suppressed", overrides: { reviewState: "suppressed" } },
    {
      name: "attestation submitted",
      overrides: {
        sourceOwnerAttestation: {
          attestation_state: "submitted",
          attested_by_role: "glean_data_owner",
          attested_at: "2026-06-20T00:00:00.000Z"
        }
      }
    },
    {
      name: "attestation rejected",
      overrides: {
        sourceOwnerAttestation: {
          attestation_state: "rejected",
          attested_by_role: "glean_data_owner",
          attested_at: "2026-06-20T00:00:00.000Z"
        }
      }
    }
  ];

  for (const { name, overrides } of cases) {
    const intake = readyIntake(overrides);
    const handoff = buildVbdTokenOperatorSourceHandoff({
      aggregateIntake: intake,
      generatedAt: "2026-06-21T00:00:00.000Z"
    });
    const result = validateVbdTokenOperatorSourceHandoff(handoff);

    assert.equal(handoff.decision, "HELD_NO_FEEDABLE_VBD_TOKEN_SOURCE", name);
    assert.equal(result.valid, true, result.gaps.join("; "));
    assert.equal(handoff.operator_source, null, name);
    assert.equal(handoff.vbd_context, null, name);
    assert.equal(handoff.token_context, null, name);
    assert.equal(handoff.source_package_reference, null, name);
    assert.equal(result.feeds.operator_intake_source, false, name);
    assert.equal(result.feeds.measurement_cell_vbd_context_fragment, false, name);
    assert.equal(result.feeds.measurement_cell_token_context_fragment, false, name);
    assert.equal(result.feeds.finance_context_investigation, false, name);
    assert.equal(result.feeds.confidence_model, false, name);
    assert.equal(result.feeds.customer_facing_financial_output, false, name);
  }
});

test("invalid VBD token aggregate intake blocks before operator source handoff", () => {
  const intake = readyIntake();
  intake.raw_rows = [{ user_id: "user_123" }];
  intake.bigquery_sql = "select * from raw_customer_events";
  intake.token_context.prompt_transcript = "raw transcript";
  const handoff = buildVbdTokenOperatorSourceHandoff({
    aggregateIntake: intake,
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const result = validateVbdTokenOperatorSourceHandoff(handoff);

  assert.equal(validateVbdTokenAggregateIntake(intake).valid, false);
  assert.equal(handoff.decision, "BLOCKED");
  assert.equal(result.valid, false);
  assert.equal(handoff.operator_source, null);
  assert.equal(handoff.vbd_context, null);
  assert.equal(handoff.token_context, null);
  assert.ok(result.gaps.some((gap) => gap.includes("raw_rows")));
  assert.ok(result.gaps.some((gap) => gap.includes("bigquery_sql")));
  assert.ok(result.gaps.some((gap) => gap.includes("prompt_transcript")));
  assert.equal(result.feeds.operator_intake_source, false);
  assert.equal(result.feeds.measurement_cell_vbd_context_fragment, false);
  assert.equal(result.feeds.measurement_cell_token_context_fragment, false);
});

test("held handoff cannot carry stale source or context fragments", () => {
  const held = buildVbdTokenOperatorSourceHandoff({
    aggregateIntake: readyIntake({
      ownerApprovalState: "held"
    }),
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const ready = buildVbdTokenOperatorSourceHandoff({
    aggregateIntake: readyIntake(),
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const stale = clone(held);
  stale.operator_source = ready.operator_source;
  stale.vbd_context = ready.vbd_context;
  stale.token_context = ready.token_context;
  stale.source_package_reference = ready.source_package_reference;

  const result = validateVbdTokenOperatorSourceHandoff(stale);

  assert.equal(result.valid, false);
  for (const token of [
    "operator_source",
    "vbd_context",
    "token_context",
    "source_package_reference"
  ]) {
    assert.ok(result.gaps.some((gap) => gap.includes(`must not carry ${token}`)), token);
  }
  assert.equal(result.feeds.operator_intake_source, false);
  assert.equal(result.feeds.measurement_cell_vbd_context_fragment, false);
  assert.equal(result.feeds.measurement_cell_token_context_fragment, false);
});

test("VBD token handoff fails closed when VBD or token context drifts from operator source", () => {
  const intake = readyIntake();
  const handoff = buildVbdTokenOperatorSourceHandoff({
    aggregateIntake: intake,
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const drifted = clone(handoff);
  drifted.vbd_context.function_area = "sales";
  drifted.token_context.cohort_key = "function:sales|eligible_seats:90";

  const result = validateVbdTokenOperatorSourceHandoff(drifted);

  assert.equal(result.valid, false);
  assert.ok(result.gaps.includes("vbd_context.function_area must match operator_source.function_area"));
  assert.ok(result.gaps.includes("token_context.cohort_key must match operator_source.cohort_key"));
  assert.equal(result.feeds.operator_intake_source, false);
  assert.equal(result.feeds.measurement_cell_vbd_context_fragment, false);
  assert.equal(result.feeds.measurement_cell_token_context_fragment, false);
  assert.equal(result.feeds.finance_context_investigation, false);
  assert.equal(result.feeds.confidence_model, false);
  assert.equal(result.feeds.customer_facing_financial_output, false);
});

test("ready-looking VBD token handoff fails closed on suppressed context or source package reference drift", () => {
  const handoff = buildVbdTokenOperatorSourceHandoff({
    aggregateIntake: readyIntake(),
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const drifted = clone(handoff);
  drifted.operator_source.state = "suppressed";
  drifted.vbd_context.suppression_state = "SUPPRESSED";
  drifted.token_context.evidence_state = "held";
  drifted.source_package_reference.source_package_type = "layer_2_user_voice_empirical_export";
  drifted.source_package_reference.source_refs = {
    aggregate_export_id: handoff.source_ref
  };
  drifted.source_package_ref = {
    source_package_type: "layer_1_bigquery_telemetry_summary"
  };

  const result = validateVbdTokenOperatorSourceHandoff(drifted);

  assert.equal(result.valid, false);
  for (const token of [
    "operator_source.state",
    "vbd_context.suppression_state",
    "token_context.evidence_state",
    "source_package_reference.source_package_type",
    "source_package_reference.source_refs.aggregate_probe_id",
    "source_package_ref"
  ]) {
    assert.ok(result.gaps.some((gap) => gap.includes(token)), `missing gap for ${token}`);
  }
  assert.equal(result.feeds.operator_intake_source, false);
  assert.equal(result.feeds.measurement_cell_vbd_context_fragment, false);
  assert.equal(result.feeds.measurement_cell_token_context_fragment, false);
});

test("VBD token handoff blocks unsafe source refs and finance or confidence side doors", () => {
  const intake = readyIntake({
    sourceRef: "raw_prompt_roi_probability_export_123"
  });
  const handoff = buildVbdTokenOperatorSourceHandoff({
    aggregateIntake: intake,
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  handoff.confidence_percentage = 91;
  handoff.contribution_probability = 0.82;
  handoff.financial_attribution = true;
  handoff.customer_facing_financial_output = true;
  handoff.backend_route = "/api/vbd-token-handoff";
  handoff.persistence_table = "vbd_token_operator_source_handoffs";
  handoff.feeds.finance_context_investigation = true;
  handoff.feeds.confidence_model = true;

  const result = validateVbdTokenOperatorSourceHandoff(handoff);

  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) =>
    gap.includes("Unsafe identifier value detected") && gap.includes("source_ref")
  ));
  for (const token of [
    "confidence_percentage",
    "contribution_probability",
    "financial_attribution",
    "customer_facing_financial_output",
    "backend_route",
    "persistence_table",
    "feeds.finance_context_investigation",
    "feeds.confidence_model"
  ]) {
    assert.ok(result.gaps.some((gap) => gap.includes(token)), `missing gap for ${token}`);
  }
  assert.equal(result.feeds.operator_intake_source, false);
  assert.equal(result.feeds.measurement_cell_vbd_context_fragment, false);
  assert.equal(result.feeds.measurement_cell_token_context_fragment, false);
  assert.equal(result.feeds.finance_context_investigation, false);
  assert.equal(result.feeds.confidence_model, false);
  assert.equal(result.feeds.customer_facing_financial_output, false);
});

test("unsafe source refs and nested raw or person fields are blocked without echoing unsafe values", () => {
  const unsafeValues = [
    "raw_prompt_export",
    "select * from raw_events",
    "jane@example.com",
    "employee_id_123",
    "transcript_dump",
    "roi_probability_export"
  ];

  for (const unsafeValue of unsafeValues) {
    const handoff = buildVbdTokenOperatorSourceHandoff({
      aggregateIntake: readyIntake(),
      generatedAt: "2026-06-21T00:00:00.000Z"
    });
    handoff.source_ref = unsafeValue;
    handoff.operator_source.source_ref = unsafeValue;
    handoff.vbd_context.source_ref = unsafeValue;
    handoff.token_context.source_ref = unsafeValue;
    handoff.source_package_reference.source_refs.aggregate_probe_id = unsafeValue;

    const result = validateVbdTokenOperatorSourceHandoff(handoff);

    assert.equal(result.valid, false, unsafeValue);
    assert.ok(result.gaps.some((gap) =>
      gap.includes("Unsafe identifier value detected") && gap.includes("source_ref")
    ), unsafeValue);
    assert.ok(!result.gaps.some((gap) => gap.includes(unsafeValue)), unsafeValue);
    assert.equal(result.feeds.operator_intake_source, false, unsafeValue);
  }

  const handoff = buildVbdTokenOperatorSourceHandoff({
    aggregateIntake: readyIntake(),
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  handoff.operator_source.user_id = "user_123";
  handoff.vbd_context.raw_rows = [{ person_id: "person_456" }];
  handoff.token_context.bigquery_sql = "select * from raw_events";
  handoff.token_context.prompt_transcript = "raw transcript";
  handoff.source_package_reference.source_refs.query_text = "select email from raw_events";

  const result = validateVbdTokenOperatorSourceHandoff(handoff);

  assert.equal(result.valid, false);
  for (const token of [
    "operator_source.user_id",
    "vbd_context.raw_rows",
    "token_context.bigquery_sql",
    "token_context.prompt_transcript",
    "source_package_reference.source_refs.query_text"
  ]) {
    assert.ok(result.gaps.some((gap) => gap.includes(token)), `missing gap for ${token}`);
  }
  assert.equal(result.feeds.operator_intake_source, false);
});

test("finance confidence allowed-use and caveat smuggling are blocked", () => {
  const handoff = buildVbdTokenOperatorSourceHandoff({
    aggregateIntake: readyIntake(),
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  handoff.vbd_context.ai_contribution_confidence = "high";
  handoff.vbd_context.contribution_probability = 0.82;
  handoff.token_context.cost_savings = 500000;
  handoff.token_context.productivity_lift = 0.2;
  handoff.source_package_reference.finance_context_investigation_ready = true;
  handoff.allowed_uses.push(
    "finance_context_investigation",
    "confidence_model_execution",
    "customer_facing_financial_output",
    "realized_roi",
    "productivity_claim",
    "causality_claim"
  );
  handoff.required_caveats.push("82% confidence AI caused $500k savings");

  const result = validateVbdTokenOperatorSourceHandoff(handoff);

  assert.equal(result.valid, false);
  for (const token of [
    "vbd_context.ai_contribution_confidence",
    "vbd_context.contribution_probability",
    "token_context.cost_savings",
    "token_context.productivity_lift",
    "source_package_reference.finance_context_investigation_ready",
    "allowed_uses contains unsupported use: finance_context_investigation",
    "allowed_uses contains unsupported use: confidence_model_execution",
    "allowed_uses contains unsupported use: customer_facing_financial_output",
    "allowed_uses contains unsupported use: realized_roi",
    "allowed_uses contains unsupported use: productivity_claim",
    "allowed_uses contains unsupported use: causality_claim",
    "required_caveats"
  ]) {
    assert.ok(result.gaps.some((gap) => gap.includes(token)), `missing gap for ${token}`);
  }
  assert.equal(result.feeds.operator_intake_source, false);
  assert.equal(result.feeds.finance_context_investigation, false);
  assert.equal(result.feeds.confidence_model, false);
  assert.equal(result.feeds.customer_facing_financial_output, false);
});
