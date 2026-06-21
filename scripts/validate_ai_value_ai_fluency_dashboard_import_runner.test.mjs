import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAIFluencyDashboardImportRun,
  validateAIFluencyDashboardImportRun
} from "../shared/dist/aiValueEngine/index.js";

function dashboardExport(overrides = {}) {
  return {
    export_type: "aggregate_ai_fluency_dashboard_export",
    governance_posture: {
      aggregate_only: true,
      excludes_individual_responses: true,
      excludes_employee_names: true,
      excludes_emails: true,
      excludes_user_ids: true,
      excludes_manager_or_team_rankings: true,
      excludes_raw_text_responses: true,
      excludes_roi_claims: true,
      excludes_productivity_claims: true,
      excludes_causality_claims: true,
      excludes_financial_attribution: true,
      token_usage_included: false
    },
    records: [
      {
        client_id: "atlantic-media",
        org_id: "org-atlantic-001",
        client_name: "The Atlantic",
        instrument_id: "ai-fluency-instrument-24",
        instrument_version: "2.3",
        collection_mode: "aggregated_dashboard_export",
        dashboard_export_id: "afe-2026-m06-atlantic-001",
        export_generated_at: "2026-06-19T17:00:00Z",
        baseline_window_start: "2026-01-01",
        baseline_window_end: "2026-01-31",
        comparison_window_start: "2026-06-01",
        comparison_window_end: "2026-06-30",
        function_area: "Revenue",
        workflow_family: "customer_growth",
        cohort_key: "atlantic-beta-2026",
        eligible_population_count: 1200,
        response_count: 720,
        response_rate: 0.6,
        suppression_state: "none",
        k_min_posture: "k_min_20_function_level",
        overall_ai_fluency_score: 72,
        confidence_score: 75,
        usage_quality_score: 73,
        behavior_change_score: 70,
        leadership_reinforcement_score: 69,
        capability_growth_score: 74,
        baseline_overall_ai_fluency_score: 59,
        comparison_overall_ai_fluency_score: 72,
        movement_delta: 13,
        movement_direction: "improved",
        source_ref: "ai-fluency-dashboard-export://atlantic-media/beta-2026/m6/revenue",
        source_owner_role: "People Analytics Lead",
        owner_approval_state: "approved",
        review_state: "approved_for_import",
        caveats:
          "Aggregate-only row. No individual responses or person-level fields. Movement is descriptive, not causal."
      },
      {
        client_id: "atlantic-media",
        org_id: "org-atlantic-001",
        client_name: "The Atlantic",
        instrument_id: "ai-fluency-instrument-24",
        instrument_version: "2.3",
        collection_mode: "aggregated_dashboard_export",
        dashboard_export_id: "afe-2026-m06-atlantic-001",
        export_generated_at: "2026-06-19T17:00:00Z",
        baseline_window_start: "2026-01-01",
        baseline_window_end: "2026-01-31",
        comparison_window_start: "2026-06-01",
        comparison_window_end: "2026-06-30",
        function_area: "Customer Success",
        workflow_family: "customer_growth",
        cohort_key: "atlantic-beta-2026",
        eligible_population_count: 850,
        response_count: 468,
        response_rate: 0.551,
        suppression_state: "none",
        k_min_posture: "k_min_20_function_level",
        overall_ai_fluency_score: 69,
        confidence_score: 72,
        usage_quality_score: 70,
        behavior_change_score: 66,
        leadership_reinforcement_score: 68,
        capability_growth_score: 69,
        baseline_overall_ai_fluency_score: 61,
        comparison_overall_ai_fluency_score: 69,
        movement_delta: 8,
        movement_direction: "improved",
        source_ref:
          "ai-fluency-dashboard-export://atlantic-media/beta-2026/m6/customer-success",
        source_owner_role: "People Analytics Lead",
        owner_approval_state: "approved",
        review_state: "approved_for_import",
        caveats:
          "Aggregate-only row. No ROI, productivity, financial attribution, or causal claim."
      },
      {
        client_id: "atlantic-media",
        org_id: "org-atlantic-001",
        client_name: "The Atlantic",
        instrument_id: "ai-fluency-instrument-24",
        instrument_version: "2.3",
        collection_mode: "aggregated_dashboard_export",
        dashboard_export_id: "afe-2026-m06-atlantic-001",
        export_generated_at: "2026-06-19T17:00:00Z",
        baseline_window_start: "2026-01-01",
        baseline_window_end: "2026-01-31",
        comparison_window_start: "2026-06-01",
        comparison_window_end: "2026-06-30",
        function_area: "Marketing and Communications",
        workflow_family: "content_and_go_to_market",
        cohort_key: "atlantic-beta-2026",
        eligible_population_count: 500,
        response_count: 280,
        response_rate: 0.56,
        suppression_state: "held_pending_owner_review",
        k_min_posture: "k_min_20_function_level",
        overall_ai_fluency_score: 66,
        confidence_score: 68,
        usage_quality_score: 67,
        behavior_change_score: 65,
        leadership_reinforcement_score: 63,
        capability_growth_score: 67,
        baseline_overall_ai_fluency_score: 54,
        comparison_overall_ai_fluency_score: 66,
        movement_delta: 12,
        movement_direction: "improved",
        source_ref:
          "ai-fluency-dashboard-export://atlantic-media/beta-2026/m6/marketing-communications",
        source_owner_role: "Function Data Steward",
        owner_approval_state: "pending",
        review_state: "held_pending_owner_review",
        caveats:
          "Hold from import until owner approval is complete. Scores are aggregate only and should not be published yet."
      },
      {
        client_id: "atlantic-media",
        org_id: "org-atlantic-001",
        client_name: "The Atlantic",
        instrument_id: "ai-fluency-instrument-24",
        instrument_version: "2.3",
        collection_mode: "aggregated_dashboard_export",
        dashboard_export_id: "afe-2026-m06-atlantic-001",
        export_generated_at: "2026-06-19T17:00:00Z",
        baseline_window_start: "2026-01-01",
        baseline_window_end: "2026-01-31",
        comparison_window_start: "2026-06-01",
        comparison_window_end: "2026-06-30",
        function_area: "People and Learning",
        workflow_family: "employee_enablement",
        cohort_key: "atlantic-beta-2026",
        eligible_population_count: 450,
        response_count: 18,
        response_rate: 0.04,
        suppression_state: "suppressed_low_n",
        k_min_posture: "k_min_20_function_level",
        overall_ai_fluency_score: null,
        confidence_score: null,
        usage_quality_score: null,
        behavior_change_score: null,
        leadership_reinforcement_score: null,
        capability_growth_score: null,
        baseline_overall_ai_fluency_score: null,
        comparison_overall_ai_fluency_score: null,
        movement_delta: null,
        movement_direction: "held",
        source_ref:
          "ai-fluency-dashboard-export://atlantic-media/beta-2026/m6/people-learning",
        source_owner_role: "People Analytics Lead",
        owner_approval_state: "approved",
        review_state: "held_suppressed_low_n",
        caveats:
          "Suppressed because response_count is below k_min. Do not import scores or display this function-level row."
      }
    ],
    ...overrides
  };
}

