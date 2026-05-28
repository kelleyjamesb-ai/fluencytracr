# Episode Journey Microcosm Diagnostic

## Purpose

This research diagnostic tests whether a small, temporary BigQuery sample can
act as a microcosm of organizational AI work behavior across the full
FluencyTracr framework.

The goal is to learn whether person-level journey reconstruction helps validate
the behavioral primitives and framework layers before any productization:

- Frequency
- Engagement
- Breadth
- Velocity
- Depth Repertoire
- Trust interpretability
- abandonment / continuation evidence
- recovery / post-friction continuation evidence
- iteration / refinement evidence
- Reliability Factor context
- Quality Multiplier context
- readout-zone routing
- source coverage and evidence gaps

This diagnostic is not a product surface and is not a customer-facing readout.

## Governance Boundary

The diagnostic may use person-level rows only as temporary BigQuery
intermediates. The final output must remain aggregate-only.

It must not emit:

- user IDs,
- emails,
- names,
- anonymized user IDs,
- per-person journey graphs,
- raw prompts,
- raw outputs,
- transcripts,
- raw event rows,
- manager fields,
- team fields,
- person-level scores,
- individual fluency labels.

The intended output is aggregate journey motifs and framework coverage
summaries, not individual traces.

## Diagnostic SQL

SQL file:

```text
sql/dogfood/episode_journey_microcosm_diagnostic.sql
```

The query samples 20 users inside BigQuery, traces three 30-day windows, and
emits aggregate output sections:

| Section | Purpose |
| --- | --- |
| `FRAMEWORK_MICROCOSM_SUMMARY` | Window-level framework coverage across sampled user-windows. |
| `FRAMEWORK_BAND_SUMMARY` | Aggregate Velocity, Depth, trust, reliability, quality, and readout-zone bands. |
| `JOURNEY_MOTIF_SUMMARY` | Aggregate path shapes, with small cells suppressed. |
| `PRIMITIVE_CONFIDENCE_SUMMARY` | Evidence-strength tiers for abandonment/continuation, recovery, refinement, and trust interpretability. |
| `CLASSIFICATION_DISTRIBUTION_SUMMARY` | Standalone distribution of Velocity, Depth, trust, reliability, quality, and readout-zone classifications. |
| `LINKED_JOURNEY_MOTIF_SUMMARY` | Aggregate path shapes grouped by strongest available run/action, session, or trace/tracking linkage key. |
| `MOTIF_TIER_SUMMARY` | Executive-readable motif lanes that separate assistive reach, execution-linked workflow evidence, post-friction continuation, verification-attached workflow, search-to-agent escalation, and weak-linkage context. |

## Window Design

The diagnostic uses three 30-day windows:

```text
analysis_end - 90d to analysis_end - 60d
analysis_end - 60d to analysis_end - 30d
analysis_end - 30d to analysis_end
```

This allows the sample to act like a miniature organization over time while
remaining bounded enough to inspect query cost and feasibility.

## What The Diagnostic Measures

### Velocity

Velocity is represented by:

- average runs per active day,
- active days in the window,
- distinct AI surfaces touched.

The diagnostic assigns relative sample bands:

- `LOW_FREQUENCY`, `MEDIUM_FREQUENCY`, `HIGH_FREQUENCY`
- `LOW_ENGAGEMENT`, `MEDIUM_ENGAGEMENT`, `HIGH_ENGAGEMENT`
- `LOW_BREADTH`, `MEDIUM_BREADTH`, `HIGH_BREADTH`
- `LOW_VELOCITY`, `MEDIUM_VELOCITY`, `HIGH_VELOCITY`

These are sample-relative research bands, not product thresholds.

### Depth Repertoire

Depth Repertoire is represented by:

- distinct surfaces,
- repeated surface count,
- heavily repeated surface count,
- skill use,
- agent use,
- repeat behavior across the window.

Diagnostic bands:

- `INTEGRATED_REPERTOIRE`
- `FOCUSED_INTEGRATION`
- `ACTIVE_BUT_SHALLOW`
- `UNSTABLE_OR_INSUFFICIENT`

These bands are used to test whether surface repertoire and repeat use help
explain journey patterns. They must not become person-level labels.

### Trust Interpretability

Trust interpretability is represented by:

- direct feedback,
- citation/source behavior,
- terminal success,
- post-friction continuation.

Diagnostic tiers:

- `DIRECT_FEEDBACK_EVIDENCE`
- `STRUCTURAL_VERIFICATION_EVIDENCE`
- `STRUCTURAL_CONTINUATION_EVIDENCE`
- `EVIDENCE_GAP`

This does not measure sentiment or correctness. It measures whether the trace
contains enough aggregate evidence to interpret trust-adjacent behavior.

### Abandonment / Continuation

The diagnostic avoids treating abandonment as intent.

Diagnostic tiers:

- `DIRECT_ABANDON`
- `NO_OBSERVED_POST_FRICTION_CONTINUATION`
- `NO_OBSERVED_TERMINAL_EVIDENCE`
- `NOT_ABANDONMENT_EVIDENCED`

The safer interpretation is:

```text
No observed continuation is not proof that the user abandoned AI because it
failed. It may reflect meetings, context switching, offline work, or source
coverage gaps.
```

### Recovery / Post-Friction Continuation

Recovery is reframed as post-friction continuation.

Diagnostic tiers:

- `DIRECT_POST_FRICTION_SUCCESS`
- `STRUCTURAL_POST_FRICTION_CONTINUATION`
- `FRICTION_WITHOUT_OBSERVED_CONTINUATION`
- `NO_FRICTION_OBSERVED`

This tests whether friction is followed by action success, agent completion,
feedback, citation/source behavior, skill use, or additional LLM activity.

### Iteration / Refinement

Refinement is treated as observed edit/retry/follow-up behavior, not proof of
improvement.

Diagnostic tiers:

- `HEAVY_RETRY_OR_REFINEMENT_LOOP`
- `LIGHT_RETRY_OR_REFINEMENT_LOOP`
- `NO_RETRY_OR_REFINEMENT_LOOP_OBSERVED`

The diagnostic should be used to separate productive refinement candidates from
possible rework loops only when continuation, success, verification, or latency
context is also present.

### Reliability And Quality Context

The diagnostic computes research indicators inspired by existing Reliability
Factor and Quality Multiplier contracts. These are not product outputs.

Reliability context uses:

- verification / feedback / citation evidence,
- post-friction continuation,
- explicit abandon or no continuation after friction,
- friction-loop evidence.

Quality context uses similar components but centers around whether behavioral
quality would support, neutralize, or discount a time-saved assumption.

These indicators are included only to test whether the full framework can be
observed in one bounded journey diagnostic.

## Expected Learnings

This diagnostic should help answer:

- Are apparent abandonments mostly explicit, structural, or evidence gaps?
- How often does friction lead to continuation or success?
- How often does first-pass use resolve without iteration?
- Are high-iteration paths productive refinement or possible rework loops?
- Do users switch surfaces after agent failure?
- Which trust signals actually attach to governed parent activity?
- Are citation behaviors too sparse to carry trust interpretation?
- Do Velocity and Depth explain different journey shapes?
- Does Reliability/Quality context add interpretation beyond raw usage?

## Final Output Rules

The final output applies small-cell suppression. Rows below the aggregate safety
floor are folded into `SMALL_CELL_SUPPRESSED`.

Journey motifs are emitted only as aggregate path shapes. They must not be used
to reconstruct a specific person.

The output can support framework validation and synthetic journey examples. It
cannot support individual fluency scoring, individual coaching, team ranking,
manager ranking, productivity measurement, ROI, causality, or customer-facing
economic claims.

## Current Execution Status

SQL draft is ready and validated against the approved BigQuery sources.

Live BigQuery execution completed on 2026-05-27 using:

```text
scio-apps.scrubbed_glean_customer_event.scrubbed_glean_customer_event
scio-apps.scrubbed_agentspan.scrubbed_agentspan_*
```

The clean aggregate-only output is retained at:

```text
dogfood-output/episode-journey-microcosm/episode_journey_microcosm_summary.aggregate.csv
```

An expanded full-package rerun added standalone classification distributions
for Velocity, Depth Repertoire, Trust Interpretability, Reliability Context,
Quality Context, and Readout Zone. Its clean aggregate output and readout are:

```text
dogfood-output/episode-journey-microcosm/episode_journey_microcosm_full_package.aggregate.csv
dogfood-output/episode-journey-microcosm/episode_journey_microcosm_full_package_readout.md
```

A reclassified full-package rerun split formerly broad `OTHER_AI_EVENT`
activity into narrower aggregate categories such as agent step execution,
skipped/error/paused step evidence, trace context, workflow/session context,
unlinked bot/MCP activity, and weak-linkage summaries. Its clean aggregate
output and readout are:

```text
dogfood-output/episode-journey-microcosm/episode_journey_microcosm_reclassified_full_package.aggregate.csv
dogfood-output/episode-journey-microcosm/reclassified_pipeline_findings.md
```

A linked journey motif rerun grouped events by the strongest available linkage
key before emitting aggregate path shapes. Its clean aggregate output and
readout are:

```text
dogfood-output/episode-journey-microcosm/episode_journey_microcosm_linked_motifs_full_package.aggregate.csv
dogfood-output/episode-journey-microcosm/linked_journey_motif_findings.md
```

A motif-tier rerun added executive-readable lanes on top of linked motifs. Its
clean aggregate output and readout are:

```text
dogfood-output/episode-journey-microcosm/episode_journey_microcosm_motif_tiers_full_package.aggregate.csv
dogfood-output/episode-journey-microcosm/motif_tier_findings.md
```

The latest reclassified full-package run folds agent-step, trace-context,
workflow-context, bot, MCP, and weak-link summary categories back into the main
pipeline. Its clean aggregate output and interpretation are:

```text
dogfood-output/episode-journey-microcosm/episode_journey_microcosm_reclassified_full_package.aggregate.csv
dogfood-output/episode-journey-microcosm/reclassified_pipeline_findings.md
```

The linked motif rerun adds aggregate path shapes keyed by run/action, session,
or trace/tracking linkage. Its output and interpretation are:

```text
dogfood-output/episode-journey-microcosm/episode_journey_microcosm_linked_motifs_full_package.aggregate.csv
dogfood-output/episode-journey-microcosm/linked_journey_motif_findings.md
```

The successful run processed approximately 4.69 TB, so the next query revision
should reduce scan cost by sampling eligible actors before the full 90-day
trace expansion.

Observed aggregate sample-window coverage:

| Window | Aggregate sample windows | Avg frequency | Avg active days | Avg breadth | Avg reliability context | Avg quality context |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `window_1` | 13 | 71.2456 | 17.1538 | 5.1538 | 0.7115 | 1.2192 |
| `window_2` | 14 | 63.5710 | 16.5714 | 4.8571 | 0.6429 | 1.1179 |
| `window_3` | 14 | 75.4426 | 19.0000 | 5.4286 | 0.6875 | 1.1804 |

Early interpretation:

- The diagnostic can observe the core framework layers together: frequency,
  engagement, breadth, Velocity x Depth context, reliability context, quality
  context, trust interpretability, and primitive confidence tiers.
- Citation or direct feedback should not carry the trust story alone. The
  stronger trust-adjacent evidence in this run is structural verification and
  post-friction continuation, with evidence gaps still visible.
- The primitive confidence outputs are evidence-strength tiers only. They do
  not prove intent, quality, productivity, causality, or individual fluency.
- The journey motif section is still weak. Most path-shape motifs either
  suppress or collapse into generic event categories, which means the next
  research step should improve source-event classification before using motifs
  in executive language.
