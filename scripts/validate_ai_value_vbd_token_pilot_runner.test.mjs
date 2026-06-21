import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildTelemetryEvidenceSnapshotDraft,
  buildTokenEfficiencySignalFromAggregateSummary,
  buildVbdTokenPilotRunFromWindowEvidence,
  validateEvidenceSnapshot,
  validateTokenEfficiencySignal,
  validateVbdTokenEfficiencyMap,
  validateVbdTokenPilotRun
} from "../shared/dist/aiValueEngine/index.js";

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

const clone = (value) => JSON.parse(JSON.stringify(value));

function highVbdOperatingMap() {
  return {
    velocity: {
      state: "high",
      evidence_state: "present",
      source_signals: ["workflow_run_count", "active_user_aggregate"],
      caveats: ["Velocity is aggregate Layer 1 posture only."]
    },
    breadth: {
      state: "broad",
      approved_aggregate_grain: "function",
      covered_slices: 6,
      suppressed_or_unknown_slices: 0,
      caveats: ["Breadth is aggregate-only."]
    },
    depth: {
      state: "embedded",
      evidence_state: "present",
      source_signals: ["agent_lifecycle_activity", "artifact_output_metadata"],
      requires_layer_3_for_value_claim: true,
      caveats: ["Depth is work-integration posture only."]
    },
    operating_mode: "high_fluency_flow",
    contributes_to_playbook_layer: "layer_1_platform_telemetry",
    allowed_interpretation: [
      "ai_fluency_posture",
      "layer_1_operating_signal",
      "evidence_collection_planning"
    ],
    blocked_interpretation: [...REQUIRED_BLOCKED_USES]
  };
}

function shallowVbdOperatingMap() {
  return {
    ...highVbdOperatingMap(),
    velocity: {
      state: "low",
      evidence_state: "present",
      source_signals: ["workflow_run_count"],
      caveats: ["Velocity is low in this aggregate window."]
    },
    breadth: {
      state: "narrow",
      approved_aggregate_grain: "function",
      covered_slices: 2,
      suppressed_or_unknown_slices: 0,
      caveats: ["Breadth remains narrow."]
    },
    depth: {
      state: "shallow",
      evidence_state: "present",
      source_signals: ["chat_or_assistant_activity"],
      requires_layer_3_for_value_claim: true,
      caveats: ["Depth remains shallow."]
    },
    operating_mode: "low_integration"
  };
}

function snapshot(windowId, windowStart, windowEnd, vbdOperatingMap) {
  const draft = buildTelemetryEvidenceSnapshotDraft({
    orgId: "org-synthetic-cs-50",
    workflowFamily: "customer_success_account_health_review",
    workflowName: "Customer Success account health review",
    functionArea: "customer_success",
    windowStart,
    windowEnd,
    generatedAt: "2026-06-16T00:00:00.000Z",
    evidenceSnapshotId: `evidence_snapshot_cs_50_${windowId}`,
    measurementPlanId: "measurement_plan_cs_50_vbd_token_pilot",
    aggregateTelemetrySummary: {
      probe_window_start: windowStart,
      probe_window_end: windowEnd,
      aggregate_event_count: 42000,
      table_families_checked: [
        "scrubbed_llm_call",
        "scrubbed_client_analytics",
        "scrubbed_workflows"
      ],
      approved_field_coverage_summary: {
        approved_fields_expected: 24,
        approved_fields_found: 21,
        approved_fields_missing: 3
      },
      k_min_summary: {
        total_slices: 6,
        k_min_clear_slices: 6,
        suppressed_or_unknown_slices: 0,
        minimum_cohort_threshold: 5
      }
    },
    sourceRefs: {
      bigquery_probe_result_id: `bq_probe_cs_50_${windowId}`,
      source_readiness_ids: [`source_readiness_cs_50_${windowId}`],
      notes: ["Synthetic aggregate pilot fixture; no raw rows retained."]
    }
  });

  return {
    ...draft,
    privacy_boundary: {
      ...draft.privacy_boundary,
      approved_aggregate_grain: "function",
      minimum_cohort_threshold: 5
    },
    vbd_operating_map: vbdOperatingMap,
    required_caveats: [
      ...draft.required_caveats,
      "VBD movement is Layer 1 work-integration posture only.",
      "High fluency flow is Layer 1 posture only, not full value proof."
    ]
  };
}