test("dashboard import runner normalizes approved rows and holds non-feedable rows", () => {
  const run = buildAIFluencyDashboardImportRun({
    dashboardExport: dashboardExport(),
    runId: "ai_fluency_dashboard_import_run_atlantic_m6",
    generatedAt: "2026-06-20T00:00:00.000Z"
  });
  const result = validateAIFluencyDashboardImportRun(run);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(run.client_id, "atlantic-media");
  assert.equal(run.org_id, "org-atlantic-001");
  assert.equal(run.summary.total_records, 4);
  assert.equal(run.summary.imported_count, 2);
  assert.equal(run.summary.held_count, 1);
  assert.equal(run.summary.suppressed_count, 1);
  assert.equal(run.feedable_data_spine_sources.length, 2);
  assert.equal(
    run.feedable_data_spine_sources[0].source_ref,
    "ai-fluency-dashboard-export://atlantic-media/beta-2026/m6/revenue"
  );
  assert.equal(run.row_results[0].decision, "IMPORTED");
  assert.equal(run.row_results[0].client_import.data_spine_source.review_state, "clear");
  assert.equal(run.row_results[0].client_import.aggregate_summary.weighted_construct_means.confidence, 3.75);
  assert.equal(run.row_results[2].decision, "HELD");
  assert.equal(run.row_results[2].client_import.feeds.data_spine_ai_fluency_source, false);
  assert.equal(run.row_results[3].decision, "SUPPRESSED");
  assert.equal(run.row_results[3].client_import.aggregate_summary.usable_cohort_count, 0);
  assert.equal(result.feeds.data_spine_ai_fluency_sources, true);
  assert.equal(result.feeds.measurement_cell_input, false);
  assert.equal(result.feeds.customer_facing_financial_output, false);
});

