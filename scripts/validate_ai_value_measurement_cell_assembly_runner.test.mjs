import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  AI_VALUE_MEASUREMENT_CELL_ASSEMBLY_RUN_SCHEMA_VERSION,
  buildBlueprintExtractionDraft,
  buildBlueprintOperatorSourceHandoff,
  buildDataSpineIntakeReadiness,
  buildMeasurementCellAssemblyRun,
  buildRealDataIntakePacketRun,
  buildSourcePackageReviewQueue,
  validateMeasurementCell,
  validateMeasurementCellAssemblyRun
} from "../shared/dist/aiValueEngine/index.js";

const CONTRACTS = "docs/contracts";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const clone = (value) => JSON.parse(JSON.stringify(value));

function fullPlan(overrides = {}) {
  return {
    ...readJson(`${CONTRACTS}/ai-value-measurement-plan/examples/full-playbook-ready-plan.json`),
    ...overrides
  };
}

function windowsFromPlan(plan) {
  return {
    baselineWindow: {
      window_start: plan.windows.baseline_window_start,
      window_end: plan.windows.baseline_window_end
    },
    comparisonWindow: {
      window_start: plan.windows.comparison_window_start,
      window_end: plan.windows.comparison_window_end
    }
  };
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
  const { baselineWindow, comparisonWindow } = windowsFromPlan(plan);
  return {
    state: "present",
    intake_mode: "structured_object",
    source_ref: "source_ref_default",
    org_id: plan.org_id,
    client_id: "client_example",
    workflow_family: plan.workflow_scope.workflow_family,
    function_area: plan.workflow_scope.function_area,
    cohort_key: "workflow_family:customer_support_case_resolution|eligible_cases:2300",
    baseline_window: baselineWindow,
    comparison_window: comparisonWindow,
    owner_role: "source_owner",
    owner_approval_state: "approved",
    review_state: "clear",
    aggregate_only: true,
    ...overrides
  };
}

