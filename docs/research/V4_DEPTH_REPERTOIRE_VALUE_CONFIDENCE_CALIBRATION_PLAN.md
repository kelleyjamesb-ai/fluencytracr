# V4 Depth Repertoire Value Confidence Calibration Plan

## Purpose

This plan defines the evidence required before Depth Repertoire may influence
V4 value-confidence artifacts.

It follows the value-confidence review decision
`HOLD_FOR_VALUE_CONFIDENCE_CALIBRATION`. The purpose is to turn that hold into a
clear test plan, not to implement an economic readout.

This is research/planning only. It adds no APIs, schemas, Prisma migrations,
runtime services, frontend surfaces, customer-facing economic readouts, ROI
calculation, causal claim, prediction claim, individual scoring, team
comparison, productivity scoring, or prohibited maturity label.

## Current State

Depth Repertoire has cleared two prior gates:

- The stability readout promoted it for contract hardening after three
  fixed-window dogfood exports showed stable p90/p99 shape and stable bucket
  medians.
- The hardened contract defines aggregate output shape, caveats, suppression
  behavior, and examples.

Depth Repertoire has not cleared value-confidence calibration. It remains
blocked from Time-Saved Defensibility Range, AI Value Leakage Map, AI Scale
Readiness Portfolio, Trust Calibration Index, V4 economic APIs, and
customer-facing economic artifacts.

## Calibration Question

The central question is:

```text
When Depth Repertoire changes, should the defensibility of a value claim change?
```

That must be answered without turning Depth Repertoire into a hidden threshold,
universal score, customer benchmark, or economic multiplier.

## Calibration Hypotheses

The plan tests three hypotheses:

| Hypothesis | What would support it | What would block it |
| --- | --- | --- |
| Caveat-only use | Depth Repertoire adds useful context but does not safely change confidence bands or eligibility. | The signal is too redundant with Velocity or too hard to explain. |
| Confidence-band modifier | Depth Repertoire changes confidence interpretation when paired with Velocity, Quality Multiplier, Reliability Factor, and Outcome Evidence. | The effect cannot be separated from existing primitives or creates hidden thresholds. |
| Eligibility input | Depth Repertoire helps determine whether a V4 economic artifact may surface at all. | Suppression behavior becomes ambiguous or reconstructs suppressed evidence. |

The default hypothesis is caveat-only use.

## Required Inputs

Calibration requires aggregate-only inputs:

- Depth Repertoire contract outputs,
- Velocity Index outputs for the same cohort/window,
- Quality Multiplier outputs for the same cohort/window,
- Reliability Factor outputs for the same cohort/window,
- Outcome Evidence where customer-attested aggregate data exists,
- V3 verdict and suppression metadata,
- required caveats and blocked claims from the Value Confidence contract.

Inputs must not include user IDs, emails, names, raw prompts, raw outputs,
transcripts, raw event rows, or person-level metrics.

## Test Matrix

Each test compares Depth Repertoire against an existing value-confidence
primitive.

| Test | Question | Passing evidence |
| --- | --- | --- |
| Depth Repertoire x Velocity | Does Depth Repertoire explain something beyond Velocity breadth and usage intensity? | Cohorts with similar Velocity but different Depth Repertoire require different caveats. |
| Depth Repertoire x Quality Multiplier | Does cross-surface return use change how quality evidence should be interpreted? | Differences improve caveat clarity without changing Quality Multiplier math. |
| Depth Repertoire x Reliability Factor | Does repeated cross-surface use coexist with operational dependability? | Low reliability still blocks or caveats value confidence even when Depth Repertoire is high. |
| Depth Repertoire x Outcome Evidence | Does customer-attested aggregate outcome context align with Depth Repertoire patterns? | Alignment is explainable without claiming causality. |
| Suppressed Depth Repertoire | What happens when Depth Repertoire is suppressed? | Downstream artifacts expose no reconstructed values and preserve blocked claims. |

