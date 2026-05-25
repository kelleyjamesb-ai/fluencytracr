# V4 Signal Validation Gate

## Purpose

This document defines the validation gate for promoting V4 candidate signals
from dogfood research into later productization eligibility.

This gate is required before any candidate signal becomes a productized V4 API,
schema, contract, or customer-facing readout.

This is dogfood validation only. Passing this gate does not ship product
behavior, create a customer claim, or authorize implementation by itself.

## Why This Gate Exists

V4 depends on governed aggregate behavioral evidence. Distribution shape can
show that a candidate signal is worth studying, but distribution shape alone
cannot prove that the signal is stable, safe, decision-relevant, or suitable for
product use.

One 60-day diagnostic window is insufficient for product promotion.

Signal promotion requires evidence across multiple comparable windows or
cohorts.

This gate protects the V4 boundary between research and productization. It keeps
dogfood findings useful without letting early patterns become APIs, schemas,
contracts, or customer-facing readouts before they pass governance review.

## Signals Under Evaluation

### Depth

Depth is the V4 aggregate work-integration lens. It asks whether AI use is
becoming durable, verified, reusable, recoverable, and judgment-aware enough to
support claim confidence.

### Delegation Depth

Delegation Depth is a V4 Depth subdimension. It asks whether aggregate activity
is retrieval-oriented, transformation-oriented, or delegation-oriented, without
creating a universal maturity ladder.

### Reusable Workflow Propagation

Reusable Workflow Propagation is a research candidate that asks whether named,
non-unlisted, reusable workflows spread across adopters. It remains research
until stable taxonomy mapping and aggregate-safe interpretation are proven.

### Rapid Refinement

Rapid Refinement is a research candidate that asks whether aggregate workflow
patterns show confirmed same-session refinement or ambiguous rapid same-surface
reuse. It must not redefine the governed `ITERATION_DEPTH_OBSERVED` event.

### Velocity x Depth Zone

Velocity x Depth Zone is a research candidate for combining adoption energy
with work-integration evidence. It must preserve Velocity and Depth as
independent aggregate signals and must not collapse them into a score.

## Required Evidence Before Promotion

Every candidate signal must show:

- behavioral face validity,
- alignment with governed taxonomy,
- meaningful distribution variance,
- stability across comparable windows or cohorts,
- support for a specific executive or product decision,
- aggregate-safe surfacing without misuse,
- relationship to Velocity where relevant,
- relationship to value-realization primitives,
- documented governance-safety review.

Missing evidence in any required area blocks promotion.

## Multi-Window Stability Requirement

Promotion requires evidence across multiple comparable windows or cohorts.

The validation run must compare at least three fixed windows or comparable
cohorts unless governance explicitly approves a narrower research readout. A
single 60-day dogfood diagnostic can motivate a candidate, but it cannot promote
the candidate.

The readout must document:

- window boundaries,
- cohort definition,
- source table or export,
- whether taxonomy mapping changed between windows,
- whether distribution shape is stable, drifting, or inconclusive,
- whether any observed change is explainable by instrumentation rather than
behavior.

## Distribution Shape Requirement

The candidate must show interpretable aggregate distribution shape.

Acceptable evidence may include percentile distributions, shares, spread ratios,
surface-family differences, or workflow-family differences. Heavy-tail variance
is evidence of possible signal, not proof of signal.

Distribution shape must be interpreted with workflow context. No signal may be
promoted from variance, tail behavior, or median separation alone.

## Coverage Requirement

The candidate must have sufficient event, cohort, and taxonomy coverage to make
the readout interpretable.

The validation readout must document:

- included surfaces,
- excluded surfaces,
- unmapped or ambiguous surfaces,
- cohort size by window,
- suppressed windows or slices,
- whether missing fields create material interpretation risk.

Coverage gaps can lead to `HOLD` for mapping improvement or transformer
enhancement. Coverage gaps must not be papered over with invented semantics.

## Relationship to Velocity Requirement

Every V4 candidate must state how it relates to Velocity:

- independent of Velocity,
- dependent on Velocity breadth or surface coverage,
- complementary to Velocity,
- potentially confounded by Velocity.

