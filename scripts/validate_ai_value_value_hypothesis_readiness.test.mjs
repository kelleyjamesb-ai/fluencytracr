import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildClaimReadinessHandoffFromEvidenceSnapshot,
  buildClaimReadinessSnapshotFromEvidenceSnapshotAndHandoff,
  buildPlaybookMeasurementPlanDraft,
  buildTelemetryEvidenceSnapshotDraft,
  buildValueHypothesisReadinessFromMeasurementPlanAndClaimSnapshot,
  validateClaimReadinessHandoff,
  validateClaimReadinessSnapshot,
  validateEvidenceSnapshot,
  validateMeasurementPlan,
  validateValueHypothesisReadiness
} from "../shared/dist/aiValueEngine/index.js";

const EXAMPLES = "docs/contracts/ai-value-value-hypothesis-readiness/examples";

const clone = (value) => JSON.parse(JSON.stringify(value));
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

const EXPECTED_COVERAGE_SIGNALS = {
  layer_1_platform_telemetry: [
    "workflow_run_count",
    "search_activity",
    "chat_or_assistant_activity",
    "ai_answer_activity",
    "active_user_aggregate",
    "eligible_cohort_size",
    "connector_or_source_coverage",
    "skill_lifecycle_activity",
    "agent_lifecycle_activity",
    "artifact_output_metadata",
    "mcp_action_boundary_metadata",
    "control_or_policy_telemetry",
    "suppression_or_blocked_event_posture"
  ],
  layer_2_user_voice_empirical: [
    "aggregate_ai_fluency_baseline",
    "aggregate_ai_fluency_retest",
    "aggregate_confidence_or_readiness_survey",
    "aggregate_knowledge_access_satisfaction",
    "aggregate_workflow_observation",
    "aggregate_qualitative_proof_points",
    "customer_approved_time_and_motion_summary"
  ],
  layer_3_business_system_outcomes: [
    "customer_attested_kpi_baseline",
    "customer_attested_kpi_comparison",
    "source_system_name",
    "source_owner_attestation",
    "metric_owner_review",
    "finance_or_business_owner_approval",
    "aggregate_outcome_metric_movement",
    "minimum_cohort_threshold",
    "system_of_record_export_availability"
  ],
  governance_evidence: [
    "suppression_state",
    "k_min_posture",
    "source_readiness_state",
    "data_boundary_state",
    "approved_aggregate_grain",
    "held_suppressed_missing_lanes",
    "forbidden_field_checks",
    "raw_content_exclusion"
  ],
  assumption_evidence: [
    "customer_owned_assumptions",
    "productivity_recapture_assumption_if_relevant",
    "aggregate_workforce_context_approval_if_provided",
    "financial_assumption_approval_if_requested",
    "low_confidence_assumptions",
    "high_sensitivity_assumptions",
    "customer_facing_approval_state"
  ]
};

function buildMeasurementPlan(overrides = {}) {
  return buildPlaybookMeasurementPlanDraft({
    orgId: "org_example",
    workflowFamily: "customer_support_case_resolution",
    hypothesisStatement:
      "If support teams use AI for case triage and answer drafting, eligible support cases should move faster while quality and escalation posture remain governed.",
    businessObjective: "Improve support case resolution capacity without weakening quality controls.",
    valueRoute: "capacity_creation",
    functionArea: "customer_support",
    primaryMetricId: "support_median_resolution_hours",
    primaryMetricName: "Median resolution time",
    baselineWindowStart: "2026-05-01",
    baselineWindowEnd: "2026-05-31",
    generatedAt: "2026-06-19T00:00:00.000Z",
    measurementPlanId: "measurement_plan_value_hypothesis_test",
    ...overrides
  });
}

