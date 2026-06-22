# AI Value Logical Data Model

Status: logical design only. This document does not authorize new schemas,
migrations, routes, UI, persistence, live connectors, confidence math,
financial output, or customer-facing readouts.

Phase: `phase-ai-value-logical-data-model`

## 1. Purpose

This document defines the next safe logical data model for approved Blueprint
expectation paths, operator source handoffs, repeated Measurement Cells, and
downstream review posture.

It exists to answer one question before physical data-model work starts:

```text
What should the aggregate AI Value spine remember, reference, and align so
future evidence can test a customer-approved hypothesis without turning
planning context into proof?
```

The immediate model is:

```text
Approved Blueprint Hypothesis
-> selected Blueprint Expectation Binding
-> Measurement Cell Binding
-> Measurement Cell Series
-> Evidence Continuity Snapshot
-> Review Posture Snapshot
```

## 2. Current Persistence Context

The repo already has a minimal Prisma/Postgres persistence spine for AI Value
objects. This logical model must extend that spine when physical work is later
approved. It must not introduce a second persistence stack.

Existing relevant durable objects include:

- `value_hypotheses`
- `measurement_plans`
- `source_package_refs`
- `evidence_snapshots`
- `claim_readiness_snapshots`
- `executive_readout_snapshots`
- `ai_value_pilot_runs`
- `ai_value_objects`

The current architecture authority for implemented persistence is
`docs/architecture/AI_VALUE_PERSISTENCE_DESIGN.md`.

There is an authority conflict to reconcile before physical modeling:

- `AI_VALUE_PERSISTENCE_DESIGN.md` records backend-only Claim Readiness and
  Executive Readout Snapshot persistence as promoted and implemented.
- `AI_VALUE_BLUEPRINT_CONTRACT_CROSSWALK.md` still describes Claim Readiness
  Snapshot and Executive Readout Snapshot as non-persisted or design-only.

Before adding tables, migrations, or repository methods, reconcile the
crosswalk so it reflects the current implemented persistence authority.

## 3. Design Principles

1. Aggregate-only evidence crosses the boundary.
2. The default posture is fail-closed.
3. Source references are metadata only.
4. Raw rows, query text, SQL, prompts, responses, transcripts, file contents,
   direct identifiers, joinable person identifiers, and user identifiers remain
   blocked.
5. The full Blueprint expectation-path registry lives only at the approved
   Blueprint or Blueprint Hypothesis layer.
6. Each Measurement Cell carries exactly one selected expectation-path binding.
7. Supporting metrics become separate Measurement Cells. A Measurement Cell does
   not hold multiple selected metrics.
8. Repeated Measurement Cells align on org, account lineage, workflow,
   function, cohort, milestone sequence, window mode, approved
   baseline/comparison-window policy, selected metric, source refs, and
   selected expectation path.
9. VBD, Depth, and token context remain Layer 1 behavior context only.
10. Layer 1 behavior context cannot upgrade claims, unlock economic dependency,
    or authorize customer-facing financial output.
11. Future review posture must avoid positive finance or confidence semantics.
12. Corrections create new versions or snapshots. Evidence-bearing posture is
    not silently mutated.

## 4. Logical Entities

### 4.1 Approved Blueprint Hypothesis

Purpose: customer-approved hypothesis object that fixes expected behaviors,
metrics, lags, and governed value-driver pathways.

Logical owner: Blueprint workflow and Blueprint Operator Source Handoff.

Key fields:

- `org_id`
- `client_id`
- `blueprint_id`
- `hypothesis_id`
- `schema_version`
- `approval_status`
- `customer_approval_state`
- `approver_role`
- `approved_at`
- `source_ref`

Allowed payload:

- expected behaviors
- expected metric definitions
- expected lag recommendations as approved or edited by the customer
- governed value drivers in `Revenue`, `Cost`, `Capacity`, `Quality`, or
  `Risk`
- approved expectation-path registry
- caveats and blocked uses

Blocked payload:

- ROI
- EBITDA output
- dollarized impact
- causal proof
- productivity scoring
- probability
- AI contribution confidence
- customer-facing financial output
- raw or person-level source material

Persistence posture:

- Use existing `value_hypotheses` or future approved Blueprint Hypothesis
  persistence only after contract reconciliation.
- Do not create a standalone physical table in this pass.

### 4.2 Blueprint Expectation Path Registry

Purpose: logical registry of all customer-approved expectation paths for a
Blueprint Hypothesis.

Logical owner: approved Blueprint Hypothesis.

Cardinality:

- One approved Blueprint Hypothesis has many expectation paths.
- The full registry must not be copied into Measurement Plans, Measurement
  Cells, Evidence Snapshots, Claim Readiness Snapshots, or Executive Readout
  Snapshots.

Key fields:

- `expectation_path_id`
- `expected_behavior`
- `expected_vbd_signal`
- `expected_metric_id`
- `expected_metric_direction`
- `expected_metric_lag_days`
- `value_driver`
- `source_ref`
- `customer_selected`
- `system_recommended`
- `customer_approval_state`

Blocked fields:

- raw Blueprint text
- prompts or transcripts
- query text
- person identifiers
- probability
- AI contribution confidence
- ROI
- EBITDA
- financial attribution
- customer-facing financial output

Persistence posture:

- Logical only for now.
- Do not normalize into standalone `ExpectationPath` rows yet.

Fail-first rule:

- If two approved paths use the same metric, downstream physical design must
  choose one of two explicit policies:
  - reject duplicate `expected_metric_id` across approved paths for a given
    Blueprint Hypothesis; or
  - include `expectation_path_id` in the governed Measurement Cell and Series
    identity.

The safer default for later physical design is to include `expectation_path_id`
in the Measurement Cell and Series identity because the same metric can support
different theories of change.

### 4.3 Blueprint Expectation Binding

Purpose: compact envelope that binds exactly one approved expectation path to a
Measurement Cell candidate.

Logical owner: Blueprint Operator Source Handoff and Measurement Cell assembly.

Key fields:

- `blueprint_expectation_ref`
- `hypothesis_id`
- `expectation_path_id`
- `selected_metric_id`
- `source_ref`
- `customer_approval_state`
- `approver_role`
- `economic_dependency_allowed`
- `claim_upgrade_allowed`
- `confidence_input_allowed`
- `customer_facing_financial_output_allowed`

Required fixed values:

```json
{
  "economic_dependency_allowed": false,
  "claim_upgrade_allowed": false,
  "confidence_input_allowed": false,
  "customer_facing_financial_output_allowed": false
}
```

Validation posture:

- `expectation_path_id` must exist in the approved Blueprint expectation-path
  registry.
- `selected_metric_id` must match the selected path metric.
- selected direction and lag must match the approved path.
- `source_ref` must be safe and must align to the Blueprint source handoff.
- full `approved_expectation_paths` arrays are blocked downstream.

Persistence posture:

- May be embedded as compact lineage in future Measurement Cell persistence
  only after physical design approval.
- Do not persist as an independent table yet.

### 4.4 Operator Source Bundle Lineage

Purpose: compact lineage across the six operator source lanes before Data Spine
and Measurement Cell handoff.

Logical owner: Operator Source Handoff Bundle.

Lane set:

- `blueprint`
- `ai_fluency`
- `vbd_token`
- `customer_metric`
- `assumption`
- `governance`

Key fields:

- `org_id`
- `client_id`
- `workflow_family`
- `function_area`
- `cohort_key`
- `baseline_window`
- `comparison_window`
- lane-level `source_ref`
- lane-level `owner_role`
- lane-level `review_state`
- lane-level `aggregate_only`

Persistence posture:

- Do not persist bundle outputs as durable proof.
- Persist only compact source refs later if a promoted contract requires them.

Blocked uses:

- Measurement Cell readiness by itself
- finance-context readiness
- customer-facing financial output
- confidence input

### 4.5 Measurement Cell Binding

Purpose: canonical logical evidence grain for one approved metric in one
aggregate workflow/cohort/window context.

Logical owner: Measurement Cell and Measurement Cell Assembly Runner.

Natural grain:

- `org_id`
- `workflow_family`
- optional `workflow_id`
- `function_area`
- `cohort_key`
- `time_window`
- `metric_id`
- `expectation_path_id`