function readyDataSpine(plan = fullPlan(), overrides = {}) {
  const { baselineWindow, comparisonWindow } = windowsFromPlan(plan);
  return buildDataSpineIntakeReadiness({
    orgId: plan.org_id,
    clientId: "client_example",
    workflowFamily: plan.workflow_scope.workflow_family,
    functionArea: plan.workflow_scope.function_area,
    cohortKey: "workflow_family:customer_support_case_resolution|eligible_cases:2300",
    baselineWindow,
    comparisonWindow,
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
    export_id: `assembly_scrubbed_export_${evidenceLayer}_2026_06`,
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
      window_start: plan.windows.comparison_window_start,
      window_end: plan.windows.comparison_window_end
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
    allowed_uses: ["evidence_collection_input"],
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
    notes: ["Aggregate metadata only."],
    caveats: ["Aggregate evidence input only."],
    ...overrides
  };
}

function fullExportPacket(plan = fullPlan()) {
  return [
    baseExport(plan, "layer_1_platform_telemetry", {
      source_owner_role: "customer_data_platform_owner",
      approver_role: "customer_data_platform_owner",
      source_tables: ["scrubbed_llm_call", "scrubbed_client_analytics"],
      table_families_checked: ["scrubbed_llm_call", "scrubbed_client_analytics"],
      signal_families: ["assistant", "agent_run"],
      covered_signal_families: ["assistant", "agent_run"],
      vbd_summary: {
        baseline_index: 0.42,
        comparison_index: 0.58,
        movement_direction: "improved",
        aggregate_only: true
      }
    }),
    baseExport(plan, "layer_2_user_voice_empirical", {
      metric_or_signal_summary: {
        summary_type: "aggregate_export_metadata_summary",
        aggregate_signal_name: "aggregate_ai_fluency_baseline_summary",
        aggregate_value_present: true
      }
    }),
    baseExport(plan, "layer_3_business_system_outcomes", {
      metric_or_signal_summary: {
        summary_type: "customer_owned_aggregate_metric_summary",
        aggregate_metric_name: "aggregate_support_median_resolution_hours",
        aggregate_value_present: true
      }
    }),
    baseExport(plan, "governance_evidence", {
      metric_or_signal_summary: {
        summary_type: "governance_control_export_summary",
        aggregate_signal_name: "aggregate_governance_control_summary",
        aggregate_value_present: true
      }
    }),
    baseExport(plan, "assumption_evidence", {
      metric_or_signal_summary: {
        summary_type: "assumption_approval_export_summary",
        aggregate_signal_name: "aggregate_assumption_approval_summary",
        aggregate_value_present: true
      }
    })
  ];
}

function realDataRun(plan, dataSpine = readyDataSpine(plan)) {
  return buildRealDataIntakePacketRun({
    dataSpineReadiness: dataSpine,
    measurementPlan: plan,
    scrubbedGleanExports: fullExportPacket(plan),
    runId: "real_data_intake_packet_run_for_measurement_cell_assembly",
    generatedAt: "2026-06-20T00:00:00.000Z"
  });
}

function sourcePackageExample(file, dataSpine, overrides = {}) {
  const pkg = readJson(`${CONTRACTS}/ai-value-source-packages/examples/${file}`);
  return {
    ...pkg,
    org_id: dataSpine.org_id,
    covered_window: dataSpine.comparison_window,
    source_owner_role: "source_owner",
    source_owner_attestation: {
      ...pkg.source_owner_attestation,
      attested_by_role: "source_owner"
    },
    ...overrides
  };
}

function matchingSourcePackages(dataSpine) {
  const sources = dataSpine.source_readiness;
  return [
    sourcePackageExample("layer-2-user-voice-package.json", dataSpine, {
      source_package_id: "source_package_layer_2_ai_fluency_assembly",
      source_refs: {
        source_readiness_id: "source_readiness_ai_fluency_assembly",
        aggregate_export_id: sources.ai_fluency.source_ref
      }
    }),
    sourcePackageExample("layer-1-bigquery-telemetry-package.json", dataSpine, {
      source_package_id: "source_package_layer_1_vbd_token_assembly",
      source_refs: {
        source_readiness_id: "source_readiness_vbd_token_assembly",
        aggregate_probe_id: sources.vbd_token.source_ref,
        reportability_signal_families: [
          "assistant",
          "search_document_retrieval",
          "agent_run"
        ]
      }
    }),
    sourcePackageExample("layer-3-system-of-record-outcome-package.json", dataSpine, {
      source_package_id: "source_package_layer_3_customer_metric_assembly",
      source_refs: {
        source_readiness_id: "source_readiness_customer_metric_assembly",
        aggregate_outcome_export_id: sources.customer_metric.source_ref
      }
    }),
    sourcePackageExample("assumption-approval-package.json", dataSpine, {
      source_package_id: "source_package_assumption_assembly",
      source_refs: {
        source_readiness_id: "source_readiness_assumption_assembly",
        assumption_approval_export_id: sources.assumption.source_ref
      }
    }),
    sourcePackageExample("governance-control-package.json", dataSpine, {
      source_package_id: "source_package_governance_assembly",
      source_refs: {
        source_readiness_id: "source_readiness_governance_assembly",
        governance_control_export_id: sources.governance.source_ref
      }
    })
  ];
}

function reviewedSourceQueue(dataSpine, overrides = {}) {
  const queue = buildSourcePackageReviewQueue({
    dataSpineReadiness: dataSpine,
    sourcePackages: matchingSourcePackages(dataSpine),
    generatedAt: "2026-06-20T00:00:00.000Z"
  });
  return { ...queue, ...overrides };
}

function measurementCellInput(plan = fullPlan(), dataSpine = readyDataSpine(plan), overrides = {}) {
  const sources = dataSpine.source_readiness;
  const { baselineWindow, comparisonWindow } = windowsFromPlan(plan);
  const expectationPathId = overrides.expectationPathId ?? "expectation_path_resolution_time_capacity";
  const base = {
    orgId: plan.org_id,
    functionArea: plan.workflow_scope.function_area,
    workflowFamily: plan.workflow_scope.workflow_family,
    workflowId: "workflow_support_case_resolution",
    cohortKey: dataSpine.cohort_key,
    timeWindow: {
      time_window_id: "day_30",
      window_label: "Day 30",
      window_start: comparisonWindow.window_start,
      window_end: comparisonWindow.window_end,
      baseline_window: baselineWindow,
      comparison_window: comparisonWindow,
      prior_window_ref: "measurement_cell_support_day_0"
    },
    blueprintAlignment: {
      expectation_path_id: expectationPathId,
      blueprint_expectation_ref: sources.blueprint.source_ref,
      blueprint_customer_approval_state: "approved",
      blueprint_customer_approver_role: "customer_value_owner",
      value_route: plan.value_hypothesis.value_route,
      value_promise: plan.value_hypothesis.hypothesis_statement,
      expected_metric_id: plan.metric_selection.primary_metric.metric_id,
      expected_metric_direction: "decrease",
      expected_metric_lag_days: 30,
      expected_metric_system_recommended: true,
      expected_metric_customer_selected: true,
      value_driver: "capacity",
      approved_expectation_path: {
        expectation_path_id: expectationPathId,
        expected_behavior: "knowledge_retrieval",
        expected_vbd_signal: "depth",
        expected_metric_id: plan.metric_selection.primary_metric.metric_id,
        expected_metric_direction: "decrease",
        expected_metric_lag_days: 30,
        expected_metric_system_recommended: true,
        expected_metric_customer_selected: true,
        value_driver: "capacity",
        metric_role: "primary",
        source_ref: sources.blueprint.source_ref,
        customer_approval_state: "approved",
        approver_role: "customer_value_owner"
      },
      owner_role: plan.value_hypothesis.owner_role,
      assumption_refs: ["support_assumption_approval_day_30"],
      source_ref: sources.blueprint.source_ref
    },
    aiFluencyContext: {
      evidence_state: "present",
      fluency_score: 72,
      dimension_scores: {
        confidence: 74,
        usage_quality: 70,
        behavior_change: 68,
        leadership_reinforcement: 71,
        capability_growth: 77
      },
      response_count: 126,
      source_ref: sources.ai_fluency.source_ref,
      suppression_state: "CLEAR"
    },
    vbdContext: {
      evidence_state: "present",
      velocity: 76,
      breadth: 69,
      depth: 71,
      integration_score: 70.2,
      overall_vbd_score: 71.8,
      prior_overall_vbd_score: 49.4,
      vbd_quadrant: "high_fluency_flow",
      source_ref: sources.vbd_token.source_ref,
      suppression_state: "CLEAR"
    },
    selectedMetric: {
      metric_id: plan.metric_selection.primary_metric.metric_id,
      metric_name: plan.metric_selection.primary_metric.metric_name,
      metric_source_system: "customer_support_system",
      metric_unit: "hours",
      metric_direction: "decrease",
      metric_sensitivity: "high",
      expected_lag_days: 30,
      normalization_denominator: "eligible_case_count",
      baseline_value: 18,
      comparison_value: 14,
      owner_approval_state: "approved",
      source_ref: sources.customer_metric.source_ref,
      suppression_state: "CLEAR"
    },
    tokenContext: {
      evidence_state: "present",
      token_total: 1880000,
      token_per_active_seat: 7833,
      token_intensity_band: "moderate",
      source_ref: sources.vbd_token.source_ref
    },
    confounders: [
      {
        confounder_type: "support_case_mix",
        state: "documented",
        source_ref: "support_case_mix_day_30"
      }
    ],
    evidenceDesign: {
      design_type: "matched_comparison",
      design_strength_tier: "comparison_supported",
      comparison_cell_ref: "measurement_cell_support_lower_exposure_day_30",
      controls_documented: true,
      baseline_stability: "stable",
      source_ref: "support_research_design_day_30"
    },
    financeReviewContext: {
      finance_owner_state: "finance_context_review",
      financial_driver: "capacity_creation",
      metric_to_financial_driver_pathway:
        "Resolution time is reviewed as capacity context, not financial attribution.",
      source_ref: "finance_context_support_day_30"
    },
    governance: {
      review_state: "FINANCE_CONTEXT_INVESTIGATION_READY"
    }
  };
  const { expectationPathId: _expectationPathId, ...restOverrides } = overrides;
  return { ...base, ...restOverrides };
}

function blueprintOperatorSourceHandoff(plan = fullPlan(), dataSpine = readyDataSpine(plan), overrides = {}) {
  const expectationPathId = overrides.expectationPathId ?? "expectation_path_resolution_time_capacity";
  const draft = buildBlueprintExtractionDraft({
    draftId: dataSpine.source_readiness.blueprint.source_ref,
    orgId: plan.org_id,
    clientId: dataSpine.client_id,
    documentSourceRef: "blueprint_upload_support_approved",
    extractionState: "parsed",
    approvalState: "approved",
    ownerRole: "customer_value_owner",
    approverRole: "customer_value_owner",
    workflowFamily: plan.workflow_scope.workflow_family,
    workflowName: "Support case resolution",
    functionArea: plan.workflow_scope.function_area,
    cohortKey: dataSpine.cohort_key,
    valueHypothesis: plan.value_hypothesis.hypothesis_statement,
    valueRoute: "CAPACITY_CREATION",
    baselineWindow: dataSpine.baseline_window,
    comparisonWindow: dataSpine.comparison_window,
    metricCandidates: [
      {
        metric_id: plan.metric_selection.primary_metric.metric_id,
        metric_name: plan.metric_selection.primary_metric.metric_name,
        expected_direction: "decrease",
        expected_lag_days: 30,
        system_recommended: true,
        customer_selected: true,
        value_driver: "capacity"
      }
    ],
    approvedExpectationPaths: [
      {
        expectation_path_id: expectationPathId,
        expected_behavior: "knowledge_retrieval",
        expected_vbd_signal: "depth",
        expected_metric_id: plan.metric_selection.primary_metric.metric_id,
        expected_metric_name: plan.metric_selection.primary_metric.metric_name,
        expected_metric_direction: "decrease",
        expected_metric_lag_days: 30,
        expected_metric_system_recommended: true,
        expected_metric_customer_selected: true,
        value_driver: "capacity",
        metric_role: "primary"
      }
    ],
    assumptions: [
      "case_mix_stability",
      "volume_context",
      "staffing_and_coverage_context",
      "channel_mix_context",
      "process_or_policy_context",
      "knowledge_base_context",
      "metric_definition_stability",
      "ai_rollout_context"
    ].map((assumption_id) => ({
      assumption_id,
      owner: "customer_value_owner",
      state: "submitted"
    })),
    sourceRefs: {
      document_source_ref: "blueprint_upload_support_approved",
      extraction_run_ref: "blueprint_extraction_support_approved"
    },
    generatedAt: "2026-06-20T00:00:00.000Z"
  });
  return buildBlueprintOperatorSourceHandoff({
    draft,
    generatedAt: "2026-06-20T00:00:00.000Z"
  });
}

test("aligned Data Spine and real-data intake output assemble a validated Measurement Cell", () => {
  const plan = fullPlan();
  const dataSpine = readyDataSpine(plan);
  const blueprintHandoff = blueprintOperatorSourceHandoff(plan, dataSpine);
  const run = buildMeasurementCellAssemblyRun({
    dataSpineReadiness: dataSpine,
    measurementPlan: plan,
    sourcePackageReviewQueue: reviewedSourceQueue(dataSpine),
    blueprintOperatorSourceHandoff: blueprintHandoff,
    realDataIntakePacketRun: realDataRun(plan, dataSpine),
    measurementCellInput: measurementCellInput(plan, dataSpine),
    runId: "measurement_cell_assembly_support_day_30",
    generatedAt: "2026-06-20T00:00:00.000Z"
  });
  const result = validateMeasurementCellAssemblyRun(run);
  const cellResult = validateMeasurementCell(run.measurement_cell);

  assert.equal(run.schema_version, AI_VALUE_MEASUREMENT_CELL_ASSEMBLY_RUN_SCHEMA_VERSION);
  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(cellResult.valid, true, cellResult.gaps.join("; "));
  assert.equal(run.decision, "READY_FOR_VALUE_HYPOTHESIS_PACKET_RUNNER");
  assert.equal(run.feeds.measurement_cell, true);
  assert.equal(run.feeds.value_hypothesis_packet_runner, true);
  assert.equal(run.feeds.finance_context_investigation_planning, true);
  assert.equal(run.feeds.customer_facing_financial_output, false);
  assert.equal(
    run.measurement_cell.blueprint_alignment.expectation_path_id,
    "expectation_path_resolution_time_capacity"
  );
});

test("ready Data Spine cannot assemble Measurement Cell without reviewed source package queue", () => {
  const plan = fullPlan();
  const dataSpine = readyDataSpine(plan);
  const blueprintHandoff = blueprintOperatorSourceHandoff(plan, dataSpine);

  const run = buildMeasurementCellAssemblyRun({
    dataSpineReadiness: dataSpine,
    measurementPlan: plan,
    blueprintOperatorSourceHandoff: blueprintHandoff,
    realDataIntakePacketRun: realDataRun(plan, dataSpine),
    measurementCellInput: measurementCellInput(plan, dataSpine),
    runId: "measurement_cell_assembly_support_missing_source_review",
    generatedAt: "2026-06-20T00:00:00.000Z"
  });
  const result = validateMeasurementCellAssemblyRun(run);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(run.decision, "HELD_FOR_SOURCE_PACKAGE_REVIEW");
  assert.equal(run.measurement_cell, null);
  assert.ok(run.missing_evidence.includes("SOURCE_PACKAGE_REVIEW_QUEUE_REQUIRED"));
  assert.equal(run.feeds.measurement_cell, false);
  assert.equal(run.feeds.value_hypothesis_packet_runner, false);
  assert.equal(run.feeds.finance_context_investigation_planning, false);
});

test("held source package review queue blocks Measurement Cell assembly", () => {
  const plan = fullPlan();
  const dataSpine = readyDataSpine(plan);
  const blueprintHandoff = blueprintOperatorSourceHandoff(plan, dataSpine);
  const queue = reviewedSourceQueue(dataSpine);
  queue.queue_state = "HELD_FOR_SOURCE_REVIEW";
  queue.lanes.find((lane) => lane.lane_key === "vbd_token").source_state = "suppressed";
  queue.lanes.find((lane) => lane.lane_key === "vbd_token").review_state = "suppressed";
  queue.lanes.find((lane) => lane.lane_key === "vbd_token").data_spine_review_clear = false;
  queue.lanes.find((lane) => lane.lane_key === "vbd_token").gaps = [
    "VBD_TOKEN_AGGREGATE_REQUIRED"
  ];
  queue.missing_evidence = ["VBD_TOKEN_AGGREGATE_REQUIRED"];

  const run = buildMeasurementCellAssemblyRun({
    dataSpineReadiness: dataSpine,
    measurementPlan: plan,
    sourcePackageReviewQueue: queue,
    blueprintOperatorSourceHandoff: blueprintHandoff,
    realDataIntakePacketRun: realDataRun(plan, dataSpine),
    measurementCellInput: measurementCellInput(plan, dataSpine),
    runId: "measurement_cell_assembly_support_held_source_review",
    generatedAt: "2026-06-20T00:00:00.000Z"
  });
  const result = validateMeasurementCellAssemblyRun(run);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(run.decision, "HELD_FOR_SOURCE_PACKAGE_REVIEW");
  assert.equal(run.measurement_cell, null);
  assert.ok(run.missing_evidence.includes("VBD_TOKEN_AGGREGATE_REQUIRED"));
  assert.equal(run.feeds.measurement_cell, false);
  assert.equal(run.feeds.value_hypothesis_packet_runner, false);
});

test("misaligned source package review queue fails closed before Measurement Cell assembly", () => {
  const plan = fullPlan();
  const dataSpine = readyDataSpine(plan);
  const blueprintHandoff = blueprintOperatorSourceHandoff(plan, dataSpine);
  const queue = reviewedSourceQueue(dataSpine, {
    org_id: "org_other",
    data_spine_readiness_id: "data_spine_other"
  });

  const run = buildMeasurementCellAssemblyRun({
    dataSpineReadiness: dataSpine,
    measurementPlan: plan,
    sourcePackageReviewQueue: queue,
    blueprintOperatorSourceHandoff: blueprintHandoff,
    realDataIntakePacketRun: realDataRun(plan, dataSpine),
    measurementCellInput: measurementCellInput(plan, dataSpine),
    runId: "measurement_cell_assembly_support_misaligned_source_review",
    generatedAt: "2026-06-20T00:00:00.000Z"
  });
  const result = validateMeasurementCellAssemblyRun(run);

  assert.equal(result.valid, false);
  assert.equal(run.decision, "BLOCKED");
  assert.equal(run.measurement_cell, null);
  assert.equal(result.feeds.measurement_cell, false);
  assert.equal(result.feeds.value_hypothesis_packet_runner, false);
  assert.ok(result.gaps.some((gap) => gap.includes("source_package_review_queue.org_id")));
  assert.ok(result.gaps.some((gap) => gap.includes("source_package_review_queue.data_spine_readiness_id")));
});

test("held Data Spine blocks Measurement Cell assembly even when cell input is present", () => {
  const plan = fullPlan();
  const dataSpine = readyDataSpine(plan);
  dataSpine.readiness_state = "INTAKE_REVIEW_READY";
  dataSpine.source_readiness.blueprint.state = "pending_approval";
  dataSpine.source_readiness.blueprint.owner_approval_state = "submitted";
  dataSpine.missing_evidence = ["BLUEPRINT_APPROVAL_REQUIRED"];
  dataSpine.feeds.measurement_cell_input = false;
  dataSpine.feeds.value_hypothesis_packet_runner = false;

  const run = buildMeasurementCellAssemblyRun({
    dataSpineReadiness: dataSpine,
    measurementPlan: plan,
    measurementCellInput: measurementCellInput(plan, dataSpine),
    runId: "measurement_cell_assembly_support_held",
    generatedAt: "2026-06-20T00:00:00.000Z"
  });
  const result = validateMeasurementCellAssemblyRun(run);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(run.decision, "HELD_FOR_DATA_SPINE");
  assert.equal(run.measurement_cell, null);
  assert.equal(run.feeds.measurement_cell, false);
  assert.equal(run.feeds.value_hypothesis_packet_runner, false);
  assert.ok(run.missing_evidence.includes("BLUEPRINT_APPROVAL_REQUIRED"));
});

test("suppressed source lane blocks Measurement Cell assembly without downstream feeds", () => {
  const plan = fullPlan();
  const dataSpine = readyDataSpine(plan);
  dataSpine.readiness_state = "INTAKE_REVIEW_READY";
  dataSpine.source_readiness.vbd_token.state = "suppressed";
  dataSpine.source_readiness.vbd_token.review_state = "suppressed";
  dataSpine.missing_evidence = ["VBD_TOKEN_AGGREGATE_REQUIRED"];
  dataSpine.feeds.measurement_cell_input = false;
  dataSpine.feeds.value_hypothesis_packet_runner = false;

  const run = buildMeasurementCellAssemblyRun({
    dataSpineReadiness: dataSpine,
    measurementPlan: plan,
    measurementCellInput: measurementCellInput(plan, dataSpine),
    runId: "measurement_cell_assembly_support_suppressed",
    generatedAt: "2026-06-20T00:00:00.000Z"
  });
  const result = validateMeasurementCellAssemblyRun(run);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(run.decision, "HELD_FOR_DATA_SPINE");
  assert.equal(run.measurement_cell, null);
  assert.equal(run.feeds.measurement_cell, false);
  assert.equal(run.feeds.value_hypothesis_packet_runner, false);
  assert.ok(run.missing_evidence.includes("VBD_TOKEN_AGGREGATE_REQUIRED"));
});

test("rolling 30-day Data Spine assembles operating context without finance planning feeds", () => {
  const plan = clone(fullPlan());
  plan.windows.baseline_window_start = "2026-08-02";
  plan.windows.baseline_window_end = "2026-08-31";
  plan.windows.comparison_window_start = "2026-09-01";
  plan.windows.comparison_window_end = "2026-09-30";
  const dataSpine = readyDataSpine(plan);
  const blueprintHandoff = blueprintOperatorSourceHandoff(plan, dataSpine);
  const input = measurementCellInput(plan, dataSpine, {
    timeWindow: {
      time_window_id: "rolling_30d_2026_09_30",
      window_label: "Rolling 30 days ending 2026-09-30",
      window_mode: "rolling_30_day",
      anchor_date: "2026-09-30",
      days_since_launch: 121,
      cadence: "rolling_30_day",
      window_start: "2026-09-01",
      window_end: "2026-09-30",
      baseline_window: {
        window_start: "2026-08-02",
        window_end: "2026-08-31"
      },
      comparison_window: {
        window_start: "2026-09-01",
        window_end: "2026-09-30"
      },
      prior_window_ref: "measurement_cell_support_rolling_30d_2026_08_31"
    }
  });

  const run = buildMeasurementCellAssemblyRun({
    dataSpineReadiness: dataSpine,
    measurementPlan: plan,
    sourcePackageReviewQueue: reviewedSourceQueue(dataSpine),
    blueprintOperatorSourceHandoff: blueprintHandoff,
    realDataIntakePacketRun: realDataRun(plan, dataSpine),
    measurementCellInput: input,
    runId: "measurement_cell_assembly_support_rolling",
    generatedAt: "2026-06-20T00:00:00.000Z"
  });
  const result = validateMeasurementCellAssemblyRun(run);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(run.decision, "READY_FOR_VALUE_HYPOTHESIS_PACKET_RUNNER");
  assert.equal(run.feeds.value_hypothesis_packet_runner, true);
  assert.equal(run.feeds.finance_context_investigation_planning, false);
  assert.equal(run.feeds.bayesian_research_design_planning, false);
});

test("source-ref and window drift fail before packet-runner feed", () => {
  const plan = fullPlan();
  const dataSpine = readyDataSpine(plan);
  const input = measurementCellInput(plan, dataSpine);
  input.vbdContext.source_ref = "wrong_vbd_source_ref";
  input.timeWindow.comparison_window.window_end = "2026-07-31";

  const run = buildMeasurementCellAssemblyRun({
    dataSpineReadiness: dataSpine,
    measurementPlan: plan,
    sourcePackageReviewQueue: reviewedSourceQueue(dataSpine),
    realDataIntakePacketRun: realDataRun(plan, dataSpine),
    measurementCellInput: input,
    runId: "measurement_cell_assembly_support_drift",
    generatedAt: "2026-06-20T00:00:00.000Z"
  });
  const result = validateMeasurementCellAssemblyRun(run);

  assert.equal(result.valid, false);
  assert.equal(result.feeds.measurement_cell, false);
  assert.equal(result.feeds.value_hypothesis_packet_runner, false);
  assert.ok(result.gaps.some((gap) => gap.includes("vbdContext.source_ref")));
  assert.ok(result.gaps.some((gap) => gap.includes("comparison_window")));
});

test("selected Blueprint expectation path spoofing blocks Measurement Cell assembly before packet readiness", () => {
  const plan = fullPlan();
  const dataSpine = readyDataSpine(plan);
  const blueprintHandoff = blueprintOperatorSourceHandoff(plan, dataSpine);
  const input = measurementCellInput(plan, dataSpine, {
    expectationPathId: "expectation_path_resolution_time_spoofed"
  });

  const run = buildMeasurementCellAssemblyRun({
    dataSpineReadiness: dataSpine,
    measurementPlan: plan,
    sourcePackageReviewQueue: reviewedSourceQueue(dataSpine),
    blueprintOperatorSourceHandoff: blueprintHandoff,
    realDataIntakePacketRun: realDataRun(plan, dataSpine),
    measurementCellInput: input,
    runId: "measurement_cell_assembly_support_spoofed_expectation_path",
    generatedAt: "2026-06-20T00:00:00.000Z"
  });
  const result = validateMeasurementCellAssemblyRun(run);

  assert.equal(run.decision, "BLOCKED");
  assert.equal(result.valid, false);
  assert.equal(run.measurement_cell, null);
  assert.ok(result.gaps.some((gap) => /expectation_path_id/i.test(gap)));
  assert.equal(result.feeds.measurement_cell, false);
  assert.equal(result.feeds.value_hypothesis_packet_runner, false);
});

test("selected Blueprint expectation path requires Blueprint operator handoff proof", () => {
  const plan = fullPlan();
  const dataSpine = readyDataSpine(plan);
  const run = buildMeasurementCellAssemblyRun({
    dataSpineReadiness: dataSpine,
    measurementPlan: plan,
    sourcePackageReviewQueue: reviewedSourceQueue(dataSpine),
    realDataIntakePacketRun: realDataRun(plan, dataSpine),
    measurementCellInput: measurementCellInput(plan, dataSpine),
    runId: "measurement_cell_assembly_support_missing_blueprint_handoff",
    generatedAt: "2026-06-20T00:00:00.000Z"
  });
  const result = validateMeasurementCellAssemblyRun(run);

  assert.equal(run.decision, "BLOCKED");
  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) => /blueprint_operator_source_handoff is required/i.test(gap)));
  assert.equal(result.feeds.measurement_cell, false);
  assert.equal(result.feeds.value_hypothesis_packet_runner, false);
});

