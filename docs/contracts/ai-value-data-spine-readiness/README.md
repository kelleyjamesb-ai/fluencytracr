# AI Value Data Spine Readiness Contract

Schema version: `FT_AI_VALUE_DATA_SPINE_READINESS_2026_06`

Validator: `shared/src/aiValueEngine/dataSpineReadiness.ts`

## Purpose

Data Spine Readiness is the contract-only alignment gate before Measurement
Cell assembly. It checks whether a client/org/workflow/cohort/window has the
minimum approved aggregate source spine needed to build a Measurement Cell and
then prepare a Value Hypothesis Readiness packet.

The spine aligns:

- parsed and approved Blueprint output;
- aggregate AI Fluency dashboard or baseline export;
- scrubbed aggregate Glean/BigQuery VBD and token context;
- customer-owned selected metric evidence, including manual aggregate entry;
- approved assumption evidence;
- governance attestation.

This contract is not a parser, connector, database, route, UI, ingestion job,
or customer-facing readout.

## Required Alignment Keys

Each source lane must align to the same:

- `org_id`
- `client_id`
- `workflow_family`
- `function_area`
- `cohort_key`
- `baseline_window`
- `comparison_window`

Misalignment fails closed. Missing, held, suppressed, submitted, or
pending-approval lanes can remain structurally valid, but they cannot feed
Measurement Cell assembly.

## Source Modes

Supported intake modes are aggregate-safe descriptors only:

- `blueprint_document_upload`
- `blueprint_structured_import`
- `ai_fluency_dashboard_export`
- `ai_fluency_aggregate_upload`
- `scrubbed_glean_bigquery_export`
- `scrubbed_glean_export_summary`
- `manual_customer_metric_entry`
- `customer_metric_aggregate_export`
- `assumption_approval`
- `governance_attestation`
- `structured_object`
- `missing`

The shared engine does not parse PDF, PPT, DOC, Sheets, CSV, dashboard rows,
BigQuery rows, raw exports, prompts, responses, transcripts, query text, SQL,
or files. Those transformations must happen upstream and pass only approved
aggregate structured objects into this contract.

Source references must remain metadata-only. The validator rejects unsafe
source-ref values that carry direct identifiers, raw prompt/content markers,
SQL/query text, financial claims, probability/confidence outputs, productivity
claims, or ranking language.

## Readiness States

- `NOT_READY`
- `INTAKE_REVIEW_READY`
- `MEASUREMENT_CELL_READY`

`MEASUREMENT_CELL_READY` requires all source lanes to be present, approved,
clear, aggregate-only, source-bound, owner-role tagged, and aligned. The
customer metric lane must also carry `metric_id`.

## BigQuery / Glean Boundary

The current productized boundary is:

```text
customer/Glean-approved transformation boundary
-> scrubbed aggregate Glean/BigQuery summary
-> Data Spine Readiness
-> Measurement Cell
-> Value Hypothesis Readiness packet
```

The current codebase has governed support for scrubbed aggregate summaries and
VBD/token context. It does not yet include a live BigQuery connector, query
runner, raw-row parser, or ingestion job.

## Manual Customer Metrics

Customer metrics may enter as:

- aggregate export metadata; or
- manual aggregate metric entry.

Manual metric entry must remain held or submitted until source owner role,
metric owner approval, direction, denominator or metric definition context,
source reference, and aligned windows are present.

## Blocked Uses

Data Spine Readiness must always block:

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

## Non-Goals

This contract does not:

- parse uploaded Blueprint documents;
- run BigQuery;
- ingest raw files or rows;
- persist data;
- create migrations or Prisma schemas;
- create backend routes;
- create frontend UI;
- create ingestion jobs;
- compute ROI, EBITA, EBITDA, causality, productivity, financial attribution,
  confidence percentages, or probabilities;
- create customer-facing financial output.

## Validation

Run:

```bash
npm run test:ai-value-data-spine-readiness
```

Recommended adjacent checks:

```bash
npm run test:ai-value-measurement-cell
npm run test:ai-value-value-hypothesis-readiness-packet-runner
npm run test:ai-value-scrubbed-glean-export-converter
npm run test:ai-value-ai-fluency-intake-bridge
```