## Decision Rubric

The calibration review must end with one decision:

| Decision | Meaning |
| --- | --- |
| `PROMOTE_CAVEAT_ONLY` | Depth Repertoire may appear as caveat/context in V4 artifacts but may not change confidence bands or eligibility. |
| `PROMOTE_CONFIDENCE_BAND_INPUT` | Depth Repertoire may influence confidence bands after a separate contract update defines exact behavior. |
| `PROMOTE_ELIGIBILITY_INPUT` | Depth Repertoire may participate in surfacing eligibility after a separate contract update defines fail-closed behavior. |
| `HOLD_FOR_MORE_CALIBRATION` | Evidence is promising but incomplete. |
| `REJECT_VALUE_CONFIDENCE_USE` | Depth Repertoire should remain a Depth-only contract and not feed V4 economic artifacts. |

Promotion in this plan does not implement runtime behavior. It only permits a
later contract or implementation PR.

## Evidence Requirements

To promote beyond hold, the calibration review must show:

- Depth Repertoire changes interpretation beyond Velocity alone.
- The change is explainable in plain language.
- The change does not create hidden thresholds or tunable constants.
- Suppressed Depth Repertoire cannot leak reconstructed values.
- Required caveats propagate cleanly.
- Quality Multiplier and Reliability Factor are not double-counted.
- Outcome Evidence is treated as aggregate context, not causal proof.
- Customer-side or held-out aggregate evidence supports the same interpretation
  beyond scio-prod.

## Governance Safety Review

The calibration plan preserves the nine invariants:

- no new canonical events,
- no new suppression reasons,
- no tunable thresholds,
- no admin overrides,
- no person-level outputs,
- default `SUPPRESS`,
- latency corroborative only,
- Assurance Harness expectations unchanged,
- per-slice independence unchanged.

It also preserves V4 boundaries:

- no customer-facing prediction claim,
- no ROI calculation,
- no causal productivity claim,
- no customer benchmark from Glean dogfood values,
- no universal product threshold,
- no hidden economic multiplier.

## Required Procedure

1. Select at least three aggregate cohorts or fixed windows.
2. Generate Depth Repertoire, Velocity, Quality Multiplier, Reliability Factor,
   and V3 verdict outputs for the same cohort/window keys.
3. Add Outcome Evidence only where customer-attested aggregate data exists.
4. Compare interpretation with and without Depth Repertoire.
5. Record whether Depth Repertoire changes caveats, confidence-band
   interpretation, eligibility interpretation, or nothing.
6. Verify suppressed cases expose no economics or reconstructed values.
7. Produce a calibration decision doc using the rubric above.

## Required Outputs

The calibration run must produce:

- `docs/research/V4_DEPTH_REPERTOIRE_VALUE_CONFIDENCE_CALIBRATION_DECISION.md`
- aggregate input summary,
- test matrix results,
- suppression behavior review,
- blocked claims review,
- recommended decision,
- required next phase.

No generated raw event data should be committed.

## What Remains Blocked

Until a calibration decision promotes a specific use, the following remain
blocked:

- Time-Saved Defensibility Range use of Depth Repertoire,
- AI Value Leakage Map use of Depth Repertoire,
- AI Scale Readiness Portfolio use of Depth Repertoire,
- Trust Calibration Index use of Depth Repertoire,
- any V4 economic API using Depth Repertoire,
- any customer-facing economic artifact using Depth Repertoire,
- any schema or runtime default derived from Glean dogfood values.

## Open Questions

- Is caveat-only use enough to make Depth Repertoire valuable in V4?
- Which existing primitive is most likely to be confounded with Depth
  Repertoire?
- What customer-side aggregate evidence is needed before economic dependency is
  safe?
- Should Depth Repertoire remain independent from confidence bands indefinitely?
- Which suppressed-readout scenario is the highest-risk case to test first?
