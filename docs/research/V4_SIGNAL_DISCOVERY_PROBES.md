# V4 Signal Discovery Probes

## Purpose

This document frames V4 signal discovery probes as research candidates,
not productized V4 dimensions.

The probes test whether candidate behavioral patterns are worth future
governance review before any concept doc, product API, schema, or V4
implementation work begins. They do not change production behavior.

## Candidate Signals

The research candidates are:

- rapid refinement behavior,
- delegation depth,
- depth repertoire,
- reusable workflow propagation,
- trust episode boundary.

These candidates are not fluency dimensions. They are not automatically
productized signals, and they are not customer-facing claims. A `PROMOTE`
decision only makes a candidate eligible for later productization review.

## Probe 1: Rapid Refinement Behavior

Rapid refinement behavior asks whether aggregate workflow patterns show repeated
use of the same session, run, or surface family in ways that may indicate
refinement.

The probe deliberately distinguishes:

- confirmed same-session refinement, where join keys support attribution,
- rapid same-surface reuse, where repeated behavior is visible but attribution
  is ambiguous,
- surface-specific variance.

The probe must not overclaim same-surface reuse as confirmed iteration. It must
not replace or redefine the governed `ITERATION_DEPTH_OBSERVED` event.

SQL: [v4_signal_discovery_refinement.sql](../../sql/dogfood/v4_signal_discovery_refinement.sql)

## Probe 2: Delegation Depth

Delegation depth asks whether aggregate use separates across retrieval,
transformation, exploratory delegation, structured delegation, and reusable
leverage.

The probe uses the governed surface taxonomy and AGENT sub-surface split:

- retrieval: `SEARCH`, `AI_ANSWER` lookup,
- transformation: `CHAT`, `AI_SUMMARY`, summarization or drafting-like surfaces,
- exploratory delegation: `agent:ephemeral`,
- structured delegation: `agent:autonomous`, `agent:workflow_named`, `MCP_USAGE`,
- reusable leverage: named workflow agents and published or reusable Skills
  where detectable.

If a surface cannot be confidently mapped, the SQL excludes it from ratio
numerators rather than inventing semantics.

SQL: [v4_signal_discovery_delegation.sql](../../sql/dogfood/v4_signal_discovery_delegation.sql)

## Probe 3: Depth Repertoire

Depth repertoire asks whether aggregate AI use combines surface breadth with
repeated use. It tests the V4 Depth spine:

```text
Depth = Surface Repertoire x Repeat Use / Refinement
```

The probe computes person-level intermediate statistics inside BigQuery, then
emits only aggregate bucket counts and percentile distributions. It is designed
to distinguish single-surface habitual use from repeated cross-surface work
integration without exposing individual rows.

SQL: [depth_repertoire_diagnostic.sql](../../sql/dogfood/depth_repertoire_diagnostic.sql)

## Probe 4: Reusable Workflow Propagation

Reusable workflow propagation asks whether named, non-unlisted, reusable
workflows spread across adopters.

The probe is constrained to fields that can classify reusable workflows from
`PRODUCT_SNAPSHOT` or other existing GCE structures. Ephemeral and unlisted
workflows are excluded or separately reported. The readout uses neutral
across-adopter language.

SQL: [v4_signal_discovery_reuse_propagation.sql](../../sql/dogfood/v4_signal_discovery_reuse_propagation.sql)

## Probe 5: Trust Episode Boundary

Trust episode boundary asks whether aggregate AI work episodes show calibrated
trust behavior without relying on citation clicks as the primary trust proxy.

The probe groups evidence into five families:

- feedback signal: thumbs up/down, rating, time-saved feedback, answer votes,
  and summary votes;
- agent completion: successful action, completed agent run, error, pause,
  cancellation, or skipped step;
- post-failure behavior: continuation or successful action after failure,
  pause, cancellation, or skipped step;
- post-skill behavior: Skill use followed by continuation, action completion,
  feedback, or abandonment;
- verification/source behavior: citations available, citation clicked, or
  source-backed action.

