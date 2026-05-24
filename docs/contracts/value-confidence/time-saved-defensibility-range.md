# Time-Saved Defensibility Range

## Purpose

The Time-Saved Defensibility Range qualifies a claimed time-saved estimate. It translates governed aggregate evidence into a bounded range that executives can use for claim safety.

It does not prove realized financial ROI. It should be used as a defensibility range, not as a single ROI number.

## Executive Question

How much of the claimed time-saved estimate is defensible given aggregate evidence quality, adoption energy, work integration, reliability, and caveats?

## Inputs

- Raw Glean time-saved estimate.
- V3 aggregate verdicts.
- Velocity.
- Depth.
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

Depth adjusts confidence based on work integration. Low Depth may indicate that activity has not yet become durable operating leverage.

Depth Repertoire is currently approved only as aggregate caveat/context. It must
not adjust the range, confidence band, surfacing eligibility, or any economic
number unless a later calibration decision explicitly promotes that use.

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

## Required Caveats

Every range must state:

- This range qualifies a claimed time-saved estimate.
- It does not prove realized financial ROI.
- Default causality status is `NOT_CAUSAL` unless explicitly governed otherwise.
- Scenario-based upside is not validated value unless supported by outcome evidence.

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
  "required_caveats": [
    "This range qualifies a claimed time-saved estimate.",
    "It does not prove realized financial ROI.",
    "Use as a defensibility range, not a single ROI number."
  ]
}
```

## Non-Capabilities

This readout does not calculate realized ROI.

This readout does not prove productivity impact.

This readout does not establish causality.

This readout does not rank teams or individuals.

This readout does not expose suppressed economics.
