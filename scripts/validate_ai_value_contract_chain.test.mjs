import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPlaybookMeasurementPlanDraft,
  buildTelemetryEvidenceSnapshotDraft,
  validateEvidenceSnapshot,
  validateMeasurementPlan
} from "../shared/dist/aiValueEngine/index.js";

const REQUIRED_LAYER_1_ONLY_BLOCKED_USES = [
  "realized_roi",
  "ebita_claim",
  "causality_claim",
  "productivity_claim",
  "headcount_reduction_claim",
  "individual_attribution",
  "manager_or_team_ranking",
  "people_decisioning",
  "customer_facing_financial_output"
];

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

const clone = (value) => JSON.parse(JSON.stringify(value));

function buildPlan(overrides = {}) {
  const plan = buildPlaybookMeasurementPlanDraft({
    orgId: "org_example",
    workflowFamily: "customer_support_case_resolution",
    hypothesisStatement:
      "If support teams use AI for triage and answer drafting, then eligible cases should move faster while quality remains governed.",
    businessObjective: "Improve support case resolution capacity without weakening quality controls.",
    valueRoute: "capacity_creation",
    functionArea: "customer_support",
    primaryMetricId: "support_median_resolution_hours",
    primaryMetricName: "Median resolution time",
    baselineWindowStart: "2026-05-01",
    baselineWindowEnd: "2026-05-31",
    generatedAt: "2026-06-13T00:00:00.000Z",
    measurementPlanId: "measurement_plan_customer_support_contract_chain",
    ...overrides
  });
  return plan;
}

function buildSnapshot(overrides = {}) {
  return buildTelemetryEvidenceSnapshotDraft({
    orgId: "org_example",
    workflowFamily: "customer_support_case_resolution",
    workflowName: "Support case resolution",
    functionArea: "customer_support",
    windowStart: "2026-05-01",
    windowEnd: "2026-05-31",
    generatedAt: "2026-06-13T00:00:00.000Z",
    evidenceSnapshotId: "evidence_snapshot_customer_support_contract_chain",
    measurementPlanId: "measurement_plan_customer_support_contract_chain",
    aggregateTelemetrySummary: {
      probe_window_start: "2026-05-01",
      probe_window_end: "2026-05-31",
      aggregate_event_count: 125000,
      table_families_checked: [
        "scrubbed_llm_call",
        "scrubbed_client_analytics",
        "scrubbed_workflows"
      ],
      approved_field_coverage_summary: {
        approved_fields_expected: 24,
        approved_fields_found: 18,
        approved_fields_missing: 6
      },
      k_min_summary: {
        total_slices: 18,
        k_min_clear_slices: 14,
        suppressed_or_unknown_slices: 4,
        minimum_cohort_threshold: 5
      }
    },
    sourceRefs: {
      bigquery_probe_result_id: "bq_probe_ready_for_caveated_snapshot",
      source_readiness_ids: ["source_readiness_example"],
      notes: ["Read-only aggregate probe summary; no raw rows retained."]
    },
    ...overrides
  });
}

function caveatsMention(snapshot, pattern) {
  return Array.isArray(snapshot.required_caveats) &&
    snapshot.required_caveats.some((caveat) => pattern.test(String(caveat)));
}

function statusOf(snapshot, layer) {
  return snapshot?.playbook_coverage?.[layer]?.status;
}

function isIncompleteEvidenceState(state) {
  return ["missing", "held", "suppressed", "not_computed"].includes(String(state));
}

