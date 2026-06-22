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
repeated Measurement Cells can support later confidence-model research?
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
| Measurement Cell Binding | Derived contract output | Candidate future table only after promotion |
| Measurement Cell Series | Derived contract output | Candidate future table only after repeated-window contract use |
| Evidence Continuity Snapshot | Derived from Measurement Cell Series | Future extension of evidence lineage only if promoted |
| Review Posture Snapshot | `claim_readiness_snapshots` and `executive_readout_snapshots` | Existing backend-only authority |

Projection detail:

| Logical object | Existing table / JSON field | Indexed physical columns today | Future-only / not authorized |
| --- | --- | --- | --- |
| Approved Blueprint Hypothesis | `value_hypotheses.payload_json`, `source_refs_json` | `org_id`, `value_hypothesis_id`, `workflow_family`, `status`, `created_at` | No standalone `blueprint_hypotheses`; no normalized expectation paths |
| Measurement Plan | `measurement_plans.payload_json`, `source_package_requirements_json`, `assumptions_json` | `org_id`, `measurement_plan_id`, `value_hypothesis_id`, `workflow_family`, baseline window, `readiness_state` | No admin threshold table; no route/UI authorization |
| Source Package Ref | `source_package_refs.source_refs_json`, `validation_json`, `k_min_posture_json`, `privacy_boundary_json` | `org_id`, `source_package_id`, `source_package_type`, `measurement_plan_id`, `workflow_family`, covered window | No full source package payload table unless refs prove insufficient |
| Evidence Snapshot | `evidence_snapshots.payload_json`, `source_refs_json`, `blocked_uses_json` | `org_id`, `evidence_snapshot_id`, `measurement_plan_id`, `workflow_family`, window, `coverage_status`, `snapshot_type` | No continuity snapshot type until explicitly promoted |
| Claim Readiness Snapshot | `claim_readiness_snapshots.payload_json`, `blocked_claims_json`, `blocked_uses_json` | `org_id`, `claim_readiness_snapshot_id`, `evidence_snapshot_id`, `handoff_id`, `measurement_plan_id`, `claim_readiness_state` | No customer-facing financial output; no positive confidence field |
| Executive Readout Snapshot | `executive_readout_snapshots.payload_json`, `blocked_claims_json`, `blocked_uses_json` | `org_id`, `executive_readout_snapshot_id`, `claim_readiness_snapshot_id`, `evidence_snapshot_id`, `measurement_plan_id`, `readout_state` | No rendered readout route/UI/export from this pass |
| Pilot Run Lineage | `ai_value_pilot_runs.*_id`, `source_package_ids_json`, validation/caveat fields | `org_id`, `pilot_run_id`, `measurement_plan_id`, `evidence_snapshot_id`, `claim_readiness_handoff_id`, snapshot ids | No confidence-model or finance feed |
| Measurement Cell Binding | Contract output only | None | Candidate `measurement_cell_snapshots` only after promotion |
| Measurement Cell Series | Contract output only | None | Candidate `measurement_cell_series_snapshots` only after promotion |

## 4. Canonical Alignment Envelope

No future physical join is authoritative unless the full governed alignment
envelope matches, or a validator explicitly records the absent field as
inapplicable.

Canonical envelope:

- `org_id`
- `client_id` when available
- `measurement_plan_id`
- `value_hypothesis_id` when available
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
- lane-level source refs for Blueprint, AI Fluency, VBD/token, customer metric,
  assumption, and governance

Blocked join shortcuts:

- joining only on `org_id` plus `workflow_family`;
- joining only on source refs without window and cohort alignment;
- treating Source Package Review Queue or Operator Source Handoff Bundle status
  as proof;
- joining same-metric Measurement Cells across different
  `expectation_path_id` values;
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

Safe review posture names should stay held or explicitly non-confidence, such
as `financial_review_route`, `evidence_review_posture`,
`blocked_claims_json`, `blocked_uses_json`, and
`not_ai_contribution_confidence`.

Every JSONB-bearing future artifact must inherit validator-level denylist
scanning and source-ref key allowlisting before writes. The table shape alone
is not enough protection because `payload_json`, `validation_json`, and
`source_refs_json` can otherwise smuggle raw data or unsafe refs.

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

## 7. Future Candidate: `measurement_cell_snapshots`

Status: candidate future table only.

Purpose: append-only durable snapshot of one validated Measurement Cell and
its selected Blueprint expectation-path binding.

Do not implement until a later promotion explicitly authorizes Measurement
Cell persistence.

Recommended columns if promoted:

| Column | Type | Requirement |
| --- | --- | --- |
| `id` | UUID | primary key |
| `org_id` | text | required |
| `client_id` | text | required when provided by Data Spine / operator source handoff |
| `measurement_cell_id` | text | required |
| `measurement_cell_assembly_run_id` | text | required |
| `measurement_plan_id` | text | required |
| `value_hypothesis_id` | text | nullable until Blueprint Hypothesis persistence is reconciled |
| `blueprint_expectation_ref` | text | required when selected path context is present |
| `expectation_path_id` | text | required |
| `metric_id` | text | required |
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
| `assembly_payload_json` | jsonb | compact assembly payload or null if not retained |
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