The readout must preserve Velocity's independent dimensions: frequency,
engagement, and breadth. It must not convert Velocity into a productivity score,
must not convert Velocity into a maturity score, and must not turn Velocity into
a universal target.

## Relationship to Value-Realization Primitives

Every candidate must state whether it can inform:

- Quality Multiplier,
- Reliability Factor,
- Causal Delta,
- Outcome Evidence interpretation,
- Time-Saved Defensibility Range,
- AI Value Leakage Map,
- AI Scale Readiness Portfolio,
- Trust Calibration Index.

The relationship must be specific and caveated. A candidate can modify
confidence only after fail-closed evidence clears and a promotion decision
explicitly authorizes confidence use. A `PROMOTE_CAVEAT_ONLY` decision permits
caveats/context only. It cannot produce ROI, causality, prediction, suppressed
economics, or hidden confidence adjustments.

## Governance Safety Review

No signal may be promoted if it creates individual scoring, team ranking,
prohibited maturity scoring, productivity scoring, ROI claims, causal claims,
or prediction claims.

The safety review must confirm:

- aggregate-only output,
- no person-level fields,
- no raw prompts, raw outputs, transcripts, or raw event rows,
- no new canonical events,
- no new suppression reasons,
- no tunable thresholds,
- no admin overrides,
- no ranking, scoring, employee evaluation, or productivity measurement,
- no dollarized ROI, causal lift, or customer-facing prediction claim,
- default suppression when attribution, taxonomy, or coverage is ambiguous.

## Promotion Rubric

| Area | Required question | Passing evidence |
| --- | --- | --- |
| Behavioral validity | Does the signal mean something defensible? | Interpretation is role- and workflow-relative without overclaiming. |
| Taxonomy alignment | Does the signal map to governed surfaces and concepts? | Mapping uses existing taxonomy and documents exclusions. |
| Multi-window stability | Does the signal persist across comparable windows or cohorts? | Shape and interpretation are stable enough to read, or drift is explained. |
| Distribution shape | Is there meaningful aggregate variance? | Percentiles, shares, or spread ratios distinguish cohorts or surfaces. |
| Coverage | Are enough eligible records mapped? | Cohort and event coverage are documented and sufficient. |
| Velocity relationship | Is the candidate independent from or complementary to Velocity? | Frequency, engagement, and breadth remain separate. |
| Value-realization relationship | Does the candidate support a specific decision? | Readout names the decision and caveats. |
| Safety | Can the signal be surfaced without misuse? | Safety review passes all aggregate-only constraints. |

## Decision Outcomes: PROMOTE, HOLD, REJECT

### PROMOTE

`PROMOTE` means eligible for later productization, not automatically
productized.

Promotion allows a later PR to propose product contracts, schemas, APIs, or
customer-facing readout behavior. That later work must still pass normal
governance, implementation, and verification review.

### HOLD

`HOLD` means research-only.

Hold the candidate when evidence is promising but incomplete, unstable,
insufficiently covered, weakly mapped, or not yet tied to a specific executive
or product decision.

### REJECT

`REJECT` means must not be used in product readouts unless governance reopens
it.

Reject the candidate when it is noisy, unsafe, unstable, weakly aligned with
taxonomy, or likely to create prohibited scoring, ranking, ROI, causality, or
prediction claims.

## Required Readout Artifact

Every validation run must produce a completed readout artifact using
[V4_SIGNAL_VALIDATION_READOUT_TEMPLATE.md](./V4_SIGNAL_VALIDATION_READOUT_TEMPLATE.md).

The artifact must include:

- candidate signal,
- windows or cohorts tested,
- distribution evidence,
- stability result,
- coverage result,
- Velocity relationship,
- value-realization relationship,
- governance safety review,
- decision outcome,
- rationale.

## Non-Capabilities

This gate does not add scripts, SQL, tests, schemas, APIs, Prisma migrations, or
frontend surfaces.

This gate does not productize any V4 signal.

This gate does not create customer-facing readouts.

This gate does not authorize individual scoring, team ranking, prohibited
maturity scoring, productivity scoring, ROI claims, causal claims, or prediction
claims.

This gate does not add canonical events, suppression reasons, thresholds, or
admin overrides.
