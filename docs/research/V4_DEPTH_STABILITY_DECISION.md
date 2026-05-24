# V4 Depth Stability Decision

## Purpose

This document records the research decision for whether the dogfood-only V4
Depth Readout is stable enough to harden into a formal contract.

The decision is intentionally separate from the Depth concept and the Depth
Readout Engine. A readable dogfood output is not enough. Stable, repeatable,
aggregate-safe behavior across fixed windows is required before any V4 economic
readout, Time-Saved Defensibility Range implementation, product contract, API,
schema, or frontend surface can depend on Depth.

## Inputs Reviewed

Concept, governance, and runbook inputs:

- [DEPTH.md](../concepts/DEPTH.md)
- [DELEGATION_DEPTH.md](../concepts/DELEGATION_DEPTH.md)
- [VELOCITY.md](../concepts/VELOCITY.md)
- [V4_VALUE_CONFIDENCE_LAYER.md](../concepts/V4_VALUE_CONFIDENCE_LAYER.md)
- [V4_SIGNAL_VALIDATION_GATE.md](./V4_SIGNAL_VALIDATION_GATE.md)
- [V4_DEPTH_READOUT_RUNBOOK.md](./V4_DEPTH_READOUT_RUNBOOK.md)
- [V4_VALIDATION_PLAN.md](./V4_VALIDATION_PLAN.md)
- [Value Realization Contracts](../integrations/value-realization/INDEX.md)

Dogfood outputs reviewed:

- `dogfood-output/v4-depth-readout/V4_DEPTH_READOUT.md`
- `dogfood-output/v4-depth-readout/v4_depth_summary.json`
- `dogfood-output/v4-depth-readout/v4_depth_by_surface.csv`

The outputs were generated from three fixed BigQuery windows over the
scio-prod scrubbed GCE table:

| Window | Start | End |
| --- | --- | --- |
| 1 | `2026-03-23T00:00:00Z` | `2026-04-12T00:00:00Z` |
| 2 | `2026-04-12T00:00:00Z` | `2026-05-02T00:00:00Z` |
| 3 | `2026-05-02T00:00:00Z` | `2026-05-22T00:00:00Z` |

Required aggregate input files were present:

- `v4_delegation_window_1.csv`
- `v4_delegation_window_2.csv`
- `v4_delegation_window_3.csv`
- `v4_refinement_window_1.csv`
- `v4_refinement_window_2.csv`
- `v4_refinement_window_3.csv`
- `v4_velocity_window_1.csv`
- `v4_velocity_window_2.csv`
- `v4_velocity_window_3.csv`

No optional reusable workflow propagation files were present.

## Depth Readout Summary

The Depth Readout Engine completed successfully with status `PASS`.

Summary output:

| Metric | Result |
| --- | ---: |
| Surfaces evaluated | 30 |
| Required input files missing | 0 |
| Missing required columns | 0 |
| Person-level fields present | false |
| `OPERATING_LEVERAGE_CANDIDATE` | 0 |
| `FRAGILE_SCALE_CANDIDATE` | 0 |
| `FOCUSED_DEPTH_CANDIDATE` | 26 |
| `THIN_USE_CANDIDATE` | 0 |
| `INSUFFICIENT_EVIDENCE` | 0 |
| `SUPPRESSED` | 4 |

Suppressed surfaces:

- `workflow:A2A`
- `workflow:AGENT_PARITY_EVAL`
- `workflow:AI_ANSWER_DEEPER`
- `workflow:PRISM_COMPILER`

All four suppressed surfaces were suppressed for sparse cohort evidence.

## Zone Stability Assessment

Status: `HOLD`

The readout consumed three fixed windows, which satisfies the minimum input
shape for a stability review. However, the generated output currently reports
the final averaged surface table and zone counts, not explicit per-window zone
transitions. That means cross-window zone movement cannot yet be audited from
the readout artifact itself.

The observed zone distribution is also too uniform to promote. Twenty-six of
thirty surfaces land in `FOCUSED_DEPTH_CANDIDATE`; no surfaced workflow lands in
`OPERATING_LEVERAGE_CANDIDATE`, `FRAGILE_SCALE_CANDIDATE`, or
`THIN_USE_CANDIDATE`. That may reflect the scio-prod usage shape, but it may
also reflect the current Depth computation saturating too easily.

The strongest evidence for holding is that `depth_index = 1.0` for every
non-suppressed surface with Depth evidence. A stability decision should not
promote a readout whose Depth side has effectively no discrimination across
surface types.

## Velocity vs Depth Interpretation

Velocity and Depth do change interpretation beyond Velocity alone, but not yet
with enough resolution for contract hardening.

Velocity is below the dogfood high-velocity heuristic for every evaluated
surface. Observed `velocity_index` ranges from `0.067938` to `0.395136`, with
no surface reaching the `0.70` high-velocity heuristic.

