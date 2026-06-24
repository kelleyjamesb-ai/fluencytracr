# AI Value Productization Next Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move FluencyTracr from a productized internal evidence spine through the controlled pilot and promoted backend-internal Measurement Cell snapshot persistence, without overstating customer, finance, connector, or confidence readiness.

**Architecture:** The current state is `backend_internal_measurement_cell_snapshot_persistence_promoted__customer_productization_blocked`. The controlled scrubbed aggregate pilot has demonstrated the governed source handoff, Data Spine, Measurement Cell, Series, and review-posture path. `measurement_cell_snapshots` is promoted only as compact backend-internal persistence. Every next step preserves the aggregate-only, fail-closed posture and keeps UI, live connectors, confidence math, ROI, causality, productivity, probability, and customer-facing financial output blocked until explicitly promoted.

**Tech Stack:** Markdown architecture/contract docs, existing TypeScript shared engine, Node test runner, docs contract sweep, V1 governance gates, future Prisma/Postgres only after promotion.

---

## Current State

The data model has been built as a logical model, physical readiness model, and now a first backend-internal Measurement Cell snapshot table.

Built:

- logical AI Value data model;
- physical data-model readiness review;
- stable approved expectation-path binding requirements;
- promoted Measurement Cell snapshot persistence/write path;
- future Measurement Cell Series projection sketch;
- Productization Gate Decision.
- data pipeline readiness decision documenting that Sigma/BigQuery execution is
  not built yet.

Now implemented:

- `measurement_cell_snapshots`;
- Prisma schema change for `measurement_cell_snapshots`;
- migration for `measurement_cell_snapshots`;
- compact append-only repository write path;
- health/readiness table check.
- executable Live Pipeline Concept Gate for BigQuery/Sigma concept-review
  readiness, with live execution still held.

Waiting:

- `measurement_cell_series_snapshots`;
- Evidence Continuity persistence;
- source-bound customer routes or UI;
- live Glean or BigQuery execution;
- live Sigma execution or dashboard-row ingestion;
- confidence math or finance output.

## Current Execution Result

Phases 1-5 have now produced the controlled pilot evidence, explicit
`PROMOTE_MEASUREMENT_CELL_SNAPSHOTS` decision, and backend-internal compact
snapshot implementation. Phases 6-8 remain hold decisions: Series persistence,
customer projection/export, and confidence research remain blocked pending
separate promotion decisions, repeated milestone evidence, and governance
review.

The Sigma/BigQuery data pipeline is still not built. Future pipeline work must
start with source inventory, aggregate extraction, and pipeline run review
manifests before any saved-fixture adapter or live execution is promoted. The
new Live Pipeline Concept Gate proves only whether a separate live-pipeline
concept review may be drafted; it does not authorize live execution,
credentials, query handling, raw rows, persistence, customer projection,
exports, research-model feed, or finance output.

## Phase 1: Close Productization Gate

**Goal:** Make the current productization boundary explicit and durable.

**Files:**
- Existing: `docs/architecture/AI_VALUE_PRODUCTIZATION_GATE_DECISION.md`
- Existing: `.project/PROGRESS.md`

- [x] **Step 1: Add the gate decision**

Decision value:

```text
internal_operator_review_ready__customer_productization_blocked
```

Required allowed language:

```text
internal operator review ready
Data Spine review clear
Measurement Cell contract output ready
Measurement Cell Series continuity/alignment review ready
controlled scrubbed aggregate pilot ready
awaiting physical persistence promotion decision
```

Required blocked language:

```text
fully productized
customer-facing value product ready
finance-ready
ROI-ready
business impact validated
confidence score
productivity measured
Measurement Cell persistence ready
customer-facing executive readout ready
```

- [x] **Step 2: Verify the docs-only gate**

Run:

```bash
git diff --check
bash scripts/ci_docs_contract_sweep.sh
python3 scripts/ci_v1_governance_gates.py
```

Expected: all commands exit `0`.

## Phase 2: Controlled Scrubbed Aggregate Pilot

**Goal:** Demonstrate the existing internal evidence spine with one controlled aggregate pilot before promoting new persistence.

**Files:**
- Create: `docs/architecture/AI_VALUE_CONTROLLED_AGGREGATE_PILOT_RUNBOOK.md`
- Modify: `.project/PROGRESS.md`

- [x] **Step 1: Write the pilot runbook**

The runbook must require these inputs:

```text
approved Blueprint Hypothesis
validated Blueprint selected expectation path
reviewed Blueprint source ref
reviewed AI Fluency aggregate source ref
reviewed VBD/token aggregate source ref
reviewed customer metric source ref
reviewed assumption source ref
reviewed governance source ref
validated Data Spine alignment envelope
validated Source Package Review Queue posture
Measurement Cell Assembly candidate inputs for recomputed validation
Measurement Cell Series candidate milestone set for recomputed validation
```

