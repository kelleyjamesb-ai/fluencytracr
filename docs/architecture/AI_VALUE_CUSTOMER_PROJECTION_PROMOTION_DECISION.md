# AI Value Customer Projection Promotion Decision

Status: decision only. This document does not create backend routes, frontend
UI, Prisma schema changes, migrations, repository methods, persistence writes,
live Glean or BigQuery execution, export packages, rendered customer readouts,
confidence math, ROI, causality, productivity, probability, or customer-facing
financial output.

Phase: `phase-ai-value-customer-projection-promotion-decision`

Decision: `HOLD_FOR_SOURCE_BOUND_PROJECTION_CONTRACTS`

## 1. Purpose

The Productization Gate allows internal operator review. It does not authorize
customer-facing product surfaces. This decision records whether customer-facing
projection work can start.

## 2. Decision

Do not build customer-facing projection routes or UI yet.

Decision value:

```text
HOLD_FOR_SOURCE_BOUND_PROJECTION_CONTRACTS
```

Reason:

- backend-internal Measurement Cell snapshot persistence and compact Customer
  Data Model snapshot persistence are promoted, but customer-facing projection
  routes, UI, exports, and rendered readouts are not promoted;
- source-bound Executive Readout Snapshot projection is not promoted;
- legacy readout isolation requires route and UI guard work before customer
  exposure expands;
- export governance is not promoted;
- legal/trust review for customer-facing value language is not complete;
- generic object payloads are not safe customer projections.

Current internal progress:

- `docs/contracts/ai-value-measurement-cell-snapshot-projection/README.md`
  defines an executable backend-internal projection contract over compact
  `measurement_cell_snapshots` rows;
- the projection can emit only internal operator-review posture from compact
  refs, selected-path binding, metric/window context, source refs, caveats, and
  blocked uses;
- `docs/contracts/ai-value-customer-data-model-promotion-gate/README.md`
  defines the next executable gate from compact snapshot projection into a
  separate exact-scope customer data model persistence promotion decision;
- the gate holds by default, rejects wrapper sidecars and unsafe source refs,
  validates ready gates against the source projection, and keeps persistence
  writes, schemas, routes, UI, exports, rendered readouts, live connectors,
  model output, finance output, and customer-facing output blocked;
- `docs/contracts/ai-value-customer-data-model-persistence-promotion-decision/README.md`
  defines the executable decision after that gate and promoted only the
  exact-scope implementation-decision lane;
- `docs/contracts/ai-value-customer-data-model-persistence-implementation-decision/README.md`
  names the implemented exact-scope persistence slice:
  `ai_value_customer_data_model_snapshots` plus internal repository write/list
  paths derived from valid Measurement Cell Snapshot Projection inputs;
- the implemented compact table stores stable path, metric, cohort, milestone,
  source-boundary, caveat, blocked-use, version, and audit metadata only. It
  does not store full projections, full Measurement Cells, full source
  packages, raw rows, query text, prompts, transcripts, identifiers, model
  output, finance output, or customer-facing output;
- this progress does not change the customer-facing decision value. Customer
  projection routes, UI, exports, rendered readouts, model output, finance
  output, and live connector execution remain blocked.

## 3. Projection Contract Requirements

Before customer-facing projection can be promoted, source-bound projection
contracts must define:

- allowed audience;
- role permissions;
- org-scope enforcement;
- response shape;
- source refs;
- window provenance;
- caveat carry-forward;
- blocked-use carry-forward;
- blocked-claim carry-forward;
- held evidence display;
- suppressed evidence display;
- missing evidence display;
- not-computed evidence display;
- k-min posture display;
- privacy posture display;
- export prohibition;
- legal/trust approval state when value language is customer-visible.

## 4. Customer-Visible Is Not Customer-Safe Claim

Future projection may show status or posture only when explicitly approved.

Customer-visible status must remain separate from:

- rendered executive readout output;
- value proof;
- ROI output;
- EBITDA output;
- causality output;
- workforce productivity measurement;
- probability output;
- model output;
- customer-facing financial output.

## 5. Required Future Tests

Before implementation, tests must cover:

- cross-org read denial;
- cross-org write denial;
- role denial;
- generic object payload exposure denial;
- source-ref drift rejection;
- stale validation rejection;
- caveat carry-forward;
- blocked-use carry-forward;
- blocked-claim carry-forward;
- hidden held/suppressed/missing/not-computed evidence rejection;
- raw/person-level payload rejection;
- raw rows rejection;
- raw files rejection;
- query text rejection;
- SQL text rejection;
- prompts rejection;
- responses rejection;
- transcripts rejection;
- ticket contents rejection;
- file contents rejection;
- direct identifiers rejection;
- hashed or joinable person identifiers rejection;
- full source package payload rejection;
- full operator handoff bundle rejection;
- full Blueprint expectation-path registry rejection;
- unsafe source-ref rejection;
- source-ref payload smuggling rejection;
- JSONB smuggling through payload, validation, source refs, caveats, blocked
  uses, or compact posture fields;
- customer-facing financial output denial;
- ROI, EBITDA, causality, workforce productivity measurement, probability,
  confidence, model, or score-like output denial;
- rendered readout denial unless a later readout contract explicitly allows it.

## 6. Recommended Next Move

Keep customer projection blocked until:

1. compact Customer Data Model snapshot persistence is verified against the
   implementation decision, DB readiness checks, and governance tests;
2. a separate customer-facing route/UI projection contract defines allowed
   response shape, role/org scope, caveat carry-forward, blocked-use
   carry-forward, and missing/held/suppressed/not-computed display posture;
3. legacy readout route/UI guard posture remains isolated and cannot be used as
   a shortcut customer readout;
4. export governance decision is complete;
5. legal/trust approval state is explicit for any customer-visible value
   language;
6. live BigQuery, Sigma, and Glean connector execution remains last and cannot
   expand customer projection scope.

## 7. Verification

When this decision is changed, run:

```bash
git diff --check
bash scripts/ci_docs_contract_sweep.sh
python3 scripts/ci_v1_governance_gates.py
```

Expected: all commands exit `0`.
