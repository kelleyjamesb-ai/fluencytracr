# V4 Depth Repertoire Value Confidence Review

## Purpose

This review records whether the hardened Depth Repertoire contract may be used
as an input to V4 value-confidence or economic readouts.

It follows the Depth Repertoire stability readout and contract-hardening work.
It is a governance decision record, not an implementation. It adds no APIs,
schemas, Prisma migrations, runtime services, frontend surfaces, economic
readout engine, ROI calculation, causal claim, prediction claim, individual
scoring, team comparison, productivity scoring, or prohibited maturity label.

## Inputs Reviewed

Reviewed inputs:

- [V4_DEPTH_REPERTOIRE_STABILITY_READOUT.md](./V4_DEPTH_REPERTOIRE_STABILITY_READOUT.md)
- [depth-repertoire.md](../contracts/depth/depth-repertoire.md)
- [DEPTH.md](../concepts/DEPTH.md)
- [VELOCITY.md](../concepts/VELOCITY.md)
- [V4_VALUE_CONFIDENCE_LAYER.md](../concepts/V4_VALUE_CONFIDENCE_LAYER.md)
- [Value Confidence contract](../contracts/value-confidence/README.md)
- [V4_SIGNAL_VALIDATION_GATE.md](./V4_SIGNAL_VALIDATION_GATE.md)
- [SIGNAL_PROMOTION_CRITERIA.md](./SIGNAL_PROMOTION_CRITERIA.md)

Evidence reviewed:

- Three fixed-window Depth Repertoire exports in
  `dogfood-output/v4-depth-repertoire/`.
- Stable p90/p99 Depth Repertoire shape across the three scio-prod windows.
- Stable bucket medians separating single-surface use from broader repeated
  surface use.
- Existing Value Confidence contract boundaries.

## Decision

Decision: `HOLD_FOR_VALUE_CONFIDENCE_CALIBRATION`

Depth Repertoire is approved for contract hardening only. It is not yet approved
as an input to V4 economic readouts, Time-Saved Defensibility Range, AI Value
Leakage Map, AI Scale Readiness Portfolio, Trust Calibration Index, or any
customer-facing economic artifact.

This hold is not a rejection of Depth Repertoire. It is a boundary between a
stable behavioral signal and an economic dependency.

## Why Economics Remain Blocked

Depth Repertoire now shows stable dogfood behavior, but value-confidence use
requires a different proof standard.

The stability evidence answers:

> Does this behavioral signal repeat across fixed windows?

It does not yet answer:

> How should this behavioral signal change the defensibility of an economic
> claim?

That second question requires calibration against value-confidence artifacts,
claim caveats, suppressed-readout behavior, and interaction with Velocity,
Quality Multiplier, Reliability Factor, and Outcome Evidence.

## What Depth Repertoire Can Inform Now

Depth Repertoire can inform research and contract language about:

- whether AI use spans multiple governed surfaces,
- whether use returns to those surfaces repeatedly,
- whether broad Depth should rely on a non-saturated spine,
- whether future Depth readouts should preserve surface repertoire and repeat
  use as visible components,
- whether a cohort shows cross-surface return-use evidence.

This is behavioral evidence. It is not economic evidence by itself.

## What Depth Repertoire Cannot Do Yet

Depth Repertoire cannot yet:

- adjust a time-saved estimate,
- produce an economic range,
- increase or decrease confidence bands in a customer-facing artifact,
- rescue suppressed evidence,
- override existing fail-closed gates,
- create a customer benchmark,
- become a product threshold, calibration value, schema default, or universal
  target.

## Required Evidence Before Economic Use

Before Depth Repertoire may feed any V4 economic artifact, a later review must
show:

- how Depth Repertoire interacts with the full Velocity Index,
- whether it adds interpretation beyond Velocity breadth and usage intensity,
- how it affects confidence bands without creating hidden thresholds,
- how suppressed Depth Repertoire behaves in each economic readout type,
- how it combines with Quality Multiplier and Reliability Factor without double
  counting evidence,
- how required caveats propagate to downstream readouts,
- whether held-out or customer-side aggregate evidence supports the same
  interpretation.

No Glean dogfood value may become a universal threshold, calibration value,
contract default, schema default, or customer benchmark.

## Governance Safety Review

This review preserves the nine invariants:

- No new canonical events.
- No new suppression reasons.
- No tunable thresholds.
- No admin overrides.
- No person-level fields or individual scoring.
- Default suppression remains unchanged.
- Latency remains corroborative only.
- Assurance Harness expectations remain unchanged.
- Per-slice independence remains unchanged.

This review also preserves the V4 value-confidence boundary:

- no ROI calculation,
- no causal productivity claim,
- no prediction claim,
- no customer-facing economic readout,
- no team, department, manager, customer, or employee comparison,
- no prohibited maturity label,
- no reconstruction of suppressed values.

## Required Next Phase

The next phase is a value-confidence calibration plan, not an implementation.

That plan should define how to test whether Depth Repertoire can safely affect:

- confidence bands,
- required caveats,
- blocked claims,
- suppression behavior,
- interaction with Velocity, Quality Multiplier, Reliability Factor, and Outcome
  Evidence.

Only after that calibration review promotes the dependency should any economic
contract or runtime work begin.

## What Remains Blocked

The following remain blocked:

- Time-Saved Defensibility Range dependency on Depth Repertoire.
- AI Value Leakage Map dependency on Depth Repertoire.
- AI Scale Readiness Portfolio dependency on Depth Repertoire.
- Trust Calibration Index dependency on Depth Repertoire.
- Any V4 economic API using Depth Repertoire.
- Any customer-facing economic readout using Depth Repertoire.
- Any schema or runtime default derived from Glean dogfood values.

## Open Questions

- What calibration evidence is sufficient to let Depth Repertoire affect a
  confidence band?
- Should Depth Repertoire only change caveats, or can it eventually affect
  readout eligibility?
- How should Depth Repertoire interact with Velocity when both include surface
  breadth signals?
- Does customer-side aggregate evidence show the same stable shape as
  scio-prod?
- Which economic artifact, if any, is the safest first dependency to test?
