# V4 Depth Repertoire Value Confidence Calibration Decision

## Purpose

This document records the calibration decision for whether Depth Repertoire may
influence V4 value-confidence artifacts.

It applies the
[V4 Depth Repertoire Value Confidence Calibration Plan](./V4_DEPTH_REPERTOIRE_VALUE_CONFIDENCE_CALIBRATION_PLAN.md)
to the aggregate evidence currently available in the repository.

This is a research decision record. It adds no APIs, schemas, Prisma migrations,
runtime services, frontend surfaces, customer-facing economic readouts, ROI
calculation, causal claim, prediction claim, individual scoring, team
comparison, productivity scoring, or prohibited maturity label.

## Inputs Reviewed

Available aggregate inputs:

- `dogfood-output/v4-depth-repertoire/v4_depth_repertoire_window_1.csv`
- `dogfood-output/v4-depth-repertoire/v4_depth_repertoire_window_2.csv`
- `dogfood-output/v4-depth-repertoire/v4_depth_repertoire_window_3.csv`
- `dogfood-output/READOUT.md`
- [Depth Repertoire contract](../contracts/depth/depth-repertoire.md)
- [Value Confidence contract](../contracts/value-confidence/README.md)
- [Depth Repertoire calibration plan](./V4_DEPTH_REPERTOIRE_VALUE_CONFIDENCE_CALIBRATION_PLAN.md)

Missing or incomplete inputs for full calibration:

- Velocity Index outputs for 60-day-compliant matching cohort keys.
- Quality Multiplier outputs for 60-day-compliant matching cohort keys.
- Reliability Factor outputs for 60-day-compliant matching cohort keys.
- V3 verdict outputs for 60-day-compliant matching cohort keys.
- Customer-attested aggregate Outcome Evidence.

The existing multi-surface dogfood readout includes Quality Multiplier and
Reliability Factor for the 60-day surface run, but it is not keyed to the same
three fixed windows as the Depth Repertoire exports. It is useful context, not
sufficient calibration evidence.

An aligned Velocity dry run was attempted against the same three Depth
Repertoire windows. The dry run succeeded syntactically, with estimated scan
sizes of approximately 2.45 TB, 2.72 TB, and 2.96 TB. The full scans were not
run because the three Depth Repertoire stability windows are 20-day windows.
Even successful Velocity outputs for those windows would be `SUPPRESS` under
the 60-day `INSUFFICIENT_TIME` gate documented for V1 verdict and Velocity
paths.

That makes the blocker more specific: the current fixed-window stability
exports are valid for distribution-shape research, but they cannot calibrate a
value-confidence dependency. Value-confidence calibration requires aligned
60-day-compliant windows.

A taxonomy-aware QM/RF diagnostic was then run for
`2026-03-23T00:00:00Z` through `2026-05-22T00:00:00Z`, using the work-mode
taxonomy and the same governed surface boundaries as Velocity and Depth. The
dry run validated against the native scio-prod STRUCT table and estimated
approximately 2.99 TB scanned. The full query produced 30 aggregate surface
rows: 25 workflow surfaces and 5 standalone surfaces.

Those QM/RF rows were then passed to the multi-surface dogfood driver with the
matching 60-day Velocity rows. The run produced:

| Metric | Result |
| --- | ---: |
| Weighted Reliability Factor | 0.730 |
| Weighted Quality Multiplier | 1.228 |
| Weighted Velocity-Adjusted Quality Multiplier | 0.860 |

The result is the strongest aligned dogfood run so far because QM/RF and
Velocity now share surface IDs for the same 60-day window. It also exposed a
clear limitation: standalone surfaces entered the QM/RF input, but all five
standalone rows suppressed for `NO_CONVERGENCE` because the current
`observed_event_proxy` path has volume and Velocity but not enough quality /
reliability evidence to surface. That is a useful finding, not a failure.
Standalone activity can be visible to Velocity and Depth before it is
defensible for QM/RF.

A follow-up calibration pass then generated additional rolling 60-day Depth
Repertoire outputs for `2026-02-21` through `2026-04-22` and `2026-01-22`
through `2026-03-23`. It also generated a matching Velocity output for
`2026-02-21` through `2026-04-22`. The remaining Velocity and QM/RF outputs
were interrupted by local BigQuery authentication refresh, so they are not used
as decision evidence here. The completed rows are still useful because they
show whether the behavioral spine is stable before it is compared to the
economic-confidence primitives.

## Calibration Test Results

