import assert from "node:assert/strict";
import test from "node:test";

import {
  buildClaimReadinessHandoffFromEvidenceSnapshot,
  buildClaimReadinessSnapshotFromEvidenceSnapshotAndHandoff,
  buildPlaybookMeasurementPlanDraft,
  buildTelemetryEvidenceSnapshotDraft,
  buildValueHypothesisReadinessPacket,
  validateClaimReadinessHandoff,
  validateClaimReadinessSnapshot,
  validateEvidenceSnapshot,
  validateMeasurementPlan,
  validateValueHypothesisReadinessPacket
} from "../shared/dist/aiValueEngine/index.js";
import {
  buildMeasurementCell
} from "../shared/dist/aiValueEngine/measurementCell.js";

const clone = (value) => JSON.parse(JSON.stringify(value));

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
    orgId: "org_packet_example",
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
    measurementPlanId: "measurement_plan_value_hypothesis_packet_test",
    ...overrides
  });
}

function promotePlanToFullPlaybookReady(plan) {
  plan.windows.comparison_window_start = "2026-06-01";
  plan.windows.comparison_window_end = "2026-06-30";
  plan.windows.window_alignment_state = "baseline_and_comparison_selected";
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
    "Full Playbook readiness is a plan posture only; packet readiness remains internal and non-causal."
  ];
  plan.readiness.next_actions = [
    "Assemble an internal Value Hypothesis Readiness packet for Glean review."
  ];
  return plan;
}

function buildEvidenceSnapshot({ fullPlaybook = false, suppressed = false } = {}) {
  const snapshot = buildTelemetryEvidenceSnapshotDraft({
    orgId: "org_packet_example",
    workflowFamily: "customer_support_case_resolution",
    workflowName: "Support case resolution",
    functionArea: "customer_support",
    windowStart: "2026-05-01",
    windowEnd: "2026-06-30",
    generatedAt: "2026-06-19T00:00:00.000Z",
    evidenceSnapshotId: "evidence_snapshot_value_hypothesis_packet_test",
    measurementPlanId: "measurement_plan_value_hypothesis_packet_test",
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
      bigquery_probe_result_id: "bq_probe_value_hypothesis_packet_test",
      source_readiness_ids: ["source_readiness_value_hypothesis_packet_test"],
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
    snapshot.source_refs.outcome_evidence_ids = ["outcome_evidence_value_hypothesis_packet_test"];
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
    handoffId: "claim_readiness_handoff_value_hypothesis_packet_test",
    createdAt: "2026-06-19T00:00:00.000Z"
  });
  const handoffValidation = validateClaimReadinessHandoff(handoff);
  assert.equal(handoffValidation.valid, true, handoffValidation.gaps.join("; "));
  const claimSnapshot = buildClaimReadinessSnapshotFromEvidenceSnapshotAndHandoff(
    snapshot,
    handoff,
    {
      claimReadinessSnapshotId: "claim_readiness_snapshot_value_hypothesis_packet_test",
      createdAt: "2026-06-19T00:00:00.000Z"
    }
  );
  const claimValidation = validateClaimReadinessSnapshot(claimSnapshot);
  assert.equal(claimValidation.valid, true, claimValidation.gaps.join("; "));
  return claimSnapshot;
}

function buildPacket({
  plan = buildMeasurementPlan(),
  claimSnapshot = buildClaimSnapshot(),
  selectedMetricMovement,
  measurementCell,
  roiBotContext,
  comparisonDesignState
} = {}) {
  const planValidation = validateMeasurementPlan(plan);
  assert.equal(planValidation.valid, true, planValidation.gaps.join("; "));
  return buildValueHypothesisReadinessPacket({
    packetId: "value_hypothesis_readiness_packet_test",
    measurementPlan: plan,
    claimReadinessSnapshot: claimSnapshot,
    selectedMetricMovement,
    measurementCell,
    roiBotContext,
    comparisonDesignState,
    generatedAt: "2026-06-19T00:00:00.000Z"
  });
}

