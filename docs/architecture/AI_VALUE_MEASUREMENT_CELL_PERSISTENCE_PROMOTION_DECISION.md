# AI Value Measurement Cell Persistence Promotion Decision

Status: promoted for one backend-internal physical persistence slice only.
This document does not create backend routes, frontend UI, live Glean or
BigQuery execution, export packages, rendered customer readouts, confidence
math, ROI, causality, productivity, probability, or customer-facing financial
output.

Phase: `phase-ai-value-measurement-cell-persistence-promotion-decision`

Decision: `PROMOTE_MEASUREMENT_CELL_SNAPSHOTS`

## 1. Purpose

The physical data-model readiness review originally defined a non-authorizing
projection sketch for future `measurement_cell_snapshots`. The controlled
scrubbed aggregate pilot and this promotion decision now demonstrate the exact
compact backend-internal scope that can safely persist.

This document records the current promotion decision. It authorizes only the
bounded implementation of append-only `measurement_cell_snapshots` for
validated internal Measurement Cell evidence. It does not authorize any
customer-facing surface or downstream model.

## 2. Decision

Implement `measurement_cell_snapshots` now, but only as a backend-internal,
append-only, compact snapshot of a recomputed valid Measurement Cell Assembly
Run.

The controlled saved-fixture pilot evidence package now demonstrates that the
reviewed aggregate fixture can flow through Controlled Aggregate Fixture
Review and Controlled Measurement Cell Assembly into compact
promotion-review evidence. Its repeated mode also demonstrates that generated
Day 0 / 30 / 60 / 90 / 180 / 365 milestone variants can pass the existing
Measurement Cell Series continuity/alignment contract as internal review
evidence.

Decision value:

```text
PROMOTE_MEASUREMENT_CELL_SNAPSHOTS
```

Decision bundle:

```text
PILOT_PASSED_PROMOTION_REVIEW_READY
MEASUREMENT_CELL_SNAPSHOT_PROMOTION_REVIEW_READY
RECOMMEND_REVISIT_MEASUREMENT_CELL_PERSISTENCE_PROMOTION_DECISION
PROMOTE_BACKEND_INTERNAL_MEASUREMENT_CELL_SNAPSHOT_TABLE
PROMOTE_APPEND_ONLY_VALIDATED_MEASUREMENT_CELL_SNAPSHOT_WRITE_PATH
HOLD_CUSTOMER_FACING_READ_PATHS_AND_EXPORTS
HOLD_SERIES_PERSISTENCE_FOR_SEPARATE_PROMOTION_DECISION
REQUIRE_SEPARATE_PROMOTION_DECISION_BEFORE_SERIES_OR_CONNECTOR_AUTHORIZATION
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
- the pilot output package does not resolve old readout route/UI isolation,
  which remains blocked and is not required for an internal backend-only write
  path;
- the physical data-model readiness review has now named the stable path,
  approval, metric, lag, source-ref, JSONB-smuggling, and rolling-window
  requirements that must be enforced before writes.

This is a narrow approval for one physical table and one validated write path.
It is not approval for Series persistence, Evidence Continuity persistence,
routes, UI, exports, live connectors, readouts, confidence research inputs,
finance outputs, or customer-facing output.

## 3. Promotion Basis

Promotion is based on the following completed or explicitly held conditions:

| Requirement | Current status |
| --- | --- |
| Productization Gate Decision exists | Complete |
| Controlled Aggregate Pilot Runbook exists | Complete |
| Controlled aggregate pilot executed | Complete for saved aggregate fixture |
| Pilot result is `PILOT_PASSED_PROMOTION_REVIEW_READY` | Complete for saved aggregate fixture |
| Legacy readout isolation decision exists | Complete |
| Legacy readout route/UI guard posture resolved | Held; not a blocker for internal backend-only snapshot persistence |
| Stable selected-path binding verified in pilot | Complete for saved aggregate fixture |
| Value hypothesis binding verified in pilot | Complete for saved aggregate fixture |
| Metric drift guard verified in pilot | Complete for saved aggregate fixture |
| Lag drift guard verified in pilot | Complete for saved aggregate fixture |
| Source-ref safety verified in pilot | Complete for saved aggregate fixture |
| Repeated Measurement Cell Series continuity/alignment verified | Complete for controlled Day 0 / 30 / 60 / 90 / 180 / 365 fixture variants |
| Missing Day 0 fails closed | Complete |
| Rolling 30-day windows blocked from continuity evidence | Complete |
| JSONB smuggling guard specified for persistence | Complete; must be proven by red/green tests before implementation |
| No route/UI/export dependency created | Required implementation invariant |

## 4. What Remains Blocked

Do not add:

- `measurement_cell_series_snapshots`;
- Evidence Continuity persistence;
- backend routes;
- frontend UI;
- persistence writes except the single append-only validated backend
  Measurement Cell snapshot write path authorized here;
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

The only physical persistence object authorized by this decision is:

- `measurement_cell_snapshots`.

The only repository write path authorized by this decision is:

- append-only persistence of a compact validated Measurement Cell snapshot
  projection, built from a recomputed valid Measurement Cell Assembly Run.

## 5. Required Red/Green Tests For This Promotion

Because this decision is now `PROMOTE_MEASUREMENT_CELL_SNAPSHOTS`, the
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

## 6. Implementation Scope

Because the decision is exactly `PROMOTE_MEASUREMENT_CELL_SNAPSHOTS`, the
implementation scope is limited to:

- one append-only `measurement_cell_snapshots` table;
- migration-level RLS enablement;
- direct `anon` and `authenticated` access revocation;
- backend service write path only;
- already validated Measurement Cell Assembly Run input only;
- recomputed validation before write;
- compact Measurement Cell snapshot projection only;
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

Execute the promoted TDD implementation slice using the controlled pilot
evidence package:

```text
docs/contracts/ai-value-controlled-pilot-evidence-package/README.md
```

Then keep the next decisions separate:

- defer `measurement_cell_series_snapshots` until a separate Series promotion
  decision authorizes durable Series product state;
- defer live BigQuery, Sigma, and Glean connectors until the snapshot write
  path is verified and connector-specific source-boundary contracts are
  promoted;
- defer customer-facing projections, exports, confidence research inputs, and
  finance outputs until separate promotion gates authorize those exact scopes.

## 9. Verification

When this decision is changed, run:

```bash
git diff --check
bash scripts/ci_docs_contract_sweep.sh
python3 scripts/ci_v1_governance_gates.py
```

## 10. Follow-Up Internal Projection Slice

A later bounded productization slice may expose the compact
`measurement_cell_snapshots` row through the internal/operator-only projection
contract in
`docs/contracts/ai-value-measurement-cell-snapshot-projection/README.md`.

That follow-up contract does not change this decision's original persistence
scope. It still does not authorize frontend pages, customer-facing read paths,
exports, rendered readouts, live connector execution, Series persistence,
confidence research inputs, ROI, causality, productivity, probability, finance
output, or customer-facing financial output.

Expected: all commands exit `0`.
