# AI Value Leakage Map

## Purpose

The AI Value Leakage Map identifies aggregate places where AI investment may not be converting into defensible value.

It is the CFO-safe version of a gap map: focused on claim safety, aggregate evidence, and scenario caveats.

## Executive Question

Where might AI activity be failing to convert into defensible value, and which caveats or interventions should executives consider?

## Leakage Types

### Velocity Gap

Adoption energy appears too thin, episodic, or narrow to support the claim.

### Depth Gap

AI activity is present, but aggregate evidence of work integration is limited.

### Reuse Gap

Repeatable work is not moving into reusable patterns where reuse would be appropriate.

### Verification Gap

Verification or feedback evidence is missing, insufficient, or not joined to parent surfaces.

### Recovery Gap

Friction, abandonment, or failed attempts are not followed by recoverable workflow progress.

### Friction Gap

High friction limits the conversion of AI activity into defensible value.

## Depth Repertoire Boundary

Depth Repertoire may be cited only as aggregate caveat/context about
cross-surface return use. It must not adjust leakage types, aggregate severity,
scenario-based value-at-risk labels, surfacing eligibility, or economic
interpretation unless a later calibration decision explicitly promotes that
use.

Suppressed or insufficient Depth Repertoire evidence must remain null or absent
and must not be reconstructed through leakage narratives.

## Inputs

- V3 aggregate verdicts.
- Velocity.
- Depth.
- Quality Multiplier.
- Reliability Factor.
- Trust Calibration.
- Outcome Evidence when available.
- Raw time-saved claim context.

## Output Shape

A leakage map should include:

- workflow or portfolio key,
- verdict,
- suppression reason,
- leakage types present,
- aggregate severity band,
- scenario-based value-at-risk label when allowed,
- required caveats,
- blocked claims.

## Economic Interpretation

Value leakage is not a performance judgment. It is aggregate evidence of where AI investment may not be converting into defensible value.

Any leakage estimate based on potential value must be labeled as scenario-based unless validated by outcome evidence.

## Suppression Rules

Suppressed evidence must not produce leakage values, value-at-risk estimates, hours saved, upside estimates, or portfolio totals.

Suppression reasons remain the existing five. This contract does not add suppression reasons.

## Required Caveats

Every leakage map should state:

- Leakage is aggregate evidence, not a judgment about people or teams.
- Scenario-based estimates are not realized value.
- Outcome evidence may strengthen confidence but does not automatically establish causality.
- Suppressed slices cannot contribute economic values.

## Examples

```json
{
  "readout_type": "AI_VALUE_LEAKAGE_MAP",
  "workflow_id": "workflow:CHAT",
  "verdict": "SURFACE",
  "leakage_types": ["DEPTH_GAP", "REUSE_GAP"],
  "aggregate_severity": "MEDIUM",
  "economic_interpretation": "Scenario-based leakage risk; outcome validation not present.",
  "required_caveats": [
    "Value leakage is not a performance judgment.",
    "Any potential value estimate is scenario-based unless validated by outcome evidence."
  ]
}
```

## Non-Capabilities

The leakage map does not rank teams.

The leakage map does not measure individual productivity.

The leakage map does not calculate realized ROI.

The leakage map does not prove causal impact.

The leakage map does not expose suppressed economics.
