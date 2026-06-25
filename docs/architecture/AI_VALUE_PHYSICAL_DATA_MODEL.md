# AI Value Physical Data Model Readiness Review

Status: physical readiness review and promotion ledger. This document records
the compact backend-internal physical projections that have been separately
promoted and implemented. It does not authorize additional Prisma schema
changes, migrations, repository methods, backend routes, frontend UI, live
Glean or BigQuery execution, persistence writes, confidence math, ROI,
causality, productivity, probability, or customer-facing financial output
without a separate promotion decision.

Phase: `phase-ai-value-physical-data-model`

## 1. Purpose

This document maps the approved logical AI Value spine to the current
Prisma/Postgres persistence spine, records the compact physical projections
that have already been promoted, and identifies the smallest future physical
objects that may be promoted later. It is a promotion ledger and readiness
review, not an open-ended implementation plan for new tables.

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
| `measurement_cell_snapshots` | Compact backend-internal Measurement Cell snapshot | Implemented append-only internal product-data spine |
| `ai_value_customer_data_model_snapshots` | Compact customer data model snapshot over a validated Measurement Cell snapshot projection | Implemented append-only internal product-data spine; only the separately contracted customer evidence status projection may read from it |

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

Do not add additional physical tables in this pass.

The current spine can carry the next pilot/readiness state through existing
append-only tables plus the separately promoted backend-internal
`measurement_cell_snapshots` and `ai_value_customer_data_model_snapshots`
tables. Measurement Cell Series, Evidence Continuity, rendered customer
readouts, exports, research-model inputs, and live connector persistence remain
unpromoted. The hardened selected-path lineage is a contract prerequisite, not
automatic authorization for any additional database objects.

Recommended current projection:

| Logical object | Current physical projection | Notes |
| --- | --- | --- |
| Approved Blueprint Hypothesis | `value_hypotheses.payload_json` plus `source_refs_json` | Use existing authority first; do not create `blueprint_hypotheses` yet |
| Blueprint Expectation Path Registry | Embedded inside approved Blueprint/Hypothesis payload only | Do not normalize full registry into rows |
| Selected Blueprint Expectation Binding | Compact lineage inside `measurement_cell_snapshots` and `ai_value_customer_data_model_snapshots` after recomputed validation | Full registry still stays out of downstream rows |
| AI Fluency Psychological Adoption Context | Existing aggregate AI Fluency import / source-handoff payloads; future compact projection only if promoted | Leading-indicator context only; no value proof, model score, or standalone table |
| Operator Source Bundle Lineage | Not durable proof | Persist only reviewed source refs already represented by `source_package_refs` |
| Upstream Aggregate Handoff Acceptance Package | Executable validation output only | Do not persist upstream handoffs, acceptance packages, manifest packages, pipeline runs, connector runs, or full package JSON |
| Measurement Cell Binding | Compact backend-internal `measurement_cell_snapshots` projection | Full Measurement Cell object is not persisted |
| Customer Data Model Snapshot | Compact backend-internal `ai_value_customer_data_model_snapshots` projection | Stable product-data grain for the separately contracted customer evidence status projection; no stored-row route/UI/export/customer output |
| Measurement Cell Series | Derived contract output | Candidate future projection sketch only after repeated-window contract use |
| Evidence Continuity Snapshot | Derived from Measurement Cell Series | Future extension of evidence lineage only if promoted |
| Review Posture Snapshot | `claim_readiness_snapshots` and `executive_readout_snapshots` | Existing backend-only authority |

Projection detail:

| Logical object | Existing table / JSON field | Indexed physical columns today | Future-only / not authorized |
| --- | --- | --- | --- |
| Approved Blueprint Hypothesis | `value_hypotheses.payload_json`, `source_refs_json` | `org_id`, `value_hypothesis_id`, `workflow_family`, `status`, `created_at` | No standalone `blueprint_hypotheses`; no normalized expectation paths |
| AI Fluency Psychological Adoption Context | Existing aggregate AI Fluency import / source-handoff contract payloads and generic source/evidence refs today; future compact context only if promoted | No AI Fluency-specific indexed columns or standalone context projection today | No standalone adoption-context table, no raw survey responses, no model score, no value proof |
| Measurement Plan | `measurement_plans.payload_json`, `source_package_requirements_json`, `assumptions_json` | `org_id`, `measurement_plan_id`, `value_hypothesis_id`, `workflow_family`, baseline window, `readiness_state` | No admin threshold table; no route/UI authorization |
| Source Package Ref | `source_package_refs.source_refs_json`, `validation_json`, `k_min_posture_json`, `privacy_boundary_json` | `org_id`, `source_package_id`, `source_package_type`, `measurement_plan_id`, `workflow_family`, covered window | No full source package payload table unless refs prove insufficient |
| Evidence Snapshot | `evidence_snapshots.payload_json`, `source_refs_json`, `blocked_uses_json` | `org_id`, `evidence_snapshot_id`, `measurement_plan_id`, `workflow_family`, window, `coverage_status`, `snapshot_type` | No continuity snapshot type until explicitly promoted |
| Claim Readiness Snapshot | `claim_readiness_snapshots.payload_json`, `blocked_claims_json`, `blocked_uses_json` | `org_id`, `claim_readiness_snapshot_id`, `evidence_snapshot_id`, `handoff_id`, `measurement_plan_id`, `claim_readiness_state` | No customer-facing financial output; no positive contribution-model field |
| Executive Readout Snapshot | `executive_readout_snapshots.payload_json`, `blocked_claims_json`, `blocked_uses_json` | `org_id`, `executive_readout_snapshot_id`, `claim_readiness_snapshot_id`, `evidence_snapshot_id`, `measurement_plan_id`, `readout_state` | No rendered readout route/UI/export from this pass |
| Pilot Run Lineage | `ai_value_pilot_runs.*_id`, `source_package_ids_json`, validation/caveat fields | `org_id`, `pilot_run_id`, `measurement_plan_id`, `evidence_snapshot_id`, `claim_readiness_handoff_id`, snapshot ids | No confidence-model or finance feed |
| Upstream Aggregate Handoff Acceptance Package | Contract output from upstream aggregate handoff acceptance runner only | None | No upstream handoff table, acceptance package table, manifest package table, pipeline-run table, connector-run table, or persisted package JSON |
| Measurement Cell Binding | `measurement_cell_snapshots.payload_json`, source/path/metric/window columns, compact aggregate-boundary proof | `org_id`, `measurement_cell_id`, `measurement_plan_id`, `metric_id`, `expectation_path_id`, `workflow_family`, `function_area`, window, `value_driver`, aggregate source/review/source-export refs | No full Measurement Cell object, frontend UI, export, rendered readout, live connector output, or customer-facing read path |
| Customer Data Model Snapshot | `ai_value_customer_data_model_snapshots` compact columns plus compact source refs and aggregate-boundary refs | `org_id`, `customer_data_model_snapshot_id`, `measurement_plan_id`, `source_snapshot_id`, `source_projection_id`, `metric_id`, `expectation_path_id`, `value_driver`, `workflow_family`, `function_area`, `cohort_key`, milestone window, aggregate source/review state | No full projection payload, full Measurement Cell object, full source package, full registry, frontend UI, export, rendered readout, live connector output, model output, or customer-facing read path |
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

## 7. Promoted Projection: `measurement_cell_snapshots`

Status: promoted for backend-internal compact snapshot persistence by
`AI_VALUE_MEASUREMENT_CELL_PERSISTENCE_PROMOTION_DECISION.md`.

Purpose: append-only durable snapshot of one validated Measurement Cell and
its selected Blueprint expectation-path binding. The stored row is compact
lineage, not a full Measurement Cell object, full assembly bundle, customer
readout, connector output, confidence input, or finance output.

Implemented column requirements:

| Column | Type | Requirement |
| --- | --- | --- |
| `id` | UUID | primary key |
| `org_id` | text | required |
| `client_id` | text | required when provided by Data Spine / operator source handoff |
| `measurement_cell_id` | text | required |
| `measurement_cell_assembly_run_id` | text | required |
| `measurement_plan_id` | text | required |
| `aggregate_source_system` | text | required; constrained to `bigquery_export` or `sigma_export` |
| `aggregate_export_review_ref` | text | required compact review id; not job metadata |
| `aggregate_export_review_state` | text | required passed review state for the source system |
| `aggregate_source_export_ref` | text | required compact source-export ref; no URL, query id, job id, table ref, or raw export handle |
| `aggregate_export_review_hash` | text | required review hash |
| `pipeline_dry_run_ref` | text | required compact pipeline dry-run id |
| `pipeline_boundary_hash` | text | required compact pipeline-boundary hash recomputed from aggregate-boundary and snapshot binding |
| `aggregate_boundary_ref_json` | jsonb | compact allowlisted aggregate-boundary proof only |
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
| `milestone_day` | integer | required; `measurement_cell_snapshots` persistence is milestone-only |
| `baseline_window_start` | timestamp | required |
| `baseline_window_end` | timestamp | required |
| `comparison_window_start` | timestamp | required |
| `comparison_window_end` | timestamp | required |
| `assembly_decision` | text | required |
| `payload_json` | jsonb | compact validated Measurement Cell projection only |
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

Implemented constraint requirements:

- unique `(org_id, measurement_cell_id, version)`;
- `version >= 1`;
- `aggregate_source_system` must be `bigquery_export` or `sigma_export`;
- `aggregate_export_review_state` must be the passed review state for that
  source system;
- `aggregate_export_review_hash` and `pipeline_boundary_hash` must be sha256
  hashes, with `pipeline_boundary_hash` recomputed from compact boundary,
  selected path, metric, window, and source-ref binding rather than accepted as
  an external live-run proof;
- `aggregate_boundary_ref_json` must be an object and must remain compact
  allowlisted proof, not a live connector handle or reviewed export payload;
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
- aggregate-boundary proof must be validated from the Measurement Cell
  preflight snapshot-candidate ref and must fail closed when source system,
  review state, source-export ref, review hash, pipeline dry-run ref, pipeline
  source-export ref, compact pipeline-boundary hash, or VBD/token lane binding
  drifts;
- `jsonb_typeof(required_caveats_json) = 'array'`;
- `jsonb_typeof(blocked_uses_json) = 'array'`;
- `blocked_uses_json` must preserve blocked ROI, causality, productivity,
  confidence, probability, person-level, ranking, and customer-facing financial
  output uses through validator enforcement before persistence.
- `window_mode` must be `milestone` and `milestone_day` must be one of Day 0 /
  30 / 60 / 90 / 180 / 365. Rolling 30-day Measurement Cells remain operating
  context only and must fail closed before snapshot persistence.
- `assembly_payload_json` must be null by default. If retained, it may contain
  only compact IDs, assembly decision, compact source refs, caveats, blocked
  uses, and validation posture. It must not duplicate raw source context,
  nested child payloads, full Measurement Cell payloads, full operator handoff
  bundles, raw rows, query text, SQL text, prompts, responses, transcripts,
  file contents, identifiers, row IDs, span IDs, source package payloads, or
  full Blueprint expectation-path registries.
- `blueprint_path_binding_json` must contain exactly one selected path binding
  and must include the stable path identity fields listed above.

Implemented index considerations:

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
- no full Measurement Cell payload;
- no ungoverned pathway taxonomy such as `capacity_creation`,
  `quality_improvement`, or `experience_improvement`;
- no raw source package payloads;
- no operator source handoff bundle as proof;
- no nested child payloads inside JSONB fields;
- no customer-facing financial output flags set to true;
- no generic `confidence`, `probability`, `roi`, `impact`, or productivity
  columns.

## 7.1 Promoted Projection: `ai_value_customer_data_model_snapshots`

Status: promoted for backend-internal compact product-data persistence by the
Customer Data Model Persistence Promotion Decision and Customer Data Model
Persistence Implementation Decision contracts.