function buildPacketMeasurementCell(overrides = {}) {
  return buildMeasurementCell({
    orgId: "org_packet_example",
    functionArea: "customer_support",
    workflowFamily: "customer_support_case_resolution",
    workflowId: "workflow_support_case_resolution",
    cohortKey: "function:customer_support|eligible_seats:500",
    timeWindow: {
      time_window_id: "comparison_2026_06",
      window_label: "Comparison 2026-06",
      window_start: "2026-06-01",
      window_end: "2026-06-30",
      baseline_window: {
        window_start: "2026-05-01",
        window_end: "2026-05-31"
      },
      comparison_window: {
        window_start: "2026-06-01",
        window_end: "2026-06-30"
      },
      prior_window_ref: "measurement_cell_support_day_30"
    },
    blueprintAlignment: {
      value_route: "capacity_creation",
      value_promise:
        "Support case resolution should move faster while quality posture remains governed.",
      expected_metric_id: "support_median_resolution_hours",
      expected_metric_direction: "decrease",
      expected_metric_lag_days: 30,
      owner_role: "support_business_owner",
      assumption_refs: ["support_resolution_assumption"],
      source_ref: "measurement_plan_value_hypothesis_packet_test"
    },
    aiFluencyContext: {
      evidence_state: "present",
      fluency_score: 76,
      dimension_scores: {
        confidence: 77,
        usage_quality: 74,
        behavior_change: 73,
        leadership_reinforcement: 75,
        capability_growth: 80
      },
      response_count: 180,
      suppression_state: "CLEAR",
      source_ref: "source_readiness_value_hypothesis_packet_test"
    },
    vbdContext: {
      evidence_state: "present",
      velocity: 78,
      breadth: 71,
      depth: 74,
      integration_score: 72.8,
      overall_vbd_score: 74.3,
      prior_overall_vbd_score: 52.4,
      vbd_quadrant: "high_fluency_flow",
      source_ref: "bq_probe_value_hypothesis_packet_test",
      suppression_state: "CLEAR"
    },
    selectedMetric: {
      metric_id: "support_median_resolution_hours",
      metric_name: "Median resolution time",
      metric_source_system: "customer_support_system",
      metric_unit: "hours",
      metric_direction: "decrease",
      metric_sensitivity: "high",
      expected_lag_days: 30,
      normalization_denominator: "closed_case_count",
      baseline_value: 30,
      comparison_value: 24,
      owner_approval_state: "approved",
      source_ref: "outcome_evidence_value_hypothesis_packet_test",
      suppression_state: "CLEAR"
    },
    tokenContext: {
      evidence_state: "present",
      token_total: 940000,
      token_per_active_seat: 1880,
      token_intensity_band: "moderate",
      source_ref: "bq_probe_value_hypothesis_packet_test"
    },
    confounders: [
      {
        confounder_type: "support_volume_mix",
        state: "documented",
        source_ref: "support_ops_volume_mix_note"
      }
    ],
    evidenceDesign: {
      design_type: "matched_comparison",
      design_strength_tier: "comparison_supported",
      comparison_cell_ref: "measurement_cell_support_lower_exposure_2026_06",
      controls_documented: true,
      baseline_stability: "stable",
      source_ref: "support_measurement_design_2026_06"
    },
    financeReviewContext: {
      finance_owner_state: "finance_context_review",
      financial_driver: "operating_cost_context",
      metric_to_financial_driver_pathway:
        "Resolution-time movement is finance-review context only, not financial attribution.",
      source_ref: "finance_context_support_2026_06"
    },
    governance: {
      review_state: "FINANCE_CONTEXT_INVESTIGATION_READY"
    },
    ...overrides
  });
}

test("packet runner assembles a planning-ready packet for Glean review", () => {
  const packet = buildPacket();
  const validation = validateValueHypothesisReadinessPacket(packet);

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(packet.packet_type, "VALUE_HYPOTHESIS_READINESS_PACKET");
  assert.equal(packet.readiness.readiness_state, "PLANNING_READY");
  assert.equal(packet.review_flow.current_review_label, "Glean review");
  assert.ok(packet.review_flow.review_sequence.includes("Glean review"));
  assert.ok(!JSON.stringify(packet).includes("AIOM review"));
  assert.ok(packet.missing_evidence.includes("AI_FLUENCY_MOVEMENT_MISSING"));
  assert.equal(packet.review_boundaries.customer_facing_output_allowed, false);
  assert.equal(packet.review_boundaries.financial_output_allowed, false);
  assert.equal(packet.persistence_policy.creates_frontend_ui, false);
});

