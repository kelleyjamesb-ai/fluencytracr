import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildAiValuePilotIntakeRunFromScrubbedGleanExports,
  validateAiValuePilotIntakeRun,
  validateClaimReadinessHandoff,
  validateEvidenceCollectionAssembly,
  validateEvidenceSnapshot
} from "../shared/dist/aiValueEngine/index.js";

const CONTRACTS = "docs/contracts";

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

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

function fullPlan() {
  return readJson(`${CONTRACTS}/ai-value-measurement-plan/examples/full-playbook-ready-plan.json`);
}

function layerOnePlan() {
  return readJson(`${CONTRACTS}/ai-value-measurement-plan/examples/layer-1-only-draft-plan.json`);
}

function privacyBoundary(overrides = {}) {
  return {
    aggregate_only: true,
    contains_direct_identifiers: false,
    contains_raw_content: false,
    contains_raw_rows: false,
    contains_raw_files: false,
    contains_raw_prompts: false,
    contains_raw_responses: false,
    contains_transcripts: false,
    contains_query_text: false,
    contains_file_contents: false,
    contains_person_level_productivity: false,
    contains_person_level_hris_records: false,
    contains_hashed_or_joinable_person_identifiers: false,
    contains_manager_or_team_ranking: false,
    contains_people_decisioning: false,
    contains_compensation_or_performance_inference: false,
    contains_promotion_or_discipline_inference: false,
    contains_attrition_prediction: false,
    contains_hris_inference_from_ai_usage: false,
    ...overrides
  };
}

function baseExport(plan, evidenceLayer, overrides = {}) {
  return {
    schema_version: "FT_AI_VALUE_SCRUBBED_GLEAN_CLIENT_EXPORT_2026_06",
    export_id: `scrubbed_glean_export_${evidenceLayer}_2026_05`,
    request_id: `client_evidence_request_${plan.measurement_plan_id}_${evidenceLayer}`,
    org_id: plan.org_id,
    measurement_plan_id: plan.measurement_plan_id,
    evidence_layer: evidenceLayer,
    source_owner_role: "customer_data_owner",
    approver_role: "customer_data_owner",
    attestation: {
      attestation_state: "attested",
      attested_by_role: "customer_data_owner",
      attested_at: "2026-06-16T00:00:00.000Z",
      caveats: [
        "Scrubbed aggregate export summary only; no raw rows or identifiers retained."
      ]
    },
    generated_at: "2026-06-16T00:00:00.000Z",
    covered_window: {
      window_start:
        plan.windows.comparison_window_start ??
        plan.windows.baseline_window_start,
      window_end:
        plan.windows.comparison_window_end ??
        plan.windows.baseline_window_end
    },
    aggregate_grain: plan.workflow_scope.approved_aggregate_grain,
    minimum_cohort_threshold: plan.workflow_scope.minimum_cohort_threshold,
    k_min_posture: {
      minimum_cohort_threshold: plan.workflow_scope.minimum_cohort_threshold,
      cohort_threshold_met: true,
      total_slices: 8,
      k_min_clear_slices: 8,
      suppressed_or_unknown_slices: 0
    },
    evidence_state: "present",
    privacy_boundary: privacyBoundary(),
    source_readiness_id: `source_readiness_${evidenceLayer}_2026_05`,
    aggregate_probe_id: `aggregate_probe_${evidenceLayer}_2026_05`,
    allowed_uses: [
      "evidence_collection_input",
      "evidence_snapshot_preparation"
    ],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    notes: [
      "Pilot runner fixture uses aggregate metadata only."
    ],
    caveats: [
      "Source export package is aggregate evidence input only."
    ],
    ...overrides
  };
}