| Test | Result | Evidence |
| --- | --- | --- |
| Depth Repertoire x Velocity | Partially tested | The original three Depth Repertoire stability windows are 20 days and cannot calibrate Velocity. A same-window 60-day Velocity run exists for the scio-prod 60-day window, and a second rolling 60-day Velocity run shows consistent top-surface behavior. A third complete Velocity window is still required. |
| Depth Repertoire x Quality Multiplier | Partially tested | Taxonomy-aware QM input now exists for one 60-day scio-prod window, but not yet for three matching 60-day windows. |
| Depth Repertoire x Reliability Factor | Partially tested | Taxonomy-aware RF input now exists for one 60-day scio-prod window, but not yet for three matching 60-day windows. |
| Depth Repertoire x Outcome Evidence | Not tested | No customer-attested aggregate outcome evidence was available for this calibration pass. |
| Suppressed Depth Repertoire | Partially tested by contract | The Depth Repertoire contract defines suppressed values as null or absent, but no full downstream economic artifact exists to test caveat propagation end to end. |

## What The Test Did Prove

The available evidence confirms that Depth Repertoire is stable enough to remain
a hardened Depth sub-contract:

| Window | Cohort size | Repertoire p50/p90/p99 | Repeated surfaces p50/p90/p99 | Depth candidate p50/p90/p99 |
| --- | ---: | --- | --- | --- |
| 1 | 1,869,820 | 2 / 5 / 7 | 1 / 5 / 6 | 1 / 25 / 48 |
| 2 | 1,915,311 | 2 / 5 / 7 | 1 / 5 / 7 | 2 / 25 / 49 |
| 3 | 1,901,222 | 2 / 5 / 7 | 1 / 5 / 7 | 3 / 25 / 49 |

The p90 and p99 shape remains stable across windows. This supports the prior
contract-hardening decision.

The additional dry-run check also proved that the existing 20-day windows should
not be reused as economic calibration windows. They intentionally stress
short-window stability, while Velocity, Quality Multiplier, Reliability Factor,
and V3 verdict paths require 60-day-compliant evidence to surface.

The one-window taxonomy-aware QM/RF run proved that surface-language alignment
is technically viable. It moved the dogfood readout from older workflow-only
surface inputs to governed workflow and standalone surface rows. The weighted
Velocity-adjusted Quality Multiplier dropped to 0.860, which is materially more
conservative than the unadjusted taxonomy-aware Quality Multiplier of 1.228.

The same run also proved that standalone surfaces need richer quality and
reliability joins before they can support QM/RF. Treating observed standalone
events as completed proxy records is enough to test the adapter boundary, but
not enough to clear convergence gates.

The additional rolling 60-day Depth Repertoire pass reinforced the same
distribution shape:

| Window | Cohort size | Repertoire p50/p90/p99 | Repeated surfaces p50/p90/p99 | Depth candidate p50/p90/p99 |
| --- | ---: | --- | --- | --- |
| 2026-03-23 to 2026-05-22 | 2,238,571 | 2 / 6 / 9 | 2 / 5 / 8 | 4 / 30 / 64 |
| 2026-02-21 to 2026-04-22 | 2,222,551 | 2 / 6 / 8 | 1 / 5 / 7 | 3 / 28 / 63 |
| 2026-01-22 to 2026-03-23 | 2,219,505 | 1 / 6 / 8 | 1 / 5 / 7 | 1 / 25 / 63 |

That shape is not identical, but it is interpretable: upper-tail Depth remains
stable while the median moves with cohort/window composition. This supports
using Depth Repertoire as caveat context, not as a threshold or multiplier.

The two completed aligned Velocity windows also show the same dominant surface
pattern. `standalone:GLEAN_BOT_ACTIVITY`, `standalone:AUTOCOMPLETE`,
`standalone:SEARCH`, `workflow:CHAT`, and `workflow:agent:ephemeral` remain the
largest interaction contributors in both complete windows. This suggests Depth
Repertoire is not merely discovering a different surface universe than
Velocity; it is asking a different question about return use across that same
surface universe. The third Velocity window and two more QM/RF windows are
still required before any stronger value-confidence decision can be made.

## What The Test Did Not Prove

The available evidence does not yet prove that Depth Repertoire should affect:

- confidence bands,
- eligibility,
- Time-Saved Defensibility Range,
- AI Value Leakage Map,
- AI Scale Readiness Portfolio,
- Trust Calibration Index,
- any customer-facing economic artifact.

The missing piece is same-key calibration against the other V4 primitives. A
stable behavioral signal is not automatically an economic dependency.

