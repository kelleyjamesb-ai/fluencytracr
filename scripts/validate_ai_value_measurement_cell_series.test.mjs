import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  AI_VALUE_MEASUREMENT_CELL_SERIES_SCHEMA_VERSION,
  buildBlueprintExtractionDraft,
  buildBlueprintOperatorSourceHandoff,
  buildMeasurementCellSeries,
  buildOperatorIntakeAdapterRun,
  validateMeasurementCellAssemblyRun,
  validateMeasurementCellSeries
} from "../shared/dist/aiValueEngine/index.js";

const CONTRACTS = "docs/contracts";
const SOURCE_PACKAGE_EXAMPLES = "docs/contracts/ai-value-source-packages/examples";
const MILESTONE_DAYS = [0, 30, 60, 90, 180, 365];

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const clone = (value) => JSON.parse(JSON.stringify(value));
const assemblyRunCache = new Map();

function hasNestedKey(value, key) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => hasNestedKey(item, key));
  return Object.entries(value).some(([nestedKey, nestedValue]) =>
    nestedKey === key || hasNestedKey(nestedValue, key)
  );
}

function addDays(date, days) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function windowForDay(day) {
  const launch = new Date(Date.UTC(2026, 0, 1));
  const comparisonStart = addDays(launch, day);
  return {
    baselineWindow: {
      window_start: isoDate(addDays(launch, -30)),
      window_end: isoDate(addDays(launch, -1))
    },
    comparisonWindow: {
      window_start: isoDate(comparisonStart),
      window_end: isoDate(addDays(comparisonStart, 29))
    }
  };
}

