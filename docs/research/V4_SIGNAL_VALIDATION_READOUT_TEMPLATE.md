# V4 Signal Validation Readout Template

Use this template for every V4 signal validation run. The completed artifact is
required by [V4_SIGNAL_VALIDATION_GATE.md](./V4_SIGNAL_VALIDATION_GATE.md).

This is dogfood validation only. Do not include raw prompts, raw outputs,
transcripts, person-level rows, direct identifiers, or raw event extracts.

## Run Date

Run date:

Operator:

Review meeting date:

## Data Windows

| window | start | end | cohort_definition | comparable | notes |
| --- | --- | --- | --- | --- | --- |
| window_1 |  |  |  |  |  |
| window_2 |  |  |  |  |  |
| window_3 |  |  |  |  |  |

If fewer than three comparable windows are available, decision must default to
`HOLD`.

## Tables Queried

| table_or_export | purpose | owner | notes |
| --- | --- | --- | --- |
|  |  |  |  |

## Signals Evaluated

- [ ] depth
- [ ] delegation_depth
- [ ] reusable_workflow_propagation
- [ ] rapid_refinement
- [ ] velocity_depth_zone

## Signal Promotion Table

Allowed `product_destination` values:

- V4 Depth Contract
- Trust Calibration Index
- Scale Readiness Portfolio
- Value Leakage Map
- Research Only
- Reject

| signal_name | decision | confidence | evidence_summary | primary_reason | product_destination | required_followup |
| --- | --- | --- | --- | --- | --- | --- |
| depth |  |  |  |  |  |  |
| delegation_depth |  |  |  |  |  |  |
| reusable_workflow_propagation |  |  |  |  |  |  |
| rapid_refinement |  |  |  |  |  |  |
| velocity_depth_zone |  |  |  |  |  |  |

Allowed decisions:

- `PROMOTE`
- `HOLD`
- `REJECT`

`PROMOTE` means eligible for later productization, not automatically
productized. `HOLD` means research-only. `REJECT` means must not be used in
product readouts unless governance reopens it.

## Stability Notes

Multi-window stability classification:

- [ ] stable
- [ ] directionally_stable
- [ ] unstable
- [ ] inconclusive

Evidence:

Instrumentation or taxonomy drift:

Unresolved stability questions:

## Coverage Notes

Included surfaces:

Excluded surfaces:

Unmapped or ambiguous surfaces:

Suppressed windows or slices:

Missing exports:

Coverage risks:

## Governance Notes

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
- [ ] Default suppression when attribution, taxonomy, coverage, or stability is ambiguous.

Safety notes:

## Decision

Overall decision:

- [ ] PROMOTE
- [ ] HOLD
- [ ] REJECT

Rationale:

Decision owner:

Required caveats:

## Next Phase Recommendation

Recommended next phase:

- [ ] product contract proposal
- [ ] transformer enhancement
- [ ] mapping improvement
- [ ] additional dogfood validation
- [ ] reject and archive

Recommended destination:

- [ ] V4 Depth Contract
- [ ] Trust Calibration Index
- [ ] Scale Readiness Portfolio
- [ ] Value Leakage Map
- [ ] Research Only
- [ ] Reject

Required follow-up PRs:

## Open Questions

-
