# V4 Time-Saved Defensibility Test Plan

## Purpose

This document records the first V4 Time-Saved Defensibility Range research
test. The goal is to decide whether time saved can move from a raw claim toward
a caveated defensibility range without becoming ROI, productivity measurement,
prediction, causal impact, or a customer-facing economic output.

This test is research-only. It does not authorize APIs, schemas, runtime
services, frontend surfaces, customer-facing economic readouts, ROI
calculations, causal claims, prediction claims, individual scoring, comparative
team evaluation, comparative department evaluation, productivity measurement,
maturity scoring, or automated recommendations.

## Inputs Reviewed

Contract and governance inputs:

- `docs/contracts/value-confidence/time-saved-defensibility-range.md`
- `docs/research/V4_TSDR_CAVEAT_PROPAGATION_DECISION.md`
- `docs/research/V4_MEASUREMENT_BUILD_PLAN.md`

Saved data inputs:

- `dogfood-output/v4-support-outcome-join/v4_support_outcome_join_window_summary.csv`
- `dogfood-output/v4-support-outcome-join/v4_support_outcome_comparison_fixture.csv`
- `dogfood-output/v4-support-join-key-test/v4_support_join_key_candidate_inventory.csv`
- `dogfood-output/v4-support-join-key-test/v4_gce_org_metadata_join_coverage.csv`
- `dogfood-output/v4-outcome-join-test/v4_outcome_join_readiness.csv`

Generated test outputs:

- `dogfood-output/v4-time-saved-defensibility-test/v4_time_saved_defensibility_readiness.csv`
- `dogfood-output/v4-time-saved-defensibility-test/v4_time_saved_defensibility_blocked_fixture.csv`

All generated outputs are aggregate-only. They do not include user IDs,
employee IDs, emails, raw tickets, ticket text, account names, raw prompts, raw
outputs, transcripts, raw event rows, raw skill names, or row-level source
records.

## Test Question

The test asks:

```text
Given V4 behavior evidence and support outcome context, can FluencyTracr emit a
time-saved defensibility range today?
```

The answer is no.

The better question is:

```text
Can FluencyTracr prove that it blocks the range correctly while preserving the
value-investigation path?
```

The answer is yes.

## Current Evidence State

The current data state is:

| Evidence area | Status | Interpretation |
| --- | --- | --- |
| Velocity x Depth behavior evidence | Ready | Useful as aggregate caveat/context and investigation routing. |
| Support outcome context | Ready | Zendesk support metrics are available for the same fixed windows. |
| Raw time-saved claim | Missing | No retained V4 export contains a source claim. |
| Customer-owned assumptions | Missing | No assumption ledger exists for baseline time, volume, recapture, or accepted scenario. |
| Behavior-to-support attribution | Held | No approved aggregate join key connects behavior cohorts to support outcomes. |
| Causality design | Not present | Movement remains descriptive only. |
| Depth Repertoire role | Caveat only | It must not adjust range values, confidence, eligibility, or economic interpretation. |

## Support Context

Support outcome context is useful, but bounded:

| Window | Support tickets | p50 days elapsed | p90 days elapsed | p50 business minutes to first response | Scale candidate share | Trust evidence gap share |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `window_1` | 4,469 | 13 | 26 | 183 | 2.32% | 97.30% |
| `window_2` | 4,549 | 15 | 35 | 212 | 2.10% | 97.59% |
| `window_3` | 4,163 | 15 | 43 | 218 | 1.19% | 98.67% |

This supports a value investigation because support response and age context
improves from the earliest to latest window while behavior context also moves
modestly. It does not support time-saved range output because the required range
inputs are missing or held.

## Required Range Inputs

A future range test requires all of the following:

- source raw time-saved claim for the same window,
- customer-owned workflow volume assumption,
- customer-owned baseline time assumption,
- customer-owned recapture or scenario assumption,
- surfaced aggregate behavior evidence,
- support or other outcome context where available,
- approved aggregate behavior-to-outcome join key, or explicit caveat that no
  attribution is claimed,
- `NOT_CAUSAL` status unless a separately governed causal design exists.

If any required input is missing, the range must be null or absent.

## Decision

`PROMOTE_TSDR_RESEARCH_GATE`

Also:

`HOLD_TSDR_RANGE_OUTPUT`

The method is useful as a gate. It correctly distinguishes a value
investigation from a defensible range. The current data does not support range
hours, dollars, ROI, productivity, or causal interpretation.

## Org-Wide Reuse Boundary

This gate should be designed for reuse across the organization once valid
aggregate joins exist.

Potential future org-wide use cases:

- support segments,
- onboarding or implementation cohorts,
- approved department/function segments,
- workflow or surface families,
- AI Scale Readiness zones,
- customer/account outcome contexts.

The reusable method is:

```text
behavior evidence + outcome context + customer-owned assumptions + approved
aggregate join key -> range eligibility decision
```

Not:

```text
behavior evidence -> time saved -> ROI
```

The first formula is the path. The second is the drift risk.

## What This Test Proves

This test proves:

- the Time-Saved layer can consume the current V4 evidence state safely,
- support context can travel as a caveat,
- missing assumptions block range values,
- held attribution blocks stronger economic interpretation,
- Depth Repertoire stays caveat-only,
- the method can be reused across future org-wide segments if the joins are
  approved.

This test does not prove:

- time saved,
- ROI,
- productivity lift,
- causal impact,
- support-team performance,
- department-level economic value,
- customer-facing economic readiness.

## Required Next Test

The next test should use a small assumption-ledger fixture.

The fixture should include:

- `assumption_set_id`,
- `source_claim_hours`,
- `baseline_time_assumption`,
- `workflow_volume_assumption`,
- `recapture_assumption`,
- `assumption_owner`,
- `assumption_status`,
- `approved_use`,
- `blocked_use`.

The purpose is to test whether customer-owned assumptions can attach to the
range gate without becoming hidden defaults, thresholds, benchmarks, or
productized ROI.

## Governance Safety Review

This test preserves the nine invariants:

1. It adds no canonical events.
2. It adds no suppression reasons.
3. It adds no tunable thresholds.
4. It adds no admin overrides.
5. It emits no individual scoring or user-identifiable output.
6. It preserves fail-closed range suppression.
7. It does not use latency as a surfacing trigger.
8. It remains docs and saved aggregate research only.
9. It does not aggregate across slices to re-identify people or teams.

## What Remains Blocked

The following remain blocked:

- range hours in current outputs,
- dollarized savings,
- ROI,
- productivity measurement,
- causal impact,
- prediction,
- customer-facing economic output,
- runtime Time-Saved Defensibility Range implementation,
- individual, team, manager, department, customer, or skill ranking,
- department-level economic claims without an approved aggregate segment join.

## Open Questions

- What source owns the raw Glean time-saved claim for the same fixed windows?
- Who can own the first assumption ledger?
- Should the first assumption fixture be support-specific or generic across
  outcome domains?
- Should support context remain caveat-only until a behavior-to-support join key
  is approved?
- What minimum assumption metadata is required before a range can be emitted?
