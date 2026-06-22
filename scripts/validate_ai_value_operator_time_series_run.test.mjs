import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  AI_VALUE_OPERATOR_TIME_SERIES_RUN_SCHEMA_VERSION,
  buildOperatorIntakeAdapterRun,
  buildOperatorTimeSeriesRun,
  validateOperatorTimeSeriesRun
} from "../shared/dist/aiValueEngine/index.js";

const CONTRACTS = "docs/contracts";
const SOURCE_PACKAGE_EXAMPLES = "docs/contracts/ai-value-source-packages/examples";
const MILESTONE_DAYS = [0, 30, 60, 90, 180, 365];

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const clone = (value) => JSON.parse(JSON.stringify(value));

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
      source_package_id: `source_package_layer_2_ai_fluency_operator_day_${day}`,
      source_refs: {
        source_readiness_id: `source_readiness_ai_fluency_operator_day_${day}`,
        aggregate_export_id: sources.aiFluency.source_ref
      }
    }),
    sourcePackageExample("layer-1-bigquery-telemetry-package.json", plan, {
      source_package_id: `source_package_layer_1_vbd_token_operator_day_${day}`,
      source_refs: {
        source_readiness_id: `source_readiness_vbd_token_operator_day_${day}`,
        aggregate_probe_id: sources.vbdToken.source_ref,
        reportability_signal_families: [
          "assistant",
          "search_document_retrieval",
          "agent_run"
        ]
      }
    }),
    sourcePackageExample("layer-3-system-of-record-outcome-package.json", plan, {
      source_package_id: `source_package_layer_3_customer_metric_operator_day_${day}`,
      source_refs: {
        source_readiness_id: `source_readiness_customer_metric_operator_day_${day}`,
        aggregate_outcome_export_id: sources.customerMetric.source_ref
      }
    }),
    sourcePackageExample("assumption-approval-package.json", plan, {
      source_package_id: `source_package_assumption_operator_day_${day}`,
      source_refs: {
        source_readiness_id: `source_readiness_assumption_operator_day_${day}`,
        assumption_approval_export_id: sources.assumption.source_ref
      }
    }),
    sourcePackageExample("governance-control-package.json", plan, {
      source_package_id: `source_package_governance_operator_day_${day}`,
      source_refs: {
        source_readiness_id: `source_readiness_governance_operator_day_${day}`,
        governance_control_export_id: sources.governance.source_ref
      }
    })
  ];
}

