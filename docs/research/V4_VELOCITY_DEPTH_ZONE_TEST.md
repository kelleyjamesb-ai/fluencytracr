# V4 Velocity x Depth Zone Test

## Purpose

This document records the follow-up data test requested by the
[V4 Readout Zone Data Test](./V4_READOUT_ZONE_DATA_TEST.md): join Velocity band
and Depth Repertoire band in the same aggregate row so strict
`SCALE_CANDIDATE` assignment can be tested instead of inferred.

This is a dogfood-only research test. It does not add runtime behavior,
contracts, schemas, APIs, UI, economic calculations, customer-facing readouts,
causal claims, prediction claims, productivity measurement, rankings, new
canonical events, or new suppression reasons.

## Inputs

Diagnostic SQL:

- `sql/dogfood/velocity_depth_zone_diagnostic.sql`

Approved dogfood sources used for the retained run:

- `scio-apps.scrubbed_glean_customer_event.scrubbed_glean_customer_event`
- `scio-apps.scrubbed_agentspan.scrubbed_agentspan_*`

Fixed 60-day windows:

| Window | Start | End |
| --- | --- | --- |
| 1 | 2026-03-23 | 2026-05-22 |
| 2 | 2026-02-21 | 2026-04-22 |
| 3 | 2026-01-22 | 2026-03-23 |

Saved outputs:

- `dogfood-output/v4-velocity-depth-zone/v4_velocity_depth_zone_window_1.csv`
- `dogfood-output/v4-velocity-depth-zone/v4_velocity_depth_zone_window_2.csv`
- `dogfood-output/v4-velocity-depth-zone/v4_velocity_depth_zone_window_3.csv`
- `dogfood-output/v4-velocity-depth-zone/v4_velocity_depth_zone_all_windows.csv`
- `dogfood-output/v4-velocity-depth-zone/v4_velocity_depth_zone_summary_safe.csv`

All outputs are aggregate-only. Suppressed small cells redact metric values.
Counts are aggregate row counts or aggregate cohort-row sums across repeated
windows and dimensions. They are not unique user totals and must not be used as
population, productivity, ROI, or ranking measures.

## Method

The diagnostic emits one aggregate row per:

```text
velocity_band x depth_repertoire_band x trust_classification x
agent_delegation_classification x skill_read_presence_classification
```

The query uses existing dogfood research banding only:

- Velocity band from aggregate interaction distribution.
- Depth Repertoire band from surface repertoire and repeated-surface evidence.
- Trust classification from deduplicated verification-signal attribution.
- AGENT delegation and Skill Read presence as context dimensions.

Small cells fail closed with `INSUFFICIENT_VOLUME`. Final outputs never emit
raw user IDs, emails, names, raw skill names, prompts, outputs, transcripts,
action rows, or raw event rows.

## Window Results

| Window | Aggregate rows | Research-eligible rows | Suppressed rows | Scale candidate | Shallow adoption | Focused expert use | Trust evidence gap |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 153 | 135 | 18 | 12 | 8 | 6 | 109 |
| 2 | 141 | 124 | 17 | 12 | 7 | 3 | 102 |
| 3 | 130 | 114 | 16 | 12 | 6 | 3 | 93 |

All three windows produce strict `SCALE_CANDIDATE` rows after Velocity and
Depth Repertoire are joined.

## Stable Summary

Rows present in all three fixed windows:

| Zone | Stable aggregate rows | Interpretation |
| --- | ---: | --- |
| `SCALE_CANDIDATE` | 12 | Eligible for internal scale-candidate stability review only. |
| `SHALLOW_ADOPTION` | 6 | Active usage where friction, enablement, or workflow redesign should be investigated before economic language. |
| `FOCUSED_EXPERT_USE` | 3 | Narrower integrated-use pockets that need business context before scale or value interpretation. |
| `TRUST_EVIDENCE_GAP` | 92 | Activity exists, but trust attribution remains the dominant hold state. |
| `SUPPRESSED` | 3 | Small cells remain blocked from interpretation. |

The 12 stable `SCALE_CANDIDATE` rows carry
`PROMOTE_FOR_SCALE_CANDIDATE_STABILITY_REVIEW` and route to
`ACCELERATION_OR_QUALITY_PREMIUM_CANDIDATE_REQUIRES_OUTCOME_EVIDENCE`.
Across repeated windows and aggregate cells, those rows contain 125,100
cohort-row observations and 683,340 trust-signal rows. Those are not unique
population totals and do not prove economic value.

The 92 stable `TRUST_EVIDENCE_GAP` rows are the largest result class. This
keeps the readout honest: Glean dogfood has enough aggregate behavior evidence
to find scale-candidate pockets, but trust attribution still blocks broad
economic interpretation.

## What We Learned

The prior readout-zone test was directionally useful but incomplete. It could
identify focused-use, shallow-adoption, trust-gap, and suppressed rows, but it
could not prove strict `SCALE_CANDIDATE` because Velocity and Depth Repertoire
were not present in the same aggregate row.

This test closes that gap. Strict scale candidates exist in the retained Glean
dogfood evidence when the joined condition is tested directly. That makes the
zone grammar more useful for an executive readout because it can now separate:

- where integrated, sustained behavior is strong enough to investigate scaling;
- where activity is real but shallow;
- where narrow expert-use pockets need business context;
- where trust attribution remains too weak for economic interpretation;
- where suppression blocks interpretation.

The result still does not support ROI, value realized, productivity lift,
causality, prediction, customer benchmarking, or organization ranking. It only
supports internal investigation routing.

## Decision

`PROMOTE_SCALE_CANDIDATE_STABILITY_REVIEW_INTERNAL_ONLY`

The team-demo artifact may use sanitized examples from
`v4_velocity_depth_zone_summary_safe.csv` to show how aggregate AI operating
fluency routes to non-dollarized value hypotheses.

This decision does not promote a product API, customer-facing economic readout,
Time-Saved Defensibility Range dependency, confidence-band change, automated
recommendation, or economic calculation.

## Next Step

Proceed to the team-demo artifact from
[V4 Next Sprint Plan](./V4_NEXT_SPRINT_PLAN.md). The demo should include three
to five aggregate examples from the safe summary:

- one stable `SCALE_CANDIDATE`,
- one `SHALLOW_ADOPTION`,
- one `FOCUSED_EXPERT_USE`,
- one `TRUST_EVIDENCE_GAP`,
- optionally one `SUPPRESSED` row.

Each example must state the action posture, value hypothesis, missing outcome
evidence, and blocked claims.
