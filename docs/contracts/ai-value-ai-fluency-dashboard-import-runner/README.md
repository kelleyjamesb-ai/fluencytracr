# AI Fluency Dashboard Import Runner

Schema version: `FT_AI_VALUE_AI_FLUENCY_DASHBOARD_IMPORT_RUN_2026_06`

Validator: `shared/src/aiValueEngine/aiFluencyDashboardImportRunner.ts`

## Purpose

The AI Fluency Dashboard Import Runner turns already-parsed aggregate dashboard
exports into validated AI Fluency client imports and Data Spine source
candidates.

It is the batch layer above the single-row AI Fluency Client Import adapter:

```text
AI Fluency dashboard CSV/JSON export
-> upstream file or dashboard parser
-> parsed aggregate rows
-> AI Fluency Dashboard Import Runner
-> AI Fluency Client Import objects
-> Data Spine AI Fluency sources
```

This runner does not parse CSV, Excel, PDF, slides, docs, or dashboard files.
It accepts structured aggregate rows only.

## Import Predicate

A row can feed a Data Spine AI Fluency source only when:

```text
suppression_state == none
AND owner_approval_state == approved
AND review_state == approved_for_import
AND response_count >= 20
AND function_area is not Organization Overall
```

Rows that fail owner/review approval are held. Rows below the response-count
minimum or marked suppressed are suppressed and cannot carry construct scores
into downstream sources.

Rows with `function_area: Organization Overall` are always held as review-only
aggregate context, even if the row carries approved owner/review fields. The
feedable grain is the independently governed function/workflow/cohort row, not
the organization-wide rollup.

This 20-response threshold is the AI Fluency dashboard import readiness gate.
It is separate from the lower Fluency Baseline privacy floor for very small
cohorts, where fewer than 5 remains the hard small-cohort suppression floor.

If the export-level posture is unsafe, if forbidden fields or unsafe identifier
values are detected, or if source alignment keys mix values across rows, the
whole run is blocked and produces zero feedable Data Spine sources.

Required run-level alignment:

- `org_id`
- `client_id`
- `dashboard_export_id`
- `instrument_id`
- `instrument_version`
- `baseline_window_start`
- `baseline_window_end`
- `comparison_window_start`
- `comparison_window_end`

## Supported Fixture Shape

The runner supports the aggregate readiness export shape produced for the
Atlantic-style fixture:

- `client_id`
- `org_id`
- `instrument_id`
- `instrument_version`
- `collection_mode`
- `dashboard_export_id`
- `baseline_window_start`
- `baseline_window_end`
- `comparison_window_start`
- `comparison_window_end`
- `function_area`
- `workflow_family`
- `cohort_key`
- `eligible_population_count`
- `response_count`
- `response_rate`
- `suppression_state`
- `k_min_posture`
- five AI Fluency Flywheel v2.3 construct scores on a 0-100 scale
- baseline/comparison overall AI Fluency scores
- movement delta and direction
- `source_ref`
- `source_owner_role`
- `owner_approval_state`
- `review_state`
- caveats

The runner converts 0-100 construct scores to the existing Fluency Baseline
1-5 mean scale for internal compatibility. This conversion is representation
normalization only; it is not an impact, productivity, ROI, probability, or
financial attribution model.

If the Google Sheets adapter emits a review-only organization overall row, the
runner may preserve it for row-level diagnostics, but it must not produce a
Data Spine AI Fluency source from that row.

## Output Decisions

- `IMPORTED`: row is approved, clear, non-suppressed, and can produce a Data
  Spine AI Fluency source.
- `HELD`: row is aggregate-safe but missing owner approval or review clearance.
- `SUPPRESSED`: row is below response-count minimum or explicitly suppressed.
- `BLOCKED`: row fails validation or contains unsafe fields.

When the run is blocked, row-level artifacts remain inspectable for reviewer
diagnostics, but every row is non-feedable and the run feeds are false.

## Boundaries

The runner must not:

- collect individual instrument responses;
- retain raw survey answers, raw text, prompts, files, or dashboard rows;
- include employee names, emails, user IDs, respondent IDs, or person-level
  fields;
- rank people, managers, teams, or functions;
- emit ROI proof, causality claims, productivity claims, financial attribution,
  confidence percentages, probabilities, or customer-facing financial output;
- persist data, create schemas, create backend routes, or create frontend UI.

## Tests

Run:

```bash
npm run test:ai-value-ai-fluency-dashboard-import-runner
```

The Google Sheets aggregate export adapter is documented separately in
`docs/contracts/ai-value-google-sheets-aggregate-export/README.md`.