function baseExport(plan, day, evidenceLayer, overrides = {}) {
  return {
    schema_version: "FT_AI_VALUE_SCRUBBED_GLEAN_CLIENT_EXPORT_2026_06",
    export_id: `operator_scrubbed_export_${evidenceLayer}_day_${day}`,
    request_id: `client_evidence_request_${plan.measurement_plan_id}_${evidenceLayer}_day_${day}`,
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
    notes: ["Operator time-series fixture uses aggregate metadata only."],
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
  const windowMode = overrides.timeWindow?.window_mode ?? "milestone";
  const base = {
    orgId: plan.org_id,
    functionArea: plan.workflow_scope.function_area,
    workflowFamily: plan.workflow_scope.workflow_family,
    workflowId: "workflow_support_case_resolution",
    cohortKey: "workflow_family:customer_support_case_resolution|eligible_cases:2300",
    timeWindow: {
      time_window_id: `${windowMode === "rolling_30_day" ? "rolling_30_day" : "day"}_${day}`,
      window_label: `${windowMode === "rolling_30_day" ? "Rolling 30 days ending day" : "Day"} ${day}`,
      window_mode: windowMode,
      days_since_launch: day,
      cadence: windowMode,
      window_start: comparisonWindow.window_start,
      window_end: comparisonWindow.window_end,
      baseline_window: baselineWindow,
      comparison_window: comparisonWindow,
      prior_window_ref: day === 0 ? null : `measurement_cell_support_day_${Math.max(0, day - 30)}`,
      window_day_count: windowMode === "rolling_30_day" ? 30 : undefined
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
  return { ...base, ...overrides, timeWindow: { ...base.timeWindow, ...(overrides.timeWindow ?? {}) } };
}

function operatorInputForDay(day = 30, overrides = {}) {
  const plan = fullPlan(day);
  const sources = operatorSources(plan, day);
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
    sourcePackages: matchingSourcePackages(plan, day, sources),
    scrubbedGleanExports: fullExportPacket(plan, day),
    measurementCellInput: measurementCellInput(plan, day, sources),
    runId: `operator_intake_adapter_run_support_day_${day}`,
    generatedAt: "2026-06-21T00:00:00.000Z",
    ...overrides
  };
}

function baseSeriesInput(days = MILESTONE_DAYS, overrides = {}) {
  const seedPlan = fullPlan(days[0] ?? 30);
  return {
    seriesId: "operator_time_series_support_case_resolution",
    orgId: seedPlan.org_id,
    clientId: "client_example",
    workflowFamily: seedPlan.workflow_scope.workflow_family,
    functionArea: seedPlan.workflow_scope.function_area,
    cohortKey: "workflow_family:customer_support_case_resolution|eligible_cases:2300",
    windows: days.map((day) => ({
      milestoneDay: day,
      operatorIntakeInput: operatorInputForDay(day)
    })),
    generatedAt: "2026-06-21T00:00:00.000Z",
    ...overrides
  };
}

test("operator time-series builds a complete Day 0 through Day 365 governed milestone series", () => {
  const series = buildOperatorTimeSeriesRun(baseSeriesInput());
  const result = validateOperatorTimeSeriesRun(series);

  assert.equal(series.schema_version, AI_VALUE_OPERATOR_TIME_SERIES_RUN_SCHEMA_VERSION);
  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(series.decision, "READY_FOR_CONFIDENCE_MODEL_DESIGN_REVIEW");
  assert.deepEqual(series.time_series_readiness.required_milestone_days, MILESTONE_DAYS);
  assert.equal(series.time_series_readiness.complete_milestone_series, true);
  assert.equal(series.time_series_readiness.rolling_30_day_context_only, false);
  assert.equal(series.time_windows.length, 6);
  assert.equal(series.governed_run_references.length, 6);
  assert.deepEqual(series.time_windows.map((window) => window.milestone_day), MILESTONE_DAYS);
  assert.equal(series.time_windows[0].operator_decision, "READY_FOR_VALUE_HYPOTHESIS_PACKET_PREPARATION");
  assert.equal(series.feeds.confidence_model, false);
  assert.equal(series.feeds.finance_context_investigation, false);
  assert.equal(series.feeds.customer_facing_financial_output, false);
  assert.equal(series.boundary_policy.creates_backend_routes, false);
  assert.equal(series.boundary_policy.creates_prisma_schema, false);
});

test("operator time-series holds when a milestone day is missing but keeps a valid governed structure", () => {
  const series = buildOperatorTimeSeriesRun(baseSeriesInput([0, 30, 60, 180, 365]));
  const result = validateOperatorTimeSeriesRun(series);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(series.decision, "HELD_FOR_INSUFFICIENT_GOVERNED_RUNS");
  assert.equal(series.time_series_readiness.complete_milestone_series, false);
  assert.ok(series.missing_evidence.includes("MISSING_MILESTONE_DAY_90"));
  assert.equal(series.feeds.confidence_model, false);
});

test("operator time-series keeps rolling 30-day runs as operating context only", () => {
  const rollingDays = [30, 60, 90];
  const series = buildOperatorTimeSeriesRun(baseSeriesInput(rollingDays, {
    seriesId: "operator_time_series_support_case_resolution_rolling_30_day",
    windows: rollingDays.map((day) => {
      const input = operatorInputForDay(day);
      input.measurementCellInput = measurementCellInput(
        input.measurementPlan,
        day,
        input.sources,
        {
          timeWindow: {
            window_mode: "rolling_30_day",
            cadence: "rolling_30_day",
            window_day_count: 30
          },
          governance: {
            review_state: "BUSINESS_OWNER_REVIEW_READY"
          },
          financeReviewContext: {
            finance_owner_state: "business_owner_review",
            financial_driver: "capacity_creation",
            metric_to_financial_driver_pathway:
              "Rolling context is reviewed as operating momentum only.",
            source_ref: `finance_context_support_rolling_day_${day}`
          }
        }
      );
      return {
        windowMode: "rolling_30_day",
        rollingWindowIndex: day / 30,
        operatorIntakeInput: input
      };
    })
  }));
  const result = validateOperatorTimeSeriesRun(series);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(series.decision, "HELD_FOR_OPERATING_CONTEXT_ONLY");
  assert.equal(series.time_series_readiness.rolling_30_day_context_only, true);
  assert.equal(series.time_series_readiness.complete_milestone_series, false);
  assert.equal(series.governed_run_references.length, 3);
  assert.equal(series.feeds.confidence_model, false);
  assert.ok(series.required_caveats.some((caveat) => /operating context/i.test(caveat)));
});

test("operator time-series fails closed when aligned identity drifts across windows", () => {
  const input = baseSeriesInput();
  input.windows[2].operatorIntakeInput = operatorInputForDay(60, {
    clientId: "client_other"
  });
  const series = buildOperatorTimeSeriesRun(input);
  const result = validateOperatorTimeSeriesRun(series);

  assert.equal(series.decision, "BLOCKED");
  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) => /client_id/i.test(gap)));
  assert.equal(result.feeds.confidence_model, false);
});

