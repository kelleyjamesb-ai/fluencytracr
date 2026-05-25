# V4 Full Dogfood Rehearsal Readout

## Purpose

This report summarizes the first local V4 dogfood rehearsal from saved
aggregate CSVs. It is meant to answer, one slice at a time, what the current V4
evidence shows, what it does not show, and what should happen next.

This readout uses tracked aggregate dogfood outputs only. It does not run new
BigQuery queries. It adds no APIs, schemas, Prisma migrations, runtime
services, frontend surfaces, customer-facing economic outputs, ROI
calculations, causal claims, prediction claims, individual scoring,
comparative team evaluation, comparative department evaluation, productivity
measurement, or maturity label.

## Inputs Reviewed

The rehearsal used the allowlisted files in
[V4_RESEARCH_EXPORTS.md](../../dogfood-output/V4_RESEARCH_EXPORTS.md):

- Depth Repertoire fixed-window CSVs,
- trust-signal availability summary,
- trust-attribution refinement summary,
- AGENT feedback availability summary,
- Skill Read Evidence availability fixed-window CSVs.

The fixed windows are:

| Window | Start | End |
| --- | --- | --- |
| 1 | 2026-03-23 | 2026-05-22 |
| 2 | 2026-02-21 | 2026-04-22 |
| 3 | 2026-01-22 | 2026-03-23 |

All values are internal Glean dogfood observations. They are not customer
benchmarks, thresholds, defaults, calibration values, or customer-facing
economic outputs.

## 1. Depth Repertoire

Depth Repertoire remains the strongest V4 behavioral signal. It separates
single-surface use from repeated multi-surface work integration.

| Window | Overall cohort | Overall depth p50 | Overall depth p90 | Overall depth p99 |
| --- | ---: | ---: | ---: | ---: |
| 1 | 1,869,820 | 1 | 25 | 48 |
| 2 | 1,915,311 | 2 | 25 | 49 |
| 3 | 1,901,222 | 3 | 25 | 49 |

Segment distribution is stable:

| Segment | Window 1 share | Window 2 share | Window 3 share | Depth p50/p90/p99 |
| --- | ---: | ---: | ---: | --- |
| Single surface | 48.72% | 47.63% | 46.55% | 1 / 1 / 1 |
| Two to three surfaces | 19.79% | 19.88% | 19.71% | 6 / 9 / 9 |
| Four to six surfaces | 29.65% | 30.19% | 31.16% | 16 / 30 / 36 |
| Seven to ten surfaces | 1.81% | 2.26% | 2.54% | 48-49 / 64 / 90 |
| Eleven-plus surfaces | 0.03% | 0.04% | 0.04% | 110-120 / 144-156 / 196-210 |

**Result:** promote Depth Repertoire as V4 context. It is stable enough to
explain work-integration depth, but it should not create economic outputs by
itself.

## 2. Trust Signal Availability

Trust-related signals are available, but availability is not enough. Parent
attribution decides whether the signal can support interpretation.

| Signal | Window 1 | Window 2 | Window 3 | Three-window total | Status |
| --- | ---: | ---: | ---: | ---: | --- |
| `CHAT_CITATION_CLICK` | 1,211,558 | 127,143 | 248,304 | 1,587,005 | Available, attribution held |
| `CHAT_CITATIONS` | 281,920 | 439,811 | 289,950 | 1,011,681 | Available, attribution held |
| `CHAT_FEEDBACK` | 312,589 | 313,122 | 243,439 | 869,150 | Available, attribution held |
| `AI_ANSWER_VOTE` | 3,422 | 3,643 | 4,424 | 11,489 | Available, attribution held |
| `AI_SUMMARY_VOTE` | 320 | 393 | 501 | 1,214 | Available, attribution held |
| `SEARCH_FEEDBACK` | 2,616 | 3,158 | 8,675 | 14,449 | Available, attribution held |

**Result:** trust signal availability is real. Broad Trust Calibration remains
held because several high-volume signals do not attach cleanly to a governed
parent surface.

## 3. Trust Attribution

The attribution test narrowed trust to a smaller set of usable candidates.

| Signal | Total rows | Strict/session attributed | Attribution rate | Main issue |
| --- | ---: | ---: | ---: | --- |
| `CHAT_FEEDBACK` | 869,031 | 375,674 | 43.23% | Strong candidate, but alias/no-parent rows remain material. |
| `SEARCH_FEEDBACK` | 14,449 | 2,663 | 18.43% | Candidate signal with meaningful no-parent volume. |
| `AI_SUMMARY_VOTE` | 1,214 | 86 | 7.08% | Present, but low volume. |
| `CHAT_CITATIONS` | 1,011,633 | 2,243 | 0.22% | No-parent dominates. |
| `CHAT_CITATION_CLICK` | 1,586,946 | 0 | 0.00% | Cross-surface alias dominates. |
| `AI_ANSWER_VOTE` | 11,280 | 0 | 0.00% | Cross-surface alias dominates. |