function promotePlanToFullPlaybookReady(plan) {
  plan.windows.comparison_window_start = "2026-06-01";
  plan.windows.comparison_window_end = "2026-06-30";
  plan.windows.window_alignment_state = "baseline_and_comparison_selected";
  plan.playbook_evidence_requirements.layer_1_platform_telemetry.required = true;
  plan.playbook_evidence_requirements.layer_2_user_voice_empirical.required = true;
  plan.playbook_evidence_requirements.layer_2_user_voice_empirical.required_exports = [
    "aggregate_ai_fluency_baseline",
    "aggregate_ai_fluency_retest",
    "aggregate_user_voice_or_workflow_observation"
  ];
  plan.playbook_evidence_requirements.layer_3_business_system_outcomes.required = true;
  plan.playbook_evidence_requirements.layer_3_business_system_outcomes.required_exports = [
    "customer_attested_kpi_baseline",
    "customer_attested_kpi_comparison",
    "system_of_record_outcome_export"
  ];
  plan.playbook_evidence_requirements.governance_evidence.required = true;
  plan.playbook_evidence_requirements.assumption_evidence.required = true;
  plan.playbook_evidence_requirements.assumption_evidence.required_assumptions = [
    "customer_owned_assumptions",
    "financial_assumption_approval_if_requested"
  ];
  plan.playbook_evidence_requirements.assumption_evidence.required_approvals = [
    "customer_owned_assumptions",
    "finance_or_business_owner_approval"
  ];
  Object.assign(plan.source_package_requirements, {
    bigquery_source_required: true,
    ai_fluency_baseline_required: true,
    ai_fluency_retest_required: true,
    system_of_record_export_required: true,
    finance_or_business_owner_approval_required: true,
    control_or_policy_owner_approval_required: true,
    source_owner_attestation_required: true
  });
  plan.assumptions.assumption_approval_state = "approved";
  plan.vbd_measurement_design.velocity.comparison_required = true;
  plan.readiness.measurement_plan_readiness = "ready_for_full_playbook_snapshot";
  plan.readiness.missing_requirements = [];
  plan.readiness.held_requirements = [];
  plan.readiness.required_caveats = [
    "Full Playbook readiness is a plan posture only; value hypothesis readiness remains internal and non-causal."
  ];
  plan.readiness.next_actions = [
    "Build and review an aggregate evidence package for the same workflow and windows."
  ];
  return plan;
}

function buildEvidenceSnapshot({ fullPlaybook = false, suppressed = false } = {}) {
  const snapshot = buildTelemetryEvidenceSnapshotDraft({
    orgId: "org_example",
    workflowFamily: "customer_support_case_resolution",
    workflowName: "Support case resolution",
    functionArea: "customer_support",
    windowStart: "2026-05-01",
    windowEnd: "2026-06-30",
    generatedAt: "2026-06-19T00:00:00.000Z",
    evidenceSnapshotId: "evidence_snapshot_value_hypothesis_test",
    measurementPlanId: "measurement_plan_value_hypothesis_test",
    aggregateTelemetrySummary: {
      probe_window_start: "2026-05-01",
      probe_window_end: "2026-06-30",
      aggregate_event_count: 125000,
      table_families_checked: ["scrubbed_llm_call", "scrubbed_client_analytics"],
      approved_field_coverage_summary: {
        approved_fields_expected: 24,
        approved_fields_found: 18,
        approved_fields_missing: 6
      },
      k_min_summary: {
        total_slices: 12,
        k_min_clear_slices: 12,
        suppressed_or_unknown_slices: 0,
        minimum_cohort_threshold: 5
      }
    },
    sourceRefs: {
      bigquery_probe_result_id: "bq_probe_value_hypothesis_test",
      source_readiness_ids: ["source_readiness_value_hypothesis_test"],
      notes: ["Read-only aggregate probe summary; no raw rows retained."]
    }
  });

  if (fullPlaybook) {
    snapshot.snapshot_type = "FULL_STACK_EVIDENCE";
    snapshot.snapshot_readiness_decision = "READY_FOR_FULL_PLAYBOOK_SNAPSHOT";
    snapshot.playbook_coverage.coverage_status = "full_playbook_coverage";
    for (const [layer, signals] of Object.entries(EXPECTED_COVERAGE_SIGNALS)) {
      snapshot.playbook_coverage[layer].status = "present";
      snapshot.playbook_coverage[layer].covered_signals = signals;
      snapshot.playbook_coverage[layer].missing_signals = [];
      snapshot.playbook_coverage[layer].held_signals = [];
      snapshot.playbook_coverage[layer].caveats = [];
      if (layer === "assumption_evidence") {
        snapshot.playbook_coverage[layer].required_approvals = [
          "customer_owned_assumptions",
          "finance_or_business_owner_approval",
          "aggregate_workforce_context_approval_if_used"
        ];
      }
      snapshot.playbook_layers[layer].evidence_state = "present";
      snapshot.playbook_layers[layer].confidence = "medium";
      snapshot.playbook_layers[layer].caveats = [];
    }
    snapshot.evidence_lanes = snapshot.evidence_lanes.map((lane) => ({
      ...lane,
      classification: "available_now",
      evidence_state: "present",
      can_support_claim_readiness: true,
      caveats: []
    }));
    snapshot.source_refs.outcome_evidence_ids = ["outcome_evidence_value_hypothesis_test"];
    snapshot.required_caveats = [
      "Full Playbook coverage is validated only for this aggregate workflow window and must retain privacy, suppression, and claim-boundary controls."
    ];
  }

  if (suppressed) {
    snapshot.suppression.reason_codes = ["INSUFFICIENT_VOLUME"];
  } else {
    snapshot.suppression.held_lanes = [];
    snapshot.suppression.missing_lanes = [];
    snapshot.suppression.suppressed_lanes = [];
    snapshot.suppression.reason_codes = [];
  }

  return snapshot;
}