function layer1Export(plan, overrides = {}) {
  return baseExport(plan, "layer_1_platform_telemetry", {
    source_owner_role: "customer_data_platform_owner",
    approver_role: "customer_data_platform_owner",
    source_tables: [
      "scrubbed_llm_call",
      "scrubbed_client_analytics",
      "scrubbed_workflows"
    ],
    table_families_checked: [
      "scrubbed_llm_call",
      "scrubbed_client_analytics",
      "scrubbed_workflows"
    ],
    signal_families: [
      "assistant",
      "search_document_retrieval",
      "agent_run"
    ],
    covered_signal_families: [
      "assistant",
      "search_document_retrieval",
      "agent_run"
    ],
    vbd_summary: {
      baseline_index: 0.42,
      comparison_index: 0.58,
      movement_direction: "improved",
      aggregate_only: true
    },
    allowed_uses: [
      "evidence_collection_input",
      "source_availability_summary"
    ],
    caveats: [
      "Layer 1 telemetry is source availability evidence only and cannot create full Playbook coverage by itself."
    ],
    ...overrides
  });
}

function layer2Export(plan, overrides = {}) {
  return baseExport(plan, "layer_2_user_voice_empirical", {
    source_owner_role: "customer_research_owner",
    approver_role: "customer_research_owner",
    metric_or_signal_summary: {
      summary_type: "aggregate_export_metadata_summary",
      aggregate_signal_name: "aggregate_ai_fluency_baseline_summary",
      aggregate_value_present: true,
      notes: [
        "Aggregate AI Fluency baseline was provided as metadata only."
      ]
    },
    ...overrides
  });
}

function layer3Export(plan, overrides = {}) {
  return baseExport(plan, "layer_3_business_system_outcomes", {
    source_owner_role: "customer_metric_owner",
    approver_role: "customer_business_owner",
    metric_or_signal_summary: {
      summary_type: "customer_owned_aggregate_metric_summary",
      aggregate_metric_name: "aggregate_support_case_resolution_rate",
      aggregate_value_present: true,
      notes: [
        "Customer metric owner attested that this is an aggregate KPI summary."
      ]
    },
    ...overrides
  });
}

function governanceExport(plan, overrides = {}) {
  return baseExport(plan, "governance_evidence", {
    source_owner_role: "customer_governance_owner",
    approver_role: "customer_governance_owner",
    allowed_uses: [
      "evidence_collection_input",
      "governance_review"
    ],
    metric_or_signal_summary: {
      summary_type: "governance_control_export_summary",
      aggregate_signal_name: "aggregate_governance_control_summary",
      aggregate_value_present: true,
      notes: [
        "Governance owner attested to aggregate-only source readiness controls."
      ]
    },
    ...overrides
  });
}

function assumptionExport(plan, overrides = {}) {
  return baseExport(plan, "assumption_evidence", {
    source_owner_role: "finance_or_business_owner",
    approver_role: "finance_or_business_owner",
    allowed_uses: [
      "evidence_collection_input",
      "assumption_review"
    ],
    metric_or_signal_summary: {
      summary_type: "assumption_approval_export_summary",
      aggregate_signal_name: "aggregate_assumption_approval_summary",
      aggregate_value_present: true,
      notes: [
        "Finance or business owner approved customer-owned assumptions."
      ]
    },
    ...overrides
  });
}

function fullExportPacket(plan = fullPlan()) {
  return [
    layer1Export(plan),
    layer2Export(plan),
    layer3Export(plan),
    governanceExport(plan),
    assumptionExport(plan)
  ];
}

function expectValidRun(run) {
  const result = validateAiValuePilotIntakeRun(run);
  assert.equal(result.valid, true, result.gaps.join("; "));
  const assemblyResult = validateEvidenceCollectionAssembly(run.evidence_collection_assembly);
  assert.equal(assemblyResult.valid, true, assemblyResult.gaps.join("; "));
  const snapshotResult = validateEvidenceSnapshot(run.evidence_snapshot);
  assert.equal(snapshotResult.valid, true, snapshotResult.gaps.join("; "));
  const handoffResult = validateClaimReadinessHandoff(run.claim_readiness_handoff);
  assert.equal(handoffResult.valid, true, handoffResult.gaps.join("; "));
}

