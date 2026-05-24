# V4 Glean Dogfood Scale Readiness Readout

## Purpose

This document is the internal Glean dogfood readout for the V4 Scale Readiness
to Economic Value plan.

Current status: `TEMPLATE_AWAITING_60_DAY_EXPORTS`

The readout is not customer-facing. It adds no runtime behavior, APIs, schemas,
Prisma migrations, frontend surfaces, ROI calculation, causal claim, prediction
claim, individual scoring, comparative team evaluation, comparative department evaluation, productivity
scoring, or maturity label.

## Inputs Reviewed

Required inputs are not yet attached.

The planned dogfood run should use three 60-day-compliant windows:

| Window | Start | End |
| --- | --- | --- |
| 1 | 2026-03-23 | 2026-05-22 |
| 2 | 2026-02-21 | 2026-04-22 |
| 3 | 2026-01-22 | 2026-03-23 |

Each window should include aggregate-only outputs for:

- V1 behavior signals,
- V2 Velocity,
- surface taxonomy,
- AGENT sub-surfaces,
- Depth Repertoire,
- Quality Multiplier,
- Reliability Factor,
- Trust Calibration evidence,
- reusable leverage where observable,
- organizational segments where safe,
- data readiness gate results.

## Data Readiness Status

Current status: `NOT_RUN`

The readout must report:

- surface coverage,
- segment coverage,
- verification signal availability,
- AGENT metadata availability,
- reusable workflow observability,
- suppression rate,
- window stability,
- HR or directory metadata availability,
- unresolved joins.

Missing evidence must be treated as a data readiness gap, not low readiness.

## Overall Glean AI Scale Readiness Portfolio

Current status: `NOT_RUN`

The final dogfood readout should summarize aggregate readiness zones:

- Ready To Scale,
- Enablement Opportunity,
- Workflow Design Opportunity,
- Trust Calibration Opportunity,
- Adoption Expansion Opportunity,
- Hold / Insufficient Evidence.

No zone may appear for a suppressed slice.

## Surface-Level Readiness

Current status: `NOT_RUN`

The readout should evaluate each governed surface independently before any
portfolio summary is produced. Workflow surfaces, standalone surfaces, and AGENT
sub-surfaces should remain separately visible.

## Segment-Level Readiness Where Safe

Current status: `NOT_RUN`

Preferred first-pass segments:

- tenure cohort,
- Velocity band,
- Depth Repertoire band.

Department, function, role family, level band, manager/IC, and region should
remain held unless an approved aggregate organization-data join is available.

Segments are intervention contexts, not performance groups.

## Depth Repertoire vs Velocity Interpretation

Current status: `NOT_RUN`

The readout must answer:

> Does Depth Repertoire explain something Velocity alone does not?

Because the current value-confidence calibration decision is
`HOLD_FOR_MORE_CALIBRATION`, Depth Repertoire may appear only as research
context or caveat language until a later decision explicitly promotes economic
use.

## Trust Calibration Findings

Current status: `NOT_RUN`

The readout should report whether verification, feedback, recovery, and quality
signals are sufficient to distinguish calibrated trust from under-corroborated
trust or friction. It must not reward maximum verification.

## Reusable Leverage Status

Current status: `HOLD`

Reusable Workflow Propagation and Named Workflow Leverage remain held unless
metadata observability is resolved. This readout must not claim reusable
workflows are absent when the safer conclusion is that observability is
incomplete.

## Economic Impact Bridge Findings

Current status: `NOT_RUN`

The readout should map readiness patterns to economic questions only:

- Which workflows may warrant value investigation?
- Where could friction consume capacity?
- Where could weak trust behavior undermine a value claim?
- Where may low adoption in a high-value function indicate unrealized value?

It must not calculate ROI, prove causality, or produce guaranteed savings.

## Evidence Gaps

Known gaps before the run:

- aligned 60-day Depth Repertoire x Velocity x Quality Multiplier x Reliability
  Factor calibration is missing,
- customer-attested aggregate Outcome Evidence is not attached,
- organization metadata join availability is unknown,
- reusable workflow metadata remains unresolved unless later diagnostics promote it.

## Recommended Enablement Actions

Current status: `NOT_RUN`

Final recommendations should use action language:

- scale playbooks,
- coach and train,
- redesign workflow,
- reinforce trust behavior,
- expand surface repertoire,
- hold for evidence.

Recommendations must not rank people, managers, teams, departments, or
customers.

## What Remains Blocked

Blocked until the dogfood decision promotes:

- AI Scale Readiness contract hardening,
- Organizational Segmentation aggregate contract,
- Economic Impact Bridge contract,
- Trust Calibration product work,
- V4 economic APIs,
- customer-facing V4 readouts,
- Time-Saved Defensibility Range productization,
- automated recommendations,
- ROI range engine.

## Required Next Step

Run the three 60-day-compliant Glean dogfood exports and update this readout
with observed aggregate findings. Then complete
[V4_GLEAN_DOGFOOD_DECISION.md](./V4_GLEAN_DOGFOOD_DECISION.md).
