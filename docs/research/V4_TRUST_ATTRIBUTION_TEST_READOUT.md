# V4 Trust Attribution Test Readout

## Purpose

This document records the first fixed-window dogfood test of the V4 Trust
Attribution method. The goal was to determine whether verification and feedback
signals can be attached to exactly one governed parent surface before any Trust
Calibration interpretation is allowed.

This is dogfood/research-only. It adds no APIs, schemas, Prisma migrations,
frontend surfaces, runtime services, customer-facing economic readouts, ROI
calculation, causal claim, prediction claim, individual scoring, comparative
team evaluation, comparative department evaluation, productivity measurement,
or maturity label.

## Inputs Reviewed

The test used
[trust_attribution_refinement_diagnostic.sql](../../sql/dogfood/trust_attribution_refinement_diagnostic.sql)
against `scio-prod` aggregate exports for three fixed 60-day windows:

| Window | Start | End |
| --- | --- | --- |
| 1 | 2026-03-23 | 2026-05-22 |
| 2 | 2026-02-21 | 2026-04-22 |
| 3 | 2026-01-22 | 2026-03-23 |

Saved aggregate CSV outputs:

- `dogfood-output/v4-trust-attribution-refinement/v4_trust_attribution_window_1.csv`
- `dogfood-output/v4-trust-attribution-refinement/v4_trust_attribution_window_2.csv`
- `dogfood-output/v4-trust-attribution-refinement/v4_trust_attribution_window_3.csv`
- `dogfood-output/v4-trust-attribution-refinement/v4_trust_attribution_all_windows.csv`
- `dogfood-output/v4-trust-attribution-refinement/v4_trust_attribution_summary.csv`

## Query Adjustment From Test

The first attempted full-window diagnostic included proximity attribution:
same user, expected parent surface, and a close event-time window. That approach
created a large many-to-many join and was cancelled.

The committed dogfood diagnostic now runs exact-key and session-key attribution
only. Proximity attribution remains a research-only method candidate that would
require a narrower sample or staged table before it can be tested safely.

The optimized query also:

- filters the source scan to governed parent surfaces and trust-signal event
  types,
- expands parent keys into explicit join aliases,
- emits aggregate rows only,
- preserves small-cell suppression.

## Runtime Notes

The optimized diagnostic completed for all three windows.

| Window | Runtime | Bytes processed |
| --- | ---: | ---: |
| 1 | 3m 28s | 753,648,943,427 |
| 2 | 3m 44s | 649,710,348,191 |
| 3 | 3m 36s | 574,871,619,886 |

This is feasible for dogfood research, but still too expensive to run casually.
Future repeated tests should use the saved CSV outputs unless the SQL changes.

## Aggregate Finding

Across the three fixed windows, strict attribution exists for some signals:

| Signal | Expected parent | Strict/session attributed signals | Interpretation |
| --- | --- | ---: | --- |
| `CHAT_FEEDBACK` | `workflow:CHAT` | 375,674 | Strong candidate for narrow trust attribution review. |
| `SEARCH_FEEDBACK` | `standalone:SEARCH` | 2,663 | Candidate for narrow trust attribution review. |
| `CHAT_CITATIONS` | `workflow:CHAT` | 2,243 | Candidate signal, but most rows still have no parent. |
| `AI_SUMMARY_VOTE` | `standalone:AI_SUMMARY` | 86 | Present, but low-volume relative to other signals. |

High-volume signals also expose serious attribution gaps:

| Signal | Main observed issue | Aggregate count |
| --- | --- | ---: |
| `CHAT_CITATION_CLICK` | Cross-surface alias dominates; no strict attribution row appeared. | 1,531,784 cross-surface alias rows and 55,162 no-parent rows. |
| `CHAT_CITATIONS` | No-parent dominates. | 996,911 no-parent rows. |
| `AI_ANSWER_VOTE` | Cross-surface alias dominates. | 11,280 cross-surface alias rows. |
| `CHAT_FEEDBACK` | Strong strict signal exists, but cross-surface and no-parent rows remain material. | 286,531 cross-surface alias rows and 198,995 no-parent rows. |

## Decision

`TRUST_ATTRIBUTION_NARROW_TO_SIGNALS`

Trust Attribution should not be promoted as a broad Trust Calibration readout.
The evidence supports a narrower next phase focused on signals with stable
strict or session attribution:

- `CHAT_FEEDBACK` to `workflow:CHAT`,
- `SEARCH_FEEDBACK` to `standalone:SEARCH`,
- possibly `CHAT_CITATIONS` to `workflow:CHAT` after no-parent behavior is
  better understood,
- possibly `AI_SUMMARY_VOTE` to `standalone:AI_SUMMARY` if volume remains above
  suppression gates in customer-like cohorts.

`CHAT_CITATION_CLICK` and `AI_ANSWER_VOTE` remain held until aliasing is
understood. They should not drive trust interpretation.

## Governance Safety Review

The test preserves the V4 governance posture:

- outputs are aggregate-only,
- no raw user identifiers are emitted,
- rows below the small-cell gate are suppressed,
- trust is not converted into a score,
- no ranking of customers, teams, departments, managers, or individuals is
  introduced,
- no productivity, ROI, causal, or prediction claim is made.

## What Remains Blocked

The following remain blocked:

- broad Trust Calibration promotion,
- customer-facing trust readouts,
- economic confidence changes based on trust,
- citation-click trust interpretation,
- AI-answer-vote trust interpretation,
- any economic value range that depends on trust evidence.

## Required Next Phase

Create a narrow held-signal follow-up for strict/session-attributable signals.
The next phase should answer:

- Is `CHAT_FEEDBACK` stable enough to become a governed trust sub-signal?
- Is `SEARCH_FEEDBACK` stable enough to become a governed trust sub-signal?
- Why do `CHAT_CITATION_CLICK` and `AI_ANSWER_VOTE` resolve mostly to
  cross-surface aliasing?
- Does trust attribution add interpretation beyond Reliability Factor and
  Quality Multiplier?