function buildClaimSnapshot({ fullPlaybook = false, suppressed = false } = {}) {
  const snapshot = buildEvidenceSnapshot({ fullPlaybook, suppressed });
  const snapshotValidation = validateEvidenceSnapshot(snapshot);
  assert.equal(snapshotValidation.valid, true, snapshotValidation.gaps.join("; "));
  const handoff = buildClaimReadinessHandoffFromEvidenceSnapshot(snapshot, {
    handoffId: "claim_readiness_handoff_value_hypothesis_test",
    createdAt: "2026-06-19T00:00:00.000Z"
  });
  const handoffValidation = validateClaimReadinessHandoff(handoff);
  assert.equal(handoffValidation.valid, true, handoffValidation.gaps.join("; "));
  const claimSnapshot = buildClaimReadinessSnapshotFromEvidenceSnapshotAndHandoff(
    snapshot,
    handoff,
    {
      claimReadinessSnapshotId: "claim_readiness_snapshot_value_hypothesis_test",
      createdAt: "2026-06-19T00:00:00.000Z"
    }
  );
  const claimValidation = validateClaimReadinessSnapshot(claimSnapshot);
  assert.equal(claimValidation.valid, true, claimValidation.gaps.join("; "));
  return claimSnapshot;
}

function buildReadiness(plan = buildMeasurementPlan(), claimSnapshot = buildClaimSnapshot()) {
  const planValidation = validateMeasurementPlan(plan);
  assert.equal(planValidation.valid, true, planValidation.gaps.join("; "));
  return buildValueHypothesisReadinessFromMeasurementPlanAndClaimSnapshot(
    plan,
    claimSnapshot,
    {
      valueHypothesisReadinessId: "value_hypothesis_readiness_test",
      createdAt: "2026-06-19T00:00:00.000Z"
    }
  );
}

test("Blueprint exists but AI Fluency is missing remains planning ready", () => {
  const plan = buildMeasurementPlan();
  const claimSnapshot = buildClaimSnapshot();
  const readiness = buildReadiness(plan, claimSnapshot);

  assert.equal(readiness.readiness_state, "PLANNING_READY");
  assert.equal(readiness.contribution_evidence_tier, "NONE");
  assert.ok(readiness.holds.includes("AI_FLUENCY_MOVEMENT_MISSING"));
  assert.ok(readiness.holds.includes("METRIC_MOVEMENT_MISSING"));
  assert.equal(readiness.review_boundaries.customer_facing_output_allowed, false);
  assert.equal(readiness.review_boundaries.financial_output_allowed, false);
  assert.ok(readiness.blocked_claims.includes("roi_proof"));
});

