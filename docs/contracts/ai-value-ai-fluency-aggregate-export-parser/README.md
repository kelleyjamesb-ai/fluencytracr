# AI Fluency Aggregate Export Parser

Parser:
`shared/src/aiValueEngine/aiFluencyAggregateExportParser.ts`

Downstream runner:
`docs/contracts/ai-value-ai-fluency-dashboard-import-runner/README.md`

Upstream export:
`docs/contracts/ai-value-google-sheets-aggregate-export/README.md`

## Purpose

The AI Fluency Aggregate Export Parser converts already-exported Google Sheets
`Aggregate Readiness Export` CSV text, JSON strings, JSON arrays, or structured
JSON objects into the existing AI Fluency Dashboard Import Runner input shape:

```text
{
  export_type,
  governance_posture,
  records
}
```

The parser is only an adapter between the workbook export boundary and the
existing runner. It does not read source workbook tabs, parse respondent-level
data, persist output, create schemas, add routes, create UI, run live
connectors, or produce Measurement Cell or finance-context output.

The productized output is a governed parse run with:

- `schema_version`
- `parse_id`
- `source_type`
- `input_gaps`
- `summary`
- `dashboard_export`
- `feeds.dashboard_import_runner`
- `feeds.measurement_cell_input: false`
- `feeds.customer_facing_financial_output: false`
- blocked uses and boundary policy

The run may feed the Dashboard Import Runner only when parsing succeeds and at
least one aggregate record remains. It never feeds Measurement Cell directly.

## Accepted CSV Headers

CSV input must use only the documented Google Sheets Aggregate Readiness Export
headers:

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

Blank numeric CSV cells normalize to `null`, not `0`.

## Required Row Values

The parser fails closed before runner handoff when required source-alignment
values are blank:

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
- `response_count`
- `suppression_state`
- `k_min_posture`
- `source_ref`
- `source_owner_role`
- `owner_approval_state`
- `review_state`

Organization rollup aliases such as `Overall`, `Org Overall`, and
`All Functions` normalize to `Organization Overall`. The downstream runner still
treats organization-overall rows as review-only and non-feedable.

## JSON Inputs

JSON input may be:

- an array of aggregate records;
- a stringified array of aggregate records;
- an object containing `records`;
- a stringified object containing `records`.

If `governance_posture` is omitted, the parser adds the safe aggregate-only
posture required by the Dashboard Import Runner. If a JSON input provides
governance posture fields, the parser preserves those values for downstream
validation rather than converting unsafe posture to safe posture.

## Fail-Closed Guards

The parser rejects unsupported headers, unsupported record fields, unsupported
top-level fields, raw/person-level fields, respondent identifiers, emails, raw
answers or raw text, confidence-percentage or probability output, ROI or
financial-attribution output, productivity or causality claim language, and
route/schema/persistence/UI hints.

The parser preserves `k_min_posture` exactly as exported. A stale
`k_min_30_function_level` record remains stale data so the Dashboard Import
Runner can block it; the parser must not silently rewrite it to
`k_min_20_function_level`.

The downstream Dashboard Import Runner also fails closed if `k_min_posture` is
missing, treats any organization-overall alias as review-only, and keeps the
generic `Suppressed Small Cohort Group` non-feedable even if count or review
fields drift.

## Boundaries

This contract does not authorize:

- respondent-level imports;
- new canonical events;
- new suppression reasons;
- tunable thresholds;
- backend routes;
- frontend UI;
- schemas, migrations, or persistence;
- live Google Sheets connectors;
- ROI, causality, productivity, probability, confidence-percentage, financial
  attribution, or customer-facing economic output.

## Tests

Run:

```bash
npm run test:ai-value-ai-fluency-aggregate-export-parser
```