function validateContractChainPair(plan, snapshot) {
  const planResult = validateMeasurementPlan(plan);
  const snapshotResult = validateEvidenceSnapshot(snapshot);
  const gaps = [
    ...planResult.gaps.map((gap) => `measurement plan: ${gap}`),
    ...snapshotResult.gaps.map((gap) => `evidence snapshot: ${gap}`)
  ];

  if (planResult.valid && snapshotResult.valid) {
    if (plan.org_id !== snapshot.org_id) {
      gaps.push("contract chain: org_id must match from Measurement Plan to Evidence Snapshot");
    }
    if (plan.measurement_plan_id !== snapshot.measurement_plan_id) {
      gaps.push(
        "contract chain: Evidence Snapshot must bind to the Measurement Plan measurement_plan_id"
      );
    }
    if (plan.workflow_scope.workflow_family !== snapshot.workflow.workflow_family) {
      gaps.push(
        "contract chain: workflow_scope.workflow_family must propagate to snapshot.workflow.workflow_family"
      );
    }
    if (
      plan.playbook_evidence_requirements.layer_2_user_voice_empirical.required === true &&
      isIncompleteEvidenceState(statusOf(snapshot, "layer_2_user_voice_empirical")) &&
      !caveatsMention(snapshot, /(user voice|empirical|survey).*(missing|held|suppressed|not computed|not_computed|not provided|unavailable)|(missing|held|suppressed|not computed|not_computed|not provided|unavailable).*(user voice|empirical|survey)/i)
    ) {
      gaps.push("contract chain: missing Layer 2 evidence must remain explicit as a caveat");
    }
    if (
      plan.playbook_evidence_requirements.layer_3_business_system_outcomes.required === true &&
      isIncompleteEvidenceState(statusOf(snapshot, "layer_3_business_system_outcomes")) &&
      !caveatsMention(snapshot, /(business system-of-record|system-of-record|business outcome|outcome evidence).*(missing|held|suppressed|not computed|not_computed|not provided|unavailable)|(missing|held|suppressed|not computed|not_computed|not provided|unavailable).*(business system-of-record|system-of-record|business outcome|outcome evidence)/i)
    ) {
      gaps.push("contract chain: missing Layer 3 evidence must remain explicit as a caveat");
    }
    if (
      plan.aggregate_workforce_context_requirements.required === true &&
      snapshot.aggregate_workforce_context.context_state !== "provided_aggregate_safe" &&
      !caveatsMention(snapshot, /aggregate workforce context.*(?:not been provided|held|suppressed|blocked|unsafe)/i)
    ) {
      gaps.push(
        "contract chain: required aggregate workforce context must remain missing, held, suppressed, or blocked with a caveat"
      );
    }
    if (plan.vbd_measurement_design && !snapshot.vbd_operating_map) {
      gaps.push("contract chain: VBD measurement design requires a VBD operating map");
    }
    if (snapshot.playbook_coverage.coverage_status === "layer_1_only") {
      for (const use of REQUIRED_LAYER_1_ONLY_BLOCKED_USES) {
        if (!snapshot.blocked_uses.includes(use)) {
          gaps.push(`contract chain: layer_1_only snapshot must block ${use}`);
        }
      }
    }
  }

  return {
    valid: gaps.length === 0,
    gaps,
    planResult,
    snapshotResult
  };
}

function expectChainInvalid(plan, snapshot, expectedGapPattern) {
  const result = validateContractChainPair(plan, snapshot);
  assert.equal(result.valid, false, "Expected contract chain pair to fail");
  assert.ok(
    result.gaps.some((gap) => expectedGapPattern.test(gap)),
    `Expected gap matching ${expectedGapPattern}; got: ${result.gaps.join("; ")}`
  );
}

function promoteSnapshotToFullPlaybook(snapshot) {
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
  snapshot.source_refs.outcome_evidence_ids = ["outcome_evidence_customer_support_2026_06"];
  snapshot.aggregate_telemetry_summary.k_min_summary = {
    total_slices: 12,
    k_min_clear_slices: 12,
    suppressed_or_unknown_slices: 0,
    minimum_cohort_threshold: 5
  };
  snapshot.vbd_operating_map.breadth.suppressed_or_unknown_slices = 0;
  snapshot.suppression.held_lanes = [];
  snapshot.suppression.missing_lanes = [];
  snapshot.suppression.suppressed_lanes = [];
  snapshot.suppression.reason_codes = [];
  snapshot.required_caveats = [
    "Full Playbook coverage is validated only for this aggregate workflow window and must retain privacy, suppression, and claim-boundary controls."
  ];
  return snapshot;
}

function buildFullPlaybookSnapshot() {
  return promoteSnapshotToFullPlaybook(buildSnapshot());
}

test("Measurement Plan requirements and a telemetry-only Evidence Snapshot form a valid caveated handoff", () => {
  const plan = buildPlan();
  const snapshot = buildSnapshot();
  const result = validateContractChainPair(plan, snapshot);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(result.planResult.readiness.can_build_claim_readiness, false);
  assert.equal(snapshot.playbook_coverage.coverage_status, "layer_1_only");
  assert.equal(snapshot.playbook_coverage.layer_2_user_voice_empirical.status, "missing");
  assert.equal(snapshot.playbook_coverage.layer_3_business_system_outcomes.status, "missing");
  assert.equal(result.snapshotResult.feeds.claim_readiness, true);
  assert.equal(result.snapshotResult.feeds.executive_readout, false);
});

