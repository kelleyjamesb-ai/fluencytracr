# AI Value Operator Time-Series Run Contract

Schema version: `FT_AI_VALUE_OPERATOR_TIME_SERIES_RUN_2026_06`

Validator: `shared/src/aiValueEngine/operatorTimeSeriesRun.ts`

## Purpose

The Operator Time-Series Run is a contract-only wrapper for repeated governed
Operator Intake Adapter runs.

It assembles metadata-only run references across a repeated measurement cadence:

```text
Operator Intake Adapter run
-> governed run reference
-> milestone or rolling 30-day series
-> confidence-model design review input
```

This is the next productization layer in the evidence spine. It creates a
repeatable way to inspect whether the same aggregate workflow/function/cohort
has governed evidence across time before any future confidence-model candidate
is designed.

## Inputs

Required:

- `orgId`
- `clientId`
- `workflowFamily`
- `functionArea`
- `cohortKey`
- `windows`

Each `windows` item must provide either:

- an `operatorIntakeInput` object that can build a governed Operator Intake
  Adapter run; or
- an already-built `operatorIntakeRun`.

Inputs remain already-parsed aggregate-safe structured objects. This contract
does not parse uploaded documents, read Google Sheets, run BigQuery, query
Glean, or inspect customer source files.

## Time Cadences

### Milestone Series

Milestone windows are the time-bound reference path:

```text
Day 0
Day 30
Day 60
Day 90
Day 180
Day 365
```

A complete, aligned, governed milestone series may reach:

```text
READY_FOR_CONFIDENCE_MODEL_DESIGN_REVIEW
```

That state means the evidence spine has enough governed run references to
review a future model design. It does not execute a model and does not emit a
confidence value.

### Rolling 30-Day Series

Rolling 30-day windows are operating context only. They can show whether the
measurement cell is moving, stalling, or regressing between recurring windows,
but they are not independent attribution samples.

Rolling series must remain:

```text
HELD_FOR_OPERATING_CONTEXT_ONLY
```

They cannot feed confidence-model execution, finance-context investigation, or
customer-facing financial output.

## Decisions

- `READY_FOR_CONFIDENCE_MODEL_DESIGN_REVIEW`: all required milestone days are
  present, ordered, aligned, validated, and governed-run-reference ready.
- `HELD_FOR_INSUFFICIENT_GOVERNED_RUNS`: the series is structurally valid but
  one or more required milestone days are missing.
- `HELD_FOR_SOURCE_REVIEW`: one or more windows are structurally valid but not
  governed-run-reference ready.
- `HELD_FOR_OPERATING_CONTEXT_ONLY`: rolling 30-day context only.
- `BLOCKED`: unsafe fields, unsupported cadence, repeated milestone, mixed
  identity, stale embedded validation, or other structural drift fails closed.

## Alignment

Every window must align to the same:

- `org_id`
- `client_id`
- `workflow_family`
- `function_area`
- `cohort_key`

Each nested Operator Intake Adapter run is revalidated. Embedded validation
results must match recomputed validation results so stale child validation
cannot be carried forward.

## Output

The output includes:

- `time_windows`
- `operator_intake_runs`
- `governed_run_references`
- `validation_summary`
- `time_series_readiness`

Governed run references contain metadata only:

- operator run id
- Measurement Cell id
- Measurement Cell Assembly run id
- window mode
- milestone day where applicable
- baseline and comparison windows
- source object references

## Downstream Boundary

This contract may prepare references for later confidence-model design review.
It does not feed:

- confidence-model execution;
- finance-context investigation;
- Value Hypothesis packet execution;
- customer-facing financial output.

All downstream feeds remain false.

## Non-Goals

This contract does not:

- create a confidence percentage;
- emit probability;
- calculate ROI, EBITA, or EBITDA;
- prove causality;
- measure productivity;
- attribute financial movement to AI;
- rank people, teams, managers, departments, or functions;
- parse uploaded Blueprint, PDF, DOC, PPT, CSV, JSON, dashboard, or Google
  Sheets files;
- run BigQuery or Glean queries;
- ingest raw rows;
- persist data;
- create migrations, Prisma schemas, backend routes, frontend UI, or ingestion
  jobs.

## Blocked Uses

The time-series run must always block:

- realized ROI;
- EBITA or EBITDA claims;
- financial attribution;
- causality claims;
- productivity claims;
- headcount reduction claims;
- individual attribution;
- manager/team ranking;
- people decisioning;
- customer-facing financial output;
- confidence percentages;
- probability output.

## Validation

Run:

```bash
npm run test:ai-value-operator-time-series-run
```

Recommended adjacent checks:

```bash
npm run test:ai-value-operator-intake-adapter
npm run test:ai-value-source-package-review-queue
npm run test:ai-value-real-data-intake-packet-runner
npm run test:ai-value-measurement-cell-assembly-runner
npm run test:ai-value-measurement-cell
```