The same-key requirement must also respect gate compatibility. A same-key
20-day run would appear aligned, but it would only test suppression behavior.
It would not test whether Depth Repertoire changes value-confidence
interpretation when the other primitives are eligible to surface.

## Decision

Decision: `HOLD_FOR_MORE_CALIBRATION`

Rationale: Depth Repertoire remains promising and stable, but this calibration
pass still does not include the full required input set. The first same-window
taxonomy-aware QM/RF run confirms the calibration path is real, but it is only
one 60-day window. The additional rolling Depth and Velocity outputs reinforce
the behavioral signal, but they do not supply the missing QM/RF and verdict
evidence. Standalone surfaces also still lack enough quality / reliability
evidence to surface. The safest current use is as a Depth contract component
and research caveat source. It should not yet affect V4 confidence bands,
surfacing eligibility, or economic artifacts.

This decision supersedes neither the stability promotion nor the contract
hardening. It preserves them while holding economic dependency.

## Current Allowed Use

Allowed:

- Use Depth Repertoire as a hardened aggregate Depth sub-contract.
- Use Depth Repertoire in research language about cross-surface return use.
- Use Depth Repertoire to explain why broad Depth needed a non-saturated spine.
- Use Depth Repertoire as a caveat candidate in future calibration work.

Not allowed:

- Do not use Depth Repertoire to modify economic confidence bands.
- Do not use Depth Repertoire to determine V4 economic eligibility.
- Do not use Depth Repertoire in Time-Saved Defensibility Range.
- Do not use Glean dogfood values as thresholds, calibration values, defaults,
  or customer benchmarks.

## Required Next Phase

The next phase is an aligned aggregate calibration run over 60-day-compliant
windows.

Complete the remaining outputs for at least three matching 60-day cohort/window
keys:

- Depth Repertoire,
- Velocity Index,
- taxonomy-aware Quality Multiplier inputs,
- taxonomy-aware Reliability Factor inputs,
- V3 verdict metadata,
- Outcome Evidence only where customer-attested aggregate evidence exists.

The next run should also distinguish workflow rows backed by `workflow_status`
from standalone rows backed only by `observed_event_proxy`. Standalone rows
should remain visible as aggregate context, but should not be treated as QM/RF
evidence until verification, feedback, recovery, or other parent-quality joins
make them converge.

Then repeat the calibration matrix and produce a new decision:

- `PROMOTE_CAVEAT_ONLY`
- `PROMOTE_CONFIDENCE_BAND_INPUT`
- `PROMOTE_ELIGIBILITY_INPUT`
- `HOLD_FOR_MORE_CALIBRATION`
- `REJECT_VALUE_CONFIDENCE_USE`

If historical data is available, the preferred test design is three rolling
60-day windows so each primitive is eligible to surface under its existing
gates. The previously exported 20-day windows remain useful stability evidence,
but they should not be used to promote value-confidence dependency.

The taxonomy-aware QM/RF input bridge is
[`sql/dogfood/taxonomy_qm_rf_diagnostic.sql`](../../sql/dogfood/taxonomy_qm_rf_diagnostic.sql).
It is dogfood/research-only and exists to align QM/RF calibration with the same
surface and work-mode boundaries used by Velocity and Depth.

Operationally, the next run should resume with the missing aligned outputs
rather than rerunning completed evidence:

- Velocity for `2026-01-22` through `2026-03-23`.
- Taxonomy-aware QM/RF for `2026-02-21` through `2026-04-22`.
- Taxonomy-aware QM/RF for `2026-01-22` through `2026-03-23`.

Those three outputs are enough to rerun the driver for windows 2 and 3 and
replace this hold with a stronger calibration decision.

## Governance Safety Review

This decision preserves:

- the existing nine canonical events,
- the existing five suppression reasons,
- no tunable thresholds,
- no admin overrides,
- no person-level outputs,
- default fail-closed suppression,
- per-slice independence,
- no customer-facing prediction claim,
- no ROI calculation,
- no causal productivity claim,
- no customer benchmark from Glean dogfood values,
- no universal product threshold,
- no hidden economic multiplier.

## Open Questions

- Can matching Velocity outputs show whether Depth Repertoire adds interpretation
  beyond surface breadth?
- Does Depth Repertoire change caveats only, or can it eventually affect
  confidence bands?
- Which economic artifact is safest for first dependency testing after full
  calibration exists?
- Should customer-side aggregate evidence be required before any promotion
  beyond caveat-only use?
