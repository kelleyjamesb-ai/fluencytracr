# V4 Depth Stability Decision

## 1. Purpose

This document records the research decision for whether the dogfood-only V4
Depth Readout is stable enough to harden into a formal contract.

The decision is intentionally separate from the Depth concept and the Depth
Readout Engine. A readable dogfood output is not enough. Stable, repeatable,
aggregate-safe behavior across fixed windows is required before any V4 economic
readout, Time-Saved Defensibility Range implementation, product contract, API,
schema, or frontend surface can depend on Depth.

## 2. Inputs Reviewed

Reviewed inputs:

- [DEPTH.md](../concepts/DEPTH.md)
- [DELEGATION_DEPTH.md](../concepts/DELEGATION_DEPTH.md)
- [VELOCITY.md](../concepts/VELOCITY.md)
- [V4_VALUE_CONFIDENCE_LAYER.md](../concepts/V4_VALUE_CONFIDENCE_LAYER.md)
- [V4_SIGNAL_VALIDATION_GATE.md](./V4_SIGNAL_VALIDATION_GATE.md)
- [V4_DEPTH_READOUT_RUNBOOK.md](./V4_DEPTH_READOUT_RUNBOOK.md)
- [V4_VALIDATION_PLAN.md](./V4_VALIDATION_PLAN.md)
- [Value Realization Contracts](../integrations/value-realization/INDEX.md)

Expected dogfood outputs were not present in this checkout:

- `dogfood-output/v4-depth-readout/V4_DEPTH_READOUT.md`
- `dogfood-output/v4-depth-readout/v4_depth_summary.json`
- `dogfood-output/v4-depth-readout/v4_depth_by_surface.csv`

Because the real BigQuery Depth Readout outputs are missing, this document is a
decision template and blocker record. It does not promote Depth contract
hardening.

## 3. Depth Readout Summary

No real Depth Readout outputs were available for review.

The intended readout composes aggregate Velocity, Delegation Depth, and
refinement diagnostics into dogfood-only candidate zones. It is designed to
answer whether adoption energy and work integration move together in a stable,
interpretable, aggregate-safe way.

Until real outputs are supplied, no claims should be made about:

- which zones appear,
- which zones are stable,
- whether Depth changes interpretation beyond Velocity alone,
- whether surface-level output is sufficiently covered, or
- whether the readout is ready for contract hardening.

## 4. Multi-Window Stability Assessment

Status: `NOT_EVALUATED`

Required evidence:

- at least three fixed delegation exports,
- at least three fixed refinement exports,
- at least three fixed velocity exports,
- optional reusable workflow propagation exports held separately, and
- identical readout logic across all windows.

The multi-window requirement has not been satisfied in this decision record
because the generated outputs are absent. A single window, a synthetic fixture,
or a successful local run is insufficient to promote Depth.

## 5. Zone Stability Assessment

Status: `NOT_EVALUATED`

The candidate zones cannot be evaluated until `v4_depth_summary.json` and
`v4_depth_by_surface.csv` are available across the fixed-window run.

The review must specifically check whether zones are stable enough to interpret
without overclaiming:

- `OPERATING_LEVERAGE_CANDIDATE`
- `FRAGILE_SCALE_CANDIDATE`
- `FOCUSED_DEPTH_CANDIDATE`
- `THIN_USE_CANDIDATE`
- `INSUFFICIENT_EVIDENCE`
- `SUPPRESSED`

Zone names remain dogfood-only. They must not become product labels, rankings,
or customer-facing economic claims without separate contract hardening.

## 6. Evidence Gaps

Current gaps:

- Real BigQuery Depth Readout outputs are missing.
- Cross-window zone stability has not been assessed.
- Surface coverage and suppression behavior have not been reviewed against real
  exports.
- Bucket-level delegation evidence has not been reconciled with per-surface
  attribution limits in real outputs.
- Reusable Workflow Propagation remains unresolved because named workflow
  metadata observability is not yet reliable.

The key scientific boundary is preserved: bucket-level delegation evidence must
not be treated as precise per-surface attribution. If an export does not include
a defensible surface key, the readout may use bucket-level delegation only as
aggregate context or evidence-gap language.

## 7. Reusable Workflow Propagation Status

Status: `HOLD`

Reusable Workflow Propagation and Named Workflow Leverage remain held until
metadata observability is resolved. Prior diagnostics showed that the root
workflow snapshot join can be healthy while `productsnapshot.workflow.name` may
not be populated for matched AGENT snapshots in the observed export path.

That means named reusable workflow absence must be treated as an observability
gap, not evidence of absence. No Depth decision may rely on reusable workflow
propagation as a promoted input until a reliable metadata field is found and
validated across fixed windows.

## 8. Governance Safety Review

This decision preserves the governance posture:

- The Depth Readout is dogfood-only.
- Outputs must remain aggregate-only.
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
- Bucket-level delegation evidence must not be treated as precise per-surface
  attribution.

Stable Depth readout behavior is required before V4 economic readouts can be
built.

## 9. Decision

Decision: `HOLD_FOR_MORE_WINDOWS`

Rationale: the required dogfood output files are missing. Real BigQuery depth
outputs are required before promotion. Without those outputs, the repo cannot
assess zone stability, multi-window repeatability, coverage, or whether Depth
changes interpretation beyond Velocity alone.

This is an intentional hold, not a rejection. The readout engine can still be
used for dogfood research. It simply cannot support contract hardening or
economic readout implementation yet.

## 10. Required Next Phase

Run the V4 Depth Readout Engine against real aggregate BigQuery exports across
at least three fixed windows.

Required inputs:

- `v4_delegation_window_1.csv`
- `v4_delegation_window_2.csv`
- `v4_delegation_window_3.csv`
- `v4_refinement_window_1.csv`
- `v4_refinement_window_2.csv`
- `v4_refinement_window_3.csv`
- `v4_velocity_window_1.csv`
- `v4_velocity_window_2.csv`
- `v4_velocity_window_3.csv`

Optional inputs:

- `v4_reuse_propagation_window_1.csv`
- `v4_reuse_propagation_window_2.csv`
- `v4_reuse_propagation_window_3.csv`

Then update this decision with:

- windows reviewed,
- zone movement across windows,
- surface coverage,
- suppressed or insufficient-evidence outputs,
- evidence gaps,
- reusable workflow propagation status, and
- final decision.

## 11. What Remains Blocked

The following remain blocked while this decision is `HOLD_FOR_MORE_WINDOWS`:

- Depth contract hardening.
- Value Confidence contract hardening based on Depth outputs.
- Time-Saved Defensibility Range implementation.
- Any V4 economic API.
- Any V4 customer-facing economic readout.
- Any product surface that depends on Depth zones.
- Any use of Depth to calculate dollar values, hours saved, upside estimates,
  portfolio totals, ROI, causal lift, or predictions.

No economic value range should be built from Depth until stability is
demonstrated.

## 12. Open Questions

- Do the same zones appear across three fixed windows?
- Are zone changes explainable by behavior rather than instrumentation or
  export shape?
- Does Depth change interpretation beyond Velocity alone?
- Which surfaces have enough coverage for stable interpretation?
- Which surfaces remain `INSUFFICIENT_EVIDENCE` or `SUPPRESSED`?
- Can bucket-level delegation be safely retained as aggregate context without
  creating false per-surface precision?
- What metadata field, if any, can promote Reusable Workflow Propagation from
  `HOLD`?
- If broad Depth remains unstable, should V4 narrow to specific subsignals such
  as MCP repeat depth or AI Summary repeat depth?