test("operator time-series rejects repeated and unsupported milestone days", () => {
  const repeated = buildOperatorTimeSeriesRun(baseSeriesInput([0, 30, 30, 60, 90, 180]));
  const repeatedResult = validateOperatorTimeSeriesRun(repeated);
  assert.equal(repeated.decision, "BLOCKED");
  assert.equal(repeatedResult.valid, false);
  assert.ok(repeatedResult.gaps.some((gap) => /repeated milestone day 30/i.test(gap)));

  const unsupported = buildOperatorTimeSeriesRun(baseSeriesInput([0, 30, 60, 90, 120, 180]));
  const unsupportedResult = validateOperatorTimeSeriesRun(unsupported);
  assert.equal(unsupported.decision, "BLOCKED");
  assert.equal(unsupportedResult.valid, false);
  assert.ok(unsupportedResult.gaps.some((gap) => /unsupported milestone day 120/i.test(gap)));
});

test("operator time-series cannot be rescued by later windows when a source-review window is held", () => {
  const input = baseSeriesInput();
  input.windows[1].operatorIntakeInput = operatorInputForDay(30, {
    sourcePackages: []
  });
  const series = buildOperatorTimeSeriesRun(input);
  const result = validateOperatorTimeSeriesRun(series);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(series.decision, "HELD_FOR_SOURCE_REVIEW");
  assert.ok(series.missing_evidence.includes("WINDOW_DAY_30_NOT_GOVERNED_RUN_REFERENCE_READY"));
  assert.equal(series.time_windows[1].governed_run_reference_ready, false);
  assert.equal(series.governed_run_references.length, 5);
  assert.equal(series.feeds.confidence_model, false);
});

test("operator time-series rejects stale embedded validation after nested operator run drift", () => {
  const series = buildOperatorTimeSeriesRun(baseSeriesInput());
  series.time_windows[1].operator_intake_run.org_id = "org_drift";
  const result = validateOperatorTimeSeriesRun(series);

  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) =>
    /operator_intake_validation_result must match recomputed/i.test(gap)
  ));
  assert.equal(result.feeds.confidence_model, false);
});

test("operator time-series fails closed when a prebuilt child operator run is invalid", () => {
  const invalidChildRun = buildOperatorIntakeAdapterRun(operatorInputForDay(30));
  invalidChildRun.raw_rows = [{ unsafe: "raw source row" }];
  const input = baseSeriesInput([30], {
    windows: [
      {
        milestoneDay: 30,
        operatorIntakeRun: invalidChildRun
      }
    ]
  });
  const series = buildOperatorTimeSeriesRun(input);
  const result = validateOperatorTimeSeriesRun(series);

  assert.equal(series.decision, "BLOCKED");
  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) => /invalid child operator intake runs cannot validate/i.test(gap)));
  assert.equal(result.feeds.confidence_model, false);
});

test("operator time-series rejects reserved window-alignment decision tampering", () => {
  const series = buildOperatorTimeSeriesRun(baseSeriesInput());
  series.decision = "HELD_FOR_WINDOW_ALIGNMENT";
  const result = validateOperatorTimeSeriesRun(series);

  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) => /decision is invalid: HELD_FOR_WINDOW_ALIGNMENT/i.test(gap)));
  assert.equal(result.feeds.confidence_model, false);
});

test("operator time-series rejects null or blank milestone day metadata", () => {
  for (const milestoneDay of [null, ""]) {
    const series = buildOperatorTimeSeriesRun(baseSeriesInput());
    series.time_windows[0].milestone_day = milestoneDay;
    const result = validateOperatorTimeSeriesRun(series);

    assert.equal(result.valid, false, `${String(milestoneDay)} should fail`);
    assert.ok(result.gaps.some((gap) => /requires numeric milestone_day/i.test(gap)));
    assert.equal(result.feeds.confidence_model, false);
  }
});

