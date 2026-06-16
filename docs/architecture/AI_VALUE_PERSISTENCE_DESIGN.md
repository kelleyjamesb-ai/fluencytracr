# AI Value Persistence Design

Status: minimal spine implemented; pilot run ledger added as snapshot-aware metadata lineage; Claim Readiness and Executive Readout Snapshot backend persistence promoted

Phase: `phase-ai-value-persistence-design`

This document began as a design note. The minimal aggregate spine now exists,
the pilot repeatability slice adds a snapshot-aware pilot run ledger, and the
snapshot persistence promotion adds backend-only Claim Readiness Snapshot and
Executive Readout Snapshot tables. It still does not authorize backend routes,
frontend UI, ingestion jobs, raw rows, rendered customer readouts, or
customer-facing financial output.

## 1. Purpose

The AI Value chain now has validated contracts for:

`Value Hypothesis -> Measurement Plan -> Source Packages -> Evidence Collection Assembly -> Evidence Snapshot -> Claim Readiness Handoff`

The next durable-state question is what FluencyTracr should store so future
runtime builders can reproduce aggregate evidence posture without storing raw
source data or creating stronger claims than the upstream evidence supports.

## 2. Current Persistence Context

Current durable state is Prisma/Postgres under `backend/prisma/`. There is no
top-level `supabase/` directory.

Existing relevant tables:

- `ai_value_objects`: generic JSONB object store keyed by org, object type, and
  object id.
- `outcome_evidence`: aggregate customer-attested KPI evidence.
- `fluencytracr_verdicts`: immutable aggregate V3 verdict outputs.
- `velocity_distribution_observations`: aggregate V2 velocity observations.
- V1 canonical, execution, classification, aggregate, calibration, and
  suppression tables.

Existing RLS posture:

- Some public application tables explicitly enable RLS and revoke direct `anon`
  and `authenticated` access in their migrations, including `ai_value_objects`
  and `outcome_evidence`.
- Phase 4 must not rely on a global baseline assumption. Every new table must
  explicitly enable RLS and revoke direct `anon` and `authenticated` access in
  its own migration.
- Backend service access is the current controlled persistence path.

Design implication: Phase 4 should preserve the existing Prisma/Postgres and
RLS pattern. It should not introduce a second persistence stack.

## 3. Design Principles

1. Persist aggregate contract payloads only.
2. Store source references and validation results, not raw source data.
3. Preserve `schema_version`, `derivation_version`, coverage posture, caveats,
   blocked uses, privacy posture, suppression posture, and source refs.
4. Use append-only or immutable versioning for evidence-bearing objects.
5. Corrections create new versions; historical evidence posture is not mutated.
6. Persist Claim Readiness and Executive Readout Snapshots only after source
   binding and runtime builders preserve caveats, blocked claims, privacy, and
   suppression boundaries.
7. Keep aggregate workforce context as approved context only.
8. Keep VBD as Layer 1 posture only.
9. Keep BigQuery source availability distinct from full Playbook coverage.
10. Do not persist raw rows, prompts, responses, transcripts, query text, file
    contents, direct identifiers, hashed/joinable/pseudonymous/tokenized person
    identifiers, person-level HRIS records, person-level productivity,
    manager/team comparative-ordering fields, people decisioning fields, or
    customer-facing financial output.
11. Persisted k-min fields record the governed validator posture used at
    validation time. They are not customer/admin settings, tunable thresholds,
    or override controls.

## 4. Table Classification