test("valid Blueprint handoff from another identity or window cannot bind Measurement Cell assembly", () => {
  const plan = fullPlan();
  const dataSpine = readyDataSpine(plan);
  const otherPlan = fullPlan({
    org_id: "org_other",
    windows: {
      ...plan.windows,
      baseline_window_start: "2025-10-01",
      baseline_window_end: "2025-10-31"
    }
  });
  const otherDataSpine = readyDataSpine(otherPlan);
  const wrongHandoff = blueprintOperatorSourceHandoff(otherPlan, otherDataSpine);

  const run = buildMeasurementCellAssemblyRun({
    dataSpineReadiness: dataSpine,
    measurementPlan: plan,
    sourcePackageReviewQueue: reviewedSourceQueue(dataSpine),
    blueprintOperatorSourceHandoff: wrongHandoff,
    realDataIntakePacketRun: realDataRun(plan, dataSpine),
    measurementCellInput: measurementCellInput(plan, dataSpine),
    runId: "measurement_cell_assembly_support_wrong_blueprint_handoff",
    generatedAt: "2026-06-20T00:00:00.000Z"
  });
  const result = validateMeasurementCellAssemblyRun(run);

  assert.equal(wrongHandoff.decision, "READY_FOR_OPERATOR_INTAKE");
  assert.equal(run.decision, "BLOCKED");
  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) => /blueprint_operator_source_handoff.*org_id/i.test(gap)));
  assert.ok(result.gaps.some((gap) => /blueprint_operator_source_handoff.*baseline_window/i.test(gap)));
  assert.equal(result.feeds.measurement_cell, false);
  assert.equal(result.feeds.value_hypothesis_packet_runner, false);
});