test("direct selected metric movement cannot reach finance-context investigation without Measurement Cell", () => {
  const plan = promotePlanToFullPlaybookReady(buildMeasurementPlan());
  const claimSnapshot = buildClaimSnapshot({ fullPlaybook: true });
  const packet = buildPacket({
    plan,
    claimSnapshot,
    comparisonDesignState: "matched_comparison_candidate",
    selectedMetricMovement: {
      metric_id: "support_median_resolution_hours",
      state: "present",
      baseline_window: {
        start: "2026-05-01",
        end: "2026-05-31"
      },
      comparison_window: {
        start: "2026-06-01",
        end: "2026-06-30"
      },
      source_ref: "outcome_evidence_value_hypothesis_packet_test",
      owner_role: "support_business_owner"
    },
    roiBotContext: {
      present: true,
      scenario_context_only: true,
      source_tags: ["roi_bot_usage_actuals"],
      pull_date: "2026-06-19",
      assumptions_owner_role: "finance_partner",
      owner_approval_state: "approved"
    }
  });

  const validation = validateValueHypothesisReadinessPacket(packet);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(packet.readiness.readiness_state, "BUSINESS_OWNER_REVIEW_READY");
  assert.equal(packet.readiness.contribution_evidence_tier, "MATCHED_COMPARISON_READY");
  assert.equal(packet.review_flow.current_review_label, "Business-owner review");
  assert.ok(packet.missing_evidence.includes("MEASUREMENT_CELL_REQUIRED_FOR_FINANCE_CONTEXT"));
  assert.ok(!packet.allowed_next_actions.includes("prepare_finance_context_investigation_packet"));
  assert.equal(validation.feeds.finance_context_investigation, false);
  assert.ok(packet.blocked_claims.includes("roi_proof"));
  assert.equal(packet.review_boundaries.roi_proof_allowed, false);
  assert.equal(packet.review_boundaries.causality_claim_allowed, false);
  assert.equal(packet.review_boundaries.financial_output_allowed, false);
});

test("validated Measurement Cell can drive packet metric movement and design alignment", () => {
  const plan = promotePlanToFullPlaybookReady(buildMeasurementPlan());
  const claimSnapshot = buildClaimSnapshot({ fullPlaybook: true });
  const measurementCell = buildPacketMeasurementCell();
  const packet = buildPacket({
    plan,
    claimSnapshot,
    measurementCell,
    selectedMetricMovement: {
      metric_id: "support_median_resolution_hours",
      state: "present",
      baseline_window: { start: "2026-05-01", end: "2026-05-31" },
      comparison_window: { start: "2026-06-01", end: "2026-06-30" },
      source_ref: "outcome_evidence_value_hypothesis_packet_test",
      owner_role: "support_business_owner"
    },
    roiBotContext: {
      present: true,
      scenario_context_only: true,
      source_tags: ["roi_bot_usage_actuals"],
      pull_date: "2026-06-19",
      assumptions_owner_role: "finance_partner",
      owner_approval_state: "approved"
    }
  });

  const validation = validateValueHypothesisReadinessPacket(packet);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(packet.validation.measurement_cell_validated, true);
  assert.equal(packet.evidence_sources.measurement_cell.state, "present");
  assert.equal(packet.evidence_sources.measurement_cell.measurement_cell_id, measurementCell.measurement_cell_id);
  assert.equal(packet.evidence_sources.measurement_cell.feeds_finance_context_investigation, true);
  assert.equal(packet.readiness.readiness_state, "FINANCE_CONTEXT_INVESTIGATION_READY");
  assert.equal(packet.readiness.contribution_evidence_tier, "MATCHED_COMPARISON_READY");
  assert.equal(validation.feeds.finance_context_investigation, true);
  assert.equal(validation.feeds.customer_facing_output, false);
  assert.equal(validation.feeds.financial_output, false);
});

