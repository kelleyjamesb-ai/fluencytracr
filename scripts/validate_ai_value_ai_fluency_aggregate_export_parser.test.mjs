import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAIFluencyAggregateExportParseRun,
  buildAIFluencyDashboardImportRun,
  validateAIFluencyAggregateExportParseRun,
  validateAIFluencyDashboardImportRun
} from "../shared/dist/aiValueEngine/index.js";

const CSV_HEADERS = [
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

function csvValue(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function baseRecord(overrides = {}) {
  return {
    client_id: "atlantic-media",
    org_id: "org-atlantic-001",
    instrument_id: "ai-fluency-instrument-24",
    instrument_version: "2.3",
    collection_mode: "aggregated_dashboard_export",
    dashboard_export_id: "afe-2026-m06-atlantic-001",
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
      "Aggregate-only row, quoted for CSV parsing.\nMovement is descriptive, not causal.",
    ...overrides
  };
}

function csvRow(overrides = {}) {
  const row = baseRecord(overrides);
  return CSV_HEADERS.map((header) => csvValue(row[header])).join(",");
}

function csvText(rows) {
  return [CSV_HEADERS.join(","), ...rows].join("\n");
}

test("aggregate export parser converts CSV text into dashboard import input", () => {
  const parseRun = buildAIFluencyAggregateExportParseRun({
    sourceType: "csv",
    sourceText: csvText([
      csvRow(),
      csvRow({
        function_area: "People and Learning",
        workflow_family: "employee_enablement",
        eligible_population_count: 450,
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
        source_ref:
          "ai-fluency-dashboard-export://atlantic-media/beta-2026/m6/people-learning",
        review_state: "held_suppressed_low_n",
        caveats: "Suppressed because response_count is below k_min."
      })
    ]),
    parseId: "ai_fluency_aggregate_export_parse_csv_atlantic_m6",
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const parseValidation = validateAIFluencyAggregateExportParseRun(parseRun);
  const dashboardRun = buildAIFluencyDashboardImportRun({
    dashboardExport: parseRun.dashboard_export,
    runId: "ai_fluency_dashboard_import_from_parsed_csv",
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const dashboardValidation = validateAIFluencyDashboardImportRun(dashboardRun);

  assert.equal(parseValidation.valid, true, parseValidation.gaps.join("; "));
  assert.equal(parseRun.summary.record_count, 2);
  assert.equal(parseRun.dashboard_export.records[0].response_count, 720);
  assert.equal(parseRun.dashboard_export.records[1].confidence_score, null);
  assert.match(parseRun.dashboard_export.records[0].caveats, /quoted for CSV parsing/);
  assert.equal(parseValidation.feeds.dashboard_import_runner, true);
  assert.equal(dashboardValidation.valid, true, dashboardValidation.gaps.join("; "));
  assert.equal(dashboardRun.summary.imported_count, 1);
  assert.equal(dashboardRun.summary.suppressed_count, 1);
});

test("aggregate export parser preserves stale k-min posture so dashboard runner blocks it", () => {
  const parseRun = buildAIFluencyAggregateExportParseRun({
    sourceType: "csv",
    sourceText: csvText([
      csvRow({
        k_min_posture: "k_min_30_function_level"
      })
    ]),
    parseId: "ai_fluency_aggregate_export_parse_stale_k_min",
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const parseValidation = validateAIFluencyAggregateExportParseRun(parseRun);
  const dashboardRun = buildAIFluencyDashboardImportRun({
    dashboardExport: parseRun.dashboard_export,
    runId: "ai_fluency_dashboard_import_from_stale_k_min",
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const dashboardValidation = validateAIFluencyDashboardImportRun(dashboardRun);

  assert.equal(parseValidation.valid, true, parseValidation.gaps.join("; "));
  assert.equal(parseRun.dashboard_export.records[0].k_min_posture, "k_min_30_function_level");
  assert.equal(dashboardValidation.valid, false);
  assert.ok(dashboardValidation.gaps.some((gap) => /k_min_posture/i.test(gap)));
  assert.equal(dashboardValidation.feeds.data_spine_ai_fluency_sources, false);
});

test("aggregate export parser accepts structured JSON object and JSON string inputs", () => {
  const sourceObject = {
    records: [
      baseRecord({
        caveats: "Aggregate-only JSON row."
      })
    ]
  };
  const objectRun = buildAIFluencyAggregateExportParseRun({
    sourceType: "json",
    sourceObject,
    parseId: "ai_fluency_aggregate_export_parse_json_object",
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const stringRun = buildAIFluencyAggregateExportParseRun({
    sourceType: "json",
    sourceText: JSON.stringify(sourceObject),
    parseId: "ai_fluency_aggregate_export_parse_json_string",
    generatedAt: "2026-06-21T00:00:00.000Z"
  });

  assert.equal(validateAIFluencyAggregateExportParseRun(objectRun).valid, true);
  assert.equal(validateAIFluencyAggregateExportParseRun(stringRun).valid, true);
  assert.deepEqual(objectRun.dashboard_export.records, stringRun.dashboard_export.records);
});

test("aggregate export parser normalizes organization rollup aliases to review-only overall", () => {
  const parseRun = buildAIFluencyAggregateExportParseRun({
    sourceType: "csv",
    sourceText: csvText([
      csvRow({
        function_area: "All Functions",
        workflow_family: "ai_fluency_readiness",
        cohort_key: "all_approved_responses",
        response_count: 720,
        source_ref:
          "ai-fluency-dashboard-export://atlantic-media/beta-2026/m6/organization-overall"
      })
    ]),
    parseId: "ai_fluency_aggregate_export_parse_org_overall_alias",
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const dashboardRun = buildAIFluencyDashboardImportRun({
    dashboardExport: parseRun.dashboard_export,
    runId: "ai_fluency_dashboard_import_from_org_overall_alias",
    generatedAt: "2026-06-21T00:00:00.000Z"
  });

  assert.equal(validateAIFluencyAggregateExportParseRun(parseRun).valid, true);
  assert.equal(parseRun.dashboard_export.records[0].function_area, "Organization Overall");
  assert.equal(dashboardRun.summary.imported_count, 0);
  assert.equal(dashboardRun.summary.held_count, 1);
  assert.equal(dashboardRun.feedable_data_spine_sources.length, 0);
});

test("aggregate export parser fails closed when required alignment keys are blank", () => {
  const parseRun = buildAIFluencyAggregateExportParseRun({
    sourceType: "csv",
    sourceText: csvText([
      csvRow({
        org_id: "",
        k_min_posture: ""
      })
    ]),
    parseId: "ai_fluency_aggregate_export_parse_missing_alignment",
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const validation = validateAIFluencyAggregateExportParseRun(parseRun);

  assert.equal(validation.valid, false);
  assert.equal(validation.feeds.dashboard_import_runner, false);
  assert.equal(parseRun.dashboard_export.records.length, 0);
  assert.ok(validation.gaps.some((gap) => /records\[0\]\.org_id is missing/i.test(gap)));
  assert.ok(validation.gaps.some((gap) => /records\[0\]\.k_min_posture is missing/i.test(gap)));
});

test("aggregate export parser fails closed on respondent-level headers", () => {
  const unsafeCsv = [
    [...CSV_HEADERS, "respondent_email"].join(","),
    `${csvRow()},person@example.com`
  ].join("\n");
  const parseRun = buildAIFluencyAggregateExportParseRun({
    sourceType: "csv",
    sourceText: unsafeCsv,
    parseId: "ai_fluency_aggregate_export_parse_unsafe_header",
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const validation = validateAIFluencyAggregateExportParseRun(parseRun);

  assert.equal(validation.valid, false);
  assert.equal(validation.feeds.dashboard_import_runner, false);
  assert.equal(parseRun.dashboard_export.records.length, 0);
  assert.ok(validation.gaps.some((gap) => /Forbidden aggregate export header/i.test(gap)));
});

test("aggregate export parser fails closed on unsafe identifier values", () => {
  const parseRun = buildAIFluencyAggregateExportParseRun({
    sourceType: "csv",
    sourceText: csvText([
      csvRow({
        cohort_key: "respondent-12345",
        source_ref: "google-sheets://person@example.com/revenue"
      })
    ]),
    parseId: "ai_fluency_aggregate_export_parse_unsafe_value",
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const validation = validateAIFluencyAggregateExportParseRun(parseRun);

  assert.equal(validation.valid, false);
  assert.equal(validation.feeds.dashboard_import_runner, false);
  assert.equal(parseRun.dashboard_export.records.length, 0);
  assert.ok(validation.gaps.some((gap) => /Unsafe aggregate export value/i.test(gap)));
});

test("aggregate export parser fails closed on ROI language in source-derived fields", () => {
  const parseRun = buildAIFluencyAggregateExportParseRun({
    sourceType: "csv",
    sourceText: csvText([
      csvRow({
        cohort_key: "roi cohort",
        function_area: "Revenue"
      })
    ]),
    parseId: "ai_fluency_aggregate_export_parse_unsafe_roi_language",
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const validation = validateAIFluencyAggregateExportParseRun(parseRun);

  assert.equal(validation.valid, false);
  assert.equal(validation.feeds.dashboard_import_runner, false);
  assert.equal(parseRun.dashboard_export.records.length, 0);
  assert.ok(validation.gaps.some((gap) => /Unsafe aggregate export value/i.test(gap)));
});

test("aggregate export parser fails closed on raw prompt language in source-derived fields", () => {
  const parseRun = buildAIFluencyAggregateExportParseRun({
    sourceType: "csv",
    sourceText: csvText([
      csvRow({
        function_area: "Raw prompt review"
      })
    ]),
    parseId: "ai_fluency_aggregate_export_parse_unsafe_raw_prompt_language",
    generatedAt: "2026-06-21T00:00:00.000Z"
  });
  const validation = validateAIFluencyAggregateExportParseRun(parseRun);

  assert.equal(validation.valid, false);
  assert.equal(validation.feeds.dashboard_import_runner, false);
  assert.equal(parseRun.dashboard_export.records.length, 0);
  assert.ok(validation.gaps.some((gap) => /Unsafe aggregate export value/i.test(gap)));
});