Required constraints if promoted:

- unique `(org_id, measurement_cell_id, version)`;
- `version >= 1`;
- `comparison_window_end > comparison_window_start`;
- `baseline_window_end > baseline_window_start`;
- `expectation_path_id` must be non-empty;
- `metric_id` must be non-empty;
- `jsonb_typeof(required_caveats_json) = 'array'`;
- `jsonb_typeof(blocked_uses_json) = 'array'`;
- `blocked_uses_json` must preserve blocked ROI, causality, productivity,
  confidence, probability, person-level, ranking, and customer-facing financial
  output uses through validator enforcement before persistence.

Recommended indexes if promoted:

- `(org_id, measurement_plan_id)`;
- `(org_id, workflow_family, function_area)`;
- `(org_id, cohort_key)`;
- `(org_id, metric_id, expectation_path_id)`;
- `(org_id, window_mode, milestone_day)`;
- `(org_id, comparison_window_start, comparison_window_end)`;
- `(org_id, measurement_cell_assembly_run_id)`.

Blocked design:

- no full `approved_expectation_paths` registry;
- no raw source package payloads;
- no operator source handoff bundle as proof;
- no customer-facing financial output flags set to true;
- no generic `confidence`, `probability`, `roi`, `impact`, or productivity
  columns.

## 8. Future Candidate: `measurement_cell_series_snapshots`

Status: candidate future table only.

Purpose: append-only durable continuity snapshot across repeated Measurement
Cells at governed milestones.

Do not implement until a later promotion explicitly authorizes durable
Measurement Cell Series state.

Recommended columns if promoted:

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
| `expectation_path_id` | text | required |
| `series_decision` | text | required |
| `window_mode` | text | required |
| `milestone_set_json` | jsonb | required Day 0 / 30 / 60 / 90 / 180 / 365 posture |
| `measurement_cell_refs_json` | jsonb | compact cell refs only |
| `alignment_manifest_json` | jsonb | recomputed alignment manifest |
| `evidence_continuity_manifest_json` | jsonb | recomputed continuity manifest |
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

Required constraints if promoted:

- unique `(org_id, measurement_cell_series_id, version)`;
- `version >= 1`;
- `expectation_path_id` must be non-empty;
- `metric_id` must be non-empty;
- `series_decision` must be one of the governed Measurement Cell Series
  decisions;
- `jsonb_typeof(measurement_cell_refs_json) = 'array'`;
- `jsonb_typeof(alignment_manifest_json) = 'object'`;
- `jsonb_typeof(evidence_continuity_manifest_json) = 'object'`;
- `jsonb_typeof(required_caveats_json) = 'array'`;
- `jsonb_typeof(blocked_uses_json) = 'array'`.

Recommended indexes if promoted:

- `(org_id, measurement_plan_id)`;
- `(org_id, workflow_family, function_area)`;
- `(org_id, cohort_key)`;
- `(org_id, metric_id, expectation_path_id)`;
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

## 9. Future Candidate: Evidence Continuity Projection

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
| `confidence_model_inputs` | Confidence-model research is not authorized yet |
| `roi_outputs` | ROI and financial output are explicitly blocked |
| `productivity_scores` | Person or workforce productivity scoring is prohibited |
| `team_rankings` | Comparative team/manager/department ranking is prohibited |

## 11. Promotion Gate

Before any migration for Measurement Cell or Series persistence, require:

1. A promoted contract decision that names the exact table scope.
2. Red/green tests proving persistence rejects raw rows, unsafe source refs,
   identifiers, full expectation-path registries, ROI, causality, productivity,
   confidence, probability, finance-output, UI, route, schema, live execution,
   override, and threshold side doors.
3. Repository methods that accept only already validated contract objects and
   recompute validation before writes.
4. Append-only versioning with `supersedes_id` for corrections.
5. RLS enablement and direct access revocation in the migration itself.
6. No customer-facing read path, export, rendered readout, or financial output.
7. Operator Workflow and Value Hypothesis Readiness remain downstream review
   gates, not bypassed by persisted Measurement Cell / Series rows.

## 12. Recommended Next Implementation Slice

Do not start with migrations.

Recommended next move:

1. Add a docs-only promotion decision for whether
   `measurement_cell_snapshots` should be implemented first.
2. If promoted, implement only `measurement_cell_snapshots` in a dedicated
   migration slice with no routes/UI/repositories beyond backend service write
   helpers.
3. Defer `measurement_cell_series_snapshots` until at least one repeated
   Measurement Cell workflow has been validated end to end across the required
   milestone windows.
