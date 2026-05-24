# V4 Glean Dogfood Decision

## Purpose

This document records the promotion or hold decision for the V4 Scale Readiness
to Economic Value plan after internal Glean dogfood.

Current decision: `HOLD_FOR_60_DAY_GLEAN_DOGFOOD`

This is a research decision record. It adds no APIs, schemas, Prisma
migrations, runtime services, frontend surfaces, customer-facing economic
readouts, ROI calculation, causal claim, prediction claim, individual scoring,
comparative team evaluation, comparative department evaluation, productivity measurement, or maturity label.

## Inputs Reviewed

Current inputs:

- [AI Scale Readiness Portfolio concept](../concepts/AI_SCALE_READINESS_PORTFOLIO.md)
- [Organizational Segmentation concept](../concepts/ORG_SEGMENTATION.md)
- [Economic Impact Bridge concept](../concepts/ECONOMIC_IMPACT_BRIDGE.md)
- [V4 Scale Readiness Caveat Propagation Decision](./V4_SCALE_READINESS_CAVEAT_PROPAGATION_DECISION.md)
- [V4 Trust Calibration Caveat Propagation Decision](./V4_TRUST_CALIBRATION_CAVEAT_PROPAGATION_DECISION.md)
- [V4 Depth Repertoire Value Confidence Calibration Decision](./V4_DEPTH_REPERTOIRE_VALUE_CONFIDENCE_CALIBRATION_DECISION.md)

Missing inputs:

- three aligned 60-day Glean dogfood windows,
- same-key Velocity outputs,
- same-key Quality Multiplier outputs,
- same-key Reliability Factor outputs,
- same-key V3 verdict metadata,
- same-key Depth Repertoire outputs,
- Trust Calibration join coverage,
- safe segmentation coverage,
- data readiness gate output,
- customer-attested aggregate Outcome Evidence where available.

## Decision Options

Allowed future decisions:

- `PROMOTE_V4_CONTRACT_HARDENING`
- `PROMOTE_AI_SCALE_READINESS_ONLY`
- `PROMOTE_DEPTH_REPERTOIRE_ONLY`
- `HOLD_FOR_MORE_WINDOWS`
- `HOLD_FOR_SEGMENT_COVERAGE`
- `HOLD_FOR_SIGNAL_REFINEMENT`
- `HOLD_FOR_ECONOMIC_BRIDGE`
- `REJECT_CURRENT_V4_READOUT`

## Current Decision

Decision: `HOLD_FOR_60_DAY_GLEAN_DOGFOOD`

Rationale: the concept and governance boundaries are now defined, but the
required dogfood evidence has not been generated. The current Depth Repertoire
calibration decision also remains `HOLD_FOR_MORE_CALIBRATION`, so V4 economic
readouts must not depend on Depth Repertoire until the aligned 60-day test is
complete and a later decision explicitly promotes that use.

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

Run the Glean dogfood fixed-window test:

| Window | Start | End |
| --- | --- | --- |
| 1 | 2026-03-23 | 2026-05-22 |
| 2 | 2026-02-21 | 2026-04-22 |
| 3 | 2026-01-22 | 2026-03-23 |

Then update
[V4_GLEAN_DOGFOOD_SCALE_READINESS_READOUT.md](./V4_GLEAN_DOGFOOD_SCALE_READINESS_READOUT.md)
and replace this hold with one of the allowed future decisions.

## Governance Safety Review

This hold preserves:

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
- no customer-facing economic readout,
- no Glean dogfood value as a threshold, default, calibration value, or customer benchmark.

## What Remains Blocked

Blocked while this decision remains a hold:

- V4 contract hardening beyond existing documentation-stage contracts,
- V4 economic APIs,
- customer-facing V4 readouts,
- AI Scale Readiness product surfaces,
- Organizational Segmentation runtime support,
- Economic Impact Bridge runtime support,
- Time-Saved Defensibility Range productization,
- automated recommendations,
- ROI range engine.

## Open Questions

- Which segment families have enough coverage for dogfood?
- Does Trust Calibration add interpretation beyond Reliability Factor?
- Does Depth Repertoire remain useful when aligned to 60-day value-confidence windows?
- Which readiness zone language is most useful for AIOM action planning?
- Should any economic bridge output remain internal-only even after dogfood?
