# V4 Internal Readout Rehearsal

## Purpose

This rehearsal proves that the V4 internal AI Scale Readiness process can be
rerun from tracked aggregate CSV exports without returning to BigQuery.

Current rehearsal status: `REPRODUCIBLE_FROM_TRACKED_EXPORTS`

This is an internal dogfood rehearsal. It adds no APIs, schemas, Prisma
migrations, runtime services, frontend surfaces, customer-facing economic
readouts, ROI calculation, causal claim, prediction claim, individual scoring,
comparative team evaluation, comparative department evaluation, productivity
measurement, or maturity label.

## Inputs Reviewed

Tracked inputs:

- [V4 Research Export Bundle](../../dogfood-output/V4_RESEARCH_EXPORTS.md)
- `dogfood-output/v4-depth-repertoire/v4_depth_repertoire_window_1.csv`
- `dogfood-output/v4-depth-repertoire/v4_depth_repertoire_window_2.csv`
- `dogfood-output/v4-depth-repertoire/v4_depth_repertoire_window_3.csv`
- `dogfood-output/v4-trust-signal-availability/trust_signal_availability_summary_safe.csv`
- `dogfood-output/v4-trust-signal-availability/agent-feedback/agent_feedback_summary_safe.csv`
- `dogfood-output/v4-skill-read-availability/skill_read_availability_all_windows.csv`

Excluded inputs:

- scratch `.csv` files that contain copied SQL text,
- raw BigQuery event rows,
- raw skill names,
- user-level exports.

## Input QA Result

Input package status: `READY_FOR_INTERNAL_READOUT`

The tracked exports are aggregate-only research exports. The package includes
Depth Repertoire, trust-signal availability, AGENT feedback availability, and
Skill Read Evidence availability. It does not include raw skill names, prompts,
outputs, transcripts, action rows, or raw event rows.

The rehearsal uses the explicit export manifest allowlist. It does not glob all
CSV files under `dogfood-output/`, because that directory also contains older
dogfood files and ignored local scratch files that are not valid V4 readout
inputs.

## Depth Repertoire Rehearsal Finding

Tracked Depth Repertoire exports show stable p90 and p99 distribution shape
across the three fixed windows.

| Window | Cohort Size | Repertoire p50 / p90 / p99 | Repeat p50 / p90 / p99 | Depth Candidate p50 / p90 / p99 |
| --- | ---: | ---: | ---: | ---: |
| 1 | 1,869,820 | 2 / 5 / 7 | 1 / 5 / 6 | 1 / 25 / 48 |
| 2 | 1,915,311 | 2 / 5 / 7 | 1 / 5 / 7 | 2 / 25 / 49 |
| 3 | 1,901,222 | 2 / 5 / 7 | 1 / 5 / 7 | 3 / 25 / 49 |

Readout:

`DEPTH_REPERTOIRE_CONTEXT_READY`

Interpretation:

Depth Repertoire is stable enough to support internal action-posture context.
It should not adjust confidence bands, eligibility, economic values, or
customer-facing output.

## Trust Evidence Rehearsal Finding

Trust and verification signals are present across windows.

| Signal | Window 1 | Window 2 | Window 3 | Rehearsal status |
| --- | ---: | ---: | ---: | --- |
| CHAT_CITATION_CLICK | 1,211,558 | 127,143 | 248,304 | Available, attribution held |
| CHAT_CITATIONS | 281,920 | 439,811 | 289,950 | Available, attribution held |
| CHAT_FEEDBACK | 312,589 | 313,122 | 243,439 | Available, attribution held |
| AI_ANSWER_VOTE | 3,422 | 3,643 | 4,424 | Available, attribution held |
| AI_SUMMARY_VOTE | 320 | 393 | 501 | Available, attribution held |
| SEARCH_FEEDBACK | 2,616 | 3,158 | 8,675 | Available, attribution held |

The safe AGENT feedback summary for window 1 also shows explicit AGENT-related
feedback volume. This is enough to keep trust attribution as a priority
research path, but not enough to promote Trust Calibration.

Low-count trust join rows are intentionally not surfaced here. Trust evidence is
summarized only at the signal-availability level because parent attribution is
still held.

Readout:

`TRUST_ATTRIBUTION_HOLD`

Interpretation:

Trust evidence exists, but strict parent attribution is not yet ready.

## Skill Read Evidence Rehearsal Finding

Skill Read Evidence appears in tracked aggregate exports from agent span logs.

| Window | Skill read rows | Group-level distinct specified skill-name count | Parent join key share | Unspecified share |
| --- | ---: | ---: | ---: | ---: |
| 2026-03-23 to 2026-05-22 | 1,473,686 | 85 | 100.00% | 0.00% |
| 2026-02-21 to 2026-04-22 | 601,178 | 78 | 99.27% | 0.00% |
| 2026-01-22 to 2026-03-23 | 145,477 | 18 | 96.35% | 0.00% |

Readout:

`SKILL_READ_EVIDENCE_AVAILABLE_BUT_NOT_GOVERNED`

Interpretation:

Skill-read availability is real enough to continue validation. It is not yet a
governed reusable-leverage signal because canonical skill identity, versioning,
invocation mode, UGC coverage, plugin/MCP coverage, and personal/shared/org
Skill separation remain unresolved.

The rehearsal does not emit skill names and does not infer reusable workflow
propagation from skill-read availability.

## AI Scale Readiness Rehearsal Summary

Current internal posture:

`KEEP_INTERNAL_READOUT_PROCESS`

The tracked exports reproduce the current V4 landing point:

- Depth Repertoire can be used as internal aggregate context.
- Trust Calibration remains held for attribution refinement.
- Skill Read Evidence remains an availability signal, not governed reuse.
- Economic Impact Bridge remains investigation routing only.
- Customer-facing economic output remains blocked.

## Recommended Next Action

Next action:

`RUN_TRUST_ATTRIBUTION_REFINEMENT`

Why:

Trust evidence is present, but its parent joins are noisy. Cleaning attribution
is the highest-leverage next validation because it could convert trust from a
caveat into a governed readiness input without broadening the product surface.
The governing method is
[V4_TRUST_ATTRIBUTION_METHOD.md](./V4_TRUST_ATTRIBUTION_METHOD.md).

Second action:

`RUN_SKILL_IDENTITY_VALIDATION`

Why:

Skill Read Evidence volume is meaningful, but reusable leverage cannot be
interpreted until identity and join coverage are governed.

## What Remains Blocked

Blocked:

- Trust Calibration product output.
- Reusable leverage product output.
- Skill Read Evidence as governed signal.
- Customer-facing V4 economic output.
- Time-Saved Defensibility Range productization.
- Automated recommendations.

## Rehearsal Decision

Decision: `KEEP_INTERNAL_READOUT_PROCESS`

The process is solid enough for internal reruns from tracked aggregate exports.
It is not yet solid enough for customer-facing economic output.