function fullPlan(day = 30, overrides = {}) {
  const plan = clone(readJson(`${CONTRACTS}/ai-value-measurement-plan/examples/full-playbook-ready-plan.json`));
  const { baselineWindow, comparisonWindow } = windowForDay(day);
  plan.windows = {
    ...plan.windows,
    baseline_window_start: baselineWindow.window_start,
    baseline_window_end: baselineWindow.window_end,
    comparison_window_start: comparisonWindow.window_start,
    comparison_window_end: comparisonWindow.window_end
  };
  return { ...plan, ...overrides };
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

function source(plan, day, overrides = {}) {
  const { baselineWindow, comparisonWindow } = windowsFromPlan(plan);
  return {
    state: "present",
    intake_mode: "structured_object",
    source_ref: `source_ref_day_${day}`,
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

function operatorSources(plan = fullPlan(), day = 30, overrides = {}) {
  return {
    blueprint: source(plan, day, {
      intake_mode: "blueprint_document_upload",
      source_ref: `blueprint_parse_support_approved_day_${day}`
    }),
    aiFluency: source(plan, day, {
      intake_mode: "ai_fluency_dashboard_export",
      source_ref: `ai_fluency_support_day_${day}`
    }),
    vbdToken: source(plan, day, {
      intake_mode: "scrubbed_glean_bigquery_export",
      source_ref: `scrubbed_glean_vbd_token_support_day_${day}`,
      connector_status: "scrubbed_export_only"
    }),
    customerMetric: source(plan, day, {
      intake_mode: "customer_metric_aggregate_export",
      source_ref: `support_metric_resolution_hours_day_${day}`,
      metric_id: "support_median_resolution_hours"
    }),
    assumption: source(plan, day, {
      intake_mode: "assumption_approval",
      source_ref: `support_assumption_approval_day_${day}`
    }),
    governance: source(plan, day, {
      intake_mode: "governance_attestation",
      source_ref: `support_governance_attestation_day_${day}`
    }),
    ...overrides
  };
}

function blueprintOperatorSourceHandoff(plan = fullPlan(), day = 30, sources = operatorSources(plan, day), overrides = {}) {
  const expectationPathId = overrides.expectationPathId ?? "expectation_path_resolution_time_capacity";
  const { baselineWindow, comparisonWindow } = windowsFromPlan(plan);
  const draft = buildBlueprintExtractionDraft({
    draftId: sources.blueprint.source_ref,
    orgId: plan.org_id,
    clientId: sources.blueprint.client_id,
    documentSourceRef: `blueprint_upload_support_approved_day_${day}`,
    extractionState: "parsed",
    approvalState: "approved",
    ownerRole: "customer_value_owner",
    approverRole: "customer_value_owner",
    workflowFamily: plan.workflow_scope.workflow_family,
    workflowName: "Support case resolution",
    functionArea: plan.workflow_scope.function_area,
    cohortKey: sources.blueprint.cohort_key,
    valueHypothesis: plan.value_hypothesis.hypothesis_statement,
    valueRoute: "CAPACITY_CREATION",
    baselineWindow,
    comparisonWindow,
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
      document_source_ref: `blueprint_upload_support_approved_day_${day}`,
      extraction_run_ref: `blueprint_extraction_support_approved_day_${day}`
    },
    generatedAt: "2026-06-22T00:00:00.000Z"
  });
  return buildBlueprintOperatorSourceHandoff({
    draft,
    generatedAt: "2026-06-22T00:00:00.000Z"
  });
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

function matchingSourcePackages(plan = fullPlan(), day = 30, sources = operatorSources(plan, day)) {
  return [
    sourcePackageExample("layer-2-user-voice-package.json", plan, {
      source_package_id: `source_package_layer_2_ai_fluency_series_day_${day}`,
      source_refs: {
        source_readiness_id: `source_readiness_ai_fluency_series_day_${day}`,
        aggregate_export_id: sources.aiFluency.source_ref
      }
    }),
    sourcePackageExample("layer-1-bigquery-telemetry-package.json", plan, {
      source_package_id: `source_package_layer_1_vbd_token_series_day_${day}`,
      source_refs: {
        source_readiness_id: `source_readiness_vbd_token_series_day_${day}`,
        aggregate_probe_id: sources.vbdToken.source_ref,
        reportability_signal_families: [
          "assistant",
          "search_document_retrieval",
          "agent_run"
        ]
      }
    }),
    sourcePackageExample("layer-3-system-of-record-outcome-package.json", plan, {
      source_package_id: `source_package_layer_3_customer_metric_series_day_${day}`,
      source_refs: {
        source_readiness_id: `source_readiness_customer_metric_series_day_${day}`,
        aggregate_outcome_export_id: sources.customerMetric.source_ref
      }
    }),
    sourcePackageExample("assumption-approval-package.json", plan, {
      source_package_id: `source_package_assumption_series_day_${day}`,
      source_refs: {
        source_readiness_id: `source_readiness_assumption_series_day_${day}`,
        assumption_approval_export_id: sources.assumption.source_ref
      }
    }),
    sourcePackageExample("governance-control-package.json", plan, {
      source_package_id: `source_package_governance_series_day_${day}`,
      source_refs: {
        source_readiness_id: `source_readiness_governance_series_day_${day}`,
        governance_control_export_id: sources.governance.source_ref
      }
    })
  ];
}

function baseExport(plan, day, evidenceLayer, overrides = {}) {
  return {
    schema_version: "FT_AI_VALUE_SCRUBBED_GLEAN_CLIENT_EXPORT_2026_06",
    export_id: `series_scrubbed_export_${evidenceLayer}_day_${day}`,
    request_id: `client_evidence_request_${plan.measurement_plan_id}_${evidenceLayer}_day_${day}`,
    org_id: plan.org_id,
    measurement_plan_id: plan.measurement_plan_id,
    evidence_layer: evidenceLayer,
    source_owner_role: "customer_data_owner",
    approver_role: "customer_data_owner",
    attestation: {
      attestation_state: "attested",
      attested_by_role: "customer_data_owner",
      attested_at: "2026-06-22T00:00:00.000Z",
      caveats: [
        "Already-parsed aggregate export summary only; no raw rows or identifiers retained."
      ]
    },
    generated_at: "2026-06-22T00:00:00.000Z",
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
    source_readiness_id: `source_readiness_${evidenceLayer}_day_${day}`,
    aggregate_probe_id: `aggregate_probe_${evidenceLayer}_day_${day}`,
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
    notes: ["Measurement Cell Series fixture uses aggregate metadata only."],
    caveats: ["Source export package is aggregate evidence input only."],
    ...overrides
  };
}

function fullExportPacket(plan = fullPlan(), day = 30) {
  return [
    baseExport(plan, day, "layer_1_platform_telemetry", {
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
    baseExport(plan, day, "layer_2_user_voice_empirical", {
      metric_or_signal_summary: {
        summary_type: "aggregate_export_metadata_summary",
        aggregate_signal_name: "aggregate_ai_fluency_baseline_summary",
        aggregate_value_present: true
      }
    }),
    baseExport(plan, day, "layer_3_business_system_outcomes", {
      metric_or_signal_summary: {
        summary_type: "customer_owned_aggregate_metric_summary",
        aggregate_metric_name: "aggregate_support_median_resolution_hours",
        aggregate_value_present: true
      }
    }),
    baseExport(plan, day, "governance_evidence", {
      metric_or_signal_summary: {
        summary_type: "governance_control_export_summary",
        aggregate_signal_name: "aggregate_governance_control_summary",
        aggregate_value_present: true
      }
    }),
    baseExport(plan, day, "assumption_evidence", {
      metric_or_signal_summary: {
        summary_type: "assumption_approval_export_summary",
        aggregate_signal_name: "aggregate_assumption_approval_summary",
        aggregate_value_present: true
      }
    })
  ];
}

function measurementCellInput(plan = fullPlan(), day = 30, sources = operatorSources(plan, day), overrides = {}) {
  const { baselineWindow, comparisonWindow } = windowsFromPlan(plan);
  const expectationPathId = overrides.expectationPathId ?? "expectation_path_resolution_time_capacity";
  const base = {
    orgId: plan.org_id,
    functionArea: plan.workflow_scope.function_area,
    workflowFamily: plan.workflow_scope.workflow_family,
    workflowId: "workflow_support_case_resolution",
    cohortKey: "workflow_family:customer_support_case_resolution|eligible_cases:2300",
    timeWindow: {
      time_window_id: `day_${day}`,
      window_label: `Day ${day}`,
      window_mode: "milestone",
      days_since_launch: day,
      cadence: "milestone",
      window_start: comparisonWindow.window_start,
      window_end: comparisonWindow.window_end,
      baseline_window: baselineWindow,
      comparison_window: comparisonWindow,
      prior_window_ref: day === 0 ? null : `measurement_cell_support_day_${Math.max(0, day - 30)}`
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
      assumption_refs: [sources.assumption.source_ref],
      source_ref: sources.blueprint.source_ref
    },
    aiFluencyContext: {
      evidence_state: "present",
      fluency_score: 70 + Math.min(day / 30, 8),
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
      velocity: 60 + Math.min(day / 6, 30),
      breadth: 58 + Math.min(day / 12, 30),
      depth: 57 + Math.min(day / 14, 30),
      integration_score: 65,
      overall_vbd_score: 66,
      prior_overall_vbd_score: day === 0 ? null : 49.4,
      vbd_quadrant: day < 60 ? "fast_but_shallow" : "high_fluency_flow",
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
      comparison_value: Math.max(10, 18 - day / 30),
      owner_approval_state: "approved",
      source_ref: sources.customerMetric.source_ref,
      suppression_state: "CLEAR"
    },
    tokenContext: {
      evidence_state: "present",
      token_total: 1200000 + day * 4000,
      token_per_active_seat: 6000 + day * 10,
      token_intensity_band: "moderate",
      source_ref: sources.vbdToken.source_ref
    },
    confounders: [
      {
        confounder_type: "support_case_mix",
        state: "documented",
        source_ref: `support_case_mix_day_${day}`
      }
    ],
    evidenceDesign: {
      design_type: day === 0 ? "baseline_only" : "matched_comparison",
      design_strength_tier: day === 0 ? "no_contribution_confidence" : "comparison_supported",
      comparison_cell_ref: day === 0 ? null : `measurement_cell_support_lower_exposure_day_${day}`,
      controls_documented: day !== 0,
      baseline_stability: "stable",
      source_ref: `support_research_design_day_${day}`
    },
    financeReviewContext: {
      finance_owner_state: day === 0 ? "business_owner_review" : "finance_context_review",
      financial_driver: "capacity_creation",
      metric_to_financial_driver_pathway:
        "Resolution time is reviewed as capacity context, not financial attribution.",
      source_ref: `finance_context_support_day_${day}`
    },
    governance: {
      review_state: day === 0 ? "BUSINESS_OWNER_REVIEW_READY" : "FINANCE_CONTEXT_INVESTIGATION_READY"
    }
  };
  const { expectationPathId: _expectationPathId, ...restOverrides } = overrides;
  return { ...base, ...restOverrides, timeWindow: { ...base.timeWindow, ...(restOverrides.timeWindow ?? {}) } };
}

function operatorInputForDay(day = 30, overrides = {}) {
  const plan = fullPlan(day);
  const sourceOverrides = overrides.sources;
  const providedHandoff = Object.prototype.hasOwnProperty.call(
    overrides,
    "blueprintOperatorSourceHandoff"
  )
    ? overrides.blueprintOperatorSourceHandoff
    : undefined;
  const initialSources = sourceOverrides ?? operatorSources(plan, day);
  const blueprintHandoff = providedHandoff === undefined
    ? blueprintOperatorSourceHandoff(plan, day, initialSources)
    : providedHandoff;
  const sources = blueprintHandoff?.operator_source
    ? { ...initialSources, blueprint: blueprintHandoff.operator_source }
    : initialSources;
  const measurementInput = overrides.measurementCellInput ??
    measurementCellInput(plan, day, sources, {
      ...(blueprintHandoff?.blueprint_alignment_context
        ? { blueprintAlignment: blueprintHandoff.blueprint_alignment_context }
        : {})
    });
  const {
    sources: _sources,
    blueprintOperatorSourceHandoff: _blueprintOperatorSourceHandoff,
    measurementCellInput: _measurementCellInput,
    sourcePackages: _sourcePackages,
    ...restOverrides
  } = overrides;
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
    sourcePackages: _sourcePackages ?? matchingSourcePackages(plan, day, sources),
    scrubbedGleanExports: fullExportPacket(plan, day),
    blueprintOperatorSourceHandoff: blueprintHandoff,
    measurementCellInput: measurementInput,
    runId: `operator_intake_adapter_run_support_day_${day}`,
    generatedAt: "2026-06-22T00:00:00.000Z",
    ...restOverrides
  };
}

function assemblyRunForDay(day = 30, overrides = {}) {
  if (Object.keys(overrides).length === 0 && assemblyRunCache.has(day)) {
    return clone(assemblyRunCache.get(day));
  }
  const run = buildOperatorIntakeAdapterRun(operatorInputForDay(day, overrides));
  if (Object.keys(overrides).length === 0) {
    assemblyRunCache.set(day, clone(run.measurement_cell_assembly_run));
  }
  return run.measurement_cell_assembly_run;
}

function suppressedAssemblyRunForDay(day = 90) {
  const plan = fullPlan(day);
  const sources = operatorSources(plan, day, {
    vbdToken: source(plan, day, {
      intake_mode: "scrubbed_glean_bigquery_export",
      source_ref: `scrubbed_glean_vbd_token_support_day_${day}`,
      connector_status: "scrubbed_export_only",
      state: "suppressed",
      review_state: "suppressed"
    })
  });
  return assemblyRunForDay(day, {
    sources,
    sourcePackages: [],
    scrubbedGleanExports: []
  });
}

function baseSeriesInput(days = MILESTONE_DAYS, overrides = {}) {
  const seedPlan = fullPlan(days[0] ?? 30);
  return {
    measurementCellSeriesId: "measurement_cell_series_support_case_resolution",
    orgId: seedPlan.org_id,
    clientId: "client_example",
    workflowFamily: seedPlan.workflow_scope.workflow_family,
    functionArea: seedPlan.workflow_scope.function_area,
    cohortKey: "workflow_family:customer_support_case_resolution|eligible_cases:2300",
    windows: days.map((day) => ({
      milestoneDay: day,
      measurementCellAssemblyRun: assemblyRunForDay(day)
    })),
    generatedAt: "2026-06-22T00:00:00.000Z",
    ...overrides
  };
}

test("measurement cell series emits continuity manifest only for a complete Day 0 through Day 365 milestone series", () => {
  const series = buildMeasurementCellSeries(baseSeriesInput());
  const result = validateMeasurementCellSeries(series);

  assert.equal(series.schema_version, AI_VALUE_MEASUREMENT_CELL_SERIES_SCHEMA_VERSION);
  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(series.decision, "CONTINUITY_COVERAGE_COMPLETE");
  assert.deepEqual(series.evidence_continuity_manifest.required_milestone_days, MILESTONE_DAYS);
  assert.equal(series.evidence_continuity_manifest.complete_milestone_series, true);
  assert.equal(series.evidence_continuity_manifest.ready_windows, 6);
  assert.equal(series.evidence_continuity_manifest.held_windows, 0);
  assert.equal(series.evidence_continuity_manifest.suppressed_windows, 0);
  assert.equal(series.evidence_continuity_manifest.missing_windows, 0);
  assert.equal(series.evidence_continuity_manifest.blocked_windows, 0);
  assert.equal(series.repeated_measurement_cell_refs.length, 6);
  assert.equal(series.measurement_cell_windows.length, 6);
  assert.deepEqual(
    series.evidence_continuity_manifest.windows.map((window) => window.status),
    ["ready", "ready", "ready", "ready", "ready", "ready"]
  );
  for (const forbiddenKey of [
    "measurement_cell_input",
    "measurement_cell",
    "data_spine_readiness",
    "source_package_review_queue",
    "real_data_intake_packet_run",
    "measurement_cell_assembly_run",
    "time_series_readiness",
    "governed_run_references"
  ]) {
    assert.equal(hasNestedKey(series, forbiddenKey), false, `${forbiddenKey} must not leak`);
  }
  assert.ok(!JSON.stringify(series).includes("READY_FOR_CONFIDENCE_MODEL_DESIGN_REVIEW"));
  assert.equal(series.alignment_manifest.aligned, true);
  assert.equal(series.alignment_manifest.trend_math_emitted, false);
  assert.equal(series.alignment_manifest.confidence_math_emitted, false);
  assert.equal(series.feeds.internal_series_review, true);
  assert.equal(series.feeds.operator_time_series_preparation_compatibility, true);
  assert.equal(series.feeds.confidence_model, false);
  assert.equal(series.feeds.finance_context_investigation, false);
  assert.equal(series.feeds.customer_facing_financial_output, false);
});

test("measurement cell series holds for missing, held, suppressed, or blocked windows with false downstream feeds", () => {
  const blockedRun = assemblyRunForDay(180);
  blockedRun.decision = "BLOCKED";
  const windows = [
    { milestoneDay: 0, measurementCellAssemblyRun: assemblyRunForDay(0) },
    { milestoneDay: 30, measurementCellAssemblyRun: assemblyRunForDay(30, { sourcePackages: [] }) },
    { milestoneDay: 60 },
    { milestoneDay: 90, measurementCellAssemblyRun: suppressedAssemblyRunForDay(90) },
    { milestoneDay: 180, measurementCellAssemblyRun: blockedRun },
    { milestoneDay: 365, measurementCellAssemblyRun: assemblyRunForDay(365) }
  ];

  const series = buildMeasurementCellSeries(baseSeriesInput([], { windows }));
  const result = validateMeasurementCellSeries(series);
  const manifest = series.evidence_continuity_manifest;

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(series.decision, "HELD_FOR_EVIDENCE_CONTINUITY");
  assert.equal(manifest.ready_windows, 2);
  assert.equal(manifest.held_windows, 1);
  assert.equal(manifest.missing_windows, 1);
  assert.equal(manifest.suppressed_windows, 1);
  assert.equal(manifest.blocked_windows, 1);
  assert.equal(manifest.windows.length, 6);
  assert.deepEqual(manifest.observed_milestone_days, MILESTONE_DAYS);
  assert.deepEqual(
    manifest.windows.map((window) => window.status),
    ["ready", "held", "missing", "suppressed", "blocked", "ready"]
  );
  assert.equal(series.feeds.internal_series_review, false);
  assert.equal(series.feeds.operator_time_series_preparation_compatibility, false);
  assert.equal(series.feeds.confidence_model, false);
  assert.equal(series.feeds.finance_context_investigation, false);
  assert.equal(series.feeds.customer_facing_financial_output, false);
});

test("measurement cell series blocks cross-window identity, metric, window, and source-ref drift", () => {
  const driftCases = [
    {
      label: "org_id",
      mutate: (run) => {
        run.org_id = "org_other";
      },
      expected: /org_id/i
    },
    {
      label: "client_id",
      mutate: (run) => {
        run.client_id = "client_other";
      },
      expected: /client_id/i
    },
    {
      label: "workflow_family",
      mutate: (run) => {
        run.workflow_family = "other_workflow";
      },
      expected: /workflow_family/i
    },
    {
      label: "function_area",
      mutate: (run) => {
        run.function_area = "other_function";
      },
      expected: /function_area/i
    },
    {
      label: "cohort_key",
      mutate: (run) => {
        run.cohort_key = "workflow_family:other|eligible_cases:2300";
      },
      expected: /cohort_key/i
    },
    {
      label: "metric_id",
      mutate: (run) => {
        run.measurement_cell.selected_metric.metric_id = "other_metric";
      },
      expected: /metric_id/i
    },
    {
      label: "source_ref",
      mutate: (run) => {
        run.measurement_cell.source_refs.metric_source_ref = "other_metric_source_ref";
      },
      expected: /source_ref/i
    }
  ];

  for (const driftCase of driftCases) {
    const windows = MILESTONE_DAYS.map((day) => ({
      milestoneDay: day,
      measurementCellAssemblyRun: assemblyRunForDay(day)
    }));
    driftCase.mutate(windows[2].measurementCellAssemblyRun);

    const series = buildMeasurementCellSeries(baseSeriesInput([], { windows }));
    const result = validateMeasurementCellSeries(series);

    assert.equal(series.decision, "BLOCKED", driftCase.label);
    assert.equal(result.valid, false, driftCase.label);
    assert.ok(result.gaps.some((gap) => driftCase.expected.test(gap)), driftCase.label);
    assert.equal(result.feeds.operator_time_series_preparation_compatibility, false);
  }

  const duplicateWindow = buildMeasurementCellSeries(baseSeriesInput([0, 30, 30, 60, 90, 180]));
  const duplicateResult = validateMeasurementCellSeries(duplicateWindow);
  assert.equal(duplicateWindow.decision, "BLOCKED");
  assert.equal(duplicateResult.valid, false);
  assert.ok(duplicateResult.gaps.some((gap) => /repeated milestone day 30/i.test(gap)));

  const unsupportedWindow = buildMeasurementCellSeries(baseSeriesInput([0, 30, 60, 90, 120, 180]));
  const unsupportedResult = validateMeasurementCellSeries(unsupportedWindow);
  assert.equal(unsupportedWindow.decision, "BLOCKED");
  assert.equal(unsupportedResult.valid, false);
  assert.ok(unsupportedResult.gaps.some((gap) => /unsupported milestone day 120/i.test(gap)));
});

test("measurement cell series blocks same-metric expectation path drift across milestone windows", () => {
  const windows = MILESTONE_DAYS.map((day) => ({
    milestoneDay: day,
    measurementCellAssemblyRun: day === 60
      ? assemblyRunForDay(day, {
          measurementCellInput: measurementCellInput(
            fullPlan(day),
            day,
            operatorSources(fullPlan(day), day),
            { expectationPathId: "expectation_path_resolution_time_quality" }
          )
        })
      : assemblyRunForDay(day)
  }));

  const series = buildMeasurementCellSeries(baseSeriesInput([], { windows }));
  const result = validateMeasurementCellSeries(series);

  assert.equal(series.decision, "BLOCKED");
  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) => /expectation_path_id/i.test(gap)));
  assert.equal(result.feeds.operator_time_series_preparation_compatibility, false);
  assert.equal(result.feeds.confidence_model, false);
  assert.equal(result.feeds.finance_context_investigation, false);
});

test("measurement cell series blocks stale embedded Measurement Cell Assembly validation", () => {
  const staleRun = assemblyRunForDay(30);
  const staleValidation = validateMeasurementCellAssemblyRun(staleRun);
  staleValidation.valid = false;
  staleValidation.gaps = ["stale validation copied from an older assembly run"];

  const windows = MILESTONE_DAYS.map((day) => ({
    milestoneDay: day,
    measurementCellAssemblyRun: day === 30 ? staleRun : assemblyRunForDay(day),
    measurementCellAssemblyValidationResult: day === 30 ? staleValidation : undefined
  }));

  const series = buildMeasurementCellSeries(baseSeriesInput([], { windows }));
  const result = validateMeasurementCellSeries(series);

  assert.equal(series.decision, "BLOCKED");
  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) =>
    /measurement_cell_assembly_validation_result must match recomputed/i.test(gap)
  ));
  assert.equal(result.feeds.confidence_model, false);
  assert.equal(result.feeds.finance_context_investigation, false);
});

