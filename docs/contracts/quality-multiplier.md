# Quality Multiplier Contract

Audience: Paul Li and Karthik Rajkumar.

The Quality Multiplier is a read-only workflow-level adjustment for Glean's time-saved pipeline. It does not compute ROI, prove causality, score people, or inspect content. It answers one bounded question: when a workflow already has enough aggregate evidence to pass FluencyTracr's fail-closed gates, should a raw time-saved estimate be discounted, left neutral, or amplified based on observed workflow quality signals?

## Endpoint

`GET /api/v1/quality-multiplier?workflow_id=<workflow>&window_days=<days>`

Response:

```json
{
  "workflow_id": "sales_proposal_drafting",
  "window_days": 90,
  "multiplier": 1.18,
  "verdict": "SURFACE",
  "suppression_reason": null,
  "cohort_size": 37,
  "evidence_grade": "OBJECTIVE",
  "computed_at": "2026-05-22T00:00:00.000Z"
}
```

If any suppression gate applies, `verdict` is `SUPPRESS` and `multiplier` is `null`. There is no fallback multiplier.

## Gates

The endpoint uses the existing five suppression reasons:

- `INSUFFICIENT_TIME`: requested window is less than 60 days.
- `INSUFFICIENT_VOLUME`: fewer than 5 aggregate workflow executions are observed in the window.
- `NO_CONVERGENCE`: the current or baseline window does not contain enough behavioral signal classes.
- `BASELINE_UNSTABLE`: the current signal mix does not match the prior comparable window.
- `HIGH_AMBIGUITY`: ambiguity-flagged evidence exceeds the ambiguity threshold.

These gates run before the multiplier is disclosed. The default posture is suppress.

## Base Math

The base multiplier is centered at `1.0` and bounded to `[0.5, 1.5]`.

```text
raw_multiplier =
  1.0
  + 0.30 * verification_presence_rate
  + 0.25 * recovery_success_rate
  - 0.35 * abandonment_rate
  - 0.30 * friction_loop_rate

multiplier = clamp(raw_multiplier, 0.5, 1.5)
```

Signals are derived from existing canonical workflow events only:

- Verification presence raises the multiplier.
- Recovery success raises the multiplier when recovery is followed by accepted or edited output.
- Abandonment lowers the multiplier.
- Friction-loop behavior lowers the multiplier when repeated retry behavior and high latency cluster in the workflow.

## Velocity-Aware Adjustment

Default behavior is unchanged. Callers must explicitly opt in:

`GET /api/v1/quality-multiplier?workflow_id=<workflow>&window_days=<days>&include_velocity=true`

When `include_velocity=true` and the matching Velocity Index returns `SURFACE`, Quality Multiplier applies this deterministic adjustment:

```text
velocity_adjustment_factor = clamp(velocity_index, 0.7, 1.3)
adjusted_multiplier = clamp(base_multiplier * velocity_adjustment_factor, 0.5, 1.5)
```

When the Velocity Index returns `SUPPRESS`, Quality Multiplier silently returns the base multiplier. It does not fabricate a velocity value and does not expose a fallback adjustment.

Response with surfaced velocity:

```json
{
  "workflow_id": "sales_proposal_drafting",
  "window_days": 90,
  "multiplier": 1.3,
  "verdict": "SURFACE",
  "suppression_reason": null,
  "cohort_size": 37,
  "evidence_grade": "OBJECTIVE",
  "computed_at": "2026-05-22T00:00:00.000Z",
  "velocity_adjustment_factor": 1.12,
  "velocity_index": 1.12
}
```

## Evidence Grade

- `OBJECTIVE`: surfaced result with `cohort_size >= 30` and `window_days >= 90`.
- `QUALITATIVE`: surfaced or suppressed result that does not meet the objective-grade threshold.
- `CALIBRATED`: reserved for future externally calibrated evidence; not inferred by this endpoint today.

## Integration Guidance

Use the multiplier only when `verdict` is `SURFACE`.

When `verdict` is `SUPPRESS`, downstream value-realization systems should preserve the suppression reason and avoid substituting a default value. The intended behavior is to prevent weak or unsafe evidence from being silently converted into a business-value claim.
