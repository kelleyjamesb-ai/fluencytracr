import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  AI_VALUE_OPERATOR_INTAKE_ADAPTER_RUN_SCHEMA_VERSION,
  buildAIFluencyAggregateExportParseRun,
  buildAIFluencyDashboardImportRun,
  buildAIFluencyOperatorSourceHandoff,
  buildBlueprintExtractionDraft,
  buildBlueprintOperatorSourceHandoff,
  buildAssumptionGovernanceOperatorSourceHandoff,
  buildCustomerMetricIntake,
  buildCustomerMetricOperatorSourceHandoff,
  buildOperatorIntakeAdapterRun,
  buildVbdTokenAggregateIntake,
  buildVbdTokenOperatorSourceHandoff,
  validateAIFluencyAggregateExportParseRun,
  validateAIFluencyDashboardImportRun,
  validateAIFluencyOperatorSourceHandoff,
  validateAssumptionGovernanceOperatorSourceHandoff,
  validateBlueprintOperatorSourceHandoff,
  validateCustomerMetricIntake,
  validateCustomerMetricOperatorSourceHandoff,
  validateMeasurementCellAssemblyRun,
  validateOperatorIntakeAdapterRun,
  validateVbdTokenAggregateIntake,
  validateVbdTokenOperatorSourceHandoff
} from "../shared/dist/aiValueEngine/index.js";

const CONTRACTS = "docs/contracts";
const SOURCE_PACKAGE_EXAMPLES = "docs/contracts/ai-value-source-packages/examples";
const AI_FLUENCY_CSV_HEADERS = [
  "client_id",
  "org_id",
  "instrument_id",
  "instrument_version",
  "collection_mode",
  "dashboard_export_id",
  "baseline_window_start",
  "baseline_window_end",
  "comparison_window_start",
  "comparison_window_end",
  "function_area",
  "workflow_family",
  "cohort_key",
  "eligible_population_count",
  "response_count",
  "response_rate",
  "suppression_state",
  "k_min_posture",
  "overall_ai_fluency_score",
  "confidence_score",
  "usage_quality_score",
  "behavior_change_score",
  "leadership_reinforcement_score",
  "capability_growth_score",
  "baseline_overall_ai_fluency_score",
  "comparison_overall_ai_fluency_score",
  "movement_delta",
  "movement_direction",
  "source_ref",
  "source_owner_role",
  "owner_approval_state",
  "review_state",
  "caveats"
];

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

