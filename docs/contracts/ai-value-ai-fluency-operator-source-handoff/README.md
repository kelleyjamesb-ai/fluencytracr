# AI Fluency Operator Source Handoff

Schema version: `FT_AI_VALUE_AI_FLUENCY_OPERATOR_SOURCE_HANDOFF_2026_06`

Validator: `shared/src/aiValueEngine/aiFluencyOperatorSourceHandoff.ts`

## Purpose

The AI Fluency Operator Source Handoff bridges a validated aggregate AI Fluency
parser run and a validated Dashboard Import Runner run into the existing
Operator Intake Adapter source shape.

It exists to prevent operators from manually stitching together:

- parser run metadata;
- dashboard import feedable Data Spine source candidates;
- `source_owner_role`;
- source package `aggregate_export_id`; and
- Measurement Cell AI Fluency context.

## Flow

```text
Google Sheets Aggregate Readiness Export
-> AI Fluency Aggregate Export Parser
-> AI Fluency Dashboard Import Runner
-> AI Fluency Operator Source Handoff
-> Operator Intake Adapter
```

The handoff produces:

- `operator_source` for the Data Spine `ai_fluency` lane;
- `ai_fluency_context` for the operator-provided Measurement Cell input,
  including the same org/client/workflow/function/cohort/window/source
  alignment keys and source-review metadata carried by the selected operator
  source;
- `source_package_reference.source_refs.aggregate_export_id` for reviewed
  layer-2 source package alignment.

## Feed Rules

The handoff can be `READY_FOR_OPERATOR_INTAKE` only when:

- the parser run validates;
- the dashboard import run validates;
- exactly one feedable AI Fluency source is selected, or a `sourceRef` selects
  one feedable source;
- the selected source exists in the parser run records;
- the selected parser record carries `source_owner_role`;
- the selected row has already cleared the Dashboard Import Runner import
  predicate.

If the parser or dashboard run is invalid, the handoff is `BLOCKED`. If the
dashboard run is valid but has no feedable AI Fluency source, the handoff is
`HELD_NO_FEEDABLE_AI_FLUENCY_SOURCE`.

## Boundaries

The handoff does not:

- parse files;
- read Google Sheets;
- run BigQuery or Glean queries;
- persist data;
- create migrations, Prisma schemas, backend routes, frontend UI, or ingestion
  jobs;
- feed Measurement Cell directly;
- validate a Measurement Cell;
- feed finance-context investigation;
- feed confidence modeling;
- calculate ROI, EBITA, EBITDA, causality, productivity, financial
  attribution, confidence percentages, or probabilities;
- create customer-facing financial output;
- include respondent-level, person-level, team-ranking, or manager-ranking
  data.

## Validation

Run:

```bash
npm run test:ai-value-operator-intake-adapter
```

Recommended adjacent checks:

```bash
npm run test:ai-value-ai-fluency-aggregate-export-parser
npm run test:ai-value-ai-fluency-dashboard-import-runner
npm run test:ai-value-ai-fluency-client-import
npm run test:ai-value-source-package-review-queue
```
