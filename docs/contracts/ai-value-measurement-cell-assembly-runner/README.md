# AI Value Measurement Cell Assembly Runner Contract

Schema version: `FT_AI_VALUE_MEASUREMENT_CELL_ASSEMBLY_RUN_2026_06`

Validator: `shared/src/aiValueEngine/measurementCellAssemblyRunner.ts`

## Purpose

The Measurement Cell Assembly Runner is the contract-only bridge from aligned
Data Spine Readiness and validated aggregate source objects into the canonical
Measurement Cell.

It reuses the existing Measurement Cell builder and validator. It does not
create a second measurement object.

```text
Data Spine Readiness
-> Source Package Review Queue
-> Measurement Plan
-> optional Real Data Intake Packet Run
-> Measurement Cell Assembly Runner
-> validated Measurement Cell
-> Value Hypothesis packet preparation
```

## Inputs

Required:

- `dataSpineReadiness`
- `measurementPlan`
- `measurementCellInput`

Optional:

- `sourcePackageReviewQueue`
- `realDataIntakePacketRun`
- `runId`
- `generatedAt`

When Data Spine is otherwise ready to feed Measurement Cell input, a valid
Source Package Review Queue in `DATA_SPINE_REVIEW_READY` is mandatory before
assembly can proceed. Missing or held source review produces
`HELD_FOR_SOURCE_PACKAGE_REVIEW`; invalid or misaligned source review fails
closed as `BLOCKED`.

If a Real Data Intake Packet Run is supplied, it must validate and feed
Measurement Cell input. Held or invalid real-data intake cannot be used as a
shortcut into assembly.

The Measurement Plan is required for a ready handoff. The runner binds the
assembled cell to the selected workflow, function, primary metric, and
baseline/comparison windows in that plan.

## Decisions

- `READY_FOR_VALUE_HYPOTHESIS_PACKET_RUNNER`: Data Spine is ready, source refs
  align to the Measurement Plan, the Source Package Review Queue is valid and
  `DATA_SPINE_REVIEW_READY`, the optional Real Data Intake packet is valid if
  supplied, and the built Measurement Cell validates.
- `HELD_FOR_DATA_SPINE`: Data Spine is structurally valid but not ready to feed
  Measurement Cell assembly.
- `HELD_FOR_SOURCE_PACKAGE_REVIEW`: Data Spine is otherwise ready, but the
  Source Package Review Queue is missing or still held for source review.
- `HELD_FOR_REAL_DATA_INTAKE`: Data Spine is ready but the supplied real-data
  intake packet is held and cannot feed Measurement Cell assembly.
- `HELD_FOR_MEASUREMENT_CELL`: source binding cleared but the Measurement Cell
  itself does not validate.
- `BLOCKED`: source identity, source refs, windows, unsafe fields, or nested
  validation fail closed.

## Alignment Rules

The runner verifies that Measurement Cell input matches the Data Spine across:

- `org_id`
- `client_id` through the Data Spine object
- `function_area`
- `workflow_family`
- `cohort_key`
- baseline and comparison windows
- Blueprint source reference
- AI Fluency source reference
- VBD/token source reference
- selected customer metric source reference
- selected metric id when present

The runner also verifies that the Data Spine and Measurement Cell input match
the Measurement Plan across:

- `org_id`
- `workflow_family`
- `workflow_id` when the plan supplies one
- `function_area`
- selected primary `metric_id`
- baseline and comparison windows

When a Real Data Intake Packet Run is supplied, it must bind back to the same
Measurement Plan, Data Spine readiness id, function, cohort, windows, customer
metric id, and source refs.

When a Source Package Review Queue is supplied, it must bind back to the same
Data Spine readiness id, org, client, workflow family, function, cohort, and
baseline/comparison windows. The runner recomputes queue validation and does
not trust embedded queue validation results as proof.

The runner recomputes nested validations during validation and compares the
embedded validation objects against the recomputed results. Embedded validation
results are not trusted as proof.

## Rolling 30-Day Boundary

Rolling 30-day Measurement Cells may assemble as operating context. They can
feed Value Hypothesis packet preparation when the Measurement Cell validates,
but they must not feed finance-context investigation planning or Bayesian
research design planning.

## Hard Boundaries

The runner does not:

- parse Blueprint documents;
- import dashboard rows;
- run BigQuery;
- store raw rows or source files;
- persist objects;
- create migrations or Prisma schemas;
- create backend routes;
- create frontend UI;
- create ingestion jobs;
- create Value Hypothesis packets directly;
- emit customer-facing financial output.

The runner must never emit ROI proof, EBITA or EBITDA claims, financial
attribution, causality claims, productivity claims, headcount reduction claims,
individual attribution, manager/team/department ranking, people decisioning,
confidence percentages, probability outputs, or customer-facing prediction.

## Validation

Run:

```bash
npm run test:ai-value-measurement-cell-assembly-runner
```

Recommended adjacent checks:

```bash
npm run test:ai-value-data-spine-readiness
npm run test:ai-value-real-data-intake-packet-runner
npm run test:ai-value-measurement-cell
npm run test:ai-value-value-hypothesis-readiness-packet-runner
```
