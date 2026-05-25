# V4 Trust Calibration Caveat Propagation Decision

## Purpose

This document records whether the Trust Calibration Index can safely carry
Depth Repertoire and value-confidence caveats into V4 interpretation.

It is a research decision record. It adds no APIs, schemas, Prisma migrations,
runtime services, frontend surfaces, customer-facing economic readouts, ROI
calculation, causal claim, prediction claim, individual scoring, comparative team evaluation,
comparative department evaluation, productivity measurement, or maturity label.

## Inputs Reviewed

Reviewed inputs:

- [Trust Calibration Index contract](../contracts/value-confidence/trust-calibration-index.md)
- [V4 Value Confidence Layer](../concepts/V4_VALUE_CONFIDENCE_LAYER.md)
- [Depth concept](../concepts/DEPTH.md)
- [Delegation Depth concept](../concepts/DELEGATION_DEPTH.md)
- [Surface Taxonomy](../concepts/SURFACES.md)
- [V4 Depth Repertoire Value Confidence Review](./V4_DEPTH_REPERTOIRE_VALUE_CONFIDENCE_REVIEW.md)
- [V4 Depth Repertoire Value Confidence Calibration Decision](./V4_DEPTH_REPERTOIRE_VALUE_CONFIDENCE_CALIBRATION_DECISION.md)

## Current Caveat State

Trust Calibration can interpret verification, feedback, recovery, quality, and
workflow-risk context only when those signals are joined to parent surfaces and
remain aggregate.

Depth Repertoire may inform research language about cross-surface return use,
but it is not approved as a V4 economic input while the calibration decision
records `PROMOTE_CAVEAT_ONLY`. Trust Calibration may cite Depth Repertoire only as aggregate caveat/context and must not use it to modify bands, determine eligibility, or support customer-facing economic claims.

## Decision

Decision: `HOLD_FOR_ATTRIBUTION_REFINEMENT`

Rationale: the aligned 60-day dogfood outputs show that verification and
feedback signals exist, including chat citation activity, answer votes, summary
votes, search feedback, chat feedback, and AGENT-related explicit feedback.
However, parent attribution is not yet strict enough to promote Trust
Calibration as a governed readout. Signals must join to exactly one governed
parent surface before they can shape trust interpretation.

## Required Dogfood Evidence

The next validation pass must show:

- verification and feedback signal availability,
- parent-surface join coverage,
- surface-level verification rates where safe,
- quality and recovery context,
- risk-context availability or explicit absence,
- suppression behavior for weak or small slices,
- whether trust findings change interpretation beyond Quality Multiplier and
  Reliability Factor alone.

## Required Caveats

Any Trust Calibration artifact must state:

- Trust Calibration does not prove output correctness.
- More verification is not automatically better.
- Low verification is ambiguous without workflow risk and quality context.
- Verification signals must enrich parent surfaces, not become standalone
  surface volume.
- Depth Repertoire is approved only as aggregate caveat/context, not as an
  economic input.
- Suppressed slices cannot expose hidden values.
- The index must not rank people, managers, teams, departments, or customers.

## Governance Safety Review

This decision preserves:

- no new canonical events,
- no new suppression reasons,
- no tunable thresholds,
- no admin overrides,
- no individual scoring,
- fail-closed suppression,
- latency as corroborative only,
- per-slice independence,
- no ROI calculation,
- no prediction claim,
- no causal productivity claim,
- no maximum-verification incentive,
- no team, department, manager, customer, or employee ranking.

## Required Next Phase

Run a strict parent-attribution refinement pass for the trust and verification
signals already observed in the Glean dogfood run. The next pass should prove
join coverage by parent surface and continue to emit aggregate-only results.
Use [V4_TRUST_ATTRIBUTION_METHOD.md](./V4_TRUST_ATTRIBUTION_METHOD.md) as the
governing method for attribution tiers and promotion boundaries.
Then update
[V4_GLEAN_DOGFOOD_DECISION.md](./V4_GLEAN_DOGFOOD_DECISION.md)
with a promote, narrow, or continued hold decision.

## What Remains Blocked

- Trust Calibration product API or schema work.
- Customer-facing trust index output.
- Economic confidence changes based on Trust Calibration.
- Any dependency on Depth Repertoire for economic confidence.

## Open Questions

- Which verification signals are sufficiently populated in 60-day windows?
- Can workflow risk context be represented without customer-specific policy data?
- Does Trust Calibration add interpretation beyond Reliability Factor?
- Which surfaces should remain held because verification join coverage is weak?
