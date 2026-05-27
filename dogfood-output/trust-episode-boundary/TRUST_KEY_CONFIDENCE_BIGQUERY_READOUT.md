# Trust Key Confidence BigQuery Readout

## Status

Status: `HOLD_FOR_RESEARCH`.

This readout records a bounded dogfood BigQuery test of key-confidence coverage
for the Trust Episode Boundary diagnostic. It does not create a product metric,
schema, endpoint, canonical event, suppression reason, score, ROI calculation,
causality claim, or customer-facing readout.

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

The window excludes the weekend dates 2026-05-16 and 2026-05-17, and excludes
2026-05-25 because the U.S. holiday would likely distort normal work volume.

Dry-run validation estimated 136 GB for each query pass. The executed queries
emitted aggregate rows only.

## Test Design

This diagnostic tested whether the recovered-after-failure signal depends on
broad session or workflow fallback keys.

Two checks were run:

1. A high-confidence anchor stress test that prefers trace, run, and action
   keys before broader fallback keys. This showed the signal survives when
   anchored on high-confidence metadata, but it intentionally changes episode
   granularity and should not replace the product-episode totals.
2. A cleaner key-coverage overlay that preserves the prior deduped
   product-episode definition, then marks whether each episode contains
   trace/run/action coverage, tracking-token-only coverage, or only
   session/workflow fallback coverage.

The key-coverage overlay is the decision-grade result below.

## Seven-Day Key-Coverage Overlay

| Strategy | Key-confidence coverage | Product episodes | Coverage share | Recovered after failure | Evidence gap | Alias ambiguity |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `run_first` | High: trace/run/action covered | 87,985,613 | 99.95% | 15,826,000 (17.99%) | 37,441,800 (42.55%) | 550,085 (0.63%) |
| `run_first` | Medium: tracking-token only | 42,017 | 0.05% | 0 (0.00%) | 42,017 (100.00%) | 0 |
| `run_first` | Low: session/workflow only | 1,027 | <0.01% | 0 (0.00%) | 1,027 (100.00%) | 0 |
| `trace_first` | High: trace/run/action covered | 87,591,400 | 99.95% | 15,798,046 (18.04%) | 36,894,060 (42.12%) | 506,434 (0.58%) |
| `trace_first` | Medium: tracking-token only | 42,017 | 0.05% | 0 (0.00%) | 42,017 (100.00%) | 0 |
| `trace_first` | Low: session/workflow only | 1,488 | <0.01% | 91 (6.12%) | 1,027 (69.02%) | 0 |

## Supporting Signal Counts

| Strategy | High-coverage explicit feedback | High-coverage citation clicks | High-coverage citation available | High-coverage skill episodes |
| --- | ---: | ---: | ---: | ---: |
| `run_first` | 64,681 | 509,226 | 12,386,039 | 357,384 |
| `trace_first` | 83,479 | 466,261 | 12,342,829 | 357,389 |

The medium tracking-token-only tier contains 41,945 citation-click episodes,
but no observed completion, recovery, or stall pattern. That tier is useful for
source-behavior coverage only; it should not be interpreted as resolved work.

## Interpretation

The trust signal is not being carried by broad fallback keys. Under the prior
deduped product-episode definition, about 99.95% of episodes have trace, run, or
action coverage. The recovered-after-failure pattern remains about 18% inside
that high-confidence coverage.

This materially strengthens the Trust Episode Boundary argument. The signal is
not just citation behavior, explicit feedback, or loose session/workflow
linkage. It is primarily visible in episodes that have stronger operational
metadata.

The evidence gap remains real. Even in high-confidence coverage, roughly 42% of
episodes still lack enough aggregate evidence to interpret trust behavior. That
is the next product and instrumentation problem, not proof that the signal is
invalid.

Citation clicks remain secondary. Most citation-click-only episodes sit in the
tracking-token-only tier and do not carry enough workflow evidence to resolve
the episode. This supports the earlier caveat that citation behavior is optional
corroboration, not the trust anchor.

Explicit feedback remains too sparse to carry the model. It is useful when
present, but Trust Calibration should continue to rely on aggregate work
behavior, recovery, stall, verification/source coverage, and outcome-readiness
evidence.

## Commercial Read

This is promising enough to keep going.

The defensible claim is not "we measure employee trust" or "we prove ROI." The
defensible claim is:

> FluencyTracr can observe aggregate AI work episodes and show where work
> resolves, recovers after friction, stalls, or lacks enough verification and
> workflow evidence to support confident value-readiness interpretation.

That is an evidence-layer claim. It remains aggregate-only, governance-safe, and
commercially useful for AI operating model, value-realization, and workflow
governance conversations.

## Remaining Weaknesses

- The evidence gap is still large at about 42%.
- The diagnostic does not prove output correctness.
- The diagnostic does not prove causality.
- The diagnostic does not compute ROI.
- The diagnostic does not show whether the recovered work was economically
  valuable.
- The diagnostic still needs approved cohort/workflow segmentation before it is
  executive-ready.
- The diagnostic still needs customer-owned outcome evidence before value
  claims can move beyond evidence-readiness.

## Recommended Next Step

Move from raw diagnostics to a V4 signal validation readout for Trust Episode
Boundary.

The validation readout should keep the signal in `HOLD_FOR_RESEARCH` unless it
can document:

- stable recovered-after-failure share across comparable working-day windows,
- high trace/run/action coverage,
- explicit evidence-gap language,
- no individual, team, manager, or department ranking,
- no ROI, causality, or productivity claim,
- relationship to Trust Calibration, Reliability Factor, Depth, and Outcome
  Evidence,
- specific customer-safe executive language for what this can and cannot prove.

## Governance Caveats

- This is not a person-level trace readout.
- This is not a trust score.
- This is not a citation-click metric.
- This is not a correctness detector.
- This is not a productivity or ROI readout.
- This does not rank people, teams, managers, departments, functions, or
  customers.
- This does not prove causality or predict future behavior.
