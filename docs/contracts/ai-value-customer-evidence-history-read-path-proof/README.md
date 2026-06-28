# AI Value Customer Evidence History Read-Path Proof

Validator/runner:
`scripts/run_ai_value_customer_evidence_history_read_path_proof.mjs`

Schema version:
`FT_AI_VALUE_CUSTOMER_EVIDENCE_HISTORY_READ_PATH_PROOF_2026_06`

## Purpose

This executable proof sits between the customer data model route projection and
the durable Series read-path decision.

It answers:

```text
Can customer evidence history for Day 0 / 30 / 60 / 90 / 180 / 365 be served
from compact ai_value_customer_data_model_snapshots plus Measurement Cell
Series contract output?
```

The current valid answer is:

```text
COMPACT_CUSTOMER_HISTORY_READ_PATH_PROVEN
```

This is internal continuity read-path proof. It is not a customer history
surface, route, UI, export, rendered readout, live connector path, model
result, confidence score, ROI proof, financial output, causal claim, or
productivity claim.

## Proof States

The proof may emit only:

- `COMPACT_CUSTOMER_HISTORY_READ_PATH_PROVEN`
- `HOLD_FOR_VALID_MEASUREMENT_CELL_SERIES`
- `HOLD_FOR_CUSTOMER_EVIDENCE_HISTORY_INPUTS`
- `REJECTED_FOR_BOUNDARY_LEAKAGE`

Caller-edited proof states, proof hashes, or compact strings do not prove a
Series snapshot read model is required.

## Required Source Evidence

The runner consumes:

- the controlled repeated pilot evidence package;
- compact customer data model snapshot rows;
- latest clear customer data model rows only;
- required Day 0 / 30 / 60 / 90 / 180 / 365 milestone coverage.

The output keeps only:

- compact Series milestone posture;
- required, observed, and missing milestone days;
- latest clear row count;
- stale row count ignored;
- compact history and lineage hashes;
- read-path posture;
- caveats and blocked uses.

It does not echo stored rows, org IDs, client IDs, snapshot IDs, Measurement
Cell IDs, workflow IDs, cohort keys, source refs, aggregate-boundary refs,
source-export refs, pipeline refs, raw rows, query text, SQL, prompts,
responses, transcripts, identifiers, warehouse handles, URLs, or live handles.

## Current Read-Path Result

When the proof validates, it records:

```text
COMPACT_SNAPSHOT_ROWS_SATISFY_CUSTOMER_HISTORY_READ_PATH
CUSTOMER_HISTORY_CONTINUITY_CAN_BE_SERVED_FROM_COMPACT_SNAPSHOTS
KEEP_EVIDENCE_CONTINUITY_INSIDE_MEASUREMENT_CELL_SERIES_CONTRACT_OUTPUT
NO_LIVE_CONNECTOR_EXECUTION_REQUIRED
```

That means `measurement_cell_series_snapshots` remain unnecessary for the
current customer evidence history read path.

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

The proof holds or rejects on:

- invalid or incomplete repeated Measurement Cell Series evidence;
- missing Day 0 / 30 / 60 / 90 / 180 / 365 coverage;
- latest customer data model rows that are held or gapful;
- stale clear rows superseded by latest held rows;
- lineage drift across milestones;
- rolling-window rows used as milestone proof;
- wrapper sidecars;
- raw rows, SQL/query text, prompts, transcripts, identifiers, hashes that can
  be joined back to people, or source payloads;
- BigQuery, Sigma, Glean, warehouse, table, dashboard, job, query, URL, or
  live-execution handles;
- Series snapshot, evidence snapshot extension, route, UI, export, rendered
  readout, live connector, model, finance, probability, score, ROI, causality,
  productivity, or customer-facing flags.

Rejected proofs do not echo unsafe values.

## Validation

Run:

```bash
npm run test:ai-value-customer-evidence-history-read-path-proof
```

Executable sample:

```bash
npm run run:ai-value-customer-evidence-history-read-path-proof
```

Recommended adjacent checks:

```bash
npm run test:ai-value-durable-series-read-path-decision
npm run test:ai-value-measurement-cell-series-persistence-promotion-gate
npm run test:ai-value-measurement-cell-series
```