| Table | Classification | Migration phase | Why |
| --- | --- | --- | --- |
| `value_hypotheses` | `implement_now` | Phase 4 | Customer-selected value hypotheses are durable product state and anchor Measurement Plans. |
| `measurement_plans` | `implement_now` | Phase 4 | Baseline/comparison windows, selected metrics, Playbook requirements, source requirements, and assumptions must be stable before snapshots. |
| `evidence_snapshots` | `implement_now` | Phase 4 | Claim handoffs and later readouts need immutable aggregate evidence posture. |
| `source_package_refs` | `implement_now` | Phase 4 | Source Package metadata/refs need durable lineage without storing raw exports. |
| `ai_value_pilot_runs` | `implemented_snapshot_aware_metadata_lineage` | Pilot repeatability slice plus snapshot lineage promotion | Records the run lineage across Measurement Plan, Source Package refs, persisted Evidence Snapshot, validated Claim Readiness Handoff, and optional persisted Claim Readiness / Executive Readout Snapshot ids. |
| `source_packages` | `design_now_implement_later` | Later, if refs are insufficient | Full package payload persistence is optional and should wait unless runtime builders need reviewed metadata beyond refs. |
| `claim_readiness_snapshots` | `implemented_backend_only` | Snapshot persistence promotion | Source-bound durable posture derived from persisted Evidence Snapshots and validated Claim Readiness Handoffs. |
| `executive_readout_snapshots` | `implemented_backend_only` | Snapshot persistence promotion | Internal-only durable readout posture derived from persisted Claim Readiness Snapshots; no rendered or customer-facing output. |

Phase 4 should implement only the `implement_now` set unless this design is
amended by a later explicit governance decision.

## 5. `value_hypotheses`

Purpose: durable customer-selected value hypothesis for an approved aggregate
workflow scope.

Status: `implement_now`.

Schema outline:

- `id` UUID primary key.
- `org_id` text, required.
- `value_hypothesis_id` text, required.
- `schema_version` text, required.
- `derivation_version` text, required.
- `workflow_family` text, required.
- `function_area` text, nullable.
- `value_route` text, required.
- `hypothesis_statement` text, required.
- `business_objective` text, required.
- `status` text, required.
- `payload_json` JSONB, required.
- `validation_json` JSONB, required.
- `source_refs_json` JSONB, required default `{}`.
- `version` integer, required.
- `supersedes_id` UUID, nullable.
- `created_at` timestamp, required.
- `created_by_role` text, required.

JSON payload contract:

- Validated value hypothesis object or Measurement Plan `value_hypothesis`
  subobject.
- Must include only workflow/function/role-level business context.
- Must include blocked-use posture or inherit it through linked Measurement
  Plan validation.

Source refs:

- Workshop artifact id, blueprint object id, or source package ids only.
- No raw workshop notes, transcripts, prompts, responses, query text, or file
  contents.

Immutability rules:

- Append-only after first evidence snapshot references the hypothesis.
- Corrections create a new `version` and set `supersedes_id`.

Retention rules:

- Retain while any Measurement Plan, Evidence Snapshot, claim snapshot, or
  readout references it.
- Archive through status changes, not hard delete.

RLS posture:

- Enable RLS.
- Revoke `anon` and `authenticated` direct table access.
- Backend service role writes only after validation.
- Future policies may allow org-scoped read access to approved records.

Allowed query patterns:

- By `org_id`.
- By `org_id`, `workflow_family`.
- By `org_id`, `value_hypothesis_id`, latest version.

Blocked query patterns:

- Cross-org reads.
- Free-text search over raw customer notes.
- Queries joining to person-level HRIS, user identifiers, or workforce decision
  fields.

Indexes:

- Unique `(org_id, value_hypothesis_id, version)`.
- `(org_id, workflow_family)`.
- `(org_id, status)`.
- `(org_id, created_at)`.

Why needed now:

- It is the first durable customer decision in the AI Value chain.
- Measurement Plans should bind to a stable hypothesis rather than rehydrate
  from transient UI or generic object-store payloads.

## 6. `measurement_plans`

Purpose: durable validated plan that fixes the evidence question, windows,
metric choices, source requirements, VBD posture, and assumption requirements.

Status: `implement_now`.

Schema outline:

- `id` UUID primary key.
- `org_id` text, required.
- `measurement_plan_id` text, required.
- `value_hypothesis_id` text, required.
- `schema_version` text, required.
- `derivation_version` text, required.
- `workflow_family` text, required.
- `approved_aggregate_grain` text, required.
- `minimum_cohort_threshold` integer, required as recorded validator posture,
  not a tunable setting.
