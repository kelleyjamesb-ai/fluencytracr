import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildClaimReadinessHandoffFromEvidenceSnapshot,
  buildClaimReadinessSnapshotFromEvidenceSnapshotAndHandoff,
  buildTelemetryEvidenceSnapshotDraft,
  validateClaimReadinessHandoff,
  validateClaimReadinessSnapshot,
  validateEvidenceSnapshot
} from "../shared/dist/aiValueEngine/index.js";

const EXAMPLES = "docs/contracts/ai-value-claim-readiness-snapshot/examples";

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

function buildSnapshot() {
  return buildTelemetryEvidenceSnapshotDraft({
    orgId: "org_example",
    workflowFamily: "customer_support_case_resolution",
    workflowName: "Support case resolution",
    functionArea: "customer_support",
    windowStart: "2026-05-01",
    windowEnd: "2026-05-31",
    generatedAt: "2026-06-13T00:00:00.000Z",
    evidenceSnapshotId: "evidence_snapshot_claim_snapshot_test",
    measurementPlanId: "measurement_plan_claim_snapshot_test",
    aggregateTelemetrySummary: {
      probe_window_start: "2026-05-01",
      probe_window_end: "2026-05-31",
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
      bigquery_probe_result_id: "bq_probe_claim_snapshot_test",
      source_readiness_ids: ["source_readiness_claim_snapshot_test"],
      notes: ["Read-only aggregate probe summary; no raw rows retained."]
    }
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
  snapshot.source_refs.outcome_evidence_ids = ["outcome_evidence_claim_snapshot_test"];
  snapshot.suppression.held_lanes = [];
  snapshot.suppression.missing_lanes = [];
  snapshot.suppression.suppressed_lanes = [];
  snapshot.suppression.reason_codes = [];
  snapshot.required_caveats = [
    "Full Playbook coverage is validated only for this aggregate workflow window and must retain privacy, suppression, and claim-boundary controls."
  ];
  return snapshot;
}

function buildHandoff(snapshot) {
  const handoff = buildClaimReadinessHandoffFromEvidenceSnapshot(snapshot, {
    handoffId: "claim_readiness_handoff_snapshot_test",
    createdAt: "2026-06-13T00:00:00.000Z"
  });
  const validation = validateClaimReadinessHandoff(handoff);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  return handoff;
}

function buildSnapshotObject(snapshot = buildSnapshot(), handoff = buildHandoff(snapshot)) {
  const claimSnapshot = buildClaimReadinessSnapshotFromEvidenceSnapshotAndHandoff(
    snapshot,
    handoff,
    {
      claimReadinessSnapshotId: "claim_readiness_snapshot_test",
      createdAt: "2026-06-13T00:00:00.000Z"
    }
  );
  const validation = validateClaimReadinessSnapshot(claimSnapshot);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  return claimSnapshot;
}

test("Claim Readiness Snapshot is derived from a validated Evidence Snapshot and Handoff", () => {
  const snapshot = buildSnapshot();
  const handoff = buildHandoff(snapshot);
  const claimSnapshot = buildSnapshotObject(snapshot, handoff);

  assert.equal(claimSnapshot.evidence_snapshot_id, snapshot.evidence_snapshot_id);
  assert.equal(claimSnapshot.handoff_id, handoff.handoff_id);
  assert.deepEqual(claimSnapshot.playbook_coverage, snapshot.playbook_coverage);
  assert.deepEqual(claimSnapshot.required_caveats, handoff.required_caveats);
  assert.deepEqual(claimSnapshot.blocked_claims, handoff.blocked_claims);
  assert.equal(claimSnapshot.persistence_policy.persisted, false);
});

test("telemetry-only snapshots remain held and block financial/customer-facing claim modes", () => {
  const claimSnapshot = buildSnapshotObject();

  assert.equal(claimSnapshot.claim_readiness_state, "held_for_full_playbook_coverage");
  assert.ok(claimSnapshot.allowed_claim_modes.includes("internal_evidence_review"));
  assert.ok(!claimSnapshot.allowed_claim_modes.includes("customer_facing_financial_output"));
  assert.ok(claimSnapshot.blocked_claims.includes("roi_proof"));
  assert.ok(claimSnapshot.blocked_claims.includes("customer_facing_economic_output"));
  assert.equal(claimSnapshot.financial_boundary.customer_facing_financial_output_allowed, false);
});

test("full Playbook snapshots can become internal claim-review ready without financial output", () => {
  const snapshot = promoteSnapshotToFullPlaybook(buildSnapshot());
  const snapshotValidation = validateEvidenceSnapshot(snapshot);
  assert.equal(snapshotValidation.valid, true, snapshotValidation.gaps.join("; "));
  const claimSnapshot = buildSnapshotObject(snapshot, buildHandoff(snapshot));

  assert.equal(claimSnapshot.claim_readiness_state, "ready_for_internal_claim_review");
  assert.ok(claimSnapshot.allowed_claim_modes.includes("source_bound_business_outcome_claim_planning"));
  assert.ok(claimSnapshot.allowed_claim_modes.includes("governed_roi_scenario_review"));
  assert.equal(claimSnapshot.financial_boundary.financial_claim_governance_state, "financial_translation_ready");
  assert.equal(claimSnapshot.financial_boundary.financial_translation_allowed, true);
  assert.equal(claimSnapshot.financial_boundary.roi_claim_allowed, true);
  assert.equal(claimSnapshot.financial_boundary.customer_facing_financial_output_allowed, false);
  assert.ok(claimSnapshot.blocked_claims.includes("customer_facing_economic_output"));
  assert.ok(!claimSnapshot.blocked_claims.includes("roi_proof"));
});

test("governed ROI scenario review fails if ROI blockers remain present", () => {
  const snapshot = promoteSnapshotToFullPlaybook(buildSnapshot());
  const claimSnapshot = buildSnapshotObject(snapshot, buildHandoff(snapshot));

  claimSnapshot.blocked_claims.push("roi_proof");
  claimSnapshot.blocked_uses.push("realized_roi");

  const validation = validateClaimReadinessSnapshot(claimSnapshot);
  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /ROI blockers must be removed/i.test(gap)),
    validation.gaps.join("; ")
  );
});