test("suppressed Measurement Cell holds packet metric movement instead of upgrading finance review", () => {
  const plan = promotePlanToFullPlaybookReady(buildMeasurementPlan());
  const claimSnapshot = buildClaimSnapshot({ fullPlaybook: true });
  const measurementCell = buildPacketMeasurementCell({
    aiFluencyContext: {
      evidence_state: "suppressed",
      suppression_state: "SUPPRESSED",
      source_ref: "source_readiness_value_hypothesis_packet_test"
    },
    vbdContext: {
      evidence_state: "suppressed",
      velocity: 0,
      breadth: 0,
      depth: 0,
      integration_score: 0,
      overall_vbd_score: 0,
      prior_overall_vbd_score: null,
      vbd_quadrant: "suppressed",
      source_ref: "bq_probe_value_hypothesis_packet_test",
      suppression_state: "SUPPRESSED"
    },
    selectedMetric: {
      metric_id: "support_median_resolution_hours",
      metric_name: "Median resolution time",
      metric_source_system: "customer_support_system",
      metric_unit: "hours",
      metric_direction: "decrease",
      metric_sensitivity: "high",
      expected_lag_days: 30,
      normalization_denominator: "closed_case_count",
      baseline_value: null,
      comparison_value: null,
      owner_approval_state: "approved",
      source_ref: "outcome_evidence_value_hypothesis_packet_test",
      suppression_state: "SUPPRESSED"
    },
    financeReviewContext: {
      finance_owner_state: "held",
      financial_driver: null,
      metric_to_financial_driver_pathway: "missing",
      source_ref: "finance_context_support_2026_06"
    },
    governance: {
      suppression_state: "SUPPRESSED",
      review_state: "SUPPRESSED"
    },
    confounders: [],
    evidenceDesign: {
      design_type: "baseline_only",
      design_strength_tier: "no_contribution_confidence",
      controls_documented: false,
      source_ref: "support_measurement_design_2026_06"
    }
  });
  const packet = buildPacket({
    plan,
    claimSnapshot,
    measurementCell,
    selectedMetricMovement: {
      metric_id: "support_median_resolution_hours",
      state: "present",
      baseline_window: { start: "2026-05-01", end: "2026-05-31" },
      comparison_window: { start: "2026-06-01", end: "2026-06-30" },
      source_ref: "outcome_evidence_value_hypothesis_packet_test",
      owner_role: "support_business_owner"
    },
    roiBotContext: {
      present: true,
      scenario_context_only: true,
      source_tags: ["roi_bot_usage_actuals"],
      pull_date: "2026-06-19",
      assumptions_owner_role: "finance_partner",
      owner_approval_state: "approved"
    }
  });

  const validation = validateValueHypothesisReadinessPacket(packet);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(packet.evidence_sources.measurement_cell.state, "held");
  assert.equal(packet.readiness.readiness_state, "EVIDENCE_REVIEW_READY");
  assert.ok(packet.missing_evidence.includes("MEASUREMENT_CELL_HELD_OR_SUPPRESSED"));
  assert.ok(packet.missing_evidence.includes("MEASUREMENT_CELL_REQUIRED_FOR_FINANCE_CONTEXT"));
  assert.ok(!packet.allowed_next_actions.includes("prepare_finance_context_investigation_packet"));
  assert.equal(validation.feeds.finance_context_investigation, false);
});

test("finance-held Measurement Cell and ROI Bot assumptions cannot substitute for finance-context gate", () => {
  const plan = promotePlanToFullPlaybookReady(buildMeasurementPlan());
  const claimSnapshot = buildClaimSnapshot({ fullPlaybook: true });
  const measurementCell = buildPacketMeasurementCell({
    financeReviewContext: {
      finance_owner_state: "held",
      financial_driver: null,
      metric_to_financial_driver_pathway:
        "Resolution-time movement is held for finance context review.",
      source_ref: "finance_context_support_2026_06"
    },
    governance: {
      review_state: "BUSINESS_OWNER_REVIEW_READY"
    }
  });
  const packet = buildPacket({
    plan,
    claimSnapshot,
    measurementCell,
    roiBotContext: {
      present: true,
      scenario_context_only: true,
      source_tags: ["roi_bot_usage_actuals"],
      pull_date: "2026-06-19",
      assumptions_owner_role: "finance_partner",
      owner_approval_state: "approved"
    }
  });

  const validation = validateValueHypothesisReadinessPacket(packet);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(packet.evidence_sources.measurement_cell.state, "held");
  assert.equal(packet.readiness.readiness_state, "BUSINESS_OWNER_REVIEW_READY");
  assert.ok(packet.missing_evidence.includes("MEASUREMENT_CELL_REQUIRED_FOR_FINANCE_CONTEXT"));
  assert.ok(!packet.allowed_next_actions.includes("prepare_finance_context_investigation_packet"));
  assert.equal(validation.feeds.finance_context_investigation, false);
});

