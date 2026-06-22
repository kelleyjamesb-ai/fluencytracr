# Operator Source Handoff Bundle

Schema version: `FT_AI_VALUE_OPERATOR_SOURCE_HANDOFF_BUNDLE_2026_06`

Validator: `shared/src/aiValueEngine/operatorSourceHandoffBundle.ts`

## Purpose

The Operator Source Handoff Bundle composes already-governed operator source
handoffs into one compact preparation manifest for the operator workflow.

It exists to keep lane handoffs aligned across:

- Blueprint;
- AI Fluency;
- VBD + Token;
- Customer Metric;
- Assumption; and
- Governance.

The bundle is not a new evidence object, clearance object, runtime runner, or
gate. It prepares operator sources, Measurement Cell context fragments, and
Source Package alignment references only.

## Flow

```text
VBD + Token Operator Source Handoff
Blueprint Operator Source Handoff
AI Fluency Operator Source Handoff
Customer Metric Operator Source Handoff
Assumption / Governance Operator Source Handoff
-> Operator Source Handoff Bundle
-> Operator Intake Adapter
-> Source Package Review Queue
-> Measurement Cell Assembly
```

The bundle produces:

- `operator_sources` keyed by governed lane;
- `measurement_cell_context_fragments` keyed by governed lane;
- `source_package_references` for package alignment only; and
- `alignment_manifest` for shared org, client, workflow, function, cohort,
  window, metric, and source-ref alignment.

## Feed Rules

The bundle can be `READY_FOR_OPERATOR_PREPARATION` only when every embedded
lane handoff recomputes to the provided handoff, validates, and remains
`READY_FOR_OPERATOR_INTAKE`.

The bundle deliberately does not trust embedded `valid: true` flags. It
rebuilds lane handoffs from their source inputs and rejects stale or tampered
handoff objects.

`source_package_references` are alignment hints only. They do not certify
Source Package Review Queue clearance. Matching valid, feedable, aligned Source
Packages remain required before package-backed source review can clear any
lane. Blueprint is included as a Data Spine source posture lane and is not
package-backed; `source_package_references` cover the five package-backed
lanes.

## Boundaries

The bundle does not:

- run BigQuery, Glean, or customer connectors;
- parse uploaded files;
- ingest raw rows, query text, prompts, responses, transcripts, or file
  contents;
- persist output;
- create migrations, Prisma schemas, backend routes, frontend UI, or ingestion
  jobs;
- clear Source Package Review Queue;
- feed Measurement Cell directly;
- validate Measurement Cell readiness;
- feed finance-context investigation;
- feed confidence modeling;
- calculate ROI, EBITA, EBITDA, causality, productivity, financial
  attribution, confidence percentages, or probabilities;
- create customer-facing output or customer-facing financial output; or
- include individual, manager, team, department, or person-level data.

## Required Blocked Uses

Every bundle blocks:

- `source_package_review_queue_clearance`
- `measurement_cell_direct_feed`
- `measurement_cell_readiness`
- `measurement_cell_assembly`
- `finance_context_investigation`
- `realized_roi`
- `ebita_claim`
- `ebitda_claim`
- `financial_attribution`
- `causality_claim`
- `productivity_claim`
- `headcount_reduction_claim`
- `individual_attribution`
- `individual_scoring`
- `manager_or_team_ranking`
- `department_ranking`
- `people_decisioning`
- `customer_facing_output`
- `customer_facing_financial_output`
- `confidence_percentage`
- `probability_output`
- `governance_override`
- `assumption_override`

## Validation

Run:

```bash
npm run test:ai-value-operator-source-handoff-bundle
```

Recommended adjacent checks:

```bash
npm run test:ai-value-vbd-token-operator-source-handoff
npm run test:ai-value-blueprint-operator-source-handoff
npm run test:ai-value-customer-metric-operator-source-handoff
npm run test:ai-value-assumption-governance-operator-source-handoff
npm run test:ai-value-source-package-review-queue
npm run test:ai-value-operator-intake-adapter
npm run test:ai-value-measurement-cell-assembly-runner
```
