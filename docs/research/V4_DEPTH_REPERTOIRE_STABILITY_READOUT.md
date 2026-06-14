# V4 Depth Repertoire Stability Readout

## Purpose

This readout records the research status of Depth Repertoire as a candidate V4
Depth signal. It evaluates whether the pattern
`Surface Repertoire x Repeat Use / Refinement` is stable enough across fixed
windows to move toward Depth contract hardening.

This is dogfood/research only. It does not include:

- product behavior, APIs, schemas, Prisma migrations, frontend surfaces, or
  backend services,
- economic readouts, ROI calculations, causal claims, or prediction claims,
- does not include individual scoring, team comparisons, productivity scoring,
  or prohibited maturity labels.

## Signal Definition

Depth Repertoire is the candidate signal:

```text
Depth Repertoire = Surface Repertoire x Repeat Use / Refinement
```

Surface Repertoire measures how many distinct AI surfaces or workflows appear in
aggregate use. Repeat Use / Refinement measures whether aggregate use returns to
surfaces or workflows rather than remaining one-off.

The candidate is promising because it separates shallow activity from deeper
work-integration evidence. A cohort that touches one surface many times is
different from a cohort that repeatedly uses several AI surfaces in the flow of
work. The first may show volume. The second may show broader work integration.

That interpretation remains provisional until the signal is validated across
fixed windows.

## Why Broad Depth Was Too Blunt

The first broad Depth readout was useful because it showed the research engine
could compose Velocity, Delegation Depth, and refinement evidence without
violating the aggregate-only boundary. It was not discriminating enough for
contract hardening.

Most surfaced outputs landed in the same zone. That means broad Depth looked
directionally plausible, but it did not separate surface patterns clearly enough
to support a durable product contract.

Depth Repertoire is the narrower candidate that responds to that finding. It
tests whether AI use spans multiple surfaces and returns to those surfaces
repeatedly. That is closer to the behavioral question V4 needs to answer: is AI
use becoming cross-surface work integration, or is it mostly narrow activity
volume?

## Evidence Reviewed

Inputs reviewed:

- [DEPTH.md](../concepts/DEPTH.md)
- [DELEGATION_DEPTH.md](../concepts/DELEGATION_DEPTH.md)
- [VELOCITY.md](../concepts/VELOCITY.md)
- [V4_VALUE_CONFIDENCE_LAYER.md](../concepts/V4_VALUE_CONFIDENCE_LAYER.md)
- [SIGNAL_PROMOTION_CRITERIA.md](./SIGNAL_PROMOTION_CRITERIA.md)
- [V4_SIGNAL_VALIDATION_GATE.md](./V4_SIGNAL_VALIDATION_GATE.md)
- [V4_DEPTH_STABILITY_DECISION.md](./V4_DEPTH_STABILITY_DECISION.md)
- [V4_VALIDATION_PLAN.md](./V4_VALIDATION_PLAN.md)
- [`sql/dogfood/depth_repertoire_diagnostic.sql`](../../sql/dogfood/depth_repertoire_diagnostic.sql)

The current evidence includes one live scio-prod dogfood observation from a
60-day window plus three fixed-window exports generated from the same
aggregate-only diagnostic.

Fixed-window exports reviewed:

- `dogfood-output/v4-depth-repertoire/v4_depth_repertoire_window_1.csv`
- `dogfood-output/v4-depth-repertoire/v4_depth_repertoire_window_2.csv`
- `dogfood-output/v4-depth-repertoire/v4_depth_repertoire_window_3.csv`

## Current Dogfood Finding

Current live scio-prod dogfood observation:

| Metric | p50 | p90 | p99 |
| --- | ---: | ---: | ---: |
| Overall repertoire | 2 | 6 | 9 |
| Repeated surfaces | 2 | 5 | 8 |
| Depth candidate | 4 | 30 | 64 |

These values are internal Glean dogfood observations. They are not customer
benchmarks, product thresholds, universal calibration values, or production
defaults.

They do not prove causality, ROI, productivity lift, or maturity. They must not
be used to rank customers, teams, departments, managers, or individuals.

## Required Fixed-Window Validation

Status: complete for the current dogfood cohort.

Depth Repertoire cannot be promoted from one dogfood window. The required
validation was to run
[`sql/dogfood/depth_repertoire_diagnostic.sql`](../../sql/dogfood/depth_repertoire_diagnostic.sql)
across at least three fixed windows and compare:

- p50/p90/p99 by window,
- stability of the distribution shape,
- cohort size and coverage by window,
- whether taxonomy mapping changed between windows,
- whether Depth Repertoire changes interpretation beyond Velocity alone,
- whether the candidate should be promoted, held, narrowed, or rejected.

The fixed windows used were:

| Window | Start | End |
| --- | --- | --- |
| 1 | `2026-03-23T00:00:00Z` | `2026-04-12T00:00:00Z` |
| 2 | `2026-04-12T00:00:00Z` | `2026-05-02T00:00:00Z` |
| 3 | `2026-05-02T00:00:00Z` | `2026-05-22T00:00:00Z` |

The core validation question is:

```text
Does Depth Repertoire explain something Velocity alone does not, or is it
merely another usage intensity proxy?
```

Fixed-window results:

| Window | Cohort size | Repertoire p50/p90/p99 | Repeated surfaces p50/p90/p99 | Multi-day surfaces p50/p90/p99 | Depth candidate p50/p90/p99 |
| --- | ---: | --- | --- | --- | --- |
| 1 | 1,869,820 | 2 / 5 / 7 | 1 / 5 / 6 | 1 / 4 / 6 | 1 / 25 / 48 |
| 2 | 1,915,311 | 2 / 5 / 7 | 1 / 5 / 7 | 1 / 4 / 6 | 2 / 25 / 49 |
| 3 | 1,901,222 | 2 / 5 / 7 | 1 / 5 / 7 | 1 / 5 / 6 | 3 / 25 / 49 |

