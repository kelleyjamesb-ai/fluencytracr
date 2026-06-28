# AI Value Durable Series Read-Path Decision

Validator/runner:
`scripts/run_ai_value_durable_series_read_path_decision.mjs`

Schema version:
`FT_AI_VALUE_DURABLE_SERIES_READ_PATH_DECISION_2026_06`

## Purpose

This executable decision consumes the Customer Evidence History Read-Path Proof
and records whether durable `measurement_cell_series_snapshots` are needed for
the current product read path.

It answers:

```text
Does compact customer history from ai_value_customer_data_model_snapshots
satisfy the read path, or has a source-bound compact gap proven a Series
snapshot read model is required?
```

The current valid answer is:

```text
HOLD_SERIES_PERSISTENCE_COMPACT_CUSTOMER_HISTORY_READ_PATH_SATISFIED
```

That hold is intentional. It means the next move is to keep customer history
reads on compact customer data model snapshots, not to create Series
persistence.

## Decision States

The decision may emit only:

- `HOLD_SERIES_PERSISTENCE_COMPACT_CUSTOMER_HISTORY_READ_PATH_SATISFIED`
- `HOLD_FOR_CUSTOMER_EVIDENCE_HISTORY_READ_PATH_PROOF`
- `REJECTED_FOR_BOUNDARY_LEAKAGE`

This slice does not emit
`READY_FOR_SEPARATE_MEASUREMENT_CELL_SERIES_SNAPSHOT_IMPLEMENTATION_DECISION`.
A future exact-scope decision may add that state only after a new source-bound
proof shows compact customer snapshots cannot satisfy a bounded continuity read
path.

## Current Allowed Next Step

When valid, the decision emits:

```text
continue_customer_history_reads_from_ai_value_customer_data_model_snapshots
```

All Series implementation feeds remain false.

## Source-Bound Proof

The decision binds only to compact proof refs:

- proof id and proof hash;
- compact Series hash;
- compact customer history hash;
- lineage hash;
- required, observed, and missing milestone days;
- latest clear milestone count;
- stale candidate rows ignored;
- compact read-path posture.

The decision must be validated with the source Customer Evidence History
Read-Path Proof to reject drift after rehash.

## Non-Authorization

This contract does not authorize:

- `measurement_cell_series_snapshots`;
- Series schemas, migrations, repository writes, or repository reads;
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
- customer-facing economic output or customer-facing financial output.

## Fail-Closed Rules

The decision holds or rejects on:

- missing or invalid Customer Evidence History Read-Path Proof;
- proof states edited by a caller;
- proof hash drift;
- source proof ref drift after rehash;
- incomplete Day 0 / 30 / 60 / 90 / 180 / 365 milestone coverage;
- proof that does not show compact snapshots satisfy the read path;
- attempts to mark a Series snapshot implementation decision feed true;
- attempts to authorize persistence, schema, migration, repository, route, UI,
  export, rendered readout, live connector, model, finance, ROI, causality,
  productivity, probability, score, or customer-facing flags;
- wrapper sidecars, raw rows, SQL/query text, prompts, transcripts,
  identifiers, warehouse handles, URLs, or live handles.

Rejected decisions do not echo unsafe values.

## Validation

Run:

```bash
npm run test:ai-value-durable-series-read-path-decision
```

Executable sample:

```bash
npm run run:ai-value-durable-series-read-path-decision
```

Recommended adjacent checks:

```bash
npm run test:ai-value-customer-evidence-history-read-path-proof
npm run test:ai-value-measurement-cell-series-persistence-promotion-gate
npm run test:ai-value-measurement-cell-series
```