test("tampered emitted Measurement Cell Blueprint path cannot refresh validation and pass assembly", () => {
  const plan = fullPlan();
  const dataSpine = readyDataSpine(plan);
  const blueprintHandoff = blueprintOperatorSourceHandoff(plan, dataSpine);
  const run = buildMeasurementCellAssemblyRun({
    dataSpineReadiness: dataSpine,
    measurementPlan: plan,
    sourcePackageReviewQueue: reviewedSourceQueue(dataSpine),
    blueprintOperatorSourceHandoff: blueprintHandoff,
    realDataIntakePacketRun: realDataRun(plan, dataSpine),
    measurementCellInput: measurementCellInput(plan, dataSpine),
    runId: "measurement_cell_assembly_support_tampered_cell_path",
    generatedAt: "2026-06-20T00:00:00.000Z"
  });
  const tampered = clone(run);
  tampered.measurement_cell.blueprint_alignment.expectation_path_id =
    "expectation_path_resolution_time_spoofed";
  tampered.measurement_cell.blueprint_alignment.approved_expectation_path.expectation_path_id =
    "expectation_path_resolution_time_spoofed";
  tampered.measurement_cell_validation_result = validateMeasurementCell(tampered.measurement_cell);

  const result = validateMeasurementCellAssemblyRun(tampered);

  assert.equal(tampered.measurement_cell_validation_result.valid, true);
  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) => /measurement_cell\.blueprint_alignment\.expectation_path_id/i.test(gap)));
  assert.equal(result.feeds.measurement_cell, false);
  assert.equal(result.feeds.value_hypothesis_packet_runner, false);
});