Purpose: append-only durable product-data snapshot derived from one valid
Measurement Cell Snapshot Projection. The stored row is the stable customer data
model grain that the separate Customer Data Model Route Projection contract can
map into status-only labels. Customer-visible route strings must come from exact
enum mappings, approved business-context fields, or fixed status mappings, never
by prettifying compact IDs such as `metric_id`, `workflow_family`, source refs,
source-export refs, pipeline refs, connector handles, warehouse handles, hashes,
org IDs, client IDs, or Measurement Cell IDs. The route must project only rows
whose validation posture is clear. The stored row itself is not a
customer-facing read path, rendered readout, export payload, model result,
finance output, connector run, source package, full Measurement Cell, or full
projection payload.

Implemented table grain:

```text
org + measurement_plan + measurement_cell + metric + expectation_path +
milestone + version
```

Implemented column requirements:

| Column group | Requirement |
| --- | --- |
| Snapshot identity | `customer_data_model_snapshot_id`, `source_snapshot_id`, `source_projection_id`, `source_projection_hash`, `source_gate_id`, `source_gate_hash`, `source_promotion_decision_id`, `source_promotion_decision_hash`, `implementation_decision_id`, `implementation_decision_hash` |
| Measurement binding | `measurement_cell_id`, `measurement_cell_assembly_run_id`, `measurement_plan_id` |
| Approved path binding | `value_hypothesis_id` or `value_hypothesis_ref`, `value_hypothesis_binding_state`, `approved_blueprint_ref`, `approved_blueprint_payload_hash`, `blueprint_expectation_ref`, `expectation_path_id`, `expectation_path_version`, `expectation_path_hash`, `approval_state`, `approved_at`, `approved_by_role` |
| Governed pathway metadata | `value_driver` constrained to `Revenue`, `Cost`, `Capacity`, `Quality`, or `Risk` |
| Metric context | `metric_id`, `metric_definition_ref`, `metric_definition_hash`, `metric_owner_approval_state`, `metric_direction`, `metric_unit`, `expected_metric_lag_days` |
| Workflow and cohort context | `workflow_family`, optional `workflow_id`, `function_area`, `cohort_key` |
| Window context | `window_mode = milestone`, `milestone_day` constrained to Day 0 / 30 / 60 / 90 / 180 / 365, baseline and comparison window bounds |
| Aggregate boundary | `aggregate_source_system`, `aggregate_export_review_ref`, `aggregate_export_review_state`, `aggregate_source_export_ref`, `aggregate_export_review_hash`, `pipeline_dry_run_ref`, `pipeline_boundary_hash`, `aggregate_boundary_ref_json` |
| Compact refs and posture | `source_refs_json`, `assembly_decision`, validation booleans, validation gap counts, `required_caveats_json`, `blocked_uses_json` |
| Version and audit | append-only `version`, optional `supersedes_id`, `generated_at`, `created_at`, `created_by_role` |

Implemented constraints and checks:

- unique `(org_id, customer_data_model_snapshot_id, version)`;
- `version >= 1`, with corrections requiring `supersedes_id`;
- `value_driver` is restricted to `Revenue`, `Cost`, `Capacity`, `Quality`, or
  `Risk`;
- `window_mode` is `milestone` only and `milestone_day` is restricted to Day 0
  / 30 / 60 / 90 / 180 / 365;
- `aggregate_source_system` is restricted to `bigquery_export` or
  `sigma_export`;
- `aggregate_export_review_state` must match the governed passed state for the
  selected source system;
- baseline and comparison window end dates must be after their corresponding
  start dates;
- persisted projection and assembly validation booleans must be true, with
  zero validation gaps;
- source projection, gate, promotion decision, implementation decision,
  approved Blueprint payload, expectation path, metric definition, aggregate
  export review, and pipeline-boundary hashes must be sha256 hashes;
- JSON fields are shape-checked by the migration as compact objects or arrays;
  compact key/value semantics are enforced by the backend repository before
  writes, with direct table access blocked by RLS and role revocation;
- the repository recomputes source projection, customer data model gate,
  persistence promotion decision, and implementation decision validation before
  writing;
