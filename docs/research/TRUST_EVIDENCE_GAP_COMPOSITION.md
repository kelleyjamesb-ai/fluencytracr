# Trust Evidence Gap Composition

## Status

Status: `RESEARCH_CONTEXT_ONLY`

This diagnostic decomposes the Trust Episode Boundary evidence-gap bucket into
aggregate source-readiness components. It is dogfood/research-only and does not
add runtime output, schemas, APIs, canonical events, suppression reasons,
tunable thresholds, admin overrides, ROI calculation, causality, individual
scoring, or team/manager ranking.

## Purpose

The Trust Episode Boundary pilot currently reports a large evidence gap. The
gap is useful, but it is too coarse by itself: leaders need to know whether the
gap is mostly missing downstream behavior, ambiguous episode boundaries, weak
parent linkage, or sparse withheld cells.

Trust Evidence Gap Composition keeps the same aggregate-only boundary and asks
a narrower source-readiness question:

> What observable aggregate condition prevents this AI work episode from being
> interpreted as resolved, recovered, stalled, or verified?

## Composition Buckets

These buckets are diagnostic labels only. They are not canonical events and are
not suppression reasons.

| Bucket | Meaning |
| --- | --- |
| True downstream-evidence gap | An aggregate episode exists, but available downstream behavior is insufficient for trust interpretation. |
| Verification signal without observed resolution | Feedback, citation, or source behavior exists, but no aggregate resolution or completion signal is observed. |
| AI activity without terminal outcome | Action, agent, or skill activity exists, but no terminal aggregate outcome is visible. |
| Span or LLM activity without governed outcome | Span or LLM activity exists, but governed action/run outcome evidence is missing. |
| Skill or agent activity without downstream outcome | Skill or agent activity exists, but no downstream continuation, completion, verification, or recovery evidence is visible. |
| Weak parent linkage | Parent linkage exists, but the key family is too weak for confident trust interpretation. |
| Ambiguous boundary fold-in | A pattern-shaped row exists, but boundary coverage is ambiguous enough that shareable output must keep it inside evidence-gap language. |
| Small-cell safety fold-in | A rare aggregate component is present below the aggregate safety floor; exact values are withheld from shareable readouts. |
| Other aggregate evidence gap | Aggregate evidence is present but does not fit a more specific composition bucket. |

## Current Dogfood Composition

The retained run-first pilot composition is generated from
[`trust_evidence_gap_composition_input_run_first.csv`](../../dogfood-output/trust-evidence-gap-composition/trust_evidence_gap_composition_input_run_first.csv)
with
[`run_trust_evidence_gap_composition_readout.py`](../../scripts/dogfood/run_trust_evidence_gap_composition_readout.py).

It explains the public Trust Episode Boundary evidence gap as:

- true downstream-evidence gap,
- ambiguous boundary fold-in,
- small-cell safety fold-in.

The small-cell fold-in is acknowledged without publishing its exact value in
shareable Markdown or CSV output.

## BigQuery Diagnostic

[`trust_evidence_gap_composition_diagnostic.sql`](../../sql/dogfood/trust_evidence_gap_composition_diagnostic.sql)
extends the Trust Episode Boundary diagnostic to classify aggregate gap
composition. The final output is aggregate-only and emits:

- `gap_component`,
- `episode_count`,
- `episode_share_of_gap`,
- `coverage_caveat`.

This SQL runs at the diagnostic candidate-key layer. To compare its bucket
counts directly with the retained 43.1% product-episode evidence gap, apply the
same run-first or trace-first product-episode dedup overlay used by
[`TRUST_PRODUCT_EPISODE_DEDUP_BIGQUERY_READOUT.md`](../../dogfood-output/trust-episode-boundary/TRUST_PRODUCT_EPISODE_DEDUP_BIGQUERY_READOUT.md).

The seven-business-day candidate-key QA run is retained under
[`bigquery-candidate-key/`](../../dogfood-output/trust-evidence-gap-composition/bigquery-candidate-key/).
It is useful for source-readiness investigation but is not an executive
readout. The tracked QA summary shows visible candidate-key gap composition
after sub-floor withholding:

- ambiguous boundary fold-in: 158,929,357 visible candidate gap keys,
- span or LLM activity without governed outcome: 38,670,491 visible candidate
  gap keys,
- AI activity without terminal outcome: 1,406,716 visible candidate gap keys,
- verification signal without observed resolution: 44,342 visible candidate
  gap keys,
- small-cell component present below the aggregate safety floor; exact value
  withheld.

The diagnostic does not emit user IDs, emails, names, prompts, outputs,
transcripts, raw event rows, manager fields, team fields, or person-level
metrics.

## Interpretation Rules

- Treat composition buckets as source-readiness evidence, not performance
  evidence.
- Preserve evidence gaps. Do not infer healthy trust, poor trust, correctness,
  value, or causality from missing downstream evidence.
- If a component is below the aggregate safety floor, acknowledge only that a
  small-cell fold-in exists and withhold the exact value.
- If boundary coverage is ambiguous, keep the row in evidence-gap language until
  source coverage improves.
- Customer-facing interpretation requires customer-approved aggregate scope,
  source coverage declarations, and approved aggregate labels.

## Non-Goals

Trust Evidence Gap Composition:

- does not create a trust score,
- does not calculate ROI,
- does not establish causality,
- does not prove output correctness,
- does not create productivity claims,
- does not add canonical events,
- does not add suppression reasons,
- does not create runtime APIs or schemas,
- does not ingest raw traces into FluencyTracr,
- does not identify, score, rank, or evaluate employees,
- does not produce team or manager rankings.
