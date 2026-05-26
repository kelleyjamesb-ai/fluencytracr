# V4 Readout Zone Data Test

## Purpose

This document tests the Workstreams 1-3 artifacts against the retained Glean
dogfood aggregate CSVs.

Artifacts tested:

- [V4 Readout Zone Model](./V4_READOUT_ZONE_MODEL.md)
- [V4 Behavior Feature Backlog](./V4_BEHAVIOR_FEATURE_BACKLOG.md)
- [V4 Value Hypothesis Map](./V4_VALUE_HYPOTHESIS_MAP.md)

This is a saved-data test only. It does not re-query BigQuery, introduce new
events, change suppression gates, create runtime behavior, calculate ROI, make
causal claims, make prediction claims, rank groups, or emit customer-facing
economic output.

## Inputs

Reviewed retained aggregate inputs:

- `dogfood-output/v4-behavior-cohort-joint-distribution/v4_behavior_cohort_joint_all_windows.csv`
- `dogfood-output/v4-behavior-cohort-joint-distribution/v4_behavior_cohort_joint_summary_safe.csv`
- [V4 Behavior Cohort Promotion Decision](./V4_BEHAVIOR_COHORT_PROMOTION_DECISION.md)

Derived aggregate outputs saved by this test:

- `dogfood-output/v4-readout-zone-data-test/v4_readout_zone_data_test_all_windows.csv`
- `dogfood-output/v4-readout-zone-data-test/v4_readout_zone_data_test_summary.csv`
- `dogfood-output/v4-readout-zone-data-test/v4_readout_zone_data_test_by_dimension.csv`

All derived outputs remain aggregate-only. Suppressed small cells remain
suppressed.

## Test Method

The test applied the zone model conservatively:

| Data condition | Test result |
| --- | --- |
| Existing suppression status is `SUPPRESS` or readiness decision is `HOLD_SMALL_CELL_SUPPRESSED`. | `SUPPRESSED` |
| Row is an AGENT delegation or Skill Read presence dimension. | `INSTRUMENTATION_HOLD_CONTEXT_ONLY_AXIS` |
| Trust classification is not `ATTRIBUTABLE_TRUST_SIGNAL`. | `TRUST_EVIDENCE_GAP` |
| Depth Repertoire band is `ACTIVE_BUT_SHALLOW` with attributable trust. | `SHALLOW_ADOPTION` |
| Depth Repertoire band is `INTEGRATED_REPERTOIRE` or `FOCUSED_INTEGRATION` with attributable trust. | `FOCUSED_EXPERT_USE` |
| Velocity band is `HIGH_VELOCITY` or `MEDIUM_VELOCITY` with attributable trust. | `UNASSIGNED_NEEDS_DEPTH_JOIN_FOR_SCALE_OR_SHALLOW` |
| Velocity band is `LOW_VELOCITY` with attributable trust. | `UNASSIGNED_NEEDS_DEPTH_JOIN_FOR_FOCUSED_OR_HOLD` |

The unassigned Velocity cases are intentional. The zone model requires stable
Velocity plus stable Depth Repertoire before assigning `SCALE_CANDIDATE`. The
retained CSVs test Velocity and Depth as separate cohort dimensions, so they do
not prove the strict Velocity x Depth condition.

## Aggregate Results

All-window aggregate rows:

| Test result | Aggregate row count | Value-hypothesis result |
| --- | ---: | --- |
| `TRUST_EVIDENCE_GAP` | 272 | `UNCLASSIFIED_TRUST_LOOP_INVESTIGATION` |
| `INSTRUMENTATION_HOLD_CONTEXT_ONLY_AXIS` | 144 | `NO_VALUE_HYPOTHESIS_SOURCE_READINESS_REMEDIATION` |
| `UNASSIGNED_NEEDS_DEPTH_JOIN_FOR_SCALE_OR_SHALLOW` | 36 | `NO_STRICT_HYPOTHESIS_REQUIRES_VELOCITY_DEPTH_JOIN` |
| `SUPPRESSED` | 20 | `NO_VALUE_HYPOTHESIS` |
| `FOCUSED_EXPERT_USE` | 18 | `NET_NEW_OR_QUALITY_PREMIUM_CANDIDATE_REQUIRES_BUSINESS_CONTEXT` |
| `UNASSIGNED_NEEDS_DEPTH_JOIN_FOR_FOCUSED_OR_HOLD` | 14 | `NO_STRICT_HYPOTHESIS_REQUIRES_VELOCITY_DEPTH_JOIN` |
| `SHALLOW_ADOPTION` | 11 | `UNCLASSIFIED_FRICTION_INVESTIGATION` |