test("invalid or misaligned Measurement Cell fails packet assembly", () => {
  const plan = promotePlanToFullPlaybookReady(buildMeasurementPlan());
  const claimSnapshot = buildClaimSnapshot({ fullPlaybook: true });

  const invalidCell = buildPacketMeasurementCell({
    selectedMetric: {
      metric_id: "different_metric",
      metric_name: "Different metric",
      metric_source_system: "customer_support_system",
      metric_unit: "count",
      metric_direction: "increase",
      metric_sensitivity: "medium",
      baseline_value: 10,
      comparison_value: 12,
      owner_approval_state: "approved",
      source_ref: "outcome_evidence_value_hypothesis_packet_test",
      suppression_state: "CLEAR"
    }
  });
  assert.throws(
    () => buildPacket({ plan, claimSnapshot, measurementCell: invalidCell }),
    /Measurement Cell is invalid/
  );

  const sourceDriftCell = buildPacketMeasurementCell();
  sourceDriftCell.org_id = "org_other";
  assert.throws(
    () => buildPacket({ plan, claimSnapshot, measurementCell: sourceDriftCell }),
    /Measurement Cell org_id must match measurement plan org_id/
  );

  const workflowDriftPlan = promotePlanToFullPlaybookReady(buildMeasurementPlan());
  workflowDriftPlan.workflow_scope.workflow_id = "workflow_support_case_resolution";
  const workflowDriftCell = buildPacketMeasurementCell({
    workflowId: "workflow_other"
  });
  assert.throws(
    () => buildPacket({
      plan: workflowDriftPlan,
      claimSnapshot,
      measurementCell: workflowDriftCell
    }),
    /Measurement Cell workflow_id must match measurement plan workflow_id/
  );

  const cohortDriftPlan = promotePlanToFullPlaybookReady(buildMeasurementPlan());
  cohortDriftPlan.workflow_scope.cohort_key = "function:customer_support|eligible_seats:500";
  const cohortDriftCell = buildPacketMeasurementCell({
    cohortKey: "function:customer_success|eligible_seats:500"
  });
  assert.throws(
    () => buildPacket({
      plan: cohortDriftPlan,
      claimSnapshot,
      measurementCell: cohortDriftCell
    }),
    /Measurement Cell cohort_key must match measurement plan cohort_key/
  );
});

test("ROI Bot approval alone cannot upgrade a missing metric packet", () => {
  const plan = promotePlanToFullPlaybookReady(buildMeasurementPlan());
  const claimSnapshot = buildClaimSnapshot({ fullPlaybook: true });
  const packet = buildPacket({
    plan,
    claimSnapshot,
    roiBotContext: {
      present: true,
      scenario_context_only: true,
      source_tags: ["roi_bot_usage_actuals"],
      pull_date: "2026-06-19",
      assumptions_owner_role: "finance_partner",
      owner_approval_state: "approved"
    }
  });

  const validation = validateValueHypothesisReadinessPacket(packet);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(packet.readiness.readiness_state, "EVIDENCE_REVIEW_READY");
  assert.ok(packet.missing_evidence.includes("METRIC_MOVEMENT_MISSING"));
  assert.ok(!packet.missing_evidence.includes("MEASUREMENT_CELL_REQUIRED_FOR_FINANCE_CONTEXT"));
  assert.ok(!packet.allowed_next_actions.includes("prepare_finance_context_investigation_packet"));
});

test("packet validation rejects finance-context readiness without Measurement Cell evidence", () => {
  const plan = promotePlanToFullPlaybookReady(buildMeasurementPlan());
  const claimSnapshot = buildClaimSnapshot({ fullPlaybook: true });
  const packet = buildPacket({
    plan,
    claimSnapshot,
    measurementCell: buildPacketMeasurementCell()
  });
  const tamperedPacket = clone(packet);
  delete tamperedPacket.evidence_sources.measurement_cell;

  const validation = validateValueHypothesisReadinessPacket(tamperedPacket);
  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.some((gap) =>
    gap.includes("FINANCE_CONTEXT_INVESTIGATION_READY requires Measurement Cell")
  ));
  assert.equal(validation.feeds.finance_context_investigation, false);
});

test("suppression forces a hold-only packet", () => {
  const plan = promotePlanToFullPlaybookReady(buildMeasurementPlan());
  const claimSnapshot = buildClaimSnapshot({ fullPlaybook: true, suppressed: true });
  const packet = buildPacket({ plan, claimSnapshot });

  const validation = validateValueHypothesisReadinessPacket(packet);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(packet.readiness.readiness_state, "SUPPRESSED");
  assert.deepEqual(packet.allowed_next_actions, ["hold", "collect_missing_aggregate_evidence"]);
  assert.equal(packet.review_flow.current_review_label, "Hold");
});

