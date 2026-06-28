# AI Value Data Model Spine Readiness Lock

Validator/runner:
`scripts/run_ai_value_data_model_spine_readiness_lock.mjs`

Schema version:
`FT_AI_VALUE_DATA_MODEL_SPINE_READINESS_LOCK_2026_06`

## Purpose

This executable lock records the current hard boundary around the AI Value
data-model spine.

It confirms only that the compact internal spine can keep moving toward real
source wiring while staying bounded by existing aggregate, internal,
source-bound contracts. It does not promote any new implementation,
persistence, model, live connector, finance, export, customer-facing, or
Measurement Cell Series scope.

## Implemented Equation

No statistical model equation is implemented.

The implemented equation is a Boolean readiness contract:

```text
measurement_cell_snapshots_promoted
AND ai_value_customer_data_model_snapshots_promoted
AND customer_data_model_route_projection_ready
AND customer_evidence_history_read_path_proven
AND durable_series_read_path_holds_series_persistence
AND all_blocked_outputs_false
```

The lock must emit:

```text
statistical_model_equation_implemented = false
confidence_math_implemented = false
numeric_weights_implemented = false
```

When all Boolean terms hold, the lock state is:

```text
COMPACT_CUSTOMER_DATA_MODEL_SPINE_READY
```

That state means the next allowed move is:

```text
harden_compact_customer_data_model_for_real_source_wiring
```

It does not mean the model math is implemented.

## Source-Bound Inputs

The lock recomputes and binds the upstream source contracts:

- Customer Evidence History Read-Path Proof;
- Durable Series Read-Path Decision;
- compact Day 0 / 30 / 60 / 90 / 180 / 365 milestone coverage;
- current `ai_value_customer_data_model_snapshots` read model posture.

Caller-supplied ready flags, edited hashes, or rehashed lock records are not
enough. The validator rejects drift after recomputation.

## Series Posture

The current Series state is:

```text
HELD_NOT_REQUIRED_FOR_CURRENT_READ_PATH
```

Repeated Day 0 / 30 / 60 / 90 / 180 / 365 coverage may be referenced only as
compact continuity context. It does not authorize trend claims, confidence
math, customer evidence history expansion, Series persistence, economic
dependency, or customer-facing output.

## Non-Authorization

This contract does not authorize:

- statistical equations, coefficients, weights, p-values, Bayesian logic,
  contribution confidence, confidence bands, probabilities, scores, rankings,
  or model outputs;
- ROI, EBITDA, dollarized impact, finance output, financial attribution,
  productivity, causality, or customer-facing economic output;
- BigQuery, Sigma, or Glean live execution;
- credentials, SQL/query text, project/dataset/table/job/dashboard handles,
  connectors, exports, or raw-row ingestion;
- `measurement_cell_series_snapshots`, Evidence Continuity persistence, or any
  durable Series layer;
- backend routes, frontend UI, exports, rendered readouts, schemas,
  migrations, or repository write paths.

Internal spine readiness is not customer readiness. Customer-facing status,
readout, export, or economic language requires a later exact-scope contract.
Compact IDs and refs are internal lineage only and must not be exposed as
customer-facing labels or join handles.

## Fail-Closed Rules

The lock holds or rejects on:

- missing or invalid Customer Evidence History Read-Path Proof;
- missing or invalid Durable Series Read-Path Decision;
- forged `lock_state`, `equation.result`, prerequisites, validation summary,
  or source hashes after rehash;
- any model, confidence, probability, score, finance, ROI, causality,
  productivity, or customer-facing field set true;
- unsafe keys or values in wrapper sidecars, refs, caveats, blocked uses,
  validation summaries, or notes;
- raw rows, query text, SQL, prompts, responses, transcripts, user IDs, emails,
  row IDs, span IDs, source hashes, org/client IDs, warehouse handles, live
  connector handles, or credential-like values;
- attempts to create Series persistence or Evidence Continuity persistence.

Rejected locks do not echo unsafe values.

## Historical Planning Boundary

Historical planning documents, including `AI_VALUE_DATA_MODEL_AUDIT.md`, are
not implementation authority for this lock. Current authority remains the
active persistence/design contracts and exact-scope promotion decisions named
by the source-bound executable chain.

## Validation

Run:

```bash
npm run test:ai-value-data-model-spine-readiness-lock
```

Executable sample:

```bash
npm run run:ai-value-data-model-spine-readiness-lock
```

Recommended adjacent checks:

```bash
npm run test:ai-value-customer-evidence-history-read-path-proof
npm run test:ai-value-durable-series-read-path-decision
npm run test:ai-value-measurement-cell-series-persistence-promotion-gate
```