Stable safe-summary rows present in all three fixed windows:

| Test result | Aggregate row count | Value-hypothesis result |
| --- | ---: | --- |
| `TRUST_EVIDENCE_GAP` | 86 | `UNCLASSIFIED_TRUST_LOOP_INVESTIGATION` |
| `INSTRUMENTATION_HOLD_CONTEXT_ONLY_AXIS` | 48 | `NO_VALUE_HYPOTHESIS_SOURCE_READINESS_REMEDIATION` |
| `UNASSIGNED_NEEDS_DEPTH_JOIN_FOR_SCALE_OR_SHALLOW` | 12 | `NO_STRICT_HYPOTHESIS_REQUIRES_VELOCITY_DEPTH_JOIN` |
| `FOCUSED_EXPERT_USE` | 6 | `NET_NEW_OR_QUALITY_PREMIUM_CANDIDATE_REQUIRES_BUSINESS_CONTEXT` |
| `UNASSIGNED_NEEDS_DEPTH_JOIN_FOR_FOCUSED_OR_HOLD` | 4 | `NO_STRICT_HYPOTHESIS_REQUIRES_VELOCITY_DEPTH_JOIN` |
| `SHALLOW_ADOPTION` | 3 | `UNCLASSIFIED_FRICTION_INVESTIGATION` |

Counts are aggregate row counts, not unique users. They must not be summed
across cohort dimensions as population totals.

## What We Learned

The zone grammar is useful against retained data, but the strict
`SCALE_CANDIDATE` condition is not yet testable from the saved joint
distribution. The current export has Velocity rows and Depth Repertoire rows,
but it does not emit a single aggregate row that contains both bands together.

The strongest current signal is not "scale now." It is "most interpretable
economic language should remain blocked or unclassified until trust and source
evidence improve." Across all-window rows, 272 aggregate rows route to
`TRUST_EVIDENCE_GAP`, 144 route to instrumentation hold because AGENT and Skill
axes remain context-only, and 20 stay suppressed.

Depth Repertoire does produce useful operating separation. The retained data
finds 18 all-window aggregate rows that fit `FOCUSED_EXPERT_USE` and 11 that
fit `SHALLOW_ADOPTION`. In the stable safe summary, that becomes 6 focused-use
rows and 3 shallow-use rows present in all three fixed windows.

The value-hypothesis map behaves correctly under pressure. It does not produce
dollars or economic proof. Focused-use rows can route to `NET_NEW` or
`QUALITY_PREMIUM` candidate questions only with business context. Shallow rows
remain `UNCLASSIFIED` friction investigations. Trust gaps remain trust-loop
investigations. Suppressed and instrumentation-held rows produce no value
hypothesis.

## Follow-Up Data Test Completed

The follow-up data test added the needed aggregate export:

```text
velocity_band x depth_repertoire_band x trust_classification x
agent_delegation_classification x skill_read_presence_classification
```

The result is recorded in
[V4 Velocity x Depth Zone Test](./V4_VELOCITY_DEPTH_ZONE_TEST.md), with retained
CSV outputs under `dogfood-output/v4-velocity-depth-zone/`.

That export uses existing evidence only. It does not add canonical events,
suppression reasons, thresholds, raw identifiers, raw skill names, or economic
calculations. It confirms that strict `SCALE_CANDIDATE` rows exist in the
retained Glean dogfood evidence once Velocity and Depth Repertoire are joined,
while trust gaps remain the dominant hold state.
