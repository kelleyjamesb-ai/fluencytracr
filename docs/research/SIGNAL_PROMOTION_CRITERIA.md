# Signal Promotion Criteria

## Purpose

This document defines the methodology gate for promoting candidate behavioral
signals into governed FluencyTracr concepts.

Candidate signals may be explored in research probes before they become concept
docs, contracts, schemas, APIs, or product behavior. Promotion requires evidence
that the candidate is behaviorally meaningful, governed by the existing
taxonomy, stable enough to interpret, useful for a specific decision, and safe
to surface only in aggregate.

## Why Signal Promotion Criteria Are Needed

Distribution shape can make a candidate signal worth investigating, but it is
not enough to make the signal product-safe.

Heavy-tail variance is evidence of possible signal, not proof of signal.

Without an explicit promotion gate, exploratory metrics can drift into concept
language, customer-facing claims, or product implementation before their meaning
is clear. That creates three risks:

- weak behavioral interpretation,
- accidental expansion beyond governed taxonomy,
- misuse as ranking, scoring, productivity measurement, or prediction.

The promotion criteria keep research probes useful while preserving the
aggregate-only evidence posture.

## The Six Promotion Criteria

Every candidate behavioral signal must satisfy all six criteria before it is
promoted into a concept doc, contract, schema, or implementation work.

| Criterion | Required evidence |
| --- | --- |
| Behavioral face validity | The observed pattern has a defensible behavioral interpretation that can be explained without overclaiming intent, skill, maturity, or productivity. |
| Alignment with governed taxonomy | The candidate maps to existing surface, AGENT sub-surface, ingest, Depth, Velocity, or value-confidence language without creating new canonical events or suppression reasons. |
| Meaningful distribution variance | Aggregate distributions show enough spread to distinguish cohorts, surfaces, or workflow families without exposing person-level rows. |
| Stability across windows or cohorts | The pattern remains interpretable across fixed windows or comparable cohorts and is not a one-window artifact. |
| Support for a specific executive or product decision | The signal helps answer a concrete decision, such as whether a workflow needs scale, harvest, coaching, redesign, governance, mapping improvement, or transformer enhancement. |
| Aggregate-safe surfacing without misuse | The final readout can remain aggregate-only and cannot enable individual, team, manager, or department ranking. |

## What Distribution Shape Can and Cannot Prove

Distribution shape can prove that a pattern has empirical shape worth reviewing.
It can show concentration, tails, variance, surface differences, or cohort
differences.

Distribution shape cannot prove that the pattern is durable, valuable, safe, or
decision-relevant. It cannot prove skill, maturity, productivity, causality, ROI,
future behavior, or customer value. It cannot distinguish all valid explanations
for a pattern without taxonomy review and stability testing.

No concept doc should be created unless the signal supports a specific decision.

## Required Promotion Decision

Every candidate signal readout must end with one explicit decision:

- promote to concept doc,
- mapping improvement,
- transformer enhancement,
- footnote only,
- reject as noisy or unsafe.

The decision must cite all six criteria. Missing evidence on any criterion keeps
the signal out of concept, contract, schema, and implementation work.

## Acceptable Outcomes

### Promote to concept doc

Use this only when all six criteria are satisfied and the signal supports a
specific executive or product decision. The concept doc must still preserve the
nine invariants, fail-closed posture, and aggregate-only boundaries.

### Mapping improvement

Use this when the probe shows that existing taxonomy or join logic should be
cleaned up before the candidate can be interpreted. This outcome can lead to a
bounded taxonomy or SQL mapping PR, not a product signal.

### Transformer enhancement

Use this when the probe shows that the customer-side transformer needs better
aggregate extraction, enrichment, or classification to support existing governed
concepts. This outcome does not by itself justify a new concept.

### Footnote only

Use this when the pattern is interesting but not stable, decision-supporting, or
safe enough to promote. Footnotes can inform research readouts without becoming
product language.

### Reject as noisy or unsafe

Use this when the candidate is not interpretable, not stable, not aligned with
taxonomy, or likely to invite prohibited ranking, productivity scoring,
surveillance, ROI claims, causal lift claims, or prediction claims.

## Governance Constraints

Candidate signals must preserve the FluencyTracr invariants:

- no new canonical events,
- no new suppression reasons,
- no tunable thresholds,
- no admin overrides,
- no individual scoring,
- no team ranking,
- no productivity scoring,
- no dollarized ROI calculation,
- no causal productivity lift claim,
- no customer-facing prediction claim.

Signals must remain aggregate-only and must not enable individual, team, manager, or department ranking.

## Example Decision Table

| candidate_signal | face_validity | taxonomy_alignment | distribution_variance | cross_window_stability | decision_supported | aggregate_safety | recommended_outcome | rationale |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| rapid refinement behavior | plausible | partial | meaningful | untested | unclear | aggregate-safe if grouped by surface | footnote only | Distribution shape exists, but the decision and stability evidence are not yet strong enough for concept promotion. |
| delegation depth | plausible | strong | meaningful | stable | workflow investment planning | aggregate-safe | promote to concept doc | All six criteria are met and the signal supports scale, govern, or redesign decisions. |
| reusable workflow propagation | plausible | partial | weak | unstable | mapping cleanup | aggregate-safe | mapping improvement | Existing fields do not classify reusable workflows consistently enough for concept promotion. |

## Non-Capabilities

This methodology does not create a V4 implementation.

It does not add runtime code, endpoints, schemas, migrations, frontend surfaces,
canonical events, suppression reasons, thresholds, or admin controls.

It does not authorize individual scoring, team ranking, productivity scoring,
ROI calculation, causal productivity lift claims, or customer-facing prediction
claims.
