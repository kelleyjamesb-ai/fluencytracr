import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildCustomerMetricIntake,
  buildDataSpineIntakeReadiness,
  buildMeasurementCellAssemblyRun,
  buildRealDataIntakePacketRun,
  validateCustomerMetricIntake,
  validateDataSpineIntakeReadiness,
  validateMeasurementCellAssemblyRun,
  validateRealDataIntakePacketRun
} from "../shared/dist/aiValueEngine/index.js";

const CONTRACTS = "docs/contracts";
const FIXTURE_DIR =
  `${CONTRACTS}/ai-value-real-data-intake-packet-runner/examples`;

const FIXTURE_FILES = [
  "adversarial-window-mismatch-held.json",
  "adversarial-unparsed-blueprint-upload-held.json",
  "adversarial-missing-metric-owner-approval-held.json",
  "adversarial-kmin-suppressed-slices-held.json",
  "adversarial-vbd-token-raw-bigquery-blocked.json",
  "adversarial-partial-ai-fluency-missing-layer-3-review-only.json",
  "adversarial-assumption-governance-held.json",
  "adversarial-rolling-window-finance-boundary.json",
  "adversarial-unsafe-financial-probability-blocked.json"
];

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const clone = (value) => JSON.parse(JSON.stringify(value));

function fixture(fileName) {
  return readJson(`${FIXTURE_DIR}/${fileName}`);
}

function assertFalseFeeds(actualFeeds, feedNames) {
  for (const feedName of feedNames) {
    assert.equal(actualFeeds[feedName], false, `expected ${feedName} false`);
  }
}

function assertIncludesAll(actualValues, expectedValues, label) {
  for (const expected of expectedValues ?? []) {
    assert.ok(
      actualValues.some((value) => String(value).includes(expected)),
      `${label} missing ${expected}`
    );
  }
}

function fullPlan() {
  return readJson(`${CONTRACTS}/ai-value-measurement-plan/examples/full-playbook-ready-plan.json`);
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
    owner_approval_state: "approved",
    review_state: "clear",
    aggregate_only: true,
    ...overrides
  };
}

function readyDataSpine(plan = fullPlan(), sourceOverrides = {}, topOverrides = {}) {
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
        source_ref: "blueprint_parse_support_approved",
        ...sourceOverrides.blueprint
      }),
      aiFluency: source(plan, {
        intake_mode: "ai_fluency_dashboard_export",
        source_ref: "ai_fluency_support_day_30",
        ...sourceOverrides.aiFluency
      }),
      vbdToken: source(plan, {
        intake_mode: "scrubbed_glean_bigquery_export",
        source_ref: "scrubbed_glean_vbd_token_support_day_30",
        connector_status: "scrubbed_export_only",
        ...sourceOverrides.vbdToken
      }),
      customerMetric: source(plan, {
        intake_mode: "customer_metric_aggregate_export",
        source_ref: "support_metric_resolution_hours_day_30",
        metric_id: "support_median_resolution_hours",
        ...sourceOverrides.customerMetric
      }),
      assumption: source(plan, {
        intake_mode: "assumption_approval",
        source_ref: "support_assumption_approval_day_30",
        ...sourceOverrides.assumption
      }),
      governance: source(plan, {
        intake_mode: "governance_attestation",
        source_ref: "support_governance_attestation_day_30",
        ...sourceOverrides.governance
      })
    },
    generatedAt: "2026-06-20T00:00:00.000Z",
    ...topOverrides
  });
}

function metricInput(plan = fullPlan(), overrides = {}) {
  const { baselineWindow, comparisonWindow } = windowsFromPlan(plan);
  return {
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
    generatedAt: "2026-06-20T00:00:00.000Z",
    ...overrides
  };
}

function baseExport(plan, evidenceLayer, overrides = {}) {
  return {
    schema_version: "FT_AI_VALUE_SCRUBBED_GLEAN_CLIENT_EXPORT_2026_06",
    export_id: `adversarial_scrubbed_export_${evidenceLayer}_2026_06`,
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
    notes: ["Adversarial fixture uses aggregate metadata only."],
    caveats: ["Aggregate evidence input only."],
    ...overrides
  };
}

