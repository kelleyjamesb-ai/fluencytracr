# AI Value Physical Data Model Readiness Review

Status: docs-only physical readiness review. This document does not authorize
new Prisma schema changes, migrations, repository methods, backend routes,
frontend UI, live Glean or BigQuery execution, persistence writes, confidence
math, ROI, causality, productivity, probability, or customer-facing financial
output.

Phase: `phase-ai-value-physical-data-model`

## 1. Purpose

This document maps the approved logical AI Value spine to the current
Prisma/Postgres persistence spine and identifies the smallest future physical
objects that may be promoted later. It is a readiness and projection review,
not an implementation plan for new tables.

It answers:

```text
Which aggregate AI Value objects should be durable product state, which should
remain derived contract output, and which future tables would be needed before
repeated Measurement Cells can support a later governed promotion review?
```

## 2. Current Physical Authority

The current physical authority remains `backend/prisma/schema.prisma`,
`backend/prisma/migrations/*`, and
`docs/architecture/AI_VALUE_PERSISTENCE_DESIGN.md`.

Implemented relevant tables:

| Table | Current role | Physical posture |
| --- | --- | --- |
| `ai_value_objects` | Generic validated AI Value object store | Non-authoritative compatibility layer only; do not use as the evidence proof spine |
| `value_hypotheses` | Durable customer-selected value hypothesis | Implemented append-only product state |
| `measurement_plans` | Durable validated measurement plan | Implemented append-only product state |
| `source_package_refs` | Metadata-only source lineage | Implemented append-only source-ref state |
| `evidence_snapshots` | Immutable aggregate evidence posture | Implemented append-only evidence state |
| `claim_readiness_snapshots` | Backend-only internal claim posture | Implemented, not customer-facing financial output |
| `executive_readout_snapshots` | Backend-only internal readout posture | Implemented, not rendered or customer-facing output |
| `ai_value_pilot_runs` | Snapshot-aware pilot lineage ledger | Implemented metadata lineage |

All future tables must preserve the current public-table posture:

- enable RLS in their own migration;
- revoke direct `anon` and `authenticated` access in their own migration;
- write only through backend service paths after contract validation;
- store aggregate contract payloads, validation results, source refs, caveats,
  and blocked uses;
- never store raw rows, query text, SQL text, prompts, responses, transcripts,
  file contents, direct identifiers, hashed or joinable person identifiers, or
  person-level metrics.

`ai_value_objects` must not become the authority for source-bound evidence,
Blueprint selected-path lineage, Measurement Cell continuity, claim posture, or
customer readout posture. Its mutable compatibility shape is useful for legacy
or demo objects, but durable proof belongs in typed append-only tables or in
validated contract output until a table is promoted.

## 3. Design Decision

Do not add physical tables in this pass.

The current spine can carry the next pilot/readiness state through existing
append-only tables while Measurement Cell and Series persistence remains
unpromoted. The newly hardened selected-path lineage should be treated as a
contract prerequisite, not as automatic authorization for new database objects.

Recommended current projection:

| Logical object | Current physical projection | Notes |
| --- | --- | --- |
| Approved Blueprint Hypothesis | `value_hypotheses.payload_json` plus `source_refs_json` | Use existing authority first; do not create `blueprint_hypotheses` yet |
| Blueprint Expectation Path Registry | Embedded inside approved Blueprint/Hypothesis payload only | Do not normalize full registry into rows |
| Selected Blueprint Expectation Binding | Compact lineage inside Measurement Cell contract output | Future Measurement Cell persistence only if promoted |
| Operator Source Bundle Lineage | Not durable proof | Persist only reviewed source refs already represented by `source_package_refs` |
| Measurement Cell Binding | Derived contract output | Candidate future projection sketch only after promotion |
| Measurement Cell Series | Derived contract output | Candidate future projection sketch only after repeated-window contract use |
| Evidence Continuity Snapshot | Derived from Measurement Cell Series | Future extension of evidence lineage only if promoted |
| Review Posture Snapshot | `claim_readiness_snapshots` and `executive_readout_snapshots` | Existing backend-only authority |