test("measurement cell series blocks unsafe raw, identifier, ROI, confidence, probability, finance, and direct-feed side doors", () => {
  const forbiddenMutations = [
    ["raw_rows", (series) => { series.raw_rows = [{ unsafe: "raw" }]; }],
    ["user_id", (series) => { series.review_context = { user_id: "person_123" }; }],
    ["roi", (series) => { series.review_context = { roi: 250000 }; }],
    ["confidence", (series) => { series.confidence_model = { confidence_score: 0.91 }; }],
    ["probability", (series) => { series.probability = 0.92; }],
    ["finance", (series) => { series.feeds.finance_context_investigation = true; }],
    ["measurement_cell_direct_feed", (series) => { series.feeds.measurement_cell_direct_feed = true; }],
    ["unsafe_source_ref", (series) => {
      series.repeated_measurement_cell_refs[0].source_refs.metric_source_ref =
        "raw_rows_user_id_roi_confidence_probability_finance_context";
    }]
  ];

  for (const [label, mutate] of forbiddenMutations) {
    const series = buildMeasurementCellSeries(baseSeriesInput());
    mutate(series);
    const result = validateMeasurementCellSeries(series);

    assert.equal(result.valid, false, label);
    assert.equal(result.feeds.confidence_model, false, label);
    assert.equal(result.feeds.finance_context_investigation, false, label);
    assert.equal(result.feeds.customer_facing_financial_output, false, label);
  }
});