test("ROI, probability, person-level, route, persistence, and UI side doors fail closed", () => {
  const plan = fullPlan();
  const dataSpine = readyDataSpine(plan);
  const input = measurementCellInput(plan, dataSpine);
  input.confidence_percentage = 88;
  input.roi_bot_assumptions = { approved: true };
  input.raw_rows = [{ user_id: "u_123" }];
  input.creates_backend_routes = true;
  input.creates_frontend_ui = true;
  input.persistence_table = "measurement_cell_assembly_runs";

  const run = buildMeasurementCellAssemblyRun({
    dataSpineReadiness: dataSpine,
    measurementPlan: plan,
    sourcePackageReviewQueue: reviewedSourceQueue(dataSpine),
    realDataIntakePacketRun: realDataRun(plan, dataSpine),
    measurementCellInput: input,
    runId: "measurement_cell_assembly_support_unsafe",
    generatedAt: "2026-06-20T00:00:00.000Z"
  });
  const result = validateMeasurementCellAssemblyRun(run);

  assert.equal(result.valid, false);
  assert.equal(result.feeds.measurement_cell, false);
  assert.equal(result.feeds.value_hypothesis_packet_runner, false);
  assert.ok(result.gaps.some((gap) => gap.includes("confidence_percentage")));
  assert.ok(result.gaps.some((gap) => gap.includes("roi_bot_assumptions")));
  assert.ok(result.gaps.some((gap) => gap.includes("raw_rows")));
  assert.ok(result.gaps.some((gap) => gap.includes("creates_backend_routes")));
  assert.ok(result.gaps.some((gap) => gap.includes("creates_frontend_ui")));
  assert.ok(result.gaps.some((gap) => gap.includes("persistence_table")));
});

