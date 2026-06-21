import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  AI_VALUE_OPERATOR_INTAKE_ADAPTER_RUN_SCHEMA_VERSION,
  buildOperatorIntakeAdapterRun,
  validateMeasurementCellAssemblyRun,
  validateOperatorIntakeAdapterRun
} from "../shared/dist/aiValueEngine/index.js";

const CONTRACTS = "docs/contracts";
const SOURCE_PACKAGE_EXAMPLES = "docs/contracts/ai-value-source-packages/examples";

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
      value_route: plan.value_hypothesis.value_route,
      value_promise: plan.value_hypothesis.hypothesis_statement,
      expected_metric_id: plan.metric_selection.primary_metric.metric_id,
      expected_metric_direction: "decrease",
      expected_metric_lag_days: 30,
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
  assert.equal(run.decision, "READY_FOR_VALUE_HYPOTHESIS_PACKET_PREPARATION");
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