function fullExportPacket(plan = fullPlan(), overridesByLayer = {}) {
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
      },
      ...overridesByLayer.layer1
    }),
    baseExport(plan, "layer_2_user_voice_empirical", {
      metric_or_signal_summary: {
        summary_type: "aggregate_export_metadata_summary",
        aggregate_signal_name: "aggregate_ai_fluency_baseline_summary",
        aggregate_value_present: true
      },
      ...overridesByLayer.layer2
    }),
    baseExport(plan, "layer_3_business_system_outcomes", {
      metric_or_signal_summary: {
        summary_type: "customer_owned_aggregate_metric_summary",
        aggregate_metric_name: "aggregate_support_median_resolution_hours",
        aggregate_value_present: true
      },
      ...overridesByLayer.layer3
    }),
    baseExport(plan, "governance_evidence", {
      metric_or_signal_summary: {
        summary_type: "governance_control_export_summary",
        aggregate_signal_name: "aggregate_governance_control_summary",
        aggregate_value_present: true
      },
      ...overridesByLayer.governance
    }),
    baseExport(plan, "assumption_evidence", {
      metric_or_signal_summary: {
        summary_type: "assumption_approval_export_summary",
        aggregate_signal_name: "aggregate_assumption_approval_summary",
        aggregate_value_present: true
      },
      ...overridesByLayer.assumption
    })
  ];
}

function measurementCellInput(plan, dataSpine, overrides = {}) {
  const { baselineWindow, comparisonWindow } = windowsFromPlan(plan);
  const sources = dataSpine.source_readiness;
  return {
    orgId: plan.org_id,
    functionArea: plan.workflow_scope.function_area,
    workflowFamily: plan.workflow_scope.workflow_family,
    workflowId: "workflow_support_case_resolution",
    cohortKey: dataSpine.cohort_key,
    timeWindow: {
      time_window_id: "day_30",
      window_label: "Day 30",
      window_mode: "milestone",
      anchor_date: comparisonWindow.window_end,
      days_since_launch: 30,
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
    },
    ...overrides
  };
}

function realDataRun(plan, dataSpine, exports = fullExportPacket(plan)) {
  return buildRealDataIntakePacketRun({
    dataSpineReadiness: dataSpine,
    measurementPlan: plan,
    scrubbedGleanExports: exports,
    runId: `adversarial_real_data_intake_${plan.measurement_plan_id}`,
    generatedAt: "2026-06-20T00:00:00.000Z"
  });
}

test("committed fixture files track the required adversarial cases", () => {
  for (const fileName of FIXTURE_FILES) {
    const loaded = fixture(fileName);
    assert.equal(
      loaded.schema_version,
      "FT_AI_VALUE_ADVERSARIAL_CLIENT_FIXTURE_2026_06"
    );
    assert.equal(loaded.file_name, fileName);
    assert.equal(loaded.source_posture, "synthetic_rehearsal_input_spec");
    assert.equal(loaded.customer_evidence_allowed, false);
    assert.equal(loaded.finance_context_allowed, false);
    assert.equal(loaded.customer_facing_financial_output_allowed, false);
    assert.ok(
      Object.entries(loaded.expected ?? {}).some(([key, value]) =>
        key.endsWith("false_feeds") && Array.isArray(value)
      ),
      `${fileName} must include at least one false-feed expectation`
    );
    assert.ok(Array.isArray(loaded.blocked_claims));
  }
});

test("mismatched windows block real-data intake before Measurement Cell assembly", () => {
  const expectation = fixture("adversarial-window-mismatch-held.json");
  const plan = fullPlan();
  const driftedPlan = clone(plan);
  driftedPlan.windows.comparison_window_start = "2026-07-01";
  driftedPlan.windows.comparison_window_end = "2026-07-31";
  const dataSpine = readyDataSpine(driftedPlan);
  const run = realDataRun(plan, dataSpine);
  const result = validateRealDataIntakePacketRun(run);

  assert.equal(run.decision, expectation.expected.decision);
  assert.equal(result.valid, expectation.expected.validation_valid);
  assertFalseFeeds(result.feeds, expectation.expected.false_feeds);
  assertIncludesAll(result.gaps, expectation.expected.gaps_include, "gaps");
  assert.equal(run.pilot_intake_run, null);
});

test("unparsed Blueprint upload holds until approved extraction and raw file content fails closed", () => {
  const expectation = fixture("adversarial-unparsed-blueprint-upload-held.json");
  const plan = fullPlan();
  const heldDataSpine = readyDataSpine(plan, {
    blueprint: {
      state: "submitted",
      source_ref: "blueprint_upload_pending_extraction",
      owner_approval_state: "submitted",
      review_state: "needs_review"
    }
  });
  const heldResult = validateDataSpineIntakeReadiness(heldDataSpine);
  assert.equal(heldResult.valid, true, heldResult.gaps.join("; "));
  assert.equal(heldDataSpine.readiness_state, expectation.expected.held_readiness_state);
  assertFalseFeeds(heldResult.feeds, expectation.expected.held_false_feeds);
  assertIncludesAll(
    heldDataSpine.missing_evidence,
    expectation.expected.held_missing_evidence_include,
    "held missing_evidence"
  );

  const poisonedDataSpine = readyDataSpine(plan);
  poisonedDataSpine.source_readiness.blueprint.file_content =
    "raw unparsed Blueprint file content must not enter the shared engine";
  const poisonedResult = validateDataSpineIntakeReadiness(poisonedDataSpine);
  assert.equal(poisonedResult.valid, expectation.expected.poisoned_validation_valid);
  assertFalseFeeds(poisonedResult.feeds, expectation.expected.poisoned_false_feeds);
  assertIncludesAll(
    poisonedResult.gaps,
    expectation.expected.poisoned_gaps_include,
    "poisoned gaps"
  );
});