- the repository loads the referenced `measurement_cell_snapshots` row before
  writing and rejects orphaned, stale, or drifted source authority;
- the repository rejects source snapshot, projection, gate, promotion decision,
  implementation decision, path, approval, metric, lag, cohort, window,
  source-system, aggregate-boundary, caveat, and blocked-use drift;
- DB readiness checks include the new table and critical columns so a skipped
  migration does not report healthy.

Blocked design:

- no `payload_json`, `validation_json`, `blueprint_path_binding_json`, full
  projection payload, or full registry column;
- no full Measurement Cell object, source package payload, operator bundle,
  manifest package, pipeline run, connector run, raw rows, dashboard rows,
  query text, SQL text, prompts, responses, transcripts, file contents,
  identifiers, row IDs, span IDs, hashed identifiers, or joinable person
  identifiers;
- no unrestricted stored-row route, frontend UI, export, rendered readout, live
  BigQuery/Sigma/Glean execution, customer connector execution, unrestricted
  read surface, research-model feed, model output, numeric weights,
  probability output, score-like output, finance output, ROI, EBITDA,
  causality, productivity, customer-facing output, or customer-facing financial
  output. The only allowed read projection is the separately contracted
  source-bound customer evidence status route, which must not expose stored row
  IDs, source refs, hashes, raw data, exports, readouts, live connectors, model
  output, or economic claims;
- no rolling 30-day continuity evidence. Rolling windows remain operating
  context only and must fail closed before this persistence path.

## 8. Future Projection Sketch: `measurement_cell_series_snapshots`

Status: candidate future projection sketch only. This section is
non-authorizing: it must not be copied into Prisma, schemas, repositories,
migrations, routes, UI, or persistence services without a later explicit
promotion decision.

Purpose: append-only durable continuity snapshot across repeated Measurement
Cells at governed milestones.

Do not implement until a later promotion explicitly authorizes durable
Measurement Cell Series state. Repeated Day 0 / 30 / 60 / 90 / 180 / 365
validation has passed through the contract-only Series layer; persistence still
remains held because no durable Series read-path need has been proven. The
executable Series persistence promotion gate can only promote a later
exact-scope implementation decision after a separate durable read-path decision
exists; caller-supplied proof strings alone still hold. The gate does not
create this table, extend `evidence_snapshots`, or authorize routes, UI,
exports, rendered readouts, live connectors, model output, finance output, or
customer-facing output.

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

## 9. Future Projection Sketch: AI Fluency Psychological Adoption Context

Status: candidate projection sketch only. This section is non-authorizing: it
must not be copied into Prisma, schemas, repositories, migrations, routes, UI,
persistence services, research-model inputs, exports, or customer-facing
outputs without a later explicit promotion decision.

Purpose: preserve the distinction between the five-dimension AI Fluency
construct, instrument-reported adoption signals, and observed telemetry
behavior. This sidecar aggregate context can help internal operators compare AI
attitude, instrument-reported behavior / use-practice, and behavioral intent
context with observed AI-enabled work-pattern refs, but it cannot imply
directional dependency, conversion, value proof, causality, productivity, ROI,
EBITDA, or financial output.

The physical model must preserve three separate layers:

```text
AI Fluency Construct Context
  - confidence
  - usage_quality / ease of use display label
  - behavior_change / stated AI behavior display label
  - leadership_reinforcement / leadership support display label
  - capability_growth / competency

AI Fluency Psychological Context
  - ai_attitude
  - behavioral_intent / AI intent display label

Observed Behavior / VBD Context
  - velocity
  - breadth
  - depth
```

`behavior_change` is the governed construct key for instrument-derived behavior.
"Stated AI behavior" is display or review language over that same instrument
evidence, not a second independent field. Psychological context may reference
that instrument behavior view only through `construct_summary_json.behavior_change`.
`usage_quality` and `behavioral_intent` remain the governed construct keys;
ease-of-use and AI intent are display language only.
Observed behavior / VBD is telemetry-derived aggregate work-pattern evidence.
Future persistence must not collapse these into one generic behavior field.
The difference between stated behavior and observed behavior may support
internal diagnostic review, but it is not value proof, causality, productivity,
ROI, EBITDA, probability, model score, or customer-facing output.