- [x] **Step 2: Define pilot pass/fail criteria**

Pass requires:

```text
all source refs safe
all windows aligned
all cohort/function/workflow keys aligned
selected expectation path stable
metric definition stable
held/suppressed/missing windows visible
rolling 30-day context quarantined
blocked claims propagated
no raw rows
no query text
no prompts
no transcripts
no identifiers
no ROI fields
no EBITDA or finance-output fields
no causality fields
no productivity fields
no probability fields
no confidence or score-like fields
```

- [x] **Step 3: Add pilot stop conditions**

Stop the pilot if any of these occur:

```text
Source Package Review Queue is treated as Measurement Cell proof
Operator Source Handoff Bundle is treated as durable proof
Measurement Cell Series is treated as trend or improvement evidence
rolling 30-day context is treated as continuity evidence
legacy executive_packet output is treated as source-bound readout
ai_value_objects is treated as authoritative proof storage
finance-context review is described as ROI or EBITDA readiness
live Glean or BigQuery execution is implied
```

- [x] **Step 4: Verify the runbook**

Run:

```bash
git diff --check
bash scripts/ci_docs_contract_sweep.sh
python3 scripts/ci_v1_governance_gates.py
```

Expected: all commands exit `0`.

## Phase 3: Legacy Readout Isolation Decision

**Goal:** Prevent older `executive_packet` and generic `ai_value_objects` paths from making the system look more customer-ready than the governed spine permits.

**Files:**
- Create: `docs/architecture/AI_VALUE_LEGACY_READOUT_ISOLATION_DECISION.md`
- Inspect: `backend/src/ai_value_routes.ts`
- Inspect: `frontend/src/hooks/useAiValueJourney.ts`
- Inspect: `docs/architecture/AI_VALUE_CONTRACT_CHAIN_INTEGRATION_AUDIT.md`
- Modify: `.project/PROGRESS.md`

- [x] **Step 1: Document the isolation decision**

Decision value:

```text
ROUTE_AND_UI_GUARD_REQUIRED
```

Required rule:

```text
Legacy executive_packet routes and rendered HTML readout paths are not source-bound Executive Readout Snapshot output, customer-facing readout output, export packages, or finance-ready artifacts.
```

- [x] **Step 2: Decide whether code isolation is needed**

Record one of these exact outcomes:

```text
DOC_LABEL_ONLY
ROUTE_GUARD_REQUIRED
UI_LABEL_REQUIRED
ROUTE_AND_UI_GUARD_REQUIRED
```

Choose `ROUTE_AND_UI_GUARD_REQUIRED` if a route or UI can present `executive_packet` output without a visible internal/prototype audience boundary.

- [x] **Step 3: Verify the decision**

Run:

```bash
git diff --check
bash scripts/ci_docs_contract_sweep.sh
python3 scripts/ci_v1_governance_gates.py
```

Expected: all commands exit `0`.

## Phase 4: Measurement Cell Persistence Promotion Decision

**Goal:** Decide whether first-class Measurement Cell persistence should be implemented.

**Files:**
- Create: `docs/architecture/AI_VALUE_MEASUREMENT_CELL_PERSISTENCE_PROMOTION_DECISION.md`
- Existing: `docs/architecture/AI_VALUE_PHYSICAL_DATA_MODEL.md`
- Existing: `docs/architecture/AI_VALUE_PRODUCTIZATION_GATE_DECISION.md`
- Modify: `.project/PROGRESS.md`

- [x] **Step 1: Write the promotion decision**

Decision values:

```text
PROMOTE_MEASUREMENT_CELL_SNAPSHOTS
HOLD_FOR_MORE_PILOT_EVIDENCE
HOLD_FOR_LEGACY_READOUT_ISOLATION
REJECT_CURRENT_PERSISTENCE_SCOPE
```

- [x] **Step 2: Require promotion evidence**

Promotion requires:

```text
controlled scrubbed aggregate pilot passed
legacy readout route/UI guard posture resolved
stable selected-path binding verified
value hypothesis binding verified
metric drift guard verified
lag drift guard verified
source-ref safety verified
JSONB smuggling guard specified
no route/UI/export dependency created
```

- [x] **Step 3: Keep Series persistence blocked**

The decision must state:

```text
Measurement Cell Series persistence remains blocked until at least one repeated Measurement Cell workflow has been validated across the governed milestone windows.
```

- [x] **Step 4: Verify the decision**

Run:

```bash
git diff --check
bash scripts/ci_docs_contract_sweep.sh
python3 scripts/ci_v1_governance_gates.py
```

Expected: all commands exit `0`.

## Phase 5: Measurement Cell Snapshot Implementation Slice

**Goal:** Implement `measurement_cell_snapshots` only if Phase 4 records `PROMOTE_MEASUREMENT_CELL_SNAPSHOTS`.

**Files, if promoted:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/<timestamp>_add_measurement_cell_snapshots/migration.sql`
- Modify: `backend/src/repositories/ai-value-minimal-persistence.repository.ts`
- Modify: `backend/tests/ai_value_minimal_persistence.test.ts`
- Modify: `backend/src/store.ts`
- Modify: `backend/src/app.ts`
- Modify: `backend/tests/health_postgres.test.ts`
- Modify: `.project/PROGRESS.md`

- [x] **Step 1: Stop if Phase 4 is not promoted**

Do not edit Prisma or backend code unless Phase 4 decision is exactly:

```text
PROMOTE_MEASUREMENT_CELL_SNAPSHOTS
```

Execution result: Phase 4 is `PROMOTE_MEASUREMENT_CELL_SNAPSHOTS`. Steps 2-4
were executed as a backend-internal compact persistence slice. Series,
customer-facing reads, routes, UI, exports, connectors, confidence research
inputs, and finance outputs remain blocked.

- [x] **Step 2: Write red tests first**

Tests must reject:

```text
path drift
approval drift
lag drift
metric drift
unsafe source refs
raw rows
query text
prompts
transcripts
user identifiers
full expectation-path registries
ROI fields
EBITDA or finance-output fields
causality fields
productivity fields
probability fields
confidence or score-like fields
JSONB smuggling through payload_json
JSONB smuggling through validation_json
JSONB smuggling through source_refs_json
JSONB smuggling through blueprint_path_binding_json
```

- [x] **Step 3: Implement only the promoted table**

Allowed implementation:

```text
measurement_cell_snapshots table
append-only versioning
RLS enabled in migration
anon/authenticated direct access revoked
backend service write path only
validated contract object input only
recomputed validation before write
```

Blocked implementation:

```text
measurement_cell_series_snapshots
routes
frontend UI
exports
live connectors
confidence model inputs
ROI outputs
finance outputs
causality outputs
productivity outputs
probability outputs
customer-facing read paths
```

- [x] **Step 4: Verify implementation**

Run:

```bash
npm run build --workspace shared
npm run test:ci --workspace backend
bash scripts/ci_docs_contract_sweep.sh
python3 scripts/ci_v1_governance_gates.py
git diff --check
```

Expected: all commands exit `0`.

Execution result: focused persistence and preflight suites passed, backend
build passed, shared build passed, backend CI passed 119 suites / 852 tests,
docs contract sweep passed, V1 governance gates passed, and `git diff --check`
passed.

## Phase 6: Measurement Cell Series Promotion Decision

**Goal:** Decide whether durable Measurement Cell Series persistence is warranted after repeated milestone evidence exists.

**Files:**
- Create: `docs/architecture/AI_VALUE_MEASUREMENT_CELL_SERIES_PERSISTENCE_PROMOTION_DECISION.md`
- Existing: `docs/architecture/AI_VALUE_PHYSICAL_DATA_MODEL.md`
- Modify: `.project/PROGRESS.md`

- [x] **Step 1: Record stop because repeated milestone evidence is missing**

Required milestone evidence:

```text
Day 0
Day 30
Day 60
Day 90
Day 180
Day 365
```

Each milestone must preserve the same org/client/workflow/function/cohort,
metric, selected expectation path, source-ref posture, and approval lineage.

Execution result: repeated governed milestone evidence is missing, so this
phase records `HOLD_FOR_REPEATED_MILESTONE_EVIDENCE` rather than satisfied
promotion prerequisites.

- [x] **Step 2: Keep rolling windows quarantined**

The decision must state:

```text
rolling_30_day_context is operating context only and cannot feed evidence continuity, finance-context investigation, Bayesian research planning, confidence research, customer-facing output, or export.
```

- [x] **Step 3: Verify the decision**

Run:

```bash
git diff --check
bash scripts/ci_docs_contract_sweep.sh
python3 scripts/ci_v1_governance_gates.py
```

Expected: all commands exit `0`.

## Phase 7: Customer Projection And Export Governance

**Goal:** Define customer-visible projection and export governance after internal persistence gates are resolved.

**Files:**
- Create: `docs/architecture/AI_VALUE_CUSTOMER_PROJECTION_PROMOTION_DECISION.md`
- Create: `docs/architecture/AI_VALUE_EXPORT_GOVERNANCE_DECISION.md`
- Existing: `docs/architecture/AI_VALUE_CUSTOMER_WORKFLOW_API_UI_READINESS_DECISION.md`
- Existing: `docs/contracts/ai-value-customer-exposure-policy/README.md`
- Modify: `.project/PROGRESS.md`

- [x] **Step 1: Define source-bound projection rules**

Projection rules must preserve:

```text
caveats
blocked uses
blocked claims
held evidence
suppressed evidence
missing evidence
not-computed evidence
k-min posture
privacy posture
source refs
window provenance
audience boundary
```

- [x] **Step 2: Keep exports blocked until governance exists**

Blocked export types:

```text
packet
deck
PDF
HTML readout
API export
customer share package
Claim Readiness Snapshot export
Executive Readout Snapshot export
Measurement Cell payload export
Measurement Cell Series payload export
```

- [x] **Step 3: Verify decisions**

Run:

```bash
git diff --check
bash scripts/ci_docs_contract_sweep.sh
python3 scripts/ci_v1_governance_gates.py
```

Expected: all commands exit `0`.

## Phase 8: Confidence Research Readiness

**Goal:** Start confidence-model research only after repeated aligned evidence and persistence gates are promoted.

**Files:**
- Create: `docs/research/AI_VALUE_CONFIDENCE_RESEARCH_READINESS_DECISION.md`
- Existing: `docs/architecture/AI_VALUE_PRODUCTIZATION_GATE_DECISION.md`
- Existing: `docs/architecture/AI_VALUE_PHYSICAL_DATA_MODEL.md`
- Modify: `.project/PROGRESS.md`

- [x] **Step 1: Record stop because prerequisites are missing**

Prerequisites:

```text
Measurement Cell persistence promoted and implemented, or separate governance
promotion records equivalent aggregate evidence sufficiency
Measurement Cell Series persistence promoted, or separate governance promotion
records equivalent aggregate evidence sufficiency
repeated milestone windows aligned
customer metric movement available as aggregate evidence
comparison design documented
assumption governance documented
legacy readout isolation complete
customer-facing output still blocked
```

Execution result: prerequisites are missing, so this phase records
`HOLD_CONFIDENCE_RESEARCH_FOR_REPEATED_ALIGNED_EVIDENCE` rather than satisfied
research prerequisites.

- [x] **Step 2: Define research boundary**

Allowed research framing:

```text
aggregate operational metric movement associated with governed AI work evidence
evidence design strength
metric specificity
source alignment
assumption quality
governance clearance
```

Blocked research framing:

```text
AI caused EBITDA
AI proved ROI
workforce productivity measurement
employee performance inference
customer-facing contribution model output
finance-output probability
```

- [x] **Step 3: Verify decision**

Run:

```bash
git diff --check
bash scripts/ci_docs_contract_sweep.sh
python3 scripts/ci_v1_governance_gates.py
```

Expected: all commands exit `0`.

## Execution Order

Do these next, in order:

1. Phase 1: commit the Productization Gate Decision.
2. Phase 2: runbook for one controlled scrubbed aggregate pilot.
3. Phase 3: isolate legacy readout and generic object authority risk.
4. Phase 4: decide whether to promote Measurement Cell snapshots.
5. Phase 5: implemented backend-internal compact `measurement_cell_snapshots`.
6. Phase 6: defer Series persistence until a separate promotion decision.
7. Phase 7: keep customer projection and exports blocked pending governance.
8. Phase 8: hold confidence research until repeated aligned evidence exists.
9. Next data-pipeline phase: executable Live Pipeline Concept Gate promoted for
   concept-review readiness only; live BigQuery/Sigma execution remains held.
10. Next data-pipeline phase: executable Live Pipeline Concept Review promoted
    for upstream aggregate-pipeline design requirements only; live
    BigQuery/Sigma execution remains held.
11. Next data-pipeline phase: executable Upstream Aggregate Pipeline Handoff
    promoted for compact manifest-ref acceptance review only; full manifest
    payload ingestion, live execution, manifest persistence, Series
    persistence, customer projection, exports, research-model feed, finance
    output, and customer-facing output remain held.
12. Future data-pipeline phase: consider a later exact-scope upstream package
    acceptance-test decision only after the handoff validator stays green and
    still without credentials, SQL/query handling, raw rows, identifiers, full
    manifest payload ingestion, manifest persistence, Series persistence,
    customer projection, exports, research-model feed, finance output, or
    customer-facing output.

Do not skip from Phase 1 to Phase 5. The pilot and legacy-readout isolation
are the safety checks that keep persistence from becoming accidental product
readiness.
