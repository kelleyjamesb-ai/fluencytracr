# AI Value Measurement Cell Series Persistence Promotion Decision

Status: decision only. This document does not create backend routes, frontend
UI, Prisma schema changes, migrations, repository methods, persistence writes,
live Glean, BigQuery, or Sigma execution, export packages, rendered customer
readouts, confidence math, ROI, causality, productivity, probability, or
customer-facing financial output.

Phase: `phase-ai-value-measurement-cell-series-persistence-promotion-decision`

Decision:
`HOLD_AFTER_REPEATED_MILESTONE_VALIDATION_NO_SERIES_SNAPSHOT_PROMOTION`

Executable gate:
[`docs/contracts/ai-value-measurement-cell-series-persistence-promotion-gate/README.md`](../contracts/ai-value-measurement-cell-series-persistence-promotion-gate/README.md)

## 1. Purpose

Measurement Cell Series is currently a contract-only continuity/alignment
layer. It can show whether repeated Measurement Cells remain aligned across
governed milestone windows, but it is not durable product state and does not
authorize trend, finance, confidence, customer output, or persistence.

This document records whether durable `measurement_cell_series_snapshots`
should be promoted.

## 2. Decision

Do not implement `measurement_cell_series_snapshots` yet.

Decision value:

```text
HOLD_AFTER_REPEATED_MILESTONE_VALIDATION_NO_SERIES_SNAPSHOT_PROMOTION
```

Reason:

- backend-internal Measurement Cell snapshot persistence is now promoted by a
  separate exact-scope decision;
- the controlled scrubbed aggregate pilot produces promotion-review evidence
  for the saved aggregate fixture;
- repeated milestone validation has now passed for generated Day 0 / 30 / 60 /
  90 / 180 / 365 milestone variants through the existing Measurement Cell
  Series continuity/alignment contract;
- the customer data model route/UI projection can consume clear compact
  snapshots as plural status rows without needing durable Series state;
- no current customer-facing route, UI, export, rendered readout, downstream
  review gate, or live connector path requires a persisted Series read path;
- the executable Series persistence promotion gate now requires explicit
  durable read-path proof and a separate durable read-path decision before any
  later implementation decision can start;
- rolling 30-day operating context remains quarantined;
- Series persistence would imply product-state maturity that the current
  product path has not proven is necessary.

## 3. Repeated Milestone Evidence

Repeated Measurement Cell workflow validation has been exercised across these
milestone windows:

- Day 0
- Day 30
- Day 60
- Day 90
- Day 180
- Day 365

Each milestone must preserve the same:

- org;
- client when available;
- workflow family;
- workflow id when present;
- function area;
- cohort key;
- metric id and metric definition;
- selected expectation path id, version, and hash;
- approved Blueprint payload hash;
- value hypothesis binding;
- source-ref posture;
- approval lineage;
- caveats and blocked uses.

Fresh verification on 2026-06-25:

```bash
npm run test:ai-value-measurement-cell-series
node --test scripts/validate_ai_value_controlled_pilot_evidence_package.test.mjs
```

Result: both commands passed. The validation proves internal continuity and
alignment evidence exists. It does not prove a durable Series snapshot table is
needed.

## 4. Rolling Window Boundary

`rolling_30_day_context` is operating context only.

It cannot feed:

- evidence continuity;
- persistence promotion;
- finance-context investigation;
- Bayesian research planning;
- confidence research;
- customer-facing output;
- export;
- rendered readout;
- trend language;
- improvement language.

## 5. Required Future Tests If Promoted

If a later decision promotes Series persistence, tests must reject:

- missing milestone windows;
- held, suppressed, missing, or blocked windows hidden from output;
- same metric with different expectation path;
- path version/hash drift;
- metric definition/unit/direction drift;
- lag drift;
- value driver drift;
- approval drift;
- source-ref drift;
- rolling 30-day rows used as milestones;
- continuity described as trend or improvement;
- finance, confidence, ROI, causality, productivity, probability, or
  customer-facing fields;
- JSONB smuggling through refs, manifests, caveats, blocked uses, or compact
  posture fields.

## 6. Recommended Next Move

Keep Series persistence blocked. Use the repeated controlled pilot package,
Measurement Cell Series contract output, backend-internal Measurement Cell
snapshots, and the executable Series persistence promotion gate as internal
review evidence only.

Do not reconsider Series persistence until the repo records an explicit
durable read-path proof and then a separate exact-scope implementation decision
naming the exact `measurement_cell_series_snapshots` table, projection, and
read-path purpose required for the next pilot.

## 7. Evidence Continuity Placement

Current placement:

```text
KEEP_EVIDENCE_CONTINUITY_INSIDE_MEASUREMENT_CELL_SERIES_CONTRACT_OUTPUT
```

Do not extend `evidence_snapshots` for continuity yet.

Reason:

- the existing Measurement Cell Series contract already emits the compact
  `evidence_continuity_manifest` needed for Day 0 / 30 / 60 / 90 / 180 / 365
  review;
- the customer data model projection does not consume Evidence Continuity
  directly;
- no downstream persisted evidence lineage requires a new continuity
  `snapshot_type`;
- extending `evidence_snapshots` now would create a second durable evidence
  surface before a read-path need exists.

If a later product read path requires continuity outside Series, prefer
deliberately extending `evidence_snapshots` lineage under a separate migration
and contract decision rather than creating a parallel evidence-continuity table.

## 8. Verification

When this decision is changed, run:

```bash
npm run test:ai-value-measurement-cell-series-persistence-promotion-gate
git diff --check
bash scripts/ci_docs_contract_sweep.sh
python3 scripts/ci_v1_governance_gates.py
```

Expected: all commands exit `0`.
