# Google Sheets Aggregate Readiness Export

Adapter file:
`integrations/google-apps-script/ai_fluency_aggregate_readiness_export.gs`

Downstream runner:
`docs/contracts/ai-value-ai-fluency-dashboard-import-runner/README.md`

## Purpose

This contract defines a pasteable Google Apps Script adapter for creating an
aggregate AI Fluency readiness export from an existing Google Sheets workbook.

It does not replace the current AI Fluency Instrument workbook. Responses, Scores, Answer Detail, and Audit tabs can continue to store respondent-level data for present-day analysis inside the workbook. FluencyTracr consumes only the Aggregate Readiness Export tab.

The export tab is shaped for the existing AI Fluency Dashboard Import Runner.
It is aggregate readiness context only: not ROI proof, not a confidence model,
not a financial attribution model, not causality, not productivity measurement,
and not person-level evidence.

## Workbook Boundary

The adapter reads the existing `Responses` and `Scores` tabs, then writes a new
tab named `Aggregate Readiness Export`.

For the current AI Fluency Instrument workbook shape, `Responses` can be one
row per respondent while `Scores` can be a long table with multiple score rows
per respondent. The adapter may use the workbook's internal respondent join key
inside Apps Script to attach score rows to the right response metadata before
aggregation. That join key must not appear in the export tab.

The adapter must not:

- delete, rename, hide, clear, or rewrite source tabs;
- export respondent identifiers, result payloads, raw answers, emails, user
  IDs, employee names, raw text, or free-text responses;
- export ROI, probability, confidence-percentage, financial, attribution, or
  person-level fields;
- create backend routes, schemas, persistence, UI, migrations, or APIs.

The source workbook can retain its current Apps Script tabs and respondent-level
analysis workflow. The aggregate export tab is the only tab intended to leave
the workbook boundary for FluencyTracr review.

## Export Shape

The `Aggregate Readiness Export` tab emits function/workflow/cohort aggregate
rows plus one review-only organization overall row when source rows are
available. Function rows remain the feedable grain for the AI Fluency Dashboard
Import Runner. The organization overall row is descriptive review context only
and must not become a Data Spine function source.

The adapter should represent every aggregate-safe function it can derive from
`Responses` or `Scores`. If a function appears in `Responses` but has missing
or incomplete score rows, the function row is held with blank scores rather
than silently disappearing. If function metadata exists only on long-format
`Scores` rows, that safe grouping metadata is carried into the aggregate row.
Function slices below the hard small-cohort privacy floor are not emitted with
their function label or exact slice count; they are combined into a generic
`Suppressed Small Cohort Group` row with blank scores.

The review-only organization overall row uses:

- `function_area: Organization Overall`
- `workflow_family: ai_fluency_readiness`
- `cohort_key: all_approved_responses`

It may show an overall score only when every child function slice is independently
surfaceable and has complete score coverage. If any child function is held,
suppressed, below the k-minimum, or missing score coverage, the organization
overall row is held with blank scores to avoid inferring held function-level
evidence.

Rows use these fields:

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
- `overall_ai_fluency_score`
- `confidence_score`
- `usage_quality_score`
- `behavior_change_score`
- `leadership_reinforcement_score`
- `capability_growth_score`
- `baseline_overall_ai_fluency_score`
- `comparison_overall_ai_fluency_score`
- `movement_delta`
- `movement_direction`
- `source_ref`
- `source_owner_role`
- `owner_approval_state`
- `review_state`
- `caveats`

The row shape is intentionally aligned to the AI Fluency Dashboard Import Runner
so the export can be transformed into a structured `records` array upstream and
then passed to the runner without adding a new backend parser. Client and org
identity should be derived from safe source columns such as `clientId`,
`client_id`, `orgId`, or `org_id`; script-level context values are fallbacks
only when the source rows do not provide those fields. The adapter must have a
real `client_id` from either a source row or non-placeholder context before it
can export. If the current workbook has no separate `org_id`, the adapter may
use the real `client_id` as the first-pass org identifier.

## Suppression Rule

The adapter applies k-minimum suppression with a fixed response-count minimum of
20. A slice below 20 responses is written with:

- `suppression_state: suppressed_low_n`
- `review_state: held_suppressed_low_n`
- blank construct scores
- blank movement scores
- a caveat explaining that scores were suppressed

`suppressed_low_n` and `held_suppressed_low_n` are workbook-local export/review
states. They map to the canonical low-volume posture (`INSUFFICIENT_VOLUME`) in
downstream governance language; they are not new FluencyTracr suppression
reasons.