test("Measurement Plan metric and window drift block assembly even when Data Spine is ready", () => {
  const plan = fullPlan();
  const driftedPlan = clone(plan);
  driftedPlan.metric_selection.primary_metric.metric_id = "marketing_pipeline_created";
  driftedPlan.windows.comparison_window_end = "2026-07-31";
  const dataSpine = readyDataSpine(plan);

  const run = buildMeasurementCellAssemblyRun({
    dataSpineReadiness: dataSpine,
    measurementPlan: driftedPlan,
    sourcePackageReviewQueue: reviewedSourceQueue(dataSpine),
    measurementCellInput: measurementCellInput(plan, dataSpine),
    runId: "measurement_cell_assembly_support_plan_drift",
    generatedAt: "2026-06-20T00:00:00.000Z"
  });
  const result = validateMeasurementCellAssemblyRun(run);

  assert.equal(result.valid, false);
  assert.equal(run.decision, "BLOCKED");
  assert.equal(run.measurement_cell, null);
  assert.equal(result.feeds.measurement_cell, false);
  assert.equal(result.feeds.value_hypothesis_packet_runner, false);
  assert.ok(result.gaps.some((gap) => gap.includes("selectedMetric.metric_id")));
  assert.ok(result.gaps.some((gap) => gap.includes("Measurement Plan comparison window")));
});

