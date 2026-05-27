# Trust Episode Boundary BigQuery Readout

## Status

Status: `HOLD_FOR_RESEARCH`.

This readout records a bounded BigQuery test of the Trust Episode Boundary
diagnostic. It is dogfood/research-only and does not create a product metric,
score, canonical event, suppression reason, ROI calculation, causality claim, or
customer-facing readout.

## Source And Windows

- GCE/customer-event table:
  `scio-apps.scrubbed_glean_customer_event.scrubbed_glean_customer_event`
- Agent span tables:
  - `scio-apps.scrubbed_agentspan.scrubbed_agentspan_20260520`
  - `scio-apps.scrubbed_agentspan.scrubbed_agentspan_20260521`
  - `scio-apps.scrubbed_agentspan.scrubbed_agentspan_20260522`
- Windows:
  - 2026-05-20 00:00:00 UTC through 2026-05-21 00:00:00 UTC
  - 2026-05-21 00:00:00 UTC through 2026-05-22 00:00:00 UTC
  - 2026-05-22 00:00:00 UTC through 2026-05-23 00:00:00 UTC

Dry-run validation estimated about 60 GB across the three windows.

`episode_count` is a candidate episode-key count. A single underlying work
episode can expose multiple join keys such as run, session, trace, action, or
tracking keys. These values are useful for aggregate pattern shape and coverage,
not deduplicated product totals.

## Pattern Summary

| Window | Candidate episode keys | Resolved without verification signal | Recovered after failure | Evidence gap | Resolved with confidence | Stalled after AI assist | Explicit negative feedback |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2026-05-20 | 40,249,365 | 25,559,569 (63.50%) | 6,157,874 (15.30%) | 6,877,197 (17.09%) | 1,506,209 (3.74%) | 148,516 (0.37%) | 0 |
| 2026-05-21 | 39,709,097 | 26,025,506 (65.54%) | 6,084,083 (15.32%) | 5,995,067 (15.10%) | 1,467,017 (3.69%) | 137,423 (0.35%) | 1 (<0.01%) |
| 2026-05-22 | 35,098,867 | 23,306,983 (66.40%) | 4,808,769 (13.70%) | 5,544,500 (15.80%) | 1,322,555 (3.77%) | 116,060 (0.33%) | 0 |

## Supporting Signal Counts

| Window | Explicit feedback episode keys | Citation-click episode keys | Citation-available episode keys | Skill episode keys | Post-failure continuation keys |
| --- | ---: | ---: | ---: | ---: | ---: |
| 2026-05-20 | 13,852 | 92,844 | 5,080,334 | 214,845 | 6,195,992 |
| 2026-05-21 | 13,813 | 90,049 | 4,954,196 | 214,199 | 6,123,797 |
| 2026-05-22 | 11,620 | 70,041 | 4,061,049 | 169,379 | 4,884,615 |

## Initial Interpretation

The signal is not just citation clicks. Citation-click episode keys are visible,
but they are a small part of the total pattern shape. This supports the product
caveat that citations are optional corroboration, not the trust anchor.

The strongest pattern is aggregate resolution without explicit verification
signal. That does not prove blind trust, but it creates the right executive
question: which workflows are resolving without enough corroborating trust
evidence for the risk level?

Recovered-after-failure is the most promising trust-calibration signal in this
test. It appears at meaningful volume across all three windows and directly
supports the idea that trust is revealed by what happens after AI fails, stalls,
or skips.

Stalled-after-AI-assist is low but stable enough to keep studying. It may be a
useful early workflow-redesign or instrumentation-repair indicator if the same
shape holds after deduplication and cohort validation.

Explicit feedback is sparse. It should remain a direct but low-coverage signal,
not the backbone of Trust Calibration.

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

Before promotion, the next diagnostic should deduplicate candidate episode keys
into an approved aggregate episode unit, then repeat the pattern summary across
at least three comparable windows or approved aggregate cohorts.