**Result:** promote `TRUST_ATTRIBUTION_NARROW_TO_SIGNALS` as the current
research decision. `CHAT_FEEDBACK` and `SEARCH_FEEDBACK` are the first trust
classification candidates. `CHAT_CITATION_CLICK` and `AI_ANSWER_VOTE` remain
held.

## 4. AGENT Feedback

AGENT-related feedback exists at meaningful volume:

| Signal | Aggregate count | Status |
| --- | ---: | --- |
| `AGENT_RELATED_TIME_SAVED_FEEDBACK` | 57,892 | Available, attribution held |
| `AGENT_RELATED_UPVOTE_STYLE_FEEDBACK` | 43,070 | Available, attribution held |
| `AGENT_RELATED_DOWNVOTE_STYLE_FEEDBACK` | 33,257 | Available, attribution held |

**Result:** AGENT trust evidence is not absent. It is not yet governed because
the current saved output is availability-only. The next useful AGENT test is
parent attribution by AGENT sub-surface: autonomous, named-workflow, and
ephemeral.

## 5. Skill Read Evidence

Skill Read Evidence is observable in agent-span data and has strong parent join
coverage in the saved availability run.

| Window | Skill-read rows with parent join | Missing parent join rows | Parent join share | Distinct specified skill-name count |
| --- | ---: | ---: | ---: | ---: |
| 1 | 1,473,686 | 0 | 100.00% | 85 |
| 2 | 596,761 | 4,417 | 99.27% | 75 |
| 3 | 140,167 | 5,310 | 96.35% | 14 |

**Result:** Skill Read Evidence is available, but it is not trust by itself.
It is stronger evidence for structured workflow use, reusable leverage, and
agent sophistication. Raw skill names must remain out of V4 readouts.

## 6. Cohort Classification

Organizational cohorts such as department, manager/IC, leader cohort, level
band, role family, and region have not been tested. They remain held until an
approved aggregate metadata join exists.

Behavior-derived cohorts are ready for the next research test:

| Cohort | Current status | Why |
| --- | --- | --- |
| Velocity band | Ready to test | Already grounded in V2 aggregate distributions. |
| Depth Repertoire band | Ready to test | Stable across three windows. |
| AGENT delegation band | Ready to test | AGENT evidence exists, but attribution must be narrowed. |
| Skill-read presence band | Ready to test carefully | Skill-read presence is observable; raw skill names remain blocked. |
| Tenure cohort | Optional | Safe if derived from first-active date inside the boundary. |
| Org metadata cohorts | Held | Need approved HRIS, Workday, or directory aggregate join. |

**Result:** run behavior-derived cohorts before org metadata cohorts. This
keeps segmentation as intervention planning, not group comparison.

## 7. Economic Impact Bridge

The current evidence supports value-investigation routing, not economic output.

Allowed interpretation:

- Depth Repertoire identifies where AI use looks more integrated.
- Trust classifications identify which trust signals can and cannot support
  interpretation.
- Skill-read presence suggests structured workflow evidence worth testing.
- AGENT feedback availability suggests delegation trust evidence may exist.
- Behavior-derived cohorts can help decide where to scale, coach, redesign, or
  hold.

Blocked interpretation:

- ROI,
- productivity lift,
- causal impact,
- guaranteed savings,
- customer-facing economic range,
- team, manager, department, customer, employee, or skill ranking.

**Result:** Economic Impact Bridge remains investigation routing only.

## Overall Result

V4 is ready for a full local research rehearsal from saved CSVs. It is not ready
for customer-facing economic output.

Current decisions:

| Area | Decision |
| --- | --- |
| Depth Repertoire | Promote as V4 context; do not use as economic dependency. |
| Trust | Narrow to `CHAT_FEEDBACK` and `SEARCH_FEEDBACK`; hold broad Trust Calibration. |
| AGENT trust | Available but held for parent attribution by AGENT sub-surface. |
| Skills | Available as structured workflow evidence; not trust by itself. |
| Behavior cohorts | Ready for next research test. |
| Org metadata cohorts | Held until approved aggregate join. |
| Economic output | Hold; allow value-investigation routing only. |

## Recommended Next Step

Run the behavior-derived cohort classification test from saved aggregate
fixtures first. If a required aggregate fixture is missing, run the smallest
new BigQuery diagnostic needed and save the output immediately.

The next artifact should be:

`docs/research/V4_BEHAVIOR_COHORT_CLASSIFICATION_READOUT.md`

It should decide whether Velocity band, Depth Repertoire band, AGENT delegation
band, and Skill-read presence band make the internal AI Scale Readiness readout
more actionable without weakening the invariants.

## What Remains Blocked

- Broad Trust Calibration,
- org metadata cohorts,
- customer-facing economic output,
- skill-name readouts,
- AGENT trust interpretation without parent attribution,
- any ROI, productivity, causality, prediction, maturity, or ranking claim.