Binding refs:

- `client_id` as account lineage carried by the assembly, Data Spine, or
  series context unless a later contract promotes it into Measurement Cell
  identity
- `measurement_plan_id`
- `data_spine_readiness_id`
- `measurement_cell_id`
- `blueprint_expectation_binding`
- `source_package_refs`
- `operator_source_refs`

Allowed context:

- selected customer-approved metric
- metric owner approval posture
- aggregate source refs
- validation posture
- suppression posture
- caveats
- blocked uses
- Layer 1 behavior context as caveated context only

Blocked context:

- full expectation-path registry
- raw rows
- query text
- prompts
- transcripts
- user identifiers
- productivity scoring
- causality proof
- ROI
- EBITDA
- dollarized output
- probability
- AI contribution confidence
- customer-facing financial output

Fail-first rule:

- A Measurement Cell with the same metric but a different
  `expectation_path_id` is not the same logical cell.
- The assembly runner must prove the selected path came from the approved
  Blueprint handoff registry before packet readiness.

### 4.6 Measurement Cell Series

Purpose: compact continuity layer across repeated Measurement Cells at fixed
milestones.

Logical owner: Measurement Cell Series contract.

Milestones:

- Day 0
- Day 30
- Day 60
- Day 90
- Day 180
- Day 365

Series alignment keys:

- `org_id`
- `client_id`
- `workflow_family`
- `workflow_id` when present
- `function_area`
- `cohort_key`
- `metric_id`
- `expectation_path_id`
- source refs
- milestone sequence
- window mode
- approved baseline/comparison-window policy

Output posture:

- continuity coverage manifest
- held or blocked windows
- compact Measurement Cell refs
- compact source refs
- no trend inference
- no confidence math
- no finance output

Fail-first rule:

- Day 60 with the same metric but a different `expectation_path_id` must block
  continuity rather than appear as a continuous series.

Current contract gap:

- The logical model requires `expectation_path_id` alignment, but the current
  Measurement Cell Series contract and validator do not yet carry that field.
  Physical modeling is blocked until the Series contract and validator either
  add `expectation_path_id` alignment or explicitly reject duplicate metric
  usage across approved paths.

Persistence posture:

- Logical only until a later contract explicitly promotes durable series
  snapshots.

### 4.7 Evidence Continuity Snapshot

Purpose: immutable aggregate snapshot of whether repeated Measurement Cells
exist and remain aligned across the required milestone windows.

Logical owner: future evidence continuity contract.

Key fields:

- `evidence_continuity_snapshot_id`
- `measurement_cell_series_id`
- `measurement_cell_refs`
- `source_refs`
- `alignment_manifest`
- `coverage_state`
- `held_windows`
- `blocked_windows`
- `required_caveats`
- `blocked_uses`
- `validation_json`

Allowed states map to the existing Measurement Cell Series decisions:

- `CONTINUITY_COVERAGE_COMPLETE`
- `HELD_FOR_EVIDENCE_CONTINUITY`
- `BLOCKED`

Blocked fields:

- trend score
- impact score
- probability
- AI contribution confidence
- ROI
- EBITDA
- financial attribution
- productivity
- customer-facing financial output

Persistence posture:

- Not authorized in this pass.
- If promoted later, append-only snapshots should extend the existing
  Evidence Snapshot lineage rather than create a separate evidence system.

### 4.8 Review Posture Snapshot

Purpose: internal review state over evidence continuity and claim boundaries.

Logical owner: Claim Readiness Snapshot and Executive Readout Snapshot
contracts.

Recommended field language:

- `evidence_review_posture`
- `source_quality_band`
- `financial_review_route`
- `not_ai_contribution_confidence`
- `required_caveats`
- `blocked_claims`
- `blocked_uses`

Recommended `financial_review_route` values:

- `held`
- `internal_value_investigation_candidate`
- `requires_financial_governance_contract`

Required fixed value:

```json
{
  "not_ai_contribution_confidence": true
}
```

Blocked field language:

- `confidence`
- `confidence_percentage`
- `probability`
- `attribution_score`
- `contribution_confidence`
- `roi_claim_allowed`
- `financial_translation_allowed`
- `governed_roi_scenario_review`
- `customer_facing_financial_output_allowed` set to true