The output buckets are neutral aggregate patterns:

- `resolved_with_confidence`,
- `resolved_without_verification_signal`,
- `recovered_after_failure`,
- `stalled_after_ai_assist`,
- `explicit_negative_feedback`,
- `evidence_gap`.

Citation behavior is optional corroboration. The probe is explicitly not a
citation-click metric and must not become a person-level trust score.

Research doc: [TRUST_EPISODE_BOUNDARY.md](./TRUST_EPISODE_BOUNDARY.md)

SQL: [trust_episode_boundary_diagnostic.sql](../../sql/dogfood/trust_episode_boundary_diagnostic.sql)

Validation readout:
[V4_TRUST_EPISODE_BOUNDARY_VALIDATION_READOUT.md](./V4_TRUST_EPISODE_BOUNDARY_VALIDATION_READOUT.md)

## How To Run The Probes

1. Replace `PROJECT.DATASET.gce_events` in each SQL file with the approved GCE
   export table.
2. Set `window_start` and `window_end` to a fixed window.
3. Run each query in BigQuery.
4. Repeat the same query across at least two additional fixed windows or
   comparable cohorts before interpreting stability.
5. Complete the required readout template and promotion decision table.

The final SQL outputs are aggregate-only. Intermediate CTEs may compute with
`user_key` inside BigQuery, but final outputs must not include user IDs, emails,
names, prompts, outputs, transcripts, or raw event rows.

## Required Readout Template

```markdown
## Candidate Signal

Name:

## Window And Cohort

Window:
Cohort:
Source table:

## Aggregate Findings

- Distribution shape:
- Surface or workflow-family variance:
- Ambiguous mappings:
- Stability across windows or cohorts:

## Decision Supported

Specific executive or product decision:

## Safety Review

Aggregate-only final output:
Ranking or scoring risk:
Misuse caveats:

## Promotion Decision

Recommended outcome:
Rationale:
```

## Promotion Decision Table

| candidate_signal | face_validity | taxonomy_alignment | distribution_variance | cross_window_stability | decision_supported | aggregate_safety | recommended_outcome | rationale |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| rapid refinement behavior |  |  |  |  |  |  |  |  |
| delegation depth |  |  |  |  |  |  |  |  |
| depth repertoire |  |  |  |  |  |  |  |  |
| reusable workflow propagation |  |  |  |  |  |  |  |  |
| trust episode boundary | pass | pass | pass | pass | pass | pass | PROMOTE | Promoted for later Trust Calibration productization review, not automatically productized. |

## Governance Constraints

The probe pack is research-only. It does not add canonical events, suppression
reasons, tunable thresholds, admin overrides, runtime code, endpoints, schemas,
migrations, frontend surfaces, rankings, ROI calculations, causal productivity
lift claims, or prediction claims.

All final readouts must remain aggregate-only and must not enable individual,
team, manager, or department ranking.

## What Would Justify a Concept Doc

A concept doc is justified only if the candidate satisfies the six criteria in
[SIGNAL_PROMOTION_CRITERIA.md](./SIGNAL_PROMOTION_CRITERIA.md):

- behavioral face validity,
- alignment with governed taxonomy,
- meaningful distribution variance,
- stability across windows or cohorts,
- support for a specific executive or product decision,
- aggregate-safe surfacing without misuse.

No concept doc should be created unless the signal supports a specific decision.

## What Would Keep a Signal as a Footnote

A candidate should stay as a footnote when it has interesting distribution shape
but weak decision support, unclear taxonomy mapping, unstable behavior across
windows, or ambiguous interpretation.

Heavy-tail variance is evidence of possible signal, not proof of signal.

## What Would Reject a Signal

A candidate should be rejected when it is noisy, unsafe, unstable, poorly mapped,
or likely to support prohibited misuse. Rejection is required if the candidate
invites individual scoring, team ranking, manager comparison, department ranking,
prohibited productivity scoring, ROI calculation, causal productivity lift
claims, or customer-facing prediction claims.
