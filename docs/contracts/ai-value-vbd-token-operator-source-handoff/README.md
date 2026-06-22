# VBD + Token Operator Source Handoff

Schema version: `FT_AI_VALUE_VBD_TOKEN_OPERATOR_SOURCE_HANDOFF_2026_06`

Validator: `shared/src/aiValueEngine/vbdTokenOperatorSourceHandoff.ts`

## Purpose

The VBD + Token Operator Source Handoff bridges a validated scrubbed aggregate
VBD/token intake into the existing Operator Intake Adapter source shape.

It exists to prevent operators from manually stitching together:

- aggregate VBD/token intake metadata;
- Data Spine `vbd_token` source posture;
- source owner role and review state;
- VBD context for Measurement Cell input;
- token context for Measurement Cell input; and
- Layer 1 Source Package alignment reference.

## Flow

```text
Scrubbed aggregate Glean / BigQuery export summary
-> VBD Token Aggregate Intake
-> VBD + Token Operator Source Handoff
-> Operator Intake Adapter
-> Source Package Review Queue
-> Measurement Cell Assembly
```

The handoff produces:

- `operator_source` for the Data Spine `vbd_token` lane;
- `vbd_context` for operator-provided Measurement Cell input;
- `token_context` for operator-provided Measurement Cell input; and
- `source_package_reference.source_refs.aggregate_probe_id` for reviewed
  Layer 1 telemetry package alignment.

`source_package_reference` is an alignment hint. It does not certify Source
Package Review Queue clearance. A matching valid, feedable, aligned
`layer_1_bigquery_telemetry_summary` Source Package is still required before
package-backed source review can clear.

## Feed Rules

The handoff can be `READY_FOR_OPERATOR_INTAKE` only when:

- the VBD Token Aggregate Intake validates;
- the intake can feed the Data Spine `vbd_token` source lane;
- the intake can prepare VBD and token Measurement Cell context fragments;
- the operator source is aggregate-only, owner-role tagged, approved, clear,
  and scrubbed-export-only; and
- VBD context, token context, and Source Package reference stay aligned to the
  same source ref and aggregate identity.

Held, suppressed, unapproved, unattested, invalid, or unsafe intake remains
non-feedable. Held or blocked handoffs may be structurally valid, but all feeds
must remain false and consumers must check `decision` plus `feeds`, not `valid`
alone.

## Boundaries

The handoff does not:

- run BigQuery or Glean queries;
- parse uploaded files;
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
- modify VBD formulas from token usage;
- create customer-facing financial output; or
- include individual, manager, team, or person-level data.

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
- `people_decisioning`
- `customer_facing_financial_output`
- `confidence_percentage`
- `probability_output`

## Validation

Run:

```bash
npm run test:ai-value-vbd-token-operator-source-handoff
```

Recommended adjacent checks:

```bash
npm run test:ai-value-vbd-token-aggregate-intake
npm run test:ai-value-source-package-review-queue
npm run test:ai-value-operator-intake-adapter
npm run test:ai-value-measurement-cell-assembly-runner
```