function csvValue(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function aiFluencyAggregateRecord(plan, overrides = {}) {
  const { baselineWindow, comparisonWindow } = windowsFromPlan(plan);
  return {
    client_id: "client_example",
    org_id: plan.org_id,
    instrument_id: "ai-fluency-instrument-24",
    instrument_version: "2.3",
    collection_mode: "aggregated_dashboard_export",
    dashboard_export_id: "ai_fluency_operator_dashboard_export_day_30",
    baseline_window_start: baselineWindow.window_start,
    baseline_window_end: baselineWindow.window_end,
    comparison_window_start: comparisonWindow.window_start,
    comparison_window_end: comparisonWindow.window_end,
    function_area: plan.workflow_scope.function_area,
    workflow_family: plan.workflow_scope.workflow_family,
    cohort_key: "workflow_family:customer_support_case_resolution|eligible_cases:2300",
    eligible_population_count: 2300,
    response_count: 126,
    response_rate: 0.55,
    suppression_state: "none",
    k_min_posture: "k_min_20_function_level",
    overall_ai_fluency_score: 72,
    confidence_score: 74,
    usage_quality_score: 70,
    behavior_change_score: 68,
    leadership_reinforcement_score: 71,
    capability_growth_score: 77,
    baseline_overall_ai_fluency_score: 59,
    comparison_overall_ai_fluency_score: 72,
    movement_delta: 13,
    movement_direction: "improved",
    source_ref: "ai_fluency_support_day_30_parser_run",
    source_owner_role: "source_owner",
    owner_approval_state: "approved",
    review_state: "approved_for_import",
    caveats:
      "Already-exported aggregate AI Fluency readiness row. Movement is descriptive readiness context only.",
    ...overrides
  };
}

function vbdTokenAggregateIntake(plan, overrides = {}) {
  const { baselineWindow, comparisonWindow } = windowsFromPlan(plan);
  return buildVbdTokenAggregateIntake({
    intakeId: "vbd_token_aggregate_intake_support_day_30",
    orgId: plan.org_id,
    clientId: "client_example",
    sourceRef: "scrubbed_glean_vbd_token_support_day_30",
    sourceOwnerRole: "source_owner",
    ownerApprovalState: "approved",
    reviewState: "clear",
    workflowFamily: plan.workflow_scope.workflow_family,
    workflowId: "workflow_support_case_resolution",
    functionArea: plan.workflow_scope.function_area,
    cohortKey: "workflow_family:customer_support_case_resolution|eligible_cases:2300",
    baselineWindow,
    comparisonWindow,
    vbd: {
      velocity: 76,
      breadth: 69,
      depth: 71,
      threshold: 60
    },
    tokenSummary: {
      total_tokens: 1880000,
      aggregate_interaction_count: 920,
      aggregate_workflow_count: 340,
      high_intensity_workflow_share: 0.22,
      average_tokens_per_interaction: 2043,
      average_tokens_per_workflow: 5529,
      token_per_active_seat: 7833,
      token_intensity_band: "moderate"
    },
    kMinPosture: {
      minimum_cohort_threshold: 5,
      cohort_threshold_met: true,
      total_slices: 8,
      k_min_clear_slices: 8,
      suppressed_or_unknown_slices: 0
    },
    sourceOwnerAttestation: {
      attestation_state: "attested",
      attested_by_role: "source_owner",
      attested_at: "2026-06-21T00:00:00.000Z"
    },
    generatedAt: "2026-06-21T00:00:00.000Z",
    ...overrides
  });
}

function customerMetricIntake(plan, overrides = {}) {
  const { baselineWindow, comparisonWindow } = windowsFromPlan(plan);
  return buildCustomerMetricIntake({
    measurementPlan: plan,
    orgId: plan.org_id,
    clientId: "client_example",
    workflowFamily: plan.workflow_scope.workflow_family,
    functionArea: plan.workflow_scope.function_area,
    cohortKey: "workflow_family:customer_support_case_resolution|eligible_cases:2300",
    intakeMode: "customer_metric_aggregate_export",
    metric: {
      metric_id: plan.metric_selection.primary_metric.metric_id,
      metric_name: plan.metric_selection.primary_metric.metric_name,
      metric_category: plan.metric_selection.primary_metric.metric_category,
      metric_unit: "hours",
      metric_direction: "decrease",
      metric_sensitivity: "high",
      source_system_type: plan.metric_selection.primary_metric.source_system_type,
      source_system_name: "customer_support_system",
      normalization_denominator: "eligible_case_count"
    },
    baselineWindow,
    comparisonWindow,
    baselineValue: 18,
    comparisonValue: 14,
    sourceRef: "support_metric_resolution_hours_day_30",
    sourceOwnerRole: "customer_data_owner",
    metricOwnerRole: plan.metric_selection.primary_metric.metric_owner_role,
    ownerApprovalState: "approved",
    reviewState: "clear",
    freshnessState: "current",
    aggregateOnly: true,
    generatedAt: "2026-06-22T00:00:00.000Z",
    ...overrides
  });
}

function blueprintExtractionInput(plan, overrides = {}) {
  const { baselineWindow, comparisonWindow } = windowsFromPlan(plan);
  return {
    draftId: "blueprint_extraction_draft_support_approved_operator",
    orgId: plan.org_id,
    clientId: "client_example",
    documentSourceRef: "blueprint_upload_doc_ref_support_001",
    extractionState: "parsed",
    approvalState: "approved",
    ownerRole: plan.value_hypothesis.owner_role,
    approverRole: "customer_business_owner",
    workflowFamily: plan.workflow_scope.workflow_family,
    workflowName: "Customer support case resolution",
    functionArea: plan.workflow_scope.function_area,
    cohortKey: "workflow_family:customer_support_case_resolution|eligible_cases:2300",
    valueHypothesis: plan.value_hypothesis.hypothesis_statement,
    valueRoute: "CAPACITY_CREATION",
    baselineWindow,
    comparisonWindow,
    metricCandidates: [
      {
        metric_id: plan.metric_selection.primary_metric.metric_id,
        metric_name: plan.metric_selection.primary_metric.metric_name,
        expected_direction: "decrease"
      }
    ],
    assumptions: [
      {
        assumption_id: "case_mix_stability",
        owner: "support_ops_owner",
        state: "submitted"
      },
      {
        assumption_id: "volume_context",
        owner: "support_ops_owner",
        state: "submitted"
      },
      {
        assumption_id: "staffing_and_coverage_context",
        owner: "support_ops_owner",
        state: "submitted"
      },
      {
        assumption_id: "channel_mix_context",
        owner: "support_ops_owner",
        state: "submitted"
      },
      {
        assumption_id: "process_or_policy_context",
        owner: "support_ops_owner",
        state: "submitted"
      },
      {
        assumption_id: "knowledge_base_context",
        owner: "support_ops_owner",
        state: "submitted"
      },
      {
        assumption_id: "metric_definition_stability",
        owner: "support_ops_owner",
        state: "submitted"
      },
      {
        assumption_id: "ai_rollout_context",
        owner: "support_ops_owner",
        state: "submitted"
      }
    ],
    sourceRefs: {
      document_source_ref: "blueprint_upload_doc_ref_support_001",
      extraction_run_ref: "blueprint_extraction_run_support_001"
    },
    generatedAt: "2026-06-21T00:00:00.000Z",
    ...overrides
  };
}

function aiFluencyCsvText(records) {
  return [
    AI_FLUENCY_CSV_HEADERS.join(","),
    ...records.map((record) =>
      AI_FLUENCY_CSV_HEADERS.map((header) => csvValue(record[header])).join(",")
    )
  ].join("\n");
}

function parseRunFromAIFluencyRecords(records, parseId) {
  return buildAIFluencyAggregateExportParseRun({
    sourceType: "csv",
    sourceText: aiFluencyCsvText(records),
    parseId,
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
}

function operatorSources(plan = fullPlan(), overrides = {}) {
  return {
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
    }),
    ...overrides
  };
}

function sourcePackageExample(file, plan, overrides = {}) {
  const { comparisonWindow } = windowsFromPlan(plan);
  const pkg = readJson(`${SOURCE_PACKAGE_EXAMPLES}/${file}`);
  return {
    ...pkg,
    org_id: plan.org_id,
    covered_window: comparisonWindow,
    source_owner_role: "source_owner",
    source_owner_attestation: {
      ...pkg.source_owner_attestation,
      attested_by_role: "source_owner"
    },
    ...overrides
  };
}

function matchingSourcePackages(plan = fullPlan(), sources = operatorSources(plan)) {
  return [
    sourcePackageExample("layer-2-user-voice-package.json", plan, {
      source_package_id: "source_package_layer_2_ai_fluency_operator",
      source_refs: {
        source_readiness_id: "source_readiness_ai_fluency_operator",
        aggregate_export_id: sources.aiFluency.source_ref
      }
    }),
    sourcePackageExample("layer-1-bigquery-telemetry-package.json", plan, {
      source_package_id: "source_package_layer_1_vbd_token_operator",
      source_refs: {
        source_readiness_id: "source_readiness_vbd_token_operator",
        aggregate_probe_id: sources.vbdToken.source_ref,
        reportability_signal_families: [
          "assistant",
          "search_document_retrieval",
          "agent_run"
        ]
      }
    }),
    sourcePackageExample("layer-3-system-of-record-outcome-package.json", plan, {
      source_package_id: "source_package_layer_3_customer_metric_operator",
      source_refs: {
        source_readiness_id: "source_readiness_customer_metric_operator",
        aggregate_outcome_export_id: sources.customerMetric.source_ref
      }
    }),
    sourcePackageExample("assumption-approval-package.json", plan, {
      source_package_id: "source_package_assumption_operator",
      source_refs: {
        source_readiness_id: "source_readiness_assumption_operator",
        assumption_approval_export_id: sources.assumption.source_ref
      }
    }),
    sourcePackageExample("governance-control-package.json", plan, {
      source_package_id: "source_package_governance_operator",
      source_refs: {
        source_readiness_id: "source_readiness_governance_operator",
        governance_control_export_id: sources.governance.source_ref
      }
    })
  ];
}

function baseExport(plan, evidenceLayer, overrides = {}) {
  return {
    schema_version: "FT_AI_VALUE_SCRUBBED_GLEAN_CLIENT_EXPORT_2026_06",
    export_id: `operator_scrubbed_export_${evidenceLayer}_2026_06`,
    request_id: `client_evidence_request_${plan.measurement_plan_id}_${evidenceLayer}`,
    org_id: plan.org_id,
    measurement_plan_id: plan.measurement_plan_id,
    evidence_layer: evidenceLayer,
    source_owner_role: "customer_data_owner",
    approver_role: "customer_data_owner",
    attestation: {
      attestation_state: "attested",
      attested_by_role: "customer_data_owner",
      attested_at: "2026-06-21T00:00:00.000Z",
      caveats: [
        "Already-parsed aggregate export summary only; no raw rows or identifiers retained."
      ]
    },
    generated_at: "2026-06-21T00:00:00.000Z",
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
    notes: ["Operator adapter fixture uses aggregate metadata only."],
    caveats: ["Source export package is aggregate evidence input only."],
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

function measurementCellInput(plan = fullPlan(), sources = operatorSources(plan), overrides = {}) {
  const { baselineWindow, comparisonWindow } = windowsFromPlan(plan);
  const base = {
    orgId: plan.org_id,
    functionArea: plan.workflow_scope.function_area,
    workflowFamily: plan.workflow_scope.workflow_family,
    workflowId: "workflow_support_case_resolution",
    cohortKey: "workflow_family:customer_support_case_resolution|eligible_cases:2300",
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
      blueprint_expectation_ref: sources.blueprint.source_ref,
      blueprint_customer_approval_state: "approved",
      blueprint_customer_approver_role: "customer_business_owner",
      value_route: plan.value_hypothesis.value_route,
      value_promise: plan.value_hypothesis.hypothesis_statement,
      expected_metric_id: plan.metric_selection.primary_metric.metric_id,
      expected_metric_direction: "decrease",
      expected_metric_lag_days: 30,
      expected_metric_system_recommended: true,
      expected_metric_customer_selected: true,
      owner_role: plan.value_hypothesis.owner_role,
      assumption_refs: [sources.assumption.source_ref],
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
      source_ref: sources.aiFluency.source_ref,
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
      source_ref: sources.vbdToken.source_ref,
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
      source_ref: sources.customerMetric.source_ref,
      suppression_state: "CLEAR"
    },
    tokenContext: {
      evidence_state: "present",
      token_total: 1880000,
      token_per_active_seat: 7833,
      token_intensity_band: "moderate",
      source_ref: sources.vbdToken.source_ref
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
  return { ...base, ...overrides };
}

function baseOperatorInput(overrides = {}) {
  const plan = fullPlan();
  const sources = operatorSources(plan);
  return {
    orgId: plan.org_id,
    clientId: "client_example",
    workflowFamily: plan.workflow_scope.workflow_family,
    functionArea: plan.workflow_scope.function_area,
    cohortKey: "workflow_family:customer_support_case_resolution|eligible_cases:2300",
    baselineWindow: windowsFromPlan(plan).baselineWindow,
    comparisonWindow: windowsFromPlan(plan).comparisonWindow,
    sources,
    measurementPlan: plan,
    sourcePackages: matchingSourcePackages(plan, sources),
    scrubbedGleanExports: fullExportPacket(plan),
    measurementCellInput: measurementCellInput(plan, sources),
    runId: "operator_intake_adapter_run_support_day_30",
    generatedAt: "2026-06-21T00:00:00.000Z",
    ...overrides
  };
}

test("operator intake adapter composes approved aggregate source inputs into a validated spine run", () => {
  const run = buildOperatorIntakeAdapterRun(baseOperatorInput());
  const result = validateOperatorIntakeAdapterRun(run);
  const assemblyResult = validateMeasurementCellAssemblyRun(run.measurement_cell_assembly_run);

  assert.equal(run.schema_version, AI_VALUE_OPERATOR_INTAKE_ADAPTER_RUN_SCHEMA_VERSION);
  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(assemblyResult.valid, true, assemblyResult.gaps.join("; "));
  assert.equal(
    run.decision,
    "READY_FOR_VALUE_HYPOTHESIS_PACKET_PREPARATION",
    run.measurement_cell_assembly_run?.gaps?.join("; ")
  );
  assert.equal(run.data_spine_readiness.readiness_state, "MEASUREMENT_CELL_READY");
  assert.equal(run.source_package_review_queue.queue_state, "DATA_SPINE_REVIEW_READY");
  assert.equal(run.real_data_intake_packet_run.decision, "READY_FOR_MEASUREMENT_CELL_ASSEMBLY");
  assert.equal(run.measurement_cell_assembly_run.decision, "READY_FOR_VALUE_HYPOTHESIS_PACKET_RUNNER");
  assert.equal(run.feeds.data_spine_readiness, true);
  assert.equal(run.feeds.source_package_review_queue, true);
  assert.equal(run.feeds.real_data_intake_packet_run, true);
  assert.equal(run.feeds.measurement_cell_assembly_run, true);
  assert.equal(run.feeds.value_hypothesis_packet_runner, false);
  assert.equal(run.feeds.finance_context_investigation, false);
  assert.equal(run.feeds.customer_facing_financial_output, false);
});

test("operator intake adapter accepts approved AI Fluency parser-run context through dashboard import boundary", () => {
  const plan = fullPlan();
  const record = aiFluencyAggregateRecord(plan);
  const parseRun = parseRunFromAIFluencyRecords(
    [record],
    "ai_fluency_aggregate_export_parse_operator_day_30"
  );
  const parseValidation = validateAIFluencyAggregateExportParseRun(parseRun);
  const dashboardRun = buildAIFluencyDashboardImportRun({
    dashboardExport: parseRun.dashboard_export,
    runId: "ai_fluency_dashboard_import_operator_day_30",
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const dashboardValidation = validateAIFluencyDashboardImportRun(dashboardRun);
  const handoff = buildAIFluencyOperatorSourceHandoff({
    parseRun,
    dashboardImportRun: dashboardRun,
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const handoffValidation = validateAIFluencyOperatorSourceHandoff(handoff);
  const sources = operatorSources(plan, { aiFluency: handoff.operator_source });
  const input = baseOperatorInput({
    sources,
    sourcePackages: matchingSourcePackages(plan, sources),
    measurementCellInput: measurementCellInput(plan, sources, {
      aiFluencyContext: handoff.ai_fluency_context
    }),
    runId: "operator_intake_adapter_run_parser_imported_ai_fluency"
  });

  const run = buildOperatorIntakeAdapterRun(input);
  const result = validateOperatorIntakeAdapterRun(run);

  assert.equal(parseValidation.valid, true, parseValidation.gaps.join("; "));
  assert.equal(parseValidation.feeds.dashboard_import_runner, true);
  assert.equal(dashboardValidation.valid, true, dashboardValidation.gaps.join("; "));
  assert.equal(dashboardValidation.feeds.data_spine_ai_fluency_sources, true);
  assert.equal(handoffValidation.valid, true, handoffValidation.gaps.join("; "));
  assert.equal(handoff.decision, "READY_FOR_OPERATOR_INTAKE");
  assert.equal(handoff.feeds.operator_intake_source, true);
  assert.equal(handoff.feeds.measurement_cell_direct_feed, false);
  assert.equal(handoff.ai_fluency_context.org_id, plan.org_id);
  assert.equal(handoff.ai_fluency_context.client_id, record.client_id);
  assert.equal(handoff.ai_fluency_context.workflow_family, plan.workflow_scope.workflow_family);
  assert.equal(handoff.ai_fluency_context.function_area, plan.workflow_scope.function_area);
  assert.equal(handoff.ai_fluency_context.cohort_key, record.cohort_key);
  assert.deepEqual(handoff.ai_fluency_context.baseline_window, {
    window_start: record.baseline_window_start,
    window_end: record.baseline_window_end
  });
  assert.deepEqual(handoff.ai_fluency_context.comparison_window, {
    window_start: record.comparison_window_start,
    window_end: record.comparison_window_end
  });
  assert.equal(handoff.ai_fluency_context.owner_approval_state, "approved");
  assert.equal(handoff.ai_fluency_context.source_review_state, "clear");
  assert.equal(dashboardRun.feedable_data_spine_sources.length, 1);
  assert.equal(sources.aiFluency.owner_role, "source_owner");
  assert.equal(run.decision, "READY_FOR_VALUE_HYPOTHESIS_PACKET_PREPARATION");
  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(run.data_spine_readiness.source_readiness.ai_fluency.source_ref, record.source_ref);
  assert.equal(run.source_package_review_queue.queue_state, "DATA_SPINE_REVIEW_READY");
  assert.equal(run.feeds.measurement_cell_assembly_run, true);
  assert.equal(run.feeds.finance_context_investigation, false);
  assert.equal(run.feeds.confidence_model, false);
  assert.equal(run.feeds.customer_facing_financial_output, false);
});

test("operator intake adapter accepts approved Blueprint source handoff without bypassing Measurement Cell governance", () => {
  const plan = fullPlan();
  const draft = buildBlueprintExtractionDraft(blueprintExtractionInput(plan));
  const handoff = buildBlueprintOperatorSourceHandoff({
    draft,
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const handoffValidation = validateBlueprintOperatorSourceHandoff(handoff);
  const sources = operatorSources(plan, { blueprint: handoff.operator_source });
  const input = baseOperatorInput({
    sources,
    sourcePackages: matchingSourcePackages(plan, sources),
    measurementCellInput: measurementCellInput(plan, sources, {
      blueprintAlignment: handoff.blueprint_alignment_context
    }),
    runId: "operator_intake_adapter_run_blueprint_source_handoff"
  });

  const run = buildOperatorIntakeAdapterRun(input);
  const result = validateOperatorIntakeAdapterRun(run);

  assert.equal(handoffValidation.valid, true, handoffValidation.gaps.join("; "));
  assert.equal(handoff.decision, "READY_FOR_OPERATOR_INTAKE");
  assert.equal(handoff.feeds.operator_intake_source, true);
  assert.equal(handoff.feeds.measurement_cell_context_fragment, true);
  assert.equal(handoff.feeds.measurement_cell_direct_feed, false);
  assert.equal(handoff.feeds.finance_context_investigation, false);
  assert.equal(handoff.feeds.confidence_model, false);
  assert.equal(handoff.feeds.customer_facing_financial_output, false);
  assert.equal(handoff.operator_source.owner_role, plan.value_hypothesis.owner_role);
  assert.equal(handoff.blueprint_alignment_context.source_ref, handoff.operator_source.source_ref);
  assert.equal(handoff.blueprint_alignment_context.expected_metric_id, plan.metric_selection.primary_metric.metric_id);
  assert.equal(run.decision, "READY_FOR_VALUE_HYPOTHESIS_PACKET_PREPARATION");
  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(run.data_spine_readiness.source_readiness.blueprint.source_ref, draft.data_spine_source.source_ref);
  assert.equal(run.source_package_review_queue.lanes.find((lane) => lane.lane_key === "blueprint").data_spine_review_clear, true);
  assert.equal(run.feeds.measurement_cell_assembly_run, true);
  assert.equal(run.feeds.finance_context_investigation, false);
  assert.equal(run.feeds.confidence_model, false);
  assert.equal(run.feeds.customer_facing_financial_output, false);
});

test("AI Fluency operator source handoff binds parser records to the imported dashboard export", () => {
  const plan = fullPlan();
  const importedRecord = aiFluencyAggregateRecord(plan);
  const staleRecord = aiFluencyAggregateRecord(plan, {
    dashboard_export_id: "ai_fluency_operator_dashboard_export_stale",
    source_ref: importedRecord.source_ref,
    source_owner_role: "stale_source_owner",
    overall_ai_fluency_score: 12,
    confidence_score: 12,
    usage_quality_score: 12,
    behavior_change_score: 12,
    leadership_reinforcement_score: 12,
    capability_growth_score: 12
  });
  const importedParseRun = parseRunFromAIFluencyRecords(
    [importedRecord],
    "ai_fluency_aggregate_export_parse_operator_imported"
  );
  const staleParseRun = parseRunFromAIFluencyRecords(
    [staleRecord],
    "ai_fluency_aggregate_export_parse_operator_stale"
  );
  const dashboardRun = buildAIFluencyDashboardImportRun({
    dashboardExport: importedParseRun.dashboard_export,
    runId: "ai_fluency_dashboard_import_operator_imported",
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const handoff = buildAIFluencyOperatorSourceHandoff({
    parseRun: staleParseRun,
    dashboardImportRun: dashboardRun,
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const result = validateAIFluencyOperatorSourceHandoff(handoff);

  assert.equal(handoff.decision, "BLOCKED");
  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) =>
    gap.includes("AI Fluency parser dashboard_export_id must match dashboard import run dashboard_export_id")
  ));
  assert.equal(handoff.operator_source, null);
  assert.equal(handoff.ai_fluency_context, null);
  assert.equal(result.feeds.operator_intake_source, false);
  assert.equal(result.feeds.measurement_cell_context_fragment, false);
});

test("operator intake adapter accepts approved VBD token source handoff without bypassing Source Package review", () => {
  const plan = fullPlan();
  const aggregateIntake = vbdTokenAggregateIntake(plan);
  const intakeValidation = validateVbdTokenAggregateIntake(aggregateIntake);
  const handoff = buildVbdTokenOperatorSourceHandoff({
    aggregateIntake,
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const handoffValidation = validateVbdTokenOperatorSourceHandoff(handoff);
  const sources = operatorSources(plan, { vbdToken: handoff.operator_source });
  const input = baseOperatorInput({
    sources,
    sourcePackages: matchingSourcePackages(plan, sources),
    measurementCellInput: measurementCellInput(plan, sources, {
      vbdContext: handoff.vbd_context,
      tokenContext: handoff.token_context
    }),
    runId: "operator_intake_adapter_run_vbd_token_source_handoff"
  });

  const run = buildOperatorIntakeAdapterRun(input);
  const result = validateOperatorIntakeAdapterRun(run);

  assert.equal(intakeValidation.valid, true, intakeValidation.gaps.join("; "));
  assert.equal(intakeValidation.feeds.data_spine_vbd_token_source, true);
  assert.equal(handoffValidation.valid, true, handoffValidation.gaps.join("; "));
  assert.equal(handoff.decision, "READY_FOR_OPERATOR_INTAKE");
  assert.equal(handoff.feeds.operator_intake_source, true);
  assert.equal(handoff.feeds.measurement_cell_vbd_context_fragment, true);
  assert.equal(handoff.feeds.measurement_cell_token_context_fragment, true);
  assert.equal(handoff.feeds.measurement_cell_direct_feed, false);
  assert.equal(handoff.feeds.finance_context_investigation, false);
  assert.equal(handoff.feeds.confidence_model, false);
  assert.equal(handoff.feeds.customer_facing_financial_output, false);
  assert.equal(handoff.source_package_reference.source_refs.aggregate_probe_id, handoff.source_ref);
  assert.equal(run.decision, "READY_FOR_VALUE_HYPOTHESIS_PACKET_PREPARATION");
  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(run.data_spine_readiness.source_readiness.vbd_token.source_ref, aggregateIntake.source_ref);
  const vbdTokenLane = run.source_package_review_queue.lanes.find((lane) =>
    lane.lane_key === "vbd_token"
  );
  assert.ok(vbdTokenLane.source_package_ids.includes("source_package_layer_1_vbd_token_operator"));
  assert.equal(vbdTokenLane.source_package_alignment_clear, true);
  assert.equal(vbdTokenLane.source_package_can_feed_evidence, true);
  assert.equal(run.feeds.measurement_cell_assembly_run, true);
  assert.equal(run.feeds.finance_context_investigation, false);
  assert.equal(run.feeds.confidence_model, false);
  assert.equal(run.feeds.customer_facing_financial_output, false);
});

test("operator intake adapter still holds a valid VBD token handoff without matching Layer 1 Source Package", () => {
  const plan = fullPlan();
  const aggregateIntake = vbdTokenAggregateIntake(plan);
  const handoff = buildVbdTokenOperatorSourceHandoff({
    aggregateIntake,
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const sources = operatorSources(plan, { vbdToken: handoff.operator_source });
  const sourcePackages = matchingSourcePackages(plan, sources).filter((sourcePackage) =>
    sourcePackage.source_package_type !== "layer_1_bigquery_telemetry_summary"
  );
  const input = baseOperatorInput({
    sources,
    sourcePackages,
    measurementCellInput: measurementCellInput(plan, sources, {
      vbdContext: handoff.vbd_context,
      tokenContext: handoff.token_context
    }),
    runId: "operator_intake_adapter_run_vbd_token_handoff_missing_layer_1_package"
  });

  const run = buildOperatorIntakeAdapterRun(input);
  const result = validateOperatorIntakeAdapterRun(run);

  assert.equal(validateVbdTokenOperatorSourceHandoff(handoff).valid, true);
  assert.equal(run.decision, "HELD_FOR_SOURCE_PACKAGE_REVIEW");
  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(run.source_package_review_queue.queue_state, "HELD_FOR_SOURCE_REVIEW");
  assert.ok(run.missing_evidence.includes("VBD_TOKEN_SOURCE_PACKAGE_REQUIRED"));
  assert.equal(run.feeds.measurement_cell_assembly_run, false);
  assert.equal(run.feeds.value_hypothesis_packet_runner, false);
  assert.equal(run.feeds.finance_context_investigation, false);
  assert.equal(run.feeds.confidence_model, false);
  assert.equal(run.feeds.customer_facing_financial_output, false);
});

test("operator intake adapter accepts approved Customer Metric handoff without bypassing Source Package review", () => {
  const plan = fullPlan();
  const intake = customerMetricIntake(plan);
  const intakeValidation = validateCustomerMetricIntake(intake);
  const handoff = buildCustomerMetricOperatorSourceHandoff({
    customerMetricIntake: intake,
    generatedAt: "2026-06-22T00:00:00.000Z"
  });
  const handoffValidation = validateCustomerMetricOperatorSourceHandoff(handoff);
  const sources = operatorSources(plan, { customerMetric: handoff.operator_source });
  const sourcePackages = matchingSourcePackages(plan, sources).map((sourcePackage) =>
    sourcePackage.source_package_type === "layer_3_business_system_of_record_outcome_export"
      ? {
          ...sourcePackage,
          source_owner_role: handoff.operator_source.owner_role,
          source_owner_attestation: {
            ...sourcePackage.source_owner_attestation,
            attested_by_role: handoff.operator_source.owner_role
          }
        }
      : sourcePackage
  );
  const input = baseOperatorInput({
    sources,
    sourcePackages,
    measurementCellInput: measurementCellInput(plan, sources, {
      selectedMetric: handoff.selected_metric_context
    }),
    runId: "operator_intake_adapter_run_customer_metric_source_handoff"
  });

  const run = buildOperatorIntakeAdapterRun(input);
  const result = validateOperatorIntakeAdapterRun(run);

  assert.equal(intakeValidation.valid, true, intakeValidation.gaps.join("; "));
  assert.equal(intakeValidation.feeds.data_spine_customer_metric_source, true);
  assert.equal(handoffValidation.valid, true, handoffValidation.gaps.join("; "));
  assert.equal(handoff.decision, "READY_FOR_OPERATOR_INTAKE");
  assert.equal(handoff.feeds.operator_intake_source, true);
  assert.equal(handoff.feeds.measurement_cell_selected_metric_context_fragment, true);
  assert.equal(handoff.feeds.metric_movement_context_fragment, true);
  assert.equal(handoff.feeds.layer_3_metric_context_fragment, true);
  assert.equal(handoff.feeds.measurement_cell_direct_feed, false);
  assert.equal(handoff.feeds.finance_context_investigation, false);
  assert.equal(handoff.feeds.confidence_model, false);
  assert.equal(handoff.feeds.customer_facing_financial_output, false);
  assert.equal(
    handoff.metric_movement_context.interpretation,
    "descriptive_movement_only"
  );
  assert.equal(
    handoff.source_package_reference.source_refs.aggregate_outcome_export_id,
    handoff.source_ref
  );
  assert.equal(run.decision, "READY_FOR_VALUE_HYPOTHESIS_PACKET_PREPARATION");
  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(
    run.data_spine_readiness.source_readiness.customer_metric.source_ref,
    intake.source_ref
  );
  const customerMetricLane = run.source_package_review_queue.lanes.find((lane) =>
    lane.lane_key === "customer_metric"
  );
  assert.ok(customerMetricLane.source_package_ids.includes("source_package_layer_3_customer_metric_operator"));
  assert.equal(customerMetricLane.source_package_alignment_clear, true);
  assert.equal(customerMetricLane.source_package_can_feed_evidence, true);
  assert.equal(run.feeds.measurement_cell_assembly_run, true);
  assert.equal(run.feeds.finance_context_investigation, false);
  assert.equal(run.feeds.confidence_model, false);
  assert.equal(run.feeds.customer_facing_financial_output, false);
});

test("operator intake adapter still holds a valid Customer Metric handoff without matching Layer 3 Source Package", () => {
  const plan = fullPlan();
  const intake = customerMetricIntake(plan);
  const handoff = buildCustomerMetricOperatorSourceHandoff({
    customerMetricIntake: intake,
    generatedAt: "2026-06-22T00:00:00.000Z"
  });
  const sources = operatorSources(plan, { customerMetric: handoff.operator_source });
  const sourcePackages = matchingSourcePackages(plan, sources).filter((sourcePackage) =>
    sourcePackage.source_package_type !== "layer_3_business_system_of_record_outcome_export"
  );
  const input = baseOperatorInput({
    sources,
    sourcePackages,
    measurementCellInput: measurementCellInput(plan, sources, {
      selectedMetric: handoff.selected_metric_context
    }),
    runId: "operator_intake_adapter_run_customer_metric_handoff_missing_layer_3_package"
  });

  const run = buildOperatorIntakeAdapterRun(input);
  const result = validateOperatorIntakeAdapterRun(run);

  assert.equal(validateCustomerMetricOperatorSourceHandoff(handoff).valid, true);
  assert.equal(run.decision, "HELD_FOR_SOURCE_PACKAGE_REVIEW");
  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(run.source_package_review_queue.queue_state, "HELD_FOR_SOURCE_REVIEW");
  assert.ok(run.missing_evidence.includes("CUSTOMER_METRIC_SOURCE_PACKAGE_REQUIRED"));
  assert.equal(run.feeds.measurement_cell_assembly_run, false);
  assert.equal(run.feeds.value_hypothesis_packet_runner, false);
  assert.equal(run.feeds.finance_context_investigation, false);
  assert.equal(run.feeds.confidence_model, false);
  assert.equal(run.feeds.customer_facing_financial_output, false);
});

test("operator intake adapter accepts approved assumption and governance handoffs without bypassing Source Package review", () => {
  const plan = fullPlan();
  const baseSources = operatorSources(plan);
  const assumptionHandoff = buildAssumptionGovernanceOperatorSourceHandoff({
    lane: "assumption",
    source: baseSources.assumption,
    generatedAt: "2026-06-22T00:00:00.000Z"
  });
  const governanceHandoff = buildAssumptionGovernanceOperatorSourceHandoff({
    lane: "governance",
    source: baseSources.governance,
    generatedAt: "2026-06-22T00:00:00.000Z"
  });
  const sources = operatorSources(plan, {
    assumption: assumptionHandoff.operator_source,
    governance: governanceHandoff.operator_source
  });
  const input = baseOperatorInput({
    sources,
    sourcePackages: matchingSourcePackages(plan, sources),
    measurementCellInput: measurementCellInput(plan, sources),
    runId: "operator_intake_adapter_run_assumption_governance_source_handoffs"
  });

  const run = buildOperatorIntakeAdapterRun(input);
  const result = validateOperatorIntakeAdapterRun(run);

  assert.equal(validateAssumptionGovernanceOperatorSourceHandoff(assumptionHandoff).valid, true);
  assert.equal(validateAssumptionGovernanceOperatorSourceHandoff(governanceHandoff).valid, true);
  assert.equal(assumptionHandoff.decision, "READY_FOR_OPERATOR_INTAKE");
  assert.equal(governanceHandoff.decision, "READY_FOR_OPERATOR_INTAKE");
  assert.equal(assumptionHandoff.source_package_reference.source_refs.assumption_approval_export_id, assumptionHandoff.source_ref);
  assert.equal(governanceHandoff.source_package_reference.source_refs.governance_control_export_id, governanceHandoff.source_ref);
  assert.equal(run.decision, "READY_FOR_VALUE_HYPOTHESIS_PACKET_PREPARATION");
  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(run.data_spine_readiness.source_readiness.assumption.source_ref, assumptionHandoff.source_ref);
  assert.equal(run.data_spine_readiness.source_readiness.governance.source_ref, governanceHandoff.source_ref);
  assert.equal(run.source_package_review_queue.lanes.find((lane) => lane.lane_key === "assumption").source_package_alignment_clear, true);
  assert.equal(run.source_package_review_queue.lanes.find((lane) => lane.lane_key === "governance").source_package_alignment_clear, true);
  assert.equal(run.feeds.measurement_cell_assembly_run, true);
  assert.equal(run.feeds.finance_context_investigation, false);
  assert.equal(run.feeds.confidence_model, false);
  assert.equal(run.feeds.customer_facing_financial_output, false);
});

test("operator intake adapter still holds assumption and governance handoffs without matching packages", () => {
  const plan = fullPlan();
  const baseSources = operatorSources(plan);
  const assumptionHandoff = buildAssumptionGovernanceOperatorSourceHandoff({
    lane: "assumption",
    source: baseSources.assumption,
    generatedAt: "2026-06-22T00:00:00.000Z"
  });
  const governanceHandoff = buildAssumptionGovernanceOperatorSourceHandoff({
    lane: "governance",
    source: baseSources.governance,
    generatedAt: "2026-06-22T00:00:00.000Z"
  });
  const sources = operatorSources(plan, {
    assumption: assumptionHandoff.operator_source,
    governance: governanceHandoff.operator_source
  });
  const sourcePackages = matchingSourcePackages(plan, sources).filter((sourcePackage) =>
    !["assumption_approval_export", "governance_control_export"].includes(
      sourcePackage.source_package_type
    )
  );
  const input = baseOperatorInput({
    sources,
    sourcePackages,
    measurementCellInput: measurementCellInput(plan, sources),
    runId: "operator_intake_adapter_run_assumption_governance_handoffs_missing_packages"
  });

  const run = buildOperatorIntakeAdapterRun(input);
  const result = validateOperatorIntakeAdapterRun(run);

  assert.equal(validateAssumptionGovernanceOperatorSourceHandoff(assumptionHandoff).valid, true);
  assert.equal(validateAssumptionGovernanceOperatorSourceHandoff(governanceHandoff).valid, true);
  assert.equal(run.decision, "HELD_FOR_SOURCE_PACKAGE_REVIEW");
  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(run.source_package_review_queue.queue_state, "HELD_FOR_SOURCE_REVIEW");
  assert.ok(run.missing_evidence.includes("ASSUMPTION_SOURCE_PACKAGE_REQUIRED"));
  assert.ok(run.missing_evidence.includes("GOVERNANCE_SOURCE_PACKAGE_REQUIRED"));
  assert.equal(run.feeds.measurement_cell_assembly_run, false);
  assert.equal(run.feeds.value_hypothesis_packet_runner, false);
  assert.equal(run.feeds.finance_context_investigation, false);
  assert.equal(run.feeds.confidence_model, false);
  assert.equal(run.feeds.customer_facing_financial_output, false);
});

test("AI Fluency operator source handoff fails closed when context alignment drifts", () => {
  const plan = fullPlan();
  const record = aiFluencyAggregateRecord(plan);
  const parseRun = parseRunFromAIFluencyRecords(
    [record],
    "ai_fluency_aggregate_export_parse_operator_drift"
  );
  const dashboardRun = buildAIFluencyDashboardImportRun({
    dashboardExport: parseRun.dashboard_export,
    runId: "ai_fluency_dashboard_import_operator_drift",
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const handoff = buildAIFluencyOperatorSourceHandoff({
    parseRun,
    dashboardImportRun: dashboardRun,
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const drifted = clone(handoff);
  drifted.ai_fluency_context.function_area = "Marketing";

  const result = validateAIFluencyOperatorSourceHandoff(drifted);

  assert.equal(result.valid, false);
  assert.ok(
    result.gaps.includes("ai_fluency_context.function_area must match operator_source.function_area")
  );
  assert.equal(result.feeds.operator_intake_source, false);
  assert.equal(result.feeds.measurement_cell_context_fragment, false);
  assert.equal(result.feeds.finance_context_investigation, false);
  assert.equal(result.feeds.confidence_model, false);
  assert.equal(result.feeds.customer_facing_financial_output, false);
});

test("AI Fluency operator source handoff blocks duplicate parser source refs before operator intake", () => {
  const plan = fullPlan();
  const clearRecord = aiFluencyAggregateRecord(plan);
  const heldRecord = aiFluencyAggregateRecord(plan, {
    response_count: 18,
    suppression_state: "suppressed_low_n",
    overall_ai_fluency_score: "",
    source_owner_role: "held_source_owner",
    review_state: "held_suppressed_low_n",
    caveats: "Held duplicate row should not bind to the imported source."
  });
  const parseRun = parseRunFromAIFluencyRecords(
    [heldRecord, clearRecord],
    "ai_fluency_aggregate_export_parse_operator_duplicate_source_ref"
  );
  const dashboardRun = buildAIFluencyDashboardImportRun({
    dashboardExport: parseRun.dashboard_export,
    runId: "ai_fluency_dashboard_import_operator_duplicate_source_ref",
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const handoff = buildAIFluencyOperatorSourceHandoff({
    parseRun,
    dashboardImportRun: dashboardRun,
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const result = validateAIFluencyOperatorSourceHandoff(handoff);

  assert.equal(dashboardRun.feedable_data_spine_sources.length, 1);
  assert.equal(handoff.decision, "BLOCKED");
  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) =>
    /source_ref must match exactly one parser dashboard_export record/i.test(gap)
  ));
  assert.equal(handoff.operator_source, null);
  assert.equal(handoff.ai_fluency_context, null);
  assert.equal(result.feeds.operator_intake_source, false);
  assert.equal(result.feeds.measurement_cell_context_fragment, false);
});

test("AI Fluency operator source handoff blocks unsafe source_ref variants", () => {
  const plan = fullPlan();
  const unsafeRefs = [
    "raw_prompt_export_123",
    "raw-prompt-export",
    "rawPromptExport"
  ];

  for (const sourceRef of unsafeRefs) {
    const record = aiFluencyAggregateRecord(plan, { source_ref: sourceRef });
    const parseRun = parseRunFromAIFluencyRecords(
      [record],
      `ai_fluency_aggregate_export_parse_operator_unsafe_${sourceRef}`
    );
    const dashboardRun = buildAIFluencyDashboardImportRun({
      dashboardExport: parseRun.dashboard_export,
      runId: `ai_fluency_dashboard_import_operator_unsafe_${sourceRef}`,
      generatedAt: "2026-06-21T00:00:00.000Z"
    });
    const handoff = buildAIFluencyOperatorSourceHandoff({
      parseRun,
      dashboardImportRun: dashboardRun,
      generatedAt: "2026-06-21T00:00:00.000Z"
    });
    const result = validateAIFluencyOperatorSourceHandoff(handoff);

    assert.equal(dashboardRun.feedable_data_spine_sources.length, 1);
    assert.equal(result.valid, false, sourceRef);
    assert.ok(result.gaps.some((gap) =>
      gap.includes("Unsafe identifier value detected") && gap.includes("source_ref")
    ), sourceRef);
    assert.equal(result.feeds.operator_intake_source, false);
    assert.equal(result.feeds.measurement_cell_context_fragment, false);
  }
});

test("operator intake adapter blocks suppressed AI Fluency parser runs from feeding operator intake", () => {
  const plan = fullPlan();
  const record = aiFluencyAggregateRecord(plan, {
    response_count: 18,
    response_rate: 0.04,
    suppression_state: "suppressed_low_n",
    overall_ai_fluency_score: "",
    confidence_score: "",
    usage_quality_score: "",
    behavior_change_score: "",
    leadership_reinforcement_score: "",
    capability_growth_score: "",
    baseline_overall_ai_fluency_score: "",
    comparison_overall_ai_fluency_score: "",
    movement_delta: "",
    movement_direction: "held",
    source_ref: "ai_fluency_support_day_30_suppressed_parser_run",
    review_state: "held_suppressed_low_n",
    caveats: "Suppressed because response_count is below the dashboard import gate."
  });
  const parseRun = parseRunFromAIFluencyRecords(
    [record],
    "ai_fluency_aggregate_export_parse_operator_suppressed_day_30"
  );
  const parseValidation = validateAIFluencyAggregateExportParseRun(parseRun);
  const dashboardRun = buildAIFluencyDashboardImportRun({
    dashboardExport: parseRun.dashboard_export,
    runId: "ai_fluency_dashboard_import_operator_suppressed_day_30",
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const dashboardValidation = validateAIFluencyDashboardImportRun(dashboardRun);
  const handoff = buildAIFluencyOperatorSourceHandoff({
    parseRun,
    dashboardImportRun: dashboardRun,
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const handoffValidation = validateAIFluencyOperatorSourceHandoff(handoff);
  const sources = operatorSources(plan, {
    aiFluency: source(plan, {
      state: "suppressed",
      intake_mode: "ai_fluency_dashboard_export",
      source_ref: null,
      owner_role: record.source_owner_role,
      owner_approval_state: "approved",
      review_state: "suppressed",
      aggregate_only: true
    })
  });
  const input = baseOperatorInput({
    sources,
    sourcePackages: matchingSourcePackages(plan, sources),
    measurementCellInput: measurementCellInput(plan, sources, {
      aiFluencyContext: {
        evidence_state: "suppressed",
        source_ref: null,
        response_count: record.response_count,
        suppression_state: "SUPPRESSED"
      }
    }),
    runId: "operator_intake_adapter_run_suppressed_parser_import"
  });

  const run = buildOperatorIntakeAdapterRun(input);
  const result = validateOperatorIntakeAdapterRun(run);

  assert.equal(parseValidation.valid, true, parseValidation.gaps.join("; "));
  assert.equal(parseValidation.feeds.dashboard_import_runner, true);
  assert.equal(dashboardValidation.valid, true, dashboardValidation.gaps.join("; "));
  assert.equal(dashboardValidation.feeds.data_spine_ai_fluency_sources, false);
  assert.equal(handoffValidation.valid, true, handoffValidation.gaps.join("; "));
  assert.equal(handoff.decision, "HELD_NO_FEEDABLE_AI_FLUENCY_SOURCE");
  assert.equal(handoff.feeds.operator_intake_source, false);
  assert.equal(handoff.feeds.measurement_cell_context_fragment, false);
  assert.equal(dashboardRun.summary.suppressed_count, 1);
  assert.equal(dashboardRun.feedable_data_spine_sources.length, 0);
  assert.equal(run.decision, "HELD_FOR_DATA_SPINE");
  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.ok(run.missing_evidence.includes("AI_FLUENCY_AGGREGATE_REQUIRED"));
  assert.equal(run.feeds.measurement_cell_assembly_run, false);
  assert.equal(run.feeds.finance_context_investigation, false);
  assert.equal(run.feeds.customer_facing_financial_output, false);
});

test("operator intake adapter blocks invalid AI Fluency parser runs before operator source handoff", () => {
  const plan = fullPlan();
  const record = aiFluencyAggregateRecord(plan, {
    org_id: "",
    source_ref: "ai_fluency_support_day_30_missing_org"
  });
  const parseRun = parseRunFromAIFluencyRecords(
    [record],
    "ai_fluency_aggregate_export_parse_operator_invalid_day_30"
  );
  const dashboardRun = buildAIFluencyDashboardImportRun({
    dashboardExport: parseRun.dashboard_export,
    runId: "ai_fluency_dashboard_import_operator_invalid_day_30",
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const handoff = buildAIFluencyOperatorSourceHandoff({
    parseRun,
    dashboardImportRun: dashboardRun,
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const handoffValidation = validateAIFluencyOperatorSourceHandoff(handoff);

  assert.equal(validateAIFluencyAggregateExportParseRun(parseRun).valid, false);
  assert.equal(handoff.decision, "BLOCKED");
  assert.equal(handoffValidation.valid, false);
  assert.equal(handoff.operator_source, null);
  assert.equal(handoff.ai_fluency_context, null);
  assert.equal(handoff.feeds.operator_intake_source, false);
  assert.equal(handoff.feeds.measurement_cell_context_fragment, false);
  assert.equal(handoff.feeds.finance_context_investigation, false);
  assert.equal(handoff.feeds.confidence_model, false);
  assert.equal(handoff.feeds.customer_facing_financial_output, false);
});

test("operator intake adapter holds when reviewed source packages are missing", () => {
  const run = buildOperatorIntakeAdapterRun(baseOperatorInput({
    sourcePackages: [],
    runId: "operator_intake_adapter_run_missing_source_packages"
  }));
  const result = validateOperatorIntakeAdapterRun(run);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(run.decision, "HELD_FOR_SOURCE_PACKAGE_REVIEW");
  assert.equal(run.source_package_review_queue.queue_state, "HELD_FOR_SOURCE_REVIEW");
  assert.equal(run.measurement_cell_assembly_run.decision, "HELD_FOR_SOURCE_PACKAGE_REVIEW");
  assert.ok(run.missing_evidence.includes("AI_FLUENCY_SOURCE_PACKAGE_REQUIRED"));
  assert.ok(run.missing_evidence.includes("VBD_TOKEN_SOURCE_PACKAGE_REQUIRED"));
  assert.equal(run.feeds.measurement_cell_assembly_run, false);
  assert.equal(run.feeds.value_hypothesis_packet_runner, false);
});

test("operator intake adapter blocks suppressed source packages from rescuing assembly", () => {
  const input = baseOperatorInput();
  input.sourcePackages = clone(input.sourcePackages);
  const layer1 = input.sourcePackages.find((pkg) =>
    pkg.source_package_type === "layer_1_bigquery_telemetry_summary"
  );
  layer1.evidence_state = "suppressed";
  layer1.k_min_posture = {
    minimum_cohort_threshold: 5,
    cohort_threshold_met: false,
    total_slices: 12,
    k_min_clear_slices: 11,
    suppressed_or_unknown_slices: 1
  };
  input.runId = "operator_intake_adapter_run_suppressed_source_package";

  const run = buildOperatorIntakeAdapterRun(input);
  const result = validateOperatorIntakeAdapterRun(run);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(run.decision, "HELD_FOR_SOURCE_PACKAGE_REVIEW");
  assert.equal(run.source_package_review_queue.queue_state, "HELD_FOR_SOURCE_REVIEW");
  assert.ok(run.missing_evidence.includes("VBD_TOKEN_SOURCE_PACKAGE_NOT_FEEDABLE"));
  assert.equal(run.feeds.measurement_cell_assembly_run, false);
  assert.equal(run.feeds.finance_context_investigation, false);
});

test("operator intake adapter holds package context drift even when org window and source ref match", () => {
  const input = baseOperatorInput();
  input.sourcePackages = clone(input.sourcePackages);
  const layer3 = input.sourcePackages.find((pkg) =>
    pkg.source_package_type === "layer_3_business_system_of_record_outcome_export"
  );
  layer3.workflow_family = "other_workflow_family";
  layer3.function_area = input.functionArea;
  layer3.cohort_key = input.cohortKey;
  layer3.metric_id = input.measurementPlan.metric_selection.primary_metric.metric_id;
  input.runId = "operator_intake_adapter_run_package_context_drift";

  const run = buildOperatorIntakeAdapterRun(input);
  const result = validateOperatorIntakeAdapterRun(run);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(run.decision, "HELD_FOR_SOURCE_PACKAGE_REVIEW");
  assert.equal(run.source_package_review_queue.queue_state, "HELD_FOR_SOURCE_REVIEW");
  assert.ok(run.missing_evidence.includes("CUSTOMER_METRIC_SOURCE_PACKAGE_MISALIGNED"));
  assert.equal(run.feeds.measurement_cell_assembly_run, false);
  assert.equal(run.feeds.value_hypothesis_packet_runner, false);
});

test("operator intake adapter fails closed on source-ref drift before producing a packet handoff", () => {
  const input = baseOperatorInput();
  input.measurementCellInput = measurementCellInput(input.measurementPlan, input.sources, {
    selectedMetric: {
      ...input.measurementCellInput.selectedMetric,
      source_ref: "other_metric_source_ref"
    }
  });
  input.runId = "operator_intake_adapter_run_source_ref_drift";

  const run = buildOperatorIntakeAdapterRun(input);
  const result = validateOperatorIntakeAdapterRun(run);

  assert.equal(run.decision, "BLOCKED");
  assert.equal(result.valid, false);
  assert.equal(result.feeds.measurement_cell_assembly_run, false);
  assert.equal(result.feeds.value_hypothesis_packet_runner, false);
  assert.ok(result.gaps.some((gap) => gap.includes("measurement_cell_assembly_run")));
  assert.ok(result.gaps.some((gap) => gap.includes("selectedMetric.source_ref")));
});

test("operator intake adapter rejects stale embedded validation after source tampering", () => {
  const run = buildOperatorIntakeAdapterRun(baseOperatorInput({
    runId: "operator_intake_adapter_run_stale_validation"
  }));
  run.data_spine_readiness.source_readiness.customer_metric.source_ref = null;

  const result = validateOperatorIntakeAdapterRun(run);

  assert.equal(result.valid, false);
  assert.equal(result.feeds.measurement_cell_assembly_run, false);
  assert.equal(result.feeds.value_hypothesis_packet_runner, false);
  assert.ok(result.gaps.some((gap) => gap.includes("data_spine_validation_result")));
  assert.ok(result.gaps.some((gap) => gap.includes("Data Spine validation")));
});

test("held operator intake adapter runs cannot forge Measurement Cell Assembly feed", () => {
  const run = buildOperatorIntakeAdapterRun(baseOperatorInput({
    sourcePackages: [],
    runId: "operator_intake_adapter_run_forged_held_feed"
  }));
  run.feeds.measurement_cell_assembly_run = true;

  const result = validateOperatorIntakeAdapterRun(run);

  assert.equal(result.valid, false);
  assert.equal(result.feeds.measurement_cell_assembly_run, false);
  assert.ok(result.gaps.some((gap) =>
    gap.includes("held or blocked operator intake runs cannot feed Measurement Cell Assembly")
  ));
  assert.ok(result.gaps.some((gap) =>
    gap.includes("feeds.measurement_cell_assembly_run must match recomputed operator intake decision")
  ));
});

test("operator intake adapter rejects unsafe string values in adapter-owned fields", () => {
  const run = buildOperatorIntakeAdapterRun(baseOperatorInput({
    runId: "operator_intake_adapter_run_unsafe_string_values"
  }));
  run.required_caveats.push("raw_prompt jane@example.com");
  run.missing_evidence.push("employee_email:jane@example.com");
  run.time_series_readiness.note = "select * from raw_events";

  const result = validateOperatorIntakeAdapterRun(run);

  assert.equal(result.valid, false);
  assert.equal(result.feeds.measurement_cell_assembly_run, false);
  assert.ok(result.gaps.some((gap) => gap.includes("required_caveats")));
  assert.ok(result.gaps.some((gap) => gap.includes("missing_evidence")));
  assert.ok(result.gaps.some((gap) => gap.includes("time_series_readiness.note")));
});

test("operator intake adapter rejects confidence, probability, raw, route, persistence, and financial side doors", () => {
  const run = buildOperatorIntakeAdapterRun(baseOperatorInput({
    runId: "operator_intake_adapter_run_unsafe"
  }));
  run.confidence_percentage = 88;
  run.contribution_probability = 0.91;
  run.raw_rows = [{ user_id: "u_123" }];
  run.backend_route = "/api/operator-intake";
  run.creates_backend_routes = true;
  run.persistence_table = "operator_intake_runs";
  run.financial_output = true;
  run.customer_facing_financial_output_allowed = true;
  run.feeds.value_hypothesis_packet_runner = true;
  run.feeds.finance_context_investigation = true;

  const result = validateOperatorIntakeAdapterRun(run);

  assert.equal(result.valid, false);
  assert.equal(result.feeds.measurement_cell_assembly_run, false);
  assert.equal(result.feeds.value_hypothesis_packet_runner, false);
  assert.equal(result.feeds.finance_context_investigation, false);
  assert.equal(result.feeds.customer_facing_financial_output, false);
  assert.ok(result.gaps.some((gap) => gap.includes("confidence_percentage")));
  assert.ok(result.gaps.some((gap) => gap.includes("contribution_probability")));
  assert.ok(result.gaps.some((gap) => gap.includes("raw_rows")));
  assert.ok(result.gaps.some((gap) => gap.includes("backend_route")));
  assert.ok(result.gaps.some((gap) => gap.includes("creates_backend_routes")));
  assert.ok(result.gaps.some((gap) => gap.includes("persistence_table")));
  assert.ok(result.gaps.some((gap) => gap.includes("financial_output")));
  assert.ok(result.gaps.some((gap) => gap.includes("customer_facing_financial_output_allowed")));
  assert.ok(result.gaps.some((gap) => gap.includes("feeds.value_hypothesis_packet_runner")));
  assert.ok(result.gaps.some((gap) => gap.includes("feeds.finance_context_investigation")));
});
