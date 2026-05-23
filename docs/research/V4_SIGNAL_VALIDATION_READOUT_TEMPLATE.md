# V4 Signal Validation Readout Template

Use this template for every V4 signal validation run. The completed artifact is
required by [V4_SIGNAL_VALIDATION_GATE.md](./V4_SIGNAL_VALIDATION_GATE.md).

This is dogfood validation only. Do not include raw prompts, raw outputs,
transcripts, person-level rows, direct identifiers, or raw event extracts.

## Candidate Signal

Name:

Signal family:

- [ ] Depth
- [ ] Delegation Depth
- [ ] Reusable Workflow Propagation
- [ ] Rapid Refinement
- [ ] Velocity x Depth Zone

## Validation Scope

Cohort:

Source table or export:

Taxonomy version or reference:

Diagnostic source:

Run date:

## Windows Or Cohorts Tested

| window_or_cohort | start | end | cohort_size | eligible_event_count | notes |
| --- | --- | --- | ---: | ---: | --- |
|  |  |  |  |  |  |
|  |  |  |  |  |  |
|  |  |  |  |  |  |

## Distribution Shape

| window_or_cohort | p50 | p90 | p99 | spread_ratio | share_metric | interpretation |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
|  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |

What distribution shape suggests:

What distribution shape cannot prove:

## Multi-Window Stability

Stability classification:

- [ ] stable
- [ ] directionally_stable
- [ ] unstable
- [ ] inconclusive

Evidence:

Instrumentation or taxonomy drift:

Unresolved stability questions:

## Coverage Review

Included surfaces:

Excluded surfaces:

Unmapped or ambiguous surfaces:

Suppressed windows or slices:

Coverage risks:

## Relationship To Velocity

Relationship:

- [ ] independent
- [ ] complementary
- [ ] dependent_on_velocity_breadth
- [ ] potentially_confounded_by_velocity

Frequency caveat:

Engagement caveat:

Breadth caveat:

## Relationship To Value-Realization Primitives

| primitive | relationship | caveat |
| --- | --- | --- |
| Quality Multiplier |  |  |
| Reliability Factor |  |  |
| Causal Delta |  |  |
| Outcome Evidence interpretation |  |  |
| Time-Saved Defensibility Range |  |  |
| AI Value Leakage Map |  |  |
| AI Scale Readiness Portfolio |  |  |
| Trust Calibration Index |  |  |

Specific executive or product decision supported:

## Governance Safety Review

- [ ] Aggregate-only output.
- [ ] No user IDs, names, emails, prompts, outputs, transcripts, or row-level events.
- [ ] No new canonical events.
- [ ] No new suppression reasons.
- [ ] No tunable thresholds.
- [ ] No admin overrides.
- [ ] No individual scoring.
- [ ] No team ranking.
- [ ] No maturity scoring.
- [ ] No productivity scoring.
- [ ] No ROI claim.
- [ ] No causal claim.
- [ ] No prediction claim.
- [ ] Default suppression when attribution, taxonomy, or coverage is ambiguous.

Safety notes:

## Promotion Rubric

| area | pass_hold_reject | evidence |
| --- | --- | --- |
| Behavioral validity |  |  |
| Taxonomy alignment |  |  |
| Multi-window stability |  |  |
| Distribution shape |  |  |
| Coverage |  |  |
| Velocity relationship |  |  |
| Value-realization relationship |  |  |
| Safety |  |  |

## Decision Outcome

Outcome:

- [ ] PROMOTE
- [ ] HOLD
- [ ] REJECT

Rationale:

If `PROMOTE`, what later productization work is eligible:

If `HOLD`, what evidence is missing:

If `REJECT`, what governance condition blocks use:

## Required Caveats

- This is dogfood validation only.
- PROMOTE means eligible for later productization, not automatically productized.
- HOLD means research-only.
- REJECT means must not be used in product readouts unless governance reopens it.
- No customer-facing readout may rely on this artifact without separate product governance.