Projection detail:

| Logical object | Existing table / JSON field | Indexed physical columns today | Future-only / not authorized |
| --- | --- | --- | --- |
| Approved Blueprint Hypothesis | `value_hypotheses.payload_json`, `source_refs_json` | `org_id`, `value_hypothesis_id`, `workflow_family`, `status`, `created_at` | No standalone `blueprint_hypotheses`; no normalized expectation paths |
| Measurement Plan | `measurement_plans.payload_json`, `source_package_requirements_json`, `assumptions_json` | `org_id`, `measurement_plan_id`, `value_hypothesis_id`, `workflow_family`, baseline window, `readiness_state` | No admin threshold table; no route/UI authorization |
| Source Package Ref | `source_package_refs.source_refs_json`, `validation_json`, `k_min_posture_json`, `privacy_boundary_json` | `org_id`, `source_package_id`, `source_package_type`, `measurement_plan_id`, `workflow_family`, covered window | No full source package payload table unless refs prove insufficient |
| Evidence Snapshot | `evidence_snapshots.payload_json`, `source_refs_json`, `blocked_uses_json` | `org_id`, `evidence_snapshot_id`, `measurement_plan_id`, `workflow_family`, window, `coverage_status`, `snapshot_type` | No continuity snapshot type until explicitly promoted |
| Claim Readiness Snapshot | `claim_readiness_snapshots.payload_json`, `blocked_claims_json`, `blocked_uses_json` | `org_id`, `claim_readiness_snapshot_id`, `evidence_snapshot_id`, `handoff_id`, `measurement_plan_id`, `claim_readiness_state` | No customer-facing financial output; no positive contribution-model field |
| Executive Readout Snapshot | `executive_readout_snapshots.payload_json`, `blocked_claims_json`, `blocked_uses_json` | `org_id`, `executive_readout_snapshot_id`, `claim_readiness_snapshot_id`, `evidence_snapshot_id`, `measurement_plan_id`, `readout_state` | No rendered readout route/UI/export from this pass |
| Pilot Run Lineage | `ai_value_pilot_runs.*_id`, `source_package_ids_json`, validation/caveat fields | `org_id`, `pilot_run_id`, `measurement_plan_id`, `evidence_snapshot_id`, `claim_readiness_handoff_id`, snapshot ids | No confidence-model or finance feed |
| Measurement Cell Binding | Contract output only | None | Candidate `measurement_cell_snapshots` projection sketch only after promotion |
| Measurement Cell Series | Contract output only | None | Candidate `measurement_cell_series_snapshots` projection sketch only after promotion |

## 4. Canonical Alignment Envelope

No future physical join is authoritative unless the full governed alignment
envelope matches, or a validator explicitly records the absent field as
inapplicable.

Canonical envelope:

- `org_id`
- `client_id` when available
- `measurement_plan_id`
- `value_hypothesis_id` or `value_hypothesis_ref` when
  `expectation_path_id` is present, unless a validator records an explicit
  `value_hypothesis_binding_state: inapplicable`
- `workflow_family`
- `workflow_id` when present
- `function_area`
- `cohort_key`
- `baseline_window_start`
- `baseline_window_end`
- `comparison_window_start`
- `comparison_window_end`
- `metric_id`
- `expectation_path_id` when selected path context is present
- `expectation_path_version` when selected path context is present
- `expectation_path_hash` when selected path context is present
- `approved_blueprint_payload_hash` when selected path context is present
- `approved_blueprint_ref` or `value_hypothesis_ref` when selected path
  context is present
- `approved_at` when selected path context is present
- `approved_by_role` when selected path context is present
- `approval_state` when selected path context is present
- `value_driver` when selected path context is present, constrained to
  `Revenue`, `Cost`, `Capacity`, `Quality`, or `Risk`
- lane-level source refs for Blueprint, AI Fluency, VBD/token, customer metric,
  assumption, and governance

Blocked join shortcuts:

- joining only on `org_id` plus `workflow_family`;
- joining only on source refs without window and cohort alignment;
- treating Source Package Review Queue or Operator Source Handoff Bundle status
  as proof;
- joining same-metric Measurement Cells across different
  `expectation_path_id` values;
- joining selected-path Measurement Cells without matching
  `expectation_path_version`, `expectation_path_hash`,
  `approved_blueprint_payload_hash`, approval state, and approved Blueprint or
  value hypothesis reference;
- joining across clients or cohorts by shared workflow labels.

## 5. Forbidden Physical Columns and JSON Keys

Future table designs must not add top-level columns or JSON keys that create
positive economic, confidence, probability, productivity, causality, or
customer-facing finance semantics.

Forbidden names include:

- `confidence`
- `confidence_score`
- `confidence_percentage`
- `probability`
- `probability_score`
- `contribution_confidence`
- `attribution_score`
- `roi`
- `roi_output`
- `roi_claim_allowed`
- `ebita`
- `ebitda`
- `financial_attribution`
- `financial_translation_allowed`
- `savings`
- `payback`
- `value_at_risk`
- `productivity`
- `productivity_score`
- `causality`
- `causal_proof`
- `customer_facing_financial_output_allowed` set to true

Safe review posture names should stay held or explicitly non-authorizing, such
as `financial_review_route`, `evidence_review_posture`,
`contribution_model_not_authorized`, `research_model_not_promoted`,
`financial_claim_blocked`, `blocked_claims_json`, and `blocked_uses_json`.

Every JSONB-bearing future artifact must inherit validator-level denylist
scanning and source-ref key allowlisting before writes. The table shape alone
is not enough protection because JSONB fields can otherwise smuggle raw data,
unsafe refs, full registries, economic fields, or model fields. This applies
to every future JSONB field, including `payload_json`, `validation_json`,
`source_refs_json`, `assembly_payload_json`, `assembly_validation_json`,
`blueprint_path_binding_json`, `milestone_set_json`,
`measurement_cell_refs_json`, `alignment_manifest_json`,
`evidence_continuity_manifest_json`,
`operator_time_series_compatibility_json`, `rolling_context_json`,
`required_caveats_json`, `blocked_claims_json`, and `blocked_uses_json`.

## 6. Physical Grain

### 6.1 Existing Grain

The implemented evidence chain currently persists:

```text
value_hypotheses
-> measurement_plans
-> source_package_refs
-> evidence_snapshots
-> claim_readiness_snapshots
-> executive_readout_snapshots
```

This is sufficient for source-bound, aggregate evidence posture and internal
claim/readout review.

### 6.2 Missing Grain

The implemented physical spine does not yet have first-class durable objects
for:

- Measurement Cell Assembly Runs;
- Measurement Cells;
- Measurement Cell Series;
- Evidence Continuity Snapshots over Day 0 / 30 / 60 / 90 / 180 / 365.

Those objects are contract-hardened enough to model physically, but not yet
promoted enough to persist.

## 7. Future Projection Sketch: `measurement_cell_snapshots`

Status: candidate future projection sketch only. This section is
non-authorizing: it must not be copied into Prisma, schemas, repositories,
migrations, routes, UI, or persistence services without a later explicit
promotion decision.

Purpose: append-only durable snapshot of one validated Measurement Cell and
its selected Blueprint expectation-path binding.

Do not implement until a later promotion explicitly authorizes Measurement
Cell persistence.

Non-authorizing column requirements if separately promoted:

| Column | Type | Requirement |
| --- | --- | --- |
| `id` | UUID | primary key |
| `org_id` | text | required |
| `client_id` | text | required when provided by Data Spine / operator source handoff |
| `measurement_cell_id` | text | required |
| `measurement_cell_assembly_run_id` | text | required |
| `measurement_plan_id` | text | required |
| `value_hypothesis_id` | text | required when `expectation_path_id` is present unless `value_hypothesis_binding_state` is `inapplicable` |
| `value_hypothesis_ref` | text | required when `value_hypothesis_id` is unavailable and `expectation_path_id` is present unless `value_hypothesis_binding_state` is `inapplicable` |
| `value_hypothesis_binding_state` | text | required when `expectation_path_id` is present |
| `approved_blueprint_ref` | text | required when selected path context is present unless `value_hypothesis_ref` supplies the approved hypothesis reference |
| `approved_blueprint_payload_hash` | text | required when selected path context is present |
| `blueprint_expectation_ref` | text | required when selected path context is present |
| `expectation_path_id` | text | required |
| `expectation_path_version` | integer | required when selected path context is present |
| `expectation_path_hash` | text | required when selected path context is present |
| `approval_state` | text | required when selected path context is present |
| `approved_at` | timestamp | required when selected path context is present |
| `approved_by_role` | text | required when selected path context is present |
| `value_driver` | text | required when selected path context is present; constrained to `Revenue`, `Cost`, `Capacity`, `Quality`, or `Risk` |
| `metric_id` | text | required |
| `metric_definition_ref` | text | required |
| `metric_definition_hash` | text | required |
| `metric_owner_approval_state` | text | required |
| `metric_direction` | text | required |
| `metric_unit` | text | required |
| `expected_metric_lag_days` | integer | required when selected path context is present |
| `workflow_family` | text | required |
| `workflow_id` | text | nullable |
| `function_area` | text | required |
| `cohort_key` | text | required |
| `window_mode` | text | required |
| `milestone_day` | integer | nullable for rolling windows |
| `baseline_window_start` | timestamp | required |
| `baseline_window_end` | timestamp | required |
| `comparison_window_start` | timestamp | required |
| `comparison_window_end` | timestamp | required |
| `assembly_decision` | text | required |
| `payload_json` | jsonb | validated Measurement Cell payload |
| `assembly_payload_json` | jsonb | null by default; otherwise compact allowlisted assembly posture only |
| `validation_json` | jsonb | recomputed Measurement Cell validation |
| `assembly_validation_json` | jsonb | recomputed assembly validation |
| `source_refs_json` | jsonb | compact source refs only |
| `blueprint_path_binding_json` | jsonb | one selected path binding only, not the full registry |
| `required_caveats_json` | jsonb | required array |
| `blocked_uses_json` | jsonb | required array |
| `version` | integer | append-only version, must be >= 1 |
| `supersedes_id` | UUID | nullable |
| `generated_at` | timestamp | required |
| `created_at` | timestamp | required default |
| `created_by_role` | text | required |

Non-authorizing constraint requirements if separately promoted:

- unique `(org_id, measurement_cell_id, version)`;
- `version >= 1`;
- `comparison_window_end > comparison_window_start`;
- `baseline_window_end > baseline_window_start`;
- `expectation_path_id` must be non-empty;
- `expectation_path_version` must be non-empty when
  `expectation_path_id` is present;
- `expectation_path_hash` must be non-empty when `expectation_path_id` is
  present;
- `approved_blueprint_payload_hash` must be non-empty when
  `expectation_path_id` is present;
- `approved_at`, `approved_by_role`, and `approval_state` must be non-empty
  when `expectation_path_id` is present;
- `value_hypothesis_id` or `value_hypothesis_ref` must be present when
  `expectation_path_id` is present unless `value_hypothesis_binding_state` is
  exactly `inapplicable`;
- `value_driver` must be one of `Revenue`, `Cost`, `Capacity`, `Quality`, or
  `Risk` when selected path context is present;
- `metric_id` must be non-empty;
- `metric_definition_ref`, `metric_definition_hash`,
  `metric_owner_approval_state`, `metric_direction`, and `metric_unit` must be
  non-empty;
- metric validation must fail closed when metric definition, owner approval
  posture, unit, direction, selected path metric, baseline/comparison window
  semantics, or expected lag differs from the approved contract;
- generated, validated, covered-window, and approval timestamps must be
  recomputed against contract freshness rules before writes; no migration may
  introduce tunable lag thresholds;