test("operator time-series does not coerce blank child milestone metadata to Day 0 when child window can infer day", () => {
  for (const daysSinceLaunch of [null, ""]) {
    const input = operatorInputForDay(30);
    input.measurementCellInput = measurementCellInput(
      input.measurementPlan,
      30,
      input.sources,
      {
        timeWindow: {
          days_since_launch: daysSinceLaunch
        }
      }
    );
    const series = buildOperatorTimeSeriesRun(baseSeriesInput([], {
      windows: [
        {
          operatorIntakeInput: input
        }
      ]
    }));
    const result = validateOperatorTimeSeriesRun(series);

    assert.equal(series.time_windows[0].milestone_day, 30);
    assert.notEqual(series.time_windows[0].milestone_day, 0, `${String(daysSinceLaunch)} should not infer Day 0`);
    assert.equal(result.valid, true, result.gaps.join("; "));
    assert.equal(series.decision, "HELD_FOR_INSUFFICIENT_GOVERNED_RUNS");
    assert.equal(result.feeds.confidence_model, false);
  }
});

test("operator time-series fails closed when child milestone metadata is blank and not inferable", () => {
  for (const daysSinceLaunch of [null, ""]) {
    const childRun = buildOperatorIntakeAdapterRun(operatorInputForDay(30));
    childRun.measurement_cell_assembly_run.measurement_cell.time_window = {
      ...childRun.measurement_cell_assembly_run.measurement_cell.time_window,
      time_window_id: "milestone_missing_day",
      window_label: "Missing milestone day",
      days_since_launch: daysSinceLaunch
    };
    const series = buildOperatorTimeSeriesRun(baseSeriesInput([], {
      windows: [
        {
          operatorIntakeRun: childRun
        }
      ]
    }));
    const result = validateOperatorTimeSeriesRun(series);

    assert.notEqual(series.time_windows[0].milestone_day, 0, `${String(daysSinceLaunch)} should not infer Day 0`);
    assert.equal(result.valid, false, `${String(daysSinceLaunch)} should fail closed`);
    assert.ok(result.gaps.some((gap) => /requires numeric milestone_day/i.test(gap)));
    assert.equal(result.feeds.confidence_model, false);
  }
});

test("operator time-series rejects unsafe allowed-use values and claim language", () => {
  const unsafeValues = [
    "confidence_model_execution",
    "finance_context_investigation",
    "customer_facing_financial_output",
    "realized_roi"
  ];
  for (const unsafeValue of unsafeValues) {
    const series = buildOperatorTimeSeriesRun(baseSeriesInput());
    series.allowed_uses = [...series.allowed_uses, unsafeValue];
    const result = validateOperatorTimeSeriesRun(series);

    assert.equal(result.valid, false, unsafeValue);
    assert.ok(result.gaps.some((gap) => gap.includes(unsafeValue)), unsafeValue);
    assert.equal(result.feeds.confidence_model, false);
  }

  const series = buildOperatorTimeSeriesRun(baseSeriesInput());
  series.time_series_readiness.note =
    "This proves ROI with 90% probability and productivity lift from AI.";
  const result = validateOperatorTimeSeriesRun(series);

  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) => /Unsafe claim language detected/i.test(gap)));
  assert.equal(result.feeds.confidence_model, false);
});

test("operator time-series rejects unsafe allowed-use variants and note-like strings", () => {
  const unsafeAllowedUses = [
    "roi_metric_selection",
    "probability_model_review",
    "finance_context_review",
    "customer_facing_financial_readout",
    "confidence_percentage_review"
  ];
  for (const unsafeValue of unsafeAllowedUses) {
    const series = buildOperatorTimeSeriesRun(baseSeriesInput());
    series.allowed_uses = [...series.allowed_uses, unsafeValue];
    const result = validateOperatorTimeSeriesRun(series);

    assert.equal(result.valid, false, unsafeValue);
    assert.ok(result.gaps.some((gap) => gap.includes("allowed_uses") && gap.includes(unsafeValue)), unsafeValue);
    assert.equal(result.feeds.confidence_model, false);
  }

  const series = buildOperatorTimeSeriesRun(baseSeriesInput());
  series.time_series_readiness.notes = [
    "Finance context investigation is ready for customer-facing financial readout."
  ];
  const result = validateOperatorTimeSeriesRun(series);

  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) => /Unsafe claim language detected: time_series_readiness\.notes/i.test(gap)));
  assert.equal(result.feeds.confidence_model, false);

  const singularNoteSeries = buildOperatorTimeSeriesRun(baseSeriesInput());
  singularNoteSeries.time_series_readiness.note =
    "Finance context investigation is ready for customer-facing financial output.";
  const singularNoteResult = validateOperatorTimeSeriesRun(singularNoteSeries);

  assert.equal(singularNoteResult.valid, false);
  assert.ok(singularNoteResult.gaps.some((gap) => /Unsafe claim language detected: time_series_readiness\.note/i.test(gap)));
  assert.equal(singularNoteResult.feeds.confidence_model, false);
});

