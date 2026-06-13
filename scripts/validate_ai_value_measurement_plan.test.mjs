import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  MEASUREMENT_PLAN_SCHEMA_VERSION,
  buildPlaybookMeasurementPlanDraft,
  validateMeasurementPlan
} from "../shared/dist/aiValueEngine/index.js";

const EXAMPLES = "docs/contracts/ai-value-measurement-plan/examples";

const clone = (value) => JSON.parse(JSON.stringify(value));
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

const REQUIRED_UNSAFE_BLOCKED_USES = [
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

function buildValidDraftPlan(overrides = {}) {
  return buildPlaybookMeasurementPlanDraft({
    orgId: "org_example",
    workflowFamily: "customer_support_case_resolution",
    hypothesisStatement:
      "If support teams use AI for case triage and answer drafting, then eligible support cases should move faster while quality and escalation posture remain governed.",
    businessObjective: "Improve support case resolution capacity without weakening quality controls.",
    valueRoute: "capacity_creation",
    functionArea: "customer_support",
    primaryMetricId: "support_median_resolution_hours",
    primaryMetricName: "Median resolution time",
    baselineWindowStart: "2026-05-01",
    baselineWindowEnd: "2026-05-31",
    generatedAt: "2026-06-13T00:00:00.000Z",
    measurementPlanId: "measurement_plan_customer_support_2026_05",
    ...overrides
  });
}

function buildFullPlaybookReadyPlan() {
  const plan = buildValidDraftPlan({
    comparisonWindowStart: "2026-06-01",
    comparisonWindowEnd: "2026-06-30",
    measurementPlanId: "measurement_plan_customer_support_full_playbook"
  });

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
  plan.readiness.measurement_plan_readiness = "ready_for_full_playbook_snapshot";
  plan.readiness.missing_requirements = [];
  plan.readiness.held_requirements = [];
  plan.readiness.required_caveats = [
    "Full Playbook readiness is a plan posture only; claim readiness, financial permission, and executive readouts require later governed gates."
  ];
  plan.readiness.next_actions = [
    "Build an evidence snapshot that carries all Playbook evidence layers and caveats forward."
  ];

  return plan;
}

function expectInvalid(mutator, expectedGapPattern) {
  const plan = buildValidDraftPlan();
  mutator(plan);
  const result = validateMeasurementPlan(plan);

  assert.equal(result.valid, false);
  assert.ok(
    result.gaps.some((gap) => expectedGapPattern.test(gap)),
    `Expected gap matching ${expectedGapPattern}; got: ${result.gaps.join("; ")}`
  );
}

test("valid layer-1-only draft plan passes", () => {
  const plan = buildValidDraftPlan();
  const result = validateMeasurementPlan(plan);

  assert.equal(plan.schema_version, MEASUREMENT_PLAN_SCHEMA_VERSION);
  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(result.measurement_plan_id, "measurement_plan_customer_support_2026_05");
  assert.equal(result.org_id, "org_example");
  assert.equal(result.readiness.can_build_evidence_snapshot, true);
  assert.equal(result.readiness.max_snapshot_type, "TELEMETRY_ONLY_CAVEATED");
  assert.equal(result.readiness.can_build_claim_readiness, false);
  assert.equal(result.readiness.can_build_executive_readout, false);
});

test("missing measurement_plan_id fails", () => {
  expectInvalid((plan) => delete plan.measurement_plan_id, /measurement_plan_id is missing/);
});

test("missing value hypothesis fails", () => {
  expectInvalid(
    (plan) => {
      plan.value_hypothesis.hypothesis_statement = "";
    },
    /value_hypothesis\.hypothesis_statement is missing/
  );
});

test("missing workflow_family fails", () => {
  expectInvalid(
    (plan) => {
      plan.workflow_scope.workflow_family = "";
    },
    /workflow_scope\.workflow_family is missing/
  );
});

test("missing primary metric fails", () => {
  expectInvalid(
    (plan) => {
      delete plan.metric_selection.primary_metric;
    },
    /metric_selection\.primary_metric is missing/
  );
});

test("invalid baseline window order fails", () => {
  expectInvalid(
    (plan) => {
      plan.windows.baseline_window_start = "2026-06-01";
      plan.windows.baseline_window_end = "2026-05-01";
    },
    /baseline_window_start must be before baseline_window_end/
  );
});

test("comparison start without comparison end fails", () => {
  expectInvalid(
    (plan) => {
      plan.windows.comparison_window_start = "2026-06-01";
      plan.windows.comparison_window_end = null;
    },
    /comparison_window_end is required when comparison_window_start is provided/
  );
});

test("missing Playbook evidence requirement group fails", () => {
  expectInvalid(
    (plan) => {
      delete plan.playbook_evidence_requirements.layer_3_business_system_outcomes;
    },
    /playbook_evidence_requirements\.layer_3_business_system_outcomes is missing/
  );
});

test("Layer 2 required without AI Fluency baseline or user voice export fails", () => {
  expectInvalid(
    (plan) => {
      plan.source_package_requirements.ai_fluency_baseline_required = false;
      plan.playbook_evidence_requirements.layer_2_user_voice_empirical.required_exports = [];
    },
    /Layer 2 requires AI Fluency baseline or a user voice export/
  );
});

test("Layer 3 required without system-of-record export fails", () => {
  expectInvalid(
    (plan) => {
      plan.source_package_requirements.system_of_record_export_required = false;
    },
    /Layer 3 requires system_of_record_export_required/
  );
});

test("financial assumption required without finance or business-owner approval fails", () => {
  expectInvalid(
    (plan) => {
      plan.assumptions.financial_assumption_required = true;
      plan.source_package_requirements.finance_or_business_owner_approval_required = false;
    },
    /financial assumptions require finance_or_business_owner_approval_required/
  );
});

test("productivity recapture required without customer-owned assumption requirement fails", () => {
  expectInvalid(
    (plan) => {
      plan.assumptions.productivity_recapture_required = true;
      plan.assumptions.customer_owned_assumption_required = false;
    },
    /productivity recapture requires customer_owned_assumption_required/
  );
});

test("aggregate workforce context required without source owner approval fails", () => {
  expectInvalid(
    (plan) => {
      plan.aggregate_workforce_context_requirements.required = true;
      plan.aggregate_workforce_context_requirements.source_owner_approval_required = false;
    },
    /aggregate workforce context requires source_owner_approval_required/
  );
});

test("aggregate workforce context required with cohort threshold below 5 fails", () => {
  expectInvalid(
    (plan) => {
      plan.aggregate_workforce_context_requirements.required = true;
      plan.aggregate_workforce_context_requirements.minimum_cohort_threshold = 4;
    },
    /aggregate_workforce_context_requirements\.minimum_cohort_threshold must be at least 5/
  );
});

test("aggregate workforce context does not permit people decisioning", () => {
  expectInvalid(
    (plan) => {
      plan.aggregate_workforce_context_requirements.required = true;
      plan.aggregate_workforce_context_requirements.blocked_uses =
        plan.aggregate_workforce_context_requirements.blocked_uses.filter(
          (use) => use !== "people_decisioning"
        );
    },
    /aggregate_workforce_context_requirements\.blocked_uses missing people_decisioning/
  );
});

test("person-level HRIS records fail", () => {
  expectInvalid(
    (plan) => {
      plan.privacy_boundary.contains_person_level_hris_records = true;
    },
    /contains_person_level_hris_records must be false/
  );
});

test("hashed or joinable person identifiers fail", () => {
  expectInvalid(
    (plan) => {
      plan.privacy_boundary.contains_hashed_or_joinable_person_identifiers = true;
    },
    /contains_hashed_or_joinable_person_identifiers must be false/
  );
});

test("individual productivity fails", () => {
  expectInvalid(
    (plan) => {
      plan.privacy_boundary.contains_person_level_productivity = true;
    },
    /contains_person_level_productivity must be false/
  );
});

test("manager/team ranking fails", () => {
  expectInvalid(
    (plan) => {
      plan.privacy_boundary.contains_manager_or_team_ranking = true;
    },
    /contains_manager_or_team_ranking must be false/
  );
});

test("people decisioning fails", () => {
  expectInvalid(
    (plan) => {
      plan.privacy_boundary.contains_people_decisioning = true;
    },
    /contains_people_decisioning must be false/
  );
});

test("compensation/performance inference fails", () => {
  expectInvalid(
    (plan) => {
      plan.privacy_boundary.contains_compensation_or_performance_inference = true;
    },
    /contains_compensation_or_performance_inference must be false/
  );
});

test("HRIS inference from AI usage fails", () => {
  expectInvalid(
    (plan) => {
      plan.privacy_boundary.contains_hris_inference_from_ai_usage = true;
    },
    /contains_hris_inference_from_ai_usage must be false/
  );
});

test("missing vbd_measurement_design fails", () => {
  expectInvalid(
    (plan) => {
      delete plan.vbd_measurement_design;
    },
    /vbd_measurement_design is missing/
  );
});

test("missing VBD velocity, breadth, depth, or claim boundary fails", () => {
  for (const [field, expectedGap] of [
    ["velocity", /vbd_measurement_design\.velocity is missing/],
    ["breadth", /vbd_measurement_design\.breadth is missing/],
    ["depth", /vbd_measurement_design\.depth is missing/],
    ["vbd_claim_boundary", /vbd_measurement_design\.vbd_claim_boundary is missing/]
  ]) {
    const plan = buildValidDraftPlan();
    delete plan.vbd_measurement_design[field];
    const result = validateMeasurementPlan(plan);

    assert.equal(result.valid, false, `${field} should be required`);
    assert.ok(
      result.gaps.some((gap) => expectedGap.test(gap)),
      result.gaps.join("; ")
    );
  }
});

test("VBD claim boundary contributes_to_playbook_layer other than Layer 1 fails", () => {
  expectInvalid(
    (plan) => {
      plan.vbd_measurement_design.vbd_claim_boundary.contributes_to_playbook_layer =
        "layer_3_business_system_outcomes";
    },
    /vbd_measurement_design\.vbd_claim_boundary\.contributes_to_playbook_layer must be layer_1_platform_telemetry/
  );
});

test("VBD velocity required without Layer 1 required fails", () => {
  expectInvalid(
    (plan) => {
      plan.playbook_evidence_requirements.layer_1_platform_telemetry.required = false;
    },
    /VBD velocity requires Layer 1 platform telemetry/
  );
});

test("VBD velocity required without baseline requirement fails", () => {
  expectInvalid(
    (plan) => {
      plan.vbd_measurement_design.velocity.baseline_required = false;
    },
    /VBD velocity requires baseline_required true/
  );
});

test("VBD velocity required without comparison requirement fails when comparison is selected", () => {
  expectInvalid(
    (plan) => {
      plan.windows.window_alignment_state = "baseline_and_comparison_selected";
      plan.windows.comparison_window_start = "2026-06-01";
      plan.windows.comparison_window_end = "2026-06-30";
      plan.vbd_measurement_design.velocity.comparison_required = false;
    },
    /VBD velocity requires comparison_required true unless the window state is baseline_only or comparison_pending/
  );
});

test("VBD breadth required with mismatched aggregate grain fails", () => {
  expectInvalid(
    (plan) => {
      plan.vbd_measurement_design.breadth.approved_aggregate_grain = "function";
    },
    /VBD breadth approved_aggregate_grain must match workflow_scope/
  );
});

test("VBD breadth requires blocked individual, employee, manager, team, and manager-chain dimensions", () => {
  for (const blockedDimension of [
    "individual",
    "employee",
    "manager_ranking",
    "team_ranking",
    "manager_chain"
  ]) {
    const plan = buildValidDraftPlan();
    plan.vbd_measurement_design.breadth.blocked_dimensions =
      plan.vbd_measurement_design.breadth.blocked_dimensions.filter(
        (dimension) => dimension !== blockedDimension
      );
    const result = validateMeasurementPlan(plan);

    assert.equal(result.valid, false, `${blockedDimension} should be required`);
    assert.ok(
      result.gaps.includes(
        `vbd_measurement_design.breadth.blocked_dimensions missing ${blockedDimension}`
      ),
      result.gaps.join("; ")
    );
  }
});

test("VBD breadth rejects person-level spread dimensions", () => {
  for (const dimension of [
    "employee_id",
    "hashed_person_id",
    "person_level_hris",
    "manager_ranking",
    "team_ranking",
    "people_decisioning"
  ]) {
    const plan = buildValidDraftPlan();
    plan.vbd_measurement_design.breadth.allowed_spread_dimensions.push(dimension);
    const result = validateMeasurementPlan(plan);

    assert.equal(result.valid, false, `${dimension} should be rejected`);
    assert.ok(
      result.gaps.includes(
        `vbd_measurement_design.breadth.allowed_spread_dimensions contains invalid dimension ${dimension}`
      ),
      result.gaps.join("; ")
    );
  }
});

test("VBD depth required without Layer 1 required fails", () => {
  expectInvalid(
    (plan) => {
      plan.vbd_measurement_design.velocity.required = false;
      plan.playbook_evidence_requirements.layer_1_platform_telemetry.required = false;
    },
    /VBD depth requires Layer 1 platform telemetry/
  );
});

test("VBD depth agent, artifact, or governed-action basis requires quality or outcome pairing", () => {
  for (const basis of [
    "agent_lifecycle",
    "artifact_output_metadata",
    "governed_action_boundary"
  ]) {
    const plan = buildValidDraftPlan();
    plan.vbd_measurement_design.depth.measurement_basis = basis;
    plan.vbd_measurement_design.depth.requires_quality_or_outcome_pairing = false;

    const result = validateMeasurementPlan(plan);

    assert.equal(result.valid, false, `${basis} should require pairing`);
    assert.ok(
      result.gaps.includes(
        "VBD depth agent, artifact, or governed-action basis requires quality or outcome pairing"
      ),
      result.gaps.join("; ")
    );
  }
});

test("VBD claim boundary missing blocked uses fails", () => {
  for (const blockedUse of REQUIRED_UNSAFE_BLOCKED_USES) {
    const plan = buildValidDraftPlan();
    plan.vbd_measurement_design.vbd_claim_boundary.blocked_uses =
      plan.vbd_measurement_design.vbd_claim_boundary.blocked_uses.filter(
        (use) => use !== blockedUse
      );
    const result = validateMeasurementPlan(plan);

    assert.equal(result.valid, false, `${blockedUse} should be required`);
    assert.ok(
      result.gaps.includes(
        `vbd_measurement_design.vbd_claim_boundary.blocked_uses missing ${blockedUse}`
      ),
      result.gaps.join("; ")
    );
  }
});

test("VBD allowed uses containing ROI or EBITA fail", () => {
  for (const use of [
    "realized_roi",
    "ebita_claim",
    "causality_claim",
    "productivity_claim",
    "headcount_reduction_claim",
    "individual_attribution",
    "manager_or_team_ranking",
    "people_decisioning",
    "customer_facing_financial_output"
  ]) {
    const plan = buildValidDraftPlan();
    plan.vbd_measurement_design.vbd_claim_boundary.allowed_uses.push(use);
    const result = validateMeasurementPlan(plan);

    assert.equal(result.valid, false, `${use} should be rejected`);
    assert.ok(
      result.gaps.includes(
        `vbd_measurement_design.vbd_claim_boundary.allowed_uses contains blocked or unsupported use: ${use}`
      ),
      result.gaps.join("; ")
    );
  }
});

test("VBD cannot upgrade plan to full Playbook readiness without Layer 2 and Layer 3", () => {
  const plan = buildValidDraftPlan();
  plan.readiness.measurement_plan_readiness = "ready_for_full_playbook_snapshot";
  plan.readiness.missing_requirements = [];
  plan.readiness.held_requirements = [];
  plan.playbook_evidence_requirements.layer_2_user_voice_empirical.required = false;
  plan.playbook_evidence_requirements.layer_3_business_system_outcomes.required = false;

  const result = validateMeasurementPlan(plan);

  assert.equal(result.valid, false);
  assert.ok(
    result.gaps.includes("ready_for_full_playbook_snapshot requires Layer 2 evidence"),
    result.gaps.join("; ")
  );
  assert.ok(
    result.gaps.includes("ready_for_full_playbook_snapshot requires Layer 3 evidence"),
    result.gaps.join("; ")
  );
});

test("VBD claim boundary cannot compute claim readiness, financial permission, or executive readout", () => {
  const plan = buildValidDraftPlan();
  plan.vbd_measurement_design.vbd_claim_boundary.claim_readiness = { status: "ready" };
  plan.vbd_measurement_design.vbd_claim_boundary.financial_permission = {
    customer_facing_financial_output: true
  };
  plan.vbd_measurement_design.vbd_claim_boundary.executive_readout = {
    status: "ready"
  };

  const result = validateMeasurementPlan(plan);

  assert.equal(result.valid, false);
  assert.ok(result.gaps.includes("VBD must not compute claim_readiness"));
  assert.ok(result.gaps.includes("VBD must not compute financial_permission"));
  assert.ok(result.gaps.includes("VBD must not compute executive_readout"));
});

test("full Playbook ready plan passes", () => {
  const plan = buildFullPlaybookReadyPlan();
  const result = validateMeasurementPlan(plan);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(result.readiness.max_snapshot_type, "FULL_STACK_EVIDENCE");
  assert.equal(result.readiness.can_build_claim_readiness, true);
  assert.equal(result.readiness.can_build_executive_readout, true);
});

test("full Playbook readiness fails if Layer 2 is missing", () => {
  const plan = buildFullPlaybookReadyPlan();
  plan.playbook_evidence_requirements.layer_2_user_voice_empirical.required = false;

  const result = validateMeasurementPlan(plan);

  assert.equal(result.valid, false);
  assert.ok(result.gaps.includes("ready_for_full_playbook_snapshot requires Layer 2 evidence"));
});

test("full Playbook readiness fails if Layer 3 is missing", () => {
  const plan = buildFullPlaybookReadyPlan();
  plan.playbook_evidence_requirements.layer_3_business_system_outcomes.required = false;

  const result = validateMeasurementPlan(plan);

  assert.equal(result.valid, false);
  assert.ok(result.gaps.includes("ready_for_full_playbook_snapshot requires Layer 3 evidence"));
});

test("full Playbook readiness fails if governance evidence is missing", () => {
  const plan = buildFullPlaybookReadyPlan();
  plan.playbook_evidence_requirements.governance_evidence.required = false;

  const result = validateMeasurementPlan(plan);

  assert.equal(result.valid, false);
  assert.ok(result.gaps.includes("ready_for_full_playbook_snapshot requires governance evidence"));
});

test("full Playbook readiness fails if k-min posture is missing from governance controls", () => {
  const plan = buildFullPlaybookReadyPlan();
  plan.playbook_evidence_requirements.governance_evidence.required_controls =
    plan.playbook_evidence_requirements.governance_evidence.required_controls.filter(
      (control) => control !== "k_min_posture"
    );

  const result = validateMeasurementPlan(plan);

  assert.equal(result.valid, false);
  assert.ok(
    result.gaps.includes(
      "ready_for_full_playbook_snapshot requires governance required_controls to include k_min_posture"
    ),
    result.gaps.join("; ")
  );
});

test("full Playbook readiness fails if customer-owned assumptions are held", () => {
  const plan = buildFullPlaybookReadyPlan();
  plan.assumptions.assumption_approval_state = "held";

  const result = validateMeasurementPlan(plan);

  assert.equal(result.valid, false);
  assert.ok(
    result.gaps.includes(
      "ready_for_full_playbook_snapshot requires approved customer-owned assumptions or explicitly not-required assumptions"
    ),
    result.gaps.join("; ")
  );
});

test("full Playbook readiness fails if unsafe privacy flags are true", () => {
  const plan = buildFullPlaybookReadyPlan();
  plan.privacy_boundary.contains_direct_identifiers = true;

  const result = validateMeasurementPlan(plan);

  assert.equal(result.valid, false);
  assert.ok(result.gaps.includes("privacy_boundary.contains_direct_identifiers must be false"));
});

test("builder creates valid draft plan", () => {
  const plan = buildPlaybookMeasurementPlanDraft({
    orgId: "org_builder",
    workflowFamily: "sales_pipeline_hygiene",
    hypothesisStatement:
      "If sellers use AI for account research and opportunity preparation, then pipeline hygiene should improve.",
    businessObjective: "Improve sales pipeline review readiness.",
    baselineWindowStart: "2026-05-01",
    baselineWindowEnd: "2026-05-31",
    generatedAt: "2026-06-13T00:00:00.000Z",
    measurementPlanId: "measurement_plan_builder"
  });
  const result = validateMeasurementPlan(plan);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(plan.readiness.measurement_plan_readiness, "held_for_customer_exports");
  assert.equal(
    plan.vbd_measurement_design.vbd_claim_boundary.contributes_to_playbook_layer,
    "layer_1_platform_telemetry"
  );
  assert.deepEqual(
    plan.vbd_measurement_design.vbd_claim_boundary.blocked_uses,
    REQUIRED_UNSAFE_BLOCKED_USES
  );
});

test("builder defaults to held_for_customer_exports when Layer 2 or Layer 3 exports are missing", () => {
  const plan = buildValidDraftPlan();

  assert.equal(plan.readiness.measurement_plan_readiness, "held_for_customer_exports");
  assert.ok(plan.readiness.missing_requirements.includes("layer_2_user_voice_empirical"));
  assert.ok(plan.readiness.missing_requirements.includes("layer_3_business_system_outcomes"));
});

test("validation result maps draft plans to telemetry-only snapshot readiness", () => {
  const result = validateMeasurementPlan(buildValidDraftPlan());

  assert.equal(result.valid, true);
  assert.equal(result.readiness.max_snapshot_type, "TELEMETRY_ONLY_CAVEATED");
  assert.equal(result.readiness.can_build_evidence_snapshot, true);
});

test("validation result maps full Playbook ready plans to full-stack evidence", () => {
  const result = validateMeasurementPlan(buildFullPlaybookReadyPlan());

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(result.readiness.max_snapshot_type, "FULL_STACK_EVIDENCE");
});

test("example payloads validate", () => {
  for (const file of [
    "layer-1-only-draft-plan.json",
    "full-playbook-ready-plan.json"
  ]) {
    const plan = readJson(`${EXAMPLES}/${file}`);
    const result = validateMeasurementPlan(plan);

    assert.equal(result.valid, true, `${file}: ${result.gaps.join("; ")}`);
    assert.equal(plan.privacy_boundary.aggregate_only, true);
    assert.equal(plan.privacy_boundary.contains_direct_identifiers, false);
    assert.equal(plan.privacy_boundary.contains_hashed_or_joinable_person_identifiers, false);
  }
});

test("draft or held plans require unsafe blocked uses", () => {
  for (const blockedUse of REQUIRED_UNSAFE_BLOCKED_USES) {
    const plan = buildValidDraftPlan();
    plan.blocked_uses = plan.blocked_uses.filter((use) => use !== blockedUse);
    const result = validateMeasurementPlan(plan);

    assert.equal(result.valid, false, `${blockedUse} should be required`);
    assert.ok(
      result.gaps.includes(`blocked_uses missing ${blockedUse}`),
      result.gaps.join("; ")
    );
  }
});

test("full Playbook ready plans still require unsafe blocked uses", () => {
  for (const blockedUse of REQUIRED_UNSAFE_BLOCKED_USES) {
    const plan = buildFullPlaybookReadyPlan();
    plan.blocked_uses = plan.blocked_uses.filter((use) => use !== blockedUse);
    const result = validateMeasurementPlan(plan);

    assert.equal(result.valid, false, `${blockedUse} should be required`);
    assert.ok(
      result.gaps.includes(`blocked_uses missing ${blockedUse}`),
      result.gaps.join("; ")
    );
  }
});

test("top-level allowed uses are limited to planning-only contract uses", () => {
  expectInvalid(
    (plan) => {
      plan.allowed_uses.push("unsupported_internal_dashboard");
    },
    /allowed_uses contains unsupported use: unsupported_internal_dashboard/
  );
});

test("measurement plan cannot compute claim readiness, financial permission, or readout output", () => {
  const plan = buildValidDraftPlan();
  plan.claim_readiness = { status: "ready" };
  plan.financial_permission = { customer_facing_financial_output: true };
  plan.executive_readout = { status: "ready" };

  const result = validateMeasurementPlan(plan);

  assert.equal(result.valid, false);
  assert.ok(result.gaps.includes("measurement plan must not compute claim_readiness"));
  assert.ok(result.gaps.includes("measurement plan must not compute financial_permission"));
  assert.ok(result.gaps.includes("measurement plan must not become an executive_readout"));
});