test("missing metric owner approval holds customer metric lane and blocks finance-context path", () => {
  const expectation = fixture("adversarial-missing-metric-owner-approval-held.json");
  const plan = fullPlan();
  const metricIntake = buildCustomerMetricIntake(metricInput(plan, {
    ownerApprovalState: "submitted"
  }));
  const metricResult = validateCustomerMetricIntake(metricIntake);
  assert.equal(metricResult.valid, true, metricResult.gaps.join("; "));
  assert.equal(metricIntake.decision, expectation.expected.metric_intake_decision);
  assertFalseFeeds(metricIntake.feeds, expectation.expected.metric_false_feeds);
  assertIncludesAll(
    metricIntake.missing_evidence,
    expectation.expected.metric_missing_evidence_include,
    "metric missing_evidence"
  );

  const dataSpine = readyDataSpine(plan, {
    customerMetric: metricIntake.data_spine_source
  });
  const spineResult = validateDataSpineIntakeReadiness(dataSpine);
  assert.equal(spineResult.valid, true, spineResult.gaps.join("; "));
  assert.equal(dataSpine.readiness_state, expectation.expected.data_spine_readiness_state);
  assertFalseFeeds(spineResult.feeds, expectation.expected.data_spine_false_feeds);
  assertIncludesAll(
    dataSpine.missing_evidence,
    expectation.expected.data_spine_missing_evidence_include,
    "data spine missing_evidence"
  );

  const run = realDataRun(plan, dataSpine);
  const result = validateRealDataIntakePacketRun(run);
  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(run.decision, expectation.expected.real_data_decision);
  assertFalseFeeds(run.feeds, expectation.expected.real_data_false_feeds);
});

test("k-min failure and suppressed VBD cannot be rescued by otherwise complete lanes", () => {
  const expectation = fixture("adversarial-kmin-suppressed-slices-held.json");
  const plan = fullPlan();
  const dataSpine = readyDataSpine(plan, {
    vbdToken: {
      state: "suppressed",
      review_state: "suppressed"
    }
  });
  const spineResult = validateDataSpineIntakeReadiness(dataSpine);
  assert.equal(spineResult.valid, true, spineResult.gaps.join("; "));
  assert.equal(dataSpine.readiness_state, expectation.expected.data_spine_readiness_state);
  assertFalseFeeds(spineResult.feeds, expectation.expected.data_spine_false_feeds);
  assertIncludesAll(
    dataSpine.missing_evidence,
    expectation.expected.data_spine_missing_evidence_include,
    "data spine missing_evidence"
  );

  const exports = fullExportPacket(plan, {
    layer1: {
      k_min_posture: {
        minimum_cohort_threshold: 5,
        cohort_threshold_met: false,
        total_slices: 8,
        k_min_clear_slices: 4,
        suppressed_or_unknown_slices: 4
      }
    }
  });
  const run = realDataRun(plan, dataSpine, exports);
  const result = validateRealDataIntakePacketRun(run);
  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(run.decision, expectation.expected.real_data_decision);
  assertFalseFeeds(run.feeds, expectation.expected.real_data_false_feeds);
  assert.equal(run.pilot_intake_run, null);
});

test("raw BigQuery and VBD/token export leakage holds evidence input before Measurement Cell", () => {
  const expectation = fixture("adversarial-vbd-token-raw-bigquery-blocked.json");
  const plan = fullPlan();
  const run = realDataRun(
    plan,
    readyDataSpine(plan),
    fullExportPacket(plan, {
      layer1: {
        raw_rows: [{ user_id: "u_123", token_total: 1000 }],
        bigquery_sql: "select * from raw_events",
        query_text: "raw token usage query"
      }
    })
  );
  const result = validateRealDataIntakePacketRun(run);

  assert.equal(result.valid, expectation.expected.validation_valid, result.gaps.join("; "));
  assert.equal(run.decision, expectation.expected.real_data_decision);
  assertFalseFeeds(run.feeds, expectation.expected.real_data_false_feeds);
  assertIncludesAll(run.gaps, expectation.expected.run_gaps_include, "run gaps");
});

