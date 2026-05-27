# V4 Canonical Contract Decision

## Purpose

This document closes the current V4 measurement-build sprint and records what
may move toward canonical contract hardening. It reconciles the V4 dogfood
readouts, behavior-cohort promotion, support outcome context, support join-key
test, Time-Saved Defensibility gate, and Economic Hypothesis Map.

Current decision:

`PROMOTE_INTERNAL_READOUT_CONTRACT_HARDENING`

Also:

`HOLD_CUSTOMER_FACING_ECONOMIC_OUTPUT`

This is a research and governance decision. It adds no APIs, schemas, Prisma
migrations, runtime services, frontend surfaces, customer-facing economic
readouts, ROI calculation, causal claim, prediction claim, individual scoring,
comparative team evaluation, comparative department evaluation, productivity
measurement, maturity label, automated recommendation, or new canonical event.

## Inputs Reviewed

The decision reviewed the current V4 evidence chain:

- [V4 Closeout Decision](./V4_CLOSEOUT_DECISION.md)
- [V4 Glean Dogfood Decision](./V4_GLEAN_DOGFOOD_DECISION.md)
- [V4 Behavior Cohort Promotion Decision](./V4_BEHAVIOR_COHORT_PROMOTION_DECISION.md)
- [V4 Measurement Build Plan](./V4_MEASUREMENT_BUILD_PLAN.md)
- [V4 Next Sprint Plan](./V4_NEXT_SPRINT_PLAN.md)
- [V4 Value Hypothesis Map](./V4_VALUE_HYPOTHESIS_MAP.md)
- [V4 Support Outcome Join Test Readout](./V4_SUPPORT_OUTCOME_JOIN_TEST_READOUT.md)
- [V4 Support Join-Key Test Readout](./V4_SUPPORT_JOIN_KEY_TEST_READOUT.md)
- [V4 Time-Saved Defensibility Test Plan](./V4_TIME_SAVED_DEFENSIBILITY_TEST_PLAN.md)
- [V4 Segment Overlay Test Plan](./V4_SEGMENT_OVERLAY_TEST_PLAN.md)
- [V4 Intervention Tracking Research Design](./V4_INTERVENTION_TRACKING_RESEARCH_DESIGN.md)
- [V4 Outcome Join Test Plan](./V4_OUTCOME_JOIN_TEST_PLAN.md)
- [V4 Outcome Source Inventory Readout](./V4_OUTCOME_SOURCE_INVENTORY_READOUT.md)

The reviewed saved-data path includes three fixed 60-day windows for Velocity,
Depth Repertoire, readout zones, behavior-cohort overlays, and support outcome
context. It also includes saved aggregate fixtures for outcome-join readiness,
support join-key testing, and Time-Saved Defensibility blocking behavior.

## Decision Summary

The current V4 work is strong enough to harden the internal readout contract
shape. It is not strong enough to harden customer-facing economic output.

Promote:

| Scope | Decision | Allowed use |
| --- | --- | --- |
| AI Scale Readiness internal readout | `PROMOTE_INTERNAL_READOUT_CONTRACT_HARDENING` | Contract hardening for internal action-posture readouts. |
| Velocity x Depth behavior cohorts | `PROMOTE_DEPTH_AND_VELOCITY_BEHAVIOR_COHORT_AXES` | Internal aggregate behavior-cohort axes. |
| Depth Repertoire contract | `PROMOTE_DEPTH_REPERTOIRE_CONTRACT_HARDENING` | Depth signal contract hardening. |
| Depth Repertoire in value confidence | `PROMOTE_CAVEAT_ONLY` | Aggregate context and caveat; no economic dependency. |
| Economic Hypothesis Map | `PROMOTE_ECONOMIC_BRIDGE_INVESTIGATION_ROUTING` | Non-dollarized value-investigation routing. |
| Time-Saved Defensibility | `PROMOTE_TSDR_RESEARCH_GATE` | Gate that explains why range output is ready or blocked. |
| Support outcome context | `PROMOTE_SUPPORT_OUTCOME_CONTEXT_JOIN` | Same-window outcome context for value investigation. |
| Support join-key requirements | `PROMOTE_SUPPORT_JOIN_KEY_REQUIREMENTS` | Requirements for later attribution work. |

Hold:

| Scope | Decision | Why held |
| --- | --- | --- |
| Customer-facing economic output | `HOLD_CUSTOMER_FACING_ECONOMIC_OUTPUT` | Evidence supports investigation routing, not external economic claims. |
| Time-Saved range output | `HOLD_TSDR_RANGE_OUTPUT` | Raw time-saved claim, customer-owned assumptions, attribution, and causal design are missing or held. |
| Support behavior attribution | `HOLD_SUPPORT_BEHAVIOR_ATTRIBUTION` | No approved aggregate join key connects behavior cohorts to support outcomes. |
| Trust Calibration | `HOLD_FOR_ATTRIBUTION_REFINEMENT` | Parent attribution is not strict enough for governed readout use. |
| Skill Read Evidence | `HOLD_FOR_GOVERNED_IDENTITY_AND_JOIN_COVERAGE` | Usage is observable, but identity, versioning, invocation mode, and personal/shared/org separation are not governed. |
| Reusable Workflow Propagation | `HOLD` | Named/reusable leverage remains unresolved as a governed signal. |
| Organizational Segmentation runtime support | `HOLD_FOR_APPROVED_AGGREGATE_JOIN` | Org metadata segment joins are not approved for runtime use. |