test("AI Fluency and VBD can improve but missing outcome metric movement holds evidence review", () => {
  const plan = promotePlanToFullPlaybookReady(buildMeasurementPlan());
  const claimSnapshot = buildClaimSnapshot({ fullPlaybook: true });
  const readiness = buildReadiness(plan, claimSnapshot);

  assert.equal(readiness.factors.ai_fluency_movement.state, "present");
  assert.equal(readiness.factors.vbd_movement.state, "present");
  assert.equal(readiness.factors.metric_movement.state, "missing");
  assert.equal(readiness.readiness_state, "EVIDENCE_REVIEW_READY");
  assert.ok(readiness.holds.includes("METRIC_MOVEMENT_MISSING"));
  assert.ok(!readiness.allowed_review_modes.includes("business_owner_value_hypothesis_review"));
});

test("misaligned metric windows hold evidence review even with outcome evidence present", () => {
  const plan = promotePlanToFullPlaybookReady(buildMeasurementPlan());
  plan.windows.comparison_window_start = "2026-07-01";
  plan.windows.comparison_window_end = "2026-07-31";
  const claimSnapshot = buildClaimSnapshot({ fullPlaybook: true });
  const readiness = buildReadiness(plan, claimSnapshot);

  assert.equal(readiness.readiness_state, "EVIDENCE_REVIEW_READY");
  assert.equal(readiness.factors.metric_movement.window_aligned, false);
  assert.ok(readiness.holds.includes("WINDOW_ALIGNMENT_MISMATCH"));
  assert.ok(!readiness.allowed_review_modes.includes("business_owner_value_hypothesis_review"));
});

test("ROI assumptions without owner approval do not reach finance context investigation", () => {
  const plan = promotePlanToFullPlaybookReady(buildMeasurementPlan());
  const claimSnapshot = buildClaimSnapshot({ fullPlaybook: true });
  const readiness = buildReadiness(plan, claimSnapshot);

  assert.equal(readiness.factors.metric_movement.state, "missing");
  readiness.factors.metric_movement.state = "present";
  readiness.factors.metric_movement.window_aligned = true;
  readiness.factors.assumption_quality.owner_approved = false;

  const validation = validateValueHypothesisReadiness(readiness);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.notEqual(readiness.readiness_state, "FINANCE_CONTEXT_INVESTIGATION_READY");
  assert.equal(readiness.quality_gates.finance_context_ready, false);
  assert.ok(!readiness.allowed_review_modes.includes("finance_context_investigation_packet"));
});

test("suppressed VBD or small cohort evidence suppresses readiness", () => {
  const plan = promotePlanToFullPlaybookReady(buildMeasurementPlan());
  const claimSnapshot = buildClaimSnapshot({ fullPlaybook: true, suppressed: true });
  const readiness = buildReadiness(plan, claimSnapshot);

  assert.equal(readiness.readiness_state, "SUPPRESSED");
  assert.equal(readiness.quality_gates.suppression_gates_cleared, false);
  assert.equal(readiness.value_hypothesis.value_route, "UNCLASSIFIED");
  assert.equal(readiness.value_hypothesis.hypothesis_statement, null);
  assert.deepEqual(readiness.allowed_review_modes, ["hold", "collect_missing_aggregate_evidence"]);
});

