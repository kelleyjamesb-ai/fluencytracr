# V4 AI Scale Readiness Caveat Propagation Decision

## Purpose

This document records whether the AI Scale Readiness Portfolio can safely carry
Depth Repertoire caveats into V4 value-confidence interpretation.

It is a research decision record. It adds no APIs, schemas, Prisma migrations,
runtime services, frontend surfaces, customer-facing economic readouts, ROI
calculation, causal claim, prediction claim, individual scoring, comparative team evaluation,
comparative department evaluation, productivity measurement, or maturity label.

## Inputs Reviewed

Reviewed inputs:

- [AI Scale Readiness Portfolio concept](../concepts/AI_SCALE_READINESS_PORTFOLIO.md)
- [V4 Value Confidence Layer](../concepts/V4_VALUE_CONFIDENCE_LAYER.md)
- [Depth concept](../concepts/DEPTH.md)
- [Depth Repertoire contract](../contracts/depth/depth-repertoire.md)
- [AI Scale Readiness Portfolio contract](../contracts/value-confidence/scale-readiness-portfolio.md)
- [V4 Depth Repertoire Value Confidence Review](./V4_DEPTH_REPERTOIRE_VALUE_CONFIDENCE_REVIEW.md)
- [V4 Depth Repertoire Value Confidence Calibration Decision](./V4_DEPTH_REPERTOIRE_VALUE_CONFIDENCE_CALIBRATION_DECISION.md)

## Current Caveat State

Depth Repertoire is hardened as an aggregate Depth sub-contract, but it remains
held from V4 economic dependency. The current calibration decision records
`PROMOTE_CAVEAT_ONLY`, allowing Depth Repertoire to appear as aggregate caveat/context while still blocking economic dependency.

The AI Scale Readiness Portfolio may therefore reference Depth Repertoire only
as aggregate caveat/context until a later calibration decision explicitly
promotes economic use.

## Decision

Decision: `HOLD_FOR_60_DAY_GLEAN_DOGFOOD`

Rationale: the portfolio concept is governance-safe, but caveat propagation has
not been proven against aligned 60-day dogfood outputs. Scale readiness cannot
depend on Depth Repertoire, alter economic confidence, or support customer-facing
portfolio claims until the planned Glean dogfood run tests the full evidence set.

This hold is not a rejection. It preserves the concept while blocking premature
contract hardening and productization.

## Required Dogfood Evidence

The next validation pass must use at least three matching 60-day windows and
include:

- V3 verdict metadata,
- Velocity,
- Quality Multiplier,
- Reliability Factor,
- Depth Repertoire,
- Trust Calibration evidence where available,
- surface taxonomy and AGENT sub-surface coverage,
- data readiness gate results,
- segment coverage where safe.

The readout must show whether readiness zones are stable, interpretable, and
different from Velocity alone.

## Required Caveats

Any AI Scale Readiness artifact must state:

- Scale readiness is an aggregate action posture, not a score.
- Decision zones require business context before action.
- Depth Repertoire is approved only as aggregate caveat/context, not as an economic input.
- Suppressed slices cannot contribute portfolio totals.
- Missing metadata is an evidence gap, not low readiness.
- The portfolio does not prove ROI, causality, productivity lift, or future value.
- The portfolio must not rank people, managers, teams, departments, or customers.

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
- no team, department, manager, customer, or employee ranking,
- no customer-facing economic readout.

## Required Next Phase

Run the Glean dogfood fixed-window test and produce
[V4_GLEAN_DOGFOOD_SCALE_READINESS_READOUT.md](./V4_GLEAN_DOGFOOD_SCALE_READINESS_READOUT.md).
Then update
[V4_GLEAN_DOGFOOD_DECISION.md](./V4_GLEAN_DOGFOOD_DECISION.md)
with a promote, narrow, or hold decision.

## What Remains Blocked

- AI Scale Readiness contract hardening beyond documentation-stage language.
- Any API, schema, or customer-facing portfolio surface.
- Any portfolio dependency on Depth Repertoire for economic confidence.
- Any portfolio use of Glean dogfood values as thresholds, defaults, calibration
  values, or customer benchmarks.

## Open Questions

- Which readiness zones remain stable across 60-day windows?
- Does the portfolio explain something beyond usage volume and Velocity?
- Which segments are safe enough to include in the first dogfood readout?
- Can the data readiness gate prevent overinterpretation when metadata is weak?
