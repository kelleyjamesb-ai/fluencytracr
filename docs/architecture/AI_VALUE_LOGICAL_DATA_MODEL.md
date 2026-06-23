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
-> aggregate AI Fluency Psychological Adoption Context
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
`docs/architecture/AI_VALUE_PERSISTENCE_DESIGN.md`. The current physical
readiness review is `docs/architecture/AI_VALUE_PHYSICAL_DATA_MODEL.md`.

The earlier crosswalk/persistence wording conflict has been narrowed for this
pass: `AI_VALUE_BLUEPRINT_CONTRACT_CROSSWALK.md` points Claim Readiness and
Executive Readout Snapshot posture back to the existing backend-only
persistence authority without promoting new persistence here.

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
11. Aggregate AI Fluency attitude and intent context are leading indicators of
    adoption readiness only. They do not prove value, behavior change, metric
    movement, causality, productivity, ROI, or financial output.
12. Observed AI behavior / VBD is the first behavioral evidence layer. Stated
    attitude and intent cannot substitute for observed behavior or customer
    metric movement.
13. Future review posture must avoid positive finance or confidence semantics.
14. Corrections create new versions or snapshots. Evidence-bearing posture is
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

`value_driver` is driver metadata only. It must use only the governed
Blueprint driver set: `Revenue`, `Cost`, `Capacity`, `Quality`, or `Risk`.
It must not introduce sub-drivers, weights, rankings, normalized pathway
tables, or freeform pathway taxonomy.

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
- `value_hypothesis_ref`
- `approved_blueprint_ref`
- `approved_blueprint_payload_hash`
- `expectation_path_id`
- `expectation_path_version`
- `expectation_path_hash`
- `selected_metric_id`
- `metric_definition_ref`
- `metric_definition_hash`
- `metric_direction`
- `metric_unit`
- `expected_metric_lag_days`
- `value_driver`
- `source_ref`
- `customer_approval_state`
- `approval_state`
- `approved_at`
- `approved_by_role`
- `economic_dependency_allowed`
- `claim_upgrade_allowed`
- `research_model_input_allowed`
- `customer_facing_financial_output_allowed`

Required fixed values:

```json
{
  "economic_dependency_allowed": false,
  "claim_upgrade_allowed": false,
  "research_model_input_allowed": false,
  "customer_facing_financial_output_allowed": false
}
```

Validation posture:

- `expectation_path_id` must exist in the approved Blueprint expectation-path
  registry.
- `expectation_path_version`, `expectation_path_hash`,
  `approved_blueprint_payload_hash`, `approved_blueprint_ref` or
  `value_hypothesis_ref`, `approved_at`, `approved_by_role`, and
  `approval_state` must align to the approved Blueprint Hypothesis.
- `selected_metric_id`, metric definition, metric unit, metric direction, and
  expected lag must match the approved path.
- `value_driver` must be one of `Revenue`, `Cost`, `Capacity`, `Quality`, or
  `Risk`; no freeform pathway labels are allowed.
- `source_ref` must be safe and must align to the Blueprint source handoff.
- selected path lineage must be proven by a validated Blueprint Operator Source
  Handoff before Measurement Cell Assembly can emit a cell.
- emitted `measurement_cell.blueprint_alignment` lineage must match the
  validated handoff, not only the original Measurement Cell input.
- full `approved_expectation_paths` arrays are blocked downstream.

Persistence posture:

- May be embedded as compact lineage in future Measurement Cell persistence
  only after physical design approval.
- Do not persist as an independent table yet.

### 4.3.1 AI Fluency Psychological Adoption Context

Purpose: aggregate Layer 2 context that separates human adoption psychology
from observed behavior and customer-owned metric movement.

Logical owner: AI Fluency Client Import, AI Fluency Dashboard Import Runner,
and AI Fluency Operator Source Handoff.

Core context buckets:

```text
AI Fluency Instrument context
AI attitude / intent context
Observed AI behavior / VBD refs
Selected metric movement refs
Blueprint expectation alignment refs
```

No directional, causal, probability, contribution, or conversion dependency is
implied by these buckets.

Allowed aggregate constructs:

- `ai_attitude`
- `behavioral_intent`
- `capability_belief` when mapped from governed instrument items
- `trust_posture` when mapped from governed instrument items
- `usage_quality`
- `behavior_change`
- `leadership_reinforcement`
- `capability_growth`
- `perceived_ai_impact`

Interpretation posture:

- AI attitude means aggregate orientation toward AI.
- Behavioral intent means aggregate willingness to use AI in real work.
- Observed AI behavior means aggregate workflow telemetry or VBD evidence, not
  survey sentiment.
- Positive attitude plus strong intent means psychological readiness to change,
  not value proof.
- High intent with low observed behavior is an enablement or friction signal,
  not negative value evidence.
- Low intent with high observed behavior is a possible mandate or compliance
  risk signal, not proof of healthy adoption.

