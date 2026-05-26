# V4 Closeout Decision

## Purpose

This document is the final closeout decision for the current V4 dogfood phase.
It records what is promoted, what remains held, and what remains blocked before
any customer-facing economic output can be built.

Current decision: `PROMOTE_INTERNAL_SCALE_READINESS_READOUT`

This is a research and governance decision. It adds no APIs, schemas, Prisma
migrations, runtime services, frontend surfaces, customer-facing economic
readouts, ROI calculation, causal claim, prediction claim, individual scoring,
comparative team evaluation, comparative department evaluation, productivity
measurement, or maturity label.

## Inputs Reviewed

The decision reviewed:

- [AI Scale Readiness Portfolio concept](../concepts/AI_SCALE_READINESS_PORTFOLIO.md)
- [Organizational Segmentation concept](../concepts/ORG_SEGMENTATION.md)
- [Economic Impact Bridge concept](../concepts/ECONOMIC_IMPACT_BRIDGE.md)
- [V4 Glean Dogfood Scale Readiness Readout](./V4_GLEAN_DOGFOOD_SCALE_READINESS_READOUT.md)
- [V4 Glean Dogfood Decision](./V4_GLEAN_DOGFOOD_DECISION.md)
- [V4 Scale Readiness Caveat Propagation Decision](./V4_SCALE_READINESS_CAVEAT_PROPAGATION_DECISION.md)
- [V4 Trust Calibration Caveat Propagation Decision](./V4_TRUST_CALIBRATION_CAVEAT_PROPAGATION_DECISION.md)
- [V4 Research Export Bundle](../../dogfood-output/V4_RESEARCH_EXPORTS.md)
- [V4 Behavior Cohort Promotion Decision](./V4_BEHAVIOR_COHORT_PROMOTION_DECISION.md)

The dogfood evidence includes three fixed 60-day windows for Depth Repertoire,
same-window value-realization context, trust-signal availability probes,
AGENT feedback availability, and Skill Read Evidence availability.

## Promoted Scope

The promoted V4 scope is intentionally narrow.

Promoted:

- AI Scale Readiness internal readout shape.
- Depth Repertoire as aggregate context for action posture selection.
- Velocity and Depth Repertoire as internal aggregate behavior-cohort axes.
- Economic Impact Bridge language for value-investigation routing only.
- Docs-only internal contract hardening for the promoted readout boundary.

Allowed interpretation:

- where aggregate evidence suggests scale,
- where enablement may be useful,
- where workflow redesign may be needed,
- where trust calibration requires more evidence,
- where adoption expansion is plausible,
- where evidence is too weak and should remain held,
- where an economic value investigation may be warranted.

## Held Scope

Held:

- Trust Calibration as a governed readout.
- Skill Read Evidence as a governed reusable-leverage signal.
- Skill Read presence as a standalone promoted behavior-cohort axis.
- AGENT delegation as a standalone promoted behavior-cohort axis.
- Reusable Workflow Propagation and Named Workflow Leverage.
- Organizational Segmentation runtime support.
- Customer-facing V4 economic output.

Trust and Skill Read Evidence are not discarded. They are available as research
evidence paths, but they have not crossed the governance boundary needed for
customer-facing interpretation.

Trust remains held because verification and feedback volume exists, but parent
attribution is not yet strict enough. Trust signals must join to one governed
parent surface before they can shape trust interpretation.

Skill Read Evidence remains held because aggregate usage is observable in agent
span logs, but governed identity, versioning, invocation mode, UGC coverage,
plugin/MCP coverage, and personal/shared/org Skill separation are not yet
validated. Raw skill names must not enter V4 outputs.

## Blocked Scope

Blocked until a later decision explicitly promotes the exact scope:

- V4 economic APIs.
- Customer-facing V4 readouts.
- AI Scale Readiness product surfaces.
- Organizational Segmentation runtime support.
- Economic Impact Bridge runtime support beyond investigation-routing language.
- Trust Calibration product output.
- Reusable leverage product output.
- Time-Saved Defensibility Range productization.
- Automated recommendations.
- Dollarized economic output.

## What This Means

V4 can now close the current dogfood phase with a defensible landing point:

> FluencyTracr can use aggregate behavioral evidence to identify where internal
> Glean AI Scale Readiness appears strong, shallow, frictioned, trust-held,
> expansion-ready, or insufficient.

That is not yet a customer-facing economic product. It is an internal decision
system for value-realization planning and for selecting where deeper economic
investigation is warranted.

## Required Next Phase

The next phase should not broaden V4. The internal operating process is defined
in [V4_INTERNAL_READOUT_RUNBOOK.md](./V4_INTERNAL_READOUT_RUNBOOK.md), with a
tracked rehearsal in [V4_INTERNAL_READOUT_REHEARSAL.md](./V4_INTERNAL_READOUT_REHEARSAL.md).
The first numbers-backed local rehearsal is recorded in
[V4_FULL_DOGFOOD_REHEARSAL_READOUT.md](./V4_FULL_DOGFOOD_REHEARSAL_READOUT.md).
The behavior cohort classification pass is recorded in
[V4_BEHAVIOR_COHORT_CLASSIFICATION_READOUT.md](./V4_BEHAVIOR_COHORT_CLASSIFICATION_READOUT.md),
the current data-analysis stopping point is recorded in
[V4_DATA_ANALYSIS_CLOSEOUT.md](./V4_DATA_ANALYSIS_CLOSEOUT.md), and the
promotion decision for the current cohort axes is recorded in
[V4_BEHAVIOR_COHORT_PROMOTION_DECISION.md](./V4_BEHAVIOR_COHORT_PROMOTION_DECISION.md).

After that process is complete, choose one of four paths:

1. Harden the internal AI Scale Readiness readout contract only.
2. Run strict parent-attribution refinement for trust and verification signals
   using [V4_TRUST_ATTRIBUTION_METHOD.md](./V4_TRUST_ATTRIBUTION_METHOD.md).
   The first fixed-window test is recorded in
   [V4_TRUST_ATTRIBUTION_TEST_READOUT.md](./V4_TRUST_ATTRIBUTION_TEST_READOUT.md)
   and narrows the next trust phase to strict/session-attributable signals.
3. Run the internal Glean-wide portfolio readout with Velocity and Depth
   Repertoire as promoted behavior-cohort axes. Carry AGENT delegation and
   skill-read presence as context only; org metadata segments remain held until
   an approved aggregate join exists.
4. Validate Skill Read Evidence identity and join coverage without emitting raw
   skill names.

Customer-facing economic output should wait until at least one later decision
promotes a specific economic boundary and defines the exact aggregate fields,
caveats, and blocked claims.

## Governance Safety Review

This closeout preserves:

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
- no comparative evaluation of teams, departments, managers, customers, or
  employees,
- no customer-facing economic readout,
- no Glean dogfood value as a threshold, default, calibration value, or
  customer benchmark.

## Final Decision

Decision: `PROMOTE_INTERNAL_SCALE_READINESS_READOUT`

The promoted artifact is the internal AI Scale Readiness readout shape with
Depth Repertoire context, Velocity and Depth Repertoire behavior-cohort axes,
and Economic Impact Bridge investigation-routing language.

Trust Calibration, Reusable Leverage, Skill Read Evidence as a governed signal,
Organizational Segmentation runtime support, and customer-facing economic output
remain held or blocked until later governance decisions promote those exact
scopes.
