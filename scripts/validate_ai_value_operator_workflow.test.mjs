import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  AI_VALUE_OPERATOR_WORKFLOW_SCHEMA_VERSION,
  buildClaimReadinessHandoffFromEvidenceSnapshot,
  buildClaimReadinessSnapshotFromEvidenceSnapshotAndHandoff,
  buildOperatorIntakeAdapterRun,
  buildOperatorTimeSeriesRun,
  buildTelemetryEvidenceSnapshotDraft,
  buildValueHypothesisReadinessPacket,
  validateClaimReadinessHandoff,
  validateClaimReadinessSnapshot,
  validateEvidenceSnapshot,
  validateOperatorWorkflow,
  validateValueHypothesisReadinessPacket,
  buildOperatorWorkflow
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

function fullPlan(day = 30) {
  const plan = clone(readJson(`${CONTRACTS}/ai-value-measurement-plan/examples/full-playbook-ready-plan.json`));
  const { baselineWindow, comparisonWindow } = windowForDay(day);
  plan.windows = {
    ...plan.windows,
    baseline_window_start: baselineWindow.window_start,
    baseline_window_end: baselineWindow.window_end,
    comparison_window_start: comparisonWindow.window_start,
    comparison_window_end: comparisonWindow.window_end
  };
  return plan;
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
    ...overrides
  };
}

function matchingSourcePackages(plan = fullPlan(), day = 30, sources = operatorSources(plan, day)) {
  return [
    sourcePackageExample("layer-2-user-voice-package.json", plan, {
      source_package_id: `source_package_layer_2_ai_fluency_workflow_day_${day}`,
      source_refs: {
        source_readiness_id: `source_readiness_ai_fluency_workflow_day_${day}`,
        aggregate_export_id: sources.aiFluency.source_ref
      }
    }),
    sourcePackageExample("layer-1-bigquery-telemetry-package.json", plan, {
      source_package_id: `source_package_layer_1_vbd_token_workflow_day_${day}`,
      source_refs: {
        source_readiness_id: `source_readiness_vbd_token_workflow_day_${day}`,
        aggregate_probe_id: sources.vbdToken.source_ref,
        reportability_signal_families: ["assistant", "search_document_retrieval", "agent_run"]
      }
    }),
    sourcePackageExample("layer-3-system-of-record-outcome-package.json", plan, {
      source_package_id: `source_package_layer_3_customer_metric_workflow_day_${day}`,
      source_refs: {
        source_readiness_id: `source_readiness_customer_metric_workflow_day_${day}`,
        aggregate_outcome_export_id: sources.customerMetric.source_ref
      }
    }),
    sourcePackageExample("assumption-approval-package.json", plan, {
      source_package_id: `source_package_assumption_workflow_day_${day}`,
      source_refs: {
        source_readiness_id: `source_readiness_assumption_workflow_day_${day}`,
        assumption_approval_export_id: sources.assumption.source_ref
      }
    }),
    sourcePackageExample("governance-control-package.json", plan, {
      source_package_id: `source_package_governance_workflow_day_${day}`,
      source_refs: {
        source_readiness_id: `source_readiness_governance_workflow_day_${day}`,
        governance_control_export_id: sources.governance.source_ref
      }
    })
  ];
}

