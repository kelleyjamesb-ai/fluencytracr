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

Decision: `PASS_INTERNAL_READOUT_CONTEXT_ONLY`

Rationale: the three-window Glean dogfood run has now produced enough aggregate
evidence to carry Depth Repertoire into the AI Scale Readiness Portfolio as
internal readout context. Depth Repertoire adds useful interpretation beyond
Velocity alone by distinguishing activity volume from repeated cross-surface
repertoire.

This pass is intentionally narrow. It does not authorize runtime APIs, schemas,
customer-facing portfolio surfaces, economic output, Time-Saved Defensibility
Range productization, automated recommendations, or customer-facing claims.
Depth Repertoire may support internal intervention selection and investigation
routing only.

## Required Dogfood Evidence

The dogfood validation pass reviewed three matching 60-day windows and included:

- V3 verdict metadata,
- Velocity,
- Quality Multiplier,
- Reliability Factor,
- Depth Repertoire,
- Trust Calibration evidence where available,
- surface taxonomy and AGENT sub-surface coverage,
- data readiness gate results,
- segment coverage where safe.

The readout showed that Depth Repertoire is interpretable enough to support
internal scale-readiness context. It also showed that Trust Calibration and
Reusable Workflow Leverage remain held, so those signals must travel only as
classification caveats.

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

Harden the docs-only internal readout contract in
[scale-readiness-portfolio.md](../contracts/value-confidence/scale-readiness-portfolio.md).
The contract may define Depth Repertoire context classifications, Trust
classification caveats, Reusable Leverage classification caveats, and
investigation-routing language. It must not create runtime behavior or
customer-facing economic output.

## What Remains Blocked

- Runtime API or schema implementation.
- Customer-facing portfolio surfaces.
- Any portfolio dependency on Depth Repertoire for economic confidence.
- Time-Saved Defensibility Range productization.
- Automated recommendations.
- Any portfolio use of Glean dogfood values as thresholds, defaults,
  calibration values, or customer benchmarks.

## Open Questions

- Which readiness zones remain stable across 60-day windows?
- Does the portfolio explain something beyond usage volume and Velocity?
- Which segments are safe enough to include in the first dogfood readout?
- Can the data readiness gate prevent overinterpretation when metadata is weak?
