# Velocity Index Contract

Audience: AIOMs, value-realization PMs, and governance reviewers.

Velocity Index is a V2 aggregate workflow output. It observes how a cohort uses AI across three independent dimensions: frequency, engagement, and breadth. It does not name, rank, score, or expose any person. The endpoint only surfaces cohort-distribution evidence after the same fail-closed gates clear.

## Canonical Events

Velocity adds three V2 canonical events:

- `USER_FREQUENCY_OBSERVED`: runs per active day, reported as a cohort percentile distribution.
- `USER_ENGAGEMENT_OBSERVED`: active days per window, reported as a cohort percentile distribution.
- `USER_BREADTH_OBSERVED`: distinct surfaces touched per window, reported as a cohort percentile distribution.

Each event is an aggregate-distribution observation. It is not a row-level person event.

## Ingest

`POST /api/v2/ingest/velocity-distribution`

The body must match one of the V2 velocity schemas in `schemas/`:

- `ft_v2_user_frequency_observed.schema.json`
- `ft_v2_user_engagement_observed.schema.json`
- `ft_v2_user_breadth_observed.schema.json`

Required fields include `workflow_id`, `window_start`, `window_end`, `cohort_size`, `distribution`, and `privacy.person_level_fields_included = false`. Payloads may include aggregate `ambiguity_rate` metadata so ambiguity-dominant windows can fail closed without exposing person-level evidence.

Payloads with person-resolving fields are rejected at the boundary. The accepted path stores only aggregate percentiles and the optional opaque slice keys `jbtd_id` and `persona_id`.

When Postgres is configured, accepted velocity distributions are persisted as
append-only aggregate observations in `velocity_distribution_observations`.
The table stores workflow/window/slice metadata, percentile distribution JSON,
calibration reference, and ingestion timestamps. It does not store person-level
rows, names, email addresses, raw user identifiers, or any field that can
resolve a person. The database migration also includes a check constraint that
keeps `person_level_fields_included` false at the storage boundary.

## Endpoint

`GET /api/v2/velocity-index?workflow_id=<workflow>&window_days=<days>`

Response:

```json
{
  "workflow_id": "manager_review_writer",
  "jbtd_id": null,
  "persona_id": null,
  "window_days": 90,
  "verdict": "SURFACE",
  "suppression_reason": null,
  "frequency_index": 1.08,
  "engagement_index": 1.0,
  "breadth_index": 0.93,
  "velocity_index": 1.003,
  "cohort_size": 37,
  "calibration_reference": "scio-prod-60d-2026-05",
  "evidence_grade": "OBJECTIVE",
  "computed_at": "2026-05-22T00:00:00.000Z"
}
```

When suppression applies, `verdict` is `SUPPRESS` and all index fields are `null`.

The read path only uses distribution payloads that cover the requested window and align to the current evaluation window. Shorter or stale distributions are ignored and therefore fail closed.

The read path uses durable observations when database persistence is enabled.
If no qualifying persisted observations exist for the requested workflow/window
and slice, the endpoint returns `SUPPRESS`; it does not synthesize fallback
velocity values from partial data. Persisted reads are tenant scoped and only
replay rows from the current V2 schema version and the three velocity event
types.

## Gates

The endpoint uses the existing five suppression reasons:

- `INSUFFICIENT_TIME`: requested window is less than 60 days.
- `INSUFFICIENT_VOLUME`: cohort size is less than 5.
- `NO_CONVERGENCE`: one or more required velocity dimensions is missing.
- `BASELINE_UNSTABLE`: the submitted calibration reference does not match the configured baseline.
- `HIGH_AMBIGUITY`: aggregate `ambiguity_rate` exceeds the ambiguity threshold.

The default posture is suppress. Suppression applies independently per workflow and per optional `(jbtd_id, persona_id)` slice.

## Calibration

Velocity is relative to a governance-reviewed calibration reference. The current baseline lives only in `calibration/velocity_baselines.json`:

`scio-prod-60d-2026-05`

Swapping the calibration file is a deliberate governance operation. It is not an admin override of suppression gates and it does not change the compiled thresholds.

## Math

Each sub-index is computed independently against the calibration cohort's p50:

```text
frequency_index  = clamp(observed_frequency_p50 / calibration_frequency_p50, 0.0, 1.5)
engagement_index = clamp(observed_engagement_p50 / calibration_engagement_p50, 0.0, 1.5)
breadth_index    = clamp(observed_breadth_p50 / calibration_breadth_p50, 0.0, 1.5)

velocity_index = average(frequency_index, engagement_index, breadth_index)
```

The composite is a flat average in V2.0. Weighted composition is out of scope.

## Evidence Grade

- `OBJECTIVE`: surfaced result with `cohort_size >= 30` and `window_days >= 90`.
- `QUALITATIVE`: surfaced or suppressed result that does not meet the objective-grade threshold.
- `CALIBRATED`: reserved for future externally calibrated evidence; not inferred by this endpoint today.

## Non-Goals

Velocity Index does not become a gate for existing non-velocity endpoints. It can inform Quality Multiplier only when the caller explicitly opts in with `include_velocity=true`.

Velocity Index does not compute ROI, causality, individual productivity, or person-level usage. It is aggregate behavioral context for value realization.
