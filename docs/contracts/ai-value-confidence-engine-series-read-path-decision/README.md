# AI Value Confidence-Engine Series Read-Path Decision

Approved by the OpenSpec change
`add-ai-value-series-confidence-read-path`, this contract names the internal
confidence engine (the held contribution-alignment Bayesian execution runtime)
as a distinct durable-series read-path consumer and authorizes Measurement
Cell Series persistence **solely** as append-only internal confidence-engine
observation input at Day 0 / 30 / 60 / 90 / 180 / 365 milestones.

- Schema version: `FT_AI_VALUE_CONFIDENCE_ENGINE_SERIES_READ_PATH_DECISION_2026_07`
- Requirement statement schema version:
  `FT_AI_VALUE_CONFIDENCE_OBSERVATION_REQUIREMENT_2026_07`
- Runner: `scripts/run_ai_value_confidence_engine_series_read_path_decision.mjs`
- Validation: `scripts/validate_ai_value_confidence_engine_series_read_path_decision.test.mjs`

## States

- `SERIES_PERSISTENCE_AUTHORIZED_FOR_INTERNAL_CONFIDENCE_OBSERVATIONS` — emitted
  only when the customer evidence history read-path proof validates and
  recomputes, all six milestones are observed, and the caller-supplied
  confidence observation requirement statement exactly matches the
  code-constant contract (consumer `internal_confidence_engine_only`, runtime
  schema binding to the internal Bayesian execution runtime, milestone days
  `[0, 30, 60, 90, 180, 365]`, append-only observations, admission reason
  codes, gate-cleared observations only, compact refs only, org-scoped
  storage, `minimum_cohort_size: 10`, and the stated compact-snapshot gap).
- `HOLD_FOR_CONFIDENCE_OBSERVATION_REQUIREMENT` — default hold when the proof
  or the requirement statement is missing, unproven, or drifted.
- `REJECTED_FOR_BOUNDARY_LEAKAGE` — any unsafe sidecar field, key, or value in
  the input; nothing unsafe is echoed.

## Boundary posture

The authorized decision narrows exactly one feed: `research_model_feed`
carries the scoped token `internal_confidence_engine_only` instead of a
boolean, so boundary tests can string-match the only permitted consumer. Every
other feed stays `false`, including implementation-decision, snapshot-write,
schema, migration, repository, evidence-snapshot extension, routes, UI,
exports, rendered readouts, customer-facing economic/financial output, live
BigQuery/Sigma/Glean execution, customer connectors, model output,
probability, score-like output, and finance output.

The decision coexists with — and must not weaken — the durable Series
read-path decision: customer evidence history reads continue to be served
from compact `ai_value_customer_data_model_snapshots` rows.
`validateDurableSeriesConfidenceCoexistence` in
`scripts/run_ai_value_durable_series_read_path_decision.mjs` proves both
decisions bind to the same customer history and that the durable decision's
`research_model_feed` stays `false`.

## Promotion gate confidence lane

The Measurement Cell Series persistence promotion gate accepts this decision
as the `internal_confidence_observation` read-path lane. A gate can reach
`READY_FOR_SEPARATE_MEASUREMENT_CELL_SERIES_SNAPSHOT_IMPLEMENTATION_DECISION`
only when a fully source-bound authorized confidence decision is supplied via
`confidenceSeriesReadPathBinding` together with the confidence-lane read-path
proof states; caller-supplied proof strings alone still hold. Ready gates
embed a compact `internal_confidence_observation_decision_ref` and require the
same binding to re-validate. The gate itself keeps `research_model_feed`
`false` and still authorizes only the separate exact-scope implementation
decision — no persistence write, schema, migration, repository, route, UI,
export, rendered readout, live connector execution, model output,
confidence/probability/score output, finance output, ROI, causality,
productivity, or customer-facing output.