Depth points in the opposite direction: nearly every non-suppressed surface
receives `depth_index = 1.0`. This creates the dominant readout pattern:
low-to-moderate Velocity paired with high Depth, classified as
`FOCUSED_DEPTH_CANDIDATE`.

That distinction is directionally useful. It says the current readout can
separate adoption energy from work-integration evidence. But the Depth side is
too saturated to support a durable product contract. Before promotion, the
readout needs more discriminating Depth components and explicit per-window zone
movement.

## Evidence Gaps

Current evidence gaps:

- Delegation export is bucket-level for one or more surfaces.
- Bucket-level delegation evidence is correctly treated as aggregate context,
  not precise per-surface attribution.
- The generated output does not expose per-window zone transitions.
- `depth_index` saturates at `1.0` for all non-suppressed surfaces with Depth
  evidence.
- Delegation Depth does not yet contribute per-surface values in the generated
  surface table.
- Reusable Workflow Propagation remains unresolved because named workflow
  metadata observability is not yet reliable.

The key scientific boundary is preserved: bucket-level delegation evidence must
not be treated as precise per-surface attribution. The current readout honors
that boundary, but the consequence is that Depth is mostly driven by refinement
evidence.

## Reusable Workflow Propagation Status

Status: `HOLD`

Reusable Workflow Propagation and Named Workflow Leverage remain held until
metadata observability is resolved.

The real run included no optional reuse propagation rows:

| Field | Result |
| --- | --- |
| `rows_present` | 0 |
| `used_as_depth_driver` | false |
| `decision` | `HOLD` |

Named reusable workflow absence must continue to be treated as an observability
gap, not evidence of absence. No Depth decision may rely on reusable workflow
propagation as a promoted input until a reliable metadata field is found and
validated across fixed windows.

## Governance Safety Review

This decision preserves the governance posture:

- The Depth Readout is dogfood-only.
- Outputs are aggregate-only.
- No person-level fields were present in the generated summary.
- No individual scoring or person-level fields are allowed.
- No team, manager, department, or employee ranking is allowed.
- No productivity measurement is allowed.
- No ROI calculation is allowed.
- No causal claim is allowed.
- No prediction claim is allowed.
- No suppressed economic value, hours saved, upside estimate, or portfolio total
  may be emitted.
- No new canonical events are added.
- No new suppression reasons are added.
- No tunable thresholds or admin overrides are added.
- Bucket-level delegation evidence is treated as aggregate context, not precise
  per-surface attribution.

Stable Depth readout behavior is required before V4 economic readouts can be
built.

## Decision

Decision: `HOLD_FOR_SIGNAL_REFINEMENT`

Rationale: the real dogfood run completed successfully and produced
aggregate-safe outputs across three fixed windows, but the readout is not stable
or discriminating enough for contract hardening.

The hold is not because data is missing. The hold is because the signal needs
refinement:

- all non-suppressed surfaces with Depth evidence receive `depth_index = 1.0`,
- the output does not expose per-window zone movement,
- delegation remains bucket-level context rather than per-surface attribution,
- reusable workflow propagation remains held, and
- the readout produces only one non-suppressed zone in this run.

This is promising dogfood evidence for continuing V4 Depth research. It is not
permission to build V4 economic readouts.

## Required Next Phase

Next phase: refine the V4 Depth Readout before contract hardening.

Required work:

- Add per-window zone output so stability can be audited directly.
- Reduce refinement-depth saturation so non-suppressed surfaces can separate
  meaningfully.
- Improve per-surface Delegation Depth exports or keep delegation explicitly as
  aggregate context.
- Keep Reusable Workflow Propagation held until metadata observability is
  resolved.
- Re-run the same three-window scio-prod readout after refinement.
- Revisit this decision only after the readout shows stable zones with
  interpretable variance.

If broad Depth remains too uniform after refinement, narrow the next contract
candidate to specific subsignals such as MCP repeat depth, AI Summary repeat
depth, or confirmed same-session refinement rather than promoting broad Depth.

## What Remains Blocked

The following remain blocked while this decision is
`HOLD_FOR_SIGNAL_REFINEMENT`:

- Depth contract hardening.
- Value Confidence contract hardening based on Depth outputs.
- Time-Saved Defensibility Range implementation.
- Any V4 economic API.
- Any V4 customer-facing economic readout.
- Any product surface that depends on Depth zones.
- Any use of Depth to calculate dollar values, hours saved, upside estimates,
  portfolio totals, ROI, causal lift, or predictions.

No economic value range should be built from Depth until stability and
interpretive variance are demonstrated.

## Open Questions

- Why does refinement Depth saturate at `1.0` across nearly every
  non-suppressed surface?
- Should the readout expose per-window zones and per-window component indexes
  as first-class outputs?
- Which Depth component should distinguish high-repeat but low-integration
  behavior from true work integration?
- Can delegation become per-surface without inventing attribution precision?
- What metadata field, if any, can promote Reusable Workflow Propagation from
  `HOLD`?
- If broad Depth remains uniform, which subsignal is the safest narrow
  candidate for contract hardening?
