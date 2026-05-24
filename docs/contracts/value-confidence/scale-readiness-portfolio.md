# AI Scale Readiness Portfolio

## Purpose

The AI Scale Readiness Portfolio defines an executive workflow investment view using Velocity x Depth.

Scale readiness is a workflow investment signal. It is not a comparative team evaluation, employee capability label, or maturity label.

## Contract Status

Status: documentation-stage contract. The governing concept is
[AI_SCALE_READINESS_PORTFOLIO.md](../../concepts/AI_SCALE_READINESS_PORTFOLIO.md).
The current caveat propagation decision records
`HOLD_FOR_60_DAY_GLEAN_DOGFOOD`; no API, schema, customer-facing readout, or
contract hardening beyond documentation-stage language is approved.

## Executive Question

Which workflows are ready to scale, harvest, coach, redesign, govern, or suppress based on governed aggregate evidence?

## Velocity x Depth Matrix

Velocity measures adoption energy.

Depth measures work integration.

The matrix combines both:

| Velocity | Depth | Interpretation |
| --- | --- | --- |
| High | High | Strong candidate for scale or harvest decisions. |
| High | Low | Activity may be broad but fragile. |
| Low | High | Focused integration may be valuable but narrow. |
| Low | Low | Workflow likely needs coaching, redesign, or more evidence. |
| Suppressed | Any | No economic or portfolio interpretation. |

## Decision Zones

### SCALE

Aggregate evidence supports broader rollout consideration with caveats.

### HARVEST

Aggregate evidence supports careful value realization, operationalization, or reporting.

### COACH

Aggregate evidence suggests adoption or integration needs enablement.

### REDESIGN

Aggregate evidence suggests the workflow or AI pattern may not fit the work.

### GOVERN

Aggregate evidence suggests stronger policy, review, or trust calibration is needed.

### SUPPRESSED

Fail-closed gates block interpretation. No economic or portfolio values should be exposed.

## Inputs

- V3 aggregate verdicts.
- Velocity.
- Depth.
- Quality Multiplier.
- Reliability Factor.
- Trust Calibration.
- Outcome Evidence when available.

Depth Repertoire may appear only as research context or caveat language until a
later 60-day-compliant value-confidence calibration decision explicitly allows
economic use.

## Output Shape

A portfolio readout should include:

- workflow key,
- verdict,
- suppression reason,
- Velocity band,
- Depth band,
- decision zone,
- required caveats,
- blocked claims.

## Required Caveats

Every portfolio readout should state:

- The output supports decisions about where to scale, coach, redesign, or govern.
- It is not a comparative team evaluation, employee capability label, or maturity label.
- Suppressed workflows cannot contribute portfolio totals.
- Decision zones require business context before action.
- Missing surface, segment, verification, AGENT metadata, reusable workflow, or
  organization metadata coverage is a data readiness gap, not low readiness.

## Examples

```json
{
  "readout_type": "AI_SCALE_READINESS_PORTFOLIO",
  "workflow_id": "workflow:CHAT",
  "verdict": "SURFACE",
  "velocity_band": "HIGH",
  "depth_band": "MEDIUM",
  "decision_zone": "SCALE",
  "required_caveats": [
    "Scale readiness is a workflow investment signal.",
    "Do not use this readout to rank teams or label employees."
  ]
}
```

## Non-Capabilities

The portfolio does not rank teams.

The portfolio does not label employee capability.

The portfolio does not calculate realized ROI.

The portfolio does not prove causality.

The portfolio does not override suppression.