test("real-data intake drift across function, cohort, windows, metric, and source refs blocks assembly", () => {
  const plan = fullPlan();
  const dataSpine = readyDataSpine(plan);
  const driftedPlan = clone(plan);
  driftedPlan.measurement_plan_id = "measurement_plan_marketing_drift";
  driftedPlan.workflow_scope.function_area = "marketing";
  driftedPlan.metric_selection.primary_metric.metric_id = "marketing_pipeline_created";
  const driftedDataSpine = readyDataSpine(driftedPlan, {
    cohortKey: "workflow_family:marketing_campaign_planning|eligible_campaigns:120"
  });
  driftedDataSpine.source_readiness.vbd_token.source_ref = "scrubbed_glean_vbd_token_marketing_day_30";
  driftedDataSpine.source_readiness.customer_metric.metric_id = "marketing_pipeline_created";
  const driftedRealDataRun = realDataRun(driftedPlan, driftedDataSpine);

  const run = buildMeasurementCellAssemblyRun({
    dataSpineReadiness: dataSpine,
    measurementPlan: plan,
    sourcePackageReviewQueue: reviewedSourceQueue(dataSpine),
    realDataIntakePacketRun: driftedRealDataRun,
    measurementCellInput: measurementCellInput(plan, dataSpine),
    runId: "measurement_cell_assembly_support_real_data_drift",
    generatedAt: "2026-06-20T00:00:00.000Z"
  });
  const result = validateMeasurementCellAssemblyRun(run);

  assert.equal(result.valid, false);
  assert.equal(run.decision, "BLOCKED");
  assert.equal(run.measurement_cell, null);
  assert.equal(result.feeds.measurement_cell, false);
  assert.ok(result.gaps.some((gap) => gap.includes("measurement_plan_id")));
  assert.ok(result.gaps.some((gap) => gap.includes("function_area")));
  assert.ok(result.gaps.some((gap) => gap.includes("cohort_key")));
  assert.ok(result.gaps.some((gap) => gap.includes("customer_metric.metric_id")));
  assert.ok(result.gaps.some((gap) => gap.includes("vbd_token.source_ref")));
});

