# V4 Behavior Cohort Promotion Decision

## Purpose

This document records the decision after reviewing the saved V4 behavior-cohort
joint-distribution export.

Current decision: `PROMOTE_DEPTH_AND_VELOCITY_BEHAVIOR_COHORT_AXES`

This is a research and internal-readout decision. It adds no APIs, schemas,
Prisma migrations, runtime services, frontend surfaces, customer-facing
economic readouts, ROI calculation, causal claim, prediction claim, individual
scoring, comparative team evaluation, comparative department evaluation,
productivity measurement, maturity label, automated recommendation, or
skill-name readout.

## Inputs Reviewed

Reviewed aggregate inputs:

- `dogfood-output/v4-behavior-cohort-joint-distribution/v4_behavior_cohort_joint_all_windows.csv`
- `dogfood-output/v4-behavior-cohort-joint-distribution/v4_behavior_cohort_joint_summary_safe.csv`
- [V4 Behavior Cohort Classification Readout](./V4_BEHAVIOR_COHORT_CLASSIFICATION_READOUT.md)
- [V4 Data Analysis Closeout](./V4_DATA_ANALYSIS_CLOSEOUT.md)
- [V4 Trust And Cohort Classification Plan](./V4_TRUST_AND_COHORT_CLASSIFICATION_PLAN.md)

The saved export contains 515 aggregate all-window rows. Of those rows, 495
are `SURFACE_ELIGIBLE_RESEARCH_ONLY` and 20 are suppressed behind
`INSUFFICIENT_VOLUME`. The safe summary contains 173 aggregate rows, and 159 of
those summary rows appear in all three fixed windows.

## Evidence Summary

| Cohort axis | Window rows | Promoted rows | Stable summary rows | Stable promoted rows | Decision |
| --- | ---: | ---: | ---: | ---: | --- |
| `velocity_band` | 207 | 50 | 71 | 18 | Promote for internal behavior-cohort review. |
| `depth_repertoire_band` | 164 | 29 | 54 | 10 | Promote for internal behavior-cohort review. |
| `agent_delegation_band` | 72 | 0 | 24 | 0 | Continue as context only. |
| `skill_read_presence_band` | 72 | 0 | 24 | 0 | Continue as context only. |

Velocity and Depth Repertoire are the only cohort axes that produced promoted
rows in the fixed-window joint distribution. AGENT delegation and Skill Read
presence remain useful for interpretation, but they did not cross the promotion
bar as standalone cohort axes.

## What Was Learned

Behavior-derived cohorts are useful because they change the interpretation of
trust evidence without requiring department, manager, role, region, skill-name,
or person-level segmentation.

Velocity is useful because it separates adoption energy from trust readiness.
High-velocity rows show large signal volume, but a substantial share of that
volume remains aliased or held. That prevents the unsafe shortcut of treating
more usage as more value.

Depth Repertoire is useful because it adds a work-integration lens. It helps
distinguish broad or repeated activity from repeated cross-surface use. That is
actionable for internal scale-readiness planning, but it still does not produce
economic value by itself.

Skill Read presence is useful as instrumentation context. It can tell reviewers
whether Skill-assisted behavior is present, but it cannot name skills, compare
skills, infer trust, or imply reusable leverage without additional governed
identity and outcome evidence.

AGENT delegation is useful as context. It can tell reviewers whether AGENT use
is present or repeated, but AGENT trust interpretation remains held until parent
attribution, sub-surface mapping, feedback, verification, and reliability
evidence become governed.

## Promoted Scope

Promoted for internal Glean dogfood and value-realization planning:

- `velocity_band` as a behavior-cohort axis,
- `depth_repertoire_band` as a behavior-cohort axis,
- cross-tab review of Velocity, Depth Repertoire, narrow trust classifications,
  AGENT delegation context, and Skill Read presence context,
- internal action-posture language such as scale candidate, workflow-design
  candidate, focused-depth candidate, trust-evidence gap, and evidence hold,
- Economic Impact Bridge routing language for value investigation only.

The promoted axes may be used to answer:

```text
Where does aggregate AI use appear active, integrated, shallow, trust-held,
instrumentation-held, or ready for a deeper value investigation?
```

They must not answer:

```text
How much money did AI create, which group is best, or which people are more
productive?
```

## Glean-Wide Readout If Run Today

If FluencyTracr were run today across the currently covered Glean event and
agent-span sources, the useful output would be an internal portfolio readout,
not an economic scorecard.

It would likely show:

- where AI adoption has high activity but weak or aliased trust evidence,
- where activity is paired with stronger cross-surface work integration,
- where focused pockets show Depth even without broad high Velocity,
- where Skill-assisted or AGENT-assisted behavior is present but not yet
  governed enough for trust or economic claims,
- where evidence is suppressed, sparse, or missing and should block
  interpretation,
- which aggregate areas deserve a customer-owned or business-owned economic
  value investigation.

That is the "wow" finding: the readout can move the conversation from raw usage
counts to an evidence portfolio that says where to scale, where to redesign,
where to calibrate trust, and where economics should remain blocked.

The "wow" should not be that it computes ROI; it does not. The "wow" is that it
can become the first aggregate operating map for AI value realization.

## Economic Suggestion Boundary

Economic investigation suggestions may start now if they remain non-dollarized
and caveated.

Allowed now:

- candidate impact area,
- value hypothesis,
- reason the aggregate evidence supports investigation,
- missing assumptions,
- required outcome evidence,
- blocked or held caveats,
- customer-owned assumptions needed before any dollarized range.

Still blocked:

- dollarized ROI,
- guaranteed savings,
- productivity lift,
- causal economic impact,
- customer-facing economic readout,
- Time-Saved Defensibility Range productization,
- confidence-band adjustment from Velocity or Depth,
- automated economic recommendations.

The next promotion beyond this decision would require aligned 60-day aggregate
evidence for Velocity, Depth Repertoire, Quality Multiplier, Reliability
Factor, V3 verdict metadata, narrow trust attribution, and customer-attested
Outcome Evidence, plus a holdout or backtest design that proves the economic
caveats travel without reconstructing suppressed values.

## Held Scope

Held:

- `agent_delegation_band` as a standalone promoted cohort axis,
- `skill_read_presence_band` as a standalone promoted cohort axis,
- broad Trust Calibration,
- AGENT trust interpretation,
- Skill Read Evidence as reusable leverage,
- org metadata cohorts,
- customer-facing economic output.

## Final Decision

Decision: `PROMOTE_DEPTH_AND_VELOCITY_BEHAVIOR_COHORT_AXES`

Depth Repertoire and Velocity may be used as internal aggregate
behavior-cohort axes for AI Scale Readiness and Economic Impact Bridge
investigation routing. AGENT delegation and Skill Read presence remain
context-only. All economic interpretation remains non-dollarized,
aggregate-only, caveated, and blocked from customer-facing product use until a
later decision promotes the exact boundary.