- `baseline_window_start` timestamp, required.
- `baseline_window_end` timestamp, required.
- `comparison_window_start` timestamp, nullable.
- `comparison_window_end` timestamp, nullable.
- `coverage_goal` text, required.
- `readiness_state` text, required.
- `payload_json` JSONB, required.
- `validation_json` JSONB, required.
- `source_package_requirements_json` JSONB, required.
- `assumptions_json` JSONB, required.
- `version` integer, required.
- `supersedes_id` UUID, nullable.
- `created_at` timestamp, required.
- `created_by_role` text, required.

JSON payload contract:

- Must validate with `validateMeasurementPlan`.
- Must carry Playbook evidence requirements, source package requirements, VBD
  measurement design, aggregate workforce context requirements, privacy
  boundary, blocked uses, caveats, readiness, and next actions.

Source refs:

- Value hypothesis id.
- Source readiness ids.
- Source package requirement ids when available.
- No raw rows, query text, exports, direct identifiers, or raw content.

Immutability rules:

- Append-only after an Evidence Snapshot references the plan.
- Window or metric changes create a new plan version.

Retention rules:

- Retain plans that feed snapshots or customer decisions.
- Retire unused drafts through status, not hard delete.

RLS posture:

- Enable RLS.
- Revoke direct `anon` and `authenticated` access.
- Backend service writes only after validator success.

Migration constraint:

- `minimum_cohort_threshold` must be constrained to the governed minimum or
  higher and copied from validated contract posture. It must not be exposed as
  a configurable product threshold or admin override.

Allowed query patterns:

- By `org_id`, `measurement_plan_id`, latest version.
- By `org_id`, `value_hypothesis_id`.
- By `org_id`, `workflow_family`.
- By `org_id`, window range for aggregate readout preparation.

Blocked query patterns:

- Cross-org reads.
- Joins to raw BigQuery rows.
- Joins to direct identifiers, hashed/joinable/pseudonymous/tokenized person
  identifiers, person-level HRIS, person-level productivity, people decisioning,
  or manager/team comparative-ordering data.
- Queries that infer ROI, EBITA, causality, productivity, headcount reduction,
  or customer-facing financial output from telemetry alone.

Indexes:

- Unique `(org_id, measurement_plan_id, version)`.
- `(org_id, value_hypothesis_id)`.
- `(org_id, workflow_family)`.
- `(org_id, baseline_window_start, baseline_window_end)`.
- `(org_id, readiness_state)`.

Why needed now:

- Evidence Snapshots must bind to a validated plan.
- Runtime builders need stable windows and source requirements before
  persistence can safely store derived posture.

## 7. `source_package_refs`

Purpose: durable metadata-only lineage for validated Source Packages that were
considered during evidence assembly.

Status: `implement_now`.

Schema outline:

- `id` UUID primary key.
- `org_id` text, required.
- `source_package_id` text, required.
- `source_package_type` text, required.
- `schema_version` text, required.
- `derivation_version` text, required.
- `measurement_plan_id` text, nullable.
- `workflow_family` text, nullable.
- `covered_window_start` timestamp, required.
- `covered_window_end` timestamp, required.
- `approved_aggregate_grain` text, required.
- `minimum_cohort_threshold` integer, required as recorded validator posture,
  not a tunable setting.
- `evidence_state` text, required.
- `k_min_posture_json` JSONB, required.
- `privacy_boundary_json` JSONB, required.
- `source_refs_json` JSONB, required.
- `validation_json` JSONB, required.
- `caveats_json` JSONB, required.
- `created_at` timestamp, required.
- `created_by_role` text, required.

JSON payload contract:

- Metadata-only projection of a validated Source Package.
- May store package validation result.
- Should not store full package payload unless later design proves refs are
  insufficient.

Source refs:

- Source readiness ids, aggregate export ids, aggregate probe ids, governance
  control export ids, assumption approval export ids.
- No raw rows, query text, SQL text, file contents, prompts, responses,
  transcripts, names, emails, direct person identifiers, or joinable person
  identifiers.

Immutability rules:

- Append-only by `source_package_id` and validation timestamp.
- If a source export is corrected, write a new source package ref.

Retention rules:

- Retain refs while linked Evidence Snapshots exist.
- Retain invalid/unsafe refs only as validation metadata if needed for audit,
  never as feedable evidence.

RLS posture:

- Enable RLS.
- Revoke direct `anon` and `authenticated` access.
- Backend service writes only after Source Package validation.

Migration constraint:

- `minimum_cohort_threshold` must be constrained to the governed minimum or
  higher and copied from validated Source Package posture. It must not be
  exposed as a configurable product threshold or admin override.

Allowed query patterns:

- By `org_id`, `source_package_id`.
- By `org_id`, `measurement_plan_id`.
- By `org_id`, `source_package_type`, window range.
- By `org_id`, `workflow_family`.

Blocked query patterns:

- Pulling raw export contents.
- Reconstructing suppressed slices.
- Joining to person-level data or raw BigQuery rows.
- Treating source availability as full Playbook coverage.

Indexes:

- Unique `(org_id, source_package_id)`.
- `(org_id, measurement_plan_id)`.
- `(org_id, source_package_type)`.
- `(org_id, workflow_family)`.
- `(org_id, covered_window_start, covered_window_end)`.

Why needed now:

- Evidence Snapshots need durable source lineage.
- Storing refs separately prevents the generic object store from becoming raw
  source storage.

## 8. `source_packages`

Purpose: optional future table for full metadata-only Source Package payloads.

Status: `design_now_implement_later`.

Schema outline:

- Same metadata fields as `source_package_refs`.
- `payload_json` JSONB for the validated metadata-only package.
- `validation_json` JSONB.
- `feedable` boolean derived from validator and k-min posture.
- `created_at`, `created_by_role`.

JSON payload contract:

- Must validate with `validateSourcePackage`.
- Must remain metadata-only.

Source refs:

- Same as `source_package_refs`.

Immutability rules:

- Append-only.
- No mutation after linked Evidence Snapshot.

Retention rules:

- Retain only if runtime builders need package metadata beyond refs.

RLS posture:

- Same as `source_package_refs`.

Allowed query patterns:

- Same as `source_package_refs`.

Blocked query patterns:

- Same as `source_package_refs`, plus any query that treats package payload as a
  source export.

Indexes:

- Same as `source_package_refs`.

Why not needed now:

- Phase 4 can safely start with source refs and validation metadata only.
- Full package payload storage increases the risk of smuggling raw content.

## 9. `evidence_snapshots`

Purpose: immutable aggregate Evidence Snapshot derived from a validated
Measurement Plan and validated, source-bound Source Package refs.

Status: `implement_now`.

Schema outline:

- `id` UUID primary key.
- `org_id` text, required.
- `evidence_snapshot_id` text, required.
- `measurement_plan_id` text, required.
- `schema_version` text, required.
- `derivation_version` text, required.
- `workflow_family` text, required.
- `snapshot_type` text, required.
- `coverage_status` text, required.
- `window_start` timestamp, required.
- `window_end` timestamp, required.
- `suppression_default_verdict` text, required.
- `privacy_aggregate_only` boolean, required.
- `k_min_threshold_met` boolean, required.
- `payload_json` JSONB, required.
- `validation_json` JSONB, required.
- `source_refs_json` JSONB, required.
- `required_caveats_json` JSONB, required.
- `blocked_uses_json` JSONB, required.
- `version` integer, required.
- `supersedes_id` UUID, nullable.
- `created_at` timestamp, required.
- `created_by_role` text, required.

JSON payload contract:

- Must validate with `validateEvidenceSnapshot`.
- Must carry Playbook coverage, evidence lanes, VBD operating map, aggregate
  telemetry summary, aggregate workforce context, suppression posture, privacy
  boundary, caveats, blocked uses, source refs, and next evidence actions.

Source refs:

- Measurement Plan id.
- Source Package ref ids.
- V3 verdict ids.
- outcome evidence ids.
- fluency baseline ids.
- BigQuery probe result ids.
- governance and assumption ref ids.
- No raw source rows or raw content.

Immutability rules:

- Append-only.
- Corrections create a new Evidence Snapshot with `supersedes_id`.
- Never update a snapshot used by claim readiness or readout artifacts.

Retention rules:

- Retain while any handoff, claim snapshot, executive readout, audit, or
  customer decision references it.

RLS posture:

- Enable RLS.
- Revoke direct `anon` and `authenticated` access.
- Backend service writes only after Evidence Snapshot validation.
- Future read policies must remain org-scoped and caveat-aware.

Allowed query patterns:

- By `org_id`, `evidence_snapshot_id`.
- By `org_id`, `measurement_plan_id`.
- By `org_id`, `workflow_family`, window range.
- By `org_id`, `coverage_status`.
- Latest valid snapshot for a Measurement Plan.

Blocked query patterns:

- Cross-org reads.
- Extracting raw source rows from refs.
- Reconstructing hidden suppressed slices.
- Treating `layer_1_only`, VBD-only, or aggregate workforce context-only
  snapshots as financial, causality, productivity, headcount, people
  decisioning, or customer-facing financial support.

Indexes:

- Unique `(org_id, evidence_snapshot_id, version)`.
- `(org_id, measurement_plan_id)`.
- `(org_id, workflow_family, window_start, window_end)`.
- `(org_id, coverage_status)`.
- `(org_id, snapshot_type)`.

Why needed now:

- Claim Readiness Handoffs already depend on validated Evidence Snapshot
  posture.
- Runtime builders need a durable aggregate evidence basis before claim
  snapshots or readout snapshots can be considered.

## 10. `claim_readiness_snapshots`

Purpose: persisted snapshot of allowed claim modes and blocked claims,
derived only from a validated Evidence Snapshot and Claim Readiness Handoff.

Status: `implemented_backend_only`.

Schema outline:

- `id` UUID primary key.
- `org_id` text, required.
- `claim_readiness_snapshot_id` text, required.
- `evidence_snapshot_id` text, required.
- `handoff_id` text, required.
- `measurement_plan_id` text, required.
- `schema_version` text, required.
- `derivation_version` text, required.
- `coverage_status` text, required.
- `claim_readiness_state` text, required.
- `financial_boundary_state` text, required.
- `executive_readout_allowed` boolean, required.
- `customer_facing_readout_allowed` boolean, required and false.
- `customer_facing_financial_output_allowed` boolean, required and false.
- `payload_json` JSONB, required.
- `validation_json` JSONB, required.
- `source_refs_json` JSONB, required.
- `required_caveats_json` JSONB, required.
- `blocked_uses_json` JSONB, required.
- `blocked_claims_json` JSONB, required.
- `version` integer, required.
- `supersedes_id` UUID, nullable.
- `created_at` timestamp, required.

JSON payload contract:

- Must be derived from a validated Evidence Snapshot and validated Claim
  Readiness Handoff.
- Must carry caveats and blocked claims forward.
- Must not compute ROI, EBITA, productivity, causality, or customer-facing
  financial output.

Source refs:

- Evidence Snapshot id.
- Claim Readiness Handoff derivation fields.
- Measurement Plan id.
- Source Package ref ids through Evidence Snapshot provenance.

Immutability rules:

- Append-only.
- New snapshot for every new Evidence Snapshot or Handoff derivation.

Retention rules:

- Retain if used by executive readouts, customer artifacts, or governance audit.

RLS posture:

- Same locked public-table posture.
- Additional future read policies must prevent caveated or held claims from
  being presented as approved customer-facing output.

