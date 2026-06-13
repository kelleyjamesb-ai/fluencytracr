import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  EVIDENCE_SNAPSHOT_SCHEMA_VERSION,
  buildTelemetryEvidenceSnapshotDraft,
  validateEvidenceSnapshot
} from "../shared/dist/aiValueEngine/index.js";

const EXAMPLES = "docs/contracts/ai-value-evidence-snapshot/examples";
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
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

function buildValidTelemetrySnapshot(overrides = {}) {
  const snapshot = buildTelemetryEvidenceSnapshotDraft({
    orgId: "org_example",
    workflowFamily: "customer_support_case_resolution",
    workflowName: "Support case resolution",
    functionArea: "customer_support",
    windowStart: "2026-05-01",
    windowEnd: "2026-05-31",
    generatedAt: "2026-06-13T00:00:00.000Z",
    evidenceSnapshotId: "evidence_snapshot_customer_support_2026_05",
    measurementPlanId: "measurement_plan_customer_support_2026_05",
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
  return snapshot;
}

function expectInvalid(mutator, expectedGapPattern) {
  const snapshot = buildValidTelemetrySnapshot();
  mutator(snapshot);
  const result = validateEvidenceSnapshot(snapshot);

  assert.equal(result.valid, false);
  assert.ok(
    result.gaps.some((gap) => expectedGapPattern.test(gap)),
    `Expected gap matching ${expectedGapPattern}; got: ${result.gaps.join("; ")}`
  );
}

function seedCoverageForMutation(snapshot) {
  snapshot.playbook_coverage ??= {
    coverage_status: "layer_1_only",
    layer_1_platform_telemetry: {
      status: "partial",
      covered_signals: [],
      missing_signals: [],
      held_signals: [],
      caveats: []
    },
    layer_2_user_voice_empirical: {
      status: "missing",
      covered_signals: [],
      missing_signals: [],
      held_signals: [],
      required_source_exports: [],
      caveats: []
    },
    layer_3_business_system_outcomes: {
      status: "missing",
      covered_signals: [],
      missing_signals: [],
      held_signals: [],
      required_source_exports: [],
      caveats: []
    },
    governance_evidence: {
      status: "partial",
      covered_signals: [],
      missing_signals: [],
      held_signals: [],
      caveats: []
    },
    assumption_evidence: {
      status: "held",
      covered_signals: [],
      missing_signals: [],
      held_signals: [],
      required_approvals: [],
      caveats: []
    }
  };
}

function promoteToFullPlaybookCoverage(snapshot) {
  seedCoverageForMutation(snapshot);
  snapshot.snapshot_type = "FULL_STACK_EVIDENCE";
  snapshot.playbook_coverage.coverage_status = "full_playbook_coverage";
  snapshot.playbook_coverage.layer_1_platform_telemetry.status = "present";
  snapshot.playbook_coverage.layer_1_platform_telemetry.covered_signals =
    EXPECTED_COVERAGE_SIGNALS.layer_1_platform_telemetry;
  snapshot.playbook_coverage.layer_1_platform_telemetry.missing_signals = [];
  snapshot.playbook_coverage.layer_1_platform_telemetry.held_signals = [];
  snapshot.playbook_coverage.layer_2_user_voice_empirical.status = "present";
  snapshot.playbook_coverage.layer_2_user_voice_empirical.covered_signals =
    EXPECTED_COVERAGE_SIGNALS.layer_2_user_voice_empirical;
  snapshot.playbook_coverage.layer_2_user_voice_empirical.missing_signals = [];
  snapshot.playbook_coverage.layer_2_user_voice_empirical.held_signals = [];
  snapshot.playbook_coverage.layer_3_business_system_outcomes.status = "present";
  snapshot.playbook_coverage.layer_3_business_system_outcomes.covered_signals =
    EXPECTED_COVERAGE_SIGNALS.layer_3_business_system_outcomes;
  snapshot.playbook_coverage.layer_3_business_system_outcomes.missing_signals = [];
  snapshot.playbook_coverage.layer_3_business_system_outcomes.held_signals = [];
  snapshot.playbook_coverage.governance_evidence.status = "present";
  snapshot.playbook_coverage.governance_evidence.covered_signals =
    EXPECTED_COVERAGE_SIGNALS.governance_evidence;
  snapshot.playbook_coverage.governance_evidence.missing_signals = [];
  snapshot.playbook_coverage.governance_evidence.held_signals = [];
  snapshot.playbook_coverage.assumption_evidence.status = "present";
  snapshot.playbook_coverage.assumption_evidence.covered_signals =
    EXPECTED_COVERAGE_SIGNALS.assumption_evidence;
  snapshot.playbook_coverage.assumption_evidence.missing_signals = [];
  snapshot.playbook_coverage.assumption_evidence.held_signals = [];
  snapshot.playbook_layers.layer_2_user_voice_empirical.evidence_state = "present";
  snapshot.playbook_layers.layer_3_business_system_outcomes.evidence_state = "present";
  snapshot.playbook_layers.governance_evidence.evidence_state = "present";
  snapshot.playbook_layers.assumption_evidence.evidence_state = "present";
  snapshot.source_refs.outcome_evidence_ids = ["outcome_evidence_customer_support_2026_06"];
  snapshot.aggregate_telemetry_summary.k_min_summary = {
    total_slices: 12,
    k_min_clear_slices: 12,
    suppressed_or_unknown_slices: 0,
    minimum_cohort_threshold: 5
  };
}

function makeFullPlaybookCoverageSnapshot() {
  const snapshot = buildValidTelemetrySnapshot();
  promoteToFullPlaybookCoverage(snapshot);
  return snapshot;
}

test("valid telemetry-only caveated snapshot passes", () => {
  const snapshot = buildValidTelemetrySnapshot();
  const result = validateEvidenceSnapshot(snapshot);

  assert.equal(snapshot.schema_version, EVIDENCE_SNAPSHOT_SCHEMA_VERSION);
  assert.ok(snapshot.playbook_coverage);
  assert.equal(snapshot.playbook_coverage.coverage_status, "layer_1_only");
  assert.equal(
    snapshot.playbook_coverage.layer_2_user_voice_empirical.status,
    "missing"
  );
  assert.equal(
    snapshot.playbook_coverage.layer_3_business_system_outcomes.status,
    "missing"
  );
  assert.equal(snapshot.playbook_coverage.assumption_evidence.status, "held");
  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(result.evidence_snapshot_id, snapshot.evidence_snapshot_id);
  assert.equal(result.org_id, "org_example");
  assert.equal(result.feeds.evidence_snapshot, true);
  assert.equal(result.feeds.claim_readiness, true);
  assert.equal(result.feeds.executive_readout, false);
});

test("example payloads validate and parse as aggregate-only contract examples", () => {
  for (const file of [
    "telemetry-only-caveated-snapshot.json",
    "aggregate-workforce-context-caveated-snapshot.json"
  ]) {
    const snapshot = readJson(`${EXAMPLES}/${file}`);
    const result = validateEvidenceSnapshot(snapshot);

    assert.equal(result.valid, true, `${file}: ${result.gaps.join("; ")}`);
    assert.equal(snapshot.privacy_boundary.aggregate_only, true);
    assert.equal(snapshot.privacy_boundary.contains_direct_identifiers, false);
    assert.equal(snapshot.privacy_boundary.contains_raw_content, false);
    assert.ok(snapshot.playbook_coverage);
    assert.equal(snapshot.playbook_coverage.coverage_status, "layer_1_only");
  }
});

test("missing playbook_coverage fails", () => {
  expectInvalid(
    (snapshot) => {
      delete snapshot.playbook_coverage;
    },
    /playbook_coverage is missing/
  );
});

test("invalid coverage_status fails", () => {
  expectInvalid(
    (snapshot) => {
      snapshot.playbook_coverage.coverage_status = "bigquery_full_coverage";
    },
    /playbook_coverage\.coverage_status is invalid/
  );
});

test("missing vbd_operating_map fails", () => {
  expectInvalid(
    (snapshot) => {
      delete snapshot.vbd_operating_map;
    },
    /vbd_operating_map is missing/
  );
});

test("missing VBD velocity, breadth, depth, or operating mode fails", () => {
  for (const [field, expectedGap] of [
    ["velocity", /vbd_operating_map\.velocity is missing/],
    ["breadth", /vbd_operating_map\.breadth is missing/],
    ["depth", /vbd_operating_map\.depth is missing/],
    ["operating_mode", /vbd_operating_map\.operating_mode is missing/]
  ]) {
    const snapshot = buildValidTelemetrySnapshot();
    delete snapshot.vbd_operating_map[field];
    const result = validateEvidenceSnapshot(snapshot);

    assert.equal(result.valid, false, `${field} should be required`);
    assert.ok(
      result.gaps.some((gap) => expectedGap.test(gap)),
      result.gaps.join("; ")
    );
  }
});

test("VBD contributes_to_playbook_layer not Layer 1 fails", () => {
  expectInvalid(
    (snapshot) => {
      snapshot.vbd_operating_map.contributes_to_playbook_layer =
        "layer_3_business_system_outcomes";
    },
    /vbd_operating_map\.contributes_to_playbook_layer must be layer_1_platform_telemetry/
  );
});

test("VBD blocked_interpretation missing unsafe uses fails", () => {
  for (const blockedUse of REQUIRED_LAYER_1_ONLY_BLOCKED_USES) {
    const snapshot = buildValidTelemetrySnapshot();
    snapshot.vbd_operating_map.blocked_interpretation =
      snapshot.vbd_operating_map.blocked_interpretation.filter(
        (use) => use !== blockedUse
      );
    const result = validateEvidenceSnapshot(snapshot);

    assert.equal(result.valid, false, `${blockedUse} should be required`);
    assert.ok(
      result.gaps.includes(`vbd_operating_map.blocked_interpretation missing ${blockedUse}`),
      result.gaps.join("; ")
    );
  }
});

test("VBD allowed_interpretation cannot include ROI, productivity, or ranking", () => {
  for (const interpretation of [
    "realized_roi",
    "productivity_claim",
    "manager_or_team_ranking"
  ]) {
    const snapshot = buildValidTelemetrySnapshot();
    snapshot.vbd_operating_map.allowed_interpretation.push(interpretation);
    const result = validateEvidenceSnapshot(snapshot);

    assert.equal(result.valid, false, `${interpretation} should be blocked`);
    assert.ok(
      result.gaps.some((gap) =>
        gap.includes(
          `vbd_operating_map.allowed_interpretation contains blocked or unsupported interpretation: ${interpretation}`
        )
      ),
      result.gaps.join("; ")
    );
  }
});

test("VBD breadth approved aggregate grain mismatch fails", () => {
  expectInvalid(
    (snapshot) => {
      snapshot.privacy_boundary.approved_aggregate_grain = "approved_aggregate_cohort";
      snapshot.vbd_operating_map.breadth.approved_aggregate_grain = "workflow_family";
    },
    /vbd_operating_map\.breadth\.approved_aggregate_grain must match or be compatible/
  );
});

test("VBD breadth suppressed_or_unknown_slices is preserved", () => {
  const snapshot = buildValidTelemetrySnapshot();

  assert.equal(snapshot.vbd_operating_map.breadth.suppressed_or_unknown_slices, 4);

  snapshot.vbd_operating_map.breadth.suppressed_or_unknown_slices = 0;
  const result = validateEvidenceSnapshot(snapshot);

  assert.equal(result.valid, false);
  assert.ok(
    result.gaps.includes(
      "vbd_operating_map.breadth.suppressed_or_unknown_slices must preserve aggregate telemetry suppressed_or_unknown_slices"
    ),
    result.gaps.join("; ")
  );
});

test("embedded VBD depth with missing Layer 3 cannot allow business value claims", () => {
  expectInvalid(
    (snapshot) => {
      snapshot.vbd_operating_map.depth.state = "embedded";
      snapshot.vbd_operating_map.depth.requires_layer_3_for_value_claim = false;
    },
    /embedded VBD depth requires Layer 3 for value claims/
  );
  expectInvalid(
    (snapshot) => {
      snapshot.vbd_operating_map.allowed_interpretation.push("business_value_claim");
    },
    /allowed_interpretation contains blocked or unsupported interpretation: business_value_claim/
  );
});

test("high_fluency_flow with layer_1_only requires posture-only caveat", () => {
  expectInvalid(
    (snapshot) => {
      snapshot.vbd_operating_map.operating_mode = "high_fluency_flow";
    },
    /high_fluency_flow with layer_1_only coverage requires a caveat/
  );
});

test("VBD cannot upgrade coverage_status to full_playbook_coverage", () => {
  const snapshot = buildValidTelemetrySnapshot();
  snapshot.playbook_coverage.coverage_status = "full_playbook_coverage";
  snapshot.vbd_operating_map.operating_mode = "high_fluency_flow";
  snapshot.required_caveats.push(
    "High fluency flow is Layer 1 posture only and not full value proof."
  );

  const result = validateEvidenceSnapshot(snapshot);

  assert.equal(result.valid, false);
  assert.ok(
    result.gaps.includes("full_playbook_coverage requires Layer 2 present"),
    result.gaps.join("; ")
  );
  assert.ok(
    result.gaps.includes("full_playbook_coverage requires Layer 3 present"),
    result.gaps.join("; ")
  );
});

test("VBD cannot override suppression", () => {
  expectInvalid(
    (snapshot) => {
      snapshot.vbd_operating_map.operating_mode = "high_fluency_flow";
      snapshot.required_caveats.push(
        "High fluency flow is Layer 1 posture only and not full value proof."
      );
      snapshot.suppression.default_verdict = "SURFACE";
    },
    /suppression\.default_verdict must be SUPPRESS/
  );
});

test("VBD cannot infer person, manager, team, HRIS, or people-decisioning outcomes", () => {
  for (const signal of [
    "employee_id",
    "hashed_person_id",
    "manager_ranking",
    "team_ranking",
    "person_level_hris_record",
    "people_decisioning",
    "compensation_outcome",
    "performance_rating",
    "promotion_outcome",
    "discipline_outcome",
    "attrition_prediction"
  ]) {
    const snapshot = buildValidTelemetrySnapshot();
    snapshot.vbd_operating_map.depth.source_signals.push(signal);
    const result = validateEvidenceSnapshot(snapshot);

    assert.equal(result.valid, false, `${signal} should be rejected`);
    assert.ok(
      result.gaps.some((gap) =>
        gap.includes(`vbd_operating_map.depth.source_signals contains unsafe signal: ${signal}`)
      ),
      result.gaps.join("; ")
    );
  }
});

test("VBD cannot authorize financial permission or customer-facing financial output", () => {
  const snapshot = buildValidTelemetrySnapshot();
  snapshot.vbd_operating_map.financial_permission = {
    customer_facing_financial_output: true
  };
  snapshot.vbd_operating_map.customer_facing_financial_output = true;

  const result = validateEvidenceSnapshot(snapshot);

  assert.equal(result.valid, false);
  assert.ok(result.gaps.includes("VBD must not compute financial_permission"));
  assert.ok(
    result.gaps.includes("VBD must not authorize customer_facing_financial_output")
  );
});

test("layer_1_only requires every blocked financial and customer-facing use", () => {
  for (const blockedUse of REQUIRED_LAYER_1_ONLY_BLOCKED_USES) {
    const snapshot = buildValidTelemetrySnapshot();
    snapshot.blocked_uses = snapshot.blocked_uses.filter(
      (use) => use !== blockedUse
    );
    const result = validateEvidenceSnapshot(snapshot);

    assert.equal(result.valid, false, `${blockedUse} should be required`);
    assert.ok(
      result.gaps.includes(`blocked_uses missing ${blockedUse}`),
      `Expected ${blockedUse} gap; got: ${result.gaps.join("; ")}`
    );
  }
});

test("missing required evidence lane fails", () => {
  expectInvalid(
    (snapshot) => {
      snapshot.evidence_lanes = snapshot.evidence_lanes.filter(
        (lane) => lane.lane !== "control_evidence"
      );
    },
    /evidence_lanes missing control_evidence/
  );
});

test("missing required Playbook layer fails", () => {
  expectInvalid(
    (snapshot) => {
      delete snapshot.playbook_layers.layer_3_business_system_outcomes;
    },
    /playbook_layers\.layer_3_business_system_outcomes is missing/
  );
});

test("non-aggregate snapshot fails", () => {
  expectInvalid(
    (snapshot) => {
      snapshot.privacy_boundary.aggregate_only = false;
    },
    /privacy_boundary\.aggregate_only must be true/
  );
});

test("direct identifiers present fails", () => {
  expectInvalid(
    (snapshot) => {
      snapshot.privacy_boundary.contains_direct_identifiers = true;
    },
    /contains_direct_identifiers must be false/
  );
});

test("raw content present fails", () => {
  expectInvalid(
    (snapshot) => {
      snapshot.privacy_boundary.contains_raw_content = true;
    },
    /contains_raw_content must be false/
  );
});

test("person-level productivity present fails", () => {
  expectInvalid(
    (snapshot) => {
      snapshot.privacy_boundary.contains_person_level_productivity = true;
    },
    /contains_person_level_productivity must be false/
  );
});

test("person-level HRIS records present fails", () => {
  expectInvalid(
    (snapshot) => {
      snapshot.privacy_boundary.contains_person_level_hris_records = true;
    },
    /contains_person_level_hris_records must be false/
  );
});

test("hashed or joinable person identifiers present fails", () => {
  expectInvalid(
    (snapshot) => {
      snapshot.privacy_boundary.contains_hashed_or_joinable_person_identifiers = true;
    },
    /contains_hashed_or_joinable_person_identifiers must be false/
  );
});

test("manager/team ranking present fails", () => {
  expectInvalid(
    (snapshot) => {
      snapshot.privacy_boundary.contains_manager_or_team_ranking = true;
    },
    /contains_manager_or_team_ranking must be false/
  );
});

test("people decisioning present fails", () => {
  expectInvalid(
    (snapshot) => {
      snapshot.privacy_boundary.contains_people_decisioning = true;
    },
    /contains_people_decisioning must be false/
  );
});

test("compensation or performance inference present fails", () => {
  expectInvalid(
    (snapshot) => {
      snapshot.privacy_boundary.contains_compensation_or_performance_inference = true;
    },
    /contains_compensation_or_performance_inference must be false/
  );
});

test("promotion or discipline inference present fails", () => {
  expectInvalid(
    (snapshot) => {
      snapshot.privacy_boundary.contains_promotion_or_discipline_inference = true;
    },
    /contains_promotion_or_discipline_inference must be false/
  );
});

test("attrition prediction present fails", () => {
  expectInvalid(
    (snapshot) => {
      snapshot.privacy_boundary.contains_attrition_prediction = true;
    },
    /contains_attrition_prediction must be false/
  );
});

test("HRIS inference from AI usage present fails", () => {
  expectInvalid(
    (snapshot) => {
      snapshot.privacy_boundary.contains_hris_inference_from_ai_usage = true;
    },
    /contains_hris_inference_from_ai_usage must be false/
  );
});

test("unsafe person-level fields fail even when nested outside privacy flags", () => {
  expectInvalid(
    (snapshot) => {
      snapshot.source_refs.notes.push("Approved aggregate context only.");
      snapshot.person_level_hris_record = { employee_id: "E-1001" };
      snapshot.hashed_person_id = "abc123";
      snapshot.manager_chain = ["VP Support"];
    },
    /Forbidden field/
  );
});

test("telemetry-only snapshot without blocked financial uses fails", () => {
  expectInvalid(
    (snapshot) => {
      snapshot.blocked_uses = snapshot.blocked_uses.filter(
        (use) => use !== "realized_roi"
      );
    },
    /blocked_uses missing realized_roi/
  );
});

test("telemetry-only snapshot with realized ROI allowed fails", () => {
  expectInvalid(
    (snapshot) => {
      snapshot.allowed_uses.push("realized_roi");
    },
    /allowed_uses contains blocked use/
  );
});

test("missing Layer 2 without caveat fails", () => {
  expectInvalid(
    (snapshot) => {
      snapshot.required_caveats = snapshot.required_caveats.filter(
        (caveat) => !/user voice|survey/i.test(caveat)
      );
    },
    /Layer 2 user voice or empirical evidence is missing/
  );
});

test("missing Layer 3 without caveat fails", () => {
  expectInvalid(
    (snapshot) => {
      snapshot.required_caveats = snapshot.required_caveats.filter(
        (caveat) => !/system-of-record|business outcome/i.test(caveat)
      );
    },
    /Layer 3 business system-of-record outcome evidence is missing/
  );
});

test("held assumptions without caveat fails", () => {
  expectInvalid(
    (snapshot) => {
      snapshot.required_caveats = snapshot.required_caveats.filter(
        (caveat) => !/customer-owned assumptions|customer owned assumptions/i.test(caveat)
      );
    },
    /customer-owned assumptions are missing or unapproved/
  );
});

test("full_playbook_coverage without Layer 2 present fails", () => {
  expectInvalid(
    (snapshot) => {
      promoteToFullPlaybookCoverage(snapshot);
      snapshot.playbook_coverage.layer_2_user_voice_empirical.status = "missing";
    },
    /full_playbook_coverage requires Layer 2 present/
  );
});

test("full_playbook_coverage from BigQuery source availability alone fails", () => {
  const snapshot = makeFullPlaybookCoverageSnapshot();
  snapshot.snapshot_type = "TELEMETRY_SOURCE_AVAILABILITY";
  const result = validateEvidenceSnapshot(snapshot);

  assert.equal(result.valid, false);
  assert.ok(
    result.gaps.includes(
      "BigQuery source availability alone cannot claim full_playbook_coverage"
    ),
    result.gaps.join("; ")
  );
});

test("full_playbook_coverage without Layer 1 present or partial fails", () => {
  expectInvalid(
    (snapshot) => {
      promoteToFullPlaybookCoverage(snapshot);
      snapshot.playbook_coverage.layer_1_platform_telemetry.status = "missing";
    },
    /full_playbook_coverage requires Layer 1 present or partial/
  );
});

test("full_playbook_coverage with partial Layer 1 requires caveats", () => {
  expectInvalid(
    (snapshot) => {
      promoteToFullPlaybookCoverage(snapshot);
      snapshot.playbook_coverage.layer_1_platform_telemetry.status = "partial";
      snapshot.playbook_coverage.layer_1_platform_telemetry.caveats = [];
    },
    /full_playbook_coverage requires Layer 1 caveats/
  );
});

test("full_playbook_coverage without Layer 3 present fails", () => {
  expectInvalid(
    (snapshot) => {
      promoteToFullPlaybookCoverage(snapshot);
      snapshot.playbook_coverage.layer_3_business_system_outcomes.status = "missing";
    },
    /full_playbook_coverage requires Layer 3 present/
  );
});

test("full_playbook_coverage without governance evidence present fails", () => {
  expectInvalid(
    (snapshot) => {
      promoteToFullPlaybookCoverage(snapshot);
      snapshot.playbook_coverage.governance_evidence.status = "partial";
    },
    /full_playbook_coverage requires governance evidence present/
  );
});

test("full_playbook_coverage without assumption evidence present or explicitly not required fails", () => {
  expectInvalid(
    (snapshot) => {
      promoteToFullPlaybookCoverage(snapshot);
      snapshot.playbook_coverage.assumption_evidence.status = "held";
    },
    /full_playbook_coverage requires assumption evidence present or explicitly not required/
  );
});

test("full_playbook_coverage allows assumption evidence explicitly not required", () => {
  const snapshot = makeFullPlaybookCoverageSnapshot();
  snapshot.playbook_coverage.assumption_evidence.status = "not_computed";
  snapshot.playbook_coverage.assumption_evidence.covered_signals = [];
  snapshot.playbook_coverage.assumption_evidence.missing_signals =
    EXPECTED_COVERAGE_SIGNALS.assumption_evidence;
  snapshot.playbook_coverage.assumption_evidence.held_signals = [];
  snapshot.playbook_coverage.assumption_evidence.required_approvals = [];
  snapshot.playbook_coverage.assumption_evidence.caveats = [
    "Assumption evidence is explicitly not required for this evidence snapshot."
  ];
  snapshot.playbook_layers.assumption_evidence.evidence_state = "not_computed";
  snapshot.playbook_layers.assumption_evidence.caveats = [
    "Assumption evidence is explicitly not required for this evidence snapshot."
  ];
  snapshot.evidence_lanes = snapshot.evidence_lanes.map((lane) =>
    lane.lane === "assumptions"
      ? {
          ...lane,
          classification: "not_available",
          evidence_state: "not_computed",
          caveats: [
            "Assumption evidence is explicitly not required for this evidence snapshot."
          ]
        }
      : lane
  );
  snapshot.required_caveats = snapshot.required_caveats.map((caveat) =>
    /Customer-owned assumptions/i.test(caveat)
      ? "Assumption evidence is explicitly not required for this evidence snapshot."
      : caveat
  );

  const result = validateEvidenceSnapshot(snapshot);

  assert.equal(result.valid, true, result.gaps.join("; "));
});

test("full_playbook_coverage without k-min threshold met fails", () => {
  expectInvalid(
    (snapshot) => {
      promoteToFullPlaybookCoverage(snapshot);
      snapshot.aggregate_telemetry_summary.k_min_summary = {
        total_slices: 12,
        k_min_clear_slices: 10,
        suppressed_or_unknown_slices: 2,
        minimum_cohort_threshold: 5
      };
    },
    /full_playbook_coverage requires k-min threshold met/
  );
});

test("full_playbook_coverage with unsafe privacy flags fails", () => {
  expectInvalid(
    (snapshot) => {
      promoteToFullPlaybookCoverage(snapshot);
      snapshot.privacy_boundary.contains_direct_identifiers = true;
    },
    /contains_direct_identifiers must be false/
  );
});

test("Layer 3 snapshot type cannot feed executive readout without Layer 3 evidence", () => {
  const snapshot = buildValidTelemetrySnapshot();
  snapshot.snapshot_type = "LAYER_1_PLUS_LAYER_3";

  const result = validateEvidenceSnapshot(snapshot);

  assert.equal(result.valid, false);
  assert.equal(result.feeds.executive_readout, false);
  assert.ok(
    result.gaps.includes(
      "LAYER_1_PLUS_LAYER_3 requires Layer 3 coverage present"
    ),
    result.gaps.join("; ")
  );
  assert.ok(
    result.gaps.includes(
      "LAYER_1_PLUS_LAYER_3 requires outcome evidence source references"
    ),
    result.gaps.join("; ")
  );
});

test("snapshots require a measurement plan binding", () => {
  expectInvalid(
    (snapshot) => {
      snapshot.measurement_plan_id = null;
    },
    /measurement_plan_id is missing/
  );
});

test("source refs cannot carry raw query or table identifiers", () => {
  expectInvalid(
    (snapshot) => {
      snapshot.source_refs.query_text = "select * from raw.customer_table";
      snapshot.source_refs.raw_table_name = "prod.customer_raw_events";
    },
    /Forbidden field\(s\).*query_text.*raw_table_name/
  );
});

test("governance evidence missing holds for governance approval", () => {
  expectInvalid(
    (snapshot) => {
      seedCoverageForMutation(snapshot);
      snapshot.playbook_coverage.governance_evidence.status = "held";
      snapshot.snapshot_readiness_decision = "READY_FOR_CAVEATED_EVIDENCE_SNAPSHOT";
    },
    /snapshot_readiness_decision must be HOLD_FOR_GOVERNANCE_APPROVAL/
  );
});

test("aggregate workforce context with approved aggregate-safe flags is valid", () => {
  const snapshot = buildValidTelemetrySnapshot({
    aggregateWorkforceContext: {
      context_state: "provided_aggregate_safe",
      source_type: "aggregate_hris_derived_context",
      allowed_context_types: [
        "aggregate_role_family_context",
        "aggregate_new_hire_cohort_context"
      ],
      source_owner_approval_state: "approved",
      minimum_cohort_threshold: 5,
      cohort_threshold_met: true,
      caveats: [
        "Aggregate HRIS-derived workforce context is customer-approved, cohort-safe, and non-decisioning."
      ]
    }
  });

  const result = validateEvidenceSnapshot(snapshot);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(
    snapshot.aggregate_workforce_context.context_state,
    "provided_aggregate_safe"
  );
  assert.equal(snapshot.playbook_coverage.coverage_status, "layer_1_only");
  assert.equal(snapshot.privacy_boundary.aggregate_workforce_context_allowed, true);
});

test("aggregate workforce context alone cannot upgrade to full_playbook_coverage", () => {
  const snapshot = buildValidTelemetrySnapshot({
    aggregateWorkforceContext: {
      context_state: "provided_aggregate_safe",
      source_type: "aggregate_hris_derived_context",
      allowed_context_types: ["aggregate_role_family_context"],
      source_owner_approval_state: "approved",
      minimum_cohort_threshold: 5,
      cohort_threshold_met: true,
      caveats: [
        "Aggregate HRIS-derived workforce context is customer-approved, cohort-safe, and non-decisioning."
      ]
    }
  });
  snapshot.playbook_coverage.coverage_status = "full_playbook_coverage";

  const result = validateEvidenceSnapshot(snapshot);

  assert.equal(result.valid, false);
  assert.ok(
    result.gaps.includes("full_playbook_coverage requires Layer 2 present"),
    result.gaps.join("; ")
  );
  assert.ok(
    result.gaps.includes("full_playbook_coverage requires Layer 3 present"),
    result.gaps.join("; ")
  );
});

test("aggregate workforce context cannot be provided when privacy flags are unsafe", () => {
  expectInvalid(
    (snapshot) => {
      snapshot.aggregate_workforce_context = {
        context_state: "provided_aggregate_safe",
        source_type: "aggregate_hris_derived_context",
        allowed_context_types: ["aggregate_role_family_context"],
        source_owner_approval_state: "approved",
        minimum_cohort_threshold: 5,
        cohort_threshold_met: true,
        caveats: ["Aggregate workforce context approved but privacy is unsafe."]
      };
      snapshot.privacy_boundary.aggregate_workforce_context_allowed = true;
      snapshot.privacy_boundary.contains_people_decisioning = true;
    },
    /contains_people_decisioning must be false/
  );
});

test("aggregate HRIS-derived context is not rejected merely because it includes the term HRIS", () => {
  const snapshot = buildValidTelemetrySnapshot({
    aggregateWorkforceContext: {
      context_state: "provided_aggregate_safe",
      source_type: "aggregate_hris_derived_context",
      allowed_context_types: ["aggregate_role_family_context"],
      source_owner_approval_state: "approved",
      minimum_cohort_threshold: 5,
      cohort_threshold_met: true,
      caveats: [
        "Aggregate HRIS-derived context is approved as workforce context only."
      ]
    }
  });

  const result = validateEvidenceSnapshot(snapshot);

  assert.equal(result.valid, true, result.gaps.join("; "));
});

test("aggregate workforce context without source approval fails", () => {
  expectInvalid(
    (snapshot) => {
      snapshot.aggregate_workforce_context = {
        context_state: "provided_aggregate_safe",
        source_type: "aggregate_hris_derived_context",
        allowed_context_types: ["aggregate_role_family_context"],
        source_owner_approval_state: "submitted",
        minimum_cohort_threshold: 5,
        cohort_threshold_met: true,
        caveats: ["Aggregate workforce context submitted for review."]
      };
      snapshot.privacy_boundary.aggregate_workforce_context_allowed = true;
    },
    /source_owner_approval_state must be approved/
  );
});

test("aggregate workforce context without cohort threshold met fails", () => {
  expectInvalid(
    (snapshot) => {
      snapshot.aggregate_workforce_context = {
        context_state: "provided_aggregate_safe",
        source_type: "aggregate_hris_derived_context",
        allowed_context_types: ["aggregate_role_family_context"],
        source_owner_approval_state: "approved",
        minimum_cohort_threshold: 5,
        cohort_threshold_met: false,
        caveats: ["Aggregate workforce context approved but cohort threshold did not clear."]
      };
      snapshot.privacy_boundary.aggregate_workforce_context_allowed = true;
    },
    /cohort_threshold_met must be true/
  );
});

test("sponsor, source owner, and metric owner role labels with manager-like language are allowed", () => {
  const snapshot = buildValidTelemetrySnapshot({
    sourceRefs: {
      notes: [
        "Source owner role: workforce analytics manager.",
        "Metric owner role: customer value manager.",
        "Sponsor role: support operations manager."
      ]
    },
    aggregateWorkforceContext: {
      context_state: "provided_aggregate_safe",
      source_type: "aggregate_hris_derived_context",
      allowed_context_types: ["aggregate_role_family_context"],
      source_owner_approval_state: "approved",
      minimum_cohort_threshold: 5,
      cohort_threshold_met: true,
      caveats: [
        "Aggregate workforce context approved by the workforce analytics manager role."
      ]
    }
  });

  const result = validateEvidenceSnapshot(snapshot);

  assert.equal(result.valid, true, result.gaps.join("; "));
});

test("agent lifecycle may not support financial agent value without Layer 3", () => {
  expectInvalid(
    (snapshot) => {
      snapshot.allowed_uses.push("agent_financial_value_claim");
    },
    /agent lifecycle cannot support financial agent value without Layer 3/
  );
});

test("artifact output may not support business value without Layer 3 or accepted outcome evidence", () => {
  expectInvalid(
    (snapshot) => {
      snapshot.allowed_uses.push("artifact_business_value_claim");
    },
    /artifact output cannot support business value/
  );
});

test("builder creates valid telemetry-only caveated snapshot", () => {
  const snapshot = buildTelemetryEvidenceSnapshotDraft({
    orgId: "org_builder",
    workflowFamily: "sales_pipeline_hygiene",
    measurementPlanId: "measurement_plan_builder",
    windowStart: "2026-05-01",
    windowEnd: "2026-05-31",
    generatedAt: "2026-06-13T00:00:00.000Z",
    evidenceSnapshotId: "evidence_snapshot_builder"
  });
  const result = validateEvidenceSnapshot(snapshot);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(snapshot.measurement_plan_id, "measurement_plan_builder");
  assert.equal(snapshot.snapshot_type, "TELEMETRY_ONLY_CAVEATED");
  assert.equal(snapshot.playbook_coverage.coverage_status, "layer_1_only");
  assert.deepEqual(
    snapshot.playbook_coverage.layer_2_user_voice_empirical.required_source_exports,
    [
      "aggregate_ai_fluency_baseline",
      "aggregate_ai_fluency_retest",
      "aggregate_user_voice_or_workflow_observation"
    ]
  );
  assert.deepEqual(
    snapshot.playbook_coverage.layer_3_business_system_outcomes.required_source_exports,
    [
      "customer_attested_kpi_baseline",
      "customer_attested_kpi_comparison",
      "system_of_record_outcome_export"
    ]
  );
  assert.deepEqual(
    snapshot.playbook_coverage.assumption_evidence.required_approvals,
    [
      "customer_owned_assumptions",
      "finance_or_business_owner_approval",
      "aggregate_workforce_context_approval_if_used"
    ]
  );
  assert.equal(
    snapshot.snapshot_readiness_decision,
    "READY_FOR_CAVEATED_EVIDENCE_SNAPSHOT"
  );
  assert.equal(
    snapshot.vbd_operating_map.contributes_to_playbook_layer,
    "layer_1_platform_telemetry"
  );
  assert.equal(snapshot.vbd_operating_map.depth.requires_layer_3_for_value_claim, true);
  assert.deepEqual(
    snapshot.vbd_operating_map.blocked_interpretation,
    REQUIRED_LAYER_1_ONLY_BLOCKED_USES
  );
  assert.ok(
    snapshot.required_caveats.some((caveat) =>
      /telemetry-only/i.test(caveat)
    )
  );
});