- source package review state and source owner-role posture must be validated
  without storing named approvers, emails, user IDs, row IDs, span IDs, or
  joinable person identifiers;
- `jsonb_typeof(required_caveats_json) = 'array'`;
- `jsonb_typeof(blocked_uses_json) = 'array'`;
- `blocked_uses_json` must preserve blocked ROI, causality, productivity,
  confidence, probability, person-level, ranking, and customer-facing financial
  output uses through validator enforcement before persistence.
- `assembly_payload_json` must be null by default. If retained, it may contain
  only compact IDs, assembly decision, compact source refs, caveats, blocked
  uses, and validation posture. It must not duplicate raw source context,
  nested child payloads, full Measurement Cell payloads, full operator handoff
  bundles, raw rows, query text, SQL text, prompts, responses, transcripts,
  file contents, identifiers, row IDs, span IDs, source package payloads, or
  full Blueprint expectation-path registries.
- `blueprint_path_binding_json` must contain exactly one selected path binding
  and must include the stable path identity fields listed above.

Index considerations if separately promoted:

- `(org_id, measurement_plan_id)`;
- `(org_id, workflow_family, function_area)`;
- `(org_id, cohort_key)`;
- `(org_id, metric_id, expectation_path_id)`;
- `(org_id, value_driver)`;
- `(org_id, window_mode, milestone_day)`;
- `(org_id, comparison_window_start, comparison_window_end)`;
- `(org_id, measurement_cell_assembly_run_id)`.

Blocked design:

- no full `approved_expectation_paths` registry;
- no ungoverned pathway taxonomy such as `capacity_creation`,
  `quality_improvement`, or `experience_improvement`;
- no raw source package payloads;
- no operator source handoff bundle as proof;
- no nested child payloads inside JSONB fields;
- no customer-facing financial output flags set to true;
- no generic `confidence`, `probability`, `roi`, `impact`, or productivity
  columns.

## 8. Future Projection Sketch: `measurement_cell_series_snapshots`

Status: candidate future projection sketch only. This section is
non-authorizing: it must not be copied into Prisma, schemas, repositories,
migrations, routes, UI, or persistence services without a later explicit
promotion decision.

Purpose: append-only durable continuity snapshot across repeated Measurement
Cells at governed milestones.

Do not implement until a later promotion explicitly authorizes durable
Measurement Cell Series state.

Non-authorizing column requirements if separately promoted:

| Column | Type | Requirement |
| --- | --- | --- |
| `id` | UUID | primary key |
| `org_id` | text | required |
| `client_id` | text | required when available |
| `measurement_cell_series_id` | text | required |
| `measurement_plan_id` | text | required |
| `workflow_family` | text | required |
| `workflow_id` | text | nullable |
| `function_area` | text | required |
| `cohort_key` | text | required |
| `metric_id` | text | required |
| `metric_definition_ref` | text | required |
| `metric_definition_hash` | text | required |
| `metric_owner_approval_state` | text | required |
| `metric_direction` | text | required |
| `metric_unit` | text | required |
| `expected_metric_lag_days` | integer | required when selected path context is present |
| `expectation_path_id` | text | required |
| `expectation_path_version` | integer | required |
| `expectation_path_hash` | text | required |
| `approved_blueprint_payload_hash` | text | required |
| `value_hypothesis_id` | text | required unless `value_hypothesis_ref` is present or validator records `inapplicable` |
| `value_hypothesis_ref` | text | required when `value_hypothesis_id` is unavailable unless validator records `inapplicable` |
| `value_hypothesis_binding_state` | text | required |
| `approval_state` | text | required |
| `approved_at` | timestamp | required |
| `approved_by_role` | text | required |
| `value_driver` | text | required; constrained to `Revenue`, `Cost`, `Capacity`, `Quality`, or `Risk` |
| `series_decision` | text | required |
| `series_mode` | text | required; `milestone_series` or `rolling_30_day_context` |
| `window_mode` | text | required |
| `milestone_set_json` | jsonb | required Day 0 / 30 / 60 / 90 / 180 / 365 posture for milestone series |
| `measurement_cell_refs_json` | jsonb | compact cell refs only |
| `alignment_manifest_json` | jsonb | recomputed alignment manifest |
| `evidence_continuity_manifest_json` | jsonb | recomputed continuity manifest for milestone series; null for rolling context |
| `rolling_context_json` | jsonb | compact operating context only; null for milestone series |
| `operator_time_series_compatibility_json` | jsonb | compatibility metadata only |
| `validation_json` | jsonb | recomputed series validation |
| `source_refs_json` | jsonb | compact source refs only |
| `required_caveats_json` | jsonb | required array |
| `blocked_uses_json` | jsonb | required array |
| `version` | integer | append-only version, must be >= 1 |
| `supersedes_id` | UUID | nullable |
| `generated_at` | timestamp | required |
| `created_at` | timestamp | required default |
| `created_by_role` | text | required |