Allowed query patterns:

- By `org_id`, `claim_readiness_snapshot_id`.
- By `org_id`, `evidence_snapshot_id`.
- By `org_id`, `measurement_plan_id`.
- Latest valid claim snapshot for an Evidence Snapshot.

Blocked query patterns:

- Creating snapshots without a validated Evidence Snapshot and Handoff.
- Querying for financial permission without caveats and blocked claims.
- Aggregating claim snapshots into comparative people or team outputs.

Indexes:

- Unique `(org_id, claim_readiness_snapshot_id, version)`.
- `(org_id, evidence_snapshot_id)`.
- `(org_id, measurement_plan_id)`.
- `(org_id, claim_readiness_state)`.

Implementation boundary:

- Backend repository persistence is append-only and source-bound to a persisted
  Evidence Snapshot.
- The stored payload must validate with `validateClaimReadinessSnapshot`.
- No backend route, frontend UI, ingestion job, rendered readout, or
  customer-facing financial output is created by this table.

## 11. `executive_readout_snapshots`

Purpose: immutable internal presentation-state snapshot for executive readout
planning.

Status: `implemented_backend_only`.

Schema outline:

- `id` UUID primary key.
- `org_id` text, required.
- `executive_readout_snapshot_id` text, required.
- `claim_readiness_snapshot_id` text, required for any persisted executive
  readout snapshot.
- `evidence_snapshot_id` text, required.
- `handoff_id` text, required.
- `measurement_plan_id` text, required.
- `schema_version` text, required.
- `derivation_version` text, required.
- `readout_audience` text, required.
- `readout_state` text, required.
- `coverage_status` text, required.
- `customer_facing_readout_allowed` boolean, required and false.
- `customer_facing_financial_output_allowed` boolean, required and false.
- `payload_json` JSONB, required.
- `validation_json` JSONB, required.
- `source_refs_json` JSONB, required.
- `required_caveats_json` JSONB, required.
- `blocked_uses_json` JSONB, required.
- `blocked_claims_json` JSONB, required.
- `version` integer, required.
- `supersedes_id` UUID, nullable.
- `created_at` timestamp, required.

JSON payload contract:

- Must be source-bound to Evidence Snapshot and Claim Readiness Snapshot.
- Must render caveats, blocked claims, coverage status, evidence gaps,
  suppression posture, privacy posture, VBD boundary, workforce-context
  boundary, and financial boundary.
- Must omit or block ROI, EBITA, causality, productivity, headcount reduction,
  individual attribution, manager/team comparative ordering, people decisioning,
  and customer-facing financial output unless a later upstream chain explicitly
  permits a narrower safe claim.

Source refs:

- Evidence Snapshot id.
- Claim Readiness Snapshot id, required for any persisted executive readout
  snapshot.
- Measurement Plan id.
- No raw source refs beyond aggregate metadata references already present in
  the Evidence Snapshot.

Immutability rules:

- Append-only.
- New readout snapshot when evidence, claim posture, assumptions, caveats, or
  audience boundary changes.

Retention rules:

- Retain readouts that were shared, exported, or used in customer decisions.

RLS posture:

- Default deny direct public table access.
- Future read policies must distinguish internal-only from customer-facing
  readouts.

Allowed query patterns:

- By `org_id`, `executive_readout_snapshot_id`.
- By `org_id`, `evidence_snapshot_id`.
- By `org_id`, `claim_readiness_snapshot_id`.
- By `org_id`, `readout_state`.

Blocked query patterns:

- Creating readouts directly from telemetry or Source Packages.
- Querying hidden suppressed values.
- Querying person-level or workforce decisioning data.
- Producing customer-facing financial output from incomplete Playbook coverage.

Indexes:

- Unique `(org_id, executive_readout_snapshot_id, version)`.
- `(org_id, evidence_snapshot_id)`.
- `(org_id, claim_readiness_snapshot_id)`.
- `(org_id, readout_state)`.

Implementation boundary:

- Backend repository persistence is append-only and source-bound to a persisted
  Claim Readiness Snapshot.
- The stored payload must validate with `validateExecutiveReadoutSnapshot`.
- It is an internal-only snapshot of allowed sections, blocked sections,
  caveats, source refs, and governance posture.
- No backend route, frontend UI, ingestion job, rendered readout, customer
  export, or customer-facing financial output is created by this table.

## 12. Relationship to `ai_value_objects`

`ai_value_objects` is useful for local/demo object storage and existing AI Value
workspace flows. It is too broad as the only long-term persistence primitive
for source-bound evidence and claim artifacts because it does not encode:

- immutability/versioning;
- source-package lineage;
- coverage status indexes;
- evidence-window indexes;
- claim/readout derivation boundaries;
- retention posture per artifact type.

Phase 4 must use typed minimal tables for the `implement_now` set:
`value_hypotheses`, `measurement_plans`, `source_package_refs`, and
`evidence_snapshots`.

`ai_value_objects` remains compatibility/demo storage for existing workspace
flows. It must not be used as the Phase 4 persistence path for source-bound
Evidence Snapshots because its current repository pattern uses mutable upsert
semantics. A bridge from `ai_value_objects` to typed immutable tables requires a
later explicit governance decision and migration plan.

## 13. `ai_value_pilot_runs`

Purpose: snapshot-aware metadata lineage ledger for repeatable AI Value pilots.

Status: `implemented_snapshot_aware_metadata_lineage`.

The ledger records lineage and posture only:

- Pilot Run id.
- Measurement Plan id.
- Source Package ref ids.
- Evidence Snapshot id.
- validated Claim Readiness Handoff id.
- coverage status.
- run status.
- required caveats.
- blocked uses.
- validation flags proving Evidence Snapshot persistence and Handoff
  validation.
- optional Claim Readiness Snapshot id when that snapshot was persisted.
- optional Executive Readout Snapshot id when that snapshot was persisted.

It stores only lineage and posture. It does not store full snapshot payloads,
raw rows, prompts, responses, transcripts, query text, direct identifiers,
person-level data, ROI calculations, customer-facing financial output, or
rendered readouts. When snapshot persistence flags are true, the referenced
snapshot ids must exist and match the same org, Measurement Plan, Evidence
Snapshot, Handoff, and coverage lineage.

## 14. Phase 4 Guardrails

The original Phase 4 may implement only:

- `value_hypotheses`;
- `measurement_plans`;
- `source_package_refs`;
- `evidence_snapshots`.

The later pilot repeatability slice may add `ai_value_pilot_runs` only as
metadata lineage over the approved spine. The snapshot persistence promotion
may add `claim_readiness_snapshots` and `executive_readout_snapshots` only as
backend service tables. It must not create customer-facing financial artifacts.

Phase 4 and the snapshot persistence promotion must not implement:

- raw source tables;
- ingestion staging tables with raw rows;
- UI-specific tables;
- person-level tables;
- workforce decisioning tables;
- financial-output tables.

Phase 4 tests must prove:

- migrations apply;
- valid Measurement Plans persist;
- valid Evidence Snapshots persist;
- source refs persist without raw data;
- invalid or unsafe payloads fail before persistence;
- immutable/versioned behavior works;
- RLS posture follows existing public-table hardening;
- no forbidden fields exist in schema or migration.

## 15. Stop Conditions

Stop before Phase 4 if implementation would require:

- raw rows, prompts, responses, transcripts, query text, file contents, or raw
  BigQuery exports;
- direct identifiers or joinable person identifiers;
- person-level HRIS or productivity records;
- manager/team comparative-ordering or people decisioning fields;
- customer-facing financial output;
- mutable Evidence Snapshots;
- claim readiness persistence before runtime builders preserve caveats and
  blocked uses;
- executive readout persistence before claim snapshot safety.

The governance posture is the product. Persistence must preserve it rather than
making downstream artifacts look more certain than the evidence supports.
