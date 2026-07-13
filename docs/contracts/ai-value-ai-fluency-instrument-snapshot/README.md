# AI Fluency Instrument Snapshot

Schema version: `FT_AI_VALUE_AI_FLUENCY_INSTRUMENT_SNAPSHOT_2026_07`

Validator: `shared/src/aiValueEngine/aiFluencyInstrumentSnapshot.ts`

## Purpose

`AIFluencyInstrumentSnapshot` is the canonical aggregate boundary between the
separately deployed AI Fluency Instrument and FluencyTracr model/context
consumers.

It is source-independent. The current Google Sheets / Apps Script aggregate
export, controlled JSON/CSV imports, a future Instrument API, or a future
Postgres-backed Instrument service can all normalize into this snapshot shape.
The model must consume validated snapshots, not Google Sheets, Apps Script,
frontend sample objects, or a source-specific database adapter.

## Required Posture

- Aggregate-only evidence.
- Immutable wave snapshots.
- Source refs and source hashes only.
- No respondent-level rows.
- No emails, employee IDs, respondent IDs, user IDs, raw answers, free text,
  HRIS fields, manager fields, performance fields, compensation fields, or
  productivity fields.
- No confidence percentage, probability, ROI, financial attribution,
  causality, productivity, route, UI, export, persistence, or customer-facing
  output authorization.

## Required Fields

Core identity:

- `schema_version`
- `snapshot_id`
- `client_id`
- `org_id`
- `instrument_id`
- `instrument_version`
- `collection_wave_id`
- `collection_mode`

Aggregate grain:

- `function_area`
- `workflow_family`
- `cohort_key`
- `window_start`
- `window_end`

Aggregate coverage and scores:

- `eligible_population_count`
- `response_count`
- `response_rate`
- `overall_ai_fluency_score`
- `confidence_score`
- `usage_quality_score`
- `behavior_change_score`
- `leadership_reinforcement_score`
- `capability_growth_score`

Optional aggregate uncertainty:

- `overall_standard_error`
- `dimension_standard_errors`
- `dimension_standard_deviations`
- `dimension_response_counts`
- `reliability_estimates`
- `missingness_posture`
- `respondent_composition_posture`

When aggregate standard errors are provided, they must be finite and
nonnegative. Negative standard errors are invalid evidence; they are not
treated as merely missing uncertainty.

Governance and lineage:

- `suppression_state`
- `k_min_posture`
- `source_owner_role`
- `owner_approval_state`
- `review_state`
- `source_adapter`
- `source_ref`
- `source_hash`
- `caveats`
- `aggregate_only=true`
- `person_level_data_present=false`

`suppression_state` in this snapshot is source-review/import posture carried
from aggregate AI Fluency adapters. It is not a FluencyTracr verdict
suppression reason and does not add to or modify the five locked canonical
suppression reasons.

Identity and lineage strings such as `snapshot_id`, `function_area`,
`workflow_family`, `cohort_key`, and `source_ref` must not encode HRIS,
manager, employee, respondent, level, tenure, compensation, performance,
productivity, or bare hash-like identifiers. Those strings are aggregate
lineage only, not join keys for person-level or HR analytics data.

## Missing Measurement Uncertainty

The current aggregate export may not contain enough standard-error or
reliability information for a future Bayesian Fluency measurement model.

Required behavior:

- Missing uncertainty remains visible as `missing_uncertainty_visible`.
- Full Fluency measurement-model authorization remains false.
- Existing approved aggregate scores with missing uncertainty may still be
  retained for import/review posture, but they cannot feed longitudinal model
  context until aggregate uncertainty is available.
- Missing uncertainty must not be filled by invented precision.
- Respondent-level rows must not be exported to solve the gap.

The follow-on calibration boundary is defined in
`docs/contracts/ai-value-ai-fluency-measurement-model-calibration/README.md`.
That contract keeps calibration in `CONTRACT_READY_NOT_RUN` until a separate
exact-scope implementation proposal defines an internal aggregate calibration
artifact and validates it without respondent-level export.

## Source Adapter Parity

The current Apps Script adapter remains a source adapter only. It may aggregate
inside the workbook boundary and emit safe aggregate rows. It must not become
the model runtime or write directly to production tables.

Validated parity in this slice:

- Apps Script-shaped aggregate export fixture.
- Controlled JSON fixture.
- Future Instrument API fixture.

All three normalize to the same canonical snapshot authority.

## Persistence Boundary

No dedicated AI Fluency snapshot table is authorized by this contract. Current
durable persistence authority remains Prisma/Postgres, and any future
`ai_fluency_instrument_snapshots` table requires a separate exact-scope
persistence promotion decision.

This contract does not authorize:

- Prisma schema changes.
- Postgres migrations.
- Repository writes.
- Generic JSON smuggling into existing tables.
- Backend routes.
- Frontend UI.
- Exports.
- Production import jobs.
