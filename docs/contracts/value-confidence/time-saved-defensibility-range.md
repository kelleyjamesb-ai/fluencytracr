# Time-Saved Defensibility Range

## Purpose

The Time-Saved Defensibility Range qualifies a claimed time-saved estimate. It translates governed aggregate evidence into a bounded range that executives can use for claim safety.

It does not prove realized financial ROI. It should be used as a defensibility range, not as a single ROI number.

## Contract Status

Status: documentation-stage readout contract. No runtime implementation,
endpoint, schema, frontend surface, Prisma migration, or customer-facing
economic readout exists in this PR.

Caveat propagation status:
[V4_TSDR_CAVEAT_PROPAGATION_DECISION.md](../../research/V4_TSDR_CAVEAT_PROPAGATION_DECISION.md)
records `PASS_CAVEAT_PROPAGATION`. Depth Repertoire may appear in this contract
only as aggregate caveat/context. It must not adjust the range, confidence band,
surfacing eligibility, economic interpretation, or blocked claims.

This decision does not authorize Depth Repertoire to become a range input,
confidence-band modifier, surfacing eligibility input, ROI input, causal claim,
prediction claim, hidden multiplier, threshold, benchmark, default, score, or
customer-facing economic number.

## Executive Question

How much of the claimed time-saved estimate is defensible given aggregate evidence quality, adoption energy, work integration, reliability, and caveats?

## Inputs

- Raw Glean time-saved estimate.
- V3 aggregate verdicts.
- Velocity.
- Depth, excluding Depth Repertoire as an economic input.
- Quality Multiplier.
- Reliability Factor.
- Trust Calibration.
- Evidence grade.
- Outcome Evidence when available.

## Conservative / Expected / Upside Range

The range may include:

- `conservative`: the portion of the claim best supported by surfaced evidence,
- `expected`: the middle scenario when evidence is surfaced but caveated,
- `upside`: a scenario-based upper bound when evidence permits.

Suppressed evidence cannot contribute to any range value.

## Adjustment Factors

### Velocity

Velocity adjusts confidence based on adoption energy. Low Velocity may narrow the defensible range even when quality is strong.

### Depth

Depth qualifies interpretation based on aggregate work-integration evidence. Low
Depth may require stronger caveats that activity has not yet become durable
operating leverage.

Depth Repertoire is currently approved only as aggregate caveat/context. It must
not adjust the range, confidence band, surfacing eligibility, or any economic
number unless a later calibration decision explicitly promotes that use.

## Depth Repertoire Boundary

Depth Repertoire may be cited only as aggregate caveat/context about
cross-surface return use. It must not adjust this readout's conservative,
expected, or upside values; confidence band; surfacing eligibility; or economic
interpretation unless a later calibration decision explicitly promotes that
use.

Suppressed or insufficient Depth Repertoire evidence must remain null or absent
and must not be reconstructed through range language.

Allowed placements are limited to:

- `required_caveats`,
- `depth_repertoire_caveat_context`,
- clearly marked aggregate context text.

Depth Repertoire must not appear in Time-Saved Defensibility Range formulas,
range inputs, scenario weights, confidence-band logic, surfacing eligibility,
or economic interpretation. Internal Glean dogfood observations must not become
benchmarks, defaults, thresholds, calibration values, or customer-facing
examples.

Depth Repertoire caveat context may appear only when the underlying Depth
Repertoire readout is itself surfaced and interpretable. If included, the
context must state that Depth Repertoire did not change the range, confidence
band, eligibility, or any economic number.

### Quality

Quality evidence adjusts confidence in the time-saved estimate by reflecting completion, verification, recovery, friction, and abandonment patterns.

### Reliability

Reliability Factor adjusts whether the evidence is operationally dependable enough for executive reporting.

### Trust Calibration

Trust Calibration adjusts whether verification behavior appears appropriate for workflow risk.

### Evidence Grade

Evidence grade controls how strongly the readout can be stated. Customer-stated assumptions cannot upgrade evidence grade.

## Suppression Behavior

Default state is `SUPPRESS`.

If the underlying evidence is suppressed, the range must be null or absent. Suppressed readouts must not expose dollar values, hours saved, upside estimates, or portfolio totals.

If Depth Repertoire is suppressed or insufficient while the Time-Saved
Defensibility Range itself surfaces, `depth_repertoire_caveat_context` must be
null or absent. The readout may not infer, summarize, or reconstruct the missing
Depth Repertoire value.

Suppressed or insufficient Depth Repertoire does not suppress or surface this
readout by itself. It may only remove `depth_repertoire_caveat_context` or add a
required caveat that Depth Repertoire context is unavailable.

## Output Shape

A Time-Saved Defensibility Range artifact may include:

- `readout_type`,
- `workflow_id` or portfolio key,
- `verdict`,
- `suppression_reason`,
- `causality_status`,
- `evidence_grade`,
- `confidence_band`,
- `raw_time_saved_claim_hours`,
- `defensibility_range_hours`,
- `depth_repertoire_caveat_context` when surfaced and applicable,
- `required_caveats`,
- `blocked_claims`.

`depth_repertoire_caveat_context` is optional, documentation-stage, and
non-economic. It must not affect `defensibility_range_hours`,
`confidence_band`, `verdict`, `suppression_reason`, `causality_status`, or
`evidence_grade`.

## Required Caveats

Every range must state:

- This range qualifies a claimed time-saved estimate.
- It does not prove realized financial ROI.
- Default causality status is `NOT_CAUSAL` unless explicitly governed otherwise.
- Scenario-based upside is not validated value unless supported by outcome evidence.
- If Depth Repertoire appears, it is aggregate caveat/context only and did not
  adjust the range, confidence band, eligibility, or economic interpretation.

## Example

```json
{
  "readout_type": "TIME_SAVED_DEFENSIBILITY_RANGE",
  "raw_time_saved_claim_hours": 300,
  "defensibility_range_hours": {
    "conservative": 120,
    "expected": 180,
    "upside": 240
  },
  "causality_status": "NOT_CAUSAL",
  "confidence_band": "MEDIUM",
  "depth_repertoire_caveat_context": {
    "status": "CAVEAT_ONLY",
    "allowed_use": "aggregate_context",
    "blocked_uses": [
      "range_adjustment",
      "confidence_band_adjustment",
      "surfacing_eligibility",
      "economic_number_adjustment"
    ],
    "summary": "Depth Repertoire surfaced as cross-surface return-use context only."
  },
  "required_caveats": [
    "This range qualifies a claimed time-saved estimate.",
    "It does not prove realized financial ROI.",
    "Depth Repertoire is included only as aggregate caveat/context and did not adjust this range.",
    "Use as a defensibility range, not a single ROI number."
  ],
  "blocked_claims": [
    "realized ROI",
    "causal productivity lift",
    "individual productivity",
    "team ranking"
  ]
}
```

## Non-Capabilities

This readout does not calculate realized ROI.

This readout does not prove productivity impact.

This readout does not establish causality.

This readout does not rank teams or individuals.

This readout does not expose suppressed economics.

This readout does not use Depth Repertoire as a hidden multiplier, threshold,
benchmark, default, calibration value, or score.