Persistence posture:

- Existing backend-only snapshot persistence may remain the physical authority.
- Future model language should avoid positive finance and confidence semantics
  unless a later promoted governance contract authorizes the exact scope.

## 5. Relationship Model

```text
Approved Blueprint Hypothesis
  1 -> many Blueprint Expectation Path Registry entries

Blueprint Expectation Path Registry entry
  1 -> many Blueprint Expectation Bindings over time

Blueprint Expectation Binding
  1 -> many Measurement Cell Bindings across windows

Measurement Cell Binding
  1 -> 1 selected metric
  1 -> 1 selected expectation path
  1 -> many source refs
  1 -> 1 validation posture

Measurement Cell Series
  1 -> many Measurement Cell refs
  1 -> 1 continuity manifest

Evidence Continuity Snapshot
  1 -> 1 Measurement Cell Series reference set
  1 -> 1 alignment manifest

Review Posture Snapshot
  1 -> many source and evidence refs
  0 -> 0 customer-facing financial outputs
```

## 6. Existing Persistence Projection Map

| Logical object | Existing or future projection | Current posture |
| --- | --- | --- |
| Approved Blueprint Hypothesis | `value_hypotheses` or future approved Blueprint Hypothesis persistence | Use existing authority first; no new table in this pass |
| Blueprint Expectation Path Registry | Embedded in approved Blueprint/Hypothesis payload only | Logical only; do not normalize yet |
| Blueprint Expectation Binding | Compact field group in future Measurement Cell lineage | Logical only |
| Operator Source Bundle Lineage | `source_package_refs` plus compact source refs if later promoted | Do not persist bundle as proof |
| Measurement Cell Binding | Future Measurement Cell persistence, if promoted | Not authorized in this pass |
| Measurement Cell Series | Future continuity snapshot, if promoted | Not authorized in this pass |
| Evidence Continuity Snapshot | Extension of existing evidence snapshot lineage, if promoted | Not authorized in this pass |
| Review Posture Snapshot | Existing Claim Readiness / Executive Readout Snapshot persistence | Current physical authority exists, but terminology needs reconciliation |

## 7. Data Model Readiness Gate

The repo is ready for this logical model and crosswalk reconciliation.

The repo is not ready for physical data-model work until these are true:

1. Prior Blueprint approved-expectation-path implementation work is committed
   or otherwise isolated from the next branch.
2. `AI_VALUE_BLUEPRINT_CONTRACT_CROSSWALK.md` is reconciled with
   `AI_VALUE_PERSISTENCE_DESIGN.md`.
3. Measurement Cell Series alignment includes `expectation_path_id`, or the
   contract rejects duplicate metric usage across approved paths.
4. Measurement Cell Assembly proves the selected path came from the approved
   Blueprint handoff registry.
5. Future review posture language avoids generic confidence fields and uses
   explicit non-confidence posture.
6. Future finance fields use a held route such as `financial_review_route`
   rather than positive permission flags.
7. VBD, Depth, and token context are carried only as caveated Layer 1 behavior
   context with `economic_dependency_allowed: false`.

## 8. What Not To Model Yet

Do not add:

- physical tables
- migrations
- Prisma schema changes
- repository methods
- backend routes
- frontend UI
- schemas
- live BigQuery execution
- live Glean execution
- connector state
- raw source storage
- full expectation-path registry downstream of the Blueprint/Hypothesis layer
- confidence model inputs or outputs
- probability outputs
- ROI outputs
- EBITDA outputs
- causality outputs
- productivity outputs
- customer-facing financial output

## 9. Recommended Next Slice

The next safe slice is docs and contract reconciliation, not physical storage:

1. Update the Blueprint crosswalk so persistence status matches the current
   backend-only snapshot authority.
2. Harden Measurement Cell Series contract language so `expectation_path_id` is
   an alignment key.
3. Harden Measurement Cell Assembly contract language so selected-path spoofing
   fails closed.
4. Add or update focused negative tests in the already-modified implementation
   slice before any persistence design turns physical.

Only after those four steps should the physical data-model pass begin.
