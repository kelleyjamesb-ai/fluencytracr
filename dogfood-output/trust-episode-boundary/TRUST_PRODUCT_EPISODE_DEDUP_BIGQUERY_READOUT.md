# Trust Product Episode Dedup BigQuery Readout

## Status

Status: `HOLD_FOR_RESEARCH`.

This readout records a bounded dogfood BigQuery test of product-episode
deduplication for the Trust Episode Boundary diagnostic. It does not create a
product metric, schema, endpoint, canonical event, suppression reason, score,
ROI calculation, causality claim, or customer-facing readout.

## Source And Working-Day Window

- GCE/customer-event table:
  `scio-apps.scrubbed_glean_customer_event.scrubbed_glean_customer_event`
- Agent span tables:
  `scio-apps.scrubbed_agentspan.scrubbed_agentspan_*`
- Completed business dates:
  - 2026-05-15
  - 2026-05-18
  - 2026-05-19
  - 2026-05-20
  - 2026-05-21
  - 2026-05-22
  - 2026-05-26

This excludes the weekend dates 2026-05-16 and 2026-05-17. It also excludes
2026-05-25, a U.S. holiday, because that day would likely depress normal
working-day activity.

Dry-run validation estimated 136 GB across the seven completed business days.
The executed query emitted aggregate rows only.

## Dedup Method

The query compared two aggregate product-episode ID strategies:

| Strategy | Episode-key preference |
| --- | --- |
| `run_first` | run, then session, trace, workflow, action, tracking token |
| `trace_first` | trace, then run, session, workflow, action, tracking token |

The diagnostic still uses run, session, workflow, action, trace, and tracking
keys only as internal join keys. Final output emits aggregate counts, shares,
and caveats only. It does not emit raw IDs, users, names, emails, content,
prompts, responses, documents, managers, teams, or person-level metrics.

## Seven-Day Aggregate Result

| Strategy | Raw candidate keys | Deduped product episodes | Product-to-candidate ratio | Implied raw-key overcount |
| --- | ---: | ---: | ---: | ---: |
| `run_first` | 246,962,102 | 88,028,657 | 35.64% | 2.81x |
| `trace_first` | 246,962,102 | 87,634,905 | 35.49% | 2.82x |

Deduplication materially compresses the earlier candidate-key volume. The two
strategies land within 0.5% of each other, which suggests the broad pattern is
not an artifact of choosing run-first versus trace-first normalization.

## Pattern Summary

| Strategy | Resolved with confidence | Resolved without verification signal | Recovered after failure | Stalled after AI assist | Explicit negative feedback | Evidence gap |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `run_first` | 3,567,326 (4.05%) | 30,676,071 (34.85%) | 15,826,000 (17.98%) | 474,414 (0.54%) | 2 (<0.01%) | 37,484,844 (42.58%) |
| `trace_first` | 4,020,459 (4.59%) | 30,358,363 (34.64%) | 15,798,137 (18.03%) | 520,840 (0.59%) | 2 (<0.01%) | 36,937,104 (42.15%) |

## Supporting Signal Counts

| Strategy | Explicit feedback episodes | Citation-click episodes | Citation-available episodes | Skill episodes | Post-failure continuation episodes | Alias-ambiguous episodes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `run_first` | 65,654 (0.07%) | 551,171 (0.63%) | 12,386,039 (14.07%) | 357,384 (0.41%) | 15,826,002 (17.98%) | 550,085 (0.62%) |
| `trace_first` | 84,452 (0.10%) | 508,206 (0.58%) | 12,342,829 (14.08%) | 357,389 (0.41%) | 15,798,137 (18.03%) | 506,434 (0.58%) |

## Daily Dedup Stability

| Date | Candidate keys | `run_first` product episodes | `trace_first` product episodes | `run_first` recovered after failure | `trace_first` recovered after failure |
| --- | ---: | ---: | ---: | ---: | ---: |
| 2026-05-15 | 28,326,406 | 10,119,737 (35.73%) | 10,602,633 (37.43%) | 19.14% | 18.24% |
| 2026-05-18 | 31,000,998 | 10,636,094 (34.31%) | 11,197,090 (36.12%) | 20.37% | 19.32% |
| 2026-05-19 | 33,961,512 | 11,453,830 (33.73%) | 12,112,285 (35.66%) | 21.46% | 20.26% |
| 2026-05-20 | 40,249,365 | 14,868,846 (36.94%) | 14,460,825 (35.93%) | 16.76% | 17.20% |
| 2026-05-21 | 39,709,097 | 14,278,538 (35.96%) | 13,764,578 (34.66%) | 17.24% | 17.85% |
| 2026-05-22 | 35,098,867 | 12,945,529 (36.88%) | 12,326,150 (35.12%) | 15.22% | 15.95% |
| 2026-05-26 | 38,615,857 | 13,726,083 (35.55%) | 13,171,344 (34.11%) | 17.06% | 17.74% |

## Interpretation

The raw candidate-key diagnostic was overcounting. A single product episode can
expose multiple keys, and deduplication compresses the count by roughly 64%.
The earlier candidate-key totals should therefore be treated as coverage and
pattern-shape evidence, not product totals.

The trust pattern survives deduplication. Recovered-after-failure remains a
large, stable aggregate signal at about 18% of deduped product episodes. This is
the strongest current evidence that trust can be studied through what happens
after failure, skip, pause, cancellation, or friction, not just through citation
clicks or explicit feedback.

Citation clicks are visible but small. They appear in roughly 0.6% of deduped
episodes. Citation availability is much broader at about 14%, but availability
is not the same as verification. This supports the product caveat that citations
are optional corroboration, not the trust anchor.

Explicit feedback remains sparse at less than 0.1% of deduped episodes. It is
useful direct evidence when present, but it cannot carry Trust Calibration by
itself.

The evidence gap remains large at about 42%. That is not a product failure yet;
it is the next instrumentation and normalization question. The safest reading is
that many observable episodes do not yet carry enough aggregate metadata to
interpret trust behavior.

## Data-Quality Caveat

Alias ambiguity is low, under 1% of product episodes. However, the query also
observed very large maximum observation counts on a small number of episode IDs.
That suggests some session or workflow keys may still be too broad to act as
clean product-episode boundaries.

Before this can be productized, a follow-up diagnostic should split deduped
episodes by key-confidence tier:

- high confidence: trace, run, or action-backed episode IDs,
- medium confidence: tracking-token-backed episode IDs,
- low confidence: session or broad workflow fallback episode IDs.

This should be a coverage qualifier only. It must not create new canonical
events, suppression reasons, thresholds, scores, rankings, ROI logic, or
person-level outputs.

## Governance Caveats

- This is not a person-level trace readout.
- This is not a trust score.
- This is not a citation-click metric.
- This is not a correctness detector.
- This is not a productivity or ROI readout.
- This does not rank people, teams, managers, departments, functions, or
  customers.
- This does not prove causality or predict future behavior.

## Next Validation Step

Run a key-confidence diagnostic that reports the same trust patterns separately
for trace/run/action-backed episodes versus tracking-token and session/workflow
fallback episodes. If recovered-after-failure remains stable in the
high-confidence tier, Trust Episode Boundary has a much stronger case for a V4
signal validation readout.
