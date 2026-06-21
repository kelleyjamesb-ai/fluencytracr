# AI Value Source Package Review Queue Contract

Schema version: `FT_AI_VALUE_SOURCE_PACKAGE_REVIEW_QUEUE_2026_06`

Validator: `shared/src/aiValueEngine/sourcePackageReviewQueue.ts`

## Purpose

The Source Package Review Queue is a contract-only review layer for aggregate
source posture before Data Spine and Measurement Cell handoff.

It answers a narrow operational question:

```text
Which aggregate source lanes are present, approved, aligned, source-bound,
and safe enough for Data Spine review?
```

The queue is a review queue, not an evidence object. It summarizes lane status,
source package validation, missing evidence, and next actions. It does not feed
Measurement Cell assembly directly and cannot authorize finance-context
investigation readiness.

## Source Lanes

The queue tracks six governed lanes:

- `blueprint`
- `ai_fluency`
- `vbd_token`
- `customer_metric`
- `assumption`
- `governance`

The following lanes may be checked against Source Packages:

| Queue lane | Source Package type |
| --- | --- |
| `ai_fluency` | `layer_2_user_voice_empirical_export` |
| `vbd_token` | `layer_1_bigquery_telemetry_summary` |
| `customer_metric` | `layer_3_business_system_of_record_outcome_export` |
| `assumption` | `assumption_approval_export` |
| `governance` | `governance_control_export` |

`blueprint` is reviewed through Data Spine source posture and approved
Blueprint extraction context. It does not currently require a Source Package.

## Required Alignment Keys

The queue preserves the Data Spine alignment keys:

- `org_id`
- `client_id`
- `workflow_family`
- `function_area`
- `cohort_key`
- `baseline_window`
- `comparison_window`

The queue must not repair misalignment. Misalignment remains owned by the Data
Spine validator and later Measurement Cell validator.

## Readiness Checks

Each lane is reviewed for:

- `metric_id`
- `source_ref`
- `owner_role`
- `review_state`
- `aggregate_only`
- `source_package_validation`

A lane can clear queue review only when the Data Spine source lane is present,
approved, clear, aggregate-only, aligned, source-bound, and owner-role tagged.
Customer metric lanes must also carry `metric_id`. If Source Packages are
supplied for that lane, they must be valid, feedable, and aligned to the same
`org_id`, comparison window, and lane `source_ref` through the package type's
canonical `source_refs` key. A suppressed Source Package can be valid metadata
while still blocking the lane from feeding evidence. A valid Source Package from
another org, window, or source reference must also block the lane.

## Queue States

- `DATA_SPINE_REVIEW_READY`
- `HELD_FOR_SOURCE_REVIEW`
- `BLOCKED_FOR_DATA_SPINE_VALIDATION`

`DATA_SPINE_REVIEW_READY` means the source posture can proceed to the existing
Data Spine gate. It does not mean Measurement Cell ready, finance-context
ready, or value-hypothesis ready.

## Boundary

The Source Package Review Queue may feed:

- `source_package_status_summary`
- `data_spine_review_context`

It must not feed:

- `measurement_cell_input`
- `finance_context_investigation`
- `customer_facing_financial_output`

## Blocked Uses

The queue must always block:

- realized ROI
- EBITA or EBITDA claims
- financial attribution
- causality claims
- productivity claims
- headcount reduction claims
- individual attribution
- manager/team ranking
- people decisioning
- customer-facing financial output
- confidence percentages
- probability output

The validator also rejects forbidden raw, person-level, finance, probability,
route, schema, persistence, and UI fields anywhere in the queue object. It also
rejects unsafe values in source refs, IDs, cohort keys, package IDs, and action
text, including direct identifiers, raw content references, SQL/query text,
financial claims, probability/confidence outputs, and ranking language. Warning
language is allowed only in governed blocked-use and caveat fields where the
claims are being explicitly blocked.

## Non-Goals

This contract does not:

- parse uploaded Blueprint documents;
- parse Google Sheets, CSV, JSON, dashboard, PDF, PPT, DOC, or customer files;
- run BigQuery or Glean queries;
- ingest raw rows;
- persist source data;
- create migrations, Prisma schemas, backend routes, frontend UI, or ingestion
  jobs;
- build Measurement Cells;
- prepare finance-context investigation packets;
- calculate ROI, EBITA, EBITDA, causality, productivity, financial
  attribution, confidence percentages, or probabilities;
- create customer-facing financial output.

## Relationship to Downstream Gates

The authoritative downstream gates remain:

```text
Source Package Review Queue
-> Data Spine Readiness
-> Measurement Cell
-> Value Hypothesis Readiness packet
```

The queue is a coordination layer for source review. Data Spine Readiness owns
cross-source alignment. Measurement Cell owns finance-context evidence
alignment. Value Hypothesis Readiness owns readiness-state assembly and
governed output boundaries.

## Validation

Run:

```bash
npm run test:ai-value-source-package-review-queue
```

Recommended adjacent checks:

```bash
npm run test:ai-value-data-spine-readiness
npm run test:ai-value-source-packages
npm run build --workspace shared
```
