# Reclassified Pipeline Findings

Run date: 2026-05-27

Fresh aggregate output:

- `dogfood-output/episode-journey-microcosm/episode_journey_microcosm_reclassified_full_package.aggregate.csv`

Supporting aggregate diagnostics:

- `dogfood-output/episode-journey-microcosm/other_ai_event_composition.aggregate.csv`
- `dogfood-output/episode-journey-microcosm/span_unknown_composition.aggregate.csv`
- `dogfood-output/episode-journey-microcosm/journey_linkage_coverage.aggregate.csv`

Governance boundary:

- Aggregate-only.
- No raw prompts, outputs, transcripts, names, emails, user IDs, anonymized user
  IDs, manager fields, team fields, row-level journeys, individual scores,
  team ranking, productivity claims, causality, prediction, or ROI calculation.

## What Changed

The refreshed classifier folds formerly generic span and Glean activity into
more specific journey categories:

- `AGENT_STEP_EXECUTED`
- `AGENT_STEP_SKIPPED`
- `AGENT_STEP_ERROR`
- `AGENT_STEP_PAUSED`
- `AGENT_TRACE_CONTEXT`
- `WORKFLOW_CONTEXT_ONLY`
- `SESSION_CONTEXT_ONLY`
- `BOT_ACTIVITY_UNLINKED`
- `MCP_ACTIVITY_UNLINKED`
- `AI_SUMMARY_WEAK_LINKAGE`

This does not add canonical events or suppression reasons. It is a better
classification layer over existing telemetry.

## Before / After Summary

| Window | Avg frequency before | Avg frequency after | Avg breadth before | Avg breadth after | Reliability before | Reliability after | Quality before | Quality after |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `window_1` | 71.2840 | 71.2425 | 5.1538 | 5.6923 | 0.7115 | 0.7115 | 1.2192 | 1.2192 |
| `window_2` | 63.4441 | 63.4558 | 4.8571 | 5.3571 | 0.6429 | 0.6429 | 1.1179 | 1.1179 |
| `window_3` | 75.4401 | 75.4295 | 5.4286 | 6.0714 | 0.6875 | 0.6875 | 1.1804 | 1.1804 |

Interpretation:

- The new classification materially improves observed breadth.
- It does not inflate reliability or quality context.
- That is the right direction: the method reveals more workflow integration
  without manufacturing trust or value claims.

## Updated Hypothesis

The working hypothesis is stronger after reclassification:

> AI fluency is better detected as aggregate operating conditions across
> velocity, depth, trust evidence, reliability context, and quality context than
> as adoption volume or individual proficiency.

The evidence now supports three separate executive stories:

1. **Scale candidates**
   High-velocity, integrated-repertoire work with structural verification and
   supportive reliability/quality context.

2. **Trust evidence gaps**
   Work patterns with visible activity but insufficient verification or
   continuation evidence to scale with confidence.

3. **Workflow integration evidence**
   Broader surface repertoire becomes more visible after agent-step and
   trace-context classification.

## Current Findings

### Velocity

- `HIGH_VELOCITY` remains visible across windows 1 and 3.
- Window 2 still splits between `HIGH_VELOCITY` and `MEDIUM_VELOCITY`.
- Reclassification did not materially change frequency, which means the
  velocity signal is stable.

### Depth

- Average breadth increased in all three windows after reclassification.
- `INTEGRATED_REPERTOIRE` remains visible in all three windows.
- This is the clearest new signal: agent-step and trace-context activity make
  AI work look more integrated than the earlier generic classifier showed.

### Trust

- `STRUCTURAL_VERIFICATION_EVIDENCE` remains visible in all windows.
- `EVIDENCE_GAP` also remains visible in all windows.
- Reclassification does not erase trust gaps. This is important because it
  keeps the output defensible.

### Reliability And Quality

- Reliability and quality context stayed stable after reclassification.
- That means the method is not simply rewarding more event labels.
- Reliability/quality can support value investigation, but they do not prove
  ROI.

### Journey Motifs

- The motif output improved from generic `OTHER_AI_EVENT` to
  `BOT_ACTIVITY_UNLINKED` for one visible path.
- This is better, but still not the desired executive journey story.
- The next lift is to generate motifs from linked trace/session/workflow keys,
  not from every repeated ambient activity event.

## ROI Readiness

This pipeline does not support ROI calculation yet.

What it can support now:

- value hypotheses,
- where time-saved assumptions are more or less defensible,
- where workflow acceleration may be plausible,
- where trust and source-coverage gaps should discount value claims,
- where customer-owned outcome evidence should be requested.

What is still missing for ROI:

- customer-owned outcome measures,
- approved time assumptions,
- approved behavior-to-outcome join,
- agreed baseline period,
- customer-approved value model,
- causal caveats,
- suppression-safe cohort slicing.

The safer phrasing is:

> These patterns identify where value investigation is most credible and where
> ROI assumptions should be held, discounted, or validated with customer-owned
> outcomes.

## What To Do Next

1. Build linked journey motifs using trace/session/workflow keys.
   Focus on patterns like:
   `SEARCH -> AGENT_TRACE_CONTEXT -> AGENT_STEP_EXECUTED -> CITATION_AVAILABLE`
   and `AGENT_STEP_ERROR -> ACTION_SUCCESS -> RECOVERY_EVIDENCE`.

2. Separate ambient activity from linked workflow activity.
   `BOT_ACTIVITY_UNLINKED`, `MCP_ACTIVITY_UNLINKED`, and
   `AI_SUMMARY_WEAK_LINKAGE` should remain visible but should not drive trust or
   ROI language.

3. Add an evidence-to-value investigation table.
   This should map scale candidates, trust gaps, and workflow integration
   patterns to value hypotheses only, not ROI calculations.

4. Optimize the pipeline.
   The reclassified full run processed approximately 4.93 TB. Client readiness
   needs a cheaper pre-aggregation or sample-first execution plan.