function tokenSignal(windowId, windowStart, windowEnd, aggregateTokenSummary, options = {}) {
  return buildTokenEfficiencySignalFromAggregateSummary(
    {
      org_id: "org-synthetic-cs-50",
      workflow_family: "customer_success_account_health_review",
      workflow_name: "Customer Success account health review",
      function_area: "customer_success",
      generated_at: "2026-06-16T00:00:00.000Z",
      covered_window: {
        window_start: windowStart,
        window_end: windowEnd
      },
      approved_aggregate_grain: "function",
      minimum_cohort_threshold: 5,
      k_min_posture: options.kMinPosture ?? {
        minimum_cohort_threshold: 5,
        cohort_threshold_met: true,
        total_slices: 6,
        k_min_clear_slices: 6,
        suppressed_or_unknown_slices: 0
      },
      aggregate_token_summary: aggregateTokenSummary,
      source_refs: {
        aggregate_probe_id: `token_probe_cs_50_${windowId}`,
        source_readiness_id: `source_readiness_token_usage_cs_50_${windowId}`
      },
      source_owner_attestation: {
        attestation_state: "attested",
        attested_by_role: "customer_data_owner",
        attested_at: "2026-06-16T00:00:00.000Z",
        caveats: []
      }
    },
    {
      signalId: `token_efficiency_signal_cs_50_${windowId}`,
      generatedAt: "2026-06-16T00:00:00.000Z",
      evidenceState: options.evidenceState ?? "present",
      caveats: options.caveats
    }
  );
}

function baselineTokenSummary() {
  return {
    total_prompt_tokens: 520000,
    total_completion_tokens: 160000,
    total_tokens: 680000,
    model_families_observed: ["gpt-4.1", "gpt-4.1-mini"],
    aggregate_interaction_count: 310,
    aggregate_workflow_count: 62,
    high_intensity_workflow_share: 0.68,
    average_tokens_per_interaction: 2194,
    average_tokens_per_workflow: 10968,
    prompt_to_completion_ratio: 3.25
  };
}

function comparisonTokenSummary() {
  return {
    total_prompt_tokens: 305000,
    total_completion_tokens: 115000,
    total_tokens: 420000,
    model_families_observed: ["gpt-4.1-mini", "gpt-4.1"],
    aggregate_interaction_count: 640,
    aggregate_workflow_count: 168,
    high_intensity_workflow_share: 0.16,
    average_tokens_per_interaction: 656,
    average_tokens_per_workflow: 2400,
    prompt_to_completion_ratio: 2.65
  };
}

function baselineWindow() {
  const evidenceSnapshot = snapshot(
    "baseline",
    "2026-02-01",
    "2026-03-31",
    shallowVbdOperatingMap()
  );
  const signal = tokenSignal(
    "baseline",
    "2026-02-01",
    "2026-03-31",
    baselineTokenSummary()
  );
  assert.equal(validateEvidenceSnapshot(evidenceSnapshot).valid, true);
  assert.equal(validateTokenEfficiencySignal(signal).valid, true);
  return {
    window_id: "baseline",
    window_label: "Baseline",
    evidence_snapshot: evidenceSnapshot,
    token_efficiency_signal: signal
  };
}

function comparisonWindow(overrides = {}) {
  const evidenceSnapshot = snapshot(
    "comparison",
    "2026-04-01",
    "2026-05-31",
    highVbdOperatingMap()
  );
  const signal = tokenSignal(
    "comparison",
    "2026-04-01",
    "2026-05-31",
    comparisonTokenSummary(),
    overrides
  );
  assert.equal(validateEvidenceSnapshot(evidenceSnapshot).valid, true);
  assert.equal(validateTokenEfficiencySignal(signal).valid, true);
  return {
    window_id: "comparison",
    window_label: "Comparison",
    evidence_snapshot: evidenceSnapshot,
    token_efficiency_signal: signal
  };
}

function buildRun(windows = [baselineWindow(), comparisonWindow()], overrides = {}) {
  return buildVbdTokenPilotRunFromWindowEvidence({
    pilotRunId: "vbd_token_pilot_run_cs_50_synthetic",
    orgId: "org-synthetic-cs-50",
    workflowFamily: "customer_success_account_health_review",
    workflowName: "Customer Success account health review",
    functionArea: "customer_success",
    generatedAt: "2026-06-16T00:00:00.000Z",
    pilotScope: {
      population_label: "Synthetic Customer Success 50",
      users_in_scope: 50,
      approved_aggregate_grain: "function",
      minimum_cohort_threshold: 5,
      synthetic_fixture: true
    },
    windows,
    ...overrides
  });
}