Non-authorizing constraint requirements if separately promoted:

- unique `(org_id, measurement_cell_series_id, version)`;
- `version >= 1`;
- `expectation_path_id` must be non-empty;
- `expectation_path_version`, `expectation_path_hash`,
  `approved_blueprint_payload_hash`, `approval_state`, `approved_at`, and
  `approved_by_role` must be non-empty;
- `value_hypothesis_id` or `value_hypothesis_ref` must be present unless
  `value_hypothesis_binding_state` is exactly `inapplicable`;
- `value_driver` must be one of `Revenue`, `Cost`, `Capacity`, `Quality`, or
  `Risk`;
- `metric_id` must be non-empty;
- `metric_definition_ref`, `metric_definition_hash`,
  `metric_owner_approval_state`, `metric_direction`, and `metric_unit` must be
  non-empty;
- metric and lag validation must fail closed when definition, owner approval
  posture, unit, direction, selected path metric, selected path lag, or
  baseline/comparison window semantics drift across series members;
- `series_decision` must be one of the governed Measurement Cell Series
  decisions;
- `series_mode` must be either `milestone_series` or
  `rolling_30_day_context`;
- `milestone_series` rows must use the governed Day 0 / 30 / 60 / 90 / 180 /
  365 milestone set and may become eligible for continuity review only after a
  later promotion decision. Continuity means governed alignment and window
  availability only, not business impact continuity, financial evidence,
  causal movement, or model readiness.
- `rolling_30_day_context` rows are operating context only; they must not be
  eligible for evidence continuity, finance-context investigation, Bayesian
  research planning, confidence research, customer-facing output, or any
  readout/export path. Future Series persistence is milestone-only unless a
  separate later promotion explicitly authorizes rolling-context persistence.
- `rolling_30_day_context` rows must keep
  `evidence_continuity_manifest_json` null and must not populate
  `milestone_set_json` as if the row were a milestone series.
- `jsonb_typeof(measurement_cell_refs_json) = 'array'`;
- `jsonb_typeof(alignment_manifest_json) = 'object'`;
- `jsonb_typeof(evidence_continuity_manifest_json) = 'object'` only for
  `milestone_series`;
- `jsonb_typeof(required_caveats_json) = 'array'`;
- `jsonb_typeof(blocked_uses_json) = 'array'`.

Index considerations if separately promoted:

- `(org_id, measurement_plan_id)`;
- `(org_id, workflow_family, function_area)`;
- `(org_id, cohort_key)`;
- `(org_id, metric_id, expectation_path_id)`;
- `(org_id, value_driver)`;
- `(org_id, series_mode)`;
- `(org_id, series_decision)`;
- `(org_id, generated_at)`.

Blocked design:

- no trend score;
- no confidence score;
- no probability output;
- no ROI or EBITDA output;
- no causality or productivity output;
- no customer-facing financial output;
- no rescue behavior for missing, held, suppressed, or blocked windows.
- no rolling 30-day row may populate milestone continuity or review posture.

## 9. Future Projection Sketch: Evidence Continuity Projection

