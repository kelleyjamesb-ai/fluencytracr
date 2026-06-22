# AI Value Measurement Cell Series Persistence Promotion Decision

Status: decision only. This document does not create backend routes, frontend
UI, Prisma schema changes, migrations, repository methods, persistence writes,
live Glean or BigQuery execution, export packages, rendered customer readouts,
confidence math, ROI, causality, productivity, probability, or customer-facing
financial output.

Phase: `phase-ai-value-measurement-cell-series-persistence-promotion-decision`

Decision: `HOLD_FOR_REPEATED_MILESTONE_EVIDENCE`

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
HOLD_FOR_REPEATED_MILESTONE_EVIDENCE
```

Reason:

- Measurement Cell persistence is not promoted;
- no controlled scrubbed aggregate pilot has produced a promotion-ready result;
- no repeated Measurement Cell workflow has been validated across all governed
  milestone windows;
- rolling 30-day operating context remains quarantined;
- Series persistence would imply continuity maturity that the current evidence
  does not yet support.

## 3. Required Milestone Evidence

Series persistence can be reconsidered only after a repeated Measurement Cell
workflow has validated these milestone windows:

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

Keep Series persistence blocked. Execute the controlled scrubbed aggregate
pilot and revisit Measurement Cell persistence first.

Do not reconsider Series persistence until Measurement Cell snapshots are
promoted or the repo records an explicit decision that durable Series
snapshots are not required for the next pilot.

## 7. Verification

When this decision is changed, run:

```bash
git diff --check
bash scripts/ci_docs_contract_sweep.sh
python3 scripts/ci_v1_governance_gates.py
```

Expected: all commands exit `0`.
