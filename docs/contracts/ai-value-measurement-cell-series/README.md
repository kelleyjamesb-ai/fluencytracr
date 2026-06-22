# AI Value Measurement Cell Series

## Purpose

The Measurement Cell Series is a contract-only continuity layer over already
assembled Measurement Cell Assembly outputs. It emits a compact Evidence
Continuity Manifest for repeated Day 0 / 30 / 60 / 90 / 180 / 365 Measurement
Cell windows.

It exists to make repeated Measurement Cell coverage inspectable before the
existing Operator Time-Series and Operator Evidence Package path consumes
metadata references. It is not a second Operator Time-Series object.

## Inputs

- `orgId`
- `clientId`
- `workflowFamily`
- `functionArea`
- `cohortKey`
- ordered `windows[]`, each with:
  - `milestoneDay`
  - validated `measurementCellAssemblyRun`
  - optional embedded `measurementCellAssemblyValidationResult`

Every Measurement Cell Assembly run is revalidated with
`validateMeasurementCellAssemblyRun`. Embedded validation must match the
recomputed result.

## Output

- `measurement_cell_windows`: compact per-window status records
- `repeated_measurement_cell_refs`: compact Measurement Cell reference list
- `evidence_continuity_manifest`: full-window continuity manifest
- `alignment_manifest`: cross-window identity, metric, source-ref, and milestone alignment
- `operator_time_series_compatibility`: metadata-only compatibility reference for the existing Operator path

Valid decisions:

- `CONTINUITY_COVERAGE_COMPLETE`
- `HELD_FOR_EVIDENCE_CONTINUITY`
- `BLOCKED`

`CONTINUITY_COVERAGE_COMPLETE` only means all required milestone windows are
present, aligned, and individually ready. It does not imply confidence-model,
finance-context, ROI, probability, causality, productivity, or customer-facing
readiness.

## Fail-Closed Rules

The series blocks on:

- missing, repeated, unsupported, or out-of-order milestone windows
- held, suppressed, missing, or blocked Measurement Cell Assembly windows
- stale embedded validation
- org, client, workflow, function, cohort, metric, window, or source-ref drift
- bare direct references that do not carry recomputed Measurement Cell Assembly validation metadata
- unsafe fields or values, including raw rows, query text, prompts, transcripts, user identifiers, person identifiers, ranking fields, ROI, finance, confidence, probability, causality, productivity, or customer-facing financial output

Held or suppressed windows remain visible in the manifest. Later ready windows
cannot rescue earlier held, suppressed, missing, or blocked windows.

## Boundary

This contract does not add UI, routes, persistence, schemas, migrations, live
BigQuery or Glean execution, connectors, confidence math, ROI math, causality
logic, productivity measurement, probability output, finance output, or
customer-facing financial output.

Operator path compatibility is metadata-only. The existing Operator
Time-Series and Operator Evidence Package contracts remain the orchestration
path.
