# AI Value Operator Workflow Contract

Schema version: `FT_AI_VALUE_OPERATOR_WORKFLOW_2026_06`

Validator: `shared/src/aiValueEngine/operatorWorkflow.ts`

## Purpose

The Operator Workflow is the internal operating layer for the governed evidence
spine. It summarizes what an operator should do next across:

```text
Source Package Review Queue
-> Operator Intake Adapter
-> Measurement Cell Assembly
-> Operator Time-Series Run
-> Value Hypothesis Readiness Packet
-> Internal packet review
```

It is a productization contract for workflow state, missing evidence, blocked
reasons, review queue posture, and next actions. It does not create a UI,
backend route, persistence object, schema, live connector, confidence model, or
customer-facing financial output.

## Inputs

Required identity keys:

- `orgId`
- `clientId`
- `workflowFamily`
- `functionArea`
- `cohortKey`

Optional child objects:

- `operatorIntakeRun`
- `operatorTimeSeriesRun`
- `valueHypothesisPacket`

All child objects must already be aggregate-safe governed objects. This
contract does not parse Blueprint documents, Google Sheets, CSV, JSON, PDF,
PPT, DOC, dashboard exports, source files, BigQuery tables, or Glean queries.

## Workflow States

- `READY_FOR_INTERNAL_PACKET_REVIEW`: source review, Measurement Cell assembly,
  governed milestone time-series, and Value Hypothesis packet are all ready for
  internal packet review.
- `HELD_FOR_SOURCE_REVIEW`: source package review is missing, held, or not
  ready.
- `HELD_FOR_MEASUREMENT_CELL`: source review is ready, but Measurement Cell
  assembly is missing or held.
- `HELD_FOR_TIME_SERIES`: Measurement Cell is ready, but the governed milestone
  series is incomplete, missing, or rolling 30-day context only.
- `HELD_FOR_PACKET_PREPARATION`: governed evidence is ready, but the internal
  Value Hypothesis packet has not been prepared.
- `BLOCKED`: unsafe fields, child validation failure, stale embedded validation,
  or identity drift fails closed.

## Output

The output includes:

- `source_review_status`
- `operator_intake_status`
- `measurement_cell_status`
- `time_series_status`
- `packet_preparation_status`
- `missing_evidence`
- `blocked_reasons`
- `recommended_next_actions`
- `review_queue`

The workflow emits only a summary. It does not embed raw source rows, raw
exports, prompts, responses, transcripts, SQL, file contents, person-level
records, or full customer source objects.

## Downstream Boundary

The workflow may feed:

- internal operator review;
- internal Value Hypothesis packet review when all governed evidence clears.

The workflow never feeds:

- confidence-model execution;
- finance-context investigation;
- customer-facing financial output.

Finance-context investigation planning remains owned by the Value Hypothesis
Readiness Packet Runner and its Measurement Cell gates. The Operator Workflow
can show that a packet is prepared for internal review, but it cannot substitute
for those gates.

## Non-Goals

This contract does not:

- parse uploads or source files;
- run BigQuery, Glean queries, or live connectors;
- persist data;
- create migrations, Prisma schemas, backend routes, frontend UI, dashboards,
  or ingestion jobs;
- calculate ROI, EBITA, or EBITDA;
- prove causality;
- measure productivity;
- emit financial attribution;
- emit confidence percentages, probabilities, p-values, or contribution scores;
- rank people, teams, managers, departments, or functions;
- produce customer-facing financial or economic output.

## Blocked Uses

The workflow always blocks:

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
npm run test:ai-value-operator-workflow
```

Recommended adjacent checks:

```bash
npm run test:ai-value-operator-intake-adapter
npm run test:ai-value-operator-time-series-run
npm run test:ai-value-source-package-review-queue
npm run test:ai-value-measurement-cell-assembly-runner
npm run test:ai-value-value-hypothesis-readiness-packet-runner
```
