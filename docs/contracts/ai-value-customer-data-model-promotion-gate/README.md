# AI Value Customer Data Model Promotion Gate

Validator/runner: `scripts/run_ai_value_customer_data_model_promotion_gate.mjs`

Schema version: `FT_AI_VALUE_CUSTOMER_DATA_MODEL_PROMOTION_GATE_2026_06`

## Purpose

The Customer Data Model Promotion Gate is the executable decision gate between
the internal Measurement Cell Snapshot Projection and any later customer-facing
product data model.

It answers:

```text
Is FluencyTracr ready to start a separate exact-scope persistence promotion
decision for a source-bound customer data model?
```

The current default answer is:

```text
HOLD_FOR_CUSTOMER_DATA_MODEL_PREREQUISITES
```

This is intentional. The internal Measurement Cell Snapshot Projection proves a
safe compact product shape, but it does not by itself authorize customer-facing
persistence, backend routes, frontend UI, exports, rendered readouts, live
connectors, model output, finance output, or customer-facing output.

## Gate States

The gate may emit only:

- `HOLD_FOR_CUSTOMER_DATA_MODEL_PREREQUISITES`
- `HOLD_FOR_VALID_MEASUREMENT_CELL_SNAPSHOT_PROJECTION`
- `READY_FOR_SEPARATE_CUSTOMER_DATA_MODEL_PERSISTENCE_PROMOTION_DECISION`
- `REJECTED_FOR_BOUNDARY_LEAKAGE`

The ready state authorizes only a later exact-scope promotion decision. It does
not authorize implementation.

Ready-gate validation is source-bound: a ready gate must be validated with the
source Measurement Cell Snapshot Projection so `source_projection_ref` can be
recomputed and compared. Recomputing `gate_hash` after editing compact refs is
not sufficient.

Ready-gate validation also requires every prerequisite boolean to be `true`.
A gate with `READY_FOR_SEPARATE_CUSTOMER_DATA_MODEL_PERSISTENCE_PROMOTION_DECISION`
cannot carry false route, auth/tenant, legacy-readout, export, legal/trust,
privacy/k-min, or customer-value-language posture.

## Required Inputs

The runner accepts either:

- a valid Measurement Cell Snapshot Projection; or
- a compact Measurement Cell snapshot row that the runner first converts
  through the Measurement Cell Snapshot Projection contract.

The gate binds only to the compact projection ref:

- projection id and hash;
- snapshot id;
- org and client refs;
- Measurement Cell and Measurement Plan refs;
- selected expectation path;
- metric id;
- workflow/function/cohort;
- milestone window;
- aggregate source system;
- pipeline-boundary hash.

Compact refs, including optional `client_id`, must be null or safe compact
metadata. Free-form names, warehouse handles, identifiers, URLs, hashes of
people, query handles, or unsafe text are not allowed.

It does not pass through the full snapshot row, full Measurement Cell, full
source package payload, full operator handoff bundle, or full Blueprint
expectation-path registry.

## Prerequisites

The gate can become ready for a separate persistence promotion decision only
when all prerequisite states are explicit:

| Prerequisite | Required state |
| --- | --- |
| Customer projection decision | `PROMOTE_SOURCE_BOUND_CUSTOMER_PROJECTION_CONTRACTS` |
| Route projection contract | `SOURCE_BOUND_ROUTE_PROJECTION_CONTRACT_READY` |
| Auth / tenant enforcement | `ORG_SCOPED_AUTH_AND_TENANT_GUARDS_READY` |
| Legacy readout guard | `ROUTE_AND_UI_GUARD_RESOLVED` |
| Export governance | `EXPORT_PROHIBITION_CONTRACT_READY` |
| Legal / trust review | `APPROVED_FOR_STATUS_POSTURE_ONLY` |
| Privacy / k-min review | `AGGREGATE_PRIVACY_POSTURE_READY` |
| Customer value language | `POSTURE_ONLY_VALUE_LANGUAGE_APPROVED` |

The repo is not currently in this state. By default, the gate holds.

## Non-Authorization

This contract does not authorize:

- customer data model persistence writes;
- Prisma schemas or migrations;
- repository methods;
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

The gate rejects or holds on:

- invalid, missing, stale, or tampered Measurement Cell Snapshot Projection;
- ready gates validated without the source Measurement Cell Snapshot
  Projection;
- projection id/hash, Measurement Cell, metric, workflow, window, source-system,
  or pipeline-boundary drift between the ready gate and source projection;
- missing route projection contract;
- missing auth and tenant-boundary proof;
- unresolved legacy readout guard;
- missing export-governance posture;
- missing legal/trust approval for posture-only language;
- missing privacy and k-min posture;
- missing customer-value language approval;
- sidecar payloads around projection wrappers;
- raw rows, query text, SQL text, prompts, responses, transcripts, identifiers,
  row IDs, span IDs, hashed or joinable identifiers, or warehouse handles;
- full source package payloads;
- full operator handoff bundles;
- full Measurement Cell payloads;
- full Blueprint expectation-path registries;
- route, UI, export, rendered readout, live connector, model, finance,
  probability, score, ROI, EBITDA, causality, productivity, or customer-facing
  flags.

Rejected gates do not echo unsafe input values.

## Validation

Run:

```bash
npm run test:ai-value-customer-data-model-promotion-gate
```

Executable sample:

```bash
npm run run:ai-value-customer-data-model-promotion-gate
```

Recommended adjacent checks:

```bash
npm run test:ai-value-measurement-cell-snapshot-projection
npm run test:ai-value-measurement-cell-preflight-runner
```
