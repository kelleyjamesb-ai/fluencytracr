# AI Value Measurement Cell Series Persistence Promotion Gate

Validator/runner:
`scripts/run_ai_value_measurement_cell_series_persistence_promotion_gate.mjs`

Schema version:
`FT_AI_VALUE_MEASUREMENT_CELL_SERIES_PERSISTENCE_PROMOTION_GATE_2026_06`

## Purpose

This executable gate sits after repeated Measurement Cell Series validation and
before any durable `measurement_cell_series_snapshots` implementation decision.

It answers:

```text
Has a durable product read path been proven that cannot be satisfied by the
existing compact snapshots plus Measurement Cell Series contract output?
```

The current default answer is:

```text
HOLD_FOR_DURABLE_SERIES_READ_PATH_PROOF
```

That hold is intentional. Complete Day 0 / 30 / 60 / 90 / 180 / 365 continuity
is valid internal evidence, but it is not by itself permission to create a
Series snapshot table, route, UI, export, rendered readout, live connector, or
customer-facing output.

## Gate States

The gate may emit only:

- `HOLD_FOR_VALID_MEASUREMENT_CELL_SERIES`
- `HOLD_FOR_DURABLE_SERIES_READ_PATH_PROOF`
- `READY_FOR_SEPARATE_MEASUREMENT_CELL_SERIES_SNAPSHOT_IMPLEMENTATION_DECISION`
- `REJECTED_FOR_BOUNDARY_LEAKAGE`

The ready state authorizes only a later exact-scope implementation decision. It
does not authorize implementation.

Ready-gate validation is source-bound: a ready gate must be validated with the
source repeated pilot evidence package, and optionally the source fixture, so
the compact Series ref can be recomputed and compared. Recomputing `gate_hash`
after editing compact refs is not sufficient.

## Required Source Evidence

The runner consumes the controlled repeated pilot evidence package and binds to
a compact Series ref only:

- repeated pilot id and fixture id;
- pilot decision and package integrity hash;
- Series boundary decision;
- required, observed, and missing milestone days;
- ready, held, suppressed, missing, and blocked window counts;
- alignment state and validation posture;
- compact refs hash.

The source package must prove:

- Day 0 / 30 / 60 / 90 / 180 / 365 coverage;
- `PILOT_PASSED_PROMOTION_REVIEW_READY`;
- `HOLD_SERIES_PERSISTENCE_FOR_SEPARATE_PROMOTION_DECISION`;
- complete milestone series;
- six ready windows;
- zero held, suppressed, missing, or blocked windows;
- aligned Series boundary;
- milestone-only windows.

Rolling 30-day operating context cannot be used as continuity evidence.

## Read-Path Proof

Caller-supplied proof states are not enough to make this gate ready. A later
exact-scope durable read-path decision must exist and be source-bound before a
ready gate can validate.

That future decision must prove every read-path state explicitly:

| Proof | Required state |
| --- | --- |
| Durable read path | `DURABLE_SERIES_READ_PATH_PROVEN` |
| Compact snapshot projection gap | `COMPACT_SNAPSHOT_ROWS_CANNOT_SATISFY_CONTINUITY_READ_PATH` |
| Customer history projection need | `CUSTOMER_HISTORY_CONTINUITY_REQUIRES_SERIES_SNAPSHOT_READ_MODEL` |
| Series contract state | `MEASUREMENT_CELL_SERIES_CONTRACT_OUTPUT_VALIDATED` |
| Auth / tenant enforcement | `ORG_SCOPED_SERIES_READ_GUARDS_REQUIRED` |
| Privacy / k-min review | `AGGREGATE_PRIVACY_POSTURE_READY` |
| Evidence Continuity placement | `KEEP_EVIDENCE_CONTINUITY_INSIDE_SERIES_SNAPSHOT_SCOPE` |
| Storage boundary | `APPEND_ONLY_COMPACT_REFS_ONLY` |
| Live wiring | `NO_LIVE_CONNECTOR_EXECUTION_REQUIRED` |

The repo is not currently in this state. By default, the gate holds, even when
the option-provided proof-state strings are all present.

## Non-Authorization

This contract does not authorize:

- `measurement_cell_series_snapshots` writes;
- Prisma schemas or migrations;
- repository write paths;
- extending `evidence_snapshots`;
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

- invalid, missing, held, stale, rolling-window, or incomplete repeated Series
  evidence;
- missing Day 0 / 30 / 60 / 90 / 180 / 365 coverage;
- held, suppressed, missing, or blocked windows hidden from the compact Series
  boundary;
- ready gates validated without the source repeated pilot evidence package;
- package id, package hash, milestone, window count, alignment, validation, or
  compact-ref drift between the ready gate and source package;
- vague read-path claims without proof refs and hashes;
- proof-state strings without a separate durable read-path decision;
- BigQuery, Sigma, Glean, warehouse, table, dashboard, job, query, or URL-like
  handles inside proof refs;
- missing auth and tenant-boundary posture;
- missing privacy and k-min posture;
- attempts to move Evidence Continuity into `evidence_snapshots`;
- sidecar payloads around source-package wrappers;
- raw rows, query text, SQL text, prompts, responses, transcripts, identifiers,
  row IDs, span IDs, hashed or joinable identifiers, or warehouse handles;
- full Measurement Cell Series payloads;
- `measurement_cell_series_snapshots`, schema, migration, repository, route,
  UI, export, rendered readout, live connector, model, finance, probability,
  score, ROI, EBITDA, causality, productivity, or customer-facing flags.

Rejected gates do not echo unsafe input values.

## Validation

Run:

```bash
npm run test:ai-value-measurement-cell-series-persistence-promotion-gate
```

Executable sample:

```bash
npm run run:ai-value-measurement-cell-series-persistence-promotion-gate
```

Recommended adjacent checks:

```bash
npm run test:ai-value-measurement-cell-series
npm run test:ai-value-controlled-pilot-evidence-package
```
