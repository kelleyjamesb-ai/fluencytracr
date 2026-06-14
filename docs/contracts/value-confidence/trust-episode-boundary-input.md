# Trust Episode Boundary Input Contract Proposal

## Status

Status: `PRODUCT_CONTRACT_PROPOSAL`

This proposal defines how promoted Trust Episode Boundary evidence may later
support the Trust Calibration Index. It is documentation-only and does not add
runtime output, schemas, APIs, endpoints, customer-facing claims, canonical
events, suppression reasons, tunable thresholds, admin overrides, ROI
calculation, or causal interpretation.

## Purpose

Trust Episode Boundary evidence may help Trust Calibration explain aggregate AI
work episodes: where work resolves, recovers after friction, stalls, or lacks
enough evidence for confident interpretation.

The contract boundary is the aggregate work episode, not the employee. Output
must remain cohort/workflow/surface-level and must not identify, score, rank, or
evaluate employees.

## Evidence Handling Sequence

1. Confirm the parent Trust Calibration Index readout is eligible to surface
   under existing fail-closed gates. If the parent readout is suppressed, do not
   expose hidden Trust Episode Boundary values.
2. Confirm the customer-approved aggregate scope: workflow, AI surface, cohort,
   role family, or function where approved and aggregate-safe.
3. Confirm source coverage for trace, run, action, feedback, citation/source,
   continuation, completion, failure, pause, skip, and cancellation evidence.
4. If approved aggregate source coverage is incomplete, ambiguous, or not
   documented, Do not emit Trust Episode Boundary pattern values. Show only
   evidence-gap language and required caveats.
5. If source coverage is adequate, Trust Episode Boundary may contribute
   aggregate context for resolution, recovery after friction, stalled episodes,
   explicit feedback, and evidence gaps.
6. Preserve the evidence gap. Missing evidence must not be reinterpreted as
   healthy trust, poor trust, correctness, value, or causality.

## Customer-Safe Output Language

Approved wording for future product review:

> FluencyTracr observes aggregate AI work episodes and shows where AI-assisted
> work resolves, recovers after friction, stalls, or lacks enough evidence for
> confident interpretation.

> Trust Episode Boundary does not identify, score, rank, or evaluate employees.
> It cannot prove output correctness, ROI, productivity lift, or causality.

> Use this signal to find aggregate workflow areas where trust loops, source
> coverage, recovery behavior, or outcome-readiness evidence need improvement.

Required interpretation caveats:

- This is not a trust score.
- This is not a citation-click metric.
- This is not a correctness detector.
- Citation behavior is optional corroboration, not the trust anchor.
- Recovery after friction is evidence of continued work, not proof of output
  quality.

## Citation Requirements

Any future internal or customer-reviewed Trust Calibration artifact that uses
Trust Episode Boundary must cite the validation readout.

Any such artifact must cite the supporting dogfood BigQuery readouts or the
customer-approved aggregate evidence package that replaces them.

Internal evidence references:

- Validation readout:
  [V4_TRUST_EPISODE_BOUNDARY_VALIDATION_READOUT.md](../../research/V4_TRUST_EPISODE_BOUNDARY_VALIDATION_READOUT.md)
- Initial BigQuery readout:
  [TRUST_EPISODE_BOUNDARY_BIGQUERY_READOUT.md](../../../dogfood-output/trust-episode-boundary/TRUST_EPISODE_BOUNDARY_BIGQUERY_READOUT.md)
- Product-episode dedup readout:
  [TRUST_PRODUCT_EPISODE_DEDUP_BIGQUERY_READOUT.md](../../../dogfood-output/trust-episode-boundary/TRUST_PRODUCT_EPISODE_DEDUP_BIGQUERY_READOUT.md)
- Key-confidence coverage readout:
  [TRUST_KEY_CONFIDENCE_BIGQUERY_READOUT.md](../../../dogfood-output/trust-episode-boundary/TRUST_KEY_CONFIDENCE_BIGQUERY_READOUT.md)

Customer-facing artifacts must not cite raw dogfood table names or row-level
query details. They may cite validated aggregate dogfood evidence during
internal review, or customer-approved aggregate evidence after a customer run.

## Allowed Aggregate Context

If future implementation is approved by a separate PR, the Trust Calibration
Index may reference these aggregate context fields:

- approved aggregate scope,
- aggregate episode count,
- high-confidence coverage share,
- evidence-gap share,
- resolved aggregate episode share,
- recovered-after-friction aggregate episode share,
- stalled aggregate episode share,
- explicit-feedback aggregate episode share,
- citation/source corroboration share,
- required caveats,
- evidence references.

These fields are proposal language, not a runtime schema. Any future schema work
must be additive, fail-closed, and governed by the existing invariant set.

## Suppression And Evidence Gaps

This contract does not add suppression reasons. It also does not add canonical events.

When Trust Episode Boundary evidence is insufficient, future output should omit
Trust Episode Boundary pattern values and carry an evidence-gap caveat inside
the parent Trust Calibration readout. The evidence-gap caveat must not create a
new suppression reason or reconstruct values hidden by suppression.

## Non-Goals

Trust Episode Boundary input handling:

- does not calculate ROI,
- does not establish causality,
- does not prove output correctness,
- does not infer training impact,
- does not require enablement-system access,
- does not require survey joins,
- does not use HR or person-level data,
- does not rank teams,
- does not rank managers,
- does not label employees,
- does not create a Glean-only ontology,
- does not authorize runtime output without a later implementation contract and
  verification.
