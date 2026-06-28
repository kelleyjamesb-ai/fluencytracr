# AI Value Customer Data Model Persistence Implementation Decision

Validator/runner:
`scripts/run_ai_value_customer_data_model_persistence_implementation_decision.mjs`

Schema version:
`FT_AI_VALUE_CUSTOMER_DATA_MODEL_PERSISTENCE_IMPLEMENTATION_DECISION_2026_06`

## Purpose

This executable decision sits after the Customer Data Model Persistence
Promotion Decision and before any physical implementation.

It answers:

```text
May FluencyTracr implement the exact compact customer data model persistence
slice named by this decision?
```

The default answer is:

```text
HOLD_FOR_CUSTOMER_DATA_MODEL_PERSISTENCE_PROMOTION_DECISION
```

When all upstream source-bound gates are valid and ready, the only promoted
answer is:

```text
PROMOTE_COMPACT_CUSTOMER_DATA_MODEL_SNAPSHOT_PERSISTENCE
```

## Promoted Scope

The promoted scope authorizes only:

- one append-only table named `ai_value_customer_data_model_snapshots`;
- one Prisma model and migration for that table;
- one internal repository write path;
- one internal repository read/list path;
- DB readiness checks for the new table and critical columns.

The table is a compact product-data snapshot derived from a valid Measurement
Cell Snapshot Projection. It is not a full Measurement Cell, report, model
result, source package, connector run, export, route response, or customer UI
payload.

## Source Binding

Promoted-decision validation requires all three source objects:

- valid Measurement Cell Snapshot Projection;
- valid ready Customer Data Model Promotion Gate;
- valid ready Customer Data Model Persistence Promotion Decision.

The validator recomputes the upstream chain and rejects promoted decisions when
the compact projection, gate, promotion decision, Measurement Cell, metric,
expectation path, workflow, cohort, milestone window, source system, or
pipeline-boundary refs drift after rehash.

## Physical Model Boundary

The promoted table grain is:

```text
org + measurement_plan + measurement_cell + metric + expectation_path +
milestone + version
```

Required persisted data is limited to:

- source snapshot, projection, gate, promotion-decision, and implementation
  decision refs/hashes;
- selected approved Blueprint expectation-path binding;
- value hypothesis binding refs;
- governed value driver;
- selected metric context;
- workflow/function/cohort context;
- milestone window context;
- compact aggregate-boundary refs;
- compact lane source refs;
- validation posture booleans and gap counts;
- caveats, blocked uses, versioning, and audit metadata.

The implementation must not persist full source context, raw rows, query text,
prompts, responses, transcripts, identifiers, full operator bundles, full source
packages, full Measurement Cells, full expectation registries, rendered reports,
model outputs, finance output, or customer-facing output.

## Non-Authorization

This contract does not authorize:

- backend routes;
- frontend UI;
- exports;
- rendered readouts;
- live BigQuery execution;
- live Sigma execution;
- live Glean queries;
- customer connector execution;
- Measurement Cell Series persistence;
- Evidence Continuity persistence;
- research-model feeds;
- model output;
- confidence, probability, or score-like output;
- ROI, EBITDA, finance output, causality, productivity, or financial
  attribution;
- customer-facing output or customer-facing financial output.

## Fail-Closed Rules

The decision rejects or holds on:

- invalid, missing, held, stale, or tampered upstream projection, gate, or
  promotion decision;
- promoted decisions validated without their source projection, source gate,
  and source promotion decision;
- source ref, metric, path, approval, lag, cohort, window, source-system, or
  pipeline-boundary drift;
- unsafe wrappers or sidecars;
- raw rows, query text, SQL text, prompts, responses, transcripts,
  identifiers, row IDs, span IDs, hashed or joinable identifiers, warehouse
  handles, dashboard handles, or URLs;
- full source package payloads;
- full operator handoff bundles;
- full Measurement Cell payloads;
- full Blueprint expectation-path registries;
- route, UI, export, rendered readout, live connector, research model, model
  output, probability, score, finance, ROI, EBITDA, causality, productivity, or
  customer-facing authorization flags;
- drift in the named physical table, required columns, JSON columns, or
  repository contract.

Rejected decisions do not echo unsafe input values.

## Validation

Run:

```bash
npm run test:ai-value-customer-data-model-persistence-implementation-decision
```

Executable sample:

```bash
npm run run:ai-value-customer-data-model-persistence-implementation-decision
```

Recommended adjacent checks:

```bash
npm run test:ai-value-customer-data-model-persistence-promotion-decision
npm run test:ai-value-customer-data-model-promotion-gate
npm run test:ai-value-measurement-cell-snapshot-projection
```
