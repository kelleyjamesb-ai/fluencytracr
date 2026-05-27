# V4 Outcome Join Test Plan

## Purpose

This document defines the first research-only test for joining V4 aggregate
behavior evidence to external business outcome metrics. It exists to answer a
bounded question:

```text
Which customer-owned outcome metric is safe and useful enough to attach to the
behavior evidence for a value investigation?
```

It does not authorize APIs, schemas, runtime services, customer-facing economic
readouts, ROI calculations, causal claims, prediction claims, individual
scoring, comparative team evaluation, comparative department evaluation,
productivity measurement, maturity scoring, or automated recommendations.

## Why This Matters

Velocity, Depth Repertoire, segment overlay, trust classification, and the
Value Realization Strategy Layer can identify where AI behavior looks
promising, shallow, held, or suppressed. They cannot by themselves prove that a
business outcome improved.

The outcome join is the next required bridge. It should connect aggregate
behavior evidence to a customer-owned operational metric, while preserving the
difference between:

- behavior evidence,
- outcome context,
- customer-owned assumptions,
- descriptive movement,
- and causal or economic proof.

That distinction is the guardrail. Without it, V4 would risk turning strong
usage patterns into unsupported value claims.

## Inputs Reviewed

This initial test reviewed the retained aggregate V4 research exports:

- `dogfood-output/v4-value-realization-strategy/v4_value_realization_strategy_summary.csv`
- `dogfood-output/v4-velocity-depth-zone/v4_velocity_depth_zone_summary_safe.csv`
- `dogfood-output/v4-behavior-cohort-joint-distribution/v4_behavior_cohort_joint_summary_safe.csv`
- `dogfood-output/v4-readout-zone-data-test/v4_readout_zone_data_test_summary.csv`
- `dogfood-output/v4-segment-overlay-test/v4_segment_overlay_summary.csv`

The retained exports are aggregate-only. They do not contain raw user IDs,
emails, raw prompts, raw outputs, transcripts, raw event rows, or raw skill
names.

## Current Saved-Data Finding

The saved V4 behavior exports are ready to receive an aggregate outcome join,
but they do not yet contain real business outcome metrics.

Observed saved-data result:

| Readiness check | Current status | Result |
| --- | --- | --- |
| Behavior evidence alignment | Ready | Promote outcome join research design |
| Outcome metric identity | Missing | Hold for customer-owned outcome source |
| Outcome window alignment | Partial behavior windows only | Hold for window-aligned outcome export |
| Customer-owned assumptions | Missing | Hold for customer-owned assumptions |
| Monetary value status | Blocked | Hold economic output |
| Causality design | Not present | Not causal only |
| Aggregation boundary | Ready as design constraint | Promote aggregate-only join shape |
| Recommended first domain | Support or onboarding | Promote first bounded test |

The Value Realization Strategy Layer already records the economic blocker:

| Monetary value status | Rows |
| --- | ---: |
| `BLOCKED_PENDING_OUTCOME_EVIDENCE` | 26 |
| `BLOCKED_SUPPRESSED` | 37 |
| `BLOCKED_PENDING_TRUST_EVIDENCE` | 111 |

This means the current evidence is useful for routing value investigation, but
not for economic output.

Saved readiness artifact:

- `dogfood-output/v4-outcome-join-test/v4_outcome_join_readiness.csv`

## Required Outcome Join Shape

The first outcome export should be aggregate-only and window-aligned. It should
include:

- fixed window ID,
- outcome domain,
- source system,
- outcome metric name,
- outcome unit,
- aggregate join key type,
- aggregate join key,
- baseline window,
- comparison window,
- baseline value,
- comparison value,
- cohort size,
- source coverage status,
- customer-owned assumption status,
- causality status,
- allowed interpretation.

Allowed aggregate join key types include:

- workflow,
- governed surface,
- AI Scale Readiness zone,
- Velocity band,
- Depth Repertoire band,
- approved aggregate segment.

The export must not include direct identifiers, raw tickets, raw opportunities,
raw employee records, raw account names, raw notes, raw prompts, raw outputs, or
row-level source-system records.

## Recommended First Test Domains

Support is the cleanest first candidate because operational metrics are often
time-windowed and less noisy than revenue metrics.

Candidate support metrics:

- time to resolution,
- reopen rate,
- escalation rate,
- backlog movement,
- first-contact resolution,
- customer wait time.

Onboarding is also a strong candidate because it connects naturally to tenure
cohorts and ramp patterns.

Candidate onboarding metrics:

- time to first productive milestone,
- ramp milestone completion,
- enablement completion,
- manager-attested readiness milestone,
- help-seeking or support-burden movement.

Sales should come later. Sales has strategic value, but stage velocity,
qualified pipeline, and win-rate movement are noisier and easier to overread
without stronger controls.

## Relationship To Intervention Tracking

The outcome join should account for intervention timing, but it should not wait
for a full intervention ledger before being designed.

There are two valid paths:

1. **Outcome context without intervention.** Join aggregate behavior windows to
   aggregate outcome windows and report descriptive alignment only.
2. **Outcome context with intervention.** Add an approved aggregate intervention
   ledger and report pre/post movement without causal claims.

The current saved exports do not contain intervention identity, intervention
timing, source owner, target scope, or expected movement. Any movement narrative
must remain held until that ledger exists.

## Decision

`PROMOTE_OUTCOME_JOIN_RESEARCH_DESIGN`

Also:

`HOLD_FOR_CUSTOMER_OWNED_OUTCOME_SOURCE`

The design is ready. The current saved data is not enough to support outcome
interpretation, dollarization, ROI, causality, or a customer-facing economic
readout.

## Required Next Test

Create one small aggregate outcome fixture or approved dogfood export for either
support or onboarding.

Minimum fields:

- `window_id`
- `outcome_domain`
- `source_system`
- `outcome_metric_name`
- `outcome_unit`
- `aggregate_join_key_type`
- `aggregate_join_key`
- `baseline_window`
- `comparison_window`
- `baseline_value`
- `comparison_value`
- `cohort_size`
- `source_coverage_status`
- `customer_owned_assumption_status`
- `causality_status`
- `allowed_interpretation`

The first test should ask:

```text
Does attaching one aggregate outcome metric change the value investigation
posture without creating ROI, productivity, prediction, or causal claims?
```

## Governance Safety Review

This outcome join test preserves the nine invariants:

1. It adds no canonical events.
2. It adds no suppression reasons.
3. It adds no tunable thresholds.
4. It adds no admin overrides.
5. It emits no individual scoring or user-identifiable output.
6. It preserves fail-closed hold states.
7. It does not use latency as a surfacing trigger.
8. It remains docs and saved aggregate research only.
9. It evaluates aggregate slices independently.

## What Remains Blocked

The following remain blocked:

- customer-facing economic output,
- ROI,
- guaranteed savings,
- productivity measurement,
- causal impact,
- prediction,
- Time-Saved Defensibility Range productization,
- individual, team, manager, department, customer, or skill ranking,
- dollarization from behavior evidence alone.

## Open Questions

- Should support or onboarding be the first real outcome source?
- Which source owner can approve a window-aligned aggregate export?
- Should the first join key be readout zone, behavior band, workflow, or
  approved aggregate segment?
- What customer-owned assumptions are required before a later defensibility
  range can be tested?
- How should outcome coverage gaps propagate into the Value Realization Strategy
  Layer?
