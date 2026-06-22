# AI Value Operator Evidence Package Runner Contract

Schema version: `FT_AI_VALUE_OPERATOR_EVIDENCE_PACKAGE_RUN_2026_06`

Validator: `shared/src/aiValueEngine/operatorEvidencePackageRunner.ts`

## Purpose

The Operator Evidence Package Runner is the internal package composer for the
governed evidence spine. It takes already-parsed aggregate-safe source inputs
for repeated windows and composes the existing operator objects:

```text
approved aggregate source inputs
-> Operator Intake Adapter runs
-> Operator Time-Series Run
-> Operator Workflow
-> internal operator workflow review
```

It exists so an operator can move from approved aggregate evidence inputs to a
single governed package state without hand-stitching child objects. It is not a
new evidence layer and does not upgrade readiness beyond the underlying child
objects.

The runner uses full child objects only while composing the package. The
exported package keeps compact source-bound references and validation summaries
so nested child payloads cannot become a side door for finance-context actions,
confidence output, raw source data, or person-level fields.

## Inputs

Required:

- `orgId`
- `clientId`
- `workflowFamily`
- `functionArea`
- `cohortKey`
- `measurementPlan`
- `windows`

Each window may include:

- `milestoneDay`
- `windowMode`
- `rollingWindowIndex`
- `baselineWindow`
- `comparisonWindow`
- `sources`
- `sourcePackages`
- `scrubbedGleanExports`
- `measurementCellInput`
- optional already-built `operatorIntakeRun`
- optional already-built `valueHypothesisPacket`

Inputs must already be structured, aggregate-safe objects. This runner does not
parse Blueprint uploads, Google Sheets, CSV, JSON, dashboard rows, PDF, PPT,
DOC, BigQuery rows, Glean queries, or customer source files.

## Package States

- `READY_FOR_INTERNAL_OPERATOR_WORKFLOW_REVIEW`: milestone evidence, source
  review, Measurement Cell assembly, Operator Time-Series Run, Operator
  Workflow, and Value Hypothesis packet are all ready for internal operator
  review.
- `HELD_FOR_SOURCE_REVIEW`: reviewed Source Packages are missing, held,
  suppressed, or misaligned.
- `HELD_FOR_MEASUREMENT_CELL`: source review cleared but Measurement Cell
  assembly is missing or held.
- `HELD_FOR_TIME_SERIES`: Measurement Cell evidence is available, but the
  governed milestone time-series is incomplete, missing, or rolling 30-day
  context only.
- `HELD_FOR_PACKET_PREPARATION`: governed evidence clears but the Value
  Hypothesis packet is missing.
- `BLOCKED`: unsafe fields, child validation failure, stale embedded
  validation, identity drift, window drift, or derived-summary drift fails
  closed.

The [Measurement Cell Series](../ai-value-measurement-cell-series/README.md)
contract may be used before this runner to inspect repeated Measurement Cell
Assembly continuity. That compatibility is metadata-only and does not create a
parallel package runner, execute confidence models, feed finance-context
investigation, or emit customer-facing financial output.

## Time Windows

Milestone windows are the time-bound path:

```text
Day 0
Day 30
Day 60
Day 90
Day 180
Day 365
```

Rolling 30-day windows may be packaged as operating context only. They cannot
feed confidence-model execution, finance-context investigation, or
customer-facing financial output.

## Validation

During package construction, the runner builds or accepts full child objects,
recomputes child validation, and rejects stale embedded validation for:

- Operator Intake Adapter runs;
- Value Hypothesis packets;
- Operator Time-Series Run;
- Operator Workflow.

The emitted package then validates compact public references against the
embedded validation summaries and derived package surfaces. It verifies identity,
measurement-plan, and window alignment across:

- `org_id`
- `client_id`
- `measurement_plan_id`
- `workflow_family`
- `function_area`
- `cohort_key`
- baseline window
- comparison window

The validator also fails closed if package-level guidance, blocked reasons,
allowed uses, blocked uses, feed keys, or boundary-policy keys drift from the
derived contract.

Value Hypothesis packet references are compacted to identifiers, workflow/window
binding, validation state, missing evidence, and false feed flags. Finance-context
readiness labels and packet actions are not exposed by this package runner.

Assumption or ROI Bot context cannot substitute for reviewed Source Packages,
Measurement Cells, governed time-series evidence, or a Value Hypothesis
packet.

## Downstream Boundary

The package may feed:

- internal operator package review;
- internal operator workflow review when all child gates clear.

The package never feeds:

- confidence-model execution;
- finance-context investigation;
- customer-facing financial output.

Finance-context investigation planning remains owned by the Value Hypothesis
Readiness Packet Runner and its Measurement Cell gates. This package can show
that the operator workflow is ready for internal review, but it cannot
substitute for those gates.

## Non-Goals

This contract does not:

- parse uploads or source files;
- run BigQuery, Glean queries, or live connectors;
- persist data;
- create migrations, Prisma schemas, backend routes, frontend UI, dashboards,
  ingestion jobs, or schemas;
- execute confidence models;
- emit confidence percentages, probabilities, p-values, or contribution
  scores;
- calculate ROI, EBITA, or EBITDA;
- prove causality;
- measure productivity;
- emit financial attribution;
- rank people, teams, managers, departments, or functions;
- produce customer-facing financial or economic output.

## Blocked Uses

The package always blocks:

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

## Validation Command

Run:

```bash
npm run test:ai-value-operator-evidence-package-runner
```

Recommended adjacent checks:

```bash
npm run test:ai-value-operator-workflow
npm run test:ai-value-operator-time-series-run
npm run test:ai-value-operator-intake-adapter
npm run test:ai-value-source-package-review-queue
npm run test:ai-value-measurement-cell-assembly-runner
npm run test:ai-value-value-hypothesis-readiness-packet-runner
```
