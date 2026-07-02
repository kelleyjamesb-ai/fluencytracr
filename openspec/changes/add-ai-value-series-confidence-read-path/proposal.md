# Change: Authorize Measurement Cell Series persistence as internal confidence-engine observation input

## Why

The durable Series read-path decision
(`scripts/run_ai_value_durable_series_read_path_decision.mjs`) currently holds
`measurement_cell_series_snapshots` in state
`HOLD_SERIES_PERSISTENCE_COMPACT_CUSTOMER_HISTORY_READ_PATH_SATISFIED` because
the only proven read-path need — customer evidence history at Day
0/30/60/90/180/365 — is satisfied by compact
`ai_value_customer_data_model_snapshots` rows. That decision remains correct
for its consumer.

A new, different consumer now exists: the governed contribution-alignment
confidence engine (currently held at
`INTERNAL_BAYESIAN_FIXTURE_EXECUTION_PROTOTYPE_HELD_FOR_REVIEW` in
`scripts/run_ai_value_contribution_alignment_internal_bayesian_execution_runtime.mjs`).
Moving that engine from fixture prototype to governed longitudinal inference
requires durable, append-only, gate-cleared milestone observations with
per-observation admission/exclusion reasons so posteriors can be updated and
audited over time. Compact customer data model rows cannot satisfy this
read path: they are superseding status projections, not an immutable
observation ledger, and they do not carry admission metadata
(`FailClosedReason`-class exclusions, source window binding, gate-chain refs).

This proposal opens the exact-scope lane to authorize Series persistence for
that single internal consumer, and nothing else.

## What Changes

- Add a **confidence-engine series read-path decision** artifact that consumes
  (a) the existing customer evidence history read-path proof and (b) a new
  confidence-engine observation requirement statement, and can emit a new
  terminal state `SERIES_PERSISTENCE_AUTHORIZED_FOR_INTERNAL_CONFIDENCE_OBSERVATIONS`.
- Modify the durable Series read-path decision semantics so the existing
  customer-history hold state and the new confidence authorization state can
  coexist: the customer-history read path continues to be served from compact
  snapshots; Series persistence is authorized solely as internal
  confidence-engine observation input.
- Modify the Measurement Cell Series persistence promotion gate
  (`scripts/run_ai_value_measurement_cell_series_persistence_promotion_gate.mjs`)
  to accept the confidence read-path proof states as an alternative READY path
  toward the separate Series snapshot implementation decision.
- Scope the authorized store exactly: append-only, compact refs only,
  org-scoped, k>=10 aggregate only, fixed milestone days [0, 30, 60, 90, 180,
  365], per-observation admission/exclusion reason codes.
- Narrow exactly one blocked feed: `research_model_feed` becomes
  `internal_confidence_engine_only`. Every other blocked output stays false —
  no backend routes, no frontend UI, no exports, no rendered readouts, no
  customer-facing output, no customer-facing financial/economic output, no
  finance output, no live BigQuery/Sigma/Glean execution, no customer
  connector execution, no probability/score/model output exposed beyond the
  internal engine, no ROI, no causality claims, no productivity measurement.
- Implementation does not begin until this proposal is approved by the human
  decision owner. Approval of this proposal authorizes only the decision/gate
  artifacts above; physical `measurement_cell_series_snapshots` creation still
  requires the separate exact-scope implementation decision that the promotion
  gate feeds, mirroring the customer data model promotion lane.

## Impact

- Affected specs: `ai-value-series-persistence` (new capability spec)
- Affected code (implementation stage, post-approval):
  - `scripts/run_ai_value_durable_series_read_path_decision.mjs`
  - `scripts/run_ai_value_measurement_cell_series_persistence_promotion_gate.mjs`
  - `scripts/validate_ai_value_durable_series_read_path_decision.test.mjs`
  - `scripts/validate_ai_value_measurement_cell_series_persistence_promotion_gate.test.mjs`
  - New decision runner + validation test for the confidence-engine series
    read-path decision (following the existing decision-artifact conventions)
- Explicitly out of scope for this change: Prisma schema, migrations,
  repository write paths, backend routes, frontend UI, exports, and any change
  to the Bayesian runtime itself (its promotion is a separate workstream).