test("Measurement Plan requiring Layer 2 cannot pair with a snapshot that hides missing Layer 2 caveats", () => {
  const plan = buildPlan();
  const snapshot = buildSnapshot();
  snapshot.required_caveats = snapshot.required_caveats.filter(
    (caveat) => !/Layer 2|user voice|empirical|survey/i.test(caveat)
  );

  expectChainInvalid(plan, snapshot, /Layer 2 user voice or empirical evidence is missing and must be caveated|missing Layer 2 evidence/i);
});

test("Measurement Plan requiring Layer 3 cannot pair with a snapshot that hides missing system-of-record caveats", () => {
  const plan = buildPlan();
  const snapshot = buildSnapshot();
  snapshot.required_caveats = snapshot.required_caveats.filter(
    (caveat) => !/Layer 3|system-of-record|business outcome|outcome evidence/i.test(caveat)
  );

  expectChainInvalid(plan, snapshot, /Layer 3 business system-of-record outcome evidence is missing and must be caveated|missing Layer 3 evidence/i);
});

test("VBD measurement design requires an Evidence Snapshot VBD operating map", () => {
  const plan = buildPlan();
  const snapshot = buildSnapshot();
  delete snapshot.vbd_operating_map;

  expectChainInvalid(plan, snapshot, /vbd_operating_map is missing|VBD measurement design requires a VBD operating map/i);
});

test("required aggregate workforce context can remain not provided only when explicitly caveated", () => {
  const plan = buildPlan();
  plan.source_package_requirements.aggregate_workforce_context_required = true;
  plan.aggregate_workforce_context_requirements.required = true;
  plan.aggregate_workforce_context_requirements.source_owner_approval_required = true;
  const snapshot = buildSnapshot();
  const result = validateContractChainPair(plan, snapshot);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(snapshot.aggregate_workforce_context.context_state, "not_provided");
  assert.ok(
    caveatsMention(snapshot, /Aggregate workforce context has not been provided/i)
  );

  const silentSnapshot = clone(snapshot);
  silentSnapshot.required_caveats = silentSnapshot.required_caveats.filter(
    (caveat) => !/Aggregate workforce context/i.test(caveat)
  );
  expectChainInvalid(
    plan,
    silentSnapshot,
    /required aggregate workforce context must remain missing, held, suppressed, or blocked with a caveat/i
  );
});

test("layer_1_only Evidence Snapshots block financial, customer-facing, and people-decisioning uses", () => {
  const plan = buildPlan();
  const snapshot = buildSnapshot();
  const result = validateContractChainPair(plan, snapshot);

  assert.equal(result.valid, true, result.gaps.join("; "));
  for (const use of REQUIRED_LAYER_1_ONLY_BLOCKED_USES) {
    assert.ok(snapshot.blocked_uses.includes(use), `${use} should remain blocked`);
  }
});

test("high_fluency_flow remains Layer 1 posture only when full Playbook coverage is absent", () => {
  const plan = buildPlan();
  const snapshot = buildSnapshot();
  snapshot.vbd_operating_map.operating_mode = "high_fluency_flow";

  expectChainInvalid(
    plan,
    snapshot,
    /high_fluency_flow with layer_1_only coverage requires a caveat/i
  );

  snapshot.required_caveats.push(
    "High fluency flow is Layer 1 posture only and is not full value proof."
  );
  const result = validateContractChainPair(plan, snapshot);
  assert.equal(result.valid, true, result.gaps.join("; "));
});

test("safe aggregate workforce context does not upgrade coverage to full Playbook coverage", () => {
  const plan = buildPlan();
  const snapshot = buildSnapshot({
    aggregateWorkforceContext: {
      context_state: "provided_aggregate_safe",
      source_type: "aggregate_workforce_export",
      allowed_context_types: ["aggregate_role_family_context"],
      source_owner_approval_state: "approved",
      minimum_cohort_threshold: 5,
      cohort_threshold_met: true,
      caveats: [
        "Aggregate workforce context is customer-approved, cohort-safe, non-decisioning, and non-ranking."
      ]
    }
  });
  const result = validateContractChainPair(plan, snapshot);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(snapshot.aggregate_workforce_context.context_state, "provided_aggregate_safe");
  assert.equal(snapshot.playbook_coverage.coverage_status, "layer_1_only");
  assert.equal(result.snapshotResult.feeds.executive_readout, false);
});

test("unsafe privacy posture blocks downstream readiness", () => {
  const plan = buildPlan();
  const snapshot = buildSnapshot();
  snapshot.privacy_boundary.contains_people_decisioning = true;

  const result = validateContractChainPair(plan, snapshot);
  assert.equal(result.valid, false);
  assert.equal(result.snapshotResult.feeds.claim_readiness, false);
  assert.ok(
    result.gaps.some((gap) => /privacy_boundary\.contains_people_decisioning must be false/.test(gap)),
    result.gaps.join("; ")
  );
});