function expectValidRun(run) {
  const result = validateVbdTokenPilotRun(run);
  assert.equal(result.valid, true, result.gaps.join("; "));
  for (const window of run.window_sequence) {
    const mapResult = validateVbdTokenEfficiencyMap(window.vbd_token_efficiency_map);
    assert.equal(mapResult.valid, true, `${window.window_id}: ${mapResult.gaps.join("; ")}`);
  }
}

test("synthetic CS-50 pilot runner shows two-window VBD and token movement", () => {
  const run = buildRun();

  expectValidRun(run);
  assert.equal(run.valid, true, run.gaps.join("; "));
  assert.equal(run.pilot_scope.users_in_scope, 50);
  assert.equal(run.window_sequence.length, 2);
  assert.deepEqual(
    run.window_sequence.map((window) => window.strategy_zone),
    ["mitigate_friction", "replicate_pattern"]
  );
  assert.equal(run.movement_summary.strategy_transition, "mitigate_friction_to_replicate_pattern");
  assert.equal(
    run.movement_summary.vbd_posture_transition,
    "shallow_work_integration_to_high_work_integration"
  );
  assert.equal(run.movement_summary.token_posture_transition, "high_intensity_to_efficient");
  assert.ok(run.movement_summary.total_tokens_change_pct < 0);
  assert.ok(run.movement_summary.average_tokens_per_workflow_change_pct < 0);
  assert.ok(run.movement_summary.high_intensity_workflow_share_change < 0);
  assert.equal(run.recommended_next_motion.motion, "replicate_governed_pattern");
  assert.equal(run.feeds.claim_readiness_snapshot, false);
  assert.equal(run.feeds.executive_readout_snapshot, false);
  assert.equal(run.feeds.reportability_readiness, false);
  assert.equal(run.feeds.customer_facing_financial_output, false);
  assert.ok(run.caveats.some((caveat) => /not ROI/i.test(caveat)));
});

test("pilot runner sorts windows chronologically before computing movement", () => {
  const run = buildRun([comparisonWindow(), baselineWindow()]);

  expectValidRun(run);
  assert.deepEqual(
    run.window_sequence.map((window) => window.window_id),
    ["baseline", "comparison"]
  );
  assert.equal(run.movement_summary.strategy_transition, "mitigate_friction_to_replicate_pattern");
});

test("pilot runner fails closed without at least two windows", () => {
  const run = buildRun([baselineWindow()]);

  const result = validateVbdTokenPilotRun(run);
  assert.equal(run.valid, false);
  assert.equal(run.pilot_decision, "hold_for_more_windows");
  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.ok(run.gaps.some((gap) => /at least two windows/i.test(gap)), run.gaps.join("; "));
  assert.equal(run.feeds.claim_readiness_snapshot, false);
});

test("pilot runner keeps held token evidence in evidence hold posture", () => {
  const heldComparison = comparisonWindow({
    evidenceState: "held",
    kMinPosture: {
      minimum_cohort_threshold: 5,
      cohort_threshold_met: false,
      total_slices: 6,
      k_min_clear_slices: 4,
      suppressed_or_unknown_slices: 2
    },
    caveats: ["Comparison token evidence is held because k-min did not clear."]
  });
  const run = buildRun([baselineWindow(), heldComparison]);

  expectValidRun(run);
  assert.equal(run.window_sequence[1].strategy_zone, "hold_for_evidence");
  assert.equal(run.recommended_next_motion.motion, "hold_for_evidence");
  assert.equal(run.feeds.claim_readiness_snapshot, false);
  assert.equal(run.feeds.customer_facing_financial_output, false);
});

test("pilot runner rejects unsafe fields and downstream feed toggles", () => {
  const run = buildRun();
  expectValidRun(run);

  for (const tamper of [
    (draft) => {
      draft.realized_roi = 120000;
    },
    (draft) => {
      draft.window_sequence[0].manager_or_team_ranking = true;
    },
    (draft) => {
      draft.feeds.claim_readiness_snapshot = true;
    },
    (draft) => {
      draft.persistence_policy.creates_backend_routes = true;
    },
    (draft) => {
      draft.privacy_boundary = { contains_direct_identifiers: true };
    },
    (draft) => {
      draft.pilot_scope.users_in_scope = 3;
    }
  ]) {
    const unsafe = clone(run);
    tamper(unsafe);
    const result = validateVbdTokenPilotRun(unsafe);
    assert.equal(result.valid, false, result.gaps.join("; "));
  }
});

test("pilot runner rejects duplicate window ids", () => {
  const duplicate = baselineWindow();
  duplicate.window_id = "baseline";
  const run = buildRun([baselineWindow(), duplicate]);

  const result = validateVbdTokenPilotRun(run);
  assert.equal(run.valid, false);
  assert.equal(run.pilot_decision, "hold_for_evidence");
  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.ok(run.gaps.some((gap) => /duplicate window_id/i.test(gap)), run.gaps.join("; "));
});