When both baseline and comparison rows exist for the same slice, both windows
must satisfy the k-minimum suppression rule before scores or movement are
exported. If the baseline window is absent, the comparison window alone controls
suppression for the current aggregate score row.

Rows with enough responses but incomplete construct score coverage are held with
blank scores and `review_state: held_incomplete_score_coverage`. This is an
evidence-completeness hold, not a new FluencyTracr suppression reason.

This 20-response threshold is the aggregate export readiness gate. It does not
replace the separate hard small-cohort floor where fewer than 5 responses should
remain suppressed in the broader Fluency Baseline model.

For the hard small-cohort privacy floor, any function slice with fewer than 5
responses in a required window is grouped into `Suppressed Small Cohort Group`.
That row suppresses the original function labels, exact small-slice counts, and
construct scores.

## Copy/Paste Instructions

1. Open the AI Fluency Instrument Google Sheet.
2. Open **Extensions > Apps Script**.
3. Add a new script file named `ai_fluency_aggregate_readiness_export`.
4. Paste the full contents of
   `integrations/google-apps-script/ai_fluency_aggregate_readiness_export.gs`.
5. Review the `EXPORT_CONTEXT` values at the top of the script. The adapter
   should read `client_id` / `org_id` dynamically from safe source columns when
   they exist. Use the `EXPORT_CONTEXT` values only as fallbacks for missing
   client/org identifiers, explicit `dashboard_export_id`, source owner role,
   and window dates. Do not leave `client_id` as a placeholder if the source
   rows do not include a client identifier.
6. Save the Apps Script project.
7. In Apps Script, select `rebuildAggregateReadinessExport` from the function
   dropdown and click **Run**.
8. Approve permissions if prompted.
9. Review the new `Aggregate Readiness Export` tab before sharing or importing.
10. Convert the tab rows into the AI Fluency Dashboard Import Runner
   `dashboardExport.records` shape. The runner remains the validator; this
   Apps Script adapter is only the workbook-side aggregate export layer.

The adapter intentionally avoids defining a global `onOpen` trigger because the
source AI Fluency Instrument workbook may already use `Code.gs` for its own
open-time behavior. If a temporary menu is useful, run
`addFluencyTracrAggregateReadinessExportMenu` from Apps Script after saving the
project. The direct run function remains the governed path.

## Expected Source Columns

The adapter is forgiving about header names. It looks for safe aggregate or
score columns such as:

- function, workflow, cohort, segment, or role-family columns;
- client or org identifiers such as `clientId`, `client_id`, `orgId`, or
  `org_id`;
- current workbook long-score columns such as `scoreKey` and `score`;
- eligible population count;
- baseline/comparison or collection window labels;
- window start and end dates;
- overall AI Fluency score;
- the five AI Fluency Flywheel v2.3 construct scores.

It ignores unsafe source columns rather than copying them forward.

## Identity Guardrails

The adapter fails closed before writing the export when:

- no real `client_id` can be derived from source rows or non-placeholder
  context;
- one export contains multiple `client_id` or `org_id` values;
- source-derived export fields contain unsafe values such as emails,
  respondent-like IDs, raw/free-text markers, probability/confidence-percent
  language, ROI language, or financial-attribution language.

This keeps the workbook export aligned to the downstream one-client,
one-org, one-window evidence packet shape.

## Review Checklist

Before importing the export into FluencyTracr:

- every row is aggregate-only;
- no source-tab respondent data appears in the export;
- every aggregate-safe function from `Responses` or long-format `Scores` is
  represented, unless the function cannot be safely identified or is below the
  hard small-cohort privacy floor;
- low-count slices have blank scores and suppression caveats;
- sub-5 function slices are grouped under `Suppressed Small Cohort Group`
  without their original function label or exact slice count;
- incomplete score-coverage rows are held with blank scores;
- the `Organization Overall` row is review-only and blank whenever any child
  function is held or suppressed;
- owner approval and review state are appropriate for the import stage;
- the export is being used as descriptive readiness context only.

## Non-Goals

This contract does not authorize:

- new canonical events;
- new suppression reasons;
- tunable thresholds;
- source workbook redesign;
- dashboard parsing inside FluencyTracr;
- customer-facing economic output;
- ROI, causality, productivity, probability, or financial-attribution claims;
- person, team, manager, department, or function ranking.
