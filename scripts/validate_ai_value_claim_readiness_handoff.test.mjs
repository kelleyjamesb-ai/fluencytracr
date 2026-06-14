import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  AI_VALUE_CLAIM_READINESS_HANDOFF_SCHEMA_VERSION,
  ClaimReadinessHandoffSchema,
  buildClaimReadinessHandoffFromEvidenceSnapshot,
  buildTelemetryEvidenceSnapshotDraft,
  translateSnapshotBlockedUsesToBlockedClaims,
  validateClaimReadinessHandoff,
  validateEvidenceSnapshot
} from "../shared/dist/aiValueEngine/index.js";

const EXAMPLES = "docs/contracts/ai-value-claim-readiness-handoff/examples";

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

function buildSnapshot(overrides = {}) {
  return buildTelemetryEvidenceSnapshotDraft({
    orgId: "org_example",
    workflowFamily: "customer_support_case_resolution",
    workflowName: "Support case resolution",
    functionArea: "customer_support",
    windowStart: "2026-05-01",
    windowEnd: "2026-05-31",
    generatedAt: "2026-06-13T00:00:00.000Z",
    evidenceSnapshotId: "evidence_snapshot_customer_support_handoff",
    measurementPlanId: "measurement_plan_customer_support_handoff",
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

function buildFullSnapshot() {
  const snapshot = promoteSnapshotToFullPlaybook(buildSnapshot());
  const validation = validateEvidenceSnapshot(snapshot);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  return snapshot;
}

function buildHandoff(snapshot = buildSnapshot()) {
  const handoff = buildClaimReadinessHandoffFromEvidenceSnapshot(snapshot, {
    handoffId: "claim_readiness_handoff_customer_support_test",
    createdAt: "2026-06-13T00:00:00.000Z"
  });
  const result = validateClaimReadinessHandoff(handoff);
  assert.equal(result.valid, true, result.gaps.join("; "));
  return handoff;
}

function expectInvalid(handoff, expectedGapPattern) {
  const result = validateClaimReadinessHandoff(handoff);
  assert.equal(result.valid, false, "Expected handoff to fail");
  assert.ok(
    result.gaps.some((gap) => expectedGapPattern.test(gap)),
    `Expected gap matching ${expectedGapPattern}; got: ${result.gaps.join("; ")}`
  );
}

function assertIncludesAll(actual, expected) {
  for (const value of expected) {
    assert.ok(actual.includes(value), `Expected caveat to be preserved: ${value}`);
  }
}

test("buildClaimReadinessHandoffFromEvidenceSnapshot copies required snapshot fields", () => {
  const snapshot = buildSnapshot();
  const handoff = buildHandoff(snapshot);

  assert.equal(handoff.schema_version, AI_VALUE_CLAIM_READINESS_HANDOFF_SCHEMA_VERSION);
  assert.equal(handoff.evidence_snapshot_id, snapshot.evidence_snapshot_id);
  assert.equal(handoff.org_id, snapshot.org_id);
  assert.equal(handoff.measurement_plan_id, snapshot.measurement_plan_id);
  assert.deepEqual(handoff.workflow, snapshot.workflow);
  assert.deepEqual(handoff.window, snapshot.window);
  assert.deepEqual(handoff.playbook_coverage, snapshot.playbook_coverage);
  assert.deepEqual(handoff.source_refs, snapshot.source_refs);
  assertIncludesAll(handoff.required_caveats, snapshot.required_caveats);
  assert.deepEqual(handoff.blocked_uses, snapshot.blocked_uses);
  assert.deepEqual(handoff.suppression, snapshot.suppression);
  assert.deepEqual(handoff.privacy_boundary, snapshot.privacy_boundary);
  assert.deepEqual(handoff.aggregate_workforce_context, snapshot.aggregate_workforce_context);
  assert.deepEqual(handoff.vbd_operating_map, snapshot.vbd_operating_map);
});

test("Claim Readiness Handoff schema metadata lists all validator-required fields", () => {
  assert.ok(
    ClaimReadinessHandoffSchema.required_fields.includes("unmapped_blocked_uses")
  );
  assert.ok(
    ClaimReadinessHandoffSchema.required_fields.includes("persistence_policy")
  );
});

test("missing Evidence Snapshot input fails", () => {
  assert.throws(
    () => buildClaimReadinessHandoffFromEvidenceSnapshot(null),
    /Evidence Snapshot is invalid/
  );
});

test("invalid Evidence Snapshot input fails", () => {
  const snapshot = buildSnapshot();
  snapshot.privacy_boundary.contains_raw_content = true;

  assert.throws(
    () => buildClaimReadinessHandoffFromEvidenceSnapshot(snapshot),
    /Evidence Snapshot is invalid/
  );
});

test("blocked_uses translate deterministically to blocked_claims", () => {
  const translated = translateSnapshotBlockedUsesToBlockedClaims(REQUIRED_LAYER_1_ONLY_BLOCKED_USES);

  assert.deepEqual(new Set(translated.blocked_claims), new Set([
    "roi_proof",
    "ebita_claim",
    "causality_claim",
    "productivity_claim",
    "headcount_reduction_claim",
    "individual_scoring",
    "team_or_manager_ranking",
    "people_decisioning",
    "customer_facing_economic_output"
  ]));
  assert.deepEqual(translated.unmapped_blocked_uses, []);
});

test("unknown blocked uses are preserved and caveated", () => {
  const snapshot = buildSnapshot();
  snapshot.blocked_uses.push("unknown_sensitive_claim");
  const handoff = buildHandoff(snapshot);

  assert.ok(handoff.unmapped_blocked_uses.includes("unknown_sensitive_claim"));
  assert.ok(
    handoff.required_caveats.some((caveat) => /unknown_sensitive_claim/.test(caveat))
  );
});

test("Layer 1 only snapshot produces all financial flags false", () => {
  const handoff = buildHandoff();
  const validation = validateClaimReadinessHandoff(handoff);

  assert.deepEqual(handoff.financial_boundary, {
    financial_claim_governance_state: "blocked_for_privacy_or_suppression",
    financial_translation_allowed: false,
    roi_claim_allowed: false,
    ebita_claim_allowed: false,
    customer_facing_financial_output_allowed: false,
    reasons: handoff.financial_boundary.reasons
  });
  assert.ok(handoff.financial_boundary.reasons.length > 0);
  assert.equal(validation.feeds.roi_scenario_context, false);
  assert.equal(validation.feeds.ebita_bridge_context, false);
});

test("blocked handoff cannot claim future customer-facing financial governance state", () => {
  const handoff = buildHandoff();
  handoff.financial_boundary.financial_claim_governance_state =
    "customer_facing_financial_claim_allowed";

  expectInvalid(handoff, /financial_claim_governance_state must remain blocked or held/);
});

test("Layer 1 only snapshot blocks customer-facing financial output", () => {
  const handoff = buildHandoff();

  assert.equal(
    handoff.financial_boundary.customer_facing_financial_output_allowed,
    false
  );
  assert.ok(
    handoff.executive_readout_boundary.blocked_sections.includes(
      "customer_facing_financial_output"
    )
  );
});

test("missing Layer 3 blocks ROI and EBITA", () => {
  const handoff = buildHandoff();

  assert.equal(handoff.playbook_coverage.layer_3_business_system_outcomes.status, "missing");
  assert.equal(handoff.financial_boundary.roi_claim_allowed, false);
  assert.equal(handoff.financial_boundary.ebita_claim_allowed, false);
});

test("missing or held assumption evidence blocks financial translation", () => {
  const handoff = buildHandoff();

  assert.equal(handoff.playbook_coverage.assumption_evidence.status, "held");
  assert.equal(handoff.financial_boundary.financial_translation_allowed, false);
});

test("unsafe privacy flag blocks financial and executive readout boundaries", () => {
  const handoff = buildHandoff();
  handoff.privacy_boundary.contains_people_decisioning = true;
  handoff.executive_readout_boundary.executive_readout_allowed = true;

  expectInvalid(handoff, /executive_readout_boundary must fail closed when privacy is unsafe/);
});

test("suppression active blocks financial and customer-facing readout boundaries", () => {
  for (const mutateSuppression of [
    (suppression) => {
      suppression.reason_codes = ["HIGH_AMBIGUITY"];
    },
    (suppression) => {
      suppression.suppressed_lanes = ["layer_3_business_system_outcomes"];
    },
    (suppression) => {
      suppression.hidden_values_exposed = true;
    },
    (suppression) => {
      suppression.default_verdict = "SURFACE";
    }
  ]) {
    const handoff = buildHandoff(buildFullSnapshot());
    mutateSuppression(handoff.suppression);
    handoff.financial_boundary.financial_translation_allowed = true;
    handoff.executive_readout_boundary.customer_facing_readout_allowed = true;

    expectInvalid(
      handoff,
      /financial_boundary\.financial_translation_allowed must be false|customer_facing_readout_allowed must be false when suppression/
    );
  }
});

test("VBD high_fluency_flow with layer_1_only carries required Layer 1 only caveat", () => {
  const snapshot = buildSnapshot();
  snapshot.vbd_operating_map.operating_mode = "high_fluency_flow";
  snapshot.required_caveats.push(
    "High fluency flow is Layer 1 posture only and not full value proof."
  );
  const handoff = buildHandoff(snapshot);

  assert.ok(
    handoff.required_caveats.some((caveat) => /High fluency flow is Layer 1 posture only/i.test(caveat))
  );
});

test("VBD cannot authorize blocked downstream claims", () => {
  for (const blocked of [
    "roi_proof",
    "ebita_claim",
    "causality_claim",
    "productivity_claim",
    "headcount_reduction_claim",
    "people_decisioning",
    "team_or_manager_ranking",
    "individual_scoring",
    "customer_facing_economic_output"
  ]) {
    const handoff = buildHandoff();
    handoff.blocked_uses = handoff.blocked_uses.filter((use) => {
      const normalized = use.replace(/[\s-]+/g, "_").toLowerCase();
      if (blocked === "roi_proof") {
        return !["realized_roi", "realized_roi_calculation", "roi_proof"].includes(normalized);
      }
      if (blocked === "team_or_manager_ranking") {
        return !["manager_or_team_ranking", "manager_ranking", "team_ranking"].includes(normalized);
      }
      if (blocked === "individual_scoring") {
        return ![
          "individual_attribution",
          "hashed_or_joinable_person_identifiers"
        ].includes(normalized);
      }
      if (blocked === "customer_facing_economic_output") {
        return ![
          "customer_facing_financial_output",
          "customer_facing_economic_output",
          "dollarized_output",
          "financial_value_claim",
          "usage_derived_financial_claim"
        ].includes(normalized);
      }
      return normalized !== blocked;
    });
    handoff.blocked_claims = handoff.blocked_claims.filter((claim) => claim !== blocked);

    expectInvalid(
      handoff,
      new RegExp(`VBD boundary requires blocked claim/use ${blocked}`)
    );
  }
});

test("aggregate workforce context cannot authorize blocked downstream uses", () => {
  const handoff = buildHandoff();
  handoff.blocked_uses = handoff.blocked_uses.filter((use) => use !== "people_decisioning");
  handoff.blocked_claims = handoff.blocked_claims.filter((claim) => claim !== "people_decisioning");

  expectInvalid(handoff, /aggregate workforce context boundary requires blocked claim\/use people_decisioning/);
});

test("required caveats from Evidence Snapshot and nested sources are preserved", () => {
  const snapshot = buildSnapshot();
  const handoff = buildHandoff(snapshot);

  assertIncludesAll(handoff.required_caveats, snapshot.required_caveats);
  assert.ok(
    handoff.required_caveats.some((caveat) =>
      /Velocity is Layer 1 platform telemetry/.test(caveat)
    )
  );
  assert.ok(
    handoff.required_caveats.some((caveat) =>
      /Baseline and comparison windows are not first-class fields/.test(caveat)
    )
  );
  assertIncludesAll(
    handoff.executive_readout_boundary.required_caveats,
    handoff.required_caveats
  );
});

test("Executive readout boundary cannot omit required caveats", () => {
  const handoff = buildHandoff();
  handoff.executive_readout_boundary.required_caveats =
    handoff.executive_readout_boundary.required_caveats.slice(1);

  expectInvalid(
    handoff,
    /executive_readout_boundary\.required_caveats must include every required caveat/
  );
});

test("Executive readout boundary cannot omit nested evidence caveats", () => {
  const handoff = buildHandoff();
  handoff.executive_readout_boundary.required_caveats =
    handoff.executive_readout_boundary.required_caveats.filter(
      (caveat) => !/Velocity is Layer 1 platform telemetry/.test(caveat)
    );

  expectInvalid(
    handoff,
    /executive_readout_boundary\.required_caveats must include every required caveat/
  );
});

test("customer-facing readout is false for held, suppressed, not-ready, or governance-failed snapshots", () => {
  for (const decision of [
    "HOLD_FOR_CUSTOMER_EXPORTS",
    "SUPPRESSED",
    "NOT_READY",
    "HOLD_FOR_GOVERNANCE_APPROVAL"
  ]) {
    const handoff = buildHandoff();
    handoff.snapshot_readiness_decision = decision;
    handoff.executive_readout_boundary.customer_facing_readout_allowed = true;

    expectInvalid(
      handoff,
      /customer_facing_readout_allowed must be false/
    );
  }
});

test("Full Playbook handoff fails if Layer 2 is missing", () => {
  const handoff = buildHandoff(buildFullSnapshot());
  handoff.playbook_coverage.layer_2_user_voice_empirical.status = "missing";

  expectInvalid(handoff, /full_playbook_coverage requires Layer 2 present/);
});

test("Full Playbook handoff fails if Layer 1 is missing", () => {
  const handoff = buildHandoff(buildFullSnapshot());
  handoff.playbook_coverage.layer_1_platform_telemetry.status = "missing";

  expectInvalid(handoff, /full_playbook_coverage requires Layer 1 present or partial/);
});

test("Full Playbook handoff fails if Layer 3 is missing", () => {
  const handoff = buildHandoff(buildFullSnapshot());
  handoff.playbook_coverage.layer_3_business_system_outcomes.status = "missing";

  expectInvalid(handoff, /full_playbook_coverage requires Layer 3 present/);
});

test("Full Playbook handoff fails if governance evidence is missing", () => {
  const handoff = buildHandoff(buildFullSnapshot());
  handoff.playbook_coverage.governance_evidence.status = "missing";

  expectInvalid(handoff, /full_playbook_coverage requires governance evidence present/);
});

test("Full Playbook handoff fails if assumptions are missing and not explicitly not-required", () => {
  const handoff = buildHandoff(buildFullSnapshot());
  handoff.playbook_coverage.assumption_evidence.status = "missing";

  expectInvalid(
    handoff,
    /full_playbook_coverage requires assumption evidence present or explicitly not required/
  );
});

test("Full Playbook handoff fails if k-min is not met", () => {
  const handoff = buildHandoff(buildFullSnapshot());
  handoff.source_provenance.k_min_summary.suppressed_or_unknown_slices = 1;

  expectInvalid(handoff, /full_playbook_coverage requires k-min threshold met/);
});

test("Full Playbook handoff fails if privacy is unsafe", () => {
  const handoff = buildHandoff(buildFullSnapshot());
  handoff.privacy_boundary.contains_manager_or_team_ranking = true;

  expectInvalid(handoff, /full_playbook_coverage requires safe privacy posture/);
});

test("Full Playbook handoff can reach governed ROI scenario review while customer-facing financial output stays blocked", () => {
  const handoff = buildHandoff(buildFullSnapshot());
  const validation = validateClaimReadinessHandoff(handoff);

  assert.equal(handoff.financial_boundary.financial_claim_governance_state, "financial_translation_ready");
  assert.equal(handoff.financial_boundary.financial_translation_allowed, true);
  assert.equal(handoff.financial_boundary.roi_claim_allowed, true);
  assert.equal(handoff.financial_boundary.ebita_claim_allowed, false);
  assert.equal(handoff.financial_boundary.customer_facing_financial_output_allowed, false);
  assert.ok(!handoff.blocked_claims.includes("roi_proof"));
  assert.ok(handoff.blocked_claims.includes("customer_facing_economic_output"));
  assert.equal(validation.feeds.roi_scenario_context, true);
  assert.equal(validation.feeds.ebita_bridge_context, false);
});

test("historical assumption approval caveats do not block approved full Playbook financial translation", () => {
  const handoff = buildHandoff(buildFullSnapshot());
  const historicalCaveat =
    "Customer-owned assumptions are held until the customer or business owner approves them.";
  handoff.required_caveats.push(historicalCaveat);
  handoff.executive_readout_boundary.required_caveats.push(historicalCaveat);
  const validation = validateClaimReadinessHandoff(handoff);

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(handoff.financial_boundary.financial_claim_governance_state, "financial_translation_ready");
  assert.equal(validation.feeds.roi_scenario_context, true);
});

test("direct finance approval caveats block governed ROI scenario review", () => {
  const snapshot = buildFullSnapshot();
  snapshot.required_caveats.push(
    "Finance or business-owner approval is missing, held, or caveated."
  );
  const handoff = buildHandoff(snapshot);
  const validation = validateClaimReadinessHandoff(handoff);

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.notEqual(
    handoff.financial_boundary.financial_claim_governance_state,
    "financial_translation_ready"
  );
  assert.equal(handoff.financial_boundary.financial_translation_allowed, false);
  assert.equal(validation.feeds.roi_scenario_context, false);
});

test("Financial boundary cannot ignore blocked_claims", () => {
  const handoff = buildHandoff(buildFullSnapshot());
  handoff.blocked_uses = handoff.blocked_uses.filter((use) =>
    ![
      "realized_roi",
      "realized_roi_calculation",
      "ebita_claim",
      "customer_facing_financial_output",
      "customer_facing_economic_output",
      "dollarized_output",
      "financial_value_claim",
      "usage_derived_financial_claim"
    ].includes(use)
  );
  handoff.financial_boundary.financial_translation_allowed = true;
  handoff.financial_boundary.roi_claim_allowed = true;
  handoff.financial_boundary.ebita_claim_allowed = true;
  handoff.financial_boundary.customer_facing_financial_output_allowed = true;

  expectInvalid(handoff, /financial_boundary\.financial_translation_allowed must be false/);
});

test("Handoff rejects forbidden raw or person-level fields", () => {
  for (const [field, value] of [
    ["raw_prompt", "do not store"],
    ["raw_response", "do not store"],
    ["transcript", "do not store"],
    ["query_text", "do not store"],
    ["file_content", "do not store"],
    ["user_id", "U-123"],
    ["hashed_person_id", "abc"],
    ["person_level_hris_record", {}],
    ["person_level_productivity", 1],
    ["manager_ranking", 1],
    ["compensation_inference", true],
    ["promotion_inference", true],
    ["discipline_inference", true],
    ["attrition_prediction", true],
    ["hris_inference", true]
  ]) {
    const handoff = buildHandoff();
    handoff[field] = value;
    expectInvalid(handoff, /Forbidden field/);
  }
});

test("Handoff rejects camelCase identifiers, ranking, and misplaced privacy flags", () => {
  for (const mutate of [
    (handoff) => {
      handoff.source_provenance.source_refs.userId = "U-123";
    },
    (handoff) => {
      handoff.extra = { hashedPersonId: "hash-123" };
    },
    (handoff) => {
      handoff.extra = { managerRanking: 1 };
    },
    (handoff) => {
      handoff.extra = { personIdentifier: "person-123" };
    },
    (handoff) => {
      handoff.extra = { containsDirectIdentifiers: false };
    }
  ]) {
    const handoff = buildHandoff();
    mutate(handoff);
    expectInvalid(handoff, /Forbidden field/);
  }
});

test("Handoff examples validate", () => {
  for (const file of [
    "layer-1-only-handoff.json",
    "full-playbook-handoff.json"
  ]) {
    const handoff = readJson(`${EXAMPLES}/${file}`);
    const result = validateClaimReadinessHandoff(handoff);

    assert.equal(result.valid, true, `${file}: ${result.gaps.join("; ")}`);
  }
});

test("Handoff does not compute ROI, EBITA, dollar value, time saved value, or financial impact", () => {
  for (const field of [
    "roi_value",
    "ebita_impact",
    "dollarized_value",
    "time_saved_value",
    "productivity_lift",
    "financial_impact"
  ]) {
    const handoff = buildHandoff();
    handoff[field] = 1;
    expectInvalid(handoff, /Forbidden field/);
  }
});

test("Handoff object is non-persisted and creates no migrations, routes, UI, or ingestion", () => {
  const handoff = buildHandoff();

  assert.deepEqual(handoff.persistence_policy, {
    persisted: false,
    creates_migrations: false,
    creates_prisma_schema: false,
    creates_backend_routes: false,
    creates_frontend_ui: false,
    creates_ingestion_jobs: false
  });
});
