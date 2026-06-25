# AI Value Customer Data Model Persistence Promotion Decision

Validator/runner:
`scripts/run_ai_value_customer_data_model_persistence_promotion_decision.mjs`

Schema version:
`FT_AI_VALUE_CUSTOMER_DATA_MODEL_PERSISTENCE_PROMOTION_DECISION_2026_06`

## Purpose

This executable decision sits after the Customer Data Model Promotion Gate and
before any customer data model persistence implementation.

It answers:

```text
Can FluencyTracr begin a separate exact-scope implementation decision for a
source-bound customer data model persistence layer?
```

The default answer is:

```text
HOLD_FOR_CUSTOMER_DATA_MODEL_PERSISTENCE_PREREQUISITES
```

That hold is intentional. A compact Measurement Cell Snapshot Projection and
Customer Data Model Promotion Gate are necessary, but not sufficient, before a
durable customer data model table or write path exists.

## Decision States

The decision may emit only:

- `HOLD_FOR_CUSTOMER_DATA_MODEL_PERSISTENCE_PREREQUISITES`
- `HOLD_FOR_VALID_CUSTOMER_DATA_MODEL_PROMOTION_GATE`
- `READY_FOR_EXACT_SCOPE_CUSTOMER_DATA_MODEL_PERSISTENCE_IMPLEMENTATION_DECISION`
- `REJECTED_FOR_BOUNDARY_LEAKAGE`

The ready state authorizes only a later exact-scope implementation decision. It
does not create or authorize persistence writes in this runner.

## Source Binding

Ready-decision validation requires both:

- the source Measurement Cell Snapshot Projection; and
- the source Customer Data Model Promotion Gate.

The validator recomputes the source gate binding and rejects ready decisions
whose compact gate, projection, snapshot, Measurement Cell, metric, workflow,
cohort, window, source-system, or pipeline-boundary refs drift after rehash.

## Non-Authorization

This contract does not authorize:

- customer data model persistence writes;
- Prisma schemas or migrations;
- repository write paths;
- backend routes;
- frontend UI;
- exports;
- rendered readouts;
- live BigQuery execution;
- live Sigma execution;
- live Glean queries;
- customer connector execution;
- research-model feeds;
- model output;
- confidence, probability, or score-like output;
- ROI, EBITDA, finance output, causality, productivity, or financial
  attribution;
- customer-facing output or customer-facing financial output.

## Fail-Closed Rules

The decision rejects or holds on:

- invalid, missing, held, stale, or tampered Customer Data Model Promotion
  Gate output;
- ready decisions validated without the source projection and source gate;
- missing route projection contract posture;
- missing auth and tenant-boundary posture;
- unresolved legacy readout guard posture;
- missing export-governance posture;
- missing legal/trust posture for customer value language;
- missing privacy and k-min posture;
- unsafe wrapper sidecars;
- raw rows, query text, SQL text, prompts, responses, transcripts,
  identifiers, row IDs, span IDs, hashed or joinable identifiers, or warehouse
  handles;
- full source package payloads;
- full operator handoff bundles;
- full Measurement Cell payloads;
- full Blueprint expectation-path registries;
- schema, migration, repository, route, UI, export, rendered readout, live
  connector, model, finance, probability, score, ROI, EBITDA, causality,
  productivity, or customer-facing flags.

Rejected decisions do not echo unsafe input values.

## Current Physical Posture

The current durable authority remains backend-internal
`measurement_cell_snapshots`.

This decision may point to a future implementation decision, but it does not
name or create a customer-facing table. Any later implementation must cite a
separate exact-scope decision that names the table, columns, write path, route
posture, auth/tenant boundary, export posture, and red/green governance tests.

## Validation

Run:

```bash
npm run test:ai-value-customer-data-model-persistence-promotion-decision
```

Executable sample:

```bash
npm run run:ai-value-customer-data-model-persistence-promotion-decision
```

Recommended adjacent checks:

```bash
npm run test:ai-value-customer-data-model-promotion-gate
npm run test:ai-value-measurement-cell-snapshot-projection
```