test("stale embedded validation feed objects cannot validate after tampering", () => {
  const plan = fullPlan();
  const dataSpine = readyDataSpine(plan);
  const blueprintHandoff = blueprintOperatorSourceHandoff(plan, dataSpine);
  const run = buildMeasurementCellAssemblyRun({
    dataSpineReadiness: dataSpine,
    measurementPlan: plan,
    sourcePackageReviewQueue: reviewedSourceQueue(dataSpine),
    blueprintOperatorSourceHandoff: blueprintHandoff,
    realDataIntakePacketRun: realDataRun(plan, dataSpine),
    measurementCellInput: measurementCellInput(plan, dataSpine),
    runId: "measurement_cell_assembly_support_stale_validation",
    generatedAt: "2026-06-20T00:00:00.000Z"
  });
  run.measurement_plan_validation_result.gaps = ["forged validation gap"];
  run.data_spine_validation_result.feeds.measurement_cell_input = false;
  run.real_data_intake_validation_result.feeds.measurement_cell_input = false;
  run.measurement_cell_validation_result.feeds.finance_context_investigation_planning = false;

  const result = validateMeasurementCellAssemblyRun(run);

  assert.equal(result.valid, false);
  assert.equal(result.feeds.measurement_cell, false);
  assert.ok(result.gaps.some((gap) => gap.includes("measurement_plan_validation_result")));
  assert.ok(result.gaps.some((gap) => gap.includes("data_spine_validation_result")));
  assert.ok(result.gaps.some((gap) => gap.includes("real_data_intake_validation_result")));
  assert.ok(result.gaps.some((gap) => gap.includes("measurement_cell_validation_result")));
});