test("measurement cell series rejects direct-reference bypass and nested child payload leakage", () => {
  const forgedBareRef = buildMeasurementCellSeries(baseSeriesInput());
  forgedBareRef.measurement_cell_windows[0].validation_source = "direct_reference_only";
  forgedBareRef.measurement_cell_windows[0].validation_summary.run_id = "forged_assembly_ref";
  let result = validateMeasurementCellSeries(forgedBareRef);

  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) =>
    /validation_source must be recomputed_measurement_cell_assembly_run/i.test(gap)
  ));
  assert.ok(result.gaps.some((gap) =>
    /validation_summary\.run_id must match measurement_cell_assembly_run_id/i.test(gap)
  ));

  const directBypass = buildMeasurementCellSeries(baseSeriesInput());
  directBypass.repeated_measurement_cell_refs[0].measurement_cell =
    assemblyRunForDay(0).measurement_cell;
  result = validateMeasurementCellSeries(directBypass);

  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) =>
    /repeated_measurement_cell_refs\.0\.measurement_cell/i.test(gap)
  ));
  assert.equal(result.feeds.operator_time_series_preparation_compatibility, false);

  const nestedLeak = buildMeasurementCellSeries(baseSeriesInput());
  nestedLeak.evidence_continuity_manifest.windows[0].diagnostics = {
    raw_rows: [{ user_id: "person_123", prompt: "unsafe raw prompt" }],
    source_package_review_queue: assemblyRunForDay(0).source_package_review_queue,
    data_spine_readiness: assemblyRunForDay(0).data_spine_readiness
  };
  result = validateMeasurementCellSeries(nestedLeak);

  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) =>
    /evidence_continuity_manifest\.windows\.0\.diagnostics\.raw_rows/i.test(gap)
  ));
  assert.ok(result.gaps.some((gap) =>
    /source_package_review_queue/i.test(gap)
  ));
  assert.equal(result.feeds.confidence_model, false);
});

