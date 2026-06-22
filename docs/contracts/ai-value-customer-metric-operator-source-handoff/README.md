# Customer Metric Operator Source Handoff

Schema version: `FT_AI_VALUE_CUSTOMER_METRIC_OPERATOR_SOURCE_HANDOFF_2026_06`

Validator: `shared/src/aiValueEngine/customerMetricOperatorSourceHandoff.ts`

## Purpose

The Customer Metric Operator Source Handoff bridges a validated Customer Metric
Intake into the existing Operator Intake Adapter source shape.

It exists to prevent operators from manually stitching together:

- customer-owned aggregate metric intake metadata;
- Data Spine `customer_metric` source posture;
- source owner and metric owner roles;
- selected metric context for Measurement Cell input;
- metric movement context;
- Layer 3 business-system metric context; and
- Layer 3 Source Package alignment reference.

## Flow

```text
Customer-owned aggregate metric entry or export metadata
-> Customer Metric Intake
-> Customer Metric Operator Source Handoff
-> Operator Intake Adapter
-> Source Package Review Queue
-> Measurement Cell Assembly
```

The handoff produces:

- `operator_source` for the Data Spine `customer_metric` lane;
- `selected_metric_context` for operator-provided Measurement Cell input;
- `metric_movement_context` for aggregate movement context;
- `layer_3_metric_context` for customer-owned business-system outcome context;
  and
- `source_package_reference.source_refs.aggregate_outcome_export_id` for
  reviewed Layer 3 source package alignment.

`source_package_reference` is an alignment hint only. It does not certify Source
Package Review Queue clearance. A matching valid, feedable, aligned
`layer_3_business_system_of_record_outcome_export` Source Package is still
required before package-backed source review can clear.

## Feed Rules

The handoff can be `READY_FOR_OPERATOR_INTAKE` only when:

- the Customer Metric Intake validates;
- the intake can feed the Data Spine `customer_metric` source lane;
- the intake can prepare selected metric and Layer 3 metric context;
- the source is aggregate-only, owner-role tagged, metric-owner tagged,
  approved, clear, and current;
- selected metric context, metric movement context, Layer 3 metric context, and
  Source Package reference stay aligned to the same source ref and aggregate
  identity.

Held, stale, unapproved, unreviewed, invalid, raw, person-level, unsafe, or
misaligned metric evidence remains non-feedable. Held or blocked handoffs may
be structurally valid, but all feeds must remain false and consumers must check
`decision` plus `feeds`, not `valid` alone.

## Boundaries

The handoff does not:

- parse uploaded files;
- run customer connectors;
- run BigQuery;
- ingest raw rows, query text, prompts, responses, transcripts, or file
  contents;
- persist data;
- create migrations, Prisma schemas, backend routes, frontend UI, or ingestion
  jobs;
- certify Source Package Review Queue clearance;
- feed Measurement Cell directly;
- validate a Measurement Cell;
- feed finance-context investigation;
- feed confidence modeling;
- calculate ROI, EBITA, EBITDA, causality, productivity, financial
  attribution, confidence percentages, or probabilities;
- create customer-facing financial output; or
- include individual, manager, team, department, or person-level data.

## Required Blocked Uses

Every handoff blocks:

- `realized_roi`
- `ebita_claim`
- `ebitda_claim`
- `financial_attribution`
- `causality_claim`
- `productivity_claim`
- `headcount_reduction_claim`
- `individual_attribution`
- `manager_or_team_ranking`
- `department_ranking`
- `people_decisioning`
- `customer_facing_financial_output`
- `confidence_percentage`
- `probability_output`

## Validation

Run:

```bash
npm run test:ai-value-customer-metric-operator-source-handoff
```

Recommended adjacent checks:

```bash
npm run test:ai-value-customer-metric-intake
npm run test:ai-value-source-package-review-queue
npm run test:ai-value-operator-intake-adapter
npm run test:ai-value-measurement-cell-assembly-runner
```