test("dashboard import runner imports twenty-response rows and suppresses nineteen-response rows", () => {
  const exported = dashboardExport();
  exported.records = [
    {
      ...exported.records[0],
      response_count: 20,
      response_rate: 0.2,
      source_ref: "ai-fluency-dashboard-export://atlantic-media/beta-2026/m6/revenue-20"
    },
    {
      ...exported.records[1],
      response_count: 19,
      response_rate: 0.19,
      source_ref: "ai-fluency-dashboard-export://atlantic-media/beta-2026/m6/customer-success-19"
    }
  ];

  const run = buildAIFluencyDashboardImportRun({
    dashboardExport: exported,
    runId: "ai_fluency_dashboard_import_run_threshold_20",
    generatedAt: "2026-06-20T00:00:00.000Z"
  });
  const result = validateAIFluencyDashboardImportRun(run);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(run.summary.imported_count, 1);
  assert.equal(run.summary.suppressed_count, 1);
  assert.equal(run.feedable_data_spine_sources.length, 1);
  assert.equal(run.row_results[0].decision, "IMPORTED");
  assert.equal(run.row_results[0].client_import.data_spine_source.state, "present");
  assert.equal(run.row_results[1].decision, "SUPPRESSED");
  assert.equal(
    run.row_results[1].client_import.aggregate_summary.usable_cohort_count,
    0
  );
});

test("dashboard import runner keeps organization overall rows review-only and non-feedable", () => {
  const exported = dashboardExport();
  exported.records = [
    {
      ...exported.records[0],
      function_area: "Organization Overall",
      workflow_family: "ai_fluency_readiness",
      cohort_key: "all_approved_responses",
      response_count: 1188,
      response_rate: 0.594,
      overall_ai_fluency_score: 70,
      confidence_score: 73,
      usage_quality_score: 71,
      behavior_change_score: 68,
      leadership_reinforcement_score: 67,
      capability_growth_score: 71,
      owner_approval_state: "approved",
      review_state: "approved_for_import",
      source_ref:
        "ai-fluency-dashboard-export://atlantic-media/beta-2026/m6/organization-overall"
    }
  ];

  const run = buildAIFluencyDashboardImportRun({
    dashboardExport: exported,
    runId: "ai_fluency_dashboard_import_run_org_overall_review_only",
    generatedAt: "2026-06-20T00:00:00.000Z"
  });
  const result = validateAIFluencyDashboardImportRun(run);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(run.summary.imported_count, 0);
  assert.equal(run.summary.held_count, 1);
  assert.equal(run.feedable_data_spine_sources.length, 0);
  assert.equal(run.row_results[0].decision, "HELD");
  assert.equal(run.row_results[0].client_import.review_state, "held");
  assert.equal(run.row_results[0].client_import.feeds.data_spine_ai_fluency_source, false);
  assert.equal(result.feeds.data_spine_ai_fluency_sources, false);
});

test("dashboard import runner blocks stale k-min posture labels", () => {
  const exported = dashboardExport();
  const staleKMinPosture = "k_min_30_function_level";
  exported.records[0] = {
    ...exported.records[0],
    response_count: 20,
    k_min_posture: staleKMinPosture
  };

  const run = buildAIFluencyDashboardImportRun({
    dashboardExport: exported,
    runId: "ai_fluency_dashboard_import_run_stale_k_min",
    generatedAt: "2026-06-20T00:00:00.000Z"
  });
  const result = validateAIFluencyDashboardImportRun(run);

  assert.equal(result.valid, false);
  assert.equal(result.feeds.data_spine_ai_fluency_sources, false);
  assert.equal(run.summary.imported_count, 0);
  assert.equal(run.feedable_data_spine_sources.length, 0);
  assert.ok(result.gaps.some((gap) => gap.includes("k_min_posture")));
});