test("partial AI Fluency and missing Layer 3 stay evidence-review only", () => {
  const expectation = fixture("adversarial-partial-ai-fluency-missing-layer-3-review-only.json");
  const plan = fullPlan();
  const dataSpine = readyDataSpine(plan, {
    aiFluency: {
      state: "partial",
      owner_approval_state: "submitted",
      review_state: "needs_review"
    },
    customerMetric: {
      state: "missing",
      source_ref: null,
      owner_approval_state: "missing",
      review_state: "needs_review",
      metric_id: null
    }
  });
  const run = realDataRun(
    plan,
    dataSpine,
    fullExportPacket(plan).filter((sourcePackage) =>
      sourcePackage.evidence_layer !== "layer_3_business_system_outcomes"
    )
  );
  const result = validateRealDataIntakePacketRun(run);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(run.decision, expectation.expected.real_data_decision);
  assertFalseFeeds(run.feeds, expectation.expected.real_data_false_feeds);
  assertIncludesAll(
    run.missing_evidence,
    expectation.expected.real_data_missing_evidence_include,
    "real data missing_evidence"
  );
});

test("missing assumptions and held governance keep packet in source-alignment review", () => {
  const expectation = fixture("adversarial-assumption-governance-held.json");
  const plan = fullPlan();
  const dataSpine = readyDataSpine(plan, {
    assumption: {
      state: "missing",
      source_ref: null,
      owner_approval_state: "missing",
      review_state: "needs_review"
    },
    governance: {
      state: "held",
      owner_approval_state: "held",
      review_state: "held"
    }
  });
  const spineResult = validateDataSpineIntakeReadiness(dataSpine);
  assert.equal(spineResult.valid, true, spineResult.gaps.join("; "));
  assert.equal(dataSpine.readiness_state, expectation.expected.data_spine_readiness_state);
  assertFalseFeeds(spineResult.feeds, expectation.expected.data_spine_false_feeds);
  assertIncludesAll(
    dataSpine.missing_evidence,
    expectation.expected.data_spine_missing_evidence_include,
    "data spine missing_evidence"
  );

  const run = realDataRun(plan, dataSpine);
  const result = validateRealDataIntakePacketRun(run);
  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(run.decision, expectation.expected.real_data_decision);
  assertFalseFeeds(run.feeds, expectation.expected.real_data_false_feeds);
});

test("rolling 30-day Measurement Cell remains operating context, not finance-context planning", () => {
  const expectation = fixture("adversarial-rolling-window-finance-boundary.json");
  const plan = clone(fullPlan());
  plan.windows.baseline_window_start = "2026-08-02";
  plan.windows.baseline_window_end = "2026-08-31";
  plan.windows.comparison_window_start = "2026-09-01";
  plan.windows.comparison_window_end = "2026-09-30";
  const dataSpine = readyDataSpine(plan);
  const run = buildMeasurementCellAssemblyRun({
    dataSpineReadiness: dataSpine,
    measurementPlan: plan,
    realDataIntakePacketRun: realDataRun(plan, dataSpine),
    measurementCellInput: measurementCellInput(plan, dataSpine, {
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
    }),
    runId: "adversarial_measurement_cell_assembly_rolling",
    generatedAt: "2026-06-20T00:00:00.000Z"
  });
  const result = validateMeasurementCellAssemblyRun(run);

  assert.equal(result.valid, expectation.expected.validation_valid, result.gaps.join("; "));
  assert.equal(run.decision, expectation.expected.decision);
  assert.equal(
    run.feeds.value_hypothesis_packet_runner,
    expectation.expected.true_feeds.includes("value_hypothesis_packet_runner")
  );
  assertFalseFeeds(run.feeds, expectation.expected.false_feeds);
});

test("unsafe financial, probability, raw, person-level, and threshold side doors fail closed", () => {
  const expectation = fixture("adversarial-unsafe-financial-probability-blocked.json");
  const plan = fullPlan();
  const run = realDataRun(plan, readyDataSpine(plan));
  run.roi_value = 60000000;
  run.ebitda_impact = 12000000;
  run.confidence_percent = 88;
  run.probability = 0.74;
  run.threshold = 60;
  run.raw_rows = [{ user_id: "u_123", prompt: "raw prompt" }];
  run.creates_backend_routes = true;
  run.creates_frontend_ui = true;
  run.persistence_table = "adversarial_fixture_runs";

  const result = validateRealDataIntakePacketRun(run);
  assert.equal(result.valid, expectation.expected.validation_valid);
  assertFalseFeeds(result.feeds, expectation.expected.false_feeds);
  assertIncludesAll(result.gaps, expectation.expected.gaps_include, "gaps");
});
