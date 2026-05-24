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

A single 60-day Depth Repertoire sanity check was then run for
`2026-03-23T00:00:00Z` through `2026-05-22T00:00:00Z`. It produced aggregate
rows only and confirmed that the 60-day Depth Repertoire diagnostic path is
live:

| Segment | Cohort size | Repertoire p50/p90/p99 | Repeated surfaces p50/p90/p99 | Depth candidate p50/p90/p99 |
| --- | ---: | --- | --- | --- |
| overall | 2,238,571 | 2 / 6 / 9 | 2 / 5 / 8 | 4 / 30 / 64 |

This confirms the 60-day Depth Repertoire spine itself, but it is still only
one Depth-only window. It does not supply aligned Velocity, Quality Multiplier,
Reliability Factor, V3 verdict metadata, or Outcome Evidence for the same
calibration key.

## Calibration Test Results

| Test | Result | Evidence |
| --- | --- | --- |
| Depth Repertoire x Velocity | Blocked by window compatibility | Depth Repertoire has stable fixed-window shape, but the three windows are 20 days. Velocity would suppress for `INSUFFICIENT_TIME`; calibration needs 60-day-compliant matching keys. |
| Depth Repertoire x Quality Multiplier | Blocked by window compatibility | Quality Multiplier exists in the 60-day multi-surface readout, but not for matching 60-day Depth Repertoire keys. |
| Depth Repertoire x Reliability Factor | Blocked by window compatibility | Reliability Factor exists in the 60-day multi-surface readout, but not for matching 60-day Depth Repertoire keys. |
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

The single 60-day sanity check confirms the 60-day Depth Repertoire diagnostic
can run against scio-prod and reproduces the expected overall shape. It does not
replace the required multi-window value-confidence calibration.

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
pass does not include the full required input set and the available fixed-window
exports are not compatible with the 60-day gates used by the other primitives.
The safest current use is as a Depth contract component and research caveat
source. It should not yet affect V4 confidence bands, surfacing eligibility, or
economic artifacts.

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

Generate the following for at least three matching 60-day cohort/window keys:

- Depth Repertoire,
- Velocity Index,
- Quality Multiplier,
- Reliability Factor,
- V3 verdict metadata,
- Outcome Evidence only where customer-attested aggregate evidence exists.

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
