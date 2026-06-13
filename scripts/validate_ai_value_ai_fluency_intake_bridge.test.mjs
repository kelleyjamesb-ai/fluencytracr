import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  AI_VALUE_AI_FLUENCY_INTAKE_BRIDGE_SCHEMA_VERSION,
  FLUENCY_BASELINE_SCHEMA_VERSION,
  buildEvidenceGapReviewFromMeasurementPlanAndSnapshot,
  buildMeasurementPlanDraftFromAIFluencyIntake,
  validateEvidenceSnapshot,
  validateAIFluencyIntakeBridge,
  validateClientEvidenceRequest,
  validateMeasurementPlan
} from "../shared/dist/aiValueEngine/index.js";

const EXAMPLES = "docs/contracts/ai-value-ai-fluency-intake-bridge/examples";
const ASSEMBLY_EXAMPLES = "docs/contracts/ai-value-evidence-collection-assembler/examples";

const EXAMPLE_FILES = [
  "ai-fluency-only-draft-plan.json"
];

const REQUIRED_BLOCKED_USES = [
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

const UNSAFE_PERSON_KEYS = [
  "user_id",
  "employee_id",
  "employee_email",
  "person_id",
  "person_identifier",
  "hashed_user_id",
  "joinable_user_id",
  "manager_ranking",
  "team_ranking"
];

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const clone = (value) => JSON.parse(JSON.stringify(value));

function buildBaseline() {
  return {
    schema_version: FLUENCY_BASELINE_SCHEMA_VERSION,
    baseline_id: "fluency_baseline_customer_support_2026_05",
    org_id: "org_example",
    instrument: {
      instrument_id: "ai_fluency_long_v1",
      item_count: 24
    },
    window: {
      window_start: "2026-05-01",
      window_end: "2026-05-31"
    },
    collection_mode: "kickoff",
    cohorts: [
      {
        cohort_id: "customer_support_all",
        cohort_label: "Customer Support",
        respondent_count: 42,
        suppressed: false,
        construct_scores: {
          confidence: { mean: 3.8 },
          usage_quality: { mean: 3.4 },
          behavior_change: { mean: 3.1 },
          leadership_reinforcement: { mean: 3.6 },
          capability_growth: { mean: 3.5 },
          ai_attitude: { mean: 3.9 },
          behavioral_intent: { mean: 3.7 },
          perceived_ai_impact: { mean: 3.2 }
        }
      }
    ],
    governance: {
      respondent_identifiers_included: false,
      person_level_results_shared: false,
      used_for_individual_scoring: false,
      used_for_team_ranking: false
    }
  };
}

function buildBridge(overrides = {}) {
  return buildMeasurementPlanDraftFromAIFluencyIntake({
    orgId: "org_example",
    workflowFamily: "customer_support_case_resolution",
    workflowName: "Support case resolution",
    functionArea: "customer_support",
    hypothesisStatement:
      "AI-assisted support workflows may improve aggregate case resolution posture when paired with customer-owned evidence.",
    businessObjective: "Improve aggregate support case resolution experience.",
    baselineWindowStart: "2026-05-01",
    baselineWindowEnd: "2026-05-31",
    generatedAt: "2026-06-13T00:00:00.000Z",
    bridgeId: "ai_fluency_intake_bridge_test",
    measurementPlanId: "measurement_plan_ai_fluency_bridge_test",
    evidenceSnapshotId: "evidence_snapshot_ai_fluency_bridge_test",
    aiFluencyBaseline: buildBaseline(),
    ...overrides
  });
}

function gapFor(bridge, playbookLayer) {
  const gap = bridge.evidence_gap_review.evidence_gaps.find(
    (candidate) => candidate.playbook_layer === playbookLayer
  );
  assert.ok(gap, `Expected gap for ${playbookLayer}`);
  return gap;
}

function collectKeys(value, keys = new Set()) {
  if (!value || typeof value !== "object") return keys;
  if (Array.isArray(value)) {
    value.forEach((item) => collectKeys(item, keys));
    return keys;
  }
  Object.entries(value).forEach(([key, nested]) => {
    keys.add(key);
    collectKeys(nested, keys);
  });
  return keys;
}

function trustedFullSnapshotForBridge(bridge) {
  const assembly = readJson(`${ASSEMBLY_EXAMPLES}/full-playbook-assembly.json`);
  const snapshot = assembly.draft_evidence_snapshot_input;
  snapshot.org_id = bridge.org_id;
  snapshot.measurement_plan_id = bridge.measurement_plan_draft.measurement_plan_id;
  snapshot.evidence_snapshot_id = "evidence_snapshot_trusted_full_playbook_bridge_test";
  snapshot.workflow.workflow_family = bridge.workflow.workflow_family;
  snapshot.workflow.function_area = bridge.workflow.function_area;
  const result = validateEvidenceSnapshot(snapshot);
  assert.equal(result.valid, true, result.gaps.join("; "));
  return snapshot;
}

function expectInvalidBridge(bridge, expectedGapPattern) {
  const result = validateAIFluencyIntakeBridge(bridge);
  assert.equal(result.valid, false, "Expected AI Fluency Intake Bridge to fail");
  assert.ok(
    result.gaps.some((gap) => expectedGapPattern.test(gap)),
    `Expected gap matching ${expectedGapPattern}; got: ${result.gaps.join("; ")}`
  );
}

test("all examples validate", () => {
  for (const file of EXAMPLE_FILES) {
    const bridge = readJson(`${EXAMPLES}/${file}`);
    const result = validateAIFluencyIntakeBridge(bridge);
    assert.equal(result.valid, true, `${file}: ${result.gaps.join("; ")}`);
  }
});

test("AI Fluency intake creates a valid draft Measurement Plan", () => {
  const bridge = buildBridge();
  const bridgeResult = validateAIFluencyIntakeBridge(bridge);
  const planResult = validateMeasurementPlan(bridge.measurement_plan_draft);

  assert.equal(bridge.schema_version, AI_VALUE_AI_FLUENCY_INTAKE_BRIDGE_SCHEMA_VERSION);
  assert.equal(bridgeResult.valid, true, bridgeResult.gaps.join("; "));
  assert.equal(planResult.valid, true, planResult.gaps.join("; "));
  assert.equal(bridge.measurement_plan_draft.org_id, "org_example");
  assert.equal(
    bridge.measurement_plan_draft.readiness.measurement_plan_readiness,
    "held_for_customer_exports"
  );
});

test("draft plan includes VBD design while preserving VBD as Layer 1 only", () => {
  const bridge = buildBridge();
  const vbd = bridge.measurement_plan_draft.vbd_measurement_design;

  assert.equal(vbd.velocity.required, true);
  assert.equal(vbd.breadth.required, true);
  assert.equal(vbd.depth.required, true);
  assert.equal(vbd.vbd_claim_boundary.contributes_to_playbook_layer, "layer_1_platform_telemetry");
  assert.ok(vbd.vbd_claim_boundary.allowed_uses.includes("ai_fluency_posture"));
  assert.ok(vbd.vbd_claim_boundary.blocked_uses.includes("realized_roi"));
});

test("Layer 2 and Layer 3 missing evidence remains explicit in the gap review", () => {
  const bridge = buildBridge();
  const layer2 = gapFor(bridge, "layer_2_user_voice_empirical");
  const layer3 = gapFor(bridge, "layer_3_business_system_outcomes");

  assert.equal(layer2.required, true);
  assert.equal(layer2.evidence_state, "partial");
  assert.ok(layer2.missing_or_held_items.includes("aggregate_user_voice_or_workflow_observation"));
  assert.equal(layer3.required, true);
  assert.equal(layer3.evidence_state, "missing");
  assert.ok(layer3.missing_or_held_items.includes("system_of_record_outcome_export"));
  assert.equal(bridge.evidence_gap_review.coverage_boundary.full_playbook_coverage, false);
});

test("safe placeholder intake marks Layer 2 as missing when no baseline is provided", () => {
  const bridge = buildBridge({ aiFluencyBaseline: null });
  const result = validateAIFluencyIntakeBridge(bridge);
  const layer2 = gapFor(bridge, "layer_2_user_voice_empirical");

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(bridge.ai_fluency_intake.intake_state, "missing_placeholder");
  assert.equal(layer2.evidence_state, "missing");
  assert.ok(layer2.missing_or_held_items.includes("aggregate_ai_fluency_baseline"));
});

test("safe placeholder intake validates before an evidence snapshot exists", () => {
  const bridge = buildBridge({
    aiFluencyBaseline: null,
    evidenceSnapshotId: undefined
  });
  const result = validateAIFluencyIntakeBridge(bridge);

  assert.equal(bridge.evidence_gap_review.evidence_snapshot_id, null);
  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(result.feeds.evidence_snapshot, false);
});

test("client evidence requests are generated and validated", () => {
  const bridge = buildBridge();
  const requestedLayers = bridge.client_evidence_requests.map(
    (request) => request.requested_playbook_layer
  );

  for (const layer of [
    "layer_2_user_voice_empirical",
    "layer_3_business_system_outcomes",
    "governance_evidence",
    "assumption_evidence"
  ]) {
    assert.ok(requestedLayers.includes(layer), `Expected request for ${layer}`);
  }
  for (const request of bridge.client_evidence_requests) {
    const result = validateClientEvidenceRequest(request);
    assert.equal(result.valid, true, `${request.request_id}: ${result.gaps.join("; ")}`);
    assert.equal(request.allowed_claim_improvement.request_itself_upgrades_claim_readiness, false);
    assert.equal(request.allowed_claim_improvement.financial_claims_allowed, false);
  }
});

test("baseline score is never converted into value proof", () => {
  const bridge = buildBridge();

  assert.equal(bridge.ai_fluency_intake.evidence_layer, "layer_2_user_voice_empirical");
  assert.equal(bridge.ai_fluency_intake.contributes_to_value_proof, false);
  assert.equal(bridge.ai_fluency_intake.feeds.claim_readiness_snapshot, false);
  assert.equal(bridge.ai_fluency_intake.feeds.executive_readout_snapshot, false);
  assert.equal(bridge.evidence_gap_review.coverage_boundary.ai_fluency_baseline_is_value_proof, false);
  assert.equal(bridge.evidence_gap_review.coverage_boundary.bigquery_source_availability_is_value_proof, false);
});

test("forbidden financial, productivity, causality, headcount, attribution, and people uses are blocked", () => {
  const bridge = buildBridge();

  for (const blockedUse of REQUIRED_BLOCKED_USES) {
    assert.ok(bridge.blocked_uses.includes(blockedUse), `Bridge missing ${blockedUse}`);
    assert.ok(
      bridge.measurement_plan_draft.blocked_uses.includes(blockedUse),
      `Measurement Plan missing ${blockedUse}`
    );
    assert.ok(
      bridge.client_evidence_requests.every((request) => request.blocked_claims.includes(blockedUse)),
      `Client Evidence Request missing ${blockedUse}`
    );
  }
});

test("bridge does not introduce people analytics or unsafe person identifier fields", () => {
  const bridge = buildBridge();
  const keys = collectKeys(bridge);

  for (const unsafeKey of UNSAFE_PERSON_KEYS) {
    assert.equal(keys.has(unsafeKey), false, `Unexpected unsafe key: ${unsafeKey}`);
  }
  assert.equal(bridge.privacy_boundary.aggregate_only, true);
  assert.equal(bridge.privacy_boundary.contains_direct_identifiers, false);
  assert.equal(bridge.privacy_boundary.contains_hashed_or_joinable_person_identifiers, false);
  assert.equal(bridge.privacy_boundary.contains_person_level_productivity, false);
  assert.equal(bridge.privacy_boundary.contains_people_decisioning, false);
});

test("gap review can be built from a Measurement Plan without upgrading coverage", () => {
  const bridge = buildBridge();
  const gapReview = buildEvidenceGapReviewFromMeasurementPlanAndSnapshot(
    bridge.measurement_plan_draft,
    null,
    {
      generatedAt: "2026-06-13T00:00:00.000Z",
      aiFluencyIntakeState: "missing_placeholder"
    }
  );

  const layer2 = gapReview.evidence_gaps.find(
    (candidate) => candidate.playbook_layer === "layer_2_user_voice_empirical"
  );
  assert.equal(layer2.evidence_state, "missing");
  assert.equal(gapReview.coverage_boundary.full_playbook_coverage, false);
  assert.equal(gapReview.feeds.claim_readiness_snapshot, false);
});

test("gap review clears missing items when validated snapshot evidence is already present", () => {
  const bridge = buildBridge();
  const snapshot = trustedFullSnapshotForBridge(bridge);
  const gapReview = buildEvidenceGapReviewFromMeasurementPlanAndSnapshot(
    bridge.measurement_plan_draft,
    snapshot,
    {
      generatedAt: "2026-06-13T00:00:00.000Z",
      aiFluencyIntakeState: "provided_validated"
    }
  );

  for (const layer of ["layer_2_user_voice_empirical", "layer_3_business_system_outcomes"]) {
    const gap = gapReview.evidence_gaps.find(
      (candidate) => candidate.playbook_layer === layer
    );
    assert.equal(gap.evidence_state, "validated", layer);
    assert.deepEqual(gap.missing_or_held_items, [], layer);
    assert.equal(gap.client_action_required, false, layer);
  }
});

test("gap review does not trust status-only or mismatched evidence snapshots", () => {
  const bridge = buildBridge();
  for (const status of ["present", "validated"]) {
    const statusOnlySnapshot = {
      evidence_snapshot_id: `evidence_snapshot_status_only_${status}`,
      playbook_coverage: {
        layer_2_user_voice_empirical: { status },
        layer_3_business_system_outcomes: { status }
      }
    };
    const gapReview = buildEvidenceGapReviewFromMeasurementPlanAndSnapshot(
      bridge.measurement_plan_draft,
      statusOnlySnapshot,
      {
        generatedAt: "2026-06-13T00:00:00.000Z",
        aiFluencyIntakeState: "provided_validated"
      }
    );

    for (const layer of ["layer_2_user_voice_empirical", "layer_3_business_system_outcomes"]) {
      const gap = gapReview.evidence_gaps.find(
        (candidate) => candidate.playbook_layer === layer
      );
      assert.notEqual(gap.evidence_state, "validated", `${status}:${layer}`);
      assert.notDeepEqual(gap.missing_or_held_items, [], `${status}:${layer}`);
    }
  }

  const mismatchedSnapshot = trustedFullSnapshotForBridge(bridge);
  mismatchedSnapshot.measurement_plan_id = "measurement_plan_for_another_workflow";
  const mismatchedReview = buildEvidenceGapReviewFromMeasurementPlanAndSnapshot(
    bridge.measurement_plan_draft,
    mismatchedSnapshot,
    {
      generatedAt: "2026-06-13T00:00:00.000Z",
      aiFluencyIntakeState: "provided_validated"
    }
  );
  assert.notEqual(
    mismatchedReview.evidence_gaps.find(
      (candidate) => candidate.playbook_layer === "layer_3_business_system_outcomes"
    ).evidence_state,
    "validated"
  );
});

test("validator rejects missing client evidence request coverage", () => {
  const emptyRequests = buildBridge();
  emptyRequests.client_evidence_requests = [];
  expectInvalidBridge(emptyRequests, /client_evidence_requests must include at least one request/);

  const missingLayer3 = buildBridge();
  missingLayer3.client_evidence_requests = missingLayer3.client_evidence_requests.filter(
    (request) => request.requested_playbook_layer !== "layer_3_business_system_outcomes"
  );
  expectInvalidBridge(
    missingLayer3,
    /client_evidence_requests missing required request for layer_3_business_system_outcomes/
  );
});

test("validator rejects unsafe evidence gap review feeds, uses, blocked uses, and caveats", () => {
  const unsafeFeed = buildBridge();
  unsafeFeed.evidence_gap_review.feeds.claim_readiness_snapshot = true;
  expectInvalidBridge(
    unsafeFeed,
    /evidence_gap_review\.feeds\.claim_readiness_snapshot must be false/
  );

  const unsafeAllowedUse = buildBridge();
  unsafeAllowedUse.evidence_gap_review.allowed_uses.push("customer_facing_financial_output");
  expectInvalidBridge(
    unsafeAllowedUse,
    /evidence_gap_review\.allowed_uses contains unsafe use: customer_facing_financial_output/
  );

  const missingBlockedUse = buildBridge();
  missingBlockedUse.evidence_gap_review.blocked_uses =
    missingBlockedUse.evidence_gap_review.blocked_uses.filter(
      (use) => use !== "realized_roi"
    );
  expectInvalidBridge(
    missingBlockedUse,
    /evidence_gap_review\.blocked_uses must include realized_roi/
  );

  const missingCaveat = buildBridge();
  missingCaveat.evidence_gap_review.required_caveats =
    missingCaveat.evidence_gap_review.required_caveats.filter(
      (caveat) => !/Client Evidence Requests do not improve claim readiness/.test(caveat)
    );
  expectInvalidBridge(
    missingCaveat,
    /evidence_gap_review\.required_caveats must include/
  );
});

test("validator rejects cross-object identity drift", () => {
  const planOrgMismatch = buildBridge();
  planOrgMismatch.measurement_plan_draft.org_id = "org_other";
  expectInvalidBridge(
    planOrgMismatch,
    /measurement_plan_draft\.org_id must match bridge org_id/
  );

  const gapOrgMismatch = buildBridge();
  gapOrgMismatch.evidence_gap_review.org_id = "org_other";
  expectInvalidBridge(
    gapOrgMismatch,
    /evidence_gap_review\.org_id must match bridge org_id/
  );

  const requestPlanMismatch = buildBridge();
  requestPlanMismatch.client_evidence_requests[0].measurement_plan_id = "measurement_plan_other";
  expectInvalidBridge(
    requestPlanMismatch,
    /client_evidence_requests\[0\]\.measurement_plan_id must match measurement_plan_draft/
  );

  const baselineOrgMismatch = buildBridge();
  baselineOrgMismatch.ai_fluency_intake.baseline_validation.org_id = "org_other";
  expectInvalidBridge(
    baselineOrgMismatch,
    /ai_fluency_intake\.baseline_validation\.org_id must match bridge org_id/
  );

  const workflowMismatch = buildBridge();
  workflowMismatch.workflow.workflow_family = "sales_pipeline_generation";
  expectInvalidBridge(
    workflowMismatch,
    /workflow\.workflow_family must match measurement_plan_draft\.workflow_scope\.workflow_family/
  );

  const functionAreaMismatch = buildBridge();
  functionAreaMismatch.workflow.function_area = "sales";
  expectInvalidBridge(
    functionAreaMismatch,
    /workflow\.function_area must match measurement_plan_draft\.workflow_scope\.function_area/
  );

  const requestSnapshotMissing = buildBridge();
  requestSnapshotMissing.client_evidence_requests[0].evidence_snapshot_id = null;
  expectInvalidBridge(
    requestSnapshotMissing,
    /client_evidence_requests\[0\]\.evidence_snapshot_id must match evidence_gap_review/
  );
});

test("validator rejects missing placeholder with baseline evidence attached", () => {
  const bridge = buildBridge({ aiFluencyBaseline: null });
  bridge.ai_fluency_intake.baseline_validation = buildBridge().ai_fluency_intake.baseline_validation;
  expectInvalidBridge(
    bridge,
    /missing_placeholder intake must not include baseline_validation/
  );

  const summary = buildBridge({ aiFluencyBaseline: null });
  summary.ai_fluency_intake.baseline_summary = buildBridge().ai_fluency_intake.baseline_summary;
  expectInvalidBridge(
    summary,
    /missing_placeholder intake must not include baseline_summary/
  );

  const feed = buildBridge({ aiFluencyBaseline: null });
  feed.ai_fluency_intake.feeds.layer_2_user_voice_context = true;
  expectInvalidBridge(
    feed,
    /missing_placeholder intake must not feed layer_2_user_voice_context/
  );
});