Recommended physical posture:

- Prefer existing aggregate AI Fluency import and source-handoff payloads until
  repeated pilots prove a durable projection is needed.
- If later promoted, first consider a compact extension inside existing
  aggregate evidence lineage rather than a standalone table.
- Do not persist raw instrument responses, raw text responses, respondent
  records, or joinable person identifiers.
- Do not persist an adoption-conversion score, contribution-model field, model
  score, probability, finance, ROI, EBITDA, causality, productivity, or
  customer-facing output field.

Allowed compact fields if separately promoted:

| Field | Requirement |
| --- | --- |
| `org_id` | required |
| `client_id` | required when available |
| `measurement_plan_id` | required when tied to a Measurement Cell |
| `workflow_family` | required |
| `function_area` | required |
| `cohort_key` | required |
| `baseline_window_start` / `baseline_window_end` | required |
| `comparison_window_start` / `comparison_window_end` | required when follow-up context is present |
| `source_ref` | compact, reviewed AI Fluency source ref only |
| `source_owner_role` | required |
| `owner_approval_state` | required |
| `review_state` | required |
| `k_min_posture` | required |
| `suppression_posture` | required |
| `construct_summary_json` | aggregate five-dimension AI Fluency construct means or bands only |
| `psychological_context_json` | optional standalone aggregate attitude and behavioral-intent posture only; never standalone evidence |
| `readiness_context_json` | optional compact posture labels only |
| `observed_behavior_ref` | optional for standalone context; required compact VBD / Measurement Cell ref when tied to Measurement Cell evidence or alignment framing |
| `selected_metric_movement_ref` | required compact customer metric movement ref when tied to Measurement Cell evidence or alignment framing |
| `required_caveats_json` | required array |
| `blocked_uses_json` | required array |

`construct_summary_json` may carry governed AI Fluency construct names only as
aggregate instrument context: confidence, usage quality, behavior change,
leadership reinforcement, and capability growth. Instrument-reported behavior
change is not the same as observed telemetry behavior; observed behavior must
remain a compact VBD / Measurement Cell ref. If a legacy instrument construct
is literally named `confidence`, it must remain nested inside the aggregate
instrument construct map and must not become a top-level physical column, model
score, probability, or customer-facing claim.

`psychological_context_json`, if separately promoted, may carry only aggregate
AI attitude and AI intent / behavioral-intent posture as standalone contextual
posture, never standalone evidence. Instrument-reported behavior must remain
in the governed `behavior_change` construct summary, even when product
language calls it "stated AI behavior." Standalone psychological context
cannot create readiness, evidence, Measurement Cell, or alignment state. If
this context is tied to Measurement Cell evidence or alignment framing,
`observed_behavior_ref` and `selected_metric_movement_ref` are required and
must be source-bound, unsuppressed, non-held, and aligned to the approved
expectation path. Psychological context must not carry raw survey answers,
item-level responses, free-text answers, respondent identifiers,
adoption-conversion scores, model scores, probability, finance, causality,
productivity, ROI, EBITDA, or customer-facing output.

The internal Value Evidence Alignment frame is non-persistent framing only:

```text
Value_Evidence_Alignment is reviewable only when all of the following are present:
  Gate_Clear
  Source_Bound
  AI_Fluency_Construct_Context
  AI_Fluency_Psychological_Context_Availability
  Observed_Behavior_VBD_Context
  Selected_Metric_Movement
  Blueprint_Expectation_Path_Alignment
  Assumption_Governance_Context
```

Future persistence must store only the governed ingredients and lineage needed
to review that alignment. The non-computational alignment frame is undefined
and must remain held unless observed VBD context and selected customer metric
movement are both present, source-bound, unsuppressed, non-held, and aligned to
the approved expectation path. Psychological context availability may add
caveats or hold the frame when unsafe or incomplete, but it cannot strengthen,
clear, upgrade, or rescue readiness. Instrument context alone must not produce
an alignment state. Future persistence must not store
`value_evidence_alignment`, alignment scores, numeric weights, contribution
confidence, probability, finance output, ROI, causality, productivity,
customer-facing output, or any frame result. It is not executable pseudocode
and produces no boolean, numeric, score, or stored result. Any future numeric
weights or model outputs require a separate exact-scope research and promotion
decision, repeated aligned evidence, and red/green implementation and
governance tests that explicitly authorize that scope.