test("full scrubbed Glean export packet builds source packages, evidence snapshot, and handoff", () => {
  const plan = fullPlan();
  const run = buildAiValuePilotIntakeRunFromScrubbedGleanExports({
    measurementPlan: plan,
    scrubbedGleanExports: fullExportPacket(plan),
    intakeRunId: "ai_value_pilot_intake_run_full_packet",
    generatedAt: "2026-06-16T00:00:00.000Z"
  });

  expectValidRun(run);
  assert.equal(run.valid, true, run.gaps.join("; "));
  assert.equal(run.conversion_results.length, 5);
  assert.equal(run.client_evidence_entries.length, 4);
  assert.equal(run.source_packages.length, 5);
  assert.deepEqual(
    run.source_packages.map((sourcePackage) => sourcePackage.source_package_type).sort(),
    [
      "assumption_approval_export",
      "governance_control_export",
      "layer_1_bigquery_telemetry_summary",
      "layer_2_user_voice_empirical_export",
      "layer_3_business_system_of_record_outcome_export"
    ].sort()
  );
  assert.equal(run.evidence_snapshot.playbook_coverage.coverage_status, "full_playbook_coverage");
  assert.equal(run.claim_readiness_handoff.persistence_policy.persisted, false);
  assert.equal(run.claim_readiness_handoff.financial_boundary.customer_facing_financial_output_allowed, false);
  assert.equal(run.claim_readiness_handoff.financial_boundary.ebita_claim_allowed, false);
  assert.equal(run.claim_readiness_handoff.financial_boundary.roi_claim_allowed, true);
  assert.ok(
    run.claim_readiness_handoff.financial_boundary.reasons.some((reason) =>
      /internally/i.test(reason)
    ),
    run.claim_readiness_handoff.financial_boundary.reasons.join("; ")
  );
  assert.equal(run.feeds.evidence_collection_assembly, true);
  assert.equal(run.feeds.evidence_snapshot_input, true);
  assert.equal(run.feeds.claim_readiness_handoff, true);
  assert.equal(run.feeds.claim_readiness_snapshot, false);
  assert.equal(run.feeds.executive_readout_snapshot, false);
  assert.equal(run.feeds.reportability_readiness, false);
  assert.equal(run.feeds.customer_facing_financial_output, false);
  assert.equal(run.persistence_policy.persisted, false);
  assert.equal(run.persistence_policy.creates_migrations, false);
  assert.equal(run.persistence_policy.creates_backend_routes, false);
  assert.equal(run.persistence_policy.creates_frontend_ui, false);
  assert.equal(run.persistence_policy.creates_ingestion_jobs, false);
});

test("Layer 1-only scrubbed packet remains caveated and blocks financial output", () => {
  const plan = layerOnePlan();
  const run = buildAiValuePilotIntakeRunFromScrubbedGleanExports({
    measurementPlan: plan,
    scrubbedGleanExports: [layer1Export(plan)],
    intakeRunId: "ai_value_pilot_intake_run_layer_1_only",
    generatedAt: "2026-06-16T00:00:00.000Z"
  });

  expectValidRun(run);
  assert.equal(run.evidence_snapshot.playbook_coverage.coverage_status, "layer_1_only");
  assert.equal(run.evidence_snapshot.playbook_coverage.layer_2_user_voice_empirical.status, "missing");
  assert.equal(run.evidence_snapshot.playbook_coverage.layer_3_business_system_outcomes.status, "missing");
  assert.ok(
    run.evidence_snapshot.required_caveats.some((caveat) => /Layer 2/i.test(caveat)),
    run.evidence_snapshot.required_caveats.join("; ")
  );
  assert.equal(run.claim_readiness_handoff.financial_boundary.roi_claim_allowed, false);
  assert.equal(run.claim_readiness_handoff.financial_boundary.customer_facing_financial_output_allowed, false);
});

test("invalid scrubbed exports fail closed before assembly or handoff", () => {
  const plan = fullPlan();
  const run = buildAiValuePilotIntakeRunFromScrubbedGleanExports({
    measurementPlan: plan,
    scrubbedGleanExports: [
      layer1Export(plan),
      layer2Export(plan, {
        raw_rows: [
          {
            user_id: "u_123"
          }
        ]
      })
    ],
    intakeRunId: "ai_value_pilot_intake_run_invalid_export",
    generatedAt: "2026-06-16T00:00:00.000Z"
  });

  assert.equal(run.valid, false);
  assert.equal(run.evidence_collection_assembly, null);
  assert.equal(run.evidence_snapshot, null);
  assert.equal(run.claim_readiness_handoff, null);
  assert.equal(run.feeds.evidence_collection_assembly, false);
  assert.equal(run.feeds.claim_readiness_handoff, false);
  assert.ok(
    run.gaps.some((gap) => /raw_rows/i.test(gap)),
    run.gaps.join("; ")
  );
});