Allowed context:

- aggregate construct means or bands from approved AI Fluency exports;
- aggregate collection window and cohort metadata;
- suppression, k-min, owner review, and source-ref posture;
- readiness or friction posture derived from aggregate attitude/intent versus
  observed behavior, only as internal diagnostic context;
- caveats and blocked uses.

Blocked context:

- individual survey answers;
- respondent identifiers;
- emails, names, user IDs, employee IDs, person IDs, or joinable identifiers;
- team, manager, department, or employee ranking;
- raw text responses;
- raw prompts, transcripts, files, or query text;
- ROI, EBITDA, dollarized impact, financial attribution, causality proof,
  productivity scoring, probability, AI contribution confidence, model scores,
  or customer-facing financial output.

Relationship to Measurement Cells:

- Psychological adoption context may be carried as caveated aggregate context
  beside the selected Measurement Cell when source-bound and window-aligned.
- It must not be a Measurement Cell gate by itself.
- It must not rescue missing, held, suppressed, or misaligned VBD or customer
  metric evidence.
- It may later support research planning only after a separate research-model
  promotion decision authorizes the exact scope.

Persistence posture:

- Logical only in this pass.
- Store, if promoted later, only compact aggregate construct summaries and
  source-bound lineage, not raw instrument responses.
- Do not add an independent physical table, migration, route, UI, or model
  input in this pass.

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
- `expectation_path_version`
- `expectation_path_hash`
- `approved_blueprint_payload_hash`
- `value_hypothesis_ref`
- `approval_state`
- `approved_at`
- `approved_by_role`
- `value_driver`
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
- rolling 30-day operating context cannot populate milestone continuity or
  review posture

Fail-first rule:

- Day 60 with the same metric but a different `expectation_path_id` must block
  continuity rather than appear as a continuous series.
- Rolling 30-day context is not a milestone series and cannot feed evidence
  continuity, finance-context investigation, Bayesian research planning,
  confidence research, customer-facing output, or any readout/export path.

Contract hardening status:

- Measurement Cell Series now carries `expectation_path_id` in compact window
  refs, repeated Measurement Cell refs, and the alignment manifest. Physical
  modeling is still blocked until the broader data-model readiness gate clears,
  but same-metric / different-path continuity drift is now a contract-level
  block.

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
- `contribution_model_not_authorized`
- `research_model_not_promoted`
- `financial_claim_blocked`
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
  "contribution_model_not_authorized": true,
  "research_model_not_promoted": true,
  "financial_claim_blocked": true
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

AI Fluency Psychological Adoption Context
  1 -> many Measurement Cell Bindings as optional caveated aggregate context
  0 -> 0 value proof, finance output, or model score outputs

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
| AI Fluency Psychological Adoption Context | Existing aggregate AI Fluency import / source-handoff contracts | Logical context only; no standalone table in this pass |
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
   `AI_VALUE_PERSISTENCE_DESIGN.md` without promoting new persistence in this
   pass.
3. Measurement Cell Series alignment includes `expectation_path_id`, or the
   contract rejects duplicate metric usage across approved paths.
4. Measurement Cell Assembly proves the selected path came from the approved
   Blueprint handoff registry and binds the emitted cell back to that proof.
5. Future review posture language avoids generic confidence fields and uses
   explicit non-authorizing posture.
6. Future finance fields use a held route such as `financial_review_route`
   rather than positive permission flags.
7. VBD, Depth, and token context are carried only as caveated Layer 1 behavior
   context with `economic_dependency_allowed: false`.
8. Psychological adoption context is source-bound, aggregate-only, and clearly
   labeled as leading-indicator context rather than value proof.
9. Any future adoption-conversion model uses governed research terminology and
   avoids physical or JSON key names that imply contribution confidence,
   probability, causality, productivity, ROI, or financial output.

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
- raw AI Fluency instrument answers
- individual or joinable respondent records
- adoption-conversion scores
- research model inputs or outputs
- probability outputs
- ROI outputs
- EBITDA outputs
- causality outputs
- productivity outputs
- customer-facing financial output

## 9. Physical Readiness Cross-Reference

This pass closes the contract-level lineage prerequisites for selected
Blueprint expectation paths:

1. The crosswalk points to existing persistence authority without promoting new
   persistence here.
2. Measurement Cell Series treats `expectation_path_id` as an alignment key.
3. Measurement Cell Assembly requires validated Blueprint handoff proof for
   selected-path context and rejects emitted-cell path tampering.
4. Negative tests cover missing proof, wrong proof, same-metric path drift, and
   stale embedded validation.

The separate physical data-model readiness review now lives in
`docs/architecture/AI_VALUE_PHYSICAL_DATA_MODEL.md`. It remains the current
cross-reference for future persistence gates and does not authorize UI, routes,
schemas, migrations, live execution, confidence math, ROI, causality,
productivity, probability, or customer-facing financial output.