function baseExport(plan, day, evidenceLayer, overrides = {}) {
  return {
    schema_version: "FT_AI_VALUE_SCRUBBED_GLEAN_CLIENT_EXPORT_2026_06",
    export_id: `operator_workflow_scrubbed_export_${evidenceLayer}_day_${day}`,
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
      caveats: ["Already-parsed aggregate export summary only; no raw rows or identifiers retained."]
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
    notes: ["Operator workflow fixture uses aggregate metadata only."],
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

function claimSnapshotForPlan(plan) {
  const snapshot = buildTelemetryEvidenceSnapshotDraft({
    orgId: plan.org_id,
    workflowFamily: plan.workflow_scope.workflow_family,
    workflowName: plan.workflow_scope.workflow_name,
    functionArea: plan.workflow_scope.function_area,
    windowStart: plan.windows.baseline_window_start,
    windowEnd: plan.windows.comparison_window_end,
    generatedAt: "2026-06-21T00:00:00.000Z",
    evidenceSnapshotId: `evidence_snapshot_operator_workflow_${plan.measurement_plan_id}`,
    measurementPlanId: plan.measurement_plan_id,
    aggregateTelemetrySummary: {
      probe_window_start: plan.windows.baseline_window_start,
      probe_window_end: plan.windows.comparison_window_end,
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
      bigquery_probe_result_id: "bq_probe_operator_workflow_test",
      source_readiness_ids: ["source_readiness_operator_workflow_test"],
      notes: ["Read-only aggregate probe summary; no raw rows retained."]
    }
  });
  const snapshotValidation = validateEvidenceSnapshot(snapshot);
  assert.equal(snapshotValidation.valid, true, snapshotValidation.gaps.join("; "));
  const handoff = buildClaimReadinessHandoffFromEvidenceSnapshot(snapshot, {
    handoffId: `claim_readiness_handoff_operator_workflow_${plan.measurement_plan_id}`,
    createdAt: "2026-06-21T00:00:00.000Z"
  });
  const handoffValidation = validateClaimReadinessHandoff(handoff);
  assert.equal(handoffValidation.valid, true, handoffValidation.gaps.join("; "));
  const claimSnapshot = buildClaimReadinessSnapshotFromEvidenceSnapshotAndHandoff(
    snapshot,
    handoff,
    {
      claimReadinessSnapshotId: `claim_readiness_snapshot_operator_workflow_${plan.measurement_plan_id}`,
      createdAt: "2026-06-21T00:00:00.000Z"
    }
  );
  const claimValidation = validateClaimReadinessSnapshot(claimSnapshot);
  assert.equal(claimValidation.valid, true, claimValidation.gaps.join("; "));
  return claimSnapshot;
}

function packetForPlan(plan = fullPlan(30)) {
  const packet = buildValueHypothesisReadinessPacket({
    packetId: `value_hypothesis_readiness_packet_operator_workflow_${plan.measurement_plan_id}`,
    measurementPlan: plan,
    claimReadinessSnapshot: claimSnapshotForPlan(plan),
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const validation = validateValueHypothesisReadinessPacket(packet);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  return packet;
}

function workflowInput(overrides = {}) {
  const plan = fullPlan(30);
  return {
    workflowId: "operator_workflow_support_case_resolution",
    orgId: plan.org_id,
    clientId: "client_example",
    workflowFamily: plan.workflow_scope.workflow_family,
    functionArea: plan.workflow_scope.function_area,
    cohortKey: "workflow_family:customer_support_case_resolution|eligible_cases:2300",
    operatorIntakeRun: buildOperatorIntakeAdapterRun(operatorInputForDay(30)),
    operatorTimeSeriesRun: buildOperatorTimeSeriesRun(baseSeriesInput()),
    valueHypothesisPacket: packetForPlan(plan),
    generatedAt: "2026-06-21T00:00:00.000Z",
    ...overrides
  };
}

test("operator workflow assembles a ready internal packet-review state without finance or confidence feeds", () => {
  const workflow = buildOperatorWorkflow(workflowInput());
  const validation = validateOperatorWorkflow(workflow);

  assert.equal(workflow.schema_version, AI_VALUE_OPERATOR_WORKFLOW_SCHEMA_VERSION);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(workflow.workflow_state, "READY_FOR_INTERNAL_PACKET_REVIEW");
  assert.equal(workflow.source_review_status.state, "ready");
  assert.equal(workflow.operator_intake_status.decision, "READY_FOR_VALUE_HYPOTHESIS_PACKET_PREPARATION");
  assert.equal(workflow.measurement_cell_status.state, "ready");
  assert.equal(workflow.time_series_status.decision, "READY_FOR_CONFIDENCE_MODEL_DESIGN_REVIEW");
  assert.equal(workflow.packet_preparation_status.state, "prepared");
  assert.deepEqual(workflow.missing_evidence, []);
  assert.equal(workflow.feeds.confidence_model, false);
  assert.equal(workflow.feeds.finance_context_investigation, false);
  assert.equal(workflow.feeds.customer_facing_financial_output, false);
  assert.equal(workflow.boundary_policy.creates_backend_routes, false);
  assert.equal(workflow.boundary_policy.creates_frontend_ui, false);
});

test("operator workflow holds for source review when source packages are missing", () => {
  const heldOperatorRun = buildOperatorIntakeAdapterRun(operatorInputForDay(30, {
    sourcePackages: []
  }));
  const workflow = buildOperatorWorkflow(workflowInput({
    operatorIntakeRun: heldOperatorRun
  }));
  const validation = validateOperatorWorkflow(workflow);

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(workflow.workflow_state, "HELD_FOR_SOURCE_REVIEW");
  assert.equal(workflow.source_review_status.state, "held");
  assert.ok(workflow.missing_evidence.includes("SOURCE_PACKAGE_REVIEW_REQUIRED"));
  assert.ok(!workflow.recommended_next_actions.includes("prepare_finance_context_investigation_packet"));
  assert.equal(workflow.feeds.finance_context_investigation, false);
});

test("operator workflow holds incomplete milestone and rolling series as time-series work", () => {
  const incompleteSeries = buildOperatorTimeSeriesRun(baseSeriesInput([0, 30, 60, 180, 365]));
  const incompleteWorkflow = buildOperatorWorkflow(workflowInput({
    operatorTimeSeriesRun: incompleteSeries
  }));
  let validation = validateOperatorWorkflow(incompleteWorkflow);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(incompleteWorkflow.workflow_state, "HELD_FOR_TIME_SERIES");
  assert.ok(incompleteWorkflow.missing_evidence.includes("MISSING_MILESTONE_DAY_90"));

  const rollingDays = [30, 60, 90];
  const rollingSeries = buildOperatorTimeSeriesRun(baseSeriesInput(rollingDays, {
    seriesId: "operator_time_series_support_case_resolution_rolling",
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
            metric_to_financial_driver_pathway: "Rolling context is operating momentum only.",
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
  const rollingWorkflow = buildOperatorWorkflow(workflowInput({
    operatorTimeSeriesRun: rollingSeries
  }));
  validation = validateOperatorWorkflow(rollingWorkflow);
  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(rollingWorkflow.workflow_state, "HELD_FOR_TIME_SERIES");
  assert.equal(rollingWorkflow.time_series_status.rolling_30_day_context_only, true);
  assert.equal(rollingWorkflow.feeds.confidence_model, false);
});

test("operator workflow fails closed on identity drift between intake, time-series, and packet", () => {
  const driftedSeries = buildOperatorTimeSeriesRun(baseSeriesInput());
  driftedSeries.client_id = "client_other";
  const workflow = buildOperatorWorkflow(workflowInput({
    operatorTimeSeriesRun: driftedSeries
  }));
  const validation = validateOperatorWorkflow(workflow);

  assert.equal(workflow.workflow_state, "BLOCKED");
  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.some((gap) => /client_id/i.test(gap)));
  assert.equal(validation.feeds.finance_context_investigation, false);
});

test("operator workflow rejects stale child validation and invalid Measurement Cell assembly", () => {
  const staleOperatorRun = buildOperatorIntakeAdapterRun(operatorInputForDay(30));
  staleOperatorRun.source_package_review_queue.queue_state = "HELD_FOR_SOURCE_REVIEW";
  const workflow = buildOperatorWorkflow(workflowInput({
    operatorIntakeRun: staleOperatorRun
  }));
  let validation = validateOperatorWorkflow(workflow);
  assert.equal(workflow.workflow_state, "BLOCKED");
  assert.equal(validation.valid, false);
  assert.ok(workflow.blocked_reasons.some((reason) =>
    /source_package_review_validation_result must match recomputed/i.test(reason)
  ));

  const invalidMeasurementOperatorRun = buildOperatorIntakeAdapterRun(operatorInputForDay(30));
  invalidMeasurementOperatorRun.measurement_cell_assembly_run.measurement_cell.raw_rows = [{ unsafe: "raw" }];
  const invalidWorkflow = buildOperatorWorkflow(workflowInput({
    operatorIntakeRun: invalidMeasurementOperatorRun
  }));
  validation = validateOperatorWorkflow(invalidWorkflow);
  assert.equal(invalidWorkflow.workflow_state, "BLOCKED");
  assert.equal(validation.valid, false);
  assert.equal(validation.feeds.customer_facing_financial_output, false);
});

test("operator workflow requires a prepared packet after governed evidence clears", () => {
  const workflow = buildOperatorWorkflow(workflowInput({
    valueHypothesisPacket: null
  }));
  const validation = validateOperatorWorkflow(workflow);

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(workflow.workflow_state, "HELD_FOR_PACKET_PREPARATION");
  assert.equal(workflow.packet_preparation_status.state, "missing");
  assert.ok(workflow.missing_evidence.includes("VALUE_HYPOTHESIS_PACKET_REQUIRED"));
  assert.equal(workflow.feeds.finance_context_investigation, false);
});

test("operator workflow rejects tampered summaries and finance/confidence side doors", () => {
  const workflow = buildOperatorWorkflow(workflowInput());
  workflow.review_queue[0].state = "held";
  let validation = validateOperatorWorkflow(workflow);
  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.some((gap) => /review_queue must match/i.test(gap)));

  const unsafeFields = [
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
  for (const field of unsafeFields) {
    const unsafe = buildOperatorWorkflow(workflowInput());
    unsafe.operator_context = { [field]: field === "confidence_percentage" ? 0.9 : "unsafe" };
    validation = validateOperatorWorkflow(unsafe);
    assert.equal(validation.valid, false, `${field} should fail`);
    assert.ok(validation.gaps.some((gap) => gap.includes(`operator_context.${field}`)), field);
    assert.equal(validation.feeds.confidence_model, false);
  }

  const roiSubstitution = buildOperatorWorkflow(workflowInput({
    operatorIntakeRun: buildOperatorIntakeAdapterRun(operatorInputForDay(30, {
      sourcePackages: []
    }))
  }));
  roiSubstitution.roi_bot_assumptions = {
    owner_approval_state: "approved",
    scenario_context_only: true
  };
  validation = validateOperatorWorkflow(roiSubstitution);
  assert.equal(validation.valid, false);
  assert.ok(validation.gaps.some((gap) => /roi_bot_assumptions/i.test(gap)));
  assert.equal(validation.feeds.finance_context_investigation, false);
});