Blocked design:

- no standalone `ai_fluency_psychological_scores` table;
- no raw survey response table;
- no respondent, user, employee, manager, team, or department ranking;
- no behavioral-intent-to-value conversion score;
- no attitude, instrument-reported behavior/practice, or intent context may
  rescue missing, held, suppressed, or misaligned VBD, Measurement Cell, or
  customer metric evidence;
- no model score or contribution-model output;
- no finance, ROI, EBITDA, causality, productivity, probability, or
  customer-facing financial output;
- no customer-facing interpretation that treats positive attitude or intent as
  value evidence.

## 10. Future Projection Sketch: Evidence Continuity Projection

Status: candidate projection only; no table yet.

Current placement decision:

- Keep continuity inside the Measurement Cell Series contract output for now.
- If Series persistence is later promoted, keep continuity inside the compact
  Series row first.
- If later product paths prove continuity must be consumed outside Series,
  extend the existing `evidence_snapshots` lineage rather than create a second
  evidence system.
- Do not add new `evidence_snapshots.snapshot_type` values until a migration
  is explicitly authorized.

## 11. Tables Not To Add

Do not add these tables without a later exact-scope promotion decision:

| Table | Reason |
| --- | --- |
| `blueprint_expectation_paths` | Normalizes the full registry too early and increases downstream leakage risk |
| `blueprint_expectation_bindings` | Selected binding should stay compact lineage inside a promoted Measurement Cell, not a standalone source of authority |
| `operator_source_handoff_bundles` | Bundles are preparation manifests, not durable proof |
| `source_packages` | `source_package_refs` remains the safer metadata-only spine unless refs prove insufficient |
| `upstream_aggregate_pipeline_handoffs` | Pipeline handoffs are executable validation output, not durable pipeline state |
| `upstream_aggregate_handoff_acceptance_packages` | Acceptance packages are transient validation output and would become manifest/run persistence if stored wholesale |
| `upstream_aggregate_handoff_acceptance_snapshots` | Held by `AI_VALUE_UPSTREAM_AGGREGATE_ACCEPTANCE_PERSISTENCE_DECISION.md`; future promotion would require exact table scope and recomputation tests |
| `controlled_aggregate_manifest_snapshots` | Manifest persistence remains held; compact manifest refs may flow only through validated downstream objects |
| `pipeline_run_review_manifest_snapshots` | Would imply durable run-review state before manifest persistence is promoted |
| `pipeline_runs` | Live or durable pipeline execution state is not authorized |
| `connector_runs` | Connector execution state is not authorized |
| `ai_fluency_psychological_scores` | Would turn leading-indicator context into an over-strong product object and create score semantics too early |
| `adoption_conversion_scores` | Research-only concept; do not persist score-like conversion outputs before a separate research promotion |
| `measurement_cells` | Use only the promoted compact `measurement_cell_snapshots` projection; do not create a full-object table |
| `customer_data_models` | Use only the promoted compact `ai_value_customer_data_model_snapshots` projection; do not create a mutable full-object table |
| `customer_data_model_payloads` | Would recreate full projection/readout payload storage and weaken the compact-ref boundary |
| `measurement_cell_series` | Use only the candidate `measurement_cell_series_snapshots` design after explicit promotion; current contracts do not authorize persistence |
| `evidence_continuity_manifests` | Continuity remains contract output; if promoted, extend evidence lineage deliberately |
| `research_model_inputs` | Confidence-model research is not authorized yet |
| `roi_outputs` | ROI and financial output are explicitly blocked |
| `productivity_scores` | Person or workforce productivity scoring is prohibited |
| `team_rankings` | Comparative team/manager/department ranking is prohibited |