test("metric source, metric id, and window drift fail packet assembly", () => {
  const plan = promotePlanToFullPlaybookReady(buildMeasurementPlan());
  const claimSnapshot = buildClaimSnapshot({ fullPlaybook: true });

  assert.throws(
    () => buildPacket({
      plan,
      claimSnapshot,
      selectedMetricMovement: {
        metric_id: "different_metric",
        state: "present",
        baseline_window: { start: "2026-05-01", end: "2026-05-31" },
        comparison_window: { start: "2026-06-01", end: "2026-06-30" },
        source_ref: "outcome_evidence_value_hypothesis_packet_test"
      }
    }),
    /selectedMetricMovement.metric_id must match measurement plan primary metric/
  );

  assert.throws(
    () => buildPacket({
      plan,
      claimSnapshot,
      selectedMetricMovement: {
        metric_id: "support_median_resolution_hours",
        state: "present",
        baseline_window: { start: "2026-05-01", end: "2026-05-31" },
        comparison_window: { start: "2026-07-01", end: "2026-07-31" },
        source_ref: "outcome_evidence_value_hypothesis_packet_test",
        owner_role: "support_business_owner"
      }
    }),
    /selectedMetricMovement windows must align to measurement plan windows/
  );

  assert.throws(
    () => buildPacket({
      plan,
      claimSnapshot,
      selectedMetricMovement: {
        metric_id: "support_median_resolution_hours",
        state: "present",
        baseline_window: { start: "2026-05-01", end: "2026-05-31" },
        comparison_window: { start: "2026-06-01", end: "2026-06-30" },
        source_ref: "unknown_outcome_ref",
        owner_role: "support_business_owner"
      }
    }),
    /selectedMetricMovement.source_ref must be present in claim snapshot source_refs/
  );
});

test("source-binding drift fails before packet assembly", () => {
  const plan = promotePlanToFullPlaybookReady(buildMeasurementPlan());
  const claimSnapshot = buildClaimSnapshot({ fullPlaybook: true });
  claimSnapshot.org_id = "org_other";

  assert.throws(
    () => buildPacket({
      plan,
      claimSnapshot,
      selectedMetricMovement: {
        metric_id: "support_median_resolution_hours",
        state: "present",
        baseline_window: { start: "2026-05-01", end: "2026-05-31" },
        comparison_window: { start: "2026-06-01", end: "2026-06-30" },
        source_ref: "outcome_evidence_value_hypothesis_packet_test",
        owner_role: "support_business_owner"
      }
    }),
    /source binding must be validated/
  );
});

test("ROI Bot context and formula side doors fail closed", () => {
  const plan = promotePlanToFullPlaybookReady(buildMeasurementPlan());
  const claimSnapshot = buildClaimSnapshot({ fullPlaybook: true });

  assert.throws(
    () => buildPacket({
      plan,
      claimSnapshot,
      roiBotContext: {
        present: true,
        scenario_context_only: false,
        owner_approval_state: "approved"
      }
    }),
    /roiBotContext\.scenario_context_only must be true/
  );

  assert.throws(
    () => buildPacket({
      plan,
      claimSnapshot,
      roiBotContext: {
        present: true,
        scenario_context_only: true,
        owner_approval_state: "approved",
        source_tags: ["proved ROI probability"]
      }
    }),
    /unsafe value, probability, or financial-proof language/
  );

  const packet = buildPacket();
  const formulaPacket = clone(packet);
  formulaPacket.formula_template = "confidence = weight * signal";
  assert.equal(validateValueHypothesisReadinessPacket(formulaPacket).valid, false);

  const thresholdPacket = clone(packet);
  thresholdPacket.threshold = 0.7;
  assert.equal(validateValueHypothesisReadinessPacket(thresholdPacket).valid, false);

  const persistencePacket = clone(packet);
  persistencePacket.persistence_policy.creates_backend_routes = true;
  assert.equal(validateValueHypothesisReadinessPacket(persistencePacket).valid, false);
});

test("packet validation rejects AIOM wording, confidence, and financial side doors", () => {
  const packet = buildPacket();

  const aiomPacket = clone(packet);
  aiomPacket.review_flow.current_review_label = "AIOM review";
  assert.equal(validateValueHypothesisReadinessPacket(aiomPacket).valid, false);

  const confidencePacket = clone(packet);
  confidencePacket.confidence_percent = 72;
  assert.equal(validateValueHypothesisReadinessPacket(confidencePacket).valid, false);

  const financialOutputPacket = clone(packet);
  financialOutputPacket.review_boundaries.financial_output_allowed = true;
  assert.equal(validateValueHypothesisReadinessPacket(financialOutputPacket).valid, false);

  const approvedPacket = clone(packet);
  approvedPacket.review_flow.current_review_label = "Glean-approved";
  assert.equal(validateValueHypothesisReadinessPacket(approvedPacket).valid, false);
});
