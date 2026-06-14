# V4 Support Outcome Join Test Readout

## Purpose

This readout records the first V4 support outcome join test. The goal was to
attach aggregate Zendesk support outcome context to the same fixed windows used
by the V4 behavior evidence and determine whether the join is useful enough for
Economic Impact Bridge routing.

This is research-only. It does not authorize APIs, schemas, runtime services,
customer-facing economic readouts, ROI calculations, causal claims, prediction
claims, individual scoring, comparative team evaluation, comparative department
evaluation, productivity measurement, maturity scoring, or automated
recommendations.

## Inputs Reviewed

Behavior inputs:

- `dogfood-output/v4-velocity-depth-zone/v4_velocity_depth_zone_window_1.csv`
- `dogfood-output/v4-velocity-depth-zone/v4_velocity_depth_zone_window_2.csv`
- `dogfood-output/v4-velocity-depth-zone/v4_velocity_depth_zone_window_3.csv`

Support outcome input:

- `dogfood-output/v4-outcome-source-inventory/zendesk_support_outcome_inventory.csv`

Generated support join outputs:

- `dogfood-output/v4-support-outcome-join/v4_support_outcome_join_window_summary.csv`
- `dogfood-output/v4-support-outcome-join/v4_support_outcome_join_by_zone.csv`
- `dogfood-output/v4-support-outcome-join/v4_support_outcome_comparison_fixture.csv`

All outputs are aggregate-only. They do not include user IDs, employee IDs,
emails, raw tickets, ticket subjects, ticket descriptions, account names, raw
prompts, raw outputs, transcripts, raw event rows, or raw skill names.

## Join Method

The first support join uses:

```text
aggregate_join_key_type = fixed_window_context
aggregate_join_key = window_id
```

This is intentionally conservative. It means support outcome context is aligned
to the same fixed windows as V4 behavior evidence, but it is not attributed to a
specific behavior cohort, department, manager, team, employee, customer, or
workflow.

The current join can support:

- descriptive outcome context,
- Economic Impact Bridge routing,
- value investigation prioritization,
- source-readiness decisions.

It cannot support:

- ROI,
- causality,
- productivity measurement,
- prediction,
- department-level economic claims,
- support-team performance claims,
- behavior-to-outcome attribution.

## Window-Level Finding

| Window | Behavior rows | Cohort rows | Scale candidate share | Trust evidence gap share | Support tickets | p50 days elapsed | p90 days elapsed | p50 business minutes to first response |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `window_1` | 153 | 2,238,715 | 2.32% | 97.30% | 4,469 | 13 | 26 | 183 |
| `window_2` | 141 | 2,222,614 | 2.10% | 97.59% | 4,549 | 15 | 35 | 212 |
| `window_3` | 130 | 2,219,511 | 1.19% | 98.67% | 4,163 | 15 | 43 | 218 |

Descriptive movement from `window_3` to `window_1`:

| Metric | Baseline | Comparison | Movement |
| --- | ---: | ---: | ---: |
| Support ticket count | 4,163 | 4,469 | +306 |
| Support p50 days elapsed | 15 | 13 | -2 |
| Support p90 days elapsed | 43 | 26 | -17 |
| Support p50 business minutes to first response | 218 | 183 | -35 |
| Scale candidate cohort share | 1.19% | 2.32% | +1.14 pts |
| Trust evidence gap cohort share | 98.67% | 97.30% | -1.37 pts |

This is a useful signal for value investigation because support response and age
metrics improved while the behavior readout also showed a larger scale-candidate
share. It is not proof that one caused the other.

## Interpretation

The support join works as an outcome-context layer.

It does not yet work as a behavior-attribution layer.

That distinction matters. The test shows that V4 can place support outcome
movement next to aggregate behavior movement in a governed readout, but it does
not yet prove that AI behavior caused support movement or that support value can
be dollarized.

The strongest safe statement is:

```text
Support outcome context is available for the same windows as V4 behavior
evidence. The latest window shows better support response and age context than
the earliest window, while V4 behavior evidence shows a modest increase in
scale-candidate share. This warrants support value investigation, not ROI or
causal interpretation.
```

## Decision

`PROMOTE_SUPPORT_OUTCOME_CONTEXT_JOIN`

Also:

`HOLD_BEHAVIOR_TO_OUTCOME_ATTRIBUTION`

The support join should move forward as a research input to the Economic Impact
Bridge. It should not become a customer-facing economic output or Time-Saved
Defensibility Range input until an approved aggregate behavior-to-outcome join
key exists.

## Required Next Test

The next test should look for a governed aggregate join key that can connect
support outcome movement to behavior cohorts without individual-level output.

Candidate join keys to investigate:

- support organization or account mapped to aggregate customer outcome context,
- support group or queue mapped to approved aggregate support segment,
- internal support function segment if an approved HRIS/directory join exists,
- AI Scale Readiness zone only as window-level context unless a stronger join is
  approved.

If no safe join key exists, the support outcome join should remain
`OUTCOME_CONTEXT_ONLY`.

## Governance Safety Review

This test preserves the nine invariants:

1. It adds no canonical events.
2. It adds no suppression reasons.
3. It adds no tunable thresholds.
4. It adds no admin overrides.
5. It emits no individual scoring or user-identifiable output.
6. It preserves fail-closed hold language.
7. It does not use latency as a surfacing trigger.
8. It remains docs and saved aggregate research only.
9. It does not aggregate across slices to re-identify people or teams.

## What Remains Blocked

The following remain blocked:

- ROI,
- dollarized savings,
- productivity measurement,
- causal impact,
- prediction,
- customer-facing economic output,
- Time-Saved Defensibility Range productization,
- individual, team, manager, department, customer, or skill ranking,
- support-team performance claims,
- department-level economic claims without an approved aggregate segment join.

## Open Questions

- Is there an approved aggregate support segment join that can connect behavior
  cohorts to support outcomes?
- Should the first stronger join use support group, support organization,
  account, or function-level aggregate segment?
- Can support outcome context remain useful if attribution stays held?
- Which support owner should review whether `days_elapsed` and first-response
  minutes are the right metrics for the value investigation?
