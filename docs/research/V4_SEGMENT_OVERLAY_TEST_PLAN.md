# V4 Segment Overlay Test Plan

## Purpose

This document defines and tests the first V4 segment overlay. The goal is to
show whether aggregate behavior segments can make Velocity x Depth evidence
more actionable without creating person, team, manager, department, customer,
or skill ranking.

This is research-only. It adds no APIs, schemas, Prisma migrations, runtime
services, frontend surfaces, customer-facing economic outputs, ROI
calculation, causal claim, prediction claim, individual scoring, comparative
team evaluation, comparative department evaluation, productivity measurement,
maturity label, automated recommendation, raw skill-name readout, new
canonical events, new suppression reasons, tunable thresholds, or admin
overrides.

## Segment Overlay Definition

Segment overlay means:

> Apply a safe aggregate segment dimension to an already governed V4 readout so
> the reviewer can decide which human intervention or value investigation is
> appropriate.

It is not segmentation for performance management. It is not a leaderboard. It
is not a manager view. It is not a way to identify people.

## Allowed Segment Types

### Ready For Research Now

| Segment type | Current status | Reason |
| --- | --- | --- |
| Velocity band | Ready | Already promoted as internal behavior-cohort axis. |
| Depth Repertoire band | Ready | Already promoted as internal behavior-cohort axis. |
| Readout zone | Ready | Derived from aggregate Velocity x Depth, trust classification, and hold states. |

### Context Only

| Segment type | Current status | Reason |
| --- | --- | --- |
| AGENT delegation band | Context only | Useful but not promoted as standalone cohort axis. |
| Skill Read presence | Context only | Availability signal only; no raw skill names and no reusable leverage proof. |
| Narrow trust classification | Partial | `CHAT_FEEDBACK` and `SEARCH_FEEDBACK` are candidates; broad Trust Calibration remains held. |

### Held Until Approved Aggregate Join

| Segment type | Current status | Required before testing |
| --- | --- | --- |
| Department/function | Held | Approved aggregate HRIS/directory join inside the governed boundary. |
| Role family | Held | Approved aggregate HRIS/directory join and coverage gate. |
| Level band | Held | Approved aggregate HRIS/directory join and suppression gates. |
| Manager/IC/leader | Held | Approved aggregate role join; no manager comparison. |
| Region | Held | Approved aggregate location join and coverage gate. |
| Tenure cohort | Held unless derived inside boundary | First-active-date or HRIS tenure bucket with no user-level output. |

## Test Inputs

The first test uses saved aggregate files only:

- `dogfood-output/v4-velocity-depth-zone/v4_velocity_depth_zone_summary_safe.csv`
- `dogfood-output/v4-behavior-cohort-joint-distribution/v4_behavior_cohort_joint_summary_safe.csv`
- `dogfood-output/v4-readout-zone-data-test/v4_readout_zone_data_test_summary.csv`

Derived aggregate output:

- `dogfood-output/v4-segment-overlay-test/v4_segment_overlay_summary.csv`

The derived output contains aggregate summary rows only. It does not contain
user IDs, emails, names, raw prompts, raw outputs, transcripts, raw event rows,
raw skill names, action rows, or HR fields.

Important caveat: `aggregate_cohort_rows` in this test is a summed aggregate
row count across summary rows. It is useful for relative readout-shape testing,
but it is not a deduplicated population count.

## Saved-Data Test Result

The segment overlay test produced seven aggregate rows: three Velocity bands
and four Depth Repertoire bands.

| Segment | Stable rows | Aggregate cohort rows | Scale candidate share | Trust evidence gap share | Interpretation |
| --- | ---: | ---: | ---: | ---: | --- |
| `HIGH_VELOCITY` | 39 | 2,205,111 | 4.73% | 94.96% | High adoption energy exists, but trust evidence gaps dominate. |
| `MEDIUM_VELOCITY` | 43 | 2,235,384 | 0.93% | 98.70% | Some scale candidates exist, but most rows need trust-loop repair. |
| `LOW_VELOCITY` | 34 | 2,240,345 | 0.00% | 99.85% | Mostly not ready for scale; includes small focused-use pockets. |
| `INTEGRATED_REPERTOIRE` | 62 | 2,391,888 | 5.23% | 94.72% | Best Depth spine for scale review, but still trust-caveated. |
| `ACTIVE_BUT_SHALLOW` | 39 | 1,134,828 | 0.00% | 98.48% | Coaching or workflow redesign, not economic interpretation. |
| `FOCUSED_INTEGRATION` | 12 | 2,822,712 | 0.00% | 100.00% | Depth exists, but trust evidence does not support promotion. |
| `UNSTABLE_OR_INSUFFICIENT` | 3 | 331,412 | 0.00% | 100.00% | Hold or repair evidence before interpretation. |

## What The Test Proves

The segment overlay is useful because it changes the interpretation from a
single V4 readout into a more actionable operating map:

- High Velocity is not automatically value-ready.
- Integrated Repertoire is the strongest current behavior segment, but still
  needs trust and outcome evidence.
- Active-but-shallow behavior points to coaching or workflow design, not
  dollarization.
- Trust evidence gaps dominate the readout, so the next value story must
  preserve evidence gaps instead of hiding them.

This is exactly the intended use of segment overlay: it tells the reviewer
which action posture fits the evidence.

## What The Test Does Not Prove

The test does not prove:

- ROI,
- time saved,
- productivity lift,
- causal impact,
- future performance,
- customer value,
- department or team differences,
- individual behavior,
- skill effectiveness,
- manager-level patterns.

It also does not prove that org metadata segmentation is ready. Department,
role, tenure, level, manager/IC, and region remain held until an approved
aggregate join exists.

## Decision

`PROMOTE_BEHAVIOR_SEGMENT_OVERLAY_TESTING`

Velocity band, Depth Repertoire band, and readout zone may be used as internal
research segment overlays for V4 dogfood readouts.

This decision does not promote org metadata segmentation. It does not authorize
customer-facing readouts, economic outputs, APIs, schemas, contracts, or
automated recommendations.

## Required Next Step

Build the intervention tracking research design.

The next test should ask:

> When a known enablement, workflow redesign, Skill rollout, agent deployment,
> or trust-loop intervention occurs, do aggregate Velocity, Depth Repertoire,
> trust, or reliability patterns move in the intended direction?

That is the next bridge from static readout to value-realization operating
system.

## Open Questions

- Should tenure be tested from first-observed activity before HRIS joins are
  available?
- What minimum source coverage should org metadata segments require before
  they can appear in a readout?
- Should segment overlay show zone movement over time before it appears in a
  team-presentable artifact?
- Which intervention type should be tested first: enablement, workflow design,
  trust-loop repair, Skill rollout, or agent deployment?
