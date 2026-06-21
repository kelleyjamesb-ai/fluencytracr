import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  AI_VALUE_REAL_DATA_INTAKE_PACKET_RUN_SCHEMA_VERSION,
  buildDataSpineIntakeReadiness,
  buildRealDataIntakePacketRun,
  validateAiValuePilotIntakeRun,
  validateRealDataIntakePacketRun
} from "../shared/dist/aiValueEngine/index.js";

const CONTRACTS = "docs/contracts";

const REQUIRED_BLOCKED_USES = [
  "realized_roi",
  "ebita_claim",
  "ebitda_claim",
  "financial_attribution",
  "causality_claim",
  "productivity_claim",
  "headcount_reduction_claim",
  "individual_attribution",
  "manager_or_team_ranking",
  "people_decisioning",
  "customer_facing_financial_output",
  "confidence_percentage",
  "probability_output"
];

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

function fullPlan() {
  return readJson(`${CONTRACTS}/ai-value-measurement-plan/examples/full-playbook-ready-plan.json`);
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

function source(plan, overrides = {}) {
  return {
    state: "present",
    intake_mode: "structured_object",
    source_ref: "source_ref_default",
    org_id: plan.org_id,
    client_id: "client_example",
    workflow_family: plan.workflow_scope.workflow_family,
    function_area: plan.workflow_scope.function_area,
    cohort_key: "workflow_family:customer_support_case_resolution|eligible_cases:2300",
    baseline_window: {
      window_start: plan.windows.baseline_window_start,
      window_end: plan.windows.baseline_window_end
    },
    comparison_window: {
      window_start: plan.windows.comparison_window_start,
      window_end: plan.windows.comparison_window_end
    },
    owner_role: "source_owner",
    owner_approval_state: "approved",
    review_state: "clear",
    aggregate_only: true,
    ...overrides
  };
}

function readyDataSpine(plan = fullPlan(), overrides = {}) {
  return buildDataSpineIntakeReadiness({
    orgId: plan.org_id,
    clientId: "client_example",
    workflowFamily: plan.workflow_scope.workflow_family,
    functionArea: plan.workflow_scope.function_area,
    cohortKey: "workflow_family:customer_support_case_resolution|eligible_cases:2300",
    baselineWindow: {
      window_start: plan.windows.baseline_window_start,
      window_end: plan.windows.baseline_window_end
    },
    comparisonWindow: {
      window_start: plan.windows.comparison_window_start,
      window_end: plan.windows.comparison_window_end
    },
    sources: {
      blueprint: source(plan, {
        intake_mode: "blueprint_document_upload",
        source_ref: "blueprint_parse_support_approved"
      }),
      aiFluency: source(plan, {
        intake_mode: "ai_fluency_dashboard_export",
        source_ref: "ai_fluency_support_day_30"
      }),
      vbdToken: source(plan, {
        intake_mode: "scrubbed_glean_bigquery_export",
        source_ref: "scrubbed_glean_vbd_token_support_day_30",
        connector_status: "scrubbed_export_only"
      }),
      customerMetric: source(plan, {
        intake_mode: "customer_metric_aggregate_export",
        source_ref: "support_metric_resolution_hours_day_30",
        metric_id: "support_median_resolution_hours"
      }),
      assumption: source(plan, {
        intake_mode: "assumption_approval",
        source_ref: "support_assumption_approval_day_30"
      }),
      governance: source(plan, {
        intake_mode: "governance_attestation",
        source_ref: "support_governance_attestation_day_30"
      })
    },
    generatedAt: "2026-06-20T00:00:00.000Z",
    ...overrides
  });
}

function baseExport(plan, evidenceLayer, overrides = {}) {
  return {
    schema_version: "FT_AI_VALUE_SCRUBBED_GLEAN_CLIENT_EXPORT_2026_06",
    export_id: `real_data_scrubbed_export_${evidenceLayer}_2026_06`,
    request_id: `client_evidence_request_${plan.measurement_plan_id}_${evidenceLayer}`,
    org_id: plan.org_id,
    measurement_plan_id: plan.measurement_plan_id,
    evidence_layer: evidenceLayer,
    source_owner_role: "customer_data_owner",
    approver_role: "customer_data_owner",
    attestation: {
      attestation_state: "attested",
      attested_by_role: "customer_data_owner",
      attested_at: "2026-06-20T00:00:00.000Z",
      caveats: [
        "Already-parsed aggregate export summary only; no raw rows or identifiers retained."
      ]
    },
    generated_at: "2026-06-20T00:00:00.000Z",
    covered_window: {
      window_start: plan.windows.baseline_window_start,
      window_end: plan.windows.baseline_window_end
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
    source_readiness_id: `source_readiness_${evidenceLayer}_2026_06`,
    aggregate_probe_id: `aggregate_probe_${evidenceLayer}_2026_06`,
    allowed_uses: [
      "evidence_collection_input",
      "evidence_snapshot_preparation"
    ],
    blocked_uses: [
      "realized_roi",
      "ebita_claim",
      "causality_claim",
      "productivity_claim",
      "headcount_reduction_claim",
      "individual_attribution",
      "manager_or_team_ranking",
      "people_decisioning",
      "customer_facing_financial_output"
    ],
    notes: [
      "Real-data runner fixture uses aggregate metadata only."
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
      aggregate_value_present: true
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
      aggregate_metric_name: "aggregate_support_median_resolution_hours",
      aggregate_value_present: true
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
      aggregate_value_present: true
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
      aggregate_value_present: true
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

test("real data intake runner composes aligned aggregate inputs into evidence assembly", () => {
  const plan = fullPlan();
  const run = buildRealDataIntakePacketRun({
    dataSpineReadiness: readyDataSpine(plan),
    measurementPlan: plan,
    scrubbedGleanExports: fullExportPacket(plan),
    runId: "real_data_intake_packet_run_support_day_30",
    generatedAt: "2026-06-20T00:00:00.000Z"
  });
  const result = validateRealDataIntakePacketRun(run);
  const pilotResult = validateAiValuePilotIntakeRun(run.pilot_intake_run);

  assert.equal(run.schema_version, AI_VALUE_REAL_DATA_INTAKE_PACKET_RUN_SCHEMA_VERSION);
  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(pilotResult.valid, true, pilotResult.gaps.join("; "));
  assert.equal(run.decision, "READY_FOR_MEASUREMENT_CELL_ASSEMBLY");
  assert.equal(run.feeds.measurement_cell_input, true);
  assert.equal(run.feeds.evidence_snapshot_input, true);
  assert.equal(run.feeds.claim_readiness_handoff, true);
  assert.equal(run.feeds.customer_facing_financial_output, false);
  assert.equal(run.persistence_policy.creates_backend_routes, false);
  for (const use of REQUIRED_BLOCKED_USES) {
    assert.ok(run.blocked_uses.includes(use), `missing blocked use ${use}`);
  }
});

test("held data spine prevents evidence assembly even when exports are present", () => {
  const plan = fullPlan();
  const dataSpine = readyDataSpine(plan);
  dataSpine.readiness_state = "INTAKE_REVIEW_READY";
  dataSpine.source_readiness.blueprint.state = "pending_approval";
  dataSpine.missing_evidence = ["BLUEPRINT_APPROVAL_REQUIRED"];
  dataSpine.feeds.measurement_cell_input = false;
  dataSpine.feeds.value_hypothesis_packet_runner = false;

  const run = buildRealDataIntakePacketRun({
    dataSpineReadiness: dataSpine,
    measurementPlan: plan,
    scrubbedGleanExports: fullExportPacket(plan),
    runId: "real_data_intake_packet_run_support_held",
    generatedAt: "2026-06-20T00:00:00.000Z"
  });
  const result = validateRealDataIntakePacketRun(run);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(run.decision, "HELD_FOR_DATA_SPINE");
  assert.equal(run.pilot_intake_run, null);
  assert.equal(run.feeds.measurement_cell_input, false);
  assert.ok(run.missing_evidence.includes("BLUEPRINT_APPROVAL_REQUIRED"));
});

test("plan and data spine source-binding drift fails closed", () => {
  const plan = fullPlan();
  const dataSpine = readyDataSpine(plan);
  dataSpine.org_id = "org_other";

  const run = buildRealDataIntakePacketRun({
    dataSpineReadiness: dataSpine,
    measurementPlan: plan,
    scrubbedGleanExports: fullExportPacket(plan),
    runId: "real_data_intake_packet_run_drift",
    generatedAt: "2026-06-20T00:00:00.000Z"
  });
  const result = validateRealDataIntakePacketRun(run);

  assert.equal(result.valid, false);
  assert.equal(result.feeds.measurement_cell_input, false);
  assert.ok(result.gaps.some((gap) => gap.includes("data_spine_readiness.org_id")));
});

test("data spine windows must align to Measurement Plan windows before assembly", () => {
  const plan = fullPlan();
  const wrongWindowPlan = JSON.parse(JSON.stringify(plan));
  wrongWindowPlan.windows.comparison_window_start = "2026-07-01";
  wrongWindowPlan.windows.comparison_window_end = "2026-07-31";
  const dataSpine = readyDataSpine(wrongWindowPlan);

  const run = buildRealDataIntakePacketRun({
    dataSpineReadiness: dataSpine,
    measurementPlan: plan,
    scrubbedGleanExports: fullExportPacket(plan),
    runId: "real_data_intake_packet_run_window_drift",
    generatedAt: "2026-06-20T00:00:00.000Z"
  });
  const result = validateRealDataIntakePacketRun(run);

  assert.equal(run.decision, "BLOCKED");
  assert.equal(result.valid, false);
  assert.equal(result.feeds.measurement_cell_input, false);
  assert.ok(result.gaps.some((gap) => gap.includes("comparison_window")));
});

test("validator recomputes nested Data Spine validation after tampering", () => {
  const plan = fullPlan();
  const run = buildRealDataIntakePacketRun({
    dataSpineReadiness: readyDataSpine(plan),
    measurementPlan: plan,
    scrubbedGleanExports: fullExportPacket(plan),
    runId: "real_data_intake_packet_run_tampered_spine",
    generatedAt: "2026-06-20T00:00:00.000Z"
  });
  run.data_spine_readiness.source_readiness.customer_metric.source_ref = null;

  const result = validateRealDataIntakePacketRun(run);

  assert.equal(result.valid, false);
  assert.equal(result.feeds.measurement_cell_input, false);
  assert.ok(result.gaps.some((gap) => gap.includes("Data Spine validation")));
});

test("held Data Spine packets cannot expose downstream feeds after tampering", () => {
  const plan = fullPlan();
  const dataSpine = readyDataSpine(plan);
  dataSpine.readiness_state = "INTAKE_REVIEW_READY";
  dataSpine.source_readiness.blueprint.state = "pending_approval";
  dataSpine.missing_evidence = ["BLUEPRINT_APPROVAL_REQUIRED"];
  dataSpine.feeds.measurement_cell_input = false;
  dataSpine.feeds.value_hypothesis_packet_runner = false;

  const run = buildRealDataIntakePacketRun({
    dataSpineReadiness: dataSpine,
    measurementPlan: plan,
    scrubbedGleanExports: fullExportPacket(plan),
    runId: "real_data_intake_packet_run_held_feed_tamper",
    generatedAt: "2026-06-20T00:00:00.000Z"
  });
  run.feeds.measurement_cell_input = true;

  const result = validateRealDataIntakePacketRun(run);

  assert.equal(result.valid, false);
  assert.equal(result.feeds.measurement_cell_input, false);
  assert.ok(result.gaps.some((gap) => gap.includes("feeds.measurement_cell_input")));
});

test("unsafe true privacy boundary flags fail closed even when the field is nested", () => {
  const plan = fullPlan();
  const run = buildRealDataIntakePacketRun({
    dataSpineReadiness: readyDataSpine(plan),
    measurementPlan: plan,
    scrubbedGleanExports: fullExportPacket(plan),
    runId: "real_data_intake_packet_run_true_privacy_flag",
    generatedAt: "2026-06-20T00:00:00.000Z"
  });
  run.pilot_intake_run.source_packages[0].privacy_boundary.contains_raw_content = true;

  const result = validateRealDataIntakePacketRun(run);

  assert.equal(result.valid, false);
  assert.equal(result.feeds.measurement_cell_input, false);
  assert.ok(result.gaps.some((gap) => gap.includes("contains_raw_content")));
});

test("invalid scrubbed exports fail before assembly or handoff", () => {
  const plan = fullPlan();
  const exports = fullExportPacket(plan);
  exports[0].raw_rows = [{ user_id: "u_123" }];

  const run = buildRealDataIntakePacketRun({
    dataSpineReadiness: readyDataSpine(plan),
    measurementPlan: plan,
    scrubbedGleanExports: exports,
    runId: "real_data_intake_packet_run_invalid_export",
    generatedAt: "2026-06-20T00:00:00.000Z"
  });
  const result = validateRealDataIntakePacketRun(run);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(run.decision, "HELD_FOR_EVIDENCE_INPUTS");
  assert.equal(run.feeds.evidence_snapshot_input, false);
  assert.equal(run.feeds.claim_readiness_handoff, false);
  assert.ok(run.gaps.some((gap) => gap.includes("raw_rows")));
});

test("ROI assumptions and confidence fields cannot substitute for Measurement Cell preparation", () => {
  const plan = fullPlan();
  const dataSpine = readyDataSpine(plan);
  dataSpine.readiness_state = "INTAKE_REVIEW_READY";
  dataSpine.source_readiness.customer_metric.state = "submitted";
  dataSpine.source_readiness.customer_metric.owner_approval_state = "submitted";
  dataSpine.source_readiness.customer_metric.review_state = "needs_review";
  dataSpine.missing_evidence = ["CUSTOMER_METRIC_REQUIRED"];
  dataSpine.feeds.measurement_cell_input = false;
  dataSpine.feeds.value_hypothesis_packet_runner = false;

  const run = buildRealDataIntakePacketRun({
    dataSpineReadiness: dataSpine,
    measurementPlan: plan,
    scrubbedGleanExports: fullExportPacket(plan),
    runId: "real_data_intake_packet_run_assumption_substitution",
    generatedAt: "2026-06-20T00:00:00.000Z"
  });
  run.roi_bot_assumptions = {
    assumption_source_ref: "roi_sheet_uploaded",
    owner_approval_state: "approved"
  };
  run.contribution_probability = 0.78;

  const result = validateRealDataIntakePacketRun(run);

  assert.equal(result.valid, false);
  assert.equal(result.feeds.measurement_cell_input, false);
  assert.ok(result.gaps.some((gap) => gap.includes("roi_bot_assumptions")));
  assert.ok(result.gaps.some((gap) => gap.includes("contribution_probability")));
});

test("runner rejects raw, person-level, route, persistence, confidence, and financial side doors", () => {
  const plan = fullPlan();
  const run = buildRealDataIntakePacketRun({
    dataSpineReadiness: readyDataSpine(plan),
    measurementPlan: plan,
    scrubbedGleanExports: fullExportPacket(plan),
    runId: "real_data_intake_packet_run_unsafe",
    generatedAt: "2026-06-20T00:00:00.000Z"
  });
  run.raw_rows = [{ user_id: "u_123" }];
  run.backend_route = "/api/real-data-intake";
  run.creates_backend_routes = true;
  run.creates_frontend_ui = true;
  run.persistence_table = "real_data_intake_runs";
  run.confidence_percentage = 82;
  run.financial_output = true;
  run.customer_facing_financial_output_allowed = true;

  const result = validateRealDataIntakePacketRun(run);

  assert.equal(result.valid, false);
  assert.equal(result.feeds.measurement_cell_input, false);
  assert.ok(result.gaps.some((gap) => gap.includes("raw_rows")));
  assert.ok(result.gaps.some((gap) => gap.includes("backend_route")));
  assert.ok(result.gaps.some((gap) => gap.includes("creates_backend_routes")));
  assert.ok(result.gaps.some((gap) => gap.includes("creates_frontend_ui")));
  assert.ok(result.gaps.some((gap) => gap.includes("persistence_table")));
  assert.ok(result.gaps.some((gap) => gap.includes("confidence_percentage")));
  assert.ok(result.gaps.some((gap) => gap.includes("financial_output")));
  assert.ok(result.gaps.some((gap) => gap.includes("customer_facing_financial_output_allowed")));
});