test("measurement cell series rejects unsafe finance and confidence wording in otherwise compact fields", () => {
  const series = buildMeasurementCellSeries(baseSeriesInput());
  series.evidence_continuity_manifest.windows[0].operator_note =
    "Finance context investigation is ready with 90% confidence for customer-facing ROI output.";
  const result = validateMeasurementCellSeries(series);

  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) => /Unsafe field value detected/i.test(gap)));
  assert.equal(result.feeds.confidence_model, false);
  assert.equal(result.feeds.finance_context_investigation, false);
  assert.equal(result.feeds.customer_facing_financial_output, false);
});

test("measurement cell series compatibility never implies confidence model, finance readiness, ROI, or customer-facing output", () => {
  const series = buildMeasurementCellSeries(baseSeriesInput());
  const result = validateMeasurementCellSeries(series);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(series.operator_time_series_compatibility.compatible_with_operator_time_series_preparation, true);
  assert.equal(series.operator_time_series_compatibility.creates_parallel_orchestration_object, false);
  assert.equal(series.operator_time_series_compatibility.confidence_model_feed, false);
  assert.equal(series.operator_time_series_compatibility.finance_context_investigation_feed, false);
  assert.equal(series.operator_time_series_compatibility.customer_facing_financial_output_feed, false);
  assert.equal(series.operator_time_series_compatibility.roi_or_financial_output_ready, false);
  assert.equal(series.feeds.internal_series_review, true);
  assert.equal(series.feeds.operator_time_series_preparation_compatibility, true);
  assert.equal(series.feeds.confidence_model, false);
  assert.equal(series.feeds.finance_context_investigation, false);
  assert.equal(series.feeds.customer_facing_financial_output, false);
  assert.ok(!Object.hasOwn(series, "roi"));
  assert.ok(!Object.hasOwn(series, "confidence_score"));
  assert.ok(!Object.hasOwn(series, "probability"));
});