test("dashboard import runner fails closed on unsafe posture or row fields", () => {
  const unsafe = dashboardExport({
    governance_posture: {
      ...dashboardExport().governance_posture,
      aggregate_only: false
    }
  });
  unsafe.records[0].employee_id = "employee-123";

  const run = buildAIFluencyDashboardImportRun({
    dashboardExport: unsafe,
    runId: "ai_fluency_dashboard_import_run_unsafe",
    generatedAt: "2026-06-20T00:00:00.000Z"
  });
  const result = validateAIFluencyDashboardImportRun(run);

  assert.equal(result.valid, false);
  assert.equal(result.feeds.data_spine_ai_fluency_sources, false);
  assert.equal(run.summary.imported_count, 0);
  assert.equal(run.feedable_data_spine_sources.length, 0);
  assert.ok(run.row_results.every((row) => row.decision === "BLOCKED"));
  assert.ok(result.gaps.some((gap) => gap.includes("governance_posture.aggregate_only")));
  assert.ok(result.gaps.some((gap) => gap.includes("employee_id")));
});

test("dashboard import runner treats non-none suppression states as non-importable even when review fields are clear", () => {
  const exported = dashboardExport();
  exported.records[0] = {
    ...exported.records[0],
    suppression_state: "held_pending_owner_review",
    owner_approval_state: "approved",
    review_state: "approved_for_import"
  };

  const run = buildAIFluencyDashboardImportRun({
    dashboardExport: exported,
    runId: "ai_fluency_dashboard_import_run_non_none_suppression",
    generatedAt: "2026-06-20T00:00:00.000Z"
  });
  const result = validateAIFluencyDashboardImportRun(run);

  assert.equal(result.valid, true, result.gaps.join("; "));
  assert.equal(run.row_results[0].decision, "HELD");
  assert.equal(run.row_results[0].client_import.feeds.data_spine_ai_fluency_source, false);
  assert.equal(run.summary.imported_count, 1);
  assert.equal(run.feedable_data_spine_sources.length, 1);
});

test("dashboard import runner blocks mixed source alignment across org client export and windows", () => {
  const mixed = dashboardExport();
  mixed.records[1] = {
    ...mixed.records[1],
    org_id: "org-other",
    client_id: "other-client",
    dashboard_export_id: "afe-2026-m06-other-001",
    comparison_window_start: "2026-07-01"
  };

  const run = buildAIFluencyDashboardImportRun({
    dashboardExport: mixed,
    runId: "ai_fluency_dashboard_import_run_mixed_source",
    generatedAt: "2026-06-20T00:00:00.000Z"
  });
  const result = validateAIFluencyDashboardImportRun(run);

  assert.equal(result.valid, false);
  assert.equal(result.feeds.data_spine_ai_fluency_sources, false);
  assert.equal(run.summary.imported_count, 0);
  assert.equal(run.feedable_data_spine_sources.length, 0);
  assert.ok(run.row_results.every((row) => row.decision === "BLOCKED"));
  assert.ok(result.gaps.some((gap) => gap.includes("records.org_id must not mix values")));
  assert.ok(result.gaps.some((gap) => gap.includes("records.client_id must not mix values")));
  assert.ok(result.gaps.some((gap) => gap.includes("records.dashboard_export_id must not mix values")));
  assert.ok(result.gaps.some((gap) => gap.includes("records.comparison_window_start must not mix values")));
});

test("dashboard import runner blocks direct identifier values inside otherwise allowed fields", () => {
  const unsafe = dashboardExport();
  unsafe.records[0] = {
    ...unsafe.records[0],
    source_ref: "google-sheets-ai-fluency://person@example.com/revenue",
    cohort_key: "respondent-12345"
  };

  const run = buildAIFluencyDashboardImportRun({
    dashboardExport: unsafe,
    runId: "ai_fluency_dashboard_import_run_unsafe_values",
    generatedAt: "2026-06-20T00:00:00.000Z"
  });
  const result = validateAIFluencyDashboardImportRun(run);

  assert.equal(result.valid, false);
  assert.equal(run.feedable_data_spine_sources.length, 0);
  assert.ok(result.gaps.some((gap) => gap.includes("Unsafe identifier value detected")));
});
