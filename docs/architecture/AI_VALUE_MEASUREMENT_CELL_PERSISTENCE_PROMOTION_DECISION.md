# AI Value Measurement Cell Persistence Promotion Decision

Status: decision only. This document does not create backend routes, frontend
UI, Prisma schema changes, migrations, repository methods, persistence writes,
live Glean or BigQuery execution, export packages, rendered customer readouts,
confidence math, ROI, causality, productivity, probability, or customer-facing
financial output.

Phase: `phase-ai-value-measurement-cell-persistence-promotion-decision`

Decision: `PILOT_EVIDENCE_READY__HOLD_FOR_SEPARATE_PROMOTION_DECISION`

## 1. Purpose

The physical data-model readiness review defines a non-authorizing projection
sketch for future `measurement_cell_snapshots`. The productization gate says
new physical tables remain blocked until a controlled scrubbed aggregate pilot
and promotion decision demonstrate what can safely persist.

This document records the current promotion decision.

## 2. Decision

Do not implement `measurement_cell_snapshots` yet.

The controlled saved-fixture pilot evidence package now demonstrates that the
reviewed aggregate fixture can flow through Controlled Aggregate Fixture
Review and Controlled Measurement Cell Assembly into compact
promotion-review evidence. Its repeated mode also demonstrates that generated
Day 0 / 30 / 60 / 90 / 180 / 365 milestone variants can pass the existing
Measurement Cell Series continuity/alignment contract as internal review
evidence.

Decision value:

```text
PILOT_EVIDENCE_READY__HOLD_FOR_SEPARATE_PROMOTION_DECISION
```

Decision bundle:

```text
PILOT_PASSED_PROMOTION_REVIEW_READY
MEASUREMENT_CELL_SNAPSHOT_PROMOTION_REVIEW_READY
RECOMMEND_REVISIT_MEASUREMENT_CELL_PERSISTENCE_PROMOTION_DECISION
HOLD_PHYSICAL_MEASUREMENT_CELL_TABLES
HOLD_RUNTIME_PERSISTENCE_AND_MIGRATIONS
HOLD_SERIES_PERSISTENCE_FOR_SEPARATE_PROMOTION_DECISION
REQUIRE_SEPARATE_PROMOTION_DECISION_BEFORE_SCHEMA_AUTHORIZATION
```

Reason:

- the controlled scrubbed aggregate pilot runbook exists and the saved-fixture
  pilot evidence package now emits `PILOT_PASSED_PROMOTION_REVIEW_READY`;
- legacy readout isolation is decisioned as `ROUTE_AND_UI_GUARD_REQUIRED`, but
  no route/UI guard implementation has been promoted or completed;
- the pilot output package demonstrates source conversion, alignment, stable
  selected-path binding, value hypothesis binding, Measurement Cell Assembly,
  blocked-use propagation, source-ref safety, and promotion-review evidence for
  one saved aggregate fixture;
- the repeated pilot output package demonstrates Measurement Cell Series
  continuity/alignment behavior across Day 0 / 30 / 60 / 90 / 180 / 365, and
  holds when Day 0 is missing or rolling 30-day windows are used as continuity
  evidence;
- the pilot output package does not resolve old readout route/UI isolation;
- persistence would imply runtime and product-state maturity that the current
  decision has not separately authorized.

This is not a partial approval for physical tables. It authorizes only
controlled pilot promotion-review evidence, decision records, required
evidence criteria, and a future table-readiness checklist.

## 3. Promotion Requirements

Promotion may be reconsidered only after all conditions are met:

| Requirement | Current status |
| --- | --- |
| Productization Gate Decision exists | Complete |
| Controlled Aggregate Pilot Runbook exists | Complete |
| Controlled aggregate pilot executed | Complete for saved aggregate fixture |
| Pilot result is `PILOT_PASSED_PROMOTION_REVIEW_READY` | Complete for saved aggregate fixture |
| Legacy readout isolation decision exists | Complete |
| Legacy readout route/UI guard posture resolved | Held |
| Stable selected-path binding verified in pilot | Complete for saved aggregate fixture |
| Value hypothesis binding verified in pilot | Complete for saved aggregate fixture |
| Metric drift guard verified in pilot | Complete for saved aggregate fixture |
| Lag drift guard verified in pilot | Complete for saved aggregate fixture |
| Source-ref safety verified in pilot | Complete for saved aggregate fixture |
| Repeated Measurement Cell Series continuity/alignment verified | Complete for controlled Day 0 / 30 / 60 / 90 / 180 / 365 fixture variants |
| Missing Day 0 fails closed | Complete |
| Rolling 30-day windows blocked from continuity evidence | Complete |
| JSONB smuggling guard specified for persistence | Required next-test list generated |
| No route/UI/export dependency created | Must be rechecked before promotion |

## 4. What Remains Blocked

Do not add:

- `measurement_cell_snapshots`;
- `measurement_cell_series_snapshots`;
- Evidence Continuity persistence;
- Prisma schema changes;
- migrations;
- repository methods;
- backend routes;
- frontend UI;
- persistence writes;
- live Glean execution;
- live BigQuery execution;
- export packages;
- rendered customer readouts;
- confidence math;
- ROI output;
- EBITDA output;
- causality output;
- productivity output;
- probability output;
- customer-facing financial output.

## 5. Required Red/Green Tests If Later Promoted

If a later decision changes to `PROMOTE_MEASUREMENT_CELL_SNAPSHOTS`, the
implementation slice must write failing tests first for:

- path drift;
- approval drift;
- lag drift;
- metric drift;
- unsafe source refs;
- raw rows;
- query text;
- SQL text;
- prompts;
- responses;
- transcripts;
- user identifiers;
- row IDs;
- span IDs;
- hashed or joinable person identifiers;
- full source package payloads;
- full operator handoff bundles;
- full expectation-path registries;
- ROI fields;
- EBITDA or finance-output fields;
- causality fields;
- workforce productivity measurement fields;
- probability fields;
- confidence or score-like fields;
- JSONB smuggling through `payload_json`;
- JSONB smuggling through `validation_json`;
- JSONB smuggling through `source_refs_json`;
- JSONB smuggling through `blueprint_path_binding_json`.

## 6. Future Implementation Scope If Promoted

If and only if a later decision is exactly
`PROMOTE_MEASUREMENT_CELL_SNAPSHOTS`, the implementation scope must be limited
to:

- one append-only `measurement_cell_snapshots` table;
- migration-level RLS enablement;
- direct `anon` and `authenticated` access revocation;
- backend service write path only;
- already validated Measurement Cell contract input only;
- recomputed validation before write;
- compact source refs;
- compact selected path binding;
- required caveats;
- blocked uses.

Still blocked even if Measurement Cell snapshots are promoted:

- Measurement Cell Series persistence;
- Evidence Continuity persistence;
- customer-facing read paths;
- rendered readouts;
- exports;
- confidence research inputs;
- finance outputs;
- live connectors.

## 7. Series Persistence Boundary

Measurement Cell Series persistence remains blocked.

Required future statement:

```text
Measurement Cell Series persistence remains blocked even after repeated milestone validation until Measurement Cell snapshots are promoted and a separate Series promotion decision authorizes durable Series product state.
```

Rolling 30-day context remains operating context only and cannot feed evidence
continuity, finance-context investigation, Bayesian research planning,
confidence research, customer-facing output, export, or persistence promotion.

## 8. Recommended Next Move

Use the controlled pilot evidence package:

```text
docs/contracts/ai-value-controlled-pilot-evidence-package/README.md
```

Then make a separate explicit decision to either:

- change this decision to `PROMOTE_MEASUREMENT_CELL_SNAPSHOTS` and open the
  dedicated TDD implementation slice; or
- keep `HOLD_PHYSICAL_MEASUREMENT_CELL_TABLES` and record the remaining
  blocker.

## 9. Verification

When this decision is changed, run:

```bash
git diff --check
bash scripts/ci_docs_contract_sweep.sh
python3 scripts/ci_v1_governance_gates.py
```

Expected: all commands exit `0`.
