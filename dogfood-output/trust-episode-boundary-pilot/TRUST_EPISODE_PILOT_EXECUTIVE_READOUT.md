# Trust Episode Boundary Pilot Executive Readout

Status: `EVIDENCE_CONTEXT_ONLY`

Scope: Glean dogfood aggregate run-first sample

Window: Seven approved business days

This readout is generated from aggregate BigQuery-exported data. It does not call a backend API, persist customer telemetry, or inspect raw event rows.

## Executive Interpretation

FluencyTracr observes aggregate AI work episodes and shows where AI-assisted work resolves, recovers after friction, stalls, or lacks enough evidence for confident interpretation.

Use this as Trust Calibration context: it helps leaders see where trust loops, source coverage, recovery behavior, or outcome-readiness evidence need improvement.

This output does not identify, score, rank, or evaluate employees.

## Aggregate Episode Evidence

The export contains 88,028,657 aggregate AI work episodes.

- Work resolved with corroboration: 3,567,326 aggregate episodes (4.1%).
- Work resolved without explicit verification: 30,676,071 aggregate episodes (34.8%).
- Work recovered after friction: 15,826,000 aggregate episodes (18.0%).
- Work stalled after AI assistance: 474,414 aggregate episodes (0.5%).
- Explicit negative feedback appeared: 2 aggregate episodes (<0.1%).
- Evidence gap remains: 37,484,844 aggregate episodes (42.6%).

## Trust Calibration Context

Work recovered after friction appears in 18.0% of aggregate episodes. This is evidence that work continued after failure, pause, skip, cancellation, or other friction; it is not proof of output quality.

Work resolved without explicit verification appears in 34.8% of aggregate episodes. This can be normal in low-risk work, but it needs workflow-risk and source-coverage context before interpretation.

The evidence gap appears in 42.6% of aggregate episodes. Missing evidence must stay visible and must not be upgraded into healthy trust, poor trust, value, or causality.

## Source Coverage And Caveats

- Citation behavior is optional corroboration, not the trust anchor.
- Recovery after friction is a behavioral continuation signal, not a correctness detector.
- Approved aggregate scope, workflow labels, surface labels, and source coverage must be declared by the customer before external interpretation.
- If source coverage is incomplete or ambiguous, do not emit Trust Episode Boundary pattern values; use evidence-gap language only.

## Required Citations

- [trust-episode-boundary-input.md](../../docs/contracts/value-confidence/trust-episode-boundary-input.md)
- [V4_TRUST_EPISODE_BOUNDARY_VALIDATION_READOUT.md](../../docs/research/V4_TRUST_EPISODE_BOUNDARY_VALIDATION_READOUT.md)
- [TRUST_EPISODE_BOUNDARY_BIGQUERY_READOUT.md](../trust-episode-boundary/TRUST_EPISODE_BOUNDARY_BIGQUERY_READOUT.md)
- [TRUST_PRODUCT_EPISODE_DEDUP_BIGQUERY_READOUT.md](../trust-episode-boundary/TRUST_PRODUCT_EPISODE_DEDUP_BIGQUERY_READOUT.md)
- [TRUST_KEY_CONFIDENCE_BIGQUERY_READOUT.md](../trust-episode-boundary/TRUST_KEY_CONFIDENCE_BIGQUERY_READOUT.md)

## Non-Goals

- This is not a trust score.
- This is not a citation-click metric.
- This is not a correctness detector.
- It does not calculate ROI.
- It does not establish causality.
- It does not add canonical events.
- It does not add suppression reasons.
- It does not rank teams or managers.
- It does not produce person-level productivity metrics.
