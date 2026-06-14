# Trust Calibration Index

## Purpose

The Trust Calibration Index evaluates whether verification behavior appears appropriate for workflow risk and available evidence.

Trust Calibration does not reward maximum verification. It evaluates whether verification behavior appears appropriate for workflow risk and available evidence.

## Contract Status

Status: documentation-stage contract. The current caveat propagation decision
records `HOLD_FOR_60_DAY_GLEAN_DOGFOOD`; no API, schema, customer-facing
readout, economic confidence adjustment, or contract hardening beyond
documentation-stage language is approved.

## Why Verification Volume Alone Is Insufficient

High verification volume can indicate careful review, lack of trust, confusing outputs, high workflow risk, or required compliance checks.

Low verification volume can indicate earned trust, low verification need, alternative verification pathways, or fragile overtrust. It is ambiguous until joined with risk, quality, recovery, and outcome evidence.

For that reason, verification volume alone must not become a value claim.

## Earned Trust vs Blind Trust

Earned trust appears when low or moderate verification is paired with strong quality, recovery, outcome, and low-risk context.

Blind trust appears when low verification occurs despite weak quality, poor recovery, high ambiguity, or high-risk workflow context.

The readout must remain caveated when evidence cannot distinguish these cases.

## Inputs

- Verification and feedback attribution.
- Trust Episode Boundary aggregate episode evidence after promotion by
  governance.
- Workflow risk context.
- Quality Multiplier evidence.
- Reliability Factor evidence.
- Recovery and abandonment patterns.
- Outcome Evidence when available.
- Depth dimensions related to verification, recovery, and judgment.

## Risk-Adjusted Interpretation

Trust behavior must be interpreted relative to workflow risk. A low-risk summary workflow and a high-risk regulated workflow should not share the same interpretation.

The index should explain whether evidence is calibrated, under-corroborated, undertrusted, insufficient, or suppressed.

Trust episode evidence can inform this interpretation only as aggregate context:
whether work resolved with corroboration, resolved without explicit verification,
recovered after failure, stalled after AI assistance, carried explicit negative
feedback, or lacked enough downstream evidence. The signal is promoted for later
productization review by
[V4_TRUST_EPISODE_BOUNDARY_VALIDATION_READOUT.md](../../research/V4_TRUST_EPISODE_BOUNDARY_VALIDATION_READOUT.md),
but that does not make it a person trace, trust score, citation-click metric,
standalone product readout, ROI input, or causal claim.

The product-contract proposal for this input is
[trust-episode-boundary-input.md](./trust-episode-boundary-input.md). It defines
the evidence handling sequence, customer-safe output language, and citation
requirements for any later Trust Calibration use.

## Bands

### CALIBRATED

Verification behavior appears appropriate for workflow risk and available evidence.

### UNCORROBORATED_TRUST

The cohort appears to trust AI output more than the available evidence can support.

### UNDERTRUST_OR_FRICTION

Verification or correction behavior suggests excessive friction, poor fit, or low trust.

### INSUFFICIENT_EVIDENCE

Available aggregate evidence is not enough to interpret trust behavior.

### SUPPRESSED

Fail-closed gates block interpretation. Suppressed readouts must not expose hidden values.

## Relationship to Depth

Depth supplies aggregate evidence about verification, recovery, and judgment behavior. Trust Calibration interprets those signals against workflow risk.

Depth asks whether work integration exists. Trust Calibration asks whether the trust pattern is appropriate.

Depth Repertoire may be cited only as aggregate caveat/context about
cross-surface return use. It must not assign or adjust trust bands, risk labels,
verification interpretation, surfacing eligibility, or economic interpretation
unless a later calibration decision explicitly promotes that use.

Suppressed or insufficient Depth Repertoire evidence must remain null or absent
and must not be reconstructed through trust-calibration language.

## Relationship to Defensible Value

Calibrated trust can strengthen the defensibility of a time-saved claim because it reduces the risk that saved time is coming from unreviewed or brittle output.

Uncorroborated trust or undertrust can narrow the defensibility range or require stronger caveats.

## Examples

```markdown
CALIBRATED:
Verification is moderate, recovery is strong, quality evidence is stable, and workflow risk is low to medium.

UNCORROBORATED_TRUST:
Verification is low, quality evidence is weak, recovery is limited, and workflow risk is high.

UNDERTRUST_OR_FRICTION:
Verification is high, recovery loops are common, and completion evidence is weak.
```

## Non-Capabilities

Trust Calibration does not prove output correctness.

Trust Calibration does not reward maximum verification.

Trust Calibration does not label individuals or teams.

Trust Calibration does not establish causality.

Trust Calibration does not override suppression.

Trust Calibration does not require citation clicks as proof of healthy trust.
