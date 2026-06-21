# AI Value Customer Metric Intake Contract

Schema version: `FT_AI_VALUE_CUSTOMER_METRIC_INTAKE_2026_06`

Validator: `shared/src/aiValueEngine/customerMetricIntake.ts`

## Purpose

Customer Metric Intake is the contract-only normalizer for customer-owned
aggregate metric evidence.

It prepares:

- a Data Spine `customer_metric` source lane object;
- a Measurement Cell `selectedMetric` input;
- Layer 3 business-system metric context.

It exists so customer-provided metric evidence can move through the governed
Value Hypothesis Readiness spine without depending on synthetic-only fixtures.

## Inputs

Required:

- `measurementPlan`
- `orgId`
- `clientId`
- `workflowFamily`
- `functionArea`
- `cohortKey`
- `intakeMode`
- `metric`
- `baselineWindow`
- `comparisonWindow`
- `baselineValue`
- `comparisonValue`
- `sourceRef`
- `sourceOwnerRole`
- `metricOwnerRole`
- `ownerApprovalState`
- `reviewState`
- `freshnessState`
- `aggregateOnly`

Supported intake modes:

- `manual_customer_metric_entry`
- `customer_metric_aggregate_export`

The metric must include a selected `metric_id`, direction, unit, source-system
context, and either a `normalization_denominator` or `metric_definition_ref`.

## Decisions

- `READY_FOR_DATA_SPINE_AND_MEASUREMENT_CELL`: metric evidence is aggregate,
  source-bound, owner-approved, fresh, plan-aligned, and safe to feed Data Spine
  and Measurement Cell preparation.
- `HELD_FOR_METRIC_EVIDENCE`: metric evidence is structurally reviewable but
  stale, not owner-approved, not clear, or missing metric-definition context.
- `BLOCKED`: Measurement Plan binding, source identity, windows, unsafe fields,
  raw data, person-level data, ROI/probability/financial side doors, route/UI,
  persistence, schema, weight, or threshold fields fail closed.

## Alignment Rules

The intake binds customer metric evidence to the Measurement Plan across:

- `org_id`
- `workflow_family`
- `function_area`
- primary `metric_id`
- baseline window
- comparison window

Ready output also carries:

- `client_id`
- `cohort_key`
- `source_ref`
- source owner role
- metric owner role
- approval state
- freshness state

## Hard Boundaries

This contract does not:

- parse raw files;
- run customer connectors;
- run BigQuery;
- store raw rows or source data;
- persist objects;
- create migrations or Prisma schemas;
- create backend routes;
- create frontend UI;
- create ingestion jobs;
- feed finance-context investigation planning directly;
- produce customer-facing financial output.

It must never emit ROI proof, EBITA or EBITDA claims, financial attribution,
causality claims, productivity claims, headcount reduction claims, individual
attribution, manager/team/department ranking, people decisioning, confidence
percentages, probability outputs, threshold tuning, formula weights, or
customer-facing prediction.

## Validation

Run:

```bash
npm run test:ai-value-customer-metric-intake
```

Recommended adjacent checks:

```bash
npm run test:ai-value-data-spine-readiness
npm run test:ai-value-measurement-cell-assembly-runner
npm run test:ai-value-value-hypothesis-readiness-packet-runner
```