Status: candidate projection only; no table yet.

Recommended physical posture:

- Keep continuity inside `measurement_cell_series_snapshots` until repeated
  pilots prove a separate evidence-continuity table is necessary.
- If later promoted, extend the existing `evidence_snapshots` lineage rather
  than create a second evidence system.
- Do not add new `evidence_snapshots.snapshot_type` values until a migration
  is explicitly authorized.

## 10. Tables Not To Add

Do not add these tables in the next implementation slice:

| Table | Reason |
| --- | --- |
| `blueprint_expectation_paths` | Normalizes the full registry too early and increases downstream leakage risk |
| `blueprint_expectation_bindings` | Selected binding should stay compact lineage inside a promoted Measurement Cell, not a standalone source of authority |
| `operator_source_handoff_bundles` | Bundles are preparation manifests, not durable proof |
| `source_packages` | `source_package_refs` remains the safer metadata-only spine unless refs prove insufficient |
| `measurement_cells` | Use only the candidate `measurement_cell_snapshots` design after explicit promotion; current contracts do not authorize persistence |
| `measurement_cell_series` | Use only the candidate `measurement_cell_series_snapshots` design after explicit promotion; current contracts do not authorize persistence |
| `evidence_continuity_manifests` | Continuity remains contract output; if promoted, extend evidence lineage deliberately |
| `research_model_inputs` | Confidence-model research is not authorized yet |
| `roi_outputs` | ROI and financial output are explicitly blocked |
| `productivity_scores` | Person or workforce productivity scoring is prohibited |
| `team_rankings` | Comparative team/manager/department ranking is prohibited |

## 11. Promotion Gate

Before any migration for Measurement Cell or Series persistence, require:

1. A promoted contract decision that names the exact table scope.
2. Red/green tests proving persistence rejects path drift, approval drift,
   lag drift, metric drift, unsafe source refs, raw rows, query text, prompts,
   transcripts, user identifiers, full expectation-path registries, ROI
   fields, EBITDA or finance-output fields, causality fields, productivity
   fields, probability fields, confidence or score-like fields, UI, route,
   schema, live execution, override, and threshold side doors.
3. Red/green tests proving JSONB-bearing fields cannot smuggle blocked content
   through `payload_json`, `validation_json`, `source_refs_json`, or
   `blueprint_path_binding_json`.
4. Red/green tests proving invalid governed-driver values, missing stable
   selected-path binding fields, missing value hypothesis linkage,
   rolling-window misuse, non-compact `assembly_payload_json`, and
   confidence-containing key names are rejected before any write.
5. Static governance tests for this docs-only phase must stay static: no Prisma
   model, migration, schema file, repository method, route, UI, persistence
   service, or future payload validator may be created by this amendment.
6. Repository methods that accept only already validated contract objects and
   recompute validation before writes.
7. Append-only versioning with `supersedes_id` for corrections.
8. RLS enablement and direct access revocation in the migration itself.
9. No customer-facing read path, export, rendered readout, or financial output.
10. Operator Workflow and Value Hypothesis Readiness remain downstream review
   gates, not bypassed by persisted Measurement Cell / Series rows.

This document alone cannot trigger a migration. A future implementation slice
must cite a separate explicit promotion decision before adding physical tables,
Prisma models, migrations, repositories, schemas, routes, UI, persistence
writes, live execution, research-model inputs, or customer-facing output.

## 12. Recommended Next Decision Slice

Do not start with migrations, schemas, repositories, routes, UI, payload
validators, or persistence services.

Recommended next move:

1. Add a docs-only promotion decision for whether
   `measurement_cell_snapshots` should be implemented first.
2. If and only if a separate promotion decision authorizes implementation,
   open a dedicated implementation slice for `measurement_cell_snapshots` with
   the migration, repository, validator, and service-write boundaries named
   before any code is changed.
3. Defer `measurement_cell_series_snapshots` until at least one repeated
   Measurement Cell workflow has been validated end to end across the required
   milestone windows.
