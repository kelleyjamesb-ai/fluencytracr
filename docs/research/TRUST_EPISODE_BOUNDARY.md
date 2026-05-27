# Trust Episode Boundary

## Status

Status: `PROMOTED_FOR_PRODUCTIZATION_REVIEW`.

This is a promoted V4 candidate for later Trust Calibration productization
review. Promotion means eligible for a future product contract proposal, not
automatically productized. It does not add product behavior, schemas, endpoints,
canonical events, suppression reasons, thresholds, customer-facing readouts, or
ROI calculation.

## Purpose

The AI Work Episode Boundary defines how far FluencyTracr may look when
interpreting aggregate trust behavior around AI-assisted work.

The unit is a work episode, not a person. A work episode starts when AI is
invoked in a work context and ends when the observable work state resolves,
stalls, fails without recovery, moves into a governed downstream action, or
leaves approved telemetry coverage.

This lets Trust Calibration move beyond a thin verification-rate view without
turning into surveillance or employee scoring.

## Governance Boundary

The Trust Episode Boundary preserves the repository invariants:

- No individual scoring.
- No team, manager, department, or employee ranking.
- No raw prompts, raw outputs, messages, transcripts, document contents, email
  contents, or raw event rows in final output.
- no new canonical events.
- no new suppression reasons.
- No tunable thresholds or admin overrides.
- no ROI calculation.
- No productivity measurement.
- No causal or prediction claim.
- Aggregate-only final outputs.

Intermediate joins may use run, session, workflow, action, trace, or tracking
keys inside the customer-controlled or dogfood query environment. Final outputs
must emit only aggregate episode counts, shares, caveats, and coverage fields.

## AI Work Episode Boundary

The boundary has five layers.

| Layer | Meaning | Evidence strength |
| --- | --- | --- |
| Immediate episode | AI invocation, agent or skill behavior, feedback, verification, completion, failure, retry, or cancellation within the same run/session/workflow. | Strongest. |
| Same-session continuation | Work continues after AI succeeds, fails, pauses, or gets skipped in the same observable session. | Strong. |
| Downstream governed action | AI-assisted work leads to an observable governed action such as an action execution, CRM update action, email-draft action, document action, or other approved tool action. | Strong when action metadata is approved and content-free. |
| Cross-surface work path | Work moves from assistant/search/chat/agent/skill into another approved AI or work surface. | Useful for Depth and workflow integration, but requires careful anti-double-counting. |
| Longer-horizon repeat | Same aggregate workflow or approved cohort repeats, recovers, or abandons similar work over same-day or seven-day windows. | Research-only until stability is proven; never person-level output. |

The first research pass should prioritize immediate episode and same-session
continuation. Longer horizons may be used only as aggregate cohort readouts.

## Trust Episode Patterns

The research diagnostic uses six neutral aggregate buckets:

| Pattern | Interpretation |
| --- | --- |
| `resolved_with_confidence` | Work resolved and carried at least one corroborating trust signal: explicit positive feedback, citation/source behavior, verified continuation, or source-backed action. |
| `resolved_without_verification_signal` | Work resolved, but no explicit feedback, verification, citation/source, or recovery signal was observed. This is not automatically bad; it is a caveat for possible uncorroborated trust. |
| `recovered_after_failure` | A failure, error, skip, pause, or cancellation was followed by continued work or successful action in the same episode boundary. |
| `stalled_after_ai_assist` | A failure, error, skip, pause, or cancellation was observed and no recovery or continuation signal was observed inside the boundary. |
| `explicit_negative_feedback` | The episode carried thumbs-down, negative rating, or equivalent explicit negative feedback. |
| `evidence_gap` | The episode exists, but available aggregate evidence is insufficient to interpret trust behavior. |

These are behavioral operating patterns, not maturity levels, scores, or
employee labels.

The diagnostic counts aggregate candidate episode keys. A single work episode
can expose multiple join keys, such as run, session, trace, action, or tracking
keys. These counts are suitable for coverage and pattern-shape research, not
for product totals until a later deduplication contract is approved.

## Evidence Families

To keep the model defensible and simple, the first diagnostic groups evidence
into five families:

| Family | Examples | Caveat |
| --- | --- | --- |
| `feedback_signal` | Thumbs up/down, rating, time-saved feedback, answer votes, summary votes. | Direct but sparse. |
| `agent_completion` | Agent success, action success, error, pause, cancellation, skipped step. | Strong workflow-resolution evidence, but not proof of output quality. |
| `post_failure_behavior` | Successful action, retry, continuation, or follow-up after failure/skip/pause/cancel. | Strong trust-calibration evidence when sequence is observable. |
| `post_skill_behavior` | Skill use followed by continuation, action completion, feedback, or abandonment. | Useful for embedded-work claims; needs stable skill metadata. |
| `verification_source_behavior` | Citation available, citation clicked, source-backed action, answer vote, summary vote. | citations are optional corroboration; this is not a citation-click metric. |

Citation behavior must be interpreted cautiously. Many users may act
responsibly without clicking citations, and citation availability can differ by
surface or workflow. Citation signals can strengthen a trust episode, but they
must not become the trust anchor.

## Normalization Approach

The research model normalizes at the episode level, then aggregates:

```text
episode pattern share =
  aggregate episodes in pattern / aggregate eligible episodes
```

No person-level rate, employee-level label, team ranking, trust index, or
productivity measurement is produced.

Recommended aggregate fields:

- `episode_pattern`
- `boundary_layer`
- `primary_evidence_family`
- `episode_count`
- `episode_share`
- `explicit_feedback_episode_count`
- `negative_feedback_episode_count`
- `agent_completion_episode_count`
- `post_failure_continuation_episode_count`
- `post_skill_continuation_episode_count`
- `citation_click_episode_count`
- `citation_available_episode_count`
- `p50_span_rows`
- `p90_span_rows`
- `coverage_caveat`

`episode_count` means aggregate candidate episode-key count in this research
diagnostic. It must not be presented as a deduplicated count of people, teams,
or finalized customer-facing work episodes.

## Decision Supported

This candidate supports a specific executive/product decision:

> Which aggregate AI work patterns show healthy trust calibration, which show
> uncorroborated resolution, which recover after failure, and which stall after
> AI assistance?

That decision can guide workflow redesign, trust-loop repair, instrumentation
improvement, and enablement targeting at approved aggregate segments.

## Diagnostic SQL

SQL:
[trust_episode_boundary_diagnostic.sql](../../sql/dogfood/trust_episode_boundary_diagnostic.sql)

The diagnostic is dogfood/research-only. It uses run, workflow, session, action,
and tracking keys as internal join keys and emits only aggregate episode rows.

Latest dogfood BigQuery readout:
[TRUST_EPISODE_BOUNDARY_BIGQUERY_READOUT.md](../../dogfood-output/trust-episode-boundary/TRUST_EPISODE_BOUNDARY_BIGQUERY_READOUT.md)

Latest product-episode dedup readout:
[TRUST_PRODUCT_EPISODE_DEDUP_BIGQUERY_READOUT.md](../../dogfood-output/trust-episode-boundary/TRUST_PRODUCT_EPISODE_DEDUP_BIGQUERY_READOUT.md)

Latest key-confidence readout:
[TRUST_KEY_CONFIDENCE_BIGQUERY_READOUT.md](../../dogfood-output/trust-episode-boundary/TRUST_KEY_CONFIDENCE_BIGQUERY_READOUT.md)

Promotion validation readout:
[V4_TRUST_EPISODE_BOUNDARY_VALIDATION_READOUT.md](./V4_TRUST_EPISODE_BOUNDARY_VALIDATION_READOUT.md)

## Promotion Requirements

This candidate has moved beyond research eligibility through
[V4_TRUST_EPISODE_BOUNDARY_VALIDATION_READOUT.md](./V4_TRUST_EPISODE_BOUNDARY_VALIDATION_READOUT.md).
That promotion does not productize the signal. A future product contract
proposal is still required before runtime output, schemas, APIs, or
customer-facing readouts may use it.

Required evidence before promotion:

- stable aggregate episode distributions across at least three comparable
  windows or approved cohorts,
- documented source coverage for feedback, agent spans, action spans, skills,
  citation/source behavior, and post-failure continuation,
- evidence that citations are treated as optional corroboration, not a required
  trust behavior,
- proof that final output remains aggregate-only and cannot support individual,
  team, manager, or department ranking,
- clear relationship to Velocity, Depth, Reliability Factor, Quality
  Multiplier, and Outcome Evidence,
- explicit `HOLD`, `PROMOTE`, or `REJECT` decision in a validation readout.

## Non-Capabilities

Trust Episode Boundary is not a measure of employee trust.

It is not a person-level trace product.

It is not a trust score.

It is not a citation-click metric.

It is not a correctness detector.

It is not an ROI calculator.

It is not a causality model.

It is not a productivity measure.

It does not authorize new canonical events, suppression reasons, schemas,
endpoints, or customer-facing claims.