Block:

- ROI calculation.
- Dollarized savings.
- Productivity lift.
- Causal economic impact.
- Prediction.
- Customer-facing economic readout.
- Time-Saved Defensibility Range productization.
- Automated recommendations.
- Individual, team, manager, department, customer, or skill ranking.
- APIs, schemas, frontend surfaces, runtime services, or Prisma migrations for
  the V4 economic layer.

## What Can Harden Next

The next hardening scope is documentation-first and internal-only.

Allowed contract-hardening candidates:

- internal AI Scale Readiness readout contract,
- readout-zone field definitions,
- value-hypothesis record shape,
- evidence-gap and hold-state vocabulary,
- support-context caveat shape,
- Time-Saved range-readiness gate shape with null or absent range values when
  required inputs are missing,
- client-pilot source-readiness checklist that does not emit economics.

Contract hardening must preserve:

- aggregate-only outputs,
- fail-closed suppression,
- independent per-slice gates,
- no customer-facing economics,
- no dollarized output,
- no causal or predictive claim,
- no productivity interpretation,
- no comparative evaluation of people, teams, departments, managers, customers,
  or skills.

## What Cannot Harden Yet

The following cannot move to contract hardening from the current evidence:

- customer-facing V4 economic readout,
- Time-Saved Defensibility Range values,
- Economic Impact Bridge runtime support,
- Organizational Segmentation runtime support,
- Trust Calibration Index as a governed product signal,
- reusable leverage or Skill Read Evidence as governed value signals,
- behavior-to-support attribution,
- department, function, level, manager/IC, leader, or region segmentation,
- any output that would invite ranking, scoring, ROI, productivity, causality,
  or prediction interpretation.

## Full Validation Result

The sprint passes validation for an internal readout contract decision because:

- Velocity and Depth Repertoire behavior cohorts were tested across fixed
  windows and promoted for internal aggregate use.
- Segment overlay was tested as a research layer and remains bounded to safe
  behavior-derived overlays unless an approved org metadata join exists.
- Intervention tracking has a research design but remains held for a governed
  intervention ledger.
- Outcome joins have a tested design, and support is the first approved outcome
  context source.
- Support outcome context can travel with the readout, but behavior attribution
  remains held.
- Time-Saved Defensibility can act as a gate, but current evidence correctly
  suppresses range values.
- The Economic Hypothesis Map can route investigations without asserting
  economic value.

The sprint does not pass validation for customer-facing economic output because
the required assumption ledger, attribution key, causal design, and governed
customer-owned economic model are not present.

## Safe Operating Statement

V4 can now safely say:

```text
Aggregate AI operating evidence can identify where Glean should scale,
coach, redesign, calibrate trust, expand adoption, or hold interpretation, and
where a business-owned value investigation may be warranted.
```

V4 cannot say:

```text
The observed AI behavior created economic value, saved a specific amount of
time, improved productivity, caused support outcomes to move, or predicts
future results.
```

## Required Next Sprint

The next sprint should harden the internal readout contract only.

Recommended next artifact:

```text
docs/contracts/value-confidence/internal-scale-readiness-readout.md
```

That artifact should define:

- allowed fields,
- blocked fields,
- zone definitions,
- evidence-gap vocabulary,
- value-hypothesis record shape,
- support-context caveats,
- Time-Saved gate state,
- suppression behavior,
- example surfaced and held records.

It should not define:

- APIs,
- schemas,
- frontend product surfaces,
- customer-facing economic readouts,
- ROI calculations,
- time-saved range values,
- causal or predictive outputs,
- individual or comparative group scoring.

## Governance Safety Review

This decision preserves the nine invariants:

1. It adds no canonical events.
2. It adds no suppression reasons.
3. It adds no tunable thresholds.
4. It adds no admin overrides.
5. It emits no individual scoring or user-identifiable output.
6. It preserves fail-closed interpretation.
7. It does not use latency as a surfacing trigger.
8. It is documentation and research only.
9. It preserves per-slice independence and does not aggregate across slices to
   reconstruct suppressed or identifiable values.

It also preserves the V4 economic boundary: value investigation routing is
allowed; economic proof is not.

## Final Decision

Decision:

`PROMOTE_INTERNAL_READOUT_CONTRACT_HARDENING`

Also:

`HOLD_CUSTOMER_FACING_ECONOMIC_OUTPUT`

The current V4 phase is complete enough to move from research readout design to
internal contract hardening. It is not complete enough to build customer-facing
economic outputs or productized Time-Saved Defensibility ranges.
