# V4 Glean Dogfood Decision

## Purpose

This document records the promotion or hold decision for the V4 Scale Readiness
to Economic Value plan after internal Glean dogfood.

Current decision: `PROMOTE_AI_SCALE_READINESS_WITH_DEPTH_REPERTOIRE_CONTEXT`

This is a research decision record. It adds no APIs, schemas, Prisma
migrations, runtime services, frontend surfaces, customer-facing economic
readouts, ROI calculation, causal claim, prediction claim, individual scoring,
comparative team evaluation, comparative department evaluation, productivity measurement, or maturity label.

API, schema, or contract work is not categorically prohibited forever. It is
blocked by default during dogfood research and may begin only if this decision
explicitly promotes a narrow scope that requires it.

## Inputs Reviewed

Current inputs:

- [AI Scale Readiness Portfolio concept](../concepts/AI_SCALE_READINESS_PORTFOLIO.md)
- [Organizational Segmentation concept](../concepts/ORG_SEGMENTATION.md)
- [Economic Impact Bridge concept](../concepts/ECONOMIC_IMPACT_BRIDGE.md)
- [V4 Scale Readiness Caveat Propagation Decision](./V4_SCALE_READINESS_CAVEAT_PROPAGATION_DECISION.md)
- [V4 Trust Calibration Caveat Propagation Decision](./V4_TRUST_CALIBRATION_CAVEAT_PROPAGATION_DECISION.md)
- [V4 Depth Repertoire Value Confidence Calibration Decision](./V4_DEPTH_REPERTOIRE_VALUE_CONFIDENCE_CALIBRATION_DECISION.md)
- [V4 Glean Dogfood Scale Readiness Readout](./V4_GLEAN_DOGFOOD_SCALE_READINESS_READOUT.md)

Inputs reviewed from the dogfood run:

- three fixed 60-day Glean dogfood windows,
- same-window Velocity outputs,
- same-window Quality Multiplier and Reliability Factor inputs,
- same-window Depth Repertoire outputs,
- trust-signal availability probes,
- AGENT feedback availability probe,
- reusable leverage and Skill Read Evidence status.

Remaining missing or held inputs:

- strict Trust Calibration parent attribution,
- governed reusable leverage identity and join coverage,
- safe organizational segmentation coverage,
- customer-attested aggregate Outcome Evidence.

## Decision Options

Allowed future decisions:

- `PROMOTE_V4_CONTRACT_HARDENING`
- `PROMOTE_AI_SCALE_READINESS_WITH_DEPTH_REPERTOIRE_CONTEXT`
- `PROMOTE_AI_SCALE_READINESS_ONLY`
- `PROMOTE_DEPTH_REPERTOIRE_ONLY`
- `PROMOTE_ECONOMIC_BRIDGE_INVESTIGATION_ROUTING_ONLY`
- `HOLD_FOR_MORE_WINDOWS`
- `HOLD_FOR_SEGMENT_COVERAGE`
- `HOLD_FOR_SIGNAL_REFINEMENT`
- `HOLD_FOR_ECONOMIC_BRIDGE`
- `REJECT_CURRENT_V4_READOUT`

## Current Decision

Decision: `PROMOTE_AI_SCALE_READINESS_WITH_DEPTH_REPERTOIRE_CONTEXT`

Rationale: the three-window dogfood run shows that AI Scale Readiness is useful
as an internal decision model when Depth Repertoire is carried as the primary
work-integration context. Depth Repertoire adds interpretation beyond Velocity
alone by distinguishing activity volume from repeated cross-surface repertoire.

This decision does not promote full V4 contract hardening. It promotes the
readout shape for internal Glean dogfood and value-realization planning only.
Depth Repertoire may guide intervention selection and candidate value
investigation, but it must not generate economic values, alter confidence bands,
override suppression, or become a customer-facing economic readout.

Supporting decisions:

- Depth Repertoire: `PROMOTE_SCALE_READINESS_CONTEXT`
- Trust Calibration: `HOLD_FOR_ATTRIBUTION_REFINEMENT`
- Reusable Workflow Leverage: `HOLD_FOR_GOVERNED_IDENTITY_AND_JOIN_COVERAGE`
- Economic Impact Bridge: `PROMOTE_INVESTIGATION_ROUTING_ONLY`

## Decision Criteria For Promotion

A later update may promote only if the dogfood readout shows:

- readiness zones are stable across 60-day windows,
- Depth Repertoire explains something beyond Velocity alone,
- segmentation reveals actionable aggregate differences without ranking,
- the data readiness gate prevents overinterpretation,
- trust and verification signals are usable or correctly held,
- reusable leverage is observable or correctly held,
- the Economic Impact Bridge identifies value investigations without ROI claims,
- all outputs remain aggregate-only,
- suppressed slices expose no reconstructed values.

## Required Next Phase

Create a narrow internal readout contract for AI Scale Readiness with Depth
Repertoire context. The contract should define the decision shape, caveats,
classification states, and blocked claims. It should not add runtime behavior
unless a later implementation PR explicitly promotes the smallest necessary API
or schema surface.

Parallel research can continue on:

- trust-signal parent attribution,
- Skill Read Evidence availability,
- governed reusable leverage identity and join coverage,
- safe organizational segmentation coverage.

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
- no comparative evaluation of teams, departments, managers, customers, or employees,
- no customer-facing economic readout,
- no Glean dogfood value as a threshold, default, calibration value, or customer benchmark.

## What Remains Blocked

Still blocked:

- full V4 contract hardening,
- V4 economic APIs,
- customer-facing V4 readouts,
- AI Scale Readiness product surfaces,
- Organizational Segmentation runtime support,
- Economic Impact Bridge runtime support beyond investigation routing language,
- Time-Saved Defensibility Range productization,
- automated recommendations,
- ROI range engine.

Allowed next:

- docs-only AI Scale Readiness readout contract hardening for the internal
  decision shape,
- docs-only Economic Bridge investigation-routing shape,
- dogfood/research SQL for trust, Skill Read Evidence, and reusable leverage
  attribution.

## Open Questions

- Which segment families have enough coverage for dogfood?
- Does Trust Calibration add interpretation beyond Reliability Factor?
- Does Depth Repertoire remain useful when aligned to 60-day value-confidence windows?
- Does Depth Repertoire support intervention selection before it supports any
  economic readout?
- Which readiness zone language is most useful for AIOM action planning?
- Should any economic bridge output remain internal-only even after dogfood?