test("operator time-series rejects spoofed child object keys outside validated window paths", () => {
  const series = buildOperatorTimeSeriesRun(baseSeriesInput());
  series.validation_summary.operator_intake_run = {
    raw_rows: [{ unsafe: "raw" }],
    user_id: "person_123",
    confidence_percentage: 0.9,
    roi: "unsafe"
  };
  const result = validateOperatorTimeSeriesRun(series);

  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) => /validation_summary.operator_intake_run.raw_rows/i.test(gap)));
  assert.equal(result.feeds.confidence_model, false);
});

test("operator time-series only exempts child object scans at numeric time-window paths", () => {
  const series = buildOperatorTimeSeriesRun(baseSeriesInput());
  series.time_windows = {
    malformed_window: {
      operator_intake_run: {
        raw_rows: [{ unsafe: "raw" }],
        user_id: "person_123"
      },
      operator_intake_validation_result: {
        confidence_percentage: 0.91
      }
    }
  };
  const result = validateOperatorTimeSeriesRun(series);

  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) =>
    /time_windows\.malformed_window\.operator_intake_run\.raw_rows/i.test(gap)
  ));
  assert.ok(result.gaps.some((gap) =>
    /time_windows\.malformed_window\.operator_intake_validation_result\.confidence_percentage/i.test(gap)
  ));
  assert.equal(result.feeds.confidence_model, false);
});

test("operator time-series rejects drifted derived references and summary counts", () => {
  const series = buildOperatorTimeSeriesRun(baseSeriesInput());
  series.governed_run_references[1].operator_run_id = "forged_operator_run";
  let result = validateOperatorTimeSeriesRun(series);
  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) => /governed_run_references must match time_windows/i.test(gap)));

  const summaryDrift = buildOperatorTimeSeriesRun(baseSeriesInput());
  summaryDrift.validation_summary.governed_run_reference_ready_windows = 999;
  result = validateOperatorTimeSeriesRun(summaryDrift);
  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) => /validation_summary must match recomputed/i.test(gap)));
  assert.equal(result.feeds.confidence_model, false);
});

test("operator time-series rejects wrapper window mode drift from child Measurement Cell cadence", () => {
  const rollingDay = 30;
  const input = operatorInputForDay(rollingDay);
  input.measurementCellInput = measurementCellInput(
    input.measurementPlan,
    rollingDay,
    input.sources,
    {
      timeWindow: {
        window_mode: "rolling_30_day",
        cadence: "rolling_30_day",
        window_day_count: 30
      },
      governance: {
        review_state: "BUSINESS_OWNER_REVIEW_READY"
      }
    }
  );
  const series = buildOperatorTimeSeriesRun(baseSeriesInput([rollingDay], {
    windows: [
      {
        milestoneDay: rollingDay,
        windowMode: "milestone",
        operatorIntakeInput: input
      }
    ]
  }));
  const result = validateOperatorTimeSeriesRun(series);

  assert.equal(series.time_windows[0].window_mode, "milestone");
  assert.equal(result.valid, false);
  assert.ok(result.gaps.some((gap) => /window_mode must match child operator intake window mode/i.test(gap)));
  assert.equal(result.feeds.confidence_model, false);
});

test("operator time-series blocks financial, probability, raw, route, persistence, override, and threshold fields", () => {
  const forbiddenFields = [
    "confidence_percentage",
    "probability",
    "p_value",
    "roi",
    "ebitda",
    "financial_attribution",
    "raw_rows",
    "user_id",
    "backend_route",
    "persistence_table",
    "schema_ref",
    "operator_override",
    "force_ready",
    "threshold",
    "new_suppression_reason"
  ];

  for (const field of forbiddenFields) {
    const series = buildOperatorTimeSeriesRun(baseSeriesInput());
    series.review_context = { [field]: field === "confidence_percentage" ? 0.81 : "unsafe" };
    const result = validateOperatorTimeSeriesRun(series);
    assert.equal(result.valid, false, `${field} should be rejected`);
    assert.ok(result.gaps.some((gap) => gap.includes(`review_context.${field}`)), field);
    assert.equal(result.feeds.confidence_model, false);
  }
});
