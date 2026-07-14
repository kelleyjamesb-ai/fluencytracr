# Causal Delta Contract

## Purpose

Causal Delta is a pre/post workflow comparator for value-realization analysis. It answers a narrow question: after a known change moment, did the aggregate workflow pattern move in a better, same, or worse direction?

This is the counterfactual primitive Paul's ROI Framework can consume before making business-value claims. It is not an ROI calculation, a causal proof, a p-value, or a statistical-significance test.

## Endpoint

`POST /api/v1/causal-delta`

```json
{
  "workflow_id": "sales_proposal_drafting",
  "event_at": "2026-05-01T00:00:00.000Z",
  "pre_window_days": 60,
  "post_window_days": 60,
  "label": "Skill publish"
}
```

`pre_window_days` and `post_window_days` default to the compiled `60`-day
surfacing minimum. The windows are anchored around `event_at` and do not
overlap:

- Pre window: `[event_at - pre_window_days, event_at)`
- Post window: `[event_at, event_at + post_window_days)`

## Response

```json
{
  "verdict": "SURFACE",
  "suppression_reason": null,
  "pre_pattern": "Blind Efficiency",
  "post_pattern": "Calibrated Fluency",
  "shift": "IMPROVED",
  "pre_cohort_size": 18,
  "post_cohort_size": 21,
  "evidence_grade": "QUALITATIVE",
  "computed_at": "2026-05-22T00:00:00.000Z"
}
```

When either window fails suppression gates, the endpoint returns `verdict: SUPPRESS` and `shift: INDETERMINATE`. Patterns are only populated when the existing pattern detector can safely surface them.

A positive integer window shorter than `60` days is valid operating context but
is not eligible for Causal Delta surfacing. The endpoint returns `SUPPRESS` with
`suppression_reason: INSUFFICIENT_TIME`; it does not classify either window.
Zero, negative, fractional, or malformed window values remain invalid requests.

The post window must also be fully elapsed at computation time. A nominal
60-day request made before `event_at + 60 days` returns `SUPPRESS` with
`INSUFFICIENT_TIME`. Day 30 Measurement Cells remain operating context only;
combining two 30-day milestones does not satisfy the 60-day minimum for each
independent Causal Delta window.

## Pattern Reuse

Causal Delta uses the existing five behavioral patterns only:

- Calibrated Fluency
- Blind Efficiency
- Recovery Maturity
- Friction Loop
- Undertrust Avoidance

No new patterns are introduced for this endpoint.

## Shift Logic

The endpoint compares the dominant surfaced pattern in the pre window to the dominant surfaced pattern in the post window.

- `IMPROVED`: post pattern ranks higher than pre pattern.
- `HELD`: post pattern is unchanged.
- `REGRESSED`: post pattern ranks lower than pre pattern.
- `INDETERMINATE`: one or both windows suppress.

The internal ordering is intentionally coarse:

1. Undertrust Avoidance
2. Friction Loop
3. Blind Efficiency
4. Recovery Maturity
5. Calibrated Fluency

This ordering is a product interpretation for pattern movement, not a statistical score.

## Suppression

Both windows must independently clear suppression gates. If either window suppresses, the whole comparison suppresses.

The endpoint uses existing suppression reasons only:

- `INSUFFICIENT_TIME`
- `INSUFFICIENT_VOLUME`
- `NO_CONVERGENCE`
- `BASELINE_UNSTABLE`
- `HIGH_AMBIGUITY`

## Methodology Limits

Causal Delta is correlation, not causation. A surfaced `IMPROVED` verdict means the observed aggregate workflow pattern moved in a favorable direction after the supplied change moment. It does not prove the change caused the movement.

For stronger causal claims, pair this endpoint with experimental controls where possible:

- holdout groups
- staggered rollout
- matched workflow comparison
- pre-registered outcome metrics
- external customer-attested KPI evidence

Statistical claims, p-values, and significance tests belong to the consuming analysis layer, not FluencyTracr.