## 12. Additional Promotion Gate

Before any additional Measurement Cell, Customer Data Model, or Series
persistence beyond `measurement_cell_snapshots` and
`ai_value_customer_data_model_snapshots`, require:

1. A promoted contract decision that names the exact table scope.
2. Red/green tests proving persistence rejects path drift, approval drift,
   lag drift, metric drift, unsafe source refs, raw rows, query text, prompts,
   transcripts, user identifiers, full expectation-path registries, ROI
   fields, EBITDA or finance-output fields, causality fields, productivity
   fields, probability fields, confidence or score-like fields, frontend UI,
   customer-facing route, schema, live execution, override, and threshold side
   doors.
3. Red/green tests proving JSONB-bearing fields cannot smuggle blocked content
   through `payload_json`, `validation_json`, `source_refs_json`, or
   `blueprint_path_binding_json`.
4. Red/green tests proving invalid governed-driver values, missing stable
   selected-path binding fields, missing value hypothesis linkage,
   rolling-window misuse, non-compact `assembly_payload_json`, and
   confidence-containing key names are rejected before any write.
5. Red/green tests proving aggregate AI Fluency psychological context, if
   promoted, rejects raw survey responses, respondent identifiers, raw text
   answers, person-level records, ranking fields, adoption-conversion scores,
   model-score fields, ROI, EBITDA, causality, productivity, probability,
   confidence-like output fields, and customer-facing financial output.
6. Repository methods that accept only already validated contract objects and
   recompute validation before writes.
7. Append-only versioning with `supersedes_id` for corrections.
8. RLS enablement and direct access revocation in the migration itself.
9. No customer-facing read path, export, rendered readout, or financial output.
10. Operator Workflow and Value Hypothesis Readiness remain downstream review
   gates, not bypassed by persisted Measurement Cell / Series rows.

Before any upstream aggregate handoff, acceptance package, manifest package,
pipeline-run, or connector-run persistence, require the separate gate in
`AI_VALUE_UPSTREAM_AGGREGATE_ACCEPTANCE_PERSISTENCE_DECISION.md`. In
particular, pipeline-handoff-only persistence bypasses, stale validation
summaries, accepted-ref drift after rehash, full package JSON, encoded payload
keys, dashboard handles, table handles, workbook IDs, live execution aliases,
and wrapper JSONB smuggling must fail red/green tests before any migration is
allowed.

This document alone cannot trigger additional migrations. A future
implementation slice must cite a separate explicit promotion decision before
adding any physical tables beyond `measurement_cell_snapshots` and
`ai_value_customer_data_model_snapshots`, Prisma models, migrations,
repositories, schemas, unpromoted routes, UI, persistence writes, live
execution, research-model inputs, or customer-facing output.

The [AI Value Research Promotion Readiness Packet](../contracts/ai-value-research-promotion-readiness-packet/README.md)
is the required gate before any internal research design may begin. A passed
packet does not authorize `research_model_inputs`, numeric weights, model
outputs, routes, UI, persistence, exports, ROI, causality, productivity,
probability, finance output, or customer-facing output.

## 13. Recommended Next Decision Slice

Recommended next move:

1. Verify the promoted `ai_value_customer_data_model_snapshots` write/list path
   against the controlled pilot package, implementation decision, DB readiness,
   and governance checks.
2. Keep the customer data model route/UI projection contract status-only and
   source-bound: no raw refs, unrestricted exports, rendered financial output,
   confidence/probability output, ROI, causality, productivity, or live
   connector state.
3. Keep upstream aggregate handoff and acceptance package outputs
   non-persistent until a future exact-scope persistence decision passes the
   recomputation and smuggling tests named above.
4. Run the Series persistence promotion gate before any
   `measurement_cell_series_snapshots` implementation discussion. Repeated
   milestone validation has passed, but it proves internal continuity
   inspection rather than persistence need; a separate durable read-path
   decision is still required.
5. Wire live BigQuery, Sigma, and Glean connector execution last, after the
   customer-facing route/UI projection contract proves it can consume the
   stable persisted product-data model without expanding the evidence boundary.
