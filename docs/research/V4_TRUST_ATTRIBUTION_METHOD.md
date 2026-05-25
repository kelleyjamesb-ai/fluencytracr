# V4 Trust Attribution Method

## Purpose

This document defines how FluencyTracr measures trust attribution before any
Trust Calibration interpretation is allowed.

Trust attribution is a join-quality problem first. A verification or feedback
signal must attach to one governed parent surface before it can support any
trust classification. Signal volume alone is not enough.

This method adds no APIs, schemas, Prisma migrations, runtime services,
frontend surfaces, customer-facing economic readouts, ROI calculation, causal
claim, prediction claim, individual scoring, comparative team evaluation,
comparative department evaluation, productivity measurement, or maturity label.

## First-Principles Definition

Trust is not measured as user sentiment or maximum verification. Trust is
treated as evidence of calibrated reliance only when aggregate behavior shows
that users rely on AI outputs with appropriate verification, feedback, recovery,
or continued use.

The first question is narrower:

> Can the trust signal be attributed to the parent AI surface that produced the
> output?

If the answer is no, the signal remains an availability finding or attribution
gap.

## Attribution Tiers

The diagnostic uses a tiered attribution model.

| Tier | Meaning | Allowed interpretation |
| --- | --- | --- |
| `EXACT_PARENT_KEY` | Signal carries a parent workflow, run, tracking, or feedback key that joins to one parent record. | Strongest attribution evidence. |
| `SESSION_PARENT_KEY` | Signal joins by same user, same session token, and expected parent surface. | Useful if exactly one parent is found. |
| `PROXIMITY_RESEARCH_ONLY` | Signal joins by same user, expected surface, and close event time. | Research-only; not sufficient for promotion by itself. |
| `NO_PARENT` | No governed parent record is found. | Hold. |

The tiers are ordered. Exact parent attribution wins over session attribution,
and session attribution wins over proximity attribution.

## Attribution Results

Each signal is classified into one result.

| Result | Meaning | Governance posture |
| --- | --- | --- |
| `STRICT_PARENT_ATTRIBUTION` | Exactly one expected parent is found by exact key. | Candidate for Trust Attribution review. |
| `SESSION_PARENT_ATTRIBUTION` | Exactly one expected parent is found by session key. | Candidate for further review. |
| `PROXIMITY_RESEARCH_ONLY` | Exactly one expected parent is found by proximity only. | Research-only. |
| `AMBIGUOUS_PARENT` | Multiple possible parents are found. | Hold. |
| `CROSS_SURFACE_ALIAS` | Join points to a surface other than the expected parent. | Hold and inspect aliasing. |
| `NO_PARENT` | No parent is found. | Hold. |
| `SMALL_CELL_SUPPRESSED` | The aggregate row fails the small-cell gate. | Do not surface. |

## Measurement Output

The diagnostic emits aggregate rows only:

- window dates,
- verification event type,
- expected parent surface,
- attribution tier,
- attribution result,
- signal count,
- attributed signal count,
- attribution rate,
- distinct signal users,
- candidate parent count,
- candidate surface count,
- expected parent count,
- attribution status.

Rows that fail the small-cell gate must suppress counts and use
`SMALL_CELL_SUPPRESSED`.

## SQL Diagnostic

The dogfood diagnostic is:

[trust_attribution_refinement_diagnostic.sql](../../sql/dogfood/trust_attribution_refinement_diagnostic.sql)

It is dogfood/research-only and should be run across the same fixed windows as
the V4 internal readout:

| Window | Start | End |
| --- | --- | --- |
| 1 | 2026-03-23 | 2026-05-22 |
| 2 | 2026-02-21 | 2026-04-22 |
| 3 | 2026-01-22 | 2026-03-23 |

## Promotion Boundary

Trust Attribution may move from `HOLD_FOR_ATTRIBUTION_REFINEMENT` only if:

- exact or session attribution is stable across fixed windows,
- attributed rows clear small-cell suppression,
- the signal joins to one expected governed parent surface,
- proximity-only evidence is not used as the promotion basis,
- cross-surface aliasing is understood or excluded,
- outputs remain aggregate-only,
- Trust evidence adds interpretation beyond Reliability Factor and Quality
  Multiplier,
- no customer-facing economic output depends on the result.

## What This Is Not

This method is not:

- a trust score,
- a sentiment score,
- a user behavior label,
- a team comparison,
- a department comparison,
- a productivity measure,
- a customer-facing economic readout,
- proof that more verification is always better.

## Next Decision

After the diagnostic runs across the three fixed windows, update the V4 internal
readout rehearsal with one of:

- `TRUST_ATTRIBUTION_READY_FOR_REVIEW`
- `TRUST_ATTRIBUTION_NARROW_TO_SIGNALS`
- `TRUST_ATTRIBUTION_HOLD_FOR_ALIASING`
- `TRUST_ATTRIBUTION_HOLD_FOR_LOW_COVERAGE`
- `TRUST_ATTRIBUTION_REJECT_CURRENT_JOIN_LOGIC`