test("claim snapshot financial governance state cannot jump to future customer-facing state", () => {
  const claimSnapshot = buildSnapshotObject();
  claimSnapshot.financial_boundary.financial_claim_governance_state =
    "customer_facing_financial_claim_allowed";

  const validation = validateClaimReadinessSnapshot(claimSnapshot);
  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => /financial_claim_governance_state/i.test(gap)),
    validation.gaps.join("; ")
  );
});

test("finance approval caveats keep full Playbook snapshots out of governed ROI scenario review", () => {
  const snapshot = promoteSnapshotToFullPlaybook(buildSnapshot());
  snapshot.required_caveats.push(
    "Finance or business-owner approval is missing, held, or caveated."
  );
  const snapshotValidation = validateEvidenceSnapshot(snapshot);
  assert.equal(snapshotValidation.valid, true, snapshotValidation.gaps.join("; "));

  const claimSnapshot = buildSnapshotObject(snapshot, buildHandoff(snapshot));

  assert.equal(claimSnapshot.claim_readiness_state, "ready_for_internal_claim_review");
  assert.ok(!claimSnapshot.allowed_claim_modes.includes("governed_roi_scenario_review"));
  assert.notEqual(
    claimSnapshot.financial_boundary.financial_claim_governance_state,
    "financial_translation_ready"
  );
  assert.equal(claimSnapshot.financial_boundary.financial_translation_allowed, false);
  assert.equal(claimSnapshot.financial_boundary.roi_claim_allowed, false);
  assert.equal(claimSnapshot.financial_boundary.customer_facing_financial_output_allowed, false);
});