test("matched comparison upgrades contribution tier but never ROI proof", () => {
  const plan = promotePlanToFullPlaybookReady(buildMeasurementPlan());
  const claimSnapshot = buildClaimSnapshot({ fullPlaybook: true });
  const readiness = buildReadiness(plan, claimSnapshot);
  readiness.factors.metric_movement.state = "present";
  readiness.factors.metric_movement.window_aligned = true;
  readiness.factors.comparison_design_strength.state = "matched_comparison_candidate";
  readiness.factors.assumption_quality.owner_approved = true;
  readiness.readiness_state = "FINANCE_CONTEXT_INVESTIGATION_READY";
  readiness.alignment_keys.review_state = "FINANCE_CONTEXT_INVESTIGATION_READY";
  readiness.quality_gates.finance_context_ready = true;
  readiness.contribution_evidence_tier = "MATCHED_COMPARISON_READY";
  readiness.allowed_review_modes = [
    "internal_evidence_review",
    "business_owner_value_hypothesis_review",
    "finance_context_investigation_packet"
  ];

  const validation = validateValueHypothesisReadiness(readiness);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(readiness.contribution_evidence_tier, "MATCHED_COMPARISON_READY");
  assert.ok(readiness.blocked_claims.includes("roi_proof"));
  assert.equal(readiness.review_boundaries.roi_proof_allowed, false);
  assert.equal(readiness.review_boundaries.causality_claim_allowed, false);
});

test("ROI Bot assumptions are scenario context only and cannot upgrade claim posture", () => {
  const plan = promotePlanToFullPlaybookReady(buildMeasurementPlan());
  const claimSnapshot = buildClaimSnapshot({ fullPlaybook: true });
  const readiness = buildReadiness(plan, claimSnapshot);
  readiness.roi_bot_context = {
    present: true,
    source_tags: ["roi_bot_usage_actuals"],
    pull_date: "2026-06-19",
    assumptions_owner_role: "finance_partner",
    owner_approval_state: "approved"
  };

  const validation = validateValueHypothesisReadiness(readiness);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(readiness.factors.assumption_quality.roi_bot_context_only, true);
  assert.ok(readiness.blocked_claims.includes("roi_proof"));
  assert.equal(readiness.review_boundaries.financial_output_allowed, false);
});

test("forbidden confidence percent, raw/person fields, and unsafe language fail validation", () => {
  const readiness = buildReadiness();

  const withConfidence = clone(readiness);
  withConfidence.ai_contribution_confidence = 0.72;
  assert.equal(validateValueHypothesisReadiness(withConfidence).valid, false);

  const withPersonField = clone(readiness);
  withPersonField.employee_id = "e-123";
  assert.equal(validateValueHypothesisReadiness(withPersonField).valid, false);

  const withNestedRawRows = clone(readiness);
  withNestedRawRows.source_refs.raw_rows_export_id = "raw-export-1";
  assert.equal(validateValueHypothesisReadiness(withNestedRawRows).valid, false);

  const withUnsafeLanguage = clone(readiness);
  withUnsafeLanguage.value_hypothesis.hypothesis_statement = "AI proved EBITDA impact.";
  assert.equal(validateValueHypothesisReadiness(withUnsafeLanguage).valid, false);
});

test("source-ref and window drift fail validation", () => {
  const readiness = buildReadiness();

  const sourceRefDrift = clone(readiness);
  sourceRefDrift.source_provenance.source_refs.bigquery_probe_result_id = "different_probe";
  assert.equal(validateValueHypothesisReadiness(sourceRefDrift).valid, false);

  const windowDrift = clone(readiness);
  windowDrift.source_provenance.window.window_end = "2026-07-31";
  assert.equal(validateValueHypothesisReadiness(windowDrift).valid, false);

  const reviewStateDrift = clone(readiness);
  reviewStateDrift.alignment_keys.review_state = "FINANCE_CONTEXT_INVESTIGATION_READY";
  assert.equal(validateValueHypothesisReadiness(reviewStateDrift).valid, false);
});

test("Value Hypothesis Readiness examples validate", () => {
  for (const file of [
    "planning-ready-value-hypothesis-readiness.json",
    "business-owner-review-ready-value-hypothesis-readiness.json",
    "finance-context-investigation-ready-value-hypothesis-readiness.json"
  ]) {
    const readiness = readJson(`${EXAMPLES}/${file}`);
    const validation = validateValueHypothesisReadiness(readiness);
    assert.equal(validation.valid, true, `${file}: ${validation.gaps.join("; ")}`);
  }
});