test("valid but non-packageable scrubbed exports fail closed instead of being dropped", () => {
  const plan = fullPlan();
  const run = buildAiValuePilotIntakeRunFromScrubbedGleanExports({
    measurementPlan: plan,
    scrubbedGleanExports: [
      layer1Export(plan),
      layer2Export(plan, {
        evidence_state: "held",
        metric_or_signal_summary: {
          summary_type: "aggregate_export_metadata_summary",
          aggregate_signal_name: "aggregate_ai_fluency_baseline_summary",
          aggregate_value_present: false,
          notes: [
            "Aggregate AI Fluency baseline is held pending customer approval."
          ]
        },
        caveats: [
          "Layer 2 export is held pending customer approval."
        ]
      })
    ],
    intakeRunId: "ai_value_pilot_intake_run_held_layer_2",
    generatedAt: "2026-06-16T00:00:00.000Z"
  });

  assert.equal(run.valid, false);
  assert.equal(run.evidence_collection_assembly, null);
  assert.equal(run.evidence_snapshot, null);
  assert.equal(run.claim_readiness_handoff, null);
  assert.ok(
    run.gaps.some((gap) => /did not produce a Source Package/i.test(gap)),
    run.gaps.join("; ")
  );
});

test("duplicate Source Package types fail closed before assembly", () => {
  const plan = fullPlan();
  const run = buildAiValuePilotIntakeRunFromScrubbedGleanExports({
    measurementPlan: plan,
    scrubbedGleanExports: [
      layer1Export(plan),
      layer1Export(plan, {
        export_id: "scrubbed_glean_export_duplicate_layer_1"
      })
    ],
    intakeRunId: "ai_value_pilot_intake_run_duplicate_type",
    generatedAt: "2026-06-16T00:00:00.000Z"
  });

  assert.equal(run.valid, false);
  assert.equal(run.evidence_collection_assembly, null);
  assert.ok(
    run.gaps.some((gap) => /Duplicate Source Package type/i.test(gap)),
    run.gaps.join("; ")
  );
});

test("plan/source drift fails closed instead of producing a snapshot", () => {
  const plan = fullPlan();
  const drifted = layer1Export(plan, {
    org_id: "org_other"
  });
  const run = buildAiValuePilotIntakeRunFromScrubbedGleanExports({
    measurementPlan: plan,
    scrubbedGleanExports: [drifted],
    intakeRunId: "ai_value_pilot_intake_run_plan_source_drift",
    generatedAt: "2026-06-16T00:00:00.000Z"
  });

  assert.equal(run.valid, false);
  assert.equal(run.evidence_collection_assembly, null);
  assert.ok(
    run.gaps.some((gap) => /org_id.*measurement plan/i.test(gap)),
    run.gaps.join("; ")
  );
});

test("downstream snapshot or reportability inputs cannot be smuggled into pilot intake", () => {
  const plan = fullPlan();
  const run = buildAiValuePilotIntakeRunFromScrubbedGleanExports({
    measurementPlan: plan,
    scrubbedGleanExports: fullExportPacket(plan),
    intakeRunId: "ai_value_pilot_intake_run_smuggled_downstream",
    generatedAt: "2026-06-16T00:00:00.000Z",
    claimReadinessSnapshotId: "claim_readiness_snapshot_external",
    executiveReadoutSnapshot: {
      executive_readout_snapshot_id: "executive_readout_snapshot_external"
    },
    reportabilityReadiness: true
  });

  assert.equal(run.valid, false);
  assert.equal(run.evidence_collection_assembly, null);
  assert.equal(run.evidence_snapshot, null);
  assert.equal(run.claim_readiness_handoff, null);
  assert.ok(
    run.gaps.some((gap) => /Unsupported pilot intake input field/i.test(gap)),
    run.gaps.join("; ")
  );
});