The p90 and p99 shapes are stable across all three windows. The p50 depth
candidate rises from 1 to 3, but the distribution shape remains interpretable:
the upper half and tail remain essentially unchanged.

Bucket-level medians also separate cleanly and repeatably:

| Repertoire segment | Window 1 depth p50 | Window 2 depth p50 | Window 3 depth p50 |
| --- | ---: | ---: | ---: |
| Single surface | 1 | 1 | 1 |
| Two to three surfaces | 6 | 6 | 6 |
| Four to six surfaces | 16 | 16 | 16 |
| Seven to ten surfaces | 48 | 49 | 49 |
| Eleven plus surfaces | 120 | 110 | 110 |

This is the strongest evidence so far that Depth Repertoire is not merely a
volume counter. It preserves the surface breadth question from Velocity, but it
adds a return-use requirement. A cohort can touch several surfaces once and
still fail to show high Depth Repertoire; repeated return use is required for
the candidate to rise.

The remaining caveat is that this comparison is against Velocity breadth and
usage intensity conceptually. A later productization review should still verify
how Depth Repertoire interacts with the full Velocity Index before any economic
readout depends on it.

## Stability Decision Framework

Depth Repertoire must satisfy the signal-promotion criteria before it can move
toward contract hardening:

| Criterion | Current status |
| --- | --- |
| Behavioral face validity | Promising. Surface repertoire plus repeated use is a defensible work-integration candidate. |
| Alignment with governed taxonomy | Promising. The diagnostic uses workflow and standalone surfaces from the governed taxonomy. |
| Meaningful distribution variance | Passed for the dogfood cohort. The p90 and p99 spread remains meaningful across windows. |
| Stability across windows or cohorts | Passed for the dogfood cohort. Three fixed-window exports show stable p90/p99 shape and stable bucket medians. |
| Support for a specific decision | Promising. It may help decide whether high activity is broad work integration or narrow repeated use. |
| Aggregate-safe surfacing without misuse | Preserved if outputs stay percentile-only and avoid ranking or economic claims. |

## Promotion Decision

Decision: `PROMOTE_DEPTH_REPERTOIRE_CONTRACT_HARDENING`

Rationale: Depth Repertoire now has fixed-window dogfood evidence that is
stable, interpretable, aggregate-only, and meaningfully more discriminating than
the broad Depth readout.

This decision is narrow. It permits Depth Repertoire contract hardening. It does
not authorize APIs, schemas, frontend surfaces, runtime services,
customer-facing economic readouts, Time-Saved Defensibility Range
implementation, ROI calculation, causal claims, prediction claims, individual
scoring, team comparisons, productivity scoring, or prohibited maturity labels.

## Governance Safety Review

This readout preserves the nine invariants:

- No new canonical events are added.
- No new suppression reasons are added.
- No tunable thresholds are introduced.
- No admin overrides are introduced.
- No person-level fields, raw prompts, raw outputs, transcripts, or raw event
  rows are surfaced.
- No individual scoring is introduced.
- No team, department, manager, customer, or employee comparison is introduced.
- No productivity scoring is introduced.
- No maturity scoring is introduced.
- No ROI calculation, causal productivity claim, or prediction claim is made.
- The signal may move to contract hardening, but only as an aggregate-only V4
  Depth component.

## Relationship to Broader Depth Readout

The broader [V4 Depth Stability Decision](./V4_DEPTH_STABILITY_DECISION.md)
held Depth for signal refinement because broad Depth saturated across the real
dogfood run. Depth Repertoire is the narrower candidate that responds to that
finding.

The distinction matters:

- Broad Depth asked whether the current readout zones were stable enough for
  contract hardening.
- Depth Repertoire asks whether cross-surface repertoire multiplied by repeat
  use creates a more discriminating Depth spine.

Depth Repertoire must still prove stability. It should not be treated as a
replacement for the broader Depth readout until fixed-window evidence shows that
it is stable, interpretable, and aggregate-safe.

## What Remains Blocked

The following remain blocked after this decision:

- V4 economic readouts that depend on Depth Repertoire.
- Time-Saved Defensibility Range use of Depth Repertoire.
- Value-confidence APIs or product surfaces that depend on Depth Repertoire.
- Customer-facing claims that use the current Glean dogfood values.
- Any product threshold, calibration value, schema default, or universal concept
  value derived from the Glean dogfood observation.

No economic value range should be built from Depth Repertoire until contract
hardening and later value-confidence review are complete.

## Required Next Step

Open a separate contract-hardening PR for Depth Repertoire.

That PR should define:

- the minimal aggregate output shape,
- allowed bands or statuses,
- required caveats,
- suppression behavior,
- example surfaced and suppressed readouts,
- explicit language that Glean dogfood values are evidence used for promotion,
  not thresholds, calibration values, or defaults.

The contract-hardening PR must not add an API, runtime service, frontend surface,
Prisma migration, customer-facing economic readout, ROI calculation, causal
claim, prediction claim, individual scoring, team comparison, productivity
scoring, or prohibited maturity labels.

## Open Questions

- How should a future contract express Depth Repertoire without converting it
  into a universal score?
- How should the contract preserve both components instead of collapsing them
  into a single opaque value?
- How should Depth Repertoire interact with the full Velocity Index in later
  value-confidence review?
- Which surface categories create the strongest spread: workflow, standalone,
  AGENT sub-surfaces, or mixed use?
- Does repeat use need same-session refinement, multi-day return use, or both?
- What level of coverage is required before this signal can inform any V4 value
  confidence artifact?