test("active suppression blocks internal claim-review readiness", () => {
  const snapshot = promoteSnapshotToFullPlaybook(buildSnapshot());
  snapshot.suppression.reason_codes = ["HIGH_AMBIGUITY"];
  const claimSnapshot = buildSnapshotObject(snapshot, buildHandoff(snapshot));

  assert.equal(claimSnapshot.claim_readiness_state, "blocked_for_privacy_or_suppression");
  assert.deepEqual(claimSnapshot.allowed_claim_modes, []);
  assert.equal(validateClaimReadinessSnapshot(claimSnapshot).feeds.claim_review_context, false);
});

test("mismatched Evidence Snapshot and Handoff fail validation", () => {
  const snapshot = buildSnapshot();
  const handoff = buildHandoff(snapshot);
  handoff.evidence_snapshot_id = "different_snapshot";

  assert.throws(
    () => buildClaimReadinessSnapshotFromEvidenceSnapshotAndHandoff(snapshot, handoff),
    /Evidence Snapshot and Claim Readiness Handoff do not match/
  );

  const workflowMismatch = buildHandoff(snapshot);
  workflowMismatch.workflow.workflow_family = "different_workflow";
  assert.throws(
    () => buildClaimReadinessSnapshotFromEvidenceSnapshotAndHandoff(snapshot, workflowMismatch),
    /Evidence Snapshot and Claim Readiness Handoff do not match/
  );
});

test("manual or unsafe snapshots fail validation", () => {
  const claimSnapshot = buildSnapshotObject();
  const manual = clone(claimSnapshot);
  delete manual.derived_from;
  assert.equal(validateClaimReadinessSnapshot(manual).valid, false);

  const unsafe = clone(claimSnapshot);
  unsafe.financial_boundary.customer_facing_financial_output_allowed = true;
  assert.equal(validateClaimReadinessSnapshot(unsafe).valid, false);

  const computed = clone(claimSnapshot);
  computed.roi_value = 12345;
  assert.equal(validateClaimReadinessSnapshot(computed).valid, false);

  const weakened = clone(claimSnapshot);
  weakened.blocked_claims = weakened.blocked_claims.filter((claim) => claim !== "roi_proof");
  assert.equal(validateClaimReadinessSnapshot(weakened).valid, false);

  const missingBlockedUses = clone(claimSnapshot);
  missingBlockedUses.blocked_uses = [];
  assert.equal(validateClaimReadinessSnapshot(missingBlockedUses).valid, false);

  const sourceRefDrift = clone(claimSnapshot);
  sourceRefDrift.source_provenance.source_refs.bigquery_probe_result_id = "different_probe";
  assert.equal(validateClaimReadinessSnapshot(sourceRefDrift).valid, false);

  const windowDrift = clone(claimSnapshot);
  windowDrift.source_provenance.window.window_end = "2026-06-30";
  assert.equal(validateClaimReadinessSnapshot(windowDrift).valid, false);

  const unsafeMode = clone(claimSnapshot);
  unsafeMode.allowed_claim_modes.push("customer_facing_financial_output");
  assert.equal(validateClaimReadinessSnapshot(unsafeMode).valid, false);

  const overclaimed = clone(claimSnapshot);
  overclaimed.playbook_coverage.coverage_status = "full_playbook_coverage";
  overclaimed.coverage_status = "full_playbook_coverage";
  assert.equal(validateClaimReadinessSnapshot(overclaimed).valid, false);
});

test("Claim Readiness Snapshot contract creates no persistence, routes, UI, or ingestion", () => {
  const claimSnapshot = buildSnapshotObject();

  assert.deepEqual(claimSnapshot.persistence_policy, {
    persisted: false,
    creates_migrations: false,
    creates_prisma_schema: false,
    creates_backend_routes: false,
    creates_frontend_ui: false,
    creates_ingestion_jobs: false
  });
});

test("Claim Readiness Snapshot examples validate", () => {
  for (const file of [
    "layer-1-only-claim-readiness-snapshot.json",
    "full-playbook-claim-readiness-snapshot.json"
  ]) {
    const claimSnapshot = readJson(`${EXAMPLES}/${file}`);
    const validation = validateClaimReadinessSnapshot(claimSnapshot);
    assert.equal(validation.valid, true, `${file}: ${validation.gaps.join("; ")}`);
  }
});