test("pilot runner rejects mixed-slice windows before movement is interpreted", () => {
  const mixedComparison = comparisonWindow();
  mixedComparison.evidence_snapshot = {
    ...mixedComparison.evidence_snapshot,
    org_id: "org-other",
    workflow: {
      ...mixedComparison.evidence_snapshot.workflow,
      workflow_family: "customer_support_other",
      function_area: "support_ops"
    },
    vbd_operating_map: {
      ...mixedComparison.evidence_snapshot.vbd_operating_map,
      breadth: {
        ...mixedComparison.evidence_snapshot.vbd_operating_map.breadth,
        approved_aggregate_grain: "region"
      }
    },
    privacy_boundary: {
      ...mixedComparison.evidence_snapshot.privacy_boundary,
      approved_aggregate_grain: "region"
    }
  };
  mixedComparison.token_efficiency_signal = tokenSignal(
    "comparison",
    "2026-04-01",
    "2026-05-31",
    comparisonTokenSummary()
  );
  mixedComparison.token_efficiency_signal.org_id = "org-other";
  mixedComparison.token_efficiency_signal.workflow_family = "customer_support_other";
  mixedComparison.token_efficiency_signal.function_area = "support_ops";
  mixedComparison.token_efficiency_signal.approved_aggregate_grain = "region";

  const run = buildRun([baselineWindow(), mixedComparison]);

  assert.equal(run.valid, false);
  assert.equal(run.pilot_decision, "hold_for_evidence");
  assert.ok(
    run.gaps.some((gap) => /must match baseline window/i.test(gap)),
    run.gaps.join("; ")
  );
});

test("pilot runner returns fail-closed output for malformed non-array windows", () => {
  const run = buildVbdTokenPilotRunFromWindowEvidence({
    pilotRunId: "vbd_token_pilot_run_malformed",
    orgId: "org-synthetic-cs-50",
    workflowFamily: "customer_success_account_health_review",
    generatedAt: "2026-06-16T00:00:00.000Z",
    windows: { not: "an array" }
  });

  assert.equal(run.valid, false);
  assert.equal(run.pilot_decision, "hold_for_evidence");
  assert.ok(run.gaps.includes("windows must be an array"), run.gaps.join("; "));
});

test("pilot runner rejects unsafe pilot scope strings before echoing scope as valid", () => {
  const run = buildRun(undefined, {
    pilotScope: {
      population_label: "Pilot for jane@example.com",
      users_in_scope: 50,
      approved_aggregate_grain: "function",
      minimum_cohort_threshold: 5,
      synthetic_fixture: true
    }
  });

  assert.equal(run.valid, false);
  assert.equal(run.pilot_decision, "hold_for_evidence");
  assert.ok(
    run.gaps.some((gap) => /Forbidden metadata value/i.test(gap)),
    run.gaps.join("; ")
  );
});

test("pilot runner validation recomputes decisions from held windows", () => {
  const run = clone(buildRun());
  run.window_sequence[1].vbd_posture = "held";
  run.window_sequence[1].strategy_zone = "hold_for_evidence";
  run.window_sequence[1].vbd_token_efficiency_map.vbd_posture = "held";
  run.window_sequence[1].vbd_token_efficiency_map.strategy_zone = "hold_for_evidence";
  run.pilot_decision = "ready_for_strategy_review";

  const result = validateVbdTokenPilotRun(run);
  assert.equal(result.valid, false);
  assert.ok(
    result.gaps.includes("pilot_decision must be hold_for_evidence"),
    result.gaps.join("; ")
  );
});

test("pilot runner validation compares flattened window summaries to embedded maps", () => {
  const run = clone(buildRun());
  run.window_sequence[1].strategy_zone = "optimize_cost";

  const result = validateVbdTokenPilotRun(run);
  assert.equal(result.valid, false);
  assert.ok(
    result.gaps.some((gap) => /strategy_zone must match embedded/i.test(gap)),
    result.gaps.join("; ")
  );
});

test("pilot runner examples validate", () => {
  const example = JSON.parse(
    readFileSync(
      "docs/contracts/ai-value-vbd-token-pilot-runner/examples/customer-success-50-synthetic-pilot-run.json",
      "utf8"
    )
  );
  const result = validateVbdTokenPilotRun(example);
  assert.equal(result.valid, true, result.gaps.join("; "));
});