test("suppressed evidence cannot be exposed, reconstructed, or treated as support", () => {
  const plan = buildPlan();
  const snapshot = buildSnapshot();
  snapshot.suppression.hidden_values_exposed = true;

  expectChainInvalid(plan, snapshot, /suppression\.hidden_values_exposed must be false/);

  const reconstructedSnapshot = buildSnapshot();
  reconstructedSnapshot.playbook_layers.layer_3_business_system_outcomes.evidence_state =
    "suppressed";
  reconstructedSnapshot.playbook_coverage.layer_3_business_system_outcomes.status =
    "present";

  expectChainInvalid(
    plan,
    reconstructedSnapshot,
    /playbook_coverage\.layer_3_business_system_outcomes\.status cannot be present when playbook_layers\.layer_3_business_system_outcomes\.evidence_state is suppressed/
  );
});

test("BigQuery source availability alone cannot become full Playbook coverage", () => {
  const plan = buildPlan();
  const snapshot = buildSnapshot();
  snapshot.playbook_coverage.coverage_status = "full_playbook_coverage";

  expectChainInvalid(
    plan,
    snapshot,
    /BigQuery source availability alone cannot claim full_playbook_coverage/
  );
});

test("full Playbook coverage candidate validates only with all required layers and safe posture", () => {
  const snapshot = buildFullPlaybookSnapshot();
  const validation = validateEvidenceSnapshot(snapshot);

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(validation.feeds.executive_readout, true);
});

test("full Playbook coverage fails without Layer 2", () => {
  const snapshot = buildFullPlaybookSnapshot();
  snapshot.playbook_coverage.layer_2_user_voice_empirical.status = "missing";
  snapshot.playbook_layers.layer_2_user_voice_empirical.evidence_state = "missing";
  snapshot.required_caveats.push("Layer 2 user voice or empirical evidence is missing.");

  const validation = validateEvidenceSnapshot(snapshot);
  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.includes("full_playbook_coverage requires Layer 2 present"));
});

test("full Playbook coverage fails without Layer 3", () => {
  const snapshot = buildFullPlaybookSnapshot();
  snapshot.playbook_coverage.layer_3_business_system_outcomes.status = "missing";
  snapshot.playbook_layers.layer_3_business_system_outcomes.evidence_state = "missing";
  snapshot.required_caveats.push("Layer 3 business system-of-record outcome evidence is missing.");

  const validation = validateEvidenceSnapshot(snapshot);
  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.includes("full_playbook_coverage requires Layer 3 present"));
});

test("full Playbook coverage fails without governance evidence", () => {
  const snapshot = buildFullPlaybookSnapshot();
  snapshot.playbook_coverage.governance_evidence.status = "held";
  snapshot.playbook_layers.governance_evidence.evidence_state = "held";
  snapshot.snapshot_readiness_decision = "HOLD_FOR_GOVERNANCE_APPROVAL";
  snapshot.required_caveats.push("Governance evidence is held.");

  const validation = validateEvidenceSnapshot(snapshot);
  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.includes("full_playbook_coverage requires governance evidence present"));
});

test("full Playbook coverage fails without assumption evidence or explicit not-required state", () => {
  const snapshot = buildFullPlaybookSnapshot();
  snapshot.playbook_coverage.assumption_evidence.status = "held";
  snapshot.playbook_layers.assumption_evidence.evidence_state = "held";
  snapshot.required_caveats.push("Customer-owned assumptions are held until approved.");

  const validation = validateEvidenceSnapshot(snapshot);
  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.includes(
      "full_playbook_coverage requires assumption evidence present or explicitly not required"
    )
  );
});

test("full Playbook coverage fails when k-min threshold is not met", () => {
  const snapshot = buildFullPlaybookSnapshot();
  snapshot.aggregate_telemetry_summary.k_min_summary.suppressed_or_unknown_slices = 1;
  snapshot.vbd_operating_map.breadth.suppressed_or_unknown_slices = 1;

  const validation = validateEvidenceSnapshot(snapshot);
  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.includes("full_playbook_coverage requires k-min threshold met"));
});

test("full Playbook coverage fails with unsafe privacy posture", () => {
  const snapshot = buildFullPlaybookSnapshot();
  snapshot.privacy_boundary.contains_manager_or_team_ranking = true;

  const validation = validateEvidenceSnapshot(snapshot);
  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.includes("privacy_boundary.contains_manager_or_team_ranking must be false")
  );
});
